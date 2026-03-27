/**
 * Landbook App v3.0
 * App shell with 5 views: Dashboard, Map, Chat, Vault, Capture
 * Dashboard has tabs: Overview, Ecosystem, Terrain, Climate
 */

import '../styles/tailwind.css';
import { createMap, mapboxgl, addPolygon, addWmsLayer, fitToCoords } from '../lib/mapbox.js';
import { getLandbook, updateLandbook, createAutoData, createUserReported } from '../lib/store.js';
import { formatArea, formatDistance, polygonBounds, expandBounds, sqmToHectares } from '../lib/geo.js';

import { getForecast, getClimateAverages, getElevation, getWeatherDescription, estimateFrostDates } from '../api/open-meteo.js';
import { getSoilProperties, getSoilClassification, parseSoilProperties, parseSoilClassification, getSoilDescription } from '../api/soilgrids.js';
import { getWaterFeatures, getInfrastructure, extractNodes, extractWays } from '../api/overpass.js';
import { getSpeciesCounts, summarizeSpeciesCounts, getThreatenedSpecies } from '../api/inaturalist.js';
import { getSpeciesOccurrences, summarizeOccurrences } from '../api/gbif.js';
import { CORINE_WMS, getCorineWmsParams, WORLDCOVER_WMS, getWorldCoverWmsParams } from '../api/copernicus.js';
import { EFFIS_WMS, getFireDangerWmsParams, estimateFireRisk } from '../api/effis.js';
import { NATURA2000_WMS, getNatura2000WmsParams, getProtectedAreas } from '../api/natura2000.js';
import { getActiveFiresNearby, summarizeFireDetections } from '../api/nasa-firms.js';
import { getFloodForecastWithHistory, analyzeFloodRisk } from '../api/flood.js';
import { calculateDistances, categorizeAmenities } from '../api/openrouteservice.js';
import { getGeology, parseGeology, getGeologyDescription } from '../api/macrostrat.js';
import { fetchRiskScores } from '../api/risk-scores.js';

// ---------------------------------------------------------------------------
// Nav definitions
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    mobileIcon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    id: 'map',
    label: 'Map',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
    mobileIcon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    mobileIcon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    mobileIcon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  },
  {
    id: 'capture',
    label: 'Capture',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    mobileIcon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  },
];

const DASHBOARD_TABS = ['Overview', 'Ecosystem', 'Terrain', 'Climate'];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let landbook = null;
let activeView = 'dashboard';
let activeDashTab = 'Overview';
let apiResults = {};
let mapInstance = null;
let wmsLayers = {};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const appMain = document.getElementById('app-main');
const loadingView = document.getElementById('loading-view');
const notfoundView = document.getElementById('notfound-view');
const sidebarNav = document.getElementById('sidebar-nav');
const sidebarSubtitle = document.getElementById('sidebar-subtitle');
const mobileNav = document.getElementById('mobile-nav');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return iso || '\u2014'; }
}

function formatDateShort(iso) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

(async () => {
  landbook = id ? await getLandbook(id) : null;

  if (!landbook) {
    loadingView.classList.add('hidden');
    notfoundView.classList.remove('hidden');
    return;
  }

  document.title = `${landbook.address || 'Landbook'} \u2014 LandLibrary`;
  if (sidebarSubtitle) sidebarSubtitle.textContent = landbook.address || 'Untitled Land';

  loadingView.classList.add('hidden');
  renderNav();
  switchView('dashboard');

  // Start data fetch
  if (landbook.center) {
    const [lat, lng] = landbook.center;
    const boundary = landbook.boundary || [];
    const bounds = boundary.length >= 3 ? expandBounds(polygonBounds(boundary), 0.5) : null;
    fetchAllData(landbook, lat, lng, boundary, bounds);
  }
})();

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function renderNav() {
  // Desktop sidebar
  if (sidebarNav) {
    sidebarNav.innerHTML = NAV_ITEMS.map(item => `
      <button data-view="${item.id}" class="flex items-center gap-4 px-4 py-3 w-full text-left rounded-lg transition-colors text-sm ${item.id === activeView ? 'text-earth-900 bg-earth-900/10 font-semibold' : 'text-earth-500 hover:text-earth-900'}">
        <span class="opacity-70">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');

    sidebarNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (btn) switchView(btn.dataset.view);
    });
  }

  // Mobile bottom nav
  if (mobileNav) {
    mobileNav.innerHTML = NAV_ITEMS.map(item => `
      <button data-view="${item.id}" class="flex flex-col items-center gap-1.5 transition-colors ${item.id === activeView ? 'text-earth-900' : 'text-earth-400 hover:text-earth-900'}">
        ${item.mobileIcon}
        <span class="text-[10px] font-medium">${item.label}</span>
      </button>
    `).join('');

    mobileNav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (btn) switchView(btn.dataset.view);
    });
  }
}

function updateNavHighlight() {
  // Desktop
  if (sidebarNav) {
    sidebarNav.querySelectorAll('[data-view]').forEach(btn => {
      const isActive = btn.dataset.view === activeView;
      btn.className = `flex items-center gap-4 px-4 py-3 w-full text-left rounded-lg transition-colors text-sm ${isActive ? 'text-earth-900 bg-earth-900/10 font-semibold' : 'text-earth-500 hover:text-earth-900'}`;
    });
  }
  // Mobile
  if (mobileNav) {
    mobileNav.querySelectorAll('[data-view]').forEach(btn => {
      const isActive = btn.dataset.view === activeView;
      btn.className = `flex flex-col items-center gap-1.5 transition-colors ${isActive ? 'text-earth-900' : 'text-earth-400 hover:text-earth-900'}`;
    });
  }
}

function switchView(viewId) {
  activeView = viewId;
  updateNavHighlight();

  // Hide all views
  NAV_ITEMS.forEach(item => {
    const el = document.getElementById(`view-${item.id}`);
    if (el) el.classList.add('hidden');
  });

  // Show selected
  const viewEl = document.getElementById(`view-${viewId}`);
  if (viewEl) {
    viewEl.classList.remove('hidden');

    // Render if empty
    if (!viewEl.dataset.rendered) {
      viewEl.dataset.rendered = 'true';
      renderView(viewId, viewEl);
    }

    // Special: map needs resize after becoming visible
    if (viewId === 'map' && mapInstance) {
      setTimeout(() => mapInstance.resize(), 100);
    }
  }

  // Scroll to top
  appMain.scrollTop = 0;
}

function renderView(viewId, container) {
  switch (viewId) {
    case 'dashboard': renderDashboard(container); break;
    case 'map': renderMapView(container); break;
    case 'chat': renderChatView(container); break;
    case 'vault': renderVaultView(container); break;
    case 'capture': renderCaptureView(container); break;
  }
}

// ---------------------------------------------------------------------------
// Dashboard View
// ---------------------------------------------------------------------------

function renderDashboard(container) {
  const lb = landbook;
  const ha = lb.area ? sqmToHectares(lb.area) : null;
  const updatedStr = lb.updated ? formatDateShort(lb.updated) : formatDateShort(lb.created);

  container.innerHTML = `
    <div class="max-w-6xl mx-auto px-6 lg:px-12 pt-8 pb-16">
      <!-- Header -->
      <header class="mb-10 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <span class="text-[11px] font-semibold tracking-[0.15em] uppercase text-earth-500 mb-3 block lg:hidden">Property Dashboard</span>
          <h1 class="text-4xl font-serif text-earth-900 mb-1 hidden lg:block">Property Dashboard</h1>
          <h1 class="text-[34px] leading-[1.1] font-serif text-earth-900 mb-4 lg:hidden">${esc(lb.address || 'Untitled Land')}</h1>
          <p class="text-earth-500 flex items-center gap-2 text-[15px]">
            <span class="font-medium text-earth-800 hidden lg:inline">${esc(lb.address || 'Untitled Land')}</span>
            <span class="w-1 h-1 rounded-full bg-earth-400 hidden lg:inline"></span>
            ${ha ? `<span>${ha.toFixed(1)} hectares</span>` : ''}
            ${ha && lb.address ? `<span class="w-1 h-1 rounded-full bg-earth-400"></span>` : ''}
            <span class="flex items-center gap-1.5 lg:hidden">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${esc(lb.address || '')}
            </span>
            ${updatedStr ? `<span class="hidden lg:inline">${esc(lb.address || '')}</span>` : ''}
          </p>
          ${updatedStr ? `<p class="text-earth-500 flex items-center gap-1.5 text-sm mt-1 lg:hidden">Updated ${updatedStr}</p>` : ''}
        </div>
        ${updatedStr ? `
          <div class="text-sm text-earth-500 flex items-center gap-2 pb-1 hidden lg:flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" class="opacity-70"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Last updated: ${formatDate(lb.updated || lb.created)}
          </div>
        ` : ''}
      </header>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-10 border-b border-earth-200 pb-8">
        <!-- Total Area -->
        <div class="relative group">
          <div class="flex items-center gap-2 mb-3 lg:mb-4">
            <div class="w-8 h-8 rounded-full bg-accent-leaf/10 flex items-center justify-center text-accent-leaf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
          <div class="text-[13px] text-earth-500 mb-1 lg:hidden">Total Area</div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl lg:text-4xl font-serif text-earth-900 tracking-tight">${ha ? ha.toFixed(1) : '\u2014'}</span>
            <span class="text-earth-500">ha</span>
          </div>
          <div class="text-sm text-earth-500 mt-2 hidden lg:block">Total Area</div>
        </div>

        <!-- Est. Value -->
        <div class="relative group">
          <div class="flex items-center gap-2 mb-3 lg:mb-4">
            <div class="w-8 h-8 rounded-full bg-accent-terra/10 flex items-center justify-center text-accent-terra">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
          </div>
          <div class="text-[13px] text-earth-500 mb-1 lg:hidden">Est. Value</div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-3xl lg:text-4xl font-serif text-earth-900 tracking-tight">\u2014</span>
          </div>
          <div class="text-sm text-earth-500 mt-2 hidden lg:block">Est. Value</div>
        </div>

        <!-- Bio Score -->
        <div class="relative group">
          <div class="flex items-center gap-2 mb-3 lg:mb-4">
            <div class="w-8 h-8 rounded-full bg-accent-leaf/10 flex items-center justify-center text-accent-leaf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 4 13v-5a2 2 0 0 1 2-2h5a7 7 0 0 1 7 7v5a2 2 0 0 1-2 2h-5z"/><line x1="11" y1="20" x2="11" y2="13"/></svg>
            </div>
          </div>
          <div class="text-[13px] text-earth-500 mb-1 lg:hidden">Bio Score</div>
          <div class="flex items-baseline gap-1.5">
            <span id="kpi-bio-score" class="text-3xl lg:text-4xl font-serif text-earth-900 tracking-tight">\u2014</span>
            <span class="text-earth-500">/100</span>
          </div>
          <div class="text-sm text-earth-500 mt-2 hidden lg:block">Bio Score</div>
        </div>

        <!-- Water Security -->
        <div class="relative group">
          <div class="flex items-center gap-2 mb-3 lg:mb-4">
            <div class="w-8 h-8 rounded-full bg-accent-water/10 flex items-center justify-center text-accent-water">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
            </div>
          </div>
          <div class="text-[13px] text-earth-500 mb-1 lg:hidden">Water Security</div>
          <div class="flex items-baseline gap-1.5">
            <span id="kpi-water-score" class="text-3xl lg:text-4xl font-serif text-earth-900 tracking-tight">\u2014</span>
            <span class="text-earth-500">/10</span>
          </div>
          <div class="text-sm text-earth-500 mt-2 hidden lg:block">Water Security</div>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="flex gap-1 mb-0 border-b border-earth-200/60 overflow-x-auto" id="dash-tabs">
        ${DASHBOARD_TABS.map(tab => `
          <button data-tab="${tab}" class="px-5 py-2.5 whitespace-nowrap transition-all relative -mb-px text-sm ${tab === activeDashTab
            ? 'text-earth-900 font-medium bg-earth-900/10 rounded-t-lg border border-earth-300 border-b-earth-900 border-b-2'
            : 'text-earth-500 hover:text-earth-900 hover:bg-earth-50 rounded-t-lg border border-transparent'}">${tab}</button>
        `).join('')}
      </nav>

      <!-- Tab content -->
      <div class="bg-white border-x border-b border-earth-200/60 rounded-b-lg p-6 lg:p-8 shadow-sm" id="dash-tab-content">
        <!-- Rendered by renderDashTab -->
      </div>
    </div>
  `;

  // Tab click handler
  document.getElementById('dash-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    activeDashTab = btn.dataset.tab;
    updateDashTabs();
    renderDashTab();
  });

  renderDashTab();
}

function updateDashTabs() {
  const tabs = document.getElementById('dash-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('[data-tab]').forEach(btn => {
    const isActive = btn.dataset.tab === activeDashTab;
    btn.className = `px-5 py-2.5 whitespace-nowrap transition-all relative -mb-px text-sm ${isActive
      ? 'text-earth-900 font-medium bg-earth-900/10 rounded-t-lg border border-earth-300 border-b-earth-900 border-b-2'
      : 'text-earth-500 hover:text-earth-900 hover:bg-earth-50 rounded-t-lg border border-transparent'}`;
  });
}

function renderDashTab() {
  const el = document.getElementById('dash-tab-content');
  if (!el) return;

  switch (activeDashTab) {
    case 'Overview': renderOverviewTab(el); break;
    case 'Ecosystem': renderEcosystemTab(el); break;
    case 'Terrain': renderTerrainTab(el); break;
    case 'Climate': renderClimateTab(el); break;
  }
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function renderOverviewTab(el) {
  el.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      <!-- Property Value Composition -->
      <section>
        <h2 class="text-xl font-serif text-earth-900 mb-6">Property Value Composition</h2>
        <div class="flex flex-col items-center justify-center">
          <div class="relative w-48 h-48 lg:w-[280px] lg:h-[280px]">
            <svg viewBox="0 0 200 200" class="w-full h-full transform -rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E3DC" stroke-width="16"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#517A63" stroke-width="16" stroke-dasharray="215 287" stroke-dashoffset="0" class="transition-all duration-1000 ease-out"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#C07C60" stroke-width="16" stroke-dasharray="130 372" stroke-dashoffset="-235" class="transition-all duration-1000 ease-out"/>
              <circle cx="100" cy="100" r="80" fill="none" stroke="#6A9C98" stroke-width="16" stroke-dasharray="60 442" stroke-dashoffset="-380" class="transition-all duration-1000 ease-out"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center lg:hidden">
              <span class="text-xs text-earth-500 uppercase tracking-wider mb-0.5">Total</span>
              <span class="text-xl font-serif text-earth-900">\u2014</span>
            </div>
          </div>
          <div class="flex justify-center gap-6 lg:gap-8 mt-6 lg:mt-10 w-full flex-wrap">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-accent-leaf"></span>
              <span class="text-sm text-earth-800">Market Value</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-accent-terra"></span>
              <span class="text-sm text-earth-500">Natural Capital</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-accent-water"></span>
              <span class="text-sm text-earth-500">Ecosystem Services</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Natural Capital Scorecard -->
      <section>
        <h2 class="text-xl font-serif text-earth-900 mb-6">Natural Capital Scorecard</h2>
        <div class="flex flex-col gap-6 lg:gap-8" id="scorecard">
          ${renderScorecardItem('Water Resources', 'water-resources', '#6A9C98')}
          ${renderScorecardItem('Biodiversity', 'biodiversity', '#517A63')}
          ${renderScorecardItem('Soil Health', 'soil-health', '#C07C60')}
          ${renderScorecardItem('Carbon Storage', 'carbon-storage', '#2D3730')}
          ${renderScorecardItem('Risk Resilience', 'risk-resilience', '#C07C60')}
        </div>
      </section>
    </div>

    <!-- Risk Assessment -->
    <div class="mt-10 pt-8 border-t border-earth-200">
      <h2 class="text-xl font-serif text-earth-900 mb-6">Risk Assessment</h2>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4" id="overview-risk">
        <div class="bg-earth-50 border border-earth-200 rounded-lg p-4 text-center">
          <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">Fire Risk</div>
          <div id="risk-fire-label" class="text-lg font-serif text-earth-900">\u2014</div>
          <div id="risk-fire-score" class="text-xs text-earth-400 mt-1"></div>
        </div>
        <div class="bg-earth-50 border border-earth-200 rounded-lg p-4 text-center">
          <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">Flood Risk</div>
          <div id="risk-flood-label" class="text-lg font-serif text-earth-900">\u2014</div>
          <div id="risk-flood-score" class="text-xs text-earth-400 mt-1"></div>
        </div>
        <div class="bg-earth-50 border border-earth-200 rounded-lg p-4 text-center">
          <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">Drought Risk</div>
          <div id="risk-drought-label" class="text-lg font-serif text-earth-900">\u2014</div>
          <div id="risk-drought-score" class="text-xs text-earth-400 mt-1"></div>
        </div>
      </div>
      <div id="overview-active-fires" class="mt-4"></div>
      <div id="overview-flood-discharge" class="mt-4"></div>
    </div>

    <!-- Nearest Services -->
    <div class="mt-10 pt-8 border-t border-earth-200">
      <h2 class="text-xl font-serif text-earth-900 mb-6">Nearest Services</h2>
      <div id="overview-infrastructure" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <p class="text-earth-400 text-sm col-span-full text-center py-4">Loading...</p>
      </div>
    </div>

    <!-- Water Features -->
    <div class="mt-10 pt-8 border-t border-earth-200">
      <h2 class="text-xl font-serif text-earth-900 mb-6">Water Features</h2>
      <div id="overview-water" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <p class="text-earth-400 text-sm col-span-full text-center py-4">Loading...</p>
      </div>
    </div>
  `;
}

function renderScorecardItem(label, id, color) {
  return `
    <div>
      <div class="flex justify-between items-end mb-2 lg:mb-3">
        <span class="text-earth-800 font-medium text-sm lg:text-base">${label}</span>
        <div class="font-serif">
          <span id="score-${id}" class="text-lg text-earth-900">\u2014</span>
          <span class="text-sm text-earth-500">/100</span>
        </div>
      </div>
      <div class="w-full h-1.5 lg:h-2 bg-earth-200 relative rounded-full overflow-hidden">
        <div id="bar-${id}" class="h-full rounded-full transition-all duration-1000 ease-out" style="width: 0%; background-color: ${color};"></div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Ecosystem Tab
// ---------------------------------------------------------------------------

function renderEcosystemTab(el) {
  el.innerHTML = `<div id="eco-content" class="space-y-8">
    <div class="flex items-center justify-center py-12 text-earth-400">
      <div class="w-6 h-6 border-2 border-earth-300 border-t-earth-600 rounded-full animate-spin mr-3"></div>
      <span class="text-sm">Loading ecosystem data...</span>
    </div>
  </div>`;
  renderEcosystemData();
}

function renderEcosystemData() {
  const el = document.getElementById('eco-content');
  if (!el) return;

  const rs = apiResults.species;
  const rt = apiResults.threatened;
  const rg = apiResults.gbif;
  const rp = apiResults.protectedAreas;

  if (!rs && !rt) return; // not loaded yet

  let html = '';

  if (rs && rs.ok) {
    const summary = summarizeSpeciesCounts(rs.data);
    if (summary.total > 0) {
      html += `<div class="bg-accent-leaf/5 border border-accent-leaf/20 rounded-lg px-4 py-3 text-sm">
        <strong>${summary.total.toLocaleString()} species</strong> observed within 5 km (iNaturalist)
      </div>`;

      const groups = Object.entries(summary.groups).sort((a, b) => b[1] - a[1]);
      if (groups.length) {
        const maxCount = Math.max(...groups.map(([, c]) => c));
        html += `<div>
          <h3 class="text-lg font-serif text-earth-900 mb-4">Species by Group</h3>
          <div class="space-y-3">
            ${groups.map(([g, c]) => {
              const pct = Math.max(Math.round((c / maxCount) * 100), 5);
              return `<div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-earth-800 font-medium">${esc(g)}</span>
                  <span class="text-earth-500">${c} species</span>
                </div>
                <div class="h-2 bg-earth-200 rounded-full overflow-hidden">
                  <div class="h-full bg-accent-leaf rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }

      const top = summary.species.slice(0, 8);
      if (top.length) {
        html += `<div>
          <h3 class="text-lg font-serif text-earth-900 mb-4">Most Observed</h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            ${top.map(sp => `<div class="border border-earth-200 rounded-lg overflow-hidden">
              ${sp.photoUrl ? `<img class="w-full h-28 object-cover" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="w-full h-28 bg-earth-100"></div>'}
              <div class="p-3">
                <div class="font-medium text-sm text-earth-900 truncate">${esc(sp.name)}</div>
                <div class="text-xs text-earth-500 italic truncate">${esc(sp.scientificName)}</div>
                <div class="text-xs text-earth-400 mt-1">${sp.observationCount} obs.</div>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
      }
    }
  }

  if (rt && rt.ok) {
    const summary = summarizeSpeciesCounts(rt.data);
    if (summary.species && summary.species.length > 0) {
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">Threatened Species (10 km)</h3>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          ${summary.species.slice(0, 8).map(sp => `<div class="border border-earth-200 rounded-lg overflow-hidden">
            ${sp.photoUrl ? `<img class="w-full h-28 object-cover" src="${sp.photoUrl}" alt="${esc(sp.name)}" loading="lazy">` : '<div class="w-full h-28 bg-earth-100"></div>'}
            <div class="p-3">
              <div class="font-medium text-sm text-earth-900 truncate">${esc(sp.name)}</div>
              <div class="text-xs text-earth-500 italic truncate">${esc(sp.scientificName)}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    }
  }

  if (rp && rp.ok && rp.data && rp.data.length > 0) {
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Protected Areas Nearby</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-earth-200">
            <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Type</th>
            <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Name</th>
            <th class="text-left py-2 font-semibold text-earth-500 text-xs uppercase tracking-wider">Description</th>
          </tr></thead>
          <tbody>
            ${rp.data.map(pa => `<tr class="border-b border-earth-100">
              <td class="py-2 pr-4 text-earth-500">${esc(pa.type)}</td>
              <td class="py-2 pr-4 font-medium">${esc(pa.nameEn || pa.name)}</td>
              <td class="py-2 text-earth-500">${esc(pa.description)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // GBIF occurrence records
  if (rg && rg.ok && rg.data) {
    const gbifSummary = summarizeOccurrences(rg.data);
    if (gbifSummary.total > 0) {
      const kingdoms = Object.entries(gbifSummary.kingdoms).sort((a, b) => b[1] - a[1]);
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">GBIF Records (10 km)</h3>
        <div class="bg-accent-water/5 border border-accent-water/20 rounded-lg px-4 py-3 text-sm mb-4">
          <strong>${gbifSummary.total.toLocaleString()}</strong> occurrence records in the Global Biodiversity Information Facility
        </div>
        ${kingdoms.length ? `<div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
          ${kingdoms.map(([k, c]) => `<div class="flex justify-between items-center border border-earth-200 rounded-lg px-4 py-3">
            <span class="text-sm font-medium text-earth-800">${esc(k)}</span>
            <span class="text-sm text-earth-500">${c.toLocaleString()}</span>
          </div>`).join('')}
        </div>` : ''}
      </div>`;
    }
  }

  // Bioindicator summary callout
  const totalSpecies = rs && rs.ok ? summarizeSpeciesCounts(rs.data).total : 0;
  const threatenedCount = rt && rt.ok && rt.data ? summarizeSpeciesCounts(rt.data).total : 0;
  if (totalSpecies > 0) {
    const isElevated = threatenedCount > 20;
    html += `<div class="border rounded-lg p-5 ${isElevated ? 'border-amber-300 bg-amber-50' : 'border-accent-leaf/20 bg-accent-leaf/5'}">
      <h4 class="font-medium text-sm text-earth-900 mb-1">Bioindicator Summary</h4>
      <p class="text-sm text-earth-600 leading-relaxed">${totalSpecies.toLocaleString()} species recorded within 5 km. ${threatenedCount > 0 ? threatenedCount + ' threatened species observed within 10 km.' : 'No threatened species detected nearby.'} ${isElevated ? 'Elevated conservation attention may be warranted.' : 'Species diversity appears typical for this region.'}</p>
    </div>`;
  }

  if (!html) {
    html = '<p class="text-earth-400 text-sm py-8 text-center">No ecosystem data available yet.</p>';
  }

  el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Terrain Tab
// ---------------------------------------------------------------------------

function renderTerrainTab(el) {
  el.innerHTML = `<div id="terrain-content" class="space-y-8">
    <div class="flex items-center justify-center py-12 text-earth-400">
      <div class="w-6 h-6 border-2 border-earth-300 border-t-earth-600 rounded-full animate-spin mr-3"></div>
      <span class="text-sm">Loading terrain data...</span>
    </div>
  </div>`;
  renderTerrainData();
}

function renderTerrainData() {
  const el = document.getElementById('terrain-content');
  if (!el) return;

  const re = apiResults.elevation;
  const rs = apiResults.soilProps;
  const rc = apiResults.soilClass;
  const rg = apiResults.geology;

  if (!re && !rs) return;

  let html = '';

  // Elevation
  if (re && re.ok && re.data != null) {
    html += `<div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-earth-50 border border-earth-200 rounded-lg p-4">
        <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">Elevation</div>
        <div class="text-2xl font-serif text-earth-900">${Math.round(re.data)} m</div>
        <div class="text-xs text-earth-400 mt-1">Above sea level (SRTM)</div>
      </div>
    </div>`;
  }

  // Soil
  if (rs && rs.ok) {
    const props = parseSoilProperties(rs.data);
    if (props) {
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">Soil Properties</h3>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          ${soilCard('Texture', props.texture)}
          ${soilCard('pH', props.ph, props.ph ? (parseFloat(props.ph) < 6 ? 'Acidic' : parseFloat(props.ph) > 7.5 ? 'Alkaline' : 'Neutral') : '')}
          ${soilCard('Organic Carbon', props.organicCarbon, 'Top 0-5 cm')}
          ${soilCard('Clay', props.clay)}
          ${soilCard('Sand', props.sand)}
          ${soilCard('Silt', props.silt)}
          ${soilCard('Nitrogen', props.nitrogen)}
          ${soilCard('CEC', props.cec, 'Cation Exchange')}
        </div>
        <p class="text-sm text-earth-500 mt-4 leading-relaxed">${esc(getSoilDescription(props.texture))}</p>
      </div>`;
    }
  }

  if (rc && rc.ok) {
    const cls = parseSoilClassification(rc.data);
    if (cls) {
      html += `<div class="bg-earth-50 border border-earth-200 rounded-lg p-4">
        <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">WRB Classification</div>
        <div class="text-lg font-serif text-earth-900">${esc(cls.primary)}</div>
        ${cls.probability ? `<div class="text-xs text-earth-400 mt-1">${Math.round(cls.probability * 100)}% probability</div>` : ''}
      </div>`;
    }
  }

  // Geology
  if (rg && rg.ok && rg.data) {
    const geo = parseGeology(rg.data);
    if (geo && geo.primary) {
      const p = geo.primary;
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">Geology</h3>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          ${soilCard('Bedrock', p.lithology || 'Unknown', p.age || '')}
          ${soilCard('Formation', p.name || 'Unnamed', p.period || '')}
          ${soilCard('Environment', p.environment || 'Unknown')}
        </div>
        <p class="text-sm text-earth-500 mt-4 leading-relaxed">${esc(getGeologyDescription(geo))}</p>
      </div>`;
    }
  }

  if (!html) {
    html = '<p class="text-earth-400 text-sm py-8 text-center">No terrain data available yet.</p>';
  }

  el.innerHTML = html;
}

function soilCard(label, value, detail) {
  return `<div class="bg-earth-50 border border-earth-200 rounded-lg p-4">
    <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">${esc(label)}</div>
    <div class="text-lg font-serif text-earth-900">${esc(String(value || '\u2014'))}</div>
    ${detail ? `<div class="text-xs text-earth-400 mt-1">${esc(detail)}</div>` : ''}
  </div>`;
}

// ---------------------------------------------------------------------------
// Climate Tab
// ---------------------------------------------------------------------------

function renderClimateTab(el) {
  el.innerHTML = `<div id="climate-content" class="space-y-8">
    <div class="flex items-center justify-center py-12 text-earth-400">
      <div class="w-6 h-6 border-2 border-earth-300 border-t-earth-600 rounded-full animate-spin mr-3"></div>
      <span class="text-sm">Loading climate data...</span>
    </div>
  </div>`;
  renderClimateData();
}

function renderClimateData() {
  const el = document.getElementById('climate-content');
  if (!el) return;

  const rf = apiResults.forecast;
  const rc = apiResults.climate;

  if (!rf && !rc) return;

  let html = '';

  // Current conditions
  if (rf && rf.ok && rf.data) {
    const current = rf.data.current || {};
    const daily = rf.data.daily || {};
    const times = daily.time || [];
    const desc = getWeatherDescription(current.weathercode);

    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Current Conditions</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${soilCard('Temperature', current.temperature_2m != null ? `${current.temperature_2m}\u00B0C` : '\u2014')}
        ${soilCard('Condition', desc)}
        ${soilCard('Humidity', current.relative_humidity_2m != null ? `${current.relative_humidity_2m}%` : '\u2014')}
        ${soilCard('Wind', current.wind_speed_10m != null ? `${current.wind_speed_10m} km/h` : '\u2014')}
      </div>
    </div>`;

    // Wind & atmospheric summary
    const winds = daily.wind_speed_10m_max ? daily.wind_speed_10m_max.filter(v => v != null) : [];
    const uvMax = daily.uv_index_max ? daily.uv_index_max.filter(v => v != null) : [];
    if (winds.length > 0 || uvMax.length > 0) {
      const avgWind = winds.length ? (winds.reduce((s, v) => s + v, 0) / winds.length).toFixed(1) : null;
      const peakWind = winds.length ? Math.max(...winds).toFixed(1) : null;
      const maxUv = uvMax.length ? Math.max(...uvMax).toFixed(1) : null;
      const uvLabel = maxUv ? (parseFloat(maxUv) >= 8 ? 'Very High' : parseFloat(maxUv) >= 6 ? 'High' : parseFloat(maxUv) >= 3 ? 'Moderate' : 'Low') : '';
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">Wind and Atmospheric</h3>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          ${avgWind ? soilCard('Avg Wind Speed', `${avgWind} km/h`, '7-day average') : ''}
          ${peakWind ? soilCard('Peak Gusts', `${peakWind} km/h`, '7-day maximum') : ''}
          ${maxUv ? soilCard('UV Index', maxUv, uvLabel) : ''}
        </div>
      </div>`;
    }

    // 7-day forecast
    if (times.length > 0) {
      html += `<div>
        <h3 class="text-lg font-serif text-earth-900 mb-4">7-Day Forecast</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="border-b border-earth-200">
              <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Day</th>
              <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Condition</th>
              <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">High</th>
              <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Low</th>
              <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Rain</th>
              <th class="text-left py-2 font-semibold text-earth-500 text-xs uppercase tracking-wider">Wind</th>
            </tr></thead>
            <tbody>
              ${times.map((date, i) => {
                const dayName = new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                return `<tr class="border-b border-earth-100">
                  <td class="py-2 pr-4 font-medium">${dayName}</td>
                  <td class="py-2 pr-4 text-earth-500">${esc(getWeatherDescription(daily.weathercode?.[i]))}</td>
                  <td class="py-2 pr-4">${daily.temperature_2m_max?.[i] != null ? `${daily.temperature_2m_max[i]}\u00B0C` : '\u2014'}</td>
                  <td class="py-2 pr-4">${daily.temperature_2m_min?.[i] != null ? `${daily.temperature_2m_min[i]}\u00B0C` : '\u2014'}</td>
                  <td class="py-2 pr-4">${daily.precipitation_sum?.[i] != null ? `${daily.precipitation_sum[i]} mm` : '\u2014'}</td>
                  <td class="py-2">${daily.wind_speed_10m_max?.[i] != null ? `${daily.wind_speed_10m_max[i]} km/h` : '\u2014'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    }
  }

  // Climate averages + chart + seasonal patterns
  if (rc && rc.ok && rc.data) {
    const months = rc.data;
    const frost = estimateFrostDates(months);
    const maxPrecip = Math.max(...months.map(m => m.totalPrecip || 0), 1);
    const maxTemp = Math.max(...months.map(m => m.avgHigh || 0), 1);

    // SVG climate chart
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Climate Profile</h3>
      ${buildClimateSvg(months, maxPrecip, maxTemp)}
      <p class="text-xs text-earth-400 text-center mt-2">30-year average temperature and rainfall (Open-Meteo)</p>
    </div>`;

    // Monthly table
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Monthly Averages</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-earth-200">
            <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Month</th>
            <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">High</th>
            <th class="text-left py-2 pr-4 font-semibold text-earth-500 text-xs uppercase tracking-wider">Low</th>
            <th class="text-left py-2 font-semibold text-earth-500 text-xs uppercase tracking-wider">Rain</th>
          </tr></thead>
          <tbody>
            ${months.map(m => `<tr class="border-b border-earth-100">
              <td class="py-2 pr-4 font-medium">${m.month}</td>
              <td class="py-2 pr-4">${m.avgHigh != null ? `${Math.round(m.avgHigh)}\u00B0C` : '\u2014'}</td>
              <td class="py-2 pr-4">${m.avgLow != null ? `${Math.round(m.avgLow)}\u00B0C` : '\u2014'}</td>
              <td class="py-2">${m.totalPrecip != null ? `${Math.round(m.totalPrecip)} mm` : '\u2014'}</td>
            </tr>`).join('')}
            <tr class="border-t-2 border-earth-900 font-semibold">
              <td class="py-2 pr-4">Annual</td>
              <td class="py-2 pr-4">${Math.round(months.reduce((s, m) => s + (m.avgHigh || 0), 0) / 12)}\u00B0C</td>
              <td class="py-2 pr-4">${Math.round(months.reduce((s, m) => s + (m.avgLow || 0), 0) / 12)}\u00B0C</td>
              <td class="py-2">${Math.round(months.reduce((s, m) => s + (m.totalPrecip || 0), 0))} mm</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;

    // Seasonal patterns
    const seasons = [
      { name: 'Winter', range: 'Dec\u2013Feb', months: [11, 0, 1] },
      { name: 'Spring', range: 'Mar\u2013May', months: [2, 3, 4] },
      { name: 'Summer', range: 'Jun\u2013Aug', months: [5, 6, 7] },
      { name: 'Autumn', range: 'Sep\u2013Nov', months: [8, 9, 10] },
    ];
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Seasonal Patterns</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${seasons.map(s => {
          const sMonths = s.months.map(i => months[i]);
          const avgH = Math.round(sMonths.reduce((a, m) => a + (m.avgHigh || 0), 0) / 3);
          const avgL = Math.round(sMonths.reduce((a, m) => a + (m.avgLow || 0), 0) / 3);
          const rain = Math.round(sMonths.reduce((a, m) => a + (m.totalPrecip || 0), 0));
          const isWet = rain > 150;
          const isHot = avgH > 28;
          return `<div class="border rounded-lg p-4 ${isHot ? 'border-accent-terra/30 bg-accent-terra/5' : isWet ? 'border-accent-water/30 bg-accent-water/5' : 'border-earth-200 bg-earth-50'}">
            <div class="font-medium text-earth-900 text-sm">${s.name}</div>
            <div class="text-xs text-earth-500 mb-2">${s.range}</div>
            <div class="text-sm text-earth-800">${avgL}\u2013${avgH}\u00B0C</div>
            <div class="text-sm text-earth-500">${rain} mm rain</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

    // Frost analysis
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Frost Analysis</h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        ${soilCard('Last Frost', frost?.lastFrost || 'None (frost-free)')}
        ${soilCard('First Frost', frost?.firstFrost || 'None (frost-free)')}
        ${soilCard('Growing Season', frost ? (frost.lastFrost && frost.firstFrost ? `${frost.lastFrost} to ${frost.firstFrost}` : 'Year-round') : '\u2014')}
      </div>
    </div>`;

    // Seasonal risk calendar
    html += `<div>
      <h3 class="text-lg font-serif text-earth-900 mb-4">Seasonal Risk Calendar</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-earth-200">
            <th class="text-left py-2 pr-2 font-semibold text-earth-500 uppercase tracking-wider">Risk</th>
            ${months.map(m => `<th class="text-center py-2 px-1 font-semibold text-earth-500">${m.month}</th>`).join('')}
          </tr></thead>
          <tbody>
            <tr class="border-b border-earth-100">
              <td class="py-2 pr-2 font-medium text-earth-800">Fire</td>
              ${months.map(m => {
                const temp = m.avgHigh || 0;
                const precip = m.totalPrecip || 0;
                const level = (temp > 28 && precip < 15) ? 'High' : (temp > 22 && precip < 40) ? 'Mod' : 'Low';
                const bg = level === 'High' ? 'bg-red-50 text-red-700' : level === 'Mod' ? 'bg-amber-50 text-amber-700' : 'text-earth-400';
                return `<td class="text-center py-2 px-1 ${bg}">${level}</td>`;
              }).join('')}
            </tr>
            <tr class="border-b border-earth-100">
              <td class="py-2 pr-2 font-medium text-earth-800">Flood</td>
              ${months.map(m => {
                const level = (m.totalPrecip || 0) > 80 ? 'Elev.' : 'Low';
                const bg = level !== 'Low' ? 'bg-blue-50 text-blue-700' : 'text-earth-400';
                return `<td class="text-center py-2 px-1 ${bg}">${level}</td>`;
              }).join('')}
            </tr>
            <tr class="border-b border-earth-100">
              <td class="py-2 pr-2 font-medium text-earth-800">Drought</td>
              ${months.map(m => {
                const precip = m.totalPrecip || 0;
                const level = precip < 10 ? 'High' : precip < 30 ? 'Mod' : 'Low';
                const bg = level === 'High' ? 'bg-amber-50 text-amber-700' : level === 'Mod' ? 'bg-amber-50/50 text-amber-600' : 'text-earth-400';
                return `<td class="text-center py-2 px-1 ${bg}">${level}</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-earth-400 mt-2">Derived from 30-year climate data and location factors</p>
    </div>`;
  }

  if (!html) {
    html = '<p class="text-earth-400 text-sm py-8 text-center">No climate data available yet.</p>';
  }

  el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Climate SVG Chart
// ---------------------------------------------------------------------------

function buildClimateSvg(months, maxPrecip, maxTemp) {
  const W = 760, H = 340;
  const pad = { top: 30, right: 60, bottom: 50, left: 50 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const barW = Math.floor(cw / 12) - 6;

  const precipCeil = Math.ceil(maxPrecip / 20) * 20 || 100;
  const tempCeil = Math.ceil(maxTemp / 5) * 5 + 5;
  const pY = (v) => pad.top + ch - (v / precipCeil) * ch;
  const tY = (v) => pad.top + ch - (v / tempCeil) * ch;
  const mX = (i) => pad.left + (i + 0.5) * (cw / 12);

  const bars = months.map((m, i) => {
    const h = ((m.totalPrecip || 0) / precipCeil) * ch;
    const x = mX(i) - barW / 2;
    const y = pad.top + ch - h;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#6A9C98" opacity="0.5" rx="2"/>`;
  }).join('');

  const highPts = months.map((m, i) => `${mX(i)},${tY(m.avgHigh || 0)}`).join(' ');
  const lowPts = months.map((m, i) => `${mX(i)},${tY(m.avgLow || 0)}`).join(' ');
  const areaPath = months.map((m, i) => `${mX(i)},${tY(m.avgHigh || 0)}`).join(' ')
    + ' ' + months.slice().reverse().map((m, i) => `${mX(11 - i)},${tY(m.avgLow || 0)}`).join(' ');

  const tempTicks = [];
  for (let v = 0; v <= tempCeil; v += 5) {
    tempTicks.push(`<line x1="${pad.left}" x2="${pad.left + cw}" y1="${tY(v)}" y2="${tY(v)}" stroke="#E5E3DC" stroke-width="0.5"/>
      <text x="${pad.left - 8}" y="${tY(v) + 4}" text-anchor="end" font-size="10" fill="#6E7C73">${v}</text>`);
  }
  const precipTicks = [];
  for (let v = 0; v <= precipCeil; v += 20) {
    precipTicks.push(`<text x="${pad.left + cw + 8}" y="${pY(v) + 4}" text-anchor="start" font-size="10" fill="#6E7C73">${v}</text>`);
  }

  const xLabels = months.map((m, i) => `<text x="${mX(i)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#6E7C73">${m.month}</text>`).join('');
  const highDots = months.map((m, i) => `<circle cx="${mX(i)}" cy="${tY(m.avgHigh || 0)}" r="3.5" fill="#C07C60" stroke="#fff" stroke-width="1.5"/>`).join('');
  const lowDots = months.map((m, i) => `<circle cx="${mX(i)}" cy="${tY(m.avgLow || 0)}" r="3.5" fill="#517A63" stroke="#fff" stroke-width="1.5"/>`).join('');

  return `<div class="overflow-x-auto">
    <svg viewBox="0 0 ${W} ${H}" class="w-full" style="max-width:${W}px;font-family:Inter,sans-serif;">
      ${tempTicks.join('')}
      ${bars}
      <polygon points="${areaPath}" fill="#C07C60" opacity="0.08"/>
      <polyline points="${highPts}" fill="none" stroke="#C07C60" stroke-width="2.5"/>
      <polyline points="${lowPts}" fill="none" stroke="#517A63" stroke-width="2.5"/>
      ${highDots}
      ${lowDots}
      <line x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${pad.top + ch}" stroke="#2D3730" stroke-width="1"/>
      <line x1="${pad.left}" x2="${pad.left + cw}" y1="${pad.top + ch}" y2="${pad.top + ch}" stroke="#2D3730" stroke-width="1"/>
      <line x1="${pad.left + cw}" x2="${pad.left + cw}" y1="${pad.top}" y2="${pad.top + ch}" stroke="#E5E3DC" stroke-width="0.5"/>
      <text x="${pad.left - 35}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#6E7C73" transform="rotate(-90,${pad.left - 35},${H / 2})">Temperature (\u00B0C)</text>
      <text x="${pad.left + cw + 45}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#6E7C73" transform="rotate(90,${pad.left + cw + 45},${H / 2})">Rainfall (mm)</text>
      ${precipTicks.join('')}
      ${xLabels}
      <rect x="${W - 195}" y="8" width="185" height="56" fill="white" stroke="#E5E3DC" rx="4"/>
      <line x1="${W - 185}" x2="${W - 165}" y1="22" y2="22" stroke="#C07C60" stroke-width="2.5"/>
      <circle cx="${W - 175}" cy="22" r="3" fill="#C07C60"/>
      <text x="${W - 158}" y="26" font-size="10" fill="#2D3730">High Temp (\u00B0C)</text>
      <line x1="${W - 185}" x2="${W - 165}" y1="38" y2="38" stroke="#517A63" stroke-width="2.5"/>
      <circle cx="${W - 175}" cy="38" r="3" fill="#517A63"/>
      <text x="${W - 158}" y="42" font-size="10" fill="#2D3730">Low Temp (\u00B0C)</text>
      <rect x="${W - 185}" y="50" width="16" height="10" fill="#6A9C98" opacity="0.5" rx="1"/>
      <text x="${W - 158}" y="58" font-size="10" fill="#2D3730">Rainfall (mm)</text>
    </svg>
  </div>`;
}

// ---------------------------------------------------------------------------
// Map View
// ---------------------------------------------------------------------------

function renderMapView(container) {
  const boundary = landbook.boundary || [];

  container.innerHTML = `
    <div class="h-full flex flex-col" style="min-height: calc(100vh - 80px);">
      <div id="map-container" class="flex-1 relative">
        <div id="landbook-map" class="w-full h-full"></div>
        <div id="map-layer-toggles" class="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg border border-earth-200 p-3 shadow-sm max-w-xs"></div>
      </div>
    </div>
  `;

  if (boundary.length) {
    initMap(boundary, landbook.center);
  }
}

function initMap(boundary, center) {
  const map = createMap('landbook-map', {
    center: [center[1], center[0]],
    zoom: 11,
    satellite: true,
    scrollZoom: true,
  });

  mapInstance = map;

  map.on('load', () => {
    addPolygon(map, boundary, {
      sourceId: 'boundary',
      fillColor: '#517A63',
      fillOpacity: 0.15,
      lineColor: '#517A63',
      lineWidth: 3,
    });

    fitToCoords(map, boundary, { padding: 120 });

    wmsLayers.corine = addWmsLayer(map, CORINE_WMS, getCorineWmsParams(), { sourceId: 'wms-corine', opacity: 0.5, visible: false });
    wmsLayers.fire = addWmsLayer(map, EFFIS_WMS, getFireDangerWmsParams(), { sourceId: 'wms-fire', opacity: 0.5, visible: false });
    wmsLayers.natura = addWmsLayer(map, NATURA2000_WMS, getNatura2000WmsParams(), { sourceId: 'wms-natura', opacity: 0.5, visible: false });
    wmsLayers.worldcover = addWmsLayer(map, WORLDCOVER_WMS, getWorldCoverWmsParams(), { sourceId: 'wms-worldcover', opacity: 0.6, visible: false });
    wmsLayers.flood = addWmsLayer(map, 'https://globalfloods.eu/geoserver/wms', { layers: 'flood_hazard:T100', format: 'image/png', transparent: true, version: '1.1.1' }, { sourceId: 'wms-flood', opacity: 0.5, visible: false });
    wmsLayers.drought = addWmsLayer(map, 'https://drought.emergency.copernicus.eu/api/wms', { layers: 'CDI', format: 'image/png', transparent: true, version: '1.1.1' }, { sourceId: 'wms-drought', opacity: 0.5, visible: false });

    renderLayerToggles(map);
  });
}

function renderLayerToggles(map) {
  const el = document.getElementById('map-layer-toggles');
  if (!el) return;

  const layers = [
    { key: 'corine', label: 'CORINE Land Cover' },
    { key: 'worldcover', label: 'ESA WorldCover' },
    { key: 'fire', label: 'EFFIS Fire Danger' },
    { key: 'flood', label: 'JRC Flood Hazard' },
    { key: 'natura', label: 'Natura 2000' },
  ];

  el.innerHTML = `<div class="text-xs font-semibold text-earth-500 uppercase tracking-wider mb-2">Layers</div>` +
    layers.map(l => `
      <label class="flex items-center gap-2 cursor-pointer py-1">
        <input type="checkbox" data-layer="${l.key}" class="accent-accent-leaf">
        <span class="text-sm text-earth-800">${l.label}</span>
      </label>
    `).join('');

  el.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb.dataset?.layer) return;
    const info = wmsLayers[cb.dataset.layer];
    if (!info) return;
    map.setLayoutProperty(info.layerId, 'visibility', cb.checked ? 'visible' : 'none');
  });
}

// ---------------------------------------------------------------------------
// Chat View (placeholder for Phase 3)
// ---------------------------------------------------------------------------

function renderChatView(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center h-full min-h-[60vh]">
      <div class="text-center max-w-sm px-6">
        <div class="w-12 h-12 rounded-full bg-accent-leaf/10 flex items-center justify-center text-accent-leaf mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3 class="font-serif text-xl text-earth-900 mb-2">Chat with your Land</h3>
        <p class="text-earth-500 text-sm">Ask questions about your landbook data, get insights, and explore your property's potential. Coming soon.</p>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Vault View (placeholder for Phase 3)
// ---------------------------------------------------------------------------

function renderVaultView(container) {
  container.innerHTML = `
    <div class="max-w-3xl mx-auto px-6 lg:px-12 pt-8 pb-16">
      <h2 class="text-2xl font-serif text-earth-900 mb-6">Knowledge Vault</h2>
      <p class="text-earth-500 text-sm mb-8">Record what you know about your land -- goals, infrastructure, challenges, history.</p>
      <div id="vault-form-container">${renderUserForm(landbook)}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Capture View (placeholder for Phase 4)
// ---------------------------------------------------------------------------

function renderCaptureView(container) {
  container.innerHTML = `
    <div class="flex items-center justify-center h-full min-h-[60vh]">
      <div class="text-center max-w-sm px-6">
        <div class="w-12 h-12 rounded-full bg-accent-terra/10 flex items-center justify-center text-accent-terra mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </div>
        <h3 class="font-serif text-xl text-earth-900 mb-2">Land Capture</h3>
        <p class="text-earth-500 text-sm">Document your land with photos and observations. Coming soon.</p>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// User Form (Vault)
// ---------------------------------------------------------------------------

function renderUserForm(lb) {
  const ur = lb.userReported || createUserReported();
  const goals = ur.goals || {};
  const infra = ur.infrastructure || {};
  const challenges = ur.challenges || [];

  const challengeOptions = ['Water scarcity', 'Fire risk', 'Soil erosion', 'Invasive species', 'Labor', 'Access', 'Bureaucracy', 'Other'];

  const field = (label, id, type, name, placeholder, value) =>
    `<div class="mb-5">
      <label for="${id}" class="block text-sm font-medium text-earth-800 mb-1.5">${label}</label>
      ${type === 'textarea'
        ? `<textarea id="${id}" name="${name}" rows="3" placeholder="${placeholder}" class="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm bg-white focus:outline-none focus:border-earth-500 resize-y">${esc(value || '')}</textarea>`
        : type === 'select'
          ? value // pass the select HTML directly
          : `<input type="text" id="${id}" name="${name}" placeholder="${placeholder}" value="${esc(value || '')}" class="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm bg-white focus:outline-none focus:border-earth-500">`
      }
    </div>`;

  return `
    <form id="user-reported-form" class="space-y-1">
      ${field('Primary Land Use', 'primary-use', 'select', 'primaryUse', '', `
        <select id="primary-use" name="primaryUse" class="w-full px-3 py-2 border border-earth-200 rounded-lg text-sm bg-white focus:outline-none focus:border-earth-500">
          <option value="">Select primary use...</option>
          ${['dryland agriculture', 'plantation', 'forest', 'residential', 'tourists', 'undeveloped', 'other']
            .map(v => `<option value="${v}" ${ur.primaryUse === v ? 'selected' : ''}>${esc(v.charAt(0).toUpperCase() + v.slice(1))}</option>`).join('')}
        </select>`)}
      ${field('Secondary Use', 'secondary-use', 'text', 'secondaryUse', 'e.g., beekeeping, foraging', ur.secondaryUse)}

      <div class="mb-5">
        <label class="block text-sm font-medium text-earth-800 mb-1.5">Current Challenges</label>
        <div class="flex flex-wrap gap-2">
          ${challengeOptions.map(ch => {
            const val = ch.toLowerCase();
            const checked = challenges.map(c => c.toLowerCase()).includes(val) ? 'checked' : '';
            return `<label class="flex items-center gap-1.5 px-3 py-1.5 border border-earth-200 rounded-full text-sm cursor-pointer hover:border-earth-400 has-[:checked]:bg-accent-leaf/10 has-[:checked]:border-accent-leaf/30">
              <input type="checkbox" name="challenges" value="${val}" ${checked} class="sr-only">
              ${esc(ch)}
            </label>`;
          }).join('')}
        </div>
      </div>

      ${field('Goals - 1 Year', 'goals-1yr', 'textarea', 'goalsOneYear', 'What do you want to accomplish?', goals.oneYear)}
      ${field('Goals - 3 Years', 'goals-3yr', 'textarea', 'goalsThreeYear', 'Where do you see this land?', goals.threeYear)}
      ${field('Goals - 5 Years', 'goals-5yr', 'textarea', 'goalsFiveYear', 'Long-term vision?', goals.fiveYear)}

      <div class="grid grid-cols-2 gap-4">
        ${field('Irrigation', 'infra-irrigation', 'text', 'irrigation', 'e.g., drip, well, none', infra.irrigation)}
        ${field('Energy', 'infra-energy', 'text', 'energy', 'e.g., solar, grid', infra.energy)}
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${field('Water Sources', 'infra-water', 'text', 'waterSources', 'e.g., borehole, rainwater', infra.waterSources)}
        ${field('Buildings', 'infra-buildings', 'text', 'buildings', 'e.g., ruin, barn, none', infra.buildings)}
      </div>

      ${field('What have you figured out worth sharing?', 'sharing', 'textarea', 'sharing', 'Techniques, discoveries...', ur.sharing)}
      ${field('History of your land', 'history', 'textarea', 'history', 'Previous uses, stories...', ur.history)}
      ${field('Additional Notes', 'notes', 'textarea', 'notes', 'Anything else...', ur.notes)}

      <button type="submit" class="w-full py-3 bg-earth-900 text-white rounded-lg font-medium text-sm hover:opacity-80 transition-opacity">Save Your Knowledge</button>
      <div id="save-feedback" class="mt-3 text-sm"></div>
    </form>
  `;
}

// Form submission
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
    goals: { oneYear: val('goalsOneYear'), threeYear: val('goalsThreeYear'), fiveYear: val('goalsFiveYear') },
    infrastructure: { irrigation: val('irrigation'), energy: val('energy'), waterSources: val('waterSources'), buildings: val('buildings') },
    sharing: val('sharing'),
    history: val('history'),
    notes: val('notes'),
  };

  try {
    await updateLandbook(landbook.id, { userReported });
    const fb = document.getElementById('save-feedback');
    if (fb) { fb.innerHTML = '<span class="text-accent-leaf font-semibold">Saved successfully.</span>'; setTimeout(() => { fb.innerHTML = ''; }, 3000); }
  } catch (err) {
    console.error('Save failed:', err);
    const fb = document.getElementById('save-feedback');
    if (fb) { fb.innerHTML = '<span class="text-accent-terra font-semibold">Save failed. Please try again.</span>'; }
  }
}

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

function fetchAllData(lb, lat, lng, boundary, bounds) {
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
    { key: 'riskScores', fn: () => fetchRiskScores(lat, lng) },
  ];

  let completed = 0;

  tasks.forEach(t =>
    t.fn()
      .then(data => { apiResults[t.key] = { ok: true, data }; })
      .catch(err => { apiResults[t.key] = { ok: false, error: String(err) }; })
      .finally(() => {
        completed++;
        onDataUpdate(t.key);
        if (completed === tasks.length) {
          persistResults(lb);
        }
      })
  );
}

function onDataUpdate(key) {
  // Update KPIs
  updateKPIs();

  // Update scorecard
  updateScorecard();

  // Update overview risk/infrastructure sections
  updateOverviewRisk(key);
  updateOverviewInfrastructure(key);
  updateOverviewWater(key);

  // Re-render active tab if its data arrived
  const tabDataMap = {
    'Ecosystem': ['species', 'threatened', 'gbif', 'protectedAreas'],
    'Terrain': ['elevation', 'soilProps', 'soilClass', 'geology'],
    'Climate': ['forecast', 'climate'],
  };

  for (const [tab, keys] of Object.entries(tabDataMap)) {
    if (keys.includes(key) && activeDashTab === tab) {
      renderDashTab();
    }
  }
}

// ---------------------------------------------------------------------------
// Overview: Risk, Infrastructure, Water
// ---------------------------------------------------------------------------

function updateOverviewRisk(key) {
  if (key !== 'riskScores' && key !== 'activeFires' && key !== 'flood') return;

  // Risk scores
  const rr = apiResults.riskScores;
  if (rr && rr.ok && rr.data) {
    const setRisk = (id, score, label) => {
      const labelEl = document.getElementById(`risk-${id}-label`);
      const scoreEl = document.getElementById(`risk-${id}-score`);
      if (labelEl) labelEl.textContent = label;
      if (scoreEl) scoreEl.textContent = `${score}/100`;
    };
    setRisk('fire', rr.data.fire, rr.data.fireLabel);
    setRisk('flood', rr.data.flood, rr.data.floodLabel);
    setRisk('drought', rr.data.drought, rr.data.droughtLabel);
  }

  // Active fires
  const af = apiResults.activeFires;
  if (af && key === 'activeFires') {
    const el = document.getElementById('overview-active-fires');
    if (!el) return;
    if (af.ok) {
      const fires = af.data || [];
      const summary = summarizeFireDetections(fires);
      if (summary.count === 0) {
        el.innerHTML = `<div class="bg-accent-leaf/5 border border-accent-leaf/20 rounded-lg px-4 py-3 text-sm">
          No active fires detected within 50 km in the last 48 hours (NASA VIIRS)
        </div>`;
      } else {
        el.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <strong>${summary.count} fire detection${summary.count > 1 ? 's' : ''}</strong> within 50 km (NASA VIIRS, last 48h)
          ${summary.highConfidence ? ` \u2014 ${summary.highConfidence} high confidence` : ''}
        </div>`;
      }
    }
  }

  // Flood discharge
  const fl = apiResults.flood;
  if (fl && key === 'flood') {
    const el = document.getElementById('overview-flood-discharge');
    if (!el) return;
    if (fl.ok && fl.data) {
      const analysis = analyzeFloodRisk(fl.data);
      el.innerHTML = `<div class="grid grid-cols-3 gap-4">
        ${soilCard('Current Discharge', `${analysis.current} m\u00B3/s`)}
        ${soilCard('30-day Avg', `${analysis.average} m\u00B3/s`)}
        ${soilCard('Status', analysis.level, `${analysis.ratio}x average`)}
      </div>`;
    }
  }
}

function updateOverviewInfrastructure(key) {
  if (key !== 'infrastructure') return;
  const el = document.getElementById('overview-infrastructure');
  if (!el) return;

  const r = apiResults.infrastructure;
  if (!r || !r.ok || !r.data) {
    el.innerHTML = '<p class="text-earth-400 text-sm col-span-full text-center py-4">No infrastructure data available.</p>';
    return;
  }

  const nodes = extractNodes(r.data);
  if (nodes.length === 0) {
    el.innerHTML = '<p class="text-earth-400 text-sm col-span-full text-center py-4">No nearby services found.</p>';
    return;
  }

  const [lat, lng] = landbook.center;
  const amenities = nodes.map(n => ({
    lat: n.lat, lng: n.lon,
    name: n.tags?.name || n.tags?.amenity || n.tags?.shop || n.tags?.tourism || 'Unnamed',
    type: n.tags?.amenity || n.tags?.shop || n.tags?.tourism || 'other',
    tags: n.tags,
  }));

  const withDistances = calculateDistances([lat, lng], amenities);
  const nearestByCategory = {};
  withDistances.forEach(a => {
    const cat = getCategoryKey(a);
    if (!nearestByCategory[cat] || a.distanceKm < nearestByCategory[cat].distanceKm) {
      nearestByCategory[cat] = a;
    }
  });

  const items = Object.entries(nearestByCategory).slice(0, 6);
  if (items.length === 0) {
    el.innerHTML = '<p class="text-earth-400 text-sm col-span-full text-center py-4">No nearby services found.</p>';
    return;
  }

  el.innerHTML = items.map(([cat, a]) => `
    <div class="bg-earth-50 border border-earth-200 rounded-lg p-4">
      <div class="text-xs text-earth-500 uppercase tracking-wider mb-1">${esc(cat)}</div>
      <div class="text-sm font-medium text-earth-900 truncate">${esc(a.name)}</div>
      <div class="text-sm text-earth-500 mt-1">${a.distanceKm.toFixed(1)} km</div>
    </div>
  `).join('');
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

function updateOverviewWater(key) {
  if (key !== 'water') return;
  const el = document.getElementById('overview-water');
  if (!el) return;

  const r = apiResults.water;
  if (!r || !r.ok || !r.data) {
    el.innerHTML = '<p class="text-earth-400 text-sm col-span-full text-center py-4">No water data available.</p>';
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
    el.innerHTML = '<p class="text-earth-400 text-sm col-span-full text-center py-4">No water features found nearby.</p>';
    return;
  }

  el.innerHTML = `
    ${soilCard('Rivers', String(rivers.length), rivers.slice(0, 3).map(r => r.tags.name || 'Unnamed').join(', ') || '')}
    ${soilCard('Streams', String(streams.length))}
    ${soilCard('Water Bodies', String(waterBodies.length))}
    ${soilCard('Wells', String(wells.length))}
    ${soilCard('Springs', String(springs.length))}
  `;
}

function updateKPIs() {
  // Bio Score: based on species count (rough: log scale, 500 species = 80, 1000+ = 95)
  const rs = apiResults.species;
  if (rs && rs.ok) {
    const summary = summarizeSpeciesCounts(rs.data);
    const total = summary.total;
    const score = total > 0 ? Math.min(100, Math.round(20 * Math.log10(total + 1))) : 0;
    const el = document.getElementById('kpi-bio-score');
    if (el) el.textContent = String(score);
  }

  // Water Security: based on water features + flood risk
  const rw = apiResults.water;
  const rr = apiResults.riskScores;
  if (rw || rr) {
    let waterScore = 5; // baseline
    if (rw && rw.ok && rw.data) {
      const nodes = extractNodes(rw.data);
      const ways = extractWays(rw.data);
      const features = ways.filter(w => w.tags && (w.tags.waterway || w.tags.natural === 'water')).length
        + nodes.filter(n => n.tags && (n.tags.natural === 'spring' || n.tags.man_made === 'water_well')).length;
      waterScore = Math.min(10, 3 + features * 0.5);
    }
    if (rr && rr.ok && rr.data) {
      // Low flood risk = good, low drought risk = good
      const droughtPenalty = (rr.data.drought || 0) / 100 * 3;
      waterScore = Math.max(1, waterScore - droughtPenalty);
    }
    const el = document.getElementById('kpi-water-score');
    if (el) el.textContent = waterScore.toFixed(1);
  }
}

function updateScorecard() {
  // Water Resources
  const rw = apiResults.water;
  if (rw) {
    let score = 50;
    if (rw.ok && rw.data) {
      const ways = extractWays(rw.data);
      const nodes = extractNodes(rw.data);
      const features = ways.filter(w => w.tags && (w.tags.waterway || w.tags.natural === 'water')).length
        + nodes.filter(n => n.tags && (n.tags.natural === 'spring' || n.tags.man_made === 'water_well')).length;
      score = Math.min(100, 40 + features * 5);
    }
    setScore('water-resources', score);
  }

  // Biodiversity
  const rs = apiResults.species;
  if (rs && rs.ok) {
    const total = summarizeSpeciesCounts(rs.data).total;
    const score = total > 0 ? Math.min(100, Math.round(20 * Math.log10(total + 1))) : 0;
    setScore('biodiversity', score);
  }

  // Soil Health
  const rsp = apiResults.soilProps;
  if (rsp && rsp.ok) {
    const props = parseSoilProperties(rsp.data);
    let score = 60;
    if (props) {
      const ph = parseFloat(props.ph);
      if (ph >= 5.5 && ph <= 7.5) score += 15;
      const oc = parseFloat(props.organicCarbon);
      if (oc > 20) score += 15;
      else if (oc > 10) score += 10;
    }
    setScore('soil-health', Math.min(100, score));
  }

  // Carbon Storage
  if (rsp && rsp.ok) {
    const props = parseSoilProperties(rsp.data);
    let score = 50;
    if (props) {
      const oc = parseFloat(props.organicCarbon);
      if (oc > 30) score = 90;
      else if (oc > 20) score = 75;
      else if (oc > 10) score = 60;
    }
    setScore('carbon-storage', score);
  }

  // Risk Resilience (inverse of risk scores)
  const rr = apiResults.riskScores;
  if (rr && rr.ok && rr.data) {
    const avgRisk = ((rr.data.fire || 0) + (rr.data.drought || 0) + (rr.data.flood || 0)) / 3;
    const resilience = Math.round(100 - avgRisk);
    setScore('risk-resilience', resilience);
  }
}

function setScore(id, value) {
  const scoreEl = document.getElementById(`score-${id}`);
  const barEl = document.getElementById(`bar-${id}`);
  if (scoreEl) scoreEl.textContent = String(Math.round(value));
  if (barEl) barEl.style.width = `${Math.round(value)}%`;
}

async function persistResults(lb) {
  if (!lb || !lb.id) return;
  try {
    const autoData = { lastFetched: new Date().toISOString() };
    for (const [key, val] of Object.entries(apiResults)) {
      if (val.ok) autoData[key] = val.data;
    }
    await updateLandbook(lb.id, { autoData });
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}
