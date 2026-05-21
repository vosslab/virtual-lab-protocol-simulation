#!/usr/bin/env node

//============================================
// score_layout.mjs: Layout quality scorer
//
// Reads precheck output (visual_audit.json, sizing_manifest.json) and emits
// ranked scorecard (scorecard.json, scorecard.md) per NEW0 scene.
//
// Usage:
//   node score_layout.mjs [--compare <dir_a> <dir_b>]
//
// Default audit dir: test-results/new0_css_native/audit/ (or stabilized/ if audit missing).
// Output dir: test-results/new0_css_native/scorecard/
//============================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//============================================
// Constants and configuration
//============================================

const REPO_ROOT = findRepoRoot();
const DEFAULT_AUDIT_DIR = path.join(
	REPO_ROOT,
	"test-results/new0_css_native/audit"
);
const DEFAULT_STABILIZED_DIR = path.join(
	REPO_ROOT,
	"test-results/new0_css_native/stabilized"
);
const SCORECARD_OUTPUT_DIR = path.join(
	REPO_ROOT,
	"test-results/new0_css_native/scorecard"
);

const SCENE_CLASS_MANIFEST_PATH = path.join(
	__dirname,
	"scene_class_manifest.yaml"
);

// Weight tables per scene class (will be normalized)
// NEW1.5 Lane C: Revised weights to separate template scenes by class.
// Templates are sparse by design (single-instrument skeletons); set
// scene_occupied and region_filling to 0 to avoid penalizing sparse layouts.
const WEIGHT_TABLES = {
	template: {
		primary_area_ratio: 0.0,
		label_overlap: 0.40,
		scene_occupied: 0.0,
		support_distance: 0.0,
		balance: 0.20,
		region_filling: 0.0,
		label_readability: 0.40,
		aspect_ratio_fidelity: 0.0,
		primary_prominence: 0.0,
	},
	composition: {
		primary_area_ratio: 0.25,
		label_overlap: 0.15,
		scene_occupied: 0.15,
		support_distance: 0.20,
		balance: 0.15,
		region_filling: 0.0,
		label_readability: 0.05,
		aspect_ratio_fidelity: 0.05,
		primary_prominence: 0.0,
	},
	instrument_heavy: {
		primary_area_ratio: 0.35,
		label_overlap: 0.15,
		scene_occupied: 0.15,
		support_distance: 0.20,
		balance: 0.0,
		region_filling: 0.0,
		label_readability: 0.05,
		aspect_ratio_fidelity: 0.10,
		primary_prominence: 0.0,
	},
	zoom_detail: {
		primary_area_ratio: 0.50,
		label_overlap: 0.10,
		scene_occupied: 0.20,
		support_distance: 0.0,
		balance: 0.10,
		region_filling: 0.0,
		label_readability: 0.10,
		aspect_ratio_fidelity: 0.0,
		primary_prominence: 0.0,
	},
	dense_clutter: {
		primary_area_ratio: 0.05,
		label_overlap: 0.30,
		scene_occupied: 0.10,
		support_distance: 0.20,
		balance: 0.0,
		region_filling: 0.0,
		label_readability: 0.25,
		aspect_ratio_fidelity: 0.10,
		primary_prominence: 0.0,
	},
};

const RECOMMENDATION_TAXONOMY = {
	primary_area_increase: "Enlarge primary object or re-tag data-primary",
	label_separation: "Move/resize labels; eliminate overlaps",
	support_repositioning: "Move supporting objects closer to primary",
	balance_distribution: "Reposition to fill empty quadrants evenly",
	region_density_tuning: "Rebalance footprints across regions",
	aspect_ratio_correction: "Adjust footprint aspect ratios",
	primary_prominence_boost: "Increase contrast between primary and support",
};

//============================================
// Utilities
//============================================

function findRepoRoot() {
	let current = __dirname;
	while (current !== "/") {
		if (fs.existsSync(path.join(current, ".git"))) {
			return current;
		}
		current = path.dirname(current);
	}
	throw new Error("Could not find repo root");
}

function parseArgs() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		return { mode: "single", auditDir: null };
	}
	if (args[0] === "--compare" && args.length === 3) {
		return { mode: "compare", dirA: args[1], dirB: args[2] };
	}
	console.error(
		"Usage: node score_layout.mjs [--compare <dir_a> <dir_b>]"
	);
	process.exit(1);
}

function resolveAuditDir() {
	if (fs.existsSync(DEFAULT_AUDIT_DIR)) {
		return DEFAULT_AUDIT_DIR;
	}
	if (fs.existsSync(DEFAULT_STABILIZED_DIR)) {
		console.log(
			`Note: audit/ missing, using stabilized/ at ${DEFAULT_STABILIZED_DIR}`
		);
		return DEFAULT_STABILIZED_DIR;
	}
	throw new Error(
		`Neither audit/ nor stabilized/ found. Checked:\n  ${DEFAULT_AUDIT_DIR}\n  ${DEFAULT_STABILIZED_DIR}`
	);
}

function readJsonFile(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	return JSON.parse(content);
}

function loadSceneClassManifest() {
	// Simple YAML parser for our manifest
	// Only reads the scenes list (lines with "- scene_name:" pattern)
	const content = fs.readFileSync(SCENE_CLASS_MANIFEST_PATH, "utf8");
	const lines = content.split("\n");

	const manifest = {};
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line.startsWith("- scene_name:")) {
			const sceneName = line.match(/"([^"]+)"|: (.+)/)[1] || line.split(":")[1].trim().replaceAll('"', "");
			// Find class on next lines
			let sceneClass = "composition"; // fallback
			for (let j = i; j < Math.min(i + 5, lines.length); j++) {
				if (lines[j].includes("class:")) {
					sceneClass = lines[j]
						.split("class:")[1]
						.trim()
						.replaceAll('"', "");
					break;
				}
			}
			manifest[sceneName] = sceneClass;
		}
	}
	return manifest;
}

function getSceneClass(sceneName, manifest) {
	if (manifest[sceneName]) {
		return manifest[sceneName];
	}
	// Fallback heuristic
	if (sceneName.includes("zoom")) {
		return "zoom_detail";
	}
	if (sceneName.includes("dense")) {
		return "dense_clutter";
	}
	return "composition";
}

function normalizeMetric(value, min = 0, max = 100) {
	return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function computePrimaryAreaRatioScore(ratio) {
	// Higher ratio = higher score. Sigmoid-like normalization.
	if (ratio === null || ratio === undefined) {
		return 0;
	}
	// For zoom (70%+) and composition (15%+), scores are inverted.
	// Simple linear: clamp ratio to 0-100 directly.
	return Math.min(100, ratio);
}

function computeLabelOverlapScore(labelLabelCount, svgLabelCount) {
	const totalOverlap = (labelLabelCount || 0) + (svgLabelCount || 0);
	if (totalOverlap === 0) {
		return 100;
	}
	// Each overlap deducts points
	return Math.max(0, 100 - totalOverlap * 30);
}

function computeSceneOccupiedScore(whitespacePct) {
	// Inverse of whitespace: higher occupied = higher score
	return 100 - (whitespacePct || 0);
}

function computeSupportDistanceScore(supportDistanceData) {
	if (!supportDistanceData || supportDistanceData.skipped) {
		return 100;
	}
	if (!supportDistanceData.mean_normalized_distance) {
		return 100;
	}
	const distance = supportDistanceData.mean_normalized_distance;
	if (distance > 1.0) {
		return 0;
	}
	return 100 * (1 - distance);
}

function computeBalanceScore(largestEmptyBand, sceneArea) {
	if (!largestEmptyBand || !sceneArea) {
		return 50;
	}
	const bandArea = (largestEmptyBand.w || 0) * (largestEmptyBand.h || 0);
	const bandRatio = bandArea / sceneArea;
	if (bandRatio > 0.5) {
		return 0;
	}
	return 100 * (1 - bandRatio * 2);
}

function computeRegionFillingScore(regionWhitespaceData) {
	if (!regionWhitespaceData || regionWhitespaceData.length === 0) {
		return 50;
	}
	const regionsWithObjects = regionWhitespaceData.filter((r) => r.placement_count > 0);
	if (regionsWithObjects.length === 0) {
		return 50;
	}
	const meanWhitespace =
		regionsWithObjects.reduce((sum, r) => sum + r.whitespace_pct, 0) /
		regionsWithObjects.length;
	// 0% whitespace = score 100; 80%+ whitespace = score 0
	return Math.max(0, 100 - meanWhitespace);
}

function computeLabelReadabilityScore(artworkIntegrity) {
	if (!artworkIntegrity || !artworkIntegrity.natural_vs_rendered) {
		return 100;
	}
	const entries = artworkIntegrity.natural_vs_rendered || [];
	let clippedCount = 0;
	entries.forEach((entry) => {
		if (entry.severity && entry.severity !== "OK") {
			clippedCount++;
		}
	});
	return Math.max(0, 100 - clippedCount * 25);
}

function computeAspectRatioFidelityScore(sizingManifest, sceneName) {
	if (!sizingManifest || !sizingManifest.entries) {
		return 100;
	}
	const sceneEntries = (sizingManifest.entries || []).filter(
		(e) => e.scene === sceneName
	);
	if (sceneEntries.length === 0) {
		return 100;
	}
	const meanMismatch =
		sceneEntries.reduce((sum, e) => sum + (e.aspect_ratio_mismatch_pct || 0), 0) /
		sceneEntries.length;
	// 0% mismatch = 100; 50%+ mismatch = 0
	return Math.max(0, 100 - meanMismatch);
}

function computePrimaryProminenceScore(primaryArea, placements) {
	if (!primaryArea || primaryArea <= 0 || !placements || placements.length < 2) {
		return 100;
	}
	let maxSupportArea = 0;
	placements.forEach((p) => {
		if (p.area && p.area > 0 && p.area !== primaryArea) {
			maxSupportArea = Math.max(maxSupportArea, p.area);
		}
	});
	if (maxSupportArea === 0) {
		return 100;
	}
	const ratio = primaryArea / maxSupportArea;
	if (ratio >= 2.0) {
		return 100;
	}
	if (ratio < 1.0) {
		return 0;
	}
	return 50 + (ratio - 1.0) * 50;
}

function computeSceneMetrics(sceneData, sizingManifest, sceneName) {
	const checks = sceneData.checks || {};

	const hardFailCount =
		(checks.clipped_artwork || []).length +
		(checks.off_page || []).length +
		(checks.svg_svg_overlap || []).length +
		(checks.region_overflow || []).length;

	const primaryObject = checks.primary_object || {};
	const sceneArea =
		(sceneData.scene_container?.width || 1) *
		(sceneData.scene_container?.height || 1);

	// Collect all placements for area-based metrics
	const allPlacements = [];
	if (checks.artwork_integrity?.natural_vs_rendered) {
		checks.artwork_integrity.natural_vs_rendered.forEach((entry) => {
			if (entry.placement_name) {
				allPlacements.push({
					name: entry.placement_name,
					area: (entry.rendered_width_px || 0) * (entry.rendered_height_px || 0),
				});
			}
		});
	}

	const metrics = {
		primary_area_ratio: computePrimaryAreaRatioScore(primaryObject.ratio || 0),
		label_overlap: computeLabelOverlapScore(
			(checks.label_label_overlap || []).length,
			(checks.svg_label_overlap || []).length
		),
		scene_occupied: computeSceneOccupiedScore(
			checks.scene_whitespace?.whitespace_pct || 0
		),
		support_distance: computeSupportDistanceScore(checks.supporting_distance),
		balance: computeBalanceScore(checks.largest_empty_band, sceneArea),
		region_filling: computeRegionFillingScore(
			checks.region_whitespace || []
		),
		label_readability: computeLabelReadabilityScore(
			checks.artwork_integrity
		),
		aspect_ratio_fidelity: computeAspectRatioFidelityScore(
			sizingManifest,
			sceneName
		),
		primary_prominence: computePrimaryProminenceScore(
			primaryObject.area,
			allPlacements
		),
	};

	return { hardFailCount, metrics, primaryObject };
}

function computeTotalScore(metrics, weights) {
	const normalizedWeights = {};
	const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);

	Object.keys(weights).forEach((key) => {
		normalizedWeights[key] = weights[key] / weightSum;
	});

	let weightedSum = 0;
	Object.keys(metrics).forEach((metricKey) => {
		const metricScore = metrics[metricKey] || 0;
		const weight = normalizedWeights[metricKey] || 0;
		weightedSum += metricScore * weight;
	});

	return Math.round(Math.max(0, Math.min(100, weightedSum)));
}

function getTopWorstMetrics(metrics, weights, count = 3) {
	const normalizedWeights = {};
	const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
	Object.keys(weights).forEach((key) => {
		normalizedWeights[key] = weights[key] / weightSum;
	});

	const metricsArray = Object.entries(metrics)
		.map(([name, score]) => ({
			name,
			score,
			weight: normalizedWeights[name] || 0,
			penalty: (100 - score) * (normalizedWeights[name] || 0),
		}))
		.sort((a, b) => b.penalty - a.penalty);

	return metricsArray.slice(0, count);
}

function recommendAdjustment(topWorstMetrics) {
	if (!topWorstMetrics || topWorstMetrics.length === 0) {
		return null;
	}
	const worst = topWorstMetrics[0].name;
	const mapping = {
		primary_area_ratio: "primary_area_increase",
		label_overlap: "label_separation",
		label_readability: "label_separation",
		support_distance: "support_repositioning",
		balance: "balance_distribution",
		region_filling: "region_density_tuning",
		aspect_ratio_fidelity: "aspect_ratio_correction",
		primary_prominence: "primary_prominence_boost",
	};
	return mapping[worst] || "primary_area_increase";
}

function scoreScene(sceneData, sceneName, manifest, sizingManifest) {
	const sceneClass = getSceneClass(sceneName, manifest);
	const { hardFailCount, metrics, primaryObject } = computeSceneMetrics(
		sceneData,
		sizingManifest,
		sceneName
	);

	let totalScore = 0;
	if (hardFailCount > 0) {
		totalScore = 0;
	} else {
		const weights = WEIGHT_TABLES[sceneClass] || WEIGHT_TABLES.composition;
		totalScore = computeTotalScore(metrics, weights);
	}

	const topWorstMetrics = getTopWorstMetrics(
		metrics,
		WEIGHT_TABLES[sceneClass] || WEIGHT_TABLES.composition,
		3
	);
	const recommendedAdjustment = recommendAdjustment(topWorstMetrics);

	return {
		scene_name: sceneName,
		scene_class: sceneClass,
		total_layout_score: totalScore,
		metrics,
		hard_fails: hardFailCount,
		primary_detection: primaryObject.found_by || "unknown",
		primary_ratio: primaryObject.ratio || null,
		top_worst_metrics: topWorstMetrics.map((m) => ({
			metric_name: m.name,
			score: Math.round(m.score),
			penalty: Math.round(m.penalty),
		})),
		recommended_adjustment: recommendedAdjustment,
		recommendation_text:
			RECOMMENDATION_TAXONOMY[recommendedAdjustment] || "Review layout",
	};
}

function scoreAllScenes(auditDir, manifest, sizingManifest) {
	const auditPath = path.join(auditDir, "visual_audit.json");
	if (!fs.existsSync(auditPath)) {
		throw new Error(`visual_audit.json not found at ${auditPath}`);
	}

	const auditData = readJsonFile(auditPath);
	const scenes = auditData.scenes || [];

	const scoredScenes = scenes.map((sceneData) => {
		const sceneName = sceneData.scene;
		return scoreScene(sceneData, sceneName, manifest, sizingManifest);
	});

	scoredScenes.sort((a, b) => b.total_layout_score - a.total_layout_score);

	return {
		generated_at: new Date().toISOString(),
		audit_source: auditDir,
		total_scenes: scoredScenes.length,
		scenes: scoredScenes,
	};
}

function generateMarkdownReport(scorecard) {
	let markdown = "";
	markdown += "# Layout Scorecard Report\n\n";
	markdown += `Generated: ${scorecard.generated_at}\n`;
	markdown += `Audit source: ${scorecard.audit_source}\n`;
	markdown += `Total scenes: ${scorecard.total_scenes}\n\n`;

	markdown += "## Ranked Scenes (by total_layout_score)\n\n";
	markdown += "| Rank | Scene | Class | Score | Hard Fails | Top Worst Metric | Recommendation |\n";
	markdown += "| --- | --- | --- | --- | --- | --- | --- |\n";

	scorecard.scenes.forEach((scene, idx) => {
		const topWorst =
			scene.top_worst_metrics.length > 0
				? scene.top_worst_metrics[0].metric_name
				: "N/A";
		const recommendation = scene.recommended_adjustment || "N/A";
		markdown += `| ${idx + 1} | ${scene.scene_name} | ${scene.scene_class} | ${scene.total_layout_score} | ${scene.hard_fails} | ${topWorst} | ${recommendation} |\n`;
	});

	markdown += "\n## Per-Scene Breakdown\n\n";

	scorecard.scenes.forEach((scene) => {
		markdown += `### ${scene.scene_name}\n\n`;
		markdown += `- **Class**: ${scene.scene_class}\n`;
		markdown += `- **Total Score**: ${scene.total_layout_score}/100\n`;
		markdown += `- **Hard Fails**: ${scene.hard_fails}\n`;
		markdown += `- **Primary Detection**: ${scene.primary_detection}\n`;
		markdown += `- **Primary Ratio**: ${scene.primary_ratio !== null ? (scene.primary_ratio.toFixed(1) + "%") : "N/A"}\n\n`;

		markdown += "#### Metrics\n\n";
		markdown += "| Metric | Score |\n";
		markdown += "| --- | --- |\n";
		Object.entries(scene.metrics).forEach(([key, value]) => {
			markdown += `| ${key} | ${Math.round(value)} |\n`;
		});

		markdown += `\n#### Top 3 Worst Metrics\n\n`;
		markdown += "| Metric | Score | Penalty |\n";
		markdown += "| --- | --- | --- |\n";
		scene.top_worst_metrics.forEach((m) => {
			markdown += `| ${m.metric_name} | ${m.score} | ${m.penalty} |\n`;
		});

		markdown += `\n#### Recommendation\n\n`;
		markdown += `- **Adjustment**: ${scene.recommended_adjustment}\n`;
		markdown += `- **Action**: ${scene.recommendation_text}\n\n`;
	});

	return markdown;
}

function ensureOutputDir() {
	if (!fs.existsSync(SCORECARD_OUTPUT_DIR)) {
		fs.mkdirSync(SCORECARD_OUTPUT_DIR, { recursive: true });
	}
}

function saveScorecard(scorecard) {
	ensureOutputDir();

	const jsonPath = path.join(SCORECARD_OUTPUT_DIR, "scorecard.json");
	fs.writeFileSync(jsonPath, JSON.stringify(scorecard, null, 2));
	console.log(`Scorecard JSON written to ${jsonPath}`);

	const mdPath = path.join(SCORECARD_OUTPUT_DIR, "scorecard.md");
	const markdown = generateMarkdownReport(scorecard);
	fs.writeFileSync(mdPath, markdown);
	console.log(`Scorecard Markdown written to ${mdPath}`);
}

function compareScorecards(dirA, dirB) {
	console.log("\nComparison mode (not yet implemented in detail)");
	console.log(`Comparing:\n  ${dirA}\n  ${dirB}`);

	// Load both JSONs
	const scoreA = readJsonFile(path.join(dirA, "scorecard.json"));
	const scoreB = readJsonFile(path.join(dirB, "scorecard.json"));

	console.log("\nScene-by-scene deltas:\n");
	scoreA.scenes.forEach((sceneA) => {
		const sceneB = scoreB.scenes.find((s) => s.scene_name === sceneA.scene_name);
		if (sceneB) {
			const delta = sceneB.total_layout_score - sceneA.total_layout_score;
			const sign = delta > 0 ? "+" : "";
			console.log(
				`${sceneA.scene_name}: ${sceneA.total_layout_score} -> ${sceneB.total_layout_score} (${sign}${delta})`
			);
		}
	});
}

//============================================
// Main
//============================================

async function main() {
	try {
		const args = parseArgs();
		const manifest = loadSceneClassManifest();

		if (args.mode === "single") {
			const auditDir = args.auditDir || resolveAuditDir();
			const sizingManifestPath = path.join(auditDir, "sizing_manifest.json");
			const sizingManifest = fs.existsSync(sizingManifestPath)
				? readJsonFile(sizingManifestPath)
				: { entries: [] };

			console.log(`Scoring layouts from ${auditDir}`);
			const scorecard = scoreAllScenes(auditDir, manifest, sizingManifest);
			saveScorecard(scorecard);

			console.log("\nTop 3 scenes by score:");
			scorecard.scenes.slice(0, 3).forEach((s, idx) => {
				console.log(`  ${idx + 1}. ${s.scene_name}: ${s.total_layout_score}`);
			});

			console.log("\nBottom 3 scenes by score:");
			scorecard.scenes
				.slice(-3)
				.reverse()
				.forEach((s, idx) => {
					console.log(
						`  ${idx + 1}. ${s.scene_name}: ${s.total_layout_score}`
					);
				});
		} else if (args.mode === "compare") {
			compareScorecards(args.dirA, args.dirB);
		}
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

main();
