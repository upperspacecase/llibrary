import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const c = await getCollection('stations');
    const rows = await c.find({ region: 'odemira' }).toArray();

    // Group by source so the map UI can render a tickbox per source.
    const sources = {};
    const features = [];
    for (const s of rows) {
      if (s.lat == null || s.lng == null) continue;
      if (!sources[s.source]) sources[s.source] = { source: s.source, count: 0 };
      sources[s.source].count += 1;
      // Friendly display name: SNIRH name tidied → code · parish → name.
      const PT_SMALL = new Set(['de','da','do','dos','das','e']);
      const tidied = s.name && /\([^)]+\)\s*$/.test(s.name)
        ? s.name.replace(/\s*\([^)]+\)\s*$/, '').toLowerCase().split(/\s+/).map((w,i)=>
            (i>0 && PT_SMALL.has(w)) ? w : w.charAt(0).toUpperCase()+w.slice(1)).join(' ')
        : null;
      const parish = s.metadata?.parish || null;
      const municipality = s.metadata?.municipality || null;
      const displayName = tidied
        || (s.code && parish ? `${s.code} · ${parish}` : null)
        || s.name
        || s.externalId;
      features.push({
        source:      s.source,
        externalId:  s.externalId,
        name:        s.name,
        code:        s.code ?? null,
        displayName,
        parish,
        municipality,
        lat:         s.lat,
        lng:         s.lng,
        parameters:  s.parameters ?? [],
        metadata:    s.metadata ?? {},
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: 'odemira',
      sources: Object.values(sources).sort((a, b) => b.count - a.count),
      features,
      count: features.length,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/stations failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
