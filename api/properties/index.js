import { getCollection } from '../_db.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const properties = await getCollection('properties');

    if (req.method === 'GET') {
        const all = await properties.find({}).sort({ created: -1 }).toArray();
        return res.status(200).json(all);
    }

    if (req.method === 'POST') {
        try {
            const data = req.body;
            const doc = {
                ...data,
                _id: undefined,
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                created: new Date().toISOString(),
            };
            delete doc._id;
            await properties.insertOne(doc);
            return res.status(201).json(doc);
        } catch (err) {
            console.error('Properties POST error:', err);
            notifyError({ endpoint: '/api/properties', method: 'POST', action: 'insertOne property', body: req.body }, err);
            return res.status(500).json({ error: 'Server error', detail: err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
