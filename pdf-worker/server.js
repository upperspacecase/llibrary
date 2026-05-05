import http from 'node:http';
import puppeteer from 'puppeteer';

const PORT = process.env.PORT || 8080;
const RENDER_TOKEN = process.env.RENDER_TOKEN;
if (!RENDER_TOKEN) throw new Error('RENDER_TOKEN env var is required');

const NAV_TIMEOUT_MS = 90_000;
const RENDER_TIMEOUT_MS = 120_000;

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    }).catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function renderPdf(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: NAV_TIMEOUT_MS });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const imgs = Array.from(document.images);
      await Promise.all(imgs.map((img) => img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); })));
    });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await page.close().catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(404);
    return res.end();
  }

  if (req.headers.authorization !== `Bearer ${RENDER_TOKEN}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  const timer = setTimeout(() => {
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Render timeout' }));
    res.destroy();
  }, RENDER_TIMEOUT_MS);

  try {
    const body = await readJsonBody(req);
    if (!body.url || typeof body.url !== 'string') {
      clearTimeout(timer);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'url is required' }));
    }
    const pdf = await renderPdf(body.url);
    clearTimeout(timer);
    if (res.headersSent) return;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  } catch (err) {
    clearTimeout(timer);
    console.error('render error:', err);
    if (res.headersSent) return;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Render failed', detail: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`pdf-worker listening on :${PORT}`);
});

const shutdown = async () => {
  server.close();
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b) await b.close().catch(() => {});
  }
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
