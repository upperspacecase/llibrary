import { Pinecone } from '@pinecone-database/pinecone';
import { getCollection } from '../_db.js';

const INDEX_NAME = 'land-library';
const BATCH_SIZE = 50;

/**
 * Chunks wiki section content into embeddable passages.
 * Each chunk gets a section label, title, and text.
 */
function chunkWikiSections(sections) {
  const chunks = [];

  for (const [sectionId, section] of Object.entries(sections)) {
    // Chunk the intro
    if (section.intro) {
      chunks.push({
        id: `wiki-${sectionId}-intro`,
        section: sectionId,
        title: section.title,
        type: 'wiki',
        text: `${section.title}: ${section.intro}`,
      });
    }

    // Chunk each article
    if (section.articles) {
      for (let i = 0; i < section.articles.length; i++) {
        const article = section.articles[i];
        const text = `${section.title} — ${article.title}: ${article.content}`;

        // Split long articles into ~500 char chunks with overlap
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
              // Keep last sentence for overlap
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

    // Chunk visual stats as factual data
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

  return chunks;
}

/**
 * Chunks wiki contributions from MongoDB.
 */
function chunkContributions(contributions) {
  return contributions.map(c => ({
    id: `contrib-${c.id}`,
    section: c.section || 'general',
    title: c.title || 'Community Contribution',
    type: 'contribution',
    text: `${c.title || 'Contribution'} (${c.section || 'general'}): ${c.content}`,
  }));
}

/**
 * Chunks landbook auto-data into searchable passages.
 */
function chunkLandbooks(landbooks) {
  const chunks = [];

  for (const lb of landbooks) {
    if (!lb.autoData) continue;

    const parts = [];
    if (lb.address) parts.push(`Location: ${lb.address}`);
    if (lb.area) parts.push(`Area: ${Math.round(lb.area)} m²`);
    if (lb.autoData.elevation != null) parts.push(`Elevation: ${lb.autoData.elevation}m`);
    if (lb.autoData.soil) parts.push(`Soil data available`);
    if (lb.autoData.climate) parts.push(`Climate data available`);
    if (lb.autoData.biodiversity) parts.push(`Biodiversity data available`);
    if (lb.userReported?.primaryUse) parts.push(`Used for: ${lb.userReported.primaryUse}`);
    if (lb.userReported?.challenges?.length) parts.push(`Challenges: ${lb.userReported.challenges.join(', ')}`);

    if (parts.length > 0) {
      chunks.push({
        id: `landbook-${lb.id}`,
        section: 'landbook',
        title: `Landbook: ${lb.address || lb.id}`,
        type: 'landbook',
        text: `Land parcel data — ${parts.join('. ')}`,
      });
    }
  }

  return chunks;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { sources = ['wiki', 'contributions', 'landbooks'] } = body;

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME);

    const allChunks = [];
    const results = { wiki: 0, contributions: 0, landbooks: 0 };

    // 1. Chunk wiki data (passed from client or imported statically)
    if (sources.includes('wiki') && body.wikiSections) {
      const wikiChunks = chunkWikiSections(body.wikiSections);
      allChunks.push(...wikiChunks);
      results.wiki = wikiChunks.length;
    }

    // 2. Chunk contributions from MongoDB
    if (sources.includes('contributions')) {
      const contributions = await getCollection('wiki_contributions');
      const docs = await contributions.find({ status: 'active' }).toArray();
      const contribChunks = chunkContributions(docs);
      allChunks.push(...contribChunks);
      results.contributions = contribChunks.length;
    }

    // 3. Chunk landbooks from MongoDB
    if (sources.includes('landbooks')) {
      const landbooks = await getCollection('landbooks');
      const docs = await landbooks.find({}).toArray();
      const lbChunks = chunkLandbooks(docs);
      allChunks.push(...lbChunks);
      results.landbooks = lbChunks.length;
    }

    if (allChunks.length === 0) {
      return res.status(200).json({ message: 'No chunks to embed', results });
    }

    // 4. Embed and upsert in batches
    let upserted = 0;

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.text);

      // Use Pinecone's built-in embedding model
      const embeddings = await pc.inference.embed('multilingual-e5-large', texts, {
        inputType: 'passage',
      });

      const vectors = batch.map((chunk, idx) => ({
        id: chunk.id,
        values: embeddings[idx].values,
        metadata: {
          section: chunk.section,
          title: chunk.title,
          type: chunk.type,
          text: chunk.text,
        },
      }));

      await index.upsert(vectors);
      upserted += vectors.length;
    }

    return res.status(200).json({
      message: `Embedded ${upserted} chunks`,
      results,
      total: upserted,
    });
  } catch (err) {
    console.error('Embed error:', err);
    return res.status(500).json({ error: 'Embedding failed', detail: err.message });
  }
}
