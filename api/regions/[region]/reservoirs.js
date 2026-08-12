import { getCollection } from '../../_db.js';
import { resolveRegion } from '../../../src/lib/regions/index.js';

const HERO_CODE_PREFIX = '28G/01A'; // Santa Clara — longest record, matches the dam landmark

// SNIRH reservoir names arrive ALL-CAPS with the code in parens, e.g.
// "ALBUFEIRA DE SANTA CLARA (28G/01A)". Strip the redundant code suffix and
// title-case with Portuguese preposition rules.
const PT_SMALL = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
function tidySnirhName(s) {
  if (!s) return null;
  const stripped = s.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (!stripped) return null;
  return stripped.toLowerCase().split(/\s+/).map((w, i) =>
    i > 0 && PT_SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

// Reverse-geocode against the wiki landmark catalogue we already ingested
// (kind=reservoir within ≤5 km) so the chart labels read like
// "28G/01A · Santa Clara" instead of just the SNIRH code.
function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
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
    const stationsCol = await getCollection('stations');
    const obsCol      = await getCollection('station_observations');

    // 1. Find reservoir stations — hidrométrica with code ending in A / AE.
    const stationsAll = await stationsCol
      .find({ region: region.slug, source: 'snirh_hidrometrica' })
      .toArray();
    const reservoirs = stationsAll.filter(s => /A[E]?$/.test(s.code || ''));

    // 2. Landmark lookup (wiki landmarks already in `stations` collection).
    const landmarks = await stationsCol
      .find({ region: region.slug, source: 'wiki_landmark' })
      .toArray();

    // 3. Pull each reservoir's monthly volume series, normalise to its own max.
    const features = [];
    for (const r of reservoirs) {
      // SNIRH UID for "Volume armazenado mensal (final do mês)" is 304545050
      // (verified live 2026-05-26). Fall back to name-match if the UID
      // ever shifts.
      const obs = await obsCol.findOne({
        source: 'snirh_hidrometrica',
        externalId: r.externalId,
        parameter: '304545050',
      }) || await obsCol.findOne({
        source: 'snirh_hidrometrica',
        externalId: r.externalId,
        parameterName: 'Volume armazenado mensal (final do mês)',
      });
      if (!obs || !obs.count) continue;

      const max = obs.readings.reduce((m, r0) => r0.value > m ? r0.value : m, 0);
      if (!(max > 0)) continue;

      // Series as [{date, pct, value}] — date is ISO yyyy-mm-dd.
      const series = obs.readings.map(rd => ({
        date: typeof rd.timestamp === 'string'
          ? rd.timestamp.slice(0, 10)
          : new Date(rd.timestamp).toISOString().slice(0, 10),
        value: rd.value,
        pct: +((rd.value / max) * 100).toFixed(2),
      }));

      // Landmark within ≤5 km
      let landmarkName = null;
      let landmarkKm = null;
      for (const l of landmarks) {
        if (l.lat == null || l.lng == null) continue;
        const km = haversineKm(r.lat, r.lng, l.lat, l.lng);
        if (km <= 5 && (landmarkKm == null || km < landmarkKm)) {
          landmarkKm = km;
          landmarkName = l.name;
        }
      }

      const latest = series[series.length - 1];
      // Same-month previous-year reading (for the Δ chip)
      let yoy = null;
      if (latest) {
        const targetYear = Number(latest.date.slice(0, 4)) - 1;
        const targetMonth = latest.date.slice(5, 7);
        for (let i = series.length - 2; i >= 0; i--) {
          const d = series[i].date;
          if (d.startsWith(`${targetYear}-${targetMonth}`)) { yoy = series[i]; break; }
        }
      }

      // Friendly display name: SNIRH name (tidied) beats landmark match.
      const tidied = tidySnirhName(r.name);
      const parish = r.metadata?.parish || null;
      const municipality = r.metadata?.municipality || null;
      const displayName = tidied || landmarkName || r.code || r.externalId;
      // "Albufeira de Santa Clara · São Teotónio · Odemira"
      const secondary = [parish, municipality].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');

      features.push({
        code:        r.code,
        externalId:  r.externalId,
        lat:         r.lat,
        lng:         r.lng,
        displayName,
        secondary,
        parish,
        municipality,
        landmark:    landmarkName,
        landmarkKm,
        hero:        (r.code || '').startsWith(HERO_CODE_PREFIX),
        unit:      obs.unit || null,
        max,
        first:     series[0]?.date ?? null,
        last:      series[series.length - 1]?.date ?? null,
        count:     series.length,
        latest:    latest ? { date: latest.date, value: latest.value, pct: latest.pct } : null,
        yoy:       yoy   ? { date: yoy.date,   value: yoy.value,   pct: yoy.pct   } : null,
        deltaPctPoints: latest && yoy ? +(latest.pct - yoy.pct).toFixed(1) : null,
        series,
      });
    }

    features.sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0) || b.count - a.count);

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: region.slug,
      parameter: 'Volume armazenado mensal (final do mês)',
      reservoirCount: features.length,
      features,
    });
  } catch (err) {
    console.error(`GET /api/regions/${req.query.region}/reservoirs failed:`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
