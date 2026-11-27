-- Public profile handle: /public/@username. Assigned on first sign-in, editable.
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;

-- Sign-in emails carry a 6-digit code as well as the link. Wrong guesses are counted per email.
ALTER TABLE magic_links ADD COLUMN code_hash BYTEA;
ALTER TABLE magic_links ADD COLUMN attempts INT NOT NULL DEFAULT 0;
CREATE INDEX magic_links_email ON magic_links (email);

-- Anyone may read a public note at /public/@owner/<id>.
ALTER TABLE documents ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Shares are by email, so people can be invited before they have an account.
CREATE TABLE doc_shares (
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (doc_id, email)
);
CREATE INDEX doc_shares_email ON doc_shares (email);

-- Images belong to the note they were placed in, so whoever can read the note can load them.
ALTER TABLE assets ADD COLUMN doc_id UUID REFERENCES documents(id) ON DELETE CASCADE;
