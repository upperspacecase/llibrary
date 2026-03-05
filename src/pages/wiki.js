/**
 * wiki.js — Hash-routed Odemira bioregional wiki page.
 *
 * Routes:  #hub (or empty) = hub overview
 *          #land | #water | #weather | #biodiversity | #agriculture
 *          #community | #history | #governance
 */

import '../styles/main.css';
import { createMap, mapboxgl, addMarker, addWmsLayer, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n, t } from '../lib/i18n.js';
import {
  ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS,
  getAllSections, getSectionById,
} from '../lib/wiki-data.js';

// Charts & dashboard
import {
  renderStatCards, drawPieChart, drawBarChart, drawAreaChart, drawRadarChart,
  renderInfoGrid, renderTextureBar, renderAlertRows, renderBulletList,
  renderWatershedSvg, createChartCard, createContentCard,
} from '../lib/wiki-charts.js';

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

/**
 * Format wiki article content: detect "Label: value. Label2: value2." patterns
 * and convert them to a definition list for cleaner presentation.
 */
function formatArticleContent(text) {
  if (!text) return '';
  // Split on sentence boundaries followed by a Key: pattern
  // e.g. "Area: 1,720 km². Population: ~30,000."
  const parts = text.split(/(?<=\.)\s+(?=[A-Z][\w\s&\/()~<>-]*?:)/);
  // If fewer than 2 key-value items, render as normal paragraph
  if (parts.length < 2 || !parts.every(p => /^[A-Z][\w\s&\/()~<>-]*?:/.test(p))) {
    return `<p>${text}</p>`;
  }
  const items = parts.map(chunk => {
    const colonIdx = chunk.indexOf(':');
    if (colonIdx === -1) return `<p>${chunk}</p>`;
    const label = chunk.slice(0, colonIdx).trim();
    const value = chunk.slice(colonIdx + 1).trim().replace(/\.$/, '');
    return `<dt>${label}</dt><dd>${value}</dd>`;
  }).join('');
  return `<dl class="wiki-dl">${items}</dl>`;
}

// Cached stats from API
let _statsCache = null;
let _statsCacheTime = 0;
const STATS_CACHE_TTL = 30000; // 30s

async function fetchStats(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _statsCache && (now - _statsCacheTime) < STATS_CACHE_TTL) {
    return _statsCache;
  }
  try {
    const res = await fetch('/api/wiki/contributions/stats');
    if (!res.ok) throw new Error('Stats fetch failed');
    _statsCache = await res.json();
    _statsCacheTime = now;
    return _statsCache;
  } catch (err) {
    console.warn('Could not fetch stats:', err);
    return { sections: {}, totals: { suggestions: 0, comments: 0, lastUpdated: null } };
  }
}

function timeAgo(isoString) {
  if (!isoString) return t('wiki.hub.noActivity');
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
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
        <span class="wiki-nav-title">${t('wiki.hub.title')}</span>
      </a>
      <hr>
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-nav-link ${activeId === s.id ? 'active' : ''}">
          <span class="wiki-nav-title">${t('wiki.sections.' + s.id) || s.title}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// ---------------------------------------------------------------------------
// Hub view
// ---------------------------------------------------------------------------

function getIconSvg(icon) {
  const icons = {
    globe: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    leaf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    mountain: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
    layers: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 12.43-1.42-.65-8.28 3.78a2 2 0 0 1-1.66 0l-8.29-3.78-1.42.65a1 1 0 0 0 0 1.84l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.85Z"/><path d="m22.54 16.43-1.42-.65-8.28 3.78a2 2 0 0 1-1.66 0l-8.29-3.78-1.42.65a1 1 0 0 0 0 1.84l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.85Z"/></svg>',
    waves: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
    sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    map: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/><path d="M2 4v16l6-3 8 3 6-3V1l-6 3-8-3-6 3Z"/><path d="M8 4v13"/><path d="M16 7v13"/></svg>',
    alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    people: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  };
  return icons[icon] || icons.globe;
}

async function renderHub() {
  destroyMap();
  const sections = getAllSections();
  const stats = await fetchStats();
  const totalSuggestions = stats.totals.suggestions;
  const totalComments = stats.totals.comments;
  const lastUpdatedText = stats.totals.lastUpdated ? timeAgo(stats.totals.lastUpdated) : 'no activity yet';

  content.innerHTML = `
    <div class="wiki-hub-breadcrumb">
      <a href="/">${t('wiki.hub.breadcrumb.commons')}</a>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      <span>${t('wiki.hub.breadcrumb.odemira')}</span>
    </div>

    <section class="wiki-hub-hero">
      <div class="wiki-hub-hero-left">
        <h1>${t('wiki.hub.hero.title')}</h1>
        <p class="wiki-hub-description">
          ${ODEMIRA.subtitle} — A municipality in the Beja District of Portugal's Alentejo region,
          encompassing approximately ${ODEMIRA.area.toLocaleString()} km² of coastal and inland ecosystems.
        </p>
        <div class="wiki-hub-meta">
          <span class="wiki-hub-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${ODEMIRA.population.toLocaleString()} ${t('wiki.hub.residents')}
          </span>
          <span class="wiki-hub-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${t('wiki.hub.updated')} ${lastUpdatedText}
          </span>
        </div>
      </div>
      <div class="wiki-hub-stats">
        <div class="wiki-hub-stats-grid">
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">${ODEMIRA.area}</span>
            <span class="wiki-hub-stat-label">${t('wiki.hub.kmArea')}</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">44%</span>
            <span class="wiki-hub-stat-label">${t('wiki.hub.protected')}</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">110 km</span>
            <span class="wiki-hub-stat-label">${t('wiki.hub.coastline')}</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">${sections.length}</span>
            <span class="wiki-hub-stat-label">${t('wiki.hub.wikiSections')}</span>
          </div>
        </div>
        <div class="wiki-hub-stats-footer">
          <span class="wiki-hub-dot wiki-hub-dot-orange"></span>
          <span>${totalSuggestions} ${t('wiki.hub.suggestions')}</span>
          <span class="wiki-hub-dot wiki-hub-dot-green"></span>
          <span>${totalComments} ${t('wiki.hub.comments')}</span>
        </div>
      </div>
    </section>

    <div class="wiki-hub-grid">
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-hub-card">
          <div class="wiki-hub-card-image" style="border-top: 3px solid ${s.accentColor || s.color}">
            <img src="/wiki/${s.id}.png" alt="${t('wiki.sections.' + s.id) || s.title}" loading="lazy" />
          </div>
          <div class="wiki-hub-card-body">
            <div class="wiki-hub-card-icon" style="color: ${s.accentColor || s.color}">
              ${getIconSvg(s.icon)}
            </div>
            <h3>${t('wiki.sections.' + s.id) || s.title}</h3>
            <p>${s.description}</p>
          </div>
          <div class="wiki-hub-card-footer">
            <span class="wiki-hub-card-stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
              ${stats.sections[s.id]?.suggestions || 0}
            </span>
            <span class="wiki-hub-card-stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              ${stats.sections[s.id]?.comments || 0}
            </span>
            <span class="wiki-hub-card-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${stats.sections[s.id]?.lastUpdated ? timeAgo(stats.sections[s.id].lastUpdated) : t('wiki.hub.noActivityShort')}
            </span>
          </div>
        </a>
      `).join('')}
    </div>

    <section class="wiki-hub-resources" id="wiki-hub-resources">
      <h2 class="wiki-hub-resources-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        ${t('wiki.hub.resources')}
      </h2>
      <div id="wiki-hub-resources-accordion" class="wiki-resources-accordion">
        <div class="loading-block"><span class="loading-spinner"></span> ${t('wiki.hub.loadingResources')}</div>
      </div>
    </section>
  `;

  // Load hub resources accordion after DOM insertion
  setTimeout(() => loadHubResources(), 0);
}

// ---------------------------------------------------------------------------
// Dashboard panel — renders charts + stat cards from section.visuals
// ---------------------------------------------------------------------------

function renderDashboard(section) {
  const panel = document.getElementById('wiki-dashboard');
  if (!panel || !section.visuals) return;

  const v = section.visuals;

  // 1) Stat cards
  if (v.stats) {
    renderStatCards(panel, v.stats);
  }

  // 2) Charts
  if (v.charts) {
    const chartRow = document.createElement('div');
    // Use side-by-side if there are exactly 2 charts, or if chart + alertRows
    const needsRow = v.charts.length === 2 || (v.charts.length === 1 && (v.alertRows || v.infoGrid));
    if (needsRow) chartRow.className = 'wiki-chart-row';

    v.charts.forEach(c => {
      const canvas = createChartCard(needsRow ? chartRow : panel, c.title);
      switch (c.type) {
        case 'pie':
          drawPieChart(canvas, c.data);
          break;
        case 'bar':
          drawBarChart(canvas, c.data);
          break;
        case 'area':
          drawAreaChart(canvas, c.data);
          break;
        case 'radar':
          drawRadarChart(canvas, c.data, { legendLabel: 'Risk Score' });
          break;
      }
    });

    // If side-by-side, put alert rows or info grid in the second column
    if (needsRow) {
      if (v.alertRows) {
        const body = createContentCard(chartRow, 'Risk Summary');
        renderAlertRows(body, v.alertRows);
      } else if (v.infoGrid) {
        const body = createContentCard(chartRow, v.infoGrid.title);
        renderInfoGrid(body, v.infoGrid.rows);
      }
      panel.appendChild(chartRow);
    }
  }

  // 3) Alert rows (standalone, if no chart row pairing)
  if (v.alertRows && !(v.charts && v.charts.length === 1)) {
    const body = createContentCard(panel, 'Risk Summary');
    renderAlertRows(body, v.alertRows);
  }

  // 4) Info grid (standalone, if no chart row pairing)
  if (v.infoGrid && !(v.charts && v.charts.length === 1)) {
    const body = createContentCard(panel, v.infoGrid.title);
    renderInfoGrid(body, v.infoGrid.rows);
  }

  // 5) Texture bar
  if (v.textureBar) {
    const body = createContentCard(panel, v.textureBar.title);
    renderTextureBar(body, v.textureBar.segments);
  }

  // 6) Bullet list
  if (v.bulletList) {
    const body = createContentCard(panel, v.bulletList.title);
    renderBulletList(body, v.bulletList.items, section.accentColor || '#d97706');
  }

  // 7) Info cards (e.g. climate seasons)
  if (v.infoCards) {
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'wiki-info-cards';
    v.infoCards.forEach(ic => {
      cardsDiv.innerHTML += `
        <div class="wiki-info-card-item">
          <span class="wiki-info-card-label">${ic.label}</span>
          <span class="wiki-info-card-value">${ic.value}</span>
          ${ic.sublabel ? `<span class="wiki-info-card-sublabel">${ic.sublabel}</span>` : ''}
        </div>
      `;
    });
    panel.appendChild(cardsDiv);
  }

  // (Watershed diagram removed)
}

// ---------------------------------------------------------------------------
// Section view
// ---------------------------------------------------------------------------

async function renderSection(sectionId) {
  destroyMap();
  const section = getSectionById(sectionId);
  if (!section) { await renderHub(); return; }

  const allStats = await fetchStats();
  const sectionStats = allStats.sections[sectionId] || { suggestions: 0, comments: 0, lastUpdated: null };
  const totalSuggestions = sectionStats.suggestions;
  const totalComments = sectionStats.comments;
  const updatedAgoText = timeAgo(sectionStats.lastUpdated);
  const dataAlerts = Math.min(Math.floor(totalSuggestions / 5), 5) || 0;

  content.innerHTML = `
    <!-- Breadcrumb + Help -->
    <div class="wiki-section-topbar">
      <div class="wiki-section-breadcrumb">
        <a href="/">${t('wiki.hub.breadcrumb.commons')}</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        <a href="#hub">${t('wiki.hub.breadcrumb.odemira')}</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        <span>${t('wiki.sections.' + section.id) || section.title}</span>
      </div>
      <div class="wiki-help-trigger" id="wiki-help-trigger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div class="wiki-help-popover" id="wiki-help-popover">
          ${renderGuidelinesHTML()}
        </div>
      </div>
    </div>

    <div class="wiki-section-layout">
      <!-- Left column: main content -->
      <div class="wiki-section-main">
        <h1 class="wiki-section-title">${t('wiki.sections.' + section.id) || section.title}</h1>
        <p class="wiki-section-subtitle">${section.intro}</p>

        <div class="wiki-section-meta">
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${t('wiki.hub.updated')} ${updatedAgoText}
          </span>
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
            ${totalSuggestions} ${t('wiki.hub.suggestions')}
          </span>
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            ${totalComments} ${t('wiki.hub.comments')}
          </span>
        </div>

        <hr class="wiki-section-divider" />

        <!-- Dashboard Panel (auto-generated from section.visuals) -->
        <div class="wiki-dashboard" id="wiki-dashboard"></div>

        <!-- Articles (text selectable for edit toolbar) -->
        <section class="wiki-articles" id="wiki-articles">
          ${section.articles.map(a => `
            <article class="wiki-article" data-article-title="${a.title}">
              <h2>${a.title}</h2>
              ${formatArticleContent(a.content)}
            </article>
          `).join('')}
        </section>
        <!-- Map (bioregion only) -->
        ${sectionId === 'bioregion' ? '<div class="wiki-map" id="wiki-section-map" style="height:400px;border-radius:8px;margin:1.5rem 0;"></div>' : ''}

        <!-- Community Contributions -->
        <section class="wiki-contributions" id="wiki-contributions">
          <div class="wiki-contributions-header">
            <h2>${t('wiki.section.communityContributions')}</h2>
          </div>
          <div class="wiki-contributions-list" id="contributions-list">
            <div class="loading-block"><span class="loading-spinner"></span> ${t('wiki.section.loadingContributions')}</div>
          </div>
        </section>

        <!-- Live Data -->
        <section class="wiki-data-section" id="wiki-data-section">
          <button class="wiki-data-toggle" id="wiki-data-toggle" style="display:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
             ${t('wiki.section.refreshLiveData')}
          </button>
          <div id="wiki-data-content"></div>
        </section>
      </div>

      <!-- Right column: Community Notes sidebar -->
      <aside class="wiki-section-aside">
        <div class="wiki-community-notes">
          <h3 class="wiki-community-notes-title">${t('wiki.section.communityNotes')}</h3>

          <div class="wiki-community-notes-item wiki-community-notes-item--clickable" id="wiki-notes-suggestions" data-type="edit" style="cursor:pointer;">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--suggest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${totalSuggestions} ${t('wiki.hub.suggestions')}</strong>
              <span>${t('wiki.section.pendingReview')}</span>
            </div>
            <svg class="wiki-community-notes-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="wiki-community-notes-item wiki-community-notes-item--clickable" id="wiki-notes-comments" data-type="comment" style="cursor:pointer;">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--comment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${totalComments} ${t('wiki.hub.comments')}</strong>
              <span>${t('wiki.section.communityInsights')}</span>
            </div>
            <svg class="wiki-community-notes-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          ${dataAlerts > 0 ? `
          <div class="wiki-community-notes-item wiki-community-notes-item--alert">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${dataAlerts} ${t('wiki.section.dataAlerts')}</strong>
              <span>${t('wiki.section.needsVerification')}</span>
            </div>
          </div>
          ` : ''}

          <div class="wiki-recent-activity" id="wiki-recent-activity">
            <h4>${t('wiki.section.recentActivity')}</h4>
            <div class="wiki-recent-activity-list" id="recent-activity-list">
              <span class="wiki-recent-activity-placeholder">Loading...</span>
            </div>
            <div class="wiki-sidebar-actions">
              <button class="wiki-sidebar-action-btn" id="sidebar-add-contribution">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                ${t('wiki.sidebar.addContribution')}
              </button>
              <button class="wiki-sidebar-action-btn" id="sidebar-suggest-edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                ${t('wiki.sidebar.suggestEdit')}
              </button>
              <button class="wiki-sidebar-action-btn" id="sidebar-add-comment">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ${t('wiki.sidebar.addComment')}
              </button>
            </div>
          </div>
        </div>



        <!-- Resources (in sidebar) -->
        <div class="wiki-resources-panel">
          <div class="wiki-resources-panel-header">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              ${t('wiki.section.resources')}
              <span class="wiki-resources-count" id="wiki-resources-count"></span>
            </h3>
            <button class="wiki-resources-add-btn" id="wiki-resources-add-btn" title="Add Resource">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              ${t('wiki.section.addResource')}
            </button>
          </div>
          <div class="wiki-resources-list" id="wiki-resources-list">
            <span class="wiki-resources-placeholder">Loading...</span>
          </div>
        </div>
      </aside>
    </div>

    <!-- Text Selection Toolbar (hidden, positioned absolutely) -->
    <div class="wiki-selection-toolbar" id="wiki-selection-toolbar" style="display:none;">
      <button data-action="edit" title="Suggest Edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        ${t('wiki.section.suggestEdit')}
      </button>
      <button data-action="comment" title="${t('wiki.section.comment')}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        ${t('wiki.section.comment')}
      </button>
      <button data-action="flag" title="${t('wiki.section.flag')}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        ${t('wiki.section.flag')}
      </button>
    </div>

    <!-- Contributions viewer modal (hidden) -->
    <div class="wiki-contrib-viewer-overlay" id="wiki-contrib-viewer-overlay" style="display:none;">
      <div class="wiki-inline-contrib-modal wiki-contrib-viewer-modal">
        <div class="wiki-inline-contrib-header">
          <h3 id="wiki-contrib-viewer-title">${t('wiki.hub.suggestions')}</h3>
          <button class="wiki-inline-contrib-close" id="wiki-contrib-viewer-close">&times;</button>
        </div>
        <div class="wiki-contrib-viewer-body" id="wiki-contrib-viewer-body">
          <div class="loading-block"><span class="loading-spinner"></span> Loading...</div>
        </div>
      </div>
    </div>

    <!-- Inline contribution modal (hidden) -->
    <div class="wiki-inline-contrib-overlay" id="wiki-inline-contrib-overlay" style="display:none;">
      <div class="wiki-inline-contrib-modal">
        <div class="wiki-inline-contrib-header">
          <h3 id="wiki-inline-contrib-title">${t('wiki.section.suggestEdit')}</h3>
          <button class="wiki-inline-contrib-close" id="wiki-inline-contrib-close">&times;</button>
        </div>
        <div class="wiki-inline-contrib-body">
          <div class="wiki-inline-contrib-selected" id="wiki-inline-contrib-selected"></div>
          <textarea id="wiki-inline-contrib-text" rows="4" placeholder="Your suggestion or comment..."></textarea>
          <input type="text" id="wiki-inline-contrib-author" placeholder="Your name (optional)" />
        </div>
        <div class="wiki-inline-contrib-footer">
          <button class="wiki-inline-contrib-cancel" id="wiki-inline-contrib-cancel">${t('wiki.section.cancel')}</button>
          <button class="wiki-inline-contrib-submit" id="wiki-inline-contrib-submit">${t('wiki.section.submit')}</button>
        </div>
      </div>
    </div>

    <!-- Resource upload modal (hidden) -->
    <div class="wiki-upload-overlay" id="wiki-upload-overlay" style="display:none;">
      <div class="wiki-upload-modal">
        <div class="wiki-upload-header">
          <h3>${t('wiki.section.addResourceTitle')}</h3>
          <button class="wiki-upload-close" id="wiki-upload-close">&times;</button>
        </div>
        <div class="wiki-upload-body">
          <div class="wiki-upload-dropzone" id="wiki-upload-dropzone">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p>Drag & drop a file here, or <span class="wiki-upload-browse">browse</span></p>
            <p class="wiki-upload-hint">PDF, PNG, JPG, WEBP &mdash; max 5 MB</p>
            <input type="file" id="wiki-upload-file" accept=".pdf,.png,.jpg,.jpeg,.webp" style="display:none;" />
          </div>
          <div class="wiki-upload-file-preview" id="wiki-upload-file-preview" style="display:none;"></div>
          <div class="wiki-upload-fields">
            <div class="field">
              <label for="wiki-upload-title">Title</label>
              <input type="text" id="wiki-upload-title" placeholder="Resource title (optional)" />
            </div>
            <div class="field">
              <label for="wiki-upload-desc">Description</label>
              <input type="text" id="wiki-upload-desc" placeholder="Brief description (optional)" />
            </div>
            <div class="field">
              <label for="wiki-upload-author">Your Name</label>
              <input type="text" id="wiki-upload-author" placeholder="Anonymous" />
            </div>
          </div>
        </div>
        <div class="wiki-upload-footer">
          <button class="wiki-upload-cancel" id="wiki-upload-cancel">${t('wiki.section.cancel')}</button>
          <button class="wiki-upload-submit" id="wiki-upload-submit" disabled>${t('wiki.section.upload')}</button>
        </div>
      </div>
    </div>
  `;

  // Initialise map, contributions, sidebar, and toolbar after DOM insertion
  setTimeout(() => {
    // Only init map for bioregion (only section with a map)
    const mapContainer = document.getElementById('wiki-section-map');
    if (mapContainer) {
      currentMap = createBaseMap('wiki-section-map');
      currentMap.on('load', () => {
        initSectionMap(sectionId, currentMap);
      });
    }
    loadContributions(sectionId);
    loadRecentActivity(sectionId);
    loadResources(sectionId);
    initResourceUpload(sectionId);
    initTextSelectionToolbar(sectionId);
    initContribViewerClicks(sectionId);
    initSidebarActions(sectionId);

    // Render dashboard visuals (if section has them)
    renderDashboard(section);

    // Wire up ? help tooltip (click-to-toggle)
    const helpTrigger = document.getElementById('wiki-help-trigger');
    const helpPopover = document.getElementById('wiki-help-popover');
    if (helpTrigger && helpPopover) {
      helpTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        helpPopover.classList.toggle('wiki-help-popover--open');
      });
      document.addEventListener('click', (e) => {
        if (!helpTrigger.contains(e.target)) {
          helpPopover.classList.remove('wiki-help-popover--open');
        }
      });
    }

    // Auto-load live data, then show refresh button
    const toggleBtn = document.getElementById('wiki-data-toggle');
    const dataContent = document.getElementById('wiki-data-content');
    if (toggleBtn && dataContent) {
      // Load automatically on section render
      loadSectionData(sectionId).then(() => {
        toggleBtn.style.display = '';
      }).catch(() => {
        toggleBtn.style.display = '';
        toggleBtn.textContent = t('wiki.section.retryLiveData');
      });

      // Wire up manual refresh
      toggleBtn.addEventListener('click', () => {
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = `<span class="loading-spinner"></span> Loading live data\u2026`;
        loadSectionData(sectionId).then(() => {
          toggleBtn.disabled = false;
          toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Refresh live data`;
        }).catch(() => {
          toggleBtn.disabled = false;
          toggleBtn.textContent = t('wiki.section.retryLiveData');
        });
      });
    }
  }, 0);
}

// ---------------------------------------------------------------------------
// Contribute view (centralized form)
// ---------------------------------------------------------------------------

function renderContribute(preselectedSection) {
  destroyMap();
  const sections = getAllSections();

  content.innerHTML = `
    <section class="wiki-hero">
      <h1>Share Your Knowledge</h1>
      <p class="wiki-intro">Help build the wiki. Share a story, tip, event, place, or resource about the Odemira region. All fields are optional except your message.</p>
    </section>

    <section class="wiki-contribute-form">
      <form id="contribution-form">
        <div class="field-row">
          <div class="field">
            <label for="contrib-section">Section</label>
            <select id="contrib-section" name="section">
              <option value="">General (no specific section)</option>
              ${sections.map(s => `
                <option value="${s.id}" ${s.id === preselectedSection ? 'selected' : ''}>${t('wiki.sections.' + s.id) || s.title}</option>
              `).join('')}
            </select>
          </div>
          <div class="field">
            <label for="contrib-type">Type</label>
            <select id="contrib-type" name="type">
              <option value="">Any</option>
              <option value="story">Story / Experience</option>
              <option value="tip">Practical Tip</option>
              <option value="event">Event / Gathering</option>
              <option value="place">Place / Location</option>
              <option value="resource">Resource / Link</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="contrib-author">Your Name</label>
            <input type="text" id="contrib-author" name="author" placeholder="Anonymous">
          </div>
          <div class="field">
            <label for="contrib-title">Title</label>
            <input type="text" id="contrib-title" name="title" placeholder="A short title (optional)">
          </div>
        </div>
        <div class="field">
          <label for="contrib-content">Your message *</label>
          <textarea id="contrib-content" name="content" rows="6" placeholder="Share what you know about this place..." required></textarea>
        </div>
        <button type="submit" class="btn-primary" id="submit-contribution">Submit</button>
        <div id="contrib-feedback" style="margin-top:12px;font-size:14px;"></div>
      </form>
    </section>
  `;

  setupContributionForm();
}

// ---------------------------------------------------------------------------
// Section map layers
// ---------------------------------------------------------------------------

async function initSectionMap(sectionId, map) {
  try {
    switch (sectionId) {
      case 'bioregion': await initLandMap(map); break;
      case 'ecology': initBiodiversityMap(map); break;
      case 'land': await initLandMap(map); break;
      case 'soil': await initLandMap(map); break;
      case 'water': await initWaterMap(map); break;
      case 'climate': initWeatherMap(map); break;
      case 'landuse': initAgricultureMap(map); break;
      case 'risks': await initWaterMap(map); break;
      case 'culture': await initHistoryMap(map); break;
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
  const container = document.getElementById('wiki-data-content');
  if (!container) return;

  container.innerHTML = loadingSkeleton(4);

  try {
    switch (sectionId) {
      case 'bioregion': await loadLandData(container); await loadWeatherData(container); break;
      case 'ecology': await loadBiodiversityData(container); break;
      case 'land': await loadLandData(container); break;
      case 'soil': await loadLandData(container); break;
      case 'water': await loadWaterData(container); break;
      case 'climate': await loadWeatherData(container); break;
      case 'landuse': loadAgricultureData(container); break;
      case 'risks': await loadWaterData(container); break;
      case 'culture': await loadHistoryData(container); break;
      case 'community': await loadCommunityData(container); break;
      default:
        container.innerHTML = '<p>No live data available for this section.</p>';
    }
  } catch (err) {
    console.error(`Data load error [${sectionId}]:`, err);
    container.innerHTML = `
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

function setupContributionForm() {
  const form = document.getElementById('contribution-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-contribution');
    const feedback = document.getElementById('contrib-feedback');
    const sectionEl = form.querySelector('[name="section"]');
    const sectionId = sectionEl ? sectionEl.value : '';
    const type = form.querySelector('[name="type"]').value;
    const author = form.querySelector('[name="author"]').value.trim();
    const title = form.querySelector('[name="title"]').value.trim();
    const contentVal = form.querySelector('[name="content"]').value.trim();

    if (!contentVal) {
      if (feedback) feedback.innerHTML = '<span style="color:var(--coral);">Please write a message.</span>';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Submitting\u2026';

    try {
      const res = await fetch('/api/wiki/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sectionId || 'general',
          type: type || 'story',
          title: title || '',
          content: contentVal,
          author: author || 'Anonymous',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit');
      }

      // Reset form
      form.reset();
      _statsCache = null; // invalidate stats cache
      if (feedback) {
        feedback.innerHTML = '<span style="color:var(--green);font-weight:600;">Thank you! Your contribution has been added.</span>';
        setTimeout(() => { feedback.innerHTML = ''; }, 4000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
      if (feedback) {
        feedback.innerHTML = `<span style="color:var(--coral);">Failed to submit: ${err.message}. Please try again.</span>`;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });
}

// ---------------------------------------------------------------------------
// Contributions Viewer Modal (from sidebar clicks)
// ---------------------------------------------------------------------------

function initContribViewerClicks(sectionId) {
  const suggestionsBtn = document.getElementById('wiki-notes-suggestions');
  const commentsBtn = document.getElementById('wiki-notes-comments');
  const overlay = document.getElementById('wiki-contrib-viewer-overlay');
  const titleEl = document.getElementById('wiki-contrib-viewer-title');
  const bodyEl = document.getElementById('wiki-contrib-viewer-body');
  const closeBtn = document.getElementById('wiki-contrib-viewer-close');

  if (!overlay || !bodyEl) return;

  function closeViewer() {
    overlay.style.display = 'none';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeViewer);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeViewer();
  });

  async function openViewer(typeFilter, label) {
    if (titleEl) titleEl.textContent = label;
    bodyEl.innerHTML = '<div class="loading-block"><span class="loading-spinner"></span> Loading...</div>';
    overlay.style.display = 'flex';

    try {
      const res = await fetch('/api/wiki/contributions?section=' + sectionId + '&type=' + typeFilter + '&limit=30');
      if (!res.ok) throw new Error('Failed to fetch');
      const items = await res.json();

      if (items.length === 0) {
        bodyEl.innerHTML = '<div class="wiki-contrib-viewer-empty"><p>No ' + label.toLowerCase() + ' yet for this section.</p></div>';
        return;
      }

      bodyEl.innerHTML = items.map(function (c) {
        var typeInfo = CONTRIBUTION_TYPE_LABELS[c.type] || { label: c.type, color: '#999' };
        var date = new Date(c.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        var html = '<div class="wiki-contribution-card">';
        html += '<div class="wiki-contribution-header">';
        html += '<span class="wiki-contribution-badge" style="background:' + typeInfo.color + ';">' + typeInfo.label + '</span>';
        html += '<span class="wiki-contribution-meta">' + (c.author || 'Anonymous') + ' &middot; ' + date + '</span>';
        html += '</div>';
        if (c.title) html += '<h3 class="wiki-contribution-title">' + c.title + '</h3>';
        if (c.selectedText) {
          html += '<blockquote class="wiki-contrib-viewer-quote">' + c.selectedText + '</blockquote>';
        }
        html += '<p class="wiki-contribution-content">' + c.content + '</p>';
        html += '</div>';
        return html;
      }).join('');
    } catch (err) {
      bodyEl.innerHTML = '<div class="wiki-contrib-viewer-empty"><p>Unable to load ' + label.toLowerCase() + '. Please try again later.</p></div>';
    }
  }

  if (suggestionsBtn) {
    suggestionsBtn.addEventListener('click', function () {
      openViewer('edit', 'Suggestions');
    });
  }

  if (commentsBtn) {
    commentsBtn.addEventListener('click', function () {
      openViewer('comment', 'Comments');
    });
  }
}

// ---------------------------------------------------------------------------
// Contribution Guidelines (for ? tooltip)
// ---------------------------------------------------------------------------

function renderGuidelinesHTML() {
  return `
    <div class="wiki-guidelines-content">
      <h3>Regional Knowledge Commons — Contribution Guidelines</h3>

      <h4>Our Purpose</h4>
      <p>The Regional Knowledge Commons exists to democratize landscape knowledge. We believe that effective stewardship requires accessible, accurate, and collectively-maintained information about the places we inhabit.</p>

      <h4>Types of Contributions</h4>
      <div class="wiki-guidelines-section">
        <h5>1. Suggest Edits</h5>
        <ul>
          <li>Correct outdated information</li>
          <li>Improve clarity or accuracy</li>
          <li>Update data with new sources</li>
          <li>Fix typos or formatting</li>
        </ul>
        <h5>2. Add Context (Comments)</h5>
        <ul>
          <li>Share local perspective</li>
          <li>Ask clarifying questions</li>
          <li>Provide additional nuance</li>
          <li>Connect related information</li>
        </ul>
        <h5>3. Flag Issues</h5>
        <ul>
          <li>Report potential errors</li>
          <li>Highlight missing citations</li>
          <li>Identify biased language</li>
          <li>Note accessibility problems</li>
        </ul>
      </div>

      <h4>How to Contribute</h4>
      <p><strong>Highlight any text</strong> in the wiki articles to see contribution options. You can suggest edits, add comments, or flag issues directly on the content you're reading.</p>

      <h4>Quality Standards</h4>
      <div class="wiki-guidelines-section">
        <p><strong>For Data &amp; Facts:</strong> Cite sources, prefer primary sources, indicate uncertainty, and note when data was collected.</p>
        <p><strong>For Local Knowledge:</strong> Help readers understand your perspective. Specific examples are invaluable.</p>
        <p><strong>For Corrections:</strong> Use constructive tone, explain reasoning, and suggest alternatives.</p>
      </div>

      <h4>Review Process</h4>
      <ol>
        <li><strong>Acknowledgment</strong> — Automated confirmation</li>
        <li><strong>Triage</strong> — Editors assess type and urgency (1-3 days)</li>
        <li><strong>Review</strong> — Subject-matter review (3-7 days)</li>
        <li><strong>Decision</strong> — Approved, declined, or returned for revision</li>
        <li><strong>Integration</strong> — Merged into wiki</li>
      </ol>

      <h4>Community Norms</h4>
      <p><em>We encourage:</em> Respectful disagreement, questions from all levels, connections between concepts, recognition of uncertainty.</p>
      <p><em>We discourage:</em> Promotional content, unsourced claims as fact, dismissive language, speculation without uncertainty framing.</p>

      <h4>Contact</h4>
      <p><strong>Technical:</strong> support@landlibrary.co<br/>
      <strong>Editorial:</strong> editors@landlibrary.co</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Recent Activity (for sidebar)
// ---------------------------------------------------------------------------

async function loadRecentActivity(sectionId) {
  const listEl = document.getElementById('recent-activity-list');
  if (!listEl) return;

  try {
    const res = await fetch(`/api/wiki/contributions?section=${sectionId}&limit=4`);
    if (!res.ok) throw new Error('Failed to fetch');
    const items = await res.json();

    if (items.length === 0) {
      listEl.innerHTML = '<span class="wiki-recent-activity-placeholder">' + t('wiki.sidebar.noRecentActivity') + '</span>';
      return;
    }

    const typeIcons = {
      edit: '⟳',
      comment: '💬',
      flag: '⚠',
      story: '📖',
      tip: '💡',
      event: '📅',
      place: '📍',
      resource: '🔗',
    };

    listEl.innerHTML = items.map(item => {
      const icon = typeIcons[item.type] || '📝';
      const date = new Date(item.created);
      const dateStr = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      const title = item.title || `${item.type} contribution`;
      return `
        <div class="wiki-recent-activity-item">
          <span class="wiki-recent-activity-icon">${icon}</span>
          <div class="wiki-recent-activity-detail">
            <span class="wiki-recent-activity-title">${title}</span>
            <span class="wiki-recent-activity-date">${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = '<span class="wiki-recent-activity-placeholder">Activity unavailable</span>';
  }
}

async function refreshSidebarStats(sectionId) {
  const allStats = await fetchStats(true); // force refresh
  const sectionStats = allStats.sections[sectionId] || { suggestions: 0, comments: 0, lastUpdated: null };

  // Update sidebar suggestion count
  const suggestionsEl = document.querySelector('#wiki-notes-suggestions .wiki-community-notes-text strong');
  if (suggestionsEl) suggestionsEl.textContent = `${sectionStats.suggestions} suggestions`;

  // Update sidebar comment count
  const commentsEl = document.querySelector('#wiki-notes-comments .wiki-community-notes-text strong');
  if (commentsEl) commentsEl.textContent = `${sectionStats.comments} comments`;

  // Update "Updated X ago" in section meta
  const metaItems = document.querySelectorAll('.wiki-section-meta-item');
  if (metaItems.length > 0) {
    const clockItem = metaItems[0];
    if (clockItem) {
      const svg = clockItem.querySelector('svg')?.outerHTML || '';
      clockItem.innerHTML = `${svg}\n            Updated ${timeAgo(sectionStats.lastUpdated)}`;
    }
  }

  // Update suggestion/comment counts in meta
  if (metaItems.length > 1) metaItems[1].innerHTML = metaItems[1].querySelector('svg')?.outerHTML + `\n            ${sectionStats.suggestions} suggestions`;
  if (metaItems.length > 2) metaItems[2].innerHTML = metaItems[2].querySelector('svg')?.outerHTML + `\n            ${sectionStats.comments} comments`;
}

// ---------------------------------------------------------------------------
// Text Selection Toolbar (Medium-style)
// ---------------------------------------------------------------------------

function initTextSelectionToolbar(sectionId) {
  const articlesContainer = document.getElementById('wiki-articles');
  const toolbar = document.getElementById('wiki-selection-toolbar');
  const overlay = document.getElementById('wiki-inline-contrib-overlay');
  if (!articlesContainer || !toolbar || !overlay) return;

  let currentSelectedText = '';
  let currentArticleTitle = '';
  let currentAction = '';

  // Show/hide toolbar on text selection
  function handleSelectionChange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      toolbar.style.display = 'none';
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      toolbar.style.display = 'none';
      return;
    }

    // Check if selection is within our articles
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const articleEl = container.nodeType === 1
      ? container.closest('.wiki-article')
      : container.parentElement?.closest('.wiki-article');

    if (!articleEl || !articlesContainer.contains(articleEl)) {
      toolbar.style.display = 'none';
      return;
    }

    currentSelectedText = selectedText;
    currentArticleTitle = articleEl.dataset.articleTitle || '';

    // Position toolbar above selection
    const rect = range.getBoundingClientRect();
    toolbar.style.display = 'flex';
    toolbar.style.position = 'fixed';
    toolbar.style.left = `${rect.left + rect.width / 2}px`;
    toolbar.style.top = `${rect.top - 8}px`;
    toolbar.style.transform = 'translate(-50%, -100%)';
  }

  // Debounce selection changes
  let selTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(handleSelectionChange, 150);
  });

  // Hide toolbar on click outside
  document.addEventListener('mousedown', (e) => {
    if (!toolbar.contains(e.target) && !overlay.contains(e.target)) {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          toolbar.style.display = 'none';
        }
      }, 200);
    }
  });

  // Toolbar button clicks
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    currentAction = btn.dataset.action;
    toolbar.style.display = 'none';

    // Open inline contribution modal
    const titleEl = document.getElementById('wiki-inline-contrib-title');
    const selectedEl = document.getElementById('wiki-inline-contrib-selected');
    const textEl = document.getElementById('wiki-inline-contrib-text');

    const labels = {
      edit: 'Suggest Edit',
      comment: 'Add Comment',
      flag: 'Flag Issue',
    };
    const placeholders = {
      edit: 'What should this text say instead?',
      comment: 'Share your thoughts on this passage...',
      flag: 'Describe the issue with this content...',
    };

    if (titleEl) titleEl.textContent = labels[currentAction] || 'Contribute';
    if (selectedEl) {
      const displayText = currentSelectedText.length > 200
        ? currentSelectedText.slice(0, 200) + '\u2026'
        : currentSelectedText;
      selectedEl.innerHTML = '<span class="wiki-inline-contrib-label">Selected text:</span>' +
        '<blockquote>' + displayText + '</blockquote>';
    }
    if (textEl) {
      textEl.placeholder = placeholders[currentAction] || 'Your message...';
      textEl.value = '';
    }

    overlay.style.display = 'flex';
    if (textEl) textEl.focus();

    // Clear selection
    window.getSelection().removeAllRanges();
  });

  // Close modal
  const closeBtn = document.getElementById('wiki-inline-contrib-close');
  const cancelBtn = document.getElementById('wiki-inline-contrib-cancel');
  function closeModal() {
    overlay.style.display = 'none';
    currentSelectedText = '';
    currentArticleTitle = '';
    currentAction = '';
  }
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Submit contribution
  const submitBtn = document.getElementById('wiki-inline-contrib-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const textEl = document.getElementById('wiki-inline-contrib-text');
      const authorEl = document.getElementById('wiki-inline-contrib-author');
      const contentVal = textEl ? textEl.value.trim() : '';

      if (!contentVal) {
        textEl.style.borderColor = 'var(--coral, #e74c3c)';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting\u2026';

      try {
        const actionLabel = currentAction === 'edit' ? 'Edit suggestion'
          : currentAction === 'comment' ? 'Comment' : 'Flag';
        const payload = {
          section: sectionId,
          type: currentAction,
          title: actionLabel + ': ' + currentArticleTitle,
          content: contentVal,
          author: authorEl ? authorEl.value.trim() || 'Anonymous' : 'Anonymous',
          selectedText: currentSelectedText,
          articleTitle: currentArticleTitle,
        };

        if (currentAction === 'edit') {
          payload.suggestedText = contentVal;
        }

        const res = await fetch('/api/wiki/contributions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to submit');
        }

        // Success — show confirmation then close
        const modalBody = overlay.querySelector('.wiki-inline-contrib-body');
        if (modalBody) {
          modalBody.innerHTML = '<div style="text-align:center;padding:1.5rem 0;">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            '<p style="margin-top:12px;font-weight:600;color:#2E8B57;">Thank you for your contribution!</p>' +
            '<p style="font-size:13px;color:#666;">Your ' + currentAction + ' has been submitted for review.</p>' +
            '</div>';
        }
        setTimeout(closeModal, 2500);
        // Invalidate stats cache and reload contributions
        _statsCache = null;
        loadContributions(sectionId);
        loadRecentActivity(sectionId);
        // Update sidebar stats
        refreshSidebarStats(sectionId);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        const modalFooter = overlay.querySelector('.wiki-inline-contrib-footer');
        if (modalFooter) {
          const errMsg = document.createElement('p');
          errMsg.style.cssText = 'color:var(--coral,#e74c3c);font-size:13px;margin:8px 0 0;';
          errMsg.textContent = 'Error: ' + err.message;
          modalFooter.appendChild(errMsg);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Sidebar Action Buttons
// ---------------------------------------------------------------------------

function initSidebarActions(sectionId) {
  const addContribBtn = document.getElementById('sidebar-add-contribution');
  const suggestEditBtn = document.getElementById('sidebar-suggest-edit');
  const addCommentBtn = document.getElementById('sidebar-add-comment');
  const overlay = document.getElementById('wiki-inline-contrib-overlay');

  // "Add a Contribution" scrolls to the community contributions form
  if (addContribBtn) {
    addContribBtn.addEventListener('click', () => {
      window.location.hash = '#contribute/' + sectionId;
    });
  }

  // "Suggest an Edit" opens the inline modal in 'edit' mode
  if (suggestEditBtn && overlay) {
    suggestEditBtn.addEventListener('click', () => {
      openSidebarContrib('edit', sectionId);
    });
  }

  // "Add a Comment" opens the inline modal in 'comment' mode
  if (addCommentBtn && overlay) {
    addCommentBtn.addEventListener('click', () => {
      openSidebarContrib('comment', sectionId);
    });
  }
}

function openSidebarContrib(action, sectionId) {
  const overlay = document.getElementById('wiki-inline-contrib-overlay');
  const titleEl = document.getElementById('wiki-inline-contrib-title');
  const selectedEl = document.getElementById('wiki-inline-contrib-selected');
  const textEl = document.getElementById('wiki-inline-contrib-text');

  const labels = { edit: t('wiki.sidebar.suggestEdit'), comment: t('wiki.sidebar.addComment') };
  const placeholders = {
    edit: 'What would you like to change or improve?',
    comment: 'Share your thoughts about this section...',
  };

  if (titleEl) titleEl.textContent = labels[action] || 'Contribute';
  if (selectedEl) selectedEl.innerHTML = '';
  if (textEl) {
    textEl.placeholder = placeholders[action] || 'Your message...';
    textEl.value = '';
  }

  // Store action for submit handler
  if (overlay) {
    overlay.dataset.currentAction = action;
    overlay.dataset.currentSection = sectionId;
    overlay.style.display = 'flex';
  }
  if (textEl) textEl.focus();
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function fileTypeLabel(type) {
  if (type === 'application/pdf') return 'PDF';
  if (type.startsWith('image/')) return type.split('/')[1].toUpperCase();
  return 'File';
}

function fileIconSvg(type) {
  if (type === 'application/pdf') {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  }
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
}

function renderResourceItem(r) {
  return `
    <div class="wiki-resources-item">
      <div class="wiki-resources-item-icon">${fileIconSvg(r.fileType)}</div>
      <div class="wiki-resources-item-info">
        <span class="wiki-resources-item-title">${r.title || r.fileName}</span>
        <span class="wiki-resources-item-meta">${fileTypeLabel(r.fileType)} \u00b7 ${formatFileSize(r.fileSize)} \u00b7 ${r.author}</span>
      </div>
      <a href="${r.blobUrl || '/api/wiki/resources/' + r.id}" class="wiki-resources-item-download" title="Download" target="_blank" rel="noopener noreferrer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </a>
    </div>
  `;
}

async function loadResources(sectionId) {
  const list = document.getElementById('wiki-resources-list');
  const countEl = document.getElementById('wiki-resources-count');
  if (!list) return;

  try {
    const res = await fetch(`/api/wiki/resources?section=${sectionId}`);
    if (!res.ok) throw new Error('Failed to load');
    const resources = await res.json();

    if (countEl) countEl.textContent = resources.length > 0 ? `(${resources.length})` : '';

    if (resources.length === 0) {
      list.innerHTML = '<span class="wiki-resources-placeholder">No resources yet. Be the first to add one!</span>';
      return;
    }

    list.innerHTML = resources.map(renderResourceItem).join('');
  } catch (err) {
    console.warn('Resources load error:', err);
    list.innerHTML = '<span class="wiki-resources-placeholder">Unable to load resources.</span>';
    if (countEl) countEl.textContent = '';
  }
}

async function loadHubResources() {
  const accordion = document.getElementById('wiki-hub-resources-accordion');
  if (!accordion) return;

  try {
    const res = await fetch('/api/wiki/resources');
    if (!res.ok) throw new Error('Failed to load');
    const resources = await res.json();

    if (resources.length === 0) {
      accordion.innerHTML = '<p class="wiki-resources-placeholder">No resources have been added yet.</p>';
      return;
    }

    // Group by section
    const grouped = {};
    const sections = getAllSections();
    sections.forEach(s => { grouped[s.id] = { title: s.title, color: s.accentColor || s.color, items: [] }; });
    resources.forEach(r => {
      if (grouped[r.section]) grouped[r.section].items.push(r);
    });

    // Only show sections with resources
    const sectionsWithResources = Object.entries(grouped).filter(([, v]) => v.items.length > 0);

    if (sectionsWithResources.length === 0) {
      accordion.innerHTML = '<p class="wiki-resources-placeholder">No resources have been added yet.</p>';
      return;
    }

    accordion.innerHTML = sectionsWithResources.map(([id, group]) => `
      <div class="wiki-resources-accordion-section">
        <button class="wiki-resources-accordion-header" data-section="${id}">
          <span class="wiki-resources-accordion-dot" style="background:${group.color}"></span>
          <span>${group.title}</span>
          <span class="wiki-resources-accordion-badge">${group.items.length}</span>
          <svg class="wiki-resources-accordion-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="wiki-resources-accordion-body" style="display:none;">
          ${group.items.map(renderResourceItem).join('')}
        </div>
      </div>
    `).join('');

    // Wire accordion clicks
    accordion.querySelectorAll('.wiki-resources-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        header.classList.toggle('wiki-resources-accordion-header--open', !isOpen);
      });
    });
  } catch (err) {
    console.warn('Hub resources error:', err);
    accordion.innerHTML = '<p class="wiki-resources-placeholder">Unable to load resources.</p>';
  }
}

function initResourceUpload(sectionId) {
  const addBtn = document.getElementById('wiki-resources-add-btn');
  const overlay = document.getElementById('wiki-upload-overlay');
  const closeBtn = document.getElementById('wiki-upload-close');
  const cancelBtn = document.getElementById('wiki-upload-cancel');
  const submitBtn = document.getElementById('wiki-upload-submit');
  const dropzone = document.getElementById('wiki-upload-dropzone');
  const fileInput = document.getElementById('wiki-upload-file');
  const preview = document.getElementById('wiki-upload-file-preview');

  if (!addBtn || !overlay) return;

  let selectedFile = null;

  function openModal() { overlay.style.display = 'flex'; }
  function closeModal() {
    overlay.style.display = 'none';
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    if (dropzone) dropzone.style.display = '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Upload'; }
    const titleEl = document.getElementById('wiki-upload-title');
    const descEl = document.getElementById('wiki-upload-desc');
    const authorEl = document.getElementById('wiki-upload-author');
    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    if (authorEl) authorEl.value = '';
  }

  function showFilePreview(file) {
    selectedFile = file;
    if (dropzone) dropzone.style.display = 'none';
    if (preview) {
      preview.style.display = 'flex';
      preview.innerHTML = `
        <div class="wiki-upload-file-info">
          ${fileIconSvg(file.type)}
          <div>
            <strong>${file.name}</strong>
            <span>${fileTypeLabel(file.type)} \u00b7 ${formatFileSize(file.size)}</span>
          </div>
          <button class="wiki-upload-file-remove" id="wiki-upload-file-remove" title="Remove">&times;</button>
        </div>
      `;
      preview.querySelector('#wiki-upload-file-remove')?.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        preview.style.display = 'none';
        preview.innerHTML = '';
        dropzone.style.display = '';
        submitBtn.disabled = true;
      });
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  addBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Dropzone events
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('wiki-upload-dropzone--active'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('wiki-upload-dropzone--active'); });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('wiki-upload-dropzone--active');
      const file = e.dataTransfer.files[0];
      if (file) showFilePreview(file);
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) showFilePreview(file);
    });
  }

  // Submit
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      if (!selectedFile) return;

      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5 MB.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Uploading\u2026';

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('section', sectionId);
      formData.append('title', document.getElementById('wiki-upload-title')?.value.trim() || '');
      formData.append('description', document.getElementById('wiki-upload-desc')?.value.trim() || '');
      formData.append('author', document.getElementById('wiki-upload-author')?.value.trim() || 'Anonymous');

      try {
        const res = await fetch('/api/wiki/resources', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }

        closeModal();
        loadResources(sectionId);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
        const footer = overlay.querySelector('.wiki-upload-footer');
        if (footer) {
          footer.querySelector('.wiki-upload-error')?.remove();
          const errEl = document.createElement('p');
          errEl.className = 'wiki-upload-error';
          errEl.textContent = 'Error: ' + err.message;
          footer.prepend(errEl);
        }
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

// Track last section for pre-selecting in contribute form
let lastSectionId = null;

async function route() {
  const id = currentRoute();
  renderSidebar(id);

  if (id === 'hub' || !getSectionById(id)) {
    await renderHub();
  } else {
    lastSectionId = id;
    await renderSection(id);
  }
}

window.addEventListener('hashchange', route);

// Initial render
route();
