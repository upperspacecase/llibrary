/**
 * GET /api/admin/pipeline-runs            → list recent runs (50 most recent)
 * GET /api/admin/pipeline-runs?landbookId → recent runs for one landbook
 * GET /api/admin/pipeline-runs?runId      → single run with errors attached
 *
 * All endpoints require an admin session (Google OAuth or password).
 */

import { requireAdmin } from '../_auth.js';
import { getCollection } from '../_db.js';
import { listRuns, getRun } from '../../src/lib/pipeline-runs.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { runId, landbookId, limit, skip } = req.query;

  try {
    if (runId) {
      const run = await getRun(String(runId));
      if (!run) return res.status(404).json({ error: 'Run not found' });

      // Attach errors for this run.
      let errors = [];
      try {
        const col = await getCollection('pipeline_errors');
        errors = await col
          .find({ runId: String(runId) })
          .sort({ occurredAt: -1 })
          .limit(200)
          .toArray();
      } catch {
        errors = [];
      }
      return res.status(200).json({ run, errors });
    }

    const runs = await listRuns({
      landbookId: landbookId ? String(landbookId) : undefined,
      limit: limit ? Number(limit) : 50,
      skip: skip ? Number(skip) : 0,
    });
    return res.status(200).json({ runs });
  } catch (err) {
    console.error('[admin/pipeline-runs]', err);
    return res.status(500).json({ error: err.message });
  }
}
