import '../styles/main.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { initI18n } from '../lib/i18n.js';
import { saveLandbook } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, formatDistance } from '../lib/geo.js';
import { geocode, reverseGeocode } from '../api/nominatim.js';

// Fix Leaflet default marker icons in bundled builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

initI18n();

// ---- State ----
let boundaryPoints = [];       // Array of [lat, lng]
let circleMarkers = [];        // L.circleMarker instances (one per point)
let connectingPolyline = null; // L.polyline connecting points during drawing
let closedPolygon = null;      // L.polygon after closing
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

// ---- Map initialization ----
const map = L.map('create-map').setView([37.5967, -8.6400], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

setInstructions(1);

// ---- Map click handler ----
map.on('click', function (e) {
  if (!clickEnabled || isClosed) return;

  const latlng = [e.latlng.lat, e.latlng.lng];

  // Check if clicking near first point to close polygon
  if (boundaryPoints.length >= 3) {
    const firstPoint = map.latLngToContainerPoint(L.latLng(boundaryPoints[0]));
    const clickPoint = map.latLngToContainerPoint(e.latlng);
    const dist = firstPoint.distanceTo(clickPoint);
    if (dist <= 20) {
      closePolygon();
      return;
    }
  }

  addPoint(latlng);
});

// ---- Point management ----
function addPoint(latlng) {
  boundaryPoints.push(latlng);

  const idx = boundaryPoints.length - 1;
  const marker = L.circleMarker(L.latLng(latlng[0], latlng[1]), {
    radius: 6,
    color: '#2d6a4f',
    fillColor: '#52b788',
    fillOpacity: 1,
    weight: 2,
    draggable: false, // circleMarkers aren't natively draggable; we handle it manually
  }).addTo(map);

  // Make marker draggable before closing
  enableMarkerDrag(marker, idx);

  // If this is the first point, give it a distinct style for "close target"
  if (idx === 0) {
    marker.setStyle({ color: '#1b4332', fillColor: '#40916c', radius: 8 });
  }

  circleMarkers.push(marker);

  // Show toolbar on first point
  if (boundaryPoints.length === 1) {
    toolbar.style.display = 'flex';
    setInstructions(2);
  }

  updatePolyline();
  updateStats();
}

function enableMarkerDrag(marker, idx) {
  let dragging = false;

  marker.on('mousedown', function (e) {
    if (isClosed) return;
    dragging = true;
    map.dragging.disable();
    L.DomEvent.stopPropagation(e);

    function onMove(evt) {
      if (!dragging) return;
      const latlng = evt.latlng;
      marker.setLatLng(latlng);
      boundaryPoints[idx] = [latlng.lat, latlng.lng];
      updatePolyline();
      updateStats();
    }

    function onUp() {
      dragging = false;
      map.dragging.enable();
      map.off('mousemove', onMove);
      map.off('mouseup', onUp);
    }

    map.on('mousemove', onMove);
    map.on('mouseup', onUp);
  });
}

function updatePolyline() {
  if (connectingPolyline) {
    map.removeLayer(connectingPolyline);
    connectingPolyline = null;
  }

  if (boundaryPoints.length >= 2) {
    connectingPolyline = L.polyline(
      boundaryPoints.map(p => L.latLng(p[0], p[1])),
      { color: '#2d6a4f', weight: 2, dashArray: '6, 4' }
    ).addTo(map);
  }
}

function closePolygon() {
  if (boundaryPoints.length < 3) return;
  isClosed = true;
  clickEnabled = false;

  // Remove individual markers and polyline
  circleMarkers.forEach(m => map.removeLayer(m));
  circleMarkers = [];
  if (connectingPolyline) {
    map.removeLayer(connectingPolyline);
    connectingPolyline = null;
  }

  // Create final polygon
  closedPolygon = L.polygon(
    boundaryPoints.map(p => L.latLng(p[0], p[1])),
    {
      color: '#2d6a4f',
      fillColor: '#52b788',
      fillOpacity: 0.3,
      weight: 2,
    }
  ).addTo(map);

  map.fitBounds(closedPolygon.getBounds(), { padding: [40, 40] });

  setInstructions(3);
  updateStats();

  if (btnCreate) btnCreate.disabled = false;
}

function undoLastPoint() {
  if (isClosed || boundaryPoints.length === 0) return;

  boundaryPoints.pop();
  const marker = circleMarkers.pop();
  if (marker) map.removeLayer(marker);

  updatePolyline();
  updateStats();

  if (boundaryPoints.length === 0) {
    toolbar.style.display = 'none';
    setInstructions(1);
  }
}

function clearAll() {
  // Remove polygon if closed
  if (closedPolygon) {
    map.removeLayer(closedPolygon);
    closedPolygon = null;
  }

  // Remove markers
  circleMarkers.forEach(m => map.removeLayer(m));
  circleMarkers = [];

  // Remove polyline
  if (connectingPolyline) {
    map.removeLayer(connectingPolyline);
    connectingPolyline = null;
  }

  boundaryPoints = [];
  isClosed = false;
  clickEnabled = true;

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
        map.setView([lat, lon], 15);
      }
    })
    .catch(() => {});
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
  btnCreate.addEventListener('click', () => {
    if (!isClosed || boundaryPoints.length < 3) return;

    const area = polygonArea(boundaryPoints);
    const perimeter = polygonPerimeter(boundaryPoints);
    const centroid = polygonCentroid(boundaryPoints);
    const address = statAddress ? statAddress.textContent : '';

    const landbook = saveLandbook({
      boundary: boundaryPoints,
      center: centroid,
      area: area,
      perimeter: perimeter,
      address: address !== '\u2014' ? address : '',
    });

    window.location.href = `landbook.html?id=${landbook.id}`;
  });
}
