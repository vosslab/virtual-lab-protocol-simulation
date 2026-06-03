// tests/playwright/test_subpart_well_plate_render.mjs
//
// M3 WP-SUBPART-RENDER browser acceptance (contract item 4, D11 spatial
// correspondence). Proves the GENERIC structured-subpart material-tint renderer
// paints each well by its own per-subpart material, through the PRODUCTION render
// path (runPipeline -> mountScene -> SceneView -> SceneItem ->
// SubpartVisualStateOverlay), driving state ONLY through the store's normal
// seed/write path (never hand-editing the DOM, never bypassing schema/enum
// validation).
//
// The harness mounts the REAL generated bench_basic scene (which places
// well_plate_96). The well subpart material_name enum is the closed sentinel
// FLOOR [empty, mixed]; runtime acceptance is registry-backed (D1, task #26), so
// the harness store carries a registry that registers carboplatin (#a719db). This
// test writes:
//   - mixed       -> the spec-fixed built-in color #686868 (painted)
//   - empty       -> null color -> fill "transparent" (no fill; base art shows)
//   - carboplatin -> a REGISTERED drug -> its scalar display_color #a719db, proving
//     the registry-backed write reaches a well AND renders the registry color, end
//     to end (this is the #26 drug-color render proof).
//
// Assertions (all by data-subpart-name, the spatial-correspondence handle):
//   1. exactly 96 [data-subpart-name] shapes render in the plate overlay.
//   2. BEFORE any write: every well renders fill="transparent" (all unseeded).
//   3. AFTER writes A1=mixed, A2=empty (explicit), H1=mixed (a second painted
//      well at a distant position), D6=carboplatin (a registered drug at a third
//      position): A1 paints #686868, H1 paints #686868, D6 paints #a719db (the
//      registered carboplatin color), A2 is transparent (explicitly emptied), H12
//      is transparent (never written). A1 and A2 therefore show DIFFERENT fills;
//      the painted wells sit at their correct grid positions, the rest transparent.
//   4. the overlay svg has pointer-events:none (base art stays clickable).
//   5. no page errors.
//
// Run: node tests/playwright/test_subpart_well_plate_render.mjs

import { chromium } from "playwright";
import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SHOT_DIR = path.join(REPO_ROOT, "test-results", "subpart_render");

const PLATE = "well_plate_96";
// The spec-fixed built-in color for the `mixed` sentinel (MATERIAL_CONVENTION.md).
const MIXED_COLOR = "#686868";
// The registered scalar display_color for carboplatin (generated/protocol_materials.ts
// + the harness registry). The drug-color render proof asserts a well painted this
// after a registry-backed carboplatin write.
const CARBOPLATIN_COLOR = "#a719db";
const TRANSPARENT = "transparent";

//============================================
// Build the harness bundle in-memory.
//============================================

async function build_harness() {
  const entry = path.join(__dirname, "_subpart_render_harness.tsx");
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "esm",
    target: "es2020",
    platform: "browser",
    sourcemap: false,
    plugins: [solidPlugin()],
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

//============================================
// Serve the bundle + a host page.
//============================================

function start_server(bundle_js) {
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><style>" +
    "#scene-root{position:relative;width:1200px;height:675px;background:#fff;}</style></head>" +
    "<body><div id='scene-root'></div>" +
    "<script type='module' src='/harness.js'></script></body></html>";
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split("?")[0];
      if (url === "/harness.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(bundle_js);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

//============================================
// Page-side helpers (serialized into the browser).
//============================================

// Read the fill attribute of one subpart shape by data-subpart-name. Runs in the
// page. Takes a single [plate, subpart] array because page.evaluate passes one
// serialized arg.
function read_fill_page(args) {
  const plate = args[0];
  const subpart = args[1];
  const root = document.getElementById("scene-root");
  const overlay = root.querySelector(`[data-subpart-overlay='${plate}']`);
  if (overlay === null) {
    return { present: false, fill: null, material: null };
  }
  const shape = overlay.querySelector(`[data-subpart-name='${subpart}']`);
  if (shape === null) {
    return { present: false, fill: null, material: null };
  }
  return {
    present: true,
    fill: shape.getAttribute("fill"),
    material: shape.getAttribute("data-material-name"),
  };
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const bundle = await build_harness();
  const { server, port } = await start_server(bundle);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
  const page_errors = [];
  page.on("pageerror", (e) => page_errors.push(e.message));

  let failed = false;
  try {
    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.__subpart_harness !== "undefined", {
      timeout: 5000,
    });

    // Mount the real bench_basic scene (places well_plate_96).
    await page.evaluate(() => window.__subpart_harness.mount());
    await page.waitForSelector(`#scene-root [data-subpart-overlay='${PLATE}']`, { timeout: 5000 });

    //----------------------------------------
    // 1. Exactly 96 subpart shapes render.
    //----------------------------------------
    const shape_count = await page.evaluate((plate) => {
      const root = document.getElementById("scene-root");
      const overlay = root.querySelector(`[data-subpart-overlay='${plate}']`);
      return overlay === null ? 0 : overlay.querySelectorAll("[data-subpart-name]").length;
    }, PLATE);
    assert.equal(
      shape_count,
      96,
      `plate overlay must render exactly 96 subpart shapes, got ${shape_count}`,
    );
    console.log(`  PASS  96 subpart shapes render (${shape_count})`);

    //----------------------------------------
    // 2. BEFORE any write: every well is transparent (all unseeded).
    //----------------------------------------
    const before_a1 = await page.evaluate(read_fill_page, [PLATE, "A1"]);
    const before_h12 = await page.evaluate(read_fill_page, [PLATE, "H12"]);
    assert.equal(before_a1.fill, TRANSPARENT, "A1 must be transparent before any write");
    assert.equal(before_h12.fill, TRANSPARENT, "H12 must be transparent before any write");
    console.log("  PASS  all wells transparent before any write");

    await page.screenshot({ path: path.join(SHOT_DIR, "before_writes.png") });

    //----------------------------------------
    // 3. Drive per-well state through the store's normal seed/write path.
    //    A1 = mixed (painted), A2 = empty (explicit), H1 = mixed (second painted
    //    well, distant position), H12 = left unset (transparent control).
    //----------------------------------------
    await page.evaluate(() => {
      const h = window.__subpart_harness;
      // A1: seed then write the `mixed` sentinel (the store accepts it).
      h.seed_subpart("A1");
      h.write_subpart("A1", { material_name: "mixed" });
      // A2: seed then write `empty` explicitly (a real write to the empty state).
      h.seed_subpart("A2");
      h.write_subpart("A2", { material_name: "empty" });
      // H1: seed then write `mixed` (a second painted well, bottom-left corner).
      h.seed_subpart("H1");
      h.write_subpart("H1", { material_name: "mixed" });
      // D6: seed then write `carboplatin`, a REGISTERED drug. This is the #26
      // proof: the registry-backed acceptance lets the drug write reach the well,
      // and the renderer paints carboplatin's registered display_color (#a719db).
      h.seed_subpart("D6");
      h.write_subpart("D6", { material_name: "carboplatin" });
      // H12: intentionally NOT seeded/written -> stays the unseeded transparent
      // control, proving an unwritten well renders no fill.
    });
    // Let Solid flush the reactive updates.
    await page.waitForTimeout(50);

    const a1 = await page.evaluate(read_fill_page, [PLATE, "A1"]);
    const a2 = await page.evaluate(read_fill_page, [PLATE, "A2"]);
    const h1 = await page.evaluate(read_fill_page, [PLATE, "H1"]);
    const d6 = await page.evaluate(read_fill_page, [PLATE, "D6"]);
    const h12 = await page.evaluate(read_fill_page, [PLATE, "H12"]);

    // A1 painted with the built-in mixed color; its data-material-name reflects it.
    assert.equal(
      a1.fill,
      MIXED_COLOR,
      `A1 must paint ${MIXED_COLOR} after mixed write, got ${a1.fill}`,
    );
    assert.equal(a1.material, "mixed", `A1 data-material-name must be "mixed", got ${a1.material}`);
    // H1 (a distant painted well) also paints the mixed color.
    assert.equal(
      h1.fill,
      MIXED_COLOR,
      `H1 must paint ${MIXED_COLOR} after mixed write, got ${h1.fill}`,
    );
    // D6 (a registered drug) paints carboplatin's registered scalar color, and
    // its data-material-name reflects the stored drug. This is the #26 proof:
    // the registry-backed subpart write reached the well AND renders the registry
    // color end to end.
    assert.equal(
      d6.fill,
      CARBOPLATIN_COLOR,
      `D6 must paint ${CARBOPLATIN_COLOR} after carboplatin write, got ${d6.fill}`,
    );
    assert.equal(
      d6.material,
      "carboplatin",
      `D6 data-material-name must be "carboplatin", got ${d6.material}`,
    );
    // A2 explicitly written empty -> transparent (different fill from A1).
    assert.equal(a2.fill, TRANSPARENT, `A2 must be transparent after empty write, got ${a2.fill}`);
    // A1 and A2 must differ (the core "two different fills" proof).
    assert.notEqual(a1.fill, a2.fill, "A1 and A2 must show DIFFERENT fills");
    // The drug well differs from both the built-in well and the empty control.
    assert.notEqual(d6.fill, a1.fill, "D6 (carboplatin) and A1 (mixed) must show DIFFERENT fills");
    assert.notEqual(d6.fill, a2.fill, "D6 (carboplatin) and A2 (empty) must show DIFFERENT fills");
    // H12 never written -> transparent control.
    assert.equal(h12.fill, TRANSPARENT, `H12 (unset) must be transparent, got ${h12.fill}`);
    console.log(
      `  PASS  spatial correspondence: A1=${a1.fill} A2=${a2.fill} H1=${h1.fill} ` +
        `D6=${d6.fill} H12=${h12.fill}`,
    );

    await page.screenshot({ path: path.join(SHOT_DIR, "after_writes.png") });

    //----------------------------------------
    // 4. Overlay does not intercept clicks (pointer-events: none).
    //----------------------------------------
    const pe = await page.evaluate((plate) => {
      const root = document.getElementById("scene-root");
      const overlay = root.querySelector(`[data-subpart-overlay='${plate}']`);
      return overlay === null ? null : getComputedStyle(overlay).pointerEvents;
    }, PLATE);
    assert.equal(pe, "none", `overlay must have pointer-events:none, got ${pe}`);
    console.log("  PASS  overlay pointer-events:none (base art stays clickable)");

    //----------------------------------------
    // 5. No page errors throughout.
    //----------------------------------------
    assert.equal(page_errors.length, 0, `no page errors: ${page_errors.join("; ")}`);
    console.log("  PASS  no page errors");
  } catch (err) {
    failed = true;
    console.error("  FAIL ", err.message);
  } finally {
    await browser.close();
    server.close();
  }

  if (failed) {
    console.log("\nFAIL: subpart well-plate render");
    process.exit(1);
  }
  console.log("\nPASS: subpart well-plate render");
  process.exit(0);
}

main().catch((err) => {
  console.error("test_subpart_well_plate_render error:", err);
  process.exit(1);
});
