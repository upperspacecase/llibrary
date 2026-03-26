import { Pinecone } from '@pinecone-database/pinecone';

const INDEX_NAME = 'land-library';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    const indexes = await pc.listIndexes();
    const exists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);

    if (!exists) {
      return res.status(200).json({
        ready: false,
        index: INDEX_NAME,
        message: 'Index does not exist. POST /api/chat/init to create it.',
      });
    }

    const description = await pc.describeIndex(INDEX_NAME);
    const indexStats = await pc.index(INDEX_NAME).describeIndexStats();

    return res.status(200).json({
      ready: description.status?.ready || false,
      index: INDEX_NAME,
      dimension: description.dimension,
      vectorCount: indexStats.totalRecordCount || 0,
      namespaces: indexStats.namespaces || {},
    });
  } catch (err) {
    console.error('Status error:', err);
    return res.status(500).json({ error: 'Status check failed', detail: err.message });
  }
}
