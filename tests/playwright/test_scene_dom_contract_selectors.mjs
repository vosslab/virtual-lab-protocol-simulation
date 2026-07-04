// tests/playwright/test_scene_dom_contract_selectors.mjs
//
// Scene DOM contract selector tests (WS-M1-T).
//
// Asserts contractual data-* attributes on the current renderer output.
// Tests the CONTRACTUAL selectors (frozen as interface):
//   - data-item-id        (walker-addressable identity; present ONLY when the
//                          object's declared capabilities include "clickable",
//                          per M6 "Enforce capabilities in renderer and
//                          candidate enumeration")
//   - data-object-name    (object YAML name)
//   - data-placement-name (scene placement key)
//   - data-zone           (zone name)
//   - data-kind           (object kind enum)
//   - data-depth          (depth tier enum; conditionally present)
//   - data-asset          (asset registry key)
//   - data-missing-svg    (present only on missing-svg placeholders)
//   - data-label          (present on every label element)
//   - data-label-for      (ties label to placement_name)
//
// INCIDENTAL (not tested here, change freely without breaking contract):
//   - Internal wrapper div nesting depth
//   - CSS class names on item divs
//   - Style properties other than position (left/top/width/height)
//   - z-index values
//   - Internal SVG structure below the top-level <svg> element
//
// This test uses bench_basic as the canonical scene for selector coverage.
// It then spot-checks one protocol scene (hood_workspace) for multi-scene coverage.
//
// Click-target behavior: asserts that a [data-item-id] element receives synthetic
// click events dispatched via Playwright's page.dispatchEvent, not that a
// protocol step advances (scene operations are stubbed).
//
// Usage:
//   node tests/playwright/test_scene_dom_contract_selectors.mjs
//
// Requires: built dist/ and a running or launchable HTTP server.

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");
const DIST_DIR = path.join(REPO_ROOT, "dist");

//============================================
// Closed enum sets (contractual)
//============================================

const VALID_KINDS = new Set([
  "bottle",
  "equipment",
  "plate",
  "tube",
  "decoration",
  "pipette",
  "rack",
  "waste",
  "flask",
]);

const VALID_DEPTHS = new Set(["back", "mid", "front"]);

//============================================
// HTTP server (reused from scene_to_png pattern)
//============================================

function startServer(distDir) {
  const mimeMap = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".map": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".woff2": "font/woff2",
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url ? req.url.split("?")[0] : "/";
      const norm = urlPath === "/" ? "/index.html" : urlPath;
      const filePath = path.join(distDir, norm);
      const ext = path.extname(filePath);
      const contentType = mimeMap[ext] ?? "application/octet-stream";

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(`Not found: ${norm}`);
          return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
    server.on("error", reject);
  });
}

//============================================
// Load a scene via the scene_viewer
//============================================

async function loadScene(page, baseUrl, sceneName) {
  const url = `${baseUrl}/scene_viewer.html?scene=${encodeURIComponent(sceneName)}`;
  await page.goto(url, { waitUntil: "load", timeout: 12000 });
  // Wait for the viewer-ready marker.
  await page.waitForSelector("#scene-root[data-viewer-ready='true']", { timeout: 5000 });
  // Small settle for post-ready DOM paint.
  await new Promise((r) => setTimeout(r, 120));
}

//============================================
// Assertion helpers
//============================================

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    failures.push(message);
    console.log(`  FAIL: ${message}`);
  }
}

function assertEq(actual, expected, message) {
  assert(
    actual === expected,
    `${message}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
  );
}

function assertGt(actual, threshold, message) {
  assert(actual > threshold, `${message}: expected > ${threshold} got ${actual}`);
}

//============================================
// Core selector contract test for one scene
//============================================

async function testSceneSelectorContract(page, sceneName) {
  console.log(`\n--- scene: ${sceneName} ---`);

  // Collect all rendered items via DOM query.
  const items = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-placement-name]"));
    return els.map((el) => {
      const rect = el.getBoundingClientRect();
      const svgEl = el.querySelector("svg");
      return {
        placementName: el.getAttribute("data-placement-name"),
        objectName: el.getAttribute("data-object-name"),
        itemId: el.getAttribute("data-item-id"),
        zone: el.getAttribute("data-zone"),
        kind: el.getAttribute("data-kind"),
        depth: el.getAttribute("data-depth"),
        asset: el.getAttribute("data-asset"),
        missingSvg: el.getAttribute("data-missing-svg"),
        hasSvg: svgEl !== null,
        rectW: rect.width,
        rectH: rect.height,
      };
    });
  });

  assertGt(items.length, 0, `${sceneName}: at least one rendered item`);

  // Collect all label elements.
  const labels = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-label]"));
    return els.map((el) => ({
      labelFor: el.getAttribute("data-label-for"),
      hasText: (el.textContent ?? "").trim().length > 0,
      isPresent: true,
    }));
  });

  // Build placement name set for cross-reference.
  const placementNameSet = new Set(items.map((item) => item.placementName));

  // Per-item attribute assertions.
  for (const item of items) {
    const id = item.placementName ?? "(no-placement-name)";

    // data-placement-name: present and non-empty.
    assert(
      typeof item.placementName === "string" && item.placementName.length > 0,
      `${sceneName}[${id}]: data-placement-name non-empty`,
    );

    // data-item-id: when present, non-empty (walker-addressable identity).
    // Absent entirely on a non-clickable item (decoration_only capability, or
    // a missing-object placeholder bound with capabilities: []) -- see M6
    // "Enforce capabilities in renderer and candidate enumeration".
    if (item.itemId !== null) {
      assert(
        typeof item.itemId === "string" && item.itemId.length > 0,
        `${sceneName}[${id}]: data-item-id non-empty when present`,
      );
    }

    // data-object-name: present and non-empty.
    assert(
      typeof item.objectName === "string" && item.objectName.length > 0,
      `${sceneName}[${id}]: data-object-name non-empty`,
    );

    // data-zone: present and non-empty.
    assert(
      typeof item.zone === "string" && item.zone.length > 0,
      `${sceneName}[${id}]: data-zone non-empty`,
    );

    // data-kind: present, non-empty, in closed enum.
    assert(
      typeof item.kind === "string" && VALID_KINDS.has(item.kind),
      `${sceneName}[${id}]: data-kind in closed enum (got "${item.kind}")`,
    );

    // data-depth: when present, in closed enum.
    if (item.depth !== null) {
      assert(
        VALID_DEPTHS.has(item.depth),
        `${sceneName}[${id}]: data-depth in closed enum when present (got "${item.depth}")`,
      );
    }

    // data-asset: present and non-empty on all items.
    assert(
      typeof item.asset === "string" && item.asset.length > 0,
      `${sceneName}[${id}]: data-asset non-empty`,
    );

    // data-missing-svg: only present on placeholder items.
    // Normal items (hasSvg === true, missingSvg === null) satisfy the contract.
    // Placeholder items may have data-missing-svg="true".
    if (item.missingSvg !== null) {
      assertEq(item.missingSvg, "true", `${sceneName}[${id}]: data-missing-svg value when present`);
    }
  }

  // Label contract assertions.
  assertGt(labels.length, 0, `${sceneName}: at least one label`);
  for (const label of labels) {
    // data-label attribute is present (asserted by querySelectorAll above).
    // data-label-for must reference a real placement name.
    assert(
      label.labelFor !== null && placementNameSet.has(label.labelFor),
      `${sceneName}: data-label-for="${label.labelFor}" references a known placement`,
    );
    // Label element has visible text content.
    assert(label.hasText, `${sceneName}: label[for=${label.labelFor}] has text content`);
  }

  console.log(`  items: ${items.length}, labels: ${labels.length}`);
}

//============================================
// Click-target behavior test
//============================================

async function testClickTargetBehavior(page, sceneName) {
  console.log(`\n--- click-target behavior: ${sceneName} ---`);

  // Collect item IDs.
  const itemIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-item-id]"))
      .map((el) => el.getAttribute("data-item-id"))
      .filter((id) => id !== null && id.length > 0);
  });

  assertGt(itemIds.length, 0, `${sceneName}: items with data-item-id present for click tests`);

  // Verify that a click on [data-item-id] elements is receivable.
  // We install a click recorder, dispatch a synthetic click, and check it fired.
  const firstId = itemIds[0];
  const clickReceived = await page.evaluate((itemId) => {
    const el = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!el) return false;
    let clicked = false;
    const handler = () => {
      clicked = true;
    };
    el.addEventListener("click", handler, { once: true });
    // Dispatch a real click event (not a Playwright click, to stay in-page).
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return clicked;
  }, firstId);

  assert(clickReceived, `${sceneName}: [data-item-id="${firstId}"] receives click events`);
}

//============================================
// Main
//============================================

async function main() {
  console.log("Scene DOM contract selector tests (WS-M1-T)");

  if (!fs.existsSync(path.join(DIST_DIR, "scene_viewer.html"))) {
    console.error("dist/scene_viewer.html not found. Run: bash build_github_pages.sh");
    process.exit(1);
  }

  const server = await startServer(DIST_DIR);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Suppress expected console noise from scene operations stubs.
  page.on("console", () => {});

  try {
    // Test 1: bench_basic -- contractual attribute coverage.
    await loadScene(page, server.baseUrl, "bench_basic");
    await testSceneSelectorContract(page, "bench_basic");
    await testClickTargetBehavior(page, "bench_basic");

    // Test 2: hood_workspace -- multi-scene spot-check.
    await loadScene(page, server.baseUrl, "hood_workspace");
    await testSceneSelectorContract(page, "hood_workspace");

    // Test 3: missing_svg_check -- placeholder attribute contract.
    // This scene intentionally contains missing-svg placeholders; verify the
    // data-missing-svg attribute is correctly set on placeholder items.
    await loadScene(page, server.baseUrl, "missing_svg_check");
    const missingItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[data-missing-svg='true']")).map((el) => ({
        placementName: el.getAttribute("data-placement-name") ?? "",
        missingSvg: el.getAttribute("data-missing-svg"),
        placeholderKind: el.getAttribute("data-placeholder-kind"),
      }));
    });
    // The scene should have at least one placeholder item.
    assertGt(
      missingItems.length,
      0,
      "missing_svg_check: at least one [data-missing-svg='true'] element",
    );
    for (const item of missingItems) {
      assertEq(
        item.missingSvg,
        "true",
        `missing_svg_check[${item.placementName}]: data-missing-svg="true"`,
      );
      // data-placeholder-kind must be present on placeholder items.
      assert(
        item.placeholderKind !== null && item.placeholderKind.length > 0,
        `missing_svg_check[${item.placementName}]: data-placeholder-kind present`,
      );
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`\n--- Summary ---`);
  console.log(`  passed: ${passCount}`);
  console.log(`  failed: ${failCount}`);

  if (failCount > 0) {
    console.log("\n--- Failures ---");
    for (const f of failures) {
      console.log(`  FAIL: ${f}`);
    }
    console.log("\nFAIL: scene DOM contract selector tests");
    process.exit(1);
  } else {
    console.log("\nPASS: scene DOM contract selector tests");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("test_scene_dom_contract_selectors error:", err);
  process.exit(1);
});
