// type Env import no longer needed

import { ReadwiseDocument } from "@shared/types/types";

const READWISE_API_URL = "https://readwise.io/api/v3/list/";

/**
 * Response shape from Readwise export API
 */
export interface ReadwiseApiResponse {
  count: number;
  nextPageCursor?: string;
  results: ReadwiseDocument[];
}

/**
 * Fetch all saved documents from Readwise Reader.
 * @param token - Readwise API token (decrypted)
 * @param updatedAfter - Optional ISO timestamp to filter docs updated after this date
 * @param tag - Optional tag to filter documents by. Defaults to 'share'.
 * @returns Array of ReadwiseDocument objects
 */
export async function getSharedLinks(
  token: string,
  updatedAfter?: string,
  tag: string = "share",
): Promise<ReadwiseDocument[]> {
  if (!token) throw new Error("Missing Readwise API token");

  const sharedLinks: ReadwiseDocument[] = [];
  let nextPageCursor: string | undefined;
  let processedCount = 0;

  do {
    const url = new URL(READWISE_API_URL);
    if (nextPageCursor) url.searchParams.set("pageCursor", nextPageCursor);
    if (updatedAfter) url.searchParams.set("updatedAfter", updatedAfter);
    // Add tag parameter to the request
    if (tag) url.searchParams.set("tag", tag);
    console.log(`Requesting Readwise API: ${url}`);

    // Issue request, retry on rate limit (429) based on Retry-After header
    let res: Response;
    while (true) {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Token ${token}` },
      });
      // Rate limited: wait and retry
      if (res.status === 429) {
        // Retry-After header gives seconds to wait
        const ra = res.headers.get("Retry-After");
        const delaySec = ra ? parseInt(ra, 10) || 1 : 1;
        console.warn(`Readwise API rate limited, retrying after ${delaySec}s`);
        // pause before retrying
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        continue;
      }
      break;
    }
    if (!res.ok) {
      throw new Error(
        `Readwise API request failed: ${res.status} ${res.statusText}`,
      );
    }
    const data: ReadwiseApiResponse = await res.json();
    nextPageCursor = data.nextPageCursor;
    for (const doc of data.results) {
      processedCount++;
      sharedLinks.push(doc);
    }
  } while (nextPageCursor);

  console.log(`Total documents processed: ${processedCount}`);
  console.log(`Total shared links found: ${sharedLinks.length}`);
  return sharedLinks;
}
