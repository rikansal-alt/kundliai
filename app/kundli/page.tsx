"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ShareNetworkIcon, SparkleIcon } from "@phosphor-icons/react";
import ChartRenderer, { ChartStyle, ChartPlanet, SignAbbr } from "@/components/charts/ChartRenderer";
import { SIGN_FULL, houseOf } from "@/components/charts/types";

// ─── Planet display config ─────────────────────────────────────────────────

const PLANET_CONFIG: Record<string, { abbr: string; color: string; bg: string; symbol: string }> = {
  Sun:     { abbr: "Su", color: "#C47800", bg: "#FEF3C7", symbol: "☉" },
  Moon:    { abbr: "Mo", color: "#1D4ED8", bg: "#EFF6FF", symbol: "☽" },
  Mars:    { abbr: "Ma", color: "#DC2626", bg: "#FEF2F2", symbol: "♂" },
  Mercury: { abbr: "Me", color: "#16A34A", bg: "#F0FDF4", symbol: "☿" },
  Jupiter: { abbr: "Ju", color: "#D97706", bg: "#FFFBEB", symbol: "♃" },
  Venus:   { abbr: "Ve", color: "#BE185D", bg: "#FDF2F8", symbol: "♀" },
  Saturn:  { abbr: "Sa", color: "#475569", bg: "#F1F5F9", symbol: "♄" },
  Rahu:    { abbr: "Ra", color: "#7C3AED", bg: "#F5F3FF", symbol: "☊" },
  Ketu:    { abbr: "Ke", color: "#92400E", bg: "#FFF7ED", symbol: "☋" },
};

const SIGN_TO_ABBR: Record<string, SignAbbr> = {
  Aries: "Ar", Taurus: "Ta", Gemini: "Ge", Cancer: "Ca", Leo: "Le", Virgo: "Vi",
  Libra: "Li", Scorpio: "Sc", Sagittarius: "Sg", Capricorn: "Cp", Aquarius: "Aq", Pisces: "Pi",
};

// ─── Plain English planet descriptions ──────────────────────────────────────

const PLANET_MEANING: Record<string, string> = {
  Sun: "Your core identity, ego, and life purpose. Where the Sun sits shows what drives you at the deepest level.",
  Moon: "Your emotional nature and inner world. The Moon reveals how you feel, what gives you comfort, and your instinctive reactions.",
  Mars: "Your energy, courage, and drive. Mars shows how you take action, fight for what you want, and express anger.",
  Mercury: "Your mind and communication style. Mercury reveals how you think, speak, learn, and process information.",
  Jupiter: "Your wisdom, growth, and good fortune. Jupiter shows where life expands for you and what brings meaning.",
  Venus: "Your love language, beauty, and values. Venus reveals what you're attracted to and how you express affection.",
  Saturn: "Your discipline, challenges, and life lessons. Saturn shows where you must work hardest — and where the greatest rewards come.",
  Rahu: "Your desires and ambitions in this lifetime. Rahu shows what you're magnetically drawn toward — your growth edge.",
  Ketu: "Your past-life gifts and spiritual wisdom. Ketu shows what comes naturally but what you may need to let go of.",
};

const HOUSE_MEANING: Record<number, string> = {
  1: "Self & Identity — how you present yourself to the world",
  2: "Wealth & Family — your finances, speech, and family bonds",
  3: "Courage & Communication — siblings, short travels, and skills",
  4: "Home & Happiness — your emotional foundation and mother",
  5: "Creativity & Children — romance, intelligence, and past-life merit",
  6: "Health & Service — daily work, enemies, and overcoming obstacles",
  7: "Partnerships & Marriage — committed relationships and business partners",
  8: "Transformation & Hidden Matters — deep change, inheritance, and secrets",
  9: "Luck & Higher Learning — father, spirituality, and long journeys",
  10: "Career & Reputation — your public image and life achievements",
  11: "Gains & Friends — income, social networks, and fulfilled desires",
  12: "Spirituality & Losses — solitude, foreign lands, and liberation",
};

const SIGN_QUALITY: Record<string, string> = {
  Ar: "with fiery initiative and boldness",
  Ta: "with steady persistence and sensuality",
  Ge: "with curious adaptability and wit",
  Ca: "with nurturing depth and emotional intelligence",
  Le: "with confident authority and creative flair",
  Vi: "with analytical precision and service-mindedness",
  Li: "with diplomatic grace and a love of harmony",
  Sc: "with intense passion and transformative power",
  Sg: "with optimistic vision and philosophical wisdom",
  Cp: "with disciplined ambition and practical mastery",
  Aq: "with innovative thinking and humanitarian ideals",
  Pi: "with intuitive compassion and spiritual sensitivity",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type TabKey = "Ascendant" | "Moon" | "Sun" | "Dasha";

interface StoredDasha {
  planet: string;
  startDate: string;
  endDate: string;
}

interface StoredMahadasha {
  allDashas:        StoredDasha[];
  currentBhuktis:   StoredDasha[];
  currentMahadasha: StoredDasha;
  currentBhukti:    StoredDasha;
  percentElapsed:   number;
}

interface StoredPlanet {
  sign: string;
  house: number;
  degree: number;
  retrograde: boolean;
  nakshatra: string;
  nakshatraLord?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function convertPlanets(
  storedPlanets: Record<string, StoredPlanet>,
  lagnaAbbr: SignAbbr,
): ChartPlanet[] {
  return Object.entries(storedPlanets)
    .filter(([name]) => PLANET_CONFIG[name])
    .map(([name, p]) => {
      const config = PLANET_CONFIG[name];
      const signAbbr = SIGN_TO_ABBR[p.sign] || "Ar";
      return {
        name,
        abbr: config.abbr,
        sign: signAbbr as SignAbbr,
        house: houseOf(signAbbr as SignAbbr, lagnaAbbr),
        degree: p.degree,
        nakshatra: p.nakshatra || "",
        color: config.color,
        bg: config.bg,
        symbol: config.symbol,
        retrograde: p.retrograde,
      };
    });
}

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Planet symbol badge ────────────────────────────────────────────────────

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

// ─── Main page ──────────────────────────────────────────────────────────────

export default function KundliPage() {
  const router = useRouter();
  const [activeTab,    setActiveTab]    = useState<TabKey>("Ascendant");
  const [chartStyle,   setChartStyle]   = useState<ChartStyle>("south-indian");
  const [dashaData,    setDashaData]    = useState<StoredMahadasha | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<ChartPlanet | null>(null);
  const [lagnaSign,    setLagnaSign]    = useState<SignAbbr>("Ar");
  const [planets,      setPlanets]      = useState<ChartPlanet[]>([]);
  const [chartLoaded,  setChartLoaded]  = useState(false);
  const [ascNakshatra, setAscNakshatra] = useState("");

  // Load chart data from localStorage, fallback to guest session or API
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (!raw) { setChartLoaded(true); return; }
      const snap = JSON.parse(raw);

      // Ascendant
      const ascSign = typeof snap.ascendant === "object"
        ? snap.ascendant.sign
        : snap.ascendant;
      const ascAbbr = SIGN_TO_ABBR[ascSign] || "Ar";
      setLagnaSign(ascAbbr as SignAbbr);

      if (typeof snap.ascendant === "object" && snap.ascendant.nakshatra) {
        setAscNakshatra(snap.ascendant.nakshatra);
      }

      // Planets — try localStorage first, then guest session
      if (snap.planets) {
        setPlanets(convertPlanets(snap.planets, ascAbbr as SignAbbr));
      } else {
        // Check guest session for full chart data
        try {
          const guestRaw = localStorage.getItem("kundliai_guest");
          if (guestRaw) {
            const guest = JSON.parse(guestRaw);
            if (guest?.chartData?.planets) {
              setPlanets(convertPlanets(guest.chartData.planets, ascAbbr as SignAbbr));
              // Backfill localStorage with planets for next time
              snap.planets = guest.chartData.planets;
              if (guest.chartData.ascendant) snap.ascendant = guest.chartData.ascendant;
              if (guest.chartData.meta) snap.meta = guest.chartData.meta;
              localStorage.setItem("kundliai_chart", JSON.stringify(snap));
            }
          }
        } catch { /* ignore */ }

        // If still no planets, try fetching from API
        if (snap.userId) {
          fetch(`/api/chart/load?userId=${encodeURIComponent(snap.userId)}`)
            .then(r => r.json())
            .then(data => {
              if (data?.chart?.chartData?.planets) {
                const p = data.chart.chartData.planets;
                setPlanets(convertPlanets(p, ascAbbr as SignAbbr));
                // Backfill localStorage
                snap.planets = p;
                if (data.chart.chartData.ascendant) snap.ascendant = data.chart.chartData.ascendant;
                localStorage.setItem("kundliai_chart", JSON.stringify(snap));
              }
            })
            .catch(() => {});
        }
      }

      // Mahadasha
      if (snap.mahadasha) {
        setDashaData(snap.mahadasha as StoredMahadasha);
      }
    } catch { /* ignore */ }
    setChartLoaded(true);
  }, []);

  // Hydrate style preference
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) as ChartStyle | null;
    if (stored && ["south-indian", "north-indian", "bengali"].includes(stored)) {
      setChartStyle(stored);
    }
  }, []);

  function switchStyle(s: ChartStyle) {
    setChartStyle(s);
    localStorage.setItem(LS_KEY, s);
    fetch("/api/user/preference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chartStyle: s }),
    }).catch(() => {});
  }

  // Derive moon/sun signs from planets
  const moonPlanet = planets.find(p => p.name === "Moon");
  const sunPlanet = planets.find(p => p.name === "Sun");
  const moonSign = moonPlanet?.sign || "Ar";
  const sunSign = sunPlanet?.sign || "Ar";

  const lagnaForTab: Record<TabKey, SignAbbr> = {
    Ascendant: lagnaSign,
    Moon: moonSign,
    Sun: sunSign,
    Dasha: lagnaSign,
  };

  const activeLagna = lagnaForTab[activeTab];

  // Re-compute house numbers relative to the active tab's lagna
  const planetsWithHouse: ChartPlanet[] = planets.map(p => ({
    ...p,
    house: houseOf(p.sign, activeLagna),
  }));

  const tabs: { key: TabKey; icon: string }[] = [
    { key: "Ascendant", icon: "★" },
    { key: "Moon",      icon: "☽" },
    { key: "Sun",       icon: "☉" },
    { key: "Dasha",     icon: "⏳" },
  ];

  if (!chartLoaded) {
    return <div className="min-h-screen bg-background-light flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (planets.length === 0) {
    return (
      <div className="min-h-screen bg-background-light flex flex-col items-center justify-center px-6 page-enter">
        <p className="text-slate-400 text-sm mb-4 text-center">Generate your Kundli first to see your birth chart.</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          Generate My Kundli
        </button>
      </div>
    );
  }

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

      {/* ── View tabs ── */}
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
          {activeTab === "Ascendant" && ` · ${SIGN_FULL[lagnaSign]}${ascNakshatra ? ` · ${ascNakshatra} nakshatra` : ""}`}
          {activeTab === "Moon" && ` · ${SIGN_FULL[moonSign]} as 1st house`}
          {activeTab === "Sun" && ` · ${SIGN_FULL[sunSign]} as 1st house`}
          {activeTab === "Dasha" && dashaData ? ` · Vimshottari · ${dashaData.currentMahadasha.planet} active` : ""}
        </p>
      </div>

      {/* ── Chart ── */}
      <div className="px-4 pb-2">
        <ChartRenderer
          style={chartStyle}
          lagnaSign={activeLagna}
          planets={planetsWithHouse}
        />
      </div>

      {/* ── Dasha tab content ── */}
      {activeTab === "Dasha" && dashaData && (
        <div className="px-4 pb-4">
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

          {dashaData.allDashas && (
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
                    const w = Math.max(44, Math.round(yrs * 3.2));
                    const cfg = PLANET_CONFIG[d.planet];
                    const sym = cfg?.symbol ?? d.planet[0];
                    return (
                      <div key={`tl-${i}`} className="flex flex-col items-center gap-1 shrink-0" style={{ width: w }}>
                        <div
                          className="w-full rounded-lg flex flex-col items-center justify-center py-2 px-1 relative"
                          style={{
                            background: isActive ? "#d6880a" : isPast ? "#f1f5f9" : "rgba(214,136,10,0.08)",
                            border: isActive ? "2px solid #d6880a" : "1px solid rgba(214,136,10,0.15)",
                          }}
                        >
                          {isActive && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow" />}
                          <span className="text-sm">{sym}</span>
                          <span className="text-[8px] font-bold leading-tight" style={{ color: isActive ? "#fff" : isPast ? "#94a3b8" : "#92400e" }}>
                            {d.planet.slice(0, 3)}
                          </span>
                          <span className="text-[7px] leading-tight" style={{ color: isActive ? "rgba(255,255,255,0.8)" : "#94a3b8" }}>
                            {yrs}y
                          </span>
                        </div>
                        <span className="text-[7px] text-slate-400 leading-none">{start.getFullYear()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white border border-primary/10 shadow-sm overflow-hidden">
            {dashaData.allDashas.map((d, i) => {
              const now = new Date();
              const start = new Date(d.startDate);
              const end = new Date(d.endDate);
              const active = start <= now && end > now;
              const cfg = PLANET_CONFIG[d.planet];
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
                    {cfg?.symbol ?? d.planet[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{d.planet} Mahadasha</p>
                    <p className="text-xs text-slate-400">{start.getFullYear()} – {end.getFullYear()}</p>
                  </div>
                  {active && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>}
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
              <button
                key={planet.name}
                onClick={() => setSelectedPlanet(planet)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border border-primary/5 text-left active:scale-[0.98] transition-transform"
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Floating AI CTA ── */}
      <div
        className="fixed left-1/2 z-30"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 80px)",
          transform: "translateX(-50%)",
          width: "min(400px, calc(100vw - 32px))",
        }}
      >
        <button
          onClick={() => router.push("/consult")}
          className="w-full rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-[0.97] transition-transform"
          style={{
            background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)",
            boxShadow: "0 8px 30px rgba(214,136,10,0.35)",
          }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <SparkleIcon size={20} weight="fill" className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-white">What does my chart mean?</p>
            <p className="text-[11px] text-white/70">Tap to get a personal AI reading</p>
          </div>
          <span className="text-white text-lg font-bold">→</span>
        </button>
      </div>

      {/* ── Planet Explanation Bottom Sheet ── */}
      {selectedPlanet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setSelectedPlanet(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl animate-slide-up"
            style={{ maxWidth: 430, maxHeight: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3 mb-2" />

            {/* Scrollable content */}
            <div className="overflow-y-auto px-6 pb-6 no-scrollbar" style={{ maxHeight: "calc(75vh - 20px)", WebkitOverflowScrolling: "touch" }}>
              {/* Planet header + close */}
              <div className="flex items-center gap-3 py-4 sticky top-0 bg-white z-10">
                <PlanetSymbol planet={selectedPlanet} size={48} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedPlanet.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {SIGN_FULL[selectedPlanet.sign]} · House {selectedPlanet.house} · {selectedPlanet.degree.toFixed(1)}°
                    {selectedPlanet.retrograde && " · ℞ Retrograde"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlanet(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {/* What it represents */}
                <div className="rounded-xl p-4" style={{ background: selectedPlanet.bg, border: `1px solid ${selectedPlanet.color}15` }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: selectedPlanet.color }}>
                    What {selectedPlanet.name} Represents
                  </p>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {PLANET_MEANING[selectedPlanet.name] || "A significant celestial influence in your chart."}
                  </p>
                </div>

                {/* In your chart */}
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">In Your Chart</p>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    Your {selectedPlanet.name} expresses itself {SIGN_QUALITY[selectedPlanet.sign] || "uniquely"} through <strong className="text-slate-800">{HOUSE_MEANING[selectedPlanet.house]?.split("—")[0]?.trim() || `House ${selectedPlanet.house}`}</strong> — {HOUSE_MEANING[selectedPlanet.house]?.split("—")[1]?.trim().toLowerCase() || ""}.
                  </p>
                  {selectedPlanet.retrograde && (
                    <p className="text-[13px] text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">℞ Retrograde</span> — this energy turns inward. You process {selectedPlanet.name.toLowerCase()}&apos;s themes more privately and may revisit past patterns in this area.
                    </p>
                  )}
                </div>

                {/* Nakshatra */}
                {selectedPlanet.nakshatra && (
                  <div className="rounded-xl p-4" style={{ background: "rgba(214,136,10,0.04)", border: "1px solid rgba(214,136,10,0.1)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">Nakshatra</p>
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">{selectedPlanet.nakshatra}</strong> — a lunar mansion that shapes how your {selectedPlanet.name} expresses in your life.
                    </p>
                  </div>
                )}

                {/* Ask AI CTA */}
                <button
                  onClick={() => { setSelectedPlanet(null); router.push("/consult"); }}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)", boxShadow: "0 4px 12px rgba(214,136,10,0.3)" }}
                >
                  Ask AI about my {selectedPlanet.name} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
