-- Personal tags: each person tags any note they can open; nobody else sees them.
CREATE TABLE note_tags (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (user_id, doc_id, tag)
);
CREATE INDEX note_tags_doc ON note_tags (doc_id);
