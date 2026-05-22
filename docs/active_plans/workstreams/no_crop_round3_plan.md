# No-crop Round 3 plan (WP-F1 synthesis)

Date: 2026-05-21
HEAD: 8795d25
Status: DONE_WITH_CONCERNS
Author note: Doc-only synthesis. No code, CSS, YAML, or contract edits.
No commits. Inputs are the five landed M1 deliverables and the two
surviving Round 2 reference docs.

Amended 2026-05-21 (sizing-source reconciliation): Round 3 is reframed
from "footprint vocabulary" to **sizing-source reconciliation** per
[no_crop_round3_sizing_source_reconciliation.md](../decisions/no_crop_round3_sizing_source_reconciliation.md).
The durable sizing chain is
`scene object -> asset_name -> ASSET_SPECS/default_width -> display_width_cm or width_scale -> layout engine computed box -> renderer preserves SVG aspect ratio`,
owned by [SCALING_MODEL.md](../../specs/SCALING_MODEL.md),
[LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md), and
[SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md). The
ready-to-fix table is reordered to follow the user's 7-step
fix-priority order: asset mapping / SVG existence, SVG viewBox
correctness, `ASSET_SPECS.default_width`, object `display_width_cm`,
item `width_scale`, zone placement / overload, renderer CSS preserving
aspect ratio. Exp 5 is reframed: it is no longer "permanent footprint
vocab adoption (cap=4)" but instead "sizing-source reconciliation:
investigate per-object failure cause through the scaling-model chain
before considering any CSS class adoption". Adoption of any permanent
`footprint--*` class remains user-gated and additionally requires
proof through the scaling-model chain per the WS-E amendment. No
permanent class is adopted by this plan. The "WS-E permanent classes"
language in this file is superseded; all four candidates are
experiment-local shims pending the gate in
[no_crop_sizing_source_reconciliation.md](no_crop_sizing_source_reconciliation.md)
"Gate for promoting an experiment-local shim to a permanent class".
Measurements, counts, and baselines below are unchanged (templates 41
/ gold 78 baseline; templates 21 / gold 38 post-hybrid).

Amended 2026-05-21 (vocabulary correction): Vocabulary corrected per
[no_crop_round3_architecture_vocabulary_clarification.md](../no_crop_round3_architecture_vocabulary_clarification.md).
Round 3 fixes are framed as scene / scene-object / SVG-asset / footprint
driven, not region-driven. `experiments/css_native_layout/regions/*.yaml`
is experiment-local scaffolding for a static visual-test renderer; it is
not project architecture or canonical scene YAML
([SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md)).
Exp 3 / Exp 5 are reconstructions of an experiment-local static
visual-test renderer, not adoption of a "region architecture".
Measurements, counts, and baselines below are unchanged.

## Round 3 must answer

Any Round 3 fix that touches a cropping symptom must answer these
three questions before proposing CSS or vocabulary changes:

1. Why did the current sizing model fail to preserve the SVG?
2. Is the failure in asset data, layout data, renderer CSS, or static
   harness divergence?
3. What is the smallest fix that makes the real engine preserve the
   full SVG?

If a workstream report cannot answer all three, it has not yet
diagnosed the cropping cause through the durable sizing chain. A
CSS-class proposal is not a substitute for that diagnosis. See
[no_crop_round3_sizing_source_reconciliation.md](../decisions/no_crop_round3_sizing_source_reconciliation.md)
for the full reconciliation note.

## Purpose

Tie together the M1 deliverables (WS-A retry, WS-C audit, WS-D harness
audit, WS-E vocab proposal, WS-G baseline) into:

1. A priority-ordered Round 3 experiment list.
2. A ready-to-fix table with first command, scope, expected crop
   reduction, files touched, and user-gated flag per row.
3. A source-of-truth table that names the live document for each claim
   and which older sources it supersedes.

The plan is anchored on the WS-G baseline (templates 41, gold 78,
combined 119 visible crops at HEAD 8795d25) and the WS-A retry result
(Strategy C hybrid: templates 21, gold 38). Round 2 historical figure
of 101 (28 + 73) is SUPERSEDED by WS-G.

## Recommended Round 3 experiments (priority order)

### Exp 1: apply Strategy C hybrid CSS to templates

- Goal: land the WS-A winning lever as the first reversible Round 3
  step. Templates 41 -> 21 (-49%); gold 38 (-51% off the baseline of
  78). Diff is 12 lines, restricted to `.placement` and
  `.region--work_surface` `overflow` / `max-height`.
- Prepared diff: `test-results/no_crop_round3_static_template_repair/hybrid_bench.css.diff`.
- Reversibility: HIGH. Single CSS file, one `git checkout --` reverts.
- User-gated: NO (reversible, no new vocabulary).
- Dependencies: none.

### Exp 2: WS-C Bucket A low-risk asset renames

- Goal: close the cheapest missing-asset gaps surfaced by WS-C without
  authoring new artwork. Use `git mv` to rename
  `assets/equipment/96well_pcr_plate.svg` to
  `assets/equipment/well_plate_96.svg` (single Bucket-A row resolved)
  and add base-name aliases for `ethanol_bottle`, `pbs_bottle`,
  `media_bottle`, `trypan_blue_bottle`, `conical_15ml`, and
  `sharps_container` by `git mv`-ing one state variant (e.g. `*_empty`)
  to the bare-name file, or by emitting an unstyled base SVG copied
  from the empty variant.
- Reversibility: HIGH. Each rename is a single `git mv` reversed by its
  inverse `git mv`.
- User-gated: NO for the rename direction (reversible filesystem move).
  Authoring new SVG artwork for the placeholder roster (Bucket C/E, 11
  rows) is OUT OF SCOPE for this experiment and gated separately.
- Dependencies: none. Independent of Exp 1.

### Exp 3: reconstruct static visual-test renderer using experiment-local footprint mapping (WS-D Option 2)

- Goal: rebuild
  `experiments/css_native_layout/stress_generators/render_stress_to_html.py`
  as an experiment-local static visual-test renderer that emits
  `<div class="placement footprint--<kind>">` driven by an explicit
  experiment-local footprint mapping (today:
  `experiments/css_native_layout/regions/<scene>.yaml`; preferred
  future shape:
  `experiments/css_native_layout/object_footprints.yaml`), replacing
  the prior hardcoded `FOOTPRINT_KEYWORDS` dict. This is WS-D's
  Recovery Option 2 framed as "static visual-test renderer recovery",
  not "region architecture adoption". The mapping artifact is
  experiment-local scaffolding (see
  [no_crop_round3_architecture_vocabulary_clarification.md](../no_crop_round3_architecture_vocabulary_clarification.md));
  it is not canonical scene YAML.
- Effect: closes the WS-D finding that none of the three render paths
  consume `kind_to_footprint`. Without this, every WS-E permanent class
  is paper-only (WS-E "Application path" section).
- Reversibility: MEDIUM. The renderer is new committed code, but it
  only writes into `experiments/css_native_layout/stress_scenes/rendered/`
  which is a derived artifact directory.
- User-gated: YES (new committed code surface; precedes any permanent
  vocabulary adoption per WS-E).
- Dependencies: must precede Exp 4 and Exp 5.

### Exp 4: adopt WS-E permanent classes 1-3 (vocabulary only)

- Goal: adopt `footprint--tall-glassware`, `footprint--portrait-tool`,
  and `footprint--landscape-plate` as the three permanent classes (cap
  4, one slot held in reserve). Vocabulary decision only; CSS rule
  additions defer until Exp 3 application path lands.
- Effect: once Exp 3 is live, regenerate gold scenes with the new
  class assignments and measure delta against the 38 post-hybrid
  baseline. WS-E expected reductions are upper-bound estimates; the
  three classes together target 15-24 of the 21-crop template residual
  and an analogous slice of gold.
- Reversibility: LOW for vocabulary, HIGH for CSS rules until they
  ship.
- User-gated: YES (permanent vocabulary change per WP-E1 boundaries
  and Author YAML vocabulary lock in `docs/specs/SPEC_DESIGN_CHECKLIST.md`).
- Dependencies: Exp 3 must land first.

### Exp 5: sizing-source reconciliation (per-object failure investigation)

Amended 2026-05-21: this experiment is reframed from "prototype
experiment-only `footprint--instrument-wide`" to "sizing-source
reconciliation: investigate per-object failure cause through the
scaling-model chain before considering any CSS class adoption".

- Goal: for each object that still crops after Exp 1-4, walk the
  durable sizing chain
  (`asset_name` -> SVG `viewBox` -> `ASSET_SPECS.default_width` ->
  `display_width_cm` -> `width_scale` -> zone placement -> renderer
  CSS) and identify which link is wrong. Produce per-object
  diagnoses, not a CSS class proposal. See
  [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) "How
  sizing works" and
  [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) "Tuning
  order" for the canonical order.
- Effect: each crop is either resolved by a fix in asset data, layout
  data, or renderer CSS, OR is shown to be unrepresentable by the
  existing sizing model. Only the second outcome justifies a future
  permanent `footprint--*` class, gated by
  [no_crop_sizing_source_reconciliation.md](no_crop_sizing_source_reconciliation.md)
  "Gate for promoting an experiment-local shim to a permanent class".
- Reversibility: HIGH for the diagnoses (documentation only); per-
  object fixes are bounded scope (one SVG or one YAML each).
- User-gated: YES for any CSS class addition (per the gate); NO for
  the diagnoses themselves.
- Dependencies: Exp 3 lands first (renderer feedback loop), then
  parallelizable with Exp 4 and Exp 6.

### Exp 6: region and parent overflow trim on gold scenes

- Goal: re-apply the Strategy C hybrid on gold and address the newly
  surfaced `region_overflow` (0 -> 20) and `svg_svg_overlap` (0 -> 15)
  honestly. Scene-by-scene density audit; decide between shrinking
  dense placements, growing region rows, or moving items to other
  regions. This is the "gold repair workstream" WS-A explicitly queued.
- Reversibility: HIGH per-scene; each region or card change is a
  bounded CSS edit.
- User-gated: NO for measurement runs; YES for any change that touches
  diagnostic semantics (e.g. relaxing the `region_overflow` check).
- Dependencies: Exp 1 in place; runs in parallel with Exp 3-5.

### Exp 7: final visual acceptance report

- Goal: after Exp 1-6, run precheck on the full 20-scene corpus and
  produce `docs/active_plans/workstreams/no_crop_round3_visual_acceptance_report.md`
  with per-scene before/after screenshots, the new baseline crop
  totals, and an explicit pass/fail call against the Round 3 goal of
  driving the combined corpus below the Round 2 figure (101) and ideally
  toward zero.
- User-gated: NO (reporting only).
- Dependencies: all prior experiments concluded or explicitly deferred.

## Ready-to-fix table

Crop-reduction estimates are upper bounds taken from WS-A (measured)
and WS-E (estimated). Reductions for sizing-source reconciliation
rows (rows 3, 8) are conditional on the prior renderer-recovery row
(row 7) landing.

Reordered 2026-05-21 to follow the user's 7-step fix-priority order
(asset mapping / SVG existence -> SVG viewBox -> `ASSET_SPECS.default_width`
-> object `display_width_cm` -> item `width_scale` -> zone placement /
overload -> renderer CSS preserving aspect ratio). Numeric estimates,
file paths, and reversibility classifications are preserved verbatim
from the prior table; only ordering and the Exp 5 row scope change.

|   # | Fix-priority bucket                                                                                           | Candidate fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Scope                                                                                | Expected crop reduction                                                                                | Files touched                                                                                                         | User-gated                                                                                                            | First command to run                                                                                                                                                                                                         |
| --: | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | asset mapping / SVG existence                                                                                 | Rename `assets/equipment/96well_pcr_plate.svg` to `well_plate_96.svg` to satisfy the dev-smoke `well_plate_96` mapping (WS-C Bucket A row 12)                                                                                                                                                                                                                                                                                                                                                 | One asset filename                                                                   | Resolves 1 of 12 Bucket A rows; closes 1 visible crop on `well_plate_96_zoom_check` smoke              | `assets/equipment/96well_pcr_plate.svg` -> `assets/equipment/well_plate_96.svg`                                       | NO                                                                                                                    | `git mv assets/equipment/96well_pcr_plate.svg assets/equipment/well_plate_96.svg`                                                                                                                                            |
|   2 | asset mapping / SVG existence                                                                                 | Add base-name SVG aliases for `ethanol_bottle`, `pbs_bottle`, `media_bottle`, `trypan_blue_bottle`, `conical_15ml`, `sharps_container` (WS-C Bucket A bottle/conical/sharps sub-bucket, 6 rows) by `git mv`-ing the `*_empty` variant to the bare name and re-deriving the `*_empty` from the recipe layer                                                                                                                                                                                    | Six asset filenames                                                                  | Resolves 6 of 12 Bucket A rows; lifts 6 missing-asset placeholders out of every scene that places them | 6 SVGs under `assets/equipment/`                                                                                      | NO                                                                                                                    | `git mv assets/equipment/ethanol_bottle_empty.svg assets/equipment/ethanol_bottle.svg` (then repeat for pbs, media, trypan_blue, conical_15ml, sharps_container)                                                             |
|   3 | SVG viewBox + `ASSET_SPECS.default_width` + `display_width_cm` + `width_scale` (sizing-source reconciliation) | **Sizing-source reconciliation: investigate per-object failure cause through scaling-model chain before considering any CSS class adoption.** For each object still cropping after rows 1-2 and 7-8, walk the chain `asset_name` -> SVG `viewBox` -> `ASSET_SPECS.default_width` -> `display_width_cm` -> `width_scale` and identify the broken link. Produce per-object diagnoses, not CSS classes. Any permanent `footprint--*` class proposal requires per-object proof per the WS-E gate. | Per-object investigation (no CSS adoption in this row)                               | Unknown until per-object diagnoses complete; bounded by residual crops after rows 1-2, 7-8             | `src/asset_specs.ts`, `content/objects/<kind>/<object_name>.yaml`, `assets/equipment/*.svg`, scene YAML `width_scale` | YES (for any CSS class adoption arising from the investigation; per-object asset/YAML fixes themselves are not gated) | (per object) inspect `src/asset_specs.ts`, then `content/objects/`, then `assets/equipment/<asset>.svg` `viewBox`, then scene YAML; see [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) "How sizing works"                  |
|   4 | zone placement / overload                                                                                     | Re-apply Strategy C hybrid CSS on gold scenes and triage newly surfaced hard fails (region_overflow 0 -> 20, svg_svg_overlap 0 -> 15) per scene                                                                                                                                                                                                                                                                                                                                               | 10 gold scenes (CSS + per-scene region rows)                                         | Templates unchanged; gold residual 38 -> target < 20                                                   | `experiments/css_native_layout/styles/bench.css` (additive scene-scoped rules)                                        | NO                                                                                                                    | `node experiments/css_native_layout/precheck.mjs 'experiments/css_native_layout/stress_scenes/rendered/gold_*.html' --out test-results/no_crop_round3_gold_repair/baseline --annotate off`                                   |
|   5 | renderer CSS preserving aspect ratio                                                                          | Apply Strategy C hybrid CSS (`.placement` + `.region--work_surface` overflow visible, drop `max-height: 100%`)                                                                                                                                                                                                                                                                                                                                                                                | Templates + gold (CSS only)                                                          | Templates 41 -> 21 (-20, -49%); gold 78 -> 38 (-40, -51%)                                              | `experiments/css_native_layout/styles/bench.css`                                                                      | NO                                                                                                                    | `git apply test-results/no_crop_round3_static_template_repair/hybrid_bench.css.diff`                                                                                                                                         |
|   6 | renderer CSS preserving aspect ratio (experiment-local shim, gated)                                           | Ship `footprint--instrument-wide` as an experiment-local test-harness shim behind the renderer recovery (row 7); measure delta vs `instrument` and `large-equipment`. **Not a permanent class** unless the WS-E gate is satisfied. Must be labeled "test harness only, not production schema".                                                                                                                                                                                                | Experiment-only CSS block; not permanent                                             | 3-5 crops on `electrophoresis_bench`, `gold_plate_reader_assay`                                        | `experiments/css_native_layout/styles/bench.css` (experiment-only block); renderer mapping                            | YES (any CSS class addition requires scaling-model proof of inadequacy per WS-E amendment)                            | (after row 7) re-run gold precheck and diff against pre-class baseline                                                                                                                                                       |
|   7 | static harness recovery (experiment-local)                                                                    | Reconstruct a static visual-test renderer (`render_stress_to_html.py`) with ALIGN against an explicit experiment-local footprint mapping (today `experiments/css_native_layout/regions/*.yaml` `kind_to_footprint`; preferred future shape `experiments/css_native_layout/object_footprints.yaml`) (WS-D Option 2; precondition for any permanent class adoption; experiment-local scaffolding, not region architecture)                                                                      | New committed Python script under `experiments/css_native_layout/stress_generators/` | None directly; unlocks Exp 6 + Exp 7 reductions                                                        | `experiments/css_native_layout/stress_generators/render_stress_to_html.py` (new)                                      | YES                                                                                                                   | `git ls-files 'experiments/css_native_layout/regions/*.yaml'` (list inputs before drafting the renderer)                                                                                                                     |
|   8 | reporting                                                                                                     | Generate final visual acceptance report covering all 20 scenes with before/after screenshots and combined crop total vs Round 2 (101) and WS-G baseline (119)                                                                                                                                                                                                                                                                                                                                 | Reporting only                                                                       | Reporting; no direct reduction                                                                         | `docs/active_plans/workstreams/no_crop_round3_visual_acceptance_report.md` (new)                                      | NO                                                                                                                    | `node experiments/css_native_layout/precheck.mjs 'experiments/css_native_layout/templates/*.html' 'experiments/css_native_layout/stress_scenes/rendered/gold_*.html' --out test-results/no_crop_round3_final --annotate off` |

User-gated rows: 4 (row 3 sizing-source reconciliation for any CSS
class arising from it, row 6 instrument-wide shim, row 7 renderer
reconstruction, plus any future permanent class promotion through the
WS-E gate).
Reversible rows: row 1, row 2 (asset renames), row 4, row 5, row 8.
Total rows: 8.

Note: the prior "adopt three WS-E permanent classes" row is removed
from this table per the sizing-source reconciliation; the three
candidate classes (`footprint--tall-glassware`,
`footprint--portrait-tool`, `footprint--landscape-plate`) are
downgraded to experiment-local shims in
[no_crop_sizing_source_reconciliation.md](no_crop_sizing_source_reconciliation.md)
pending per-object proof through the gate. They may be re-added to
this table only after the gate is satisfied.

## Source-of-truth table

| Claim                                                           | Current source of truth                                                                                                                                                  | Superseded sources                                                                                                                                  | Scope                                                                                   | Screenshot evidence                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Templates baseline visible_crops                                | 41, WS-G `no_crop_current_render_sanity.md` (HEAD 8795d25)                                                                                                               | Round 2 28 (in `no_cropped_svg_round2_visual_acceptance_report.md`)                                                                                 | 10 templates under `experiments/css_native_layout/templates/`                           | `test-results/no_crop_fresh_manager_sanity/templates/*.png` (10)                                       |
| Gold baseline visible_crops                                     | 78, WS-G `no_crop_current_render_sanity.md`                                                                                                                              | Round 2 73 (in `no_cropped_svg_round2_visual_acceptance_report.md`)                                                                                 | 10 gold scenes under `experiments/css_native_layout/stress_scenes/rendered/gold_*.html` | `test-results/no_crop_fresh_manager_sanity/gold/*.png` (10)                                            |
| Combined 20-scene baseline                                      | 119, WS-G `no_crop_current_render_sanity.md`                                                                                                                             | Round 2 101 (28 + 73)                                                                                                                               | Templates + gold                                                                        | `test-results/no_crop_fresh_manager_sanity/INDEX.html`                                                 |
| Winning lever post-hybrid (templates)                           | 21, WS-A `no_crop_round3_static_template_repair_report.md`                                                                                                               | Round 2 28; WS-G 41 (the pre-hybrid figure)                                                                                                         | Templates only, Strategy C applied                                                      | `test-results/no_crop_round3_static_template_repair/hybrid_templates/*.png`                            |
| Winning lever post-hybrid (gold)                                | 38, WS-A `no_crop_round3_static_template_repair_report.md`                                                                                                               | Round 2 73; WS-G 78 (pre-hybrid figure)                                                                                                             | Gold only, Strategy C applied                                                           | `test-results/no_crop_round3_static_template_repair/hybrid_gold/*.png`                                 |
| Missing-asset issue count                                       | 39 (12 + 16 + 11 across A, B, C/E), WS-C `no_crop_missing_asset_audit.md`                                                                                                | "~30" estimate in WS-A dispatch text; 65-row brief in `round3_missing_asset_repair_brief.md`                                                        | All `assets/equipment/` + `content/objects/` + `content/base_scenes/`                   | not screenshot-evidenced; filesystem audit only                                                        |
| Render-path consumption of `kind_to_footprint`                  | NONE across all three paths, WS-D `no_crop_render_harness_audit.md`                                                                                                      | `current_css_native_layout_manager_status_report.md` section 7 claim "css_native_adapter.ts reads kind_to_footprint" (unsupported by source)        | Production runtime, static template, stress static-HTML                                 | n/a (code audit)                                                                                       |
| Existence of `render_stress_to_html.py`                         | MISSING, never tracked in git, WS-D `no_crop_render_harness_audit.md`                                                                                                    | References in `new3_batch5_stress_pipeline_alignment_options.md`, `git_incident_4e2c709_inventory.md`, and prior plan docs treating it as canonical | `experiments/css_native_layout/stress_generators/`                                      | n/a (absence finding)                                                                                  |
| Footprint class vocabulary recommendation                       | 3 permanent + 1 experiment-only, WS-E `no_crop_sizing_source_reconciliation.md (renamed 2026-05-21 from no_crop_footprint_vocab_proposal.md)` (cap 4, one slot reserved) | None; first canonical statement                                                                                                                     | All four WS-E candidate classes                                                         | per-class evidence cites WS-A hybrid screenshots                                                       |
| Strategy C reject decisions (A, B)                              | REJECT both, WS-A `no_crop_round3_static_template_repair_report.md`                                                                                                      | None; prior Round 2 reports did not evaluate these levers                                                                                           | Templates (precheck-measured)                                                           | `test-results/no_crop_round3_static_template_repair/strategy_a/`, `.../strategy_b/`, `.../strategy_c/` |
| Gold honest-failure increase (region_overflow, svg_svg_overlap) | region_overflow 0 -> 20; svg_svg_overlap 0 -> 15, WS-A `no_crop_round3_static_template_repair_report.md`                                                                 | None; previously masked by `.placement { overflow: hidden }`                                                                                        | 10 gold scenes post-hybrid                                                              | `test-results/no_crop_round3_static_template_repair/hybrid_gold/visual_audit.json`                     |
| Bottom-of-viewport residuals (template)                         | 21 crops in 8 of 10 templates listed by scene, WS-A `no_crop_round3_static_template_repair_report.md`                                                                    | None; first per-scene residual inventory                                                                                                            | Templates only, post-hybrid                                                             | `test-results/no_crop_round3_static_template_repair/hybrid_templates/*.png`                            |

## Boundaries and concerns

Boundaries observed in this plan:

- No code edits, no CSS edits, no YAML edits, no contract edits.
- No commits; ASCII-only markdown.
- No new class names introduced in production. Class names appear in
  this plan as labels for proposed vocabulary already named in WS-E.
- Forward-only writing: this file is the only new artifact and lives
  under `docs/active_plans/workstreams/`.

Concerns flagged forward:

1. WS-D Option 2 (Exp 3) is the bottleneck for any vocabulary-driven
   reduction. Until it lands, Exp 4-7 are reporting-only.
2. WS-A's `region_overflow` and `svg_svg_overlap` increases on gold are
   honest reports of pre-existing layout density; they were masked, not
   created, by Strategy C. Exp 6 handles them per-scene.
3. WS-C's Bucket A "subpart/background asset_name" sub-bucket
   (`well`, `bench_workspace_bg`, `cell_counter_workspace_bg`,
   `hood_workspace_bg`, `microscope_view_bg`, 5 rows) may not require
   any SVG at all if the renderer covers them via composite/CSS-native
   paths. Confirming this requires reading
   `src/scene_runtime/render/apply.ts` and the layout adapter; not in
   scope for this plan.
4. WS-G UNRESOLVED production runtime path is acknowledged but not
   addressed by Round 3 experiments; flagged to a separate workstream
   that owns `dist/` build.
5. The fourth WS-E permanent class slot is held in reserve for any new
   geometry surfaced during Exp 6.

## Source files read

- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_round3_static_template_repair_report.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_missing_asset_audit.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_render_harness_audit.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_current_render_sanity.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_sizing_source_reconciliation.md (renamed 2026-05-21 from no_crop_footprint_vocab_proposal.md)`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/round3_missing_asset_repair_brief.md` (cross-reference)

Round 2 reference docs cited via WS-E and WS-G (not re-opened in this
session):

- `docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md`
- `docs/active_plans/no_cropped_svg_round2_experiment_scoreboard.md`

## Handoff

- Status: DONE_WITH_CONCERNS
- Artifact path: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/workstreams/no_crop_round3_plan.md`
- Top ready-to-fix row: row 1 (apply Strategy C hybrid CSS via
  `git apply test-results/no_crop_round3_static_template_repair/hybrid_bench.css.diff`,
  measured templates -49% / gold -51%, reversible, not user-gated).
- User-gated rows: 2 (rows 5 and 6).
- Reversible rows: 6 (rows 1-4, 7, 8).
- Total rows: 8 ready-to-fix entries; 8 source-of-truth claims.
- Concerns: WS-D Option 2 must precede permanent class adoption;
  honest hard-fail surfacings on gold are pre-existing; subpart and
  background `asset_name` rows may not require new SVGs at all;
  production runtime path UNRESOLVED upstream.
- Source files read: enumerated above.
