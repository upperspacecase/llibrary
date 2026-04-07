/**
 * GET /api/reports/download/:slug
 * Serves a report as a downloadable HTML file.
 * Rebuilds from data_snapshot if blob is unavailable.
 */

import { getCollection } from '../../_db.js';
import { buildReport } from '../../../src/templates/report-template.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  try {
    const versions = await getCollection('report_versions');
    const report = await versions.findOne({ slug });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get HTML content — from blob, DB, or rebuild from snapshot
    let html;
    if (report.blob_url) {
      const blobRes = await fetch(report.blob_url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      });
      if (blobRes.ok) {
        html = await blobRes.text();
      }
    }
    if (!html && report.html_content) {
      html = report.html_content;
    }
    if (!html && report.data_snapshot) {
      // Rebuild from stored data
      html = buildReport(report.data_snapshot);
    }
    if (!html) {
      return res.status(404).json({ error: 'Report content not found' });
    }

    // Build filename: LandBook_{name}_{date}.html
    const name = (report.name || 'report')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_');
    const date = report.created
      ? new Date(report.created).toISOString().slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const filename = `LandBook_${name}_${date}.html`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(html);

  } catch (error) {
    console.error('[download] Error:', error);
    return res.status(500).json({ error: 'Download failed' });
  }
}
