/**
 * EFFIS — European Forest Fire Information System
 * Free WMS services. No API key needed.
 * https://effis.jrc.ec.europa.eu/applications/data-and-services
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

// EFFIS WMS base URL
export const EFFIS_WMS = 'https://maps.effis.emergency.copernicus.eu/effisgis/wms';

// Layer names verified against GetCapabilities on 2026-08-05. The previous
// values for fire danger and all-year burnt areas ('ecmwf.fwi', 'firms.hs')
// are not advertised by the server and returned LayerNotDefined.
export const LAYERS = {
  // Fire danger (Fire Weather Index). Display only — queryable=0.
  FIRE_DANGER: 'mf010.fwi',
  // Burnt-area perimeters, MODIS. Queryable, TIME dimension from 2000.
  BURNT_AREAS: 'modis.ba',
  BURNT_AREAS_POLY: 'modis.ba.poly',
  // Burnt-area perimeters, VIIRS near-real-time.
  BURNT_AREAS_NRT: 'effis.nrt.ba.poly',
  // Thermal hot spots — active detections, NOT burnt areas.
  HOTSPOTS: 'modis.hs',
  HOTSPOTS_ALL: 'all.hs',
};

export function getFireDangerWmsParams(layer = LAYERS.FIRE_DANGER) {
  return {
    layers: layer,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
}

/**
 * WMS params for burnt-area perimeters, optionally limited to a period.
 * @param {string} [time] TIME value, e.g. '2017' or '2000-01-01/2026-12-31'
 */
export function getBurntAreaWmsParams(time, layer = LAYERS.BURNT_AREAS) {
  const params = {
    layers: layer,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
  if (time) params.time = time;
  return params;
}

// ---------------------------------------------------------------------------
// Burnt areas
//
// EFFIS exposes no WFS, so the only way to enumerate perimeters is to sample
// GetFeatureInfo across a grid and dedupe by feature id. A fire is found when
// its polygon covers a grid point, so the step size sets the smallest fire
// reliably detected — 0.02° (~2 km) catches anything above roughly 400 ha.
// Tighten it for completeness, loosen it for speed; the cost is one HTTP
// request per point, which makes this an ingest job rather than a hot path.
// ---------------------------------------------------------------------------

const GML_FIELD = /<(\w+)>([^<]*)<\/\1>/g;
const NUMERIC = new Set([
  'AREA_HA', 'BROADLEA', 'CONIFER', 'MIXED', 'SCLEROPH', 'TRANSIT',
  'OTHERNATLC', 'AGRIAREAS', 'ARTIFSURF', 'OTHERLC', 'PERCNA2K',
]);

function parseBurntAreaGml(xml) {
  const out = [];
  // MapServer wraps each perimeter in <layername_feature>, and the layer name
  // contains dots ("modis.ba.poly_feature") — so the split must allow them.
  // Feature ids repeat across grid points and are deduped by the caller.
  for (const block of xml.split(/<[\w.]+_feature>/).slice(1)) {
    const rec = {};
    for (const m of block.matchAll(GML_FIELD)) {
      const [, key, raw] = m;
      if (key === 'gml' || key.startsWith('gml:')) continue;
      const val = raw.trim();
      if (!val) continue;
      rec[key] = NUMERIC.has(key) ? Number(val) : val;
    }
    if (rec.id != null && rec.AREA_HA != null) out.push(rec);
  }
  return out;
}

async function featureInfoAt(lat, lng, { layer, time, pad = 0.02 }) {
  const params = new URLSearchParams({
    service: 'WMS', version: '1.1.1', request: 'GetFeatureInfo',
    layers: layer, query_layers: layer, styles: '',
    bbox: `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`,
    width: '101', height: '101', srs: 'EPSG:4326',
    format: 'image/png', info_format: 'application/vnd.ogc.gml',
    x: '50', y: '50', feature_count: '10',
  });
  if (time) params.set('time', time);

  const res = await fetchWithPolicy(`${EFFIS_WMS}?${params}`, {}, {
    source: 'effis-burnt-areas', timeoutMs: 25000, accept: 'application/vnd.ogc.gml',
  });
  if (!res.ok) throw new Error(`EFFIS GetFeatureInfo HTTP ${res.status}`);
  return parseBurntAreaGml(await res.text());
}

/**
 * Burnt-area perimeters intersecting a bounding box.
 *
 * @param {number[]} bbox   [south, west, north, east]
 * @param {object}   [opts]
 * @param {string}   [opts.time]   TIME filter, default 2000 to now
 * @param {string}   [opts.layer]  defaults to the MODIS burnt-area layer
 * @param {number}   [opts.step]   grid spacing in degrees, default 0.02
 * @returns {Promise<Object[]>} records with FIREDATE, AREA_HA, COMMUNE, land-cover split
 */
export async function getBurntAreas(bbox, opts = {}) {
  const [south, west, north, east] = bbox;
  const {
    time = `2000-01-01/${new Date().toISOString().slice(0, 10)}`,
    layer = LAYERS.BURNT_AREAS,
    step = 0.02,
  } = opts;

  const byId = new Map();
  for (let lat = south; lat <= north; lat += step) {
    for (let lng = west; lng <= east; lng += step) {
      let recs;
      try {
        recs = await featureInfoAt(lat, lng, { layer, time });
      } catch {
        continue; // one dead grid point must not sink the whole sweep
      }
      for (const r of recs) if (!byId.has(r.id)) byId.set(r.id, r);
    }
  }

  return [...byId.values()].sort((a, b) => String(b.FIREDATE).localeCompare(String(a.FIREDATE)));
}

/** Roll burnt-area records up for display. */
export function summarizeBurntAreas(areas) {
  if (!areas?.length) {
    return { count: 0, totalHa: 0, largest: null, byYear: [], summary: 'No recorded burnt areas.' };
  }
  const year = (r) => String(r.FIREDATE).slice(0, 4);
  const totals = new Map();
  for (const r of areas) {
    const y = year(r);
    const t = totals.get(y) || { year: y, fires: 0, ha: 0 };
    t.fires += 1;
    t.ha += r.AREA_HA || 0;
    totals.set(y, t);
  }
  const largest = areas.reduce((a, b) => ((b.AREA_HA || 0) > (a.AREA_HA || 0) ? b : a));
  const totalHa = areas.reduce((s, r) => s + (r.AREA_HA || 0), 0);

  return {
    count: areas.length,
    totalHa: Math.round(totalHa),
    largest: { ha: largest.AREA_HA, date: largest.FIREDATE, commune: largest.COMMUNE },
    byYear: [...totals.values()]
      .map(t => ({ ...t, ha: Math.round(t.ha) }))
      .sort((a, b) => a.year.localeCompare(b.year)),
    summary: `${areas.length} recorded fire${areas.length === 1 ? '' : 's'}, ${Math.round(totalHa).toLocaleString()} ha burnt.`,
  };
}

// Fire danger levels based on FWI (Fire Weather Index)
export const FIRE_DANGER_LEVELS = {
  VERY_LOW: { min: 0, max: 5.2, label: 'Very Low', color: '#008000' },
  LOW: { min: 5.2, max: 11.2, label: 'Low', color: '#FFFF00' },
  MODERATE: { min: 11.2, max: 21.3, label: 'Moderate', color: '#FFA500' },
  HIGH: { min: 21.3, max: 38.0, label: 'High', color: '#FF0000' },
  VERY_HIGH: { min: 38.0, max: 50.0, label: 'Very High', color: '#800000' },
  EXTREME: { min: 50.0, max: Infinity, label: 'Extreme', color: '#4B0082' },
};

export function getFireDangerLevel(fwi) {
  for (const [, level] of Object.entries(FIRE_DANGER_LEVELS)) {
    if (fwi >= level.min && fwi < level.max) return level;
  }
  return FIRE_DANGER_LEVELS.VERY_LOW;
}

// Estimate fire risk based on location, temperature, and recent precipitation
export function estimateFireRisk(lat, lng, tempMax, recentPrecip, month) {
  let risk = 0;

  // Mediterranean regions have higher base fire risk
  if (lat >= 35 && lat <= 45 && lng >= -10 && lng <= 35) risk += 2;

  // Temperature factor
  if (tempMax > 35) risk += 3;
  else if (tempMax > 30) risk += 2;
  else if (tempMax > 25) risk += 1;

  // Precipitation factor (last 7 days)
  if (recentPrecip < 1) risk += 3;
  else if (recentPrecip < 5) risk += 2;
  else if (recentPrecip < 15) risk += 1;

  // Seasonal factor (June-September = peak fire season in Mediterranean)
  if (month >= 5 && month <= 8) risk += 2;
  else if (month >= 4 && month <= 9) risk += 1;

  // Map to levels
  if (risk >= 9) return { level: 'Extreme', color: '#4B0082', score: risk };
  if (risk >= 7) return { level: 'Very High', color: '#800000', score: risk };
  if (risk >= 5) return { level: 'High', color: '#FF0000', score: risk };
  if (risk >= 3) return { level: 'Moderate', color: '#FFA500', score: risk };
  if (risk >= 1) return { level: 'Low', color: '#FFFF00', score: risk };
  return { level: 'Very Low', color: '#008000', score: risk };
}
