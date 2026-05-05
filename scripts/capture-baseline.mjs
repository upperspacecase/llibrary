/**
 * Phase 0 — pin baseline fixtures.
 *
 * Runs the existing pipeline against a fixed coord (Vinhais 41.90, -6.92,
 * known good per DATA_SOURCES_STATUS.md) and snapshots the output to
 * fixtures/baseline/. Used as the regression net for every later refactor.
 *
 * Usage:
 *   node scripts/capture-baseline.mjs
 *
 * Env (optional, missing keys → those sources fail in the snapshot, which is
 * itself part of the captured baseline):
 *   VITE_MAPBOX_TOKEN, VITE_FIRMS_KEY, GOOGLE_API_KEY
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import {
  fetchAllData,
  processRawData,
} from "../src/lib/report-data-pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "fixtures", "baseline");

// Vinhais test point — verified live in DATA_SOURCES_STATUS.md (2026-04-24).
// Synthetic ~5ha polygon centred on the point.
const LAT = 41.90;
const LNG = -6.92;
const BOUNDARY = [
  [41.89899, -6.92136],
  [41.90101, -6.92136],
  [41.90101, -6.91864],
  [41.89899, -6.91864],
];
const AREA_HA = 5;

const SUBMISSION = {
  name: "Phase 0 Baseline (Vinhais)",
  address: "Vinhais, Bragança, Portugal",
  coords: [LAT, LNG],
  boundary: BOUNDARY,
};

async function writeJson(file, data) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function summarize(raw) {
  const sources = {};
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  for (const [key, result] of Object.entries(raw)) {
    if (result && typeof result === "object" && "ok" in result) {
      if (result.ok) {
        sources[key] = "ok";
        ok += 1;
      } else if (result.skipped) {
        sources[key] = `skipped: ${result.error}`;
        skipped += 1;
      } else {
        sources[key] = `error: ${result.error}`;
        failed += 1;
      }
    } else {
      sources[key] = "unexpected shape";
    }
  }
  return { totalSources: Object.keys(raw).length, ok, failed, skipped, sources };
}

async function main() {
  const startedAt = new Date().toISOString();
  const t0 = performance.now();

  console.log(`[baseline] capture started ${startedAt}`);
  console.log(`[baseline] coord ${LAT}, ${LNG}  area ${AREA_HA} ha`);
  console.log(`[baseline] boundary ${BOUNDARY.length} vertices`);
  console.log("");

  let raw;
  try {
    raw = await fetchAllData(LAT, LNG, BOUNDARY, AREA_HA);
  } catch (err) {
    console.error("[baseline] fetchAllData threw — snapshot aborted");
    console.error(err);
    process.exit(1);
  }
  const t1 = performance.now();

  let facts;
  let processError = null;
  try {
    facts = await processRawData(raw, SUBMISSION, AREA_HA);
  } catch (err) {
    processError = err.message;
    console.warn("[baseline] processRawData threw:", err.message);
  }
  const t2 = performance.now();

  const summary = summarize(raw);
  const finishedAt = new Date().toISOString();

  await writeJson(resolve(OUT, "input.json"), {
    submission: SUBMISSION,
    lat: LAT,
    lng: LNG,
    boundary: BOUNDARY,
    areaHa: AREA_HA,
  });
  await writeJson(resolve(OUT, "raw.json"), raw);
  await writeJson(
    resolve(OUT, "facts.json"),
    facts ?? { __error: processError }
  );
  await writeJson(resolve(OUT, "summary.json"), {
    startedAt,
    finishedAt,
    fetchMs: Math.round(t1 - t0),
    processMs: Math.round(t2 - t1),
    totalMs: Math.round(t2 - t0),
    processError,
    ...summary,
  });

  console.log("");
  console.log("[baseline] per-source result:");
  for (const [key, status] of Object.entries(summary.sources)) {
    const tag = status === "ok"
      ? "OK  "
      : status.startsWith("skipped") ? "SKIP"
      : "ERR ";
    console.log(`  ${tag} ${key.padEnd(22)} ${status === "ok" ? "" : status}`);
  }
  console.log("");
  console.log(
    `[baseline] sources ${summary.ok}/${summary.totalSources} ok, ${summary.failed} failed, ${summary.skipped} skipped`
  );
  console.log(
    `[baseline] timing fetch=${Math.round(t1 - t0)}ms process=${Math.round(t2 - t1)}ms`
  );
  console.log(`[baseline] wrote ${OUT}/{input,raw,facts,summary}.json`);

  // Exit cleanly even if some fetchers had pending sockets — the report-data-pipeline
  // ones do not, but Mongo connections from any imported module would otherwise hang.
  process.exit(0);
}

main().catch((err) => {
  console.error("[baseline] fatal:", err);
  process.exit(1);
});
