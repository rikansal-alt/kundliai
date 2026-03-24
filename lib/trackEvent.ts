/**
 * Lightweight client-side event tracker.
 * Fires a beacon to /api/track — non-blocking, never throws.
 */
export function trackEvent(
  action: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const raw = localStorage.getItem("kundliai_chart");
    const snap = raw ? JSON.parse(raw) : {};
    const userId = snap.userId || "anonymous";

    navigator.sendBeacon(
      "/api/track",
      JSON.stringify({ userId, action, metadata }),
    );
  } catch {
    // tracking is best-effort
  }
}
