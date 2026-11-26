//! Serializes a y-prosemirror document (TipTap schema) into compact, agent-readable text for MCP.
use serde_json::Value;
use yrs::{
    types::text::YChange,
    types::xml::{XmlFragment, XmlOut},
    Any, Doc, Map, Out, ReadTxn, Text, Transact, Xml,
};

/// Returns (title, text).
pub fn serialize(doc: &Doc) -> (String, String) {
    let frag = doc.get_or_insert_xml_fragment("default");
    let meta = doc.get_or_insert_map("meta");
    let txn = doc.transact();
    let title = match meta.get(&txn, "title") {
        Some(Out::Any(Any::String(s))) => s.trim().to_string(),
        _ => String::new(),
    };
    let mut out = String::new();
    for child in frag.children(&txn) {
        node(&txn, child, &mut out);
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

/// Every string stored under a "text" key: plain text shapes and tldraw's richText (TipTap JSON).
fn collect_text(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::Object(m) => {
            for (k, v) in m {
                match (k.as_str(), v) {
                    ("text", Value::String(s)) if !s.trim().is_empty() => out.push(s.trim().to_string()),
                    ("latex", Value::String(s)) if !s.trim().is_empty() => out.push(format!("${}$", s.trim())),
                    _ => collect_text(v, out),
                }
            }
        }
        Value::Array(a) => a.iter().for_each(|v| collect_text(v, out)),
        _ => {}
    }
}

fn node<T: ReadTxn>(txn: &T, n: XmlOut, out: &mut String) {
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
        XmlOut::Fragment(f) => f.children(txn).for_each(|c| node(txn, c, out)),
        XmlOut::Element(e) => {
            let attr = |k: &str| to_json(e.get_attribute(txn, k));
            let children = |out: &mut String| e.children(txn).for_each(|c| node(txn, c, out));
            match e.tag().as_ref() {
                "inlineMath" => out.push_str(&format!("${}$", str_attr(&attr("latex")))),
                "blockMath" => out.push_str(&format!("$${}$$\n\n", str_attr(&attr("latex")))),
                "hardBreak" => out.push('\n'),
                "horizontalRule" => out.push_str("---\n\n"),
                "canvasBlock" => {
                    let mut texts = Vec::new();
                    collect_text(&attr("snapshot"), &mut texts);
                    out.push_str(&format!("[Canvas: {}]\n\n", if texts.is_empty() { "drawing".into() } else { texts.join(" · ") }));
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
    use yrs::{types::Attrs, XmlElementPrelim, XmlTextPrelim};

    #[test]
    fn serializes_prose_marks_math_and_canvas() {
        let doc = Doc::new();
        let frag = doc.get_or_insert_xml_fragment("default");
        let meta = doc.get_or_insert_map("meta");
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
            let snap: Any = serde_json::from_str::<Any>(r#"{"store":{"shape:1":{"typeName":"shape","props":{"richText":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"V=s³"}]}]}}},"shape:2":{"typeName":"shape","props":{"latex":"A=6s^2"}}}}"#).unwrap();
            c.insert_attribute(&mut txn, "snapshot", snap);

            let k = frag.push_back(&mut txn, XmlElementPrelim::empty("callout"));
            k.insert_attribute(&mut txn, "kind", "contradicts");
            let kp = k.push_back(&mut txn, XmlElementPrelim::empty("paragraph"));
            kp.push_back(&mut txn, XmlTextPrelim::new("Boxes vary."));
        }
        let (title, text) = serialize(&doc);
        assert_eq!(title, "Box Geometry");
        assert_eq!(text, "## Boxes\n\nsame size in height [AI margin note: V = s³ for a cube].\n\n$$E=mc^2$$\n\n[Canvas: V=s³ · $A=6s^2$]\n\n[Contradicts] Boxes vary.");
    }
}
