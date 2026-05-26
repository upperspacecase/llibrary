#!/usr/bin/env node
/**
 * Bulk historical backfill for Odemira stations into MongoDB.
 *
 * For every station in the `stations` collection (region=odemira), pulls the
 * full available timeseries for each of its parameters and upserts a doc
 * into `station_observations`. Once this runs, the dashboard can render
 * any historical series straight from MongoDB without re-hitting the
 * source on every page load.
 *
 * Currently handles SNIRH (piezometria / hidrométrica / nascentes /
 * qualidade subterrânea) — those are the only catalogued time-series
 * sources today. GloFAS history is already implicit in trends/yearly.
 *
 * Designed to run from a workstation with MONGODB_URI in env:
 *
 *   MONGODB_URI=mongodb+srv://...  node scripts/odemira-backfill.mjs
 *
 * Honestly slow — SNIRH is single-threaded and we add a polite delay
 * between calls. Expect 20-40 minutes for the full Odemira piezometer
 * set. Safe to re-run; upsert by (source, externalId, parameter).
 *
 * Flags:
 *   --source snirh_piezometria       only one source
 *   --since 2010-01-01               override the start date
 *   --limit 5                        only the first N stations (smoke test)
 *   --dry                            no DB writes — just print counts
 */

import { getCollection } from '../api/_db.js';
import { snirhSession, fetchTimeseries } from '../src/api/snirh.js';
import { upsertObservations } from '../src/lib/station-store.js';

const REGION = 'odemira';
const DEFAULT_SINCE = new Date(Date.UTC(1940, 0, 1));
const DEFAULT_UNTIL = new Date();

const SNIRH_SOURCES = new Set([
  'snirh_piezometria',
  'snirh_hidrometrica',
  'snirh_nascentes',
  'snirh_qualidade_sub',
]);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const hasFlag = (n) => process.argv.includes(n);

async function backfillSnirhStation(session, station, since, until, dry) {
  for (const param of station.parameters || []) {
    if (!param.uid) continue;
    let readings;
    try {
      readings = await fetchTimeseries(session, station.externalId, param.uid, since, until);
    } catch (e) {
      console.log(`    ✗ ${station.externalId}:${param.uid} fetch: ${e.message}`);
      continue;
    }
    console.log(`    ▸ ${station.externalId} (${station.name})  ${param.name}  ${readings.length} readings`);
    if (dry || !readings.length) continue;
    await upsertObservations({
      source: station.source,
      externalId: station.externalId,
      parameter: param.uid,
      parameterName: param.name,
      region: REGION,
      readings,
    });
    // Polite: SNIRH is a public utility, don't hammer it.
    await new Promise(r => setTimeout(r, 600));
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set — refusing to backfill.');
    process.exit(1);
  }
  const sourceFilter = arg('--source');
  const sinceStr = arg('--since');
  const limit = parseInt(arg('--limit', '0'), 10) || null;
  const dry = hasFlag('--dry');

  const since = sinceStr ? new Date(sinceStr) : DEFAULT_SINCE;
  const until = DEFAULT_UNTIL;
  if (Number.isNaN(since.getTime())) {
    console.error('Bad --since date');
    process.exit(1);
  }

  console.log(`Backfill: region=${REGION}  since=${since.toISOString().slice(0,10)}  until=${until.toISOString().slice(0,10)}  dry=${dry}`);

  const stations = await (await getCollection('stations')).find({ region: REGION }).toArray();
  console.log(`Found ${stations.length} catalogued stations`);

  // Group by source so we can establish one SNIRH session per network and
  // walk all its stations on it.
  const bySource = {};
  for (const s of stations) {
    if (sourceFilter && s.source !== sourceFilter) continue;
    (bySource[s.source] = bySource[s.source] || []).push(s);
  }

  for (const source of Object.keys(bySource)) {
    const list = bySource[source];
    console.log(`\n── ${source}  (${list.length} stations${limit ? `, capped at ${limit}` : ''})`);
    if (SNIRH_SOURCES.has(source)) {
      // The session needs a network UID. Pull it from the station metadata.
      const networkUid = list[0].metadata?.network;
      if (!networkUid) { console.log(`  ✗ no network UID on first station`); continue; }
      const session = await snirhSession(networkUid);
      for (const station of (limit ? list.slice(0, limit) : list)) {
        await backfillSnirhStation(session, station, since, until, dry);
      }
    } else {
      console.log(`  (no historical backfill implemented for ${source})`);
    }
  }
  console.log('\nDone.');
  process.exit(0);
}

main().catch(e => {
  console.error('odemira-backfill failed:', e);
  process.exit(1);
});
