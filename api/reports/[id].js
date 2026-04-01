import { getCollection } from '../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const reports = await getCollection('report_versions');
    const doc = await reports.findOne({ id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(doc);
  } catch (err) {
    console.error('Report fetch error:', err);
    return res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
}
