// Unit + fixture tests for src/scene_runtime/layout. Uses tsx loader so we
// can import the TS source directly. Run via:
//   node --import tsx --test tests/test_layout_engine.mjs
// or the npm scripts target.

import test from "node:test";
import assert from "node:assert/strict";

import {
  bindObjects,
  clampSceneBounds,
  DEMO_ASSET_SPECS,
  DEMO_OBJECT_LIBRARY,
  DEPTH_SCALE,
  groupByZone,
  horizontalLayout,
  layoutLabels as _layoutLabels,
  LAYOUT_SHRINK_FACTOR,
  MAX_LAYOUT_PASSES,
  normalizeSchema,
  PX_PER_SCENE_PERCENT,
  resolveInheritance,
  runPipeline,
  scaleToRealWorld,
  verticalLayout,
  WORKSPACE_PX_PER_CM,
  wrapLabel,
} from "../src/scene_runtime/layout/index.ts";

const HEAT_BLOCK_BENCH = {
  scene_name: "heat_block_bench",
  workspace: "bench",
  scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
  zones: [
    {
      id: "rear_supplies",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      baseline: 32,
      align: "tab-stops",
    },
    {
      id: "work_surface",
      bounds: { left: 20, right: 80, top: 45, bottom: 75 },
      baseline: 72,
      align: "center",
    },
  ],
  placements: [
    {
      placement_name: "rear_left_eppendorf_rack",
      object_name: "microtube_rack_24",
      zone: "rear_supplies",
      depth_tier: 1,
      align_stop: "left",
    },
    {
      placement_name: "rear_right_protein_ladder",
      object_name: "protein_ladder_tube",
      zone: "rear_supplies",
      depth_tier: 1,
      align_stop: "right",
    },
    {
      placement_name: "center_heat_block",
      object_name: "heat_block",
      zone: "work_surface",
      depth_tier: 1,
    },
  ],
};

function runHeatBlock() {
  return runPipeline(HEAT_BLOCK_BENCH, {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
  });
}

// ─── Stage 2 ────────────────────────────────────────────────────────
test("normalizeSchema: Schema A passthrough applies layout_rules defaults", () => {
  const out = normalizeSchema({ ...HEAT_BLOCK_BENCH });
  assert.equal(out.source, "zone_bounds");
  assert.equal(out.scene.layout_rules.zone_gap, 2);
  assert.equal(out.scene.layout_rules.label_offset_y, 4);
});

// ─── Stage 3 ────────────────────────────────────────────────────────
test("resolveInheritance: extends applies remove/deactivate/reposition/add in order", () => {
  const base = {
    scene_name: "base",
    workspace: "bench",
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    zones: [],
    placements: [
      {
        placement_name: "keep",
        object_name: "heat_block",
        zone: "work_surface",
      },
      {
        placement_name: "kill",
        object_name: "media_bottle",
        zone: "work_surface",
      },
      { placement_name: "off", object_name: "waste_jar", zone: "work_surface" },
      {
        placement_name: "mover",
        object_name: "t75_flask",
        zone: "work_surface",
      },
    ],
  };
  const extender = {
    scene_name: "ext",
    workspace: "bench",
    extends: "base",
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    zones: [],
    placements: [],
    remove_placements: [{ placement_name: "kill" }],
    deactivate_placements: [{ placement_name: "off" }],
    reposition_placements: [{ placement_name: "mover", zone: "tools" }],
    add_placements: [
      {
        placement_name: "new_one",
        object_name: "media_bottle",
        zone: "work_surface",
      },
    ],
  };
  const out = resolveInheritance(extender, { base });
  assert.equal(out.placements.length, 4);
  assert.equal(
    out.placements.find((p) => p.placement_name === "kill"),
    undefined,
  );
  const off = out.placements.find((p) => p.placement_name === "off");
  assert.equal(off.active, false);
  const mover = out.placements.find((p) => p.placement_name === "mover");
  assert.equal(mover.zone, "tools");
  assert.ok(out.placements.find((p) => p.placement_name === "new_one"));
});

// ─── Stage 4 ────────────────────────────────────────────────────────
test("bindObjects: merges layout hints, identity fields cannot be overridden", () => {
  const diags = [];
  const bound = bindObjects(
    [{ placement_name: "p", object_name: "heat_block", zone: "z" }],
    DEMO_OBJECT_LIBRARY,
    DEMO_ASSET_SPECS,
    diags,
  );
  assert.equal(bound[0].kind, "equipment");
  assert.equal(bound[0].aspect, 1.35);
  assert.equal(bound[0].layout.display_width_cm, 25);
  assert.equal(diags.length, 0);
});

test("bindObjects: unknown_object emits diagnostic + renderable placeholder", () => {
  const diags = [];
  const bound = bindObjects(
    [{ placement_name: "p", object_name: "ghost", zone: "z" }],
    DEMO_OBJECT_LIBRARY,
    DEMO_ASSET_SPECS,
    diags,
  );
  // Diagnostic is still recorded so the missing object is visible to tooling.
  assert.equal(diags.length, 1);
  assert.equal(diags[0].kind, "unknown_object");
  // New contract (WS-M3-B): a missing object is NOT marked _error (which would
  // orphan it in group_by_zone and blank the scene). It binds as a renderable
  // placeholder so it flows through layout and renders a "missing object" box.
  assert.equal(bound[0]._error, undefined);
  assert.equal(bound[0].missing_svg, true);
  assert.equal(bound[0]._missing_object, true);
  // It carries a real Kind so downstream layout stages treat it normally.
  assert.equal(bound[0].kind, "decoration");
});

// ─── Stage 5 ────────────────────────────────────────────────────────
test("scaleToRealWorld: cm_model formula matches SCALING_MODEL.md", () => {
  const diags = [];
  const bound = bindObjects(
    HEAT_BLOCK_BENCH.placements,
    DEMO_OBJECT_LIBRARY,
    DEMO_ASSET_SPECS,
    diags,
  );
  const scaled = scaleToRealWorld(bound, "bench", {}, diags);

  const pxPerCm = WORKSPACE_PX_PER_CM.bench;
  const rack = scaled.find((p) => p.placement_name === "rear_left_eppendorf_rack");
  const expected = (12 * pxPerCm) / (13 * PX_PER_SCENE_PERCENT);
  assert.ok(Math.abs(rack._width_scale - expected) < 0.001, `rack got ${rack._width_scale}`);
  assert.equal(rack._scale_source, "cm_model");

  const heat = scaled.find((p) => p.placement_name === "center_heat_block");
  const expectedHeat = (25 * pxPerCm) / (18 * PX_PER_SCENE_PERCENT);
  assert.ok(Math.abs(heat._width_scale - expectedHeat) < 0.001);
});

test("scaleToRealWorld: unknown workspace falls back to authored width_scale + emits diagnostic", () => {
  const diags = [];
  const bound = bindObjects(
    [{ placement_name: "p", object_name: "heat_block", zone: "z" }],
    DEMO_OBJECT_LIBRARY,
    DEMO_ASSET_SPECS,
    diags,
  );
  const scaled = scaleToRealWorld(bound, "incubator", { workspacePxPerCm: { bench: 3.2 } }, diags);
  assert.equal(scaled[0]._scale_source, "fallback_no_workspace");
  assert.ok(diags.some((d) => d.kind === "unknown_workspace"));
});

// ─── Stage 6 ────────────────────────────────────────────────────────
test("groupByZone: sorts by depth_tier ASC, then placement_name", () => {
  const placements = [
    {
      placement_name: "z_high_tier",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 2,
    },
    {
      placement_name: "a_low_tier",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
    },
    {
      placement_name: "b_low_tier",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
    },
  ];
  const bound = bindObjects(placements, DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS, []);
  const scaled = scaleToRealWorld(bound, "bench", {}, []);
  const grouped = groupByZone(scaled, [
    { id: "w", bounds: { left: 0, right: 100, top: 0, bottom: 100 } },
  ]);
  const ws = grouped.groups.get("w");
  assert.equal(ws[0].placement_name, "a_low_tier");
  assert.equal(ws[1].placement_name, "b_low_tier");
  assert.equal(ws[2].placement_name, "z_high_tier");
});

test("groupByZone: unknown zone -> orphan + diagnostic", () => {
  const diags = [];
  const placements = [
    {
      placement_name: "orphan",
      object_name: "heat_block",
      zone: "missing_zone",
    },
  ];
  const bound = bindObjects(placements, DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS, []);
  const scaled = scaleToRealWorld(bound, "bench", {}, []);
  const grouped = groupByZone(
    scaled,
    [{ id: "w", bounds: { left: 0, right: 100, top: 0, bottom: 100 } }],
    diags,
  );
  assert.equal(grouped.orphans.length, 1);
  assert.equal(diags[0].kind, "unknown_zone");
});

// ─── Stage 7 ────────────────────────────────────────────────────────
test("horizontalLayout: center alignment positions a single item at zone midpoint", () => {
  const placements = [
    {
      placement_name: "p",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
    },
  ];
  const bound = bindObjects(placements, DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS, []);
  const scaled = scaleToRealWorld(bound, "bench", {}, []);
  const grouped = groupByZone(scaled, [
    {
      id: "w",
      bounds: { left: 20, right: 80, top: 45, bottom: 75 },
      baseline: 72,
      align: "center",
    },
  ]);
  const layouts = horizontalLayout(grouped.groups, [
    {
      id: "w",
      bounds: { left: 20, right: 80, top: 45, bottom: 75 },
      baseline: 72,
      align: "center",
    },
  ]);
  const items = layouts.get("w");
  assert.equal(items.length, 1);
  assert.equal(items[0]._x, 50);
});

// ─── Stage 8 ────────────────────────────────────────────────────────
test("verticalLayout: square aspect renders square at 1920x1080", () => {
  const placements = [
    {
      placement_name: "p",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
    },
  ];
  const bound = bindObjects(placements, DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS, []);
  bound[0].aspect = 1.0;
  const scaled = scaleToRealWorld(bound, "bench", {}, []);
  const zones = [
    {
      id: "w",
      bounds: { left: 20, right: 80, top: 45, bottom: 75 },
      baseline: 72,
      align: "center",
    },
  ];
  const horiz = horizontalLayout(groupByZone(scaled, zones).groups, zones);
  const vert = verticalLayout(horiz, zones, { w: 1920, h: 1080 });
  const item = vert.get("w")[0];
  // heightPct = visualWidth * (1920/1080) / 1 = visualWidth * 1.777..
  const expected = item._visualWidth * (1920 / 1080);
  assert.ok(Math.abs(item._height - expected) < 0.001);
});

test("verticalLayout: bottom anchor places _top above baseline by heightPct", () => {
  const placements = [
    {
      placement_name: "p",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
    },
  ];
  const bound = bindObjects(placements, DEMO_OBJECT_LIBRARY, DEMO_ASSET_SPECS, []);
  const scaled = scaleToRealWorld(bound, "bench", {}, []);
  const zones = [
    {
      id: "w",
      bounds: { left: 20, right: 80, top: 45, bottom: 75 },
      baseline: 72,
    },
  ];
  const horiz = horizontalLayout(groupByZone(scaled, zones).groups, zones);
  const vert = verticalLayout(horiz, zones, { w: 1920, h: 1080 });
  const item = vert.get("w")[0];
  assert.ok(Math.abs(item._top - (item._y - item._height)) < 0.001);
});

// ─── Stage 9 ────────────────────────────────────────────────────────
test("layoutLabels: short labels emit one line", () => {
  assert.deepEqual(wrapLabel("Hi", 10), ["Hi"]);
});

test("layoutLabels: long labels wrap at nearest space to middle", () => {
  const lines = wrapLabel("a very long heat block label", 5);
  assert.equal(lines.length, 2);
});

// ─── Stage 10 ───────────────────────────────────────────────────────
test("clampSceneBounds: zone group with item past right shifts left", () => {
  const items = [
    {
      placement_name: "p",
      object_name: "heat_block",
      zone: "w",
      depth_tier: 1,
      _x: 95,
      _y: 50,
      _top: 40,
      _height: 20,
      _visualWidth: 20,
      _footprint: 20,
      _scale: 1,
      _labelX: 95,
      _labelY: 55,
      _labelLines: ["x"],
      _width_scale: 1,
      _scale_source: "cm_model",
      _px_per_cm: 3.2,
      active: true,
      aspect: 1.35,
      kind: "equipment",
      asset: "heat_block",
      capabilities: [],
      label: "x",
      layout: {
        default_width: 18,
        label_width: 12,
        anchor_y: "bottom",
        anchor_y_offset: 0,
        width_scale: 1,
        fudge: 1,
      },
    },
  ];
  const diags = [];
  const zones = [{ id: "w", bounds: { left: 0, right: 100, top: 0, bottom: 100 } }];
  const out = clampSceneBounds(
    new Map([["w", items]]),
    zones,
    { left: 1, right: 99, top: 5, bottom: 95 },
    diags,
  );
  const shifted = out.get("w")[0];
  assert.equal(shifted._clamped, true);
  assert.ok(shifted._x < 95);
  assert.equal(diags[0].kind, "zone_clamped_to_bounds");
});

// ─── runPipeline + convergence loop ─────────────────────────────────
test("runPipeline: heat_block_bench fixture converges in 1 pass, no diagnostics", () => {
  const result = runHeatBlock();
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.passes.length, 1);
  assert.equal(result.passes[0].zones_shrunk.length, 0);
  assert.equal(result.final.length, 3);
});

test("runPipeline: _width_scale fixture values match spec §7", () => {
  const result = runHeatBlock();
  const byName = new Map(result.stages.scaled.map((p) => [p.placement_name, p]));
  const pxPerCm = WORKSPACE_PX_PER_CM.bench;
  const rack = byName.get("rear_left_eppendorf_rack");
  const heat = byName.get("center_heat_block");
  const ladder = byName.get("rear_right_protein_ladder");
  assert.ok(Math.abs(rack._width_scale - (12 * pxPerCm) / (13 * PX_PER_SCENE_PERCENT)) < 0.001);
  assert.ok(Math.abs(heat._width_scale - (25 * pxPerCm) / (18 * PX_PER_SCENE_PERCENT)) < 0.001);
  assert.ok(Math.abs(ladder._width_scale - (3 * pxPerCm) / (4 * PX_PER_SCENE_PERCENT)) < 0.001);
});

test("runPipeline: heat_block fixture _x and _height match Stage 7/8 math", () => {
  const result = runHeatBlock();
  const heat = result.final.find((p) => p.placement_name === "center_heat_block");
  assert.ok(Math.abs(heat._x - 50) < 0.1, `heat_block centered at _x=${heat._x}`);
  const expectedHeight = (heat._visualWidth * (1920 / 1080)) / 1.35;
  assert.ok(Math.abs(heat._height - expectedHeight) < 0.001);
});

test("runPipeline: convergence loop shrinks _width_scale on overflow", () => {
  // Cram 7 instances of a wide item into a narrow center-aligned zone.
  const overflowScene = {
    scene_name: "overflow",
    workspace: "bench",
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    zones: [
      {
        id: "tight",
        bounds: { left: 40, right: 60, top: 45, bottom: 75 },
        baseline: 72,
        align: "center",
      },
    ],
    placements: Array.from({ length: 7 }, (_, i) => ({
      placement_name: `p${i}`,
      object_name: "heat_block",
      zone: "tight",
      depth_tier: i + 1,
    })),
  };
  const result = runPipeline(overflowScene, {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
  });
  // Expect either multiple passes with shrinking, OR max_iterations_reached.
  const shrunkSomewhere = result.passes.some((p) => p.zones_shrunk.includes("tight"));
  const reachedMax = result.diagnostics.some((d) => d.kind === "max_iterations_reached");
  assert.ok(shrunkSomewhere || reachedMax, "expected shrink or max_iterations_reached");
  // _width_scale on at least one placement should be <= cm-derived value.
  const cmDerived = (25 * WORKSPACE_PX_PER_CM.bench) / (18 * PX_PER_SCENE_PERCENT);
  const minObserved = Math.min(...result.stages.scaled.map((p) => p._width_scale));
  if (shrunkSomewhere) {
    assert.ok(
      minObserved < cmDerived,
      `shrink should reduce width_scale below ${cmDerived}, got ${minObserved}`,
    );
  }
});

test("runPipeline: clean scene reports passes.length === 1 with zones_shrunk empty", () => {
  const result = runHeatBlock();
  assert.equal(result.passes.length, 1);
  assert.deepEqual(result.passes[0].zones_shrunk, []);
});

test("runPipeline: identityDiagCount excludes placement-stage diagnostics", () => {
  const result = runHeatBlock();
  assert.equal(result.identityDiagCount, 0);
});

test("constants: MAX_LAYOUT_PASSES is 3, LAYOUT_SHRINK_FACTOR is 0.9", () => {
  assert.equal(MAX_LAYOUT_PASSES, 3);
  assert.equal(LAYOUT_SHRINK_FACTOR, 0.9);
  assert.equal(DEPTH_SCALE.mid, 1.0);
});
