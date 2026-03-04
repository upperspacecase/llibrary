import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const contributions = await getCollection('wiki_contributions');

    // Aggregate counts per section and type
    const pipeline = [
        { $match: { status: 'active' } },
        {
            $group: {
                _id: { section: '$section', type: '$type' },
                count: { $sum: 1 },
                lastUpdated: { $max: '$created' },
            },
        },
    ];

    const results = await contributions.aggregate(pipeline).toArray();

    // Build per-section stats
    const sections = {};
    let totalSuggestions = 0;
    let totalComments = 0;
    let globalLastUpdated = null;

    // Types that count as "suggestions"
    const suggestionTypes = new Set(['edit', 'flag', 'story', 'tip', 'event', 'place', 'resource']);

    for (const row of results) {
        const sectionId = row._id.section;
        const type = row._id.type;

        if (!sections[sectionId]) {
            sections[sectionId] = { suggestions: 0, comments: 0, lastUpdated: null };
        }

        if (type === 'comment') {
            sections[sectionId].comments += row.count;
            totalComments += row.count;
        } else if (suggestionTypes.has(type)) {
            sections[sectionId].suggestions += row.count;
            totalSuggestions += row.count;
        }

        // Track latest update
        if (row.lastUpdated) {
            if (!sections[sectionId].lastUpdated || row.lastUpdated > sections[sectionId].lastUpdated) {
                sections[sectionId].lastUpdated = row.lastUpdated;
            }
            if (!globalLastUpdated || row.lastUpdated > globalLastUpdated) {
                globalLastUpdated = row.lastUpdated;
            }
        }
    }

    return res.status(200).json({
        sections,
        totals: {
            suggestions: totalSuggestions,
            comments: totalComments,
            lastUpdated: globalLastUpdated,
        },
    });
}
