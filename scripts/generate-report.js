/**
 * Generate a LandBook report for the most recent submission (or a specific one).
 *
 * Calls POST /api/reports/generate on the local vercel dev server.
 * The endpoint fetches all APIs, builds HTML, uploads to Vercel Blob,
 * and saves metadata to MongoDB.
 *
 * Usage:
 *   node scripts/generate-report.js                    # most recent submission
 *   node scripts/generate-report.js <submission_id>    # specific submission
 *   node scripts/generate-report.js --force            # force re-fetch all APIs
 *
 * Requires: vercel dev running (default port 3000, override with PORT env var)
 */

const PORT = process.env.PORT || 3003;
const BASE = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const force = args.includes('--force');
const submissionId = args.find(a => a !== '--force');

async function main() {
  console.log('\n--- LandBook Report Generator ---\n');
  console.log(`Target: ${BASE}/api/reports/generate`);

  // Check if server is running
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
  console.log('\nGenerating report (this may take 30-60s for fresh API calls)...\n');

  const res = await fetch(`${BASE}/api/reports/generate`, {
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

  console.log('Report generated successfully!\n');
  console.log(`  Version:    ${result.version}`);
  console.log(`  Name:       ${result.name}`);
  console.log(`  Slug:       ${result.slug}`);
  console.log(`  APIs called: ${result.apis_called}`);
  console.log(`  Created:    ${result.created}`);

  if (result.blob_url) {
    console.log(`\n  Blob URL:   ${result.blob_url}`);
  }

  console.log(`\n  Report URL: ${BASE}/report/${result.slug}`);
  console.log(`  Production: https://llibrary-eight.vercel.app/report/${result.slug}`);

  if (result.note) {
    console.log(`\n  Note: ${result.note}`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
