import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Consultation from "@/lib/models/Consultation";
import { Types } from "mongoose";
import { safeLog } from "@/lib/logger";
import { sanitizeString } from "@/lib/sanitizeMongo";

/**
 * POST /api/consultation/save
 * Creates or updates a consultation session linked to a chartId.
 * Body: { chartId, userId, messages, consultationId? }
 *
 * If consultationId is provided, appends new messages to that session.
 * Otherwise, creates a fresh consultation document.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const chartId = sanitizeString(body.chartId, 30);
    const userId = sanitizeString(body.userId, 100);
    const consultationId = body.consultationId ? sanitizeString(body.consultationId, 30) : undefined;
    const { messages } = body;

    if (!chartId || !userId || !messages?.length) {
      return NextResponse.json(
        { error: "chartId, userId, and messages are required" },
        { status: 400 }
      );
    }

    const timestampedMessages = messages.map(
      (m: { role: string; content: string; timestamp?: string }) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })
    );

    let consultation;

    if (consultationId && Types.ObjectId.isValid(consultationId)) {
      consultation = await Consultation.findByIdAndUpdate(
        consultationId,
        { $set: { messages: timestampedMessages } },
        { new: true }
      );
    } else {
      consultation = await Consultation.create({
        chartId: new Types.ObjectId(chartId),
        userId,
        messages: timestampedMessages,
      });
    }

    return NextResponse.json({
      success: true,
      consultationId: consultation!._id.toString(),
    });
  } catch (err) {
    safeLog("error", "consultation/save error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to save consultation" }, { status: 500 });
  }
}
