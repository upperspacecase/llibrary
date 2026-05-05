/**
 * Phase 0 regression check.
 *
 * Loads fixtures/baseline/raw.json, runs processRawData against it, and
 * diffs the result against fixtures/baseline/facts.json. Volatile fields
 * (meta.generatedAt) are normalised before comparison.
 *
 * Run before AND after every refactor that touches processRawData or
 * anything it calls. A non-zero exit means the canonical shape drifted.
 *
 * Usage:
 *   node scripts/check-baseline.mjs
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { processRawData } from "../src/lib/report-data-pipeline.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, "..", "fixtures", "baseline");

function normalise(facts) {
  if (!facts || typeof facts !== "object") return facts;
  const clone = JSON.parse(JSON.stringify(facts));
  if (clone.meta) {
    delete clone.meta.generatedAt;
  }
  return clone;
}

function diff(a, b, path = "") {
  if (a === b) return [];
  if (typeof a !== typeof b) return [`${path || "(root)"}: type ${typeof a} → ${typeof b}`];
  if (a === null || b === null) return [`${path || "(root)"}: ${a} → ${b}`];
  if (typeof a !== "object") return [`${path || "(root)"}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
  if (Array.isArray(a) !== Array.isArray(b)) return [`${path}: array shape changed`];
  if (Array.isArray(a)) {
    if (a.length !== b.length) return [`${path}: array length ${a.length} → ${b.length}`];
    const out = [];
    for (let i = 0; i < a.length; i += 1) {
      out.push(...diff(a[i], b[i], `${path}[${i}]`));
    }
    return out;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = [];
  for (const k of keys) {
    if (!(k in a)) {
      out.push(`${path}.${k}: added`);
      continue;
    }
    if (!(k in b)) {
      out.push(`${path}.${k}: removed`);
      continue;
    }
    out.push(...diff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return out;
}

async function main() {
  const [rawText, factsText, inputText] = await Promise.all([
    readFile(resolve(DIR, "raw.json"), "utf8"),
    readFile(resolve(DIR, "facts.json"), "utf8"),
    readFile(resolve(DIR, "input.json"), "utf8"),
  ]);
  const raw = JSON.parse(rawText);
  const expected = normalise(JSON.parse(factsText));
  const input = JSON.parse(inputText);

  const actual = normalise(await processRawData(raw, input.submission, input.areaHa));

  const drift = diff(expected, actual);
  if (drift.length === 0) {
    console.log("[baseline] OK — processRawData output matches snapshot");
    process.exit(0);
  }

  console.log(`[baseline] DRIFT — ${drift.length} differences:`);
  for (const line of drift.slice(0, 50)) {
    console.log("  " + line);
  }
  if (drift.length > 50) {
    console.log(`  … and ${drift.length - 50} more`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("[baseline] check fatal:", err);
  process.exit(1);
});
