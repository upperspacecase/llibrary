import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'll_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
    const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
    if (!s) throw new Error('No SESSION_SECRET or ADMIN_PASSWORD configured');
    return s;
}

function sign(payload) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', getSecret()).update(data).digest('base64url');
    return `${data}.${sig}`;
}

function verify(token) {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;

    const expected = createHmac('sha256', getSecret()).update(data).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
        if (!payload.exp || payload.exp < Date.now() / 1000) return null;
        return payload;
    } catch {
        return null;
    }
}

function parseCookies(header) {
    const cookies = {};
    if (!header) return cookies;
    for (const pair of header.split(';')) {
        const [k, ...v] = pair.trim().split('=');
        if (k) cookies[k.trim()] = v.join('=').trim();
    }
    return cookies;
}

export function createSessionCookie(role = 'admin') {
    const payload = { role, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
    const token = sign(payload);
    return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
    return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function verifySession(req) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];
    if (!token) return { valid: false };
    const payload = verify(token);
    if (!payload) return { valid: false };
    return { valid: true, role: payload.role };
}

export function requireAdmin(req, res) {
    const session = verifySession(req);
    if (!session.valid || session.role !== 'admin') {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}
