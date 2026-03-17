/**
 * Vimshottari Gun Milan (Ashta Koot) — 36-point compatibility score
 *
 * All 8 Koots derive from both parties' Moon nakshatra (0-26) and Moon
 * sign index (0-11). Never uses ascendant, sun sign, or city.
 *
 * Max points: Varna=1, Vashya=2, Tara=3, Yoni=4,
 *             Graha Maitri=5, Gana=6, Bhakut=7, Nadi=8 → Total 36
 */

// ─── Zodiac constants (exported for display use) ─────────────────────────────

export const SIGN_LIST = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

export const NAKSHATRA_LIST = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati",
];

/**
 * Map nakshatra index (0-26) → Moon sign index (0-11).
 * Derived from start-longitude: floor(nak * (360/27) / 30).
 */
export const NAK_TO_SIGN: number[] =
  [0,0,0,1,1,2,2,3,3,4,4,4,5,5,6,6,7,7,8,8,8,9,9,10,10,11,11];

export function nakIdx(name: string): number {
  const i = NAKSHATRA_LIST.indexOf(name);
  return i >= 0 ? i : -1; // -1 = invalid / unknown
}
export function sgnIdx(name: string): number {
  const i = SIGN_LIST.indexOf(name);
  return i >= 0 ? i : -1;
}

// ─── Koot lookup tables ───────────────────────────────────────────────────────

// VARNA — Moon sign → varna rank (0=Brahmin highest, 3=Shudra lowest)
// Water=Brahmin, Fire=Kshatriya, Earth=Vaishya, Air=Shudra
const VARNA = [1,2,3,0,1,2,3,0,1,2,3,0]; // by sign index 0-11

// VASHYA — Moon sign group
// 0=Chatushpada, 1=Jalachara, 2=Manava, 3=Keeta
const VASHYA_GROUP = [0,0,2,1,0,2,2,3,0,0,2,1]; // by sign index

// Vashya compatibility [boyGroup][girlGroup] → points
const VASHYA_COMPAT: number[][] = [
  //       Chat Jan Man Keet
  /* Chat */ [2,  1,  0,  1],
  /* Jan  */ [1,  2,  1,  0],
  /* Man  */ [0,  1,  2,  1],
  /* Keet */ [1,  0,  1,  2],
];

// YONI — nakshatra → animal (0-13)
// 0=Horse, 1=Elephant, 2=Goat/Sheep, 3=Serpent, 4=Dog,
// 5=Cat,   6=Rat,      7=Cow,        8=Buffalo,  9=Tiger,
// 10=Deer, 11=Monkey,  12=Mongoose,  13=Lion
const YONI_ANIMAL: number[] = [
//  0    1    2    3    4    5    6    7    8    9   10   11   12   13
  0,   1,   2,   3,   3,   4,   5,   2,   5,   6,   6,   7,   8,   9,
  8,   9,  10,  10,   4,  11,  12,  11,  13,   0,  13,   7,   1,
];

// Natural enemy animal pairs — score 0
const YONI_ENEMIES: [number, number][] = [
  [0, 8],   // Horse ↔ Buffalo
  [1, 13],  // Elephant ↔ Lion
  [2, 11],  // Goat ↔ Monkey
  [3, 12],  // Serpent ↔ Mongoose
  [4, 10],  // Dog ↔ Deer
  [5, 6],   // Cat ↔ Rat
  [7, 9],   // Cow ↔ Tiger
];

// GANA — nakshatra → temperament (0=Deva, 1=Manav, 2=Rakshasa)
const GANA: number[] = [
  0,1,2,0,0,2,0,0,2,2,1,1,0,2,0,1,0,2,2,1,1,0,1,2,0,1,0,
];

// NADI — nakshatra → nadi (0=Aadi, 1=Madhya, 2=Antya)
const NADI: number[] = [
  0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,
];

// PLANET LORDS of Moon signs
const SIGN_LORD = [
  "Mars","Venus","Mercury","Moon","Sun","Mercury",
  "Venus","Mars","Jupiter","Saturn","Saturn","Jupiter",
];

// Natural planetary friendships: +1=friend, 0=neutral, -1=enemy
const PLANET_REL: Record<string, Record<string, number>> = {
  Sun:     { Moon:1, Mars:1, Jupiter:1, Mercury:0, Venus:-1, Saturn:-1 },
  Moon:    { Sun:1, Mercury:1, Mars:0, Jupiter:0, Venus:0, Saturn:0 },
  Mars:    { Sun:1, Moon:1, Jupiter:1, Venus:0, Saturn:0, Mercury:-1 },
  Mercury: { Sun:1, Venus:1, Mars:0, Jupiter:0, Saturn:0, Moon:-1 },
  Jupiter: { Sun:1, Moon:1, Mars:1, Saturn:0, Mercury:-1, Venus:-1 },
  Venus:   { Mercury:1, Saturn:1, Mars:0, Jupiter:0, Sun:-1, Moon:-1 },
  Saturn:  { Mercury:1, Venus:1, Jupiter:0, Sun:-1, Moon:-1, Mars:-1 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KootResult {
  name:     string;
  maxPts:   number;
  score:    number;
  status:   "excellent" | "good" | "neutral" | "dosha";
  detail:   string;
}

export interface GunMilanResult {
  koots:       KootResult[];
  totalScore:  number;
  maxScore:    36;
  rating:      "Excellent Match" | "Good Match" | "Average Match" | "Not Recommended";
  ratingColor: string;
  summary:     string;
  nadiDosha:   boolean;
  bhakutDosha: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function yoniEnemy(a: number, b: number): boolean {
  return YONI_ENEMIES.some(([x, y]) => (x===a && y===b) || (x===b && y===a));
}

function planetRel(a: string, b: string): number {
  return PLANET_REL[a]?.[b] ?? 0;
}

// ─── Calculator ──────────────────────────────────────────────────────────────

export function calcGunMilan(
  boyNak: number,  // 0-26  (Moon nakshatra index)
  boySgn: number,  // 0-11  (Moon sign index)
  girlNak: number,
  girlSgn: number,
): GunMilanResult {
  // Clamp to valid ranges
  const bNk = Math.max(0, Math.min(26, boyNak));
  const gNk = Math.max(0, Math.min(26, girlNak));
  const bSg = Math.max(0, Math.min(11, boySgn));
  const gSg = Math.max(0, Math.min(11, girlSgn));

  const koots: KootResult[] = [];

  // ── 1. Varna (1 pt) ──────────────────────────────────────────────────────
  // Score 1 if groom's varna rank ≥ bride's (i.e. bVar number ≤ gVar number)
  const bVar = VARNA[bSg], gVar = VARNA[gSg];
  const varnaScore = bVar <= gVar ? 1 : 0;
  koots.push({
    name: "Varna", maxPts: 1, score: varnaScore,
    status: varnaScore === 1 ? "good" : "neutral",
    detail: varnaScore === 1 ? "Compatible caste temperaments" : "Varna mismatch (minor)",
  });

  // ── 2. Vashya (2 pts) ──────────────────────────────────────────────────
  const bVash = VASHYA_GROUP[bSg], gVash = VASHYA_GROUP[gSg];
  const vashyaScore = VASHYA_COMPAT[bVash][gVash];
  koots.push({
    name: "Vashya", maxPts: 2, score: vashyaScore,
    status: vashyaScore === 2 ? "excellent" : vashyaScore === 1 ? "good" : "neutral",
    detail: vashyaScore === 2 ? "Strong mutual attraction" : vashyaScore === 1 ? "One-sided compatibility" : "Weak magnetism",
  });

  // ── 3. Tara (3 pts) ────────────────────────────────────────────────────
  // Count from bride's nak to groom's nak mod 9 → remainder 1-9
  // Auspicious if even (2,4,6,8) or 9 (Param Mitra); inauspicious if odd 1,3,5,7
  const boyTara  = ((gNk - bNk + 27) % 27) % 9 + 1; // groom seen from bride
  const girlTara = ((bNk - gNk + 27) % 27) % 9 + 1; // bride seen from groom
  const taraGood = (n: number) => [2,4,6,8,9].includes(n);
  const bt = taraGood(boyTara), gt = taraGood(girlTara);
  const taraScore = bt && gt ? 3 : (bt || gt) ? 1 : 0;
  koots.push({
    name: "Tara", maxPts: 3, score: taraScore,
    status: taraScore === 3 ? "excellent" : taraScore > 0 ? "good" : "dosha",
    detail: taraScore === 3 ? "Auspicious stars from both sides"
          : taraScore > 0   ? "One-sided star compatibility"
                            : "Tara Dosha — inauspicious star positions",
  });

  // ── 4. Yoni (4 pts) ────────────────────────────────────────────────────
  const bYoni = YONI_ANIMAL[bNk], gYoni = YONI_ANIMAL[gNk];
  const yoniScore = bYoni === gYoni ? 4 : yoniEnemy(bYoni, gYoni) ? 0 : 2;
  const ANIMAL_NAMES = ["Horse","Elephant","Goat","Serpent","Dog","Cat","Rat","Cow","Buffalo","Tiger","Deer","Monkey","Mongoose","Lion"];
  koots.push({
    name: "Yoni", maxPts: 4, score: yoniScore,
    status: yoniScore === 4 ? "excellent" : yoniScore === 2 ? "good" : "dosha",
    detail: yoniScore === 4
      ? `Same ${ANIMAL_NAMES[bYoni]} yoni — deep physical harmony`
      : yoniScore === 2
      ? `${ANIMAL_NAMES[bYoni]} & ${ANIMAL_NAMES[gYoni]} — compatible`
      : `${ANIMAL_NAMES[bYoni]} & ${ANIMAL_NAMES[gYoni]} — Yoni Dosha`,
  });

  // ── 5. Graha Maitri (5 pts) ─────────────────────────────────────────────
  const bLord = SIGN_LORD[bSg], gLord = SIGN_LORD[gSg];
  const bg = planetRel(bLord, gLord), gb = planetRel(gLord, bLord);
  const gmScore =
    bg === 1  && gb === 1  ? 5 :
    bg === 1  && gb === 0  ? 4 :
    bg === 0  && gb === 1  ? 4 :
    bg === 0  && gb === 0  ? 3 :
    bg === 1  && gb === -1 ? 2 :
    bg === -1 && gb === 1  ? 2 :
    bg === 0  && gb === -1 ? 1 :
    bg === -1 && gb === 0  ? 1 : 0;
  koots.push({
    name: "Graha Maitri", maxPts: 5, score: gmScore,
    status: gmScore >= 4 ? "excellent" : gmScore >= 2 ? "good" : gmScore === 1 ? "neutral" : "dosha",
    detail: `${bLord} (${SIGN_LIST[bSg]}) & ${gLord} (${SIGN_LIST[gSg]}) — ${
      gmScore === 5 ? "mutual friends" : gmScore >= 4 ? "friendly" :
      gmScore >= 3 ? "neutral" : gmScore >= 2 ? "one-sided" : "conflicting"
    }`,
  });

  // ── 6. Gana (6 pts) ─────────────────────────────────────────────────────
  const bGana = GANA[bNk], gGana = GANA[gNk];
  // Deva+Deva=6, Manav+Manav=6, Raksha+Raksha=6
  // Deva+Manav=5, Manav+Deva=5
  // Deva+Raksha=1, Raksha+Deva=1
  // Manav+Raksha=0, Raksha+Manav=0
  const ganaMatrix: number[][] = [
    //  Dev  Man  Rak
    [  6,   5,   1], // Deva
    [  5,   6,   0], // Manav   ← corrected: Manav+Manav = 6
    [  1,   0,   6], // Rakshasa
  ];
  const ganaScore = ganaMatrix[bGana][gGana];
  const GANA_NAMES = ["Deva","Manav","Rakshasa"];
  koots.push({
    name: "Gana", maxPts: 6, score: ganaScore,
    status: ganaScore >= 5 ? "excellent" : ganaScore >= 3 ? "good" : ganaScore === 1 ? "neutral" : "dosha",
    detail: `${GANA_NAMES[bGana]} × ${GANA_NAMES[gGana]} — ${
      ganaScore === 6 ? "same temperament" :
      ganaScore === 5 ? "harmonious natures" :
      ganaScore === 1 ? "tension present" : "conflicting temperaments"
    }`,
  });

  // ── 7. Bhakut (7 pts) ───────────────────────────────────────────────────
  // Based on relative Moon sign positions (1-12 in each direction)
  // Doshas (0 pts): 6/8, 2/12 → reduce trust significantly
  // Auspicious: 1/1 (same), 7/7 (Kendra)
  // Medium: 3/11 Trine, 4/10
  const fwd = ((gSg - bSg + 12) % 12) + 1;
  const rev = ((bSg - gSg + 12) % 12) + 1;
  const is68 = (fwd === 6 && rev === 8) || (fwd === 8 && rev === 6);
  const is212 = (fwd === 2 && rev === 12) || (fwd === 12 && rev === 2);
  const bhakutDosa = is68 || is212;
  const bhakutScore =
    bhakutDosa           ? 0 :
    fwd === 1            ? 7 : // same sign
    fwd === 7            ? 7 : // 7th from each other (Saptama — great for marriage)
    (fwd === 3 || fwd === 11) ? 5 :
    (fwd === 4 || fwd === 10) ? 5 :
    (fwd === 5 || fwd === 9)  ? 3 : 3;
  koots.push({
    name: "Bhakut", maxPts: 7, score: bhakutScore,
    status: bhakutScore >= 6 ? "excellent" : bhakutScore >= 4 ? "good" : bhakutScore >= 2 ? "neutral" : "dosha",
    detail: is68  ? "6/8 Bhakut Dosha — adversarial sign positions" :
            is212 ? "2/12 Bhakut Dosha — financially challenging" :
            fwd === 1 ? "Same sign — perfect union" :
            fwd === 7 ? "7th from each other — ideal for marriage" :
            "Compatible sign relationship",
  });

  // ── 8. Nadi (8 pts) — MOST IMPORTANT ────────────────────────────────────
  const bNadi = NADI[bNk], gNadi = NADI[gNk];
  const nadiSame = bNadi === gNadi;
  const nadiScore = nadiSame ? 0 : 8; // SAME = 0 (Nadi Dosha), DIFFERENT = 8
  const NADI_NAMES = ["Aadi","Madhya","Antya"];
  koots.push({
    name: "Nadi", maxPts: 8, score: nadiScore,
    status: nadiScore === 8 ? "excellent" : "dosha",
    detail: nadiSame
      ? `Both ${NADI_NAMES[bNadi]} Nadi — Nadi Dosha (health & progeny concerns)`
      : `${NADI_NAMES[bNadi]} × ${NADI_NAMES[gNadi]} Nadi — excellent`,
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalScore = koots.reduce((s, k) => s + k.score, 0);

  const rating: GunMilanResult["rating"] =
    totalScore >= 33 ? "Excellent Match" :
    totalScore >= 25 ? "Good Match"      :
    totalScore >= 18 ? "Average Match"   : "Not Recommended";

  const ratingColor =
    totalScore >= 33 ? "#16a34a" :
    totalScore >= 25 ? "#0d9488" :
    totalScore >= 18 ? "#d97706" : "#dc2626";

  const summary =
    totalScore >= 33 ? "An exceptional match — the stars strongly favour this union." :
    totalScore >= 25 ? "A good match with solid compatibility across most koots." :
    totalScore >= 18 ? "An average match. Some challenges exist but can be navigated with awareness." :
                       "Challenging combination. Traditional astrology recommends consulting a qualified Jyotishi and exploring remedies before proceeding.";

  return {
    koots, totalScore, maxScore: 36,
    rating, ratingColor, summary,
    nadiDosha: nadiSame,
    bhakutDosha: bhakutDosa,
  };
}
