//! Serializes a y-prosemirror document (TipTap schema) into compact, agent-readable text for MCP.
use serde_json::Value;
use yrs::{
    types::text::YChange,
    types::xml::{XmlFragment, XmlOut},
    Any, Doc, Map, MapRef, Out, ReadTxn, Text, Transact, Xml,
};

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
    let frag = doc.get_or_insert_xml_fragment("default");
    let canvases = doc.get_or_insert_map("canvases");
    let txn = doc.transact();
    let mut out = String::new();
    for child in frag.children(&txn) {
        node(&txn, &canvases, child, &mut out);
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
                "horizontalRule" => out.push_str("---\n\n"),
                "canvasBlock" => {
                    let texts = canvas_text(txn, canvases, &str_attr(&attr("canvasId")));
                    let title = str_attr(&attr("title"));
                    let label = if title.trim().is_empty() { "Canvas".to_string() } else { format!("Canvas \"{}\"", title.trim()) };
                    out.push_str(&format!("[{label}: {}]\n\n", if texts.is_empty() { "drawing".into() } else { texts.join(" · ") }));
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

            let k = frag.push_back(&mut txn, XmlElementPrelim::empty("callout"));
            k.insert_attribute(&mut txn, "kind", "contradicts");
            let kp = k.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            kp.push_back(&mut txn, XmlTextPrelim::new("Boxes vary."));
        }
        let (title, text) = serialize(&doc);
        assert_eq!(title, "Box Geometry");
        assert_eq!(text, "## Boxes\n\nsame size in height [AI margin note: V = s³ for a cube].\n\n$$E=mc^2$$\n\n[Canvas \"Cube\": V=s³ · $A=6s^2$]\n\n[Contradicts] Boxes vary.");
    }
}
