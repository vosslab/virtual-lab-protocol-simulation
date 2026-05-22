// =====================================================================
// No-Crop Audit: detect VISIBLE SVG cropping or aspect distortion
// =====================================================================
//
// For each canonical template scene, this script:
//   1. Opens the scene HTML headless
//   2. For each .placement, measures:
//      - placement bbox + computed overflow
//      - .object-graphic bbox
//      - img/svg natural intrinsic size and rendered bbox
//   3. Classifies each placement as ok | cropped | distorted | tiny | offscreen
//   4. Writes a JSON results file and per-incident annotated PNG screenshots
//      (with red box on the offending placement)
//
// Hard rule under audit: SVG assets must never be visually clipped or
// aspect-distorted. object-fit:contain prevents visual clip but cannot
// prevent an asset that has been forced narrower than its natural aspect
// from looking distorted; we flag both.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const TEMPLATES_DIR = path.join(
  REPO_ROOT,
  "experiments/css_native_layout/templates",
);
const OUT_DIR_ASSETS = path.join(
  REPO_ROOT,
  "docs/active_plans/new2_no_crop_audit_assets",
);
const OUT_JSON = path.join(__dirname, "no_crop_audit_results.json");

const SCENES = [
  "bench_basic",
  "cell_counter_basic",
  "crowded_bench_dense",
  "drug_dilution_plate_workspace",
  "drug_dilution_workspace_dense",
  "electrophoresis_bench",
  "hood_basic",
  "microscope_basic",
  "staining_bench",
  "well_plate_96_zoom",
];

// thresholds
const ASPECT_DISTORTION_PCT = 10; // > this counts as distorted
const TINY_AREA_PCT = 30; // rendered < 30% of natural area = "tiny / forced shrink"
const CROP_TOLERANCE_PX = 1; // overflow > this px counts as visible crop

function classify(metrics) {
  const issues = [];
  // 1. Off-card visible overflow (img bbox extends beyond placement bbox)
  const ovTop = metrics.placement_y - metrics.img_y;
  const ovBottom =
    metrics.img_y + metrics.img_h - (metrics.placement_y + metrics.placement_h);
  const ovLeft = metrics.placement_x - metrics.img_x;
  const ovRight =
    metrics.img_x + metrics.img_w - (metrics.placement_x + metrics.placement_w);
  const sides = [];
  if (ovTop > CROP_TOLERANCE_PX) sides.push("top");
  if (ovBottom > CROP_TOLERANCE_PX) sides.push("bottom");
  if (ovLeft > CROP_TOLERANCE_PX) sides.push("left");
  if (ovRight > CROP_TOLERANCE_PX) sides.push("right");
  if (sides.length > 0 && metrics.placement_overflow === "hidden") {
    issues.push({ type: "cropped", sides });
  } else if (sides.length > 0) {
    issues.push({ type: "off-card", sides });
  }

  // 2. Aspect distortion (rendered aspect deviates from natural by > threshold)
  if (
    metrics.natural_w > 0 &&
    metrics.natural_h > 0 &&
    metrics.img_w > 0 &&
    metrics.img_h > 0
  ) {
    const natAspect = metrics.natural_w / metrics.natural_h;
    const renAspect = metrics.img_w / metrics.img_h;
    const aspectPct = (Math.abs(renAspect - natAspect) / natAspect) * 100;
    if (aspectPct > ASPECT_DISTORTION_PCT) {
      issues.push({
        type: "distorted",
        aspect_mismatch_pct: Math.round(aspectPct * 10) / 10,
      });
    }
  }

  // 3. Tiny rendering (object-fit contain shrunk artwork to <30% of natural area)
  if (metrics.natural_w > 0 && metrics.natural_h > 0) {
    const naturalArea = metrics.natural_w * metrics.natural_h;
    const renderedArea = metrics.img_w * metrics.img_h;
    const areaPct = (renderedArea / naturalArea) * 100;
    if (areaPct < TINY_AREA_PCT) {
      issues.push({
        type: "too-small",
        area_pct: Math.round(areaPct * 10) / 10,
      });
    }
  }

  return issues;
}

async function inspectScene(page, scene) {
  const htmlPath = path.join(TEMPLATES_DIR, `${scene}.html`);
  const fileUrl = "file://" + htmlPath;
  await page.goto(fileUrl, { waitUntil: "load" });
  await page.waitForTimeout(200);

  const data = await page.evaluate(() => {
    const out = [];
    const placements = document.querySelectorAll(".placement");
    for (const p of placements) {
      const pname =
        p.getAttribute("data-placement-name") ||
        p.getAttribute("data-placement") ||
        "";
      const oname = p.getAttribute("data-object-name") || "";
      const pBox = p.getBoundingClientRect();
      const pStyle = window.getComputedStyle(p);
      const graphic = p.querySelector(".object-graphic");
      const img = p.querySelector(".object-graphic img, .object-graphic svg");
      if (!img) continue;
      const iBox = img.getBoundingClientRect();
      let natW = 0;
      let natH = 0;
      if (img.tagName === "IMG") {
        natW = img.naturalWidth || 0;
        natH = img.naturalHeight || 0;
      } else if (img.tagName === "svg" || img.tagName === "SVG") {
        const vb = img.viewBox && img.viewBox.baseVal;
        if (vb) {
          natW = vb.width;
          natH = vb.height;
        }
      }
      const gBox = graphic ? graphic.getBoundingClientRect() : null;
      out.push({
        placement_name: pname,
        object_name: oname,
        placement_x: pBox.x,
        placement_y: pBox.y,
        placement_w: pBox.width,
        placement_h: pBox.height,
        placement_overflow: pStyle.overflow,
        placement_overflowX: pStyle.overflowX,
        placement_overflowY: pStyle.overflowY,
        graphic_x: gBox ? gBox.x : null,
        graphic_y: gBox ? gBox.y : null,
        graphic_w: gBox ? gBox.width : null,
        graphic_h: gBox ? gBox.height : null,
        img_tag: img.tagName,
        img_src: img.getAttribute("src") || img.getAttribute("data-src") || "",
        img_x: iBox.x,
        img_y: iBox.y,
        img_w: iBox.width,
        img_h: iBox.height,
        natural_w: natW,
        natural_h: natH,
      });
    }
    return out;
  });

  // classify and (when violating) save annotated screenshot
  const violations = [];
  for (const m of data) {
    const issues = classify(m);
    if (issues.length === 0) continue;
    const safe = m.placement_name.replace(/[^a-z0-9_-]/gi, "_");
    const shotName = `${scene}__${safe}.png`;
    const shotPath = path.join(OUT_DIR_ASSETS, shotName);
    // Draw a red box overlay on the offending placement, then full-page screenshot
    await page.evaluate(
      ({ name }) => {
        // remove previous outlines
        document
          .querySelectorAll(".__crop_outline")
          .forEach((el) => el.remove());
        const sel = `.placement[data-placement-name="${name}"]`;
        const el = document.querySelector(sel);
        if (!el) return;
        const box = el.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.className = "__crop_outline";
        overlay.style.position = "absolute";
        overlay.style.left = `${window.scrollX + box.left - 3}px`;
        overlay.style.top = `${window.scrollY + box.top - 3}px`;
        overlay.style.width = `${box.width + 6}px`;
        overlay.style.height = `${box.height + 6}px`;
        overlay.style.border = "3px solid red";
        overlay.style.outline = "3px solid rgba(255,255,0,0.6)";
        overlay.style.pointerEvents = "none";
        overlay.style.zIndex = "9999";
        const tag = document.createElement("div");
        tag.textContent = name;
        tag.style.position = "absolute";
        tag.style.left = "0";
        tag.style.top = "-22px";
        tag.style.background = "red";
        tag.style.color = "white";
        tag.style.font = "bold 12px sans-serif";
        tag.style.padding = "2px 6px";
        tag.style.whiteSpace = "nowrap";
        overlay.appendChild(tag);
        document.body.appendChild(overlay);
      },
      { name: m.placement_name },
    );
    await page.screenshot({ path: shotPath, fullPage: false });
    violations.push({ scene, ...m, issues, screenshot: shotName });
  }

  // remove overlays before next scene
  await page.evaluate(() => {
    document.querySelectorAll(".__crop_outline").forEach((el) => el.remove());
  });

  return { scene, total_placements: data.length, violations };
}

async function main() {
  if (!fs.existsSync(OUT_DIR_ASSETS))
    fs.mkdirSync(OUT_DIR_ASSETS, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  const results = [];
  for (const scene of SCENES) {
    console.log(`scene: ${scene}`);
    const r = await inspectScene(page, scene);
    console.log(
      `  placements=${r.total_placements} violations=${r.violations.length}`,
    );
    results.push(r);
  }
  await browser.close();
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      { generated_at: new Date().toISOString(), results },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${OUT_JSON}`);
  let total = 0;
  for (const r of results) total += r.violations.length;
  console.log(`Total cropping/distortion incidents: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
