CREATE TABLE IF NOT EXISTS feeds (
	id TEXT PRIMARY KEY,
	collectionId TEXT NOT NULL,
	title TEXT NOT NULL,
	xmlUrl TEXT NOT NULL,
	htmlUrl TEXT,
	category TEXT,
	FOREIGN KEY (collectionId) REFERENCES feedCollections(id)
);

CREATE TABLE IF NOT EXISTS feedCollections (
	id TEXT PRIMARY KEY,
	userId TEXT NOT NULL,
	title TEXT NOT NULL,
	description TEXT,
	isPublic INTEGER DEFAULT 0,
	createdAt TEXT NOT NULL,
	updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shares (
	share_id TEXT PRIMARY KEY,
	collection_id TEXT DEFAULT 'direct_share',
	owner_email TEXT NOT NULL,
	opml_content TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_owner_email ON shares (owner_email);

CREATE TABLE IF NOT EXISTS management_tokens (
	token TEXT PRIMARY KEY,
	owner_email TEXT NOT NULL,
	expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_management_tokens_owner_email ON management_tokens (owner_email);
