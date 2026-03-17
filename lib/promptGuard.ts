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

const OFF_TOPIC_PATTERNS = [
  /\b(stock|invest|crypto|bitcoin|trade)\b/i,
  /\b(medical|diagnos|prescri|symptom)\b/i,
  /\b(legal advice|lawsuit|attorney)\b/i,
  /\b(suicide|self.harm|kill (my|your)self)\b/i,
  /\b(bomb|weapon|explosive|hack)\b/i,
  /\b(credit card|ssn|social security|password)\b/i,
];

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

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: "off_topic" };
    }
  }

  const sanitized = content
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { safe: true, sanitized };
}

export function sanitizeResponse(response: string): string {
  const LEAK_PATTERNS = [
    /system prompt/i,
    /my instructions are/i,
    /i was told to/i,
    /as an ai language model/i,
  ];

  for (const pattern of LEAK_PATTERNS) {
    if (pattern.test(response)) {
      return "I can only help with Vedic astrology questions.";
    }
  }

  return response;
}
