#!/usr/bin/env node
/**
 * SNIRH discovery harness.
 *
 * Walks the (undocumented) SNIRH portal:
 *   1. Enumerate networks
 *   2. For each network of interest, list stations
 *   3. Filter to the Odemira bbox by station detail (lat/lng)
 *   4. For each in-region station, list parameters
 *   5. Print a CSV-ish summary you can paste into the pipeline as
 *      hard-coded station + parameter UIDs.
 *
 * Use the --network flag to pin a single network UID (faster). Default
 * walks the well-known ones (hidrométrica, águas subterrâneas, qualidade
 * águas superficiais — UIDs TBD via interactive probing).
 *
 * Verified 2026-05-26: networks use 9-digit UIDs (100290946 for Piezometria,
 * 920123705 for Hidrométrica, etc.) — NOT 1-8 like the 2022 reference. Each
 * <marker> already carries lat/lng/redenome attrs, so bbox filtering is one
 * call. End-to-end timeseries fetch confirmed working against piezometer
 * 2084986 (Odemira interior, ~24 monthly readings over 2024-2025).
 *
 * Usage:
 *   node scripts/snirh-discover.mjs                       # default networks
 *   node scripts/snirh-discover.mjs --network 100290946   # one network only
 *   node scripts/snirh-discover.mjs --list-networks       # enumerate and exit
 */

import {
  snirhSession,
  listNetworks,
  listStations,
  listParameters,
  stationDetail,
} from '../src/api/snirh.js';

// Odemira bbox — matches the value the pipeline uses for the
// region-odemira synthetic landbook.
const ODEMIRA_BBOX = { swLat: 37.30, swLng: -8.95, neLat: 37.87, neLng: -8.20 };

// Default networks for Odemira water context (verified live 2026-05-26).
const DEFAULT_NETWORKS = [
  { uid: '100290946', hint: 'Piezometria (groundwater levels)' },
  { uid: '920123705', hint: 'Hidrométrica (river level & flow)' },
  { uid: '100290952', hint: 'Qualidade águas subterrâneas' },
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  if (hasFlag('--list-networks')) {
    console.log('Enumerating SNIRH networks...');
    const nets = await listNetworks();
    if (!nets.length) {
      console.log('No networks found on the public page. The select element may have moved.');
      return;
    }
    for (const n of nets) console.log(`  ${n.uid.padStart(3)}  ${n.name}`);
    return;
  }

  const networks = arg('--network')
    ? [{ uid: arg('--network'), hint: '(passed via flag)' }]
    : DEFAULT_NETWORKS;

  for (const net of networks) {
    console.log(`\n── network ${net.uid}  (${net.hint})  ──────────────`);
    let session;
    try {
      session = await snirhSession(net.uid);
    } catch (e) {
      console.log(`  ✗ session bootstrap failed: ${e.message}`);
      continue;
    }
    let stations = [];
    try {
      stations = await listStations(session);
    } catch (e) {
      console.log(`  ✗ station list failed: ${e.message}`);
      continue;
    }
    console.log(`  ${stations.length} stations returned`);
    if (!stations.length) continue;

    // listStations now returns lat/lng inline — bbox filter in a single call.
    const inBbox = stations.filter(s =>
      s.lat != null && s.lng != null
      && s.lat >= ODEMIRA_BBOX.swLat && s.lat <= ODEMIRA_BBOX.neLat
      && s.lng >= ODEMIRA_BBOX.swLng && s.lng <= ODEMIRA_BBOX.neLng
    );
    console.log(`  ${inBbox.length} stations inside Odemira bbox`);

    for (const s of inBbox) {
      console.log(`    ▸ ${s.uid}  ${s.label}  (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})`);
      try {
        const params = await listParameters(session, s.uid);
        for (const p of params.slice(0, 6)) {
          console.log(`        param ${p.uid.padStart(6)}  ${p.name}`);
        }
        if (params.length > 6) console.log(`        … ${params.length - 6} more parameters`);
      } catch (e) {
        console.log(`        ✗ parameter list failed: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }
}

main().catch(e => {
  console.error('snirh-discover failed:', e);
  process.exit(1);
});
