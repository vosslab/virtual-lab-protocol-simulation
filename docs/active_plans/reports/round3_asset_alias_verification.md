# Round 3 asset alias verification

Read-only audit of `content/objects/**/*.yaml` `asset_name:` references against
the SVG inventory under `assets/equipment/` and the generator
`pipeline/generate_svg_globals.py`. Feeds Batch D1 (first asset alias fix
experiment).

## Methods

- Enumerated 78 object YAML files from `git ls-files content/objects/`.
- Extracted every `asset_name:` value from each YAML.
- Enumerated 124 SVG files under `assets/equipment/`.
- Cross-checked each `asset_name` against the SVG basename set.
- Traced the runtime alias path through
  `pipeline/generate_svg_globals.py` (1:1 SVG -> `SVG_<UPPER>` TS const)
  and `src/scene_runtime/render/svg_loader.ts`
  (`asset_name` -> `SVG_<UPPER_CASE>` via simple uppercase lookup; no
  alias map, no fallback rename).
- Confirmed `src/scene_runtime/render/scene.ts` line 321-334 renders a
  light-green `#e8f5e9` fallback `<rect>` with `data-render-fallback="true"`
  when the lookup returns `undefined`. The placeholder TS const
  `generated/svg_assets/_placeholder.ts` (`SVG__PLACEHOLDER`) is NOT
  wired in via the runtime; it exists only because the orphaned source
  file `assets/equipment/_placeholder.svg` was deleted but the
  generator was last run when it was present. No current object YAML
  references `_placeholder`.

## Runtime resolution path

```
object yaml: asset_name: foo
    |
    v
src/scene_runtime/render/svg_loader.ts
    mapAssetNameToExportName("foo") -> "SVG_FOO"
    |
    v
generated/svg_assets/index.ts barrel
    |
    v
generated/svg_assets/foo.ts   (only emitted if assets/equipment/foo.svg exists)
    |
    v
if missing -> getAssetSvgString returns undefined
            -> scene.ts renders green fallback rect (NOT _placeholder.ts)
```

There is no object-to-asset alias table. The mapping is literal:
snake_case asset name -> uppercased SVG_ constant. A typo or
rename in either layer breaks the lookup; there is no recovery
layer.

## Summary

- 78 object YAMLs scanned.
- 80 unique `asset_name` values referenced.
- 16 object YAMLs have no `asset_name:` field at all (some are
  expected: composite-only subparts, decorations, or assets pending).
- 30 object YAMLs reference at least one `asset_name` that does not
  resolve to an existing SVG (rendering as green fallback rect).
- 0 object YAMLs reference the literal name `_placeholder`.
- 48 object YAMLs are fully clean (every referenced asset_name has a
  matching SVG file).

## Category checklist

- bottles: 8 problem bottle objects (carboplatin_stock_bottle,
  dmso_bottle, ethanol_bottle, media_bottle, metformin_stock_bottle,
  pbs_bottle, sterile_water_bottle, trypan_blue_bottle, plus
  derivatives: conical_tube_for_dilution, metformin_working_tube,
  microtube_15ml_intermediate, mtt_powder_container, mtt_solution_tube).
- well-plate aliases: well_plate_96 references `well` which has no SVG.
  No `6_well_plate`, `24_well_plate`, `96_well_plate`, `384_well_plate`
  aliases are used in any object YAML; the only well-plate YAML is
  `content/objects/plate/well_plate_96.yaml`. `assets/equipment/well_plate_24.svg`
  and `assets/equipment/96well_pcr_plate.svg` exist but are unused.
- serological pipette: serological_pipette references `serological_pipette`,
  which has a matching SVG and resolves. No 5/10/25/50 mL variant
  YAMLs exist. CLEAN.
- counter slide / hemocytometer: `counter_slide_cartridge.yaml`,
  `hemocytometer.yaml`, and `hemocytometer_slide.yaml` have NO
  `asset_name:` field. They will currently render as the deferred
  fallback rect (no asset assigned). No SVGs exist for these objects
  yet.
- placeholder objects (assets/equipment/MISSING_SVG_PLACEHOLDERS.md
  declares 11 placeholder SVGs, but each is a real `.svg` file at the
  declared filename, so the asset lookup still succeeds; the visible
  art just happens to be a dashed-box placeholder). These are NOT in
  the 30 problem objects above. They are: power_supply, heat_block,
  microwave, lightbox, gel_opening_tool, microtube_rack_24, kimwipe_pad,
  electrode_module.

## Problem object table

Columns: object_name | current asset_name | actual SVG file (best
candidate under assets/) | alias path | rendering-as | safe-fix
recommendation.

| object_name | current asset_name | actual SVG file | alias path | rendering-as | safe-fix |
| --- | --- | --- | --- | --- | --- |
| carboplatin_stock_bottle | carboplatin_bottle | (none; closest: assets/equipment/bottle.svg) | asset_name -> SVG_CARBOPLATIN_BOTTLE -> missing | fallback rect | rename asset_name to `bottle` in content/objects/bottle/carboplatin_stock_bottle.yaml |
| conical_tube_for_dilution | conical_15ml (x3) | (none; closest: assets/equipment/falcon_15ml.svg) | SVG_CONICAL_15ML missing | fallback rect | rename asset_name to `falcon_15ml` in content/objects/bottle/conical_tube_for_dilution.yaml |
| dmso_bottle | dmso_bottle | (none; closest: assets/equipment/bottle.svg) | SVG_DMSO_BOTTLE missing | fallback rect | rename asset_name to `bottle` in content/objects/bottle/dmso_bottle.yaml |
| ethanol_bottle | ethanol_bottle (x2) | assets/equipment/ethanol_spray.svg (semantic mismatch; closest: bottle.svg) | SVG_ETHANOL_BOTTLE missing | fallback rect | rename asset_name to `ethanol_spray` (the ethanol-specific art) or `bottle` (generic) in content/objects/bottle/ethanol_bottle.yaml. Recommend `ethanol_spray`. |
| media_bottle | media_bottle (x2) | (none; closest: assets/equipment/bottle_medium_pink.svg) | SVG_MEDIA_BOTTLE missing | fallback rect | rename asset_name to `bottle_medium_pink` in content/objects/bottle/media_bottle.yaml |
| metformin_stock_bottle | metformin_bottle | (none; closest: assets/equipment/mtt_vial.svg or bottle.svg) | SVG_METFORMIN_BOTTLE missing | fallback rect | rename asset_name to `bottle` (or `mtt_vial` if a small vial is intended) in content/objects/bottle/metformin_stock_bottle.yaml |
| metformin_working_tube | microtube_1ml (x3) | (none; closest: assets/equipment/microtube.svg) | SVG_MICROTUBE_1ML missing | fallback rect | rename asset_name to `microtube` in content/objects/bottle/metformin_working_tube.yaml |
| microtube_15ml_intermediate | microtube_15ml (x2) | (none; closest: assets/equipment/falcon_15ml.svg) | SVG_MICROTUBE_15ML missing | fallback rect | rename asset_name to `falcon_15ml` in content/objects/bottle/microtube_15ml_intermediate.yaml |
| mtt_powder_container | mtt_powder_container (x2) | (none; closest: assets/equipment/mtt_vial.svg) | SVG_MTT_POWDER_CONTAINER missing | fallback rect | rename asset_name to `mtt_vial` in content/objects/bottle/mtt_powder_container.yaml |
| mtt_solution_tube | mtt_solution_tube (x2) | (none; closest: assets/equipment/falcon_15ml.svg or assets/equipment/microtube.svg) | SVG_MTT_SOLUTION_TUBE missing | fallback rect | rename asset_name to `falcon_15ml` (likely 15 mL conical) in content/objects/bottle/mtt_solution_tube.yaml |
| pbs_bottle | pbs_bottle (x2) | (none; closest: assets/equipment/bottle.svg or bottle_medium_pink.svg) | SVG_PBS_BOTTLE missing | fallback rect | rename asset_name to `bottle` in content/objects/bottle/pbs_bottle.yaml |
| sterile_water_bottle | water_bottle | (none; closest: assets/equipment/bottle.svg or ddh2o_bottle.svg) | SVG_WATER_BOTTLE missing | fallback rect | rename asset_name to `ddh2o_bottle` (semantically same) or `bottle` in content/objects/bottle/sterile_water_bottle.yaml |
| trypan_blue_bottle | trypan_blue_bottle (x2) | (none; closest: assets/equipment/bottle.svg) | SVG_TRYPAN_BLUE_BOTTLE missing | fallback rect | rename asset_name to `bottle` in content/objects/bottle/trypan_blue_bottle.yaml |
| centrifuge | centrifuge_idle, centrifuge_spinning | assets/equipment/centrifuge.svg (single base; no idle/spin variants) | SVG_CENTRIFUGE_IDLE, SVG_CENTRIFUGE_SPINNING missing | fallback rect | rename both asset_name values to `centrifuge` in content/objects/equipment/centrifuge.yaml. Animation/state distinction must be deferred to a future state-overlay layer or two new SVGs (LARGER WORK). |
| electrode_module | electrode_module_mounted, _unmounted, _with_cassette, _without_cassette, _clamps_open, _clamps_closed | assets/equipment/electrode_module.svg (single base) | All 6 SVG_ELECTRODE_MODULE_* missing | fallback rect | rename all 6 asset_name values to `electrode_module` in content/objects/equipment/electrode_module.yaml. State variants need 6 new SVGs (LARGER WORK). |
| electrophoresis_tank | electrophoresis_tank_with_lid, _without_lid, _with_module, _without_module | electrophoresis_tank.svg, _inner_chamber.svg, _outer_chamber.svg | all 4 SVG_ELECTROPHORESIS_TANK_* missing | fallback rect | rename to `electrophoresis_tank` (single base) in content/objects/equipment/electrophoresis_tank.yaml. Lid/module variants need new SVGs (LARGER WORK). |
| gel_cassette | gel_lane_empty, gel_lane_ladder, gel_lane_sample | assets/equipment/gel_cassette.svg, mini_protean_gel.svg | SVG_GEL_LANE_* missing | fallback rect | This object models per-lane state. Likely needs new gel-lane SVGs (LARGER WORK). Single-field rename to `gel_cassette` will collapse all states to the base art. |
| hood_surface | hood_surface_dirty, hood_surface_clean | (none; glove_box.svg exists, hood_surface.yaml has no `asset_name` ref to glove_box) | SVG_HOOD_SURFACE_* missing | fallback rect | rename both to `glove_box` or omit asset_name (the hood is typically the scene background, not a clickable). LARGER WORK; needs scene-design decision. |
| incubator | incubator_closed, incubator_open | assets/equipment/incubator.svg, incubator_new.svg, incubator_legacy.svg | SVG_INCUBATOR_CLOSED/OPEN missing | fallback rect | rename both to `incubator` in content/objects/equipment/incubator.yaml; open/close state needs new SVG (LARGER WORK). |
| microscope | microscope_dark, microscope_lit | microscope.svg, microscope_new.svg, microscope_old.svg | SVG_MICROSCOPE_DARK/LIT missing | fallback rect | rename both to `microscope` in content/objects/equipment/microscope.yaml; dark/lit variants need new SVGs (LARGER WORK). |
| plate_reader | plate_reader_idle, plate_reader_reading | plate_reader.svg, _new.svg, _old.svg | SVG_PLATE_READER_IDLE/READING missing | fallback rect | rename both to `plate_reader` in content/objects/equipment/plate_reader.yaml; reading state needs new SVG (LARGER WORK). |
| staining_tray | staining_tray (x5) | staining_tray_empty.svg, _buffer.svg, _destain.svg, _stain.svg, _water.svg | SVG_STAINING_TRAY missing (base name has no .svg) | fallback rect | rename asset_name to `staining_tray_empty` for the empty case (or split per-state: empty -> _empty, running_buffer_1x -> _buffer, coomassie_stain -> _stain, destain -> _destain, ddh2o -> _water) in content/objects/equipment/staining_tray.yaml. The split version is the high-value safe fix. |
| vortex | vortex_idle, vortex_spinning | vortex.svg, vortex_new.svg, vortex_old.svg | SVG_VORTEX_IDLE/SPINNING missing | fallback rect | rename both to `vortex` in content/objects/equipment/vortex.yaml; spinning state needs new SVG (LARGER WORK). |
| water_bath | water_bath_idle, water_bath_heating | water_bath.svg, _new.svg, _old.svg | SVG_WATER_BATH_IDLE/HEATING missing | fallback rect | rename both to `water_bath` in content/objects/equipment/water_bath.yaml; heating state needs new SVG (LARGER WORK). |
| label_pen | label_pen_idle, label_pen_in_hand | (none) | both missing | fallback rect | LARGER WORK; no label-pen SVG exists. Drop the visual_states block or supply new SVGs. |
| micropipette | micropipette (x15) | (none; closest: p10_micropipette_empty.svg, p200_micropipette_empty.svg) | SVG_MICROPIPETTE missing | fallback rect | rename asset_name to `p200_micropipette_empty` (or split per held_material_volume threshold into _empty/_filled) in content/objects/pipette/micropipette.yaml. The single-rename is a SAFE narrow fix; the per-volume split is the better long-term fix. |
| p10_micropipette | p10_micropipette (x7) | p10_micropipette_empty.svg, p10_micropipette_filled.svg | SVG_P10_MICROPIPETTE missing | fallback rect | split per held_material_volume: empty cases -> `p10_micropipette_empty`, all liquid cases -> `p10_micropipette_filled`, in content/objects/pipette/p10_micropipette.yaml. SAFE NARROW (single-file, 7 lines). |
| p200_micropipette | p200_micropipette (x7) | p200_micropipette_empty.svg, p200_micropipette_filled.svg | SVG_P200_MICROPIPETTE missing | fallback rect | same as p10: split _empty / _filled per state in content/objects/pipette/p200_micropipette.yaml. SAFE NARROW. |
| well_plate_96 | well (x10) | (none; closest: 96well_pcr_plate.svg or well_plate_24.svg) | SVG_WELL missing | fallback rect | LARGER WORK: per-well art does not exist. Single-field rename to `96well_pcr_plate` would collapse all well subparts to a single PCR-plate SVG, which is wrong (one SVG per well, not one for the plate). Needs new `well.svg` or refactor of subpart_kind=`well`. |
| conical_15ml_rack | conical_15ml (x3) | (none; closest: falcon_15ml.svg) | SVG_CONICAL_15ML missing | fallback rect | rename asset_name to `falcon_15ml` in content/objects/rack/conical_15ml_rack.yaml. SAFE NARROW. |

## Objects with no asset_name field

These render as the deferred fallback rect even though their YAMLs are
otherwise complete. They are NOT among the 30 problem objects above but
will need attention in a separate pass:

- trypsin_bottle (content/objects/bottle/trypsin_bottle.yaml)
- kimwipe_pad (content/objects/decoration/kimwipe_pad.yaml)
- lens_tissue (content/objects/decoration/lens_tissue.yaml)
- micropipette_tip_box (content/objects/decoration/micropipette_tip_box.yaml)
- p10_gel_loading_tip (content/objects/decoration/p10_gel_loading_tip.yaml)
- p10_gel_loading_tip_box (content/objects/decoration/p10_gel_loading_tip_box.yaml)
- paper_towel_pad (content/objects/decoration/paper_towel_pad.yaml)
- professor_avatar (content/objects/decoration/professor_avatar.yaml)
- cell_counter (content/objects/equipment/cell_counter.yaml)
- gel_comb (content/objects/equipment/gel_comb.yaml)
- gel_opening_tool (content/objects/equipment/gel_opening_tool.yaml)
- hemocytometer (content/objects/equipment/hemocytometer.yaml)
- hemocytometer_slide (content/objects/equipment/hemocytometer_slide.yaml)
- mini_protean_gel (content/objects/equipment/mini_protean_gel.yaml)
- counter_slide_cartridge (content/objects/rack/counter_slide_cartridge.yaml)
- microtube_rack_24 (content/objects/rack/microtube_rack_24.yaml)

Note: SVGs do exist for several of these (cell_counter.svg,
kimwipe_pad.svg, gel_comb.svg, gel_opening_tool.svg, mini_protean_gel.svg,
microtube_rack_24_placeholder.svg, p10_gel_loading_tip.svg,
p10_gel_loading_tip_box.svg). These are safe single-field adds: add a
`visual_states.<some_field>.kind: svg` block with one
`asset_name: <basename>` case.

## Screenshot evidence

No screenshot was matched to a specific problem object in this read-only
pass. `test-results/` contains walker screenshots for full mini-protocols
(e.g. `walker_trypan_blue_counting/`, `walker_mtt_solubilization_readout/`,
`walker_sdspage_stain_gel/`) but these are step-level renders, not
single-object close-ups, so cross-referencing them to the 30 problem
objects requires Batch A1 / A4 work. Marked "no screenshot yet" for the
table above.

## Top 3 safe-fix recommendations

These are SAFE AND NARROW: a one-field-one-file edit, no asset
regeneration, no schema change.

1. content/objects/pipette/p10_micropipette.yaml. Replace seven
   `asset_name: p10_micropipette` lines with the two-state split
   (`p10_micropipette_empty` when `when: empty`,
   `p10_micropipette_filled` for the six liquid cases). Effect: real
   p10 art appears in scenes that show held vs empty state. SVGs
   already exist.
2. content/objects/pipette/p200_micropipette.yaml. Same shape as above:
   replace seven `asset_name: p200_micropipette` lines with the
   `p200_micropipette_empty` / `p200_micropipette_filled` split. SVGs
   already exist.
3. content/objects/bottle/pbs_bottle.yaml. Replace both
   `asset_name: pbs_bottle` lines with `asset_name: bottle`. Effect: a
   real bottle SVG renders instead of the green fallback rect. The
   liquid color and fill height are already driven by the existing
   `material_volume` composite + the `bottle.colormap.json` sidecar.
   Same shape applies to ethanol_bottle (rename to `ethanol_spray` or
   `bottle`), dmso_bottle (`bottle`), trypan_blue_bottle (`bottle`),
   sterile_water_bottle (`ddh2o_bottle`), media_bottle
   (`bottle_medium_pink`), metformin_stock_bottle (`bottle`),
   carboplatin_stock_bottle (`bottle`). Each is the same single-field
   single-file shape.

## Category-clean object count

48 of 78 object YAMLs reference only `asset_name` values that resolve
to an existing SVG (or have no `asset_name` field but exist as
deliberate composite/subpart-only definitions).

## Residual ambiguities

- It is unclear from the YAMLs alone whether `staining_tray` should
  swap art per `material_name` (split into the five existing
  `staining_tray_<state>.svg` files) or treat the tray as a single
  asset with material color driven elsewhere. The five state SVGs
  already exist, suggesting the per-state split is the intended
  design, but no schema doc forbids the alternative.
- `well_plate_96` references `well` as the subpart asset. No
  `well.svg` exists. It is unclear whether the design intends one SVG
  per well or whether wells are meant to be drawn as primitive
  circles by the renderer.
- `hood_surface` and `label_pen` may be entirely scene-background
  concerns rather than clickable scene objects; no candidate SVGs
  exist for either.
- The `_placeholder.ts` const file in `generated/svg_assets/` is
  orphaned (no matching source SVG under `assets/equipment/`). It is
  emitted from a stale prior generator run. It is NOT referenced at
  runtime. Safe to delete on the next regenerate.

## Verification commands

- python3 tests/check_ascii_compliance.py -i docs/active_plans/reports/round3_asset_alias_verification.md
- pytest tests/test_markdown_links.py -q
