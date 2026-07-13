/**
 * POST /api/landbooks/:id/refresh
 *
 * Runs the data pipeline (22+ APIs), generates AI narratives, and saves to landbook.data.
 */

import { getCollection } from '../../_db.js';
import { fetchAllData, processRawData, buildMapUrls } from '../../../src/lib/report-data-pipeline.js';
import { generateNarrativesV2 } from '../../../src/lib/report-narratives.js';
import { saveAllObservations } from '../../../src/lib/observation-store.js';
import { saveFacts, reportDataToFacts } from '../../../src/lib/fact-store.js';
import { saveReport } from '../../../src/lib/report-store.js';
import { updateLandbookStatus } from '../../../src/lib/landbook-status.js';
import { newRunId } from '../../../src/lib/pipeline-errors.js';
import { createRun, finalizeRun } from '../../../src/lib/pipeline-runs.js';
import { resolvePropertyName } from '../../../src/lib/property-name.js';
import { polygonArea, sqmToHectares } from '../../../src/lib/geo.js';
import { NARRATIVE_MODEL } from '../../../src/lib/models.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const runId = newRunId();

  try {
    // 1. Load the landbook (or fall back to submissions)
    const landbooks = await getCollection('landbooks');
    let landbook = await landbooks.findOne({ id });
    let collection = landbooks;

    if (!landbook) {
      const submissions = await getCollection('submissions');
      landbook = await submissions.findOne({ id });
      collection = submissions;
      if (landbook) landbook.address = landbook.address || landbook.postcode || '';
    }

    if (!landbook) {
      return res.status(404).json({ error: 'Landbook not found' });
    }

    // 2. Extract coordinates
    const center = landbook.center;
    const boundary = landbook.boundary || [];
    const lat = Array.isArray(center) ? center[0] : center?.lat;
    const lng = Array.isArray(center) ? center[1] : center?.lng;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Landbook has no coordinates' });
    }

    // Recompute area from the boundary so units are unambiguous; the old
    // `areaM2 > 10000 ? … : areaM2` heuristic left sub-hectare plots (< 10000 m²)
    // unconverted, so a 0.7 ha / 7000 m² plot was treated as 7000 ha.
    const areaM2 = (Array.isArray(boundary) && boundary.length >= 3)
      ? polygonArea(boundary)
      : (landbook.area || 0);
    const areaHa = sqmToHectares(areaM2);

    // 3. Run the data pipeline
    await createRun({ runId, landbookId: id, trigger: 'refresh' });
    const raw = await fetchAllData(lat, lng, boundary, areaHa, { runId, landbookId: id });

    // 4. Normalize into canonical shape
    const submission = {
      name: resolvePropertyName(landbook),
      address: landbook.address || '',
      coords: [lat, lng],
      boundary,
    };

    const data = await processRawData(raw, submission, areaHa, { runId, landbookId: id });

    // 5. Generate AI narratives (V2 — intro/callout per section)
    let narrativeError = null;
    let narrativeStatus = 'ok';
    let narrativeErrorCode = null;
    try {
      const result = await generateNarrativesV2(data);
      data.narratives = result.narratives;
      narrativeStatus = result.status || 'ok';
      narrativeErrorCode = result.errorCode || null;
      if (result.error) {
        narrativeError = result.error;
        console.warn('[refresh] Narrative generation issue:', result.error);
      }
    } catch (err) {
      narrativeError = `Narrative generation failed: ${err.message}`;
      narrativeStatus = 'failed';
      narrativeErrorCode = 'API_ERROR';
      console.warn('[refresh] Narrative generation failed, continuing without:', err.message);
      data.narratives = {};
    }

    // 6. Save to document
    await collection.findOneAndUpdate(
      { id },
      {
        $set: {
          data,
          dataUpdated: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      }
    );

    // 7. Dual-write to 3-layer collections
    const layerResults = { observations: null, facts: null, report: null };
    try {
      await saveAllObservations(id, raw, { runId });
      const obsCount = Object.keys(raw).length;
      layerResults.observations = { ok: true, count: obsCount };
    } catch (err) {
      console.warn('[refresh] Observation persist failed:', err.message);
      layerResults.observations = { ok: false, error: err.message };
    }
    let factsContentHash = null;
    try {
      const factResult = await saveFacts(id, reportDataToFacts(data), { runId, hashSource: data, schemaVersion: 1 });
      factsContentHash = factResult.contentHash;
      layerResults.facts = { ok: true };
    } catch (err) {
      console.warn('[refresh] Fact persist failed:', err.message);
      layerResults.facts = { ok: false, error: err.message };
    }
    try {
      const reportDoc = await saveReport(id, {
        narratives: data.narratives || {},
        scores: data.scores || {},
        factsContentHash,
        model: NARRATIVE_MODEL,
        runId,
        narrativesStatus: narrativeStatus,
        narrativesError: narrativeError,
        narrativesErrorCode: narrativeErrorCode,
      });
      layerResults.report = { ok: true, version: reportDoc.version };
    } catch (err) {
      console.warn('[refresh] Report persist failed:', err.message);
      layerResults.report = { ok: false, error: err.message };
    }

    // 8. Update landbook status
    try {
      await updateLandbookStatus(id);
    } catch (err) {
      console.warn('[refresh] Status update failed:', err.message);
    }

    // Build per-source summary for admin feedback
    const sourceResults = {};
    for (const [key, result] of Object.entries(raw)) {
      sourceResults[key] = { ok: result.ok, error: result.ok ? null : result.error, code: result.code || null };
    }

    // Finalise the run summary (best-effort; never blocks).
    await finalizeRun(runId, {
      results: raw,
      layerResults,
      factsContentHash,
      schemaValidation: data.meta?.validation || null,
      narrativesError: narrativeError,
      reportVersion: layerResults.report?.version || null,
    });

    return res.status(200).json({
      ok: true,
      runId,
      sources: sourceResults,
      layers: layerResults,
      narrativeKeys: Object.keys(data.narratives || {}),
      narrativeError: narrativeError || null,
      scores: data.scores ? {
        naturalCapital: data.scores.naturalCapital,
        carbon: data.scores.carbon,
        biodiversity: data.scores.biodiversity,
        water: data.scores.water,
        soil: data.scores.soil,
      } : null,
      meta: data.meta || {},
    });
  } catch (error) {
    console.error('[refresh] Error:', error);
    return res.status(500).json({ error: error.message || 'Pipeline failed' });
  }
}
