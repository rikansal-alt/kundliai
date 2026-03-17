import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";
import { safeLog } from "@/lib/logger";
import { sanitizeString } from "@/lib/sanitizeMongo";

/**
 * GET /api/chart/list?userId=xxx
 * Returns all charts for a user, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = sanitizeString(req.nextUrl.searchParams.get("userId"), 100);
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    await connectDB();

    const charts = await Chart.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id birthDetails chartData.moonSign chartData.ascendant chartData.sunSign chartData.raw createdAt")
      .lean();

    return NextResponse.json({ charts });
  } catch (err) {
    safeLog("error", "chart/list error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to list charts" }, { status: 500 });
  }
}
