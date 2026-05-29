// tests/playwright/test_scene_viewer.mjs
//
// WS-M1-B smoke: scene_viewer.html loads any named scene and sets the
// ready marker; a bogus scene name shows the error banner.
//
// Two sub-tests:
//   1. Known scene (hood_basic): data-viewer-ready="true" is set on
//      #scene-root AND at least one [data-placement-name] is rendered.
//   2. Bogus scene (?scene=__bogus__): data-viewer-ready="true" is set
//      AND a visible error banner is present (contains "unknown scene").
//
// The test starts python3 -m http.server on a random free port to serve
// dist/ over HTTP (same pattern as other smoke tests in this repo).
// It does NOT rebuild dist/; run `bash build_github_pages.sh` first.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Configuration
//============================================

// Known scene with at least one placement (from generated/scene_manifest.json).
const KNOWN_SCENE = "hood_basic";
const BOGUS_SCENE = "__bogus_scene_xyz__";

const ARTIFACT_DIR = path.join(REPO_ROOT, "tests", "playwright", "artifacts", "scene_viewer");

//============================================
// Helper: pick a free TCP port
//============================================

async function pick_free_port() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      // addr is a net.AddressInfo when listening on an IP
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

//============================================
// Helper: start http.server and wait for it
//============================================

async function start_server(port, dist_dir) {
  const child = spawn(
    "python3",
    ["-m", "http.server", String(port), "--directory", dist_dir, "--bind", "127.0.0.1"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  // Poll for TCP readiness instead of reading stdout (avoids buffering issues).
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const sock = net.createConnection({ host: "127.0.0.1", port }, () => {
        sock.end();
        resolve(true);
      });
      sock.on("error", () => resolve(false));
    });
    if (ready) return child;
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`http.server did not start on port ${port} within 6 s`);
}

//============================================
// Test 1: known scene -> ready marker + placements
//============================================

async function test_known_scene(page, base_url) {
  const url = `${base_url}/scene_viewer.html?scene=${KNOWN_SCENE}`;
  console.log(`  Loading: ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for the viewer to set the ready marker (up to 8 s).
  await page.waitForFunction(
    () => {
      const el = document.getElementById("scene-root");
      return el !== null && el.getAttribute("data-viewer-ready") === "true";
    },
    null,
    { timeout: 8000 },
  );
  console.log(`  OK: data-viewer-ready="true" set on #scene-root`);

  // Assert at least one placement rendered.
  const placement_count = await page.locator("[data-placement-name]").count();
  if (placement_count < 1) {
    throw new Error(
      `Expected >=1 [data-placement-name] for scene "${KNOWN_SCENE}", got ${placement_count}`,
    );
  }
  console.log(`  OK: ${placement_count} [data-placement-name] elements rendered`);

  // Save a screenshot for visual evidence.
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `known_scene_${KNOWN_SCENE}.png`),
    fullPage: false,
  });
  console.log(`  Screenshot saved.`);
}

//============================================
// Test 2: bogus scene -> error banner + ready marker
//============================================

async function test_bogus_scene(page, base_url) {
  const url = `${base_url}/scene_viewer.html?scene=${BOGUS_SCENE}`;
  console.log(`  Loading: ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });

  // The viewer sets ready even on the error path.
  await page.waitForFunction(
    () => {
      const el = document.getElementById("scene-root");
      return el !== null && el.getAttribute("data-viewer-ready") === "true";
    },
    null,
    { timeout: 8000 },
  );
  console.log(`  OK: data-viewer-ready="true" set on error path`);

  // The error banner text must contain "unknown scene".
  const banner_text = await page.locator("#scene-root").innerText();
  if (!banner_text.toLowerCase().includes("unknown scene")) {
    throw new Error(
      `Expected error banner with "unknown scene" text; got: ${banner_text.slice(0, 200)}`,
    );
  }
  console.log(`  OK: error banner contains "unknown scene"`);

  // Save a screenshot.
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `bogus_scene.png`),
    fullPage: false,
  });
  console.log(`  Screenshot saved.`);
}

//============================================
// Main
//============================================

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const dist_dir = path.join(REPO_ROOT, "dist");

  // Abort early with a clear message if the build artifact is missing.
  if (!fs.existsSync(path.join(dist_dir, "scene_viewer.html"))) {
    throw new Error(
      "dist/scene_viewer.html missing; run `bash build_github_pages.sh` before this test.",
    );
  }
  if (!fs.existsSync(path.join(dist_dir, "scene_viewer.js"))) {
    throw new Error(
      "dist/scene_viewer.js missing; run `bash build_github_pages.sh` before this test.",
    );
  }

  const port = await pick_free_port();
  const server = await start_server(port, dist_dir);
  const base_url = `http://127.0.0.1:${port}`;

  // Headless only; no headless:false per PLAYWRIGHT_USAGE.md rule.
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const page_errors = [];
  page.on("pageerror", (err) => page_errors.push(err.message));

  try {
    // --- Test 1: known scene ---
    console.log(`\nTest 1: known scene "${KNOWN_SCENE}"`);
    await test_known_scene(page, base_url);
    console.log(`PASS: test 1 (known scene)`);

    // --- Test 2: bogus scene ---
    console.log(`\nTest 2: bogus scene "${BOGUS_SCENE}"`);
    await test_bogus_scene(page, base_url);
    console.log(`PASS: test 2 (bogus scene)`);

    // Fail if the page emitted unexpected JS errors during either test.
    // Note: the bogus-scene path emits no errors (it is a handled, non-throw path).
    if (page_errors.length > 0) {
      throw new Error(`Unexpected page errors:\n  ${page_errors.join("\n  ")}`);
    }

    console.log("\nPASS: test_scene_viewer");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("FAIL: test_scene_viewer");
  console.error(err);
  process.exit(1);
});
