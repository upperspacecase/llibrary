import { getCollection } from '../../_db.js';

// Minimum readings to include a station on the chart — under this and the
// line is just a couple of dots and adds visual noise.
const MIN_READINGS = 24;

// SNIRH parameter UID for "Profundidade Nível Água" (depth to water, m).
// Confirmed via the backfill output 2026-05-26.
const PARAM_UID  = '2277';
const PARAM_NAME = 'Profundidade Nível Água';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const stationsCol = await getCollection('stations');
    const obsCol      = await getCollection('station_observations');

    const piezometers = await stationsCol
      .find({ region: 'odemira', source: 'snirh_piezometria' })
      .toArray();

    const features = [];
    for (const p of piezometers) {
      const obs = await obsCol.findOne({
        source: 'snirh_piezometria',
        externalId: p.externalId,
        parameter: PARAM_UID,
      }) || await obsCol.findOne({
        source: 'snirh_piezometria',
        externalId: p.externalId,
        parameterName: PARAM_NAME,
      });
      if (!obs || (obs.count || 0) < MIN_READINGS) continue;

      const series = obs.readings.map(rd => ({
        date: typeof rd.timestamp === 'string'
          ? rd.timestamp.slice(0, 10)
          : new Date(rd.timestamp).toISOString().slice(0, 10),
        value: rd.value,
      }));
      const values  = series.map(s => s.value);
      const minV    = Math.min(...values);
      const maxV    = Math.max(...values);
      const latest  = series[series.length - 1];
      // Year-on-year change (same month previous year if we can find it)
      let yoy = null;
      if (latest) {
        const targetYear  = Number(latest.date.slice(0, 4)) - 1;
        const targetMonth = latest.date.slice(5, 7);
        for (let i = series.length - 2; i >= 0; i--) {
          if (series[i].date.startsWith(`${targetYear}-${targetMonth}`)) {
            yoy = series[i]; break;
          }
        }
      }

      const parish       = p.metadata?.parish       || null;
      const municipality = p.metadata?.municipality || null;
      // Piezometers don't carry a SNIRH name — only the cadastral code.
      // Best human label: "584/4 · Aljezur" (parish in the same municipality
      // as Odemira is implied; outside Odemira we include the municipality).
      const inOdemira    = (municipality || '').toLowerCase() === 'odemira';
      const friendlyTail = inOdemira ? parish : [parish, municipality].filter(Boolean).join(' · ');
      const displayName  = friendlyTail ? `${p.code} · ${friendlyTail}` : (p.code || p.externalId);

      features.push({
        code:        p.code,
        externalId:  p.externalId,
        lat:         p.lat,
        lng:         p.lng,
        displayName,
        parish,
        municipality,
        inOdemira,
        unit:        obs.unit || 'm',
        minDepth:   minV,
        maxDepth:   maxV,
        first:      series[0].date,
        last:       latest.date,
        count:      series.length,
        latest:     { date: latest.date, value: latest.value },
        yoy:        yoy ? { date: yoy.date, value: yoy.value } : null,
        // Lower water table = deeper (worse). Positive delta = water dropped further.
        deltaM:     yoy ? +(latest.value - yoy.value).toFixed(2) : null,
        series,
      });
    }

    // Sort longest-record first; that becomes the default hero.
    features.sort((a, b) => b.count - a.count);
    if (features.length) features[0].hero = true;

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true,
      region: 'odemira',
      parameter: PARAM_NAME,
      parameterUid: PARAM_UID,
      unit: 'm below ground',
      minReadingsFilter: MIN_READINGS,
      stationCount: features.length,
      features,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/groundwater failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
