import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, metadata } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    // Vercel provides geo headers automatically at the edge
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const country = req.headers.get("x-vercel-ip-country") ?? "unknown";
    const city = req.headers.get("x-vercel-ip-city") ?? "unknown";
    const region = req.headers.get("x-vercel-ip-country-region") ?? "unknown";

    const mongo = await db();
    await mongo.collection("events").insertOne({
      userId,
      action,
      metadata: metadata ?? {},
      ip,
      geo: { country, region, city },
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "tracking failed" }, { status: 500 });
  }
}
