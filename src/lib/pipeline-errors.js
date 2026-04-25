/**
 * Pipeline error sink + run identification.
 *
 * Errors that escape a stage end up in the `pipeline_errors` Mongo collection
 * with enough lineage to trace and replay. Mongo writes are best-effort — if
 * MONGODB_URI is missing or the connection fails, the writer silently no-ops
 * so local capture scripts and tests keep working.
 *
 * Stage codes:
 *   FETCH_FAILED       — non-2xx, non-429 from upstream
 *   FETCH_TIMEOUT      — AbortController hit the deadline
 *   RATE_LIMITED       — 429 after backoff exhausted
 *   FETCH_EXCEPTION    — network/parse error before HTTP body
 *   SCHEMA_DRIFT       — Zod validation failed at the boundary (Phase 2)
 *   MISSING_REQUIRED   — adapter produced null for a required canonical field
 *   UPSERT_FAILED      — Mongo write error
 *   KEY_MISSING        — required env var unset (auth-gated source)
 */

let _resolveGetCollection;
const _getCollectionPromise = new Promise((resolve) => {
  _resolveGetCollection = resolve;
});

(async () => {
  try {
    const mod = await import("../../api/_db.js");
    _resolveGetCollection(mod.getCollection);
  } catch {
    _resolveGetCollection(null);
  }
})();

let _ensuredIndex = false;

async function ensureIndexes(col) {
  if (_ensuredIndex) return;
  await Promise.all([
    col.createIndex({ runId: 1 }).catch(() => {}),
    col.createIndex({ landbookId: 1, occurredAt: -1 }).catch(() => {}),
    col.createIndex({ source: 1, occurredAt: -1 }).catch(() => {}),
  ]);
  _ensuredIndex = true;
}

/**
 * @param {{
 *   runId: string,
 *   landbookId?: string | null,
 *   source: string,
 *   stage: string,
 *   code: string,
 *   message: string,
 *   attempts?: number,
 *   durationMs?: number,
 *   requestUrl?: string,
 *   details?: unknown,
 * }} error
 */
export async function writePipelineError(error) {
  if (!process.env.MONGODB_URI) return;
  const getCollection = await _getCollectionPromise;
  if (!getCollection) return;
  try {
    const col = await getCollection("pipeline_errors");
    await ensureIndexes(col);
    await col.insertOne({ ...error, occurredAt: new Date() });
  } catch {
    // Never block the pipeline on error logging.
  }
}

export function newRunId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${ts}_${rand}`;
}

/**
 * Classify a thrown error into a pipeline error code by sniffing the message.
 * Fetcher conventions in src/api/* throw `Error("<source> error: <status>")`,
 * so a status-bearing message gets a precise code.
 */
export function classifyError(err) {
  const msg = err?.message || String(err);
  if (
    err?.name === "AbortError" ||
    /aborted|timeout/i.test(msg)
  ) {
    return "FETCH_TIMEOUT";
  }
  const statusMatch = msg.match(/(\d{3})/);
  if (statusMatch) {
    const status = Number.parseInt(statusMatch[1], 10);
    if (status === 429) return "RATE_LIMITED";
    if (status >= 400 && status < 600) return "FETCH_FAILED";
  }
  if (
    /no api key|api key not set|key not set|GOOGLE_API_KEY|VITE_FIRMS_KEY|VITE_MAPBOX_TOKEN/i.test(
      msg
    )
  ) {
    return "KEY_MISSING";
  }
  if (/network|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    return "FETCH_EXCEPTION";
  }
  return "FETCH_EXCEPTION";
}
