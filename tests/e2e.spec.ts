import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("Full User Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
  });

  // ─── Landing Page ────────────────────────────────────────────────────

  test("Landing page loads with form", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator("form")).toBeVisible();
  });

  test("Landing page shows Instagram link", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('a[href*="instagram.com/kundliai"]')).toBeVisible();
  });

  test("Landing page shows Privacy and Terms links", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('a[href="/terms"]')).toBeVisible();
  });

  // ─── Chart Generation ────────────────────────────────────────────────

  test("Generate chart with valid inputs", async ({ page }) => {
    await page.goto(BASE + "/?new=1");
    const nameInput = page.locator('input').first();
    await nameInput.fill("Test User");
    const dobInput = page.locator('input').nth(1);
    await dobInput.fill("1990-05-15");
    const timeInput = page.locator('input').nth(2);
    await timeInput.fill("14:30");
    const cityInput = page.locator('input').nth(3);
    await cityInput.fill("New Delhi");
    await page.waitForTimeout(1500);
    const suggestion = page.locator('[class*="suggestion"], [class*="dropdown"] button').first();
    if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestion.click();
    }
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForURL("**/home**", { timeout: 30000 });
    expect(page.url()).toContain("/home");
  });

  // ─── Home Page ────────────────────────────────────────────────────────

  test("Home page loads with chart data", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({
        name: "TestUser", ascendant: { sign: "Aries", degree: 15, nakshatra: "Bharani" },
        moonSign: "Taurus", sunSign: "Leo",
        planets: { Sun: { sign: "Leo", house: 5, degree: 12, retrograde: false, nakshatra: "Magha" } },
        mahadasha: { currentMahadasha: { planet: "Saturn", startDate: "2020-01-01", endDate: "2039-01-01" }, currentBhukti: { planet: "Mercury", startDate: "2025-01-01", endDate: "2027-06-01" }, percentElapsed: 25 },
      }));
      localStorage.setItem("kundliai_guest", JSON.stringify({
        guestId: "test-123", birthDetails: { name: "TestUser", date: "1990-05-15", time: "14:30", city: "New Delhi", lat: 28.6, lng: 77.2 },
        chartData: {}, consultMessages: [], consultCount: 0,
        createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      }));
    });

    await page.goto(BASE + "/home?name=TestUser");
    await expect(page.getByRole("heading", { name: "TestUser" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Aries Asc")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ New" })).toBeVisible();
  });

  test("Home page Edit button goes to pre-filled form", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({ name: "TestUser", ascendant: "Aries", moonSign: "Taurus", sunSign: "Leo" }));
      localStorage.setItem("kundliai_guest", JSON.stringify({
        guestId: "test-123", birthDetails: { name: "TestUser", date: "1990-05-15", time: "14:30", city: "New Delhi", lat: 28.6, lng: 77.2 },
        chartData: {}, consultMessages: [], consultCount: 0,
        createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      }));
    });

    await page.goto(BASE + "/home?name=TestUser");
    await page.getByRole("button", { name: "Edit" }).click();
    await page.waitForURL("**/?new=1&edit=1");
    await page.waitForTimeout(1000);
    const nameValue = await page.locator('input').first().inputValue();
    expect(nameValue).toBe("TestUser");
  });

  // ─── Consult Page ────────────────────────────────────────────────────

  test("Consult page loads with greeting", async ({ page }) => {
    await page.goto(BASE + "/consult");
    await expect(page.getByText("Namaste!", { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test("Consult page shows suggestion chips", async ({ page }) => {
    await page.goto(BASE + "/consult");
    await expect(page.getByRole("button", { name: /Daily Horoscope/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Career Advice/ })).toBeVisible();
  });

  test("Consult page shows counter", async ({ page }) => {
    await page.goto(BASE + "/consult");
    await expect(page.getByText(/\d+ of \d+ consultations remaining/)).toBeVisible({ timeout: 5000 });
  });

  // ─── Kundli Page ──────────────────────────────────────────────────────

  test("Kundli page shows chart when data exists", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({
        name: "Test", ascendant: { sign: "Aries", degree: 15, nakshatra: "Bharani" },
        moonSign: "Taurus", sunSign: "Leo",
        planets: {
          Sun: { sign: "Leo", house: 5, degree: 12, retrograde: false, nakshatra: "Magha" },
          Moon: { sign: "Taurus", house: 2, degree: 8, retrograde: false, nakshatra: "Rohini" },
          Mars: { sign: "Aries", house: 1, degree: 22, retrograde: false, nakshatra: "Bharani" },
        },
        mahadasha: { currentMahadasha: { planet: "Saturn", startDate: "2020-01-01", endDate: "2039-01-01" }, currentBhukti: { planet: "Mercury", startDate: "2025-01-01", endDate: "2027-06-01" }, percentElapsed: 25, allDashas: [{ planet: "Saturn", startDate: "2020-01-01", endDate: "2039-01-01" }] },
      }));
    });

    await page.goto(BASE + "/kundli");
    await expect(page.getByRole("heading", { name: "My Kundali" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Sun/ }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Moon/ }).first()).toBeVisible();
  });

  test("Kundli planet tap opens and closes explanation sheet", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({
        name: "Test", ascendant: { sign: "Aries", degree: 15, nakshatra: "Bharani" },
        moonSign: "Taurus", sunSign: "Leo",
        planets: {
          Sun: { sign: "Leo", house: 5, degree: 12, retrograde: false, nakshatra: "Magha" },
          Moon: { sign: "Taurus", house: 2, degree: 8, retrograde: false, nakshatra: "Rohini" },
        },
      }));
    });

    await page.goto(BASE + "/kundli");
    await page.waitForTimeout(1000);

    // Tap Sun in planet positions (not in the tab bar)
    await page.getByRole("button", { name: /Sun.*Magha/ }).click();
    await expect(page.getByText("What Sun Represents")).toBeVisible({ timeout: 3000 });

    // Close
    await page.getByText("✕").click();
    await expect(page.getByText("What Sun Represents")).not.toBeVisible({ timeout: 2000 });
  });

  test("Kundli page shows empty state without data", async ({ page }) => {
    await page.goto(BASE + "/kundli");
    await expect(page.getByText("Generate your Kundli first")).toBeVisible({ timeout: 5000 });
  });

  // ─── Panchang Page ────────────────────────────────────────────────────

  test("Panchang page loads with data", async ({ page }) => {
    await page.goto(BASE + "/panchang");
    await expect(page.getByText("Tithi", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Sunrise").first()).toBeVisible();
    await expect(page.getByText("Sunset").first()).toBeVisible();
  });

  // ─── Daily Page ───────────────────────────────────────────────────────

  test("Daily page shows guidance when chart exists", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({ name: "Test", ascendant: "Aries", moonSign: "Taurus", sunSign: "Leo" }));
    });
    await page.goto(BASE + "/daily");
    await expect(page.getByText("Your Daily Guidance")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Morning Insight")).toBeVisible({ timeout: 5000 });
  });

  test("Daily page shows empty state without chart", async ({ page }) => {
    await page.goto(BASE + "/daily");
    await expect(page.getByText("Generate your Kundli first")).toBeVisible({ timeout: 5000 });
  });

  // ─── Settings Page ────────────────────────────────────────────────────

  test("Settings page loads with all sections", async ({ page }) => {
    await page.goto(BASE + "/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Privacy Policy").first()).toBeVisible();
    await expect(page.getByText("Clear My Chart")).toBeVisible();
    await expect(page.getByText("@kundliai on Instagram")).toBeVisible();
  });

  test("Clear My Chart removes data and redirects", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem("kundliai_chart", JSON.stringify({ name: "Test", moonSign: "Aries" }));
    });
    await page.goto(BASE + "/settings");

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByText("Clear My Chart").click();
    await page.waitForURL(BASE + "/", { timeout: 5000 });

    const chart = await page.evaluate(() => localStorage.getItem("kundliai_chart"));
    expect(chart).toBeNull();
  });

  // ─── Navigation ───────────────────────────────────────────────────────

  test("Bottom nav has all 5 items and navigates", async ({ page }) => {
    await page.goto(BASE + "/home");
    const nav = page.locator("nav");
    await expect(nav.getByText("Home")).toBeVisible({ timeout: 5000 });
    await expect(nav.getByText("Panchang")).toBeVisible();
    await expect(nav.getByText("Consult")).toBeVisible();
    await expect(nav.getByText("Kundli")).toBeVisible();
    await expect(nav.getByText("Settings")).toBeVisible();

    // Navigate
    await nav.getByText("Panchang").click();
    await page.waitForURL("**/panchang**", { timeout: 5000 });

    await nav.getByText("Settings").click();
    await page.waitForURL("**/settings**", { timeout: 5000 });
  });

  // ─── Privacy & Terms ──────────────────────────────────────────────────

  test("Privacy page loads with generic vendor names", async ({ page }) => {
    await page.goto(BASE + "/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("AI provider").first()).toBeVisible();
    await expect(page.getByText("Cloud infrastructure").first()).toBeVisible();
  });

  test("Terms page loads", async ({ page }) => {
    await page.goto(BASE + "/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible({ timeout: 5000 });
  });

  // ─── API Endpoints ────────────────────────────────────────────────────

  test("Panchang API returns valid data", async ({ request }) => {
    const res = await request.get(BASE + "/api/panchang?lat=28.6139&lng=77.209");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.tithi).toBeDefined();
    expect(data.sunriseUtcMin).toBeGreaterThan(0);
    expect(data.sunsetUtcMin).toBeGreaterThan(data.sunriseUtcMin);
    expect(data.locationTimezone).toBe("Asia/Kolkata");
  });

  test("Daily prediction API returns valid data", async ({ request }) => {
    const res = await request.get(BASE + "/api/daily-prediction?asc=Aries&moon=Taurus");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.stats.energy.value).toBeTruthy();
    expect(data.stats.focus.value).toBeTruthy();
    expect(data.prediction.morning).toBeTruthy();
  });

  test("Consult API rejects empty body", async ({ request }) => {
    const res = await request.post(BASE + "/api/consult", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("Consult remaining API works", async ({ request }) => {
    const res = await request.get(BASE + "/api/consult/remaining");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(typeof data.used).toBe("number");
    expect(typeof data.limit).toBe("number");
    expect(typeof data.remaining).toBe("number");
  });
});
