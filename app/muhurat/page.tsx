"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  HeartIcon,
  BriefcaseIcon,
  AirplaneTiltIcon,
  HouseLineIcon,
  CarIcon,
  BookOpenIcon,
  SparkleIcon,
  CalendarBlankIcon,
  StarIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { trackEvent } from "@/lib/trackEvent";

const EVENT_TYPES = [
  { id: "wedding",       label: "Wedding",        icon: HeartIcon,         color: "#f43f5e" },
  { id: "business",      label: "Business Launch", icon: BriefcaseIcon,    color: "#6366f1" },
  { id: "travel",        label: "Travel",          icon: AirplaneTiltIcon, color: "#0ea5e9" },
  { id: "griha_pravesh", label: "Griha Pravesh",   icon: HouseLineIcon,    color: "#10b981" },
  { id: "vehicle",       label: "Vehicle Purchase", icon: CarIcon,          color: "#d97706" },
  { id: "education",     label: "Education",       icon: BookOpenIcon,     color: "#8b5cf6" },
];

interface MuhuratResult {
  date: string;
  weekday: string;
  score: number;
  rating: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  reasons: string[];
}

export default function MuhuratPage() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [results, setResults] = useState<MuhuratResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    trackEvent("page_view", { page: "muhurat" });
  }, []);

  const handleSearch = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    setSearched(true);

    let lat = 28.6139, lng = 77.209;
    try {
      const snap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
      if (snap?.lat) { lat = snap.lat; lng = snap.lng; }
      else if (snap?.meta?.birthDetails?.lat) { lat = snap.meta.birthDetails.lat; lng = snap.meta.birthDetails.lng; }
    } catch { /* ignore */ }

    try {
      const res = await fetch(
        `/api/muhurat-finder?lat=${lat}&lng=${lng}&event=${selectedEvent}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      setResults(data.results ?? []);
      trackEvent("muhurat_search", { event: selectedEvent });
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const ratingColor = (rating: string) => {
    if (rating === "Excellent") return { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", text: "#059669" };
    if (rating === "Good") return { bg: "rgba(214,136,10,0.1)", border: "rgba(214,136,10,0.3)", text: "#d6880a" };
    return { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", text: "#64748b" };
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleShareDate = (r: MuhuratResult) => {
    const eventLabel = EVENT_TYPES.find(e => e.id === selectedEvent)?.label ?? "event";
    const text = `Auspicious date for ${eventLabel}:\n\n` +
      `${formatDate(r.date)} (${r.weekday})\n` +
      `Rating: ${r.rating}\n` +
      `Nakshatra: ${r.nakshatra}\n` +
      `Tithi: ${r.tithi}\n` +
      `Yoga: ${r.yoga}\n\n` +
      `Found with KundliAI Muhurat Finder:\nhttps://kundliai.app/muhurat`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    trackEvent("whatsapp_share", { page: "muhurat", date: r.date });
  };

  return (
    <div
      className="flex-1 flex flex-col bg-white min-h-screen page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-700"
        >
          <ArrowLeftIcon size={22} weight="thin" />
        </button>
        <div className="text-center">
          <h1 className="fraunces-italic text-2xl font-bold text-primary">Muhurat Finder</h1>
          <p className="text-[10px] text-slate-400 font-medium">Find Auspicious Dates</p>
        </div>
        <div className="w-10" />
      </header>

      {/* ── Event Type Selection ── */}
      <section className="px-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          What&apos;s the occasion?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map((evt) => {
            const active = selectedEvent === evt.id;
            return (
              <button
                key={evt.id}
                onClick={() => setSelectedEvent(evt.id)}
                className="p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{
                  background: active ? `${evt.color}15` : "rgba(241,245,249,0.8)",
                  border: `1.5px solid ${active ? `${evt.color}40` : "rgba(226,232,240,0.8)"}`,
                }}
              >
                <evt.icon
                  size={24}
                  weight={active ? "fill" : "thin"}
                  style={{ color: active ? evt.color : "#94a3b8" }}
                />
                <span
                  className="text-[10px] font-bold leading-tight text-center"
                  style={{ color: active ? evt.color : "#64748b" }}
                >
                  {evt.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Date Range ── */}
      <section className="px-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Date Range
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">From</label>
            <div className="relative">
              <CalendarBlankIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-slate-700 bg-white"
                style={{ borderColor: "rgba(214,136,10,0.2)" }}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-medium mb-1 block">To</label>
            <div className="relative">
              <CalendarBlankIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-slate-700 bg-white"
                style={{ borderColor: "rgba(214,136,10,0.2)" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Button ── */}
      <section className="px-6 pb-6">
        <button
          onClick={handleSearch}
          disabled={!selectedEvent || loading}
          className="w-full py-3.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #d6880a 0%, #b5720a 100%)",
            boxShadow: "0 4px 15px rgba(214,136,10,0.3)",
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <SparkleIcon size={18} weight="fill" />
              Find Auspicious Dates
            </>
          )}
        </button>
      </section>

      {/* ── Results ── */}
      {searched && !loading && (
        <section className="px-6 pb-4">
          {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">No auspicious dates found in this range.</p>
              <p className="text-xs text-slate-300 mt-1">Try expanding the date range.</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                {results.length} Auspicious Date{results.length > 1 ? "s" : ""} Found
              </p>
              <div className="space-y-3">
                {results.map((r) => {
                  const rc = ratingColor(r.rating);
                  return (
                    <div
                      key={r.date}
                      className="rounded-2xl p-4 border"
                      style={{ background: rc.bg, borderColor: rc.border }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-800">{formatDate(r.date)}</p>
                          <p className="text-xs text-slate-500">{r.weekday}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                            style={{ color: rc.text, background: `${rc.text}15`, border: `1px solid ${rc.text}30` }}
                          >
                            {r.rating}
                          </span>
                          <button
                            onClick={() => handleShareDate(r)}
                            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                            style={{ background: "rgba(37,211,102,0.12)" }}
                          >
                            <WhatsappLogoIcon size={16} weight="fill" style={{ color: "#25D366" }} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {[
                          { label: "Nakshatra", value: r.nakshatra },
                          { label: "Tithi", value: r.tithi },
                          { label: "Yoga", value: r.yoga },
                        ].map((tag) => (
                          <span
                            key={tag.label}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 text-slate-600 border border-slate-200"
                          >
                            {tag.label}: <span className="font-semibold">{tag.value}</span>
                          </span>
                        ))}
                      </div>
                      {r.reasons.length > 0 && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <StarIcon size={12} weight="fill" className="text-primary mt-0.5 shrink-0" />
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {r.reasons[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
