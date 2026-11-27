//! Sharing a note with people by email, and publishing notes at /public/@username/<id>.
use crate::{auth::User, docs, email, sync, AppError, AppState, Res};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

const MAX_SHARES: i64 = 100;

async fn owned(s: &AppState, user: &User, id: Uuid) -> Res<()> {
    if docs::owns(s, user.id, id).await? { Ok(()) } else { Err(AppError::new(StatusCode::NOT_FOUND, "no such document")) }
}

#[derive(Serialize, sqlx::FromRow)]
pub struct Share {
    email: String,
    role: String,
    /// Display name once they have an account; None while the invite is pending.
    name: Option<String>,
}

async fn shares(s: &AppState, id: Uuid) -> Res<Vec<Share>> {
    Ok(sqlx::query_as(
        "SELECT sh.email, sh.role, CASE WHEN u.id IS NULL THEN NULL ELSE COALESCE(NULLIF(u.display_name, ''), split_part(u.email, '@', 1)) END AS name
         FROM doc_shares sh LEFT JOIN users u ON u.email = sh.email WHERE sh.doc_id = $1 ORDER BY sh.created_at",
    )
    .bind(id)
    .fetch_all(&s.db)
    .await?)
}

/// Who a note is shared with, and whether it is public (owner only).
pub async fn list(State(s): State<AppState>, user: User, Path(id): Path<Uuid>) -> Res<Json<Value>> {
    owned(&s, &user, id).await?;
    let is_public: bool = sqlx::query_scalar("SELECT is_public FROM documents WHERE id = $1").bind(id).fetch_one(&s.db).await?;
    Ok(Json(json!({ "shares": shares(&s, id).await?, "is_public": is_public })))
}

#[derive(Deserialize)]
pub struct Invite {
    email: String,
    role: String,
}

/// Shares a note with an email address (or changes their role). New invitees get an email with a link.
pub async fn invite(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, Json(b): Json<Invite>) -> Res<Json<Value>> {
    owned(&s, &user, id).await?;
    let email = b.email.trim().to_lowercase();
    if !email::valid_address(&email) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "enter a valid email"));
    }
    if b.role != "view" && b.role != "edit" {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "role must be view or edit"));
    }
    let (owner_email, owner_name, title): (String, String, String) = sqlx::query_as(
        "SELECT u.email, COALESCE(NULLIF(u.display_name, ''), split_part(u.email, '@', 1)), d.title FROM documents d JOIN users u ON u.id = d.user_id WHERE d.id = $1",
    )
    .bind(id)
    .fetch_one(&s.db)
    .await?;
    let title = sync::live_title(&s, id).await.unwrap_or(title);
    if email == owner_email {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "that's you; you already own this note"));
    }
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM doc_shares WHERE doc_id = $1").bind(id).fetch_one(&s.db).await?;
    let inserted: bool = sqlx::query_scalar(
        "INSERT INTO doc_shares (doc_id, email, role) SELECT $1, $2, $3 WHERE $4 < $5 OR EXISTS (SELECT 1 FROM doc_shares WHERE doc_id = $1 AND email = $2)
         ON CONFLICT (doc_id, email) DO UPDATE SET role = EXCLUDED.role RETURNING (xmax = 0)",
    )
    .bind(id)
    .bind(&email)
    .bind(&b.role)
    .bind(count)
    .bind(MAX_SHARES)
    .fetch_optional(&s.db)
    .await?
    .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, format!("a note can be shared with at most {MAX_SHARES} people")))?;

    // Only new invites send mail, and at most a few per recipient, so sharing can't be used to spam an address.
    if inserted && s.login_limiter.hit(&format!("invite:{email}")).is_none() {
        // One line each: titles come from the document and may hold anything.
        let one_line = |v: &str| v.split_whitespace().collect::<Vec<_>>().join(" ");
        let ctx = json!({
            "owner_name": one_line(&owner_name), "owner_email": owner_email, "title": one_line(&title), "role": b.role,
            "link": format!("{}/d/{id}", s.cfg.public_url), "preheader": format!("{} shared a note with you", one_line(&owner_name)),
        });
        if let Err(e) = s.email.send(email::kinds::SHARE_INVITE, &email, ctx).await {
            eprintln!("invite mail to {email} failed: {e}"); // the share itself stands; the owner can send the link
        }
    }
    Ok(Json(json!({ "shares": shares(&s, id).await? })))
}

pub async fn revoke(State(s): State<AppState>, user: User, Path((id, email)): Path<(Uuid, String)>) -> Res<Json<Value>> {
    owned(&s, &user, id).await?;
    sqlx::query("DELETE FROM doc_shares WHERE doc_id = $1 AND email = $2").bind(id).bind(email.trim().to_lowercase()).execute(&s.db).await?;
    Ok(Json(json!({ "shares": shares(&s, id).await? })))
}

#[derive(Deserialize)]
pub struct Publish {
    public: bool,
}

pub async fn set_public(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, Json(b): Json<Publish>) -> Res<Json<Value>> {
    owned(&s, &user, id).await?;
    sqlx::query("UPDATE documents SET is_public = $2 WHERE id = $1").bind(id).bind(b.public).execute(&s.db).await?;
    Ok(Json(json!({ "is_public": b.public })))
}

#[derive(Serialize, sqlx::FromRow)]
struct PublicNote {
    id: Uuid,
    title: String,
    description: String,
    updated_at: DateTime<Utc>,
}

fn handle(h: &str) -> Res<String> {
    let u = h.strip_prefix('@').unwrap_or(h).to_lowercase();
    if crate::auth::valid_username(&u) { Ok(u) } else { Err(not_found()) }
}
fn not_found() -> AppError {
    AppError::new(StatusCode::NOT_FOUND, "nothing public here")
}

async fn owner(s: &AppState, username: &str) -> Res<(Uuid, String, String)> {
    sqlx::query_as("SELECT id, COALESCE(NULLIF(display_name, ''), split_part(email, '@', 1)), username FROM users WHERE username = $1")
        .bind(username)
        .fetch_optional(&s.db)
        .await?
        .ok_or_else(not_found)
}

/// /public/@username: exists only while the user has at least one public note.
pub async fn profile(State(s): State<AppState>, Path(h): Path<String>) -> Res<Json<Value>> {
    let (id, name, username) = owner(&s, &handle(&h)?).await?;
    let notes: Vec<PublicNote> = sqlx::query_as("SELECT id, title, description, updated_at FROM documents WHERE user_id = $1 AND is_public ORDER BY updated_at DESC")
        .bind(id)
        .fetch_all(&s.db)
        .await?;
    if notes.is_empty() {
        return Err(not_found());
    }
    Ok(Json(json!({ "name": name, "username": username, "notes": notes })))
}

/// One public note, as a Yjs update the page renders read-only. Same 404 for private and missing notes.
pub async fn note(State(s): State<AppState>, Path((h, id)): Path<(String, Uuid)>) -> Res<Json<Value>> {
    let (owner_id, name, username) = owner(&s, &handle(&h)?).await?;
    let meta: Option<PublicNote> = sqlx::query_as("SELECT id, title, description, updated_at FROM documents WHERE id = $1 AND user_id = $2 AND is_public")
        .bind(id)
        .bind(owner_id)
        .fetch_optional(&s.db)
        .await?;
    let meta = meta.ok_or_else(not_found)?;
    let state = sync::snapshot(&s, id).await?;
    Ok(Json(json!({ "note": meta, "owner": { "name": name, "username": username }, "state": STANDARD.encode(state) })))
}
