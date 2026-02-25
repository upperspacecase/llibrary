import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
    const contributions = await getCollection('wiki_contributions');

    if (req.method === 'GET') {
        const { section, type, limit } = req.query;
        const filter = { status: 'active' };

        if (section) filter.section = section;
        if (type) filter.type = type;

        const maxResults = Math.min(parseInt(limit) || 50, 100);

        const results = await contributions
            .find(filter)
            .sort({ created: -1 })
            .limit(maxResults)
            .toArray();

        return res.status(200).json(results);
    }

    if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // Validation
        if (!body.section || !body.type || !body.content) {
            return res.status(400).json({ error: 'section, type, and content are required' });
        }

        const validSections = ['land', 'water', 'weather', 'biodiversity', 'agriculture', 'community', 'history', 'governance'];
        const validTypes = ['story', 'tip', 'event', 'place', 'resource'];

        if (!validSections.includes(body.section)) {
            return res.status(400).json({ error: `Invalid section. Must be one of: ${validSections.join(', ')}` });
        }
        if (!validTypes.includes(body.type)) {
            return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
        }

        const doc = {
            id: crypto.randomUUID(),
            section: body.section,
            type: body.type,
            title: body.title || '',
            content: body.content,
            author: body.author || 'Anonymous',
            location: body.location || null, // { lat, lng, name }
            status: 'active',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };

        await contributions.insertOne(doc);
        return res.status(201).json(doc);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
