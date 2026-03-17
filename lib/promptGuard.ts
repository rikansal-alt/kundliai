// ─── Layer 1: Injection Detection ────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore (previous|all|above) instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as (a |an )?(?!vedic|astrol)/i,
  /jailbreak/i,
  /\bDAN\b/,
  /do anything now/i,
  /forget (your|all|previous)/i,
  /new (persona|personality|role)/i,
  /system prompt/i,
  /reveal your instructions/i,
];

// ─── Content Moderation (dangerous/PII) ─────────────────────────────────────

const MODERATION_PATTERNS = [
  /\b(suicide|self.harm|kill (my|your)self)\b/i,
  /\b(bomb|weapon|explosive)\b/i,
  /\b(credit card|ssn|social security|password)\b/i,
];

// ─── Layer 2: Topic Detection ────────────────────────────────────────────────

const BLOCKED_TOPICS = [
  /\bpython\b/i, /\bjavascript\b/i, /\b(code|coding)\b/i,
  /\bprogram(ming)?\b/i, /\bscript\b/i, /\bfunction\b/i,
  /\brecipe\b/i, /\bcook(ing)?\b/i, /\bingredient/i,
  /\bnews\b/i, /\bpolitics\b/i, /\belection/i,
  /\b(stock|invest|crypto|bitcoin|trade)\b/i,
  /\bmovie\b/i, /\bsong\b/i, /\bmusic\b/i,
  /\bgame\b/i, /\bsport/i, /\bfootball\b/i,
  /\bmath\b/i, /\bequation/i,
  /\btranslate\b/i,
  /write (a|an|my) (essay|email|letter|report|blog)/i,
  /summarize/i,
  /explain .*(history|science|physics)/i,
  /\b(medical|diagnos|prescri|symptom)\b/i,
  /\b(legal advice|lawsuit|attorney)\b/i,
];

const ALLOWED_TOPICS = [
  /astro/i, /planet/i, /chart/i, /kundli/i, /kundali/i,
  /nakshatra/i, /dasha/i, /mahadasha/i, /antardasha/i, /bhukti/i,
  /rashi/i, /lagna/i, /ascendant/i,
  /moon/i, /sun/i, /mars/i, /venus/i,
  /jupiter/i, /saturn/i, /mercury/i,
  /rahu/i, /ketu/i, /transit/i,
  /compatibility/i, /matching/i, /milan/i,
  /muhurat/i, /panchang/i, /remed/i,
  /gemstone/i, /mantra/i, /vedic/i,
  /horoscope/i, /birth/i, /\bhouse\b/i,
  /\bsign\b/i, /spiritual/i, /karma/i,
  /dharma/i, /dosha/i, /\byoga\b/i,
  /my chart/i, /my sign/i, /my life/i,
  /career/i, /marriage/i, /love/i, /relationship/i,
  /finance/i, /health/i, /future/i, /money/i, /job/i,
  /prediction/i, /forecast/i,
  /when will/i, /will i/i, /should i/i,
  /what does/i, /why am/i, /how do i/i,
  /tell me about/i, /explain/i,
];

const REDIRECT_MSG =
  "I am here only to guide you through your Vedic birth chart. What would you like to know about your planetary positions or chart?";

// ─── Exported Functions ──────────────────────────────────────────────────────

export function sanitizeMessage(content: string): {
  safe: boolean;
  reason?: string;
  sanitized?: string;
} {
  if (content.length > 500) {
    return { safe: false, reason: "too_long" };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: "injection" };
    }
  }

  for (const pattern of MODERATION_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: "moderation" };
    }
  }

  const sanitized = content
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { safe: true, sanitized };
}

/**
 * Layer 2: Check if a message is astrology-related BEFORE calling Claude.
 * Returns false for obvious off-topic requests — saves API cost.
 */
export function isAstrologyRelated(message: string): boolean {
  // Short messages are probably conversational context — allow
  if (message.length < 15) return true;

  // Check blocked topics first (explicit off-topic)
  for (const pattern of BLOCKED_TOPICS) {
    if (pattern.test(message)) return false;
  }

  // Check if any astrology keyword is present
  for (const pattern of ALLOWED_TOPICS) {
    if (pattern.test(message)) return true;
  }

  // Ambiguous — allow through, Claude's system prompt will redirect
  return true;
}

/**
 * Layer 3: Check if Claude accidentally answered an off-topic question.
 */
export function isOffTopicResponse(response: string): boolean {
  const offTopicSignals = [
    /here is (a |the )?python/i,
    /here is (a |the )?code/i,
    /def [a-z_]+\(/i,
    /function [a-z_]+\(/i,
    /import [a-z]/i,
    /ingredients:/i,
    /step 1:/i,
    /```/, // code blocks
  ];

  return offTopicSignals.some((pattern) => pattern.test(response));
}

export function sanitizeResponse(response: string): string {
  // Check for prompt leakage
  const LEAK_PATTERNS = [
    /system prompt/i,
    /my instructions are/i,
    /i was told to/i,
    /as an ai language model/i,
  ];

  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return REDIRECT_MSG;
    }
  }

  // Check for off-topic response (Layer 3)
  if (isOffTopicResponse(response)) {
    return REDIRECT_MSG;
  }

  return response;
}

export { REDIRECT_MSG };
