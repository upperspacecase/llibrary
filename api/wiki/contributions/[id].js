import { getCollection } from '../../_db.js';
import { notifyError } from '../../_notify.js';

export default async function handler(req, res) {
    try {
        const { id } = req.query;
        const contributions = await getCollection('wiki_contributions');

        if (req.method === 'GET') {
            const doc = await contributions.findOne({ id });
            if (!doc) return res.status(404).json({ error: 'Contribution not found' });
            return res.status(200).json(doc);
        }

        if (req.method === 'PUT') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const updates = { ...body, updated: new Date().toISOString() };
            delete updates._id;
            delete updates.id;

            const result = await contributions.findOneAndUpdate(
                { id },
                { $set: updates },
                { returnDocument: 'after' }
            );

            if (!result) return res.status(404).json({ error: 'Contribution not found' });
            return res.status(200).json(result);
        }

        if (req.method === 'DELETE') {
            const result = await contributions.deleteOne({ id });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Contribution not found' });
            return res.status(200).json({ deleted: true });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error(`Wiki contributions [${req.method}] error:`, err);
        notifyError({ endpoint: '/api/wiki/contributions/[id]', method: req.method, action: `${req.method} contribution`, body: req.body }, err);
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
