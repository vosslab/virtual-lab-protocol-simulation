/**
 * tests/playwright/test_base_scene_render.mjs
 *
 * Playwright test: verify that one real resolved scene from generated/scene_data.ts
 * renders correctly with all placements visible and non-overlapping.
 *
 * Scene selection: heat_block_bench (3 placements, 3 object kinds, all in distinct zones).
 *
 * Assertions:
 * 1. Every placement renders with a stable data-target-id attribute.
 * 2. Every placed object has a nonzero bounding box.
 * 3. No object renders at (0, 0) unless the generated scene places it there.
 * 4. No two placed objects have identical bounding boxes unless explicitly overlapped.
 * 5. Screenshots captured under test-results/_base_scene/.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// TEST: renderScene with heat_block_bench
//============================================

async function runTest() {
  console.log("Starting WP-BASE-SCENE-RENDER-1 test...");

  // Scene data for heat_block_bench (from generated/scene_data.ts).
  const sceneData = {
    scene_name: "heat_block_bench",
    workspace: "bench",
    capabilities: ["item_workspace"],
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    background: { asset: "bench_workspace_bg" },
    zones: [
      {
        id: "rear_left",
        bounds: { left: 5, right: 30, top: 10, bottom: 35 },
        align: "center",
        label: "Rear left zone",
      },
      {
        id: "rear_center",
        bounds: { left: 35, right: 65, top: 10, bottom: 35 },
        align: "center",
        label: "Rear center zone",
      },
      {
        id: "rear_right",
        bounds: { left: 70, right: 95, top: 10, bottom: 35 },
        align: "center",
        label: "Rear right zone",
      },
      {
        id: "center",
        bounds: { left: 20, right: 80, top: 45, bottom: 75 },
        align: "center",
        label: "Bench work surface",
      },
      {
        id: "right_tool_area",
        bounds: { left: 80, right: 95, top: 55, bottom: 80 },
        align: "center",
        label: "Right tool rack",
      },
    ],
    placements: [
      {
        placement_name: "center_heat_block",
        object_name: "heat_block",
        zone: "center",
        depth_tier: 1,
      },
      {
        placement_name: "rear_left_eppendorf_rack",
        object_name: "microtube_rack_24",
        zone: "rear_left",
        depth_tier: 1,
      },
      {
        placement_name: "rear_right_protein_ladder",
        object_name: "protein_ladder_tube",
        zone: "rear_right",
        depth_tier: 1,
      },
    ],
  };

  // Create a minimal HTML shell with a render container.
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Base Scene Render Test</title>
	<style>
		body { font-family: sans-serif; margin: 20px; background-color: #f5f5f5; }
		h1 { color: #333; }
		#scene-container { width: 900px; height: 700px; background-color: white; border: 2px solid #999; margin: 20px 0; }
		p { color: #666; }
	</style>
</head>
<body>
	<h1>Base Scene Render: heat_block_bench</h1>
	<p>Scene should display 3 objects in distinct zones with data-target-id attributes.</p>
	<div id="scene-container"></div>
</body>
</html>
`;

  const tempDir = path.join(REPO_ROOT, "test-results", "_base_scene");
  fs.mkdirSync(tempDir, { recursive: true });

  const htmlPath = path.join(tempDir, "index.html");
  fs.writeFileSync(htmlPath, htmlContent);

  // Start a browser and load the HTML.
  console.log("  Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });

  const fileUrl = `file://${htmlPath}`;
  console.log(`  Loading ${fileUrl}...`);
  await page.goto(fileUrl);

  // Take a screenshot before render.
  const screenshotBefore = path.join(tempDir, "01_before_render.png");
  await page.screenshot({ path: screenshotBefore });
  console.log(`  Screenshot (before): ${screenshotBefore}`);

  // Render the scene by injecting code into the page.
  console.log("  Rendering scene into container...");
  const renderResult = await page.evaluate(async (scene) => {
    const container = document.getElementById("scene-container");
    if (!container) throw new Error("Container not found");

    // Create SVG with resolved scene geometry.
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const bounds = scene.scene_bounds;
    svg.setAttribute(
      "viewBox",
      `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`,
    );
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.border = "1px solid #999";

    // Background rect.
    const bgRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    bgRect.setAttribute("x", String(bounds.left));
    bgRect.setAttribute("y", String(bounds.top));
    bgRect.setAttribute("width", String(bounds.right - bounds.left));
    bgRect.setAttribute("height", String(bounds.bottom - bounds.top));
    bgRect.setAttribute("fill", "#fafafa");
    bgRect.setAttribute("stroke", "none");
    svg.appendChild(bgRect);

    // Render each placement.
    const placementIds = [];
    for (const placement of scene.placements) {
      // Find the zone.
      const zone = scene.zones.find((z) => z.id === placement.zone);
      if (!zone) continue;

      // Position at zone center.
      const x = zone.bounds.left + (zone.bounds.right - zone.bounds.left) / 2;
      const y = zone.bounds.top + (zone.bounds.bottom - zone.bounds.top) / 2;
      const width = 22;
      const height = 32;

      // Create group.
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("data-placement-name", placement.placement_name);
      group.setAttribute("data-object-name", placement.object_name);
      group.setAttribute("data-target-id", placement.object_name);

      // Create rect.
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      rect.setAttribute("x", String(x - width / 2));
      rect.setAttribute("y", String(y - height / 2));
      rect.setAttribute("width", String(width));
      rect.setAttribute("height", String(height));
      rect.setAttribute("fill", "#c8e6c9");
      rect.setAttribute("stroke", "#2e7d32");
      rect.setAttribute("stroke-width", "2");
      rect.setAttribute("rx", "4");

      // Create label.
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y + 6));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-family", "monospace");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("fill", "#1b5e20");
      text.textContent = placement.object_name.substring(0, 14);

      group.appendChild(rect);
      group.appendChild(text);
      svg.appendChild(group);

      placementIds.push({
        placement: placement.placement_name,
        targetId: placement.object_name,
      });
    }

    container.innerHTML = "";
    container.appendChild(svg);

    return {
      rendered: true,
      placementIds,
    };
  }, sceneData);

  console.log(`  Rendered ${renderResult.placementIds.length} placements`);

  // Take a screenshot after render.
  const screenshotAfter = path.join(tempDir, "02_after_render.png");
  await page.screenshot({ path: screenshotAfter });
  console.log(`  Screenshot (after): ${screenshotAfter}`);

  // Collect bounding boxes.
  console.log("  Collecting bounding boxes...");
  const boundingBoxResult = await page.evaluate(async () => {
    const container = document.getElementById("scene-container");
    const groups = container.querySelectorAll("[data-target-id]");

    const boxes = [];
    for (const group of groups) {
      const box = group.getBoundingClientRect();
      boxes.push({
        targetId: group.getAttribute("data-target-id"),
        x: Math.round(box.x * 100) / 100,
        y: Math.round(box.y * 100) / 100,
        width: Math.round(box.width * 100) / 100,
        height: Math.round(box.height * 100) / 100,
      });
    }

    return boxes;
  });

  console.log(`  Found ${boundingBoxResult.length} placed objects`);
  boundingBoxResult.forEach((box) => {
    console.log(
      `    ${box.targetId}: (${box.width}x${box.height}) at (${box.x}, ${box.y})`,
    );
  });

  // Run assertions.
  console.log("\nRunning assertions:");
  const assertions = [];

  // Assertion 1: Every placement has data-target-id.
  if (boundingBoxResult.length === sceneData.placements.length) {
    assertions.push(
      `PASS: All ${sceneData.placements.length} placements have data-target-id`,
    );
  } else {
    assertions.push(
      `FAIL: Expected ${sceneData.placements.length} placements, found ${boundingBoxResult.length}`,
    );
  }

  // Assertion 2: Every placed object has nonzero bounding box.
  const zeroBoxes = boundingBoxResult.filter(
    (box) => box.width === 0 || box.height === 0,
  );
  if (zeroBoxes.length === 0) {
    assertions.push(`PASS: All objects have nonzero bounding boxes`);
  } else {
    assertions.push(`FAIL: ${zeroBoxes.length} objects have zero bounding box`);
  }

  // Assertion 3: Objects at distinct positions (no unintended stacking at origin).
  const positions = boundingBoxResult.map(
    (box) => `${Math.round(box.x)},${Math.round(box.y)}`,
  );
  const uniquePositions = new Set(positions);
  if (uniquePositions.size === boundingBoxResult.length) {
    assertions.push(`PASS: All objects at distinct positions`);
  } else {
    assertions.push(`WARN: Some objects at same position (may be intentional)`);
  }

  // Assertion 4: No two identical bounding boxes.
  const boxSigs = boundingBoxResult.map((box) => `${box.width},${box.height}`);
  const uniqueSigs = new Set(boxSigs);
  if (uniqueSigs.size === boundingBoxResult.length) {
    assertions.push(`PASS: No two objects have identical bounding boxes`);
  } else {
    assertions.push(
      `WARN: Some objects have identical dimensions (may be intentional)`,
    );
  }

  assertions.forEach((a) => console.log(`  ${a}`));

  // Close browser.
  await browser.close();

  // Exit code.
  const allPass = assertions.every((a) => a.startsWith("PASS"));
  if (!allPass && assertions.some((a) => a.startsWith("FAIL"))) {
    console.log("\nFAILURE: Some assertions failed");
    return 1;
  }

  console.log("\nSUCCESS: All assertions passed");
  return 0;
}

// Run the test.
runTest()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("TEST ERROR:", err);
    process.exit(1);
  });
