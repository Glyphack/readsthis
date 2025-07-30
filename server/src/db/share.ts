import { v4 as uuidv4 } from "uuid";
import { Share, User, TABLE_SHARES } from "./schema";
import { D1Database } from "..";

export async function createShare(
  db: D1Database,
  user: User,
  opml_content: string,
  name: string,
): Promise<Share> {
  const now = Math.floor(Date.now() / 1000);
  const shareId = uuidv4();
  await db
    .prepare(
      `INSERT INTO shares (share_id, user_id, opml_content, name, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(shareId, user.id, opml_content, name, now, now)
    .run();
  return {
    share_id: shareId,
    collection_id: "",
    user_id: user.id,
    opml_content,
    name,
    slug: "",
    created_at: now,
    updated_at: now,
  };
}

export async function getShareByUserId(
  db: D1Database,
  userId: string,
): Promise<Share | null> {
  const share = await db
    .prepare(`SELECT * FROM shares WHERE user_id = $1`)
    .bind(userId)
    .first<Share>();
  return share;
}

export async function getShareByIdOrSlug(
  db: D1Database,
  shareIdOrSlug: string,
): Promise<Share | null> {
  const share = await db
    .prepare(`SELECT * FROM shares WHERE (share_id = $1 OR slug = $1)`)
    .bind(shareIdOrSlug)
    .first<Share>();
  return share;
}

export async function getShareById(
  db: D1Database,
  shareId: string,
): Promise<Share | null> {
  const share = await db
    .prepare(`SELECT * FROM ${TABLE_SHARES} WHERE share_id = ?`)
    .bind(shareId)
    .first<Share>();
  return share;
}

export async function getSharesByUserId(
  db: D1Database,
  userId: string,
): Promise<Share[]> {
  const result = await db
    .prepare(
      `SELECT * FROM ${TABLE_SHARES} WHERE user_id = ? ORDER BY updated_at DESC`,
    )
    .bind(userId)
    .all<Share>();
  return result.results || [];
}

export async function updateShare(
  db: D1Database,
  shareId: string,
  updatedShare: {
    opml_content?: string;
    name?: string;
    slug?: string | null;
  },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const originalShare = await getShareById(db, shareId);
  if (!originalShare) {
    throw new Error("Share not found");
  }
  const newOpmlContent =
    updatedShare.opml_content ?? originalShare.opml_content;
  const newName = updatedShare.name ?? originalShare.name;
  const newSlug =
    updatedShare.slug !== undefined ? updatedShare.slug : originalShare.slug;

  await db
    .prepare(
      `UPDATE ${TABLE_SHARES} SET opml_content = ?, name = ?, slug = ?, updated_at = ? WHERE share_id = ?`,
    )
    .bind(newOpmlContent, newName, newSlug, now, shareId)
    .run();
}

/**
 * Return all shares sorted by created_at DESC. Select only the columns that
 * are needed for directory listing.
 */
export async function listShares(
  db: D1Database,
): Promise<Pick<Share, "share_id" | "name" | "slug">[]> {
  const result = await db
    .prepare(
      `SELECT share_id, name, slug FROM ${TABLE_SHARES} ORDER BY created_at DESC`,
    )
    .all<Pick<Share, "share_id" | "name" | "slug">>();
  return result.results || [];
}

/**
 * Check if a slug is already used by another share (different share_id).
 */
export async function isSlugTaken(
  db: D1Database,
  slug: string | null,
  currentShareId?: string,
): Promise<boolean> {
  if (!slug) return false;
  const row = await db
    .prepare(`SELECT share_id FROM ${TABLE_SHARES} WHERE slug = ?`)
    .bind(slug)
    .first<{ share_id: string }>();
  if (!row) return false;
  return row.share_id !== currentShareId;
}

/**
 * Whether a provided slug conflicts with an existing share_id belonging to
 * another record (to avoid /s/<slug> colliding with /s/<uuid>).
 */
export async function doesSlugConflictWithShareId(
  db: D1Database,
  slug: string | null,
  currentShareId?: string,
): Promise<boolean> {
  if (!slug) return false;
  const row = await db
    .prepare(`SELECT share_id FROM ${TABLE_SHARES} WHERE share_id = ?`)
    .bind(slug)
    .first<{ share_id: string }>();
  if (!row) return false;
  return row.share_id !== currentShareId;
}

/**
 * Permanently delete a share row.
 */
export async function deleteShare(
  db: D1Database,
  shareId: string,
): Promise<void> {
  await db
    .prepare(`DELETE FROM ${TABLE_SHARES} WHERE share_id = ?`)
    .bind(shareId)
    .run();
}
