# opennotes

A blank sheet for writing, with inline `tldraw` canvases, AI margin notes on your own AI provider,
a quarantined AI inbox, and an MCP endpoint for your coding agents. See [prd.md](prd.md).

## Run it

```sh
cp .env.example .env      # fill in POSTGRES_PASSWORD and OPENNOTES_SECRET
pnpm install
docker compose up --build # Postgres + the server on :8080; rebuilds and restarts when server/ changes
pnpm dev                  # web app on http://localhost:5173 (hot reload), proxies /v1 and /mcp to :8080
```

(`just up` and `just web` do the same.) The first `up` compiles the server and its dependencies, which
takes a few minutes; after that, a change rebuilds incrementally. Build output and crates live in
Docker volumes, so the container never touches your local `server/target`. Uploaded files are stored
on disk under `FILES_DIR` by default (the `files` volume in Compose; `/data/files` in the production image),
so back that up along with Postgres, or set `STORAGE_DRIVER=s3` to use any S3-compatible bucket (see
`.env.example`). Each account gets 500 MB.

Sign in with your email: you get a 6-digit code and a one-time link (no passwords). With the default
`EMAIL_DRIVER=fs`, emails are written to files and their subjects, which carry the code, appear in the
server log (`just logs`). To actually deliver mail, set `EMAIL_DRIVER=resend`, `EMAIL_RESEND_API_KEY`
and `EMAIL_FROM` (see `.env.example`). Then open **avatar → Settings** to pick an AI provider (needed for margin notes and canvas annotations) and create
API tokens for scripts or agents.

### Production

On a host with DNS for your domain pointing at it, set `DOMAIN`, `POSTGRES_PASSWORD`, `OPENNOTES_SECRET`,
`EMAIL_FROM` and `EMAIL_RESEND_API_KEY` in `.env`, then:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy terminates TLS (certificates are automatic), nginx serves the app, and the server runs with secure
cookies, sign-ups off (`ALLOW_SIGNUP=true` to open them; sign up first, then turn it off), and JSON logs.
A `backup` service writes a Postgres dump to `./backups` nightly (kept 14 days) and mirrors uploaded files
there. Copy `./backups` off the host (restic, rclone, …), or use `STORAGE_DRIVER=s3` with bucket
versioning for files. Restore: `pg_restore -h … -U opennotes -d opennotes --clean backups/db-….dump`.

On `docker compose stop`/deploy the server saves every open document before exiting.

**Brimble:** `brimble.toml` defines the web app, the private API (one instance, files in an S3-compatible bucket) and
managed Postgres. Set the secrets it lists in the dashboard, and add your domain to the web service.

### Logs

The server logs one line per request with its `x-request-id` (also sent back as a response header, so a
user's failing request can be found in the logs). `LOG_FORMAT=json` for log shippers; `RUST_LOG` sets levels
(default `info`, e.g. `RUST_LOG=info,sqlx=warn`).

### Telemetry

Self-hosted only: nothing leaves your server, and no note content is recorded. The `events` table holds
browser errors, every 5xx response (with its request id), how long a sheet takes to become editable, and
canvas expands; each saved note also records its human vs AI-Source character counts and number of canvases.
Events are kept 90 days and deleted with the account. `just kpis` prints the PRD §7 north-star numbers for
the last 7 days and `just errors` the latest errors (add `prod` on the production host).

### AI providers

Each user brings their own key: Anthropic, OpenAI, DeepSeek, Google Gemini, OpenRouter, or any
OpenAI-compatible endpoint (vLLM, LM Studio, Ollama, …) via **Custom**. Keys are encrypted with
`OPENNOTES_SECRET` and never sent back to the browser. AI Annotate needs a model that reads images
(DeepSeek's API is text-only).

Custom base URLs must be https and resolve to public addresses, so users can't point the server at
your internal network. To allow a local model server (e.g. Ollama on the same host), set
`ALLOW_PRIVATE_AI_URLS=true`, but only if you trust every account on the server.

## Tests

```sh
cargo test --manifest-path server/Cargo.toml   # unit tests
pnpm test:e2e                                  # browser end-to-end suite (tests/e2e)
```

The e2e suite starts everything itself: a fake AI provider, the Rust server on a throwaway Postgres
cluster (needs `initdb`/`pg_ctl` on PATH, or set `E2E_DATABASE_URL` to an empty database), and Vite.
It uses your installed Chrome; in CI run `pnpm --filter e2e exec playwright install chromium` and set
`PW_CHANNEL=chromium`.

## Agents

- **Push to your inbox:** `OPENNOTES_URL=http://localhost:3000 OPENNOTES_TOKEN=on_… opennotes push --title "Build log" < error.log`
  (build the CLI with `cargo build --release --manifest-path server/Cargo.toml`, binary `opennotes`),
  or `POST /v1/notes/ingest` with `Authorization: Bearer <ingest token>` and `{"content_md": "…"}`.
- **MCP:** toggle **MCP** on a page, create a token with the `mcp` scope, then
  `claude mcp add --transport http opennotes http://localhost:3000/mcp --header "Authorization: Bearer <token>"`.
  Tools: `list_documents`, `read_document`, `push_note`.
