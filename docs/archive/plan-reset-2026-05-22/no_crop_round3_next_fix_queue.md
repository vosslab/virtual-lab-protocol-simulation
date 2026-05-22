# No-crop Round 3 next-fix queue

Status: synthesis (doc-only; no code, YAML, or CSS edits).
HEAD: 8795d25.
Date: 2026-05-21.
Canonical metric for every crop count cited below:
`artwork_integrity.clipped_by_parent` (precheck.mjs sub-check 12e).
See [audits/no_crop_precheck_semantics.md](audits/no_crop_precheck_semantics.md)
section 4 for the canonical baseline table.

This queue ranks the next durable fixes against the user-supplied
8-tier fix-priority chain. Tier 1-8 definitions per
[decisions/no_crop_round3_sizing_source_reconciliation.md](decisions/no_crop_round3_sizing_source_reconciliation.md)
and [audits/no_crop_sizing_chain_root_cause.md](audits/no_crop_sizing_chain_root_cause.md):

1. Asset mapping or missing SVG
2. SVG viewBox or asset geometry
3. `ASSET_SPECS.defaultWidth`
4. Object `layout.display_width_cm`
5. Scene item `width_scale`
6. Zone overload or scene layout design
7. Renderer CSS preserving aspect ratio
8. Experiment-local static-harness shim only

Sizing-source reconciliation is accepted: durable fixes flow through
the existing scaling model and SVG pipeline, not through new CSS
footprint classes. Tier 8 shims are excluded from the top-10 unless
they unblock a durable item.

## Cross-audit findings (summary)

Five Round 3 audits (A-E) jointly classify 20 currently clipped
objects (Audit A, 8 target scenes) plus 100 orphan SVGs (Audit B) plus
78 object YAMLs with 0% `display_width_cm` coverage (Audit D). Audit C
exonerates the SVG layer: 0 BAD, 0 SUSPICIOUS, 121 OK, 4
ASPECT-EXTREME (legitimate thin pipettes/tips) out of 125 SVGs scanned
-- author cropping of viewBoxes is not the source of any current
regression. Audit E reconciles the diagnostic name confusion and pins
`artwork_integrity.clipped_by_parent` as the only canonical SVG-crop
metric (current Strategy-C baseline: 21 templates / 38 gold). Tier
distribution from Audit A: Tier 3 dominates with 14 of 20 clipped
objects first-failing at `ASSET_SPECS.defaultWidth` (70%); Tier 7 = 2;
Tier 6 = 2; Tier 2 = 1; Tier 4 = 1; Tier 5 = 0; Tier 1 = 0 in the
clipped-object set but 1 cross-cutting top-5 fix on bottle/plate
aliases that covers the systematic 4-8% rear-shelf aspect drift on
crowded_bench_dense, drug_dilution_workspace_dense,
drug_dilution_plate_workspace, electrophoresis_bench, and
staining_bench. Audit D confirms 0% of 78 object YAMLs declare
`display_width_cm`, so Tier 4 fixes are realistic only as additive
per-object work (no migration of an existing field). Audit B shows
ASSET_SPECS has 31 entries against 125 SVGs (100 orphans), with
suspect entries `flask`, `serological_pipette`, `aspirating_pipette`,
`multichannel_pipette`, `mtt_vial` flagged as crop-risk shapes.

## Top-10 next-fix queue

Ordering rules applied:

- Ungated Tier 1-3 fixes that resolve multiple clipped objects sort to
  the top.
- Then ungated Tier 4-7 fixes.
- User-gated items (permanent footprint vocab adoption, diagnostic
  semantic changes, contract changes, broad production migrations,
  asset-vocabulary additions, zone redesigns) appear at the bottom.
- Tier 8 static-harness shims are excluded from this top-10 (none
  unblocks a durable item under current evidence).

User-gated yes/no follows the user's gating rule: permanent footprint
vocab additions, diagnostic-semantic changes, contract changes, broad
production migrations, and "another commit" surfaces are YES; numeric
extensions of an existing TS table or per-object cm tuning are NO.

| #   | candidate fix                                                                                                                                                                                                                                                                | tier | render path                                                                 | expected crop reduction                                                                                                                                                                                                                                                                                                                                                                                                                             | user-gated                                                               | first command or file to inspect                                                                                                                                                                                                                        | screenshot evidence                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Add `p200_micropipette` entry to ASSET_SPECS (defaultWidth shape copied from existing `multichannel_pipette`)                                                                                                                                                                | 3    | production runtime (layout engine + scene renderer)                         | -4 clipped objects in target scenes (`bench_basic.right_tool_p200_micropipette`, `drug_dilution_plate_workspace.tool_p200`, `drug_dilution_workspace_dense.tool_p200_micropipette`, `electrophoresis_bench.right_tool_area_p200_micropipette`; Audit A top-5 fix #1; cascade also relaxes `electrophoresis_bench` `front_tools` row overload)                                                                                                       | NO                                                                       | inspect `src/asset_specs.ts:12-45` (locate `multichannel_pipette` at L21 to copy shape)                                                                                                                                                                 | `test-results/no_crop_round3_static_template_repair/strategy_c/bench_basic.png`, `.../drug_dilution_plate_workspace.png`, `.../drug_dilution_workspace_dense.png`, `.../electrophoresis_bench.png`                                   |
| 2   | Add `microwave` and `rocking_shaker` entries to ASSET_SPECS                                                                                                                                                                                                                  | 3    | production runtime (layout engine + scene renderer)                         | -4 clipped objects (`crowded_bench_dense.front_microwave`, `crowded_bench_dense.front_rocking_shaker`, `staining_bench.right_tool_area_microwave`, `staining_bench.right_tool_area_rocking_shaker`; Audit A top-5 fix #2; both currently produce 215% and 302% rendered-vs-natural area upscale per Audit A row table)                                                                                                                              | NO                                                                       | inspect `src/asset_specs.ts:12-45` then `assets/equipment/microwave_closed.svg` and `assets/equipment/rocking_shaker_idle.svg` for viewBox aspect (Audit B records 100x100 placeholder for microwave; 271.143x322.847 for rocking_shaker)               | `test-results/no_crop_round3_static_template_repair/strategy_c/crowded_bench_dense.png`, `.../staining_bench.png`                                                                                                                    |
| 3   | Add `mini_protean_gel`, `gel_comb`, `gel_opening_tool`, and `p10_gel_loading_tip_box` entries to ASSET_SPECS                                                                                                                                                                 | 3    | production runtime (layout engine + scene renderer for SDS-PAGE family)     | -4 clipped objects in `electrophoresis_bench` (`front_left_mini_protean_gel`, `front_right_gel_comb`, `rear_right_gel_opening_tool`, `right_tool_area_p10_gel_loading_tip_box`; Audit A top-5 fix #3)                                                                                                                                                                                                                                               | NO                                                                       | inspect `src/asset_specs.ts:12-45`, then viewBox rows in Audit B orphan list for `mini_protean_gel` (462.3x518.7, aspect 0.891), `gel_comb` (same), `gel_opening_tool` (100x100 placeholder), `p10_gel_loading_tip_box` (328.025x214.072, aspect 1.532) | `test-results/no_crop_round3_static_template_repair/strategy_c/electrophoresis_bench.png`                                                                                                                                            |
| 4   | Raise `cell_counter.defaultWidth` and `microscope.defaultWidth` so instrument-main cards are not shorter than the instrument body                                                                                                                                            | 3    | production runtime (layout engine + scene renderer)                         | -2 clipped objects (`cell_counter_basic.instrument_main_cell_counter` with 19.1% mismatch, `microscope_basic.instrument_main_microscope` with rendered area 194.8% of natural; Audit A top-5 fix #5; both report "artwork extends outside card on bottom")                                                                                                                                                                                          | NO                                                                       | inspect `src/asset_specs.ts:38-39` (existing `cell_counter: 12` and `microscope: 8` entries)                                                                                                                                                            | `test-results/no_crop_round3_static_template_repair/strategy_c/cell_counter_basic.png`, `.../microscope_basic.png`                                                                                                                   |
| 5   | Tune `tool_tip_box` object `display_width_cm` so the placement card matches the natural 230x150 landscape aspect                                                                                                                                                             | 4    | production runtime (layout engine consumes per-object cm; renderer follows) | -1 clipped object (`drug_dilution_workspace_dense.tool_tip_box`, 45.7% aspect mismatch, rendered area only 8.7% of natural per Audit A; same fix transfers to `drug_dilution_plate_workspace.tool_tips`)                                                                                                                                                                                                                                            | NO                                                                       | inspect `content/objects/decoration/micropipette_tip_box.yaml` (no `display_width_cm` present today per Audit D; first object to receive the field)                                                                                                     | `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_workspace_dense.png`                                                                                                                                    |
| 6   | Remove residual `overflow: hidden` on `.object-graphic` parent for waste_container placements in drug_dilution scenes                                                                                                                                                        | 7    | production runtime (renderer CSS)                                           | -2 clipped objects (`drug_dilution_plate_workspace.waste_container`, `drug_dilution_workspace_dense.waste_container_main`; both <5% aspect deviation per Audit A, indicating parent card shorter than asset rather than sizing-chain failure)                                                                                                                                                                                                       | NO                                                                       | inspect `src/style.css` `.object-graphic` selector and reference `docs/specs/SVG_PIPELINE.md:294,313`                                                                                                                                                   | `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_plate_workspace.png`, `.../drug_dilution_workspace_dense.png`                                                                                           |
| 7   | Author the missing on-disk SVGs (or declare per-name viewBox overrides) for the bottle/plate alias family: `dmso_stock_bottle`, `drug_stock_bottle`, `pbs_buffer_bottle`, `stock_bottle`, `ddh2o_spray_bottle`, `ethanol_bottle`, `well_plate_96`, `counter_slide_cartridge` | 1    | production runtime (SVG loader, every scene that names these kinds)         | Resolves the systematic 4-8% rear-shelf aspect drift across 5 target scenes (`crowded_bench_dense`, `drug_dilution_workspace_dense`, `drug_dilution_plate_workspace`, `electrophoresis_bench`, `staining_bench`); Audit A top-5 fix #4; cluster sits in Audit A "Aspect-distortion-only objects" section, not Sub-check 12e clipped, so it does not subtract from the 21/38 count directly but it eliminates the rear-shelf aspect-distortion class | YES (asset-vocabulary addition per PRIMARY_CONTRACT.md rule 3)           | inspect `src/scene_runtime/render/svg_loader.ts:25-58` and `generated/svg_assets/` listing; pair with Audit B orphan list rows for each affected name                                                                                                   | `test-results/no_crop_round3_static_template_repair/strategy_c/crowded_bench_dense.png`, `.../drug_dilution_workspace_dense.png`, `.../drug_dilution_plate_workspace.png`, `.../electrophoresis_bench.png`, `.../staining_bench.png` |
| 8   | Re-author `waste_tray` SVG geometry (or supply a landscape-honouring viewBox override) to reconcile natural 1.4 vs rendered 0.818 aspect                                                                                                                                     | 2    | production runtime (SVG asset + layout)                                     | -1 clipped object (`drug_dilution_workspace_dense.waste_tray_secondary`, 41.6% mismatch; Audit A row classifies as step-2 viewBox vs card mismatch)                                                                                                                                                                                                                                                                                                 | YES (re-authoring asset geometry is a content-vocabulary change)         | inspect `assets/equipment/waste_tray.svg` (Audit B: viewBox 70x50, aspect 1.400) and `content/objects/.../waste_tray.yaml`                                                                                                                              | `test-results/no_crop_round3_static_template_repair/strategy_c/drug_dilution_workspace_dense.png`                                                                                                                                    |
| 9   | Redesign zone layout for `front_tools` row (split into tab stops or move `front_waste_container` to a less crowded row)                                                                                                                                                      | 6    | production runtime (scene zone layout)                                      | -1 clipped object (`crowded_bench_dense.front_waste_container`, 4.1% aspect deviation under tolerance, but parent overflow on bottom because row shares overflow budget with microwave + shaker + waste); secondary cascade benefit: same row overload contributes to other items in fix #2                                                                                                                                                         | YES (zone redesign touches scene authoring vocabulary per Audit A row 5) | inspect `content/base_scenes/crowded_bench_dense.yaml` and `docs/specs/LAYOUT_ENGINE.md:580-589` (tune zone geometry first)                                                                                                                             | `test-results/no_crop_round3_static_template_repair/strategy_c/crowded_bench_dense.png`                                                                                                                                              |
| 10  | Move `rear_left_protein_ladder_tube` to a rear shelf row with taller baseline, or reduce neighbouring item widths to free row clearance                                                                                                                                      | 6    | production runtime (scene zone layout)                                      | -1 clipped object (`electrophoresis_bench.rear_left_protein_ladder_tube`; row stacked next to `electrophoresis_tank` which overflows top per Audit A)                                                                                                                                                                                                                                                                                               | YES (zone redesign)                                                      | inspect `content/base_scenes/electrophoresis_bench.yaml` and `docs/specs/LAYOUT_ENGINE.md:580-589`                                                                                                                                                      | `test-results/no_crop_round3_static_template_repair/strategy_c/electrophoresis_bench.png`                                                                                                                                            |

Cumulative arithmetic if fixes 1-6 land (no user gate needed):
4 + 4 + 4 + 2 + 1 + 2 = -17 of 21 template-scene clipped objects.
Fixes 7 + 8 + 9 + 10 (user-gated) add the rear-shelf aspect-drift
cohort plus 3 more clipped objects (waste_tray_secondary,
front_waste_container, rear_left_protein_ladder_tube). The remaining
residual after the top 10 would be downstream gold-scene work (38
gold-side `clipped_by_parent` records per Audit E section 4) which is
out of scope for this template-focused queue.

## Parked / gated

User-gated items deferred to a separate approval gate:

- **Authoring or aliasing new bottle/plate/cartridge SVGs**
  (queue row #7). Tier 1. Approval required per PRIMARY_CONTRACT.md
  rule 3 (clickable SVG-backed objects; custom geometry is gated
  authoring work).
- **Re-authoring `waste_tray.svg` geometry** (queue row #8). Tier 2.
  Approval required (content-vocabulary change).
- **Zone redesign for `front_tools` row** (queue row #9). Tier 6.
  Approval required (scene authoring vocabulary).
- **Zone redesign for `rear_left_protein_ladder_tube` row**
  (queue row #10). Tier 6. Approval required.
- **T75 flask orientation schism resolution** (Audit C R4). Tier 1.
  Approval required (canonical-asset selection); not in current
  Strategy-C clipped set, flagged for future awareness.
- **Replace 11 placeholder SVGs with real artwork** (Audit C R2:
  `power_supply_off`, `power_supply_on`, `heat_block_closed`,
  `heat_block_open`, `microwave_closed`, `microwave_open`,
  `lightbox_off`, `gel_opening_tool`, `microtube_rack_24_placeholder`,
  `kimwipe_pad`, `electrode_module`). Tier 1. Approval required.
  Replacing `microwave_closed` and `microwave_open` would deepen the
  fix from queue row #2 because the current placeholder is a 100x100
  blank.
- **Adopt `display_width_cm` as a required field across 78 object
  YAMLs** (Audit D 100% gap). Tier 4. Approval required (broad
  production migration of the authored sizing surface; queue row #5
  is an additive per-object beachhead, not a migration mandate).
- **Permanent CSS footprint class adoption** (Round 3 reconciliation
  decision). Approval required; per decision note the durable
  direction goes through the scaling model and SVG pipeline, not
  through new CSS class names.

Parked-item count: 8.

## Out of scope

The following are explicitly excluded from this top-10 queue:

- **Tier 8 static-harness shims** (Audit C R5 namespaced-root scanner
  fix; any `experiments/css_native_layout/` CSS-class diagnostic).
  Tier 8 is reserved for experiment-local static harnesses and does
  not unblock any durable Tier 1-7 item under current evidence.
- **Measurement gaps in Audit E**: the production-runtime new-render
  path (`render_and_dump.mjs`) emits real `<svg>` elements while
  precheck sub-check 12e looks for rendered `<img>` bbox; the closure
  early-returns when `<img>` is absent (precheck.mjs line 536), so a
  reported 0 on `clipped_by_parent` for that render path is a
  measurement gap, not evidence of crop-free output (Audit E sections
  3.4 and 5). Reconciling that measurement gap is a separate
  diagnostic-tooling task, not a sizing fix; do not cite the 0 from
  `test-results/no_crop_round3_exp4_rendered/precheck/visual_audit.json`
  as a crop baseline.
- **Gold-scene residuals** (38 `clipped_by_parent` records per Audit E
  section 4 "Strategy C gold"). The queue is scoped to the 8 target
  template scenes covered by Audit A; gold-scene fixes follow the
  same tier framework but are tracked separately by the no-crop
  coordinator.
- **`clipped_artwork` (precheck sub-check 1)** as a crop metric.
  Audit E section 2 establishes it is a placement-vs-region bbox
  containment check, not the SVG-crop metric. Do not regress to
  citing it.
- **"visible_crops" colloquial alias**. Audit E section 2: the term
  is not a precheck field; always cite
  `artwork_integrity.clipped_by_parent` (sub-check 12e) explicitly.

## Source files read

- [audits/no_crop_sizing_chain_root_cause.md](audits/no_crop_sizing_chain_root_cause.md)
  (Audit A, 20 clipped objects classified; top-5 fix list lines 223-303)
- [audits/no_crop_asset_specs_coverage.md](audits/no_crop_asset_specs_coverage.md)
  (Audit B, 31 entries / 100 orphans, top-5 crop suspects lines 277-289)
- [audits/no_crop_svg_viewbox_audit.md](audits/no_crop_svg_viewbox_audit.md)
  (Audit C, 125 SVGs, R1-R5 recommendations lines 267-393)
- [audits/no_crop_object_sizing_coverage.md](audits/no_crop_object_sizing_coverage.md)
  (Audit D, 78 object YAMLs with 0% `display_width_cm` coverage; top-5
  missing-cm candidates lines 112-136)
- [audits/no_crop_precheck_semantics.md](audits/no_crop_precheck_semantics.md)
  (Audit E, canonical metric `artwork_integrity.clipped_by_parent`
  sub-check 12e, baseline table section 4)
- [decisions/no_crop_round3_sizing_source_reconciliation.md](decisions/no_crop_round3_sizing_source_reconciliation.md)
  (durable direction goes through scaling model and SVG pipeline)
- [workstreams/no_crop_round3_plan.md](workstreams/no_crop_round3_plan.md)
  (Round 3 plan amendment; ready-to-fix cross-reference)
