/**
 * Fact Builder
 *
 * Rebuilds facts from stored observations — the key architectural unlock.
 * Instead of re-fetching 26+ APIs, loads cached observations and runs
 * the existing processRawData() over them.
 */

import { getObservations } from './observation-store.js';
import { saveFacts, reportDataToFacts } from './fact-store.js';
import { processRawData, buildMapUrls } from './report-data-pipeline.js';
import { resolvePropertyName } from './property-name.js';
import { getCollection } from '../../api/_db.js';

/**
 * Rebuild facts for a landbook from stored observations.
 *
 * 1. Load all observations from the observations collection
 * 2. Reconstruct the `results` object that processRawData expects
 * 3. Call processRawData() — reusing the existing normalization logic
 * 4. Convert to fact ontology and save
 * 5. Update landbook.data with the rebuilt ReportData
 *
 * @param {string} landbookId
 * @param {Object} [options]
 * @param {boolean} [options.updateBlob=true] - Also update landbook.data blob
 * @returns {Promise<Object>} The assembled ReportData
 */
export async function rebuildFacts(landbookId, options = {}) {
  const { updateBlob = true } = options;

  // 1. Load the landbook for submission metadata
  const landbooks = await getCollection('landbooks');
  let landbook = await landbooks.findOne({ id: landbookId });
  let collection = landbooks;

  if (!landbook) {
    const submissions = await getCollection('submissions');
    landbook = await submissions.findOne({ id: landbookId });
    collection = submissions;
    if (landbook) landbook.address = landbook.address || landbook.postcode || '';
  }

  if (!landbook) throw new Error(`Landbook ${landbookId} not found`);

  const center = landbook.center;
  const boundary = landbook.boundary || [];
  const lat = Array.isArray(center) ? center[0] : center?.lat;
  const lng = Array.isArray(center) ? center[1] : center?.lng;
  const areaM2 = landbook.area || 0;
  const areaHa = areaM2 > 10000 ? areaM2 / 10000 : areaM2;

  // 2. Load all observations
  const observations = await getObservations(landbookId);

  // 3. Reconstruct the results object
  const raw = {};
  for (const obs of observations) {
    if (obs.status === 'ok') {
      raw[obs.source] = { ok: true, data: obs.raw };
    } else {
      raw[obs.source] = { ok: false, error: obs.error || 'unknown' };
    }
  }

  // 4. Run existing normalization
  const submission = {
    name: resolvePropertyName(landbook),
    address: landbook.address || '',
    coords: [lat, lng],
    boundary,
  };

  const data = await processRawData(raw, submission, areaHa);

  // 5. Save to facts collection
  await saveFacts(landbookId, reportDataToFacts(data));

  // 6. Optionally update the blob
  if (updateBlob) {
    // Preserve existing narratives if any
    const existingData = landbook.data || {};
    if (existingData.narratives && Object.keys(existingData.narratives).length > 0) {
      data.narratives = existingData.narratives;
    }

    await collection.findOneAndUpdate(
      { id: landbookId },
      {
        $set: {
          data,
          dataUpdated: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      }
    );
  }

  return data;
}
