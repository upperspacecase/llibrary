import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    try {
        const [waitlist, landbooks, contributions, resources, submissions, reportVersions] = await Promise.all([
            getCollection('waitlist').then(c => c.find({}).sort({ createdAt: -1 }).toArray()),
            getCollection('landbooks').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_contributions').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_resources').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('submissions').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('report_versions').then(c =>
                c.find({}, { projection: { html_content: 0, data_snapshot: 0 } })
                 .sort({ created: -1 }).toArray()
            ),
        ]);

        return res.status(200).json({
            waitlist,
            landbooks,
            contributions,
            resources,
            submissions,
            reportVersions,
        });
    } catch (err) {
        console.error('Admin data error:', err);
        notifyError({ endpoint: '/api/admin/data', method: 'POST', action: 'fetch admin data' }, err);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
}
