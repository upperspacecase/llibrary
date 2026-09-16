/**
 * Load .env.local into process.env. Import this first: ES module imports are
 * hoisted, so env loading inline in a script runs after api/_db.js has already
 * read MONGODB_URI.
 */
import { readFileSync } from 'fs';

const lines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n');
for (const line of lines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
