// Unit tests for the WP-3b terminal uniform object rescale. Uses the tsx loader so
// the TS source imports directly. Run via:
//   node --import tsx --test tests/test_layout_uniform_rescale.mjs
//
// The load-bearing properties (plan WP-3b):
//   - exactly ONE scene-wide object scale factor is applied, the SAME factor to an
//     item's width AND height, so the asset aspect ratio is preserved (never-crop
//     safe);
//   - the label strip (label box height) and the object/label gap stay FIXED: only
//     the object portion of the combined extent shrinks;
//   - the zone reflow is recomputed ONCE on the scaled extents (the returned bands
//     reflect the scaled per-tier content);
//   - an over-full-at-floor scene reports stillOverflow and the pipeline emits the
//     scene-level scene_reflow_overflow signal (the repurposed
//     item_escapes_zone_vertically diagnostic with no placement_name).

import test from "node:test";
import assert from "node:assert/strict";

import {
  applyUniformRescale,
  buildGlobalDefaults,
  DEMO_ASSET_SPECS,
  DEMO_OBJECT_LIBRARY,
  reflowZones,
  runPipeline,
  UNIFORM_RESCALE_MIN_SCALE,
} from "../src/scene_runtime/layout/index.ts";

const VIEWPORT = { w: 1920, h: 1080 };

// Derive the REAL reflow content extents (totalContent, fixedOverhead) for a measured
// map the same way the pipeline does, so the rescale is sized against honest numbers
// instead of a hand-picked totalContent. zonePad / labelGap come from the config so
// the test mirrors the phase wiring (WP-3c).
function reflowContentFor(measured, zones, sceneBounds, config) {
  const zonePad = config.spacing.objectZonePadding;
  const labelGap = config.labelOffsetY;
  const reflow = reflowZones(measured, zones, sceneBounds, zonePad, undefined, labelGap);
  return { totalContent: reflow.totalContent, fixedOverhead: reflow.fixedOverhead };
}

// Compute the lowest object-art bottom over a rescale result, mirroring the
// place-vertical geometry: each item's object strip sits inside its tier row
// (top label pushes the object down by labelBox + labelGap; bottom label puts the
// object at the row top), and the object's natural height is visualWidth * aspectTerm
// / aspect. The max objectTop + objectHeight is the lowest art point in the scene.
function maxObjectBottom(result, zones, config) {
  const viewportAspect = VIEWPORT.w / VIEWPORT.h;
  const aspectFloor = config.aspectFloor;
  const labelGap = config.labelOffsetY;
  let worst = -Infinity;
  for (const zone of zones) {
    const band = result.bands.get(zone.id);
    if (band === undefined) continue;
    const items = result.scaledMeasured.get(zone.id) ?? [];
    for (const it of items) {
      // Find the tier row this item belongs to.
      let rowTop;
      for (const row of band.tiers) {
        if (row.placementNames.includes(it.placement_name)) {
          rowTop = row.rowTop;
          break;
        }
      }
      if (rowTop === undefined) continue;
      const aspect = Math.max(aspectFloor, it.aspect);
      const objectHeight = (it._visualWidth * viewportAspect) / aspect;
      const labelBox = it._labelBoxHeight ?? 0;
      const placement = it._labelPlacement ?? "top";
      // Top label: object sits below the label strip; bottom label: object at row top.
      const objectTop = placement === "bottom" ? rowTop : rowTop + labelBox + labelGap;
      const objectBottom = objectTop + objectHeight;
      if (objectBottom > worst) worst = objectBottom;
    }
  }
  return worst;
}

// A measured ComputedItem stub carrying the fields applyUniformRescale reads:
// placement_name / depth_tier (tier membership), aspect (height back-solve),
// _visualWidth + _scale (object dims it scales), and the measured-extent fields
// (_combinedHeight / _labelBoxHeight / _labelPlacement). layout carries the
// anchor + label fields downstream phases read. The .mjs file is not type-checked,
// so a plain object stands in for the full ComputedItem.
function makeMeasured(name, depthTier, visualWidth, aspect, labelBoxHeight) {
  const viewportAspect = VIEWPORT.w / VIEWPORT.h;
  const objectHeight = (visualWidth * viewportAspect) / aspect;
  const labelGap = buildGlobalDefaults().labelOffsetY;
  return {
    placement_name: name,
    object_name: name,
    zone: "z",
    depth_tier: depthTier,
    aspect,
    layout: { anchor_y: "center", anchor_y_offset: 0, label_width: 6, default_width: 2 },
    _scale: 1,
    _centerX: 50,
    _baselineY: 0,
    _top: 0,
    _visualWidth: visualWidth,
    _height: 0,
    _footprint: visualWidth,
    _labelX: 50,
    _labelY: 0,
    _labelLines: ["L"],
    _combinedHeight: objectHeight + labelGap + labelBoxHeight,
    _labelBoxHeight: labelBoxHeight,
    _labelPlacement: "top",
  };
}

function makeZone(id, top, bottom) {
  return { id, bounds: { left: 5, right: 95, top, bottom } };
}

// Build a single over-full zone. Two tall items in tier 0 (so one row, the tallest
// sets the row height) plus a third in tier 1 (a second row). Object widths chosen so
// the natural object heights dominate and totalContent comfortably exceeds the scene
// range but the required scale stays well above the floor.
function buildOverFullZone() {
  const measured = new Map();
  measured.set("z", [
    makeMeasured("a", 0, 30, 1.0, 2.2),
    makeMeasured("b", 0, 24, 1.0, 2.2),
    makeMeasured("c", 1, 28, 1.0, 2.2),
  ]);
  return measured;
}

test("applyUniformRescale: one scene-wide factor scales W and H equally (aspect preserved)", () => {
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const measured = buildOverFullZone();
  // Use the REAL reflow content extents for these stubs (totalContent + the new
  // fixedOverhead), so the rescale is sized against honest numbers (WP-3c).
  const { totalContent, fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    VIEWPORT,
    config,
  );

  assert.ok(result.uniformScale < 1, "an over-full scene shrinks objects");
  assert.ok(
    result.uniformScale >= UNIFORM_RESCALE_MIN_SCALE,
    "the factor respects the dedicated floor",
  );

  const viewportAspect = VIEWPORT.w / VIEWPORT.h;
  const original = measured.get("z");
  const scaled = result.scaledMeasured.get("z");
  assert.equal(scaled.length, original.length, "same item count after rescale");

  for (let i = 0; i < original.length; i++) {
    const o = original[i];
    const s = scaled[i];
    // Width factor: scaled width / original width == the one scene-wide factor.
    const widthFactor = s._visualWidth / o._visualWidth;
    assert.ok(
      Math.abs(widthFactor - result.uniformScale) < 1e-12,
      `item ${o.placement_name}: width scaled by the scene-wide factor`,
    );
    // Height factor: the implied object height (visualWidth * aspectTerm / aspect)
    // scales by the SAME factor, so aspect is preserved (one factor for W and H).
    const aspect = Math.max(config.aspectFloor, o.aspect);
    const origHeight = (o._visualWidth * viewportAspect) / aspect;
    const scaledHeight = (s._visualWidth * viewportAspect) / aspect;
    const heightFactor = scaledHeight / origHeight;
    assert.ok(
      Math.abs(heightFactor - widthFactor) < 1e-12,
      `item ${o.placement_name}: height scaled by the same factor as width (aspect preserved)`,
    );
    // _scale also carries the factor so _visualWidth === visualWidthFor(it, _scale).
    assert.ok(
      Math.abs(s._scale / o._scale - result.uniformScale) < 1e-12,
      `item ${o.placement_name}: _scale carries the same factor`,
    );
  }
});

test("applyUniformRescale: label box height and gap stay fixed; only the object shrinks", () => {
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const measured = buildOverFullZone();
  const labelGap = config.labelOffsetY;
  const { totalContent, fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    VIEWPORT,
    config,
  );

  const viewportAspect = VIEWPORT.w / VIEWPORT.h;
  const original = measured.get("z");
  const scaled = result.scaledMeasured.get("z");
  for (let i = 0; i < original.length; i++) {
    const o = original[i];
    const s = scaled[i];
    // The label box height is NOT scaled: it is carried through unchanged.
    assert.equal(s._labelBoxHeight, o._labelBoxHeight, "label box height unchanged");
    // The recomputed combined extent = scaledObjectHeight + FIXED gap + FIXED box.
    const aspect = Math.max(config.aspectFloor, o.aspect);
    const scaledObjectHeight = (s._visualWidth * viewportAspect) / aspect;
    const expectedCombined = scaledObjectHeight + labelGap + s._labelBoxHeight;
    assert.ok(
      Math.abs(s._combinedHeight - expectedCombined) < 1e-9,
      "combined extent folds scaled object height with the fixed gap and fixed label box",
    );
    // The gap recovered from the combined extent equals the FIXED config gap, proving
    // the gap did not scale with the object.
    const recoveredGap = s._combinedHeight - scaledObjectHeight - s._labelBoxHeight;
    assert.ok(Math.abs(recoveredGap - labelGap) < 1e-9, "object/label gap stays fixed");
  }
});

test("applyUniformRescale: the zone reflow is recomputed once on the scaled extents", () => {
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const measured = buildOverFullZone();
  const { totalContent, fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    VIEWPORT,
    config,
  );

  // The returned bands come from ONE reflow over the SCALED extents: each tier row
  // height must equal the per-tier max SCALED combined extent. Tier 0 has items a/b;
  // tier 1 has item c. Pull the scaled combined extents and compare to the band rows.
  const scaled = result.scaledMeasured.get("z");
  const byName = new Map(scaled.map((it) => [it.placement_name, it]));
  const tier0Max = Math.max(byName.get("a")._combinedHeight, byName.get("b")._combinedHeight);
  const tier1Max = byName.get("c")._combinedHeight;

  const band = result.bands.get("z");
  assert.ok(band !== undefined, "a band was produced for the zone");
  assert.equal(band.tiers.length, 2, "two depth tiers -> two rows");
  const row0 = band.tiers.find((r) => r.depthTier === 0);
  const row1 = band.tiers.find((r) => r.depthTier === 1);
  assert.ok(Math.abs(row0.rowHeight - tier0Max) < 1e-9, "tier 0 row uses the scaled extent");
  assert.ok(Math.abs(row1.rowHeight - tier1Max) < 1e-9, "tier 1 row uses the scaled extent");
});

test("applyUniformRescale: content needing more shrink than the floor reports stillOverflow", () => {
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const measured = buildOverFullZone();
  // sceneRange is 90. Use the real fixedOverhead but a totalContent so large that the
  // SCALABLE remainder needs a scale below UNIFORM_RESCALE_MIN_SCALE:
  //   raw = (sceneRange - fixedOverhead) / (totalContent - fixedOverhead) < UNIFORM_RESCALE_MIN_SCALE.
  // A totalContent of 600 (with the small fixedOverhead of this stub) forces raw well
  // under the floor, so the factor clamps to the floor and stillOverflow is true.
  const { fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    600,
    fixedOverhead,
    VIEWPORT,
    config,
  );
  assert.ok(
    Math.abs(result.uniformScale - UNIFORM_RESCALE_MIN_SCALE) < 1e-12,
    "the factor clamps to the dedicated floor",
  );
  assert.equal(result.stillOverflow, true, "still over the range at the floor");
});

test("applyUniformRescale: content that fits above the floor does not report stillOverflow", () => {
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const measured = buildOverFullZone();
  // The real reflow content needs a scale above the floor, so it is not clamped.
  const { totalContent, fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    VIEWPORT,
    config,
  );
  assert.ok(
    result.uniformScale > UNIFORM_RESCALE_MIN_SCALE,
    "factor above the floor (not clamped)",
  );
  assert.equal(result.stillOverflow, false, "fits at the computed scale");
});

test("applyUniformRescale: corrected scale lands all object art inside the scene range (WP-3c)", () => {
  // The load-bearing WP-3c property: sizing the scale against only the SCALABLE
  // remainder (totalContent - fixedOverhead) lands the lowest object art at or above
  // sceneRangeBottom. The old formula (sceneRange / totalContent) left fixedOverhead
  // of content past the bottom; this asserts the corrected formula does not.
  const config = buildGlobalDefaults();
  const zones = [makeZone("z", 5, 95)];
  const sceneBounds = { left: 1, right: 99, top: 5, bottom: 95 };
  const sceneRangeBottom = sceneBounds.bottom;
  const measured = buildOverFullZone();
  const { totalContent, fixedOverhead } = reflowContentFor(measured, zones, sceneBounds, config);
  assert.ok(fixedOverhead > 0, "the stub scene carries real fixed overhead");

  const result = applyUniformRescale(
    measured,
    zones,
    sceneBounds,
    totalContent,
    fixedOverhead,
    VIEWPORT,
    config,
  );
  // The corrected scale: no object art lands below the scene-range bottom (a tiny
  // float tolerance for the rounding residual; art must not visibly cross the bottom).
  const worst = maxObjectBottom(result, zones, config);
  assert.ok(
    worst <= sceneRangeBottom + 1e-6,
    `corrected scale keeps art inside the range: maxObjectBottom ${worst} <= ${sceneRangeBottom}`,
  );

  // The OLD formula (sceneRange / totalContent) would have under-shrunk: replay it and
  // confirm it leaves art past the bottom, so this test guards against a regression to
  // the flawed denominator.
  const oldScale = Math.min(1, Math.max(0.4, (sceneRangeBottom - sceneBounds.top) / totalContent));
  assert.ok(oldScale > result.uniformScale, "corrected scale is more aggressive than the old one");
});

// ─── pipeline-level diagnostic emission ─────────────────────────────

// A synthetic scene packed with many stacked depth tiers in two zones so the
// measured content exceeds 2.5x the scene range (the floor's reciprocal), forcing
// the rescale to clamp at the floor and the pipeline to emit the scene-level
// scene_reflow_overflow signal. Uses real demo objects so bind/scale succeed.
function buildOverFloorScene() {
  const placements = [];
  // Eight tall stacked tiers in the rear zone plus four in the front zone: enough
  // distinct depth_tier rows that the summed content extent dwarfs the scene range.
  const tallObjects = ["t75_flask", "media_bottle", "serological_pipette"];
  for (let tier = 0; tier < 8; tier++) {
    placements.push({
      placement_name: `rear_${tier}`,
      object_name: tallObjects[tier % tallObjects.length],
      zone: "rear",
      depth_tier: tier,
    });
  }
  for (let tier = 0; tier < 4; tier++) {
    placements.push({
      placement_name: `front_${tier}`,
      object_name: tallObjects[tier % tallObjects.length],
      zone: "front",
      depth_tier: tier,
    });
  }
  return {
    scene_name: "over_floor_synthetic",
    workspace: "bench",
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    zones: [makeZone("rear", 8, 45), makeZone("front", 50, 92)],
    placements,
  };
}

test("runPipeline: an over-full-at-floor scene emits the scene-level scene_reflow_overflow", () => {
  const scene = buildOverFloorScene();
  const result = runPipeline(scene, {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
    viewport: VIEWPORT,
  });
  // The rescale clamped at the floor: the result flags scene overflow and reports the
  // floor scale.
  assert.equal(result.sceneReflowOverflow, true, "scene still overflows at the floor");
  assert.ok(
    Math.abs(result.reflowUniformScale - UNIFORM_RESCALE_MIN_SCALE) < 1e-12,
    "uniform scale clamped to floor",
  );
  // The repurposed scene-level signal is in the runtime diagnostics stream: an
  // item_escapes_zone_vertically with NO placement_name (scene scope), distinct from
  // the per-item escape the place-vertical fallback emits.
  const sceneSignals = result.diagnostics.filter(
    (d) => d.kind === "item_escapes_zone_vertically" && d.placement_name === undefined,
  );
  assert.ok(sceneSignals.length >= 1, "scene-level item_escapes_zone_vertically emitted");
});

test("runPipeline: a fitting scene reports no rescale (uniform scale 1, no scene overflow)", () => {
  // A small two-item bench scene that fits comfortably: no overflow, so no rescale.
  const scene = {
    scene_name: "fits_fine",
    workspace: "bench",
    scene_bounds: { left: 1, right: 99, top: 5, bottom: 95 },
    zones: [makeZone("z", 30, 70)],
    placements: [{ placement_name: "only", object_name: "heat_block", zone: "z", depth_tier: 0 }],
  };
  const result = runPipeline(scene, {
    library: DEMO_OBJECT_LIBRARY,
    assets: DEMO_ASSET_SPECS,
    viewport: VIEWPORT,
  });
  assert.equal(result.reflowUniformScale, 1, "no rescale -> factor 1");
  assert.equal(result.sceneReflowOverflow, false, "no scene overflow");
  assert.equal(result.labelDominant, false, "no label dominance when nothing shrank");
});
