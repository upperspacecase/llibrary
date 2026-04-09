/**
 * Observation Store
 *
 * CRUD for the `observations` collection.
 * One document per (landbookId, source) pair.
 */

import { getCollection } from '../../api/_db.js';
import { SOURCE_REGISTRY, isStale } from './source-registry.js';

const COLLECTION = 'observations';

let indexEnsured = false;

async function col() {
  const c = await getCollection(COLLECTION);
  if (!indexEnsured) {
    await c.createIndex({ landbookId: 1, source: 1 }, { unique: true }).catch(() => {});
    indexEnsured = true;
  }
  return c;
}

/**
 * Upsert a single observation.
 * @param {string} landbookId
 * @param {string} source - key from SOURCE_REGISTRY (e.g. "soilProps")
 * @param {{ ok: boolean, data?: any, error?: string }} result - from safe() wrapper
 */
export async function saveObservation(landbookId, source, result) {
  const meta = SOURCE_REGISTRY[source] || {};
  const c = await col();
  await c.updateOne(
    { landbookId, source },
    {
      $set: {
        landbookId,
        source,
        fetchedAt: new Date().toISOString(),
        status: result.ok ? 'ok' : 'error',
        raw: result.ok ? result.data : null,
        error: result.ok ? null : (result.error || 'unknown'),
        confidence: result.ok ? 'high' : 'missing',
        ttl: meta.ttl || 86400,
        group: meta.group || null,
        label: meta.label || source,
      },
    },
    { upsert: true }
  );
}

/**
 * Save all observations from a fetchAllData results object in bulk.
 * @param {string} landbookId
 * @param {Object} results - keyed by source name, values are { ok, data, error }
 */
export async function saveAllObservations(landbookId, results) {
  const c = await col();
  const ops = Object.entries(results).map(([source, result]) => {
    const meta = SOURCE_REGISTRY[source] || {};
    return {
      updateOne: {
        filter: { landbookId, source },
        update: {
          $set: {
            landbookId,
            source,
            fetchedAt: new Date().toISOString(),
            status: result.ok ? 'ok' : 'error',
            raw: result.ok ? result.data : null,
            error: result.ok ? null : (result.error || 'unknown'),
            confidence: result.ok ? 'high' : 'missing',
            ttl: meta.ttl || 86400,
            group: meta.group || null,
            label: meta.label || source,
          },
        },
        upsert: true,
      },
    };
  });
  if (ops.length > 0) {
    await c.bulkWrite(ops, { ordered: false });
  }
}

/**
 * Get all observations for a landbook.
 * @param {string} landbookId
 * @returns {Promise<Array>}
 */
export async function getObservations(landbookId) {
  const c = await col();
  return c.find({ landbookId }).toArray();
}

/**
 * Get a single observation.
 * @param {string} landbookId
 * @param {string} source
 */
export async function getObservation(landbookId, source) {
  const c = await col();
  return c.findOne({ landbookId, source });
}

/**
 * Get observations that are past their TTL.
 * @param {string} landbookId
 * @returns {Promise<Array>} stale observation documents
 */
export async function getStaleObservations(landbookId) {
  const all = await getObservations(landbookId);
  return all.filter(obs => isStale(obs.source, obs.fetchedAt));
}

/**
 * Delete all observations for a landbook.
 * @param {string} landbookId
 */
export async function deleteObservations(landbookId) {
  const c = await col();
  await c.deleteMany({ landbookId });
}
