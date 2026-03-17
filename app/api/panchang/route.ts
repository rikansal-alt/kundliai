import { NextRequest, NextResponse } from "next/server";
import { safeLog } from "@/lib/logger";
import { getPanchangPositions } from "@/lib/ephemeris";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzlookup = require("tz-lookup");

// ─── Lookup tables ────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
  "Shashthi","Saptami","Ashtami","Navami","Dashami",
  "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami",
  "Shashthi","Saptami","Ashtami","Navami","Dashami",
  "Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya",
];

const NAKSHATRA_NAMES = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati",
];

const YOGA_NAMES = [
  "Vishkambha","Preeti","Ayushman","Saubhagya","Shobhana",
  "Atiganda","Sukarma","Dhriti","Shoola","Ganda",
  "Vriddhi","Dhruva","Vyaghata","Harshana","Vajra",
  "Siddhi","Vyatipata","Variyan","Parigha","Shiva",
  "Siddha","Sadhya","Shubha","Shukla","Brahma",
  "Indra","Vaidhriti",
];

const YOGA_AUSPICIOUS: Record<string,boolean> = {
  Preeti:true, Ayushman:true, Saubhagya:true, Shobhana:true,
  Sukarma:true, Dhriti:true, Vriddhi:true, Dhruva:true,
  Harshana:true, Siddhi:true, Shiva:true, Siddha:true,
  Sadhya:true, Shubha:true, Shukla:true, Brahma:true, Indra:true,
};

const KARANA_MOVABLE = ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti (Bhadra)"];
const KARANA_FIXED   = ["Shakuni","Chatushpada","Naga","Kimstughna"];

const VARA = [
  { name:"Ravivara",    english:"Sunday",    planet:"Sun",     deity:"Surya",     color:"#F59E0B", guidance:"Good for health, avoid new ventures late evening" },
  { name:"Somavara",    english:"Monday",    planet:"Moon",    deity:"Chandra",   color:"#6366F1", guidance:"Auspicious for travel and agriculture" },
  { name:"Mangalavara", english:"Tuesday",   planet:"Mars",    deity:"Mangal",    color:"#EF4444", guidance:"Mixed — good for physical work, avoid financial decisions" },
  { name:"Budhavara",   english:"Wednesday", planet:"Mercury", deity:"Budha",     color:"#10B981", guidance:"Excellent for business, communication and learning" },
  { name:"Guruvara",    english:"Thursday",  planet:"Jupiter", deity:"Brihaspati",color:"#D97706", guidance:"Most auspicious day — ideal for all important work" },
  { name:"Shukravara",  english:"Friday",    planet:"Venus",   deity:"Shukra",    color:"#EC4899", guidance:"Good for arts, beauty, relationships and shopping" },
  { name:"Shanivara",   english:"Saturday",  planet:"Saturn",  deity:"Shani",     color:"#6B7280", guidance:"Avoid new beginnings; good for disciplined, steady work" },
];

// Rahu Kaal: which 1/8th segment of the day (0-indexed from sunrise)
// Sun=8th, Mon=2nd, Tue=7th, Wed=5th, Thu=6th, Fri=4th, Sat=3rd
const RAHU_SEG = [7, 1, 6, 4, 5, 3, 2]; // index by weekday (0=Sun)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normLon(d: number): number { return ((d % 360) + 360) % 360; }

/** NOAA-based sunrise/sunset in minutes-from-midnight UTC */
function calcSunTimes(year: number, month: number, day: number, lat: number, lng: number) {
  const toR = (d: number) => d * Math.PI / 180;
  // Day of year
  const doy =
    Math.floor(275 * month / 9)
    - (month > 2 ? (year % 4 === 0 ? 1 : 2) : 0)
    + day - 30;
  const B = toR(360 / 365 * (doy - 81));
  const EoT = 9.87 * Math.sin(2*B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // minutes
  const decl = toR(23.45 * Math.sin(toR(360 / 365 * (doy - 81))));
  const cosH = (Math.cos(toR(90.833)) - Math.sin(toR(lat)) * Math.sin(decl))
             / (Math.cos(toR(lat)) * Math.cos(decl));
  if (cosH > 1 || cosH < -1) return null;
  const H = Math.acos(cosH) * 180 / Math.PI;
  const solarNoonUTC = 720 - 4 * lng - EoT; // minutes from midnight UTC
  return {
    sunriseUTC: solarNoonUTC - H * 4,
    sunsetUTC:  solarNoonUTC + H * 4,
    solarNoon:  solarNoonUTC,
  };
}

function minToTimeStr(utcMin: number, tzOffsetMin: number): string {
  const local = ((utcMin + tzOffsetMin) % 1440 + 1440) % 1440;
  const h = Math.floor(local / 60), m = Math.floor(local % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${ampm}`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const lat = parseFloat(sp.get("lat") ?? "28.6139");
    const lng = parseFloat(sp.get("lng") ?? "77.2090");

    // Derive timezone from location coordinates (ignores browser timezone)
    const timezone: string = tzlookup(lat, lng) ?? "Asia/Kolkata";

    // Reliable UTC offset using formatToParts — works regardless of server timezone
    const now = new Date();
    function getLocationOffset(tz: string): number {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      });
      const p = Object.fromEntries(fmt.formatToParts(now).map(({ type, value }) => [type, value]));
      const localMs = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
      return Math.round((localMs - now.getTime()) / 60000);
    }
    const tzOffset = getLocationOffset(timezone);

    // Current date in the LOCATION's local timezone (determines correct weekday)
    const year  = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day   = now.getUTCDate();

    // Sun & Moon sidereal longitudes at 6 AM UTC (covers Indian morning)
    const panchangDate = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
    const { sunLon, moonLon } = getPanchangPositions(panchangDate);

    // ── Tithi ─────────────────────────────────────────────────────────────
    const diff      = normLon(moonLon - sunLon);
    const tithiIdx  = Math.floor(diff / 12);       // 0-29
    const paksha    = tithiIdx < 15 ? "Shukla Paksha (Waxing)" : "Krishna Paksha (Waning)";

    // ── Nakshatra ─────────────────────────────────────────────────────────
    const nakSpan = 360 / 27;
    const nakIdx  = Math.floor(moonLon / nakSpan);
    const pada    = Math.floor((moonLon % nakSpan) / (nakSpan / 4)) + 1;

    // ── Yoga ──────────────────────────────────────────────────────────────
    const yogaIdx  = Math.floor(normLon(sunLon + moonLon) / nakSpan) % 27;
    const yogaName = YOGA_NAMES[yogaIdx];

    // ── Karana ────────────────────────────────────────────────────────────
    const karanaSeq = Math.floor(diff / 6); // 0-59
    let karanaName: string;
    if      (karanaSeq === 0)  karanaName = KARANA_FIXED[3]; // Kimstughna (Shukla Pratipada 1st half)
    else if (karanaSeq === 57) karanaName = KARANA_FIXED[0]; // Shakuni
    else if (karanaSeq === 58) karanaName = KARANA_FIXED[1]; // Chatushpada
    else if (karanaSeq === 59) karanaName = KARANA_FIXED[2]; // Naga
    else                       karanaName = KARANA_MOVABLE[(karanaSeq - 1) % 7];

    // ── Vara (weekday) ────────────────────────────────────────────────────
    const localDate = new Date(now.getTime() + tzOffset * 60000);
    const weekday   = localDate.getUTCDay();
    const vara      = VARA[weekday];

    // ── Sunrise / Sunset / Rahu Kaal / Muhurats ───────────────────────────
    const sun = calcSunTimes(year, month, day, lat, lng);
    const SR  = sun?.sunriseUTC ?? 360;  // default 6 AM UTC
    const SS  = sun?.sunsetUTC  ?? 1110; // default 6:30 PM UTC
    const SN  = sun?.solarNoon  ?? 735;

    const segLen = (SS - SR) / 8;
    const rahuStart = SR + RAHU_SEG[weekday] * segLen;

    return NextResponse.json({
      date: {
        gregorian: `${day.toString().padStart(2,"0")}/${month.toString().padStart(2,"0")}/${year}`,
        samvat:    year + 56,
        weekday:   vara.english,
      },
      tithi: {
        number: tithiIdx + 1,
        name:   TITHI_NAMES[tithiIdx],
        paksha,
      },
      nakshatra: {
        number: nakIdx + 1,
        name:   NAKSHATRA_NAMES[nakIdx],
        pada,
      },
      yoga: {
        number:    yogaIdx + 1,
        name:      yogaName,
        auspicious: YOGA_AUSPICIOUS[yogaName] ?? false,
      },
      karana: { name: karanaName },
      vara,
      locationTimezone: timezone,
      // Raw UTC minutes from midnight — client formats in the location's timezone
      sunriseUtcMin:  SR,
      sunsetUtcMin:   SS,
      rahuKaal: {
        startUtcMin: rahuStart,
        endUtcMin:   rahuStart + segLen,
      },
      muhurats: [
        {
          name:        "Brahma Muhurta",
          startUtcMin: SR - 96,
          endUtcMin:   SR - 48,
          type:        "excellent",
          icon:        "🌅",
          description: "Best for meditation, study and spiritual practice",
        },
        {
          name:        "Abhijit Muhurta",
          startUtcMin: SN - 24,
          endUtcMin:   SN + 24,
          type:        "excellent",
          icon:        "☀️",
          description: "Universally auspicious — ideal for all important work",
        },
      ],
    });
  } catch (err) {
    safeLog("error", "Panchang error:", { error: String(err) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
