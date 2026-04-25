/**
 * fetchWithPolicy
 *
 * Drop-in for `fetch` that adds:
 *   - timeout via AbortController
 *   - retries with exponential backoff + jitter
 *   - Retry-After-aware backoff for 429
 *   - default User-Agent + Accept headers
 *
 * The return value is a normal Response — callers keep using .ok/.json()/.text()
 * exactly as before. Errors thrown match fetch's existing surface: AbortError on
 * timeout, TypeError on network failure.
 *
 * Use the onAttempt callback to instrument from the orchestrator if needed.
 */

const DEFAULT_RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

// Identifying UA — some upstream APIs (Overpass, Nominatim) reject browser-like
// UAs or require a contact identifier in their ToS. Keep this honest.
const DEFAULT_USER_AGENT =
  "landbook-pipeline/0.1 (+https://github.com/upperspacecase/landlibrary)";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;
const MAX_BACKOFF_MS = 10_000;

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{
 *   timeoutMs?: number,
 *   retries?: number,
 *   retryOn?: Set<number>,
 *   userAgent?: string | null,
 *   accept?: string | null,
 *   source?: string,
 *   onAttempt?: (info: { attempt: number, status?: number, error?: Error, durationMs: number }) => void,
 * }} [opts]
 * @returns {Promise<Response>}
 */
export async function fetchWithPolicy(url, init = {}, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryOn = DEFAULT_RETRY_STATUSES,
    userAgent = DEFAULT_USER_AGENT,
    accept = null,
    source = "unknown",
    onAttempt,
  } = opts;

  const headers = new Headers(init.headers || {});
  if (userAgent && !headers.has("User-Agent") && !headers.has("user-agent")) {
    headers.set("User-Agent", userAgent);
  }
  if (accept && !headers.has("Accept") && !headers.has("accept")) {
    headers.set("Accept", accept);
  }

  const finalInit = { ...init, headers };

  let lastResponse = null;
  let lastError = null;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const t0 = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...finalInit, signal: controller.signal });
      clearTimeout(timer);
      const durationMs = Date.now() - t0;
      onAttempt?.({ attempt, status: res.status, durationMs });

      if (!retryOn.has(res.status) || attempt > retries) {
        return res;
      }

      // Retryable status. Capture in case it's the final attempt.
      lastResponse = res;
      // Drain the body so the connection can be reused.
      try { await res.text(); } catch { /* ignore */ }

      const waitMs =
        parseRetryAfter(res.headers.get("retry-after")) ?? backoffMs(attempt);
      await sleep(waitMs);
    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - t0;
      onAttempt?.({ attempt, error: err, durationMs });
      lastError = err;
      if (attempt > retries) break;
      await sleep(backoffMs(attempt));
    }
  }

  // All attempts exhausted. Prefer returning the last retryable response so
  // callers can read .status; only throw if every attempt errored at the
  // network layer.
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error(`fetchWithPolicy(${source}): no response`);
}

function backoffMs(attempt) {
  const base = 500 * 2 ** (attempt - 1);
  const jitter = Math.random() * 250;
  return Math.min(base + jitter, MAX_BACKOFF_MS);
}

function parseRetryAfter(header) {
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.min(date - Date.now(), MAX_BACKOFF_MS));
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
