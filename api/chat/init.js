import { Pinecone } from '@pinecone-database/pinecone';

const INDEX_NAME = 'land-library';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    // Check if index already exists
    const indexes = await pc.listIndexes();
    const exists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);

    if (exists) {
      const description = await pc.describeIndex(INDEX_NAME);
      return res.status(200).json({
        message: 'Index already exists',
        index: INDEX_NAME,
        status: description.status,
        dimension: description.dimension,
        count: description.status?.ready ? 'ready' : 'initializing',
      });
    }

    // Create serverless index with multilingual-e5-large dimensions (1024)
    await pc.createIndex({
      name: INDEX_NAME,
      dimension: 1024,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    return res.status(201).json({
      message: 'Index created',
      index: INDEX_NAME,
      dimension: 1024,
      metric: 'cosine',
    });
  } catch (err) {
    console.error('Init error:', err);
    return res.status(500).json({ error: 'Index creation failed', detail: err.message });
  }
}
