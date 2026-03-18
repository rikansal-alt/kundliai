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
      backgroundColor: "#FAF9F6",
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
        {error && <p style={{ color: "#c0392b", marginTop: 12, fontSize: 14 }}>{error}</p>}
        {data && <p style={{ color: "#999", fontSize: 12, marginTop: 12 }}>Generated for: {data.date}</p>}
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
                    backgroundColor: "#FAF9F6",
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
                    border: "1px solid #E5E4E2",
                    pointerEvents: "none",
                  }} />

                  {/* Header: Brand + Date */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "0.5px solid #E5E4E2",
                    paddingBottom: 30, marginBottom: 50,
                    position: "relative", zIndex: 2,
                  }}>
                    <div style={{
                      fontFamily: "'Lexend', 'Montserrat', sans-serif",
                      letterSpacing: 15, fontSize: 20, fontWeight: 200,
                      color: "#B5A28E",
                    }}>
                      KUNDLIAI
                    </div>
                    <div style={{
                      fontStyle: "italic", fontSize: 28,
                      color: "#1A1A1A",
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
                    color: "rgba(0,0,0,0.04)",
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
                      color: "#B5A28E",
                      fontFamily: "'Lexend', 'Montserrat', sans-serif",
                      fontWeight: 200, marginBottom: 12,
                    }}>
                      Daily Horoscope
                    </div>
                    <div style={{
                      fontSize: 80, fontWeight: 600,
                      color: "#1A1A1A",
                      fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      lineHeight: 1, marginBottom: 8,
                    }}>
                      {h.sign}
                    </div>
                    <div style={{
                      fontSize: 26, color: "#B5A28E",
                      fontFamily: "'Lexend', sans-serif",
                      fontWeight: 200,
                    }}>
                      {HINDI_NAMES[h.sign]}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: 60, height: 1, background: "#B5A28E",
                    margin: "30px auto 40px",
                  }} />

                  {/* Prediction text */}
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center",
                    position: "relative", zIndex: 2,
                    padding: "0 20px",
                  }}>
                    <p style={{
                      fontSize: 38, lineHeight: 1.7,
                      color: "#1A1A1A",
                      fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      fontWeight: 300, fontStyle: "italic",
                      margin: 0, textAlign: "center",
                    }}>
                      {h.prediction}
                    </p>
                  </div>

                  {/* Footer */}
                  <div style={{
                    borderTop: "0.5px solid #E5E4E2",
                    paddingTop: 30,
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-end",
                    position: "relative", zIndex: 2,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 14, textTransform: "uppercase",
                        letterSpacing: 6, color: "#B5A28E",
                        fontFamily: "'Lexend', 'Montserrat', sans-serif",
                        fontWeight: 200, marginBottom: 10,
                      }}>
                        Today&apos;s Focus
                      </div>
                      <div style={{
                        fontSize: 48, fontWeight: 600,
                        color: "#1A1A1A",
                        fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                      }}>
                        {h.focus}
                      </div>
                    </div>
                    <div style={{
                      textAlign: "right",
                    }}>
                      <div style={{
                        fontSize: 16, color: "#B5A28E",
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
