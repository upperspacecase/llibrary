/**
 * Region content — browser-side only.
 *
 * Kept out of ./index.js on purpose: this pulls in the full prose bundle for
 * every region, which the API functions must never load.
 *
 * Language handling lives here rather than in the page. Each region registers
 * an English set and, where it exists, a Portuguese one; the getters below read
 * the stored language at call time so a `langchange` re-render picks up the
 * right copy. A region with no translation falls back to English rather than
 * rendering blanks.
 */

import {
  ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS,
} from '../wiki-data.js';
import {
  SECTIONS_PT, EVENTS_CALENDAR_PT, LANDMARKS_PT,
} from '../wiki-data-pt.js';
import { LIMA, LIMA_SECTIONS, IMAGE_CREDITS as LIMA_CREDITS } from './lima-content.js';
import { LIMA_SECTIONS_PT } from './lima-content-pt.js';

const EMPTY = {
  REGION: null, SECTIONS: {}, EVENTS_CALENDAR: [], LANDMARKS: [], IMAGE_CREDITS: [],
};

const CONTENT = {
  odemira: {
    REGION: ODEMIRA,
    SECTIONS, EVENTS_CALENDAR, LANDMARKS,
    IMAGE_CREDITS: [],
    pt: { SECTIONS: SECTIONS_PT, EVENTS_CALENDAR: EVENTS_CALENDAR_PT, LANDMARKS: LANDMARKS_PT },
  },
  // The regional dashboard is deliberately not carried over — it depends on a
  // station network this region does not have ingested, and it is a nice-to-have
  // rather than the point of the wiki.
  lima: {
    ...EMPTY,
    REGION: LIMA,
    SECTIONS: LIMA_SECTIONS,
    IMAGE_CREDITS: LIMA_CREDITS,
    pt: { SECTIONS: LIMA_SECTIONS_PT },
  },
};

function currentLang() {
  try { return localStorage.getItem('lll-lang') || 'en'; } catch { return 'en'; }
}

/** Content for a slug. Unknown or unauthored regions get the empty set. */
export function getContent(slug) {
  return CONTENT[slug] ?? EMPTY;
}

/** True if a region has any sections written. */
export function hasContent(slug) {
  return Object.keys(getContent(slug).SECTIONS).length > 0;
}

/** True if a region has a Portuguese translation of its sections. */
export function hasTranslation(slug, lang = currentLang()) {
  return lang !== 'en' && !!getContent(slug)[lang]?.SECTIONS;
}

/** Sections in the stored language, falling back to English. */
export function getSections(slug) {
  const c = getContent(slug);
  return c[currentLang()]?.SECTIONS ?? c.SECTIONS;
}

/** Events calendar in the stored language, falling back to English. */
export function getEvents(slug) {
  const c = getContent(slug);
  return c[currentLang()]?.EVENTS_CALENDAR ?? c.EVENTS_CALENDAR;
}

/** Landmarks in the stored language, falling back to English. */
export function getLandmarks(slug) {
  const c = getContent(slug);
  return c[currentLang()]?.LANDMARKS ?? c.LANDMARKS;
}
