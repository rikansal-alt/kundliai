/**
 * Seed script — creates all three collections with sample data.
 * Run with: node scripts/seed-db.mjs
 */

import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";

// Read MONGODB_URI from .env.local
const env = readFileSync(".env.local", "utf8");
const uriMatch = env.match(/MONGODB_URI=(.+)/);
if (!uriMatch) { console.error("MONGODB_URI not found in .env.local"); process.exit(1); }
const MONGODB_URI = uriMatch[1].trim();

const client = new MongoClient(MONGODB_URI);

async function seed() {
  await client.connect();
  const db = client.db("jyotish");

  // ── users ──────────────────────────────────────────────────
  await db.collection("users").deleteMany({ phone: /^\+91_seed/ });
  const { insertedId: userId } = await db.collection("users").insertOne({
    phone: "+91_seed_9876543210",
    name:  "Reecha",
    createdAt: new Date(),
  });
  console.log("✓ users  →", userId.toString());

  // ── charts ─────────────────────────────────────────────────
  await db.collection("charts").deleteMany({ userId: "seed_reecha" });
  const { insertedId: chartId } = await db.collection("charts").insertOne({
    userId: "seed_reecha",
    birthDetails: {
      name: "Reecha",
      date: "15/08/1990",
      time: "14:30",
      city: "New Delhi",
      lat:  28.6139,
      lng:  77.2090,
    },
    chartData: {
      ascendant: "Gemini",
      moonSign:  "Sagittarius",
      sunSign:   "Leo",
      planets: {
        Sun:     { sign: "Leo",          house: 3,  degree: 22.4 },
        Moon:    { sign: "Sagittarius",  house: 7,  degree: 14.1 },
        Mercury: { sign: "Virgo",        house: 4,  degree: 8.2, exalted: true },
        Jupiter: { sign: "Libra",        house: 5,  degree: 3.7 },
        Venus:   { sign: "Cancer",       house: 2,  degree: 17.9 },
        Mars:    { sign: "Taurus",       house: 12, degree: 5.3 },
        Saturn:  { sign: "Capricorn",    house: 8,  degree: 28.1 },
        Rahu:    { sign: "Virgo",        house: 4,  degree: 12.6 },
        Ketu:    { sign: "Pisces",       house: 10, degree: 12.6 },
      },
      mahadasha: { planet: "Jupiter", startYear: 2024, endYear: 2031 },
      themes:    ["Spiritual growth", "Creative expansion", "Family prosperity"],
      summary:   "A dynamic chart with strong Jupiter influence, suggesting wisdom and abundance through the current mahadasha.",
    },
    dailyCache: {
      date:       new Date().toISOString().split("T")[0],
      prediction: "Venus blesses creative pursuits today. Favorable for artistic work and relationships.",
      muhurat:    ["06:30-08:00", "15:00-16:30"],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✓ charts →", chartId.toString());

  // ── consultations ──────────────────────────────────────────
  await db.collection("consultations").deleteMany({ userId: "seed_reecha" });
  const { insertedId: consultId } = await db.collection("consultations").insertOne({
    chartId,
    userId: "seed_reecha",
    messages: [
      { role: "assistant", content: "Namaste! I am your AI Jyotish consultant. How can I guide you today?",  timestamp: new Date() },
      { role: "user",      content: "What does my chart say about career?",                                  timestamp: new Date() },
      { role: "assistant", content: "With your Sagittarius Moon in the 7th house, partnerships and public engagement drive your professional life. Your exalted Mercury in Virgo makes you exceptionally precise — roles in research, writing, or strategy suit you deeply.", timestamp: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✓ consultations →", consultId.toString());

  console.log("\n✅ All three collections seeded in the jyotish database.");
  await client.close();
}

seed().catch((err) => { console.error(err); process.exit(1); });
