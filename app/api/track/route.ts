import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, metadata } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const mongo = await db();
    await mongo.collection("events").insertOne({
      userId,
      action,
      metadata: metadata ?? {},
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "tracking failed" }, { status: 500 });
  }
}
