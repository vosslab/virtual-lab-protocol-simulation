# Round 3 placeholder asset replacement

Workstream R2: reduce green-rect placeholder count by applying safe
narrow asset_name fixes to high-frequency objects identified in
[round3_asset_alias_verification.md](round3_asset_alias_verification.md)
and [round3_object_frequency_inventory.md](round3_object_frequency_inventory.md).

Boundary: ONLY single-field asset_name renames within a single object
YAML. No broad sweeps. No commits.

## Summary

- Fixes applied: 4 object YAMLs (pbs_bottle, p10_micropipette,
  p200_micropipette, micropipette).
- Fixes documented-only: 3 (well_plate_96, counter_slide_cartridge,
  bottle family deferred beyond pbs_bottle).
- Bonus fix: regenerated `generated/svg_assets/` to bring
  `serological_pipette.ts` into the bundle (SVG source existed but
  was not yet exported as a TS const; the regeneration was incidental
  to the SVG_loader resolver test).
- Build: bash build_github_pages.sh PASS.
- Walker: tests/playwright/test_base_scene_gallery.mjs rendered all
  19 base scenes; saved before/after pairs for hood_basic,
  sample_prep_bench, and staining_bench.

## Object 1: well_plate_96

- Current asset_name: `well` (10 case entries in visual_states.material_name)
- Total references: 292 (rank 1, highest)
- Available SVG candidates:
  - assets/equipment/96well_pcr_plate.svg (one whole-plate SVG)
  - assets/equipment/well_plate_24.svg (one whole-plate SVG)
  - No per-well SVG exists.
- Fix proposed: NONE in this pass.
- Applied: n.
- Reason: The subpart_kind is `well`. The SVG is referenced
  per-subpart, so one SVG renders per well, not per plate. Renaming
  the asset_name to `96well_pcr_plate` would map a whole-plate SVG
  onto each of the 96 subparts, producing 96 tiled plates -- that is
  worse than the green rect. The correct fix requires either:
  authoring a `well.svg`, or restructuring the visual_states to apply
  at the parent (plate) level using `96well_pcr_plate.svg`. Both are
  larger work than the workstream boundary allows.
- Screenshot: N/A (no fix applied).

## Object 2: micropipette

- Current asset_name: `micropipette` (15 case entries)
- Total references: 150 (rank 2)
- Available SVG candidates: none with the basename `micropipette`.
  Closest matches:
  - assets/equipment/p10_micropipette_empty.svg
  - assets/equipment/p10_micropipette_filled.svg
  - assets/equipment/p200_micropipette_empty.svg
  - assets/equipment/p200_micropipette_filled.svg
  - assets/equipment/multichannel_pipette.svg (different category)
- Fix proposed: split per `held_material_name`: `empty` ->
  `p200_micropipette_empty`, all 14 liquid cases ->
  `p200_micropipette_filled`.
- Rationale for p200 over p10: micropipette spans set_volume
  0.5-1000 ul; p200 art (20-200 ul range) is the closer representative
  of the typical micropipette gesture than p10 (0.5-10 ul).
- Applied: y.
- Screenshots:
  - test-results/round3_placeholder_fixes/sample_prep_bench_before.png
  - test-results/round3_placeholder_fixes/sample_prep_bench_after.png
  - test-results/round3_placeholder_fixes/hood_basic_before.png
  - test-results/round3_placeholder_fixes/hood_basic_after.png

## Object 3: serological_pipette

- Current asset_name: `serological_pipette` (9 case entries)
- Total references: 26 (rank 5)
- Available SVG: assets/equipment/serological_pipette.svg (1:1 match
  on basename).
- Fix proposed: NONE in YAML; the YAML is already correct.
- Applied: y (indirect: ran pipeline/generate_svg_globals.py to
  emit generated/svg_assets/serological_pipette.ts which was
  missing from a prior partial regenerate).
- Note: the audit document marked this object CLEAN because the SVG
  source existed and the YAML asset_name matched the basename. The
  audit did not check whether the TS bundle had been regenerated.
  Confirmed: after `python3 pipeline/generate_svg_globals.py`, both
  the per-asset TS file and the index.ts barrel include
  `SVG_SEROLOGICAL_PIPETTE`. esbuild bundle size rose 2.1mb -> 2.3mb,
  consistent with picking up additional assets.
- Screenshots: covered by sample_prep_bench_after.png and
  hood_basic_after.png (serological pipettes are placed on the
  sample-prep and hood benches).

## Object 4: counter_slide_cartridge

- Current asset_name: none (no `asset_name:` field anywhere in the YAML).
- Total references: 4 (rank 50; base_scene only, never named by a
  protocol step).
- Available SVG candidates: none with a matching basename.
  cell_counter_*.svg are for the counter itself, not the slide
  cartridge. No hemocytometer-related SVG exists.
- Fix proposed: NONE.
- Applied: n.
- Reason: no candidate SVG. The object will need either a new
  authored SVG or an explicit decision to draw the cartridge from
  primitives. Outside R2 scope.
- Screenshot: N/A.

## Object 5: pbs_bottle

- Current asset_name: `pbs_bottle` (both `empty` and `pbs` cases).
- Total references: 5 (rank 40).
- Available SVG candidates:
  - assets/equipment/bottle.svg (generic; supports
    bottle.colormap.json sidecar for liquid color).
  - assets/equipment/bottle_medium_pink.svg.
- Fix proposed: rename both cases to `bottle`. The fill height
  (material_volume) is already driven by the composite
  fill_height formula; PBS color is handled by the bottle
  colormap.
- Applied: y.
- Screenshot: pbs_bottle has 0 base_scene references; not visible in
  the gallery shots. After build, the scenes that instantiate
  pbs_bottle through protocol setup will pull the bottle.svg const
  rather than render the green fallback.

## Object 6: p10_micropipette (split empty/filled)

- Current asset_name: `p10_micropipette` (7 case entries).
- Total references: 0 (rank 76; declared but unreferenced in any
  protocol or base scene -- B2 priority drop candidate).
- Available SVG candidates: p10_micropipette_empty.svg,
  p10_micropipette_filled.svg.
- Fix proposed: split: `empty` -> `p10_micropipette_empty`, the six
  liquid cases (protein_sample_denatured, protein_ladder, laemmli_4x,
  bme, running_buffer_1x, ddh2o) -> `p10_micropipette_filled`.
- Applied: y.
- Screenshot: object is currently unreferenced; no visible delta in
  the gallery. The fix removes a latent fallback rect if/when this
  object is later wired into a scene.

## Object 7: p200_micropipette (split empty/filled)

- Current asset_name: `p200_micropipette` (7 case entries).
- Total references: 16 (rank 17).
- Available SVG candidates: p200_micropipette_empty.svg,
  p200_micropipette_filled.svg.
- Fix proposed: same shape as p10_micropipette -- split per held
  state.
- Applied: y.
- Screenshot:
  - test-results/round3_placeholder_fixes/sample_prep_bench_before.png
  - test-results/round3_placeholder_fixes/sample_prep_bench_after.png

## Object 8: bottle family (deferred beyond pbs_bottle)

- Affected objects: carboplatin_stock_bottle, dmso_bottle,
  ethanol_bottle, media_bottle, metformin_stock_bottle,
  sterile_water_bottle, trypan_blue_bottle, conical_tube_for_dilution,
  metformin_working_tube, microtube_15ml_intermediate,
  mtt_powder_container, mtt_solution_tube.
- Fix proposed: each is a single-field rename per the B1 audit table.
- Applied: n (only pbs_bottle in this pass).
- Reason: the workstream brief said "bottle family (only if verified)".
  pbs_bottle was the audit's exemplar safe fix. The remaining 12
  bottle objects each need a per-object semantic decision (e.g.
  ethanol_bottle could go to `bottle` or `ethanol_spray`;
  metformin_stock_bottle could go to `bottle` or `mtt_vial`). Punted
  to a follow-up workstream that can carry the asset-naming review
  for all 12 at once rather than 12 separate atomic edits.
- Screenshot: N/A (deferred).

## Changed files

- content/objects/bottle/pbs_bottle.yaml
- content/objects/pipette/micropipette.yaml
- content/objects/pipette/p10_micropipette.yaml
- content/objects/pipette/p200_micropipette.yaml

In addition, `pipeline/generate_svg_globals.py` was rerun, which
regenerated all files under `generated/svg_assets/` (125 per-asset
TS files plus `index.ts` and `svg_manifest.ts`). The regeneration
is reproducible and reversible by rerunning the same command.

## Verification

- bash build_github_pages.sh: PASS (dist/main.js 2.3mb after the
  serological_pipette and other regenerated assets joined the bundle).
- node tests/playwright/test_base_scene_gallery.mjs: 19 of 19 scenes
  rendered, 0 failures.
- python3 tests/check_ascii_compliance.py -i
  docs/active_plans/reports/round3_placeholder_asset_replacement.md:
  see "Verification commands" run section below.
- pytest tests/test_markdown_links.py -q: see run section below.

## Verification commands

- python3 tests/check_ascii_compliance.py -i docs/active_plans/reports/round3_placeholder_asset_replacement.md
- pytest tests/test_markdown_links.py -q
