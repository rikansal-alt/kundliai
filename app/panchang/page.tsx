"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowClockwiseIcon, SunHorizonIcon, WarningIcon, SparkleIcon, MagicWandIcon } from "@phosphor-icons/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PanchangData {
  date:             { gregorian: string; samvat: number; weekday: string };
  tithi:            { number: number; name: string; paksha: string };
  nakshatra:        { number: number; name: string; pada: number };
  yoga:             { number: number; name: string; auspicious: boolean };
  karana:           { name: string };
  vara:             { name: string; english: string; planet: string; deity: string; color: string; guidance: string };
  locationTimezone: string;
  sunriseUtcMin:    number;
  sunsetUtcMin:     number;
  rahuKaal:         { startUtcMin: number; endUtcMin: number };
  muhurats:         { name: string; startUtcMin: number; endUtcMin: number; type: string; icon: string; description: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PADA_SUFFIX = ["st","nd","rd","th"];

function padaStr(n: number) { return `${n}${PADA_SUFFIX[n-1] ?? "th"} Pada`; }

/** Convert UTC-minutes-from-midnight to a time string.
 *  Pass a timezone to format in that zone; omit to use the browser's local timezone. */
function utcMinToLocal(utcMin: number, timezone?: string): string {
  // Convert UTC minutes-from-midnight to a time string in the given timezone
  // Handle negative values (before midnight UTC) and values > 1440 (next day)
  const normalized = ((utcMin % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = Math.round(normalized % 60);
  const now = new Date();
  // Create a date at this UTC time today
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, mins, 0));
  const tz = timezone || "Asia/Kolkata"; // Always use location timezone, never browser
  return d.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: tz,
  });
}

// ─── UI Components ────────────────────────────────────────────────────────────

function PillCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl px-3 py-3 flex flex-col gap-0.5 border"
      style={{
        background: accent ? "rgba(214,136,10,0.07)" : "#fff",
        borderColor: accent ? "rgba(214,136,10,0.3)" : "rgba(214,136,10,0.1)",
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-800 leading-tight truncate">{value}</span>
      {sub && <span className="text-[10px] text-slate-400 leading-tight truncate">{sub}</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PanchangPage() {
  const router = useRouter();
  const [data,    setData]    = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Pull user coords from localStorage if available
      let lat = 28.6139, lng = 77.209; // Delhi default
      try {
        const snap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
        if (snap?.lat) { lat = snap.lat; lng = snap.lng; }
      } catch { /* ignore */ }

      const res  = await fetch(`/api/panchang?lat=${lat}&lng=${lng}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "API error");
      setData(json as PanchangData);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background-light page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 pb-3 bg-background-light/90 backdrop-blur-md"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-primary">
          <ArrowLeftIcon size={20} weight="thin" />
        </button>
        <div className="text-center">
          <h1 className="fraunces-italic text-2xl font-bold text-primary">Panchang</h1>
          <p className="text-[10px] text-slate-400 font-medium">Vedic Daily Calendar</p>
        </div>
        <button onClick={load} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-primary">
          <ArrowClockwiseIcon size={18} weight="thin" className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Date banner ── */}
      <div className="px-4 pb-2">
        <div className="rounded-xl text-white p-4 shadow-lg shadow-primary/20" style={{ background: "linear-gradient(135deg, #d6880a 0%, #b5720a 100%)" }}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Today</p>
          <p className="font-bold text-lg leading-tight">{today}</p>
          {data && (
            <p className="text-sm opacity-90 mt-1">
              Vikram Samvat {data.date.samvat} · {data.tithi.paksha.split(" ")[0]} {data.tithi.paksha.split(" ")[1]}
            </p>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Calculating Panchang…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 mx-4 mt-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ── Five elements ── */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Pancha Anga (Five Limbs)</p>
            <div className="grid grid-cols-2 gap-2">
              <PillCard
                label="Tithi"
                value={`${data.tithi.number}. ${data.tithi.name}`}
                sub={data.tithi.paksha}
                accent
              />
              <PillCard
                label="Nakshatra"
                value={data.nakshatra.name}
                sub={`${padaStr(data.nakshatra.pada)} · #${data.nakshatra.number}`}
                accent
              />
              <PillCard
                label="Yoga"
                value={data.yoga.name}
                sub={data.yoga.auspicious ? "✓ Auspicious" : "✗ Inauspicious"}
              />
              <PillCard
                label="Karana"
                value={data.karana.name}
                sub="Half-tithi period"
              />
            </div>
          </div>

          {/* ── Vara ── */}
          <div className="px-4 py-2">
            <div
              className="rounded-xl p-4 flex items-center gap-4 border"
              style={{ background: `${data.vara.color}12`, borderColor: `${data.vara.color}40` }}
            >
              <div
                className="w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 text-white font-bold shadow-md"
                style={{ background: data.vara.color }}
              >
                <span className="text-xs leading-none">{data.vara.planet}</span>
                <span className="text-[9px] leading-none opacity-80 mt-0.5">{data.vara.deity}</span>
              </div>
              <div>
                <p className="font-bold text-slate-800">{data.vara.name}
                  <span className="text-sm font-normal text-slate-500 ml-2">({data.vara.english})</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{data.vara.guidance}</p>
              </div>
            </div>
          </div>

          {/* ── Sunrise / Sunset ── */}
          <div className="px-4 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 flex items-center gap-3 border" style={{ background: "rgba(214,136,10,0.06)", borderColor: "rgba(214,136,10,0.2)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(214,136,10,0.12)" }}>
                  <SunHorizonIcon size={20} weight="thin" className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Sunrise</p>
                  <p className="font-bold text-slate-800 text-sm">{utcMinToLocal(data.sunriseUtcMin, data.locationTimezone)}</p>
                </div>
              </div>
              <div className="rounded-xl p-3 flex items-center gap-3 border" style={{ background: "rgba(214,136,10,0.06)", borderColor: "rgba(214,136,10,0.2)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(214,136,10,0.12)" }}>
                  <SunHorizonIcon size={20} weight="thin" className="text-primary" style={{ transform: "scaleY(-1)" }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Sunset</p>
                  <p className="font-bold text-slate-800 text-sm">{utcMinToLocal(data.sunsetUtcMin, data.locationTimezone)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Rahu Kaal ── */}
          <div className="px-4 pb-2">
            <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4">
              <div className="flex items-center gap-2 mb-2">
                <WarningIcon size={18} weight="regular" className="text-red-600 shrink-0" />
                <p className="font-bold text-red-700 text-sm uppercase tracking-wider">Rahu Kaal</p>
                <span className="ml-auto text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Avoid</span>
              </div>
              <p className="text-2xl font-bold text-red-800">
                {utcMinToLocal(data.rahuKaal.startUtcMin, data.locationTimezone)} – {utcMinToLocal(data.rahuKaal.endUtcMin, data.locationTimezone)}
              </p>
              <p className="text-xs text-red-500 mt-1">
                Inauspicious period — avoid travel, signing contracts, new ventures
              </p>
            </div>
          </div>

          {/* ── Muhurats ── */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Today&apos;s Auspicious Times</p>
            <div className="space-y-2">
              {data.muhurats.map((m) => (
                <div
                  key={m.name}
                  className="rounded-xl bg-white border border-primary/10 p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(214,136,10,0.10)" }}>
                    <SparkleIcon size={18} weight="thin" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-500 truncate">{m.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">{utcMinToLocal(m.startUtcMin, data.locationTimezone)}</p>
                    <p className="text-xs text-slate-400">to {utcMinToLocal(m.endUtcMin, data.locationTimezone)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Muhurat Finder teaser ── */}
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-primary/20 p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(214,136,10,0.07) 0%, rgba(214,136,10,0.12) 100%)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(214,136,10,0.15)" }}>
                <MagicWandIcon size={18} weight="thin" className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-slate-800">Muhurat Finder</p>
                <p className="text-xs text-slate-500">Find auspicious times for business, travel &amp; marriage</p>
              </div>
              <button
                className="shrink-0 px-4 py-2 bg-primary text-white text-xs font-bold rounded-full shadow-md shadow-primary/20 active:scale-95 transition-all"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
