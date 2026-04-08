import { getCollection } from '../../_db.js';
import { notifyError } from '../../_notify.js';

export default async function handler(req, res) {
    const contributions = await getCollection('wiki_contributions');

    if (req.method === 'GET') {
        const { section, type, limit } = req.query;
        const filter = { status: 'active' };

        if (section) filter.section = section;
        if (type) {
            const types = type.split(',').map(t => t.trim()).filter(Boolean);
            filter.type = types.length > 1 ? { $in: types } : types[0];
        }

        const maxResults = Math.min(parseInt(limit) || 50, 100);

        const results = await contributions
            .find(filter)
            .sort({ created: -1 })
            .limit(maxResults)
            .toArray();

        return res.status(200).json(results);
    }

    if (req.method === 'POST') {
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

            if (!body.section || !body.type || !body.content) {
                return res.status(400).json({ error: 'section, type, and content are required' });
            }

            const validSections = ['bioregion', 'ecology', 'land', 'soil', 'water', 'climate', 'landuse', 'risks', 'culture', 'community', 'general'];
            const validTypes = ['story', 'tip', 'event', 'place', 'resource', 'edit', 'comment', 'flag'];

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
                location: body.location || null,
                status: 'active',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            };

            if (body.type === 'edit') {
                doc.selectedText = body.selectedText || '';
                doc.suggestedText = body.suggestedText || '';
                doc.articleTitle = body.articleTitle || '';
            }

            await contributions.insertOne(doc);
            return res.status(201).json(doc);
        } catch (err) {
            console.error('Wiki contributions POST error:', err);
            notifyError({ endpoint: '/api/wiki/contributions', method: 'POST', action: 'insertOne contribution', body: req.body }, err);
            return res.status(500).json({ error: 'Server error', detail: err.message });
        }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
