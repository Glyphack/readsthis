import { handleRequest } from "./api/routes";
import * as Sentry from "@sentry/cloudflare";
import { decrypt } from "./crypto";
import { getSharedLinks } from "./readwise";
import { storeLinksForUser } from "./db/links";
import { updateReadwiseSyncedAt } from "./db/user";

const RateLimiters = {
  SHARE_API_RATE_LIMITER: {
    key: (request: Request) => {
      const url = new URL(request.url);
      return url.pathname === "/api/share" && request.method === "POST";
    },
    limiter: (env: Env) => env.SHARE_API_RATE_LIMITER,
  },
  API_RATE_LIMITER: {
    key: () => true,
    limiter: (env: Env) => env.API_RATE_LIMITER,
  },
};

async function fetchHandler(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
): Promise<Response> {
  const ip = request.headers.get("cf-connecting-ip") || "default";

  for (const { key, limiter } of Object.values(RateLimiters)) {
    if (key(request)) {
      const { success } = await limiter(env).limit({ key: ip });
      if (!success) {
        return new Response("Rate limit exceeded", { status: 429 });
      }
    }
  }

  return handleRequest(request, env);
}

async function scheduledHandler(
  _controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(runReadwiseBatchSync(env));
}

const app: ExportedHandler<Env> = {
  fetch: fetchHandler,
  scheduled: scheduledHandler,
};

export default Sentry.withSentry((env: Env) => {
  const release = (env as any).CF_VERSION_METADATA?.id;
  return {
    dsn: env.sentry_dsn,
    release,
    tracesSampleRate: 0.5,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["error", "warn"] }),
    ],
  };
}, app);

const BATCH_LIMIT = 5;

async function runReadwiseBatchSync(env: Env): Promise<void> {
  const { DB, ENCRYPTION_KEY } = env;
  if (!ENCRYPTION_KEY) {
    console.error("[cron] Missing ENCRYPTION_KEY – aborting sync");
    return;
  }

  // Fetch users that have never been synced first, then the oldest sync time.
  const usersRes = await DB.prepare(
    `SELECT id, readwise_token, readwise_synced_at
       FROM users
       WHERE readwise_token != ''
       ORDER BY COALESCE(readwise_synced_at, 0) ASC
       LIMIT ?`,
  )
    .bind(BATCH_LIMIT)
    .all<{
      id: string;
      readwise_token: string;
      readwise_synced_at: number | null;
    }>();

  const users = usersRes.results || [];
  if (users.length === 0) {
    console.log("[cron] No users to sync");
    return;
  }

  for (const user of users) {
    try {
      const updatedAfter = user.readwise_synced_at
        ? new Date(user.readwise_synced_at * 1000).toISOString()
        : undefined;
      const token = await decrypt(user.readwise_token, ENCRYPTION_KEY);

      const docs = await getSharedLinks(token, updatedAfter);
      if (docs.length > 0) {
        await storeLinksForUser(DB, user.id, docs);
        console.log(
          `[cron] Stored ${docs.length} new links for user ${user.id}`,
        );
      } else {
        console.log(`[cron] No new links for user ${user.id}`);
      }
    } catch (err) {
      console.error(`[cron] Error syncing user ${user.id}:`, err);
    }
    await updateReadwiseSyncedAt(DB, user.id);
  }

  console.log("[cron] Batch sync completed");
}

export interface Env {
  DB: D1Database;
  resend_api_key: string;
  sentry_dsn: string;
  /** Server-side master encryption key (base64) */
  ENCRYPTION_KEY: string;
  API_RATE_LIMITER: any;
  SHARE_API_RATE_LIMITER: any;
}

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<D1ExecResult>;
};

export interface D1PreparedStatement {
  bind: (...values: any[]) => D1PreparedStatement;
  first: <T = unknown>(colName?: string) => Promise<T | null>;
  run: () => Promise<D1Result>;
  all: <T = unknown>() => Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta: object;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}
