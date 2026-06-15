import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';
import { notifyError } from '../_notify.js';

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!requireAdmin(req, res)) return;

    try {
        const [waitlist, landbooks, contributions, resources, submissions, reportVersions, observations, facts, reports, shares, users] = await Promise.all([
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
                c.find(
                    {},
                    { projection: { landbookId: 1, source: 1, status: 1, label: 1, group: 1, error: 1, fetchedAt: 1 } }
                ).toArray()
            ).catch(() => []),
            getCollection('facts').then(c =>
                c.find({}, { projection: { landbookId: 1, version: 1, updatedAt: 1 } }).toArray()
            ).catch(() => []),
            // Latest report per landbook with full narratives so admin can preview per-section content
            getCollection('reports').then(c =>
                c.aggregate([
                    { $sort: { version: -1 } },
                    { $group: {
                        _id: '$landbookId',
                        latestVersion: { $first: '$version' },
                        generatedAt: { $first: '$generatedAt' },
                        model: { $first: '$model' },
                        narratives: { $first: '$narratives' },
                        totalVersions: { $sum: 1 },
                    }},
                ]).toArray()
            ).catch(() => []),
            // Share docs — one per landbook the agent has touched the Share page for
            getCollection('landbook_shares').then(c =>
                c.find(
                    {},
                    { projection: { landbookId: 1, token: 1, createdAt: 1, expiresAt: 1, recipients: 1, activity: 1 } }
                ).toArray()
            ).catch(() => []),
            // Agent signups — written on dashboard load by landbook-app.
            getCollection('users').then(c => c.find({}).sort({ createdAt: -1 }).toArray()).catch(() => []),
        ]);

        // Build per-landbook share summary
        const shareIndex = {};
        for (const s of shares) {
            const recipientCount = (s.recipients || []).length;
            const views = (s.activity || []).filter(a => a?.kind === 'viewed').length;
            shareIndex[s.landbookId] = {
                token: s.token,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                recipientCount,
                views,
                lastActivity: (s.activity || [])
                    .slice()
                    .sort((a, b) => (b?.at || '').localeCompare(a?.at || ''))[0] || null,
            };
        }

        // Build pipeline status index keyed by landbookId
        const pipelineStatus = {};
        for (const obs of observations) {
            const id = obs.landbookId;
            if (!id) continue;
            if (!pipelineStatus[id]) pipelineStatus[id] = {};
            if (!pipelineStatus[id].observations) {
                pipelineStatus[id].observations = { total: 0, ok: 0, failed: 0, lastFetched: null, sources: [] };
            }
            const ob = pipelineStatus[id].observations;
            ob.total++;
            if (obs.status === 'ok') ob.ok++;
            else ob.failed++;
            if (obs.fetchedAt && (!ob.lastFetched || obs.fetchedAt > ob.lastFetched)) {
                ob.lastFetched = obs.fetchedAt;
            }
            ob.sources.push({
                source: obs.source,
                status: obs.status,
                label: obs.label || obs.source,
                group: obs.group || null,
                error: obs.error || null,
                fetchedAt: obs.fetchedAt || null,
            });
        }
        // Sort source list per landbook: failed first, then by label
        for (const id of Object.keys(pipelineStatus)) {
            if (pipelineStatus[id].observations?.sources) {
                pipelineStatus[id].observations.sources.sort((a, b) => {
                    if ((a.status === 'ok') !== (b.status === 'ok')) return a.status === 'ok' ? 1 : -1;
                    return (a.label || '').localeCompare(b.label || '');
                });
            }
        }
        for (const fact of facts) {
            if (!pipelineStatus[fact.landbookId]) pipelineStatus[fact.landbookId] = {};
            pipelineStatus[fact.landbookId].facts = { version: fact.version, updatedAt: fact.updatedAt };
        }
        for (const rep of reports) {
            if (!pipelineStatus[rep._id]) pipelineStatus[rep._id] = {};
            // Summarize per-section fill: filled slots / total slots + sample preview
            const sections = {};
            const narr = rep.narratives || {};
            for (const [sectionKey, slots] of Object.entries(narr)) {
                if (!slots || typeof slots !== 'object') continue;
                const slotSummaries = {};
                let filled = 0;
                let total = 0;
                for (const [slotKey, val] of Object.entries(slots)) {
                    const isFilled = typeof val === 'string' && val.trim().length > 0;
                    total++;
                    if (isFilled) filled++;
                    slotSummaries[slotKey] = {
                        filled: isFilled,
                        text: isFilled ? val : '',
                        words: isFilled ? val.trim().split(/\s+/).length : 0,
                    };
                }
                sections[sectionKey] = { filled, total, slots: slotSummaries };
            }
            pipelineStatus[rep._id].report = {
                version: rep.latestVersion,
                generatedAt: rep.generatedAt,
                model: rep.model,
                totalVersions: rep.totalVersions,
                sections,
            };
        }

        return res.status(200).json({
            waitlist,
            landbooks,
            contributions,
            resources,
            submissions,
            reportVersions,
            users,
            pipelineStatus,
            shareIndex,
        });
    } catch (err) {
        console.error('Admin data error:', err);
        notifyError({ endpoint: '/api/admin/data', method: 'POST', action: 'fetch admin data' }, err);
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
}
