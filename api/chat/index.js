import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { getCollection } from '../_db.js';

const INDEX_NAME = 'land-library';
const DEFAULT_REGION = 'odemira';

function buildSystemPrompt(region) {
  return `You are a knowledgeable guide to the ${region} bioregion.

Rules:
- Be direct. Match your answer length to the question:
  - Yes/no or single-fact questions: one sentence.
  - Questions where the context has 2-3 relevant data points: two to three sentences weaving those points together.
  - Broad or multi-part questions with rich context: a short paragraph, but no longer.
  - Never pad a short answer to seem more complete. Never truncate a rich answer to seem concise.
- Use exact numbers, ranges, and dates from the context. Never round, average, or paraphrase data — quote it as given.
- If the context below doesn't fully cover the question, say what the context does show, then fill in from your general knowledge and note that part isn't from local data.
- When context data conflicts with what you might know generally, always defer to the context.
- No bullet lists, no headers, no markdown formatting. Plain conversational text.
- If the user has land data, reference it naturally.
- Never end your response with a question. Just answer.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { message, history = [], landbookId, region = DEFAULT_REGION } = body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const namespace = region.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  try {
    // 1. Query Pinecone for relevant context (namespaced by region)
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME).namespace(namespace);

    // Embed the query using Pinecone's built-in model
    const queryEmbedding = await pc.inference.embed({
      model: 'multilingual-e5-large',
      inputs: [message],
      parameters: { inputType: 'query', truncate: 'END' },
    });

    const queryResult = await index.query({
      vector: queryEmbedding.data[0].values,
      topK: 8,
      includeMetadata: true,
    });

    // 2. Build context from retrieved chunks
    let context = '';
    if (queryResult.matches && queryResult.matches.length > 0) {
      const passages = queryResult.matches
        .filter(m => m.score > 0.3)
        .map(m => `[${m.metadata.section}] ${m.metadata.title}: ${m.metadata.text}`)
        .join('\n\n');
      context = `\n\nRelevant context from the land library:\n${passages}`;
    }

    // 3. If a landbook ID is provided, fetch that landbook's data
    let landbookContext = '';
    if (landbookId) {
      const landbooks = await getCollection('landbooks');
      const landbook = await landbooks.findOne({ id: landbookId });
      if (landbook) {
        const parts = [];
        if (landbook.address) parts.push(`Location: ${landbook.address}`);
        if (landbook.area) parts.push(`Area: ${Math.round(landbook.area)} m²`);
        if (landbook.autoData?.elevation != null) parts.push(`Elevation: ${landbook.autoData.elevation}m`);
        if (landbook.autoData?.soil) parts.push(`Soil: ${JSON.stringify(landbook.autoData.soil)}`);
        if (landbook.autoData?.climate) parts.push(`Climate: ${JSON.stringify(landbook.autoData.climate)}`);
        if (landbook.autoData?.biodiversity) parts.push(`Biodiversity: ${JSON.stringify(landbook.autoData.biodiversity)}`);
        if (landbook.autoData?.fire) parts.push(`Fire risk: ${JSON.stringify(landbook.autoData.fire)}`);
        if (landbook.autoData?.water) parts.push(`Water: ${JSON.stringify(landbook.autoData.water)}`);
        if (landbook.userReported?.primaryUse) parts.push(`Primary use: ${landbook.userReported.primaryUse}`);
        if (landbook.userReported?.challenges?.length) parts.push(`Challenges: ${landbook.userReported.challenges.join(', ')}`);
        if (landbook.userReported?.goals) parts.push(`Goals: ${JSON.stringify(landbook.userReported.goals)}`);
        if (parts.length > 0) {
          landbookContext = `\n\nThe user's land parcel data:\n${parts.join('\n')}`;
        }
      }
    }

    // 4. Build messages for Claude
    const systemPrompt = buildSystemPrompt(region) + context + landbookContext;

    const apiMessages = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    apiMessages.push({ role: 'user', content: message });

    // 5. Call Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: apiMessages,
    });

    const text = response.content?.[0]?.text || 'No response received.';

    return res.status(200).json({
      message: text,
      sources: queryResult.matches
        ?.filter(m => m.score > 0.3)
        .map(m => ({
          section: m.metadata.section,
          title: m.metadata.title,
          score: m.score,
        })) || [],
    });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Chat failed', detail: err.message });
  }
}
