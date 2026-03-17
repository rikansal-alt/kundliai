import { db } from "@/lib/mongodb";

export async function setupIndexes() {
  const database = await db();

  await database
    .collection("ratelimits")
    .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });

  await database.collection("ratelimits").createIndex({ key: 1 });

  console.log("MongoDB indexes created");
}
