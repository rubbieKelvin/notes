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
use yrs::{Map, ReadTxn, Transact};

#[derive(Serialize, sqlx::FromRow)]
pub struct DocInfo {
    id: Uuid,
    title: String,
    description: String,
    mcp_exposed_slug: Option<String>,
    is_public: bool,
    updated_at: DateTime<Utc>,
    /// owner, edit or view
    role: String,
    owner_name: String,
    owner_username: Option<String>,
    /// This user's own tags for the note.
    tags: Vec<String>,
}

/// The user's own notes and the ones shared with them, newest first.
pub async fn list(State(s): State<AppState>, user: User) -> Res<Json<Vec<DocInfo>>> {
    let rows = sqlx::query_as(
        "SELECT d.id, d.title, d.description, d.is_public, d.updated_at,
                CASE WHEN d.user_id = $1 THEN d.mcp_exposed_slug END AS mcp_exposed_slug,
                CASE WHEN d.user_id = $1 THEN 'owner' ELSE sh.role END AS role,
                COALESCE(NULLIF(o.display_name, ''), split_part(o.email, '@', 1)) AS owner_name, o.username AS owner_username,
                COALESCE((SELECT array_agg(t.tag ORDER BY lower(t.tag)) FROM note_tags t WHERE t.doc_id = d.id AND t.user_id = $1), '{}') AS tags
         FROM documents d
         JOIN users o ON o.id = d.user_id
         LEFT JOIN doc_shares sh ON sh.doc_id = d.id AND sh.email = (SELECT email FROM users WHERE id = $1)
         WHERE d.user_id = $1 OR sh.email IS NOT NULL
         ORDER BY d.updated_at DESC",
    )
    .bind(user.id)
    .fetch_all(&s.db)
    .await?;
    Ok(Json(rows))
}

/// "owner", "edit" or "view" for a note the user may open; None otherwise.
pub async fn access(s: &AppState, user: Uuid, doc: Uuid) -> Res<Option<String>> {
    Ok(sqlx::query_scalar(
        "SELECT CASE WHEN d.user_id = $2 THEN 'owner' ELSE sh.role END
         FROM documents d LEFT JOIN doc_shares sh ON sh.doc_id = d.id AND sh.email = (SELECT email FROM users WHERE id = $2)
         WHERE d.id = $1",
    )
    .bind(doc)
    .bind(user)
    .fetch_optional(&s.db)
    .await?
    .flatten())
}

#[derive(Deserialize, Default)]
pub struct CreateDoc {
    #[serde(default)]
    title: String,
}

/// A new page, optionally already titled (the switcher's "Create “…”"). The title goes into the
/// Y.Doc's meta map, where the editor reads it, as well as the title column.
pub async fn create(State(s): State<AppState>, user: User, body: Option<Json<CreateDoc>>) -> Res<(StatusCode, Json<Value>)> {
    let title: String = body.map(|b| b.0.title).unwrap_or_default().trim().chars().take(200).collect();
    let state = (!title.is_empty()).then(|| {
        let doc = yrs::Doc::new();
        let meta = doc.get_or_insert_map("meta");
        meta.insert(&mut doc.transact_mut(), "title", title.as_str());
        doc.transact().encode_state_as_update_v1(&yrs::StateVector::default())
    });
    let id: Uuid = sqlx::query_scalar("INSERT INTO documents (user_id, title, yjs_state) VALUES ($1, COALESCE(NULLIF($2, ''), 'Untitled'), $3) RETURNING id")
        .bind(user.id)
        .bind(&title)
        .bind(state)
        .fetch_one(&s.db)
        .await?;
    Ok((StatusCode::CREATED, Json(json!({ "id": id, "title": if title.is_empty() { "Untitled" } else { &title } }))))
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

#[derive(Deserialize)]
pub struct Tags {
    tags: Vec<String>,
}

/// Trimmed, at most 40 characters each and 20 in all, without case-insensitive duplicates.
fn clean_tags(raw: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for t in raw {
        let t: String = t.trim().trim_start_matches('#').chars().filter(|c| !c.is_control()).take(40).collect();
        let t = t.trim().to_string();
        if !t.is_empty() && !out.iter().any(|o| o.to_lowercase() == t.to_lowercase()) {
            out.push(t);
        }
    }
    out.truncate(20);
    out
}

/// Replaces your tags on a note you can open. Others who can open it never see them.
pub async fn set_tags(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, Json(b): Json<Tags>) -> Res<Json<Vec<String>>> {
    if access(&s, user.id, id).await?.is_none() {
        return Err(AppError::new(StatusCode::NOT_FOUND, "no such document"));
    }
    let tags = clean_tags(b.tags);
    let mut tx = s.db.begin().await?;
    sqlx::query("DELETE FROM note_tags WHERE user_id = $1 AND doc_id = $2").bind(user.id).bind(id).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO note_tags (user_id, doc_id, tag) SELECT $1, $2, unnest($3::TEXT[])").bind(user.id).bind(id).bind(&tags).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(tags))
}

#[cfg(test)]
mod tests {
    #[test]
    fn tags_are_cleaned() {
        let raw = ["  Work ", "#ideas", "work", "", "a\nb", &"x".repeat(50)].map(String::from).to_vec();
        assert_eq!(super::clean_tags(raw), ["Work", "ideas", "ab", &"x".repeat(40)]);
        assert_eq!(super::clean_tags((0..30).map(|i| i.to_string()).collect()).len(), 20);
    }
}
