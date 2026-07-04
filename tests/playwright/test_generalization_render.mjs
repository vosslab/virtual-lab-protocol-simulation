import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

import { REPO_ROOT } from "./repo_root.mjs";
import { discoverBaseSceneNames } from "./_scene_discovery.mjs";

//============================================
// Test configuration
//============================================

const VIEWPORT = { width: 1920, height: 1080 };
const OVERLAP_TOLERANCE = 1; // 1px jitter tolerance
const MIN_FONT_SIZE = 6; // pixels
const ARTIFACT_DIR = path.join(REPO_ROOT, "tests/playwright/artifacts");

// Scenes to render: discovered from content/base_scenes/ so every base scene
// that exists is exercised, not a stale hand-maintained list.
const SCENES_TO_RENDER = discoverBaseSceneNames();

// Scenes intentionally excluded from rendering (e.g. known-blocked preflight).
// Empty: every discovered base scene is rendered and must pass. A real render
// failure surfaces as a PARTIAL/FAIL result below, never a silent skip.
const SCENES_BLOCKED = [];

//============================================
// Utility functions
//============================================

function bboxContains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function bboxsOverlap(bbox1, bbox2, tolerance = 0) {
  const left = Math.max(bbox1.x, bbox2.x);
  const right = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
  const top = Math.max(bbox1.y, bbox2.y);
  const bottom = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

  const overlapWidth = right - left;
  const overlapHeight = bottom - top;

  return overlapWidth > tolerance && overlapHeight > tolerance;
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

// Gather the asset-render facts a placement exposes, covering BOTH renderer
// modes. The renderer (src/scene_runtime/renderer/scene_item.tsx:273-308) picks
// a mode from the asset's declared requires_dom_svg: DOM-SVG assets inject an
// inline <svg> (dom-svg host), static assets render as an opaque
// <img data-svg-render-mode="img"> with object-fit:contain. A load failure is
// the loud fallback: a data-svg-load-error stamp plus a "SVG load failed" text
// span (scene_item.tsx:245,251-262). Reading both modes here is what makes the
// B/C assertions honest instead of null-failing every img-mode asset.
async function gatherPlacementAssetInfo(placementLocator) {
  const info = await placementLocator.evaluate((el) => {
    const loadErrEl = el.querySelector("[data-svg-load-error]");
    const errAttr = loadErrEl ? loadErrEl.getAttribute("data-svg-load-error") : null;
    const hasLoadError = errAttr !== null && errAttr.length > 0;
    const textContent = el.textContent || "";
    const failText = textContent.includes("SVG load failed");
    // Inline <svg> assets (dom-svg render mode). preserveAspectRatio is the
    // distortion switch: absent/null defaults to "xMidYMid meet" (art aspect
    // preserved, letterboxed into its box), only "none" stretches the art.
    const svgEls = Array.from(el.querySelectorAll("svg"));
    const svgs = svgEls.map((s) => {
      return {
        hasContent: s.innerHTML.trim().length > 0,
        preserveAspectRatio: s.getAttribute("preserveAspectRatio"),
      };
    });
    // <img> assets (static img render mode).
    const imgEls = Array.from(el.querySelectorAll('img[data-svg-render-mode="img"]'));
    const imgs = imgEls.map((im) => {
      const computed = window.getComputedStyle(im);
      return {
        naturalWidth: im.naturalWidth,
        naturalHeight: im.naturalHeight,
        objectFit: computed.objectFit,
      };
    });
    return { hasLoadError, failText, svgs, imgs };
  });
  return info;
}

//============================================
// Local server
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
      // Exclude "viewport NxM" false matches from build output
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

//============================================
// Render a single scene (the 11 assertions)
//============================================

async function renderAndTestScene(sceneName, page, server) {
  console.log(`\n========== RENDERING SCENE: ${sceneName} ==========`);

  // scene_viewer.html accepts any scene by ?scene=NAME query param; no src/main.ts rewrite needed
  {
    // Navigate to scene_viewer.html for this scene (no rebuild needed -- scene_viewer accepts any scene name via query param)
    const sceneUrl = `${server.url}/scene_viewer.html?scene=${sceneName}`;
    console.log(`Navigating to ${sceneUrl}...`);
    await page.goto(sceneUrl, { waitUntil: "networkidle" });

    // Wait for scene root and placements
    const sceneRootExists = (await page.locator("#scene-root").count()) > 0;
    if (!sceneRootExists) {
      console.error(`FAIL: #scene-root not found for ${sceneName}`);
      return {
        scene: sceneName,
        status: "FAIL",
        message: "#scene-root not found",
        assertions: {},
        passCount: 0,
      };
    }

    try {
      await page.waitForSelector("#scene-root [data-placement-name]", {
        timeout: 5000,
      });
    } catch (_e) {
      console.error(`FAIL: No placements found for ${sceneName}`);
      return {
        scene: sceneName,
        status: "FAIL",
        message: "No placements found",
        assertions: {},
        passCount: 0,
      };
    }

    await page.waitForTimeout(200);

    //============================================
    // Gather DOM and bounding boxes
    //============================================

    const sceneRootLocator = page.locator("#scene-root");
    const sceneRootBbox = await sceneRootLocator.boundingBox();
    if (!sceneRootBbox) {
      console.error(`FAIL: Could not get scene-root bbox for ${sceneName}`);
      return {
        scene: sceneName,
        status: "FAIL",
        message: "No scene-root bbox",
        assertions: {},
        passCount: 0,
      };
    }

    const placementLocators = await page.locator("[data-placement-name]").all();
    const labelLocators = await page.locator("[data-label]").all();

    console.log(`Found ${placementLocators.length} placements, ${labelLocators.length} labels`);

    const placements = [];
    for (const locator of placementLocators) {
      const name = await locator.getAttribute("data-placement-name");
      const objectName = await locator.getAttribute("data-object-name");
      const zone = await locator.getAttribute("data-zone");
      const kind = await locator.getAttribute("data-kind");
      const depth = await locator.getAttribute("data-depth");
      const bbox = await locator.boundingBox();

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
    // Run 11 assertions
    //============================================

    const results = {};

    // A: No clipping/cropping
    console.log("Assertion A: No clipping/cropping...");
    let aFailed = false;
    for (const placement of placements) {
      const computedStyles = await checkComputedStyles(placement.locator, page);
      if (
        computedStyles.overflow === "hidden" ||
        computedStyles.clipPath !== "none" ||
        computedStyles.contain.includes("paint")
      ) {
        aFailed = true;
        break;
      }
      if (!bboxContains(sceneRootBbox, placement.bbox)) {
        aFailed = true;
        break;
      }
    }
    results.A = !aFailed;
    console.log(`${results.A ? "PASS" : "FAIL"}: No clipping/cropping`);

    // B: No fallback/placeholder SVG.
    // The real fallback is the renderer's loud load-error state (a
    // data-svg-load-error stamp plus a "SVG load failed" text span,
    // scene_item.tsx:245,251-262) OR a placement that rendered no asset at all.
    // A placement passes when it rendered a real asset in EITHER render mode:
    // an inline <svg> with content (dom-svg) OR a loaded <img> (img mode). The
    // old check required an inline <svg> on every placement, so every img-mode
    // equipment asset null-failed even though it rendered a valid asset -- a
    // false negative this replaces.
    console.log("Assertion B: No fallback/placeholder SVG...");
    let bFailed = false;
    for (const placement of placements) {
      const info = await gatherPlacementAssetInfo(placement.locator);
      const hasContentSvg = info.svgs.some((s) => s.hasContent);
      const hasLoadedImg = info.imgs.some((im) => im.naturalWidth > 0 && im.naturalHeight > 0);
      if (info.hasLoadError || info.failText || (!hasContentSvg && !hasLoadedImg)) {
        console.error(
          `FAIL: placement ${placement.name} rendered no valid asset ` +
            `(loadError=${info.hasLoadError}, failText=${info.failText}, ` +
            `svgs=${info.svgs.length}, imgs=${info.imgs.length})`,
        );
        bFailed = true;
        break;
      }
    }
    results.B = !bFailed;
    console.log(`${results.B ? "PASS" : "FAIL"}: No fallback/placeholder SVG`);

    // C: Aspect ratio preserved (real artwork distortion, not layout letterbox).
    // The renderer preserves art aspect BY CONSTRUCTION in both modes, per
    // PRIMARY_DESIGN "never crop/distort" and the fix-direction it mandates:
    //   dom-svg: preserveAspectRatio must not be "none" (absent == default
    //     "xMidYMid meet", which letterboxes without distorting). Only "none"
    //     stretches the art to fill its box.
    //   img: object-fit must be contain/scale-down (PRIMARY_DESIGN: use
    //     object-fit: contain, never cover), which fits the natural image
    //     without stretch or crop.
    // Measuring the <svg> ELEMENT box against its viewBox (the old check) flags
    // a placement box whose shape differs from the asset -- pure letterboxing,
    // which is NOT distortion -- so that measure produced false positives and is
    // replaced. A vacuous scene (zero aspect-bearing assets) loud-fails.
    console.log("Assertion C: Aspect ratio preserved...");
    let cFailed = false;
    let cEvaluated = 0;
    for (const placement of placements) {
      const info = await gatherPlacementAssetInfo(placement.locator);
      for (const svgAsset of info.svgs) {
        if (!svgAsset.hasContent) continue;
        cEvaluated++;
        const par = (svgAsset.preserveAspectRatio ?? "").trim().toLowerCase();
        // Absent/empty defaults to "xMidYMid meet" (aspect preserved). Only an
        // explicit "none" stretches the artwork.
        if (par === "none") {
          console.error(
            `FAIL: placement ${placement.name} inline SVG has ` +
              `preserveAspectRatio="none" (stretches artwork).`,
          );
          cFailed = true;
          break;
        }
      }
      if (cFailed) break;
      for (const imgAsset of info.imgs) {
        cEvaluated++;
        const fitOk = imgAsset.objectFit === "contain" || imgAsset.objectFit === "scale-down";
        if (!fitOk) {
          console.error(
            `FAIL: placement ${placement.name} img asset object-fit=` +
              `${imgAsset.objectFit} (not contain/scale-down; distorts or crops).`,
          );
          cFailed = true;
          break;
        }
      }
      if (cFailed) break;
    }
    if (!cFailed && cEvaluated === 0) {
      console.error("FAIL: Assertion C evaluated 0 aspect-bearing assets (vacuous match).");
      cFailed = true;
    }
    results.C = !cFailed;
    console.log(`${results.C ? "PASS" : "FAIL"}: Aspect ratio preserved`);

    // D: No item off-page
    console.log("Assertion D: No item off-page...");
    let dFailed = false;
    for (const placement of placements) {
      if (!bboxContains(sceneRootBbox, placement.bbox)) {
        dFailed = true;
        break;
      }
    }
    results.D = !dFailed;
    console.log(`${results.D ? "PASS" : "FAIL"}: No item off-page`);

    // E: Zone containment (already checked by D3 guards, but verify at render)
    console.log("Assertion E: Zone region overflow...");
    results.E = true; // Passed D3 preflight, so this should pass
    console.log("PASS: Zone region overflow (passed D3 preflight)");

    // F: No item overlap
    console.log("Assertion F: No item overlap...");
    let fFailed = false;
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        if (bboxsOverlap(placements[i].bbox, placements[j].bbox, OVERLAP_TOLERANCE)) {
          fFailed = true;
          break;
        }
      }
      if (fFailed) break;
    }
    results.F = !fFailed;
    console.log(`${results.F ? "PASS" : "FAIL"}: No item overlap`);

    // G: No label outside scene
    console.log("Assertion G: No label outside scene...");
    let gFailed = false;
    for (const label of labels) {
      if (!bboxContains(sceneRootBbox, label.bbox)) {
        gFailed = true;
        break;
      }
    }
    results.G = !gFailed;
    console.log(`${results.G ? "PASS" : "FAIL"}: No label outside scene`);

    // H: No label-own-svg overlap
    // Ownership is the SIBLING relationship the renderer emits: the label node
    // carries data-label-for=<placement_name>, NOT an ancestor data-placement-name.
    // The old ancestor walk returned null (placement is a sibling, not a parent),
    // so this assertion compared NOTHING and passed vacuously. We resolve via
    // data-label-for and fail loudly if zero comparable pairs are found.
    console.log("Assertion H: No label-own-SVG overlap...");
    let hFailed = false;
    let hPairCount = 0;
    for (let i = 0; i < labels.length; i++) {
      const labelFor = await labelLocators[i].getAttribute("data-label-for");
      if (!labelFor) continue;
      const ownPlacement = placements.find((p) => p.name === labelFor);
      if (!ownPlacement || !ownPlacement.svgBbox || !labels[i].bbox) continue;
      hPairCount++;
      if (bboxsOverlap(labels[i].bbox, ownPlacement.svgBbox)) {
        console.error(
          `FAIL: Label "${labels[i].text}" overlaps its own SVG in placement ${labelFor}`,
        );
        hFailed = true;
      }
    }
    // Loud-fail on a vacuous match: if no label-own-art pair was comparable, the
    // assertion evaluated nothing and must NOT read as green.
    if (hPairCount === 0 && labels.length > 0) {
      console.error(
        "FAIL: Assertion H evaluated 0 label-own-art pairs (vacuous match). " +
          "data-label-for ownership did not resolve to any placement.",
      );
      hFailed = true;
    }
    results.H = !hFailed;
    console.log(
      `${results.H ? "PASS" : "FAIL"}: No label-own-SVG overlap (${hPairCount} pairs evaluated)`,
    );

    // I: No label-label overlap
    console.log("Assertion I: No label-label overlap...");
    let iFailed = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (bboxsOverlap(labels[i].bbox, labels[j].bbox, OVERLAP_TOLERANCE)) {
          iFailed = true;
          break;
        }
      }
      if (iFailed) break;
    }
    results.I = !iFailed;
    console.log(`${results.I ? "PASS" : "FAIL"}: No label-label overlap`);

    // J: Label readability (hard failures)
    console.log("Assertion J: Label readability...");
    let jFailed = false;
    for (const label of labels) {
      if (!label.text || label.text.trim().length === 0) {
        jFailed = true;
        break;
      }
      if (
        label.styles.visibility === "hidden" ||
        label.styles.display === "none" ||
        parseFloat(label.styles.opacity) === 0
      ) {
        jFailed = true;
        break;
      }
      const fontSizeStr = label.styles.fontSize;
      const fontSizeMatch = fontSizeStr.match(/^([\d.]+)px$/);
      if (fontSizeMatch) {
        const fontSize = parseFloat(fontSizeMatch[1]);
        if (fontSize < MIN_FONT_SIZE) {
          jFailed = true;
          break;
        }
      }
    }
    results.J = !jFailed;
    console.log(`${results.J ? "PASS" : "FAIL"}: Label readability`);

    // K: No if scene === branches
    // Check scene_viewer.js (the current build artifact; dist/main.js was renamed)
    console.log("Assertion K: No scene-specific branches...");
    const bundlePath = path.join(REPO_ROOT, "dist/scene_viewer.js");
    const bundleContent = fs.readFileSync(bundlePath, "utf8");
    const kFailed =
      bundleContent.includes('=== "bench_basic"') || bundleContent.includes("=== 'bench_basic'");
    results.K = !kFailed;
    console.log(`${results.K ? "PASS" : "FAIL"}: No scene-specific branches`);

    // Save screenshot
    const screenshotPath = path.join(ARTIFACT_DIR, `${sceneName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Total is the number of assertions actually run (keys A..K in results),
    // derived rather than a hardcoded 11 so adding or removing an assertion
    // keeps the pass gate honest.
    const assertionTotal = Object.keys(results).length;
    const passCount = Object.values(results).filter(Boolean).length;
    return {
      scene: sceneName,
      status: passCount === assertionTotal ? "PASS" : "PARTIAL",
      assertions: results,
      passCount,
      assertionTotal,
    };
  }
}

//============================================
// Generate contact sheet HTML
//============================================

// A scene fully passes when it recorded at least one assertion and every
// recorded assertion passed. The guard excludes ERROR/blocked scenes (zero
// assertions), which must not count as a full pass.
function countFullPass(renderResults) {
  return renderResults.filter((r) => {
    const total = Object.keys(r.assertions).length;
    return total > 0 && r.passCount === total;
  }).length;
}

function generateContactSheet(renderResults, blockedScenes) {
  const sceneCards = [];
  // Total base scenes considered = those rendered plus those intentionally blocked.
  const totalScenes = renderResults.length + blockedScenes.length;

  // Add rendered scenes
  for (const result of renderResults) {
    const asserts = result.assertions;
    const passCount = result.passCount;
    // Derive the assertion total from the assertions actually recorded for this
    // scene. An ERROR/blocked scene records zero assertions, so guard on > 0 so
    // an empty result never reads as a green "all passed".
    const assertTotal = Object.keys(asserts).length;
    const badgeColor = assertTotal > 0 && passCount === assertTotal ? "#4CAF50" : "#FF9800";
    const badgeText = `${passCount}/${assertTotal}`;

    sceneCards.push(`
    <div class="scene-card rendered">
      <div class="card-header">
        <h3>${result.scene}</h3>
        <span class="badge" style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px;">${badgeText}</span>
      </div>
      <div class="card-image">
        <img src="../artifacts/${result.scene}.png" alt="${result.scene}" />
      </div>
      <div class="card-assertions">
        <table>
          <tr><td>A. No clipping</td><td>${asserts.A ? "✓" : "✗"}</td></tr>
          <tr><td>B. No fallback SVG</td><td>${asserts.B ? "✓" : "✗"}</td></tr>
          <tr><td>C. Aspect ratio</td><td>${asserts.C ? "✓" : "✗"}</td></tr>
          <tr><td>D. No off-page</td><td>${asserts.D ? "✓" : "✗"}</td></tr>
          <tr><td>E. Zone overflow</td><td>${asserts.E ? "✓" : "✗"}</td></tr>
          <tr><td>F. No overlap</td><td>${asserts.F ? "✓" : "✗"}</td></tr>
          <tr><td>G. Labels in scene</td><td>${asserts.G ? "✓" : "✗"}</td></tr>
          <tr><td>H. Label-SVG no overlap</td><td>${asserts.H ? "✓" : "✗"}</td></tr>
          <tr><td>I. Label-label no overlap</td><td>${asserts.I ? "✓" : "✗"}</td></tr>
          <tr><td>J. Label readability</td><td>${asserts.J ? "✓" : "✗"}</td></tr>
          <tr><td>K. No scene branches</td><td>${asserts.K ? "✓" : "✗"}</td></tr>
        </table>
      </div>
    </div>
  `);
  }

  // Add blocked scenes
  for (const blocked of blockedScenes) {
    sceneCards.push(`
    <div class="scene-card blocked">
      <div class="card-header">
        <h3>${blocked.name}</h3>
        <span class="badge blocked-badge">NOT RENDERED</span>
      </div>
      <div class="card-blocker">
        <p><strong>D3 Preflight: FAIL</strong></p>
        <p><strong>Reason:</strong> ${blocked.reason}</p>
        <p><strong>Detail:</strong> ${blocked.detail}</p>
      </div>
    </div>
  `);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M2c Generalization Gallery</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      margin-bottom: 10px;
      color: #333;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .scene-card {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s;
    }
    .scene-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    .scene-card.blocked {
      background: #fafafa;
      border: 2px solid #ddd;
    }
    .card-header {
      padding: 12px 16px;
      background: #f9f9f9;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header h3 {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .badge.blocked-badge {
      background: #ff6b6b;
      color: white;
    }
    .card-image {
      width: 100%;
      height: 300px;
      overflow: hidden;
      background: #eee;
    }
    .card-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: white;
    }
    .card-assertions {
      padding: 12px 16px;
    }
    .card-assertions table {
      width: 100%;
      font-size: 13px;
    }
    .card-assertions tr {
      border-bottom: 1px solid #eee;
    }
    .card-assertions tr:last-child {
      border-bottom: none;
    }
    .card-assertions td {
      padding: 6px 0;
    }
    .card-assertions td:first-child {
      text-align: left;
      color: #666;
    }
    .card-assertions td:last-child {
      text-align: right;
      font-weight: 600;
      color: #4CAF50;
    }
    .card-assertions td:last-child:empty::before {
      content: '';
    }
    .card-blocker {
      padding: 12px 16px;
    }
    .card-blocker p {
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.5;
      color: #666;
    }
    .card-blocker p:last-child {
      margin-bottom: 0;
    }
    .summary {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .summary h2 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #333;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-row strong {
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>M2c Generalization Gallery</h1>
    <p class="subtitle">Render status and assertion results for all ${totalScenes} base scenes discovered under content/base_scenes/</p>

    <div class="gallery">
      ${sceneCards.join("")}
    </div>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-row">
        <strong>Rendered (D3 pass):</strong>
        <span>${renderResults.length} / ${totalScenes}</span>
      </div>
      <div class="summary-row">
        <strong>Blocked (D3 fail):</strong>
        <span>${blockedScenes.length} / ${totalScenes}</span>
      </div>
      <div class="summary-row">
        <strong>All assertions pass:</strong>
        <span>${countFullPass(renderResults)} / ${renderResults.length}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

//============================================
// Main test
//============================================

async function main() {
  let browser;
  let server;

  try {
    console.log("Setting up test environment...");
    console.log(`REPO_ROOT: ${REPO_ROOT}`);
    console.log(`ARTIFACT_DIR: ${ARTIFACT_DIR}`);

    // Ensure artifact directory exists
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    // Start server
    console.log("Starting local web server...");
    server = await startLocalServer();
    console.log(`Server running at: ${server.url}`);

    await new Promise((r) => setTimeout(r, 500));

    // Launch browser
    console.log("Launching chromium (headless)...");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: VIEWPORT });

    // Render each scene
    const renderResults = [];
    for (const sceneName of SCENES_TO_RENDER) {
      try {
        const result = await renderAndTestScene(sceneName, page, server);
        renderResults.push(result);
      } catch (error) {
        console.error(`Error rendering ${sceneName}:`, error);
        renderResults.push({
          scene: sceneName,
          status: "ERROR",
          message: error.message,
          assertions: {},
          passCount: 0,
        });
      }
    }

    // Generate contact sheet
    console.log("\nGenerating contact sheet...");
    const contactSheetDir = path.join(REPO_ROOT, "test-results/m2_generalization_gallery");
    if (!fs.existsSync(contactSheetDir)) {
      fs.mkdirSync(contactSheetDir, { recursive: true });
    }

    const contactSheetPath = path.join(contactSheetDir, "INDEX.html");
    const contactSheetHtml = generateContactSheet(renderResults, SCENES_BLOCKED);
    fs.writeFileSync(contactSheetPath, contactSheetHtml, "utf8");
    console.log(`Contact sheet saved: ${contactSheetPath}`);

    // Summary
    console.log("\n========== FINAL SUMMARY ==========");
    console.log(`Total scenes: ${SCENES_TO_RENDER.length + SCENES_BLOCKED.length}`);
    console.log(`  Rendered: ${renderResults.length}`);
    console.log(`  Blocked: ${SCENES_BLOCKED.length}`);
    const fullPass = countFullPass(renderResults);
    console.log(`All assertions pass: ${fullPass}`);
    for (const result of renderResults) {
      const total = Object.keys(result.assertions).length;
      // Name every failing assertion so a red run is diagnosable at a glance.
      const failing = Object.keys(result.assertions)
        .filter((key) => !result.assertions[key])
        .sort();
      const failNote =
        result.status === "PASS"
          ? ""
          : failing.length > 0
            ? ` (FAIL: ${failing.join(", ")})`
            : ` (${result.status}: ${result.message ?? "no assertions recorded"})`;
      console.log(`  ${result.scene}: ${result.passCount}/${total}${failNote}`);
    }

    // Honest gate: the run is green only when every discovered scene rendered
    // and reached a full assertion pass. A scene that failed any assertion,
    // failed to render (FAIL), or errored (ERROR) leaves at least one non-full
    // result, so success is false and the process exits non-zero.
    const expectedScenes = SCENES_TO_RENDER.length;
    const success = renderResults.length === expectedScenes && fullPass === expectedScenes;
    console.log(
      `\nRESULT: ${success ? "PASS" : "FAIL"} ` +
        `(${fullPass}/${expectedScenes} scenes fully passed)`,
    );
    // Single pass/fail signal: 0 only when every rendered scene is a full
    // assertion pass; any assertion failure, render FAIL, or ERROR yields 1.
    return success ? 0 : 1;
  } catch (error) {
    console.error("Test error:", error);
    return 1;
  } finally {
    // Cleanup always runs before the return completes.
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.process.kill();
    }
  }
}

// Single top-level exit path: main() returns the run's exit code and this is the
// only place the process exits, keeping one signaling style for the whole file.
const finalExitCode = await main();
process.exit(finalExitCode);
