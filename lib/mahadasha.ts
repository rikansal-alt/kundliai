/**
 * Vimshottari Mahadasha Calculator
 *
 * Determines the complete planetary period timeline for a given
 * Moon longitude (sidereal, Lahiri) and birth date.
 *
 * Rules:
 *  - 120-year cycle across 9 planets in fixed order
 *  - Moon's nakshatra at birth determines the starting dasha lord
 *  - Fraction remaining in the birth nakshatra = balance of first dasha
 *  - Bhukti duration = (maha_years × bhukti_years) / 120
 *  - Bhukti sequence starts from the Mahadasha lord itself
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Canonical cycle order (start: Ketu)
export const DASHA_ORDER = [
  "Ketu", "Venus", "Sun", "Moon", "Mars",
  "Rahu", "Jupiter", "Saturn", "Mercury",
];

// Nakshatra lords 0-26 (Ashwini → Revati)
const NAKSHATRA_LORDS: string[] = [
  "Ketu",    "Venus",   "Sun",     "Moon",    "Mars",    "Rahu",
  "Jupiter", "Saturn",  "Mercury", "Ketu",    "Venus",   "Sun",
  "Moon",    "Mars",    "Rahu",    "Jupiter", "Saturn",  "Mercury",
  "Ketu",    "Venus",   "Sun",     "Moon",    "Mars",    "Rahu",
  "Jupiter", "Saturn",  "Mercury",
];

const NAKSHATRA_SPAN = 360 / 27; // 13.3333…°

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashaEntry {
  planet: string;
  startDate: Date;
  endDate: Date;
  durationYears: number;
}

export interface BhuktiEntry {
  planet: string;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
}

export interface MahadashaResult {
  /** The currently active Mahadasha */
  currentMahadasha: DashaEntry;
  /** The currently active Bhukti (sub-period) within the Mahadasha */
  currentBhukti: BhuktiEntry;
  /** All 9 Mahadasha entries in sequence from birth */
  allDashas: DashaEntry[];
  /** All 9 Bhukti entries within the current Mahadasha */
  currentBhuktis: BhuktiEntry[];
  /** 0-100 — how far through the current Mahadasha we are */
  percentElapsed: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Add fractional years to a Date (uses 365.25 days/year for leap-year accuracy) */
function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);
}

/** Normalise longitude to [0, 360) */
function normLon(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// ─── Main calculator ─────────────────────────────────────────────────────────

/**
 * @param moonLongitude  Sidereal Moon longitude in degrees (Lahiri ayanamsha applied)
 * @param birthDate      Birth date as a JS Date (time-of-day matters for boundary cases)
 */
export function calcVimshottariMahadasha(
  moonLongitude: number,
  birthDate: Date,
): MahadashaResult {
  const lon = normLon(moonLongitude);

  // 1. Nakshatra index (0-26) and lord
  const nakIdx = Math.floor(lon / NAKSHATRA_SPAN);
  const lord   = NAKSHATRA_LORDS[nakIdx];

  // 2. Fraction elapsed within the birth nakshatra
  const posInNak       = lon - nakIdx * NAKSHATRA_SPAN;
  const fractionElapsed = posInNak / NAKSHATRA_SPAN;

  // 3. Balance of first dasha at birth
  const firstDashaYears    = DASHA_YEARS[lord];
  const yearsElapsedAtBirth = firstDashaYears * fractionElapsed;

  // 4. True start of the first (partial) dasha = birth - elapsed portion
  const firstDashaStart = addYears(birthDate, -yearsElapsedAtBirth);

  // 5. Build full 9-dasha sequence
  const lordIdx  = DASHA_ORDER.indexOf(lord);
  const allDashas: DashaEntry[] = [];
  let cursor = firstDashaStart;

  for (let i = 0; i < 9; i++) {
    const planet = DASHA_ORDER[(lordIdx + i) % 9];
    const years  = DASHA_YEARS[planet];
    const end    = addYears(cursor, years);
    allDashas.push({ planet, startDate: cursor, endDate: end, durationYears: years });
    cursor = end;
  }

  // 6. Current Mahadasha
  const now = new Date();
  const currentMahadasha =
    allDashas.find((d) => d.startDate <= now && d.endDate > now) ?? allDashas[0];

  // 7. Percent elapsed through current Mahadasha
  const totalMs   = currentMahadasha.endDate.getTime() - currentMahadasha.startDate.getTime();
  const elapsedMs = Math.max(0, now.getTime() - currentMahadasha.startDate.getTime());
  const percentElapsed = Math.round(Math.min(100, (elapsedMs / totalMs) * 100));

  // 8. Build all 9 Bhuktis within the current Mahadasha
  const mIdx = DASHA_ORDER.indexOf(currentMahadasha.planet);
  const currentBhuktis: BhuktiEntry[] = [];
  let bCursor = currentMahadasha.startDate;

  for (let i = 0; i < 9; i++) {
    const bPlanet  = DASHA_ORDER[(mIdx + i) % 9];
    const bYears   = (DASHA_YEARS[currentMahadasha.planet] * DASHA_YEARS[bPlanet]) / 120;
    const bEnd     = addYears(bCursor, bYears);
    currentBhuktis.push({
      planet:          bPlanet,
      startDate:       bCursor,
      endDate:         bEnd,
      durationMonths:  Math.round(bYears * 12 * 10) / 10,
    });
    bCursor = bEnd;
  }

  // 9. Current Bhukti
  const currentBhukti =
    currentBhuktis.find((b) => b.startDate <= now && b.endDate > now) ?? currentBhuktis[0];

  return {
    currentMahadasha,
    currentBhukti,
    allDashas,
    currentBhuktis,
    percentElapsed,
  };
}

// ─── Serialisation helpers (for API responses / localStorage) ────────────────

/** Convert DashaEntry to a plain JSON-safe object */
export function serialiseDasha(d: DashaEntry) {
  return {
    planet:        d.planet,
    startDate:     d.startDate.toISOString(),
    endDate:       d.endDate.toISOString(),
    durationYears: d.durationYears,
  };
}

/** Convert BhuktiEntry to a plain JSON-safe object */
export function serialiseBhukti(b: BhuktiEntry) {
  return {
    planet:         b.planet,
    startDate:      b.startDate.toISOString(),
    endDate:        b.endDate.toISOString(),
    durationMonths: b.durationMonths,
  };
}

export type SerialisedMahadasha = {
  currentMahadasha: ReturnType<typeof serialiseDasha>;
  currentBhukti:    ReturnType<typeof serialiseBhukti>;
  allDashas:        ReturnType<typeof serialiseDasha>[];
  currentBhuktis:   ReturnType<typeof serialiseBhukti>[];
  percentElapsed:   number;
};

export function serialiseMahadashaResult(r: MahadashaResult): SerialisedMahadasha {
  return {
    currentMahadasha: serialiseDasha(r.currentMahadasha),
    currentBhukti:    serialiseBhukti(r.currentBhukti),
    allDashas:        r.allDashas.map(serialiseDasha),
    currentBhuktis:   r.currentBhuktis.map(serialiseBhukti),
    percentElapsed:   r.percentElapsed,
  };
}
