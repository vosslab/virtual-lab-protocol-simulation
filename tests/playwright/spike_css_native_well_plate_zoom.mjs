/**
 * tests/playwright/spike_css_native_well_plate_zoom.mjs
 *
 * NEW1 well_plate_96_zoom spike: Lane 3 (browser proof) + Lane 4 (perf measurement).
 *
 * Empirically exercises the CSS-native layout adapter in a real Chromium browser.
 *
 * Pragmatic constraint: the production scene_runtime bundle is not directly
 * Playwright-loadable without build_github_pages.sh running first. So this
 * spike inlines a JS mirror of the adapter and feature flag and constructs
 * a minimal RuntimeWorld in-page. The mirror must be kept in sync with
 * src/scene_runtime/layout/css_native_adapter.ts and feature_flags.ts; this
 * divergence risk is acknowledged in the spike result document.
 *
 * Known gaps (not covered by this spike, require fuller integration):
 *   - Click-target empirical proof through the full production renderScene +
 *     dispatch pipeline.
 *   - ObjectStateChange proof through the full production pipeline.
 * Both require building the production bundle (build_github_pages.sh) and a
 * follow-up integration test in a later round.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Test harness: assertion accumulator
//============================================

const results = [];

function record(name, ok, detail) {
  const status = ok ? "PASS" : "FAIL";
  const line = `[${status}] ${name}` + (detail ? ` :: ${detail}` : "");
  console.log(line);
  results.push({ name: name, ok: ok, detail: detail || "" });
}

//============================================
// Build the in-page script that mirrors the adapter and exercises it.
//============================================

function buildInPageScript() {
  // JS mirror of src/scene_runtime/layout/css_native_adapter.ts for
  // in-browser execution. Update this mirror if the production module changes.
  // JS mirror of src/scene_runtime/layout/feature_flags.ts for the
  // override-aware enabled gate. Same sync rule applies.
  const inPage = `
		// ---- feature_flags mirror ----
		let __css_native_enabled = false;
		function is_enabled() { return __css_native_enabled; }
		function set_enabled(v) { __css_native_enabled = v; }

		// ---- css_native_adapter mirror ----
		const DEFAULT_REGION_VOCABULARY = [
			'rear_shelf',
			'work_surface',
			'front_tools',
			'instrument_station',
			'popup_layer'
		];

		function derive_region_list(placements) {
			const zone_set = new Set();
			for (const placement of placements) {
				if (placement.zone) {
					zone_set.add(placement.zone);
				}
			}
			if (zone_set.size === 0) {
				return DEFAULT_REGION_VOCABULARY.slice();
			}
			if (!zone_set.has('work_surface')) {
				zone_set.add('work_surface');
			}
			return Array.from(zone_set);
		}

		// Last-call scaffold node count, captured before teardown for measurement.
		let __last_scaffold_node_count = 0;

		function compute_scene_layout_css_native(world, scene_name, viewport_width, viewport_height) {
			if (typeof document === 'undefined') {
				throw new Error('compute_scene_layout_css_native: requires a DOM');
			}
			const scene = world.scenes[scene_name];
			if (!scene) {
				throw new Error("scene '" + scene_name + "' not found");
			}
			const placements = scene.placements || [];

			const scaffold = document.createElement('div');
			scaffold.className = 'scene-container scene--bench scene-mode--detail';
			scaffold.style.position = 'absolute';
			scaffold.style.left = '-99999px';
			scaffold.style.visibility = 'hidden';
			scaffold.style.width = viewport_width + 'px';
			scaffold.style.height = viewport_height + 'px';

			const region_list = derive_region_list(placements);

			const region_map = new Map();
			for (const region_name of region_list) {
				const region_el = document.createElement('div');
				region_el.className = 'region region--' + region_name;
				region_el.dataset.region = region_name;
				scaffold.appendChild(region_el);
				region_map.set(region_name, region_el);
			}

			const placement_els = new Map();
			const fallback_region = region_map.get('work_surface') || region_map.values().next().value;
			if (!fallback_region) {
				throw new Error('scaffold has no regions');
			}

			for (const placement of placements) {
				const declared_region = placement.zone;
				const host = region_map.get(declared_region) || fallback_region;
				const el = document.createElement('div');
				el.className = 'placement';
				el.dataset.placement = placement.placement_name;
				el.dataset.objectName = placement.object_name;
				host.appendChild(el);
				placement_els.set(placement.placement_name, el);
			}

			document.body.appendChild(scaffold);

			// Count scaffold nodes (regions + placements) before teardown.
			__last_scaffold_node_count = scaffold.querySelectorAll('*').length;

			const layouts = [];
			const scaffold_rect = scaffold.getBoundingClientRect();

			for (const placement of placements) {
				const el = placement_els.get(placement.placement_name);
				if (!el) {
					throw new Error("placement element not found for '" + placement.placement_name + "'");
				}
				const rect = el.getBoundingClientRect();
				const object_spec = world.objects[placement.object_name];
				const object_label = (object_spec && object_spec.label) ? object_spec.label : '';

				const x = Math.round(rect.left - scaffold_rect.left);
				const y = Math.round(rect.top - scaffold_rect.top);
				const width = Math.round(rect.width);
				const height = Math.round(rect.height);

				layouts.push({
					id: placement.placement_name,
					x: x,
					y: y,
					width: width,
					height: height,
					footprint: Math.round(width * height),
					tooltip: object_label,
					labelLines: object_label ? [object_label] : [],
					labelX: x,
					labelY: y + height + 10,
					labelWidth: width,
					labelMultiline: false
				});
			}

			document.body.removeChild(scaffold);

			return layouts;
		}

		// ---- minimal RuntimeWorld fixture ----
		const WORLD = {
			scenes: {
				well_plate_96_zoom: {
					scene_name: 'well_plate_96_zoom',
					workspace: 'bench',
					placements: [
						{
							placement_name: 'zoom_well_plate_96',
							object_name: 'well_plate_96',
							zone: 'work_surface'
						}
					]
				}
			},
			objects: {
				well_plate_96: {
					object_name: 'well_plate_96',
					label: '96-Well Plate (Zoomed)',
					kind: 'plate'
				}
			}
		};

		// Expose API for the test driver via window.
		window.__spike = {
			set_enabled: set_enabled,
			is_enabled: is_enabled,
			compute: function () {
				return compute_scene_layout_css_native(WORLD, 'well_plate_96_zoom', 1200, 900);
			},
			last_scaffold_node_count: function () { return __last_scaffold_node_count; },
			body_children: function () { return document.body.children.length; }
		};
	`;
  return inPage;
}

//============================================
// Main
//============================================

async function main() {
  const stylesDir = path.join(
    REPO_ROOT,
    "experiments",
    "css_native_layout",
    "styles",
  );

  const outDir = path.join(REPO_ROOT, "test-results", "new1_spike");
  fs.mkdirSync(outDir, { recursive: true });
  const screenshotPath = path.join(outDir, "lane3_browser_proof.png");

  // Chromium blocks file:// stylesheets from a data: URL host. Write the
  // host HTML next to the stylesheets so the <link> uses a same-origin
  // relative path under file://.
  const hostHtml =
    "" +
    "<!DOCTYPE html>\n" +
    '<html><head><meta charset="utf-8">\n' +
    '<link rel="stylesheet" href="bench.css">\n' +
    '<link rel="stylesheet" href="hood.css">\n' +
    '<link rel="stylesheet" href="instrument.css">\n' +
    "</head><body>\n" +
    '<div id="render-root"></div>\n' +
    "</body></html>\n";
  const hostHtmlPath = path.join(stylesDir, "_spike_host.html");
  fs.writeFileSync(hostHtmlPath, hostHtml);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });

  const hostUrl = "file://" + hostHtmlPath;
  await page.goto(hostUrl);
  await page.waitForTimeout(200);

  // Inject the mirror module.
  await page.addScriptTag({ content: buildInPageScript() });

  //============================================
  // LANE 3 BROWSER PROOF
  //============================================

  console.log("--- LANE 3: BROWSER PROOF ---");

  // Body children before any call (used for DOM-leak check in Lane 4).
  const bodyBefore = await page.evaluate(() => window.__spike.body_children());

  // Enable feature flag and call adapter once.
  const lane3 = await page.evaluate(() => {
    window.__spike.set_enabled(true);
    const enabled = window.__spike.is_enabled();
    const layouts = window.__spike.compute();
    const nodes = window.__spike.last_scaffold_node_count();
    return { enabled: enabled, layouts: layouts, nodes: nodes };
  });

  record(
    "lane3.flag_enabled",
    lane3.enabled === true,
    "is_enabled() returned " + lane3.enabled,
  );
  record(
    "lane3.result_is_array_of_length_1",
    Array.isArray(lane3.layouts) && lane3.layouts.length === 1,
    "length=" + (lane3.layouts ? lane3.layouts.length : "undefined"),
  );

  const item = (lane3.layouts && lane3.layouts[0]) || {};
  record(
    "lane3.width_positive",
    typeof item.width === "number" && item.width > 0,
    "width=" + item.width,
  );
  record(
    "lane3.height_positive",
    typeof item.height === "number" && item.height > 0,
    "height=" + item.height,
  );
  record("lane3.x_is_number", typeof item.x === "number", "x=" + item.x);
  record("lane3.y_is_number", typeof item.y === "number", "y=" + item.y);
  record(
    "lane3.id_matches_placement_name",
    item.id === "zoom_well_plate_96",
    "id=" + item.id,
  );

  await page.screenshot({ path: screenshotPath, fullPage: false });
  record(
    "lane3.screenshot_saved",
    fs.existsSync(screenshotPath),
    "path=" + screenshotPath,
  );

  //============================================
  // LANE 4 PERF MEASUREMENT
  //============================================

  console.log("--- LANE 4: PERF MEASUREMENT ---");

  const perf = await page.evaluate(() => {
    const ITERATIONS = 50;
    const samples = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      window.__spike.compute();
      const t1 = performance.now();
      samples.push(t1 - t0);
    }
    const sorted = samples.slice().sort(function (a, b) {
      return a - b;
    });
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = sorted[sorted.length - 1];
    return {
      samples: samples,
      median: median,
      p95: p95,
      max: max,
      nodes: window.__spike.last_scaffold_node_count(),
      bodyAfter: window.__spike.body_children(),
    };
  });

  const bodyDelta = perf.bodyAfter - bodyBefore;

  const medianMs = perf.median.toFixed(3);
  const p95Ms = perf.p95.toFixed(3);
  const maxMs = perf.max.toFixed(3);

  console.log(
    "PERF: median_ms=" +
      medianMs +
      " p95_ms=" +
      p95Ms +
      " max_ms=" +
      maxMs +
      " nodes_per_call=" +
      perf.nodes +
      " body_children_delta=" +
      bodyDelta,
  );

  // DOM-leak assertion: scaffold should be fully torn down after each call,
  // so body.children count must be unchanged after 50 iterations.
  record(
    "lane4.no_dom_leak",
    bodyDelta === 0,
    "body_children_delta=" + bodyDelta,
  );

  // Scaffold node count: for 1-placement fixture with the fallback region
  // vocabulary collapsed to {work_surface}, we expect 1 region + 1 placement = 2.
  // The Lane 3 path uses a declared zone, so derive_region_list returns just
  // work_surface (the only declared zone), yielding 2 nodes total.
  // If derive_region_list ever produced the 5-region default fallback, the
  // count would be 5 + 1 = 6. Accept either as a sanity range.
  record(
    "lane4.scaffold_node_count_sane",
    perf.nodes >= 2 && perf.nodes <= 6,
    "nodes_per_call=" + perf.nodes,
  );

  // Perf sanity: median should be well under 50ms in a headless Chromium.
  record(
    "lane4.median_under_50ms",
    perf.median < 50.0,
    "median_ms=" + medianMs,
  );

  await browser.close();

  // Tidy the temporary host HTML now that the browser is closed.
  try {
    fs.unlinkSync(hostHtmlPath);
  } catch (_e) {
    /* best effort */
  }

  //============================================
  // Summary
  //============================================

  const failed = results.filter(function (r) {
    return !r.ok;
  });
  console.log("");
  console.log(
    "SUMMARY: " +
      (results.length - failed.length) +
      "/" +
      results.length +
      " assertions passed",
  );
  if (failed.length > 0) {
    console.log("FAILED assertions:");
    for (const f of failed) {
      console.log("  - " + f.name + " :: " + f.detail);
    }
  }

  // Stash perf numbers for the results doc.
  const summary = {
    results: results,
    perf: {
      median_ms: medianMs,
      p95_ms: p95Ms,
      max_ms: maxMs,
      nodes_per_call: perf.nodes,
      body_children_delta: bodyDelta,
    },
    screenshot: screenshotPath,
    lane3_layout: item,
  };
  const summaryPath = path.join(outDir, "spike_run_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log("Summary written to " + summaryPath);

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error("Test errored:", err);
  process.exit(1);
});
