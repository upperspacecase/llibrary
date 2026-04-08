import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI environment variable is not set');

const OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  maxPoolSize: 1,
};

let cached = global.__mongoClientPromise;

function createConnection() {
  const client = new MongoClient(uri, OPTIONS);
  const promise = client.connect().catch((err) => {
    // Clear cache so next invocation retries instead of reusing rejected promise
    global.__mongoClientPromise = null;
    cached = null;
    throw err;
  });
  global.__mongoClientPromise = promise;
  cached = promise;
  return promise;
}

if (!cached) {
  createConnection();
}

export async function getDb() {
  if (!cached) createConnection();
  const client = await cached;
  return client.db('llibrary');
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
