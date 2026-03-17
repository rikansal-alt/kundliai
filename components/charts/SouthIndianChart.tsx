"use client";

import { ChartProps, SignAbbr, SIGN_FULL, buildPlanetMap } from "./types";

const RAHU_KETU = new Set(["Ra", "Ke"]);

// Literal strings — no runtime math, identical on server and client.
// 12 rays at 30° intervals, inner r=18, outer r=30, centre (40,40).
// Values: 40 ± 18*cos/sin(i*30°) and 40 ± 30*cos/sin(i*30°), rounded to 4dp.
const RAYS: { x1: string; y1: string; x2: string; y2: string }[] = [
  { x1:"58",      y1:"40",      x2:"70",      y2:"40"      }, // 0°
  { x1:"55.5885", y1:"49",      x2:"65.9808", y2:"55"      }, // 30°
  { x1:"49",      y1:"55.5885", x2:"55",      y2:"65.9808" }, // 60°
  { x1:"40",      y1:"58",      x2:"40",      y2:"70"      }, // 90°
  { x1:"31",      y1:"55.5885", x2:"25",      y2:"65.9808" }, // 120°
  { x1:"24.4115", y1:"49",      x2:"14.0192", y2:"55"      }, // 150°
  { x1:"22",      y1:"40",      x2:"10",      y2:"40"      }, // 180°
  { x1:"24.4115", y1:"31",      x2:"14.0192", y2:"25"      }, // 210°
  { x1:"31",      y1:"24.4115", x2:"25",      y2:"14.0192" }, // 240°
  { x1:"40",      y1:"22",      x2:"40",      y2:"10"      }, // 270°
  { x1:"49",      y1:"24.4115", x2:"55",      y2:"14.0192" }, // 300°
  { x1:"55.5885", y1:"31",      x2:"65.9808", y2:"25"      }, // 330°
];

// Fixed sign positions in the 4×4 South Indian grid (clockwise from top-left):
//   Pi | Ar | Ta | Ge
//   Aq |  [blank]  | Ca
//   Cp |  [blank]  | Le
//   Sg | Sc | Li | Vi
const FLAT_GRID: { sign: SignAbbr | null; col: number; row: number }[] = [
  // row 1
  { sign: "Pi", col: 1, row: 1 }, { sign: "Ar", col: 2, row: 1 },
  { sign: "Ta", col: 3, row: 1 }, { sign: "Ge", col: 4, row: 1 },
  // row 2
  { sign: "Aq", col: 1, row: 2 }, { sign: null, col: 2, row: 2 },
  { sign: null, col: 3, row: 2 }, { sign: "Ca", col: 4, row: 2 },
  // row 3
  { sign: "Cp", col: 1, row: 3 }, { sign: null, col: 2, row: 3 },
  { sign: null, col: 3, row: 3 }, { sign: "Le", col: 4, row: 3 },
  // row 4
  { sign: "Sg", col: 1, row: 4 }, { sign: "Sc", col: 2, row: 4 },
  { sign: "Li", col: 3, row: 4 }, { sign: "Vi", col: 4, row: 4 },
];

const CORNER: Partial<Record<SignAbbr, string>> = {
  Pi: "rounded-tl-lg", Ge: "rounded-tr-lg",
  Sg: "rounded-bl-lg", Vi: "rounded-br-lg",
};

export default function SouthIndianChart({ lagnaSign, planets }: ChartProps) {
  const planetMap = buildPlanetMap(planets);
  const ascFull = SIGN_FULL[lagnaSign];

  return (
    <div className="bg-white rounded-xl shadow-xl border border-primary/10 p-2.5">
      {/*
        Aspect-ratio wrapper trick: paddingBottom: 100% forces a square height.
        The grid is absolutely inset so it fills the square exactly.
        This guarantees 1fr rows have a definite height to divide.
      */}
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        {/* Centre watermark */}
        <div
          className="pointer-events-none absolute"
          style={{ top: "25%", left: "25%", width: "50%", height: "50%",
                   display: "flex", flexDirection: "column", alignItems: "center",
                   justifyContent: "center", gap: 4, zIndex: 1 }}
        >
          <div style={{ opacity: 0.15, width: 36, height: 36, flexShrink: 0 }}>
            <svg viewBox="0 0 80 80" width="36" height="36">
              <circle cx="40" cy="40" r="14" fill="#d6880a" />
              {RAYS.map(({ x1, y1, x2, y2 }, i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#d6880a" strokeWidth="3" strokeLinecap="round" />
              ))}
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span style={{ fontSize: 10, color: "#d6880a", fontWeight: 700, lineHeight: 1 }}>{ascFull}</span>
            <span style={{ fontSize: 9, color: "#d6880a", fontWeight: 600, lineHeight: 1, opacity: 0.7 }}>Asc</span>
          </div>
        </div>

        {/* Absolute grid fills the padded square */}
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
          }}
        >
          {FLAT_GRID.map(({ sign, col, row }) =>
            sign === null ? (
              <div
                key={`blank-${col}-${row}`}
                style={{
                  gridColumn: col, gridRow: row,
                  background: "#FFF8E8",
                  border: "1px solid rgba(214,136,10,0.15)",
                }}
              />
            ) : (
              <div
                key={sign}
                className={`border border-primary/20 flex flex-col items-center justify-start gap-0.5 p-1 overflow-hidden ${CORNER[sign] ?? ""}`}
                style={{
                  gridColumn: col, gridRow: row,
                  background: sign === lagnaSign ? "rgba(214,136,10,0.10)" : undefined,
                }}
              >
                <span className="text-primary font-bold text-[10px] leading-tight mt-0.5">
                  {sign}
                </span>
                {sign === lagnaSign && (
                  <span className="text-[8px] font-black text-primary leading-tight">Asc</span>
                )}
                <div className="flex flex-col gap-0.5 items-center">
                  {(planetMap[sign] ?? []).map((p) => (
                    <span
                      key={p.name}
                      className="text-[9px] font-bold leading-tight"
                      style={{ color: p.color }}
                    >
                      {p.abbr}{p.retrograde && !RAHU_KETU.has(p.abbr) ? "℞" : ""}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
