/**
 * Static Vedic remedy lookup for each of the 8 Ashta Koots.
 * Shown only when a koot scores below 50% of its max points.
 */

export interface KootRemedy {
  mantra?:   string;
  ritual:    string;
  gemstone?: string;
  color:     string; // left-border accent color
}

export const KOOT_REMEDIES: Record<string, KootRemedy> = {
  Varna: {
    ritual:   "Perform Saraswati Puja together on Panchami — seek the goddess of wisdom to harmonise your temperaments.",
    gemstone: "White sapphire worn by the bride strengthens Varna compatibility.",
    color:    "#6366f1",
  },
  Vashya: {
    ritual:   "Light a ghee diya together at sunrise on Sundays for 21 consecutive days to build magnetic attraction.",
    color:    "#0d9488",
  },
  Tara: {
    ritual:   "Visit a Navagraha temple on Saturdays. Offer sesame oil to the Shani yantra for 9 consecutive Saturdays.",
    mantra:   "Om Pram Preem Proum Sah Shanaischaraya Namah (108 times on Saturday evenings).",
    color:    "#7c3aed",
  },
  Yoni: {
    ritual:   "Perform a joint Kamadeva Puja on Shukla Panchami (5th lunar day of the waxing moon).",
    gemstone: "Diamond or white topaz for Venus, worn on Friday.",
    color:    "#ec4899",
  },
  "Graha Maitri": {
    ritual:   "Chant the Navagraha stotra together each Wednesday morning to pacify planetary discord.",
    mantra:   "Om Budhaya Namah (108 times on Wednesdays) to strengthen Mercury's neutralising influence.",
    color:    "#d97706",
  },
  Gana: {
    ritual:   "Perform Hanuman Puja together on Tuesdays — Hanuman bridges Deva, Manav, and Rakshasa temperaments.",
    mantra:   "Hanuman Chalisa recited jointly, 11 times on Tuesday evenings.",
    color:    "#dc2626",
  },
  Bhakut: {
    ritual:   "Offer red flowers to the Moon on Purnima (full moon). Recite the Chandra Kavach for 3 lunar cycles.",
    mantra:   "Om Som Somaya Namah (108 times on Mondays) to soften Bhakut friction.",
    gemstone: "Pearl or moonstone, set in silver, worn on Monday.",
    color:    "#2563eb",
  },
  Nadi: {
    ritual:   "Perform Maha Mrityunjaya Japa — 108 repetitions daily for 40 days. Ideally at a Shiva temple on Mondays.",
    mantra:   "Om Tryambakam Yajamahe Sugandhim Pushtivardhanam — Urvaarukamiva Bandhanan Mrityor Mukshiya Maamritat.",
    color:    "#dc2626",
  },
};
