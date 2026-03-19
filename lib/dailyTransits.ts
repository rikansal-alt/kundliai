/**
 * Compute daily energy stats and predictions from current transits
 * relative to a user's birth chart. Deterministic — no LLM call.
 */

import { calculateChart } from "./ephemeris";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Planet weights for energy calculation
const PLANET_ENERGY: Record<string, number> = {
  Sun: 3, Moon: 4, Mars: 3, Mercury: 2, Jupiter: 3, Venus: 2, Saturn: -2, Rahu: -1, Ketu: -1,
};

// Benefic aspects (trine = 5th/9th, same sign)
const BENEFIC_ASPECTS = [0, 4, 8]; // 0 = conjunction, 4 = trine (5th), 8 = trine (9th)
// Challenging aspects
const HARD_ASPECTS = [6, 3]; // 6 = opposition (7th), 3 = square (4th)

interface DailyStats {
  energy: { label: string; value: string };
  focus: { label: string; value: string };
  caution: { label: string; value: string };
}

interface DailyPrediction {
  morning: string;
  afternoon: string;
  evening: string;
  prediction: string;
}

interface TransitResult {
  stats: DailyStats;
  prediction: DailyPrediction;
  moonTransitSign: string;
  moonTransitHouse: number;
}

function signIndex(sign: string): number {
  return SIGNS.indexOf(sign);
}

function houseBetween(transitSign: string, natalSign: string): number {
  const ti = signIndex(transitSign);
  const ni = signIndex(natalSign);
  if (ti < 0 || ni < 0) return 0;
  return ((ti - ni + 12) % 12);
}

// Energy level based on how many benefic vs hard aspects transits make to natal chart
function computeEnergy(
  transitPlanets: Record<string, { sign: string }>,
  natalAsc: string,
): string {
  let score = 0;

  for (const [name, tp] of Object.entries(transitPlanets)) {
    const weight = PLANET_ENERGY[name] ?? 0;
    const house = houseBetween(tp.sign, natalAsc);

    // Benefic houses: 1, 5, 9, 11
    if ([0, 4, 8, 10].includes(house)) score += weight;
    // Hard houses: 6, 8, 12
    if ([5, 7, 11].includes(house)) score -= Math.abs(weight);
  }

  if (score >= 6) return "High";
  if (score >= 2) return "Good";
  if (score >= -2) return "Moderate";
  return "Low";
}

// Focus area based on where most transit energy is concentrated
function computeFocus(
  transitPlanets: Record<string, { sign: string }>,
  natalAsc: string,
): string {
  const houseCount: Record<string, number> = {};
  const HOUSE_THEMES: Record<number, string> = {
    0: "Self", 1: "Money", 2: "Ideas", 3: "Home", 4: "Creativity",
    5: "Health", 6: "Love", 7: "Change", 8: "Growth", 9: "Career",
    10: "Goals", 11: "Rest",
  };

  for (const [, tp] of Object.entries(transitPlanets)) {
    const house = houseBetween(tp.sign, natalAsc);
    const theme = HOUSE_THEMES[house] || "Self";
    houseCount[theme] = (houseCount[theme] || 0) + 1;
  }

  // Return the theme with most planets
  let maxTheme = "Balance";
  let maxCount = 0;
  for (const [theme, count] of Object.entries(houseCount)) {
    if (count > maxCount) { maxCount = count; maxTheme = theme; }
  }
  return maxTheme;
}

// Caution area based on where malefics (Saturn, Mars, Rahu) are transiting
function computeCaution(
  transitPlanets: Record<string, { sign: string }>,
  natalAsc: string,
): string {
  const malefics = ["Saturn", "Mars", "Rahu"];
  const CAUTION_MAP: Record<number, string> = {
    0: "Ego", 1: "Spending", 2: "Speech", 3: "Peace", 4: "Risks",
    5: "Health", 6: "Conflicts", 7: "Secrets", 8: "Overwork", 9: "Reputation",
    10: "Isolation", 11: "Detachment",
  };

  for (const name of malefics) {
    const tp = transitPlanets[name];
    if (tp) {
      const house = houseBetween(tp.sign, natalAsc);
      // Only warn for hard houses
      if ([5, 7, 11, 2, 6].includes(house)) {
        return CAUTION_MAP[house] || "Patience";
      }
    }
  }
  return "None";
}

// Moon transit determines the mood of the day
const MOON_HOUSE_PREDICTION: Record<number, DailyPrediction> = {
  0: {
    prediction: "The Moon highlights your sense of self today. You feel more visible and emotionally present.",
    morning: "Start strong. Your instincts are sharp this morning.",
    afternoon: "People notice your energy. Use it for important conversations.",
    evening: "Wind down with something that feels like you. No masks tonight.",
  },
  1: {
    prediction: "Focus turns to money and comfort. A good day for practical financial decisions.",
    morning: "Check your accounts or plan a purchase you've been considering.",
    afternoon: "Steady work brings tangible results. Stay grounded.",
    evening: "Treat yourself to something comforting. You've earned it.",
  },
  2: {
    prediction: "Communication flows easily. Short trips, messages, and learning feel energized.",
    morning: "Send that message you've been putting off.",
    afternoon: "Your words carry weight. Meetings go well.",
    evening: "Read, write, or call someone you miss.",
  },
  3: {
    prediction: "Home and inner peace take center stage. Nurture your roots today.",
    morning: "A slow morning at home recharges you more than rushing.",
    afternoon: "Family matters or home projects feel satisfying.",
    evening: "Cook something. Be cozy. Your heart needs softness tonight.",
  },
  4: {
    prediction: "Creativity and romance get a boost. Express yourself boldly.",
    morning: "Start with something creative before the day gets busy.",
    afternoon: "Playfulness at work produces surprising results.",
    evening: "Date night energy. Or just do something that sparks joy.",
  },
  5: {
    prediction: "Health and routine demand attention. Small improvements add up.",
    morning: "Move your body. Even 10 minutes changes your whole day.",
    afternoon: "Tackle that task list. You'll feel great crossing things off.",
    evening: "Don't push too hard. Rest is productive too.",
  },
  6: {
    prediction: "Relationships are in focus. Partnerships bring both growth and challenge.",
    morning: "A good morning for honest conversations with someone close.",
    afternoon: "Collaboration produces better results than solo work.",
    evening: "Give your partner or close friend some real attention.",
  },
  7: {
    prediction: "Deep feelings surface. Transformation is possible if you stay honest.",
    morning: "Journal before the world gets loud. Something wants to emerge.",
    afternoon: "Financial or shared resource decisions benefit from scrutiny.",
    evening: "Let go of something you've been holding. It's lighter on the other side.",
  },
  8: {
    prediction: "Optimism and expansion feel natural. Learning and adventure call.",
    morning: "Start your day with something that expands your mind.",
    afternoon: "Big-picture thinking beats micromanaging today.",
    evening: "Plan something. A trip, a course, a new direction.",
  },
  9: {
    prediction: "Career and public life take center stage. Others notice your efforts.",
    morning: "Dress with intention. First impressions carry weight today.",
    afternoon: "Step up. Your competence is visible to people who matter.",
    evening: "Reflect on what you're building. Is it aligned?",
  },
  10: {
    prediction: "Community and aspirations energize you. Reach out to your network.",
    morning: "A message to a friend or mentor could open unexpected doors.",
    afternoon: "Group work and collaborative projects thrive.",
    evening: "Reconnect with what you wish for. Dreams need tending.",
  },
  11: {
    prediction: "Quiet introspection is the gift today. Solitude feeds your soul.",
    morning: "Meditate or sit quietly before the day begins.",
    afternoon: "Don't force social energy. Work behind the scenes.",
    evening: "Early to bed. Your subconscious is processing something important.",
  },
};

export function computeDailyTransits(
  natalAscendant: string,
  natalMoonSign: string,
): TransitResult {
  // Get current planetary positions
  const now = new Date();
  const chart = calculateChart(now, 28.6139, 77.209); // Current sky, location doesn't matter much for sign-level

  const transitPlanets: Record<string, { sign: string }> = {};
  for (const [name, p] of Object.entries(chart.planets)) {
    transitPlanets[name] = { sign: p.sign };
  }

  const moonSign = chart.moonSign;
  const moonHouse = houseBetween(moonSign, natalAscendant);

  const energy = computeEnergy(transitPlanets, natalAscendant);
  const focus = computeFocus(transitPlanets, natalAscendant);
  const caution = computeCaution(transitPlanets, natalAscendant);

  const pred = MOON_HOUSE_PREDICTION[moonHouse] || MOON_HOUSE_PREDICTION[0];

  return {
    stats: {
      energy: { label: "Energy", value: energy },
      focus: { label: "Focus", value: focus },
      caution: { label: "Caution", value: caution },
    },
    prediction: pred,
    moonTransitSign: moonSign,
    moonTransitHouse: moonHouse + 1,
  };
}
