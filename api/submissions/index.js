import { getCollection } from '../_db.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const submissions = await getCollection('submissions');
    const all = await submissions.find({}).sort({ created: -1 }).toArray();
    return res.status(200).json(all);
  }

  // PATCH — add optional extras to an existing submission
  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body.id) return res.status(400).json({ error: 'Submission id is required' });

      const allowed = [
        'landCondition', 'landUse', 'zoning',
        'waterReliability', 'waterSource',
        'challenges', 'landGoals', 'helpNeeded', 'notes', 'files',
      ];
      const updates = {};
      for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key];
      }

      const submissions = await getCollection('submissions');
      await submissions.updateOne({ id: body.id }, { $set: updates });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Submission update error:', err);
      notifyError({ endpoint: '/api/submissions', method: 'PATCH', action: 'updateOne submissions', body: req.body }, err);
      return res.status(500).json({ error: 'Update failed', detail: err.message });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const postcode = (body.postcode || '').trim();

    if (!postcode) {
      return res.status(400).json({ error: 'Post code is required' });
    }

    const contact = (body.contact || '').trim();
    const email = body.contactMethod === 'email' ? contact.toLowerCase() : '';

    const doc = {
      id: body.id || crypto.randomUUID(),
      boundary: body.boundary || [],
      center: body.center || null,
      area: body.area || null,
      perimeter: body.perimeter || null,
      postcode,
      name: (body.name || '').trim(),
      contactMethod: body.contactMethod || 'email',
      contact,
      // Optional fields — populated via PATCH
      landCondition: [], landUse: [], zoning: [],
      waterReliability: '', waterSource: [],
      challenges: [], landGoals: [], helpNeeded: [],
      notes: '',
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
    notifyError({ endpoint: '/api/submissions', method: 'POST', action: 'insertOne submissions', body: req.body }, err);
    return res.status(500).json({ error: 'Submission failed', detail: err.message });
  }
}
