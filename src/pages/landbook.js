/**
 * Landbook Report Page
 * Sidebar nav + long scroll with paginated sections.
 * Section order: Overview → Map → Elevation → Soil → Water → Weather → Biodiversity → Fire → Protected → Your Knowledge
 */

import '../styles/main.css';
import { createMap, mapboxgl, addMarker, addPolygon, addWmsLayer, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';

import { initI18n } from '../lib/i18n.js';
import { getLandbook, updateLandbook, createAutoData, createUserReported } from '../lib/store.js';
import { formatArea, formatDistance, polygonBounds, expandBounds, sqmToHectares } from '../lib/geo.js';

import { getForecast, getClimateAverages, getElevation, getWeatherDescription, estimateFrostDates } from '../api/open-meteo.js';
import { getSoilProperties, getSoilClassification, parseSoilProperties, parseSoilClassification, getSoilDescription } from '../api/soilgrids.js';
import { getWaterFeatures, extractNodes, extractWays } from '../api/overpass.js';
import { getSpeciesCounts, summarizeSpeciesCounts, getThreatenedSpecies } from '../api/inaturalist.js';
import { CORINE_WMS, SENTINEL2_TILES, getCorineWmsParams } from '../api/copernicus.js';
import { EFFIS_WMS, getFireDangerWmsParams, estimateFireRisk, ODEMIRA_FIRE_HISTORY } from '../api/effis.js';
import { NATURA2000_WMS, getNatura2000WmsParams, ODEMIRA_PROTECTED_AREAS, KEY_SPECIES, PT_ZONING } from '../api/natura2000.js';

initI18n();

// ---------------------------------------------------------------------------
// Section definitions (ordered)
// ---------------------------------------------------------------------------
const SECTION_DEFS = [
  { id: 'overview', icon: '\u{1F4CB}', label: 'Overview' },
  { id: 'map', icon: '\u{1F5FA}', label: 'Map' },
  { id: 'elevation', icon: '\u26F0', label: 'Elevation & Terrain' },
  { id: 'soil', icon: '\u{1F33E}', label: 'Soil' },
  { id: 'water', icon: '\u{1F4A7}', label: 'Water Features' },
  { id: 'weather', icon: '\u2601', label: 'Weather & Climate' },
  { id: 'biodiversity', icon: '\u{1F33F}', label: 'Biodiversity' },
  { id: 'fire', icon: '\u{1F525}', label: 'Fire Risk' },
  { id: 'protected', icon: '\u2696', label: 'Protected Areas' },
  { id: 'knowledge', icon: '\u270D', label: 'Your Knowledge' },
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
  return `<div id="${id}" class="loading-block"><span class="loading-spinner"></span> Loading...</div>`;
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

function pagination(currentIdx) {
  const prev = currentIdx > 0 ? SECTION_DEFS[currentIdx - 1] : null;
  const next = currentIdx < SECTION_DEFS.length - 1 ? SECTION_DEFS[currentIdx + 1] : null;
  return `<div class="section-pagination">
    <button class="btn-page ${prev ? '' : 'hidden'}" ${prev ? `onclick="document.getElementById('section-${prev.id}').scrollIntoView({behavior:'smooth'})"` : ''}>
      \u2190 ${prev ? prev.label : ''}
    </button>
    <span class="page-indicator">${currentIdx + 1} / ${SECTION_DEFS.length}</span>
    <button class="btn-page ${next ? '' : 'hidden'}" ${next ? `onclick="document.getElementById('section-${next.id}').scrollIntoView({behavior:'smooth'})"` : ''}>
      ${next ? next.label : ''} \u2192
    </button>
  </div>`;
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
        <h3>Landbook not found</h3>
        <p>This landbook does not exist or may have been removed.</p>
        <a href="create.html" class="btn-primary">Create a New Landbook</a>
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

  sidebar.innerHTML = SECTION_DEFS.map((s) => `
    <a class="landbook-nav-link" data-section="${s.id}" href="#section-${s.id}">
      <span class="nav-icon">${s.icon}</span>
      <span class="nav-label">${s.label}</span>
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
      <button class="btn-sidebar" id="btn-share">
        <span class="btn-icon">\u{1F517}</span> Share link
      </button>
      <button class="btn-sidebar" id="btn-export">
        <span class="btn-icon">\u{1F4C4}</span> Export PDF
      </button>
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
    btn.innerHTML = '<span class="btn-icon">\u2705</span> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {
    prompt('Copy this link:', window.location.href);
  });
}

function exportPdf() {
  const btn = document.getElementById('btn-export');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="btn-icon">\u23F3</span> Preparing...';

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
    <!-- 1. Overview -->
    <div class="landbook-section" id="section-overview">
      <div class="landbook-header">
        <div class="section-label">Landbook</div>
        <h1>${esc(lb.address || 'Untitled Parcel')}</h1>
        <div class="landbook-meta">
          ${lb.created ? `<span><strong>Created</strong>: ${formatDate(lb.created)}</span>` : ''}
          ${area ? `<span><strong>Area</strong>: ${formatArea(area)}${ha ? ` (${ha.toFixed(2)} ha)` : ''}</span>` : ''}
          ${perimeter ? `<span><strong>Perimeter</strong>: ${formatDistance(perimeter)}</span>` : ''}
          ${center ? `<span><strong>Center</strong>: ${center[0].toFixed(5)}, ${center[1].toFixed(5)}</span>` : ''}
        </div>
      </div>
      ${pagination(0)}
    </div>

    <!-- 2. Map -->
    <div class="landbook-section" id="section-map">
      <h2>Map</h2>
      ${boundary.length ? `
        <div class="landbook-map"><div id="landbook-map" style="width:100%;height:100%;"></div></div>
        <div class="map-layer-toggles" id="map-layer-toggles"></div>
      ` : '<p style="color:var(--muted);">No boundary data available.</p>'}
      ${pagination(1)}
    </div>

    <!-- 3. Elevation -->
    <div class="landbook-section" id="section-elevation">
      <h2>Elevation &amp; Terrain</h2>
      ${skeleton('data-elevation')}
      ${pagination(2)}
    </div>

    <!-- 4. Soil -->
    <div class="landbook-section" id="section-soil">
      <h2>Soil</h2>
      ${skeleton('data-soil')}
      ${pagination(3)}
    </div>

    <!-- 5. Water -->
    <div class="landbook-section" id="section-water">
      <h2>Water Features</h2>
      ${skeleton('data-water')}
      ${pagination(4)}
    </div>

    <!-- 6. Weather -->
    <div class="landbook-section" id="section-weather">
      <h2>Weather &amp; Climate</h2>
      ${skeleton('data-weather')}
      ${pagination(5)}
    </div>

    <!-- 7. Biodiversity -->
    <div class="landbook-section" id="section-biodiversity">
      <h2>Biodiversity</h2>
      ${skeleton('data-biodiversity')}
      ${pagination(6)}
    </div>

    <!-- 8. Fire -->
    <div class="landbook-section" id="section-fire">
      <h2>Fire Risk</h2>
      ${skeleton('data-fire')}
      ${pagination(7)}
    </div>

    <!-- 9. Protected Areas -->
    <div class="landbook-section" id="section-protected">
      <h2>Protected Areas &amp; Zoning</h2>
      ${skeleton('data-protected')}
      ${pagination(8)}
    </div>

    <!-- 10. Your Knowledge (inline form) -->
    <div class="landbook-section user-form" id="section-knowledge">
      <h2>Your Knowledge</h2>
      <p class="form-desc">Add what you know about this land. Your observations complement the data above.</p>
      <div id="user-form-container">${renderUserForm(lb)}</div>
      ${pagination(9)}
    </div>
  `;

  // Init map
  if (boundary.length) initMap(boundary, center);

  // Render static sections immediately
  renderProtected();

  // Fetch live data in parallel
  if (center) fetchAllData(lb, center[0], center[1], boundary);
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

let wmsLayers = {};

function initMap(boundary, center) {
  const map = createMap('landbook-map', {
    center: [center[1], center[0]],
    zoom: 14,
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

    fitToCoords(map, boundary);

    wmsLayers.corine = addWmsLayer(map, CORINE_WMS, getCorineWmsParams(), {
      sourceId: 'wms-corine', opacity: 0.5, visible: false,
    });
    wmsLayers.fire = addWmsLayer(map, EFFIS_WMS, getFireDangerWmsParams(), {
      sourceId: 'wms-fire', opacity: 0.5, visible: false,
    });
    wmsLayers.natura = addWmsLayer(map, NATURA2000_WMS, getNatura2000WmsParams(), {
      sourceId: 'wms-natura', opacity: 0.5, visible: false,
    });

    renderLayerToggles(map);
  });
}

function renderLayerToggles(map) {
  const el = document.getElementById('map-layer-toggles');
  if (!el) return;

  const layers = [
    { key: 'corine', label: 'CORINE Land Cover' },
    { key: 'fire', label: 'EFFIS Fire Danger' },
    { key: 'natura', label: 'Natura 2000' },
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
  ];

  const results = {};
  tasks.forEach(t =>
    t.fn()
      .then(data => { results[t.key] = { ok: true, data }; })
      .catch(err => { results[t.key] = { ok: false, error: err }; })
      .finally(() => renderDataSection(t.key, results, lat, lng))
  );
}

function renderDataSection(key, results, lat, lng) {
  switch (key) {
    case 'elevation': renderElevation(results); break;
    case 'forecast': renderWeather(results); renderFireRisk(results, lat, lng); break;
    case 'climate': renderClimate(results); break;
    case 'soilProps':
    case 'soilClass': renderSoil(results); break;
    case 'species':
    case 'threatened': renderBiodiversity(results); break;
    case 'water': renderWater(results); break;
  }
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderElevation(results) {
  const el = document.getElementById('data-elevation');
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
  const el = document.getElementById('data-weather');
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
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="border-bottom:2px solid var(--black);text-align:left;">
              <th style="padding:8px 12px;">Day</th>
              <th style="padding:8px 12px;">Condition</th>
              <th style="padding:8px 12px;">High</th>
              <th style="padding:8px 12px;">Low</th>
              <th style="padding:8px 12px;">Rain</th>
              <th style="padding:8px 12px;">Wind</th>
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
      return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 12px;font-weight:500;">${dayName}</td>
                <td style="padding:10px 12px;">${esc(wDesc)}</td>
                <td style="padding:10px 12px;">${high != null ? `${high}\u00B0C` : '\u2014'}</td>
                <td style="padding:10px 12px;">${low != null ? `${low}\u00B0C` : '\u2014'}</td>
                <td style="padding:10px 12px;">${rain != null ? `${rain} mm` : '\u2014'}</td>
                <td style="padding:10px 12px;">${wind != null ? `${wind} km/h` : '\u2014'}</td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  const climateHtml = buildClimateHtml(results);
  el.innerHTML = html + climateHtml;
}

function renderClimate(results) {
  const el = document.getElementById('data-weather');
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
  const frostHtml = frost ? `
    <div class="data-grid" style="margin-top:16px;">
      ${dataCard('Est. Last Frost', frost.lastFrost || 'None (frost-free)', '30-year average')}
      ${dataCard('Est. First Frost', frost.firstFrost || 'None (frost-free)', '30-year average')}
    </div>` : '';

  return `
    <h3>Climate Averages (30 years)</h3>
    <div class="climate-chart">
      <div style="display:flex;gap:12px;margin-bottom:8px;font-size:12px;color:var(--muted);">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--blue,#4A90D9);border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Precipitation (mm)</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--coral,#EB5F54);border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Avg High</span>
      </div>
      <div class="chart-bars">
        ${months.map(m => {
    const precipH = Math.round(((m.totalPrecip || 0) / maxPrecip) * 100);
    const tempH = Math.round(((m.avgHigh || 0) / maxTemp) * 100);
    return `<div class="chart-bar" title="${m.month}: ${Math.round(m.totalPrecip || 0)}mm, ${Math.round(m.avgHigh || 0)}\u00B0C">
            <div class="bar" style="height:${precipH}%;"></div>
            <div class="bar temp" style="height:${tempH}%;"></div>
          </div>`;
  }).join('')}
      </div>
      <div class="chart-labels">${months.map(m => `<span>${m.month}</span>`).join('')}</div>
    </div>
    ${frostHtml}`;
}

let _soilRendered = false;
function renderSoil(results) {
  const el = document.getElementById('data-soil');
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
  const el = document.getElementById('data-water');
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

  el.innerHTML = `<div class="data-grid cols-3">
    ${dataCard('Rivers', String(rivers.length), rivers.slice(0, 3).map(r => r.tags.name || 'Unnamed').join(', ') || '')}
    ${dataCard('Streams', String(streams.length))}
    ${dataCard('Water Bodies', String(waterBodies.length))}
    ${dataCard('Wells', String(wells.length))}
    ${dataCard('Springs', String(springs.length))}
  </div>`;
}

let _bioRendered = false;
function renderBiodiversity(results) {
  const el = document.getElementById('data-biodiversity');
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
        <span class="icon">\u{1F33F}</span>
        <span><strong>${summary.total.toLocaleString()} species</strong> observed within 5 km (iNaturalist)</span>
      </div>`;

      const groups = Object.entries(summary.groups).sort((a, b) => b[1] - a[1]);
      if (groups.length) {
        html += `<h3>Species by Group</h3><div class="data-grid cols-3">
          ${groups.map(([g, c]) => dataCard(g, String(c), 'species')).join('')}
        </div>`;
      }

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

  if (rt.ok) {
    const threatened = summarizeSpeciesCounts(rt.data);
    if (threatened.total > 0) {
      html += `<h3>Threatened Species (10 km)</h3>
        <div class="species-grid">
          ${threatened.species.slice(0, 8).map(sp => `<div class="species-card">
            ${sp.photoUrl ? `<img class="species-photo" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="species-photo"></div>'}
            <div class="species-info">
              <div class="species-name">${esc(sp.name)}</div>
              <div class="species-scientific">${esc(sp.scientificName)}</div>
              <div class="species-meta">${sp.observationCount} observations</div>
            </div>
            <span class="species-status" style="background:#CC6633;">Threatened</span>
          </div>`).join('')}
        </div>`;
    }
  }

  if (KEY_SPECIES && KEY_SPECIES.length) {
    html += `<h3>Notable Regional Species</h3>
      <div class="data-grid cols-3">
        ${KEY_SPECIES.map(sp => dataCard(sp.name, sp.scientific, `${sp.group} \u2014 ${sp.notes}`)).join('')}
      </div>`;
  }

  el.innerHTML = html;
}

function renderFireRisk(results, lat, lng) {
  const el = document.getElementById('data-fire');
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

  const history = ODEMIRA_FIRE_HISTORY;
  el.innerHTML = `
    <div class="risk-grid">
      <div class="risk-card" style="background:${fire.color}20;border:2px solid ${fire.color};">
        <div class="risk-level" style="color:${fire.color};">${esc(fire.level)}</div>
        <div class="risk-label">Estimated Fire Risk</div>
        <div class="data-detail" style="margin-top:8px;">Based on temperature, precipitation, location, and season</div>
      </div>
    </div>
    <h3 style="margin-top:24px;">Regional Fire History</h3>
    <p style="font-size:14px;line-height:1.65;color:#333;margin-bottom:16px;">${esc(history.context)}</p>
    <div class="data-grid">
      ${history.majorEvents.map(e => dataCard(String(e.year), e.description)).join('')}
    </div>`;
}

function renderProtected() {
  const el = document.getElementById('data-protected');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = 'true';

  let html = '';
  if (ODEMIRA_PROTECTED_AREAS && ODEMIRA_PROTECTED_AREAS.length) {
    html += `<h3>Nearby Protected Areas</h3>
      <div class="data-grid">
        ${ODEMIRA_PROTECTED_AREAS.map(pa => `<div class="data-item">
          <div class="data-label">${esc(pa.type)}</div>
          <div class="data-value">${esc(pa.nameEn || pa.name)}</div>
          <div class="data-detail">${esc(pa.description)}</div>
        </div>`).join('')}
      </div>`;
  }

  html += `<h3 style="margin-top:24px;">Portuguese Zoning</h3>
    <div class="data-grid">
      ${Object.entries(PT_ZONING).map(([code, z]) => `<div class="data-item">
        <div class="data-label">${esc(code)} \u2014 ${esc(z.nameEn)}</div>
        <div class="data-value">${esc(z.name)}</div>
        <div class="data-detail">${esc(z.description)}</div>
      </div>`).join('')}
    </div>`;

  el.innerHTML = html;
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
