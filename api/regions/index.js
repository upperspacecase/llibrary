import { getCollection } from '../_db.js';

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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getRegions(req, res);
  }
  if (req.method === 'POST') {
    return postRegion(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getRegions(_req, res) {
  try {
    const col = await getCollection('waitlist');

    // Aggregate vote counts from waitlist entries that have a region name.
    // Exclude feedback/newsletter entries which use 'address' for other purposes.
    // Historical data used either 'address' (home page) or 'location' as string (commons page).
    const pipeline = [
      { $match: { type: { $nin: ['feedback', 'newsletter'] } } },
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
      { $group: { _id: { $toLower: '$_region' }, name: { $first: '$_region' }, votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
      { $limit: 50 },
    ];

    const results = await col.aggregate(pipeline).toArray();

    // Build a map of existing votes (keyed by lowercase name)
    const voteMap = new Map();
    for (const r of results) {
      voteMap.set(r._id, { name: r.name, votes: r.votes });
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

  try {
    const col = await getCollection('waitlist');
    await col.insertOne({
      email: email.trim().toLowerCase(),
      address: region.trim(),
      type: 'region-request',
      createdAt: new Date(),
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Regions POST error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
