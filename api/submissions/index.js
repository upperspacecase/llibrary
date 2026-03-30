import { randomUUID } from 'crypto';
import { IncomingForm } from 'formidable';
import { readFileSync } from 'fs';
import { put } from '@vercel/blob';
import { getCollection } from '../_db.js';

export const config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 10 * 1024 * 1024,
      multiples: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const submissions = await getCollection('submissions');
    const all = await submissions.find({}).sort({ created: -1 }).toArray();
    return res.status(200).json(all);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    // formidable v3 wraps single values in arrays
    const val = (v) => (Array.isArray(v) ? v[0] : v) || '';

    const submissionId = val(fields.id) || randomUUID();
    const email = val(fields.email).trim().toLowerCase();

    // Upload files to Vercel Blob
    const uploadedFiles = [];
    const fileArray = files.files
      ? (Array.isArray(files.files) ? files.files : [files.files])
      : [];

    for (const file of fileArray) {
      const buffer = readFileSync(file.filepath);
      const blobPath = `submissions/${submissionId}/${file.originalFilename || randomUUID()}`;

      const blob = await put(blobPath, buffer, {
        access: 'public',
        contentType: file.mimetype || 'application/octet-stream',
      });

      uploadedFiles.push({
        name: file.originalFilename,
        size: file.size,
        type: file.mimetype,
        url: blob.url,
      });
    }

    const doc = {
      id: submissionId,
      boundary: JSON.parse(val(fields.boundary) || '[]'),
      center: JSON.parse(val(fields.center) || 'null'),
      area: parseFloat(val(fields.area)) || null,
      perimeter: parseFloat(val(fields.perimeter)) || null,
      address: val(fields.address),
      email,
      notes: val(fields.notes),
      files: uploadedFiles,
      created: new Date().toISOString(),
    };

    const submissions = await getCollection('submissions');
    await submissions.insertOne(doc);

    // Upsert email into waitlist
    if (email) {
      const waitlist = await getCollection('waitlist');
      await waitlist.updateOne(
        { email },
        { $setOnInsert: { email, address: doc.address, location: null, createdAt: new Date() } },
        { upsert: true },
      );
    }

    return res.status(201).json(doc);
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Submission failed', detail: err.message });
  }
}
