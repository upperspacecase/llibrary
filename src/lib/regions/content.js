/**
 * Region content — browser-side only.
 *
 * Kept out of ./index.js on purpose: this pulls in wiki-data.js (~78 kB of
 * prose plus its PT translation), which the API functions must never load.
 *
 * Odemira's content still lives in ../wiki-data.js untouched. Bacia do Lima
 * has none authored yet, so it resolves to empty and renders nothing — which
 * is correct while it is a draft.
 */

import {
  ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS,
} from '../wiki-data.js';

const EMPTY = { REGION: null, SECTIONS: {}, EVENTS_CALENDAR: [], LANDMARKS: [] };

/**
 * The dashboard renders entirely from piped data, so a region has one useful
 * section the moment its pipeline has run — before a word is written. Without
 * it a content-less region shows an empty page despite having real data.
 */
const DASHBOARD_SECTION = {
  id: 'dashboard',
  title: 'Regional Dashboard',
  subtitle: '',
  color: '#1B3A2F',
  icon: 'activity',
  description: '',
  accentColor: '#1B3A2F',
  intro: '',
  articles: [],
  mapLayers: [],
  visuals: {},
  references: [],
};

const CONTENT = {
  odemira: { REGION: ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS },
  // No prose written yet — the dashboard is all it has, and that is honest.
  'bacia-do-lima': { ...EMPTY, SECTIONS: { dashboard: DASHBOARD_SECTION } },
};

/** Content for a slug. Unknown or unauthored regions get the empty set. */
export function getContent(slug) {
  return CONTENT[slug] ?? EMPTY;
}

/** True if a region has any sections written. */
export function hasContent(slug) {
  return Object.keys(getContent(slug).SECTIONS).length > 0;
}
