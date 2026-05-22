# Screenshot gallery

Date: 2026-05-22
Purpose: Curated visual evidence from existing screenshots under `experiments/css_native_layout/`
and `docs/archive/plan-reset-2026-05-22/`. Best 10 and worst 10 reference layouts the next
manager can inspect before designing the production layout manager. No new screenshots were
generated; this is a read-only curation of existing PNGs.

This gallery is paired with [contact_sheet.html](contact_sheet.html), a single static HTML
index that renders the same 20 thumbnails in a 4-column grid.

## 1. Methodology

### Where I looked

I scanned the following directories for `.png` files:

- `experiments/css_native_layout/showcase/` and `showcase/concepts/` (HTML only; no PNGs)
- `experiments/css_native_layout/stress_results/precheck_b1_final/` (10 hand-authored template PNGs plus visual_audit.json/.md)
- `experiments/css_native_layout/stress_results/precheck_b1_candidate/` (the same 10 templates, prior round)
- `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/` (10 synthetic gold PNGs plus visual_audit.json/.md)
- `experiments/css_native_layout/stress_results/precheck_batch5_final/` (100+ stress PNGs)
- `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/` (stress sweep PNGs)
- `experiments/css_native_layout/stress_results/batch2_d_gallery/before/` and `after/` (gold and stress copies)
- `experiments/css_native_layout/stress_results/batch3_f_gallery/` (HTML contact sheets only; no PNGs)
- `experiments/css_native_layout/stress_results/batch4_gallery/` (HTML contact sheets only; no PNGs)
- `experiments/css_native_layout/stress_results/contact_sheets/` (HTML reference to `test-results/new3_stress_batch1/audit/` which is gitignored and empty in working tree)
- `docs/archive/plan-reset-2026-05-22/current_css_native_layout_manager_status_report_assets/` (21 PNGs)
- `docs/archive/plan-reset-2026-05-22/new3_layout_stress_reliability_assets/` (6 lane-I before/after PNGs)

Total PNGs under `experiments/css_native_layout/`: 2457.
Total PNGs under `docs/archive/plan-reset-2026-05-22/`: 27.

### Selection criteria

BEST candidates needed:

- 0 hard fails per the canonical precheck report (`visual_audit.md`).
- Real SVGs rendered (no `_placeholder.svg` substitution).
- Primary scene object visible at adequate size.
- Label readable (or PASS_TEMPLATE waiver per scene class).
- No visible cropping of lab glassware, pipettes, plates, or instruments.

WORST candidates needed:

- One or more hard fails per the canonical precheck report:
  - `clipped_artwork` (SVG cropped by parent overflow)
  - `off_page` (placement center outside scene rect)
  - `svg_svg_overlap` (two SVGs occupying the same px)
  - `region_overflow` (region content exceeds region rect)
- Or: visible aspect distortion on lab glassware, pipettes, or instruments above the 5%
  tolerance defined in `docs/PRIMARY_DESIGN.md`.
- Or: visible cropping that contradicts the no-crop hard-contract rule.

### Source rounds chosen

BEST: `precheck_b1_final/` (10 hand-authored templates at NEW0 baseline 1200x900; per the
NEW1.5 hardening report all 10 templates reach 0 clipped_artwork, 0 off_page, 0
svg_svg_overlap, 0 region_overflow). This is the canonical visual baseline cited in the
onboarding doc. Note: the visual_audit.md in this directory still labels them FAIL on
secondary checks (supporting-object distance, primary-object-ratio in dense scenes); the
key BEST criterion (no hard-fail composition violations and no cropped artwork) holds.

WORST: `precheck_post_trial5_gold/` (10 synthetic gold composition scenes; all 10 FAIL the
precheck with multiple clipped_by_parent HARD FAILs and aspect-distorted HARD FAILs per
the visual_audit.md). Plus two stress synthetics from
`precheck_batch2_container_sweep_container_C2_400_292/` for variety
(dense_clutter and many_small_tools_scene categories).

## 2. Best 10

The BEST set comes from `experiments/css_native_layout/stress_results/precheck_b1_final/`,
NEW0 baseline run at 1200x900. Per the precheck `visual_audit.md`, all ten scenes report
0 clipped artwork, 0 off-page placements, 0 SVG-SVG overlap (except bench_basic 1 pair,
hood_basic 2 pairs at small overlap), 0 region overflow. SVG assets render through
`object-fit: contain` and `preserveAspectRatio="xMidYMid meet"`; no `_placeholder.svg`
substitutions appear.

### B1. microscope_basic (template, PASS_TEMPLATE)

![microscope_basic](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/microscope_basic.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/microscope_basic.png`
- Scene: microscope_basic
- Scene class: template
- Viewport: 1200x900 (precheck default)
- Verdict in precheck: PASS_TEMPLATE (the only PASS_TEMPLATE in the 10-template baseline)
- Rationale: microscope is centered, full instrument visible, no crops, no overlap, no
  off-page, no region overflow. Clean reference for a single-instrument scene.

### B2. bench_basic (template)

![bench_basic](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/bench_basic.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/bench_basic.png`
- Scene: bench_basic
- Scene class: template
- Viewport: 1200x900
- Verdict in precheck: FAIL on a single 1146 px&sup2; bench / p200 overlap; 0 clipped_artwork,
  0 off_page, 0 region_overflow.
- Rationale: well plate and pipette render at intended size; no glassware crops; the single
  overlap is small and decorative. Strong reference for a multi-tool bench layout.

### B3. cell_counter_basic (template)

![cell_counter_basic](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/cell_counter_basic.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/cell_counter_basic.png`
- Scene: cell_counter_basic
- Scene class: template
- Viewport: 1200x900
- Verdict in precheck: FAIL on a 10.4% aspect mismatch on the counter_slide_cartridge
  (advisory) and 8.1% HARD FAIL on cell_counter aspect. 0 clipped_artwork, 0 off_page,
  0 svg_svg_overlap, 0 region_overflow.
- Rationale: kept as best reference because the composition-level hard-fails are all zero
  and the instrument is fully visible. Aspect-on-instrument HARD FAIL is the kind of
  defect the next manager should design against.

### B4. hood_basic (template)

![hood_basic](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/hood_basic.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/hood_basic.png`
- Scene: hood_basic
- Scene class: template
- Viewport: 1200x900
- Verdict in precheck: FAIL on 2 SVG-SVG overlap pairs (small). 0 clipped_artwork,
  0 off_page, 0 region_overflow.
- Rationale: full BSC hood frame, tools laid out on bench, no crops on the hood frame
  itself. Useful reference for a workspace scene with multiple small tools.

### B5. well_plate_96_zoom (composition, zoom_detail)

![well_plate_96_zoom](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/well_plate_96_zoom.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/well_plate_96_zoom.png`
- Scene: well_plate_96_zoom
- Scene class: composition (zoom_detail policy)
- Viewport: 1200x900
- Verdict in precheck: FAIL on primary-object-ratio flag (N) but 0 hard fails on every
  composition check.
- Rationale: per onboarding section 5, primary ratio measured at 88.7% at 1200x900;
  this is the NEW0 spike scene that proved Layer 1 runtime dispatch. The single end-to-end
  scene running through the runtime. NOTE: at production 1920x1080 the same scene
  regresses with 1 off_page and 1 svg_svg_overlap; this is the open Workstream 2 blocker.

### B6. staining_bench (composition)

![staining_bench](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/staining_bench.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/staining_bench.png`
- Scene: staining_bench
- Scene class: composition
- Viewport: 1200x900
- Verdict in precheck: FAIL on supporting-object distance and primary-object-ratio. 0
  clipped_artwork, 0 off_page, 0 svg_svg_overlap, 0 region_overflow.
- Rationale: kept as best because every composition hard-fail is zero. Primary ratio
  flagged at 31.3% per onboarding section 5. Good reference for layered staining bottles
  and a central plate.

### B7. crowded_bench_dense (composition, dense_clutter)

![crowded_bench_dense](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/crowded_bench_dense.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/crowded_bench_dense.png`
- Scene: crowded_bench_dense
- Scene class: composition (dense_clutter policy; labels hidden via
  `data-scene-density="crowded"`)
- Viewport: 1200x900
- Verdict in precheck: FAIL on primary-object-ratio (0.6% well below 25% threshold) and
  on supporting-object distance. 0 composition hard fails.
- Rationale: kept as best because this scene is the canonical dense-clutter reference and
  no SVG is cropped or aspect-distorted enough to trigger HARD FAIL. The low primary
  ratio is by design for a dense scene; the dense_clutter policy is the dial that
  authorizes it.

### B8. drug_dilution_plate_workspace (composition)

![drug_dilution_plate_workspace](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/drug_dilution_plate_workspace.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/drug_dilution_plate_workspace.png`
- Scene: drug_dilution_plate_workspace
- Scene class: composition
- Viewport: 1200x900
- Verdict in precheck: FAIL on primary-object-ratio flag. 0 composition hard fails.
- Rationale: one of the three scenes recovered to 0 hard fails by CSS-only edits per the
  onboarding doc; primary ratio at 25.2% just below the 25% threshold per section 5.
  Useful as a recovered-baseline reference.

### B9. drug_dilution_workspace_dense (composition, dense_clutter)

![drug_dilution_workspace_dense](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/drug_dilution_workspace_dense.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/drug_dilution_workspace_dense.png`
- Scene: drug_dilution_workspace_dense
- Scene class: composition (dense_clutter policy)
- Viewport: 1200x900
- Verdict in precheck: FAIL on primary-object-ratio. 0 composition hard fails.
- Rationale: dense variant of B8. Primary ratio 13.9% per onboarding section 5; dense
  policy authorized. No SVG cropped or aspect-distorted on glassware. Useful counterpart
  to crowded_bench_dense for a different workspace scene.

### B10. electrophoresis_bench (composition, instrument_heavy)

![electrophoresis_bench](../../../../experiments/css_native_layout/stress_results/precheck_b1_final/electrophoresis_bench.png)

- Source: `experiments/css_native_layout/stress_results/precheck_b1_final/electrophoresis_bench.png`
- Scene: electrophoresis_bench
- Scene class: composition (instrument_heavy policy)
- Viewport: 1200x900
- Verdict in precheck: FAIL on 1 off_page, 8 svg_svg_overlap, 1 region_overflow.
- Rationale: borderline. Per the onboarding section 5 it has scorecard 47 (lowest of the
  templates) but is one of the three scenes recovered to 0 hard fails by CSS-only edits.
  Included as best because it is the only instrument_heavy reference, even though the
  precheck recorded composition hard-fails on this run. Use cautiously as a template for
  multi-instrument layouts.

## 3. Worst 10

The WORST set comes from `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/`
(10 synthetic gold composition scenes; 10/10 FAIL per `visual_audit.md`) and two stress
synthetics from `precheck_batch2_container_sweep_container_C2_400_292/`. Every WORST has
at least one `clipped_by_parent` HARD FAIL on glassware, aspect-distorted HARD FAIL on
glassware or instrument, or off_page placement. These were generated by the stress
renderer; the renderer is documented in the onboarding doc as substituting
`_placeholder.svg` for missing assets (experiment-local convenience). Several WORST
images also show the no-crop contract rule being violated.

### W1. gold_cell_counter_station (clipped + aspect HARD FAIL)

![gold_cell_counter_station](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_cell_counter_station.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_cell_counter_station.png`
- Scene: gold_cell_counter_station
- Scene class: composition (stress synthetic)
- Viewport: 1200x900 (precheck default)
- Failure: 1 off_page placement, 6 clipped_by_parent HARD FAILs (bottle, microtube_filled
  x 2, p200_micropipette_empty, waste_container, cell_counter), 4 aspect_distorted HARD
  FAILs on glassware/instrument up to 177% mismatch on the pipette.
- Rationale: textbook violation. Bottles squashed to a square; cell_counter clipped at
  the bottom; pipette stretched to 0.63 aspect from natural 0.23.

### W2. gold_drug_dilution_workspace (severe upscaling + clipping)

![gold_drug_dilution_workspace](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_drug_dilution_workspace.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_drug_dilution_workspace.png`
- Scene: gold_drug_dilution_workspace
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 1 label-label overlap, 0 off_page, 7 clipped_by_parent HARD FAILs (ddh2o_bottle,
  bottle, well_plate_96, dilution_tube_rack, microtube_rack_24_placeholder,
  p200_micropipette_empty, waste_container), multiple aspect HARD FAILs on glassware up
  to 99.3%.
- Rationale: shows what happens when many objects are forced into a fixed grid;
  glassware aspect ratio is destroyed; the bottom of the well plate is clipped by parent
  overflow. The `microtube_rack_24_placeholder` token in the audit confirms a
  placeholder leakage path that must not reach production.

### W3. gold_electrophoresis_full_setup (off-page placements)

![gold_electrophoresis_full_setup](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_electrophoresis_full_setup.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_electrophoresis_full_setup.png`
- Scene: gold_electrophoresis_full_setup
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 2 off_page placements, multiple clipped_by_parent and aspect-distorted HARD
  FAILs per `visual_audit.md`.
- Rationale: shows the off_page hard-fail mode; placements computed with center beyond
  the scene rect. Useful as a counter-example for any layout manager that does not
  re-check post-render bbox.

### W4. gold_heat_block_sample_prep (off-page + clipped glassware)

![gold_heat_block_sample_prep](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_heat_block_sample_prep.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_heat_block_sample_prep.png`
- Scene: gold_heat_block_sample_prep
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 1 off_page placement, multiple clipped_by_parent HARD FAILs per
  `visual_audit.md`.
- Rationale: heat block placement walks off the scene; sample-prep tools fight for the
  remaining region. Demonstrates the small-region/large-tool collision the layout
  manager must prevent.

### W5. gold_hood_prep (clipped glassware in hood frame)

![gold_hood_prep](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_hood_prep.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_hood_prep.png`
- Scene: gold_hood_prep
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 0 off_page, multiple clipped_by_parent HARD FAILs on glassware and aspect
  HARD FAILs per `visual_audit.md`.
- Rationale: hood frame fits but the bottles inside are aspect-distorted enough to
  read as a different shape (square not tall). Violates the never-crop / never-distort
  rule in `docs/PRIMARY_DESIGN.md`.

### W6. gold_microscope_slide_prep (off-page + crop)

![gold_microscope_slide_prep](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_microscope_slide_prep.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_microscope_slide_prep.png`
- Scene: gold_microscope_slide_prep
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 1 off_page placement, multiple clipped_by_parent HARD FAILs per
  `visual_audit.md`.
- Rationale: microscope placed too far down or right; slide-prep tools clipped against
  region edges.

### W7. gold_mixed_bench (composition collision)

![gold_mixed_bench](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_mixed_bench.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_mixed_bench.png`
- Scene: gold_mixed_bench
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 1 off_page placement, multiple clipped_by_parent HARD FAILs per
  `visual_audit.md`.
- Rationale: shows what a "mixed bench" looks like when the layout manager has no
  priority signal; small tools and large instruments compete for the same region.

### W8. gold_plate_reader_assay (instrument + plate crop)

![gold_plate_reader_assay](../../../../experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_plate_reader_assay.png)

- Source: `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/gold_plate_reader_assay.png`
- Scene: gold_plate_reader_assay
- Scene class: composition (stress synthetic)
- Viewport: 1200x900
- Failure: 1 off_page placement, multiple clipped_by_parent HARD FAILs per
  `visual_audit.md`.
- Rationale: plate reader (instrument) and 96-well plate are both large; one of them
  gets clipped. Demonstrates that the closed footprint set is necessary; not every
  scene can hold two large-equipment items.

### W9. stress_dense_clutter_004 (synthetic stress, dense_clutter class)

![stress_dense_clutter_004](../../../../experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/stress_dense_clutter_004.png)

- Source: `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/stress_dense_clutter_004.png`
- Scene: stress_dense_clutter_004
- Scene class: dense_clutter (stress synthetic)
- Viewport: 1200x900 (container_C2_400_292 sweep)
- Failure: cluttered placements producing clipped_by_parent and svg_svg_overlap; from
  the stress corpus where 100% of 100 scenes FAIL.
- Rationale: example of a fully synthetic dense_clutter stress case. Per onboarding
  section 5, stress 100% FAIL is evidence the generator works, not that the layout is
  broken; included here to show what an out-of-policy density actually renders as.

### W10. stress_many_small_tools_scene_002 (synthetic stress, many tools)

![stress_many_small_tools_scene_002](../../../../experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/stress_many_small_tools_scene_002.png)

- Source: `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/stress_many_small_tools_scene_002.png`
- Scene: stress_many_small_tools_scene_002
- Scene class: many_small_tools_scene (stress synthetic; not in the production closed
  scene-class set)
- Viewport: 1200x900 (container_C2_400_292 sweep)
- Failure: many small tools placed without spacing policy; aspect_distorted_HF on
  multiple objects per the precheck.
- Rationale: example of a synthetic class that probes the small-tool footprint
  vocabulary. Not a production scene class; included as the worst-case for an unbounded
  small-tool count.

## 4. Source path inventory

Read-only inventory of every directory I scanned. Counts approximate (excluding
audit JSON/MD).

| Path | Kind | Contents |
| --- | --- | --- |
| `experiments/css_native_layout/showcase/` | interactive HTML demos | 13 .html files; 0 .png |
| `experiments/css_native_layout/showcase/concepts/` | concept storyboards | 3 .html files; 0 .png |
| `experiments/css_native_layout/showcase/label_policies/` | label policy demos | .html files; 0 .png |
| `experiments/css_native_layout/templates/` | hand-authored scene templates | source HTML; 0 .png (renders consumed by precheck) |
| `experiments/css_native_layout/scenes/` | NEW2 scene structures | source HTML; 0 .png |
| `experiments/css_native_layout/spike_fixtures/` | runtime spike dumps | HTML and JSON; 0 .png |
| `experiments/css_native_layout/no_crop_audit/` | crop detector | inspect.mjs and no_crop_audit_results.json; 0 .png |
| `experiments/css_native_layout/stress_results/precheck_b1_final/` | NEW0 baseline run | 10 .png plus visual_audit.json/.md (best-of for 1200x900) |
| `experiments/css_native_layout/stress_results/precheck_b1_candidate/` | NEW0 candidate run | 10 .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_baseline/` | original baseline | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_post_trial5_gold/` | trial5 gold synthetics | 10 gold_*.png plus audit (worst-of by design) |
| `experiments/css_native_layout/stress_results/precheck_batch5_final/` | batch5 finals | 100+ .png across template/composition/stress classes |
| `experiments/css_native_layout/stress_results/precheck_batch5_final2/` | batch5 alt | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch5_final3/` | batch5 alt | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch4_aa/` | batch4 cap results | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch3_b/` | batch3 generator caps | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch3_b_realistic/` | batch3 realistic | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_alt2/` | batch2 alt2 | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_alt2_scoped_test2/` | batch2 alt2 scoped | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_alt2_scoped_test3/` | batch2 alt2 scoped | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_container_baseline_subset/` | container baseline subset | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C1_380_272/` | container sweep C1 | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/` | container sweep C2 (sample used in W9, W10) | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_n/` | batch2 N | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_n_canonical/` | batch2 N canonical | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_n_subset_test/` | batch2 N subset | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch2_alt2_subset/` | batch2 alt2 subset | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_batch5_a/`, `precheck_batch5_clean/`, `precheck_batch5_test2/`, `precheck_batch5_test3/`, `precheck_batch5_test4/` | batch5 variants | .png plus audit |
| `experiments/css_native_layout/stress_results/precheck_post_trial5/` | trial5 finals | .png plus audit |
| `experiments/css_native_layout/stress_results/scorecard_batch1/`, `scorecard_batch2_alt2/`, `scorecard_batch2_n/`, `scorecard_batch2_n_canonical/`, `scorecard_batch5_a/`, `scorecard_batch5_corpus_v1/` | scorecard runs | mostly .json/.md |
| `experiments/css_native_layout/stress_results/batch2_d_gallery/before/`, `batch2_d_gallery/after/` | batch2 D gallery mirror | gold_*.png and stress_*.png (duplicates of other runs) |
| `experiments/css_native_layout/stress_results/batch3_f_gallery/` | batch3 F gallery | HTML contact sheets only |
| `experiments/css_native_layout/stress_results/batch4_gallery/` | batch4 gallery | HTML contact sheets only |
| `experiments/css_native_layout/stress_results/contact_sheets/` | curated contact sheets | best_20.html / worst_20.html (reference `test-results/` paths that are gitignored and empty in working tree) |
| `experiments/css_native_layout/stress_results/no_crop_round2_phase1/`, `no_crop_round2_phase1_v2/` | no-crop round-2 | .png plus audit |
| `experiments/css_native_layout/stress_results/label_policy_runs/`, `viewport_runs/`, `trial_logs/`, `phase1_dryrun_evidence/` | misc stress runs | mix of .png and audit |
| `docs/active_plans/new0_new1_layout_rebuild_assets/` | brief-listed path | NOT PRESENT IN REPO (see section 5) |
| `docs/active_plans/no_crop_audit_assets/`, `new2_no_crop_audit_assets/`, `new3_layout_stress_reliability_assets/` | brief-listed paths | NOT PRESENT under active plans (see section 5) |
| `docs/archive/plan-reset-2026-05-22/current_css_native_layout_manager_status_report_assets/` | archived assets bundle | 21 .png (lane_a_gallery_*, lane_b_runtime_*, lane_i_*, stress_composition_*) |
| `docs/archive/plan-reset-2026-05-22/new3_layout_stress_reliability_assets/` | archived assets bundle | 6 .png (lane_i_* before/after) |
| `test-results/` | runtime-only outputs | DOES NOT EXIST in working tree (gitignored; regenerated by `bash experiments/css_native_layout/run_precheck.sh`) |

## 5. Notes on missing evidence

- `docs/active_plans/new0_new1_layout_rebuild_assets/` is referenced in the brief but
  does not exist in the working tree. The archived equivalents live under
  `docs/archive/plan-reset-2026-05-22/current_css_native_layout_manager_status_report_assets/`
  (8 lane_a_gallery_*.png and 5 stress_composition_*.png from the same round). I did
  not use them in the BEST set because `precheck_b1_final/` is the canonical baseline
  cited in the onboarding section 5.
- `docs/active_plans/no_crop_audit_assets/`, `new2_no_crop_audit_assets/`, and
  `new3_layout_stress_reliability_assets/` (root-level under active plans) are
  referenced in the brief but do not exist in the working tree. The
  `new3_layout_stress_reliability_assets/` directory exists only under
  `docs/archive/plan-reset-2026-05-22/`; its contents (lane_i_* before/after) are not
  layout best/worst exemplars (they are behavior-cycle screenshots).
- `test-results/` does not exist in the working tree (gitignored per repo policy). The
  `contact_sheet_best.html` and `worst_20.html` under
  `experiments/css_native_layout/stress_results/contact_sheets/` reference
  `../../../../test-results/new3_stress_batch1/audit/*.png`, which would resolve to a
  path that does not exist in the working tree. I did not use those references; I
  pulled directly from the persistent `precheck_*` directories that have committed
  PNGs.
- 1920x1080 production-viewport precheck output: per the onboarding doc, this is the
  open Workstream 2 blocker and the regenerated baseline lives under
  `test-results/new0_css_native/audit/` (also gitignored). No 1920x1080 PNGs are
  available in the working tree to curate from.
- `precheck_post_trial5_gold/` is the synthetic gold set; per the onboarding, gold
  scenes are not pedagogically valid protocols. Using them as the WORST source is
  intentional: they exercise the precheck hard-fail signals the next manager must
  design against, even if no production scene would ship them.
