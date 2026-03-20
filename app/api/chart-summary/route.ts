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

    const prompt = `You are explaining a birth chart to a 15-year-old who has never heard of astrology. Zero jargon. No astrology words without explaining them in the same breath. Talk like you're explaining to a friend over coffee.

Birth chart for ${firstName}:
- Ascendant (Rising Sign): ${asc}${ascNak ? ` in ${ascNak} nakshatra` : ""}
- Moon Sign: ${moonSign}
- Sun Sign: ${sunSign}
${planetLines.length > 0 ? "\nPlanetary positions:\n" + planetLines.join("\n") : ""}
${dashaLine ? "\n" + dashaLine : ""}

STRICT STYLE RULES:
- NEVER use em dashes (—). Use commas or periods instead.
- NEVER use semicolons or colons.
- Max 12 words per sentence. Shorter is better.
- Write at a 6th grade reading level.
- Use "you" and "your" a lot. Make it personal.
- No words like: essence, cosmic, celestial, profound, innate, radiant, magnetic, luminous, embody, resonate, channel.
- Use words like: people see you as, you're the kind of person who, you tend to, you're good at, you care about.
- Sound like a cool older sibling, not a guru.

Write a personal summary in EXACTLY this JSON format:
{
  "greeting": "Hey ${firstName}! Super short warm greeting, max 8 words",
  "ascendant": "How people see ${firstName} when they first meet. One sentence a teenager would understand. No astrology words.",
  "moon": "How ${firstName} handles feelings and what makes them feel safe. One sentence. Relatable everyday language.",
  "sun": "What ${firstName} is really about deep down. What drives them. One sentence.",
  "standout": "The coolest thing in their chart. Say which planet and what it does for them in real life. One sentence. Like telling a friend 'dude, you have this amazing thing in your chart that means...'",
  "standoutPlanet": "Just the planet name",
  "standoutSign": "Just the sign name",
  "dasha": "What phase of life they're in right now and what it means day-to-day. One sentence. No astrology jargon.",
  "oneWord": "One fun word for this person (like: Hustler, Dreamer, Protector, Creator, Boss)"
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
