-- Sign-in is magic-link only: passwords go away.
ALTER TABLE users DROP COLUMN password_hash;

CREATE TABLE magic_links (
    token_hash BYTEA PRIMARY KEY,          -- sha256 of the emailed token; single use
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
