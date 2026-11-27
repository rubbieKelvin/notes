use crate::{crypto, email, AppError, AppState, Res};
use axum::{
    extract::{FromRequestParts, State},
    http::{header, request::Parts, StatusCode},
    Json,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Mutex, time::{Duration, Instant}};
use uuid::Uuid;

const COOKIE: &str = "on_session";
const MAX_LINKS: u32 = 5;
const LOCK_WINDOW: Duration = Duration::from_secs(15 * 60);
const LINK_MINUTES: i32 = 15;
const SESSION_DAYS: i64 = 30;

/// Per-email throttle: at most MAX_LINKS sign-in emails per LOCK_WINDOW, so nobody can mail-bomb an address.
/// shortcut: in-memory and per-process; move to Postgres/Redis if you run several server replicas.
#[derive(Default)]
pub struct LoginLimiter(Mutex<HashMap<String, (u32, Instant)>>);

impl LoginLimiter {
    /// Counts one attempt for `email`; returns seconds to wait if it is over the limit.
    pub fn hit(&self, email: &str) -> Option<u64> {
        let mut map = self.0.lock().unwrap();
        if map.len() > 100_000 {
            map.retain(|_, (_, since)| since.elapsed() < LOCK_WINDOW);
        }
        let entry = map.entry(email.to_string()).or_insert((0, Instant::now()));
        if entry.1.elapsed() >= LOCK_WINDOW {
            *entry = (0, Instant::now());
        }
        if entry.0 >= MAX_LINKS {
            return Some(LOCK_WINDOW.saturating_sub(entry.1.elapsed()).as_secs().max(1));
        }
        entry.0 += 1;
        None
    }
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

/// For routes anyone may call (public notes, assets): `None` when not signed in.
impl axum::extract::OptionalFromRequestParts<AppState> for User {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Res<Option<Self>> {
        match <User as FromRequestParts<AppState>>::from_request_parts(parts, state).await {
            Ok(u) => Ok(Some(u)),
            Err(AppError(StatusCode::UNAUTHORIZED, _)) => Ok(None),
            Err(e) => Err(e),
        }
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

#[derive(Deserialize)]
pub struct LinkRequest {
    email: String,
    /// Path to land on after signing in (e.g. a shared note). Only same-site paths are kept.
    #[serde(default)]
    next: String,
}

/// `next` if it is a plain path on this site, else "/". Blocks `//evil.com` and `/\evil.com` redirects.
fn safe_next(next: &str) -> &str {
    let ok = next.starts_with('/') && !next.starts_with("//") && !next.contains('\\') && !next.contains('#') && next.len() < 200
        && next.chars().all(|c| c.is_ascii_graphic());
    if ok { next } else { "/" }
}

fn code_hash(email: &str, code: &str) -> Vec<u8> {
    crypto::hash_token(&format!("{email}:{code}"))
}

/// Emails a single-use sign-in link. Answers the same whether or not the account exists.
pub async fn request_link(State(state): State<AppState>, Json(r): Json<LinkRequest>) -> Res<StatusCode> {
    let email = r.email.trim().to_lowercase();
    if !email::valid_address(&email) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "enter a valid email"));
    }
    if let Some(secs) = state.login_limiter.hit(&email) {
        return Err(AppError::new(StatusCode::TOO_MANY_REQUESTS, format!("too many sign-in emails; try again in {} minutes", secs.div_ceil(60))));
    }
    if !state.cfg.allow_signup {
        let exists: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM users WHERE email = $1)").bind(&email).fetch_one(&state.db).await?;
        if !exists {
            return Ok(StatusCode::NO_CONTENT); // sign-ups closed: silently skip, so the reply doesn't reveal accounts
        }
    }
    let token = crypto::new_token("");
    let code = format!("{:06}", rand::random_range(0..1_000_000u32));
    sqlx::query("INSERT INTO magic_links (token_hash, email, expires_at, code_hash) VALUES ($1, $2, NOW() + make_interval(mins => $3), $4)")
        .bind(crypto::hash_token(&token))
        .bind(&email)
        .bind(LINK_MINUTES)
        .bind(code_hash(&email, &code))
        .execute(&state.db)
        .await?;
    // In the fragment, so the token never reaches server logs or Referer headers.
    let link = format!("{}{}#signin={token}", state.cfg.public_url, safe_next(r.next.trim()));
    let ctx = serde_json::json!({ "code": code, "link": link, "minutes": LINK_MINUTES, "preheader": format!("Your sign-in code is {code}") });
    state.email.send(email::kinds::SIGN_IN, &email, ctx).await.map_err(|e| {
        eprintln!("sign-in mail to {email} failed: {e}");
        AppError::new(StatusCode::BAD_GATEWAY, "couldn't send the email; try again in a minute")
    })?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct Verify {
    token: String,
}

/// Trades a magic-link token for a session, creating the account on first sign-in.
pub async fn verify(State(state): State<AppState>, jar: CookieJar, Json(v): Json<Verify>) -> Res<(CookieJar, Json<Value>)> {
    // Deleted even when expired, so every link is single use.
    let row: Option<(String, bool)> = sqlx::query_as("DELETE FROM magic_links WHERE token_hash = $1 RETURNING email, expires_at > NOW()")
        .bind(crypto::hash_token(v.token.trim()))
        .fetch_optional(&state.db)
        .await?;
    let Some((email, true)) = row else {
        return Err(AppError::new(StatusCode::UNAUTHORIZED, "this sign-in link has expired or was already used; request a new one"));
    };
    sign_in(&state, jar, email).await
}

const MAX_CODE_ATTEMPTS: i32 = 5;

#[derive(Deserialize)]
pub struct CodeVerify {
    email: String,
    code: String,
}

/// Trades the 6-digit code from a sign-in email for a session. Each email's pending codes allow
/// MAX_CODE_ATTEMPTS wrong guesses in total, and the per-email send limit caps how many exist.
pub async fn verify_code(State(state): State<AppState>, jar: CookieJar, Json(v): Json<CodeVerify>) -> Res<(CookieJar, Json<Value>)> {
    let email = v.email.trim().to_lowercase();
    let code: String = v.code.chars().filter(char::is_ascii_digit).collect();
    let wrong = || AppError::new(StatusCode::UNAUTHORIZED, "that code is wrong or has expired; check the latest email or request a new one");
    if code.len() != 6 {
        return Err(wrong());
    }
    let hit: Option<Vec<u8>> = sqlx::query_scalar(
        "DELETE FROM magic_links WHERE email = $1 AND code_hash = $2 AND expires_at > NOW() AND attempts < $3 RETURNING token_hash",
    )
    .bind(&email)
    .bind(code_hash(&email, &code))
    .bind(MAX_CODE_ATTEMPTS)
    .fetch_optional(&state.db)
    .await?;
    if hit.is_none() {
        sqlx::query("UPDATE magic_links SET attempts = attempts + 1 WHERE email = $1").bind(&email).execute(&state.db).await?;
        return Err(wrong());
    }
    sign_in(&state, jar, email).await
}

/// Creates the account on first sign-in, gives it a username, and starts a session.
async fn sign_in(state: &AppState, jar: CookieJar, email: String) -> Res<(CookieJar, Json<Value>)> {
    let id: Uuid = sqlx::query_scalar("INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id")
        .bind(&email)
        .fetch_one(&state.db)
        .await?;
    ensure_username(state, id, &email).await?;
    Ok((start_session(state, jar, id).await?, Json(json!({ "email": email }))))
}

/// Lowercase letters, digits and underscores, 2–30 long.
pub fn valid_username(u: &str) -> bool {
    (2..=30).contains(&u.len()) && u.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
}

/// A first username from the email (zora@… → zora, then zora2, zora3… if taken). No-op once set.
pub async fn ensure_username(state: &AppState, id: Uuid, email: &str) -> Res<()> {
    let mut base: String = email.split('@').next().unwrap_or("").to_lowercase().chars().filter(|c| c.is_ascii_alphanumeric() || *c == '_').take(24).collect();
    if base.len() < 2 {
        base = format!("user{base}");
    }
    for n in 1..=50u32 {
        let candidate = if n == 1 { base.clone() } else { format!("{base}{n}") };
        let r = sqlx::query("UPDATE users SET username = $2 WHERE id = $1 AND username IS NULL").bind(id).bind(&candidate).execute(&state.db).await;
        match r {
            Ok(_) => return Ok(()), // set now, or already had one
            Err(sqlx::Error::Database(e)) if e.is_unique_violation() => continue,
            Err(e) => return Err(e.into()),
        }
    }
    let fallback = format!("{base}_{}", &crypto::new_token("")[..6].to_lowercase().replace(['-'], "_"));
    sqlx::query("UPDATE users SET username = $2 WHERE id = $1 AND username IS NULL").bind(id).bind(fallback).execute(&state.db).await?;
    Ok(())
}

pub async fn logout(State(state): State<AppState>, jar: CookieJar) -> Res<CookieJar> {
    if let Some(c) = jar.get(COOKIE) {
        sqlx::query("DELETE FROM sessions WHERE token_hash = $1").bind(crypto::hash_token(c.value())).execute(&state.db).await?;
    }
    Ok(jar.remove(Cookie::build(COOKIE).path("/")))
}

type MeRow = (String, String, Option<String>, chrono::DateTime<chrono::Utc>, Option<String>, Option<String>, Option<String>, Option<String>);

pub async fn me(State(state): State<AppState>, user: User) -> Res<Json<Value>> {
    let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = $1").bind(user.id).fetch_one(&state.db).await?;
    ensure_username(&state, user.id, &email).await?; // accounts from before usernames existed
    let (email, name, username, created_at, provider, base_url, model, hint): MeRow =
        sqlx::query_as("SELECT email, display_name, username, created_at, ai_provider, ai_base_url, ai_model, ai_key_hint FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_one(&state.db)
            .await?;
    let sessions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sessions WHERE user_id = $1 AND expires_at > NOW()").bind(user.id).fetch_one(&state.db).await?;
    let ai = provider.map(|p| json!({ "provider": p, "base_url": base_url, "model": model, "key_hint": hint }));
    Ok(Json(json!({ "email": email, "name": name, "username": username, "created_at": created_at, "sessions": sessions, "ai": ai })))
}

#[derive(Deserialize)]
pub struct Profile {
    name: String,
    username: Option<String>,
}

pub async fn update_profile(State(state): State<AppState>, user: User, Json(p): Json<Profile>) -> Res<Json<Value>> {
    let name = p.name.trim();
    if name.chars().count() > 80 || name.chars().any(char::is_control) {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "names are up to 80 characters, on one line"));
    }
    let username = p.username.map(|u| u.trim().trim_start_matches('@').to_lowercase());
    if let Some(u) = &username {
        if !valid_username(u) {
            return Err(AppError::new(StatusCode::BAD_REQUEST, "usernames are 2–30 lowercase letters, digits or underscores"));
        }
    }
    let r = sqlx::query("UPDATE users SET display_name = $2, username = COALESCE($3, username) WHERE id = $1 RETURNING username")
        .bind(user.id)
        .bind(name)
        .bind(&username)
        .fetch_one(&state.db)
        .await;
    match r {
        Ok(row) => Ok(Json(json!({ "name": name, "username": sqlx::Row::get::<Option<String>, _>(&row, 0) }))),
        Err(sqlx::Error::Database(e)) if e.is_unique_violation() => Err(AppError::new(StatusCode::CONFLICT, "that username is taken")),
        Err(e) => Err(e.into()),
    }
}

/// Ends every session of this user except the one making the request.
pub async fn logout_others(State(state): State<AppState>, user: User, jar: CookieJar) -> Res<Json<Value>> {
    let current = jar.get(COOKIE).map(|c| crypto::hash_token(c.value())).unwrap_or_default();
    let r = sqlx::query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2").bind(user.id).bind(current).execute(&state.db).await?;
    Ok(Json(json!({ "ended": r.rows_affected() })))
}

#[derive(Deserialize)]
pub struct DeleteAccount {
    confirm_email: String,
}

/// Deletes the account and, by cascade, its pages, images, tokens and sessions.
pub async fn delete_account(State(state): State<AppState>, user: User, jar: CookieJar, Json(b): Json<DeleteAccount>) -> Res<CookieJar> {
    let r = sqlx::query("DELETE FROM users WHERE id = $1 AND lower(email) = lower($2)").bind(user.id).bind(b.confirm_email.trim()).execute(&state.db).await?;
    if r.rows_affected() == 0 {
        return Err(AppError::new(StatusCode::BAD_REQUEST, "type your email address exactly to confirm"));
    }
    Ok(jar.remove(Cookie::build(COOKIE).path("/")))
}

#[cfg(test)]
mod tests {
    #[test]
    fn next_paths_stay_on_site() {
        assert_eq!(super::safe_next("/d/123"), "/d/123");
        for bad in ["//evil.com", "/\\evil.com", "https://evil.com", "", "/x#signin=1", "/a b"] {
            assert_eq!(super::safe_next(bad), "/", "{bad}");
        }
    }

    #[test]
    fn usernames() {
        assert!(super::valid_username("zora_2"));
        for bad in ["Z", "zo ra", "zora!", "ZORA", &"a".repeat(31)] {
            assert!(!super::valid_username(bad), "{bad}");
        }
    }

    #[test]
    fn limiter_caps_links_per_email() {
        let l = super::LoginLimiter::default();
        for _ in 0..super::MAX_LINKS {
            assert!(l.hit("a@x").is_none());
        }
        assert!(l.hit("a@x").is_some_and(|s| s <= 900));
        assert!(l.hit("b@x").is_none(), "other addresses unaffected");
    }
}
