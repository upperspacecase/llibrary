import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI environment variable is not set");

const OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  maxPoolSize: 1,
};

const globalForMongo = globalThis as unknown as {
  __mongoClientPromise: Promise<MongoClient> | null;
};

function createConnection(): Promise<MongoClient> {
  const client = new MongoClient(uri!, OPTIONS);
  const promise = client.connect().catch((err) => {
    globalForMongo.__mongoClientPromise = null;
    throw err;
  });
  globalForMongo.__mongoClientPromise = promise;
  return promise;
}

if (!globalForMongo.__mongoClientPromise) {
  createConnection();
}

export async function getDb(): Promise<Db> {
  if (!globalForMongo.__mongoClientPromise) createConnection();
  const client = await globalForMongo.__mongoClientPromise!;
  return client.db("llibrary");
}

export async function getCollection<T extends Document = Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}
