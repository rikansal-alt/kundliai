"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, SunIcon, SparkleIcon } from "@phosphor-icons/react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TransitPlanet {
  name: string;
  symbol: string;
  sign: string;
  degree: number;
  nakshatra: string;
  retrograde: boolean;
  house: number;
  color: string;
  bg: string;
}

interface DashaInfo {
  currentMahadasha?: { planet: string; endDate: string };
  currentBhukti?: { planet: string; endDate: string };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLANET_DISPLAY: Record<string, { symbol: string; color: string; bg: string }> = {
  Sun:     { symbol: "☉", color: "#C47800", bg: "bg-yellow-50"  },
  Moon:    { symbol: "☽", color: "#1D4ED8", bg: "bg-blue-50"    },
  Mars:    { symbol: "♂", color: "#DC2626", bg: "bg-red-50"     },
  Mercury: { symbol: "☿", color: "#16A34A", bg: "bg-green-50"   },
  Jupiter: { symbol: "♃", color: "#D97706", bg: "bg-yellow-50"  },
  Venus:   { symbol: "♀", color: "#BE185D", bg: "bg-pink-50"    },
  Saturn:  { symbol: "♄", color: "#475569", bg: "bg-slate-50"   },
  Rahu:    { symbol: "☊", color: "#7C3AED", bg: "bg-purple-50"  },
  Ketu:    { symbol: "☋", color: "#92400E", bg: "bg-orange-50"  },
};

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function houseFromSigns(planetSign: string, ascSign: string): number {
  const pi = SIGNS.indexOf(planetSign);
  const ai = SIGNS.indexOf(ascSign);
  if (pi < 0 || ai < 0) return 1;
  return ((pi - ai + 12) % 12) + 1;
}

const HOUSE_THEMES: Record<number, string> = {
  1: "self, identity, and new beginnings",
  2: "finances, family, and speech",
  3: "communication, courage, and siblings",
  4: "home, emotional peace, and mother",
  5: "creativity, romance, and children",
  6: "health, daily work, and challenges",
  7: "relationships, partnerships, and marriage",
  8: "transformation, hidden matters, and change",
  9: "luck, higher learning, and spirituality",
  10: "career, reputation, and public life",
  11: "gains, friendships, and aspirations",
  12: "spirituality, solitude, and foreign connections",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TransitsPage() {
  const router = useRouter();
  const [transits, setTransits] = useState<TransitPlanet[]>([]);
  const [dasha, setDasha] = useState<DashaInfo | null>(null);
  const [ascendant, setAscendant] = useState("Aries");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user's ascendant and dasha from localStorage
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        const asc = typeof snap.ascendant === "object" ? snap.ascendant.sign : snap.ascendant;
        if (asc) setAscendant(asc);
        if (snap.mahadasha) setDasha(snap.mahadasha);
      }
    } catch { /* ignore */ }

    // Fetch current planetary positions from panchang API
    const lat = 28.6139, lng = 77.209; // Delhi default
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap.meta?.birthDetails?.lat) {
          // Use user's location for transit calculations
        }
      }
    } catch { /* ignore */ }

    // Get current transits from the generate API with current date
    fetch(`/api/panchang?lat=${lat}&lng=${lng}`)
      .then(() => {
        // Panchang gives us sun/moon but not all planets
        // Use the ephemeris via a lightweight transit endpoint
        // For now, calculate from chart data — the planets in the user's birth chart
        // show their NATAL positions, not current transits
        // We need actual current positions — let's compute them
      })
      .catch(() => {});

    // Generate current transit chart (today's date, Delhi coordinates)
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Transit",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        city: "New Delhi",
        lat: 28.6139,
        lng: 77.209,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.chart?.planets) {
          const userAsc = ascendant;
          const transitPlanets: TransitPlanet[] = Object.entries(data.chart.planets)
            .filter(([name]) => PLANET_DISPLAY[name])
            .map(([name, p]) => {
              const planet = p as { sign: string; degree: number; nakshatra: string; retrograde: boolean };
              const display = PLANET_DISPLAY[name];
              return {
                name,
                symbol: display.symbol,
                sign: planet.sign,
                degree: planet.degree,
                nakshatra: planet.nakshatra,
                retrograde: planet.retrograde,
                house: houseFromSigns(planet.sign, userAsc),
                color: display.color,
                bg: display.bg,
              };
            });
          setTransits(transitPlanets);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ascendant]);

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background-light page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 pb-3 justify-between sticky top-0 bg-background-light/80 backdrop-blur-md z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button
          onClick={() => router.back()}
          className="text-primary flex w-10 h-10 items-center justify-center rounded-full hover:bg-primary/10 transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="fraunces-italic text-2xl font-bold text-primary flex-1 text-center">
          Planetary Transits
        </h2>
        <div className="w-10" />
      </div>

      {/* Current Dasha Period Card */}
      {dasha?.currentMahadasha && (
        <section className="px-4 py-3">
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #FFF9E0 0%, #FFE566 55%, #F5C200 100%)" }}>
            <div className="absolute top-[-10%] right-[-5%] opacity-10">
              <SunIcon className="w-28 h-28" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Current Period</p>
            <h3 className="fraunces-italic text-2xl text-slate-900 font-normal">
              {dasha.currentMahadasha.planet} Mahadasha
            </h3>
            {dasha.currentBhukti && (
              <p className="text-sm text-slate-600 mt-1">
                {dasha.currentBhukti.planet} Bhukti · Ends {new Date(dasha.currentBhukti.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Current Transits */}
      {!loading && transits.length > 0 && (
        <section className="px-4 py-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1 px-1">
            Current Transits
          </h3>
          <p className="text-[11px] text-slate-400 mb-4 px-1">
            Where the planets are right now, relative to your {ascendant} ascendant
          </p>

          <div className="space-y-2">
            {transits.map((t) => (
              <div
                key={t.name}
                className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-primary/5"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 font-bold border"
                  style={{ color: t.color, background: `${t.color}10`, borderColor: `${t.color}20` }}
                >
                  {t.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="font-bold text-sm text-slate-900">
                      {t.name}
                      {t.retrograde && <span className="text-[9px] font-bold ml-1.5 px-1 py-0.5 rounded bg-slate-100 text-slate-500">℞</span>}
                    </h4>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: t.color, background: `${t.color}15` }}
                    >
                      House {t.house}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">
                    {t.sign} · {t.degree.toFixed(1)}° · {t.nakshatra}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Currently influencing your {HOUSE_THEMES[t.house] || `house ${t.house}`}.
                    {t.retrograde && ` ${t.name} is retrograde, turning this energy inward for reflection and review.`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No data */}
      {!loading && transits.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
          <p className="text-slate-400 text-sm mb-4 text-center">Generate your Kundli first to see transit effects on your chart.</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Generate My Kundli
          </button>
        </div>
      )}

      {/* AI CTA */}
      {transits.length > 0 && (
        <section className="px-4 py-4">
          <button
            onClick={() => router.push("/consult")}
            className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(214,136,10,0.08) 100%)",
              border: "1px solid rgba(214,136,10,0.15)",
            }}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <SparkleIcon size={20} weight="fill" className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-800">How do these transits affect me?</p>
              <p className="text-[11px] text-slate-400">Ask the AI for a personal transit reading</p>
            </div>
            <span className="text-primary text-lg">→</span>
          </button>
        </section>
      )}
    </div>
  );
}
