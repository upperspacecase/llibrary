import { getCollection } from '../_db.js';

export default async function handler(req, res) {
    const landbooks = await getCollection('landbooks');

    if (req.method === 'GET') {
        const all = await landbooks.find({}).sort({ created: -1 }).toArray();
        return res.status(200).json(all);
    }

    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const email = (body.email || '').trim().toLowerCase();
        const doc = {
            id: body.id || crypto.randomUUID(),
            boundary: body.boundary || [],
            center: body.center || null,
            area: body.area || null,
            perimeter: body.perimeter || null,
            address: body.address || '',
            email,
            autoData: body.autoData || {},
            userReported: body.userReported || {},
            created: body.created || new Date().toISOString(),
            updated: new Date().toISOString(),
        };
        await landbooks.insertOne(doc);

        // Upsert email into waitlist (single source of truth for contacts)
        if (email) {
            const waitlist = await getCollection('waitlist');
            await waitlist.updateOne(
                { email },
                { $setOnInsert: { email, address: body.address || '', location: null, createdAt: new Date() } },
                { upsert: true }
            );
        }

        return res.status(201).json(doc);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
