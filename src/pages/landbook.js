/**
 * Landbook Report Page
 * Data-first approach: renders the full report layout immediately,
 * fetches all environmental data in parallel, and updates each section
 * as results arrive. User-reported form at the bottom.
 */

import '../styles/main.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

// Fix Leaflet default marker icons in bundled builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

initI18n();

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

function errorBlock(message, retryFn) {
  const retryId = 'retry-' + Math.random().toString(36).slice(2, 7);
  if (retryFn) window[retryId] = retryFn;
  return `
    <div class="data-item" style="grid-column:1/-1;">
      <p style="color:var(--muted);font-size:14px;">
        ${esc(message)}
        ${retryFn ? `<button class="btn-outline" style="margin-left:12px;font-size:12px;padding:4px 12px;" onclick="window['${retryId}']()">Retry</button>` : ''}
      </p>
    </div>`;
}

function dataCard(label, value, detail) {
  return `
    <div class="data-item">
      <div class="data-label">${esc(label)}</div>
      <div class="data-value">${esc(String(value != null ? value : '\u2014'))}</div>
      ${detail ? `<div class="data-detail">${esc(detail)}</div>` : ''}
    </div>`;
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso || '\u2014'; }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const container = document.getElementById('landbook-content');
const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const landbook = id ? getLandbook(id) : null;

if (!landbook) {
  container.innerHTML = `
    <div class="empty-state" style="padding-top:120px;">
      <h3>Landbook not found</h3>
      <p>This landbook does not exist or may have been removed.</p>
      <a href="create.html" class="btn-primary">Create a New Landbook</a>
    </div>`;
} else {
  document.title = `${landbook.address || 'Landbook'} \u2014 Libraries`;
  renderReport(landbook);
}

// ---------------------------------------------------------------------------
// Main layout render
// ---------------------------------------------------------------------------

function renderReport(lb) {
  const boundary = lb.boundary || [];
  const center = lb.center;
  const area = lb.area;
  const perimeter = lb.perimeter;
  const ha = area ? sqmToHectares(area) : null;

  container.innerHTML = `
    <!-- 1. Header -->
    <div class="landbook-header">
      <div class="section-label">Your Landbook</div>
      <h1>${esc(lb.address || 'Untitled Parcel')}</h1>
      <div class="landbook-meta">
        ${lb.created ? `<span><strong>Created</strong>: ${formatDate(lb.created)}</span>` : ''}
        ${area ? `<span><strong>Area</strong>: ${formatArea(area)}${ha ? ` (${ha.toFixed(2)} ha)` : ''}</span>` : ''}
        ${perimeter ? `<span><strong>Perimeter</strong>: ${formatDistance(perimeter)}</span>` : ''}
        ${center ? `<span><strong>Center</strong>: ${center[0].toFixed(5)}, ${center[1].toFixed(5)}</span>` : ''}
      </div>
    </div>

    <!-- 2. Map -->
    <div class="landbook-section">
      <h2>Map</h2>
      ${boundary.length ? '<div class="landbook-map"><div id="landbook-map" style="width:100%;height:100%;"></div></div>' : '<p style="color:var(--muted);">No boundary data available.</p>'}
    </div>

    <!-- 3. Elevation & Terrain -->
    <div class="landbook-section">
      <h2>Elevation &amp; Terrain</h2>
      ${skeleton('section-elevation')}
    </div>

    <!-- 4. Weather & Climate -->
    <div class="landbook-section">
      <h2>Weather &amp; Climate</h2>
      ${skeleton('section-weather')}
    </div>

    <!-- 5. Soil -->
    <div class="landbook-section">
      <h2>Soil</h2>
      ${skeleton('section-soil')}
    </div>

    <!-- 6. Biodiversity -->
    <div class="landbook-section">
      <h2>Biodiversity</h2>
      ${skeleton('section-biodiversity')}
    </div>

    <!-- 7. Water -->
    <div class="landbook-section">
      <h2>Water Features</h2>
      ${skeleton('section-water')}
    </div>

    <!-- 8. Fire Risk -->
    <div class="landbook-section">
      <h2>Fire Risk</h2>
      ${skeleton('section-fire')}
    </div>

    <!-- 9. Protected Areas & Zoning -->
    <div class="landbook-section">
      <h2>Protected Areas &amp; Zoning</h2>
      ${skeleton('section-protected')}
    </div>

    <!-- 10. User-Reported Data -->
    <div class="landbook-section user-form" id="section-user-form">
      <h2>Your Knowledge</h2>
      <p class="form-desc">Add what you know about this land. Your observations complement the data above.</p>
      <div id="user-form-container">${renderUserForm(lb)}</div>
    </div>
  `;

  // Initialize map
  if (boundary.length) {
    initMap(boundary, center);
  }

  // Fetch all API data in parallel
  if (center) {
    fetchAllData(lb, center[0], center[1], boundary);
  }
}

// ---------------------------------------------------------------------------
// Map with WMS overlays
// ---------------------------------------------------------------------------

function initMap(boundary, center) {
  const map = L.map('landbook-map', { zoomControl: true, scrollWheelZoom: true });

  // Base layers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
  });
  const sentinel = L.tileLayer(SENTINEL2_TILES, {
    attribution: '&copy; EOX / Sentinel-2 cloudless', maxZoom: 18,
  });

  sentinel.addTo(map);

  // WMS overlay layers
  const corine = L.tileLayer.wms(CORINE_WMS, { ...getCorineWmsParams(), opacity: 0.5 });
  const fireDanger = L.tileLayer.wms(EFFIS_WMS, { ...getFireDangerWmsParams(), opacity: 0.5 });
  const natura = L.tileLayer.wms(NATURA2000_WMS, { ...getNatura2000WmsParams(), opacity: 0.5 });

  L.control.layers(
    { 'Satellite (Sentinel-2)': sentinel, 'Street Map': osm },
    { 'CORINE Land Cover': corine, 'EFFIS Fire Danger': fireDanger, 'Natura 2000': natura },
    { position: 'topright' }
  ).addTo(map);

  // Draw boundary polygon
  const polygon = L.polygon(
    boundary.map(([lat, lng]) => [lat, lng]),
    { color: '#EB5F54', weight: 3, fillColor: '#EB5F54', fillOpacity: 0.15 }
  ).addTo(map);

  map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
}

// ---------------------------------------------------------------------------
// Parallel data fetching
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
  const promises = tasks.map(t =>
    t.fn()
      .then(data => { results[t.key] = { ok: true, data }; })
      .catch(err => { results[t.key] = { ok: false, error: err }; })
      .finally(() => renderSection(t.key, results, lat, lng, boundary))
  );

  Promise.allSettled(promises);
}

// ---------------------------------------------------------------------------
// Section renderers — called as data arrives
// ---------------------------------------------------------------------------

function renderSection(key, results, lat, lng, boundary) {
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
  // Protected areas use static data, render immediately
  renderProtected();
}

// --- 3. Elevation ---

function renderElevation(results) {
  const el = document.getElementById('section-elevation');
  if (!el) return;
  const r = results.elevation;
  if (!r) return;

  if (r.ok && r.data != null) {
    el.innerHTML = `
      <div class="data-grid">
        ${dataCard('Elevation', `${Math.round(r.data)} m`, 'Meters above sea level (SRTM)')}
      </div>`;
  } else {
    el.innerHTML = errorBlock('Elevation data unavailable.');
  }
}

// --- 4. Weather ---

function renderWeather(results) {
  const el = document.getElementById('section-weather');
  if (!el) return;
  const r = results.forecast;
  if (!r) return;

  if (!r.ok) {
    el.innerHTML = errorBlock('Weather forecast unavailable. The Open-Meteo service may be temporarily down.');
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

  // Append climate data if already available
  const climateHtml = buildClimateHtml(results);
  el.innerHTML = html + climateHtml;
}

// --- Climate (part of weather section) ---

function renderClimate(results) {
  const el = document.getElementById('section-weather');
  if (!el) return;
  // Re-render the full weather section if forecast is already done
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
      ${dataCard('Est. Last Frost', frost.lastFrost || 'None (frost-free)', 'Based on 30-year average min temperatures')}
      ${dataCard('Est. First Frost', frost.firstFrost || 'None (frost-free)', 'Based on 30-year average min temperatures')}
    </div>` : '';

  return `
    <h3>Climate Averages (30 years)</h3>
    <div class="climate-chart">
      <div style="display:flex;gap:12px;margin-bottom:8px;font-size:12px;color:var(--muted);">
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--blue,#4A90D9);border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Precipitation (mm/month)</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--coral,#EB5F54);border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Avg High Temp</span>
      </div>
      <div class="chart-bars">
        ${months.map(m => {
          const precipH = Math.round(((m.totalPrecip || 0) / maxPrecip) * 100);
          const tempH = Math.round(((m.avgHigh || 0) / maxTemp) * 100);
          return `
            <div class="chart-bar" title="${m.month}: ${Math.round(m.totalPrecip || 0)}mm, avg high ${Math.round(m.avgHigh || 0)}\u00B0C">
              <div class="bar" style="height:${precipH}%;"></div>
              <div class="bar temp" style="height:${tempH}%;"></div>
            </div>`;
        }).join('')}
      </div>
      <div class="chart-labels">
        ${months.map(m => `<span>${m.month}</span>`).join('')}
      </div>
    </div>
    ${frostHtml}`;
}

// --- 5. Soil ---

let _soilRendered = false;

function renderSoil(results) {
  const el = document.getElementById('section-soil');
  if (!el) return;
  const rp = results.soilProps;
  const rc = results.soilClass;
  // Wait until both have resolved
  if (!rp || !rc) return;
  if (_soilRendered) return;
  _soilRendered = true;

  let html = '';

  if (rp.ok) {
    const props = parseSoilProperties(rp.data);
    if (props) {
      const desc = getSoilDescription(props.texture);
      html += `
        <div class="data-grid cols-3">
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
      html += errorBlock('Soil property data not available for this location.');
    }
  } else {
    html += errorBlock('Could not fetch soil properties. SoilGrids may be temporarily unavailable.');
  }

  if (rc.ok) {
    const cls = parseSoilClassification(rc.data);
    if (cls) {
      html += `
        <h3 style="margin-top:24px;">WRB Classification</h3>
        <div class="data-grid">
          ${dataCard('Primary Class', cls.primary, cls.probability ? `${Math.round(cls.probability * 100)}% probability` : '')}
        </div>`;
    }
  }

  el.innerHTML = html;
}

// --- 6. Biodiversity ---

let _bioRendered = false;

function renderBiodiversity(results) {
  const el = document.getElementById('section-biodiversity');
  if (!el) return;
  const rs = results.species;
  const rt = results.threatened;
  if (!rs || !rt) return;
  if (_bioRendered) return;
  _bioRendered = true;

  let html = '';

  // Species counts
  if (rs.ok) {
    const summary = summarizeSpeciesCounts(rs.data);
    if (summary.total > 0) {
      html += `
        <div class="auto-data-banner">
          <span class="icon">&#127807;</span>
          <span><strong>${summary.total.toLocaleString()} species</strong> observed within 5 km (iNaturalist research-grade)</span>
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
          ${top.map(sp => `
            <div class="species-card">
              ${sp.photoUrl ? `<img class="species-photo" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="species-photo"></div>'}
              <div class="species-info">
                <div class="species-name">${esc(sp.name)}</div>
                <div class="species-scientific">${esc(sp.scientificName)}</div>
                <div class="species-meta">${sp.observationCount} observations</div>
              </div>
              ${sp.threatened ? '<span class="species-status" style="background:#CC6633;">Threatened</span>' : ''}
            </div>`).join('')}
        </div>`;
      }
    } else {
      html += '<p style="color:var(--muted);font-size:14px;">No research-grade species observations found nearby.</p>';
    }
  } else {
    html += errorBlock('Could not fetch biodiversity data from iNaturalist.');
  }

  // Threatened species
  if (rt.ok) {
    const threatened = summarizeSpeciesCounts(rt.data);
    if (threatened.total > 0) {
      html += `<h3>Threatened Species Nearby (10 km)</h3>
        <div class="species-grid">
          ${threatened.species.slice(0, 8).map(sp => `
            <div class="species-card">
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

  // Key species from regional data
  if (KEY_SPECIES && KEY_SPECIES.length) {
    html += `
      <h3>Notable Regional Species</h3>
      <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">Key species known in the broader region (Odemira / Vicentine Coast).</p>
      <div class="data-grid cols-3">
        ${KEY_SPECIES.map(sp => dataCard(sp.name, sp.scientific, `${sp.group} \u2014 ${sp.notes}`)).join('')}
      </div>`;
  }

  el.innerHTML = html;
}

// --- 7. Water ---

function renderWater(results) {
  const el = document.getElementById('section-water');
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
    el.innerHTML = '<p style="color:var(--muted);font-size:14px;">No water features found in the immediate area. Consider expanding the search radius or consulting local sources.</p>';
    return;
  }

  el.innerHTML = `
    <div class="data-grid cols-3">
      ${dataCard('Rivers', String(rivers.length), rivers.slice(0, 3).map(r => r.tags.name || 'Unnamed').join(', ') || '')}
      ${dataCard('Streams', String(streams.length))}
      ${dataCard('Water Bodies', String(waterBodies.length))}
      ${dataCard('Wells', String(wells.length))}
      ${dataCard('Springs', String(springs.length))}
    </div>
    ${rivers.length ? `<p style="margin-top:12px;font-size:14px;color:#333;">Nearest rivers: ${rivers.slice(0, 5).map(r => esc(r.tags.name || 'Unnamed')).join(', ')}.</p>` : ''}`;
}

// --- 8. Fire Risk ---

function renderFireRisk(results, lat, lng) {
  const el = document.getElementById('section-fire');
  if (!el) return;
  const r = results.forecast;

  let fire = { level: 'Unknown', color: '#999', score: 0 };

  if (r && r.ok && r.data && r.data.daily) {
    const daily = r.data.daily;
    const maxTemp = daily.temperature_2m_max ? Math.max(...daily.temperature_2m_max.filter(v => v != null)) : null;
    const totalPrecip = daily.precipitation_sum ? daily.precipitation_sum.reduce((s, v) => s + (v || 0), 0) : null;
    const month = new Date().getMonth();
    if (maxTemp != null && totalPrecip != null) {
      fire = estimateFireRisk(lat, lng, maxTemp, totalPrecip, month);
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
    </div>
    <p style="margin-top:16px;font-size:13px;color:var(--muted);">View the EFFIS fire danger layer on the map above for real-time satellite-based fire weather data.</p>`;
}

// --- 9. Protected Areas & Zoning ---

function renderProtected() {
  const el = document.getElementById('section-protected');
  if (!el || el.dataset.rendered) return;
  el.dataset.rendered = 'true';

  let html = '';

  if (ODEMIRA_PROTECTED_AREAS && ODEMIRA_PROTECTED_AREAS.length) {
    html += `<h3>Nearby Protected Areas</h3>
      <div class="data-grid">
        ${ODEMIRA_PROTECTED_AREAS.map(pa => `
          <div class="data-item">
            <div class="data-label">${esc(pa.type)}</div>
            <div class="data-value">${esc(pa.nameEn || pa.name)}</div>
            <div class="data-detail">${esc(pa.description)}</div>
          </div>`).join('')}
      </div>`;
  }

  html += `<h3 style="margin-top:24px;">Portuguese Zoning Designations</h3>
    <div class="data-grid">
      ${Object.entries(PT_ZONING).map(([code, z]) => `
        <div class="data-item">
          <div class="data-label">${esc(code)} \u2014 ${esc(z.nameEn)}</div>
          <div class="data-value">${esc(z.name)}</div>
          <div class="data-detail">${esc(z.description)}</div>
        </div>`).join('')}
    </div>
    <p style="margin-top:16px;font-size:13px;color:var(--muted);">Toggle the Natura 2000 overlay on the map above to see protected area boundaries.</p>`;

  el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// 10. User-Reported Form
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
          ${['dryland agriculture','plantation','forest','residential','tourists','undeveloped','other']
            .map(v => `<option value="${v}" ${ur.primaryUse === v ? 'selected' : ''}>${esc(v.charAt(0).toUpperCase() + v.slice(1))}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label for="secondary-use">Secondary Use</label>
        <input type="text" id="secondary-use" name="secondaryUse" placeholder="e.g., beekeeping, foraging, camping" value="${esc(ur.secondaryUse || '')}">
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
        <label for="goals-1yr">Goals &mdash; 1 Year</label>
        <textarea id="goals-1yr" name="goalsOneYear" rows="3" placeholder="What do you want to accomplish in the next year?">${esc(goals.oneYear || '')}</textarea>
      </div>

      <div class="field">
        <label for="goals-3yr">Goals &mdash; 3 Years</label>
        <textarea id="goals-3yr" name="goalsThreeYear" rows="3" placeholder="Where do you see this land in three years?">${esc(goals.threeYear || '')}</textarea>
      </div>

      <div class="field">
        <label for="goals-5yr">Goals &mdash; 5 Years</label>
        <textarea id="goals-5yr" name="goalsFiveYear" rows="3" placeholder="What is your long-term vision?">${esc(goals.fiveYear || '')}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="infra-irrigation">Irrigation</label>
          <input type="text" id="infra-irrigation" name="irrigation" placeholder="e.g., drip, well, none" value="${esc(infra.irrigation || '')}">
        </div>
        <div class="field">
          <label for="infra-energy">Energy</label>
          <input type="text" id="infra-energy" name="energy" placeholder="e.g., solar, grid, generator" value="${esc(infra.energy || '')}">
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="infra-water">Water Sources</label>
          <input type="text" id="infra-water" name="waterSources" placeholder="e.g., borehole, river, rainwater" value="${esc(infra.waterSources || '')}">
        </div>
        <div class="field">
          <label for="infra-buildings">Buildings</label>
          <input type="text" id="infra-buildings" name="buildings" placeholder="e.g., ruin, barn, none" value="${esc(infra.buildings || '')}">
        </div>
      </div>

      <div class="field">
        <label for="sharing">What have you figured out worth sharing?</label>
        <textarea id="sharing" name="sharing" rows="3" placeholder="Techniques, discoveries, things that work well on this land...">${esc(ur.sharing || '')}</textarea>
      </div>

      <div class="field">
        <label for="history">History of your land</label>
        <textarea id="history" name="history" rows="3" placeholder="Previous uses, old maps, stories from neighbors...">${esc(ur.history || '')}</textarea>
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

function saveUserData() {
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
    updateLandbook(landbook.id, { userReported });
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
