import { getCollection } from '../../_db.js';
import { resolveRegion } from '../../../src/lib/regions/index.js';

const PARAM_NAME = 'Precipitação diária máxima anual';
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

// Simple linear regression for the trend line on the bar chart.
function fitLine(points) {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
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
  try {
    const stns = await getCollection('stations');
    const obs  = await getCollection('station_observations');
    const list = await stns.find({ region: region.slug, source: SOURCE }).toArray();

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
      const max    = Math.max(...values);
      const maxYear = series.find(r => r.value === max)?.year ?? null;
      const trend  = fitLine(series.map(r => ({ x: r.year, y: r.value })));

      const parish       = s.metadata?.parish       || null;
      const municipality = s.metadata?.municipality || null;
      const isHome       = !!region.homeMunicipality
        && (municipality || '').toLowerCase() === region.homeMunicipality.toLowerCase();
      const tail         = isHome ? parish : [parish, municipality].filter(Boolean).join(' · ');
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
        max,
        maxYear,
        trend,
        series,
      });
    }

    features.sort((a, b) => b.count - a.count);
    if (features.length) features[0].hero = true;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: region.slug,
      parameter: PARAM_NAME,
      unit: 'mm/day',
      stationCount: features.length,
      features,
    });
  } catch (err) {
    console.error(`GET /api/regions/${req.query.region}/max-daily-rainfall failed:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
