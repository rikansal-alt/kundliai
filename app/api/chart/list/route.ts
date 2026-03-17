import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";

/**
 * GET /api/chart/list?userId=xxx
 * Returns all charts for a user, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
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
    console.error("chart/list error:", err);
    return NextResponse.json({ error: "Failed to list charts" }, { status: 500 });
  }
}
