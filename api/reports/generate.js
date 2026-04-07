/**
 * POST /api/reports/generate
 *
 * Generates a LandBook report for a submission.
 * Thin handler that orchestrates: data pipeline → AI narratives → template → storage.
 *
 * Body: { submission_id?, force_refresh?, force_narratives? }
 * Returns: { id, version, slug, blob_url, name, created }
 */

import { getCollection } from '../_db.js';
import { put } from '@vercel/blob';
import { ObjectId } from 'mongodb';
import { fetchAllData, processRawData, buildMapUrls } from '../../src/lib/report-data-pipeline.js';
import { generateNarratives } from '../../src/lib/report-narratives.js';
import { buildReport } from '../../src/templates/report-template.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { submission_id, force_refresh = false, force_narratives = false } = body || {};

    // ── 1. Load submission ──────────────────────────────────
    const submissions = await getCollection('submissions');
    let submission;

    if (submission_id) {
      submission = await submissions.findOne({
        _id: typeof submission_id === 'string' && submission_id.length === 24
          ? new ObjectId(submission_id)
          : submission_id,
      });
    }

    if (!submission) {
      // Fall back to most recent submission
      submission = await submissions.findOne({}, { sort: { created: -1 } });
    }

    if (!submission) {
      return res.status(404).json({ error: 'No submission found' });
    }

    const center = submission.center || submission.coordinates;
    const boundary = submission.boundary || [];
    const lat = Array.isArray(center) ? center[0] : center?.lat;
    const lng = Array.isArray(center) ? center[1] : center?.lng;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'Submission has no coordinates' });
    }

    // Calculate area in hectares
    const areaSqm = submission.area || 0;
    const areaHa = areaSqm > 0 ? areaSqm / 10000 : 1;

    // ── 2. Check for cached data ────────────────────────────
    const reportVersions = await getCollection('report_versions');
    let reportData = null;

    if (!force_refresh) {
      const cached = await reportVersions.findOne(
        { submission_id: submission._id },
        { sort: { created: -1 } }
      );
      if (cached?.data_snapshot) {
        console.log('[generate] Using cached data snapshot');
        reportData = cached.data_snapshot;
      }
    }

    // ── 3. Fetch fresh data if needed ───────────────────────
    if (!reportData) {
      console.log('[generate] Fetching fresh data from APIs...');
      const boundaryCoords = Array.isArray(boundary[0])
        ? boundary
        : boundary.map(p => [p.lat || p[0], p.lng || p[1]]);

      const raw = await fetchAllData(lat, lng, boundaryCoords, areaHa);
      reportData = processRawData(raw, submission, areaHa);
    }

    // ── 4. Generate AI narratives ───────────────────────────
    const hasNarratives = reportData.narratives &&
      Object.values(reportData.narratives).some(v =>
        typeof v === 'string' ? v.length > 0 :
        typeof v === 'object' && v && Object.values(v).some(s => s && s.length > 0)
      );

    if (!hasNarratives || force_narratives) {
      console.log('[generate] Generating AI narratives...');
      try {
        reportData.narratives = await generateNarratives(reportData);
      } catch (err) {
        console.error('[generate] Narrative generation failed:', err.message);
        // Continue without narratives — report still renders
      }
    }

    // ── 5. Build report HTML ────────────────────────────────
    console.log('[generate] Building report HTML...');
    const html = buildReport(reportData);

    // ── 6. Storage ──────────────────────────────────────────
    const propertyName = reportData.property?.name || 'report';
    const slugBase = propertyName
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Determine version number
    const existingCount = await reportVersions.countDocuments({
      submission_id: submission._id,
    });
    const versionNum = existingCount + 1;
    const version = `v${versionNum}`;
    const slug = `${slugBase}-${version}`;
    const now = new Date();

    // Upload to Vercel Blob
    let blobUrl = null;
    try {
      const blob = await put(`reports/${slug}.html`, html, {
        access: 'private',
        contentType: 'text/html; charset=utf-8',
        addRandomSuffix: false,
      });
      blobUrl = blob.url;
    } catch (err) {
      console.error('[generate] Blob upload failed:', err.message);
      // Fall back to storing HTML in DB
    }

    // Save to MongoDB — always store HTML for reliable serving
    const doc = {
      submission_id: submission._id,
      user_email: submission.email || submission.contact?.email || null,
      name: propertyName,
      slug,
      version,
      blob_url: blobUrl,
      html_content: html,
      data_snapshot: reportData,
      created: now,
    };

    const result = await reportVersions.insertOne(doc);

    console.log(`[generate] Report ${slug} created (${version})`);

    return res.status(200).json({
      id: result.insertedId,
      version,
      name: propertyName,
      slug,
      blob_url: blobUrl,
      created: now.toISOString(),
    });

  } catch (error) {
    console.error('[generate] Error:', error);
    return res.status(500).json({
      error: 'Report generation failed',
      detail: error.message,
    });
  }
}
