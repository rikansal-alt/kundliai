import { NextRequest, NextResponse } from "next/server";
import { safeLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    // Placeholder for Stripe / Razorpay integration
    safeLog("info", "Subscription request", { plan });

    return NextResponse.json({
      success: true,
      message: `Subscription to ${plan} plan initiated`,
      plan,
    });
  } catch (error) {
    safeLog("error", "Subscribe API error:", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}
