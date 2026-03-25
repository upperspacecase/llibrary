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

// Generic waitlist modal handler
function setupWaitlistModal(config) {
    const openBtn = document.getElementById(config.openId);
    const overlay = document.getElementById(config.overlayId);
    const closeBtn = document.getElementById(config.closeId);
    const formState = document.getElementById(config.formStateId);
    const successState = document.getElementById(config.successId);
    const submitBtn = document.getElementById(config.submitId);
    const emailInput = document.getElementById(config.emailId);
    const addressInput = document.getElementById(config.addressId);
    const feedback = document.getElementById(config.feedbackId);

    if (!openBtn || !overlay) return;

    openBtn.addEventListener('click', () => {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (formState) formState.style.display = '';
        if (successState) successState.style.display = 'none';
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; }
        if (emailInput) { emailInput.value = ''; emailInput.style.borderColor = ''; }
        if (addressInput) addressInput.value = '';
        if (feedback) feedback.textContent = '';
    });

    function close() {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

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
            submitBtn.textContent = 'Submitting...';
            if (feedback) feedback.textContent = '';

            try {
                const res = await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, address, type: config.type || 'landbook' }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to submit');
                }
                if (formState) formState.style.display = 'none';
                if (successState) successState.style.display = 'flex';
            } catch (err) {
                if (feedback) feedback.textContent = 'Error: ' + err.message;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });
    }
}

// LandBook waitlist
setupWaitlistModal({
    openId: 'open-waitlist',
    overlayId: 'waitlist-overlay',
    closeId: 'waitlist-close',
    formStateId: 'waitlist-form-state',
    successId: 'waitlist-success',
    submitId: 'waitlist-submit',
    emailId: 'waitlist-email',
    addressId: 'waitlist-address',
    feedbackId: 'waitlist-feedback',
    type: 'landbook',
});

// Library waitlist
setupWaitlistModal({
    openId: 'open-library-waitlist',
    overlayId: 'library-waitlist-overlay',
    closeId: 'library-waitlist-close',
    formStateId: 'library-waitlist-form-state',
    successId: 'library-waitlist-success',
    submitId: 'library-waitlist-submit',
    emailId: 'library-waitlist-email',
    addressId: 'library-waitlist-address',
    feedbackId: 'library-waitlist-feedback',
    type: 'library',
});

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

// ==========================================================================
// Feedback Modal
// ==========================================================================

const fbOverlay = document.getElementById('feedback-overlay');
const fbCloseBtn = document.getElementById('feedback-close');
const fbFormState = document.getElementById('feedback-form-state');
const fbSuccess = document.getElementById('feedback-success');
const fbSubmitBtn = document.getElementById('feedback-submit');
const fbComment = document.getElementById('feedback-comment');
const fbEmail = document.getElementById('feedback-email');
const fbFeedback = document.getElementById('feedback-feedback');
const fbOpenBtn = document.getElementById('open-feedback');

if (fbOpenBtn && fbOverlay) {
    fbOpenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (fbFormState) fbFormState.style.display = '';
        if (fbSuccess) fbSuccess.style.display = 'none';
        if (fbFeedback) fbFeedback.textContent = '';
        if (fbSubmitBtn) { fbSubmitBtn.disabled = false; fbSubmitBtn.textContent = 'Submit'; }
        if (fbComment) fbComment.value = '';
        if (fbEmail) fbEmail.value = '';
        fbOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => { if (fbComment) fbComment.focus(); }, 100);
    });

    fbCloseBtn?.addEventListener('click', () => {
        fbOverlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    fbOverlay.addEventListener('click', (e) => {
        if (e.target === fbOverlay) {
            fbOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    fbSubmitBtn?.addEventListener('click', async () => {
        const comment = fbComment ? fbComment.value.trim() : '';
        const email = fbEmail ? fbEmail.value.trim() : '';

        if (!comment) {
            if (fbComment) fbComment.style.borderColor = 'var(--coral, #e74c3c)';
            if (fbFeedback) fbFeedback.textContent = 'Please enter your feedback.';
            return;
        }

        fbSubmitBtn.disabled = true;
        fbSubmitBtn.textContent = 'Submitting...';
        if (fbFeedback) fbFeedback.textContent = '';

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email || null, address: comment, type: 'feedback' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to submit');
            }
            if (fbFormState) fbFormState.style.display = 'none';
            if (fbSuccess) fbSuccess.style.display = 'flex';
        } catch (err) {
            if (fbFeedback) fbFeedback.textContent = 'Error: ' + err.message;
            fbSubmitBtn.disabled = false;
            fbSubmitBtn.textContent = 'Submit';
        }
    });
}

// ==========================================================================
// Footer Newsletter
// ==========================================================================

const nlForm = document.getElementById('footer-newsletter-form');
const nlEmail = document.getElementById('footer-newsletter-email');
const nlSubmit = document.getElementById('footer-newsletter-submit');

if (nlForm) {
    nlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = nlEmail ? nlEmail.value.trim() : '';
        if (!email || !email.includes('@')) return;

        nlSubmit.disabled = true;
        const origHTML = nlSubmit.innerHTML;
        nlSubmit.innerHTML = '<span>Submitting...</span>';

        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type: 'newsletter' }),
            });
            if (!res.ok) throw new Error('Failed');
            nlSubmit.innerHTML = '<span>Thank you!</span>';
            nlEmail.value = '';
            setTimeout(() => { nlSubmit.innerHTML = origHTML; nlSubmit.disabled = false; }, 3000);
        } catch (err) {
            nlSubmit.innerHTML = origHTML;
            nlSubmit.disabled = false;
        }
    });
}
