/**
 * Station Store
 *
 * Two collections backing the regional dashboard's "data input stations"
 * model:
 *
 *   stations              — catalog. One doc per data-collection point
 *                           (well, gauge, etc.). Used by the map UI and
 *                           as the lookup table for ingest jobs.
 *
 *   station_observations  — measurements. One doc per (station, parameter)
 *                           with the full timeseries array embedded. The
 *                           array stays under a few hundred KB even for
 *                           multi-decade monthly records, so single-doc
 *                           storage is fine; switch to a row-per-reading
 *                           collection only if we need per-timestamp
 *                           queries.
 *
 * Both collections are scoped by `region` (a slug like "odemira"). A station
 * is uniquely identified by `(source, externalId)`.
 */

import { getCollection } from '../../api/_db.js';

const STATIONS_COLL = 'stations';
const OBS_COLL      = 'station_observations';

let stationsIndexed = false;
let obsIndexed = false;

async function stationsCol() {
  const c = await getCollection(STATIONS_COLL);
  if (!stationsIndexed) {
    await Promise.all([
      c.createIndex({ source: 1, externalId: 1 }, { unique: true }).catch(() => {}),
      c.createIndex({ region: 1 }).catch(() => {}),
      c.createIndex({ lat: 1, lng: 1 }).catch(() => {}),
    ]);
    stationsIndexed = true;
  }
  return c;
}

async function obsCol() {
  const c = await getCollection(OBS_COLL);
  if (!obsIndexed) {
    await Promise.all([
      c.createIndex({ source: 1, externalId: 1, parameter: 1 }, { unique: true }).catch(() => {}),
      c.createIndex({ region: 1, source: 1 }).catch(() => {}),
    ]);
    obsIndexed = true;
  }
  return c;
}

/**
 * Upsert one station record.
 *
 * @param {object} station - { source, externalId, name, code, lat, lng, region, parameters[], metadata }
 */
export async function upsertStation(station) {
  if (!station || !station.source || !station.externalId) {
    throw new Error('upsertStation: source + externalId required');
  }
  const c = await stationsCol();
  const now = new Date().toISOString();
  await c.updateOne(
    { source: station.source, externalId: String(station.externalId) },
    {
      $set: {
        source:     station.source,
        externalId: String(station.externalId),
        name:       station.name ?? null,
        code:       station.code ?? null,
        label:      station.label ?? station.name ?? null,
        lat:        typeof station.lat === 'number' ? station.lat : null,
        lng:        typeof station.lng === 'number' ? station.lng : null,
        region:     station.region ?? null,
        parameters: Array.isArray(station.parameters) ? station.parameters : [],
        metadata:   station.metadata ?? {},
        updatedAt:  now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function bulkUpsertStations(stations) {
  for (const s of stations) {
    try {
      await upsertStation(s);
    } catch (e) {
      console.warn(`[stations] upsert ${s.source}:${s.externalId} failed:`, e.message);
    }
  }
}

export async function listStationsByRegion(region) {
  const c = await stationsCol();
  return c.find({ region }).toArray();
}

export async function listStationsBySource(region, source) {
  const c = await stationsCol();
  return c.find({ region, source }).toArray();
}

/**
 * Upsert a full timeseries for one (station, parameter).
 *
 * @param {object} obs - { source, externalId, parameter, parameterName?,
 *                         region, unit?, readings: [{timestamp, value}] }
 */
export async function upsertObservations(obs) {
  if (!obs || !obs.source || !obs.externalId || !obs.parameter) {
    throw new Error('upsertObservations: source + externalId + parameter required');
  }
  const c = await obsCol();
  const now = new Date().toISOString();
  const readings = Array.isArray(obs.readings)
    ? obs.readings.filter(r => r && r.timestamp != null && typeof r.value === 'number')
    : [];
  const first = readings.length ? readings[0].timestamp : null;
  const last  = readings.length ? readings[readings.length - 1].timestamp : null;
  await c.updateOne(
    { source: obs.source, externalId: String(obs.externalId), parameter: String(obs.parameter) },
    {
      $set: {
        source:        obs.source,
        externalId:    String(obs.externalId),
        parameter:     String(obs.parameter),
        parameterName: obs.parameterName ?? null,
        region:        obs.region ?? null,
        unit:          obs.unit ?? null,
        readings,
        count:         readings.length,
        firstAt:       first,
        lastAt:        last,
        updatedAt:     now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function getObservations(source, externalId, parameter) {
  const c = await obsCol();
  return c.findOne({ source, externalId: String(externalId), parameter: String(parameter) });
}

export async function listObservationsByRegion(region, source) {
  const c = await obsCol();
  const q = { region };
  if (source) q.source = source;
  return c.find(q).toArray();
}
