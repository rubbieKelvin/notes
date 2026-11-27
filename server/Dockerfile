# Dev: `docker compose up` runs this stage with ./server mounted; edits rebuild and restart the server.
FROM rust:1-bookworm AS dev
RUN cargo install watchexec-cli --locked
WORKDIR /app
ENV BIND=0.0.0.0:8080
EXPOSE 8080
# migrations are embedded at compile time (sqlx::migrate!), so they count as source too
CMD ["watchexec", "--restart", "--watch", "src", "--watch", "migrations", "--watch", "Cargo.toml", "--exts", "rs,toml,sql", "--", "cargo", "run", "--bin", "server"]

FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src src
COPY migrations migrations
RUN cargo build --release --locked

# Production (default target): `docker build server`
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/server /usr/local/bin/opennotes-server
COPY --from=build /app/target/release/opennotes /usr/local/bin/opennotes
# uploads; mount a volume here
RUN mkdir -p /data/files && chown nobody /data/files
ENV FILES_DIR=/data/files
USER nobody
ENV BIND=0.0.0.0:8080
EXPOSE 8080
CMD ["opennotes-server"]
