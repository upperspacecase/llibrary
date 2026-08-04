import { getCollection } from '../_db.js';
import { resolveRegion } from '../../src/lib/regions/index.js';

function unwrap(field) {
  if (field && typeof field === 'object' && 'value' in field) return field.value;
  return field ?? null;
}

function unwrapSection(section) {
  if (!section || typeof section !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(section)) out[k] = unwrap(v);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const region = resolveRegion(req);
  if (!region) {
    return res.status(404).json({ ok: false, error: `Unknown region '${req.query.region}'` });
  }
  const LANDBOOK_ID = region.landbookId;

  try {
    const facts = await getCollection('facts');
    const doc = await facts.findOne({ landbookId: LANDBOOK_ID });
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: `No facts for ${LANDBOOK_ID}. Run POST /api/landbooks/${LANDBOOK_ID}/refresh first.`,
      });
    }

    // Build a small-payload Mapbox Static URL for the Fire card — the
    // pipeline's maps.regional includes the polygon overlay and trips
    // Mapbox's URI-length limit. The fire card only needs the basemap;
    // the 50 km ring + house marker overlays are drawn in CSS.
    let fireMap = null;
    const token = process.env.VITE_MAPBOX_TOKEN;
    const rawCoords = unwrap(doc.property?.coords);
    let lat = null, lng = null;
    if (Array.isArray(rawCoords) && rawCoords.length === 2) {
      [lat, lng] = rawCoords;
    } else if (rawCoords && typeof rawCoords === 'object'
               && typeof rawCoords.lat === 'number' && typeof rawCoords.lng === 'number') {
      lat = rawCoords.lat; lng = rawCoords.lng;
    }
    let hydroMap = null;
    if (token && lat != null && lng != null) {
      fireMap = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${lng},${lat},8.5,0/700x400@2x?access_token=${token}`;
      // Hydrology basemap — closer zoom + house marker pin so the river network
      // around the sample point is legible.
      hydroMap = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+1b3a2f(${lng},${lat})/${lng},${lat},10,0/600x320@2x?access_token=${token}`;
    }

    const payload = {
      ok: true,
      region: region.slug,
      landbookId: LANDBOOK_ID,
      updatedAt: doc.updatedAt ?? null,
      runId: doc.runId ?? null,
      fireMap,
      hydroMap,
      property: unwrapSection(doc.property),
      terrain: unwrapSection(doc.terrain),
      soil: unwrapSection(doc.soil),
      geology: unwrapSection(doc.geology),
      water: unwrapSection(doc.water),
      climate: unwrapSection(doc.climate),
      species: unwrapSection(doc.species),
      fire: unwrapSection(doc.fire),
      flood: unwrapSection(doc.flood),
      drought: unwrapSection(doc.drought),
      energy: unwrapSection(doc.energy),
      regional: unwrapSection(doc.regional),
      trends: unwrapSection(doc.trends),
      agriculture: unwrapSection(doc.agriculture),
      scores: unwrapSection(doc.scores),
      maps: unwrapSection(doc.maps),
    };

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400');
    return res.status(200).json(payload);
  } catch (err) {
    console.error(`GET /api/regions/${req.query.region} failed:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
