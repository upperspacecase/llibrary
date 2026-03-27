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
    // Historical data used either 'address' (home page) or 'location' (commons page) as the field.
    const pipeline = [
      {
        $addFields: {
          region: {
            $cond: {
              if: { $and: [{ $ne: ['$address', ''] }, { $ne: ['$address', null] }] },
              then: '$address',
              else: {
                $cond: {
                  if: { $and: [{ $isString: '$location' }, { $ne: ['$location', ''] }] },
                  then: '$location',
                  else: null,
                },
              },
            },
          },
        },
      },
      { $match: { region: { $ne: null } } },
      { $group: { _id: { $toLower: '$region' }, name: { $first: '$region' }, votes: { $sum: 1 } } },
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

    // Sort by votes descending, take top 20
    const regions = Array.from(voteMap.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 20);

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
