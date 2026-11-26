set dotenv-load

default:
    @just --list

# Full stack in docker on http://localhost:${PORT:-3000}
up:
    docker compose up --build

down:
    docker compose down

install:
    pnpm install

# Postgres only (needs `ports: ["5432:5432"]` on the db service for host access)
db:
    docker compose up -d db

# Rust server on the host against the compose db
server: db
    DATABASE_URL=postgres://opennotes:$POSTGRES_PASSWORD@localhost:5432/opennotes cargo run --manifest-path server/Cargo.toml

# Vite dev server; proxies /v1 and /mcp to 127.0.0.1:8080
web:
    pnpm dev

build:
    pnpm build
    cargo build --release --manifest-path server/Cargo.toml

check:
    cargo check --manifest-path server/Cargo.toml
    pnpm --filter web exec vue-tsc -b
