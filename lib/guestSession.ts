/**
 * Guest session management — localStorage only, zero server contact.
 *
 * A guest session lives for 7 days. It stores the full chart, birth details,
 * and consultation history so the app works completely without login.
 */

export interface GuestBirthDetails {
  name:  string;
  date:  string;
  time:  string;
  city:  string;
  lat:   number | null;
  lng:   number | null;
}

export interface GuestConsultMessage {
  role:    "user" | "assistant";
  content: string;
}

export interface GuestSession {
  guestId:       string;
  chartData:     Record<string, unknown> | null;
  birthDetails:  GuestBirthDetails | null;
  consultMessages: GuestConsultMessage[];
  consultCount:  number;
  createdAt:     string;
  expiresAt:     string;
}

const KEY = "kundliai_guest";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FREE_CONSULT_LIMIT = 3;

function makeId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestSession;
  } catch {
    return null;
  }
}

export function saveGuestSession(data: Partial<GuestSession>): GuestSession {
  const now = Date.now();
  const existing = getGuestSession();
  const session: GuestSession = {
    guestId:         existing?.guestId      ?? makeId(),
    chartData:       data.chartData         ?? existing?.chartData       ?? null,
    birthDetails:    data.birthDetails      ?? existing?.birthDetails    ?? null,
    consultMessages: data.consultMessages   ?? existing?.consultMessages ?? [],
    consultCount:    data.consultCount      ?? existing?.consultCount    ?? 0,
    createdAt:       existing?.createdAt    ?? new Date(now).toISOString(),
    expiresAt:       new Date(now + TTL_MS).toISOString(),
    ...data,
    // Always keep guestId and createdAt from the existing session
    guestId:   existing?.guestId  ?? makeId(),
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function clearGuestSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function isGuestExpired(): boolean {
  const session = getGuestSession();
  if (!session) return false;
  return Date.now() > new Date(session.expiresAt).getTime();
}

export function getConsultCount(): number {
  return getGuestSession()?.consultCount ?? 0;
}

export function incrementConsultCount(): void {
  const session = getGuestSession();
  if (!session) return;
  saveGuestSession({ consultCount: session.consultCount + 1 });
}

export function appendConsultMessages(messages: GuestConsultMessage[]): void {
  const session = getGuestSession();
  const existing = session?.consultMessages ?? [];
  saveGuestSession({ consultMessages: [...existing, ...messages] });
}

export function hasReachedConsultLimit(): boolean {
  return getConsultCount() >= FREE_CONSULT_LIMIT;
}

export { FREE_CONSULT_LIMIT };
