-- Add source_url column for uniqueness per user/type/source_url
ALTER TABLE links ADD COLUMN source_url TEXT;

-- Populate source_url from data JSON for readwise links
UPDATE links SET source_url = json_extract(data, '$.source_url') WHERE type = 'readwise';

-- You may decide to enforce NOT NULL if all existing data is valid
-- UPDATE links SET source_url = '' WHERE source_url IS NULL AND type = 'readwise';

-- Add a unique index for user+type+source_url
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_user_type_source_url
  ON links(user_id, type, source_url)
  WHERE type = 'readwise';
