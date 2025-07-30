export interface Feed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  description?: string;
  category?: string;
}

export interface FeedGroup {
  title: string;
  feeds: Feed[];
}

// Entry representing a shared feed directory item.
export interface SharedFeedEntry {
  /** Display name of the shared feed collection */
  name: string;
  /** URL path to access the shared feed (e.g., '/s/{shareId}') */
  url: string;
}

// Response type for the shared feed directory listing API.
export type SharedFeedDirectoryResponse = SharedFeedEntry[];

// ---------------------------------------------
// API response types
// ---------------------------------------------

/**
 * Successful response from POST /api/links/update-readwise
 *
 * When the sync completes successfully the server returns the number of
 * newly-imported links as well as a human-readable message.  If the sync
 * fails the same endpoint returns an object with an `error` property.
 *
 * All properties are optional because the client only needs to handle the
 * subset that is present for the given response.
 */
export interface UpdateReadwiseResponse {
  /** Human-readable success message */
  message?: string;
  /** Number of links that were imported during the sync */
  newLinks?: number;
  /** Error message when the request failed */
  error?: string;
}
