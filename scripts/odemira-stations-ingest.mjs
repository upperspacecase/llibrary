#!/usr/bin/env node
/**
 * Ingest every data-collection station inside the Odemira polygon into the
 * `stations` MongoDB collection. Idempotent — re-running is safe and
 * refreshes metadata.
 *
 * Sources covered:
 *   - SNIRH Piezometria        (groundwater levels)
 *   - SNIRH Hidrométrica        (river level & flow)
 *   - SNIRH Nascentes           (springs)
 *   - SNIRH Qualidade subt.     (groundwater quality)
 *   - GloFAS basin sample       (hard-coded Mira basin points)
 *   - Wiki landmarks            (towns, dams, beaches — from src/lib/wiki-data.js)
 *
 * Usage:
 *   MONGODB_URI=mongodb+srv://...  node scripts/odemira-stations-ingest.mjs
 */

import {
  snirhSession,
  listStations as snirhListStations,
  listParameters as snirhListParameters,
} from '../src/api/snirh.js';
import { bulkUpsertStations } from '../src/lib/station-store.js';

const ODEMIRA_BBOX = { swLat: 37.30, swLng: -8.95, neLat: 37.87, neLng: -8.20 };
const REGION = 'odemira';

// SNIRH networks worth ingesting for Odemira (verified live 2026-05-26).
const SNIRH_NETWORKS = [
  { uid: '100290946', source: 'snirh_piezometria',   label: 'SNIRH Piezometria' },
  { uid: '920123705', source: 'snirh_hidrometrica',  label: 'SNIRH Hidrométrica' },
  { uid: '100290943', source: 'snirh_nascentes',     label: 'SNIRH Nascentes' },
  { uid: '100290952', source: 'snirh_qualidade_sub', label: 'SNIRH Qualidade Subt.' },
  { uid: '920123704', source: 'snirh_meteorologica', label: 'SNIRH Meteorológica' },
];

// Static reference points — known landmarks pulled from src/lib/wiki-data.js
// (verbatim coordinates). These don't carry timeseries, just spatial context.
const WIKI_LANDMARKS = [
  { name: 'Vila Nova de Milfontes',   lat: 37.7268, lng: -8.7828, kind: 'town' },
  { name: 'Odemira',                  lat: 37.5967, lng: -8.6400, kind: 'town' },
  { name: 'São Teotónio',             lat: 37.5178, lng: -8.7389, kind: 'town' },
  { name: 'Zambujeira do Mar',        lat: 37.5247, lng: -8.7867, kind: 'village' },
  { name: 'Santa Clara-a-Velha',      lat: 37.5100, lng: -8.4378, kind: 'village' },
  { name: 'Sabóia',                   lat: 37.4903, lng: -8.5461, kind: 'village' },
  { name: 'São Luís',                 lat: 37.5850, lng: -8.6150, kind: 'village' },
  { name: 'Barragem de Santa Clara',  lat: 37.4900, lng: -8.4400, kind: 'reservoir' },
  { name: 'Praia de Almograve',       lat: 37.6500, lng: -8.8000, kind: 'beach' },
];

// GloFAS sampling points — same as the pipeline uses for the basin reading.
const GLOFAS_STATIONS = [
  { name: 'Mira at Vila Nova de Milfontes', lat: 37.7268, lng: -8.7828 },
  { name: 'Mira at Odemira',                 lat: 37.5967, lng: -8.6400 },
  { name: 'Barragem de Santa Clara',         lat: 37.4900, lng: -8.4400 },
];

const inBbox = (s) => s.lat != null && s.lng != null
  && s.lat >= ODEMIRA_BBOX.swLat && s.lat <= ODEMIRA_BBOX.neLat
  && s.lng >= ODEMIRA_BBOX.swLng && s.lng <= ODEMIRA_BBOX.neLng;

async function ingestSnirhNetwork(network) {
  console.log(`\n── ${network.label}  (network ${network.uid})`);
  let session;
  try {
    session = await snirhSession(network.uid);
  } catch (e) {
    console.log(`  ✗ session failed: ${e.message}`);
    return [];
  }
  const allStations = await snirhListStations(session);
  const odemiraStations = allStations.filter(inBbox);
  console.log(`  ${allStations.length} total · ${odemiraStations.length} in Odemira bbox`);

  // Fetch parameters per station — polite spacing.
  const out = [];
  for (const s of odemiraStations) {
    let parameters = [];
    try {
      const params = await snirhListParameters(session, s.uid);
      parameters = params.map(p => ({ uid: p.uid, name: p.name }));
    } catch (e) {
      console.log(`  ✗ ${s.uid} parameters: ${e.message}`);
    }
    out.push({
      source: network.source,
      externalId: s.uid,
      name: s.label,
      code: s.code,
      label: s.label,
      lat: s.lat,
      lng: s.lng,
      region: REGION,
      parameters,
      metadata: {
        network: network.uid,
        networkName: network.label,
        redenome: s.redenome,
      },
    });
    await new Promise(r => setTimeout(r, 200));
  }
  return out;
}

function buildLandmarkStations() {
  return WIKI_LANDMARKS.map((l, i) => ({
    source: 'wiki_landmark',
    externalId: `landmark-${i}`,
    name: l.name,
    label: l.name,
    lat: l.lat,
    lng: l.lng,
    region: REGION,
    parameters: [],
    metadata: { kind: l.kind },
  }));
}

function buildGlofasStations() {
  return GLOFAS_STATIONS.map((s, i) => ({
    source: 'glofas_basin',
    externalId: `glofas-${i}`,
    name: s.name,
    label: s.name,
    lat: s.lat,
    lng: s.lng,
    region: REGION,
    parameters: [{ uid: 'river_discharge', name: 'River discharge', unit: 'm³/s' }],
    metadata: { provider: 'Open-Meteo GloFAS' },
  }));
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set — refusing to ingest.');
    process.exit(1);
  }

  const collected = [];

  // SNIRH (the big chunk)
  for (const net of SNIRH_NETWORKS) {
    try {
      const rows = await ingestSnirhNetwork(net);
      collected.push(...rows);
    } catch (e) {
      console.log(`  ✗ ${net.label} failed: ${e.message}`);
    }
  }

  // GloFAS basin sample
  collected.push(...buildGlofasStations());

  // Wiki landmarks (spatial reference points)
  collected.push(...buildLandmarkStations());

  console.log(`\nUpserting ${collected.length} stations …`);
  await bulkUpsertStations(collected);
  console.log('Done. Counts by source:');
  const byKey = {};
  for (const s of collected) byKey[s.source] = (byKey[s.source] || 0) + 1;
  for (const [k, v] of Object.entries(byKey).sort()) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }
  process.exit(0);
}

main().catch(e => {
  console.error('odemira-stations-ingest failed:', e);
  process.exit(1);
});
