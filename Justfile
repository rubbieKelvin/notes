set dotenv-load

default:
    @just --list

# Postgres + the Rust server on :8080, rebuilt and restarted on every change under server/
up:
    docker compose up --build

down:
    docker compose down

# Follow the server log (sign-in links show up here without SMTP)
logs:
    docker compose logs -f server

install:
    pnpm install

# Vite dev server on http://localhost:5173; proxies /v1 and /mcp to the server on 127.0.0.1:8080
web:
    pnpm dev

build:
    pnpm build
    cargo build --release --manifest-path server/Cargo.toml

check:
    cargo check --manifest-path server/Cargo.toml
    pnpm --filter web exec vue-tsc -b
