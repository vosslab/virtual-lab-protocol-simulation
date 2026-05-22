/**
 * tests/playwright/forensic_svg_completeness.mjs
 *
 * Forensic SVG completeness audit.
 *
 * For every per-protocol HTML in dist/, mount the runtime in chromium
 * headless, capture the rendered scene, walk every placement group, and
 * classify each as either backed by a real SVG asset or rendered as a
 * fallback / placeholder / generic-outline / missing-svg.
 *
 * Outputs:
 *   - test-results/runtime_svg_completeness/<protocol>/initial.png
 *   - test-results/runtime_svg_completeness/<protocol>/obj_<placement>.png
 *   - test-results/runtime_svg_completeness/audit.json
 *   - test-results/runtime_svg_completeness/INDEX.html
 *   - docs/active_plans/reports/runtime_svg_completeness_audit.md
 *
 * No edits to src/ or content/.
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { REPO_ROOT } from "./repo_root.mjs";

const DIST_DIR = path.join(REPO_ROOT, "dist");
const OUT_DIR = path.join(REPO_ROOT, "test-results", "runtime_svg_completeness");
const REPORT_PATH = path.join(
	REPO_ROOT,
	"docs",
	"active_plans",
	"reports",
	"runtime_svg_completeness_audit.md",
);

//============================================
// Enumerate per-protocol HTML pages.
//============================================

function listProtocolHtml() {
	const all = fs.readdirSync(DIST_DIR);
	const htmls = all
		.filter((name) => name.endsWith(".html"))
		.filter((name) => name !== "index.html")
		.sort();
	return htmls;
}

//============================================
// Walk DOM inside the page context.
//============================================

async function walkScene(page) {
	const result = await page.evaluate(() => {
		const root = document.getElementById("runtime-root");
		if (!root) {
			return { mounted: false, placements: [], error: "no runtime-root" };
		}

		// Collect every placement group rendered by the scene renderer.
		const groups = Array.from(
			root.querySelectorAll("g[data-placement-name]"),
		);

		// Track image errors, broken hrefs, etc.
		const placements = groups.map((g) => {
			const placementName = g.getAttribute("data-placement-name");
			const objectName = g.getAttribute("data-object-name");
			const targetId = g.getAttribute("data-target-id");
			const assetName = g.getAttribute("data-asset");
			const deferred = g.getAttribute("data-visual-state-deferred") === "true";

			// Find fallback rect (renderer marks it with data-render-fallback).
			const fallbackRect = g.querySelector('rect[data-render-fallback="true"]');
			const usesFallback = fallbackRect !== null;

			// Has a real SVG asset been inserted? The renderer inserts an
			// inline <svg> child for real assets.
			const innerSvg = g.querySelector(":scope > svg");
			const hasInlineSvg = innerSvg !== null;

			// Count internal shape elements (proxy for "scientific detail").
			let shapeCount = 0;
			if (innerSvg) {
				shapeCount = innerSvg.querySelectorAll(
					"path, circle, ellipse, polygon, polyline, line, rect",
				).length;
			}

			// Inspect any nested <image> hrefs for broken/missing links.
			const imageEls = Array.from(g.querySelectorAll("image"));
			const imageHrefs = imageEls.map((el) => {
				return (
					el.getAttribute("href") ||
					el.getAttribute("xlink:href") ||
					""
				);
			});

			// Bounding box (DOMRect) in viewport-space pixels.
			const rect = g.getBoundingClientRect();
			const box = {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
			};

			return {
				placement_name: placementName,
				object_name: objectName,
				target_id: targetId,
				asset_name: assetName,
				deferred: deferred,
				uses_fallback: usesFallback,
				has_inline_svg: hasInlineSvg,
				inline_shape_count: shapeCount,
				image_hrefs: imageHrefs,
				bbox: box,
			};
		});

		// Detect runtime mount failure (red error banner in DOM).
		const errBanner =
			document.body.querySelector('[style*="ffcccc"]') ||
			document.body.querySelector('[style*="cc0000"]');
		const runtimeError = errBanner ? errBanner.textContent : null;

		return { mounted: true, placements, runtimeError };
	});
	return result;
}

//============================================
// Classify each placement into a finding.
//============================================

function classifyPlacement(p) {
	// Hard-fail categories per spec.
	if (p.uses_fallback) {
		// Renderer marked a fallback rect. The runtime uses the same
		// green placeholder rect both for "asset id resolved but svg
		// missing" and "deferred / no resolved asset". Distinguish:
		if (!p.asset_name && p.deferred) {
			return {
				severity: "hard_fail",
				category: "generated_placeholder",
				detail:
					"Deferred / no asset resolved; renderer drew green placeholder rect.",
			};
		}
		if (p.asset_name) {
			return {
				severity: "hard_fail",
				category: "missing_svg",
				detail: "Asset name resolved but SVG string missing or load failed.",
			};
		}
		return {
			severity: "hard_fail",
			category: "fallback_rectangle",
			detail: "Renderer drew fallback rect with no asset attribution.",
		};
	}

	// No fallback and no inline svg: the group is an empty bubble.
	if (!p.has_inline_svg) {
		return {
			severity: "hard_fail",
			category: "empty_bubble",
			detail: "Group rendered with no SVG child and no fallback rect.",
		};
	}

	// Inline svg present but with very few shapes - likely a generic
	// outline rather than a real scientific asset.
	if (p.inline_shape_count <= 1) {
		return {
			severity: "hard_fail",
			category: "generic_outline",
			detail: `Inline SVG has ${p.inline_shape_count} shape(s); likely a generic outline.`,
		};
	}

	// Heuristic: 2 shapes is also suspiciously thin for scientific assets.
	if (p.inline_shape_count === 2) {
		return {
			severity: "advisory",
			category: "thin_svg",
			detail: "Inline SVG has only 2 shape elements; review for scientific detail.",
		};
	}

	return {
		severity: "ok",
		category: "real_svg",
		detail: `Inline SVG with ${p.inline_shape_count} shape elements.`,
	};
}

//============================================
// Per-protocol audit pass.
//============================================

async function auditProtocol(browser, htmlFile) {
	const protocolName = htmlFile.replace(/\.html$/, "");
	const fileUrl = "file://" + path.join(DIST_DIR, htmlFile);

	const protocolOutDir = path.join(OUT_DIR, protocolName);
	fs.mkdirSync(protocolOutDir, { recursive: true });

	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	const page = await ctx.newPage();

	const consoleErrors = [];
	page.on("pageerror", (err) => consoleErrors.push(String(err)));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			consoleErrors.push(msg.text());
		}
	});

	// Track 404 / missing-svg requests.
	const failedRequests = [];
	page.on("requestfailed", (req) => {
		failedRequests.push({ url: req.url(), reason: req.failure()?.errorText });
	});
	page.on("response", (resp) => {
		if (resp.status() >= 400) {
			failedRequests.push({ url: resp.url(), reason: `HTTP ${resp.status()}` });
		}
	});

	await page.goto(fileUrl, { waitUntil: "load" });

	// Wait for the runtime to mount. The renderer inserts groups
	// once the scene is up. Give it a generous window and poll.
	let mounted = false;
	for (let i = 0; i < 30; i++) {
		const ok = await page.evaluate(() => {
			const root = document.getElementById("runtime-root");
			if (!root) return false;
			const hasGroups =
				root.querySelectorAll("g[data-placement-name]").length > 0;
			const hasError = !!document.body.querySelector('[style*="ffcccc"]');
			return hasGroups || hasError;
		});
		if (ok) {
			mounted = true;
			break;
		}
		await page.waitForTimeout(200);
	}
	// Extra settle for layout.
	await page.waitForTimeout(400);

	// Full-page screenshot.
	const initialShot = path.join(protocolOutDir, "initial.png");
	await page.screenshot({ path: initialShot, fullPage: false });

	// Walk DOM.
	const walk = await walkScene(page);

	// Per-placement screenshots.
	const placementFindings = [];
	for (const p of walk.placements) {
		const finding = classifyPlacement(p);
		let shotRel = null;
		if (
			p.bbox &&
			p.bbox.width > 0 &&
			p.bbox.height > 0 &&
			p.bbox.x >= 0 &&
			p.bbox.y >= 0
		) {
			const shotName = `obj_${p.placement_name || p.object_name}.png`.replace(
				/[^a-zA-Z0-9._-]/g,
				"_",
			);
			const shotAbs = path.join(protocolOutDir, shotName);
			try {
				await page.screenshot({
					path: shotAbs,
					clip: {
						x: Math.max(0, Math.floor(p.bbox.x)),
						y: Math.max(0, Math.floor(p.bbox.y)),
						width: Math.min(
							1280 - Math.floor(p.bbox.x),
							Math.ceil(p.bbox.width),
						),
						height: Math.min(
							900 - Math.floor(p.bbox.y),
							Math.ceil(p.bbox.height),
						),
					},
				});
				shotRel = path.relative(OUT_DIR, shotAbs);
			} catch (e) {
				// Clip out of bounds; skip per-object screenshot.
				shotRel = null;
			}
		}
		placementFindings.push({
			...p,
			finding: finding,
			screenshot: shotRel,
		});
	}

	await ctx.close();

	return {
		protocol_name: protocolName,
		html_file: htmlFile,
		mounted: mounted,
		runtime_error: walk.runtimeError || null,
		console_errors: consoleErrors,
		failed_requests: failedRequests,
		initial_screenshot: path.relative(OUT_DIR, initialShot),
		placements: placementFindings,
	};
}

//============================================
// Aggregate stats and write reports.
//============================================

function aggregate(results) {
	const summary = {
		protocols_total: results.length,
		protocols_mounted: 0,
		protocols_failed_to_mount: 0,
		objects_total: 0,
		objects_real_svg: 0,
		objects_thin_svg_advisory: 0,
		hard_fails: 0,
		by_category: {
			fallback_rectangle: 0,
			generated_placeholder: 0,
			empty_bubble: 0,
			missing_svg: 0,
			generic_outline: 0,
			non_scientific_blob: 0,
			thin_svg: 0,
			real_svg: 0,
		},
		by_protocol: {},
	};

	for (const r of results) {
		if (r.mounted) summary.protocols_mounted += 1;
		else summary.protocols_failed_to_mount += 1;

		const perProto = {
			total: r.placements.length,
			real_svg: 0,
			hard_fails: 0,
			categories: {},
		};
		for (const p of r.placements) {
			summary.objects_total += 1;
			const cat = p.finding.category;
			summary.by_category[cat] = (summary.by_category[cat] || 0) + 1;
			perProto.categories[cat] = (perProto.categories[cat] || 0) + 1;
			if (p.finding.severity === "hard_fail") {
				summary.hard_fails += 1;
				perProto.hard_fails += 1;
			}
			if (p.finding.severity === "ok") {
				summary.objects_real_svg += 1;
				perProto.real_svg += 1;
			}
			if (p.finding.severity === "advisory") {
				summary.objects_thin_svg_advisory += 1;
			}
		}
		summary.by_protocol[r.protocol_name] = perProto;
	}
	return summary;
}

function writeMarkdownReport(summary, results) {
	let md = "";
	md += "# Runtime SVG completeness audit\n\n";
	md += `Generated by [tests/playwright/forensic_svg_completeness.mjs](../../../tests/playwright/forensic_svg_completeness.mjs).\n\n`;
	md += "## Summary\n\n";
	md += `- Protocols audited: ${summary.protocols_total}\n`;
	md += `- Protocols mounted ok: ${summary.protocols_mounted}\n`;
	md += `- Protocols failed to mount: ${summary.protocols_failed_to_mount}\n`;
	md += `- Total rendered placements: ${summary.objects_total}\n`;
	md += `- Real SVG assets: ${summary.objects_real_svg}\n`;
	md += `- Hard fails: ${summary.hard_fails}\n`;
	md += `- Thin-SVG advisories: ${summary.objects_thin_svg_advisory}\n\n`;
	md += "## Hard-fail categories\n\n";
	md += "| Category | Count |\n| --- | --- |\n";
	const order = [
		"fallback_rectangle",
		"generated_placeholder",
		"empty_bubble",
		"missing_svg",
		"generic_outline",
		"non_scientific_blob",
	];
	for (const c of order) {
		md += `| ${c} | ${summary.by_category[c] || 0} |\n`;
	}
	md += `| thin_svg (advisory) | ${summary.by_category.thin_svg || 0} |\n`;
	md += `| real_svg (ok) | ${summary.by_category.real_svg || 0} |\n\n`;

	md += "## Per-protocol summary\n\n";
	md += "| Protocol | Total | Real SVG | Hard fails |\n| --- | --- | --- | --- |\n";
	const protoKeys = Object.keys(summary.by_protocol).sort();
	for (const k of protoKeys) {
		const s = summary.by_protocol[k];
		md += `| ${k} | ${s.total} | ${s.real_svg} | ${s.hard_fails} |\n`;
	}
	md += "\n";

	md += "## Per-object findings\n\n";
	md += "| Protocol | Placement | Object | Target | Asset | Has inline SVG | Uses fallback | Category | Severity | Detail | Screenshot |\n";
	md += "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";
	for (const r of results) {
		for (const p of r.placements) {
			const cells = [
				r.protocol_name,
				p.placement_name || "",
				p.object_name || "",
				p.target_id || "",
				p.asset_name || (p.deferred ? "(deferred)" : "(none)"),
				p.has_inline_svg ? "yes" : "no",
				p.uses_fallback ? "yes" : "no",
				p.finding.category,
				p.finding.severity,
				p.finding.detail.replace(/\|/g, "\\|"),
				p.screenshot ? p.screenshot : "(none)",
			];
			md += `| ${cells.join(" | ")} |\n`;
		}
	}
	md += "\n";

	md += "## Recommended fixes\n\n";
	md += "- `missing_svg`: confirm the asset's SVG file exists in `assets/` and is wired into the asset registry; check the asset name spelling against `data-asset`.\n";
	md += "- `generated_placeholder` / deferred: ensure the object's `visual_states` resolves at least one asset for the object's default state.\n";
	md += "- `fallback_rectangle`: see renderer `src/scene_runtime/render/scene.ts` for the fallback path; the placement has no asset attribution at all and should never ship.\n";
	md += "- `empty_bubble`: the group rendered with neither an SVG child nor a fallback rect; investigate the renderer path that emitted an empty group.\n";
	md += "- `generic_outline` / `thin_svg`: the inline SVG has <= 1 shape; replace with a real scientific asset matching the object's geometry.\n\n";

	// Status footer
	let status;
	if (summary.protocols_failed_to_mount > 0) {
		status = "NEEDS_CONTEXT (some protocols failed to mount)";
	} else if (summary.hard_fails === 0) {
		status = "DONE (0 fallbacks)";
	} else {
		status = `DONE_WITH_CONCERNS (${summary.hard_fails} hard fails documented)`;
	}
	md += `## Status\n\n${status}\n`;
	return md;
}

function writeIndexHtml(summary, results) {
	let html = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
	html += "<title>SVG completeness index</title>";
	html += "<style>";
	html += "body{font-family:-apple-system,sans-serif;margin:20px;background:#fafafa}";
	html += "h1,h2{color:#333}";
	html += "table{border-collapse:collapse;margin:10px 0;background:white}";
	html += "th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;vertical-align:top}";
	html += "th{background:#eee}";
	html += "tr.hard{background:#ffd9d9}";
	html += "tr.advisory{background:#fff6cc}";
	html += "img.thumb{max-width:160px;max-height:120px;display:block;border:1px solid #999}";
	html += ".proto-section{margin:30px 0;background:white;padding:15px;border:1px solid #ddd}";
	html += ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}";
	html += ".grid figure{margin:0;padding:6px;border:1px solid #ccc;background:#fff}";
	html += ".grid figure.hard{border-color:#c00;background:#ffeaea}";
	html += ".grid figure figcaption{font-size:11px;word-break:break-word}";
	html += "</style></head><body>";

	html += "<h1>Runtime SVG completeness audit</h1>";
	html += "<h2>Summary</h2>";
	html += "<table><tr><th>Metric</th><th>Value</th></tr>";
	html += `<tr><td>Protocols audited</td><td>${summary.protocols_total}</td></tr>`;
	html += `<tr><td>Protocols mounted</td><td>${summary.protocols_mounted}</td></tr>`;
	html += `<tr><td>Protocols failed to mount</td><td>${summary.protocols_failed_to_mount}</td></tr>`;
	html += `<tr><td>Total placements</td><td>${summary.objects_total}</td></tr>`;
	html += `<tr><td>Real SVG</td><td>${summary.objects_real_svg}</td></tr>`;
	html += `<tr><td>Hard fails</td><td><strong>${summary.hard_fails}</strong></td></tr>`;
	html += `<tr><td>Thin-SVG advisories</td><td>${summary.objects_thin_svg_advisory}</td></tr>`;
	html += "</table>";

	html += "<h2>Hard-fail categories</h2>";
	html += "<table><tr><th>Category</th><th>Count</th></tr>";
	for (const c of [
		"fallback_rectangle",
		"generated_placeholder",
		"empty_bubble",
		"missing_svg",
		"generic_outline",
		"non_scientific_blob",
		"thin_svg",
		"real_svg",
	]) {
		html += `<tr><td>${c}</td><td>${summary.by_category[c] || 0}</td></tr>`;
	}
	html += "</table>";

	html += "<h2>Per-protocol summary</h2>";
	html += "<table><tr><th>Protocol</th><th>Total</th><th>Real SVG</th><th>Hard fails</th></tr>";
	const protoKeys = Object.keys(summary.by_protocol).sort();
	for (const k of protoKeys) {
		const s = summary.by_protocol[k];
		const rowClass = s.hard_fails > 0 ? "hard" : "";
		html += `<tr class="${rowClass}"><td><a href="#p_${k}">${k}</a></td><td>${s.total}</td><td>${s.real_svg}</td><td>${s.hard_fails}</td></tr>`;
	}
	html += "</table>";

	for (const r of results) {
		html += `<div class="proto-section" id="p_${r.protocol_name}">`;
		html += `<h2>${r.protocol_name}</h2>`;
		if (r.runtime_error) {
			html += `<p style='color:#c00'><strong>Runtime error:</strong> ${r.runtime_error.replace(/[<>]/g, "")}</p>`;
		}
		html += `<p><img class="thumb" style="max-width:600px;max-height:420px" src="${r.protocol_name}/initial.png"/></p>`;
		html += '<div class="grid">';
		for (const p of r.placements) {
			const cls = p.finding.severity === "hard_fail" ? "hard" : "";
			const shotHtml = p.screenshot
				? `<img class="thumb" src="${p.screenshot}"/>`
				: "(no screenshot)";
			html += `<figure class="${cls}">${shotHtml}<figcaption>`;
			html += `<strong>${p.placement_name || ""}</strong><br>`;
			html += `obj: ${p.object_name || ""}<br>`;
			html += `asset: ${p.asset_name || (p.deferred ? "(deferred)" : "(none)")}<br>`;
			html += `cat: ${p.finding.category}<br>`;
			html += `shapes: ${p.inline_shape_count}`;
			html += "</figcaption></figure>";
		}
		html += "</div></div>";
	}

	html += "</body></html>";
	return html;
}

//============================================
// Main.
//============================================

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true });
	fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

	const htmls = listProtocolHtml();
	console.log(`Auditing ${htmls.length} protocol HTML files in ${DIST_DIR}`);

	const browser = await chromium.launch();
	const results = [];
	for (const html of htmls) {
		const startTime = Date.now();
		process.stdout.write(`  ${html} ... `);
		try {
			const r = await auditProtocol(browser, html);
			const ms = Date.now() - startTime;
			const hardFails = r.placements.filter(
				(p) => p.finding.severity === "hard_fail",
			).length;
			console.log(
				`${r.placements.length} placements, ${hardFails} hard fails (${ms}ms)`,
			);
			results.push(r);
		} catch (e) {
			console.log(`ERROR: ${e.message}`);
			results.push({
				protocol_name: html.replace(/\.html$/, ""),
				html_file: html,
				mounted: false,
				runtime_error: String(e),
				placements: [],
				console_errors: [],
				failed_requests: [],
				initial_screenshot: null,
			});
		}
	}
	await browser.close();

	const summary = aggregate(results);

	const auditJsonPath = path.join(OUT_DIR, "audit.json");
	fs.writeFileSync(
		auditJsonPath,
		JSON.stringify({ summary, results }, null, 2),
	);
	console.log(`Wrote ${auditJsonPath}`);

	const indexHtmlPath = path.join(OUT_DIR, "INDEX.html");
	fs.writeFileSync(indexHtmlPath, writeIndexHtml(summary, results));
	console.log(`Wrote ${indexHtmlPath}`);

	fs.writeFileSync(REPORT_PATH, writeMarkdownReport(summary, results));
	console.log(`Wrote ${REPORT_PATH}`);

	console.log("\n=== Summary ===");
	console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
