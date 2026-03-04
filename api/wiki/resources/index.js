import { getCollection } from '../../_db.js';
import { put, del } from '@vercel/blob';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (Vercel Blob handles large files well)
const ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
];

/**
 * Parse multipart/form-data from the raw request body.
 * Vercel serverless functions don't include a multipart parser,
 * so we handle it manually.
 */
async function parseMultipart(req) {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) throw new Error('No boundary found in content-type');

    const boundary = boundaryMatch[1];
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const body = buffer.toString('latin1');

    const parts = body.split('--' + boundary).slice(1, -1);
    const fields = {};
    let file = null;

    for (const part of parts) {
        const [rawHeaders, ...rawBodyParts] = part.split('\r\n\r\n');
        const rawBody = rawBodyParts.join('\r\n\r\n').replace(/\r\n$/, '');

        const nameMatch = rawHeaders.match(/name="([^"]+)"/);
        const fileNameMatch = rawHeaders.match(/filename="([^"]+)"/);
        const typeMatch = rawHeaders.match(/Content-Type:\s*(.+)/i);

        if (fileNameMatch && nameMatch) {
            // File field
            const startIndex = buffer.indexOf('\r\n\r\n', buffer.indexOf(rawHeaders.trim())) + 4;
            const endBoundary = Buffer.from('\r\n--' + boundary, 'latin1');
            const endIndex = buffer.indexOf(endBoundary, startIndex);
            const fileBuffer = buffer.slice(startIndex, endIndex);

            file = {
                fieldName: nameMatch[1],
                fileName: fileNameMatch[1],
                contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
                data: fileBuffer,
            };
        } else if (nameMatch) {
            // Regular field
            fields[nameMatch[1]] = rawBody.trim();
        }
    }

    return { fields, file };
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    const resources = await getCollection('wiki_resources');

    // ---- GET: list resources ----
    if (req.method === 'GET') {
        const { section, limit } = req.query;
        const filter = { status: 'active' };
        if (section) filter.section = section;

        const maxResults = Math.min(parseInt(limit) || 50, 100);

        const results = await resources
            .find(filter)
            .sort({ created: -1 })
            .limit(maxResults)
            .toArray();

        return res.status(200).json(results);
    }

    // ---- POST: upload resource ----
    if (req.method === 'POST') {
        let fields, file;
        try {
            ({ fields, file } = await parseMultipart(req));
        } catch (err) {
            return res.status(400).json({ error: 'Invalid multipart form data: ' + err.message });
        }

        // Validate required fields
        if (!file) {
            return res.status(400).json({ error: 'A file is required' });
        }
        if (!fields.section) {
            return res.status(400).json({ error: 'section is required' });
        }

        // Validate section
        const validSections = [
            'bioregion', 'ecology', 'land', 'soil', 'water',
            'climate', 'landuse', 'risks', 'culture', 'community',
        ];
        if (!validSections.includes(fields.section)) {
            return res.status(400).json({ error: `Invalid section. Must be one of: ${validSections.join(', ')}` });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.contentType)) {
            return res.status(400).json({
                error: `File type not allowed. Accepted: PDF, PNG, JPG, WEBP`,
            });
        }

        // Validate file size
        if (file.data.length > MAX_FILE_SIZE) {
            return res.status(400).json({
                error: `File too large. Maximum size is 10 MB.`,
            });
        }

        // Upload to Vercel Blob
        let blob;
        try {
            blob = await put(`wiki-resources/${fields.section}/${Date.now()}-${file.fileName}`, file.data, {
                contentType: file.contentType,
                access: 'public',
            });
        } catch (err) {
            console.error('Vercel Blob upload error:', err);
            return res.status(500).json({ error: 'File upload failed' });
        }

        const doc = {
            id: crypto.randomUUID(),
            section: fields.section,
            title: fields.title || file.fileName,
            description: fields.description || '',
            author: fields.author || 'Anonymous',
            fileName: file.fileName,
            fileType: file.contentType,
            fileSize: file.data.length,
            blobUrl: blob.url,
            status: 'active',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
        };

        await resources.insertOne(doc);
        return res.status(201).json(doc);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
