import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  outputDir: ".test-results",
  reporter: [["html", { open: "never", outputFolder: ".test-results/html" }]],
  projects: [
    {
      name: "iPhone 14",
      use: {
        ...devices["iPhone 14"],
        screenshot: "on",
      },
    },
    {
      name: "iPhone SE",
      use: {
        ...devices["iPhone SE"],
        screenshot: "on",
      },
    },
    {
      name: "Pixel 7",
      use: {
        ...devices["Pixel 7"],
        screenshot: "on",
      },
    },
    {
      name: "Galaxy S9+",
      use: {
        ...devices["Galaxy S9+"],
        screenshot: "on",
      },
    },
  ],
});
