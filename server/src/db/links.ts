import { ReadwiseDocument } from "@shared/types/types";
import type { D1Database } from "../index";
import { TABLE_LINKS, TABLE_SHARES } from "./schema";

/**
 * Store a batch of Readwise documents as links for a given user.
 * Inserts or replaces each link record into the links table.
 * @param db - D1 database instance
 * @param userId - ID of the user to associate links with
 * @param links - Array of ReadwiseDocument objects to store
 */
export async function storeLinksForUser(
  db: D1Database,
  userId: string,
  links: ReadwiseDocument[],
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  // Efficient batch insert-or-replace using source_url field, letting DB enforce uniqueness
  const sql = `
    INSERT OR REPLACE INTO links
      (user_id, type, data, source_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  for (const doc of links) {
    await db
      .prepare(sql)
      .bind(Number(userId), "readwise", JSON.stringify(doc), doc.source_url, now, now)
      .run();
  }
}

/**
 * Fetch stored Readwise documents for a user from the database.
 * @param db - D1 database instance
 * @param userId - ID of the user
 * @returns array of ReadwiseDocument
 */
export async function getUserLinks(
  db: D1Database,
  userId: string,
): Promise<ReadwiseDocument[]> {
  const result = await db
    .prepare(
      `SELECT data FROM ${TABLE_LINKS} WHERE user_id = ? AND type = 'readwise' ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<{ data: string }>();
  const rows = result.results || [];
  return rows.map((r) => JSON.parse(r.data) as ReadwiseDocument);
}

/**
 * Fetch stored Readwise documents for a user identified via a share.
 * The share can be referenced either by its share_id or slug. The query joins
 * the shares table with the links table via the user_id field so that we only
 * return links that belong to the owner of the share.
 *
 * @param db - D1 database instance
 * @param shareIdentifier - share_id or slug identifying the share
 * @returns array of ReadwiseDocument that belong to the user who owns the share
 */
export async function getUserLinksByShare(
  db: D1Database,
  shareIdentifier: string,
): Promise<ReadwiseDocument[]> {
  const sql = `
    SELECT l.data FROM ${TABLE_LINKS} l
    INNER JOIN ${TABLE_SHARES} s ON l.user_id = s.user_id
    WHERE (s.share_id = ? OR s.slug = ?) AND l.type = 'readwise'
    ORDER BY l.created_at DESC
  `;
  const result = await db
    .prepare(sql)
    .bind(shareIdentifier, shareIdentifier)
    .all<{
      data: string;
    }>();
  const rows = result.results || [];
  return rows.map((r) => JSON.parse(r.data) as ReadwiseDocument);
}
