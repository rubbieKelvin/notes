# One image for production: the Rust server, serving the API and the built web app (WEB_DIR).
# Build context: repository root.

FROM node:22-alpine AS web
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter @opennotes/web build

FROM rust:1-bookworm AS server
WORKDIR /app
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src src
# migrations and email templates are embedded at compile time
COPY server/migrations migrations
COPY server/templates templates
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=server /app/target/release/server /usr/local/bin/opennotes-server
COPY --from=server /app/target/release/opennotes /usr/local/bin/opennotes
COPY --from=web /repo/apps/web/dist /srv/web
# uploads when STORAGE_DRIVER=fs; mount a volume here
RUN mkdir -p /data/files && chown nobody /data/files
ENV FILES_DIR=/data/files WEB_DIR=/srv/web BIND=0.0.0.0:8080
USER nobody
EXPOSE 8080
CMD ["opennotes-server"]
