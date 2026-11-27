-- The owner can turn comments off per note.
ALTER TABLE documents ADD COLUMN comments_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- One thread per note; replies are one level deep. Guests (public notes only) leave a name instead of a user.
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    guest_name TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((user_id IS NULL) <> (guest_name IS NULL))
);
CREATE INDEX comments_doc ON comments (doc_id, created_at);

-- Reactions need an account: one of each emoji per person.
CREATE TABLE comment_reactions (
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    PRIMARY KEY (comment_id, user_id, emoji)
);
CREATE TABLE note_reactions (
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    PRIMARY KEY (doc_id, user_id, emoji)
);
