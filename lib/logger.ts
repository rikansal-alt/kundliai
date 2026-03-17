const REDACT_KEYS = [
  "email",
  "name",
  "googleId",
  "city",
  "lat",
  "lng",
  "date",
  "authorization",
  "cookie",
  "token",
];

export function safeLog(
  level: "info" | "error" | "warn",
  message: string,
  data?: Record<string, unknown>,
) {
  if (!data) {
    console[level](message);
    return;
  }

  const sanitized = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      REDACT_KEYS.some((rk) => k.toLowerCase().includes(rk))
        ? "[REDACTED]"
        : v,
    ]),
  );

  console[level](message, sanitized);
}
