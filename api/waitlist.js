import { getCollection } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, address, location } = req.body || {};

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
        const col = await getCollection('waitlist');
        await col.insertOne({
            email: email.trim().toLowerCase(),
            address: address || '',
            location: location || null, // { lat, lng }
            createdAt: new Date(),
        });

        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error('Waitlist error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
