"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SunIcon, DotsThreeVerticalIcon, SparkleIcon, PaperPlaneTiltIcon, PlusCircleIcon, UserIcon, BriefcaseIcon, HeartIcon, HeartbeatIcon } from "@phosphor-icons/react";
import SoftLoginPrompt from "@/components/SoftLoginPrompt";
import { getGuestSession, incrementConsultCount, hasReachedConsultLimit, FREE_CONSULT_LIMIT } from "@/lib/guestSession";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  { label: "✨ Daily Horoscope", icon: SparkleIcon },
  { label: "💼 Career Advice", icon: BriefcaseIcon },
  { label: "❤️ Relationship Harmony", icon: HeartIcon },
  { label: "🧘 Health Tips", icon: HeartbeatIcon },
];

const CHART = {
  lagna: "Sagittarius", sun: "Aries", moon: "Cancer", mars: "Scorpio",
  mercury: "Aries", jupiter: "Pisces", venus: "Taurus", saturn: "Capricorn",
  rahu: "Virgo", ketu: "Scorpio", mahadasha: "Venus",
};

function ConsultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Friend";
  const userId = searchParams.get("userId") || "";
  const chartId = searchParams.get("chartId") || "";
  const consultationIdRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", text: "Namaste! I am your AI Jyotish consultant. How can I guide you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [consultLimitReached, setConsultLimitReached] = useState(false);
  const [consultsUsed, setConsultsUsed] = useState(0);
  const [consultLimit, setConsultLimit] = useState(10); // registered default
  const [showCounter, setShowCounter] = useState(false);
  const isGuestRef = useRef<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect guest mode on mount + load consult count
  useEffect(() => {
    const guest = getGuestSession();
    isGuestRef.current = !!guest;
    if (guest) {
      setConsultsUsed(guest.consultCount ?? 0);
      setConsultLimit(FREE_CONSULT_LIMIT);
      setShowCounter(true);
      if (hasReachedConsultLimit()) {
        setConsultLimitReached(true);
      }
    } else {
      // Registered user — show counter (10/mo limit for free tier)
      setConsultLimit(10);
      setShowCounter(true);
    }
  }, []);

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

    // Block guests who've hit the limit
    if (isGuestRef.current && hasReachedConsultLimit()) {
      setConsultLimitReached(true);
      setShowLoginPrompt(true);
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

      const res = await fetch("/api/consult", {
        method: "POST",
        headers: guestHeaders,
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.text })),
          chart: CHART,
          userName: name,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = "";

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", text: "" };
      setMessages((prev) => [...prev, aiMsg]);

      if (reader) {
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
      }

      // Auto-save the full conversation after streaming completes
      const finalMessages = [...messages, userMsg, { ...aiMsg, text: aiText }];
      await saveConsultation(finalMessages);

      // Track consult count and show prompt after limit
      setConsultsUsed((prev) => prev + 1);
      if (isGuestRef.current) {
        incrementConsultCount();
        if (hasReachedConsultLimit()) {
          setConsultLimitReached(true);
          setTimeout(() => setShowLoginPrompt(true), 1200);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: "err", role: "assistant", text: "Add your ANTHROPIC_API_KEY to .env.local to enable AI responses." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative flex flex-col bg-[#FFF8E8] overflow-hidden page-enter"
      style={{ height: "100dvh" }}
    >
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
          <button onClick={() => router.back()} className="flex size-12 shrink-0 items-center">
            <div className="bg-primary/10 flex items-center justify-center rounded-full size-10 border border-primary/20">
              <SunIcon className="text-primary w-6 h-6" />
            </div>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">AI Consultation</h2>
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-slate-500 text-xs font-medium">Online</p>
            </div>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-slate-100 transition-colors">
              <DotsThreeVerticalIcon className="text-slate-700 w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Consultation counter */}
      {showCounter && consultLimit < 999 && (
        <div className="text-center py-1.5 shrink-0" style={{ fontSize: 11, color: "#B07840" }}>
          {Math.max(0, consultLimit - consultsUsed)} of {consultLimit} consultations remaining
        </div>
      )}

      {/* Messages */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar" style={{ paddingBottom: "160px" }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="bg-white shadow-sm border border-slate-100 rounded-full w-10 h-10 shrink-0 flex items-center justify-center">
                <SunIcon className="text-primary w-5 h-5" />
              </div>
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
            <div className="bg-white shadow-sm border border-slate-100 rounded-full w-10 h-10 shrink-0 flex items-center justify-center">
              <SunIcon className="text-primary w-5 h-5 animate-spin" />
            </div>
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
        className="fixed left-1/2 -translate-x-1/2 bg-gradient-to-t from-[#FFF8E8] via-[#FFF8E8]/95 to-transparent pt-8 px-4 space-y-4"
        style={{
          bottom: 0,
          width: "min(430px, 100vw)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)",
          zIndex: 20,
        }}
      >
        {/* Consult limit banner */}
        {consultLimitReached && (
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #d6880a 0%, #f5c200 100%)" }}
          >
            You have used {FREE_CONSULT_LIMIT} free consultations · Sign in for more
          </button>
        )}
        {/* Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {SUGGESTIONS.map(({ label }) => (
            <button
              key={label}
              onClick={() => handleSend(label.split(" ").slice(1).join(" "))}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-white border border-primary/20 text-slate-700 text-sm font-medium hover:border-primary transition-colors shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border border-slate-100">
          <button className="p-2 text-slate-400 hover:text-primary transition-colors">
            <PlusCircleIcon className="w-6 h-6" />
          </button>
          <input
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-sm"
            placeholder="Ask Jyotish anything..."
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
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8E8]" />}>
      <ConsultContent />
    </Suspense>
  );
}
