import { head } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password, url, filename } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    try {
        // Get blob metadata to find the authenticated download URL
        const blobInfo = await head(url);

        // Fetch the actual file content using the server's blob token
        const fileRes = await fetch(blobInfo.downloadUrl);
        if (!fileRes.ok) throw new Error('Blob fetch failed');

        const buffer = Buffer.from(await fileRes.arrayBuffer());
        const safeName = (filename || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');

        res.setHeader('Content-Type', blobInfo.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.status(200).end(buffer);
    } catch (err) {
        console.error('Download error:', err);
        return res.status(500).json({ error: 'Failed to download file' });
    }
}
