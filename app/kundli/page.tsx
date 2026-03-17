"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import ChartRenderer, { ChartStyle, ChartPlanet, SignAbbr } from "@/components/charts/ChartRenderer";
import { ZODIAC, SIGN_FULL, houseOf } from "@/components/charts/types";

// ─── Sample chart data ────────────────────────────────────────────────────────
// Scorpio lagna · Reecha · 15/08/1990 New Delhi

const LAGNA_SIGN: SignAbbr = "Sc";

const PLANETS: ChartPlanet[] = [
  { name: "Sun",     abbr: "Su", sign: "Ca", house: 9,  degree: 28.56, nakshatra: "Ashlesha",       color: "#C47800", bg: "#FEF3C7", symbol: "☉", retrograde: false },
  { name: "Moon",    abbr: "Mo", sign: "Ta", house: 7,  degree: 21.31, nakshatra: "Rohini",          color: "#1D4ED8", bg: "#EFF6FF", symbol: "☽", retrograde: false },
  { name: "Mars",    abbr: "Ma", sign: "Ar", house: 6,  degree: 27.58, nakshatra: "Krittika",        color: "#DC2626", bg: "#FEF2F2", symbol: "♂", retrograde: false },
  { name: "Mercury", abbr: "Me", sign: "Le", house: 10, degree: 25.57, nakshatra: "Purva Phalguni",  color: "#16A34A", bg: "#F0FDF4", symbol: "☿", retrograde: false },
  { name: "Jupiter", abbr: "Ju", sign: "Ge", house: 8,  degree: 2.45,  nakshatra: "Mrigashira",      color: "#D97706", bg: "#FFFBEB", symbol: "♃", retrograde: false },
  { name: "Venus",   abbr: "Ve", sign: "Ca", house: 9,  degree: 5.78,  nakshatra: "Pushya",          color: "#BE185D", bg: "#FDF2F8", symbol: "♀", retrograde: false },
  { name: "Saturn",  abbr: "Sa", sign: "Cp", house: 3,  degree: 19.22, nakshatra: "Shravana",        color: "#475569", bg: "#F1F5F9", symbol: "♄", retrograde: false },
  { name: "Rahu",    abbr: "Ra", sign: "Aq", house: 4,  degree: 11.33, nakshatra: "Shatabhisha",     color: "#7C3AED", bg: "#F5F3FF", symbol: "☊", retrograde: true  },
  { name: "Ketu",    abbr: "Ke", sign: "Le", house: 10, degree: 11.33, nakshatra: "Uttara Phalguni", color: "#92400E", bg: "#FFF7ED", symbol: "☋", retrograde: true  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

type TabKey = "Ascendant" | "Moon" | "Sun" | "Dasha";

const MOON_SIGN = PLANETS.find(p => p.name === "Moon")!.sign;
const SUN_SIGN  = PLANETS.find(p => p.name === "Sun")!.sign;

const LAGNA_FOR_TAB: Record<TabKey, SignAbbr> = {
  Ascendant: LAGNA_SIGN,
  Moon:      MOON_SIGN,
  Sun:       SUN_SIGN,
  Dasha:     LAGNA_SIGN,
};

const TAB_LABEL: Record<TabKey, string> = {
  Ascendant: "Lagna Chart",
  Moon:      "Chandra Chart",
  Sun:       "Surya Chart",
  Dasha:     "Dasha Timeline",
};

const STYLE_LABELS: { key: ChartStyle; label: string }[] = [
  { key: "south-indian", label: "South Indian" },
  { key: "north-indian", label: "North Indian" },
  { key: "bengali",      label: "Bengali" },
];

const LS_KEY = "jyotish_chart_style";

// ─── Planet symbol badge ──────────────────────────────────────────────────────

function PlanetSymbol({ planet, size = 20 }: { planet: ChartPlanet; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{
        width: size, height: size,
        background: planet.bg,
        color: planet.color,
        fontSize: size * 0.55,
        border: `1px solid ${planet.color}30`,
      }}
    >
      {planet.symbol}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface StoredDasha {
  planet: string;
  startDate: string;
  endDate: string;
}

interface StoredMahadasha {
  allDashas:         StoredDasha[];
  currentBhuktis:    StoredDasha[];
  currentMahadasha:  StoredDasha;
  currentBhukti:     StoredDasha;
  percentElapsed:    number;
}

export default function KundliPage() {
  const router = useRouter();
  const [activeTab,    setActiveTab]    = useState<TabKey>("Ascendant");
  const [chartStyle,   setChartStyle]   = useState<ChartStyle>("south-indian");
  const [dashaData,    setDashaData]    = useState<StoredMahadasha | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap?.mahadasha) setDashaData(snap.mahadasha as StoredMahadasha);
      }
    } catch { /* ignore */ }
  }, []);

  // Hydrate style preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as ChartStyle | null;
    if (stored && ["south-indian", "north-indian", "bengali"].includes(stored)) {
      setChartStyle(stored);
    }
  }, []);

  function switchStyle(s: ChartStyle) {
    setChartStyle(s);
    localStorage.setItem(LS_KEY, s);
    // Persist to server (fire-and-forget, no userId wired yet)
    fetch("/api/user/preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chartStyle: s }),
    }).catch(() => {/* silent */});
  }

  const lagnaSign = LAGNA_FOR_TAB[activeTab];

  // Re-compute house numbers relative to the active tab's lagna
  const planetsWithHouse: ChartPlanet[] = PLANETS.map(p => ({
    ...p,
    house: houseOf(p.sign, lagnaSign),
  }));

  const tabs: { key: TabKey; icon: string }[] = [
    { key: "Ascendant", icon: "★" },
    { key: "Moon",      icon: "☽" },
    { key: "Sun",       icon: "☉" },
    { key: "Dasha",     icon: "⏳" },
  ];

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background-light page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center px-4 pb-2 justify-between sticky top-0 bg-background-light/80 backdrop-blur-md z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button
          onClick={() => router.back()}
          className="text-primary flex w-10 h-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-primary fraunces-italic text-2xl font-bold leading-tight flex-1 text-center">
          My Kundali
        </h2>
        <button className="text-primary flex w-10 items-center justify-center rounded-full hover:bg-primary/10 p-2">
          <ShareNetworkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* ── Chart-style toggle pill ── */}
      <div className="px-4 pt-3 pb-1">
        <div
          className="flex rounded-full overflow-hidden border border-primary/25"
          style={{ background: "rgba(214,136,10,0.04)" }}
        >
          {STYLE_LABELS.map(({ key, label }) => {
            const active = chartStyle === key;
            return (
              <button
                key={key}
                onClick={() => switchStyle(key)}
                className="flex-1 py-2 text-xs font-semibold transition-all leading-none"
                style={
                  active
                    ? { background: "#d6880a", color: "#fff" }
                    : { color: "#92400e" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View tabs (Lagna / Moon / Sun / Dasha) ── */}
      <div className="flex gap-3 px-4 pt-2 pb-1 overflow-x-auto no-scrollbar">
        {tabs.map(({ key, icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 shadow-sm transition-all"
              style={
                active
                  ? { background: "#d6880a", color: "#fff" }
                  : { background: "#fff", border: "1px solid rgba(214,136,10,0.2)", color: "#334155" }
              }
            >
              <span className="text-sm">{icon}</span>
              <span className="text-sm font-medium">{key}</span>
            </button>
          );
        })}
      </div>

      {/* ── Chart label ── */}
      <div className="px-5 pt-2 pb-1">
        <p className="text-slate-500 text-xs">
          {TAB_LABEL[activeTab]}
          {activeTab === "Ascendant" && " · Scorpio · Jyeshtha nakshatra"}
          {activeTab === "Moon"      && ` · ${SIGN_FULL[MOON_SIGN]} as 1st house`}
          {activeTab === "Sun"       && ` · ${SIGN_FULL[SUN_SIGN]} as 1st house`}
          {activeTab === "Dasha"     && " · Vimshottari · Mercury active"}
        </p>
      </div>

      {/* ── Chart ── */}
      <div className="px-4 pb-2">
        <ChartRenderer
          style={chartStyle}
          lagnaSign={lagnaSign}
          planets={planetsWithHouse}
        />
      </div>

      {/* ── Dasha tab content ── */}
      {activeTab === "Dasha" && (
        <div className="px-4 pb-4">
          {/* Current Mahadasha summary */}
          {dashaData && (
            <div className="mb-3 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Active Period</p>
              <p className="font-bold text-base">
                {dashaData.currentMahadasha.planet} Mahadasha
                <span className="text-sm font-normal text-slate-500 ml-2">
                  / {dashaData.currentBhukti.planet} Bhukti
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Bhukti ends {new Date(dashaData.currentBhukti.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                {" · "}{dashaData.percentElapsed}% through Mahadasha
              </p>
              <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${dashaData.percentElapsed}%` }} />
              </div>
            </div>
          )}

          {/* ── Visual timeline ── */}
          {dashaData?.allDashas && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Life Timeline</p>
              <div className="overflow-x-auto no-scrollbar pb-1">
                <div className="flex gap-1 min-w-max">
                  {dashaData.allDashas.map((d, i) => {
                    const now   = new Date();
                    const start = new Date(d.startDate);
                    const end   = new Date(d.endDate);
                    const isPast   = end <= now;
                    const isActive = start <= now && end > now;
                    const yrs  = Math.round((end.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
                    // Width proportional to duration (7-20 yrs out of 120)
                    const w = Math.max(44, Math.round(yrs * 3.2));
                    const sym = PLANETS.find(p => p.name === d.planet)?.symbol ?? d.planet[0];
                    return (
                      <div
                        key={`tl-${i}`}
                        className="flex flex-col items-center gap-1 shrink-0"
                        style={{ width: w }}
                      >
                        <div
                          className="w-full rounded-lg flex flex-col items-center justify-center py-2 px-1 relative"
                          style={{
                            background: isActive
                              ? "#d6880a"
                              : isPast
                              ? "#f1f5f9"
                              : "rgba(214,136,10,0.08)",
                            border: isActive ? "2px solid #d6880a" : "1px solid rgba(214,136,10,0.15)",
                          }}
                        >
                          {isActive && (
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow" />
                          )}
                          <span className="text-sm">{sym}</span>
                          <span
                            className="text-[8px] font-bold leading-tight"
                            style={{ color: isActive ? "#fff" : isPast ? "#94a3b8" : "#92400e" }}
                          >
                            {d.planet.slice(0,3)}
                          </span>
                          <span
                            className="text-[7px] leading-tight"
                            style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#94a3b8" }}
                          >
                            {yrs}y
                          </span>
                        </div>
                        <span className="text-[7px] text-slate-400 leading-none">
                          {start.getFullYear()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white border border-primary/10 shadow-sm overflow-hidden">
            {(dashaData?.allDashas ?? [
              { planet: "Mercury", startDate: "2019-01-01", endDate: "2036-01-01" },
              { planet: "Ketu",    startDate: "2036-01-01", endDate: "2043-01-01" },
              { planet: "Venus",   startDate: "2043-01-01", endDate: "2063-01-01" },
              { planet: "Sun",     startDate: "2063-01-01", endDate: "2069-01-01" },
            ]).map((d, i) => {
              const now = new Date();
              const start = new Date(d.startDate);
              const end   = new Date(d.endDate);
              const active = start <= now && end > now;

              return (
                <div
                  key={`${d.planet}-${i}`}
                  className="flex items-center px-4 py-3 gap-3"
                  style={{
                    borderTop: i > 0 ? "1px solid rgba(214,136,10,0.08)" : "none",
                    background: active ? "rgba(214,136,10,0.05)" : "transparent",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: active ? "#d6880a" : "#f1f5f9", color: active ? "#fff" : "#94a3b8" }}
                  >
                    {PLANETS.find(p => p.name === d.planet)?.symbol ?? d.planet[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{d.planet} Mahadasha</p>
                    <p className="text-xs text-slate-400">
                      {start.getFullYear()} – {end.getFullYear()}
                    </p>
                  </div>
                  {active && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Planet Positions ── */}
      {activeTab !== "Dasha" && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="font-bold text-slate-700">
              Planet Positions
              <span className="text-xs text-slate-400 font-normal ml-1">
                ({activeTab === "Ascendant" ? "Lagna" : activeTab} houses)
              </span>
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Sidereal · Lahiri</span>
          </div>

          <div className="space-y-2">
            {planetsWithHouse.map((planet) => (
              <div
                key={planet.name}
                className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border border-primary/5"
              >
                <PlanetSymbol planet={planet} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-slate-800">{planet.name}</p>
                    {planet.retrograde && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "#f1f5f9", color: "#64748b" }}>℞</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {planet.nakshatra} · House {planet.house}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: "#d6880a" }}>
                    {planet.degree.toFixed(1)}°
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {SIGN_FULL[planet.sign] ?? planet.sign}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
