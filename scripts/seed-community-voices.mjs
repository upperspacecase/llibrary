#!/usr/bin/env node
/**
 * Embed a region's community material into its Pinecone namespace, alongside
 * the wiki text that scripts/seed-embeddings.js already put there.
 *
 * Two sources:
 *   1. wiki_contributions in MongoDB for the region (the suggestions people
 *      leave on the wiki). Filtered by region — api/chat/embed.js does not
 *      filter, which would mix Odemira's contributions into Lima's namespace.
 *   2. src/lib/regions/<slug>-voices.js, if the region has one: the Milestone 3
 *      voice recordings, survey tallies and facilitator summary.
 *
 * Run:  node scripts/seed-community-voices.mjs lima
 *       node scripts/seed-community-voices.mjs lima --dry   (print chunks, write nothing)
 *
 * Idempotent: chunk ids are stable, so re-running overwrites rather than
 * duplicates. Nothing here touches MongoDB except a read.
 */
import { readFileSync } from 'fs';

const lines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n');
for (const line of lines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

import { Pinecone } from '@pinecone-database/pinecone';
import { getCollection } from '../api/_db.js';
import { getRegion, DEFAULT_REGION } from '../src/lib/regions/index.js';

const INDEX_NAME = 'land-library';
const BATCH_SIZE = 50;

const slug = process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]);
const dry = process.argv.includes('--dry');

const region = getRegion(slug);
if (!region) {
  console.error(`Unknown region '${slug}'. Usage: node scripts/seed-community-voices.mjs <slug> [--dry]`);
  process.exit(1);
}
const namespace = region.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Same rule as api/wiki/contributions/index.js: early contributions carry no
// region field and belong to the default region.
function regionFilter(s) {
  return s === DEFAULT_REGION
    ? { $or: [{ region: s }, { region: { $exists: false } }] }
    : { region: s };
}

async function contributionChunks() {
  const col = await getCollection('wiki_contributions');
  const docs = await col.find({ status: 'active', ...regionFilter(region.slug) }).toArray();
  return docs.map((c) => ({
    id: `contrib-${c.id}`,
    section: c.section || 'general',
    title: `Community contribution — ${c.title || c.type}`,
    type: 'contribution',
    text: `A resident's ${c.type} left on the ${region.name} wiki (${c.section}, ${String(c.created).slice(0, 10)}): "${c.content}"`,
  }));
}

async function voiceChunks() {
  let mod;
  try {
    mod = await import(`../src/lib/regions/${region.slug}-voices.js`);
  } catch {
    console.log(`No src/lib/regions/${region.slug}-voices.js — skipping voice material.`);
    return [];
  }
  const { VOICE_CONTRIBUTIONS, SURVEY_TALLIES, LEARN_AND_SHARE, FACILITATOR_SUMMARY } = mod;
  const chunks = [];

  const perLocation = {};
  for (const v of VOICE_CONTRIBUTIONS) {
    perLocation[v.location] = (perLocation[v.location] || 0) + 1;
    const n = v.n ?? perLocation[v.location];
    const who = v.speaker ? ` (${v.speaker})` : '';
    chunks.push({
      id: `voice-${slugify(v.location)}-${n}`,
      section: 'community',
      title: `Voice contribution — ${v.location}, 2026`,
      type: 'voice',
      text: `Recorded at ${v.location} in 2026, answering "${v.question}"${who}: "${v.text}"`,
    });
  }

  for (const t of SURVEY_TALLIES) {
    const counts = t.options.map((o) => `${o.label}: ${o.count}`).join('; ');
    const other = t.other?.length ? ` Other answers: ${t.other.join('; ')}.` : '';
    chunks.push({
      id: `survey-${slugify(t.question).slice(0, 60)}`,
      section: 'community',
      title: `Ermida survey 2026 — ${t.question}`,
      type: 'survey',
      text: `Ermida community survey, 2026. "${t.question}" Responses per option: ${counts}.${other}`,
    });
  }

  chunks.push({
    id: 'survey-learn-and-share',
    section: 'community',
    title: 'Ermida survey 2026 — learning and sharing',
    type: 'survey',
    text: `Ermida community survey, 2026. "${LEARN_AND_SHARE.question}" Answers: ${LEARN_AND_SHARE.answers.map((a) => `"${a}"`).join('; ')}.`,
  });

  chunks.push(
    { id: 'voices-summary-intro', section: 'community', title: 'Voice contributions — how they were collected', type: 'voice-summary', text: `Facilitators' summary of the 2026 voice contributions: ${FACILITATOR_SUMMARY.introduction}` },
    { id: 'voices-summary-regional', section: 'community', title: 'Voice contributions — what the regional festivals said', type: 'voice-summary', text: `Facilitators' summary: ${FACILITATOR_SUMMARY.regional}` },
    { id: 'voices-summary-festival', section: 'community', title: 'Voice contributions — what Kind Family Festival said', type: 'voice-summary', text: `Facilitators' summary: ${FACILITATOR_SUMMARY.festival}` },
  );
  FACILITATOR_SUMMARY.insights.forEach((insight, i) => {
    chunks.push({
      id: `voices-insight-${i + 1}`,
      section: 'community',
      title: `Voice contributions — insight ${i + 1}`,
      type: 'voice-summary',
      text: `Facilitators' insight from the 2026 voice contributions: ${insight}`,
    });
  });

  return chunks;
}

async function main() {
  const chunks = [...(await contributionChunks()), ...(await voiceChunks())];
  console.log(`${chunks.length} chunks for ${region.name} (namespace: ${namespace})`);
  const byType = {};
  for (const c of chunks) byType[c.type] = (byType[c.type] || 0) + 1;
  for (const [k, v] of Object.entries(byType)) console.log(`  ${String(v).padStart(4)}  ${k}`);

  if (dry) {
    for (const c of chunks) console.log(`\n[${c.id}] ${c.title}\n${c.text}`);
    console.log('\n--dry: nothing written.');
    process.exit(0);
  }

  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(INDEX_NAME).namespace(namespace);

  let upserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await pc.inference.embed({
      model: 'multilingual-e5-large',
      inputs: batch.map((c) => c.text),
      parameters: { inputType: 'passage', truncate: 'END' },
    });
    const vectors = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddings.data[idx].values,
      metadata: { section: chunk.section, title: chunk.title, type: chunk.type, text: chunk.text },
    }));
    await index.upsert({ records: vectors });
    upserted += vectors.length;
    console.log(`  Upserted ${upserted}/${chunks.length}`);
  }
  console.log(`\nDone. ${upserted} chunks in ${INDEX_NAME}/${namespace}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
