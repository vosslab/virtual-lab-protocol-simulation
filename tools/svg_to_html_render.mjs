// Render an SVG asset across background swatches and screenshot it to PNG.
//
// Inlines the SVG the same way the app injects it (innerHTML) and renders with
// Playwright Firefox (Gecko), the engine the project is viewed in, so the
// screenshot matches what shows in the app. The multi-swatch tiles (white, tan,
// gray, dark, magenta) make transparency holes, mattes, and engine-specific
// paint bugs obvious -- a hole shows the swatch color through the artwork.
//
// Run from the repo root so Node resolves the project's playwright install.
//
// Usage: node tools/svg_to_html_render.mjs <input.svg> [--no-open]

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { firefox } from "playwright";

// contrasting swatches for hole and matte hunting (tan is the scene background)
const SWATCHES = [
  ["white", "#ffffff"],
  ["tan", "#d9cbb2"],
  ["gray", "#808080"],
  ["dark", "#222222"],
  ["magenta", "#ff00ff"],
];

//============================================
function parseArgs(argv) {
  const rest = argv.slice(2);
  const doOpen = !rest.includes("--no-open");
  const inputFile = rest.find((a) => !a.startsWith("-"));
  if (!inputFile) {
    throw new Error("usage: node tools/svg_to_html_render.mjs <input.svg> [--no-open]");
  }
  return { inputFile, doOpen };
}

//============================================
function readSvgMarkup(svgPath) {
  const text = fs.readFileSync(svgPath, "utf-8");
  // drop any leading XML declaration or DOCTYPE before the root <svg>
  const index = text.indexOf("<svg");
  if (index < 0) {
    throw new Error(`No <svg> root element found in ${svgPath}`);
  }
  return text.slice(index);
}

//============================================
function namespaceSvgIds(svgMarkup, suffix) {
  // append a suffix to every id and its references so the same SVG can be
  // inlined multiple times without id collisions (for example clipPath id="a")
  const ids = new Set();
  for (const match of svgMarkup.matchAll(/id="([^"]+)"/g)) {
    ids.add(match[1]);
  }
  let out = svgMarkup;
  for (const name of ids) {
    const next = name + suffix;
    out = out.split(`id="${name}"`).join(`id="${next}"`);
    out = out.split(`url(#${name})`).join(`url(#${next})`);
    out = out.split(`href="#${name}"`).join(`href="#${next}"`);
  }
  return out;
}

//============================================
function buildAllHtml(svgMarkup, title) {
  const parts = [];
  parts.push("<!doctype html>");
  parts.push("<html><head><meta charset='utf-8'>");
  parts.push(`<title>${title}</title>`);
  // explicit width so each viewBox-only svg fills its tile without collapsing
  parts.push("<style>svg{width:300px;height:auto;display:block}</style></head>");
  parts.push("<body style='margin:0;font-family:sans-serif'>");
  parts.push("<div style='display:flex;flex-wrap:wrap'>");
  SWATCHES.forEach(([name, color], index) => {
    const tileSvg = namespaceSvgIds(svgMarkup, `_t${index}`);
    // tile tall enough to show the full asset (viewBox is taller than wide);
    // no overflow clip so a defect at the very top or bottom is never hidden
    const cellStyle =
      `width:320px;height:420px;background:${color};` + "display:flex;flex-direction:column";
    const label = `<div style='padding:4px;font-size:12px;background:#fff'>${name} ${color}</div>`;
    const svgBox =
      "<div style='flex:1;display:flex;align-items:center;justify-content:center;" +
      `padding:8px'>${tileSvg}</div>`;
    parts.push(`<div style="${cellStyle}">${label}${svgBox}</div>`);
  });
  parts.push("</div>");
  parts.push("</body></html>");
  return parts.join("\n");
}

//============================================
async function renderToPng(htmlPath, pngPath) {
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 760 } });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  // full page so every swatch tile is captured in one image
  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();
}

//============================================
async function main() {
  const { inputFile, doOpen } = parseArgs(process.argv);
  const svgMarkup = readSvgMarkup(inputFile);
  const title = path.basename(inputFile);
  const stem = path.basename(inputFile, path.extname(inputFile));
  const htmlPath = path.join(process.cwd(), `${stem}_render.html`);
  const pngPath = path.join(process.cwd(), `${stem}_render.png`);

  const html = buildAllHtml(svgMarkup, title);
  fs.writeFileSync(htmlPath, html, "utf-8");
  await renderToPng(htmlPath, pngPath);
  console.log(`wrote ${pngPath}`);

  // open the PNG on macOS so the render is immediate
  if (doOpen && process.platform === "darwin") {
    spawn("open", [pngPath], { detached: true, stdio: "ignore" }).unref();
  }
}

main();
