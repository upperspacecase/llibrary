import { ObjectId } from 'mongodb';
import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';

// Editable fields per collection. PATCH ignores anything not listed here so
// the admin UI can't write arbitrary keys.
const EDITABLE_FIELDS = {
    waitlist: ['email'],
    submissions: ['propertyTitle', 'name', 'contact', 'postcode'],
    landbooks: ['propertyName', 'clientName', 'contact', 'postcode', 'address'],
};

// waitlist docs are keyed only by Mongo _id; submissions/landbooks carry a
// UUID `id` field.
function buildFilter(collection, id) {
    if (collection === 'waitlist') return { _id: new ObjectId(id) };
    return { id };
}

export default async function handler(req, res) {
    if (req.method !== 'DELETE' && req.method !== 'PATCH') {
        res.setHeader('Allow', 'DELETE, PATCH');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    const body = req.body || {};
    const collection = body.collection || req.query.collection;
    const id = body.id || req.query.id;

    if (!EDITABLE_FIELDS[collection]) {
        return res.status(400).json({ error: 'Invalid collection' });
    }
    if (!id) {
        return res.status(400).json({ error: 'Missing id' });
    }

    let filter;
    try {
        filter = buildFilter(collection, id);
    } catch {
        return res.status(400).json({ error: 'Invalid id' });
    }

    const col = await getCollection(collection);

    if (req.method === 'DELETE') {
        const result = await col.deleteOne(filter);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        return res.status(200).json({ ok: true });
    }

    // PATCH — only whitelisted fields are written.
    const allowed = EDITABLE_FIELDS[collection];
    const set = {};
    for (const [key, val] of Object.entries(body.updates || {})) {
        if (allowed.includes(key)) set[key] = typeof val === 'string' ? val.trim() : val;
    }
    if (Object.keys(set).length === 0) {
        return res.status(400).json({ error: 'No editable fields provided' });
    }

    const result = await col.updateOne(filter, { $set: set });
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(200).json({ ok: true, updated: set });
}
