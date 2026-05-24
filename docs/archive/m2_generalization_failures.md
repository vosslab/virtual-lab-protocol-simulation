# M2c D5 Failure Classification

## Scope

4 scenes failing D3 structural guard (zone containment). Sources read: scene YAMLs, object YAMLs, asset SVG viewBox, `src/scene_runtime/layout/` pipeline source, `generated/object_library.ts`. READ-ONLY lane; no files were modified by this classification.

## Method

For each failure, extract the offending item's `default_width`, the SVG `viewBox` aspect ratio, and the zone `bounds`. Trace the pipeline: `_width_scale`, `_visualWidth`, `heightPct` (vertical layout formula), `top` (anchor_y default = "bottom" baseline), convergence behavior, clamp behavior, and compare `_top` against `zone.bounds.top - JITTER_TOLERANCE(0.5)` as used by `structural_guards.ts` Guard 1.

Key engine constants used:

- `DEFAULT_VIEWPORT = { w:1920, h:1080 }` => viewportAspect = 1.7778
- `JITTER_TOLERANCE = 0.5` (structural guard)
- `ITEM_ESCAPES_ZONE_TOLERANCE = 3` (soft warn in verticalLayout)
- `MIN_SCALE = 0.55`, `LAYOUT_SHRINK_FACTOR = 0.9`, `MAX_LAYOUT_PASSES = 3`
- `anchor_y` defaults to "bottom" for all objects that do not declare it
- `depthFor(p)` returns `p.depth ?? "mid"`; none of the failing placements declare a `depth` => all are "mid" (DEPTH_SCALE=1.0, DEPTH_BASELINE_OFFSET=0)

## Scene 1: sample_prep_bench

- Offending item: `rear_center_laemmli` (object `laemmli_4x_bottle`, zone `rear_center`).
- Reported bbox: [50.0, 7.6, 53.0, 22.5]; zone bounds [35.0, 10.0, 65.0, 35.0].
- Pipeline state: 0 diagnostics, 1 pass, no convergence.
- Root cause: SVG aspect 0.357 (extreme portrait bottle); zone is 25 units tall with baseline at center (22.5); 3-unit wide bottle generates 14.94 units height; top = 7.6 vs zone top 10 (escapes upward by 2.4 units beyond tolerance).
- Classification: zone capacity.
- Recommended fix (smallest): raise zone `rear_center.top` from 10 to 8 in scene YAML.

## Scene 2: staining_bench

- Offending item: `rear_left_coomassie_stain` (object `coomassie_stain_bottle`, zone `rear_left`).
- Reported bbox: [12.8, 7.6, 15.8, 22.5]; zone bounds [5.0, 10.0, 30.0, 35.0].
- Pipeline state: 5 diagnostics, 3 passes, max_iterations_reached. Secondary item_escapes_zone_vertically on staining_tray and rocking_shaker; primary guard failure was rear_left bottle.
- Root cause: same as sample_prep_bench (tall-aspect bottle on rear zone).
- Classification: zone capacity.
- Recommended fix: raise rear zone top from 10 to 8.

## Scene 3: cell_counter_basic

- Offending item: `main_cell_counter` (object `cell_counter`, zone `instrument_area`).
- Reported bbox: [50.0, 17.3, 72.0, 45.0]; zone bounds [15.0, 20.0, 85.0, 70.0].
- Pipeline state: 0 diagnostics, 1 pass.
- Root cause: cell_counter aspect 1.41 (landscape); default_width 22 generates 27.69 height; zone baseline at mid-zone 45.0; bottom-anchored top = 17.3 vs zone top 20 (escapes by 2.7).
- Classification: content needs authoring (object lacks explicit anchor_y, default "bottom" combined with mid-zone baseline produces overhanging top edge for large instruments).
- Recommended fix: add `baseline_override: 68` to the placement in scene YAML (anchors bottom near zone bottom 70, placing top at ~40 inside zone).

## Scene 4: hood_basic

- Offending item: `center_hood_surface` (object `hood_surface`, zone `center`).
- Reported bbox: [50.0, 5.0, 90.5, 89.0]; zone bounds [20.0, 45.0, 80.0, 75.0].
- Pipeline state: 4 diagnostics, 3 passes, max_iterations_reached. Convergence reduced visual width to 40.5, but heightPct 84.0 still vastly exceeds zone height 30. Clamp pushes top to 5 (scene_bounds top), 40 units above zone top 45.
- Root cause: zone height (30 units) cannot accommodate hood_surface even at MIN_SCALE=0.55. Architecturally mismatched zone/object: zone templated from bench geometry but object is workspace-sized.
- Classification: zone capacity (fundamental) + content authoring (scene needs zone rework or different object scale).
- Recommended fix: redesign center zone to span larger vertical range (e.g., top=10, bottom=90) + add baseline_override on placement. Alternative: reduce hood_surface default_width drastically (50 -> 6 produced acceptable preflight in task #76 but visual scale is wrong; flag for M3 visual review).

## Fix Queue

| scene | classification | recommended fix | severity | est. effort |
| --- | --- | --- | --- | --- |
| sample_prep_bench | zone capacity | scene YAML: rear zone top 10 -> 8 | M2c-blocker | ~5 min |
| staining_bench | zone capacity | scene YAML: same edit; secondary investigation needed | M2c-blocker | ~5 min primary + ~15 min secondary |
| cell_counter_basic | content needs authoring | placement YAML: baseline_override 68 | M2c-blocker | ~5 min |
| hood_basic | zone capacity (fundamental) | scene YAML: zone rework + placement baseline_override; M3 visual review of hood_surface scaling | M2c-blocker | ~30 min |

## Blockers / Caveats

- staining_bench has secondary item_escapes_zone_vertically diagnostics on staining_tray and rocking_shaker that may need separate handling after primary fix.
- hood_basic root cause requires authoring decision: full-scene zone vs multi-zone with smaller hood_surface representation. Task #76 chose the smaller-default_width route (50 -> 6). Visual review for M3 should validate whether the resulting hood looks right at scene scale.
- Latent guard bug worth flagging to pipeline maintainer: `structural_guards.ts` line 38 uses `left: item._x` where `_x` appears to be horizontal center (from horizontal_layout). This makes `itemBbox.right = _x + visualWidth` rather than `_x + visualWidth/2`. Horizontal containment check is shifted right by half visual width. Not a cause of any of the 4 reported (vertical) failures, but worth opening as a separate issue.

## Residual Risks

- After raising rear zone top to 8 in sample_prep_bench / staining_bench, verify the new zone bound does not cause new collisions with non-zone-content (e.g., scene_bounds top 5; new zone top 8 > 5, safe).
- staining_bench secondary diagnostics may produce new guard failures after primary fix; re-preflight after each fix.
- hood_basic at default_width 6 looks tiny in a hood scene; preserve as M3 visual debt item.
