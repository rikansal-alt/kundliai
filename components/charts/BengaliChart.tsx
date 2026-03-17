"use client";

/**
 * Bengali / East Indian Kundli
 *
 * 4×4 CSS grid, outer ring = 12 houses, centre 2×2 = blank tinted.
 *
 * House positions (row, col — 0-indexed):
 *   H2  (0,0)  H1  (0,1)  H12 (0,2)  H11 (0,3)
 *   H3  (1,0)  [blank]    [blank]     H10 (1,3)
 *   H4  (2,0)  [blank]    [blank]     H9  (2,3)
 *   H5  (3,0)  H6  (3,1)  H7  (3,2)  H8  (3,3)
 *
 * House 1 = Lagna sign. Signs increment counter-clockwise
 * from H1 for houses 2→12, but in the grid they go clockwise
 * starting from H1 at (0,1).
 */

import { ChartProps, SignAbbr, signForHouse, ChartPlanet } from "./types";

const PRIMARY = "#d6880a";
const BORDER  = "rgba(214,136,10,0.2)";

// Literal strings — no runtime math, identical on server and client.
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

// Grid positions: [row, col] for each house (0-indexed)
const HOUSE_POSITIONS: Record<number, [number, number]> = {
  1:  [0, 1],
  2:  [0, 0],
  3:  [1, 0],
  4:  [2, 0],
  5:  [3, 0],
  6:  [3, 1],
  7:  [3, 2],
  8:  [3, 3],
  9:  [2, 3],
  10: [1, 3],
  11: [0, 3],
  12: [0, 2],
};

const CORNER_RADIUS: Record<string, string> = {
  "0-0": "rounded-tl-lg",
  "0-3": "rounded-tr-lg",
  "3-0": "rounded-bl-lg",
  "3-3": "rounded-br-lg",
};

function planetsInHouse(house: number, planets: ChartPlanet[]): ChartPlanet[] {
  return planets.filter((p) => p.house === house);
}

export default function BengaliChart({ lagnaSign, planets }: ChartProps) {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-xl border border-primary/10">
      {/* Aspect-ratio wrapper — gives grid a definite height so 1fr rows work */}
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>

        {/* Centre watermark sits in the aspect-ratio layer */}
        <div
          className="pointer-events-none opacity-[0.10]"
          style={{
            position: "absolute", zIndex: 2,
            top: "25%", left: "25%",
            width: "50%", height: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 80 80" width="100%" height="100%">
            <circle cx="40" cy="40" r="14" fill={PRIMARY} />
            {RAYS.map(({ x1, y1, x2, y2 }, i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={PRIMARY} strokeWidth="3" strokeLinecap="round" />
            ))}
          </svg>
        </div>

        {/* Grid fills the square absolutely */}
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
          }}
        >

        {/* 12 outer house cells */}
        {Object.entries(HOUSE_POSITIONS).map(([hStr, [row, col]]) => {
          const house = Number(hStr);
          const isLagna = house === 1;
          const sign: SignAbbr = signForHouse(house, lagnaSign);
          const hPlanets = planetsInHouse(house, planets);
          const cornerKey = `${row}-${col}`;

          return (
            <div
              key={house}
              className={`border flex flex-col items-center justify-start gap-0.5 p-1 ${CORNER_RADIUS[cornerKey] ?? ""}`}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                borderColor: BORDER,
                background: isLagna ? "rgba(214,136,10,0.09)" : "#fff",
              }}
            >
              {/* House number */}
              <span className="text-[8px] font-medium leading-none" style={{ color: "#94a3b8" }}>
                {house}
              </span>
              {/* Sign */}
              <span
                className="text-[10px] font-bold leading-none mt-0.5"
                style={{ color: isLagna ? PRIMARY : "#475569" }}
              >
                {sign}
              </span>
              {isLagna && (
                <span className="text-[7px] font-black leading-none" style={{ color: PRIMARY }}>
                  Asc
                </span>
              )}
              {/* Planets */}
              <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                {hPlanets.map((p) => (
                  <span
                    key={p.name}
                    className="text-[8px] font-bold leading-none"
                    style={{ color: p.color }}
                  >
                    {p.abbr}{p.retrograde ? "℞" : ""}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Centre 2×2 blank cells */}
        {[[1, 1], [1, 2], [2, 1], [2, 2]].map(([r, c]) => (
          <div
            key={`blank-${r}-${c}`}
            style={{
              gridColumn: c + 1,
              gridRow: r + 1,
              background: "#FFF8E8",
              border: `1px solid rgba(214,136,10,0.12)`,
            }}
          />
        ))}
        </div>{/* end grid */}
      </div>{/* end aspect-ratio wrapper */}
    </div>
  );
}
