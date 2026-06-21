/**
 * `fetch()` with exponential backoff + jitter for transient upstream failures.
 *
 * Atlas talks to three flaky-ish upstreams: the Fly Rust API (free tier scales
 * to zero → cold-start 503s), Supabase PostgREST (can 429 under load), and our
 * own `/api/data` serverless action (Vercel concurrency). A single blip used to
 * surface as an empty view or a silent save failure. This helper turns a
 * transient 429/502/503/504 (or a network error) into a short, jittered retry
 * so the happy path survives a cold start instead of throwing.
 *
 * Runs identically on the server (loaders) and in the browser (`postData`).
 */

export interface RetryOptions {
  /** Total attempts including the first (default 4). */
  attempts?: number;
  /** Backoff for the first retry, doubled each attempt (default 300ms). */
  baseDelayMs?: number;
  /** Upper bound on a single backoff wait (default 4000ms). */
  maxDelayMs?: number;
  /** Override which HTTP statuses are treated as retryable. */
  retryStatuses?: number[];
}

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Reads can safely retry on any transient error. Writes only retry on pure
// overload/gateway signals where the request almost certainly never reached
// application logic — this avoids double-inserts on a request that actually
// succeeded but whose response was lost.
const TRANSIENT_READ = [408, 425, 429, 500, 502, 503, 504];
const TRANSIENT_WRITE = [429, 503];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Full-jitter exponential backoff: random point in [0, min(max, base·2^n)]. */
function backoffDelay(attempt: number, base: number, max: number): number {
  const ceiling = Math.min(max, base * 2 ** attempt);
  return Math.random() * ceiling;
}

/** Honour a server's `Retry-After` (seconds or HTTP-date), capped to `max`. */
function retryAfterMs(header: string | null, max: number): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.min(max, seconds * 1000);
  const when = Date.parse(header);
  if (!Number.isNaN(when)) return Math.min(max, Math.max(0, when - Date.now()));
  return null;
}

export async function fetchWithRetry(
  input: string,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<Response> {
  const attempts = opts.attempts ?? 4;
  const base = opts.baseDelayMs ?? 300;
  const max = opts.maxDelayMs ?? 4000;
  const method = (init.method ?? "GET").toUpperCase();
  const retryStatuses =
    opts.retryStatuses ??
    (IDEMPOTENT_METHODS.has(method) ? TRANSIENT_READ : TRANSIENT_WRITE);

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const isLast = attempt === attempts - 1;
    try {
      const res = await fetch(input, init);
      if (res.ok || isLast || !retryStatuses.includes(res.status)) {
        return res;
      }
      // Drain the body so the connection can be reused before we wait.
      await res.body?.cancel().catch(() => {});
      await sleep(retryAfterMs(res.headers.get("Retry-After"), max) ?? backoffDelay(attempt, base, max));
    } catch (err) {
      lastError = err;
      if (isLast) throw err;
      await sleep(backoffDelay(attempt, base, max));
    }
  }
  // Loop always returns or throws on the last attempt; this satisfies TS.
  throw lastError ?? new Error("fetchWithRetry: exhausted attempts");
}
