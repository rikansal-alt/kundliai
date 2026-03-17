import { NextRequest, NextResponse } from "next/server";
import { calcVimshottariMahadasha, serialiseMahadashaResult } from "@/lib/mahadasha";
import { checkRateLimit } from "@/lib/rateLimit";
import { BirthDetailsSchema } from "@/lib/validators";
import { safeLog } from "@/lib/logger";
import { calculateChart } from "@/lib/ephemeris";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require("tz-lookup");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert local birth date/time to UTC using Intl
 * (No external library needed — works for any IANA timezone)
 */
function localToUTC(
  year: number, month: number, day: number,
  hour: number, min: number,
  timezone: string,
): Date {
  const h = (isNaN(hour) || hour > 23) ? 12 : Math.max(0, hour);
  const m = (isNaN(min) || min > 59) ? 0 : Math.max(0, min);
  const naive = new Date(Date.UTC(year, month - 1, day, h, m, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(naive);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);

  const localMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), 0);
  const targetMs = Date.UTC(year, month - 1, day, h, m, 0);
  const offsetMs = localMs - targetMs;
  return new Date(naive.getTime() - offsetMs);
}

// ─── Regional chart style ─────────────────────────────────────────────────────

const SOUTH_INDIAN_STATES = new Set([
  "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana",
  "Pondicherry", "Puducherry", "Lakshadweep",
]);

const BENGALI_STATES = new Set([
  "West Bengal", "Odisha", "Assam", "Bihar", "Jharkhand",
  "Tripura", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Arunachal Pradesh", "Sikkim",
]);

function getRegionalChartStyle(
  nameParts: string[],
): "south-indian" | "north-indian" | "bengali" {
  for (const part of nameParts) {
    if (SOUTH_INDIAN_STATES.has(part)) return "south-indian";
    if (BENGALI_STATES.has(part)) return "bengali";
  }
  return "north-indian";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit by IP ────────────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit = await checkRateLimit({
      key: `generate:${ip}`,
      limit: 5,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    // ── Validate input ──────────────────────────────────────────────────
    const body = await req.json();
    const parsed = BirthDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, date, time, city, lat: reqLat, lng: reqLng } = parsed.data;

    // ── 1. Resolve lat/lng ──────────────────────────────────────────────
    let lat: number, lng: number, locationName: string;
    let defaultChartStyle: "south-indian" | "north-indian" | "bengali" = "north-indian";

    if (reqLat !== undefined && reqLng !== undefined) {
      lat = reqLat;
      lng = reqLng;
      locationName = city;
      const nameParts = city.split(/[,\s]+/).map((s: string) => s.trim());
      defaultChartStyle = getRegionalChartStyle(nameParts);
    } else {
      let geoRes: Response;
      try {
        geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
          { headers: { "User-Agent": "Jyotish-App/1.0 (vedic astrology calculator)" }, signal: AbortSignal.timeout(8000) },
        );
      } catch {
        return NextResponse.json({ error: "Could not reach the location service. Please select a location from the dropdown suggestions." }, { status: 503 });
      }

      if (!geoRes.ok) {
        return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 503 });
      }

      const geoData = await geoRes.json();
      if (!geoData.length) {
        return NextResponse.json({ error: `City "${city}" not found` }, { status: 404 });
      }

      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
      locationName = geoData[0].display_name;

      const nameParts = locationName.split(",").map((s: string) => s.trim());
      defaultChartStyle = getRegionalChartStyle(nameParts);
    }

    // ── 2. Timezone from coordinates ────────────────────────────────────
    const timezone: string = tzlookup(lat, lng) ?? "UTC";

    // ── 3. Parse date and time ──────────────────────────────────────────
    let year: number, month: number, day: number;
    const dateStr = String(date).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      [year, month, day] = dateStr.split("-").map(Number);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      [day, month, year] = dateStr.split("/").map(Number);
    } else {
      return NextResponse.json({ error: "Date must be DD/MM/YYYY or YYYY-MM-DD" }, { status: 400 });
    }

    const rawTime = String(time ?? "").trim();
    const TIME_RE = /^(\d{1,2})(?::(\d{1,2}))?/;
    const tMatch = TIME_RE.exec(rawTime);
    const parsedHour = tMatch ? parseInt(tMatch[1], 10) : NaN;
    const parsedMin = tMatch ? parseInt(tMatch[2] ?? "0", 10) : NaN;
    const birthHour = isNaN(parsedHour) || parsedHour > 23 ? 12 : parsedHour;
    const birthMin = isNaN(parsedMin) || parsedMin > 59 ? 0 : parsedMin;
    const timeStr = `${birthHour.toString().padStart(2, "0")}:${birthMin.toString().padStart(2, "0")}`;
    const hasTime = !!(tMatch && rawTime.length > 0);

    // ── 4. Local birth time → UTC ───────────────────────────────────────
    const birthDate = new Date(Date.UTC(year, month - 1, day));
    const utcDate = localToUTC(year, month, day, birthHour, birthMin, timezone);
    const utcHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60;

    // ── 5. Calculate chart using pure JS ephemeris ───────────────────────
    const c = calculateChart(utcDate, lat, lng);

    // ── 6. Vimshottari Mahadasha from Moon longitude ────────────────────
    const moonLon = (c.planets["Moon"] as { longitude: number }).longitude;
    const mahadasha = serialiseMahadashaResult(
      calcVimshottariMahadasha(moonLon, birthDate),
    );

    // ── 7. Build chart JSON ─────────────────────────────────────────────
    const chart = {
      meta: {
        name,
        birthDetails: {
          date: dateStr,
          time: hasTime ? timeStr : null,
          city,
          locationName: locationName.split(",").slice(0, 3).join(","),
          lat: Math.round(lat * 10000) / 10000,
          lng: Math.round(lng * 10000) / 10000,
          timezone,
          utcOffset: Math.round((utcHour - (birthHour + birthMin / 60)) * 60),
        },
        calculatedAt: new Date().toISOString(),
        ayanamsha: {
          name: "Lahiri",
          value: c.ayanamsha,
        },
        system: "Sidereal · Whole Sign Houses · Vimshottari Dasha",
        julianDay: c.julianDay,
        hasTime,
        defaultChartStyle,
      },
      ascendant: c.ascendant,
      mc: c.mc,
      moonSign: c.moonSign,
      sunSign: c.sunSign,
      planets: c.planets,
      mahadasha,
    };

    return NextResponse.json({ success: true, chart });

  } catch (err) {
    safeLog("error", "generate route error:", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to calculate chart" },
      { status: 500 },
    );
  }
}
