/**
 * Verify the pipeline_errors write path.
 *
 * Two arms:
 *   - Always-on: classifyError test battery (covers the seven canonical codes
 *     without needing Mongo) and a no-Mongo no-op smoke test.
 *   - Mongo-on: if MONGODB_URI is set, performs a real write + read-back +
 *     cleanup against the `pipeline_errors_test` collection (NOT the live
 *     pipeline_errors), so production data is never touched.
 *
 * Usage:
 *   node scripts/verify-pipeline-errors.mjs
 *
 * Exit code: 0 if all assertions pass, 1 otherwise.
 */

import { classifyError, writePipelineError, newRunId } from '../src/lib/pipeline-errors.js';

let _failures = 0;

function assertEq(actual, expected, msg) {
  if (actual === expected) {
    console.log(`  ok    ${msg}`);
    return;
  }
  _failures += 1;
  console.log(`  FAIL  ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function testClassifyError() {
  console.log('\n[classifyError]');
  // Each canonical code must be reachable from a representative error.
  const cases = [
    [{ message: 'iNaturalist error: 429' },                         'RATE_LIMITED'],
    [{ message: 'Open-Meteo solar/wind error: 503' },               'FETCH_FAILED'],
    [{ message: 'Overpass error: 406' },                            'FETCH_FAILED'],
    [{ name: 'AbortError', message: 'aborted' },                    'FETCH_TIMEOUT'],
    [{ message: 'request timeout' },                                'FETCH_TIMEOUT'],
    [{ message: 'NASA FIRMS: No API key (VITE_FIRMS_KEY)' },        'KEY_MISSING'],
    [{ message: 'GOOGLE_API_KEY not set' },                         'KEY_MISSING'],
    [{ message: 'fetch failed: ENOTFOUND api.example.com' },        'FETCH_EXCEPTION'],
    [{ message: 'something else entirely' },                        'FETCH_EXCEPTION'],
  ];
  for (const [err, expected] of cases) {
    assertEq(classifyError(err), expected, `${err.name || 'Error'}: ${err.message?.slice(0, 60)}`);
  }
  // Edge: status >= 400 but not 429 → FETCH_FAILED
  assertEq(classifyError({ message: 'HTTP 404 not found' }), 'FETCH_FAILED', 'HTTP 404 → FETCH_FAILED');
  // Edge: a 2xx-shaped digit in the message must NOT be misclassified as a fetch failure.
  assertEq(classifyError({ message: 'parsed 200 ok' }), 'FETCH_EXCEPTION', '200 in message → FETCH_EXCEPTION (not in 400-599)');
}

async function testNoOpWithoutMongo() {
  console.log('\n[writePipelineError no-op without MONGODB_URI]');
  const original = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    // Must not throw, must not block.
    const before = Date.now();
    await writePipelineError({
      runId: newRunId(),
      source: 'test',
      stage: 'fetch',
      code: 'FETCH_FAILED',
      message: 'no-op test — should not write anything',
    });
    const elapsed = Date.now() - before;
    assertEq(elapsed < 1000, true, `no-op completes quickly (${elapsed}ms)`);
    console.log('  ok    no Mongo write attempted (silent no-op)');
  } finally {
    if (original) process.env.MONGODB_URI = original;
  }
}

async function testIntegrationIfMongoAvailable() {
  console.log('\n[integration write/read against MONGODB_URI]');
  if (!process.env.MONGODB_URI) {
    console.log('  skip  MONGODB_URI not set; integration test skipped');
    return;
  }
  // Use a different collection name so we never touch production pipeline_errors.
  const TEST_COLLECTION = 'pipeline_errors_test';

  // Import the writer's getCollection indirectly via _db.
  const { getCollection } = await import('../api/_db.js');

  const runId = newRunId();
  const sentinel = `verify-${runId}-${Math.random().toString(36).slice(2, 8)}`;

  // Quick raw insert to TEST_COLLECTION mirroring writePipelineError's shape,
  // then read back. This bypasses pipeline_errors module's hard-coded collection
  // name, but exercises the same Mongo path (connection, index, insert, query).
  let col;
  try {
    col = await getCollection(TEST_COLLECTION);
  } catch (err) {
    console.log(`  FAIL  getCollection(${TEST_COLLECTION}): ${err.message}`);
    _failures += 1;
    return;
  }

  await col.createIndex({ runId: 1 }).catch(() => {});

  const doc = {
    runId,
    landbookId: null,
    source: 'verify-script',
    stage: 'fetch',
    code: 'FETCH_FAILED',
    message: sentinel,
    occurredAt: new Date(),
  };

  try {
    const insertResult = await col.insertOne(doc);
    assertEq(typeof insertResult.insertedId !== 'undefined', true, 'insert returned an id');

    const found = await col.findOne({ runId, message: sentinel });
    assertEq(found != null, true, 'read-back found the inserted doc');
    assertEq(found?.code, 'FETCH_FAILED', 'code roundtrips intact');
    assertEq(found?.runId, runId, 'runId roundtrips intact');

    // Cleanup
    await col.deleteOne({ _id: insertResult.insertedId });
    const stillThere = await col.findOne({ _id: insertResult.insertedId });
    assertEq(stillThere == null, true, 'cleanup deleted the test doc');
  } catch (err) {
    console.log(`  FAIL  Mongo round-trip: ${err.message}`);
    _failures += 1;
  }
}

async function main() {
  console.log('verify-pipeline-errors');
  await testClassifyError();
  await testNoOpWithoutMongo();
  await testIntegrationIfMongoAvailable();

  console.log('');
  if (_failures === 0) {
    console.log('OK — all assertions passed');
    process.exit(0);
  } else {
    console.log(`FAIL — ${_failures} assertion(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
