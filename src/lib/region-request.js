/**
 * region-request.js — Shared "Request a Region" section + modal.
 * Single source of truth used by both the home page and commons page.
 *
 * Usage:
 *   import { initRegionRequest } from '../lib/region-request.js';
 *   initRegionRequest(document.getElementById('region-request-container'));
 */

import { t } from './i18n.js';

const PLUS_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
const CHECK_SVG = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green, #2d6a4f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>';

const FALLBACK_REGIONS = [
  'Algarve, Portugal',
  'Sintra, Portugal',
  'Douro Valley, Portugal',
  'Provence, France',
  'Andalusia, Spain',
  'Peloponnese, Greece',
  'Cotswolds, England',
  'Willamette Valley, Oregon',
  'Byron Bay, Australia',
  'Waikato, New Zealand',
].map(name => ({ name, votes: 0 }));

export async function initRegionRequest(container) {
  if (!container) return;

  // Fetch regions from API, fall back to hardcoded seeds
  let regions = FALLBACK_REGIONS;
  try {
    const res = await fetch('/api/regions');
    if (res.ok) {
      const data = await res.json();
      if (data.regions && data.regions.length > 0) {
        regions = data.regions;
      }
    }
  } catch {
    // Use fallback regions
  }

  // Render section
  container.innerHTML = renderSection(regions);

  // Render modal (append to body so it's not nested inside a section)
  let modalEl = document.getElementById('region-request-overlay');
  if (!modalEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderModal();
    modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);
  }

  // Bind events
  bindEvents(container, modalEl, regions);
}

function renderSection(regions) {
  const pillsHTML = regions.map(r => {
    const display = r.name.split(',')[0].trim();
    const countLabel = r.votes > 0 ? ` <span class="region-pill-count">${r.votes}</span>` : '';
    return `<button class="add-region-pill" data-region="${escHTML(r.name)}">${escHTML(display)}${countLabel}</button>`;
  }).join('');

  return `
    <div class="container">
      <div class="commons-hub-request-inner">
        <div class="section-label">${t('commons.request.label')}</div>
        <h2 class="add-region-title">${t('commons.request.title')}</h2>
        <p class="add-region-desc">${t('commons.request.desc')}</p>
        <div class="add-region-pills">${pillsHTML}</div>
        <div class="add-region-cta-wrap">
          <button class="add-region-cta" id="open-add-region">
            ${PLUS_SVG}
            <span>${t('commons.request.cta')}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderModal() {
  return `
    <div class="add-region-overlay" id="region-request-overlay" style="display:none;">
      <div class="add-region-modal">
        <button class="add-region-close" id="region-request-close">&times;</button>
        <div class="add-region-success" id="region-request-success" style="display:none;">
          <div class="add-region-success-icon">${CHECK_SVG}</div>
          <h3>${t('landing.region.modal.success.title')}</h3>
          <p>${t('landing.region.modal.success.desc')}</p>
        </div>
        <div class="add-region-form-state" id="region-request-form">
          <h3>${t('landing.region.modal.title')}</h3>
          <p class="add-region-modal-sub">${t('landing.region.modal.desc')}</p>
          <div class="add-region-fields">
            <div class="add-region-field">
              <label for="region-request-location">${t('landing.region.modal.location')}</label>
              <input type="text" id="region-request-location" placeholder="e.g. Provence, France" />
            </div>
            <div class="add-region-field">
              <label for="region-request-email">${t('landing.region.modal.email')}</label>
              <input type="email" id="region-request-email" placeholder="you@example.com" required />
            </div>
          </div>
          <button class="add-region-submit" id="region-request-submit">${t('landing.region.modal.submit')}</button>
          <div class="add-region-feedback" id="region-request-feedback"></div>
        </div>
      </div>
    </div>
  `;
}

function bindEvents(container, modalEl, regions) {
  const overlay = modalEl;
  const closeBtn = overlay.querySelector('#region-request-close');
  const formState = overlay.querySelector('#region-request-form');
  const successState = overlay.querySelector('#region-request-success');
  const submitBtn = overlay.querySelector('#region-request-submit');
  const locationInput = overlay.querySelector('#region-request-location');
  const emailInput = overlay.querySelector('#region-request-email');
  const feedback = overlay.querySelector('#region-request-feedback');
  const openBtn = container.querySelector('#open-add-region');

  function openModal(prefill) {
    formState.style.display = '';
    successState.style.display = 'none';
    feedback.textContent = '';
    submitBtn.disabled = false;
    submitBtn.textContent = t('landing.region.modal.submit');
    locationInput.value = prefill || '';
    emailInput.value = '';
    emailInput.style.borderColor = '';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (prefill) emailInput.focus();
      else locationInput.focus();
    }, 100);
  }

  function closeModal() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Pill clicks open modal with region pre-filled
  container.querySelectorAll('.add-region-pill').forEach(pill => {
    pill.addEventListener('click', () => openModal(pill.dataset.region || ''));
  });

  // CTA button
  if (openBtn) openBtn.addEventListener('click', () => openModal(''));

  // Close
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  // Submit
  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const region = locationInput.value.trim();

    if (!email || !email.includes('@')) {
      emailInput.style.borderColor = 'var(--coral, #e74c3c)';
      feedback.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!region) {
      locationInput.style.borderColor = 'var(--coral, #e74c3c)';
      feedback.textContent = 'Please enter a region.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    feedback.textContent = '';

    try {
      const res = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, region }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit');
      }

      // Update the pill count in the UI if it exists
      const pill = container.querySelector(`.add-region-pill[data-region="${CSS.escape(region)}"]`);
      if (pill) {
        let countEl = pill.querySelector('.region-pill-count');
        if (countEl) {
          countEl.textContent = parseInt(countEl.textContent, 10) + 1;
        } else {
          countEl = document.createElement('span');
          countEl.className = 'region-pill-count';
          countEl.textContent = '1';
          pill.appendChild(countEl);
        }
      }

      formState.style.display = 'none';
      successState.style.display = 'flex';
    } catch (err) {
      feedback.textContent = 'Error: ' + err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = t('landing.region.modal.submit');
    }
  });
}

function escHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
