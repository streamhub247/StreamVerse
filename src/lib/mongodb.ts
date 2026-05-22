import { MongoClient } from "mongodb";

const uri = process.env.MONGO_DB;

let clientPromise: Promise<MongoClient> | null = null;

export async function getDatabase() {
  if (!uri) {
    throw new Error("MONGO_DB is not configured");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db();
}
