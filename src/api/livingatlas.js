/**
 * Esri Living Atlas — Sentinel-2 10m Annual Land Cover Time Series.
 * https://livingatlas.arcgis.com/landcover/
 *
 * Calls computeHistograms once per year (2017–latest) against the
 * passed-in polygon to count pixels per LULC class. The pixelSize is
 * in *degrees* (the polygon is sent in WGS84), so the cell size
 * adapts to whatever resolution stays under the per-request budget.
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

const IMAGE_SERVER =
  'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer';

// LULC bin index → label. Source: the service's `legend` endpoint.
const CLASS_BY_BIN = {
  1: 'Water',
  2: 'Trees',
  4: 'Flooded Vegetation',
  5: 'Crops',
  7: 'Built Area',
  8: 'Bare Ground',
  9: 'Snow/Ice',
  10: 'Clouds',
  11: 'Rangeland',
};

const FIRST_YEAR = 2017;

function ringsFromBoundary(boundary) {
  // Pipeline boundary is [lat, lng] pairs; Esri rings are [lng, lat].
  if (!Array.isArray(boundary) || boundary.length < 3) return null;
  const ring = boundary.map(([la, ln]) => [ln, la]);
  // Close if not closed
  const [a, b] = ring[0];
  const [c, d] = ring[ring.length - 1];
  if (a !== c || b !== d) ring.push([a, b]);
  return [ring];
}

async function computeHistogramForYear(geometry, objectId, pixelSizeDeg) {
  const body = new URLSearchParams();
  body.set('geometry', JSON.stringify(geometry));
  body.set('geometryType', 'esriGeometryPolygon');
  body.set('mosaicRule', JSON.stringify({
    mosaicMethod: 'esriMosaicLockRaster',
    lockRasterIds: [objectId],
  }));
  body.set('pixelSize', JSON.stringify({
    x: pixelSizeDeg, y: pixelSizeDeg,
    spatialReference: { wkid: 4326 },
  }));
  body.set('f', 'json');

  const res = await fetchWithPolicy(`${IMAGE_SERVER}/computeHistograms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, { source: 'livingatlas-histograms', timeoutMs: 30000, accept: 'application/json' });
  if (!res.ok) throw new Error(`Living Atlas histogram HTTP ${res.status}`);
  const data = await res.json();
  const counts = data?.histograms?.[0]?.counts || [];
  return counts;
}

async function listRasterIdsByYear() {
  const res = await fetchWithPolicy(
    `${IMAGE_SERVER}/query?where=1%3D1&outFields=OBJECTID,Name&returnGeometry=false&f=json`,
    {},
    { source: 'livingatlas-catalog', timeoutMs: 15000, accept: 'application/json' },
  );
  if (!res.ok) throw new Error(`Living Atlas catalog HTTP ${res.status}`);
  const data = await res.json();
  const out = {};
  for (const f of (data.features || [])) {
    const m = /(\d{4})$/.exec(f.attributes?.Name || '');
    if (m) out[Number(m[1])] = f.attributes.OBJECTID;
  }
  return out;
}

/**
 * Land-cover time series across the polygon. Returns:
 * { years: [{ year, classes: { Water: pct, Trees: pct, ... }, totalPx }], pixelSizeDeg }
 */
export async function getLandCoverTimeSeries(boundary) {
  const rings = ringsFromBoundary(boundary);
  if (!rings) throw new Error('Living Atlas: invalid boundary');
  const geometry = { rings, spatialReference: { wkid: 4326 } };

  // For polygons up to ~50km wide, 0.0005° (~50m) keeps requests under the
  // server's image-size cap. Larger bboxes step up to coarser sampling.
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  const span = Math.max(Math.max(...lats) - Math.min(...lats),
                       Math.max(...lngs) - Math.min(...lngs));
  let pixelSizeDeg = 0.0005;
  if (span > 0.5) pixelSizeDeg = 0.001;
  if (span > 1.0) pixelSizeDeg = 0.002;

  const idsByYear = await listRasterIdsByYear();
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = FIRST_YEAR; y <= currentYear; y++) {
    if (idsByYear[y] != null) years.push({ year: y, objectId: idsByYear[y] });
  }
  if (!years.length) throw new Error('Living Atlas: no annual rasters found');

  // Serial — Esri's ImageServer 429s easily on parallel histogram calls.
  const out = [];
  for (const { year, objectId } of years) {
    try {
      const counts = await computeHistogramForYear(geometry, objectId, pixelSizeDeg);
      let total = 0;
      const classes = {};
      for (const [binStr, label] of Object.entries(CLASS_BY_BIN)) {
        const c = counts[Number(binStr)] || 0;
        classes[label] = c;
        total += c;
      }
      if (total === 0) continue;
      // Convert counts to percentages so the time series doesn't drift with
      // sampling resolution. Rounded to 0.1.
      const pct = {};
      for (const [k, v] of Object.entries(classes)) {
        pct[k] = +((v / total) * 100).toFixed(1);
      }
      out.push({ year, classes: pct, totalPx: total });
    } catch (err) {
      console.warn(`[livingatlas] ${year} failed:`, err.message);
    }
  }
  return { years: out, pixelSizeDeg };
}
