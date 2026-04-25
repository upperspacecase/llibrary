/**
 * Sensor snapshot — read-only view of the sensors + sensor_readings
 * collections for the v1 pipeline. The sensor ingest path (HMAC-signed
 * device POSTs to landbook-app/app/api/sensors/ingest) is unchanged;
 * we only read here.
 *
 * Each call returns the latest reading per metric across every sensor
 * of the requested type for the given landbook. Output shape mirrors a
 * normal pipeline source: a small, JSON-serialisable object.
 *
 * If MONGODB_URI is unset (e.g. capture-baseline), throws so the
 * orchestrator's withStage records a normal FETCH_EXCEPTION instead
 * of pretending the sensor source succeeded with empty data.
 */

let _resolveGetCollection;
const _getCollectionPromise = new Promise((resolve) => {
  _resolveGetCollection = resolve;
});

(async () => {
  try {
    const mod = await import('../../api/_db.js');
    _resolveGetCollection(mod.getCollection);
  } catch {
    _resolveGetCollection(null);
  }
})();

async function getCollection(name) {
  const fn = await _getCollectionPromise;
  if (!fn) throw new Error(`Mongo not configured for sensor read (${name})`);
  return fn(name);
}

/**
 * Return latest readings per metric for all sensors of a given type
 * attached to a landbook.
 *
 * @param {string} landbookId
 * @param {'weather' | 'water' | 'soil' | 'audio'} type
 */
export async function snapshotSensors(landbookId, type) {
  if (!landbookId) throw new Error('snapshotSensors: landbookId required');
  const sensorsCol = await getCollection('sensors');
  const readingsCol = await getCollection('sensor_readings');

  const sensors = await sensorsCol.find({ landbookId, type }).toArray();
  if (!sensors.length) {
    return { type, sensorCount: 0, latest: {}, sensorIds: [] };
  }

  const sensorIds = sensors.map((s) => s.id);
  const latest = {};
  for (const sensor of sensors) {
    const readings = await readingsCol
      .find({ sensorId: sensor.id })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    for (const reading of readings) {
      if (!reading.metric) continue;
      // Keep the freshest reading per metric across the whole sensor set.
      const existing = latest[reading.metric];
      const ts = new Date(reading.timestamp).getTime();
      if (!existing || ts > new Date(existing.timestamp).getTime()) {
        latest[reading.metric] = {
          value: reading.value,
          unit: reading.unit ?? null,
          timestamp: reading.timestamp,
          sensorId: sensor.id,
        };
      }
    }
  }

  return {
    type,
    sensorCount: sensors.length,
    sensorIds,
    latest,
  };
}
