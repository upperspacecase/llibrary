/**
 * Preview the Handlebars report template with mock or real data.
 *
 * Usage:
 *   node scripts/preview-template.js                  # uses mock data
 *   node scripts/preview-template.js --from-db [id]   # uses real data from MongoDB
 *   node scripts/preview-template.js --output out.html # write to file instead of stdout
 */

import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { prepareTemplateData } from '../src/lib/report-template-data.js';
import { renderReport } from '../src/templates/report-template-engine.js';

const args = process.argv.slice(2);
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
const fromDb = args.includes('--from-db');
const submissionId = fromDb ? args[args.indexOf('--from-db') + 1] : null;

async function main() {
  let reportData;

  if (fromDb) {
    // Load real data from MongoDB
    const { MongoClient } = await import('mongodb');
    // Load env vars from .env.local
    const { readFileSync: readFs } = await import('fs');
    try {
      const envContent = readFs('.env.local', 'utf8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* ignore */ }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('llibrary');

    let query = {};
    if (submissionId) {
      const { ObjectId } = await import('mongodb');
      query = { submission_id: submissionId.length === 24 ? new ObjectId(submissionId) : submissionId };
    }

    const cached = await db.collection('report_versions')
      .findOne(query, { sort: { created: -1 } });

    if (!cached?.data_snapshot) {
      console.error('No cached report data found. Generate a report first.');
      process.exit(1);
    }

    reportData = cached.data_snapshot;
    await client.close();
    console.error(`Loaded data snapshot for "${cached.name}" (${cached.version})`);
  } else {
    // Use mock data
    try {
      const mockPath = new URL('../src/templates/__fixtures__/mock-report-data.json', import.meta.url);
      reportData = JSON.parse(readFileSync(mockPath, 'utf8'));
      console.error('Using mock data');
    } catch {
      console.error('No mock data found. Use --from-db to load real data, or create src/templates/__fixtures__/mock-report-data.json');
      process.exit(1);
    }
  }

  const templateData = prepareTemplateData(reportData);
  const html = renderReport(templateData);

  if (outputFile) {
    writeFileSync(outputFile, html);
    console.error(`Written to ${outputFile}`);
  } else {
    process.stdout.write(html);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
