import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { getCollection } from '../_db.js';

const INDEX_NAME = 'land-library';

const SYSTEM_PROMPT = `You are a knowledgeable, friendly guide to the Odemira bioregion in southern Portugal. You speak like a well-informed neighbor explaining things over coffee — warm, specific, and practical.

You have access to detailed knowledge about the region including ecology, soil, water, climate, land use, risks, culture, and community initiatives. When answering, draw on the provided context passages. If context doesn't cover the question, say so honestly.

Key facts:
- Odemira: Largest municipality in Portugal, 1,720.6 km², ~31,488 people
- Location: Alentejo Litoral, 44% in PNSACV natural park
- 110 km of pristine coastline
- Major issues: Water scarcity, greenhouse expansion, fire risk, rural change
- Mira River system with Santa Clara dam at 36-37% capacity

Keep answers concise (2-4 paragraphs max). Reference specific data when available. If the user has a landbook, reference their land-specific data when relevant.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { message, history = [], landbookId } = body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // 1. Query Pinecone for relevant context
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(INDEX_NAME);

    // Embed the query using Pinecone's built-in model
    const queryEmbedding = await pc.inference.embed('multilingual-e5-large', [message], {
      inputType: 'query',
    });

    const queryResult = await index.query({
      vector: queryEmbedding[0].values,
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
    const systemPrompt = SYSTEM_PROMPT + context + landbookContext;

    const apiMessages = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    apiMessages.push({ role: 'user', content: message });

    // 5. Call Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
