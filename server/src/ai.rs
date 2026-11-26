//! Bring-your-own AI: each user picks a provider, model and key. Two wire formats cover the field:
//! Anthropic Messages, and OpenAI-compatible Chat Completions (OpenAI, DeepSeek, Gemini, OpenRouter,
//! Ollama/vLLM/LM Studio via a custom base URL).
use crate::{auth::User, AppError, AppState, Res};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::net::IpAddr;
use uuid::Uuid;

const ANTHROPIC_VERSION: &str = "2026-10-21";

#[derive(Clone, Copy, PartialEq, Debug)]
enum Wire {
    Anthropic,
    OpenAi,
}

struct Preset {
    id: &'static str,
    label: &'static str,
    wire: Wire,
    base: &'static str,
    vision: bool,
}

const PRESETS: &[Preset] = &[
    Preset { id: "anthropic", label: "Anthropic", wire: Wire::Anthropic, base: "https://api.anthropic.com", vision: true },
    Preset { id: "openai", label: "OpenAI", wire: Wire::OpenAi, base: "https://api.openai.com/v1", vision: true },
    Preset { id: "deepseek", label: "DeepSeek", wire: Wire::OpenAi, base: "https://api.deepseek.com", vision: false },
    Preset { id: "gemini", label: "Google Gemini", wire: Wire::OpenAi, base: "https://generativelanguage.googleapis.com/v1beta/openai", vision: true },
    Preset { id: "openrouter", label: "OpenRouter", wire: Wire::OpenAi, base: "https://openrouter.ai/api/v1", vision: true },
    Preset { id: "custom", label: "Custom provider", wire: Wire::OpenAi, base: "", vision: true },
];

fn preset(id: &str) -> Res<&'static Preset> {
    PRESETS.iter().find(|p| p.id == id).ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "unknown provider"))
}

/// A user's resolved provider, ready to call.
struct Provider {
    preset: &'static Preset,
    base: String,
    key: String,
    model: String,
}

// ---------- SSRF guard for custom base URLs ----------

/// True for addresses on the public internet (not loopback, private, link-local, CGNAT, etc.).
pub fn is_public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, ..] = v4.octets();
            !(v4.is_loopback() || v4.is_private() || v4.is_link_local() || v4.is_unspecified() || v4.is_broadcast()
                || v4.is_multicast() || v4.is_documentation()
                || a == 0 || (a == 100 && (64..128).contains(&b)) || (a == 198 && (18..20).contains(&b)) || a >= 240)
        }
        IpAddr::V6(v6) => {
            if let Some(v4) = v6.to_ipv4_mapped() {
                return is_public_ip(IpAddr::V4(v4));
            }
            let seg0 = v6.segments()[0];
            !(v6.is_loopback() || v6.is_unspecified() || v6.is_multicast()
                || (seg0 & 0xfe00) == 0xfc00   // unique local
                || (seg0 & 0xffc0) == 0xfe80   // link local
                || seg0 == 0x2001 && v6.segments()[1] == 0xdb8) // documentation
        }
    }
}

/// Custom base URLs must be https and resolve to public IPs, unless the operator allows private ones
/// (e.g. a local Ollama). shortcut: checks at save/call time; DNS could still rebind between check and request.
async fn check_custom_url(s: &AppState, raw: &str) -> Res<String> {
    let bad = |m: &str| AppError::new(StatusCode::BAD_REQUEST, m.to_string());
    let url = reqwest::Url::parse(raw.trim()).map_err(|_| bad("enter a valid base URL, e.g. https://api.example.com/v1"))?;
    if !matches!(url.scheme(), "https" | "http") || url.username() != "" || url.password().is_some() {
        return Err(bad("base URL must be http(s) without credentials"));
    }
    if !s.cfg.allow_private_ai_urls {
        if url.scheme() != "https" {
            return Err(bad("base URL must use https"));
        }
        let host = url.host_str().ok_or_else(|| bad("base URL needs a host"))?;
        let port = url.port_or_known_default().unwrap_or(443);
        let addrs: Vec<_> = tokio::net::lookup_host((host, port)).await.map_err(|_| bad("couldn't resolve that host"))?.collect();
        if addrs.is_empty() || !addrs.iter().all(|a| is_public_ip(a.ip())) {
            return Err(bad("base URL must point at a public host (private addresses are disabled on this server)"));
        }
    }
    Ok(url.as_str().trim_end_matches('/').to_string())
}

async fn base_for(s: &AppState, p: &Preset, custom: Option<&str>) -> Res<String> {
    match p.id {
        "custom" => check_custom_url(s, custom.ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "enter the provider's base URL"))?).await,
        "anthropic" => Ok(s.cfg.anthropic_base.clone()),
        _ => Ok(p.base.to_string()),
    }
}

// ---------- wire formats (pure, unit-tested) ----------

fn anthropic_body(model: &str, system: &str, content: Value) -> Value {
    let mut body = json!({ "model": model, "max_tokens": 4000, "system": system, "messages": [{ "role": "user", "content": content }] });
    // Low effort keeps notes fast; only models that support the parameter get it.
    const EFFORT: &[&str] = &["claude-opus-5", "claude-sonnet-5", "claude-haiku-5", "claude-fable-5", "claude-mythos-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-6"];
    if EFFORT.iter().any(|p| model.starts_with(p)) {
        body["output_config"] = json!({ "effort": "low" });
    }
    if ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5-2"].contains(&model) {
        body["fallbacks"] = json!("default"); // re-run on another model if this one declines
    }
    body
}

fn openai_body(model: &str, system: &str, text: &str, image_jpeg_b64: Option<&str>) -> Value {
    let user = match image_jpeg_b64 {
        Some(b64) => json!([
            { "type": "text", "text": text },
            { "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{b64}") } },
        ]),
        None => json!(text),
    };
    json!({ "model": model, "messages": [{ "role": "system", "content": system }, { "role": "user", "content": user }] })
}

type Parsed = Result<String, (StatusCode, &'static str)>;

fn parse_anthropic(msg: &Value) -> Parsed {
    if msg["stop_reason"] == "refusal" {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "the AI declined to annotate this"));
    }
    let text: String = msg["content"].as_array().into_iter().flatten().filter(|b| b["type"] == "text").filter_map(|b| b["text"].as_str()).collect();
    nonempty(text)
}

fn parse_openai(msg: &Value) -> Parsed {
    let choice = &msg["choices"][0];
    if choice["finish_reason"] == "content_filter" || !choice["message"]["refusal"].is_null() {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "the AI declined to annotate this"));
    }
    nonempty(choice["message"]["content"].as_str().unwrap_or_default().to_string())
}

fn nonempty(text: String) -> Parsed {
    let t = text.trim();
    if t.is_empty() { Err((StatusCode::BAD_GATEWAY, "the AI returned no note")) } else { Ok(t.to_string()) }
}

/// Upstream error message, trimmed, to help users fix model/key issues.
fn upstream_error(v: &Value) -> String {
    let m = v["error"]["message"].as_str().or_else(|| v["error"].as_str()).unwrap_or_default();
    m.chars().take(200).collect()
}

// ---------- calls ----------

fn with_auth(req: reqwest::RequestBuilder, wire: Wire, key: &str) -> reqwest::RequestBuilder {
    match wire {
        Wire::Anthropic => req.header("x-api-key", key).header("anthropic-version", ANTHROPIC_VERSION),
        Wire::OpenAi if key.is_empty() => req,
        Wire::OpenAi => req.bearer_auth(key),
    }
}

async fn list_models(s: &AppState, p: &Preset, base: &str, key: &str) -> Res<Vec<String>> {
    let url = match p.wire {
        Wire::Anthropic => format!("{base}/v1/models?limit=1000"),
        Wire::OpenAi => format!("{base}/models"),
    };
    let res = with_auth(s.http.get(url), p.wire, key)
        .send()
        .await
        .map_err(|_| AppError::new(StatusCode::BAD_GATEWAY, format!("couldn't reach {}", p.label)))?;
    let status = res.status();
    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Err(AppError::new(StatusCode::BAD_REQUEST, format!("{} rejected that key", p.label)));
    }
    if !status.is_success() {
        return Err(AppError::new(StatusCode::BAD_GATEWAY, format!("{} returned {status} listing models", p.label)));
    }
    let v: Value = res.json().await.map_err(|_| AppError::new(StatusCode::BAD_GATEWAY, "unexpected model list"))?;
    let mut ids: Vec<String> = v["data"].as_array().into_iter().flatten().filter_map(|m| m["id"].as_str().map(String::from)).take(1000).collect();
    ids.sort();
    Ok(ids)
}

async fn complete(s: &AppState, p: &Provider, system: &str, text: &str, image: Option<&str>) -> Res<Json<Value>> {
    let req = match p.preset.wire {
        Wire::Anthropic => {
            let content = match image {
                Some(b64) => json!([
                    { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": b64 } },
                    { "type": "text", "text": text },
                ]),
                None => json!(text),
            };
            s.http.post(format!("{}/v1/messages", p.base)).header("anthropic-beta", "server-side-fallback-2026-07-01").json(&anthropic_body(&p.model, system, content))
        }
        Wire::OpenAi => s.http.post(format!("{}/chat/completions", p.base)).json(&openai_body(&p.model, system, text, image)),
    };
    let res = with_auth(req, p.preset.wire, &p.key)
        .send()
        .await
        .map_err(|_| AppError::new(StatusCode::BAD_GATEWAY, format!("couldn't reach {}", p.preset.label)))?;
    let status = res.status();
    let msg: Value = res.json().await.unwrap_or(Value::Null);
    if status == StatusCode::UNAUTHORIZED || status == StatusCode::FORBIDDEN {
        return Err(AppError::new(StatusCode::PRECONDITION_REQUIRED, format!("{} rejected your saved key; update it in Settings", p.preset.label)));
    }
    if !status.is_success() {
        let detail = upstream_error(&msg);
        return Err(AppError::new(StatusCode::BAD_GATEWAY, format!("{} returned {status}{}", p.preset.label, if detail.is_empty() { String::new() } else { format!(": {detail}") })));
    }
    let note = match p.preset.wire {
        Wire::Anthropic => parse_anthropic(&msg),
        Wire::OpenAi => parse_openai(&msg),
    }
    .map_err(|(c, m)| AppError::new(c, m))?;
    let model = msg["model"].as_str().unwrap_or(&p.model);
    Ok(Json(json!({ "note": note, "agent_id": model })))
}

type Saved = (Option<String>, Option<String>, Option<String>, Option<Vec<u8>>);

async fn saved(s: &AppState, user: Uuid) -> Res<Saved> {
    Ok(sqlx::query_as("SELECT ai_provider, ai_base_url, ai_model, ai_key_enc FROM users WHERE id = $1").bind(user).fetch_one(&s.db).await?)
}

async fn provider_for(s: &AppState, user: Uuid) -> Res<Provider> {
    let missing = || AppError::new(StatusCode::PRECONDITION_REQUIRED, "Add an AI provider in Settings to use AI notes");
    let (id, base, model, enc) = saved(s, user).await?;
    let p = preset(&id.ok_or_else(missing)?)?;
    let key = match enc {
        Some(e) => s.cipher.decrypt(&e).ok_or_else(missing)?,
        None => String::new(),
    };
    Ok(Provider { preset: p, base: base_for(s, p, base.as_deref()).await?, key, model: model.ok_or_else(missing)? })
}

// ---------- settings endpoints ----------

#[derive(Deserialize)]
pub struct ProviderReq {
    provider: String,
    base_url: Option<String>,
    key: Option<String>,
    model: Option<String>,
}

/// The key to use: the one typed now, or the saved one when the provider hasn't changed.
async fn key_for(s: &AppState, user: Uuid, b: &ProviderReq) -> Res<String> {
    if let Some(k) = b.key.as_deref().map(str::trim).filter(|k| !k.is_empty()) {
        if k.len() > 1024 || k.contains(char::is_whitespace) {
            return Err(AppError::new(StatusCode::BAD_REQUEST, "that doesn't look like an API key"));
        }
        return Ok(k.to_string());
    }
    let (id, _, _, enc) = saved(s, user).await?;
    match enc.filter(|_| id.as_deref() == Some(&b.provider)).and_then(|e| s.cipher.decrypt(&e)) {
        Some(k) => Ok(k),
        None if b.provider == "custom" => Ok(String::new()), // e.g. a local Ollama needs no key
        None => Err(AppError::new(StatusCode::BAD_REQUEST, "paste your API key")),
    }
}

/// Verifies the key by listing the provider's models (free on every supported provider).
pub async fn models(State(s): State<AppState>, user: User, Json(b): Json<ProviderReq>) -> Res<Json<Value>> {
    let p = preset(&b.provider)?;
    let base = base_for(&s, p, b.base_url.as_deref()).await?;
    let key = key_for(&s, user.id, &b).await?;
    Ok(Json(json!({ "models": list_models(&s, p, &base, &key).await? })))
}

pub async fn save(State(s): State<AppState>, user: User, Json(b): Json<ProviderReq>) -> Res<Json<Value>> {
    let p = preset(&b.provider)?;
    let model = b.model.as_deref().map(str::trim).filter(|m| !m.is_empty() && m.len() <= 200)
        .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "choose a model"))?.to_string();
    let base = base_for(&s, p, b.base_url.as_deref()).await?;
    let key = key_for(&s, user.id, &b).await?;
    list_models(&s, p, &base, &key).await?; // proves the key and URL work before saving
    let hint: Option<String> = (!key.is_empty()).then(|| key.chars().skip(key.chars().count().saturating_sub(4)).collect());
    let enc = (!key.is_empty()).then(|| s.cipher.encrypt(&key));
    let custom_base = (p.id == "custom").then_some(base);
    sqlx::query("UPDATE users SET ai_provider = $2, ai_base_url = $3, ai_model = $4, ai_key_enc = $5, ai_key_hint = $6 WHERE id = $1")
        .bind(user.id)
        .bind(p.id)
        .bind(&custom_base)
        .bind(&model)
        .bind(enc)
        .bind(&hint)
        .execute(&s.db)
        .await?;
    Ok(Json(json!({ "provider": p.id, "base_url": custom_base, "model": model, "key_hint": hint })))
}

pub async fn delete(State(s): State<AppState>, user: User) -> Res<StatusCode> {
    sqlx::query("UPDATE users SET ai_provider = NULL, ai_base_url = NULL, ai_model = NULL, ai_key_enc = NULL, ai_key_hint = NULL WHERE id = $1")
        .bind(user.id)
        .execute(&s.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- AI features ----------

const WHISPER_SYSTEM: &str = "You write margin notes beside a writer's own prose. \
You get the paragraph they are writing and a phrase they highlighted in it. \
Reply with one note of at most two short sentences (under 200 characters) that deepens their understanding \
of that phrase in this context: a definition, a key fact or formula, or a sharp counterpoint. \
Plain text only, no preamble, no markdown, never rewrite their sentence.";

#[derive(Deserialize)]
pub struct WhisperReq {
    text: String,
    context: String,
}

pub async fn whisper(State(s): State<AppState>, user: User, Json(b): Json<WhisperReq>) -> Res<Json<Value>> {
    let text = b.text.trim();
    if text.is_empty() {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "highlight some text first"));
    }
    if text.chars().count() > 500 || b.context.chars().count() > 8000 {
        return Err(AppError::new(StatusCode::PAYLOAD_TOO_LARGE, "highlight or paragraph is too long for a margin note"));
    }
    let p = provider_for(&s, user.id).await?;
    let prompt = format!("<paragraph>{}</paragraph>\n<highlighted>{}</highlighted>", b.context, text);
    complete(&s, &p, WHISPER_SYSTEM, &prompt, None).await
}

const ANNOTATE_SYSTEM: &str = "You annotate part of a user's whiteboard: a hand-drawn sketch, diagram, or equation. \
Reply with one short sticky note (under 240 characters): say what it shows and add one useful insight, check, or correction \
(for example, verify an equation or name the pattern in a diagram). Plain text only, no preamble, no markdown.";
pub const MAX_IMAGE_B64: usize = 7_000_000;

#[derive(Deserialize)]
pub struct AnnotateReq {
    image_jpeg_base64: String,
}

/// FR-1.4: a picture of the lassoed region goes to the user's model; the note is placed beside it.
pub async fn annotate(State(s): State<AppState>, user: User, Json(b): Json<AnnotateReq>) -> Res<Json<Value>> {
    if b.image_jpeg_base64.is_empty() || b.image_jpeg_base64.len() > MAX_IMAGE_B64 {
        return Err(AppError::new(StatusCode::PAYLOAD_TOO_LARGE, "selection image is empty or too large"));
    }
    if !b.image_jpeg_base64.bytes().all(|c| c.is_ascii_alphanumeric() || matches!(c, b'+' | b'/' | b'=')) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "image must be base64"));
    }
    let p = provider_for(&s, user.id).await?;
    if !p.preset.vision {
        return Err(AppError::new(StatusCode::BAD_REQUEST, format!("{} models can't read images; switch to a vision-capable provider for AI Annotate", p.preset.label)));
    }
    complete(&s, &p, ANNOTATE_SYSTEM, "Annotate this part of my whiteboard.", Some(&b.image_jpeg_base64)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn public_ip_filter() {
        for ip in ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"] {
            assert!(!is_public_ip(ip.parse().unwrap()), "{ip} must be blocked");
        }
        for ip in ["1.1.1.1", "104.18.0.1", "2606:4700::1111"] {
            assert!(is_public_ip(ip.parse().unwrap()), "{ip} is public");
        }
    }

    #[test]
    fn anthropic_body_gates_effort_and_fallbacks() {
        let b = anthropic_body("claude-opus-5-5", "sys", json!("hi"));
        assert_eq!(b["output_config"]["effort"], "low");
        assert_eq!(b["fallbacks"], "default");
        let old = anthropic_body("claude-haiku-4-5", "sys", json!("hi"));
        assert!(old.get("output_config").is_none() && old.get("fallbacks").is_none());
    }

    #[test]
    fn openai_body_with_image() {
        let b = openai_body("gpt-x", "sys", "look", Some("QUJD"));
        assert_eq!(b["messages"][0]["role"], "system");
        assert_eq!(b["messages"][1]["content"][1]["image_url"]["url"], "data:image/jpeg;base64,QUJD");
        assert_eq!(openai_body("m", "s", "t", None)["messages"][1]["content"], "t");
    }

    #[test]
    fn parses_both_wire_formats() {
        let a = json!({ "stop_reason": "end_turn", "content": [{ "type": "thinking", "thinking": "" }, { "type": "text", "text": " Note. " }] });
        assert_eq!(parse_anthropic(&a).unwrap(), "Note.");
        assert_eq!(parse_anthropic(&json!({ "stop_reason": "refusal", "content": [] })).unwrap_err().0, StatusCode::UNPROCESSABLE_ENTITY);
        let o = json!({ "choices": [{ "finish_reason": "stop", "message": { "content": "Hi", "refusal": null } }] });
        assert_eq!(parse_openai(&o).unwrap(), "Hi");
        assert!(parse_openai(&json!({ "choices": [{ "finish_reason": "content_filter", "message": {} }] })).is_err());
        assert_eq!(parse_openai(&json!({ "choices": [] })).unwrap_err().0, StatusCode::BAD_GATEWAY);
        assert_eq!(upstream_error(&json!({ "error": { "message": "model does not support images" } })), "model does not support images");
    }

    #[test]
    fn deepseek_is_text_only() {
        assert!(!preset("deepseek").unwrap().vision);
        assert!(preset("nope").is_err());
    }
}
