/**
 * POST /api/landbooks/:id/refresh-source
 *
 * Refresh a single API source (or all sources in a group) without re-running
 * the entire pipeline. Updates the observation, rebuilds facts, and updates
 * the landbook.data blob.
 *
 * Body: { source: "soilProps" }  OR  { group: "climate" }
 */

import { getCollection } from '../../_db.js';
import { SOURCE_REGISTRY, sourcesByGroup } from '../../../src/lib/source-registry.js';
import { saveObservation } from '../../../src/lib/observation-store.js';
import { rebuildFacts } from '../../../src/lib/fact-builder.js';

// API fetch functions — same imports as report-data-pipeline.js
import {
  getElevation,
  getForecast,
  getClimateAverages,
  getHistoricalWeather,
  getSolarWind,
} from '../../../src/api/open-meteo.js';

import { getPollenIndex } from '../../../src/api/google-pollen.js';
import { getSoilProperties, getSoilClassification } from '../../../src/api/soilgrids.js';
import { getGeology } from '../../../src/api/macrostrat.js';
import { getSpeciesCounts, getThreatenedSpecies } from '../../../src/api/inaturalist.js';
import { getSpeciesOccurrences } from '../../../src/api/gbif.js';
import { getFloodForecastWithHistory } from '../../../src/api/flood.js';
import {
  getWaterFeatures,
  getInfrastructure,
  getProtectedAreas,
} from '../../../src/api/overpass.js';
import { getActiveFiresNearby } from '../../../src/api/nasa-firms.js';
import { fetchRiskScores } from '../../../src/api/risk-scores.js';
import { getAdminUnit } from '../../../src/api/dgt.js';
import { getForecast as getIPMAForecast, getNearestForecastLocation } from '../../../src/api/ipma.js';
import { reverseGeocode } from '../../../src/api/nominatim.js';

async function safe(label, fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    console.warn(`[refresh-source] ${label} failed:`, error.message);
    return { ok: false, error: error.message };
  }
}

function getBbox(boundary, padding = 0.02) {
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  return [
    Math.min(...lats) - padding,
    Math.min(...lngs) - padding,
    Math.max(...lats) + padding,
    Math.max(...lngs) + padding,
  ];
}

/**
 * Map a source key to its fetch function.
 * Returns an async function that takes (lat, lng, boundary, areaHa) and returns the API result.
 */
function getFetchFn(source, lat, lng, boundary) {
  const bbox = boundary.length >= 3 ? getBbox(boundary) : null;
  const endYear = new Date().getFullYear() - 1;
  const startYear50 = endYear - 49;

  const currentYear = new Date().getFullYear();
  const bioWindows = [
    { d1: `${currentYear - 15}-01-01`, d2: `${currentYear - 10}-12-31` },
    { d1: `${currentYear - 10}-01-01`, d2: `${currentYear - 5}-12-31` },
    { d1: `${currentYear - 5}-01-01`, d2: `${currentYear}-12-31` },
  ];

  const map = {
    elevation: () => getElevation(lat, lng),
    forecast: () => getForecast(lat, lng),
    climate: () => getClimateAverages(lat, lng),
    climateTrends: () => getHistoricalWeather(lat, lng, `${startYear50}-01-01`, `${endYear}-12-31`),
    soilProps: () => getSoilProperties(lat, lng),
    soilClass: () => getSoilClassification(lat, lng),
    geology: () => getGeology(lat, lng),
    species: () => getSpeciesCounts(lat, lng),
    threatened: () => getThreatenedSpecies(lat, lng),
    gbif: () => getSpeciesOccurrences(lat, lng),
    flood: () => getFloodForecastWithHistory(lat, lng),
    water: bbox ? () => getWaterFeatures(bbox) : null,
    infrastructure: bbox ? () => getInfrastructure(bbox) : null,
    protectedAreas: bbox ? () => getProtectedAreas(bbox) : null,
    activeFires: () => getActiveFiresNearby(lat, lng, 50, 2),
    historicalFires: () => getActiveFiresNearby(lat, lng, 25, 10),
    riskScores: () => fetchRiskScores(lat, lng),
    admin: () => getAdminUnit(lat, lng),
    ipmaLocation: () => getNearestForecastLocation(lat, lng),
    landCover: null, // inline WMS call in pipeline, not easily extracted
    nominatim: () => reverseGeocode(lat, lng),
    solarWind: () => getSolarWind(lat, lng),
    pollen: () => getPollenIndex(lat, lng),
    speciesWindow0: () => getSpeciesCounts(lat, lng, 15, { d1: bioWindows[0].d1, d2: bioWindows[0].d2 }),
    speciesWindow1: () => getSpeciesCounts(lat, lng, 15, { d1: bioWindows[1].d1, d2: bioWindows[1].d2 }),
    speciesWindow2: () => getSpeciesCounts(lat, lng, 15, { d1: bioWindows[2].d1, d2: bioWindows[2].d2 }),
  };

  return map[source] || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { source, group } = req.body || {};

  if (!source && !group) {
    return res.status(400).json({ error: 'Must specify source or group' });
  }

  try {
    // 1. Load landbook for coordinates
    const landbooks = await getCollection('landbooks');
    let landbook = await landbooks.findOne({ id });

    if (!landbook) {
      const submissions = await getCollection('submissions');
      landbook = await submissions.findOne({ id });
      if (landbook) landbook.address = landbook.address || landbook.postcode || '';
    }

    if (!landbook) {
      return res.status(404).json({ error: 'Landbook not found' });
    }

    const center = landbook.center;
    const boundary = landbook.boundary || [];
    const lat = Array.isArray(center) ? center[0] : center?.lat;
    const lng = Array.isArray(center) ? center[1] : center?.lng;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Landbook has no coordinates' });
    }

    // 2. Determine which sources to refresh
    let sources;
    if (source) {
      if (!SOURCE_REGISTRY[source]) {
        return res.status(400).json({ error: `Unknown source: ${source}` });
      }
      sources = [source];
    } else {
      sources = sourcesByGroup(group);
      if (sources.length === 0) {
        return res.status(400).json({ error: `Unknown group: ${group}` });
      }
    }

    // 3. Fetch and save observations
    const results = {};
    for (const src of sources) {
      const fetchFn = getFetchFn(src, lat, lng, boundary);
      if (!fetchFn) {
        results[src] = { ok: false, error: 'No fetch function available' };
        continue;
      }
      const result = await safe(src, fetchFn);
      results[src] = result;
      await saveObservation(id, src, result);
    }

    // 4. Rebuild facts from all observations
    const data = await rebuildFacts(id);

    return res.status(200).json({
      ok: true,
      refreshed: Object.keys(results),
      results: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, { ok: v.ok, error: v.error || null }])
      ),
    });
  } catch (error) {
    console.error('[refresh-source] Error:', error);
    return res.status(500).json({ error: error.message || 'Refresh failed' });
  }
}
