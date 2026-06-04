/**
 * POST /api/admin/pipeline-replay  { runId, fromStage }
 *
 * Re-runs the pipeline from a saved point WITHOUT re-hitting external APIs.
 * Reads observations for the run's landbook, reconstructs the raw results
 * object, and replays from `fromStage`:
 *
 *   "process"    → reprocess + write facts + write report (default)
 *   "narratives" → re-generate narratives only (skip processRawData)
 *
 * Requires admin auth.
 */

import { requireAdmin } from '../_auth.js';
import { getCollection } from '../_db.js';
import { processRawData } from '../../src/lib/report-data-pipeline.js';
import { saveFacts, reportDataToFacts, getFacts, factsToReportData } from '../../src/lib/fact-store.js';
import { saveReport } from '../../src/lib/report-store.js';
import { generateNarrativesV2 } from '../../src/lib/report-narratives.js';
import { newRunId } from '../../src/lib/pipeline-errors.js';
import { createRun, finalizeRun, getRun } from '../../src/lib/pipeline-runs.js';
import { updateLandbookStatus } from '../../src/lib/landbook-status.js';
import { resolvePropertyName } from '../../src/lib/property-name.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { runId: sourceRunId, landbookId: explicitLandbookId, fromStage = 'process' } = body;

  if (!sourceRunId && !explicitLandbookId) {
    return res.status(400).json({ error: 'runId or landbookId required' });
  }

  // Resolve landbookId: from explicit param, or by looking up the source run.
  let landbookId = explicitLandbookId || null;
  if (!landbookId && sourceRunId) {
    const run = await getRun(sourceRunId);
    if (!run) return res.status(404).json({ error: `Source run ${sourceRunId} not found` });
    landbookId = run.landbookId;
  }
  if (!landbookId) {
    return res.status(400).json({ error: 'Could not resolve landbookId for replay' });
  }

  // Load the landbook so we have submission context.
  const landbooks = await getCollection('landbooks');
  let landbook = await landbooks.findOne({ id: landbookId });
  if (!landbook) {
    const submissions = await getCollection('submissions');
    landbook = await submissions.findOne({ id: landbookId });
  }
  if (!landbook) return res.status(404).json({ error: `Landbook ${landbookId} not found` });

  const newId = newRunId();
  await createRun({ runId: newId, landbookId, trigger: `replay:${fromStage}:${sourceRunId || 'manual'}` });

  try {
    if (fromStage === 'narratives') {
      const factDoc = await getFacts(landbookId);
      if (!factDoc) {
        await finalizeRun(newId, { results: {}, layerResults: { facts: { ok: false, error: 'no facts' } } });
        return res.status(404).json({ error: 'No facts found; replay from "process" instead' });
      }
      const data = factsToReportData(factDoc);
      const narrativeResult = await generateNarrativesV2(data);
      const narratives = narrativeResult.narratives || {};
      const narrativeError = narrativeResult.error || null;

      const reportDoc = await saveReport(landbookId, {
        narratives,
        scores: data.scores || {},
        factSnapshotVersion: factDoc.version || null,
        factsContentHash: factDoc.contentHash || null,
        model: 'claude-sonnet-4-20250514',
        promptVersion: 'v2-14section',
        runId: newId,
        narrativesError: narrativeError,
      });

      await updateLandbookStatus(landbookId).catch(() => {});

      await finalizeRun(newId, {
        results: {},
        layerResults: { report: { ok: true, version: reportDoc.version } },
        factsContentHash: factDoc.contentHash,
        narrativesError: narrativeError,
        reportVersion: reportDoc.version,
      });

      return res.status(200).json({
        ok: true,
        runId: newId,
        replayedFrom: sourceRunId,
        fromStage: 'narratives',
        version: reportDoc.version,
        narrativesError: narrativeError,
      });
    }

    // Default: replay from "process" — reconstruct raw from observations.
    const observations = await (await getCollection('observations')).find({ landbookId }).toArray();
    if (observations.length === 0) {
      await finalizeRun(newId, { results: {}, layerResults: {} });
      return res.status(404).json({ error: 'No observations on file for this landbook; cannot replay process stage. Run a fresh refresh first.' });
    }

    const raw = {};
    for (const obs of observations) {
      raw[obs.source] = obs.status === 'ok'
        ? { ok: true, data: obs.raw, durationMs: obs.durationMs ?? null }
        : { ok: false, error: obs.error, code: obs.errorCode || null, durationMs: obs.durationMs ?? null };
    }

    const center = landbook.center;
    const lat = Array.isArray(center) ? center[0] : center?.lat;
    const lng = Array.isArray(center) ? center[1] : center?.lng;
    const areaM2 = landbook.area || 0;
    const areaHa = areaM2 > 10000 ? areaM2 / 10000 : areaM2;
    const submission = {
      name: resolvePropertyName(landbook),
      address: landbook.address || '',
      coords: [lat, lng],
      boundary: landbook.boundary || [],
    };

    const data = await processRawData(raw, submission, areaHa, { runId: newId, landbookId });

    let narratives = {};
    let narrativeError = null;
    try {
      const r = await generateNarrativesV2(data);
      narratives = r.narratives || {};
      narrativeError = r.error || null;
    } catch (err) {
      narrativeError = err.message;
    }
    data.narratives = narratives;

    const factResult = await saveFacts(landbookId, reportDataToFacts(data), {
      runId: newId, hashSource: data, schemaVersion: 1,
    });

    const reportDoc = await saveReport(landbookId, {
      narratives,
      scores: data.scores || {},
      factsContentHash: factResult.contentHash,
      model: 'claude-sonnet-4-20250514',
      promptVersion: 'v2-14section',
      runId: newId,
      narrativesError: narrativeError,
    });

    await updateLandbookStatus(landbookId).catch(() => {});

    await finalizeRun(newId, {
      results: raw,
      layerResults: {
        observations: { ok: true, count: observations.length, replayed: true },
        facts: { ok: true },
        report: { ok: true, version: reportDoc.version },
      },
      factsContentHash: factResult.contentHash,
      schemaValidation: data.meta?.validation || null,
      narrativesError: narrativeError,
      reportVersion: reportDoc.version,
    });

    return res.status(200).json({
      ok: true,
      runId: newId,
      replayedFrom: sourceRunId,
      fromStage: 'process',
      sourceCount: observations.length,
      version: reportDoc.version,
      schemaValidation: data.meta?.validation || null,
      narrativesError: narrativeError,
    });
  } catch (err) {
    console.error('[admin/pipeline-replay]', err);
    await finalizeRun(newId, { results: {}, layerResults: { error: err.message } }).catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}
