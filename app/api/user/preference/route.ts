import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User, { ChartStyle } from "@/lib/models/User";

const VALID_STYLES: ChartStyle[] = ["south-indian", "north-indian", "bengali"];

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, chartStyle } = body as { userId?: string; chartStyle?: string };

    if (!chartStyle || !VALID_STYLES.includes(chartStyle as ChartStyle)) {
      return NextResponse.json(
        { error: `chartStyle must be one of: ${VALID_STYLES.join(", ")}` },
        { status: 400 }
      );
    }

    // If no userId supplied we accept the save silently (guest / not yet authed)
    if (!userId) {
      return NextResponse.json({ success: true, saved: false, reason: "no userId" });
    }

    await connectDB();

    const updated = await User.findByIdAndUpdate(
      userId,
      { chartStyle },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, chartStyle: (updated as { chartStyle: string }).chartStyle });
  } catch (err) {
    console.error("preference route error:", err);
    return NextResponse.json(
      { error: "Failed to save preference", detail: String(err) },
      { status: 500 }
    );
  }
}
