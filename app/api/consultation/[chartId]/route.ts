import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Consultation from "@/lib/models/Consultation";
import { Types } from "mongoose";
import { safeLog } from "@/lib/logger";

/**
 * GET /api/consultation/[chartId]
 * Returns consultations for a chart from the last 30 days,
 * most recent first, limited to 20 sessions.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    await connectDB();

    const { chartId } = await params;

    if (!Types.ObjectId.isValid(chartId)) {
      return NextResponse.json({ error: "Invalid chartId" }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const consultations = await Consultation.find({
      chartId: new Types.ObjectId(chartId),
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, consultations });
  } catch (err) {
    safeLog("error", "consultation/[chartId] error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to fetch consultations" }, { status: 500 });
  }
}
