import { getCollection } from '../_db.js';
import { requireAdmin } from '../_auth.js';

// Default seed regions — used when no waitlist data exists for a region
const SEED_REGIONS = [
  'Algarve, Portugal',
  'Sintra, Portugal',
  'Douro Valley, Portugal',
  'Provence, France',
  'Andalusia, Spain',
  'Peloponnese, Greece',
  'Cotswolds, England',
  'Willamette Valley, Oregon',
  'Byron Bay, Australia',
  'Waikato, New Zealand',
  'Tuscany, Italy',
  'Crete, Greece',
  'Dordogne, France',
  'Lake District, England',
  'Minho, Portugal',
  'Cork, Ireland',
  'Mallorca, Spain',
  'Puglia, Italy',
  'Central Otago, New Zealand',
  'Margaret River, Australia',
];

const SEED_SET = new Set(SEED_REGIONS.map(s => s.toLowerCase()));

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getRegions(req, res);
  }
  if (req.method === 'POST') {
    return postRegion(req, res);
  }
  if (req.method === 'PATCH') {
    return patchRegion(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getRegions(_req, res) {
  try {
    const col = await getCollection('waitlist');

    // Aggregate vote counts from waitlist entries that have a region name.
    // Only count votes for seed regions or admin-approved regions.
    const pipeline = [
      { $match: { type: 'region-request' } },
      {
        $addFields: {
          _region: {
            $switch: {
              branches: [
                {
                  case: { $and: [{ $gt: ['$address', ''] }, { $ne: ['$address', null] }] },
                  then: '$address',
                },
                {
                  case: { $and: [{ $eq: [{ $type: '$location' }, 'string'] }, { $gt: ['$location', ''] }] },
                  then: '$location',
                },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { _region: { $ne: null } } },
      {
        $group: {
          _id: { $toLower: '$_region' },
          name: { $first: '$_region' },
          votes: { $sum: 1 },
          statuses: { $push: '$status' },
        },
      },
      { $sort: { votes: -1 } },
      { $limit: 50 },
    ];

    const results = await col.aggregate(pipeline).toArray();

    // Build a map — only include seed regions or those with at least one 'approved' entry
    const voteMap = new Map();
    for (const r of results) {
      const isSeed = SEED_SET.has(r._id);
      const hasApproved = r.statuses.includes('approved');
      if (isSeed || hasApproved) {
        voteMap.set(r._id, { name: r.name, votes: r.votes });
      }
    }

    // Merge seed regions (add any that don't already have votes)
    for (const seed of SEED_REGIONS) {
      const key = seed.toLowerCase();
      if (!voteMap.has(key)) {
        voteMap.set(key, { name: seed, votes: 0 });
      }
    }

    // Sort by votes descending, take top 8
    const regions = Array.from(voteMap.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 8);

    return res.status(200).json({ regions });
  } catch (err) {
    console.error('Regions GET error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function postRegion(req, res) {
  const { email, region } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!region || !region.trim()) {
    return res.status(400).json({ error: 'Region is required' });
  }

  const trimmed = region.trim();
  const isSeed = SEED_SET.has(trimmed.toLowerCase());

  try {
    const col = await getCollection('waitlist');

    // If not a seed region, check if it has been approved previously
    let isApproved = isSeed;
    if (!isSeed) {
      const existing = await col.findOne({
        type: 'region-request',
        address: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: 'approved',
      });
      isApproved = !!existing;
    }

    await col.insertOne({
      email: email.trim().toLowerCase(),
      address: trimmed,
      type: 'region-request',
      status: isApproved ? 'approved' : 'pending',
      createdAt: new Date(),
    });

    return res.status(201).json({ ok: true, pending: !isApproved });
  } catch (err) {
    console.error('Regions POST error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function patchRegion(req, res) {
  if (!requireAdmin(req, res)) return;

  const { region, status } = req.body || {};
  if (!region || !status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid region and status (approved/rejected) required' });
  }

  try {
    const col = await getCollection('waitlist');
    const result = await col.updateMany(
      {
        type: 'region-request',
        address: { $regex: new RegExp(`^${region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      },
      { $set: { status } },
    );

    return res.status(200).json({ ok: true, modified: result.modifiedCount });
  } catch (err) {
    console.error('Regions PATCH error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
