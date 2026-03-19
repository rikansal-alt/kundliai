import { NextRequest, NextResponse } from "next/server";
import { computeDailyTransits } from "@/lib/dailyTransits";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const asc = sp.get("asc") || "Aries";
    const moon = sp.get("moon") || "Aries";

    const result = computeDailyTransits(asc, moon);

    return NextResponse.json(result, {
      headers: {
        // Cache for 1 hour — transit sign positions don't change that fast
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
