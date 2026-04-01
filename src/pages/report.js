/* ───────────────────────────────────────────────────────
   LandBook Report — Public shared view
   ─────────────────────────────────────────────────────── */

const style = document.createElement('style');
style.textContent = `
  :root {
    --green: #1B4332; --green-light: #2D6A4F; --green-pale: #D8F3DC;
    --terra: #BC6C25; --terra-light: #DDA15E; --sky: #90E0EF; --sky-dark: #0077B6;
    --amber: #F4A261; --red: #E76F51; --bg: #F8F6F2; --white: #FFFFFF;
    --text: #1a1a1a; --text-muted: #6b7280; --border: #e5e2db;
    --font: 'Inter', -apple-system, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font); background: #e5e2db; color: var(--text); -webkit-font-smoothing: antialiased; }
  #report-container { max-width: 850px; margin: 24px auto; padding: 0 16px; }
  .report-page { background: var(--white); border-radius: 4px; box-shadow: 0 1px 8px rgba(0,0,0,0.08); margin-bottom: 24px; padding: 56px 56px 48px; page-break-after: always; }
  .section-number { font-size: 11px; font-weight: 700; color: var(--terra); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
  .section-title { font-size: 26px; font-weight: 800; color: var(--green); margin-bottom: 8px; line-height: 1.2; }
  .section-subtitle { font-size: 14px; color: var(--text-muted); margin-bottom: 32px; }
  h3 { font-size: 15px; font-weight: 700; color: var(--green); margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--green-pale); }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
  .data-table th { text-align: left; font-weight: 600; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 2px solid var(--border); }
  .data-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table .label { color: var(--text-muted); font-weight: 500; }
  .data-table .value { font-weight: 600; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
  .kpi-card { background: var(--bg); border-radius: 10px; padding: 20px 16px; text-align: center; border: 1px solid var(--border); }
  .kpi-value { font-size: 28px; font-weight: 800; color: var(--green); line-height: 1; }
  .kpi-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.5px; margin-top: 8px; }
  .kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .card { background: var(--bg); border-radius: 8px; padding: 16px; border: 1px solid var(--border); text-align: center; }
  .card-icon { font-size: 24px; margin-bottom: 6px; }
  .card-title { font-size: 12px; font-weight: 700; color: var(--green); }
  .risk-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .risk-row:last-child { border-bottom: none; }
  .risk-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
  .risk-dot.low { background: #22c55e; } .risk-dot.moderate { background: var(--amber); } .risk-dot.high { background: var(--red); }
  .risk-label { font-size: 13px; font-weight: 600; flex: 1; }
  .risk-value { font-size: 13px; color: var(--text-muted); }
  .chart-container { margin: 20px 0; text-align: center; }
  .chart-container svg { max-width: 100%; }
  .bar-row { display: flex; align-items: center; gap: 12px; margin: 6px 0; }
  .bar-label { width: 140px; font-size: 12px; font-weight: 500; text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; height: 24px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding: 0 8px; font-size: 11px; font-weight: 600; color: white; }
  .bar-fill.green { background: var(--green); } .bar-fill.terra { background: var(--terra); } .bar-fill.sky { background: var(--sky-dark); } .bar-fill.amber { background: var(--amber); } .bar-fill.red { background: var(--red); }
  .checklist { list-style: none; }
  .checklist li { padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; display: flex; align-items: flex-start; gap: 8px; }
  .checklist li:last-child { border-bottom: none; }
  .check-box { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 3px; flex-shrink: 0; margin-top: 1px; }
  .cover-page { background: #F8F6F2; color: #1a1a1a; text-align: center; padding: 0; min-height: 900px; display: flex; flex-direction: column; background-image: url('/landbook-cover-bg.png'); background-size: cover; background-position: center; }
  .cover-top { padding: 60px 56px 0; }
  .cover-tagline { font-size: 14px; color: #999; font-weight: 400; letter-spacing: 0.5px; }
  .cover-middle { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px 56px; }
  .cover-coords { font-size: 18px; color: #888; font-weight: 400; letter-spacing: 2px; margin-bottom: 12px; }
  .cover-property { font-size: 42px; font-weight: 400; margin-bottom: 12px; line-height: 1.1; color: #1a1a1a; letter-spacing: 1px; }
  .cover-address { font-size: 15px; color: #888; font-weight: 400; line-height: 1.6; }
  .cover-bottom { padding: 0 56px 24px; text-align: center; }
  .cover-produced { font-size: 13px; color: #999; margin-bottom: 4px; }
  .cover-meta { font-size: 12px; color: #aaa; letter-spacing: 1px; padding-bottom: 20px; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
  .cover-disclaimer { font-size: 11px; color: #aaa; line-height: 1.5; max-width: 500px; margin: 0 auto; }
  .cover-disclaimer strong { color: #888; }
  .season-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
  .season-card { background: var(--bg); border-radius: 8px; padding: 14px; font-size: 12px; border: 1px solid var(--border); }
  .season-card .period { font-weight: 700; color: var(--green); margin-bottom: 4px; }
  .season-card .risk-tag { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; margin: 4px 0; }
  .season-card .risk-tag.moderate { background: #fef3c7; color: #92400e; }
  .season-card .risk-tag.high { background: #fee2e2; color: #991b1b; }
  .season-card .risk-tag.low { background: #dcfce7; color: #166534; }
  .score-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
  .score-label { width: 120px; font-size: 12px; font-weight: 600; }
  .score-track { flex: 1; height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; }
  .score-fill { height: 100%; border-radius: 5px; background: var(--green); }
  .score-value { width: 50px; font-size: 13px; font-weight: 700; color: var(--green); text-align: right; }
  .map-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0; }
  .map-grid .map-item { text-align: center; }
  .map-grid .map-item .map-placeholder { height: 160px; background: var(--bg); border: 2px dashed var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px; }
  .map-grid .map-item img { width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border); }
  .map-grid .map-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 6px; }
  .source-tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; background: var(--green-pale); color: var(--green); margin: 2px 4px 2px 0; }
  .disclaimer { background: var(--bg); border-radius: 8px; padding: 20px; font-size: 11px; color: var(--text-muted); line-height: 1.6; border-left: 3px solid var(--amber); }
  .loading { text-align: center; padding: 120px 20px; color: #999; font-size: 16px; }
  .error { text-align: center; padding: 120px 20px; color: var(--red); font-size: 16px; }
  @media print {
    body { background: white; }
    #report-container { max-width: none; margin: 0; padding: 0; }
    .report-page { box-shadow: none; border-radius: 0; margin-bottom: 0; }
    .cover-page { min-height: 100vh; }
  }
`;
document.head.appendChild(style);

const container = document.getElementById('report-container');

// Get slug from URL path: /report/my-slug
const pathParts = window.location.pathname.split('/');
const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

if (!slug || slug === 'report') {
  container.innerHTML = '<div class="error">No report specified.</div>';
} else {
  container.innerHTML = '<div class="loading">Loading report...</div>';
  fetch(`/api/reports/shared/${slug}`)
    .then(res => {
      if (!res.ok) throw new Error('Report not found');
      return res.json();
    })
    .then(doc => {
      container.innerHTML = doc.html_content;
      document.title = `LandBook Report — ${slug}`;
    })
    .catch(() => {
      container.innerHTML = '<div class="error">Report not found.</div>';
    });
}
