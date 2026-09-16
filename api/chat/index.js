import Anthropic from '@anthropic-ai/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import { getCollection } from '../_db.js';
import { getRegion } from '../../src/lib/regions/index.js';
import { snapshotSensors } from '../../src/lib/sensor-source.js';

const INDEX_NAME = 'land-library';
const DEFAULT_REGION = 'odemira';

// Same networks and labels as api/regions/[region]/station-status.js.
const STATION_SOURCES = {
  snirh_meteorologica: 'weather station',
  snirh_hidrometrica:  'river gauge',
  snirh_piezometria:   'piezometer',
  snirh_qualidade_sub: 'groundwater quality',
  snirh_nascentes:     'spring',
};
const STATION_LINES_MAX = 20;
const STATION_MAX_AGE_DAYS = 365;
const STALE_AFTER_DAYS = 30;
const SENSOR_TYPES = ['weather', 'water', 'soil'];

/**
 * Latest readings from the ground: the region's catalogued monitoring
 * stations (one line per station and parameter, newest first) and any field
 * sensors attached to the region's landbook. Returns '' when there is nothing
 * recent enough to be worth the model's attention.
 */
async function buildGroundContext(regionMeta) {
  const lines = [];
  const now = Date.now();

  const stationsCol = await getCollection('stations');
  const stations = await stationsCol
    .find({ region: regionMeta.slug, source: { $in: Object.keys(STATION_SOURCES) } })
    .toArray();

  if (stations.length) {
    const byKey = new Map(stations.map((s) => [`${s.source}:${s.externalId}`, s]));
    const obsCol = await getCollection('station_observations');
    const obs = await obsCol
      .find(
        { source: { $in: Object.keys(STATION_SOURCES) }, externalId: { $in: stations.map((s) => s.externalId) } },
        { projection: { source: 1, externalId: 1, parameter: 1, parameterName: 1, unit: 1, readings: { $slice: -1 } } },
      )
      .toArray();

    const recent = obs
      .map((o) => {
        const reading = o.readings?.[0];
        const at = reading ? new Date(reading.timestamp).getTime() : NaN;
        return { o, reading, at };
      })
      .filter(({ reading, at }) => reading && Number.isFinite(at) && now - at <= STATION_MAX_AGE_DAYS * 86400000)
      .sort((a, b) => b.at - a.at)
      .slice(0, STATION_LINES_MAX);

    for (const { o, reading, at } of recent) {
      const station = byKey.get(`${o.source}:${o.externalId}`);
      if (!station) continue;
      const ageDays = Math.round((now - at) / 86400000);
      const where = [station.metadata?.parish, station.metadata?.municipality].filter(Boolean).join(', ');
      const unit = o.unit ? ` ${o.unit}` : '';
      const freshness = ageDays > STALE_AFTER_DAYS ? ` [stale: ${ageDays} days old]` : '';
      lines.push(
        `- ${station.name || station.code || o.externalId} (${STATION_SOURCES[o.source]}${where ? `, ${where}` : ''}) — ${o.parameterName || o.parameter}: ${reading.value}${unit} on ${new Date(at).toISOString().slice(0, 10)}${freshness}`,
      );
    }
  }

  if (regionMeta.landbookId) {
    for (const type of SENSOR_TYPES) {
      const snap = await snapshotSensors(regionMeta.landbookId, type);
      if (!snap.sensorCount) continue;
      for (const [metric, r] of Object.entries(snap.latest)) {
        const ageDays = Math.round((now - new Date(r.timestamp).getTime()) / 86400000);
        const freshness = ageDays > STALE_AFTER_DAYS ? ` [stale: ${ageDays} days old]` : '';
        lines.push(`- Field ${type} sensor — ${metric}: ${r.value}${r.unit ? ` ${r.unit}` : ''} on ${String(r.timestamp).slice(0, 10)}${freshness}`);
      }
    }
  }

  if (!lines.length) return '';
  return `\n\nLatest readings from monitoring stations and sensors in the region. Quote the value and its date; if a reading is marked stale, say how old it is rather than presenting it as current:\n${lines.join('\n')}`;
}

function buildSystemPrompt(region) {
  return `You are a knowledgeable guide to the ${region} bioregion.

Rules:
- Be direct. Match your answer length to the question:
  - Yes/no or single-fact questions: one sentence.
  - Questions where the context has 2-3 relevant data points: two to three sentences weaving those points together.
  - Broad or multi-part questions with rich context: a short paragraph, but no longer.
  - Never pad a short answer to seem more complete. Never truncate a rich answer to seem concise.
- Use exact numbers, ranges, and dates from the context. Never round, average, or paraphrase data — quote it as given.
- If the context below doesn't fully cover the question, answer as best you can using both context and general knowledge. Don't narrate what your sources are or distinguish between them — just give a seamless answer.
- When context data conflicts with what you might know generally, always defer to the context.
- No bullet lists, no headers, no markdown formatting. Plain conversational text.
- If the user has land data, reference it naturally.
- Never end your response with a question. Just answer.
- Your reply is cut off at 500 tokens, roughly 350 words. Plan the answer to finish well inside that: if the question is broad, cover the most useful points and close cleanly rather than starting a point you cannot finish.`;
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

    // 4. Latest station and sensor readings for the region. A failure here
    //    must not take the chat down: answer from the wiki alone instead.
    let groundContext = '';
    const regionMeta = getRegion(region);
    if (regionMeta) {
      try {
        groundContext = await buildGroundContext(regionMeta);
      } catch (err) {
        console.error(`Ground context for ${region} failed, answering without it:`, err);
      }
    }

    // 5. Build messages for Claude
    const systemPrompt = buildSystemPrompt(region) + context + groundContext + landbookContext;

    const apiMessages = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    apiMessages.push({ role: 'user', content: message });

    // 6. Call Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: apiMessages,
    });

    const text = response.content?.[0]?.text || 'No response received.';

    return res.status(200).json({
      message: text,
      groundReadings: groundContext ? groundContext.split('\n- ').length - 1 : 0,
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
