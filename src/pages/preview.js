/**
 * Preview Report Page
 * A free 3-section preview: Overview → Map → Elevation & Terrain
 * Shows a CTA to upgrade to a full LandBook.
 */

import '../styles/main.css';
import { createMap, addPolygon, fitToCoords, addWmsLayer } from '../lib/mapbox.js';
import { initI18n } from '../lib/i18n.js';
import { getLandbook } from '../lib/store.js';
import { formatArea, formatDistance, sqmToHectares } from '../lib/geo.js';
import { getElevation } from '../api/open-meteo.js';
import { getGeology, parseGeology, getGeologyDescription } from '../api/macrostrat.js';
import { getAdminUnit, formatAdminUnit } from '../api/dgt.js';
import { CORINE_WMS, getCorineWmsParams } from '../api/copernicus.js';

initI18n();

// ---------------------------------------------------------------------------
// Section definitions (preview = 3 sections + upgrade CTA)
// ---------------------------------------------------------------------------
const SECTION_DEFS = [
    { id: 'overview', icon: '\u{1F4CB}', label: 'Overview' },
    { id: 'map', icon: '\u{1F5FA}', label: 'Map' },
    { id: 'elevation', icon: '\u26F0', label: 'Elevation & Terrain' },
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
        <h3>Preview not found</h3>
        <p>This preview does not exist or may have been removed.</p>
        <a href="/create.html" class="btn-primary">Create a New LandBook</a>
      </div>`;
        if (sidebar) sidebar.innerHTML = '';
        return;
    }

    document.title = `Preview — ${landbook.address || 'Landbook'}`;
    renderSidebar();
    renderPreviewReport(landbook);
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
  `).join('') + `
    <a class="landbook-nav-link" data-section="upgrade" href="#section-upgrade" style="color:var(--coral);font-weight:600;">
      <span class="nav-icon">\u{1F513}</span>
      <span class="nav-label">Unlock Full Report</span>
    </a>
  `;

    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('.landbook-nav-link');
        if (!link) return;
        e.preventDefault();
        const target = document.getElementById(`section-${link.dataset.section}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (sidebarActions) {
        sidebarActions.innerHTML = `
      <a href="/create.html" class="btn-sidebar" style="background:var(--coral);color:var(--cream);border-color:var(--coral);text-align:center;display:block;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:600;font-size:14px;">
        \u{1F4D6} Get Full LandBook
      </a>
    `;
    }
}

// ---------------------------------------------------------------------------
// Main report render
// ---------------------------------------------------------------------------
function renderPreviewReport(lb) {
    const boundary = lb.boundary || [];
    const center = lb.center;
    const area = lb.area;
    const perimeter = lb.perimeter;
    const ha = area ? sqmToHectares(area) : null;

    // Locked section labels for the CTA
    const lockedSections = [
        { icon: '\u{1F33E}', label: 'Soil' },
        { icon: '\u{1F4A7}', label: 'Water Features' },
        { icon: '\u2601', label: 'Weather & Climate' },
        { icon: '\u{1F33F}', label: 'Biodiversity' },
        { icon: '\u{1F525}', label: 'Fire Risk' },
        { icon: '\u2696', label: 'Protected Areas' },
        { icon: '\u270D', label: 'Your Knowledge' },
    ];

    container.innerHTML = `
    <!-- Preview badge -->
    <div style="background:var(--coral);color:var(--cream);text-align:center;padding:12px 20px;font-size:14px;font-weight:600;border-radius:8px;margin-bottom:24px;">
      \u{1F50D} Free Preview — 3 of 10 sections. <a href="/create.html" style="color:var(--cream);text-decoration:underline;">Get the full LandBook →</a>
    </div>

    <!-- 1. Overview -->
    <div class="landbook-section" id="section-overview">
      <div class="landbook-header">
        <div class="section-label">Preview Report</div>
        <h1>${esc(lb.address || 'Untitled Parcel')}</h1>
        <div class="landbook-meta">
          ${lb.created ? `<span><strong>Created</strong>: ${formatDate(lb.created)}</span>` : ''}
          ${area ? `<span><strong>Area</strong>: ${formatArea(area)}${ha ? ` (${ha.toFixed(2)} ha)` : ''}</span>` : ''}
          ${perimeter ? `<span><strong>Perimeter</strong>: ${formatDistance(perimeter)}</span>` : ''}
          ${center ? `<span><strong>Center</strong>: ${center[0].toFixed(5)}, ${center[1].toFixed(5)}</span>` : ''}
        </div>
        <div id="data-admin" class="data-sub-section"></div>
      </div>
    </div>

    <!-- 2. Map -->
    <div class="landbook-section" id="section-map">
      <h2>Map</h2>
      ${boundary.length ? `
        <div class="landbook-map"><div id="landbook-map" style="width:100%;height:100%;"></div></div>
      ` : '<p style="color:var(--muted);">No boundary data available.</p>'}
    </div>

    <!-- 3. Elevation -->
    <div class="landbook-section" id="section-elevation">
      <h2>Elevation & Terrain</h2>
      ${skeleton('data-elevation')}
      <div id="data-geology" class="data-sub-section"></div>
    </div>

    <!-- Upgrade CTA -->
    <div class="landbook-section" id="section-upgrade" style="text-align:center;padding:60px 40px;">
      <h2 style="font-family:'DM Serif Display',serif;font-size:32px;margin-bottom:16px;">Unlock the full LandBook</h2>
      <p style="color:var(--muted);font-size:16px;max-width:520px;margin:0 auto 32px;line-height:1.6;">
        Your preview shows 3 of 10 sections. The full LandBook includes soil analysis, water features,
        weather & climate, biodiversity, fire risk, protected areas, and your own notes.
      </p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-bottom:40px;">
        ${lockedSections.map(s => `
          <div style="display:flex;align-items:center;gap:8px;padding:10px 18px;border:1.5px solid var(--card-border);border-radius:50px;font-size:14px;opacity:0.6;">
            <span>\u{1F512}</span>
            <span>${s.icon} ${esc(s.label)}</span>
          </div>
        `).join('')}
      </div>
      <a href="/create.html" class="btn-pill-primary" style="background:var(--coral);color:var(--cream);border-color:var(--coral);font-size:16px;padding:16px 40px;">
        Get Full LandBook
      </a>
    </div>
  `;

    // Init map
    if (boundary.length) initMap(boundary, center);

    // Fetch data for the 3 preview sections
    if (center) {
        fetchPreviewData(lb, center[0], center[1]);
    }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------
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

        addWmsLayer(map, CORINE_WMS, getCorineWmsParams(), {
            sourceId: 'wms-corine', opacity: 0.5, visible: false,
        });
    });
}

// ---------------------------------------------------------------------------
// Preview data fetch (only elevation, geology, admin)
// ---------------------------------------------------------------------------
function fetchPreviewData(lb, lat, lng) {
    // Elevation
    getElevation(lat, lng)
        .then(data => {
            const el = document.getElementById('data-elevation');
            if (!el) return;
            if (data != null) {
                el.innerHTML = `<div class="data-grid">
          ${dataCard('Elevation', `${Math.round(data)} m`, 'Meters above sea level (SRTM)')}
        </div>`;
            } else {
                el.innerHTML = errorBlock('Elevation data unavailable.');
            }
        })
        .catch(() => {
            const el = document.getElementById('data-elevation');
            if (el) el.innerHTML = errorBlock('Elevation data unavailable.');
        });

    // Geology
    getGeology(lat, lng)
        .then(data => {
            const el = document.getElementById('data-geology');
            if (!el) return;
            const geo = parseGeology(data);
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
      `;
        })
        .catch(() => {
            const el = document.getElementById('data-geology');
            if (el) el.innerHTML = '<p style="color:var(--muted);font-size:14px;">Geology data unavailable.</p>';
        });

    // Admin unit
    getAdminUnit(lat, lng)
        .then(data => {
            const el = document.getElementById('data-admin');
            if (!el) return;
            const admin = formatAdminUnit(data);
            if (admin) {
                el.innerHTML = `<div class="admin-unit">${esc(admin.label)}, ${esc(admin.country)}</div>`;
            }
        })
        .catch(() => { });
}
