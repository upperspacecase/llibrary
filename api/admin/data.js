import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    try {
        const [waitlist, landbooks, contributions, resources, submissions, reportVersions, observations, facts, reports] = await Promise.all([
            getCollection('waitlist').then(c => c.find({}).sort({ createdAt: -1 }).toArray()),
            getCollection('landbooks').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_contributions').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('wiki_resources').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('submissions').then(c => c.find({}).sort({ created: -1 }).toArray()),
            getCollection('report_versions').then(c =>
                c.find({}, { projection: { html_content: 0, data_snapshot: 0 } })
                 .sort({ created: -1 }).toArray()
            ),
            // 3-layer pipeline status (lightweight projections)
            getCollection('observations').then(c =>
                c.aggregate([
                    { $group: {
                        _id: '$landbookId',
                        total: { $sum: 1 },
                        ok: { $sum: { $cond: [{ $eq: ['$status', 'ok'] }, 1, 0] } },
                        failed: { $sum: { $cond: [{ $ne: ['$status', 'ok'] }, 1, 0] } },
                        lastFetched: { $max: '$fetchedAt' },
                    }},
                ]).toArray()
            ).catch(() => []),
            getCollection('facts').then(c =>
                c.find({}, { projection: { landbookId: 1, version: 1, updatedAt: 1 } }).toArray()
            ).catch(() => []),
            getCollection('reports').then(c =>
                c.aggregate([
                    { $sort: { version: -1 } },
                    { $group: {
                        _id: '$landbookId',
                        latestVersion: { $first: '$version' },
                        generatedAt: { $first: '$generatedAt' },
                        model: { $first: '$model' },
                        totalVersions: { $sum: 1 },
                    }},
                ]).toArray()
            ).catch(() => []),
        ]);

        // Build pipeline status index keyed by landbookId
        const pipelineStatus = {};
        for (const obs of observations) {
            if (!pipelineStatus[obs._id]) pipelineStatus[obs._id] = {};
            pipelineStatus[obs._id].observations = { total: obs.total, ok: obs.ok, failed: obs.failed, lastFetched: obs.lastFetched };
        }
        for (const fact of facts) {
            if (!pipelineStatus[fact.landbookId]) pipelineStatus[fact.landbookId] = {};
            pipelineStatus[fact.landbookId].facts = { version: fact.version, updatedAt: fact.updatedAt };
        }
        for (const rep of reports) {
            if (!pipelineStatus[rep._id]) pipelineStatus[rep._id] = {};
            pipelineStatus[rep._id].report = { version: rep.latestVersion, generatedAt: rep.generatedAt, model: rep.model, totalVersions: rep.totalVersions };
        }

        return res.status(200).json({
            waitlist,
            landbooks,
            contributions,
            resources,
            submissions,
            reportVersions,
            pipelineStatus,
        });
    } catch (err) {
        console.error('Admin data error:', err);
        notifyError({ endpoint: '/api/admin/data', method: 'POST', action: 'fetch admin data' }, err);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
}
