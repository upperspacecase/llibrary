/**
 * GET /api/landbooks/:id/pdf
 *
 * Streams the latest GridFS-stored PDF version for a landbook.
 * Optional query: ?version=<n> to fetch a specific version.
 */

import { GridFSBucket } from 'mongodb';
import { requireAdminOrInternal } from '../../_auth.js';
import { getDb, getCollection } from '../../_db.js';

const BUCKET = 'landbook_pdfs';
const META_COLLECTION = 'landbook_pdf_versions';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdminOrInternal(req, res)) return;

  const { id, version } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const meta = await getCollection(META_COLLECTION);
    const filter = { landbookId: id };
    if (version) filter.version = Number(version);
    const cursor = meta.find(filter).sort({ version: -1 }).limit(1);
    const doc = await cursor.next();
    if (!doc) return res.status(404).json({ error: 'No PDF generated for this landbook' });

    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: BUCKET });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', doc.sizeBytes);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const stream = bucket.openDownloadStream(doc.gridFsFileId);
    stream.on('error', (err) => {
      console.error(`pdf download [${id}] stream error:`, err);
      if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
      else res.destroy(err);
    });
    stream.pipe(res);
  } catch (err) {
    console.error(`pdf download [${id}] error:`, err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  }
}
