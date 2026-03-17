import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";
import { Types } from "mongoose";
import { safeLog } from "@/lib/logger";
import { sanitizeString } from "@/lib/sanitizeMongo";

/**
 * DELETE /api/chart/delete
 * Body: { chartId, userId }
 * Deletes a specific chart — userId is required to prevent deleting other users' charts.
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const chartId = sanitizeString(body.chartId, 30);
    const userId = sanitizeString(body.userId, 100);
    if (!chartId || !userId) {
      return NextResponse.json({ error: "chartId and userId required" }, { status: 400 });
    }

    await connectDB();

    const result = await Chart.deleteOne({
      _id: new Types.ObjectId(chartId),
      userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Chart not found or not yours" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    safeLog("error", "chart/delete error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to delete chart" }, { status: 500 });
  }
}
