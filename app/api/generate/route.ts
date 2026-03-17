import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { calcVimshottariMahadasha, serialiseMahadashaResult } from "@/lib/mahadasha";
import { checkRateLimit } from "@/lib/rateLimit";
import { BirthDetailsSchema } from "@/lib/validators";
import { safeLog } from "@/lib/logger";

// Native addon — must be server-only (Node.js runtime)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swe = require("swisseph");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require("tz-lookup");

// ─── Constants ───────────────────────────────────────────────────────────────

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

// Nakshatra lords (used locally for nakshatra metadata display)
const NAKSHATRA_LORDS_LOCAL = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
  "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun",
  "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
  "Jupiter", "Saturn", "Mercury",
];

// Planet config: [swisseph id, display name]
const PLANET_CONFIG: [number, string][] = [
  [swe.SE_SUN,      "Sun"],
  [swe.SE_MOON,     "Moon"],
  [swe.SE_MARS,     "Mars"],
  [swe.SE_MERCURY,  "Mercury"],
  [swe.SE_JUPITER,  "Jupiter"],
  [swe.SE_VENUS,    "Venus"],
  [swe.SE_SATURN,   "Saturn"],
  [swe.SE_MEAN_NODE, "Rahu"],  // Mean North Node
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function signIndex(lon: number): number {
  return Math.floor(normalizeDeg(lon) / 30);
}

function degreeInSign(lon: number): number {
  return normalizeDeg(lon) % 30;
}

function getNakshatra(lon: number) {
  const normalized = normalizeDeg(lon);
  const nakshatraIndex = Math.floor(normalized / (360 / 27));
  const padaIndex = Math.floor((normalized % (360 / 27)) / (360 / 108));
  return {
    name: NAKSHATRAS[nakshatraIndex],
    pada: padaIndex + 1,
    lord: NAKSHATRA_LORDS_LOCAL[nakshatraIndex],
  };
}

/**
 * Convert local birth date/time to UTC using Intl
 * (No external library needed — works for any IANA timezone)
 */
function localToUTC(
  year: number, month: number, day: number,
  hour: number, min: number,
  timezone: string
): Date {
  // Guard: clamp to valid ranges so NaN/out-of-range values never reach Date.UTC
  const h = (isNaN(hour) || hour > 23) ? 12 : Math.max(0, hour);
  const m = (isNaN(min)  || min  > 59) ? 0  : Math.max(0, min);
  // Naive UTC (wrong timezone, but gives us the offset reference)
  const naive = new Date(Date.UTC(year, month - 1, day, h, m, 0));

  // What local time does this naive UTC represent in the birth timezone?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(naive);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);

  const localMs  = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), 0);
  const targetMs = Date.UTC(year, month - 1, day, h, m, 0);

  // offset = what naive UTC shows as local  — difference from what we want
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
  nameParts: string[]
): "south-indian" | "north-indian" | "bengali" {
  for (const part of nameParts) {
    if (SOUTH_INDIAN_STATES.has(part)) return "south-indian";
    if (BENGALI_STATES.has(part))      return "bengali";
  }
  return "north-indian"; // Hindi belt default
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

    // ── 1. Resolve lat/lng — use provided coords or geocode city ──────────
    let lat: number, lng: number, locationName: string;
    let defaultChartStyle: "south-indian" | "north-indian" | "bengali" = "north-indian";

    if (reqLat !== undefined && reqLng !== undefined) {
      lat = reqLat;
      lng = reqLng;
      locationName = city;
      // Try to detect regional style from city string
      const nameParts = city.split(/[,\s]+/).map((s: string) => s.trim());
      defaultChartStyle = getRegionalChartStyle(nameParts);
    } else {
      // ── 1a. Geocode city → lat/lng ───────────────────────────────────────
      let geoRes: Response;
      try {
        geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
          { headers: { "User-Agent": "Jyotish-App/1.0 (vedic astrology calculator)" }, signal: AbortSignal.timeout(8000) }
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

      // ── 1b. Regional chart style default ────────────────────────────────
      const nameParts = locationName.split(",").map((s: string) => s.trim());
      defaultChartStyle = getRegionalChartStyle(nameParts);
    }

    // ── 2. Timezone from coordinates ───────────────────────────────────────
    const timezone: string = tzlookup(lat, lng) ?? "UTC";

    // ── 3. Parse date and time ─────────────────────────────────────────────
    // Accept DD/MM/YYYY, YYYY-MM-DD, or MM/DD/YYYY
    let year: number, month: number, day: number;
    const dateStr = String(date).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      [year, month, day] = dateStr.split("-").map(Number);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      [day, month, year] = dateStr.split("/").map(Number);
    } else {
      return NextResponse.json({ error: "Date must be DD/MM/YYYY or YYYY-MM-DD" }, { status: 400 });
    }

    // Sanitise time: accept HH:MM, HH:MM:SS, or bare HH. Fall back to noon.
    const rawTime = String(time ?? "").trim();
    const TIME_RE = /^(\d{1,2})(?::(\d{1,2}))?/;
    const tMatch  = TIME_RE.exec(rawTime);
    const parsedHour = tMatch ? parseInt(tMatch[1], 10) : NaN;
    const parsedMin  = tMatch ? parseInt(tMatch[2] ?? "0", 10) : NaN;
    const birthHour  = isNaN(parsedHour) || parsedHour > 23 ? 12 : parsedHour;
    const birthMin   = isNaN(parsedMin)  || parsedMin  > 59 ? 0  : parsedMin;
    const timeStr    = `${birthHour.toString().padStart(2,"0")}:${birthMin.toString().padStart(2,"0")}`;
    const hasTime    = !!(tMatch && rawTime.length > 0);

    // ── 4. Local birth time → UTC ──────────────────────────────────────────
    const birthDate = new Date(Date.UTC(year, month - 1, day));
    const utcDate = localToUTC(year, month, day, birthHour, birthMin, timezone);
    const utcHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;

    // ── 5. Julian Day (UT) ─────────────────────────────────────────────────
    const jd: number = swe.swe_julday(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcHour,
      swe.SE_GREG_CAL
    );

    // ── 6. Swiss Ephemeris setup ───────────────────────────────────────────
    swe.swe_set_ephe_path(path.join(process.cwd(), "node_modules/swisseph/ephe"));
    swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);

    const FLAG = swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED;

    // ── 7. Ayanamsha ───────────────────────────────────────────────────────
    const ayanamsha: number = swe.swe_get_ayanamsa_ut(jd);

    // ── 8. Tropical ascendant → sidereal ──────────────────────────────────
    // swe_houses returns tropical cusps; subtract ayanamsha for sidereal
    const tropicalHouses = swe.swe_houses(jd, lat, lng, "W");
    const lagnaLon = normalizeDeg(tropicalHouses.ascendant - ayanamsha);
    const lagnaSignIdx = signIndex(lagnaLon);
    const lagnaSign = SIGN_NAMES[lagnaSignIdx];

    const mcLon = normalizeDeg(tropicalHouses.mc - ayanamsha);
    const mcSign = SIGN_NAMES[signIndex(mcLon)];

    // ── 9. Calculate all 9 planets (sidereal, Lahiri) ─────────────────────
    const planets: Record<string, object> = {};
    let moonLon = 0;

    for (const [planetId, planetName] of PLANET_CONFIG) {
      const result = swe.swe_calc_ut(jd, planetId, FLAG);

      if (result.error) {
        safeLog("error", `Error calculating ${planetName}:`, { error: String(result.error) });
        continue;
      }

      const lon = normalizeDeg(result.longitude);
      const signIdx = signIndex(lon);
      const degSign = degreeInSign(lon);
      const house = ((signIdx - lagnaSignIdx + 12) % 12) + 1;
      const retrograde = result.longitudeSpeed < 0;
      const nakshatra = getNakshatra(lon);

      planets[planetName] = {
        longitude: Math.round(lon * 1000) / 1000,
        sign: SIGN_NAMES[signIdx],
        signIndex: signIdx,
        house,
        degree: Math.round(degSign * 100) / 100,
        retrograde,
        nakshatra: nakshatra.name,
        nakshatraPada: nakshatra.pada,
        nakshatraLord: nakshatra.lord,
      };

      if (planetName === "Moon") moonLon = lon;
    }

    // ── 10. Ketu = Rahu + 180° ─────────────────────────────────────────────
    const rahuData = planets["Rahu"] as { longitude: number; signIndex: number };
    const ketuLon = normalizeDeg(rahuData.longitude + 180);
    const ketuSignIdx = signIndex(ketuLon);
    const ketuNakshatra = getNakshatra(ketuLon);
    planets["Ketu"] = {
      longitude: Math.round(ketuLon * 1000) / 1000,
      sign: SIGN_NAMES[ketuSignIdx],
      signIndex: ketuSignIdx,
      house: ((ketuSignIdx - lagnaSignIdx + 12) % 12) + 1,
      degree: Math.round(degreeInSign(ketuLon) * 100) / 100,
      retrograde: true,  // Ketu is always considered retrograde
      nakshatra: ketuNakshatra.name,
      nakshatraPada: ketuNakshatra.pada,
      nakshatraLord: ketuNakshatra.lord,
    };

    // ── 11. Vimshottari Mahadasha from Moon longitude ─────────────────────
    const mahadasha = serialiseMahadashaResult(
      calcVimshottariMahadasha(moonLon, birthDate)
    );

    // ── 12. Moon sign (Rashi) and Sun sign ───────────────────────────────
    const moonSignData = planets["Moon"] as { sign: string };
    const sunSignData  = planets["Sun"]  as { sign: string };

    // ── 13. Build chart JSON ──────────────────────────────────────────────
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
          value: Math.round(ayanamsha * 10000) / 10000,
        },
        system: "Sidereal · Whole Sign Houses · Vimshottari Dasha",
        julianDay: Math.round(jd * 100) / 100,
        hasTime,
        defaultChartStyle,
      },
      ascendant: {
        sign: lagnaSign,
        signIndex: lagnaSignIdx,
        longitude: Math.round(lagnaLon * 1000) / 1000,
        degree: Math.round(degreeInSign(lagnaLon) * 100) / 100,
        nakshatra: getNakshatra(lagnaLon).name,
      },
      mc: {
        sign: mcSign,
        longitude: Math.round(mcLon * 1000) / 1000,
      },
      moonSign: moonSignData.sign,
      sunSign: sunSignData.sign,
      planets,
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
