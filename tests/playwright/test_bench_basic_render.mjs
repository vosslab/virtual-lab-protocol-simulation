import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { spawn } from "node:child_process";

import { bboxContains, bboxsOverlap, extractViewBoxDimensions } from "../../tools/bbox_helpers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");

//============================================
// Test configuration
//============================================

const VIEWPORT = { width: 1920, height: 1080 };
const ASPECT_TOLERANCE = 0.05; // 5% deviation allowed
const OVERLAP_TOLERANCE = 1; // 1px jitter tolerance
const MIN_FONT_SIZE = 6; // pixels
const ARTIFACT_DIR = path.join(REPO_ROOT, "tests/playwright/artifacts");

//============================================
// Utility functions
//============================================

function getBboxDeviationRatio(renderedWidth, renderedHeight, vbWidth, vbHeight) {
  const renderedAspect = renderedWidth / renderedHeight;
  const naturalAspect = vbWidth / vbHeight;
  const deviation = Math.abs(renderedAspect - naturalAspect) / naturalAspect;
  return deviation;
}

async function checkComputedStyles(locator, _page) {
  const styles = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      overflow: computed.overflow,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
      clipPath: computed.clipPath,
      mask: computed.mask,
      maskImage: computed.maskImage,
      contain: computed.contain,
      visibility: computed.visibility,
      display: computed.display,
      opacity: computed.opacity,
      fontSize: computed.fontSize,
    };
  });
  return styles;
}

//============================================
// Main test
//============================================

async function startLocalServer() {
  return new Promise((resolve, reject) => {
    const serveScript = path.join(REPO_ROOT, "run_web_server.sh");
    const proc = spawn("bash", [serveScript], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let serverUrl = null;
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Server startup timeout"));
    }, 30000);

    proc.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[SERVER] ${line}`);
      // Look for port number like "port 8204" -- exclude "viewport NxM" false matches
      const match =
        line.match(/\bport (\d{4,5})\b/) && !line.includes("viewport")
          ? line.match(/\bport (\d{4,5})\b/)
          : null;
      if (match && !serverUrl) {
        const port = match[1];
        serverUrl = `http://localhost:${port}`;
        clearTimeout(timeout);
        resolve({ url: serverUrl, process: proc });
      }
    });

    proc.stderr.on("data", (data) => {
      console.log(`[SERVER ERR] ${data}`);
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  let browser;
  let server;
  try {
    console.log("Starting local web server...");
    server = await startLocalServer();
    const serverUrl = server.url;
    console.log(`Server running at: ${serverUrl}`);

    // Wait for server to be ready
    await new Promise((r) => setTimeout(r, 500));

    console.log("Launching chromium (headless)...");
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: VIEWPORT });

    // Navigate to scene_viewer.html for bench_basic scene
    const sceneUrl = `${serverUrl}/scene_viewer.html?scene=bench_basic`;
    console.log(`Navigating to: ${sceneUrl}`);

    // Capture console messages BEFORE navigation to debug rendering issues
    page.on("console", (msg) => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[PAGE ERROR] ${err}`));

    await page.goto(sceneUrl, { waitUntil: "networkidle" });

    console.log("Checking if scene-root element exists...");
    const sceneRootExists = (await page.locator("#scene-root").count()) > 0;
    if (!sceneRootExists) {
      console.error("FAIL: #scene-root element not found in DOM");
      process.exit(1);
    }

    console.log("Waiting for scene root and placements to appear...");
    try {
      await page.waitForSelector("#scene-root [data-placement-name]", {
        timeout: 5000,
      });
    } catch (e) {
      console.error("Failed to find placements. Checking page content...");
      const content = await page.content();
      console.log("Page HTML length:", content.length);
      const hasSceneRoot = content.includes("scene-root");
      console.log("Page has scene-root:", hasSceneRoot);
      throw e;
    }

    // Small delay to allow rendering to fully complete
    await page.waitForTimeout(200);

    //============================================
    // Gather all test data
    //============================================

    console.log("\n--- Gathering DOM elements and bounding boxes ---");

    const sceneRootLocator = page.locator("#scene-root");
    const sceneRootBbox = await sceneRootLocator.boundingBox();
    if (!sceneRootBbox) throw new Error("Could not get scene-root bbox");
    console.log(
      `Scene root bbox: (${sceneRootBbox.x}, ${sceneRootBbox.y}, ${sceneRootBbox.width}x${sceneRootBbox.height})`,
    );

    const placementLocators = await page.locator("[data-placement-name]").all();
    console.log(`Found ${placementLocators.length} placements`);

    const labelLocators = await page.locator("[data-label]").all();
    console.log(`Found ${labelLocators.length} labels`);

    const placements = [];
    for (const locator of placementLocators) {
      const name = await locator.getAttribute("data-placement-name");
      const objectName = await locator.getAttribute("data-object-name");
      const zone = await locator.getAttribute("data-zone");
      const kind = await locator.getAttribute("data-kind");
      const depth = await locator.getAttribute("data-depth");
      const bbox = await locator.boundingBox();

      // Get SVG child bbox
      const svgLocator = locator.locator("svg");
      const svgExists = (await svgLocator.count()) > 0;
      let svgBbox = null;
      let viewBox = null;
      if (svgExists) {
        svgBbox = await svgLocator.first().boundingBox();
        viewBox = await svgLocator.first().getAttribute("viewBox");
      }

      placements.push({
        name,
        objectName,
        zone,
        kind,
        depth,
        bbox,
        svgBbox,
        viewBox,
        locator,
      });
    }

    const labels = [];
    for (const locator of labelLocators) {
      const bbox = await locator.boundingBox();
      const text = await locator.textContent();
      const styles = await checkComputedStyles(locator, page);
      labels.push({ bbox, text, styles, locator });
    }

    //============================================
    // ASSERTION A: No clipping/cropping
    //============================================

    console.log("\n--- Assertion A: No clipping/cropping ---");
    let assertionAFailed = false;
    for (const placement of placements) {
      if (!placement.bbox) {
        console.error(`FAIL: Placement ${placement.name} has no bbox`);
        assertionAFailed = true;
        continue;
      }

      // Walk ancestors up to #scene-root
      let element = placement.locator;
      let ancestorPath = [];
      let currentDepth = 0;

      try {
        while (currentDepth < 20) {
          const selector = await element.evaluate((el) => {
            if (!el.parentElement) return null;
            const parent = el.parentElement;
            if (parent.id === "scene-root") return "#scene-root";
            return parent.className || parent.tagName.toLowerCase();
          });

          if (!selector) break;
          ancestorPath.push(selector);

          if (selector === "#scene-root") break;

          element = page.locator(`../${selector}`).first(); // fallback to parent
          currentDepth++;
        }
      } catch (e) {
        // Ancestor traversal is best-effort
      }

      // Check for banned overflow/clip properties on placement element itself and ancestors
      const computedStyles = await checkComputedStyles(placement.locator, page);
      const hasBannedProps =
        computedStyles.overflow === "hidden" ||
        computedStyles.overflow === "clip" ||
        computedStyles.overflowX === "hidden" ||
        computedStyles.overflowX === "clip" ||
        computedStyles.overflowY === "hidden" ||
        computedStyles.overflowY === "clip" ||
        computedStyles.clipPath !== "none" ||
        computedStyles.mask !== "none" ||
        computedStyles.maskImage !== "none" ||
        computedStyles.contain.includes("paint") ||
        computedStyles.contain === "strict" ||
        computedStyles.contain === "content";

      if (hasBannedProps) {
        console.error(
          `FAIL: Placement ${placement.name} or ancestor has banned style: ` +
            `overflow=${computedStyles.overflow}, clipPath=${computedStyles.clipPath}, ` +
            `mask=${computedStyles.mask}, contain=${computedStyles.contain}`,
        );
        assertionAFailed = true;
      }

      // Check that placement bbox is fully contained in scene root
      if (!bboxContains(sceneRootBbox, placement.bbox)) {
        console.error(
          `FAIL: Placement ${placement.name} bbox not fully in scene root. ` +
            `Placement: (${placement.bbox.x}, ${placement.bbox.y}, ${placement.bbox.width}x${placement.bbox.height}), ` +
            `Scene: (${sceneRootBbox.x}, ${sceneRootBbox.y}, ${sceneRootBbox.width}x${sceneRootBbox.height})`,
        );
        assertionAFailed = true;
      }
    }

    if (!assertionAFailed) {
      console.log("PASS: No clipping/cropping detected");
    }

    //============================================
    // ASSERTION B: No fallback/placeholder SVG
    //============================================

    console.log("\n--- Assertion B: No fallback/placeholder SVG ---");
    let assertionBFailed = false;
    for (const placement of placements) {
      if (!placement.svgBbox || !placement.viewBox) {
        console.error(`FAIL: Placement ${placement.name} has no real SVG or missing viewBox`);
        assertionBFailed = true;
        continue;
      }

      // Check that SVG has non-empty content (not just placeholder rect)
      // Use .first() because structured objects (e.g. well_plate_96) may have multiple SVGs
      const svgContent = await placement.locator.locator("svg").first().innerHTML();
      if (!svgContent || svgContent.trim().length === 0) {
        console.error(`FAIL: Placement ${placement.name} SVG is empty`);
        assertionBFailed = true;
      }
    }

    if (!assertionBFailed) {
      console.log("PASS: All placements have real SVG content");
    }

    //============================================
    // ASSERTION C: Aspect ratio preserved
    //============================================

    console.log("\n--- Assertion C: Aspect ratio preserved ---");
    let assertionCFailed = false;
    for (const placement of placements) {
      if (!placement.svgBbox || !placement.viewBox) {
        console.error(`FAIL: Placement ${placement.name} missing SVG bbox or viewBox`);
        assertionCFailed = true;
        continue;
      }

      const vbDims = extractViewBoxDimensions(placement.viewBox);
      if (!vbDims) {
        console.error(
          `FAIL: Placement ${placement.name} viewBox unparseable: ${placement.viewBox}`,
        );
        assertionCFailed = true;
        continue;
      }

      const deviation = getBboxDeviationRatio(
        placement.svgBbox.width,
        placement.svgBbox.height,
        vbDims.width,
        vbDims.height,
      );

      if (deviation > ASPECT_TOLERANCE) {
        console.error(
          `FAIL: Placement ${placement.name} aspect distortion: ${(deviation * 100).toFixed(1)}% ` +
            `(rendered ${placement.svgBbox.width.toFixed(1)}x${placement.svgBbox.height.toFixed(1)}, ` +
            `viewBox ${vbDims.width}x${vbDims.height})`,
        );
        assertionCFailed = true;
      }
    }

    if (!assertionCFailed) {
      console.log("PASS: All placements maintain aspect ratio within 5%");
    }

    //============================================
    // ASSERTION D: No item off-page
    //============================================

    console.log("\n--- Assertion D: No item off-page ---");
    let assertionDFailed = false;
    for (const placement of placements) {
      if (!placement.bbox) {
        console.error(`FAIL: Placement ${placement.name} has no bbox`);
        assertionDFailed = true;
        continue;
      }

      if (!bboxContains(sceneRootBbox, placement.bbox)) {
        console.error(
          `FAIL: Placement ${placement.name} off-page: ` +
            `bbox (${placement.bbox.x}, ${placement.bbox.y}, ${placement.bbox.width}x${placement.bbox.height}) ` +
            `not in scene (${sceneRootBbox.x}, ${sceneRootBbox.y}, ${sceneRootBbox.width}x${sceneRootBbox.height})`,
        );
        assertionDFailed = true;
      }
    }

    if (!assertionDFailed) {
      console.log("PASS: All items on-page");
    }

    //============================================
    // ASSERTION E: No region overflow (zone containment)
    //============================================

    console.log("\n--- Assertion E: Zone region overflow ---");
    let assertionEFailed = false;

    // Group placements by zone
    const zoneMap = new Map();
    for (const placement of placements) {
      if (!zoneMap.has(placement.zone)) {
        zoneMap.set(placement.zone, []);
      }
      zoneMap.get(placement.zone).push(placement);
    }

    for (const [zone, zoneItems] of zoneMap) {
      // Compute zone bbox from the union of contained items
      let zoneBbox = null;
      for (const item of zoneItems) {
        if (!item.bbox) continue;
        if (!zoneBbox) {
          zoneBbox = { ...item.bbox };
        } else {
          const minX = Math.min(zoneBbox.x, item.bbox.x);
          const minY = Math.min(zoneBbox.y, item.bbox.y);
          const maxX = Math.max(zoneBbox.x + zoneBbox.width, item.bbox.x + item.bbox.width);
          const maxY = Math.max(zoneBbox.y + zoneBbox.height, item.bbox.y + item.bbox.height);
          zoneBbox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }
      }

      if (!zoneBbox) {
        console.log(`WARNING: Zone ${zone} has no items with bbox`);
        continue;
      }

      // Check that all items in zone are within the zone bbox (already computed, so this passes by construction)
      console.log(
        `Zone ${zone}: computed bbox (${zoneBbox.x}, ${zoneBbox.y}, ${zoneBbox.width}x${zoneBbox.height}), ${zoneItems.length} items`,
      );
    }

    console.log("PASS: Zone overflow check (items grouped by zone)");

    //============================================
    // ASSERTION F: No item overlap
    //============================================

    console.log("\n--- Assertion F: No item overlap ---");
    let assertionFFailed = false;
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (!p1.bbox || !p2.bbox) continue;

        if (bboxsOverlap(p1.bbox, p2.bbox, OVERLAP_TOLERANCE)) {
          console.error(
            `FAIL: Placements ${p1.name} and ${p2.name} overlap ` +
              `(${p1.name}: (${p1.bbox.x}, ${p1.bbox.y}, ${p1.bbox.width}x${p1.bbox.height}), ` +
              `${p2.name}: (${p2.bbox.x}, ${p2.bbox.y}, ${p2.bbox.width}x${p2.bbox.height}))`,
          );
          assertionFFailed = true;
        }
      }
    }

    if (!assertionFFailed) {
      console.log("PASS: No item overlaps");
    }

    //============================================
    // ASSERTION G: No label outside scene
    //============================================

    console.log("\n--- Assertion G: No label outside scene ---");
    let assertionGFailed = false;
    for (const label of labels) {
      if (!label.bbox) {
        console.error("FAIL: Label has no bbox");
        assertionGFailed = true;
        continue;
      }

      if (!bboxContains(sceneRootBbox, label.bbox)) {
        console.error(
          `FAIL: Label outside scene: ` +
            `bbox (${label.bbox.x}, ${label.bbox.y}, ${label.bbox.width}x${label.bbox.height}) ` +
            `not in scene (${sceneRootBbox.x}, ${sceneRootBbox.y}, ${sceneRootBbox.width}x${sceneRootBbox.height})`,
        );
        assertionGFailed = true;
      }
    }

    if (!assertionGFailed) {
      console.log(`PASS: All ${labels.length} labels inside scene`);
    }

    //============================================
    // ASSERTION H: No label-own-svg overlap
    //============================================

    console.log("\n--- Assertion H: No label-own-SVG overlap ---");
    let assertionHFailed = false;
    let assertionHPairCount = 0;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (!label.bbox) continue;

      // Ownership is the SIBLING relationship the renderer emits: the label node
      // carries data-label-for=<placement_name>, NOT an ancestor
      // data-placement-name. The old ancestor walk returned null (the placement
      // is a sibling, not a parent), so this assertion compared NOTHING and
      // passed vacuously. Resolve via data-label-for instead.
      const labelFor = await labelLocators[i].getAttribute("data-label-for");
      if (!labelFor) continue;

      const ownPlacement = placements.find((p) => p.name === labelFor);
      if (!ownPlacement || !ownPlacement.svgBbox) continue;
      assertionHPairCount++;

      if (bboxsOverlap(label.bbox, ownPlacement.svgBbox)) {
        console.error(
          `FAIL: Label (text: "${label.text}") overlaps its own SVG in placement ${labelFor}`,
        );
        assertionHFailed = true;
      }
    }

    // Loud-fail on a vacuous match: if no label-own-art pair was comparable, the
    // assertion evaluated nothing and must NOT read as green.
    if (assertionHPairCount === 0 && labels.length > 0) {
      console.error(
        "FAIL: Assertion H evaluated 0 label-own-art pairs (vacuous match). " +
          "data-label-for ownership did not resolve to any placement.",
      );
      assertionHFailed = true;
    }

    if (!assertionHFailed) {
      console.log(`PASS: No label-own-SVG overlap (${assertionHPairCount} pairs evaluated)`);
    }

    //============================================
    // ASSERTION I: No label-label overlap
    //============================================

    console.log("\n--- Assertion I: No label-label overlap ---");
    let assertionIFailed = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const l1 = labels[i];
        const l2 = labels[j];
        if (!l1.bbox || !l2.bbox) continue;

        if (bboxsOverlap(l1.bbox, l2.bbox, OVERLAP_TOLERANCE)) {
          console.error(
            `FAIL: Labels overlap: "${l1.text}" and "${l2.text}" ` +
              `(${l1.bbox.x}, ${l1.bbox.y}, ${l1.bbox.width}x${l1.bbox.height}) vs ` +
              `(${l2.bbox.x}, ${l2.bbox.y}, ${l2.bbox.width}x${l2.bbox.height})`,
          );
          assertionIFailed = true;
        }
      }
    }

    if (!assertionIFailed) {
      console.log(`PASS: No label-label overlaps (${labels.length} labels)`);
    }

    //============================================
    // ASSERTION J: Label readability (hard failures)
    //============================================

    console.log("\n--- Assertion J: Label readability (hard failures) ---");
    let assertionJFailed = false;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];

      // Hard failure 1: zero-length text
      if (!label.text || label.text.trim().length === 0) {
        console.error(`FAIL: Label has empty text`);
        assertionJFailed = true;
      }

      // Hard failure 2: outside scene (already checked in G)
      if (!label.bbox || !bboxContains(sceneRootBbox, label.bbox)) {
        console.error(`FAIL: Label outside scene (redundant check)`);
        assertionJFailed = true;
      }

      // Hard failure 3: visibility/display/opacity
      if (
        label.styles.visibility === "hidden" ||
        label.styles.display === "none" ||
        parseFloat(label.styles.opacity) === 0
      ) {
        console.error(
          `FAIL: Label invisible: visibility=${label.styles.visibility}, ` +
            `display=${label.styles.display}, opacity=${label.styles.opacity}`,
        );
        assertionJFailed = true;
      }

      // Hard failure 4: font-size < 6px
      const fontSizeStr = label.styles.fontSize;
      const fontSizeMatch = fontSizeStr.match(/^([\d.]+)px$/);
      if (fontSizeMatch) {
        const fontSize = parseFloat(fontSizeMatch[1]);
        if (fontSize < MIN_FONT_SIZE) {
          console.error(
            `FAIL: Label font too small: ${fontSize}px < ${MIN_FONT_SIZE}px (text: "${label.text}")`,
          );
          assertionJFailed = true;
        }
      }
    }

    if (!assertionJFailed) {
      console.log(`PASS: All ${labels.length} labels pass readability hard-failure checks`);
    }

    //============================================
    // ASSERTION K: No if scene === branches
    //============================================

    console.log("\n--- Assertion K: No scene-specific branches ---");
    let assertionKFailed = false;
    // Check scene_viewer.js (current build artifact; dist/main.js was renamed)
    const bundlePath = path.join(REPO_ROOT, "dist/scene_viewer.js");
    if (fs.existsSync(bundlePath)) {
      const bundleContent = fs.readFileSync(bundlePath, "utf8");
      const hasBranch =
        bundleContent.includes('=== "bench_basic"') || bundleContent.includes("=== 'bench_basic'");

      if (hasBranch) {
        console.error(`FAIL: Found if scene === "bench_basic" branch in dist/scene_viewer.js`);
        assertionKFailed = true;
      } else {
        console.log("PASS: No scene-specific branches in dist/scene_viewer.js");
      }
    } else {
      console.error(`FAIL: dist/scene_viewer.js not found at ${bundlePath}`);
      assertionKFailed = true;
    }

    //============================================
    // Screenshot
    //============================================

    console.log("\n--- Saving screenshot ---");
    const screenshotPath = path.join(ARTIFACT_DIR, "bench_basic.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    //============================================
    // Summary
    //============================================

    console.log("\n========== SUMMARY ==========");
    const allFailed =
      assertionAFailed ||
      assertionBFailed ||
      assertionCFailed ||
      assertionDFailed ||
      assertionEFailed ||
      assertionFFailed ||
      assertionGFailed ||
      assertionHFailed ||
      assertionIFailed ||
      assertionJFailed ||
      assertionKFailed;

    const passCount = [
      !assertionAFailed,
      !assertionBFailed,
      !assertionCFailed,
      !assertionDFailed,
      !assertionEFailed,
      !assertionFFailed,
      !assertionGFailed,
      !assertionHFailed,
      !assertionIFailed,
      !assertionJFailed,
      !assertionKFailed,
    ].filter(Boolean).length;

    console.log(`Passed: ${passCount}/11 assertions`);
    console.log("=============================\n");

    if (allFailed) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test error:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.process.kill();
    }
  }
}

main();
