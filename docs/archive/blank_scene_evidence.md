# Blank-scene stabilization evidence (Milestone M3)

This audit documents Milestone M3: structural guards and the empty-scene
assert no longer blank a scene in the render path. Guards now classify
violations and the caller decides fatality. The render path reports and still
renders; tests and CI keep a strict throwing mode.

Evidence is produced by `node tools/scene_to_png.mjs --all`, which renders
every discovered scene through the standalone scene viewer (`dist/scene_viewer.html`,
no shell, no step machine) and records a per-scene category in `summary.json`.

## Source of truth

- Before: `test-results/scenes/summary.json` (WS-M3-A baseline).
- After: `test-results/scenes_after/summary.json` (this milestone).

## Category counts: before vs after

| Category         | Before | After |
| ---------------- | ------ | ----- |
| populated        | 25     | 44    |
| load-failed      | 19     | 0     |
| empty            | 1      | 0     |
| placeholder-only | 0      | 1     |
| skipped          | 1      | 1     |
| TOTAL            | 46     | 46    |

The 19 previously load-failed scenes and the 1 previously empty scene now
render. None blank.

## Mechanism of the blank, and the fix

The 19 load-failed scenes rendered through the standalone scene viewer, which
has no shell and no step machine. The failure was the render pipeline THROWING:
`renderScene` called the throwing guard `runStructuralGuards`, which threw on
the first overlap / label-off-scene / aspect-distortion violation. An uncaught
throw inside the viewer mount blanked the scene.

Fix (real design fix, not a try/catch swallow): each guard has a pure
classification core that returns a `StructuralViolation[]` and never throws.
Two wrappers consume it:

- `collectStructuralViolations()` returns the full list, never throws. The
  renderer uses this.
- `runStructuralGuards()` runs the core and re-raises the first violation's
  Error. Tests and CI use this so a structural regression still fails loudly.

`renderScene` now collects violations, and when any exist it sets
`data-scene-degraded="true"` (plus `data-degraded-violation-count`) on the
scene root, emits one grouped `console.warn`, and STILL renders every item.
The empty-scene path in the viewer (`dist_entry.tsx` `mount_scene_viewer`)
never throws on an empty/all-placeholder result; it renders and marks
`data-viewer-ready`.

## Missing-object placeholder (Part B)

Spike result -- exact drop point: an object absent from `OBJECT_LIBRARY` was
marked `_error` in `bind_objects.ts`, and `group_by_zone.ts` routes any
`_error` placement to `orphans`, which never reach render output. That dropped
the item and could blank a content-bearing scene.

Fix: `bind_objects.ts` no longer sets `_error` for an unknown object. It records
the `unknown_object` diagnostic and binds the placement as a renderable
placeholder: `kind: "decoration"`, `missing_svg: true`, `_missing_object: true`,
a default layout and aspect. It then flows through scale -> group -> layout
normally (it has a real zone), and structural guards skip `missing_svg` items
(same as for missing SVG art). `render_item.ts` routes `missing_svg` items to
the existing placeholder path and sets a DISTINCT
`data-placeholder-kind="missing-object"` (vs `"missing-svg"`), keeps
`data-item-id` = object name, and labels the box "MISSING OBJECT".

Coverage:

- `tests/test_layout_engine.mjs` asserts `bindObjects` sets `_missing_object`
  on an unknown object instead of orphaning it.
- `tests/test_render_item_missing_svg.mjs` asserts the renderer emits
  `data-placeholder-kind="missing-object"`, keeps `data-missing-svg="true"`
  for back-compat, and labels "MISSING OBJECT".
- `tests/test_scene_stats.mjs` asserts stats classify missing-object placeholders.

Boundary note: the build-time pipeline (`pipeline/gen_scene_index.py`) still
VALIDATES unknown objects and SKIPS the scene (e.g. `long_labels_smoke` ->
unknown object `dmf_bottle`). So in a normal `--all` run no scene reaches the
runtime missing-object path -- the unknown object is caught earlier and the
scene is `skipped`, not rendered with a missing-object placeholder. The runtime
placeholder path is the safety net for any unknown object that bypasses or
post-dates build validation; it is exercised by the unit tests above, not by a
shipped scene. The one `placeholder-only` scene after the rebuild is
`missing_svg_check`, a missing-SVG (art absent) placeholder, not a
missing-object placeholder.

## Per-previously-blank-scene outcome

All 19 previously load-failed scenes are now `populated` at 100% render yield.
`degraded` marks scenes whose structural violations were downgraded from throw
to report; the scene still renders every item.

| Scene                                          | Before -> After       | Real items | Placeholder | Flags                  |
| ---------------------------------------------- | --------------------- | ---------- | ----------- | ---------------------- |
| adversarial_overflow_smoke                     | load-failed->populated | 21         | 0           | near-empty             |
| cell_counter_basic_row_slot                    | load-failed->populated | 2          | 0           | -                      |
| centrifuge_workspace                           | load-failed->populated | 8          | 0           | -                      |
| electrophoresis_bench                          | load-failed->populated | 16         | 0           | -                      |
| electrophoresis_bench_row_slot                 | load-failed->populated | 16         | 0           | -                      |
| extraction_workspace                           | load-failed->populated | 17         | 0           | -                      |
| hood_basic_row_slot                            | load-failed->populated | 4          | 0           | near-empty             |
| hood_workspace                                 | load-failed->populated | 9          | 1           | degraded               |
| incubator_workspace                            | load-failed->populated | 7          | 1           | degraded               |
| passage_hood_detachment_hood_workspace         | load-failed->populated | 7          | 1           | near-empty, degraded   |
| sample_prep_bench_row_slot                     | load-failed->populated | 5          | 0           | near-empty             |
| sdspage_attach_lid_and_leads_workspace         | load-failed->populated | 16         | 0           | -                      |
| sdspage_fill_tank_buffer_workspace             | load-failed->populated | 16         | 0           | -                      |
| sdspage_load_sample_single_lane_workspace      | load-failed->populated | 17         | 0           | -                      |
| sdspage_prepare_running_buffer_workspace       | load-failed->populated | 16         | 0           | -                      |
| sdspage_recycle_buffer_workspace               | load-failed->populated | 16         | 0           | -                      |
| sdspage_run_electrophoresis_workspace          | load-failed->populated | 16         | 0           | -                      |
| seeding_workspace                              | load-failed->populated | 11         | 1           | degraded               |
| staining_bench_row_slot                        | load-failed->populated | 10         | 0           | -                      |

Spot-check confirmation:

- `electrophoresis_bench`: load-failed -> populated, 16 real items, no
  placeholder, no degraded flag (its overlap/aspect violations were resolved by
  the geometry, not merely downgraded).
- Scenes flagged `degraded` (e.g. `hood_workspace`, `incubator_workspace`,
  `seeding_workspace`, `passage_hood_detachment_hood_workspace`) render all
  items with the scene root marked `data-scene-degraded="true"`.

## Verification commands

- `node --import tsx --test tests/test_structural_guards.mjs` -- pass
  (throwing mode preserved; 151-test sweep includes it).
- `bash check_codebase.sh` -- 6/6 PASS (typecheck, typecheck:lint, lint,
  format:check, css:policy, test:node = 151 pass / 0 fail).
- `bash pipeline/build_generated.sh && bash build_github_pages.sh` -- rebuilt.
- `node tools/scene_to_png.mjs --all --out test-results/scenes_after` ->
  44 populated / 0 load-failed / 1 placeholder-only / 1 skipped.

## Follow-ons

- `tools/scene_stats.mjs` already classifies placeholders; consider having the
  category logic read `data-scene-degraded` from the rendered DOM so the
  `degraded` advisory flag is sourced from the attribute the renderer sets,
  rather than re-derived from overlap counts. Out of scope for M3 (tool edit).
- The runtime missing-object placeholder path is currently only test-covered
  because `gen_scene_index.py` rejects unknown objects at build time. If the
  team wants a shipped scene to demonstrate the missing-object box, that
  requires a pipeline-validation change (out of M3 scope).
