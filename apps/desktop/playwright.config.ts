// The editor's interface tests (R37, record 0082): the browser view with the Tauri side
// simulated, in Chromium and in WebKit (close to the WKWebView of macOS). Locally, Chromium
// is the Edge already installed (no browser download); in CI, Playwright's own browsers.
import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const PORT = 1430; // not 1420/1421: those are the dev servers other sessions may be running

export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts", // not *.test.ts or *.spec.ts, which Vitest would pick up
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-ES",
    viewport: { width: 1400, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 }, channel: CI ? undefined : "msedge" } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1400, height: 900 } } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
