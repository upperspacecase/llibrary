/* ========================================
   lllibrary of Earth — Onboarding Flow
   ======================================== */

(function () {
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
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    pips.forEach((p, i) => {
      p.classList.remove('active', 'done');
      if (i < idx) p.classList.add('done');
      if (i === idx) p.classList.add('active');
    });
    btnBack.style.visibility = idx === 0 ? 'hidden' : 'visible';

    if (idx === TOTAL_STEPS - 1) {
      btnNext.textContent = t('onboard.nav.submit');
    } else {
      btnNext.textContent = t('onboard.nav.next');
    }

    // Initialize map when location step is shown
    if (idx === 1 && !map) {
      initMap();
    }

    // Build review when last step is shown
    if (idx === TOTAL_STEPS - 1) {
      buildReview();
    }

    currentStep = idx;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initMap() {
    map = L.map('onboard-map').setView([39.5, -8.0], 6); // Default to Portugal
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', function (e) {
      setMapLocation(e.latlng.lat, e.latlng.lng);
    });

    // Address geocoding
    const addressInput = document.getElementById('address-input');
    let debounceTimer;
    addressInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => geocodeAddress(this.value), 600);
    });

    // Fix map rendering after tab switch
    setTimeout(() => map.invalidateSize(), 200);
  }

  function setMapLocation(lat, lng) {
    document.getElementById('lat-input').value = lat.toFixed(6);
    document.getElementById('lng-input').value = lng.toFixed(6);

    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', function () {
        const pos = marker.getLatLng();
        document.getElementById('lat-input').value = pos.lat.toFixed(6);
        document.getElementById('lng-input').value = pos.lng.toFixed(6);
      });
    }
    map.setView([lat, lng], 13);
  }

  function geocodeAddress(query) {
    if (!query || query.length < 3) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      .then(r => r.json())
      .then(results => {
        if (results.length > 0) {
          const r = results[0];
          setMapLocation(parseFloat(r.lat), parseFloat(r.lon));
        }
      })
      .catch(() => { /* silently fail */ });
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
        label: t('review.basics'),
        rows: [
          [t('onboard.s1.name'), data.propertyName],
          [t('onboard.s1.owner'), data.ownerName],
          [t('onboard.s1.email'), data.email || '—'],
        ]
      },
      {
        label: t('review.location'),
        rows: [
          [t('onboard.s2.address'), data.address || '—'],
          [t('onboard.s2.lat') + ' / ' + t('onboard.s2.lng'), data.lat && data.lng ? `${data.lat}, ${data.lng}` : '—'],
        ]
      },
      {
        label: t('review.land'),
        rows: [
          [t('onboard.s3.area'), data.area ? `${data.area} ${data.areaUnit}` : '—'],
          [t('onboard.s3.landuse'), data.landUse.length ? data.landUse.join(', ') : '—'],
        ]
      },
      {
        label: t('review.soil_water'),
        rows: [
          [t('onboard.s4.soil'), data.soil || '—'],
          [t('onboard.s4.water'), data.water || '—'],
        ]
      },
      {
        label: t('review.ecology'),
        rows: [
          [t('onboard.s5.flora'), data.flora || '—'],
          [t('onboard.s5.fauna'), data.fauna || '—'],
          [t('onboard.s5.fire'), data.fire || '—'],
        ]
      },
      {
        label: t('review.challenges_goals'),
        rows: [
          [t('onboard.s6.challenges'), data.challenges.length ? data.challenges.join(', ') : '—'],
          [t('onboard.s6.goals'), data.goals.length ? data.goals.join(', ') : '—'],
        ]
      },
    ];

    container.innerHTML = sections.map(section => `
      <div class="review-group">
        <h3>${section.label}</h3>
        ${section.rows.map(([label, value]) => `
          <div class="review-row">
            <span class="rr-label">${label}</span>
            <span>${value}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  function validateStep(idx) {
    // Only require property name and owner name on step 0
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

  function submitForm() {
    const data = getFormData();
    const property = saveProperty(data);
    // Redirect to the new Land Passport
    window.location.href = `passport.html?id=${property.id}`;
  }

  btnNext.addEventListener('click', function () {
    if (!validateStep(currentStep)) return;

    if (currentStep === TOTAL_STEPS - 1) {
      submitForm();
    } else {
      showStep(currentStep + 1);
    }
  });

  btnBack.addEventListener('click', function () {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });

  // Initialize
  showStep(0);
})();
