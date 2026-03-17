import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "jyotish";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

// Cache the client on globalThis so hot-reloads in dev don't
// create a new connection on every request.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._mongoClient) {
    globalThis._mongoClient = new MongoClient(MONGODB_URI).connect();
  }
  clientPromise = globalThis._mongoClient;
} else {
  clientPromise = new MongoClient(MONGODB_URI).connect();
}

export default clientPromise;

/** Returns the jyotish database instance */
export async function db(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DB);
}
