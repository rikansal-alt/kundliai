"use client";

import { useEffect, useRef } from "react";
import { XIcon, SparkleIcon } from "@phosphor-icons/react";

interface RemediesSheetProps {
  open: boolean;
  onClose: () => void;
  koots: Array<{
    name: string;
    score: number;
    maxPts: number;
    description?: string;
  }>;
}

const REMEDIES: Record<string, string> = {
  Varna:
    "Chant the Gayatri Mantra together at sunrise to harmonise spiritual wavelengths.",
  Vashya:
    "Offer white flowers to the Moon on Mondays to strengthen mutual attraction and respect.",
  Tara:
    "Wear a pearl or moonstone on the little finger to ease nakshatra friction.",
  Yoni:
    "Perform a joint Navagraha puja to balance primal energies between you.",
  "Graha Maitri":
    "Donate green moong dal on Wednesdays to strengthen planetary friendship.",
  Gana:
    "Light a ghee diya together every Thursday to soften temperamental differences.",
  Bhakut:
    "Recite Vishnu Sahasranama on Saturdays to mitigate rashi-based doshas.",
  Nadi:
    "Perform a Nadi Dosha Nivaran puja and donate gold on an auspicious Tithi.",
};

const BORDER_COLORS = ["#f43f5e", "#6366f1", "#0d9488", "#f59e0b", "#8b5cf6"];

export default function RemediesSheet({
  open,
  onClose,
  koots,
}: RemediesSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const weakKoots = koots.filter((k) => k.maxPts > 0 && k.score / k.maxPts < 0.5);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] rounded-t-3xl bg-white max-h-[75vh] overflow-y-auto transition-transform duration-300 ease-out"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center mt-3 mb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="fraunces-italic text-xl text-slate-900">
            Remedies &amp; Guidance
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <XIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Remedy cards for weak koots */}
        <div className="px-6">
          {weakKoots.map((koot, idx) => (
            <div
              key={koot.name}
              className="rounded-xl p-4 mb-3 bg-slate-50"
              style={{
                borderLeft: `3px solid ${BORDER_COLORS[idx % BORDER_COLORS.length]}`,
              }}
            >
              <p className="font-bold text-sm text-slate-800">
                {koot.name}
                <span className="font-normal text-xs text-slate-400 ml-2">
                  {koot.score}/{koot.maxPts}
                </span>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {REMEDIES[koot.name] ?? "Consult a Vedic astrologer for a personalised remedy."}
              </p>
            </div>
          ))}

          {/* General blessings */}
          <div
            className="rounded-xl p-4 mb-3 border border-primary/10"
            style={{
              background:
                "linear-gradient(135deg, rgba(214,136,10,0.05), rgba(245,194,0,0.08))",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <SparkleIcon
                className="w-4 h-4"
                style={{ color: "#D4880A" }}
                weight="fill"
              />
              <span className="font-bold text-sm text-slate-800">
                Vedic Blessings
              </span>
            </div>
            <p className="text-xs text-slate-600">
              May the divine light of the Navagrahas guide your union. Practice
              patience, compassion, and mutual respect — these are the greatest
              remedies of all.
            </p>
          </div>

          {/* Consult recommendation */}
          <div className="rounded-xl p-4 mb-3 bg-indigo-50 border border-indigo-100">
            <p className="font-bold text-sm text-indigo-900 mb-1">
              Consult a Jyotishi
            </p>
            <p className="text-xs text-indigo-600">
              For personalised remedies based on both birth charts, consider
              consulting a qualified Vedic astrologer.
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-slate-400 italic py-4">
            For spiritual guidance only — not professional advice.
          </p>
        </div>
      </div>
    </>
  );
}
