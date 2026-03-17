import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlanetPosition {
  sign: string;
  house: number;
  degree: number;
  retrograde: boolean;
  nakshatra: string;
  nakshatraLord: string;
}

interface ChartData {
  // Full chart from /api/generate (preferred)
  ascendant?: { sign: string; degree: number; nakshatra: string };
  moonSign?: string;
  sunSign?: string;
  planets?: Record<string, PlanetPosition>;
  mahadasha?: {
    current?: { planet: string; startYear: number; endYear: number };
    yearsRemaining?: number;
  };
  meta?: { birthDetails?: { city: string; timezone: string }; ayanamsha?: { name: string } };
  // Legacy flat format (fallback)
  [key: string]: unknown;
}

function buildChartSummary(chart: ChartData): string {
  // Rich chart from /api/generate
  if (chart.planets && chart.ascendant && typeof chart.ascendant === "object") {
    const lines: string[] = [
      `Ascendant (Lagna): ${chart.ascendant.sign} (${chart.ascendant.degree.toFixed(1)}°, ${chart.ascendant.nakshatra} nakshatra)`,
      `Moon Sign (Rashi): ${chart.moonSign}`,
      `Sun Sign: ${chart.sunSign}`,
    ];

    lines.push("\nPlanetary Positions (Sidereal, Lahiri ayanamsha, Whole Sign houses):");
    for (const [name, p] of Object.entries(chart.planets)) {
      const retro = p.retrograde ? " ℞" : "";
      lines.push(
        `  ${name}: ${p.sign}, House ${p.house}, ${p.degree.toFixed(1)}°, ${p.nakshatra}${retro}`
      );
    }

    if (chart.mahadasha?.current) {
      const md = chart.mahadasha.current;
      lines.push(
        `\nCurrent Mahadasha: ${md.planet} (${md.startYear}–${md.endYear}, ${chart.mahadasha.yearsRemaining ?? "?"} years remaining)`
      );
    }

    if (chart.meta?.birthDetails) {
      lines.push(`Birth location: ${chart.meta.birthDetails.city} (${chart.meta.birthDetails.timezone})`);
    }

    return lines.join("\n");
  }

  // Fallback: flat legacy format
  return Object.entries(chart)
    .filter(([, v]) => typeof v === "string")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

export async function POST(req: NextRequest) {
  try {
    const { messages, chart, userName } = await req.json();

    const chartSummary = buildChartSummary(chart ?? {});

    const systemPrompt = `You are Jyotish, a wise and compassionate Vedic astrology AI.
You are consulting ${userName || "the seeker"} about their birth chart.

IMPORTANT: Use ONLY the planetary positions provided below. Never calculate or invent positions yourself.
The positions are pre-calculated using Swiss Ephemeris (sidereal, Lahiri ayanamsha).

${chartSummary}

Response rules:
- Maximum 3 sentences per response
- No bullet points ever
- No headers or bold text
- Conversational tone — like a wise friend talking, not a report being written
- One specific insight from their actual chart
- One practical suggestion
- End with one short question to continue the conversation
- Never use phrases like: In conclusion / To summarize / It is worth noting / Additionally / Furthermore / It is important to

Target length: 60-80 words maximum per response.`;

    // Collect full response first so we can check word count
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages: (messages as Message[]).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    let text = response.content[0].type === "text" ? response.content[0].text : "";

    // Safety net: if over 120 words, summarise with a second call
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 120) {
      const trim = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Summarise this in under 80 words, same warm conversational tone, keep the most specific astrological insight, end with a question:\n\n${text}`,
        }],
      });
      text = trim.content[0].type === "text" ? trim.content[0].text : text;
    }

    // Stream the final text word-by-word for a natural feel
    const encoder = new TextEncoder();
    const words = text.split(" ");
    const readable = new ReadableStream({
      async start(controller) {
        for (const word of words) {
          controller.enqueue(encoder.encode(word + " "));
          await new Promise((r) => setTimeout(r, 18));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Consult API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to get astrological guidance" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
