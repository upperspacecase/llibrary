import { en } from './lang/en.js';
import { pt } from './lang/pt.js';

const translations = { en, pt };
const LANG_LABELS = { en: 'EN', pt: 'PT' };
const SUPPORTED_LANGS = Object.keys(translations);

const stored = localStorage.getItem('lll-lang');
let currentLang = (stored && SUPPORTED_LANGS.includes(stored)) ? stored : 'en';

export function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
}

function updateToggles(lang) {
  document.querySelectorAll('.lang-toggle').forEach(toggle => {
    const label = toggle.querySelector('.lang-toggle-label');
    if (label) label.textContent = LANG_LABELS[lang] || lang.toUpperCase();
    toggle.querySelectorAll('.lang-toggle-menu button[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    toggle.classList.remove('is-open');
    const trigger = toggle.querySelector('.lang-toggle-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
  currentLang = lang;
  localStorage.setItem('lll-lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();
  updateToggles(lang);
  // Notify listeners (e.g. wiki page re-renders dynamic content)
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    el.innerHTML = t(key);
  });
}

export function initI18n() {
  document.querySelectorAll('.lang-toggle').forEach(toggle => {
    const trigger = toggle.querySelector('.lang-toggle-trigger');
    const label = toggle.querySelector('.lang-toggle-label');

    // Set initial state
    if (label) label.textContent = LANG_LABELS[currentLang] || 'EN';

    // Mark current lang as active in menu
    toggle.querySelectorAll('.lang-toggle-menu button[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);

      // Direct click handler on each language button
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLang(btn.dataset.lang);
      });
    });

    // Toggle dropdown open/close
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = toggle.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(isOpen));
      });
    }
  });

  // Close dropdown when clicking anywhere else
  document.addEventListener('click', () => {
    document.querySelectorAll('.lang-toggle.is-open').forEach(toggle => {
      toggle.classList.remove('is-open');
      const trigger = toggle.querySelector('.lang-toggle-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  });

  // Apply translations on init
  applyTranslations();
}
