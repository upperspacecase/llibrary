import { createSessionCookie, clearSessionCookie, verifySession } from '../_auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

async function verifyGoogleToken(credential) {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload.aud !== GOOGLE_CLIENT_ID) return null;
    return payload;
}

export default async function handler(req, res) {
    // Check existing session
    if (req.method === 'GET') {
        const session = verifySession(req);
        return res.status(session.valid ? 200 : 401).json({ ok: session.valid });
    }

    // Logout
    if (req.method === 'DELETE') {
        res.setHeader('Set-Cookie', clearSessionCookie());
        return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { credential, password } = req.body || {};

    // Google One Tap login
    if (credential) {
        if (!GOOGLE_CLIENT_ID || !ADMIN_EMAILS.length) {
            return res.status(500).json({ error: 'Google auth not configured' });
        }

        const payload = await verifyGoogleToken(credential);
        if (!payload) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        if (!ADMIN_EMAILS.includes(payload.email.toLowerCase())) {
            return res.status(403).json({ error: 'Not an authorized admin account' });
        }

        res.setHeader('Set-Cookie', createSessionCookie('admin'));
        return res.status(200).json({ ok: true, email: payload.email });
    }

    // Fallback: password login
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        return res.status(500).json({ error: 'Admin password not configured' });
    }

    if (password === adminPassword) {
        res.setHeader('Set-Cookie', createSessionCookie('admin'));
        return res.status(200).json({ ok: true });
    }

    return res.status(401).json({ error: 'Invalid password' });
}
