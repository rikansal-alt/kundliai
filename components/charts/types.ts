// Shared types for all three chart renderers

export type SignAbbr =
  | "Ar" | "Ta" | "Ge" | "Ca" | "Le" | "Vi"
  | "Li" | "Sc" | "Sg" | "Cp" | "Aq" | "Pi";

export type ChartStyle = "south-indian" | "north-indian" | "bengali";

export interface ChartPlanet {
  name: string;
  abbr: string;
  sign: SignAbbr;
  house: number;
  degree: number;
  nakshatra: string;
  color: string;
  bg: string;
  retrograde?: boolean;
  symbol: string;
}

export interface ChartProps {
  lagnaSign: SignAbbr;
  planets: ChartPlanet[];
  size?: number;
}

// Ordered zodiac list (0 = Aries … 11 = Pisces)
export const ZODIAC: SignAbbr[] = [
  "Ar","Ta","Ge","Ca","Le","Vi","Li","Sc","Sg","Cp","Aq","Pi",
];

export const SIGN_FULL: Record<SignAbbr, string> = {
  Ar:"Aries",  Ta:"Taurus",   Ge:"Gemini",     Ca:"Cancer",
  Le:"Leo",    Vi:"Virgo",    Li:"Libra",       Sc:"Scorpio",
  Sg:"Sagittarius", Cp:"Capricorn", Aq:"Aquarius", Pi:"Pisces",
};

/** Returns how many houses clockwise sign is from lagna */
export function houseOf(sign: SignAbbr, lagna: SignAbbr): number {
  const li = ZODIAC.indexOf(lagna);
  const si = ZODIAC.indexOf(sign);
  return ((si - li + 12) % 12) + 1;
}

/** Sign that occupies a given house given a lagna */
export function signForHouse(house: number, lagna: SignAbbr): SignAbbr {
  const li = ZODIAC.indexOf(lagna);
  return ZODIAC[(li + house - 1) % 12];
}

/** Build sign → planets lookup */
export function buildPlanetMap(planets: ChartPlanet[]): Record<string, ChartPlanet[]> {
  const map: Record<string, ChartPlanet[]> = {};
  for (const p of planets) {
    if (!map[p.sign]) map[p.sign] = [];
    map[p.sign].push(p);
  }
  return map;
}
