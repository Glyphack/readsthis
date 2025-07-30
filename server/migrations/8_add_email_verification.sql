-- Migration 8: Add email verification
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
