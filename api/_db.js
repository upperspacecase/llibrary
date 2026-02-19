import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI environment variable is not set');

let cached = global.__mongoClientPromise;
if (!cached) {
  const client = new MongoClient(uri);
  cached = global.__mongoClientPromise = client.connect();
}

export async function getDb() {
  const client = await cached;
  return client.db('llibrary');
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}
