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

#[derive(Serialize, sqlx::FromRow)]
pub struct DocInfo {
    id: Uuid,
    title: String,
    mcp_exposed_slug: Option<String>,
    updated_at: DateTime<Utc>,
}

pub async fn list(State(s): State<AppState>, user: User) -> Res<Json<Vec<DocInfo>>> {
    let rows = sqlx::query_as("SELECT id, title, mcp_exposed_slug, updated_at FROM documents WHERE user_id = $1 ORDER BY updated_at DESC")
        .bind(user.id)
        .fetch_all(&s.db)
        .await?;
    Ok(Json(rows))
}

pub async fn create(State(s): State<AppState>, user: User) -> Res<(StatusCode, Json<Value>)> {
    let id: Uuid = sqlx::query_scalar("INSERT INTO documents (user_id) VALUES ($1) RETURNING id").bind(user.id).fetch_one(&s.db).await?;
    Ok((StatusCode::CREATED, Json(json!({ "id": id }))))
}

pub async fn remove(State(s): State<AppState>, user: User, Path(id): Path<Uuid>) -> Res<StatusCode> {
    let r = sqlx::query("DELETE FROM documents WHERE id = $1 AND user_id = $2").bind(id).bind(user.id).execute(&s.db).await?;
    Ok(if r.rows_affected() > 0 { StatusCode::NO_CONTENT } else { StatusCode::NOT_FOUND })
}

pub async fn owns(s: &AppState, user: Uuid, doc: Uuid) -> Res<bool> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM documents WHERE id = $1 AND user_id = $2)")
        .bind(doc)
        .bind(user)
        .fetch_one(&s.db)
        .await?)
}

#[derive(Deserialize)]
pub struct McpToggle {
    enabled: bool,
}

/// FR-3.2: expose (or hide) a document to the owner's MCP clients under a stable slug.
pub async fn set_mcp(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, Json(b): Json<McpToggle>) -> Res<Json<Value>> {
    let slug: Option<Option<String>> = if b.enabled {
        // Keep an existing slug so configured agents keep working across toggles.
        sqlx::query_scalar(
            "UPDATE documents SET mcp_exposed_slug = COALESCE(mcp_exposed_slug, $3) WHERE id = $1 AND user_id = $2 RETURNING mcp_exposed_slug",
        )
        .bind(id)
        .bind(user.id)
        .bind(crypto::new_token("doc-")[..16].to_lowercase())
        .fetch_optional(&s.db)
        .await?
    } else {
        sqlx::query_scalar("UPDATE documents SET mcp_exposed_slug = NULL WHERE id = $1 AND user_id = $2 RETURNING mcp_exposed_slug")
            .bind(id)
            .bind(user.id)
            .fetch_optional(&s.db)
            .await?
    };
    let slug = slug.ok_or_else(|| AppError::new(StatusCode::NOT_FOUND, "no such document"))?;
    Ok(Json(json!({ "mcp_exposed_slug": slug })))
}
