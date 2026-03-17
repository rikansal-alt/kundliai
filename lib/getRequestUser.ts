/**
 * Server-side helper: resolves the identity of the caller for any API route.
 * Returns authenticated user (from NextAuth session) or guest (from header).
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import type { NextRequest } from "next/server";

export type UserTier = "guest" | "registered" | "silver" | "gold";

export interface RequestUser {
  type:     "authenticated" | "guest";
  id:       string;   // googleId or guestId
  tier:     UserTier;
  email?:   string;
}

export async function getRequestUser(req: NextRequest): Promise<RequestUser | null> {
  // 1. Try authenticated session first
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return {
        type:   "authenticated",
        id:     (session.user as { googleId?: string }).googleId ?? session.user.email ?? "",
        tier:   ((session.user as { tier?: UserTier }).tier) ?? "registered",
        email:  session.user.email ?? undefined,
      };
    }
  } catch { /* next-auth not configured yet — fall through */ }

  // 2. Fall back to guest session via header
  const guestId = req.headers.get("x-guest-id");
  if (guestId) {
    return {
      type: "guest",
      id:   guestId,
      tier: "guest",
    };
  }

  return null;
}

/** Guest consult count from request header (client sends this) */
export function getGuestConsultCount(req: NextRequest): number {
  const raw = req.headers.get("x-guest-consult-count");
  const n = parseInt(raw ?? "0", 10);
  return isNaN(n) ? 0 : n;
}

export const GUEST_CONSULT_LIMIT = 3;
