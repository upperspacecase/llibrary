import { getCollection } from '../../_db.js';

const SENSOR_SOURCES = [
  'snirh_meteorologica',
  'snirh_hidrometrica',
  'snirh_piezometria',
  'snirh_qualidade_sub',
  'snirh_nascentes',
];

// Freshness windows in days, per source. Hourly networks expect daily-ish
// data; piezometers are sampled monthly; groundwater quality + springs are
// sampled annually or less.
const FRESHNESS = {
  snirh_meteorologica: { fresh: 7,   stale: 30,   dead: 365 },
  snirh_hidrometrica:  { fresh: 7,   stale: 30,   dead: 365 },
  snirh_piezometria:   { fresh: 90,  stale: 180,  dead: 730 },
  snirh_qualidade_sub: { fresh: 365, stale: 730,  dead: 1825 },
  snirh_nascentes:     { fresh: 365, stale: 730,  dead: 1825 },
};

const TYPE_LABEL = {
  snirh_meteorologica: 'Weather Station',
  snirh_hidrometrica:  'River Gauge',
  snirh_piezometria:   'Piezometer',
  snirh_qualidade_sub: 'Groundwater Quality',
  snirh_nascentes:     'Spring',
};

function classifyStatus(source, lastReadingAt) {
  if (!lastReadingAt) return 'never';
  const thr = FRESHNESS[source];
  if (!thr) return 'stale';
  const ageDays = (Date.now() - new Date(lastReadingAt).getTime()) / 86400000;
  if (ageDays <= thr.fresh) return 'online';
  if (ageDays <= thr.dead)  return 'stale';
  return 'dead';
}

const PT_SMALL = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
function tidyName(name, fallback) {
  if (!name) return fallback;
  const stripped = name.replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (!stripped) return fallback;
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
    const stnsCol = await getCollection('stations');
    const obsCol  = await getCollection('station_observations');

    const stationList = await stnsCol
      .find({ region: 'odemira', source: { $in: SENSOR_SOURCES } })
      .toArray();

    // One aggregation pass: per (source, externalId), find the most recent
    // reading timestamp across any parameterName.
    const latestByKey = new Map();
    const cursor = obsCol.aggregate(
      [
        { $match: { source: { $in: SENSOR_SOURCES } } },
        { $project: {
            source: 1,
            externalId: 1,
            lastTs: { $max: '$readings.timestamp' },
        } },
        { $group: {
            _id: { source: '$source', externalId: '$externalId' },
            lastReadingAt: { $max: '$lastTs' },
        } },
      ],
      { allowDiskUse: true }
    );
    for await (const doc of cursor) {
      const ts = doc.lastReadingAt;
      if (ts == null) continue;
      latestByKey.set(`${doc._id.source}:${doc._id.externalId}`, ts);
    }

    const stations = stationList.map(s => {
      const key = `${s.source}:${s.externalId}`;
      const lastReadingAt = latestByKey.get(key) || null;
      const status = classifyStatus(s.source, lastReadingAt);
      return {
        source:        s.source,
        type:          TYPE_LABEL[s.source] || s.source,
        externalId:    s.externalId,
        code:          s.code || null,
        displayName:   tidyName(s.name, s.code || s.externalId),
        parish:        s.metadata?.parish || null,
        municipality:  s.metadata?.municipality || null,
        lat:           s.lat,
        lng:           s.lng,
        lastReadingAt: lastReadingAt
          ? (typeof lastReadingAt === 'string' ? lastReadingAt : new Date(lastReadingAt).toISOString())
          : null,
        status,
      };
    });

    const counts = { online: 0, stale: 0, dead: 0, never: 0, total: stations.length };
    for (const s of stations) counts[s.status] += 1;

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({
      ok: true,
      region: 'odemira',
      generatedAt: new Date().toISOString(),
      counts,
      stations,
    });
  } catch (err) {
    console.error('GET /api/regions/odemira/station-status failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
