import { parseOpml } from "../../../shared/utils/parseOpml";
import { APP_URL } from "../../../shared/config";
import { Env } from "../index";
import { Resend } from "resend";
import { getSharedLinks } from "../readwise";
import { logger } from "../logger";

// Helper to emit detailed trace logs (no-op in production)
function trace(step: string, attrs: Record<string, unknown> = {}) {
  logger.trace(step, attrs);
}
import type {
  SharedFeedDirectoryResponse,
  UpdateReadwiseResponse,
} from "../../../shared/types";
import { encrypt, decrypt } from "../crypto";
import {
  createUser,
  getUserByToken,
  getUser,
  countActiveManagementTokens,
  createManagementToken,
  updateReadwiseSyncedAt,
  saveEncryptedReadwiseToken,
  verifyEmail,
} from "@server/db/user";
import {
  createShare,
  getShareByIdOrSlug,
  getShareByUserId,
  listShares as dbListShares,
  isSlugTaken,
  doesSlugConflictWithShareId,
  getShareById,
  updateShare as dbUpdateShare,
  deleteShare as dbDeleteShare,
  getSharesByUserId,
} from "@server/db/share";
import { ReadwiseDocument } from "@shared/types/types";
import { getUserLinksByShare, storeLinksForUser } from "@server/db/links";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isAlphaNumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

async function isValidOpml(opmlContent: string): Promise<boolean> {
  try {
    await parseOpml(opmlContent);
    return true;
  } catch (error) {
    return false;
  }
}

async function validateAndGetOpmlContent(
  opmlFile: File | null,
): Promise<{ opmlContent?: string; errorResponse?: Response }> {
  if (!opmlFile) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: "OPML file is required" }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  if (opmlFile.size > 1024 * 1024) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: "OPML file is too large (max 1MB)" }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  const opmlContent = await opmlFile.text();
  if (!(await isValidOpml(opmlContent))) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: "Invalid OPML file" }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      ),
    };
  }

  return { opmlContent };
}

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Default lifetime of a management token (7 days). Keep in sync with the
// default in db/user.ts:createManagementToken.
export const MANAGEMENT_TOKEN_DURATION_SECONDS = 60 * 60 * 24 * 7;

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  env: Env,
): Promise<boolean> {
  const resend = new Resend(env.resend_api_key);
  const { data, error } = await resend.emails.send({
    from: `readsthis <d@s.glyphack.com>`,
    to: [to],
    subject,
    html: body,
  });
  if (error) {
    logger.error("Resend error", { error });
    return false;
  }
  logger.info("Resend response", { data });
  return true;
}

/**
 * GET /api/health – Simple health-check.
 *
 * Input:   none
 * Output:  200 OK  { status: "ok" }
 */
async function handleHealth(_: Env): Promise<Response> {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: jsonHeaders,
  });
}

/**
 * POST /api/share – Create a new public share from an uploaded OPML file.
 *
 * Input (multipart/form-data):
 *   opmlFile – the OPML file containing feed subscriptions (required)
 *   email    – owner e-mail address (required)
 *   name     – display name shown on the public page (required)
 *
 * Output:
 *   201 Created { shareId: "<uuid>" } on success
 *   200 OK      { shareId: "<uuid>", exists: true } if share already exists
 *   4xx / 5xx   with { error: string } on validation or server errors
 */
async function handleCreateShare(
  request: Request,
  env: Env,
): Promise<Response> {
  trace("[share] Received create-share request");
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    trace("[share] Invalid content type", {
      headers: request.headers.get("content-type"),
    });
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  const formData = await request.formData();
  trace("[share] Parsed formData");
  const opmlFile = formData.get("opmlFile") as File;
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  trace("[share] Extracted fields", {
    email,
    name,
    opmlFilePresent: Boolean(opmlFile),
  });
  if (!email || !isValidEmail(email)) {
    trace("[share] Invalid email", { email });
    return new Response(JSON.stringify({ error: "Invalid email address" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { opmlContent, errorResponse } =
    await validateAndGetOpmlContent(opmlFile);
  trace("[share] OPML validation done", { valid: !errorResponse });
  if (errorResponse) {
    return errorResponse;
  }
  if (!opmlContent) {
    return new Response(JSON.stringify({ error: "Invalid OPML file" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  let user = await getUser(env.DB, email);
  trace("[share] Fetched user", { userExists: Boolean(user) });
  let newUser = false;
  if (!user) {
    user = await createUser(env.DB, email);
    newUser = true;
    trace("[share] Created new user", { userId: user.id });
  }

  if (newUser) {
    // For a brand new user, immediately issue a management token so they can
    // jump straight into their management page without a separate
    // verification step. The first successful visit using this token will
    // mark their e-mail as verified.

    const token = await createManagementToken(env.DB, user.id);
    const managementLink = `${APP_URL}/manage?token=${token}`;

    const linkLifetimeDays = MANAGEMENT_TOKEN_DURATION_SECONDS / (60 * 60 * 24);

    await sendEmail(
      user.email,
      "Your Readsthis management link",
      `<html><body>
         <p>
           Welcome! Use the following link to manage your share page. Using it will keep you
           logged in for <strong>${linkLifetimeDays} days</strong> (the lifetime of the token).
         </p>
         <p><a href="${managementLink}">${managementLink}</a></p>
       </body></html>`,
      env,
    );
    trace("[share] Sent initial management email");
  }

  const existingShare = await getShareByUserId(env.DB, user.id);
  trace("[share] Checked existing share", { exists: Boolean(existingShare) });
  if (existingShare) {
    return new Response(
      JSON.stringify({ shareId: existingShare.share_id, exists: true }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  }
  const share = await createShare(env.DB, user, opmlContent, name);
  trace("[share] Created new share", { shareId: share.share_id });
  return new Response(JSON.stringify({ shareId: share.share_id }), {
    status: 201,
    headers: jsonHeaders,
  });
}

async function handleListShares(env: Env): Promise<Response> {
  trace("[list-shares] Listing public shares");
  const rows = await dbListShares(env.DB);
  trace("[list-shares] Retrieved rows", { count: rows.length });
  const list: SharedFeedDirectoryResponse = rows.map((item) => {
    const path =
      item.slug && item.slug.trim() !== "" ? item.slug : item.share_id;
    return {
      name: item.name || "Mysterious person",
      url: `/s/${path}`,
    };
  });
  return new Response(JSON.stringify(list), { headers: jsonHeaders });
}

/**
 * GET /api/shares/:idOrSlug – Fetch the raw OPML and name for a share.
 *
 * Input  (path): idOrSlug – UUID share_id or custom slug
 * Output 200 OK  { name: string, opml: string }
 *        404     {} when share not found
 */
async function handleGetShare(idOrSlug: string, env: Env): Promise<Response> {
  trace("[get-share] Fetch share", { idOrSlug });
  const share = await getShareByIdOrSlug(env.DB, idOrSlug);
  trace("[get-share] Share fetched", { found: Boolean(share) });
  if (!share) {
    return new Response(JSON.stringify({}), {
      status: 404,
      headers: jsonHeaders,
    });
  }
  return new Response(
    JSON.stringify({ name: share.name, opml: share.opml_content }),
    {
      headers: jsonHeaders,
    },
  );
}

/**
 * POST /api/manage/request-link – Request a one-time management link.
 *
 * Input  (JSON): { email: string }
 * Output 200 OK  { msg: string }  – generic success regardless of whether
 *                                 the e-mail exists (prevents enumeration)
 */
async function handleRequestLink(
  request: Request,
  env: Env,
): Promise<Response> {
  trace("[request-link] Incoming request");
  const { email } = (await request.json()) as { email: string };
  trace("[request-link] Parsed body", { email });
  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Invalid email address" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  const user = await getUser(env.DB, email);
  trace("[request-link] User lookup", { found: Boolean(user) });

  const genericSuccessResponse = new Response(
    JSON.stringify({
      msg: "If an account exists for this email, a management link has been sent.",
    }),
    {
      status: 200,
      headers: jsonHeaders,
    },
  );
  if (!user) {
    logger.info(`User not found`, { email });
    trace("[request-link] Returning generic success – user not found");
    return genericSuccessResponse;
  }

  // User must have followed the initial management link (which verifies
  // their email) before they are allowed to request additional one-time
  // links. This prevents enumeration and keeps the same security posture as
  // before.
  if (!user.email_verified) {
    trace("[request-link] Email not verified", { email });
    return new Response(
      JSON.stringify({ error: "Please verify your email first." }),
      {
        status: 403,
        headers: jsonHeaders,
      },
    );
  }
  // Rate limit: do not issue more than 3 active tokens per email
  const countNow = Math.floor(Date.now() / 1000);
  const activeTokens = await countActiveManagementTokens(
    env.DB,
    user.id,
    countNow,
  );
  trace("[request-link] Active tokens", { count: activeTokens });

  // If there are already 3 or more active tokens, avoid issuing another one
  // and inform the user that they can reuse the link that was already mailed
  // to them. We intentionally do not reveal the exact number of tokens to
  // prevent account enumeration.
  if (activeTokens >= 3) {
    logger.error("Rate limit exceeded for management link requests", {
      user,
    });
    return new Response(
      JSON.stringify({
        msg: "A management link has already been sent to your email address. Please use the previously received link.",
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  }

  const token = await createManagementToken(env.DB, user.id);
  const managementLink = `${APP_URL}/manage?token=${token}`;

  const linkLifetimeDays = MANAGEMENT_TOKEN_DURATION_SECONDS / (60 * 60 * 24);
  trace("[request-link] Issued management link", { managementLink });
  logger.info("Issued management link", { email: user.email, managementLink });
  const emailSent = await sendEmail(
    user.email,
    "ReadsThis login link",
    `<html><body>
       <p>
         Here is your one-time login link. Using it will keep you logged in for
         <strong>${linkLifetimeDays} days</strong>, which is the lifetime of the token.
       </p>
       <p><a href="${managementLink}">${managementLink}</a></p>
     </body></html>`,
    env,
  );
  if (!emailSent) {
    trace("[request-link] Failed sending email");
    return new Response(
      JSON.stringify({
        msg: "Failed, sending management link. Retry again.",
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
  return genericSuccessResponse;
}

/**
 * GET /api/manage/verify?token=… – Verify a management token and return the
 * associated share.
 *
 * Input (query): token – one-time token issued by request-link
 * Output 200 OK  Share object
 *        401     { msg: "Link expired" } on invalid / expired token
 */
async function handleVerify(request: Request, env: Env): Promise<Response> {
  trace("[verify] Incoming verify request");
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    trace("[verify] Missing token");
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  logger.info("Verify – received token", { token });
  const user = await getUserByToken(env.DB, token);
  trace("[verify] User by token", { found: Boolean(user) });
  if (!user) {
    return new Response(
      JSON.stringify({
        msg: "Link expired",
      }),
      {
        status: 401,
        headers: jsonHeaders,
      },
    );
  }
  const shares = await getSharesByUserId(env.DB, user.id);
  trace("[verify] Shares for user", { count: shares.length });
  if (shares.length === 0) {
    return new Response(
      JSON.stringify({
        msg: "Link expired",
      }),
      {
        status: 401,
        headers: jsonHeaders,
      },
    );
  }
  if (shares.length != 1) {
    return new Response(JSON.stringify({ msg: "More than 1 share found" }), {
      headers: jsonHeaders,
    });
  }
  const share = shares[0];
  const responsePayload = {
    ...share,
    readwise_token_set: Boolean(user.readwise_token),
  } as unknown as Record<string, unknown>;
  trace("[verify] Success", { shareId: share.share_id });

  // If this is the first time the user accesses their management page, mark
  // their e-mail as verified so subsequent flows (e.g. request-link) work
  // without any extra steps.
  if (!user.email_verified) {
    await verifyEmail(env.DB, user.id);
  }
  return new Response(JSON.stringify(responsePayload), {
    headers: jsonHeaders,
  });
}

/**
 * POST /api/manage/update – Update an existing share (feeds, name, slug).
 *
 * Input (multipart/form-data):
 *   token     – management token (required)
 *   share_id  – UUID of the share being updated (required)
 *   opmlFile  – replacement OPML file (required)
 *   name      – new display name (required)
 *   slug      – new custom slug, alphanumeric or empty for none (required)
 *
 * Output 200 OK on success, otherwise { error: string }
 */
async function handleUpdateShare(
  request: Request,
  env: Env,
): Promise<Response> {
  trace("[update-share] Incoming request");
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    trace("[update-share] Content type OK");
    const formData = await request.formData();
    trace("[update-share] Parsed form data");
    // Mandatory auth fields
    const shareId = formData.get("share_id") as string | null;
    const token = formData.get("token") as string | null;

    // Optional update fields – only applied if present
    const opmlFile = formData.get("opmlFile") as File | null;
    const nameFieldRaw = formData.get("name") as string | null;
    let slugFieldRaw = formData.get("slug") as string | null;
    // Optional Readwise token now sent in the same form
    const readwiseTokenField = formData.get("readwise_token") as string | null;
    trace("[update-share] Fields extracted", {
      shareId,
      hasOpml: Boolean(opmlFile),
      nameFieldRaw,
      slugFieldRaw,
      readwiseTokenProvided: Boolean(readwiseTokenField),
    });

    if (!token || !shareId) {
      return new Response(
        JSON.stringify({ error: "Missing authentication fields" }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    // We'll collect the updates in this object and only send to DB if at least one field changes
    const update: {
      opml_content?: string;
      name?: string;
      slug?: string | null;
    } = {};

    // ------------------------------
    // Handle slug & name validation (only if provided)
    // ------------------------------

    let slugField: string | null | undefined = slugFieldRaw;
    if (slugFieldRaw !== null) {
      // empty string means user cleared slug
      if (slugFieldRaw === "") {
        slugField = null;
      } else {
        if (!isAlphaNumeric(slugFieldRaw)) {
          return new Response(
            JSON.stringify({ error: "Invalid slug format" }),
            {
              status: 400,
              headers: jsonHeaders,
            },
          );
        }
        slugField = slugFieldRaw;
      }

      const slugTaken = await isSlugTaken(env.DB, slugField, shareId);
      if (slugTaken) {
        return new Response(JSON.stringify({ error: "Slug already in use" }), {
          status: 409,
          headers: jsonHeaders,
        });
      }

      if (slugField) {
        const uuidConflict = await doesSlugConflictWithShareId(
          env.DB,
          slugField,
          shareId,
        );
        if (uuidConflict) {
          return new Response(
            JSON.stringify({
              error: "Slug conflicts with an existing share ID",
            }),
            {
              status: 409,
              headers: jsonHeaders,
            },
          );
        }
      }
      update.slug = slugField;
    }

    if (nameFieldRaw !== null) {
      if (nameFieldRaw.trim() === "") {
        return new Response(JSON.stringify({ error: "Name cannot be empty" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
      update.name = nameFieldRaw;
    }

    // ------------------------------
    // Handle OPML (if provided)
    // ------------------------------

    if (opmlFile) {
      const { opmlContent, errorResponse } =
        await validateAndGetOpmlContent(opmlFile);
      if (errorResponse) {
        return errorResponse;
      }
      update.opml_content = opmlContent!;
    }

    // If no update fields and only readwise token, that's okay.

    const user = await getUserByToken(env.DB, token);
    trace("[update-share] User by token", { found: Boolean(user) });
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 403,
          headers: jsonHeaders,
        },
      );
    }
    // If a new Readwise API token was supplied, encrypt and save it for the user.
    if (readwiseTokenField && readwiseTokenField.trim() !== "") {
      if (!env.ENCRYPTION_KEY) {
        return new Response(
          JSON.stringify({ error: "Missing server encryption key" }),
          { status: 500, headers: jsonHeaders },
        );
      }
      try {
        const encrypted = await encrypt(
          readwiseTokenField.trim(),
          env.ENCRYPTION_KEY,
        );
        await saveEncryptedReadwiseToken(env.DB, user.id, encrypted);
      } catch (e) {
        logger.error("Error saving Readwise token", { error: e });
        return new Response(
          JSON.stringify({ error: "Failed to save Readwise token" }),
          { status: 500, headers: jsonHeaders },
        );
      }
    }

    const share = await getShareById(env.DB, shareId);
    trace("[update-share] Share fetched", { found: Boolean(share) });
    if (!share || share.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to update this share" }),
        {
          status: 403,
          headers: jsonHeaders,
        },
      );
    }
    if (Object.keys(update).length > 0) {
      await dbUpdateShare(env.DB, shareId, update);
      trace("[update-share] DB updated", {
        shareId,
        fields: Object.keys(update),
      });
    }
    return new Response(null, {
      status: 200,
      headers: jsonHeaders,
    });
  } else {
    return new Response(JSON.stringify({ error: "Invalid content type" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
}

/**
 * POST /api/manage/delete – Permanently delete a share.
 *
 * Input (JSON): { share_id: string, token: string }
 * Output 302 Redirect → /manage/:token on success
 *        4xx with { error: string } on validation / auth failure
 */
async function handleDelete(request: Request, env: Env): Promise<Response> {
  trace("[delete-share] Incoming request");
  const { share_id, token } = (await request.json()) as {
    share_id: string;
    token: string;
  };
  trace("[delete-share] Parsed body", { share_id });
  if (!share_id || !token) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  const user = await getUserByToken(env.DB, token);
  trace("[delete-share] User by token", { found: Boolean(user) });
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }
  const share = await getShareById(env.DB, share_id);
  trace("[delete-share] Share fetched", { found: Boolean(share) });
  if (!share || share.user_id !== user.id) {
    return new Response(
      JSON.stringify({ error: "Not authorized to delete this share" }),
      {
        status: 403,
        headers: jsonHeaders,
      },
    );
  }
  await dbDeleteShare(env.DB, share_id);
  trace("[delete-share] Share deleted", { share_id });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/manage/${token}`,
      ...jsonHeaders,
    },
  });
}

/**
 * Handler to list all stored links along with their owner email.
 */
/**
 * POST /api/links/update-readwise – Import the user’s latest Readwise links
 * and store them in the database.
 *
 * Input (JSON): { token: string } – management token of the owner
 * Output 200 OK { message: string, newLinks: number }
 *        400/500 on various validation or sync errors
 */
export async function handleUpdateLinks(
  request: Request,
  env: Env,
): Promise<Response> {
  trace("[update-links] Incoming request");
  const body = (await request.json()) as { token: string };
  trace("[update-links] Parsed body");
  const user = await getUserByToken(env.DB, body.token);
  trace("[update-links] User by token", { found: Boolean(user) });
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }
  if (!user.readwise_token) {
    return new Response(
      JSON.stringify({ error: "Readwise token not configured" }),
      {
        status: 400,
        headers: jsonHeaders,
      },
    );
  }
  if (!env.ENCRYPTION_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing server encryption key" }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
  let decryptedToken: string;
  try {
    decryptedToken = await decrypt(user.readwise_token, env.ENCRYPTION_KEY);
    trace("[update-links] Decrypted token");
    logger.debug("Decrypted Readwise token", { decryptedToken });
  } catch (e) {
    logger.error("Error decrypting token", { error: e });
    return new Response(JSON.stringify({ error: "Failed to decrypt token" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  // Determine updatedAfter if previously synced
  const updatedAfter = user.readwise_synced_at
    ? new Date(user.readwise_synced_at * 1000).toISOString()
    : undefined;
  let links: ReadwiseDocument[];
  try {
    links = await getSharedLinks(decryptedToken, updatedAfter);
    trace("[update-links] Fetched links", { count: links.length });
  } catch (error) {
    logger.error("Error fetching shared links", { error });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  if (links.length === 0) {
    const noNew: UpdateReadwiseResponse = { message: "No new links found." };
    return new Response(JSON.stringify(noNew), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  await storeLinksForUser(env.DB, user.id, links);
  await updateReadwiseSyncedAt(env.DB, user.id);
  trace("[update-links] Links stored and sync timestamp updated");
  const success: UpdateReadwiseResponse = {
    message: "Links updated successfully.",
    newLinks: links.length,
  };
  return new Response(JSON.stringify(success), {
    status: 200,
    headers: jsonHeaders,
  });
}

/**
 * Handle fetching a user's stored Readwise documents through a share reference.
 *
 * The client must provide either:
 *   - share_id (the UUID primary key of the share), or
 *   - slug     (the human-friendly slug chosen by the user)
 *
 * The function resolves the share → user mapping inside getUserLinksByShare()
 * and then returns the Readwise links that belong to that user.
 */
async function handleGetUserReads(
  request: Request,
  env: Env,
): Promise<Response> {
  trace("[get-user-reads] Incoming request");
  const url = new URL(request.url);

  // Accept ?share_id=<id> or ?slug=<slug>
  const shareId = url.searchParams.get("share_id");
  const slug = url.searchParams.get("slug");
  trace("[get-user-reads] Query params", { shareId, slug });

  if (!shareId && !slug) {
    return new Response(
      JSON.stringify({ error: "Missing share_id or slug parameter" }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const identifier = shareId ?? slug!;
  const docs = await getUserLinksByShare(env.DB, identifier);
  trace("[get-user-reads] Links fetched", { count: docs.length });

  if (docs.length === 0) {
    // Either the share does not exist or the user has no documents.
    return new Response(JSON.stringify([]), { headers: jsonHeaders });
  }

  return new Response(JSON.stringify(docs), { headers: jsonHeaders });
}

export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  // Respond to CORS pre-flight requests early.
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: jsonHeaders,
    });
  }

  const url = new URL(request.url);

  // JSON API endpoints
  try {
    if (url.pathname === "/api/health") {
      return handleHealth(env);
    }

    // (Readwise token is now handled via /api/manage/update only)
    if (url.pathname === "/api/share" && request.method === "POST") {
      return handleCreateShare(request, env);
    }
    // Directory listing endpoint
    if (url.pathname === "/api/shares" && request.method === "GET") {
      return handleListShares(env);
    }
    if (url.pathname.startsWith("/api/shares/") && request.method === "GET") {
      const shareId = url.pathname.split("/").pop();
      if (shareId == undefined) {
        return new Response(JSON.stringify({}), {
          status: 404,
          headers: jsonHeaders,
        });
      }
      return handleGetShare(shareId, env);
    }
    if (
      url.pathname === "/api/manage/request-link" &&
      request.method === "POST"
    ) {
      return handleRequestLink(request, env);
    }
    if (url.pathname === "/api/manage/verify" && request.method === "GET") {
      return handleVerify(request, env);
    }
    if (url.pathname === "/api/manage/update" && request.method === "POST") {
      return handleUpdateShare(request, env);
    }
    if (url.pathname === "/api/manage/delete" && request.method === "POST") {
      return handleDelete(request, env);
    }
    if (
      url.pathname === "/api/links/update-readwise" &&
      request.method === "POST"
    ) {
      return handleUpdateLinks(request, env);
    }
    // The dedicated Readwise token endpoint has been deprecated.
    // Fetch stored Readwise documents for a user
    if (url.pathname === "/api/reads" && request.method === "GET") {
      return handleGetUserReads(request, env);
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    logger.error("API error", { error });
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error}` }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
}
