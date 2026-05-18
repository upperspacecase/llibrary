import { getCollection } from '../_db.js';

const LANDBOOK_ID = 'region-odemira';

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

  try {
    const facts = await getCollection('facts');
    const doc = await facts.findOne({ landbookId: LANDBOOK_ID });
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: `No facts for ${LANDBOOK_ID}. Run POST /api/landbooks/${LANDBOOK_ID}/refresh first.`,
      });
    }

    const payload = {
      ok: true,
      landbookId: LANDBOOK_ID,
      updatedAt: doc.updatedAt ?? null,
      runId: doc.runId ?? null,
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
    };

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('GET /api/regions/odemira failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
