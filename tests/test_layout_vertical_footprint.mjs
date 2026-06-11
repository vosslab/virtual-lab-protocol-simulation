// Unit tests for the vertical measured-extent helper. Uses the tsx
// loader so the TS source imports directly. Run via:
//   node --import tsx --test tests/test_layout_vertical_footprint.mjs
//
// The load-bearing property is SIDE-INDEPENDENCE: the combined extent
// (object height + label offset + label box) is the same magnitude whether the
// label is placed above (top) or below (bottom) the object, because the helper
// folds a label STRIP whose size does not depend on the side. The reflow stage
// reserves the same row height for either side and a terminal safety flip
// stays inside that reserved row.

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGlobalDefaults,
  DEMO_ASSET_SPECS,
  DEMO_OBJECT_LIBRARY,
  LABEL_LINE_HEIGHT_PCT,
  runPipeline,
  verticalFootprintFor,
} from "../src/scene_runtime/layout/index.ts";

// Import LABEL_LINE_HEIGHT_PCT from the barrel so a drift in the constant
// surfaces as a test failure rather than a silently stale literal.
const LINE_HEIGHT_PCT = LABEL_LINE_HEIGHT_PCT;
// Derive label offset from the engine defaults so a change to the constant
// surfaces as a test failure rather than a silently stale literal.
const cfg = buildGlobalDefaults();
const LABEL_OFFSET_Y = cfg.labelOffsetY;

// Build a minimal ComputedItem stub carrying only the fields the helper reads:
// label text, layout.label_width (the wrap budget), label_placement (the side),
// and _height (the object's rendered height). The .mjs test file is not
// type-checked, so a plain object stands in for the full ComputedItem.
function makeItem(label, labelWidth, height, placement) {
  return {
    label,
    layout: { label_width: labelWidth, label_placement: placement },
    _height: height,
  };
}

test("verticalFootprintFor: short label wraps to one line", () => {
  const item = makeItem("Heat Block", 12, 20, "top");
  const fp = verticalFootprintFor(item, LINE_HEIGHT_PCT, LABEL_OFFSET_Y);
  assert.equal(fp.labelLines.length, 1, "short label fits its budget on one line");
  assert.equal(fp.labelBoxHeight, LINE_HEIGHT_PCT * 1, "one line -> one line height");
  // combinedHeight = object height + label offset + label box height.
  assert.equal(fp.combinedHeight, 20 + LABEL_OFFSET_Y + LINE_HEIGHT_PCT * 1);
});

test("verticalFootprintFor: long label wraps to two lines and reserves twice the box", () => {
  // A long multi-word label well over its budget wraps to two lines (max 2).
  const item = makeItem("Long Protein Ladder Marker Tube", 8, 14, "top");
  const fp = verticalFootprintFor(item, LINE_HEIGHT_PCT, LABEL_OFFSET_Y);
  assert.equal(fp.labelLines.length, 2, "over-budget multi-word label wraps to two lines");
  assert.equal(fp.labelBoxHeight, LINE_HEIGHT_PCT * 2, "two lines -> two line heights");
  assert.equal(fp.combinedHeight, 14 + LABEL_OFFSET_Y + LINE_HEIGHT_PCT * 2);
});

test("verticalFootprintFor: combinedHeight is identical for top and bottom (1-line label)", () => {
  const top = verticalFootprintFor(
    makeItem("Heat Block", 12, 20, "top"),
    LINE_HEIGHT_PCT,
    LABEL_OFFSET_Y,
  );
  const bottom = verticalFootprintFor(
    makeItem("Heat Block", 12, 20, "bottom"),
    LINE_HEIGHT_PCT,
    LABEL_OFFSET_Y,
  );
  assert.equal(top.labelLines.length, 1);
  assert.equal(bottom.labelLines.length, 1);
  // Side-independence: the combined extent magnitude does not depend on the side.
  assert.equal(top.combinedHeight, bottom.combinedHeight);
  assert.equal(top.labelBoxHeight, bottom.labelBoxHeight);
});

test("verticalFootprintFor: combinedHeight is identical for top and bottom (2-line label)", () => {
  const label = "Long Protein Ladder Marker Tube";
  const top = verticalFootprintFor(makeItem(label, 8, 14, "top"), LINE_HEIGHT_PCT, LABEL_OFFSET_Y);
  const bottom = verticalFootprintFor(
    makeItem(label, 8, 14, "bottom"),
    LINE_HEIGHT_PCT,
    LABEL_OFFSET_Y,
  );
  assert.equal(top.labelLines.length, 2);
  assert.equal(bottom.labelLines.length, 2);
  // Side-independence holds for the 2-line case too.
  assert.equal(top.combinedHeight, bottom.combinedHeight);
  assert.equal(top.labelBoxHeight, bottom.labelBoxHeight);
});

test("verticalFootprintFor: default line height matches the resolved config line height", () => {
  // The helper's lineHeightPct argument should equal the config value the
  // measure-vertical stage threads, so the measured box matches place-labels.
  const config = buildGlobalDefaults();
  const item = makeItem("Heat Block", 12, 20, "top");
  const fp = verticalFootprintFor(item, config.labelLineHeightPct, config.labelOffsetY);
  assert.equal(fp.labelBoxHeight, config.labelLineHeightPct * fp.labelLines.length);
  assert.equal(fp.combinedHeight, 20 + config.labelOffsetY + fp.labelBoxHeight);
});

// ─── measure-vertical stage integration ─────────────────────────────

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

test("measure-vertical: pipeline sets _combinedHeight = _height + offset + box on every item", () => {
  // WP-3a runs measure-vertical BEFORE place-vertical: it computes the NATURAL
  // object height (_visualWidth * viewportAspect / aspect) and folds that into
  // _combinedHeight while it._height is still 0. This test reads result.final (the
  // FINAL stage output), where place-vertical has filled the real _height, so the
  // recorded combined extent is a real magnitude, not offset+box alone.
  // The offset is the SCENE-RESOLVED label_offset_y (normalizeSchema defaults it to
  // 4 here), so the test reads the offset back from one item rather than hardcoding
  // it -- the load-bearing property is that the SAME positive offset folds into
  // every item's combined extent, with the box height matching the wrapped lines.
  const config = buildGlobalDefaults();
  const result = runPipeline(HEAT_BLOCK_BENCH, {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
  });
  assert.ok(result.final.length > 0, "scene produced placed items");
  // Recover the offset the stage used from the first item, then require it to be a
  // positive constant shared by every item.
  const first = result.final[0];
  const firstBox = config.labelLineHeightPct * first._labelLines.length;
  const sharedOffset = first._combinedHeight - first._height - firstBox;
  assert.ok(sharedOffset > 0, "the label offset folded into the combined extent is positive");
  for (const it of result.final) {
    assert.equal(typeof it._combinedHeight, "number", "combined extent recorded");
    assert.equal(typeof it._labelBoxHeight, "number", "label box height recorded");
    assert.ok(it._labelPlacement === "top" || it._labelPlacement === "bottom");
    // _height is the real rendered object height (place-vertical filled it).
    assert.ok(it._height > 0, "object height is real at measure time");
    const expectedBox = config.labelLineHeightPct * it._labelLines.length;
    assert.equal(it._labelBoxHeight, expectedBox, "box height matches wrapped line count");
    const expectedCombined = it._height + sharedOffset + expectedBox;
    // Floating sums match to within a tiny epsilon; the offset is the same constant
    // for every item, confirming the stage folds object height + offset + box.
    assert.ok(
      Math.abs(it._combinedHeight - expectedCombined) < 1e-9,
      "combined extent folds object height, offset, and label box",
    );
  }
});

test("measure-vertical: combined extent is unchanged whether the scene labels are top or bottom", () => {
  // Side-independence at the pipeline level: switching the scene-wide label side
  // changes label COORDINATES but never the combined extent magnitude per item.
  function runWithPlacement(placement) {
    const scene = {
      ...HEAT_BLOCK_BENCH,
      layout_rules: { label_placement: placement },
    };
    const result = runPipeline(scene, {
      library: DEMO_OBJECT_LIBRARY,
      assets: DEMO_ASSET_SPECS,
    });
    const byName = new Map();
    for (const it of result.final) byName.set(it.placement_name, it);
    return byName;
  }
  const topItems = runWithPlacement("top");
  const bottomItems = runWithPlacement("bottom");
  assert.equal(topItems.size, bottomItems.size);
  for (const [name, topIt] of topItems) {
    const bottomIt = bottomItems.get(name);
    assert.ok(bottomIt !== undefined, "same item present in both runs: " + name);
    // The combined extent magnitude is identical; only the side differs.
    assert.equal(
      topIt._combinedHeight,
      bottomIt._combinedHeight,
      "combined extent side-independent: " + name,
    );
    assert.equal(topIt._labelBoxHeight, bottomIt._labelBoxHeight);
    assert.equal(topIt._labelPlacement, "top");
    assert.equal(bottomIt._labelPlacement, "bottom");
    // Horizontal placement and the natural object height are side-independent.
    assert.equal(topIt._centerX, bottomIt._centerX);
    assert.equal(topIt._height, bottomIt._height);
    // WP-3a: the OBJECT position inside the row now depends on the label side. A
    // top label seats the label strip at the row top and the object below it; a
    // bottom label seats the object at the row top. So the top-label object sits
    // exactly (labelBoxHeight + gap) LOWER than the bottom-label object. The
    // combined ROW extent stays identical (asserted above), which is the real
    // side-independence property the reflow relies on. The gap is the SCENE-resolved
    // label_offset_y the measure stage folded into the combined extent, recovered
    // from the item's own measured fields so the test does not hardcode it.
    const gap = topIt._combinedHeight - topIt._height - topIt._labelBoxHeight;
    const shift = topIt._labelBoxHeight + gap;
    assert.ok(
      Math.abs(topIt._top - (bottomIt._top + shift)) < 1e-9,
      "top-label object sits labelBox+gap below the bottom-label object: " + name,
    );
    assert.ok(
      Math.abs(topIt._baselineY - (bottomIt._baselineY + shift)) < 1e-9,
      "baseline shifts by the same labelBox+gap: " + name,
    );
  }
});
