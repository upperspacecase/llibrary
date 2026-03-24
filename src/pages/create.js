/**
 * Create Landbook — Simplified Flow
 * 1. Type address → autocomplete suggestions (Mapbox geocoding)
 * 2. Select → fly to location, auto-draw boundary
 * 3. Drag boundary points to adjust
 * 4. Click Generate → save → open landbook
 */

import '../styles/main.css';
import { createMap, mapboxgl, addPolygon, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n, t } from '../lib/i18n.js';
import { saveLandbook } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, formatDistance, sqmToHectares } from '../lib/geo.js';
import { geocode } from '../api/nominatim.js';

initI18n();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let boundaryPoints = [];    // Array of [lat, lng]
let dragMarkers = [];       // Array of mapboxgl.Marker
let selectedAddress = '';

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const searchInput = document.getElementById('search-input');
const btnSearch = document.getElementById('btn-search');
const suggestions = document.getElementById('search-suggestions');
const resultPanel = document.getElementById('boundary-result');
const statAddress = document.getElementById('stat-address');
const statArea = document.getElementById('stat-area');
const statPerimeter = document.getElementById('stat-perimeter');
const btnCreate = document.getElementById('btn-create');
const instructions = document.getElementById('map-instructions');
const toolbar = document.getElementById('map-toolbar');

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------
const POLY_SRC = 'boundary-polygon';
const POLY_FILL = 'boundary-fill';
const POLY_LINE = 'boundary-line';

const map = createMap('create-map', {
  center: [-8.6400, 37.5967],
  zoom: 10,
  satellite: false,
});

map.on('load', () => {
  map.addSource(POLY_SRC, {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} },
  });
  map.addLayer({
    id: POLY_FILL, type: 'fill', source: POLY_SRC,
    paint: { 'fill-color': '#52b788', 'fill-opacity': 0.25 },
  });
  map.addLayer({
    id: POLY_LINE, type: 'line', source: POLY_SRC,
    paint: { 'line-color': '#2d6a4f', 'line-width': 2.5 },
  });

  if (instructions) instructions.textContent = 'Search for your land to get started';
  if (toolbar) toolbar.style.display = 'none';
});

// ---------------------------------------------------------------------------
// Mapbox Geocoding Autocomplete
// ---------------------------------------------------------------------------
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

let debounceTimer = null;

function onSearchInput() {
  const query = searchInput.value.trim();
  if (query.length < 3) {
    hideSuggestions();
    return;
  }

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
  suggestions.innerHTML = features.map((f, i) => {
    const name = f.text || f.place_name;
    const context = f.place_name || '';
    return `<li data-index="${i}">
      <div class="suggestion-name">${esc(name)}</div>
      <div class="suggestion-context">${esc(context)}</div>
    </li>`;
  }).join('');

  suggestions.classList.add('active');

  // Store features for selection
  suggestions._features = features;

  // Click handlers
  suggestions.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      selectSuggestion(suggestions._features[idx]);
    });
  });
}

function hideSuggestions() {
  suggestions.classList.remove('active');
  suggestions.innerHTML = '';
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---------------------------------------------------------------------------
// Selection → Place boundary
// ---------------------------------------------------------------------------

async function selectSuggestion(feature) {
  hideSuggestions();
  searchInput.value = feature.place_name || feature.text;
  selectedAddress = feature.place_name || feature.text;

  const [lng, lat] = feature.center;

  if (instructions) instructions.textContent = 'Finding your land...';

  // Try to get a polygon from Nominatim
  let polygon = null;
  try {
    const results = await geocode(selectedAddress, { limit: 1 });
    if (results && results.length > 0) {
      const osmResult = results[0];
      // Fetch with polygon_geojson
      const lookupUrl = `https://nominatim.openstreetmap.org/details?osmtype=${osmResult.osm_type?.[0]?.toUpperCase()}&osmid=${osmResult.osm_id}&format=json&polygon_geojson=1`;
      const lookupRes = await fetch(lookupUrl, { headers: { 'User-Agent': 'Libraries/1.0' } });
      if (lookupRes.ok) {
        const detail = await lookupRes.json();
        if (detail.geometry && (detail.geometry.type === 'Polygon' || detail.geometry.type === 'MultiPolygon')) {
          polygon = detail.geometry;
        }
      }
    }
  } catch (err) {
    console.log('No OSM polygon available, generating default boundary');
  }

  if (polygon && polygon.type === 'Polygon') {
    // Use OSM polygon — convert coordinates from [lng, lat] to [lat, lng]
    const ring = polygon.coordinates[0];
    boundaryPoints = ring.slice(0, -1).map(([ln, la]) => [la, ln]); // remove closing point
  } else if (polygon && polygon.type === 'MultiPolygon') {
    // Use the largest ring from the MultiPolygon
    let largestRing = polygon.coordinates[0][0];
    for (const poly of polygon.coordinates) {
      if (poly[0].length > largestRing.length) largestRing = poly[0];
    }
    boundaryPoints = largestRing.slice(0, -1).map(([ln, la]) => [la, ln]);
  } else {
    // Generate a default ~1 hectare rectangle around the point
    const offset = 0.00045; // ~50m at this latitude
    boundaryPoints = [
      [lat + offset, lng - offset * 1.5],
      [lat + offset, lng + offset * 1.5],
      [lat - offset, lng + offset * 1.5],
      [lat - offset, lng - offset * 1.5],
    ];
  }

  // Simplify polygon if too many points (keep it draggable)
  if (boundaryPoints.length > 20) {
    boundaryPoints = simplifyPolygon(boundaryPoints, 20);
  }

  placeBoundary();
}

function simplifyPolygon(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const result = [];
  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Boundary rendering + draggable markers
// ---------------------------------------------------------------------------

function placeBoundary() {
  updatePolygon();
  updateStats();
  createDragMarkers();
  fitToCoords(map, boundaryPoints);

  // Show result panel
  if (resultPanel) resultPanel.style.display = 'block';
  if (instructions) instructions.textContent = 'Drag points to adjust your boundary';
  if (btnCreate) btnCreate.disabled = false;
}

function updatePolygon() {
  const ring = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]); // close ring

  setGeoJSONSource(map, POLY_SRC, {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [ring] },
    properties: {},
  });
}

function updateStats() {
  if (boundaryPoints.length < 3) return;

  const area = polygonArea(boundaryPoints);
  const perimeter = polygonPerimeter(boundaryPoints);
  const ha = sqmToHectares(area);

  if (statAddress) statAddress.textContent = selectedAddress;
  if (statArea) statArea.textContent = ha >= 1 ? `${ha.toFixed(2)} ha` : formatArea(area);
  if (statPerimeter) statPerimeter.textContent = formatDistance(perimeter);
}

function createDragMarkers() {
  // Remove existing markers
  dragMarkers.forEach(m => m.remove());
  dragMarkers = [];

  boundaryPoints.forEach((point, idx) => {
    const el = document.createElement('div');
    el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#52b788;border:2.5px solid #2d6a4f;cursor:grab;';

    const marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([point[1], point[0]])
      .addTo(map);

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      boundaryPoints[idx] = [lngLat.lat, lngLat.lng];
      updatePolygon();
    });

    marker.on('dragend', () => {
      updateStats();
    });

    dragMarkers.push(marker);
  });
}

// ---------------------------------------------------------------------------
// Search event handlers
// ---------------------------------------------------------------------------

if (searchInput) {
  searchInput.addEventListener('input', onSearchInput);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Select first suggestion if available
      if (suggestions._features && suggestions._features.length > 0) {
        selectSuggestion(suggestions._features[0]);
      } else {
        // Fallback: trigger search
        const query = searchInput.value.trim();
        if (query.length >= 3) fetchSuggestions(query);
      }
    }
    if (e.key === 'Escape') hideSuggestions();
  });
}

if (btnSearch) {
  btnSearch.addEventListener('click', () => {
    // Select first suggestion or trigger search
    if (suggestions._features && suggestions._features.length > 0) {
      selectSuggestion(suggestions._features[0]);
    } else {
      const query = searchInput ? searchInput.value.trim() : '';
      if (query.length >= 3) fetchSuggestions(query);
    }
  });
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.create-search')) {
    hideSuggestions();
  }
});

// ---------------------------------------------------------------------------
// Generate Landbook
// ---------------------------------------------------------------------------

if (btnCreate) {
  btnCreate.addEventListener('click', async () => {
    if (boundaryPoints.length < 3) return;

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
        address: selectedAddress,
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
