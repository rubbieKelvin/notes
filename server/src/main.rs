use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

const HALF_LIFE_SECS: u64 = 14 * 24 * 3600; // FR-3.3
const MODEL: &str = "claude-opus-5-5";
const WHISPER_SYSTEM: &str = "You write margin notes beside a writer's own prose. \
You get the paragraph they are writing and a phrase they highlighted in it. \
Reply with one note of at most two short sentences (under 200 characters) that deepens their understanding \
of that phrase in this context: a definition, a key fact or formula, or a sharp counterpoint. \
Plain text only, no preamble, no markdown, never rewrite their sentence.";

type ApiError = (StatusCode, String);

#[derive(Clone, Debug, Serialize)]
struct InboxItem {
    id: u64,
    agent_id: String,
    title: Option<String>,
    content_md: String,
    source_uri: Option<String>,
    created_at: u64,
    expires_at: u64,
}

// shortcut: in-memory inbox, lost on restart; move to Postgres `agent_inbox_items` in Phase 3.
#[derive(Default)]
struct Inbox {
    next_id: u64,
    items: Vec<InboxItem>,
}

#[derive(Clone)]
struct AppState {
    inbox: Arc<Mutex<Inbox>>,
    http: reqwest::Client,
    api_key: Option<String>,
    api_base: String,
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

fn bad(code: StatusCode, msg: impl Into<String>) -> ApiError {
    (code, msg.into())
}

#[derive(Deserialize)]
struct Ingest {
    content_md: String,
    title: Option<String>,
    agent_id: Option<String>,
    source_uri: Option<String>,
}

async fn ingest(State(s): State<AppState>, Json(b): Json<Ingest>) -> Result<(StatusCode, Json<InboxItem>), ApiError> {
    if b.content_md.trim().is_empty() {
        return Err(bad(StatusCode::BAD_REQUEST, "content_md is required"));
    }
    let mut inbox = s.inbox.lock().unwrap();
    inbox.next_id += 1;
    let t = now();
    let item = InboxItem {
        id: inbox.next_id,
        agent_id: b.agent_id.unwrap_or_else(|| "external".into()),
        title: b.title,
        content_md: b.content_md,
        source_uri: b.source_uri,
        created_at: t,
        expires_at: t + HALF_LIFE_SECS,
    };
    inbox.items.push(item.clone());
    Ok((StatusCode::CREATED, Json(item)))
}

async fn list_inbox(State(s): State<AppState>) -> Json<Vec<InboxItem>> {
    let mut inbox = s.inbox.lock().unwrap();
    let t = now();
    inbox.items.retain(|i| i.expires_at > t); // the 14-day half-life, applied on read
    Json(inbox.items.iter().rev().cloned().collect())
}

// Absorbed or dismissed: either way it leaves the inbox.
async fn remove_item(State(s): State<AppState>, Path(id): Path<u64>) -> StatusCode {
    let mut inbox = s.inbox.lock().unwrap();
    let before = inbox.items.len();
    inbox.items.retain(|i| i.id != id);
    if inbox.items.len() < before { StatusCode::NO_CONTENT } else { StatusCode::NOT_FOUND }
}

#[derive(Deserialize)]
struct WhisperReq {
    text: String,
    context: String,
}

async fn whisper(State(s): State<AppState>, Json(b): Json<WhisperReq>) -> Result<Json<Value>, ApiError> {
    let key = s.api_key.as_deref().ok_or_else(|| bad(StatusCode::SERVICE_UNAVAILABLE, "ANTHROPIC_API_KEY is not set on the server"))?;
    let text = b.text.trim();
    if text.is_empty() {
        return Err(bad(StatusCode::BAD_REQUEST, "highlight some text first"));
    }
    if text.chars().count() > 500 || b.context.chars().count() > 8000 {
        return Err(bad(StatusCode::PAYLOAD_TOO_LARGE, "highlight or paragraph is too long for a margin note"));
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
        .post(format!("{}/v1/messages", s.api_base))
        .header("x-api-key", key)
        .header("anthropic-version", "2026-10-21")
        .header("anthropic-beta", "server-side-fallback-2026-07-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| bad(StatusCode::BAD_GATEWAY, format!("AI request failed: {e}")))?;
    let status = res.status();
    let msg: Value = res.json().await.map_err(|e| bad(StatusCode::BAD_GATEWAY, format!("bad AI response: {e}")))?;
    if !status.is_success() {
        eprintln!("anthropic {status}: {msg}");
        return Err(bad(StatusCode::BAD_GATEWAY, format!("AI service returned {status}")));
    }
    if msg["stop_reason"] == "refusal" {
        return Err(bad(StatusCode::UNPROCESSABLE_ENTITY, "the AI declined to annotate this"));
    }
    let note: String = msg["content"].as_array().into_iter().flatten()
        .filter(|b| b["type"] == "text")
        .filter_map(|b| b["text"].as_str())
        .collect();
    if note.trim().is_empty() {
        return Err(bad(StatusCode::BAD_GATEWAY, "the AI returned no note"));
    }
    Ok(Json(json!({ "note": note.trim(), "agent_id": msg["model"].as_str().unwrap_or(MODEL) })))
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/v1/notes/ingest", post(ingest))
        .route("/v1/inbox", get(list_inbox))
        .route("/v1/inbox/{id}", delete(remove_item))
        .route("/v1/whisper", post(whisper))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let state = AppState {
        inbox: Default::default(),
        http: reqwest::Client::new(),
        api_key: std::env::var("ANTHROPIC_API_KEY").ok().filter(|k| !k.is_empty()),
        api_base: std::env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.anthropic.com".into()),
    };
    if state.api_key.is_none() {
        eprintln!("warning: ANTHROPIC_API_KEY not set, /v1/whisper will return 503");
    }
    // shortcut: no auth yet, so bind to localhost only; scoped API keys arrive in Phase 3.
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080").await.unwrap();
    println!("opennotes server on http://127.0.0.1:8080");
    axum::serve(listener, app(state)).await.unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> AppState {
        AppState { inbox: Default::default(), http: reqwest::Client::new(), api_key: None, api_base: String::new() }
    }

    #[tokio::test]
    async fn inbox_ingest_list_remove_and_expiry() {
        let s = state();
        let empty = ingest(State(s.clone()), Json(Ingest { content_md: "  ".into(), title: None, agent_id: None, source_uri: None })).await;
        assert_eq!(empty.unwrap_err().0, StatusCode::BAD_REQUEST);

        let (code, Json(item)) = ingest(State(s.clone()), Json(Ingest { content_md: "trace".into(), title: None, agent_id: None, source_uri: None })).await.unwrap();
        assert_eq!(code, StatusCode::CREATED);
        assert_eq!(item.expires_at - item.created_at, HALF_LIFE_SECS);
        assert_eq!(list_inbox(State(s.clone())).await.0.len(), 1);

        s.inbox.lock().unwrap().items[0].expires_at = now() - 1;
        assert!(list_inbox(State(s.clone())).await.0.is_empty(), "expired items are archived on read");

        assert_eq!(remove_item(State(s.clone()), Path(item.id)).await, StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn whisper_without_key_is_503() {
        let r = whisper(State(state()), Json(WhisperReq { text: "height".into(), context: "boxes".into() })).await;
        assert_eq!(r.unwrap_err().0, StatusCode::SERVICE_UNAVAILABLE);
    }
}
