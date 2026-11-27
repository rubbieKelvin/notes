//! Serializes a y-prosemirror document (TipTap schema) into compact, agent-readable text for MCP.
use serde_json::Value;
use yrs::{
    types::text::YChange,
    types::xml::{XmlFragment, XmlFragmentRef, XmlOut},
    Any, Array, Doc, Map, MapRef, Out, ReadTxn, Text, Transact, Xml,
};

/// The note's tabs in order, as (title, content). The first tab of a note keeps the original "default" fragment;
/// others live in "tab:<id>". A note that never had tabs is one untitled tab.
fn tabs(doc: &Doc) -> Vec<(String, XmlFragmentRef)> {
    let list: Vec<(String, String)> = {
        let arr = doc.get_or_insert_array("tabs");
        let txn = doc.transact();
        arr.iter(&txn)
            .filter_map(|v| match v {
                Out::YMap(m) => {
                    let get = |k: &str| match m.get(&txn, k) {
                        Some(Out::Any(Any::String(s))) => s.to_string(),
                        _ => String::new(),
                    };
                    Some((get("id"), get("title")))
                }
                _ => None,
            })
            .collect()
    };
    if list.is_empty() {
        return vec![(String::new(), doc.get_or_insert_xml_fragment("default"))];
    }
    let mut seen = Vec::new();
    list.into_iter()
        .filter(|(id, _)| !id.is_empty() && !seen.contains(id) && { seen.push(id.clone()); true }) // two clients may add the same tab
        .map(|(id, title)| (title, doc.get_or_insert_xml_fragment(if id == "default" { "default".to_string() } else { format!("tab:{id}") })))
        .collect()
}

/// A trimmed string from the document's `meta` map (title, description), or "".
pub fn meta(doc: &Doc, key: &str) -> String {
    let meta = doc.get_or_insert_map("meta");
    let txn = doc.transact();
    match meta.get(&txn, key) {
        Some(Out::Any(Any::String(s))) => s.trim().to_string(),
        _ => String::new(),
    }
}

/// Returns (title, text).
pub fn serialize(doc: &Doc) -> (String, String) {
    let title = meta(doc, "title");
    let tabs = tabs(doc);
    let canvases = doc.get_or_insert_map("canvases");
    let txn = doc.transact();
    let mut out = String::new();
    for (name, frag) in &tabs {
        if tabs.len() > 1 {
            out.push_str(&format!("[Tab: {}]\n\n", if name.trim().is_empty() { "Untitled" } else { name.trim() }));
        }
        for child in frag.children(&txn) {
            node(&txn, &canvases, child, &mut out);
        }
    }
    (title, out.trim().to_string())
}

fn to_json(o: Option<Out>) -> Value {
    match o {
        Some(Out::Any(a)) => {
            let mut buf = String::new();
            a.to_json(&mut buf);
            serde_json::from_str(&buf).unwrap_or(Value::Null)
        }
        _ => Value::Null,
    }
}

fn str_attr(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        v => v.to_string(),
    }
}

/// Text, LaTeX and sticky-note text from one canvas (`canvases[id]`, a map of shape maps), in z-order.
fn canvas_text<T: ReadTxn>(txn: &T, canvases: &MapRef, id: &str) -> Vec<String> {
    let Some(Out::YMap(shapes)) = canvases.get(txn, id) else { return Vec::new() };
    let mut found: Vec<(f64, String)> = shapes
        .iter(txn)
        .filter_map(|(_, v)| match v {
            Out::YMap(shape) => {
                let get = |k: &str| match shape.get(txn, k) {
                    Some(Out::Any(Any::String(s))) => s.trim().to_string(),
                    _ => String::new(),
                };
                let index = match shape.get(txn, "index") {
                    Some(Out::Any(Any::Number(yrs::Number::Float(n)))) => n,
                    Some(Out::Any(Any::Number(yrs::Number::Int(n)))) => n as f64,
                    _ => 0.0,
                };
                let (text, latex) = (get("text"), get("latex"));
                if !text.is_empty() {
                    Some((index, text))
                } else if !latex.is_empty() {
                    Some((index, format!("${latex}$")))
                } else {
                    None
                }
            }
            _ => None,
        })
        .collect();
    found.sort_by(|a, b| a.0.total_cmp(&b.0));
    found.into_iter().map(|(_, t)| t).collect()
}

/// Ids of the uploaded files a note shows: file blocks, and images on canvases that are still in the note.
pub fn file_ids(doc: &Doc) -> Vec<uuid::Uuid> {
    let tabs = tabs(doc);
    let canvases = doc.get_or_insert_map("canvases");
    let txn = doc.transact();
    let mut ids = Vec::new();
    for (_, frag) in &tabs {
        frag.children(&txn).for_each(|c| collect_files(&txn, &canvases, c, &mut ids));
    }
    ids.sort();
    ids.dedup();
    ids
}

fn collect_files<T: ReadTxn>(txn: &T, canvases: &MapRef, n: XmlOut, ids: &mut Vec<uuid::Uuid>) {
    let XmlOut::Element(e) = n else { return };
    let attr = |k: &str| str_attr(&to_json(e.get_attribute(txn, k)));
    match e.tag().as_ref() {
        "fileBlock" => ids.extend(uuid::Uuid::parse_str(&attr("fileId")).ok()),
        "canvasBlock" => {
            if let Some(Out::YMap(shapes)) = canvases.get(txn, &attr("canvasId")) {
                for (_, shape) in shapes.iter(txn) {
                    let Out::YMap(shape) = shape else { continue };
                    let Some(Out::Any(Any::String(src))) = shape.get(txn, "src") else { continue };
                    let id = src.strip_prefix("/v1/files/").or_else(|| src.strip_prefix("/v1/assets/"));
                    ids.extend(id.and_then(|i| uuid::Uuid::parse_str(i).ok()));
                }
            }
        }
        _ => e.children(txn).for_each(|c| collect_files(txn, canvases, c, ids)),
    }
}

fn node<T: ReadTxn>(txn: &T, canvases: &MapRef, n: XmlOut, out: &mut String) {
    match n {
        XmlOut::Text(t) => {
            for d in t.diff(txn, YChange::identity) {
                if let Out::Any(Any::String(s)) = &d.insert {
                    out.push_str(s);
                }
                let note = d.attributes.as_ref().and_then(|a| a.get("aiMargin")).map(|m| {
                    let mut buf = String::new();
                    m.to_json(&mut buf);
                    serde_json::from_str::<Value>(&buf).ok().map(|v| str_attr(&v["note"])).unwrap_or_default()
                });
                if let Some(note) = note.filter(|n| !n.is_empty()) {
                    out.push_str(&format!(" [AI margin note: {note}]"));
                }
            }
        }
        XmlOut::Fragment(f) => f.children(txn).for_each(|c| node(txn, canvases, c, out)),
        XmlOut::Element(e) => {
            let attr = |k: &str| to_json(e.get_attribute(txn, k));
            let children = |out: &mut String| e.children(txn).for_each(|c| node(txn, canvases, c, out));
            match e.tag().as_ref() {
                "inlineMath" => out.push_str(&format!("${}$", str_attr(&attr("latex")))),
                "blockMath" => out.push_str(&format!("$${}$$\n\n", str_attr(&attr("latex")))),
                "hardBreak" => out.push('\n'),
                "noteRef" => out.push_str(&format!("[[{}]]", str_attr(&attr("title")))),
                "horizontalRule" => out.push_str("---\n\n"),
                "canvasBlock" => {
                    let texts = canvas_text(txn, canvases, &str_attr(&attr("canvasId")));
                    let title = str_attr(&attr("title"));
                    let label = if title.trim().is_empty() { "Canvas".to_string() } else { format!("Canvas \"{}\"", title.trim()) };
                    out.push_str(&format!("[{label}: {}]\n\n", if texts.is_empty() { "drawing".into() } else { texts.join(" · ") }));
                }
                "fileBlock" if !str_attr(&attr("fileId")).is_empty() => {
                    out.push_str(&format!("[File \"{}\" ({})]\n\n", str_attr(&attr("name")), str_attr(&attr("mime"))));
                }
                "heading" => {
                    let level = attr("level").as_u64().unwrap_or(1).clamp(1, 6) as usize;
                    out.push_str(&format!("{} ", "#".repeat(level)));
                    children(out);
                    out.push_str("\n\n");
                }
                "codeBlock" => {
                    out.push_str("```\n");
                    children(out);
                    out.push_str("\n```\n\n");
                }
                "listItem" | "taskItem" => {
                    out.push_str(match attr("checked") {
                        Value::Bool(true) => "- [x] ",
                        Value::Bool(false) => "- [ ] ",
                        _ => "- ",
                    });
                    let mut inner = String::new();
                    children(&mut inner);
                    out.push_str(inner.trim());
                    out.push('\n');
                }
                "bulletList" | "orderedList" | "taskList" => {
                    children(out);
                    out.push('\n');
                }
                "blockquote" => {
                    let mut inner = String::new();
                    children(&mut inner);
                    out.push_str(&format!("> {}\n\n", inner.trim()));
                }
                "aiSource" => {
                    let mut inner = String::new();
                    children(&mut inner);
                    let who = if attr("provenance") == "human_edited" { "Rewritten from" } else { "AI-Source ·" };
                    out.push_str(&format!("[{who} {}] {}\n\n", str_attr(&attr("agent")), inner.trim()));
                }
                "callout" => {
                    let mut inner = String::new();
                    children(&mut inner);
                    let label = match attr("kind").as_str() {
                        Some("fact") => "Verified fact",
                        Some("contradicts") => "Contradicts",
                        _ => "Hypothesis",
                    };
                    out.push_str(&format!("[{label}] {}\n\n", inner.trim()));
                }
                "clip" => {
                    let mut inner = String::new();
                    children(&mut inner);
                    out.push_str(&format!("[Clip ▶ {} {}–{}] \"{}\"\n\n", str_attr(&attr("url")), str_attr(&attr("start")), str_attr(&attr("end")), inner.trim()));
                }
                "runbook" => {
                    out.push_str(&format!("```{} (status: {})\n", str_attr(&attr("lang")), str_attr(&attr("status"))));
                    children(out);
                    out.push_str("\n```\n\n");
                }
                "paragraph" => {
                    children(out);
                    out.push_str("\n\n");
                }
                _ => children(out),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use yrs::{types::Attrs, MapPrelim, XmlElementPrelim, XmlTextPrelim};

    #[test]
    fn serializes_prose_marks_math_and_canvas() {
        let doc = Doc::new();
        let frag = doc.get_or_insert_xml_fragment("default");
        let meta = doc.get_or_insert_map("meta");
        let canvases = doc.get_or_insert_map("canvases");
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "title", "Box Geometry");

            let h = frag.push_back(&mut txn, XmlElementPrelim::empty("heading"));
            h.insert_attribute(&mut txn, "level", Any::from(2.0f64));
            h.push_back(&mut txn, XmlTextPrelim::new("Boxes"));

            let p = frag.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            let t = p.push_back(&mut txn, XmlTextPrelim::new("same size in "));
            let note = Any::Map(HashMap::from([("note".to_string(), Any::from("V = s³ for a cube")), ("id".to_string(), Any::from("w1"))]).into());
            t.insert_with_attributes(&mut txn, 13, "height", Attrs::from([("aiMargin".into(), note)]));
            t.insert_with_attributes(&mut txn, 19, ".", Attrs::from([("aiMargin".into(), Any::Null)]));

            let m = frag.push_back(&mut txn, XmlElementPrelim::empty("blockMath"));
            m.insert_attribute(&mut txn, "latex", "E=mc^2");

            let c = frag.push_back(&mut txn, XmlElementPrelim::empty("canvasBlock"));
            c.insert_attribute(&mut txn, "canvasId", "c1");
            c.insert_attribute(&mut txn, "title", "Cube");
            let shapes = canvases.insert(&mut txn, "c1", MapPrelim::default());
            for (id, index, key, value) in [("b", 2.0, "latex", "A=6s^2"), ("a", 1.0, "text", "V=s³"), ("s", 0.5, "points", "")] {
                let shape = shapes.insert(&mut txn, id, MapPrelim::default());
                shape.insert(&mut txn, "index", index);
                shape.insert(&mut txn, key, value);
            }

            let shape = shapes.insert(&mut txn, "img", MapPrelim::default());
            shape.insert(&mut txn, "src", "/v1/assets/00000000-0000-0000-0000-000000000001");
            let f = frag.push_back(&mut txn, XmlElementPrelim::empty("fileBlock"));
            f.insert_attribute(&mut txn, "fileId", "00000000-0000-0000-0000-000000000002");
            f.insert_attribute(&mut txn, "name", "data.csv");
            f.insert_attribute(&mut txn, "mime", "application/octet-stream");
            // a canvas no longer in the note doesn't count
            let gone = canvases.insert(&mut txn, "c2", MapPrelim::default());
            let shape = gone.insert(&mut txn, "img", MapPrelim::default());
            shape.insert(&mut txn, "src", "/v1/files/00000000-0000-0000-0000-000000000003");

            let k = frag.push_back(&mut txn, XmlElementPrelim::empty("callout"));
            k.insert_attribute(&mut txn, "kind", "contradicts");
            let kp = k.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            kp.push_back(&mut txn, XmlTextPrelim::new("Boxes vary."));
        }
        let (title, text) = serialize(&doc);
        assert_eq!(title, "Box Geometry");
        let ids: Vec<String> = file_ids(&doc).iter().map(|i| i.to_string()).collect();
        assert_eq!(ids, ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]);
        assert_eq!(text, "## Boxes\n\nsame size in height [AI margin note: V = s³ for a cube].\n\n$$E=mc^2$$\n\n[Canvas \"Cube\": V=s³ · $A=6s^2$]\n\n[File \"data.csv\" (application/octet-stream)]\n\n[Contradicts] Boxes vary.");
    }

    #[test]
    fn tabs_each_get_a_heading_and_their_files_count() {
        let doc = Doc::new();
        let tabs = doc.get_or_insert_array("tabs");
        let first = doc.get_or_insert_xml_fragment("default");
        let second = doc.get_or_insert_xml_fragment("tab:t2");
        {
            let mut txn = doc.transact_mut();
            for (id, title) in [("default", "Overview"), ("t2", "Budget"), ("t2", "Budget")] {
                let m = tabs.push_back(&mut txn, MapPrelim::default());
                m.insert(&mut txn, "id", id);
                m.insert(&mut txn, "title", title);
            }
            let p = first.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            p.push_back(&mut txn, XmlTextPrelim::new("See "));
            let r = p.push_back(&mut txn, XmlElementPrelim::empty("noteRef"));
            r.insert_attribute(&mut txn, "title", "Q3 plan");
            let p = second.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            p.push_back(&mut txn, XmlTextPrelim::new("$40k"));
            let f = second.push_back(&mut txn, XmlElementPrelim::empty("fileBlock"));
            f.insert_attribute(&mut txn, "fileId", "00000000-0000-0000-0000-000000000009");
        }
        assert_eq!(serialize(&doc).1, "[Tab: Overview]\n\nSee [[Q3 plan]]\n\n[Tab: Budget]\n\n$40k\n\n[File \"\" ()]");
        assert_eq!(file_ids(&doc).len(), 1);
    }
}
