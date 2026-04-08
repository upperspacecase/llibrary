/**
 * POST /api/landbooks/:id/refresh
 *
 * Runs the data pipeline (22+ APIs), generates AI narratives, and saves to landbook.data.
 */

import { getCollection } from '../../_db.js';
import { fetchAllData, processRawData, buildMapUrls } from '../../../src/lib/report-data-pipeline.js';
import { generateNarratives } from '../../../src/lib/report-narratives.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

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

    const areaM2 = landbook.area || 0;
    const areaHa = areaM2 > 10000 ? areaM2 / 10000 : areaM2; // handle both m² and ha

    // 3. Run the data pipeline
    const raw = await fetchAllData(lat, lng, boundary, areaHa);

    // 4. Normalize into canonical shape
    const submission = {
      name: landbook.address?.split(',')[0]?.trim() || 'Untitled',
      address: landbook.address || '',
      coords: [lat, lng],
      boundary,
    };

    const data = processRawData(raw, submission, areaHa);

    // 5. Generate AI narratives
    try {
      data.narratives = await generateNarratives(data);
    } catch (err) {
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

    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('[refresh] Error:', error);
    return res.status(500).json({ error: error.message || 'Pipeline failed' });
  }
}
