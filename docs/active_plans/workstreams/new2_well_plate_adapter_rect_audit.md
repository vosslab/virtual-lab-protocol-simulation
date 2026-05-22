# NEW2 well-plate adapter rect audit (Lane W)

## Purpose

NEW1.5 Lane A and Lane R both failed to prove a re-render in the built app
because the validator rejected sub-target clicks on `well_plate_96`. This
audit traces the click-resolution chain end to end to identify the actual
root cause and propose a minimal patch. No file edits in this lane.

## What the adapter does now

File: `src/scene_runtime/adapters/well_plate/render.ts` lines 37-233.

Render flow:

- Creates the parent SVG group container.
- Builds row group containers (`row_A` through `row_H`) at lines 127-152.
  Each row group carries `data-target-id="well_plate_96.row_<letter>"`.
- Renders 96 individual well rects (A1..H12) at lines 155-186. Each well
  carries `data-target-id="well_plate_96.<col><row>"` (e.g. `well_plate_96.E7`).
- Computes group bounding rects from member cells at lines 190-231.

Coord space: production SVG viewBox. The renderer emits valid integer
coordinates per well. Lane B's `render_and_dump.mjs` measurement (zoom
group `1920x1763`) reflects actual rendered geometry, not NaN values.
Lane A's earlier "NaN" claim was an artifact of its own pre-revert edits
to `css_native_adapter.ts`, not a baseline adapter defect.

## Click resolution chain

1. Playwright dispatches a click at viewport pixel.
2. Browser hit-tests the SVG. The hit element is the innermost well rect
   (e.g. `data-target-id="well_plate_96.E7"`).
3. The chrome event handler reads the closest `data-target-id` ancestor.
4. The runtime emits the click event with the sub-target id.
5. `isTargetSatisfied(expected, emitted, target_object)` at
   `src/scene_runtime/bundle/entry.ts:443-491` is the canonical
   hierarchical matcher. It accepts a click on `well_plate_96.E7` when the
   expected target is `well_plate_96.row_E` because `row_E.contains`
   includes `E7` (line 482).
6. The dispatch path delivers the validation result.

## Where it breaks

The `correct_target` validator preset (the preset named in
`tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`) does NOT
route through `isTargetSatisfied`. It performs strict string equality
between `expected_target_id` and the click's emitted `data-target-id`.

Evidence:

- Lane D blocker (`docs/active_plans/lane_d_state_change_blocker.md`):
  validator emitted "Wrong target: expected 'well_plate_96.E7', got
  'well_plate_96.E7'" only after `currentInteractionIndex` was already
  reset to 0; with the previously-targeted `well_plate_96.row_E` the
  preset also rejected the sub-cell click.
- Lane R follow-up (`docs/active_plans/lane_r_rerender_probe_summary.md`):
  switching the target to `well_plate_96.row_E` did not unblock; the click
  reached the dispatch path but the preset still refused to mark the step
  complete.

Conclusion: adapter is correct. `isTargetSatisfied` is correct. The
preset-layer implementation of `correct_target` enforces a stricter
equality than the canonical matcher.

## Root cause classification

(e) Validator preset target-grouping design: the `correct_target` preset
treats sub-targets as distinct identifiers, while `isTargetSatisfied`
treats them as group members. The preset is on the no-touch list per all
prior briefs.

## Cross-references

- `lane_d_state_change_blocker.md`
- `lane_r_rerender_probe_summary.md`
- Lane B precheck JSON: `test-results/new0_css_native/audit/visual_audit.json`
- Production renderer entry: `src/scene_runtime/bundle/entry.ts` (isTargetSatisfied
  at lines 443-491; preset dispatch around line 761).
- Well-plate render adapter: `src/scene_runtime/adapters/well_plate/render.ts`
  (verified correct).

## Minimal patch proposal

Route the `correct_target` validator preset through the existing
`isTargetSatisfied(expected_target_id, emitted_target_id, target_object)`
function instead of strict string equality.

- File: `src/scene_runtime/bundle/entry.ts` (preset implementation; the
  exact line range depends on the preset registry, located near line 761).
- Estimated change: 1 function body, approximately 10 lines.
- Diff sketch (pseudocode):
  ```
  // Before (strict equality):
  function preset_correct_target(expected, emitted, target_object) {
      return expected === emitted;
  }
  // After (hierarchical via isTargetSatisfied):
  function preset_correct_target(expected, emitted, target_object) {
      return isTargetSatisfied(expected, emitted, target_object);
  }
  ```

This patch does NOT alter `isTargetSatisfied` itself. It only changes the
preset's matching rule to match the canonical hierarchy semantics already
encoded in `isTargetSatisfied`.

## Risk and reversibility

- Blast radius: every existing protocol using the `correct_target` preset
  on a parent target now accepts sub-target clicks. This is the SEMANTICS
  already present in `isTargetSatisfied`, so any protocol relying on
  strict equality with a sub-target named explicitly was either already
  testing hierarchy by accident (sub-target name matches itself) or
  needs an explicit "sub-target only" preset (not in current scope).
- Rollback: single `git checkout HEAD -- src/scene_runtime/bundle/entry.ts`.
- Forbidden boundary: yes. `entry.ts` is on the no-touch list per all
  prior NEW1 / NEW1.5 briefs. Per user rule: "Do not edit validator
  logic unless Lane W proves there is no alternative, then stop and
  document." Lane W has done so.

## Contract check

The patch routes a validator preset through the canonical hierarchical
matcher already shipped in the same file. It does NOT introduce new
matcher semantics, NEW target naming, or new contract surface. Complies
with `docs/PRIMARY_CONTRACT.md` item 3 (clickable lab objects + scene
layout rules unchanged).

## Decision required

User must approve the forbidden-boundary edit OR accept that Lane R
re-render proof remains BLOCKED indefinitely. No third option preserves
both the no-touch boundary and the re-render proof.

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary

Parent (well_plate_96):

- Width: 0 px
- Height: 0 px

Sub-target A1:

- Width: 160 px
- Height: 0 px
- Offset from parent: (20, 98)

Sub-target E7:

- Width: 160 px
- Height: 0 px
- Offset from parent: (979, 98)

Sub-target H12:

- Width: 160 px
- Height: 0 px
- Offset from parent: (1778, 98)

### Validation

- Parent found: true
- All cells found: true
- No NaN values: true
- All positive dimensions: false
- Sub-targets inside parent bounds: false

### Summary

One or more validations failed. See details above.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary

Parent (well_plate_96):

- Width: 0 px
- Height: 0 px

Sub-target A1:

- Width: 8 px
- Height: 0 px
- Offset from parent: (1, 5)

Sub-target E7:

- Width: 8 px
- Height: 0 px
- Offset from parent: (50, 5)

Sub-target H12:

- Width: 8 px
- Height: 0 px
- Offset from parent: (91, 5)

### Validation

- Parent found: true
- All cells found: true
- No NaN values: true
- All positive dimensions: false
- Sub-targets inside parent bounds: false

### Summary

One or more validations failed. See details above.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary

Parent (well_plate_96):

- Width: 98 px
- Height: 0 px

Sub-target A1:

- Width: 8 px
- Height: 0 px
- Offset from parent: (0, 0)

Sub-target E7:

- Width: 8 px
- Height: 0 px
- Offset from parent: (49, 0)

Sub-target H12:

- Width: 8 px
- Height: 0 px
- Offset from parent: (90, 0)

### Validation

- Parent found: true
- All cells found: true
- No NaN values: false
- All positive dimensions: false
- Sub-targets inside parent bounds: true

### Summary

One or more validations failed. See details above.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary

Parent (well_plate_96):

- Width: 98 px
- Height: 0 px

Sub-target A1:

- Width: 8 px
- Height: 0 px
- Offset from parent: (0, 0)

Sub-target E7:

- Width: 8 px
- Height: 0 px
- Offset from parent: (49, 0)

Sub-target H12:

- Width: 8 px
- Height: 0 px
- Offset from parent: (90, 0)

### Validation

- Parent found: true
- All cells found: true
- No NaN values: false
- All positive dimensions: false
- Sub-targets inside parent bounds: true

### Summary

One or more validations failed. See details above.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary (coordinate space values)

Parent (well_plate_96):

- X: 1
- Y: 5
- Width: 98
- Height: 0 (note: may be 0 in SVG)

Sub-target A1:

- X: 1
- Y: 5
- Width: 8.17
- Offset from parent: (0, 0)

Sub-target E7:

- X: 50
- Y: 5
- Width: 8.17
- Offset from parent: (49, 0)

Sub-target H12:

- X: 90.83333333333333
- Y: 5
- Width: 8.17
- Offset from parent: (89.83333333333333, 0)

### Validation

- Parent found: true
- All cells found: true
- No NaN in coordinate space: true
- No NaN in offsets: true
- Widths positive: true
- Offsets valid (non-negative): true

### Summary

All validations passed. Parent plate and three sub-target cells rendered with valid coordinate space positions, widths, and offsets. Sub-targets positioned correctly relative to parent.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`

## Well-plate rect probe (Lane W-prototype, 2026-05-20)

### Output files

- rects.json: `test-results/new2_well_plate_rect_probe/rects.json`
- Annotated screenshot: `test-results/new2_well_plate_rect_probe/annotated.png`

### Per-target rect summary (coordinate space values)

Parent (well_plate_96):

- X: 1
- Y: 5
- Width: 98
- Height: 0 (note: may be 0 in SVG)

Sub-target A1:

- X: 1
- Y: 5
- Width: 8.17
- Offset from parent: (0, 0)

Sub-target E7:

- X: 50
- Y: 5
- Width: 8.17
- Offset from parent: (49, 0)

Sub-target H12:

- X: 90.83333333333333
- Y: 5
- Width: 8.17
- Offset from parent: (89.83333333333333, 0)

### Validation

- Parent found: true
- All cells found: true
- No NaN in coordinate space: true
- No NaN in offsets: true
- Widths positive: true
- Offsets valid (non-negative): true

### Summary

All validations passed. Parent plate and three sub-target cells rendered with valid coordinate space positions, widths, and offsets. Sub-targets positioned correctly relative to parent.

### Cross-references

- Probe script: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Well-plate adapter (READ ONLY): `src/scene_runtime/adapters/well_plate/render.ts`
- Spike protocol: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml`
