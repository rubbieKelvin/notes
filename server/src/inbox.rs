use crate::{auth::{self, User}, AppError, AppState, Res};
use axum::{
    extract::{FromRequestParts, Path, State},
    http::{request::Parts, StatusCode},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

const MAX_CONTENT: usize = 100_000;

#[derive(Serialize, sqlx::FromRow)]
pub struct Item {
    id: Uuid,
    agent_id: String,
    title: Option<String>,
    content_md: String,
    source_uri: Option<String>,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct Ingest {
    pub content_md: String,
    pub title: Option<String>,
    pub agent_id: Option<String>,
    pub source_uri: Option<String>,
}

pub async fn push(s: &AppState, user: Uuid, b: Ingest) -> Res<Item> {
    if b.content_md.trim().is_empty() {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "content_md is required"));
    }
    if b.content_md.len() > MAX_CONTENT || b.title.as_ref().is_some_and(|t| t.len() > 500) || b.source_uri.as_ref().is_some_and(|u| u.len() > 2000) {
        return Err(AppError::new(StatusCode::PAYLOAD_TOO_LARGE, "item too large"));
    }
    let agent: String = b.agent_id.unwrap_or_else(|| "external".into()).chars().take(128).collect();
    Ok(sqlx::query_as(
        "INSERT INTO agent_inbox_items (user_id, agent_id, title, content_md, source_uri) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, agent_id, title, content_md, source_uri, created_at, expires_at",
    )
    .bind(user)
    .bind(agent)
    .bind(b.title)
    .bind(b.content_md)
    .bind(b.source_uri)
    .fetch_one(&s.db)
    .await?)
}

/// FR-3.1 webhook: `Authorization: Bearer <token with ingest scope>` (or a signed-in session).
pub async fn ingest(State(s): State<AppState>, mut parts: Parts, Json(b): Json<Ingest>) -> Res<(StatusCode, Json<Item>)> {
    let user = match auth::bearer_user(&s, &parts.headers, "ingest").await? {
        Some(id) => id,
        None => User::from_request_parts(&mut parts, &s).await?.id,
    };
    Ok((StatusCode::CREATED, Json(push(&s, user, b).await?)))
}

pub async fn list(State(s): State<AppState>, user: User) -> Res<Json<Vec<Item>>> {
    let rows = sqlx::query_as(
        "SELECT id, agent_id, title, content_md, source_uri, created_at, expires_at FROM agent_inbox_items
         WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW() ORDER BY created_at DESC",
    )
    .bind(user.id)
    .fetch_all(&s.db)
    .await?;
    Ok(Json(rows))
}

/// `absorb` (moved into a page) or `archive` (dismissed).
pub async fn resolve(State(s): State<AppState>, user: User, Path((id, action)): Path<(Uuid, String)>) -> Res<StatusCode> {
    let status = match action.as_str() {
        "absorb" => "absorbed",
        "archive" => "archived",
        _ => return Err(AppError::new(StatusCode::NOT_FOUND, "unknown action")),
    };
    let r = sqlx::query("UPDATE agent_inbox_items SET status = $3 WHERE id = $1 AND user_id = $2 AND status = 'pending'")
        .bind(id)
        .bind(user.id)
        .bind(status)
        .execute(&s.db)
        .await?;
    Ok(if r.rows_affected() > 0 { StatusCode::NO_CONTENT } else { StatusCode::NOT_FOUND })
}
