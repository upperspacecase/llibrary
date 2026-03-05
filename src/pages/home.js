import '../styles/main.css';
import { initI18n } from '../lib/i18n.js';
import { ODEMIRA } from '../lib/wiki-data.js';
import { createMap, mapboxgl, addMarker } from '../lib/mapbox.js';

initI18n();

// Populate featured commons card from ODEMIRA data
const fcName = document.getElementById('fc-name');
const fcLocation = document.getElementById('fc-location');
const fcArea = document.getElementById('fc-area');
const fcPop = document.getElementById('fc-pop');
if (fcName) fcName.textContent = ODEMIRA.name;
if (fcLocation) fcLocation.textContent = ODEMIRA.subtitle;
if (fcArea) fcArea.textContent = ODEMIRA.area;
if (fcPop) fcPop.textContent = ODEMIRA.population.toLocaleString();

// Scroll-aware header: transparent on hero, solid once scrolled past
const header = document.querySelector('.header');
if (header) {
    const onScroll = () => {
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load
}

// Smooth scroll for anchor links — center #featured-commons, start for others
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const isFeatured = link.getAttribute('href') === '#featured-commons';
            target.scrollIntoView({ behavior: 'smooth', block: isFeatured ? 'center' : 'start' });
        }
    });
});

// Mobile hamburger menu
const menuBtn = document.querySelector('.mobile-menu-btn');
const headerNav = document.querySelector('.header-nav');
if (menuBtn && headerNav) {
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('open');
        headerNav.classList.toggle('open');
    });
    // Close menu when a nav link is clicked
    headerNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('open');
            headerNav.classList.remove('open');
        });
    });
}

// ==========================================================================
// Waitlist Modal
// ==========================================================================

const openBtn = document.getElementById('open-waitlist');
const overlay = document.getElementById('waitlist-overlay');
const closeBtn = document.getElementById('waitlist-close');
const formState = document.getElementById('waitlist-form-state');
const successState = document.getElementById('waitlist-success');
const submitBtn = document.getElementById('waitlist-submit');
const emailInput = document.getElementById('waitlist-email');
const addressInput = document.getElementById('waitlist-address');
const feedback = document.getElementById('waitlist-feedback');
const mapHint = document.getElementById('waitlist-map-hint');

let waitlistMap = null;
let waitlistMarker = null;
let pinLocation = null;

// Open modal
if (openBtn && overlay) {
    openBtn.addEventListener('click', () => {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Lazy-init map (must wait for container to be visible)
        if (!waitlistMap) {
            setTimeout(() => {
                waitlistMap = createMap('waitlist-map', {
                    center: [-8.6400, 37.5967],
                    zoom: 6,
                    satellite: false,
                    scrollZoom: true,
                });

                waitlistMap.on('click', (e) => {
                    pinLocation = { lat: e.lngLat.lat, lng: e.lngLat.lng };

                    // Remove old marker
                    if (waitlistMarker) waitlistMarker.remove();

                    // Add new marker
                    waitlistMarker = addMarker(waitlistMap, [e.lngLat.lng, e.lngLat.lat], {
                        color: '#2d6a4f',
                        draggable: true,
                    });

                    // Update on drag
                    waitlistMarker.on('dragend', () => {
                        const lngLat = waitlistMarker.getLngLat();
                        pinLocation = { lat: lngLat.lat, lng: lngLat.lng };
                    });

                    // Hide hint
                    if (mapHint) mapHint.style.display = 'none';
                });
            }, 100);
        } else {
            // Resize map when re-opening
            setTimeout(() => waitlistMap.resize(), 100);
        }
    });
}

// Close modal
function closeWaitlist() {
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

if (closeBtn) closeBtn.addEventListener('click', closeWaitlist);
if (overlay) {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeWaitlist();
    });
}

// Submit
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const email = emailInput ? emailInput.value.trim() : '';
        const address = addressInput ? addressInput.value.trim() : '';

        if (!email || !email.includes('@')) {
            if (emailInput) emailInput.style.borderColor = 'var(--coral, #e74c3c)';
            if (feedback) feedback.textContent = 'Please enter a valid email address.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
        if (feedback) feedback.textContent = '';

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, address, location: pinLocation }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to submit');
            }

            // Show success state
            if (formState) formState.style.display = 'none';
            if (successState) successState.style.display = 'flex';
        } catch (err) {
            if (feedback) feedback.textContent = 'Error: ' + err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });
}

// ==========================================================================
// Add Region Modal
// ==========================================================================

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
    // Reset to form state
    if (arFormState) arFormState.style.display = '';
    if (arSuccessState) arSuccessState.style.display = 'none';
    if (arFeedback) arFeedback.textContent = '';
    if (arSubmitBtn) { arSubmitBtn.disabled = false; arSubmitBtn.textContent = 'Submit'; }

    if (arLocationInput) arLocationInput.value = prefill || '';
    arOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus the right field
    setTimeout(() => {
        if (prefill && arEmailInput) arEmailInput.focus();
        else if (arLocationInput) arLocationInput.focus();
    }, 100);
}

function closeAddRegionModal() {
    if (arOverlay) {
        arOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Pill clicks → pre-fill location and open modal
document.querySelectorAll('.add-region-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        openAddRegionModal(pill.dataset.region || '');
    });
});

// CTA button → open modal (no pre-fill)
if (arOpenBtn) {
    arOpenBtn.addEventListener('click', () => openAddRegionModal(''));
}

// Close
if (arCloseBtn) arCloseBtn.addEventListener('click', closeAddRegionModal);
if (arOverlay) {
    arOverlay.addEventListener('click', (e) => {
        if (e.target === arOverlay) closeAddRegionModal();
    });
}

// Submit
if (arSubmitBtn) {
    arSubmitBtn.addEventListener('click', async () => {
        const email = arEmailInput ? arEmailInput.value.trim() : '';
        const address = arLocationInput ? arLocationInput.value.trim() : '';

        if (!email || !email.includes('@')) {
            if (arEmailInput) arEmailInput.style.borderColor = 'var(--coral, #e74c3c)';
            if (arFeedback) arFeedback.textContent = 'Please enter a valid email address.';
            return;
        }

        arSubmitBtn.disabled = true;
        arSubmitBtn.textContent = 'Submitting…';
        if (arFeedback) arFeedback.textContent = '';

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, address, location: null }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to submit');
            }

            // Show success
            if (arFormState) arFormState.style.display = 'none';
            if (arSuccessState) arSuccessState.style.display = 'flex';
        } catch (err) {
            if (arFeedback) arFeedback.textContent = 'Error: ' + err.message;
            arSubmitBtn.disabled = false;
            arSubmitBtn.textContent = 'Submit';
        }
    });
}
