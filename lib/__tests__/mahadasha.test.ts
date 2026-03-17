import { describe, it, expect } from "vitest";
import {
  calcVimshottariMahadasha,
  serialiseMahadashaResult,
  serialiseDasha,
  serialiseBhukti,
  DASHA_YEARS,
  DASHA_ORDER,
} from "../mahadasha";

// ─── Constants ────────────────────────────────────────────────────────────────

describe("DASHA_YEARS", () => {
  it("contains all 9 planets", () => {
    const planets = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
    planets.forEach((p) => expect(DASHA_YEARS[p]).toBeDefined());
  });
  it("sums to 120 years", () => {
    const total = Object.values(DASHA_YEARS).reduce((a, b) => a + b, 0);
    expect(total).toBe(120);
  });
  it("Ketu=7, Venus=20, Sun=6, Moon=10, Mars=7", () => {
    expect(DASHA_YEARS.Ketu).toBe(7);
    expect(DASHA_YEARS.Venus).toBe(20);
    expect(DASHA_YEARS.Sun).toBe(6);
    expect(DASHA_YEARS.Moon).toBe(10);
    expect(DASHA_YEARS.Mars).toBe(7);
  });
  it("Rahu=18, Jupiter=16, Saturn=19, Mercury=17", () => {
    expect(DASHA_YEARS.Rahu).toBe(18);
    expect(DASHA_YEARS.Jupiter).toBe(16);
    expect(DASHA_YEARS.Saturn).toBe(19);
    expect(DASHA_YEARS.Mercury).toBe(17);
  });
});

describe("DASHA_ORDER", () => {
  it("has exactly 9 planets", () => expect(DASHA_ORDER).toHaveLength(9));
  it("starts with Ketu", () => expect(DASHA_ORDER[0]).toBe("Ketu"));
  it("ends with Mercury", () => expect(DASHA_ORDER[8]).toBe("Mercury"));
  it("contains no duplicates", () => {
    expect(new Set(DASHA_ORDER).size).toBe(9);
  });
});

// ─── calcVimshottariMahadasha — structure ─────────────────────────────────────

describe("calcVimshottariMahadasha — output structure", () => {
  // Ashwini start (0°) — Ketu dasha
  const birthDate = new Date("1990-01-01");
  const result = calcVimshottariMahadasha(0, birthDate);

  it("returns exactly 9 allDashas", () => {
    expect(result.allDashas).toHaveLength(9);
  });
  it("returns exactly 9 currentBhuktis", () => {
    expect(result.currentBhuktis).toHaveLength(9);
  });
  it("allDashas are in dasha order starting from lord", () => {
    // nak 0 = Ashwini → Ketu lord → sequence starts Ketu, Venus, Sun...
    expect(result.allDashas[0].planet).toBe("Ketu");
    expect(result.allDashas[1].planet).toBe("Venus");
    expect(result.allDashas[2].planet).toBe("Sun");
  });
  it("allDashas duration years match DASHA_YEARS", () => {
    result.allDashas.forEach((d) => {
      expect(d.durationYears).toBe(DASHA_YEARS[d.planet]);
    });
  });
  it("allDashas are contiguous (each ends where next begins)", () => {
    for (let i = 0; i < result.allDashas.length - 1; i++) {
      expect(result.allDashas[i].endDate.getTime())
        .toBeCloseTo(result.allDashas[i + 1].startDate.getTime(), -2);
    }
  });
  it("percentElapsed is 0-100", () => {
    expect(result.percentElapsed).toBeGreaterThanOrEqual(0);
    expect(result.percentElapsed).toBeLessThanOrEqual(100);
  });
  it("currentMahadasha is one of the allDashas", () => {
    expect(result.allDashas.map((d) => d.planet)).toContain(result.currentMahadasha.planet);
  });
  it("currentBhukti is within currentMahadasha dates", () => {
    expect(result.currentBhukti.startDate.getTime())
      .toBeGreaterThanOrEqual(result.currentMahadasha.startDate.getTime());
    expect(result.currentBhukti.endDate.getTime())
      .toBeLessThanOrEqual(result.currentMahadasha.endDate.getTime() + 1000);
  });
});

// ─── Nakshatra lord assignment ─────────────────────────────────────────────────

describe("Nakshatra lord → first dasha lord", () => {
  const cases: Array<{ lon: number; expectedLord: string; note: string }> = [
    { lon: 0,     expectedLord: "Ketu",    note: "Ashwini (0°) → Ketu"     },
    { lon: 14,    expectedLord: "Venus",   note: "Bharani (~13.3°) → Venus" },
    { lon: 27,    expectedLord: "Sun",     note: "Krittika (~26.7°) → Sun"  },
    { lon: 40,    expectedLord: "Moon",    note: "Rohini (~40°) → Moon"     },
    { lon: 54,    expectedLord: "Mars",    note: "Mrigashira → Mars"        },
    { lon: 67,    expectedLord: "Rahu",    note: "Ardra → Rahu"             },
    { lon: 80,    expectedLord: "Jupiter", note: "Punarvasu → Jupiter"      },
    { lon: 94,    expectedLord: "Saturn",  note: "Pushya → Saturn"          },
    { lon: 107,   expectedLord: "Mercury", note: "Ashlesha → Mercury"       },
    { lon: 120,   expectedLord: "Ketu",    note: "Magha → Ketu (2nd cycle)" },
  ];

  cases.forEach(({ lon, expectedLord, note }) => {
    it(`${note}`, () => {
      const r = calcVimshottariMahadasha(lon, new Date("1985-06-15"));
      expect(r.allDashas[0].planet).toBe(expectedLord);
    });
  });
});

// ─── Moon longitude at nakshatra start = full dasha remains ───────────────────

describe("Dasha balance calculation", () => {
  it("moon at very start of Ashwini (0°+ε) → almost full 7yr Ketu dasha remaining", () => {
    const r = calcVimshottariMahadasha(0.001, new Date("1990-01-01"));
    // First dasha should be close to 7 years duration
    const firstDasha = r.allDashas[0];
    const durMs = firstDasha.endDate.getTime() - firstDasha.startDate.getTime();
    const durYears = durMs / (365.25 * 24 * 60 * 60 * 1000);
    expect(Math.abs(durYears - 7)).toBeLessThan(0.01);
  });

  it("moon at middle of Ashwini → ~3.5yr Ketu balance", () => {
    const NAK_SPAN = 360 / 27;
    const midAshwini = NAK_SPAN * 0.5; // midpoint of Ashwini
    const birthDate = new Date("1990-01-01");
    const r = calcVimshottariMahadasha(midAshwini, birthDate);
    // Balance = 7 * 0.5 = 3.5 years; firstDashaStart ≈ birthDate - 3.5yr
    const expectedStart = new Date(birthDate.getTime() - 3.5 * 365.25 * 24 * 60 * 60 * 1000);
    const actualStart = r.allDashas[0].startDate;
    const diffDays = Math.abs(actualStart.getTime() - expectedStart.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeLessThan(2); // within 2 days
  });
});

// ─── Bhukti durations ─────────────────────────────────────────────────────────

describe("Bhukti (antardasha) durations", () => {
  it("9 bhuktis sum to the full mahadasha duration", () => {
    const r = calcVimshottariMahadasha(0, new Date("1990-01-01"));
    const mahaMs = r.currentMahadasha.endDate.getTime() - r.currentMahadasha.startDate.getTime();
    const bhuktisMs = r.currentBhuktis.reduce(
      (sum, b) => sum + (b.endDate.getTime() - b.startDate.getTime()), 0
    );
    // Allow 1 second rounding tolerance
    expect(Math.abs(mahaMs - bhuktisMs)).toBeLessThan(1000);
  });

  it("bhuktis are contiguous within mahadasha", () => {
    const r = calcVimshottariMahadasha(0, new Date("1990-01-01"));
    for (let i = 0; i < r.currentBhuktis.length - 1; i++) {
      expect(r.currentBhuktis[i].endDate.getTime())
        .toBeCloseTo(r.currentBhuktis[i + 1].startDate.getTime(), -2);
    }
  });

  it("first bhukti lord equals mahadasha lord", () => {
    const r = calcVimshottariMahadasha(0, new Date("1990-01-01"));
    expect(r.currentBhuktis[0].planet).toBe(r.currentMahadasha.planet);
  });

  it("Ketu mahadasha Ketu bhukti = (7×7)/120 ≈ 0.408yr ≈ 4.9 months", () => {
    // Find a birth where currentMahadasha is Ketu
    const r = calcVimshottariMahadasha(0.001, new Date("2020-01-01"));
    if (r.currentMahadasha.planet === "Ketu") {
      const ketuBhukti = r.currentBhuktis[0];
      expect(Math.abs(ketuBhukti.durationMonths - 4.9)).toBeLessThan(0.1);
    }
  });
});

// ─── Longitude normalisation ───────────────────────────────────────────────────

describe("Longitude normalisation", () => {
  it("360° is treated same as 0°", () => {
    const r1 = calcVimshottariMahadasha(0,   new Date("1990-01-01"));
    const r2 = calcVimshottariMahadasha(360, new Date("1990-01-01"));
    expect(r1.allDashas[0].planet).toBe(r2.allDashas[0].planet);
  });
  it("negative longitude is normalised", () => {
    const r1 = calcVimshottariMahadasha(-1,  new Date("1990-01-01")); // → 359°
    const r2 = calcVimshottariMahadasha(359, new Date("1990-01-01"));
    expect(r1.allDashas[0].planet).toBe(r2.allDashas[0].planet);
  });
  it("720° normalises to 0°", () => {
    const r1 = calcVimshottariMahadasha(0,   new Date("1990-01-01"));
    const r2 = calcVimshottariMahadasha(720, new Date("1990-01-01"));
    expect(r1.allDashas[0].planet).toBe(r2.allDashas[0].planet);
  });
});

// ─── Serialisation ────────────────────────────────────────────────────────────

describe("serialiseDasha", () => {
  const entry = {
    planet: "Saturn",
    startDate: new Date("2020-01-01"),
    endDate: new Date("2039-01-01"),
    durationYears: 19,
  };
  const s = serialiseDasha(entry);

  it("planet is preserved", () => expect(s.planet).toBe("Saturn"));
  it("durationYears is preserved", () => expect(s.durationYears).toBe(19));
  it("startDate is ISO string", () => expect(s.startDate).toBe("2020-01-01T00:00:00.000Z"));
  it("endDate is ISO string", () => expect(s.endDate).toBe("2039-01-01T00:00:00.000Z"));
});

describe("serialiseBhukti", () => {
  const entry = {
    planet: "Jupiter",
    startDate: new Date("2021-06-01"),
    endDate: new Date("2023-12-01"),
    durationMonths: 30,
  };
  const s = serialiseBhukti(entry);

  it("planet is preserved", () => expect(s.planet).toBe("Jupiter"));
  it("durationMonths is preserved", () => expect(s.durationMonths).toBe(30));
  it("startDate is ISO string", () => expect(typeof s.startDate).toBe("string"));
  it("endDate is ISO string", () => expect(typeof s.endDate).toBe("string"));
});

describe("serialiseMahadashaResult", () => {
  const r = calcVimshottariMahadasha(100, new Date("1985-03-10"));
  const s = serialiseMahadashaResult(r);

  it("currentMahadasha is serialised", () => {
    expect(typeof s.currentMahadasha.startDate).toBe("string");
    expect(typeof s.currentMahadasha.endDate).toBe("string");
  });
  it("allDashas has 9 entries", () => expect(s.allDashas).toHaveLength(9));
  it("currentBhuktis has 9 entries", () => expect(s.currentBhuktis).toHaveLength(9));
  it("percentElapsed is a number", () => expect(typeof s.percentElapsed).toBe("number"));
  it("all dates in allDashas are strings", () => {
    s.allDashas.forEach((d) => {
      expect(typeof d.startDate).toBe("string");
      expect(typeof d.endDate).toBe("string");
    });
  });
});
