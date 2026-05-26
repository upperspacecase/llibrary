import { getCollection } from '../../_db.js';

// Annual pan evaporation in mm — sum monthly readings into yearly totals.
// Piche pan is more widely deployed than Class-A tina in Odemira, so we
// prefer "Evaporação piche mensal" but fall back to "Evaporação tina
// mensal" where Piche isn't recorded.
const PARAM_NAMES = [
  'Evaporação piche mensal (convencional)',
  'Evaporação tina mensal',
];
const SOURCE = 'snirh_meteorologica';

const PT_SMALL = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
function tidy(name) {
  if (!name) return null;
  const stripped = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (!stripped) return null;
  return stripped.toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && PT_SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

function annualSum(monthlyReadings) {
  const byYear = {};
  for (const rd of monthlyReadings) {
    const year = Number((typeof rd.timestamp === 'string'
      ? rd.timestamp.slice(0, 4)
      : new Date(rd.timestamp).getUTCFullYear()));
    if (!year || rd.value == null) continue;
    if (!byYear[year]) byYear[year] = { months: 0, sum: 0 };
    byYear[year].months += 1;
    byYear[year].sum += rd.value;
  }
  // Only count years with at least 9 reporting months — partial years
  // would underestimate annual evaporation.
  return Object.entries(byYear)
    .filter(([, v]) => v.months >= 9)
    .map(([y, v]) => ({ year: Number(y), value: +v.sum.toFixed(1) }))
    .sort((a, b) => a.year - b.year);
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
      let obsDoc = null;
      let chosenParam = null;
      for (const name of PARAM_NAMES) {
        obsDoc = await obs.findOne({
          source: SOURCE,
          externalId: s.externalId,
          parameterName: name,
        });
        if (obsDoc && obsDoc.count) { chosenParam = name; break; }
      }
      if (!obsDoc || !obsDoc.count) continue;

      const series = annualSum(obsDoc.readings);
      if (series.length < 3) continue;

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
        parameter:   chosenParam,
        unit:        'mm/yr',
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
      parameter: 'Pan evaporation (annual, Piche/Class-A tank)',
      unit: 'mm/yr',
      stationCount: features.length,
      features,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/evaporation failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
