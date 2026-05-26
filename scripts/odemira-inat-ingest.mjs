#!/usr/bin/env node
/**
 * Ingest every iNaturalist observation inside the Odemira bbox into MongoDB.
 *
 * iNat's /v1/observations endpoint is paginated; their docs cap `page=N`
 * at ~10k records, so we use `id_above` keyset pagination instead. Ordered
 * `id` ascending so we walk the full corpus until iNat returns 0 results.
 *
 *   MONGODB_URI=mongodb+srv://...  node scripts/odemira-inat-ingest.mjs
 *
 * Flags:
 *   --limit 500         only the first N records (smoke test)
 *   --quality any       relax the research-grade filter (default: any)
 *   --dry               no DB writes
 *
 * Idempotent — upserts by (region, id). Re-running picks up new
 * observations added since the last run.
 */

import { getCollection } from '../api/_db.js';

const REGION = 'odemira';
const BBOX = { swLat: 37.30, swLng: -8.95, neLat: 37.87, neLng: -8.20 };
const PER_PAGE = 200;
const POLITE_DELAY = 600; // ≤100 req/min per iNat guidelines

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const hasFlag = (n) => process.argv.includes(n);

async function fetchPage(idAbove, quality) {
  const params = new URLSearchParams({
    swlat: String(BBOX.swLat),
    swlng: String(BBOX.swLng),
    nelat: String(BBOX.neLat),
    nelng: String(BBOX.neLng),
    per_page: String(PER_PAGE),
    order_by: 'id',
    order: 'asc',
    quality_grade: quality,
    locale: 'en',
  });
  if (idAbove != null) params.set('id_above', String(idAbove));
  const url = `https://api.inaturalist.org/v1/observations?${params}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`iNat ${res.status} for ${url}`);
  return res.json();
}

function projectObservation(o) {
  // iNat returns lat/lng in `location` ("lat,lng") and also in
  // `geojson.coordinates` ([lng,lat]). Prefer geojson; fall back.
  let lat = null, lng = null;
  if (o.geojson && Array.isArray(o.geojson.coordinates) && o.geojson.coordinates.length === 2) {
    lng = Number(o.geojson.coordinates[0]);
    lat = Number(o.geojson.coordinates[1]);
  } else if (o.location && typeof o.location === 'string') {
    const [a, b] = o.location.split(',').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) { lat = a; lng = b; }
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const observedOn = o.observed_on || (o.observed_on_details?.date) || null;
  const year = observedOn ? Number(observedOn.slice(0, 4)) : null;

  return {
    region: REGION,
    id: o.id,
    taxonId:    o.taxon?.id ?? null,
    taxonName:  o.taxon?.name ?? null,
    rank:       o.taxon?.rank ?? null,
    iconicTaxon: o.taxon?.iconic_taxon_name ?? null,
    lat,
    lng,
    obscured:   Boolean(o.obscured || o.geoprivacy === 'obscured' || o.taxon_geoprivacy === 'obscured'),
    observedOn,
    year,
    qualityGrade: o.quality_grade ?? null,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set'); process.exit(1);
  }
  const limit = parseInt(arg('--limit', '0'), 10) || null;
  const quality = arg('--quality', 'any');
  const dry = hasFlag('--dry');
  console.log(`Ingesting iNat observations · region=${REGION} · quality=${quality} · dry=${dry}${limit ? ` · cap=${limit}` : ''}`);

  const obs = await getCollection('inat_observations');
  if (!dry) {
    await obs.createIndex({ region: 1, id: 1 }, { unique: true });
    await obs.createIndex({ region: 1, year: 1 });
  }

  let idAbove = null;
  let total = 0;
  let pages = 0;
  while (true) {
    let payload;
    try {
      payload = await fetchPage(idAbove, quality);
    } catch (e) {
      console.error(`  ✗ page fetch failed: ${e.message}`);
      break;
    }
    pages += 1;
    const rows = payload.results || [];
    if (!rows.length) { console.log(`  · no more results after page ${pages}`); break; }

    const projected = rows.map(projectObservation).filter(Boolean);
    if (!dry && projected.length) {
      const ops = projected.map(p => ({
        updateOne: {
          filter: { region: p.region, id: p.id },
          update: { $set: p },
          upsert: true,
        },
      }));
      const r = await obs.bulkWrite(ops, { ordered: false });
      total += projected.length;
      console.log(`  page ${pages.toString().padStart(3)}  ${rows.length.toString().padStart(3)} rdgs  upserted=${(r.upsertedCount || 0)}  modified=${(r.modifiedCount || 0)}  total=${total}`);
    } else {
      total += projected.length;
      console.log(`  page ${pages.toString().padStart(3)}  ${rows.length.toString().padStart(3)} rdgs  (dry)  total=${total}`);
    }

    if (limit && total >= limit) { console.log(`  · cap reached at ${total}`); break; }

    // iNat returns results ordered by id asc; the next page starts above the
    // last id we just saw.
    idAbove = rows[rows.length - 1].id;
    if (rows.length < PER_PAGE) break;
    await new Promise(r => setTimeout(r, POLITE_DELAY));
  }
  console.log(`\nDone. ${total} observations across ${pages} pages.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
