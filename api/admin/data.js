import { getCollection } from '../_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const [waitlist, properties, landbooks, contributions, resources, submissions] = await Promise.all([
            getCollection('waitlist').then(c => c.find({}).sort({ createdAt: -1 }).toArray()),
            getCollection('properties').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('landbooks').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_contributions').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_resources').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('submissions').then(c => c.find({}).sort({ created: -1 }).toArray()),
        ]);

        return res.status(200).json({
            waitlist,
            properties,
            landbooks,
            contributions,
            resources,
            submissions,
        });
    } catch (err) {
        console.error('Admin data error:', err);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
}
