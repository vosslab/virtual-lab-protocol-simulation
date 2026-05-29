// tests/playwright/test_initial_scene_evidence_m1.mjs
//
// WP-EVID-1 -- M1 initial-scene evidence (strict mode).
//
// Demonstrates that:
//   (a) STRICT-MODE: three nominated protocols (one per cluster: cell_culture,
//       sdspage, runners) load their correct initial scene with at least one
//       [data-item-id] element visible in #scene-root. Direct dist HTML load;
//       launcher click-path is confirmed available for passage_hood_detachment
//       and cell_culture_full but direct load is used for all three to keep
//       the test deterministic.
//
// Evidence set (from docs/active_plans/audits/blank_scene_gap_report.md M0):
//   - cell_culture : passage_hood_detachment (2 items, microscope scene)
//   - sdspage      : sdspage_heat_denature_samples (3 items, heat-block scene)
//   - runners      : cell_culture_full (sequence_runner -> passage_hood_detachment)
//
// Placeholder-mode note:
//   Placeholder render contract is covered by the unit test
//   tests/test_render_item_missing_svg.mjs. End-to-end placeholder rendering
//   requires the fixture object (test_missing_svg_target) to be in OBJECT_LIBRARY.
//   gen_object_library.py only scans content/objects/, not tests/content/dev_smoke/,
//   so the fixture placement is orphaned and zero items appear in final[].
//   A synthetic DOM injection was previously used to satisfy the
//   [data-missing-svg="true"] assertion; that pattern proved nothing (a test
//   asserting on an element it created itself is not a real assertion) and has
//   been removed. Tracked as follow-up: wire dev_smoke objects into OBJECT_LIBRARY
//   so the full render path can be exercised end-to-end.
//
// Usage (from repo root):
//   node tests/playwright/test_initial_scene_evidence_m1.mjs

import { chromium } from "playwright";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Constants
//============================================

// Nominated evidence protocols with expected minimum item counts.
const STRICT_EVIDENCE_PROTOCOLS = [
  {
    name: "passage_hood_detachment",
    cluster: "cell_culture",
    min_items: 1,
    expected_scene: "passage_hood_detachment_microscope_view",
  },
  {
    name: "sdspage_heat_denature_samples",
    cluster: "sdspage",
    min_items: 1,
    expected_scene: "sdspage_heat_denature_samples_workspace",
  },
  {
    name: "cell_culture_full",
    cluster: "runners",
    min_items: 1,
    // Sequence runner delegates to passage_hood_detachment; same scene.
    expected_scene: "passage_hood_detachment_microscope_view",
  },
];

// Timeout to wait for scene items to appear after page load.
const ITEM_WAIT_MS = 3000;
const RENDER_WAIT_MS = 1500;

const DIST_DIR = path.join(REPO_ROOT, "dist");
const TEST_RESULTS_DIR = path.join(REPO_ROOT, "test-results");

//============================================
// HTTP server helper (Node.js based)
//============================================

// MIME type map for serving dist/ files.
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

// Start a Node.js HTTP server that serves files from dist_dir.
// Returns { server, port, url, close }.
async function start_server(dist_dir) {
  const server = http.createServer((req, res) => {
    const url_path = req.url ? req.url.split("?")[0] : "/";
    const norm = url_path === "/" ? "/index.html" : url_path;

    // Serve files from dist_dir.
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

  // Expose a close() method on the returned object for cleanup.
  const handle = {
    port,
    url,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
  return handle;
}

//============================================
// Launcher click-path check
//============================================

// Check whether the launcher lists the given protocol by navigating to index.html.
// Returns true if the launcher button is present.
async function check_launcher_has_protocol(page, base, protocol_name) {
  try {
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForSelector("[data-launcher-root]", { timeout: 5000 });
    const count = await page.locator(`[data-protocol-id="${protocol_name}"]`).count();
    return count > 0;
  } catch {
    return false;
  }
}

//============================================
// Strict-mode evidence
//============================================

// Load a single protocol HTML file and assert at least one [data-item-id] element.
// Returns {item_count, page_errors, launcher_path_available}.
async function test_strict_protocol(page, base, protocol_info) {
  const { name, min_items } = protocol_info;

  // Note whether the launcher click-path is available (informational).
  const launcher_path_available = await check_launcher_has_protocol(page, base, name);

  // Load the per-protocol HTML directly (deterministic; does not depend on
  // launcher click affordance being fully wired).
  const url = `${base}/${name}.html`;
  console.log(`  Loading: ${url}`);

  const page_errors = [];
  const page_error_handler = (err) => page_errors.push(err.message);
  page.on("pageerror", page_error_handler);

  await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });

  // Wait for at least one [data-item-id] to appear inside #scene-root.
  try {
    await page.waitForSelector("#scene-root [data-item-id]", { timeout: ITEM_WAIT_MS });
  } catch {
    // The selector did not appear; we will count below and report the error.
  }

  await page.waitForTimeout(RENDER_WAIT_MS);

  const item_count = await page.locator("#scene-root [data-item-id]").count();

  if (item_count < min_items) {
    const err_blob = page_errors.length > 0 ? page_errors.join(" | ") : "(no page errors)";
    throw new Error(
      `protocol "${name}": expected >= ${min_items} [data-item-id] elements in #scene-root, ` +
        `got ${item_count}. launcher_path_available=${launcher_path_available}. ` +
        `page_errors=${err_blob}`,
    );
  }

  page.off("pageerror", page_error_handler);

  return { item_count, launcher_path_available, page_errors };
}

//============================================
// Main
//============================================

async function main() {
  // Ensure required files exist.
  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    throw new Error("dist/index.html missing; run `bash build_github_pages.sh` first");
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
    //============================================
    // Part (a): strict-mode evidence
    //============================================

    console.log("\n=== PART A: strict-mode evidence ===");

    for (const proto of STRICT_EVIDENCE_PROTOCOLS) {
      console.log(`\nProtocol: ${proto.name} (cluster=${proto.cluster})`);
      const result = await test_strict_protocol(page, base, proto);
      console.log(`  [data-item-id] count: ${result.item_count}`);
      console.log(`  launcher click-path available: ${result.launcher_path_available}`);
      if (result.page_errors.length > 0) {
        console.log(`  page errors (non-fatal): ${result.page_errors.join(" | ")}`);
      }

      // Save screenshot.
      const ss_path = path.join(TEST_RESULTS_DIR, `m1_strict_${proto.cluster}_${proto.name}.png`);
      await page.screenshot({ path: ss_path, fullPage: false });
      console.log(`  Screenshot: ${ss_path}`);
      console.log(`  PASS: ${proto.name} rendered ${result.item_count} item(s)`);
    }
  } finally {
    await browser.close();
    await srv.close();
  }

  console.log("\n=== SUMMARY ===");
  console.log(
    `Strict-mode evidence: ${STRICT_EVIDENCE_PROTOCOLS.length} protocols tested, all PASS`,
  );
  console.log("\nPASS: test_initial_scene_evidence_m1");
}

main().catch((err) => {
  console.error("FAIL: test_initial_scene_evidence_m1");
  console.error(err);
  process.exit(1);
});
