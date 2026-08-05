/**
 * region-cards.js — Region card grids, rendered from the registry.
 *
 * Two surfaces show the same set of regions: the home page's featured section
 * and the commons page's picker. Both used to be hand-written HTML with a
 * single Odemira card in them.
 *
 * Only listed regions (live or preview) ever render; drafts are invisible.
 */

import { getListedRegions, getFeaturedRegions, DEFAULT_REGION } from './regions/index.js';

const PIN_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
const DOT_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>';
const ARROW_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

/**
 * The default region keeps the bare /wiki URL it has always had.
 *
 * Others use ?region=<slug> rather than /wiki/<slug>. The path form depends on
 * a vercel.json rewrite that has never actually worked — with cleanUrls on,
 * /wiki.html 308-redirects to /wiki, so it was not a usable rewrite
 * destination and /wiki/<anything> 404s. The destination is fixed now, but the
 * query form needs no rewrite at all and cannot 404, so links use it until the
 * path form is confirmed working on a deploy. wiki.js accepts both.
 */
function href(region) {
  return region.slug === DEFAULT_REGION ? '/wiki' : `/wiki?region=${encodeURIComponent(region.slug)}`;
}

function escHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function featuredCard(r) {
  const stats = (r.cardStats || []).map(s => `
          <div class="featured-commons-stat">
            <span class="featured-commons-stat-value">${escHTML(s.value)}</span>
            <span class="featured-commons-stat-unit">${escHTML(s.unit)}</span>
          </div>`).join('');

  return `
      <a href="${href(r)}" class="featured-commons-card" aria-label="Explore ${escHTML(r.name)} region">
        <div class="featured-commons-img-wrap">
          <img src="${escHTML(r.image)}" alt="" class="featured-commons-img" />
          <div class="featured-commons-badge">${PIN_SVG}<span>Active</span></div>
          <div class="featured-commons-overlay">
            <h3 class="featured-commons-name">${escHTML(r.name)}</h3>
            <p class="featured-commons-location">${escHTML(r.subtitle)}</p>
          </div>
        </div>
        <div class="featured-commons-stats">${stats}
          <span class="featured-commons-arrow" aria-hidden="true">${ARROW_SVG}</span>
        </div>
      </a>`;
}

function pickerCard(r) {
  const stats = (r.cardStats || [])
    .map(s => `<span>${escHTML(s.value)} ${escHTML(s.unit)}</span>`).join('');

  return `
            <a href="${href(r)}" class="commons-region-card commons-region-active">
              <div class="commons-region-img-wrap">
                <img src="${escHTML(r.image)}" alt="${escHTML(r.name)} region" class="commons-region-img" />
                <div class="commons-region-badge">${DOT_SVG}<span>Live</span></div>
              </div>
              <div class="commons-region-info">
                <h3 class="commons-region-name">${escHTML(r.name)}</h3>
                <p class="commons-region-location">${escHTML(r.subtitle)}</p>
                <div class="commons-region-stats">${stats}</div>
              </div>
              <span class="commons-region-arrow">${ARROW_SVG}</span>
            </a>`;
}

/** Render the home page's featured region cards into a container. */
export function renderFeaturedRegions(container) {
  if (!container) return;
  const regions = getFeaturedRegions();
  container.innerHTML = regions.map(featuredCard).join('\n');
  container.classList.toggle('featured-commons-multi', regions.length > 1);
}

/** Render the commons page's region picker into a container. */
export function renderRegionPicker(container) {
  if (!container) return;
  container.innerHTML = getListedRegions().map(pickerCard).join('\n');
}
