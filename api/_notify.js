import { Resend } from 'resend';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'authorization'];
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const recentAlerts = new Map();

function shouldSend(key) {
  const now = Date.now();
  const last = recentAlerts.get(key);
  if (last && now - last < COOLDOWN_MS) return false;
  recentAlerts.set(key, now);
  // Prune old entries to prevent unbounded growth
  if (recentAlerts.size > 100) {
    for (const [k, t] of recentAlerts) {
      if (now - t > COOLDOWN_MS) recentAlerts.delete(k);
    }
  }
  return true;
}

function sanitizeBody(body) {
  if (!body) return null;
  try {
    const obj = typeof body === 'string' ? JSON.parse(body) : { ...body };
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) obj[key] = '[REDACTED]';
    }
    const str = JSON.stringify(obj, null, 2);
    return str.length > 2000 ? str.slice(0, 2000) + '\n... (truncated)' : str;
  } catch {
    return '(unable to serialize request body)';
  }
}

/**
 * Send an error alert email. Fire-and-forget — never throws.
 * @param {{ endpoint: string, method: string, action: string, body?: any }} context
 * @param {Error} error
 */
export function notifyError(context, error) {
  const apiKey = process.env.RESEND_API_KEY;
  const alertEmail = process.env.ALERT_EMAIL;
  if (!apiKey || !alertEmail) return;

  const key = `${context.endpoint}:${context.method}:${(error.message || '').slice(0, 100)}`;
  if (!shouldSend(key)) return;

  const resend = new Resend(apiKey);
  const timestamp = new Date().toISOString();
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown';

  resend.emails.send({
    from: 'LandLibrary Alerts <hi@landlibrary.co>',
    to: alertEmail,
    subject: `[LandLibrary] Error: ${context.method} ${context.endpoint}`.slice(0, 78),
    html: `
      <h2 style="color:#c0392b;margin:0 0 16px">API Error Alert</h2>
      <table style="border-collapse:collapse;font-family:monospace;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Endpoint</td><td>${context.method} ${context.endpoint}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Action</td><td>${context.action}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Environment</td><td>${env}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Timestamp</td><td>${timestamp}</td></tr>
      </table>
      <h3 style="margin:20px 0 8px">Error Message</h3>
      <pre style="background:#f8f8f8;padding:12px;border-radius:4px;overflow-x:auto">${error.message || 'No message'}</pre>
      <h3 style="margin:20px 0 8px">Stack Trace</h3>
      <pre style="background:#f8f8f8;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px">${error.stack || 'No stack trace'}</pre>
      ${context.body ? `<h3 style="margin:20px 0 8px">Request Body (sanitized)</h3><pre style="background:#f8f8f8;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px">${sanitizeBody(context.body)}</pre>` : ''}
    `,
  }).catch((sendErr) => {
    console.error('Failed to send error alert email:', sendErr);
  });
}
