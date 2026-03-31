import { getDownloadUrl } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password, url } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    try {
        const downloadUrl = await getDownloadUrl(url);
        return res.status(200).json({ downloadUrl });
    } catch (err) {
        console.error('Download URL error:', err);
        return res.status(500).json({ error: 'Failed to generate download URL' });
    }
}
