//! Images placed on canvases. Shapes keep only the URL, so the Yjs document stays small.
use crate::{auth::User, docs, AppError, AppState, Res};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

pub const MAX_BYTES: usize = 10 * 1024 * 1024;

/// The image type from its magic bytes; the client's Content-Type is never trusted.
fn sniff(b: &[u8]) -> Option<&'static str> {
    match b {
        [0x89, b'P', b'N', b'G', ..] => Some("image/png"),
        [0xFF, 0xD8, 0xFF, ..] => Some("image/jpeg"),
        [b'G', b'I', b'F', b'8', ..] => Some("image/gif"),
        [b'R', b'I', b'F', b'F', _, _, _, _, b'W', b'E', b'B', b'P', ..] => Some("image/webp"),
        _ => None,
    }
}

#[derive(Deserialize)]
pub struct UploadTo {
    /// The note the image is placed in; whoever can read that note can load the image.
    doc: Uuid,
}

pub async fn upload(State(s): State<AppState>, user: User, Query(q): Query<UploadTo>, body: Bytes) -> Res<(StatusCode, Json<Value>)> {
    match docs::access(&s, user.id, q.doc).await?.as_deref() {
        Some("owner" | "edit") => {}
        _ => return Err(AppError::new(StatusCode::FORBIDDEN, "you can't add images to this note")),
    }
    let mime = sniff(&body).ok_or_else(|| AppError::new(StatusCode::UNSUPPORTED_MEDIA_TYPE, "only PNG, JPEG, GIF and WebP images can be uploaded"))?;
    let id: Uuid = sqlx::query_scalar("INSERT INTO assets (user_id, mime, bytes, doc_id) VALUES ($1, $2, $3, $4) RETURNING id")
        .bind(user.id)
        .bind(mime)
        .bind(body.as_ref())
        .bind(q.doc)
        .fetch_one(&s.db)
        .await?;
    Ok((StatusCode::CREATED, Json(json!({ "url": format!("/v1/assets/{id}") }))))
}

/// Served to the uploader, anyone who can open the note it sits in, and everyone if that note is public.
pub async fn get(State(s): State<AppState>, user: Option<User>, Path(id): Path<Uuid>) -> Res<impl IntoResponse> {
    let row: Option<(String, Vec<u8>, Uuid, Option<Uuid>, bool)> = sqlx::query_as(
        "SELECT a.mime, a.bytes, a.user_id, a.doc_id, COALESCE(d.is_public, FALSE) FROM assets a LEFT JOIN documents d ON d.id = a.doc_id WHERE a.id = $1",
    )
    .bind(id)
    .fetch_optional(&s.db)
    .await?;
    let missing = || AppError::new(StatusCode::NOT_FOUND, "no such image");
    let (mime, bytes, uploader, doc, public) = row.ok_or_else(missing)?;
    let allowed = public
        || match (&user, doc) {
            (Some(u), _) if u.id == uploader => true,
            (Some(u), Some(d)) => docs::access(&s, u.id, d).await?.is_some(),
            _ => false,
        };
    if !allowed {
        return Err(missing());
    }
    // Assets never change once uploaded; nosniff keeps a browser from reinterpreting the bytes.
    Ok(([(header::CONTENT_TYPE, mime), (header::CACHE_CONTROL, if public { "public, max-age=31536000, immutable" } else { "private, max-age=31536000, immutable" }.into()), (header::X_CONTENT_TYPE_OPTIONS, "nosniff".into())], bytes))
}

#[cfg(test)]
mod tests {
    use super::sniff;

    #[test]
    fn sniffs_only_images() {
        assert_eq!(sniff(b"\x89PNG\r\n\x1a\n"), Some("image/png"));
        assert_eq!(sniff(b"\xFF\xD8\xFF\xE0"), Some("image/jpeg"));
        assert_eq!(sniff(b"GIF89a"), Some("image/gif"));
        assert_eq!(sniff(b"RIFF\0\0\0\0WEBPVP8 "), Some("image/webp"));
        assert_eq!(sniff(b"<svg onload=alert(1)>"), None);
        assert_eq!(sniff(b""), None);
    }
}
