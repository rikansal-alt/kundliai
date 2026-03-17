"use client";

/**
 * North Indian (Uttara Bharatiya) Kundli
 *
 * Layout — 3×3 outer grid, centre divided into 4 triangular houses:
 *
 *   H12 │ H1  │ H2
 *   ────┼─────┼────
 *   H11 │ H7┬H4 │ H3
 *       │ H6┴H5 │
 *   ────┼─────┼────
 *   H10 │ H9  │ H8
 *
 * Centre SVG triangles (clockwise from right):
 *   H4 = right  triangle
 *   H5 = bottom triangle
 *   H6 = left   triangle
 *   H7 = top    triangle
 */

import { ChartProps, SignAbbr, signForHouse, SIGN_FULL, ChartPlanet } from "./types";

const PRIMARY = "#d6880a";
const BORDER  = "rgba(214,136,10,0.25)";

// ── helpers ──────────────────────────────────────────────────────────────────

function planetsInHouse(house: number, planets: ChartPlanet[]): ChartPlanet[] {
  return planets.filter((p) => p.house === house);
}

// House cell labels: house number small on top, sign abbr below
function HouseCell({
  house,
  lagnaSign,
  planets,
  isLagna,
  style,
  className = "",
}: {
  house: number;
  lagnaSign: SignAbbr;
  planets: ChartPlanet[];
  isLagna: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  const sign = signForHouse(house, lagnaSign);
  const hPlanets = planetsInHouse(house, planets);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 overflow-hidden ${className}`}
      style={{
        border: `1px solid ${BORDER}`,
        background: isLagna ? "rgba(214,136,10,0.08)" : "#fff",
        position: "relative",
        ...style,
      }}
    >
      {/* House number */}
      <span className="text-[8px] font-medium leading-none" style={{ color: "#94a3b8" }}>
        {house}
      </span>
      {/* Sign */}
      <span
        className="text-[10px] font-bold leading-none"
        style={{ color: isLagna ? PRIMARY : "#475569" }}
      >
        {sign}
      </span>
      {isLagna && (
        <span className="text-[7px] font-black leading-none" style={{ color: PRIMARY }}>Asc</span>
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
}

// ── main component ────────────────────────────────────────────────────────────

export default function NorthIndianChart({ lagnaSign, planets }: ChartProps) {
  // The 3×3 outer grid positions map to houses:
  // [H12, H1, H2] [H11, ctr, H3] [H10, H9, H8]
  const outerHouses: { house: number; gridCol: number; gridRow: number }[] = [
    { house: 12, gridCol: 1, gridRow: 1 },
    { house: 1,  gridCol: 2, gridRow: 1 },
    { house: 2,  gridCol: 3, gridRow: 1 },
    { house: 11, gridCol: 1, gridRow: 2 },
    { house: 3,  gridCol: 3, gridRow: 2 },
    { house: 10, gridCol: 1, gridRow: 3 },
    { house: 9,  gridCol: 2, gridRow: 3 },
    { house: 8,  gridCol: 3, gridRow: 3 },
  ];

  // Inner diamond houses 4-7; rendered as SVG polygons inside the centre cell.
  // The centre cell occupies gridCol 2, gridRow 2 (one third of the chart each side).
  // We'll use a 99×99 SVG viewport matching the cell size.
  const S = 99; // centre cell size in SVG user units
  const mid = S / 2; // 49.5

  // Polygon points for each inner house (clockwise from right)
  const innerHouses: { house: number; points: string; labelX: number; labelY: number }[] = [
    {
      house: 4,
      points: `${S},0 ${S},${S} ${mid},${mid}`,
      labelX: S * 0.78, labelY: mid,
    },
    {
      house: 5,
      points: `${S},${S} 0,${S} ${mid},${mid}`,
      labelX: mid, labelY: S * 0.78,
    },
    {
      house: 6,
      points: `0,${S} 0,0 ${mid},${mid}`,
      labelX: S * 0.22, labelY: mid,
    },
    {
      house: 7,
      points: `0,0 ${S},0 ${mid},${mid}`,
      labelX: mid, labelY: S * 0.22,
    },
  ];

  return (
    <div className="bg-white rounded-xl p-2.5 shadow-xl border border-primary/10">
      {/* Aspect-ratio wrapper keeps grid rows definite */}
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
      <div
        className="absolute inset-0"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gridTemplateRows: "repeat(3,1fr)",
        }}
      >
        {/* Outer 8 house cells */}
        {outerHouses.map(({ house, gridCol, gridRow }) => {
          const isLagna = house === 1;
          const corners: Record<string, string> = {
            "1-1": "rounded-tl-lg",
            "3-1": "rounded-tr-lg",
            "1-3": "rounded-bl-lg",
            "3-3": "rounded-br-lg",
          };
          return (
            <HouseCell
              key={house}
              house={house}
              lagnaSign={lagnaSign}
              planets={planets}
              isLagna={isLagna}
              className={corners[`${gridCol}-${gridRow}`] ?? ""}
              style={{ gridColumn: gridCol, gridRow }}
            />
          );
        })}

        {/* Centre cell — SVG with 4 inner triangular houses */}
        <div
          style={{
            gridColumn: 2,
            gridRow: 2,
            position: "relative",
            border: `1px solid ${BORDER}`,
            background: "#fff",
          }}
        >
          <svg
            viewBox={`0 0 ${S} ${S}`}
            width="100%"
            height="100%"
            style={{ display: "block", overflow: "visible" }}
          >
            {innerHouses.map(({ house, points, labelX, labelY }) => {
              const isLagna = house === 1;
              const bg = isLagna ? "rgba(214,136,10,0.08)" : "#fff";
              const hPlanets = planetsInHouse(house, planets);
              const sign = signForHouse(house, lagnaSign);

              return (
                <g key={house}>
                  <polygon
                    points={points}
                    fill={bg}
                    stroke={BORDER}
                    strokeWidth="0.8"
                  />
                  {/* House number */}
                  <text
                    x={labelX} y={labelY - 11}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fill="#94a3b8" fontWeight="500"
                  >
                    {house}
                  </text>
                  {/* Sign abbr */}
                  <text
                    x={labelX} y={labelY - 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="9" fill={isLagna ? PRIMARY : "#475569"} fontWeight="700"
                  >
                    {sign}
                  </text>
                  {/* Asc label */}
                  {isLagna && (
                    <text
                      x={labelX} y={labelY + 7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="6.5" fill={PRIMARY} fontWeight="900"
                    >
                      Asc
                    </text>
                  )}
                  {/* Planet abbreviations */}
                  {hPlanets.map((p, idx) => (
                    <text
                      key={p.name}
                      x={labelX + (idx % 2 === 0 ? -7 : 7)}
                      y={labelY + 14 + Math.floor(idx / 2) * 9}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="7.5" fill={p.color} fontWeight="700"
                    >
                      {p.abbr}{p.retrograde ? "℞" : ""}
                    </text>
                  ))}
                </g>
              );
            })}

            {/* Divider lines */}
            <line x1="0" y1="0" x2={S} y2={S} stroke={BORDER} strokeWidth="0.8" />
            <line x1={S} y1="0" x2="0" y2={S} stroke={BORDER} strokeWidth="0.8" />
          </svg>
        </div>{/* end centre cell */}
      </div>{/* end grid */}
      </div>{/* end aspect-ratio wrapper */}
    </div>
  );
}
