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
    const postcode = (body.postcode || '').trim();

    if (!postcode) {
      return res.status(400).json({ error: 'Post code is required' });
    }

    const doc = {
      id: body.id || crypto.randomUUID(),
      boundary: body.boundary || [],
      center: body.center || null,
      area: body.area || null,
      perimeter: body.perimeter || null,
      postcode,
      email,
      phone: (body.phone || '').trim(),
      contactPreference: body.contactPreference || '',
      useIntent: body.useIntent || '',
      waterAccess: body.waterAccess || '',
      infrastructure: body.infrastructure || '',
      vegetation: body.vegetation || '',
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
        { $setOnInsert: { email, postcode: doc.postcode, location: null, createdAt: new Date() } },
        { upsert: true },
      );
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Submission failed', detail: err.message });
  }
}
