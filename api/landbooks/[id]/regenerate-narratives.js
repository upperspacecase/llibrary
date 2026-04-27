/**
 * POST /api/landbooks/:id/regenerate-narratives
 *
 * Regenerate AI narratives without re-fetching any APIs.
 * Loads facts from the facts collection (or falls back to landbook.data),
 * calls Claude, and saves a new versioned report (12-section V2 layout).
 */

import { getCollection } from '../../_db.js';
import { getFacts, factsToReportData } from '../../../src/lib/fact-store.js';
import { saveReport } from '../../../src/lib/report-store.js';
import { generateNarrativesV2 } from '../../../src/lib/report-narratives.js';
import { updateLandbookStatus } from '../../../src/lib/landbook-status.js';
import { newRunId } from '../../../src/lib/pipeline-errors.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const runId = newRunId();

  try {
    // 1. Load data — prefer facts collection, fall back to blob
    let data;
    const factDoc = await getFacts(id);

    if (factDoc) {
      data = factsToReportData(factDoc);
    } else {
      const landbooks = await getCollection('landbooks');
      let landbook = await landbooks.findOne({ id });
      if (!landbook) {
        const submissions = await getCollection('submissions');
        landbook = await submissions.findOne({ id });
      }
      if (!landbook?.data) {
        return res.status(404).json({ error: 'No data found for this landbook' });
      }
      data = landbook.data;
    }

    // 2. Generate narratives
    const model = 'claude-sonnet-4-20250514';
    const result = await generateNarrativesV2(data);
    const narratives = result.narratives;
    const usage = result.usage;
    const narrativeError = result.error || null;
    const narrativeStatus = result.status || 'ok';
    const narrativeErrorCode = result.errorCode || null;

    // 3. Save versioned report
    const cost = usage ? {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      model,
      estimatedUSD: ((usage.input_tokens || 0) * 0.003 + (usage.output_tokens || 0) * 0.015) / 1000,
    } : null;

    const reportDoc = await saveReport(id, {
      narratives,
      scores: data.scores || {},
      factSnapshotVersion: factDoc?.version || null,
      factsContentHash: factDoc?.contentHash || null,
      model,
      promptVersion: 'v2-14section',
      cost,
      runId,
      narrativesStatus: narrativeStatus,
      narrativesError: narrativeError,
      narrativesErrorCode: narrativeErrorCode,
    });

    // 4. Also update the blob for backward compatibility
    const landbooks = await getCollection('landbooks');
    let collection = landbooks;
    let landbook = await landbooks.findOne({ id });
    if (!landbook) {
      const submissions = await getCollection('submissions');
      landbook = await submissions.findOne({ id });
      collection = submissions;
    }

    if (landbook) {
      await collection.findOneAndUpdate(
        { id },
        { $set: { 'data.narratives': narratives, updated: new Date().toISOString() } }
      );
    }

    // 5. Update landbook status (narrativesStale → false)
    await updateLandbookStatus(id);

    return res.status(200).json({
      ok: true,
      runId,
      version: reportDoc.version,
      narrativeKeys: Object.keys(narratives),
      narrativeError: narrativeError || null,
      narrativesStale: false,
      cost,
    });
  } catch (error) {
    console.error('[regenerate-narratives] Error:', error);
    return res.status(500).json({ error: error.message || 'Narrative generation failed' });
  }
}
