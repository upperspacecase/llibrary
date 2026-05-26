#!/usr/bin/env node
/**
 * Prune hourly station_observations docs to free up Atlas storage.
 *
 * We keep daily/monthly/annual aggregates and drop hourly rows for the
 * weather network — they were eating ~330 MB and we don't have any
 * chart that needs hour-level granularity right now.
 *
 *   MONGODB_URI=mongodb+srv://...  node scripts/odemira-prune-hourly.mjs
 *   node scripts/odemira-prune-hourly.mjs --dry        # show what would go
 */

import { getCollection } from '../api/_db.js';

const DRY = process.argv.includes('--dry');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set'); process.exit(1);
  }
  const obs = await getCollection('station_observations');
  // Anything with "horária" or "horário" in the parameter name — these
  // are the high-frequency rows we're dropping.
  const filter = {
    source: 'snirh_meteorologica',
    parameterName: { $regex: /hor(á|a)ri(o|a)/i },
  };
  const docs = await obs.find(filter, { projection: { parameterName: 1, externalId: 1, count: 1 } }).toArray();
  console.log(`Found ${docs.length} hourly docs to ${DRY ? 'PREVIEW' : 'DELETE'}:`);
  for (const d of docs) {
    console.log(`  ${d.parameterName.padEnd(44)} · ${d.externalId} · ${d.count} rdgs`);
  }
  if (DRY) { process.exit(0); }
  const r = await obs.deleteMany(filter);
  console.log(`\nDeleted ${r.deletedCount} docs.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
