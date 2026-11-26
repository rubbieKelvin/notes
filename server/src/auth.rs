use crate::{crypto, AppError, AppState, Res};
use argon2::{password_hash::PasswordHasher, password_hash::PasswordVerifier, Argon2, PasswordHash};
use axum::{
    extract::{FromRequestParts, State},
    http::{header, request::Parts, StatusCode},
    Json,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::LazyLock;
use uuid::Uuid;

const COOKIE: &str = "on_session";
const SESSION_DAYS: i64 = 30;
// Verified against when the email is unknown, so login timing doesn't reveal which accounts exist.
static DUMMY_HASH: LazyLock<String> = LazyLock::new(|| hash_password("not-a-real-password").unwrap());

fn hash_password(pw: &str) -> Option<String> {
    Argon2::default().hash_password(pw.as_bytes()).ok().map(|h| h.to_string())
}

fn verify_password(pw: &str, stored: &str) -> bool {
    PasswordHash::new(stored).is_ok_and(|h| Argon2::default().verify_password(pw.as_bytes(), &h).is_ok())
}

/// A signed-in browser user (session cookie).
pub struct User {
    pub id: Uuid,
}

impl FromRequestParts<AppState> for User {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Res<Self> {
        let jar = CookieJar::from_headers(&parts.headers);
        let token = jar.get(COOKIE).map(|c| c.value().to_string()).ok_or_else(unauthorized)?;
        let id: Option<Uuid> = sqlx::query_scalar("SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()")
            .bind(crypto::hash_token(&token))
            .fetch_optional(&state.db)
            .await?;
        id.map(|id| User { id }).ok_or_else(unauthorized)
    }
}

fn unauthorized() -> AppError {
    AppError::new(StatusCode::UNAUTHORIZED, "sign in required")
}

/// Resolve `Authorization: Bearer <api token>` carrying `scope`. Returns None when no bearer header is sent.
pub async fn bearer_user(state: &AppState, headers: &axum::http::HeaderMap, scope: &str) -> Res<Option<Uuid>> {
    let Some(auth) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()) else { return Ok(None) };
    let token = auth.strip_prefix("Bearer ").ok_or_else(|| AppError::new(StatusCode::UNAUTHORIZED, "expected a Bearer token"))?;
    let row: Option<(Uuid, Vec<String>)> = sqlx::query_as(
        "UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1 RETURNING user_id, scopes",
    )
    .bind(crypto::hash_token(token.trim()))
    .fetch_optional(&state.db)
    .await?;
    match row {
        Some((id, scopes)) if scopes.iter().any(|s| s == scope) => Ok(Some(id)),
        Some(_) => Err(AppError::new(StatusCode::FORBIDDEN, format!("token lacks the '{scope}' scope"))),
        None => Err(AppError::new(StatusCode::UNAUTHORIZED, "invalid token")),
    }
}

#[derive(Deserialize)]
pub struct Credentials {
    email: String,
    password: String,
}

async fn start_session(state: &AppState, jar: CookieJar, user_id: Uuid) -> Res<CookieJar> {
    let token = crypto::new_token("");
    sqlx::query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + make_interval(days => $3))")
        .bind(crypto::hash_token(&token))
        .bind(user_id)
        .bind(SESSION_DAYS as i32)
        .execute(&state.db)
        .await?;
    let cookie = Cookie::build((COOKIE, token))
        .http_only(true)
        .secure(state.cfg.cookie_secure)
        .same_site(SameSite::Lax) // with JSON-only bodies this blocks cross-site request forgery
        .path("/")
        .max_age(time_days(SESSION_DAYS))
        .build();
    Ok(jar.add(cookie))
}

fn time_days(d: i64) -> time::Duration {
    time::Duration::days(d)
}

pub async fn signup(State(state): State<AppState>, jar: CookieJar, Json(c): Json<Credentials>) -> Res<(CookieJar, Json<Value>)> {
    if !state.cfg.allow_signup {
        return Err(AppError::new(StatusCode::FORBIDDEN, "sign-ups are closed on this server"));
    }
    let email = c.email.trim().to_lowercase();
    if !email.contains('@') || email.len() > 254 {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "enter a valid email"));
    }
    if c.password.chars().count() < 8 || c.password.len() > 1024 {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "password must be at least 8 characters"));
    }
    let hash = hash_password(&c.password).ok_or_else(|| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "hashing failed"))?;
    let id: Option<Uuid> = sqlx::query_scalar("INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id")
        .bind(&email)
        .bind(hash)
        .fetch_optional(&state.db)
        .await?;
    let id = id.ok_or_else(|| AppError::new(StatusCode::CONFLICT, "an account with that email already exists"))?;
    Ok((start_session(&state, jar, id).await?, Json(json!({ "email": email }))))
}

pub async fn login(State(state): State<AppState>, jar: CookieJar, Json(c): Json<Credentials>) -> Res<(CookieJar, Json<Value>)> {
    // shortcut: no rate limiting on login yet; put the server behind a proxy rate limit before exposing it publicly.
    let email = c.email.trim().to_lowercase();
    let row: Option<(Uuid, String)> = sqlx::query_as("SELECT id, password_hash FROM users WHERE email = $1")
        .bind(&email)
        .fetch_optional(&state.db)
        .await?;
    let ok = verify_password(&c.password, row.as_ref().map_or(DUMMY_HASH.as_str(), |r| r.1.as_str()));
    match row {
        Some((id, _)) if ok => Ok((start_session(&state, jar, id).await?, Json(json!({ "email": email })))),
        _ => Err(AppError::new(StatusCode::UNAUTHORIZED, "wrong email or password")),
    }
}

pub async fn logout(State(state): State<AppState>, jar: CookieJar) -> Res<CookieJar> {
    if let Some(c) = jar.get(COOKIE) {
        sqlx::query("DELETE FROM sessions WHERE token_hash = $1").bind(crypto::hash_token(c.value())).execute(&state.db).await?;
    }
    Ok(jar.remove(Cookie::build(COOKIE).path("/")))
}

pub async fn me(State(state): State<AppState>, user: User) -> Res<Json<Value>> {
    let (email, hint): (String, Option<String>) = sqlx::query_as("SELECT email, anthropic_key_hint FROM users WHERE id = $1")
        .bind(user.id)
        .fetch_one(&state.db)
        .await?;
    Ok(Json(json!({ "email": email, "anthropic_key_hint": hint })))
}

#[cfg(test)]
mod tests {
    #[test]
    fn password_hash_verifies() {
        let h = super::hash_password("correct horse").unwrap();
        assert!(super::verify_password("correct horse", &h));
        assert!(!super::verify_password("wrong", &h));
        assert!(!super::verify_password("x", "not a phc string"));
    }
}
