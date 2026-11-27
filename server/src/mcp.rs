//! FR-3.2: Streamable HTTP MCP server at `/mcp`. Bearer token with the `mcp` scope; only documents the
//! owner explicitly exposed are readable.
use crate::{AppState, auth, inbox};
use axum::{
    Router,
    extract::{Request, State},
    http::request::Parts,
    middleware::{self, Next},
    response::{IntoResponse, Response},
};
use rmcp::{
    ErrorData, ServerHandler,
    handler::server::{common::Extension, wrapper::Parameters},
    model::{CallToolResult, ContentBlock, Implementation, ServerCapabilities, ServerConfig},
    schemars, tool, tool_handler, tool_router,
    transport::streamable_http_server::{
        StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
    },
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone, Copy)]
struct McpUser(Uuid);

#[derive(Clone)]
pub struct Notes {
    db: sqlx::PgPool,
    state: AppState,
}

#[derive(Deserialize, schemars::JsonSchema)]
#[schemars(crate = "rmcp::schemars")]
struct ReadArgs {
    /// The document slug from list_documents
    slug: String,
}

#[derive(Deserialize, schemars::JsonSchema)]
#[schemars(crate = "rmcp::schemars")]
struct PushArgs {
    /// Markdown body of the note
    content_md: String,
    /// Optional short title
    title: Option<String>,
    /// Optional link to where this came from
    source_uri: Option<String>,
}

fn user(parts: &Parts) -> Result<Uuid, ErrorData> {
    parts
        .extensions
        .get::<McpUser>()
        .map(|u| u.0)
        .ok_or_else(|| ErrorData::invalid_request("unauthenticated", None))
}

fn db_err(e: sqlx::Error) -> ErrorData {
    tracing::error!(error = %e, "mcp db error");
    ErrorData::internal_error("database error", None)
}

#[tool_router]
impl Notes {
    #[tool(
        description = "List the notes documents the user has exposed to agents, with slug, title and last update."
    )]
    async fn list_documents(
        &self,
        Extension(parts): Extension<Parts>,
    ) -> Result<CallToolResult, ErrorData> {
        let rows: Vec<(String, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            "SELECT mcp_exposed_slug, title, updated_at FROM documents WHERE user_id = $1 AND mcp_exposed_slug IS NOT NULL ORDER BY updated_at DESC",
        )
        .bind(user(&parts)?)
        .fetch_all(&self.db)
        .await
        .map_err(db_err)?;
        let text = if rows.is_empty() {
            "No documents are exposed. The user can expose one with the MCP button in opennotes."
                .to_string()
        } else {
            rows.iter()
                .map(|(slug, title, at)| {
                    format!(
                        "{slug}\t{title}\t(updated {})",
                        at.format("%Y-%m-%d %H:%M UTC")
                    )
                })
                .collect::<Vec<_>>()
                .join("\n")
        };
        Ok(CallToolResult::success(vec![ContentBlock::text(text)]))
    }

    #[tool(
        description = "Read an exposed document as text: the user's prose, their AI margin notes, math, and text from embedded canvases."
    )]
    async fn read_document(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(a): Parameters<ReadArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        let row: Option<(String, String)> = sqlx::query_as("SELECT title, plain_text_cache FROM documents WHERE user_id = $1 AND mcp_exposed_slug = $2")
            .bind(user(&parts)?)
            .bind(&a.slug)
            .fetch_optional(&self.db)
            .await
            .map_err(db_err)?;
        let (title, body) = row.ok_or_else(|| {
            ErrorData::resource_not_found("no exposed document with that slug", None)
        })?;

        return Ok(CallToolResult::success(vec![ContentBlock::text(format!(
            "# {title}\n\n{body}"
        ))]));
    }

    #[tool(
        description = "Send a note to the user's AI inbox. It never edits their documents; they choose whether to pull it in."
    )]
    async fn push_note(
        &self,
        Extension(parts): Extension<Parts>,
        Parameters(a): Parameters<PushArgs>,
    ) -> Result<CallToolResult, ErrorData> {
        let item = inbox::Ingest {
            content_md: a.content_md,
            title: a.title,
            agent_id: Some("mcp".into()),
            source_uri: a.source_uri,
        };
        inbox::push(&self.state, user(&parts)?, item)
            .await
            .map_err(|e| ErrorData::invalid_params(e.1, None))?;

        return Ok(CallToolResult::success(vec![ContentBlock::text(
            "Queued in the user's AI inbox.",
        )]));
    }
}

#[tool_handler]
impl ServerHandler for Notes {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("opennotes", env!("CARGO_PKG_VERSION")))
            .with_instructions("Curated human notes from opennotes. Use list_documents, then read_document. Use push_note to suggest something; it lands in the user's inbox, not their page.")
    }
}

async fn require_token(State(s): State<AppState>, mut req: Request, next: Next) -> Response {
    match auth::bearer_user(&s, req.headers(), "mcp").await {
        Ok(Some(id)) => {
            req.extensions_mut().insert(McpUser(id));
            next.run(req).await
        }
        Ok(None) => crate::AppError::new(
            axum::http::StatusCode::UNAUTHORIZED,
            "Bearer token with the 'mcp' scope required",
        )
        .into_response(),
        Err(e) => e.into_response(),
    }
}

pub fn router(state: AppState) -> Router<AppState> {
    let (db, st) = (state.db.clone(), state.clone());
    let config = StreamableHttpServerConfig::default().with_allowed_hosts(state.cfg.hosts.clone());
    let service = StreamableHttpService::new(
        move || {
            Ok(Notes {
                db: db.clone(),
                state: st.clone(),
            })
        },
        Arc::new(LocalSessionManager::default()),
        config,
    );
    return Router::new()
        .nest_service("/mcp", service)
        .route_layer(middleware::from_fn_with_state(state, require_token));
}
