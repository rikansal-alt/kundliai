"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SparkleIcon, PaperPlaneTiltIcon, PlusCircleIcon, UserIcon } from "@phosphor-icons/react";
import SoftLoginPrompt from "@/components/SoftLoginPrompt";
import { getGuestSession } from "@/lib/guestSession";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  { label: "✨ Daily Horoscope", query: "What does my chart say for today?" },
  { label: "💼 Career Advice", query: "What does my chart say about my career path?" },
  { label: "❤️ Relationships", query: "What do my planetary positions say about love and relationships?" },
  { label: "🧘 Health & Wellness", query: "What does my chart reveal about my health and wellbeing?" },
];

function ConsultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const name = searchParams.get("name") || "Friend";
  const userId = searchParams.get("userId") || "";
  const chartId = searchParams.get("chartId") || "";
  const consultationIdRef = useRef<string | null>(null);
  const chartDataRef = useRef<Record<string, unknown> | null>(null);

  // Load chart data from all available sources
  useEffect(() => {
    try {
      // 1. Try guest session (has full chart object)
      const guestSession = getGuestSession();
      if (guestSession?.chartData) {
        chartDataRef.current = guestSession.chartData as Record<string, unknown>;
        return;
      }

      // 2. Try localStorage snapshot (works for both guest and registered)
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap?.moonSign) {
          chartDataRef.current = snap as Record<string, unknown>;
          return;
        }
      }
    } catch { /* ignore */ }

    // 3. Fetch from DB for registered users
    if (userId) {
      fetch(`/api/chart/${userId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.chart?.chartData) {
            chartDataRef.current = d.chart.chartData as Record<string, unknown>;
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", text: "Namaste! I am your AI Jyotish consultant. How can I guide you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [consultLimitReached, setConsultLimitReached] = useState(false);
  const [consultsUsed, setConsultsUsed] = useState(0);
  const [consultLimit, setConsultLimit] = useState(15); // registered default
  const [showCounter, setShowCounter] = useState(false);
  const isGuestRef = useRef<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect guest mode on mount + fetch current count from server
  useEffect(() => {
    if (status === "loading") return;
    const guest = getGuestSession();
    isGuestRef.current = !!guest || status !== "authenticated";
    const limit = status === "authenticated" ? 15 : 5;
    setConsultLimit(limit);
    setShowCounter(true);

    // Fetch current usage from server to show accurate counter
    fetch("/api/consult/remaining")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.used === "number") {
          setConsultsUsed(data.used);
          if (data.used >= limit) setConsultLimitReached(true);
        }
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveConsultation = async (allMessages: Message[]) => {
    if (!chartId && !userId) return;
    try {
      const res = await fetch("/api/consultation/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId,
          userId,
          consultationId: consultationIdRef.current,
          messages: allMessages
            .filter((m) => m.id !== "1") // skip the greeting
            .map((m) => ({ role: m.role, content: m.text, timestamp: new Date().toISOString() })),
        }),
      });
      const data = await res.json();
      if (data.consultationId) consultationIdRef.current = data.consultationId;
    } catch {
      // Non-blocking
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    // Block if limit already reached (from server response)
    if (consultLimitReached) {
      if (isGuestRef.current) setShowLoginPrompt(true);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const guestSession = getGuestSession();
      const guestHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (guestSession) {
        guestHeaders["x-guest-id"] = guestSession.guestId;
        guestHeaders["x-guest-consult-count"] = String(guestSession.consultCount);
      }

      // Safely build chart data — strip any non-serializable values
      let safeChart = {};
      try {
        safeChart = JSON.parse(JSON.stringify(chartDataRef.current ?? {}));
      } catch {
        safeChart = {};
      }

      const res = await fetch("/api/consult", {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify({
          messages: [...messages, userMsg]
            .filter((m) => m.id !== "1" && m.id !== "err" && m.text.trim()) // skip greeting, errors, empty
            .slice(-10) // keep last 10 messages to avoid oversized requests
            .map((m) => ({ role: m.role, content: m.text })),
          chart: safeChart,
          userName: name || "Friend",
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          setConsultsUsed(errData.limit ?? consultLimit);
          setConsultLimitReached(true);
          if (isGuestRef.current) {
            setTimeout(() => setShowLoginPrompt(true), 500);
          }
          throw new Error("limit_reached");
        }
        throw new Error("API error");
      }

      // Read server-authoritative consult count from headers
      const remaining = parseInt(res.headers.get("X-Consult-Remaining") ?? "", 10);
      const serverLimit = parseInt(res.headers.get("X-Consult-Limit") ?? "", 10);
      if (!isNaN(remaining) && !isNaN(serverLimit)) {
        setConsultsUsed(serverLimit - remaining);
        setConsultLimit(serverLimit);
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", text: "" };
      setMessages((prev) => [...prev, aiMsg]);

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiText += decoder.decode(value, { stream: true });
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...aiMsg, text: aiText };
              return updated;
            });
          }
        } catch {
          // Stream interrupted — keep whatever text arrived
          if (!aiText) throw new Error("stream_failed");
        }
      }

      // Auto-save the full conversation after streaming completes
      const finalMessages = [...messages, userMsg, { ...aiMsg, text: aiText }];
      await saveConsultation(finalMessages);

      // Check if limit reached based on server response
      if (!isNaN(remaining) && remaining <= 0) {
        setConsultLimitReached(true);
        if (isGuestRef.current) {
          setTimeout(() => setShowLoginPrompt(true), 1200);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "limit_reached") {
        // Don't add an error message — the banner handles it
      } else if (msg === "stream_failed") {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", text: "Connection interrupted. Please try again." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", text: "Something went wrong. Please try again." },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex flex-col bg-white overflow-hidden page-enter"
      style={{ height: "100dvh" }}
    >
      {/* Subtle mandala watermark */}
      <svg
        className="absolute pointer-events-none"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.03, width: 300, height: 300 }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="48" stroke="#d6880a" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="38" stroke="#d6880a" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="28" stroke="#d6880a" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="18" stroke="#d6880a" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="8" stroke="#d6880a" strokeWidth="0.5" />
        {/* Petals */}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="50" y1="2" x2="50" y2="98" stroke="#d6880a" strokeWidth="0.3" transform={`rotate(${i * 30} 50 50)`} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse key={`p${i}`} cx="50" cy="15" rx="8" ry="15" stroke="#d6880a" strokeWidth="0.3" fill="none" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </svg>
      {showLoginPrompt && (
        <SoftLoginPrompt
          trigger="consult_limit"
          onDismiss={() => setShowLoginPrompt(false)}
        />
      )}
      {/* Header */}
      <header
        className="flex flex-col bg-white shadow-sm z-10 shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={() => router.push("/home")} className="flex size-12 shrink-0 items-center justify-center" style={{ minHeight: 44, minWidth: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="KundliAI" className="w-10 h-10 rounded-full object-cover border border-primary/20" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">AI Consultation</h2>
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-slate-500 text-xs font-medium">Online</p>
            </div>
          </div>
          <div className="w-12" />
        </div>
      </header>

      {/* Consultation counter */}
      {showCounter && consultLimit < 999 && (
        <div className="text-center py-1.5 shrink-0" style={{ fontSize: 11, color: "#B07840" }}>
          {Math.max(0, consultLimit - consultsUsed)} of {consultLimit} consultations remaining
          {consultLimit - consultsUsed <= 3 && consultLimit - consultsUsed > 0 && (
            <span className="ml-1 text-primary font-semibold"> · Unlimited plan coming soon</span>
          )}
        </div>
      )}

      {/* Messages */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" style={{ paddingBottom: "160px" }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="Jyotish" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-slate-100" />
            )}
            <div className={`flex flex-1 flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <p className={`${msg.role === "user" ? "text-slate-500" : "text-primary"} text-[13px] font-semibold flex items-center gap-1`}>
                {msg.role === "assistant" && <SparkleIcon className="w-3 h-3" />}
                {msg.role === "user" ? "You" : "Jyotish"}
              </p>
              <div
                className={`text-sm leading-relaxed max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                  msg.role === "user"
                    ? "text-white rounded-tr-none border-transparent"
                    : "bg-white text-slate-800 rounded-tl-none border-slate-100"
                }`}
                style={msg.role === "user" ? { background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)" } : undefined}
              >
                {msg.text || (
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
              {msg.role === "assistant" && msg.id !== "1" && msg.text && (
                <p className="text-[9px] text-slate-400 max-w-[85%] leading-relaxed px-1">
                  For entertainment purposes only. Not a substitute for professional, medical, or financial advice.
                </p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="bg-primary/20 rounded-full w-10 h-10 shrink-0 flex items-center justify-center">
                <UserIcon className="text-primary w-5 h-5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Jyotish" className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-slate-100 animate-pulse" />
            <div className="flex flex-1 flex-col gap-1.5 items-start">
              <p className="text-primary text-[13px] font-semibold flex items-center gap-1">
                <SparkleIcon className="w-3 h-3" /> Jyotish
              </p>
              <div className="bg-white text-slate-800 text-sm rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Controls */}
      <div
        className="fixed left-1/2 -translate-x-1/2 bg-gradient-to-t from-white via-white/95 to-transparent pt-8 px-4 space-y-4"
        style={{
          bottom: 0,
          width: "min(430px, 100vw)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
          zIndex: 20,
        }}
      >
        {/* Consult limit banner */}
        {consultLimitReached && isGuestRef.current && (
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)" }}
          >
            You have used {consultLimit} free consultations · Sign in for more
          </button>
        )}
        {consultsUsed >= consultLimit && !isGuestRef.current && (
          <div className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200">
            Monthly limit reached · Unlimited Gold plan coming soon
          </div>
        )}
        {/* Chips */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pr-8">
            {SUGGESTIONS.map(({ label, query }) => (
              <button
                key={label}
                onClick={() => handleSend(query)}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-white border border-primary/20 text-slate-700 text-sm font-medium hover:border-primary transition-colors shadow-sm"
              >
                {label}
              </button>
            ))}
          </div>
          {/* Fade gradient to signal scrollability */}
          <div className="absolute right-0 top-0 bottom-2 w-12 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, white)" }} />
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border border-slate-100">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <PlusCircleIcon className="w-6 h-6" />
          </button>
          <input
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm"
            placeholder="Ask about your chart, planets, dashas..."
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <PaperPlaneTiltIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ConsultContent />
    </Suspense>
  );
}
