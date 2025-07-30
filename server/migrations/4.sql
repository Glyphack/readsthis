CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
);

-- Insert users from shares
INSERT INTO users (email, created_at)
SELECT DISTINCT owner_email, created_at
FROM shares
WHERE owner_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    data JSON NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);

-- Add user_id column
ALTER TABLE shares ADD COLUMN user_id INTEGER;

-- Manually join users and shares using a subquery
UPDATE shares
SET user_id = (
    SELECT id FROM users WHERE users.email = shares.owner_email
)
WHERE owner_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);

-- Drop owner_email-related index and column
DROP INDEX IF EXISTS idx_management_tokens_owner_email;
ALTER TABLE management_tokens ADD COLUMN user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_management_tokens_user_id ON management_tokens(user_id);

DROP INDEX IF EXISTS idx_shares_owner_email;
