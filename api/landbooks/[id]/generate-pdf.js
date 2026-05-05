/**
 * POST /api/landbooks/:id/generate-pdf
 *
 * Renders the public landbook page via the Fly Puppeteer worker and stores
 * the resulting PDF in MongoDB GridFS. Each call creates a new version.
 */

import { GridFSBucket } from 'mongodb';
import { requireAdmin } from '../../_auth.js';
import { getDb, getCollection } from '../../_db.js';
import { notifyError } from '../../_notify.js';

const BUCKET = 'landbook_pdfs';
const META_COLLECTION = 'landbook_pdf_versions';

function getReportBaseUrl() {
  return process.env.LANDBOOK_REPORT_BASE_URL || 'https://landbook.landlibrary.co';
}

async function nextVersion(landbookId) {
  const meta = await getCollection(META_COLLECTION);
  const latest = await meta.find({ landbookId }).sort({ version: -1 }).limit(1).next();
  return latest ? latest.version + 1 : 1;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const workerUrl = process.env.PDF_WORKER_URL;
  const workerToken = process.env.PDF_WORKER_TOKEN;
  if (!workerUrl || !workerToken) {
    return res.status(500).json({ error: 'PDF worker not configured' });
  }

  const reportUrl = `${getReportBaseUrl()}/${encodeURIComponent(id)}`;

  try {
    const workerRes = await fetch(`${workerUrl.replace(/\/$/, '')}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ url: reportUrl }),
    });

    if (!workerRes.ok) {
      const detail = await workerRes.text().catch(() => '');
      throw new Error(`Worker returned ${workerRes.status}: ${detail.slice(0, 500)}`);
    }

    const arrayBuf = await workerRes.arrayBuffer();
    const pdfBytes = Buffer.from(arrayBuf);
    if (pdfBytes.length === 0) throw new Error('Worker returned empty PDF');

    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: BUCKET });
    const version = await nextVersion(id);
    const filename = `landbook-${id}-v${version}.pdf`;
    const generatedAt = new Date();

    const fileId = await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, {
        contentType: 'application/pdf',
        metadata: { landbookId: id, version, generatedAt },
      });
      stream.on('error', reject);
      stream.on('finish', () => resolve(stream.id));
      stream.end(pdfBytes);
    });

    const meta = await getCollection(META_COLLECTION);
    await meta.insertOne({
      landbookId: id,
      version,
      generatedAt,
      sizeBytes: pdfBytes.length,
      filename,
      gridFsFileId: fileId,
      reportUrl,
    });

    return res.status(200).json({
      version,
      generatedAt: generatedAt.toISOString(),
      sizeBytes: pdfBytes.length,
      filename,
    });
  } catch (err) {
    console.error(`generate-pdf [${id}] error:`, err);
    notifyError({ endpoint: '/api/landbooks/[id]/generate-pdf', method: 'POST', action: 'generate-pdf', body: { id } }, err);
    return res.status(500).json({ error: 'Failed to generate PDF', detail: err.message });
  }
}
