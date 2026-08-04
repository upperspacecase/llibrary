/**
 * Region registry — the single source of truth for what a region is.
 *
 * Before this existed, 'odemira' was a string literal in ~15 files. Everything
 * that needs to know a region's slug, bbox, sample point or landbook id should
 * read it from here.
 *
 * Status gates visibility:
 *   'live'  — surfaced on the commons page and reachable in the wiki
 *   'draft' — exists in code, excluded from getLiveRegions(), invisible to users
 *
 * A draft region can have its data piped and its dashboard verified without
 * anything appearing on the public site. Launching is a one-word change here.
 */

import * as odemira from './odemira.js';
import * as baciaDoLima from './bacia-do-lima.js';

const MODULES = [odemira, baciaDoLima];

export const REGIONS = Object.fromEntries(
  MODULES.map((mod) => [
    mod.meta.slug,
    {
      ...mod.meta,
      content: {
        REGION: mod.REGION,
        SECTIONS: mod.SECTIONS,
        EVENTS_CALENDAR: mod.EVENTS_CALENDAR,
        LANDMARKS: mod.LANDMARKS,
      },
    },
  ]),
);

export const DEFAULT_REGION = 'odemira';

/** Look up a region by slug. Returns null for unknown slugs — callers decide
 *  whether that is a 404 or a fall back to the default. */
export function getRegion(slug) {
  return REGIONS[slug] ?? null;
}

/** Every region, including drafts. For build scripts and admin tooling. */
export function getAllRegions() {
  return Object.values(REGIONS);
}

/** Only regions cleared for public display. For the commons page and nav. */
export function getLiveRegions() {
  return Object.values(REGIONS).filter((r) => r.status === 'live');
}

/** True if the slug names a region that should be publicly reachable. */
export function isLive(slug) {
  return REGIONS[slug]?.status === 'live';
}
