"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ShareNetworkIcon, PlusIcon, StarIcon, UserIcon, CircleNotchIcon, WarningIcon, HandHeartIcon, SparkleIcon, MagicWandIcon } from "@phosphor-icons/react";
import { useNavContext } from "@/context/NavContext";
import {
  calcGunMilan,
  type GunMilanResult,
  type KootResult,
  SIGN_LIST,
  NAKSHATRA_LIST,
  NAK_TO_SIGN,
  nakIdx,
  sgnIdx,
} from "@/lib/gunmilan";
import { KOOT_REMEDIES } from "@/lib/remedies";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerForm { name: string; dob: string; time: string; city: string; }

interface PlaceSuggestion { display_name: string; lat: string; lon: string; }

interface UserSnap {
  name?: string;
  moonSign?: string;        // might be stale / invalid
  moonNakshatra?: string;   // added in later build
  moonSignIndex?: number;   // added in later build
  ascendant?: string;
  marsHouse?: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a user-facing Moon sign label from (potentially stale) localStorage */
function resolveMoonLabel(snap: UserSnap): string {
  // Prefer moonSign if it's a valid zodiac name
  if (snap.moonSign && SIGN_LIST.includes(snap.moonSign)) {
    return `${snap.moonSign} Moon`;
  }
  // Fall back: derive sign from nakshatra
  if (snap.moonNakshatra && NAKSHATRA_LIST.includes(snap.moonNakshatra)) {
    const nIdx = NAKSHATRA_LIST.indexOf(snap.moonNakshatra);
    return `${SIGN_LIST[NAK_TO_SIGN[nIdx]]} Moon`;
  }
  return "Moon sign unknown";
}

/** Get validated nakshatra index, or -1 if data is missing/stale */
function resolveNakIdx(snap: UserSnap): number {
  if (snap.moonNakshatra && NAKSHATRA_LIST.includes(snap.moonNakshatra)) {
    return NAKSHATRA_LIST.indexOf(snap.moonNakshatra);
  }
  return -1; // stale / missing
}

/** Get validated sign index */
function resolveSgnIdx(snap: UserSnap): number {
  // 1) use stored moonSignIndex if it looks valid
  if (typeof snap.moonSignIndex === "number" && snap.moonSignIndex >= 0 && snap.moonSignIndex <= 11) {
    return snap.moonSignIndex;
  }
  // 2) derive from valid moonSign name
  if (snap.moonSign && SIGN_LIST.includes(snap.moonSign)) {
    return SIGN_LIST.indexOf(snap.moonSign);
  }
  // 3) derive from nakshatra
  const nk = resolveNakIdx(snap);
  if (nk >= 0) return NAK_TO_SIGN[nk];
  return -1; // stale
}

// ─── Koot row ─────────────────────────────────────────────────────────────────

function KootRow({ koot }: { koot: KootResult }) {
  const pct = Math.round((koot.score / koot.maxPts) * 100);
  const color =
    koot.status === "excellent" ? "#16a34a" :
    koot.status === "good"      ? "#d97706" :
    koot.status === "neutral"   ? "#64748b" : "#dc2626";
  const bg =
    koot.status === "excellent" ? "rgba(22,163,74,0.06)"  :
    koot.status === "good"      ? "rgba(215,119,10,0.06)" :
    koot.status === "neutral"   ? "transparent"           :
    "rgba(220,38,38,0.05)";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0"
      style={{ background: bg }}
    >
      {/* Color dot */}
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />

      {/* Label */}
      <div className="w-24 shrink-0">
        <p className="text-xs font-bold text-slate-700 leading-tight">{koot.name}</p>
        <p className="text-[9px] text-slate-400">{koot.maxPts} pts</p>
      </div>

      {/* Bar */}
      <div className="flex-1">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{koot.detail}</p>
      </div>

      {/* Score */}
      <span className="text-xs font-bold shrink-0 w-8 text-right" style={{ color }}>
        {koot.score}/{koot.maxPts}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1939 }, (_, i) => CURRENT_YEAR - i);

export default function CompatibilityPage() {
  const router = useRouter();
  const { setSheetOpen } = useNavContext();

  const [showModal,       setShowModal]       = useState(false);
  const [partner,         setPartner]         = useState<PartnerForm | null>(null);
  const [partnerMoonSign, setPartnerMoonSign] = useState<string>("");
  const [partnerMarsHouse, setPartnerMarsHouse] = useState<number | null>(null);
  const [calcLoading,     setCalcLoading]     = useState(false);
  const [calcError,       setCalcError]       = useState<string | null>(null);
  const [gunMilan,        setGunMilan]        = useState<GunMilanResult | null>(null);
  const [insight,         setInsight]         = useState<string>("");
  const [insightLoading,  setInsightLoading]  = useState(false);
  const [sharing,         setSharing]         = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<PartnerForm>({ name: "", dob: "", time: "", city: "" });
  const [cityCoords,      setCityCoords]      = useState<{ lat: number; lng: number } | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [citySearching,   setCitySearching]   = useState(false);
  const cityDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityDropdownRef  = useRef<HTMLDivElement>(null);

  // Dismiss city dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCitySuggestions([]);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function onCityChange(value: string) {
    setForm((f) => ({ ...f, city: value }));
    setCityCoords(null);
    setCitySuggestions([]);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (value.trim().length < 2) return;
    cityDebounceRef.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`,
          { headers: { "User-Agent": "KundliAI-App/1.0 (vedic astrology calculator)" } }
        );
        setCitySuggestions(await res.json());
      } catch { setCitySuggestions([]); }
      finally { setCitySearching(false); }
    }, 350);
  }

  function selectCity(s: PlaceSuggestion) {
    setForm((f) => ({ ...f, city: s.display_name }));
    setCityCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setCitySuggestions([]);
  }

  // Restore last compatibility result from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("kundliai_compatibility") ?? "{}");
      const gm = saved?.gunMilan;
      // Only restore if the saved result has the current shape (koots array + boolean doshas)
      const isValidShape =
        gm &&
        Array.isArray(gm.koots) &&
        gm.koots.length > 0 &&
        typeof gm.nadiDosha   === "boolean" &&
        typeof gm.bhakutDosha === "boolean";

      if (saved?.partner && isValidShape) {
        setPartner(saved.partner);
        setPartnerMoonSign(saved.partnerMoonSign ?? "");
        setPartnerMarsHouse(saved.partnerMarsHouse ?? null);
        setGunMilan(gm);
        setInsight(saved.insight ?? "");
      } else if (saved?.partner && !isValidShape) {
        // Stale format — purge so next calculation stores fresh data
        localStorage.removeItem("kundliai_compatibility");
      }
    } catch { /* ignore */ }
  }, []);

  // Date dropdowns
  const [dobDay,   setDobDay]   = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear,  setDobYear]  = useState("");

  function openSheet() {
    // Pre-fill form with existing partner data so user can edit, not start blank
    if (partner) {
      setForm({ name: partner.name, dob: partner.dob, time: partner.time, city: partner.city });
      // Restore DOB dropdowns from stored YYYY-MM-DD
      const [y, m, d] = partner.dob.split("-");
      setDobYear(y ?? "");
      setDobMonth(MONTHS[parseInt(m ?? "0") - 1] ?? "");
      setDobDay(String(parseInt(d ?? "0")));
    } else {
      setForm({ name: "", dob: "", time: "", city: "" });
      setDobYear(""); setDobMonth(""); setDobDay("");
    }
    setCitySuggestions([]);
    setCityCoords(null);
    setCalcError(null);
    setShowModal(true);
    setSheetOpen(true);
  }
  function closeSheet() {
    setShowModal(false);
    setSheetOpen(false);
    setCitySuggestions([]);
    setCityCoords(null);
  }

  const [userData, setUserData] = useState<UserSnap | null>(null);
  const [noChart,   setNoChart]   = useState(false);
  const [staleData, setStaleData] = useState(false);

  useEffect(() => {
    try {
      const snap: UserSnap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
      if (snap?.name) {
        setUserData(snap);
        if (!snap.moonNakshatra || !NAKSHATRA_LIST.includes(snap.moonNakshatra)) {
          setStaleData(true);
        }
      } else {
        setNoChart(true);
      }
    } catch { setNoChart(true); }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthNum = dobMonth ? String(MONTHS.indexOf(dobMonth) + 1).padStart(2, "0") : "";
    const dayNum   = dobDay   ? dobDay.padStart(2, "0") : "";
    const builtDob = dobYear && monthNum && dayNum ? `${dobYear}-${monthNum}-${dayNum}` : "";
    if (!form.name || !builtDob || !form.city) return;
    const formWithDob = { ...form, dob: builtDob };
    setCalcLoading(true);
    setCalcError(null);
    setGunMilan(null);
    setInsight("");

    try {
      const res  = await fetch("/api/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formWithDob.name,
          date: formWithDob.dob,
          time: formWithDob.time || "12:00",
          city: formWithDob.city,
          ...(cityCoords ? { lat: cityCoords.lat, lng: cityCoords.lng } : {}),
        }),
      });
      // Safely parse — API occasionally returns non-JSON on server error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server error — please check the city name and try again.");
      }
      if (!res.ok) throw new Error(data?.error ?? "API error");

      // ── Partner Moon data (always fresh from API) ──────────────────────
      const moonP = data.chart?.planets?.Moon as
        { nakshatra?: string; signIndex?: number } | undefined;
      const marsP = data.chart?.planets?.Mars as { house?: number } | undefined;
      const resolvedPartnerMarsHouse = typeof marsP?.house === "number" ? marsP.house : null;

      const partnerNakName = moonP?.nakshatra ?? "";
      const partnerNakResolved = nakIdx(partnerNakName);
      if (partnerNakResolved < 0) {
        throw new Error(`Could not determine ${formWithDob.name}'s Moon nakshatra from the chart. Please try entering their birth time for better accuracy.`);
      }
      const partnerNak = partnerNakResolved;
      const partnerSgnResolved = typeof moonP?.signIndex === "number"
        ? moonP.signIndex
        : sgnIdx(data.chart?.moonSign ?? "");
      if (partnerSgnResolved < 0) {
        throw new Error(`Could not determine ${formWithDob.name}'s Moon sign from the chart. Please try entering their birth time for better accuracy.`);
      }
      const partnerSgn = partnerSgnResolved;

      // ── User Moon data (from localStorage, validated) ──────────────────
      const snap = userData ?? {};
      const userNak = resolveNakIdx(snap);
      const userSgn = resolveSgnIdx(snap);

      // Block calculation if user's own nakshatra is missing — results would be wrong
      if (userNak < 0) {
        throw new Error("Your Moon nakshatra is missing. Please go to the home screen and re-enter your birth details to generate a fresh chart, then try again.");
      }

      const result = calcGunMilan(userNak, userSgn, partnerNak, partnerSgn);
      const partnerMoonLabel = data.chart?.moonSign ? `${data.chart.moonSign} Moon` : "";
      setGunMilan(result);
      setPartner(formWithDob);
      setPartnerMoonSign(partnerMoonLabel);
      setPartnerMarsHouse(resolvedPartnerMarsHouse);
      setInsight(""); // clear stale insight while new one loads

      // Persist to localStorage so results survive a page reload
      try {
        localStorage.setItem("kundliai_compatibility", JSON.stringify({
          partner: formWithDob,
          partnerMoonSign: partnerMoonLabel,
          partnerMarsHouse: resolvedPartnerMarsHouse,
          gunMilan: result,
          insight: "",
        }));
      } catch { /* ignore quota errors */ }

      // Non-blocking Claude insight fetch
      const doshas: string[] = [];
      if (result.nadiDosha)   doshas.push("Nadi Dosha");
      if (result.bhakutDosha) doshas.push("Bhakut Dosha");
      setInsightLoading(true);
      fetch("/api/compatibility/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name1: userData?.name ?? "Person 1",
          moonSign1: resolveMoonLabel(snap).replace(" Moon", ""),
          nakshatra1: snap.moonNakshatra ?? "",
          name2: formWithDob.name,
          moonSign2: data.chart?.moonSign ?? "",
          nakshatra2: partnerNakName,
          totalScore: result.totalScore,
          rating: result.rating,
          koots: result.koots,
          doshas,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          const text = d.insight ?? "";
          setInsight(text);
          try {
            const stored = JSON.parse(localStorage.getItem("kundliai_compatibility") ?? "{}");
            localStorage.setItem("kundliai_compatibility", JSON.stringify({ ...stored, insight: text }));
          } catch { /* ignore */ }
        })
        .catch(() => { /* non-blocking */ })
        .finally(() => setInsightLoading(false));

      // Non-blocking save to MongoDB
      try {
        const savedChart = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
        const userId = savedChart?.userId ?? "";
        const chartId = savedChart?.chartId ?? "";
        if (userId) {
          fetch("/api/compatibility/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              chartId: chartId || undefined,
              partner: formWithDob,
              partnerMoonSign: partnerMoonLabel,
              gunMilan: result,
            }),
          }).catch(() => {/* non-blocking */});
        }
      } catch { /* ignore */ }

      closeSheet();
    } catch (err) {
      setCalcError(String(err));
    } finally {
      setCalcLoading(false);
    }
  };

  const totalScore = gunMilan ? Math.round(gunMilan.totalScore) : null;
  const matchPct = totalScore !== null ? Math.round((totalScore / 36) * 100) : null;
  const moonLabel = userData ? resolveMoonLabel(userData) : "Add your chart";

  const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];
  const userMarsHouse = userData?.marsHouse ?? null;
  const userIsManglik   = userMarsHouse   !== null && MANGLIK_HOUSES.includes(userMarsHouse);
  const partnerIsManglik = partnerMarsHouse !== null && MANGLIK_HOUSES.includes(partnerMarsHouse);
  const showMangalSection = partner !== null && (userMarsHouse !== null || partnerMarsHouse !== null);

  const taraKoot = gunMilan?.koots.find((k) => k.name === "Tara");
  const taraDosha = taraKoot?.score === 0;

  // Koots scoring below 50% — shown in the koot-specific remedies section
  const weakKoots = gunMilan?.koots.filter((k) => k.score / k.maxPts < 0.5 && KOOT_REMEDIES[k.name]) ?? [];

  async function shareResult() {
    if (!gunMilan || !partner) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const card = shareCardRef.current;
      if (!card) return;
      card.style.display = "flex";
      const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: "#fffbf0" });
      card.style.display = "none";
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "kundli-milan.png", { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${userData?.name ?? "My"} × ${partner.name} — ${gunMilan.totalScore}/36`,
            text: `Gun Milan score: ${gunMilan.totalScore}/36 — ${gunMilan.rating}. Calculated with KundliAI.`,
            files: [file],
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "kundli-milan.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch { /* ignore */ }
    finally { setSharing(false); }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background-light page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center px-4 py-4 justify-between"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <button onClick={() => router.back()} className="text-slate-900 p-2">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="fraunces-italic text-3xl text-primary">Compatibility</h1>
        <button
          onClick={shareResult}
          disabled={!gunMilan || sharing}
          className="p-2 text-slate-900 disabled:opacity-30 transition-opacity"
        >
          {sharing
            ? <CircleNotchIcon className="w-6 h-6 animate-spin text-primary" />
            : <ShareNetworkIcon className="w-6 h-6" />
          }
        </button>
      </div>

      {/* ── No chart / stale chart blocker ── */}
      {(noChart || staleData) && (
        <div className="mx-4 mb-2 rounded-xl p-4 flex items-start gap-3 border-2" style={{ background: "rgba(214,136,10,0.06)", borderColor: "rgba(214,136,10,0.35)" }}>
          <WarningIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#7a4a00" }}>
              {noChart ? "Your birth chart is missing" : "Your chart data is outdated"}
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#a05a00" }}>
              {noChart
                ? "Gun Milan needs your Moon nakshatra. Please generate your chart first."
                : "Your saved chart is missing Moon nakshatra data. Re-enter your birth details to fix this — otherwise compatibility scores will be wrong."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-2 px-4 py-1.5 text-white text-xs font-bold rounded-full active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)" }}
            >
              {noChart ? "Generate My Chart →" : "Update My Chart →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Person cards ── */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4">
        {/* You */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-primary p-1 bg-primary/10 flex items-center justify-center">
              <SunIcon className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              YOU
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{userData?.name ?? "You"}</p>
            <p className="text-slate-500 text-xs italic">{moonLabel}</p>
          </div>
        </div>

        {/* Partner */}
        {partner ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={openSheet}
              className="relative group"
              title="Change partner"
            >
              <div className="w-24 h-24 rounded-full border-2 border-primary/40 p-1 bg-primary/5 flex items-center justify-center group-hover:border-primary transition-colors">
                <UserIcon className="w-10 h-10 text-primary/60" />
              </div>
              {/* Edit badge */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                <PlusIcon className="w-3 h-3 text-white rotate-45" />
              </div>
            </button>
            <div className="text-center">
              <p className="font-semibold text-sm">{partner.name}</p>
              <p className="text-slate-500 text-xs italic">{partnerMoonSign || partner.city}</p>
              <button
                onClick={openSheet}
                className="mt-1 text-[10px] font-bold text-primary underline underline-offset-2"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={openSheet}
              className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:bg-primary/10 transition-colors group"
            >
              <PlusIcon className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
            </button>
            <div className="text-center">
              <p className="font-semibold text-sm">Add Partner</p>
              <p className="text-slate-500 text-xs italic">Tap to match</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Score ring ── */}
      {gunMilan ? (
        <div className="flex flex-col items-center justify-center py-5">
          <div
            className="relative w-40 h-40 flex items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${gunMilan.ratingColor} ${matchPct}%, #e2e8f0 0%)`,
            }}
          >
            <div className="w-[85%] h-[85%] bg-background-light rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-4xl font-bold" style={{ color: gunMilan.ratingColor }}>
                {totalScore}
              </span>
              <span className="text-[10px] tracking-widest uppercase font-medium text-slate-500">
                / 36
              </span>
            </div>
          </div>
          <p className="mt-3 font-bold text-lg" style={{ color: gunMilan.ratingColor }}>
            {gunMilan.rating}
          </p>
          <p className="text-sm text-slate-500 text-center px-8 mt-1">{gunMilan.summary}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <div
            className="relative w-40 h-40 flex items-center justify-center rounded-full"
            style={{ background: "conic-gradient(from 0deg, #d6880a 0%, #e2e8f0 0%)" }}
          >
            <div className="w-[85%] h-[85%] bg-background-light rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl">🪐</span>
              <span className="text-[10px] tracking-widest uppercase font-medium text-slate-400 mt-1">
                Awaiting
              </span>
            </div>
          </div>
          <p className="mt-4 fraunces-italic text-lg text-slate-500">
            Add a partner to reveal your score
          </p>
        </div>
      )}

      {/* ── Nadi Dosha warning banner ── */}
      {gunMilan?.nadiDosha && (
        <div className="mx-4 mb-3 rounded-xl border-2 border-red-400 bg-red-50 p-4 flex gap-3">
          <WarningIcon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm">Nadi Dosha Present</p>
            <p className="text-xs text-red-600 mt-1 leading-relaxed">
              Both partners share the same Nadi — this is the most serious dosha in Gun Milan (0/8 points). 
              Traditional astrology associates this with health and progeny concerns. 
              Consult a qualified Jyotishi for possible remedies before proceeding.
            </p>
          </div>
        </div>
      )}

      {/* ── Bhakut Dosha warning ── */}
      {gunMilan?.bhakutDosha && (
        <div className="mx-4 mb-3 rounded-xl p-3 flex gap-3 border" style={{ background: "rgba(214,136,10,0.06)", borderColor: "rgba(214,136,10,0.25)" }}>
          <WarningIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d6880a" }} />
          <div>
            <p className="font-bold text-xs" style={{ color: "#7a4a00" }}>Bhakut Dosha Present</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#a05a00" }}>
              Challenging Moon sign positions (6/8 or 2/12 relationship).
              Remedies are available through qualified astrological guidance.
            </p>
          </div>
        </div>
      )}

      {/* ── Dosha Remedies ── */}
      {gunMilan && (gunMilan.nadiDosha || gunMilan.bhakutDosha || taraDosha) && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Dosha Remedies</p>
          <div className="space-y-2">

            {gunMilan.nadiDosha && (
              <div className="rounded-xl bg-[#FFF8EE] border-l-4 border-red-400 p-4 flex gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(220,38,38,0.1)" }}>
                  <HandHeartIcon size={16} weight="thin" className="text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Nadi Dosha Remedy</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Perform Maha Mrityunjaya Japa — 108 repetitions for 40 days.
                  </p>
                </div>
              </div>
            )}

            {taraDosha && (
              <div className="rounded-xl bg-[#FFF8EE] border-l-4 border-indigo-400 p-4 flex gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <StarIcon size={16} weight="thin" className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Tara Dosha Remedy</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Visit a Navagraha temple on Saturdays. Offer sesame seeds to Shani.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#FFF8EE] border-l-4 border-primary p-4 flex gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(214,136,10,0.1)" }}>
                <SparkleIcon size={16} weight="thin" className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">General Remedy</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Consult a qualified Jyotishi for a personalized Kundli Milan report.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Ashta Koot detail ── */}
      {gunMilan && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-white border border-primary/10 shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-primary/10"
              style={{ background: "rgba(214,136,10,0.04)" }}
            >
              <StarIcon className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Ashta Koot — 36-Point Gun Milan
              </p>
              <span className="ml-auto text-[10px] font-bold text-slate-400">
                {totalScore} / 36 pts
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              {[
                { color: "#16a34a", label: "Full score" },
                { color: "#d97706", label: "Partial" },
                { color: "#dc2626", label: "Dosha" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[9px] text-slate-400 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {gunMilan.koots.map((k) => (
              <KootRow key={k.name} koot={k} />
            ))}
          </div>
        </div>
      )}

      {/* ── Mangal Dosha ── */}
      {showMangalSection && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-white border border-primary/10 shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-primary/10"
              style={{ background: "rgba(214,136,10,0.04)" }}
            >
              <MagicWandIcon size={16} weight="thin" className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Mangal Dosha Check
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {/* User */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {userData?.name ?? "You"}
                </p>
                {userMarsHouse !== null ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{userIsManglik ? "⚠️" : "✅"}</span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: userIsManglik ? "#d97706" : "#16a34a" }}
                      >
                        {userIsManglik ? "Manglik" : "No Dosha"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {userIsManglik
                        ? `Mars in house ${userMarsHouse} — Mangal Dosha present`
                        : `Mars in house ${userMarsHouse} — no Mangal influence`}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Regenerate chart to check</p>
                )}
              </div>

              {/* Partner */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {partner?.name ?? "Partner"}
                </p>
                {partnerMarsHouse !== null ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{partnerIsManglik ? "⚠️" : "✅"}</span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: partnerIsManglik ? "#d97706" : "#16a34a" }}
                      >
                        {partnerIsManglik ? "Manglik" : "No Dosha"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {partnerIsManglik
                        ? `Mars in house ${partnerMarsHouse} — Mangal Dosha present`
                        : `Mars in house ${partnerMarsHouse} — no Mangal influence`}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Not available</p>
                )}
              </div>
            </div>

            {/* Combined verdict */}
            {userMarsHouse !== null && partnerMarsHouse !== null && (
              <div
                className="px-4 py-3 flex items-center gap-2 border-t border-slate-100"
                style={{
                  background: userIsManglik && partnerIsManglik
                    ? "rgba(22,163,74,0.06)"
                    : (userIsManglik || partnerIsManglik)
                      ? "rgba(217,119,6,0.06)"
                      : "rgba(22,163,74,0.06)",
                }}
              >
                <span className="text-sm">
                  {userIsManglik && partnerIsManglik ? "✅" : (userIsManglik || partnerIsManglik) ? "⚠️" : "✅"}
                </span>
                <div>
                  <p
                    className="text-xs font-bold"
                    style={{
                      color: userIsManglik && partnerIsManglik
                        ? "#16a34a"
                        : (userIsManglik || partnerIsManglik)
                          ? "#d97706" : "#16a34a",
                    }}
                  >
                    {userIsManglik && partnerIsManglik
                      ? "Dosha Cancels Out"
                      : (userIsManglik || partnerIsManglik)
                        ? "One Partner is Manglik"
                        : "No Mangal Dosha"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {userIsManglik && partnerIsManglik
                      ? "Both partners share Mangal Dosha — it neutralises per traditional rules."
                      : (userIsManglik || partnerIsManglik)
                        ? "Consult a Jyotishi for remedies before proceeding."
                        : "Neither partner has Mars in a Mangal Dosha house."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Koot-specific remedies (weak koots only) ── */}
      {weakKoots.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Koot Remedies</p>
          <div className="space-y-2">
            {weakKoots.map((k) => {
              const remedy = KOOT_REMEDIES[k.name];
              return (
                <div
                  key={k.name}
                  className="rounded-xl bg-[#FFF8EE] p-4 flex gap-3 shadow-sm border-l-4"
                  style={{ borderLeftColor: remedy.color }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${remedy.color}18` }}
                  >
                    <StarIcon size={14} weight="thin" style={{ color: remedy.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">
                      {k.name} — {k.score}/{k.maxPts} pts
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{remedy.ritual}</p>
                    {remedy.mantra && (
                      <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">{remedy.mantra}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cosmic Insight (Claude AI) ── */}
      <div className="px-4 pb-6">
        <div className="rounded-xl border border-primary/20 p-5" style={{ background: "linear-gradient(135deg, rgba(214,136,10,0.06) 0%, rgba(214,136,10,0.10) 100%)" }}>
          <div className="flex items-center gap-2 mb-3 text-primary">
            <SparkleIcon size={16} weight="thin" />
            <span className="text-xs font-bold uppercase tracking-wider">Cosmic Insight</span>
            {insightLoading && <CircleNotchIcon size={12} weight="thin" className="animate-spin ml-auto" />}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            {insightLoading
              ? <span className="text-slate-400 italic">Reading the stars…</span>
              : insight
                ? insight
                : gunMilan
                  ? gunMilan.summary
                  : "Add your partner's birth details to receive your personalised Gun Milan score — the same sacred 36-point system used by Jyotishis for marriage matching across generations."
            }
          </p>
        </div>
      </div>

      {/* ── Partner bottom sheet ── */}
      {showModal && (
        /* Overlay: z-9998, covers full screen including bottom nav (z-40) */
        <div
          className="fixed inset-0"
          style={{ background: "rgba(0,0,0,0.55)", zIndex: 9998 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
        >
          {/* Sheet: z-9999, flex column, max-height 80vh */}
          <div
            className="absolute bottom-0 bg-white"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
              borderRadius: "24px 24px 0 0",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(430px, 100vw)",
              zIndex: 9999,
              animation: "slideUp 0.3s cubic-bezier(0.4,0,0.2,1) both",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-4 pb-5 shrink-0">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D4D4D4" }} />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-4 shrink-0">
              <div className="flex-1">
                <h3 className="fraunces-italic text-2xl text-primary">Partner&apos;s Details</h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  We only need Moon nakshatra to calculate Gun Milan.
                  Time of birth improves accuracy.
                </p>
              </div>
              <button
                onClick={closeSheet}
                className="ml-3 mt-0.5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Error */}
            {calcError && (
              <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs shrink-0">
                {calcError}
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleAdd}
              style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}
            >
              {/* Scrollable fields */}
              <div
                className="no-scrollbar"
                style={{ flex: 1, overflowY: "auto", padding: "0 24px 8px" }}
              >
                <div className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#d6880a" }}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Priya Patel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350)}
                      className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none transition-all"
                      style={{ background: "#FFF8EE" }}
                    />
                  </div>

                  {/* Date of Birth — three dropdowns */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#d6880a" }}>Date of Birth</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {/* Day */}
                      <select
                        value={dobDay}
                        onChange={(e) => setDobDay(e.target.value)}
                        className="flex-1 h-12 border border-slate-200 rounded-xl px-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                        style={{ background: "#FFF8EE", minWidth: 0 }}
                      >
                        <option value="">DD</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={String(d).padStart(2, "0")}>{String(d).padStart(2, "0")}</option>
                        ))}
                      </select>
                      {/* Month */}
                      <select
                        value={dobMonth}
                        onChange={(e) => setDobMonth(e.target.value)}
                        className="flex-1 h-12 border border-slate-200 rounded-xl px-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                        style={{ background: "#FFF8EE", minWidth: 0 }}
                      >
                        <option value="">Mon</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      {/* Year */}
                      <select
                        value={dobYear}
                        onChange={(e) => setDobYear(e.target.value)}
                        className="flex-1 h-12 border border-slate-200 rounded-xl px-3 text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                        style={{ background: "#FFF8EE", minWidth: 0 }}
                      >
                        <option value="">YYYY</option>
                        {YEARS.map((y) => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Time of Birth */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#d6880a" }}>Time of Birth</label>
                      <span className="text-[10px] uppercase text-slate-400 font-bold">Optional</span>
                    </div>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350)}
                      className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                      style={{ background: "#FFF8EE" }}
                    />
                  </div>

                  {/* City of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#d6880a" }}>City of Birth</label>
                    <div className="relative" ref={cityDropdownRef}>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Mumbai, India"
                          value={form.city}
                          onChange={(e) => onCityChange(e.target.value)}
                          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350)}
                          autoComplete="off"
                          className="w-full h-12 border border-slate-200 rounded-xl px-4 pr-10 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary outline-none transition-all"
                          style={{ background: "#FFF8EE" }}
                          required
                        />
                        <div className="absolute right-3 text-slate-400 pointer-events-none">
                          {citySearching
                            ? <CircleNotchIcon className="w-4 h-4 animate-spin" />
                            : <span className="text-xs">📍</span>
                          }
                        </div>
                      </div>

                      {citySuggestions.length > 0 && (
                        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          {citySuggestions.map((s, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                onMouseDown={() => selectCity(s)}
                                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors border-b border-slate-100 last:border-0"
                              >
                                <span className="text-primary text-xs mt-0.5 shrink-0">📍</span>
                                <span className="text-xs text-slate-700 leading-snug line-clamp-2">{s.display_name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {cityCoords && (
                        <p className="text-[10px] font-bold text-primary mt-1 px-1">
                          ✓ Location confirmed · {cityCoords.lat.toFixed(3)}, {cityCoords.lng.toFixed(3)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer button — always visible, never scrolls away */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "16px 24px 40px",
                  background: "#fff",
                  borderTop: "1px solid rgba(214,136,10,0.15)",
                }}
              >
                <button
                  type="submit"
                  disabled={calcLoading}
                  className="w-full h-14 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-70"
                  style={{
                    background: calcLoading ? "#d6880a" : "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)",
                    boxShadow: "0 8px 24px rgba(214,136,10,0.35)",
                  }}
                >
                  {calcLoading ? (
                    <><CircleNotchIcon className="w-5 h-5 animate-spin" /> Calculating compatibility…</>
                  ) : (
                    "Calculate Compatibility →"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add partner FAB */}
      {!partner && !showModal && (
        <div className="fixed z-40" style={{ bottom: "88px", right: "16px", maxWidth: "430px" }}>
          <button
            onClick={openSheet}
            className="flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-3 rounded-full shadow-lg shadow-primary/30 active:scale-95 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Add Partner
          </button>
        </div>
      )}

      {/* ── Hidden share card (rendered off-screen, captured by html2canvas) ── */}
      <div
        ref={shareCardRef}
        style={{
          display: "none",
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 390,
          padding: 32,
          flexDirection: "column",
          alignItems: "center",
          background: "#fffbf0",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#d6880a", marginBottom: 4, textTransform: "uppercase" }}>
          KundliAI
        </div>
        <div style={{ fontSize: 11, color: "#a07840", marginBottom: 24, letterSpacing: "0.1em" }}>
          Vedic Compatibility · Gun Milan
        </div>

        {/* Names */}
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", textAlign: "center", marginBottom: 4 }}>
          {userData?.name ?? "—"} × {partner?.name ?? "—"}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 24, textAlign: "center" }}>
          {moonLabel} · {partnerMoonSign}
        </div>

        {/* Score ring (CSS) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: `conic-gradient(${gunMilan?.ratingColor ?? "#d6880a"} ${matchPct ?? 0}%, #e2e8f0 0%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#fffbf0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: gunMilan?.ratingColor ?? "#d6880a", lineHeight: 1 }}>{totalScore}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>/ 36</span>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: gunMilan?.ratingColor ?? "#d6880a" }}>
            {gunMilan?.rating}
          </div>
        </div>

        {/* Top 5 koot pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {gunMilan?.koots
            .filter((k) => k.score / k.maxPts >= 0.75)
            .map((k) => (
              <div key={k.name} style={{ background: "rgba(22,163,74,0.10)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#16a34a" }}>
                {k.name} {k.score}/{k.maxPts}
              </div>
            ))}
        </div>

        {/* Insight snippet */}
        {insight && (
          <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 1.6, maxWidth: 300, marginBottom: 20, fontStyle: "italic" }}>
            &ldquo;{insight.split(".")[0]}.&rdquo;
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: 10, color: "#a07840", letterSpacing: "0.08em" }}>
          Calculated with KundliAI · kundliai.app
        </div>
      </div>

    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}
