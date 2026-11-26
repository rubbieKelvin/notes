use crate::{auth::User, AppError, AppState, Res};
use axum::{extract::State, http::StatusCode, Json};
use serde::Deserialize;
use serde_json::{json, Value};

const MODEL: &str = "claude-opus-5-5";
const API_VERSION: &str = "2026-10-21";
const WHISPER_SYSTEM: &str = "You write margin notes beside a writer's own prose. \
You get the paragraph they are writing and a phrase they highlighted in it. \
Reply with one note of at most two short sentences (under 200 characters) that deepens their understanding \
of that phrase in this context: a definition, a key fact or formula, or a sharp counterpoint. \
Plain text only, no preamble, no markdown, never rewrite their sentence.";

#[derive(Deserialize)]
pub struct KeyReq {
    key: String,
}

/// BYOK: check the key against Anthropic (listing models is free), then store it encrypted.
pub async fn set_key(State(s): State<AppState>, user: User, Json(b): Json<KeyReq>) -> Res<Json<Value>> {
    let key = b.key.trim();
    if key.len() < 20 || key.len() > 512 || key.contains(char::is_whitespace) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "that doesn't look like an Anthropic API key"));
    }
    let res = s.http
        .get(format!("{}/v1/models?limit=1", s.cfg.anthropic_base))
        .header("x-api-key", key)
        .header("anthropic-version", API_VERSION)
        .send()
        .await
        .map_err(|e| AppError::new(StatusCode::BAD_GATEWAY, format!("couldn't reach Anthropic: {e}")))?;
    if res.status() == StatusCode::UNAUTHORIZED || res.status() == StatusCode::FORBIDDEN {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "Anthropic rejected that key"));
    }
    if !res.status().is_success() {
        return Err(AppError::new(StatusCode::BAD_GATEWAY, format!("Anthropic returned {} while checking the key", res.status())));
    }
    let hint = key.chars().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect::<String>();
    sqlx::query("UPDATE users SET anthropic_key_enc = $2, anthropic_key_hint = $3 WHERE id = $1")
        .bind(user.id)
        .bind(s.cipher.encrypt(key))
        .bind(&hint)
        .execute(&s.db)
        .await?;
    Ok(Json(json!({ "anthropic_key_hint": hint })))
}

pub async fn delete_key(State(s): State<AppState>, user: User) -> Res<StatusCode> {
    sqlx::query("UPDATE users SET anthropic_key_enc = NULL, anthropic_key_hint = NULL WHERE id = $1").bind(user.id).execute(&s.db).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct WhisperReq {
    text: String,
    context: String,
}

pub async fn whisper(State(s): State<AppState>, user: User, Json(b): Json<WhisperReq>) -> Res<Json<Value>> {
    let enc: Option<Vec<u8>> = sqlx::query_scalar("SELECT anthropic_key_enc FROM users WHERE id = $1").bind(user.id).fetch_one(&s.db).await?;
    let key = enc
        .and_then(|e| s.cipher.decrypt(&e))
        .ok_or_else(|| AppError::new(StatusCode::PRECONDITION_REQUIRED, "Add your Anthropic API key in Settings to get margin notes"))?;
    let text = b.text.trim();
    if text.is_empty() {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "highlight some text first"));
    }
    if text.chars().count() > 500 || b.context.chars().count() > 8000 {
        return Err(AppError::new(StatusCode::PAYLOAD_TOO_LARGE, "highlight or paragraph is too long for a margin note"));
    }
    let body = json!({
        "model": MODEL,
        "max_tokens": 4000,
        "output_config": { "effort": "low" },
        "fallbacks": "default",
        "system": WHISPER_SYSTEM,
        "messages": [{ "role": "user", "content": format!(
            "<paragraph>{}</paragraph>\n<highlighted>{}</highlighted>", b.context, text
        )}],
    });
    let res = s.http
        .post(format!("{}/v1/messages", s.cfg.anthropic_base))
        .header("x-api-key", key)
        .header("anthropic-version", API_VERSION)
        .header("anthropic-beta", "server-side-fallback-2026-07-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::new(StatusCode::BAD_GATEWAY, format!("AI request failed: {e}")))?;
    let status = res.status();
    let msg: Value = res.json().await.map_err(|e| AppError::new(StatusCode::BAD_GATEWAY, format!("bad AI response: {e}")))?;
    if status == StatusCode::UNAUTHORIZED {
        return Err(AppError::new(StatusCode::PRECONDITION_REQUIRED, "Anthropic rejected your saved key; update it in Settings"));
    }
    if !status.is_success() {
        eprintln!("anthropic {status}: {msg}");
        return Err(AppError::new(StatusCode::BAD_GATEWAY, format!("AI service returned {status}")));
    }
    if msg["stop_reason"] == "refusal" {
        return Err(AppError::new(StatusCode::UNPROCESSABLE_ENTITY, "the AI declined to annotate this"));
    }
    let note: String = msg["content"].as_array().into_iter().flatten()
        .filter(|b| b["type"] == "text")
        .filter_map(|b| b["text"].as_str())
        .collect();
    if note.trim().is_empty() {
        return Err(AppError::new(StatusCode::BAD_GATEWAY, "the AI returned no note"));
    }
    Ok(Json(json!({ "note": note.trim(), "agent_id": msg["model"].as_str().unwrap_or(MODEL) })))
}
