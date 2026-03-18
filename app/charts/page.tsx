"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  PlusIcon,
  SunIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrashIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import BottomNav from "@/components/BottomNav";

interface SavedChart {
  _id: string;
  birthDetails: { name: string; date: string; time?: string; city: string };
  chartData?: {
    moonSign?: string;
    ascendant?: string;
    sunSign?: string;
    planets?: Record<string, unknown>;
    raw?: {
      mahadasha?: unknown;
      planets?: Record<string, unknown>;
      moonSignIndex?: number;
      moonNakshatra?: string;
      marsHouse?: number | null;
      meta?: { birthDetails?: { lat?: number; lng?: number } };
    };
  };
  createdAt: string;
}

export default function ChartsPage() {
  const router   = useRouter();
  const { data: session, status } = useSession();
  const [charts,   setCharts]   = useState<SavedChart[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const googleId = (session?.user as { googleId?: string } | undefined)?.googleId;

  useEffect(() => {
    if (status === "loading") return;
    if (!googleId) {
      // Not signed in — go to landing
      router.replace("/");
      return;
    }
    fetch(`/api/chart/list?userId=${encodeURIComponent(googleId)}`)
      .then((r) => r.json())
      .then((d) => setCharts(d.charts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, googleId, router]);

  function openChart(chart: SavedChart) {
    // Persist as active chart in localStorage so /home can read it
    try {
      const raw = chart.chartData?.raw;
      localStorage.setItem("kundliai_chart", JSON.stringify({
        name:          chart.birthDetails.name,
        moonSign:      chart.chartData?.moonSign  ?? "",
        ascendant:     chart.chartData?.ascendant ?? "",
        sunSign:       chart.chartData?.sunSign   ?? "",
        mahadasha:     raw?.mahadasha ?? null,
        rawMahadasha:  raw?.mahadasha ?? null,
        planets:       chart.chartData?.planets ?? raw?.planets ?? null,
        meta:          raw?.meta ?? null,
        moonSignIndex: raw?.moonSignIndex ?? 0,
        moonNakshatra: raw?.moonNakshatra ?? "",
        marsHouse:     raw?.marsHouse ?? null,
        lat:           raw?.meta?.birthDetails?.lat ?? null,
        lng:           raw?.meta?.birthDetails?.lng ?? null,
        userId:        googleId,
        chartId:       chart._id,
      }));
    } catch { /* ignore */ }

    const params = new URLSearchParams({
      name:    chart.birthDetails.name,
      dob:     chart.birthDetails.date,
      time:    chart.birthDetails.time ?? "",
      city:    chart.birthDetails.city,
      userId:  googleId ?? "",
      chartId: chart._id,
    });
    router.push(`/home?${params.toString()}`);
  }

  async function deleteChart(chartId: string) {
    setDeleting(chartId);
    try {
      await fetch("/api/chart/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId, userId: googleId }),
      });
      setCharts((prev) => prev.filter((c) => c._id !== chartId));
    } catch { /* ignore */ }
    setDeleting(null);
  }

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CircleNotchIcon className="w-8 h-8 text-primary animate-spin" weight="thin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white page-enter"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 140px)" }}
    >
      {/* Header */}
      <header className="px-4 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="fraunces-italic text-2xl text-slate-900">My Charts</h1>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          {charts.length === 0 ? "No charts yet" : `${charts.length} chart${charts.length > 1 ? "s" : ""} saved`}
        </p>
      </header>

      {/* Chart list */}
      <div className="px-4 space-y-3">
        {charts.map((chart) => (
          <div
            key={chart._id}
            className="bg-white rounded-2xl border border-primary/15 shadow-sm overflow-hidden"
          >
            <button
              onClick={() => openChart(chart)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-primary/4 active:bg-primary/8 transition-colors"
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-lg text-primary"
                style={{ background: "linear-gradient(135deg, rgba(214,136,10,0.12), rgba(245,194,0,0.18))" }}
              >
                {chart.birthDetails.name[0]?.toUpperCase()}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-base leading-tight truncate">
                  {chart.birthDetails.name}
                </p>
                <p className="text-slate-400 text-xs mt-0.5 truncate">
                  {fmtDate(chart.birthDetails.date)}
                  {chart.birthDetails.city ? ` · ${chart.birthDetails.city.split(",")[0]}` : ""}
                </p>
                {chart.chartData?.moonSign && (
                  <p className="text-primary text-[11px] font-medium mt-0.5">
                    ☽ {chart.chartData.moonSign} Moon
                  </p>
                )}
              </div>

              <ArrowRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
            </button>

            {/* Delete strip */}
            <div className="border-t border-slate-100 px-4 py-2 flex justify-end">
              <button
                onClick={() => deleteChart(chart._id)}
                disabled={deleting === chart._id}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {deleting === chart._id
                  ? <CircleNotchIcon className="w-3 h-3 animate-spin" />
                  : <TrashIcon className="w-3 h-3" weight="thin" />
                }
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {charts.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center mb-4">
            <SunIcon className="w-10 h-10 text-primary/40" weight="thin" />
          </div>
          <p className="text-slate-500 text-sm">No charts saved yet</p>
          <p className="text-slate-300 text-xs mt-1">Create your first chart below</p>
        </div>
      )}

      {/* Add new chart FAB */}
      <div
        className="fixed left-1/2 -translate-x-1/2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)", maxWidth: 430, width: "100%", paddingInline: 16 }}
      >
        <button
          onClick={() => router.push("/?new=1")}
          className="w-full h-14 flex items-center justify-center gap-2.5 text-white font-bold text-base rounded-2xl active:scale-[0.98] transition-all"
          style={{
            background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)",
            boxShadow: "0 4px 20px rgba(214,136,10,0.35)",
          }}
        >
          <PlusIcon className="w-5 h-5" />
          Add New Chart
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
