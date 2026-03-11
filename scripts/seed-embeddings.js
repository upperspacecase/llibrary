/**
 * One-time script to seed the Pinecone land-library index with wiki data.
 * Run: node scripts/seed-embeddings.js
 */
import { readFileSync } from 'fs';

// Load env vars
const lines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n');
for (const line of lines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) process.env[m[1]] = m[2];
}

import { Pinecone } from '@pinecone-database/pinecone';
import { SECTIONS, LANDMARKS, EVENTS_CALENDAR, ODEMIRA } from '../src/lib/wiki-data.js';

const INDEX_NAME = 'land-library';
const BATCH_SIZE = 50;

function chunkWikiSections(sections) {
  const chunks = [];

  for (const [sectionId, section] of Object.entries(sections)) {
    if (section.intro) {
      chunks.push({
        id: `wiki-${sectionId}-intro`,
        section: sectionId,
        title: section.title,
        type: 'wiki',
        text: `${section.title}: ${section.intro}`,
      });
    }

    if (section.articles) {
      for (let i = 0; i < section.articles.length; i++) {
        const article = section.articles[i];
        const text = `${section.title} — ${article.title}: ${article.content}`;

        if (text.length > 600) {
          const sentences = text.split(/(?<=[.!?])\s+/);
          let current = '';
          let chunkIdx = 0;

          for (const sentence of sentences) {
            if (current.length + sentence.length > 500 && current.length > 100) {
              chunks.push({
                id: `wiki-${sectionId}-${i}-${chunkIdx}`,
                section: sectionId,
                title: `${section.title} — ${article.title}`,
                type: 'wiki',
                text: current.trim(),
              });
              const lastSentence = current.split(/(?<=[.!?])\s+/).pop() || '';
              current = lastSentence + ' ' + sentence;
              chunkIdx++;
            } else {
              current += (current ? ' ' : '') + sentence;
            }
          }

          if (current.trim()) {
            chunks.push({
              id: `wiki-${sectionId}-${i}-${chunkIdx}`,
              section: sectionId,
              title: `${section.title} — ${article.title}`,
              type: 'wiki',
              text: current.trim(),
            });
          }
        } else {
          chunks.push({
            id: `wiki-${sectionId}-article-${i}`,
            section: sectionId,
            title: `${section.title} — ${article.title}`,
            type: 'wiki',
            text,
          });
        }
      }
    }

    if (section.visuals?.stats) {
      const statsText = section.visuals.stats
        .map(s => `${s.label}: ${s.value}${s.sublabel ? ` (${s.sublabel})` : ''}`)
        .join('. ');
      chunks.push({
        id: `wiki-${sectionId}-stats`,
        section: sectionId,
        title: `${section.title} — Key Statistics`,
        type: 'wiki',
        text: `${section.title} statistics: ${statsText}`,
      });
    }
  }

  // Add landmarks as chunks
  for (const lm of LANDMARKS) {
    chunks.push({
      id: `landmark-${lm.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
      section: 'landmarks',
      title: lm.name,
      type: 'landmark',
      text: `${lm.name} (${lm.type}): ${lm.desc}${lm.pop ? ` Population: ~${lm.pop}.` : ''} Coordinates: ${lm.coords[0]}, ${lm.coords[1]}.`,
    });
  }

  // Add events as a single chunk
  const eventsText = EVENTS_CALENDAR
    .map(e => `${e.name} — ${e.month} in ${e.location} (${e.type})`)
    .join('. ');
  chunks.push({
    id: 'events-calendar',
    section: 'events',
    title: 'Events & Festivals',
    type: 'events',
    text: `Odemira events and festivals: ${eventsText}`,
  });

  // Add municipality overview
  chunks.push({
    id: 'odemira-overview',
    section: 'overview',
    title: 'Odemira Municipality',
    type: 'wiki',
    text: `Odemira municipality overview: ${ODEMIRA.name}, ${ODEMIRA.subtitle}, ${ODEMIRA.country}. Region: ${ODEMIRA.region}. Area: ${ODEMIRA.area} km². Population: ~${ODEMIRA.population}. Parishes: ${ODEMIRA.parishes}. Elevation: ${ODEMIRA.elevation.min}m to ${ODEMIRA.elevation.max}m. Coastline: ${ODEMIRA.coastline}.`,
  });

  return chunks;
}

async function main() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(INDEX_NAME);

  // Wait for index to be ready
  console.log('Checking index status...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const desc = await pc.describeIndex(INDEX_NAME);
    if (desc.status?.ready) {
      ready = true;
      break;
    }
    console.log('  Waiting for index to be ready...');
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!ready) {
    console.error('Index not ready after 60s');
    process.exit(1);
  }

  console.log('Index is ready!');

  const chunks = chunkWikiSections(SECTIONS);
  console.log(`Generated ${chunks.length} chunks from wiki data`);

  let upserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.text);

    console.log(`Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batch.length} chunks)...`);

    const embeddings = await pc.inference.embed({
      model: 'multilingual-e5-large',
      inputs: texts,
      parameters: { inputType: 'passage', truncate: 'END' },
    });

    const vectors = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddings.data[idx].values,
      metadata: {
        section: chunk.section,
        title: chunk.title,
        type: chunk.type,
        text: chunk.text,
      },
    }));

    await index.upsert({ records: vectors });
    upserted += vectors.length;
    console.log(`  Upserted ${upserted}/${chunks.length}`);
  }

  console.log(`\nDone! Embedded ${upserted} chunks into ${INDEX_NAME}`);

  // Verify
  const stats = await index.describeIndexStats();
  console.log('Index stats:', JSON.stringify(stats, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
