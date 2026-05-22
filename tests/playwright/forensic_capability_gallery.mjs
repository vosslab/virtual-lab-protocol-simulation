/**
 * Forensic capability gallery (Task FE).
 *
 * Loads a sample of production runtime protocol pages from dist/, captures
 * pixel-perfect screenshots, attempts simple click interactions to capture
 * before+after pairs, and emits an HTML index with categorized sections.
 *
 * Output: test-results/layout_manager_forensic_gallery/INDEX.html
 *
 * No edits to src/ or content/. Read-only walk of dist/.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Configuration
//============================================

const DIST_DIR = path.join(REPO_ROOT, "dist");
const OUT_DIR = path.join(
	REPO_ROOT,
	"test-results",
	"layout_manager_forensic_gallery",
);
const SHOTS_DIR = path.join(OUT_DIR, "shots");
const VIEWPORT = { width: 1280, height: 900 };

// Sample 15 protocols across clusters (passage, drug, mtt, sdspage, trypan).
const SAMPLE = [
	"trypan_blue_counting",
	"passage_hood_detachment",
	"passage_pellet_reseed",
	"cell_seeding_plate_setup",
	"drug_dilution_setup",
	"plate_drug_treatment_drug_addition",
	"plate_drug_treatment_media_adjustment",
	"mtt_reagent_prep",
	"mtt_plate_reaction",
	"mtt_solubilization_readout",
	"sdspage_prepare_running_buffer",
	"sdspage_prepare_gel_cassette",
	"sdspage_load_sample_single_lane",
	"sdspage_run_electrophoresis",
	"sdspage_image_gel",
];

//============================================
// Helpers
//============================================

function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

/**
 * Try to dismiss any welcome / start overlay so the scene paints.
 */
async function dismissWelcome(page) {
	const candidates = [
		"#welcome-start-btn",
		"button:has-text('Start')",
		"button:has-text('Begin')",
		"button:has-text('Continue')",
	];
	for (const sel of candidates) {
		const loc = page.locator(sel).first();
		if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
			await loc.click().catch(() => {});
			await page.waitForTimeout(250);
			return true;
		}
	}
	return false;
}

/**
 * Read inspection metadata from the runtime if exposed.
 */
async function readSceneMeta(page) {
	return page.evaluate(() => {
		const w = window;
		const meta = {
			scene_name: null,
			protocol_name: null,
			object_count: 0,
			placeholder_count: 0,
			label_count: 0,
		};
		try {
			const cfg = w.__RUNTIME_PROTOCOL_CONFIG;
			if (cfg && typeof cfg === "object") {
				meta.protocol_name = cfg.protocol?.protocol_name || cfg.protocol_name || null;
				meta.scene_name = cfg.protocol?.entry_step || cfg.entry_step || null;
			}
			if (w.SceneRuntime && w.SceneRuntime.current_scene) {
				meta.scene_name = w.SceneRuntime.current_scene;
			}
		} catch (e) {}
		// Count visible scene-object DOM nodes
		const objs = document.querySelectorAll(
			"[data-object-name], [data-target-id], [data-asset], [data-placement-name]",
		);
		meta.object_count = objs.length;
		// Placeholder heuristic: explicit markers + missing-asset patterns
		const placeholders = document.querySelectorAll(
			"[data-placeholder], .placeholder, .missing-asset, [data-asset='placeholder'], [data-asset='unknown']",
		);
		meta.placeholder_count = placeholders.length;
		// Labels: SVG text and DOM labels
		const labels = document.querySelectorAll(
			"[data-object-label], .object-label, .scene-label, svg text",
		);
		meta.label_count = labels.length;
		return meta;
	});
}

/**
 * Find first clickable scene object for interaction capture.
 */
async function firstClickableTarget(page) {
	// Runtime emits SVG groups with data-target-id and pointer-events=auto.
	const sel =
		"[data-target-id][pointer-events='auto'], g[data-target-id], [data-object-name][pointer-events='auto']";
	const loc = page.locator(sel).first();
	if ((await loc.count()) === 0) return null;
	if (!(await loc.isVisible().catch(() => false))) return null;
	return loc;
}

/**
 * Heuristic visual issue detection: label overlap, overflow clipping.
 */
async function detectIssues(page) {
	return page.evaluate(() => {
		const issues = {
			overlapping_labels: 0,
			clipped_objects: 0,
			tiny_objects: 0,
			overflow_text: 0,
		};
		const labels = Array.from(
			document.querySelectorAll(
				".object-label, [data-object-label], .scene-label, svg text",
			),
		);
		const rects = labels
			.map((el) => ({ el, r: el.getBoundingClientRect() }))
			.filter((x) => x.r.width > 1 && x.r.height > 1);
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				const a = rects[i].r;
				const b = rects[j].r;
				const overlap =
					a.left < b.right &&
					a.right > b.left &&
					a.top < b.bottom &&
					a.bottom > b.top;
				if (overlap) issues.overlapping_labels++;
			}
		}
		// Clipped: scene objects whose bounding box exceeds parent.
		const objs = Array.from(
			document.querySelectorAll(
				"[data-target-id], [data-object-name], [data-placement-name]",
			),
		);
		for (const o of objs) {
			const r = o.getBoundingClientRect();
			if (r.width < 16 || r.height < 16) issues.tiny_objects++;
			const parent = o.parentElement;
			if (parent) {
				const pr = parent.getBoundingClientRect();
				const cs = getComputedStyle(parent);
				if (cs.overflow === "hidden" || cs.overflowY === "hidden" || cs.overflowX === "hidden") {
					if (r.left < pr.left - 1 || r.right > pr.right + 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1) {
						issues.clipped_objects++;
					}
				}
			}
		}
		return issues;
	});
}

//============================================
// Main capture
//============================================

async function captureProtocol(browser, protocolName) {
	const url = "file://" + path.join(DIST_DIR, protocolName + ".html");
	const ctx = await browser.newContext({ viewport: VIEWPORT });
	const page = await ctx.newPage();
	const pageErrors = [];
	page.on("pageerror", (e) => pageErrors.push(String(e)));
	page.on("console", (m) => {
		if (m.type() === "error") pageErrors.push("console: " + m.text());
	});

	const record = {
		protocol_name: protocolName,
		source_html: "dist/" + protocolName + ".html",
		scene_name: null,
		shot_main: null,
		shot_before: null,
		shot_after: null,
		meta: null,
		issues: null,
		click_target: null,
		errors: [],
		load_failed: false,
	};

	try {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForTimeout(800);
		await dismissWelcome(page);
		await page.waitForTimeout(500);

		// Main full-page shot
		const mainPath = path.join(SHOTS_DIR, protocolName + "_main.png");
		await page.screenshot({ path: mainPath });
		record.shot_main = path.relative(OUT_DIR, mainPath);

		record.meta = await readSceneMeta(page).catch(() => null);
		if (record.meta) record.scene_name = record.meta.scene_name;
		record.issues = await detectIssues(page).catch(() => null);

		// Attempt interaction before/after
		const target = await firstClickableTarget(page);
		if (target) {
			const beforePath = path.join(SHOTS_DIR, protocolName + "_before.png");
			await page.screenshot({ path: beforePath });
			record.shot_before = path.relative(OUT_DIR, beforePath);
			const desc = await target
				.evaluate(
					(el) =>
						el.getAttribute("data-target-id") ||
						el.getAttribute("data-object-name") ||
						el.getAttribute("data-placement-name") ||
						el.id ||
						el.tagName,
				)
				.catch(() => "unknown");
			record.click_target = desc;
			await target.click({ timeout: 2000 }).catch((e) => {
				record.errors.push("click failed: " + e.message);
			});
			await page.waitForTimeout(700);
			const afterPath = path.join(SHOTS_DIR, protocolName + "_after.png");
			await page.screenshot({ path: afterPath });
			record.shot_after = path.relative(OUT_DIR, afterPath);
		}
	} catch (e) {
		record.load_failed = true;
		record.errors.push("load: " + e.message);
	} finally {
		record.errors.push(...pageErrors);
		await ctx.close();
	}
	return record;
}

//============================================
// Categorization
//============================================

function scoreRecord(rec) {
	// Higher = worse.
	const i = rec.issues || {};
	const overlap = i.overlapping_labels || 0;
	const clipped = i.clipped_objects || 0;
	const tiny = i.tiny_objects || 0;
	const errorPenalty = (rec.errors || []).length * 5;
	const loadFail = rec.load_failed ? 1000 : 0;
	return loadFail + clipped * 10 + tiny * 3 + overlap * 1 + errorPenalty;
}

function pickCategories(records) {
	const valid = records.filter((r) => !r.load_failed && r.shot_main);
	const sortedByBadness = [...valid].sort(
		(a, b) => scoreRecord(b) - scoreRecord(a),
	);
	const sortedByGoodness = [...valid].sort(
		(a, b) => scoreRecord(a) - scoreRecord(b),
	);
	const withInteraction = valid.filter((r) => r.shot_before && r.shot_after);
	const placeholderHeavy = [...valid]
		.filter((r) => (r.meta?.placeholder_count || 0) > 0)
		.sort(
			(a, b) =>
				(b.meta?.placeholder_count || 0) - (a.meta?.placeholder_count || 0),
		);
	const labelBad = [...valid]
		.filter((r) => (r.issues?.overlapping_labels || 0) > 0)
		.sort(
			(a, b) =>
				(b.issues?.overlapping_labels || 0) -
				(a.issues?.overlapping_labels || 0),
		);
	const compositionBad = [...valid]
		.filter(
			(r) =>
				(r.issues?.clipped_objects || 0) + (r.issues?.tiny_objects || 0) > 0,
		)
		.sort(
			(a, b) =>
				(b.issues?.clipped_objects || 0) +
				(b.issues?.tiny_objects || 0) -
				((a.issues?.clipped_objects || 0) + (a.issues?.tiny_objects || 0)),
		);

	return {
		best: sortedByGoodness.slice(0, 5),
		worst: sortedByBadness.slice(0, 5),
		interactions: withInteraction.slice(0, 5),
		placeholders: placeholderHeavy.slice(0, 5),
		labels: labelBad.slice(0, 5),
		composition: compositionBad.slice(0, 5),
	};
}

//============================================
// HTML generation
//============================================

function esc(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function thumb(rec, captionExtra) {
	const issues = rec.issues || {};
	const meta = rec.meta || {};
	const caption =
		`<b>${esc(rec.protocol_name)}</b><br>` +
		`<small>${esc(rec.source_html)}</small><br>` +
		`scene: ${esc(rec.scene_name || "n/a")}<br>` +
		`objects: ${meta.object_count ?? "?"}, labels: ${meta.label_count ?? "?"}, placeholders: ${meta.placeholder_count ?? "?"}<br>` +
		`overlap: ${issues.overlapping_labels ?? 0}, clipped: ${issues.clipped_objects ?? 0}, tiny: ${issues.tiny_objects ?? 0}` +
		(captionExtra ? `<br><i>${esc(captionExtra)}</i>` : "");
	const img = rec.shot_main
		? `<a href="${esc(rec.shot_main)}"><img src="${esc(rec.shot_main)}" style="max-width:320px;border:1px solid #ccc"></a>`
		: "<i>no screenshot</i>";
	return `<div class="card">${img}<div class="caption">${caption}</div></div>`;
}

function interactionThumb(rec) {
	const issues = rec.issues || {};
	const meta = rec.meta || {};
	const caption =
		`<b>${esc(rec.protocol_name)}</b><br>` +
		`scene: ${esc(rec.scene_name || "n/a")}<br>` +
		`click target: <code>${esc(rec.click_target || "?")}</code><br>` +
		`objects: ${meta.object_count ?? "?"}, overlap: ${issues.overlapping_labels ?? 0}`;
	const before = rec.shot_before
		? `<a href="${esc(rec.shot_before)}"><img src="${esc(rec.shot_before)}" style="max-width:320px;border:1px solid #ccc"></a>`
		: "";
	const after = rec.shot_after
		? `<a href="${esc(rec.shot_after)}"><img src="${esc(rec.shot_after)}" style="max-width:320px;border:1px solid #88c"></a>`
		: "";
	return `<div class="card">${before}${after}<div class="caption">${caption}</div></div>`;
}

function section(title, why, records, renderer) {
	const cards = records.length
		? records.map(renderer).join("\n")
		: "<i>no records matched this category</i>";
	return `<section><h2>${esc(title)}</h2><p class="why">${esc(why)}</p><div class="grid">${cards}</div></section>`;
}

function buildIndex(records, categories) {
	const totals = `${records.length} protocols sampled; ${records.filter((r) => !r.load_failed).length} loaded; ${records.filter((r) => r.shot_after).length} captured before+after interaction.`;
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Forensic capability gallery</title>
<style>
body { font-family: -apple-system, sans-serif; margin: 24px; background:#fafafa; color:#222; }
h1 { margin-bottom: 4px; }
section { margin: 32px 0; padding: 16px; background:#fff; border:1px solid #ddd; border-radius:6px; }
h2 { margin-top: 0; }
.why { color:#666; font-size: 13px; }
.grid { display: flex; flex-wrap: wrap; gap: 16px; }
.card { width: 340px; background: #fff; padding: 8px; border:1px solid #eee; border-radius:4px; }
.card img { width: 320px; height: auto; display:block; margin-bottom: 4px; }
.caption { font-size: 12px; line-height: 1.4; }
code { background:#f0f0f0; padding: 1px 4px; border-radius:3px; }
.meta { color:#555; font-size: 12px; }
</style>
</head><body>
<h1>Forensic capability gallery (Task FE)</h1>
<p class="meta">Generated ${new Date().toISOString()}. Source: dist/ runtime bundle.</p>
<p>${esc(totals)}</p>
${section("Best 5 runtime scenes", "Lowest issue score; visually polished, low-overlap, no detected clipping.", categories.best, thumb)}
${section("Worst 5 runtime scenes", "Highest issue score across clipped objects, tiny objects, overlapping labels, and runtime errors.", categories.worst, thumb)}
${section("Top 5 interaction scenes (before + after)", "Click fired on first clickable scene object; pair shows pre and post state.", categories.interactions, interactionThumb)}
${section("Top 5 placeholder/fallback failures", "Pages with the most placeholder/missing-asset markers in the DOM. Recent fix should bring this to zero.", categories.placeholders, thumb)}
${section("Top 5 label failures", "Pages with the most overlapping label bounding boxes.", categories.labels, thumb)}
${section("Top 5 scene composition failures", "Pages with the most clipped or tiny scene objects (primary object lost or supporting objects scattered).", categories.composition, thumb)}
<section><h2>Raw records</h2><pre style="overflow:auto">${esc(JSON.stringify(records, null, 2))}</pre></section>
</body></html>`;
	return html;
}

//============================================
// Entry point
//============================================

async function main() {
	ensureDir(OUT_DIR);
	ensureDir(SHOTS_DIR);

	if (!fs.existsSync(path.join(DIST_DIR, "runtime.bundle.js"))) {
		throw new Error(
			"dist/runtime.bundle.js missing; run bash build_github_pages.sh first",
		);
	}

	const browser = await chromium.launch();
	const records = [];
	for (const name of SAMPLE) {
		if (!fs.existsSync(path.join(DIST_DIR, name + ".html"))) {
			console.warn("skip missing", name);
			continue;
		}
		console.log("capture:", name);
		const rec = await captureProtocol(browser, name);
		records.push(rec);
	}
	await browser.close();

	const categories = pickCategories(records);
	const html = buildIndex(records, categories);
	const indexPath = path.join(OUT_DIR, "INDEX.html");
	fs.writeFileSync(indexPath, html);
	fs.writeFileSync(
		path.join(OUT_DIR, "records.json"),
		JSON.stringify(records, null, 2),
	);
	console.log("INDEX:", indexPath);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
