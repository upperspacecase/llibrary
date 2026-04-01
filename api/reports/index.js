import { getCollection } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const reports = await getCollection('report_versions');
    const all = await reports.find({}).sort({ created: -1 }).toArray();
    return res.status(200).json(all);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const reports = await getCollection('report_versions');
    const count = await reports.countDocuments();

    const doc = {
      id: body.id || crypto.randomUUID(),
      version: body.version || `v${count + 1}`,
      name: body.name || `Version ${count + 1}`,
      created: new Date().toISOString(),
      locked_sections: body.locked_sections || [],
      html_content: body.html_content || '',
      data_snapshot: body.data_snapshot || null,
    };

    await reports.insertOne(doc);
    return res.status(201).json(doc);
  } catch (err) {
    console.error('Report save error:', err);
    return res.status(500).json({ error: 'Save failed', detail: err.message });
  }
}
