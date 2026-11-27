//! Self-hosted telemetry: product events and errors into the `events` table (see `kpis` view). No note content.
use crate::{AppError, AppState, Res, auth::User};
use axum::{
    Json,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use serde::Deserialize;
use serde_json::{Value, json};
use uuid::Uuid;

/// Event names the browser may send.
const CLIENT_EVENTS: &[&str] = &["sheet_ready", "canvas_expand", "client_error"];
const MAX_PROPS: usize = 4096;

#[derive(Deserialize)]
pub struct NewEvent {
    name: String,
    doc_id: Option<Uuid>,
    #[serde(default)]
    props: Value,
}

pub async fn record(s: &AppState, user: Option<Uuid>, name: &str, doc: Option<Uuid>, props: &Value) {
    let r = sqlx::query("INSERT INTO events (user_id, name, doc_id, props) VALUES ($1, $2, $3, $4)")
        .bind(user)
        .bind(name)
        .bind(doc)
        .bind(props)
        .execute(&s.db)
        .await;
    if let Err(e) = r {
        tracing::warn!(error = %e, event = name, "couldn't record event");
    }
}

pub async fn post(State(s): State<AppState>, user: User, Json(e): Json<NewEvent>) -> Res<StatusCode> {
    if !CLIENT_EVENTS.contains(&e.name.as_str()) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "unknown event"));
    }
    if !e.props.is_object() || e.props.to_string().len() > MAX_PROPS {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "props must be an object under 4 KB"));
    }
    if e.name == "client_error" {
        tracing::warn!(user = %user.id, props = %e.props, "client error");
    }
    record(&s, Some(user.id), &e.name, e.doc_id, &e.props).await;
    Ok(StatusCode::NO_CONTENT)
}

/// Records every 5xx response (panics included, via CatchPanicLayer inside this) as a `server_error` event.
pub async fn track_errors(State(s): State<AppState>, req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let method = req.method().to_string();
    let request_id = req.headers().get("x-request-id").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let res = next.run(req).await;
    if res.status().is_server_error() {
        let props = json!({ "method": method, "path": path, "status": res.status().as_u16(), "request_id": request_id });
        tokio::spawn(async move { record(&s, None, "server_error", None, &props).await });
    }
    res
}
