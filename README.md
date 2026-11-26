# opennotes

A blank sheet for writing, with inline `tldraw` canvases, AI margin notes on your own Anthropic key,
a quarantined AI inbox, and an MCP endpoint for your coding agents. See [prd.md](prd.md).

## Run it

```sh
cp .env.example .env      # fill in POSTGRES_PASSWORD and OPENNOTES_SECRET
docker compose up --build # http://localhost:3000
```

Create an account, then open **≡ → Settings** to add your Anthropic API key (needed for margin notes)
and API tokens for scripts or agents.

## Develop

```sh
pnpm install
# Postgres from compose, server on the host:
docker compose up -d db
DATABASE_URL=postgres://opennotes:<password>@localhost:5432/opennotes \
OPENNOTES_SECRET=<base64 32 bytes> cargo run --manifest-path server/Cargo.toml
pnpm dev                  # proxies /v1 and /mcp to 127.0.0.1:8080
```

(For host access to the dev database, add `ports: ["5432:5432"]` to the `db` service.)

## Agents

- **Push to your inbox:** `OPENNOTES_URL=http://localhost:3000 OPENNOTES_TOKEN=on_… opennotes push --title "Build log" < error.log`
  (build the CLI with `cargo build --release --manifest-path server/Cargo.toml`, binary `opennotes`),
  or `POST /v1/notes/ingest` with `Authorization: Bearer <ingest token>` and `{"content_md": "…"}`.
- **MCP:** toggle **MCP** on a page, create a token with the `mcp` scope, then
  `claude mcp add --transport http opennotes http://localhost:3000/mcp --header "Authorization: Bearer <token>"`.
  Tools: `list_documents`, `read_document`, `push_note`.
