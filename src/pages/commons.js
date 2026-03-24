/**
 * commons.js — Region picker hub for The Commons.
 */

import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';

initI18n();

// ---- Add Region Modal (same logic as home page) ----
const arOverlay = document.getElementById('add-region-overlay');
const arCloseBtn = document.getElementById('add-region-close');
const arFormState = document.getElementById('add-region-form-state');
const arSuccessState = document.getElementById('add-region-success');
const arSubmitBtn = document.getElementById('add-region-submit');
const arLocationInput = document.getElementById('add-region-location');
const arEmailInput = document.getElementById('add-region-email');
const arFeedback = document.getElementById('add-region-feedback');
const arOpenBtn = document.getElementById('open-add-region');

function openAddRegionModal(prefill) {
  if (!arOverlay) return;
  arOverlay.style.display = 'flex';
  arFormState.style.display = '';
  arSuccessState.style.display = 'none';
  arFeedback.textContent = '';
  if (prefill && arLocationInput) arLocationInput.value = prefill;
  document.body.style.overflow = 'hidden';
}

function closeAddRegionModal() {
  if (!arOverlay) return;
  arOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

// Pill buttons pre-fill the modal
document.querySelectorAll('.add-region-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    openAddRegionModal(pill.dataset.region || '');
  });
});

if (arOpenBtn) arOpenBtn.addEventListener('click', () => openAddRegionModal(''));
if (arCloseBtn) arCloseBtn.addEventListener('click', closeAddRegionModal);
if (arOverlay) {
  arOverlay.addEventListener('click', (e) => {
    if (e.target === arOverlay) closeAddRegionModal();
  });
}

// Submit handler
if (arSubmitBtn) {
  arSubmitBtn.addEventListener('click', async () => {
    const location = arLocationInput?.value.trim();
    const email = arEmailInput?.value.trim();
    if (!email) {
      arFeedback.textContent = 'Please enter your email.';
      return;
    }
    arSubmitBtn.disabled = true;
    arSubmitBtn.textContent = 'Submitting…';
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, location, type: 'region-request' }),
      });
      if (!res.ok) throw new Error('Server error');
      arFormState.style.display = 'none';
      arSuccessState.style.display = '';
    } catch {
      arFeedback.textContent = 'Something went wrong. Please try again.';
    } finally {
      arSubmitBtn.disabled = false;
      arSubmitBtn.textContent = 'Submit';
    }
  });
}
