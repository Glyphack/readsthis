// Cloudflare D1 database schema

import { ReadwiseDocument } from "@shared/types/types";

export interface Share {
  share_id: string;
  collection_id: string;
  user_id: string;
  opml_content: string;
  name: string;
  slug: string;
  created_at: number;
  updated_at: number;
}

// User table: stores application users
// Users of the application
export interface User {
  id: string;
  email: string;
  created_at: number;
  email_verified: number;
  /** Encrypted Readwise API token */
  readwise_token: string | null;
  /** Last sync timestamp (epoch seconds) */
  readwise_synced_at: number | null;
  /** Optional unique username chosen by the user */
  username: string | null;
}

export interface ManagementToken {
  token: string;
  user_id: string;
  expires_at: number;
}

// Link table: stores documents/links for users
// Links/documents stored per user
export interface Link {
  id: number;
  user_id: number;
  type: "readwise";
  data: ReadwiseDocument;
  source_url: string; // NEW: unique per user+type+source_url starting with migration #10
  created_at: number;
  updated_at: number;
}

// Table name constants
export const TABLE_SHARES = "shares";
export const TABLE_MANAGEMENT_TOKENS = "management_tokens";
export const TABLE_USERS = "users";
export const TABLE_LINKS = "links";
