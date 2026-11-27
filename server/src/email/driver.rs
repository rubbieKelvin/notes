//! Email transports, ported from lockedin. Both sit behind the same `send`; `EMAIL_DRIVER`
//! picks one: `fs` (default, dev/CI) or `resend` (production).
use super::{EmailError, Message};
use chrono::Utc;
use serde_json::json;

pub enum Driver {
    /// Dev/CI: write the message to `dir` as JSON and return the filename. Nothing leaves the machine.
    Fs { dir: String },
    /// Production: POST to Resend and return its message id.
    Resend { api_key: String, http: reqwest::Client },
}

impl Driver {
    pub async fn send(&self, msg: &Message) -> Result<String, EmailError> {
        match self {
            Driver::Fs { dir } => send_fs(dir, msg).await,
            Driver::Resend { api_key, http } => send_resend(api_key, http, msg).await,
        }
    }
}

/// Writes `<dir>/<UTC stamp>-<subject slug>.json`.
async fn send_fs(dir: &str, msg: &Message) -> Result<String, EmailError> {
    let stamp = Utc::now().format("%Y%m%dT%H%M%S%6fZ").to_string();
    let filename = format!("{stamp}-{}.json", slugify(&msg.subject));
    let body = json!({ "to": msg.to, "from": msg.from, "subject": msg.subject, "html": msg.html, "text": msg.text, "reply_to": msg.reply_to });
    let pretty = serde_json::to_vec_pretty(&body).map_err(|e| EmailError::Send(e.to_string()))?;
    tokio::fs::create_dir_all(dir).await.map_err(|e| EmailError::Send(format!("create {dir}: {e}")))?;
    let path = std::path::Path::new(dir).join(&filename);
    tokio::fs::write(&path, pretty).await.map_err(|e| EmailError::Send(format!("write {}: {e}", path.display())))?;
    // The subject carries the sign-in code, so `just logs` is enough to sign in locally.
    println!("email to {}: {} ({})", msg.to.join(", "), msg.subject, path.display());
    Ok(filename)
}

async fn send_resend(api_key: &str, http: &reqwest::Client, msg: &Message) -> Result<String, EmailError> {
    if api_key.is_empty() {
        return Err(EmailError::Config("EMAIL_RESEND_API_KEY is empty but EMAIL_DRIVER=resend".into()));
    }
    let mut body = json!({ "from": msg.from, "to": msg.to, "subject": msg.subject, "html": msg.html });
    let obj = body.as_object_mut().expect("json object");
    if let Some(text) = &msg.text {
        obj.insert("text".into(), json!(text));
    }
    if let Some(reply_to) = &msg.reply_to {
        obj.insert("reply_to".into(), json!(reply_to));
    }
    let resp = http
        .post("https://api.resend.com/emails")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| EmailError::Send(format!("resend request: {e}")))?;
    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(EmailError::Send(format!("resend {status}: {text}")));
    }
    let parsed: serde_json::Value = serde_json::from_str(&text).map_err(|e| EmailError::Send(format!("resend body: {e}")))?;
    parsed.get("id").and_then(|v| v.as_str()).map(str::to_string).ok_or_else(|| EmailError::Send("resend response missing id".into()))
}

/// Lowercase, non-alphanumerics collapsed to `-`, capped at 50 chars.
fn slugify(subject: &str) -> String {
    let mut out = String::with_capacity(subject.len().min(50));
    let mut prev_dash = false;
    for ch in subject.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
            prev_dash = false;
        } else if !prev_dash {
            out.push('-');
            prev_dash = true;
        }
        if out.len() >= 50 {
            break;
        }
    }
    out.trim_matches('-').to_string()
}

#[cfg(test)]
mod tests {
    #[test]
    fn slug_collapses_and_caps() {
        assert_eq!(super::slugify("123456 is your opennotes sign-in code"), "123456-is-your-opennotes-sign-in-code");
        assert_eq!(super::slugify("Hi!!! there  friend"), "hi-there-friend");
        assert!(super::slugify(&"x".repeat(80)).len() <= 50);
    }
}
