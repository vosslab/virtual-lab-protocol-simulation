#!/usr/bin/env node
/**
 * FORENSIC TASK FG: Diagnostic Measurement Bundle (runtime path)
 *
 * Walks all 26 per-protocol dist HTMLs and emits a JSON metrics summary.
 *
 * Metrics per protocol:
 *  - mounted: did the runtime mount (scene root exists, no init error overlay)
 *  - placeholderCount: data-render-fallback="true" OR green #e8f5e9 rects
 *  - realSvgCount: <svg> or <img> resolving to assets/*.svg
 *  - fallbackCount: same as placeholderCount (alias for clarity)
 *  - visibleCropCount: <img>/<svg> bbox exceeds parent .object-graphic bbox by >2px
 *  - offPageCount: clickable elements outside viewport
 *  - labelOverlapCount: <text> bboxes overlapping other <text> bboxes
 *  - consoleErrors: number of page console error events
 *  - domGrowth: childNode count delta before/after a short wait
 *
 * Walkthrough counts (for top protocols) are produced by a separate driver
 * over walker/engine.mjs (forensic_walker_sweep.mjs).
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const DIST_DIR = path.join(REPO_ROOT, "dist");
const OUT_DIR = path.join(REPO_ROOT, "test-results", "forensic_fg");
fs.mkdirSync(OUT_DIR, { recursive: true });

function listProtocolHtmls() {
	const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".html") && f !== "index.html");
	files.sort();
	return files.map((f) => path.join(DIST_DIR, f));
}

async function measureProtocol(browser, htmlPath) {
	const name = path.basename(htmlPath, ".html");
	const url = "file://" + htmlPath;
	const consoleErrors = [];
	const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});
	page.on("pageerror", (err) => {
		consoleErrors.push("PAGEERROR: " + err.message);
	});

	const out = {
		protocol: name,
		mounted: false,
		placeholderCount: 0,
		realSvgCount: 0,
		fallbackCount: 0,
		visibleCropCount: 0,
		offPageCount: 0,
		labelOverlapCount: 0,
		consoleErrors: 0,
		domGrowth: 0,
		error: null,
	};

	try {
		await page.goto(url, { waitUntil: "load", timeout: 20000 });
		// Give the runtime a moment to mount and render.
		await page.waitForTimeout(800);

		const childCountBefore = await page.evaluate(() => {
			const r = document.getElementById("runtime-root");
			return r ? r.querySelectorAll("*").length : 0;
		});

		await page.waitForTimeout(800);

		const childCountAfter = await page.evaluate(() => {
			const r = document.getElementById("runtime-root");
			return r ? r.querySelectorAll("*").length : 0;
		});
		out.domGrowth = childCountAfter - childCountBefore;

		const metrics = await page.evaluate(() => {
			const result = {
				mounted: false,
				placeholderCount: 0,
				realSvgCount: 0,
				visibleCropCount: 0,
				offPageCount: 0,
				labelOverlapCount: 0,
			};
			const root = document.getElementById("runtime-root");
			if (!root) return result;
			// Mounted = root has substantive children and no init-error overlay.
			const hasErrorOverlay = !!document.querySelector(
				'div[style*="RUNTIME INITIALIZATION ERROR"]',
			);
			result.mounted =
				!hasErrorOverlay && root.querySelectorAll("*").length > 5;

			// Placeholders: data-render-fallback="true"
			const fallbackEls = root.querySelectorAll('[data-render-fallback="true"]');
			let placeholderCount = fallbackEls.length;
			// Green placeholder rects (#e8f5e9)
			const allRects = root.querySelectorAll("rect");
			for (const r of allRects) {
				const fill = (r.getAttribute("fill") || "").toLowerCase();
				if (fill === "#e8f5e9") placeholderCount++;
			}
			result.placeholderCount = placeholderCount;

			// Real svgs/imgs resolving to assets/*.svg
			let realSvgCount = 0;
			const imgs = root.querySelectorAll("img");
			for (const im of imgs) {
				const src = im.getAttribute("src") || "";
				if (src.includes("assets/") && src.endsWith(".svg")) realSvgCount++;
			}
			// Inline <svg> elements with non-trivial content count as 'real'.
			const svgs = root.querySelectorAll("svg");
			for (const sv of svgs) {
				const hasContent =
					sv.querySelectorAll("path, polygon, circle, ellipse, image, use").length >
					0;
				if (hasContent) realSvgCount++;
			}
			result.realSvgCount = realSvgCount;

			// Visible crop: child media bbox exceeds container .object-graphic bbox by >2px
			const containers = root.querySelectorAll(".object-graphic");
			let cropCount = 0;
			for (const c of containers) {
				const cb = c.getBoundingClientRect();
				const media = c.querySelectorAll("svg, img");
				for (const m of media) {
					const mb = m.getBoundingClientRect();
					if (
						mb.left + 2 < cb.left ||
						mb.top + 2 < cb.top ||
						mb.right - 2 > cb.right ||
						mb.bottom - 2 > cb.bottom
					) {
						cropCount++;
						break;
					}
				}
			}
			result.visibleCropCount = cropCount;

			// Off-page clickable elements (outside viewport)
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const clickables = root.querySelectorAll(
				"[data-object-name], [data-item-id], button, .object-graphic",
			);
			let off = 0;
			for (const el of clickables) {
				const b = el.getBoundingClientRect();
				if (b.width === 0 && b.height === 0) continue;
				if (b.right < 0 || b.bottom < 0 || b.left > vw || b.top > vh) off++;
			}
			result.offPageCount = off;

			// Label overlap: <text> bbox overlaps another <text> bbox
			const texts = Array.from(root.querySelectorAll("svg text"));
			const bboxes = texts
				.map((t) => {
					try {
						return t.getBoundingClientRect();
					} catch {
						return null;
					}
				})
				.filter((b) => b && b.width > 0 && b.height > 0);
			let overlaps = 0;
			for (let i = 0; i < bboxes.length; i++) {
				for (let j = i + 1; j < bboxes.length; j++) {
					const a = bboxes[i];
					const b = bboxes[j];
					if (
						a.left < b.right &&
						a.right > b.left &&
						a.top < b.bottom &&
						a.bottom > b.top
					) {
						overlaps++;
					}
				}
			}
			result.labelOverlapCount = overlaps;
			return result;
		});

		out.mounted = metrics.mounted;
		out.placeholderCount = metrics.placeholderCount;
		out.fallbackCount = metrics.placeholderCount;
		out.realSvgCount = metrics.realSvgCount;
		out.visibleCropCount = metrics.visibleCropCount;
		out.offPageCount = metrics.offPageCount;
		out.labelOverlapCount = metrics.labelOverlapCount;
	} catch (err) {
		out.error = String(err.message || err);
	} finally {
		out.consoleErrors = consoleErrors.length;
		await page.close();
	}

	return out;
}

async function main() {
	const htmls = listProtocolHtmls();
	console.log(`Found ${htmls.length} protocol HTMLs in dist/`);
	const browser = await chromium.launch();
	const results = [];
	for (const html of htmls) {
		const r = await measureProtocol(browser, html);
		results.push(r);
		const tag = r.mounted ? "OK" : "FAIL";
		console.log(
			`[${tag}] ${r.protocol}  ph=${r.placeholderCount} svg=${r.realSvgCount} crop=${r.visibleCropCount} off=${r.offPageCount} ovr=${r.labelOverlapCount} cerr=${r.consoleErrors}` +
				(r.error ? `  err=${r.error}` : ""),
		);
	}
	await browser.close();

	const summary = {
		generated_at: new Date().toISOString(),
		dist_dir: DIST_DIR,
		protocol_count: results.length,
		mount_count: results.filter((r) => r.mounted).length,
		totals: {
			placeholderCount: results.reduce((s, r) => s + r.placeholderCount, 0),
			realSvgCount: results.reduce((s, r) => s + r.realSvgCount, 0),
			fallbackCount: results.reduce((s, r) => s + r.fallbackCount, 0),
			visibleCropCount: results.reduce((s, r) => s + r.visibleCropCount, 0),
			offPageCount: results.reduce((s, r) => s + r.offPageCount, 0),
			labelOverlapCount: results.reduce((s, r) => s + r.labelOverlapCount, 0),
			consoleErrors: results.reduce((s, r) => s + r.consoleErrors, 0),
			domGrowth: results.reduce((s, r) => s + r.domGrowth, 0),
		},
		per_protocol: results,
	};
	const outFile = path.join(OUT_DIR, "runtime_metrics.json");
	fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
	console.log(`\nWrote ${outFile}`);
	console.log(
		`mounted=${summary.mount_count}/${summary.protocol_count}  ph=${summary.totals.placeholderCount}  svg=${summary.totals.realSvgCount}  crop=${summary.totals.visibleCropCount}  off=${summary.totals.offPageCount}  ovr=${summary.totals.labelOverlapCount}  cerr=${summary.totals.consoleErrors}`,
	);
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
