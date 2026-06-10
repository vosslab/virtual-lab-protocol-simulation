/**
 * Batched SVG renderer for visual-regression harness.
 *
 * Accepts a JSON manifest of {svg_path, output_png} pairs and renders all
 * in one browser session, avoiding repeated browser launch overhead.
 *
 * Usage:
 *   node tests/playwright/svg_batch_render.mjs <manifest_json> [chromium|firefox]
 *
 * The manifest JSON is a file containing an array:
 *   [{"svg_path": "/abs/path/to/file.svg", "output_png": "/abs/path/out.png"}, ...]
 *
 * Each SVG is rendered at 256x256 canvas (fit with object-fit: contain, white bg).
 * On completion writes a results JSON: [{svg_path, output_png, ok, error}].
 * The results JSON path is manifest_json + ".results.json".
 *
 * Run from repo root so node_modules/ resolves.
 */

import { chromium, firefox } from "playwright";
import path from "node:path";
import fs from "node:fs";

//============================================
function buildHtmlWrapper(svgPath) {
  // Embed the SVG inline as a base64 data URI to avoid file:// CORS quirks.
  const svgContent = fs.readFileSync(svgPath, "utf8");
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
async function renderBatch(manifest, engineName) {
  const engineMap = { chromium, firefox };
  const engine = engineMap[engineName];
  if (!engine) {
    throw new Error(`Unknown engine: ${engineName}. Use 'chromium' or 'firefox'.`);
  }

  const browser = await engine.launch({ headless: true });
  const results = [];

  try {
    // Use a single page object, navigating between renders to reduce overhead.
    const page = await browser.newPage({ viewport: { width: 256, height: 256 } });

    for (let i = 0; i < manifest.length; i++) {
      const { svg_path: svgPath, output_png: outputPng } = manifest[i];

      // Log progress every 50 items.
      if (i % 50 === 0) {
        process.stdout.write(`  [${i + 1}/${manifest.length}] ${path.basename(svgPath)}\n`);
      }

      try {
        if (!fs.existsSync(svgPath)) {
          results.push({ svg_path: svgPath, output_png: outputPng, ok: false, error: "SVG not found" });
          continue;
        }

        // Build HTML wrapper as a temp file next to output PNG.
        const tmpHtmlPath = outputPng + ".tmp.html";
        const htmlContent = buildHtmlWrapper(svgPath);
        fs.writeFileSync(tmpHtmlPath, htmlContent, "utf8");

        const fileUrl = `file://${path.resolve(tmpHtmlPath)}`;
        await page.goto(fileUrl, { waitUntil: "networkidle" });
        // Small settle delay for SVG rendering (gradients, fonts).
        await page.waitForTimeout(80);

        // Ensure output directory exists.
        fs.mkdirSync(path.dirname(outputPng), { recursive: true });
        await page.screenshot({ path: outputPng, fullPage: false });

        // Clean up temp HTML.
        try { fs.unlinkSync(tmpHtmlPath); } catch (_) {}

        results.push({ svg_path: svgPath, output_png: outputPng, ok: true, error: null });
      } catch (err) {
        results.push({ svg_path: svgPath, output_png: outputPng, ok: false, error: err.message });
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

//============================================
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: node svg_batch_render.mjs <manifest_json> [chromium|firefox]");
    process.exit(1);
  }

  const manifestPath = args[0];
  const engineName = args[1] || "chromium";

  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`Rendering ${manifest.length} SVGs with ${engineName}...`);

  const results = await renderBatch(manifest, engineName);

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`Done: ${ok} ok, ${fail} failed.`);

  // Write results JSON next to manifest.
  const resultsPath = manifestPath + ".results.json";
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Results: ${resultsPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
