// SIDE-QUEST evidence tool (throwaway, read-only with respect to the engine).
// Runs runPipeline over every generated scene at a canonical 16:9 viewport and
// records per-scene layout diagnostics, pass count, and convergence state.
// Emits a Markdown baseline report under docs/active_plans/reports/.
//
// Run with:
//   node --import tsx tests/e2e_layout_diagnostics_baseline.mjs
//
// This is a current-state baseline only. It does not edit src/, generated/, or
// tools/, and it runs no git commands.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPipeline } from "../src/scene_runtime/layout/index.ts";
import { SCENES } from "../generated/scenes.ts";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../generated/object_library.ts";

// Canonical 16:9 viewport. DEFAULT_VIEWPORT in the engine is already 1920x1080,
// but we pass it explicitly so the baseline is unambiguous and self-documenting.
const VIEWPORT = { w: 1920, h: 1080 };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REPORT_DIR = path.join(REPO_ROOT, "docs", "active_plans", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "layout_diagnostics_baseline.md");

// ============================================================
// Run the pipeline for one scene and reduce to a record.
// ============================================================
function recordScene(sceneName, scene) {
  const record = {
    scene: sceneName,
    error: undefined,
    passes: 0,
    converged: false,
    maxIterations: false,
    totalDiagnostics: 0,
    kindCounts: {},
  };

  let result;
  try {
    result = runPipeline(scene, {
      library: OBJECT_LIBRARY,
      assets: ASSET_SPECS,
      // Every scene in generated/scenes.ts is self-contained (no extends), so an
      // empty baseSceneMap is correct; resolveInheritance is a no-op for them.
      baseSceneMap: SCENES,
      viewport: VIEWPORT,
    });
  } catch (err) {
    record.error = err && err.message ? err.message : String(err);
    return record;
  }

  record.passes = result.passes.length;
  record.totalDiagnostics = result.diagnostics.length;

  // Tally diagnostics by kind.
  for (const d of result.diagnostics) {
    record.kindCounts[d.kind] = (record.kindCounts[d.kind] ?? 0) + 1;
  }

  // max_iterations_reached means the convergence loop ran out of passes with
  // fittable diagnostics still unresolved.
  record.maxIterations = result.diagnostics.some((d) => d.kind === "max_iterations_reached");

  // A scene "settled" if the last pass emitted no fittable diagnostics, i.e.
  // the loop broke early rather than hitting the max-iterations cap. The engine
  // only appends max_iterations_reached when it gives up, so its absence plus a
  // pass count below the cap means clean convergence.
  record.converged = !record.maxIterations;

  return record;
}

// ============================================================
// Severity score for ranking worst scenes. Hard structural
// failures weigh more than label-level residuals.
// ============================================================
const SEVERITY_WEIGHTS = {
  max_iterations_reached: 100,
  zone_overflow_negative_gap: 10,
  tab_stop_overflow: 10,
  item_escapes_zone_vertically: 10,
  zone_clamped_to_bounds: 5,
  label_collision_residual: 3,
  label_row_staggered: 1,
  unknown_object: 8,
  unknown_zone: 8,
  unknown_workspace: 8,
};

function severityScore(record) {
  if (record.error) return 1000;
  let score = 0;
  for (const [kind, count] of Object.entries(record.kindCounts)) {
    const weight = SEVERITY_WEIGHTS[kind] ?? 2;
    score += weight * count;
  }
  return score;
}

// ============================================================
// Markdown report assembly.
// ============================================================
function buildReport(records, allKinds) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const sortedKinds = [...allKinds].sort();

  const lines = [];
  lines.push("# Layout diagnostics baseline");
  lines.push("");
  lines.push(
    "Current-state record of which scenes emit which layout diagnostics when " +
      "`runPipeline` runs over every generated scene at a canonical 16:9 viewport " +
      "(1920x1080). This is a read-only evidence snapshot taken before any " +
      "layout-engine changes, so later improvements are measurable.",
  );
  lines.push("");
  lines.push(`- Generated: ${now}`);
  lines.push(`- Scenes scanned: ${records.length}`);
  lines.push(`- Viewport: 1920x1080 (16:9)`);
  lines.push("- Source: `tests/e2e_layout_diagnostics_baseline.mjs` over `generated/scenes.ts`");
  lines.push("");

  // ---- Summary of worst scenes ----
  const ranked = [...records].sort((a, b) => severityScore(b) - severityScore(a));
  const worst = ranked.filter((r) => severityScore(r) > 0);

  lines.push("## Worst scenes by diagnostics");
  lines.push("");
  if (worst.length === 0) {
    lines.push("No scene emitted any diagnostic. All scenes are clean.");
  } else {
    lines.push("| Rank | Scene | Score | Diagnostics |");
    lines.push("| --- | --- | --- | --- |");
    worst.forEach((r, i) => {
      const detail = r.error
        ? `ERROR: ${r.error}`
        : Object.entries(r.kindCounts)
            .sort()
            .map(([k, c]) => `${k}=${c}`)
            .join(", ");
      lines.push(`| ${i + 1} | \`${r.scene}\` | ${severityScore(r)} | ${detail} |`);
    });
  }
  lines.push("");
  lines.push(
    "Score weights hard structural failures (`max_iterations_reached`=100, " +
      "overflow/tab-stop/vertical-escape=10, clamp=5, identity=8) above label " +
      "residuals (`label_collision_residual`=3, `label_row_staggered`=1); any " +
      "other kind weighs 2.",
  );
  lines.push("");

  // ---- Per-scene table ----
  lines.push("## Per-scene diagnostics");
  lines.push("");
  const header = ["Scene", "Passes", "Converged", "Total", ...sortedKinds];
  lines.push("| " + header.join(" | ") + " |");
  lines.push("| " + header.map(() => "---").join(" | ") + " |");

  for (const r of [...records].sort((a, b) => a.scene.localeCompare(b.scene))) {
    if (r.error) {
      const cells = [`\`${r.scene}\``, "-", "ERROR", "-", ...sortedKinds.map(() => "-")];
      lines.push("| " + cells.join(" | ") + " |");
      continue;
    }
    const converged = r.maxIterations ? "NO" : "YES";
    const cells = [
      `\`${r.scene}\``,
      String(r.passes),
      converged,
      String(r.totalDiagnostics),
      ...sortedKinds.map((k) => {
        const v = r.kindCounts[k];
        return v ? String(v) : ".";
      }),
    ];
    lines.push("| " + cells.join(" | ") + " |");
  }
  lines.push("");

  // ---- Errors section ----
  const errored = records.filter((r) => r.error);
  lines.push("## Scenes that failed to run");
  lines.push("");
  if (errored.length === 0) {
    lines.push("None. Every scene ran to completion.");
  } else {
    lines.push("| Scene | Error |");
    lines.push("| --- | --- |");
    for (const r of errored) {
      lines.push(`| \`${r.scene}\` | ${r.error} |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

// ============================================================
// Main.
// ============================================================
function main() {
  const sceneNames = Object.keys(SCENES).sort();
  const records = [];
  const allKinds = new Set();

  for (const name of sceneNames) {
    const record = recordScene(name, SCENES[name]);
    records.push(record);
    for (const k of Object.keys(record.kindCounts)) allKinds.add(k);
  }

  // Console output: command coverage + per-scene counts.
  process.stdout.write(`Scanned ${records.length} scenes at 1920x1080.\n`);
  for (const r of records) {
    if (r.error) {
      process.stdout.write(`  ${r.scene}: ERROR ${r.error}\n`);
      continue;
    }
    const detail =
      Object.entries(r.kindCounts)
        .sort()
        .map(([k, c]) => `${k}=${c}`)
        .join(", ") || "clean";
    process.stdout.write(
      `  ${r.scene}: passes=${r.passes} converged=${
        r.maxIterations ? "NO" : "YES"
      } total=${r.totalDiagnostics} [${detail}]\n`,
    );
  }

  const report = buildReport(records, allKinds);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, "utf8");
  process.stdout.write(`\nReport written: ${REPORT_PATH}\n`);
}

main();
