"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { XIcon, StarIcon, ChatCircleTextIcon, CloudArrowUpIcon, ShareNetworkIcon } from "@phosphor-icons/react";

export type SoftLoginTrigger =
  | "consult_limit"
  | "save_chart"
  | "premium_feature"
  | "returning_user"
  | "share";

interface Props {
  trigger: SoftLoginTrigger;
  onDismiss: () => void;
}

const CONTENT: Record<SoftLoginTrigger, { title: string; body: string; cta: string; icon: React.ElementType }> = {
  consult_limit: {
    title: "You've used your free consultations",
    body:  "Sign in free to get 10 AI consultations per month — your chart stays exactly as is.",
    cta:   "Continue with Google",
    icon:  ChatCircleTextIcon,
  },
  save_chart: {
    title: "Save your Kundli forever",
    body:  "Sign in to store your chart in the cloud. Access it from any device, anytime.",
    cta:   "Sign in to Save",
    icon:  CloudArrowUpIcon,
  },
  premium_feature: {
    title: "Unlock deeper insights",
    body:  "Sign in free to access Dasha timelines, transit alerts, and compatibility checks.",
    cta:   "Sign in free",
    icon:  StarIcon,
  },
  returning_user: {
    title: "Welcome back",
    body:  "Sign in to restore your saved chart and pick up where you left off.",
    cta:   "Restore my chart",
    icon:  StarIcon,
  },
  share: {
    title: "Share your Kundli",
    body:  "Sign in to generate a shareable link for your birth chart.",
    cta:   "Sign in to Share",
    icon:  ShareNetworkIcon,
  },
};

export default function SoftLoginPrompt({ trigger, onDismiss }: Props) {
  const { title, body, cta, icon: Icon } = CONTENT[trigger];
  const sheetRef = useRef<HTMLDivElement>(null);

  // Dismiss on backdrop tap
  function onBackdropClick(e: React.MouseEvent) {
    if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
      onDismiss();
    }
  }

  // Dismiss on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  function handleGoogleSignIn() {
    signIn("google", { callbackUrl: window.location.href });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onBackdropClick}
    >
      <div
        ref={sheetRef}
        className="w-full bg-white rounded-t-3xl px-6 py-6 shadow-2xl animate-slide-up"
        style={{ maxWidth: 430, paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-5" />

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Dismiss"
        >
          <XIcon className="w-5 h-5 text-slate-400" />
        </button>

        {/* Icon + text */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(214,136,10,0.12), rgba(245,194,0,0.18))" }}>
            <Icon className="w-7 h-7 text-primary" weight="thin" />
          </div>
          <h2 className="text-slate-900 text-lg font-bold leading-tight">{title}</h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[300px]">{body}</p>
        </div>

        {/* Google Sign-In button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-slate-800 font-semibold text-base shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          {/* Google logo SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.9L6.1 33.3C9.4 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2C41.7 35.6 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          {cta}
        </button>

        {/* Skip */}
        <button
          onClick={onDismiss}
          className="w-full mt-3 py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
