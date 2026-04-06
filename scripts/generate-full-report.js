/**
 * Generate a Full 18-Section LandBook report for the most recent submission.
 *
 * Calls POST /api/reports/generate-full on the local vercel dev server.
 * Fetches all existing APIs + 13 new Tier 1 APIs (solar, wind, watershed,
 * isochrone, climate projections, land price, population, deforestation,
 * land cover epochs, biodiversity trends, GBIF trends).
 *
 * Synthetic data is red-highlighted with source notes for audit.
 *
 * Usage:
 *   node scripts/generate-full-report.js                    # most recent submission
 *   node scripts/generate-full-report.js <submission_id>    # specific submission
 *   node scripts/generate-full-report.js --force            # force re-fetch all APIs
 *
 * Requires: vercel dev running (default port 3003, override with PORT env var)
 */

const PORT = process.env.PORT || 3003;
const BASE = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const force = args.includes('--force');
const submissionId = args.find(a => a !== '--force');

async function main() {
  console.log('\n--- LandBook Full Report Generator (18 Sections) ---\n');
  console.log(`Target: ${BASE}/api/reports/generate-full`);

  try {
    await fetch(`${BASE}/api/reports`);
  } catch {
    console.error(`\nServer not reachable at ${BASE}`);
    console.error('Start it with: vercel dev\n');
    process.exit(1);
  }

  const body = {};
  if (submissionId) body.submission_id = submissionId;
  if (force) body.force_refresh = true;

  console.log(`Submission: ${submissionId || '(most recent)'}`);
  console.log(`Force refresh: ${force}`);
  console.log('\nGenerating full report (33 API calls, may take 60-120s)...\n');

  const res = await fetch(`${BASE}/api/reports/generate-full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.error('Generation failed:', err);
    process.exit(1);
  }

  const result = await res.json();

  console.log('Full report generated successfully!\n');
  console.log(`  Version:       ${result.version}`);
  console.log(`  Name:          ${result.name}`);
  console.log(`  Slug:          ${result.slug}`);
  console.log(`  APIs called:   ${result.apis_called}`);
  console.log(`  APIs OK:       ${result.apis_succeeded}`);
  console.log(`  APIs failed:   ${result.apis_failed}`);
  console.log(`  Created:       ${result.created}`);

  if (result.blob_url) {
    console.log(`\n  Blob URL:      ${result.blob_url}`);
  }

  console.log(`\n  Local URL:     ${BASE}/report/${result.slug}`);
  console.log(`  Production:    https://llibrary-eight.vercel.app/report/${result.slug}`);

  if (result.apiStatus) {
    console.log('\n  API Status:');
    for (const [api, status] of Object.entries(result.apiStatus)) {
      const icon = status === 'OK' ? '  OK' : 'FAIL';
      console.log(`    ${icon}  ${api}: ${status}`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
