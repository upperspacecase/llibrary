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
 *   'live'  — surfaced on the commons page and reachable in the wiki
 *   'draft' — exists in code, excluded from getLiveRegions(), invisible to users
 *
 * A draft region can have its data piped and its dashboard verified without
 * anything appearing on the public site. Launching is a one-word change.
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

/** Only regions cleared for public display. For the commons page and nav. */
export function getLiveRegions() {
  return ALL.filter((r) => r.status === 'live');
}

/** True if the slug names a region that should be publicly reachable. */
export function isLive(slug) {
  return REGIONS[slug]?.status === 'live';
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
