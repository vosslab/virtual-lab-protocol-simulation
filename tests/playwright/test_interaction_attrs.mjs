// Interaction attributes audit for M2b renderer output.
// Verifies that bench_basic render emits all six data-* attributes:
// data-placement-name, data-object-name, data-zone, data-kind, data-depth, data-target-id.

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DIST_DIR = path.join(REPO_ROOT, "dist");

//============================================
// HTTP server for local testing
//============================================

import fs from "node:fs/promises";

function startLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      let filePath = path.join(DIST_DIR, req.url === "/" ? "index.html" : req.url);
      const ext = path.extname(filePath);
      let contentType = "text/html";
      if (ext === ".js") contentType = "application/javascript";
      if (ext === ".css") contentType = "text/css";
      if (ext === ".map") contentType = "application/json";

      try {
        const content = await fs.readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}

//============================================
// Closed enum validation
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
// Test runner
//============================================

async function main() {
  console.log(`[F1] Starting interaction attributes audit`);

  // Start local HTTP server for dist/
  console.log(`[F1] Starting local HTTP server for dist/...`);
  const { server, url } = await startLocalServer();
  console.log(`[F1] URL: ${url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });

  // Listen for console and page errors
  const consoleLogs = [];
  page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.toString()));

  try {
    await page.goto(url);
    console.log(`[F1] Page loaded successfully`);

    // Wait for scene root to exist
    await page.waitForSelector("#scene-root", { timeout: 3000 });
    console.log(`[F1] Scene root element detected`);

    // Give JavaScript time to execute and render items
    await page.waitForTimeout(2000);

    // Wait for any placement items to render (with longer timeout and no visibility check)
    const itemCount = await page.locator("#scene-root [data-placement-name]").count();

    if (itemCount === 0) {
      console.error(`[F1] No items found with data-placement-name. Checking DOM structure...`);
      const sceneRootHtml = await page.locator("#scene-root").innerHTML();
      if (sceneRootHtml.length < 200) {
        console.error(`[F1] Scene root HTML: ${sceneRootHtml}`);
      } else {
        console.error(
          `[F1] Scene root has content (${sceneRootHtml.length} chars), but no data-placement-name attributes`,
        );
      }

      // Check for JavaScript errors
      const errors = await page.evaluate(() => {
        return window.__errors || [];
      });
      if (errors.length > 0) {
        console.error(`[F1] JavaScript errors: ${JSON.stringify(errors)}`);
      }

      if (consoleLogs.length > 0) {
        console.error(`[F1] Console logs:`);
        consoleLogs.forEach((log) => console.error(`     ${log}`));
      }
      if (pageErrors.length > 0) {
        console.error(`[F1] Page errors:`);
        pageErrors.forEach((err) => console.error(`     ${err}`));
      }

      throw new Error("No items rendered in scene-root. Check build and JavaScript execution.");
    }
    console.log(`[F1] Scene root with ${itemCount} placements detected`);

    // Collect all placement elements
    const elements = await page.locator("#scene-root [data-placement-name]").all();

    console.log(`[F1] Found ${elements.length} items with data-placement-name`);

    let passCount = 0;
    let failCount = 0;
    const failures = [];

    // Audit each element
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const placementName = await el.getAttribute("data-placement-name");
      const objectName = await el.getAttribute("data-object-name");
      const zone = await el.getAttribute("data-zone");
      const kind = await el.getAttribute("data-kind");
      const depth = await el.getAttribute("data-depth");
      const targetId = await el.getAttribute("data-target-id");

      const itemId = placementName || `item[${i}]`;

      // Validate each attribute
      const checks = [];

      // Check 1: data-placement-name is non-empty
      if (!placementName || placementName.trim() === "") {
        checks.push({
          attr: "data-placement-name",
          result: "FAIL",
          reason: "empty or missing",
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-placement-name",
          result: "PASS",
          value: placementName,
        });
        passCount++;
      }

      // Check 2: data-object-name is non-empty
      if (!objectName || objectName.trim() === "") {
        checks.push({
          attr: "data-object-name",
          result: "FAIL",
          reason: "empty or missing",
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-object-name",
          result: "PASS",
          value: objectName,
        });
        passCount++;
      }

      // Check 3: data-zone is non-empty
      if (!zone || zone.trim() === "") {
        checks.push({
          attr: "data-zone",
          result: "FAIL",
          reason: "empty or missing",
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-zone",
          result: "PASS",
          value: zone,
        });
        passCount++;
      }

      // Check 4: data-kind is non-empty and in closed enum
      if (!kind || kind.trim() === "") {
        checks.push({
          attr: "data-kind",
          result: "FAIL",
          reason: "empty or missing",
        });
        failCount++;
      } else if (!VALID_KINDS.has(kind)) {
        checks.push({
          attr: "data-kind",
          result: "FAIL",
          reason: `invalid enum value: '${kind}'`,
          valid_values: Array.from(VALID_KINDS),
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-kind",
          result: "PASS",
          value: kind,
        });
        passCount++;
      }

      // Check 5: data-depth is non-empty and in closed enum (if present)
      if (!depth) {
        checks.push({
          attr: "data-depth",
          result: "FAIL",
          reason: "missing (required in M2b)",
        });
        failCount++;
      } else if (!VALID_DEPTHS.has(depth)) {
        checks.push({
          attr: "data-depth",
          result: "FAIL",
          reason: `invalid enum value: '${depth}'`,
          valid_values: Array.from(VALID_DEPTHS),
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-depth",
          result: "PASS",
          value: depth,
        });
        passCount++;
      }

      // Check 6: data-target-id is present (may be empty string in M2b)
      if (targetId === null || targetId === undefined) {
        checks.push({
          attr: "data-target-id",
          result: "FAIL",
          reason: "attribute missing (reserved for M3)",
        });
        failCount++;
      } else {
        checks.push({
          attr: "data-target-id",
          result: "PASS",
          value: targetId === "" ? "(empty, reserved for M3)" : targetId,
        });
        passCount++;
      }

      // Log item result
      console.log(`\n[F1] Item ${i + 1}/${elements.length}: ${itemId}`);
      for (const check of checks) {
        if (check.result === "PASS") {
          console.log(`     ✓ ${check.attr}: ${check.value || "(empty)"}`);
        } else {
          console.log(`     ✗ ${check.attr}: ${check.reason}`);
          if (check.valid_values) {
            console.log(`       Valid values: ${check.valid_values.join(", ")}`);
          }
          failures.push({
            item: itemId,
            itemIndex: i,
            ...check,
          });
        }
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[F1] AUDIT SUMMARY`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Total items: ${elements.length}`);
    console.log(`Total checks: ${passCount + failCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);

    if (failCount > 0) {
      console.log(`\n[F1] FAILURES:`);
      for (const failure of failures) {
        console.log(
          `  - ${failure.item} (index ${failure.itemIndex}): ${failure.attr} - ${failure.reason}`,
        );
      }
      console.log(`\n[F1] AUDIT FAILED`);
      await browser.close();
      server.close();
      process.exit(1);
    } else {
      console.log(`\n[F1] ALL CHECKS PASSED`);
      await browser.close();
      server.close();
      process.exit(0);
    }
  } catch (error) {
    console.error(`[F1] ERROR:`, error.message);
    await browser.close();
    server.close();
    process.exit(1);
  }
}

main();
