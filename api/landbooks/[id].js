import { getCollection } from '../_db.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    try {
        const { id } = req.query;
        const landbooks = await getCollection('landbooks');

        if (req.method === 'GET') {
            let landbook = await landbooks.findOne({ id });
            if (!landbook) {
                // Fall back to submissions collection so v2 dashboard works with submission IDs
                const submissions = await getCollection('submissions');
                const sub = await submissions.findOne({ id });
                if (sub) {
                    landbook = { ...sub, address: sub.address || sub.postcode || '' };
                }
            }
            if (!landbook) return res.status(404).json({ error: 'Landbook not found' });
            return res.status(200).json(landbook);
        }

        if (req.method === 'PUT') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const updates = { ...body, updated: new Date().toISOString() };
            delete updates._id;
            delete updates.id;

            const result = await landbooks.findOneAndUpdate(
                { id },
                { $set: updates },
                { returnDocument: 'after' }
            );

            if (!result) return res.status(404).json({ error: 'Landbook not found' });
            return res.status(200).json(result);
        }

        if (req.method === 'DELETE') {
            const result = await landbooks.deleteOne({ id });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Landbook not found' });
            return res.status(200).json({ deleted: true });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error(`Landbooks [${req.method}] error:`, err);
        notifyError({ endpoint: '/api/landbooks/[id]', method: req.method, action: `${req.method} landbook`, body: req.body }, err);
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
