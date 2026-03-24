/**
 * Landbook Report Page v2.0
 * Professional report layout: Cover → TOC → Executive Summary → Map → Weather → Biodiversity → Risk → Elevation → Soil → Protected → Knowledge → Sources
 */

import '../styles/main.css';
import { createMap, mapboxgl, addMarker, addPolygon, addWmsLayer, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';

import { initI18n, t } from '../lib/i18n.js';
import { getLandbook, updateLandbook, createAutoData, createUserReported } from '../lib/store.js';
import { formatArea, formatDistance, polygonBounds, expandBounds, sqmToHectares } from '../lib/geo.js';

import { getForecast, getClimateAverages, getElevation, getWeatherDescription, estimateFrostDates } from '../api/open-meteo.js';
import { getSoilProperties, getSoilClassification, parseSoilProperties, parseSoilClassification, getSoilDescription } from '../api/soilgrids.js';
import { getWaterFeatures, getInfrastructure, extractNodes, extractWays } from '../api/overpass.js';
import { getSpeciesCounts, summarizeSpeciesCounts, getThreatenedSpecies } from '../api/inaturalist.js';
import { getSpeciesOccurrences, summarizeOccurrences } from '../api/gbif.js';
import { CORINE_WMS, SENTINEL2_TILES, getCorineWmsParams, WORLDCOVER_WMS, getWorldCoverWmsParams } from '../api/copernicus.js';
import { EFFIS_WMS, getFireDangerWmsParams, estimateFireRisk } from '../api/effis.js';
import { NATURA2000_WMS, getNatura2000WmsParams, getProtectedAreas } from '../api/natura2000.js';
import { getActiveFiresNearby, summarizeFireDetections } from '../api/nasa-firms.js';
// IPMA (Portugal-only) — removed, using Open-Meteo globally instead
import { getFloodForecastWithHistory, analyzeFloodRisk } from '../api/flood.js';
import { calculateDistances, categorizeAmenities } from '../api/openrouteservice.js';
import { getGeology, parseGeology, getGeologyDescription } from '../api/macrostrat.js';
// DGT (Portugal-only) — removed, using Nominatim globally instead

initI18n();

// ---------------------------------------------------------------------------
// Section definitions (ordered)
// ---------------------------------------------------------------------------
const SECTION_DEFS = [
  { id: 'cover',        labelKey: 'lb.label',                hidden: true },
  { id: 'toc',          labelKey: 'lb.section.toc',          hidden: true },
  { id: 'executive',    labelKey: 'lb.section.executive',    num: 1 },
  { id: 'map',          labelKey: 'lb.section.map',          num: 2 },
  { id: 'weather',      labelKey: 'lb.section.weather',      num: 3 },
  { id: 'biodiversity', labelKey: 'lb.section.biodiversity', num: 4 },
  { id: 'risk',         labelKey: 'lb.section.risk',         num: 5 },
  { id: 'elevation',    labelKey: 'lb.section.elevation',    num: 6 },
  { id: 'soil',         labelKey: 'lb.section.soil',         num: 7 },
  { id: 'protected',    labelKey: 'lb.section.protected',    num: 8 },
  { id: 'knowledge',    labelKey: 'lb.section.knowledge',    num: 9 },
  { id: 'sources',      labelKey: 'lb.section.sources',      num: 10 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function skeleton(id) {
  return `<div id="${id}" class="loading-block"><span class="loading-spinner"></span> ${t('lb.loading.text')}</div>`;
}

/** Get element by ID and remove loading-block class so content flows vertically */
function getDataEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('loading-block');
  return el;
}

function errorBlock(message) {
  return `<div class="data-item" style="grid-column:1/-1;">
    <p style="color:var(--muted);font-size:14px;">${esc(message)}</p>
  </div>`;
}

function dataCard(label, value, detail) {
  return `<div class="data-item">
    <div class="data-label">${esc(label)}</div>
    <div class="data-value">${esc(String(value != null ? value : '\u2014'))}</div>
    ${detail ? `<div class="data-detail">${esc(detail)}</div>` : ''}
  </div>`;
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso || '\u2014'; }
}

function sectionHeader(num, titleKey) {
  return `<div class="lb-section-header">
    <span class="lb-section-number">${num}.</span>
    <h2>${t(titleKey)}</h2>
  </div>`;
}

function renderToc() {
  return SECTION_DEFS
    .filter(s => s.num)
    .map(s => `<li><a href="#section-${s.id}"><span class="lb-toc-number">${s.num}</span>${t(s.labelKey)}</a></li>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const container = document.getElementById('landbook-content');
const sidebar = document.getElementById('landbook-nav');
const sidebarActions = document.getElementById('landbook-sidebar-actions');
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
let landbook = null;

(async () => {
  landbook = id ? await getLandbook(id) : null;

  if (!landbook) {
    container.innerHTML = `
      <div class="empty-state" style="padding-top:120px;">
        <h3>${t('lb.notfound')}</h3>
        <p>${t('lb.notfound.desc')}</p>
        <a href="create.html" class="btn-primary">${t('lb.notfound.cta')}</a>
      </div>`;
    if (sidebar) sidebar.innerHTML = '';
    return;
  }

  document.title = `${landbook.address || 'Landbook'} \u2014 Libraries`;
  renderSidebar();
  renderReport(landbook);
  setupScrollSpy();
})();

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function renderSidebar() {
  if (!sidebar) return;

  sidebar.innerHTML = SECTION_DEFS
    .filter(s => !s.hidden)
    .map((s) => `
    <a class="landbook-nav-link" data-section="${s.id}" href="#section-${s.id}">
      <span class="nav-icon">${s.num || ''}</span>
      <span class="nav-label">${t(s.labelKey)}</span>
    </a>
  `).join('');

  // Click handler: smooth scroll
  sidebar.addEventListener('click', (e) => {
    const link = e.target.closest('.landbook-nav-link');
    if (!link) return;
    e.preventDefault();
    const target = document.getElementById(`section-${link.dataset.section}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Sidebar actions
  if (sidebarActions) {
    sidebarActions.innerHTML = `
      <button class="btn-sidebar" id="btn-share">${t('lb.shareLink')}</button>
      <button class="btn-sidebar" id="btn-export">${t('lb.exportPdf')}</button>
    `;

    document.getElementById('btn-share').addEventListener('click', shareLandbook);
    document.getElementById('btn-export').addEventListener('click', exportPdf);
  }
}

function setupScrollSpy() {
  const sections = SECTION_DEFS.map(s => document.getElementById(`section-${s.id}`)).filter(Boolean);
  const links = sidebar ? sidebar.querySelectorAll('.landbook-nav-link') : [];

  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('section-', '');
        links.forEach(l => l.classList.toggle('active', l.dataset.section === id));
      }
    });
  }, { rootMargin: '-20% 0px -60% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ---------------------------------------------------------------------------
// Share + Export
// ---------------------------------------------------------------------------

function shareLandbook() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-share');
    const orig = btn.innerHTML;
    btn.innerHTML = t('lb.copied') + '!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {
    prompt('Copy this link:', window.location.href);
  });
}

function exportPdf() {
  const btn = document.getElementById('btn-export');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="btn-icon">\u23F3</span> ' + t('lb.preparing');

  // Use browser print with media query for PDF
  setTimeout(() => {
    window.print();
    btn.innerHTML = orig;
  }, 300);
}

// ---------------------------------------------------------------------------
// Main report render
// ---------------------------------------------------------------------------

function renderReport(lb) {
  const boundary = lb.boundary || [];
  const center = lb.center;
  const area = lb.area;
  const perimeter = lb.perimeter;
  const ha = area ? sqmToHectares(area) : null;

  container.innerHTML = `
    <!-- Cover -->
    <div class="lb-cover" id="section-cover">
      <div class="lb-cover-badge">${t('lb.cover.badge')}</div>
      <h1>${esc(lb.address || t('lb.untitled'))}</h1>
      <div class="lb-cover-location" id="data-admin"></div>
      <div class="lb-cover-divider"></div>
      <div class="lb-hero-metrics">
        <div class="lb-hero-metric">
          <div class="metric-value">${ha ? ha.toFixed(2) : '\u2014'}</div>
          <div class="metric-label">${t('lb.cover.hectares')}</div>
        </div>
      </div>
      <div class="lb-cover-footer">
        <span><strong>Report Date:</strong> ${formatDate(new Date().toISOString())}</span>
        <span>${t('lb.cover.version')}</span>
        ${lb.created ? `<span><strong>${t('lb.created')}:</strong> ${formatDate(lb.created)}</span>` : ''}
      </div>
      <div id="data-freshness" class="data-freshness" style="margin-top:16px;">${lb.autoData && lb.autoData.lastFetched ? `Data from ${formatDate(lb.autoData.lastFetched)} \u2022 ${t('lb.refreshing')}` : t('lb.loading')}</div>
    </div>

    <!-- Table of Contents -->
    <div class="lb-toc landbook-section" id="section-toc">
      <h2 style="font-size:28px;margin-bottom:24px;">${t('lb.section.toc')}</h2>
      <ol class="lb-toc-list">${renderToc()}</ol>
    </div>

    <!-- 1. Executive Summary -->
    <div class="landbook-section" id="section-executive">
      ${sectionHeader(1, 'lb.section.executive')}
      <h3>${t('lb.exec.propertyDetails')}</h3>
      <table class="lb-kv-table">
        <tr><td>Property Name</td><td>${esc(lb.address || t('lb.untitled'))}</td></tr>
        <tr><td>Area</td><td>${area ? formatArea(area) + (ha ? ` (${ha.toFixed(2)} ha)` : '') : '\u2014'}</td></tr>
        <tr><td>Perimeter</td><td>${perimeter ? formatDistance(perimeter) : '\u2014'}</td></tr>
        <tr><td>Center</td><td>${center ? center[0].toFixed(5) + ', ' + center[1].toFixed(5) : '\u2014'}</td></tr>
        ${lb.created ? `<tr><td>Created</td><td>${formatDate(lb.created)}</td></tr>` : ''}
      </table>
      <div id="data-infrastructure" class="data-sub-section"></div>
      <div id="data-water"></div>
    </div>

    <!-- 2. Map -->
    <div class="landbook-section" id="section-map">
      ${sectionHeader(2, 'lb.section.map')}
      ${boundary.length ? `
        <div class="landbook-map"><div id="landbook-map" style="width:100%;height:100%;"></div></div>
        <div class="lb-figure-caption">Interactive map with satellite imagery and WMS data layers</div>
        <div class="map-layer-toggles" id="map-layer-toggles"></div>
      ` : `<p style="color:var(--muted);">${t('lb.noboundary')}</p>`}
    </div>

    <!-- 3. Weather & Climate -->
    <div class="landbook-section" id="section-weather">
      ${sectionHeader(3, 'lb.section.weather')}
      ${skeleton('data-weather')}
    </div>

    <!-- 4. Biodiversity -->
    <div class="landbook-section" id="section-biodiversity">
      ${sectionHeader(4, 'lb.section.biodiversity')}
      ${skeleton('data-biodiversity')}
    </div>

    <!-- 5. Risk Assessment -->
    <div class="landbook-section" id="section-risk">
      ${sectionHeader(5, 'lb.section.risk')}
      <div id="data-fire"></div>
      <div id="data-active-fires" class="data-sub-section"></div>
      <div id="data-flood" class="data-sub-section"></div>
      <div id="data-drought" class="data-sub-section"></div>
      <div id="data-risk-calendar"></div>
    </div>

    <!-- 6. Elevation & Terrain -->
    <div class="landbook-section" id="section-elevation">
      ${sectionHeader(6, 'lb.section.elevation')}
      ${skeleton('data-elevation')}
      <div id="data-geology" class="data-sub-section"></div>
    </div>

    <!-- 7. Soil -->
    <div class="landbook-section" id="section-soil">
      ${sectionHeader(7, 'lb.section.soil')}
      ${skeleton('data-soil')}
    </div>

    <!-- 8. Protected Areas & Zoning -->
    <div class="landbook-section" id="section-protected">
      ${sectionHeader(8, 'lb.section.protected')}
      ${skeleton('data-protected')}
    </div>

    <!-- 9. Your Knowledge -->
    <div class="landbook-section user-form" id="section-knowledge">
      ${sectionHeader(9, 'lb.section.knowledge')}
      <p class="form-desc">${t('lb.form.desc')}</p>
      <div id="user-form-container">${renderUserForm(lb)}</div>
    </div>

    <!-- 10. Source Citations -->
    <div class="landbook-section" id="section-sources">
      ${sectionHeader(10, 'lb.section.sources')}
      <p style="color:var(--muted);margin-bottom:24px;">${t('lb.sources.desc')}</p>
      ${renderSources()}
    </div>
  `;

  // Init map
  if (boundary.length) initMap(boundary, center);

  // Fetch live data in parallel
  if (center) {
    const cached = lb.autoData && lb.autoData.lastFetched;
    if (cached) {
      renderCachedData(lb.autoData, center[0], center[1]);
    }
    fetchAllData(lb, center[0], center[1], boundary);
  }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

let wmsLayers = {};

function initMap(boundary, center) {
  const map = createMap('landbook-map', {
    center: [center[1], center[0]],
    zoom: 11,
    satellite: true,
    scrollZoom: true,
  });

  map.on('load', () => {
    addPolygon(map, boundary, {
      sourceId: 'boundary',
      fillColor: '#EB5F54',
      fillOpacity: 0.15,
      lineColor: '#EB5F54',
      lineWidth: 3,
    });

    fitToCoords(map, boundary, { padding: 120 });

    wmsLayers.corine = addWmsLayer(map, CORINE_WMS, getCorineWmsParams(), {
      sourceId: 'wms-corine', opacity: 0.5, visible: false,
    });
    wmsLayers.fire = addWmsLayer(map, EFFIS_WMS, getFireDangerWmsParams(), {
      sourceId: 'wms-fire', opacity: 0.5, visible: false,
    });
    wmsLayers.natura = addWmsLayer(map, NATURA2000_WMS, getNatura2000WmsParams(), {
      sourceId: 'wms-natura', opacity: 0.5, visible: false,
    });
    // Phase 5B: New WMS layers
    wmsLayers.worldcover = addWmsLayer(map, WORLDCOVER_WMS, getWorldCoverWmsParams(), {
      sourceId: 'wms-worldcover', opacity: 0.6, visible: false,
    });
    // COS (Portugal-only WMS) removed
    // LNEG geology (Portugal-only WMS) removed
    wmsLayers.flood = addWmsLayer(map, 'https://globalfloods.eu/geoserver/wms', {
      layers: 'flood_hazard:T100', format: 'image/png', transparent: true, version: '1.1.1',
    }, { sourceId: 'wms-flood', opacity: 0.5, visible: false });
    wmsLayers.drought = addWmsLayer(map, 'https://drought.emergency.copernicus.eu/api/wms', {
      layers: 'CDI', format: 'image/png', transparent: true, version: '1.1.1',
    }, { sourceId: 'wms-drought', opacity: 0.5, visible: false });

    renderLayerToggles(map);
  });
}

function renderLayerToggles(map) {
  const el = document.getElementById('map-layer-toggles');
  if (!el) return;

  const layers = [
    { key: 'corine', label: 'CORINE Land Cover', group: 'Land' },
    { key: 'worldcover', label: 'ESA WorldCover 10m', group: 'Land' },
    { key: 'fire', label: 'EFFIS Fire Danger', group: 'Risk' },
    { key: 'flood', label: 'JRC Flood Hazard (100yr)', group: 'Risk' },
    { key: 'drought', label: 'EDO Drought Index', group: 'Risk' },
    { key: 'natura', label: 'Natura 2000', group: 'Protected' },
  ];

  el.innerHTML = layers.map(l => `
    <label class="layer-toggle">
      <input type="checkbox" data-layer="${l.key}">
      <span>${l.label}</span>
    </label>
  `).join('');

  el.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb.dataset.layer) return;
    const info = wmsLayers[cb.dataset.layer];
    if (!info) return;
    map.setLayoutProperty(info.layerId, 'visibility', cb.checked ? 'visible' : 'none');
  });
}

// ---------------------------------------------------------------------------
// Parallel data fetch
// ---------------------------------------------------------------------------

function fetchAllData(lb, lat, lng, boundary) {
  const bounds = boundary.length >= 3 ? expandBounds(polygonBounds(boundary), 0.5) : null;

  const tasks = [
    { key: 'elevation', fn: () => getElevation(lat, lng) },
    { key: 'forecast', fn: () => getForecast(lat, lng) },
    { key: 'climate', fn: () => getClimateAverages(lat, lng) },
    { key: 'soilProps', fn: () => getSoilProperties(lat, lng) },
    { key: 'soilClass', fn: () => getSoilClassification(lat, lng) },
    { key: 'species', fn: () => getSpeciesCounts(lat, lng, 5) },
    { key: 'threatened', fn: () => getThreatenedSpecies(lat, lng, 10) },
    { key: 'water', fn: () => bounds ? getWaterFeatures(bounds) : Promise.resolve(null) },
    { key: 'gbif', fn: () => getSpeciesOccurrences(lat, lng, 10) },
    { key: 'activeFires', fn: () => getActiveFiresNearby(lat, lng, 50) },
    { key: 'flood', fn: () => getFloodForecastWithHistory(lat, lng) },
    { key: 'infrastructure', fn: () => bounds ? getInfrastructure(bounds) : Promise.resolve(null) },
    { key: 'geology', fn: () => getGeology(lat, lng) },
    { key: 'protectedAreas', fn: () => getProtectedAreas(lat, lng, 25) },
  ];

  const results = {};
  let completed = 0;

  tasks.forEach(t =>
    t.fn()
      .then(data => { results[t.key] = { ok: true, data }; })
      .catch(err => { results[t.key] = { ok: false, error: String(err) }; })
      .finally(() => {
        renderDataSection(t.key, results, lat, lng);
        completed++;
        if (completed === tasks.length) {
          persistResults(lb, results);
        }
      })
  );
}

/**
 * Save fetched results to MongoDB so revisits load instantly.
 */
async function persistResults(lb, results) {
  if (!lb || !lb.id) return;
  try {
    // Serialize: strip error objects, keep only JSON-safe data
    const autoData = { lastFetched: new Date().toISOString() };
    for (const [key, val] of Object.entries(results)) {
      if (val.ok) {
        autoData[key] = val.data;
      }
    }
    await updateLandbook(lb.id, { autoData });
    // Show save indicator
    const indicator = document.getElementById('data-freshness');
    if (indicator) indicator.textContent = `Data saved \u2022 ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}

/**
 * Render cached autoData from MongoDB (instant on revisit).
 */
function renderCachedData(autoData, lat, lng) {
  if (!autoData) return;
  const results = {};
  for (const [key, data] of Object.entries(autoData)) {
    if (key === 'lastFetched') continue;
    results[key] = { ok: true, data };
  }
  // Render all cached sections
  for (const key of Object.keys(results)) {
    renderDataSection(key, results, lat, lng);
  }
}

function renderDataSection(key, results, lat, lng) {
  switch (key) {
    case 'elevation': renderElevation(results); break;
    case 'forecast': renderWeather(results); renderFireRisk(results, lat, lng); break;
    case 'climate': renderClimate(results); renderSeasonalRiskCalendar(results); break;
    case 'soilProps':
    case 'soilClass': renderSoil(results); break;
    case 'species':
    case 'threatened':
    case 'gbif': renderBiodiversity(results); break;
    case 'water': renderWater(results); break;
    case 'flood': renderFloodData(results); break;
    case 'activeFires': renderActiveFires(results); break;
    case 'infrastructure': renderInfrastructure(results, lat, lng); break;
    case 'geology': renderGeology(results); break;
    case 'protectedAreas': renderProtected(results); break;
  }
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderElevation(results) {
  const el = getDataEl('data-elevation');
  if (!el) return;
  const r = results.elevation;
  if (!r) return;

  if (r.ok && r.data != null) {
    el.innerHTML = `<div class="data-grid">
      ${dataCard('Elevation', `${Math.round(r.data)} m`, 'Meters above sea level (SRTM)')}
    </div>`;
  } else {
    el.innerHTML = errorBlock('Elevation data unavailable.');
  }
}

function renderWeather(results) {
  const el = getDataEl('data-weather');
  if (!el) return;
  const r = results.forecast;
  if (!r) return;

  if (!r.ok) {
    el.innerHTML = errorBlock('Weather forecast unavailable.');
    return;
  }

  const forecast = r.data;
  const current = forecast.current || {};
  const daily = forecast.daily || {};
  const times = daily.time || [];
  const desc = getWeatherDescription(current.weathercode);

  let html = `
    <h3>Current Conditions</h3>
    <div class="data-grid cols-4">
      ${dataCard('Temperature', current.temperature_2m != null ? `${current.temperature_2m}\u00B0C` : '\u2014')}
      ${dataCard('Condition', desc)}
      ${dataCard('Humidity', current.relative_humidity_2m != null ? `${current.relative_humidity_2m}%` : '\u2014')}
      ${dataCard('Wind', current.wind_speed_10m != null ? `${current.wind_speed_10m} km/h` : '\u2014')}
    </div>`;

  if (times.length > 0) {
    html += `
      <h3>7-Day Forecast</h3>
      <div style="overflow-x:auto;">
        <table class="lb-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Condition</th>
              <th>High</th>
              <th>Low</th>
              <th>Rain</th>
              <th>Wind</th>
            </tr>
          </thead>
          <tbody>
            ${times.map((date, i) => {
      const dayName = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const wDesc = getWeatherDescription(daily.weathercode ? daily.weathercode[i] : null);
      const high = daily.temperature_2m_max ? daily.temperature_2m_max[i] : null;
      const low = daily.temperature_2m_min ? daily.temperature_2m_min[i] : null;
      const rain = daily.precipitation_sum ? daily.precipitation_sum[i] : null;
      const wind = daily.wind_speed_10m_max ? daily.wind_speed_10m_max[i] : null;
      return `<tr>
                <td><strong>${dayName}</strong></td>
                <td>${esc(wDesc)}</td>
                <td>${high != null ? `${high}\u00B0C` : '\u2014'}</td>
                <td>${low != null ? `${low}\u00B0C` : '\u2014'}</td>
                <td>${rain != null ? `${rain} mm` : '\u2014'}</td>
                <td>${wind != null ? `${wind} km/h` : '\u2014'}</td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // Wind summary from daily data
  const winds = daily.wind_speed_10m_max ? daily.wind_speed_10m_max.filter(v => v != null) : [];
  const uvMax = daily.uv_index_max ? daily.uv_index_max.filter(v => v != null) : [];
  if (winds.length > 0 || uvMax.length > 0) {
    const avgWind = winds.length ? (winds.reduce((s, v) => s + v, 0) / winds.length).toFixed(1) : null;
    const peakWind = winds.length ? Math.max(...winds).toFixed(1) : null;
    const maxUv = uvMax.length ? Math.max(...uvMax).toFixed(1) : null;
    html += `<h3>Wind and Atmospheric Conditions</h3>
      <table class="lb-kv-table">
        ${avgWind ? `<tr><td>Average Wind Speed</td><td>${avgWind} km/h</td></tr>` : ''}
        ${peakWind ? `<tr><td>Peak Gusts (7-day)</td><td>${peakWind} km/h</td></tr>` : ''}
        ${maxUv ? `<tr><td>UV Index (max)</td><td>${maxUv}${parseFloat(maxUv) >= 8 ? ' \u2014 Very High' : parseFloat(maxUv) >= 6 ? ' \u2014 High' : parseFloat(maxUv) >= 3 ? ' \u2014 Moderate' : ' \u2014 Low'}</td></tr>` : ''}
      </table>`;
  }

  const climateHtml = buildClimateHtml(results);
  el.innerHTML = html + climateHtml;
}

function renderClimate(results) {
  const el = getDataEl('data-weather');
  if (!el) return;
  if (results.forecast) renderWeather(results);
}

function buildClimateHtml(results) {
  const cr = results.climate;
  if (!cr || !cr.ok || !cr.data) return '';
  const months = cr.data;

  const maxPrecip = Math.max(...months.map(m => m.totalPrecip || 0), 1);
  const maxTemp = Math.max(...months.map(m => m.avgHigh || 0), 1);
  const frost = estimateFrostDates(months);

  // SVG dual-axis climate chart
  const chartHtml = `
    <h3>Climate Profile — Monthly Temperature and Rainfall</h3>` + buildClimateSvg(months, maxPrecip, maxTemp) + `
    <div class="lb-figure-caption">Figure 1 — Climate profile based on 30-year average (Open-Meteo)</div>`;

  // Monthly data table
  const tableHtml = `
    <h3>${t('lb.weather.climateTable')}</h3>
    <div style="overflow-x:auto;">
      <table class="lb-table">
        <thead><tr>
          <th>Month</th><th>High \u00B0C</th><th>Low \u00B0C</th><th>Rain mm</th>
        </tr></thead>
        <tbody>
          ${months.map(m => `<tr>
            <td><strong>${m.month}</strong></td>
            <td>${m.avgHigh != null ? Math.round(m.avgHigh) : '\u2014'}</td>
            <td>${m.avgLow != null ? Math.round(m.avgLow) : '\u2014'}</td>
            <td>${m.totalPrecip != null ? Math.round(m.totalPrecip) : '\u2014'}</td>
          </tr>`).join('')}
          <tr style="font-weight:600;border-top:2px solid var(--black);">
            <td>ANNUAL</td>
            <td>${Math.round(months.reduce((s, m) => s + (m.avgHigh || 0), 0) / 12)}</td>
            <td>${Math.round(months.reduce((s, m) => s + (m.avgLow || 0), 0) / 12)}</td>
            <td>${Math.round(months.reduce((s, m) => s + (m.totalPrecip || 0), 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="lb-table-caption">Table 1 \u2014 Monthly climate averages based on 30-year records (Open-Meteo)</div>`;

  // Seasonal callouts
  const seasons = [
    { name: 'Winter (Dec\u2013Feb)', months: [11, 0, 1] },
    { name: 'Spring (Mar\u2013May)', months: [2, 3, 4] },
    { name: 'Summer (Jun\u2013Aug)', months: [5, 6, 7] },
    { name: 'Autumn (Sep\u2013Nov)', months: [8, 9, 10] },
  ];
  const seasonalHtml = `
    <h3>${t('lb.weather.seasonalPatterns')}</h3>
    <div class="data-grid">
      ${seasons.map(s => {
    const sMonths = s.months.map(i => months[i]);
    const avgH = Math.round(sMonths.reduce((a, m) => a + (m.avgHigh || 0), 0) / 3);
    const avgL = Math.round(sMonths.reduce((a, m) => a + (m.avgLow || 0), 0) / 3);
    const rain = Math.round(sMonths.reduce((a, m) => a + (m.totalPrecip || 0), 0));
    const variant = rain > 150 ? 'info' : avgH > 28 ? 'warning' : '';
    return `<div class="lb-callout ${variant}">
          <div class="lb-callout-title">${s.name}</div>
          <div class="lb-callout-body">Avg: ${avgL}\u2013${avgH}\u00B0C \u00B7 Rain: ${rain} mm</div>
        </div>`;
  }).join('')}
    </div>`;

  // Frost analysis
  const frostHtml = `
    <h3>${t('lb.weather.frostAnalysis')}</h3>
    <table class="lb-kv-table">
      <tr><td>Estimated Last Frost</td><td>${frost ? (frost.lastFrost || 'None (frost-free)') : 'Calculating...'}</td></tr>
      <tr><td>Estimated First Frost</td><td>${frost ? (frost.firstFrost || 'None (frost-free)') : 'Calculating...'}</td></tr>
      <tr><td>Growing Season</td><td>${computeGrowingSeason(frost)}</td></tr>
    </table>`;

  return chartHtml + tableHtml + seasonalHtml + frostHtml;
}

function computeGrowingSeason(frost) {
  if (!frost) return 'Calculating...';
  if (!frost.lastFrost && !frost.firstFrost) return 'Year-round (frost-free)';
  return `${frost.lastFrost || 'January'} to ${frost.firstFrost || 'December'}`;
}

let _soilRendered = false;
function renderSoil(results) {
  const el = getDataEl('data-soil');
  if (!el) return;
  const rp = results.soilProps;
  const rc = results.soilClass;
  if (!rp || !rc) return;
  if (_soilRendered) return;
  _soilRendered = true;

  let html = '';
  if (rp.ok) {
    const props = parseSoilProperties(rp.data);
    if (props) {
      const desc = getSoilDescription(props.texture);
      html += `<div class="data-grid cols-3">
        ${dataCard('Texture', props.texture)}
        ${dataCard('pH', props.ph || '\u2014', props.ph ? (parseFloat(props.ph) < 6 ? 'Acidic' : parseFloat(props.ph) > 7.5 ? 'Alkaline' : 'Neutral') : '')}
        ${dataCard('Organic Carbon', props.organicCarbon || '\u2014', 'Top 0\u20135 cm')}
        ${dataCard('Clay', props.clay || '\u2014')}
        ${dataCard('Sand', props.sand || '\u2014')}
        ${dataCard('Silt', props.silt || '\u2014')}
        ${dataCard('Nitrogen', props.nitrogen || '\u2014')}
        ${dataCard('CEC', props.cec || '\u2014', 'Cation Exchange Capacity')}
        ${dataCard('Bulk Density', props.bulkDensity || '\u2014')}
      </div>
      <p style="margin-top:16px;font-size:15px;line-height:1.65;color:#333;">${esc(desc)}</p>`;
    } else {
      html += errorBlock('Soil data not available for this location.');
    }
  } else {
    html += errorBlock('Could not fetch soil properties.');
  }

  if (rc.ok) {
    const cls = parseSoilClassification(rc.data);
    if (cls) {
      html += `<h3 style="margin-top:24px;">WRB Classification</h3>
        <div class="data-grid">
          ${dataCard('Primary Class', cls.primary, cls.probability ? `${Math.round(cls.probability * 100)}% probability` : '')}
        </div>`;
    }
  }

  el.innerHTML = html;
}

function renderWater(results) {
  const el = getDataEl('data-water');
  if (!el) return;
  const r = results.water;
  if (!r) return;

  if (!r.ok || !r.data) {
    el.innerHTML = errorBlock('Water feature data unavailable.');
    return;
  }

  const nodes = extractNodes(r.data);
  const ways = extractWays(r.data);
  const rivers = ways.filter(w => w.tags && w.tags.waterway === 'river');
  const streams = ways.filter(w => w.tags && w.tags.waterway === 'stream');
  const wells = nodes.filter(n => n.tags && n.tags.man_made === 'water_well');
  const springs = nodes.filter(n => n.tags && n.tags.natural === 'spring');
  const waterBodies = ways.filter(w => w.tags && w.tags.natural === 'water');

  const total = rivers.length + streams.length + wells.length + springs.length + waterBodies.length;
  if (total === 0) {
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">No water features found nearby.</p>';
    return;
  }

  el.innerHTML = `<h3>Water Features</h3><div class="data-grid cols-3">
    ${dataCard('Rivers', String(rivers.length), rivers.slice(0, 3).map(r => r.tags.name || 'Unnamed').join(', ') || '')}
    ${dataCard('Streams', String(streams.length))}
    ${dataCard('Water Bodies', String(waterBodies.length))}
    ${dataCard('Wells', String(wells.length))}
    ${dataCard('Springs', String(springs.length))}
  </div>`;
}

let _bioRendered = false;
function renderBiodiversity(results) {
  const el = getDataEl('data-biodiversity');
  if (!el) return;
  const rs = results.species;
  const rt = results.threatened;
  if (!rs || !rt) return;
  if (_bioRendered) return;
  _bioRendered = true;

  let html = '';

  if (rs.ok) {
    const summary = summarizeSpeciesCounts(rs.data);
    if (summary.total > 0) {
      html += `<div class="auto-data-banner">
        <span><strong>${summary.total.toLocaleString()} species</strong> observed within 5 km (iNaturalist)</span>
      </div>`;

      const groups = Object.entries(summary.groups).sort((a, b) => b[1] - a[1]);
      if (groups.length) {
        html += `<h3>${t('lb.bio.speciesByGroup')}</h3>` + buildSpeciesBarChart(groups);
      }

      // Most observed species with photo cards
      const top = summary.species.slice(0, 10);
      if (top.length) {
        html += `<h3>Most Observed</h3><div class="species-grid">
          ${top.map(sp => `<div class="species-card">
            ${sp.photoUrl ? `<img class="species-photo" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="species-photo"></div>'}
            <div class="species-info">
              <div class="species-name">${esc(sp.name)}</div>
              <div class="species-scientific">${esc(sp.scientificName)}</div>
              <div class="species-meta">${sp.observationCount} observations</div>
            </div>
          </div>`).join('')}
        </div>`;
      }
    } else {
      html += '<p style="color:var(--muted);">No species observations found nearby.</p>';
    }
  } else {
    html += errorBlock('Could not fetch biodiversity data.');
  }

  // Threatened species with photo cards
  if (rt.ok) {
    const topThreatened = summarizeSpeciesCounts(rt.data);
    if (topThreatened.species && topThreatened.species.length > 0) {
      html += `<h3>Notable Species (Threatened, 10 km)</h3>
        <div class="species-grid">
          ${topThreatened.species.slice(0, 8).map(sp => `<div class="species-card">
            ${sp.photoUrl ? `<img class="species-photo" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="species-photo"></div>'}
            <div class="species-info">
              <div class="species-name">${esc(sp.name)}</div>
              <div class="species-scientific">${esc(sp.scientificName)}</div>
              <div class="species-meta">${sp.observationCount} observations</div>
            </div>
          </div>`).join('')}
        </div>`;
    }
  }

  // GBIF occurrences (if available)
  const rg = results.gbif;
  if (rg && rg.ok && rg.data) {
    const gbifSummary = summarizeOccurrences(rg.data);
    if (gbifSummary.total > 0) {
      html += `<h3>GBIF Records (10 km)</h3>
        <div class="auto-data-banner">
          <span><strong>${gbifSummary.total.toLocaleString()}</strong> occurrence records in GBIF</span>
        </div>`;
      const kingdoms = Object.entries(gbifSummary.kingdoms).sort((a, b) => b[1] - a[1]);
      if (kingdoms.length) {
        html += `<table class="lb-kv-table">
          ${kingdoms.map(([k, c]) => `<tr><td>${esc(k)}</td><td>${c.toLocaleString()} records</td></tr>`).join('')}
        </table>`;
      }
    }
  }

  // Bioindicator callout
  const totalSpecies = rs.ok ? summarizeSpeciesCounts(rs.data).total : 0;
  const threatenedCount = rt.ok && rt.data ? summarizeSpeciesCounts(rt.data).total : 0;
  if (totalSpecies > 0) {
    const calloutType = threatenedCount > 20 ? 'warning' : '';
    html += `<div class="lb-callout ${calloutType}">
      <div class="lb-callout-title">${t('lb.bio.bioindicators')}</div>
      <div class="lb-callout-body">${totalSpecies.toLocaleString()} species recorded within 5 km. ${threatenedCount > 0 ? threatenedCount + ' threatened species observed within 10 km.' : 'No threatened species detected nearby.'} ${threatenedCount > 20 ? 'Elevated conservation attention may be warranted.' : 'Species diversity appears typical for this region.'}</div>
    </div>`;
  }

  el.innerHTML = html;
}

function renderFireRisk(results, lat, lng) {
  const el = getDataEl('data-fire');
  if (!el) return;
  const r = results.forecast;

  let fire = { level: 'Unknown', color: '#999', score: 0 };
  if (r && r.ok && r.data && r.data.daily) {
    const daily = r.data.daily;
    const maxTemp = daily.temperature_2m_max ? Math.max(...daily.temperature_2m_max.filter(v => v != null)) : null;
    const totalPrecip = daily.precipitation_sum ? daily.precipitation_sum.reduce((s, v) => s + (v || 0), 0) : null;
    if (maxTemp != null && totalPrecip != null) {
      fire = estimateFireRisk(lat, lng, maxTemp, totalPrecip, new Date().getMonth());
    }
  }

  const calloutType = fire.level === 'Very High' || fire.level === 'Extreme' ? 'danger' : fire.level === 'High' ? 'warning' : '';
  el.innerHTML = `
    <div class="lb-callout ${calloutType}">
      <div class="lb-callout-title">Fire Risk Assessment: ${esc(fire.level)}</div>
      <div class="lb-callout-body">Based on current temperature, precipitation, location, and season.</div>
    </div>
    <table class="lb-kv-table">
      <tr><td>Risk Level</td><td>${esc(fire.level)}</td></tr>
      <tr><td>Risk Score</td><td>${fire.score}/10</td></tr>
      <tr><td>Assessment Period</td><td>Current 7-day forecast</td></tr>
      <tr><td>Data Sources</td><td>Open-Meteo, EFFIS</td></tr>
    </table>`;
}

function renderProtected(results) {
  const el = getDataEl('data-protected');
  if (!el || el.dataset.rendered) return;
  const r = results.protectedAreas;
  if (!r) return;
  el.dataset.rendered = 'true';

  let html = '';

  if (r.ok && r.data && r.data.length > 0) {
    html += `<h3>Nearby Protected Areas</h3>
      <table class="lb-table">
        <thead><tr><th>Type</th><th>Name</th><th>Description</th></tr></thead>
        <tbody>
          ${r.data.map(pa => `<tr>
            <td>${esc(pa.type)}</td>
            <td><strong>${esc(pa.nameEn || pa.name)}</strong></td>
            <td>${esc(pa.description)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } else {
    html += '<p style="color:var(--muted);">No protected areas found within 25 km.</p>';
  }

  el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Phase 5A: New renderer functions
// ---------------------------------------------------------------------------

// renderAdminUnit removed — was Portugal-only (DGT). Address comes from create page now.

function renderGeology(results) {
  const el = getDataEl('data-geology');
  if (!el || el.dataset.rendered) return;
  const r = results.geology;
  if (!r) return;
  el.dataset.rendered = 'true';

  if (!r.ok || !r.data) {
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">Geology data unavailable.</p>';
    return;
  }

  const geo = parseGeology(r.data);
  if (!geo || !geo.primary) {
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">No geological data for this location.</p>';
    return;
  }

  const p = geo.primary;
  el.innerHTML = `
    <h3>Geology</h3>
    <div class="data-grid cols-3">
      ${dataCard('Bedrock', p.lithology || 'Unknown', p.age || '')}
      ${dataCard('Formation', p.name || 'Unnamed', p.period || '')}
      ${dataCard('Environment', p.environment || 'Unknown', '')}
    </div>
    <p style="font-size:14px;line-height:1.65;color:#555;margin-top:12px;">${esc(getGeologyDescription(geo))}</p>
    ${geo.count > 1 ? `<p style="font-size:13px;color:var(--muted);">${geo.count} geological units mapped at this point.</p>` : ''}
  `;
}

function renderActiveFires(results) {
  const el = getDataEl('data-active-fires');
  if (!el || el.dataset.rendered) return;
  const r = results.activeFires;
  if (!r) return;
  el.dataset.rendered = 'true';

  if (!r.ok) {
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">Active fire detection unavailable (NASA FIRMS).</p>';
    return;
  }

  const fires = r.data || [];
  const summary = summarizeFireDetections(fires);

  if (summary.count === 0) {
    el.innerHTML = `
      <h3>Active Fire Detections</h3>
      <div class="auto-data-banner" style="border-color:#00CC00;">
        <span>No active fires detected within 50 km in the last 48 hours (NASA VIIRS)</span>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <h3>Active Fire Detections</h3>
    <div class="auto-data-banner" style="border-color:#FF3300;background:rgba(255,51,0,0.05);">
      <span><strong>${summary.count} fire detection${summary.count > 1 ? 's' : ''}</strong> within 50 km (NASA VIIRS, last 48h)</span>
    </div>
    <div class="data-grid cols-3">
      ${dataCard('High Confidence', String(summary.highConfidence), 'detections')}
      ${dataCard('Max FRP', summary.maxFrp + ' MW', 'fire radiative power')}
      ${dataCard('Dates', summary.dates.join(', '), '')}
    </div>
  `;
}

// renderIpmaForecast and renderDrought removed — were Portugal-only (IPMA API)

let _floodRendered = false;
function renderFloodData(results) {
  const el = getDataEl('data-flood');
  if (!el || _floodRendered) return;
  const r = results.flood;
  if (!r) return;
  _floodRendered = true;

  if (!r.ok || !r.data) {
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">Flood discharge data unavailable.</p>';
    return;
  }

  const analysis = analyzeFloodRisk(r.data);
  el.innerHTML = `
    <h3>River Discharge (GloFAS)</h3>
    <div class="data-grid cols-3">
      ${dataCard('Current', analysis.current + ' m³/s', 'river discharge')}
      ${dataCard('30-day Average', analysis.average + ' m³/s', '')}
      ${dataCard('Status', analysis.level, `ratio: ${analysis.ratio}x average`)}
    </div>
  `;
}

function renderInfrastructure(results, lat, lng) {
  const el = getDataEl('data-infrastructure');
  if (!el || el.dataset.rendered) return;
  const r = results.infrastructure;
  if (!r) return;
  el.dataset.rendered = 'true';

  if (!r.ok || !r.data) return;

  const nodes = extractNodes(r.data);
  if (nodes.length === 0) return;

  const amenities = nodes.map(n => ({
    lat: n.lat,
    lng: n.lon,
    name: n.tags?.name || n.tags?.amenity || n.tags?.shop || n.tags?.tourism || 'Unnamed',
    type: n.tags?.amenity || n.tags?.shop || n.tags?.tourism || 'other',
    tags: n.tags,
  }));

  const withDistances = calculateDistances([lat, lng], amenities);
  const categories = categorizeAmenities(amenities);

  // Show nearest in each category
  const nearestByCategory = {};
  withDistances.forEach(a => {
    const cat = getCategoryKey(a);
    if (!nearestByCategory[cat] || a.distanceKm < nearestByCategory[cat].distanceKm) {
      nearestByCategory[cat] = a;
    }
  });

  const items = Object.entries(nearestByCategory).slice(0, 6);
  if (items.length === 0) return;

  el.innerHTML = `
    <h3 style="margin-top:16px;">Nearest Services</h3>
    <div class="data-grid cols-3">
      ${items.map(([cat, a]) =>
    dataCard(esc(a.name), `${a.distanceKm.toFixed(1)} km`, cat)
  ).join('')}
    </div>
  `;
}

function getCategoryKey(amenity) {
  const type = amenity.type || '';
  if (['hospital', 'pharmacy', 'doctors', 'clinic'].includes(type)) return 'Health';
  if (['school', 'university', 'library'].includes(type)) return 'Education';
  if (['supermarket', 'convenience'].includes(type)) return 'Shopping';
  if (['post_office', 'bank', 'community_centre'].includes(type)) return 'Services';
  if (['hotel', 'guest_house', 'camp_site'].includes(type)) return 'Tourism';
  return 'Other';
}

// ---------------------------------------------------------------------------
// User-Reported Form (inline)
// ---------------------------------------------------------------------------

function renderUserForm(lb) {
  const ur = lb.userReported || createUserReported();
  const goals = ur.goals || {};
  const infra = ur.infrastructure || {};
  const challenges = ur.challenges || [];

  const challengeOptions = [
    'Water scarcity', 'Fire risk', 'Soil erosion', 'Invasive species',
    'Labor', 'Access', 'Bureaucracy', 'Other',
  ];

  return `
    <form id="user-reported-form">
      <div class="field">
        <label for="primary-use">Primary Land Use</label>
        <select id="primary-use" name="primaryUse">
          <option value="">Select primary use...</option>
          ${['dryland agriculture', 'plantation', 'forest', 'residential', 'tourists', 'undeveloped', 'other']
      .map(v => `<option value="${v}" ${ur.primaryUse === v ? 'selected' : ''}>${esc(v.charAt(0).toUpperCase() + v.slice(1))}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="secondary-use">Secondary Use</label>
        <input type="text" id="secondary-use" name="secondaryUse" placeholder="e.g., beekeeping, foraging" value="${esc(ur.secondaryUse || '')}">
      </div>

      <div class="field">
        <label>Current Challenges</label>
        <div class="chip-group">
          ${challengeOptions.map(ch => {
        const val = ch.toLowerCase();
        const checked = challenges.map(c => c.toLowerCase()).includes(val) ? 'checked' : '';
        return `<label><input type="checkbox" name="challenges" value="${val}" ${checked}> ${esc(ch)}</label>`;
      }).join('')}
        </div>
      </div>

      <div class="field">
        <label for="goals-1yr">Goals \u2014 1 Year</label>
        <textarea id="goals-1yr" name="goalsOneYear" rows="3" placeholder="What do you want to accomplish?">${esc(goals.oneYear || '')}</textarea>
      </div>

      <div class="field">
        <label for="goals-3yr">Goals \u2014 3 Years</label>
        <textarea id="goals-3yr" name="goalsThreeYear" rows="3" placeholder="Where do you see this land?">${esc(goals.threeYear || '')}</textarea>
      </div>

      <div class="field">
        <label for="goals-5yr">Goals \u2014 5 Years</label>
        <textarea id="goals-5yr" name="goalsFiveYear" rows="3" placeholder="Long-term vision?">${esc(goals.fiveYear || '')}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="infra-irrigation">Irrigation</label>
          <input type="text" id="infra-irrigation" name="irrigation" placeholder="e.g., drip, well, none" value="${esc(infra.irrigation || '')}">
        </div>
        <div class="field">
          <label for="infra-energy">Energy</label>
          <input type="text" id="infra-energy" name="energy" placeholder="e.g., solar, grid" value="${esc(infra.energy || '')}">
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="infra-water">Water Sources</label>
          <input type="text" id="infra-water" name="waterSources" placeholder="e.g., borehole, rainwater" value="${esc(infra.waterSources || '')}">
        </div>
        <div class="field">
          <label for="infra-buildings">Buildings</label>
          <input type="text" id="infra-buildings" name="buildings" placeholder="e.g., ruin, barn, none" value="${esc(infra.buildings || '')}">
        </div>
      </div>

      <div class="field">
        <label for="sharing">What have you figured out worth sharing?</label>
        <textarea id="sharing" name="sharing" rows="3" placeholder="Techniques, discoveries, things that work...">${esc(ur.sharing || '')}</textarea>
      </div>

      <div class="field">
        <label for="history">History of your land</label>
        <textarea id="history" name="history" rows="3" placeholder="Previous uses, old maps, stories...">${esc(ur.history || '')}</textarea>
      </div>

      <div class="field">
        <label for="notes">Additional Notes</label>
        <textarea id="notes" name="notes" rows="2" placeholder="Anything else...">${esc(ur.notes || '')}</textarea>
      </div>

      <button type="submit" class="btn-primary" id="save-user-data">Save Your Knowledge</button>
      <div id="save-feedback" style="margin-top:12px;font-size:14px;"></div>
    </form>`;
}

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------

document.addEventListener('submit', (e) => {
  if (e.target && e.target.id === 'user-reported-form') {
    e.preventDefault();
    saveUserData();
  }
});

async function saveUserData() {
  if (!landbook) return;
  const form = document.getElementById('user-reported-form');
  if (!form) return;

  const val = (name) => (form.querySelector(`[name="${name}"]`) || {}).value || '';
  const checked = (name) => Array.from(form.querySelectorAll(`[name="${name}"]:checked`)).map(cb => cb.value);

  const userReported = {
    primaryUse: val('primaryUse'),
    secondaryUse: val('secondaryUse'),
    challenges: checked('challenges'),
    goals: {
      oneYear: val('goalsOneYear'),
      threeYear: val('goalsThreeYear'),
      fiveYear: val('goalsFiveYear'),
    },
    infrastructure: {
      irrigation: val('irrigation'),
      energy: val('energy'),
      waterSources: val('waterSources'),
      buildings: val('buildings'),
    },
    sharing: val('sharing'),
    history: val('history'),
    notes: val('notes'),
  };

  try {
    await updateLandbook(landbook.id, { userReported });
    const fb = document.getElementById('save-feedback');
    if (fb) {
      fb.innerHTML = '<span style="color:var(--green);font-weight:600;">Saved successfully.</span>';
      setTimeout(() => { fb.innerHTML = ''; }, 3000);
    }
  } catch (err) {
    console.error('Save failed:', err);
    const fb = document.getElementById('save-feedback');
    if (fb) {
      fb.innerHTML = '<span style="color:var(--coral);font-weight:600;">Save failed. Please try again.</span>';
    }
  }
}

// ---------------------------------------------------------------------------
// v2.0 New Renderers
// ---------------------------------------------------------------------------

const BAR_COLORS = {
  'Birds': 'birds', 'Aves': 'birds',
  'Mammalia': 'mammals', 'Mammals': 'mammals',
  'Reptilia': 'reptiles', 'Reptiles': 'reptiles',
  'Amphibia': 'amphibia', 'Amphibians': 'amphibia',
  'Fungi': 'fungi',
  'Plantae': 'plantae', 'Plants': 'plantae',
  'Insecta': 'insecta', 'Insects': 'insecta',
};

function buildSpeciesBarChart(groups) {
  if (!groups || !groups.length) return '';
  const maxCount = Math.max(...groups.map(([, c]) => c));
  return `<div class="lb-hbar-chart">
    ${groups.map(([g, c]) => {
      const pct = Math.max(Math.round((c / maxCount) * 100), 5);
      const colorClass = BAR_COLORS[g] || 'default';
      return `<div class="lb-hbar-row">
        <div class="lb-hbar-label">${esc(g)}</div>
        <div class="lb-hbar-track">
          <div class="lb-hbar-fill ${colorClass}" style="width:${pct}%">${c} species</div>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div class="lb-figure-caption">Figure 2 \u2014 Species observations by taxonomic group (iNaturalist, 5 km radius)</div>`;
}

function buildClimateSvg(months, maxPrecip, maxTemp) {
  // Chart dimensions
  const W = 760, H = 340;
  const pad = { top: 30, right: 60, bottom: 50, left: 50 };
  const cw = W - pad.left - pad.right; // chart width
  const ch = H - pad.top - pad.bottom; // chart height
  const barW = Math.floor(cw / 12) - 6;

  // Scale helpers
  const precipCeil = Math.ceil(maxPrecip / 20) * 20 || 100;
  const tempCeil = Math.ceil(maxTemp / 5) * 5 + 5;
  const pY = (v) => pad.top + ch - (v / precipCeil) * ch;
  const tY = (v) => pad.top + ch - (v / tempCeil) * ch;
  const mX = (i) => pad.left + (i + 0.5) * (cw / 12);

  // Rainfall bars
  const bars = months.map((m, i) => {
    const h = ((m.totalPrecip || 0) / precipCeil) * ch;
    const x = mX(i) - barW / 2;
    const y = pad.top + ch - h;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#8ECAFF" opacity="0.7" rx="2"/>`;
  }).join('');

  // Temperature lines
  const highPts = months.map((m, i) => `${mX(i)},${tY(m.avgHigh || 0)}`).join(' ');
  const lowPts = months.map((m, i) => `${mX(i)},${tY(m.avgLow || 0)}`).join(' ');

  // Filled area between high and low
  const areaPath = months.map((m, i) => `${mX(i)},${tY(m.avgHigh || 0)}`).join(' ')
    + ' ' + months.slice().reverse().map((m, i) => `${mX(11 - i)},${tY(m.avgLow || 0)}`).join(' ');

  // Y-axis ticks (left = temp, right = precip)
  const tempTicks = [];
  for (let v = 0; v <= tempCeil; v += 5) {
    tempTicks.push(`<line x1="${pad.left}" x2="${pad.left + cw}" y1="${tY(v)}" y2="${tY(v)}" stroke="#e0e0e0" stroke-width="0.5"/>
      <text x="${pad.left - 8}" y="${tY(v) + 4}" text-anchor="end" font-size="10" fill="#666">${v}</text>`);
  }
  const precipTicks = [];
  for (let v = 0; v <= precipCeil; v += 20) {
    precipTicks.push(`<text x="${pad.left + cw + 8}" y="${pY(v) + 4}" text-anchor="start" font-size="10" fill="#666">${v}</text>`);
  }

  // X-axis labels
  const xLabels = months.map((m, i) => `<text x="${mX(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#666">${m.month}</text>`).join('');

  // Dots on lines
  const highDots = months.map((m, i) => `<circle cx="${mX(i)}" cy="${tY(m.avgHigh || 0)}" r="3.5" fill="#E8860C" stroke="#fff" stroke-width="1.5"/>`).join('');
  const lowDots = months.map((m, i) => `<circle cx="${mX(i)}" cy="${tY(m.avgLow || 0)}" r="3.5" fill="#5BA4CF" stroke="#fff" stroke-width="1.5"/>`).join('');

  return `<div style="overflow-x:auto;margin:16px 0;">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;font-family:Inter,sans-serif;">
      <!-- Grid -->
      ${tempTicks.join('')}
      <!-- Bars -->
      ${bars}
      <!-- Filled area -->
      <polygon points="${areaPath}" fill="#E8860C" opacity="0.12"/>
      <!-- Lines -->
      <polyline points="${highPts}" fill="none" stroke="#E8860C" stroke-width="2.5"/>
      <polyline points="${lowPts}" fill="none" stroke="#5BA4CF" stroke-width="2.5"/>
      <!-- Dots -->
      ${highDots}
      ${lowDots}
      <!-- Axes -->
      <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${pad.top + ch}" stroke="#333" stroke-width="1"/>
      <line x1="${pad.left}" x2="${pad.left + cw}" y1="${pad.top + ch}" y2="${pad.top + ch}" stroke="#333" stroke-width="1"/>
      <line x1="${pad.left + cw}" x2="${pad.left + cw}" y1="${pad.top}" y2="${pad.top + ch}" stroke="#ccc" stroke-width="0.5"/>
      <!-- Axis labels -->
      <text x="${pad.left - 35}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#666" transform="rotate(-90,${pad.left - 35},${H / 2})">Temperature (\u00B0C)</text>
      <text x="${pad.left + cw + 45}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#666" transform="rotate(90,${pad.left + cw + 45},${H / 2})">Rainfall (mm)</text>
      <!-- Right axis ticks -->
      ${precipTicks.join('')}
      <!-- X labels -->
      ${xLabels}
      <!-- Legend -->
      <rect x="${W - 195}" y="8" width="185" height="56" fill="white" stroke="#ddd" rx="4"/>
      <line x1="${W - 185}" x2="${W - 165}" y1="22" y2="22" stroke="#E8860C" stroke-width="2.5"/>
      <circle cx="${W - 175}" cy="22" r="3" fill="#E8860C"/>
      <text x="${W - 158}" y="26" font-size="10" fill="#333">High Temp (\u00B0C)</text>
      <line x1="${W - 185}" x2="${W - 165}" y1="38" y2="38" stroke="#5BA4CF" stroke-width="2.5"/>
      <circle cx="${W - 175}" cy="38" r="3" fill="#5BA4CF"/>
      <text x="${W - 158}" y="42" font-size="10" fill="#333">Low Temp (\u00B0C)</text>
      <rect x="${W - 185}" y="50" width="16" height="10" fill="#8ECAFF" opacity="0.7" rx="1"/>
      <text x="${W - 158}" y="58" font-size="10" fill="#333">Rainfall (mm)</text>
    </svg>
  </div>`;
}

function renderSeasonalRiskCalendar(results) {
  const el = getDataEl('data-risk-calendar');
  if (!el || el.dataset.rendered) return;
  const cr = results.climate;
  if (!cr || !cr.ok || !cr.data) return;
  el.dataset.rendered = 'true';

  const months = cr.data;
  const monthLabels = months.map(m => m.month);

  el.innerHTML = `
    <h3>${t('lb.risk.seasonalCalendar')}</h3>
    <div style="overflow-x:auto;">
      <table class="lb-table" style="font-size:12px;">
        <thead><tr>
          <th>Risk</th>
          ${monthLabels.map(m => `<th style="text-align:center;padding:8px 6px;">${m}</th>`).join('')}
        </tr></thead>
        <tbody>
          <tr><td><strong>Fire</strong></td>
            ${months.map(m => {
              const temp = m.avgHigh || 0;
              const precip = m.totalPrecip || 0;
              const level = (temp > 28 && precip < 15) ? 'High' : (temp > 22 && precip < 40) ? 'Mod' : 'Low';
              const bg = level === 'High' ? '#EB5F5425' : level === 'Mod' ? '#E6A81718' : 'transparent';
              return `<td style="background:${bg};text-align:center;">${level}</td>`;
            }).join('')}
          </tr>
          <tr><td><strong>Flood</strong></td>
            ${months.map(m => {
              const level = (m.totalPrecip || 0) > 80 ? 'Elev.' : 'Low';
              const bg = level !== 'Low' ? '#8ECAFF20' : 'transparent';
              return `<td style="background:${bg};text-align:center;">${level}</td>`;
            }).join('')}
          </tr>
          <tr><td><strong>Drought</strong></td>
            ${months.map(m => {
              const precip = m.totalPrecip || 0;
              const level = precip < 10 ? 'High' : precip < 30 ? 'Mod' : 'Low';
              const bg = level === 'High' ? '#E6A81720' : level === 'Mod' ? '#E6A81710' : 'transparent';
              return `<td style="background:${bg};text-align:center;">${level}</td>`;
            }).join('')}
          </tr>
        </tbody>
      </table>
    </div>
    <div class="lb-table-caption">Table 2 \u2014 Seasonal risk assessment derived from 30-year climate data and location factors</div>`;
}

function renderSources() {
  return `
    <h3>Environmental Data</h3>
    <table class="lb-kv-table">
      <tr><td>Weather & Climate</td><td>Open-Meteo (open-meteo.com) \u2014 Historical & forecast data</td></tr>
      <tr><td>Soil Properties</td><td>SoilGrids (soilgrids.org) \u2014 ISRIC World Soil Information</td></tr>
      <tr><td>Elevation</td><td>Open-Meteo Elevation API \u2014 SRTM 90m DEM</td></tr>
      <tr><td>Geology</td><td>Macrostrat (macrostrat.org) \u2014 Geological map data</td></tr>
    </table>
    <h3>Biodiversity</h3>
    <table class="lb-kv-table">
      <tr><td>Species Observations</td><td>iNaturalist (inaturalist.org) \u2014 Community science records</td></tr>
      <tr><td>Occurrence Records</td><td>GBIF (gbif.org) \u2014 Global Biodiversity Information Facility</td></tr>
      <tr><td>Protected Areas</td><td>Natura 2000 Network \u2014 European Environment Agency</td></tr>
    </table>
    <h3>Risk & Hazards</h3>
    <table class="lb-kv-table">
      <tr><td>Fire Danger</td><td>EFFIS (effis.jrc.ec.europa.eu) \u2014 European Forest Fire Information System</td></tr>
      <tr><td>Active Fires</td><td>NASA FIRMS \u2014 VIIRS satellite fire detection</td></tr>
      <tr><td>Flood Hazard</td><td>GloFAS (globalfloods.eu) \u2014 Global Flood Awareness System</td></tr>
    </table>
    <h3>Land & Infrastructure</h3>
    <table class="lb-kv-table">
      <tr><td>Land Cover</td><td>CORINE, ESA WorldCover \u2014 Copernicus Land Monitoring Service</td></tr>
      <tr><td>Infrastructure</td><td>OpenStreetMap via Overpass API</td></tr>
      <tr><td>Geocoding</td><td>Nominatim / OpenStreetMap \u2014 Address and admin boundaries</td></tr>
      <tr><td>Satellite Imagery</td><td>Sentinel-2 \u2014 Copernicus Open Access Hub</td></tr>
    </table>`;
}
