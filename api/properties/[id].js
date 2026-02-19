import { getCollection } from '../_db.js';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    const properties = await getCollection('properties');

    if (req.method === 'GET') {
        const property = await properties.findOne({ id });
        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        return res.status(200).json(property);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
