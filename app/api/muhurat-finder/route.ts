import { NextRequest, NextResponse } from "next/server";
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

const YOGA_AUSPICIOUS: Record<string, boolean> = {
  Preeti:true, Ayushman:true, Saubhagya:true, Shobhana:true,
  Sukarma:true, Dhriti:true, Vriddhi:true, Dhruva:true,
  Harshana:true, Siddhi:true, Shiva:true, Siddha:true,
  Sadhya:true, Shubha:true, Shukla:true, Brahma:true, Indra:true,
};

// Auspicious nakshatras for each event type
const EVENT_NAKSHATRAS: Record<string, string[]> = {
  wedding: ["Rohini","Mrigashira","Magha","Uttara Phalguni","Hasta","Swati","Anuradha","Mula","Uttara Ashadha","Shravana","Uttara Bhadrapada","Revati"],
  business: ["Ashwini","Rohini","Punarvasu","Pushya","Hasta","Chitra","Swati","Anuradha","Shravana","Dhanishtha","Revati"],
  travel: ["Ashwini","Mrigashira","Punarvasu","Pushya","Hasta","Anuradha","Shravana","Dhanishtha","Revati"],
  griha_pravesh: ["Rohini","Mrigashira","Uttara Phalguni","Hasta","Chitra","Swati","Anuradha","Uttara Ashadha","Shravana","Dhanishtha","Uttara Bhadrapada","Revati"],
  vehicle: ["Ashwini","Rohini","Punarvasu","Pushya","Hasta","Chitra","Swati","Anuradha","Shravana","Revati"],
  education: ["Ashwini","Rohini","Mrigashira","Punarvasu","Pushya","Hasta","Chitra","Swati","Shravana","Revati"],
};

// Tithis to avoid (Rikta tithis: 4th, 9th, 14th of each paksha; also Amavasya)
const AVOID_TITHIS = [3, 8, 13, 17, 22, 27, 29]; // 0-indexed

// Preferred weekdays per event
const EVENT_WEEKDAYS: Record<string, number[]> = {
  wedding: [1, 3, 4, 5],       // Mon, Wed, Thu, Fri
  business: [1, 3, 4, 5],      // Mon, Wed, Thu, Fri
  travel: [1, 3, 4, 5],        // Mon, Wed, Thu, Fri
  griha_pravesh: [1, 3, 4, 5], // Mon, Wed, Thu, Fri
  vehicle: [1, 3, 4, 5],       // Mon, Wed, Thu, Fri
  education: [1, 3, 4, 5],     // Mon, Wed, Thu, Fri
};

function normLon(d: number): number { return ((d % 360) + 360) % 360; }

function calcSunTimes(year: number, month: number, day: number, lat: number, lng: number) {
  const toR = (d: number) => d * Math.PI / 180;
  const doy = Math.floor(275 * month / 9) - (month > 2 ? (year % 4 === 0 ? 1 : 2) : 0) + day - 30;
  const B = toR(360 / 365 * (doy - 81));
  const EoT = 9.87 * Math.sin(2*B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const decl = toR(23.45 * Math.sin(toR(360 / 365 * (doy - 81))));
  const cosH = (Math.cos(toR(90.833)) - Math.sin(toR(lat)) * Math.sin(decl)) / (Math.cos(toR(lat)) * Math.cos(decl));
  if (cosH > 1 || cosH < -1) return null;
  const H = Math.acos(cosH) * 180 / Math.PI;
  const solarNoonUTC = 720 - 4 * lng - EoT;
  return { sunriseUTC: solarNoonUTC - H * 4, sunsetUTC: solarNoonUTC + H * 4 };
}

const RAHU_SEG = [7, 1, 6, 4, 5, 3, 2];

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const lat = parseFloat(sp.get("lat") ?? "28.6139");
    const lng = parseFloat(sp.get("lng") ?? "77.2090");
    const event = sp.get("event") ?? "wedding";
    const startDate = sp.get("startDate") ?? new Date().toISOString().split("T")[0];
    const endDateParam = sp.get("endDate");

    // Default: 30 days from start
    const start = new Date(startDate + "T00:00:00Z");
    const end = endDateParam ? new Date(endDateParam + "T00:00:00Z") : new Date(start.getTime() + 30 * 86400000);

    // Cap at 90 days
    const maxEnd = new Date(start.getTime() + 90 * 86400000);
    const finalEnd = end > maxEnd ? maxEnd : end;

    const timezone: string = tzlookup(lat, lng) ?? "Asia/Kolkata";
    const eventNakshatras = EVENT_NAKSHATRAS[event] ?? EVENT_NAKSHATRAS.wedding;
    const eventWeekdays = EVENT_WEEKDAYS[event] ?? EVENT_WEEKDAYS.wedding;

    const results: {
      date: string;
      weekday: string;
      score: number;
      rating: string;
      tithi: string;
      nakshatra: string;
      yoga: string;
      reasons: string[];
    }[] = [];

    const weekdayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    const current = new Date(start);
    while (current <= finalEnd) {
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth() + 1;
      const day = current.getUTCDate();

      const panchangDate = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
      const { sunLon, moonLon } = getPanchangPositions(panchangDate);

      const diff = normLon(moonLon - sunLon);
      const tithiIdx = Math.floor(diff / 12);
      const nakSpan = 360 / 27;
      const nakIdx = Math.floor(moonLon / nakSpan);
      const yogaIdx = Math.floor(normLon(sunLon + moonLon) / nakSpan) % 27;
      const weekday = current.getUTCDay();

      let score = 0;
      const reasons: string[] = [];

      // Check nakshatra
      const nakName = NAKSHATRA_NAMES[nakIdx];
      if (eventNakshatras.includes(nakName)) {
        score += 3;
        reasons.push(`${nakName} nakshatra is auspicious for this event`);
      }

      // Check tithi
      if (AVOID_TITHIS.includes(tithiIdx)) {
        score -= 2;
        reasons.push(`${TITHI_NAMES[tithiIdx]} tithi is inauspicious`);
      } else {
        score += 1;
      }

      // Shukla Paksha (waxing) preferred for most events
      if (tithiIdx < 15) {
        score += 1;
        reasons.push("Shukla Paksha (waxing moon) is favourable");
      }

      // Check yoga
      const yogaName = YOGA_NAMES[yogaIdx];
      if (YOGA_AUSPICIOUS[yogaName]) {
        score += 2;
        reasons.push(`${yogaName} yoga is auspicious`);
      }

      // Check weekday
      if (eventWeekdays.includes(weekday)) {
        score += 1;
        reasons.push(`${weekdayNames[weekday]} is a good day for this event`);
      } else if (weekday === 2 || weekday === 6) {
        score -= 1;
        reasons.push(`${weekdayNames[weekday]} is generally avoided`);
      }

      // Check Rahu Kaal overlap with midday (10am-2pm local)
      const sun = calcSunTimes(year, month, day, lat, lng);
      if (sun) {
        const segLen = (sun.sunsetUTC - sun.sunriseUTC) / 8;
        const rahuStart = sun.sunriseUTC + RAHU_SEG[weekday] * segLen;
        const rahuEnd = rahuStart + segLen;
        // If Rahu Kaal is in the middle of the day, slight penalty
        if (rahuStart < 780 && rahuEnd > 600) { // 10am-1pm UTC range roughly
          score -= 1;
        }
      }

      let rating = "Avoid";
      if (score >= 6) rating = "Excellent";
      else if (score >= 4) rating = "Good";
      else if (score >= 2) rating = "Fair";

      if (score >= 2) {
        results.push({
          date: current.toISOString().split("T")[0],
          weekday: weekdayNames[weekday],
          score,
          rating,
          tithi: TITHI_NAMES[tithiIdx],
          nakshatra: nakName,
          yoga: yogaName,
          reasons: reasons.filter(r => !r.includes("inauspicious")),
        });
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({ event, results, timezone });
  } catch (err) {
    return NextResponse.json({ error: "Failed to compute muhurats: " + String(err) }, { status: 500 });
  }
}
