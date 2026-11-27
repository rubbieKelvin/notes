-- Every upload (note files, canvas images, storage page) is a row here; the bytes live on disk under FILES_DIR/<id>.
-- `bytes` only holds canvas images uploaded before this migration; the server moves them to disk at startup.
ALTER TABLE assets RENAME TO files;
ALTER TABLE files ALTER COLUMN bytes DROP NOT NULL;
ALTER TABLE files ADD COLUMN name TEXT NOT NULL DEFAULT 'image';
ALTER TABLE files ADD COLUMN size BIGINT NOT NULL DEFAULT 0;
UPDATE files SET size = octet_length(bytes), name = 'image.' || split_part(mime, '/', 2);
CREATE INDEX files_user ON files (user_id, created_at DESC);

-- Which notes show a file. The server rewrites a note's rows from its content on every save,
-- so a file can sit in many notes, and outlives them (it stays in its owner's storage).
CREATE TABLE file_refs (
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, doc_id)
);
CREATE INDEX file_refs_doc ON file_refs (doc_id);
INSERT INTO file_refs (file_id, doc_id) SELECT id, doc_id FROM files WHERE doc_id IS NOT NULL;
ALTER TABLE files DROP COLUMN doc_id;
