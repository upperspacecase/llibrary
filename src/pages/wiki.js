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

function renderHub() {
  destroyMap();
  const sections = getAllSections();
  const totalSuggestions = sections.reduce((sum, s) => sum + (s.stats?.suggestions || 0), 0);
  const totalComments = sections.reduce((sum, s) => sum + (s.stats?.comments || 0), 0);

  content.innerHTML = `
    <div class="wiki-hub-breadcrumb">
      <a href="/">Commons</a>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      <span>Odemira</span>
    </div>

    <section class="wiki-hub-hero">
      <div class="wiki-hub-hero-left">
        <div class="wiki-hub-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          Bioregion Overview
        </div>
        <h1>Odemira Bioregion</h1>
        <p class="wiki-hub-description">
          ${ODEMIRA.subtitle} — A municipality in the Beja District of Portugal's Alentejo region,
          encompassing approximately ${ODEMIRA.area.toLocaleString()} km² of coastal and inland ecosystems.
        </p>
        <div class="wiki-hub-meta">
          <span class="wiki-hub-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            ${ODEMIRA.population.toLocaleString()} residents
          </span>
          <span class="wiki-hub-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updated 3 days ago by Maria S.
          </span>
        </div>
      </div>
      <div class="wiki-hub-stats">
        <div class="wiki-hub-stats-grid">
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">${ODEMIRA.area}</span>
            <span class="wiki-hub-stat-label">km² area</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">44%</span>
            <span class="wiki-hub-stat-label">protected</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">110 km</span>
            <span class="wiki-hub-stat-label">coastline</span>
          </div>
          <div class="wiki-hub-stat">
            <span class="wiki-hub-stat-value">${sections.length}</span>
            <span class="wiki-hub-stat-label">wiki sections</span>
          </div>
        </div>
        <div class="wiki-hub-stats-footer">
          <span class="wiki-hub-dot wiki-hub-dot-orange"></span>
          <span>${totalSuggestions} suggestions</span>
          <span class="wiki-hub-dot wiki-hub-dot-green"></span>
          <span>${totalComments} comments</span>
        </div>
      </div>
    </section>

    <div class="wiki-hub-grid">
      ${sections.map(s => `
        <a href="#${s.id}" class="wiki-hub-card">
          <div class="wiki-hub-card-image" style="border-top: 3px solid ${s.accentColor || s.color}">
            <img src="/wiki/${s.id}.png" alt="${s.title}" loading="lazy" />
          </div>
          <div class="wiki-hub-card-body">
            <div class="wiki-hub-card-icon" style="color: ${s.accentColor || s.color}">
              ${getIconSvg(s.icon)}
            </div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
          </div>
          <div class="wiki-hub-card-footer">
            <span class="wiki-hub-card-stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
              ${s.stats?.suggestions || 0}
            </span>
            <span class="wiki-hub-card-stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
              ${s.stats?.comments || 0}
            </span>
            <span class="wiki-hub-card-time">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${s.stats?.updatedAgo || 'recently'}
            </span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Section view
// ---------------------------------------------------------------------------

function renderSection(sectionId) {
  destroyMap();
  const section = getSectionById(sectionId);
  if (!section) { renderHub(); return; }

  const stats = section.stats || {};
  const totalSuggestions = stats.suggestions || 0;
  const totalComments = stats.comments || 0;
  const dataAlerts = Math.min(Math.floor(totalSuggestions / 5), 5) || 0;

  content.innerHTML = `
    <!-- Breadcrumb + Help -->
    <div class="wiki-section-topbar">
      <div class="wiki-section-breadcrumb">
        <a href="/">Commons</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        <a href="#hub">Odemira</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        <span>${section.title}</span>
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
        <h1 class="wiki-section-title">${section.title}</h1>
        <p class="wiki-section-subtitle">${section.intro}</p>

        <div class="wiki-section-meta">
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Updated ${stats.updatedAgo || 'recently'}
          </span>
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
            ${totalSuggestions} suggestions
          </span>
          <span class="wiki-section-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            ${totalComments} comments
          </span>
        </div>

        <hr class="wiki-section-divider" />

        <!-- Articles (text selectable for edit toolbar) -->
        <section class="wiki-articles" id="wiki-articles">
          ${section.articles.map(a => `
            <article class="wiki-article" data-article-title="${a.title}">
              <h2>${a.title}</h2>
              <p>${a.content}</p>
            </article>
          `).join('')}
        </section>
        <!-- Map (bioregion only) -->
        ${sectionId === 'bioregion' ? '<div class="wiki-map" id="wiki-section-map" style="height:400px;border-radius:8px;margin:1.5rem 0;"></div>' : ''}

        <!-- Community Contributions -->
        <section class="wiki-contributions" id="wiki-contributions">
          <div class="wiki-contributions-header">
            <h2>Community Contributions</h2>
          </div>
          <div class="wiki-contributions-list" id="contributions-list">
            <div class="loading-block"><span class="loading-spinner"></span> Loading contributions...</div>
          </div>
        </section>
      </div>

      <!-- Right column: Community Notes sidebar -->
      <aside class="wiki-section-aside">
        <div class="wiki-community-notes">
          <h3 class="wiki-community-notes-title">Community Notes</h3>

          <div class="wiki-community-notes-item wiki-community-notes-item--clickable" id="wiki-notes-suggestions" data-type="edit" style="cursor:pointer;">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--suggest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${totalSuggestions} suggestions</strong>
              <span>Pending review</span>
            </div>
            <svg class="wiki-community-notes-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          <div class="wiki-community-notes-item wiki-community-notes-item--clickable" id="wiki-notes-comments" data-type="comment" style="cursor:pointer;">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--comment">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${totalComments} comments</strong>
              <span>Community insights</span>
            </div>
            <svg class="wiki-community-notes-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>

          ${dataAlerts > 0 ? `
          <div class="wiki-community-notes-item wiki-community-notes-item--alert">
            <div class="wiki-community-notes-icon wiki-community-notes-icon--alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div class="wiki-community-notes-text">
              <strong>${dataAlerts} data alerts</strong>
              <span>Needs verification</span>
            </div>
          </div>
          ` : ''}

          <div class="wiki-recent-activity" id="wiki-recent-activity">
            <h4>Recent Activity</h4>
            <div class="wiki-recent-activity-list" id="recent-activity-list">
              <span class="wiki-recent-activity-placeholder">Loading...</span>
            </div>
          </div>
        </div>

        <!-- Live Data (in sidebar) -->
        <div class="wiki-sidebar-data">
          <section class="wiki-data-section" id="wiki-data-section">
            <button class="wiki-data-toggle" id="wiki-data-toggle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Show live data
            </button>
            <div id="wiki-data-content"></div>
          </section>
        </div>
      </aside>
    </div>

    <!-- Text Selection Toolbar (hidden, positioned absolutely) -->
    <div class="wiki-selection-toolbar" id="wiki-selection-toolbar" style="display:none;">
      <button data-action="edit" title="Suggest Edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        Suggest Edit
      </button>
      <button data-action="comment" title="Add Comment">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        Comment
      </button>
      <button data-action="flag" title="Flag Issue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        Flag
      </button>
    </div>

    <!-- Contributions viewer modal (hidden) -->
    <div class="wiki-contrib-viewer-overlay" id="wiki-contrib-viewer-overlay" style="display:none;">
      <div class="wiki-inline-contrib-modal wiki-contrib-viewer-modal">
        <div class="wiki-inline-contrib-header">
          <h3 id="wiki-contrib-viewer-title">Suggestions</h3>
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
          <h3 id="wiki-inline-contrib-title">Suggest Edit</h3>
          <button class="wiki-inline-contrib-close" id="wiki-inline-contrib-close">&times;</button>
        </div>
        <div class="wiki-inline-contrib-body">
          <div class="wiki-inline-contrib-selected" id="wiki-inline-contrib-selected"></div>
          <textarea id="wiki-inline-contrib-text" rows="4" placeholder="Your suggestion or comment..."></textarea>
          <input type="text" id="wiki-inline-contrib-author" placeholder="Your name (optional)" />
        </div>
        <div class="wiki-inline-contrib-footer">
          <button class="wiki-inline-contrib-cancel" id="wiki-inline-contrib-cancel">Cancel</button>
          <button class="wiki-inline-contrib-submit" id="wiki-inline-contrib-submit">Submit</button>
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
    initTextSelectionToolbar(sectionId);
    initContribViewerClicks(sectionId);

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

    // Wire up lazy live-data toggle
    const toggleBtn = document.getElementById('wiki-data-toggle');
    const dataContent = document.getElementById('wiki-data-content');
    if (toggleBtn && dataContent) {
      toggleBtn.addEventListener('click', () => {
        toggleBtn.disabled = true;
        toggleBtn.innerHTML = `<span class="loading-spinner"></span> Loading live data\u2026`;
        loadSectionData(sectionId).then(() => {
          toggleBtn.style.display = 'none';
        }).catch(() => {
          toggleBtn.disabled = false;
          toggleBtn.textContent = 'Retry loading live data';
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
      <p class="wiki-intro">Help build the wiki. Share a story, tip, event, place, or resource about the Odemira bioregion. All fields are optional except your message.</p>
    </section>

    <section class="wiki-contribute-form">
      <form id="contribution-form">
        <div class="field-row">
          <div class="field">
            <label for="contrib-section">Section</label>
            <select id="contrib-section" name="section">
              <option value="">General (no specific section)</option>
              ${sections.map(s => `
                <option value="${s.id}" ${s.id === preselectedSection ? 'selected' : ''}>${s.title}</option>
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
      <h3>Bioregional Knowledge Commons — Contribution Guidelines</h3>

      <h4>Our Purpose</h4>
      <p>The Bioregional Knowledge Commons exists to democratize landscape knowledge. We believe that effective stewardship requires accessible, accurate, and collectively-maintained information about the places we inhabit.</p>

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
      listEl.innerHTML = '<span class="wiki-recent-activity-placeholder">No recent activity</span>';
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
        // Reload contributions
        loadContributions(sectionId);
        loadRecentActivity(sectionId);
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
// Router
// ---------------------------------------------------------------------------

// Track last section for pre-selecting in contribute form
let lastSectionId = null;

function route() {
  const id = currentRoute();
  renderSidebar(id);

  if (id === 'hub' || !getSectionById(id)) {
    renderHub();
  } else {
    lastSectionId = id;
    renderSection(id);
  }
}

window.addEventListener('hashchange', route);

// Initial render
route();
