import { getCollection } from '../../_db.js';

const REGION = 'odemira';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const c = await getCollection('inat_observations');
    // Drop rows without lat/lng or a year — they can't go on a time-binned
    // heatmap anyway.
    const docs = await c.find(
      { region: REGION, year: { $ne: null }, lat: { $ne: null }, lng: { $ne: null } },
      { projection: { _id: 0, id: 1, taxonName: 1, iconicTaxon: 1, lat: 1, lng: 1, year: 1, obscured: 1, qualityGrade: 1 } },
    ).toArray();

    // Bucket counts per year (for slider tick labels + sparkline).
    const byYear = {};
    let minYear = Infinity, maxYear = -Infinity;
    const features = new Array(docs.length);
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      byYear[d.year] = (byYear[d.year] || 0) + 1;
      if (d.year < minYear) minYear = d.year;
      if (d.year > maxYear) maxYear = d.year;
      features[i] = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
        properties: {
          y: d.year,
          tx: d.iconicTaxon || null,
          obs: d.obscured ? 1 : 0,
          rg:  d.qualityGrade === 'research' ? 1 : 0,
        },
      };
    }
    const yearCounts = Object.entries(byYear)
      .map(([y, n]) => ({ year: Number(y), count: n }))
      .sort((a, b) => a.year - b.year);

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: REGION,
      count: docs.length,
      minYear: Number.isFinite(minYear) ? minYear : null,
      maxYear: Number.isFinite(maxYear) ? maxYear : null,
      yearCounts,
      geojson: { type: 'FeatureCollection', features },
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/observations failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
