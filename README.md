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
Docker volumes, so the container never touches your local `server/target`.

Sign in with your email: you get a one-time link (no passwords). Until you set `SMTP_URL` and
`MAIL_FROM`, the link is printed to the server log (`just logs`) instead of emailed. Then open
**≡ → Settings** to pick an AI provider (needed for margin notes and canvas annotations) and create
API tokens for scripts or agents.

For production, build the images directly: `docker build server` (its default target is the slim
release image) and `docker build -f apps/web/Dockerfile .` (static app behind nginx, proxying to a host
named `server`).

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
