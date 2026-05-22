#!/usr/bin/env node
/**
 * FORENSIC TASK FG: Walker sweep driver.
 *
 * Runs the existing walker engine (tests/playwright/walker/engine.mjs) against
 * every protocol HTML in dist/. Emits a JSON summary with:
 *  - walkthroughCount: protocols that completed end-to-end via runWalker
 *  - clickWorksCount: total successful interactions across all walks
 *    (proxy for click -> validator -> ObjectStateChange -> advance)
 *  - oscCountTop10: total ObjectStateChange events observed in the top-10
 *    walkthroughs (instrumented via window.__OSC_EVENT_COUNT if available;
 *    otherwise approximated by interactionsWalked, with caveat noted).
 */

import { runWalker } from "./walker/engine.mjs";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const DIST_DIR = path.join(REPO_ROOT, "dist");
const OUT_DIR = path.join(REPO_ROOT, "test-results", "forensic_fg");
fs.mkdirSync(OUT_DIR, { recursive: true });

function listProtocols() {
	const files = fs
		.readdirSync(DIST_DIR)
		.filter((f) => f.endsWith(".html") && f !== "index.html");
	files.sort();
	return files.map((f) => path.basename(f, ".html"));
}

async function main() {
	const protocols = listProtocols();
	console.log(`Walker sweep over ${protocols.length} protocols`);
	const results = [];
	for (const name of protocols) {
		const screenshotDir = path.join(OUT_DIR, "screenshots", name);
		fs.mkdirSync(screenshotDir, { recursive: true });
		try {
			const r = await runWalker({
				protocolName: name,
				headless: true,
				verbosity: "quiet",
				screenshotDir,
			});
			results.push({
				protocol: name,
				success: !!r.success,
				stepsWalked: r.stepsWalked,
				stepsTotal: r.stepsTotal,
				interactionsWalked: r.interactionsWalked,
				failedStepName: r.failedStepName || null,
				errorMessage: r.errorMessage || null,
			});
			console.log(
				`[${r.success ? "OK  " : "FAIL"}] ${name}  steps=${r.stepsWalked}/${r.stepsTotal} inter=${r.interactionsWalked}${r.errorMessage ? "  err=" + r.errorMessage.slice(0, 120) : ""}`,
			);
		} catch (err) {
			results.push({
				protocol: name,
				success: false,
				stepsWalked: 0,
				stepsTotal: 0,
				interactionsWalked: 0,
				failedStepName: null,
				errorMessage: String(err.message || err),
			});
			console.log(`[FAIL] ${name}  err=${err.message}`);
		}
	}

	const walkthroughCount = results.filter((r) => r.success).length;
	const totalClicks = results.reduce((s, r) => s + r.interactionsWalked, 0);
	const top10 = results
		.slice()
		.sort((a, b) => b.interactionsWalked - a.interactionsWalked)
		.slice(0, 10);
	const oscCountTop10 = top10.reduce((s, r) => s + r.interactionsWalked, 0);

	const summary = {
		generated_at: new Date().toISOString(),
		protocol_count: results.length,
		walkthroughCount,
		clickWorksCount: totalClicks,
		oscCountTop10,
		osc_caveat:
			"OSC counted indirectly as interactionsWalked; walker does not currently expose a direct ObjectStateChange event tap.",
		top10: top10.map((r) => ({
			protocol: r.protocol,
			interactionsWalked: r.interactionsWalked,
		})),
		per_protocol: results,
	};
	const outFile = path.join(OUT_DIR, "walker_sweep.json");
	fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
	console.log(`\nWrote ${outFile}`);
	console.log(
		`walkthroughs=${walkthroughCount}/${results.length}  clickWorks=${totalClicks}  oscTop10=${oscCountTop10}`,
	);
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
