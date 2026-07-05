// tests/playwright/material_render_capture.mjs
//
// Render every emitted scene through the real production scene viewer
// (dist/scene_viewer.html, same page tools/scene_to_png.mjs renders) and
// collect, for every rendered object-level fill overlay ([data-overlay="fill"],
// the bottom-anchored fill_height() overlay from scene_item.tsx), a BEFORE
// (overlay visible) and AFTER (overlay hidden) screenshot of the same scene.
// No object is named here and no state is written: every object renders at
// its OWN authored default state, so this reads the content that already
// exists (content-is-the-fixture, docs/specs/NO_FIXTURE_POLICY.md), never a
// synthetic scenario.
//
// Why before/after rather than a single flat-color match: the overlay's
// resolved fill can be a translucent color (the neutral "no material"
// fallback, rgba(120,120,120,0.35)) composited OVER the base asset's own
// artwork, so the rendered pixel is a per-pixel BLEND of the overlay color
// and whatever glass/background color sits beneath it at that point -- there
// is no single flat RGB triple every filled pixel matches. Diffing the same
// item's bbox with the overlay hidden vs shown isolates exactly the pixels
// the overlay itself painted (glass, background, outline, and label pixels
// are identical in both shots and drop out of the diff by construction; only
// a thin anti-aliased edge band partially survives, which is accounted for
// by tests/e2e/e2e_material_render.py's documented per-channel diff
// tolerance), independent of whether that color happens to be opaque or
// translucent.
//
// An item can carry MORE than one fill overlay (an object tracking two
// independent liquid levels, e.g. an electrophoresis tank's inner/outer
// chamber). Each distinct data-overlay-field gets its OWN isolated "after"
// screenshot (only that field's overlays hidden, siblings left visible), so
// two stacked overlays on one item never get diffed against each other.
//
// Companion analysis lives in tests/e2e/e2e_material_render.py: this script
// only captures pixels + DOM facts; PIL-based pixel classification and the
// baseline compare happen there.
//
// Output (all under the directory passed as argv[2]):
//   capture.json  -- {generated_at, viewport, scenes:[{scene, png_before, items}]}
//                    each item carries its own png_after (per driving field).
//   <scene_name>.png                    -- full-viewport shot, all overlays visible
//   <scene_name>.nofill_<field>.png     -- same scene, only <field>'s overlay(s) hidden
//
// Run:
//   node --import tsx tests/playwright/material_render_capture.mjs <out_dir>

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DIST_DIR = path.join(REPO_ROOT, "dist");
const MANIFEST_PATH = path.join(REPO_ROOT, "generated", "scene_manifest.json");

// Fixed capture viewport. Item bboxes are read straight off getBoundingClientRect
// in this same coordinate frame, so no clip-rect math is needed to map a bbox
// back onto its screenshot.
const VIEWPORT = { width: 1920, height: 1080 };
const READY_TIMEOUT_MS = 5000;
const SETTLE_MS = 150;

const MIME_MAP = {
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

//============================================
// Inline static server for dist/
//============================================

function start_server(dist_dir) {
  const server = http.createServer((req, res) => {
    const url_path = req.url ? req.url.split("?")[0] : "/";
    const norm = url_path === "/" ? "/index.html" : url_path;
    const file_path = path.join(dist_dir, norm);
    const ext = path.extname(file_path);
    fs.readFile(file_path, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`Not found: ${norm}`);
        return;
      }
      res.writeHead(200, { "Content-Type": MIME_MAP[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

//============================================
// Manifest
//============================================

function read_emitted_scene_names() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Scene manifest not found: ${MANIFEST_PATH}\nRun: bash build_github_pages.sh`);
  }
  const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  return parsed.scenes.filter((s) => s.outcome === "emitted").map((s) => s.name);
}

//============================================
// One scene: load, wait, collect fill overlays, screenshot
//============================================

// Collects every [data-overlay="fill"] element's parent-item geometry + the
// live computed fill color + its driving field name (data-overlay-field).
// Runs entirely inside the page; no object name or field name is hardcoded
// on the Node side. A single item CAN carry more than one fill overlay (an
// object tracking two independent liquid levels, e.g. an electrophoresis
// tank's inner/outer chamber); the field name is what disambiguates them.
async function collect_fill_items(page) {
  return page.evaluate(() => {
    const fills = Array.from(document.querySelectorAll('[data-overlay="fill"]'));
    const out = [];
    for (const fill_el of fills) {
      const item_el = fill_el.parentElement;
      if (item_el === null) continue;
      const rect = item_el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      out.push({
        placement_name: item_el.getAttribute("data-placement-name") ?? "",
        object_name: item_el.getAttribute("data-object-name") ?? "",
        field_name: fill_el.getAttribute("data-overlay-field") ?? "",
        bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        css_color: window.getComputedStyle(fill_el).backgroundColor,
      });
    }
    return out;
  });
}

// Hides every fill overlay whose data-overlay-field matches field_name (no
// layout shift: the overlay is position:absolute/pointer-events:none, so
// hiding it never moves a sibling). Overlays for OTHER fields on the same
// item are left visible, so a multi-field item's fields can each be isolated
// in their own before/after pair.
async function set_field_overlays_hidden(page, field_name, hidden) {
  await page.evaluate(
    ({ field, hide }) => {
      const fills = Array.from(
        document.querySelectorAll(`[data-overlay="fill"][data-overlay-field="${field}"]`),
      );
      for (const el of fills) {
        el.style.display = hide ? "none" : "";
      }
    },
    { field: field_name, hide: hidden },
  );
}

// Sanitizes a field name into a filesystem-safe filename fragment.
function sanitize_for_filename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function capture_scene(page, base_url, scene_name, out_dir) {
  const url = `${base_url}/scene_viewer.html?scene=${encodeURIComponent(scene_name)}`;
  await page.goto(url, { waitUntil: "load" });
  // state:"attached" (not the default "visible") because #scene-root itself
  // reports as Playwright-hidden even once ready; the ready marker is a DOM
  // attribute, not a visibility contract.
  await page.waitForSelector("#scene-root[data-viewer-ready='true']", {
    timeout: READY_TIMEOUT_MS,
    state: "attached",
  });
  await page.waitForTimeout(SETTLE_MS);

  const items = await collect_fill_items(page);
  if (items.length === 0) {
    return { scene: scene_name, png_before: null, items: [] };
  }

  const png_before = `${scene_name}.png`;
  await page.screenshot({ path: path.join(out_dir, png_before) });

  // One isolated "after" screenshot per DISTINCT driving field in this scene:
  // hide only that field's overlays, shoot, then restore before the next one.
  const distinct_fields = [...new Set(items.map((it) => it.field_name))];
  const png_after_by_field = {};
  for (const field_name of distinct_fields) {
    await set_field_overlays_hidden(page, field_name, true);
    const png_after = `${scene_name}.nofill_${sanitize_for_filename(field_name)}.png`;
    await page.screenshot({ path: path.join(out_dir, png_after) });
    await set_field_overlays_hidden(page, field_name, false);
    png_after_by_field[field_name] = png_after;
  }

  const items_with_after = items.map((it) => ({
    ...it,
    png_after: png_after_by_field[it.field_name],
  }));

  return { scene: scene_name, png_before, items: items_with_after };
}

//============================================
// Entry point
//============================================

async function main() {
  const out_dir = process.argv[2];
  if (!out_dir) {
    throw new Error("Usage: material_render_capture.mjs <out_dir>");
  }
  if (!fs.existsSync(path.join(DIST_DIR, "scene_viewer.html"))) {
    throw new Error("dist/scene_viewer.html not found. Run: bash build_github_pages.sh");
  }
  fs.mkdirSync(out_dir, { recursive: true });

  const scene_names = read_emitted_scene_names();
  console.log(`Capturing material fill overlays across ${scene_names.length} emitted scenes...`);

  const server = await start_server(DIST_DIR);
  const address = server.address();
  const base_url = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });

  const scenes = [];
  try {
    for (const scene_name of scene_names) {
      const result = await capture_scene(page, base_url, scene_name, out_dir);
      scenes.push(result);
      console.log(`  ${scene_name}: ${result.items.length} fill overlay(s)`);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const payload = {
    generated_at: new Date().toISOString(),
    viewport: VIEWPORT,
    scenes,
  };
  fs.writeFileSync(path.join(out_dir, "capture.json"), JSON.stringify(payload, null, 2));

  const total_items = scenes.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`Capture done: ${total_items} fill overlay(s) across ${scenes.length} scene(s).`);
}

main().catch((err) => {
  console.error("material_render_capture error:", err);
  process.exit(1);
});
