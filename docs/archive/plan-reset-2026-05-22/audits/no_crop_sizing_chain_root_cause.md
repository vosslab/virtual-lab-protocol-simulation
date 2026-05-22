# No-crop sizing chain root-cause audit

Audit pass: read-only, no code/YAML/CSS edits.
Source HEAD: 8795d25 (working tree, Strategy C hybrid CSS applied in `src/style.css`).
Evidence corpus: `test-results/no_crop_round3_static_template_repair/strategy_c/`
(`visual_audit.md`, `visual_audit.json`, `sizing_manifest.json`, `crops_summary.txt`).

## Methodology

### Three Round 3 root-cause questions

This audit answers, for each clipped object, the three Round 3 questions that
the user opened:

1. Why did the real-world-dimension sizing model fail to keep this asset
   inside its parent placement card?
2. Which layer of the sizing chain produced the first failure -- asset
   resolution, SVG viewBox, ASSET_SPECS default, object YAML
   `display_width_cm`, scene placement `width_scale`, zone / layout, or
   renderer CSS?
3. What is the smallest fix that would resolve the failure without
   introducing a new escape hatch?

### User-supplied 7-step fix priority chain

The audit walks each clipped object through these layers in order. The
"first-failing step" is the highest-priority layer whose value or rule is
demonstrably wrong for the object. Once a step fails, lower-priority steps
are not considered the primary cause even if they also drift; downstream
drift is a symptom of the upstream gap.

1. Asset mapping / SVG existence -- does the loader resolve the asset name
   to a real SVG? `src/scene_runtime/render/svg_loader.ts:25-36` derives
   the export name as `SVG_<UPPER>` and falls through to `undefined` if
   absent.
2. SVG viewBox correctness -- does the viewBox match the real-world
   aspect ratio of the depicted object?
   `docs/specs/SVG_PIPELINE.md:112` (layout engine reads viewBox for
   aspect ratios) and `docs/specs/LAYOUT_ENGINE.md:200-201`
   (`getAssetAspectRatio` derives height from viewBox).
3. `ASSET_SPECS.default_width` -- baseline width in scene-percent units.
   `src/asset_specs.ts:12-45` carries the table;
   `docs/specs/LAYOUT_ENGINE.md:186,196,261,583` document the contract.
4. Object YAML `display_width_cm` -- per-object real-world width.
   `docs/specs/SCALING_MODEL.md:30-50` defines the formula
   `width_scale = (display_width_cm * px_per_cm) / (default_width * px_per_scene_percent)`.
   `docs/specs/OBJECT_YAML_FORMAT.md:464-470` declares
   `layout.default_width` as the only required layout field.
5. Item `width_scale` -- per-scene multiplier.
   `docs/specs/LAYOUT_ENGINE.md:173,185,262,584`;
   `docs/specs/SCENE_YAML_FORMAT.md:201-202,216,240`.
6. Zone placement / overload -- zone geometry, row membership,
   `MIN_SCALE` floor. `docs/specs/LAYOUT_ENGINE.md:580-589` (tune zone
   geometry first); `LAYOUT_ENGINE.md:623-624` (overload symptom).
7. Renderer CSS preserving aspect ratio -- `object-fit: contain`,
   `preserveAspectRatio="xMidYMid meet"`, no `overflow: hidden` clipping.
   `docs/specs/SVG_PIPELINE.md:294,303-314`;
   `docs/specs/LAYOUT_ENGINE.md:650-674`.

### What counts as a clipped object

The crops_summary.txt and visual_audit.md Sub-check e ("SVG Clipped by
Parent Overflow (HARD FAIL)") rows are the canonical list for this
audit. Aspect-distortion-only flags (Sub-check f) are noted in the
"smallest fix" column when they share a root cause with a clipped peer
but are not double-counted as clipped objects.

### Failing-layer assignment rules

- "step 1 asset OK? = NO" when `generated/svg_assets/` has no file
  whose name matches the asset name. Several semantic bottle names
  (e.g. `dmso_stock_bottle`, `pbs_buffer_bottle`, `stock_bottle`,
  `drug_stock_bottle`, `ddh2o_spray_bottle`) and several specific
  instruments (`p1000_pipette`, `serological_pipette`, `well_plate_96`,
  `counter_slide_cartridge`) have no on-disk SVG yet still render. The
  loader is therefore hitting an alias / fallback that maps many
  semantic names to a single generic bottle SVG, producing the
  recurring natural dimensions 54 x 150, 69 x 150, 17 x 150, 230 x 150
  observed in `sizing_manifest.json`. This is treated as a step 1
  failure (asset mapping leaks generic geometry to specific kinds).
- "step 2 viewBox OK? = NO" when the natural aspect ratio in
  `sizing_manifest.json` is implausible for the real instrument (e.g.
  `serological_pipette` natural 17 x 150 -> aspect 0.113 when the asset
  is rendered into a roughly 0.40 card, or `p1000_pipette` natural
  17 x 150 placed in a 48 x 73 card -> rendered aspect 0.66 with 480%
  mismatch).
- "step 3 default_width OK? = NO" when `ASSET_SPECS` either lacks an
  entry for the asset (forcing a fallback) or the entry's
  `defaultWidth` value contradicts the layout-time scale_factor
  observed in `sizing_manifest.json`.
- "step 4 display_width_cm OK? = NO" when the per-object cm value
  cannot be reconciled with the observed rendered width given the
  scene `px_per_cm` and the asset `default_width`.
- "step 5 width_scale OK? = NO" when the scene-level placement
  override produces an asymmetric scale_factor_x vs scale_factor_y
  (visible in `sizing_manifest.json` as `scale_factor_uniform: false`
  with > 5% spread).
- "step 6 zone OK? = NO" when `visual_audit.md` reports
  "Region Overflow" for the zone containing the object or when
  multiple placements in the same row each show clipping.
- "step 7 renderer CSS OK? = NO" when the audit message is
  "SVG cropped by parent overflow on bottom" (or top) AND the natural
  vs rendered aspect mismatch is < 5%. Below 5%, the asset is being
  drawn at near-correct shape but the card is shorter than the asset;
  this is a renderer-CSS / parent `overflow: hidden` symptom rather
  than a sizing-chain symptom.

## Per-object root-cause table

Legend: OK = layer holds; NO = layer fails; - = not reached (earlier
step already failed). "scale_factor_uniform = false" with >5% spread is
read from `sizing_manifest.json`.

| scene                         | object_name                                                       | step 1 asset OK? | step 2 viewBox OK?                                                                                             | step 3 ASSET_SPECS.default_width?                                                                                          | step 4 display_width_cm?                                                                          | step 5 width_scale?                                   | step 6 zone OK?                                                   | step 7 renderer CSS OK?                                                 | first-failing step                                                                                        | smallest fix                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bench_basic                   | right_tool_p200_micropipette (p200_micropipette)                  | OK               | NO (nat 0.227, rendered 0.262, 15.6% mismatch; rendered area 187% of natural -> upscaling into too-short card) | OK (ASSET_SPECS has `multichannel_pipette: 5`; `p200_micropipette` not in table -- falls back)                             | NO (cm value drives 50 x 191 box for a 34 x 150 asset; height exceeds card)                       | NO (scale_x=1.471, scale_y=1.272, non-uniform)        | OK                                                                | OK (mismatch > 5%, so this is sizing-chain not pure CSS)                | step 3 (no `p200_micropipette` entry in `ASSET_SPECS`)                                                    | Add `p200_micropipette: { defaultWidth: 3, labelWidth: 5, anchorYOffset: 0 }` to `src/asset_specs.ts` and let the cm formula in `docs/specs/SCALING_MODEL.md:42-50` recompute width_scale.                                     |
| cell_counter_basic            | instrument_main_cell_counter (cell_counter)                       | OK               | NO (natural 1.413; rendered 1.143; 19.1% mismatch; "artwork extends outside card on bottom")                   | OK in table (`cell_counter: defaultWidth 12, widthScale 1.0`) but value too small for instrument footprint                 | NO                                                                                                | NO (160 x 140 placed where viewBox demands 160 x 113) | OK                                                                | NO (parent card is shorter than instrument; "overflow on bottom")       | step 3 (`cell_counter` `defaultWidth: 12` too small for 1.413 aspect at 160 px; card height insufficient) | Raise `cell_counter.defaultWidth` to ~14-16, or lower `widthScale` so rendered_width \* 1/aspect fits the card. Do not patch the card with `overflow: hidden`.                                                                 |
| crowded_bench_dense           | front_microwave (microwave)                                       | OK               | OK (rendered aspect 1.00 == natural 1.00, 0% mismatch)                                                         | NO (`microwave` not in `ASSET_SPECS`)                                                                                      | NO (rendered area 215% of natural -> upscaled)                                                    | NO (scale_x=scale_y=1.467; uniform but oversize)      | NO (zone `front_tools` overflow h=34px)                           | OK (aspect fine; clipping is zone+sizing, not CSS)                      | step 3 (no `microwave` entry in `ASSET_SPECS`)                                                            | Add `microwave` and `rocking_shaker` to `ASSET_SPECS` with realistic `defaultWidth`; combined with zone capacity these stop overflowing `front_tools`.                                                                         |
| crowded_bench_dense           | front_rocking_shaker (rocking_shaker)                             | OK               | OK (0.7% mismatch)                                                                                             | NO (not in `ASSET_SPECS`)                                                                                                  | NO (rendered area 302% of natural)                                                                | NO (1.746 x vs 1.733 y)                               | NO (`front_tools` row overflow)                                   | OK                                                                      | step 3 (no `rocking_shaker` in `ASSET_SPECS`)                                                             | Same as above: add `rocking_shaker` to `ASSET_SPECS`; the cm formula then yields a sensible default and zone clearance.                                                                                                        |
| crowded_bench_dense           | front_waste_container (waste_container)                           | OK               | OK (4.1% mismatch, under 5%)                                                                                   | OK (`waste_container: defaultWidth: 7`)                                                                                    | OK                                                                                                | OK (scale near 1.0)                                   | NO (`front_tools` overflow shared with microwave + shaker)        | NO (clipping with < 5% aspect deviation = parent overflow on bottom)    | step 6 (zone overload in `front_tools`)                                                                   | Move `front_waste_container` to a less crowded row (or split `front_tools` into tab stops). `LAYOUT_ENGINE.md:580-589` (tune zone geometry first).                                                                             |
| drug_dilution_plate_workspace | tool_p200 (p200_micropipette)                                     | OK               | NO (15.6% aspect mismatch, 187% area)                                                                          | NO (no `p200_micropipette` entry)                                                                                          | NO                                                                                                | NO                                                    | OK                                                                | OK                                                                      | step 3 (same as bench_basic)                                                                              | Single fix to `ASSET_SPECS.p200_micropipette` resolves all four `p200_micropipette` clippings across four scenes.                                                                                                              |
| drug_dilution_plate_workspace | waste_container (waste_container)                                 | OK               | OK (4.1%)                                                                                                      | OK                                                                                                                         | OK                                                                                                | OK                                                    | OK                                                                | NO ("overflow on bottom" with < 5% aspect deviation; card is too short) | step 7 (renderer CSS / parent card height)                                                                | Verify Strategy C `.object-graphic` parent allows the asset's intrinsic height to extend; remove any residual `overflow: hidden` in this scene's card. `SVG_PIPELINE.md:294,313`.                                              |
| drug_dilution_workspace_dense | tool_p200_micropipette (p200_micropipette)                        | OK               | NO (15.6%)                                                                                                     | NO (missing entry)                                                                                                         | NO                                                                                                | NO                                                    | OK                                                                | OK                                                                      | step 3                                                                                                    | Same `ASSET_SPECS` add.                                                                                                                                                                                                        |
| drug_dilution_workspace_dense | tool_tip_box (tip_box)                                            | OK               | NO (natural 1.533; rendered 0.833; 45.7% mismatch; rendered area only 8.7% of natural -> forced shrink)        | OK (`tip_box: defaultWidth 9`) but inadequate given natural aspect                                                         | NO (`display_width_cm` produces 50 x 60 card for a 230 x 150 asset -> severe shrink + distortion) | NO (scale_x=0.217, scale_y=0.4)                       | OK                                                                | OK                                                                      | step 4 (object YAML cm value, plus step 5 width_scale producing non-uniform fit)                          | Raise `tip_box` `display_width_cm` so layout produces a card at least 230:150 aspect; OR set per-placement `width_scale` to honour the wider tip_box footprint. Same fix transfers to drug_dilution_plate_workspace.tool_tips. |
| drug_dilution_workspace_dense | waste_container_main (waste_container)                            | OK               | OK (4.1%)                                                                                                      | OK                                                                                                                         | OK                                                                                                | OK                                                    | OK                                                                | NO                                                                      | step 7                                                                                                    | Same renderer-CSS fix as drug_dilution_plate_workspace.waste_container.                                                                                                                                                        |
| drug_dilution_workspace_dense | waste_tray_secondary (waste_tray)                                 | OK               | NO (natural 1.4; rendered 0.818; 41.6% mismatch)                                                               | OK (`waste_tray: defaultWidth: 12`) but inadequate for landscape aspect                                                    | NO                                                                                                | NO (scale_x=0.429, scale_y=0.733)                     | OK                                                                | OK                                                                      | step 2 / step 4 (viewBox honoured but card is portrait while asset is landscape; cm value misaligned)     | Reconcile `waste_tray` `display_width_cm` to its true landscape footprint (210 x 150 natural -> wider card needed); or place in a row whose card height matches a landscape aspect.                                            |
| electrophoresis_bench         | right_tool_area_p200_micropipette (p200_micropipette)             | OK               | NO (61.7% mismatch this scene; rendered 73 x 200 with natural aspect 0.227)                                    | NO (no entry)                                                                                                              | NO                                                                                                | NO (scale_x=2.156, scale_y=1.333)                     | NO (`front_tools` overflow h=40px)                                | OK                                                                      | step 3 (cascades into step 5 and 6)                                                                       | Same single `ASSET_SPECS` add.                                                                                                                                                                                                 |
| electrophoresis_bench         | right_tool_area_p10_gel_loading_tip_box (p10_gel_loading_tip_box) | OK               | NO (28.6% mismatch; rendered 66 x 60 from 230 x 150 natural)                                                   | NO (no `p10_gel_loading_tip_box` entry; only `tip_box`)                                                                    | NO                                                                                                | NO                                                    | NO                                                                | OK                                                                      | step 3 (also clear step 2 viewBox mismatch)                                                               | Add `p10_gel_loading_tip_box` to `ASSET_SPECS` with landscape-honouring `defaultWidth`.                                                                                                                                        |
| electrophoresis_bench         | rear_left_protein_ladder_tube (protein_ladder_tube)               | OK               | OK (4.4% mismatch, under tolerance)                                                                            | NO (not in `ASSET_SPECS`)                                                                                                  | indeterminate                                                                                     | indeterminate                                         | NO (row stacked next to electrophoresis_tank which overflows top) | NO                                                                      | step 6 (zone overload)                                                                                    | Move ladder tube to a rear shelf row with a taller baseline; or reduce neighbouring item widths so the row has clearance.                                                                                                      |
| electrophoresis_bench         | rear_right_gel_opening_tool (gel_opening_tool)                    | OK               | OK (0% mismatch; uniform scale 0.533)                                                                          | NO (not in `ASSET_SPECS`; forced shrink to 28.4% of natural)                                                               | NO                                                                                                | OK (uniform)                                          | NO (row overflow)                                                 | OK                                                                      | step 3 (no entry forces fallback shrink)                                                                  | Add `gel_opening_tool` to `ASSET_SPECS`.                                                                                                                                                                                       |
| electrophoresis_bench         | front_left_mini_protean_gel (mini_protean_gel)                    | OK               | OK (0.2% mismatch)                                                                                             | NO (not in `ASSET_SPECS`; rendered area 269% of natural)                                                                   | NO                                                                                                | NO (1.642 x vs 1.639 y)                               | NO (`front_tools` zone overflow shared)                           | OK                                                                      | step 3 (no entry)                                                                                         | Add `mini_protean_gel` to `ASSET_SPECS`; recompute `front_tools` row capacity.                                                                                                                                                 |
| electrophoresis_bench         | front_right_gel_comb (gel_comb)                                   | OK               | OK (1.4% mismatch)                                                                                             | NO (not in `ASSET_SPECS`; rendered 17.1% of natural -> forced shrink)                                                      | NO                                                                                                | OK (0.416 x vs 0.41 y)                                | NO (zone overflow)                                                | OK                                                                      | step 3 (no entry)                                                                                         | Add `gel_comb` to `ASSET_SPECS`.                                                                                                                                                                                               |
| microscope_basic              | instrument_main_microscope (microscope)                           | OK               | OK (1.1% mismatch)                                                                                             | OK in table (`microscope: defaultWidth 8, widthScale 0.9`) but value too small for 0.76 portrait aspect at requested width | NO (rendered area 194.8% of natural; "artwork extends outside card on bottom")                    | NO (1.404 x vs 1.388 y)                               | OK                                                                | NO ("overflow on bottom")                                               | step 3 / step 4 (`microscope` defaultWidth=8 produces a card whose height clips the body)                 | Raise `microscope.defaultWidth` (e.g. 10) or trim `widthScale`; or lift card minHeight so the bottom of the asset is not clipped. `LAYOUT_ENGINE.md:583-584`.                                                                  |
| staining_bench                | right_tool_area_microwave (microwave)                             | OK               | OK (0% mismatch)                                                                                               | NO (no `microwave` entry)                                                                                                  | NO (rendered area 215% of natural)                                                                | OK (uniform)                                          | NO (`front_tools` overflow h=34px)                                | OK                                                                      | step 3 (cascades into zone overload)                                                                      | Add `microwave` to `ASSET_SPECS`. Shared fix with `crowded_bench_dense`.                                                                                                                                                       |
| staining_bench                | right_tool_area_rocking_shaker (rocking_shaker)                   | OK               | OK (0.7% mismatch)                                                                                             | NO (no entry)                                                                                                              | NO (rendered area 302%)                                                                           | NO                                                    | NO (same `front_tools` overflow)                                  | OK                                                                      | step 3                                                                                                    | Add `rocking_shaker` to `ASSET_SPECS`. Shared fix.                                                                                                                                                                             |

### Aspect-distortion-only objects in the eight target scenes

These are not flagged in Sub-check e but appear in Sub-check f. They are
listed for context because they share root causes with the clipped peers
above.

- All `*_bottle` rear-shelf placements (coomassie_stain_bottle,
  destain_bottle, coomassie_recycle_bottle, destain_waste_bottle,
  laemmli_4x_bottle, bme_bottle, dmso_stock_bottle, drug_stock_bottle,
  pbs_buffer_bottle, ddh2o_bottle, ethanol_bottle, recycle_buffer_bottle,
  running_buffer_10x_bottle, ddh2o_spray_bottle, stock_bottle) show
  natural aspect 0.34-0.46 with rendered aspect 0.37-0.49 -- a
  systematic 4-8% spread. Per `sizing_manifest.json` the scale_factors
  are non-uniform (e.g. 1.667 x vs 1.585 y). Combined with the on-disk
  audit showing no SVG file for several of these names
  (`dmso_stock_bottle`, `drug_stock_bottle`, `pbs_buffer_bottle`,
  `stock_bottle`, `ddh2o_spray_bottle`), the most likely cause is a
  shared bottle-template SVG resolved via an alias map whose viewBox
  is fixed near 54 x 150 / 69 x 150, with per-card width chosen by a
  step-5 `width_scale` that does not honour the viewBox aspect
  exactly. First-failing step: step 1 (asset mapping leaks one viewBox
  to many semantic kinds), with step 5 as the proximate scale source.
- `well_plate_96` (bench_basic, drug_dilution_plate_workspace,
  drug_dilution_workspace_dense, well_plate_96_zoom): natural 1.409,
  rendered 1.333 (5.3%) and 1.5 (6.5%). No `well_plate_96.ts` on disk;
  loader almost certainly aliases to a generic plate viewBox. Same step
  1 cause as bottles.
- `tube_rack_24` in `drug_dilution_workspace_dense` shows natural 1.6
  vs rendered 0.875 (45.3%) -- a clear viewBox vs card mismatch (step 2) combined with no `tube_rack_24.ts` on disk (only
  `microtube_rack_24_placeholder.ts`); step 1.
- `drug_vial_rack` (56.8%), `counter_slide_cartridge` (37.1%),
  `serological_pipette` (252.9%), `p1000_pipette` (480.2%) all show
  natural aspect 0.11-1.41 vs rendered cards 0.66-0.89. These are step
  1 (no on-disk SVG for several) or step 2 (viewBox does not match the
  scientific footprint) failures.

## Summary -- count of objects whose first-failing step is at each layer

This counts only the 20 Sub-check e clipped objects across the 8 target
template scenes (bench_basic, cell_counter_basic, crowded_bench_dense,
drug_dilution_plate_workspace, drug_dilution_workspace_dense,
electrophoresis_bench, microscope_basic, staining_bench).

| Step | Layer                                | Clipped objects first-failing here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Count |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1    | Asset mapping / SVG existence        | (none of the 20 clipped lab-instruments fail at step 1 directly; bottle-family aspect distortions group here separately)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 0     |
| 2    | SVG viewBox correctness              | waste_tray_secondary (staining_bench item lies in dense scene), waste_tray cluster                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 1     |
| 3    | ASSET_SPECS.default_width            | right_tool_p200_micropipette (bench_basic); tool_p200 (drug_dilution_plate_workspace); tool_p200_micropipette + tool_tip_box-cascade-on-p200 (drug_dilution_workspace_dense); right_tool_area_p200_micropipette + right_tool_area_p10_gel_loading_tip_box + rear_right_gel_opening_tool + front_left_mini_protean_gel + front_right_gel_comb (electrophoresis_bench); right_tool_area_microwave + right_tool_area_rocking_shaker (staining_bench); front_microwave + front_rocking_shaker (crowded_bench_dense); instrument_main_cell_counter (cell_counter_basic); instrument_main_microscope (microscope_basic) | 14    |
| 4    | Object YAML display_width_cm         | tool_tip_box (drug_dilution_workspace_dense)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 1     |
| 5    | Item width_scale                     | (none in isolation; appears as cascade)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 0     |
| 6    | Zone placement / overload            | front_waste_container (crowded_bench_dense); rear_left_protein_ladder_tube (electrophoresis_bench)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 2     |
| 7    | Renderer CSS preserving aspect ratio | waste_container (drug_dilution_plate_workspace); waste_container_main (drug_dilution_workspace_dense)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2     |

Layer 3 dominates: 14 of 20 clipped objects fail first at
`ASSET_SPECS.default_width` -- specifically because the asset_name has
no entry in `src/asset_specs.ts` (only ~30 generic families are
declared; the Round 3 scenes name dozens of specific instruments and
bottles that fall through). The cascade then drives non-uniform
`width_scale`, regional overload, and finally bottom-edge clipping.

## Fix-tier classification system

Per coordinator directive, every recommendation below carries an
8-tier classification. Tiers 1-7 are durable production fixes that
mirror the 7-step user-priority chain; tier 8 is reserved for
experiment-local static-harness shims that must not migrate into
production.

| Tier | Layer                                                      |
| ---- | ---------------------------------------------------------- |
| 1    | Asset mapping or missing SVG                               |
| 2    | SVG viewBox or asset geometry                              |
| 3    | `ASSET_SPECS.defaultWidth`                                 |
| 4    | Object `layout.display_width_cm`                           |
| 5    | Scene item `width_scale`                                   |
| 6    | Zone overload or scene layout design                       |
| 7    | Renderer CSS preserving aspect ratio                       |
| 8    | Experiment-local static-harness shim only (non-production) |

Each recommendation states: tier, render path affected, production vs
static-harness scope, whether user approval is required, and the
screenshot evidence path that supports it. Footprint stays a spacing
slot per `LAYOUT_ENGINE.md` and is not a crop box; no new CSS
footprint classes are part of the production direction.

## Top-5 highest-leverage fixes

Each fix targets a single missing entry / template that resolves
multiple clipped objects simultaneously. Numbers in parentheses are
clipped-object counts in the 8 target scenes.

1. Add `p200_micropipette` to `ASSET_SPECS` (resolves 4 clippings:
   bench_basic, drug_dilution_plate_workspace,
   drug_dilution_workspace_dense, electrophoresis_bench). Citation:
   `src/asset_specs.ts:19-21` already has the `multichannel_pipette`
   shape to copy.
   - Tier: 3 (`ASSET_SPECS.defaultWidth`).
   - Render path affected: every scene that places a
     `p200_micropipette` placement (layout engine + scene renderer).
   - Scope: production-relevant (durable).
   - Requires user approval: no (extending an existing table with a
     missing-entry instrument; no new schema, no new vocabulary).
   - Screenshot evidence: `test-results/no_crop_round3_static_template_repair/strategy_c/bench_basic.png`;
     `.../drug_dilution_plate_workspace.png`;
     `.../drug_dilution_workspace_dense.png`;
     `.../electrophoresis_bench.png`.
2. Add `microwave` + `rocking_shaker` to `ASSET_SPECS` (resolves 4
   clippings: crowded_bench_dense.front_microwave +
   front_rocking_shaker, staining_bench.right_tool_area_microwave +
   right_tool_area_rocking_shaker).
   - Tier: 3.
   - Render path affected: layout engine + scene renderer for any
     scene that places `microwave` or `rocking_shaker`.
   - Scope: production-relevant.
   - Requires user approval: no.
   - Screenshot evidence: `.../crowded_bench_dense.png`;
     `.../staining_bench.png`.
3. Add `mini_protean_gel`, `gel_comb`, `gel_opening_tool`, and
   `p10_gel_loading_tip_box` to `ASSET_SPECS` (resolves 4 clippings
   inside electrophoresis_bench, including the gel-comb forced-shrink
   anomaly).
   - Tier: 3.
   - Render path affected: layout engine + scene renderer for the
     SDS-PAGE family.
   - Scope: production-relevant.
   - Requires user approval: no.
   - Screenshot evidence: `.../electrophoresis_bench.png`.
4. Tighten the cross-cutting bottle alias: stop pointing
   `dmso_stock_bottle`, `drug_stock_bottle`, `pbs_buffer_bottle`,
   `stock_bottle`, `ddh2o_spray_bottle`, `ethanol_bottle`,
   `well_plate_96`, and `counter_slide_cartridge` at a single
   bottle-template SVG with a generic viewBox. Either author the
   missing on-disk SVGs under `generated/svg_assets/` with correct
   viewBoxes or declare per-name viewBox overrides. Resolves the
   systematic 4-8% rear-shelf aspect drift visible across
   crowded_bench_dense, drug_dilution_workspace_dense,
   drug_dilution_plate_workspace, electrophoresis_bench, staining_bench.
   - Tier: 1 (asset mapping / missing SVG) with a step-2 (viewBox)
     follow-on if new SVGs are authored.
   - Render path affected: SVG loader, every scene that names one of
     the affected bottle / plate / cartridge kinds.
   - Scope: production-relevant.
   - Requires user approval: yes -- authoring or aliasing new
     scientific SVG assets is a content-vocabulary change beyond
     a sizing-table extension. Per `AGENTS.md` Core rules ("Clickable
     lab objects are SVG-backed scene objects") and
     `PRIMARY_CONTRACT.md` rule 3, new SVG assets are a deliberate
     authoring step.
   - Screenshot evidence: `.../crowded_bench_dense.png`;
     `.../drug_dilution_workspace_dense.png`;
     `.../drug_dilution_plate_workspace.png`;
     `.../electrophoresis_bench.png`; `.../staining_bench.png`.
5. Raise `cell_counter.defaultWidth` (`src/asset_specs.ts:38`) and
   `microscope.defaultWidth` (`src/asset_specs.ts:39`) so the
   instrument-main cards in template-mode scenes are not shorter than
   the instrument body. This fixes two HARD FAIL clippings without
   touching renderer CSS, in line with `LAYOUT_ENGINE.md:583-584`
   ("Asset default_width if global asset size is wrong everywhere").
   - Tier: 3.
   - Render path affected: layout engine + scene renderer for
     cell_counter_basic and microscope_basic templates plus any
     production scene that names these instruments.
   - Scope: production-relevant.
   - Requires user approval: no (numeric tuning of an existing entry).
   - Screenshot evidence: `.../cell_counter_basic.png`;
     `.../microscope_basic.png`.

## Per-clipped-object recommendation tier classification

This table assigns one tier to the smallest fix already in the
per-object table above. It is the audit's single source of truth for
the tier distribution summary that follows. Tier 8 (experiment-local
shim) is not used for any clipped object in this audit because
durable tiers 1-7 cover every case.

| scene                         | object_name                             | recommendation tier | render path              | scope      | approval                                                                              | screenshot                                         |
| ----------------------------- | --------------------------------------- | ------------------- | ------------------------ | ---------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| bench_basic                   | right_tool_p200_micropipette            | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/bench_basic.png`                   |
| cell_counter_basic            | instrument_main_cell_counter            | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/cell_counter_basic.png`            |
| crowded_bench_dense           | front_microwave                         | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/crowded_bench_dense.png`           |
| crowded_bench_dense           | front_rocking_shaker                    | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/crowded_bench_dense.png`           |
| crowded_bench_dense           | front_waste_container                   | 6                   | scene zone layout        | production | yes (zone redesign touches scene authoring vocabulary)                                | `.../strategy_c/crowded_bench_dense.png`           |
| drug_dilution_plate_workspace | tool_p200                               | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/drug_dilution_plate_workspace.png` |
| drug_dilution_plate_workspace | waste_container                         | 7                   | renderer CSS             | production | no (CSS audit confirms `overflow: hidden` removal direction in `SVG_PIPELINE.md:294`) | `.../strategy_c/drug_dilution_plate_workspace.png` |
| drug_dilution_workspace_dense | tool_p200_micropipette                  | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/drug_dilution_workspace_dense.png` |
| drug_dilution_workspace_dense | tool_tip_box                            | 4                   | object YAML cm           | production | no                                                                                    | `.../strategy_c/drug_dilution_workspace_dense.png` |
| drug_dilution_workspace_dense | waste_container_main                    | 7                   | renderer CSS             | production | no                                                                                    | `.../strategy_c/drug_dilution_workspace_dense.png` |
| drug_dilution_workspace_dense | waste_tray_secondary                    | 2                   | viewBox / asset geometry | production | yes (re-authoring asset geometry)                                                     | `.../strategy_c/drug_dilution_workspace_dense.png` |
| electrophoresis_bench         | right_tool_area_p200_micropipette       | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/electrophoresis_bench.png`         |
| electrophoresis_bench         | right_tool_area_p10_gel_loading_tip_box | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/electrophoresis_bench.png`         |
| electrophoresis_bench         | rear_left_protein_ladder_tube           | 6                   | scene zone layout        | production | yes (zone redesign)                                                                   | `.../strategy_c/electrophoresis_bench.png`         |
| electrophoresis_bench         | rear_right_gel_opening_tool             | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/electrophoresis_bench.png`         |
| electrophoresis_bench         | front_left_mini_protean_gel             | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/electrophoresis_bench.png`         |
| electrophoresis_bench         | front_right_gel_comb                    | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/electrophoresis_bench.png`         |
| microscope_basic              | instrument_main_microscope              | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/microscope_basic.png`              |
| staining_bench                | right_tool_area_microwave               | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/staining_bench.png`                |
| staining_bench                | right_tool_area_rocking_shaker          | 3                   | layout engine + renderer | production | no                                                                                    | `.../strategy_c/staining_bench.png`                |

The systematic rear-shelf aspect drift on bottle aliases (see
"Aspect-distortion-only objects" section) is tier 1 in scope and is
covered by top-5 fix #4. Those rows are not Sub-check e clipped, so
they are not counted in the table above but they share the same
production direction.

## Tier distribution summary

| Tier | Layer                                     | Clipped-object recommendations                                         | Notes                                                                                               |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | Asset mapping / missing SVG               | 0 (clipped); 1 cross-cutting top-5 fix covering bottle / plate aliases | Approval required because authoring new SVGs is a content-vocabulary change.                        |
| 2    | SVG viewBox / asset geometry              | 1 (waste_tray_secondary)                                               | Approval required (re-authoring geometry).                                                          |
| 3    | `ASSET_SPECS.defaultWidth`                | 14                                                                     | Pure numeric / table extension; no approval needed beyond standard review. Dominant tier.           |
| 4    | Object `layout.display_width_cm`          | 1 (tool_tip_box)                                                       | Per-object cm tuning; no approval needed.                                                           |
| 5    | Scene item `width_scale`                  | 0 (no clipped object roots here; cascade only)                         | Step 5 surfaces as cascade from tier 3 misses.                                                      |
| 6    | Zone overload / scene layout              | 2 (front_waste_container, rear_left_protein_ladder_tube)               | Approval required for zone re-design.                                                               |
| 7    | Renderer CSS preserving aspect ratio      | 2 (waste_container, waste_container_main)                              | Remove residual `overflow: hidden` per `SVG_PIPELINE.md:294`; no new CSS footprint classes.         |
| 8    | Experiment-local static-harness shim only | 0                                                                      | Tier 8 is reserved for static harnesses; durable tiers 1-7 cover all clipped objects in this audit. |

Total clipped objects classified: 20. Tier 3 carries 14 of 20 (70%)
of clipped-object root causes; tier 1 carries the largest
cross-cutting aspect-drift cohort (rear-shelf bottle family) covered
in top-5 fix #4 rather than per-object rows.

## Citations

- `docs/specs/PRIMARY_CONTRACT.md` rule 3 (clickable SVG-backed objects;
  custom geometry only for subparts).
- `docs/PRIMARY_DESIGN.md` "Visual integrity: never crop scientific
  assets" (HARD FAIL discipline mirrored in `LAYOUT_ENGINE.md:650-674`
  and `SVG_PIPELINE.md:294,303-314`).
- `docs/specs/SCALING_MODEL.md:14-21,30-50` (per-scene px_per_cm and
  the width_scale formula).
- `docs/specs/LAYOUT_ENGINE.md:76-77,173,185-186,196,200-201,
261-262,580-589` (tuning order, viewBox-derived height, default
  vs scale).
- `docs/specs/OBJECT_YAML_FORMAT.md:464-470` (layout fields contract).
- `docs/specs/SCENE_YAML_FORMAT.md:201-202,216,240` (placement
  overrides).
- `docs/specs/SVG_PIPELINE.md:112,294,303-314` (artwork integrity
  rule; preserveAspectRatio).
- `src/asset_specs.ts:12-45` (current ASSET_SPECS coverage; many
  asset_name values used by the Round 3 scenes are absent).
- `src/scene_runtime/render/svg_loader.ts:25-58` (SVG\_<UPPER>
  resolution; no alias map declared inline, so any aliasing happens
  upstream in the generated SVG barrel).
- `test-results/no_crop_round3_static_template_repair/strategy_c/visual_audit.md`
  (Sub-check e and f findings per scene).
- `test-results/no_crop_round3_static_template_repair/strategy_c/sizing_manifest.json`
  (natural vs rendered widths and scale_factor symmetry).
- `test-results/no_crop_round3_static_template_repair/strategy_c/crops_summary.txt`
  (enumerated clipped object list).

## Data gaps and caveats

- The audit infers asset-alias behaviour from on-disk file presence in
  `generated/svg_assets/` plus the export-name mapping in
  `src/scene_runtime/render/svg_loader.ts`. Several semantic asset
  names (e.g. `dmso_stock_bottle`, `pbs_buffer_bottle`,
  `drug_stock_bottle`, `stock_bottle`, `ddh2o_spray_bottle`,
  `ethanol_bottle`, `well_plate_96`, `p1000_pipette`,
  `serological_pipette`, `counter_slide_cartridge`) have no matching
  on-disk SVG, yet the scenes render with natural dimensions consistent
  with a shared bottle/plate template. The alias mechanism that
  reconciles this is not visible in `svg_loader.ts` (which only does
  `SVG_<UPPER>` lookup); it likely lives upstream in the generated
  svg_assets index or in a content-side rewrite step. A focused trace
  of that path is the recommended follow-up before applying fix 4 in
  the top-5 list.
- `visual_audit.md` reports "Clipped: 0" in the table header for every
  scene while Sub-check e simultaneously enumerates HARD FAIL clipping
  rows. The audit treats Sub-check e as the canonical clipping signal
  (consistent with `SVG_PIPELINE.md:294`). The header-level "Clipped: 0"
  appears to be a different metric and is the subject of separate
  Audit E reconciliation per the task brief; this audit does not block
  on it.
- The audit covers only the 8 template scenes listed in the WS-A
  retry. The 38 gold-scene residuals referenced in Exp 1 are out of
  scope for this artifact.
