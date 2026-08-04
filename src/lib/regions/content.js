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

const CONTENT = {
  odemira: { REGION: ODEMIRA, SECTIONS, EVENTS_CALENDAR, LANDMARKS },
  'bacia-do-lima': EMPTY,
};

/** Content for a slug. Unknown or unauthored regions get the empty set. */
export function getContent(slug) {
  return CONTENT[slug] ?? EMPTY;
}

/** True if a region has any sections written. */
export function hasContent(slug) {
  return Object.keys(getContent(slug).SECTIONS).length > 0;
}
