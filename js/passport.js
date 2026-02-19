/* ========================================
   lllibrary of Earth — Land Passport
   ======================================== */

(function () {
  const container = document.getElementById('passport-content');
  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get('id');

  if (!propertyId) {
    showNotFound();
    return;
  }

  const property = getProperty(propertyId);
  if (!property) {
    showNotFound();
    return;
  }

  document.title = `${property.propertyName} — Land Passport — lllibrary of Earth`;
  renderPassport(property);

  // Fetch open data after rendering
  if (property.lat && property.lng) {
    fetchOpenData(parseFloat(property.lat), parseFloat(property.lng));
  }

  function showNotFound() {
    container.innerHTML = `
      <div class="empty-state" style="padding-top:120px;">
        <h3 data-i18n="passport.notfound">Property not found</h3>
        <p data-i18n="passport.notfound.desc">This Land Passport doesn't exist or may have been removed.</p>
        <a href="onboard.html" class="btn-primary" data-i18n="hero.cta.add">Add Your Property</a>
      </div>
    `;
    if (typeof applyTranslations === 'function') applyTranslations();
  }

  function renderPassport(p) {
    const hasLocation = p.lat && p.lng;
    const landUseDisplay = Array.isArray(p.landUse) ? p.landUse.join(', ') : (p.landUse || '—');
    const challengesDisplay = Array.isArray(p.challenges) ? p.challenges.join(', ') : (p.challenges || '—');
    const goalsDisplay = Array.isArray(p.goals) ? p.goals.join(', ') : (p.goals || '—');
    const areaDisplay = p.area ? `${p.area} ${p.areaUnit || 'hectares'}` : '—';

    container.innerHTML = `
      <!-- HEADER -->
      <div class="passport-header">
        <div class="section-label">Land Passport</div>
        <h1>${escapeHtml(p.propertyName)}</h1>
        <div class="passport-meta">
          <span><strong data-i18n="passport.owner">Owner</strong>: ${escapeHtml(p.ownerName)}</span>
          ${p.address ? `<span><strong data-i18n="passport.location">Location</strong>: ${escapeHtml(p.address)}</span>` : ''}
          ${p.area ? `<span><strong data-i18n="passport.area">Area</strong>: ${areaDisplay}</span>` : ''}
        </div>
      </div>

      <!-- MAP -->
      ${hasLocation ? `
        <div class="passport-map">
          <div id="passport-map"></div>
        </div>
      ` : ''}

      <!-- OWNER DATA -->
      <div class="passport-section">
        <h2 data-i18n="passport.contributed">Owner-contributed data</h2>
        <div class="data-grid">
          ${dataCard(t('passport.landuse'), landUseDisplay)}
          ${dataCard(t('passport.soil'), p.soil)}
          ${dataCard(t('passport.water'), p.water)}
          ${dataCard(t('passport.flora'), p.flora)}
          ${dataCard(t('passport.fauna'), p.fauna)}
          ${dataCard(t('passport.fire'), p.fire)}
        </div>
        ${challengesDisplay !== '—' ? `
          <div style="margin-top:24px;">
            <div class="data-label" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:8px;" data-i18n="passport.challenges">Challenges</div>
            <div class="tag-list">${renderTags(p.challenges)}</div>
          </div>
        ` : ''}
        ${goalsDisplay !== '—' ? `
          <div style="margin-top:20px;">
            <div class="data-label" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:8px;" data-i18n="passport.goals">Goals</div>
            <div class="tag-list">${renderTags(p.goals)}</div>
          </div>
        ` : ''}
      </div>

      <!-- AUTO DATA -->
      <div class="passport-section">
        <h2 data-i18n="passport.auto">Auto-aggregated open data</h2>
        <div class="auto-data-banner">
          <span class="icon">&#9889;</span>
          <span data-i18n="passport.auto.banner">This data was automatically gathered from public sources based on the property location.</span>
        </div>
        <div class="data-grid" id="auto-data-grid">
          ${hasLocation ? '<p style="color:#555;font-size:14px;grid-column:1/-1;">Loading open data...</p>' : '<p style="color:#555;font-size:14px;grid-column:1/-1;">No location set — open data requires coordinates.</p>'}
        </div>
      </div>

      <!-- SEASONAL -->
      <div class="passport-section">
        <h2 data-i18n="passport.seasonal">Seasonal guidance</h2>
        <div class="seasonal-card" id="seasonal-card">
          <p style="color:#333;font-size:14px;">Loading seasonal information...</p>
        </div>
      </div>

      <!-- SHARE -->
      <div style="text-align:center;padding:40px 0 60px;">
        <button class="btn-outline" onclick="copyPassportLink()" data-i18n="passport.share">Share this Passport</button>
      </div>
    `;

    if (typeof applyTranslations === 'function') applyTranslations();

    // Initialize map
    if (hasLocation) {
      setTimeout(() => {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        const pMap = L.map('passport-map').setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(pMap);
        L.marker([lat, lng]).addTo(pMap);
      }, 100);
    }
  }

  function dataCard(label, value) {
    const display = value || '—';
    return `
      <div class="data-item">
        <div class="data-label">${label}</div>
        <div class="data-value">${escapeHtml(display)}</div>
      </div>
    `;
  }

  function renderTags(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fetchOpenData(lat, lng) {
    const grid = document.getElementById('auto-data-grid');
    const seasonal = document.getElementById('seasonal-card');

    // Fetch weather from Open-Meteo
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&past_days=0&forecast_days=7`)
      .then(r => r.json())
      .then(weather => {
        const daily = weather.daily;
        let avgMax = 0, avgMin = 0, totalRain = 0;
        if (daily && daily.temperature_2m_max) {
          const days = daily.temperature_2m_max.length;
          avgMax = daily.temperature_2m_max.reduce((a, b) => a + b, 0) / days;
          avgMin = daily.temperature_2m_min.reduce((a, b) => a + b, 0) / days;
          totalRain = daily.precipitation_sum.reduce((a, b) => a + b, 0);
        }

        // Also fetch elevation
        return fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
          .then(r => r.json())
          .then(elev => {
            const elevation = elev.elevation ? elev.elevation[0] : null;
            grid.innerHTML = `
              ${dataCard(t('passport.weather'), `${avgMin.toFixed(1)}°C — ${avgMax.toFixed(1)}°C`)}
              ${dataCard(t('passport.rain'), `${totalRain.toFixed(1)} mm (7-day)`)}
              ${elevation !== null ? dataCard(t('passport.elevation'), `${Math.round(elevation)} m`) : ''}
              ${dataCard(t('passport.bioregion'), getBioregionEstimate(lat, lng))}
            `;

            // Seasonal guidance
            const month = new Date().getMonth();
            seasonal.innerHTML = `
              <h3>${getSeasonName(month, lat)}</h3>
              <p>${getSeasonalGuidance(month, lat, avgMax, totalRain)}</p>
            `;
          });
      })
      .catch(() => {
        grid.innerHTML = '<p style="color:#555;font-size:14px;grid-column:1/-1;">Unable to load open data. Please check your connection.</p>';
      });
  }

  function getBioregionEstimate(lat, lng) {
    // Rough bioregion classification based on coordinates
    if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 4) return 'Mediterranean (Iberian Peninsula)';
    if (lat >= 44 && lat <= 55 && lng >= -5 && lng <= 15) return 'Atlantic European';
    if (lat >= 35 && lat <= 45 && lng >= 10 && lng <= 30) return 'Mediterranean (Eastern)';
    if (lat >= 50 && lat <= 70 && lng >= -10 && lng <= 30) return 'Boreal / Temperate European';
    if (lat >= 23 && lat <= 35 && lng >= -120 && lng <= -80) return 'Subtropical (North America)';
    if (lat >= 35 && lat <= 50 && lng >= -130 && lng <= -60) return 'Temperate (North America)';
    if (lat >= -35 && lat <= 0 && lng >= -60 && lng <= -30) return 'Tropical / Subtropical (South America)';
    if (lat >= -45 && lat <= -20 && lng >= 110 && lng <= 155) return 'Temperate (Australasia)';
    if (lat >= -10 && lat <= 10) return 'Tropical Equatorial';
    return 'Unclassified — detailed bioregion data coming soon';
  }

  function getSeasonName(month, lat) {
    const isNorthern = lat >= 0;
    if (isNorthern) {
      if (month >= 2 && month <= 4) return 'Spring';
      if (month >= 5 && month <= 7) return 'Summer';
      if (month >= 8 && month <= 10) return 'Autumn';
      return 'Winter';
    } else {
      if (month >= 2 && month <= 4) return 'Autumn';
      if (month >= 5 && month <= 7) return 'Winter';
      if (month >= 8 && month <= 10) return 'Spring';
      return 'Summer';
    }
  }

  function getSeasonalGuidance(month, lat, avgTemp, weeklyRain) {
    const isNorthern = lat >= 0;
    const season = getSeasonName(month, lat);
    const dry = weeklyRain < 5;

    const tips = {
      'Spring': `Growing season is beginning. ${dry ? 'Rainfall has been low — consider irrigation planning.' : 'Moisture levels are favorable for planting.'} Average temperatures around ${avgTemp.toFixed(0)}°C suggest conditions are suitable for most temperate crops and seedlings.`,
      'Summer': `Peak growing season. ${dry ? 'Dry conditions detected — monitor water reserves and fire risk closely.' : 'Rainfall is present but monitor for heat stress.'} With temperatures near ${avgTemp.toFixed(0)}°C, ensure adequate shading and water access for livestock and sensitive crops.`,
      'Autumn': `Harvest and preparation season. ${dry ? 'Conditions are dry — good for harvest but prepare water reserves for winter.' : 'Adequate moisture for cover crop establishment.'} Consider soil amendments and cover cropping before winter dormancy.`,
      'Winter': `Dormant season for most temperate species. ${dry ? 'Dry winter — unusual, monitor soil moisture.' : 'Adequate moisture for soil recovery.'} Good time for infrastructure maintenance, pruning, and planning for spring.`
    };

    return tips[season] || 'Seasonal data unavailable for this location.';
  }

  // Share link
  window.copyPassportLink = function () {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const btn = document.querySelector('[data-i18n="passport.share"]');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  };
})();
