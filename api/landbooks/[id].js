import { getCollection } from '../_db.js';

export default async function handler(req, res) {
    const { id } = req.query;
    const landbooks = await getCollection('landbooks');

    if (req.method === 'GET') {
        const landbook = await landbooks.findOne({ id });
        if (!landbook) return res.status(404).json({ error: 'Landbook not found' });
        return res.status(200).json(landbook);
    }

    if (req.method === 'PUT') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const updates = { ...body, updated: new Date().toISOString() };
        // Remove _id from updates to avoid MongoDB error
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
}
