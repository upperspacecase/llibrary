import { getCollection } from '../../_db.js';

const SOURCE = 'snirh_qualidade_sub';

// Parameter groups the dashboard cards consume. Names verified live against
// what the SNIRH backfill actually stored for Odemira's 21 quality stations
// (2026-05-26). Anything not listed here has 0 readings and would render as
// "DATA?" — we deliberately only ship cards for what's real.
const GROUPS = {
  nitrate: {
    label: 'Nitrate (NO₃)',
    unit:  'mg/l NO₃',
    matchNames: new Set(['Nitrato (mg/l NO3)']),
  },
  metals: {
    label: 'Heavy metals',
    unit:  'mg/l',
    matchNames: new Set([
      'Zinco total (mg/l)',
      'Arsénio total (mg/l)',
      'Chumbo total (mg/l)',
      'Mercúrio total (mg/l)',
      'Níquel total (mg/l)',
      'Cobre total (mg/l)',
    ]),
    // Per-element pretty labels (chart legend)
    seriesLabels: {
      'Zinco total (mg/l)':    'Zinc (Zn)',
      'Arsénio total (mg/l)':  'Arsenic (As)',
      'Chumbo total (mg/l)':   'Lead (Pb)',
      'Mercúrio total (mg/l)': 'Mercury (Hg)',
      'Níquel total (mg/l)':   'Nickel (Ni)',
      'Cobre total (mg/l)':    'Copper (Cu)',
    },
  },
};

function tsKey(t) {
  return typeof t === 'string' ? t.slice(0, 7) : new Date(t).toISOString().slice(0, 7);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const obsCol = await getCollection('station_observations');

    // Pull every observation doc for the groundwater-quality source. Most
    // params are sparse but the union here only covers 21 stations so the
    // result set is bounded.
    const all = await obsCol.find({ source: SOURCE }).toArray();

    const payload = {};
    for (const [key, group] of Object.entries(GROUPS)) {
      const relevant = all.filter(d => group.matchNames.has(d.parameterName));
      if (group.seriesLabels) {
        // Per-series: one chart line per metal, monthly median across stations
        const byParam = {};
        for (const d of relevant) {
          if (!byParam[d.parameterName]) byParam[d.parameterName] = new Map();
          for (const r of d.readings || []) {
            if (typeof r.value !== 'number') continue;
            const k = tsKey(r.timestamp);
            if (!byParam[d.parameterName].has(k)) byParam[d.parameterName].set(k, []);
            byParam[d.parameterName].get(k).push(r.value);
          }
        }
        const series = Object.entries(byParam).map(([paramName, monthly]) => {
          const points = [...monthly.entries()].sort().map(([month, vals]) => {
            const sorted = vals.slice().sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            return { month, value: +median.toFixed(5), n: vals.length };
          });
          return {
            paramName,
            label: group.seriesLabels[paramName] || paramName,
            unit: group.unit,
            points,
            count: points.length,
            stationsContributing: relevant.filter(d => d.parameterName === paramName).length,
          };
        }).sort((a, b) => b.count - a.count);
        payload[key] = {
          label: group.label,
          unit:  group.unit,
          series,
        };
      } else {
        // Single-series: just monthly median + per-month spread (min/max)
        const monthly = new Map();
        for (const d of relevant) {
          for (const r of d.readings || []) {
            if (typeof r.value !== 'number') continue;
            const k = tsKey(r.timestamp);
            if (!monthly.has(k)) monthly.set(k, []);
            monthly.get(k).push(r.value);
          }
        }
        const points = [...monthly.entries()].sort().map(([month, vals]) => {
          const sorted = vals.slice().sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          return {
            month,
            median: +median.toFixed(3),
            min: +sorted[0].toFixed(3),
            max: +sorted[sorted.length - 1].toFixed(3),
            n: vals.length,
          };
        });
        payload[key] = {
          label: group.label,
          unit:  group.unit,
          points,
          stationsContributing: relevant.length,
        };
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: 'odemira',
      source: 'SNIRH Qualidade Águas Subterrâneas',
      ...payload,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/water-quality failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
