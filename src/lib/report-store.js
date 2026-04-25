/**
 * Report Store
 *
 * CRUD for the `reports` collection.
 * One versioned document per narrative generation per landbook.
 */

import { getCollection } from '../../api/_db.js';

const COLLECTION = 'reports';

let indexEnsured = false;

async function col() {
  const c = await getCollection(COLLECTION);
  if (!indexEnsured) {
    await c.createIndex({ landbookId: 1, version: -1 }).catch(() => {});
    indexEnsured = true;
  }
  return c;
}

/**
 * Save a new report version.
 * Auto-increments version based on the latest existing version for this landbook.
 *
 * @param {string} landbookId
 * @param {Object} report - { narratives, scores, model?, cost? }
 * @returns {Promise<Object>} the saved document
 */
export async function saveReport(landbookId, report) {
  const c = await col();
  const latest = await c.findOne({ landbookId }, { sort: { version: -1 }, projection: { version: 1 } });
  const nextVersion = (latest?.version || 0) + 1;

  const doc = {
    landbookId,
    version: nextVersion,
    generatedAt: new Date().toISOString(),
    narratives: report.narratives || {},
    scores: report.scores || {},
    factSnapshotVersion: report.factSnapshotVersion || null,
    factsContentHash: report.factsContentHash || null,
    model: report.model || null,
    promptVersion: report.promptVersion || null,
    cost: report.cost || null,
    runId: report.runId || null,
    narrativesStatus: report.narrativesStatus || (report.narratives && Object.keys(report.narratives).length > 0 ? 'ok' : 'empty'),
    narrativesError: report.narrativesError || null,
    narrativesErrorCode: report.narrativesErrorCode || null,
  };

  await c.insertOne(doc);
  return doc;
}

/**
 * Get the latest report for a landbook.
 * @param {string} landbookId
 * @returns {Promise<Object|null>}
 */
export async function getLatestReport(landbookId) {
  const c = await col();
  return c.findOne({ landbookId }, { sort: { version: -1 } });
}

/**
 * Get a specific report version.
 * @param {string} landbookId
 * @param {number} version
 * @returns {Promise<Object|null>}
 */
export async function getReport(landbookId, version) {
  const c = await col();
  return c.findOne({ landbookId, version });
}

/**
 * Get all report versions for a landbook.
 * @param {string} landbookId
 * @returns {Promise<Array>}
 */
export async function getReportHistory(landbookId) {
  const c = await col();
  return c.find({ landbookId }).sort({ version: -1 }).toArray();
}

/**
 * Delete all reports for a landbook.
 * @param {string} landbookId
 */
export async function deleteReports(landbookId) {
  const c = await col();
  await c.deleteMany({ landbookId });
}
