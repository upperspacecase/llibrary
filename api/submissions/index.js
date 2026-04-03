import { getCollection } from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const submissions = await getCollection('submissions');
    const all = await submissions.find({}).sort({ created: -1 }).toArray();
    return res.status(200).json(all);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const email = (body.email || '').trim().toLowerCase();
    const address = (body.address || '').trim();

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const doc = {
      id: body.id || crypto.randomUUID(),
      boundary: body.boundary || [],
      center: body.center || null,
      area: body.area || null,
      perimeter: body.perimeter || null,
      address: body.address || '',
      email,
      notes: body.notes || '',
      files: body.files || [],
      created: new Date().toISOString(),
    };

    const submissions = await getCollection('submissions');
    await submissions.insertOne(doc);

    // Upsert email into waitlist
    if (email) {
      const waitlist = await getCollection('waitlist');
      await waitlist.updateOne(
        { email },
        { $setOnInsert: { email, address: doc.address, location: null, createdAt: new Date() } },
        { upsert: true },
      );
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Submission failed', detail: err.message });
  }
}
