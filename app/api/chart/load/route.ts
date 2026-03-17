import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";
import { safeLog } from "@/lib/logger";
import { escapeRegex, sanitizeString } from "@/lib/sanitizeMongo";

/**
 * GET /api/chart/load?userId=googleId&name=DisplayName
 *
 * 1. Try exact match on userId (googleId)
 * 2. If not found, fall back to matching by birthDetails.name (for old name_dob format charts)
 *    and migrate that chart's userId to the googleId so future lookups are fast
 */
export async function GET(req: NextRequest) {
  try {
    const userId = sanitizeString(req.nextUrl.searchParams.get("userId"), 100);
    const name   = sanitizeString(req.nextUrl.searchParams.get("name"), 50);

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    await connectDB();

    // 1. Try by googleId first
    let chart = await Chart.findOne({ userId }).sort({ createdAt: -1 }).lean();

    // 2. Fall back: find old-format chart by display name, then migrate it
    if (!chart && name) {
      // Case-insensitive match on the stored name
      const firstName = escapeRegex(name.split(" ")[0]);
      chart = await Chart.findOneAndUpdate(
        {
          userId:              { $not: /^\d{15,}$/ }, // exclude existing googleId-format docs
          "birthDetails.name": { $regex: new RegExp(`^${firstName}`, "i") },
        },
        { $set: { userId } },                         // migrate to googleId
        { new: true, sort: { createdAt: -1 } }
      ).lean();
    }

    if (!chart) {
      return NextResponse.json({ chart: null }, { status: 404 });
    }

    return NextResponse.json({
      chartId: (chart as { _id: { toString(): string } })._id.toString(),
      chart,
    });
  } catch (err) {
    safeLog("error", "Chart load error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to load chart" }, { status: 500 });
  }
}
