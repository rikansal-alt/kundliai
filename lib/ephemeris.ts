/**
 * Pure JavaScript Vedic Ephemeris using astronomy-engine.
 * Zero native binaries — works on Vercel, Cloudflare, any platform.
 */
import * as Astronomy from "astronomy-engine";

// ─── Constants ───────────────────────────────────────────────────────────────

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const NAKSHATRAS = [
  { name: "Ashwini",            lord: "Ketu" },
  { name: "Bharani",            lord: "Venus" },
  { name: "Krittika",           lord: "Sun" },
  { name: "Rohini",             lord: "Moon" },
  { name: "Mrigashira",         lord: "Mars" },
  { name: "Ardra",              lord: "Rahu" },
  { name: "Punarvasu",          lord: "Jupiter" },
  { name: "Pushya",             lord: "Saturn" },
  { name: "Ashlesha",           lord: "Mercury" },
  { name: "Magha",              lord: "Ketu" },
  { name: "Purva Phalguni",     lord: "Venus" },
  { name: "Uttara Phalguni",    lord: "Sun" },
  { name: "Hasta",              lord: "Moon" },
  { name: "Chitra",             lord: "Mars" },
  { name: "Swati",              lord: "Rahu" },
  { name: "Vishakha",           lord: "Jupiter" },
  { name: "Anuradha",           lord: "Saturn" },
  { name: "Jyeshtha",           lord: "Mercury" },
  { name: "Mula",               lord: "Ketu" },
  { name: "Purva Ashadha",      lord: "Venus" },
  { name: "Uttara Ashadha",     lord: "Sun" },
  { name: "Shravana",           lord: "Moon" },
  { name: "Dhanishtha",         lord: "Mars" },
  { name: "Shatabhisha",        lord: "Rahu" },
  { name: "Purva Bhadrapada",   lord: "Jupiter" },
  { name: "Uttara Bhadrapada",  lord: "Saturn" },
  { name: "Revati",             lord: "Mercury" },
];

const PLANET_BODIES: [string, string][] = [
  ["Sun",     "Sun"],
  ["Moon",    "Moon"],
  ["Mars",    "Mars"],
  ["Mercury", "Mercury"],
  ["Jupiter", "Jupiter"],
  ["Venus",   "Venus"],
  ["Saturn",  "Saturn"],
];

// ─── Ayanamsha ───────────────────────────────────────────────────────────────

/** Lahiri ayanamsha — precession rate ~50.29 arcsec/year from J2000 reference */
export function getLahiriAyanamsha(date: Date): number {
  const year = date.getUTCFullYear() + (date.getUTCMonth() + date.getUTCDate() / 30) / 12;
  return 23.85 + (year - 2000) * (50.29 / 3600);
}

/** Lahiri ayanamsha from Julian Day */
export function getLahiriAyanamshaJD(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // centuries from J2000
  return 23.85 + T * 100 * (50.29 / 3600);
}

function tropicalToSidereal(tropical: number, ayanamsha: number): number {
  let sid = tropical - ayanamsha;
  if (sid < 0) sid += 360;
  if (sid >= 360) sid -= 360;
  return sid;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function getSign(longitude: number) {
  const index = Math.floor(longitude / 30);
  const degree = longitude % 30;
  return { sign: SIGN_NAMES[index], index, degree: Math.round(degree * 100) / 100 };
}

function getNakshatra(longitude: number) {
  const span = 360 / 27;
  const index = Math.floor(longitude / span);
  const pada = Math.floor((longitude % span) / (span / 4)) + 1;
  return { name: NAKSHATRAS[index].name, lord: NAKSHATRAS[index].lord, index, pada };
}

function getHouse(planetLon: number, ascLon: number): number {
  const ascSignIdx = Math.floor(ascLon / 30);
  const planetSignIdx = Math.floor(planetLon / 30);
  return ((planetSignIdx - ascSignIdx + 12) % 12) + 1;
}

/** Mean lunar ascending node (Rahu) — Meeus formula */
function getMeanLunarNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  return normDeg(omega);
}

/** Julian Day from UTC date components */
export function julianDay(year: number, month: number, day: number, hour: number): number {
  // Meeus algorithm
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + B - 1524.5;
}

/** Get tropical ecliptic longitude for a planet using astronomy-engine */
function getPlanetLongitude(body: string, date: Date): number {
  if (body === "Moon") {
    const moon = Astronomy.EclipticGeoMoon(Astronomy.MakeTime(date));
    return normDeg(moon.lon);
  }
  const vec = Astronomy.GeoVector(body as Astronomy.Body, Astronomy.MakeTime(date), true);
  const ecl = Astronomy.Ecliptic(vec);
  return normDeg(ecl.elon);
}

// ─── Ascendant ───────────────────────────────────────────────────────────────

/** Calculate tropical ascendant longitude from GMST + location */
function calcAscendant(date: Date, lat: number, lng: number): number {
  const gmst = Astronomy.SiderealTime(Astronomy.MakeTime(date)); // hours
  const lst = gmst + lng / 15; // local sidereal time in hours
  const RAMC = normDeg(lst * 15); // degrees
  const eps = 23.4393; // mean obliquity

  const latRad = (lat * Math.PI) / 180;
  const ramcRad = (RAMC * Math.PI) / 180;
  const epsRad = (eps * Math.PI) / 180;

  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  let asc = (Math.atan2(y, x) * 180) / Math.PI;
  asc = normDeg(asc);

  return asc;
}

// ─── Main exports ────────────────────────────────────────────────────────────

export interface PlanetResult {
  longitude: number;
  sign: string;
  signIndex: number;
  house: number;
  degree: number;
  retrograde: boolean;
  nakshatra: string;
  nakshatraPada: number;
  nakshatraLord: string;
}

export interface ChartResult {
  ascendant: { sign: string; signIndex: number; longitude: number; degree: number; nakshatra: string };
  mc: { sign: string; longitude: number };
  moonSign: string;
  sunSign: string;
  planets: Record<string, PlanetResult>;
  ayanamsha: number;
  julianDay: number;
}

/**
 * Calculate a full Vedic birth chart — pure JavaScript, no native binaries.
 */
export function calculateChart(
  utcDate: Date,
  lat: number,
  lng: number,
): ChartResult {
  const jd = julianDay(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600,
  );
  const ayanamsha = getLahiriAyanamshaJD(jd);

  // ── Ascendant ──────────────────────────────────────────────────────────
  const ascTropical = calcAscendant(utcDate, lat, lng);
  const ascSidereal = tropicalToSidereal(ascTropical, ayanamsha);
  const ascSign = getSign(ascSidereal);
  const ascNak = getNakshatra(ascSidereal);

  // ── MC (Midheaven) ────────────────────────────────────────────────────
  const gmst = Astronomy.SiderealTime(Astronomy.MakeTime(utcDate));
  const lst = gmst + lng / 15;
  const mcTropical = normDeg(lst * 15);
  const mcSidereal = tropicalToSidereal(mcTropical, ayanamsha);
  const mcSignData = getSign(mcSidereal);

  // ── Planets ────────────────────────────────────────────────────────────
  const planets: Record<string, PlanetResult> = {};
  let moonLon = 0;

  const yesterday = new Date(utcDate.getTime() - 86400000);

  for (const [name, body] of PLANET_BODIES) {
    const tropLon = getPlanetLongitude(body, utcDate);
    const sidLon = tropicalToSidereal(tropLon, ayanamsha);
    const sign = getSign(sidLon);
    const nak = getNakshatra(sidLon);
    const house = getHouse(sidLon, ascSidereal);

    // Retrograde: compare with yesterday's tropical longitude
    let retrograde = false;
    if (name !== "Sun" && name !== "Moon") {
      const tropYesterday = getPlanetLongitude(body, yesterday);
      // Handle wrap-around near 0°/360°
      let diff = tropLon - tropYesterday;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      retrograde = diff < 0;
    }

    planets[name] = {
      longitude: Math.round(sidLon * 1000) / 1000,
      sign: sign.sign,
      signIndex: sign.index,
      house,
      degree: sign.degree,
      retrograde,
      nakshatra: nak.name,
      nakshatraPada: nak.pada,
      nakshatraLord: nak.lord,
    };

    if (name === "Moon") moonLon = sidLon;
  }

  // ── Rahu & Ketu ────────────────────────────────────────────────────────
  const rahuTropical = getMeanLunarNode(jd);
  const rahuSid = tropicalToSidereal(rahuTropical, ayanamsha);
  const ketuSid = normDeg(rahuSid + 180);

  const rahuSign = getSign(rahuSid);
  const rahuNak = getNakshatra(rahuSid);
  planets["Rahu"] = {
    longitude: Math.round(rahuSid * 1000) / 1000,
    sign: rahuSign.sign,
    signIndex: rahuSign.index,
    house: getHouse(rahuSid, ascSidereal),
    degree: rahuSign.degree,
    retrograde: true,
    nakshatra: rahuNak.name,
    nakshatraPada: rahuNak.pada,
    nakshatraLord: rahuNak.lord,
  };

  const ketuSign = getSign(ketuSid);
  const ketuNak = getNakshatra(ketuSid);
  planets["Ketu"] = {
    longitude: Math.round(ketuSid * 1000) / 1000,
    sign: ketuSign.sign,
    signIndex: ketuSign.index,
    house: getHouse(ketuSid, ascSidereal),
    degree: ketuSign.degree,
    retrograde: true,
    nakshatra: ketuNak.name,
    nakshatraPada: ketuNak.pada,
    nakshatraLord: ketuNak.lord,
  };

  return {
    ascendant: {
      sign: ascSign.sign,
      signIndex: ascSign.index,
      longitude: Math.round(ascSidereal * 1000) / 1000,
      degree: ascSign.degree,
      nakshatra: ascNak.name,
    },
    mc: {
      sign: mcSignData.sign,
      longitude: Math.round(mcSidereal * 1000) / 1000,
    },
    moonSign: planets["Moon"].sign,
    sunSign: planets["Sun"].sign,
    planets,
    ayanamsha: Math.round(ayanamsha * 10000) / 10000,
    julianDay: Math.round(jd * 100) / 100,
  };
}

/**
 * Get tropical Sun and Moon longitudes for Panchang calculations.
 * Returns sidereal longitudes after subtracting Lahiri ayanamsha.
 */
export function getPanchangPositions(utcDate: Date): { sunLon: number; moonLon: number } {
  const jd = julianDay(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60,
  );
  const ayanamsha = getLahiriAyanamshaJD(jd);

  const sunTrop = getPlanetLongitude("Sun", utcDate);
  const moonTrop = getPlanetLongitude("Moon", utcDate);

  return {
    sunLon: tropicalToSidereal(sunTrop, ayanamsha),
    moonLon: tropicalToSidereal(moonTrop, ayanamsha),
  };
}
