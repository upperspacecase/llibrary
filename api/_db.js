import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI environment variable is not set');

// Tuned for Vercel serverless on Atlas M0 (free tier, 500 connection cap).
// - Tiny pool: every warm function instance opens its own MongoClient, so
//   the cap is (instances × pool). Keeping pool small means many instances
//   can coexist before we exhaust the 500. maxPoolSize: 3 lets a single
//   instance serve ~3 parallel reads without serializing.
// - maxIdleTimeMS forces unused sockets closed after 30 s so cold-going
//   instances stop holding the slot for the full Vercel warm window.
// - waitQueueTimeoutMS prevents a single slow query from blocking the pool
//   indefinitely.
const OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  maxPoolSize: 3,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 5000,
};

function createConnection() {
  const client = new MongoClient(uri, OPTIONS);
  const promise = client.connect().catch((err) => {
    // Drop the rejected promise so the next call retries with a fresh client.
    global.__mongoClientPromise = null;
    throw err;
  });
  global.__mongoClientPromise = promise;
  return promise;
}

// Lazy: connect only when getDb is actually called. Previously we connected
// at module load, which meant every function instance held a socket even
// when its route never touched Mongo.
export async function getDb() {
  const client = await (global.__mongoClientPromise || createConnection());
  return client.db('llibrary');
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
