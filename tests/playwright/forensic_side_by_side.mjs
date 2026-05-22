// Forensic side-by-side: experiments CSS-native templates vs runtime protocols.
// Renders both at same viewport, screenshots, and counts visual quality issues.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./repo_root.mjs";

const VIEWPORT = { width: 1280, height: 900 };
const OUT_BASE = path.join(
	REPO_ROOT,
	"test-results",
	"experiments_vs_runtime_side_by_side"
);

// Pair definitions: experiments template vs closest runtime protocol html.
const PAIRS = [
	{
		name: "bench",
		experiments: "experiments/css_native_layout/templates/dir_b/bench_basic.html",
		runtime: "dist/mtt_reagent_prep.html",
		runtime_label: "mtt_reagent_prep (bench_workspace)",
	},
	{
		name: "hood",
		experiments: "experiments/css_native_layout/templates/dir_b/hood_basic.html",
		runtime: "dist/passage_hood_detachment.html",
		runtime_label: "passage_hood_detachment (hood_workspace)",
	},
	{
		name: "electrophoresis",
		experiments: "experiments/css_native_layout/templates/electrophoresis_bench.html",
		runtime: "dist/sdspage_run_electrophoresis.html",
		runtime_label: "sdspage_run_electrophoresis",
	},
	{
		name: "well_plate",
		experiments: "experiments/css_native_layout/templates/well_plate_96_zoom.html",
		runtime: "dist/plate_drug_treatment_drug_addition.html",
		runtime_label: "plate_drug_treatment_drug_addition (plate_workspace)",
	},
	{
		name: "dense_composition",
		experiments: "experiments/css_native_layout/templates/crowded_bench_dense.html",
		runtime: "dist/drug_dilution_setup.html",
		runtime_label: "drug_dilution_setup (dilution_workspace)",
	},
	{
		name: "instrument",
		experiments: "experiments/css_native_layout/templates/cell_counter_basic.html",
		runtime: "dist/trypan_blue_counting.html",
		runtime_label: "trypan_blue_counting (cell_counter_workspace)",
	},
];

// Measure visual quality issues in a rendered page.
async function measurePage(page) {
	return await page.evaluate(() => {
		const results = {
			crops: 0,
			placeholders: 0,
			labels_bad: 0,
			offpage: 0,
			clickable: 0,
			notes: [],
		};
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Crops: images/svgs whose bbox overflows their .object-graphic / .placement / .object-card parent.
		const cropContainers = document.querySelectorAll(
			".object-graphic, .placement, .object-card, .object-asset"
		);
		cropContainers.forEach((el) => {
			const r = el.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return;
			const inner = el.querySelector("img, svg");
			if (!inner) return;
			const ir = inner.getBoundingClientRect();
			// Bounded overflow check (>2px slack)
			if (
				ir.left < r.left - 2 ||
				ir.top < r.top - 2 ||
				ir.right > r.right + 2 ||
				ir.bottom > r.bottom + 2
			) {
				results.crops += 1;
			}
		});

		// Placeholders: data-render-fallback OR green #e8f5e9 rects.
		const fallback = document.querySelectorAll("[data-render-fallback]");
		results.placeholders += fallback.length;
		const rects = document.querySelectorAll("rect");
		rects.forEach((r) => {
			const fill = (r.getAttribute("fill") || "").toLowerCase();
			if (fill === "#e8f5e9" || fill === "#e8f5e9ff") {
				results.placeholders += 1;
			}
		});

		// Label issues: text elements with overflow on parent (text wider than parent box).
		const texts = document.querySelectorAll(
			".object-label, .placement-label, .label, text"
		);
		const seen = [];
		texts.forEach((t) => {
			const r = t.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return;
			// Off-parent overflow heuristic
			const p = t.parentElement;
			if (p) {
				const pr = p.getBoundingClientRect();
				if (pr.width > 0 && (r.right > pr.right + 4 || r.left < pr.left - 4)) {
					results.labels_bad += 1;
					return;
				}
			}
			// Overlap with already-seen text
			for (const s of seen) {
				if (
					r.left < s.right &&
					r.right > s.left &&
					r.top < s.bottom &&
					r.bottom > s.top
				) {
					results.labels_bad += 1;
					return;
				}
			}
			seen.push({
				left: r.left,
				right: r.right,
				top: r.top,
				bottom: r.bottom,
			});
		});

		// Off-page: any meaningful element whose bbox is outside viewport.
		const candidates = document.querySelectorAll(
			".placement, .object-card, .object-graphic, [data-interaction-id], [data-object-id]"
		);
		candidates.forEach((el) => {
			const r = el.getBoundingClientRect();
			if (r.width <= 0 || r.height <= 0) return;
			if (
				r.right < 0 ||
				r.bottom < 0 ||
				r.left > vw ||
				r.top > vh
			) {
				results.offpage += 1;
			}
		});

		// Clickable: elements with data-interaction-id / data-object-id / data-item-id, or .clickable class.
		const clickables = document.querySelectorAll(
			"[data-interaction-id], [data-object-id], [data-item-id], .clickable, button"
		);
		results.clickable = clickables.length;

		return results;
	});
}

async function renderAndMeasure(browser, fileRel, outPath, label) {
	const ctx = await browser.newContext({ viewport: VIEWPORT });
	const page = await ctx.newPage();
	const url = "file://" + path.join(REPO_ROOT, fileRel);
	const result = { url, fileRel, label, error: null };
	try {
		await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
		// Give runtime time to mount.
		await page.waitForTimeout(1500);
		const m = await measurePage(page);
		Object.assign(result, m);
		await page.screenshot({ path: outPath, fullPage: false });
	} catch (e) {
		result.error = String(e);
		try {
			await page.screenshot({ path: outPath, fullPage: false });
		} catch (_) {
			// swallow secondary
		}
		result.crops = result.crops ?? 0;
		result.placeholders = result.placeholders ?? 0;
		result.labels_bad = result.labels_bad ?? 0;
		result.offpage = result.offpage ?? 0;
		result.clickable = result.clickable ?? 0;
	}
	await ctx.close();
	return result;
}

function verdict(e, r) {
	// Lower = better. Score = crops*3 + placeholders*2 + labels_bad + offpage*2 - clickable*0.1
	const score = (x) =>
		x.crops * 3 +
		x.placeholders * 2 +
		x.labels_bad +
		x.offpage * 2 -
		Math.min(x.clickable, 50) * 0.1;
	const se = score(e);
	const sr = score(r);
	if (Math.abs(se - sr) < 0.5) return "tied";
	return se < sr ? "experiments-better" : "runtime-better";
}

async function main() {
	fs.mkdirSync(OUT_BASE, { recursive: true });
	const browser = await chromium.launch();
	const rows = [];
	for (const pair of PAIRS) {
		const pairDir = path.join(OUT_BASE, pair.name);
		fs.mkdirSync(pairDir, { recursive: true });
		const expPath = path.join(pairDir, "experiments.png");
		const rtPath = path.join(pairDir, "runtime.png");

		console.log(`\n=== Pair: ${pair.name} ===`);
		const e = await renderAndMeasure(
			browser,
			pair.experiments,
			expPath,
			"CSS-native static template"
		);
		console.log(
			`experiments: crops=${e.crops} placeholders=${e.placeholders} labels_bad=${e.labels_bad} offpage=${e.offpage} clickable=${e.clickable} err=${e.error || ""}`
		);
		const r = await renderAndMeasure(
			browser,
			pair.runtime,
			rtPath,
			"procedural runtime"
		);
		console.log(
			`runtime: crops=${r.crops} placeholders=${r.placeholders} labels_bad=${r.labels_bad} offpage=${r.offpage} clickable=${r.clickable} err=${r.error || ""}`
		);
		const v = verdict(e, r);
		console.log(`verdict: ${v}`);
		rows.push({ pair, e, r, verdict: v });
	}
	await browser.close();

	// Write report.
	const reportDir = path.join(REPO_ROOT, "docs", "active_plans", "reports");
	fs.mkdirSync(reportDir, { recursive: true });
	const reportPath = path.join(
		reportDir,
		"experiments_vs_runtime_side_by_side.md"
	);
	const lines = [];
	lines.push("# Experiments vs runtime side-by-side (forensic FF)");
	lines.push("");
	lines.push(`Date: 2026-05-22. Viewport: ${VIEWPORT.width}x${VIEWPORT.height}, chromium headless.`);
	lines.push("");
	lines.push("Render paths compared:");
	lines.push("");
	lines.push("- experiments: CSS-native static HTML template (hand-authored layout, fixed positioning).");
	lines.push("- runtime: procedural runtime that mounts protocol YAML through the scene runtime bundle.");
	lines.push("");
	lines.push("Lower is better for crops/placeholders/labels_bad/offpage. Clickable is informational.");
	lines.push("");
	lines.push(
		"| pair | experiments_crops | runtime_crops | experiments_placeholders | runtime_placeholders | experiments_labels_bad | runtime_labels_bad | experiments_offpage | runtime_offpage | experiments_clickable | runtime_clickable | verdict |"
	);
	lines.push(
		"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
	);
	for (const row of rows) {
		lines.push(
			`| ${row.pair.name} | ${row.e.crops} | ${row.r.crops} | ${row.e.placeholders} | ${row.r.placeholders} | ${row.e.labels_bad} | ${row.r.labels_bad} | ${row.e.offpage} | ${row.r.offpage} | ${row.e.clickable} | ${row.r.clickable} | ${row.verdict} |`
		);
	}
	lines.push("");
	lines.push("## Pair details");
	lines.push("");
	for (const row of rows) {
		lines.push(`### ${row.pair.name}`);
		lines.push("");
		lines.push(`- experiments source: \`${row.pair.experiments}\` (CSS-native static template)`);
		lines.push(`- runtime source: \`${row.pair.runtime}\` -- ${row.pair.runtime_label} (procedural runtime)`);
		if (row.e.error) {
			lines.push(`- experiments load error: \`${row.e.error}\``);
		}
		if (row.r.error) {
			lines.push(`- runtime load error: \`${row.r.error}\``);
		}
		lines.push("");
		lines.push(`![experiments ${row.pair.name} (CSS-native static template)](../../../test-results/experiments_vs_runtime_side_by_side/${row.pair.name}/experiments.png)`);
		lines.push("");
		lines.push(`![runtime ${row.pair.name} (procedural runtime)](../../../test-results/experiments_vs_runtime_side_by_side/${row.pair.name}/runtime.png)`);
		lines.push("");
	}
	lines.push("## Verdict tally");
	lines.push("");
	const tally = { "experiments-better": 0, "runtime-better": 0, tied: 0 };
	for (const row of rows) tally[row.verdict] = (tally[row.verdict] || 0) + 1;
	for (const k of ["experiments-better", "runtime-better", "tied"]) {
		lines.push(`- ${k}: ${tally[k]}`);
	}
	lines.push("");
	fs.writeFileSync(reportPath, lines.join("\n"));
	console.log(`\nReport written: ${reportPath}`);
	console.log(`Tally: ${JSON.stringify(tally)}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
