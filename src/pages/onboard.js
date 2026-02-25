import '../styles/main.css';
import { createMap, mapboxgl, addMarker } from '../lib/mapbox.js';
import { initI18n, t, applyTranslations } from '../lib/i18n.js';
import { saveProperty } from '../lib/store.js';

initI18n();

const TOTAL_STEPS = 7;
let currentStep = 0;
let map = null;
let marker = null;

const form = document.getElementById('onboard-form');
const steps = form.querySelectorAll('.form-step');
const pips = document.querySelectorAll('.progress-bar .pip');
const btnBack = document.getElementById('btn-back');
const btnNext = document.getElementById('btn-next');

function showStep(idx) {
  steps.forEach((s, i) => s.classList.toggle('active', i === idx));
  pips.forEach((p, i) => {
    p.classList.remove('active', 'done');
    if (i < idx) p.classList.add('done');
    if (i === idx) p.classList.add('active');
  });
  btnBack.style.visibility = idx === 0 ? 'hidden' : 'visible';
  btnNext.textContent = idx === TOTAL_STEPS - 1 ? t('onboard.nav.submit') : t('onboard.nav.next');

  if (idx === 1 && !map) initMap();
  if (idx === TOTAL_STEPS - 1) buildReview();

  currentStep = idx;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initMap() {
  map = createMap('onboard-map', {
    center: [-8.0, 39.5],
    zoom: 6,
  });

  map.on('load', () => {
    map.on('click', (e) => setMapLocation(e.lngLat.lat, e.lngLat.lng));
  });

  const addressInput = document.getElementById('address-input');
  let debounceTimer;
  addressInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => geocodeAddress(this.value), 600);
  });

  // MapBox handles resize automatically, but trigger it just in case
  setTimeout(() => map.resize(), 200);
}

function setMapLocation(lat, lng) {
  document.getElementById('lat-input').value = lat.toFixed(6);
  document.getElementById('lng-input').value = lng.toFixed(6);

  if (marker) {
    marker.setLngLat([lng, lat]);
  } else {
    marker = addMarker(map, [lng, lat], { draggable: true });
    marker.on('dragend', () => {
      const pos = marker.getLngLat();
      document.getElementById('lat-input').value = pos.lat.toFixed(6);
      document.getElementById('lng-input').value = pos.lng.toFixed(6);
    });
  }
  map.flyTo({ center: [lng, lat], zoom: 13 });
}

function geocodeAddress(query) {
  if (!query || query.length < 3) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
    .then((r) => r.json())
    .then((results) => {
      if (results.length > 0) {
        setMapLocation(parseFloat(results[0].lat), parseFloat(results[0].lon));
      }
    })
    .catch(() => { });
}

function getFormData() {
  const fd = new FormData(form);
  return {
    propertyName: fd.get('propertyName') || '',
    ownerName: fd.get('ownerName') || '',
    email: fd.get('email') || '',
    address: fd.get('address') || '',
    lat: fd.get('lat') || '',
    lng: fd.get('lng') || '',
    area: fd.get('area') || '',
    areaUnit: fd.get('areaUnit') || 'hectares',
    landUse: fd.getAll('landUse'),
    soil: fd.get('soil') || '',
    water: fd.get('water') || '',
    flora: fd.get('flora') || '',
    fauna: fd.get('fauna') || '',
    fire: fd.get('fire') || '',
    challenges: fd.getAll('challenges'),
    goals: fd.getAll('goals'),
  };
}

function buildReview() {
  const data = getFormData();
  const container = document.getElementById('review-content');

  const sections = [
    {
      label: t('review.basics'), rows: [
        [t('onboard.s1.name'), data.propertyName],
        [t('onboard.s1.owner'), data.ownerName],
        [t('onboard.s1.email'), data.email || '\u2014'],
      ]
    },
    {
      label: t('review.location'), rows: [
        [t('onboard.s2.address'), data.address || '\u2014'],
        [t('onboard.s2.lat') + ' / ' + t('onboard.s2.lng'), data.lat && data.lng ? `${data.lat}, ${data.lng}` : '\u2014'],
      ]
    },
    {
      label: t('review.land'), rows: [
        [t('onboard.s3.area'), data.area ? `${data.area} ${data.areaUnit}` : '\u2014'],
        [t('onboard.s3.landuse'), data.landUse.length ? data.landUse.join(', ') : '\u2014'],
      ]
    },
    {
      label: t('review.soil_water'), rows: [
        [t('onboard.s4.soil'), data.soil || '\u2014'],
        [t('onboard.s4.water'), data.water || '\u2014'],
      ]
    },
    {
      label: t('review.ecology'), rows: [
        [t('onboard.s5.flora'), data.flora || '\u2014'],
        [t('onboard.s5.fauna'), data.fauna || '\u2014'],
        [t('onboard.s5.fire'), data.fire || '\u2014'],
      ]
    },
    {
      label: t('review.challenges_goals'), rows: [
        [t('onboard.s6.challenges'), data.challenges.length ? data.challenges.join(', ') : '\u2014'],
        [t('onboard.s6.goals'), data.goals.length ? data.goals.join(', ') : '\u2014'],
      ]
    },
  ];

  container.innerHTML = sections.map((s) => `
    <div class="review-group">
      <h3>${s.label}</h3>
      ${s.rows.map(([label, value]) => `
        <div class="review-row">
          <span class="rr-label">${label}</span>
          <span>${value}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function validateStep(idx) {
  if (idx === 0) {
    const name = form.querySelector('[name="propertyName"]').value.trim();
    const owner = form.querySelector('[name="ownerName"]').value.trim();
    if (!name || !owner) {
      form.querySelector('[name="propertyName"]').reportValidity();
      return false;
    }
  }
  return true;
}

btnNext.addEventListener('click', async () => {
  if (!validateStep(currentStep)) return;
  if (currentStep === TOTAL_STEPS - 1) {
    const data = getFormData();
    btnNext.disabled = true;
    btnNext.textContent = 'Saving\u2026';
    try {
      const property = await saveProperty(data);
      window.location.href = `passport.html?id=${property.id}`;
    } catch (err) {
      console.error('Save failed:', err);
      btnNext.disabled = false;
      btnNext.textContent = t('onboard.nav.submit');
      alert('Failed to save. Please try again.');
    }
  } else {
    showStep(currentStep + 1);
  }
});

btnBack.addEventListener('click', () => {
  if (currentStep > 0) showStep(currentStep - 1);
});

showStep(0);
