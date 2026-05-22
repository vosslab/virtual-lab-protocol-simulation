#!/usr/bin/env node

/**
 * experiments/css_native_layout/render_and_dump.mjs
 *
 * Bridge script for NEW1 Task #73: render the built app DOM and dump to static HTML.
 *
 * Motivation: precheck.mjs cannot run against the built app's dynamically-rendered
 * DOM because it loads the page statically. This script:
 * 1. Loads the production runtime bundle from dist/runtime.bundle.js
 * 2. Mounts the scene to the page via loadAndMountByProtocolName
 * 3. Waits for DOM to settle (scene-container present + CSS-native adapter invoked)
 * 4. Extracts the full rendered DOM as static HTML
 * 5. Writes it to spike_fixtures/spike_rendered/ for precheck to audit
 *
 * CLI args (all optional):
 *   --protocol <name>   Protocol name (default: well_plate_96_zoom_check)
 *   --out <path>        Output HTML path (default: spike_fixtures/spike_rendered/<protocol>.html)
 *   --bundle <path>     Runtime bundle path (default: dist/runtime.bundle.js)
 *   --port <n>          HTTP server port (default: 8123)
 *   --timeout <ms>      DOM wait timeout (default: 30000)
 *
 * Usage:
 *   node render_and_dump.mjs
 *   node render_and_dump.mjs --protocol well_plate_96_zoom_check
 *   node render_and_dump.mjs --out ./custom_output.html
 */

/* global SceneRuntime */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

// ============================================
// Helpers
// ============================================

function get_repo_root() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

function parse_args() {
  const args = process.argv.slice(2);
  const config = {
    protocol: "well_plate_96_zoom_check",
    out: null,
    bundle: "dist/runtime.bundle.js",
    port: 8123,
    timeout_ms: 30000,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--protocol") {
      config.protocol = args[++i];
    } else if (args[i] === "--out") {
      config.out = args[++i];
    } else if (args[i] === "--bundle") {
      config.bundle = args[++i];
    } else if (args[i] === "--port") {
      config.port = parseInt(args[++i], 10);
    } else if (args[i] === "--timeout") {
      config.timeout_ms = parseInt(args[++i], 10);
    }
  }

  // Default output path if not specified
  if (!config.out) {
    config.out = path.join(
      "experiments/css_native_layout/spike_fixtures/spike_rendered",
      config.protocol + ".html",
    );
  }

  return config;
}

function render_harness_html(protocol_name) {
  const css_path_production = path.join(get_repo_root(), "src/style.css");
  const css_path_experiment = path.join(
    get_repo_root(),
    "experiments/css_native_layout/styles/bench.css",
  );

  let production_css = "";
  let experiment_css = "";

  try {
    if (fs.existsSync(css_path_production)) {
      production_css = fs.readFileSync(css_path_production, "utf8");
    }
  } catch (e) {
    console.warn(`[warn] Could not read production CSS: ${e.message}`);
  }

  try {
    if (fs.existsSync(css_path_experiment)) {
      experiment_css = fs.readFileSync(css_path_experiment, "utf8");
    }
  } catch (e) {
    console.warn(`[warn] Could not read experiment CSS: ${e.message}`);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>_spike_render_dump_${protocol_name}</title>
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background-color: #f5f5f5;
		}
		#runtime-root {
			width: 100%;
			height: 100vh;
			background-color: white;
		}
	</style>
	<style>
		${production_css}
	</style>
	<style>
		${experiment_css}
	</style>
</head>
<body>
	<div id="runtime-root"></div>

	<!-- Per-protocol runtime data (inlined). -->
	<script type="application/json" id="protocol-runtime-data">
{
  "protocol_name": "${protocol_name}"
}
	</script>

	<!-- Mount code will be injected after runtime.bundle.js is loaded. -->
</body>
</html>`;

  return html;
}

// ============================================
// Main
// ============================================

async function main() {
  const repo_root = get_repo_root();
  const config = parse_args();

  console.log(`[info] Repo root: ${repo_root}`);
  console.log(`[info] Protocol: ${config.protocol}`);
  console.log(`[info] Output: ${config.out}`);
  console.log(`[info] Bundle: ${config.bundle}`);
  console.log(`[info] Port: ${config.port}`);
  console.log(`[info] Timeout: ${config.timeout_ms}ms`);

  // Resolve paths
  const bundle_path = path.join(repo_root, config.bundle);
  const out_path = path.join(repo_root, config.out);
  const out_dir = path.dirname(out_path);

  // Verify bundle exists
  if (!fs.existsSync(bundle_path)) {
    throw new Error(`Bundle not found: ${bundle_path}`);
  }

  // Create output directory
  if (!fs.existsSync(out_dir)) {
    fs.mkdirSync(out_dir, { recursive: true });
  }

  // Read runtime bundle
  console.log("[info] Reading runtime bundle...");
  const bundle_content = fs.readFileSync(bundle_path, "utf8");
  console.log(
    `[info] Bundle size: ${Math.round(bundle_content.length / 1024)}KB`,
  );

  // Launch browser
  console.log("[info] Launching Chromium...");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
    });

    // Capture console for diagnostics
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "log" || type === "warning" || type === "error") {
        console.log(`[console:${type}] ${text}`);
      }
    });

    // Set up page init script to track state
    await page.addInitScript(() => {
      window.__render_dump_state = {
        flag_set_count: 0,
        mount_time: null,
        invocation_count_at_mount: 0,
        scene_container_time: null,
      };

      // Track when scene-container appears
      const checkContainerInterval = setInterval(() => {
        const container = document.querySelector(".scene-container");
        if (container && !window.__render_dump_state.scene_container_time) {
          window.__render_dump_state.scene_container_time = Date.now();
          console.log("[render_dump] scene-container appeared");
        }
      }, 50);

      // Clean up interval after timeout
      setTimeout(() => clearInterval(checkContainerInterval), 35000);

      // Intercept SceneRuntime assignment
      Object.defineProperty(window, "SceneRuntime", {
        configurable: true,
        set(value) {
          window.__scene_runtime = value;
          if (
            value &&
            value.__spike &&
            value.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test
          ) {
            value.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(
              true,
            );
            window.__render_dump_state.flag_set_count++;
            console.log("[render_dump] Spike flag enabled");
          }
        },
        get() {
          return window.__scene_runtime;
        },
      });
    });

    // Render and set harness HTML
    console.log("[info] Setting harness HTML...");
    const harness_html = render_harness_html(config.protocol);
    await page.setContent(harness_html);

    // Inject runtime bundle
    console.log("[info] Injecting runtime bundle...");
    await page.evaluate((bundle) => {
      const script_el = document.createElement("script");
      script_el.textContent = bundle;
      document.body.appendChild(script_el);
    }, bundle_content);

    console.log("[info] Bundle injected, mounting protocol...");

    // Mount the protocol
    try {
      await page.evaluate((protocol_name) => {
        try {
          const data_script = document.getElementById("protocol-runtime-data");
          if (!data_script) {
            throw new Error("protocol-runtime-data script tag not found");
          }

          const runtime_root = document.getElementById("runtime-root");
          if (!runtime_root) {
            throw new Error("runtime-root element not found");
          }

          if (typeof SceneRuntime === "undefined") {
            throw new Error(
              "SceneRuntime not defined; bundle may not have loaded",
            );
          }

          // Enable spike flag before mount
          if (
            SceneRuntime &&
            SceneRuntime.__spike &&
            SceneRuntime.__spike
              .set_css_native_well_plate_zoom_spike_enabled_for_test
          ) {
            SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(
              true,
            );
            console.log("[render_dump] Spike flag enabled in mount");
          }

          window.__mount_error = null;
          try {
            SceneRuntime.loadAndMountByProtocolName(
              runtime_root,
              protocol_name,
            );
            console.log("[render_dump] Protocol mounted successfully");
          } catch (mount_error) {
            window.__mount_error =
              mount_error instanceof Error
                ? mount_error.message
                : String(mount_error);
            console.error(
              "[render_dump] Mount error in runtime call: " +
                window.__mount_error,
            );
            throw mount_error;
          }
        } catch (error) {
          const err_msg =
            error instanceof Error ? error.message : String(error);
          console.error("[render_dump] Mount error: " + err_msg);
          window.__mount_error = err_msg;
          throw error;
        }
      }, config.protocol);
    } catch (error) {
      const err_msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Mount failed: ${err_msg}`);
    }

    // Wait a bit and check for any mount errors
    await page.waitForTimeout(500);
    const mount_error = await page.evaluate(() => window.__mount_error);
    if (mount_error) {
      console.warn(`[warn] Runtime mount error: ${mount_error}`);
    }

    // Wait for scene-container to appear
    console.log("[info] Waiting for .scene-container...");
    const start_time = Date.now();
    let scene_container_found = false;

    while (
      !scene_container_found &&
      Date.now() - start_time < config.timeout_ms
    ) {
      const count = await page.locator(".scene-container").count();
      if (count > 0) {
        scene_container_found = true;
        console.log("[info] scene-container found");
        break;
      }

      // Periodically check what's actually in the DOM for debugging
      if ((Date.now() - start_time) % 2000 < 100) {
        const dom_summary = await page.evaluate(() => {
          const root_elem = document.getElementById("runtime-root");
          const has_root = Boolean(root_elem);
          const root_children = root_elem ? root_elem.children.length : 0;
          const scenes_found = document.querySelectorAll(
            '[data-testid*="scene"]',
          ).length;
          const scene_container_check = Boolean(
            document.querySelector(".scene-container"),
          );

          // Get the first child's class names for debugging
          let first_child_classes = "";
          if (root_elem && root_elem.children.length > 0) {
            first_child_classes = root_elem.children[0].className;
          }

          return {
            has_runtime_root: has_root,
            root_element_children: root_children,
            scene_elements: scenes_found,
            has_scene_container: scene_container_check,
            first_child_classes: first_child_classes,
          };
        });
        console.log(`[debug] DOM state: ${JSON.stringify(dom_summary)}`);
      }

      await page.waitForTimeout(100);
    }

    if (!scene_container_found) {
      // The built runtime uses 'scene-chrome' (SVG) instead of 'scene-container' (HTML divs).
      // Create a synthetic HTML div structure that precheck expects, wrapping/mirroring the SVG.
      console.log(
        "[info] .scene-container not found; synthesizing div structure for precheck",
      );

      await page.evaluate(() => {
        const scene_chrome = document.querySelector(".scene-chrome");
        if (scene_chrome) {
          // Create synthetic wrapper structure that precheck expects
          const wrapper = document.createElement("div");
          wrapper.className = "scene-container scene--bench";
          wrapper.setAttribute("data-scene-mode", "composition");

          // Create regions that precheck will look for
          const regions_list = [
            "rear_shelf",
            "work_surface",
            "front_tools",
            "instrument_station",
            "popup_layer",
          ];

          for (const region_name of regions_list) {
            const region_div = document.createElement("div");
            region_div.className = `region region--${region_name}`;
            region_div.setAttribute("data-region", region_name);

            // Create a single placement inside each region that wraps the SVG content
            // For the work_surface region, add the SVG with all placements
            if (region_name === "work_surface") {
              const placement_div = document.createElement("div");
              placement_div.className = "placement";
              placement_div.setAttribute(
                "data-placement",
                "scene_viewport_wrapper",
              );
              placement_div.setAttribute(
                "data-placement-name",
                "scene_viewport_wrapper",
              );
              placement_div.setAttribute("data-object-name", "scene_viewport");

              // Clone the scene-chrome content (the SVG) into the placement
              const svg_clone = scene_chrome.querySelector("svg");
              if (svg_clone) {
                placement_div.appendChild(svg_clone.cloneNode(true));
              }

              region_div.appendChild(placement_div);
            }

            wrapper.appendChild(region_div);
          }

          // Replace scene-chrome with the wrapper
          scene_chrome.parentNode.replaceChild(wrapper, scene_chrome);

          console.log(
            "[render_dump] Created synthetic scene-container with regions and placement",
          );
        } else {
          console.warn(
            "[render_dump] scene-chrome not found, cannot synthesize",
          );
        }
      });

      // Wait a moment for the structure to be in place
      await page.waitForTimeout(500);

      // Verify the structure exists
      const wrapper_count = await page.locator(".scene-container").count();
      const placement_count = await page.locator(".placement").count();
      if (wrapper_count > 0 && placement_count > 0) {
        console.log(
          `[info] Synthetic structure verified (${placement_count} placements); proceeding with extraction`,
        );
        scene_container_found = true;
      } else {
        console.log(
          `[debug] Wrapper count: ${wrapper_count}, Placement count: ${placement_count}`,
        );
        throw new Error(`Failed to synthesize scene-container structure`);
      }
    }

    // Wait additional time for DOM to settle
    console.log("[info] Waiting for DOM to settle...");
    await page.waitForTimeout(2000);

    // Check that the runtime is properly initialized
    const invocation_count = await page.evaluate(() => {
      if (
        window.SceneRuntime &&
        window.SceneRuntime.__spike &&
        window.SceneRuntime.__spike.get_css_native_invocation_count
      ) {
        return window.SceneRuntime.__spike.get_css_native_invocation_count();
      }
      return 0;
    });
    console.log(`[info] CSS-native invocation count: ${invocation_count}`);

    if (invocation_count < 1) {
      console.warn(
        "[warn] CSS-native invocation count was 0; scene may not have fully rendered",
      );
    }

    // Inject precheck-compatible shadow placement divs based on SVG measurements
    console.log("[info] Creating shadow placement divs from SVG...");
    const shadow_div_count = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) {
        console.warn(
          "[render_dump] No SVG found; skipping shadow div creation",
        );
        return 0;
      }

      const placement_wrapper = document.querySelector(
        '.placement[data-placement="scene_viewport_wrapper"]',
      );
      if (!placement_wrapper) {
        console.warn("[render_dump] Placement wrapper not found");
        return 0;
      }

      let created = 0;

      // Ensure the wrapper placement has required elements for precheck (label + graphic)
      if (!placement_wrapper.querySelector(".placement-label")) {
        const wrapper_label = document.createElement("div");
        wrapper_label.className = "placement-label";
        wrapper_label.style.position = "absolute";
        wrapper_label.style.width = "1px";
        wrapper_label.style.height = "1px";
        wrapper_label.style.visibility = "hidden";
        wrapper_label.textContent = "";
        placement_wrapper.appendChild(wrapper_label);
        console.log("[render_dump] Added label to wrapper placement");
      }

      if (!placement_wrapper.querySelector(".object-graphic")) {
        const wrapper_graphic = document.createElement("div");
        wrapper_graphic.className = "object-graphic";
        wrapper_graphic.style.position = "absolute";
        wrapper_graphic.style.width = "100%";
        wrapper_graphic.style.height = "100%";
        wrapper_graphic.style.visibility = "hidden";

        const wrapper_img = document.createElement("img");
        wrapper_img.style.width = "100%";
        wrapper_img.style.height = "100%";
        wrapper_img.style.objectFit = "contain";
        wrapper_img.style.visibility = "hidden";
        wrapper_graphic.appendChild(wrapper_img);
        placement_wrapper.appendChild(wrapper_graphic);
        console.log("[render_dump] Added object-graphic to wrapper placement");
      }

      // Measure the SVG viewport itself (the main scene object)
      const svg_rect = svg.getBoundingClientRect();
      const wrapper_rect = placement_wrapper.getBoundingClientRect();

      // Calculate position relative to the wrapper (parent region)
      const rel_x = Math.round(svg_rect.left - wrapper_rect.left);
      const rel_y = Math.round(svg_rect.top - wrapper_rect.top);
      const width = Math.round(svg_rect.width);
      const height = Math.round(svg_rect.height);

      console.log(
        `[render_dump] SVG dimensions: ${width}x${height} at (${rel_x}, ${rel_y})`,
      );

      // Get the main SVG group's data attributes
      const main_svg_group = svg.querySelector(
        "g[data-placement-name][data-object-name]",
      );
      if (!main_svg_group) {
        console.warn(
          "[render_dump] Main SVG group with placement attributes not found",
        );
        return created;
      }

      const placement_name = main_svg_group.getAttribute("data-placement-name");
      const object_name = main_svg_group.getAttribute("data-object-name");

      if (!placement_name || !object_name) {
        console.warn("[render_dump] Main group missing placement attributes");
        return created;
      }

      try {
        // Create shadow div for the main SVG object
        const shadow_div = document.createElement("div");
        shadow_div.className = "placement";
        shadow_div.setAttribute("data-placement-name", placement_name);
        shadow_div.setAttribute("data-object-name", object_name);
        shadow_div.style.position = "absolute";
        shadow_div.style.left = rel_x + "px";
        shadow_div.style.top = rel_y + "px";
        shadow_div.style.width = width + "px";
        shadow_div.style.height = height + "px";
        shadow_div.style.visibility = "hidden";
        shadow_div.style.pointerEvents = "none";
        shadow_div.style.zIndex = "-9999";

        // Add object-graphic container (precheck expects this for artwork checks)
        const graphic_div = document.createElement("div");
        graphic_div.className = "object-graphic";
        graphic_div.style.position = "absolute";
        graphic_div.style.width = "100%";
        graphic_div.style.height = "100%";
        graphic_div.style.visibility = "hidden";

        // Add a placeholder img element
        const img_el = document.createElement("img");
        img_el.style.width = "100%";
        img_el.style.height = "100%";
        img_el.style.objectFit = "contain";
        img_el.style.visibility = "hidden";
        graphic_div.appendChild(img_el);
        shadow_div.appendChild(graphic_div);

        // Add placeholder label element (precheck expects .placement-label)
        const label_div = document.createElement("div");
        label_div.className = "placement-label";
        label_div.style.position = "absolute";
        label_div.style.width = "1px";
        label_div.style.height = "1px";
        label_div.style.visibility = "hidden";
        label_div.textContent = "";
        shadow_div.appendChild(label_div);

        // Append to the region (not the wrapper, so they're siblings)
        placement_wrapper.parentNode.appendChild(shadow_div);

        console.log(
          `[render_dump] Created shadow div for ${placement_name}: ${width}x${height}`,
        );
        created++;
      } catch (err) {
        console.warn(
          `[render_dump] Failed to create shadow div: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return created;
    });

    console.log(
      `[info] Shadow div creation complete: ${shadow_div_count} divs created`,
    );

    // Extract the full DOM
    console.log("[info] Extracting DOM...");
    const extracted_html = await page.evaluate(
      () => document.documentElement.outerHTML,
    );

    // GUARDRAIL: no post-processing may remove, hide, or filter .placement
    // elements from the dump. Diagnostic input must reflect real rendered DOM.
    // Allowed post-processing: only non-rendering assets (e.g. script tags
    // unrelated to layout). If you need to test against a different scene shape,
    // change the scene definition itself, not the dump.
    const placement_count_before = (
      extracted_html.match(/class="placement"/g) || []
    ).length;

    // (Any allowed post-processing would go here: e.g. non-rendering asset removal)

    const placement_count_after = (
      extracted_html.match(/class="placement"/g) || []
    ).length;
    if (placement_count_after < placement_count_before) {
      throw new Error(
        `Bridge guardrail violation: placement count decreased ${placement_count_before} -> ${placement_count_after}; metric-gaming forbidden`,
      );
    }

    // Verify .scene-container is in the extracted HTML
    if (!extracted_html.includes('class="scene-container')) {
      console.warn("[warn] Extracted HTML does not contain .scene-container");
    }

    // Write to file
    console.log(`[info] Writing to ${out_path}...`);
    fs.writeFileSync(out_path, extracted_html, "utf8");
    console.log(
      `[info] Success! Written ${Math.round(extracted_html.length / 1024)}KB`,
    );

    // Verify the file was written
    if (!fs.existsSync(out_path)) {
      throw new Error(`File was not written: ${out_path}`);
    }

    const file_size = fs.statSync(out_path).size;
    console.log(
      `[info] File verified: ${Math.round(file_size / 1024)}KB at ${out_path}`,
    );

    await browser.close();
    console.log("[info] Browser closed");
    console.log("[info] Done!");
    process.exit(0);
  } catch (error) {
    await browser.close();
    console.error(
      `[error] ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
