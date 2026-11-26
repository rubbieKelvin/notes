use crate::{crypto, AppError, AppState, Res};
use axum::{
    extract::{FromRequestParts, State},
    http::{header, request::Parts, StatusCode},
    Json,
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use lettre::{message::Mailbox, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
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

/// Where sign-in emails go: SMTP in production, the server log in development.
pub enum Mailer {
    Smtp(AsyncSmtpTransport<Tokio1Executor>, Mailbox),
    Log,
}

impl Mailer {
    /// SMTP_URL like `smtps://user:pass@smtp.example.com` plus MAIL_FROM; without SMTP_URL links are printed.
    pub fn from_env(smtp_url: Option<String>, from: Option<String>) -> Self {
        let Some(url) = smtp_url else {
            eprintln!("SMTP_URL not set: sign-in links are printed to this log instead of emailed");
            return Self::Log;
        };
        let transport = AsyncSmtpTransport::<Tokio1Executor>::from_url(&url).expect("SMTP_URL is not a valid smtp:// or smtps:// URL").build();
        let from = from.expect("MAIL_FROM is required with SMTP_URL").parse().expect("MAIL_FROM must be an address like `opennotes <notes@example.com>`");
        Self::Smtp(transport, from)
    }

    async fn send_link(&self, to: &str, link: &str) -> Res<()> {
        let Self::Smtp(transport, from) = self else {
            println!("magic link for {to}: {link}");
            return Ok(());
        };
        let failed = |e: &dyn std::fmt::Display| {
            eprintln!("mail to {to} failed: {e}");
            AppError::new(StatusCode::BAD_GATEWAY, "couldn't send the email; try again in a minute")
        };
        let msg = Message::builder()
            .from(from.clone())
            .to(to.parse().map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "enter a valid email"))?)
            .subject("Your opennotes sign-in link")
            .body(format!(
                "Click to sign in to opennotes:\n\n{link}\n\nThe link works once and expires in {LINK_MINUTES} minutes. If you didn't ask for it, ignore this email."
            ))
            .map_err(|e| failed(&e))?;
        transport.send(msg).await.map_err(|e| failed(&e))?;
        Ok(())
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
}

/// Emails a single-use sign-in link. Answers the same whether or not the account exists.
pub async fn request_link(State(state): State<AppState>, Json(r): Json<LinkRequest>) -> Res<StatusCode> {
    let email = r.email.trim().to_lowercase();
    if !email.contains('@') || email.len() > 254 || email.parse::<Mailbox>().is_err() {
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
    sqlx::query("INSERT INTO magic_links (token_hash, email, expires_at) VALUES ($1, $2, NOW() + make_interval(mins => $3))")
        .bind(crypto::hash_token(&token))
        .bind(&email)
        .bind(LINK_MINUTES)
        .execute(&state.db)
        .await?;
    // In the fragment, so the token never reaches server logs or Referer headers.
    let link = format!("{}/#signin={token}", state.cfg.public_url);
    state.mailer.send_link(&email, &link).await?;
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
    let id: Uuid = sqlx::query_scalar("INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id")
        .bind(&email)
        .fetch_one(&state.db)
        .await?;
    Ok((start_session(&state, jar, id).await?, Json(json!({ "email": email }))))
}

pub async fn logout(State(state): State<AppState>, jar: CookieJar) -> Res<CookieJar> {
    if let Some(c) = jar.get(COOKIE) {
        sqlx::query("DELETE FROM sessions WHERE token_hash = $1").bind(crypto::hash_token(c.value())).execute(&state.db).await?;
    }
    Ok(jar.remove(Cookie::build(COOKIE).path("/")))
}

pub async fn me(State(state): State<AppState>, user: User) -> Res<Json<Value>> {
    let (email, provider, base_url, model, hint): (String, Option<String>, Option<String>, Option<String>, Option<String>) =
        sqlx::query_as("SELECT email, ai_provider, ai_base_url, ai_model, ai_key_hint FROM users WHERE id = $1")
            .bind(user.id)
            .fetch_one(&state.db)
            .await?;
    let ai = provider.map(|p| json!({ "provider": p, "base_url": base_url, "model": model, "key_hint": hint }));
    Ok(Json(json!({ "email": email, "ai": ai })))
}

#[cfg(test)]
mod tests {
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
