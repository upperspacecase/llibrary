import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  try {
    const shared = await getCollection('shared_reports');
    const doc = await shared.findOne({ slug });
    if (!doc) return res.status(404).json({ error: 'Report not found' });
    return res.status(200).json(doc);
  } catch (err) {
    console.error('Shared report fetch error:', err);
    return res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
}
