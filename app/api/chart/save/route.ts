import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";

/**
 * POST /api/chart/save
 * - No chartId → always creates a new chart document (supports multiple charts per user)
 * - With chartId → updates that specific chart in-place (re-generate from same birth details)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId, chartId, birthDetails, chartData } = await req.json();

    if (!userId || !birthDetails) {
      return NextResponse.json({ error: "userId and birthDetails are required" }, { status: 400 });
    }

    let chart;

    if (chartId) {
      const { Types } = await import("mongoose");
      chart = await Chart.findOneAndUpdate(
        { _id: new Types.ObjectId(chartId), userId },
        { $set: { birthDetails, ...(chartData ? { chartData } : {}) } },
        { new: true }
      );
    }

    if (!chart) {
      // No chartId, or chartId didn't match — create fresh
      chart = await Chart.create({ userId, birthDetails, chartData: chartData ?? {} });
    }

    return NextResponse.json({ success: true, chartId: chart._id.toString() });
  } catch (err) {
    console.error("chart/save error:", err);
    return NextResponse.json({ error: "Failed to save chart" }, { status: 500 });
  }
}
