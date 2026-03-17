"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, SunIcon } from "@phosphor-icons/react";

const TRANSITS = [
  {
    planet: "Jupiter",
    symbol: "♃",
    from: "Taurus",
    to: "Gemini",
    date: "Apr 30, 2026",
    impact: "Positive",
    desc: "Expands communication, learning, and short journeys. Your 3rd house gets activated.",
    impactColor: "#16a34a",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  {
    planet: "Saturn",
    symbol: "♄",
    from: "Aquarius",
    to: "Pisces",
    date: "Mar 29, 2026",
    impact: "Moderate",
    desc: "Karmic lessons around spirituality. Introspection and discipline recommended.",
    impactColor: "#7c3aed",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
  {
    planet: "Rahu",
    symbol: "☊",
    from: "Pisces",
    to: "Aquarius",
    date: "May 18, 2026",
    impact: "Transformative",
    desc: "Ambitions shift toward technology and social causes. Embrace innovation.",
    impactColor: "#6366f1",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
  },
  {
    planet: "Mars",
    symbol: "♂",
    from: "Capricorn",
    to: "Aquarius",
    date: "Mar 15, 2026",
    impact: "Energetic",
    desc: "Drive and ambition peak. Excellent for launching new initiatives.",
    impactColor: "#dc2626",
    bg: "bg-red-50",
    border: "border-red-100",
  },
];

export default function TransitsPage() {
  const router = useRouter();

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

      {/* Current Period Card */}
      <section className="px-4 py-3">
        <div className="rounded-2xl p-5 relative overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #FFF9E0 0%, #FFE566 55%, #F5C200 100%)" }}>
          <div className="absolute top-[-10%] right-[-5%] opacity-10">
            <SunIcon className="w-28 h-28" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Current Period</p>
          <h3 className="fraunces-italic text-2xl text-slate-900 font-normal">
            Venus Mahadasha
          </h3>
          <p className="text-sm text-slate-600 mt-1">Rahu Bhukti · Ends April 2027</p>
        </div>
      </section>

      {/* Transits List */}
      <section className="px-4 py-2">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">
          Upcoming Transits
        </h3>
        <div className="space-y-3">
          {TRANSITS.map((t) => (
            <div
              key={t.planet}
              className={`flex items-start gap-3 p-4 rounded-xl border bg-white shadow-sm border-primary/5`}
            >
              <div className={`w-11 h-11 rounded-full ${t.bg} ${t.border} border flex items-center justify-center text-xl shrink-0 font-bold`}
                style={{ color: t.impactColor }}>
                {t.symbol}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h4 className="font-bold text-sm text-slate-900">{t.planet} Transit</h4>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: t.impactColor, background: `${t.impactColor}15` }}
                  >
                    {t.impact}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1">{t.from} → {t.to} · {t.date}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
