/**
 * Submit Land — Two-step info capture
 * Step 1: Draw boundary + post code
 * Step 2: Contact, land details, optional extras
 */

import '../styles/main.css';
import { createMap, mapboxgl, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n, t } from '../lib/i18n.js';
import { saveSubmission } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, sqmToHectares } from '../lib/geo.js';

initI18n();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let boundaryPoints = [];
let isClosed = false;

// ---------------------------------------------------------------------------
// DOM refs — Steps
// ---------------------------------------------------------------------------
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const step3 = document.getElementById('step-3');

// Step 1 refs
const postcodeInput = document.getElementById('postcode-input');
const btnSearch = document.getElementById('btn-search');
const statArea = document.getElementById('stat-area');
const mapPrompt = document.getElementById('map-prompt');
const btnContinue = document.getElementById('btn-continue');
const instructions = document.getElementById('map-instructions');
const btnReset = document.getElementById('btn-reset');
const btnGeolocate = document.getElementById('btn-geolocate');
const mapArea = document.querySelector('.create-map-area');

// Step 2 refs
const emailInput = document.getElementById('email-input');
const phoneInput = document.getElementById('phone-input');
const areaOverride = document.getElementById('area-override');
const areaHint = document.getElementById('area-hint');
const useIntent = document.getElementById('use-intent');
const infrastructure = document.getElementById('infrastructure');
const vegetation = document.getElementById('vegetation');
const notesInput = document.getElementById('notes-input');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const btnCreate = document.getElementById('btn-create');
const btnBack = document.getElementById('btn-back');

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
  satellite: true,
});

// ---------------------------------------------------------------------------
// Map layer init (reusable after style switch)
// ---------------------------------------------------------------------------
function initMapLayers() {
  map.addSource(POINTS_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: POINTS_LAYER, type: 'circle', source: POINTS_SRC,
    paint: { 'circle-radius': 6, 'circle-color': '#52b788', 'circle-stroke-color': '#2d6a4f', 'circle-stroke-width': 2 },
  });

  map.addSource(FIRST_POINT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: FIRST_POINT_LAYER, type: 'circle', source: FIRST_POINT_SRC,
    paint: { 'circle-radius': 8, 'circle-color': '#40916c', 'circle-stroke-color': '#1b4332', 'circle-stroke-width': 2 },
  });

  map.addSource(LINE_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
  map.addLayer({
    id: LINE_LAYER, type: 'line', source: LINE_SRC,
    paint: { 'line-color': '#2d6a4f', 'line-width': 2, 'line-dasharray': [6, 4] },
  });

  map.addSource(POLY_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} } });
  map.addLayer({ id: POLY_FILL, type: 'fill', source: POLY_SRC, paint: { 'fill-color': '#52b788', 'fill-opacity': 0.25 }, layout: { visibility: 'none' } });
  map.addLayer({ id: POLY_LINE, type: 'line', source: POLY_SRC, paint: { 'line-color': '#2d6a4f', 'line-width': 2.5 }, layout: { visibility: 'none' } });

  // Restore state after style switch
  if (boundaryPoints.length > 0) {
    updateDrawing();
    if (isClosed) {
      map.setLayoutProperty(POINTS_LAYER, 'visibility', 'none');
      map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'none');
      map.setLayoutProperty(LINE_LAYER, 'visibility', 'none');
      const ring = boundaryPoints.map(([lat, lng]) => [lng, lat]);
      ring.push([...ring[0]]);
      setGeoJSONSource(map, POLY_SRC, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} });
      map.setLayoutProperty(POLY_FILL, 'visibility', 'visible');
      map.setLayoutProperty(POLY_LINE, 'visibility', 'visible');
    }
  }
}

map.on('load', () => {
  if (instructions) instructions.textContent = 'Search for your land to get started';

  map.on('click', (e) => {
    if (isClosed) return;
    const latlng = [e.lngLat.lat, e.lngLat.lng];
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project([boundaryPoints[0][1], boundaryPoints[0][0]]);
      const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
      const dist = Math.sqrt((firstPx.x - clickPx.x) ** 2 + (firstPx.y - clickPx.y) ** 2);
      if (dist <= 20) { closePolygon(); return; }
    }
    addPoint(latlng);
  });

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
// Geolocation
// ---------------------------------------------------------------------------

if (btnGeolocate) {
  btnGeolocate.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    btnGeolocate.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btnGeolocate.classList.remove('locating');
        const { latitude, longitude } = pos.coords;
        map.flyTo({ center: [longitude, latitude], zoom: 16 });
        if (instructions && boundaryPoints.length === 0) {
          instructions.textContent = t('create.instructions') || 'Click on the map to start drawing your land boundary';
        }
      },
      () => { btnGeolocate.classList.remove('locating'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function addPoint(latlng) {
  boundaryPoints.push(latlng);
  if (boundaryPoints.length === 1) {
    if (mapPrompt) mapPrompt.style.display = 'none';
  }
  if (instructions) {
    instructions.textContent = boundaryPoints.length < 3
      ? 'Keep clicking to add more points'
      : 'Click near the first point to close the boundary';
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

  map.setLayoutProperty(POINTS_LAYER, 'visibility', 'none');
  map.setLayoutProperty(FIRST_POINT_LAYER, 'visibility', 'none');
  map.setLayoutProperty(LINE_LAYER, 'visibility', 'none');

  const ring = boundaryPoints.map(([lat, lng]) => [lng, lat]);
  ring.push([...ring[0]]);
  setGeoJSONSource(map, POLY_SRC, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} });
  map.setLayoutProperty(POLY_FILL, 'visibility', 'visible');
  map.setLayoutProperty(POLY_LINE, 'visibility', 'visible');

  fitToCoords(map, boundaryPoints, { padding: 80 });

  if (instructions) instructions.textContent = 'Boundary set. Enter your post code and continue.';
  if (btnReset) btnReset.style.display = '';
  updateStats();
  updateContinueButton();
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
  if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
  if (statArea) statArea.textContent = '\u2014';
  if (mapPrompt) mapPrompt.style.display = '';
  if (btnContinue) btnContinue.disabled = true;
  if (btnReset) btnReset.style.display = 'none';
}

function updateStats() {
  if (boundaryPoints.length < 3) return;
  const area = polygonArea(boundaryPoints);
  const ha = sqmToHectares(area);
  if (statArea) {
    if (ha >= 1) {
      statArea.innerHTML = `${ha.toFixed(2)}<span class="unit">ha</span>`;
    } else {
      statArea.innerHTML = formatArea(area).replace(/([\d.]+)\s*(\S+)/, '$1<span class="unit">$2</span>');
    }
  }
}

// ---------------------------------------------------------------------------
// Step 1 validation — boundary closed + post code
// ---------------------------------------------------------------------------

function updateContinueButton() {
  const hasPostcode = postcodeInput && postcodeInput.value.trim().length >= 3;
  if (btnContinue) btnContinue.disabled = !(isClosed && hasPostcode);
}

if (postcodeInput) postcodeInput.addEventListener('input', updateContinueButton);


// Reset button — direct, no confirmation
if (btnReset) {
  btnReset.addEventListener('click', clearAll);
}

// ---------------------------------------------------------------------------
// Pill-group toggle (contact pref, water access)
// ---------------------------------------------------------------------------

document.querySelectorAll('.create-pill-group').forEach(group => {
  group.addEventListener('click', (e) => {
    const pill = e.target.closest('.create-pill');
    if (!pill) return;
    group.querySelectorAll('.create-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    updateSubmitButton();
  });
});

function getPillValue(groupId) {
  const active = document.querySelector(`#${groupId} .create-pill.active`);
  return active ? active.dataset.value : '';
}

// ---------------------------------------------------------------------------
// Step 2 validation — email + use intent + water access
// ---------------------------------------------------------------------------

function isValidEmail(v) { return v && v.includes('@') && v.includes('.'); }

function updateSubmitButton() {
  const hasEmail = isValidEmail(emailInput?.value.trim());
  const hasIntent = useIntent && useIntent.value;
  const hasWater = !!getPillValue('water-access');
  if (btnCreate) btnCreate.disabled = !(hasEmail && hasIntent && hasWater);
}

if (emailInput) emailInput.addEventListener('input', updateSubmitButton);
if (useIntent) useIntent.addEventListener('change', updateSubmitButton);

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------

function showStep(num) {
  if (step1) step1.style.display = num === 1 ? '' : 'none';
  if (step2) step2.style.display = num === 2 ? '' : 'none';
  if (step3) step3.style.display = num === 3 ? '' : 'none';
}

if (btnContinue) {
  btnContinue.addEventListener('click', () => {
    if (!isClosed || !postcodeInput?.value.trim()) return;

    // Pre-fill area from boundary calculation
    const area = polygonArea(boundaryPoints);
    const ha = sqmToHectares(area);
    if (areaOverride) areaOverride.value = ha.toFixed(2);
    if (areaHint) areaHint.textContent = `Auto-calculated from your boundary (${ha.toFixed(2)} ha)`;

    showStep(2);
    updateSubmitButton();
  });
}

if (btnBack) {
  btnBack.addEventListener('click', () => showStep(1));
}

// ---------------------------------------------------------------------------
// File upload — drag & drop + file input
// ---------------------------------------------------------------------------
const dropzone = document.getElementById('dropzone');
let selectedFiles = [];

function addFiles(newFiles) {
  for (const file of newFiles) selectedFiles.push(file);
  renderFileList();
}

function renderFileList() {
  if (!fileList) return;
  fileList.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#40916c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${i + 1}. ${file.name} (${(file.size / 1024).toFixed(0)} KB)</span>`;
    fileList.appendChild(li);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });
}

if (dropzone) {
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('drag-over'); });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  });
}

// ---------------------------------------------------------------------------
// Postcode geocoding — Find button flies map to the postcode
// ---------------------------------------------------------------------------
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

async function findPostcode() {
  const query = postcodeInput ? postcodeInput.value.trim() : '';
  if (query.length < 3) return;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=postcode,place,locality`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      map.flyTo({ center: [lng, lat], zoom: 16 });
      if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  updateContinueButton();
}

if (btnSearch) btnSearch.addEventListener('click', findPostcode);
if (postcodeInput) {
  postcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findPostcode(); }
  });
}

map.on('style.load', () => {
  initMapLayers();
});

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

if (btnCreate) {
  btnCreate.addEventListener('click', async () => {
    if (!isClosed || boundaryPoints.length < 3) return;

    btnCreate.disabled = true;
    btnCreate.textContent = 'Submitting...';

    const calculatedArea = polygonArea(boundaryPoints);
    const overrideHa = areaOverride ? parseFloat(areaOverride.value) : 0;
    const finalArea = overrideHa > 0 ? overrideHa * 10000 : calculatedArea; // convert ha back to sqm

    const perimeter = polygonPerimeter(boundaryPoints);
    const centroid = polygonCentroid(boundaryPoints);

    try {
      await saveSubmission({
        boundary: boundaryPoints,
        center: centroid,
        area: finalArea,
        perimeter: perimeter,
        postcode: postcodeInput ? postcodeInput.value.trim() : '',
        email: emailInput ? emailInput.value.trim() : '',
        phone: phoneInput ? phoneInput.value.trim() : '',
        contactPreference: getPillValue('contact-pref'),
        useIntent: useIntent ? useIntent.value : '',
        waterAccess: getPillValue('water-access'),
        infrastructure: infrastructure ? infrastructure.value : '',
        vegetation: vegetation ? vegetation.value : '',
        notes: notesInput ? notesInput.value.trim() : '',
      }, selectedFiles);

      showStep(3);
    } catch (err) {
      console.error('Failed to save submission:', err);
      btnCreate.disabled = false;
      btnCreate.textContent = 'Submit';
      alert(`Failed to submit: ${err.message}`);
    }
  });
}
