import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    // Placeholder for Stripe / Razorpay integration
    console.log(`Subscription request for plan: ${plan}`);

    return NextResponse.json({
      success: true,
      message: `Subscription to ${plan} plan initiated`,
      plan,
    });
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}
