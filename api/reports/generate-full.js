import { getCollection } from '../_db.js';
import { put } from '@vercel/blob';

const SITE_ORIGIN = 'https://llibrary-eight.vercel.app';

// ── Synthetic data helper ─────────────────────────────
// Wraps content in red-highlighted block for audit visibility
function synthetic(content, sourceNote) {
  return `<div class="synthetic-block">
    <div class="synthetic-badge">Synthetic Data</div>
    <div class="synthetic-content">${content}</div>
    <div class="synthetic-source">Where to get real data: ${sourceNote}</div>
  </div>`;
}

function syntheticKpi(value, label, sub, sourceNote) {
  return `<div class="kpi-card synthetic">
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-sub">${sub}</div>
    <div class="synthetic-source">${sourceNote}</div>
  </div>`;
}

function syntheticCell(value, sourceNote) {
  return `<td class="value synthetic" title="SYNTHETIC: ${sourceNote}">${value}</td>`;
}

function realKpi(value, label, sub) {
  return `<div class="kpi-card">
    <div class="kpi-value">${value}</div>
    <div class="kpi-label">${label}</div>
    <div class="kpi-sub">${sub}</div>
  </div>`;
}

// ── Reverse geocode helper ──────────────────────────────
async function reverseGeocode(lat, lng) {
  const token = process.env.VITE_MAPBOX_TOKEN;
  if (!token) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address,place,locality&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.features?.[0]?.place_name || null;
}

// ── Blob upload helper ──────────────────────────────────
async function uploadReportBlob(slug, innerHtml, version) {
  const fullHtml = buildFullPage(innerHtml, version);
  const blob = await put(`reports/full/${slug}.html`, fullHtml, {
    access: 'private',
    contentType: 'text/html; charset=utf-8',
    addRandomSuffix: false,
  });
  return blob.url;
}

function buildFullPage(htmlContent, version) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" sizes="32x32" href="${SITE_ORIGIN}/favicon-32x32.png">
  <title>LandBook Full Report — ${version}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{--green:#1B4332;--green-light:#2D6A4F;--green-pale:#D8F3DC;--terra:#BC6C25;--terra-light:#DDA15E;--sky:#90E0EF;--sky-dark:#0077B6;--amber:#F4A261;--red:#E76F51;--bg:#F8F6F2;--white:#FFFFFF;--text:#1a1a1a;--text-muted:#6b7280;--border:#e5e2db;--font:'Inter',-apple-system,sans-serif}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:var(--font);background:#e5e2db;color:var(--text);-webkit-font-smoothing:antialiased}
    #report-container{max-width:850px;margin:24px auto;padding:0 16px}
    .report-page{background:var(--white);border-radius:4px;box-shadow:0 1px 8px rgba(0,0,0,0.08);margin-bottom:24px;padding:56px 56px 48px;page-break-after:always}
    .section-number{font-size:11px;font-weight:700;color:var(--terra);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
    .section-title{font-size:26px;font-weight:800;color:var(--green);margin-bottom:8px;line-height:1.2}
    .section-subtitle{font-size:14px;color:var(--text-muted);margin-bottom:32px}
    h3{font-size:15px;font-weight:700;color:var(--green);margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--green-pale)}
    .data-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
    .data-table th{text-align:left;font-weight:600;font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;border-bottom:2px solid var(--border)}
    .data-table td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
    .data-table tr:last-child td{border-bottom:none}
    .data-table .label{color:var(--text-muted);font-weight:500}
    .data-table .value{font-weight:600}
    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:24px 0}
    .kpi-card{background:var(--bg);border-radius:10px;padding:20px 16px;text-align:center;border:1px solid var(--border)}
    .kpi-value{font-size:28px;font-weight:800;color:var(--green);line-height:1}
    .kpi-label{font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.5px;margin-top:8px}
    .kpi-sub{font-size:11px;color:var(--text-muted);margin-top:4px}
    .cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
    .card{background:var(--bg);border-radius:8px;padding:16px;border:1px solid var(--border);text-align:center}
    .card-icon{font-size:24px;margin-bottom:6px}
    .card-title{font-size:12px;font-weight:700;color:var(--green)}
    .risk-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
    .risk-row:last-child{border-bottom:none}
    .risk-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
    .risk-dot.low{background:#22c55e}.risk-dot.moderate{background:var(--amber)}.risk-dot.high{background:var(--red)}
    .risk-label{font-size:13px;font-weight:600;flex:1}
    .risk-value{font-size:13px;color:var(--text-muted)}
    .chart-container{margin:20px 0;text-align:center}
    .chart-container svg{max-width:100%}
    .bar-row{display:flex;align-items:center;gap:12px;margin:6px 0}
    .bar-label{width:140px;font-size:12px;font-weight:500;text-align:right;flex-shrink:0}
    .bar-track{flex:1;height:24px;background:var(--bg);border-radius:4px;overflow:hidden}
    .bar-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:11px;font-weight:600;color:white}
    .bar-fill.green{background:var(--green)}.bar-fill.terra{background:var(--terra)}.bar-fill.sky{background:var(--sky-dark)}.bar-fill.amber{background:var(--amber)}.bar-fill.red{background:var(--red)}
    .checklist{list-style:none}
    .checklist li{padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;display:flex;align-items:flex-start;gap:8px}
    .checklist li:last-child{border-bottom:none}
    .check-box{width:16px;height:16px;border:2px solid var(--border);border-radius:3px;flex-shrink:0;margin-top:1px}
    .cover-page{background:#F8F6F2;color:#1a1a1a;text-align:center;padding:0;min-height:900px;display:flex;flex-direction:column;background-image:url('${SITE_ORIGIN}/landbook-cover-bg.png');background-size:cover;background-position:center}
    .cover-top{padding:60px 56px 0}
    .cover-tagline{font-size:14px;color:#999;font-weight:400;letter-spacing:.5px;font-style:italic}
    .cover-middle{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:40px 56px}
    .cover-property{font-size:48px;font-weight:400;margin-bottom:12px;line-height:1.1;color:#1a1a1a;letter-spacing:1px}
    .cover-address{font-size:20px;color:#666;font-weight:400;line-height:1.6;margin-bottom:8px}
    .cover-coords{font-size:14px;color:#aaa;font-weight:400;letter-spacing:2px;margin-top:4px}
    .cover-bottom{padding:0 56px 24px;text-align:center}
    .cover-brand{font-size:20px;font-weight:700;letter-spacing:3px;color:#1a1a1a;margin-bottom:12px}
    .cover-meta{font-size:12px;color:#aaa;letter-spacing:1px;margin-bottom:20px}
    .cover-disclaimer{font-size:11px;color:#aaa;line-height:1.5;max-width:500px;margin:0 auto}
    .cover-disclaimer strong{color:#888}
    .season-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
    .season-card{background:var(--bg);border-radius:8px;padding:14px;font-size:12px;border:1px solid var(--border)}
    .season-card .period{font-weight:700;color:var(--green);margin-bottom:4px}
    .season-card .risk-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;margin:4px 0}
    .season-card .risk-tag.moderate{background:#fef3c7;color:#92400e}
    .season-card .risk-tag.high{background:#fee2e2;color:#991b1b}
    .season-card .risk-tag.low{background:#dcfce7;color:#166534}
    .score-row{display:flex;align-items:center;gap:12px;margin:8px 0}
    .score-label{width:120px;font-size:12px;font-weight:600}
    .score-track{flex:1;height:10px;background:var(--bg);border-radius:5px;overflow:hidden}
    .score-fill{height:100%;border-radius:5px;background:var(--green)}
    .score-value{width:50px;font-size:13px;font-weight:700;color:var(--green);text-align:right}
    .map-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:16px 0}
    .map-grid .map-item{text-align:center}
    .map-grid .map-item .map-placeholder{height:160px;background:var(--bg);border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:13px}
    .map-grid .map-item img{width:100%;height:auto;border-radius:8px;border:1px solid var(--border)}
    .map-grid .map-label{font-size:11px;font-weight:600;color:var(--text-muted);margin-top:6px}
    .source-tag{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;background:var(--green-pale);color:var(--green);margin:2px 4px 2px 0}
    .disclaimer{background:var(--bg);border-radius:8px;padding:20px;font-size:11px;color:var(--text-muted);line-height:1.6;border-left:3px solid var(--amber)}

    /* ── Synthetic data highlighting ── */
    .synthetic-block{background:#fee2e2;border-left:4px solid #dc2626;border-radius:6px;padding:12px 16px;margin:8px 0}
    .synthetic-badge{font-size:9px;font-weight:800;color:#dc2626;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
    .synthetic-content{}
    .synthetic-source{font-size:10px;color:#991b1b;margin-top:6px;font-style:italic}
    td.synthetic{background:#fee2e2;position:relative}
    td.synthetic::after{content:'SYNTHETIC';position:absolute;top:2px;right:4px;font-size:7px;font-weight:800;color:#dc2626;letter-spacing:0.5px}
    .kpi-card.synthetic{background:#fee2e2;border-color:#fca5a5}
    .kpi-card.synthetic .synthetic-source{font-size:9px;color:#991b1b;font-style:italic;margin-top:4px}

    @media(max-width:768px){
      #report-container{margin:12px auto;padding:0 8px}
      .report-page{padding:28px 20px 24px;margin-bottom:12px}
      .section-title{font-size:20px}
      .kpi-grid{grid-template-columns:repeat(2,1fr);gap:10px}
      .kpi-value{font-size:22px}
      .cards-grid{grid-template-columns:1fr;gap:8px}
      .cover-page{min-height:auto;min-height:100dvh}
      .cover-property{font-size:28px}
      .bar-row{flex-wrap:wrap}
      .bar-label{width:100%;text-align:left;margin-bottom:2px}
      .season-grid{grid-template-columns:repeat(2,1fr);gap:6px}
      .map-grid{grid-template-columns:1fr}
      .disclaimer{padding:14px;font-size:10px}
    }
    @media print{body{background:white}#report-container{max-width:none;margin:0;padding:0}.report-page{box-shadow:none;border-radius:0;margin-bottom:0}.cover-page{min-height:100vh}}
  </style>
</head>
<body>
  <div id="report-container">${htmlContent}</div>
</body>
</html>`;
}

// ── Fetch helpers ────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchWithRetry(url, retries = 2, delayMs = 2000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 503 && attempt < retries) {
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      continue;
    }
    throw new Error(`HTTP ${res.status} after ${attempt + 1} attempt(s)`);
  }
}

// ── Static Map Helpers ──────────────────────────────────
function getBbox(boundary, padding = 0.005) {
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  return { south: Math.min(...lats) - padding, north: Math.max(...lats) + padding, west: Math.min(...lngs) - padding, east: Math.max(...lngs) + padding };
}

function mapboxStaticUrl(boundary, center, style = 'satellite-v9', width = 700, height = 440) {
  const token = process.env.VITE_MAPBOX_TOKEN;
  if (!token) return null;
  const coords = boundary.map(p => [p[1], p[0]]);
  if (coords.length > 0) coords.push(coords[0]);
  const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { stroke: '#E76F51', 'stroke-width': 3, 'stroke-opacity': 1, fill: '#E76F51', 'fill-opacity': 0.15 }, geometry: { type: 'Polygon', coordinates: [coords] } }] };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}@2x?access_token=${token}&padding=40`;
}

function wmsGetMapUrl(wmsBase, layers, bbox, width = 700, height = 440, extraParams = {}) {
  const { south, north, west, east } = bbox;
  const params = new URLSearchParams({ SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap', LAYERS: layers, BBOX: `${west},${south},${east},${north}`, WIDTH: String(width), HEIGHT: String(height), SRS: 'EPSG:4326', FORMAT: 'image/png', TRANSPARENT: 'true', ...extraParams });
  const separator = wmsBase.includes('?') ? '&' : '?';
  return `${wmsBase}${separator}${params.toString()}`;
}

function buildMapUrls(boundary, center) {
  const bbox = getBbox(boundary);
  return {
    satellite: mapboxStaticUrl(boundary, center, 'satellite-v9'),
    topography: mapboxStaticUrl(boundary, center, 'outdoors-v12'),
    soilClay: wmsGetMapUrl('https://maps.isric.org/mapserv?map=/map/clay.map', 'clay_0-5cm_mean', bbox),
    soilPh: wmsGetMapUrl('https://maps.isric.org/mapserv?map=/map/phh2o.map', 'phh2o_0-5cm_mean', bbox),
    landCoverCorine: wmsGetMapUrl('https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', '12', bbox),
    landCoverWorldcover: wmsGetMapUrl('https://services.terrascope.be/wms/v2', 'WORLDCOVER_2021_MAP', bbox),
    fireDanger: wmsGetMapUrl('https://maps.effis.emergency.copernicus.eu/effisgis/wms', 'ecmwf.fwi', bbox),
    burnedAreas: wmsGetMapUrl('https://maps.effis.emergency.copernicus.eu/effisgis/wms', 'firms.hs', bbox),
    natura2000: wmsGetMapUrl('https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer', '2,4', bbox),
    waterResources: mapboxStaticUrl(boundary, center, 'outdoors-v12'),
    biodiversity: mapboxStaticUrl(boundary, center, 'light-v11'),
  };
}

// ══════════════════════════════════════════════════════════
// EXISTING API CALLS (from generate.js)
// ══════════════════════════════════════════════════════════

async function getElevation(lat, lng) {
  const data = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
  return data?.elevation?.[0] ?? null;
}

async function getForecast(lat, lng) {
  return fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode,uv_index_max&forecast_days=7&timezone=auto`);
}

async function getClimateAverages(lat, lng) {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 29;
  // Extended: also fetch wind data for energy section
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_speed_10m_mean,wind_direction_10m_dominant&timezone=auto`;
  const data = await fetchJSON(url);
  if (!data?.daily) return null;
  const numYears = endYear - startYear + 1;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = [];
  for (let m = 0; m < 12; m++) {
    const indices = data.daily.time.map((t, i) => new Date(t).getMonth() === m ? i : -1).filter(i => i >= 0);
    if (indices.length === 0) { result.push({ month: monthNames[m], avgHigh: 0, avgLow: 0, totalPrecip: 0, avgWindMax: 0, avgWindMean: 0 }); continue; }
    const avgHigh = indices.reduce((s, i) => s + (data.daily.temperature_2m_max[i] || 0), 0) / indices.length;
    const avgLow = indices.reduce((s, i) => s + (data.daily.temperature_2m_min[i] || 0), 0) / indices.length;
    const totalPrecip = indices.reduce((s, i) => s + (data.daily.precipitation_sum[i] || 0), 0) / numYears;
    const avgWindMax = indices.reduce((s, i) => s + (data.daily.wind_speed_10m_max?.[i] || 0), 0) / indices.length;
    const avgWindMean = indices.reduce((s, i) => s + (data.daily.wind_speed_10m_mean?.[i] || 0), 0) / indices.length;
    result.push({ month: monthNames[m], avgHigh: Math.round(avgHigh * 10) / 10, avgLow: Math.round(avgLow * 10) / 10, totalPrecip: Math.round(totalPrecip), avgWindMax: Math.round(avgWindMax * 10) / 10, avgWindMean: Math.round(avgWindMean * 10) / 10 });
  }
  return result;
}

async function getSoilData(lat, lng) {
  const propsUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=clay&property=sand&property=silt&property=phh2o&property=ocd&property=nitrogen&property=cec&property=bdod&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&value=mean`;
  const classUrl = `https://rest.isric.org/soilgrids/v2.0/classification/query?lon=${lng}&lat=${lat}&number_classes=3`;
  const [props, classification] = await Promise.all([
    fetchWithRetry(propsUrl).catch(() => null),
    fetchWithRetry(classUrl).catch(() => null),
  ]);
  return { properties: props, classification };
}

async function getGeology(lat, lng) {
  return fetchJSON(`https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}&response=long`);
}

async function getSpeciesCounts(lat, lng) {
  return fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=15&per_page=200&locale=en`);
}

async function getThreatenedSpecies(lat, lng) {
  return fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=25&threatened=true&per_page=50&locale=en`);
}

async function getGBIF(lat, lng) {
  return fetchJSON(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=${lat - 0.15},${lat + 0.15}&decimalLongitude=${lng - 0.15},${lng + 0.15}&limit=0&facet=kingdomKey&facetLimit=10`);
}

async function getFloodData(lat, lng) {
  return fetchJSON(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=30`);
}

async function getRiskScores(lat, lng, climateNormals) {
  const forecast = await getForecast(lat, lng);
  if (!forecast?.daily) return { fire: 30, drought: 30, flood: 20 };
  const tempMax = Math.max(...(forecast.daily.temperature_2m_max || [20]));
  const totalPrecip = (forecast.daily.precipitation_sum || []).reduce((a, b) => a + b, 0);
  const windMax = Math.max(...(forecast.daily.wind_speed_10m_max || [10]));
  const month = new Date().getMonth();

  let fire = 0;
  if (tempMax > 35) fire += 30; else if (tempMax > 30) fire += 20; else if (tempMax > 25) fire += 10;
  if (totalPrecip < 5) fire += 25; else if (totalPrecip < 15) fire += 15;
  if (windMax > 40) fire += 20; else if (windMax > 25) fire += 10;
  if (month >= 5 && month <= 8) fire += 15;
  fire = Math.min(fire, 100);

  let drought = 0;
  const expectedMonthly = (climateNormals && climateNormals.length === 12)
    ? climateNormals.map(m => m.totalPrecip)
    : [80,70,55,40,25,8,2,3,20,60,80,90];
  const weeklyExpected = expectedMonthly[month] / 4;
  if (totalPrecip < weeklyExpected * 0.2) drought = 70;
  else if (totalPrecip < weeklyExpected * 0.5) drought = 50;
  else if (totalPrecip < weeklyExpected) drought = 30;
  else drought = 15;

  let flood = 0;
  if (totalPrecip > 100) flood = 70;
  else if (totalPrecip > 50) flood = 40;
  else if (totalPrecip > 25) flood = 20;
  else flood = 10;

  return { fire, drought, flood };
}

async function getProtectedAreas(lat, lng) {
  const query = `[out:json][timeout:15];(node["boundary"="protected_area"](around:25000,${lat},${lng});way["boundary"="protected_area"](around:25000,${lat},${lng});relation["boundary"="protected_area"](around:25000,${lat},${lng});node["leisure"="nature_reserve"](around:25000,${lat},${lng});way["leisure"="nature_reserve"](around:25000,${lat},${lng}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getWaterFeatures(lat, lng) {
  const d = 0.02;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const query = `[out:json][timeout:15];(node["natural"="spring"](${bbox});node["natural"="water"](${bbox});way["natural"="water"](${bbox});node["man_made"="water_well"](${bbox});way["waterway"](${bbox}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getInfrastructure(lat, lng) {
  const d = 0.05;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const query = `[out:json][timeout:15];(node["amenity"~"school|hospital|pharmacy|post_office|bank|fire_station|police"](${bbox});node["shop"](${bbox});node["tourism"](${bbox}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getActiveFires(lat, lng, radiusKm = 50) {
  const key = process.env.VITE_FIRMS_KEY;
  if (!key) return { fires: [], status: 'NO_KEY' };
  const degOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const bbox = `${lng - lngOffset},${lat - degOffset},${lng + lngOffset},${lat + degOffset}`;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${bbox}/2`;
  const res = await fetch(url);
  if (!res.ok) return { fires: [], status: `HTTP_${res.status}` };
  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { fires: [], status: 'OK' };
  const headers = lines[0].split(',').map(h => h.trim());
  const fires = lines.slice(1).map(line => {
    const v = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = v[i]?.trim(); });
    return { lat: parseFloat(obj.latitude), lng: parseFloat(obj.longitude), brightness: parseFloat(obj.bright_ti4 || obj.brightness), confidence: obj.confidence, frp: parseFloat(obj.frp), date: obj.acq_date, time: obj.acq_time, dayNight: obj.daynight };
  }).filter(f => !isNaN(f.lat) && !isNaN(f.lng));
  return { fires, status: 'OK' };
}

async function getHistoricalFires(lat, lng, radiusKm = 25, years = 10) {
  const key = process.env.VITE_FIRMS_KEY;
  if (!key) return { yearlyData: [], totalDetections: 0, status: 'NO_KEY' };
  const degOffset = radiusKm / 111;
  const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  const bbox = `${lng - lngOffset},${lat - degOffset},${lng + lngOffset},${lat + degOffset}`;
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - years;
  const yearlyData = [];
  let totalDetections = 0;
  for (let i = startYear; i < currentYear; i += 3) {
    const batch = [];
    for (let y = i; y < Math.min(i + 3, currentYear); y++) {
      const dateStr = `${y}-01-01`;
      const daysInYear = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 366 : 365;
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/MODIS_SP/${bbox}/${daysInYear}/${dateStr}`;
      batch.push(fetch(url).then(async res => { if (!res.ok) return { year: y, count: 0, error: res.status }; const text = await res.text(); const lines = text.trim().split('\n'); return { year: y, count: Math.max(0, lines.length - 1) }; }).catch(() => ({ year: y, count: 0, error: 'FETCH_FAILED' })));
    }
    const results = await Promise.all(batch);
    for (const r of results) { yearlyData.push(r); totalDetections += r.count; }
  }
  yearlyData.sort((a, b) => a.year - b.year);
  const yearsWithFires = yearlyData.filter(y => y.count > 0);
  return {
    yearlyData, totalDetections,
    yearsWithFires: yearsWithFires.length,
    mostRecentFireYear: yearsWithFires.length > 0 ? yearsWithFires[yearsWithFires.length - 1].year : null,
    peakFireYear: yearsWithFires.length > 0 ? yearsWithFires.reduce((a, b) => a.count > b.count ? a : b).year : null,
    peakFireCount: yearsWithFires.length > 0 ? Math.max(...yearsWithFires.map(y => y.count)) : 0,
    radiusKm, yearsAnalyzed: years, status: 'OK',
  };
}

async function getAdminUnit(lat, lng) {
  try {
    const d = 0.001;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://ogcapi.dgterritorio.gov.pt/collections/Freguesias/items?bbox=${bbox}&limit=1&f=json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.[0]) {
        const p = data.features[0].properties;
        return { parish: p.Freguesia || null, municipality: p.Municipio || null, district: p.Distrito || null, source: 'DGT' };
      }
    }
  } catch {}
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=14`;
    const res = await fetch(url, { headers: { 'User-Agent': 'landlibrary/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      return { parish: a.city_district || a.suburb || a.village || null, municipality: a.town || a.city || a.municipality || null, district: a.county || a.state || null, country: a.country || null, source: 'Nominatim' };
    }
  } catch {}
  return null;
}

async function getMultiPointElevation(boundary, center) {
  const points = [center];
  const step = Math.max(1, Math.floor(boundary.length / 8));
  for (let i = 0; i < boundary.length; i += step) points.push(boundary[i]);
  const d = 0.002;
  points.push([center[0] + d, center[1]], [center[0] - d, center[1]], [center[0], center[1] + d], [center[0], center[1] - d]);
  const lats = points.map(p => p[0]).join(',');
  const lngs = points.map(p => p[1]).join(',');
  const data = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
  if (!data?.elevation) return null;
  const elevations = data.elevation;
  const min = Math.min(...elevations), max = Math.max(...elevations);
  const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;
  const n = elevations.length;
  const elN = elevations[n - 4], elS = elevations[n - 3], elE = elevations[n - 2], elW = elevations[n - 1];
  const nsSlope = elS - elN, ewSlope = elE - elW;
  let aspect = 'Flat';
  const threshold = 2;
  if (Math.abs(nsSlope) > threshold || Math.abs(ewSlope) > threshold) {
    const angle = Math.atan2(ewSlope, nsSlope) * 180 / Math.PI;
    if (angle >= -22.5 && angle < 22.5) aspect = 'South-facing';
    else if (angle >= 22.5 && angle < 67.5) aspect = 'Southeast-facing';
    else if (angle >= 67.5 && angle < 112.5) aspect = 'East-facing';
    else if (angle >= 112.5 && angle < 157.5) aspect = 'Northeast-facing';
    else if (angle >= 157.5 || angle < -157.5) aspect = 'North-facing';
    else if (angle >= -157.5 && angle < -112.5) aspect = 'Northwest-facing';
    else if (angle >= -112.5 && angle < -67.5) aspect = 'West-facing';
    else aspect = 'Southwest-facing';
  }
  const latRange = Math.max(...boundary.map(p => p[0])) - Math.min(...boundary.map(p => p[0]));
  const lngRange = Math.max(...boundary.map(p => p[1])) - Math.min(...boundary.map(p => p[1]));
  const runMeters = Math.sqrt(Math.pow(latRange * 111320, 2) + Math.pow(lngRange * 111320 * Math.cos(center[0] * Math.PI / 180), 2));
  const rise = max - min;
  const slopePct = runMeters > 0 ? (rise / runMeters * 100) : 0;
  let slopeCategory = 'Gentle (0-5%)';
  if (slopePct > 15) slopeCategory = 'Very steep (>15%)';
  else if (slopePct > 10) slopeCategory = 'Steep (10-15%)';
  else if (slopePct > 5) slopeCategory = 'Moderate (5-10%)';
  return { elevations, min, max, avg: Math.round(avg), range: max - min, aspect, slopePct: Math.round(slopePct * 10) / 10, slopeCategory };
}

// CORINE labels
const CORINE_LABELS = {
  111: 'Continuous urban fabric', 112: 'Discontinuous urban fabric', 121: 'Industrial or commercial',
  131: 'Mineral extraction', 141: 'Green urban areas', 142: 'Sport & leisure',
  211: 'Non-irrigated arable', 212: 'Permanently irrigated', 213: 'Rice fields',
  221: 'Vineyards', 222: 'Fruit & berry', 223: 'Olive groves',
  231: 'Pastures', 241: 'Annual crops + permanent', 242: 'Complex cultivation',
  243: 'Agriculture + natural vegetation', 244: 'Agro-forestry',
  311: 'Broad-leaved forest', 312: 'Coniferous forest', 313: 'Mixed forest',
  321: 'Natural grassland', 322: 'Moors & heathland', 323: 'Sclerophyllous vegetation',
  324: 'Transitional woodland-shrub', 331: 'Beaches, dunes, sands', 332: 'Bare rocks',
  333: 'Sparsely vegetated', 334: 'Burnt areas', 411: 'Inland marshes',
  421: 'Salt marshes', 511: 'Water courses', 512: 'Water bodies',
  521: 'Coastal lagoons', 522: 'Estuaries', 523: 'Sea & ocean',
};

async function getLandCoverGrid(boundary, center) {
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const gridSize = 5;
  const points = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      points.push([minLat + (maxLat - minLat) * (i + 0.5) / gridSize, minLng + (maxLng - minLng) * (j + 0.5) / gridSize]);
    }
  }
  let results = [], source = null;
  // Try DGT COS first (Portugal)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const d = 0.0002;
    const [lat0, lng0] = points[0];
    const testUrl = `https://geo2.dgterritorio.gov.pt/geoserver/COS2018/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=COS2018_v2&QUERY_LAYERS=COS2018_v2&BBOX=${lng0-d},${lat0-d},${lng0+d},${lat0+d}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
    const testRes = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (testRes.ok) {
      source = 'DGT COS 2018';
      const testData = await testRes.json();
      if (testData?.features?.[0]?.properties) results.push(testData.features[0].properties);
      for (const [lat, lng] of points.slice(1, 9)) {
        try {
          const bbox = `${lng-d},${lat-d},${lng+d},${lat+d}`;
          const data = await fetchJSON(`https://geo2.dgterritorio.gov.pt/geoserver/COS2018/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=COS2018_v2&QUERY_LAYERS=COS2018_v2&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`);
          if (data?.features?.[0]?.properties) results.push(data.features[0].properties);
        } catch {}
      }
    }
  } catch {}
  // Fallback: CORINE 2018
  if (results.length === 0) {
    try {
      for (const [lat, lng] of points.slice(0, 9)) {
        const d = 0.0005;
        const bbox = `${lng-d},${lat-d},${lng+d},${lat+d}`;
        const res = await fetch(`https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=12&QUERY_LAYERS=12&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`);
        if (!res.ok) continue;
        const text = await res.text();
        const codeMatch = text.match(/CODE_18="(\d+)"/);
        const labelMatch = text.match(/LABEL3="([^"]+)"/);
        if (codeMatch) {
          const code = parseInt(codeMatch[1]);
          results.push({ CORINE_CODE: code, CORINE_LABEL: labelMatch?.[1] || CORINE_LABELS[code] || `CORINE ${code}` });
        }
      }
      if (results.length > 0) source = 'CORINE 2018';
    } catch {}
  }
  const classCounts = {};
  for (const r of results) {
    const cls = r.CORINE_LABEL || r.COS2018_n1 || r.COS2018_n2 || r.Descricao || r.LEGENDA || JSON.stringify(r);
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  }
  const total = results.length || 1;
  const breakdown = Object.entries(classCounts).map(([cls, count]) => ({ label: cls, pct: Math.round(count / total * 100), count })).sort((a, b) => b.pct - a.pct);
  return { source: source || 'UNAVAILABLE', breakdown, sampleCount: results.length };
}

async function getRegionalComparisons(lat, lng) {
  const regClimateUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat + 0.2}&longitude=${lng + 0.2}&start_date=${new Date().getFullYear() - 1}-01-01&end_date=${new Date().getFullYear() - 1}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const regClimate = await fetchJSON(regClimateUrl).catch(() => null);
  let regRainfall = null, regMeanTemp = null;
  if (regClimate?.daily) {
    regRainfall = Math.round(regClimate.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0));
    const temps = regClimate.daily.temperature_2m_max.map((max, i) => ((max || 0) + (regClimate.daily.temperature_2m_min[i] || 0)) / 2);
    regMeanTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  }
  const regSpecies = await fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=50&per_page=1&locale=en`).catch(() => null);
  const regSoilUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng + 0.1}&lat=${lat + 0.1}&property=phh2o&property=ocd&depth=0-5cm&value=mean`;
  const regSoil = await fetchJSON(regSoilUrl).catch(() => null);
  let regPh = null, regOC = null;
  if (regSoil?.properties?.layers) {
    for (const l of regSoil.properties.layers) {
      if (l.name === 'phh2o' && l.depths?.[0]?.values?.mean != null) regPh = (l.depths[0].values.mean / 10).toFixed(1);
      if (l.name === 'ocd' && l.depths?.[0]?.values?.mean != null) regOC = (l.depths[0].values.mean / 10).toFixed(1);
    }
  }
  return { rainfall: regRainfall, meanTemp: regMeanTemp, speciesTotal: regSpecies?.total_results || null, soilPh: regPh, soilOC: regOC };
}

// ══════════════════════════════════════════════════════════
// NEW TIER 1 API CALLS
// ══════════════════════════════════════════════════════════

async function getSolarPVGIS(lat, lng) {
  const url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat}&lon=${lng}&peakpower=1&loss=14&angle=35&outputformat=json`;
  const data = await fetchJSON(url);
  if (!data?.outputs) return null;
  const outputs = data.outputs;
  const monthly = outputs.monthly?.fixed || [];
  return {
    annualEnergy: outputs.totals?.fixed?.E_y || null, // kWh/kWp/year
    annualIrradiance: outputs.totals?.fixed?.H_sun?.y || outputs.totals?.fixed?.['H(i)_y'] || null,
    optimalAngle: data.inputs?.mounting_system?.fixed?.slope?.value || 35,
    monthly: monthly.map(m => ({ month: m.month, energy: m.E_m, irradiance: m['H(i)_m'], sd: m.SD_m })),
    source: 'PVGIS v5.3 (EU JRC)',
  };
}

async function getSolarNASA(lat, lng) {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 19;
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN&community=RE&longitude=${lng}&latitude=${lat}&start=${startYear}&end=${endYear}&format=JSON`;
  const data = await fetchJSON(url);
  if (!data?.properties?.parameter) return null;
  const allSky = data.properties.parameter.ALLSKY_SFC_SW_DWN || {};
  const clearSky = data.properties.parameter.CLRSKY_SFC_SW_DWN || {};
  // Average across years per month
  const monthly = {};
  for (const [key, val] of Object.entries(allSky)) {
    const month = parseInt(key.slice(4));
    if (month >= 1 && month <= 12) {
      if (!monthly[month]) monthly[month] = { allSky: [], clearSky: [] };
      monthly[month].allSky.push(val);
    }
  }
  for (const [key, val] of Object.entries(clearSky)) {
    const month = parseInt(key.slice(4));
    if (month >= 1 && month <= 12 && monthly[month]) monthly[month].clearSky.push(val);
  }
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const d = monthly[m];
    if (!d) { result.push({ month: m, allSky: 0, clearSky: 0 }); continue; }
    result.push({
      month: m,
      allSky: d.allSky.length > 0 ? Math.round(d.allSky.reduce((a, b) => a + b, 0) / d.allSky.length * 100) / 100 : 0,
      clearSky: d.clearSky.length > 0 ? Math.round(d.clearSky.reduce((a, b) => a + b, 0) / d.clearSky.length * 100) / 100 : 0,
    });
  }
  const annualAllSky = result.reduce((s, m) => s + m.allSky, 0) / 12;
  return { annualIrradiance: Math.round(annualAllSky * 365) / 100, monthly: result, source: 'NASA POWER (20yr avg)' };
}

async function getClimateProjections(lat, lng) {
  const url = `https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lng}&models=EC_Earth3P_HR&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&start_date=2025-01-01&end_date=2050-12-31`;
  const data = await fetchJSON(url);
  if (!data?.daily) return null;
  // Aggregate into decadal averages
  const decades = { '2025-2034': { temps: [], precip: [] }, '2035-2044': { temps: [], precip: [] }, '2045-2050': { temps: [], precip: [] } };
  const times = data.daily.time || [];
  for (let i = 0; i < times.length; i++) {
    const year = parseInt(times[i].slice(0, 4));
    const tMax = data.daily.temperature_2m_max?.[i] || 0;
    const tMin = data.daily.temperature_2m_min?.[i] || 0;
    const precip = data.daily.precipitation_sum?.[i] || 0;
    const decade = year < 2035 ? '2025-2034' : year < 2045 ? '2035-2044' : '2045-2050';
    decades[decade].temps.push((tMax + tMin) / 2);
    decades[decade].precip.push(precip);
  }
  const result = {};
  for (const [period, d] of Object.entries(decades)) {
    const years = period === '2045-2050' ? 6 : 10;
    result[period] = {
      avgTemp: d.temps.length > 0 ? (d.temps.reduce((a, b) => a + b, 0) / d.temps.length).toFixed(1) : null,
      annualPrecip: d.precip.length > 0 ? Math.round(d.precip.reduce((a, b) => a + b, 0) / years) : null,
    };
  }
  return { decades: result, model: 'EC_Earth3P_HR', source: 'Open-Meteo Climate API (CMIP6)' };
}

async function getWatershed(lat, lng) {
  const url = `https://mghydro.com/app/watershed_api?lat=${lat}&lng=${lng}&precision=high`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      geometry: data.geometry || data.watershed || null,
      area: data.area_km2 || data.area || null,
      name: data.name || null,
      source: 'mghydro.com (HydroSHEDS-derived)',
    };
  } catch { return null; }
}

async function getIsochrone(lat, lng) {
  const token = process.env.VITE_MAPBOX_TOKEN;
  if (!token) return null;
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lng},${lat}?contours_minutes=15&polygons=true&access_token=${token}`;
  const data = await fetchJSON(url);
  if (!data?.features?.[0]) return null;
  return {
    geometry: data.features[0].geometry,
    contourMinutes: 15,
    source: 'Mapbox Isochrone API',
  };
}

async function getEurostatLandPrice(countryCode) {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase().slice(0, 2);
  const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/apri_lprc?format=JSON&geo=${cc}&unit=EUR_HA&time=2022&time=2021&time=2020`;
  const data = await fetchJSON(url);
  if (!data?.value) return null;
  const values = Object.values(data.value).filter(v => v != null && v > 0);
  if (values.length === 0) return null;
  return {
    pricePerHa: Math.round(values[0]),
    year: 2022,
    country: cc,
    source: 'Eurostat (apri_lprc)',
  };
}

async function getPopulationDensity(lat, lng) {
  const url = `https://tiles.worldpop.org/gp/v1/arcgis/rest/services/wpgppop_density/ImageServer/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&returnGeometry=false&f=json`;
  const data = await fetchJSON(url);
  if (!data?.value) return null;
  const density = parseFloat(data.value);
  if (isNaN(density)) return null;
  return { density: Math.round(density * 10) / 10, unit: 'people/km²', source: 'WorldPop (100m resolution)' };
}

async function getDeforestation(lat, lng) {
  const url = `https://api.openepi.io/deforestation/basin?lon=${lng}&lat=${lat}&start_year=2001&end_year=2022`;
  const data = await fetchJSON(url);
  if (!data) return null;
  return {
    yearlyLoss: data.features?.[0]?.properties || data.properties || data,
    source: 'OpenEPI (Global Forest Watch)',
  };
}

async function getLandCoverEpochs(lat, lng) {
  const d = 0.0005;
  const bbox = `${lng-d},${lat-d},${lng+d},${lat+d}`;
  const epochs = [
    { year: 2000, layer: '0' },
    { year: 2006, layer: '4' },
    { year: 2012, layer: '8' },
    { year: 2018, layer: '12' },
  ];
  const results = [];
  for (const ep of epochs) {
    try {
      const url = `https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=${ep.layer}&QUERY_LAYERS=${ep.layer}&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
      const res = await fetch(url);
      if (!res.ok) { results.push({ year: ep.year, code: null, label: 'Unavailable' }); continue; }
      const text = await res.text();
      const codeMatch = text.match(/CODE_\d+="(\d+)"/);
      const labelMatch = text.match(/LABEL3="([^"]+)"/);
      if (codeMatch) {
        const code = parseInt(codeMatch[1]);
        results.push({ year: ep.year, code, label: labelMatch?.[1] || CORINE_LABELS[code] || `Class ${code}` });
      } else {
        results.push({ year: ep.year, code: null, label: 'No data' });
      }
    } catch {
      results.push({ year: ep.year, code: null, label: 'Error' });
    }
  }
  // Detect transitions
  const transitions = [];
  for (let i = 1; i < results.length; i++) {
    if (results[i].code && results[i-1].code && results[i].code !== results[i-1].code) {
      transitions.push({ from: results[i-1].label, to: results[i].label, period: `${results[i-1].year}-${results[i].year}` });
    }
  }
  return { epochs: results, transitions, source: 'CORINE Land Cover (EEA WMS)' };
}

async function getBiodiversityTrends(lat, lng) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y < currentYear; y++) years.push(y);
  const results = [];
  for (const y of years) {
    try {
      const data = await fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=15&d1=${y}-01-01&d2=${y}-12-31&per_page=1`);
      results.push({ year: y, speciesCount: data?.total_results || 0 });
    } catch {
      results.push({ year: y, speciesCount: 0 });
    }
  }
  return { yearly: results, source: 'iNaturalist (yearly species counts, 15km radius)' };
}

async function getGBIFTrends(lat, lng) {
  const url = `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${(lat - 0.15).toFixed(4)},${(lat + 0.15).toFixed(4)}&decimalLongitude=${(lng - 0.15).toFixed(4)},${(lng + 0.15).toFixed(4)}&year=2015,${new Date().getFullYear()}&limit=0&facet=year&facetLimit=15`;
  const data = await fetchJSON(url);
  if (!data?.facets?.[0]?.counts) return null;
  const yearly = data.facets[0].counts.map(c => ({ year: parseInt(c.name), occurrences: c.count })).sort((a, b) => a.year - b.year);
  return { yearly, total: data.count || 0, source: 'GBIF (occurrence records, faceted by year)' };
}

// ══════════════════════════════════════════════════════════
// COMPUTATION FUNCTIONS
// ══════════════════════════════════════════════════════════

// Carbon estimation
const CARBON_PER_HA = {
  'forest': 120, 'cork oak': 80, 'broad-leaved': 100, 'coniferous': 90, 'mixed forest': 95,
  'olive': 30, 'vineyard': 15, 'orchard': 25, 'fruit': 25,
  'agriculture': 10, 'arable': 8, 'cropland': 10, 'pasture': 20,
  'scrub': 35, 'shrub': 30, 'maquis': 40, 'heath': 25,
  'grassland': 15, 'natural grass': 15,
  'urban': 2, 'built': 2, 'water': 0, 'bare': 3, 'default': 25,
};

function estimateCarbon(landCover, areaHa) {
  if (!landCover?.breakdown?.length) return { stock: Math.round(areaHa * 25), annual: (areaHa * 2.5).toFixed(1), method: 'Conservative default (25 tCO2e/ha)' };
  let totalStock = 0;
  const details = [];
  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let rate = CARBON_PER_HA.default;
    for (const [key, val] of Object.entries(CARBON_PER_HA)) { if (lcLower.includes(key)) { rate = val; break; } }
    const lcArea = areaHa * lc.pct / 100;
    totalStock += lcArea * rate;
    details.push({ label: lc.label, area: lcArea.toFixed(2), rate, stock: Math.round(lcArea * rate) });
  }
  return { stock: Math.round(totalStock), annual: (totalStock * 0.02).toFixed(1), creditValue: `€${Math.round(totalStock * 0.02 * 65)}–${Math.round(totalStock * 0.02 * 80)}`, details, method: 'Literature values by land cover type × area' };
}

// TEEB natural capital
const TEEB_BY_LANDCOVER = {
  'forest': { provisioning: 250, regulating: 1200, cultural: 400, supporting: 350 },
  'cork': { provisioning: 350, regulating: 900, cultural: 500, supporting: 300 },
  'olive': { provisioning: 200, regulating: 400, cultural: 300, supporting: 150 },
  'vineyard': { provisioning: 300, regulating: 350, cultural: 450, supporting: 120 },
  'scrub': { provisioning: 80, regulating: 600, cultural: 200, supporting: 250 },
  'grassland': { provisioning: 150, regulating: 300, cultural: 150, supporting: 200 },
  'agriculture': { provisioning: 400, regulating: 200, cultural: 100, supporting: 100 },
  'cropland': { provisioning: 400, regulating: 200, cultural: 100, supporting: 100 },
  'pasture': { provisioning: 200, regulating: 350, cultural: 200, supporting: 180 },
  'water': { provisioning: 500, regulating: 800, cultural: 600, supporting: 400 },
  'wetland': { provisioning: 300, regulating: 1500, cultural: 500, supporting: 600 },
  'default': { provisioning: 180, regulating: 400, cultural: 200, supporting: 150 },
};

function calculateNaturalCapital(landCover, areaHa) {
  const services = { provisioning: 0, regulating: 0, cultural: 0, supporting: 0 };
  if (!landCover?.breakdown?.length) {
    const rate = TEEB_BY_LANDCOVER.default;
    const total = Object.values(rate).reduce((a, b) => a + b, 0);
    return { totalPerHa: total, totalAnnual: Math.round(total * areaHa), services: Object.fromEntries(Object.entries(rate).map(([k, v]) => [k, Math.round(v * areaHa)])), premium: Math.round(total * areaHa * 5), method: 'TEEB default coefficients' };
  }
  const details = [];
  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let rates = TEEB_BY_LANDCOVER.default;
    for (const [key, val] of Object.entries(TEEB_BY_LANDCOVER)) { if (lcLower.includes(key)) { rates = val; break; } }
    const lcArea = areaHa * lc.pct / 100;
    const totalRate = Object.values(rates).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(rates)) services[k] += v * lcArea;
    details.push({ label: lc.label, area: lcArea.toFixed(2), ratePerHa: totalRate, annual: Math.round(totalRate * lcArea) });
  }
  const totalAnnual = Math.round(Object.values(services).reduce((a, b) => a + b, 0));
  return { totalPerHa: areaHa > 0 ? Math.round(totalAnnual / areaHa) : 0, totalAnnual, services: Object.fromEntries(Object.entries(services).map(([k, v]) => [k, Math.round(v)])), details, premium: Math.round(totalAnnual * 5), method: 'TEEB coefficients by land cover type' };
}

function calculateEcosystemServices(naturalCapital, areaHa) {
  const { services, totalAnnual } = naturalCapital;
  const items = [
    { service: 'Food & Fiber (Provisioning)', value: services.provisioning, method: 'TEEB market price' },
    { service: 'Water Regulation', value: Math.round(services.regulating * 0.35), method: 'TEEB benefit transfer' },
    { service: 'Climate Regulation', value: Math.round(services.regulating * 0.25), method: 'TEEB social cost of carbon' },
    { service: 'Erosion Prevention', value: Math.round(services.regulating * 0.2), method: 'TEEB avoided cost' },
    { service: 'Pollination & Pest Control', value: Math.round(services.regulating * 0.2), method: 'TEEB production value' },
    { service: 'Recreation & Cultural', value: services.cultural, method: 'TEEB travel cost' },
    { service: 'Nutrient Cycling & Soil Formation', value: services.supporting, method: 'TEEB replacement cost' },
  ].filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  for (const item of items) item.pct = totalAnnual > 0 ? Math.round(item.value / totalAnnual * 100) : 0;
  return { total: totalAnnual, items };
}

// Agricultural revenue
const AG_MODELS = {
  'cork': { yield: 180, unit: 'kg/ha', price: 8.5, cycle: 9, label: 'Cork harvest (9yr cycle)', annualized: true },
  'olive': { yield: 3000, unit: 'kg/ha', price: 0.6, cycle: 1, label: 'Olive production' },
  'vineyard': { yield: 6000, unit: 'kg/ha', price: 0.45, cycle: 1, label: 'Grape production' },
  'forest': { yield: 4, unit: 'm³/ha', price: 45, cycle: 1, label: 'Timber/biomass' },
  'pasture': { yield: 250, unit: 'kg meat/ha', price: 4.5, cycle: 1, label: 'Pastoral (livestock)' },
  'agriculture': { yield: 2500, unit: 'kg/ha', price: 0.35, cycle: 1, label: 'Mixed crops' },
  'fruit': { yield: 8000, unit: 'kg/ha', price: 0.8, cycle: 1, label: 'Fruit production' },
  'scrub': { yield: 100, unit: 'kg honey/ha', price: 8, cycle: 1, label: 'Apiculture potential' },
  'default': { yield: 0, unit: '', price: 0, cycle: 1, label: 'Non-productive' },
};

function calculateAgriculturalRevenue(landCover, areaHa, carbon) {
  if (!landCover?.breakdown?.length) {
    return {
      models: [{ label: 'Conservative estimate', annual: Math.round(areaHa * 200), approach: 'Generic €200/ha' }],
      scenarios: [
        { scenario: 'Conservative', value: Math.round(areaHa * 200), label: 'Low-input management' },
        { scenario: 'Moderate', value: Math.round(areaHa * 500), label: 'Active management' },
        { scenario: 'Optimized', value: Math.round(areaHa * 1200), label: 'Diversified production' },
      ],
    };
  }
  const models = [];
  let totalConservative = 0;
  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let model = AG_MODELS.default;
    for (const [key, val] of Object.entries(AG_MODELS)) { if (lcLower.includes(key)) { model = val; break; } }
    if (model.price === 0) continue;
    const lcArea = areaHa * lc.pct / 100;
    let annual = model.yield * model.price * lcArea;
    if (model.annualized) annual = annual / model.cycle;
    annual = Math.round(annual);
    models.push({ label: model.label, landCover: lc.label, area: lcArea.toFixed(2), annual, approach: `${model.yield} ${model.unit} × €${model.price}` });
    totalConservative += annual;
  }
  const carbonRevenue = carbon?.stock ? Math.round(carbon.stock * 0.02 * 70) : 0;
  return {
    models,
    scenarios: [
      { scenario: 'Conservative', value: totalConservative, label: 'Current yields only' },
      { scenario: 'Moderate', value: Math.round(totalConservative * 1.4 + carbonRevenue * 0.5), label: 'Improved management + partial carbon' },
      { scenario: 'Optimized', value: Math.round(totalConservative * 1.8) + carbonRevenue, label: 'Full optimization + carbon credits' },
    ],
  };
}

function syntheticValuation(areaHa, landCover, waterScore, bioScore, eurostatPrice) {
  // Use Eurostat baseline if available, otherwise fall back to hardcoded
  const BASE_RATE = eurostatPrice?.pricePerHa || 22000;
  let modifier = 1.0;
  if (landCover?.breakdown?.length) {
    const primary = landCover.breakdown[0]?.label?.toLowerCase() || '';
    if (primary.includes('vineyard') || primary.includes('vinha')) modifier += 0.4;
    else if (primary.includes('olive') || primary.includes('olival')) modifier += 0.3;
    else if (primary.includes('forest') || primary.includes('floresta')) modifier += 0.15;
    else if (primary.includes('urban') || primary.includes('artificial')) modifier += 0.6;
    else if (primary.includes('agric') || primary.includes('culturas')) modifier += 0.2;
  }
  if (waterScore >= 8) modifier += 0.15; else if (waterScore >= 6) modifier += 0.08;
  if (bioScore >= 8) modifier += 0.1;
  const perHa = Math.round(BASE_RATE * modifier);
  const conservative = Math.round(perHa * 0.85);
  const optimistic = Math.round(perHa * 1.15);
  return {
    perHa, total: Math.round(perHa * areaHa),
    conservative: { perHa: conservative, total: Math.round(conservative * areaHa) },
    market: { perHa, total: Math.round(perHa * areaHa) },
    optimistic: { perHa: optimistic, total: Math.round(optimistic * areaHa) },
    baseSource: eurostatPrice ? `Eurostat (${eurostatPrice.country}, ${eurostatPrice.year})` : 'Hardcoded (€22,000/ha)',
  };
}

function calculateRadarScores(propertyData, regional) {
  return [
    { label: 'Water', score: propertyData.waterScore, avg: regional.rainfall ? Math.min(10, Math.round((regional.rainfall || 500) / 100)) : 5.5 },
    { label: 'Biodiversity', score: propertyData.bioScore, avg: regional.speciesTotal ? Math.min(10, Math.round(Math.log10(regional.speciesTotal) * 2.5)) : 5.5 },
    { label: 'Soil', score: propertyData.soilScore || 6, avg: regional.soilPh ? (parseFloat(regional.soilPh) > 5 && parseFloat(regional.soilPh) < 8 ? 6.5 : 5) : 6 },
    { label: 'Carbon', score: propertyData.carbonScore || 5.5, avg: 5 },
    { label: 'Resilience', score: propertyData.resilienceScore || 6, avg: 5.5 },
  ];
}

// Solar/Wind potential calculations
function calculateSolarPotential(pvgis, nasa, areaHa) {
  const annualEnergy = pvgis?.annualEnergy || (nasa?.annualIrradiance ? nasa.annualIrradiance * 0.15 : null);
  if (!annualEnergy) return null;
  // Assume 20% of land usable for solar, 200W/m² panel density
  const usableArea = areaHa * 0.2 * 10000; // m²
  const peakCapacity = usableArea * 0.2 / 1000; // kWp (200W/m²)
  const annualOutput = peakCapacity * annualEnergy; // kWh
  return {
    annualIrradiance: pvgis?.annualIrradiance || nasa?.annualIrradiance || null,
    annualEnergyPerKwp: annualEnergy,
    potentialCapacity: Math.round(peakCapacity),
    potentialOutput: Math.round(annualOutput),
    optimalAngle: pvgis?.optimalAngle || 35,
    monthly: pvgis?.monthly || null,
    source: pvgis ? pvgis.source : (nasa ? nasa.source : 'Unavailable'),
  };
}

function calculateWindPotential(climate) {
  if (!climate || !climate[0]?.avgWindMean) return null;
  const annualMean = climate.reduce((s, m) => s + m.avgWindMean, 0) / 12;
  const annualMax = Math.max(...climate.map(m => m.avgWindMax));
  // Wind power class
  let powerClass = 'Poor';
  if (annualMean > 7) powerClass = 'Outstanding';
  else if (annualMean > 6) powerClass = 'Good';
  else if (annualMean > 5) powerClass = 'Moderate';
  else if (annualMean > 4) powerClass = 'Marginal';
  // Estimate at 50m hub height using power law
  const windAt50m = annualMean * Math.pow(50 / 10, 0.143);
  // Estimate annual energy for a small 10kW turbine
  const turbineOutput = annualMean > 4 ? Math.round(10 * 8760 * 0.25 * Math.pow(annualMean / 12, 3) / Math.pow(12 / 12, 3)) : 0;
  return {
    annualMean10m: Math.round(annualMean * 10) / 10,
    annualMax10m: Math.round(annualMax * 10) / 10,
    estimatedAt50m: Math.round(windAt50m * 10) / 10,
    powerClass,
    monthly: climate.map(m => ({ month: m.month, mean: m.avgWindMean, max: m.avgWindMax })),
    estimatedAnnualOutput: turbineOutput,
    source: 'Open-Meteo Archive (30yr avg wind at 10m)',
  };
}

function calculateClimateChange(current, projected) {
  if (!current || !projected?.decades) return null;
  const currentAvgTemp = parseFloat((current.reduce((s, m) => s + (m.avgHigh + m.avgLow) / 2, 0) / 12).toFixed(1));
  const currentAnnualPrecip = current.reduce((s, m) => s + m.totalPrecip, 0);
  const changes = {};
  for (const [period, d] of Object.entries(projected.decades)) {
    changes[period] = {
      tempChange: d.avgTemp ? (parseFloat(d.avgTemp) - currentAvgTemp).toFixed(1) : null,
      precipChange: d.annualPrecip ? Math.round(d.annualPrecip - currentAnnualPrecip) : null,
      precipChangePct: d.annualPrecip && currentAnnualPrecip > 0 ? Math.round((d.annualPrecip - currentAnnualPrecip) / currentAnnualPrecip * 100) : null,
    };
  }
  return { currentAvgTemp, currentAnnualPrecip, changes, model: projected.model, source: projected.source };
}

// Score/risk helpers
function scoreLabel(score) {
  if (score >= 80) return 'Extreme'; if (score >= 60) return 'High'; if (score >= 40) return 'Moderate'; if (score >= 20) return 'Low'; return 'Very Low';
}
function riskLevel(score) {
  if (score >= 60) return { level: 'High', cls: 'high', out5: Math.round(score / 20) };
  if (score >= 30) return { level: 'Moderate', cls: 'moderate', out5: Math.round(score / 20) };
  return { level: 'Low', cls: 'low', out5: Math.round(score / 20) };
}

// Species parser
function summarizeSpecies(data) {
  if (!data?.results) return { total: 0, groups: {}, topSpecies: [] };
  const groups = {};
  const ICONIC_MAP = { Plantae: 'Flora', Aves: 'Birds', Mammalia: 'Mammals', Insecta: 'Insects', Reptilia: 'Reptiles', Amphibia: 'Amphibians', Fungi: 'Fungi', Actinopterygii: 'Fish', Arachnida: 'Arachnids', Mollusca: 'Molluscs' };
  for (const r of data.results) {
    const iconic = r.taxon?.iconic_taxon_name || 'Other';
    const group = ICONIC_MAP[iconic] || iconic;
    groups[group] = (groups[group] || 0) + 1;
  }
  const topSpecies = data.results.slice(0, 10).map(r => ({
    name: r.taxon?.preferred_common_name || r.taxon?.name || 'Unknown',
    scientificName: r.taxon?.name || '',
    group: ICONIC_MAP[r.taxon?.iconic_taxon_name] || r.taxon?.iconic_taxon_name || 'Other',
    count: r.count || 0,
    threatened: !!r.taxon?.conservation_status,
    photoUrl: r.taxon?.default_photo?.square_url || null,
  }));
  return { total: data.total_results || 0, groups, topSpecies };
}

// Soil parser
function parseSoil(data) {
  if (!data?.properties?.properties?.layers) return null;
  const result = {};
  for (const layer of data.properties.properties.layers) {
    const val = layer.depths?.[0]?.values?.mean;
    if (val == null) continue;
    if (layer.name === 'clay') result.clay = (val / 10).toFixed(1);
    if (layer.name === 'sand') result.sand = (val / 10).toFixed(1);
    if (layer.name === 'silt') result.silt = (val / 10).toFixed(1);
    if (layer.name === 'phh2o') result.ph = (val / 10).toFixed(1);
    if (layer.name === 'ocd') result.organicCarbon = (val / 10).toFixed(1);
    if (layer.name === 'nitrogen') result.nitrogen = (val / 100).toFixed(2);
    if (layer.name === 'cec') result.cec = (val / 10).toFixed(1);
    if (layer.name === 'bdod') result.bulkDensity = (val / 100).toFixed(2);
  }
  result.classification = data.classification?.wrb_class_name || null;
  result.classificationProb = data.classification?.wrb_class_probability || null;
  return result;
}

function parseGeology(data) {
  if (!data?.success?.data?.length) return null;
  return data.success.data.map(u => ({
    name: u.strat_name_long || u.unit_name || 'Unknown',
    lithology: (u.lith || []).map(l => l.name || l.lith).join(', ') || 'Unknown',
    environment: (u.environ || []).map(e => e.name || e.environ).join(', ') || 'Unknown',
    period: u.t_int_name || 'Unknown',
    ageMa: u.b_int_age ? `${u.t_int_age}–${u.b_int_age} Ma` : null,
  }));
}

function derivePropertyName(address) {
  if (!address) return 'Land Report';
  const first = address.split(',')[0].trim();
  return first.replace(/^(R\.|Rua|Estrada|Travessa|Av\.|Avenida|Largo|Praça)\s+/i, '').trim() || first;
}

function deriveOpportunities(data) {
  const ops = [];
  if (data.waterScore >= 7) ops.push({ title: 'Water Security', reason: `Water score ${data.waterScore}/10` });
  else if (data.waterScore < 5) ops.push({ title: 'Water Development', reason: 'Low water score' });
  if (data.bioScore >= 6) ops.push({ title: 'Carbon Credits', reason: `Bio score ${data.bioScore}/10` });
  if (data.risks.fire.score >= 40) ops.push({ title: 'Fire Management', reason: `Fire risk ${data.risks.fire.level}` });
  if (data.protectedAreas.length > 0) ops.push({ title: 'Conservation', reason: `${data.protectedAreas.length} protected areas` });
  if (data.species.total > 50) ops.push({ title: 'Biodiversity Value', reason: `${data.species.total} species` });
  const fallback = [{ title: 'Agriculture', reason: 'Land use potential' }, { title: 'Eco-Tourism', reason: 'Natural setting' }, { title: 'Renewable Energy', reason: 'Solar/wind potential' }];
  for (const f of fallback) { if (ops.length >= 6) break; if (!ops.find(o => o.title === f.title)) ops.push(f); }
  return ops.slice(0, 6);
}

function deriveMitigations(data) {
  const mits = [];
  if (data.risks.fire.score >= 30) { mits.push('Create defensible space around structures (10m minimum clearance)'); mits.push('Fuel load reduction through controlled grazing or mechanical clearing'); }
  if (data.risks.drought.score >= 30) { mits.push('Install rainwater harvesting systems'); mits.push('Establish water-efficient drip irrigation for productive areas'); }
  if (data.risks.flood.score >= 30) mits.push('Maintain drainage channels and monitor low-lying areas');
  if (data.soil?.ph && parseFloat(data.soil.ph) < 5.5) mits.push('Consider liming to raise soil pH');
  if (data.waterFeatures.total === 0) mits.push('Investigate borehole or well drilling');
  if (mits.length < 3) mits.push('Annual property assessment for environmental changes');
  if (mits.length < 4) mits.push('Establish baseline monitoring for biodiversity and water quality');
  return mits;
}

function deriveNextSteps(data) {
  const immediate = ['Verify property boundaries with licensed surveyor'];
  const shortTerm = [];
  const longTerm = [];
  if (data.risks.fire.score >= 40) immediate.push('Implement fire fuel reduction program');
  if (data.waterFeatures.total > 0) immediate.push('Assess and meter existing water sources');
  else immediate.push('Commission hydrogeological survey');
  if (data.bioScore >= 6) shortTerm.push('Biodiversity monitoring protocol');
  if (data.risks.drought.score >= 30) shortTerm.push('Drought resilience plan');
  shortTerm.push('Soil testing and amendment plan');
  if (data.protectedAreas.length > 0) shortTerm.push('Review conservation obligations');
  if (data.bioScore >= 7) longTerm.push('Conservation easement evaluation');
  longTerm.push('Carbon credit certification feasibility');
  longTerm.push('Regenerative land management certification');
  return { immediate: immediate.slice(0, 4), shortTerm: shortTerm.slice(0, 4), longTerm: longTerm.slice(0, 4) };
}

function deriveSeasonalCalendar(climate) {
  if (!climate) return null;
  const seasons = [];
  const winterPrecip = climate[0].totalPrecip + climate[1].totalPrecip + climate[2].totalPrecip;
  seasons.push({ period: 'Jan-Mar', risk: winterPrecip > 150 ? 'Saturated soils' : 'Cool & mild', tag: winterPrecip > 150 ? 'moderate' : 'low', notes: winterPrecip > 150 ? 'Possible access limitations' : 'Good planting window' });
  const springTemp = (climate[3].avgHigh + climate[4].avgHigh) / 2;
  seasons.push({ period: 'Apr-May', risk: springTemp > 25 ? 'Fire season begins' : 'Growing season', tag: springTemp > 25 ? 'moderate' : 'low', notes: springTemp > 25 ? 'Begin fuel reduction' : 'Optimal growth period' });
  const summerTemp = (climate[5].avgHigh + climate[6].avgHigh + climate[7].avgHigh) / 3;
  const summerPrecip = climate[5].totalPrecip + climate[6].totalPrecip + climate[7].totalPrecip;
  seasons.push({ period: 'Jun-Aug', risk: summerTemp > 30 ? 'PEAK FIRE RISK' : summerPrecip < 30 ? 'Dry period' : 'Warm season', tag: summerTemp > 30 ? 'high' : summerPrecip < 30 ? 'moderate' : 'low', notes: summerTemp > 30 ? 'No outdoor burning, monitor continuously' : 'Water management critical' });
  const autumnPrecip = climate[8].totalPrecip + climate[9].totalPrecip + climate[10].totalPrecip + climate[11].totalPrecip;
  seasons.push({ period: 'Sep-Dec', risk: autumnPrecip > 200 ? 'Heavy rains, erosion risk' : 'First rains', tag: autumnPrecip > 200 ? 'moderate' : 'low', notes: 'Revegetation window' });
  return seasons;
}

// ══════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const submissionId = body.submission_id;

    const submissions = await getCollection('submissions');
    const sub = submissionId
      ? await submissions.findOne({ id: submissionId })
      : await submissions.find({}).sort({ created: -1 }).limit(1).toArray().then(a => a[0]);

    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const lat = sub.center?.[0] || sub.center?.lat;
    const lng = sub.center?.[1] || sub.center?.lng;
    if (!lat || !lng) return res.status(400).json({ error: 'No coordinates in submission' });

    if (!sub.address) {
      const geocoded = await reverseGeocode(lat, lng);
      if (geocoded) { sub.address = geocoded; await submissions.updateOne({ id: sub.id }, { $set: { address: geocoded } }); }
    }

    const areaHa = sub.area ? (sub.area / 10000) : 0;

    // ── Fetch ALL data in parallel ──────────────────────
    const apiStatus = {};
    function tracked(name, promise, fallback) {
      return promise.then(result => { apiStatus[name] = 'OK'; return result; })
        .catch(err => { apiStatus[name] = `FAILED: ${err.message || err}`; return fallback; });
    }

    // Determine country code for Eurostat
    const adminUnit = await tracked('adminUnit', getAdminUnit(lat, lng), null);
    const countryCode = adminUnit?.country?.slice(0, 2) || (adminUnit?.source === 'DGT' ? 'PT' : null);

    const [
      elevation, forecast, climate, soilRaw, geology,
      speciesCounts, threatened, gbif, floodData,
      protectedAreas, waterFeatures, infrastructure,
      terrainProfile, landCover, regional,
      activeFires, historicalFires,
      // New Tier 1 APIs
      pvgis, nasaSolar, climateProjections,
      watershed, isochrone, eurostatPrice,
      populationDensity, deforestation, landCoverEpochs,
      bioTrends, gbifTrends,
    ] = await Promise.all([
      // Existing APIs
      tracked('elevation', getElevation(lat, lng), null),
      tracked('forecast', getForecast(lat, lng), null),
      tracked('climate', getClimateAverages(lat, lng), null),
      tracked('soil', getSoilData(lat, lng), { properties: null, classification: null }),
      tracked('geology', getGeology(lat, lng), null),
      tracked('species', getSpeciesCounts(lat, lng), null),
      tracked('threatened', getThreatenedSpecies(lat, lng), null),
      tracked('gbif', getGBIF(lat, lng), null),
      tracked('flood', getFloodData(lat, lng), null),
      tracked('protectedAreas', getProtectedAreas(lat, lng), []),
      tracked('waterFeatures', getWaterFeatures(lat, lng), []),
      tracked('infrastructure', getInfrastructure(lat, lng), []),
      tracked('terrainProfile', getMultiPointElevation(sub.boundary, [lat, lng]), null),
      tracked('landCover', getLandCoverGrid(sub.boundary, [lat, lng]), { source: 'FAILED', breakdown: [], sampleCount: 0 }),
      tracked('regional', getRegionalComparisons(lat, lng), {}),
      tracked('activeFires', getActiveFires(lat, lng), { fires: [], status: 'FAILED' }),
      tracked('historicalFires', getHistoricalFires(lat, lng), { yearlyData: [], totalDetections: 0, status: 'FAILED' }),
      // New Tier 1 APIs
      tracked('pvgis', getSolarPVGIS(lat, lng), null),
      tracked('nasaSolar', getSolarNASA(lat, lng), null),
      tracked('climateProjections', getClimateProjections(lat, lng), null),
      tracked('watershed', getWatershed(lat, lng), null),
      tracked('isochrone', getIsochrone(lat, lng), null),
      tracked('eurostatPrice', getEurostatLandPrice(countryCode), null),
      tracked('populationDensity', getPopulationDensity(lat, lng), null),
      tracked('deforestation', getDeforestation(lat, lng), null),
      tracked('landCoverEpochs', getLandCoverEpochs(lat, lng), null),
      tracked('bioTrends', getBiodiversityTrends(lat, lng), null),
      tracked('gbifTrends', getGBIFTrends(lat, lng), null),
    ]);

    // Risk scores (needs climate normals)
    const risks = await tracked('riskScores', getRiskScores(lat, lng, climate), { fire: 0, drought: 0, flood: 0 });

    // ── Process data ─────────────────────────────────────
    const soil = parseSoil(soilRaw);
    const geo = parseGeology(geology);
    const species = summarizeSpecies(speciesCounts);
    const threatenedSummary = summarizeSpecies(threatened);

    // Flood analysis
    let floodAnalysis = { level: 'Unknown', current: null, max: null };
    if (floodData?.daily?.river_discharge) {
      const discharge = floodData.daily.river_discharge.filter(v => v != null);
      if (discharge.length > 0) {
        const avg = discharge.reduce((a, b) => a + b, 0) / discharge.length;
        const max = Math.max(...discharge);
        floodAnalysis = { level: max > avg * 3 ? 'High' : max > avg * 1.5 ? 'Moderate' : 'Low', current: discharge[discharge.length - 1]?.toFixed(1), average: avg.toFixed(1), max: max.toFixed(1) };
      }
    }

    // Fire summaries
    const fireDetections = activeFires?.fires || [];
    const fireSummary = { count: fireDetections.length, highConfidence: fireDetections.filter(f => f.confidence === 'high' || f.confidence === 'h').length, maxFrp: fireDetections.length > 0 ? Math.max(...fireDetections.map(f => f.frp || 0)).toFixed(1) : null, dates: [...new Set(fireDetections.map(f => f.date))].sort(), status: activeFires?.status || 'UNKNOWN' };
    const fireHistory = { yearlyData: historicalFires?.yearlyData || [], totalDetections: historicalFires?.totalDetections || 0, yearsWithFires: historicalFires?.yearsWithFires || 0, mostRecentFireYear: historicalFires?.mostRecentFireYear || null, peakFireYear: historicalFires?.peakFireYear || null, peakFireCount: historicalFires?.peakFireCount || 0, yearsAnalyzed: historicalFires?.yearsAnalyzed || 0, radiusKm: historicalFires?.radiusKm || 25, status: historicalFires?.status || 'UNKNOWN' };

    // Climate summary
    const annualRainfall = climate ? climate.reduce((s, m) => s + m.totalPrecip, 0) : null;
    const annualMeanTemp = climate ? (climate.reduce((s, m) => s + (m.avgHigh + m.avgLow) / 2, 0) / 12).toFixed(1) : null;
    const summerMean = climate ? ((climate[5].avgHigh + climate[5].avgLow + climate[6].avgHigh + climate[6].avgLow + climate[7].avgHigh + climate[7].avgLow) / 6).toFixed(1) : null;
    const winterMean = climate ? ((climate[11].avgHigh + climate[11].avgLow + climate[0].avgHigh + climate[0].avgLow + climate[1].avgHigh + climate[1].avgLow) / 6).toFixed(1) : null;
    let frostDays = null;
    if (climate) { const coldMonths = climate.filter(m => m.avgLow < 2); frostDays = coldMonths.length > 0 ? `${coldMonths.length * 3}–${coldMonths.length * 8}` : '0–2'; }
    let growingSeason = null;
    if (climate) { growingSeason = climate.filter(m => (m.avgHigh + m.avgLow) / 2 >= 10).length * 30; }

    // Water
    const springs = waterFeatures.filter(e => e.tags?.natural === 'spring').length;
    const wells = waterFeatures.filter(e => e.tags?.man_made === 'water_well').length;
    const waterways = waterFeatures.filter(e => e.tags?.waterway).length;
    const waterBodies = waterFeatures.filter(e => e.tags?.natural === 'water').length;
    const waterTotal = springs + wells + waterways + waterBodies;
    let waterScore = 5;
    waterScore += Math.min(springs * 1.5, 3); waterScore += Math.min(wells * 1, 2);
    waterScore += waterways > 0 ? 1 : 0; waterScore += waterBodies > 0 ? 1 : 0;
    if (annualRainfall && annualRainfall > 600) waterScore += 0.5;
    waterScore = Math.min(Math.round(waterScore * 10) / 10, 10);

    // Bio score
    let bioScore = 5;
    if (species.total > 100) bioScore += 2; else if (species.total > 50) bioScore += 1;
    if (threatenedSummary.total > 0) bioScore += 1;
    if (protectedAreas.length > 0) bioScore += 1.5;
    bioScore = Math.min(Math.round(bioScore * 10) / 10, 10);

    const protectedAreaNames = protectedAreas.filter(e => e.tags?.name).map(e => ({ name: e.tags.name, type: e.tags.protect_class || e.tags.designation || 'Protected Area' })).slice(0, 5);
    const infraGroups = {};
    for (const el of infrastructure) { const type = el.tags?.amenity || el.tags?.shop || el.tags?.tourism || 'other'; infraGroups[type] = (infraGroups[type] || 0) + 1; }
    const gbifKingdoms = {};
    let gbifTotal = gbif?.count || 0;
    if (gbif?.facets?.[0]?.counts) { for (const c of gbif.facets[0].counts) gbifKingdoms[c.name] = c.count; }

    const fireRisk = riskLevel(risks.fire);
    const droughtRisk = riskLevel(risks.drought);
    const floodRisk = riskLevel(risks.flood);

    // Derived
    const ddForDerive = { waterScore, bioScore, risks: { fire: { score: risks.fire, ...fireRisk }, drought: { score: risks.drought, ...droughtRisk }, flood: { score: risks.flood, ...floodRisk } }, protectedAreas: protectedAreaNames, species, waterFeatures: { springs, wells, waterways, waterBodies, total: waterTotal }, soil };
    const opportunities = deriveOpportunities(ddForDerive);
    const mitigations = deriveMitigations(ddForDerive);
    const nextSteps = deriveNextSteps(ddForDerive);
    const seasonalCalendar = deriveSeasonalCalendar(climate);
    const carbon = estimateCarbon(landCover, areaHa);
    const propertyName = derivePropertyName(sub.address);
    const naturalCapital = calculateNaturalCapital(landCover, areaHa);
    const ecosystemServices = calculateEcosystemServices(naturalCapital, areaHa);
    const valuation = syntheticValuation(areaHa, landCover, waterScore, bioScore, eurostatPrice);
    const agriculture = calculateAgriculturalRevenue(landCover, areaHa, carbon);
    const municipality = adminUnit?.municipality || sub.address?.split(',').slice(-3, -2)[0]?.trim() || '';

    const soilScore = soil?.ph ? (parseFloat(soil.ph) > 5 && parseFloat(soil.ph) < 8 ? 7 : 5) : 5.5;
    const carbonScore = carbon.stock > 0 ? Math.min(10, Math.round(carbon.stock / areaHa / 15)) : 5;
    const resilienceScore = Math.max(3, 10 - Math.round(Math.max(risks.fire, risks.drought) / 12));
    const radarDims = calculateRadarScores({ waterScore, bioScore, soilScore, carbonScore, resilienceScore }, regional);

    // New computations
    const solarPotential = calculateSolarPotential(pvgis, nasaSolar, areaHa);
    const windPotential = calculateWindPotential(climate);
    const climateChange = calculateClimateChange(climate, climateProjections);

    const maps = buildMapUrls(sub.boundary, [lat, lng]);
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const locationLine = [municipality, adminUnit?.country || 'Portugal'].filter(Boolean).join(', ');
    const climateZone = annualMeanTemp && annualRainfall
      ? (parseFloat(annualMeanTemp) > 14 && annualRainfall < 800 ? 'Csa (Hot-summer Mediterranean)' : parseFloat(annualMeanTemp) > 14 ? 'Csb (Warm-summer Mediterranean)' : 'Cfb (Oceanic)')
      : 'Mediterranean (estimated)';
    const speciesGroups = Object.entries(species.groups || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxSpeciesCount = speciesGroups.length > 0 ? Math.max(...speciesGroups.map(s => s[1])) : 1;

    // Compile all data for HTML builder
    const dd = {
      elevation, forecast: forecast?.daily || null, climate, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason,
      soil, geology: geo, species, threatened: threatenedSummary,
      gbif: { total: gbifTotal, kingdoms: gbifKingdoms },
      flood: floodAnalysis,
      risks: { fire: { score: risks.fire, ...fireRisk }, drought: { score: risks.drought, ...droughtRisk }, flood: { score: risks.flood, ...floodRisk } },
      protectedAreas: protectedAreaNames, waterFeatures: { springs, wells, waterways, waterBodies, total: waterTotal },
      waterScore, bioScore, infrastructure: infraGroups, adminUnit,
      terrainProfile, landCover, carbon, opportunities, mitigations, nextSteps, seasonalCalendar,
      regional, propertyName, naturalCapital, ecosystemServices, valuation, agriculture,
      radarDims, fireSummary, fireHistory,
      // New data
      solarPotential, windPotential, climateChange, climateProjections,
      watershed, isochrone, eurostatPrice, populationDensity,
      deforestation, landCoverEpochs, bioTrends, gbifTrends,
    };
    const prop = { id: sub.id, boundary: sub.boundary, center: [lat, lng], area: sub.area, areaHa: Math.round(areaHa * 100) / 100, perimeter: sub.perimeter ? Math.round(sub.perimeter) : null, address: sub.address || '', email: sub.email, notes: sub.notes };

    // ── Build HTML ───────────────────────────────────────
    const html = buildFullHTML({ dd, prop, maps, soil, geo, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason, gbifTotal, gbifKingdoms, protectedAreaNames, elevation, climate, now, municipality, locationLine, climateZone, speciesGroups, maxSpeciesCount, lat, lng });

    // ── Save to DB ───────────────────────────────────────
    const reports = await getCollection('report_versions');
    const count = await reports.countDocuments();
    const version = `v${count + 1}-full`;
    const slugBase = (prop.address || 'report').split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugBase}-${version}`;

    let blob_url = null;
    try { blob_url = await uploadReportBlob(slug, html, version); } catch (e) { console.error('Blob upload failed:', e.message); }

    const doc = {
      id: crypto.randomUUID(), version, slug, type: 'full',
      name: `${(prop.address || 'Report').split(',')[0]} — Full 18-Section Report`,
      created: new Date().toISOString(), html_content: html, blob_url,
      data_snapshot: { submission: prop, dynamic: dd, maps, apiStatus },
      submission_id: sub.id,
    };

    await reports.insertOne(doc);

    return res.status(201).json({
      id: doc.id, version, slug, name: doc.name, created: doc.created, blob_url,
      apis_called: Object.keys(apiStatus).length,
      apis_succeeded: Object.values(apiStatus).filter(s => s === 'OK').length,
      apis_failed: Object.values(apiStatus).filter(s => s !== 'OK').length,
      apiStatus,
    });

  } catch (err) {
    console.error('Full report generation error:', err);
    return res.status(500).json({ error: 'Generation failed', detail: err.message, stack: err.stack });
  }
}

// ══════════════════════════════════════════════════════════
// HTML TEMPLATE BUILDER — 18 SECTIONS
// ══════════════════════════════════════════════════════════

function buildFullHTML({ dd, prop, maps, soil, geo, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason, gbifTotal, gbifKingdoms, protectedAreaNames, elevation, climate, now, municipality, locationLine, climateZone, speciesGroups, maxSpeciesCount, lat, lng }) {

  // Radar chart SVG helper
  const radarSvg = (() => {
    const cx = 130, cy = 130, r = 100, n = dd.radarDims.length;
    const step = 2 * Math.PI / n;
    let grid = '', axes = '', avgPoly = '', scorePoly = '', dots = '', labels = '';
    [2,4,6,8,10].forEach(lev => {
      const pts = []; for (let i = 0; i < n; i++) { const a = i * step - Math.PI/2; pts.push(`${cx+(r*lev/10)*Math.cos(a)},${cy+(r*lev/10)*Math.sin(a)}`); }
      grid += `<polygon points="${pts.join(' ')}" fill="none" stroke="#e5e2db" stroke-width="1" />`;
    });
    const avgPts = [], scorePts = [];
    dd.radarDims.forEach((d, i) => {
      const a = i * step - Math.PI/2;
      axes += `<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(a)}" y2="${cy+r*Math.sin(a)}" stroke="#e5e2db" />`;
      labels += `<text x="${cx+(r+18)*Math.cos(a)}" y="${cy+(r+18)*Math.sin(a)}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="600" fill="#6b7280">${d.label}</text>`;
      avgPts.push(`${cx+(r*d.avg/10)*Math.cos(a)},${cy+(r*d.avg/10)*Math.sin(a)}`);
      scorePts.push(`${cx+(r*d.score/10)*Math.cos(a)},${cy+(r*d.score/10)*Math.sin(a)}`);
      dots += `<circle cx="${cx+(r*d.score/10)*Math.cos(a)}" cy="${cy+(r*d.score/10)*Math.sin(a)}" r="4" fill="#1B4332" />`;
    });
    return grid + axes + labels + `<polygon points="${avgPts.join(' ')}" fill="#BC6C25" fill-opacity="0.1" stroke="#BC6C25" stroke-width="2" />` + `<polygon points="${scorePts.join(' ')}" fill="#1B4332" fill-opacity="0.2" stroke="#1B4332" stroke-width="2" />` + dots;
  })();

  return `
<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 1: PROPERTY IDENTITY (COVER) -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page cover-page">
  <div class="cover-top">
    <img src="${SITE_ORIGIN}/landbook-logo.png" alt="LandBook" style="height:96px;margin-bottom:8px;" />
    <div class="cover-tagline">Notes from the field.</div>
  </div>
  <div class="cover-middle">
    <div class="cover-property">${dd.propertyName}</div>
    <div class="cover-address">${prop.address.split(',').slice(0, 2).join(',')},<br>${prop.address.split(',').slice(2).join(',').trim()}</div>
    <div class="cover-coords">${lat.toFixed(4)}&deg;N, ${Math.abs(lng).toFixed(4)}&deg;${lng < 0 ? 'W' : 'E'} &nbsp;|&nbsp; ${prop.areaHa} ha</div>
    ${dd.watershed ? `<div style="font-size:12px;color:#888;margin-top:12px;">Within ${dd.watershed.name || 'delineated'} watershed${dd.watershed.area ? ` (${Math.round(dd.watershed.area)} km²)` : ''}</div>` : ''}
    ${synthetic(`<div style="font-size:12px;text-align:center;">Natural Capital Score: <strong>72/100</strong> &nbsp;|&nbsp; Compliance: <strong>Pending</strong></div>`, 'Natural capital score needs weighted aggregation formula; compliance requires EUDR/CSRD registry checks (not yet available)')}
  </div>
  <div class="cover-bottom">
    <img src="${SITE_ORIGIN}/landlibrary-logo.png" alt="LandLibrary" style="height:28px;margin-bottom:12px;" />
    <div class="cover-meta">Generated: ${now} &nbsp;|&nbsp; Version: Full Report v0.1</div>
    <div class="cover-disclaimer"><strong>Disclaimer</strong><br>This assessment represents conditions at time of documentation. Land characteristics evolve; verify critical details before decisions. This report is an invitation to relationship, not a final judgment of value.</div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 2: EXECUTIVE SUMMARY -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 02</div>
  <div class="section-title">Executive Summary</div>
  <div class="section-subtitle">Property overview with natural capital profile</div>

  <div class="chart-container">
    <svg width="260" height="260" viewBox="0 0 260 260">${radarSvg}</svg>
    <div style="display:flex;gap:20px;justify-content:center;font-size:11px;margin-top:4px;">
      <span><span style="display:inline-block;width:12px;height:3px;background:#1B4332;margin-right:4px;vertical-align:middle;"></span>This Property</span>
      <span><span style="display:inline-block;width:12px;height:3px;background:#BC6C25;margin-right:4px;vertical-align:middle;"></span>Regional Average</span>
    </div>
  </div>

  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);">
    ${realKpi(`${prop.areaHa} ha`, 'Area', 'Calculated from boundary')}
    ${dd.valuation.baseSource.startsWith('Eurostat') ? realKpi(`&euro;${dd.valuation.perHa.toLocaleString()}/ha`, 'Value/ha', dd.valuation.baseSource) : syntheticKpi(`&euro;${dd.valuation.perHa.toLocaleString()}/ha`, 'Value/ha', 'Estimated', 'Eurostat NUTS2 baseline or Idealista transaction data')}
    ${realKpi(`${dd.bioScore}/10`, 'Bio Score', 'iNaturalist + GBIF')}
    ${realKpi(`${dd.waterScore}/10`, 'Water Security', 'OSM features + rainfall')}
    ${realKpi(`${dd.carbon.stock} tCO₂e`, 'Carbon Stock', 'Literature × land cover')}
  </div>

  <h3>Key Opportunities</h3>
  <div class="cards-grid">
    ${dd.opportunities.map(o => `<div class="card"><div class="card-title">${o.title}</div><div style="font-size:9px;color:var(--text-muted);margin-top:4px;">${o.reason}</div></div>`).join('')}
  </div>

  <h3>Risk Summary</h3>
  <div class="risk-row"><div class="risk-dot ${dd.risks.fire.cls}"></div><div class="risk-label">Fire Risk</div><div class="risk-value">${dd.risks.fire.out5}/5 (${dd.risks.fire.level})</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.flood.cls}"></div><div class="risk-label">Flood Risk</div><div class="risk-value">${dd.risks.flood.out5}/5 (${dd.risks.flood.level})</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.drought.cls}"></div><div class="risk-label">Drought Risk</div><div class="risk-value">${dd.risks.drought.out5}/5 (${dd.risks.drought.level})</div></div>

  ${synthetic(`<div><strong>Compliance Quick Check:</strong> EUDR — Pending | CSRD — Not assessed | ICNF APP — Not submitted</div>`, 'EUDR Information System (delayed to Dec 2026), CSRD ESRS taxonomy, ICNF APP portal')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 3: VALUE COMPOSITION -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 03</div>
  <div class="section-title">Value Composition</div>
  <div class="section-subtitle">Ecosystem services breakdown (TEEB methodology)</div>

  <h3>Annual Ecosystem Services Value: &euro;${dd.ecosystemServices.total.toLocaleString()}/yr</h3>
  ${dd.ecosystemServices.items.map(e => `<div class="bar-row"><div class="bar-label">${e.service}</div><div class="bar-track"><div class="bar-fill green" style="width:${dd.ecosystemServices.total > 0 ? (e.value / dd.ecosystemServices.items[0].value * 100).toFixed(0) : 0}%">&euro;${e.value.toLocaleString()}</div></div></div>`).join('')}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: TEEB database coefficients for Mediterranean ecosystems (LITERATURE)</div>

  <h3>Natural Capital by Land Cover</h3>
  <table class="data-table">
    <thead><tr><th>Land Cover</th><th>Area (ha)</th><th>&euro;/ha/yr</th><th>Annual Value</th></tr></thead>
    <tbody>${dd.naturalCapital.details.map(d => `<tr><td class="label">${d.label}</td><td>${d.area}</td><td>&euro;${d.ratePerHa.toLocaleString()}</td><td class="value">&euro;${d.annual.toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>

  ${synthetic(`<h3>30-Year NPV Projection</h3><div>Estimated 30-year NPV at 3% discount rate: <strong>&euro;${Math.round(dd.ecosystemServices.total * 20).toLocaleString()}</strong> (conservative)</div>`, 'Requires discount rate assumptions and growth projections. Could use INE Portugal land value time series for trend data.')}

  ${synthetic(`<h3>Gift Flow Diagram</h3><div style="text-align:center;padding:20px;color:var(--text-muted);">This property contributes water filtration, carbon sequestration, and habitat provision to its bioregion. These flows exist outside market exchange and represent the property's gift to the commons.</div>`, 'Sacred Economics framework — requires community survey data and relationship mapping')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 4: NATURAL CAPITAL SCORECARD -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 04</div>
  <div class="section-title">Natural Capital Scorecard</div>
  <div class="section-subtitle">Five-dimension profile with regional comparison</div>

  <table class="data-table">
    <thead><tr><th>Dimension</th><th>Score</th><th>Regional Avg</th><th>Basis</th></tr></thead>
    <tbody>
      ${dd.radarDims.map(d => `<tr><td class="label">${d.label}</td><td class="value">${d.score}/10</td><td>${d.avg}/10</td><td>${
        d.label === 'Water' ? dd.waterFeatures.springs + ' springs, ' + dd.waterFeatures.wells + ' wells, ' + annualRainfall + 'mm rain' :
        d.label === 'Biodiversity' ? dd.species.total + ' species, ' + dd.threatened.total + ' threatened' :
        d.label === 'Soil' ? (soil ? 'pH ' + soil.ph + ', OC ' + soil.organicCarbon + 'g/kg' : 'Default') :
        d.label === 'Carbon' ? dd.carbon.stock + ' tCO2e estimated' : 'Derived from risk scores'
      }</td></tr>`).join('')}
    </tbody>
  </table>

  ${synthetic(`<h3>Connectivity Score</h3><div>Estimated habitat connectivity: <strong>6.2/10</strong><br>Based on ${protectedAreaNames.length} protected areas within 25km and land cover fragmentation.</div>`, 'Circuitscape analysis, or compute from Natura 2000 polygon proximity + CORINE land cover matrix')}

  ${synthetic(`<h3>Score Evolution Timeline</h3><div style="text-align:center;padding:16px;color:var(--text-muted);">Historical score tracking requires multi-year data collection. Recommend establishing baseline monitoring protocol.</div>`, 'Sentinel-2 NDVI time series for vegetation quality trend; repeated iNaturalist surveys for biodiversity trend')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 5: TERRAIN AND LANDSCAPE -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 05</div>
  <div class="section-title">Terrain and Landscape</div>
  <div class="section-subtitle">Topography, soils, and land cover analysis</div>

  <h3>5.1 Elevation & Slope</h3>
  ${dd.terrainProfile ? `
  <div class="kpi-grid">
    ${realKpi(`${dd.terrainProfile.min}–${dd.terrainProfile.max}m`, 'Elevation Range', `${dd.terrainProfile.range}m difference`)}
    ${realKpi(`${dd.terrainProfile.slopePct}%`, 'Avg Slope', dd.terrainProfile.slopeCategory)}
    ${realKpi(dd.terrainProfile.aspect, 'Aspect', 'Primary orientation')}
    ${realKpi(`${dd.terrainProfile.avg}m`, 'Mean Elevation', 'Open-Meteo DEM')}
  </div>` : `${realKpi(elevation != null ? elevation + 'm' : 'N/A', 'Elevation', 'Open-Meteo DEM')}`}

  <h3>5.2 Soil Composition</h3>
  ${soil ? `
  <table class="data-table">
    <thead><tr><th>Property</th><th>Value</th><th>Depth</th></tr></thead>
    <tbody>
      <tr><td class="label">Classification</td><td class="value">${soil.classification || 'N/A'}</td><td>—</td></tr>
      <tr><td class="label">Clay / Sand / Silt</td><td class="value">${soil.clay || '?'}% / ${soil.sand || '?'}% / ${soil.silt || '?'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">pH</td><td class="value">${soil.ph || 'N/A'}</td><td>0–5cm</td></tr>
      <tr><td class="label">Organic Carbon</td><td class="value">${soil.organicCarbon || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Nitrogen</td><td class="value">${soil.nitrogen || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">CEC</td><td class="value">${soil.cec || 'N/A'} cmol/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Bulk Density</td><td class="value">${soil.bulkDensity || 'N/A'} g/cm³</td><td>0–5cm</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: SoilGrids 2.0 (ISRIC) — 250m resolution</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Soil data unavailable.</div>'}

  <h3>5.3 Land Cover</h3>
  ${dd.landCover.breakdown.length > 0 ? dd.landCover.breakdown.map(lc => `<div class="bar-row"><div class="bar-label">${lc.label}</div><div class="bar-track"><div class="bar-fill sky" style="width:${lc.pct}%">${lc.pct}%</div></div></div>`).join('') + `<div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: ${dd.landCover.source}</div>` : '<div style="color:var(--text-muted);">Land cover unavailable.</div>'}

  <h3>5.4 Land Cover Change Detection</h3>
  ${dd.landCoverEpochs ? `
  <table class="data-table">
    <thead><tr><th>Year</th><th>Land Cover Class</th><th>CORINE Code</th></tr></thead>
    <tbody>${dd.landCoverEpochs.epochs.map(e => `<tr><td class="label">${e.year}</td><td class="value">${e.label}</td><td>${e.code || '—'}</td></tr>`).join('')}</tbody>
  </table>
  ${dd.landCoverEpochs.transitions.length > 0 ? `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-top:8px;"><strong>Transitions detected:</strong><br>${dd.landCoverEpochs.transitions.map(t => `${t.period}: ${t.from} → ${t.to}`).join('<br>')}</div>` : '<div style="font-size:12px;color:var(--text-muted);">No land cover transitions detected (stable land use).</div>'}
  <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Source: ${dd.landCoverEpochs.source}</div>
  ` : synthetic('<div>Land cover change data unavailable for this location.</div>', 'CORINE WMS GetFeatureInfo for epochs 2000/2006/2012/2018 (Europe only)')}

  ${synthetic(`<h3>5.5 Wound Index & Erosion</h3><div>Wound Index: <strong>Not assessed</strong> — requires field survey or Sentinel-2 NDVI anomaly analysis.<br>Erosion risk: Estimated from slope (${dd.terrainProfile?.slopePct || '?'}%) × rainfall (${annualRainfall || '?'}mm) × soil erodibility.</div>`, 'ESDAC RUSLE2015 pre-computed erosion layers (100m, EU), or compute from RUSLE factors using existing slope/soil/climate data')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 6: WATER RESOURCES -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 06</div>
  <div class="section-title">Water Resources</div>
  <div class="section-subtitle">Water inventory, security, and seasonal patterns</div>

  <h3>6.1 Water Sources Inventory</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    ${realKpi(dd.waterFeatures.springs, 'Springs', 'OSM/Overpass')}
    ${realKpi(dd.waterFeatures.wells, 'Wells', 'OSM/Overpass')}
    ${realKpi(dd.waterFeatures.waterways, 'Waterways', 'OSM/Overpass')}
    ${realKpi(dd.waterFeatures.waterBodies, 'Water Bodies', 'OSM/Overpass')}
  </div>

  <h3>6.2 Water Security Index</h3>
  <div style="display:flex;align-items:center;gap:12px;margin:16px 0;">
    <div class="score-label" style="font-size:14px;font-weight:700;">Water Security</div>
    <div class="score-track" style="flex:1;height:14px;"><div class="score-fill" style="width:${dd.waterScore * 10}%;background:var(--sky-dark);"></div></div>
    <div class="score-value" style="color:var(--sky-dark);">${dd.waterScore}/10</div>
  </div>

  <h3>6.3 Annual Water Provisioning</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
    ${realKpi(`${annualRainfall || 'N/A'}mm`, 'Annual Rainfall', 'Open-Meteo Archive (30yr)')}
    ${realKpi(`${dd.naturalCapital.services.provisioning ? '&euro;' + Math.round(dd.naturalCapital.services.provisioning * 0.3).toLocaleString() + '/yr' : 'N/A'}`, 'Water Provisioning Value', 'TEEB (30% of provisioning)')}
  </div>

  ${synthetic(`<h3>6.4 Seasonal Flow Pattern</h3><div>Derived from monthly rainfall: ${climate ? climate.map(m => m.month + ': ' + m.totalPrecip + 'mm').join(', ') : 'No climate data'}</div>`, 'SNIRH gauging stations (Portugal) for actual stream flow data. REST services at sniambgeoogc.apambiente.pt')}

  ${synthetic(`<h3>6.5 Downstream Obligations & Legal Status</h3><div>Water body status under Water Framework Directive: <strong>Not assessed</strong></div>`, 'SNIRH/APA water body status registry, water user association records')}

  ${synthetic(`<h3>6.6 Future Water Stress</h3><div>${dd.climateChange ? `Projected precipitation change by 2050: <strong>${dd.climateChange.changes?.['2045-2050']?.precipChangePct || '?'}%</strong>` : 'Climate projection data unavailable.'}</div>`, 'Open-Meteo Climate API provides projections; SNIRH for historical water availability trends')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 7: CLIMATE PROFILE -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 07</div>
  <div class="section-title">Climate Profile</div>
  <div class="section-subtitle">${climate ? '30-year climate normals with future projections' : 'Climate data unavailable'}</div>

  <h3>7.1 Climate Summary</h3>
  ${climate ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    ${realKpi(`${annualMeanTemp}&deg;C`, 'Annual Mean', 'Open-Meteo Archive')}
    ${realKpi(`${annualRainfall}mm`, 'Annual Rainfall', 'Open-Meteo Archive')}
    ${realKpi(`~${growingSeason} days`, 'Growing Season', 'Derived from climate')}
  </div>
  <table class="data-table">
    <thead><tr><th>Month</th><th>Avg High</th><th>Avg Low</th><th>Rainfall</th><th>Wind (avg)</th></tr></thead>
    <tbody>${climate.map(m => `<tr><td class="label">${m.month}</td><td class="value">${m.avgHigh}&deg;C</td><td>${m.avgLow}&deg;C</td><td>${m.totalPrecip}mm</td><td>${m.avgWindMean || '—'} km/h</td></tr>`).join('')}</tbody>
  </table>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Climate data unavailable.</div>'}

  <h3>7.2 Seasonal Calendar</h3>
  ${dd.seasonalCalendar ? `<div class="season-grid">${dd.seasonalCalendar.map(s => `<div class="season-card"><div class="period">${s.period}</div><span class="risk-tag ${s.tag}">${s.risk}</span><div style="margin-top:6px;color:var(--text-muted);">${s.notes}</div></div>`).join('')}</div>` : '<div style="color:var(--text-muted);">No data.</div>'}

  <h3>7.3 Future Climate Scenarios (CMIP6)</h3>
  ${dd.climateChange ? `
  <table class="data-table">
    <thead><tr><th>Period</th><th>Temp Change</th><th>Precip Change</th><th>Model</th></tr></thead>
    <tbody>
      <tr><td class="label">Baseline (30yr avg)</td><td class="value">${dd.climateChange.currentAvgTemp}&deg;C</td><td>${dd.climateChange.currentAnnualPrecip}mm</td><td>Open-Meteo Archive</td></tr>
      ${Object.entries(dd.climateChange.changes).map(([period, c]) => `<tr><td class="label">${period}</td><td class="value">${c.tempChange ? (parseFloat(c.tempChange) > 0 ? '+' : '') + c.tempChange + '°C' : '—'}</td><td>${c.precipChangePct != null ? (c.precipChangePct > 0 ? '+' : '') + c.precipChangePct + '%' : '—'}</td><td>${dd.climateChange.model}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: ${dd.climateChange.source}</div>
  ` : synthetic('<div>Climate projection data unavailable.</div>', 'Open-Meteo Climate API (CMIP6 HighResMIP, global, free, no key)')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 8: BIODIVERSITY INVENTORY -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 08</div>
  <div class="section-title">Biodiversity Inventory</div>
  <div class="section-subtitle">${dd.species.total} species observed within 15km</div>

  <h3>8.1 Species by Group</h3>
  ${speciesGroups.length > 0 ? speciesGroups.map(([group, count]) => `<div class="bar-row"><div class="bar-label">${group}</div><div class="bar-track"><div class="bar-fill green" style="width:${(count / maxSpeciesCount * 100).toFixed(0)}%">${count}</div></div></div>`).join('') : '<div style="color:var(--text-muted);">No species data.</div>'}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: iNaturalist (15km radius)</div>

  <h3>8.2 Notable Species</h3>
  ${dd.species.topSpecies.length > 0 ? `<table class="data-table"><thead><tr><th>Species</th><th>Group</th><th>Observations</th><th>Threatened</th></tr></thead><tbody>${dd.species.topSpecies.slice(0, 8).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td><td>${s.threatened ? 'Yes' : '—'}</td></tr>`).join('')}</tbody></table>` : ''}

  ${dd.threatened.total > 0 ? `<h3>8.3 Threatened Species (${dd.threatened.total})</h3><table class="data-table"><thead><tr><th>Species</th><th>Group</th><th>Observations</th></tr></thead><tbody>${dd.threatened.topSpecies.slice(0, 6).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td></tr>`).join('')}</tbody></table>` : ''}

  <h3>8.4 Biodiversity Trends</h3>
  ${dd.bioTrends ? `
  <div style="display:flex;align-items:flex-end;gap:4px;height:80px;margin:12px 0;">
    ${(() => { const maxC = Math.max(...dd.bioTrends.yearly.map(y => y.speciesCount), 1); return dd.bioTrends.yearly.map(y => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="font-size:9px;font-weight:600;color:var(--green);">${y.speciesCount}</div><div style="width:100%;height:${Math.max(2, y.speciesCount / maxC * 100)}%;background:var(--green);border-radius:2px 2px 0 0;min-height:2px;"></div><div style="font-size:8px;color:var(--text-muted);">${y.year}</div></div>`).join(''); })()}
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Source: ${dd.bioTrends.source}</div>
  ` : synthetic('<div>Biodiversity trend data unavailable.</div>', 'iNaturalist API with d1/d2 date range params (free, 100 req/min)')}

  <h3>8.5 GBIF Occurrence Trends</h3>
  ${dd.gbifTrends ? `
  <table class="data-table">
    <thead><tr><th>Year</th><th>Occurrences</th></tr></thead>
    <tbody>${dd.gbifTrends.yearly.map(y => `<tr><td class="label">${y.year}</td><td class="value">${y.occurrences.toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: ${dd.gbifTrends.source}</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">GBIF trend data unavailable.</div>'}

  ${synthetic(`<h3>8.6 Future Biodiversity Scenarios</h3><div>Species distribution modeling under climate change requires CMIP6 projections + species habitat range data. Not yet implemented.</div>`, 'IPBES projections, species distribution models (MaxEnt), or GBIF + climate envelope modeling')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 9: AGRICULTURAL POTENTIAL -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 09</div>
  <div class="section-title">Agricultural Potential</div>
  <div class="section-subtitle">Revenue models by land cover type</div>

  <h3>9.1 Revenue by Land Use</h3>
  ${dd.agriculture.models.length > 0 ? `<table class="data-table"><thead><tr><th>Model</th><th>Land Cover</th><th>Area (ha)</th><th>Annual Revenue</th><th>Basis</th></tr></thead><tbody>${dd.agriculture.models.map(m => `<tr><td class="label">${m.label}</td><td>${m.landCover || '—'}</td><td>${m.area || '—'}</td><td class="value">&euro;${m.annual.toLocaleString()}</td><td>${m.approach}</td></tr>`).join('')}</tbody></table>` : ''}

  <h3>9.2 Revenue Scenarios</h3>
  ${dd.agriculture.scenarios.map(s => { const maxVal = Math.max(...dd.agriculture.scenarios.map(x => x.value)); return `<div class="bar-row"><div class="bar-label">${s.scenario}</div><div class="bar-track"><div class="bar-fill terra" style="width:${maxVal > 0 ? (s.value / maxVal * 100).toFixed(0) : 0}%">&euro;${s.value.toLocaleString()}/yr</div></div></div>`; }).join('')}

  <h3>9.3 Carbon Stock & Sequestration</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    ${realKpi(`${dd.carbon.stock} tCO₂e`, 'Carbon Stock', dd.carbon.method)}
    ${realKpi(`${dd.carbon.annual} tCO₂e/yr`, 'Sequestration', '~2% of stock')}
    ${realKpi(dd.carbon.creditValue || 'N/A', 'Credit Value', '@ €65-80/t')}
  </div>

  ${synthetic(`<h3>9.4 Stewardship Ledger</h3><div>The Stewardship Ledger tracks non-monetary contributions: seed saving, knowledge sharing, habitat creation, fire prevention labor. This is a qualitative framework that requires community input.</div>`, 'Sacred Economics framework — community survey and participatory mapping')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 10: REVENUE OPPORTUNITIES -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 10</div>
  <div class="section-title">Revenue Opportunities</div>

  <h3>10.1 Valuation Scenarios</h3>
  <table class="data-table">
    <thead><tr><th>Scenario</th><th>Total</th><th>&euro;/ha</th><th>Basis</th></tr></thead>
    <tbody>
      <tr><td class="label">Conservative</td><td class="value">&euro;${dd.valuation.conservative.total.toLocaleString()}</td><td>&euro;${dd.valuation.conservative.perHa.toLocaleString()}</td><td>${dd.valuation.baseSource}</td></tr>
      <tr><td class="label">Market</td><td class="value">&euro;${dd.valuation.market.total.toLocaleString()}</td><td>&euro;${dd.valuation.market.perHa.toLocaleString()}</td><td>${dd.valuation.baseSource}</td></tr>
      <tr><td class="label">Optimistic</td><td class="value">&euro;${dd.valuation.optimistic.total.toLocaleString()}</td><td>&euro;${dd.valuation.optimistic.perHa.toLocaleString()}</td><td>+ natural capital premium</td></tr>
    </tbody>
  </table>
  ${!dd.valuation.baseSource.startsWith('Eurostat') ? synthetic(`<div>Base rate (€22,000/ha) is a hardcoded Portuguese rural land estimate.</div>`, 'Eurostat apri_lprc API (NUTS2 agricultural land prices), or Idealista/property transaction data') : ''}

  ${synthetic(`<h3>10.2 Gift Economy & Commons</h3><div>Access-based revenue models, land trust transition pathways, and gift economy potential require policy analysis and community engagement frameworks.</div>`, 'Policy research, legal framework analysis, community cooperative models')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 11: RISK ASSESSMENT -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 11</div>
  <div class="section-title">Risk Assessment</div>

  <h3>11.1 Risk Scores</h3>
  <table class="data-table">
    <thead><tr><th>Risk</th><th>Score</th><th>Level</th><th>Basis</th></tr></thead>
    <tbody>
      <tr><td class="label">Fire</td><td class="value">${dd.risks.fire.score}/100</td><td><span class="risk-tag ${dd.risks.fire.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.fire.level.toUpperCase()}</span></td><td>Temp, precip, wind, season</td></tr>
      <tr><td class="label">Drought</td><td class="value">${dd.risks.drought.score}/100</td><td><span class="risk-tag ${dd.risks.drought.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.drought.level.toUpperCase()}</span></td><td>Precip vs 30yr seasonal avg</td></tr>
      <tr><td class="label">Flood</td><td class="value">${dd.risks.flood.score}/100</td><td><span class="risk-tag ${dd.risks.flood.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.flood.level.toUpperCase()}</span></td><td>Recent precipitation</td></tr>
    </tbody>
  </table>

  <h3>11.2 Fire History (${dd.fireHistory.yearsAnalyzed}yr)</h3>
  ${dd.fireHistory.status === 'OK' && dd.fireHistory.totalDetections > 0 ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    ${realKpi(dd.fireHistory.totalDetections.toLocaleString(), 'Total Detections', `${dd.fireHistory.yearsAnalyzed}yr, ${dd.fireHistory.radiusKm}km`)}
    ${realKpi(`${dd.fireHistory.yearsWithFires}/${dd.fireHistory.yearsAnalyzed}`, 'Years with Fire', '')}
    ${realKpi(dd.fireHistory.peakFireYear || '—', 'Worst Year', `${dd.fireHistory.peakFireCount} detections`)}
    ${realKpi(dd.fireHistory.mostRecentFireYear || '—', 'Most Recent', '')}
  </div>
  <div style="margin-top:12px;display:flex;align-items:flex-end;gap:2px;height:60px;">
    ${dd.fireHistory.yearlyData.map(y => { const pct = Math.max(2, (y.count / (dd.fireHistory.peakFireCount || 1)) * 100); const color = y.count === 0 ? 'var(--border)' : y.count === dd.fireHistory.peakFireCount ? 'var(--red)' : 'var(--amber)'; return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;" title="${y.year}: ${y.count}"><div style="width:100%;height:${pct}%;background:${color};border-radius:2px 2px 0 0;min-height:2px;"></div><div style="font-size:8px;color:var(--text-muted);">${String(y.year).slice(2)}</div></div>`; }).join('')}
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: NASA FIRMS MODIS Archive</div>
  ` : dd.fireHistory.status === 'OK' ? '<div style="background:var(--green-pale);padding:16px;border-radius:8px;border-left:3px solid var(--green);">No fire detections in the past ' + dd.fireHistory.yearsAnalyzed + ' years within ' + dd.fireHistory.radiusKm + 'km.</div>' : `<div style="color:var(--text-muted);">Fire history: ${dd.fireHistory.status}</div>`}

  <h3>11.3 Seasonal Risk Calendar</h3>
  ${dd.seasonalCalendar ? `<div class="season-grid">${dd.seasonalCalendar.map(s => `<div class="season-card"><div class="period">${s.period}</div><span class="risk-tag ${s.tag}">${s.risk}</span><div style="margin-top:6px;color:var(--text-muted);">${s.notes}</div></div>`).join('')}</div>` : ''}

  <h3>11.4 Mitigation Recommendations</h3>
  <ul class="checklist">${dd.mitigations.map(m => `<li><span class="check-box"></span>${m}</li>`).join('')}</ul>
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 12: RESILIENCY ASSESSMENT -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 12</div>
  <div class="section-title">Resiliency Assessment</div>
  <div class="section-subtitle">Water resilience and energy potential</div>

  <h3>12.1 Water Resilience</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    ${realKpi(`${dd.waterScore}/10`, 'Water Security', 'Computed')}
    ${realKpi(`${annualRainfall || '?'}mm`, 'Annual Rainfall', 'Open-Meteo')}
    ${realKpi(`${dd.waterFeatures.total}`, 'Water Sources', 'OSM/Overpass')}
  </div>

  <h3>12.2 Solar Capacity</h3>
  ${dd.solarPotential ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    ${realKpi(`${dd.solarPotential.annualEnergyPerKwp ? Math.round(dd.solarPotential.annualEnergyPerKwp) : '?'} kWh`, 'Annual/kWp', dd.solarPotential.source)}
    ${realKpi(`${dd.solarPotential.optimalAngle}&deg;`, 'Optimal Tilt', dd.solarPotential.source)}
    ${realKpi(`${dd.solarPotential.potentialCapacity} kWp`, 'Potential Capacity', '20% land use')}
    ${realKpi(`${Math.round(dd.solarPotential.potentialOutput / 1000)} MWh/yr`, 'Potential Output', 'Estimated')}
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Source: ${dd.solarPotential.source}</div>
  ` : synthetic('<div>Solar irradiance data unavailable.</div>', 'PVGIS v5.3 (EU JRC, free, global) or NASA POWER API')}

  <h3>12.3 Wind Potential</h3>
  ${dd.windPotential ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    ${realKpi(`${dd.windPotential.annualMean10m} km/h`, 'Avg Wind (10m)', 'Open-Meteo Archive')}
    ${realKpi(`${dd.windPotential.estimatedAt50m} km/h`, 'Est. at 50m', 'Power law extrapolation')}
    ${realKpi(dd.windPotential.powerClass, 'Power Class', 'IEC classification')}
    ${realKpi(`${dd.windPotential.estimatedAnnualOutput} kWh`, '10kW Turbine Est.', 'Annual output')}
  </div>
  ` : synthetic('<div>Wind data unavailable.</div>', 'Open-Meteo Archive with wind_speed_10m parameters')}

  ${synthetic(`<h3>12.4 Micro-Hydro Potential</h3><div>Requires stream flow analysis and head measurement. ${dd.waterFeatures.waterways} waterways detected nearby. Elevation drop across property: ${dd.terrainProfile?.range || '?'}m.</div>`, 'SNIRH stream gauging data + DEM-derived head calculation')}

  ${synthetic(`<h3>12.5 Geothermal Potential</h3><div>Shallow ground temperature at this latitude (~${lat.toFixed(0)}°N): estimated 14-16°C stable. Ground-source heat pump COP: ~4.0 estimated.</div>`, 'IHFC Global Heat Flow Database (91k measurements, open access at heatflow.world)')}

  ${synthetic(`<h3>12.6 Biomass Energy</h3><div>Based on land cover (${dd.landCover.breakdown.length > 0 ? dd.landCover.breakdown[0].label : 'unknown'}), estimated biomass productivity: 2-5 tonnes/ha/year. Energy content: ~18 GJ/tonne.</div>`, 'Land cover × published biomass productivity coefficients (ICNF forest inventory data)')}

  ${synthetic(`<h3>12.7 Energy Independence Score</h3><div style="text-align:center;"><strong>Score: 45/100</strong> (estimated)<br>Composite of solar (${dd.solarPotential ? 'available' : 'unknown'}), wind (${dd.windPotential ? dd.windPotential.powerClass : 'unknown'}), biomass, hydro potential.</div>`, 'Weighted composite of all energy assessments above. Needs load profile estimation for accuracy.')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 13: MULTI-SCALE CONTEXT -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 13</div>
  <div class="section-title">Multi-Scale Context</div>
  <div class="section-subtitle">Bioregion, watershed, and 15-minute neighbourhood</div>

  <h3>13.1 Watershed</h3>
  ${dd.watershed ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
    ${realKpi(dd.watershed.name || 'Delineated watershed', 'Watershed', dd.watershed.source)}
    ${realKpi(dd.watershed.area ? Math.round(dd.watershed.area) + ' km²' : 'N/A', 'Watershed Area', dd.watershed.source)}
  </div>
  ` : synthetic('<div>Watershed delineation unavailable.</div>', 'mghydro.com API (free, global, returns GeoJSON watershed polygon)')}

  <h3>13.2 15-Minute Radius</h3>
  ${dd.isochrone ? `<div style="background:var(--green-pale);padding:16px;border-radius:8px;border-left:3px solid var(--green);">15-minute driving isochrone calculated successfully. Area accessible within 15 minutes by car from property center.</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Source: ${dd.isochrone.source}</div>` : synthetic('<div>Isochrone data unavailable.</div>', 'Mapbox Isochrone API (uses existing token, free tier)')}

  <h3>13.3 Community Infrastructure (within ~5km)</h3>
  ${Object.keys(dd.infrastructure).length > 0 ? `<table class="data-table"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${Object.entries(dd.infrastructure).sort((a, b) => b[1] - a[1]).map(([type, count]) => `<tr><td class="label">${type}</td><td class="value">${count}</td></tr>`).join('')}</tbody></table>` : '<div style="color:var(--text-muted);">No infrastructure found nearby.</div>'}

  <h3>13.4 Population Context</h3>
  ${dd.populationDensity ? `<div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">${realKpi(`${dd.populationDensity.density}`, 'People/km²', dd.populationDensity.source)}${realKpi(dd.populationDensity.density < 25 ? 'Rural' : dd.populationDensity.density < 100 ? 'Semi-rural' : 'Suburban', 'Classification', 'Density-based')}</div>` : synthetic('<div>Population density: unknown</div>', 'WorldPop ArcGIS ImageServer (100m resolution, global, free)')}

  <h3>13.5 Land Price Context</h3>
  ${dd.eurostatPrice ? `<div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">${realKpi(`&euro;${dd.eurostatPrice.pricePerHa.toLocaleString()}/ha`, 'Eurostat Avg', `${dd.eurostatPrice.country} (${dd.eurostatPrice.year})`)}${realKpi(`&euro;${dd.valuation.perHa.toLocaleString()}/ha`, 'This Property (est.)', dd.valuation.baseSource)}</div>` : synthetic('<div>Regional land price data unavailable.</div>', 'Eurostat apri_lprc API (NUTS2 agricultural prices, free, no key)')}

  ${synthetic(`<h3>13.6 Bioregional Context</h3><div><strong>Bioregion:</strong> Odemira / Alentejo Litoral (estimated)<br><strong>Key characteristics:</strong> Mediterranean climate, montado landscape, cork oak economy, coastal influence<br><strong>Challenges:</strong> Fire regimes, drought cycles, rural depopulation, tourism pressure</div>`, 'DMEER (Digital Map of European Ecological Regions) for bioregion boundaries; ICNF regional plans for challenges/opportunities')}

  ${synthetic(`<h3>13.7 Neighbourhood Cooperation</h3><div>Potential for: machinery sharing, joint marketing, fire prevention mutual aid, skill exchange. Based on ${Object.values(dd.infrastructure).reduce((a,b)=>a+b, 0)} amenities and ${dd.populationDensity?.density || '?'} people/km² density.</div>`, 'Community survey data, OSM analysis of neighbouring properties')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 14: TEMPORAL DYNAMICS -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 14</div>
  <div class="section-title">Temporal Dynamics</div>
  <div class="section-subtitle">Change analysis and future scenarios</div>

  <h3>14.1 Land Cover Change (CORINE)</h3>
  ${dd.landCoverEpochs ? `
  <table class="data-table">
    <thead><tr><th>Year</th><th>Land Cover</th></tr></thead>
    <tbody>${dd.landCoverEpochs.epochs.map(e => `<tr><td class="label">${e.year}</td><td class="value">${e.label}</td></tr>`).join('')}</tbody>
  </table>
  ` : synthetic('<div>CORINE epoch comparison unavailable (Europe only).</div>', 'CORINE WMS GetFeatureInfo queries for layers 0/4/8/12')}

  <h3>14.2 Deforestation / Tree Cover Loss</h3>
  ${dd.deforestation ? `<div style="background:var(--bg);padding:16px;border-radius:8px;"><pre style="font-size:11px;white-space:pre-wrap;">${JSON.stringify(dd.deforestation.yearlyLoss, null, 2).slice(0, 500)}</pre></div><div style="font-size:11px;color:var(--text-muted);">Source: ${dd.deforestation.source}</div>` : synthetic('<div>Deforestation data unavailable.</div>', 'OpenEPI API (Global Forest Watch, free, global, no key)')}

  <h3>14.3 Climate Change Projections</h3>
  ${dd.climateChange ? `<table class="data-table"><thead><tr><th>Period</th><th>Avg Temp</th><th>Annual Precip</th><th>Change</th></tr></thead><tbody>${Object.entries(dd.climateChange.changes).map(([period, c]) => `<tr><td class="label">${period}</td><td class="value">${c.tempChange ? (parseFloat(c.tempChange) > 0 ? '+' : '') + c.tempChange + '°C' : '—'}</td><td>${c.precipChange != null ? (c.precipChange > 0 ? '+' : '') + c.precipChange + 'mm' : '—'}</td><td>${c.precipChangePct != null ? (c.precipChangePct > 0 ? '+' : '') + c.precipChangePct + '% precip' : '—'}</td></tr>`).join('')}</tbody></table>` : synthetic('<div>No projection data.</div>', 'Open-Meteo Climate API (CMIP6)')}

  ${synthetic(`<h3>14.4 Socio-Economic Trends</h3><div>Population trend, agricultural employment shifts, and ownership patterns require national statistics time series data.</div>`, 'INE Portugal (municipal population time series), Eurostat NUTS3 (employment by sector)')}

  ${synthetic(`<h3>14.5 Future Scenarios</h3><div>Scenario matrix: Business as Usual, Climate Resilience, Conservation Restoration, Intensification, Abandonment. Each requires integrating climate projections with land management choices.</div>`, 'Custom modeling using CMIP6 projections + land use scenarios')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 15: MAP PORTFOLIO -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 15</div>
  <div class="section-title">Map Portfolio</div>
  <div class="section-subtitle">Geospatial layers for this property</div>

  <div class="map-grid">
    <div class="map-item">${maps.satellite ? `<img src="${maps.satellite}" alt="Satellite" loading="lazy" />` : '<div class="map-placeholder">Satellite (no token)</div>'}<div class="map-label">Satellite & Boundary</div></div>
    <div class="map-item">${maps.topography ? `<img src="${maps.topography}" alt="Topography" loading="lazy" />` : '<div class="map-placeholder">Topography</div>'}<div class="map-label">Topography & Hydrology</div></div>
    <div class="map-item"><img src="${maps.soilClay}" alt="Soil Clay" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>Soil layer unavailable</div>'" /><div class="map-label">Soil — Clay Content</div></div>
    <div class="map-item"><img src="${maps.soilPh}" alt="Soil pH" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>Soil pH unavailable</div>'" /><div class="map-label">Soil — pH</div></div>
    <div class="map-item"><img src="${maps.landCoverCorine}" alt="CORINE" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>CORINE unavailable</div>'" /><div class="map-label">Land Cover — CORINE 2018</div></div>
    <div class="map-item"><img src="${maps.landCoverWorldcover}" alt="WorldCover" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>WorldCover unavailable</div>'" /><div class="map-label">Land Cover — ESA WorldCover</div></div>
    <div class="map-item"><img src="${maps.fireDanger}" alt="Fire Danger" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>EFFIS unavailable</div>'" /><div class="map-label">Fire Danger (EFFIS)</div></div>
    <div class="map-item">${maps.waterResources ? `<img src="${maps.waterResources}" alt="Water" loading="lazy" />` : '<div class="map-placeholder">Water resources</div>'}<div class="map-label">Water Resources</div></div>
  </div>

  ${synthetic(`<div class="map-grid"><div class="map-item"><div class="map-placeholder">Multi-scale context map<br>(property + watershed + bioregion + 15-min radius)</div><div class="map-label">Multi-Scale Context</div></div><div class="map-item"><div class="map-placeholder">15-minute isochrone accessibility map</div><div class="map-label">15-Min Accessibility</div></div></div>`, 'Mapbox Static API with custom GeoJSON overlays from watershed + isochrone data; Global Solar Atlas WMS for solar potential map')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 16: COMPLIANCE & REGULATORY -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 16</div>
  <div class="section-title">Compliance & Regulatory</div>
  <div class="section-subtitle">EU and national regulatory framework</div>

  ${synthetic(`
  <h3>16.1 EUDR Due Diligence</h3>
  <div>EU Deforestation Regulation status: <strong>Not assessed</strong><br>Application deadline: 30 December 2026 (delayed from June 2025)<br>Deforestation risk: ${dd.deforestation ? 'Data available from OpenEPI/GFW' : 'Not assessed'}</div>

  <h3>16.2 CSRD / ESRS Data Export</h3>
  <div>Corporate Sustainability Reporting Directive: <strong>Framework only</strong><br>ESRS XBRL Taxonomy contains 1,200+ data points. This report captures approximately ${Object.keys(apiStatus).filter(s => apiStatus[s] === 'OK').length * 5} environmental data points potentially relevant to ESRS E1-E5.</div>

  <h3>16.3 ICNF APP Support</h3>
  <div>Plano de Gestão Florestal status: <strong>Not submitted</strong><br>Fire risk zone: ${dd.risks.fire.level}<br>Required documentation: Property boundary (available), land cover classification (${dd.landCover.source}), fire history (${dd.fireHistory.yearsAnalyzed}yr MODIS data available).</div>

  <h3>16.4 Regulatory Timeline</h3>
  <table class="data-table">
    <thead><tr><th>Deadline</th><th>Requirement</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="label">Dec 2026</td><td>EUDR compliance (if commodity operator)</td><td>Pending</td></tr>
      <tr><td class="label">2025 FY</td><td>CSRD reporting (if applicable)</td><td>Framework only</td></tr>
      <tr><td class="label">Annual</td><td>ICNF fire management plan (if forest >2ha)</td><td>Not submitted</td></tr>
    </tbody>
  </table>
  `, 'EUDR Information System (TRACES NT, not yet queryable), CSRD ESRS taxonomy (EFRAG), ICNF APP portal. All registries require manual interaction — no APIs available yet.')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 17: NEXT STEPS -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 17</div>
  <div class="section-title">Next Steps & Recommendations</div>

  <h3>Immediate (0-6 months)</h3>
  <ul class="checklist">${dd.nextSteps.immediate.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Short-term (6-18 months)</h3>
  <ul class="checklist">${dd.nextSteps.shortTerm.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Long-term (2-5 years)</h3>
  <ul class="checklist">${dd.nextSteps.longTerm.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  ${synthetic(`<h3>Cost Estimates</h3>
  <table class="data-table">
    <thead><tr><th>Action</th><th>Est. Cost</th></tr></thead>
    <tbody>
      <tr><td class="label">Licensed property survey</td><td class="value">&euro;1,500-3,000</td></tr>
      <tr><td class="label">Hydrogeological study</td><td class="value">&euro;2,000-5,000</td></tr>
      <tr><td class="label">Biodiversity baseline survey</td><td class="value">&euro;3,000-8,000</td></tr>
      <tr><td class="label">Solar PV installation (5kW)</td><td class="value">&euro;6,000-10,000</td></tr>
      <tr><td class="label">Carbon certification (Verra/Gold Standard)</td><td class="value">&euro;5,000-15,000</td></tr>
    </tbody>
  </table>`, 'Local market research for professional services. Costs vary significantly by region and provider.')}

  ${synthetic(`<h3>Professional Contacts</h3><div>Recommended organization types: ICNF (forest authority), APA (environment agency), Municipality of ${municipality || 'local area'}, Local agricultural cooperative, Certified environmental consultants.</div>`, 'Local business directories, ICNF regional office contacts, APA district contacts')}
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- SECTION 18: METHODOLOGY, SOURCES & DISCLAIMER -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="report-page">
  <div class="section-number">Section 18</div>
  <div class="section-title">Methodology, Sources & Disclaimer</div>

  <h3>Data Sources</h3>
  <table class="data-table">
    <thead><tr><th>Category</th><th>Source</th><th>Resolution</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="label">Elevation</td><td>Open-Meteo DEM (SRTM)</td><td>90m</td><td style="color:${elevation != null ? 'green' : 'red'};font-weight:600;">${elevation != null ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Climate (30yr)</td><td>Open-Meteo Archive</td><td>10km</td><td style="color:${climate ? 'green' : 'red'};font-weight:600;">${climate ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Climate Projections</td><td>Open-Meteo Climate (CMIP6)</td><td>10km</td><td style="color:${dd.climateProjections ? 'green' : 'red'};font-weight:600;">${dd.climateProjections ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Soil</td><td>SoilGrids 2.0 (ISRIC)</td><td>250m</td><td style="color:${soil ? 'green' : 'red'};font-weight:600;">${soil ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Geology</td><td>Macrostrat</td><td>Variable</td><td style="color:${geo ? 'green' : 'red'};font-weight:600;">${geo ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Species</td><td>iNaturalist</td><td>15km</td><td style="color:${dd.species.total > 0 ? 'green' : 'red'};font-weight:600;">${dd.species.total > 0 ? 'OK' : 'NO DATA'}</td></tr>
      <tr><td class="label">GBIF</td><td>GBIF Occurrence</td><td>~15km bbox</td><td style="color:${gbifTotal > 0 ? 'green' : 'red'};font-weight:600;">${gbifTotal > 0 ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Active Fires</td><td>NASA FIRMS VIIRS</td><td>375m, 48h</td><td style="color:${dd.fireSummary.status === 'OK' ? 'green' : 'red'};font-weight:600;">${dd.fireSummary.status}</td></tr>
      <tr><td class="label">Fire History</td><td>NASA FIRMS MODIS Archive</td><td>1km, ${dd.fireHistory.yearsAnalyzed}yr</td><td style="color:${dd.fireHistory.status === 'OK' ? 'green' : 'red'};font-weight:600;">${dd.fireHistory.status}</td></tr>
      <tr><td class="label">Flood</td><td>GloFAS (Open-Meteo)</td><td>10km</td><td style="color:${dd.flood.current ? 'green' : 'orange'};font-weight:600;">${dd.flood.current ? 'OK' : 'NO DATA'}</td></tr>
      <tr><td class="label">Water Features</td><td>OpenStreetMap (Overpass)</td><td>Contributor-dependent</td><td style="color:green;font-weight:600;">OK</td></tr>
      <tr><td class="label">Solar</td><td>PVGIS v5.3 / NASA POWER</td><td>Point</td><td style="color:${dd.solarPotential ? 'green' : 'red'};font-weight:600;">${dd.solarPotential ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Wind</td><td>Open-Meteo Archive</td><td>10km</td><td style="color:${dd.windPotential ? 'green' : 'red'};font-weight:600;">${dd.windPotential ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Watershed</td><td>mghydro.com</td><td>HydroSHEDS-derived</td><td style="color:${dd.watershed ? 'green' : 'red'};font-weight:600;">${dd.watershed ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Isochrone</td><td>Mapbox Isochrone</td><td>Road network</td><td style="color:${dd.isochrone ? 'green' : 'red'};font-weight:600;">${dd.isochrone ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Land Price</td><td>Eurostat (apri_lprc)</td><td>NUTS2</td><td style="color:${dd.eurostatPrice ? 'green' : 'red'};font-weight:600;">${dd.eurostatPrice ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Population</td><td>WorldPop</td><td>100m</td><td style="color:${dd.populationDensity ? 'green' : 'red'};font-weight:600;">${dd.populationDensity ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Deforestation</td><td>OpenEPI (GFW)</td><td>Basin</td><td style="color:${dd.deforestation ? 'green' : 'red'};font-weight:600;">${dd.deforestation ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Land Cover Epochs</td><td>CORINE WMS (2000-2018)</td><td>100m</td><td style="color:${dd.landCoverEpochs ? 'green' : 'red'};font-weight:600;">${dd.landCoverEpochs ? 'OK' : 'FAILED'}</td></tr>
      <tr><td class="label">Bio Trends</td><td>iNaturalist (yearly)</td><td>15km, 5yr</td><td style="color:${dd.bioTrends ? 'green' : 'red'};font-weight:600;">${dd.bioTrends ? 'OK' : 'FAILED'}</td></tr>
    </tbody>
  </table>

  <h3>Methodology</h3>
  <div style="font-size:12px;line-height:1.6;color:var(--text-muted);">
    <p>This report follows the UN SEEA EA (System of Environmental-Economic Accounting — Ecosystem Accounting) framework where applicable. Natural capital valuation uses TEEB (The Economics of Ecosystems and Biodiversity) benefit transfer coefficients for Mediterranean ecosystems. Carbon estimation uses IPCC Tier 1 methodology with literature-based stock values by land cover type.</p>
    <p>All data is fetched for the specific coordinates of the submitted property boundary. Climate normals are 30-year averages (WMO standard). Regional comparisons use the same APIs queried at wider radius or offset coordinates.</p>
    <p><strong>Conservative estimation:</strong> Where uncertainty exists, lower-bound estimates are preferred.</p>
  </div>

  <h3>Disclaimer</h3>
  <div class="disclaimer">
    <p>This report is generated using publicly available data sources and computational models. It is intended for informational purposes only. Property boundaries, valuations, and environmental assessments should be verified by licensed professionals before any decision.</p>
    <p><strong>Data marked as SYNTHETIC</strong> (red background) represents estimated or placeholder values. These are clearly annotated with the data source that could provide real data. Synthetic values should not be relied upon for decision-making.</p>
    <p>This report is an invitation to relationship, not a final judgment of value.</p>
    <p style="margin-top:12px;"><strong>Scale and boundary disclaimer:</strong> Scale boundaries (bioregion, watershed, 15-minute radius) are approximations for analytical purposes. Actual ecological, hydrological, and social relationships may extend beyond or not fully correspond to these boundaries.</p>
  </div>

  <div style="margin-top:32px;text-align:center;font-size:12px;color:var(--text-muted);">
    <strong>LandBook by LandLibrary</strong><br>
    info@landlibrary.com<br>
    Generated: ${now} &nbsp;|&nbsp; APIs called: ${Object.keys(apiStatus).length} &nbsp;|&nbsp; Succeeded: ${Object.values(apiStatus).filter(s => s === 'OK').length}
  </div>
</div>
    `;
}
