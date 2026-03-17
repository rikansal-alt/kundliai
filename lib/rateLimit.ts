import { db } from "@/lib/mongodb";

interface RateLimitConfig {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitConfig): Promise<RateLimitResult> {
  const collection = (await db()).collection("ratelimits");

  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  const record = await collection.findOneAndUpdate(
    {
      key,
      resetAt: { $gt: now },
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt, createdAt: now },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  const count = (record?.count as number) ?? 1;
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const recordResetAt = record?.resetAt as Date | undefined;
  const retryAfter =
    allowed || !recordResetAt
      ? undefined
      : Math.ceil((recordResetAt.getTime() - now.getTime()) / 1000);

  return { allowed, remaining, retryAfter };
}
