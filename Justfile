set dotenv-load

default:
    @just --list

# Postgres + the Rust server on :8080, rebuilt and restarted on every change under server/
up:
    docker compose up --build

down:
    docker compose down

# Follow the server log (with EMAIL_DRIVER=fs, each email's subject, including sign-in codes, shows up here)
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
    cargo test --manifest-path server/Cargo.toml
    pnpm --filter web exec vue-tsc -b
    pnpm --filter web test

# PRD north-star KPIs over the last 7 days, from the events table and note stats. `just kpis prod` on the server.
kpis env="dev":
    docker compose {{ if env == "prod" { "-f docker-compose.prod.yml" } else { "" } }} exec db psql -U opennotes -x -c 'SELECT * FROM kpis'

# The 50 most recent browser and server errors (server ones carry the request_id to find in the logs).
errors env="dev":
    docker compose {{ if env == "prod" { "-f docker-compose.prod.yml" } else { "" } }} exec db psql -U opennotes -c "SELECT created_at, name, props FROM events WHERE name IN ('client_error', 'server_error') ORDER BY id DESC LIMIT 50"
