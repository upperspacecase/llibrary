/**
 * LandBook Initial Capture — single sidebar form + optional extras modal
 */

import '../styles/main.css';
import { createMap, mapboxgl, fitToCoords, setGeoJSONSource } from '../lib/mapbox.js';
import { initI18n, t } from '../lib/i18n.js';
import { saveSubmission, updateSubmission } from '../lib/store.js';
import { polygonArea, polygonPerimeter, polygonCentroid, formatArea, sqmToHectares } from '../lib/geo.js';

initI18n();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let boundaryPoints = [];
let isClosed = false;
let submissionId = null;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const postcodeInput = document.getElementById('postcode-input');
const btnSearch = document.getElementById('btn-search');
const statArea = document.getElementById('stat-area');
const areaOverrideRow = document.getElementById('area-override-row');
const areaOverride = document.getElementById('area-override');
const instructions = document.getElementById('map-instructions');
const btnReset = document.getElementById('btn-reset');
const btnGeolocate = document.getElementById('btn-geolocate');
const nameInput = document.getElementById('name-input');
const contactInput = document.getElementById('contact-input');
const btnSubmit = document.getElementById('btn-submit');
const mapArea = document.querySelector('.create-map-area');

// Modal
const extrasModal = document.getElementById('extras-modal');
const notesInput = document.getElementById('notes-input');
const notesCount = document.getElementById('notes-count');
const btnSkipExtras = document.getElementById('btn-skip-extras');
const btnSaveExtras = document.getElementById('btn-save-extras');

// ---------------------------------------------------------------------------
// Map
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

function initMapLayers() {
  map.addSource(POINTS_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: POINTS_LAYER, type: 'circle', source: POINTS_SRC, paint: { 'circle-radius': 6, 'circle-color': '#FFDA03', 'circle-stroke-color': '#C8A800', 'circle-stroke-width': 2 } });
  map.addSource(FIRST_POINT_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: FIRST_POINT_LAYER, type: 'circle', source: FIRST_POINT_SRC, paint: { 'circle-radius': 8, 'circle-color': '#FFDA03', 'circle-stroke-color': '#A08600', 'circle-stroke-width': 2 } });
  map.addSource(LINE_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
  map.addLayer({ id: LINE_LAYER, type: 'line', source: LINE_SRC, paint: { 'line-color': '#FFDA03', 'line-width': 2, 'line-dasharray': [6, 4] } });
  map.addSource(POLY_SRC, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] }, properties: {} } });
  map.addLayer({ id: POLY_FILL, type: 'fill', source: POLY_SRC, paint: { 'fill-color': '#FFDA03', 'fill-opacity': 0.25 }, layout: { visibility: 'none' } });
  map.addLayer({ id: POLY_LINE, type: 'line', source: POLY_SRC, paint: { 'line-color': '#FFDA03', 'line-width': 2.5 }, layout: { visibility: 'none' } });

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
  if (instructions) instructions.textContent = 'Enter your post code and click Find, or use your location';

  map.on('click', (e) => {
    if (isClosed) return;
    const latlng = [e.lngLat.lat, e.lngLat.lng];
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project([boundaryPoints[0][1], boundaryPoints[0][0]]);
      const clickPx = map.project([e.lngLat.lng, e.lngLat.lat]);
      if (Math.sqrt((firstPx.x - clickPx.x) ** 2 + (firstPx.y - clickPx.y) ** 2) <= 20) { closePolygon(); return; }
    }
    addPoint(latlng);
  });

  map.on('mousemove', (e) => {
    if (isClosed) { map.getCanvas().style.cursor = ''; return; }
    if (boundaryPoints.length >= 3) {
      const firstPx = map.project([boundaryPoints[0][1], boundaryPoints[0][0]]);
      const mousePx = map.project([e.lngLat.lng, e.lngLat.lat]);
      map.getCanvas().style.cursor = Math.sqrt((firstPx.x - mousePx.x) ** 2 + (firstPx.y - mousePx.y) ** 2) <= 20 ? 'pointer' : 'crosshair';
    } else {
      map.getCanvas().style.cursor = boundaryPoints.length > 0 ? 'crosshair' : '';
    }
  });
});

map.on('style.load', () => { initMapLayers(); });

// ---------------------------------------------------------------------------
// Map style toggle (Satellite / Terrain)
// ---------------------------------------------------------------------------
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  terrain: 'mapbox://styles/mapbox/outdoors-v12',
};

const styleToggle = document.getElementById('map-style-toggle');
if (styleToggle) {
  styleToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.map-style-btn');
    if (!btn || btn.classList.contains('active')) return;
    styleToggle.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    map.setStyle(MAP_STYLES[btn.dataset.style]);
  });
}

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Postcode geocoding
// ---------------------------------------------------------------------------
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ---------------------------------------------------------------------------
// Geolocation — fly to position + reverse-geocode to fill postcode
// ---------------------------------------------------------------------------
if (btnGeolocate) {
  btnGeolocate.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    btnGeolocate.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { longitude, latitude } = pos.coords;
        btnGeolocate.classList.remove('locating');
        map.flyTo({ center: [longitude, latitude], zoom: 16 });
        if (instructions && boundaryPoints.length === 0) instructions.textContent = 'Click on the map to start drawing your boundary';

        // Reverse-geocode to get postcode
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=postcode&limit=1`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0 && postcodeInput) {
              postcodeInput.value = data.features[0].text;
              updateSubmitState();
            }
          }
        } catch (err) { console.error('Reverse geocode error:', err); }
      },
      () => { btnGeolocate.classList.remove('locating'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

const countryPicker = document.getElementById('country-picker');

function flyToFeature(feature) {
  const [lng, lat] = feature.center;
  map.flyTo({ center: [lng, lat], zoom: 16 });
  if (instructions) instructions.textContent = 'Click on the map to start drawing your boundary';
  if (countryPicker) countryPicker.style.display = 'none';
}

function showCountryPicker(features) {
  if (!countryPicker) return;
  // Extract country name from each feature's context
  const items = features.map(f => {
    const ctx = f.context || [];
    const country = ctx.find(c => c.id?.startsWith('country'));
    return { label: country?.text || f.place_name?.split(', ').pop() || 'Unknown', feature: f };
  });
  // Dedupe by country label
  const seen = new Set();
  const unique = items.filter(i => { if (seen.has(i.label)) return false; seen.add(i.label); return true; });

  if (unique.length <= 1) { flyToFeature(features[0]); return; }

  countryPicker.innerHTML = unique.map((item, i) =>
    `<button type="button" class="create-pill" data-idx="${i}">${item.label}</button>`
  ).join('');
  countryPicker.style.display = 'flex';
  countryPicker._features = unique;

  countryPicker.addEventListener('click', (e) => {
    const pill = e.target.closest('.create-pill');
    if (!pill) return;
    countryPicker.querySelectorAll('.create-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    flyToFeature(countryPicker._features[parseInt(pill.dataset.idx)].feature);
  }, { once: false });
}

async function findPostcode() {
  const query = postcodeInput ? postcodeInput.value.trim() : '';
  if (query.length < 3) return;
  if (countryPicker) countryPicker.style.display = 'none';
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=postcode,place,locality`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.features || data.features.length === 0) return;

    if (data.features.length === 1) {
      flyToFeature(data.features[0]);
    } else {
      showCountryPicker(data.features);
    }
  } catch (err) { console.error('Geocoding error:', err); }
}

if (btnSearch) btnSearch.addEventListener('click', findPostcode);
if (postcodeInput) {
  postcodeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); findPostcode(); } });
  postcodeInput.addEventListener('input', () => { if (countryPicker) countryPicker.style.display = 'none'; });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function addPoint(latlng) {
  boundaryPoints.push(latlng);
  if (instructions) {
    instructions.textContent = boundaryPoints.length < 3
      ? 'Keep clicking to add more points'
      : 'Click near the first point to close the boundary';
  }
  updateDrawing();
}

function updateDrawing() {
  setGeoJSONSource(map, LINE_SRC, { type: 'Feature', geometry: { type: 'LineString', coordinates: boundaryPoints.map(([lat, lng]) => [lng, lat]) }, properties: {} });
  setGeoJSONSource(map, POINTS_SRC, { type: 'FeatureCollection', features: boundaryPoints.slice(1).map(([lat, lng], i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { idx: i + 1 } })) });
  if (boundaryPoints.length > 0) {
    const [lat, lng] = boundaryPoints[0];
    setGeoJSONSource(map, FIRST_POINT_SRC, { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }] });
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
  if (instructions) instructions.textContent = 'Boundary set. Fill in your details and submit.';
  if (btnReset) btnReset.style.display = '';
  if (areaOverrideRow) areaOverrideRow.style.display = 'flex';
  updateStats();
  updateSubmitState();
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
  if (btnReset) btnReset.style.display = 'none';
  if (areaOverrideRow) areaOverrideRow.style.display = 'none';
  if (areaOverride) areaOverride.value = '';
  updateSubmitState();
}

function updateStats() {
  if (boundaryPoints.length < 3) return;
  const area = polygonArea(boundaryPoints);
  const ha = sqmToHectares(area);
  if (statArea) {
    statArea.innerHTML = ha >= 1
      ? `${ha.toFixed(2)}<span class="unit">ha</span>`
      : formatArea(area).replace(/([\d.]+)\s*(\S+)/, '$1<span class="unit">$2</span>');
  }
  if (areaOverride) areaOverride.placeholder = ha.toFixed(2);
}

if (btnReset) btnReset.addEventListener('click', clearAll);

// ---------------------------------------------------------------------------
// Contact toggle — switch between email and WhatsApp
// ---------------------------------------------------------------------------
const contactMethodGroup = document.getElementById('contact-method');
if (contactMethodGroup) {
  contactMethodGroup.addEventListener('click', (e) => {
    const pill = e.target.closest('.create-pill');
    if (!pill) return;
    contactMethodGroup.querySelectorAll('.create-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    if (contactInput) {
      if (pill.dataset.value === 'whatsapp') {
        contactInput.type = 'tel';
        contactInput.placeholder = '+351...';
        contactInput.autocomplete = 'tel';
      } else {
        contactInput.type = 'email';
        contactInput.placeholder = 'you@example.com';
        contactInput.autocomplete = 'email';
      }
    }
    updateSubmitState();
  });
}

// ---------------------------------------------------------------------------
// Pill-group toggle (generic, for modal)
// ---------------------------------------------------------------------------
document.querySelectorAll('.create-pill-group--single').forEach(group => {
  group.addEventListener('click', (e) => {
    const pill = e.target.closest('.create-pill');
    if (!pill) return;
    group.querySelectorAll('.create-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
  });
});

function getPillValue(groupId) {
  const active = document.querySelector(`#${groupId} .create-pill.active`);
  return active ? active.dataset.value : '';
}

// ---------------------------------------------------------------------------
// Submit validation with inline errors
// ---------------------------------------------------------------------------
const errPostcode = document.getElementById('err-postcode');
const errBoundary = document.getElementById('err-boundary');
const errName = document.getElementById('err-name');
const errContact = document.getElementById('err-contact');

function showError(el, inputEl, show) {
  if (el) el.classList.toggle('visible', show);
  if (inputEl) inputEl.classList.toggle('has-error', show);
}

function clearErrors() {
  showError(errPostcode, postcodeInput, false);
  showError(errBoundary, null, false);
  showError(errName, nameInput, false);
  showError(errContact, contactInput, false);
}

function updateSubmitState() {
  // Just enable/disable — errors shown on submit attempt
  const hasPostcode = postcodeInput && postcodeInput.value.trim().length >= 3;
  const hasName = nameInput && nameInput.value.trim().length > 0;
  const hasContact = contactInput && contactInput.value.trim().length > 3;
  if (btnSubmit) btnSubmit.disabled = false; // always enabled, validate on click
}

if (postcodeInput) postcodeInput.addEventListener('input', () => { showError(errPostcode, postcodeInput, false); });
if (nameInput) nameInput.addEventListener('input', () => { showError(errName, nameInput, false); });
if (contactInput) contactInput.addEventListener('input', () => { showError(errContact, contactInput, false); });

// ---------------------------------------------------------------------------
// Notes character count
// ---------------------------------------------------------------------------
if (notesInput && notesCount) {
  notesInput.addEventListener('input', () => { notesCount.textContent = notesInput.value.length; });
}

// ---------------------------------------------------------------------------
// Submit — validate, show errors, then save + show extras modal
// ---------------------------------------------------------------------------
if (btnSubmit) {
  btnSubmit.addEventListener('click', async () => {
    clearErrors();

    const hasPostcode = postcodeInput && postcodeInput.value.trim().length >= 3;
    const hasBoundary = isClosed && boundaryPoints.length >= 3;
    const hasName = nameInput && nameInput.value.trim().length > 0;
    const hasContact = contactInput && contactInput.value.trim().length > 3;

    let valid = true;
    if (!hasPostcode) { showError(errPostcode, postcodeInput, true); valid = false; }
    if (!hasBoundary) { showError(errBoundary, null, true); valid = false; }
    if (!hasName) { showError(errName, nameInput, true); valid = false; }
    if (!hasContact) { showError(errContact, contactInput, true); valid = false; }
    if (!valid) return;

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Submitting...';

    const calculatedArea = polygonArea(boundaryPoints);
    const overrideHa = areaOverride ? parseFloat(areaOverride.value) : 0;
    const area = overrideHa > 0 ? overrideHa * 10000 : calculatedArea;

    try {
      const result = await saveSubmission({
        boundary: boundaryPoints,
        center: polygonCentroid(boundaryPoints),
        area,
        perimeter: polygonPerimeter(boundaryPoints),
        postcode: postcodeInput.value.trim(),
        name: nameInput ? nameInput.value.trim() : '',
        contactMethod: getPillValue('contact-method'),
        contact: contactInput ? contactInput.value.trim() : '',
      });
      submissionId = result.id;
      if (extrasModal) extrasModal.style.display = 'flex';
    } catch (err) {
      console.error('Failed to save submission:', err);
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit';
      alert(`Failed to submit: ${err.message}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Chip grid helpers — collect checked values + other text
// ---------------------------------------------------------------------------
function getChipValues(groupName) {
  const checked = [];
  document.querySelectorAll(`.create-chip-grid[data-group="${groupName}"] input:checked`).forEach(cb => checked.push(cb.value));
  const other = document.querySelector(`.create-chip-other[data-group="${groupName}"]`);
  if (other && other.value.trim()) checked.push(other.value.trim());
  return checked;
}

// ---------------------------------------------------------------------------
// Extras modal — PATCH optional data onto submission
// ---------------------------------------------------------------------------
function closeModal() {
  if (extrasModal) extrasModal.style.display = 'none';
  const sidebar = document.querySelector('.create-sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="create-sidebar-content create-success-state">
        <div class="create-success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#40916c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h2>Submission received</h2>
        <p class="create-desc">Thank you for sharing your land with us. We'll be in touch soon.</p>
      </div>`;
  }
}

if (btnSkipExtras) btnSkipExtras.addEventListener('click', closeModal);

if (btnSaveExtras) {
  btnSaveExtras.addEventListener('click', async () => {
    if (!submissionId) { closeModal(); return; }
    btnSaveExtras.disabled = true;
    btnSaveExtras.textContent = 'Saving...';

    try {
      await updateSubmission(submissionId, {
        landCondition: getChipValues('landCondition'),
        landUse: getChipValues('landUse'),
        zoning: getChipValues('zoning'),
        waterReliability: getPillValue('water-reliability'),
        waterSource: getChipValues('waterSource'),
        challenges: getChipValues('challenges'),
        landGoals: getChipValues('landGoals'),
        helpNeeded: getChipValues('helpNeeded'),
        notes: notesInput ? notesInput.value.trim() : '',
      });
    } catch (err) {
      console.error('Failed to save extras:', err);
    }
    closeModal();
  });
}

if (extrasModal) extrasModal.addEventListener('click', (e) => { if (e.target === extrasModal) closeModal(); });
