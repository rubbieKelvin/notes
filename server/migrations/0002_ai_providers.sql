-- Any AI provider, not just Anthropic: provider preset id, optional custom base URL, chosen model.
ALTER TABLE users RENAME COLUMN anthropic_key_enc TO ai_key_enc;
ALTER TABLE users RENAME COLUMN anthropic_key_hint TO ai_key_hint;
ALTER TABLE users ADD COLUMN ai_provider TEXT;
ALTER TABLE users ADD COLUMN ai_base_url TEXT;
ALTER TABLE users ADD COLUMN ai_model TEXT;
UPDATE users SET ai_provider = 'anthropic', ai_model = 'claude-opus-5-5' WHERE ai_key_enc IS NOT NULL;
