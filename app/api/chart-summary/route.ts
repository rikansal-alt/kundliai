import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { safeLog } from "@/lib/logger";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { chart, name } = body;
    if (!chart?.ascendant || !chart?.moonSign) {
      return NextResponse.json({ error: "Chart data required" }, { status: 400 });
    }

    const firstName = (name || "Friend").split(" ")[0];

    // Build a compact chart description for the prompt
    const asc = typeof chart.ascendant === "object" ? chart.ascendant.sign : chart.ascendant;
    const ascNak = typeof chart.ascendant === "object" ? chart.ascendant.nakshatra : "";
    const moonSign = chart.moonSign;
    const sunSign = chart.sunSign;

    const planetLines: string[] = [];
    if (chart.planets) {
      for (const [name, p] of Object.entries(chart.planets)) {
        const pl = p as { sign: string; house: number; degree: number; retrograde: boolean; nakshatra: string };
        const retro = pl.retrograde ? " (retrograde)" : "";
        planetLines.push(`${name}: ${pl.sign}, House ${pl.house}${retro}, ${pl.nakshatra} nakshatra`);
      }
    }

    let dashaLine = "";
    if (chart.mahadasha?.currentMahadasha) {
      dashaLine = `Current Mahadasha: ${chart.mahadasha.currentMahadasha.planet} (until ${chart.mahadasha.currentMahadasha.endDate})`;
    }

    const prompt = `You are a warm, friendly Vedic astrologer explaining a birth chart to someone who knows NOTHING about astrology. Use simple, everyday language. No jargon. No Sanskrit unless you immediately explain it.

Birth chart for ${firstName}:
- Ascendant (Rising Sign): ${asc}${ascNak ? ` in ${ascNak} nakshatra` : ""}
- Moon Sign: ${moonSign}
- Sun Sign: ${sunSign}
${planetLines.length > 0 ? "\nPlanetary positions:\n" + planetLines.join("\n") : ""}
${dashaLine ? "\n" + dashaLine : ""}

STRICT STYLE RULES:
- NEVER use em dashes (—). Use commas or periods instead.
- NEVER use semicolons.
- Keep sentences short and punchy. Max 20 words per sentence.
- Write like a friend texting, not like an essay.
- No filler words like "essentially", "naturally", "truly", "deeply", "profoundly".
- Sound human. Not poetic. Not flowery.

Write a personal summary in EXACTLY this JSON format:
{
  "greeting": "Short warm greeting for ${firstName}, max 10 words",
  "ascendant": "What ${asc} rising means in plain English. One short sentence. How people see them.",
  "moon": "What ${moonSign} Moon means for emotions. One short sentence. Relatable.",
  "sun": "What ${sunSign} Sun means for identity. One short sentence.",
  "standout": "Most powerful placement. Name the planet and sign, then one sentence on why it matters. Keep it concrete.",
  "standoutPlanet": "Just the planet name",
  "standoutSign": "Just the sign name",
  "dasha": "One sentence about their current life phase. Practical, not poetic.",
  "oneWord": "One word for this chart (like: Builder, Healer, Leader, Explorer)"
}

Return ONLY valid JSON. No markdown.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse summary" }, { status: 500 });
    }

    const summary = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ summary });
  } catch (err) {
    safeLog("error", "Chart summary error:", { error: String(err) });
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
