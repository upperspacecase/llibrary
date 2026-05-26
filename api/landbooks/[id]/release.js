/**
 * POST /api/landbooks/:id/release  { released: boolean }
 *
 * Admin-only switch that controls whether an agent sees the LandBook as
 * "Ready" in their dashboard. The pipeline can complete without making it
 * visible — releasing is a deliberate human-in-the-loop step.
 *
 * Sets/unsets `releasedAt` + `releasedBy` on whichever collection holds
 * the doc (landbooks first, then submissions).
 */

import { requireAdmin } from '../../_auth.js';
import { getCollection } from '../../_db.js';
import { verifySession } from '../../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const release = body.released !== false; // default true (release); pass {released:false} to unrelease

  const session = verifySession(req);
  const actor = session?.email || 'admin';

  const setOp = release
    ? { $set: { releasedAt: new Date().toISOString(), releasedBy: actor } }
    : { $set: { releasedAt: null, releasedBy: null } };

  // Update wherever the doc lives — landbooks first, then submissions.
  const books = await getCollection('landbooks');
  const r1 = await books.updateOne({ id }, setOp);
  if (r1.matchedCount > 0) {
    return res.status(200).json({ id, released: release, target: 'landbooks' });
  }
  const subs = await getCollection('submissions');
  const r2 = await subs.updateOne({ id }, setOp);
  if (r2.matchedCount > 0) {
    return res.status(200).json({ id, released: release, target: 'submissions' });
  }
  return res.status(404).json({ error: 'Not found' });
}
