//! minijinja templates embedded with `include_str!`, so the binary carries them (ported from lockedin).
use super::{kinds, EmailError};
use minijinja::Environment;
use serde_json::Value;

const TEMPLATES: &[(&str, &str)] = &[
    ("base.html", include_str!("../../templates/emails/base.html")),
    ("_macros.html", include_str!("../../templates/emails/_macros.html")),
    ("sign_in.html", include_str!("../../templates/emails/sign_in.html")),
    ("sign_in.txt", include_str!("../../templates/emails/sign_in.txt")),
    ("share_invite.html", include_str!("../../templates/emails/share_invite.html")),
    ("share_invite.txt", include_str!("../../templates/emails/share_invite.txt")),
];

pub struct Rendered {
    pub subject: String,
    pub html: String,
    pub text: Option<String>,
}

pub struct Templates {
    env: Environment<'static>,
}

impl Templates {
    pub fn new() -> Self {
        let mut env = Environment::new();
        for (name, src) in TEMPLATES {
            env.add_template(name, src).expect("embedded email template compiles");
        }
        Templates { env }
    }

    /// Subject, HTML and (if the kind has a `.txt`) plain text, all from one context.
    pub fn render(&self, kind: &str, ctx: &Value) -> Result<Rendered, EmailError> {
        let err = |what: &str, e: minijinja::Error| EmailError::Template(format!("{kind} {what}: {e}"));
        let subject = self.env.render_str(subject_template(kind), ctx).map_err(|e| err("subject", e))?;
        let html = self.env.get_template(&format!("{kind}.html")).and_then(|t| t.render(ctx)).map_err(|e| err("html", e))?;
        let text = match self.env.get_template(&format!("{kind}.txt")) {
            Ok(t) => Some(t.render(ctx).map_err(|e| err("text", e))?),
            Err(_) => None,
        };
        Ok(Rendered { subject, html, text })
    }
}

/// Subjects live here, not in the HTML, so a subject can't pull in layout markup.
fn subject_template(kind: &str) -> &'static str {
    match kind {
        kinds::SIGN_IN => "{{ code }} is your opennotes sign-in code",
        kinds::SHARE_INVITE => "{{ owner_name }} shared “{{ title }}” with you",
        _ => "opennotes",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn every_kind_renders_with_its_link_and_escapes_input() {
        let t = Templates::new();
        let r = t.render(kinds::SIGN_IN, &json!({ "code": "123456", "link": "https://x/d/1#signin=abc", "minutes": 15 })).unwrap();
        assert_eq!(r.subject, "123456 is your opennotes sign-in code");
        assert!(r.html.contains("123456") && r.html.contains("https://x/d/1#signin=abc"));
        assert!(r.text.unwrap().contains("https://x/d/1#signin=abc"));

        let ctx = json!({ "owner_name": "Zora <b>", "owner_email": "z@x.co", "title": "Plan <script>", "role": "edit", "link": "https://x/d/2" });
        let r = t.render(kinds::SHARE_INVITE, &ctx).unwrap();
        assert!(r.html.contains("https://x/d/2"));
        assert!(!r.html.contains("<script>"), "note titles are escaped in HTML");
        assert!(r.html.contains("Plan &lt;script&gt;"));
        assert!(r.text.unwrap().contains("You can edit it."));
    }
}
