use crate::{auth::User, crypto, AppError, AppState, Res};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

pub const SCOPES: [&str; 2] = ["ingest", "mcp"];

#[derive(Serialize, sqlx::FromRow)]
pub struct TokenInfo {
    id: Uuid,
    name: String,
    scopes: Vec<String>,
    last_used_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
}

pub async fn list(State(s): State<AppState>, user: User) -> Res<Json<Vec<TokenInfo>>> {
    let rows = sqlx::query_as("SELECT id, name, scopes, last_used_at, created_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC")
        .bind(user.id)
        .fetch_all(&s.db)
        .await?;
    Ok(Json(rows))
}

#[derive(Deserialize)]
pub struct NewToken {
    name: String,
    scopes: Vec<String>,
}

/// The raw token is returned exactly once; only its hash is stored.
pub async fn create(State(s): State<AppState>, user: User, Json(b): Json<NewToken>) -> Res<(StatusCode, Json<Value>)> {
    let name = b.name.trim();
    if name.is_empty() || name.len() > 100 {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "give the token a name"));
    }
    if b.scopes.is_empty() || !b.scopes.iter().all(|sc| SCOPES.contains(&sc.as_str())) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "scopes must be a non-empty subset of: ingest, mcp"));
    }
    let token = crypto::new_token("on_");
    let id: Uuid = sqlx::query_scalar("INSERT INTO api_tokens (user_id, name, token_hash, scopes) VALUES ($1, $2, $3, $4) RETURNING id")
        .bind(user.id)
        .bind(name)
        .bind(crypto::hash_token(&token))
        .bind(&b.scopes)
        .fetch_one(&s.db)
        .await?;
    Ok((StatusCode::CREATED, Json(json!({ "id": id, "token": token }))))
}

pub async fn revoke(State(s): State<AppState>, user: User, Path(id): Path<Uuid>) -> Res<StatusCode> {
    let r = sqlx::query("DELETE FROM api_tokens WHERE id = $1 AND user_id = $2").bind(id).bind(user.id).execute(&s.db).await?;
    Ok(if r.rows_affected() > 0 { StatusCode::NO_CONTENT } else { StatusCode::NOT_FOUND })
}
