/**
 * Region registry — the single source of truth for what a region is.
 *
 * Before this existed, 'odemira' was a string literal in ~15 files. Anything
 * needing a region's slug, bbox, sample point or landbook id reads it here.
 *
 * Metadata only, deliberately: the API functions import this module, so it
 * must not drag the wiki content bundle into a serverless cold start. Content
 * lives in ./content.js, which is browser-side.
 *
 * Status gates visibility:
 *   'live'    — finished: listed on the commons page and fully reachable
 *   'preview' — listed and reachable, but flagged as in progress. Its data is
 *               real; its written sections may be thin or absent.
 *   'draft'   — exists in code only. Never listed, never linked.
 *
 * A draft region can have its data piped and its dashboard verified without
 * anything appearing on the public site. Promoting it is a one-word change.
 *
 * `featured` is separate from status: it marks the regions the home page leads
 * with. More than one may carry it.
 */

import { meta as odemira } from './odemira.js';
import { meta as baciaDoLima } from './bacia-do-lima.js';

const ALL = [odemira, baciaDoLima];

export const REGIONS = Object.fromEntries(ALL.map((r) => [r.slug, r]));

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

/** Regions to list on the commons page — finished ones and in-progress ones,
 *  featured first, then live, then preview. Drafts never appear. */
export function getListedRegions() {
  const rank = { live: 0, preview: 1 };
  return ALL
    .filter((r) => r.status === 'live' || r.status === 'preview')
    .sort((a, b) => (b.featured === true) - (a.featured === true)
      || rank[a.status] - rank[b.status]);
}

/** Only finished regions. */
export function getLiveRegions() {
  return ALL.filter((r) => r.status === 'live');
}

/** The regions the home page leads with, in registry order. */
export function getFeaturedRegions() {
  const featured = ALL.filter((r) => r.featured);
  return featured.length ? featured : [getRegion(DEFAULT_REGION)];
}

/** True if the slug names a region a visitor is allowed to open. */
export function isReachable(slug) {
  const s = REGIONS[slug]?.status;
  return s === 'live' || s === 'preview';
}

/**
 * Resolve the slug an API handler was called with. Vercel puts it in
 * req.query for both api/regions/[region].js and api/regions/[region]/*.js.
 * Returns null for unknown slugs so handlers can 404 rather than silently
 * querying for a region that does not exist.
 */
export function resolveRegion(req) {
  const slug = typeof req?.query?.region === 'string' ? req.query.region : null;
  return slug ? getRegion(slug) : null;
}
