use sqlx::postgres::PgPoolOptions;

pub use sqlx::PgPool;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

/// Connects to Postgres and returns a pool.
pub async fn connect(database_url: &str) -> Result<PgPool, Error> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;
    return Ok(pool);
}

/// Applies all pending migrations from `crates/jp-db/migrations`.
pub async fn migrate(pool: &PgPool) -> Result<(), Error> {
    sqlx::migrate!("./migrations").run(pool).await?;
    return Ok(());
}

pub async fn ping(pool: &PgPool) -> Result<(), Error> {
    sqlx::query("SELECT 1").execute(pool).await?;
    return Ok(());
}
