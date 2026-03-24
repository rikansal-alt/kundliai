"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ShareNetworkIcon,
  SunIcon,
  MoonIcon,
  ClockIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { trackEvent } from "@/lib/trackEvent";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartSnap {
  name: string;
  ascendant: string;
  moonSign: string;
  sunSign: string;
}

interface DailyGuidance {
  date: string;
  prediction: string;
  morning: string;
  afternoon: string;
  evening: string;
  luckyColor: string;
  luckyColorHex: string;
  luckyNumber: number;
  luckyNumberWord: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const PREDICTIONS: Record<string, string[]> = {
  Aries: [
    "Bold energy surges through your chart today, making it ideal for taking initiative on projects you have been delaying. Trust your instincts and lead with confidence — the stars favour decisive action.",
    "A wave of pioneering spirit ignites your day. Channel this fire into launching something new; hesitation will only dampen the cosmic momentum working in your favour.",
    "Your natural leadership qualities shine brightly today. Others will look to you for direction, and your courage to act will open doors that seemed firmly closed.",
  ],
  Taurus: [
    "The cosmos favours steady progress and material comfort today. Focus on building lasting foundations — financial decisions made now carry long-term stability and growth.",
    "Grounding energy surrounds you, making this an excellent day for nurturing what you already have. A small indulgence will restore your spirit without derailing your plans.",
    "Patience is your greatest asset today. The universe rewards your persistence with tangible results — trust the slow and steady path you have chosen.",
  ],
  Gemini: [
    "Communication channels open wide today, bringing meaningful conversations and unexpected connections. Your words carry extra weight, so choose them wisely and speak from the heart.",
    "Curiosity leads you to valuable insights today. A chance encounter or piece of information could shift your perspective in a powerful way — stay alert and engaged.",
    "Your quick mind is your superpower today. Multiple ideas compete for your attention; focus on the one that sparks the most joy and let the rest wait.",
  ],
  Cancer: [
    "Emotional intelligence is your guiding star today. Trust the feelings that arise — they carry wisdom about your home life and closest relationships that logic alone cannot provide.",
    "Nurturing energy flows through everything you touch today. A gesture of care towards a loved one will ripple outward, creating harmony in unexpected corners of your life.",
    "Your intuition about family matters is especially sharp today. Listen to what your heart whispers about home and belonging — it knows the path forward.",
  ],
  Leo: [
    "Creative fire blazes through your chart, demanding expression. Whether through art, performance, or bold self-expression, today is your stage — step into the spotlight with confidence.",
    "Recognition for your efforts arrives in subtle but meaningful ways today. Your natural warmth draws others to you, and your generosity will be remembered and reciprocated.",
    "Your inner radiance is magnetic today. Confidence is not arrogance when it comes from genuine self-knowledge — let your authentic brilliance illuminate every room you enter.",
  ],
  Virgo: [
    "Your eye for detail catches what others miss today. A small adjustment to your routine or health practice could yield disproportionately large benefits in the weeks ahead.",
    "Service to others brings unexpected fulfillment today. Your practical wisdom is needed — offer it freely, but remember to reserve some of that healing energy for yourself.",
    "Precision and care define your day. The meticulous attention you give to your work will produce results that speak for themselves — quality over quantity is your mantra.",
  ],
  Libra: [
    "Harmony flows naturally through your interactions today. Relationships that felt strained may find a new equilibrium, and a diplomatic approach to any conflict will yield beautiful results.",
    "Balance is not just a concept but a lived experience today. Beauty, art, and meaningful partnerships all receive a cosmic boost — seek them out and savour them fully.",
    "Your sense of fairness guides you true today. A decision involving others benefits from your balanced perspective — trust your ability to see all sides clearly.",
  ],
  Scorpio: [
    "Transformative energy pulses beneath the surface today. Something you have been holding onto is ready to be released — let go, and watch as new power fills the space it leaves behind.",
    "Depth and intensity colour every experience today. Your ability to see beneath appearances reveals a truth that changes your understanding — embrace the revelation without fear.",
    "Your penetrating insight cuts through illusion today. Trust the deep knowing that arises from your core — it sees what surface-level thinking cannot reach.",
  ],
  Sagittarius: [
    "The horizon calls with promises of expansion and wisdom today. Whether through travel, study, or a conversation with someone from a different background, growth awaits beyond your comfort zone.",
    "Adventurous energy fills your spirit, urging you to explore beyond familiar territory. A philosophical insight or cultural experience will broaden your worldview in a meaningful way.",
    "Your natural optimism is well-founded today. The universe supports your quest for meaning and truth — follow the thread of curiosity wherever it leads.",
  ],
  Capricorn: [
    "Disciplined effort meets cosmic reward today. The structures you have been building are stronger than they appear, and a breakthrough in your ambitions is closer than you think.",
    "Your patience and persistence are about to pay dividends. Today favours long-term planning and strategic moves — the mountain you are climbing has a summit in sight.",
    "Authority and competence radiate from you today. Others recognise your dedication, and the foundations you lay now will support achievements far into the future.",
  ],
  Aquarius: [
    "Innovation sparks fly in unexpected directions today. A community connection or group project could lead to a breakthrough idea that benefits more people than you imagined possible.",
    "Your unique perspective is exactly what the world needs today. Do not dim your originality to fit in — the future belongs to those brave enough to think differently.",
    "Humanitarian impulses and brilliant ideas merge today. A vision for how things could be better crystallises in your mind — trust it and begin taking the first small steps.",
  ],
  Pisces: [
    "Intuitive currents run deep today, connecting you to wisdom beyond the rational mind. Dreams, meditation, or quiet contemplation will reveal guidance that your busy days normally obscure.",
    "Compassion and creativity flow together like a gentle river today. Your sensitivity is a gift — channel it into artistic expression or acts of kindness that heal both giver and receiver.",
    "The veil between the seen and unseen is thin today. Trust the subtle impressions, the synchronicities, and the quiet voice within — they are all pointing you toward your highest good.",
  ],
};

const MORNING_INSIGHTS: Record<string, string[]> = {
  Aries: [
    "Start your morning with vigorous activity — a brisk walk or workout aligns your fiery energy. Set one bold intention before 9 AM.",
    "Early hours favour courageous decisions. Write down three goals and take immediate action on the most exciting one.",
  ],
  Taurus: [
    "A slow, intentional morning routine grounds your energy for the day ahead. Savour your breakfast mindfully and notice what brings comfort.",
    "Connect with nature in the early hours — even a few minutes with plants or fresh air recharges your earthy spirit deeply.",
  ],
  Gemini: [
    "Morning is prime time for important messages and calls. Check in with someone you have been meaning to reach out to.",
    "Read or listen to something stimulating before noon — your mind is most receptive to new ideas in the early hours.",
  ],
  Cancer: [
    "Begin your day with a nurturing ritual at home — a warm drink, gentle music, or a moment of gratitude for your sanctuary.",
    "Morning emotions carry messages. Journal briefly upon waking to capture insights your subconscious delivers during the night.",
  ],
  Leo: [
    "Dress with intention this morning — your outer expression of confidence sets the tone for every interaction that follows.",
    "Creative energy peaks in the morning hours. Dedicate the first hour to your most imaginative project or self-expression.",
  ],
  Virgo: [
    "Organise your morning with precision — a tidy space and clear to-do list amplify your natural efficiency throughout the day.",
    "A health-focused morning practice, whether stretching, supplements, or a green smoothie, sets a powerful tone for wellness.",
  ],
  Libra: [
    "Begin your day with beauty — arrange flowers, play harmonious music, or simply appreciate the morning light and its soft colours.",
    "A morning conversation with a partner or close friend brings clarity and sets a cooperative tone for the hours ahead.",
  ],
  Scorpio: [
    "Morning meditation or breathwork helps you channel the intense energy stirring within. Go deep before the world demands your attention.",
    "Review your hidden motivations honestly this morning. Self-awareness is your greatest power, and the quiet hours support deep reflection.",
  ],
  Sagittarius: [
    "Start your day with something that expands your mind — a podcast, a page of philosophy, or planning your next adventure.",
    "Morning optimism is your fuel. Set an ambitious intention and take the first step before doubt has time to settle in.",
  ],
  Capricorn: [
    "An early start gives you the edge. Use the quiet morning hours for strategic planning and tackling your most important task.",
    "Review your long-term goals this morning. Small adjustments to your plan now can save significant effort later on.",
  ],
  Aquarius: [
    "Morning is ideal for brainstorming and unconventional thinking. Let your mind wander freely before the day imposes its structure.",
    "Connect with your community or social cause before noon — a morning message or gesture can ripple outward powerfully.",
  ],
  Pisces: [
    "Record your dreams immediately upon waking — they carry guidance tailored specifically to your current life questions.",
    "A quiet, contemplative morning with music or art nourishes your soul and provides creative fuel for the entire day.",
  ],
};

const AFTERNOON_INSIGHTS: Record<string, string[]> = {
  Aries: [
    "Midday energy supports competitive endeavours and negotiations. Press forward on challenges while your fire burns steadily and bright.",
    "Channel afternoon restlessness into productive action. A physical break re-energises you for the second half of the day.",
  ],
  Taurus: [
    "Afternoon is ideal for financial planning and practical matters. Your steady judgement reaches its peak during these grounded hours.",
    "A nourishing lunch and brief pause restores your energy. Afternoon meetings benefit from your calm, reliable presence.",
  ],
  Gemini: [
    "Afternoon conversations sparkle with wit and insight. Social gatherings and collaborative work produce your best results now.",
    "Multitasking comes naturally this afternoon, but focus on the two most impactful tasks for the greatest satisfaction.",
  ],
  Cancer: [
    "Afternoon is perfect for nurturing professional relationships. Your emotional intelligence helps navigate team dynamics smoothly.",
    "A brief check-in with family during the afternoon recharges your emotional batteries and brings unexpected warmth.",
  ],
  Leo: [
    "The afternoon spotlight favours presentations and public-facing work. Your natural charisma peaks during these vibrant hours.",
    "Generosity in the afternoon — mentoring, sharing credit, or treating a colleague — multiplies your influence and goodwill.",
  ],
  Virgo: [
    "Afternoon precision work yields excellent results. Detail-oriented tasks, editing, and quality checks benefit from your sharp focus now.",
    "A healthy afternoon break prevents burnout. Step away from the desk and your perspective will clarify remarkably.",
  ],
  Libra: [
    "Afternoon meetings and partnerships flourish under your diplomatic touch. Seek win-win solutions and beauty in collaboration.",
    "Aesthetic decisions made this afternoon carry extra grace. Trust your sense of balance in design, decor, or personal style.",
  ],
  Scorpio: [
    "Afternoon research and investigation yield breakthroughs. Your ability to dig beneath the surface is at its most powerful now.",
    "Strategic moves in the afternoon carry extra weight. Others sense your determination and respond with respect.",
  ],
  Sagittarius: [
    "Afternoon learning and teaching opportunities abound. Share your enthusiasm with others and watch as it multiplies and returns to you.",
    "An unexpected afternoon encounter broadens your perspective. Stay open to spontaneous invitations and unplanned conversations.",
  ],
  Capricorn: [
    "Afternoon is your power window for executive decisions. Your authority and competence are clearly visible to those who matter.",
    "Steady progress in the afternoon hours compounds your morning efforts. The summit is closer than it appears.",
  ],
  Aquarius: [
    "Afternoon collaboration with like-minded innovators produces exciting possibilities. Group brainstorming sessions are especially fruitful now.",
    "Technology and systems-level thinking peak this afternoon. Solutions to complex problems arrive through lateral thinking.",
  ],
  Pisces: [
    "Afternoon creativity flows effortlessly. Artistic projects, writing, or imaginative problem-solving benefit from your heightened intuition.",
    "Compassionate action in the afternoon creates ripples of healing. A kind word or gesture carries more weight than you realise.",
  ],
};

const EVENING_INSIGHTS: Record<string, string[]> = {
  Aries: [
    "Evening calls for unwinding the warrior spirit. A calming activity balances your fiery day and prepares you for restorative sleep.",
    "Reflect on your victories today, however small. Evening gratitude for your courage sustains the fire without burning you out.",
  ],
  Taurus: [
    "Evening is your sanctuary time. Indulge your senses with good food, soft textures, or soothing music to honour your earthy nature.",
    "A peaceful evening at home restores everything the world demands during the day. Prioritise comfort without guilt tonight.",
  ],
  Gemini: [
    "Evening reading or a stimulating conversation with a close friend satisfies your mental hunger. Let curiosity guide your wind-down.",
    "Put the phone down for the last hour before sleep. Your active mind needs a gentle transition to rest and renewal.",
  ],
  Cancer: [
    "Evening with family or in your cosy space is deeply restorative. Cook something nourishing and share it with those you love.",
    "Moonlit hours amplify your intuition. Pay attention to feelings that surface as the day settles — they carry tomorrow's wisdom.",
  ],
  Leo: [
    "Evening entertainment and socialising feed your spirit. Whether hosting or going out, your warmth lights up the night for everyone.",
    "Take time this evening to celebrate yourself privately. Acknowledge your gifts and the joy you bring to others' lives.",
  ],
  Virgo: [
    "Evening is for releasing the day's perfectionism. A calming tea, light stretching, and letting go of unfinished lists restores your peace.",
    "Prepare for tomorrow tonight — a brief planning session eases your mind and lets you sleep without worry or rumination.",
  ],
  Libra: [
    "Evening romance and partnership activities are especially blessed. Quality time with a loved one brings deep satisfaction tonight.",
    "Create beauty in your evening space — candles, music, or a beautifully set table elevates the ordinary into something special.",
  ],
  Scorpio: [
    "Evening solitude or intimate conversation suits your deep nature. Surface-level socialising drains you; choose depth over breadth tonight.",
    "The night is your element. Use the evening hours for transformative practices — journaling, meditation, or releasing what no longer serves.",
  ],
  Sagittarius: [
    "Evening is for storytelling and sharing adventures. Recount the day's experiences with humour and wisdom to those gathered around you.",
    "Plan your next journey or learning goal this evening. The anticipation itself generates the optimistic energy you thrive on.",
  ],
  Capricorn: [
    "Allow yourself to fully disconnect from work this evening. Even mountain goats must rest at base camp to continue climbing tomorrow.",
    "Evening reflection on your progress brings quiet satisfaction. You have come further than you give yourself credit for.",
  ],
  Aquarius: [
    "Evening is ideal for visionary thinking and dreaming about the future. Let your idealism run free without practical constraints tonight.",
    "Connect with friends or community online or in person this evening. Shared ideas and laughter recharge your inventive spirit.",
  ],
  Pisces: [
    "Evening meditation, music, or creative expression brings you home to yourself. The quiet hours are when your soul speaks most clearly.",
    "Water soothes your spirit tonight — a warm bath, the sound of rain, or simply drinking tea mindfully restores your equilibrium.",
  ],
};

const LUCKY_COLORS = [
  { name: "Marigold",   hex: "#D4880A" },
  { name: "Saffron",    hex: "#F4C430" },
  { name: "Ivory",      hex: "#FFFFF0" },
  { name: "Ruby",       hex: "#E0115F" },
  { name: "Emerald",    hex: "#50C878" },
  { name: "Sapphire",   hex: "#0F52BA" },
  { name: "Pearl",      hex: "#FDEEF4" },
  { name: "Coral",      hex: "#FF7F50" },
  { name: "Amber",      hex: "#FFBF00" },
  { name: "Turquoise",  hex: "#40E0D0" },
  { name: "Vermillion", hex: "#E34234" },
  { name: "Indigo",     hex: "#4B0082" },
];

const NUMBER_WORDS = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen", "Twenty", "Twenty-One", "Twenty-Two",
  "Twenty-Three", "Twenty-Four", "Twenty-Five", "Twenty-Six", "Twenty-Seven",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signIndex(sign: string): number {
  const idx = SIGNS.indexOf(sign);
  return idx >= 0 ? idx : 0;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function pickFromArray<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

function generateGuidance(chart: ChartSnap): DailyGuidance {
  const today = new Date();
  const doy = dayOfYear(today);
  const moon = chart.moonSign || "Aries";
  const asc = chart.ascendant || "Aries";
  const si = signIndex(moon);
  const ai = signIndex(asc);
  const seed = doy + si;
  const seed2 = doy + ai;

  const moonPreds = PREDICTIONS[moon] || PREDICTIONS.Aries;
  const moonMorning = MORNING_INSIGHTS[moon] || MORNING_INSIGHTS.Aries;
  const moonAfternoon = AFTERNOON_INSIGHTS[moon] || AFTERNOON_INSIGHTS.Aries;
  const moonEvening = EVENING_INSIGHTS[moon] || EVENING_INSIGHTS.Aries;

  const colorIdx = (si + doy) % LUCKY_COLORS.length;
  const luckyColor = LUCKY_COLORS[colorIdx];

  const luckyNum = ((si + ai + doy) % 27) + 1;

  return {
    date: today.toISOString().split("T")[0],
    prediction: pickFromArray(moonPreds, seed),
    morning: pickFromArray(moonMorning, seed),
    afternoon: pickFromArray(moonAfternoon, seed2),
    evening: pickFromArray(moonEvening, seed + seed2),
    luckyColor: luckyColor.name,
    luckyColorHex: luckyColor.hex,
    luckyNumber: luckyNum,
    luckyNumberWord: NUMBER_WORDS[luckyNum] || String(luckyNum),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyGuidancePage() {
  const router = useRouter();
  const [chart, setChart] = useState<ChartSnap | null>(null);
  const [guidance, setGuidance] = useState<DailyGuidance | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [muhurats, setMuhurats] = useState<{ label: string; time: string }[]>([]);
  const [transitPrediction, setTransitPrediction] = useState<{
    prediction: string; morning: string; afternoon: string; evening: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const parsed = JSON.parse(raw) as ChartSnap;
        setChart(parsed);

        // Check cache
        const todayKey = `kundliai_daily_${new Date().toISOString().split("T")[0]}`;
        const cached = localStorage.getItem(todayKey);
        if (cached) {
          setGuidance(JSON.parse(cached) as DailyGuidance);
        } else {
          const g = generateGuidance(parsed);
          setGuidance(g);
          localStorage.setItem(todayKey, JSON.stringify(g));
        }
      }
    } catch { /* ignore */ }
    setIsLoaded(true);
    trackEvent("page_view", { page: "daily" });

    // Fetch transit-aware predictions
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        const ascSign = typeof snap.ascendant === "object" ? snap.ascendant.sign : snap.ascendant;
        const moonSign = snap.moonSign;
        if (ascSign && moonSign) {
          fetch(`/api/daily-prediction?asc=${encodeURIComponent(ascSign)}&moon=${encodeURIComponent(moonSign)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.prediction) setTransitPrediction(data.prediction);
            })
            .catch(() => {});
        }
      }
    } catch { /* ignore */ }

    // Fetch real muhurat times from panchang API
    let lat = 28.6139, lng = 77.209; // Delhi default
    try {
      const raw = localStorage.getItem("kundliai_chart");
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap.meta?.birthDetails?.lat) { lat = snap.meta.birthDetails.lat; lng = snap.meta.birthDetails.lng; }
      }
    } catch { /* ignore */ }

    fetch(`/api/panchang?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.muhurats) {
          const toTimeStr = (utcMin: number) => {
            const now = new Date();
            return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, utcMin))
              .toLocaleTimeString("en-US", {
                timeZone: data.locationTimezone || "Asia/Kolkata",
                hour: "numeric", minute: "2-digit", hour12: true,
              });
          };

          const muhList: { label: string; time: string }[] = data.muhurats.map((m: { name: string; startUtcMin: number; endUtcMin: number }) => ({
            label: m.name,
            time: `${toTimeStr(m.startUtcMin)} – ${toTimeStr(m.endUtcMin)}`,
          }));

          setMuhurats(muhList);
        }
      })
      .catch(() => {});
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const handleShare = async () => {
    if (!guidance) return;
    const text = `My Daily Vedic Guidance for ${todayFormatted}:\n\n${guidance.prediction}\n\nLucky Color: ${guidance.luckyColor}\nLucky Number: ${guidance.luckyNumber}\n\n— KundliAI`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Daily Guidance — KundliAI", text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col bg-white min-h-screen page-enter"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-700"
        >
          <ArrowLeftIcon size={22} weight="thin" />
        </button>
        <span className="text-sm font-semibold text-slate-700" suppressHydrationWarning>
          {todayFormatted}
        </span>
        <button
          onClick={handleShare}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-slate-700"
        >
          <ShareNetworkIcon size={20} weight="thin" />
        </button>
      </header>

      {/* ── Celestial Alignment pill ── */}
      <div className="flex justify-center px-6 pt-2 pb-1">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full"
          style={{ color: "#d6880a", background: "rgba(214,136,10,0.08)", border: "1px solid rgba(214,136,10,0.2)" }}
        >
          Celestial Alignment
        </span>
      </div>

      {/* ── Large heading ── */}
      <div className="px-6 pt-2 pb-1 text-center">
        <h1 className="fraunces-italic text-3xl font-normal text-slate-900">
          Your Daily Guidance
        </h1>
      </div>

      {/* ── Loading / no-chart state ── */}
      {!isLoaded && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isLoaded && !chart && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-slate-400 mb-4">Generate your Kundli first to receive personalised daily guidance.</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-xl border border-primary/30 text-primary text-sm font-semibold bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Generate My Kundli
          </button>
        </div>
      )}

      {guidance && (
        <>
          {/* ── Full paragraph prediction ── */}
          <div className="px-6 pt-3 pb-5">
            <p className="fraunces-italic text-base text-slate-600 text-center leading-relaxed">
              &ldquo;{guidance.prediction}&rdquo;
            </p>
          </div>

          {/* ── Time-of-day cards ── */}
          <section className="px-6 space-y-3">
            {/* Morning — warm gold */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "#FFF8E8", borderColor: "rgba(217,119,6,0.15)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(217,119,6,0.12)" }}
                >
                  <SunIcon size={22} weight="thin" style={{ color: "#d97706" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Morning Insight</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{transitPrediction?.morning || guidance.morning}</p>
                </div>
              </div>
            </div>

            {/* Afternoon — warm amber */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "#FFF3E0", borderColor: "rgba(245,158,11,0.15)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(245,158,11,0.12)" }}
                >
                  <SunIcon size={22} weight="fill" style={{ color: "#f59e0b" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 mb-1">Afternoon Insight</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{transitPrediction?.afternoon || guidance.afternoon}</p>
                </div>
              </div>
            </div>

            {/* Evening — cool lavender */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "#F0EEF8", borderColor: "rgba(99,102,241,0.12)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(99,102,241,0.12)" }}
                >
                  <MoonIcon size={22} weight="thin" style={{ color: "#6366f1" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm" style={{ color: "#3b3768" }}>Evening Insight</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#5b577a" }}>{transitPrediction?.evening || guidance.evening}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Lucky section ── */}
          <section className="px-6 pt-5 space-y-3">
            {/* Lucky Color */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "rgba(214,136,10,0.05)", borderColor: "rgba(214,136,10,0.12)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Lucky Color</p>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm"
                  style={{ background: guidance.luckyColorHex }}
                />
                <span className="font-bold text-sm text-slate-800">{guidance.luckyColor}</span>
              </div>
            </div>

            {/* Lucky Number */}
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "rgba(214,136,10,0.05)", borderColor: "rgba(214,136,10,0.12)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Lucky Number</p>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-2xl text-slate-800">{guidance.luckyNumber}</span>
                <span className="text-xs text-slate-400">{guidance.luckyNumberWord}</span>
              </div>
            </div>
          </section>

          {/* ── Auspicious Muhurat ── */}
          <section className="px-6 pt-5 pb-4">
            <div
              className="rounded-2xl p-5 border"
              style={{ background: "rgba(214,136,10,0.04)", borderColor: "rgba(214,136,10,0.12)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon size={18} weight="thin" className="text-primary" />
                <h3 className="font-bold text-sm text-slate-800">Auspicious Muhurat</h3>
              </div>

              <div className="space-y-3">
                {(muhurats.length > 0 ? muhurats : [
                  { label: "Brahma Muhurta", time: "Before sunrise" },
                  { label: "Abhijit Muhurta", time: "Around midday" },
                ]).map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className="text-xs font-semibold text-primary">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
