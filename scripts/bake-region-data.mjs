/**
 * Bake every region's dashboard data to static JSON files at build time.
 *
 * Each /api/regions/[region]/* handler is invoked via a mock req/res; the
 * result is written to public/data/<slug>/*.json. The Vite build then
 * copies the public/ tree into the deploy output, so the dashboard reads
 * its data straight from the Vercel edge CDN and never touches MongoDB
 * on the hot path.
 *
 * This is the architectural fix for the M0 500-connection exhaustion —
 * steady-state DB connections drop to ~1 (only when this script runs).
 *
 * Runs as part of `npm run build` (wrapped so a bake failure doesn't
 * block the site deploy — the dashboard falls back to /api routes).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { getAllRegions } from '../src/lib/regions/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDirFor = (slug) => path.join(ROOT, 'public', 'data', slug);

async function callHandler(name, importPath, slug) {
  const mod = await import(importPath);
  const handler = mod.default;
  if (typeof handler !== 'function') {
    throw new Error(`${name}: no default export handler`);
  }
  let body;
  // The slug is what the dynamic route would have put in req.query.
  const req = { method: 'GET', headers: {}, query: { region: slug } };
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { body = payload; return this; },
  };
  await handler(req, res);
  if (res.statusCode >= 400) {
    throw new Error(`${name}: HTTP ${res.statusCode} — ${JSON.stringify(body)?.slice(0, 200)}`);
  }
  return body;
}

const TARGETS = [
  ['facts.json',             '../api/regions/[region].js'],
  ['stations.json',          '../api/regions/[region]/stations.js'],
  ['reservoirs.json',        '../api/regions/[region]/reservoirs.js'],
  ['groundwater.json',       '../api/regions/[region]/groundwater.js'],
  ['rainfall-stations.json', '../api/regions/[region]/rainfall-stations.js'],
  ['rainfall.json',          '../api/regions/[region]/rainfall.js'],
  ['observations.json',      '../api/regions/[region]/observations.js'],
  ['water-quality.json',     '../api/regions/[region]/water-quality.js'],
  ['station-status.json',    '../api/regions/[region]/station-status.js'],
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.warn('[bake] MONGODB_URI not set — skipping bake; dashboard will fall back to /api routes.');
    process.exit(0);
  }

  // Drafts bake too — that is how a region's dashboard gets verified before
  // anything about it is public.
  const regions = getAllRegions();
  const results = [];

  for (const region of regions) {
    const outDir = outDirFor(region.slug);
    await mkdir(outDir, { recursive: true });
    console.log(`[bake] ${region.slug} (${region.status}) → ${outDir}`);

    for (const [filename, importPath] of TARGETS) {
      const t0 = Date.now();
      const label = `${region.slug}/${filename}`;
      try {
        const data = await callHandler(label, importPath, region.slug);
        const json = JSON.stringify(data);
        await writeFile(path.join(outDir, filename), json);
        results.push({ label, status: 'ok', size: json.length, ms: Date.now() - t0 });
        console.log(`  ✓ ${filename} · ${json.length.toLocaleString()} bytes · ${Date.now() - t0} ms`);
      } catch (err) {
        results.push({ label, status: 'failed', error: err.message });
        console.warn(`  ✗ ${filename} · ${err.message}`);
      }
    }
  }

  const total  = results.length;
  const failed = results.filter(r => r.status === 'failed');
  if (failed.length) {
    console.warn(`[bake] ${failed.length}/${total} bakes failed — dashboard will fall back to /api for those.`);
  } else {
    console.log(`[bake] ${total} files written across ${regions.length} region(s).`);
  }
  // Force-exit to release the cached Mongo client without exposing a close().
  process.exit(0);
}

main().catch((err) => {
  console.error('[bake] fatal:', err);
  // Exit 0 — never fail the build because of a bake hiccup.
  process.exit(0);
});
