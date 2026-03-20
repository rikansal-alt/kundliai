import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    viewport: { width: 430, height: 932 }, // iPhone 14 Pro Max
  },
  outputDir: ".test-results",
  reporter: [["html", { open: "never", outputFolder: ".test-results/html" }]],
});
