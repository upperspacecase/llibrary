/**
 * Landbook Status
 *
 * Computes and writes a lightweight status summary onto the landbook document.
 * Tracks whether narratives are stale relative to the current facts.
 */

import { getCollection } from '../../api/_db.js';
import { getFacts } from './fact-store.js';
import { getLatestReport } from './report-store.js';

/**
 * Recompute and persist the landbook status object.
 *
 * @param {string} landbookId
 * @returns {Promise<Object>} the computed status
 */
export async function updateLandbookStatus(landbookId) {
  const [factDoc, reportDoc] = await Promise.all([
    getFacts(landbookId),
    getLatestReport(landbookId),
  ]);

  const factsContentHash = factDoc?.contentHash || null;
  const reportFactsHash = reportDoc?.factsContentHash || null;

  const status = {
    factsContentHash,
    factsUpdatedAt: factDoc?.updatedAt || null,
    latestReportVersion: reportDoc?.version || null,
    reportFactsHash,
    narrativesStale: !reportDoc || factsContentHash !== reportFactsHash,
    updatedAt: new Date().toISOString(),
  };

  // Write to whichever collection holds this landbook
  const landbooks = await getCollection('landbooks');
  const result = await landbooks.findOneAndUpdate(
    { id: landbookId },
    { $set: { status } }
  );

  if (!result) {
    const submissions = await getCollection('submissions');
    await submissions.findOneAndUpdate(
      { id: landbookId },
      { $set: { status } }
    );
  }

  return status;
}
