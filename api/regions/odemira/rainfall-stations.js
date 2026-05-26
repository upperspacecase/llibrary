import { getCollection } from '../../_db.js';

const PARAM_NAME = 'Precipitação anual';
const SOURCE     = 'snirh_meteorologica';

const PT_SMALL = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
function tidy(name) {
  if (!name) return null;
  const stripped = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (!stripped) return null;
  return stripped.toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && PT_SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const stns = await getCollection('stations');
    const obs  = await getCollection('station_observations');
    const list = await stns.find({ region: 'odemira', source: SOURCE }).toArray();

    const features = [];
    for (const s of list) {
      const obsDoc = await obs.findOne({
        source: SOURCE,
        externalId: s.externalId,
        parameterName: PARAM_NAME,
      });
      if (!obsDoc || !obsDoc.count) continue;

      const series = obsDoc.readings.map(rd => ({
        year: Number((typeof rd.timestamp === 'string'
          ? rd.timestamp.slice(0, 4)
          : new Date(rd.timestamp).getUTCFullYear())),
        value: rd.value,
      })).filter(r => r.year && r.value != null);
      if (!series.length) continue;
      series.sort((a, b) => a.year - b.year);

      const values = series.map(r => r.value);
      const mean   = values.reduce((s, v) => s + v, 0) / values.length;

      const parish       = s.metadata?.parish       || null;
      const municipality = s.metadata?.municipality || null;
      const inOdemira    = (municipality || '').toLowerCase() === 'odemira';
      const tail         = inOdemira ? parish : [parish, municipality].filter(Boolean).join(' · ');
      const displayName  = tidy(s.name) || (tail ? `${s.code} · ${tail}` : (s.code || s.externalId));

      features.push({
        code:        s.code,
        externalId:  s.externalId,
        lat:         s.lat,
        lng:         s.lng,
        displayName,
        parish,
        municipality,
        unit:        obsDoc.unit || 'mm',
        first:       series[0].year,
        last:        series[series.length - 1].year,
        count:       series.length,
        mean:        +mean.toFixed(0),
        series,
      });
    }

    features.sort((a, b) => b.count - a.count);
    if (features.length) features[0].hero = true;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: 'odemira',
      parameter: PARAM_NAME,
      unit: 'mm/yr',
      stationCount: features.length,
      features,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/rainfall-stations failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
