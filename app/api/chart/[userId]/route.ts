import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";

/**
 * GET /api/chart/[userId]
 * Returns the most recent chart document for this user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB();

    const { userId } = await params;

    const chart = await Chart.findOne({ userId }).sort({ createdAt: -1 }).lean();

    if (!chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, chart });
  } catch (err) {
    console.error("chart/[userId] error:", err);
    return NextResponse.json({ error: "Failed to fetch chart" }, { status: 500 });
  }
}
