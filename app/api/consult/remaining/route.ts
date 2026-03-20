import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const authCookie = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
    const isAuthenticated = !!authCookie;
    const limit = isAuthenticated ? 25 : 10;

    // In development, unlimited
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ used: 0, limit: 999, remaining: 999 });
    }

    const collection = (await db()).collection("ratelimits");
    const key = `consult:ip:${ip}`;
    const now = new Date();

    const record = await collection.findOne({ key, resetAt: { $gt: now } });
    const used = (record?.count as number) ?? 0;

    return NextResponse.json({
      used,
      limit,
      remaining: Math.max(0, limit - used),
    });
  } catch {
    return NextResponse.json({ used: 0, limit: 5, remaining: 5 });
  }
}
