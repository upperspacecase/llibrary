import { getCollection } from '../../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;

  try {
    const reports = await getCollection('report_versions');
    const doc = await reports.findOne({ slug });
    if (!doc) return res.status(404).json({ error: 'Report not found' });

    // Redirect to Blob if available
    if (doc.blob_url) {
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.redirect(302, doc.blob_url);
    }

    return res.status(200).json({ slug: doc.slug, html_content: doc.html_content, version: doc.version, created: doc.created });
  } catch (err) {
    console.error('Shared report fetch error:', err);
    return res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
}
