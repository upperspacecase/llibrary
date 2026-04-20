import { getCollection } from '../_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const expected = process.env.METRICS_INTERNAL_TOKEN;
    if (!expected) {
        return res.status(500).json({ error: 'Not configured' });
    }
    const header = req.headers.authorization || '';
    if (header !== `Bearer ${expected}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const waitlistCol = await getCollection('waitlist');
        const waitlist = await waitlistCol.countDocuments();

        // LandLibrary has no signup model; submissions are the closest analog
        const submissionsCol = await getCollection('submissions');
        const signups = await submissionsCol.countDocuments();

        return res.status(200).json({ signups, waitlist });
    } catch (err) {
        console.error('Metrics error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
