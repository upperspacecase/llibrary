/**
 * wiki.js — Hash-routed Odemira bioregional wiki page.
 *
 * Routes:  #hub (or empty) = hub overview
 *          #land | #water | #weather | #biodiversity | #agriculture
 *          #community | #history | #governance
 */

import '../styles/main.css';
import { createMap, mapboxgl, addMarker, addWmsLayer, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n } from '../lib/i18n.js';
import {
  ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS,
  getAllSections, getSectionById,
} from '../lib/wiki-data.js';

// API — Nominatim
import { geocode, reverseGeocode } from '../api/nominatim.js';

// API — Open-Meteo
import { getForecast, getClimateAverages, getWeatherDescription, getElevation } from '../api/open-meteo.js';

// API — Overpass (OpenStreetMap)
import {
  getWaterFeatures, getRivers, getProtectedAreas, getPlaces, getLandUse,
  getHistoricFeatures, extractNodes, extractWays,
} from '../api/overpass.js';

// API — GBIF
import { getSpeciesOccurrences, summarizeOccurrences } from '../api/gbif.js';

// API — iNaturalist
import { getSpeciesCounts, summarizeSpeciesCounts } from '../api/inaturalist.js';

// API — Copernicus
import { CORINE_WMS, SENTINEL2_TILES, getCorineWmsParams, CORINE_CLASSES } from '../api/copernicus.js';

// API — EFFIS
import { EFFIS_WMS, getFireDangerWmsParams } from '../api/effis.js';

// API — Natura 2000
import {
  NATURA2000_WMS, getNatura2000WmsParams,
} from '../api/natura2000.js';

// ---- Initialise i18n ----
initI18n();

// ---- DOM refs ----
const sidebar = document.getElementById('wiki-sidebar');
const content = document.getElementById('wiki-content');

// ---- State ----
let currentMap = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, '').trim();
  return hash || 'hub';
}

function loadingSkeleton(lines = 4) {
  return `<div class="wiki-loading-skeleton">${Array.from({ length: lines }, () => '<div class="skeleton-line"></div>').join('')
    }</div>`;
}

function destroyMap() {
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }
}

function createBaseMap(containerId, zoom = 10) {
  return createMap(containerId, {
    center: [ODEMIRA.center[1], ODEMIRA.center[0]], // [lng, lat]
    zoom,
  });
}

function markerColor(type) {
  const colors = {
    town: '#e74c3c',
    village: '#e67e22',
    community: '#8e44ad',
    landmark: '#2980b9',
    beach: '#1abc9c',
  };
  return colors[type] || '#7f8c8d';
}

function addLandmarkMarkers(map, landmarks) {
  landmarks.forEach(lm => {
    const el = document.createElement('div');
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = markerColor(lm.type);
    el.style.border = '2px solid #fff';
    el.style.cursor = 'pointer';

    const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(
      `<strong>${lm.name}</strong><br><em>${lm.type}</em>` +
      (lm.pop ? `<br>Pop. ~${lm.pop}` : '') +
      (lm.desc ? `<br><small>${lm.desc}</small>` : '')
    );

    new mapboxgl.Marker({ element: el })
      .setLngLat([lm.coords[1], lm.coords[0]])
      .setPopup(popup)
      .addTo(map);
  });
}

function addOverpassNodes(map, nodes, color = '#3388ff', label = '') {
  if (!nodes.length) return;
  const sourceId = 'overpass-nodes-' + Math.random().toString(36).slice(2, 6);
  const geojson = {
    type: 'FeatureCollection',
    features: nodes.map(n => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [n.lon, n.lat] },
      properties: { name: (n.tags && (n.tags.name || n.tags.historic || n.tags.natural)) || label },
    })),
  };

  map.addSource(sourceId, { type: 'geojson', data: geojson });
  map.addLayer({
    id: sourceId + '-layer',
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 5,
      'circle-color': color,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
      'circle-opacity': 0.8,
    },
  });

  // Add popup on click
  map.on('click', sourceId + '-layer', (e) => {
    const name = e.features[0].properties.name;
    if (name) {
      new mapboxgl.Popup({ offset: 5 })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${name}</strong>`)
        .addTo(map);
    }
  });
  map.on('mouseenter', sourceId + '-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', sourceId + '-layer', () => { map.getCanvas().style.cursor = ''; });
}

function addOverpassWays(map, ways, color = '#3388ff') {
  if (!ways.length) return;
  const sourceId = 'overpass-ways-' + Math.random().toString(36).slice(2, 6);
  const geojson = {
    type: 'FeatureCollection',
    features: ways.filter(w => w.coords && w.coords.length > 1).map(w => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: w.coords.map(([lat, lng]) => [lng, lat]),
      },
      properties: { name: (w.tags && w.tags.name) || '' },
    })),
  };

  map.addSource(sourceId, { type: 'geojson', data: geojson });
  map.addLayer({
    id: sourceId + '-layer',
    type: 'line',
    source: sourceId,
    paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.7 },
  });

  map.on('click', sourceId + '-layer', (e) => {
    const name = e.features[0].properties.name;
    if (name) {
      new mapboxgl.Popup({ offset: 5 })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${name}</strong>`)
        .addTo(map);
    }
  });
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function renderSidebar(activeId) {
  const sections = getAllSections();
  sidebar.innerHTML = `
    <nav class="wiki-sidebar-nav">
      <a href="#hub" class="wiki-nav-link ${activeId === 'hub' ? 'active' : ''}">
        <span class="wiki-nav-title">Wiki Hub</span>
      </a>
      <hr>
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-nav-link ${activeId === s.id ? 'active' : ''}">
          <span class="wiki-nav-title">${s.title}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// ---------------------------------------------------------------------------
// Hub view
// ---------------------------------------------------------------------------

function renderHub() {
  destroyMap();
  const sections = getAllSections();

  content.innerHTML = `
    <section class="wiki-hero">
      <h1>Odemira Bioregional Wiki</h1>
      <p class="wiki-hero-subtitle">
        Exploring <strong>${ODEMIRA.name}</strong> &mdash;
        ${ODEMIRA.area} km&sup2; of ${ODEMIRA.region}, ${ODEMIRA.country}.
        Population ~${ODEMIRA.population.toLocaleString()} across ${ODEMIRA.parishes} parishes,
        stretching from ${ODEMIRA.coastline} of Atlantic coastline to the interior Alentejo hills
        (${ODEMIRA.elevation.min}m &ndash; ${ODEMIRA.elevation.max}m elevation).
      </p>
    </section>

    <div class="wiki-hub-grid">
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-hub-card" style="border-top: 4px solid ${s.color}">
          <h3>${s.title}</h3>
          <p>${s.subtitle}</p>
        </a>
      `).join('')}
    </div>

    <section class="wiki-hub-extras">
      <h2>Upcoming Events</h2>
      <ul class="wiki-events-list">
        ${EVENTS_CALENDAR.map(e =>
    `<li><strong>${e.month}</strong> &mdash; ${e.name} <em>(${e.location})</em></li>`
  ).join('')}
      </ul>
      <h2>Key Landmarks</h2>
      <ul class="wiki-landmarks-list">
        ${LANDMARKS.map(lm =>
    `<li><strong>${lm.name}</strong> (${lm.type}) &mdash; ${lm.desc}</li>`
  ).join('')}
      </ul>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Section view
// ---------------------------------------------------------------------------

function renderSection(sectionId) {
  destroyMap();
  const section = getSectionById(sectionId);
  if (!section) { renderHub(); return; }

  content.innerHTML = `
    <section class="wiki-hero">
      <h1>${section.title}</h1>
      <p class="wiki-hero-subtitle">${section.subtitle}</p>
      <p class="wiki-intro">${section.intro}</p>
    </section>

    <div class="wiki-map" id="wiki-section-map" style="height:400px;border-radius:8px;margin:1.5rem 0;"></div>

    <section class="wiki-articles">
      ${section.articles.map(a => `
        <article class="wiki-article">
          <h2>${a.title}</h2>
          <p>${a.content}</p>
        </article>
      `).join('')}
    </section>

    <!-- Community Contributions -->
    <section class="wiki-contributions" id="wiki-contributions">
      <h2>Community Contributions</h2>
      <p class="wiki-contributions-desc">Knowledge shared by the community. Have something to add? Use the form below.</p>
      <div class="wiki-contributions-list" id="contributions-list">
        <div class="loading-block"><span class="loading-spinner"></span> Loading contributions...</div>
      </div>
    </section>

    <!-- Contribute Form -->
    <section class="wiki-contribute-form" id="wiki-contribute-form">
      <h2>Share Your Knowledge</h2>
      <p class="wiki-contribute-desc">Help build the wiki. Share a story, tip, event, place, or resource about this topic.</p>
      <form id="contribution-form" data-section="${sectionId}">
        <div class="field-row">
          <div class="field">
            <label for="contrib-type">Type</label>
            <select id="contrib-type" name="type" required>
              <option value="">Select type...</option>
              <option value="story">Story / Experience</option>
              <option value="tip">Practical Tip</option>
              <option value="event">Event / Gathering</option>
              <option value="place">Place / Location</option>
              <option value="resource">Resource / Link</option>
            </select>
          </div>
          <div class="field">
            <label for="contrib-author">Your Name (optional)</label>
            <input type="text" id="contrib-author" name="author" placeholder="Anonymous">
          </div>
        </div>
        <div class="field">
          <label for="contrib-title">Title</label>
          <input type="text" id="contrib-title" name="title" placeholder="A short title for your contribution" required>
        </div>
        <div class="field">
          <label for="contrib-content">Content</label>
          <textarea id="contrib-content" name="content" rows="5" placeholder="Share what you know..." required></textarea>
        </div>
        <button type="submit" class="btn-primary" id="submit-contribution">Submit Contribution</button>
        <div id="contrib-feedback" style="margin-top:12px;font-size:14px;"></div>
      </form>
    </section>

    <section class="wiki-data-section" id="wiki-data-section">
      <h2>Live Data</h2>
      ${loadingSkeleton(6)}
    </section>
  `;

  // Initialise map, live data, and contributions after DOM insertion
  setTimeout(() => {
    currentMap = createBaseMap('wiki-section-map');
    currentMap.on('load', () => {
      initSectionMap(sectionId, currentMap);
    });
    loadSectionData(sectionId);
    loadContributions(sectionId);
    setupContributionForm(sectionId);
  }, 0);
}

// ---------------------------------------------------------------------------
// Section map layers
// ---------------------------------------------------------------------------

async function initSectionMap(sectionId, map) {
  try {
    switch (sectionId) {
      case 'bioregion': await initLandMap(map); break;
      case 'ecology': initBiodiversityMap(map); break;
      case 'landuse': initAgricultureMap(map); break;
      case 'cultural': await initHistoryMap(map); break;
      case 'intelligence': initGovernanceMap(map); break;
      case 'planning': initGovernanceMap(map); break;
      case 'threats': await initWaterMap(map); break;
      case 'community': await initCommunityMap(map); break;
    }
  } catch (err) {
    console.error(`Map init error [${sectionId}]:`, err);
  }
}

async function initLandMap(map) {
  // Add satellite raster tiles as overlay
  map.addSource('sentinel-overlay', {
    type: 'raster',
    tiles: [SENTINEL2_TILES],
    tileSize: 256,
  });
  map.addLayer({
    id: 'sentinel-overlay-layer',
    type: 'raster',
    source: 'sentinel-overlay',
    paint: { 'raster-opacity': 0.45 },
  });

  try {
    const elev = await getElevation(ODEMIRA.center[0], ODEMIRA.center[1]);
    if (elev !== null) {
      addMarker(map, [ODEMIRA.center[1], ODEMIRA.center[0]], {
        popupHtml: `<strong>${ODEMIRA.name}</strong><br>Elevation: ${elev} m`,
      });
    }
  } catch (e) { console.warn('Elevation fetch failed:', e); }

  addLandmarkMarkers(map, LANDMARKS);
}

async function initWaterMap(map) {
  try {
    const data = await getWaterFeatures(ODEMIRA.bbox);
    const nodes = extractNodes(data);
    const ways = extractWays(data);
    addOverpassNodes(map, nodes, '#2B7BB9', 'Water feature');
    addOverpassWays(map, ways, '#2B7BB9');
  } catch (e) { console.warn('Water features fetch failed:', e); }
}

function initWeatherMap(map) {
  addWmsLayer(map, EFFIS_WMS, getFireDangerWmsParams(), {
    sourceId: 'wms-effis-wiki',
    opacity: 0.4,
    visible: true,
  });

  addMarker(map, [ODEMIRA.center[1], ODEMIRA.center[0]], {
    popupHtml: `<strong>${ODEMIRA.name}</strong><br>Weather reference point`,
  });
}

function initBiodiversityMap(map) {
  addWmsLayer(map, NATURA2000_WMS, getNatura2000WmsParams(), {
    sourceId: 'wms-natura-wiki',
    opacity: 0.35,
    visible: true,
  });

  ODEMIRA_PROTECTED_AREAS.forEach(pa => {
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#2E8B57';
    el.style.border = '2px solid #fff';
    el.style.opacity = '0.6';
    el.style.cursor = 'pointer';

    const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(
      `<strong>${pa.nameEn || pa.name}</strong><br>${pa.type}<br>${pa.description}`
    );

    new mapboxgl.Marker({ element: el })
      .setLngLat([pa.coordinates[1], pa.coordinates[0]])
      .setPopup(popup)
      .addTo(map);
  });
}

function initAgricultureMap(map) {
  addWmsLayer(map, CORINE_WMS, getCorineWmsParams(), {
    sourceId: 'wms-corine-wiki',
    opacity: 0.55,
    visible: true,
  });

  addLandmarkMarkers(map, LANDMARKS.filter(l => l.type === 'town' || l.type === 'community'));
}

async function initCommunityMap(map) {
  addLandmarkMarkers(map, LANDMARKS);
  try {
    const data = await getPlaces(ODEMIRA.bbox);
    const nodes = extractNodes(data);
    addOverpassNodes(map, nodes, '#8B4789', 'Settlement');
  } catch (e) { console.warn('Places fetch failed:', e); }
}

async function initHistoryMap(map) {
  try {
    const data = await getHistoricFeatures(ODEMIRA.bbox);
    const nodes = extractNodes(data);
    const ways = extractWays(data);
    addOverpassNodes(map, nodes, '#B8860B', 'Historic site');
    addOverpassWays(map, ways, '#B8860B');
  } catch (e) { console.warn('Historic features fetch failed:', e); }
}

function initGovernanceMap(map) {
  addWmsLayer(map, NATURA2000_WMS, getNatura2000WmsParams(), {
    sourceId: 'wms-natura-gov-wiki',
    opacity: 0.4,
    visible: true,
  });

  ODEMIRA_PROTECTED_AREAS.forEach(pa => {
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4A708B';
    el.style.border = '2px solid #fff';
    el.style.opacity = '0.6';
    el.style.cursor = 'pointer';

    const popup = new mapboxgl.Popup({ offset: 10 }).setHTML(
      `<strong>${pa.nameEn || pa.name}</strong><br>${pa.type}` +
      (pa.siteCode ? `<br>Code: ${pa.siteCode}` : '') +
      `<br>${pa.description}`
    );

    new mapboxgl.Marker({ element: el })
      .setLngLat([pa.coordinates[1], pa.coordinates[0]])
      .setPopup(popup)
      .addTo(map);
  });
}

// ---------------------------------------------------------------------------
// Section live data (unchanged from original — no Leaflet dependency)
// ---------------------------------------------------------------------------

async function loadSectionData(sectionId) {
  const container = document.getElementById('wiki-data-section');
  if (!container) return;

  try {
    switch (sectionId) {
      case 'bioregion': await loadLandData(container); await loadWeatherData(container); break;
      case 'ecology': await loadBiodiversityData(container); break;
      case 'landuse': loadAgricultureData(container); break;
      case 'cultural': await loadHistoryData(container); break;
      case 'intelligence': loadGovernanceData(container); break;
      case 'planning': loadGovernanceData(container); break;
      case 'threats': await loadWaterData(container); break;
      case 'community': await loadCommunityData(container); break;
      default:
        container.innerHTML = '<h2>Live Data</h2><p>No live data available for this section.</p>';
    }
  } catch (err) {
    console.error(`Data load error [${sectionId}]:`, err);
    container.innerHTML = `
      <h2>Live Data</h2>
      <p class="wiki-data-error">Unable to load live data. Please try again later.</p>
    `;
  }
}

// ----- Land -----

async function loadLandData(container) {
  const [lat, lng] = ODEMIRA.center;
  const [elev, geoResult] = await Promise.all([
    getElevation(lat, lng).catch(() => null),
    reverseGeocode(lat, lng).catch(() => null),
  ]);

  const address = geoResult ? geoResult.display_name : 'Odemira, Portugal';

  container.innerHTML = `
    <h2>Live Data &mdash; The Land</h2>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Elevation at Center</h3>
        <p class="wiki-data-value">${elev !== null ? `${elev} m` : 'N/A'}</p>
      </div>
      <div class="wiki-data-card">
        <h3>Municipality</h3>
        <p>${ODEMIRA.name}, ${ODEMIRA.region}</p>
        <p>Area: ${ODEMIRA.area} km&sup2;</p>
        <p>Elevation range: ${ODEMIRA.elevation.min} m &ndash; ${ODEMIRA.elevation.max} m</p>
        <p>Coastline: ${ODEMIRA.coastline}</p>
      </div>
      <div class="wiki-data-card">
        <h3>Location</h3>
        <p>${address}</p>
        <p>Center: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      </div>
    </div>
  `;
}

// ----- Water -----

async function loadWaterData(container) {
  const data = await getWaterFeatures(ODEMIRA.bbox).catch(() => null);
  const nodes = data ? extractNodes(data) : [];
  const ways = data ? extractWays(data) : [];

  const springs = nodes.filter(n => n.tags && n.tags.natural === 'spring');
  const wells = nodes.filter(n => n.tags && n.tags.man_made === 'water_well');
  const rivers = ways.filter(w => w.tags && w.tags.waterway === 'river');
  const streams = ways.filter(w => w.tags && w.tags.waterway === 'stream');

  container.innerHTML = `
    <h2>Live Data &mdash; Water Features</h2>
    <p>Data sourced from OpenStreetMap via Overpass API.</p>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Rivers</h3>
        <p class="wiki-data-value">${rivers.length}</p>
        ${rivers.slice(0, 8).map(r =>
    `<p>${(r.tags && r.tags.name) || 'Unnamed river'}</p>`
  ).join('')}
      </div>
      <div class="wiki-data-card">
        <h3>Streams</h3>
        <p class="wiki-data-value">${streams.length}</p>
      </div>
      <div class="wiki-data-card">
        <h3>Springs</h3>
        <p class="wiki-data-value">${springs.length}</p>
      </div>
      <div class="wiki-data-card">
        <h3>Wells</h3>
        <p class="wiki-data-value">${wells.length}</p>
      </div>
    </div>
  `;
}

// ----- Weather -----

async function loadWeatherData(container) {
  const [lat, lng] = ODEMIRA.center;
  const forecast = await getForecast(lat, lng, 7).catch(() => null);

  if (!forecast || !forecast.current) {
    container.innerHTML = '<h2>Live Data &mdash; Weather</h2><p>Weather data unavailable.</p>';
    return;
  }

  const cur = forecast.current;
  const desc = getWeatherDescription(cur.weathercode);
  const daily = forecast.daily || {};
  const days = (daily.time || []).slice(0, 7);

  container.innerHTML = `
    <h2>Live Data &mdash; Current Weather</h2>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Right Now</h3>
        <p class="wiki-data-value">${cur.temperature_2m}&deg;C</p>
        <p>${desc}</p>
        <p>Humidity: ${cur.relative_humidity_2m}%</p>
        <p>Wind: ${cur.wind_speed_10m} km/h</p>
      </div>
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>7-Day Forecast</h3>
        <table class="wiki-forecast-table">
          <thead>
            <tr><th>Date</th><th>High</th><th>Low</th><th>Rain</th><th>Conditions</th></tr>
          </thead>
          <tbody>
            ${days.map((d, i) => `
              <tr>
                <td>${d}</td>
                <td>${daily.temperature_2m_max ? daily.temperature_2m_max[i] : '-'}&deg;C</td>
                <td>${daily.temperature_2m_min ? daily.temperature_2m_min[i] : '-'}&deg;C</td>
                <td>${daily.precipitation_sum ? daily.precipitation_sum[i] : '-'} mm</td>
                <td>${daily.weathercode ? getWeatherDescription(daily.weathercode[i]) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="wiki-data-grid" style="margin-top:1rem;">
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Fire Risk Factors</h3>
        <p>Fire risk in this region is shaped by Mediterranean summers (hot, dry conditions), vegetation type, and proximity to forested areas. The EFFIS Fire Weather Index layer on the map shows current fire danger levels across Europe.</p>
      </div>
    </div>
  `;
}

// ----- Biodiversity -----

async function loadBiodiversityData(container) {
  const [lat, lng] = ODEMIRA.center;
  const [inatData, gbifData] = await Promise.all([
    getSpeciesCounts(lat, lng, 20).catch(() => null),
    getSpeciesOccurrences(lat, lng, 20).catch(() => null),
  ]);

  const inatSummary = inatData ? summarizeSpeciesCounts(inatData) : null;
  const gbifSummary = gbifData ? summarizeOccurrences(gbifData) : null;

  const groupsHtml = inatSummary && inatSummary.groups
    ? Object.entries(inatSummary.groups)
      .sort((a, b) => b[1] - a[1])
      .map(([g, c]) => `<li>${g}: ${c} species</li>`).join('')
    : '<li>No data</li>';

  const topSpecies = inatSummary && inatSummary.species
    ? inatSummary.species.slice(0, 10)
      .map(s =>
        `<li><strong>${s.name}</strong> <em>(${s.scientificName})</em> &mdash; ${s.observationCount} obs.</li>`
      ).join('')
    : '';

  container.innerHTML = `
    <h2>Live Data &mdash; Biodiversity</h2>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>iNaturalist Species (20 km)</h3>
        <p class="wiki-data-value">${inatSummary ? inatSummary.total : 'N/A'} species</p>
        <ul>${groupsHtml}</ul>
      </div>
      <div class="wiki-data-card">
        <h3>GBIF Occurrences (20 km)</h3>
        <p class="wiki-data-value">${gbifSummary ? gbifSummary.total : 'N/A'} records</p>
        ${gbifSummary ? `<p>${gbifSummary.species.length} distinct species</p>` : ''}
      </div>
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Most Observed Species</h3>
        <ol>${topSpecies || '<li>No data available</li>'}</ol>
      </div>
    </div>
    <div class="wiki-data-grid" style="margin-top:1rem;">
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Key Species of the Region</h3>
        <table class="wiki-species-table">
          <thead>
            <tr><th>Name</th><th>Scientific Name</th><th>Group</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${KEY_SPECIES.map(sp => `
              <tr>
                <td>${sp.name}</td>
                <td><em>${sp.scientific}</em></td>
                <td>${sp.group}</td>
                <td>${sp.status}</td>
                <td>${sp.notes}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Agriculture -----

function loadAgricultureData(container) {
  const relevantClasses = Object.entries(CORINE_CLASSES)
    .filter(([code]) => {
      const c = parseInt(code, 10);
      return (c >= 211 && c <= 244) || c === 311 || c === 312 || c === 313 || c === 324;
    })
    .map(([code, info]) => `
      <tr>
        <td><span class="wiki-color-swatch" style="background:${info.color};display:inline-block;width:14px;height:14px;border-radius:2px;"></span></td>
        <td>${code}</td>
        <td>${info.name}</td>
      </tr>
    `).join('');

  container.innerHTML = `
    <h2>Live Data &mdash; Agriculture &amp; Land Cover</h2>
    <p>Land cover from CORINE Land Cover 2018 (EEA / Copernicus). The map above shows the WMS overlay.</p>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Municipality Stats</h3>
        <p>Total area: ${ODEMIRA.area} km&sup2;</p>
        <p>Parishes: ${ODEMIRA.parishes}</p>
        <p>Key crops: Berries, cork, olives, avocados, tropical fruits</p>
        <p>Agriculture type: Greenhouse &amp; traditional dryland</p>
      </div>
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>CORINE Land Cover Classes (relevant)</h3>
        <table class="wiki-corine-table">
          <thead><tr><th></th><th>Code</th><th>Class</th></tr></thead>
          <tbody>${relevantClasses}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Community -----

async function loadCommunityData(container) {
  let placesData = null;
  try {
    placesData = await getPlaces(ODEMIRA.bbox);
  } catch (e) { /* ignore */ }

  const placeNodes = placesData ? extractNodes(placesData) : [];
  const towns = placeNodes.filter(n => n.tags && (n.tags.place === 'town' || n.tags.place === 'city'));
  const villages = placeNodes.filter(n => n.tags && n.tags.place === 'village');
  const hamlets = placeNodes.filter(n => n.tags && n.tags.place === 'hamlet');

  container.innerHTML = `
    <h2>Live Data &mdash; Community</h2>
    <p>Settlement data from OpenStreetMap.</p>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Population</h3>
        <p class="wiki-data-value">~${ODEMIRA.population.toLocaleString()}</p>
        <p>2021 census</p>
      </div>
      <div class="wiki-data-card">
        <h3>Settlements Found</h3>
        <p>Towns: ${towns.length}</p>
        <p>Villages: ${villages.length}</p>
        <p>Hamlets: ${hamlets.length}</p>
      </div>
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Notable Places</h3>
        <ul>
          ${LANDMARKS.map(lm =>
    `<li><strong>${lm.name}</strong> (${lm.type}) &mdash; ${lm.desc}</li>`
  ).join('')}
        </ul>
      </div>
    </div>
    <div class="wiki-data-grid" style="margin-top:1rem;">
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Events Calendar</h3>
        <table class="wiki-events-table">
          <thead><tr><th>Month</th><th>Event</th><th>Location</th><th>Type</th></tr></thead>
          <tbody>
            ${EVENTS_CALENDAR.map(e => `
              <tr>
                <td>${e.month}</td>
                <td>${e.name}</td>
                <td>${e.location}</td>
                <td>${e.type}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- History -----

async function loadHistoryData(container) {
  let historicData = null;
  try {
    historicData = await getHistoricFeatures(ODEMIRA.bbox);
  } catch (e) { /* ignore */ }

  const nodes = historicData ? extractNodes(historicData) : [];
  const categorized = {};
  nodes.forEach(n => {
    const type = (n.tags && n.tags.historic) || 'other';
    if (!categorized[type]) categorized[type] = [];
    categorized[type].push(n);
  });

  const categoryHtml = Object.entries(categorized)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .map(([type, items]) => `
      <tr>
        <td>${type}</td>
        <td>${items.length}</td>
        <td>${items.slice(0, 3).map(n => (n.tags && n.tags.name) || 'Unnamed').join(', ')}</td>
      </tr>
    `).join('');

  container.innerHTML = `
    <h2>Live Data &mdash; Historic Features</h2>
    <p>Historic features from OpenStreetMap including monuments, archaeological sites, and ruins.</p>
    <div class="wiki-data-grid">
      <div class="wiki-data-card">
        <h3>Total Historic Features</h3>
        <p class="wiki-data-value">${nodes.length}</p>
      </div>
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>By Category</h3>
        <table class="wiki-history-table">
          <thead><tr><th>Type</th><th>Count</th><th>Examples</th></tr></thead>
          <tbody>${categoryHtml || '<tr><td colspan="3">No data found</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ----- Governance -----

function loadGovernanceData(container) {
  const protectedHtml = ODEMIRA_PROTECTED_AREAS.map(pa => `
    <tr>
      <td><strong>${pa.nameEn || pa.name}</strong></td>
      <td>${pa.type}</td>
      <td>${pa.designation || ''}</td>
      <td>${pa.siteCode || ''}</td>
      <td>${pa.description}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h2>Live Data &mdash; Governance &amp; Protection</h2>
    <p>The map above shows Natura 2000 designations (SCI and SPA) from the European Environment Agency.</p>
    <div class="wiki-data-grid">
      <div class="wiki-data-card wiki-data-card-wide">
        <h3>Protected Areas in Odemira</h3>
        <table class="wiki-governance-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Designation</th><th>Code</th><th>Description</th></tr>
          </thead>
          <tbody>${protectedHtml}</tbody>
        </table>
      </div>
      <div class="wiki-data-card">
        <h3>Key Regulatory Layers</h3>
        <ul>
          <li><strong>PDM</strong> &mdash; Municipal Master Plan (Plano Director Municipal)</li>
          <li><strong>REN</strong> &mdash; National Ecological Reserve</li>
          <li><strong>RAN</strong> &mdash; National Agricultural Reserve</li>
          <li><strong>Natura 2000</strong> &mdash; EU conservation network (SCI + SPA)</li>
          <li><strong>Natural Park</strong> &mdash; SW Alentejo &amp; Vicentine Coast</li>
        </ul>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Community Contributions
// ---------------------------------------------------------------------------

const CONTRIBUTION_TYPE_LABELS = {
  story: { label: 'Story', color: '#8B4789' },
  tip: { label: 'Tip', color: '#2E8B57' },
  event: { label: 'Event', color: '#E8A317' },
  place: { label: 'Place', color: '#2B7BB9' },
  resource: { label: 'Resource', color: '#4A708B' },
};

async function loadContributions(sectionId) {
  const listEl = document.getElementById('contributions-list');
  if (!listEl) return;

  try {
    const res = await fetch(`/api/wiki/contributions?section=${sectionId}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const contributions = await res.json();

    if (contributions.length === 0) {
      listEl.innerHTML = `
        <div class="wiki-contributions-empty">
          <p>No community contributions yet for this section. Be the first to share!</p>
        </div>`;
      return;
    }

    listEl.innerHTML = contributions.map(c => {
      const typeInfo = CONTRIBUTION_TYPE_LABELS[c.type] || { label: c.type, color: '#999' };
      const date = new Date(c.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <div class="wiki-contribution-card">
          <div class="wiki-contribution-header">
            <span class="wiki-contribution-badge" style="background:${typeInfo.color};">${typeInfo.label}</span>
            <span class="wiki-contribution-meta">${c.author || 'Anonymous'} &middot; ${date}</span>
          </div>
          ${c.title ? `<h3 class="wiki-contribution-title">${c.title}</h3>` : ''}
          <p class="wiki-contribution-content">${c.content}</p>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Failed to load contributions:', err);
    listEl.innerHTML = `
      <div class="wiki-contributions-empty">
        <p>Unable to load contributions. They will appear once connected to the server.</p>
      </div>`;
  }
}

function setupContributionForm(sectionId) {
  const form = document.getElementById('contribution-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-contribution');
    const feedback = document.getElementById('contrib-feedback');
    const type = form.querySelector('[name="type"]').value;
    const author = form.querySelector('[name="author"]').value.trim();
    const title = form.querySelector('[name="title"]').value.trim();
    const content = form.querySelector('[name="content"]').value.trim();

    if (!type || !content) {
      if (feedback) feedback.innerHTML = '<span style="color:var(--coral);">Please select a type and write some content.</span>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting\u2026';

    try {
      const res = await fetch('/api/wiki/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sectionId,
          type,
          title,
          content,
          author: author || 'Anonymous',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit');
      }

      // Reset form
      form.reset();
      if (feedback) {
        feedback.innerHTML = '<span style="color:var(--green);font-weight:600;">Thank you! Your contribution has been added.</span>';
        setTimeout(() => { feedback.innerHTML = ''; }, 4000);
      }

      // Refresh contributions list
      await loadContributions(sectionId);

      // Scroll to contributions section
      const contribSection = document.getElementById('wiki-contributions');
      if (contribSection) contribSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Submit failed:', err);
      if (feedback) {
        feedback.innerHTML = `<span style="color:var(--coral);">Failed to submit: ${err.message}. Please try again.</span>`;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Contribution';
    }
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function route() {
  const id = currentRoute();
  renderSidebar(id);

  if (id === 'hub' || !getSectionById(id)) {
    renderHub();
  } else {
    renderSection(id);
  }
}

window.addEventListener('hashchange', route);

// Initial render
route();
