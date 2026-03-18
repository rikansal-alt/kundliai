import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateChart } from "@/lib/ephemeris";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "\u2648", Taurus: "\u2649", Gemini: "\u264A", Cancer: "\u264B",
  Leo: "\u264C", Virgo: "\u264D", Libra: "\u264E", Scorpio: "\u264F",
  Sagittarius: "\u2650", Capricorn: "\u2651", Aquarius: "\u2652", Pisces: "\u2653",
};

export async function GET() {
  // Dev-only — block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const client = new Anthropic();

    // Calculate current transits (Delhi as reference for Vedic astrology)
    const now = new Date();
    const chart = calculateChart(now, 28.6139, 77.209);

    // Build transit summary
    const transitLines = Object.entries(chart.planets)
      .map(([name, p]) => {
        const retro = p.retrograde ? " (R)" : "";
        return `${name} in ${p.sign} ${p.degree.toFixed(1)}°${retro} — ${p.nakshatra} Pada ${p.nakshatraPada}`;
      })
      .join("\n");

    const today = now.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const prompt = `You are a Vedic astrologer generating daily horoscopes for Instagram.

Current planetary transits (sidereal/Lahiri):
${transitLines}

Date: ${today}

Generate a daily horoscope for EACH of the 12 Moon Signs (Rashis). For each sign, provide:
1. A 2-3 sentence horoscope prediction (max 50 words) based on how today's transits affect that sign
2. A "focus" keyword (1-2 words like "Career Growth", "Self Care", "Relationships", "Finances", "Health", "Creativity", "Communication", "Adventure", "Discipline", "Intuition", "New Beginnings", "Inner Peace")
3. A rating from 1-5 stars
4. An Instagram caption (2-3 lines max, casual & engaging tone, include 1-2 relevant emojis, end with a question to boost engagement). Do NOT include hashtags in the caption.

Consider actual transit aspects: which houses the transiting planets activate for each ascendant/moon sign, any conjunctions, aspects (7th, 5th, 9th), and retrograde effects.

Return ONLY a valid JSON array with exactly 12 objects in this format (Aries first, Pisces last):
[{"sign":"Aries","symbol":"${SIGN_SYMBOLS.Aries}","prediction":"...","focus":"...","stars":4,"caption":"..."}, ...]

No markdown, no explanation — just the JSON array.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse horoscopes" }, { status: 500 });
    }

    const horoscopes = JSON.parse(jsonMatch[0]);

    // Ensure all 12 signs are present and add symbols
    const result = SIGNS.map((sign, i) => {
      const found = horoscopes.find((h: { sign: string }) =>
        h.sign.toLowerCase() === sign.toLowerCase()
      );
      return {
        sign,
        symbol: SIGN_SYMBOLS[sign],
        prediction: found?.prediction || "The stars align for a day of reflection and inner growth.",
        focus: found?.focus || "Balance",
        stars: Math.min(5, Math.max(1, found?.stars || 3)),
        caption: found?.caption || "",
        index: i,
      };
    });

    return NextResponse.json({
      date: today,
      transits: transitLines,
      horoscopes: result,
    });
  } catch (err) {
    console.error("IG Horoscope error:", err);
    return NextResponse.json({ error: "Failed to generate horoscopes" }, { status: 500 });
  }
}
