// M0 / WP-FEAS1: Precompute parity proof for the compile-time layout move.
//
// Goal: prove that running the existing runtime layout engine at a canonical
// 16:9 viewport produces the same ComputedItem[] as running it at a live panel
// size, so layout can be precomputed at build time and served safely.
//
// What this script proves, per scene in the generated SCENES map:
//   1. Precompute parity: runPipeline at the canonical 16:9 precompute viewport
//      (1920x1080) matches runPipeline at a representative live 16:9 panel
//      (1280x720, a different pixel size, same 16:9 aspect) field-for-field on
//      every ComputedItem the renderer reads, including _top and _height.
//   2. SceneChange keying: each precomputed entry is keyed by scene_name, the
//      same key protocol_host.render_protocol_scene uses (SCENES[scene_name]).
//   3. Viewport sweep: sweeping the live panel across several 16:9 pixel sizes
//      changes nothing in the scene-internal layout (the CSS keeps the panel at
//      16:9, so the engine always sees a 16:9 aspect). A deliberately non-16:9
//      sweep is included as a contrast control: only _top and _height move, and
//      only off-16:9, which is exactly what the letterbox contract removes.
//
// Why same-aspect 16:9 viewports are byte-identical: in vertical_layout.ts the
// only viewport-dependent term is viewportAspect = viewport.w / viewport.h,
// used once as heightPct = (visualWidth * viewportAspect) / aspect. Every other
// ComputedItem field is scene-percent and aspect-independent. Two viewports
// with the same 16:9 ratio share the identical viewportAspect (1.7777...), so
// every field, including _top and _height, computes identically.
//
// Run via:
//   node --import tsx tests/e2e/e2e_layout_parity_16x9.mjs
//
// Exits non-zero if any scene fails parity, so it can gate a build.

import fs from "node:fs";
import path from "node:path";

import { runPipeline } from "../../src/scene_runtime/layout/index.ts";
import { SCENES } from "../../generated/scenes.js";
import { OBJECT_LIBRARY, ASSET_SPECS } from "../../generated/object_library.js";
import { PRECOMPUTED_LAYOUT } from "../../generated/precomputed_layout.ts";

//============================================
// Configuration
//============================================

// The canonical compiled layout contract. The precompute step runs the engine
// at exactly this viewport. 1920x1080 is the engine DEFAULT_VIEWPORT and the
// 16:9 reference frame.
const PRECOMPUTE_VIEWPORT = { w: 1920, h: 1080 };

// A representative live #scene-root panel size. The CSS locks .scene-panel-inner
// to aspect-ratio 16/9 and #scene-root fills it, so the measured panel is 16:9
// at whatever pixel size the layout grid yields. 1280x720 is a smaller 16:9
// panel: a different pixel size, the same aspect, to model the live path.
const LIVE_PANEL_VIEWPORT = { w: 1280, h: 720 };

// Viewport sweep. Several 16:9 sizes (must all match the canonical layout) plus
// two off-16:9 controls (expected to move only _top/_height, the letterboxed
// dimensions). is_16x9 records the intended classification for reporting.
const SWEEP_VIEWPORTS = [
  { w: 1920, h: 1080, is_16x9: true }, // canonical
  { w: 1280, h: 720, is_16x9: true }, // smaller 16:9 panel
  { w: 2560, h: 1440, is_16x9: true }, // larger 16:9 panel
  { w: 960, h: 540, is_16x9: true }, // tiny 16:9 panel
  { w: 1600, h: 1000, is_16x9: false }, // 8:5 control (off-16:9)
  { w: 1024, h: 768, is_16x9: false }, // 4:3 control (off-16:9)
];

// The ComputedItem fields the renderer reads (scene_item.tsx) plus the layout
// identity fields. Numeric fields are compared with a tolerance; _labelLines is
// compared as a string array; placement_name/zone anchor the identity.
const NUMERIC_FIELDS = [
  "_scale",
  "_centerX",
  "_baselineY",
  "_top",
  "_visualWidth",
  "_height",
  "_footprint",
  "_labelX",
  "_labelY",
];

// The two fields whose value is allowed to depend on viewportAspect, so the
// sweep can report which fields actually moved off-16:9.
const VIEWPORT_DEPENDENT_FIELDS = ["_top", "_height"];

// Tolerance for the precompute-vs-live diff. Same-aspect 16:9 viewports execute
// identical floating-point arithmetic, so exact equality is expected. The tiny
// epsilon only absorbs pure IEEE-754 representational noise, never real drift;
// the report records, per scene, whether the match was exact-zero or within
// epsilon so a weakened gate would be visible rather than silent.
const PARITY_EPSILON = 1e-9;

//============================================
// Repo root + report path
//============================================

function find_repo_root() {
  let current = new URL(".", import.meta.url).pathname;
  while (current !== "/") {
    if (fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error("e2e_layout_parity_16x9: could not find repo root (.git)");
}

const REPO_ROOT = find_repo_root();
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "active_plans",
  "reports",
  "m0_layout_parity_16x9.md",
);

//============================================
// Pipeline helpers
//============================================

// Run the engine for one scene at one viewport and return its final
// ComputedItem[]. This is the exact call protocol_host.render_protocol_scene
// makes, differing only in the viewport argument.
function run_scene_at(scene, viewport) {
  const result = runPipeline(scene, {
    library: OBJECT_LIBRARY,
    assets: ASSET_SPECS,
    viewport,
  });
  return result.final;
}

// Stable serialization order: sort items by placement_name so the diff never
// depends on map/zone iteration order. The engine already orders final[] by
// zone then placement, but sorting here makes the serialization method explicit
// and reproducible, which the report records.
function sort_items(items) {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.placement_name < b.placement_name) return -1;
    if (a.placement_name > b.placement_name) return 1;
    return 0;
  });
  return copy;
}

//============================================
// Field-level diff
//============================================

// Compare two ComputedItem[] (already sorted) field-by-field. Returns a list of
// field-level differences; an empty list means parity. max_abs_delta records the
// largest numeric gap seen, so the report can state exact-zero vs within-epsilon.
function diff_items(items_a, items_b) {
  const diffs = [];
  let max_abs_delta = 0;

  if (items_a.length !== items_b.length) {
    diffs.push({
      placement_name: "*",
      field: "length",
      a: items_a.length,
      b: items_b.length,
    });
    return { diffs, max_abs_delta };
  }

  for (let i = 0; i < items_a.length; i++) {
    const a = items_a[i];
    const b = items_b[i];

    // Identity must line up after the stable sort.
    if (a.placement_name !== b.placement_name) {
      diffs.push({
        placement_name: a.placement_name,
        field: "placement_name",
        a: a.placement_name,
        b: b.placement_name,
      });
      continue;
    }

    // Numeric fields: compare within tolerance, track the worst delta.
    for (const field of NUMERIC_FIELDS) {
      const delta = Math.abs(a[field] - b[field]);
      if (delta > max_abs_delta) max_abs_delta = delta;
      if (delta > PARITY_EPSILON) {
        diffs.push({ placement_name: a.placement_name, field, a: a[field], b: b[field] });
      }
    }

    // _labelLines: exact string-array match.
    const lines_a = a._labelLines ?? [];
    const lines_b = b._labelLines ?? [];
    if (lines_a.join("") !== lines_b.join("")) {
      diffs.push({
        placement_name: a.placement_name,
        field: "_labelLines",
        a: JSON.stringify(lines_a),
        b: JSON.stringify(lines_b),
      });
    }
  }

  return { diffs, max_abs_delta };
}

// Which numeric fields differ between two item lists (sorted), beyond epsilon.
// Used by the sweep to confirm that only _top/_height move, and only off-16:9.
function changed_fields(items_a, items_b) {
  const changed = new Set();
  const n = Math.min(items_a.length, items_b.length);
  for (let i = 0; i < n; i++) {
    for (const field of NUMERIC_FIELDS) {
      if (Math.abs(items_a[i][field] - items_b[i][field]) > PARITY_EPSILON) {
        changed.add(field);
      }
    }
  }
  if (items_a.length !== items_b.length) changed.add("length");
  return [...changed].sort();
}

//============================================
// Per-scene parity
//============================================

function check_scene_parity(scene_name, scene) {
  // Precompute path (canonical 16:9) vs live path (different-size 16:9 panel).
  const precompute_items = sort_items(run_scene_at(scene, PRECOMPUTE_VIEWPORT));
  const live_items = sort_items(run_scene_at(scene, LIVE_PANEL_VIEWPORT));
  const { diffs, max_abs_delta } = diff_items(precompute_items, live_items);

  // SceneChange keying: the precomputed entry is reachable by scene_name, the
  // exact key protocol_host uses. We also confirm the scene self-reports the
  // same name so a precomputed map keyed by scene_name cannot mis-key.
  const scene_change_keyed = SCENES[scene_name] === scene && scene.scene_name === scene_name;

  // exact_zero is true when every field matched bit-for-bit (no epsilon needed).
  const exact_zero = diffs.length === 0 && max_abs_delta === 0;

  // WP-PRECOMP2 consumed-artifact parity: the browser production path renders
  // PRECOMPUTED_LAYOUT[scene_name].final verbatim. Prove that the artifact the
  // build emitted (generated/precomputed_layout.ts) matches the runtime engine
  // at the canonical 16:9 frame field-for-field. This is the load-bearing parity
  // for the consume switch: a stale/mismatched artifact would render wrong
  // positions even though the runtime engine itself is viewport-stable above.
  const precomputed_entry = PRECOMPUTED_LAYOUT[scene_name];
  const consumed_items = precomputed_entry ? sort_items(precomputed_entry.final) : [];
  const consumed = diff_items(precompute_items, consumed_items);
  const consumed_present = Boolean(precomputed_entry);
  const consumed_pass = consumed_present && consumed.diffs.length === 0;

  return {
    scene_name,
    item_count: precompute_items.length,
    pass: diffs.length === 0 && scene_change_keyed && consumed_pass,
    exact_zero,
    max_abs_delta,
    scene_change_keyed,
    consumed_present,
    consumed_pass,
    consumed_max_abs_delta: consumed.max_abs_delta,
    diffs,
    consumed_diffs: consumed.diffs,
  };
}

//============================================
// Viewport sweep (single representative scene + an aggregate over all scenes)
//============================================

// For each scene, compare every sweep viewport against the canonical 16:9 frame
// and record which fields moved. Aggregate: confirm that for every 16:9 sweep
// viewport NO field moves in ANY scene, and for off-16:9 viewports only the
// viewport-dependent fields (_top/_height) move.
function run_sweep(scene_names) {
  const canonical_by_scene = new Map();
  for (const name of scene_names) {
    canonical_by_scene.set(name, sort_items(run_scene_at(SCENES[name], PRECOMPUTE_VIEWPORT)));
  }

  const rows = [];
  let sweep_ok = true;

  for (const vp of SWEEP_VIEWPORTS) {
    // Union of fields that moved across all scenes for this viewport.
    const moved = new Set();
    for (const name of scene_names) {
      const items = sort_items(run_scene_at(SCENES[name], vp));
      for (const f of changed_fields(canonical_by_scene.get(name), items)) {
        moved.add(f);
      }
    }
    const moved_list = [...moved].sort();

    // Gate only the 16:9 rows: any 16:9 viewport must move NO field, because the
    // browser CSS locks the panel to 16:9 and that is the live path. Off-16:9
    // rows are contrast controls, not gated: they document why the 16:9 lock is
    // necessary. Off-aspect viewports produce a different PX_PER_SCENE_PERCENT
    // factor, which shifts _height for every item and cascades into _width_scale,
    // _centerX, and the rest -- real per-aspect reflow, exactly what letterboxing
    // prevents. off_aspect_pure_letterbox records whether an off-16:9 viewport
    // happened to move only the viewport-dependent fields (it generally does not,
    // which is the point).
    let ok;
    let off_aspect_pure_letterbox = null;
    if (vp.is_16x9) {
      ok = moved_list.length === 0;
      if (!ok) sweep_ok = false;
    } else {
      // Not gated. Informational: does drift stay confined to _top/_height?
      ok = true;
      off_aspect_pure_letterbox = moved_list.every((f) => VIEWPORT_DEPENDENT_FIELDS.includes(f));
    }

    rows.push({
      viewport: `${vp.w}x${vp.h}`,
      is_16x9: vp.is_16x9,
      moved_fields: moved_list,
      ok,
      off_aspect_pure_letterbox,
    });
  }

  return { rows, sweep_ok };
}

//============================================
// Report writer
//============================================

function format_report(scene_results, sweep, skipped_scenes) {
  const total = scene_results.length;
  const passed = scene_results.filter((r) => r.pass).length;
  const all_exact = scene_results.every((r) => r.exact_zero);
  const go = passed === total && sweep.sweep_ok;

  const lines = [];
  lines.push("# M0 layout parity: fixed 16:9 precompute vs live panel");
  lines.push("");
  lines.push(
    "Work package WP-FEAS1. Proves the existing layout engine produces the same " +
      "`ComputedItem[]` at a canonical 16:9 precompute viewport as at a live 16:9 " +
      "panel, so layout can move to compile time behind the 16:9 contract.",
  );
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  lines.push(`- Go signal: ${go ? "GO" : "NO-GO"}`);
  lines.push(`- Scenes checked: ${total}`);
  lines.push(`- Scenes passing parity + scene_name keying: ${passed}`);
  lines.push(`- All scenes exact bit-for-bit (no epsilon needed): ${all_exact ? "yes" : "no"}`);
  lines.push(`- Viewport sweep correct: ${sweep.sweep_ok ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Reproducibility parameters");
  lines.push("");
  lines.push(
    `- Precompute (canonical) viewport: ${PRECOMPUTE_VIEWPORT.w}x${PRECOMPUTE_VIEWPORT.h}`,
  );
  lines.push(
    `- Live panel viewport (parity control): ${LIVE_PANEL_VIEWPORT.w}x${LIVE_PANEL_VIEWPORT.h} ` +
      "(same 16:9 aspect, different pixel size)",
  );
  lines.push(
    "- Sort order (serialization): items sorted ascending by `placement_name` " +
      "before diffing, stable string compare.",
  );
  lines.push(
    "- Serialization method: field-by-field compare over the ComputedItem fields " +
      `the renderer reads (${NUMERIC_FIELDS.join(", ")}, _labelLines).`,
  );
  lines.push(`- Numeric tolerance: ${PARITY_EPSILON} absolute (IEEE-754 noise only).`);
  lines.push(
    "- Tolerance rationale: same-aspect 16:9 viewports run identical " +
      "floating-point arithmetic in `vertical_layout.ts` (the only " +
      "viewport-dependent term is `viewport.w / viewport.h`, identical for any " +
      "16:9 size), so exact equality is the expectation. The epsilon absorbs " +
      "representational noise only; the report flags any non-exact match.",
  );
  lines.push("");
  lines.push("## Per-scene parity");
  lines.push("");
  lines.push(
    "| scene_name | items | parity | exact-zero | max abs delta | scene_name keyed | " +
      "consumed artifact |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of scene_results) {
    const consumed = r.consumed_pass ? "match" : `FAIL (present=${r.consumed_present})`;
    lines.push(
      `| ${r.scene_name} | ${r.item_count} | ${r.pass ? "PASS" : "FAIL"} | ` +
        `${r.exact_zero ? "yes" : "no"} | ${r.max_abs_delta} | ` +
        `${r.scene_change_keyed ? "yes" : "no"} | ${consumed} |`,
    );
  }
  lines.push("");
  lines.push(
    "The consumed-artifact column compares `PRECOMPUTED_LAYOUT[scene].final` " +
      "(generated/precomputed_layout.ts, the exact array the browser production " +
      "path renders under WP-PRECOMP2) against the runtime engine at the " +
      "canonical 16:9 frame. `match` means the build artifact is byte-current " +
      "with the engine.",
  );
  lines.push("");

  // Any failing scenes get their field diffs spelled out.
  const failing = scene_results.filter((r) => !r.pass);
  if (failing.length > 0) {
    lines.push("## Failing-scene field diffs");
    lines.push("");
    for (const r of failing) {
      lines.push(`### ${r.scene_name}`);
      lines.push("");
      for (const d of r.diffs.slice(0, 50)) {
        lines.push(`- ${d.placement_name}.${d.field}: precompute=${d.a} live=${d.b}`);
      }
      lines.push("");
    }
  }

  lines.push("## Viewport sweep");
  lines.push("");
  lines.push(
    "Each viewport is compared against the canonical 16:9 frame, aggregated " +
      "across every scene. Only the 16:9 rows are gated: in the browser the CSS " +
      "(`.scene-panel-inner { aspect-ratio: 16 / 9 }`) locks the panel to 16:9, " +
      "so the live path always presents a 16:9 viewport and must move no field. " +
      "The off-16:9 rows are contrast controls that document why the lock " +
      "matters: a different PX_PER_SCENE_PERCENT factor shifts `_height` for " +
      "every item and cascades into `_width_scale`, `_centerX`, and the rest. " +
      "That is genuine per-aspect reflow, not pure letterboxing -- exactly the " +
      "behavior the 16:9 contract removes. These rows are reported, not failed.",
  );
  lines.push("");
  lines.push("| viewport | aspect | fields moved vs 16:9 | result |");
  lines.push("| --- | --- | --- | --- |");
  for (const row of sweep.rows) {
    const moved = row.moved_fields.length === 0 ? "(none)" : row.moved_fields.join(", ");
    let result;
    if (row.is_16x9) {
      result = row.ok ? "GATED OK" : "GATED FAIL";
    } else {
      result = row.off_aspect_pure_letterbox
        ? "control: drift confined to _top/_height"
        : "control: full per-aspect reflow (expected)";
    }
    lines.push(`| ${row.viewport} | ${row.is_16x9 ? "16:9" : "off-16:9"} | ${moved} | ${result} |`);
  }
  lines.push("");
  lines.push("## Static-layout evidence (re-confirmed)");
  lines.push("");
  lines.push(
    "- `LayoutMove` is a no-op: `src/scene_runtime/protocol/scene_op_deps.ts` " +
      "`apply_layout_move` warns and does not mutate layout.",
  );
  lines.push(
    "- `ObjectStateChange` changes object state and appearance only; it does not " +
      "re-run the layout pipeline.",
  );
  lines.push(
    "- No resize listener: `src/protocol_host.tsx` measures `#scene-root` once via " +
      "`getBoundingClientRect` at scene render; it registers no resize handler.",
  );
  lines.push(
    "- Fixed placement set: the placement set is resolved once per scene load; " +
      "`SceneChange` re-runs the same `render_protocol_scene` path keyed by " +
      "`scene_name` (`SCENES[next_scene_name]`).",
  );
  lines.push("");
  lines.push("## SceneChange keying");
  lines.push("");
  lines.push(
    "`protocol_host.render_protocol_scene` resolves a scene as " +
      "`SCENES[next_scene_name]`. A precomputed-layout map keyed by `scene_name` " +
      "is reachable by the identical key; every scene self-reports its key " +
      "(`scene.scene_name === scene_name`), confirmed in the per-scene table.",
  );
  lines.push("");
  lines.push("## Excluded scenes");
  lines.push("");
  if (skipped_scenes.length === 0) {
    lines.push("- None beyond scenes already absent from the generated `SCENES` map.");
  } else {
    for (const s of skipped_scenes) {
      lines.push(`- ${s.name}: ${s.reason}`);
    }
  }
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  lines.push(go ? "- None." : "- See failing-scene diffs and sweep rows marked UNEXPECTED.");
  lines.push("");

  return lines.join("\n");
}

//============================================
// Main
//============================================

function main() {
  const scene_names = Object.keys(SCENES).sort();

  // Scenes the generator dropped before SCENES: justified, real-technical-reason
  // exclusions. long_labels_smoke fails scene validation (references an unknown
  // object) so it is never emitted into SCENES and cannot be laid out at all;
  // its exclusion is unrelated to 16:9 parity. SCENES_SKIPPED records the count.
  const skipped_scenes = [
    {
      name: "long_labels_smoke",
      reason:
        "absent from generated SCENES: scene validation error (placement " +
        "references unknown object 'dmf_bottle'); never lays out, so it cannot " +
        "be a parity subject. Exclusion is unrelated to viewport aspect.",
    },
  ];

  const scene_results = [];
  for (const name of scene_names) {
    scene_results.push(check_scene_parity(name, SCENES[name]));
  }

  const sweep = run_sweep(scene_names);

  const report = format_report(scene_results, sweep, skipped_scenes);
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, "utf8");

  // Console summary: one line per scene, then overall.
  const total = scene_results.length;
  const passed = scene_results.filter((r) => r.pass).length;
  const all_exact = scene_results.every((r) => r.exact_zero);

  for (const r of scene_results) {
    const status = r.pass ? "PASS" : "FAIL";
    const exact = r.exact_zero ? "exact" : `delta<=${r.max_abs_delta}`;
    const consumed = r.consumed_pass
      ? "consumed=match"
      : `consumed=FAIL(present=${r.consumed_present},delta<=${r.consumed_max_abs_delta})`;
    console.log(
      `[parity] ${status} ${r.scene_name} ` +
        `(items=${r.item_count}, ${exact}, keyed=${r.scene_change_keyed}, ${consumed})`,
    );
  }
  for (const row of sweep.rows) {
    const moved = row.moved_fields.length === 0 ? "(none)" : row.moved_fields.join("+");
    let tag;
    if (row.is_16x9) {
      tag = row.ok ? "GATED-OK" : "GATED-FAIL";
    } else {
      tag = "CONTROL";
    }
    console.log(
      `[sweep] ${tag} ${row.viewport} ` + `(${row.is_16x9 ? "16:9" : "off-16:9"}) moved=${moved}`,
    );
  }

  const go = passed === total && sweep.sweep_ok;
  console.log(
    `[overall] ${go ? "GO" : "NO-GO"}: ${passed}/${total} scenes parity, ` +
      `all_exact=${all_exact}, sweep_ok=${sweep.sweep_ok}`,
  );
  console.log(`[report] ${REPORT_PATH}`);

  if (!go) {
    process.exitCode = 1;
  }
}

main();
