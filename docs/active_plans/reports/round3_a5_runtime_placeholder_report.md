# Round 3 A5: runtime placeholder report

Status: complete. Empirical post-fix audit of runtime fallback-rect placeholders
across every base scene in `generated/scene_data.ts`, measured against the
B1-inferred 30-object baseline.

## Method

1. Built `dist/` via `bash build_github_pages.sh` (exit 0). Removed stale
   `test-results/round3_svg_barrel_regen_audit/barrel_after_regen.ts` first
   because it tripped `tsc` with TS2307 errors against retired asset modules
   that no longer exist under `generated/svg_assets/`. The file is gitignored
   and is the audit byproduct of a separate workstream, not part of the build
   contract.
2. Authored `tools_round3_a5/probe.ts`. It imports the real
   `renderScene` from `src/scene_runtime/render/scene.ts`, injects
   `SCENE_CATALOG` and `OBJECT_CATALOG` via the loader setters, and
   synthesizes a minimal `RuntimeWorld` whose `objectStates` are seeded with
   each object's declared default `state_fields`. This faithfully reproduces
   what the runtime would render when first mounting a scene for a student.
3. Bundled the probe as an IIFE with `esbuild` to `test-results/round3_a5_placeholder_report/probe.js`.
4. The walker `tools_round3_a5/walk.mjs` opens a Chromium page that loads the
   probe, then for each base scene calls `renderSceneByName` and counts groups
   that contain a `rect[data-render-fallback="true"]` child. The `#e8f5e9`
   fill is set by `src/scene_runtime/render/scene.ts` line 323 with the
   `data-render-fallback="true"` attribute on line 334; this attribute is the
   canonical structural marker for the green placeholder.
5. Screenshots saved to `test-results/round3_a5_placeholder_report/`.

The pre-existing `tests/playwright/test_base_scene_gallery.mjs` walker was
inspected but rejected for this audit: it constructs synthetic `#c8e6c9`
rectangles in `page.evaluate` rather than driving the real `renderScene`, so
it cannot observe `data-render-fallback`.

## Scope: base scenes audited

19 base scenes were discovered (extends_base null or absent). Of these, 9 use
the `placements`/`zones` schema and were measured. The remaining 10 are
`*_row_slot` variants that declare `rows`/`slots` instead of `placements`;
`renderScene` does not expand the row-slot layout (it iterates
`scene.placements` only) and they reported 0 placements. They are reported
below for completeness but contribute 0 to the fallback total.

## Per-scene placeholder count

| Scene                              | Placements | Fallbacks |
| ---------------------------------- | ---------: | --------: |
| bench_basic                        |          2 |         1 |
| cell_counter_basic                 |          2 |         2 |
| electrophoresis_bench              |         16 |         7 |
| heat_block_bench                   |          3 |         1 |
| hood_basic                         |          4 |         2 |
| imaging_bench                      |          2 |         1 |
| microscope_basic                   |          1 |         1 |
| sample_prep_bench                  |          5 |         2 |
| staining_bench                     |         10 |         2 |
| well_plate_96_zoom_check_scene     |          1 |         0 |
| bench_basic_row_slot               |          0 |         0 |
| cell_counter_basic_row_slot        |          0 |         0 |
| electrophoresis_bench_row_slot     |          0 |         0 |
| heat_block_bench_row_slot          |          0 |         0 |
| hood_basic_row_slot                |          0 |         0 |
| imaging_bench_row_slot             |          0 |         0 |
| microscope_basic_row_slot          |          0 |         0 |
| sample_prep_bench_row_slot         |          0 |         0 |
| staining_bench_row_slot            |          0 |         0 |

Totals across the 10 placement-bearing base scenes:

- placements rendered: 46
- fallback rects observed: 19

## Before vs after

- Before (B1 inferred baseline): 30 problem objects, each rendering as a
  `#e8f5e9` fallback rect in every base scene that referenced it. The B1
  baseline did not enumerate scene-by-scene placements, so the headline 30 is
  the count of problem object kinds, not of placement instances.
- After (this audit, empirical): 19 fallback placement instances across 9
  scenes (the 10 row-slot variants are not exercised by `renderScene`).

R2, R2-alt, and any in-flight A1B work materially reduce the visible
placeholder surface. Objects fixed in R2 (pbs_bottle, p10_micropipette,
p200_micropipette, micropipette) are no longer rendered as fallback in scenes
that resolve to their canonical idle asset, but the `p200_micropipette` and
`micropipette` placements in `electrophoresis_bench` and `sample_prep_bench`
still fall back. The visual_state for both resolves an
`asset_name: p200_micropipette_empty` but the SVG lookup returns no string,
so `renderScene` writes the fallback rect. This is an asset-registration gap,
not a state-resolution gap.

R2-alt fixed `well_plate_96` via the composite render adapter:
`well_plate_96_zoom_check_scene` correctly shows 0 fallbacks for its
`well_plate_96` placement (rendered via the well-plate-specific path that
bypasses the generic SVG insert).

## Keep / reject

KEEP R2, R2-alt, and any A1B follow-on. Empirical evidence:
`well_plate_96_zoom_check_scene`, the `staining_bench`, `electrophoresis_bench`,
and `sample_prep_bench` rows show pbs_bottle, well_plate_96, ddh2o_bottle,
running_buffer_10x_bottle, recycle_buffer_bottle, protein_ladder_tube,
coomassie_stain_bottle, destain_bottle, destain_waste_bottle, laemmli_4x_bottle,
bme_bottle, electrophoresis_tank, power_supply, running_buffer_1x_carboy,
serological_pipette, microwave, rocking_shaker, waste_container, lightbox,
heat_block, and aspirating_pipette all rendering as resolved SVG assets, not
fallback. Total of 27 placement instances render against a resolved SVG.

## Top 5 remaining offender objects

Ranked by recurrence across distinct scenes, then by severity inferred from
whether `data-asset` resolves a name (visual_state works, asset registration
is missing) versus null (visual_state did not resolve the seeded default
state). All names below are object_name values that still produce a
`data-render-fallback="true"` rect.

1. `staining_tray` (2 scenes: imaging_bench, staining_bench). Visual_state
   resolves `staining_tray` but `getAssetSvgString` returns nothing. Likely
   asset_registration gap or visual_state pointing at an asset_name that
   does not exist in `svg_manifest.ts`.
2. `microtube_rack_24` (2 scenes: heat_block_bench, sample_prep_bench).
   `data-asset` is null in both. Visual_state did not resolve the seeded
   default state. State resolution gap.
3. `p200_micropipette` (1 scene: electrophoresis_bench). Asset resolved as
   `p200_micropipette_empty` but SVG lookup empty. Asset_registration gap.
   Note: R2 listed `p200_micropipette` as fixed; the empty-variant asset
   (`p200_micropipette_empty`) is the actually-referenced visual_state
   output and remains unregistered.
4. `micropipette` (1 scene: sample_prep_bench). Same asset_name as
   p200_micropipette (`p200_micropipette_empty`); same root cause. R2 fix
   added the canonical pipette but the empty-variant asset is still missing.
5. `vortex` (1 scene: bench_basic). Asset resolves as `vortex_idle`; SVG
   lookup empty. Asset_registration gap. Companion to the bottle-family
   fixes in A1B.

Secondary cluster (each in one scene; would feed a Batch 3 follow-up):

- `cell_counter`, `counter_slide_cartridge` (cell_counter_basic), both with
  `data-asset` null - state resolution gap, not asset registration.
- `electrode_module` (electrophoresis_bench), resolves
  `electrode_module_without_cassette` but no SVG.
- `mini_protean_gel`, `gel_cassette`, `gel_comb`,
  `p10_gel_loading_tip_box`, `gel_opening_tool` (electrophoresis_bench),
  most with null `data-asset` - state resolution gap. `gel_cassette`
  resolves `gel_lane_empty` but no SVG.
- `kimwipe_pad` (staining_bench), null `data-asset`.
- `ethanol_bottle`, `hood_surface` (hood_basic). `ethanol_bottle` resolves
  `ethanol_bottle` but SVG lookup returns empty - registration gap.
- `microscope` (microscope_basic), resolves `microscope_dark` but no SVG.

## Recommended next fix

Batch 3 should treat asset-registration gaps and state-resolution gaps as
separate streams.

- Stream 3A (asset registration): register the missing SVG variants for the
  asset names that visual_states already point to. Target list:
  `p200_micropipette_empty`, `vortex_idle`, `staining_tray`,
  `electrode_module_without_cassette`, `gel_lane_empty`, `ethanol_bottle`,
  `hood_surface_dirty`, `microscope_dark`, `lightbox_off` if any future
  scene exposes the off variant. Each is a small SVG plus a manifest entry.
- Stream 3B (state resolution): fix the visual_state declarations for the
  9 objects that render with `data-asset` null
  (`microtube_rack_24`, `cell_counter`, `counter_slide_cartridge`,
  `p10_gel_loading_tip_box`, `gel_opening_tool`, `mini_protean_gel`,
  `gel_comb`, `kimwipe_pad`, anything else where seeded default state
  matches no `cases` entry). Either add a `default`/`fallback` case to each
  object's visual_state, or change the seeded default state to one that
  already has a case.
- Stream 3C (row-slot scene coverage): `renderScene` skips `rows`/`slots`
  scenes silently. Either expand them in the renderer or document the
  intentional separation. The gallery walker pre-existing in
  `tests/playwright/test_base_scene_gallery.mjs` already expands row-slot
  layouts on the synthetic side; that path could be lifted into the real
  renderer.

Stream 3A is the highest-leverage first move: it would eliminate 8 of the
19 fallback instances (the ones whose `data-asset` is non-null) by adding
~9 small SVG files and manifest entries, with no schema or YAML changes.

## Artifacts

- Report (this file): `docs/active_plans/reports/round3_a5_runtime_placeholder_report.md`
- Probe entry: `tools_round3_a5/probe.ts`
- Walker: `tools_round3_a5/walk.mjs`
- Bundled probe: `test-results/round3_a5_placeholder_report/probe.js`
- Per-scene screenshots: `test-results/round3_a5_placeholder_report/<scene>.png`
- Per-scene JSON: `test-results/round3_a5_placeholder_report/report.json`
- Browser console capture: `test-results/round3_a5_placeholder_report/console.log`
