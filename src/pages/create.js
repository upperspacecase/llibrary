import '../styles/main.css';
import { createMap, mapboxgl, addMarker, setGeoJSONSource, fitToCoords, toLatLng, toLngLat } from '../lib/mapbox.js';
import { initI18n } from '../lib/i18n.js';
import { saveLandbook } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, formatDistance } from '../lib/geo.js';
import { geocode, reverseGeocode } from '../api/nominatim.js';

initI18n();

// ---- State ----
let boundaryPoints = [];       // Array of [lat, lng]
let isClosed = false;
let clickEnabled = true;

// ---- DOM refs ----
const toolbar = document.getElementById('map-toolbar');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnClose = document.getElementById('btn-close');
const btnCreate = document.getElementById('btn-create');
const instructions = document.getElementById('map-instructions');
const statPoints = document.getElementById('stat-points');
const statArea = document.getElementById('stat-area');
const statPerimeter = document.getElementById('stat-perimeter');
const statCenter = document.getElementById('stat-center');
const statAddress = document.getElementById('stat-address');
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');

// ---- Source/layer IDs ----
const POINTS_SRC = 'draw-points';
const POINTS_LAYER = 'draw-points-layer';
const FIRST_POINT_SRC = 'first-point';
const FIRST_POINT_LAYER = 'first-point-layer';
const LINE_SRC = 'draw-line';
const LINE_LAYER = 'draw-line-layer';
const POLY_SRC = 'draw-polygon';
const POLY_FILL_LAYER = 'draw-polygon-fill';
const POLY_LINE_LAYER = 'draw-polygon-line';

// ---- Map initialization ----
const map = createMap('create-map', {
  center: [-8.6400, 37.5967],
  zoom: 10,
  satellite: false,
});

map.on('load', () => {
  // Add empty sources for drawing
  map.addSource(POINTS_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: POINTS_LAYER,
    type: 'circle',
    source: POINTS_SRC,
    paint: {
      'circle-radius': 6,
      'circle-color': '#52b788',
      'circle-stroke-color': '#2d6a4f',
      'circle-stroke-width': 2,
    },
  });

  map.addSource(FIRST_POINT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: FIRST_POINT_LAYER,
    type: 'circle',
    source: FIRST_POINT_SRC,
    paint: {
      'circle-radius': 8,
      'circle-color': '#40916c',
      'circle-stroke-color': '#1b4332',
      'circle-stroke-width': 2,
    },
  });

  map.addSource(LINE_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
  map.addLayer({
    id: LINE_LAYER,
    type: 'line',
    source: LINE_SRC,
    paint: {
      'line-color': '#2d6a4f',
      'line-width': 2,
      'line-dasharray': [6, 4],
    },
  });

  map.addSource(POLY_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} } });
  map.addLayer({
    id: POLY_FILL_LAYER,
    type: 'fill',
    source: POLY_SRC,
    paint: { 'fill-color': '#52b788', 'fill-opacity': 0.3 },
    layout: { visibility: 'none' },
  });
  map.addLayer({
    id: POLY_LINE_LAYER,
    type: 'line',
    source: POLY_SRC,
    paint: { 'line-color': '#2d6a4f', 'line-width': 2 },
    layout: { visibility: 'none' },
  });

  setInstructions(1);

  // ---- Map click handler ----
  map.on('click', (e) => {
    if (!clickEnabled || isClosed) return;

    const latlng = [e.lngLat.lat, e.lngLat.lng];

    // Check if clicking near first point to close polygon
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project(toLngLat(boundaryPoints[0]));
      const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
      const dist = Math.sqrt((firstPx.x - clickPx.x) ** 2 + (firstPx.y - clickPx.y) ** 2);
      if (dist <= 20) {
        closePolygon();
        return;
      }
    }

    addPoint(latlng);
  });

  // Cursor style
  map.on('mousemove', (e) => {
    if (isClosed) {
      map.getCanvas().style.cursor = '';
      return;
    }
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project(toLngLat(boundaryPoints[0]));
      const mousePx = map.project([e.lngLat.lng, e.lngLat.lat]);
      const dist = Math.sqrt((firstPx.x - mousePx.x) ** 2 + (firstPx.y - mousePx.y) ** 2);
      map.getCanvas().style.cursor = dist <= 20 ? 'pointer' : 'crosshair';
    } else {
      map.getCanvas().style.cursor = 'crosshair';
    }
  });
});

// ---- Point management ----
function addPoint(latlng) {
  boundaryPoints.push(latlng);

  // Show toolbar on first point
  if (boundaryPoints.length === 1) {
    toolbar.style.display = 'flex';
    setInstructions(2);
  }

  updateDrawing();
  updateStats();
}

function updateDrawing() {
  // Update connecting line
  const lineCoords = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  setGeoJSONSource(map, LINE_SRC, {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: lineCoords },
    properties: {},
  });

  // Update point markers (all except first)
  const pointFeatures = boundaryPoints.slice(1).map(([lat, lng], idx) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { idx: idx + 1 },
  }));
  setGeoJSONSource(map, POINTS_SRC, {
    type: 'FeatureCollection',
    features: pointFeatures,
  });

  // Update first point (distinct style)
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
  clickEnabled = false;

  // Hide drawing layers
  map.setLayoutProperty(POINTS_LAYER, 'visibility', 'none');
  map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'none');
  map.setLayoutProperty(LINE_LAYER, 'visibility', 'none');

  // Build closed polygon ring
  const ring = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]); // close ring

  setGeoJSONSource(map, POLY_SRC, {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  });
  map.setLayoutProperty(POLY_FILL_LAYER, 'visibility', 'visible');
  map.setLayoutProperty(POLY_LINE_LAYER, 'visibility', 'visible');

  fitToCoords(map, boundaryPoints);

  setInstructions(3);
  updateStats();

  if (btnCreate) btnCreate.disabled = false;
}

function undoLastPoint() {
  if (isClosed || boundaryPoints.length === 0) return;

  boundaryPoints.pop();
  updateDrawing();
  updateStats();

  if (boundaryPoints.length === 0) {
    toolbar.style.display = 'none';
    setInstructions(1);
  }
}

function clearAll() {
  // Hide polygon
  map.setLayoutProperty(POLY_FILL_LAYER, 'visibility', 'none');
  map.setLayoutProperty(POLY_LINE_LAYER, 'visibility', 'none');
  // Show drawing layers
  map.setLayoutProperty(POINTS_LAYER, 'visibility', 'visible');
  map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'visible');
  map.setLayoutProperty(LINE_LAYER, 'visibility', 'visible');

  // Clear data
  boundaryPoints = [];
  isClosed = false;
  clickEnabled = true;

  updateDrawing();
  toolbar.style.display = 'none';
  setInstructions(1);
  updateStats();

  if (btnCreate) btnCreate.disabled = true;
}

// ---- Instructions ----
function setInstructions(state) {
  if (!instructions) return;
  switch (state) {
    case 1:
      instructions.textContent = 'Click on the map to start drawing your land boundary';
      break;
    case 2:
      instructions.textContent = 'Click to add points. Click first point to close.';
      break;
    case 3:
      instructions.textContent = 'Boundary complete. Generate your landbook.';
      break;
  }
}

// ---- Stats ----
let reverseGeocodeTimer = null;

function updateStats() {
  const n = boundaryPoints.length;

  if (statPoints) statPoints.textContent = n;

  if (n >= 3) {
    const area = polygonArea(boundaryPoints);
    const perimeter = polygonPerimeter(boundaryPoints);
    const centroid = polygonCentroid(boundaryPoints);

    if (statArea) statArea.textContent = formatArea(area);
    if (statPerimeter) statPerimeter.textContent = formatDistance(perimeter);
    if (statCenter) statCenter.textContent = `${centroid[0].toFixed(5)}, ${centroid[1].toFixed(5)}`;

    // Debounced reverse geocode
    clearTimeout(reverseGeocodeTimer);
    reverseGeocodeTimer = setTimeout(() => {
      reverseGeocode(centroid[0], centroid[1])
        .then(result => {
          if (statAddress && result && result.display_name) {
            statAddress.textContent = result.display_name;
          }
        })
        .catch(() => {
          if (statAddress) statAddress.textContent = '\u2014';
        });
    }, 800);
  } else {
    if (statArea) statArea.textContent = '\u2014';
    if (statPerimeter) statPerimeter.textContent = '\u2014';
    if (statCenter) statCenter.textContent = '\u2014';
    if (statAddress) statAddress.textContent = '\u2014';
  }

  // Enable create button only when polygon is closed with >= 3 points
  if (btnCreate) {
    btnCreate.disabled = !(isClosed && n >= 3);
  }
}

// ---- Toolbar buttons ----
if (btnUndo) btnUndo.addEventListener('click', undoLastPoint);
if (btnClear) btnClear.addEventListener('click', clearAll);
if (btnClose) btnClose.addEventListener('click', () => {
  if (boundaryPoints.length >= 3 && !isClosed) {
    closePolygon();
  }
});

// ---- Search ----
function performSearch() {
  const query = searchInput ? searchInput.value.trim() : '';
  if (!query) return;

  geocode(query)
    .then(results => {
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        map.flyTo({ center: [lon, lat], zoom: 15 });
      }
    })
    .catch(() => { });
}

if (btnSearch) btnSearch.addEventListener('click', performSearch);
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
}

// ---- Generate Landbook ----
if (btnCreate) {
  btnCreate.disabled = true;
  btnCreate.addEventListener('click', async () => {
    if (!isClosed || boundaryPoints.length < 3) return;

    btnCreate.disabled = true;
    btnCreate.textContent = 'Generating\u2026';

    const area = polygonArea(boundaryPoints);
    const perimeter = polygonPerimeter(boundaryPoints);
    const centroid = polygonCentroid(boundaryPoints);
    const address = statAddress ? statAddress.textContent : '';

    try {
      const landbook = await saveLandbook({
        boundary: boundaryPoints,
        center: centroid,
        area: area,
        perimeter: perimeter,
        address: address !== '\u2014' ? address : '',
      });

      window.location.href = `landbook.html?id=${landbook.id}`;
    } catch (err) {
      console.error('Failed to save landbook:', err);
      btnCreate.disabled = false;
      btnCreate.textContent = 'Generate Landbook';
      alert('Failed to save. Please try again.');
    }
  });
}
