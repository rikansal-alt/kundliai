"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { SunIcon, CalendarBlankIcon, ClockIcon, MapPinIcon, ArrowRightIcon, LockIcon, SparkleIcon, StarIcon, ClockCounterClockwiseIcon, CrosshairIcon, CircleNotchIcon, InstagramLogoIcon } from "@phosphor-icons/react";
import { saveGuestSession, getGuestSession } from "@/lib/guestSession";

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", time: "", city: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Educational loading step timer
  useEffect(() => {
    if (!saving) { setLoadingStep(0); return; }
    const t1 = setTimeout(() => setLoadingStep(1), 2000);
    const t2 = setTimeout(() => setLoadingStep(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [saving]);

  // Returning guest: if they already have a chart in localStorage, go straight to /home
  // Skip redirect if ?new=1 is in the URL (user wants to create a new chart)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new") === "1") return;

    try {
      const snap = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
      if (snap?.name && snap?.moonSign) {
        const guest = getGuestSession();
        // Only auto-redirect if the guest session is still fresh (not expired)
        if (guest && guest.birthDetails) {
          const params = new URLSearchParams({
            name:   snap.name,
            dob:    guest.birthDetails.date,
            time:   guest.birthDetails.time ?? "",
            city:   guest.birthDetails.city,
            userId: snap.userId ?? "",
            ...(snap.chartId ? { chartId: snap.chartId } : {}),
          });
          router.replace(`/home?${params.toString()}`);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authenticated user: go to chart picker (unless ?new=1 means they want to add a chart)
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const isNew = new URLSearchParams(window.location.search).get("new") === "1";
    if (isNew) {
      // Pre-fill name from Google and let them fill the form
      const firstName = session.user.name?.split(" ")[0] ?? "";
      if (firstName) setForm((f) => ({ ...f, name: firstName }));
      return;
    }
    // Otherwise go to chart picker
    router.replace("/charts");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dismiss dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onCityChange(value: string) {
    setForm((f) => ({ ...f, city: value }));
    setCoords(null);
    setSuggestions([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`,
          { headers: { "User-Agent": "KundliAI-App/1.0 (vedic astrology calculator)" } }
        );
        const data: PlaceSuggestion[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function selectSuggestion(s: PlaceSuggestion) {
    setForm((f) => ({ ...f, city: s.display_name }));
    setCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "User-Agent": "KundliAI-App/1.0 (vedic astrology calculator)" } }
          );
          const data = await res.json();
          const addr = data?.address;
          const city = addr?.city || addr?.town || addr?.village || addr?.county || data?.display_name || "";
          setForm((f) => ({ ...f, city }));
        } catch {
          setForm((f) => ({ ...f, city: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        }
        setDetecting(false);
      },
      (err) => {
        setError("Could not get location: " + err.message);
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.dob || !form.city) return;
    setSaving(true);
    setLoadingStep(0);
    setError(null);

    // Use stable googleId when signed in; fall back to name_dob for guests
    const googleId = (session?.user as { googleId?: string } | undefined)?.googleId;
    const userId = googleId ?? `${form.name.toLowerCase().replace(/\s+/g, "_")}_${form.dob.replace(/\//g, "-")}`;
    let chartId = "";

    try {
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          date: form.dob,
          time: form.time,
          city: form.city,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        }),
      });

      const genData = await genRes.json();

      if (!genRes.ok) {
        setError(genData?.error ?? "Failed to calculate chart. Please check your details.");
        setSaving(false);
        return;
      }

      if (!genData?.chart) {
        setError("Chart data not received. Please try again.");
        setSaving(false);
        return;
      }

      const c = genData.chart;
      const moonPlanet = c.planets?.Moon as { sign?: string; signIndex?: number; nakshatra?: string } | undefined;
      const marsPlanet = c.planets?.Mars as { house?: number } | undefined;
      const snap = {
        name:          form.name,
        ascendant:     c.ascendant ?? "",
        moonSign:      c.moonSign ?? "",
        sunSign:       c.sunSign  ?? "",
        moonSignIndex: moonPlanet?.signIndex ?? 0,
        moonNakshatra: moonPlanet?.nakshatra ?? "",
        marsHouse:     marsPlanet?.house ?? null,
        lat:           c.meta?.birthDetails?.lat  ?? null,
        lng:           c.meta?.birthDetails?.lng  ?? null,
        mahadasha:     c.mahadasha ?? null,
        rawMahadasha:  c.mahadasha ?? null,
        planets:       c.planets ?? null,
        meta:          c.meta ?? null,
        userId,
      };
      localStorage.setItem("kundliai_chart", JSON.stringify(snap));

      // Save to guest session for migration after Google login
      saveGuestSession({
        birthDetails: {
          name:  form.name,
          date:  form.dob,
          time:  form.time,
          city:  form.city,
          lat:   coords?.lat ?? null,
          lng:   coords?.lng ?? null,
        },
        chartData: {
          ascendant: c.ascendant?.sign ?? "",
          moonSign:  c.moonSign ?? "",
          sunSign:   c.sunSign  ?? "",
          planets:   c.planets ?? {},
          mahadasha: c.mahadasha ?? null,
          raw:       c,
        } as Record<string, unknown>,
      });

      try {
        const saveRes = await fetch("/api/chart/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            birthDetails: {
              name: form.name,
              date: form.dob,
              time: form.time,
              city: form.city,
              lat: c.meta?.birthDetails?.lat,
              lng: c.meta?.birthDetails?.lng,
            },
            chartData: {
              ascendant: c.ascendant?.sign,
              moonSign:  c.moonSign,
              sunSign:   c.sunSign,
              planets:   c.planets,
              mahadasha: c.mahadasha?.currentMahadasha ?? c.mahadasha?.current,
              themes:    [],
              summary:   "",
              raw:       c,
            },
          }),
        });
        if (!saveRes.ok) {
          console.error("Chart save HTTP error:", saveRes.status, await saveRes.text().catch(() => ""));
        }
        if (saveRes.ok) {
          const saved = await saveRes.json();
          chartId = saved.chartId ?? "";
          // Persist chartId so compatibility page can link results to this chart
          if (chartId) {
            try {
              const existing = JSON.parse(localStorage.getItem("kundliai_chart") ?? "{}");
              localStorage.setItem("kundliai_chart", JSON.stringify({ ...existing, chartId }));
            } catch { /* ignore */ }
          }
        }
      } catch (saveErr) {
        // DB save is non-blocking; chart is already in localStorage
        console.error("Chart save failed:", saveErr);
      }

      const params = new URLSearchParams({
        name: form.name,
        dob:  form.dob,
        time: form.time,
        city: form.city,
        userId,
        ...(chartId ? { chartId } : {}),
      });
      router.push(`/home?${params.toString()}`);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const LOADING_STEPS = [
    { title: "Calculating planetary positions…", sub: "Using precise astronomical data — the same system professional Vedic astrologers use" },
    { title: "Finding your nakshatra…", sub: "Your Moon nakshatra reveals your deepest emotional patterns and life purpose" },
    { title: "Preparing your personal reading…", sub: "Your chart is unique to the exact minute and place of your birth" },
  ];

  return (
    <div
      className="w-full px-6 flex flex-col items-center mx-auto min-h-screen page-enter"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 40px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
    >
      {/* Educational loading overlay */}
      {saving && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm px-8">
          {/* Spinning sun */}
          <div className="mb-10 relative">
            <div className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <SunIcon className="text-primary w-8 h-8" weight="thin" />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-6 max-w-[300px]">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={i}
                className="transition-all duration-500"
                style={{
                  opacity: loadingStep >= i ? 1 : 0.2,
                  transform: loadingStep >= i ? "translateY(0)" : "translateY(8px)",
                }}
              >
                <p className="text-sm font-semibold text-slate-800 text-center">{step.title}</p>
                <p className="text-[11px] text-slate-400 text-center mt-1 leading-relaxed">{step.sub}</p>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex gap-2 mt-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: loadingStep >= i ? "#d6880a" : "rgba(214,136,10,0.2)" }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="mb-8 relative flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute w-24 h-24 rounded-full" style={{ background: "radial-gradient(circle, rgba(214,136,10,0.15) 0%, transparent 70%)" }} />
        {/* Middle ring */}
        <div className="absolute w-16 h-16 rounded-full border border-primary/20" />
        {/* Inner icon */}
        <div className="relative w-14 h-14 rounded-full flex items-center justify-center border border-primary/30" style={{ background: "linear-gradient(135deg, rgba(214,136,10,0.12), rgba(245,194,0,0.18))" }}>
          <SunIcon className="text-primary w-7 h-7" weight="thin" />
        </div>
      </div>

      {/* Header */}
      <header className="text-center mb-10">
        <h1 className="fraunces-italic text-5xl text-primary font-bold mb-2">KundliAI</h1>
        <p className="text-xs tracking-[0.2em] font-medium text-slate-500 uppercase">Vedic Astrology · AI · Ancient Wisdom</p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
          <input
            className="w-full h-14 bg-primary/5 border border-slate-200 rounded-xl px-5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none"
            placeholder="Arjun Sharma"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 ml-1">Date of Birth</label>
          <div className="relative flex items-center">
            <input
              className="w-full h-14 bg-primary/5 border border-slate-200 rounded-xl px-5 pr-12 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none appearance-none cursor-pointer"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              max={new Date().toISOString().split("T")[0]}
              suppressHydrationWarning
              required
            />
            <CalendarBlankIcon className="absolute right-4 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {/* Time of Birth */}
        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-sm font-semibold text-slate-700">Time of Birth</label>
            <span className="text-[10px] uppercase text-slate-400 font-bold">Optional</span>
          </div>
          <div className="relative flex items-center">
            <input
              className="w-full h-14 bg-primary/5 border border-slate-200 rounded-xl px-5 pr-12 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none appearance-none cursor-pointer"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
            <ClockIcon className="absolute right-4 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {/* City of Birth */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 ml-1">City of Birth</label>

          {/* Detect location button */}
          <button
            type="button"
            onClick={detectLocation}
            disabled={detecting}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-primary/30 text-primary text-sm font-semibold bg-primary/5 hover:bg-primary/10 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {detecting
              ? <><CircleNotchIcon className="w-4 h-4 animate-spin" /> Detecting…</>
              : <><CrosshairIcon className="w-4 h-4" /> Use My Current Location</>
            }
          </button>

          <div className="relative" ref={dropdownRef}>
            <div className="relative flex items-center">
              <input
                className="w-full h-14 bg-primary/5 border border-slate-200 rounded-xl px-5 pr-12 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none"
                placeholder="Mumbai, India"
                type="text"
                value={form.city}
                onChange={(e) => onCityChange(e.target.value)}
                autoComplete="off"
                required
              />
              <div className="absolute right-4 text-slate-400">
                {searching
                  ? <CircleNotchIcon className="w-4 h-4 animate-spin" />
                  : <MapPinIcon className="w-5 h-5" />
                }
              </div>
            </div>

            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <MapPinIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-slate-700 leading-snug line-clamp-2">{s.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirmed coords badge */}
          {coords && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">✓ Location set</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          className="w-full h-14 mt-8 text-white font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)",
            boxShadow: "0 4px 20px rgba(214,136,10,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
          type="submit"
          disabled={saving}
        >
          {saving ? "Calculating your chart…" : "View My Kundli"}
          {!saving && <ArrowRightIcon className="w-5 h-5" />}
        </button>

        {/* ── or ── divider */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={() => { setGoogleSigningIn(true); signIn("google"); }}
          disabled={googleSigningIn}
          className="mt-6 w-full h-12 flex items-center justify-center gap-3 rounded-2xl bg-white font-semibold text-slate-700 text-sm active:scale-[0.98] transition-all disabled:opacity-60"
          style={{ border: "1.5px solid rgba(214,136,10,0.3)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {googleSigningIn ? (
            <CircleNotchIcon className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.9L6.1 33.3C9.4 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2C41.7 35.6 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          )}
          Continue with Google
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
          Returning user? Your saved chart will load automatically.
        </p>
      </form>

      {/* Footer */}
      <footer className="mt-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <LockIcon className="w-3 h-3" />
          <p className="text-[11px] leading-relaxed max-w-[280px]">
            Your birth details are only used to calculate your chart. We never share your personal information.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <a href="/privacy" className="text-[10px] text-slate-400 underline underline-offset-2">Privacy Policy</a>
          <span className="text-slate-300 text-[10px]">·</span>
          <a href="/terms" className="text-[10px] text-slate-400 underline underline-offset-2">Terms of Service</a>
        </div>
        <a
          href="https://www.instagram.com/kundliai/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-primary transition-colors"
        >
          <InstagramLogoIcon size={14} weight="thin" />
          @kundliai
        </a>
        <p className="text-[9px] text-slate-300 text-center">
          For entertainment purposes only. Not a substitute for professional advice.
        </p>
        <div className="pt-10 flex justify-center gap-6">
          {[
            { label: "AI Powered",      icon: SparkleIcon },
            { label: "Precise Charts",  icon: StarIcon    },
            { label: "Vedic Tradition", icon: ClockCounterClockwiseIcon },
          ].map((feat) => (
            <div key={feat.label} className="flex flex-col items-center">
              <div className="bg-primary/5 p-3 rounded-full mb-2">
                <feat.icon size={20} weight="thin" className="text-primary" />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{feat.label}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
