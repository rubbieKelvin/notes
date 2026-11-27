//! Uploaded files: note attachments, canvas images, and the storage page. Bytes live in an object store under
//! `<id>`: a local folder (STORAGE_DRIVER=fs, FILES_DIR) or any S3-compatible bucket (STORAGE_DRIVER=s3, AWS_* vars);
//! notes keep only the id, and `file_refs` (rebuilt from each note on save) records which notes show a file.
use crate::{auth::User, docs, AppError, AppState, Res};
use axum::{
    body::Body,
    extract::{Path, Query, Request, State},
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use object_store::{
    aws::AmazonS3Builder, local::LocalFileSystem, path::Path as Key, GetOptions, GetRange, ObjectStore, ObjectStoreExt, WriteMultipart,
};
use sqlx::PgPool;
use std::sync::Arc;
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

fn key(id: Uuid) -> Key {
    Key::from(id.to_string())
}

/// STORAGE_DRIVER=s3 reads the bucket and credentials from AWS_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID,
/// AWS_SECRET_ACCESS_KEY, and AWS_ENDPOINT for S3-compatible services (R2, MinIO, …). Otherwise files go in FILES_DIR.
pub fn store_from_env(env: fn(&str) -> Option<String>) -> Arc<dyn ObjectStore> {
    match env("STORAGE_DRIVER").as_deref() {
        Some("s3") => Arc::new(AmazonS3Builder::from_env().build().expect("STORAGE_DRIVER=s3 needs AWS_BUCKET and credentials")),
        None | Some("fs") => {
            let dir = env("FILES_DIR").unwrap_or_else(|| "data/files".into());
            std::fs::create_dir_all(&dir).expect("cannot create FILES_DIR");
            Arc::new(LocalFileSystem::new_with_prefix(dir).expect("cannot open FILES_DIR"))
        }
        Some(other) => panic!("unknown STORAGE_DRIVER {other:?}: use fs or s3"),
    }
}

fn store_err(e: object_store::Error) -> AppError {
    tracing::error!(error = %e, "file storage error");
    AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "couldn't reach file storage")
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
    // A multipart upload: parts go out as they fill, and nothing is visible under the key until it finishes.
    let mut out = WriteMultipart::new_with_chunk_size(s.store.put_multipart(&key(id)).await.map_err(store_err)?, (8 * MB) as usize);
    let mut stream = body.into_data_stream();
    let (mime, size) = match receive(&mut stream, &mut out, room, full).await {
        Ok(v) => v,
        Err(e) => {
            let _ = out.abort().await;
            // Read the rest before answering: a reply mid-upload reaches many clients and proxies as a dropped
            // connection, not as the error. Bounded by what the client said it would send.
            if declared.is_some_and(|n| n <= 2 * 100 * MB) {
                while let Some(Ok(_)) = stream.next().await {}
            }
            return Err(e);
        }
    };
    out.finish().await.map_err(store_err)?;
    match save(&s, user.id, id, &q, mime, size).await {
        Ok(info) => Ok((StatusCode::CREATED, Json(info.with_url()))),
        Err(e) => {
            remove(&s, &[id]).await;
            Err(e)
        }
    }
}

async fn receive(stream: &mut axum::body::BodyDataStream, out: &mut WriteMultipart, room: u64, full: impl Fn() -> AppError) -> Res<(&'static str, u64)> {
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
        out.wait_for_capacity(4).await.map_err(store_err)?; // backpressure: at most 4 parts in flight
        out.write(&chunk);
    }
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

async fn save(s: &AppState, user: Uuid, id: Uuid, q: &UploadTo, mime: &str, size: u64) -> Res<FileInfo> {
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
    tx.commit().await?;
    Ok(info)
}

/// Served to the uploader, anyone who can open a note it sits in, and everyone if one of those notes is public.
/// Streamed through the server (no bucket CORS or public URLs needed); Range requests work, so videos seek.
pub async fn get(State(s): State<AppState>, user: Option<User>, Path(id): Path<Uuid>, req: Request) -> Res<Response> {
    let row: Option<(String, String, i64, bool)> = sqlx::query_as(
        "SELECT f.mime, f.name, f.size, (f.user_id = $2 OR EXISTS (
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
    let (mime, name, size, allowed) = row.ok_or_else(missing)?;
    if !allowed {
        return Err(missing());
    }
    let size = size as u64;
    let value = |v: String| HeaderValue::from_str(&v).map_err(|_| missing());
    let range = match req.headers().get(header::RANGE).and_then(|v| v.to_str().ok()).map(|r| parse_range(r, size)) {
        Some(Err(())) => {
            return Ok((StatusCode::RANGE_NOT_SATISFIABLE, [(header::CONTENT_RANGE, format!("bytes */{size}"))]).into_response());
        }
        Some(Ok(r)) => r,
        None => None,
    };
    let (start, end) = range.unwrap_or((0, size.saturating_sub(1)));
    let mut res = if req.method() == Method::HEAD {
        Response::new(Body::empty())
    } else {
        let opts = GetOptions { range: range.map(|(a, b)| GetRange::Bounded(a..b + 1)), ..Default::default() };
        let got = s.store.get_opts(&key(id), opts).await.map_err(|e| match e {
            object_store::Error::NotFound { .. } => missing(),
            e => store_err(e),
        })?;
        Response::new(Body::from_stream(got.into_stream()))
    };
    let h = res.headers_mut();
    h.insert(header::ACCEPT_RANGES, HeaderValue::from_static("bytes"));
    h.insert(header::CONTENT_LENGTH, value((end + 1 - start).to_string())?);
    if range.is_some() {
        *res.status_mut() = StatusCode::PARTIAL_CONTENT;
        res.headers_mut().insert(header::CONTENT_RANGE, value(format!("bytes {start}-{end}/{size}"))?);
    }
    let h = res.headers_mut();
    h.insert(header::CONTENT_TYPE, value(mime.clone())?);
    h.insert(header::CONTENT_DISPOSITION, value(disposition(if inline(&mime) { "inline" } else { "attachment" }, &name))?);
    // Files never change once uploaded; nosniff keeps a browser from reinterpreting the bytes.
    h.insert(header::CACHE_CONTROL, HeaderValue::from_static("private, max-age=31536000, immutable"));
    h.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    Ok(res)
}

/// One `bytes=a-b`, `bytes=a-` or `bytes=-n` range as inclusive (start, end). Ok(None): serve it all
/// (no range we handle, e.g. several ranges). Err: nothing of the file is in the range (416).
fn parse_range(h: &str, size: u64) -> Result<Option<(u64, u64)>, ()> {
    let Some((a, b)) = h.strip_prefix("bytes=").filter(|r| !r.contains(',')).and_then(|r| r.split_once('-')) else { return Ok(None) };
    let (a, b) = (a.trim(), b.trim());
    let r = match (a.parse::<u64>(), b.parse::<u64>()) {
        (Ok(a), Ok(b)) if a <= b => (a, b.min(size.saturating_sub(1))),
        (Ok(a), Err(_)) if b.is_empty() => (a, size.saturating_sub(1)),
        (Err(_), Ok(n)) if a.is_empty() && n > 0 => (size.saturating_sub(n), size.saturating_sub(1)),
        _ => return Ok(None),
    };
    if r.0 >= size { Err(()) } else { Ok(Some(r)) }
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
        if let Err(e) = s.store.delete(&key(*id)).await {
            tracing::warn!(file = %id, error = %e, "couldn't remove file");
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

/// Moves canvas images stored in Postgres before the file store existed. Runs at startup until none are left.
pub async fn move_legacy(db: &PgPool, store: &dyn ObjectStore) {
    loop {
        let row: Result<Option<(Uuid, Vec<u8>)>, _> = sqlx::query_as("SELECT id, bytes FROM files WHERE bytes IS NOT NULL LIMIT 1").fetch_optional(db).await;
        let Ok(Some((id, bytes))) = row else { return };
        if let Err(e) = store.put(&key(id), bytes.into()).await {
            return tracing::error!(file = %id, error = %e, "couldn't move file to storage");
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
    fn ranges() {
        assert_eq!(parse_range("bytes=0-3", 10), Ok(Some((0, 3))));
        assert_eq!(parse_range("bytes=4-", 10), Ok(Some((4, 9))));
        assert_eq!(parse_range("bytes=-3", 10), Ok(Some((7, 9))));
        assert_eq!(parse_range("bytes=5-100", 10), Ok(Some((5, 9))));
        assert_eq!(parse_range("bytes=10-", 10), Err(()));
        assert_eq!(parse_range("bytes=0-1,4-5", 10), Ok(None));
        assert_eq!(parse_range("items=0-1", 10), Ok(None));
        assert_eq!(parse_range("bytes=3-1", 10), Ok(None));
    }

    #[test]
    fn names_and_headers() {
        assert_eq!(clean_name(Some("../../etc/passwd")), "passwd");
        assert_eq!(clean_name(Some("a\nb.txt")), "ab.txt");
        assert_eq!(clean_name(None), "file");
        assert_eq!(disposition("inline", "rapport é.pdf"), "inline; filename*=UTF-8''rapport%20%C3%A9.pdf");
    }
}
