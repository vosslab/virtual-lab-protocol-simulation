# Round 3 well-plate viewport bug diagnosis

## Verdict

SCENE_POSITION_OFFSCREEN. SVG renders with width=100% height=100% and no explicit height constraint. ViewBox 1 5 98 90 (98:90 aspect). At 1280px browser width SVG resolves to 1175px tall, 31 percent taller than 900px Playwright viewport. Well_plate_96 center-zone bottom maps to DOM y=849px raw, plus any page chrome above the scene container the element exceeds the 900px viewport boundary. Playwright force-click bypasses visibility checks but NOT coordinate bounds.

NOT a protocol YAML error. NOT a subpart coordinate bug. NOT a layout overflow. NOT a viewport size mismatch.

## Evidence chain

### Failing targets

Walker (top-10 full walkthrough) blocks:
- mtt_solubilization_readout: step 0 interaction 3, target well_plate_96.all_wells
- plate_drug_treatment_media_adjustment: step 0 interactions 3 and 5, targets well_plate_96.block_A_1_6 and well_plate_96.block_B_H_1_6

Walker viewport: `tests/playwright/_temp_top10_full_walkthrough.mjs` line 213 (1280x900). Both protocols click non-plate objects fine. Fail only on first well_plate_96 subpart.

### Scene zone definitions

`content/base_scenes/bench_basic.yaml` lines 39-46 and `content/base_scenes/hood_basic.yaml` lines 39-46: center zone left=20 right=80 top=45 bottom=75. scene_bounds left=1 right=99 top=5 bottom=95.

### Layout math (scene units)

`content/objects/plate/well_plate_96.yaml` lines 545-547: layout.default_width = 14.

`src/scene_runtime/layout/adapter.ts` line 163: defaultWidth fallback 15.

`src/scene_runtime/layout/layout_engine.ts` lines 58-67: getAssetAspectRatio returns 1.0 (square fallback) for composites with no SVG asset. Cache never populated.

`layout_engine.ts` lines 409-410: height = 14 * 1.0 * (1280/900) = 19.9 scene units.

Center zone baseline = 60. anchorY=center => plate spans y=50.1 to 70.0 scene units. Within scene_bounds 5-95. SceneBounds clamp at `layout_engine.ts` lines 861-955 does not trigger.

Scene-unit math is correct.

### Pixel mapping (the bug surface)

`src/scene_runtime/render/scene.ts` lines 67-82: SVG attributes set to viewBox="1 5 98 90" width="100%" height="100%" preserveAspectRatio="xMidYMid meet".

At 1280px browser width: svg_height = 1280 * (90/98) = 1175px.

Center zone pixel mapping: (70.0 - 5) / 90 * 1175 = 849px plate bottom. Plus chrome above scene container pushes the click target outside the 900px viewport.

### Playwright force behavior

`_temp_top10_full_walkthrough.mjs` line 131 uses `.click({ force: true })`. Force bypasses visibility/overlap checks. Hard coordinate check [0..1280] x [0..900] still applied. Out-of-bounds throws "Element is outside of the viewport".

## Fix recommendation

### Priority 1: constrain scene SVG dimensions

File: `src/scene_runtime/render/scene.ts` lines 78-79.

From:

```
sceneRoot.setAttribute("width", "100%");
sceneRoot.setAttribute("height", "100%");
```

To:

```
sceneRoot.setAttribute("width", "1280");
sceneRoot.setAttribute("height", "900");
```

preserveAspectRatio="xMidYMid meet" letterboxes the SVG within 1280x900.

After fix pixel mapping: plate top = (50.1-5)/90 * 900 = 451px. Plate bottom = (70.0-5)/90 * 900 = 650px. Both within the 900px viewport.

Alternative (Fix B): constrain the CSS container div to height: 100vh so SVG inherits a bounded height.

### Priority 2: correct plate aspect ratio (deferred)

Layout engine defaults to aspect 1.0 (square) for composites with no SVG file. Real SBS 96-well plate is 132mm x 88mm, aspect 0.667. With correct ratio plate would render flattened. Implement by adding `aspect_ratio: 0.667` to `content/objects/plate/well_plate_96.yaml` layout section and reading it in `src/scene_runtime/layout/adapter.ts` buildAssetSpec.

## Relevant files

- `src/scene_runtime/render/scene.ts` (lines 78-79: P1 fix target)
- `src/scene_runtime/layout/layout_engine.ts` (lines 58-67 aspect fallback; lines 409-410 height calc)
- `content/objects/plate/well_plate_96.yaml` (lines 545-547 layout config; P2 fix target)
- `content/base_scenes/bench_basic.yaml` and `content/base_scenes/hood_basic.yaml` (lines 39-46 center zone)
- `docs/active_plans/reports/round3_top10_full_walkthrough.md` (lines 60-75 error evidence)
- `tests/playwright/_temp_top10_full_walkthrough.mjs` (line 131 force click; line 213 viewport)

## Status

DONE. Verdict SCENE_POSITION_OFFSCREEN. P1 fix is 2-line change. P2 is a long-term layout-engine improvement.
