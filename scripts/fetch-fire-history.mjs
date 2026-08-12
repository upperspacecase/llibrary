/**
 * Fetch a region's burnt-area history from EFFIS and write it to
 * public/data/<slug>/fires.json.
 *
 * Usage:
 *   node scripts/fetch-fire-history.mjs bacia-do-lima
 *   node scripts/fetch-fire-history.mjs bacia-do-lima --step 0.03
 *
 * This is deliberately NOT part of `npm run build`. EFFIS publishes no WFS, so
 * perimeters are found by sampling GetFeatureInfo across a grid — hundreds of
 * requests, minutes of wall clock. Burnt-area history changes about once a
 * fire season, so the output is committed and regenerated on demand rather
 * than refetched on every deploy.
 *
 * The result is a lower bound: a fire is only found if its polygon covers a
 * grid point, so the step size sets the smallest fire reliably detected. That
 * caveat is written into the output and surfaced on the page.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { getBurntAreas, summarizeBurntAreas } from '../src/api/effis.js';
import { getAllRegions } from '../src/lib/regions/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const slug = process.argv[2];
  const region = getAllRegions().find(r => r.slug === slug);
  if (!region) {
    console.error(`Usage: node scripts/fetch-fire-history.mjs <region-slug>`);
    console.error(`Known regions: ${getAllRegions().map(r => r.slug).join(', ')}`);
    process.exit(1);
  }

  const step = Number(arg('--step', '0.03'));
  const { swLat, swLng, neLat, neLng } = region.bbox;
  const cols = Math.ceil((neLng - swLng) / step) + 1;
  const rows = Math.ceil((neLat - swLat) / step) + 1;

  console.log(`[fires] ${region.name} — grid ${rows}x${cols} = ${rows * cols} points at ${step}°`);
  console.log('[fires] this takes a few minutes; EFFIS is queried one point at a time');

  const t0 = Date.now();
  const areas = await getBurntAreas([swLat, swLng, neLat, neLng], { step });
  const summary = summarizeBurntAreas(areas);
  const seconds = Math.round((Date.now() - t0) / 1000);

  const payload = {
    ok: true,
    region: region.slug,
    source: 'EFFIS burnt-area perimeters (modis.ba)',
    fetchedAt: new Date().toISOString(),
    // Everything a reader needs to judge the numbers.
    method: {
      note: 'EFFIS publishes no WFS. Perimeters are found by sampling GetFeatureInfo across a grid and deduping by feature id.',
      gridStepDegrees: step,
      gridPoints: rows * cols,
      lowerBound: true,
      smallestReliablyDetectedHa: Math.round((step * 111000) ** 2 / 10000),
    },
    summary,
    fires: areas,
  };

  const outDir = path.join(ROOT, 'public', 'data', region.slug);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'fires.json'), JSON.stringify(payload, null, 1));

  console.log(`[fires] ${areas.length} perimeters, ${summary.totalHa.toLocaleString()} ha, ${seconds}s`);
  console.log(`[fires] wrote ${path.join('public', 'data', region.slug, 'fires.json')}`);
}

main().catch(err => {
  console.error('[fires] failed:', err.message);
  process.exit(1);
});
