/**
 * wiki.js — Hash-routed regional wiki page.
 *
 * Routes:  #hub (or empty) = hub overview
 *          #land | #water | #weather | #biodiversity | #agriculture
 *          #community | #history | #governance
 */

import '../styles/main.css';
import { createMap, mapboxgl, addMarker, addWmsLayer, setGeoJSONSource } from '../lib/mapbox.js';
import { fetchJson, fetchDashboard } from '../lib/dashboard-fetch.js';
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
    'map-pin':
      '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    'radio':
      '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>',
    'grid':
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
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

      <header class="ed-insights-head">
        <h2 class="ed-insights-title">Regional Insights</h2>
        <p class="ed-insights-sub">The following insights are derived from data from the sensor network of Odemira region.</p>
        <p class="ed-insights-count"><strong id="ed-regional-sensor-count">—</strong> sensors live across Odemira.</p>
      </header>

      <div class="ed-error-banner" id="ed-error-banner" hidden role="alert">
        <strong>Couldn't load live data.</strong>
        <span id="ed-error-banner-msg"></span>
        <button type="button" class="ed-error-banner-retry" id="ed-error-banner-retry">Retry</button>
      </div>

      <!-- Region overview map: satellite basemap, custom letter-badge markers,
           top-left view buttons (exclusive), legend underneath that swaps with
           the active view, LULC year scrubber bottom-center when Land Use is on. -->
      <section class="ed-region-map-block">
        <div class="ed-region-map" id="ed-station-map" aria-label="Map of Odemira data stations"></div>

        <div class="ed-map-overlay">
          <div class="ed-map-views" role="group" aria-label="Map view">
            <div class="ed-map-views-title">MAP LAYERS</div>
            <button type="button" class="ed-map-view-btn is-active" data-view="sensors" aria-pressed="true">
              <span class="ed-map-view-icon">${lucide('radio', 14)}</span>
              <span>Sensor Network</span>
            </button>
            <button type="button" class="ed-map-view-btn" data-view="landuse" aria-pressed="false">
              <span class="ed-map-view-icon">${lucide('grid', 14)}</span>
              <span>Land Use</span>
            </button>
            <button type="button" class="ed-map-view-btn" data-view="hydro" aria-pressed="false">
              <span class="ed-map-view-icon">${lucide('droplet', 14)}</span>
              <span>Hydrological Map</span>
            </button>
            <button type="button" class="ed-map-view-btn" data-view="bio" aria-pressed="false">
              <span class="ed-map-view-icon">${lucide('leaf', 14)}</span>
              <span>Biodiversity</span>
            </button>
            <button type="button" class="ed-map-view-btn" data-view="rainfall" aria-pressed="false">
              <span class="ed-map-view-icon">${lucide('cloud-sun', 14)}</span>
              <span>Rainfall</span>
            </button>
            <button type="button" class="ed-map-view-btn" data-view="soil" aria-pressed="false">
              <span class="ed-map-view-icon">${lucide('sprout', 14)}</span>
              <span>Soil</span>
            </button>
          </div>

          <div class="ed-map-legend" id="ed-map-legend">
            <div class="ed-map-legend-title" id="ed-map-legend-title">SENSOR LEGEND</div>
            <div class="ed-map-legend-body" id="ed-map-legend-body">
              <span class="ed-map-legend-empty">Loading…</span>
            </div>
          </div>
        </div>

        <div class="ed-map-lulc-controls" id="ed-map-lulc-controls" hidden>
          <button type="button" class="ed-map-lulc-play" id="ed-map-lulc-play" aria-label="Play / pause">▶</button>
          <div class="ed-map-lulc-track">
            <input type="range" class="ed-map-lulc-slider" id="ed-map-lulc-slider" min="0" max="0" step="1" value="0" aria-label="Land cover year" />
            <div class="ed-map-lulc-meta">Land cover · <strong id="ed-map-lulc-year">—</strong></div>
          </div>
        </div>

        <div class="ed-map-lulc-controls" id="ed-map-rain-controls" hidden>
          <button type="button" class="ed-map-lulc-play" id="ed-map-rain-play" aria-label="Play / pause">▶</button>
          <div class="ed-map-lulc-track">
            <input type="range" class="ed-map-lulc-slider" id="ed-map-rain-slider" min="0" max="0" step="1" value="0" aria-label="Rainfall year" />
            <div class="ed-map-lulc-meta">Rainfall · <strong id="ed-map-rain-year">—</strong></div>
          </div>
        </div>
      </section>

      <!-- Below-map bar: Add Sensor button opens the proposal form modal. -->
      <div class="ed-region-map-bar ed-region-map-bar--below">
        <button type="button" class="ed-add-sensor-btn" id="ed-add-sensor-btn" aria-haspopup="dialog">
          + Add a sensor to the dashboard
        </button>
        <span class="ed-add-sensor-hint">Propose a new station — community-installed sensors welcome.</span>
      </div>

      <div class="ed-grid">
        <!-- WEATHER -->
        <section class="ed-panel ed-panel--weather">
          <div class="ed-panel-head">${lucide('cloud-sun')} Weather</div>

          <!-- Regional Weather Average — full-width climograph -->
          <div class="ed-weather-block">
            <div class="ed-card-title">Regional Weather Average <span>(1991–2020 monthly normals)</span></div>
            <svg class="ed-monthly ed-monthly--wide" id="ed-monthly-chart" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
              <text x="500" y="130" text-anchor="middle" class="ed-monthly-empty" fill="#b91c1c" font-weight="900">DATA?</text>
            </svg>
            ${monthsRow}
            <div class="ed-monthly-legend">
              <span><i style="background:#8b9a7e"></i>Rainfall (mm)</span>
              <span><i style="background:#b85a3a"></i>Temperature (°C)</span>
            </div>
          </div>

          <!-- Climate Trajectory — full-width table with dedicated sparkline column -->
          <div class="ed-weather-block">
            <div class="ed-card-title">Climate trajectory <span>(50-yr archival)</span></div>
            <div class="ed-traj-head">
              <div></div>
              <div>1975–84</div>
              <div>2015–24</div>
              <div>Last 5 yr</div>
              <div class="ed-traj-delta">vs Baseline</div>
              <div class="ed-traj-spark-head">Trend</div>
            </div>
            ${trajectoryRows}
          </div>

          <!-- Annual rainfall by station -->
          <div class="ed-weather-block ed-met-rainfall">
            <div class="ed-card-title">Annual rainfall by station <span>(in-situ pluviometers)</span></div>
            <div class="ed-reservoirs-legend">
              <span class="ed-reservoirs-leg-mean"><i></i>Regional mean</span>
              <span class="ed-reservoirs-leg-hero"><i></i><span id="ed-met-rainfall-hero-label">Selected station</span></span>
              <span class="ed-reservoirs-leg-other"><i></i>Other stations</span>
            </div>
            <svg class="ed-reservoirs-chart" id="ed-met-rainfall-chart" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
              <text x="500" y="140" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
            </svg>
            <div class="ed-station-picker-label">Select a station to highlight</div>
            <div class="ed-station-picker" id="ed-met-rainfall-stations"></div>
            <select id="ed-met-rainfall-select" hidden></select>
          </div>

          <!-- SPI-12 drought index — moved from Water section -->
          <div class="ed-weather-block">
            <div class="ed-card-title">Drought Index — SPI-12 <span id="ed-spi-range">(12-month standardized precipitation index)</span></div>
            <svg class="ed-spi-ribbon" id="ed-spi-ribbon" viewBox="0 0 1000 32" preserveAspectRatio="none" aria-hidden="true">
              <rect width="1000" height="32" fill="#fef2f2"/>
              <text x="500" y="20" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
            </svg>
            <div class="ed-legend-row">${spiLegend}</div>
            <div class="ed-years ed-years--wide" id="ed-spi-years"></div>
          </div>
        </section>

        <!-- SOIL -->
        <section class="ed-panel ed-panel--land">
          <div class="ed-panel-head">${lucide('leaf')} Land</div>

          <!-- Regional soil stats lifted from the wiki Soil section -->
          <div class="ed-bio-stats" id="ed-land-stats"></div>

          <div class="ed-card">
            <div class="ed-card-title">Soil summary <span>(0–30 cm)</span></div>
            ${soilRow('pH (H₂O)',          'SoilGrids Properties',     'soil.ph',             '1f')}
            ${soilRow('Organic carbon',    'SoilGrids Properties',     'soil.organicCarbon',  'str')}
            ${soilRow('WRB texture class', 'SoilGrids Classification', 'soil.classification', 'str')}
            ${soilRow('Bulk density',      'SoilGrids Properties',     'soil.bulkDensity',    'str')}
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Soil profile <span>(SoilGrids · 0–200 cm · property centroid)</span></div>
            <p class="ed-card-desc">How pH, organic carbon and clay change with depth at the property centroid. Surface layers are usually the most weathered and biologically active; deeper layers reflect parent material.</p>
            <div class="ed-soil-profile" id="ed-soil-profile">
              <div class="ed-soil-profile-empty">Loading…</div>
            </div>
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Soil Type Distribution <span>(regional · wiki)</span></div>
            <canvas class="ed-soil-pie" id="ed-soil-pie" width="500" height="280"></canvas>
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Geology <span>(Macrostrat)</span></div>
            <div class="ed-geology" data-cell="geology.summary" data-fmt="str">${P('Macrostrat Geology')}</div>
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Land cover <span>(Esri Living Atlas · Sentinel-2 10m · 2017→)</span></div>
            <svg class="ed-landcover" id="ed-landcover-chart" viewBox="0 0 360 160" preserveAspectRatio="none" aria-hidden="true">
              <text x="180" y="80" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
            </svg>
            <div class="ed-landcover-legend" id="ed-landcover-legend"></div>
          </div>
          <div class="ed-card">
            <div class="ed-card-title">Soil temperature &amp; moisture <span>(Open-Meteo ERA5 archive · 0–7 cm · last 5 yr)</span></div>
            <svg class="ed-soil-series" id="ed-soil-series" viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
              <text x="500" y="120" text-anchor="middle" fill="#888">Loading…</text>
            </svg>
            <div class="ed-soil-series-legend">
              <span><i style="background:#b85a3a"></i>Soil temp (°C)</span>
              <span><i style="background:#3d6b8c"></i>Soil moisture (m³/m³)</span>
            </div>
          </div>
        </section>

        <!-- WATER -->
        <section class="ed-panel ed-panel--water">
          <div class="ed-panel-head">${lucide('droplet')} Water</div>
          <div class="ed-water-grid">
            <div class="ed-subhead ed-card--span-12">Water quantity</div>
            <div class="ed-card ed-card--span-12">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Climatic Water Balance <span>(P − ET₀)</span></div>
                <div class="ed-water-balance-legend">
                  <span class="ed-wb-leg-surplus">Surplus</span>
                  <span class="ed-wb-leg-deficit">Deficit</span>
                </div>
              </div>
              <p class="ed-card-desc">Whether a place is water-surplus or water-deficit at the surface level — precipitation minus evapotranspiration.</p>
              <svg class="ed-water-balance-chart" id="ed-wb-chart" viewBox="0 0 700 180" preserveAspectRatio="none" aria-hidden="true">
                <text x="350" y="90" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-years" id="ed-wb-years"></div>
            </div>

            <div class="ed-card ed-card--span-12 ed-water-stack">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Total Water Storage <span>(% of combined historical max, end-of-month)</span></div>
              </div>
              <svg class="ed-water-stack-chart" id="ed-water-stack-chart" viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
                <text x="500" y="120" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-water-stack-legend" id="ed-water-stack-legend"></div>
            </div>

            <div class="ed-card ed-card--span-12 ed-reservoirs">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Reservoir storage by station <span>(% of historical max)</span></div>
              </div>
              <div class="ed-reservoirs-legend">
                <span class="ed-reservoirs-leg-mean"><i></i>Regional trend</span>
                <span class="ed-reservoirs-leg-hero"><i></i><span id="ed-reservoirs-hero-label">Selected reservoir</span></span>
                <span class="ed-reservoirs-leg-other"><i></i>Other Odemira reservoirs</span>
                <span class="ed-reservoirs-leg-drought"><i></i>Drought year (SPI-12 &lt; −1.5)</span>
              </div>
              <svg class="ed-reservoirs-chart" id="ed-reservoirs-chart" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
                <text x="500" y="140" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-reservoirs-readings" id="ed-reservoirs-readings"></div>
            </div>

            <div class="ed-card ed-card--span-12 ed-groundwater">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Groundwater depth <span>(piezometers · m below ground)</span></div>
              </div>
              <div class="ed-reservoirs-legend">
                <span class="ed-reservoirs-leg-hero"><i></i><span id="ed-groundwater-hero-label">Selected piezometer</span></span>
                <span class="ed-reservoirs-leg-other"><i></i>Other piezometers in Odemira</span>
                <span class="ed-groundwater-axis-note">↓ deeper = water table further below surface</span>
              </div>
              <svg class="ed-reservoirs-chart" id="ed-groundwater-chart" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
                <text x="500" y="140" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-reservoirs-readings" id="ed-groundwater-readings"></div>
            </div>

            <div class="ed-subhead ed-card--span-12">Water quality</div>

            <div class="ed-card ed-card--span-12 ed-wq-card">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Nitrate over time <span>(groundwater)</span></div>
                <div class="ed-wq-stats" id="ed-wq-nitrate-stats">—</div>
              </div>
              <p class="ed-wq-note">High nitrate levels in groundwater are a marker for agricultural run-off (fertiliser, manure). Drinking-water guideline is 50 mg/l NO₃ (WHO / EU); chronic exceedance harms infant health and indicates an over-fertilised catchment.</p>
              <svg class="ed-wq-chart" id="ed-wq-nitrate-chart" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
                <text x="500" y="110" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-wq-legend">
                <span><i style="background:#3d6b8c"></i>Monthly median across Odemira quality stations</span>
                <span><i class="ed-wq-range"></i>Min–max spread that month</span>
                <span><i class="ed-wq-threshold"></i>WHO / EU guideline (50 mg/l)</span>
              </div>
            </div>

            <div class="ed-card ed-card--span-12 ed-wq-card">
              <div class="ed-card-title-row">
                <div class="ed-card-title">Heavy metals over time <span>(groundwater · mg/l)</span></div>
                <div class="ed-wq-stats" id="ed-wq-metals-stats">—</div>
              </div>
              <p class="ed-wq-note">Trace metals in groundwater above guideline values (Pb 0.01 / Hg 0.001 / As 0.01 mg/l, WHO drinking-water) indicate industrial or mining contamination and are persistent: most don't degrade and bio-accumulate up the food chain.</p>
              <svg class="ed-wq-chart" id="ed-wq-metals-chart" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
                <text x="500" y="110" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
              </svg>
              <div class="ed-wq-legend" id="ed-wq-metals-legend"></div>
            </div>
          </div>
        </section>

        <!-- BIODIVERSITY -->
        <section class="ed-panel ed-panel--bio">
          <div class="ed-panel-head">${lucide('sprout')} Biodiversity</div>

          <p class="ed-card-desc">Odemira spans a rich gradient of ecosystems from Atlantic cliffs to Mediterranean woodlands.</p>

          <!-- Wiki ecology stats -->
          <div class="ed-bio-stats" id="ed-bio-stats"></div>

          <!-- Observations per year (1995→) stacked by iconic taxon -->
          <div class="ed-weather-block">
            <div class="ed-card-title">Observations per year <span>(iNaturalist · 1995 → today)</span></div>
            <p class="ed-card-desc">How many wildlife observations were submitted to iNaturalist each year, broken down by taxon group. Reflects observer activity as well as biodiversity — surges typically follow citizen-science campaigns.</p>
            <svg class="ed-bio-yearbars" id="ed-bio-yearbars" viewBox="0 0 1000 280" preserveAspectRatio="none" aria-hidden="true">
              <text x="500" y="140" text-anchor="middle" fill="#b91c1c" font-weight="900">DATA?</text>
            </svg>
            <div class="ed-bio-yearbars-legend" id="ed-bio-yearbars-legend"></div>
          </div>

          <!-- Flora & Fauna quadrants: most observed + most endangered, per column -->
          <div class="ed-weather-block">
            <div class="ed-card-title">Flora &amp; Fauna <span>(observed in Odemira)</span></div>
            <div class="ed-bio-quad">
              <div class="ed-bio-quad-col">
                <div class="ed-bio-quad-col-head">Flora</div>
                <div class="ed-bio-quad-cell">
                  <div class="ed-bio-quad-cell-head">Most observed</div>
                  <ul class="ed-bio-quad-list" id="ed-bio-flora-observed"><li class="ed-bio-quad-empty">Loading…</li></ul>
                </div>
                <div class="ed-bio-quad-cell">
                  <div class="ed-bio-quad-cell-head">Most endangered</div>
                  <ul class="ed-bio-quad-list" id="ed-bio-flora-endangered"><li class="ed-bio-quad-empty">Loading…</li></ul>
                </div>
              </div>
              <div class="ed-bio-quad-col">
                <div class="ed-bio-quad-col-head">Fauna</div>
                <div class="ed-bio-quad-cell">
                  <div class="ed-bio-quad-cell-head">Most observed</div>
                  <ul class="ed-bio-quad-list" id="ed-bio-fauna-observed"><li class="ed-bio-quad-empty">Loading…</li></ul>
                </div>
                <div class="ed-bio-quad-cell">
                  <div class="ed-bio-quad-cell-head">Most endangered</div>
                  <ul class="ed-bio-quad-list" id="ed-bio-fauna-endangered"><li class="ed-bio-quad-empty">Loading…</li></ul>
                </div>
              </div>
            </div>
            <div class="ed-legend-row ed-legend-row--iucn">${iucnLegend}</div>
          </div>

        </section>

      </div>

      <!-- Add Sensor modal: simple proposal form posted to
           /api/regions/odemira/sensor-proposals — a curator follows up. -->
      <div class="ed-modal" id="ed-add-sensor-modal" role="dialog" aria-modal="true" aria-labelledby="ed-add-sensor-title" hidden>
        <div class="ed-modal-backdrop" data-close></div>
        <div class="ed-modal-card ed-modal-card--narrow">
          <div class="ed-modal-head">
            <h2 class="ed-modal-title" id="ed-add-sensor-title">Add a sensor</h2>
            <button type="button" class="ed-modal-close" data-close aria-label="Close">&times;</button>
          </div>
          <form class="ed-add-sensor-form" id="ed-add-sensor-form">
            <label class="ed-form-row">
              <span>Sensor type</span>
              <select name="sensorType" required>
                <option value="">Choose…</option>
                <option value="weather">Weather Station</option>
                <option value="river">River Gauge</option>
                <option value="piezometer">Piezometer (groundwater level)</option>
                <option value="groundwater_quality">Groundwater Quality</option>
                <option value="spring">Spring</option>
                <option value="soil">Soil Moisture / Temperature</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="ed-form-row">
              <span>Location <em>(address, place name, or coordinates)</em></span>
              <input name="location" type="text" required maxlength="280" placeholder="e.g. Quinta dos Cravos, São Teotónio" />
            </label>
            <div class="ed-form-row ed-form-row--split">
              <label>
                <span>Latitude <em>(optional)</em></span>
                <input name="lat" type="number" step="0.000001" min="-90" max="90" placeholder="37.5500" />
              </label>
              <label>
                <span>Longitude <em>(optional)</em></span>
                <input name="lng" type="number" step="0.000001" min="-180" max="180" placeholder="-8.6400" />
              </label>
            </div>
            <div class="ed-form-row ed-form-row--split">
              <label>
                <span>Your name</span>
                <input name="contactName" type="text" maxlength="120" />
              </label>
              <label>
                <span>Email <em>(required)</em></span>
                <input name="contactEmail" type="email" required maxlength="200" />
              </label>
            </div>
            <label class="ed-form-row">
              <span>Notes <em>(optional)</em></span>
              <textarea name="note" rows="3" maxlength="600" placeholder="What does it measure, how often, who owns it?"></textarea>
            </label>
            <div class="ed-form-actions">
              <span class="ed-form-msg" id="ed-add-sensor-msg" aria-live="polite"></span>
              <button type="submit" class="ed-form-submit" id="ed-add-sensor-submit">Submit proposal</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Sensor Status modal: opens from the button above the map. Lists every
           sensor grouped by network with a status dot + latest reading date. -->
      <div class="ed-modal" id="ed-sensor-status-modal" role="dialog" aria-modal="true" aria-labelledby="ed-sensor-status-title" hidden>
        <div class="ed-modal-backdrop" data-close></div>
        <div class="ed-modal-card">
          <div class="ed-modal-head">
            <h2 class="ed-modal-title" id="ed-sensor-status-title">Sensor Status</h2>
            <button type="button" class="ed-modal-close" data-close aria-label="Close">&times;</button>
          </div>
          <div class="ed-modal-sub" id="ed-sensor-status-sub">Loading sensor inventory…</div>
          <div class="ed-modal-body" id="ed-sensor-status-body"></div>
        </div>
      </div>
    </section>
  `;
}

// Esri Living Atlas Sentinel-2 10m Annual Land Cover — one helper shared by
// the bottom card map and the top-map Land Use toggle. The catalog enumerates
// per-year rasters; their OBJECTIDs feed the mosaicRule that pins exportImage
// to a single year.
const LULC_IMAGE_SERVER = 'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer';
let lulcYearsPromise = null;
function loadLulcYears() {
  if (lulcYearsPromise) return lulcYearsPromise;
  lulcYearsPromise = fetch(
    `${LULC_IMAGE_SERVER}/query?where=1%3D1&outFields=OBJECTID,Name&returnGeometry=false&f=json`
  )
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (!d) return [];
      return (d.features || [])
        .map(f => {
          const m = /(\d{4})$/.exec(f.attributes?.Name || '');
          return m ? { year: Number(m[1]), oid: f.attributes.OBJECTID } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.year - b.year);
    })
    .catch(() => []);
  return lulcYearsPromise;
}
function lulcTileUrl(oid) {
  const mosaicRule = encodeURIComponent(JSON.stringify({
    mosaicMethod: 'esriMosaicLockRaster',
    lockRasterIds: [oid],
  }));
  return (
    `${LULC_IMAGE_SERVER}/exportImage` +
    `?bbox={bbox-epsg-3857}` +
    `&bboxSR=3857&imageSR=3857` +
    `&size=512,512&format=png&transparent=true&f=image` +
    `&mosaicRule=${mosaicRule}`
  );
}

function renderDashboardError(message) {
  const banner = document.getElementById('ed-error-banner');
  const msgEl  = document.getElementById('ed-error-banner-msg');
  if (!banner) return;
  if (msgEl) msgEl.textContent = ` ${message} — usually a cold serverless connection. Retrying often works.`;
  banner.hidden = false;
  const retry = document.getElementById('ed-error-banner-retry');
  if (retry) {
    retry.onclick = () => {
      banner.hidden = true;
      hydrateEnvironmentalDashboard();
    };
  }
}

// Hydrate the dashboard cells with real values from /api/regions/odemira.
// Every cell tagged with [data-cell="<dot.path>"] is resolved against the
// response; null/undefined values keep their DATA? placeholder.
async function hydrateEnvironmentalDashboard() {
  let payload;
  try {
    payload = await fetchDashboard('/data/odemira/facts.json', '/api/regions/odemira');
    if (!payload?.ok) throw new Error(payload?.error || 'payload not ok');
  } catch (e) {
    console.warn('[dashboard] fetch failed:', e.message);
    renderDashboardError(e.message);
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

  // Monthly normals climograph: precipitation bars + temperature line.
  // Wide layout (1000x260) with mm tick labels on the left Y-axis and
  // °C tick labels on the right Y-axis.
  (() => {
    const svg = document.getElementById('ed-monthly-chart');
    if (!svg) return;
    const climate = payload.climate || {};
    const precip  = Array.isArray(climate.monthlyPrecip)  ? climate.monthlyPrecip  : [];
    const hi      = Array.isArray(climate.monthlyAvgHigh) ? climate.monthlyAvgHigh : [];
    const lo      = Array.isArray(climate.monthlyAvgLow)  ? climate.monthlyAvgLow  : [];
    if (precip.length !== 12 || hi.length !== 12 || lo.length !== 12) return;
    const tempMean = hi.map((h, i) => (h + lo[i]) / 2);

    const W = 1000, H = 260;
    const PAD = { l: 48, r: 48, t: 18, b: 22 };
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const slot = innerW / 12;

    // Nice round Y-axis ranges
    const niceMax = (v) => {
      const exp = Math.pow(10, Math.floor(Math.log10(v || 1)));
      const n = v / exp;
      const stepped = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
      return stepped * exp;
    };
    const pMax = niceMax(Math.max(1, ...precip) * 1.05);
    const tMinRaw = Math.min(0, ...tempMean);
    const tMaxRaw = Math.max(...tempMean) * 1.05;
    const tMin = Math.floor(tMinRaw / 5) * 5;
    const tMax = Math.ceil(tMaxRaw / 5) * 5;
    const tRange = (tMax - tMin) || 1;

    const yPrecip = v => PAD.t + (1 - v / pMax) * innerH;
    const yTemp   = v => PAD.t + (1 - (v - tMin) / tRange) * innerH;

    // Grid + axis labels (mm on left, °C on right)
    const ticks = 4;
    let grid = '';
    for (let i = 0; i <= ticks; i++) {
      const pv = (pMax / ticks) * i;
      const tv = tMin + (tRange / ticks) * i;
      const y  = yPrecip(pv);
      grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
      grid += `<text x="${(PAD.l - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#888" text-anchor="end">${Math.round(pv)}</text>`;
      grid += `<text x="${(W - PAD.r + 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#888" text-anchor="start">${Math.round(tv)}</text>`;
    }

    const bars = precip.map((p, i) => {
      const h = innerH - (yPrecip(p) - PAD.t);
      const x = PAD.l + slot * i + slot * 0.18;
      const w = slot * 0.64;
      return `<rect x="${x.toFixed(1)}" y="${yPrecip(p).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#8b9a7e" />`;
    }).join('');
    const linePts = tempMean.map((t, i) => {
      const x = PAD.l + slot * i + slot / 2;
      return `${x.toFixed(1)},${yTemp(t).toFixed(1)}`;
    }).join(' ');
    const dots = tempMean.map((t, i) => {
      const x = PAD.l + slot * i + slot / 2;
      return `<circle cx="${x.toFixed(1)}" cy="${yTemp(t).toFixed(1)}" r="3" fill="#b85a3a" />`;
    }).join('');

    svg.innerHTML = `
      ${grid}
      ${bars}
      <polyline fill="none" stroke="#b85a3a" stroke-width="2" points="${linePts}" />
      ${dots}
      <text x="${PAD.l - 8}" y="${PAD.t - 6}" font-size="11" font-weight="700" fill="#5a7256" text-anchor="end">mm</text>
      <text x="${W - PAD.r + 8}" y="${PAD.t - 6}" font-size="11" font-weight="700" fill="#b85a3a" text-anchor="start">°C</text>
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

    // 100% stacked area chart — bands flow continuously between years.
    const W = 600, H = 240, PAD = { l: 36, r: 12, t: 12, b: 24 };
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const xFor = i => PAD.l + (years.length > 1 ? (i / (years.length - 1)) * innerW : innerW / 2);
    const yFor = pct => PAD.t + (1 - pct / 100) * innerH;

    // Y gridlines at 0/25/50/75/100%
    let grid = '';
    [0, 25, 50, 75, 100].forEach(v => {
      const y = yFor(v);
      grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
      grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="10" fill="#888" text-anchor="end">${v}%</text>`;
    });

    // Stacked bands — for each class, build a polygon with the top edge =
    // cumulative pct through that class, bottom edge = cumulative pct
    // before it.
    let bands = '';
    const tops = ORDER.map(() => years.map(() => 0));
    const bots = ORDER.map(() => years.map(() => 0));
    for (let i = 0; i < years.length; i++) {
      let cum = 0;
      ORDER.forEach((label, li) => {
        const pct = years[i].classes?.[label] || 0;
        bots[li][i] = cum;
        cum += pct;
        tops[li][i] = cum;
      });
    }
    ORDER.forEach((label, li) => {
      const allZero = tops[li].every((t, i) => t === bots[li][i]);
      if (allZero) return;
      const topPts = tops[li].map((p, i) => `${xFor(i).toFixed(1)},${yFor(p).toFixed(1)}`);
      const botPts = bots[li].map((p, i) => `${xFor(i).toFixed(1)},${yFor(p).toFixed(1)}`).reverse();
      bands += `<polygon points="${[...topPts, ...botPts].join(' ')}" fill="${COLORS[label] || '#888'}" fill-opacity="0.95"><title>${label}</title></polygon>`;
    });

    let xLabels = '';
    const step = years.length > 8 ? 2 : 1;
    for (let i = 0; i < years.length; i += step) {
      xLabels += `<text x="${xFor(i).toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" font-size="10" fill="#888" text-anchor="middle">${years[i].year}</text>`;
    }

    svg.innerHTML = `${grid}${bands}${xLabels}`;

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

  // Wiki Soil stats + Soil Type Distribution donut — both lifted from
  // src/lib/wiki-data.js so the Land section gets the same regional context
  // that the wiki Soil tab carries.
  (() => {
    const soilWiki = getSectionById('soil');
    const statsEl = document.getElementById('ed-land-stats');
    if (statsEl && soilWiki?.visuals?.stats) {
      statsEl.innerHTML = soilWiki.visuals.stats.map(s => `
        <div class="ed-bio-stat"${s.color ? ` style="border-left-color:${s.color}"` : ''}>
          <div class="ed-bio-stat-value"${s.color ? ` style="color:${s.color}"` : ''}>${s.value}</div>
          <div class="ed-bio-stat-label">${s.label}</div>
          ${s.sublabel ? `<div class="ed-bio-stat-sub">${s.sublabel}</div>` : ''}
        </div>`).join('');
    }
    const pie = document.getElementById('ed-soil-pie');
    const pieData = soilWiki?.visuals?.charts?.[0]?.data;
    if (pie && Array.isArray(pieData) && pieData.length) {
      drawPieChart(pie, pieData);
    }
  })();

  // SoilGrids depth profile — six layers (0–5, 5–15, 15–30, 30–60, 60–100,
  // 100–200 cm) for pH, organic carbon and clay at the property centroid.
  // Fetched from ISRIC's REST API (CORS-friendly) with a localStorage cache
  // keyed by rounded coordinates — soil doesn't change on human timescales,
  // so we cache for 30 days.
  (async () => {
    const wrap = document.getElementById('ed-soil-profile');
    if (!wrap) return;

    let coords = payload.property?.coords;
    if (Array.isArray(coords)) coords = { lat: coords[0], lng: coords[1] };
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      coords = { lat: 37.55, lng: -8.64 };
    }
    const lat = +coords.lat.toFixed(3);
    const lng = +coords.lng.toFixed(3);
    const cacheKey = `soilgrids-profile:${lat},${lng}`;
    const CACHE_TTL = 30 * 86400 * 1000;

    let data;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && Date.now() - cached.t < CACHE_TTL) {
        data = cached.d;
      }
    } catch { /* ignore */ }

    if (!data) {
      try {
        data = await fetchJson(
          'https://rest.isric.org/soilgrids/v2.0/properties/query' +
          `?lon=${lng}&lat=${lat}` +
          '&property=phh2o&property=clay&property=soc&value=mean',
          { timeoutMs: 12000 }
        );
        try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: data })); } catch {}
      } catch {
        wrap.innerHTML = '<div class="ed-soil-profile-empty">SoilGrids unavailable.</div>';
        return;
      }
    }
    const layers = data?.properties?.layers;
    if (!Array.isArray(layers) || !layers.length) {
      wrap.innerHTML = '<div class="ed-soil-profile-empty">No soil profile returned.</div>';
      return;
    }

    const props = {
      phh2o: { label: 'pH', unit: '', color: '#b85a3a', fmt: (v) => v.toFixed(1) },
      soc:   { label: 'Organic C', unit: ' g/kg', color: '#3d6b48', fmt: (v) => v.toFixed(0) },
      clay:  { label: 'Clay', unit: '%', color: '#a89580', fmt: (v) => v.toFixed(0) },
    };

    const columns = ['phh2o', 'soc', 'clay'].map(key => {
      const layer = layers.find(l => l.name === key);
      if (!layer) return null;
      const df = layer.unit_measure?.d_factor || 1;
      const depths = layer.depths.map(dp => ({
        label: dp.label,
        top: dp.range.top_depth,
        bottom: dp.range.bottom_depth,
        value: dp.values.mean != null ? dp.values.mean / df : null,
      }));
      return { key, ...props[key], depths };
    }).filter(Boolean);

    const allDepths = columns[0]?.depths || [];
    const maxDepth = Math.max(...allDepths.map(d => d.bottom));
    const ROW_H = 26;
    const SVG_H = allDepths.length * ROW_H + 30;

    wrap.innerHTML = columns.map(col => {
      const allValid = col.depths.filter(d => d.value != null).map(d => d.value);
      const vMax = Math.max(...allValid, 0);
      const vMin = Math.min(...allValid, 0);
      const range = (vMax - vMin) || 1;
      const bars = col.depths.map((d, i) => {
        if (d.value == null) return '';
        const widthPct = range > 0 ? ((d.value - vMin) / range) * 88 + 8 : 50;
        return `
          <div class="ed-soil-profile-row" style="height:${ROW_H - 4}px">
            <span class="ed-soil-profile-depth">${d.top}–${d.bottom} cm</span>
            <div class="ed-soil-profile-track">
              <div class="ed-soil-profile-bar" style="width:${widthPct.toFixed(1)}%;background:${col.color}"></div>
            </div>
            <span class="ed-soil-profile-value">${col.fmt(d.value)}${col.unit}</span>
          </div>`;
      }).join('');
      return `
        <div class="ed-soil-profile-col">
          <div class="ed-soil-profile-title" style="color:${col.color}">${col.label}</div>
          ${bars}
        </div>`;
    }).join('');
    hydrated += 1;
  })();

  // Soil temperature + moisture (Open-Meteo ERA5 archive, daily mean 0–7 cm,
  // last ~5 years). Fetched directly from the browser — Open-Meteo allows
  // CORS and the response is small (~45 KB). Charted with two Y-axes: temp
  // °C on the left in terracotta, moisture m³/m³ on the right in blue.
  (async () => {
    const svg = document.getElementById('ed-soil-series');
    if (!svg) return;

    let coords = payload.property?.coords;
    if (Array.isArray(coords)) coords = { lat: coords[0], lng: coords[1] };
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      // Fall back to Odemira town centre.
      coords = { lat: 37.55, lng: -8.64 };
    }

    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startD = new Date(today.getTime() - 5 * 365 * 86400000).toISOString().slice(0, 10);
    let data;
    try {
      data = await fetchJson(
        'https://archive-api.open-meteo.com/v1/archive' +
        `?latitude=${coords.lat.toFixed(4)}&longitude=${coords.lng.toFixed(4)}` +
        `&start_date=${startD}&end_date=${end}` +
        '&daily=soil_temperature_0_to_7cm_mean,soil_moisture_0_to_7cm_mean' +
        '&timezone=auto'
      );
    } catch {
      svg.innerHTML = '<text x="500" y="120" text-anchor="middle" fill="#888">Soil archive unavailable.</text>';
      return;
    }
    const daily = data?.daily;
    const times = daily?.time;
    const temps = daily?.soil_temperature_0_to_7cm_mean;
    const moist = daily?.soil_moisture_0_to_7cm_mean;
    if (!Array.isArray(times) || !Array.isArray(temps) || !Array.isArray(moist) || !times.length) {
      svg.innerHTML = '<text x="500" y="120" text-anchor="middle" fill="#888">No soil data returned.</text>';
      return;
    }

    const W = 1000, H = 240, PAD = { l: 44, r: 44, t: 14, b: 22 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;

    const validTemps = temps.filter(v => v != null);
    const validMoist = moist.filter(v => v != null);
    if (!validTemps.length || !validMoist.length) {
      svg.innerHTML = '<text x="500" y="120" text-anchor="middle" fill="#888">No soil data returned.</text>';
      return;
    }
    const tMin = Math.floor(Math.min(...validTemps) / 5) * 5;
    const tMax = Math.ceil(Math.max(...validTemps) / 5) * 5;
    const mMax = Math.max(0.5, Math.ceil(Math.max(...validMoist) * 10) / 10);

    const xFor = i => PAD.l + (i / (times.length - 1)) * cW;
    const yTemp = v => PAD.t + (1 - (v - tMin) / (tMax - tMin)) * cH;
    const yMoist = v => PAD.t + (1 - v / mMax) * cH;

    // Grid + axes
    const ticks = 4;
    let grid = '';
    for (let i = 0; i <= ticks; i++) {
      const tv = tMin + ((tMax - tMin) / ticks) * i;
      const mv = (mMax / ticks) * i;
      const y = yTemp(tv);
      grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
      grid += `<text x="${(PAD.l - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#888" text-anchor="end">${Math.round(tv)}</text>`;
      grid += `<text x="${(W - PAD.r + 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#888" text-anchor="start">${mv.toFixed(2)}</text>`;
    }
    grid += `<text x="${PAD.l - 8}" y="${PAD.t - 6}" font-size="11" font-weight="700" fill="#b85a3a" text-anchor="end">°C</text>`;
    grid += `<text x="${W - PAD.r + 8}" y="${PAD.t - 6}" font-size="11" font-weight="700" fill="#3d6b8c" text-anchor="start">m³/m³</text>`;

    // X labels (year markers)
    let xLabels = '';
    const yearsSeen = new Set();
    for (let i = 0; i < times.length; i += Math.floor(times.length / 6)) {
      const y = times[i].slice(0, 4);
      if (yearsSeen.has(y)) continue;
      yearsSeen.add(y);
      const x = xFor(i);
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
    }

    // Polylines — skip null spans so the line breaks cleanly.
    function buildPolylines(values, yFor, stroke) {
      let out = '';
      let pts = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v == null) {
          if (pts.length > 1) out += `<polyline fill="none" stroke="${stroke}" stroke-width="1" opacity="0.85" points="${pts.join(' ')}" />`;
          pts = [];
          continue;
        }
        pts.push(`${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`);
      }
      if (pts.length > 1) out += `<polyline fill="none" stroke="${stroke}" stroke-width="1" opacity="0.85" points="${pts.join(' ')}" />`;
      return out;
    }

    svg.innerHTML = `${grid}${xLabels}${buildPolylines(temps, yTemp, '#b85a3a')}${buildPolylines(moist, yMoist, '#3d6b8c')}`;
    hydrated += 1;
  })();

  // Land cover overlay map — Esri Living Atlas Sentinel-2 10m raster.
  // Looks up the latest annual raster, renders it as a Mapbox raster source
  // via the ImageServer's exportImage endpoint.
  (async () => {
    const container = document.getElementById('ed-landcover-map');
    const titleEl   = document.getElementById('ed-landcover-map-title');
    if (!container || !mapboxgl.accessToken) return;

    const years = await loadLulcYears();
    if (!years.length) return;
    const latest = years[years.length - 1];

    if (titleEl) {
      titleEl.innerHTML = `Latest year overlay <span>(Sentinel-2 10m · ${latest.year})</span>`;
    }

    const map = createMap('ed-landcover-map', {
      center: [-8.6400, 37.5500],
      zoom: 9,
      scrollZoom: false,
      satellite: true,
    });

    map.on('load', () => {
      map.addSource('lulc', { type: 'raster', tiles: [lulcTileUrl(latest.oid)], tileSize: 512 });
      map.addLayer({
        id: 'lulc-layer',
        type: 'raster',
        source: 'lulc',
        paint: { 'raster-opacity': 0.75 },
      });
    });
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

  // Region overview map — satellite basemap, letter-badge markers, left-
  // side toggles, sensor legend in the bottom-right.
  (async () => {
    const container = document.getElementById('ed-station-map');
    const legendEl  = document.getElementById('ed-map-legend-body');
    const togglesEl = document.querySelector('.ed-map-views');
    if (!container || !legendEl || !togglesEl) return;
    let payloadStations;
    try {
      payloadStations = await fetchDashboard('/data/odemira/stations.json', '/api/regions/odemira/stations');
      if (!payloadStations?.ok || !Array.isArray(payloadStations.features)) return;
    } catch { return; }

    const features = payloadStations.features;
    if (!features.length) {
      legendEl.innerHTML = '<span class="ed-map-legend-empty">No stations catalogued yet.</span>';
      return;
    }

    // Populate the regional sensor count in the page header (above the map).
    const countEl = document.getElementById('ed-regional-sensor-count');
    if (countEl) countEl.textContent = String(payloadStations.count ?? features.length);

    // The five SNIRH networks we ship in the legend — same order as the
    // mockup; counts come from the live stations endpoint.
    const sourceMeta = {
      snirh_meteorologica:  { color: '#e58a3a', glyph: 'W', label: 'Weather Station' },
      snirh_hidrometrica:   { color: '#3d8e9a', glyph: 'R', label: 'River Gauge' },
      snirh_piezometria:    { color: '#3d6b8c', glyph: 'P', label: 'Piezometer' },
      snirh_qualidade_sub:  { color: '#8b4789', glyph: 'Q', label: 'Groundwater Quality' },
      snirh_nascentes:      { color: '#5a7256', glyph: 'S', label: 'Spring' },
    };
    const LEGEND_ORDER = ['snirh_meteorologica','snirh_hidrometrica','snirh_piezometria','snirh_qualidade_sub','snirh_nascentes'];

    const grouped = {};
    for (const f of features) {
      if (!sourceMeta[f.source]) continue; // GloFAS / landmarks not on this map
      (grouped[f.source] = grouped[f.source] || []).push(f);
    }

    // Populate the bottom-right legend
    legendEl.innerHTML = LEGEND_ORDER
      .filter(s => grouped[s] && grouped[s].length)
      .map(s => {
        const meta = sourceMeta[s];
        const n = grouped[s].length;
        return `
          <div class="ed-map-legend-row">
            <span class="ed-map-marker-badge" style="background:${meta.color}">${meta.glyph}</span>
            <span class="ed-map-legend-label">${meta.label}</span>
            <span class="ed-map-legend-count">(${n})</span>
          </div>`;
      }).join('');

    // Satellite-streets basemap
    const map = createMap('ed-station-map', {
      center: [-8.6400, 37.5500],
      zoom: 9,
      scrollZoom: false,
      satellite: true,
    });

    // Markers grouped by source for layer toggling
    const markersBySource = {};
    const markerByKey     = new Map();
    let pendingHighlight  = null;

    const applyHighlight = ({ source, externalId } = {}) => {
      markerByKey.forEach(m => m.getElement().classList.remove('ed-station-marker--highlighted'));
      if (!source || !externalId) return;
      const m = markerByKey.get(`${source}:${externalId}`);
      if (m) m.getElement().classList.add('ed-station-marker--highlighted');
    };
    document.addEventListener('station:highlight', (ev) => {
      const detail = ev.detail || {};
      if (markerByKey.size) applyHighlight(detail);
      else pendingHighlight = detail;
    });

    map.on('load', () => {
      // Heighten Mapbox's built-in waterway lines — they'll be muted by
      // default on the satellite style; we keep them at base opacity so a
      // user can still see them when Hydrology is off but bump them when
      // the toggle is on.
      try {
        if (map.getLayer('waterway')) {
          map.setPaintProperty('waterway', 'line-opacity', 0.6);
        }
      } catch (_) { /* layer name may vary by style; ignore */ }

      for (const source of LEGEND_ORDER) {
        const list = grouped[source]; if (!list) continue;
        const meta = sourceMeta[source];
        markersBySource[source] = [];
        for (const f of list) {
          const el = document.createElement('div');
          el.className = 'ed-station-marker';
          el.style.background = meta.color;
          el.textContent = meta.glyph;
          el.dataset.externalId = f.externalId;
          const popupName = f.displayName || f.name || f.externalId;
          el.title = `${meta.label} · ${popupName}`;
          const popupHtml = `
            <div class="ed-map-popup">
              <div class="ed-map-popup-row"><strong>ID:</strong> ${f.code || f.externalId}</div>
              <div class="ed-map-popup-row"><strong>Type:</strong> ${meta.label}</div>
              <div class="ed-map-popup-row"><strong>Name:</strong> ${popupName}</div>
            </div>`;
          const m = new mapboxgl.Marker({ element: el })
            .setLngLat([f.lng, f.lat])
            .setPopup(new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(popupHtml))
            .addTo(map);
          markersBySource[source].push(m);
          markerByKey.set(`${source}:${f.externalId}`, m);
        }
      }
      if (pendingHighlight) { applyHighlight(pendingHighlight); pendingHighlight = null; }
      // Re-apply current view now that markers + style are ready (markers
      // mount async after first setView call).
      if (currentView) setView(currentView);
    });

    // ---- View buttons (exclusive — one map view at a time) ----
    const viewBtns    = togglesEl.querySelectorAll('.ed-map-view-btn');
    const legendTitle = document.getElementById('ed-map-legend-title');
    const lulcCtrls   = document.getElementById('ed-map-lulc-controls');
    const lulcSlider  = document.getElementById('ed-map-lulc-slider');
    const lulcPlayBtn = document.getElementById('ed-map-lulc-play');
    const lulcYearLbl = document.getElementById('ed-map-lulc-year');
    let lulcYears = [];
    let lulcPlayTimer = null;

    const stopLulcPlay = () => {
      if (lulcPlayTimer) { clearInterval(lulcPlayTimer); lulcPlayTimer = null; }
      if (lulcPlayBtn) lulcPlayBtn.textContent = '▶';
    };
    const setLulcYearIdx = (idx) => {
      if (!lulcYears.length) return;
      const y = lulcYears[Math.max(0, Math.min(idx, lulcYears.length - 1))];
      if (!y) return;
      // Ping-pong the inactive raster source onto the new year, but DON'T
      // start the crossfade until that source has actually loaded tiles —
      // otherwise the active layer fades out into nothing while the new
      // tiles are still in flight (the "flash" Tay's seeing).
      const inactive = lulcActive === 'a' ? 'b' : 'a';
      const inactiveSrcId = `lulc-top-${inactive}`;
      const activeSrcId   = `lulc-top-${lulcActive}`;
      const inactiveSrc = map.getSource(inactiveSrcId);
      if (!inactiveSrc || !inactiveSrc.setTiles) return;
      inactiveSrc.setTiles([lulcTileUrl(y.oid)]);
      if (lulcYearLbl) lulcYearLbl.textContent = String(y.year);

      const handleLoaded = (e) => {
        if (e.sourceId !== inactiveSrcId || !e.isSourceLoaded) return;
        map.off('sourcedata', handleLoaded);
        if (map.getLayer(`${inactiveSrcId}-layer`)) {
          map.setPaintProperty(`${inactiveSrcId}-layer`, 'raster-opacity', 0.75);
        }
        if (map.getLayer(`${activeSrcId}-layer`)) {
          map.setPaintProperty(`${activeSrcId}-layer`, 'raster-opacity', 0);
        }
        lulcActive = inactive;
      };
      map.on('sourcedata', handleLoaded);
      // Safety: if the source never reports loaded within 4s (network slow),
      // fade anyway so the user isn't stuck on the old year.
      setTimeout(() => {
        if (lulcActive === inactive) return;
        map.off('sourcedata', handleLoaded);
        if (map.getLayer(`${inactiveSrcId}-layer`)) {
          map.setPaintProperty(`${inactiveSrcId}-layer`, 'raster-opacity', 0.75);
        }
        if (map.getLayer(`${activeSrcId}-layer`)) {
          map.setPaintProperty(`${activeSrcId}-layer`, 'raster-opacity', 0);
        }
        lulcActive = inactive;
      }, 4000);
    };

    const setMarkersVisible = (visible) => {
      for (const src of Object.keys(markersBySource)) {
        for (const m of markersBySource[src]) {
          m.getElement().style.display = visible ? '' : 'none';
        }
      }
    };
    const setHydroHighlight = (on) => {
      try {
        if (map.getLayer('waterway')) {
          map.setPaintProperty('waterway', 'line-opacity', on ? 1 : 0.6);
          map.setPaintProperty('waterway', 'line-color', on ? '#38bdf8' : null);
          map.setPaintProperty('waterway', 'line-width', on
            ? ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1.8, 16, 3]
            : null);
        }
        if (map.getLayer('water')) {
          map.setPaintProperty('water', 'fill-color', on ? '#0c4a6e' : null);
          map.setPaintProperty('water', 'fill-opacity', on ? 0.55 : null);
        }
        if (!map.getLayer('ed-water-outline')) {
          map.addLayer({
            id: 'ed-water-outline',
            type: 'line',
            source: 'composite',
            'source-layer': 'water',
            paint: { 'line-color': '#38bdf8', 'line-width': 1.5, 'line-opacity': 0.95 },
            layout: { visibility: on ? 'visible' : 'none' },
          });
        } else {
          map.setLayoutProperty('ed-water-outline', 'visibility', on ? 'visible' : 'none');
        }
      } catch (_) {}
    };
    // Rainfall yearly map: SNIRH meteorological station precipitation per
    // year, rendered as colored dots that change with the year slider.
    let rainfallPromise = null;
    const loadRainfallStations = () => {
      if (rainfallPromise) return rainfallPromise;
      rainfallPromise = fetchDashboard('/data/odemira/rainfall-stations.json', '/api/regions/odemira/rainfall-stations')
        .catch(() => null)
        .then(d => {
          if (!d || !d.ok || !Array.isArray(d.features) || !d.features.length) return null;
          // Build a per-year FeatureCollection so swapping years is O(1) source setData.
          const byYear = new Map();
          let minYear = Infinity, maxYear = -Infinity;
          for (const s of d.features) {
            for (const r of s.series) {
              if (!r.year || r.value == null) continue;
              if (r.year < minYear) minYear = r.year;
              if (r.year > maxYear) maxYear = r.year;
              if (!byYear.has(r.year)) byYear.set(r.year, { type: 'FeatureCollection', features: [] });
              byYear.get(r.year).features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
                properties: {
                  value: r.value,
                  displayName: s.displayName,
                  unit: d.unit || 'mm/yr',
                },
              });
            }
          }
          const years = [];
          for (let y = minYear; y <= maxYear; y++) if (byYear.has(y)) years.push(y);
          return { byYear, years, unit: d.unit || 'mm/yr' };
        })
        .catch(() => null);
      return rainfallPromise;
    };

    const rainCtrls  = document.getElementById('ed-map-rain-controls');
    const rainSlider = document.getElementById('ed-map-rain-slider');
    const rainPlay   = document.getElementById('ed-map-rain-play');
    const rainYearLbl = document.getElementById('ed-map-rain-year');
    let rainData = null;
    let rainPlayTimer = null;

    const stopRainPlay = () => {
      if (rainPlayTimer) { clearInterval(rainPlayTimer); rainPlayTimer = null; }
      if (rainPlay) rainPlay.textContent = '▶';
    };
    const setRainYearIdx = (idx) => {
      if (!rainData) return;
      const year = rainData.years[Math.max(0, Math.min(idx, rainData.years.length - 1))];
      if (year == null) return;
      const src = map.getSource('rainfall');
      if (src && src.setData) src.setData(rainData.byYear.get(year));
      if (rainYearLbl) rainYearLbl.textContent = String(year);
    };
    const setRainfallVisible = async (on) => {
      if (on) {
        if (!rainData) rainData = await loadRainfallStations();
        if (!rainData) return false;
        const latestIdx = rainData.years.length - 1;
        const initialYear = rainData.years[latestIdx];
        if (!map.getSource('rainfall')) {
          map.addSource('rainfall', { type: 'geojson', data: rainData.byYear.get(initialYear) });
          // Soft colored blobs — circle color maps directly to mm/yr (so the
          // legend tells the truth) and circle-blur:1 + a generous radius
          // diffuses each station across the surrounding region. Sits on
          // the light basemap, so we can crank opacity without muddying
          // the satellite imagery.
          map.addLayer({
            id: 'rainfall-heat',
            type: 'circle',
            source: 'rainfall',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 110, 10, 180, 13, 280],
              'circle-color': [
                'interpolate', ['linear'], ['get', 'value'],
                400,  '#7d2a14',
                600,  '#b85a3a',
                800,  '#d6ad6a',
                1000, '#a3b86c',
                1200, '#3d8e6e',
                1500, '#1d4e8e',
              ],
              'circle-blur': 1,
              'circle-opacity': 0.85,
            },
          });
          map.addLayer({
            id: 'rainfall-points',
            type: 'circle',
            source: 'rainfall',
            paint: {
              'circle-radius': 3,
              'circle-color': '#1B3A2F',
              'circle-opacity': 0.9,
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 1,
            },
          });
        } else {
          if (map.getLayer('rainfall-heat'))   map.setLayoutProperty('rainfall-heat',   'visibility', 'visible');
          if (map.getLayer('rainfall-points')) map.setLayoutProperty('rainfall-points', 'visibility', 'visible');
        }
        if (rainSlider) {
          rainSlider.min = '0';
          rainSlider.max = String(latestIdx);
          rainSlider.value = String(latestIdx);
        }
        if (rainYearLbl) rainYearLbl.textContent = String(initialYear);
        if (rainCtrls) rainCtrls.hidden = false;
        return true;
      }
      stopRainPlay();
      if (map.getLayer('rainfall-heat'))   map.setLayoutProperty('rainfall-heat',   'visibility', 'none');
      if (map.getLayer('rainfall-points')) map.setLayoutProperty('rainfall-points', 'visibility', 'none');
      if (rainCtrls) rainCtrls.hidden = true;
      return true;
    };

    if (rainSlider) {
      rainSlider.addEventListener('input', () => {
        stopRainPlay();
        setRainYearIdx(Number(rainSlider.value));
      });
    }
    if (rainPlay) {
      rainPlay.addEventListener('click', () => {
        if (rainPlayTimer) { stopRainPlay(); return; }
        rainPlay.textContent = '❚❚';
        rainPlayTimer = setInterval(() => {
          if (!rainSlider) return;
          const max = Number(rainSlider.max);
          let next = Number(rainSlider.value) + 1;
          if (next > max) next = 0;
          rainSlider.value = String(next);
          setRainYearIdx(next);
        }, 600);
      });
    }

    // Biodiversity heatmaps — one Mapbox heatmap layer per iconic taxon,
    // colored to match the "Observations per year" stacked bars below.
    // Legend renders a checkbox per taxon; toggle flips that layer's
    // visibility.
    const TAXON_COLOR = {
      Plantae:        '#3d6b48',
      Aves:           '#3d6b8c',
      Insecta:        '#c9a14a',
      Mollusca:       '#9d6360',
      Reptilia:       '#b85a3a',
      Amphibia:       '#7a9a6e',
      Arachnida:      '#7a2a14',
      Mammalia:       '#5a4632',
      Actinopterygii: '#5dcaa5',
      Fungi:          '#a89580',
      Chromista:      '#8b9a7e',
      Animalia:       '#b4b2a9',
    };
    const TAXON_ORDER = Object.keys(TAXON_COLOR);
    const hexToRgba = (hex, a) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };
    const bioLayerIdFor = (t) => `bio-heat-${t.toLowerCase()}`;

    let bioGeoJsonPromise = null;
    let bioData = null;            // { totals: Map, taxonsOrdered: string[], geojson }
    let bioActiveTaxons = new Set();

    const loadBioGeoJson = () => {
      if (bioGeoJsonPromise) return bioGeoJsonPromise;
      bioGeoJsonPromise = fetchDashboard('/data/odemira/observations.json', '/api/regions/odemira/observations')
        .then(d => (d && d.ok && d.geojson?.features?.length) ? d : null)
        .catch(() => null);
      return bioGeoJsonPromise;
    };
    const setBioVisible = async (on) => {
      if (on) {
        const raw = await loadBioGeoJson();
        if (!raw) return false;
        if (!bioData) {
          // Count per taxon, drop unknowns from the layer set entirely.
          const totals = new Map();
          for (const f of raw.geojson.features) {
            const t = TAXON_COLOR[f.properties?.tx] ? f.properties.tx : null;
            if (!t) continue;
            totals.set(t, (totals.get(t) || 0) + 1);
          }
          const taxonsOrdered = TAXON_ORDER.filter(t => totals.has(t))
            .sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0));
          bioData = { totals, taxonsOrdered, geojson: raw.geojson };
          bioActiveTaxons = new Set(taxonsOrdered);
        }
        if (!map.getSource('bio-obs')) {
          map.addSource('bio-obs', { type: 'geojson', data: bioData.geojson });
        }
        for (const t of bioData.taxonsOrdered) {
          const layerId = bioLayerIdFor(t);
          const color = TAXON_COLOR[t];
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: 'heatmap',
              source: 'bio-obs',
              maxzoom: 14,
              filter: ['==', ['get', 'tx'], t],
              paint: {
                'heatmap-weight': 1,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 12, 1.6],
                'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 7, 10, 10, 18, 13, 28],
                'heatmap-opacity':   ['interpolate', ['linear'], ['zoom'], 7, 0.75, 14, 0.55],
                'heatmap-color': [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0,    hexToRgba(color, 0),
                  0.2,  hexToRgba(color, 0.45),
                  0.6,  hexToRgba(color, 0.75),
                  1.0,  hexToRgba(color, 0.95),
                ],
              },
            });
          }
          map.setLayoutProperty(layerId, 'visibility',
            bioActiveTaxons.has(t) ? 'visible' : 'none');
        }
        return true;
      }
      if (bioData) {
        for (const t of bioData.taxonsOrdered) {
          const layerId = bioLayerIdFor(t);
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }
      return true;
    };
    const wireBioLegendCheckboxes = () => {
      if (!legendEl) return;
      legendEl.querySelectorAll('input[type=checkbox][data-taxon]').forEach(el => {
        el.addEventListener('change', () => {
          const t = el.dataset.taxon;
          if (el.checked) bioActiveTaxons.add(t); else bioActiveTaxons.delete(t);
          const layerId = bioLayerIdFor(t);
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', el.checked ? 'visible' : 'none');
          }
        });
      });
    };

    // Soil view: SoilGrids WMS overlay (WRB Reference Soil Group Most
    // Probable, 250 m ISRIC). Drop-in raster source via {bbox-epsg-3857}.
    const setSoilVisible = (on) => {
      if (on) {
        if (!map.getSource('soilgrids-wrb')) {
          const tileUrl =
            'https://maps.isric.org/mapserv?map=/map/wrb.map' +
            '&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap' +
            '&LAYERS=MostProbable&STYLES=' +
            '&FORMAT=image/png&TRANSPARENT=true' +
            '&SRS=EPSG:3857&BBOX={bbox-epsg-3857}' +
            '&WIDTH=512&HEIGHT=512';
          map.addSource('soilgrids-wrb', { type: 'raster', tiles: [tileUrl], tileSize: 512 });
          map.addLayer({
            id: 'soilgrids-wrb-layer',
            type: 'raster',
            source: 'soilgrids-wrb',
            paint: { 'raster-opacity': 0.7 },
          });
        } else {
          map.setLayoutProperty('soilgrids-wrb-layer', 'visibility', 'visible');
        }
        return true;
      }
      if (map.getLayer('soilgrids-wrb-layer')) {
        map.setLayoutProperty('soilgrids-wrb-layer', 'visibility', 'none');
      }
      return true;
    };

    // Two raster sources ping-ponged on year change so the new year's tiles
    // can paint over the old set instead of blanking. raster-opacity-transition
    // animates the crossfade.
    const LULC_FADE_MS = 450;
    let lulcActive = 'a';
    const lulcOpacityFor = (visible) => visible ? 0.75 : 0;
    const setLulcVisible = async (on) => {
      if (on) {
        if (!lulcYears.length) lulcYears = await loadLulcYears();
        if (!lulcYears.length) return false;
        const latestIdx = lulcYears.length - 1;
        const initialUrl = lulcTileUrl(lulcYears[latestIdx].oid);
        // Initial setup: source/layer pair A starts visible, B starts at 0.
        for (const slot of ['a', 'b']) {
          const srcId = `lulc-top-${slot}`;
          const layerId = `${srcId}-layer`;
          if (!map.getSource(srcId)) {
            map.addSource(srcId, { type: 'raster', tiles: [initialUrl], tileSize: 512 });
            map.addLayer({
              id: layerId,
              type: 'raster',
              source: srcId,
              paint: {
                'raster-opacity': slot === 'a' ? 0.75 : 0,
                'raster-opacity-transition': { duration: LULC_FADE_MS },
              },
            });
          } else {
            map.setLayoutProperty(layerId, 'visibility', 'visible');
            map.setPaintProperty(layerId, 'raster-opacity',
              slot === lulcActive ? 0.75 : 0);
          }
        }
        if (lulcSlider) {
          lulcSlider.min = '0';
          lulcSlider.max = String(latestIdx);
          lulcSlider.value = String(latestIdx);
        }
        if (lulcYearLbl) lulcYearLbl.textContent = String(lulcYears[latestIdx].year);
        if (lulcCtrls) lulcCtrls.hidden = false;
        return true;
      }
      stopLulcPlay();
      for (const slot of ['a', 'b']) {
        const layerId = `lulc-top-${slot}-layer`;
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
      }
      if (lulcCtrls) lulcCtrls.hidden = true;
      return true;
    };

    // Per-view legend bodies — class chips for Land Use, water types for Hydro,
    // and the sensor-network letter badges for Sensors (rebuilt from `grouped`).
    const sensorLegendHtml = () => LEGEND_ORDER
      .filter(s => grouped[s] && grouped[s].length)
      .map(s => {
        const meta = sourceMeta[s];
        const n = grouped[s].length;
        return `
          <div class="ed-map-legend-row">
            <span class="ed-map-marker-badge" style="background:${meta.color}">${meta.glyph}</span>
            <span class="ed-map-legend-label">${meta.label}</span>
            <span class="ed-map-legend-count">(${n})</span>
          </div>`;
      }).join('');
    // Esri Sentinel-2 10m LULC official palette so legend chips actually
    // match what the raster paints.
    const lulcLegendHtml = () => {
      const chips = [
        ['#1A5BAB', 'Water'],
        ['#358221', 'Trees'],
        ['#87D19E', 'Flooded Vegetation'],
        ['#FFDB5C', 'Crops'],
        ['#ED022A', 'Built Area'],
        ['#EDE9E4', 'Bare Ground'],
        ['#C8C8C8', 'Clouds'],
        ['#C6AD8D', 'Rangeland'],
      ];
      return chips.map(([c, l]) =>
        `<div class="ed-map-legend-row">
          <span class="ed-map-legend-chip" style="background:${c}"></span>
          <span class="ed-map-legend-label">${l}</span>
        </div>`).join('');
    };
    const hydroLegendHtml = () => {
      const chips = [
        ['#0c4a6e', 'Lakes / reservoirs / coast'],
        ['#38bdf8', 'Rivers / streams / canals'],
      ];
      return chips.map(([c, l]) =>
        `<div class="ed-map-legend-row">
          <span class="ed-map-legend-chip" style="background:${c}"></span>
          <span class="ed-map-legend-label">${l}</span>
        </div>`).join('');
    };
    const bioLegendHtml = () => {
      if (!bioData) return '<span class="ed-map-legend-empty">Loading taxa…</span>';
      return bioData.taxonsOrdered.map(t => {
        const color = TAXON_COLOR[t] || '#888';
        const count = bioData.totals.get(t) || 0;
        const checked = bioActiveTaxons.has(t) ? 'checked' : '';
        return `
          <label class="ed-bio-legend-row">
            <input type="checkbox" data-taxon="${t}" ${checked} />
            <span class="ed-map-legend-chip" style="background:${color}"></span>
            <span class="ed-map-legend-label">${t}</span>
            <span class="ed-map-legend-count">${count.toLocaleString()}</span>
          </label>`;
      }).join('') + `<div class="ed-map-legend-row" style="font-size:10px;color:#888;display:block;margin-top:4px;">Source: iNaturalist · tick to toggle taxon</div>`;
    };

    const rainLegendHtml = () => {
      const chips = [
        ['#7d2a14', '< 500 mm'],
        ['#b85a3a', '500–700'],
        ['#d6ad6a', '700–900'],
        ['#a3b86c', '900–1100'],
        ['#3d8e6e', '1100–1300'],
        ['#1d4e8e', '> 1300'],
      ];
      return chips.map(([c, l]) =>
        `<div class="ed-map-legend-row">
          <span class="ed-map-legend-chip" style="background:${c}"></span>
          <span class="ed-map-legend-label">${l}</span>
        </div>`).join('') +
        `<div class="ed-map-legend-row" style="font-size:10px;color:#888;display:block;">
          Annual rainfall per SNIRH station (mm/yr)
        </div>`;
    };

    // Colors sampled directly from the SoilGrids WRB MostProbable raster
    // as it actually paints over Odemira (82% salmon Luvisols, 17% golden
    // Cambisols, plus trace Fluvisols/Plinthosols/Phaeozems). Showing
    // only the classes that visibly appear so legend chips line up with
    // what's on the map.
    const soilLegendHtml = () => {
      const chips = [
        ['#F48385', 'Luvisols'],
        ['#FECD67', 'Cambisols'],
        ['#01B0EF', 'Fluvisols'],
        ['#9E567C', 'Plinthosols'],
        ['#BA6850', 'Phaeozems'],
      ];
      return chips.map(([c, l]) =>
        `<div class="ed-map-legend-row">
          <span class="ed-map-legend-chip" style="background:${c}"></span>
          <span class="ed-map-legend-label">${l}</span>
        </div>`).join('') +
        `<div class="ed-map-legend-row" style="font-size:10px;color:#888;display:block;margin-top:4px;">SoilGrids WRB · 250 m · ISRIC</div>`;
    };

    const VIEW_META = {
      sensors:  { title: 'SENSOR LEGEND',     body: sensorLegendHtml },
      landuse:  { title: 'LAND COVER LEGEND', body: lulcLegendHtml },
      hydro:    { title: 'HYDROLOGY LEGEND',  body: hydroLegendHtml },
      bio:      { title: 'BIODIVERSITY',      body: bioLegendHtml },
      rainfall: { title: 'RAINFALL LEGEND',   body: rainLegendHtml },
      soil:     { title: 'SOIL LEGEND',       body: soilLegendHtml },
    };

    // Hydrology view reads better against the topographic outdoors basemap;
    // every other view stays on satellite-streets. setStyle removes custom
    // sources/layers (LULC, bio, rainfall, water-outline) but markers + the
    // built-in `water` / `waterway` layers come with the new style, and the
    // setX helpers re-add their own sources idempotently after style.load.
    const STYLE_FOR_VIEW = {
      sensors:  'satellite',
      landuse:  'satellite',
      hydro:    'outdoors',
      bio:      'satellite',
      rainfall: 'light',
      soil:     'satellite',
    };
    const STYLE_URLS = {
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      outdoors:  'mapbox://styles/mapbox/outdoors-v12',
      light:     'mapbox://styles/mapbox/light-v11',
    };
    let currentStyleKey = 'satellite';

    const applyViewLayers = async (view) => {
      setMarkersVisible(view === 'sensors');
      setHydroHighlight(view === 'hydro');
      await setLulcVisible(view === 'landuse');
      await setBioVisible(view === 'bio');
      await setRainfallVisible(view === 'rainfall');
      setSoilVisible(view === 'soil');
    };

    // Apply both layers AND the legend after data is ready. Splitting these
    // matters because the bio legend reads from bioData which only exists
    // after setBioVisible's await resolves; if we wrote the legend
    // synchronously after a style swap, it would render "Loading taxa…"
    // forever.
    const applyViewState = async (view) => {
      await applyViewLayers(view);
      const meta = VIEW_META[view];
      if (meta) {
        if (legendTitle) legendTitle.textContent = meta.title;
        if (legendEl)    legendEl.innerHTML = meta.body();
      }
      if (view === 'bio') wireBioLegendCheckboxes();
    };

    let currentView = null;
    const setView = async (view) => {
      // Buttons sync immediately for UI snappiness.
      viewBtns.forEach(btn => {
        const active = btn.dataset.view === view;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('is-active', active);
      });
      currentView = view;

      const targetStyleKey = STYLE_FOR_VIEW[view] || 'satellite';
      if (targetStyleKey !== currentStyleKey) {
        currentStyleKey = targetStyleKey;
        map.setStyle(STYLE_URLS[targetStyleKey]);
        map.once('style.load', () => { applyViewState(view); });
      } else {
        await applyViewState(view);
      }
    };

    viewBtns.forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => { setView(btn.dataset.view); });
    });

    if (lulcSlider) {
      lulcSlider.addEventListener('input', () => {
        stopLulcPlay();
        setLulcYearIdx(Number(lulcSlider.value));
      });
    }
    if (lulcPlayBtn) {
      lulcPlayBtn.addEventListener('click', () => {
        if (lulcPlayTimer) { stopLulcPlay(); return; }
        lulcPlayBtn.textContent = '❚❚';
        lulcPlayTimer = setInterval(() => {
          if (!lulcSlider) return;
          const max = Number(lulcSlider.max);
          let next = Number(lulcSlider.value) + 1;
          if (next > max) next = 0;
          lulcSlider.value = String(next);
          setLulcYearIdx(next);
        }, 900);
      });
    }

    // Boot into the sensor view (matches the default is-active button).
    setView('sensors');

    hydrated += 1;
  })();

  // Reservoirs card — overlaid lines, % of each reservoir's historical max
  // Hero line is user-selectable via the dropdown; selection also broadcasts
  // a station:highlight event that the stations map listens for.
  (async () => {
    const chart    = document.getElementById('ed-reservoirs-chart');
    const readings = document.getElementById('ed-reservoirs-readings');
    const heroLbl  = document.getElementById('ed-reservoirs-hero-label');
    if (!chart || !readings) return;

    let payloadResv;
    try {
      payloadResv = await fetchDashboard('/data/odemira/reservoirs.json', '/api/regions/odemira/reservoirs');
      if (!payloadResv?.ok || !Array.isArray(payloadResv.features) || !payloadResv.features.length) return;
    } catch { return; }
    const features = payloadResv.features;

    // Drought years: any month with SPI-12 < -1.5 in our archive.
    const droughtYears = new Set();
    const spi = payload.climate && Array.isArray(payload.climate.spi12Series) ? payload.climate.spi12Series : [];
    for (const m of spi) {
      if (typeof m.spi === 'number' && m.spi < -1.5) {
        droughtYears.add(m.date.slice(0, 4));
      }
    }

    // Display window: 1990 → today.
    const XMIN = new Date(Date.UTC(1990, 0, 1)).getTime();
    const XMAX = Date.now();

    // Regional trend: monthly mean pct across all reservoirs reporting that month.
    const meanByMonth = new Map();
    for (const f of features) {
      for (const s of f.series) {
        const key = s.date.slice(0, 7);
        if (!meanByMonth.has(key)) meanByMonth.set(key, []);
        meanByMonth.get(key).push(s.pct);
      }
    }
    const trendSeries = [...meanByMonth.entries()]
      .map(([month, vals]) => ({
        ts: Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7)) - 1, 15),
        pct: vals.reduce((a, b) => a + b, 0) / vals.length,
      }))
      .filter(p => p.ts >= XMIN && p.ts <= XMAX)
      .sort((a, b) => a.ts - b.ts);

    function drawChart(heroId) {
      const W = 1000, H = 280, PAD = { l: 36, r: 14, t: 14, b: 28 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;
      const xFor = ts => PAD.l + ((ts - XMIN) / (XMAX - XMIN)) * cW;
      const yFor = pct => PAD.t + (1 - pct / 100) * cH;

      let bands = '';
      for (const y of droughtYears) {
        const yi = Number(y);
        const x0 = xFor(Date.UTC(yi, 0, 1));
        const x1 = xFor(Date.UTC(yi + 1, 0, 1));
        if (x1 < PAD.l || x0 > W - PAD.r) continue;
        bands += `<rect x="${Math.max(PAD.l, x0).toFixed(1)}" y="${PAD.t}" width="${Math.max(0, Math.min(W - PAD.r, x1) - Math.max(PAD.l, x0)).toFixed(1)}" height="${cH}" fill="#faeeda" opacity="0.55"/>`;
      }

      let grid = '';
      [0, 25, 50, 75, 100].forEach(v => {
        const y = yFor(v);
        grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
        grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v}%</text>`;
      });

      let xLabels = '';
      for (let y = 1990; y <= new Date().getFullYear(); y += 5) {
        const x = xFor(Date.UTC(y, 0, 1));
        if (x < PAD.l || x > W - PAD.r) continue;
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
      }

      // Per-station lines first (faded), hero on top, trend line on top of all.
      const heroColor  = '#1d9e75';
      const otherColor = '#b4b2a9';
      const trendColor = '#b85a3a';
      let lines = '';
      const ordered = [...features].sort((a, b) => (a.externalId === heroId ? 1 : 0) - (b.externalId === heroId ? 1 : 0));
      for (const f of ordered) {
        const isHero = f.externalId === heroId;
        const pts = f.series
          .map(s => {
            const ts = new Date(s.date).getTime();
            if (ts < XMIN || ts > XMAX) return null;
            return `${xFor(ts).toFixed(1)},${yFor(s.pct).toFixed(1)}`;
          })
          .filter(Boolean)
          .join(' ');
        if (!pts) continue;
        lines += `<polyline fill="none" stroke="${isHero ? heroColor : otherColor}" stroke-width="${isHero ? 1.6 : 0.7}" opacity="${isHero ? 1 : 0.35}" points="${pts}" />`;
      }
      const trendPts = trendSeries.map(p => `${xFor(p.ts).toFixed(1)},${yFor(p.pct).toFixed(1)}`).join(' ');
      if (trendPts) {
        lines += `<polyline fill="none" stroke="${trendColor}" stroke-width="2.2" opacity="0.95" points="${trendPts}" />`;
      }

      chart.innerHTML = `${bands}${grid}${xLabels}${lines}`;
    }

    function renderReadings(heroId) {
      readings.innerHTML = features.map(f => {
        const isHero = f.externalId === heroId;
        const latest = f.latest;
        const delta = f.deltaPctPoints;
        const deltaStr = delta != null ? `${delta > 0 ? '+' : ''}${delta} pp y/y` : '—';
        const deltaCls = delta == null ? 'neutral' : delta > 0 ? 'up' : (delta < 0 ? 'down' : 'neutral');
        const displayName = f.displayName || f.code;
        return `
          <button type="button" class="ed-reservoirs-reading${isHero ? ' ed-reservoirs-reading--hero' : ''}" data-external-id="${f.externalId}" aria-pressed="${isHero}">
            <div class="ed-reservoirs-reading-name"><strong>${displayName}</strong></div>
            <div class="ed-reservoirs-reading-pct">${latest ? Math.round(latest.pct) + '%' : '—'}</div>
            <div class="ed-reservoirs-reading-meta">
              <span class="ed-reservoirs-reading-date">Last reading: ${latest?.date || '—'}</span>
              <span class="ed-reservoirs-reading-delta ed-reservoirs-reading-delta--${deltaCls}">${deltaStr}</span>
            </div>
          </button>`;
      }).join('');
      readings.querySelectorAll('.ed-reservoirs-reading').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-external-id');
          applySelection(id === heroId ? null : id);
        });
      });
    }

    function applySelection(heroId) {
      const f = heroId ? (features.find(x => x.externalId === heroId) || null) : null;
      if (heroLbl) heroLbl.textContent = f
        ? (f.displayName || f.code)
        : 'No reservoir selected';
      drawChart(heroId);
      renderReadings(heroId);
      if (f) {
        document.dispatchEvent(new CustomEvent('station:highlight', {
          detail: { source: 'snirh_hidrometrica', externalId: f.externalId },
        }));
      }
    }

    // Default: no station selected — the regional trend line is the focus.
    applySelection(null);
    hydrated += 1;
  })();

  // Groundwater card — same UX as reservoirs but the Y-axis is depth-to-water
  // (m below ground) and is INVERTED — bigger numbers mean a lower water table.
  (async () => {
    const chart    = document.getElementById('ed-groundwater-chart');
    const readings = document.getElementById('ed-groundwater-readings');
    const heroLbl  = document.getElementById('ed-groundwater-hero-label');
    if (!chart || !readings) return;

    let data;
    try {
      data = await fetchDashboard('/data/odemira/groundwater.json', '/api/regions/odemira/groundwater');
      if (!data?.ok || !Array.isArray(data.features) || !data.features.length) return;
    } catch { return; }
    const features = data.features;

    const XMIN = new Date(Date.UTC(1990, 0, 1)).getTime();
    const XMAX = Date.now();
    // Y-axis: depth in m, 0 at top (surface), greater depths going DOWN.
    const allValues = features.flatMap(f => f.series.map(s => s.value));
    const YMAX = Math.max(...allValues);
    const YMIN = Math.min(0, Math.min(...allValues));

    function drawChart(heroId) {
      const W = 1000, H = 280, PAD = { l: 44, r: 14, t: 14, b: 28 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;
      const xFor = ts => PAD.l + ((ts - XMIN) / (XMAX - XMIN)) * cW;
      // Inverted Y: surface (0) at top, max depth at bottom
      const yFor = v => PAD.t + ((v - YMIN) / (YMAX - YMIN)) * cH;

      let grid = '';
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const v = YMIN + ((YMAX - YMIN) * i) / yTicks;
        const y = yFor(v);
        grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
        grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v.toFixed(1)} m</text>`;
      }

      let xLabels = '';
      for (let y = 1990; y <= new Date().getFullYear(); y += 5) {
        const x = xFor(Date.UTC(y, 0, 1));
        if (x < PAD.l || x > W - PAD.r) continue;
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
      }

      const heroColor = '#3d6b8c';
      const otherColor = '#b4b2a9';
      let lines = '';
      const ordered = [...features].sort((a, b) => (a.externalId === heroId ? 1 : 0) - (b.externalId === heroId ? 1 : 0));
      for (const f of ordered) {
        const isHero = f.externalId === heroId;
        const pts = f.series
          .map(s => {
            const ts = new Date(s.date).getTime();
            if (ts < XMIN || ts > XMAX) return null;
            return `${xFor(ts).toFixed(1)},${yFor(s.value).toFixed(1)}`;
          })
          .filter(Boolean)
          .join(' ');
        if (!pts) continue;
        lines += `<polyline fill="none" stroke="${isHero ? heroColor : otherColor}" stroke-width="${isHero ? 1.6 : 0.8}" opacity="${isHero ? 1 : 0.4}" points="${pts}" />`;
      }
      chart.innerHTML = `${grid}${xLabels}${lines}`;
    }

    function renderReadings(heroId) {
      readings.innerHTML = features.map(f => {
        const isHero = f.externalId === heroId;
        const delta = f.deltaM;
        const deltaCls = delta == null ? 'neutral' : delta > 0 ? 'down' : (delta < 0 ? 'up' : 'neutral');
        const deltaStr = delta != null ? `${delta > 0 ? '+' : ''}${delta} m y/y` : '—';
        const displayName = f.displayName || f.code;
        return `
          <button type="button" class="ed-reservoirs-reading${isHero ? ' ed-reservoirs-reading--hero ed-reservoirs-reading--gw' : ''}" data-external-id="${f.externalId}" aria-pressed="${isHero}">
            <div class="ed-reservoirs-reading-name"><strong>${displayName}</strong></div>
            <div class="ed-reservoirs-reading-pct">${f.latest ? f.latest.value.toFixed(2) + ' m' : '—'}</div>
            <div class="ed-reservoirs-reading-meta">
              <span class="ed-reservoirs-reading-date">Last reading: ${f.latest?.date || '—'}</span>
              <span class="ed-reservoirs-reading-delta ed-reservoirs-reading-delta--${deltaCls}">${deltaStr}</span>
            </div>
          </button>`;
      }).join('');
      readings.querySelectorAll('.ed-reservoirs-reading').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-external-id');
          applySelection(id === heroId ? null : id);
        });
      });
    }

    function applySelection(heroId) {
      const f = heroId ? (features.find(x => x.externalId === heroId) || null) : null;
      if (heroLbl) heroLbl.textContent = f ? (f.displayName || f.code) : 'No piezometer selected';
      drawChart(heroId);
      renderReadings(heroId);
      if (f) {
        document.dispatchEvent(new CustomEvent('station:highlight', {
          detail: { source: 'snirh_piezometria', externalId: f.externalId },
        }));
      }
    }
    applySelection(null);
    hydrated += 1;
  })();

  // Rainfall card — annual bars 1940 → today + 1991-2020 normal line
  (async () => {
    const chart      = document.getElementById('ed-rainfall-chart');
    const summaryEl  = document.getElementById('ed-rainfall-summary');
    const normalEl   = document.getElementById('ed-rainfall-normal');
    if (!chart) return;

    let data;
    try {
      data = await fetchDashboard('/data/odemira/rainfall.json', '/api/regions/odemira/rainfall');
      if (!data?.ok || !Array.isArray(data.years) || !data.years.length) return;
    } catch { return; }

    const W = 1000, H = 240, PAD = { l: 44, r: 14, t: 14, b: 28 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;
    const years = data.years;
    const maxMm = Math.max(...years.map(y => y.mm));
    const xFor = i => PAD.l + (i / (years.length - 1)) * cW;
    const yFor = mm => PAD.t + (1 - mm / maxMm) * cH;
    const barW = Math.max(2, cW / years.length - 0.5);

    let grid = '';
    [0, 250, 500, 750, 1000].filter(v => v <= maxMm).forEach(v => {
      const y = yFor(v);
      grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
      grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v}</text>`;
    });

    const bars = years.map((y, i) => {
      const above = data.normal != null && y.mm > data.normal;
      const color = above ? '#7a9ab5' : '#d49a4a';
      const h = (y.mm / maxMm) * cH;
      const x = xFor(i) - barW / 2;
      return `<rect x="${x.toFixed(1)}" y="${(PAD.t + cH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85"><title>${y.year}: ${y.mm} mm</title></rect>`;
    }).join('');

    let normalLine = '';
    if (data.normal != null) {
      const y = yFor(data.normal);
      normalLine = `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1B3A2F" stroke-width="1.2" stroke-dasharray="4,3"/>
        <text x="${(W - PAD.r + 4).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="10" fill="#1B3A2F">${data.normal} mm</text>`;
    }

    let xLabels = '';
    for (let i = 0; i < years.length; i += 10) {
      const x = xFor(i);
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${years[i].year}</text>`;
    }
    const lastX = xFor(years.length - 1);
    xLabels += `<text x="${lastX.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${years[years.length - 1].year}</text>`;

    chart.innerHTML = `${grid}${bars}${normalLine}${xLabels}`;

    if (summaryEl && data.latest) {
      const delta = data.normal != null ? Math.round(data.latest.mm - data.normal) : null;
      summaryEl.innerHTML = `<strong>${data.latest.mm} mm</strong> in ${data.latest.year}${delta != null
        ? ` <span class="ed-rainfall-delta-${delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral'}">${delta > 0 ? '+' : ''}${delta} mm vs normal</span>`
        : ''}`;
    }
    if (normalEl && data.normal != null) normalEl.textContent = String(data.normal);
    hydrated += 1;
  })();

  // Surface water storage by reservoir — stacked area, 6 bands
  (async () => {
    const chart  = document.getElementById('ed-water-stack-chart');
    const legend = document.getElementById('ed-water-stack-legend');
    if (!chart) return;

    let data;
    try {
      data = await fetchDashboard('/data/odemira/reservoirs.json', '/api/regions/odemira/reservoirs');
      if (!data?.ok || !Array.isArray(data.features) || !data.features.length) return;
    } catch { return; }
    const features = data.features;

    // Build a unified monthly time index by walking every series and
    // unioning the months. Each reservoir contributes its actual readings;
    // gaps stay zero so the stack shows when stations come online.
    const monthMap = new Map(); // yyyy-mm -> per-reservoir m³
    for (let ri = 0; ri < features.length; ri++) {
      for (const s of features[ri].series) {
        const key = s.date.slice(0, 7);
        if (!monthMap.has(key)) monthMap.set(key, Array(features.length).fill(0));
        // s.value is normalised pct in the API output — we need raw m³.
        // f.max is the historical max in m³, and s.pct = (value/max)*100,
        // so the underlying m³ = (s.pct / 100) * f.max.
        monthMap.get(key)[ri] = (s.pct / 100) * features[ri].max;
      }
    }
    const months = [...monthMap.keys()].sort();
    // Limit to 1990 → today for legibility (matches the other charts)
    const cutoff = '1990-01';
    const monthsTrimmed = months.filter(m => m >= cutoff);
    if (!monthsTrimmed.length) return;

    // Combined historical max across all reservoirs = the "100%" denominator.
    const combinedMax = features.reduce((s, f) => s + (f.max || 0), 0);
    if (!combinedMax) return;

    const W = 1000, H = 240, PAD = { l: 44, r: 14, t: 14, b: 28 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;
    const xFor = i => PAD.l + (i / (monthsTrimmed.length - 1)) * cW;
    // Y-axis is % of combined historical max — 0 → 100 with a small headroom.
    const yFor = pct => PAD.t + (1 - pct / 100) * cH;

    // Stacked area: bottom-up cumulative, each band expressed as % of combinedMax.
    const palette = ['#1d9e75', '#5dcaa5', '#9fe1cb', '#f0997b', '#d49a4a', '#b4b2a9'];
    let bands = '';
    for (let ri = 0; ri < features.length; ri++) {
      const top = [], bot = [];
      for (let i = 0; i < monthsTrimmed.length; i++) {
        const arr = monthMap.get(monthsTrimmed[i]);
        let above = 0;
        for (let j = 0; j <= ri; j++) above += arr[j] || 0;
        const below = above - (arr[ri] || 0);
        top.push(`${xFor(i).toFixed(1)},${yFor((above / combinedMax) * 100).toFixed(1)}`);
        bot.push(`${xFor(i).toFixed(1)},${yFor((below / combinedMax) * 100).toFixed(1)}`);
      }
      const path = top.join(' ') + ' ' + bot.reverse().join(' ');
      bands += `<polygon points="${path}" fill="${palette[ri % palette.length]}" fill-opacity="0.85"/>`;
    }

    let grid = '';
    [0, 25, 50, 75, 100].forEach(v => {
      const y = yFor(v);
      grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
      grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v}%</text>`;
    });
    let xLabels = '';
    for (let i = 0; i < monthsTrimmed.length; i += 60) {
      const x = xFor(i);
      const year = monthsTrimmed[i].slice(0, 4);
      xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${year}</text>`;
    }
    chart.innerHTML = `${grid}${bands}${xLabels}`;

    if (legend) {
      legend.innerHTML = features.map((f, i) => `
        <span class="ed-water-stack-chip">
          <i style="background:${palette[i % palette.length]}"></i>${f.code}${f.landmark ? ' · ' + f.landmark : ''}
        </span>`).join('');
    }
    hydrated += 1;
  })();

  // Water quality cards — Nitrate (single series + spread) and Heavy metals
  // (one line per element). Both hydrate from /api/regions/odemira/water-quality.
  (async () => {
    const nChart = document.getElementById('ed-wq-nitrate-chart');
    const mChart = document.getElementById('ed-wq-metals-chart');
    if (!nChart && !mChart) return;
    let data;
    try {
      data = await fetchDashboard('/data/odemira/water-quality.json', '/api/regions/odemira/water-quality');
      if (!data?.ok) return;
    } catch { return; }

    const XMIN = new Date(Date.UTC(1990, 0, 1)).getTime();
    const XMAX = Date.now();
    const monthTs = (k) => new Date(`${k}-01T00:00:00Z`).getTime();

    // ── Nitrate ────────────────────────────────────────────
    if (nChart && data.nitrate && data.nitrate.points && data.nitrate.points.length) {
      const pts = data.nitrate.points;
      const W = 1000, H = 220, PAD = { l: 48, r: 14, t: 14, b: 28 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;
      const yVals = pts.flatMap(p => [p.min, p.median, p.max]);
      const yMax = Math.max(50, ...yVals); // include 50 mg/l threshold even if exceeded rarely
      const xFor = ts => PAD.l + ((ts - XMIN) / (XMAX - XMIN)) * cW;
      const yFor = v => PAD.t + (1 - v / yMax) * cH;

      let grid = '';
      const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map(v => Math.round(v));
      for (const v of yTicks) {
        const y = yFor(v);
        grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
        grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v}</text>`;
      }

      // 50 mg/l threshold line
      const yThresh = yFor(50);
      const threshold = `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${yThresh.toFixed(1)}" y2="${yThresh.toFixed(1)}" stroke="#b91c1c" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="${(W - PAD.r + 4).toFixed(1)}" y="${(yThresh + 3).toFixed(1)}" font-size="10" fill="#b91c1c">50</text>`;

      // Min–max spread as a faint band
      const topPts = pts.map(p => `${xFor(monthTs(p.month)).toFixed(1)},${yFor(p.max).toFixed(1)}`);
      const botPts = pts.map(p => `${xFor(monthTs(p.month)).toFixed(1)},${yFor(p.min).toFixed(1)}`).reverse();
      const band = `<polygon points="${topPts.concat(botPts).join(' ')}" fill="#3d6b8c" fill-opacity="0.12"/>`;

      // Median line
      const medianPts = pts.map(p => `${xFor(monthTs(p.month)).toFixed(1)},${yFor(p.median).toFixed(1)}`).join(' ');
      const median = `<polyline fill="none" stroke="#3d6b8c" stroke-width="1.6" points="${medianPts}"/>`;

      let xLabels = '';
      for (let y = 1990; y <= new Date().getFullYear(); y += 5) {
        const x = xFor(Date.UTC(y, 0, 1));
        if (x < PAD.l || x > W - PAD.r) continue;
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
      }

      nChart.innerHTML = `${grid}${threshold}${band}${median}${xLabels}`;

      const stats = document.getElementById('ed-wq-nitrate-stats');
      const latest = pts[pts.length - 1];
      const exceedances = pts.filter(p => p.max > 50).length;
      if (stats && latest) {
        stats.innerHTML = `<strong>${latest.median.toFixed(1)} mg/l</strong> median in ${latest.month}
          · <span class="ed-wq-stats-meta">${exceedances} month${exceedances === 1 ? '' : 's'} with any station above 50 mg/l</span>`;
      }
      hydrated += 1;
    }

    // ── Heavy metals ───────────────────────────────────────
    if (mChart && data.metals && Array.isArray(data.metals.series)) {
      const series = data.metals.series.filter(s => s.points && s.points.length);
      const allPoints = series.flatMap(s => s.points);
      if (allPoints.length) {
        const W = 1000, H = 220, PAD = { l: 60, r: 14, t: 14, b: 28 };
        const cW = W - PAD.l - PAD.r;
        const cH = H - PAD.t - PAD.b;
        const yMax = Math.max(...allPoints.map(p => p.value));
        const xFor = ts => PAD.l + ((ts - XMIN) / (XMAX - XMIN)) * cW;
        const yFor = v => PAD.t + (1 - v / yMax) * cH;
        const palette = ['#3d6b8c', '#b85a3a', '#1d9e75', '#d49a4a', '#8b4789', '#888888'];

        let grid = '';
        const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
        for (const v of yTicks) {
          const y = yFor(v);
          grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
          grid += `<text x="${(PAD.l - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${v.toFixed(3)}</text>`;
        }

        let lines = '';
        for (let i = 0; i < series.length; i++) {
          const s = series[i];
          // Sparse data → use circles plus connecting line.
          const ptStr = s.points.map(p => `${xFor(monthTs(p.month)).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(' ');
          const color = palette[i % palette.length];
          lines += `<polyline fill="none" stroke="${color}" stroke-width="1.2" opacity="0.85" points="${ptStr}"/>`;
          for (const p of s.points) {
            lines += `<circle cx="${xFor(monthTs(p.month)).toFixed(1)}" cy="${yFor(p.value).toFixed(1)}" r="2.4" fill="${color}"><title>${s.label}: ${p.value} ${s.unit} (${p.month}, n=${p.n})</title></circle>`;
          }
        }

        let xLabels = '';
        for (let y = 1990; y <= new Date().getFullYear(); y += 5) {
          const x = xFor(Date.UTC(y, 0, 1));
          if (x < PAD.l || x > W - PAD.r) continue;
          xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
        }

        mChart.innerHTML = `${grid}${lines}${xLabels}`;

        const legend = document.getElementById('ed-wq-metals-legend');
        if (legend) {
          legend.innerHTML = series.map((s, i) => {
            const color = palette[i % palette.length];
            return `<span><i style="background:${color}"></i>${s.label} <small>(${s.count} mo · ${s.stationsContributing} stations)</small></span>`;
          }).join('');
        }
        const stats = document.getElementById('ed-wq-metals-stats');
        if (stats) {
          stats.innerHTML = `${series.length} metals · ${allPoints.length} monthly aggregates`;
        }
        hydrated += 1;
      }
    }
  })();

  // SNIRH panel — populate the four network cards from the stations catalog
  (async () => {
    const grid = document.getElementById('ed-snirh-grid');
    if (!grid) return;
    let stations;
    try {
      const data = await fetchDashboard('/data/odemira/stations.json', '/api/regions/odemira/stations');
      if (!data?.ok || !Array.isArray(data.features)) return;
      stations = data.features;
    } catch { return; }

    const NETWORKS = {
      snirh_piezometria:   { title: 'Piezometers',          subtitle: 'Groundwater level + depth to water', cadence: 'Monthly readings · up to 50-yr history' },
      snirh_hidrometrica:  { title: 'River gauges',         subtitle: 'In-situ river level / discharge',     cadence: 'Daily → monthly · multi-decade' },
      snirh_nascentes:     { title: 'Springs',              subtitle: 'Nascentes (spring outflows)',          cadence: 'Variable cadence · by station' },
      snirh_qualidade_sub: { title: 'Groundwater quality',  subtitle: 'Nitrates, conductivity, pH, …',        cadence: 'Monthly → quarterly campaigns' },
      snirh_meteorologica: { title: 'Weather stations',     subtitle: 'Rainfall, temperature, humidity, wind, evaporation', cadence: 'Hourly → annual · multi-decade' },
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
      const paramArr = [...paramNames];
      const paramShown = paramArr.slice(0, 10);
      const paramOverflow = Math.max(0, paramArr.length - paramShown.length);
      card.querySelector('[data-snirh-params]').innerHTML = paramShown.length
        ? `<span class="ed-snirh-card-pname">Measures</span> ${paramShown.map(n => `<em>${n}</em>`).join(' · ')}${paramOverflow ? ` <span class="ed-snirh-card-overflow">+ ${paramOverflow} more</span>` : ''}`
        : '';
      card.querySelector('[data-snirh-stations]').innerHTML = codes.length
        ? `<span class="ed-snirh-card-pname">Stations</span> ${codes.join(', ')}${overflow ? ` <span class="ed-snirh-card-overflow">+ ${overflow} more</span>` : ''}`
        : '<span class="ed-snirh-card-empty">No stations in Odemira bbox.</span>';
    });
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

  // Biodiversity: wiki ecology cards (stats, articles, sources) + observations-
  // per-year stacked bar chart + Flora & Fauna table fed by iNaturalist data.
  (async () => {
    // ---- Wiki ecology stats ------------------------------------------------
    const ecology = getSectionById('ecology');
    const statsEl = document.getElementById('ed-bio-stats');
    if (statsEl) {
      const total = payload.species?.total;
      const observedTile = Number.isFinite(total)
        ? `<div class="ed-bio-stat">
             <div class="ed-bio-stat-value">${total.toLocaleString()}</div>
             <div class="ed-bio-stat-label">Species observed</div>
             <div class="ed-bio-stat-sub">iNaturalist</div>
           </div>`
        : '';
      const staticTiles = (ecology?.visuals?.stats || []).map(s => `
        <div class="ed-bio-stat">
          <div class="ed-bio-stat-value">${s.value}</div>
          <div class="ed-bio-stat-label">${s.label}</div>
          ${s.sublabel ? `<div class="ed-bio-stat-sub">${s.sublabel}</div>` : ''}
        </div>`).join('');
      statsEl.innerHTML = observedTile + staticTiles;
    }

    // ---- iNaturalist observations: per-year stacked bars + species table --
    let obs;
    try {
      obs = await fetchDashboard('/data/odemira/observations.json', '/api/regions/odemira/observations');
    } catch { obs = null; }

    const svg = document.getElementById('ed-bio-yearbars');
    const legendEl = document.getElementById('ed-bio-yearbars-legend');
    if (svg && obs?.ok && obs.geojson?.features?.length) {
      // Aggregate per (year, iconicTaxon)
      const taxonColor = {
        Plantae:    '#3d6b48',
        Aves:       '#3d6b8c',
        Insecta:    '#c9a14a',
        Mollusca:   '#9d6360',
        Reptilia:   '#b85a3a',
        Amphibia:   '#7a9a6e',
        Arachnida:  '#7a2a14',
        Mammalia:   '#5a4632',
        Actinopterygii: '#5dcaa5',
        Fungi:      '#a89580',
        Chromista:  '#8b9a7e',
        Animalia:   '#b4b2a9',
        Other:      '#cccccc',
      };
      const startYear = 1995;
      const endYear = obs.maxYear || new Date().getFullYear();
      const byYearTaxon = new Map();
      const taxonTotals = new Map();
      for (const f of obs.geojson.features) {
        const y = f.properties?.y;
        if (!Number.isFinite(y) || y < startYear) continue;
        const tx = taxonColor[f.properties?.tx] ? f.properties.tx : 'Other';
        if (!byYearTaxon.has(y)) byYearTaxon.set(y, new Map());
        const m = byYearTaxon.get(y);
        m.set(tx, (m.get(tx) || 0) + 1);
        taxonTotals.set(tx, (taxonTotals.get(tx) || 0) + 1);
      }
      const taxons = [...taxonTotals.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
      const years = [];
      for (let y = startYear; y <= endYear; y++) years.push(y);
      const totals = years.map(y => {
        const m = byYearTaxon.get(y);
        if (!m) return 0;
        return [...m.values()].reduce((a, b) => a + b, 0);
      });
      const maxTotal = Math.max(1, ...totals);

      const W = 1000, H = 280, PAD = { l: 44, r: 14, t: 14, b: 28 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;
      const slot = cW / years.length;
      const barW = Math.min(slot * 0.78, 32);
      const yFor = v => PAD.t + (1 - v / maxTotal) * cH;

      // Y gridlines on nice tick steps
      const niceMax = (() => {
        const exp = Math.pow(10, Math.floor(Math.log10(maxTotal || 1)));
        const n = maxTotal / exp;
        const stepped = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
        return stepped * exp;
      })();
      let grid = '';
      const yTicks = 4;
      for (let i = 0; i <= yTicks; i++) {
        const v = (niceMax / yTicks) * i;
        const y = yFor(v);
        grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
        grid += `<text x="${(PAD.l - 8).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${Math.round(v).toLocaleString()}</text>`;
      }

      // Stacked bars
      let bars = '';
      for (let i = 0; i < years.length; i++) {
        const y = years[i];
        const m = byYearTaxon.get(y);
        if (!m) continue;
        const xCenter = PAD.l + slot * i + slot / 2;
        const x = xCenter - barW / 2;
        let cum = 0;
        for (const t of taxons) {
          const v = m.get(t) || 0;
          if (!v) continue;
          const yTop = yFor(cum + v);
          const yBot = yFor(cum);
          bars += `<rect x="${x.toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${(yBot - yTop).toFixed(1)}" fill="${taxonColor[t]}"><title>${y} · ${t}: ${v}</title></rect>`;
          cum += v;
        }
      }

      let xLabels = '';
      const step = years.length > 20 ? 5 : 2;
      for (let i = 0; i < years.length; i += step) {
        const x = PAD.l + slot * i + slot / 2;
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${years[i]}</text>`;
      }

      svg.innerHTML = `${grid}${bars}${xLabels}`;

      if (legendEl) {
        legendEl.innerHTML = taxons.map(t => `
          <span class="ed-bio-yearbars-chip">
            <i style="background:${taxonColor[t]}"></i>${t} <em>${taxonTotals.get(t).toLocaleString()}</em>
          </span>`).join('');
      }
    }

    // ---- Flora & Fauna quadrants — most observed + most endangered ---------
    const iucnColors = {
      LC: '#5a7256', NT: '#7a9a6e', VU: '#c9a14a',
      EN: '#b85a3a', CR: '#7a2a14', DD: '#888', EW: '#7a2a14', EX: '#000',
    };
    const speciesRow = (sp) => {
      const iucn = sp.iucn;
      const badge = iucn
        ? `<span class="ed-bio-iucn-badge" style="background:${iucnColors[iucn] || '#888'}">${iucn}</span>`
        : (sp.threatened ? `<span class="ed-bio-iucn-badge" style="background:#c9a14a">VU?</span>` : '');
      return `
        <li class="ed-bio-quad-row">
          ${sp.photoUrl ? `<img src="${sp.photoUrl}" alt="" loading="lazy" />` : '<span class="ed-bio-cell-img-empty"></span>'}
          <span class="ed-bio-quad-name">
            <strong>${sp.name || sp.scientificName || '—'}</strong>
            ${sp.scientificName && sp.scientificName !== sp.name ? `<em>${sp.scientificName}</em>` : ''}
          </span>
          <span class="ed-bio-quad-meta">
            ${Number.isFinite(sp.count) ? `<span class="ed-bio-quad-count">${sp.count.toLocaleString()} obs</span>` : ''}
            ${badge}
          </span>
        </li>`;
    };
    const fillQuad = (id, list, emptyMsg) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = (Array.isArray(list) && list.length)
        ? list.map(speciesRow).join('')
        : `<li class="ed-bio-quad-empty">${emptyMsg}</li>`;
    };
    const sp = payload.species || {};
    fillQuad('ed-bio-flora-observed',   sp.floraObserved,   'No flora observations yet.');
    fillQuad('ed-bio-fauna-observed',   sp.faunaObserved,   'No fauna observations yet.');
    fillQuad('ed-bio-flora-endangered', sp.floraEndangered, 'No threatened flora recorded.');
    fillQuad('ed-bio-fauna-endangered', sp.faunaEndangered, 'No threatened fauna recorded.');
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

  // Generic "overlaid annual lines" card hydrator — used by rainfall + pan
  // evaporation. Each station gets a line; the hero is bright + on top, the
  // others muted. Dropdown + click-tile drive hero selection and emit a
  // station:highlight event so the map dot lights up.
  async function hydrateAnnualLinesCard({ endpoint, staticEndpoint, ids, source, unit, decimals = 0 }) {
    const chart    = document.getElementById(ids.chart);
    const select   = document.getElementById(ids.select);
    const readings = ids.readings  ? document.getElementById(ids.readings)  : null;
    const heroLbl  = ids.heroLabel ? document.getElementById(ids.heroLabel) : null;
    const pickerEl = ids.picker    ? document.getElementById(ids.picker)    : null;
    if (!chart || !(readings || pickerEl)) return;

    let data;
    try {
      data = staticEndpoint
        ? await fetchDashboard(staticEndpoint, endpoint)
        : await fetchJson(endpoint);
      if (!data?.ok || !Array.isArray(data.features) || !data.features.length) return;
    } catch { return; }
    const features = data.features;
    const labelFor = (f) => f.displayName || f.code || f.externalId;

    const firstYear = Math.min(...features.map(f => f.first));
    const lastYear  = Math.max(...features.map(f => f.last));
    const yMax = Math.max(...features.flatMap(f => f.series.map(s => s.value))) * 1.1;

    // Regional mean line: year → mean across stations that reported that year.
    const meanByYear = new Map();
    for (let y = firstYear; y <= lastYear; y++) {
      const vals = [];
      for (const f of features) {
        const r = f.series.find(s => s.year === y);
        if (r && Number.isFinite(r.value)) vals.push(r.value);
      }
      if (vals.length) meanByYear.set(y, vals.reduce((a, b) => a + b, 0) / vals.length);
    }
    const meanSeries = [...meanByYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ year, value }));

    if (select) {
      select.disabled = false;
      select.innerHTML = features.map(f =>
        `<option value="${f.externalId}"${f.hero ? ' selected' : ''}>${labelFor(f)} · ${f.count} yr</option>`
      ).join('');
    }
    // Default to the regional mean (no station selected).
    const initialHero = null;

    function drawChart(heroId) {
      const W = 1000, H = 280, PAD = { l: 56, r: 14, t: 14, b: 28 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;
      const xFor = y => PAD.l + ((y - firstYear) / Math.max(1, (lastYear - firstYear))) * cW;
      const yFor = v => PAD.t + (1 - v / yMax) * cH;

      let grid = '';
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const v = (yMax / yTicks) * i;
        const y = yFor(v);
        grid += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#eee5d8" stroke-width="0.5"/>`;
        const label = `${Math.round(v)}${unit ? ' ' + unit : ''}`;
        grid += `<text x="${(PAD.l - 8).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#888">${label}</text>`;
      }
      let xLabels = '';
      const step = (lastYear - firstYear) > 60 ? 20 : 10;
      for (let y = Math.ceil(firstYear / step) * step; y <= lastYear; y += step) {
        const x = xFor(y);
        if (x < PAD.l || x > W - PAD.r) continue;
        xLabels += `<text x="${x.toFixed(1)}" y="${(H - PAD.b + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#888">${y}</text>`;
      }

      const heroColor  = '#1d9e75';
      const otherColor = '#b4b2a9';
      const meanColor  = '#b85a3a'; // terracotta
      let lines = '';
      const ordered = [...features].sort((a, b) => (a.externalId === heroId ? 1 : 0) - (b.externalId === heroId ? 1 : 0));
      for (const f of ordered) {
        const isHero = f.externalId === heroId;
        const pts = f.series.map(s => `${xFor(s.year).toFixed(1)},${yFor(s.value).toFixed(1)}`).join(' ');
        if (!pts) continue;
        lines += `<polyline fill="none" stroke="${isHero ? heroColor : otherColor}" stroke-width="${isHero ? 1.6 : 0.7}" opacity="${isHero ? 1 : 0.35}" points="${pts}" />`;
      }
      const meanPts = meanSeries.map(s => `${xFor(s.year).toFixed(1)},${yFor(s.value).toFixed(1)}`).join(' ');
      if (meanPts) {
        lines += `<polyline fill="none" stroke="${meanColor}" stroke-width="2.2" opacity="0.95" points="${meanPts}" />`;
      }
      chart.innerHTML = `${grid}${xLabels}${lines}`;
    }

    function renderTiles(heroId) {
      if (!readings) return;
      readings.innerHTML = features.map(f => {
        const isHero = f.externalId === heroId;
        const last   = f.series[f.series.length - 1];
        const v      = last ? last.value.toFixed(decimals) : '—';
        const meanV  = f.mean != null ? f.mean.toFixed(decimals) : '—';
        return `
          <button type="button" class="ed-reservoirs-reading${isHero ? ' ed-reservoirs-reading--hero' : ''}" data-external-id="${f.externalId}" aria-pressed="${isHero}">
            <div class="ed-reservoirs-reading-name">
              <strong>${f.displayName || f.code}</strong>
            </div>
            <div class="ed-reservoirs-reading-pct">${v} ${unit}</div>
            <div class="ed-reservoirs-reading-meta">
              <span class="ed-reservoirs-reading-date">${last?.year ?? '—'}</span>
              <span class="ed-reservoirs-reading-delta ed-reservoirs-reading-delta--neutral">mean ${meanV} ${unit}</span>
            </div>
          </button>`;
      }).join('');
      readings.querySelectorAll('.ed-reservoirs-reading').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-external-id');
          applySelection(id === heroId ? null : id);
        });
      });
    }

    function renderPicker(heroId) {
      if (!pickerEl) return;
      pickerEl.innerHTML = `
        <button type="button" class="ed-station-chip${heroId == null ? ' is-active' : ''}" data-external-id="">
          All stations
        </button>` +
        features.map(f => `
          <button type="button" class="ed-station-chip${f.externalId === heroId ? ' is-active' : ''}" data-external-id="${f.externalId}">
            ${f.displayName || f.code || f.externalId}
          </button>`).join('');
      pickerEl.querySelectorAll('.ed-station-chip').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-external-id');
          applySelection(id || null);
        });
      });
    }

    function applySelection(heroId) {
      const f = heroId ? (features.find(x => x.externalId === heroId) || null) : null;
      if (heroLbl) heroLbl.textContent = f ? labelFor(f) : 'Regional mean';
      drawChart(heroId);
      renderTiles(heroId);
      renderPicker(heroId);
      if (f) {
        document.dispatchEvent(new CustomEvent('station:highlight', {
          detail: { source, externalId: f.externalId },
        }));
      }
    }
    if (select) select.addEventListener('change', () => applySelection(select.value || null));
    applySelection(initialHero);
    hydrated += 1;
  }

  hydrateAnnualLinesCard({
    staticEndpoint: '/data/odemira/rainfall-stations.json',
    endpoint: '/api/regions/odemira/rainfall-stations',
    ids: {
      chart: 'ed-met-rainfall-chart',
      select: 'ed-met-rainfall-select',
      picker: 'ed-met-rainfall-stations',
      heroLabel: 'ed-met-rainfall-hero-label',
    },
    source: 'snirh_meteorologica',
    unit: 'mm',
  });

  // ---- Sensor Status button + modal --------------------------------------
  // Pulls /api/regions/odemira/station-status (one row per SNIRH station, with
  // the latest reading timestamp across any parameter + a freshness bucket).
  (async () => {
    const btn   = document.getElementById('ed-sensor-status-btn');
    const modal = document.getElementById('ed-sensor-status-modal');
    if (!btn || !modal) return;

    const dot      = document.getElementById('ed-sensor-status-dot');
    const meta     = document.getElementById('ed-sensor-status-meta');
    const subEl    = document.getElementById('ed-sensor-status-sub');
    const bodyEl   = document.getElementById('ed-sensor-status-body');

    let data = null;
    try {
      data = await fetchDashboard('/data/odemira/station-status.json', '/api/regions/odemira/station-status');
      if (!data?.ok) throw new Error(data?.error || 'unknown');
    } catch (e) {
      if (meta) meta.textContent = 'unavailable';
      console.warn('[sensor-status] fetch failed:', e.message);
      return;
    }

    const c = data.counts || {};
    const onlinePct = c.total ? Math.round((c.online / c.total) * 100) : 0;
    const summary   = `${c.online}/${c.total} online`;
    if (meta) meta.textContent = summary;
    if (dot) {
      // Aggregate dot color: green if >=80% online, amber if >=50%, red otherwise.
      dot.style.background = onlinePct >= 80 ? '#1db073'
        : onlinePct >= 50 ? '#e58a3a' : '#b85a3a';
    }

    const STATUS_META = {
      online: { color: '#1db073', label: 'Online' },
      stale:  { color: '#e58a3a', label: 'Stale' },
      dead:   { color: '#b85a3a', label: 'Dead' },
      never:  { color: '#9aa0a6', label: 'No data' },
    };

    function fmtAge(iso) {
      if (!iso) return 'never';
      const ms = Date.now() - new Date(iso).getTime();
      const days = ms / 86400000;
      if (days < 1) return 'today';
      if (days < 30) return `${Math.round(days)} d ago`;
      if (days < 365) return `${Math.round(days / 30)} mo ago`;
      return `${Math.round(days / 365)} yr ago`;
    }
    function fmtDate(iso) {
      if (!iso) return '—';
      return new Date(iso).toISOString().slice(0, 10);
    }

    // Group stations by type, preserving the sensor-legend ordering.
    const TYPE_ORDER = ['Weather Station', 'River Gauge', 'Piezometer', 'Groundwater Quality', 'Spring'];
    const grouped = {};
    for (const s of data.stations) {
      (grouped[s.type] = grouped[s.type] || []).push(s);
    }
    for (const t of Object.keys(grouped)) {
      grouped[t].sort((a, b) => {
        // Online → stale → dead → never. Within each, recent first.
        const rank = { online: 0, stale: 1, dead: 2, never: 3 };
        const r = rank[a.status] - rank[b.status];
        if (r !== 0) return r;
        return (b.lastReadingAt || '').localeCompare(a.lastReadingAt || '');
      });
    }

    if (subEl) {
      subEl.innerHTML = `
        <span class="ed-modal-pill" style="background:#1db07322;color:#147a52">${c.online} online</span>
        <span class="ed-modal-pill" style="background:#e58a3a22;color:#a26323">${c.stale} stale</span>
        <span class="ed-modal-pill" style="background:#b85a3a22;color:#7d3a22">${c.dead} dead</span>
        <span class="ed-modal-pill" style="background:#9aa0a622;color:#5e6368">${c.never} no data</span>
        <span class="ed-modal-sub-time">Latest reading per station · refreshed ${fmtDate(data.generatedAt)}</span>
      `;
    }
    if (bodyEl) {
      bodyEl.innerHTML = TYPE_ORDER
        .filter(t => grouped[t])
        .map(t => {
          const rows = grouped[t].map(s => {
            const m = STATUS_META[s.status];
            return `
              <li class="ed-sensor-row" data-source="${s.source}" data-external-id="${s.externalId}">
                <span class="ed-sensor-dot" style="background:${m.color}" title="${m.label}"></span>
                <span class="ed-sensor-name">
                  <strong>${s.displayName}</strong>
                  ${s.parish ? `<span>${s.parish}</span>` : ''}
                </span>
                <span class="ed-sensor-age">${fmtAge(s.lastReadingAt)}</span>
                <span class="ed-sensor-date">${fmtDate(s.lastReadingAt)}</span>
              </li>`;
          }).join('');
          return `
            <section class="ed-sensor-group">
              <header class="ed-sensor-group-head">
                <span>${t}</span>
                <span class="ed-sensor-group-count">${grouped[t].length}</span>
              </header>
              <ul class="ed-sensor-list">${rows}</ul>
            </section>`;
        }).join('');
    }

    // Open / close wiring
    const openModal  = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; };
    const closeModal = () => { modal.hidden = true;  document.body.style.overflow = '';      };
    btn.addEventListener('click', openModal);
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

    // Click a row → highlight the matching marker on the satellite map
    bodyEl?.addEventListener('click', (e) => {
      const row = e.target.closest('.ed-sensor-row');
      if (!row) return;
      const source = row.dataset.source;
      const externalId = row.dataset.externalId;
      document.dispatchEvent(new CustomEvent('station:highlight', { detail: { source, externalId } }));
      closeModal();
    });
  })();

  // ---- Add Sensor button + form -----------------------------------------
  (() => {
    const btn   = document.getElementById('ed-add-sensor-btn');
    const modal = document.getElementById('ed-add-sensor-modal');
    const form  = document.getElementById('ed-add-sensor-form');
    const msg   = document.getElementById('ed-add-sensor-msg');
    const submit = document.getElementById('ed-add-sensor-submit');
    if (!btn || !modal || !form) return;

    const openModal  = () => { modal.hidden = false; document.body.style.overflow = 'hidden'; };
    const closeModal = () => { modal.hidden = true;  document.body.style.overflow = '';      };

    btn.addEventListener('click', () => {
      if (msg) { msg.textContent = ''; msg.className = 'ed-form-msg'; }
      form.reset();
      openModal();
    });
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!submit || !msg) return;
      submit.disabled = true;
      msg.textContent = 'Submitting…';
      msg.className = 'ed-form-msg';
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch('/api/regions/odemira/sensor-proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) {
          msg.textContent = j.error || `Submission failed (HTTP ${res.status}).`;
          msg.className = 'ed-form-msg ed-form-msg--error';
          submit.disabled = false;
          return;
        }
        msg.textContent = 'Thanks — a curator will follow up.';
        msg.className = 'ed-form-msg ed-form-msg--ok';
        form.reset();
        setTimeout(() => { closeModal(); submit.disabled = false; }, 1500);
      } catch (err) {
        msg.textContent = err.message || 'Network error.';
        msg.className = 'ed-form-msg ed-form-msg--error';
        submit.disabled = false;
      }
    });
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
        ${section.intro ? `<p class="wiki-section-subtitle">${section.intro}</p>` : ''}

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
