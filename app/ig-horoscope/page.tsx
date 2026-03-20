"use client";

import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Horoscope {
  sign: string;
  symbol: string;
  prediction: string;
  focus: string;
  stars: number;
  caption: string;
  index: number;
}

interface ApiResponse {
  date: string;
  transits: string;
  horoscopes: Horoscope[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_SCALE = 0.3;

// ─── Daily rotating color themes ────────────────────────────────────────────

interface CardTheme {
  name: string;
  bg: string;
  text: string;
  accent: string;
  muted: string;
  border: string;
  divider: string;
  cardBg: string;       // prediction card background
  cardText: string;     // prediction card text
  brandColor: string;
  htmlBg: string;       // for html2canvas backgroundColor
}

const DAILY_THEMES: CardTheme[] = [
  { // Ivory & Gold (classic)
    name: "Ivory",
    bg: "#FAF9F6", text: "#1A1A1A", accent: "#B5A28E", muted: "rgba(0,0,0,0.3)",
    border: "#E5E4E2", divider: "#E5E4E2", cardBg: "#FAF9F6", cardText: "#1A1A1A",
    brandColor: "#B5A28E", htmlBg: "#FAF9F6",
  },
  { // Deep Navy & Gold
    name: "Navy",
    bg: "radial-gradient(ellipse at 50% 20%, #1a1540 0%, #0a0820 100%)", text: "#F0EBD8", accent: "#D4AF37", muted: "rgba(240,235,216,0.35)",
    border: "rgba(212,175,55,0.15)", divider: "rgba(212,175,55,0.15)", cardBg: "#fdf5e6", cardText: "#1a1a1a",
    brandColor: "#D4AF37", htmlBg: "#0a0820",
  },
  { // Sage Green
    name: "Sage",
    bg: "#F2F5F0", text: "#2D3A2E", accent: "#6B8F71", muted: "rgba(45,58,46,0.35)",
    border: "#D4DDD5", divider: "#D4DDD5", cardBg: "#F2F5F0", cardText: "#2D3A2E",
    brandColor: "#6B8F71", htmlBg: "#F2F5F0",
  },
  { // Warm Terracotta
    name: "Terracotta",
    bg: "#FBF5F0", text: "#3B2318", accent: "#C4785C", muted: "rgba(59,35,24,0.35)",
    border: "#E8D5C8", divider: "#E8D5C8", cardBg: "#FBF5F0", cardText: "#3B2318",
    brandColor: "#C4785C", htmlBg: "#FBF5F0",
  },
  { // Dusty Rose
    name: "Rose",
    bg: "#FDF5F5", text: "#3B1F2B", accent: "#B76E79", muted: "rgba(59,31,43,0.35)",
    border: "#E8CED3", divider: "#E8CED3", cardBg: "#FDF5F5", cardText: "#3B1F2B",
    brandColor: "#B76E79", htmlBg: "#FDF5F5",
  },
  { // Midnight Purple
    name: "Midnight",
    bg: "radial-gradient(ellipse at 50% 30%, #1E1533 0%, #0D0A18 100%)", text: "#E8DFF0", accent: "#9B7FBF", muted: "rgba(232,223,240,0.35)",
    border: "rgba(155,127,191,0.15)", divider: "rgba(155,127,191,0.15)", cardBg: "#F5F0FA", cardText: "#1E1533",
    brandColor: "#9B7FBF", htmlBg: "#0D0A18",
  },
  { // Ocean Blue
    name: "Ocean",
    bg: "#F0F5FA", text: "#1A2A3A", accent: "#4A7C9B", muted: "rgba(26,42,58,0.35)",
    border: "#C8D8E5", divider: "#C8D8E5", cardBg: "#F0F5FA", cardText: "#1A2A3A",
    brandColor: "#4A7C9B", htmlBg: "#F0F5FA",
  },
];

function getTodayTheme(): CardTheme {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_THEMES[dayOfYear % DAILY_THEMES.length];
}

const HINDI_NAMES: Record<string, string> = {
  Aries: "\u092E\u0947\u0937", Taurus: "\u0935\u0943\u0937\u092D", Gemini: "\u092E\u093F\u0925\u0941\u0928",
  Cancer: "\u0915\u0930\u094D\u0915", Leo: "\u0938\u093F\u0902\u0939", Virgo: "\u0915\u0928\u094D\u092F\u093E",
  Libra: "\u0924\u0941\u0932\u093E", Scorpio: "\u0935\u0943\u0936\u094D\u091A\u093F\u0915",
  Sagittarius: "\u0927\u0928\u0941", Capricorn: "\u092E\u0915\u0930", Aquarius: "\u0915\u0941\u0902\u092D",
  Pisces: "\u092E\u0940\u0928",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function IgHoroscopePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<CardTheme>(getTodayTheme);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ig-horoscope");
      if (!res.ok) throw new Error("Failed to generate");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to generate horoscopes. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = useCallback(async (index: number, sign: string) => {
    const el = cardRefs.current[index];
    if (!el) return;
    const prev = el.style.transform;
    el.style.transform = "none";
    const dpr = window.devicePixelRatio || 1;
    const canvas = await html2canvas(el, {
      scale: 1 / dpr,
      backgroundColor: theme.htmlBg,
      useCORS: true,
      width: CARD_W,
      height: CARD_H,
    });
    el.style.transform = prev;
    const link = document.createElement("a");
    link.download = `${sign.toLowerCase()}-horoscope.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const downloadAll = useCallback(async () => {
    if (!data) return;
    setDownloading(true);
    for (let i = 0; i < data.horoscopes.length; i++) {
      await downloadCard(i, data.horoscopes[i].sign);
      await new Promise((r) => setTimeout(r, 500));
    }
    setDownloading(false);
  }, [data, downloadCard]);

  const dateParts = data
    ? (() => {
        const d = new Date();
        return {
          weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
          month: d.toLocaleDateString("en-US", { month: "long" }),
          day: d.getDate(),
          year: d.getFullYear(),
          formatted: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        };
      })()
    : null;

  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", padding: "24px", maxWidth: "100vw", overflow: "auto" }}>
      {/* Page header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", marginBottom: 32 }}>
        <h1 style={{ color: "#1a1a1a", fontSize: 28, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>
          Instagram Horoscope Generator
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
          Generate daily horoscopes for all 12 signs — 1080x1350 (4:5 portrait).
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              background: loading ? "#ccc" : "#1a1a1a", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Today's Horoscopes"}
          </button>
          {data && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              style={{
                padding: "12px 28px", borderRadius: 12, border: "1px solid #1a1a1a",
                background: "transparent", color: "#1a1a1a", fontSize: 14, fontWeight: 600,
                cursor: downloading ? "not-allowed" : "pointer",
              }}
            >
              {downloading ? "Downloading..." : "Download All (12 images)"}
            </button>
          )}
        </div>
        {/* Theme selector */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {DAILY_THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => setTheme(t)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: theme.name === t.name ? "2px solid #1a1a1a" : "1px solid #ddd",
                background: t.htmlBg, color: t.text === "#1A1A1A" ? "#333" : t.text,
                cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "#c0392b", marginTop: 12, fontSize: 14 }}>{error}</p>}
        {data && <p style={{ color: "#999", fontSize: 12, marginTop: 12 }}>Generated for: {data.date} · Theme: {theme.name}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #ddd", borderTopColor: "#1a1a1a",
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "#888", fontSize: 14 }}>Consulting the stars...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Cards grid */}
      {data && dateParts && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 32, maxWidth: 1200, margin: "0 auto",
        }}>
          {data.horoscopes.map((h, i) => (
            <div key={h.sign}>
              {/* Scaled preview */}
              <div style={{
                width: CARD_W * PREVIEW_SCALE,
                height: CARD_H * PREVIEW_SCALE,
                overflow: "hidden", borderRadius: 8,
                boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
              }}>
                {/* ── Full-size 1080x1350 card ── */}
                <div
                  ref={(el) => { cardRefs.current[i] = el; }}
                  style={{
                    width: CARD_W, height: CARD_H,
                    overflow: "hidden", position: "relative",
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "top left",
                    background: theme.bg,
                    fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                    boxSizing: "border-box",
                    padding: "100px 80px",
                    display: "flex",
                    flexDirection: "column",
                    WebkitFontSmoothing: "antialiased",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {/* Elegant inner border */}
                  <div style={{
                    position: "absolute",
                    top: 40, left: 40, right: 40, bottom: 40,
                    border: `1px solid ${theme.border}`,
                    pointerEvents: "none",
                  }} />

                  {/* Header: Brand + Date */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: `0.5px solid ${theme.divider}`,
                    paddingBottom: 30, marginBottom: 50,
                    position: "relative", zIndex: 2,
                  }}>
                    <div style={{
                      fontFamily: "'Lexend', 'Montserrat', sans-serif",
                      letterSpacing: 15, fontSize: 20, fontWeight: 200,
                      color: theme.brandColor,
                    }}>
                      KUNDLIAI
                    </div>
                    <div style={{
                      fontStyle: "italic", fontSize: 28,
                      color: theme.text,
                      fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                    }}>
                      {dateParts.formatted}
                    </div>
                  </div>

                  {/* Large sign name — watermark style */}
                  <div style={{
                    position: "absolute",
                    top: "42%", left: 0, right: 0,
                    textAlign: "center",
                    fontSize: 220, fontWeight: 300,
                    color: theme.bg.includes("gradient") ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                    fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                    lineHeight: 1, pointerEvents: "none",
                    textTransform: "uppercase",
                    letterSpacing: 10,
                  }}>
                    {h.sign}
                  </div>

                  {/* Sign + Hindi */}
                  <div style={{
                    textAlign: "center", position: "relative", zIndex: 2,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      fontSize: 22, letterSpacing: 8,
                      textTransform: "uppercase",
                      color: theme.accent,
                      fontFamily: "'Lexend', 'Montserrat', sans-serif",
                      fontWeight: 200, marginBottom: 12,
                    }}>
                      Daily Horoscope
                    </div>
                    <div style={{
                      fontSize: 80, fontWeight: 600,
                      color: theme.text,
                      fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      lineHeight: 1, marginBottom: 8,
                    }}>
                      {h.sign}
                    </div>
                    <div style={{
                      fontSize: 26, color: theme.muted,
                      fontFamily: "'Lexend', sans-serif",
                      fontWeight: 200,
                    }}>
                      {HINDI_NAMES[h.sign]}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: 60, height: 1, background: theme.accent,
                    margin: "30px auto 40px",
                  }} />

                  {/* Prediction text */}
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center",
                    position: "relative", zIndex: 2,
                    padding: theme.bg.includes("gradient") ? "40px 30px" : "0 20px",
                    borderRadius: theme.bg.includes("gradient") ? 8 : 0,
                    background: theme.bg.includes("gradient") ? theme.cardBg : "transparent",
                    boxShadow: theme.bg.includes("gradient") ? "0 20px 50px rgba(0,0,0,0.3)" : "none",
                  }}>
                    <p style={{
                      fontSize: 38, lineHeight: 1.7,
                      color: theme.cardText,
                      fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      fontWeight: 300, fontStyle: "italic",
                      margin: 0, textAlign: "center",
                    }}>
                      {h.prediction}
                    </p>
                  </div>

                  {/* Footer */}
                  <div style={{
                    borderTop: `0.5px solid ${theme.divider}`,
                    paddingTop: 30,
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-end",
                    position: "relative", zIndex: 2,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 14, textTransform: "uppercase",
                        letterSpacing: 6, color: theme.muted,
                        fontFamily: "'Lexend', 'Montserrat', sans-serif",
                        fontWeight: 200, marginBottom: 10,
                      }}>
                        Today&apos;s Focus
                      </div>
                      <div style={{
                        fontSize: 48, fontWeight: 600,
                        color: theme.text,
                        fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      }}>
                        {h.focus}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 16, color: theme.accent,
                        fontFamily: "'Lexend', 'Montserrat', sans-serif",
                        fontWeight: 200, letterSpacing: 2,
                      }}>
                        @kundliai
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={() => downloadCard(i, h.sign)}
                style={{
                  display: "block", width: "100%", marginTop: 10,
                  padding: "8px 0", background: "transparent", border: "none",
                  color: "#999", fontSize: 13, cursor: "pointer",
                  fontFamily: "'Lexend', sans-serif",
                }}
              >
                Download {h.sign}
              </button>

              {/* Caption */}
              {h.caption && (
                <div style={{
                  marginTop: 12, padding: "14px 16px",
                  background: "#fff", borderRadius: 10,
                  border: "1px solid #e5e5e5",
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "#999",
                      textTransform: "uppercase", letterSpacing: 1,
                      fontFamily: "'Lexend', sans-serif",
                    }}>
                      Caption
                    </span>
                    <button
                      onClick={() => {
                        const hashtags = `\n\n#${h.sign.toLowerCase()} #${h.sign.toLowerCase()}horoscope #vedic #jyotish #dailyhoroscope #zodiac #kundliai #astrology`;
                        navigator.clipboard.writeText(h.caption + hashtags);
                      }}
                      style={{
                        fontSize: 11, color: "#B5A28E", background: "none",
                        border: "1px solid #e5e5e5", borderRadius: 6,
                        padding: "4px 10px", cursor: "pointer",
                        fontFamily: "'Lexend', sans-serif",
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{
                    fontSize: 13, lineHeight: 1.6, color: "#333",
                    margin: 0, fontFamily: "'Lexend', sans-serif",
                    whiteSpace: "pre-wrap",
                  }}>
                    {h.caption}
                  </p>
                  <p style={{
                    fontSize: 11, color: "#aaa", margin: "8px 0 0",
                    fontFamily: "'Lexend', sans-serif",
                  }}>
                    #{h.sign.toLowerCase()} #vedic #dailyhoroscope #kundliai
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
