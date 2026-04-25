/**
 * Pipeline run summaries.
 *
 * One document per fetchAllData invocation, keyed by runId. Captures
 * per-source counts/durations, totals, status, and trigger so the admin
 * page can answer "what did the last run actually do" without trawling
 * logs.
 *
 * Best-effort Mongo writes — no-ops without MONGODB_URI so the capture
 * script and offline tests keep working.
 */

let _resolveGetCollection;
const _getCollectionPromise = new Promise((resolve) => {
  _resolveGetCollection = resolve;
});

(async () => {
  try {
    const mod = await import('../../api/_db.js');
    _resolveGetCollection(mod.getCollection);
  } catch {
    _resolveGetCollection(null);
  }
})();

let _ensuredIndex = false;

async function ensureIndexes(col) {
  if (_ensuredIndex) return;
  await Promise.all([
    col.createIndex({ runId: 1 }, { unique: true }).catch(() => {}),
    col.createIndex({ landbookId: 1, startedAt: -1 }).catch(() => {}),
    col.createIndex({ startedAt: -1 }).catch(() => {}),
  ]);
  _ensuredIndex = true;
}

async function getCol() {
  if (!process.env.MONGODB_URI) return null;
  const getCollection = await _getCollectionPromise;
  if (!getCollection) return null;
  const col = await getCollection('pipeline_runs');
  await ensureIndexes(col);
  return col;
}

/**
 * Insert an in-progress run record. Returns the runId so callers can
 * pair the eventual finalize call without threading another value.
 *
 * @param {{ runId: string, landbookId?: string|null, trigger?: string }} ctx
 */
export async function createRun(ctx) {
  const doc = {
    runId: ctx.runId,
    landbookId: ctx.landbookId ?? null,
    trigger: ctx.trigger || 'refresh',
    startedAt: new Date(),
    finishedAt: null,
    durationMs: null,
    status: 'running',
    perSource: {},
    totals: { fetched: 0, ok: 0, failed: 0, deadLettered: 0 },
    factsContentHash: null,
    factsVersion: null,
    reportVersion: null,
    schemaValidation: null,
  };
  try {
    const col = await getCol();
    if (col) await col.insertOne(doc);
  } catch {
    // Never block the pipeline on telemetry.
  }
  return ctx.runId;
}

/**
 * Build a per-source summary from a fetchAllData results object.
 * Each entry becomes { status, durationMs, errorCode? } — small enough
 * to embed in the run doc without bloating it.
 */
export function summariseSources(results) {
  const perSource = {};
  let ok = 0;
  let failed = 0;
  for (const [source, result] of Object.entries(results)) {
    if (result?.ok) {
      perSource[source] = { status: 'ok', durationMs: result.durationMs ?? null };
      ok += 1;
    } else {
      perSource[source] = {
        status: 'error',
        durationMs: result?.durationMs ?? null,
        errorCode: result?.code || null,
        errorMessage: (result?.error || '').slice(0, 200),
      };
      failed += 1;
    }
  }
  return {
    perSource,
    totals: {
      fetched: ok + failed,
      ok,
      failed,
      deadLettered: failed,
    },
  };
}

/**
 * Finalise a run with totals, layer outcomes, and final status.
 * @param {string} runId
 * @param {{
 *   results: Object,
 *   layerResults?: Object,
 *   factsContentHash?: string|null,
 *   schemaValidation?: { ok: boolean, issueCount: number }|null,
 *   narrativesError?: string|null,
 *   reportVersion?: number|null,
 * }} summary
 */
export async function finalizeRun(runId, summary) {
  const { perSource, totals } = summariseSources(summary.results || {});
  const finishedAt = new Date();

  const status = (() => {
    if (summary.layerResults?.observations?.ok === false) return 'failed';
    if (summary.layerResults?.facts?.ok === false) return 'failed';
    if (totals.failed === 0 && summary.schemaValidation?.ok !== false && !summary.narrativesError) return 'ok';
    return 'partial';
  })();

  try {
    const col = await getCol();
    if (!col) return;
    const existing = await col.findOne({ runId });
    const startedAt = existing?.startedAt;
    const durationMs = startedAt ? (finishedAt.getTime() - new Date(startedAt).getTime()) : null;
    await col.updateOne(
      { runId },
      {
        $set: {
          finishedAt,
          durationMs,
          status,
          perSource,
          totals,
          factsContentHash: summary.factsContentHash ?? null,
          schemaValidation: summary.schemaValidation ?? null,
          narrativesError: summary.narrativesError ?? null,
          reportVersion: summary.reportVersion ?? null,
          layerResults: summary.layerResults ?? null,
        },
      }
    );
  } catch {
    // Best-effort.
  }
}

/**
 * Read a paginated list of recent runs. Used by the admin page.
 * @param {{ landbookId?: string, limit?: number, skip?: number }} [opts]
 */
export async function listRuns(opts = {}) {
  const col = await getCol();
  if (!col) return [];
  const filter = opts.landbookId ? { landbookId: opts.landbookId } : {};
  return col
    .find(filter)
    .sort({ startedAt: -1 })
    .skip(opts.skip || 0)
    .limit(Math.min(opts.limit || 50, 200))
    .toArray();
}

export async function getRun(runId) {
  const col = await getCol();
  if (!col) return null;
  return col.findOne({ runId });
}
