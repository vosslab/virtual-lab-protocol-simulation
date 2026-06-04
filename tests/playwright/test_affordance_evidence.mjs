// tests/playwright/test_affordance_evidence.mjs
//
// Browser evidence for the derived interaction affordance. This is the
// contract item-4 acceptance test for the affordance feature.
//
// What it proves, through the production mountScene path only (no internal API
// calls, no game-state mutation -- it loads the page normally and merely READS
// the DOM and computed styles for assertions):
//
//   SELECT step (dev/test protocol select_check, two bottles):
//     - the count of [data-affordance="candidate"] elements equals the count of
//       clickable scene objects present (>= 2);
//     - BOTH pbs_bottle (correct) and ethanol_bottle (wrong) carry
//       data-affordance="candidate";
//     - NEITHER carries data-affordance="active" (no answer reveal);
//     - their computed ring (outline) is identical, so a student cannot tell the
//       correct bottle from the wrong one by the ring;
//     - the ring is STATIC: computed animation-name is "none" (no pulse/motion).
//
//   CLICK step (curriculum protocol drug_dilution_setup, entry gesture click on
//   micropipette):
//     - exactly one [data-affordance="active"] element;
//     - zero [data-affordance="candidate"] elements.
//
// Launch mechanism:
//   select_check is a dev_smoke protocol; it is intentionally excluded from the
//   student launcher, so build_github_pages.sh emits no dist/select_check.html.
//   The protocol host resolves the active protocol from ?protocol=<name> (which
//   wins over the per-page inlined window.__PROTOCOL_NAME__; see
//   src/protocol_host.tsx resolve_protocol_name). So select_check is loaded
//   through the production mountScene path by appending ?protocol=select_check
//   to any built protocol-host page. drug_dilution_setup is loaded directly via
//   its own emitted dist/drug_dilution_setup.html.
//
// Usage (from repo root, after `npm run build`):
//   node tests/playwright/test_affordance_evidence.mjs

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { chromium } from "playwright";

import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Constants
//============================================

const DIST_DIR = path.join(REPO_ROOT, "dist");
const AFFORDANCE_DIR = path.join(REPO_ROOT, "test-results", "affordance");

// A built protocol-host page exists for this curriculum protocol; we reuse it
// as the host shell and override the protocol via ?protocol=select_check.
const HOST_PAGE = "drug_dilution_setup.html";

// The dev/test select protocol: two bottles, one correct (pbs), one wrong.
const SELECT_PROTOCOL = "select_check";
const SELECT_BOTTLES = ["pbs_bottle", "ethanol_bottle"];

// A click-gesture protocol: entry step prepare_carb_parent_stock clicks the
// micropipette. Its own dist HTML inlines window.__PROTOCOL_NAME__.
const CLICK_PROTOCOL = "drug_dilution_setup";
const CLICK_ACTIVE_TARGET = "micropipette";

// Computed-style tokens the CSS ring rules in src/style.css produce.
//   active:    outline: 3px solid #f5a623  -> rgb(245, 166, 35)
//   candidate: outline: 3px dashed #2563eb -> rgb(37, 99, 235)
const EXPECTED_CANDIDATE_OUTLINE_COLOR = "rgb(37, 99, 235)";
const EXPECTED_CANDIDATE_OUTLINE_STYLE = "dashed";

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

// Load a protocol into the host page and wait for scene items to render.
async function load_protocol(page, base, protocol_name) {
  const url = `${base}/${HOST_PAGE}?protocol=${protocol_name}`;
  console.log(`  Loading (production mountScene path): ${url}`);
  const page_errors = [];
  const handler = (err) => page_errors.push(err.message);
  page.on("pageerror", handler);
  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForSelector("#scene-root [data-item-id]", { timeout: ITEM_WAIT_MS });
  await page.waitForTimeout(RENDER_WAIT_MS);
  page.off("pageerror", handler);
  if (page_errors.length > 0) {
    console.log(`  page errors (non-fatal): ${page_errors.join(" | ")}`);
  }
}

// Read the computed outline triple (width/style/color) of a single element.
async function read_outline(page, selector) {
  const result = await page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outline: cs.outline,
        outline_color: cs.outlineColor,
        outline_style: cs.outlineStyle,
        outline_width: cs.outlineWidth,
        animation_name: cs.animationName,
      };
    });
  return result;
}

//============================================
// SELECT-step evidence (the most important acceptance test)
//============================================

async function assert_select_affordance(page, base) {
  console.log(`\n=== SELECT protocol: ${SELECT_PROTOCOL} (two bottles) ===`);
  await load_protocol(page, base, SELECT_PROTOCOL);

  // Before-interaction screenshot: initial render with candidate rings present.
  const before_path = path.join(AFFORDANCE_DIR, "select_check_before.png");
  await page.screenshot({ path: before_path, fullPage: false });
  console.log(`  Screenshot (before): ${before_path}`);

  // Count clickable scene objects present and candidate-ringed objects.
  const clickable_count = await page.locator("#scene-root [data-item-id]").count();
  const candidate_count = await page.locator('#scene-root [data-affordance="candidate"]').count();
  const active_count = await page.locator('#scene-root [data-affordance="active"]').count();
  console.log(`  clickable=${clickable_count} candidate=${candidate_count} active=${active_count}`);

  check(
    clickable_count >= 2,
    `at least 2 clickable scene objects present (got ${clickable_count})`,
    `expected >= 2 clickable objects in select_check, got ${clickable_count}`,
  );
  // Design assumption: select_check contains only candidate scene objects, so
  // every clickable [data-item-id] element is a candidate. If a non-candidate
  // fixture object (e.g. a decorative label) is ever added to this scene, this
  // equality becomes `>= 2` plus per-object affordance checks.
  check(
    candidate_count === clickable_count,
    `candidate-ring count == clickable-object count (${candidate_count} == ${clickable_count})`,
    `candidate count ${candidate_count} != clickable count ${clickable_count}`,
  );
  check(
    active_count === 0,
    `zero active rings on a select step (no answer reveal); active=${active_count}`,
    `expected 0 active rings on select step, got ${active_count}`,
  );

  // Both named bottles carry the candidate affordance and neither is active.
  const outlines = {};
  for (const bottle of SELECT_BOTTLES) {
    const sel = `#scene-root [data-item-id="${bottle}"]`;
    const present = (await page.locator(sel).count()) === 1;
    check(
      present,
      `${bottle} is present exactly once`,
      `expected exactly one ${bottle} element, found a different count`,
    );
    const aff = await page.locator(sel).first().getAttribute("data-affordance");
    check(
      aff === "candidate",
      `${bottle} has data-affordance="candidate" (got "${aff}")`,
      `${bottle} expected data-affordance="candidate", got "${aff}"`,
    );
    const style = await read_outline(page, sel);
    outlines[bottle] = style;
    console.log(`  ${bottle} computed outline: "${style.outline}" (style=${style.outline_style})`);
  }

  // The correct and wrong bottle must look identical: same computed ring.
  const a = outlines[SELECT_BOTTLES[0]];
  const b = outlines[SELECT_BOTTLES[1]];
  check(
    a.outline_color === b.outline_color &&
      a.outline_style === b.outline_style &&
      a.outline_width === b.outline_width,
    `pbs_bottle and ethanol_bottle have IDENTICAL ring ` +
      `(color=${a.outline_color}, style=${a.outline_style}, width=${a.outline_width})`,
    `bottle rings differ: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`,
  );

  // The candidate ring is the expected dashed-blue token.
  check(
    a.outline_color === EXPECTED_CANDIDATE_OUTLINE_COLOR &&
      a.outline_style === EXPECTED_CANDIDATE_OUTLINE_STYLE,
    `candidate ring is dashed blue (${a.outline_color} ${a.outline_style})`,
    `candidate ring expected ${EXPECTED_CANDIDATE_OUTLINE_COLOR} ${EXPECTED_CANDIDATE_OUTLINE_STYLE}, ` +
      `got ${a.outline_color} ${a.outline_style}`,
  );

  // STATIC: no animation drives the ring (computed animation-name is "none").
  check(
    a.animation_name === "none" && b.animation_name === "none",
    `ring is STATIC: computed animation-name == "none" on both bottles`,
    `expected static ring (animation-name none), got "${a.animation_name}" / "${b.animation_name}"`,
  );

  // After re-reading the live computed style (no state mutation, no internal
  // API call), the candidate ring is unchanged -- the affordance is stable, not
  // motion-driven. Re-measure to prove the dashed-blue ring is steady, then save
  // the after-evidence screenshot. (Mouse is moved to a neutral corner first so
  // the baseline :hover outline does not transiently mask the candidate ring in
  // the captured frame; the static candidate ring is what we are documenting.)
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  const after_recheck = await read_outline(
    page,
    `#scene-root [data-item-id="${SELECT_BOTTLES[0]}"]`,
  );
  check(
    after_recheck.outline_color === EXPECTED_CANDIDATE_OUTLINE_COLOR &&
      after_recheck.outline_style === EXPECTED_CANDIDATE_OUTLINE_STYLE,
    `candidate ring is steady on re-measure (still dashed blue)`,
    `candidate ring changed on re-measure: ${JSON.stringify(after_recheck)}`,
  );

  // Hover-persistence assertion: hover the first candidate bottle; the
  // candidate ring MUST persist (dashed blue, 3px). The baseline
  // [data-item-id]:hover rule must NOT replace it. This assertion is the
  // direct browser proof that the CSS specificity fix (raising affordance
  // selectors to [data-item-id][data-affordance="..."]) works.
  const hover_sel = `#scene-root [data-item-id="${SELECT_BOTTLES[0]}"]`;
  await page.locator(hover_sel).hover();
  await page.waitForTimeout(100);
  const hover_outline = await read_outline(page, hover_sel);
  console.log(
    `  ${SELECT_BOTTLES[0]} computed outline WHILE HOVERED: "${hover_outline.outline}" ` +
      `(style=${hover_outline.outline_style}, color=${hover_outline.outline_color})`,
  );
  check(
    hover_outline.outline_color === EXPECTED_CANDIDATE_OUTLINE_COLOR &&
      hover_outline.outline_style === EXPECTED_CANDIDATE_OUTLINE_STYLE,
    `candidate ring PERSISTS while hovered: ` +
      `${hover_outline.outline_color} ${hover_outline.outline_style} ` +
      `(${EXPECTED_CANDIDATE_OUTLINE_STYLE} ${EXPECTED_CANDIDATE_OUTLINE_COLOR} 3px)`,
    `candidate ring was REPLACED by baseline hover outline while hovered: ` +
      `expected ${EXPECTED_CANDIDATE_OUTLINE_COLOR} ${EXPECTED_CANDIDATE_OUTLINE_STYLE}, ` +
      `got ${hover_outline.outline_color} ${hover_outline.outline_style}`,
  );

  // Focus-persistence assertion: focus the first candidate bottle via the
  // keyboard (Tab). The candidate ring MUST persist (dashed blue, 3px). The
  // baseline [data-item-id]:focus-visible rule must NOT replace it. Move mouse
  // off the element first so the hovered state does not interfere with the
  // focus-specific measurement.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(100);
  await page.locator(hover_sel).focus();
  await page.waitForTimeout(100);
  const focus_outline = await read_outline(page, hover_sel);
  console.log(
    `  ${SELECT_BOTTLES[0]} computed outline WHILE FOCUSED: "${focus_outline.outline}" ` +
      `(style=${focus_outline.outline_style}, color=${focus_outline.outline_color})`,
  );
  check(
    focus_outline.outline_color === EXPECTED_CANDIDATE_OUTLINE_COLOR &&
      focus_outline.outline_style === EXPECTED_CANDIDATE_OUTLINE_STYLE,
    `candidate ring PERSISTS while focused: ` +
      `${focus_outline.outline_color} ${focus_outline.outline_style} ` +
      `(${EXPECTED_CANDIDATE_OUTLINE_STYLE} ${EXPECTED_CANDIDATE_OUTLINE_COLOR} 3px)`,
    `candidate ring was REPLACED by baseline focus-visible outline while focused: ` +
      `expected ${EXPECTED_CANDIDATE_OUTLINE_COLOR} ${EXPECTED_CANDIDATE_OUTLINE_STYLE}, ` +
      `got ${focus_outline.outline_color} ${focus_outline.outline_style}`,
  );

  // Move mouse off before taking the final screenshot so the hover state is clear.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(100);

  const after_path = path.join(AFFORDANCE_DIR, "select_check_after.png");
  await page.screenshot({ path: after_path, fullPage: false });
  console.log(`  Screenshot (after): ${after_path}`);
}

//============================================
// CLICK-step evidence (one active ring, no candidates)
//============================================

async function assert_click_affordance(page, base) {
  console.log(
    `\n=== CLICK protocol: ${CLICK_PROTOCOL} (entry click on ${CLICK_ACTIVE_TARGET}) ===`,
  );
  await load_protocol(page, base, CLICK_PROTOCOL);

  const before_path = path.join(AFFORDANCE_DIR, "click_step_before.png");
  await page.screenshot({ path: before_path, fullPage: false });
  console.log(`  Screenshot (before): ${before_path}`);

  const active_count = await page.locator('#scene-root [data-affordance="active"]').count();
  const candidate_count = await page.locator('#scene-root [data-affordance="candidate"]').count();
  console.log(`  active=${active_count} candidate=${candidate_count}`);

  check(
    active_count === 1,
    `exactly one active ring on a click step (got ${active_count})`,
    `expected exactly 1 active ring on click step, got ${active_count}`,
  );
  check(
    candidate_count === 0,
    `zero candidate rings on a click step (got ${candidate_count})`,
    `expected 0 candidate rings on click step, got ${candidate_count}`,
  );

  // The single active ring is on the directed target and is the solid-orange
  // token, distinct from the candidate dashed-blue token.
  const active_target = await page
    .locator('#scene-root [data-affordance="active"]')
    .first()
    .getAttribute("data-item-id");
  check(
    active_target === CLICK_ACTIVE_TARGET,
    `active ring is on the directed target "${CLICK_ACTIVE_TARGET}" (got "${active_target}")`,
    `active ring on "${active_target}", expected "${CLICK_ACTIVE_TARGET}"`,
  );
  const style = await read_outline(page, '#scene-root [data-affordance="active"]');
  check(
    style.outline_style === "solid" && style.animation_name === "none",
    `active ring is STATIC solid (style=${style.outline_style}, animation=${style.animation_name})`,
    `active ring expected static solid, got style=${style.outline_style} animation=${style.animation_name}`,
  );

  const after_path = path.join(AFFORDANCE_DIR, "click_step_after.png");
  await page.screenshot({ path: after_path, fullPage: false });
  console.log(`  Screenshot (after): ${after_path}`);
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
  fs.mkdirSync(AFFORDANCE_DIR, { recursive: true });

  const srv = await start_server(DIST_DIR);
  console.log(`HTTP server on ${srv.url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await assert_select_affordance(page, srv.url);
    await assert_click_affordance(page, srv.url);
  } finally {
    await browser.close();
    await srv.close();
  }

  console.log("\n=== SUMMARY ===");
  console.log("Affordance browser evidence: select + click steps PASS, screenshots saved.");
  console.log("\nPASS: test_affordance_evidence");
}

main().catch((err) => {
  console.error("FAIL: test_affordance_evidence");
  console.error(err);
  process.exit(1);
});
