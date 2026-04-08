import { getCollection } from '../_db.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    try {
        const { id } = req.query;
        const properties = await getCollection('properties');

        if (req.method === 'GET') {
            const property = await properties.findOne({ id });
            if (!property) return res.status(404).json({ error: 'Property not found' });
            return res.status(200).json(property);
        }

        if (req.method === 'PUT') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const updates = { ...body, updated: new Date().toISOString() };
            delete updates._id;
            delete updates.id;

            const result = await properties.findOneAndUpdate(
                { id },
                { $set: updates },
                { returnDocument: 'after' }
            );

            if (!result) return res.status(404).json({ error: 'Property not found' });
            return res.status(200).json(result);
        }

        if (req.method === 'DELETE') {
            const result = await properties.deleteOne({ id });
            if (result.deletedCount === 0) return res.status(404).json({ error: 'Property not found' });
            return res.status(200).json({ deleted: true });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error(`Properties [${req.method}] error:`, err);
        notifyError({ endpoint: '/api/properties/[id]', method: req.method, action: `${req.method} property`, body: req.body }, err);
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
