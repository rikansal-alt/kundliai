"use client";

import { Suspense, useState, useEffect, useRef, useCallback, ComponentType } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SunIcon, MoonIcon, PlanetIcon, RobotIcon, HandHeartIcon, BinocularsIcon, SparkleIcon } from "@phosphor-icons/react";
import useEmblaCarousel from "embla-carousel-react";
import { migrateGuestData } from "@/lib/migrateGuestData";
import SoftLoginPrompt from "@/components/SoftLoginPrompt";
import ProfileSheet from "@/components/ProfileSheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashaSnapshot {
  planet: string;
  startDate: string;
  endDate: string;
}

interface ChartSnap {
  name: string;
  ascendant: string | { sign: string; degree?: number; nakshatra?: string };
  moonSign: string;
  sunSign: string;
  mahadasha: {
    currentMahadasha: DashaSnapshot;
    currentBhukti: DashaSnapshot;
    percentElapsed: number;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format an ISO date string as "MMM YYYY" */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// ─── Main content ─────────────────────────────────────────────────────────────

interface ChartSummary {
  greeting: string;
  ascendant: string;
  moon: string;
  sun: string;
  standout: string;
  standoutPlanet: string;
  standoutSign: string;
  dasha: string;
  oneWord: string;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [chart,    setChart]    = useState<ChartSnap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [summary, setSummary] = useState<ChartSummary | null>(() => {
    // Read cache synchronously to avoid loading flash on page revisits
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("kundliai_summary_v2");
      if (cached) return JSON.parse(cached).summary || null;
    } catch { /* ignore */ }
    return null;
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<{
    energy: { label: string; value: string };
    focus: { label: string; value: string };
    caution: { label: string; value: string };
    prediction?: { prediction: string; morning: string; afternoon: string; evening: string };
    moonTransitSign?: string;
  } | null>(null);
  const migrationAttemptedRef = useRef(false);
  const summaryFetchedRef = useRef(false);

  const chartName = searchParams.get("name") || chart?.name || "Friend";
  // Greeting name: Google display name > email prefix > chart birth name
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    chartName.split(" ")[0];
  // Heading name: always the chart subject's name (what they entered in the form)
  const headingName = chartName.split(" ")[0] || firstName;

  // Hydrate from localStorage — must be client-only
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) setChart(JSON.parse(raw) as ChartSnap);
    } catch { /* ignore */ }
    setIsLoaded(true);
  }, []);

  // After Google sign-in: migrate guest data then update localStorage
  useEffect(() => {
    if (status !== "authenticated" || !session?.user || migrationAttemptedRef.current) return;
    const googleId = (session.user as { googleId?: string }).googleId;
    if (!googleId) return;
    migrationAttemptedRef.current = true;
    migrateGuestData(googleId).then((result) => {
      if (result.success && result.chartId) {
        try {
          const snap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
          localStorage.setItem("kundliai_chart", JSON.stringify({
            ...snap,
            userId:  googleId,
            chartId: result.chartId,
            tier:    "registered",
          }));
        } catch { /* ignore */ }
      }
    });
  }, [status, session]);

  // Fetch daily transit stats (lightweight, no LLM)
  useEffect(() => {
    if (!chart) return;
    const ascSign = typeof chart.ascendant === "object" ? chart.ascendant.sign : chart.ascendant;
    fetch(`/api/daily-prediction?asc=${encodeURIComponent(ascSign)}&moon=${encodeURIComponent(chart.moonSign)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) setDailyStats({ ...data.stats, prediction: data.prediction, moonTransitSign: data.moonTransitSign });
      })
      .catch(() => {});
  }, [chart]);

  // Fetch plain English summary when chart is available
  useEffect(() => {
    if (!chart || summaryFetchedRef.current) return;
    // Check cache first
    try {
      const cached = localStorage.getItem("kundliai_summary_v2");
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache valid for same chart (check ascendant sign + moonSign)
        const ascSign = typeof chart.ascendant === "object" ? chart.ascendant.sign : chart.ascendant;
        if (parsed.ascendant === ascSign && parsed.moonSign === chart.moonSign) {
          setSummary(parsed.summary);
          summaryFetchedRef.current = true;
          return;
        }
      }
    } catch { /* ignore */ }

    summaryFetchedRef.current = true;
    setSummaryLoading(true);

    // Get full chart data from localStorage for the API
    let fullChart = {};
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) fullChart = JSON.parse(raw);
    } catch { /* ignore */ }

    fetch("/api/chart-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chart: fullChart, name: chartName }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
          // Cache it
          try {
            const cachedAsc = typeof chart.ascendant === "object" ? chart.ascendant.sign : chart.ascendant;
            localStorage.setItem("kundliai_summary_v2", JSON.stringify({
              ascendant: cachedAsc,
              moonSign: chart.moonSign,
              summary: data.summary,
            }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [chart, chartName]);

  const maha  = chart?.mahadasha?.currentMahadasha;
  const bhukti = chart?.mahadasha?.currentBhukti;
  const pct   = chart?.mahadasha?.percentElapsed ?? 65;

  // ── Embla carousel ────────────────────────────────────────────────────────
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [activeSlide, setActiveSlide] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  return (
    <div
      className="flex-1 flex flex-col bg-white min-h-screen page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {showSavePrompt && (
        <SoftLoginPrompt trigger="save_chart" onDismiss={() => setShowSavePrompt(false)} />
      )}
      {showProfile && (
        <ProfileSheet
          name={session?.user?.name}
          email={session?.user?.email}
          image={session?.user?.image}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Guest "sign in to save" soft banner — hide only when confirmed signed in */}
      {status !== "authenticated" && isLoaded && (
        <button
          onClick={() => setShowSavePrompt(true)}
          className="mx-4 mt-3 py-2.5 px-4 rounded-xl text-center text-xs font-semibold text-primary bg-primary/8 border border-primary/20 hover:bg-primary/15 transition-colors"
        >
          Sign in to save your chart to the cloud
        </button>
      )}

      {/* ── Header ── */}
      <header className="p-6 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
        <div className="flex justify-between items-center mb-6">
          <button
            className="flex items-center gap-3 active:opacity-70 transition-opacity"
            onClick={() => setShowProfile(true)}
          >
            {/* FIX 1: always show Google photo when available */}
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "Profile"}
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(214,136,10,0.3)", flexShrink: 0 }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="KundliAI" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(214,136,10,0.2)", flexShrink: 0 }} />
            )}
            <div className="flex flex-col items-start">
              <span className="text-primary font-bold tracking-widest text-xs uppercase">Namaste</span>
              <span className="text-slate-400 text-[10px] leading-none">{firstName}</span>
            </div>
          </button>
          {status === "authenticated" ? (
            <button
              onClick={() => router.push("/charts")}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/15 transition-colors"
            >
              My Charts
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/?new=1&edit=1")}
                className="text-xs font-semibold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => router.push("/?new=1")}
                className="text-xs font-semibold text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/15 transition-colors"
              >
                + New
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h1 className="fraunces-italic text-5xl font-normal text-slate-900">
            {headingName}
          </h1>
          {/* suppressHydrationWarning: content depends on localStorage (client-only) */}
          <p className="text-primary font-medium text-sm mt-1" suppressHydrationWarning>
            {!isLoaded
              ? "\u00a0"
              : chart
              ? `${typeof chart.ascendant === "object" ? (chart.ascendant as { sign?: string }).sign : chart.ascendant} Asc · ${chart.moonSign} Moon`
              : "Enter birth details to see your chart"}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-6">
          {/* suppressHydrationWarning: server (UTC) and browser may disagree on weekday near midnight */}
          <span className="text-slate-900 font-bold text-lg" suppressHydrationWarning>
            Today · {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
        </div>
      </header>

      {/* ── Plain English Summary Card ── */}
      {(summary || summaryLoading) && (
        <section className="px-6 pb-2">
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: "#fffcf5",
              borderLeft: "4px solid #d6880a",
              boxShadow: "0 1px 12px rgba(214,136,10,0.06)",
            }}
          >
            {summaryLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-primary/10 rounded w-3/4" />
                <div className="h-3 bg-primary/5 rounded w-full" />
                <div className="h-3 bg-primary/5 rounded w-5/6" />
                <div className="h-3 bg-primary/5 rounded w-full" />
                <div className="h-3 bg-primary/5 rounded w-2/3" />
              </div>
            ) : summary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Your Chart in Plain English
                  </p>
                  {summary.oneWord && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ color: "#d6880a", background: "rgba(214,136,10,0.08)", border: "1px solid rgba(214,136,10,0.15)" }}>
                      {summary.oneWord}
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {summary.greeting}
                </p>

                <div className="space-y-3">
                  {[
                    { icon: SunIcon,       label: "First Impressions", text: summary.ascendant },
                    { icon: MoonIcon,      label: "Your Feelings", text: summary.moon },
                    { icon: SparkleIcon,   label: "What Drives You", text: summary.sun },
                    { icon: PlanetIcon,    label: "Your Superpower", text: summary.standout },
                    { icon: BinocularsIcon, label: "Life Right Now", text: summary.dasha },
                  ].map(({ icon: Icon, label, text }) => (
                    <div key={label} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "rgba(214,136,10,0.08)" }}>
                        <Icon size={15} weight="thin" className="text-primary" />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-800">{label} — </span>
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Ask AI Banner ── */}
      {chart && !summaryLoading && (
        <section className="px-6 pb-2">
          <button
            onClick={() => router.push(`/consult?name=${encodeURIComponent(chartName)}`)}
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
              <p className="text-sm font-semibold text-slate-800">Ask the AI about your chart</p>
              <p className="text-[11px] text-slate-400">Get a personal reading in plain English</p>
            </div>
            <span className="text-primary text-lg">→</span>
          </button>
        </section>
      )}

      {/* ── Hero Card Carousel ── */}
      <section className="px-6 py-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4" style={{ backfaceVisibility: "hidden" }}>
            {/* Card 1 — Today's Main Prediction */}
            <div
              className="rounded-2xl p-6 text-slate-900 shadow-md relative overflow-hidden flex-[0_0_100%] min-w-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #FFF9E0 0%, #FFE566 55%, #F5C200 100%)" }}
              onClick={() => router.push("/daily")}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 50%, rgba(255,255,255,0.5) 0%, transparent 60%)" }} />
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(214,136,10,0.18) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/60 shadow-sm">
                    <SparkleIcon size={12} weight="fill" className="text-primary" /> Power Day
                  </span>
                  <SunIcon size={20} weight="thin" className="text-primary opacity-60" />
                </div>
                <blockquote className="fraunces-italic text-[22px] mb-6 leading-snug text-slate-800">
                  &ldquo;{dailyStats?.prediction?.prediction
                    || (chart?.moonSign
                      ? `With your ${chart.moonSign} Moon, today's energy favours bold intentions and purposeful action.`
                      : "The stars favour new intentions and purposeful action today.")}&rdquo;
                </blockquote>
                <div className="flex gap-2">
                  {[
                    dailyStats?.energy  || { label: "Energy",  value: "—" },
                    dailyStats?.focus   || { label: "Focus",   value: "—" },
                    dailyStats?.caution || { label: "Caution", value: "—" },
                  ].map((stat) => (
                    <div key={stat.label} className="backdrop-blur-sm px-3 py-2 rounded-xl flex flex-col items-center flex-1 border" style={{ background: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.6)" }}>
                      <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: "rgba(120,80,0,0.65)" }}>{stat.label}</span>
                      <span className="font-bold text-sm text-slate-800 mt-0.5">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 — Evening Guidance */}
            <div
              className="rounded-2xl p-6 text-slate-900 shadow-md relative overflow-hidden flex-[0_0_100%] min-w-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #EDE9FE 0%, #C4B5FD 55%, #8B5CF6 100%)" }}
              onClick={() => router.push("/daily")}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 20%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/60 shadow-sm">
                    <MoonIcon size={12} weight="fill" className="text-indigo-600" /> Evening
                  </span>
                  <MoonIcon size={20} weight="thin" className="text-indigo-500 opacity-60" />
                </div>
                <blockquote className="fraunces-italic text-[22px] mb-6 leading-snug text-slate-800">
                  &ldquo;{dailyStats?.prediction?.evening
                    || "Let creativity flow and cherish moments of beauty and connection this evening."}&rdquo;
                </blockquote>
                <div className="flex gap-2">
                  {[
                    { label: "Mood",     value: dailyStats ? (dailyStats.energy.value === "High" ? "Bright" : dailyStats.energy.value === "Low" ? "Quiet" : "Calm") : "—" },
                    { label: "Connect",  value: dailyStats?.focus.value || "—" },
                    { label: "Reflect",  value: dailyStats ? (dailyStats.caution.value === "None" ? "Light" : "Deep") : "—" },
                  ].map((stat) => (
                    <div key={stat.label} className="backdrop-blur-sm px-3 py-2 rounded-xl flex flex-col items-center flex-1 border" style={{ background: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.6)" }}>
                      <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: "rgba(80,60,120,0.65)" }}>{stat.label}</span>
                      <span className="font-bold text-sm text-slate-800 mt-0.5">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3 — Tomorrow Preview */}
            <div
              className="rounded-2xl p-6 text-slate-900 shadow-md relative overflow-hidden flex-[0_0_100%] min-w-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #E0F2FE 0%, #7DD3FC 55%, #0EA5E9 100%)" }}
              onClick={() => router.push("/daily")}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 15% 80%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)" }} />
              <div className="relative">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/60 shadow-sm">
                    <SparkleIcon size={12} weight="fill" className="text-sky-600" /> Tomorrow
                  </span>
                  <SunIcon size={20} weight="thin" className="text-sky-500 opacity-60" />
                </div>
                <blockquote className="fraunces-italic text-[22px] mb-6 leading-snug text-slate-800">
                  &ldquo;{dailyStats?.prediction?.morning
                    || "Expect clarity in communication and swift progress on pending matters tomorrow."}&rdquo;
                </blockquote>
                <div className="flex gap-2">
                  {[
                    { label: "Clarity",  value: dailyStats?.energy.value === "High" ? "Peak" : dailyStats?.energy.value || "—" },
                    { label: "Action",   value: dailyStats?.focus.value || "—" },
                    { label: "Social",   value: dailyStats?.caution.value === "None" ? "Open" : "Mindful" },
                  ].map((stat) => (
                    <div key={stat.label} className="backdrop-blur-sm px-3 py-2 rounded-xl flex flex-col items-center flex-1 border" style={{ background: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.6)" }}>
                      <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: "rgba(0,80,120,0.65)" }}>{stat.label}</span>
                      <span className="font-bold text-sm text-slate-800 mt-0.5">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: activeSlide === i ? "#D4880A" : "rgba(212,136,10,0.25)" }}
              onClick={() => emblaApi?.scrollTo(i)}
            />
          ))}
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-1.5">Swipe for more predictions</p>
      </section>

      {/* ── No-chart prompt (only shown after load when localStorage is empty) ── */}
      {isLoaded && !chart && (
        <section className="px-6 pb-2">
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            ✦ Generate My Kundli →
          </button>
        </section>
      )}

      {/* ── Mahadasha card ── */}
      <section className="px-6 py-4">
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: "linear-gradient(135deg, #fffcf0 0%, #fff8e0 100%)",
            borderColor: "rgba(214,136,10,0.15)",
            boxShadow: "0 1px 12px rgba(214,136,10,0.06)",
          }}
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
                <span className="inline-block w-3 h-px bg-primary/40" /> Current Mahadasha
              </h3>
              {maha ? (
                <p className="font-bold text-xl text-slate-800">
                  {maha.planet}
                  {bhukti && (
                    <span className="text-sm font-normal text-slate-400 ml-1.5">
                      / {bhukti.planet} Bhukti
                    </span>
                  )}
                </p>
              ) : (
                <p className="font-bold text-xl text-slate-300">—</p>
              )}
            </div>
            <div className="text-right">
              {maha && (
                <span className="text-xs font-medium text-slate-400">
                  Ends {fmtDate(maha.endDate)}
                </span>
              )}
              {bhukti && (
                <p className="text-[10px] text-primary font-semibold mt-0.5">
                  Bhukti until {fmtDate(bhukti.endDate)}
                </p>
              )}
            </div>
          </div>

          {/* Gradient progress bar with glow dot */}
          <div className="relative">
            <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(214,136,10,0.12)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #f5c200, #d6880a)",
                  boxShadow: "0 0 8px rgba(214,136,10,0.4)",
                }}
              />
            </div>
            {/* Glowing head dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{
                left: `calc(${pct}% - 7px)`,
                background: "#d6880a",
                boxShadow: "0 0 8px rgba(214,136,10,0.7)",
              }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-right">{pct}% elapsed</p>
        </div>
      </section>

      {/* ── Nav Grid ── */}
      <section className="px-6 py-4 grid grid-cols-2 gap-3 flex-1">
        {[
          { id: "/kundli",        title: "Kundli",        sub: "Birth Chart",   icon: PlanetIcon,     color: "#d6880a", bg: "rgba(214,136,10,0.07)",  border: "rgba(214,136,10,0.14)" },
          { id: "/consult",       title: "Consult",        sub: "AI Astrologer", icon: RobotIcon,      color: "#6366f1", bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.14)" },
          { id: "/compatibility", title: "Compatibility",  sub: "Gun Milan",     icon: HandHeartIcon,  color: "#f43f5e", bg: "rgba(244,63,94,0.07)",   border: "rgba(244,63,94,0.14)"  },
          { id: "/transits",      title: "Transits",       sub: "Gochar",        icon: BinocularsIcon, color: "#0d9488", bg: "rgba(13,148,136,0.07)",  border: "rgba(13,148,136,0.14)" },
        ].map((item) => (
          <div
            key={item.id}
            onClick={() => router.push(item.id)}
            className="p-4 rounded-2xl flex flex-col justify-between cursor-pointer active:scale-[0.97] transition-transform"
            style={{ background: item.bg, border: `1px solid ${item.border}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${item.color}18` }}
            >
              <item.icon size={22} weight="thin" style={{ color: item.color }} />
            </div>
            <div className="mt-8">
              <h4 className="font-bold text-sm text-slate-800">{item.title}</h4>
              <p className="text-[10px] mt-0.5" style={{ color: item.color, opacity: 0.8 }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}

const HomeContentNoSSR = dynamic(
  () => Promise.resolve(HomeContent as ComponentType),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-white" />,
  }
);

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContentNoSSR />
    </Suspense>
  );
}
