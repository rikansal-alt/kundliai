/**
 * Sanitize a string value before using it in MongoDB queries.
 * Prevents NoSQL injection by stripping $ operators and limiting length.
 */
export function sanitizeString(input: unknown, maxLength = 200): string {
  const str = String(input ?? "").slice(0, maxLength);
  // Strip any MongoDB operator characters at the start
  return str.replace(/^\$/, "");
}

/**
 * Escape a string for safe use in a RegExp constructor.
 * Prevents ReDoS and regex injection.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
