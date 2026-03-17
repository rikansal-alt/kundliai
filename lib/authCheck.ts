import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

/**
 * Verify that the request comes from an authenticated user OR a guest with a guest ID.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export async function requireAuth(req: NextRequest): Promise<{
  authorized: boolean;
  userId?: string;
  isGuest: boolean;
  response?: NextResponse;
}> {
  // Check NextAuth session first
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const googleId = (session.user as { googleId?: string }).googleId;
    return { authorized: true, userId: googleId ?? session.user.email ?? undefined, isGuest: false };
  }

  // Fall back to guest ID header
  const guestId = req.headers.get("x-guest-id");
  if (guestId) {
    return { authorized: true, userId: guestId, isGuest: true };
  }

  // Also accept userId in query params or body (for backwards compatibility)
  const urlUserId = req.nextUrl.searchParams.get("userId");
  if (urlUserId) {
    return { authorized: true, userId: urlUserId, isGuest: false };
  }

  return {
    authorized: false,
    isGuest: true,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
