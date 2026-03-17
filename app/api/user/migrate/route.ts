import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Chart from "@/lib/models/Chart";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { googleId, guestId, birthDetails, chartData, consultMessages } = body;

    if (!googleId || !birthDetails || !chartData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // Upsert chart under googleId — if the user already has a chart, keep it
    const existing = await Chart.findOne({ userId: googleId });
    if (existing) {
      // Already has a chart — skip migration, return existing chartId
      return NextResponse.json({ chartId: existing._id.toString(), migrated: false });
    }

    // Also check if there's a chart saved under guestId (shouldn't happen, but guard)
    const guestChart = guestId ? await Chart.findOne({ userId: guestId }) : null;

    const chart = await Chart.findOneAndUpdate(
      { userId: googleId },
      {
        $setOnInsert: {
          userId: googleId,
          birthDetails,
          chartData: {
            ascendant: chartData.ascendant ?? "",
            moonSign:  chartData.moonSign  ?? "",
            sunSign:   chartData.sunSign   ?? "",
            planets:   chartData.planets   ?? {},
            mahadasha: chartData.mahadasha ?? { planet: "", startYear: 0, endYear: 0 },
            themes:    chartData.themes    ?? [],
            summary:   chartData.summary   ?? "",
          },
        },
      },
      { upsert: true, new: true }
    );

    // If there was a guest chart stored under guestId, clean it up
    if (guestChart) {
      await Chart.deleteOne({ _id: guestChart._id });
    }

    return NextResponse.json({
      chartId: chart._id.toString(),
      migrated: true,
      consultMessages: consultMessages ?? [],
    });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
