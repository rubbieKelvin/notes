//! Comment threads on notes, reactions on comments, and reactions on public notes.
//!
//! Who may do what:
//! - read and post comments: anyone who can open the note (any role), and anyone at all on a public note,
//!   including guests without an account, who leave a name. Only while the owner allows comments.
//! - react: signed-in people who can read the note. Guests can't.
//! - delete a comment: its author, or the note's owner.
use crate::{auth::User, docs, AppError, AppState, Res};
use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

pub const EMOJI: [&str; 6] = ["👍", "❤️", "🎉", "😄", "🤔", "👀"];
const MAX_BODY: usize = 4000;
const MAX_GUEST_NAME: usize = 40;

/// What the caller may do with a note's comments.
struct Access {
    owner: bool,
    can_read: bool,
    /// signed in and able to read: may react
    member: bool,
    enabled: bool,
    is_public: bool,
}

async fn access(s: &AppState, user: Option<&User>, doc: Uuid) -> Res<Access> {
    let row: Option<(bool, bool)> = sqlx::query_as("SELECT is_public, comments_enabled FROM documents WHERE id = $1").bind(doc).fetch_optional(&s.db).await?;
    let (is_public, enabled) = row.ok_or_else(not_found)?;
    let role = match user {
        Some(u) => docs::access(s, u.id, doc).await?,
        None => None,
    };
    let can_read = role.is_some() || is_public;
    if !can_read {
        return Err(not_found());
    }
    Ok(Access { owner: role.as_deref() == Some("owner"), can_read, member: user.is_some(), enabled, is_public })
}

fn not_found() -> AppError {
    AppError::new(StatusCode::NOT_FOUND, "no such note")
}

#[derive(Serialize)]
struct Reaction {
    emoji: String,
    count: i64,
    mine: bool,
}

#[derive(Serialize)]
struct CommentOut {
    id: Uuid,
    parent_id: Option<Uuid>,
    author: String,
    author_username: Option<String>,
    guest: bool,
    body: String,
    created_at: DateTime<Utc>,
    can_delete: bool,
    reactions: Vec<Reaction>,
}

/// What a reaction is on. Each has its own fixed queries (sqlx only takes static SQL).
#[derive(Clone, Copy)]
enum On {
    Comment,
    Note,
}

impl On {
    fn list(self) -> &'static str {
        match self {
            On::Comment => "SELECT comment_id, emoji, COUNT(*), COALESCE(BOOL_OR(user_id = $2), FALSE) FROM comment_reactions WHERE comment_id = ANY($1) GROUP BY comment_id, emoji",
            On::Note => "SELECT doc_id, emoji, COUNT(*), COALESCE(BOOL_OR(user_id = $2), FALSE) FROM note_reactions WHERE doc_id = ANY($1) GROUP BY doc_id, emoji",
        }
    }
    fn remove(self) -> &'static str {
        match self {
            On::Comment => "DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2 AND emoji = $3",
            On::Note => "DELETE FROM note_reactions WHERE doc_id = $1 AND user_id = $2 AND emoji = $3",
        }
    }
    fn add(self) -> &'static str {
        match self {
            On::Comment => "INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            On::Note => "INSERT INTO note_reactions (doc_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        }
    }
}

async fn reactions_of(s: &AppState, on: On, ids: &[Uuid], user: Option<Uuid>) -> Res<Vec<(Uuid, Reaction)>> {
    let rows: Vec<(Uuid, String, i64, bool)> = sqlx::query_as(on.list())
    .bind(ids)
    .bind(user)
    .fetch_all(&s.db)
    .await?;
    let mut out: Vec<(Uuid, Reaction)> = rows.into_iter().map(|(id, emoji, count, mine)| (id, Reaction { emoji, count, mine })).collect();
    out.sort_by_key(|(_, r)| EMOJI.iter().position(|e| *e == r.emoji));
    Ok(out)
}

async fn thread(s: &AppState, doc: Uuid, user: Option<&User>, owner: bool) -> Res<Vec<CommentOut>> {
    let rows: Vec<(Uuid, Option<Uuid>, Option<Uuid>, Option<String>, Option<String>, Option<String>, String, DateTime<Utc>)> = sqlx::query_as(
        "SELECT c.id, c.parent_id, c.user_id, c.guest_name,
                CASE WHEN u.id IS NULL THEN NULL ELSE COALESCE(NULLIF(u.display_name, ''), split_part(u.email, '@', 1)) END, u.username,
                c.body, c.created_at
         FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.doc_id = $1 ORDER BY c.created_at",
    )
    .bind(doc)
    .fetch_all(&s.db)
    .await?;
    let ids: Vec<Uuid> = rows.iter().map(|r| r.0).collect();
    let mut reactions = reactions_of(s, On::Comment, &ids, user.map(|u| u.id)).await?;
    Ok(rows
        .into_iter()
        .map(|(id, parent_id, author_id, guest, name, username, body, created_at)| {
            let mine: Vec<Reaction> = reactions.extract_if(.., |(c, _)| *c == id).map(|(_, r)| r).collect();
            CommentOut {
                id,
                parent_id,
                guest: guest.is_some(),
                author: name.or(guest).unwrap_or_default(),
                author_username: username,
                body,
                created_at,
                can_delete: owner || (author_id.is_some() && author_id == user.map(|u| u.id)),
                reactions: mine,
            }
        })
        .collect())
}

/// The thread, plus what the caller may do. With comments off, only the owner still sees past comments.
pub async fn list(State(s): State<AppState>, user: Option<User>, Path(doc): Path<Uuid>) -> Res<Json<Value>> {
    let a = access(&s, user.as_ref(), doc).await?;
    let comments = if a.enabled || a.owner { thread(&s, doc, user.as_ref(), a.owner).await? } else { Vec::new() };
    Ok(Json(json!({
        "enabled": a.enabled,
        "can_comment": a.enabled && a.can_read,
        "can_react": a.member,
        "guest": user.is_none(),
        "owner": a.owner,
        "emoji": EMOJI,
        "comments": comments,
    })))
}

#[derive(Deserialize)]
pub struct NewComment {
    body: String,
    parent_id: Option<Uuid>,
    guest_name: Option<String>,
}

/// The visitor's address as set by our nginx (X-Real-IP, which it overwrites); "direct" without a proxy.
fn client_ip(headers: &HeaderMap) -> String {
    headers.get("x-real-ip").and_then(|v| v.to_str().ok()).unwrap_or("direct").to_string()
}

pub async fn post(State(s): State<AppState>, user: Option<User>, headers: HeaderMap, Path(doc): Path<Uuid>, Json(b): Json<NewComment>) -> Res<(StatusCode, Json<Value>)> {
    let a = access(&s, user.as_ref(), doc).await?;
    if !a.enabled {
        return Err(AppError::new(StatusCode::FORBIDDEN, "comments are turned off for this note"));
    }
    let body = b.body.trim();
    if body.is_empty() || body.chars().count() > MAX_BODY {
        return Err(AppError::new(StatusCode::BAD_REQUEST, format!("comments are 1–{MAX_BODY} characters")));
    }
    let guest_name = match &user {
        Some(_) => None,
        None => {
            debug_assert!(a.is_public); // access() only lets guests through on public notes
            let name = b.guest_name.as_deref().unwrap_or("").trim();
            if name.is_empty() || name.chars().count() > MAX_GUEST_NAME || name.chars().any(char::is_control) {
                return Err(AppError::new(StatusCode::BAD_REQUEST, format!("add your name (up to {MAX_GUEST_NAME} characters) to comment")));
            }
            if let Some(secs) = s.login_limiter.hit(&format!("guest-comment:{}", client_ip(&headers))) {
                return Err(AppError::new(StatusCode::TOO_MANY_REQUESTS, format!("too many comments; try again in {} minutes, or sign in", secs.div_ceil(60))));
            }
            Some(name.to_string())
        }
    };
    if let Some(p) = b.parent_id {
        // Replies go under a top-level comment of the same note.
        let ok: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM comments WHERE id = $1 AND doc_id = $2 AND parent_id IS NULL)")
            .bind(p)
            .bind(doc)
            .fetch_one(&s.db)
            .await?;
        if !ok {
            return Err(AppError::new(StatusCode::BAD_REQUEST, "you can only reply to a comment on this note"));
        }
    }
    sqlx::query("INSERT INTO comments (doc_id, parent_id, user_id, guest_name, body) VALUES ($1, $2, $3, $4, $5)")
        .bind(doc)
        .bind(b.parent_id)
        .bind(user.as_ref().map(|u| u.id))
        .bind(guest_name)
        .bind(body)
        .execute(&s.db)
        .await?;
    Ok((StatusCode::CREATED, Json(json!({ "comments": thread(&s, doc, user.as_ref(), a.owner).await? }))))
}

pub async fn delete(State(s): State<AppState>, user: User, Path(id): Path<Uuid>) -> Res<Json<Value>> {
    let doc: Uuid = sqlx::query_scalar("SELECT doc_id FROM comments WHERE id = $1").bind(id).fetch_optional(&s.db).await?.ok_or_else(not_found)?;
    let a = access(&s, Some(&user), doc).await?;
    let r = sqlx::query("DELETE FROM comments WHERE id = $1 AND ($2 OR user_id = $3)").bind(id).bind(a.owner).bind(user.id).execute(&s.db).await?;
    if r.rows_affected() == 0 {
        return Err(AppError::new(StatusCode::FORBIDDEN, "only its author or the note's owner can delete a comment"));
    }
    Ok(Json(json!({ "comments": thread(&s, doc, Some(&user), a.owner).await? })))
}

#[derive(Deserialize)]
pub struct React {
    emoji: String,
}

fn check_emoji(e: &str) -> Res<()> {
    if EMOJI.contains(&e) { Ok(()) } else { Err(AppError::new(StatusCode::BAD_REQUEST, "unsupported reaction")) }
}

/// Toggles the caller's reaction on a comment.
pub async fn react_comment(State(s): State<AppState>, user: User, Path(id): Path<Uuid>, Json(b): Json<React>) -> Res<Json<Value>> {
    check_emoji(&b.emoji)?;
    let doc: Uuid = sqlx::query_scalar("SELECT doc_id FROM comments WHERE id = $1").bind(id).fetch_optional(&s.db).await?.ok_or_else(not_found)?;
    let a = access(&s, Some(&user), doc).await?;
    if !a.enabled {
        return Err(AppError::new(StatusCode::FORBIDDEN, "comments are turned off for this note"));
    }
    toggle(&s, On::Comment, id, user.id, &b.emoji).await?;
    Ok(Json(json!({ "comments": thread(&s, doc, Some(&user), a.owner).await? })))
}

async fn toggle(s: &AppState, on: On, id: Uuid, user: Uuid, emoji: &str) -> Res<()> {
    let removed = sqlx::query(on.remove()).bind(id).bind(user).bind(emoji).execute(&s.db).await?;
    if removed.rows_affected() == 0 {
        sqlx::query(on.add()).bind(id).bind(user).bind(emoji).execute(&s.db).await?;
    }
    Ok(())
}

async fn note_reaction_list(s: &AppState, doc: Uuid, user: Option<Uuid>) -> Res<Vec<Reaction>> {
    Ok(reactions_of(s, On::Note, &[doc], user).await?.into_iter().map(|(_, r)| r).collect())
}

async fn public_note(s: &AppState, doc: Uuid) -> Res<()> {
    let public: Option<bool> = sqlx::query_scalar("SELECT is_public FROM documents WHERE id = $1").bind(doc).fetch_optional(&s.db).await?;
    if public == Some(true) { Ok(()) } else { Err(not_found()) }
}

/// Reactions on a public note. Anyone can see them; `can_react` only when signed in.
pub async fn note_reactions(State(s): State<AppState>, user: Option<User>, Path(doc): Path<Uuid>) -> Res<Json<Value>> {
    public_note(&s, doc).await?;
    Ok(Json(json!({ "emoji": EMOJI, "can_react": user.is_some(), "reactions": note_reaction_list(&s, doc, user.map(|u| u.id)).await? })))
}

pub async fn react_note(State(s): State<AppState>, user: User, Path(doc): Path<Uuid>, Json(b): Json<React>) -> Res<Json<Value>> {
    check_emoji(&b.emoji)?;
    public_note(&s, doc).await?;
    toggle(&s, On::Note, doc, user.id, &b.emoji).await?;
    Ok(Json(json!({ "emoji": EMOJI, "can_react": true, "reactions": note_reaction_list(&s, doc, Some(user.id)).await? })))
}

#[derive(Deserialize)]
pub struct Enable {
    enabled: bool,
}

pub async fn set_enabled(State(s): State<AppState>, user: User, Path(doc): Path<Uuid>, Json(b): Json<Enable>) -> Res<Json<Value>> {
    let r = sqlx::query("UPDATE documents SET comments_enabled = $3 WHERE id = $1 AND user_id = $2").bind(doc).bind(user.id).bind(b.enabled).execute(&s.db).await?;
    if r.rows_affected() == 0 {
        return Err(not_found());
    }
    Ok(Json(json!({ "enabled": b.enabled })))
}
