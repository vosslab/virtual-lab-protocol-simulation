// tests/playwright/test_decoration_noninteractive.mjs
//
// Browser evidence for M6 "Enforce capabilities in renderer and candidate
// enumeration". Proves that a decoration_only scene object is NOT a click
// target while a clickable object beside it IS, through the production
// mountScene path only (no internal API calls, no game-state mutation).
//
// Fixture: tests/content/dev_smoke/decoration_noninteractive_check/ places
// ethanol_bottle (capabilities: [clickable, ...]) beside
// micropipette_tip_box (capabilities: [decoration_only]).
//
// What it proves:
//   - ethanol_bottle renders with data-item-id and is a real click target:
//     a real visible click on it produces an observable state change
//     (gameState.interactionIndex/activeStepId/isComplete advances).
//   - micropipette_tip_box renders with NO data-item-id at all (the renderer
//     never stamps a non-clickable item, per M6).
//   - micropipette_tip_box is excluded from the resolver-accepted candidate
//     set: a synthetic click dispatched directly at its DOM node produces no
//     observable state change (the delegated click_resolver never resolves
//     to it, since it has no [data-item-id] for closest() to find).
//
// Launch mechanism (same as test_affordance_evidence.mjs): this is a
// dev_smoke protocol, intentionally excluded from the student launcher, so
// build_github_pages.sh emits no dist/decoration_noninteractive_check.html.
// The protocol host resolves the active protocol from ?protocol=<name>
// (src/protocol_host.tsx resolve_protocol_name), so the fixture is loaded
// through the production mountScene path by appending
// ?protocol=decoration_noninteractive_check to any built protocol-host page.
//
// Usage (from repo root, after `npm run build`):
//   node tests/playwright/test_decoration_noninteractive.mjs

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { chromium } from "playwright";

import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Constants
//============================================

const DIST_DIR = path.join(REPO_ROOT, "dist");

// A built protocol-host page exists for this curriculum protocol; reuse it as
// the host shell and override the protocol via ?protocol=<dev_smoke_name>.
const HOST_PAGE = "drug_dilution_setup.html";

const FIXTURE_PROTOCOL = "decoration_noninteractive_check";
const CLICKABLE_TARGET = "ethanol_bottle";
const DECORATION_TARGET = "micropipette_tip_box";

const ITEM_WAIT_MS = 4000;
const RENDER_WAIT_MS = 1200;

//============================================
// HTTP server helper (serves dist/)
//============================================

const MIME_MAP = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

// Start a Node HTTP server serving dist_dir. Returns { url, close }.
async function start_server(dist_dir) {
  const server = http.createServer((req, res) => {
    const url_path = req.url ? req.url.split("?")[0] : "/";
    const norm = url_path === "/" ? "/index.html" : url_path;
    const file_path = path.join(dist_dir, norm);
    const ext = path.extname(file_path);
    const content_type = MIME_MAP[ext] ?? "application/octet-stream";
    fs.readFile(file_path, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`Not found: ${norm}`);
        return;
      }
      res.writeHead(200, { "Content-Type": content_type });
      res.end(data);
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const url = `http://127.0.0.1:${port}`;
  const close = () => new Promise((resolve) => server.close(() => resolve()));
  return { url, close };
}

//============================================
// Assertion helper
//============================================

// Throw with a clear message when cond is false; log the pass line otherwise.
function check(cond, pass_msg, fail_msg) {
  if (!cond) {
    throw new Error(fail_msg);
  }
  console.log(`  PASS: ${pass_msg}`);
}

// Load the fixture protocol into the host page and wait for scene items to
// render. Real scene objects always carry data-object-name (regardless of
// clickability), so the wait selector must not rely on [data-item-id]
// existing at all -- that is exactly the property under test.
async function load_fixture(page, base) {
  const url = `${base}/${HOST_PAGE}?protocol=${FIXTURE_PROTOCOL}`;
  console.log(`  Loading (production mountScene path): ${url}`);
  const page_errors = [];
  const handler = (err) => page_errors.push(err.message);
  page.on("pageerror", handler);
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForSelector("#scene-root [data-object-name]", { timeout: ITEM_WAIT_MS });
  await page.waitForTimeout(RENDER_WAIT_MS);
  page.off("pageerror", handler);
  if (page_errors.length > 0) {
    console.log(`  page errors (non-fatal): ${page_errors.join(" | ")}`);
  }
}

// Read the FROZEN read-only walker surface fields this check watches for
// observable progress (see docs/specs/WALKTHROUGH_GUIDE.md).
async function read_progress_signals(page) {
  return page.evaluate(() => {
    const gs = window.gameState;
    return {
      interactionIndex: gs.interactionIndex,
      activeStepId: gs.activeStepId,
      isComplete: gs.isComplete,
    };
  });
}

function progress_changed(before, after) {
  return (
    before.interactionIndex !== after.interactionIndex ||
    before.activeStepId !== after.activeStepId ||
    before.isComplete !== after.isComplete
  );
}

//============================================
// Main scenario
//============================================

async function assert_decoration_noninteractive(page, base) {
  console.log(`\n=== dev_smoke protocol: ${FIXTURE_PROTOCOL} ===`);
  await load_fixture(page, base);

  // -- Structural evidence: the decoration object carries no data-item-id at
  //    all, while the clickable object does.
  const clickable_sel = `#scene-root [data-object-name="${CLICKABLE_TARGET}"]`;
  const decoration_sel = `#scene-root [data-object-name="${DECORATION_TARGET}"]`;

  check(
    (await page.locator(clickable_sel).count()) === 1,
    `${CLICKABLE_TARGET} is present exactly once`,
    `expected exactly one ${CLICKABLE_TARGET} element`,
  );
  check(
    (await page.locator(decoration_sel).count()) === 1,
    `${DECORATION_TARGET} is present exactly once`,
    `expected exactly one ${DECORATION_TARGET} element`,
  );

  const clickable_item_id = await page.locator(clickable_sel).first().getAttribute("data-item-id");
  check(
    clickable_item_id === CLICKABLE_TARGET,
    `${CLICKABLE_TARGET} carries data-item-id="${CLICKABLE_TARGET}"`,
    `${CLICKABLE_TARGET} expected data-item-id="${CLICKABLE_TARGET}", got "${clickable_item_id}"`,
  );

  const decoration_item_id = await page
    .locator(decoration_sel)
    .first()
    .getAttribute("data-item-id");
  check(
    decoration_item_id === null,
    `${DECORATION_TARGET} carries NO data-item-id attribute (decoration_only)`,
    `${DECORATION_TARGET} expected no data-item-id, got "${decoration_item_id}"`,
  );

  // -- Behavioral evidence: a real click on the decoration object produces no
  //    observable progress (the click_resolver's closest("[data-item-id]")
  //    never matches it, and enumerate_candidate_targets never listed it).
  const before_decoration_click = await read_progress_signals(page);
  // Dispatch a real click on the decoration element itself. Playwright's
  // locator.click() actionability check does not require [data-item-id]; the
  // element is a normal visible DOM node, just not a resolver-accepted target.
  await page.locator(decoration_sel).first().click();
  await page.waitForTimeout(500);
  const after_decoration_click = await read_progress_signals(page);
  check(
    !progress_changed(before_decoration_click, after_decoration_click),
    `clicking ${DECORATION_TARGET} produces NO observable progress ` +
      `(interactionIndex/activeStepId/isComplete unchanged)`,
    `clicking ${DECORATION_TARGET} unexpectedly changed progress: ` +
      `${JSON.stringify(before_decoration_click)} -> ${JSON.stringify(after_decoration_click)}`,
  );

  // -- Positive control: the clickable object beside it DOES advance the step
  //    on a real click, proving the fixture and click plumbing are both live
  //    (a false negative on the decoration check would otherwise be
  //    indistinguishable from "nothing on this page is clickable").
  const before_clickable_click = await read_progress_signals(page);
  await page.locator(clickable_sel).first().click();
  await page.waitForTimeout(500);
  const after_clickable_click = await read_progress_signals(page);
  check(
    progress_changed(before_clickable_click, after_clickable_click) ||
      after_clickable_click.isComplete === true,
    `clicking ${CLICKABLE_TARGET} DOES produce observable progress ` +
      `(interactionIndex/activeStepId/isComplete advanced)`,
    `clicking ${CLICKABLE_TARGET} produced no observable progress: ` +
      `${JSON.stringify(before_clickable_click)} -> ${JSON.stringify(after_clickable_click)}`,
  );
}

//============================================
// Main
//============================================

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    throw new Error("dist/index.html missing; run `npm run build` first");
  }
  if (!fs.existsSync(path.join(DIST_DIR, HOST_PAGE))) {
    throw new Error(`dist/${HOST_PAGE} missing; run 'npm run build' first`);
  }

  const srv = await start_server(DIST_DIR);
  console.log(`HTTP server on ${srv.url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await assert_decoration_noninteractive(page, srv.url);
  } finally {
    await browser.close();
    await srv.close();
  }

  console.log("\n=== SUMMARY ===");
  console.log("Decoration non-interactive browser evidence: PASS.");
  console.log("\nPASS: test_decoration_noninteractive");
}

main().catch((err) => {
  console.error("FAIL: test_decoration_noninteractive");
  console.error(err);
  process.exit(1);
});
