import { getCollection } from '../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { report_id } = body;

    if (!report_id) return res.status(400).json({ error: 'report_id required' });

    const reports = await getCollection('report_versions');
    const { ObjectId } = await import('mongodb');
    let query;
    try {
      query = { _id: new ObjectId(report_id) };
    } catch {
      query = { _id: report_id };
    }
    const report = await reports.findOne(query);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Build slug from address + version
    const address = report.data_snapshot?.submission?.address || 'report';
    const slugBase = address
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${slugBase}-${report.version}`;

    // Check if already shared
    const shared = await getCollection('shared_reports');
    const existing = await shared.findOne({ report_id });
    if (existing) {
      return res.status(200).json({ slug: existing.slug, url: `/report/${existing.slug}`, already_shared: true });
    }

    // Also check slug collision
    const slugExists = await shared.findOne({ slug });
    const finalSlug = slugExists ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;

    const doc = {
      slug: finalSlug,
      report_id,
      version: report.version,
      blob_url: report.blob_url || null,
      html_content: report.blob_url ? null : report.html_content,
      created: new Date().toISOString(),
    };

    await shared.insertOne(doc);

    return res.status(201).json({ slug: finalSlug, url: `/report/${finalSlug}` });
  } catch (err) {
    console.error('Share error:', err);
    return res.status(500).json({ error: 'Share failed', detail: err.message });
  }
}
