/**
 * POST /api/landbooks/:id/contribute
 *
 * Accept user-contributed data as observations.
 * These are stored with source: "user" and can override API-derived facts
 * when facts are rebuilt.
 *
 * Body: {
 *   field: "water.springs",      // dot-path into the fact ontology
 *   value: 3,                    // the user-provided value
 *   notes?: "Counted on site",   // optional context
 *   category?: "field-observation"  // optional: document, photo, field-observation, monitoring, local-knowledge, management, collaborative, correction
 * }
 */

import { getCollection } from '../../_db.js';
import { saveObservation } from '../../../src/lib/observation-store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { field, value, notes, category } = req.body || {};

  if (!field) {
    return res.status(400).json({ error: 'Must specify field (e.g. "water.springs")' });
  }

  try {
    // Verify landbook exists
    const landbooks = await getCollection('landbooks');
    let landbook = await landbooks.findOne({ id });
    if (!landbook) {
      const submissions = await getCollection('submissions');
      landbook = await submissions.findOne({ id });
    }
    if (!landbook) {
      return res.status(404).json({ error: 'Landbook not found' });
    }

    // Store as a user observation
    // Source key is "user:<field>" so it doesn't collide with API sources
    const sourceKey = `user:${field}`;
    await saveObservation(id, sourceKey, {
      ok: true,
      data: {
        field,
        value,
        notes: notes || null,
        category: category || 'field-observation',
        contributedAt: new Date().toISOString(),
      },
    });

    // Also store in a dedicated user_contributions sub-collection
    // for the YourKnowledge section to query easily
    const contributions = await getCollection('user_contributions');
    await contributions.insertOne({
      landbookId: id,
      field,
      value,
      notes: notes || null,
      category: category || 'field-observation',
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      ok: true,
      field,
      value,
      source: sourceKey,
    });
  } catch (error) {
    console.error('[contribute] Error:', error);
    return res.status(500).json({ error: error.message || 'Contribution failed' });
  }
}
