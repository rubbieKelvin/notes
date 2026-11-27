-- Mirrors meta.description in the Y.Doc (like title), for the notes list and cards.
ALTER TABLE documents ADD COLUMN description TEXT NOT NULL DEFAULT '';
