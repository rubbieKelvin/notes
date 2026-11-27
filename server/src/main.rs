mod ai;
mod comments;
mod auth;
mod crypto;
mod docs;
mod email;
mod files;
mod inbox;
mod mcp;
mod share;
mod sync;
mod text;
mod tokens;

use axum::{
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Router,
};
use sqlx::PgPool;
use std::{sync::Arc, time::Duration};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub http: reqwest::Client,
    pub cipher: Arc<crypto::Cipher>,
    pub rooms: Arc<sync::Rooms>,
    pub cfg: Arc<Config>,
    pub login_limiter: Arc<auth::LoginLimiter>,
    pub email: Arc<email::EmailService>,
}

pub struct Config {
    pub cookie_secure: bool,
    pub allow_signup: bool,
    pub anthropic_base: String,
    pub allow_private_ai_urls: bool,
    pub hosts: Vec<String>,
    /// Origin the browser uses, for links in emails. Never taken from the request's Host header.
    pub public_url: String,
    /// Uploaded files, one per id (FILES_DIR).
    pub files_dir: std::path::PathBuf,
}

#[derive(Debug)]
pub struct AppError(pub StatusCode, pub String);
pub type Res<T> = Result<T, AppError>;

impl AppError {
    pub fn new(code: StatusCode, msg: impl Into<String>) -> Self {
        Self(code, msg.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.0, self.1).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        eprintln!("db error: {e}");
        Self(StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
    }
}

fn env(name: &str) -> Option<String> {
    std::env::var(name).ok().filter(|v| !v.is_empty())
}

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/v1/auth/link", post(auth::request_link))
        .route("/v1/auth/verify", post(auth::verify))
        .route("/v1/auth/code", post(auth::verify_code))
        .route("/v1/auth/logout", post(auth::logout))
        .route("/v1/me", get(auth::me).put(auth::update_profile).delete(auth::delete_account))
        .route("/v1/auth/logout-others", post(auth::logout_others))
        .route("/v1/settings/ai", put(ai::save).delete(ai::delete))
        .route("/v1/settings/ai/models", post(ai::models))
        .route("/v1/whisper", post(ai::whisper))
        .route("/v1/annotate", post(ai::annotate).layer(DefaultBodyLimit::max(ai::MAX_IMAGE_B64 + 4096)))
        // files::upload streams the body and enforces its own limits
        .route("/v1/files", get(files::list).post(files::upload).layer(DefaultBodyLimit::disable()))
        .route("/v1/files/{id}", get(files::get).delete(files::delete))
        .route("/v1/assets/{id}", get(files::get)) // canvas images placed before files existed
        .route("/v1/tokens", get(tokens::list).post(tokens::create))
        .route("/v1/tokens/{id}", delete(tokens::revoke))
        .route("/v1/docs", get(docs::list).post(docs::create))
        .route("/v1/docs/{id}", delete(docs::remove))
        .route("/v1/docs/{id}/mcp", put(docs::set_mcp))
        .route("/v1/docs/{id}/shares", get(share::list).post(share::invite))
        .route("/v1/docs/{id}/shares/{email}", delete(share::revoke))
        .route("/v1/docs/{id}/public", put(share::set_public))
        .route("/v1/docs/{id}/comments", get(comments::list).post(comments::post))
        .route("/v1/docs/{id}/comments-enabled", put(comments::set_enabled))
        .route("/v1/docs/{id}/reactions", get(comments::note_reactions).post(comments::react_note))
        .route("/v1/comments/{id}", delete(comments::delete))
        .route("/v1/comments/{id}/reactions", post(comments::react_comment))
        .route("/v1/public/{handle}", get(share::profile))
        .route("/v1/public/{handle}/{id}", get(share::note))
        .route("/v1/sync/{id}", get(sync::connect))
        .route("/v1/notes/ingest", post(inbox::ingest))
        .route("/v1/inbox", get(inbox::list))
        .route("/v1/inbox/{id}/{action}", post(inbox::resolve))
        .merge(mcp::router(state.clone()))
        .with_state(state)
}

/// FR-3.3 Knowledge Half-Life: archive unreviewed inbox items after 14 days; drop dead sessions and sign-in links.
async fn cleanup(db: PgPool) {
    let mut tick = tokio::time::interval(Duration::from_secs(3600));
    loop {
        tick.tick().await;
        let archived = sqlx::query("UPDATE agent_inbox_items SET status = 'archived' WHERE status = 'pending' AND expires_at < NOW()")
            .execute(&db).await;
        let _ = sqlx::query("DELETE FROM sessions WHERE expires_at < NOW()").execute(&db).await;
        let _ = sqlx::query("DELETE FROM magic_links WHERE expires_at < NOW()").execute(&db).await;
        if let Err(e) = archived {
            eprintln!("cleanup failed: {e}");
        }
    }
}

#[tokio::main]
async fn main() {
    let db_url = env("DATABASE_URL").expect("DATABASE_URL is required");
    let secret = env("OPENNOTES_SECRET").expect("OPENNOTES_SECRET is required (32 bytes, base64: `openssl rand -base64 32`)");
    let db = PgPool::connect(&db_url).await.expect("cannot connect to Postgres");
    sqlx::migrate!("./migrations").run(&db).await.expect("migrations failed");

    let cfg = Config {
        cookie_secure: env("COOKIE_SECURE").map_or(true, |v| v != "false"),
        allow_signup: env("ALLOW_SIGNUP").map_or(true, |v| v != "false"),
        anthropic_base: env("ANTHROPIC_BASE_URL").unwrap_or_else(|| "https://api.anthropic.com".into()),
        allow_private_ai_urls: env("ALLOW_PRIVATE_AI_URLS").is_some_and(|v| v == "true"),
        public_url: env("PUBLIC_URL").unwrap_or_else(|| "http://localhost:3000".into()).trim_end_matches('/').to_string(),
        files_dir: env("FILES_DIR").unwrap_or_else(|| "data/files".into()).into(),
        hosts: env("OPENNOTES_HOSTS").unwrap_or_else(|| "localhost,127.0.0.1".into()).split(',').map(|h| h.trim().to_string()).collect(),
    };
    std::fs::create_dir_all(&cfg.files_dir).expect("cannot create FILES_DIR");
    files::move_legacy(&db, &cfg.files_dir).await;
    let state = AppState {
        db: db.clone(),
        http: reqwest::Client::new(),
        cipher: Arc::new(crypto::Cipher::from_base64(&secret).expect("OPENNOTES_SECRET must be 32 bytes, base64")),
        rooms: Default::default(),
        cfg: Arc::new(cfg),
        login_limiter: Default::default(),
        email: Arc::new(email::EmailService::from_env(env)),
    };
    tokio::spawn(cleanup(db));

    let bind = env("BIND").unwrap_or_else(|| "127.0.0.1:8080".into());
    let listener = tokio::net::TcpListener::bind(&bind).await.unwrap();
    println!("opennotes server on http://{bind}");
    axum::serve(listener, app(state)).await.unwrap();
}
