import { getCollection } from '../../_db.js';
import { resolveRegion } from '../../../src/lib/regions/index.js';

const SENSOR_TYPES = new Set([
  'weather',
  'river',
  'piezometer',
  'groundwater_quality',
  'spring',
  'soil',
  'other',
]);

function clean(v, max = 280) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function parseCoord(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const region = resolveRegion(req);
  if (!region) {
    return res.status(404).json({ ok: false, error: `Unknown region '${req.query.region}'` });
  }
  try {
    const body = req.body || {};
    const sensorType  = clean(body.sensorType, 32);
    const location    = clean(body.location, 280);
    const lat         = parseCoord(body.lat);
    const lng         = parseCoord(body.lng);
    const contactName = clean(body.contactName, 120);
    const contactEmail = clean(body.contactEmail, 200);
    const note         = clean(body.note, 600);

    if (!SENSOR_TYPES.has(sensorType)) {
      return res.status(400).json({ ok: false, error: 'Invalid sensor type.' });
    }
    if (!location) {
      return res.status(400).json({ ok: false, error: 'Location is required.' });
    }
    if (!contactEmail || !/.+@.+\..+/.test(contactEmail)) {
      return res.status(400).json({ ok: false, error: 'A valid contact email is required.' });
    }

    const proposals = await getCollection('sensor_proposals');
    const doc = {
      region: region.slug,
      sensorType,
      location,
      lat,
      lng,
      contactName: contactName || null,
      contactEmail,
      note: note || null,
      createdAt: new Date(),
      status: 'pending',
      userAgent: req.headers['user-agent'] || null,
    };
    const result = await proposals.insertOne(doc);

    return res.status(201).json({ ok: true, id: result.insertedId });
  } catch (err) {
    console.error(`POST /api/regions/${req.query.region}/sensor-proposals failed:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
