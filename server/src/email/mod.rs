//! Email, ported from lockedin: one `EmailService` over two drivers (`fs` for dev/CI, `resend`
//! for production) and minijinja templates embedded in the binary. It only renders and sends.
mod driver;
mod templates;

use driver::Driver;
use templates::Templates;

/// Template names: `<kind>.html`, optional `<kind>.txt`, and a subject in `templates.rs`.
pub mod kinds {
    pub const SIGN_IN: &str = "sign_in";
    pub const SHARE_INVITE: &str = "share_invite";
}

pub struct Message {
    pub to: Vec<String>,
    pub from: String,
    pub subject: String,
    pub html: String,
    pub text: Option<String>,
    pub reply_to: Option<String>,
}

#[derive(Debug)]
pub enum EmailError {
    Template(String),
    Send(String),
    Config(String),
}

impl std::fmt::Display for EmailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmailError::Template(e) => write!(f, "template error: {e}"),
            EmailError::Send(e) => write!(f, "send failed: {e}"),
            EmailError::Config(e) => write!(f, "config error: {e}"),
        }
    }
}

pub struct EmailService {
    templates: Templates,
    driver: Driver,
    from: String,
    reply_to: Option<String>,
}

impl EmailService {
    /// EMAIL_DRIVER (`fs` default | `resend`), EMAIL_FS_DIR, EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_RESEND_API_KEY.
    pub fn from_env(get: impl Fn(&str) -> Option<String>) -> Self {
        let driver = match get("EMAIL_DRIVER").as_deref() {
            Some("resend") => Driver::Resend { api_key: get("EMAIL_RESEND_API_KEY").unwrap_or_default(), http: reqwest::Client::new() },
            Some("fs") | None => Driver::Fs { dir: get("EMAIL_FS_DIR").unwrap_or_else(|| ".emails".into()) },
            Some(other) => panic!("EMAIL_DRIVER must be fs or resend, not {other}"),
        };
        if let Driver::Fs { dir } = &driver {
            eprintln!("EMAIL_DRIVER=fs: emails are written to {dir}/ and logged here, not sent");
        }
        EmailService { templates: Templates::new(), driver, from: get("EMAIL_FROM").unwrap_or_else(|| "opennotes <notes@localhost>".into()), reply_to: get("EMAIL_REPLY_TO") }
    }

    /// Render `kind` against `ctx` for one recipient and send it. Returns the provider's message id.
    pub async fn send(&self, kind: &str, to: &str, ctx: serde_json::Value) -> Result<String, EmailError> {
        let r = self.templates.render(kind, &ctx)?;
        let msg = Message { to: vec![to.to_string()], from: self.from.clone(), subject: r.subject, html: r.html, text: r.text, reply_to: self.reply_to.clone() };
        self.driver.send(&msg).await
    }
}

/// A plausible single address: one @, a dotted domain, no spaces or angle brackets, ≤ 254 chars.
pub fn valid_address(email: &str) -> bool {
    let Some((local, domain)) = email.split_once('@') else { return false };
    email.len() <= 254
        && !local.is_empty()
        && local.len() <= 64
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !domain.contains('@')
        && email.chars().all(|c| c.is_ascii_graphic() && !"<>()[],;:\\\"".contains(c))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn addresses() {
        for ok in ["a@b.co", "zora.n+notes@mail.example.com"] {
            assert!(valid_address(ok), "{ok}");
        }
        for bad in ["", "a", "a@b", "@b.co", "a@@b.co", "a b@c.co", "a@b.co>", "a@.co", "Eve <e@x.co>"] {
            assert!(!valid_address(bad), "{bad}");
        }
    }
}
