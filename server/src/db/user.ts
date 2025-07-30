import { D1Database } from "..";
import { MANAGEMENT_TOKEN_DURATION_SECONDS } from "../api/routes.ts";
import { TABLE_MANAGEMENT_TOKENS, TABLE_USERS, User } from "./schema";

export interface ManagementToken {
  token: string;
  expires_at: number;
  user_id: string;
}

/**
 * Count how many non-expired management tokens currently exist for a user.
 */
export async function countActiveManagementTokens(
  db: D1Database,
  userId: string,
  now: number,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM ${TABLE_MANAGEMENT_TOKENS} WHERE user_id = ? AND expires_at > ?`,
    )
    .bind(userId, now)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

/**
 * Insert a new one-time management token for a user.
 */
import { v4 as uuidv4 } from "uuid";

/**
 * Generate and persist a one-time management token for a user.
 * Returns the freshly created token string.
 *
 * Tokens are valid for 7 days by default.
 */
export async function createManagementToken(
  db: D1Database,
  userId: string,
  durationSeconds = MANAGEMENT_TOKEN_DURATION_SECONDS,
): Promise<string> {
  const token = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + durationSeconds;

  await db
    .prepare(
      `INSERT INTO ${TABLE_MANAGEMENT_TOKENS} (token, user_id, expires_at) VALUES (?, ?, ?)`,
    )
    .bind(token, userId, expiresAt)
    .run();

  return token;
}

export async function verifyEmail(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(`UPDATE ${TABLE_USERS} SET email_verified = 1 WHERE id = ?`)
    .bind(userId)
    .run();
}

/**
 * Update the readwise_synced_at timestamp for a user.
 */
export async function updateReadwiseSyncedAt(
  db: D1Database,
  userId: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`UPDATE ${TABLE_USERS} SET readwise_synced_at = ? WHERE id = ?`)
    .bind(now, userId)
    .run();
}

/**
 * Persist an encrypted Readwise token for a user.
 */
export async function saveEncryptedReadwiseToken(
  db: D1Database,
  userId: string,
  encryptedToken: string,
): Promise<void> {
  await db
    .prepare(`UPDATE ${TABLE_USERS} SET readwise_token = ? WHERE id = ?`)
    .bind(encryptedToken, userId)
    .run();
}

export async function getUser(
  db: D1Database,
  email: string,
): Promise<User | null> {
  const existsInUsers = await db
    .prepare(
      `SELECT id, email, created_at, email_verified, readwise_token, readwise_synced_at, username
       FROM ${TABLE_USERS} WHERE email = $1`,
    )
    .bind(email)
    .first<User>();
  return existsInUsers;
}

export async function getUserByToken(
  db: D1Database,
  token: string,
): Promise<User | null> {
  const now = Math.floor(Date.now() / 1000);
  const tokenRecord = await db
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.email_verified, u.readwise_token, u.readwise_synced_at, u.username
       FROM ${TABLE_MANAGEMENT_TOKENS} t
       JOIN ${TABLE_USERS} u ON t.user_id = u.id
			WHERE t.token = $1 AND t.expires_at > $2`,
    )
    .bind(token, now)
    .first<User>();
  if (!tokenRecord) {
    return null;
  }
  return tokenRecord;
}

export async function getUserByUsername(
  db: D1Database,
  username: string,
): Promise<User | null> {
  const existsInUsers = await db
    .prepare(
      `SELECT id, email, created_at, email_verified, readwise_token, readwise_synced_at, username
       FROM ${TABLE_USERS} WHERE username = $1`,
    )
    .bind(username)
    .first<User>();
  return existsInUsers;
}

export async function createUser(
  db: D1Database,
  email: string,
  username: string | null = null,
): Promise<User> {
  const now = Math.floor(Date.now() / 1000);
  const user = await db
    .prepare(
      `INSERT INTO users (email, username, created_at, email_verified)
       VALUES (?, ?, ?, ?) RETURNING *`,
    )
    .bind(email, username, now, 0)
    .first<User>();
  return user!;
}
