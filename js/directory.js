/* ========================================
   lllibrary of Earth — Directory
   ======================================== */

(function () {
  const listEl = document.getElementById('dir-list');
  const searchInput = document.getElementById('dir-search');
  const mapWrap = document.getElementById('dir-map-wrap');
  const viewBtns = document.querySelectorAll('.view-toggle button');

  let dirMap = null;
  let currentView = 'list';

  function render(filter) {
    const properties = getAllProperties();
    const query = (filter || '').toLowerCase();
    const filtered = properties.filter(p => {
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
          <p data-i18n="dir.empty.desc">Be the first to create a Land Passport and start building the knowledge base.</p>
          <a href="onboard.html" class="btn-primary" data-i18n="dir.empty.cta">Add Your Property</a>
        </div>
      `;
      if (typeof applyTranslations === 'function') applyTranslations();
      return;
    }

    listEl.innerHTML = filtered.map(p => {
      const landUse = Array.isArray(p.landUse) ? p.landUse : [];
      const area = p.area ? `${p.area} ${p.areaUnit || 'ha'}` : '';
      return `
        <a href="passport.html?id=${p.id}" class="property-card">
          <h3>${escapeHtml(p.propertyName)}</h3>
          <div class="prop-location">${escapeHtml(p.address || (p.lat && p.lng ? `${parseFloat(p.lat).toFixed(4)}, ${parseFloat(p.lng).toFixed(4)}` : ''))}</div>
          <div class="prop-tags">
            ${landUse.map(lu => `<span class="prop-tag">${escapeHtml(lu)}</span>`).join('')}
            ${area ? `<span class="prop-tag">${area}</span>` : ''}
          </div>
        </a>
      `;
    }).join('');

    // Update map markers
    if (dirMap) {
      updateMapMarkers(filtered);
    }
  }

  function initMap() {
    if (dirMap) return;
    dirMap = L.map('dir-map').setView([39.5, -8.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(dirMap);
    updateMapMarkers(getAllProperties());
  }

  function updateMapMarkers(properties) {
    if (!dirMap) return;
    // Clear existing markers
    dirMap.eachLayer(layer => {
      if (layer instanceof L.Marker) dirMap.removeLayer(layer);
    });

    const bounds = [];
    properties.forEach(p => {
      if (p.lat && p.lng) {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        const m = L.marker([lat, lng]).addTo(dirMap);
        m.bindPopup(`<strong>${escapeHtml(p.propertyName)}</strong><br><a href="passport.html?id=${p.id}">View Passport</a>`);
        bounds.push([lat, lng]);
      }
    });

    if (bounds.length > 0) {
      dirMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }

  function setView(view) {
    currentView = view;
    viewBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));

    if (view === 'map') {
      mapWrap.classList.add('visible');
      listEl.style.display = 'none';
      if (!dirMap) {
        initMap();
        setTimeout(() => dirMap.invalidateSize(), 200);
      } else {
        dirMap.invalidateSize();
      }
    } else {
      mapWrap.classList.remove('visible');
      listEl.style.display = '';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Events
  searchInput.addEventListener('input', function () {
    render(this.value);
  });

  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // Initialize
  render();
})();
