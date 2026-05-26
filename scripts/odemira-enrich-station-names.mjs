#!/usr/bin/env node
/**
 * Enrich the `stations` collection with parish + municipality names.
 *
 * Walks every Odemira station and asks DGT (the Portuguese national
 * cartographic agency) what freguesia / concelho / distrito the lat/lng
 * falls in. Writes to station.metadata.{parish, municipality, district}.
 *
 * Idempotent. Safe to re-run.
 *
 *   MONGODB_URI=mongodb+srv://...  node scripts/odemira-enrich-station-names.mjs
 */

import { getCollection } from '../api/_db.js';
import { getAdminUnit } from '../src/api/dgt.js';

const REGION = 'odemira';
const DELAY  = 300;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  const c = await getCollection('stations');
  const stations = await c.find({ region: REGION }).toArray();
  console.log(`Enriching ${stations.length} stations …`);

  let updated = 0, missed = 0;
  for (const s of stations) {
    if (s.lat == null || s.lng == null) { missed++; continue; }
    let info = null;
    try {
      info = await getAdminUnit(s.lat, s.lng);
    } catch (e) {
      console.log(`  ✗ ${s.source}:${s.externalId} DGT fetch: ${e.message}`);
    }
    if (!info) { missed++; await new Promise(r => setTimeout(r, DELAY)); continue; }

    await c.updateOne(
      { _id: s._id },
      { $set: {
        'metadata.parish':       info.parish        || null,
        'metadata.municipality': info.municipality  || null,
        'metadata.district':     info.district      || null,
        'metadata.dicofre':      info.dicofre       || null,
      } },
    );
    updated++;
    console.log(`  ▸ ${s.source}:${s.externalId.padEnd(10)} (${s.code || s.name}) → ${info.parish || '—'} / ${info.municipality || '—'}`);
    await new Promise(r => setTimeout(r, DELAY));
  }
  console.log(`\nEnriched ${updated} · ${missed} skipped/missed.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
