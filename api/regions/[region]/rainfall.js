import { getCollection } from '../../_db.js';
import { resolveRegion } from '../../../src/lib/regions/index.js';


function unwrap(field) {
  if (field && typeof field === 'object' && 'value' in field) return field.value;
  return field ?? null;
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
    const facts = await getCollection('facts');
    const doc = await facts.findOne({ landbookId: region.landbookId });
    if (!doc) return res.status(404).json({ ok: false, error: 'no facts doc' });

    // spi12Series carries the monthly precip totals as sum12 (12-mo rolling
    // sum ending at each month). For annual totals we need raw monthly precip
    // which we don't keep separately — derive annual totals as the sum of
    // (sum12[Dec] - sum12[prev Dec]) per year, or fall back to slicing the
    // last 12 monthly totals. Simpler: walk spi12Series and re-derive monthly
    // precip values from the sum12 series via differencing.
    const series = unwrap(doc.climate?.spi12Series) || [];
    if (!series.length) return res.status(404).json({ ok: false, error: 'no spi series' });

    // The sum12 field is already the 12-month rolling sum. To recover a
    // per-month precip estimate we can difference adjacent sum12s, but
    // that's noisy for an annual chart. Better path: group by calendar
    // year, take the December sum12 (which IS the calendar-year total
    // when computed as "12 months ending in December").
    const annual = new Map();
    for (const m of series) {
      if (!m.date || m.sum12 == null) continue;
      const [yyyy, mm] = m.date.split('-');
      if (mm === '12') annual.set(Number(yyyy), m.sum12);
    }
    // If the current year hasn't ended yet, use the latest available
    // sum12 as a trailing-12-month estimate for "current year so far".
    const last = series[series.length - 1];
    if (last && last.date && last.date.split('-')[1] !== '12') {
      annual.set(Number(last.date.slice(0, 4)), last.sum12);
    }

    const years = [...annual.entries()]
      .map(([year, mm]) => ({ year, mm: Math.round(mm) }))
      .sort((a, b) => a.year - b.year);

    // 1991-2020 normal (the WMO standard climatological reference period)
    const window = years.filter(y => y.year >= 1991 && y.year <= 2020);
    const normal = window.length
      ? Math.round(window.reduce((s, y) => s + y.mm, 0) / window.length)
      : null;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: region.slug,
      source: 'Open-Meteo Archive (ERA5) via precipLongTerm',
      unit: 'mm/yr',
      normalPeriod: '1991-2020',
      normal,
      years,
      latest: years[years.length - 1] || null,
    });
  } catch (err) {
    console.error(`GET /api/regions/${req.query.region}/rainfall failed:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
