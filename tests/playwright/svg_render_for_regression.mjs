/**
 * SVG renderer for visual-regression harness.
 *
 * Usage:
 *   node tests/playwright/svg_render_for_regression.mjs <svg_path> <output_png_path> [chromium|firefox]
 *
 * Renders the SVG at a fixed 256x256 canvas (SVG is fit with preserveAspectRatio="xMidYMid meet"
 * on a white background), saves a PNG screenshot, then exits.
 *
 * Run from repo root so node_modules/ resolves.
 */

import { chromium, firefox } from "playwright";
import path from "node:path";
import fs from "node:fs";

//============================================
function buildHtmlWrapper(svgPath) {
  // Read the SVG and embed it inline as a data URI to avoid file:// CORS quirks.
  // The outer div forces a fixed 256x256 canvas with white background.
  const svgContent = fs.readFileSync(svgPath, "utf8");
  // Encode to base64 to embed safely inside an img src attribute.
  const b64 = Buffer.from(svgContent).toString("base64");
  const dataUri = `data:image/svg+xml;base64,${b64}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 256px; height: 256px; background: white; overflow: hidden; }
  .canvas { width: 256px; height: 256px; display: flex; align-items: center; justify-content: center; background: white; }
  img { max-width: 256px; max-height: 256px; width: 256px; height: 256px; object-fit: contain; display: block; }
</style>
</head>
<body>
<div class="canvas">
  <img src="${dataUri}" alt="svg" />
</div>
</body>
</html>`;
  return html;
}

//============================================
async function renderSvg(svgPath, outputPng, engineName) {
  // Launch the requested browser engine (headless, no args needed).
  const engineMap = {
    chromium: chromium,
    firefox: firefox,
  };
  const engineKey = engineName || "chromium";
  const engine = engineMap[engineKey];
  if (!engine) {
    throw new Error(`Unknown engine: ${engineKey}. Use 'chromium' or 'firefox'.`);
  }

  // Build a temporary HTML file to load in the browser.
  const tmpHtmlPath = outputPng + ".tmp_wrap.html";
  const htmlContent = buildHtmlWrapper(svgPath);
  fs.writeFileSync(tmpHtmlPath, htmlContent, "utf8");

  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
    // Load the local HTML wrapper file.
    const fileUrl = `file://${path.resolve(tmpHtmlPath)}`;
    await page.goto(fileUrl, { waitUntil: "networkidle" });
    // Small delay for any SVG rendering to settle (fonts, gradients).
    await page.waitForTimeout(150);
    await page.screenshot({ path: outputPng, fullPage: false });
  } finally {
    await browser.close();
    // Clean up temp wrapper HTML.
    try {
      fs.unlinkSync(tmpHtmlPath);
    } catch (_e) {
      // Ignore cleanup failure; it is in a temp path.
    }
  }
}

//============================================
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node svg_render_for_regression.mjs <svg_path> <output_png_path> [chromium|firefox]");
    process.exit(1);
  }

  const svgPath = args[0];
  const outputPng = args[1];
  // Default to chromium if no engine specified.
  const engineName = args[2] || "chromium";

  if (!fs.existsSync(svgPath)) {
    console.error(`ERROR: SVG not found: ${svgPath}`);
    process.exit(1);
  }

  await renderSvg(svgPath, outputPng, engineName);
  console.log(`OK: ${svgPath} -> ${outputPng} [${engineName}]`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
