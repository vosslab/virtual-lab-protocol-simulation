// playwright.config.ts - Playwright test-runner config for the browser suite.
//
// Adopts the runner model (@playwright/test + *.spec.ts) as this repo's single
// Playwright model, matching the sibling concept-map-maker template.
//
// How to run:
//   ./run_playwright_tests.sh          (front door: build gate + npx playwright test)
//   npx playwright test                (config's webServer builds + serves on its own)
//
// Server model: the webServer block below owns one managed server for every
// worker. Its command BUILDS the GitHub Pages artifact (build_github_pages.sh)
// then SERVES dist/ over HTTP via Python's http.server, so a passing test
// reflects the shipped bundle a student receives (PLAYWRIGHT_TEST_STYLE.md load
// model: build first, then serve the build).
//
// Port: honors the repo random-port convention (8000 + rand(0..999), overridable
// via the PORT env var; see run_web_server.sh:64). The port is chosen once here
// in the config's main process and pinned into BOTH the webServer url and
// use.baseURL, so every worker agrees on one URL. A bind collision fails loud
// (correct signal) rather than triggering a free-port scan.

import { defineConfig, devices } from "@playwright/test";

//============================================
// Environment access without depending on Node's process typings
//============================================

// Access globalThis.process.env without pulling in @types/node globals. The
// cast keeps the config typecheckable under the src tsconfig (mirrors the
// concept-map-maker template).
function processEnv(): Record<string, string | undefined> | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env;
}

// Read an env var off process.env when present.
function readEnv(name: string): string | undefined {
  const env = processEnv();
  return env?.[name];
}

// Persist a value into process.env so worker processes (which re-import this
// config) inherit it from the main runner process.
function writeEnv(name: string, value: string): void {
  const env = processEnv();
  if (env !== undefined) {
    env[name] = value;
  }
}

// CI is truthy when the standard CI env var is set to a non-empty value.
function isCi(): boolean {
  const value = readEnv("CI");
  return value !== undefined && value !== "";
}

//============================================
// Port and base URL (pinned once, shared to all workers)
//============================================

// Random per-run port unless PORT overrides it (matches run_web_server.sh:64).
// The config is evaluated once in the main runner process and again in every
// worker process; a bare Math.random() would pick a different port per process,
// so the browser would target a port with no server. Persist the chosen port
// into process.env.PORT on first evaluation so workers inherit the same value.
function choosePort(): number {
  const existing = readEnv("PORT");
  if (existing !== undefined && existing !== "") {
    return Number(existing);
  }
  const port = 8000 + Math.floor(Math.random() * 1000);
  writeEnv("PORT", String(port));
  return port;
}

const PORT = choosePort();
// Use 127.0.0.1 (not localhost) and bind the server to it below: on this host
// localhost resolves to IPv6 ::1 while python's http.server listens on IPv4, so
// chromium refuses the connection. The repo's library tests already standardize
// on 127.0.0.1 (see tests/playwright/test_launcher.mjs start_server --bind).
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CI = isCi();

//============================================
// Config
//============================================

export default defineConfig({
  // Browser specs live alongside the Playwright helpers.
  testDir: "tests/playwright",
  // Only *.spec.ts files are runner specs; *.mjs files are library scripts.
  testMatch: "**/*.spec.ts",
  // Fail the CI build if a stray test.only is left in the source.
  forbidOnly: CI,
  // Serial and deterministic for a smoke gate.
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Build the GitHub Pages artifact, then serve dist/ over HTTP. One managed
  // server for every worker. The build step makes a bare `npx playwright test`
  // self-sufficient without a prior manual build.
  //
  // reuseExistingServer is always false: a reused leftover `python3 -m
  // http.server --directory dist` would keep serving an old dist/ while
  // generated/ has moved on, so the walker boots a stale bundle (embedded
  // PROTOCOLS snapshot missing newer protocols). Forcing a fresh build+serve on
  // every run keeps the served bytes tied to the current build. CI already ran
  // this way; local now matches.
  webServer: {
    command: `bash build_github_pages.sh && python3 -m http.server ${PORT} --bind 127.0.0.1 --directory dist`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
