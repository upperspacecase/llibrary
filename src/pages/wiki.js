/**
 * wiki.js — Hash-routed regional wiki page.
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
  getEventsCalendar, getLandmarks,
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

// API — Risk scores (live)
import { fetchRiskScores, scoreToColors } from '../api/risk-scores.js';

// API — Natura 2000
import {
  NATURA2000_WMS, getNatura2000WmsParams,
} from '../api/natura2000.js';

// ---- Initialise i18n ----
initI18n();

// ---- DOM refs ----
const sidebar = document.getElementById('wiki-sidebar');
const content = document.getElementById('wiki-content');

// Mobile drawer refs
const fab = document.getElementById('wiki-fab');
const drawerBackdrop = document.getElementById('wiki-drawer-backdrop');
const drawer = document.getElementById('wiki-drawer');
const drawerNav = document.getElementById('wiki-drawer-nav');

// ---- State ----
let currentMap = null;

// ---- Mobile drawer logic ----
function openDrawer() {
  fab.classList.add('is-open');
  drawerBackdrop.classList.add('is-visible');
  drawer.classList.add('is-open');
}

function closeDrawer() {
  fab.classList.remove('is-open');
  drawerBackdrop.classList.remove('is-visible');
  drawer.classList.remove('is-open');
}

fab.addEventListener('click', () => {
  if (drawer.classList.contains('is-open')) closeDrawer();
  else openDrawer();
});

drawerBackdrop.addEventListener('click', closeDrawer);

// Close drawer when a nav link is tapped
drawerNav.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeDrawer();
});

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
  const navHtml = `
      <a href="#hub" class="wiki-nav-link ${activeId === 'hub' ? 'active' : ''}">
        <span class="wiki-nav-title">${t('wiki.hub.title')}</span>
      </a>
      <hr>
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-nav-link ${activeId === s.id ? 'active' : ''}">
          <span class="wiki-nav-title">${t('wiki.sections.' + s.id) || s.title}</span>
        </a>
      `).join('')}
  `;

  sidebar.innerHTML = `<nav class="wiki-sidebar-nav">${navHtml}</nav>`;
  drawerNav.innerHTML = navHtml;
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
// Environmental Dashboard (custom render — Odemira region snapshot)
// ---------------------------------------------------------------------------

// Inline Lucide SVG icons (https://lucide.dev). Stroke-only paths kept
// minimal so they tree-shake to a few hundred bytes in the wiki bundle.
function lucide(name, size = 18) {
  const paths = {
    'cloud-sun':
      '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m17.66 17.66 1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    'leaf':
      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 6.5-4.5 12-10 12-3 0-5-1-6-2"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
    'droplet':
      '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    'sprout':
      '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    'sun':
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    'wind':
      '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    'waves':
      '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    'triangle-alert':
      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'flame':
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'info':
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'home':
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  };
  const d = paths[name] || '';
  return `<svg class="ed-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

function renderEnvironmentalDashboard() {
  const cellAttrs = (cell, fmt, unit) => {
    const parts = [];
    if (cell) parts.push(`data-cell="${cell}"`);
    if (fmt) parts.push(`data-fmt="${fmt}"`);
    if (unit) parts.push(`data-unit="${unit}"`);
    return parts.join(' ');
  };
  const P = (src, cell, fmt, unit) =>
    `<span class="ed-data" ${cellAttrs(cell, fmt, unit)} title="Data source: ${src}">DATA?</span>`;
  const PB = (src, note) =>
    `<div class="ed-data-block" title="Data source: ${src}${note ? ' — ' + note : ''}">
       <div class="ed-data-block-tag">DATA?</div>
       <div class="ed-data-block-src">${src}</div>
       ${note ? `<div class="ed-data-block-note">${note}</div>` : ''}
     </div>`;
  const D = (src) => `<span class="ed-delta" title="Comparator: ${src}">Δ?</span>`;
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const monthsRow = `<div class="ed-months">${months.map(m => `<span>${m}</span>`).join('')}</div>`;

  const trajectoryRows = [
    { label: 'Mean temp (°C)',         metric: 'temp',     fmt: '1f',  deltaMode: 'absC',  betterDir: -1, color: '#b85a3a' },
    { label: 'Precipitation (mm/yr)',  metric: 'precip',   fmt: 'int', deltaMode: 'pct',   betterDir: +1, color: '#3d6b8c' },
    { label: 'Heat days (>30°C·yr)',   metric: 'hotDays',  fmt: 'int', deltaMode: 'pct',   betterDir: -1, color: '#c47a3a' },
  ].map(r => `
    <div class="ed-traj-row" data-metric="${r.metric}" data-delta-mode="${r.deltaMode}" data-better-dir="${r.betterDir}" data-color="${r.color}">
      <div class="ed-traj-label">${r.label}</div>
      <div class="ed-traj-cell" data-pos="early">${P('Open-Meteo 50yr Archive', `trajectory.${r.metric}.early`, r.fmt)}</div>
      <div class="ed-traj-cell" data-pos="late">${P('Open-Meteo 50yr Archive', `trajectory.${r.metric}.late`, r.fmt)}</div>
      <div class="ed-traj-cell" data-pos="recent">${P('Open-Meteo 50yr Archive', `trajectory.${r.metric}.recent`, r.fmt)}</div>
      <div class="ed-traj-delta">${D('Self (early → recent)')}</div>
      <svg class="ed-traj-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
    </div>
  `).join('');

  const soilRow = (label, src, cell, fmt, unit) => `
    <div class="ed-soil-row">
      <span class="ed-soil-label">${label}</span>
      <span class="ed-soil-value">${P(src, cell, fmt, unit)}</span>
      <span class="ed-soil-delta">${D('National baseline')}</span>
    </div>
  `;

  const speciesCard = () => `
    <div class="ed-species-card">
      ${PB('iNaturalist photo CDN')}
      <div class="ed-species-name">${P('iNaturalist Species')}</div>
    </div>
  `;

  const spiLegend = [
    ['#3d6b48','Extremely wet'], ['#7a9a6e','Severely wet'],
    ['#d6c89c','Moderate drought'], ['#b85a3a','Severe drought'],
    ['#7a2a14','Extreme drought'],
  ].map(([c,l]) => `<span class="ed-legend-chip"><i style="background:${c}"></i>${l}</span>`).join('');

  const iucnLegend = [
    ['#5a7256','LC','Least Concern'], ['#7a9a6e','NT','Near Threatened'],
    ['#c9a14a','VU','Vulnerable'], ['#b85a3a','EN','Endangered'],
    ['#7a2a14','CR','Critically Endangered'],
  ].map(([c,k,l]) => `<span class="ed-iucn-chip"><i style="background:${c}">${k}</i>${l}</span>`).join('');

  const habitatRows = ['Mosaic cropland','Forests','Shrubland','Grassland','Other']
    .map(c => `<div class="ed-habitat-row"><span>${c}</span>${P('ESA WorldCover (aggregated)')}</div>`).join('');

  return `
    <section class="ed-root" id="environmental-dashboard">

      <!-- Region overview map: data input stations layered by source -->
      <section class="ed-region-map-block">
        <div class="ed-region-map-header">
          <div class="ed-region-map-title">${lucide('triangle-alert')}<span>Data input stations</span></div>
          <div class="ed-station-toggles" id="ed-station-toggles" role="group" aria-label="Toggle station layers">
            <span class="ed-station-toggles-empty">Loading stations…</span>
          </div>
        </div>
        <div class="ed-region-map" id="ed-station-map" aria-label="Map of Odemira data stations"></div>
      </section>

      <div class="ed-grid">
        <!-- WEATHER -->
        <section class="ed-panel ed-panel--weather">
          <div class="ed-panel-head">${lucide('cloud-sun')} WEATHER</div>
          <div class="ed-weather-grid">
            <div class="ed-card ed-card--span-6">
              <div class="ed-card-title">Climate trajectory <span>(50-yr archival)</span></div>
              <div class="ed-traj-head">
                <div></div><div>1975–84</div><div>2015–24</div><div>Last 5 yr</div><div class="ed-traj-delta">vs Baseline</div>
              </div>
              ${trajectoryRows}
            </div>
            <div class="ed-card ed-card--span-6">
              <div class="ed-card-title">Monthly normals <span>(1991–2020)</span></div>
              <svg class="ed-monthly" id="ed-monthly-chart" viewBox="0 0 360 140" preserveAspectRatio="none" aria-hidden="true">
                <text x="180" y="70" text-anchor="middle" class="ed-monthly-empty" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              ${monthsRow}
              <div class="ed-monthly-legend">
                <span><i style="background:#8b9a7e"></i>Rainfall (mm)</span>
                <span><i style="background:#b85a3a"></i>Temperature (°C)</span>
              </div>
            </div>
            <div class="ed-card ed-card--span-3">
              <div class="ed-card-title">Solar potential</div>
              <div class="ed-mini-row">
                <span class="ed-mini-icon">${lucide('sun', 22)}</span>
                <div class="ed-mini-stack">
                  ${P('Open-Meteo Solar/Wind', 'energy.solar.kWhPerM2Yr', 'int', ' kWh/m²/yr')}
                  <div class="ed-mini-sub">annual mean · GHI</div>
                </div>
              </div>
            </div>
            <div class="ed-card ed-card--span-3">
              <div class="ed-card-title">Wind potential</div>
              <div class="ed-mini-row">
                <span class="ed-mini-icon">${lucide('wind', 22)}</span>
                <div class="ed-mini-stack">
                  ${P('Open-Meteo Solar/Wind', 'energy.wind.ms100m', '1f', ' m/s')}
                  <div class="ed-mini-sub">at 100 m · annual mean</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SOIL -->
        <section class="ed-panel ed-panel--soil">
          <div class="ed-panel-head">${lucide('leaf')} SOIL</div>
          <div class="ed-card">
            <div class="ed-card-title">Soil summary <span>(0–30 cm)</span></div>
            ${soilRow('pH (H₂O)',          'SoilGrids Properties',     'soil.ph',             '1f')}
            ${soilRow('Organic carbon',    'SoilGrids Properties',     'soil.organicCarbon',  'str')}
            ${soilRow('WRB texture class', 'SoilGrids Classification', 'soil.classification', 'str')}
            ${soilRow('Bulk density',      'SoilGrids Properties',     'soil.bulkDensity',    'str')}
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Geology <span>(Macrostrat)</span></div>
            <div class="ed-geology" data-cell="geology.summary" data-fmt="str">${P('Macrostrat Geology')}</div>
          </div>
        </section>

        <!-- WATER -->
        <section class="ed-panel ed-panel--water">
          <div class="ed-panel-head">${lucide('droplet')} WATER</div>
          <div class="ed-water-grid">
            <div class="ed-card ed-card--span-5">
              <div class="ed-card-title">Hydrology <span>(context)</span></div>
              <div class="ed-hydro-map" id="ed-hydro-map">
                ${PB('Mapbox Static basemap', '')}
              </div>
              <div class="ed-hydro-stats">
                <div class="ed-hydro-stat" data-cell="water.nearestNamedStream" data-fmt="hydro">
                  <span>Nearest stream</span>${P('Overpass Water Features', null)}
                </div>
                <div class="ed-hydro-stat" data-cell="water.nearestNamedBody" data-fmt="hydro">
                  <span>Nearest lake / reservoir</span>${P('Overpass Water Features', null)}
                </div>
              </div>
            </div>
            <div class="ed-water-right">
              <div class="ed-card">
                <div class="ed-card-title-row">
                  <div class="ed-card-title">Water balance <span>P − ET₀ (mm/yr)</span></div>
                  <div class="ed-water-balance-legend">
                    <span class="ed-wb-leg-surplus">Surplus</span>
                    <span class="ed-wb-leg-deficit">Deficit</span>
                  </div>
                </div>
                <svg class="ed-water-balance-chart" id="ed-wb-chart" viewBox="0 0 700 180" preserveAspectRatio="none" aria-hidden="true">
                  <text x="350" y="90" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
                </svg>
                <div class="ed-years" id="ed-wb-years"></div>
              </div>
              <div class="ed-card">
                <div class="ed-card-title">GloFAS <span>discharge anomaly</span></div>
                <div class="ed-mini-row">
                  <span class="ed-mini-icon">${lucide('waves', 22)}</span>
                  <div class="ed-mini-stack">
                    ${P('GloFAS Flood Forecast', 'water.floodAnomalyPct', 'signedPct')}
                    <div class="ed-mini-sub">this week · ${P('GloFAS Flood Forecast', 'water.floodDischarge', '1f', ' m³/s')}</div>
                  </div>
                </div>
                <div class="ed-mini-sub">vs trailing 8mo mean · <span data-cell="water.floodBasinStation" data-fmt="str">Odemira sample point</span></div>
              </div>
            </div>
            <div class="ed-card ed-card--span-12">
              <div class="ed-card-title">SPI-12 <span id="ed-spi-range">(drought index)</span></div>
              <svg class="ed-spi-ribbon" id="ed-spi-ribbon" viewBox="0 0 1000 32" preserveAspectRatio="none" aria-hidden="true">
                <rect width="1000" height="32" fill="#fef2f2"/>
                <text x="500" y="20" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-legend-row">${spiLegend}</div>
              <div class="ed-years ed-years--wide" id="ed-spi-years"></div>
            </div>
          </div>
        </section>

        <!-- BIODIVERSITY -->
        <section class="ed-panel ed-panel--bio">
          <div class="ed-panel-head">${lucide('sprout')} BIODIVERSITY</div>
          <div class="ed-bio-grid">
            <div class="ed-card ed-card--span-7">
              <div class="ed-card-title">Top species <span>(by observations)</span></div>
              <div class="ed-species-grid">
                ${Array(8).fill(0).map(() => speciesCard()).join('')}
              </div>
              <div class="ed-legend-row ed-legend-row--iucn">${iucnLegend}</div>
            </div>
            <div class="ed-card ed-card--span-5">
              <div class="ed-card-title">Species observations <span>(5-yr windows · iNaturalist research-grade)</span></div>
              <svg class="ed-bio-trend" id="ed-bio-trend" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true">
                <text x="200" y="90" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-years" id="ed-bio-years"></div>
            </div>
            <div class="ed-card ed-card--span-5">
              <div class="ed-card-title">Total species</div>
              <div class="ed-mini-row">
                ${P('iNaturalist Species', 'species.total', 'int')}
                ${D('Parish baseline')}
              </div>
              <div class="ed-mini-sub">unique taxa observed · vs Odemira parish baseline</div>
            </div>
            <div class="ed-card ed-card--span-7">
              <div class="ed-card-title">Land cover <span>(Esri Living Atlas · Sentinel-2 10m · 2017→)</span></div>
              <svg class="ed-landcover" id="ed-landcover-chart" viewBox="0 0 360 160" preserveAspectRatio="none" aria-hidden="true">
                <text x="180" y="80" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-landcover-legend" id="ed-landcover-legend"></div>
            </div>
          </div>
        </section>

        <!-- RISK -->
        <section class="ed-panel ed-panel--risk">
          <div class="ed-panel-head">${lucide('triangle-alert')} RISK</div>
          <div class="ed-risk-grid">

            <!-- Flood -->
            <div class="ed-card ed-risk-card">
              <div class="ed-risk-head">
                <div class="ed-risk-title-block">
                  <div class="ed-card-title">Flood risk</div>
                  <div class="ed-risk-label" data-cell="flood.riskLevel" data-fmt="riskLevel">${P('Risk Scores (computed)', null)}</div>
                </div>
                <div class="ed-risk-score">${P('Risk Scores (computed)', 'flood.riskScore', 'int', '/5')}</div>
              </div>
              <div class="ed-flood-vis">
                <img class="ed-flood-img" src="/wiki/flood-crosssection.png" alt="Cross-section showing house above the nearest drainage channel" loading="lazy" />
                <div class="ed-flood-overlay ed-flood-overlay--drop" id="ed-flood-drop">
                  <span class="ed-flood-overlay-val">${P('Risk Scores (computed)', null)}</span>
                  <span class="ed-flood-overlay-sub">drop to drainage</span>
                </div>
                <div class="ed-flood-overlay ed-flood-overlay--channel">Drainage channel</div>
              </div>
              <div class="ed-info-callout">
                <span class="ed-info-icon">${lucide('info', 14)}</span>
                <span id="ed-flood-callout">${P('Risk Scores (computed)', null)}</span>
              </div>
              <div class="ed-risk-meta">
                <div><span>Vertical drop to nearest drainage</span>${P('Risk Scores (computed)', 'flood.hand', 'absM')}</div>
                <div><span>Nearest drainage</span><span class="ed-risk-meta-named"><strong data-cell="flood.drainageName" data-fmt="str">${P('Overpass Water Features', null)}</strong> <span data-cell="flood.distanceToDrainageM" data-fmt="distanceM">—</span></span></div>
              </div>
            </div>

            <!-- Fire -->
            <div class="ed-card ed-risk-card">
              <div class="ed-risk-head">
                <div class="ed-risk-title-block">
                  <div class="ed-card-title">Fire risk</div>
                  <div class="ed-risk-label" data-cell="fire.riskLevel" data-fmt="riskLevel">${P('Risk Scores (computed)', null)}</div>
                </div>
                <div class="ed-risk-score">${P('Risk Scores (computed)', 'fire.riskScore', 'int', '/5')}</div>
              </div>
              <div class="ed-fire-vis" id="ed-fire-vis">
                <div class="ed-fire-img-wrap" id="ed-fire-img-wrap">
                  ${PB('Mapbox Static map (region with 50 km ring)', '')}
                </div>
                <div class="ed-fire-scale">50 km</div>
              </div>
              <div class="ed-risk-meta">
                <div><span>Active fires within 50 km</span>${P('NASA FIRMS Active', 'fire.activeFires', 'int')}</div>
                <div><span>Historical (10yr) within 25 km</span><span class="ed-risk-unavail">Unavailable</span></div>
              </div>
            </div>

            <!-- Drought -->
            <div class="ed-card ed-risk-card">
              <div class="ed-risk-head">
                <div class="ed-risk-title-block">
                  <div class="ed-card-title">Drought risk</div>
                  <div class="ed-risk-label" data-cell="drought.riskLevel" data-fmt="riskLevel">${P('Risk Scores (computed)', null)}</div>
                </div>
                <div class="ed-risk-score">${P('Risk Scores (computed)', 'drought.riskScore', 'int', '/5')}</div>
              </div>
              <div class="ed-drought-block">
                <div class="ed-drought-title">Rainfall over the last 12 months vs normal</div>
                <svg class="ed-drought-chart" id="ed-drought-chart" viewBox="0 0 360 140" preserveAspectRatio="none" aria-hidden="true">
                  <text x="180" y="70" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
                </svg>
                <div class="ed-drought-legend">
                  <span class="ed-drought-leg-up">↑ Wetter than normal</span>
                  <span class="ed-drought-leg-dn">↓ Drier than normal</span>
                </div>
              </div>
              <div class="ed-info-callout">
                <span class="ed-info-icon">${lucide('info', 14)}</span>
                Shows whether the past 12 months were wetter or drier than a typical year for this location.
              </div>
              <div class="ed-risk-meta">
                <div><span>12-month rainfall pattern</span><strong id="ed-drought-summary">${P('Last 12 months of precip', null)}</strong></div>
                <div><span class="ed-drought-source">Based on month-vs-normal anomaly</span></div>
              </div>
            </div>

          </div>
        </section>
      </div>

      <section class="ed-snirh-panel">
        <h3>SNIRH sensors in Odemira</h3>
        <p>Portuguese national water-resources network — every station catalogued inside the Odemira polygon, what each measures, and how often.</p>
        <div class="ed-snirh-grid" id="ed-snirh-grid">
          ${['snirh_piezometria','snirh_hidrometrica','snirh_nascentes','snirh_qualidade_sub'].map(src => `
            <div class="ed-snirh-card" data-source="${src}">
              <div class="ed-snirh-card-head">
                <div class="ed-snirh-card-title" data-snirh-title></div>
                <div class="ed-snirh-card-cadence" data-snirh-cadence></div>
              </div>
              <div class="ed-snirh-card-meta" data-snirh-meta></div>
              <div class="ed-snirh-card-params" data-snirh-params></div>
              <div class="ed-snirh-card-stations" data-snirh-stations></div>
            </div>
          `).join('')}
        </div>
      </section>
    </section>
  `;
}

// Hydrate the dashboard cells with real values from /api/regions/odemira.
// Every cell tagged with [data-cell="<dot.path>"] is resolved against the
// response; null/undefined values keep their DATA? placeholder.
async function hydrateEnvironmentalDashboard() {
  let payload;
  try {
    const res = await fetch('/api/regions/odemira', { headers: { accept: 'application/json' } });
    if (!res.ok) {
      console.warn('[dashboard] /api/regions/odemira →', res.status);
      return;
    }
    payload = await res.json();
    if (!payload.ok) {
      console.warn('[dashboard] payload not ok:', payload.error);
      return;
    }
  } catch (e) {
    console.warn('[dashboard] fetch failed:', e.message);
    return;
  }

  // Compute synthetic trajectory bins from trends.yearly (annual series 1975+).
  // Pipeline shape per row: { year, meanTemp, precip }
  const yearly = Array.isArray(payload.trends && payload.trends.yearly) ? payload.trends.yearly : [];
  const meanOf = (arr, key) => {
    const vals = arr.map(r => r && r[key]).filter(v => typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const sliceYears = (lo, hi) => yearly.filter(r => r && r.year >= lo && r.year <= hi);
  const earlyRows  = sliceYears(1975, 1984);
  const lateRows   = sliceYears(2015, 2024);
  const recentRows = yearly.slice(-5);
  payload.trajectory = {
    temp: {
      early:  meanOf(earlyRows,  'meanTemp'),
      late:   meanOf(lateRows,   'meanTemp'),
      recent: meanOf(recentRows, 'meanTemp'),
    },
    precip: {
      early:  meanOf(earlyRows,  'precip'),
      late:   meanOf(lateRows,   'precip'),
      recent: meanOf(recentRows, 'precip'),
    },
    hotDays: {
      early:  meanOf(earlyRows,  'hotDays'),
      late:   meanOf(lateRows,   'hotDays'),
      recent: meanOf(recentRows, 'hotDays'),
    },
  };

  // Geology summary string from lithology + period + age
  const g = payload.geology || {};
  if (g.lithology || g.period) {
    const bits = [g.lithology, g.period && !g.age ? g.period : null, g.age].filter(Boolean);
    payload.geology.summary = bits.join(' — ');
  }

  // Render the Top species cards (8 cells) if iNat data is available
  const top10 = Array.isArray(payload.species && payload.species.top10) ? payload.species.top10 : [];
  if (top10.length) {
    const iucnColors = {
      LC: '#5a7256', NT: '#7a9a6e', VU: '#c9a14a',
      EN: '#b85a3a', CR: '#7a2a14', DD: '#888', EW: '#7a2a14', EX: '#000',
    };
    const grid = document.querySelector('.ed-species-grid');
    if (grid) {
      grid.innerHTML = top10.slice(0, 8).map(sp => {
        const iucn = sp.iucn || null;
        const badgeBg = iucn ? (iucnColors[iucn] || '#888') : null;
        const badge = iucn
          ? `<span class="ed-species-iucn" style="background:${badgeBg}">${iucn}</span>`
          : (sp.threatened ? `<span class="ed-species-iucn" style="background:#c9a14a">VU?</span>` : '');
        return `
          <div class="ed-species-card">
            <div class="ed-species-photo-wrap">
              ${sp.photoUrl
                ? `<img class="ed-species-photo" src="${sp.photoUrl}" alt="${sp.name || sp.scientificName || ''}" loading="lazy" />`
                : `<div class="ed-data-block"><div class="ed-data-block-tag">DATA?</div><div class="ed-data-block-src">iNaturalist photo CDN</div></div>`}
              ${badge}
            </div>
            <div class="ed-species-name">
              <strong>${sp.name || sp.scientificName || '—'}</strong>
              ${sp.scientificName && sp.name && sp.scientificName !== sp.name
                ? `<em>${sp.scientificName}</em>` : ''}
              <span class="ed-species-count">${sp.count} obs</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const walk = (obj, path) => path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj);
  const fmt = (raw, fmtKey, unit) => {
    if (raw == null || raw === '') return null;
    if (fmtKey === 'str') return String(raw) + (unit || '');
    const n = Number(raw);
    if (!Number.isFinite(n)) return String(raw);
    let s;
    if (fmtKey === 'int')        s = Math.round(n).toLocaleString();
    else if (fmtKey === '1f')    s = n.toFixed(1);
    else if (fmtKey === '2f')    s = n.toFixed(2);
    else if (fmtKey === 'signedPct') s = (n > 0 ? '+' : '') + Math.round(n) + '%';
    else if (fmtKey === 'distanceM') s = n >= 1000 ? '<' + (n / 1000).toFixed(1) + ' km' : '<' + Math.round(n) + ' m';
    else if (fmtKey === 'absM')      s = Math.abs(n).toFixed(1) + ' m';
    else                          s = String(n);
    return s + (unit || '');
  };

  let hydrated = 0;
  document.querySelectorAll('[data-cell]').forEach(el => {
    const path  = el.getAttribute('data-cell');
    const fkey  = el.getAttribute('data-fmt')  || '';
    const unit  = el.getAttribute('data-unit') || '';
    const value = walk(payload, path);

    // Custom renderers for shapes that don't reduce to a single string
    if (fkey === 'hydro') {
      if (value && (value.name || value.distanceM != null)) {
        const km = value.distanceM != null ? (value.distanceM / 1000).toFixed(1) + ' km' : '—';
        el.innerHTML = `
          <span>${el.querySelector('span')?.textContent || ''}</span>
          <div class="ed-hydro-named">
            <strong>${value.name || '—'}</strong>
            <span class="ed-hydro-km">${km}</span>
          </div>`;
        hydrated += 1;
      }
      return;
    }
    if (fkey === 'riskLevel') {
      if (typeof value === 'string' && value) {
        el.textContent = value;
        const slug = value.toLowerCase().replace(/[^a-z]+/g, '-');
        el.classList.remove('ed-data');
        el.classList.add('ed-data-real', `ed-risk-label--${slug}`);
        hydrated += 1;
      }
      return;
    }

    const text = fmt(value, fkey, unit);
    if (text != null) {
      el.textContent = text;
      el.classList.remove('ed-data');
      el.classList.add('ed-data-real');
      hydrated += 1;
    }
  });

  // Climate trajectory sparklines + colored Δ chips
  document.querySelectorAll('.ed-traj-row').forEach(row => {
    const metric    = row.getAttribute('data-metric');
    const deltaMode = row.getAttribute('data-delta-mode');
    const betterDir = Number(row.getAttribute('data-better-dir')) || -1;
    const color     = row.getAttribute('data-color') || '#1B3A2F';
    const bin = payload.trajectory && payload.trajectory[metric];
    if (!bin || bin.early == null || bin.late == null || bin.recent == null) return;

    const vals = [bin.early, bin.late, bin.recent];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = (max - min) || Math.abs(min) || 1;
    const yFor = v => 80 - ((v - min) / range) * 60;
    const xs = [50/3, 50, 250/3];           // 16.7, 50, 83.3 — column centres
    const svg = row.querySelector('.ed-traj-spark');
    if (svg) {
      const poly = `<polyline fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"
        points="${xs.map((x,i) => `${x},${yFor(vals[i])}`).join(' ')}" />`;
      const dots = xs.map((x,i) =>
        `<circle cx="${x}" cy="${yFor(vals[i])}" r="2.5" fill="${color}" />`
      ).join('');
      svg.innerHTML = poly + dots;
    }

    const delta = row.querySelector('.ed-traj-delta');
    if (delta) {
      let txt, dir;
      if (deltaMode === 'pct') {
        const pct = bin.early !== 0 ? Math.round((bin.recent - bin.early) / bin.early * 100) : 0;
        dir = Math.sign(pct);
        txt = (pct > 0 ? '+' : '') + pct + '%';
      } else { // absC
        const dC = +(bin.recent - bin.early).toFixed(1);
        dir = Math.sign(dC);
        txt = (dC > 0 ? '+' : '') + dC + '°C';
      }
      const cls = dir === 0 ? 'similar'
                : dir === betterDir ? 'better' : 'worse';
      delta.innerHTML = `<span class="ed-traj-delta-chip ed-traj-delta-chip--${cls}">${txt}</span>`;
    }
  });

  // Monthly normals: bars (precip) + line (temp)
  (() => {
    const svg = document.getElementById('ed-monthly-chart');
    if (!svg) return;
    const climate = payload.climate || {};
    const precip  = Array.isArray(climate.monthlyPrecip)  ? climate.monthlyPrecip  : [];
    const hi      = Array.isArray(climate.monthlyAvgHigh) ? climate.monthlyAvgHigh : [];
    const lo      = Array.isArray(climate.monthlyAvgLow)  ? climate.monthlyAvgLow  : [];
    if (precip.length !== 12 || hi.length !== 12 || lo.length !== 12) return;
    const tempMean = hi.map((h, i) => (h + lo[i]) / 2);

    const W = 360, H = 140, PAD = 20;
    const innerW = W - PAD * 2;
    const innerH = H - PAD;
    const slot = innerW / 12;
    const pMax = Math.max(1, ...precip);
    const tMin = Math.min(...tempMean);
    const tMax = Math.max(...tempMean);
    const tRange = (tMax - tMin) || 1;

    const bars = precip.map((p, i) => {
      const h = (p / pMax) * (innerH - 10);
      const x = PAD + slot * i + slot * 0.15;
      const w = slot * 0.7;
      return `<rect x="${x.toFixed(1)}" y="${(innerH - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#8b9a7e" />`;
    }).join('');
    const linePts = tempMean.map((t, i) => {
      const x = PAD + slot * i + slot / 2;
      const y = innerH - ((t - tMin) / tRange) * (innerH - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const dots = tempMean.map((t, i) => {
      const x = PAD + slot * i + slot / 2;
      const y = innerH - ((t - tMin) / tRange) * (innerH - 20) - 10;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="#b85a3a" />`;
    }).join('');
    svg.innerHTML = `
      ${bars}
      <polyline fill="none" stroke="#b85a3a" stroke-width="1.5" points="${linePts}" />
      ${dots}
      <text x="${PAD - 4}" y="${PAD - 4}" font-size="9" fill="#888" text-anchor="end">mm</text>
      <text x="${W - PAD + 4}" y="${PAD - 4}" font-size="9" fill="#888">°C</text>
    `;
    hydrated += 1;
  })();

  // Land cover time series — stacked bars, one per year (2017→)
  (() => {
    const svg = document.getElementById('ed-landcover-chart');
    const legend = document.getElementById('ed-landcover-legend');
    if (!svg) return;
    const years = Array.isArray(payload.agriculture && payload.agriculture.landCoverTimeSeries)
      ? payload.agriculture.landCoverTimeSeries : null;
    if (!years || !years.length) return;

    const COLORS = {
      'Trees':              '#3d6b48',
      'Rangeland':          '#c9c08a',
      'Crops':              '#d4a574',
      'Built Area':         '#9d6360',
      'Water':              '#3d6b8c',
      'Flooded Vegetation': '#7a9a6e',
      'Bare Ground':        '#a89580',
      'Snow/Ice':           '#e8e8e8',
      'Clouds':             '#cccccc',
    };
    const ORDER = ['Trees','Rangeland','Crops','Built Area','Water',
                   'Flooded Vegetation','Bare Ground','Snow/Ice','Clouds'];

    const W = 360, H = 160, PAD = 22;
    const innerW = W - PAD * 2;
    const innerH = H - PAD - 14; // leave 14 for x-axis labels
    const slot = innerW / years.length;
    const barW = Math.min(slot * 0.75, 28);

    const bars = years.map((y, i) => {
      const x = PAD + slot * i + (slot - barW) / 2;
      let cumPct = 0;
      const segs = ORDER.map(label => {
        const pct = y.classes?.[label] || 0;
        if (pct <= 0) return '';
        const h = (pct / 100) * innerH;
        const yPos = PAD + innerH - cumPct - h;
        cumPct += h;
        return `<rect x="${x.toFixed(1)}" y="${yPos.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${COLORS[label] || '#888'}"><title>${label}: ${pct}%</title></rect>`;
      }).join('');
      const labelY = H - 2;
      const labelX = PAD + slot * i + slot / 2;
      return segs + `<text x="${labelX.toFixed(1)}" y="${labelY}" font-size="9" fill="#888" text-anchor="middle">${y.year}</text>`;
    }).join('');

    svg.innerHTML = bars;

    if (legend) {
      // Show classes that appear with >1% in any year, sorted by latest-year share
      const latest = years[years.length - 1].classes || {};
      const visible = ORDER.filter(l => years.some(y => (y.classes?.[l] || 0) > 1));
      visible.sort((a, b) => (latest[b] || 0) - (latest[a] || 0));
      legend.innerHTML = visible.map(l => {
        const pct = latest[l] != null ? `${latest[l]}%` : '';
        return `<span><i style="background:${COLORS[l] || '#888'}"></i>${l} <em>${pct}</em></span>`;
      }).join('');
    }
    hydrated += 1;
  })();

  // Flood overlay labels (drop + callout copy) — driven by |HAND|
  (() => {
    const hand = payload.flood && typeof payload.flood.hand === 'number' ? payload.flood.hand : null;
    if (hand == null) return;
    const abs = Math.abs(hand);
    const drop = document.getElementById('ed-flood-drop');
    const callout = document.getElementById('ed-flood-callout');
    if (drop) {
      drop.querySelector('.ed-flood-overlay-val').textContent = abs.toFixed(1) + ' m';
    }
    if (callout) {
      const name = (payload.flood.drainageName || 'nearest drainage channel').toString();
      callout.textContent = `The sample point is ${abs.toFixed(1)} m above ${name}.`;
      callout.classList.remove('ed-data');
      callout.classList.add('ed-data-real');
    }
    hydrated += 1;
  })();

  // Region overview map — stations from /api/regions/odemira/stations, with
  // a tickbox per source. Falls back silently when Mapbox or the endpoint
  // is unavailable.
  (async () => {
    const container = document.getElementById('ed-station-map');
    const togglesEl = document.getElementById('ed-station-toggles');
    if (!container || !togglesEl) return;
    let payloadStations;
    try {
      const res = await fetch('/api/regions/odemira/stations');
      if (!res.ok) return;
      payloadStations = await res.json();
      if (!payloadStations.ok || !Array.isArray(payloadStations.features)) return;
    } catch { return; }

    const features = payloadStations.features;
    if (!features.length) {
      togglesEl.innerHTML = '<span class="ed-station-toggles-empty">No stations catalogued yet — run scripts/odemira-stations-ingest.mjs.</span>';
      return;
    }

    const sourceMeta = {
      snirh_piezometria:    { color: '#3d6b8c', label: 'Piezometers (SNIRH)' },
      snirh_hidrometrica:   { color: '#1B3A2F', label: 'River gauges (SNIRH)' },
      snirh_nascentes:      { color: '#5a7256', label: 'Springs (SNIRH)' },
      snirh_qualidade_sub:  { color: '#8b4789', label: 'Groundwater quality (SNIRH)' },
      glofas_basin:         { color: '#d49a4a', label: 'GloFAS basin sample' },
      wiki_landmark:        { color: '#888888', label: 'Landmarks' },
    };

    // Group features by source so we can toggle layer-by-layer.
    const grouped = {};
    for (const f of features) {
      (grouped[f.source] = grouped[f.source] || []).push(f);
    }
    const sourcesPresent = Object.keys(grouped).sort((a, b) =>
      (grouped[b].length - grouped[a].length));

    // Build the toggle UI
    togglesEl.innerHTML = sourcesPresent.map(s => {
      const meta = sourceMeta[s] || { color: '#888', label: s };
      return `
        <label class="ed-station-toggle">
          <input type="checkbox" data-source="${s}" checked />
          <i class="ed-station-toggle-swatch" style="background:${meta.color}"></i>
          <span class="ed-station-toggle-label">${meta.label}</span>
          <span class="ed-station-toggle-count">${grouped[s].length}</span>
        </label>`;
    }).join('');

    // Initialise the map
    const map = createMap('ed-station-map', {
      center: [-8.6400, 37.5967],
      zoom: 9,
      scrollZoom: false,
    });

    // Markers, keyed by source so toggles can hide/show them
    const markersBySource = {};
    map.on('load', () => {
      for (const source of sourcesPresent) {
        const meta = sourceMeta[source] || { color: '#888', label: source };
        markersBySource[source] = [];
        for (const f of grouped[source]) {
          const el = document.createElement('div');
          el.className = 'ed-station-dot';
          el.style.background = meta.color;
          el.title = `${meta.label} · ${f.name}`;
          const m = new mapboxgl.Marker({ element: el })
            .setLngLat([f.lng, f.lat])
            .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(`
              <strong>${f.name || f.externalId}</strong><br/>
              <span style="color:#888">${meta.label}</span>
              ${f.parameters && f.parameters.length
                ? `<br/><small>${f.parameters.slice(0, 4).map(p => p.name).filter(Boolean).join(' · ')}</small>`
                : ''}
            `))
            .addTo(map);
          markersBySource[source].push(m);
        }
      }
    });

    // Wire toggles
    togglesEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const src = cb.getAttribute('data-source');
        const list = markersBySource[src] || [];
        for (const m of list) {
          const el = m.getElement();
          el.style.display = cb.checked ? '' : 'none';
        }
      });
    });

    hydrated += 1;
  })();

  // SNIRH panel — populate the four network cards from the stations catalog
  (async () => {
    const grid = document.getElementById('ed-snirh-grid');
    if (!grid) return;
    let stations;
    try {
      const res = await fetch('/api/regions/odemira/stations');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.features)) return;
      stations = data.features;
    } catch { return; }

    const NETWORKS = {
      snirh_piezometria:   { title: 'Piezometers',          subtitle: 'Groundwater level + depth to water', cadence: 'Monthly readings · up to 50-yr history' },
      snirh_hidrometrica:  { title: 'River gauges',         subtitle: 'In-situ river level / discharge',     cadence: 'Daily → monthly · multi-decade' },
      snirh_nascentes:     { title: 'Springs',              subtitle: 'Nascentes (spring outflows)',          cadence: 'Variable cadence · by station' },
      snirh_qualidade_sub: { title: 'Groundwater quality',  subtitle: 'Nitrates, conductivity, pH, …',        cadence: 'Monthly → quarterly campaigns' },
    };

    grid.querySelectorAll('.ed-snirh-card').forEach(card => {
      const source = card.getAttribute('data-source');
      const meta = NETWORKS[source];
      if (!meta) return;
      const list = stations.filter(s => s.source === source);

      // Dedup parameter names across all stations of this network
      const paramNames = new Set();
      for (const s of list) {
        for (const p of (s.parameters || [])) {
          if (p && p.name) paramNames.add(p.name);
        }
      }

      // Truncate station codes for display
      const codes = list.map(s => s.code || s.name).filter(Boolean).slice(0, 10);
      const overflow = Math.max(0, list.length - codes.length);

      card.querySelector('[data-snirh-title]').innerHTML = `
        <strong>${meta.title}</strong>
        <span class="ed-snirh-card-count">${list.length} station${list.length === 1 ? '' : 's'}</span>
      `;
      card.querySelector('[data-snirh-cadence]').textContent = meta.cadence;
      card.querySelector('[data-snirh-meta]').textContent = meta.subtitle;
      card.querySelector('[data-snirh-params]').innerHTML = paramNames.size
        ? `<span class="ed-snirh-card-pname">Measures</span> ${[...paramNames].map(n => `<em>${n}</em>`).join(' · ')}`
        : '';
      card.querySelector('[data-snirh-stations]').innerHTML = codes.length
        ? `<span class="ed-snirh-card-pname">Stations</span> ${codes.join(', ')}${overflow ? ` <span class="ed-snirh-card-overflow">+ ${overflow} more</span>` : ''}`
        : '<span class="ed-snirh-card-empty">No stations in Odemira bbox.</span>';
    });
    hydrated += 1;
  })();

  // Hydrology basemap
  (() => {
    const wrap = document.getElementById('ed-hydro-map');
    if (!wrap || !payload.hydroMap) return;
    wrap.innerHTML = `<img class="ed-hydro-img" src="${payload.hydroMap}" alt="Mapbox outdoors basemap centred on Odemira sample point with river network" loading="lazy" />`;
    hydrated += 1;
  })();

  // Fire map: drop in the Mapbox URL the API surfaces alongside the dashboard payload.
  (() => {
    const wrap = document.getElementById('ed-fire-img-wrap');
    if (!wrap) return;
    const url = payload.fireMap
      || (payload.maps && (payload.maps.regional || payload.maps.overview));
    if (!url) return;
    wrap.innerHTML = `
      <img class="ed-fire-img" src="${url}" alt="Static map of Odemira region with 50km reference ring" loading="lazy" />
      <div class="ed-fire-ring"></div>
      <div class="ed-fire-marker">${lucide('home', 18)}</div>
    `;
    hydrated += 1;
  })();

  // Drought monthly anomaly chart — needs climate.last12 vs climate.monthlyPrecip
  (() => {
    const svg = document.getElementById('ed-drought-chart');
    const summaryEl = document.getElementById('ed-drought-summary');
    if (!svg) return;
    const climate = payload.climate || {};
    const normals = Array.isArray(climate.monthlyPrecip) ? climate.monthlyPrecip : null;
    const last12 = Array.isArray(climate.last12MonthsPrecip) ? climate.last12MonthsPrecip : null;
    if (!normals || normals.length !== 12 || !last12 || last12.length !== 12) return;

    // last12 entries are { monthIndex: 0-11, total: mm } ordered Jan-Dec? Let the
    // pipeline send them already aligned to calendar months Jan→Dec.
    const anomalies = last12.map((m, i) => {
      const norm = normals[i] || 0;
      return m.total != null ? m.total - norm : null;
    });

    const W = 360, H = 140, PAD_X = 16, PAD_Y = 18;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2 - 14; // leave 14 for labels
    const slot = innerW / 12;
    const barW = slot * 0.55;
    const maxAbs = Math.max(1, ...anomalies.map(a => Math.abs(a || 0)));
    const zeroY = PAD_Y + innerH / 2;

    const bars = anomalies.map((a, i) => {
      const x = PAD_X + slot * i + (slot - barW) / 2;
      if (a == null) return '';
      const h = Math.abs(a) / maxAbs * (innerH / 2 - 2);
      const y = a >= 0 ? zeroY - h : zeroY;
      const fill = a >= 0 ? '#7a9ab5' : '#d49a4a';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"><title>${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}: ${a > 0 ? '+' : ''}${Math.round(a)} mm vs normal</title></rect>`;
    }).join('');

    const labels = ['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => {
      const x = PAD_X + slot * i + slot / 2;
      return `<text x="${x.toFixed(1)}" y="${H - 4}" font-size="10" fill="#666" text-anchor="middle">${m}</text>`;
    }).join('');

    svg.innerHTML = `
      <line x1="${PAD_X}" y1="${zeroY}" x2="${W - PAD_X}" y2="${zeroY}" stroke="#999" stroke-width="0.5"/>
      ${bars}
      ${labels}
    `;

    if (summaryEl) {
      const drier = anomalies.filter(a => a != null && a < -5).length;
      const wetter = anomalies.filter(a => a != null && a > 5).length;
      let summary;
      if (drier >= 6)      summary = 'A run of drier-than-normal months';
      else if (drier >= 3) summary = 'A few drier-than-normal months';
      else if (wetter >= 6) summary = 'A run of wetter-than-normal months';
      else if (wetter >= 3) summary = 'A few wetter-than-normal months';
      else                 summary = 'Close to typical year';
      summaryEl.textContent = summary;
      summaryEl.classList.remove('ed-data');
      summaryEl.classList.add('ed-data-real');
    }
    hydrated += 1;
  })();

  // Water balance area chart — annual P − ET₀ across the archive
  (() => {
    const svg = document.getElementById('ed-wb-chart');
    const yearsEl = document.getElementById('ed-wb-years');
    if (!svg) return;
    const yearly = Array.isArray(payload.trends && payload.trends.yearly) ? payload.trends.yearly : [];
    const rows = yearly.filter(r => r && typeof r.waterBalance === 'number');
    if (!rows.length) return;

    const W = 700, H = 180, PAD_X = 24, PAD_Y = 12;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;
    const xs = rows.map((_, i) => PAD_X + (i / Math.max(1, rows.length - 1)) * innerW);
    const ys = rows.map(r => r.waterBalance);
    const maxAbs = Math.max(50, ...ys.map(v => Math.abs(v)));
    const zeroY = PAD_Y + innerH / 2;
    const yFor = v => zeroY - (v / maxAbs) * (innerH / 2);

    // Build two filled paths — one for the positive (surplus) lobes
    // clipped to y ≤ zeroY, one for the negative (deficit) lobes clipped
    // to y ≥ zeroY. SVG masks the "wrong" side by setting that path's
    // value to zero in the band.
    const buildArea = (color, side /* +1 surplus, -1 deficit */) => {
      const pts = [];
      pts.push(`${xs[0].toFixed(1)},${zeroY.toFixed(1)}`);
      rows.forEach((r, i) => {
        const v = r.waterBalance;
        const clip = side > 0 ? Math.max(0, v) : Math.min(0, v);
        pts.push(`${xs[i].toFixed(1)},${yFor(clip).toFixed(1)}`);
      });
      pts.push(`${xs[xs.length - 1].toFixed(1)},${zeroY.toFixed(1)}`);
      return `<polygon fill="${color}" fill-opacity="0.85" stroke="none" points="${pts.join(' ')}" />`;
    };
    const linePts = rows.map((r, i) => `${xs[i].toFixed(1)},${yFor(r.waterBalance).toFixed(1)}`).join(' ');

    // Y-axis labels: +maxAbs, 0, −maxAbs
    const yLabel = (v, y) => `<text x="${PAD_X - 4}" y="${y.toFixed(1)}" font-size="9" fill="#888" text-anchor="end">${v > 0 ? '+' : ''}${Math.round(v)}</text>`;

    svg.innerHTML = `
      <line x1="${PAD_X}" y1="${zeroY}" x2="${W - PAD_X}" y2="${zeroY}" stroke="#999" stroke-width="0.5"/>
      ${buildArea('#7a9ab5', +1)}
      ${buildArea('#d49a4a', -1)}
      <polyline fill="none" stroke="#5a7256" stroke-width="1.2" points="${linePts}" />
      ${yLabel(+Math.round(maxAbs), PAD_Y + 4)}
      ${yLabel(0, zeroY)}
      ${yLabel(-Math.round(maxAbs), H - PAD_Y - 4)}
    `;

    // Decade year labels
    if (yearsEl) {
      const first = rows[0].year;
      const last  = rows[rows.length - 1].year;
      const ticks = [];
      for (let y = Math.ceil(first / 10) * 10; y <= last; y += 10) ticks.push(y);
      if (ticks[0] !== first) ticks.unshift(first);
      if (ticks[ticks.length - 1] !== last) ticks.push(last);
      yearsEl.innerHTML = ticks.map(y => `<span>${y}</span>`).join('');
    }
    hydrated += 1;
  })();

  // Biodiversity: species observations across 13 rolling 5-yr windows
  (() => {
    const svg = document.getElementById('ed-bio-trend');
    const yearsEl = document.getElementById('ed-bio-years');
    if (!svg) return;
    const wins = payload.species && payload.species.trends && Array.isArray(payload.species.trends.windows)
      ? payload.species.trends.windows : null;
    if (!wins || !wins.length) return;
    const vals = wins.map(w => (typeof w.count === 'number' ? w.count : null));
    if (vals.every(v => v == null)) return;

    const W = 400, H = 180, PAD_X = 28, PAD_Y = 12;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2 - 4;
    const n = wins.length;
    const maxV = Math.max(...vals.filter(v => v != null));
    const xFor = i => PAD_X + (i / Math.max(1, n - 1)) * innerW;
    const yFor = v => v == null ? null : PAD_Y + innerH - (v / maxV) * innerH;

    // Area under the line
    const linePts = vals.map((v, i) => v == null ? null : `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).filter(Boolean);
    const areaPts = [`${xFor(0).toFixed(1)},${PAD_Y + innerH}`, ...linePts, `${xFor(n - 1).toFixed(1)},${PAD_Y + innerH}`];
    const dots = vals.map((v, i) => v == null
      ? ''
      : `<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="2.5" fill="#3d6b48"><title>${wins[i].label}: ${v} taxa</title></circle>`).join('');

    svg.innerHTML = `
      <polygon fill="#3d6b48" fill-opacity="0.18" stroke="none" points="${areaPts.join(' ')}" />
      <polyline fill="none" stroke="#3d6b48" stroke-width="1.5" points="${linePts.join(' ')}" />
      ${dots}
      <text x="${PAD_X - 4}" y="${(PAD_Y + 4).toFixed(1)}" font-size="9" fill="#888" text-anchor="end">${maxV}</text>
      <text x="${PAD_X - 4}" y="${(PAD_Y + innerH).toFixed(1)}" font-size="9" fill="#888" text-anchor="end">0</text>
    `;

    if (yearsEl) {
      // Show first / mid / last labels
      const firstY = wins[0].label.split('-')[0];
      const midI   = Math.floor(n / 2);
      const midY   = wins[midI].label.split('-')[0];
      const lastY  = wins[n - 1].label.split('-')[1] || wins[n - 1].label.split('-')[0];
      yearsEl.innerHTML = `<span>${firstY}</span><span>${midY}</span><span>${lastY}</span>`;
    }
    hydrated += 1;
  })();

  // SPI-12 ribbon — one colored stripe per month across the full archive
  (() => {
    const svg = document.getElementById('ed-spi-ribbon');
    const yearsEl = document.getElementById('ed-spi-years');
    const rangeEl = document.getElementById('ed-spi-range');
    if (!svg) return;
    const series = Array.isArray(payload.climate && payload.climate.spi12Series)
      ? payload.climate.spi12Series : null;
    if (!series || !series.length) return;

    // Same color stops as the legend chips: dark-green wet → dark-red drought.
    const colorFor = spi => {
      if (spi == null) return '#eee';
      if (spi >= 2)    return '#3d6b48';
      if (spi >= 1)    return '#7a9a6e';
      if (spi >  -1)   return '#d6c89c';
      if (spi >  -2)   return '#b85a3a';
      return '#7a2a14';
    };

    const W = 1000, H = 32;
    const n = series.length;
    const stripeW = W / n;
    const stripes = series.map((m, i) => {
      const x = (i * stripeW).toFixed(2);
      return `<rect x="${x}" y="0" width="${(stripeW + 0.3).toFixed(2)}" height="${H}" fill="${colorFor(m.spi)}"><title>${m.date}: SPI ${m.spi == null ? '—' : (m.spi > 0 ? '+' : '') + m.spi}</title></rect>`;
    }).join('');
    svg.innerHTML = stripes;

    // Decade year ticks aligned to the actual data span
    if (yearsEl) {
      const first = Number(series[0].date.substring(0, 4));
      const last  = Number(series[series.length - 1].date.substring(0, 4));
      const step  = (last - first) > 60 ? 20 : 10;
      const ticks = [];
      for (let y = Math.ceil(first / step) * step; y <= last; y += step) ticks.push(y);
      if (ticks[0] !== first) ticks.unshift(first);
      if (ticks[ticks.length - 1] !== last) ticks.push(last);
      yearsEl.innerHTML = ticks.map(y => `<span>${y}</span>`).join('');
      if (rangeEl) rangeEl.textContent = `(drought index, ${first}–${last})`;
    }
    hydrated += 1;
  })();

  console.log(`[dashboard] hydrated ${hydrated} cell${hydrated === 1 ? '' : 's'} from /api/regions/odemira (runId ${payload.runId})`);
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

        ${sectionId === 'dashboard' ? '' : `
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
        `}

        <!-- Dashboard Panel (auto-generated from section.visuals) -->
        <div class="wiki-dashboard" id="wiki-dashboard"></div>

        ${sectionId === 'dashboard' ? renderEnvironmentalDashboard() : ''}

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

        ${sectionId === 'dashboard' ? '' : `
        <!-- Community Contributions -->
        <section class="wiki-contributions" id="wiki-contributions">
          <div class="wiki-contributions-header">
            <h2>${t('wiki.section.communityContributions')}</h2>
          </div>
          <div class="wiki-contributions-list" id="contributions-list">
            <div class="loading-block"><span class="loading-spinner"></span> ${t('wiki.section.loadingContributions')}</div>
          </div>
        </section>
        `}

        ${['water', 'climate', 'landuse', 'community'].includes(sectionId) ? `
        <!-- Live Data -->
        <section class="wiki-data-section" id="wiki-data-section">
          <button class="wiki-data-toggle" id="wiki-data-toggle" style="display:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
             ${t('wiki.section.refreshLiveData')}
          </button>
          <div id="wiki-data-content"></div>
        </section>
        ` : ''}

      </div>

      <!-- Right column: Community Notes sidebar (hidden on dashboard tab) -->
      ${sectionId === 'dashboard' ? '' : `
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
          </div>
          <div class="wiki-resources-list" id="wiki-resources-list">
            <span class="wiki-resources-placeholder">Loading...</span>
          </div>
        </div>
      </aside>
      `}
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

    <!-- Contribution modal (hidden) -->
    <div class="wiki-inline-contrib-overlay" id="wiki-contrib-modal-overlay" style="display:none;">
      <div class="wiki-inline-contrib-modal">
        <div class="wiki-inline-contrib-header">
          <h3>${t('wiki.sidebar.addContribution')}</h3>
          <button class="wiki-inline-contrib-close" id="wiki-contrib-modal-close">&times;</button>
        </div>
        <div class="wiki-inline-contrib-body">
          <div class="wiki-contrib-type-pills" id="wiki-contrib-type-pills">
            <button class="wiki-contrib-type-pill" data-type="file">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              File
            </button>
            <button class="wiki-contrib-type-pill active" data-type="tip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m6.34 6.34 2.83 2.83"/><path d="M2 12h4"/><path d="m17.66 6.34-2.83 2.83"/><path d="M22 12h-4"/><circle cx="12" cy="17" r="5"/></svg>
              Tip
            </button>
            <button class="wiki-contrib-type-pill" data-type="event">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Event
            </button>
            <button class="wiki-contrib-type-pill" data-type="place">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              Place
            </button>
            <button class="wiki-contrib-type-pill" data-type="resource">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Link
            </button>
          </div>
          <!-- File upload area (shown when "File" type is selected) -->
          <div class="wiki-contrib-file-input" id="wiki-contrib-file-input" style="display:none;">
            <div class="wiki-upload-dropzone" id="wiki-contrib-dropzone">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p>Drag and drop a file, or <span class="wiki-upload-browse">browse</span></p>
              <p class="wiki-upload-hint">PDF, PNG, JPG, WEBP — max 5 MB</p>
              <input type="file" id="wiki-contrib-file" accept=".pdf,.png,.jpg,.jpeg,.webp" style="display:none;" />
            </div>
            <div class="wiki-upload-file-preview" id="wiki-contrib-file-preview" style="display:none;"></div>
          </div>
          <!-- Link input (shown when "Link" type is selected) -->
          <div class="wiki-contrib-link-input" id="wiki-contrib-link-input" style="display:none;">
            <input type="url" id="wiki-contrib-modal-url" placeholder="Paste a URL\u2026" />
            <div class="wiki-contrib-link-preview" id="wiki-contrib-link-preview"></div>
          </div>
          <input type="text" id="wiki-contrib-modal-title" placeholder="${t('wiki.section.title')}" />
          <textarea id="wiki-contrib-modal-text" rows="4" placeholder="Share what you know\u2026"></textarea>
          <input type="text" id="wiki-contrib-modal-author" placeholder="${t('wiki.section.yourName')} (optional)" />
        </div>
        <div class="wiki-inline-contrib-footer">
          <button class="wiki-inline-contrib-cancel" id="wiki-contrib-modal-cancel">${t('wiki.section.cancel')}</button>
          <button class="wiki-inline-contrib-submit" id="wiki-contrib-modal-submit">${t('wiki.section.submit')}</button>
        </div>
      </div>
    </div>

    <!-- Resource upload modal (hidden) -->
    ${section.references && section.references.length ? `
    <!-- References — full width at very bottom -->
    <section class="wiki-references">
      <h2 class="wiki-references-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        ${t('wiki.section.references') || 'References'}
      </h2>
      <ol class="wiki-references-list">
        ${section.references.map(r => `
          <li class="wiki-reference-item" value="${r.id}">
            <a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a>
          </li>
        `).join('')}
      </ol>
    </section>
    ` : ''}
  `;

  // Initialise map, contributions, sidebar, and toolbar after DOM insertion
  setTimeout(async () => {
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
    initTextSelectionToolbar(sectionId);
    initContribViewerClicks(sectionId);
    initSidebarActions(sectionId);

    // For the risks section, fetch live scores and patch visuals before rendering
    if (sectionId === 'risks') {
      try {
        const scores = await fetchRiskScores(ODEMIRA.center[0], ODEMIRA.center[1]);
        const v = section.visuals;
        // Patch radar chart data (keep erosion static)
        if (v.charts?.[0]?.data) {
          v.charts[0].data.forEach(d => {
            if (d.axis === 'Fire') d.value = scores.fire;
            else if (d.axis === 'Drought') d.value = scores.drought;
            else if (d.axis === 'Flood') d.value = scores.flood;
          });
        }
        // Patch alert rows (keep erosion static)
        if (v.alertRows) {
          v.alertRows.forEach(r => {
            if (r.label === 'Fire Risk') {
              const c = scoreToColors(scores.fire);
              Object.assign(r, { value: scores.fireLabel, score: `${scores.fire}/100`, ...c });
            } else if (r.label === 'Drought Risk') {
              const c = scoreToColors(scores.drought);
              Object.assign(r, { value: scores.droughtLabel, score: `${scores.drought}/100`, ...c });
            } else if (r.label === 'Flood Risk') {
              const c = scoreToColors(scores.flood);
              Object.assign(r, { value: scores.floodLabel, score: `${scores.flood}/100`, ...c });
            }
          });
        }
        // Patch stat cards
        if (v.stats) {
          v.stats.forEach(s => {
            if (s.label === 'Fire Risk') {
              s.value = scores.fireLabel;
              s.color = scoreToColors(scores.fire).textColor;
            } else if (s.label === 'Water Scarcity') {
              s.value = scores.droughtLabel;
              s.color = scoreToColors(scores.drought).textColor;
            }
          });
        }
      } catch (e) {
        console.warn('Live risk scores unavailable, using static values:', e);
      }
    }

    // Render dashboard visuals (if section has them)
    renderDashboard(section);

    // Environmental dashboard hydration — fetch real data from the regional facts endpoint
    if (sectionId === 'dashboard') {
      hydrateEnvironmentalDashboard();
    }
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

  addLandmarkMarkers(map, getLandmarks());
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

  addLandmarkMarkers(map, getLandmarks().filter(l => ['town', 'village', 'community', 'vila', 'aldeia', 'comunidade'].includes(l.type)));
}

async function initCommunityMap(map) {
  addLandmarkMarkers(map, getLandmarks());
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
      case 'water': await loadWaterData(container); break;
      case 'climate': await loadWeatherData(container); break;
      case 'landuse': loadAgricultureData(container); break;
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
          ${getLandmarks().map(lm =>
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
            ${getEventsCalendar().map(e => `
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
  file: { label: 'File', color: '#6B7280' },
  tip: { label: 'Tip', color: '#2E8B57' },
  event: { label: 'Event', color: '#E8A317' },
  place: { label: 'Place', color: '#2B7BB9' },
  resource: { label: 'Link', color: '#4A708B' },
  story: { label: 'Story', color: '#8B4789' }, // legacy
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
      openViewer('edit,flag,story,tip,event,place,resource', 'Suggestions');
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

      <h4>How Contributions Work</h4>
      <p>Contributions are published immediately and visible to all visitors. The editorial team may edit or remove submissions that do not meet community standards.</p>

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
            '<p style="font-size:13px;color:#666;">Your ' + currentAction + ' has been added.</p>' +
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

  // "Add a Contribution" opens the contribution modal
  if (addContribBtn) {
    addContribBtn.addEventListener('click', () => {
      openContribModal(sectionId);
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

function initContribTypePills(container) {
  const pills = container.querySelectorAll('.wiki-contrib-type-pill');
  const linkInput = container.querySelector('#wiki-contrib-link-input');
  const fileInput = container.querySelector('#wiki-contrib-file-input');
  const textArea = container.querySelector('#wiki-contrib-modal-text');
  const titleInput = container.querySelector('#wiki-contrib-modal-title');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const type = pill.dataset.type;
      // Show/hide link input
      if (linkInput) linkInput.style.display = type === 'resource' ? '' : 'none';
      // Show/hide file dropzone
      if (fileInput) fileInput.style.display = type === 'file' ? '' : 'none';
      // Hide text area for file type, show for others
      if (textArea) textArea.style.display = type === 'file' ? 'none' : '';
      if (titleInput) titleInput.style.display = (type === 'file' || type === 'resource') ? 'none' : '';
    });
  });

  // Wire up file dropzone inside contribution modal
  initContribFileUpload(container);

  // URL preview on paste/input
  const urlInput = container.querySelector('#wiki-contrib-modal-url');
  const previewEl = container.querySelector('#wiki-contrib-link-preview');
  if (urlInput && previewEl) {
    let debounceTimer = null;
    urlInput.addEventListener('input', () => {
      urlInput.style.borderColor = '';
      clearTimeout(debounceTimer);
      const url = urlInput.value.trim();
      if (!url) { previewEl.innerHTML = ''; return; }
      debounceTimer = setTimeout(() => fetchLinkPreview(url, previewEl), 500);
    });
  }
}

let _contribSelectedFile = null;

function initContribFileUpload(container) {
  const dropzone = container.querySelector('#wiki-contrib-dropzone');
  const fileEl = container.querySelector('#wiki-contrib-file');
  const previewEl = container.querySelector('#wiki-contrib-file-preview');
  if (!dropzone || !fileEl) return;

  const browse = dropzone.querySelector('.wiki-upload-browse');
  if (browse) browse.addEventListener('click', () => fileEl.click());
  dropzone.addEventListener('click', (e) => { if (e.target === dropzone || e.target.closest('p')) fileEl.click(); });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleContribFile(e.dataTransfer.files[0], dropzone, previewEl);
  });

  fileEl.addEventListener('change', () => {
    if (fileEl.files.length) handleContribFile(fileEl.files[0], dropzone, previewEl);
  });
}

function handleContribFile(file, dropzone, previewEl) {
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) { alert('File too large. Max 5 MB.'); return; }
  _contribSelectedFile = file;
  if (dropzone) dropzone.style.display = 'none';
  if (previewEl) {
    previewEl.style.display = '';
    previewEl.innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--card-border);border-radius:var(--radius);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:500;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div>
        <div style="font-size:12px;color:var(--muted);">${(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button type="button" class="wiki-contrib-file-remove" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--muted);">&times;</button>
    </div>`;
    previewEl.querySelector('.wiki-contrib-file-remove').addEventListener('click', () => {
      _contribSelectedFile = null;
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
      if (dropzone) dropzone.style.display = '';
    });
  }
}

async function fetchLinkPreview(url, previewEl) {
  // Validate URL
  try { new URL(url); } catch { previewEl.innerHTML = ''; return; }

  previewEl.innerHTML = '<div class="wiki-link-preview-loading"><span class="loading-spinner"></span></div>';

  // Check for embeddable URLs (YouTube, Vimeo)
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    previewEl.innerHTML = `<div class="wiki-link-embed"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
    return;
  }
  if (vimeoMatch) {
    previewEl.innerHTML = `<div class="wiki-link-embed"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
    return;
  }

  // For other URLs, show a thumbnail card using the favicon + domain
  try {
    const domain = new URL(url).hostname;
    previewEl.innerHTML = `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="wiki-link-preview-card">
        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="" class="wiki-link-preview-favicon" />
        <div class="wiki-link-preview-info">
          <span class="wiki-link-preview-domain">${domain}</span>
          <span class="wiki-link-preview-url">${url.length > 60 ? url.slice(0, 60) + '…' : url}</span>
        </div>
      </a>
    `;
  } catch {
    previewEl.innerHTML = '';
  }
}

function openContribModal(sectionId) {
  const overlay = document.getElementById('wiki-contrib-modal-overlay');
  const closeBtn = document.getElementById('wiki-contrib-modal-close');
  const cancelBtn = document.getElementById('wiki-contrib-modal-cancel');
  const submitBtn = document.getElementById('wiki-contrib-modal-submit');
  const titleEl = document.getElementById('wiki-contrib-modal-title');
  const textEl = document.getElementById('wiki-contrib-modal-text');
  const authorEl = document.getElementById('wiki-contrib-modal-author');

  if (!overlay) return;

  // Reset form
  if (titleEl) titleEl.value = '';
  if (textEl) { textEl.value = ''; textEl.style.borderColor = ''; }
  if (authorEl) authorEl.value = '';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = t('wiki.section.submit'); }

  // Reset type pills to 'tip'
  const pills = overlay.querySelectorAll('.wiki-contrib-type-pill');
  pills.forEach(p => p.classList.toggle('active', p.dataset.type === 'tip'));
  const linkInput = document.getElementById('wiki-contrib-link-input');
  if (linkInput) linkInput.style.display = 'none';
  const fileInputArea = document.getElementById('wiki-contrib-file-input');
  if (fileInputArea) fileInputArea.style.display = 'none';
  const contribDropzone = document.getElementById('wiki-contrib-dropzone');
  if (contribDropzone) contribDropzone.style.display = '';
  const contribFilePreview = document.getElementById('wiki-contrib-file-preview');
  if (contribFilePreview) { contribFilePreview.style.display = 'none'; contribFilePreview.innerHTML = ''; }
  _contribSelectedFile = null;
  const urlEl = document.getElementById('wiki-contrib-modal-url');
  if (urlEl) urlEl.value = '';
  const previewEl = document.getElementById('wiki-contrib-link-preview');
  if (previewEl) previewEl.innerHTML = '';
  // Show text fields (hidden for file type)
  if (textEl) textEl.style.display = '';
  if (titleEl) titleEl.style.display = '';

  // Restore body content if it was replaced by success message
  const modalBody = overlay.querySelector('.wiki-inline-contrib-body');
  if (modalBody && !modalBody.querySelector('.wiki-contrib-type-pills')) {
    // Reload the page to reset the modal properly
    location.reload();
    return;
  }

  // Wire up pill type selection
  initContribTypePills(overlay);

  overlay.style.display = 'flex';
  if (titleEl) titleEl.focus();

  function closeModal() {
    overlay.style.display = 'none';
  }

  // Close handlers (use { once: true } pattern via cloning to avoid stacking)
  const newCloseBtn = closeBtn?.cloneNode(true);
  if (closeBtn && newCloseBtn) { closeBtn.replaceWith(newCloseBtn); newCloseBtn.addEventListener('click', closeModal); }
  const newCancelBtn = cancelBtn?.cloneNode(true);
  if (cancelBtn && newCancelBtn) { cancelBtn.replaceWith(newCancelBtn); newCancelBtn.addEventListener('click', closeModal); }

  // Click overlay backdrop to close
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

  // Submit handler
  const newSubmitBtn = submitBtn?.cloneNode(true);
  if (submitBtn && newSubmitBtn) {
    submitBtn.replaceWith(newSubmitBtn);
    newSubmitBtn.addEventListener('click', async () => {
      const activePill = overlay.querySelector('.wiki-contrib-type-pill.active');
      const selectedType = activePill ? activePill.dataset.type : 'tip';
      const tiEl = document.getElementById('wiki-contrib-modal-title');
      const txEl = document.getElementById('wiki-contrib-modal-text');
      const auEl = document.getElementById('wiki-contrib-modal-author');
      const urlEl = document.getElementById('wiki-contrib-modal-url');

      const contentVal = txEl ? txEl.value.trim() : '';
      const urlVal = urlEl ? urlEl.value.trim() : '';

      // File type: upload via FormData to /api/wiki/resources
      if (selectedType === 'file') {
        if (!_contribSelectedFile) { alert('Please select a file.'); return; }
        newSubmitBtn.disabled = true;
        newSubmitBtn.textContent = 'Uploading\u2026';
        try {
          const fd = new FormData();
          fd.append('file', _contribSelectedFile);
          fd.append('section', sectionId);
          fd.append('title', tiEl ? tiEl.value.trim() : '');
          fd.append('description', '');
          fd.append('author', auEl ? auEl.value.trim() || 'Anonymous' : 'Anonymous');
          const res = await fetch('/api/wiki/resources', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Upload failed');
          const body = overlay.querySelector('.wiki-inline-contrib-body');
          if (body) {
            body.innerHTML = '<div style="text-align:center;padding:1.5rem 0;">' +
              '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
              '<p style="margin-top:12px;font-weight:600;color:#2E8B57;">File uploaded successfully!</p></div>';
          }
          _contribSelectedFile = null;
          setTimeout(closeModal, 2500);
          _statsCache = null;
          loadContributions(sectionId);
          loadRecentActivity(sectionId);
          refreshSidebarStats(sectionId);
          loadResources(sectionId);
        } catch (err) {
          newSubmitBtn.disabled = false;
          newSubmitBtn.textContent = t('wiki.section.submit');
          alert('Upload failed. Please try again.');
        }
        return;
      }

      // For resource type, require URL; for others require content
      if (selectedType === 'resource' && !urlVal) {
        if (urlEl) urlEl.style.borderColor = 'var(--coral, #e74c3c)';
        return;
      }
      if (selectedType !== 'resource' && !contentVal) {
        if (txEl) txEl.style.borderColor = 'var(--coral, #e74c3c)';
        return;
      }

      newSubmitBtn.disabled = true;
      newSubmitBtn.textContent = 'Submitting\u2026';

      try {
        const payload = {
          section: sectionId,
          type: selectedType,
          title: tiEl ? tiEl.value.trim() : '',
          content: contentVal,
          author: auEl ? auEl.value.trim() || 'Anonymous' : 'Anonymous',
        };
        if (urlVal) payload.url = urlVal;

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
        const body = overlay.querySelector('.wiki-inline-contrib-body');
        if (body) {
          body.innerHTML = '<div style="text-align:center;padding:1.5rem 0;">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
            '<p style="margin-top:12px;font-weight:600;color:#2E8B57;">Thank you for your contribution!</p>' +
            '<p style="font-size:13px;color:#666;">Your contribution has been added.</p>' +
            '</div>';
        }
        setTimeout(closeModal, 2500);

        // Refresh data
        _statsCache = null;
        loadContributions(sectionId);
        loadRecentActivity(sectionId);
        refreshSidebarStats(sectionId);
      } catch (err) {
        newSubmitBtn.disabled = false;
        newSubmitBtn.textContent = t('wiki.section.submit');
        const footer = overlay.querySelector('.wiki-inline-contrib-footer');
        if (footer) {
          footer.querySelector('.wiki-contrib-modal-error')?.remove();
          const errMsg = document.createElement('p');
          errMsg.className = 'wiki-contrib-modal-error';
          errMsg.style.cssText = 'color:var(--coral,#e74c3c);font-size:13px;margin:8px 0 0;';
          errMsg.textContent = 'Error: ' + err.message;
          footer.appendChild(errMsg);
        }
      }
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
window.addEventListener('langchange', route);

// Initial render
route();
