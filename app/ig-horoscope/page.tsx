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
  index: number;
}

interface ApiResponse {
  date: string;
  transits: string;
  horoscopes: Horoscope[];
}

// ─── Sign accent colors (on light/warm backgrounds) ─────────────────────────

const SIGN_THEMES: Record<string, { accent: string; soft: string }> = {
  Aries:       { accent: "#c0392b", soft: "rgba(192,57,43,0.08)" },
  Taurus:      { accent: "#27ae60", soft: "rgba(39,174,96,0.08)" },
  Gemini:      { accent: "#8e44ad", soft: "rgba(142,68,173,0.08)" },
  Cancer:      { accent: "#2980b9", soft: "rgba(41,128,185,0.08)" },
  Leo:         { accent: "#d6880a", soft: "rgba(214,136,10,0.08)" },
  Virgo:       { accent: "#6a994e", soft: "rgba(106,153,78,0.08)" },
  Libra:       { accent: "#c0392b", soft: "rgba(192,57,43,0.06)" },
  Scorpio:     { accent: "#922b21", soft: "rgba(146,43,33,0.08)" },
  Sagittarius: { accent: "#d35400", soft: "rgba(211,84,0,0.08)" },
  Capricorn:   { accent: "#5d6d7e", soft: "rgba(93,109,126,0.08)" },
  Aquarius:    { accent: "#2471a3", soft: "rgba(36,113,163,0.08)" },
  Pisces:      { accent: "#6c3483", soft: "rgba(108,52,131,0.08)" },
};

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

    // Remove scale transform for capture, then restore
    const prev = el.style.transform;
    el.style.transform = "none";

    // Force 1080x1080 regardless of device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const canvas = await html2canvas(el, {
      scale: 1 / dpr,
      backgroundColor: "#faf8f4",
      useCORS: true,
      width: 1080,
      height: 1080,
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

  // Format date parts for the card
  const dateParts = data
    ? (() => {
        const d = new Date();
        return {
          weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
          month: d.toLocaleDateString("en-US", { month: "long" }),
          day: d.getDate(),
          year: d.getFullYear(),
        };
      })()
    : null;

  return (
    <div style={{ background: "#f5f3ef", minHeight: "100vh", padding: "24px", maxWidth: "100vw", overflow: "auto" }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", marginBottom: 32 }}>
        <h1 style={{ color: "#1a1a1a", fontSize: 28, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>
          Instagram Horoscope Generator
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
          Generate daily horoscopes for all 12 signs and download as Instagram-ready images (1080x1080).
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "12px 28px",
              borderRadius: 12,
              border: "none",
              background: loading ? "#ccc" : "#d6880a",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate Today's Horoscopes"}
          </button>

          {data && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              style={{
                padding: "12px 28px",
                borderRadius: 12,
                border: "1px solid #d6880a",
                background: "transparent",
                color: "#d6880a",
                fontSize: 14,
                fontWeight: 600,
                cursor: downloading ? "not-allowed" : "pointer",
              }}
            >
              {downloading ? "Downloading..." : "Download All (12 images)"}
            </button>
          )}
        </div>

        {error && <p style={{ color: "#c0392b", marginTop: 12, fontSize: 14 }}>{error}</p>}

        {data && (
          <p style={{ color: "#999", fontSize: 12, marginTop: 12 }}>
            Generated for: {data.date}
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #e0ddd6", borderTopColor: "#d6880a",
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
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 32,
          maxWidth: 1200,
          margin: "0 auto",
        }}>
          {data.horoscopes.map((h, i) => {
            const theme = SIGN_THEMES[h.sign] || SIGN_THEMES.Leo;
            return (
              <div key={h.sign}>
                {/* Scaled preview wrapper */}
                <div style={{
                  width: 360,
                  height: 360,
                  overflow: "hidden",
                  borderRadius: 16,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                }}>
                  {/* The actual 1080x1080 card */}
                  <div
                    ref={(el) => { cardRefs.current[i] = el; }}
                    style={{
                      width: 1080,
                      height: 1080,
                      background: "#faf8f4",
                      overflow: "hidden",
                      position: "relative",
                      transform: "scale(0.3333)",
                      transformOrigin: "top left",
                    }}
                  >

                    {/* Accent glow top-right */}
                    <div style={{
                      position: "absolute",
                      top: -80,
                      right: -80,
                      width: 400,
                      height: 400,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${theme.soft} 0%, transparent 70%)`,
                      opacity: 0.8,
                    }} />

                    {/* Content */}
                    <div style={{
                      position: "relative",
                      zIndex: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      padding: "72px 80px",
                    }}>
                      {/* Top bar: Brand */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                      }}>
                        <div style={{
                          fontSize: 20,
                          fontWeight: 600,
                          color: "#d6880a",
                          letterSpacing: 3,
                          textTransform: "uppercase",
                          fontFamily: "'Lexend', sans-serif",
                        }}>
                          KundliAI
                        </div>
                        <div style={{
                          fontSize: 16,
                          color: "rgba(0,0,0,0.25)",
                          fontFamily: "'Lexend', sans-serif",
                        }}>
                          @kundliai
                        </div>
                      </div>

                      {/* Date — prominent */}
                      <div style={{
                        background: "rgba(214,136,10,0.06)",
                        border: "1px solid rgba(214,136,10,0.12)",
                        borderRadius: 20,
                        padding: "20px 28px",
                        marginBottom: 36,
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                      }}>
                        <div style={{
                          fontSize: 52,
                          fontWeight: 700,
                          color: theme.accent,
                          lineHeight: 1,
                          fontFamily: "'Fraunces', serif",
                        }}>
                          {dateParts.day}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 22,
                            fontWeight: 500,
                            color: "#1a1a1a",
                            fontFamily: "'Lexend', sans-serif",
                            lineHeight: 1.2,
                          }}>
                            {dateParts.month} {dateParts.year}
                          </div>
                          <div style={{
                            fontSize: 16,
                            color: "rgba(0,0,0,0.4)",
                            fontFamily: "'Lexend', sans-serif",
                          }}>
                            {dateParts.weekday}
                          </div>
                        </div>
                      </div>

                      {/* Sign row: symbol + name + hindi */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        marginBottom: 12,
                      }}>
                        <div style={{
                          fontSize: 72,
                          lineHeight: 1,
                          color: theme.accent,
                        }}>
                          {h.symbol}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 52,
                            fontWeight: 700,
                            color: "#1a1a1a",
                            fontFamily: "'Fraunces', serif",
                            lineHeight: 1.1,
                          }}>
                            {h.sign}
                          </div>
                          <div style={{
                            fontSize: 22,
                            color: "rgba(0,0,0,0.3)",
                            fontFamily: "'Lexend', sans-serif",
                            marginTop: 2,
                          }}>
                            {HINDI_NAMES[h.sign]}
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div style={{ marginBottom: 32, display: "flex", gap: 8 }}>
                        {Array.from({ length: 5 }).map((_, si) => (
                          <div
                            key={si}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: si < h.stars ? theme.accent : "rgba(0,0,0,0.06)",
                              border: `1.5px solid ${si < h.stars ? theme.accent : "rgba(0,0,0,0.08)"}`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Prediction */}
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-start" }}>
                        <p style={{
                          fontSize: 32,
                          lineHeight: 1.6,
                          color: "rgba(0,0,0,0.65)",
                          fontFamily: "'Lexend', sans-serif",
                          fontWeight: 300,
                          margin: 0,
                        }}>
                          {h.prediction}
                        </p>
                      </div>

                      {/* Bottom: Focus */}
                      <div style={{
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        paddingTop: 28,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div>
                          <div style={{
                            fontSize: 13,
                            color: "rgba(0,0,0,0.3)",
                            textTransform: "uppercase",
                            letterSpacing: 3,
                            marginBottom: 8,
                            fontFamily: "'Lexend', sans-serif",
                          }}>
                            Today&apos;s Focus
                          </div>
                          <div style={{
                            fontSize: 26,
                            fontWeight: 600,
                            color: theme.accent,
                            fontFamily: "'Lexend', sans-serif",
                          }}>
                            {h.focus}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: "rgba(0,0,0,0.2)",
                          fontFamily: "'Lexend', sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: 2,
                        }}>
                          Daily Horoscope
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download individual button */}
                <button
                  onClick={() => downloadCard(i, h.sign)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 10,
                    padding: "8px 0",
                    background: "transparent",
                    border: "none",
                    color: "#999",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'Lexend', sans-serif",
                  }}
                >
                  Download {h.sign}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
