/**
 * Create Landbook
 * 1. Type address → autocomplete → map flies to location
 * 2. Click on map to draw boundary points
 * 3. Close boundary (click near first point or "Close Boundary" button)
 * 4. Click Generate → save → open landbook
 */

import '../styles/main.css';
import { createMap, mapboxgl, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n, t } from '../lib/i18n.js';
import { saveLandbook } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, formatDistance, sqmToHectares } from '../lib/geo.js';

initI18n();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let boundaryPoints = [];
let isClosed = false;
let selectedAddress = '';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');
const suggestionsEl = document.getElementById('search-suggestions');
const resultPanel = document.getElementById('boundary-result');
const statAddress = document.getElementById('stat-address');
const statArea = document.getElementById('stat-area');
const statPerimeter = document.getElementById('stat-perimeter');
const btnCreate = document.getElementById('btn-create');
const emailInput = document.getElementById('email-input');
const instructions = document.getElementById('map-instructions');
const toolbar = document.getElementById('map-toolbar');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');

// ---------------------------------------------------------------------------
// Map sources
// ---------------------------------------------------------------------------
const POINTS_SRC = 'draw-points';
const POINTS_LAYER = 'draw-points-layer';
const FIRST_POINT_SRC = 'first-point';
const FIRST_POINT_LAYER = 'first-point-layer';
const LINE_SRC = 'draw-line';
const LINE_LAYER = 'draw-line-layer';
const POLY_SRC = 'draw-polygon';
const POLY_FILL = 'draw-polygon-fill';
const POLY_LINE = 'draw-polygon-line';

const map = createMap('create-map', {
  center: [-8.6400, 37.5967],
  zoom: 10,
  satellite: false,
});

map.on('load', () => {
  // Drawing points
  map.addSource(POINTS_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: POINTS_LAYER, type: 'circle', source: POINTS_SRC,
    paint: { 'circle-radius': 6, 'circle-color': '#52b788', 'circle-stroke-color': '#2d6a4f', 'circle-stroke-width': 2 },
  });

  // First point (larger, distinct)
  map.addSource(FIRST_POINT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: FIRST_POINT_LAYER, type: 'circle', source: FIRST_POINT_SRC,
    paint: { 'circle-radius': 8, 'circle-color': '#40916c', 'circle-stroke-color': '#1b4332', 'circle-stroke-width': 2 },
  });

  // Connecting line
  map.addSource(LINE_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
  map.addLayer({
    id: LINE_LAYER, type: 'line', source: LINE_SRC,
    paint: { 'line-color': '#2d6a4f', 'line-width': 2, 'line-dasharray': [6, 4] },
  });

  // Closed polygon
  map.addSource(POLY_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} } });
  map.addLayer({ id: POLY_FILL, type: 'fill', source: POLY_SRC, paint: { 'fill-color': '#52b788', 'fill-opacity': 0.25 }, layout: { visibility: 'none' } });
  map.addLayer({ id: POLY_LINE, type: 'line', source: POLY_SRC, paint: { 'line-color': '#2d6a4f', 'line-width': 2.5 }, layout: { visibility: 'none' } });

  if (instructions) instructions.textContent = 'Search for your land to get started';
  if (toolbar) toolbar.style.display = 'none';

  // Click to add points
  map.on('click', (e) => {
    if (isClosed) return;

    const latlng = [e.lngLat.lat, e.lngLat.lng];

    // Click near first point to close
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project([boundaryPoints[0][1], boundaryPoints[0][0]]);
      const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
      const dist = Math.sqrt((firstPx.x - clickPx.x) ** 2 + (firstPx.y - clickPx.y) ** 2);
      if (dist <= 20) { closePolygon(); return; }
    }

    addPoint(latlng);
  });

  // Cursor
  map.on('mousemove', (e) => {
    if (isClosed) { map.getCanvas().style.cursor = ''; return; }
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project([boundaryPoints[0][1], boundaryPoints[0][0]]);
      const mousePx = map.project([e.lngLat.lng, e.lngLat.lat]);
      const dist = Math.sqrt((firstPx.x - mousePx.x) ** 2 + (firstPx.y - mousePx.y) ** 2);
      map.getCanvas().style.cursor = dist <= 20 ? 'pointer' : 'crosshair';
    } else {
      map.getCanvas().style.cursor = boundaryPoints.length > 0 ? 'crosshair' : '';
    }
  });
});

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function addPoint(latlng) {
  boundaryPoints.push(latlng);

  if (boundaryPoints.length === 1 && toolbar) {
    toolbar.style.display = 'flex';
  }

  if (instructions) {
    instructions.textContent = boundaryPoints.length < 3
      ? 'Keep clicking to add more points'
      : 'Click near the first point to close, or press "Close Boundary"';
  }

  updateDrawing();
}

function updateDrawing() {
  const lineCoords = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  setGeoJSONSource(map, LINE_SRC, {
    type: 'Feature', geometry: { type: 'LineString', coordinates: lineCoords }, properties: {},
  });

  const pointFeatures = boundaryPoints.slice(1).map(([lat, lng], idx) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { idx: idx + 1 },
  }));
  setGeoJSONSource(map, POINTS_SRC, { type: 'FeatureCollection', features: pointFeatures });

  if (boundaryPoints.length > 0) {
    const [lat, lng] = boundaryPoints[0];
    setGeoJSONSource(map, FIRST_POINT_SRC, {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }],
    });
  } else {
    setGeoJSONSource(map, FIRST_POINT_SRC, { type: 'FeatureCollection', features: [] });
  }
}

function closePolygon() {
  if (boundaryPoints.length < 3) return;
  isClosed = true;

  // Hide drawing layers, show polygon
  map.setLayoutProperty(POINTS_LAYER, 'visibility', 'none');
  map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'none');
  map.setLayoutProperty(LINE_LAYER, 'visibility', 'none');

  const ring = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]);
  setGeoJSONSource(map, POLY_SRC, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} });
  map.setLayoutProperty(POLY_FILL, 'visibility', 'visible');
  map.setLayoutProperty(POLY_LINE, 'visibility', 'visible');

  fitToCoords(map, boundaryPoints, { padding: 80 });

  if (instructions) instructions.textContent = 'Boundary set. Enter your email and click Generate.';
  updateStats();
  if (resultPanel) resultPanel.style.display = 'block';
  updateCreateButton();
}

function undoLastPoint() {
  if (isClosed || boundaryPoints.length === 0) return;
  boundaryPoints.pop();
  updateDrawing();
  if (boundaryPoints.length === 0 && toolbar) {
    toolbar.style.display = 'none';
    if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
  }
}

function clearAll() {
  map.setLayoutProperty(POLY_FILL, 'visibility', 'none');
  map.setLayoutProperty(POLY_LINE, 'visibility', 'none');
  map.setLayoutProperty(POINTS_LAYER, 'visibility', 'visible');
  map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'visible');
  map.setLayoutProperty(LINE_LAYER, 'visibility', 'visible');

  boundaryPoints = [];
  isClosed = false;
  updateDrawing();
  if (toolbar) toolbar.style.display = 'none';
  if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
  if (resultPanel) resultPanel.style.display = 'none';
  if (btnCreate) btnCreate.disabled = true;
}

function updateStats() {
  if (boundaryPoints.length < 3) return;
  const area = polygonArea(boundaryPoints);
  const perimeter = polygonPerimeter(boundaryPoints);
  const ha = sqmToHectares(area);
  if (statAddress) statAddress.textContent = selectedAddress || 'Custom boundary';
  if (statArea) statArea.textContent = ha >= 1 ? `${ha.toFixed(2)} ha` : formatArea(area);
  if (statPerimeter) statPerimeter.textContent = formatDistance(perimeter);
}

// Email validation — button requires both closed boundary + valid email
function isValidEmail(v) { return v && v.includes('@') && v.includes('.'); }

function updateCreateButton() {
  if (btnCreate) btnCreate.disabled = !(isClosed && isValidEmail(emailInput?.value.trim()));
}

if (emailInput) emailInput.addEventListener('input', updateCreateButton);

// Toolbar buttons
if (btnUndo) btnUndo.addEventListener('click', undoLastPoint);
if (btnClear) btnClear.addEventListener('click', clearAll);
if (btnClose) btnClose.addEventListener('click', () => { if (boundaryPoints.length >= 3 && !isClosed) closePolygon(); });

// ---------------------------------------------------------------------------
// Mapbox Geocoding Autocomplete
// ---------------------------------------------------------------------------
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
let debounceTimer = null;

function onSearchInput() {
  const query = searchInput.value.trim();
  if (query.length < 3) { hideSuggestions(); return; }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchSuggestions(query), 300);
}

async function fetchSuggestions(query) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=address,place,locality,neighborhood,poi`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      showSuggestions(data.features);
    } else {
      hideSuggestions();
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
}

function showSuggestions(features) {
  suggestionsEl.innerHTML = features.map((f, i) => {
    const name = f.text || f.place_name;
    const context = f.place_name || '';
    return `<li data-index="${i}">
      <div class="suggestion-name">${esc(name)}</div>
      <div class="suggestion-context">${esc(context)}</div>
    </li>`;
  }).join('');
  suggestionsEl.classList.add('active');
  suggestionsEl._features = features;
  suggestionsEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      selectSuggestion(suggestionsEl._features[parseInt(li.dataset.index)]);
    });
  });
}

function hideSuggestions() {
  suggestionsEl.classList.remove('active');
  suggestionsEl.innerHTML = '';
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function selectSuggestion(feature) {
  hideSuggestions();
  searchInput.value = feature.place_name || feature.text;
  selectedAddress = feature.place_name || feature.text;

  const [lng, lat] = feature.center;
  map.flyTo({ center: [lng, lat], zoom: 16 });

  if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
}

if (searchInput) {
  searchInput.addEventListener('input', onSearchInput);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionsEl._features && suggestionsEl._features.length > 0) {
        selectSuggestion(suggestionsEl._features[0]);
      } else {
        const query = searchInput.value.trim();
        if (query.length >= 3) fetchSuggestions(query);
      }
    }
    if (e.key === 'Escape') hideSuggestions();
  });
}

if (btnSearch) {
  btnSearch.addEventListener('click', () => {
    if (suggestionsEl._features && suggestionsEl._features.length > 0) {
      selectSuggestion(suggestionsEl._features[0]);
    } else {
      const query = searchInput ? searchInput.value.trim() : '';
      if (query.length >= 3) fetchSuggestions(query);
    }
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.create-search')) hideSuggestions();
});

// ---------------------------------------------------------------------------
// Generate Landbook
// ---------------------------------------------------------------------------

if (btnCreate) {
  btnCreate.addEventListener('click', async () => {
    if (!isClosed || boundaryPoints.length < 3) return;

    btnCreate.disabled = true;
    btnCreate.textContent = 'Generating...';

    const area = polygonArea(boundaryPoints);
    const perimeter = polygonPerimeter(boundaryPoints);
    const centroid = polygonCentroid(boundaryPoints);

    try {
      const landbook = await saveLandbook({
        boundary: boundaryPoints,
        center: centroid,
        area: area,
        perimeter: perimeter,
        address: selectedAddress || '',
        email: emailInput ? emailInput.value.trim() : '',
      });

      window.location.href = `/landbook?id=${landbook.id}`;
    } catch (err) {
      console.error('Failed to save landbook:', err);
      btnCreate.disabled = false;
      btnCreate.textContent = 'Generate Landbook';
      alert('Failed to save. Please try again.');
    }
  });
}
