import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Resource ID is required' });
    }

    const resources = await getCollection('wiki_resources');
    const resource = await resources.findOne({ id, status: 'active' });

    if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
    }

    // Redirect to the Vercel Blob CDN URL
    return res.redirect(302, resource.blobUrl);
}
