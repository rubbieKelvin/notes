CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    anthropic_key_enc BYTEA,               -- BYOK: AES-256-GCM (nonce || ciphertext) under OPENNOTES_SECRET
    anthropic_key_hint TEXT,               -- last 4 chars, for display only
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    token_hash BYTEA PRIMARY KEY,          -- sha256 of the cookie value; the raw token is never stored
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Scoped bearer tokens for scripts, the CLI and MCP clients
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash BYTEA NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL,                -- subset of {ingest, mcp}
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    yjs_state BYTEA,                       -- canonical yrs state (TipTap doc incl. tldraw snapshots + margin notes)
    plain_text_cache TEXT NOT NULL DEFAULT '', -- serialized for MCP
    mcp_exposed_slug VARCHAR(128) UNIQUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX documents_user_recent ON documents (user_id, updated_at DESC);

CREATE TABLE agent_inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(128) NOT NULL,
    title TEXT,
    content_md TEXT NOT NULL,
    source_uri TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'pending', -- pending, absorbed, archived
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX inbox_pending ON agent_inbox_items (user_id, created_at DESC) WHERE status = 'pending';
