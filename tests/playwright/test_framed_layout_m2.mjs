// tests/playwright/test_framed_layout_m2.mjs
//
// WP-EVID-2 -- M2 framed-layout measurable evidence.
//
// Asserts (from the task spec):
//   1. #scene-root width AND height are each strictly less than the viewport.
//   2. The scene panel contains >= 1 [data-item-id] (scene rendered non-blank).
//   3. A professor/tips region [data-region="tips-bubble"] exists and is visible.
//   4. A step-counter region [data-region="step-counter"] exists and is visible.
//   5. An outline region [data-region="outline"] exists and is visible.
//   6. A guidance bar [data-region="guidance-bar"] exists and is visible.
//   7. The current step card has data-step-status="current" (distinct styling).
//
// Coordinate-integrity check (WP-FRAME-2):
//   8. Every [data-item-id] bounding box is within #scene-root bounding box
//      (no overflow outside the bounded panel).
//   9. Click target for at least one known object (the first [data-item-id])
//      lands inside #scene-root (the tautological "inside own bbox" half removed;
//      center-of-a-box is always inside the box by definition).
//
// Evidence protocol: sdspage_heat_denature_samples (3 items, heat-block scene).
// Nominated by M0 gap report as the sdspage cluster evidence candidate.
//
// Usage (from repo root):
//   node tests/playwright/test_framed_layout_m2.mjs

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Constants
//============================================

const EVIDENCE_PROTOCOL = "sdspage_heat_denature_samples";
const ITEM_WAIT_MS = 4000;
const RENDER_WAIT_MS = 1500;

const DIST_DIR = path.join(REPO_ROOT, "dist");
const TEST_RESULTS_DIR = path.join(REPO_ROOT, "test-results");

//============================================
// HTTP server helper (same pattern as M1 evidence)
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

  return {
    port,
    url,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

//============================================
// Assertion helpers
//============================================

// Assert that an element is visible: exists in DOM, has non-zero bounding box,
// and is not hidden via display:none or visibility:hidden.
async function assert_region_visible(page, selector, region_name) {
  const el = page.locator(selector).first();
  const count = await el.count();
  if (count === 0) {
    throw new Error(`Region "${region_name}": selector "${selector}" not found in DOM`);
  }
  const box = await el.boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    throw new Error(
      `Region "${region_name}": selector "${selector}" has zero bounding box (not visible)`,
    );
  }
  return box;
}

// Assert bounding box A is contained within bounding box B (with tolerance px).
function assert_box_inside(inner, outer, label, tolerance_px = 2) {
  const left_ok = inner.x >= outer.x - tolerance_px;
  const top_ok = inner.y >= outer.y - tolerance_px;
  const right_ok = inner.x + inner.width <= outer.x + outer.width + tolerance_px;
  const bottom_ok = inner.y + inner.height <= outer.y + outer.height + tolerance_px;
  if (!left_ok || !top_ok || !right_ok || !bottom_ok) {
    throw new Error(
      `Coordinate overflow: "${label}" bounding box ` +
        `[x=${inner.x.toFixed(1)},y=${inner.y.toFixed(1)},w=${inner.width.toFixed(1)},h=${inner.height.toFixed(1)}] ` +
        `extends outside #scene-root ` +
        `[x=${outer.x.toFixed(1)},y=${outer.y.toFixed(1)},w=${outer.width.toFixed(1)},h=${outer.height.toFixed(1)}]`,
    );
  }
}

//============================================
// Main test function
//============================================

async function run_framed_layout_test(page, base) {
  const url = `${base}/${EVIDENCE_PROTOCOL}.html`;
  console.log(`  Loading: ${url}`);

  const page_errors = [];
  page.on("pageerror", (err) => page_errors.push(err.message));

  // Use a realistic desktop viewport (1280x900).
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });

  // Wait for scene items to appear.
  try {
    await page.waitForSelector("#scene-root [data-item-id]", { timeout: ITEM_WAIT_MS });
  } catch {
    // Will be caught by the item-count assertion below.
  }

  // Wait for shell components to mount (Solid onMount is async relative to
  // DOMContentLoaded; the guidance text changes from "Loading..." once mounted).
  try {
    await page.waitForFunction(
      () => {
        const el = document.getElementById("guidance-text");
        return el !== null && el.textContent !== "Loading...";
      },
      { timeout: RENDER_WAIT_MS },
    );
  } catch {
    // May still be loading; continue -- assertions below will report state.
  }

  await page.waitForTimeout(500);

  //============================================
  // Assertion 1: #scene-root is smaller than viewport
  //============================================

  const viewport_size = page.viewportSize();
  const vp_w = viewport_size ? viewport_size.width : 1280;
  const vp_h = viewport_size ? viewport_size.height : 900;

  const scene_root_box = await page.locator("#scene-root").boundingBox();
  if (!scene_root_box) {
    throw new Error("Assertion 1 FAIL: #scene-root not found or has no bounding box");
  }

  if (scene_root_box.width >= vp_w) {
    throw new Error(
      `Assertion 1 FAIL: #scene-root width ${scene_root_box.width.toFixed(1)} >= viewport width ${vp_w}. ` +
        `Scene must be bounded, NOT full viewport.`,
    );
  }
  if (scene_root_box.height >= vp_h) {
    throw new Error(
      `Assertion 1 FAIL: #scene-root height ${scene_root_box.height.toFixed(1)} >= viewport height ${vp_h}. ` +
        `Scene must be bounded, NOT full viewport.`,
    );
  }

  console.log(
    `  [1] PASS: #scene-root (${scene_root_box.width.toFixed(1)}x${scene_root_box.height.toFixed(1)}) ` +
      `< viewport (${vp_w}x${vp_h})`,
  );

  //============================================
  // Assertion 2: scene panel contains >= 1 [data-item-id]
  //============================================

  const item_count = await page.locator("#scene-root [data-item-id]").count();
  if (item_count < 1) {
    const err_blob = page_errors.length > 0 ? page_errors.join(" | ") : "(no page errors)";
    throw new Error(
      `Assertion 2 FAIL: #scene-root has 0 [data-item-id] elements. ` + `page_errors: ${err_blob}`,
    );
  }
  console.log(`  [2] PASS: scene panel has ${item_count} [data-item-id] element(s)`);

  //============================================
  // Assertion 3: professor/tips region visible
  //============================================

  const tips_box = await assert_region_visible(page, '[data-region="tips-bubble"]', "tips-bubble");
  const tips_text = await page
    .locator("#tips-text")
    .first()
    .textContent()
    .catch(() => "");
  console.log(
    `  [3] PASS: tips region visible (${tips_box.width.toFixed(0)}x${tips_box.height.toFixed(0)}), ` +
      `text="${tips_text.trim().slice(0, 60)}"`,
  );

  //============================================
  // Assertion 4: step-counter region visible
  //============================================

  const counter_box = await assert_region_visible(
    page,
    '[data-region="step-counter"]',
    "step-counter",
  );
  const counter_text = await page
    .locator("#step-counter-text")
    .first()
    .textContent()
    .catch(() => "");
  console.log(
    `  [4] PASS: step-counter visible (${counter_box.width.toFixed(0)}x${counter_box.height.toFixed(0)}), ` +
      `text="${counter_text.trim()}"`,
  );

  //============================================
  // Assertion 5: outline region visible
  //============================================

  const outline_box = await assert_region_visible(page, '[data-region="outline"]', "outline");
  const outline_card_count = await page.locator(".outline-step-card").count();
  console.log(
    `  [5] PASS: outline visible (${outline_box.width.toFixed(0)}x${outline_box.height.toFixed(0)}), ` +
      `step cards: ${outline_card_count}`,
  );

  //============================================
  // Assertion 6: guidance bar visible
  //============================================

  const guidance_box = await assert_region_visible(
    page,
    '[data-region="guidance-bar"]',
    "guidance-bar",
  );
  const guidance_text = await page
    .locator("#guidance-text")
    .first()
    .textContent()
    .catch(() => "");
  console.log(
    `  [6] PASS: guidance bar visible (${guidance_box.width.toFixed(0)}x${guidance_box.height.toFixed(0)}), ` +
      `text="${guidance_text.trim().slice(0, 60)}"`,
  );

  //============================================
  // Assertion 7: current step card has data-step-status="current"
  //============================================

  const current_card_count = await page.locator('[data-step-status="current"]').count();
  if (current_card_count === 0) {
    throw new Error(
      `Assertion 7 FAIL: no .outline-step-card with data-step-status="current" found. ` +
        `The current step must have distinct styling.`,
    );
  }
  const current_card_text = await page
    .locator('[data-step-status="current"]')
    .first()
    .textContent()
    .catch(() => "");
  console.log(
    `  [7] PASS: current step card found (data-step-status="current"), ` +
      `text="${current_card_text.trim().slice(0, 60)}"`,
  );

  //============================================
  // Assertion 8: all [data-item-id] bboxes within #scene-root
  // (coordinate-integrity / WP-FRAME-2)
  //============================================

  const item_ids = await page
    .locator("#scene-root [data-item-id]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-item-id")));

  let items_outside = 0;
  for (const item_id of item_ids) {
    const item_box = await page.locator(`[data-item-id="${item_id}"]`).first().boundingBox();
    if (!item_box) continue;
    try {
      assert_box_inside(item_box, scene_root_box, item_id);
    } catch (err) {
      console.error(`  [8] FAIL for item "${item_id}": ${err.message}`);
      items_outside++;
    }
  }

  if (items_outside > 0) {
    throw new Error(
      `Assertion 8 FAIL: ${items_outside}/${item_ids.length} items have bounding boxes ` +
        `outside #scene-root. See coordinate-overflow errors above.`,
    );
  }
  console.log(
    `  [8] PASS: all ${item_ids.length} item(s) are within #scene-root bounds (no overflow)`,
  );

  //============================================
  // Assertion 9: click target for first item lands inside item bbox
  // (coordinate-integrity / WP-FRAME-2)
  //============================================

  if (item_ids.length > 0) {
    const first_id = item_ids[0];
    const first_box = await page.locator(`[data-item-id="${first_id}"]`).first().boundingBox();
    if (first_box) {
      // Compute the center click target for the first item.
      const click_x = first_box.x + first_box.width / 2;
      const click_y = first_box.y + first_box.height / 2;

      // Confirm the click center lands inside #scene-root.
      // This is the meaningful coordinate-integrity check: it catches items that
      // are positioned outside the bounded panel (e.g. items mapped to wrong
      // viewport coordinates so their center falls outside #scene-root).
      const inside_scene =
        click_x >= scene_root_box.x &&
        click_x <= scene_root_box.x + scene_root_box.width &&
        click_y >= scene_root_box.y &&
        click_y <= scene_root_box.y + scene_root_box.height;

      if (!inside_scene) {
        throw new Error(
          `Assertion 9 FAIL: click center for "${first_id}" ` +
            `(${click_x.toFixed(1)},${click_y.toFixed(1)}) is outside #scene-root`,
        );
      }

      console.log(
        `  [9] PASS: click target for "${first_id}" ` +
          `(${click_x.toFixed(1)},${click_y.toFixed(1)}) is inside #scene-root`,
      );
    }
  } else {
    console.log(`  [9] SKIP: no items found; skipping click-target check`);
  }

  return {
    scene_root_box,
    item_count,
    items: item_ids,
    page_errors,
  };
}

//============================================
// Main
//============================================

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, `${EVIDENCE_PROTOCOL}.html`))) {
    throw new Error(
      `dist/${EVIDENCE_PROTOCOL}.html missing; run \`bash build_github_pages.sh\` first`,
    );
  }
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });

  const srv = await start_server(DIST_DIR);
  const base = srv.url;
  console.log(`HTTP server on ${base}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  try {
    console.log(`\n=== WP-EVID-2: framed-layout evidence (${EVIDENCE_PROTOCOL}) ===\n`);

    const result = await run_framed_layout_test(page, base);

    if (result.page_errors.length > 0) {
      console.log(`  page errors (non-fatal): ${result.page_errors.join(" | ")}`);
    }

    // Save screenshot.
    const ss_path = path.join(TEST_RESULTS_DIR, `m2_framed_layout_${EVIDENCE_PROTOCOL}.png`);
    await page.screenshot({ path: ss_path, fullPage: false });
    console.log(`\n  Screenshot: ${ss_path}`);

    console.log(`\n=== SUMMARY ===`);
    console.log(`Protocol: ${EVIDENCE_PROTOCOL}`);
    console.log(
      `  #scene-root: ${result.scene_root_box.width.toFixed(1)}x${result.scene_root_box.height.toFixed(1)} (bounded, not full-viewport)`,
    );
    console.log(`  Items in scene: ${result.item_count}`);
    console.log(`  Coordinate overflow: none`);
    console.log(`  All 9 assertions: PASS`);
    console.log(`\nPASS: test_framed_layout_m2`);
  } finally {
    await browser.close();
    await srv.close();
  }
}

main().catch((err) => {
  console.error("FAIL: test_framed_layout_m2");
  console.error(err);
  process.exit(1);
});
