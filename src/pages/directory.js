import '../styles/main.css';
import { createMap, mapboxgl, addMarker } from '../lib/mapbox.js';
import { initI18n, applyTranslations } from '../lib/i18n.js';
import { getAllProperties } from '../lib/store.js';
import { escapeHtml } from '../lib/utils.js';

initI18n();

const listEl = document.getElementById('dir-list');
const searchInput = document.getElementById('dir-search');
const mapWrap = document.getElementById('dir-map-wrap');
const viewBtns = document.querySelectorAll('.view-toggle button');

let dirMap = null;
let markers = [];

async function render(filter) {
  const properties = await getAllProperties();
  const query = (filter || '').toLowerCase();
  const filtered = properties.filter((p) => {
    if (!query) return true;
    return (
      (p.propertyName || '').toLowerCase().includes(query) ||
      (p.address || '').toLowerCase().includes(query) ||
      (p.ownerName || '').toLowerCase().includes(query) ||
      (p.landUse || []).join(' ').toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h3 data-i18n="dir.empty.title">No properties yet</h3>
        <p data-i18n="dir.empty.desc">Be the first to create a Landbook and start building the knowledge base.</p>
        <a href="onboard.html" class="btn-primary" data-i18n="dir.empty.cta">Add Your Property</a>
      </div>
    `;
    applyTranslations();
    return;
  }

  listEl.innerHTML = filtered
    .map((p) => {
      const landUse = Array.isArray(p.landUse) ? p.landUse : [];
      const area = p.area ? `${p.area} ${p.areaUnit || 'ha'}` : '';
      return `
      <a href="passport.html?id=${p.id}" class="property-card">
        <h3>${escapeHtml(p.propertyName)}</h3>
        <div class="prop-location">${escapeHtml(p.address || (p.lat && p.lng ? `${parseFloat(p.lat).toFixed(4)}, ${parseFloat(p.lng).toFixed(4)}` : ''))}</div>
        <div class="prop-tags">
          ${landUse.map((lu) => `<span class="prop-tag">${escapeHtml(lu)}</span>`).join('')}
          ${area ? `<span class="prop-tag">${area}</span>` : ''}
        </div>
      </a>
    `;
    })
    .join('');

  if (dirMap) updateMapMarkers(filtered);
}

async function initMap() {
  if (dirMap) return;
  dirMap = createMap('dir-map', {
    center: [-8.0, 39.5],
    zoom: 5,
  });
  dirMap.on('load', async () => {
    const allProps = await getAllProperties();
    updateMapMarkers(allProps);
  });
}

function updateMapMarkers(properties) {
  if (!dirMap) return;

  // Remove existing markers
  markers.forEach(m => m.remove());
  markers = [];

  const bounds = new mapboxgl.LngLatBounds();
  let hasBounds = false;

  properties.forEach((p) => {
    if (p.lat && p.lng) {
      const lat = parseFloat(p.lat);
      const lng = parseFloat(p.lng);

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<strong>${escapeHtml(p.propertyName)}</strong><br><a href="passport.html?id=${p.id}">View Landbook</a>`);

      const marker = addMarker(dirMap, [lng, lat]);
      marker.setPopup(popup);
      markers.push(marker);

      bounds.extend([lng, lat]);
      hasBounds = true;
    }
  });

  if (hasBounds) {
    dirMap.fitBounds(bounds, { padding: 40, maxZoom: 12 });
  }
}

function setView(view) {
  viewBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));

  if (view === 'map') {
    mapWrap.classList.add('visible');
    listEl.style.display = 'none';
    if (!dirMap) {
      initMap();
    } else {
      dirMap.resize();
    }
  } else {
    mapWrap.classList.remove('visible');
    listEl.style.display = '';
  }
}

searchInput.addEventListener('input', function () {
  render(this.value);
});

viewBtns.forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

render();
