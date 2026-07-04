// tests/playwright/test_scene_degrade.mjs
//
// Browser regression test for the fail-loud degrade path (FIX 3 audit fix),
// exercised THROUGH THE PRODUCTION RENDER PATH (mountScene -> SceneView ->
// SceneItem).
//
// Background: the Solid renderer's SceneItem component was changed so a
// visual_state RESOLVER FAILURE no longer silently returns null. When
// resolve_visual_state throws (e.g. an unknown formula token), SceneItem:
//   - console.warns loud,
//   - stamps data-resolver-degraded="<message>" on the item node,
//   - notifies SceneView, which sets data-scene-degraded="true" on the scene
//     root ON FIRST RENDER (ordering-independent; no closest()/onMount race),
//   - degrades to the item's bound asset (renders SOMETHING, never blank).
//
// Ordering history: the old harness mounted bare SceneItem nodes and manually
// stamped data-scene-root before rendering. That masked the SceneView onMount
// vs child-effect ordering this test is meant to verify. The harness now mounts
// a hand-built clean PipelineResult through the SAME mountScene + SceneView used
// in production, with ZERO structural violations, so a data-scene-degraded can
// only come from the resolver-promotion path -- and the FIRST-RENDER assertion
// below proves it lands without any state write.
//
// The harness (helper_degrade_harness.tsx) injects two synthetic objects into
// OBJECT_LIBRARY at runtime:
//   - test_degrade_obj: valid state_schema but unknown formula token ("badtoken")
//     that causes parse_formula_expr to throw.
//   - test_happy_obj: valid state_schema AND well-formed fill_height formula
//     that resolves cleanly.
//
// Assertions:
//   FIRST RENDER: immediately after mount() returns (no state write, no settle),
//     the scene root already carries data-scene-degraded="true" and the degrade
//     item already carries data-resolver-degraded.
//   DEGRADE path: item renders (not removed), carries data-resolver-degraded,
//     scene root carries data-scene-degraded="true", with NO structural
//     violation marker (data-degraded-violation-count absent).
//   HAPPY path:   item renders, does NOT carry data-resolver-degraded.
//
// Run: node tests/playwright/test_scene_degrade.mjs

import { chromium } from "playwright";
import * as esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

//============================================
// Build the degrade harness bundle in-memory.
//============================================

async function build_harness() {
  const entry = path.join(__dirname, "helper_degrade_harness.tsx");
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
  // #scene-root is the scene mount container. mountScene renders SceneView into
  // it; SceneView stamps data-scene-root and reactively owns data-scene-degraded.
  // Sized 1200x675 to match the viewport the harness passes to mountScene so the
  // aspect structural guard stays clean.
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><style>" +
    "#scene-root{position:relative;width:1200px;height:675px;}" +
    "</style></head><body>" +
    "<div id='scene-root'></div>" +
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
// Main test driver.
//============================================

async function main() {
  const bundle = await build_harness();
  const { server, port } = await start_server(bundle);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });

  // Collect page-level errors (uncaught exceptions). Resolver warnings go to
  // console.warn which does NOT trigger pageerror; we capture those separately.
  const page_errors = [];
  page.on("pageerror", (e) => page_errors.push(e.message));

  // Capture console.warn so we can assert the warn was emitted.
  const console_warns = [];
  page.on("console", (msg) => {
    if (msg.type() === "warning") {
      console_warns.push(msg.text());
    }
  });

  let failed = false;
  try {
    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.__degrade_harness !== "undefined", {
      timeout: 5000,
    });

    //----------------------------------------
    // FIRST-RENDER assertions.
    //----------------------------------------
    // Mount through production mountScene and capture the DOM state SYNCHRONOUSLY
    // in the same evaluate, right after mount() returns: no state write, no
    // settle timeout. This proves the scene-degraded marker lands on FIRST
    // render via the SceneView-owned reactive path, not only after a later state
    // change (the regression the old harness could not catch).
    const first_render = await page.evaluate((name) => {
      window.__degrade_harness.mount();
      const root = document.getElementById("scene-root");
      const item = document.querySelector(`[data-item-id="${name}"]`);
      return {
        sceneDegraded: root ? root.getAttribute("data-scene-degraded") : null,
        violationCount: root ? root.getAttribute("data-degraded-violation-count") : null,
        sceneRoot: root ? root.getAttribute("data-scene-root") : null,
        itemDegraded: item ? item.getAttribute("data-resolver-degraded") : null,
        itemExists: item !== null,
      };
    }, "test_degrade_obj");

    assert.ok(first_render.itemExists, "FIRST-RENDER: degrade item must be present");
    assert.equal(
      first_render.sceneRoot,
      "true",
      `FIRST-RENDER: scene root must carry data-scene-root="true"; got: ${first_render.sceneRoot}`,
    );
    assert.equal(
      first_render.violationCount,
      null,
      `FIRST-RENDER: scene must have NO structural violations (clean harness scene); got data-degraded-violation-count=${first_render.violationCount}`,
    );
    assert.ok(
      first_render.itemDegraded !== null && first_render.itemDegraded.length > 0,
      `FIRST-RENDER: degrade item must carry data-resolver-degraded on first render; got: ${first_render.itemDegraded}`,
    );
    assert.equal(
      first_render.sceneDegraded,
      "true",
      `FIRST-RENDER: scene root must carry data-scene-degraded="true" on FIRST render via the resolver-promotion path (ordering-independent); got: ${first_render.sceneDegraded}`,
    );
    console.log(
      '  PASS  FIRST-RENDER scene root carries data-scene-degraded="true" with no structural violation (resolver-promotion path, no state write)',
    );

    // Allow Solid to flush effects, then re-assert the steady state below.
    await page.waitForTimeout(100);

    //----------------------------------------
    // DEGRADE path assertions.
    //----------------------------------------
    // 1. The degrade item still renders its bound asset (NOT blank / not removed).
    const degrade_state = await page.evaluate((name) => {
      const item = document.querySelector(`[data-item-id="${name}"]`);
      if (!item) {
        return { exists: false, hasSvg: false, degradedAttr: null, assetAttr: null };
      }
      const svg = item.querySelector("svg");
      return {
        exists: true,
        // Check that the item has DOM children: the SvgHost div should be present.
        // The Show(when=asset_name) always has a truthy string (the bound asset),
        // so an <svg> should be injected via injectSvgFromManifest.
        hasSvg: svg !== null,
        degradedAttr: item.getAttribute("data-resolver-degraded"),
        assetAttr: item.getAttribute("data-asset"),
      };
    }, "test_degrade_obj");

    assert.ok(degrade_state.exists, "DEGRADE: item must be present in the DOM (not removed)");
    assert.ok(
      degrade_state.degradedAttr !== null && degrade_state.degradedAttr.length > 0,
      `DEGRADE: item must carry data-resolver-degraded with a message; got: ${degrade_state.degradedAttr}`,
    );
    assert.ok(
      degrade_state.assetAttr !== null && degrade_state.assetAttr.length > 0,
      "DEGRADE: item must carry data-asset (bound asset, not blank)",
    );
    console.log(
      `  PASS  DEGRADE item present, data-resolver-degraded="${degrade_state.degradedAttr}"`,
    );

    // 2. The item's bound asset is actually rendered (SVG injected).
    assert.ok(
      degrade_state.hasSvg,
      "DEGRADE: item must render its bound asset SVG (never blank); no <svg> found",
    );
    console.log("  PASS  DEGRADE item renders its bound asset SVG (not blank)");

    // 3. The scene root carries data-scene-degraded="true".
    const scene_degraded = await page.evaluate(() => {
      const root = document.getElementById("scene-root");
      return root ? root.getAttribute("data-scene-degraded") : null;
    });
    assert.equal(
      scene_degraded,
      "true",
      `DEGRADE: [data-scene-root] must carry data-scene-degraded="true"; got: ${scene_degraded}`,
    );
    console.log('  PASS  DEGRADE scene root carries data-scene-degraded="true"');

    // 4. A console.warn was emitted for the resolver failure.
    const warn_for_degrade = console_warns.some(
      (w) => w.includes("test_degrade_obj") && w.includes("degraded"),
    );
    assert.ok(
      warn_for_degrade,
      `DEGRADE: expected a console.warn mentioning "test_degrade_obj" and "degraded"; got: ${JSON.stringify(console_warns)}`,
    );
    console.log("  PASS  DEGRADE console.warn emitted for resolver failure");

    //----------------------------------------
    // HAPPY path assertions.
    //----------------------------------------
    // 5. The happy item renders without any degrade marker.
    const happy_state = await page.evaluate((name) => {
      const item = document.querySelector(`[data-item-id="${name}"]`);
      if (!item) {
        return { exists: false, degradedAttr: null, assetAttr: null };
      }
      return {
        exists: true,
        degradedAttr: item.getAttribute("data-resolver-degraded"),
        assetAttr: item.getAttribute("data-asset"),
      };
    }, "test_happy_obj");

    assert.ok(happy_state.exists, "HAPPY: item must be present in the DOM");
    assert.equal(
      happy_state.degradedAttr,
      null,
      `HAPPY: item must NOT carry data-resolver-degraded; got: ${happy_state.degradedAttr}`,
    );
    assert.ok(
      happy_state.assetAttr !== null && happy_state.assetAttr.length > 0,
      "HAPPY: item must carry data-asset",
    );
    console.log(
      "  PASS  HAPPY item present, no data-resolver-degraded (marker is failure-specific)",
    );

    //----------------------------------------
    // Screenshot evidence (captured BEFORE dispose so it shows the rendered,
    // degraded-but-not-blank scene).
    //----------------------------------------
    await page.screenshot({ path: "test-results/test_scene_degrade.png" });
    console.log("  INFO  screenshot saved to test-results/test_scene_degrade.png");

    //----------------------------------------
    // Dispose clears the degraded marker (no stale leak across SceneChange).
    //----------------------------------------
    // Disposing the mounted scene must remove data-scene-degraded and
    // data-scene-root from the root so the next scene does not inherit a stale
    // degrade marker.
    const after_dispose = await page.evaluate(() => {
      window.__degrade_harness.dispose();
      const root = document.getElementById("scene-root");
      return {
        sceneDegraded: root ? root.getAttribute("data-scene-degraded") : null,
        sceneRoot: root ? root.getAttribute("data-scene-root") : null,
        childCount: root ? root.children.length : -1,
      };
    });
    assert.equal(
      after_dispose.sceneDegraded,
      null,
      `DISPOSE: data-scene-degraded must be cleared; got: ${after_dispose.sceneDegraded}`,
    );
    assert.equal(
      after_dispose.sceneRoot,
      null,
      `DISPOSE: data-scene-root must be cleared; got: ${after_dispose.sceneRoot}`,
    );
    assert.equal(
      after_dispose.childCount,
      0,
      `DISPOSE: scene root must have no orphan children; got: ${after_dispose.childCount}`,
    );
    console.log("  PASS  DISPOSE clears data-scene-degraded + data-scene-root, no orphan nodes");

    //----------------------------------------
    // No unexpected page errors.
    //----------------------------------------
    // Resolver failures go to console.warn, NOT to pageerror; so page_errors
    // must be empty.
    assert.equal(page_errors.length, 0, `unexpected page errors: ${page_errors.join("; ")}`);
    console.log("  PASS  no unexpected page errors");
  } catch (err) {
    failed = true;
    console.error("  FAIL ", err.message);
    // Save a failure screenshot for inspection.
    try {
      await page.screenshot({ path: "test-results/test_scene_degrade_fail.png" });
    } catch (_) {
      // ignore screenshot errors in failure handling
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failed) {
    console.log("\nFAIL: scene degrade DOM contract");
    process.exit(1);
  }
  console.log("\nPASS: scene degrade DOM contract");
  process.exit(0);
}

main().catch((err) => {
  console.error("test_scene_degrade error:", err);
  process.exit(1);
});
