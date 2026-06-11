// SIDE-QUEST evidence tool (throwaway, read-only with respect to the engine).
// Runs runPipeline over every generated scene at a canonical 16:9 viewport and
// records per-scene layout diagnostics, pass count, and convergence state.
// Emits a Markdown baseline report under docs/active_plans/reports/.
//
// Run with:
//   node --import tsx tests/e2e/e2e_layout_diagnostics_baseline.mjs
//
// This is a current-state baseline only. It does not edit src/, generated/, or
// tools/, and it runs no git commands.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPipeline } from "../../src/scene_runtime/layout/index.ts";
import { SCENES } from "../../generated/scenes.ts";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../../generated/object_library.ts";

// Canonical 16:9 viewport. DEFAULT_VIEWPORT in the engine is already 1920x1080,
// but we pass it explicitly so the baseline is unambiguous and self-documenting.
const VIEWPORT = { w: 1920, h: 1080 };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
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
    // severityDiagnostics is a SEPARATE stream from the closed-kind `diagnostics`
    // stream above. runPipeline keeps the de-overlap Errors/Warnings/Reviews
    // (unresolved_label_overlap, poor_label_alignment, possible_overload,
    // unresolved_overlap) here, keyed by `code` not `kind`. The overlap gate is
    // expressed in terms of unresolved_label_overlap, so this column is what the
    // gate actually reads.
    severityCounts: {},
    // Machine-verifiable overlap pairs from the two overlap Errors' actionable
    // payloads: the involved placement_names, the zone, and the remaining depth.
    // Listing the pair (not just a per-scene count) lets a reviewer check a
    // cross-zone claim against the named items directly.
    overlapPairs: [],
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

  // Tally the severity-graded de-overlap diagnostics by code, and pull out the
  // overlap pairs from the two overlap Errors so the report can list which label
  // sits over which artwork/label.
  const severityDiagnostics = result.severityDiagnostics ?? [];
  for (const d of severityDiagnostics) {
    record.severityCounts[d.code] = (record.severityCounts[d.code] ?? 0) + 1;
    const isOverlapError = d.code === "unresolved_label_overlap" || d.code === "unresolved_overlap";
    if (isOverlapError && d.payload) {
      record.overlapPairs.push({
        code: d.code,
        zone: d.payload.zone,
        items: [...d.payload.involvedItems],
        depth: d.payload.remainingOverlapDepth,
      });
    }
  }

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
  lines.push(
    "- Source: `tests/e2e/e2e_layout_diagnostics_baseline.mjs` over `generated/scenes.ts`",
  );
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

  // ---- Severity-graded de-overlap diagnostics ----
  // These come from result.severityDiagnostics, a stream the closed-kind tables
  // above never touch. The overlap gate (unresolved_label_overlap count) reads
  // this section, so it is the gate-relevant view.
  const allSeverityCodes = new Set();
  for (const r of records) {
    for (const code of Object.keys(r.severityCounts)) allSeverityCodes.add(code);
  }
  const sortedCodes = [...allSeverityCodes].sort();

  lines.push("## Severity-graded de-overlap diagnostics");
  lines.push("");
  lines.push(
    "Counts from `result.severityDiagnostics` (keyed by `code`), the de-overlap " +
      "Error/Warning/Review stream. `unresolved_label_overlap` is the overlap-gate " +
      "metric. `unresolved_overlap` is a bounds Error (object too big for its zone), " +
      "not a label issue. A `.` means the code did not fire for that scene.",
  );
  lines.push("");
  if (sortedCodes.length === 0) {
    lines.push("No scene emitted any severity-graded de-overlap diagnostic.");
  } else {
    const sevHeader = ["Scene", ...sortedCodes];
    lines.push("| " + sevHeader.join(" | ") + " |");
    lines.push("| " + sevHeader.map(() => "---").join(" | ") + " |");
    for (const r of [...records].sort((a, b) => a.scene.localeCompare(b.scene))) {
      if (r.error) {
        const cells = [`\`${r.scene}\``, ...sortedCodes.map(() => "-")];
        lines.push("| " + cells.join(" | ") + " |");
        continue;
      }
      const cells = [
        `\`${r.scene}\``,
        ...sortedCodes.map((code) => {
          const v = r.severityCounts[code];
          return v ? String(v) : ".";
        }),
      ];
      lines.push("| " + cells.join(" | ") + " |");
    }
  }
  lines.push("");

  // ---- Overlap pairs (machine-verifiable) ----
  // Lists the involved placement_names for every overlap Error, so a cross-zone
  // claim ("this label sits over that artwork in another zone") can be checked
  // against the named items and zone directly instead of inferred from a count.
  lines.push("## Overlap pairs");
  lines.push("");
  lines.push(
    "Each row is one overlap Error from `result.severityDiagnostics`, naming the " +
      "two involved placements, the zone, the diagnostic code, and the remaining " +
      "penetration depth (scene-percent). `unresolved_label_overlap` is a label " +
      "sitting over another label or artwork; `unresolved_overlap` is an object " +
      "escaping its zone bounds. Same-zone pairs are in-zone collisions; differing " +
      "zone membership for the two names indicates a cross-zone graze.",
  );
  lines.push("");
  const pairRows = [];
  for (const r of [...records].sort((a, b) => a.scene.localeCompare(b.scene))) {
    for (const p of r.overlapPairs) {
      pairRows.push({ scene: r.scene, ...p });
    }
  }
  if (pairRows.length === 0) {
    lines.push("None. No overlap Error fired in any scene.");
  } else {
    lines.push("| Scene | Code | Zone | Item A | Item B | Depth |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const p of pairRows) {
      const itemA = p.items[0] ?? "-";
      const itemB = p.items[1] ?? "-";
      lines.push(
        `| \`${p.scene}\` | ${p.code} | \`${p.zone}\` | \`${itemA}\` | ` +
          `\`${itemB}\` | ${p.depth} |`,
      );
    }
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
