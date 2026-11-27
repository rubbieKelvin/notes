//! Uploaded files: note attachments, canvas images, and the storage page. Bytes live on disk at FILES_DIR/<id>;
//! notes keep only the id, and `file_refs` (rebuilt from each note on save) records which notes show a file.
use crate::{auth::User, docs, AppError, AppState, Res};
use axum::{
    body::Body,
    extract::{Path, Query, Request, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;
use std::path::{Path as FsPath, PathBuf};
use tokio::io::AsyncWriteExt;
use tower_http::services::ServeFile;
use uuid::Uuid;

const MB: u64 = 1024 * 1024;
/// Free plan. shortcut: one quota for everyone, move it onto the user row when paid plans arrive.
pub const QUOTA: u64 = 500 * MB;

/// Per-file limit by kind: videos 100 MB, images and audio 10, PDFs 15, anything else 5.
pub fn limit(mime: &str) -> u64 {
    match mime.split('/').next() {
        Some("video") => 100 * MB,
        Some("image" | "audio") => 10 * MB,
        _ if mime == "application/pdf" => 15 * MB,
        _ => 5 * MB,
    }
}

/// The type from its magic bytes; the client's Content-Type is never trusted. Unknown → a plain download.
fn sniff(b: &[u8]) -> &'static str {
    match b {
        [0x89, b'P', b'N', b'G', ..] => "image/png",
        [0xFF, 0xD8, 0xFF, ..] => "image/jpeg",
        [b'G', b'I', b'F', b'8', ..] => "image/gif",
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'E', b'B', b'P', ..] => "image/webp",
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'A', b'V', b'E', ..] => "audio/wav",
        [b'%', b'P', b'D', b'F', b'-', ..] => "application/pdf",
        [_, _, _, _, b'f', b't', b'y', b'p', b'q', b't', ..] => "video/quicktime",
        [_, _, _, _, b'f', b't', b'y', b'p', b'M', b'4', b'A', ..] => "audio/mp4",
        [_, _, _, _, b'f', b't', b'y', b'p', ..] => "video/mp4",
        [0x1A, 0x45, 0xDF, 0xA3, ..] => "video/webm",
        [b'O', b'g', b'g', b'S', ..] => "audio/ogg",
        [b'f', b'L', b'a', b'C', ..] => "audio/flac",
        [b'I', b'D', b'3', ..] | [0xFF, 0xFB | 0xF3 | 0xF2, ..] => "audio/mpeg",
        _ => "application/octet-stream",
    }
}

/// Browsers may show these in the page; everything else is served as a download.
fn inline(mime: &str) -> bool {
    mime != "application/octet-stream"
}

fn human(bytes: u64) -> String {
    format!("{} MB", bytes / MB)
}

/// A display name from the client: no paths, no control characters, at most 200 characters.
fn clean_name(raw: Option<&str>) -> String {
    let base = raw.unwrap_or_default().rsplit(['/', '\\']).next().unwrap_or_default();
    let name: String = base.chars().filter(|c| !c.is_control()).take(200).collect();
    if name.trim().is_empty() { "file".into() } else { name.trim().to_string() }
}

/// RFC 5987 `filename*` so any name survives the header.
fn disposition(kind: &str, name: &str) -> String {
    let enc: String = name
        .bytes()
        .map(|b| if b.is_ascii_alphanumeric() || b"-._~".contains(&b) { (b as char).to_string() } else { format!("%{b:02X}") })
        .collect();
    format!("{kind}; filename*=UTF-8''{enc}")
}

fn path_of(s: &AppState, id: Uuid) -> PathBuf {
    s.cfg.files_dir.join(id.to_string())
}

#[derive(Serialize, sqlx::FromRow)]
pub struct FileInfo {
    id: Uuid,
    name: String,
    mime: String,
    size: i64,
    created_at: DateTime<Utc>,
    #[sqlx(skip)]
    url: String,
}

impl FileInfo {
    fn with_url(mut self) -> Self {
        self.url = format!("/v1/files/{}", self.id);
        self
    }
}

#[derive(Deserialize)]
pub struct UploadTo {
    /// The note the file goes into, if any; needs edit access. Its readers can load the file right away.
    doc: Option<Uuid>,
    name: Option<String>,
}

fn too_big(msg: String) -> AppError {
    AppError::new(StatusCode::PAYLOAD_TOO_LARGE, msg)
}

async fn used(db: impl sqlx::PgExecutor<'_>, user: Uuid) -> Res<u64> {
    let n: i64 = sqlx::query_scalar("SELECT COALESCE(SUM(size), 0)::BIGINT FROM files WHERE user_id = $1").bind(user).fetch_one(db).await?;
    Ok(n as u64)
}

/// Streams the body to disk, so a 100 MB video never sits in memory, and stops as soon as a limit is passed.
pub async fn upload(State(s): State<AppState>, user: User, Query(q): Query<UploadTo>, headers: HeaderMap, body: Body) -> Res<(StatusCode, Json<FileInfo>)> {
    if let Some(doc) = q.doc {
        if !matches!(docs::access(&s, user.id, doc).await?.as_deref(), Some("owner" | "edit")) {
            return Err(AppError::new(StatusCode::FORBIDDEN, "you can't add files to this note"));
        }
    }
    let room = QUOTA.saturating_sub(used(&s.db, user.id).await?);
    let full = || too_big(format!("Not enough storage: this needs more than the {} you have left of {}", human(room), human(QUOTA)));
    let declared = headers.get(header::CONTENT_LENGTH).and_then(|v| v.to_str().ok()?.parse::<u64>().ok());
    if declared.is_some_and(|n| n > room) {
        return Err(full());
    }

    let id = Uuid::new_v4();
    let part = s.cfg.files_dir.join(format!("{id}.part"));
    let written = receive(body, &part, room, full).await;
    let (mime, size) = match written {
        Ok(v) => v,
        Err(e) => {
            let _ = tokio::fs::remove_file(&part).await;
            return Err(e);
        }
    };
    match save(&s, user.id, id, &q, mime, size, &part).await {
        Ok(info) => Ok((StatusCode::CREATED, Json(info.with_url()))),
        Err(e) => {
            let _ = tokio::fs::remove_file(&part).await;
            let _ = tokio::fs::remove_file(path_of(&s, id)).await;
            Err(e)
        }
    }
}

async fn receive(body: Body, part: &FsPath, room: u64, full: impl Fn() -> AppError) -> Res<(&'static str, u64)> {
    let io = |e: std::io::Error| {
        eprintln!("file write failed: {e}");
        AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "couldn't store the file")
    };
    let mut out = tokio::fs::File::create(part).await.map_err(io)?;
    let mut stream = body.into_data_stream();
    let (mut head, mut size, mut mime) = (Vec::with_capacity(16), 0u64, None::<&str>);
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "upload interrupted"))?;
        if head.len() < 16 {
            head.extend(chunk.iter().take(16 - head.len()));
        }
        size += chunk.len() as u64;
        if mime.is_none() && head.len() >= 16 {
            mime = Some(sniff(&head));
        }
        check(mime, size, room, &full)?;
        out.write_all(&chunk).await.map_err(io)?;
    }
    out.flush().await.map_err(io)?;
    if size == 0 {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "the file is empty"));
    }
    let mime = mime.unwrap_or_else(|| sniff(&head));
    check(Some(mime), size, room, &full)?;
    Ok((mime, size))
}

fn check(mime: Option<&str>, size: u64, room: u64, full: &impl Fn() -> AppError) -> Res<()> {
    // Before the type is known, hold it to the largest per-file limit.
    let max = mime.map_or(100 * MB, limit);
    if size > max {
        let what = match mime.unwrap_or("video").split('/').next() {
            Some("video") => "Videos",
            Some("image") => "Images",
            Some("audio") => "Audio files",
            _ if mime == Some("application/pdf") => "PDFs",
            _ => "Files of this type",
        };
        return Err(too_big(format!("{what} can be at most {}", human(max))));
    }
    if size > room {
        return Err(full());
    }
    Ok(())
}

async fn save(s: &AppState, user: Uuid, id: Uuid, q: &UploadTo, mime: &str, size: u64, part: &FsPath) -> Res<FileInfo> {
    let mut tx = s.db.begin().await?;
    // Serializes one person's uploads, so two at once can't both squeeze under the quota.
    sqlx::query("SELECT 1 FROM users WHERE id = $1 FOR UPDATE").bind(user).execute(&mut *tx).await?;
    if used(&mut *tx, user).await? + size > QUOTA {
        return Err(too_big(format!("Not enough storage: you've used your {}", human(QUOTA))));
    }
    let info: FileInfo = sqlx::query_as("INSERT INTO files (id, user_id, mime, name, size) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, mime, size, created_at")
        .bind(id)
        .bind(user)
        .bind(mime)
        .bind(clean_name(q.name.as_deref()))
        .bind(size as i64)
        .fetch_one(&mut *tx)
        .await?;
    if let Some(doc) = q.doc {
        sqlx::query("INSERT INTO file_refs (file_id, doc_id) VALUES ($1, $2)").bind(id).bind(doc).execute(&mut *tx).await?;
    }
    tokio::fs::rename(part, path_of(s, id)).await.map_err(|e| {
        eprintln!("file rename failed: {e}");
        AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "couldn't store the file")
    })?;
    tx.commit().await?;
    Ok(info)
}

/// Served to the uploader, anyone who can open a note it sits in, and everyone if one of those notes is public.
/// Range requests work, so videos seek.
pub async fn get(State(s): State<AppState>, user: Option<User>, Path(id): Path<Uuid>, req: Request) -> Res<Response> {
    let row: Option<(String, String, bool)> = sqlx::query_as(
        "SELECT f.mime, f.name, (f.user_id = $2 OR EXISTS (
             SELECT 1 FROM file_refs r JOIN documents d ON d.id = r.doc_id
             LEFT JOIN doc_shares sh ON sh.doc_id = d.id AND sh.email = (SELECT email FROM users WHERE id = $2)
             WHERE r.file_id = f.id AND (d.is_public OR d.user_id = $2 OR sh.role IS NOT NULL))) IS TRUE
         FROM files f WHERE f.id = $1",
    )
    .bind(id)
    .bind(user.map(|u| u.id))
    .fetch_optional(&s.db)
    .await?;
    let missing = || AppError::new(StatusCode::NOT_FOUND, "no such file");
    let (mime, name, allowed) = row.ok_or_else(missing)?;
    if !allowed {
        return Err(missing());
    }
    let mut res = ServeFile::new(path_of(&s, id)).try_call(req).await.map_err(|_| missing())?.into_response();
    let h = res.headers_mut();
    let value = |v: String| HeaderValue::from_str(&v).map_err(|_| missing());
    h.insert(header::CONTENT_TYPE, value(mime.clone())?);
    h.insert(header::CONTENT_DISPOSITION, value(disposition(if inline(&mime) { "inline" } else { "attachment" }, &name))?);
    // Files never change once uploaded; nosniff keeps a browser from reinterpreting the bytes.
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("private, max-age=31536000, immutable"));
    h.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    Ok(res)
}

#[derive(Deserialize, Serialize)]
struct NoteRef {
    id: Uuid,
    title: String,
}

/// Everything you've uploaded, with the notes each one is in, and how much of your storage it takes.
pub async fn list(State(s): State<AppState>, user: User) -> Res<Json<Value>> {
    // Notes you can't open are only counted: their titles aren't yours to see.
    let rows: Vec<(Uuid, String, String, i64, DateTime<Utc>, String, i64)> = sqlx::query_as(
        "SELECT f.id, f.name, f.mime, f.size, f.created_at,
                COALESCE(json_agg(json_build_object('id', d.id, 'title', d.title) ORDER BY d.title)
                    FILTER (WHERE d.user_id = $1 OR sh.role IS NOT NULL), '[]')::TEXT,
                COUNT(d.id) FILTER (WHERE d.user_id <> $1 AND sh.role IS NULL)
         FROM files f
         LEFT JOIN file_refs r ON r.file_id = f.id
         LEFT JOIN documents d ON d.id = r.doc_id
         LEFT JOIN doc_shares sh ON sh.doc_id = d.id AND sh.email = (SELECT email FROM users WHERE id = $1)
         WHERE f.user_id = $1
         GROUP BY f.id ORDER BY f.created_at DESC",
    )
    .bind(user.id)
    .fetch_all(&s.db)
    .await?;
    let used: i64 = rows.iter().map(|r| r.3).sum();
    let files: Vec<Value> = rows
        .into_iter()
        .map(|(id, name, mime, size, created_at, notes, hidden)| {
            let notes: Vec<NoteRef> = serde_json::from_str(&notes).unwrap_or_default();
            json!({ "id": id, "name": name, "mime": mime, "size": size, "created_at": created_at, "url": format!("/v1/files/{id}"), "notes": notes, "hidden_notes": hidden })
        })
        .collect();
    Ok(Json(json!({ "used": used, "quota": QUOTA, "files": files })))
}

/// Removes the file for good; notes that showed it say it's gone.
pub async fn delete(State(s): State<AppState>, user: User, Path(id): Path<Uuid>) -> Res<StatusCode> {
    let r = sqlx::query("DELETE FROM files WHERE id = $1 AND user_id = $2").bind(id).bind(user.id).execute(&s.db).await?;
    if r.rows_affected() == 0 {
        return Err(AppError::new(StatusCode::NOT_FOUND, "no such file"));
    }
    remove(&s, &[id]).await;
    Ok(StatusCode::NO_CONTENT)
}

/// Deletes bytes whose rows are already gone (account deletion, file deletion).
pub async fn remove(s: &AppState, ids: &[Uuid]) {
    for id in ids {
        if let Err(e) = tokio::fs::remove_file(path_of(s, *id)).await {
            eprintln!("couldn't remove file {id}: {e}");
        }
    }
}

/// Makes `file_refs` for a note match the files its content shows. Called on every save.
pub async fn sync_refs(db: &PgPool, doc: Uuid, ids: &[Uuid]) -> Res<()> {
    let mut tx = db.begin().await?;
    sqlx::query("DELETE FROM file_refs WHERE doc_id = $1 AND NOT (file_id = ANY($2))").bind(doc).bind(ids).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO file_refs (file_id, doc_id) SELECT id, $1 FROM files WHERE id = ANY($2) ON CONFLICT DO NOTHING")
        .bind(doc)
        .bind(ids)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

/// Moves canvas images stored in Postgres before files went to disk. Runs at startup until none are left.
pub async fn move_legacy(db: &PgPool, dir: &FsPath) {
    loop {
        let row: Result<Option<(Uuid, Vec<u8>)>, _> = sqlx::query_as("SELECT id, bytes FROM files WHERE bytes IS NOT NULL LIMIT 1").fetch_optional(db).await;
        let Ok(Some((id, bytes))) = row else { return };
        if let Err(e) = tokio::fs::write(dir.join(id.to_string()), &bytes).await {
            return eprintln!("couldn't move file {id} to disk: {e}");
        }
        if sqlx::query("UPDATE files SET bytes = NULL WHERE id = $1").bind(id).execute(db).await.is_err() {
            return;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sniffs_types() {
        assert_eq!(sniff(b"\x89PNG\r\n\x1a\n"), "image/png");
        assert_eq!(sniff(b"\xFF\xD8\xFF\xE0"), "image/jpeg");
        assert_eq!(sniff(b"RIFF\0\0\0\0WEBPVP8 "), "image/webp");
        assert_eq!(sniff(b"%PDF-1.7"), "application/pdf");
        assert_eq!(sniff(b"\0\0\0\x18ftypmp42"), "video/mp4");
        assert_eq!(sniff(b"\0\0\0\x14ftypqt  "), "video/quicktime");
        assert_eq!(sniff(b"\0\0\0\x20ftypM4A "), "audio/mp4");
        assert_eq!(sniff(b"ID3\x04"), "audio/mpeg");
        // never served as something a browser would run
        assert_eq!(sniff(b"<svg onload=alert(1)>"), "application/octet-stream");
        assert_eq!(sniff(b"<html>"), "application/octet-stream");
        assert_eq!(sniff(b""), "application/octet-stream");
    }

    #[test]
    fn limits_by_kind() {
        assert_eq!(limit("video/mp4"), 100 * MB);
        assert_eq!(limit("image/png"), 10 * MB);
        assert_eq!(limit("audio/mpeg"), 10 * MB);
        assert_eq!(limit("application/pdf"), 15 * MB);
        assert_eq!(limit("application/octet-stream"), 5 * MB);
        assert!(check(Some("image/png"), 11 * MB, QUOTA, &|| too_big("full".into())).is_err());
        assert!(check(None, 50 * MB, QUOTA, &|| too_big("full".into())).is_ok());
        assert!(check(Some("video/mp4"), 50 * MB, 40 * MB, &|| too_big("full".into())).is_err());
    }

    #[test]
    fn names_and_headers() {
        assert_eq!(clean_name(Some("../../etc/passwd")), "passwd");
        assert_eq!(clean_name(Some("a\nb.txt")), "ab.txt");
        assert_eq!(clean_name(None), "file");
        assert_eq!(disposition("inline", "rapport é.pdf"), "inline; filename*=UTF-8''rapport%20%C3%A9.pdf");
    }
}
