/**
 * Data Pipeline Health Check — tests all external data sources using the
 * REAL pipeline fetcher functions (same code that runs per-landbook).
 *
 * POST /api/admin/pipeline              → test all
 * POST /api/admin/pipeline  { source }  → test one by id
 */

import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';
import { notifyError } from '../_notify.js';
import { SOURCE_REGISTRY } from '../../src/lib/source-registry.js';

// API fetch functions — same imports as refresh-source.js
import {
  getElevation,
  getForecast,
  getClimateAverages,
  getHistoricalWeather,
  getSolarWind,
} from '../../src/api/open-meteo.js';

import { getPollenIndex } from '../../src/api/google-pollen.js';
import { getSoilProperties, getSoilClassification } from '../../src/api/soilgrids.js';
import { getGeology } from '../../src/api/macrostrat.js';
import { getSpeciesCounts, getThreatenedSpecies } from '../../src/api/inaturalist.js';
import { getSpeciesOccurrences } from '../../src/api/gbif.js';
import { getFloodForecastWithHistory } from '../../src/api/flood.js';
import {
  getWaterFeatures,
  getInfrastructure,
  getProtectedAreas,
} from '../../src/api/overpass.js';
import { getActiveFiresNearby } from '../../src/api/nasa-firms.js';
import { fetchRiskScores } from '../../src/api/risk-scores.js';
import { getAdminUnit } from '../../src/api/dgt.js';
import { getForecast as getIPMAForecast, getNearestForecastLocation } from '../../src/api/ipma.js';
import { reverseGeocode } from '../../src/api/nominatim.js';
import { getLandCoverAtPoint, getMultiPointElevation } from '../../src/lib/report-data-pipeline.js';
import { fetchRegionalBaseline } from '../../src/lib/report-data-pipeline.js';

// ── Test coordinate: Odemira, Portugal ──────────────────────
const LAT = 37.5967;
const LNG = -8.6394;

// Synthetic boundary for bbox-dependent sources
const BOUNDARY = [
  [LAT - 0.01, LNG - 0.01],
  [LAT - 0.01, LNG + 0.01],
  [LAT + 0.01, LNG + 0.01],
  [LAT + 0.01, LNG - 0.01],
];
const CENTER = [LAT, LNG];
const BBOX = [LAT - 0.02, LNG - 0.02, LAT + 0.02, LNG + 0.02];

// ── Bio-diversity temporal windows ──────────────────────────
const currentYear = new Date().getFullYear();
const BIO_WINDOWS = [
  { d1: `${currentYear - 15}-01-01`, d2: `${currentYear - 10}-12-31` },
  { d1: `${currentYear - 10}-01-01`, d2: `${currentYear - 5}-12-31` },
  { d1: `${currentYear - 5}-01-01`, d2: `${currentYear}-12-31` },
];

// ── Fetch map: source key → () => Promise (same as real pipeline) ───
const endYear = currentYear - 1;
const startYear50 = endYear - 49;

const FETCH_MAP = {
  elevation:        () => getElevation(LAT, LNG),
  forecast:         () => getForecast(LAT, LNG),
  climate:          () => getClimateAverages(LAT, LNG),
  climateTrends:    () => getHistoricalWeather(LAT, LNG, `${startYear50}-01-01`, `${endYear}-12-31`),
  soilProps:        () => getSoilProperties(LAT, LNG),
  soilClass:        () => getSoilClassification(LAT, LNG),
  geology:          () => getGeology(LAT, LNG),
  species:          () => getSpeciesCounts(LAT, LNG),
  threatened:       () => getThreatenedSpecies(LAT, LNG),
  gbif:             () => getSpeciesOccurrences(LAT, LNG),
  flood:            () => getFloodForecastWithHistory(LAT, LNG),
  water:            () => getWaterFeatures(BBOX),
  infrastructure:   () => getInfrastructure(BBOX),
  protectedAreas:   () => getProtectedAreas(BBOX),
  activeFires:      () => getActiveFiresNearby(LAT, LNG, 50, 2),
  historicalFires:  () => getActiveFiresNearby(LAT, LNG, 25, 10),
  riskScores:       () => fetchRiskScores(LAT, LNG),
  admin:            () => getAdminUnit(LAT, LNG),
  ipmaLocation:     () => getNearestForecastLocation(LAT, LNG),
  terrainProfile:   () => getMultiPointElevation(BOUNDARY, CENTER),
  landCover:        () => getLandCoverAtPoint(LAT, LNG),
  nominatim:        () => reverseGeocode(LAT, LNG),
  solarWind:        () => getSolarWind(LAT, LNG),
  pollen:           () => getPollenIndex(LAT, LNG),
  regionalBaseline: () => fetchRegionalBaseline(LAT, LNG),
  speciesWindow0:   () => getSpeciesCounts(LAT, LNG, 15, { d1: BIO_WINDOWS[0].d1, d2: BIO_WINDOWS[0].d2 }),
  speciesWindow1:   () => getSpeciesCounts(LAT, LNG, 15, { d1: BIO_WINDOWS[1].d1, d2: BIO_WINDOWS[1].d2 }),
  speciesWindow2:   () => getSpeciesCounts(LAT, LNG, 15, { d1: BIO_WINDOWS[2].d1, d2: BIO_WINDOWS[2].d2 }),
  // ipmaForecast handled separately (depends on ipmaLocation result)
};

// ── UI metadata per source (feeds, scope, auth) ─────────────
const SOURCE_META = {
  elevation:        { feeds: ['Terrain tab'], scope: 'global', auth: 'open' },
  forecast:         { feeds: ['Climate tab', 'Dashboard weather', 'Report'], scope: 'global', auth: 'open' },
  climate:          { feeds: ['Climate averages', 'Report'], scope: 'global', auth: 'open' },
  climateTrends:    { feeds: ['50yr climate trends', 'Report'], scope: 'global', auth: 'open' },
  soilProps:        { feeds: ['Terrain tab soil panel', 'Report'], scope: 'global', auth: 'open' },
  soilClass:        { feeds: ['Terrain tab WRB class'], scope: 'global', auth: 'open' },
  geology:          { feeds: ['Terrain tab geology', 'Report'], scope: 'global', auth: 'open' },
  species:          { feeds: ['Ecosystem tab species', 'Report'], scope: 'global', auth: 'open' },
  threatened:       { feeds: ['Threatened species', 'Report'], scope: 'global', auth: 'open' },
  gbif:             { feeds: ['Ecosystem tab occurrences', 'Report'], scope: 'global', auth: 'open' },
  flood:            { feeds: ['Flood discharge alert', 'Risk scores'], scope: 'global', auth: 'open' },
  water:            { feeds: ['Water features map'], scope: 'global', auth: 'open' },
  infrastructure:   { feeds: ['Infrastructure map'], scope: 'global', auth: 'open' },
  protectedAreas:   { feeds: ['Protected areas map'], scope: 'global', auth: 'open' },
  activeFires:      { feeds: ['Active fire alerts', 'Dashboard'], scope: 'global', auth: 'api-key', needsKey: 'VITE_FIRMS_KEY' },
  historicalFires:  { feeds: ['Historical fire analysis', 'Report'], scope: 'global', auth: 'api-key', needsKey: 'VITE_FIRMS_KEY' },
  riskScores:       { feeds: ['Dashboard risk cards', 'KPI scores'], scope: 'global', auth: 'open', notes: 'Composite score derived from Open-Meteo forecast data' },
  admin:            { feeds: ['Admin boundaries', 'Parish/municipality lookup'], scope: 'portugal', auth: 'open' },
  ipmaLocation:     { feeds: ['IPMA forecast location'], scope: 'portugal', auth: 'open' },
  ipmaForecast:     { feeds: ['Portuguese weather forecast'], scope: 'portugal', auth: 'open', notes: 'Depends on ipmaLocation' },
  terrainProfile:   { feeds: ['Multi-point elevation profile'], scope: 'global', auth: 'open' },
  landCover:        { feeds: ['CORINE land cover', 'Report'], scope: 'europe', auth: 'open' },
  nominatim:        { feeds: ['Reverse geocode', 'Location context'], scope: 'global', auth: 'open' },
  solarWind:        { feeds: ['Solar & wind potential', 'Report'], scope: 'global', auth: 'open' },
  pollen:           { feeds: ['Pollen index', 'Report'], scope: 'global', auth: 'open', needsKey: 'GOOGLE_POLLEN_KEY' },
  regionalBaseline: { feeds: ['Regional comparison baseline'], scope: 'global', auth: 'open', notes: 'Makes 16 API calls (8 sample points)' },
  speciesWindow0:   { feeds: ['Species trend window 1'], scope: 'global', auth: 'open' },
  speciesWindow1:   { feeds: ['Species trend window 2'], scope: 'global', auth: 'open' },
  speciesWindow2:   { feeds: ['Species trend window 3'], scope: 'global', auth: 'open' },
};

// ── Extra sources: used by the app but NOT in the data pipeline ─────
const EXTRA_SOURCES = [
  {
    id: 'mapbox-geocode',
    name: 'Mapbox Geocode',
    feeds: ['Address search', 'Postcode lookup', 'Create landbook'],
    scope: 'global',
    auth: 'env',
    needsKey: 'VITE_MAPBOX_TOKEN',
    test: () => {
      const key = process.env.VITE_MAPBOX_TOKEN;
      if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_MAPBOX_TOKEN)' });
      return probe(`https://api.mapbox.com/geocoding/v5/mapbox.places/${LNG},${LAT}.json?access_token=${key}&types=place&limit=1`);
    },
  },
  {
    id: 'mapbox-static',
    name: 'Mapbox Static Maps',
    feeds: ['Report satellite maps', 'Report topography maps'],
    scope: 'global',
    auth: 'env',
    needsKey: 'VITE_MAPBOX_TOKEN',
    test: () => {
      const key = process.env.VITE_MAPBOX_TOKEN;
      if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_MAPBOX_TOKEN)' });
      return probe(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${LNG},${LAT},10,0/200x200@2x?access_token=${key}`);
    },
  },
  {
    id: 'effis',
    name: 'EFFIS Fire Danger WMS',
    feeds: ['Fire danger map layer', 'Report'],
    scope: 'europe',
    auth: 'open',
    test: () => probe('https://maps.effis.emergency.copernicus.eu/effisgis/wms?SERVICE=WMS&REQUEST=GetCapabilities'),
  },
  {
    id: 'natura2000',
    name: 'Natura 2000 WMS',
    feeds: ['Protected areas map layer'],
    scope: 'europe',
    auth: 'open',
    test: () => probe('https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities'),
  },
  {
    id: 'worldcover',
    name: 'ESA WorldCover WMS',
    feeds: ['WorldCover map layer'],
    scope: 'global',
    auth: 'open',
    test: () => probe('https://services.terrascope.be/wms/v2?SERVICE=WMS&REQUEST=GetCapabilities'),
  },
  {
    id: 'sentinel2',
    name: 'Sentinel-2 Cloudless Tiles',
    feeds: ['Satellite basemap'],
    scope: 'global',
    auth: 'open',
    test: () => probe('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/5/15/15.jpg'),
  },
];

// ── Helpers ─────────────────────────────────────────────────

async function timedSafe(label, fn) {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, status: 200, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start, error: err.message };
  }
}

async function probe(url, headers = {}, timeout = 10000) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { ...headers },
    });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return { ok: false, status: 0, ms: Date.now() - start, error: isTimeout ? 'Timeout' : err.message };
  }
}

function buildPipelineResult(sourceKey, testResult) {
  const reg = SOURCE_REGISTRY[sourceKey] || {};
  const meta = SOURCE_META[sourceKey] || {};
  return {
    id: sourceKey,
    name: reg.label || sourceKey,
    feeds: meta.feeds || [],
    scope: meta.scope || 'global',
    auth: meta.auth || 'open',
    notes: meta.notes || null,
    needsKey: meta.needsKey || null,
    ...testResult,
  };
}

function buildExtraResult(entry, testResult) {
  return {
    id: entry.id,
    name: entry.name,
    feeds: entry.feeds,
    scope: entry.scope,
    auth: entry.auth,
    notes: entry.notes || null,
    needsKey: entry.needsKey || null,
    ...testResult,
  };
}

// ── Handler ─────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAdmin(req, res)) return;

  const { source } = req.body || {};

  // Single source re-test
  if (source) {
    let result;

    // Check pipeline sources first
    if (FETCH_MAP[source]) {
      result = buildPipelineResult(source, await timedSafe(source, FETCH_MAP[source]));
    } else if (source === 'ipmaForecast') {
      // ipmaForecast needs ipmaLocation first
      const locResult = await timedSafe('ipmaLocation', FETCH_MAP.ipmaLocation);
      let forecastResult;
      if (locResult.ok) {
        try {
          const locData = await getNearestForecastLocation(LAT, LNG);
          forecastResult = await timedSafe('ipmaForecast', () => getIPMAForecast(locData.globalIdLocal));
        } catch {
          forecastResult = { ok: false, status: 0, ms: 0, error: 'ipmaLocation prerequisite failed' };
        }
      } else {
        forecastResult = { ok: false, status: 0, ms: 0, error: 'ipmaLocation prerequisite failed' };
      }
      result = buildPipelineResult('ipmaForecast', forecastResult);
    } else {
      // Check extra sources
      const extra = EXTRA_SOURCES.find(s => s.id === source);
      if (!extra) return res.status(404).json({ error: 'Unknown source' });
      result = buildExtraResult(extra, await extra.test());
    }

    // Persist single re-test
    try {
      const col = await getCollection('pipeline_results');
      await col.updateOne(
        { sourceId: result.id },
        { $set: { ...result, sourceId: result.id, testedAt: new Date().toISOString() } },
        { upsert: true },
      );
    } catch (err) {
      console.error('Pipeline persist error:', err);
      notifyError({ endpoint: '/api/admin/pipeline', method: 'POST', action: 'persist pipeline result' }, err);
    }

    return res.json(result);
  }

  // ── Test all sources ────────────────────────────────────
  const testedAt = new Date().toISOString();
  const results = [];

  // Phase 1: Run all pipeline sources in parallel (except ipmaForecast)
  const pipelineKeys = Object.keys(FETCH_MAP);
  const pipelineResults = await Promise.all(
    pipelineKeys.map(async (key) => {
      const testResult = await timedSafe(key, FETCH_MAP[key]);
      return buildPipelineResult(key, testResult);
    })
  );
  results.push(...pipelineResults);

  // Phase 2: ipmaForecast (depends on ipmaLocation)
  const ipmaLocResult = pipelineResults.find(r => r.id === 'ipmaLocation');
  let ipmaForecastResult;
  if (ipmaLocResult?.ok) {
    try {
      const locData = await getNearestForecastLocation(LAT, LNG);
      ipmaForecastResult = await timedSafe('ipmaForecast', () => getIPMAForecast(locData.globalIdLocal));
    } catch {
      ipmaForecastResult = { ok: false, status: 0, ms: 0, error: 'ipmaLocation data unavailable' };
    }
  } else {
    ipmaForecastResult = { ok: false, status: 0, ms: 0, error: 'ipmaLocation prerequisite failed' };
  }
  results.push(buildPipelineResult('ipmaForecast', ipmaForecastResult));

  // Phase 3: Run extra sources in parallel
  const extraResults = await Promise.all(
    EXTRA_SOURCES.map(async (entry) => buildExtraResult(entry, await entry.test()))
  );
  results.push(...extraResults);

  // Persist full run to DB
  try {
    const col = await getCollection('pipeline_results');
    const ops = results.map(r => ({
      updateOne: {
        filter: { sourceId: r.id },
        update: { $set: { ...r, sourceId: r.id, testedAt } },
        upsert: true,
      },
    }));
    await col.bulkWrite(ops);
  } catch (err) {
    console.error('Pipeline persist error:', err);
    notifyError({ endpoint: '/api/admin/pipeline', method: 'POST', action: 'bulkWrite pipeline results' }, err);
  }

  return res.json({ sources: results, testedAt });
}
