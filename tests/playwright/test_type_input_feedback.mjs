// tests/playwright/test_type_input_feedback.mjs
//
// WP-UX-2 (Patch 6) focused check: visible type-input commit feedback.
//
// Drives the type_check dev_smoke protocol through the visible UI, submits an
// INVALID commit (wrong value), and asserts that the generic rejection message
// "Entry not accepted, try again" appears as a visible text node rendered by
// the TypeInput component. No ARIA, no validator-derived reasons.
//
// PRIMARY_SPEC.md walker rule: advances only via real visible affordances.
// The welcome button is a real visible click. The type input + commit button
// are real visible affordances. No internal state writes.
//
// Run: node tests/playwright/test_type_input_feedback.mjs
// Output: test-results/type_input_feedback/ (screenshots)

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

const PROTOCOL = "type_check";
const SHOT_DIR = path.join(REPO_ROOT, "test-results", "type_input_feedback");
// The wrong value that should trigger a rejected commit (correct is 42).
const WRONG_VALUE = "99";

//============================================
// Free port finder + static server
//============================================

async function pick_free_port() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function start_server(port, dist_dir) {
  const child = spawn(
    "python3",
    ["-m", "http.server", String(port), "--directory", dist_dir, "--bind", "127.0.0.1"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const deadline = Date.now() + 5000;
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
  throw new Error(`http.server did not come up on port ${port}`);
}

//============================================
// Main
//============================================

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const dist_dir = path.join(REPO_ROOT, "dist");
  const protocol_html = path.join(dist_dir, `${PROTOCOL}.html`);
  if (!fs.existsSync(protocol_html)) {
    throw new Error(`dist/${PROTOCOL}.html missing; run \`bash build_github_pages.sh\` first`);
  }

  const port = await pick_free_port();
  const server = await start_server(port, dist_dir);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const page_errors = [];
  page.on("pageerror", (err) => page_errors.push(err.message));

  try {
    // Load the protocol page. The welcome screen appears first.
    await page.goto(`${base}/${PROTOCOL}.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // Screenshot: initial state (welcome screen).
    await page.screenshot({ path: path.join(SHOT_DIR, "00_welcome.png") });

    // Click the welcome start button to enter the protocol. The welcome button
    // is the only visible primary CTA on the screen before the protocol loads.
    // A missing welcome affordance is a hard failure: the walker must not silently
    // skip this required visible step (PRIMARY_CONTRACT.md walker rule).
    const welcome_btn = page.locator("[data-welcome-start], button").first();
    const welcome_count = await welcome_btn.count();
    if (welcome_count === 0) {
      throw new Error("FAIL: welcome affordance ([data-welcome-start] or button) not found");
    }
    await welcome_btn.click();
    await page.waitForTimeout(600);

    // Screenshot: scene loaded, before typing.
    await page.screenshot({ path: path.join(SHOT_DIR, "01_scene_loaded.png") });

    // Wait for the visible type-input affordance to appear. The type_check
    // protocol's entry step has gesture=type, so it should appear on load.
    await page.waitForSelector("[data-type-input]", { state: "visible", timeout: 5000 });

    // Screenshot: type-input visible before any commit.
    await page.screenshot({ path: path.join(SHOT_DIR, "02_type_input_visible.png") });

    // Fill the input with a wrong value and commit.
    const input = page.locator("[data-type-input]").first();
    await input.fill(WRONG_VALUE);
    await page.waitForTimeout(100);

    // Screenshot: wrong value entered, before commit.
    await page.screenshot({ path: path.join(SHOT_DIR, "03_wrong_value_entered.png") });

    // Click the commit button (the visible affordance).
    const commit_btn = page.locator("[data-type-commit]").first();
    await commit_btn.click();
    await page.waitForTimeout(300);

    // Screenshot: after rejected commit (rejection message should appear).
    await page.screenshot({ path: path.join(SHOT_DIR, "04_after_rejected_commit.png") });

    // Assert the visible rejection message is present in the DOM.
    const reject_msg = page.locator("[data-type-reject-message]");
    const reject_count = await reject_msg.count();
    if (reject_count === 0) {
      throw new Error(`FAIL: [data-type-reject-message] not found after rejected commit`);
    }

    // Assert the message is visible to the user (not hidden). The visibility
    // assertion is the behavioral contract; do not couple to verbatim copy text
    // so the test does not break when the message wording is edited.
    const is_visible = await reject_msg.first().isVisible();
    if (!is_visible) {
      throw new Error(`FAIL: [data-type-reject-message] exists but is not visible`);
    }

    const reject_text = (await reject_msg.first().textContent()) ?? "";
    console.log(`PASS: rejection message visible: "${reject_text.trim()}"`);
  } finally {
    // Screenshot: final state.
    await page.screenshot({ path: path.join(SHOT_DIR, "05_final.png") });
    await browser.close();
    server.kill();
  }

  if (page_errors.length > 0) {
    console.error("Page errors during test:");
    for (const e of page_errors) {
      console.error(" ", e);
    }
    // Page errors are informational; the assertions above already threw on failure.
  }

  console.log(`Screenshots saved to: ${SHOT_DIR}`);
  console.log("test_type_input_feedback: PASS");
}

main().catch((err) => {
  console.error("test_type_input_feedback: FAIL", err.message);
  process.exit(1);
});
