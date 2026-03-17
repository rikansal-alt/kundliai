import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * POST /api/compatibility/insight
 * Returns a 3-sentence Claude-generated Cosmic Insight for a Gun Milan result.
 * Body: { name1, moonSign1, nakshatra1, name2, moonSign2, nakshatra2, totalScore, rating, koots, doshas }
 */
export async function POST(req: NextRequest) {
  try {
    const {
      name1, moonSign1, nakshatra1,
      name2, moonSign2, nakshatra2,
      totalScore, rating, koots,
      doshas,
    } = await req.json();

    if (!name1 || !name2 || totalScore === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Identify strong and weak koots
    const strongKoots = (koots as { name: string; score: number; maxPts: number }[])
      .filter((k) => k.score / k.maxPts >= 0.75)
      .map((k) => `${k.name} (${k.score}/${k.maxPts})`)
      .join(", ");

    const weakKoots = (koots as { name: string; score: number; maxPts: number }[])
      .filter((k) => k.score / k.maxPts < 0.5)
      .map((k) => `${k.name} (${k.score}/${k.maxPts})`)
      .join(", ");

    const doshaText = (doshas as string[]).length > 0
      ? `Doshas present: ${(doshas as string[]).join(", ")}.`
      : "No major doshas.";

    const prompt = `You are a warm, wise Vedic astrologer. Write a Cosmic Insight for ${name1} and ${name2} who scored ${totalScore}/36 in Gun Milan (${rating}).

Their chart details:
- ${name1}: ${moonSign1} Moon, ${nakshatra1} nakshatra
- ${name2}: ${moonSign2} Moon, ${nakshatra2} nakshatra
- Strongest koots: ${strongKoots || "none exceptional"}
- Koots needing attention: ${weakKoots || "none"}
- ${doshaText}

Write exactly 3 sentences:
1. Open with something specific and warm about their Moon signs or nakshatras and what they bring to each other.
2. Name their strongest quality as a couple (from the strong koots) and one area to nurture (from the weak koots).
3. End with one concrete, practical suggestion — a ritual, habit, or intention that honours their Vedic compatibility.

Tone: warm, specific, never fear-inducing. Use the actual nakshatra and Moon sign names. Keep it under 120 words.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const insight = (message.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("compatibility/insight error:", err);
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 });
  }
}
