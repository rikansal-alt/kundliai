import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Compatibility from "@/lib/models/Compatibility";
import { Types } from "mongoose";
import { safeLog } from "@/lib/logger";
import { sanitizeString } from "@/lib/sanitizeMongo";

/**
 * POST /api/compatibility/save
 * Upserts the most recent compatibility result for a user.
 * Body: { userId, chartId?, partner, partnerMoonSign, gunMilan }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const userId = sanitizeString(body.userId, 100);
    const { chartId, partner, partnerMoonSign, gunMilan } = body;

    if (!userId || !partner || !gunMilan) {
      return NextResponse.json(
        { error: "userId, partner, and gunMilan are required" },
        { status: 400 }
      );
    }

    const doc = await Compatibility.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          ...(chartId && Types.ObjectId.isValid(chartId) ? { chartId: new Types.ObjectId(chartId) } : {}),
          partner,
          partnerMoonSign: partnerMoonSign ?? "",
          gunMilan,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, compatibilityId: doc._id.toString() });
  } catch (err) {
    safeLog("error", "compatibility/save error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to save compatibility" }, { status: 500 });
  }
}
