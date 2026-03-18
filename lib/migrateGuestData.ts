/**
 * Migrates guest localStorage data to MongoDB after Google login.
 * Called immediately after NextAuth signIn succeeds.
 * The user never notices — chart stays on screen during migration.
 */

import { getGuestSession, clearGuestSession, isGuestExpired } from "./guestSession";

export interface MigrationResult {
  success:  boolean;
  chartId?: string;
  skipped?: boolean;
}

export async function migrateGuestData(googleId: string): Promise<MigrationResult> {
  const session = getGuestSession();

  // Nothing to migrate
  if (!session || !session.chartData || !session.birthDetails) {
    return { success: true, skipped: true };
  }

  // Expired session — don't migrate stale data
  if (isGuestExpired()) {
    clearGuestSession();
    return { success: true, skipped: true };
  }

  try {
    const res = await fetch("/api/user/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleId,
        guestId:      session.guestId,
        birthDetails: session.birthDetails,
        chartData:    session.chartData,
        consultMessages: session.consultMessages ?? [],
        // Pass the name_dob userId so the endpoint can clean up the guest chart
        guestUserId: session.birthDetails
          ? `${session.birthDetails.name.toLowerCase().replace(/\s+/g, "_")}_${session.birthDetails.date.replace(/\//g, "-")}`
          : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Migration failed:", err);
      return { success: false };
    }

    const data = await res.json();

    // Replace guest session keys in localStorage with authenticated identifiers
    try {
      const snap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
      localStorage.setItem("kundliai_chart", JSON.stringify({
        ...snap,
        userId:  googleId,
        chartId: data.chartId ?? snap.chartId ?? "",
        tier:    "registered",
      }));
    } catch { /* ignore */ }

    clearGuestSession();
    return { success: true, chartId: data.chartId };
  } catch (err) {
    console.error("Migration error:", err);
    return { success: false };
  }
}
