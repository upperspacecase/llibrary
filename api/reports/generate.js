import { getCollection } from '../_db.js';

// ── Fetch helpers (server-side, no browser APIs) ─────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// ── Static Map Helpers ───────────────────────────────────

function getBbox(boundary, padding = 0.005) {
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  return {
    south: Math.min(...lats) - padding,
    north: Math.max(...lats) + padding,
    west: Math.min(...lngs) - padding,
    east: Math.max(...lngs) + padding,
  };
}

function mapboxStaticUrl(boundary, center, style = 'satellite-v9', width = 700, height = 440) {
  const token = process.env.VITE_MAPBOX_TOKEN;
  if (!token) return null;

  // Build GeoJSON overlay for boundary polygon
  const coords = boundary.map(p => [p[1], p[0]]); // [lng, lat]
  // Close the polygon
  if (coords.length > 0) coords.push(coords[0]);
  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { stroke: '#E76F51', 'stroke-width': 3, 'stroke-opacity': 1, fill: '#E76F51', 'fill-opacity': 0.15 },
      geometry: { type: 'Polygon', coordinates: [coords] },
    }],
  };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  const lng = center[1], lat = center[0];
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}@2x?access_token=${token}&padding=40`;
}

function wmsGetMapUrl(wmsBase, layers, bbox, width = 700, height = 440, extraParams = {}) {
  const { south, north, west, east } = bbox;
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layers,
    BBOX: `${west},${south},${east},${north}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    SRS: 'EPSG:4326',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    ...extraParams,
  });
  const separator = wmsBase.includes('?') ? '&' : '?';
  return `${wmsBase}${separator}${params.toString()}`;
}

function mapboxWithWmsOverlay(boundary, center, wmsUrl, style = 'light-v11', width = 700, height = 440) {
  // For the report we just show the WMS image directly — it's a static raster
  // The boundary is shown separately via Mapbox
  return { mapbox: mapboxStaticUrl(boundary, center, style, width, height), wms: wmsUrl };
}

function buildMapUrls(boundary, center) {
  const bbox = getBbox(boundary);
  const token = process.env.VITE_MAPBOX_TOKEN;

  return {
    satellite: mapboxStaticUrl(boundary, center, 'satellite-v9'),
    topography: mapboxStaticUrl(boundary, center, 'outdoors-v12'),
    soilClay: wmsGetMapUrl('https://maps.isric.org/mapserv?map=/map/clay.map', 'clay_0-5cm_mean', bbox),
    soilPh: wmsGetMapUrl('https://maps.isric.org/mapserv?map=/map/phh2o.map', 'phh2o_0-5cm_mean', bbox),
    landCoverCorine: wmsGetMapUrl('https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer', '12', bbox),
    landCoverWorldcover: wmsGetMapUrl('https://services.terrascope.be/wms/v2', 'WORLDCOVER_2021_MAP', bbox),
    landCoverCOS: wmsGetMapUrl('https://geo2.dgterritorio.gov.pt/geoserver/COS2018/wms', 'COS2018_v2', bbox),
    fireDanger: wmsGetMapUrl('https://maps.effis.emergency.copernicus.eu/wms', 'ecmwf.fwi', bbox),
    burnedAreas: wmsGetMapUrl('https://maps.effis.emergency.copernicus.eu/wms', 'firms.hs', bbox),
    natura2000: wmsGetMapUrl('https://bio.discomap.eea.europa.eu/arcgis/services/Natura2000/Natura2000End2021/MapServer/WMSServer', '2,4', bbox),
    waterResources: mapboxStaticUrl(boundary, center, 'outdoors-v12'),
    biodiversity: mapboxStaticUrl(boundary, center, 'light-v11'),
  };
}

// ── API Calls ────────────────────────────────────────────

async function getElevation(lat, lng) {
  const data = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
  return data?.elevation?.[0] ?? null;
}

async function getForecast(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode,uv_index_max&forecast_days=7&timezone=auto`;
  return fetchJSON(url);
}

async function getClimateAverages(lat, lng) {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 29;
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const start = `${startYear}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(endYear, m, 0).getDate();
    const end = `${endYear}-${String(m).padStart(2,'0')}-${lastDay}`;
    months.push({ m, start, end });
  }
  // Fetch one year of historical data to approximate monthly averages
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${endYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const data = await fetchJSON(url);
  if (!data?.daily) return null;
  const result = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let m = 0; m < 12; m++) {
    const indices = data.daily.time.map((t, i) => new Date(t).getMonth() === m ? i : -1).filter(i => i >= 0);
    if (indices.length === 0) { result.push({ month: monthNames[m], avgHigh: 0, avgLow: 0, totalPrecip: 0 }); continue; }
    const avgHigh = indices.reduce((s, i) => s + (data.daily.temperature_2m_max[i] || 0), 0) / indices.length;
    const avgLow = indices.reduce((s, i) => s + (data.daily.temperature_2m_min[i] || 0), 0) / indices.length;
    const totalPrecip = indices.reduce((s, i) => s + (data.daily.precipitation_sum[i] || 0), 0);
    result.push({ month: monthNames[m], avgHigh: Math.round(avgHigh * 10) / 10, avgLow: Math.round(avgLow * 10) / 10, totalPrecip: Math.round(totalPrecip) });
  }
  return result;
}

async function getSoilData(lat, lng) {
  const propsUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=clay&property=sand&property=silt&property=phh2o&property=ocd&property=nitrogen&property=cec&property=bdod&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&value=mean`;
  const classUrl = `https://rest.isric.org/soilgrids/v2.0/classification/query?lon=${lng}&lat=${lat}&number_classes=3`;
  const [props, classification] = await Promise.all([fetchJSON(propsUrl), fetchJSON(classUrl)]);
  return { properties: props, classification };
}

async function getGeology(lat, lng) {
  return fetchJSON(`https://macrostrat.org/api/v2/geologic_units/what?lat=${lat}&lng=${lng}&response=long`);
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

async function getRiskScores(lat, lng) {
  // Simplified risk calculation using current weather
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
  const expectedMonthly = [80,70,55,40,25,8,2,3,20,60,80,90];
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
  const query = `[out:json][timeout:15];(node["amenity"~"school|hospital|pharmacy|post_office|bank"](${bbox});node["shop"](${bbox});node["tourism"](${bbox}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getAdminUnit(lat, lng) {
  try {
    const d = 0.001;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const url = `https://ogcapi.dgterritorio.gov.pt/collections/Freguesias/items?bbox=${bbox}&limit=1&f=json`;
    const data = await fetchJSON(url);
    if (data?.features?.[0]) {
      const p = data.features[0].properties;
      return { parish: p.Freguesia || null, municipality: p.Municipio || null, district: p.Distrito || null };
    }
  } catch {}
  return null;
}

async function getNearestForecastLocation(lat, lng) {
  try {
    const data = await fetchJSON('https://api.ipma.pt/open-data/distrits-islands.json');
    if (!data?.data) return null;
    let nearest = null, minDist = Infinity;
    for (const loc of data.data) {
      const d = Math.sqrt(Math.pow(loc.latitude - lat, 2) + Math.pow(loc.longitude - lng, 2));
      if (d < minDist) { minDist = d; nearest = loc; }
    }
    return nearest;
  } catch { return null; }
}

async function getIPMAForecast(globalIdLocal) {
  if (!globalIdLocal) return null;
  return fetchJSON(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${globalIdLocal}.json`);
}

// ── Multi-point elevation for slope/aspect ───────────────
async function getMultiPointElevation(boundary, center) {
  // Sample boundary corners + center + midpoints
  const points = [center];
  const step = Math.max(1, Math.floor(boundary.length / 8));
  for (let i = 0; i < boundary.length; i += step) {
    points.push(boundary[i]);
  }
  // Also sample N/S/E/W from center
  const d = 0.002; // ~200m
  points.push([center[0] + d, center[1]]); // N
  points.push([center[0] - d, center[1]]); // S
  points.push([center[0], center[1] + d]); // E
  points.push([center[0], center[1] - d]); // W

  const lats = points.map(p => p[0]).join(',');
  const lngs = points.map(p => p[1]).join(',');
  const data = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
  if (!data?.elevation) return null;

  const elevations = data.elevation;
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;

  // Aspect from cardinal points (last 4 are N, S, E, W)
  const n = elevations.length;
  const elN = elevations[n - 4], elS = elevations[n - 3], elE = elevations[n - 2], elW = elevations[n - 1];
  const nsSlope = elS - elN; // positive = slopes south
  const ewSlope = elE - elW; // positive = slopes east

  let aspect = 'Flat';
  const threshold = 2; // meters
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

  // Slope estimate (rise/run over the property extent)
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

// ── Land cover via WMS GetFeatureInfo ────────────────────
async function getLandCoverAtPoint(lat, lng) {
  // Try CORINE first
  try {
    const d = 0.0005;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const url = `https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=12&QUERY_LAYERS=12&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
    const data = await fetchJSON(url);
    if (data?.features?.[0]?.properties) return { source: 'CORINE', properties: data.features[0].properties };
  } catch {}
  return null;
}

async function getLandCoverGrid(boundary, center) {
  // Sample a grid of points inside the boundary to get land cover distribution
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const gridSize = 5; // 5x5 grid
  const points = [];
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = minLat + (maxLat - minLat) * (i + 0.5) / gridSize;
      const lng = minLng + (maxLng - minLng) * (j + 0.5) / gridSize;
      points.push([lat, lng]);
    }
  }

  // Also try DGT COS for Portugal
  const results = [];
  for (const [lat, lng] of points.slice(0, 9)) { // limit to 9 to avoid rate limits
    try {
      const d = 0.0002;
      const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
      const url = `https://geo2.dgterritorio.gov.pt/geoserver/COS2018/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=COS2018_v2&QUERY_LAYERS=COS2018_v2&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
      const data = await fetchJSON(url);
      if (data?.features?.[0]?.properties) {
        results.push(data.features[0].properties);
      }
    } catch {}
  }

  // Aggregate land cover classes
  const classCounts = {};
  for (const r of results) {
    const cls = r.COS2018_n1 || r.COS2018_n2 || r.Descricao || r.LEGENDA || JSON.stringify(r);
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  }

  const total = results.length || 1;
  const breakdown = Object.entries(classCounts)
    .map(([cls, count]) => ({ label: cls, pct: Math.round(count / total * 100), count }))
    .sort((a, b) => b.pct - a.pct);

  return { source: results.length > 0 ? 'DGT COS 2018' : 'UNAVAILABLE', breakdown, sampleCount: results.length };
}

// ── Regional comparison data ─────────────────────────────
async function getRegionalComparisons(lat, lng, propertyData) {
  // Fetch data for the wider region (offset by ~0.2 degrees ≈ 20km)
  const offsets = [
    [lat + 0.15, lng], [lat - 0.15, lng], [lat, lng + 0.15], [lat, lng - 0.15],
    [lat + 0.1, lng + 0.1], [lat - 0.1, lng - 0.1],
  ];

  // Regional climate (single point 20km away for comparison)
  const regClimateUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat + 0.2}&longitude=${lng + 0.2}&start_date=${new Date().getFullYear() - 1}-01-01&end_date=${new Date().getFullYear() - 1}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const regClimate = await fetchJSON(regClimateUrl).catch(() => null);

  let regRainfall = null, regMeanTemp = null;
  if (regClimate?.daily) {
    regRainfall = Math.round(regClimate.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0));
    const temps = regClimate.daily.temperature_2m_max.map((max, i) => ((max || 0) + (regClimate.daily.temperature_2m_min[i] || 0)) / 2);
    regMeanTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
  }

  // Regional species (wider radius = 50km)
  const regSpecies = await fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=50&per_page=1&locale=en`).catch(() => null);
  const regSpeciesTotal = regSpecies?.total_results || null;

  // Regional soil (offset point)
  const regSoilUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng + 0.1}&lat=${lat + 0.1}&property=phh2o&property=ocd&depth=0-5cm&value=mean`;
  const regSoil = await fetchJSON(regSoilUrl).catch(() => null);
  let regPh = null, regOC = null;
  if (regSoil?.properties?.layers) {
    for (const l of regSoil.properties.layers) {
      if (l.name === 'phh2o' && l.depths?.[0]?.values?.mean != null) regPh = (l.depths[0].values.mean / 10).toFixed(1);
      if (l.name === 'ocd' && l.depths?.[0]?.values?.mean != null) regOC = (l.depths[0].values.mean / 10).toFixed(1);
    }
  }

  // Regional water features (wider bbox)
  const wd = 0.1;
  const wBbox = `${lat - wd},${lng - wd},${lat + wd},${lng + wd}`;
  const regWaterQuery = `[out:json][timeout:15];(node["natural"="spring"](${wBbox});node["man_made"="water_well"](${wBbox}););out count;`;
  const regWater = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(regWaterQuery)}`).catch(() => null);
  const regWaterCount = regWater?.elements?.[0]?.tags?.total ? parseInt(regWater.elements[0].tags.total) : null;

  return {
    rainfall: regRainfall,
    meanTemp: regMeanTemp,
    speciesTotal: regSpeciesTotal,
    soilPh: regPh,
    soilOC: regOC,
    waterFeatureCount: regWaterCount,
  };
}

// ── Carbon estimation from land cover ────────────────────
// Literature values: tCO2e per hectare by land cover type
const CARBON_PER_HA = {
  'forest': 120, 'cork oak': 80, 'broad-leaved': 100, 'coniferous': 90, 'mixed forest': 95,
  'olive': 30, 'vineyard': 15, 'orchard': 25, 'fruit': 25,
  'agriculture': 10, 'arable': 8, 'cropland': 10, 'pasture': 20,
  'scrub': 35, 'shrub': 30, 'maquis': 40, 'heath': 25,
  'grassland': 15, 'natural grass': 15,
  'urban': 2, 'built': 2, 'infrastructure': 2,
  'water': 0, 'bare': 3,
  'default': 25,
};

function estimateCarbon(landCover, areaHa) {
  if (!landCover?.breakdown?.length) {
    // No land cover data — use conservative estimate
    return { stock: Math.round(areaHa * 25), annual: (areaHa * 2.5).toFixed(1), method: 'Conservative default (25 tCO2e/ha)' };
  }
  let totalStock = 0;
  const details = [];
  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let rate = CARBON_PER_HA.default;
    for (const [key, val] of Object.entries(CARBON_PER_HA)) {
      if (lcLower.includes(key)) { rate = val; break; }
    }
    const lcArea = areaHa * lc.pct / 100;
    const stock = lcArea * rate;
    totalStock += stock;
    details.push({ label: lc.label, area: lcArea.toFixed(2), rate, stock: Math.round(stock) });
  }
  return {
    stock: Math.round(totalStock),
    annual: (totalStock * 0.02).toFixed(1), // ~2% annual sequestration
    creditValue: `€${Math.round(totalStock * 0.02 * 65)}–${Math.round(totalStock * 0.02 * 80)}`,
    details,
    method: 'Literature values by land cover type × area',
  };
}

// ── Property name from address ────────────────────────────
function derivePropertyName(address) {
  if (!address) return 'Land Report';
  // Use first part of address (street/locality name)
  const first = address.split(',')[0].trim();
  // Clean up road prefixes
  return first
    .replace(/^(R\.|Rua|Estrada|Travessa|Av\.|Avenida|Largo|Praça)\s+/i, '')
    .trim() || first;
}

// ── Market valuation (SYNTHETIC) ─────────────────────────
function syntheticValuation(areaHa, landCover, waterScore, bioScore) {
  // Base €/ha rates for Portuguese rural land (synthetic estimates)
  const BASE_RATE = 22000; // €/ha average rural Portugal
  let modifier = 1.0;

  // Adjust by land cover quality
  if (landCover?.breakdown?.length) {
    const primary = landCover.breakdown[0]?.label?.toLowerCase() || '';
    if (primary.includes('vineyard') || primary.includes('vinha')) modifier += 0.4;
    else if (primary.includes('olive') || primary.includes('olival')) modifier += 0.3;
    else if (primary.includes('forest') || primary.includes('floresta')) modifier += 0.15;
    else if (primary.includes('urban') || primary.includes('artificial')) modifier += 0.6;
    else if (primary.includes('agric') || primary.includes('culturas')) modifier += 0.2;
  }

  // Water premium
  if (waterScore >= 8) modifier += 0.15;
  else if (waterScore >= 6) modifier += 0.08;

  // Biodiversity premium (proximity to protected areas)
  if (bioScore >= 8) modifier += 0.1;

  const perHa = Math.round(BASE_RATE * modifier);
  const conservative = Math.round(perHa * 0.85);
  const optimistic = Math.round(perHa * 1.15);

  return {
    perHa,
    total: Math.round(perHa * areaHa),
    conservative: { perHa: conservative, total: Math.round(conservative * areaHa) },
    market: { perHa, total: Math.round(perHa * areaHa) },
    optimistic: { perHa: optimistic, total: Math.round(optimistic * areaHa) },
  };
}

// ── Natural capital premium (TEEB coefficients) ──────────
// Values from TEEB database + Mediterranean ecosystem literature (€/ha/year)
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
  const details = [];

  if (!landCover?.breakdown?.length) {
    // No land cover — use conservative default
    const rate = TEEB_BY_LANDCOVER.default;
    const total = Object.values(rate).reduce((a, b) => a + b, 0);
    return {
      totalPerHa: total,
      totalAnnual: Math.round(total * areaHa),
      services: Object.fromEntries(Object.entries(rate).map(([k, v]) => [k, Math.round(v * areaHa)])),
      details: [{ label: 'Default (conservative)', area: areaHa, ratePerHa: total, annual: Math.round(total * areaHa) }],
      premium: Math.round(total * areaHa * 5), // 5x annual as capital premium
      method: 'TEEB default coefficients',
    };
  }

  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let rates = TEEB_BY_LANDCOVER.default;
    for (const [key, val] of Object.entries(TEEB_BY_LANDCOVER)) {
      if (lcLower.includes(key)) { rates = val; break; }
    }
    const lcArea = areaHa * lc.pct / 100;
    const totalRate = Object.values(rates).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(rates)) {
      services[k] += v * lcArea;
    }
    details.push({ label: lc.label, area: lcArea.toFixed(2), ratePerHa: totalRate, annual: Math.round(totalRate * lcArea) });
  }

  const totalAnnual = Math.round(Object.values(services).reduce((a, b) => a + b, 0));
  return {
    totalPerHa: areaHa > 0 ? Math.round(totalAnnual / areaHa) : 0,
    totalAnnual,
    services: Object.fromEntries(Object.entries(services).map(([k, v]) => [k, Math.round(v)])),
    details,
    premium: Math.round(totalAnnual * 5),
    method: 'TEEB coefficients by land cover type',
  };
}

// ── Ecosystem services breakdown ─────────────────────────
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
  ].filter(i => i.value > 0)
   .sort((a, b) => b.value - a.value);

  // Calculate percentages
  for (const item of items) {
    item.pct = totalAnnual > 0 ? Math.round(item.value / totalAnnual * 100) : 0;
  }

  return { total: totalAnnual, items };
}

// ── Agricultural revenue model ───────────────────────────
// Yield and price data from ICNF, FAO, and Portuguese agricultural statistics
const AG_MODELS = {
  'cork': { yield: 180, unit: 'kg/ha', price: 8.5, cycle: 9, label: 'Cork harvest (9yr cycle)', annualized: true },
  'olive': { yield: 3000, unit: 'kg/ha', price: 0.6, cycle: 1, label: 'Olive production' },
  'vineyard': { yield: 6000, unit: 'kg/ha', price: 0.45, cycle: 1, label: 'Grape production' },
  'vine': { yield: 6000, unit: 'kg/ha', price: 0.45, cycle: 1, label: 'Grape production' },
  'forest': { yield: 4, unit: 'm³/ha', price: 45, cycle: 1, label: 'Timber/biomass' },
  'pasture': { yield: 250, unit: 'kg meat/ha', price: 4.5, cycle: 1, label: 'Pastoral (livestock)' },
  'agriculture': { yield: 2500, unit: 'kg/ha', price: 0.35, cycle: 1, label: 'Mixed crops' },
  'cropland': { yield: 2500, unit: 'kg/ha', price: 0.35, cycle: 1, label: 'Mixed crops' },
  'fruit': { yield: 8000, unit: 'kg/ha', price: 0.8, cycle: 1, label: 'Fruit production' },
  'scrub': { yield: 100, unit: 'kg honey/ha', price: 8, cycle: 1, label: 'Apiculture potential' },
  'default': { yield: 0, unit: '', price: 0, cycle: 1, label: 'Non-productive' },
};

function calculateAgriculturalRevenue(landCover, areaHa, carbon) {
  const models = [];
  let totalConservative = 0, totalOptimized = 0;

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

  for (const lc of landCover.breakdown) {
    const lcLower = lc.label.toLowerCase();
    let model = AG_MODELS.default;
    for (const [key, val] of Object.entries(AG_MODELS)) {
      if (lcLower.includes(key)) { model = val; break; }
    }
    if (model.price === 0) continue;

    const lcArea = areaHa * lc.pct / 100;
    let annual = model.yield * model.price * lcArea;
    if (model.annualized) annual = annual / model.cycle;
    annual = Math.round(annual);

    models.push({
      label: model.label,
      landCover: lc.label,
      area: lcArea.toFixed(2),
      annual,
      approach: `${model.yield} ${model.unit} × €${model.price}`,
    });
    totalConservative += annual;
  }

  totalOptimized = Math.round(totalConservative * 1.8);
  const carbonRevenue = carbon?.stock ? Math.round(carbon.stock * 0.02 * 70) : 0;

  return {
    models,
    scenarios: [
      { scenario: 'Conservative', value: totalConservative, label: 'Current yields only' },
      { scenario: 'Moderate', value: Math.round(totalConservative * 1.4 + carbonRevenue * 0.5), label: 'Improved management + partial carbon' },
      { scenario: 'Optimized', value: totalOptimized + carbonRevenue, label: 'Full optimization + carbon credits' },
    ],
  };
}

// ── Synthetic regional comparables ───────────────────────
function syntheticComparables(valuation, municipality) {
  const base = valuation.perHa;
  return [
    { label: 'This Property', value: base },
    { label: `${municipality || 'Local'} avg`, value: Math.round(base * 0.88) },
    { label: 'District avg', value: Math.round(base * 0.75) },
    { label: 'Premium (water access)', value: Math.round(base * 1.25) },
    { label: 'Premium (building permit)', value: Math.round(base * 1.6) },
  ];
}

// ── Radar baselines from regional data ───────────────────
function calculateRadarScores(propertyData, regional) {
  const dims = [
    {
      label: 'Water',
      score: propertyData.waterScore,
      avg: regional.rainfall ? Math.min(10, Math.round((regional.rainfall || 500) / 100)) : 5.5,
    },
    {
      label: 'Biodiversity',
      score: propertyData.bioScore,
      avg: regional.speciesTotal ? Math.min(10, Math.round(Math.log10(regional.speciesTotal) * 2.5)) : 5.5,
    },
    {
      label: 'Soil',
      score: propertyData.soilScore || 6,
      avg: regional.soilPh ? (parseFloat(regional.soilPh) > 5 && parseFloat(regional.soilPh) < 8 ? 6.5 : 5) : 6,
    },
    {
      label: 'Carbon',
      score: propertyData.carbonScore || 5.5,
      avg: 5,
    },
    {
      label: 'Resilience',
      score: propertyData.resilienceScore || 6,
      avg: 5.5,
    },
  ];
  return dims;
}

// ── Derive dynamic sections from data ────────────────────
function deriveOpportunities(data) {
  const ops = [];
  if (data.waterScore >= 7) ops.push({ icon: '💧', title: 'Water Security', reason: `Water score ${data.waterScore}/10` });
  else if (data.waterScore < 5) ops.push({ icon: '💧', title: 'Water Development', reason: `Low water score — improvement potential` });
  if (data.bioScore >= 6) ops.push({ icon: '🌿', title: 'Carbon Credits', reason: `Bio score ${data.bioScore}/10 — carbon potential` });
  if (data.risks.fire.score >= 40) ops.push({ icon: '🔥', title: 'Fire Management', reason: `Fire risk ${data.risks.fire.level}` });
  if (data.protectedAreas.length > 0) ops.push({ icon: '🦎', title: 'Conservation', reason: `${data.protectedAreas.length} protected areas nearby` });
  if (data.species.total > 50) ops.push({ icon: '🐝', title: 'Biodiversity Value', reason: `${data.species.total} species observed` });
  // Fill to 6 with generic relevant ones
  const fallback = [
    { icon: '🌾', title: 'Agriculture', reason: 'Land use potential' },
    { icon: '🏕️', title: 'Eco-Tourism', reason: 'Natural setting' },
    { icon: '☀️', title: 'Renewable Energy', reason: 'Solar/wind potential' },
  ];
  for (const f of fallback) {
    if (ops.length >= 6) break;
    if (!ops.find(o => o.title === f.title)) ops.push(f);
  }
  return ops.slice(0, 6);
}

function deriveMitigations(data) {
  const mits = [];
  if (data.risks.fire.score >= 30) {
    mits.push('Create and maintain defensible space around structures (minimum 10m clearance)');
    mits.push('Implement fuel load reduction through controlled grazing or mechanical clearing');
  }
  if (data.risks.drought.score >= 30) {
    mits.push('Install rainwater harvesting systems for drought resilience');
    mits.push('Establish water-efficient irrigation (drip systems) for productive areas');
  }
  if (data.risks.flood.score >= 30) {
    mits.push('Maintain drainage channels and monitor low-lying areas during heavy rain');
  }
  if (data.soil?.ph && parseFloat(data.soil.ph) < 5.5) {
    mits.push('Consider liming to raise soil pH for improved nutrient availability');
  }
  if (data.waterFeatures.total === 0) {
    mits.push('Investigate borehole or well drilling for water independence');
  }
  if (mits.length < 3) mits.push('Conduct annual property assessment to track environmental changes');
  if (mits.length < 4) mits.push('Establish baseline monitoring for biodiversity and water quality');
  return mits;
}

function deriveNextSteps(data) {
  const immediate = ['Verify property boundaries with licensed surveyor'];
  const shortTerm = [];
  const longTerm = [];

  if (data.risks.fire.score >= 40) immediate.push('Implement fire fuel reduction program');
  if (data.waterFeatures.total > 0) immediate.push('Assess and meter existing water sources');
  else immediate.push('Commission hydrogeological survey for water development');

  if (data.bioScore >= 6) shortTerm.push('Biodiversity monitoring protocol setup');
  if (data.risks.drought.score >= 30) shortTerm.push('Drought resilience plan — rainwater harvesting, water storage');
  shortTerm.push('Soil testing and amendment plan based on SoilGrids data');
  if (data.protectedAreas.length > 0) shortTerm.push('Review conservation obligations for nearby protected areas');

  if (data.bioScore >= 7) longTerm.push('Conservation easement or stewardship program evaluation');
  longTerm.push('Carbon credit certification feasibility study');
  longTerm.push('Regenerative land management certification');

  return { immediate: immediate.slice(0, 4), shortTerm: shortTerm.slice(0, 4), longTerm: longTerm.slice(0, 4) };
}

function deriveSeasonalCalendar(climate, risks) {
  if (!climate) return null;
  const seasons = [];
  // Jan-Mar
  const winterPrecip = (climate[0].totalPrecip + climate[1].totalPrecip + climate[2].totalPrecip);
  seasons.push({
    period: 'Jan–Mar',
    risk: winterPrecip > 150 ? 'Saturated soils' : 'Cool & mild',
    tag: winterPrecip > 150 ? 'moderate' : 'low',
    notes: winterPrecip > 150 ? 'Possible access limitations' : 'Good planting window',
  });
  // Apr-May
  const springTemp = (climate[3].avgHigh + climate[4].avgHigh) / 2;
  seasons.push({
    period: 'Apr–May',
    risk: springTemp > 25 ? 'Fire season begins' : 'Growing season',
    tag: springTemp > 25 ? 'moderate' : 'low',
    notes: springTemp > 25 ? 'Begin fuel reduction' : 'Optimal growth period',
  });
  // Jun-Aug
  const summerPrecip = climate[5].totalPrecip + climate[6].totalPrecip + climate[7].totalPrecip;
  const summerTemp = (climate[5].avgHigh + climate[6].avgHigh + climate[7].avgHigh) / 3;
  seasons.push({
    period: 'Jun–Aug',
    risk: summerTemp > 30 ? 'PEAK FIRE RISK' : summerPrecip < 30 ? 'Dry period' : 'Warm season',
    tag: summerTemp > 30 ? 'high' : summerPrecip < 30 ? 'moderate' : 'low',
    notes: summerTemp > 30 ? 'No outdoor burning, monitor continuously' : 'Water management critical',
  });
  // Sep-Dec
  const autumnPrecip = climate[8].totalPrecip + climate[9].totalPrecip + climate[10].totalPrecip + climate[11].totalPrecip;
  seasons.push({
    period: 'Sep–Dec',
    risk: autumnPrecip > 200 ? 'Heavy rains, erosion risk' : 'First rains',
    tag: autumnPrecip > 200 ? 'moderate' : 'low',
    notes: 'Revegetation window — ideal for planting',
  });
  return seasons;
}

// ── Score helpers ────────────────────────────────────────
function scoreLabel(score) {
  if (score >= 80) return 'Extreme';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}
function riskLevel(score) {
  if (score >= 60) return { level: 'High', cls: 'high', out5: Math.round(score / 20) };
  if (score >= 30) return { level: 'Moderate', cls: 'moderate', out5: Math.round(score / 20) };
  return { level: 'Low', cls: 'low', out5: Math.round(score / 20) };
}

// ── Summarize iNaturalist species ────────────────────────
function summarizeSpecies(data) {
  if (!data?.results) return { total: 0, groups: {}, topSpecies: [] };
  const groups = {};
  const ICONIC_MAP = {
    Plantae: 'Flora', Aves: 'Birds', Mammalia: 'Mammals',
    Insecta: 'Insects', Reptilia: 'Reptiles', Amphibia: 'Amphibians',
    Fungi: 'Fungi', Actinopterygii: 'Fish', Arachnida: 'Arachnids', Mollusca: 'Molluscs',
  };
  for (const r of data.results) {
    const taxon = r.taxon || {};
    const iconic = taxon.iconic_taxon_name || 'Other';
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

// ── Parse soil ───────────────────────────────────────────
function parseSoil(data) {
  if (!data?.properties?.properties?.layers) return null;
  const result = {};
  for (const layer of data.properties.properties.layers) {
    const val = layer.depths?.[0]?.values?.mean;
    if (val == null) continue;
    const name = layer.name;
    const unit = layer.unit_measure?.mapped_units || '';
    if (name === 'clay') result.clay = (val / 10).toFixed(1);
    if (name === 'sand') result.sand = (val / 10).toFixed(1);
    if (name === 'silt') result.silt = (val / 10).toFixed(1);
    if (name === 'phh2o') result.ph = (val / 10).toFixed(1);
    if (name === 'ocd') result.organicCarbon = (val / 10).toFixed(1);
    if (name === 'nitrogen') result.nitrogen = (val / 100).toFixed(2);
    if (name === 'cec') result.cec = (val / 10).toFixed(1);
    if (name === 'bdod') result.bulkDensity = (val / 100).toFixed(2);
  }
  const cls = data.classification;
  result.classification = cls?.wrb_class_name || null;
  result.classificationProb = cls?.wrb_class_probability || null;
  return result;
}

// ── Parse geology ────────────────────────────────────────
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

// ── Main handler ─────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const submissionId = body.submission_id;

    // Get submission
    const submissions = await getCollection('submissions');
    const sub = submissionId
      ? await submissions.findOne({ id: submissionId })
      : await submissions.find({}).sort({ created: -1 }).limit(1).toArray().then(a => a[0]);

    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const lat = sub.center?.[0] || sub.center?.lat;
    const lng = sub.center?.[1] || sub.center?.lng;
    if (!lat || !lng) return res.status(400).json({ error: 'No coordinates in submission' });

    const areaHa = sub.area ? (sub.area / 10000) : 0;
    const forceRefresh = body.force_refresh === true;

    // ── Reuse existing data snapshot if available ────────
    const reports = await getCollection('report_versions');
    const existingReport = await reports.findOne(
      { submission_id: sub.id, data_snapshot: { $ne: null } },
      { sort: { created: -1 } }
    );

    if (existingReport?.data_snapshot?.dynamic && !forceRefresh) {
      // Rebuild HTML from existing data — same data, potentially new layout
      const dataSnapshot = existingReport.data_snapshot;
      const dd = dataSnapshot.dynamic;
      const prop = dataSnapshot.submission;
      const maps = dataSnapshot.maps;
      const soil = dd.soil;
      const geo = dd.geology;
      const annualRainfall = dd.annualRainfall;
      const annualMeanTemp = dd.annualMeanTemp;
      const summerMean = dd.summerMean;
      const winterMean = dd.winterMean;
      const frostDays = dd.frostDays;
      const growingSeason = dd.growingSeason;
      const gbifTotal = dd.gbif?.total || 0;
      const gbifKingdoms = dd.gbif?.kingdoms || {};
      const protectedAreaNames = dd.protectedAreas;
      const elevation = dd.elevation;
      const climate = dd.climate;
      const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      const parish = dd.adminUnit?.parish || '';
      const municipality = dd.adminUnit?.municipality || prop.address.split(',').slice(-3, -2)[0]?.trim() || '';
      const locationLine = [parish, municipality, 'Portugal'].filter(Boolean).join(', ');
      const climateZone = annualMeanTemp && annualRainfall
        ? (parseFloat(annualMeanTemp) > 14 && annualRainfall < 800 ? 'Csa (Hot-summer Mediterranean)' : parseFloat(annualMeanTemp) > 14 ? 'Csb (Warm-summer Mediterranean)' : 'Cfb (Oceanic)')
        : 'Mediterranean (estimated)';

      const speciesGroups = Object.entries(dd.species.groups || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const maxSpecies = speciesGroups.length > 0 ? Math.max(...speciesGroups.map(s => s[1])) : 1;

      // Rebuild HTML with same data snapshot
      const html = buildHTML({ dd, prop, maps, soil, geo, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason, gbifTotal, gbifKingdoms, protectedAreaNames, elevation, climate, now, parish, municipality, locationLine, climateZone, speciesGroups, maxSpecies, lat, lng });

      const count = await reports.countDocuments();
      const doc = {
        id: crypto.randomUUID(),
        version: `v${count + 1}`,
        name: `${prop.address.split(',')[0]} — Real API Data`,
        created: new Date().toISOString(),
        locked_sections: [],
        html_content: html,
        data_snapshot: dataSnapshot,
        submission_id: sub.id,
        reused_data_from: existingReport.id,
      };

      await reports.insertOne(doc);
      return res.status(201).json({
        id: doc.id, version: doc.version, name: doc.name, created: doc.created,
        apis_called: 0, dynamic_data_points: Object.keys(dd).length,
        note: `Reused data snapshot from ${existingReport.version} (${existingReport.id}). Pass force_refresh: true to re-fetch.`,
      });
    }

    // ── Fetch all data in parallel (first generation only) ──
    const [
      elevation,
      forecast,
      climate,
      soilRaw,
      geology,
      speciesCounts,
      threatened,
      gbif,
      floodData,
      risks,
      protectedAreas,
      waterFeatures,
      infrastructure,
      adminUnit,
      ipmaLocation,
      terrainProfile,
      landCover,
      regional,
    ] = await Promise.all([
      getElevation(lat, lng).catch(() => null),
      getForecast(lat, lng).catch(() => null),
      getClimateAverages(lat, lng).catch(() => null),
      getSoilData(lat, lng).catch(() => ({ properties: null, classification: null })),
      getGeology(lat, lng).catch(() => null),
      getSpeciesCounts(lat, lng).catch(() => null),
      getThreatenedSpecies(lat, lng).catch(() => null),
      getGBIF(lat, lng).catch(() => null),
      getFloodData(lat, lng).catch(() => null),
      getRiskScores(lat, lng).catch(() => ({ fire: 0, drought: 0, flood: 0 })),
      getProtectedAreas(lat, lng).catch(() => []),
      getWaterFeatures(lat, lng).catch(() => []),
      getInfrastructure(lat, lng).catch(() => []),
      getAdminUnit(lat, lng).catch(() => null),
      getNearestForecastLocation(lat, lng).catch(() => null),
      getMultiPointElevation(sub.boundary, [lat, lng]).catch(() => null),
      getLandCoverGrid(sub.boundary, [lat, lng]).catch(() => ({ source: 'FAILED', breakdown: [], sampleCount: 0 })),
      getRegionalComparisons(lat, lng).catch(() => ({})),
    ]);

    // IPMA forecast (needs location ID from previous call)
    const ipmaForecast = ipmaLocation?.globalIdLocal
      ? await getIPMAForecast(ipmaLocation.globalIdLocal).catch(() => null)
      : null;

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
        const current = discharge[discharge.length - 1];
        floodAnalysis = {
          level: max > avg * 3 ? 'High' : max > avg * 1.5 ? 'Moderate' : 'Low',
          current: current?.toFixed(1),
          average: avg.toFixed(1),
          max: max.toFixed(1),
        };
      }
    }

    // Climate summary
    const annualRainfall = climate ? climate.reduce((s, m) => s + m.totalPrecip, 0) : null;
    const annualMeanTemp = climate ? (climate.reduce((s, m) => s + (m.avgHigh + m.avgLow) / 2, 0) / 12).toFixed(1) : null;
    const summerMean = climate ? ((climate[5].avgHigh + climate[5].avgLow + climate[6].avgHigh + climate[6].avgLow + climate[7].avgHigh + climate[7].avgLow) / 6).toFixed(1) : null;
    const winterMean = climate ? ((climate[11].avgHigh + climate[11].avgLow + climate[0].avgHigh + climate[0].avgLow + climate[1].avgHigh + climate[1].avgLow) / 6).toFixed(1) : null;

    // Frost estimate
    let frostDays = null;
    if (climate) {
      const coldMonths = climate.filter(m => m.avgLow < 2);
      frostDays = coldMonths.length > 0 ? `${coldMonths.length * 3}–${coldMonths.length * 8}` : '0–2';
    }

    // Growing season estimate
    let growingSeason = null;
    if (climate) {
      const growingMonths = climate.filter(m => (m.avgHigh + m.avgLow) / 2 >= 10);
      growingSeason = growingMonths.length * 30;
    }

    // Water features count
    const springs = waterFeatures.filter(e => e.tags?.natural === 'spring').length;
    const wells = waterFeatures.filter(e => e.tags?.man_made === 'water_well').length;
    const waterways = waterFeatures.filter(e => e.tags?.waterway).length;
    const waterBodies = waterFeatures.filter(e => e.tags?.natural === 'water').length;
    const waterTotal = springs + wells + waterways + waterBodies;

    // Water security score
    let waterScore = 5;
    waterScore += Math.min(springs * 1.5, 3);
    waterScore += Math.min(wells * 1, 2);
    waterScore += waterways > 0 ? 1 : 0;
    waterScore += waterBodies > 0 ? 1 : 0;
    if (annualRainfall && annualRainfall > 600) waterScore += 0.5;
    waterScore = Math.min(Math.round(waterScore * 10) / 10, 10);

    // Bio score
    let bioScore = 5;
    if (species.total > 100) bioScore += 2; else if (species.total > 50) bioScore += 1;
    if (threatenedSummary.total > 0) bioScore += 1;
    if (protectedAreas.length > 0) bioScore += 1.5;
    bioScore = Math.min(Math.round(bioScore * 10) / 10, 10);

    // Protected area names
    const protectedAreaNames = protectedAreas
      .filter(e => e.tags?.name)
      .map(e => ({ name: e.tags.name, type: e.tags.protect_class || e.tags.designation || 'Protected Area' }))
      .slice(0, 5);

    // Infrastructure summary
    const infraGroups = {};
    for (const el of infrastructure) {
      const type = el.tags?.amenity || el.tags?.shop || el.tags?.tourism || 'other';
      infraGroups[type] = (infraGroups[type] || 0) + 1;
    }

    // GBIF kingdoms
    const gbifKingdoms = {};
    let gbifTotal = gbif?.count || 0;
    if (gbif?.facets?.[0]?.counts) {
      for (const c of gbif.facets[0].counts) {
        gbifKingdoms[c.name] = c.count;
      }
    }

    // Risk levels
    const fireRisk = riskLevel(risks.fire);
    const droughtRisk = riskLevel(risks.drought);
    const floodRisk = riskLevel(risks.flood);

    // ── Derived sections ────────────────────────────────────
    const ddForDerive = {
      waterScore, bioScore, risks: { fire: { score: risks.fire, ...fireRisk }, drought: { score: risks.drought, ...droughtRisk }, flood: { score: risks.flood, ...floodRisk } },
      protectedAreas: protectedAreaNames, species, waterFeatures: { springs, wells, waterways, waterBodies, total: waterTotal }, soil,
    };
    const opportunities = deriveOpportunities(ddForDerive);
    const mitigations = deriveMitigations(ddForDerive);
    const nextSteps = deriveNextSteps(ddForDerive);
    const seasonalCalendar = deriveSeasonalCalendar(climate, risks);
    const carbon = estimateCarbon(landCover, areaHa);
    const propertyName = derivePropertyName(sub.address);
    const naturalCapital = calculateNaturalCapital(landCover, areaHa);
    const ecosystemServices = calculateEcosystemServices(naturalCapital, areaHa);
    const valuation = syntheticValuation(areaHa, landCover, waterScore, bioScore);
    const agriculture = calculateAgriculturalRevenue(landCover, areaHa, carbon);
    const muni = adminUnit?.municipality || sub.address.split(',').slice(-3, -2)[0]?.trim() || '';
    const comparables = syntheticComparables(valuation, muni);

    // Soil quality score for radar
    const soilScore = soil?.ph ? (parseFloat(soil.ph) > 5 && parseFloat(soil.ph) < 8 ? 7 : 5) : 5.5;
    const carbonScore = carbon.stock > 0 ? Math.min(10, Math.round(carbon.stock / areaHa / 15)) : 5;
    const resilienceScore = Math.max(3, 10 - Math.round(Math.max(risks.fire, risks.drought) / 12));
    const radarDims = calculateRadarScores({ waterScore, bioScore, soilScore, carbonScore, resilienceScore }, regional);

    // ── Generate map URLs ─────────────────────────────────
    const maps = buildMapUrls(sub.boundary, [lat, lng]);

    // ── Build data snapshot ──────────────────────────────
    const dataSnapshot = {
      submission: {
        id: sub.id,
        boundary: sub.boundary,
        center: [lat, lng],
        area: sub.area,
        areaHa: Math.round(areaHa * 100) / 100,
        perimeter: sub.perimeter ? Math.round(sub.perimeter) : null,
        address: sub.address,
        email: sub.email,
        notes: sub.notes,
        files: sub.files || [],
        created: sub.created,
      },
      dynamic: {
        elevation,
        forecast: forecast?.daily || null,
        climate,
        annualRainfall,
        annualMeanTemp,
        summerMean,
        winterMean,
        frostDays,
        growingSeason,
        soil,
        geology: geo,
        species: {
          total: species.total,
          groups: species.groups,
          topSpecies: species.topSpecies,
        },
        threatened: {
          total: threatenedSummary.total,
          topSpecies: threatenedSummary.topSpecies,
        },
        gbif: { total: gbifTotal, kingdoms: gbifKingdoms },
        flood: floodAnalysis,
        risks: {
          fire: { score: risks.fire, ...fireRisk },
          drought: { score: risks.drought, ...droughtRisk },
          flood: { score: risks.flood, ...floodRisk },
        },
        protectedAreas: protectedAreaNames,
        waterFeatures: { springs, wells, waterways, waterBodies, total: waterTotal },
        waterScore,
        bioScore,
        infrastructure: infraGroups,
        adminUnit,
        ipmaLocation: ipmaLocation ? { name: ipmaLocation.local, id: ipmaLocation.globalIdLocal } : null,
        ipmaForecast: ipmaForecast?.data?.slice(0, 5) || null,
        terrainProfile,
        landCover,
        carbon,
        opportunities,
        mitigations,
        nextSteps,
        seasonalCalendar,
        regional,
        propertyName,
        naturalCapital,
        ecosystemServices,
        valuation,
        agriculture,
        comparables,
        radarDims,
      },
      maps,
      hardcoded: {
        note: 'All previously hardcoded items are now calculated or synthetic. Market valuation and regional comparables use synthetic estimates marked accordingly.',
      },
    };

    // ── Build HTML ───────────────────────────────────────
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const dd = dataSnapshot.dynamic;
    const prop = dataSnapshot.submission;

    const parish = dd.adminUnit?.parish || '';
    const municipalityDisplay = dd.adminUnit?.municipality || prop.address.split(',').slice(-3, -2)[0]?.trim() || '';
    const locationLine = [parish, municipalityDisplay, 'Portugal'].filter(Boolean).join(', ');
    const climateZone = annualMeanTemp && annualRainfall
      ? (parseFloat(annualMeanTemp) > 14 && annualRainfall < 800 ? 'Csa (Hot-summer Mediterranean)' : parseFloat(annualMeanTemp) > 14 ? 'Csb (Warm-summer Mediterranean)' : 'Cfb (Oceanic)')
      : 'Mediterranean (estimated)';
    const speciesGroups = Object.entries(dd.species.groups || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxSpecies = speciesGroups.length > 0 ? Math.max(...speciesGroups.map(s => s[1])) : 1;

    const html = buildHTML({ dd, prop, maps, soil, geo, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason, gbifTotal, gbifKingdoms, protectedAreaNames, elevation, climate, now, parish, municipality: municipalityDisplay, locationLine, climateZone, speciesGroups, maxSpecies, lat, lng });

    // ── Save to DB ───────────────────────────────────────
    const count = await reports.countDocuments();

    const doc = {
      id: crypto.randomUUID(),
      version: `v${count + 1}`,
      name: `${prop.address.split(',')[0]} — Real API Data`,
      created: new Date().toISOString(),
      locked_sections: [],
      html_content: html,
      data_snapshot: dataSnapshot,
      submission_id: sub.id,
    };

    await reports.insertOne(doc);

    return res.status(201).json({
      id: doc.id, version: doc.version, name: doc.name, created: doc.created,
      apis_called: 18, dynamic_data_points: Object.keys(dd).length,
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ error: 'Generation failed', detail: err.message, stack: err.stack });
  }
}

// ── HTML Template Builder ────────────────────────────────
function buildHTML({ dd, prop, maps, soil, geo, annualRainfall, annualMeanTemp, summerMean, winterMean, frostDays, growingSeason, gbifTotal, gbifKingdoms, protectedAreaNames, elevation, climate, now, parish, municipality, locationLine, climateZone, speciesGroups, maxSpecies, lat, lng }) {
  return `
<!-- SECTION 0: COVER -->
<div class="report-page cover-page">
  <div class="cover-top">
    <img src="/landbook-logo.png" alt="LandBook" style="height:48px;margin-bottom:8px;" />
    <div class="cover-tagline">Field notes for knowing<br>your land better.</div>
  </div>
  <div class="cover-middle">
    <div class="cover-coords">${lat.toFixed(4)}&deg;N, ${Math.abs(lng).toFixed(4)}&deg;W</div>
    <div class="cover-property">${dd.propertyName}</div>
    <div class="cover-address">${prop.address.split(',').slice(0, 2).join(',')},<br>${prop.address.split(',').slice(2).join(',').trim()}</div>
  </div>
  <div class="cover-bottom">
    <div class="cover-produced">Produced by</div>
    <img src="/landlibrary-logo.png" alt="LandLibrary" style="height:28px;margin-bottom:12px;" />
    <div class="cover-meta">Date: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} | Version: MVP0.1</div>
    <div class="cover-disclaimer"><strong>Disclaimer</strong><br>This assessment represents conditions at time of documentation. Land characteristics evolve; verify critical details before decisions.</div>
  </div>
</div>

<!-- SECTION 1: EXECUTIVE SUMMARY -->
<div class="report-page">
  <div class="section-number">Section 01</div>
  <div class="section-title">Executive Summary</div>
  <div class="section-subtitle">Property overview derived from submission and open data</div>

  <h3>1.1 Property Snapshot</h3>
  <table class="data-table">
    <thead><tr><th>Attribute</th><th>Value</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Coordinates</td><td class="value">${lat.toFixed(4)}&deg;N, ${Math.abs(lng).toFixed(4)}&deg;W</td><td>Submission</td></tr>
      <tr><td class="label">Elevation</td><td class="value">${elevation != null ? elevation + 'm' : 'N/A'}</td><td>${elevation != null ? 'Open-Meteo DEM' : 'FAILED'}</td></tr>
      <tr><td class="label">Area</td><td class="value">${prop.areaHa} ha (${Math.round(prop.area).toLocaleString()} m&sup2;)</td><td>Calculated from boundary</td></tr>
      <tr><td class="label">Perimeter</td><td class="value">${prop.perimeter ? prop.perimeter + 'm' : 'N/A'}</td><td>Calculated from boundary</td></tr>
      <tr><td class="label">Address</td><td class="value">${prop.address}</td><td>Mapbox geocoding</td></tr>
      <tr><td class="label">Parish</td><td class="value">${parish || 'N/A'}</td><td>${parish ? 'DGT API' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Municipality</td><td class="value">${municipality || 'N/A'}</td><td>${municipality ? 'DGT API' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Climate Zone</td><td class="value">${climateZone}</td><td>${climate ? 'Derived from climate data' : 'ESTIMATED'}</td></tr>
      <tr><td class="label">Zoning</td><td class="value">${dd.landCover.breakdown.length > 0 ? dd.landCover.breakdown[0].label : 'Not available'}</td><td>${dd.landCover.breakdown.length > 0 ? dd.landCover.source + '' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Aspect</td><td class="value">${dd.terrainProfile?.aspect || 'Not available'}</td><td>${dd.terrainProfile ? 'Multi-point DEM' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Slope</td><td class="value">${dd.terrainProfile ? dd.terrainProfile.slopePct + '% — ' + dd.terrainProfile.slopeCategory : 'Not available'}</td><td>${dd.terrainProfile ? 'Multi-point DEM' : 'UNAVAILABLE'}</td></tr>
    </tbody>
  </table>

  <h3>1.2 Value Composition</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="kpi-card"><div class="kpi-value">&euro;${dd.valuation.total.toLocaleString()}</div><div class="kpi-label">Market Value</div><div class="kpi-sub">SYNTHETIC &euro;${dd.valuation.perHa.toLocaleString()}/ha</div></div>
    <div class="kpi-card"><div class="kpi-value">&euro;${dd.naturalCapital.premium.toLocaleString()}</div><div class="kpi-label">Natural Capital</div><div class="kpi-sub">TEEB 5× annual services</div></div>
    <div class="kpi-card"><div class="kpi-value">&euro;${dd.ecosystemServices.total.toLocaleString()}/yr</div><div class="kpi-label">Ecosystem Services</div><div class="kpi-sub">TEEB coefficients</div></div>
  </div>

  <h3>1.3 Key Opportunities</h3>
  <div class="cards-grid">
    ${dd.opportunities.map(o => `<div class="card"><div class="card-icon">${o.icon}</div><div class="card-title">${o.title}</div><div style="font-size:9px;color:var(--text-muted);margin-top:4px;">${o.reason}</div></div>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Derived from property scores and data</div>

  <h3>1.4 Risk Summary</h3>
  <div class="risk-row"><div class="risk-dot ${dd.risks.fire.cls}"></div><div class="risk-label">Fire Risk</div><div class="risk-value">${dd.risks.fire.out5}/5 (${dd.risks.fire.level}) — score: ${dd.risks.fire.score}</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.flood.cls}"></div><div class="risk-label">Flood Risk</div><div class="risk-value">${dd.risks.flood.out5}/5 (${dd.risks.flood.level}) — score: ${dd.risks.flood.score}</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.drought.cls}"></div><div class="risk-label">Drought Risk</div><div class="risk-value">${dd.risks.drought.out5}/5 (${dd.risks.drought.level}) — score: ${dd.risks.drought.score}</div></div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: Computed from Open-Meteo forecast data</div>
</div>

<!-- SECTION 2: NATURAL CAPITAL SCORECARD -->
<div class="report-page">
  <div class="section-number">Section 02</div>
  <div class="section-title">Natural Capital Scorecard</div>
  <div class="section-subtitle">Computed scores based on available data</div>

  <div class="chart-container" style="margin:20px 0;text-align:center;">
    <svg width="260" height="260" viewBox="0 0 260 260">
      ${(() => {
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
        avgPoly = `<polygon points="${avgPts.join(' ')}" fill="#BC6C25" fill-opacity="0.1" stroke="#BC6C25" stroke-width="2" />`;
        scorePoly = `<polygon points="${scorePts.join(' ')}" fill="#1B4332" fill-opacity="0.2" stroke="#1B4332" stroke-width="2" />`;
        return grid + axes + labels + avgPoly + scorePoly + dots;
      })()}
    </svg>
    <div style="display:flex;gap:20px;justify-content:center;font-size:11px;">
      <span><span style="display:inline-block;width:12px;height:3px;background:#1B4332;margin-right:4px;vertical-align:middle;"></span>This Property</span>
      <span><span style="display:inline-block;width:12px;height:3px;background:#BC6C25;margin-right:4px;vertical-align:middle;"></span>Regional Average</span>
    </div>
  </div>

  <table class="data-table">
    <thead><tr><th>Dimension</th><th>Score</th><th>Regional Avg</th><th>Basis</th></tr></thead>
    <tbody>
      ${dd.radarDims.map(d => `<tr><td class="label">${d.label}</td><td class="value">${d.score}/10</td><td>${d.avg}/10</td><td>${
        d.label === 'Water' ? dd.waterFeatures.springs + ' springs, ' + dd.waterFeatures.wells + ' wells' :
        d.label === 'Biodiversity' ? dd.species.total + ' species, ' + dd.threatened.total + ' threatened' :
        d.label === 'Soil' ? (soil ? 'pH ' + soil.ph + ', ' + soil.classification : 'Default') :
        d.label === 'Carbon' ? dd.carbon.stock + ' tCO₂e estimated' :
        'Derived from risk scores'
      }</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Regional averages derived from same APIs at wider radius (CALCULATED)</div>
</div>

<!-- SECTION 3: ECOSYSTEM SERVICES VALUATION -->
<div class="report-page">
  <div class="section-number">Section 03</div>
  <div class="section-title">Ecosystem Services Valuation</div>
  <div class="section-subtitle">Total annual value: &euro;${dd.ecosystemServices.total.toLocaleString()} (TEEB coefficients by land cover)</div>

  <table class="data-table">
    <thead><tr><th>Service</th><th>Annual Value</th><th>% Total</th><th>Methodology</th></tr></thead>
    <tbody>
      ${dd.ecosystemServices.items.map(e => `<tr><td class="label">${e.service}</td><td class="value">&euro;${e.value.toLocaleString()}</td><td>${e.pct}%</td><td>${e.method}</td></tr>`).join('')}
    </tbody>
  </table>

  ${dd.ecosystemServices.items.map(e => `<div class="bar-row"><div class="bar-label">${e.service}</div><div class="bar-track"><div class="bar-fill green" style="width:${dd.ecosystemServices.total > 0 ? (e.value / dd.ecosystemServices.items[0].value * 100).toFixed(0) : 0}%">&euro;${e.value.toLocaleString()}</div></div></div>`).join('')}

  <h3>Natural Capital by Land Cover</h3>
  <table class="data-table">
    <thead><tr><th>Land Cover</th><th>Area (ha)</th><th>&euro;/ha/yr</th><th>Annual Value</th></tr></thead>
    <tbody>
      ${dd.naturalCapital.details.map(d => `<tr><td class="label">${d.label}</td><td>${d.area}</td><td>&euro;${d.ratePerHa.toLocaleString()}</td><td class="value">&euro;${d.annual.toLocaleString()}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: TEEB database coefficients for Mediterranean ecosystems (CALCULATED)</div>
</div>

<!-- SECTION 4: TERRAIN & LANDSCAPE -->
<div class="report-page">
  <div class="section-number">Section 04</div>
  <div class="section-title">Terrain & Landscape</div>
  <div class="section-subtitle">Elevation, soils, and water resources</div>

  <h3>4.1 Elevation & Slope</h3>
  ${dd.terrainProfile ? `
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-value">${dd.terrainProfile.min}–${dd.terrainProfile.max}m</div><div class="kpi-label">Elevation Range</div><div class="kpi-sub">${dd.terrainProfile.range}m difference</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.terrainProfile.slopePct}%</div><div class="kpi-label">Avg Slope</div><div class="kpi-sub">${dd.terrainProfile.slopeCategory}</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.terrainProfile.aspect}</div><div class="kpi-label">Aspect</div><div class="kpi-sub">Primary orientation</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.terrainProfile.avg}m</div><div class="kpi-label">Mean Elevation</div><div class="kpi-sub">Open-Meteo DEM</div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Source: Multi-point DEM sampling (${dd.terrainProfile.elevations.length} points) via Open-Meteo</div>
  ` : `<div class="kpi-card"><div class="kpi-value">${elevation != null ? elevation + 'm' : 'N/A'}</div><div class="kpi-label">Elevation at Center</div></div>`}

  <h3>4.2 Soil Composition</h3>
  ${soil ? `
  <table class="data-table">
    <thead><tr><th>Property</th><th>Value</th><th>Depth</th></tr></thead>
    <tbody>
      <tr><td class="label">Classification</td><td class="value">${soil.classification || 'N/A'}</td><td>—</td></tr>
      <tr><td class="label">Clay</td><td class="value">${soil.clay || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">Sand</td><td class="value">${soil.sand || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">Silt</td><td class="value">${soil.silt || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">pH</td><td class="value">${soil.ph || 'N/A'}</td><td>0–5cm</td></tr>
      <tr><td class="label">Organic Carbon</td><td class="value">${soil.organicCarbon || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Nitrogen</td><td class="value">${soil.nitrogen || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">CEC</td><td class="value">${soil.cec || 'N/A'} cmol/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Bulk Density</td><td class="value">${soil.bulkDensity || 'N/A'} g/cm³</td><td>0–5cm</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: SoilGrids 2.0 (ISRIC) — 250m resolution</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Soil data unavailable — SoilGrids API did not return data for this location.</div>'}

  <h3>4.3 Land Cover</h3>
  ${dd.landCover.breakdown.length > 0 ? `
  ${dd.landCover.breakdown.map(lc => `<div class="bar-row"><div class="bar-label">${lc.label}</div><div class="bar-track"><div class="bar-fill sky" style="width:${lc.pct}%">${lc.pct}%</div></div></div>`).join('')}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: ${dd.landCover.source} — ${dd.landCover.sampleCount} sample points</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);font-size:13px;">Land cover classification unavailable for this location.</div>'}

  <h3>4.4 Water Resources</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.springs}</div><div class="kpi-label">Springs</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.wells}</div><div class="kpi-label">Wells</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.waterways}</div><div class="kpi-label">Waterways</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.waterBodies}</div><div class="kpi-label">Water Bodies</div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: OpenStreetMap via Overpass API — depends on OSM contributor coverage</div>

  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;">
    <div class="score-label" style="font-size:14px;font-weight:700;">Water Security Index</div>
    <div class="score-track" style="flex:1;height:14px;"><div class="score-fill" style="width:${dd.waterScore * 10}%;background:var(--sky-dark);"></div></div>
    <div class="score-value" style="color:var(--sky-dark);">${dd.waterScore}/10</div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Computed from water feature count + rainfall</div>
</div>

<!-- SECTION 5: CLIMATE PROFILE -->
<div class="report-page">
  <div class="section-number">Section 05</div>
  <div class="section-title">Climate Profile</div>
  <div class="section-subtitle">${climate ? 'Based on historical weather data' : 'Climate data unavailable'}</div>

  <h3>5.1 Annual Climate Summary</h3>
  ${climate ? `
  <table class="data-table">
    <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Annual Mean Temp</td><td class="value">${annualMeanTemp}&deg;C</td><td>Open-Meteo Archive</td></tr>
      <tr><td class="label">Summer Mean (Jun–Aug)</td><td class="value">${summerMean}&deg;C</td><td>Open-Meteo Archive</td></tr>
      <tr><td class="label">Winter Mean (Dec–Feb)</td><td class="value">${winterMean}&deg;C</td><td>Open-Meteo Archive</td></tr>
      <tr><td class="label">Annual Rainfall</td><td class="value">${annualRainfall}mm</td><td>Open-Meteo Archive</td></tr>
      <tr><td class="label">Growing Season</td><td class="value">~${growingSeason} days</td><td>Derived</td></tr>
      <tr><td class="label">Frost Days/Year</td><td class="value">${frostDays} days</td><td>Estimated from monthly lows</td></tr>
    </tbody>
  </table>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Climate archive data unavailable.</div>'}

  <h3>5.2 Monthly Temperature & Rainfall</h3>
  ${climate ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Source: Open-Meteo historical archive</div>` : '<div style="color:var(--text-muted);">No climate data to chart.</div>'}

  <h3>5.3 IPMA Forecast</h3>
  ${dd.ipmaForecast ? `
  <table class="data-table">
    <thead><tr><th>Date</th><th>Min</th><th>Max</th><th>Precip</th></tr></thead>
    <tbody>
      ${dd.ipmaForecast.map(f => `<tr><td class="label">${f.forecastDate || '—'}</td><td>${f.tMin || '—'}&deg;C</td><td class="value">${f.tMax || '—'}&deg;C</td><td>${f.precipitaProb || '—'}%</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: IPMA — ${dd.ipmaLocation?.name || 'nearest station'}</div>
  ` : '<div style="background:var(--bg);padding:12px;border-radius:8px;color:var(--text-muted);font-size:13px;">IPMA forecast not available for this location.</div>'}

  <h3>5.4 Seasonal Risk Calendar</h3>
  ${dd.seasonalCalendar ? `
  <div class="season-grid">
    ${dd.seasonalCalendar.map(s => `<div class="season-card"><div class="period">${s.period}</div><span class="risk-tag ${s.tag}">${s.risk}</span><div style="margin-top:6px;color:var(--text-muted);">${s.notes}</div></div>`).join('')}
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Derived from monthly climate data</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">No climate data for seasonal calendar.</div>'}
</div>

<!-- SECTION 6: BIODIVERSITY INVENTORY -->
<div class="report-page">
  <div class="section-number">Section 06</div>
  <div class="section-title">Biodiversity Inventory</div>
  <div class="section-subtitle">${dd.species.total} species observed within 15km radius</div>

  <h3>6.1 Species by Group</h3>
  ${speciesGroups.length > 0 ? speciesGroups.map(([group, count]) =>
    `<div class="bar-row"><div class="bar-label">${group}</div><div class="bar-track"><div class="bar-fill green" style="width:${(count / maxSpecies * 100).toFixed(0)}%">${count}</div></div></div>`
  ).join('') : '<div style="color:var(--text-muted);">No species data available.</div>'}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: iNaturalist community observations — 15km radius</div>

  <h3>6.2 Notable Species</h3>
  ${dd.species.topSpecies.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Species</th><th>Group</th><th>Observations</th><th>Threatened</th></tr></thead>
    <tbody>
      ${dd.species.topSpecies.slice(0, 8).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td><td>${s.threatened ? '⚠️ Yes' : '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  ${dd.threatened.total > 0 ? `
  <h3>6.3 Threatened Species (${dd.threatened.total} found)</h3>
  <table class="data-table">
    <thead><tr><th>Species</th><th>Group</th><th>Observations</th></tr></thead>
    <tbody>
      ${dd.threatened.topSpecies.slice(0, 6).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: iNaturalist threatened species — 25km radius</div>
  ` : ''}

  <h3>6.4 GBIF Occurrence Data</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
    <div class="kpi-card"><div class="kpi-value">${gbifTotal.toLocaleString()}</div><div class="kpi-label">Total Occurrences</div><div class="kpi-sub">GBIF database</div></div>
    <div class="kpi-card"><div class="kpi-value">${Object.keys(gbifKingdoms).length}</div><div class="kpi-label">Kingdoms</div><div class="kpi-sub">${Object.entries(gbifKingdoms).map(([k, v]) => k + ': ' + v).join(', ') || 'N/A'}</div></div>
  </div>

  <h3>6.5 Protected Areas Nearby</h3>
  ${protectedAreaNames.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Name</th><th>Type</th></tr></thead>
    <tbody>
      ${protectedAreaNames.map(p => `<tr><td class="value">${p.name}</td><td>${p.type}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: Overpass API / Natura 2000</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">No protected areas found within 25km radius.</div>'}
</div>

<!-- SECTION 7: GEOLOGY -->
<div class="report-page">
  <div class="section-number">Section 07</div>
  <div class="section-title">Geology</div>
  <div class="section-subtitle">Bedrock and geological history</div>

  ${geo && geo.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Unit</th><th>Lithology</th><th>Environment</th><th>Period</th><th>Age</th></tr></thead>
    <tbody>
      ${geo.map(g => `<tr><td class="value">${g.name}</td><td>${g.lithology}</td><td>${g.environment}</td><td>${g.period}</td><td>${g.ageMa || '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: Macrostrat</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Geology data not available — Macrostrat may not cover this region.</div>'}
</div>

<!-- SECTION 8: RISK ASSESSMENT -->
<div class="report-page">
  <div class="section-number">Section 08</div>
  <div class="section-title">Risk Assessment</div>
  <div class="section-subtitle">Current risk levels based on weather and environmental data</div>

  <h3>8.1 Risk Scores</h3>
  <table class="data-table">
    <thead><tr><th>Risk</th><th>Score</th><th>Level</th><th>Basis</th></tr></thead>
    <tbody>
      <tr><td class="label">Fire</td><td class="value">${dd.risks.fire.score}/100</td><td><span class="risk-tag ${dd.risks.fire.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.fire.level.toUpperCase()}</span></td><td>Temp, precip, wind, season</td></tr>
      <tr><td class="label">Drought</td><td class="value">${dd.risks.drought.score}/100</td><td><span class="risk-tag ${dd.risks.drought.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.drought.level.toUpperCase()}</span></td><td>Precip vs seasonal avg</td></tr>
      <tr><td class="label">Flood</td><td class="value">${dd.risks.flood.score}/100</td><td><span class="risk-tag ${dd.risks.flood.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.flood.level.toUpperCase()}</span></td><td>Recent precipitation</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Scores computed from Open-Meteo 7-day forecast data</div>

  <h3>8.2 Flood Discharge Data</h3>
  ${dd.flood.current ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="kpi-card"><div class="kpi-value">${dd.flood.current}</div><div class="kpi-label">Current m&sup3;/s</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.flood.average}</div><div class="kpi-label">Average m&sup3;/s</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.flood.max}</div><div class="kpi-label">Max m&sup3;/s</div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Source: GloFAS via Open-Meteo Flood API</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">No river discharge data available for this grid cell.</div>'}

  <h3>8.3 Wildfire History</h3>
  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>MISSING</strong> — Historical fire scar data not queried. EFFIS WMS layers available but would need per-property raster intersection.
  </div>

  <h3>8.4 Mitigation Recommendations</h3>
  <ul class="checklist">
    ${dd.mitigations.map(m => `<li><span class="check-box"></span>${m}</li>`).join('')}
  </ul>
  <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Derived from risk scores, water, and soil data</div>
</div>

<!-- SECTION 9: NEARBY INFRASTRUCTURE -->
<div class="report-page">
  <div class="section-number">Section 09</div>
  <div class="section-title">Nearby Infrastructure</div>
  <div class="section-subtitle">Amenities and services within ~5km</div>

  ${Object.keys(dd.infrastructure).length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Type</th><th>Count</th></tr></thead>
    <tbody>
      ${Object.entries(dd.infrastructure).sort((a, b) => b[1] - a[1]).map(([type, count]) => `<tr><td class="label">${type}</td><td class="value">${count}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: OpenStreetMap via Overpass API</div>
  ` : '<div style="color:var(--text-muted);">No infrastructure data found nearby.</div>'}
</div>

<!-- SECTION 10: MAP PORTFOLIO -->
<div class="report-page">
  <div class="section-number">Section 10</div>
  <div class="section-title">Map Portfolio</div>
  <div class="section-subtitle">Available geospatial layers</div>

  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);margin-bottom:16px;">
    10 map layers rendered below using Mapbox Static API and WMS GetMap requests.
  </div>

  <div class="map-grid">
    <div class="map-item">
      ${maps.satellite ? `<img src="${maps.satellite}" alt="Satellite + Boundary" style="width:100%;border-radius:8px;" loading="lazy" />` : '<div class="map-placeholder">Satellite + Boundary (no Mapbox token)</div>'}
      <div class="map-label">Satellite & Boundary</div>
    </div>
    <div class="map-item">
      ${maps.topography ? `<img src="${maps.topography}" alt="Topography" style="width:100%;border-radius:8px;" loading="lazy" />` : '<div class="map-placeholder">Topography</div>'}
      <div class="map-label">Topography & Hydrology</div>
    </div>
    <div class="map-item">
      ${maps.waterResources ? `<img src="${maps.waterResources}" alt="Water Resources" style="width:100%;border-radius:8px;" loading="lazy" />` : '<div class="map-placeholder">Water Resources</div>'}
      <div class="map-label">Water Resources</div>
    </div>
    <div class="map-item">
      <img src="${maps.soilClay}" alt="Soil Clay Content" style="width:100%;border-radius:8px;background:var(--bg);" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>Soil layer unavailable</div>'" />
      <div class="map-label">Soil — Clay Content</div>
    </div>
    <div class="map-item">
      <img src="${maps.soilPh}" alt="Soil pH" style="width:100%;border-radius:8px;background:var(--bg);" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>Soil pH layer unavailable</div>'" />
      <div class="map-label">Soil — pH</div>
    </div>
    <div class="map-item">
      <img src="${maps.landCoverCorine}" alt="Land Cover CORINE" style="width:100%;border-radius:8px;background:var(--bg);" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>CORINE layer unavailable</div>'" />
      <div class="map-label">Land Cover — CORINE 2018</div>
    </div>
    <div class="map-item">
      <img src="${maps.landCoverWorldcover}" alt="Land Cover WorldCover" style="width:100%;border-radius:8px;background:var(--bg);" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>WorldCover layer unavailable</div>'" />
      <div class="map-label">Land Cover — ESA WorldCover</div>
    </div>
    <div class="map-item">
      <img src="${maps.fireDanger}" alt="Fire Danger" style="width:100%;border-radius:8px;background:var(--bg);" loading="lazy" onerror="this.parentElement.innerHTML='<div class=map-placeholder>EFFIS layer unavailable</div>'" />
      <div class="map-label">Fire Danger Forecast</div>
    </div>
  </div>
</div>

<!-- SECTION 11: MARKET CONTEXT -->
<div class="report-page">
  <div class="section-number">Section 11</div>
  <div class="section-title">Market Context & Revenue</div>
  <div class="section-subtitle">Valuation and revenue potential</div>

  <h3>Agricultural Revenue Potential</h3>
  ${dd.agriculture.models.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Model</th><th>Land Cover</th><th>Area (ha)</th><th>Annual Revenue</th><th>Basis</th></tr></thead>
    <tbody>
      ${dd.agriculture.models.map(m => `<tr><td class="label">${m.label}</td><td>${m.landCover || '—'}</td><td>${m.area || '—'}</td><td class="value">&euro;${m.annual.toLocaleString()}</td><td>${m.approach}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  <h3>Revenue Scenarios</h3>
  ${dd.agriculture.scenarios.map(s => {
    const maxVal = Math.max(...dd.agriculture.scenarios.map(x => x.value));
    return `<div class="bar-row"><div class="bar-label">${s.scenario}</div><div class="bar-track"><div class="bar-fill terra" style="width:${maxVal > 0 ? (s.value / maxVal * 100).toFixed(0) : 0}%">&euro;${s.value.toLocaleString()}/yr</div></div></div>`;
  }).join('')}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Based on land cover × published yield data (CALCULATED)</div>

  <h3>Carbon Estimation</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="kpi-card"><div class="kpi-value">${dd.carbon.stock} tCO₂e</div><div class="kpi-label">Est. Carbon Stock</div><div class="kpi-sub">${dd.carbon.method}</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.carbon.annual} tCO₂e/yr</div><div class="kpi-label">Annual Sequestration</div><div class="kpi-sub">~2% of stock</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.carbon.creditValue || 'N/A'}</div><div class="kpi-label">Potential Credit Value</div><div class="kpi-sub">@ €65–80/tonne</div></div>
  </div>
  ${dd.carbon.details ? `
  <table class="data-table" style="margin-top:16px;">
    <thead><tr><th>Land Cover</th><th>Area (ha)</th><th>Rate (tCO₂e/ha)</th><th>Stock</th></tr></thead>
    <tbody>${dd.carbon.details.map(d => `<tr><td class="label">${d.label}</td><td>${d.area}</td><td>${d.rate}</td><td class="value">${d.stock} tCO₂e</td></tr>`).join('')}</tbody>
  </table>
  ` : ''}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Estimated from land cover × published literature values</div>

  <h3 style="margin-top:32px;">Regional Comparison</h3>
  <table class="data-table">
    <thead><tr><th>Metric</th><th>This Property</th><th>Regional (~20km)</th><th>Comparison</th></tr></thead>
    <tbody>
      <tr><td class="label">Annual Rainfall</td><td class="value">${annualRainfall || 'N/A'}mm</td><td>${dd.regional.rainfall || 'N/A'}mm</td><td>${annualRainfall && dd.regional.rainfall ? (annualRainfall > dd.regional.rainfall ? '↑ Wetter' : annualRainfall < dd.regional.rainfall ? '↓ Drier' : '≈ Similar') : '—'}</td></tr>
      <tr><td class="label">Mean Temp</td><td class="value">${annualMeanTemp || 'N/A'}°C</td><td>${dd.regional.meanTemp || 'N/A'}°C</td><td>${annualMeanTemp && dd.regional.meanTemp ? (parseFloat(annualMeanTemp) > parseFloat(dd.regional.meanTemp) ? '↑ Warmer' : '↓ Cooler') : '—'}</td></tr>
      <tr><td class="label">Species (15km)</td><td class="value">${dd.species.total}</td><td>${dd.regional.speciesTotal || 'N/A'} (50km)</td><td>${dd.species.total && dd.regional.speciesTotal ? `${(dd.species.total / dd.regional.speciesTotal * 100).toFixed(0)}% of regional pool` : '—'}</td></tr>
      <tr><td class="label">Soil pH</td><td class="value">${soil?.ph || 'N/A'}</td><td>${dd.regional.soilPh || 'N/A'}</td><td>${soil?.ph && dd.regional.soilPh ? (parseFloat(soil.ph) > parseFloat(dd.regional.soilPh) ? '↑ More alkaline' : '↓ More acidic') : '—'}</td></tr>
      <tr><td class="label">Soil Organic Carbon</td><td class="value">${soil?.organicCarbon || 'N/A'} g/kg</td><td>${dd.regional.soilOC || 'N/A'} g/kg</td><td>${soil?.organicCarbon && dd.regional.soilOC ? (parseFloat(soil.organicCarbon) > parseFloat(dd.regional.soilOC) ? '↑ Higher' : '↓ Lower') : '—'}</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Regional values sampled ~20km from property center</div>

  <h3 style="margin-top:32px;">Valuation Scenarios</h3>
  <table class="data-table">
    <thead><tr><th>Scenario</th><th>Total Value</th><th>&euro;/ha</th><th>Basis</th></tr></thead>
    <tbody>
      <tr><td class="label">Conservative</td><td class="value">&euro;${dd.valuation.conservative.total.toLocaleString()}</td><td>&euro;${dd.valuation.conservative.perHa.toLocaleString()}</td><td>Below market (SYNTHETIC)</td></tr>
      <tr><td class="label">Market</td><td class="value">&euro;${dd.valuation.market.total.toLocaleString()}</td><td>&euro;${dd.valuation.market.perHa.toLocaleString()}</td><td>Adjusted estimate (SYNTHETIC)</td></tr>
      <tr><td class="label">Optimistic</td><td class="value">&euro;${dd.valuation.optimistic.total.toLocaleString()}</td><td>&euro;${dd.valuation.optimistic.perHa.toLocaleString()}</td><td>Natural capital premium (SYNTHETIC)</td></tr>
    </tbody>
  </table>

  <h3>Regional Benchmarks (&euro;/ha)</h3>
  ${dd.comparables.map(b => {
    const maxBench = Math.max(...dd.comparables.map(x => x.value));
    return `<div class="bar-row"><div class="bar-label">${b.label}</div><div class="bar-track"><div class="bar-fill ${b.label === 'This Property' ? 'green' : 'terra'}" style="width:${(b.value / maxBench * 100).toFixed(0)}%">&euro;${b.value.toLocaleString()}</div></div></div>`;
  }).join('')}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Benchmark values are SYNTHETIC estimates — no real estate transaction data available</div>
</div>

<!-- SECTION 12: NEXT STEPS -->
<div class="report-page">
  <div class="section-number">Section 12</div>
  <div class="section-title">Next Steps & Recommendations</div>
  <div class="section-subtitle">Prioritized actions derived from property data</div>

  <h3>Immediate (0–6 months)</h3>
  <ul class="checklist">${dd.nextSteps.immediate.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Short-term (6–18 months)</h3>
  <ul class="checklist">${dd.nextSteps.shortTerm.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Long-term (2–5 years)</h3>
  <ul class="checklist">${dd.nextSteps.longTerm.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <div style="font-size:11px;color:var(--text-muted);margin-top:12px;">Derived from risk scores, water features, biodiversity, and soil data</div>
</div>

<!-- SECTION 13: METHODOLOGY & SOURCES -->
<div class="report-page">
  <div class="section-number">Section 13</div>
  <div class="section-title">Methodology & Sources</div>

  <table class="data-table">
    <thead><tr><th>Category</th><th>Source</th><th>Resolution</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="label">Elevation</td><td>Open-Meteo DEM</td><td>Point</td><td style="color:green;font-weight:600;">${elevation != null ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Weather Forecast</td><td>Open-Meteo</td><td>7-day</td><td style="color:green;font-weight:600;">${dd.forecast ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Climate History</td><td>Open-Meteo Archive</td><td>1 year</td><td style="color:green;font-weight:600;">${climate ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Soil Properties</td><td>SoilGrids 2.0 (ISRIC)</td><td>250m</td><td style="color:green;font-weight:600;">${soil ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Geology</td><td>Macrostrat</td><td>Variable</td><td style="color:green;font-weight:600;">${geo ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Species</td><td>iNaturalist</td><td>15km radius</td><td style="color:green;font-weight:600;">${dd.species.total > 0 ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Threatened Species</td><td>iNaturalist</td><td>25km radius</td><td style="color:green;font-weight:600;">${dd.threatened.total > 0 ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
      <tr><td class="label">GBIF Occurrences</td><td>GBIF</td><td>Bounding box</td><td style="color:green;font-weight:600;">${gbifTotal > 0 ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Flood Risk</td><td>GloFAS (Open-Meteo)</td><td>10km</td><td style="color:green;font-weight:600;">${dd.flood.current ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
      <tr><td class="label">Risk Scores</td><td>Computed (Open-Meteo)</td><td>Derived</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Protected Areas</td><td>Overpass / Natura 2000</td><td>25km</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Water Features</td><td>Overpass (OSM)</td><td>2km bbox</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Infrastructure</td><td>Overpass (OSM)</td><td>5km bbox</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Admin Boundaries</td><td>DGT Portugal</td><td>1:25,000</td><td style="color:green;font-weight:600;">${dd.adminUnit ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">IPMA Forecast</td><td>IPMA</td><td>Nearest station</td><td style="color:green;font-weight:600;">${dd.ipmaForecast ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
    </tbody>
  </table>

  <h3 style="margin-top:32px;">Disclaimer</h3>
  <div class="disclaimer">
    This report is generated using publicly available data sources and computational models. Values presented are estimates intended for informational purposes only. Property boundaries, valuations, and environmental assessments should be verified by licensed professionals. Data accuracy is subject to the resolution and currency of underlying sources.
  </div>
</div>

<!-- SECTION 14: DATA AUDIT — HARDCODED vs DYNAMIC -->
<div class="report-page" style="border-top:4px solid var(--terra);">
  <div class="section-number" style="color:var(--terra);">Data Audit</div>
  <div class="section-title">What Is Dynamic vs Hardcoded</div>
  <div class="section-subtitle">Complete accounting of every data point in this report</div>

  <h3 style="color:green;">DYNAMIC — Fetched from APIs for this property</h3>
  <table class="data-table">
    <thead><tr><th>Data Point</th><th>API Source</th><th>Value Retrieved</th></tr></thead>
    <tbody>
      <tr><td>Coordinates</td><td>Submission</td><td>${lat.toFixed(4)}, ${lng.toFixed(4)}</td></tr>
      <tr><td>Boundary polygon</td><td>Submission</td><td>${prop.boundary.length} points</td></tr>
      <tr><td>Area</td><td>Computed from boundary</td><td>${prop.areaHa} ha</td></tr>
      <tr><td>Perimeter</td><td>Computed from boundary</td><td>${prop.perimeter}m</td></tr>
      <tr><td>Address</td><td>Submission (Mapbox geocoded)</td><td>${prop.address}</td></tr>
      <tr><td>Email</td><td>Submission</td><td>${prop.email}</td></tr>
      <tr><td>Elevation</td><td>Open-Meteo DEM</td><td>${elevation != null ? elevation + 'm' : 'FAILED'}</td></tr>
      <tr><td>7-day forecast</td><td>Open-Meteo Forecast</td><td>${dd.forecast ? dd.forecast.time?.length + ' days' : 'FAILED'}</td></tr>
      <tr><td>Climate averages</td><td>Open-Meteo Archive</td><td>${climate ? '12 months' : 'FAILED'}</td></tr>
      <tr><td>Annual mean temp</td><td>Derived from climate</td><td>${annualMeanTemp || 'N/A'}&deg;C</td></tr>
      <tr><td>Annual rainfall</td><td>Derived from climate</td><td>${annualRainfall || 'N/A'}mm</td></tr>
      <tr><td>Summer/winter means</td><td>Derived from climate</td><td>${summerMean || 'N/A'} / ${winterMean || 'N/A'}&deg;C</td></tr>
      <tr><td>Growing season</td><td>Derived from climate</td><td>~${growingSeason || 'N/A'} days</td></tr>
      <tr><td>Frost days estimate</td><td>Derived from climate</td><td>${frostDays || 'N/A'}</td></tr>
      <tr><td>Climate zone</td><td>Derived from temp + rainfall</td><td>${climateZone}</td></tr>
      <tr><td>Soil clay/sand/silt/pH/OC/N/CEC/BD</td><td>SoilGrids 2.0</td><td>${soil ? '8 properties' : 'FAILED'}</td></tr>
      <tr><td>Soil classification</td><td>SoilGrids 2.0</td><td>${soil?.classification || 'N/A'}</td></tr>
      <tr><td>Geology units</td><td>Macrostrat</td><td>${geo ? geo.length + ' units' : 'FAILED'}</td></tr>
      <tr><td>Species counts by group</td><td>iNaturalist</td><td>${dd.species.total} species</td></tr>
      <tr><td>Top species list</td><td>iNaturalist</td><td>${dd.species.topSpecies.length} top species</td></tr>
      <tr><td>Threatened species</td><td>iNaturalist</td><td>${dd.threatened.total} found</td></tr>
      <tr><td>GBIF occurrences</td><td>GBIF</td><td>${gbifTotal.toLocaleString()} records</td></tr>
      <tr><td>Fire risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.fire.score}/100</td></tr>
      <tr><td>Drought risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.drought.score}/100</td></tr>
      <tr><td>Flood risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.flood.score}/100</td></tr>
      <tr><td>River discharge</td><td>GloFAS (Open-Meteo)</td><td>${dd.flood.current ? dd.flood.current + ' m³/s' : 'NO DATA'}</td></tr>
      <tr><td>Protected areas</td><td>Overpass / Natura 2000</td><td>${protectedAreaNames.length} found</td></tr>
      <tr><td>Water features</td><td>Overpass (OSM)</td><td>${dd.waterFeatures.total} features</td></tr>
      <tr><td>Water security score</td><td>Computed</td><td>${dd.waterScore}/10</td></tr>
      <tr><td>Bio score</td><td>Computed</td><td>${dd.bioScore}/10</td></tr>
      <tr><td>Infrastructure</td><td>Overpass (OSM)</td><td>${Object.values(dd.infrastructure).reduce((a,b)=>a+b,0)} amenities</td></tr>
      <tr><td>Parish/Municipality</td><td>DGT Portugal</td><td>${parish || 'N/A'} / ${municipality || 'N/A'}</td></tr>
      <tr><td>IPMA forecast</td><td>IPMA</td><td>${dd.ipmaForecast ? dd.ipmaForecast.length + ' days' : 'N/A'}</td></tr>
      <tr><td>Terrain profile (slope/aspect)</td><td>Open-Meteo multi-point DEM</td><td>${dd.terrainProfile ? dd.terrainProfile.elevations.length + ' points sampled' : 'FAILED'}</td></tr>
      <tr><td>Land cover breakdown</td><td>${dd.landCover.source}</td><td>${dd.landCover.sampleCount} grid points classified</td></tr>
      <tr><td>Carbon stock estimate</td><td>Literature × land cover area</td><td>${dd.carbon.stock} tCO₂e</td></tr>
      <tr><td>Carbon credit value</td><td>Stock × EU ETS price</td><td>${dd.carbon.creditValue || 'N/A'}</td></tr>
      <tr><td>Opportunity cards</td><td>Rule engine (scores)</td><td>${dd.opportunities.length} derived</td></tr>
      <tr><td>Mitigation recommendations</td><td>Rule engine (risks + data)</td><td>${dd.mitigations.length} derived</td></tr>
      <tr><td>Next steps</td><td>Rule engine (gaps + data)</td><td>${dd.nextSteps.immediate.length + dd.nextSteps.shortTerm.length + dd.nextSteps.longTerm.length} actions</td></tr>
      <tr><td>Seasonal risk calendar</td><td>Derived from climate</td><td>${dd.seasonalCalendar ? '4 seasons' : 'N/A'}</td></tr>
      <tr><td>Regional comparison</td><td>Same APIs at wider radius</td><td>Rainfall, temp, species, soil</td></tr>
      <tr><td>Satellite + boundary map</td><td>Mapbox Static API</td><td>${maps.satellite ? 'Generated' : 'No token'}</td></tr>
      <tr><td>Topography map</td><td>Mapbox Static API</td><td>${maps.topography ? 'Generated' : 'No token'}</td></tr>
      <tr><td>Soil / land cover / fire / biodiversity maps</td><td>WMS GetMap</td><td>7 layers generated</td></tr>
    </tbody>
  </table>

  <h3 style="color:var(--amber);margin-top:32px;">SYNTHETIC / CALCULATED — No raw API source</h3>
  <table class="data-table">
    <thead><tr><th>Data Point</th><th>Method</th><th>Confidence</th></tr></thead>
    <tbody>
      <tr><td>Property name</td><td>Derived from address</td><td style="color:green;">High</td></tr>
      <tr><td>Market valuation (&euro;/ha)</td><td>SYNTHETIC — base rate × land cover + water + bio modifiers</td><td style="color:var(--amber);">Low — no transaction data</td></tr>
      <tr><td>Natural capital premium</td><td>TEEB database coefficients by land cover type × 5yr multiplier</td><td style="color:var(--amber);">Moderate — literature-based</td></tr>
      <tr><td>Ecosystem services</td><td>TEEB coefficients: provisioning, regulating, cultural, supporting</td><td style="color:var(--amber);">Moderate — literature-based</td></tr>
      <tr><td>Agricultural revenue</td><td>Published yield/ha × market price by land cover type</td><td style="color:var(--amber);">Moderate — regional averages</td></tr>
      <tr><td>Regional comparables</td><td>SYNTHETIC — derived from market estimate ± modifiers</td><td style="color:var(--amber);">Low — no transaction data</td></tr>
      <tr><td>Radar baselines</td><td>Regional API data (wider radius) as comparison baseline</td><td style="color:green;">Moderate — same data sources</td></tr>
    </tbody>
  </table>
</div>
    `;
}
