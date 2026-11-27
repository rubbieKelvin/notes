-- Shown on the avatar and to collaborators (canvas cursors); falls back to the email's local part when empty.
ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
