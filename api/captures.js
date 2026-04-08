import { randomUUID } from 'crypto';
import { put, del } from '@vercel/blob';
import { getCollection } from './_db.js';
import { notifyError } from './_notify.js';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return uploadCapture(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteCapture(req, res);
  }
  res.setHeader('Allow', 'POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

async function uploadCapture(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { landbookId, image, note } = body;

  if (!landbookId || !image) {
    return res.status(400).json({ error: 'landbookId and image are required' });
  }

  try {
    // Upload to Vercel Blob
    const buffer = Buffer.from(image.split(',')[1] || image, 'base64');
    const filename = `captures/${landbookId}/${randomUUID()}.jpg`;

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    // Create capture record
    const capture = {
      id: randomUUID(),
      url: blob.url,
      blobPathname: blob.pathname,
      note: note || '',
      created: new Date().toISOString(),
    };

    // Push to landbook's captures array
    const landbooks = await getCollection('landbooks');
    await landbooks.updateOne(
      { id: landbookId },
      { $push: { captures: capture } }
    );

    return res.status(201).json(capture);
  } catch (err) {
    console.error('Capture upload error:', err);
    notifyError({ endpoint: '/api/captures', method: 'POST', action: 'upload capture' }, err);
    return res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
}

async function deleteCapture(req, res) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { landbookId, captureId } = body;

  if (!landbookId || !captureId) {
    return res.status(400).json({ error: 'landbookId and captureId are required' });
  }

  try {
    const landbooks = await getCollection('landbooks');
    const lb = await landbooks.findOne({ id: landbookId });
    const capture = lb?.captures?.find(c => c.id === captureId);

    // Delete from Vercel Blob
    if (capture?.blobPathname) {
      try { await del(capture.blobPathname); } catch (e) { console.warn('Blob delete failed:', e); }
    }

    // Remove from landbook
    await landbooks.updateOne(
      { id: landbookId },
      { $pull: { captures: { id: captureId } } }
    );

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Capture delete error:', err);
    notifyError({ endpoint: '/api/captures', method: 'DELETE', action: 'delete capture' }, err);
    return res.status(500).json({ error: 'Delete failed', detail: err.message });
  }
}
