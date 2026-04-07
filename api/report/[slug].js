import { getCollection } from '../_db.js';
import { head } from '@vercel/blob';

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    const reports = await getCollection('report_versions');
    let doc = await reports.findOne({ slug });

    if (!doc) {
      const shared = await getCollection('shared_reports');
      doc = await shared.findOne({ slug });
    }

    if (!doc) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not Found</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet"></head><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F8F6F2;color:#1a1a1a;"><div style="text-align:center;"><h1 style="font-size:24px;font-weight:600;">Report not found</h1><p style="color:#6b7280;margin-top:8px;">The report "${slug}" does not exist.</p></div></body></html>`);
    }

    // Try Vercel Blob first
    if (doc.blob_url) {
      try {
        const blobMeta = await head(doc.blob_url);
        const downloadUrl = blobMeta.downloadUrl || doc.blob_url;
        const blobRes = await fetch(downloadUrl);
        if (blobRes.ok) {
          const html = await blobRes.text();
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
          return res.status(200).send(html);
        }
      } catch (blobErr) {
        console.error('Blob fetch failed, falling back to DB:', blobErr.message);
      }
    }

    // Serve html_content from DB
    if (doc.html_content) {
      // New reports store complete self-contained HTML documents
      const isFullDoc = doc.html_content.trimStart().startsWith('<!DOCTYPE') || doc.html_content.trimStart().startsWith('<html');
      if (isFullDoc) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.status(200).send(doc.html_content);
      }

      // Legacy reports: html_content is a fragment that needs wrapping
      const html = wrapLegacy(doc.html_content, doc.version);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(404).send('Report content not available');
  } catch (err) {
    console.error('Report page error:', err);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send('Server error');
  }
}

/** Wraps legacy html_content fragments in the old CSS shell */
function wrapLegacy(content, version) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LandBook Report — ${version}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root{--green:#1B4332;--green-light:#2D6A4F;--green-pale:#D8F3DC;--terra:#BC6C25;--terra-light:#DDA15E;--sky:#90E0EF;--sky-dark:#0077B6;--amber:#F4A261;--red:#E76F51;--bg:#F8F6F2;--white:#FFFFFF;--text:#1a1a1a;--text-muted:#6b7280;--border:#e5e2db;--font:'Inter',-apple-system,sans-serif}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:var(--font);background:#e5e2db;color:var(--text);-webkit-font-smoothing:antialiased}
    #report-container{max-width:850px;margin:24px auto;padding:0 16px}
    .report-page{background:var(--white);border-radius:4px;box-shadow:0 1px 8px rgba(0,0,0,0.08);margin-bottom:24px;padding:56px 56px 48px;page-break-after:always}
    .section-title{font-size:26px;font-weight:800;color:var(--green);margin-bottom:8px}
    @media print{body{background:white}#report-container{max-width:none;margin:0;padding:0}.report-page{box-shadow:none;margin-bottom:0}}
  </style>
</head>
<body>
  <div id="report-container">${content}</div>
</body>
</html>`;
}
