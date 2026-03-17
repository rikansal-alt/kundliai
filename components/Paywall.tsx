"use client";

import { useState } from "react";
import { XIcon, SparkleIcon, StarIcon, CheckCircleIcon, ShieldCheckIcon } from "@phosphor-icons/react";

interface PaywallProps {
  onClose: () => void;
}

export default function Paywall({ onClose }: PaywallProps) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (plan: string) => {
    if (plan === "free") { onClose(); return; }
    setLoading(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.5)", maxWidth: "430px", left: "50%", transform: "translateX(-50%)" }}
    >
      <div
        className="relative flex flex-col bg-background-light overflow-y-auto no-scrollbar rounded-t-3xl w-full"
        style={{ maxHeight: "92dvh", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {/* Nav */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <button onClick={onClose} className="text-primary flex w-12 h-12 shrink-0 items-center justify-start">
            <XIcon className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight flex-1 text-center">Premium</h2>
          <div className="flex w-12 items-center justify-end">
            <SparkleIcon className="w-6 h-6 text-primary" style={{ fill: "#d6880a" }} />
          </div>
        </div>

        {/* Hero */}
        <div className="flex p-6">
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="flex gap-4 flex-col items-center">
              <div className="bg-primary/10 rounded-full p-8 flex items-center justify-center border-2 border-primary/20">
                <StarIcon className="w-16 h-16 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-slate-900 text-3xl font-bold text-center fraunces-italic">Unlock Jyotish Premium</h1>
                <p className="text-slate-600 text-base font-normal leading-normal text-center max-w-xs">
                  Full cosmic guidance for your spiritual journey
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 gap-4 px-4 py-2 w-full">
          {/* Free */}
          <div className="flex flex-col gap-6 rounded-xl border border-primary/10 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Free</h3>
              <p className="flex items-baseline gap-1 text-slate-900">
                <span className="text-4xl font-black tracking-tight">₹0</span>
                <span className="text-base font-bold">/mo</span>
              </p>
            </div>
            <button onClick={() => handleSelect("free")} className="flex w-full items-center justify-center rounded-xl h-11 px-4 bg-slate-100 text-slate-600 text-sm font-bold">
              Current Plan
            </button>
            <div className="flex flex-col gap-3">
              {["Daily Horoscope", "Basic Charts", "10 AI Consultations/mo"].map((f) => (
                <div key={f} className="text-sm font-medium flex gap-3 text-slate-700">
                  <CheckCircleIcon className="text-primary w-5 h-5 shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Silver */}
          <div className="flex flex-col gap-6 rounded-xl border border-primary/20 bg-white p-6 shadow-md ring-1 ring-primary/5">
            <div className="flex flex-col gap-1">
              <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">Silver</h3>
              <p className="flex items-baseline gap-1 text-slate-900">
                <span className="text-4xl font-black tracking-tight">₹299</span>
                <span className="text-base font-bold">/mo</span>
              </p>
            </div>
            <button onClick={() => handleSelect("silver")} className="flex w-full items-center justify-center rounded-xl h-11 px-4 bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors">
              Select Silver
            </button>
            <div className="flex flex-col gap-3">
              {["50 AI Consultations/mo", "Detailed Dashas", "Transit Alerts", "Personalized Remedies"].map((f) => (
                <div key={f} className="text-sm font-medium flex gap-3 text-slate-700">
                  <CheckCircleIcon className="text-primary w-5 h-5 shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Gold */}
          <div className="relative flex flex-col gap-6 rounded-xl border-2 border-primary bg-white p-6 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0">
              <div className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-8 py-1 rotate-45 translate-x-6 translate-y-2 shadow-sm">
                Popular
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-primary text-sm font-black uppercase tracking-wider">Gold</h3>
              <p className="flex items-baseline gap-1 text-slate-900">
                <span className="text-4xl font-black tracking-tight">₹799</span>
                <span className="text-base font-bold">/mo</span>
              </p>
            </div>
            <button
              onClick={() => handleSelect("gold")}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl h-11 px-4 bg-gradient-to-r from-primary to-amber-400 text-white text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? "Processing..." : "Select Gold"}
            </button>
            <div className="flex flex-col gap-3">
              <div className="text-sm font-bold flex gap-3 text-slate-900">
                <ShieldCheckIcon className="text-primary w-5 h-5 shrink-0" /> All Silver Features
              </div>
              {["Unlimited Consultations", "1-on-1 Consultation", "Gemstone Guidance"].map((f) => (
                <div key={f} className="text-sm font-medium flex gap-3 text-slate-700">
                  <CheckCircleIcon className="text-primary w-5 h-5 shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex flex-col gap-4 px-4 py-8 items-center w-full">
          <button
            onClick={() => handleSelect("gold")}
            className="flex w-full items-center justify-center rounded-xl h-14 px-8 bg-gradient-to-r from-primary via-amber-400 to-primary text-white text-lg font-bold tracking-tight shadow-xl hover:opacity-90 transition-opacity"
          >
            Start 7-Day Free Trial
          </button>
          <p className="text-slate-500 text-xs font-medium text-center uppercase tracking-widest">
            Recurring billing. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
