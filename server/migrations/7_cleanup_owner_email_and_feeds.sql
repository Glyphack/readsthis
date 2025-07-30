-- Migration 7: remove deprecated columns/tables and add new constraints

-- 1. Remove owner_email references from shares
DROP INDEX IF EXISTS idx_shares_owner_email;
ALTER TABLE shares DROP COLUMN owner_email;

-- 2. Ensure single share per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);

-- 4. Drop legacy feed tables
DROP TABLE IF EXISTS feedCollections;
DROP TABLE IF EXISTS feeds;
