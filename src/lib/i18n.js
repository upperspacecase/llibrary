import { en } from './lang/en.js';
import { pt } from './lang/pt.js';

const translations = { en, pt };

let currentLang = localStorage.getItem('lll-lang') || 'en';

export function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lll-lang', lang);
  applyTranslations();
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  document.documentElement.lang = lang;
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
}

export function initI18n() {
  document.querySelectorAll('.lang-toggle button').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  applyTranslations();
}
