-- Self-hosted telemetry: product events and errors, never note content. Kept 90 days (cleanup job).
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,           -- sheet_ready, canvas_expand, client_error, server_error
    doc_id UUID,
    props JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX events_name_time ON events (name, created_at);

-- Filled on every save from the document itself (PRD §7: zero-flood ratio, canvas adoption).
ALTER TABLE documents
    ADD COLUMN human_chars INT NOT NULL DEFAULT 0,
    ADD COLUMN ai_chars INT NOT NULL DEFAULT 0,
    ADD COLUMN canvas_blocks INT NOT NULL DEFAULT 0;

-- PRD §7 north-star KPIs over the last 7 days. `just kpis` prints it.
CREATE VIEW kpis AS
WITH active AS (SELECT * FROM documents WHERE updated_at > NOW() - INTERVAL '7 days'),
ttfw AS (SELECT (props->>'ms')::float AS ms FROM events WHERE name = 'sheet_ready' AND created_at > NOW() - INTERVAL '7 days')
SELECT
    (SELECT COUNT(DISTINCT user_id) FROM active) AS active_users,
    (SELECT COUNT(*) FROM active) AS active_docs,
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY ms) FROM ttfw)::int AS sheet_ready_p50_ms,
    (SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY ms) FROM ttfw)::int AS sheet_ready_p90_ms,
    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE human_chars::float / NULLIF(human_chars + ai_chars, 0) > 0.8) / NULLIF(COUNT(*) FILTER (WHERE human_chars + ai_chars > 0), 0), 1) FROM active) AS pct_docs_over_80_human,
    (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE canvas_blocks > 0) / NULLIF(COUNT(*), 0), 1) FROM active) AS pct_docs_with_canvas,
    (SELECT COUNT(*) FROM events WHERE name = 'canvas_expand' AND created_at > NOW() - INTERVAL '7 days') AS canvas_expands,
    (SELECT COUNT(*) FROM events WHERE name = 'client_error' AND created_at > NOW() - INTERVAL '7 days') AS client_errors,
    (SELECT COUNT(*) FROM events WHERE name = 'server_error' AND created_at > NOW() - INTERVAL '7 days') AS server_errors;
