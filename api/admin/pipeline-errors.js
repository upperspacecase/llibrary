/**
 * GET /api/admin/pipeline-errors             → recent errors across all runs
 * GET /api/admin/pipeline-errors?runId       → errors for one run
 * GET /api/admin/pipeline-errors?landbookId  → errors for one landbook
 * GET /api/admin/pipeline-errors?source      → errors for one source
 *
 * All endpoints require an admin session.
 */

import { requireAdmin } from '../_auth.js';
import { getCollection } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { runId, landbookId, source, code, limit } = req.query;

  const filter = {};
  if (runId) filter.runId = String(runId);
  if (landbookId) filter.landbookId = String(landbookId);
  if (source) filter.source = String(source);
  if (code) filter.code = String(code);

  try {
    const col = await getCollection('pipeline_errors');
    const errors = await col
      .find(filter)
      .sort({ occurredAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .toArray();

    // Aggregate by (source, code) for the summary view.
    const byCode = {};
    for (const e of errors) {
      const key = `${e.source}::${e.code}`;
      byCode[key] = (byCode[key] || 0) + 1;
    }
    const summary = Object.entries(byCode)
      .map(([key, count]) => {
        const [src, c] = key.split('::');
        return { source: src, code: c, count };
      })
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({ errors, summary, count: errors.length });
  } catch (err) {
    console.error('[admin/pipeline-errors]', err);
    return res.status(500).json({ error: err.message });
  }
}
