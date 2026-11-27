mod ai;
mod auth;
mod comments;
mod crypto;
mod db;
mod docs;
mod email;
mod events;
mod files;
mod inbox;
mod mcp;
mod share;
mod sync;
mod text;
mod tokens;

use axum::Json;
use axum::extract::{Request, State};
use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
};
use sqlx::PgPool;
use std::{sync::Arc, time::Duration};
use tower_http::{
    catch_panic::CatchPanicLayer,
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::{DefaultOnResponse, TraceLayer},
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub http: reqwest::Client,
    pub cipher: Arc<crypto::Cipher>,
    pub rooms: Arc<sync::Rooms>,
    pub cfg: Arc<Config>,
    pub login_limiter: Arc<auth::LoginLimiter>,
    pub email: Arc<email::EmailService>,
    pub store: Arc<dyn object_store::ObjectStore>,
}

pub struct Config {
    pub cookie_secure: bool,
    pub allow_signup: bool,
    pub anthropic_base: String,
    pub allow_private_ai_urls: bool,
    pub hosts: Vec<String>,
    /// Origin the browser uses, for links in emails. Never taken from the request's Host header.
    pub public_url: String,
}

#[derive(Debug)]
pub struct AppError(pub StatusCode, pub String);
pub type Res<T> = Result<T, AppError>;

impl AppError {
    pub fn new(code: StatusCode, msg: impl Into<String>) -> Self {
        return Self(code, msg.into());
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        return (self.0, self.1).into_response();
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        tracing::error!(error = %e, "db error");
        return Self(StatusCode::INTERNAL_SERVER_ERROR, "internal error".into());
    }
}

fn env(name: &str) -> Option<String> {
    return std::env::var(name).ok().filter(|v| !v.is_empty());
}

async fn health(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    db::ping(&state.db)
        .await
        .map_err(|_| axum::http::StatusCode::SERVICE_UNAVAILABLE)?;
    return Ok(Json(serde_json::json!({"status": "ok"})));
}

pub fn app(state: AppState) -> Router {
    return Router::new()
        .route("/health", get(health))
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
        .route("/v1/docs/{id}/tags", put(docs::set_tags))
        .route("/v1/docs/{id}/tabs", get(docs::tabs))
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
        .route("/v1/events", post(events::post))
        .merge(mcp::router(state.clone()))
        // a panic becomes a 500 (and a server_error event) instead of a dropped connection
        .layer(CatchPanicLayer::new())
        .layer(middleware::from_fn_with_state(state.clone(), events::track_errors))
        .with_state(state)
        // last added runs first: assign the request id, then log under it, then echo it on the response
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(TraceLayer::new_for_http().make_span_with(|req: &Request<_>| {
            let id = req.headers().get("x-request-id").and_then(|v| v.to_str().ok()).unwrap_or("");
            // path only: query strings can carry tokens
            tracing::info_span!("http", method = %req.method(), path = req.uri().path(), request_id = id)
        }).on_response(DefaultOnResponse::new().level(tracing::Level::INFO)))
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid));
}

/// FR-3.3 Knowledge Half-Life: archive unreviewed inbox items after 14 days; drop dead sessions, sign-in links and old telemetry.
async fn cleanup(db: PgPool) {
    let mut tick = tokio::time::interval(Duration::from_secs(3600));
    loop {
        tick.tick().await;
        let archived = sqlx::query("UPDATE agent_inbox_items SET status = 'archived' WHERE status = 'pending' AND expires_at < NOW()")
            .execute(&db).await;
        let _ = sqlx::query("DELETE FROM sessions WHERE expires_at < NOW()")
            .execute(&db)
            .await;
        let _ = sqlx::query("DELETE FROM magic_links WHERE expires_at < NOW()")
            .execute(&db)
            .await;
        let _ = sqlx::query("DELETE FROM events WHERE created_at < NOW() - INTERVAL '90 days'")
            .execute(&db)
            .await;
        if let Err(e) = archived {
            tracing::error!(error = %e, "cleanup failed");
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // RUST_LOG picks levels (default info); LOG_FORMAT=json for log shippers.
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,tower_http=info".into());
    let logs = tracing_subscriber::fmt().with_env_filter(filter);

    if env("LOG_FORMAT").is_some_and(|v| v == "json") {
        logs.json().init()
    } else {
        logs.init()
    }

    let db_url = env("DATABASE_URL").expect("DATABASE_URL is required");
    let secret = env("OPENNOTES_SECRET")
        .expect("OPENNOTES_SECRET is required (32 bytes, base64: `openssl rand -base64 32`)");

    let database = db::connect(&db_url).await?;
    db::migrate(&database).await?;

    let cfg = Config {
        cookie_secure: env("COOKIE_SECURE").map_or(true, |v| v != "false"),
        allow_signup: env("ALLOW_SIGNUP").map_or(true, |v| v != "false"),
        anthropic_base: env("ANTHROPIC_BASE_URL")
            .unwrap_or_else(|| "https://api.anthropic.com".into()),
        allow_private_ai_urls: env("ALLOW_PRIVATE_AI_URLS").is_some_and(|v| v == "true"),
        public_url: env("PUBLIC_URL")
            .unwrap_or_else(|| "http://localhost:3000".into())
            .trim_end_matches('/')
            .to_string(),
        hosts: env("OPENNOTES_HOSTS")
            .unwrap_or_else(|| "localhost,127.0.0.1".into())
            .split(',')
            .map(|h| h.trim().to_string())
            .collect(),
    };

    let store = files::store_from_env(env);

    let state = AppState {
        db: database.clone(),
        http: reqwest::Client::new(),
        cipher: Arc::new(
            crypto::Cipher::from_base64(&secret)
                .expect("OPENNOTES_SECRET must be 32 bytes, base64"),
        ),
        rooms: Default::default(),
        cfg: Arc::new(cfg),
        login_limiter: Default::default(),
        email: Arc::new(email::EmailService::from_env(env)),
        store,
    };

    tokio::spawn(cleanup(database));

    let bind = env("BIND").unwrap_or_else(|| "127.0.0.1:8080".into());
    let listener = tokio::net::TcpListener::bind(&bind).await.unwrap();
    tracing::info!("opennotes server on http://{bind}");
    let (stop_tx, mut stop_rx) = tokio::sync::watch::channel(());

    let server = tokio::spawn(
        axum::serve(listener, app(state.clone()))
            .with_graceful_shutdown(async move {
                let _ = stop_rx.changed().await;
            })
            .into_future(),
    );

    shutdown_signal().await;
    tracing::info!("shutting down: saving open documents");
    let _ = stop_tx.send(());
    sync::flush_all(&state).await;

    // Sync WebSockets never close on their own, so in-flight requests get a few seconds, not forever.
    let _ = tokio::time::timeout(Duration::from_secs(5), server).await;

    return Ok(());
}

async fn shutdown_signal() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler") };
    #[cfg(unix)]
    let term = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler")
            .recv()
            .await
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<Option<()>>();
    tokio::select! { _ = ctrl_c => {}, _ = term => {} }
}
