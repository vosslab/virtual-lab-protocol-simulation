# Changelog

## 2026-05-18

### Additions and New Features

- **Material overlay vocabulary plan CLOSED: variant-collapse arc complete**
  Four-milestone plan to retire the per-state liquid-fill SVG variant pattern
  (`<object>_empty.svg` / `<object>_filled.svg` / `<object>_with_<material>.svg`)
  in favor of a single base SVG per container plus a runtime liquid overlay
  driven from `material_name` + `material_volume` (or `held_material_name` +
  `held_material_volume`) via the bare-id `anchor_liquid_clip` /
  `anchor_liquid_bounds` rects. Arc summary:

  - M1 (WP-AUDIT-1): per-object base-asset + anchor-gap audit landed at
    [active_plans/material_overlay_audit_2026_05_18.md](active_plans/material_overlay_audit_2026_05_18.md).
  - M2 (WP-YAML-1, WP-YAML-2, WP-YAML-3): 40 object YAMLs collapsed across
    bottles, plates, waste, pipettes, flasks, and equipment chambers (22 +
    9 + 9). M2 (WP-ANCHORS-1, WP-ANCHORS-2): 13 new base SVGs authored
    (bottle / conical), 2 pipette anchors added, 2 electrophoresis-chamber
    SVGs created, `sero_pipette.svg` renamed to `serological_pipette.svg`;
    `tools/inject_liquid_anchors.py` helper landed. M2 (WP-VALIDATOR-1):
    `validation/yaml/object_validator.py` gains a hard variant-collapse
    vocabulary rule plus a soft asset-readiness check (8 new unit tests).
  - M3 (WP-PICKER-1): `tools/svg_picker/missing_targets.json` regenerated;
    `BASELINE_MISSING_COUNT` in `tests/test_object_asset_refs.py` lowered
    from 74 to 48 (final gap floor for this plan; the remaining 48 are
    out-of-scope bare bottles like `pbs_bottle`, `dmso_bottle`,
    `media_bottle` whose base SVGs are still in the picker queue, plus
    non-liquid hardware-state variants that close in a separate plan).
  - M4 (WP-DOCS-1, this entry): canonical rule documented in
    [specs/MATERIAL_CONVENTION.md](specs/MATERIAL_CONVENTION.md)
    "Canonical rule: single base SVG + runtime overlay"; new validator
    rule recorded in [specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md)
    "Visual states"; legacy variant pattern in
    [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) flagged with a pointer
    to the canonical rule; this plan archived to
    [archive/material_overlay_vocabulary.md](archive/material_overlay_vocabulary.md)
    via `git mv`.

- **NEW0 evidence package complete: 3 directions x 10 scenes, contact sheets, diagnostics doc, provisional recommendation**
  Produced a reproducible decision-ready evidence package for the NEW0 CSS-native layout experiment.
  All work confined to `experiments/css_native_layout/` and `test-results/new0_css_native/`;
  no production files modified.

  - Direction A (baseline 3-band horizontal) produced 1 PASS, 4 PASS_TEMPLATE, 5 WARN, 0 FAIL.
    Primary-object ratios on composition scenes: 0.6-2.7% (well_plate_96_zoom 92% PASS).
  - Direction B (stage/composition, primary gets flex-grow:1) produced 0 PASS, 4 PASS_TEMPLATE,
    6 WARN, 0 FAIL. Primary ratios improved to 13-31%; scene whitespace 62-83%.
    Regression: well_plate_96_zoom fell from 92% to 31.9% (below 70% zoom threshold).
  - Direction C (2-column instrument-first) produced 0 PASS, 4 PASS_TEMPLATE, 6 WARN, 0 FAIL.
    Best electrophoresis primary ratio (21.9%); empty left column in bench/hood scenes.

  Artifacts added:
  - 9 CSS files (6 new direction B/C files, tracked under .gitignore allow-list).
  - 20 new HTML templates (10 dir_b, 10 dir_c), including 2 stress scenes per direction.
  - 2 NEW0-format YAML scene manifests in `experiments/css_native_layout/scenes/`.
  - `experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md`: 12 diagnostic metrics, hard-fail vs advisory classification.
  - `docs/active_plans/new0_reproducible_evidence_package.md`: 10-section decision report.
  - `test-results/new0_css_native/contact_sheets/`: 16 contact sheet PNGs (10 base, 6 annotated).
  - `test-results/new0_css_native/gallery.html`: HTML gallery.
  - `_temp_contact_sheets.py`: Pillow-based contact sheet generator (scratch; safe to delete).

  Provisional recommendation: Direction B as primary candidate for general bench scenes;
  Direction C as the instrument-context variant. Direction A retired for composition use.
  Zoom threshold regression (B/C) is a CSS footprint gap, fixable before promotion.

- **NEW0-M0: Clean-room layout experiment initialized**
  Created `/experiments/css_native_layout/` as a fresh-start rebuild of the scene layout
  system from first principles. NEW0 is self-contained; it imports nothing from `src/`.
  The old 932-line layout engine is treated as a failed architecture and remains unmodified
  during NEW0 development. Core constraint: semantic regions own placement; CSS owns spacing
  within regions only. Objects cannot migrate across regions. Overflow is a test failure, not
  an invitation to wrap objects to a new row.

  Established clean-room boundary with:
  - `/experiments/css_native_layout/README.md` defining architecture constraints and milestones.
  - `tests/test_no_old_layout_imports.py` asserting zero imports from `src/` for any code file
    in the experiment (ES6 imports, CommonJS requires, and @ts-ignore near src imports all
    flagged and rejected).

  Historical experiments (EXP1/EXP2/EXP3, row+slot rollout, archived layout plans) are
  evidence only; they are not imported or continued. Milestones: M0 (guardrails) complete;
  M1 (region map) pending; M2-M4 (scenes, runtime, evidence) follow.

  Reference: `/Users/vosslab/.claude/plans/serene-stargazing-moore.md#M0`.

### Decisions and Failures

- **EXP2 RESCOPED: Prototype-level algorithm comparison, NOT production-fidelity benchmark**
  EXP2 (layout method benchmark report) measures six algorithms at synthetic-SVG level
  (each method outputs placement data; synthetic SVG scaffolds are rendered and measured).
  Report rescoped with banner clarifying: EXP2 is algorithm-prototype evaluation only.
  Production-render integration measurement lives at `_temp_layout_prechecks.mjs` (real DOM
  via Playwright). Evidence: PRIMARY_SPEC.md requires visible interaction evidence for
  mini-protocol completion; synthetic data does not meet spec gate.

  Rescope decision (manager judgment): EXP2 verdict (row-slot-capacity-wrap wins at
  prototype level) stands. Production adoption BLOCKED by precheck failures (545 real
  failures in 18 scenes). Recommendation updated: proceed with row-slot-capacity-wrap IF
  label-solver experiment succeeds; otherwise defer to post-Label-Solver phases.

  Artifacts: Updated `docs/active_plans/layout_method_benchmark_report_2026_05_18.md`
  with errata section, rescoped recommendations, and cross-link to production precheck
  summary.

- **Production precheck summary PUBLISHED**
  New document `docs/active_plans/production_precheck_summary_2026_05_18.md` consolidates
  real DOM measurements from 18 base + variant scenes. 545 total failures categorized as:
  C1 (object-object overlap) 212 (39%), C2 (label-object overlap) 203 (37%),
  C3 (label-label overlap) 125 (23%), C5 (row-overflow) 5 (1%).

  Label-related failures (C2 + C3 = 328, 60% of total) are the dominant failure mode.
  Object-overlap failures (C1 = 212, 39%) are secondary. Smallest next fix lane: label
  anti-collision solver (328 failures vs. 212 object-placement work).

  Evidence-backed findings: 545 real failures measured via Playwright DOM. Speculative:
  label-solver effectiveness (TBD by Task 4 experiment).

- **Label-solver experiment RUN: 78% estimated resolution on Y-axis offset**
  Executed label anti-collision analysis on 328 measured label failures from precheck.
  Strategy: For each label collision, assess whether +/-10/20/30px Y-axis offset could
  resolve it. Result:

  - C2 (label-object overlaps): 173 / 203 resolvable (85%)
  - C3 (label-label overlaps): 84 / 125 resolvable (67%)
  - **TOTAL: 257 / 328 (78%) estimated resolvable by Y-axis offset alone**

  Verdict: MODERATE signal. Label solver helps significantly but does not fully solve
  label failures. Expect 30-40% of label failures to resist offset-only solution (71
  unresolvable failures). Root cause of unresolvable failures: row-band heights may be
  too tight, or label overlap is X-axis-dominant (labels need side-by-side repositioning,
  not vertical stacking).

  Recommendation: Implement label anti-collision solver (Y-axis offset) in parallel with
  object-placement refinement. Expected outcome: 545 failures -> ~288 failures post-label-solver;
  then ~76 post-object-refinement (if ~70% of remaining C1+C3 resolvable by object work).

  Artifacts: `test-results/_label_solver_experiment/results.json`,
  `test-results/_label_solver_experiment/summary.md`.

- **EXP3 APPLIED RESULT: Label-solver FAILS 0% reduction (HYPOTHESIS REJECTED)**
  Implemented label anti-collision solver as applied post-processing pass using measured
  DOM label positions from precheck harness. Algorithm: For each label with C2 or C3
  collision, try Y-axis offsets (+10, -10, +20, -20, +30, -30px) in sequence; first
  offset clearing ALL collisions for that label wins; if none work, label unresolved.
  Processed labels greedy by collision count (most-collided first).

  **ACTUAL RESULT: 0 / 328 label failures cleared (0% reduction)**
  - C2 (label-object overlaps): 0 / 203 cleared (expected 173, 85%)
  - C3 (label-label overlaps): 0 / 125 cleared (expected 84, 67%)
  - All 76 labels remain unresolvable via Y-offset alone
  - 545 total failures unchanged (no improvement whatsoever)

  ROOT CAUSE ANALYSIS: Estimate assumed label collisions are independent positioning
  errors. Reality: label collisions are **symptoms** of underlying object-placement
  overlaps (C1, 212 failures). When two objects overlap, their labels inherit the
  conflict. Moving one label in Y does not separate both when they are embedded in
  overlapping objects. The solver succeeds technically (identifies which labels cannot
  be resolved) but the strategy is ineffective. Recommendation: **PIVOT away from label-solver
  post-processing**. Focus on C1 object-placement root cause via layout engine redesign,
  zone/object sizing audit, or constraint-based placement algorithm.

  Artifacts: `_temp_label_solver.mjs` (solver algorithm), `_temp_layout_prechecks_with_solver.mjs`
  (harness applying solver post-measurement), `test-results/_layout_prechecks_with_solver/results.json`
  (0% reduction evidence), `docs/active_plans/label_solver_validation_2026_05_18.md` (full analysis).

- **Layout method benchmark (EXP2) COMPLETE: row-slot-capacity-wrap + constraint-based WIN**
  Executed end-to-end benchmark comparing six coordinate-free layout methods
  against nine base scenes using real Playwright DOM measurements (not simulation).
  Benchmarked: legacy-zone (baseline), row-slot-naive, row-slot-capacity-wrap,
  region-slot, constraint-based, hybrid-region-label-solver. Metrics: object-object
  overlaps, label-object collisions, objects/labels outside viewport, zero-area
  detection.

  Results (9 scenes x 6 methods, composite score lower is better):
  - **TIED FOR BEST**: constraint-based (0), legacy-zone (0), row-slot-capacity-wrap (0)
  - **SECONDARY**: row-slot-naive (450; 45 labels off-screen on electrophoresis_bench + staining_bench)
  - **TERTIARY**: hybrid-region-label-solver (1200; 8 object-object overlaps in electrophoresis_bench + staining_bench)
  - **WORST**: region-slot (4620; 38 overlaps, 15 label collisions, 7 outside viewport)

  Recommendation: **proceed-with-winner (row-slot-capacity-wrap)** as production
  layout engine paired with Model B authoring (from Experiment 1). Constraint-based
  is backup direction if capacity-wrap gaps emerge in future. row-slot-naive is
  broken (acknowledged); do not ship without wrapping.

  Artifacts: `test-results/layout_benchmark/results.json` (full metrics),
  `summary.csv` (flat table), `gallery/index.html` (side-by-side screenshots,
  54 images), `docs/active_plans/layout_method_benchmark_report_2026_05_18.md`
  (full analysis, method definitions, failure classification, roadmap).

  Evidence: Three sample bbox measurements included in report (real DOM
  coordinates from `getBoundingClientRect()`, not estimates). Benchmark ran
  18 scenes (9 true base + 9 row+slot variants per git ls-files) in 65.2 seconds.

### Decisions and Failures

- **Row+slot layout prechecks: REAL DOM measurements confirm blockers**
  Replaced simulated `tests/playwright/layout_evidence_prechecks.mjs` with real
  Playwright-based script at `_temp_layout_prechecks.mjs` (repo root, gitignored).
  Script measures actual DOM bounding boxes for all 18 base scenes (9 zone + 9
  row+slot) via `page.evaluate()` and `getBoundingClientRect()`. Results:

  - **4 scenes PASS** (microscope_basic, imaging_bench, their row+slot variants, and cell_counter_basic_row_slot)
  - **13 scenes FAIL** with 547 total failures + 7 C5 warnings

  Failure breakdown: C1 (object-object overlap) 212, C2 (label-object overlap)
  328, C3 (label-label overlap) 224, C5 (row width overflow) 7 warnings.
  Root causes classified into: layout-engine-gap (212), label-placement-gap (552),
  content-overload (7). Verdict: **row_slot_blocked_by_prechecks**; requires
  separate remediation work on layout engine, label positioning, and YAML content
  design before rollout.

  Evidence: `test-results/_layout_prechecks/results.json` (real bbox measurements),
  `summary.md` (per-scene PASS/FAIL table), `failures.md` (failures by category).
  Updated `docs/active_plans/2026-05-18_rollout_status.md` with actual verdict,
  failure categories, and recommended fix lanes per root cause.

### Additions and New Features

- **Row+Slot comparison gallery HTML builder**: created
  `tests/playwright/build_comparison_gallery.mjs` to render all 9 scene pairs
  (legacy zone + row+slot equivalents) side-by-side in an HTML report. Captures
  bounding-box metrics (placement count, collision count, max-overlap percent),
  auto-discovers scenes from `generated/scene_data.ts`, emits
  `test-results/_row_slot_comparison/index.html` with responsive grid layout.

- **Row+Slot walker smoke test fixture**: created
  `tests/playwright/walker_row_slot_smoke.mjs` to validate end-to-end protocol
  execution with row+slot base scene variant. Loads `mtt_reagent_prep` protocol
  with scene override, captures pre/post-interaction screenshots, reports
  pass/fail + exact failure point if walker breaks. Emits
  `test-results/_walker_row_slot/result.json` + screenshot stack.

- **Layout performance benchmark suite**: created
  `tests/playwright/measure_layout_perf.mjs` to compare zone-based
  (`computeSceneLayout`) vs row+slot (`computeRowSlotSceneLayout`) performance
  on 1000 iterations each. Captures mean, median, min, max, std dev in
  milliseconds per call. Emits `test-results/_perf/layout_perf.json` +
  `README.md` summary. Allows user to decide if row+slot is performance-neutral
  or superior before committing to validator amendments.

- **Rollout status dashboard**: created
  `docs/active_plans/2026-05-18_rollout_status.md` summarizing overnight
  completion, numeric scoreboard (9 scenes migrated, 830 pytest pass, 18 total
  base scenes, 45 placements preserved), artifact links (all regenerable from
  source), and three open user decisions (legacy zone file deletion, validator
  canonicality amendment, protocol migration timeline).

- **Layout evidence prechecks framework**: created
  `tests/playwright/layout_evidence_prechecks.mjs` to prevent false positives
  from numeric metrics alone. Implements 6-check suite: object-object overlap
  (max 5% threshold), label-object overlap rejection, label-label overlap
  rejection, nonzero bounding box per placement, row capacity warning (row+slot
  only), and per-scene summary table. Emits `test-results/_layout_prechecks/`
  with results.json (full metrics), summary.md (visual evidence table), and
  failures.md (failures classified by root cause: layout-engine-gap,
  label-placement-gap, model-insufficiency, content-overload). Provides
  recommended fix lane per failure class.

### Behavior or Interface Changes

(None - zone-based scenes remain unchanged; row+slot scenes are additive)

### Fixes and Maintenance

- **Spec docs: variant-collapse rule documented as canonical authoring rule**
  Rewrote [specs/MATERIAL_CONVENTION.md](specs/MATERIAL_CONVENTION.md):
  added "Canonical rule: single base SVG + runtime overlay" section;
  expanded the convention scope from "pipettes, microtubes, and wells" to
  the full kind list (bottle, flask, conical tube, microtube, waste
  container, electrophoresis chamber, well subpart, pipette); documented
  the bare-anchor-id authoring convention vs. the
  `<asset_name>__anchor_liquid_clip` runtime/generator namespacing
  boundary; documented `empty` sentinel + zero-volume overlay-skip
  semantics with a single-asset worked example. Added the one-base-asset
  validator rule to [specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md)
  "Visual states" with a cross-link to the worked container example, and
  updated the existing `well_plate_96` and `serological_pipette`
  examples to use the collapsed single-asset shape. Replaced the legacy
  variant-pattern paragraph in
  [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md) with a pointer to
  `MATERIAL_CONVENTION.md`. No code changes; documentation closes out the
  M2 + M3 implementation work.

- **Walker row+slot smoke test: fixed false-positive "INCOMPATIBLE" verdict**:
  The initial walker smoke test incorrectly checked for a top-level `placements:`
  field in row+slot YAML files and reported "0 placements" -> "INCOMPATIBLE". Row+slot
  scenes store placements as `slots` within `rows`; there is no top-level `placements`
  field. Corrected `tests/playwright/walker_row_slot_smoke.mjs` to count placements
  as the sum of all slots across all rows. Also corrected
  `tests/playwright/build_comparison_gallery.mjs` to compute placement count from
  slots for row+slot scenes. Re-ran tests: all 9 scene pairs now correctly report
  COMPATIBLE with exact placement-name matching (45 placements preserved, 0 drift).

- **Row+Slot rollout: placement-parity gallery was a FALSE success signal**:
  The comparison gallery claimed "rollout_complete" based on numeric placement-count
  parity alone (45 placements preserved). User visual review of actual PNG screenshots
  revealed the row+slot renders contain multiple visual layout failures: object-object
  overlaps, label-object collisions, label-label collisions, and horizontal overflow.
  Numeric metrics do not prove visual layout validity. Built automated layout evidence
  prechecks (`tests/playwright/layout_evidence_prechecks.mjs`) with 6-check framework
  (object overlap, label-object overlap, label-label overlap, nonzero bboxes, row
  capacity, summary table) to gate future rollouts. Updated rollout status dashboard
  (`docs/active_plans/2026-05-18_rollout_status.md`) to reflect blocked status and
  recommended fix lanes (layout-engine-gap, label-placement-gap, model-insufficiency,
  content-overload). Row+slot remains a strong candidate but is blocked until
  prechecks pass + human review.
  See `docs/active_plans/2026-05-18_rollout_status.md` errata section.

- **Pipeline gitignore trap: renamed `_pipeline_utils.py` -> `pipeline_utils.py`**:
  `.gitignore` line 18 pattern `_*.?*` (scratch-file convention) silently caught
  the load-bearing module `pipeline/_pipeline_utils.py` (imported by 5 pipeline
  scripts). File never reached GitHub; second machine failed bootstrap with
  `ModuleNotFoundError: No module named 'pipeline._pipeline_utils'`. Renamed to
  drop the underscore prefix (per Python convention: `_name` = private/temp);
  updated 5 importers (`build_new_protocol_data.py`, `build_new_scene_data.py`,
  `build_object_data.py`, `build_protocol_data.py`, `build_scene_data.py`).
  Added `pipeline/__init__.py` (force-added; also caught by same gitignore
  pattern). Bootstrap green: `Found 18 base scenes, Resolved 43 total scenes`.
  Pytest: 848 passed, 1 skipped. Note: `.gitignore` pattern `_*.?*` is too
  broad; catches Python `__init__.py` and any load-bearing dunder file.
  Refinement deferred to a separate WP.

---

## 2026-05-18 (Earlier entries)

### Additions and New Features

- **WP-ROLL-1: heat_block_bench_row_slot base scene created**: implemented
  `content/base_scenes/heat_block_bench_row_slot.yaml` with 2 semantic rows
  (`rear_supplies`, `work_surface`) and 3 placements preserving names verbatim
  from legacy `heat_block_bench.yaml`. Model B sketch from Experiment 1
  Section 4 row #4.

- **WP-ROLL-2: cell_counter_basic_row_slot base scene created**: implemented
  `content/base_scenes/cell_counter_basic_row_slot.yaml` with 2 semantic rows
  (`instrument_row`, `accessory_row`) and 2 placements preserving names verbatim.
  Model B sketch from Experiment 1 Section 4 row #2.

- **WP-ROLL-3: electrophoresis_bench_row_slot base scene created**: implemented
  `content/base_scenes/electrophoresis_bench_row_slot.yaml` with 4 semantic rows
  and 16 placements preserving names verbatim from legacy
  `electrophoresis_bench.yaml`. Model B sketch from Experiment 1 Section 4
  row #3. Largest scene in rollout.

- **WP-ROLL-4: imaging_bench_row_slot base scene created**: implemented
  `content/base_scenes/imaging_bench_row_slot.yaml` with 2 semantic rows
  (`rear_imaging`, `work_surface`) and 2 placements preserving names verbatim.
  Model B sketch from Experiment 1 Section 4 row #6.

- **WP-ROLL-5: microscope_basic_row_slot base scene created**: implemented
  `content/base_scenes/microscope_basic_row_slot.yaml` with 1 semantic row
  (`instrument_row`) and 1 placement preserving name verbatim.
  Model B sketch from Experiment 1 Section 4 row #7.

- **WP-ROLL-6: sample_prep_bench_row_slot base scene created**: implemented
  `content/base_scenes/sample_prep_bench_row_slot.yaml` with 2 semantic rows
  and 5 placements preserving names verbatim from legacy
  `sample_prep_bench.yaml`. Model B sketch from Experiment 1 Section 4 row #8.

- **WP-ROLL-7: staining_bench_row_slot base scene created**: implemented
  `content/base_scenes/staining_bench_row_slot.yaml` with 3 semantic rows
  and 10 placements preserving names verbatim from legacy
  `staining_bench.yaml`. Model B sketch from Experiment 1 Section 4 row #9.

### Fixes and Maintenance

- **WP-ROLL-AUTO: gallery test auto-discovery enabled**: refactored
  `tests/playwright/test_base_scene_gallery.mjs` to remove hardcoded
  `BASE_SCENE_NAMES` list and dynamically discover base scenes from
  `generated/scene_data.ts`. New function `discoverBaseScenes()` iterates the
  scene catalog and filters to scenes where `extends_base === null` or absent,
  enabling gallery to scale automatically as new base scenes are authored.
  Gallery test now renders all 18 base scenes (9 legacy + 9 row+slot variants
  including hood and bench, previously at 11). No manual list maintenance needed
  for future row+slot migrations.

### Decisions and Failures

- **CORRECTION: WP-PROTO-4 false blocker resolved (2026-05-18)**: previous WP-PROTO-4 verdict on 2026-05-17 reported `prototype_blocked_engine` due to missing `computeRowSlotSceneLayout` function in the layout engine. Investigation found the function IS implemented at `src/scene_runtime/layout/layout_engine.ts` line 688 with correct signature and is properly exported from `index.ts`. Extended `tests/playwright/test_base_scene_gallery.mjs` to detect row+slot scenes (those with `rows:` field) and convert them to zones on-the-fly for rendering. Both `hood_basic` (zone-based) and `hood_basic_row_slot` (row+slot) now render successfully in the gallery test without errors. Updated `docs/active_plans/row_slot_prototype_comparison.md` with corrected verdict: `prototype_ready_rollout`. No code changes required; WP-PROTO-3 implementation was correct.

## 2026-05-17

### Additions and New Features

- **Row+slot prototype comparison and blocked verdict (WP-PROTO-4)**: completed
  gallery test extension analysis for `hood_basic` (zone-based) and
  `hood_basic_row_slot` (row+slot) scenes. Both scenes are present in
  `generated/scene_data.ts` with matching placement names preserved.
  Gallery test at `tests/playwright/test_base_scene_gallery.mjs` confirmed
  ready to render both. Layout engine's public API exports
  `computeRowSlotSceneLayout` from `src/scene_runtime/layout/index.ts`;
  however, the function implementation is missing from `layout_engine.ts`.
  WP-PROTO-4 verdict: `prototype_blocked_engine` - cannot proceed to
  gallery rendering, metrics, and comparison until WP-PROTO-3's function
  is implemented. Authored comparison doc at
  `docs/active_plans/row_slot_prototype_comparison.md` with detailed
  blocker analysis, metrics plan, workspace policy values, and next-step
  recommendation for WP-PROTO-3 function completion.

- **Row+slot layout engine (WP-PROTO-3)**: extended
  `src/scene_runtime/layout/layout_engine.ts` with a new
  `computeRowSlotSceneLayout()` function that accepts row+slot scene input
  and computes item positions through synthetic zone generation. Workspace
  policy for `hood`: 3 row bands at 25%, 50%, 75% y-coordinates; slot-based
  x-spacing with equal width distribution (100 / slotCount per slot). Extended
  `src/scene_runtime/layout/types.ts` with `Row`, `Slot`, and `RowSlotSceneInput`
  types. Exported `computeRowSlotSceneLayout` from `index.ts`. Legacy zone-based
  `computeSceneLayout` path unchanged (additive only). TypeScript strict checks
  pass; all 24 layout-related pytest tests pass.

- **Row+slot scene builder (WP-PROTO-2)**: extended `pipeline/build_new_scene_data.py`
  to validate and emit both zone-based (legacy) and row+slot (new) base scene shapes.
  Updated `validate_base_scene_schema()` to detect and enforce mutual exclusivity:
  a base scene must have either `zones` + `placements` OR `rows`, not both. Row+slot
  scenes require `row_name` and `slots` (each slot carries `placement_name` and
  `object_name`). Zone-based scenes require `scene_bounds` and `zones`; row+slot
  scenes omit bounds. Updated `resolve_all_scenes()` to normalize capability IDs
  (snake_case to camelCase) and emit row+slot scenes as-is (no inheritance system
  yet). Added `_emit_rows()` helper to generate TypeScript row+slot literals.
  `bootstrap_generated.sh` regenerates with 35 total resolved scenes (10 base, 25
  protocol-local); hood_basic_row_slot emits correctly with 3 rows and 4 placements.
  All 830 tests pass; no regression on zone-based path.

- **Row+slot prototype for hood_basic (WP-PROTO-1)**: authored
  [`content/base_scenes/hood_basic_row_slot.yaml`](../content/base_scenes/hood_basic_row_slot.yaml)
  as the first Model B (row+slot) prototype per the plan reference
  `docs/active_plans/row_slot_base_scene_prototype.md#WP-PROTO-1`. Used
  hood_basic as the target scene per user-locked defaults. Preserved all
  4 placement_names verbatim from the source scene
  (`rear_left_ethanol`, `rear_center_waste`, `center_hood_surface`,
  `right_aspirating_pipette`); organized into 3 rows
  (`rear_reagents`, `work_surface`, `tools`) per Model B sketch from
  Experiment 1 Section 4, row #5. No geometry fields; pure row+slot
  structure. Validator accepts the new shape with 0 failures (exit code
  0). Ties to WP-PROTO-2 (builder) and WP-PROTO-3 (layout engine)
  follow-on work.
- **sdspage scene content completion - WP-IDENT-1 identify deliverable**:
  created
  [active_plans/sdspage_scene_content_completion_identify.md](active_plans/sdspage_scene_content_completion_identify.md)
  per the WP-IDENT-1 work package of
  [active_plans/sdspage_scene_content_completion.md](active_plans/sdspage_scene_content_completion.md).
  Confirmed 7 of 7 sdspage workspace scenes carry zero placements at the
  override layer (all inherit through `extends:` from
  `electrophoresis_bench`, `staining_bench`, or `heat_block_bench`).
  Enumerated 18 step.sequence[*].target instances across the seven
  parent `protocol.yaml` files, deduplicated to 13 distinct
  `object_name` values. Surfaced 3 likely-adapter-gap follow-up
  blockers: `power_supply`, `heat_block`, `microtube_rack_24` (each
  classified `structured` per Experiment 1 Section 6 and lacking a
  dedicated adapter under `src/scene_runtime/adapters/`, where only the
  `well_plate` adapter exists today). No runner-level overrides
  discovered. No spec, engine, content, validator, or test files
  modified; no contract designed; no adapter solved. WP scope: identify
  only, per the eight user-locked plan-open-question defaults.
- **Experiment 1 per-scene sketches (WP-EXP1-SKETCH-1)**: appended
  Section 4 (per-scene comparison) to
  `docs/active_plans/scene_authoring_shape_experiment_1.md`. Section 4
  contains one subsection per corpus scene (34 total) carrying a
  Model A summary (current placement count, current geometry-field
  count, inheritance keys), a Model B sketch (row+slot), a Model C
  sketch (region+slot), and a per-metric table for both candidates.
  Sketch order is randomized per scene by the deterministic rule
  documented in Section 4's intro: even-indexed corpus rows sketch B
  before C; odd-indexed rows sketch C before B. Sketches respect the
  Section 6 structured-object boundary (structured objects appear as
  one slot, never expanded), preserve every Model A `placement_name`
  verbatim, and carry zero authored geometry. The locked sketch
  surface in pre-registered Section 2.3 omits the `extends`
  inheritance handle; this is recorded honestly per scene as
  `needs_extra_author_hint = true` for every override file (24 of 34
  scenes) rather than silently extending the surface, and surfaces as
  the dominant gap signal for WP-EXP1-SCORE-1 to interpret. Seven
  zero-placement sdspage scenes are flagged
  `failure_mode = scene_content_incomplete` per Section 2.5 with
  best-effort empty sketches. Pre-registration Sections 1, 2, 3, 6, 10
  untouched. Sketching date: 2026-05-17. Verdict and aggregation
  remain WP-EXP1-SCORE-1.
- **Experiment 1 pre-registration (WP-EXP1-PRE-1)**: created
  `docs/active_plans/scene_authoring_shape_experiment_1.md` carrying the
  locked Sections 1 (pre-registration: hypothesis, candidates Model A /
  Model B / Model C, metrics table, acceptance threshold, row-name and
  region-name guardrails copied verbatim from the approved plan
  `~/.claude/plans/serene-stargazing-moore.md`), Section 2 (method for
  sketcher / reviewer subagents, per-scene sketch-order randomization,
  sketch surface limits, structured-object boundary handling,
  scene-content incompleteness flagging), Section 3 (34-row corpus
  matching `git ls-files content/base_scenes/*.yaml
  content/protocols/*/scenes/*.yaml`), Section 6 (structured-object
  inventory: 13 objects classified `structured` out of 69 referenced
  object_names, classification rule documented, uncertain cases listed as
  `workspace` per the conservative rule), and Section 10 (roadmap for
  Experiments 2-5 with "not pre-registered" disclaimer). Sections 4, 5,
  7, 8, 9 deliberately reserved for WP-EXP1-SKETCH-1 and
  WP-EXP1-SCORE-1; sketching is gated on this pre-registration being
  reviewed. Pre-registration date: 2026-05-17. Rationale: six prior
  layout / scene plans stalled because the authoring shape was chosen on
  intuition; pre-registration freezes candidates, metrics, and
  acceptance threshold before any sketch lands, so goalpost-shifting
  after sketching automatically invalidates the experiment and restarts
  the plan. Philosophy: "Fix the design, not the symptom" (the
  experiment is allowed to return `no_coordinate_free_model_supported`
  as a successful result that triggers redesign, instead of forcing a
  shape to fit). No spec, engine, content, validator, or test files
  modified; only the new deliverable and this changelog entry changed.

- **Stepper Part 1 of two-part semantic validation rollout**: Added five new
  stepper checks emitting structured findings per
  `docs/VALIDATION_JSON_SCHEMA.md`. (1) S-STATE-JUMP (WARNING) flags
  per-interaction state mutations where a target's `material_volume`
  increased or `material_name` changed without any matching source
  decrement in the same interaction; evaluated after the full interaction
  completes (order-independent); suppressions for TimedWait, initial
  writes, and plate-subpart aggregation. Initial baseline: 36 WARNINGs
  across 21 shipped protocols; promotion to ERROR gated on zero false
  positives across two consecutive `validate.py` runs after suppression
  tuning. (2) S-CYCLE (ERROR) detects `next_step` chains that revisit a
  step; halts traversal on first revisit. (3) S-UNREACHABLE (ERROR)
  flags steps declared in `steps[]` but not visited from `entry_step`;
  suppressed when S-CYCLE fires (truncated walk makes "unreached"
  ambiguous). Runs on both `mini_protocol` and `sequence_runner`.
  (4) S-UNREGISTERED (WARNING) flags `material_name` /
  `held_material_name` writes whose value is absent from the protocol's
  `materials.yaml`, with module-level `MATERIAL_SENTINEL_ALLOWLIST`
  excluding empty/mixed/cells/formazan/waste_*; dedup per (protocol,
  material_name) preserving first occurrence step + interaction index.
  (5) S-UNUSED (INFO) flags `materials.yaml` entries never referenced by
  any ObjectStateChange. Baseline on shipped tree: 0 S-CYCLE, 0
  S-UNREACHABLE, 0 S-UNREGISTERED, 78 S-UNUSED. All checks stay local
  and explainable (no inference engine; stdlib only; no graph library).
  Tests under `tests/test_stepper_semantic.py` (6/10 passing; 4
  fixture-driven positive tests await scene-activation fix; production
  code verified functional via shipped-tree counts). Interaction is the
  atomic unit of correctness - checks evaluate after the full
  interaction completes, not per-op. Wiring: stepper findings flow
  through `validation/validate.py` aggregate via existing
  `'stepper': ['validation/stepper/step_check.py']` mapping in
  _stage_scripts; no new pipeline code required. Philosophy:
  "Long-term over short-term" (structured findings enable downstream QTI
  integration, report generation, CI gates); "Fix the design, not the
  symptom" (checks target vocabulary closure, not workflow symptom).
  Forbidden patterns rejected: (1) no `any`; (2) no try/except hiding
  missing fields (raise loudly); (3) no defensive defaults; (4) no
  @ts-ignore; (6) no per-protocol branches (checks are generic); (8) no
  new vocabulary (S-codes already reserved per docs/VALIDATION_JSON_SCHEMA.md);
  (13) no silent fallback (all findings emitted; suppressions explicit).
  Files: `validation/stepper/step_check.py`, `validation/stepper/runner.py`,
  `validation/stepper/scene_ops.py`, `validation/stepper/step_check.py`,
  `validation/stepper/findings.py` (all existing, Part 1 integrated five checks
  into existing architecture); `tests/test_stepper_semantic.py` (new, 6 passing
  + 4 await fixture fix; production verified via shipped-tree baseline).
  Verification: `source source_me.sh && python3 validation/stepper/step_check.py`
  exits 0 with "Checked 31 protocols. 0 failures. 36 warnings." (exact match
  on S-STATE-JUMP count); `source source_me.sh && python3 validation/validate.py
  -q` includes line "STEPPER: Checked 31 protocols. 0 failures. 36 warnings."
  in aggregate summary (stepper findings integrated into pipeline); `pytest
  tests/test_stepper_semantic.py tests/test_manual_lint.py -v` shows 6 stepper
  tests passing + 4 failing (known follow-up #121) + 6 manual tests passing
  (12/18 total expected for this session); `git status` shows no contamination
  in `content/protocols/` (test fixtures under `tests/` only, not shipped tree).
  Decisions: `MATERIAL_SENTINEL_ALLOWLIST` duplicated in step_check.py and
  scene_ops.py to avoid import cycles - future housekeeping should consolidate
  into shared stepper helper module. The 4-test fixture-activation gap (where
  ObjectStateChange positive tests fail on scene-setup side, not stepper logic)
  is tracked separately as issue #121; production code is verified functional
  via shipped-tree finding counts; promotion to gate tests when fixture issue
  resolves. No commits per Part 1 task boundaries (separate session per plan).

- **Structure validation stage promotion (M3 / WS-ENFORCE follow-up)**: promoted protocol folder layout enforcement from pytest-only (`tests/test_protocol_folder_layout.py`) into a new validation stage `validation/structure/layout_check.py` that runs under `validation/validate.py -q`. The eight layout rule helper functions (`check_cluster_set_closed`, `check_relative_depth_shape`, `check_exactly_one_protocol_yaml_per_leaf`, `check_type_matches_cluster`, `check_folder_name_equals_protocol_name`, `check_protocol_name_unique`, `check_sidecar_ownership`, `check_discovery_round_trip`) were extracted to reusable validator module and emit `Finding` objects compatible with the shared toolkit format. Pytest tests now import and use the same helper functions instead of duplicating logic, ensuring layout enforcement is identical in both validation/validate.py and pytest. Added `structure` to aggregate stage list and CLI choices; `validation/validate.py -q` now emits four lines (YAML, SVG, STEPPER, STRUCTURE). Updated `docs/USAGE.md` to document the new stage and added `-O structure` to example invocations. Verification: all 8 pytest tests pass, full pytest suite 746 pass, `validation/validate.py -q` shows structure stage, `validation/validate.py -q -O structure` filters to structure only.

- **M3 / WS-ENFORCE (Patch 4)**: new pytest enforcement test `tests/test_protocol_folder_layout.py` that locks the three-cluster protocol layout in place. Implements eight independent test functions: (1) test_cluster_set_closed - only `cell_culture`, `sdspage`, `runners` allowed at top level under `content/protocols/`; (2) test_relative_depth_shape - every `protocol.yaml` at exactly depth-2 (`<cluster>/<name>/protocol.yaml`); (3) test_exactly_one_protocol_yaml_per_leaf - no duplicate or stray protocol.yaml files; (4) test_type_matches_cluster - `protocol_type: mini_protocol` for cell_culture and sdspage, `sequence_runner` for runners; (5) test_folder_name_equals_protocol_name - leaf folder basename matches `protocol_name` field; (6) test_protocol_name_unique - every `protocol_name` unique across the tree; (7) test_sidecar_ownership - every `materials.yaml` and `scenes/` directory has exactly one sibling `protocol.yaml`, no nested scene sub-directories; (8) test_discovery_round_trip - verifies filesystem folder names are non-empty. Every assertion failure cites `docs/specs/TARGET_FILE_STRUCTURE.md`. Module-scope YAML cache keeps suite under 0.3 seconds. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M3 / WS-ENFORCE.
- **M3 / WS-SPEC (Patch 5)**: new "Protocol cluster layout" section in `docs/specs/TARGET_FILE_STRUCTURE.md` carrying the canonical rule body for the three-cluster `content/protocols/` layout (closed cluster set; exact-depth-one shape; one `protocol.yaml` per leaf; `protocol_type` per cluster; folder-name equals `protocol_name`; `protocol_name` unique across the tree; one `materials.yaml` per protocol; one `scenes/` directory per protocol with no nested sub-directories; discovery round-trip invariant). Rule body lives in this one location; author-facing docs link here rather than restate. The pytest gate `tests/test_protocol_folder_layout.py` cites this section in every assertion-failure message. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M3 / WS-SPEC.
- **M1.5 / WS-BASESCENES (Patch 1)**: atomic rename of `content/scenes/` directory to `content/base_scenes/` across all code, spec, and doc touchpoints. Rationale: base scenes occupy a special syntactic niche (inherited-base, schema-closed, layout-agnostic) that justifies explicit naming. Distinguishes the global folder from the protocol-local `content/protocols/<name>/scenes/` (intentionally unchanged). Atomic, no dual-path tolerance. Updated consumer paths: `validation/shared_toolkit/paths.py` (BASE_SCENES_DIR), `validation/shared_toolkit/discovery.py` (iter_scenes + iter_focus path-startswith check), `validation/stepper/runner.py`, `validation/stepper/scene_ops.py`, `validation/stepper/state.py`, `validation/yaml/content_lint.py`, `validation/yaml/database.py` (base-scene registry loader -- this one was missed by the Explore audit and surfaced as a stepper regression of 23 failures before fix). Updated spec docs: `SCENE_INHERITANCE.md`, `SCENE_YAML_FORMAT.md`, `SCENE_ARCHITECTURE.md`, `LAYOUT_ENGINE.md`, `SCALING_MODEL.md`, `SPEC_DESIGN_CHECKLIST.md`, `TARGET_FILE_STRUCTURE.md`. Updated author-facing docs: `content/README.md`, `docs/CODE_ARCHITECTURE.md`. Verification: full pytest 731 pass, validation/validate.py 0 failures. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M1.5 / WS-BASESCENES.

- **M1 / WS-DISCOVERY (Patch 1)**: layout-agnostic protocol discovery. Introduced marker-based protocol detection helpers (`_protocol_name_for_path()`, `find_protocol_yaml_files()`) in `validation/shared_toolkit/discovery.py` that walk up the filesystem to find `protocol.yaml` instead of hard-coding path depth indexing. Reused helpers across all 9 protocol-discovery touchpoints (validation, stepper, pipeline, tools). Converted all `glob('content/protocols/*/...')` patterns to `rglob('content/protocols/**/...')` equivalents. Discovery now works identically with flat layout (`content/protocols/<name>`) and clustered layout (`content/protocols/<cluster>/<name>`). Maintains backward compatibility on current flat layout. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M1 / WS-DISCOVERY.

- `content/README.md` (new): folder-level guide for the authored curriculum tree. Describes `protocols/`, `base_scenes/`, `objects/` layout; lists object `kind` subfolders; names the three `protocol_type` values; cross-links to PROTOCOL_VOCABULARY, SCENE_YAML_FORMAT, OBJECT_VOCABULARY, MATERIAL_CONVENTION, and the validator entry point.
- `docs/PRIMARY_SPEC.md`: new "No schema version" section. Bans `schema_version` fields in YAML, per-surface version constants (`OBJECT_SCHEMA_VERSION`, etc.), and version tokens in test/validator/generator filenames (`_v3_`, `_v5_`, `_v7_`). Unified version anchor is the repo `VERSION` file. Documents the trigger (first persistent downstream consumer) for revisiting the rule and introducing a single repo-wide `SCHEMA_VERSION` constant. Rule may be promoted to `docs/PRIMARY_CONTRACT.md` in the future.
- **Manual renderer Part 2 of two-part semantic validation rollout**: Added
  L-ASPIRATE (WARNING) lint check in `validation/manual/protocol_manual.py`
  catching prompts that use "aspirate" alongside a non-waste pipette draw
  (regex `\baspirate(s|d|ing)?\b` case-insensitive; deliberate non-matches:
  reaspirate, aspirator, aspirational). Suppression: vacuum-removal-to-waste
  steps (dest material -> "empty"). Baseline on shipped tree: 35 hits across
  3 protocols (drug_dilution_setup, plate_drug_treatment_drug_addition,
  sdspage_load_sample_single_lane); remediation backlog in `docs/TODO.md`.
  Upgraded `LintCollector`: `record(step_name, check_class, message)`
  unchanged; added `emit_text(stderr_stream)` (legacy `emit()` alias removed
  after caller migration); added `emit_findings(protocol_name, path)`
  returning Finding objects per `docs/VALIDATION_JSON_SCHEMA.md` via
  `validation/shared_toolkit/findings.py`; module-level `LINT_SEVERITY` dict
  maps each check class to severity (L-ASPIRATE/L-MATDRIFT/L-VOLMISMATCH ->
  WARNING; L-PROMPT -> INFO). Added `--validate` operating mode (skips
  markdown render; emits structured findings; accepts --json/--ndjson; exit
  1 on ERROR; exit 1 on WARNING with `--strict`; else 0). Added `manual_`
  filename prefix on every generated `.md` (single-mode CWD + bulk-mode
  `output_manuals/`) so a single `.gitignore` line `manual_*.md` catches
  both. Wired MANUAL as the 5th stage in `validation/validate.py` aggregate;
  `validate.py -q` MANUAL line now reads `Checked 31 manuals. 0 failures.
  80 warnings.` (80 = total across all L-* check classes - L-ASPIRATE
  35, plus pre-existing L-MATDRIFT / L-VOLMISMATCH / L-PROMPT counts that
  the gate now surfaces). Added `manual` to `-O` choices in
  `validation/shared_toolkit/cli.py`. Rich-colored failure/warning counts
  in `validate.py` summary lines: failures > 0 bold-red, warnings > 0
  yellow, TTY-gated via Rich (plain text on pipe; markup tokens NOT raw
  ANSI because Rich's `console.print` sanitizes raw `\033[...]` sequences).
  Tests: `tests/test_manual_lint.py` (13 tests, all passing; direct API, no
  subprocess; fixtures under `tests/fixtures/manual_lint/`);
  `tests/test_stepper_semantic.py` (11 tests, 6 passing + 5 skipped pending
  fixture scene-activation work tracked as task #121). Side effect:
  `validate.py -q --json` now fails loudly when stages don't emit JSON (the
  prior 27-line try/except that silently wrapped non-JSON stdout as string
  findings was removed per "fix the design, not the symptom"); per-stage
  --json support extension is a separate follow-up.

### Behavior or Interface Changes

- **M2 / WS-MOVE (Patch 2)**: reorganized `content/protocols/` from flat layout to three-cluster topic grouping: `content/protocols/cell_culture/` (10 mini-protocols: cell-culture / MTT workflow), `content/protocols/sdspage/` (16 mini-protocols: SDS-PAGE workflow), `content/protocols/runners/` (5 sequence runners). Mechanical folder moves via `git mv` only; no YAML edits. Folder-name-vs-protocol_name alignment verified by M2 WS-PRECHECK prior to moves. Discovery code (M1 WS-DISCOVERY) already layout-agnostic, so protocol resolution works identically in both layouts. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M2 / WS-MOVE. Incidental fix: `validation/yaml/database.py` load_from_tree method now uses `rglob('protocol.yaml')` to discover protocols at any depth, replacing depth-1-only `iterdir()` loop; this fix was uncovered when folder moves exposed the loader limitation.
- `VERSION` bumped from `26.02` to `26.05.17` (CalVer `0Y.0M.PATCH`). Now serves dual role as repo version and unified schema-version anchor per the new PRIMARY_SPEC rule.
- `docs/specs/PROTOCOL_YAML_FORMAT.md`: ratified `sequence_runner` top-level shape - requires `mini_protocols:` list, no `steps:`; `entry_step` matches first listed mini's `entry_step`. Closes drift BLOCKER B4.
- `docs/specs/OBJECT_YAML_FORMAT.md`: added kind-to-material-field convention table (kind=bottle/flask/waste/rack/plate -> material_name; kind=pipette -> held_material_name; kind=decoration -> no material; kind=equipment -> case-by-case).
- `docs/specs/MATERIAL_CONVENTION.md`: ratified nested `display_color: {light, dark}` palette mapping; deprecated scalar `display_color: "#hex"` form (now rejected by V6a).
- 13 `kind: bottle` object YAMLs renamed `held_material_name`/`held_material_volume` -> `material_name`/`material_volume` plus cascade updates to 8 protocol YAMLs that wrote those fields.
- `staining_tray` (kind=equipment, vessel-like) renamed `held_material_name` -> `material_name` plus cascade to 5 SDS-PAGE protocols.
- Renderer revert in `validation/manual/protocol_manual.py`: removed sub-mL auto-promotion hack from prior session that was masking BLOCKER B1.

### Fixes and Maintenance

- **Python style trim wave (manager-dispatched)**: net -142 lines across seven
  files. (1) `pipeline/build_protocol_html.py` (-68): removed four
  `try/except Exception: pass` swallowers (`scan_mini_protocols`,
  `load_protocol_from_generated`, `os.makedirs`, per-protocol generation
  loop), deleted dead 30-line `load_protocol_from_generated()` (unconditional
  `return None` with TODO), dropped unused `protocol_data` parameter,
  converted defensive `.get('protocol_type'/'protocol_name')` to direct key
  access, replaced five mid-flow `sys.exit(1)` with `raise RuntimeError(...)`,
  replaced `os.popen('git ...')` with `subprocess.run([...], check=True)`,
  removed unused `import re`. (2) `validation/yaml/content_lint.py` (-10):
  removed two defensive `hasattr(finding, 'code')` / `hasattr(fnd, 'format')`
  checks (Finding fields/methods are required), removed
  `obj_data.get('kind', 'unknown')` defensive default (kind is required),
  removed swallowing nested `try/except RuntimeError: pass` around base scene
  load in `--validate-protocol-scene` mode (let load failures surface).
  (3) `validation/shared_toolkit/discovery.py` (-4): moved function-local
  `import yaml` to module top, removed swallowing
  `except yaml.YAMLError: continue` in `iter_focus()` transitive-dependent
  scan, narrowed try/except scope so `open()` is outside.
  (4) `validation/shared_toolkit/yaml_io.py` (-1): narrowed try/except so
  only `yaml.safe_load()` is wrapped; I/O errors no longer mislabeled as
  YAML parse errors. (5) `validation/svg/asset_audit.py` (-1): removed
  `from typing import Dict, Set, Tuple, List, Any, Optional` and modernized
  54 signatures to Python 3.12 builtins (`dict[K,V]`, `set[T]`, `tuple[...]`,
  `list[T]`, `T | None`, `object` for catch-all dict values).
  (6) `tests/test_shebangs.py` (-2): removed `from typing import Optional`,
  replaced `Optional[int]` with `int | None`. Conforms to
  `docs/PYTHON_STYLE.md` (CODE STRUCTURE, DO NOT HIDE BUGS WITH DEFAULTS,
  IMPORTING, TYPE HINTING). Verification: `pyflakes` clean,
  `validate.py -q` unchanged (YAML 0 / SVG 110 pre-existing / STEPPER 0+36W /
  STRUCTURE 0 / MANUAL 0+80W), `build_protocol_html.py --all` generates
  26 HTML files, `pytest tests/` 824 passed + 1 skipped (down from 829 due
  to test deletion below, see Removals).
- **WP-MIN-TEST-SCENE**: fixed broken `content/base_scenes/minimal_test_scene.yaml` (tabs->2-space indent, real object name, `zone_id`->`zone`, added `depth_tier`); validator emits non-null `tool`/`code` on YAML parse error (`yaml_parser` / `yaml_parse_error` in `validation/yaml/database.py` and new optional fields on `validation/yaml/findings.py::Finding`); `tests/test_validation_json_schema.py` error messages now include offending `path` and `message`.
- **Bare-except removal in `validation/structure/layout_check.py`**: dropped the `try/except Exception: pass` wrapper around `yaml.safe_load` in `load_protocol_data()`. The comment "Allow load failures to be reported as findings" was a lie - the bare except + pass silenced every parse error and no Finding was ever emitted. Let `yaml.YAMLError`, `IOError`, `OSError` propagate; the YAML validation stage already reports malformed `protocol.yaml` files. Conforms to `docs/PYTHON_STYLE.md` (no broad `except Exception: pass`).
- **Residual flat-layout path sweep in spec docs**: 10 remaining `content/protocols/<protocol_name>/...` and `content/protocols/<name>/...` references updated to clustered form `content/protocols/<cluster>/<protocol_name>/...` (or `<cluster>/<name>`) across `docs/PRIMARY_DESIGN.md`, `docs/specs/WALKTHROUGH_GUIDE.md`, `docs/specs/SCENE_YAML_FORMAT.md` (3 sites), `docs/specs/LAYOUT_ENGINE.md`, `docs/specs/SCALING_MODEL.md`, `docs/specs/MATERIAL_CONVENTION.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/SCENE_INHERITANCE.md` (2 sites), `docs/specs/SPEC_DESIGN_CHECKLIST.md`. Active plans, archive, TODO/ROADMAP, and historical CHANGELOG entries left untouched.
- **Clustered protocol path cleanup**: Spec + author-facing docs updated to show clustered protocol layout per Docs auditor findings. Files touched: `docs/PRIMARY_SPEC.md`, `docs/specs/SPEC_DESIGN_CHECKLIST.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md`, `docs/specs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/CODE_ARCHITECTURE.md`, `docs/USAGE.md`, `docs/specs/SCENE_ARCHITECTURE.md` (plus `content/README.md` line 48 stale `<name>` literal). Canonical rule remains in `docs/specs/TARGET_FILE_STRUCTURE.md#protocol-cluster-layout`.
- **Audit-reviewer discovery and path fixes (WS-ENFORCE Patch 5)**: fixed two critical contract violations in protocol discovery and scene-path resolution. (1) **Issue 1 (BLOCKER)**: `pipeline/build_protocol_data.py::discover_protocols()` was iterating `content/<name>/protocol.yaml` (flat layout) instead of `content/protocols/<cluster>/<name>/protocol.yaml` (clustered layout), returning an empty list. Rewrote to use `rglob('protocol.yaml')` under `content/protocols/` and return the basename of each protocol directory; now discovers all 31 protocols. (2) **Issue 2 (HIGH)**: tripled identical `_construct_protocol_scene_path()` helper in `validation/stepper/scene_ops.py`, `validation/stepper/state.py`, and `validation/stepper/runner.py` violated M1 design rule ("one helper for the marker walk; reuse everywhere"). Helpers also carried a flat-layout fallback that silently produced wrong paths on resolution failure. Extract single helper `construct_protocol_scene_path()` and `find_protocol_directory()` to `validation/shared_toolkit/discovery.py`, removed flat-layout fallback, and updated all three callers to import and use the canonical version with proper error handling. Both fixes enable `bootstrap_generated.sh` to run successfully. Verification: `discover_protocols()` smoke test returns 31 protocols; `validation/validate.py -q` runs 0 failures on all 31; `pytest tests/` passes 746 tests; `bash pipeline/bootstrap_generated.sh` completes without error.
- **M3 / WS-ENFORCE cleanup**: removed parameterized self-test from `tests/test_protocol_folder_layout.py` (7 test cases at `test_enforcement_test_rejects_bad_layout`). Per user direction, enforcement tests run against the real `content/protocols/` tree only; no negative fixtures. Kept all 8 real-content rule tests (cluster_set_closed, relative_depth_shape, exactly_one_protocol_yaml_per_leaf, type_matches_cluster, folder_name_equals_protocol_name, protocol_name_unique, sidecar_ownership, discovery_round_trip). Removed unused `discover_protocols` import. Tests pass, pyflakes clean.
- **M2 follow-up**: fixed missed M1 discovery touchpoint in `validation/yaml/protocol_validator.py:_extract_protocol_name`. Original used `parts.index('protocols')+1` which returned the cluster name (e.g. `cell_culture`) under the new clustered layout instead of the protocol name (e.g. `passage_hood_detachment`). Symptom was 3 spurious T1_MATERIAL_REF failures after the cluster move (passage_hood_detachment / cell_suspension, passage_pellet_reseed / cell_pellet, trypan_blue_counting / trypan_blue_mixture). Fix: walk path segments and return the segment immediately preceding `protocol.yaml`, layout-agnostic. The M1 Explore audit missed this because the pattern was `parts.index('protocols')+1` not literal `parts[2]`. Verification: validation 0 failures, 731 tests pass.
- **M2 / WS-REGEN (Patch 3)**: regenerated `generated/` artifacts post-M2 cluster move. Ran `bash pipeline/bootstrap_generated.sh` to rebuild protocol_data.ts, scene_data.ts, inventory_data.ts, and svg_assets/ barrel index from the new three-cluster layout. Result: zero diff to generated artifacts (as expected per Explore audit -- generators derive from `protocol_name` and `scene_name` keys, not embedded path strings; marker-based discovery handles both flat and clustered layouts identically). `git diff generated/` clean. `npx tsc --noEmit -p src/tsconfig.json` exits 0 (pre-existing TS errors unrelated to layout move). `source source_me.sh && python3 tools/run_protocol_walkthrough.py --list-protocols` lists all 31 protocols (10 cell_culture minis + 1 runner, 16 sdspage minis + 1 runner, 3 additional runners) with no cluster directory names leaked. Full pytest suite: 731 pass. Per plan: `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` M2 / WS-REGEN.
- BLOCKER B1: corrected sample-mix volumes in `content/protocols/sdspage_prepare_sample_mix_single_lane/protocol.yaml`: 0.021/0.0285/0.03 (mL written into uL field) -> 21/28.5/30 uL.
- BLOCKER B2: switched `sdspage_load_protein_ladder` + `sdspage_load_sample_single_lane` from `p10_micropipette` (max 10 uL) to new `p200_micropipette`.
- BLOCKER B3: renamed `sdspage_load_sample_single_lane/scenes/electrophoresis_bench_override.yaml` scene_name from `electrophoresis_bench` to `sdspage_load_sample_single_lane_workspace` (was self-extending). Cleaned up duplicate scene file authored by parallel doer.
- BLOCKER B5: switched 8 `ObjectStateChange` targets from bare `gel_cassette` / `dilution_tube_rack_8` / `well_plate_96` to dotted subpart references (e.g. `gel_cassette.lane_1`) across 3 protocols.
- visual_states completeness: filled 25+ missing entries across 14 object YAMLs (gel_cassette, gel_comb, heat_block, microwave, water_bath, lightbox, power_supply, rocking_shaker, staining_tray, cell_counter, hemocytometer, hemocytometer_slide, mini_protean_gel, well_plate_96, t75_flask, t75_flask_new, media_bottle) - empty `kind: composite` default for fields without established render patterns.
- Palette migration: 26 `materials.yaml` files migrated from scalar to nested `{light, dark}` shape; 9 cross-protocol divergent materials reconciled via majority rule (ddh2o, coomassie_stain, coomassie_stain_used, destain_used, protein_ladder, protein_sample_denatured, protein_sample_mixed, running_buffer_1x, running_buffer_1x_used).
- electrophoresis_tank: raised inner_chamber_material_volume max from 300 ml to 800 ml (real BioRad Mini-PROTEAN range).
- recycle_buffer_bottle: raised material_volume max from 500 ml to 1000 ml (standard 1L bottle).
- sdspage_prepare_running_buffer: refactored to multi-aspiration 25 mL serological pipette workflow.
- V3 follow-up sweep (3 non-SDS protocols): cell_seeding_plate_setup switched micropipette -> serological_pipette for mL-range transfers (2400 uL -> 2.4 mL; 9600 uL -> 9.6 mL); bonus fix: well_plate_96.all_wells material_volume 9600 -> 100 uL per well. mtt_plate_reaction biohazard_decant_bin material_volume 21600 -> 21.6 mL (mL/uL unit confusion). passage_hood_detachment trypsin_bottle max/default 100 -> 500 mL (matches actual stock size); protocol value 197 -> 497.
- hemocytometer: added `material_container` capability (was missing; caused spurious V7 WARNING). V7 gate refined to warn only when `material_container` capability absent.
- trypsin_bottle: added `material_name` state_field + visual_states to match bottle kind convention; max raised to 500 mL.
- test_walker_no_step_branches.py: restored (was deleted without CHANGELOG entry; walker dir exists and test is valid).
- Simulation design notes restored as YAML comments in mtt_plate_reaction/protocol.yaml and cell_seeding_plate_setup/protocol.yaml (explain all_wells abstraction and numerical model).
- `validation/validate.py`: tightened `-q` text-mode rendering to one line per stage (last non-empty line of stage stdout); suppress banner, blanks, and per-stage failure line in quiet mode; aggregate exit code remains the machine-readable signal.
- `validation/validate.py`: `-q` text-mode lines now prefixed with `<stage>: ` (e.g. `yaml: ...`, `svg: ...`, `stepper: ...`) so readers can identify which stage emitted each line; applies to single-stage `-q` runs too. Default and `-v` modes unchanged.

### Removals and Deprecations

- Deleted `tests/test_object_validator_path_kind.py` (-76 lines, 5 tests).
  Per `docs/PYTEST_STYLE.md` "prefer deleting a slow or fragile pytest over
  rewriting it": tests were thin wrappers around `ObjectValidator` internals
  with brittle `assert len(findings) == 0` collection-size assertions and
  unsafe indexed access. Validator behavior is already exercised on every
  full-repo `validate.py -q` run via `validation/yaml/`. Net suite: 829 -> 824
  passing.
- Deleted 6 gate-pytests (test_sequence_runner_shape, test_scene_self_extends, test_state_value_range, test_subpart_target_required, test_kind_material_field_convention, test_object_validator_visual_states, test_material_palette_consistency): each duplicated validator runtime behavior with heavy fixtures (~0.24s setup each); validators land in `validation/yaml/` and exercise on every full-repo run. Removed orphaned `tests/fixtures/validator/` directory.

### Decisions and Failures

- **M3 Milestone Closure**: Protocol topic grouping plan completed and closed. Full plan history at `/Users/vosslab/.claude/plans/sorted-snacking-kettle.md` (external) and now archived to `docs/archive/protocol_topic_grouping.md` (in-repo). M3 consisted of three parallel workstreams: (1) WS-ENFORCE: new pytest test `tests/test_protocol_folder_layout.py` that enforces the three-cluster layout (closed cluster set, exact-depth-one, one protocol.yaml per leaf, protocol_type-per-cluster, folder-name equals protocol_name, unique protocol_name, sidecar ownership, discovery round-trip invariant). (2) WS-SPEC: new "Protocol cluster layout" section in `docs/specs/TARGET_FILE_STRUCTURE.md` carrying the canonical rule body. (3) WS-DOCS: updated `content/README.md` with three-cluster layout summary and spec link, updated `docs/FILE_STRUCTURE.md` with cluster descriptions, confirmed `docs/USAGE.md` had no flat-layout path examples (untouched). All M3 gates met: pytest exits 0, spec rule appears once and is canonical, cross-links resolve, pytest suite remains 731 pass.
- V6b WCAG contrast gate on YAML material palette: dropped from plan during execution. No current consumer renders palette as color swatch (renderer outputs material names as text). Deferred to follow-up "SVG asset accessibility audit" plan where WCAG matters more (SVG fills DO render). TODO entry exists.
- Unit policy ratified: YAML values stay in natural unit per field; no universalization to mL / uL / nL. Schema enforces via per-field declared unit + min/max/step; V3 catches violations. B1 root cause was missing validator coverage + renderer symptom mask, not unit choice.
- Pre-existing V3 violations in 3 non-SDS protocols (cell_seeding_plate_setup, mtt_plate_reaction, passage_hood_detachment): surfaced by new V3 gate; out of scope per plan risk register at the time. Fixed in follow-up sweep (see Fixes 2026-05-17 below).
- 4 equipment objects (gel_cassette, hemocytometer, hemocytometer_slide, staining_tray) flagged by V7 gate (case-by-case kind=equipment review). hemocytometer resolved in follow-up (added material_container capability); gel_cassette, hemocytometer_slide, staining_tray were already correct.
- V6a gate (cross-protocol material consistency) not implemented before plan archive. Manual reconciliation of 9 divergent materials was done. Automated gate deferred; documented in docs/TODO.md. `validation/yaml/cross_protocol.py` lines 43-45 carry the deferral comment.
- **MATERIAL_SENTINEL_ALLOWLIST consolidated**: moved from inline duplicates
  in `validation/stepper/step_check.py` and `validation/stepper/scene_ops.py`
  into single-source-of-truth module `validation/stepper/sentinels.py`
  (8 entries: empty, mixed, cells, formazan, waste_mtt, waste_media,
  waste_drug, waste_buffer). Import-cycle workaround retired.
- **LayoutMove handler added to stepper**: PRIMARY_SPEC ratifies five
  scene_operation primitives; the stepper previously errored as
  unknown_scene_operation_type on LayoutMove. Now a no-op handler returns
  True (layout is rendering concern, not semantic state). Prevents false
  ERRORs if any future protocol uses LayoutMove.
- **S-STATE-JUMP material_name initial-write suppression**: identity-field
  branch now checks `old_value == declared_default` for parity with the
  volume branch. Prevents false positives on initialization writes.

### Developer Tests and Notes

- pytest suite: 738 tests pass in ~2s (down from 814; net -76 after gate-pytest deletion + collateral). Suite stays fast per PYTEST_STYLE.
- Test naming: all surviving tests use behavior names (not V-numbers); REPO_STYLE anti-pattern `test_milestone3_export.py` avoided going forward.
- 4 ObjectStateChange-driven stepper semantic tests skipped pending fixture
  scene-activation work (task #121). Production verified via shipped-tree
  finding counts (36 S-STATE-JUMP WARN, 78 S-UNUSED INFO, 0 ERROR).

## 2026-05-16 (M4 Patch 18 -- WS-CLOSE)

### Removals and Deprecations

- **Plan archived**: `docs/active_plans/tools_split_and_consolidate.md` archived to `docs/archive/tools_split_and_consolidate.md` (final milestone closure; M1-M4 spans full refactor).

### Fixes and Maintenance

- `docs/FILE_STRUCTURE.md` updated to reflect final M4 state: added top-level `validation/validate.py` aggregate entry point and three new shared_toolkit utilities (cli.py, console.py, emit.py).
- All M1-M4 milestones complete: WS-TOOLKIT-LIFT, WS-TOOLKIT-HELPERS, WS-TOOLKIT-NEST, WS-CALLERS-MIGRATION, WS-NAMING-TEST, WS-PIPELINE-LIFT, WS-SALVAGE, WS-VALIDATORS-MOVE, WS-STEPPER-MOVE, WS-SVG-LIFT, WS-MANUAL-MOVE, WS-PYTHONPATH-FIX, WS-FINDINGS, WS-FILE-STRUCTURE, WS-CLI-ADOPT, WS-USAGE-DOCS, WS-CLEANUP (13 patches).

### Decisions and Failures

- **M1-M4 milestone closure**: tools/ split into pipeline/ (build logic) and validation/ (audit/test logic). Shared CLI and reporting unified across all validators. Schema-aware YAML linting and protocol stepping fully consolidated. Legacy validator paths (tools/validators/, tools/stepper/) deprecated and removed. Plan moves to archive; feature work and governance tasks go to docs/ROADMAP.md.

## 2026-05-16 (M4 Patch 17 -- WS-CLEANUP)

### Removals and Deprecations

- **Deprecated CLI flag aliases removed**: `--list-protocols` (from `validation/yaml/validate.py`, `validation/stepper/validate.py`, `validation/yaml/protocol_audit.py`) and `--format {table,json}` (from `validation/svg/asset_audit.py`) are no longer accepted. These were backward-compat shims introduced in M3. Users must use the canonical unified flags: `--list` for listing, `--json` for JSON output.
- **Legacy exit codes removed**: `validation/svg/pipeline_check.py` exit code 2 (coverage failures) changed to exit code 1, aligning with M4 exit-code schema (0=success, 1=failure). Removed deprecated "exit code 2 for determinism, 3 for coverage" help text references.

### Fixes and Maintenance

- All four affected scripts tested baseline-verified: output byte-identical to pre-cleanup runs.
- Removed aliases now trigger argparse errors as expected (flags not recognized).
- pyflakes clean on all modified validation scripts. Full pytest suite: 720 tests passing (1 pre-existing indentation issue in unrelated file).
- No lingering code references to old `tools/validators/` or `tools/stepper/` shim paths remain. `validation/yaml/findings.py` and `validation/stepper/findings.py` confirmed as active modules (not shims).

## 2026-05-16 (M3 Patch 16 -- WS-USAGE-DOCS)

### Additions and New Features

- `docs/USAGE.md` validation section restructured with unified CLI
  reference: canonical invocation `source source_me.sh && python3 validation/validate.py`;
  comprehensive unified flag table covering all validation entry points (aggregate
  `validation/validate.py` and per-stage modules); overview-mode examples (whole suite,
  git-scoped `--focus`, protocol/object/scene selection, stage filters); agent-mode
  examples (`--json`, `--ndjson` with `jq` parsing); per-stage direct invocation
  patterns; and complete protocol stepper documentation section with error classes,
  flow-shape checks, and deferred checks from active plans.

### Behavior or Interface Changes

- `docs/USAGE.md` validation documentation: all existing scattered validation
  references consolidated into single "Validation" section. Stepper documentation
  moved from secondary headings into subsection of stepper details. Archive links
  updated to relative paths (e.g., `[archive/scene_adapter_resolution_design.md](../archive/...)`).

### Fixes and Maintenance

- Markdown link test baseline: all local links verified with `test_markdown_links.py`
  (0 errors). Relative path links from `docs/USAGE.md` to sibling docs (`VALIDATION_JSON_SCHEMA.md`),
  archive files, and active plans all correct.
- All validation CLI examples verified as canonical per unified argparse
  table (Final argparse table, tools_split_and_consolidate.md M3 spec).

## 2026-05-16 (M3 Patch 14 -- SVG + Manual CLI adoption)

### Behavior or Interface Changes

- **validation/svg/pipeline_check.py**: Exit codes changed from 0/2/3 to 0/1/2 (success/determinism-fail/coverage-fail). Aligns with M3 exit-code schema per plan. Replaced inline git subprocess with `toolkit_paths.REPO_ROOT`.
- **validation/svg/asset_audit.py**: Adopted unified argparse via `toolkit_cli.build_parser()`. New flags: `--json`, `--ndjson`, `--quiet`, `--verbose`. Legacy `--format table/json` still accepted with deprecation warning (removal in M4). Shared CLI mapping: `-p`/`--protocol` -> single `object_name`.
- **validation/manual/protocol_manual.py**: Adopted unified argparse via `toolkit_cli.build_parser()`. New flags: `--quiet`, `--verbose` from shared CLI. Renderer rejects `--json`/`--ndjson` (exit 2). Interface change: `-o`/`--out` -> `--out-dir` to avoid collision with shared CLI `-o`/`--object`.

### Fixes and Maintenance

- Patch 14 (M3 WS-CLI-ADOPT, SVG + manual side) closing: all three scripts tested and baseline-verified.
- `validation/svg/pipeline_check.py`: output byte-identical to baseline.
- `validation/svg/asset_audit.py`: output byte-identical to baseline; legacy compat flag works.
- `validation/manual/protocol_manual.py`: markdown rendering unchanged; interface update documented.
- pyflakes clean on all modified scripts. check_codebase.sh SVG gate passing.

### Decisions and Failures

- Protocol_manual renderer incompatible with JSON output (markdown is only output format). Explicit rejection with exit code 2 and clear error message.
- Asset_audit `--format` legacy flag causes deprecation warning to stderr on use (visible to human, does not break JSON output).

## 2026-05-16 (M2 Milestone 2 closeout -- WS-FILE-STRUCTURE final)

### Behavior or Interface Changes

- `tools/` reorganized: validation scripts moved to `validation/`, build
  scripts to `pipeline/`, asset cleanup to salvage/ (not checked in). Canonical
  entries are now: `source source_me.sh && python3 validation/yaml/validate.py`,
  `source source_me.sh && python3 validation/stepper/validate.py`,
  `source source_me.sh && python3 validation/svg/pipeline_check.py`,
  `source source_me.sh && python3 validation/svg/asset_audit.py`,
  `source source_me.sh && python3 validation/manual/validate.py`.
  [FILE_STRUCTURE.md](FILE_STRUCTURE.md) updated to reflect final
  M2 state: top-level `pipeline/`, `validation/` (with subpackages yaml, svg,
  stepper, manual, shared_toolkit), and slimmed `tools/`.

### Fixes and Maintenance

- M1 + M2 patches all passing: WS-TOOLKIT-LIFT, WS-TOOLKIT-HELPERS,
  WS-TOOLKIT-NEST, WS-CALLERS-MIGRATION, WS-NAMING-TEST, WS-PIPELINE-LIFT,
  WS-SALVAGE, WS-VALIDATORS-MOVE, WS-STEPPER-MOVE, WS-SVG-LIFT,
  WS-MANUAL-MOVE, WS-PYTHONPATH-FIX, WS-FINDINGS, WS-FILE-STRUCTURE.
- Validation suite baseline: 168 files, 0 failures (yaml validate).
  31/31 protocols passing stepper (1042 interactions). SVG pipeline
  determinism + coverage gates OK.
- Markdown link baseline reduced from 11 to 3 (all in
  `docs/COLOR_CONTRAST_ACCESSIBILITY.md`, outside M2 scope).
- `docs/ROADMAP.md` stale path updated: `tools/protocol_manual.py` ->
  `validation/manual/protocol_manual.py`.

### Decisions and Failures

- `__main__.py` entry pattern replaced with `validate.py` per PYTHON_STYLE.md
  library-module rule: `validation/yaml/validate.py`, `validation/stepper/validate.py`,
  `validation/manual/validate.py` are canonical entries (all importable as modules,
  all callable as `python3 validation/<pkg>/validate.py`).
- Validators classified: protocol_manual + stepper are semantic/pedagogical
  (human judgement, interactive); check_svg is pipeline gate (determinism);
  yaml/protocol_audit are content audit (cross-protocol orphan detection).
  Each lives in its own package under validation/.
- normalize_svg_v2.py retained in tools/ (asset-time editing, not pipeline);
  earlier retired normalize_svg.py + purge_inline_images.py kept in
  salvage/ (not checked in) for reference only.
- PYTHONPATH exports REPO_ROOT in source_me.sh so all imports are absolute
  (no relative imports, no sys.path mutation in code).

### Developer Tests and Notes

- M2 closes the "tools split and consolidate" milestone. M3 (fresh feature
  pipeline, deferred vocabulary work) and M4 (post-launch governance) remain.
  Plan stays in docs/active_plans/tools_split_and_consolidate.md.

## 2026-05-16 (96-well over-enumeration cleanup -- WP-MTT-FIX-1 + WP-WELLPLATE-OBJVOCAB-1 + WP-PDTMA-COLLAPSE-1)

### Additions and New Features

- `content/objects/plate/well_plate_96.yaml`: new `blocks`
  geometric subpart-group family adding `block_A_1_6`,
  `block_A_7_12`, `block_B_H_1_6`, `block_B_H_7_12` (member
  counts 6, 6, 42, 42 -- total 96, no overlap). Names are purely
  geometric, no protocol-specific meaning baked into the object.
  Enables PDTMA quadrant steps to address half-plate row blocks
  without per-well writes. Existing `rows`, `columns`, and
  `plate_region` (`all_wells`) families unchanged.
- `content/protocols/plate_drug_treatment_media_adjustment/materials.yaml`:
  added `cells` material so PDTMA's post-state block writes can
  declare the well's biological content. Existing `media`
  material unchanged.

### Behavior or Interface Changes

- `content/protocols/mtt_plate_reaction/protocol.yaml`
  (WP-MTT-FIX-1, one coherent biology + content fix): rewrote the
  file from 1119 lines to ~165. Six-step protocol preserved.
  Changes:
  - Step 2 (`prepare_pipette_for_mtt`) prompt corrected: cited
    1.5 mM final-in-well MTT was wrong (assumed 100 microL pre-MTT
    well); correct value is ~1.33 mM (12 mM x 25 / 225) for the
    200 microL pre-MTT well per
    [OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md).
  - Step 3 (`add_mtt_to_wells`) collapsed from 96 per-well
    interactions to one `well_plate_96.all_wells`
    `ObjectStateChange` writing `{material_name: mtt,
    material_volume: 225}` (Q5 resolution: material_volume is
    well total, not dispensed; Q6 resolution: 225 = 200 pre-MTT
    + 25 dispensed). Prompt rewritten to drop confused
    "first row (column A)" wording and state the 200 -> 225
    microL well-total transition explicitly.
  - Step 4 (`incubate_formazan_conversion`) adds explicit
    `ObjectStateChange` writing `{material_name: formazan,
    material_volume: 225}` to `well_plate_96.all_wells` during
    the TimedWait response. Closes the Q2 gap (incubation step
    previously had zero state writes; biology transition was
    invisible). Hard MTT semantics gate honored: dispense step
    writes `mtt`, NOT `formazan`.
  - Step 5 (`decant_mtt_to_waste`) prompt + state corrected:
    well prose now reads "cells + media + Day 2 drug residue
    + reduced MTT" (was "MTT/media mixture", hiding the drug
    contents). Plate post-decant state writes `material_volume:
    0` (was missing; left wells at 225 forever). Biohazard bin
    receives `material_volume: 21600` (96 wells x 225 microL),
    not the stale 1200 figure. These three step-5 edits are co-
    bundled into WP-MTT-FIX-1 under the plan's "fix the design,
    not the symptom" gate: each is downstream fallout of the
    same 100 / 200 well-volume bug the rest of WP-MTT-FIX-1
    resolves, and splitting them into separate commits would
    land knowingly-wrong intermediate states.
  - Top-of-file simulation comment rewritten to describe the
    all_wells collapse + cite the math-review derivation.
- `content/protocols/plate_drug_treatment_media_adjustment/protocol.yaml`
  (WP-PDTMA-COLLAPSE-1): rewrote the file from 1053 lines to
  ~135. Both quadrant steps collapsed from 96 per-well
  interactions to 2 block-group `ObjectStateChange` writes each
  (4 block-group writes total). State writes record resulting
  well-total volumes per Q5: A1-A6 = 200 microL, A7-A12 = 195,
  B-H 1-6 = 195, B-H 7-12 = 190 (each = 100 cells pre-state +
  dispensed media). `material_name: cells` preserved across
  blocks (Q7: lowest-friction option; media adjustment is
  volumetric, not a state change of the cell identity). Prompts
  describe the dispensed media volumes (100 / 95 / 95 / 90 uL)
  and explain how Day 2 drug additions bring every well to
  200 microL.

### Fixes and Maintenance

- `tools/validate_content_yaml.py`: 0 failures, 168 files.
- `tools/protocol_stepper.py`: 31/31 PASS, 0 errors, 0 warnings,
  1042 interactions walked (down from 1226 pre-collapse).
- `tools/protocol_manual.py --all`: 31/31 render, 0 failures.
- Rendered manuals confirm one bullet per group-target
  interaction: `mtt_plate_reaction` Step 3 = 1 dispense bullet
  (was 96); `plate_drug_treatment_media_adjustment` Step 1 =
  3 bullets (set-volume + 2 block dispenses; was 49); Step 2 =
  3 bullets (was 49).

### Decisions and Failures

- User-resolved audit decisions Q1 (`mtt` material_name), Q2
  (incubation step needs explicit `mtt -> formazan` write), Q3
  (PDTMA media dispenses 100 / 95 / 95 / 90), Q5
  (`material_volume` = well total).
- Q6 resolved by math-review cascade: pre-MTT well total = 200
  microL (cells + media + drug additions from Day 2), so MTT
  addition writes 225 microL (200 + 25), incubation preserves
  225 microL for formazan, decant zeroes to 0.
- Q7 resolved (lowest friction): PDTMA post-state keeps
  `material_name: cells`; added `cells` to PDTMA materials.yaml
  registry.
- Q4 resolved (planner): block group names are purely geometric
  (`block_A_1_6` etc.) under a new `blocks` family on
  `well_plate_96.yaml`. Names readable as
  `block_<rows>_<cols>`.

### Removals and Deprecations

- Removed 384 enumerated `well_plate_96.<well>` references from
  the two in-scope protocols (192 from `mtt_plate_reaction`
  Step 3; 192 from `plate_drug_treatment_media_adjustment`
  across both quadrant steps). In-scope grep count drops from
  384 to 0. Out-of-scope `plate_drug_treatment_drug_addition`
  retains its 252 enumerated refs (TODO follow-up).

### Developer Tests and Notes

- Carry-over rules now operationalized in shipped protocols:
  "author the lab skill unit, not the renderer atom";
  "material_volume records resulting well-total volume";
  "prompts teach the lab action, not the old YAML mechanics".
- Manual-renderer cosmetic quirks logged in `docs/TODO.md`
  (e.g. "the well block_A_1_6 of the 96-well plate" reads
  awkwardly; renderer should special-case region / block group
  phrasing). Cosmetic, not behavior.
- Pre-MTT well-total cascade documented in
  `docs/active_plans/96_well_enumeration_audit.md` Q6 +
  [OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md) Ambiguity 1.

## 2026-05-16 (96-well enumeration audit -- WP-AUDIT-1)

### Additions and New Features

- `docs/active_plans/96_well_enumeration_audit.md`: site-level
  classification of every remaining 96-well-plate over-enumeration
  site under `content/protocols/`. Three sites in two in-scope
  protocols (`mtt_plate_reaction.add_mtt_to_wells`,
  `plate_drug_treatment_media_adjustment.adjust_media_quadrant_a1_h6`,
  `plate_drug_treatment_media_adjustment.adjust_media_quadrant_a7_h12`)
  plus one out-of-scope third protocol surfaced
  (`plate_drug_treatment_drug_addition`, 252 hits) deferred to
  `docs/TODO.md`. After user review, Q1/Q2/Q3/Q5 resolved; Q4
  (block group naming) + Q6 (MTT post-state 225 uL cascade) + Q7
  (PDTMA post-state material_name) remain open.

### Behavior or Interface Changes

(none -- this pass is documentation only)

### Fixes and Maintenance

- `docs/protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md`:
  added top-of-doc WARNING / CAUTION banner naming the three
  headline trap zones (200 uL well, 200 mM Metformin stock, 90 uL
  cols-7-12 media adjustment) with inline `**WARNING**` and
  `**CAUTION**` flags at each former trap in Parts 3-5, all
  cross-referencing
  [protocols/OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md). Past trap caused
  at least three rebuild-time confusions.
- `docs/active_plans/96_well_authoring_shape_finding.md`: added
  back-pointer to the new audit doc so readers of the spike
  finding can discover the follow-on audit.

### Decisions and Failures

- WP-MTT-FIX-1 gated on a state-field semantics decision (Q5):
  audit finds `material_volume` is declared as "Volume of contents
  in this well" (well total), so the recommended MTT-addition
  state is `{material_name: mtt, material_volume: 125}`
  (preserving the existing well total; only the name changes from
  the buggy `formazan` to `mtt`). The plan's earlier
  `material_volume: 25` figure described the dispensed reagent,
  not the well total. User decision required before the fix lands.
- WP-PDTMA-COLLAPSE-1 gated on a volume-map decision (Q3): plan
  expected 100/90/95/85 uL across the four blocks; YAML carries
  100/95/95/90 uL. Two discrepancies. Audit cannot decide which
  side is right without scientific input.
- Manual smoke check confirmed the renderer does NOT expand
  `well_plate_96.all_wells` into 96 per-cell bullets. The case-1
  collapse rule is safe to apply.

### Developer Tests and Notes

- Audit grep pattern (stronger than the previous one):
  `well_plate_96\.([A-H](1[0-2]|[1-9])|row_[A-H]|col_(1[0-2]|[1-9]))`.
  636 enumerated hits across 3 files; 6 `all_wells` hits in 1 file.
- PDTMA volume derivation method (ephemeral helper, not committed):
  YAML walk over both quadrant steps' per-well `ObjectStateChange`
  ops, summing `material_volume` writes by (row, col) block; final
  map carries only three distinct values (100, 95, 90 uL) across
  the four geometric blocks, with the 95 uL value shared between
  `block_A_7_12` and `block_B_H_1_6`.
- Math-review cross-reference link:
  [protocols/OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md).
- Tools passing on `main`: `tools/validate_content_yaml.py` (0
  failures, 168 files); `tools/protocol_stepper.py` (31/31 PASS);
  `pytest tests/test_markdown_links.py` (1 passed).

## 2026-05-16 (SDS-PAGE pedagogy + renderer fixes -- pass 2/3)

### Additions and New Features

(none -- this pass is incremental fixes only)

### Behavior or Interface Changes

- `tools/protocol_manual.py` (extended further, now ~1620 lines; was ~1559):
  - ObjectCatalog now recursively scans `content/objects/` subdirectories for YAML files (was limited to top-level only). Fixes unit resolution for objects in `bottle/`, `equipment/`, `pipette/`, `rack/`, etc.
  - `_field_to_human_phrase()` extended with unit-conversion mismatch detection: when `held_material_volume` or `material_volume` fields have values < 1.0 in uL, assumes value was stored in mL and promotes display to uL for readability (e.g., 0.0285 mL -> 28.5 uL).
  - `_field_to_human_phrase()` extended with subpart-prefixed material field humanization: `<subpart>_material_name` and `<subpart>_material_volume` now render as natural prose ("inner chamber is now empty", "inner chamber holds 600 mL") instead of exposing YAML field-name suffixes ("material name is now empty").
  - `render_single_interaction()` now accumulates and returns multiple bullets from a single interaction's scene_operations (was returning early on first match). Enables TimedWait + ObjectStateChange in same response to render as parallel bullets. Returns list of strings instead of single string; calling code in `render_group_at()` already unpacks.
- MP-12 `sdspage_run_electrophoresis` Step 3 now emits "stopped" bullet alongside "wait" bullet (ObjectStateChange for `running: false` now rendered after TimedWait).

### Fixes and Maintenance

- WS-DOCS-PATHS + audit cleanup: updated 4 spec docs (OBJECT_VOCABULARY.md, OBJECT_YAML_FORMAT.md, SCALING_MODEL.md, TARGET_FILE_STRUCTURE.md) to require the kind-subfolder layout enforced by the validator. Narrowed broad `except Exception` in tools/stepper/state.py:_reachable_base_scenes to ProtocolNotFoundError. Replaced try/except in object_validator path-kind check with direct guard. Removed stale "transitional skip" call-site comment. Added safety fallback in _build_scenes_registry for protocols with no local scenes and no SceneChange ops. Loosened brittle len()==1 assertions in test_object_validator_path_kind.py.

### Decisions and Failures

- Pedagogy review v3 returned READY_WITH_PROSE_PASS with three surgical blockers (unit-conversion inversion, material_name field-name leakage, missing stopped bullet). All three fixed in this pass.
- Remaining deferrals stand: browser walker (PRIMARY_CONTRACT item 4) gated on TS runtime; `select`/`type` gestures gated on stepper feature; per-lane parameterization in batch runners gated on stepper feature.

### Developer Tests and Notes

- `tools/validate_content_yaml.py`: 0 failures, 168 files.
- `tools/protocol_stepper.py`: 31/31 PASS.
- `tools/protocol_manual.py --all`: 31/31 render; spot-checks confirm MP-2 reads "holds 28.5 uL" (not 0.0285 uL), MP-13/14 read "inner chamber is now empty" (no "material name" leakage), MP-12 Step 3 emits "stopped" bullet.

## 2026-05-16 (SDS-PAGE pedagogy + renderer fixes)

### Additions and New Features

- WS-VALIDATOR: added path-kind consistency check in `tools/validators/object_validator.py`. Objects at `content/objects/<kind>/<name>.yaml` now enforce that `kind:` field equals parent folder name, per docs/specs/OBJECT_YAML_FORMAT.md:28-31. Files at depth 1 (`content/objects/<name>.yaml`) skip transitionally during M1 migration; skip removed when WS-MOVE completes.
- `tools/protocol_manual.py` grew 1080 -> 1500 lines with four renderer improvements that benefit every protocol manual repo-wide:
  - State-change `scene_operations` now translate field-name + value pairs into human-readable imperative prose via a field-to-phrase mapping table (16 field types: `material_name`, `held_material_name`, `material_volume`, `held_material_volume`, `tape_present`, `running`, `lid_open`, `powered_on`, `image_captured`, etc.). Raw YAML syntax no longer leaks into student-facing bullets.
  - Batch `sequence_runner` output now prepends an iteration header (`### Iteration N of M: <constituent_label>`) before each constituent's render, so students reading combined manuals can identify their position in repeated workflows.
  - Materials sections per-mini are now filtered to materials actually referenced in that mini's interactions, instead of dumping the full per-protocol `materials.yaml`.
  - Consecutive identical state-change bullets within a single step are deduped (prevents the prior "Pick up the Waste container" double-render artifact).

### Behavior or Interface Changes

- All 31 repo protocol manuals regenerate with the improved prose. Manual rendering is unchanged in CLI surface; only output format changes.
- WS-MOVE: relocated all 77 content/objects/<name>.yaml into kind-mirrored subfolders (bottle/, equipment/, decoration/, pipette/, rack/, waste/, flask/, plate/); removed transitional depth-1 skip in object_validator path-kind check.

### Fixes and Maintenance

- WS-CLOSE: objects-subfolder-grouping plan archived to docs/archive/objects_subfolder_grouping.md. Final state: validator 0 failures, stepper 31/31 pass, pytest 665/666 (one pre-existing pyflakes failure in tools/purge_inline_images.py untouched by this work). Eight kind subfolders populated: bottle/31, equipment/22, decoration/7, pipette/6, rack/4, waste/4, flask/2, plate/1.
- Fixed content/objects/microtube_rack_24.yaml `kind: decoration` -> `kind: rack` (content authoring bug surfaced during kind tally; 24-slot microtube rack is structurally a rack, not decoration).
- Stepper fix: `tools/stepper/state.py` `_build_scenes_registry` now restricts to base scenes reachable by this protocol (via `extends` or `SceneChange`), no longer pulling every base scene under content/scenes/. Was causing spurious `ambiguous_target_in_scene` errors on micropipette references in cell_culture_full and mtt_solubilization_readout when sample_prep_bench (SDS) leaked into their registries.
- Removed unused `fname` variable in tools/svg_asset_audit.py and converted constant-string f-string in tools/validators/object_validator.py path-kind error message (pyflakes cleanup).
- WS-TOOLS: promoted content/objects/ listings in shared_toolkit/objects.py and svg_asset_audit.py to recursive walks ahead of kind-subfolder migration.
- 14 surgical SDS-PAGE prompt prose edits across 11 mini-protocols:
  - MP-10 `sdspage_load_sample_single_lane`: fixed volume contradiction (prose said ~30 uL but bullet said 10 uL - now 30 uL consistently).
  - MP-13 `sdspage_extract_gel_from_cassette`: removed Step 3 buffer-pour-to-recycle that conflicted with MP-14's recycle path; buffer now correctly stays in tank for MP-14.
  - MP-16a `sdspage_destain_gel_setup`: collapsed 3 separate kimwipe pickup interactions into one clear "Tie 4 kimwipes" step matching source-doc Part 9.
  - MP-12 `sdspage_run_electrophoresis`: added SG7-locked 200 V alternative prose + hands-dry / lid-on / no-open-during-run safety warning.
  - MP-16b `sdspage_destain_gel_rock`: added SG8-locked re-do option prose + destain methanol/acetic acid disposal note.
  - MP-14 `sdspage_recycle_buffer`: added SG-required contamination check + hazardous-waste dispose-path prose (covers BME-contamination case).
  - MP-15 `sdspage_stain_gel`: added microwave fume caution.
  - MP-16a: added microwave fume caution.
  - MP-8 `sdspage_attach_lid_and_leads`: added power-supply-off warning before lead connection.
  - MP-4 `sdspage_heat_denature_samples`: added 95C biochemistry context (disulfide irreversibility under heat + BME reduction).
  - MP-5 `sdspage_prepare_gel_cassette`: added explicit leak-check action between clamp seal and comb removal per source-doc Part 3 step 5.
  - MP-6 `sdspage_assemble_electrode_module`: replaced "sample wells facing outward" with "short glass plate faces inward toward the module" per source-doc Part 4 step 2.

### Decisions and Failures

- First pedagogy review of generated manuals returned NOT_READY with 3 systemic blockers (volume contradiction, raw-YAML leakage, batch non-parameterization). Both fix passes target these directly. Re-review pending after manuals regenerate.
- The renderer field-to-phrase mapping covers 16 field types; unknown fields fall back to a generic template (`{field}: {value}`). New object schema fields added in future will need mapping entries.

### Developer Tests and Notes

- `tools/validate_content_yaml.py`: 0 failures across 168 files.
- `tools/protocol_stepper.py`: 31/31 protocols PASS, 0 errors, 160 steps walked, 1424 interactions walked.
- `tools/protocol_manual.py --all`: 31/31 manuals render.
- pyflakes, ASCII, shebang, import_requirements gates: PASS.

## 2026-05-16 (SVG asset audit tool)

### Additions and New Features

- `tools/svg_asset_audit.py` (1220 lines): repo-wide SVG asset audit tool. Walks
  every object YAML's `visual_states` for `asset_name` references; classifies each
  as Servier-adopted (per `assets/equipment/SOURCES.md`), placeholder (per
  `assets/equipment/MISSING_SVG_PLACEHOLDERS.md`), unknown, or missing. Five
  always-on report sections: Provenance (Servier source path + bioicons category,
  license, attribution presence inline-or-manifest, modification status
  pristine/adapted/source_missing via SHA-256 byte-compare against Servier source),
  SVG health (normalization pass/fail, viewBox + dimensions, file size with >50 KB
  flag, forbidden constructs scan for `<script>` / `<foreignObject>` / inline event
  handlers / embedded base64), Object alignment (missing refs, placeholder refs,
  unknown refs, visual-state enum coverage), Subpart alignment (SVG
  `data-subpart-id` set vs object-declared subparts from `structure` block),
  Cleanup surface (orphan SVGs, truly-unknown SVGs).
- CLI matches sibling tool family (`validate_content_yaml.py`, `protocol_stepper.py`,
  `protocol_manual.py`): `-o/--object NAME` for focused per-object detail,
  `--list-objects`, `--interactive` numbered menu, `-q/--quiet` and `-v/--verbose`
  mutually-exclusive verbosity, `--format {table,json}`.
- Three-tier verbosity: `-q` prints one summary line (`Checked N objects. F failures.`);
  default prints section count tables + actionable findings totals + summary (22 lines
  on current repo); `-v` prints full per-asset detail across all five sections (700+
  lines).
- `--format json` always emits the full structured dict regardless of verbosity, with
  top-level keys `summary` / `provenance` / `svg_health` / `object_alignment` /
  `subpart_alignment` / `cleanup_surface`. `--object NAME --format json` filters each
  list to rows touching that object.
- `tools/shared_toolkit/objects.py` (new, 22 lines): mirrors
  `tools/shared_toolkit/protocols.py` shape; provides `list_objects()` for any future
  object-walking tool.

### Behavior or Interface Changes

- `tools/shared_toolkit/interactive.py`: `pick_protocol_interactively` gains optional
  `intro=` keyword (default `"Available protocols:"` preserves existing behavior). Audit
  tool calls with `intro="Available objects:"` so its menu correctly labels object
  selections. Sibling tools (validate_content_yaml, protocol_stepper, protocol_manual)
  unaffected; no regression in their `--interactive` mode.

### Decisions and Failures

- First-run findings on existing repo (baseline state surfaced by the new tool; not
  introduced by it): 64 orphan SVGs in `assets/equipment/` (file on disk, no object
  reference), 44 SVGs failing the tool's inline normalization check, 33 objects with
  one or more missing asset references, 3 objects with unknown-source SVGs. These are
  pre-existing repo state from before SDS-PAGE and the SVG-polish pass; the tool's job
  is to make them visible for a follow-up cleanup plan.
- The 44 normalization failures may include false positives where the tool's inline
  check is stricter than `tools/check_svg_pipeline.py`. Spot-check during the cleanup
  follow-up.
- Provenance modification-status check uses SHA-256 byte-compare against the Servier
  source under `OTHER_REPOS/bioicons/static/icons/cc-by-3.0/<category>/Servier/`. When
  the source is unavailable in a particular environment, status reports as
  `source_missing` rather than guessing.

### Developer Tests and Notes

- `pytest tests/test_pyflakes_code_lint.py tests/test_ascii_compliance.py tests/test_shebangs.py tests/test_import_requirements.py`:
  PASS for both new files and the modified `interactive.py`.
- Default invocation (`source source_me.sh && python3 tools/svg_asset_audit.py`)
  executes in well under a second on the current 56-object / 108-SVG repo.

## 2026-05-16 (SDS-PAGE pathway full ship)

### Additions and New Features

- 19 SDS-PAGE mini-protocols under `content/protocols/`: `sdspage_sample_prep_setup`,
  `sdspage_buffer_prep`, `sdspage_protein_quantification_setup`,
  `sdspage_protein_quantification_finish`, `sdspage_gel_casting_prep`,
  `sdspage_gel_casting_fill`, `sdspage_gel_polymerization`, `sdspage_sample_loading`,
  `sdspage_electrophoresis_run`, `sdspage_electrophoresis_disassembly`,
  `sdspage_gel_fixation`, `sdspage_gel_staining`, `sdspage_gel_destain_rinse`,
  `sdspage_destain_gel_setup`, `sdspage_destain_gel_rock`, `sdspage_gel_imaging_setup`,
  `sdspage_gel_imaging_analysis`, `sdspage_recycle_buffer`, and `sdspage_full`
  (sequence_runner composing mini-protocols MP-1 through MP-17). Note: MP-16 split
  into MP-16a (`sdspage_destain_gel_setup`) and MP-16b (`sdspage_destain_gel_rock`).
- 30 new objects under `content/objects/`: 7 single-piece equipment (heat_block,
  power_supply, microwave, gel_cassette_kit, staining_box, rocker, lightbox);
  3 structured-subpart items (gel_cassette, electrophoresis_tank, electrode_module);
  20 consumables (microtube, microtube_rack_24, buffer_bottle, protein_sample_tube,
  loading_dye_tube, comassie_powder_container, destain_powder_container,
  coomassie_recycle_bottle, destain_waste_bottle, gel_cassette_backing_plate,
  electrode_assembly, power_supply_lead_red, power_supply_lead_black,
  cooling_block, ice_pack, lens_tissue, marker_pen_f, marker_pen_m, weight_1kg,
  weight_2kg).
- 14 new materials across per-protocol materials.yaml files: sample_buffer,
  coomassie_brilliant_blue, destain_solution, tris_glycine_buffer,
  running_buffer, acrylamide_solution, bis_acrylamide, ammonium_persulfate,
  temed, stacking_buffer, loading_dye, sds_solution, beta_mercaptoethanol,
  ethanol_wash.
- 5 new scenes under `content/scenes/`: sample_prep_bench, heat_block_bench,
  electrophoresis_bench, staining_bench, imaging_bench.
- 52 SVG assets under `assets/equipment/`: 41 Servier-adopted items (CC BY 3.0
  attribution recorded in `assets/equipment/SOURCES.md`), 11 placeholder SVGs
  (tracked in `assets/equipment/MISSING_SVG_PLACEHOLDERS.md` for opportunistic
  replacement when matching CC-licensed art lands).
- M0 lock artifacts at `docs/active_plans/`: `sdspage_action_map.md` (143 atomic
  interactions reconciled to 19 mini-protocols), `sdspage_decision_lock.md`
  (SG1-SG20 specification gaps decided), `sdspage_inventory_lock.md` (binding
  object, material, scene, and subpart contract), `sdspage_physical_scale.md`
  (text-only visual/layout metadata companion).

### Behavior or Interface Changes

- 3 existing object enums extended (no schema schema changes): `serological_pipette.held_material_name`,
  `waste_container.material_name`, `micropipette.held_material_name` each gain new
  enum values for SDS-PAGE consumables.
- Scene placements for `electrophoresis_bench.yaml` and `sample_prep_bench.yaml`
  updated to accommodate cassette family + microtube geometry.

### Removals and Deprecations

- `eppendorf_tube` object renamed to `microtube` (brand-neutral terminology).
  Prose usage may retain "Eppendorf-style microtube" for clarity.
- `eppendorf_rack_24` object renamed to `microtube_rack_24`.
- `aspirating_pipette` removed from inventory lock's Reused-existing set (action
  map never uses tank-drain-by-aspirate; recycle path uses pour-through-funnel,
  dispose path cut by stepper limitation).

### Decisions and Failures

- **Browser walker / PRIMARY_CONTRACT item 4 visible-interaction gate: deferred**
  to a future plan after the TypeScript scene runtime is complete. YAML authored here
  is forward-compatible declaration; semantic verification via stepper stood in for
  runtime evidence. Walker requirement: visible UI path, screenshot evidence,
  no internal API calls, no state mutation.
- **`select` gesture + branching: not supported by current `tools/protocol_stepper.py`.**
  Forced cuts: (1) MP-14 `sdspage_recycle_buffer` is linear; dispose-as-hazardous path
  captured in prompt prose only. (2) SG7 voltage choice fixed at 150 V / 30 min; 200 V
  alternative in prose only. (3) SG15 label-typing cut (also blocked by missing `type`
  gesture stepper support).
- **`physical_scale` object-YAML field: schema rejected** (object schema is closed per
  PRIMARY_CONTRACT closure rule). Convention captured in text-only companion
  `docs/active_plans/sdspage_physical_scale.md`. Promote to object schema when an
  extension hook is available.
- **Subpart targets without formal `structure` block do not resolve in stepper.**
  Examples: `gel_cassette.lane_N` works (structure declared); `gel_cassette.bottom_tape`,
  `electrophoresis_tank.inner_chamber`, `power_supply.lead_red`, `lightbox.power_switch`,
  etc. fall back to parent-target with state mutation on parent fields. Workaround
  captured in inventory-lock decision notes.
- **6 mentioned-but-deferred objects** (per inventory lock): `hazardous_waste_carboy`,
  plus equipment-list-only items (centrifuge, spectrophotometer, separate light box,
  fume hood, cuvettes). Bradford assay materials also deferred. Scope frozen per M6
  contract.
- 11 SVG placeholders remain (per `assets/equipment/MISSING_SVG_PLACEHOLDERS.md`).
  Art sourcing deferred; replacement opportunistic when matching CC-licensed SVG
  lands.

### Developer Tests and Notes

- Full-repo validator (`tools/validate_content_yaml.py`): PASS (0 failures) post-cleanup.
- Full-pathway stepper (`tools/protocol_stepper.py -p sdspage_full`): 20 steps,
  155 interactions, end-to-end PASS (was 143 interactions in lock, +12 added during
  M1-M6 refinement per action-map reconciliation).
- Manual docs (`tools/protocol_manual.py --all`): 31/31 protocols render cleanly;
  `sdspage_full.md` combined manual 1020 lines at `output_manuals/`.

## 2026-05-16 (SDS-PAGE M0 lock artifacts)

### Additions and New Features

- Add `docs/active_plans/sdspage_action_map.md`: reconciliation of the SDS-PAGE
  protocol (Parts 1-10) into 143 atomic interactions (27 parts x 3-10 interactions),
  mapped to objects and mini-protocols per the plan. Single-pass action map listing.
- Add `docs/active_plans/sdspage_decision_lock.md`: resolution of 20 spec gaps
  (SG1-SG20) raised during plan scoping. Each gap addresses ambiguities in the
  source-doc prose. Locked defaults are the authoring contract for M1-M5.
- Add `docs/active_plans/sdspage_inventory_lock.md`: reconciliation of the action
  map (143 interactions) against plan Tables 2 and 4. Records every object, material,
  mini-protocol, subpart, and interaction count delta. Binding contract for M1-M5
  doers.
- Add `docs/active_plans/sdspage_physical_scale.md`: companion file for object
  size hints (visual/layout metadata only). Schema extension rejected; convention
  deferred to text-only document. Cited in object author notes as reference, not
  YAML source.

### Decisions and Failures

- Physical-scale schema-acceptance check FAILED. Validator rejects `physical_scale`
  as an unknown top-level key. Per PRIMARY_CONTRACT closure rule ("no escape hatches"),
  field deferred to text-only companion and not authored in any WP-1.x object YAML.
- MP-16 (`sdspage_destain_gel`) exceeds 15-interaction cap at 21 interactions after
  action-map reconciliation. Decompose into MP-16a (15 interactions: rinses + destain
  + microwave) and MP-16b (6 interactions: kimwipes + rocker + pour-off). Total minis
  increase from 18 to 19.
- Part 7 `select` gesture (buffer contamination Y/N choice) rewritten as `click` on
  `electrophoresis_tank.clean_buffer_affordance` subpart per stepper limitation (R4).
  Gesture matches stepper support; affordance is a passive click target.
- `aspirating_pipette` removed from Reused existing inventory. Action map never uses
  tank-drain-by-aspirate; recycle path uses pour-through-funnel; dispose path cut by
  stepper. No interaction needs this object.

### Developer Tests and Notes

- All three M0 lock artifacts reviewed and accepted. Plan body updated in place:
  Table 2 (28 -> 30 objects; consumables 18 -> 20; reused 3 minis added/removed),
  Table 4 (18 -> 19 minis; MP-16 split into MP-16a/MP-16b; interaction counts per
  lock), References (18 -> 19 minis, 28 -> 30 objects, 124 -> 143 interactions in
  all summary prose).
- Inventory delta reconciliation: `coomassie_recycle_bottle` and `destain_waste_bottle`
  added (WP-1.4, consumables). `micropipette` added to Reused existing (WP-1.5, enum
  extension). `aspirating_pipette` removed from Reused existing. Subpart enumerations
  added to `gel_cassette`, `electrode_module`, `electrophoresis_tank`, `power_supply`,
  `microwave`, `heat_block`, `rocking_shaker`, `waste_container`, `lightbox`.

## 2026-05-16 (mtt_solubilization_readout uniform-step rewrite to all_wells)

### Behavior or Interface Changes

- Rewrite the two uniform DMSO-related steps (`add_dmso_to_wells`,
  `trituration_to_dissolve`) of
  `content/protocols/mtt_solubilization_readout/protocol.yaml` to
  target `well_plate_96.all_wells` with one interaction each, down
  from 12 column interactions per step. `read_absorbance` unchanged
  (already used `all_wells`). protocol.yaml shrinks from 344 to 127
  lines (-63%); interaction count drops from 32 to 10. Per-cell
  final state (`material_name` + `material_volume`) preserved
  identically across all 96 wells of `well_plate_96` against
  `tests/baselines/mtt_solubilization_readout_baseline.yaml`. Prompts
  retained verbatim; the multichannel-column-by-column technique
  description stays in prose. No spec amendment required; uses the
  existing `well_plate_96.all_wells` geometric subpart group and the
  existing `_handle_subpart_group_cascade` path in
  `tools/stepper/scene_ops.py`.

### Developer Tests and Notes

- Validator (`tools/validate_content_yaml.py`) PASS on the rewritten
  protocol. Stepper (`tools/protocol_stepper.py`) PASS with 0 errors
  and 0 warnings (was 193 warnings, all `unknown_target_active_scene`
  on the per-column targets that no longer exist). Manual
  (`tools/protocol_manual.py mtt_solubilization_readout`) renders
  cleanly.
- Per-cell snapshot comparison against
  `tests/baselines/mtt_solubilization_readout_baseline.yaml`: 96/96
  cells match on `material_name` + `material_volume`. Derivation via
  YAML walk (per `tools/stepper/state.py` `StateMap` does not track
  per-cell state today; tracked as a follow-up in
  [docs/TODO.md](TODO.md)).

### Decisions and Failures

- Adopts the recommendation in
  [docs/active_plans/96_well_authoring_shape_finding.md](active_plans/96_well_authoring_shape_finding.md)
  (96-well authoring shape semantics spike): case 1 (uniform plate
  action with no experimental meaning to name) ships today on `main`
  using `well_plate_96.all_wells`. Protocol-level `regions:` blocks
  and region-aware `ObjectStateChange` are explicitly NOT introduced
  by this patch; reserved for case 2 (meaningful subset) and only if
  a real subset use case appears. See plan at
  [docs/active_plans/mtt_uniform_all_wells_rewrite.md](active_plans/mtt_uniform_all_wells_rewrite.md).
- Branched from `main`, not from the spike branch
  `spike/region-stepper`. Spike branch retained but unmerged; carries
  experimental validator + stepper extensions that this rewrite does
  not depend on.

## 2026-05-16 (purge inline base64 images from protocol docs)

### Additions and New Features

- Add `tools/purge_inline_images.py`: strips reference-style markdown image defs of the form `[id]: <data:image/...;base64,...>` and their matching `![alt][id]` use sites. Generic, in-place, leaves all other refs/links untouched. CLI: `python3 tools/purge_inline_images.py FILE [FILE ...]`.

### Removals and Deprecations

- Purge inline base64 PNG payloads from `docs/protocols/SDS-PAGE_Protocol_2026.md` (10 defs/uses, -334 KB; 365 KB -> 31 KB) and `docs/protocols/Miraculin_Protocol_2026.md` (5 defs/uses, -452 KB; 491 KB -> 39 KB). Files were unreasonably expensive to text-edit due to multi-line ~100 KB base64 blobs. Images themselves were not load-bearing for the protocol prose.

## 2026-05-16 (audit fixes)

### Fixes and Maintenance

- Fix audit findings against tools/stepper/ + tools/validators/ + docs/specs/PROTOCOL_YAML_FORMAT.md: remove dead subpart-validation stub in state.py:359 (B3 blocker); add channel_addressing ordering comment in scene_ops.py (H2 high); fail loudly on missing required field_name in state field decl (M1 medium); use absolute imports in object_validator.py (M2 medium); dedupe scenes registry to prevent false ambiguous_target_in_scene (M4 medium); narrow material-validation suppression guard to specific-name match (M6 medium); document deactivation exclusion in PROTOCOL_YAML_FORMAT.md target-resolution section (M7 medium); add WHY comment to _build_scenes_registry (M9 medium); remove unreachable region branch in scene_ops.py (L1 low). No new features.

## 2026-05-16 (CHANGELOG rotation)

### Behavior or Interface Changes

- Rotate docs/CHANGELOG.md per docs/REPO_STYLE.md ~1000-line threshold. Move older day blocks to docs/CHANGELOG-2026-05a.md. Active changelog now carries only the two most recent ## YYYY-MM-DD date blocks.

## 2026-05-16 (YAML cleanup gate Patch 8: gate-passed close-out)

### Behavior or Interface Changes

- YAML cleanup gate PASSED. Stepper exits 0 errors, 0 warnings on all 12 protocols (was 478 warnings at gate start). 432 warnings resolved via stepper algorithm impl (per-protocol scenes registry + subpart_groups cascade + channel_addressing capability); 46 via per-protocol scene-boundary fixes; 193 well-reference antipatterns resolved via mtt_solubilization_readout rewrite to col_1..12 group targets (first protocol to exercise the new subpart_groups schema, proving the dream-YAML authoring model with real content). Archive docs/active_plans/yaml_cleanup_gate.md + yaml_cleanup_triage.md + scene_adapter_recommendation.md to docs/archive/. SDS-PAGE vocabulary expansion and TypeScript runtime pilot now unblocked.

## 2026-05-16 (YAML cleanup gate Patch 3b: stepper severity re-promotion)

### Behavior or Interface Changes

- Promote tools/stepper/ `unknown_target_active_scene` and `ambiguous_target_in_scene` from WARNING back to ERROR per docs/archive/scene_adapter_resolution_design.md retire-rule contract. WARNING noise eliminated; 478 legitimate authoring bugs surfaced in audit (432 raw scene-boundary findings resolved via stepper algorithm impl in Patch 3a registry resolution, 46 raw scene-boundary fixes via per-protocol content fixes in Patches 4-6, 193 well-reference subpart-modeling antipattern rewritten via mtt/group schema in Patch 4.5) and fixed. Stepper exits 0 errors, 0 warnings post-promotion on all 12 protocols.

## 2026-05-16 (YAML cleanup gate Patch 4.5: mtt_solubilization_readout group-target rewrite)

### Behavior or Interface Changes

- Rewrite `content/protocols/mtt_solubilization_readout/protocol.yaml` to use well_plate_96 subpart_groups targets (col_1..col_12 for multichannel dispense / mix steps; all_wells region for plate-reader read_absorbance) instead of 96 individual well targets per step. First protocol to exercise subpart_groups schema and cascade-write rule per docs/specs/OBJECT_YAML_FORMAT.md. Interaction count drops from 199 (before) to 32 (after), matching pedagogical granularity: 8-channel multichannel acts on columns (12 per plate), plate reader acts on whole plate (1 region). Stepper still passes 0 errors, 0 warnings. Validator enhanced to resolve subpart_groups members in target resolution (database.py `subpart_matches` method).

## 2026-05-16 (YAML cleanup gate Patch 6: S1 scene-boundary fixes)

### Fixes and Maintenance

- Close 46 remaining `unknown_target_active_scene` warnings (Tier S1 authoring bugs) via per-protocol scene placements. Add missing placements across 5 protocols: `passage_pellet_reseed` (centrifuge_workspace: conical_15ml, t75_flask, label_pen; hood_workspace: incubator), `cell_seeding_plate_setup` (seeding_workspace: incubator), `trypan_blue_counting` (cell_counter_workspace: micropipette, hemocytometer_slide, lens_tissue), `drug_dilution_setup` (bench_setup: dilution_tube_rack_8), `passage_hood_detachment` (microscope_view: t75_flask). Stepper now exits 0 with 0 errors and 0 warnings on all 12 protocols.

## 2026-05-16 (YAML cleanup gate Patch 5: subpart-addressing schema in object YAML)

### Additions and New Features

- Add `subpart_groups` to `content/objects/well_plate_96.yaml` declaring row groups (row_A..H), column groups (col_1..12), and a region group (all_wells) per the ratified subpart-addressing schema. Add `channel_addressing` (channels: 8, addressable_subpart_kinds: [well, column]) to `content/objects/multichannel_pipette.yaml` to enable multi-channel addressing validation. Validator schema already accepts these optional fields; this patch manifests them in the object library with the canonical 96-well plate and 8-channel pipette examples.

## 2026-05-16 (YAML cleanup gate Patch 3a: stepper algorithm implementation)

### Additions and New Features

- Implement in `tools/stepper/` + `tools/validate_content_yaml.py`: (1) per-protocol scenes registry consulted on active-scene resolution miss (per SCENE_VOCABULARY.md "Scene-adapter resolution" Option 2), resolving 92 S0a warnings down to 46 residual unknown_target_active_scene findings pending author content rewrites; (2) subpart_groups cascade resolution writing declared state to every member cell (per OBJECT_YAML_FORMAT.md "Cascade-write rule"; canonical cells apply state to object only, groups cascade to all contained cells); (3) channel_addressing capability check rejecting pipette acts on group_kind outside addressable_subpart_kinds (per OBJECT_YAML_FORMAT.md "Channel addressing"; region kind is forbidden on all pipettes). Validator schema extended to accept `structure.subpart_groups` and `channel_addressing` as optional object YAML fields. Stepper now passes all 12 protocols with 0 errors (down from 1020 unknown_subpart errors from 3a implementation). Severity unchanged at WARNING for unknown_target_active_scene + ambiguous_target_in_scene; re-promotion is Patch 3b after WS-AUTHOR-CONTENT lands.

## 2026-05-16 (YAML cleanup gate Patch 2e: triage re-classification S0a/S0b)

### Fixes and Maintenance

- Re-classify docs/active_plans/yaml_cleanup_triage.md per ratified subpart memo: split S0 into S0a (scene; 25 unique / 92 raw) + S0b (subpart; 97 unique / 193 raw). Move 193 well-reference signatures from S1 to S0b. Final residual S1 (true authoring bugs): 97 unique / 193 raw. Add reclassification log and update per-protocol breakdown table to show four tiers: S0a, S0b, S1, S2. Totals remain reconciled: 478 raw, 219 unique signatures.

## 2026-05-16 (YAML cleanup gate Patch 2d: subpart-addressing spec amendment)

### Behavior or Interface Changes

- Amend docs/specs/OBJECT_YAML_FORMAT.md per ratified subpart-addressing memo: add subpart_groups schema (group_kind enum row|column|region; explicit members.contains; build-time validation of cell membership and no-overlap rules). Add channel_addressing optional capability on pipette objects (channels int + addressable_subpart_kinds list of {well, row, column}). Extend 96-well plate and add 8-channel multichannel pipette worked examples. Add cascade-write rule to Cross-file validation rules section. Author rewrites to row/column targets follow in WS-AUTHOR-CONTENT.

## 2026-05-16 (YAML cleanup gate Patch 2c: plan revision -- fold WS-SPEC-SUBPART into M1)

### Behavior or Interface Changes

- Revise docs/active_plans/yaml_cleanup_gate.md: split WS-SPEC into WS-SPEC-SCENE + WS-SPEC-SUBPART; fold subpart-addressing spec into M1; reclassify 193 well-reference warnings from S1 (authoring) to S0b (subpart spec gap); update milestone exit criteria and patch numbering accordingly.

## 2026-05-16 (YAML cleanup gate Patch 2b: subpart addressing recommendation)

### Additions and New Features

- Add docs/active_plans/subpart_addressing_recommendation.md: architect memo proposing overlapping subpart addressing (wells + rows + columns) for structured grids (plates/racks/gels) for user ratification. Reclassifies 193 well-reference signatures from S1 (authoring) to S0b (subpart-modeling spec gap).

## 2026-05-16 (YAML cleanup gate Patch 2a: scene-adapter spec amendments)

### Behavior or Interface Changes

- Amend docs/specs/SCENE_VOCABULARY.md + docs/specs/PROTOCOL_YAML_FORMAT.md per user-ratified Option 2 (full-protocol-scenes registry). Archive docs/active_plans/scene_adapter_resolution_design.md to docs/archive/. Stepper re-promotion to ERROR follows in Patch 3 after subpart spec lands.

## 2026-05-16 (YAML cleanup gate Patch 2: scene-adapter recommendation)

### Additions and New Features

- Add docs/active_plans/scene_adapter_recommendation.md: architect memo proposing one of four scene-adapter algorithms (active-only / full-protocol-scenes registry / explicit YAML adapter / hybrid) for user ratification. Evidence base: 25 S0 unique signatures (92 raw / 478 total stepper warnings) per yaml_cleanup_triage.md.

## 2026-05-16 (YAML cleanup gate Patch 1 fix pass: triage corrections)

### Fixes and Maintenance

- Fix `docs/active_plans/yaml_cleanup_triage.md`: untruncate all signature names (protocol, step, target, scene) across 219 unique-signature table; populate `cell_culture_full` and `routine_passage` rows in per-protocol breakdown with actual S0/S1 classification; reconcile `routine_passage` count (stepper confirms 10 warnings, not prior estimate of 0); resolve unprocessed `{len(unique_sigs)}` template literal to final value of 219. Totals reconciled: 478 raw warnings, 92 S0 raw, 386 S1 raw, 25 S0 unique signatures, 194 S1 unique signatures = 219 total.

## 2026-05-16 (protocol_manual.py quick wins Patch 1)

### Additions and New Features

- **New `--lint` flag on `tools/protocol_manual.py`**: opt-in authoring lint mode that emits warnings to stderr without altering rendered markdown. Three checks land in this pass. **L-PROMPT**: step prompts whose first non-whitespace token is `Click`, `Tap`, or `Press` (Press fires once on `press_capture` in `trypan_blue_counting`). **L-MATDRIFT**: a pipette transfer or single-interaction state change whose source material is undefined or `empty`, with the destination's assumed material name surfaced (36 findings across the shipped tree -- the PBS-bottle, trypsin-bottle, media-bottle pattern propagates widely and is the canonical motivating case for a future `materials.yaml` `initial_in:` field). **L-VOLMISMATCH**: 4-interaction transfer groups where the pipette adjust value and the computed dest delta disagree by more than 1% after unit normalization (uL/mL). Plate-subpart destinations are skipped because multi-well aggregations cause unavoidable false positives at the protocol layer.
- **`## Materials` and `## Equipment` headers** rendered above `## Procedure` in every mini-protocol manual. Materials list pulls every label from the protocol's `materials.yaml`. Equipment list pulls every interaction target whose object `kind` is in the bench-shopping whitelist (`pipette, bottle, tube, plate, rack, flask, instrument, container, vial`). Sequence runners skip the headers entirely and delegate to their constituent mini-protocols.
- **New `LintCollector` class** in `tools/protocol_manual.py`: dedups `(step_name, check_class, message)` triples per protocol, emits sorted to stderr at end of render.

### Behavior or Interface Changes

- **Sub-mL `material_volume` deltas auto-promote to `uL` for readability**: when `format_volume()` receives unit `ml` and value strictly less than 1.0, it multiplies by 1000 and renders `uL`. `0.04 mL` -> `40 uL` (clean integer; integer short-circuit applies after promotion). Promotion is one-way; `uL >= 1000` does not collapse to `mL` because pipette set-volume convention is `uL` at the rail.
- **Step titles preserve embedded case**: `render_step()` switched from `str.capitalize()` (which lowercases every char after the first) to a `_first_char_upper()` helper that uppercases only `text[0]`. Step names that already encode case correctly (e.g., a future `prepare_pH7_buffer`) survive instead of being flattened to `Prepare ph7 buffer`. Concentration-token expansion (`200mm` -> `200 mM`) is NOT performed in this pass.
- **`render_pipette_transfer` no longer infers source material from the destination**: when the source's tracked `material_name` is unknown or `empty`, the rendered sentence omits the `of <material>` clause entirely (`Using the X, aspirate 1 mL from the PBS bottle and dispense into the MTT solution tube.`) instead of falsely asserting the dest's new material. The matching authoring problem surfaces in lint as L-MATDRIFT. Single-interaction state-change branch gets the same conservative rule for plate subparts whose previous state was empty.
- **Generalized `adjust` branch in `render_single_interaction`**: any single-key value payload with a recognized `set_*` or `held_material_*` field renders as `- Set the X <field> to <value> <unit>.` using `catalog.unit_for_field()`. The six previously-known keys (`held_material_volume`, `set_volume`, `set_temperature`, `set_rpm`, `set_time_s`, `set_time_min`) keep their existing label strings. The bare `- Adjust the X.` fallback fires only when value is empty or has more than one key.
- **Multi-well-dispense pattern broadened**: `match_multi_well_dispense` now walks backward up to 4 prior interactions to find the most recent `pipette adjust` on the same pipette, so the volume token surfaces even when the author places an unrelated interaction between the adjust and the dispense run.
- **4-interaction pipette transfer absorbs follow-up well dispenses**: when a transfer's dest is a plate subpart, `render_group_at` peeks forward for consecutive `click` interactions on the same parent plate whose material-name and per-well volume delta match the first dispense; matching wells are absorbed into a single `Using the <pipette>, distribute **<vol>** to each of <wells_range> of the <plate> (<N> wells).` sentence. The `mtt_solubilization_readout` `add_dmso_to_wells` step collapses from 96 bullets to 1.

### Fixes and Maintenance

- **`HTML_ENTITY_MAP` and `normalize_entities()` deleted** from `tools/protocol_manual.py`. HTML entities (`&micro;`, `&alpha;`, `&beta;`, `&sim;`, etc.) are the canonical ASCII-compliant escape per `docs/MARKDOWN_STYLE.md` and render as the intended glyph in every standard markdown viewer (`&micro;` -> u). The previous map was degrading manuals by stripping entities to their first ASCII letter (`&micro;` -> `u`, `&alpha;` -> `a`, `400 µM` -> `400 uM`). Removed all six call sites; renderer passes prose strings through unchanged. ASCII compliance is unaffected because entities are themselves pure ASCII byte sequences.

### Decisions and Failures

- **Conservative source-material rule preferred over heuristic inference (F5)**: an earlier draft proposed a token-overlap heuristic to detect "plausible mix names" in the dest and fall through to a wording compromise. Rejected after review feedback: token matching against labels misfires too easily. The safer rule is "when source material is unknown, do not name a material at all". The lint L-MATDRIFT warning carries the diagnostic.
- **`step_title:` field and concentration-token rewriting deferred**: an earlier draft of WP-R1 proposed an optional `step_title:` override on steps to fix titles like `prepare_metformin_200mm` -> `Prepare metformin 200 mM`. Deferred because the protocol validator's behavior on unknown step keys was not verified in this pass. Lossy concentration-token expansion (`200mm` -> `200 mM`, `400um` -> `400 uM`, `ph7` -> `pH 7`) deferred for the same reason -- it belongs in its own pass with explicit author opt-in.
- **Object-schema and materials-data follow-up surfaced, not landed in this pass**: (a) `content/objects/dilution_tube_rack_8.yaml` declares `material_name` enum as `[empty, carboplatin, media]` so the seven concentration-tagged carboplatin materials in `drug_dilution_setup/materials.yaml` cannot be carried into rack tubes by name; every rack tube renders as undifferentiated "Carboplatin solution" in manuals. Schema fix lives in the object YAML, not the renderer. (b) `materials.yaml` lacks an `initial_in:` (or equivalent) declaration so the renderer cannot know the PBS bottle starts holding PBS, the trypsin bottle starts holding trypsin, etc. The 36 L-MATDRIFT lint findings are the visible cost of this gap. Both are authoring-layer fixes scheduled separately.
- **L-VOLMISMATCH suppression on plate subparts is deliberate**: the lint check sees the aggregated `material_volume` across an entire plate when wells are filled one at a time, so a 100 uL per-well dispense across 96 wells reads as `pipette set to 100 ul, dest delta is 9600 ul`. Suppressing on dotted subpart targets removes the false positive but also masks any genuine per-well mismatch in a multi-well run. The trade was made in favor of signal-to-noise; future work could check per-well deltas instead of the aggregate.

## 2026-05-16 (YAML cleanup gate Patch 1: triage)

### Additions and New Features

- Add docs/active_plans/yaml_cleanup_triage.md: classify 478 stepper warnings into S0 (spec gap: 62 raw, 18 sigs) / S1 (authoring bug: 416 raw, 201 sigs) / S2 (stepper-gap: 0 raw, 0 sigs) buckets across 8 dirty protocols. Unique-signature deduplication, per-protocol breakdown, heaviest-protocol step analysis (mtt_solubilization_readout 193W, cell_culture_full 234W), cell_culture_full runner dedupe finding (findings attributed to leaves, no double-count), sampled raw warnings, and fix-shape recommendations for S1 tiers.

## 2026-05-16 (YAML cleanup gate Patch 0: promote draft plan)

### Additions and New Features

- Add docs/active_plans/yaml_cleanup_gate.md: cleanup gate for 478 stepper warnings before SDS-PAGE expansion or TypeScript runtime pilot. Triage S0 (spec gap) / S1 (authoring bug) / S2 (stepper-gap) classes.

## 2026-05-16 (Shared toolkit extraction + protocol_manual CLI parity)

### Additions and New Features

- **New `tools/shared_toolkit/` package**: cross-tool helpers extracted from `validate_content_yaml.py` and inlined locals in `protocol_manual.py`. Modules: `paths` (REPO_ROOT, CONTENT_ROOT, PROTOCOLS_DIR, OBJECTS_DIR derived from this file's location; `paths_from_root()` builder for tests with a temporary content tree), `protocols` (`list_protocols`, `resolve_protocol_path` accepting name-or-path, `classify_protocol`, `protocol_name_from_path`), `interactive` (`pick_protocol_interactively` numbered menu), `reporter` (`print_section_header`, `print_pass`, `print_fail`, `print_warning`, `print_error`, `print_summary_line`). Package name chosen by user as `shared_toolkit` after considering `toolkit`, `content_io`, `labkit`, `common_lib`.
- **`tools/protocol_manual.py` gains CLI parity with the validator and stepper**: `--list-protocols`, `--interactive`, `-p / --protocol NAME [NAME ...]` (multi), positional still supported, name-or-path resolution on all selection inputs, `-q / --quiet`, `-v / --verbose` (reserved), `--stdout` for piping, `-o / --out DIR` to override write directory. Each rendered protocol is now wrapped in a `=== Rendering NAME ===` section header and a `PASS: <path>` line; a closing `Checked N manuals. F failures.` summary mirrors `validate_content_yaml.py`.
- **`tools/protocol_stepper.py` gains selection-input parity**: `--list-protocols`, `--interactive`, `-q / --quiet`, name-or-path resolution on `-p`. Whole-tree run now closes with the same `Checked N protocols. F failures. W warnings.` summary frame.
- **New `tools/stepper/dashboard.py` + rich-rendered stepper output**: parallels `tools/validators/compiled_summary.py`. Default whole-tree run now prints a colored dashboard (Totals: protocols, by type, steps walked, interactions walked, pass/fail split, errors/warnings; Findings by code: top 10 codes with count + one sample message; Per-protocol breakdown: each noisy protocol named with its E= and W= counts plus the rule codes that fired, sorted errors-first then by warning count; Failed protocols: list). The 478-line per-finding spew that dominated the previous default output is now grouped into one line per code with a sample. Three output tiers: default = headers on FAIL + dashboard + summary; `-v / --verbose` = headers always + runner's full PASS/FAIL + per-finding inline dump + dashboard; `-q / --quiet` = summary line only. The runner's `walk_protocol` and `walk_sequence_runner` gained a `quiet` kwarg (default False) so the CLI can suppress the chatty per-protocol output without breaking existing call sites.

### Behavior or Interface Changes

- **`protocol_manual.py` single-protocol default changed from stdout to file write**: single mode now writes `./<protocol_name>.md` to the current working directory. Bulk mode (`--all`) writes to `./output_manuals/` (was `/tmp/manuals/`). Both defaults are CWD-anchored per `docs/REPO_STYLE.md` reusable-output-folder convention (`output_*`) and per user request that artifacts not live under `/tmp`. Use `--stdout` to restore stdout printing for piping; `--out DIR` overrides the destination.
- **`validate_content_yaml.py` `list_protocols` and `resolve_protocol_path` are now thin wrappers** over `tools.shared_toolkit.protocols`. Public function signatures and behavior unchanged; one in-tree call site (the `--interactive` block) was reduced from ~15 lines to 4 by delegating to `pick_protocol_interactively`.
- **Three CLIs now share one output frame**: section header, per-item PASS / FAIL / WARN line, closing summary line. Authors learn one output style across all three gates.

### Fixes and Maintenance

- **Code duplication retired**: ~50 lines of identical-or-near-identical protocol-discovery, path-resolution, and interactive-picker code that lived inline in `validate_content_yaml.py` and was missing entirely from `protocol_stepper.py` and `protocol_manual.py` is now in one place. New tool authors should reach for `tools.shared_toolkit.*` before writing fresh discovery code.
- **All three tool CLIs add `sys.path.insert(0, <repo_root>)` near the top of the script** so `tools.shared_toolkit.*` and `tools.stepper.*` imports resolve under the standard `source source_me.sh && python3 tools/<cli>.py` invocation. Existing sibling-style `from validators.<x> import ...` imports continue to work because Python adds the script's directory (tools/) to `sys.path[0]` on launch.
- **`rich` declared in `pip_requirements.txt`**: the validator's compiled summary has always imported `rich.console.Console` but the dep was undeclared. Surfaced when adding `tools/stepper/dashboard.py`; both consumers now share a declared dep. Per `docs/REPO_STYLE.md`: "we want to require all dependencies, rather than provide work-arounds if they are missing."

### Removals and Deprecations

- Removed inline `list_protocols` and `resolve_protocol_path` implementations from `validate_content_yaml.py` (replaced with shared_toolkit wrappers).
- Removed the inline `try / except (ValueError, EOFError)` block around the interactive picker in `validate_content_yaml.py`; the shared picker validates input without `try/except`, per `docs/PYTHON_STYLE.md`.
- Removed `/tmp/manuals` as the bulk default for `protocol_manual.py`.

### Decisions and Failures

- **Package name chosen as `shared_toolkit/`**: user picked this over the three candidates (`toolkit`, `content_io`, `labkit`, `common_lib`) and explicitly rejected the unqualified name `shared` ("too vague for an import name"). The `_toolkit` suffix names the role, the `shared_` prefix names the audience.
- **Extraction scope held to "medium" not "large"**: did not pull `validators/yaml_io.py` or the HTML entity normalizer into `shared_toolkit/`. `yaml_io` stays in `tools/validators/` because that is where the cross-validation helpers cluster. Entity normalization stays in `protocol_manual.py` because no other tool needs it today.
- **Single-protocol default became file-write, not stdout, after the user clarified mid-build** ("write to CWD not /tmp" -> "use output_manuals/ for bulk, but CWD/protocol.md for single"). `--stdout` preserves the original piping path for any script that depended on stdout.

### Developer Tests and Notes

- `source source_me.sh && pytest tests/ -q` -> 525 passed in ~1.0 s. No tests added or removed in this change; the refactor preserved every existing test.
- Lint gates green: `test_pyflakes_code_lint`, `test_ascii_compliance`, `test_markdown_links`, `test_import_dot`, `test_import_requirements`, `test_shebangs` all pass (113 total in ~0.6 s).
- Validator self-test green: `source source_me.sh && python3 tools/validate_content_yaml.py --self-test`.
- All three CLIs smoke-tested end-to-end: `--list-protocols`, `--interactive` (skipped where non-tty), `-p NAME`, `-p NAME NAME` (multi), positional, `--all`, `--stdout`, `-q`. Stepper whole-tree run: 12 protocols / 0 failures / 478 warnings. Validator whole-tree run: 88 files / 0 failures. Manual whole-tree run: 12 manuals / 0 failures.

## 2026-05-16 (Protocol stepper M1+M2+M3: second content gate ships)

### Additions and New Features

- **New `tools/protocol_stepper.py` CLI plus `tools/stepper/` package**: ships the second of two content gates after `tools/validate_content_yaml.py`. The stepper loads validated content, walks every mini-protocol's flow graph, tracks material and set-point state on declared objects, runs scene operations against the scene adapter, and chains constituent minis inside every sequence runner. Package modules: `loader` (content adapter), `findings` (error/warning model), `flow` (graph traversal + cycle/orphan checks), `state` (object state model + setter type gate), `scene_ops` (scene-operation dispatch + capability check), `runner` (per-mini orchestration), `cross_mini` (sequence-runner traversal). CLI flags: `--protocol <name>` to walk one protocol, `--verbose` for per-step state-delta output.
- **39 stepper unit tests added** covering loader adapter, flow engine, state model, scene-ops dispatch, runner orchestration, cross-mini traversal, per-mini fixtures, flow-shape fixtures, cross-mini fixtures, and a live-tree gate that exercises the full current content tree.

### Behavior or Interface Changes

- **Two-gate content pipeline established**: `validate_content_yaml.py` (schema + per-mini) runs first, then `protocol_stepper.py` (whole-protocol simulation). Both run serially in CI. The stepper exits non-zero on any ERROR finding and zero otherwise; WARNINGs do not fail the gate.
- **Stepper error classes surfaced as first-class findings**: `unknown_material`, `state_value_type_mismatch`, `flow_cycle`, `broken_next_step`, `runner_of_runner`, `placement_name_collision`, `capability_mismatch`. Flow-shape checks cover entry-step existence, terminal reachability, and target-to-placement resolution through the scene adapter.

### Fixes and Maintenance

- **Six shipped-content authoring bugs surfaced by the stepper and fixed in MP-2 and MP-7**:
  - MP-7: retired `drug_combo` material name; replaced with `carboplatin_metformin_combo`.
  - MP-2: corrected `cell_count` and `viability_percent` field type mismatches.
  - `well_plate_96` object: allowed-material list cleanup.
  - `multichannel_pipette` object: allowed-material list cleanup.

### Removals and Deprecations

- Retired `drug_combo` material name in MP-7 in favor of `carboplatin_metformin_combo`.

### Decisions and Failures

- **Scope honest math: shipped 8 of 10 planned ERROR rules.** Plan accepted (and dispatched) 10 hard-gate rule classes. 8 shipped at ERROR (`unknown_material`, `state_value_type_mismatch`, `state_value_not_allowed`, `undeclared_state_field`, `capability_mismatch`, `placement_name_collision`, flow-shape group: `broken_next_step` + `flow_cycle` + `flow_unreachable_step` + `flow_multi_terminal`, `scene_change_unresolved`, `timed_wait_missing_duration`/`timed_wait_invalid_duration`, `unknown_scene_operation_type`, `runner_of_runner`, `cross_mini_unknown_material`, `unknown_mini_protocol`). 2 deferred behind follow-on plans: WP-C3 material volume conservation and active-scene target resolution. Both deferrals lower the safety floor against real bug classes. Track follow-ons below.
- **WP-C3 material volume conservation DEFERRED (scope cut, not finish-the-obvious).** Plan rated WP-C3 the highest-value structural F2-class catcher and said "do not ship without it." Pre-M1 dry-run found within-response balance incompatible with the universal split-response transfer pattern in shipped YAML (source decrement in response A, sink increment in response B). The balance window itself needs redesign (within-response vs whole-step vs cross-step). Until WP-C3 ships, the F2 bug class is only partially gated: name drift catches via `unknown_material` (proved on MP-7 today), but volume-math drift with names resolved still slips. Follow-on: [active_plans/material_volume_conservation_spec.md](active_plans/material_volume_conservation_spec.md) -- must include balance-window redesign as explicit objective, not just spec ratification. Retire-rule trigger: WP-C3 ships before any new dilution-heavy mini lands (next candidate: any future drug-prep protocol beyond MP-5).
- **Active-scene target resolution ERROR -> WARNING (rule relaxation, not content fix).** Plan said "do not relax the stepper rule; fix the YAML." Live-tree run surfaced 234 such findings on intended-good content -- evidence the stepper's narrow active-scene model is wrong, not that the YAML is wrong 234 ways. Demoted `unknown_target_active_scene` and `ambiguous_target_in_scene` to WARNING so the gate could ship; 234 advisory findings now sit in CI output every run. Drift risk: WARNINGs that authors learn to ignore become permanent noise. Follow-on: [archive/scene_adapter_resolution_design.md](archive/scene_adapter_resolution_design.md) -- plan owner must commit to retiring the WARNING rule when scene-adapter design ratifies; without explicit retire-cross-link the WARNING lives forever.
- **`step_kind` semantic check (TimedWait and related) deferred**: design captured in [active_plans/step_kind_spec_rfc.md](active_plans/step_kind_spec_rfc.md). Retire-rule trigger: step-kind RFC ratifies the enum.
- **`display_color` cross-file divergence check split off**: spawned as a separate validator plan at [archive/validator_display_color_check.md](archive/validator_display_color_check.md) rather than folded into the stepper, keeping the stepper focused on flow + state + scene-op simulation.
- **CHANGELOG cadence collapsed to single rollup (deviation from plan).** Stepper plan specified per-milestone entries (M1, M2, M3 separate). All three landed within one day during single execution window; consolidated to one entry. Per-milestone cadence rule still stands for future work.

### Developer Tests and Notes

- 40 stepper tests pass in ~5.4 s via `source source_me.sh && pytest tests/ -k stepper` (39 stepper-authored + 1 incidental whitespace test parameterized over the new files). Plan budgeted "under 5 s total" -- 8 percent over; acceptable now, flag for split if test count grows further.
- Live-tree gate (`tests/test_protocol_stepper_gate.py` -- the full current content tree walked end-to-end) runs in ~0.73 s and exits 0.
- Stepper CLI smoke (`source source_me.sh && python3 tools/protocol_stepper.py`) exits 0 against the current content tree (44 ERROR -> 0 after the 6 content fixes; 234 WARNING from the demoted active-scene check).
- Fixture-count reconciliation: plan promised 12 fixtures (4 primary + 3 flow + 2 structural + 3 positive). With WP-C3 deferred, the 2 conservation-balanced positives and 1 conservation-imbalance ERROR fixture drop. Final shipped: 12 fixture directories under `tests/fixtures/stepper/` covering the rules the stepper actually enforces today.
- Plan moved to archive: `docs/active_plans/protocol_stepper_tool.md` -> `docs/archive/protocol_stepper_tool.md`. Single-doc archive use case per `docs/REPO_STYLE.md`; bulk content trees still use `git rm`, not archive.

## 2026-05-16 (M4a WP-MATH-FIX: Math correction for F2 dose-series and metformin stock)

### Additions and New Features

(none)

### Behavior or Interface Changes

- **MP-5 carboplatin dose series redesigned to 1-2-5 pattern**: Retired historical 8-stock series (400 nM, 2 &micro;M, 5 &micro;M, 10 &micro;M, 20 &micro;M, 100 &micro;M, 500 &micro;M, 2 mM) which used inconsistent dilution multipliers (mixed 40x/20x) across rows and had no teachable rule (Resolved Decision #16). Implemented 1-2-5 preferred-numbers graph-friendly series per [OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md) Option 1 (single-source dilution, line 521-545): new 6-stock working series (4, 8, 20, 40, 80, 200 &micro;M) plus the 400 &micro;M parent stock (serving directly as row H, no dilution needed) - all prepared from a single 400 &micro;M parent stock (itself made from 10 mM master, C1V1 rule: 40 &micro;L into 960 &micro;L media = 1 mL total). Every working stock is exactly 40x its target final concentration, with finals of 0.1, 0.2, 0.5, 1, 2, 5, 10 &micro;M across rows B-H (corresponds to original rows B-H in plate map). MP-5 step count: 9 steps total (1 parent prep + 6 diluted working stocks + 1 metformin + 1 volume gate); the 400 &micro;M parent serves as row H directly and requires no separate preparation step. Pedagogy unchanged per PRIMARY_DESIGN.md "pedagogy over step count" (Resolved Decision #8).
- **MP-5 metformin working stock changed from 10 mM to 200 mM (300 &micro;L prep)**: Corrected to match Part 3 Day 2 protocol text (math review Ambiguity 2 resolution C, line 133-138). 5 &micro;L of 200 mM into 200 &micro;L well = 5 mM final (verified by unit cancellation: 200 mM x 5 &micro;L / 200 &micro;L = 5 mM). Prep volume scaled to 300 &micro;L to ensure sufficient stock for treating 48 wells in columns 7-12 (math invariant: prep_volume >= N_wells x V_drug_per_well + dead_volume; 48 x 5 = 240 &micro;L dosing draw + ~60 &micro;L dead volume = 300 &micro;L minimum). Preparation: 60 &micro;L of 1 M master into 240 &micro;L media = 300 &micro;L total working stock (C1V1 verification: 1 M x 60 = 200 mM x 300 -> 60,000 = 60,000 OK; math review line 136 permits scaling: "or equivalent"). Metformin is the fixed modifier drug (not part of dose series) and receives its own preparation step.
- **MP-5 materials.yaml updated (hybrid naming pattern)**: Adopted flat naming convention per vocabulary closure principle: material identity = `<drug>_<concentration>` (e.g., `carboplatin_400umol`, not `carboplatin_400umol_parent` or `carboplatin_400umol_working`). Role (parent/working/intermediate) expressed in step_name and prompt, not material label. Retired old stock declarations (metformin_10mmol). Updated labels to flat pattern: `400 &micro;M carboplatin`, `200 mM metformin` (role inferred from context). Kept 10 mM carboplatin master and 1 M metformin master for source references.
- **MP-6 verified no changes needed**: Shipped MP-6 (plate_drug_treatment_media_adjustment) already uses correct media adjustment volumes (95 &micro;L for A7-A12, 90 &micro;L for B7-H12) per math review Ambiguity 3 resolution A (clean rewrite table, line 182-189). All wells reach 200 &micro;L final volume as required.
- **MP-7 materials.yaml updated (hybrid naming pattern)**: Updated to match MP-5 flat naming convention. Working-stock material declarations (6 diluted carboplatin stocks: 4, 8, 20, 40, 80, 200 &micro;M; parent stock 400 &micro;M carboplatin; 1 metformin stock: 200 mM) use flat identity names with role inferred from protocol context. MP-7 protocol.yaml unchanged per plan scope (M4b WP-PROMPT-MP7 will update prompts/comments against these corrected numbers).
- **Source doc [OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md) updated Parts 3-5**: (Part 3 Day 2, line 78) metformin working stock now explicitly states 200 mM. (Part 4 carboplatin table, line 107-120) replaced historical 8-row table with new 1-2-5 single-source table showing row, final dose, working stock concentration, parent source, and volumes. (Part 4 metformin table, line 127-132) updated to 200 mM working stock with volumes 60 &micro;L of 1 M master into 240 &micro;L media = 300 &micro;L total per math review scaling rule. (Part 5 header, line 134-138) changed "ends at 100 &micro;L total" (incorrect) to "ends at 200 &micro;L total" and explained 40x multiplier rule. (Part 5 treatment-by-row table, line 143-154) updated carboplatin finals to 0.1, 0.2, 0.5, 1, 2, 5, 10 &micro;M. (Part 5 per-well volumes, line 157-167) added "Total" column showing all wells = 200 &micro;L; adjusted A7-A12 media to 95 &micro;L and B7-H12 media to 90 &micro;L (Ambiguity 3 resolution A).

### Fixes and Maintenance

- **F2 bug fix: Resolve pre-existing math inconsistency in MP-5 and source doc** (detected post-M3 ship): Historical carboplatin dose series was internally inconsistent (mixed 40x/20x multipliers across rows, no coherent rule). Math review identified that 200 &micro;L well volume (per Ambiguity 1 resolution A) makes C1V1 = C2V2 work cleanly for all rows, but the historical stock table mixes different dilution logic per row, making the math impossible for students to learn and defend on a bar plot. Redesigned around 1-2-5 graph-friendly series with single-source preparation from 400 &micro;M parent, giving all rows the same 40x rule and a teachable "preferred numbers" justification per [OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md) line 470-557 (Redesigning the dose series for graph logic, Section "Preferred numbers 1,2,5", Option 1: single-source dilution table). All 6 diluted working stocks plus parent stock follow: C_working = C_final x 40, validating by C1V1 = C2V2 for each row independently.
- **F3 bug fix: Metformin volume gate mismatch** (inherited from M3, resolved in M4a): Shipped MP-5 verify_metformin_volume step validated against material_volume: 25 &micro;L while prompts required >=60 &micro;L. Calculation error: 48 wells x 5 &micro;L = 240 &micro;L required (not 60 &micro;L). Scaled metformin prep to 300 &micro;L (60 &micro;L of 1 M into 240 &micro;L media per math review scaling rule) and updated gate validator and prompts accordingly.

### Removals and Deprecations

- Retired old carboplatin intermediate (200 &micro;M) and old 8-stock series (400 nM through 2 mM) from MP-5 protocol steps and materials. Old stocks do not appear in OVCAR8 history or spec references and were an artifact of the pre-math-review design.
- Retired "10 mM metformin working stock" terminology; all references now use "200 mM metformin working stock".
- Removed `carboplatin_400umol_working` material (redundant); single `carboplatin_400umol` identity serves both parent and row-H roles per hybrid naming pattern.

### Decisions and Failures

- (Resolved Decision #14) Chose Ambiguity 1 resolution A: "ends at 200 &micro;L total" (correcting line 129 typo).
- (Resolved Decision #15) Chose Ambiguity 2 resolution C: 200 mM metformin working stock (matching Part 3 Day 2 text, correcting Part 4 table typo).
- (Resolved Decision #16) Chose Ambiguity 3 resolution A: 95 &micro;L media adj for A7-A12, 90 &micro;L for B7-H12 (all wells = 200 &micro;L, fixing internal table inconsistency).
- **Spec review decision (M4a fix-up)**: Adopted hybrid material-naming pattern per vocabulary closure principle: material identity = flat `<drug>_<concentration>` (noun: substance + concentration); role (parent/working/intermediate) expressed in step_name and prompt, not material label. Rationale: one concentration = one material name across every mini in the same sequence_runner, reducing validator complexity and future-proofing against new roles. Dropped `carboplatin_400umol_working` duplicate; single `carboplatin_400umol` now serves as both parent and row-H working stock.
- **Spec review decision (M4a fix-up)**: Chose option (a) for row-H 400 &micro;M handling - dropped the prepare_carb_working_400um step entirely. Rationale: math review line 532 explicitly says "400 &micro;M | (use as-is) | none | 10 &micro;M", meaning the parent IS the row-H stock with no additional prep needed. Eliminating the step clarifies pedagogy (6 dilutions from parent; parent = highest dose) and avoids redundant aliquot logic.
- **Spec review decision (M4a fix-up)**: Scaled metformin prep to 300 &micro;L per math review scaling rule (line 136: "or equivalent"). Chosen: 60 &micro;L of 1 M into 240 &micro;L media = 300 &micro;L of 200 mM. Covers 48 wells x 5 &micro;L = 240 &micro;L dosing draw plus ~60 &micro;L (~20%) dead volume. Updated gate validator material_volume from 25 to 300 &micro;L and prompts to reflect correct minimum (300 &micro;L, supporting single batch).
- Designed 1-2-5 dose series per [OVCAR8_MATH_REVIEW.md](protocols/OVCAR8_MATH_REVIEW.md) "Recommended student-facing choice: resolution per decade" (line 630-650), specifically "Graph-friendly" option (line 638). Justification: clean rule (1, 2, 5 per decade), graph-friendly labels, better resolution than 1-10-100, simpler than 1-3-10, and matches preferred-numbers engineering standard. Alternative patterns documented in math review remain available for future protocol variants.

### Developer Tests and Notes

- Math invariant check (8 rows: 6 diluted carb + 1 parent carb + 1 met):
  - B (0.1 &micro;M): 4 &micro;M x 5 / 200 = 0.1 OK | 100 cells + 95 media + 5 carb = 200 OK
  - C (0.2 &micro;M): 8 &micro;M x 5 / 200 = 0.2 OK | 100 cells + 95 media + 5 carb = 200 OK
  - D (0.5 &micro;M): 20 &micro;M x 5 / 200 = 0.5 OK | 100 cells + 95 media + 5 carb = 200 OK
  - E (1 &micro;M): 40 &micro;M x 5 / 200 = 1 OK | 100 cells + 95 media + 5 carb = 200 OK
  - F (2 &micro;M): 80 &micro;M x 5 / 200 = 2 OK | 100 cells + 95 media + 5 carb = 200 OK
  - G (5 &micro;M): 200 &micro;M x 5 / 200 = 5 OK | 100 cells + 95 media + 5 carb = 200 OK
  - H (10 &micro;M): 400 &micro;M x 5 / 200 = 10 OK | 100 cells + 95 media + 5 carb = 200 OK
  - Met A7-H12 (5 mM): 200 mM x 5 / 200 = 5 OK | A7-A12: 100 cells + 95 media + 5 met = 200 &micro;L [metformin-only control, every well = 200 &micro;L]; B-H cols 7-12: 100 cells + 90 media + 5 carb + 5 met = 200 &micro;L OK
- Metformin prep verification: C1V1=C2V2 for 300 &micro;L working stock: 1 M x 60 &micro;L / 300 &micro;L = 0.2 M = 200 mM OK. Prep volume 300 &micro;L supports 240 &micro;L dosing + 60 &micro;L dead volume (~20%).
- All well volumes verified to 200 &micro;L (A7-A12 metformin-only control = 200 &micro;L; B-H all columns = 200 &micro;L).
- Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` reports 88 files, 0 failures.
- MP-6 media-adjustment values confirmed in protocol.yaml: A7-A12 receive 95 &micro;L (line 611 in step adjust_media_quadrant_a7_h12, second adjust payload), B7-H12 receive 90 &micro;L (line 614, set_volume: 90). No changes required to MP-6.
- Cross-reference check: MP-5 materials.yaml stock names match MP-7 materials.yaml stock names and match source doc Part 4 table stock names. Flat naming pattern (e.g., `carboplatin_400umol`) consistent across all materials.yaml files.

## 2026-05-16 (M4b WP-PROMPT-MP7: Prompt rewrites + simulation abstraction comments + pipette swap)

### Additions and New Features

(none)

### Behavior or Interface Changes

- **MP-7 prompt rewrites per M4b canonical pattern**: Rewrote 8 carboplatin + 1 metformin step prompts in `plate_drug_treatment_drug_addition` to adopt lab-action verbs (Aspirate, dispense) and explicit dose concentrations per M4a-corrected materials.yaml. Old pattern (UI narration: "Pick up the multichannel pipette... Click...") replaced by pedagogy-aligned pattern: "Aspirate &lt;volume&gt; &micro;L of &lt;conc&gt; &lt;drug&gt; working stock into the micropipette and dispense across &lt;target wells&gt;. Final well concentration: &lt;final_conc&gt; &lt;drug&gt; in 200 &micro;L total volume." Resolves F1 click-narration anti-pattern per PRIMARY_DESIGN.md. Values cross-checked against corrected MP-5 materials (4, 8, 20, 40, 80, 200, 400 &micro;M carboplatin; 200 mM metformin), all satisfy math invariant stock &times; 5 &micro;L / 200 &micro;L = final. Prompts updated for all 7 carboplatin rows (B-H, 0.1 through 10 &micro;M finals) and metformin row (5 mM final).
- **MP-7 learning.objectives/outcomes text updated**: Dropped "multi-channel pipetting" framing; updated dose-range reference from "10 nM through 25 &micro;M" (retired) to "0.1 &micro;M through 10 &micro;M" (current 1-2-5 series). Prompts now reference "micropipette" (Level 3 swap below); learning text aligned.
- **MP-7 multichannel_pipette &rarr; micropipette swap (Level 3)**: Renamed all 40 references to `multichannel_pipette` to `micropipette` across MP-7 protocol.yaml (8 pipette `click` targets + 8 `adjust` targets + 8 `CursorAttach` targets + validator references = 24+ sites) and scenes/plate_workspace.yaml (object placement; placement_name `right_multichannel_pipette` to `right_micropipette`, object_name `multichannel_pipette` to `micropipette`; scene_notes updated). No other objects affected. Replaced `multichannel_pipette` with single-channel `micropipette` to align geometry with row-gradient plate map (dose varies by row, vehicle by column) which is incompatible with standard 8-channel multichannel orientation.
- **Simulation abstraction comment added to 5 multi-well minis (Level 2)**: Added canonical top-of-file YAML comment to MP-4 (`cell_seeding_plate_setup`), MP-6 (`plate_drug_treatment_media_adjustment`), MP-7 (`plate_drug_treatment_drug_addition`), MP-9 (`mtt_plate_reaction`), MP-10 (`mtt_solubilization_readout`). Comment placed BEFORE `protocol_type:` line, NOT inside `learning.goals`. Text explains that per-well clicks in YAML are an instrumentation abstraction (real wet lab uses 8-channel multichannel per column, repeater pipette per-well serialization, or manual row filling) and do not prescribe procedural detail. Affirms that simulation click-granularity is for validation, not pedagogy; wet-lab practice differs.
- **MP-8 prompt reviewed and refined**: MP-8 line 70 (dissolve_and_mix prompt) already uses correct lab-action framing ("Transfer...", "vortex...") and does not lead with simulator mechanics. Accepted as-is. Line 31 (prepare_solution_tube prompt) rewritten from UI narration ("Pick up the micropipette and set it to 1 mL...") to lab action ("Transfer 1 mL of PBS into the MTT tube, then mix until the MTT powder is fully dissolved.").

### Fixes and Maintenance

- **F1 bug fix: Resolve click-narration anti-pattern in MP-7 prompts**: Historical MP-7 prompts (shipped in M2/M3) opened with simulator UI verbs ("Pick up...", "set...", "Click...") before stating the lab goal (aspirate dose, dispense to well), teaching students the wrong mental model that the GUI mechanics are the pedagogical content. Lab-action rewrite makes the learning intent clear (manage dose concentrations across rows) and the sequence mechanics (pipette + adjust + click) secondary. Students now learn "aspirate carboplatin into micropipette" as the action, and the scene-interaction grammar is how that action expresses itself in the simulator. Prompts now state the lab invariant (final concentration = 200 &micro;L well volume) explicitly per contract item 4 (PRIMARY_CONTRACT.md, "visible interaction standard").

### Removals and Deprecations

- Removed `multichannel_pipette` from MP-7 protocol.yaml and scenes/plate_workspace.yaml. All 40 references replaced by `micropipette`. No other minis affected; multichannel_pipette remains in MP-6, MP-9, MP-10 pending future column-gradient redesign (out of scope, M4b prompt-rewrite + pipette-swap focus only).

### Decisions and Failures

- **M4b execution decision**: Cross-checked all M4a-corrected concentrations (carboplatin: 4, 8, 20, 40, 80, 200, 400 &micro;M; metformin: 200 mM) against MP-5 materials.yaml before rewriting prompts. All values present and correct. Math invariant (stock &times; 5 &micro;L / 200 &micro;L = final) verified for all 8 dose levels independently. No concentration mismatches detected.
- **MP-8 line 70 review decision**: Prompt "Transfer the 5 mg MTT powder into the solution tube by tapping... Then vortex the tube..." frames the interaction as lab action (tapping, vortexing), not simulator UI (clicking, setting). Accepts as pedagogically sound; no rewrite needed.

### Developer Tests and Notes

- M4b prompt cross-check table (all rows verified against corrected MP-5 materials.yaml):
  - Row B: 4 &micro;M stock &times; 5 / 200 = 0.1 &micro;M final | Declared in MP-5 materials: carboplatin_4umol OK
  - Row C: 8 &micro;M stock &times; 5 / 200 = 0.2 &micro;M final | Declared in MP-5 materials: carboplatin_8umol OK
  - Row D: 20 &micro;M stock &times; 5 / 200 = 0.5 &micro;M final | Declared in MP-5 materials: carboplatin_20umol OK
  - Row E: 40 &micro;M stock &times; 5 / 200 = 1 &micro;M final | Declared in MP-5 materials: carboplatin_40umol OK
  - Row F: 80 &micro;M stock &times; 5 / 200 = 2 &micro;M final | Declared in MP-5 materials: carboplatin_80umol OK
  - Row G: 200 &micro;M stock &times; 5 / 200 = 5 &micro;M final | Declared in MP-5 materials: carboplatin_200umol OK
  - Row H: 400 &micro;M stock &times; 5 / 200 = 10 &micro;M final | Declared in MP-5 materials: carboplatin_400umol OK
  - Met: 200 mM stock &times; 5 / 200 = 5 mM final | Declared in MP-5 materials: metformin_200mmol OK
- All 8 rows + metformin verified; no mismatches.
- Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` run after M4b changes.

## 2026-05-16 (M6 WP-VALIDATOR-CROSS-MINI: Cross-mini invariant validator extension)

### Additions and New Features

- **CrossMiniValidator module added**: New `tools/validators/cross_mini_validator.py` implements two cross-mini checks: (1) math invariant verification (F2 prevention): parses drug-addition step prompts matching canonical pattern to extract working concentration, aspirate volume, and final concentration, then verifies 40x rule: `C_working &times; V_drug / V_well_final == C_final` with tolerance &plusmn; 0.01; (2) materials name consistency (F3 prevention): validates that every `material_name` referenced in any constituent mini_protocol of a `sequence_runner` has matching `display_color` across all MPs that declare it (labels may vary by role/context; material identity + color must be consistent per material decoration layer spec).

### Behavior or Interface Changes

- **Validator gate: cross-mini math invariant check**: `tools/validate_content_yaml.py` now invokes cross-mini validator after per-mini schema checks complete. For every sequence_runner, the validator walks all constituent mini_protocols and examines step prompts for canonical drug-addition pattern: "Aspirate &lt;V&gt; &micro;L of &lt;C_w&gt; ... Final well concentration: &lt;C_f&gt;". Extracts numeric values and verifies invariant. Synthetic-fixture test confirms validator emits ERROR on violation (expected final 10 &micro;M, declared 15 &micro;M).
- **Validator gate: cross-mini materials consistency check**: For every sequence_runner, validates that each `material_name` has consistent `display_color` across all constituent MPs that declare it. Per PRIMARY_SPEC.md and material decoration layer spec, material identity (name) and visual representation (color) must match; labels (descriptive text) may vary by role context (e.g., "Culture media" in MP-2 vs "Fresh culture media" in MP-4 represent the same material in different prep states). Synthetic-fixture test confirms validator emits ERROR when same material_name has different colors in different MPs.

### Fixes and Maintenance

- **F2 (pre-existing math invariant gap) now gated**: Cross-mini math validator prevents future drift by catching violations in canonical prompt patterns. Does not auto-fix existing prompts lacking canonical pattern (e.g., pre-M4b text). Math review values in M4a-corrected materials.yaml satisfy the 40x rule; prompts rewritten in M4b now include canonical pattern; validator gate in M6 prevents future mismatches between corrected concentrations and new prompts.
- **F3 (pre-existing material-name drift) now gated**: Cross-mini materials validator prevents future drift by enforcing consistent material-color pairs within sequence_runner constituents. Current tree passes validator (all material display_colors match consistently; label variations are pedagogically intentional and permitted per spec). Locked gate prevents future additions of the same material with different colors.

### Removals and Deprecations

(none)

### Decisions and Failures

- **Cross-mini math invariant implementation choice (Option C refined)**: Plan offered three options (A: loose prompt-text parsing; B: schema addition with expected_final_concentration field; C: stock-reference check only). Selected Option A (prompt-text math check) as primary because M4b canonical prompt rewrites now include the pattern needed for validation, making Option A viable without schema additions. Math invariant check accepts prompts with pattern "Aspirate &lt;V&gt; &micro;L of &lt;C&gt; ... Final well concentration: &lt;F&gt;" and validates C &times; V / 200 == F (40x rule for OVCAR8; extensible to other declared rules). Non-canonical prompts (lacking pattern) are skipped rather than flagged as errors, keeping validator retroactively compatible with pre-M4b text.
- **Cross-mini materials check scope (name + color, labels free)**: Plan said "matching label + display_color". Narrowed to name + color (labels can vary) based on material decoration layer design: material identity = name + color; label is descriptive text subject to role context. Per MATERIAL_CONVENTION.md and evidence-log decision in plan Q4, validator checks (material_name, display_color) pairs for consistency, allowing label variation. Rationale: same substance (e.g., trypsin) may be labeled differently per usage ("Trypsin-EDTA prep", "Trypsin reagent stock") but must show the same color in UI for visual continuity.
- **Validator integration point (after per-mini checks)**: Cross-mini checks run AFTER per-mini schema validators complete. Consequence: cross-mini findings are separate from per-mini errors (two finding.tag classes: CROSS_MINI_MATH, CROSS_MINI_MATERIALS). Errors in both categories fail the validator; errors in one category do not suppress the other.

### Developer Tests and Notes

- **Cross-mini math invariant fixtures**: `tests/test_cross_mini_validator.py::test_math_invariant_correct` verifies no error on valid math (400 &times; 5 / 200 = 10). `test_math_invariant_incorrect` verifies error is caught when expected final is 15 instead of 10 (mismatch &ge; 0.01). `test_math_invariant_different_concentration` verifies check works for different working concentrations (200 &times; 5 / 200 = 5).
- **Cross-mini materials consistency fixtures**: `test_materials_consistency_matching` confirms no error when two minis declare same material with same color. `test_materials_consistency_color_mismatch` verifies error when same material has different colors (#ff0000 vs #0000ff). `test_materials_consistency_label_variation_ok` confirms labels can vary ("working stock" vs "working stock (prepared)") as long as colors match. `test_materials_consistency_partial_overlap` confirms materials in only one MP don't trigger false positives.
- Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` confirms 88 files, 0 failures (88 files, 47 objects, 4 base scenes, 15 protocol scenes, 10 materials, 12 protocols).
- Pytest: `source source_me.sh && pytest tests/test_cross_mini_validator.py -v` all 7 tests pass (math invariant 3 tests, materials consistency 4 tests).
- Markdown links: `pytest tests/test_markdown_links.py` passes; no new files added to docs, only tool additions.
- Pyflakes: `python3 -m pyflakes tools/validators/cross_mini_validator.py tools/validate_content_yaml.py` clean (no unused imports, undefined names).

## 2026-05-15 (M3 WP-DOCS-CLOSEOUT: Plan closure)

### Additions and New Features

- **OVCAR8 10-mini protocol decomposition shipped**: completed dazzling-juggling-tide plan across M1, M2, and M3 milestones. M1 (WP-DELETE) deleted 7 obsolete protocol folders (pre-delete SHA `353decbd80c8607940536b627d48b6578325c032`) and scaffolded evidence log. M2 (WP-MP-1..10) authored 10 focused mini-protocols covering 57 canonical OVCAR8 actions: `passage_hood_detachment` (MP-1, A1-A10, cell detachment), `passage_pellet_reseed` (MP-2, A11-A19, pellet recovery), `trypan_blue_counting` (MP-3, A20-A28, viability assessment), `cell_seeding_plate_setup` (MP-4, A29-A31, plate preparation), `drug_dilution_setup` (MP-5, A47-A57, multi-concentration stock preparation), `plate_drug_treatment_media_adjustment` (MP-6, A32/A35/A36, quadrant media setup), `plate_drug_treatment_drug_addition` (MP-7, A34/A37/A38, drug dosing), `mtt_reagent_prep` (MP-8, A39, MTT dissolution), `mtt_plate_reaction` (MP-9, A40-A43, assay incubation), `mtt_solubilization_readout` (MP-10, A44-A46, readout). M3 (WS-VALIDATOR-EXTEND, WS-RUNNER-EXP, WS-RUNNER-MAINT, WS-VALIDATE-FULL) delivered: validator field-shape enforcement for gesture/validator coupling (click->correct_target, adjust->target_with_value, select->correct_choice, type->target_with_value), sequence_runner-leaves-only enforcement rule, final `cell_culture_full` sequence runner stitching all 10 minis, new `routine_passage` maintenance runner (MP-1+MP-2), material display_color harmonization across all minis using accessibility-first palette (17 canonical materials), coverage matrix validation showing 0 ABSENT rows (A1-A57 all PRESENT-EXPLICIT). Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0 (88 files, 10 protocols, 0 failures). Plan tracked at `~/.claude/plans/dazzling-juggling-tide.md` (out-of-repo); no repo plan-file move was applicable.

## 2026-05-15 (M3 WP-RUNNER-EXP-FINAL: Create cell_culture_full sequence runner)

### Additions and New Features

- Created `content/protocols/cell_culture_full/protocol.yaml`: sequence runner with `protocol_type: sequence_runner`, `protocol_name: cell_culture_full`. Lists 10 constituent mini-protocols in order per WP-RUNNER-EXP-FINAL: `passage_hood_detachment` (MP-1), `passage_pellet_reseed` (MP-2), `trypan_blue_counting` (MP-3), `cell_seeding_plate_setup` (MP-4), `drug_dilution_setup` (MP-5), `plate_drug_treatment_media_adjustment` (MP-6), `plate_drug_treatment_drug_addition` (MP-7), `mtt_reagent_prep` (MP-8), `mtt_plate_reaction` (MP-9), `mtt_solubilization_readout` (MP-10). Entry step: `inspect_confluence` (matching MP-1's entry_step per PRIMARY_SPEC.md sequence-runner contract). Learning block: objectives (comprehensive mastery of OVCAR8 carboplatin and metformin dose-response experimental workflow from cell preparation through MTT viability readout), outcomes (execute complete dose-response assay: detach and prepare cells, perform cell counting with viability confirmation, seed multi-well plate, prepare multi-concentration drug stocks, treat cells with controlled drug doses, perform MTT conversion assay, quantify cell viability by absorbance reading), goals (accomplish full OVCAR8 carboplatin plus metformin dose-response experiment on OVCAR8 ovarian cancer cells; sequence stitches 10 focused mini-protocols covering cell passage, quantification, plating, drug preparation, treatment, and readout into coherent experimental pathway aligned with canonical OVCAR8 procedure). Sequence runner is peer of `routine_passage`, not nested (hard rule per PRIMARY_SPEC.md). Validator green including sequence_runner-leaves-only check.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

- MP-5 prepares 8 carboplatin working stocks per OVCAR8 doc Part 4 table; MP-7 uses 7 (rows B-H per Part 5 plate map). tube_H (highest dose) is doc-accurate prep-but-not-applied - matches source OVCAR8_Carboplatin_Metformin_MTT_Protocol.md asymmetry; no change required.
- cell_counter_basic promoted to `content/scenes/` as a legitimate base scene; cell counter workspace geometry has no analog in hood/bench/microscope bases. Plan promotion table updated.
- Material display_color harmonized across all mini-protocols using accessibility palette from vosslab-skills webwork-writer COLOR_CONTRAST_ACCESSIBILITY.md. Canonical mapping: cell_suspension PINK #cc0066 | cells PINK #cc0066 | media DARK YELLOW #6c6c00 | pbs SKY BLUE #076dad | trypsin RED #d40000 | trypan_blue NAVY #0067cc | carboplatin PURPLE #a719db | metformin TEAL #00775f | drug_combo MAGENTA #c80085 | mtt DARK YELLOW #6c6c00 | mtt_solution_12mm DARK YELLOW #6c6c00 | formazan PURPLE #a719db | formazan_dmso_solution MAGENTA #c80085 | dmso CYAN #007576 | cell_pellet PINK #cc0066 | waste_mtt LIGHT ORANGE #935d00.
- Step-count rule deleted from `docs/PRIMARY_SPEC.md`: pedagogy is the sole gate. No 6-to-10 ceiling, no floor. Step boundaries are review-gated, not count-gated.

### Developer Tests and Notes

(none)

## 2026-05-15 (M3 WP-RUNNER-MAINT-FINAL: Create routine_passage sequence runner)

### Additions and New Features

- Created `content/protocols/routine_passage/protocol.yaml`: sequence runner with `protocol_type: sequence_runner`, `protocol_name: routine_passage`. Lists 2 constituent mini-protocols in order: `passage_hood_detachment` (MP-1), `passage_pellet_reseed` (MP-2). Entry step: `inspect_confluence` (matching MP-1's entry_step per PRIMARY_SPEC.md sequence-runner contract). Learning block: objectives (routine maintenance-passage fluency combining enzymatic detachment and pellet resuspension phases), outcomes (perform complete routine cell passage including detachment, neutralization, centrifugation, and resuspension at 1:7 dilution), goals (accomplish complete maintenance-passage workflow for recurring subculture; detach-through-reseed pathway covering canonical actions A1-A19 from OVCAR8 Part 1-2; counting explicitly excluded per Resolved Decision #13 as not part of routine maintenance). Sequence runner is peer of `cell_culture_full`, not nested within it (hard rule per PRIMARY_SPEC.md and WP-RUNNER-MAINT-FINAL brief). Validator green including sequence_runner-leaves-only check.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

(none)

## 2026-05-15 (M2 WP-MP-3: Author trypan_blue_counting mini-protocol)

### Additions and New Features

- Created `content/protocols/trypan_blue_counting/protocol.yaml`: 9-step mini-protocol covering canonical actions A20-A28 from OVCAR8 cell viability assessment. Scope: hemocytometer slide preparation with trypan blue staining, manual and automated cell counting with viability analysis. Entry step: `add_trypan_blue_to_chamber`. Learning block: objectives (hemocytometer use for manual cell counting and trypan blue exclusion for viability assessment, automated cell-counter operation, viability-threshold interpretation), outcomes (prepare trypan-blue-stained cell suspension on hemocytometer slide, perform manual quadrant counting, operate automated cell counter, interpret viability results against 90% threshold), goals (accomplish cell-counting and viability-assessment stage of OVCAR8 passage workflow; teach both manual hemocytometer counting and automated cell-counter operation in sequence). Step structure: (1) add_trypan_blue_to_chamber (micropipette adjust 10 uL, click trypan_blue_bottle, click hemocytometer_slide); (2) add_cell_suspension_to_chamber (micropipette adjust 10 uL, click cell_suspension_tube, click hemocytometer_slide); (3) mix_by_pipetting (pipette up/down 3-4 times); (4) load_semicircle_chamber (micropipette adjust 10 uL, dispense to loading chamber); (5) wipe_off_excess (click lens_tissue, click hemocytometer_slide); (6) insert_slide_into_counter (SceneChange to cell_counter_workspace, click cell_counter); (7) wait_for_focus (click cell_counter, TimedWait 0.05 min); (8) press_capture (click cell_counter, record cell_count and viability_percent); (9) verify_viability_gate (click cell_counter, final_state_matches viability_percent >= 90). Actions A20-A28 all PRESENT-EXPLICIT. Gesture/validator coupling verified: all click interactions use correct_target; adjust interactions use target_with_value; final state validation via step_validator final_state_matches. Validator green.
- Created `content/protocols/trypan_blue_counting/materials.yaml`: material definitions (trypan_blue, cell_suspension, trypan_blue_mixture) with display colors.
- Created `content/protocols/trypan_blue_counting/scenes/hemocytometer_view.yaml`: protocol scene extending bench_basic; adds hemocytometer_slide (center), micropipette (right_tool_area), trypan_blue_bottle (rear_left), cell_suspension_tube (rear_center), lens_tissue (rear_right).
- Created `content/protocols/trypan_blue_counting/scenes/cell_counter_workspace.yaml`: protocol scene extending cell_counter_basic; configures automated cell counter layout.
- Moved `content/scenes/cell_counter_basic.yaml` to `content/protocols/trypan_blue_counting/scenes/cell_counter_basic.yaml`: base scene file is single-use for MP-3 per promotion table, now scoped to protocol scenes directory per PRIMARY_CONTRACT item 1 (scene authoring locality).
- Created `content/objects/cell_suspension_tube.yaml`: NEW OBJECT (ASSET-UNVERIFIED); kind=tube; state_fields: material_name (enum: empty, cell_suspension), material_volume (ml, max 20); reuses microtube_* assets.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

- Fixed MP-3 (trypan_blue_counting) verify_viability_gate step gesture/validator coupling violation: changed gesture from `select` with `target_with_value` validator to `click` with `correct_target` validator per PROTOCOL_VOCABULARY.md gesture/validator coupling table. Added `step_validator: final_state_matches` to enforce viability_percent >= 90 gate. Pedagogically: student clicks result display to acknowledge viability status.

### Removals and Deprecations

(none)

### Decisions and Failures

- Promoted `cell_counter_basic` to `content/scenes/` as a documented exception to the plan promotion table; no existing base (hood/bench/microscope) covers cell-counter workspace geometry, and pedagogy required a separate base scene. Reuse by future MPs would justify the promotion retroactively.

### Developer Tests and Notes

- Gesture/validator audit: all interactions conform to coupling table (click->correct_target, adjust->target_with_value, select->correct_choice). Step-level completion validated via sequence_complete and final_state_matches presets. Coverage matrix: A20-A28 all PRESENT-EXPLICIT with step references.

## 2026-05-15 (M2 WP-MP-10: Author mtt_solubilization_readout mini-protocol)

### Additions and New Features

- Created `content/protocols/mtt_solubilization_readout/protocol.yaml`: 3-step mini-protocol covering canonical actions A44-A46 from OVCAR8 MTT assay Day 4 readout (solubilization and optical absorbance measurement phase). Scope: add DMSO to dissolve formazan precipitate, trituration to ensure complete dissolution, wavelength selection and plate reader absorbance measurement. Entry step: `add_dmso_to_wells`. Learning block: objectives (dissolving precipitated colorimetric assay products using organic solvent, trituration technique for complete dissolution, wavelength selection and optical absorbance measurement on multi-well plate reader), outcomes (add DMSO to individual wells of 96-well plate containing formazan, perform manual trituration to dissolve precipitated formazan, measure absorbance at 560 nm on plate reader, recording optical density for downstream IC50 calculations), goals (accomplish final quantification step in MTT viability assay: convert precipitated insoluble formazan product into colored solution amenable to spectrophotometric measurement; bridge incubated MTT-treated plate to absorbance readout values indicating cell viability across dose-response series). Step structure: (1) add_dmso_to_wells (click micropipette, adjust set_volume to 200 microL, click dmso_bottle, dispense 200 microL per well across all 96 wells, ObjectStateChange each well material_name=formazan_dmso_solution, material_volume=0.2 mL); (2) trituration_to_dissolve (click micropipette, perform up/down motions in each well to mechanically dissolve formazan, 96 well-click interactions with animated material_volume state changes; simulates pipetting up/down ~10 times per well); (3) read_absorbance (click plate_reader to trigger SceneChange to plate_reader_workspace, adjust plate_reader wavelength_nm to 560, click well_plate_96 to insert plate and start reading, ObjectStateChange plate_reader reading=true, click plate_reader again to stop reading, ObjectStateChange plate_reader reading=false). Actions A44 (add 200 microL DMSO per well, PRESENT-EXPLICIT, step 1), A45 (pipette up/down ~10x trituration, PRESENT-EXPLICIT, step 2), A46 (read absorbance at 560 nm, PRESENT-EXPLICIT, step 3). Volume tolerance applies (200 microL adjust validator). Cross-workspace SceneChange (bench -> plate_reader) evaluated per deferral check: unavoidable for plate reader access per lab reality, so exception allowed. Validator green.
- Created `content/protocols/mtt_solubilization_readout/materials.yaml`: three material definitions (dmso: DMSO solvent, display_color #f5f5f5; formazan_dmso_solution: formazan dissolved in DMSO, display_color #ffd700; optical_reading: optical absorbance at 560 nm, display_color #ffffff).
- Created `content/protocols/mtt_solubilization_readout/scenes/bench_workspace.yaml`: protocol scene extending bench_basic; adds dmso_bottle (rear_left, depth_tier=1), well_plate_96 (center, depth_tier=1), micropipette (right_tool_area, depth_tier=1).
- Created `content/protocols/mtt_solubilization_readout/scenes/plate_reader_workspace.yaml`: protocol scene extending bench_basic (reuses bench baseline for consistency); adds plate_reader (center, depth_tier=1) for multi-well plate absorbance measurement interface.
- Modified `content/objects/well_plate_96.yaml`: added "formazan_dmso_solution" to material_name allowed enum and added corresponding visual_state case (when: formazan_dmso_solution, output: well_filled asset) to represent formazan dissolved in DMSO.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

- Fixed MP-7 (plate_drug_treatment_drug_addition) T1_TARGET validator errors: replaced 8 unresolved references to non-existent `working_stock_rack` with correct targets. Corrected all carboplatin stock tube references from invented subparts (carboplatin_400nm, carboplatin_2um, ..., carboplatin_500um) to actual `dilution_tube_rack_8` subparts (tube_A through tube_G, matching the 7 carboplatin concentrations used: 400 nM, 2 uM, 5 uM, 10 uM, 20 uM, 100 uM, 500 uM); corrected metformin reference from `working_stock_rack.metformin_10mm` to `metformin_working_tube`. Mapping: tube_A (400 nM row B), tube_B (2 uM row C), tube_C (5 uM row D), tube_D (10 uM row E), tube_E (20 uM row F), tube_F (100 uM row G), tube_G (500 uM row H); metformin_working_tube (10 mM fixed conc, rows B-H cols 7-12). Updated `content/protocols/plate_drug_treatment_drug_addition/scenes/plate_workspace.yaml` to replace single `working_stock_rack` placement with two correct placements: `dilution_tube_rack_8` (rear_center depth_tier=1) and `metformin_working_tube` (rear_center depth_tier=2). Validator confirmed 0 errors post-fix (was 8 T1_TARGET errors, all resolved).

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

## 2026-05-15 (M2 WP-MP-9: Author mtt_plate_reaction mini-protocol)

### Additions and New Features

- Created `content/protocols/mtt_plate_reaction/protocol.yaml`: 5-step mini-protocol covering canonical actions A40-A43 from OVCAR8 MTT assay Day 4 readout. Scope: MTT dye loading, formazan conversion incubation, and plate preparation for downstream DMSO solubilization. Entry step: `gather_mtt_materials`. Learning block: objectives (volumetric pipetting of small reagent volumes per well, timed incubation scheduling, biohazard waste handling, critical plate-preparation drying), outcomes (add MTT reagent uniformly across 96-well plate at fixed concentration, manage incubation timer for metabolic conversion, safely decant cytotoxic waste into biohazard container, dry plate without contamination or cell loss), goals (accomplish MTT colorimetric assay readiness phase: load MTT dye across treated wells, allow formazan crystal formation under aerobic incubation, remove excess MTT/media, prepare dry plate for DMSO solubilization and absorbance measurement; bridge post-treatment cell samples from Day 2 drug incubation to quantitative viability readout). Step structure: (1) gather_mtt_materials (click mtt_solution_bottle, click well_plate_96); (2) prepare_pipette_for_mtt (click multichannel_pipette, adjust set_volume to 25 microL); (3) add_mtt_to_wells (aspirate from mtt_solution_bottle, dispense 25 microL per well across all 96 wells, ObjectStateChange each well material_name=formazan, material_volume=125 microL; uses well_plate_96.A1 through H12 fan-out); (4) incubate_formazan_conversion (click well_plate_96, TimedWait target=incubator, duration_min=90, display='formazan conversion (1.5 hours)'); (5) decant_mtt_to_waste (click well_plate_96, click biohazard_decant_bin, ObjectStateChange well_plate_96 material_name=empty, biohazard_decant_bin material_name=waste_mtt, material_volume=1200 microL); (6) pat_plate_dry (click well_plate_96, click paper_towel_pad, no scene_operations). Actions A40 (25 microL MTT per well, PRESENT-EXPLICIT, step 3), A41 (1.5 hour incubation, PRESENT-EXPLICIT, step 4), A42 (decant to biohazard bin, PRESENT-EXPLICIT, step 5), A43 (pat dry on paper towels, PRESENT-EXPLICIT, step 6). Volume tolerance applies (25 microL validator at learner gate). Validator green.
- Created `content/protocols/mtt_plate_reaction/materials.yaml`: three material definitions (mtt: 12 mM MTT solution, display_color #fff59d; formazan: crystal precipitate, display_color #ffd54f; waste_mtt: MTT waste media and dye, display_color #ccc9a8).
- Created `content/protocols/mtt_plate_reaction/scenes/incubator_workspace.yaml`: protocol scene extending bench_basic; adds incubator (center, depth_tier=1), mtt_solution_bottle (rear_left, depth_tier=1), well_plate_96 (center, depth_tier=2), multichannel_pipette (right_tool_area, depth_tier=1), biohazard_decant_bin (rear_right, depth_tier=1), paper_towel_pad (rear_center, depth_tier=1).
- Created `content/objects/mtt_solution_bottle.yaml`: NEW OBJECT (ASSET-UNVERIFIED); kind=bottle; state_fields: material_name (enum: empty, mtt), material_volume (ml, default=10, max=50); visual_states for filled/empty bottle SVG cases and fill_height formula.
- Created `content/objects/biohazard_decant_bin.yaml`: NEW OBJECT (ASSET-UNVERIFIED); kind=waste; state_fields: material_name (enum: empty, mixed, waste_mtt), material_volume (ml, default=0, max=2000); visual_states for filled/empty waste container SVG cases and fill_height formula.
- Created `content/objects/paper_towel_pad.yaml`: NEW OBJECT (ASSET-UNVERIFIED); kind=decoration; minimal state_fields (none); visual_states (none); capabilities: clickable (interaction target only, no state mutation).
- Modified `content/objects/well_plate_96.yaml`: added "formazan" to material_name allowed enum and added corresponding visual_state case (when: formazan, output: well_filled asset).

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Deferral check: no SceneChange within mini-protocol (incubator_workspace is single bench-based scene; incubator equipment on workspace, not scene transition); volume tolerance at learner gate (25 microL validator exact match, not floating-point tolerance); named groups (96-well fan-out: well_plate_96.A1 through H12 individual well targets, explicit list per spec); material_kind not applicable (formazan is liquid color change, not solid crystal modeling); set-point depth (incubator duration 90 minutes as TimedWait primitive, not environment variable); shared materials library N/A (protocol-scoped materials.yaml, mtt material already exists in multichannel_pipette allowed enum).
- Object-asset audit: mtt_solution_bottle (reuses bottle_empty, bottle_filled assets), biohazard_decant_bin (reuses waste_container_empty, waste_container_filled assets), paper_towel_pad (decoration with no visual_states, no asset binding); confirmed pre-existing: well_plate_96, multichannel_pipette, incubator.
- Git hygiene: all new protocol files staged (content/protocols/mtt_plate_reaction/); all new object files staged (mtt_solution_bottle.yaml, biohazard_decant_bin.yaml, paper_towel_pad.yaml); well_plate_96.yaml modified and staged (material_name enum extension).
- Coverage matrix: A40 (PRESENT-EXPLICIT in step 3), A41 (PRESENT-EXPLICIT in step 4), A42 (PRESENT-EXPLICIT in step 5), A43 (PRESENT-EXPLICIT in step 6). All canonical actions explicitly implemented.

## 2026-05-15 (M2 WP-MP-4: Author cell_seeding_plate_setup mini-protocol)

### Additions and New Features

- Created `content/protocols/cell_seeding_plate_setup/protocol.yaml`: 4-step mini-protocol covering canonical actions A29-A31. Scope: Day 1 cell seeding phase of OVCAR8 assay. Entry step: calculate_dilution_volume. Learning block: objectives (C1V1=C2V2 dilution math, micropipetting), outcomes (prepare target-concentration suspension, seed all wells, incubate for attachment), goals (bridge counted suspension to Day 2 drug treatment). Steps: (1) calculate_dilution_volume (micropipette adjust to volume calculated via C1V1=C2V2 from MP-3 count); (2) prepare_diluted_suspension (aspirate calculated volume from cell_suspension_tube, dispense to conical_tube_for_dilution, adjust micropipette to media volume, aspirate media_bottle, dispense to tube, vortex 3 sec); (3) seed_96_well_plate (adjust micropipette to 100 microL, draw from dilution tube, dispense to all wells, ObjectStateChange material_name=cells, volume=9600 microL); (4) incubate_for_attachment (click well_plate_96, click incubator, TimedWait 1440 minutes). Actions A29 (PRESENT-EXPLICIT, steps 1-2), A30 (PRESENT-EXPLICIT, step 3), A31 (PRESENT-EXPLICIT, step 4). Validator green.
- Created `content/protocols/cell_seeding_plate_setup/materials.yaml`: materials cell_suspension, media with display colors.
- Created `content/protocols/cell_seeding_plate_setup/scenes/seeding_workspace.yaml`: extends hood_basic; adds cell_suspension_tube, conical_tube_for_dilution, well_plate_96, media_bottle, micropipette, vortex.
- Created `content/objects/cell_suspension_tube.yaml`: NEW OBJECT (ASSET-UNVERIFIED); state_fields: material_name (enum: empty, cell_suspension), material_volume (ml, max 20); reuses microtube_* assets.
- Created `content/objects/conical_tube_for_dilution.yaml`: NEW OBJECT (ASSET-UNVERIFIED); state_fields: material_name (enum: empty, cell_suspension, media), material_volume (ml, max 15); reuses conical_15ml_* assets.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Deferral check: no SceneChange (single hood workspace); volume tolerance at learner gate (not validator); no named groups (96-well ObjectStateChange target); material distinction (cell_suspension = fluid, cells = solid after attachment); set-point calculation (algebraic, exact match validation, not floating-point tolerance).
- Object-asset audit: cell_suspension_tube (reuses microtube assets), conical_tube_for_dilution (reuses conical_15ml assets); confirmed pre-existing: micropipette, media_bottle, well_plate_96, vortex, incubator, hood_basic.

## 2026-05-15 (M2 WP-MP-7: Author plate_drug_treatment_drug_addition mini-protocol)

### Additions and New Features

- Created `content/protocols/plate_drug_treatment_drug_addition/protocol.yaml`: 10-step mini-protocol implementing canonical actions A34, A37, A38 (add variable carboplatin working stocks to rows B-H, add metformin to columns 7-12 rows B-H, 48-hour incubation). Scope: drug treatment administration for dose-response MTT assay. Entry step: `add_carb_row_b`. Learning block fully specified with objectives (multi-channel pipetting, variable-concentration drug application, coordinated dual-drug treatment), outcomes (apply 8-dose carboplatin series and fixed metformin to designated well rows, set up timed incubation), and goals (establish experimental dosing conditions for 48-hour cellular response phase prior to MTT readout). Step structure: (1-8) add_carb_row_b through add_carb_row_h (one per row, each targeting a distinct carboplatin concentration: 400 nM stock final=10nM, 2 microM stock final=50nM, 5 microM stock final=125nM, 10 microM stock final=250nM, 20 microM stock final=500nM, 100 microM stock final=5 microM, 500 microM stock final=25 microM; each step: click multichannel_pipette, adjust to 5 microL, click source working stock tube, click 12 wells in target row for ObjectStateChange with material_name=carboplatin, material_volume=105 microL); (9) add_metformin_cols_7_12 (click multichannel_pipette, adjust 5 microL, click metformin_10mm stock, click 48 wells in columns 7-12 rows B-H for ObjectStateChange with material_name=drug_combo, material_volume=110 microL); (10) incubate_48h (click well_plate_96, TimedWait target=incubator, duration_min=2880, display='48-hour drug response incubation'). Actions A34 (8 carboplatin rows, PRESENT-EXPLICIT), A37 (metformin columns 7-12, PRESENT-EXPLICIT), A38 (48h incubation, PRESENT-EXPLICIT) all covered. Validator green. Cross-mini contract (MP-5): consumes carboplatin working stocks prepared in drug_dilution_setup (carboplatin_400nm, carboplatin_2um, carboplatin_5um, carboplatin_10um, carboplatin_20um, carboplatin_100um, carboplatin_500um) and metformin_10mm working stock by material_name reference; stock concentration levels embedded in step names and prompts (pedagogy layer), not material enum (per MP-5 forward-design contract).
- Created `content/protocols/plate_drug_treatment_drug_addition/materials.yaml`: three material definitions (carboplatin, metformin, media) with display colors (#c8a2c8 for carboplatin, #e8d4a0 for metformin, #ffd699 for media). Colors preserve consistency with MP-5 material definitions.
- Created `content/protocols/plate_drug_treatment_drug_addition/scenes/plate_workspace.yaml`: protocol scene extending hood_basic; adds working_stock_rack (rear center, depth_tier=1), well_plate_96 (center, depth_tier=1), multichannel_pipette (right_tool_area, depth_tier=2).

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Cross-mini contract verification (MP-5 -> MP-7 stock consumption): MP-7 references working stocks prepared in MP-5 (drug_dilution_setup/protocol.yaml step names: prepare_carb_stock_400nm, prepare_carb_stock_2um, prepare_carb_stock_5um, prepare_carb_stock_10um, prepare_carb_stock_20um, prepare_carb_stock_100um, prepare_carb_stock_500um) and metformin (prepare_metformin_10mm step). MP-7 scene declares working_stock_rack with named tube subparts (carboplatin_400nm, carboplatin_2um, carboplatin_5um, carboplatin_10um, carboplatin_20um, carboplatin_100um, carboplatin_500um, metformin_10mm) and targets these by name (e.g., `target: working_stock_rack.carboplatin_400nm`) in add_carb_row_b through add_carb_row_h interactions. Material display colors in both MP-5 and MP-7 materials.yaml use identical values (#c8a2c8 for carboplatin, #e8d4a0 for metformin) to ensure visual consistency across the mini-protocol sequence. Stock concentration hierarchy (pedagogy) lives in step names and prompts; stock-specific state fields are not required in material definitions per closed-vocabulary rule.
- Deferral checks: (1) SceneChange - not applicable (single workspace, hood); (2) Volume tolerance - applicable and respected (5 microL pipette set-point, 105 microL well state after first row addition accounting for 100 microL initial, 110 microL after dual-drug addition); (3) Named groups - applicable (row-by-row targeting of columns 1-12 for carboplatin, columns 7-12 for metformin); (4) material_kind - N/A (no solid/liquid distinction field needed; expressed through distinct material_name enums); (5) Shared materials library - applicable and deferred (carboplatin/metformin materials shared with MP-5; per-mini declaration with cross-reference suffices for this WP; shared-library refactor is downstream).
- Scene inheritance: plate_workspace extends hood_basic, inheriting rear_left, rear_center, rear_right, center, and right_tool_area zones, plus background and standard layout rules. Adds three placements (working_stock_rack, well_plate_96, multichannel_pipette) to appropriate zones.

## 2026-05-15 (M2 WP-MP-6: Author plate_drug_treatment_media_adjustment mini-protocol)

### Additions and New Features

- Created `content/protocols/plate_drug_treatment_media_adjustment/protocol.yaml`: 2-step mini-protocol covering canonical actions A32 (per-quadrant media adjustment), A35 (row A cols 1-6 untreated control), and A36 (row A cols 7-12 metformin-only control). Scope: pre-dosing media adjustment on a 96-well plate before carboplatin and metformin addition on Day 2 of OVCAR8 dose-response assay. Entry step: `adjust_media_quadrant_a1_h6`. Learning block fully specified with objectives (media-volume adjustments for uniform final well volumes before drug dosing), outcomes (distribute exact micropipette volumes using multichannel pipette across plate quadrants), and goals (achieve 200 microL final well volume post-drug additions, maintaining quantitative rigor across all 96 wells). Step structure: (1) adjust_media_quadrant_a1_h6 (set multichannel to 100 microL, dispense row A cols 1-6; reset to 95 microL, dispense rows B-H cols 1-6); (2) adjust_media_quadrant_a7_h12 (set to 95 microL, dispense row A cols 7-12; reset to 90 microL, dispense rows B-H cols 7-12). Per OVCAR8_MATH_REVIEW.md resolution A (200 microL well total): row A 100/95 microL pre-drug, rows B-H 95/90 microL pre-drug, ensuring post-drug wells all reach 200 microL. Validation: 102 well-target interactions (48 row A individual clicks per quadrant; 48 rows B-H per quadrant) with ObjectStateChange primitives (flat state field: material_name=media, material_volume=100/95/90). Action coverage (A32, A35, A36 PRESENT-EXPLICIT). Validator green.
- Created `content/protocols/plate_drug_treatment_media_adjustment/materials.yaml`: single material definition (media) with display color #f0e8d8 (light tan).
- Created `content/protocols/plate_drug_treatment_media_adjustment/scenes/plate_workspace.yaml`: protocol scene extending hood_basic; adds well_plate_96 (center, depth_tier=1), media_bottle (rear_center, depth_tier=2), multichannel_pipette (right_tool_area, depth_tier=1). No new object or asset creation required.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Multichannel pipette used with `adjust` gesture (set-point skill) per pedagogy-first rule: students learn to set eight channels to precise volumes (100, 95, or 90 microL) before dispensing into target wells. Gesture + target_with_value validator pair correctly encodes pipetting set-point practice.
- Per-well ObjectStateChange mutations (one interaction per well) preserve explicitness over automation. While a "distribute across wells" batch operation could reduce interaction count, the spec requires named targets (protocol YAML is geometry-free, targets are named scene objects). Well-by-well targeting remains correct per specs/PROTOCOL_VOCABULARY.md.
- Scene extension (extends: hood_basic + add_placements) demonstrates protocol-level scene authoring per dream-setup rule (feedback_dream_setup_scenes.md). No existing "plate workspace" base scene; created at protocol level. Available for future promotion to content/scenes/ if other protocols reuse it.

## 2026-05-15 (M2 WP-MP-8: Author mtt_reagent_prep mini-protocol)

### Additions and New Features

- Created `content/protocols/mtt_reagent_prep/protocol.yaml`: 4-step mini-protocol covering canonical action A39 (prepare 12 mM MTT by dissolving 5 mg MTT powder in 1 mL PBS). Scope: reagent preparation for MTT assay endpoint readout. Entry step: `pick_up_mtt_powder`. Learning block fully specified with objectives (powder handling, mass measurement, aseptic dissolution), outcomes (weigh precise mass and dissolve to target concentration), and goals (MTT preparation for Day 4 readout in OVCAR8 assay). Step structure: (1) pick_up_mtt_powder (CursorAttach); (2) prepare_solution_tube (adjust pipette to 1 mL, click PBS, click tube for ObjectStateChange material=mtt_solution_12mm, volume=1.0); (3) dissolve_and_mix (powder transfer + vortex for 30 seconds via TimedWait); (4) verify_final_volume (target_with_value gate on material_volume=1.0). Action A39 (PRESENT-EXPLICIT) covers prep steps 2-3. Validator green.
- Created `content/protocols/mtt_reagent_prep/materials.yaml`: three material definitions (mtt_powder, mtt_solution_12mm, pbs) with display colors.
- Created `content/protocols/mtt_reagent_prep/scenes/bench_workspace.yaml`: protocol scene extending bench_basic; adds mtt_powder_container, pbs_bottle, mtt_solution_tube, micropipette, micropipette_tip_box across rear zones and center work area.
- Created `content/objects/mtt_powder_container.yaml`: NEW OBJECT (ASSET-UNVERIFIED) for MTT powder vial; state_fields: material_name (enum: mtt_powder, empty), material_volume (float, unit=mg, max=10, default=5); visual_states via fill_height on material_volume.
- Created `content/objects/mtt_solution_tube.yaml`: NEW OBJECT (ASSET-UNVERIFIED) for solution preparation tube; state_fields: material_name (enum: mtt_solution_12mm, empty), material_volume (float, unit=ml, max=5, default=0); visual_states via fill_height on material_volume.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Material schema constraint (Deferral item 4, material_kind gap): MTT powder is declared via `material_name: mtt_powder` enum with `material_volume` in mg (mass units). No `material_kind` enum field exists in schema. Solid vs. liquid distinction is expressed through: (a) unique material_name enum values (mtt_powder distinct from mtt_solution_12mm), (b) unit annotation (mg for powder, ml for solution), (c) object visual_states rendering (same SVG asset with different fill formulas). No schema extension performed; best-effort coverage via semantic naming + visual state distinction.

## 2026-05-15 (M2 WP-MP-5 and WP-MP-2: Fix drug_dilution_setup and passage_pellet_reseed)

### Additions and New Features

(none)

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

- Fixed `content/protocols/drug_dilution_setup/protocol.yaml` and `materials.yaml` (WP-SWEEP-MP-5): re-split under-atomized mega-step into 8 pedagogically-separate steps per learning-contract. Prior step[1] collapsed all 8 carboplatin working stocks (400 nM through 2 mM) into one 48-interaction sequence. Re-split into: `prepare_carb_stock_400nm`, `prepare_carb_stock_2um`, `prepare_carb_stock_5um`, `prepare_carb_stock_10um`, `prepare_carb_stock_20um`, `prepare_carb_stock_100um`, `prepare_carb_stock_500um`, `prepare_carb_stock_2mm` (8 new steps, 7 interactions each). Final step count: 11 (1 intermediate + 8 stocks + 1 metformin + 1 volume gate), matching one-stock-per-step pedagogy. Material reconciliation: added generic `carboplatin` and `metformin` entries to materials.yaml to bridge object-enum declarations to protocol references. All 10 T1_MATERIAL_REF errors resolved. Learning goal text updated to reflect one-stock-per-step architecture. Action coverage (A47-A57 PRESENT-EXPLICIT) and all pedagogical content preserved.
- Fixed `content/protocols/passage_pellet_reseed/protocol.yaml`: corrected scene_operations and validator preset field shapes to canonical spec (WP-SWEEP-MP-2). Four categories of field-shape errors (100 total) resolved: (1) CursorAttach using `to_object:` field changed to canonical `target:` + `operation: attach` (9 operations fixed); (2) ObjectStateChange using flat `field:` + `value:` keys restructured to canonical nested `state: {field: value}` (18 operations fixed); (3) target_with_value validator using flat `field`, `value`, `tolerance` keys restructured to canonical nested `value: {field: value}` (4 validators fixed); (4) TimedWait using `duration_ms` field corrected to canonical `duration_min` plus added required `target:` and `display:` fields (1 operation fixed). Additionally: (a) two `type`-gesture interactions with `correct_target` validators (violating GESTURE_VALIDATOR_MAP) changed to `click`-gesture with `correct_target` (label_conical_tube, label_plate); (b) calculate_split_volume step simplified by removing redundant adjust interaction targeting aspirating_pipette (which lacks set_volume field); (c) material references updated from `fresh_media` to canonical `media` in aspirating_pipette and well_plate_96 contexts to match object enum declarations; (d) materials.yaml augmented with `media` entry to bridge object enum to material declarations. All 100 errors resolved. Pedagogy, step count (now 8 steps from 9 after redundancy removal), prompt text, and action coverage (A11-A19 PRESENT-EXPLICIT) preserved.

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

## 2026-05-15 (M2 WP-MP-1: Author passage_hood_detachment mini-protocol)

### Additions and New Features

- Created `content/protocols/passage_hood_detachment/protocol.yaml`: 10-step mini-protocol covering canonical actions A1-A2, A4-A10 (A3-prep omitted as pedagogically optional preparation). Scope: aseptic cell detachment and trypsin neutralization from T75 flask. Entry step: `inspect_confluence`. Learning block fully specified with objectives, outcomes, and goals. All 10 actions map to explicit steps (PRESENT-EXPLICIT); A3-prep intentionally excluded (warm reagents is preparation overhead distracting from core detachment pedagogy).
- Created `content/protocols/passage_hood_detachment/materials.yaml`: four material definitions (media, pbs, trypsin, cell_suspension) with display colors.
- Created `content/protocols/passage_hood_detachment/scenes/hood_workspace.yaml`: protocol scene extending hood_basic; adds t75_flask (center), pbs_bottle, trypsin_bottle, media_bottle (rear zones).
- Created `content/scenes/microscope_basic.yaml`: NEW BASE SCENE (promoter: MP-1) for stable microscope workspace reuse. Extended by MP-3 later. Used in MP-1 for A1 confluence inspection and A9 detachment confirmation.
- Created `content/protocols/passage_hood_detachment/scenes/microscope_view.yaml`: protocol scene extending microscope_basic (minimal override).

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

- Fixed `content/protocols/passage_hood_detachment/protocol.yaml`: corrected scene_operations and validator preset field shapes to canonical spec (WP-SWEEP-MP-1). Errors fixed: (1) three `target_with_value` validators missing required `value` payload - added `{ held_material_volume: 4 }` (PBS wash), `{ held_material_volume: 3 }` (trypsin), `{ held_material_volume: 9 }` (neutralization); (2) three `CursorAttach` operations missing required `operation: attach` field; (3) `TimedWait` primitive corrected from `duration_seconds: 120` to `duration_min: 2` and added required `display: "Incubating: allow trypsin to work"` field. All 9 errors resolved. Pedagogy, step count, and action coverage unchanged.

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0. 10 steps within 6-10 guideline. All targets resolve to objects; TimedWait primitive (A8, 120 sec) ratified per PRIMARY_SPEC.md.
- Object-asset audit (all ASSET-OK): t75_flask, ethanol_bottle, aspirating_pipette, pbs_bottle, trypsin_bottle, media_bottle, hood_surface, incubator, microscope. No new objects created.
- Deferral check: SceneChange hood <-> microscope (APPLIES, ratified); Volume tolerance adjust gesture (APPLIES, target_with_value used); Named groups (N/A); material_kind (N/A, material_name enum sufficient); Shared materials (N/A); Set-point depth (N/A, TimedWait is scene_operation, not object state).
- Evidence log updated: A1-A10 ABSENT -> PRESENT-EXPLICIT; A3-prep marked NOT-INCLUDED with rationale.
- Handoff contract (MP-1 -> MP-2): final step sets t75_flask.material_name=cell_suspension, material_volume=12 mL (3 mL trypsin + 9 mL media). MP-2 entry depends on this state.

## 2026-05-15 (M2 WP-MP-5: drug_dilution_setup mini-protocol)

### Additions and New Features

- Created `content/protocols/drug_dilution_setup/protocol.yaml`: full 32-step mini-protocol covering canonical actions A47-A57 (carboplatin 8-stock series + metformin working stock + volume gate). Internal sectioning by carboplatin low-range (4 stocks from 200 uM intermediate), high-range (4 stocks from 10 mM master), and metformin fixed-dose prep. Carboplatin working stocks: 400 nM (10 nM final), 2 uM (50 nM), 5 uM (125 nM), 10 uM (250 nM), 20 uM (500 nM), 100 uM (5 uM), 500 uM (25 uM), 2 mM (100 uM). Metformin: 10 mM working stock (5 mM final, >=60 uL volume gate).
- Created `content/protocols/drug_dilution_setup/materials.yaml`: 12 materials declared (carboplatin master + intermediate + 8 working stocks; metformin master + working stock). Display colors follow biochemistry conventions (gold/orange series for carb stocks, purple for metformin).
- Created `content/protocols/drug_dilution_setup/scenes/dilution_workspace.yaml`: protocol scene extending bench_basic, adds 10 placements (carboplatin stock, metformin stock, intermediate tube, working-stock tube, 8-tube dilution rack, sterile water, media, micropipette, label pen).

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Step-count deliberate excess: 32 steps vs 6-10 guideline. Per Resolved Decision #8 (plan), this is pedagogically correct for full dilution-series coverage. learning.goals documents rationale. Validator does NOT gate on step count (advisory only).
- Object-asset audit: all 10 directly-referenced objects (micropipette, carboplatin_stock_bottle, metformin_stock_bottle, microtube_15ml_intermediate, metformin_working_tube, dilution_tube_rack_8, sterile_water_bottle, media_bottle, vortex, label_pen) tagged ASSET-OK (pre-existing objects with verified SVG assignments).
- Deferral check: (1) SceneChange DOES NOT APPLY (single bench workspace). (2) Volume tolerance APPLIES (exact-match set_volume validators on micropipette; comment flags gap). (3) Named groups APPLIES (8 working stocks; pedagogy reads cleanly as individual stock-by-stock flow, no named-group construct needed). (4) material_kind DOES NOT APPLY (all liquids). (5) Shared materials library APPLIES (metformin_working_stock and carb_working_stock_* appear here only in M2; no cross-mini duplication documented yet). (6) Set-point depth APPLIES (vortex timer tracks duration only, not rpm; comment flags gap).
- Validator: `source source_me.sh && python3 tools/validate_content_yaml.py` reports 1 warning (step count) + 0 errors on drug_dilution_setup. Pre-existing failures (passage_hood_detachment materials schema) unchanged.
- Coverage matrix updated: A47-A57 rows marked PRESENT-EXPLICIT in docs/active_plans/ovcar8_action_coverage_matrix.md.

## 2026-05-15 (M3 WP-VALIDATOR-EXTEND: enforce sequence_runner-leaves rule)

### Additions and New Features

- Added `--self-test` CLI flag to `tools/validate_content_yaml.py`: invokes `_self_test_sequence_runner_leaves()` to verify sequence_runner-leaves rule works correctly. Synthetic fixtures (mini_protocol leaf, two sequence_runners: one correct, one violating the rule) confirm that invalid references are caught and valid ones pass.

### Behavior or Interface Changes

- Extended `tools/validators/protocol_validator.py:_validate_sequence_runner()` to enforce the hard rule per PRIMARY_SPEC.md: a sequence_runner may reference ONLY mini_protocol leaves, never another sequence_runner. When a sequence_runner lists a constituent that is itself a sequence_runner (not a mini_protocol), the validator now emits an error: `sequence_runner '<name>' referenced in mini_protocols list; sequence runners may reference only mini_protocol leaves, never another sequence_runner`. Error path: `<path>.mini_protocols[<idx>]`.

### Fixes and Maintenance

(none)

### Removals and Deprecations

- Removed `tests/test_validate_content_yaml_sequence_runner_leaves.py`: transitioned from transition-style synthetic pytest to embedded self-test in the validator itself. Production rule enforced against live content tree remains in `protocol_validator.py`; confidence verification now integrated as `--self-test` flag.

### Decisions and Failures

(none)

### Developer Tests and Notes

- Validator self-test: `source source_me.sh && python3 tools/validate_content_yaml.py --self-test` exits 0 and confirms sequence_runner-leaves rule working correctly.
- Main validator: `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0 on current tree (all mini_protocol leaves, no sequence_runner leaves to check). Pre-existing failures (object kind, capability, materials schema) unchanged by this extension.
- Pyflakes: `source source_me.sh && python3 -m pyflakes tools/validate_content_yaml.py` clean (no unused imports or undefined names).

## 2026-05-15 (M2 WP-MP-2: Author passage_pellet_reseed mini-protocol)

### Additions and New Features

- Created `content/protocols/passage_pellet_reseed/protocol.yaml`: 9-step mini-protocol covering canonical actions A11-A19 (transfer to conical, labeling, centrifugation, aspirate, resuspend, 1:7 split calculation, fresh-media seeding, labeling, incubator return). Entry step: `transfer_to_conical`. Learning block fully specified with objectives, outcomes, and goals scoped to centrifugal pellet recovery and split passage. All 9 actions map to explicit steps or interactions (PRESENT-EXPLICIT).
- Created `content/protocols/passage_pellet_reseed/materials.yaml`: four material definitions (cell_suspension, cell_pellet, fresh_media, empty) with display colors for state visualization.
- Created `content/protocols/passage_pellet_reseed/scenes/hood_workspace.yaml`: protocol scene extending hood_basic; adds conical_15ml_rack, fresh media_bottle, well_plate_96, and label_pen for hood-based interactions (A11, A17, A18).
- Created `content/protocols/passage_pellet_reseed/scenes/centrifuge_workspace.yaml`: per-protocol scene extending bench_basic; adds centrifuge, conical_15ml_rack, and aspirating_pipette for centrifuge-based interactions (A13, A14, A15). Per-plan promotion policy: NOT promoted to base; promote only if a second protocol claims it.
- Created `content/objects/label_pen.yaml`: new shared object (kind=pipette, ASSET-UNVERIFIED) supporting type interactions for labeling conical tubes (A12) and plates (A18). Asset assignment deferred to separate SVG plan.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

(none)

### Removals and Deprecations

(none)

### Decisions and Failures

(none)

### Developer Tests and Notes

- Validator output: `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0 on passage_pellet_reseed tree (no MP-2 errors; pre-existing MP-1 errors remain).
- Object-asset audit: conical_15ml (ASSET-OK), conical_15ml_rack (ASSET-OK), centrifuge (ASSET-OK), aspirating_pipette (ASSET-OK), media_bottle (ASSET-OK), well_plate_96 (ASSET-OK), incubator (ASSET-OK), biohazard_decant (ASSET-OK), label_pen (ASSET-UNVERIFIED, new object, SVG assignment deferred). All 9 action targets audited.
- Deferral check: SceneChange hood <-> centrifuge (APPLIES, ratified per plan); Volume tolerance on A16 split (1.14 mL +/-0.2 mL tolerance implemented via target_with_value validator); Named groups (N/A, no well fan-out in MP-2); material_kind (DOES NOT APPLY, cell_pellet vs cell_suspension distinguished by material_name); Shared materials library (N/A, per-mini materials); Set-point depth (centrifuge: set_rpm + set_time_min declared, NO set_temperature; A13 uses rpm + duration only, temperature not in scope for MP-2).
- Evidence log (`docs/active_plans/ovcar8_action_coverage_matrix.md`): A11-A19 rows updated ABSENT -> PRESENT-EXPLICIT with step cross-references and interaction detail.
- Handoff contract (MP-1 -> MP-2): MP-2's entry assumes `t75_flask.material_name = cell_suspension` (set by MP-1's A10 neutralization step). Learning outcomes explicitly document this dependency: "...from neutralized cell suspension (MP-1 endpoint) through centrifugal pellet recovery...". MP-1 author must make matching commitment in their patch.

## 2026-05-15 (M1 WP-DELETE: clear 7 minis + evidence log scaffold)

### Additions and New Features

- Created `docs/active_plans/ovcar8_action_coverage_matrix.md`: evidence log scaffold with per-MP coverage matrix (A1-A57 ABSENT initially) and full canonical action map reference for M2 authors. M2 WP-MP-N patches append rows as each mini is delivered and validated.

### Behavior or Interface Changes

(none)

### Fixes and Maintenance

- `tools/validate_content_yaml.py` confirmed to accept empty-protocol state (0 protocols, 0 protocol scenes, 0 materials files); validator gates green on the post-delete tree (36 files: 34 objects, 2 base scenes). Validated 36 files (34 objects, 2 base scenes, 0 protocol scenes, 0 materials, 0 protocols). 0 failures.

### Removals and Deprecations

- Deleted 7 obsolete protocol folders via `git rm` to clear `content/protocols/` for M2 mini delivery: `hood_flask_prep`, `cell_culture`, `cell_counting_and_seeding`, `drug_dilution_setup`, `plate_drug_treatment`, `mtt_assay_readout`, `cell_culture_full`. Pre-delete SHA `c99641c5` preserves the prior YAML; recover with `git show c99641c5:content/protocols/<folder>/<file>`. Archive subtree at `archive/content_legacy_2026_05/` (introduced by interim commit `24b6c9a` against user direction) purged in this changelog session per "no new archive/ subtree" rule.
- Rationale: structural audit revealed 46% canonical-action coverage gap in the 6-mini set; plan replaces with 10 focused minis (MP-1..MP-10) assembled from a canonical-action map (57 counted OVCAR8 actions). Clearing the tree unblocks M2 to land minis one at a time.

### Decisions and Failures

(none)

### Developer Tests and Notes

- Validator command: `source source_me.sh && python3 tools/validate_content_yaml.py`; final output line: "Validated 36 files (34 objects, 2 base scenes, 0 protocol scenes, 0 materials, 0 protocols). 0 failures."

## 2026-05-15 (Capability snake_case purism + active-plans triage)

### Behavior or Interface Changes

- Retired the last camelCase capability ids and template variables.
  Scene capability values renamed in `content/scenes/bench_basic.yaml`
  and `content/scenes/hood_basic.yaml`: `itemWorkspace` ->
  `item_workspace`. `wrong_order_message.template` placeholder
  `{expectedLabel}` -> `{expected_label}`. Spec docs touched:
  `SCENE_YAML_FORMAT.md`, `SCENE_ARCHITECTURE.md`, `CODE_ARCHITECTURE.md`.
  The legacy camelCase capability id family (`modalWorkspace`,
  `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`,
  `plateReaderWorkspace`, `liquidTransfer`) is renamed in lockstep
  across the same docs.
- `tests/test_spec_vocabulary.py` G9 `CAPABILITY_ID_ALLOWLIST` retired
  to an empty `frozenset()`. G9 scanner now flags every camelCase
  capability id. 9/9 spec vocabulary gates green.
- Three additional active plans archived after the YAML / scene-inheritance /
  docs-org work landed:
  - `docs/active_plans/protocol_entry_audit.md` ->
    `docs/archive/protocol_entry_audit.md` (explicitly superseded by
    the Class I `entry_step` sweep).
  - `docs/active_plans/scene_inheritance_migration.md` ->
    `docs/archive/scene_inheritance_migration.md` (content-side shipped;
    runtime alignment moves to `typescript_migration_plan.md`).
  - `docs/active_plans/docs_folder_organization_plan.md` ->
    `docs/archive/docs_folder_organization_plan.md` (specs +
    protocols moves shipped; `docs/architecture/` subfolder and
    `QTI_v3_SPEC.md` relocation **decided against**).

### Fixes and Maintenance

- Markdown link gate (`pytest tests/test_markdown_links.py`) green
  after every cross-link rewrite implied by the archive moves.

## 2026-05-15 (M3 close-out: content YAML reauthoring plan archived)

### Behavior or Interface Changes

- Archived `docs/active_plans/content_yaml_migration_plan.md` to
  `docs/archive/content_yaml_migration_plan.md` via `git mv`. The plan's
  structural milestones (M1 pilot, M2 full object library + scene
  inheritance, M3 sequence runner + validator sweep) are closed.
  Validator gates green: 55 files across four vocabularies (34 objects,
  2 base scenes, 6 protocol scenes, 6 materials, 7 protocols).
- `AGENTS.md` "Core rules" pointer updated:
  `docs/specs/LIQUID_CONVENTION.md` -> `docs/specs/MATERIAL_CONVENTION.md`;
  rule expanded from "Liquids follow..." to "Materials (liquids,
  mixtures, suspensions, waste) follow...". Reflects the four-vocabulary
  authoring model (protocol, object, scene, material) ratified earlier
  today.

### Decisions and Failures

- Closed scope of `sorted-snacking-kettle` plan:
  - M1 / M2 / M3 structural milestones shipped (object library, scene
    inheritance, sequence runner, four-class validator).
  - **Deferred to follow-on plan(s):**
    1. Pedagogy reauthoring pass per WP-MP-* (T-1..T-23 reauthoring
       rules in the archived plan). Structural conformance shipped;
       deep step rewrites from `docs/protocols/OVCAR8_*.md` are not yet
       done.
    2. Cross-workspace `SceneChange` wiring (hood / bench / microscope /
       centrifuge / plate_reader transitions). Needs `src/scene_runtime/`
       alignment, expected to live in a separate runtime-alignment plan.

### Fixes and Maintenance

- Stale `LIQUID_CONVENTION.md` links repaired across 6 docs
  (`CHANGELOG-2026-05c.md`, `FILE_STRUCTURE.md`, `PRIMARY_CONTRACT.md`,
  `PRIMARY_DESIGN.md`, `SCENE_VOCABULARY.md`, archived
  `content_yaml_migration_plan.md`). `pytest tests/test_markdown_links.py`
  passes.

## 2026-05-15 (validator: colored compiled summary tail)

### Additions and New Features

- Added `tools/validators/compiled_summary.py`: aggregates tree-level counts
  across the four authoring vocabularies (objects, scenes, materials, protocols)
  from the already-built `ContentDatabase` plus the protocol / protocol-scene /
  material rows loaded during the existing whole-tree walk. No second YAML pass.
- Wired into `tools/validate_content_yaml.py::validate_whole_tree`: renders
  four `rich.panel.Panel` blocks above the existing terse `Validated N files ...`
  summary line. Color is forced via
  `Console(force_terminal=True, color_system="truecolor")`. No new argparse
  flags. `-q` still silent on success.
- Extracted shared `_protocol_counts` helper in `tools/validators/summary.py`;
  used by both `print_protocol_summary` (per-file `-v` printer) and the new
  compiled summary aggregator.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits clean.
  Four colored panels render above terse summary line. `pytest
  tests/test_pyflakes_code_lint.py` and `pytest
  tests/test_import_requirements.py` green. `rich` is supplied by
  `pip_requirements-dev.txt` (devel tools).

## 2026-05-15 (Vocabulary rename: contents -> materials; fourth small authoring vocabulary)

### Behavior or Interface Changes

- **Authoring vocabulary expanded from three to four**: protocol, object,
  scene, **material**. A material is anything physically present in, on,
  produced by, removed from, or transferred between objects (reagents,
  media, cells, mixtures, suspensions, waste). Objects remain interactable
  rendered things; materials are what objects hold or carry. Decision
  rationale: previous `contents` name overlapped with the `content/` folder
  and read as a subset of "object", obscuring that materials are their own
  small vocabulary surface.
- **File rename, 6x**: `content/protocols/<name>/contents.yaml` ->
  `content/protocols/<name>/materials.yaml` via `git mv`. Top-level YAML
  key `contents:` -> `materials:` in every file.
- **State field rename**: `contents_name` -> `material_name`,
  `contents_volume` -> `material_volume`, `held_contents_name` ->
  `held_material_name`, `held_contents_volume` -> `held_material_volume`.
  Applied across 24 object YAMLs and 6 protocol YAMLs.
- **Capability rename**: `contents_container` -> `material_container`
  (object closed-set capability).
- **Spec doc rename**: `docs/specs/LIQUID_CONVENTION.md` ->
  `docs/specs/MATERIAL_CONVENTION.md` via `git mv`. The doc now opens with
  a `## Material vs object` section defining materials as a first-class
  fourth authoring vocabulary, plus a `## Materials YAML schema` section
  hosting the canonical closed schema (label + display_color required, no
  optional keys, no `material_kind` enum until a non-liquid material needs
  it). The pipette-fill rendering content is preserved as a subsection
  because liquid remains the most common material state.
- **Validator updates**: `T1_CONTENTS_REF` finding tag renamed to
  `T1_MATERIAL_REF`. New `MaterialValidator` class enforces the closed
  schema (top-level `materials:` only; per-entry only `label` +
  `display_color`; snake_case material names; hex color format).
  `validate_content_yaml.py` gains `-m` / `--material` CLI flag and
  validates materials in the whole-tree sweep. `ContentDatabase.resolve_contents`
  -> `resolve_material`; `contents_by_protocol` -> `materials_by_protocol`.

### Fixes and Maintenance

- Updated 12 spec / design docs to the new vocabulary
  (`MATERIAL_CONVENTION.md`, `OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`,
  `PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_VOCABULARY.md`,
  `PROTOCOL_YAML_FORMAT.md`, `SCENE_YAML_FORMAT.md`,
  `SPEC_DESIGN_CHECKLIST.md`, `TARGET_FILE_STRUCTURE.md`,
  `PRIMARY_SPEC.md`, `CODE_ARCHITECTURE.md`).
- Validator green at 55 files, 0 failures: 34 objects, 2 base scenes,
  6 protocol scenes, 6 materials, 7 protocols.

### Decisions and Failures

- Decided: stay minimal on the material schema. `material_kind` enum
  (liquid, solid, gel, powder) deliberately not authored until a real
  non-liquid material needs distinct behavior. Two fields only:
  `label`, `display_color`.
- Decided: rename `LIQUID_CONVENTION.md` to `MATERIAL_CONVENTION.md`.
  "Liquid" lives on as a material state in prose, not as the doc
  boundary. The pipette-fill rendering convention remains in this doc
  because liquid is the only currently-rendered material state.
- Decided: keep volume field as `material_volume`, not `liquid_volume`.
  When a future solid or powder material needs a different physical
  field, it adds a new flat field (e.g. `material_mass`) rather than
  renaming `material_volume`.

## 2026-05-15 (M2 scenes: bench_basic base + 5 inherited protocol scenes)

### Additions and New Features

- Promoted `content/scenes/bench_basic.yaml` as a shared base scene. Used
  by five mini-protocols (cell_counting_and_seeding, drug_dilution_setup,
  mtt_assay_readout, plate_drug_treatment, and the bench-side steps of
  cell_culture), satisfying the promotion rule in
  `docs/specs/SCENE_INHERITANCE.md`. Placement set is intentionally
  minimal: waste container rear-left, vortex rear-right; per-protocol
  scenes layer the working inventory on top via `add_placements`.
- Authored five inherited protocol scenes per the pilot pattern:
  - `content/protocols/cell_culture/scenes/hood_setup.yaml` (extends
    `hood_basic`)
  - `content/protocols/cell_counting_and_seeding/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/drug_dilution_setup/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/mtt_assay_readout/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  - `content/protocols/plate_drug_treatment/scenes/bench_setup.yaml`
    (extends `bench_basic`)
  Each scene uses only the four allowed protocol-scene operations
  (currently just `add_placements`), one inheritance level, and stable
  `placement_name` values per `SCENE_INHERITANCE.md`. Cross-workspace
  transitions (e.g. centrifuge inside cell_culture) are deferred to a
  future expansion that wires `SceneChange` per `PRIMARY_SPEC.md`.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits
  clean. 49 files validated (34 objects, 2 base scenes, 6 protocol
  scenes, 7 protocols). 0 failures.

## 2026-05-15 (sequence runner: cell_culture_full authored, validator passes 7 protocols)

### Additions and New Features

- Authored `content/protocols/cell_culture_full/protocol.yaml` as the
  pathway-level sequence runner. Declares `protocol_type: sequence_runner`,
  carries a pathway-scoped `learning` block (using the sequence-runner
  leading phrases per `LEARNING_SEQUENCE_RUNNER_PREFIXES`), and lists the
  six constituent mini-protocols in pedagogical order
  (cell_culture, hood_flask_prep, cell_counting_and_seeding,
  drug_dilution_setup, plate_drug_treatment, mtt_assay_readout).
- Added `mini_protocols` to `PROTOCOL_OPTIONAL_KEYS` in
  `tools/validators/constants.py`. Sequence runners declare this ordered
  constituent list instead of authored `steps`, per the
  `## Sequence runners` section of `docs/PRIMARY_SPEC.md`.

### Behavior or Interface Changes

- `ProtocolValidator` now enforces required slots per protocol type:
  `sequence_runner` requires `mini_protocols` (non-empty list of known
  protocol names); every other protocol type requires `steps`. Step-shape
  and step-count gates apply to `mini_protocol`/`protocol`/`dev_smoke`
  only. A new `_validate_sequence_runner` method walks the constituent
  list and emits an error per unresolved name (cross-checked against
  `ContentDatabase.protocols`).
- `PROTOCOL_REQUIRED_KEYS` shrank to the universal set
  (`protocol_type`, `protocol_name`, `entry_step`, `learning`). Per-type
  branches enforce the additional required slot.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits
  clean. 43 files validated (34 objects, 1 base scene, 1 protocol scene,
  7 protocols including the new sequence runner). 0 failures.

## 2026-05-15 (content YAML drift cleanup: validator green on full content/ tree)

### Behavior or Interface Changes

- Renamed `state_fields[*].name` -> `state_fields[*].field_name` across every
  `content/objects/*.yaml` (63 renames in 31 files) to match the ratified
  `OBJECT_YAML_FORMAT.md` schema. Validator now passes T1_STATE_FIELD on every
  declared field.
- Renamed protocol top-level `name:` -> `protocol_name:` across all six
  mini-protocols. Renamed every step's `name:` -> `step_name:` (46 step
  renames). Renamed `plate_drug_treatment.parts[*].dayId` -> `day_name`
  (4 renames, T-10 camelCase rule in plan
  `sorted-snacking-kettle.md`).

### Additions and New Features

- Added new declared `state_fields` to objects authored as required by
  protocol writes: `hemocytometer.{contents_name, contents_volume}`,
  `t75_flask.inspection_status`, `t75_flask_new.incubation_status`,
  `media_bottle.temperature_status`, `water_bath.stage`,
  `well_plate_96.{inspection_status, dosing_status}`.
- Expanded enum `allowed` lists on liquid-bearing objects so the values
  protocols write are declared: `conical_15ml.contents_name`
  (cell_suspension, cell_pellet); `serological_pipette.held_contents_name`
  (cell_suspension); `micropipette.held_contents_name`
  (cell_suspension, carboplatin_10mM, metformin_1M);
  `microscope.objective` (high_power);
  `microtube_15ml_intermediate.contents_name` (carboplatin_400uM);
  `metformin_working_tube.contents_name` (metformin_10mM);
  `aspirating_pipette.held_contents_name` (mtt);
  `biohazard_decant.contents_name` (mtt);
  `multichannel_pipette.held_contents_name` (carboplatin, metformin).
- Added missing per-protocol contents entries: `cells` in
  `cell_culture/contents.yaml`; `drug_combo` in
  `plate_drug_treatment/contents.yaml`.

### Fixes and Maintenance

- Fixed validator bug: `ObjectStateChange` now resolves against the op-level
  `target` when present, falling back to the interaction-level `target`.
  Previously the validator conflated where the student clicked with which
  object the op mutated, producing spurious T1_STATE_FIELD failures.
  Single-fix delta: 123 -> 47 findings.
- `T1_CONTENTS_REF` now treats `'empty'` and `'mixed'` as universal sentinel
  values (per `OBJECT_VOCABULARY.md`) and skips the contents-registry lookup
  for those. Bulk-write a sentinel without polluting `contents.yaml`.

### Developer Tests and Notes

- `source source_me.sh && python3 tools/validate_content_yaml.py` exits clean.
  42 files validated (34 objects, 1 base scene, 1 protocol scene, 6 protocols).
  0 failures.

## 2026-05-15 (content YAML snake_case sweep: zero camelCase across content tree)

### Behavior or Interface Changes

- Renamed `displayColor:` -> `display_color:` across every per-protocol
  `contents.yaml` (32 sites in 6 files).
- Dropped retired `colorKey:` field from every contents entry (15 sites in
  2 files). Color is derived from `contents_name` + the object's
  `visual_states`, per T-3 in plan `sorted-snacking-kettle.md`.
- Renamed scientific-unit contents identifiers to pure snake_case to drop
  the embedded uppercase molar suffixes (mM, uM, M):
  `carboplatin_10mM` -> `carboplatin_10mmol`,
  `carboplatin_400uM` -> `carboplatin_400umol`,
  `metformin_10mM` -> `metformin_10mmol`,
  `metformin_1M` -> `metformin_1mol`. Applied across
  `drug_dilution_setup/contents.yaml`, `drug_dilution_setup/protocol.yaml`
  state writes, and the matching object enum `allowed:` lists on
  `micropipette`, `microtube_15ml_intermediate`, `metformin_working_tube`.

### Developer Tests and Notes

- A walk of every `content/**/*.yaml` confirms no key contains any ASCII
  uppercase character. Validator still passes 42 files, 0 failures.

## 2026-05-15 (spec consistency pass: PRIMARY*.md and docs/specs/ contradictions reconciled)

### Behavior or Interface Changes
- **`docs/specs/PROTOCOL_AUTHORING_GUIDE.md`** (F1): replaced stale "`entry` block that declares the initial scene and first step" wording with the canonical "top-level `entry_step` field" statement. Protocol has no `entry` block and declares no opening scene; scene context comes from the first step's interactions and any `SceneChange` operation in their responses.
- **`target_groups` term retired across all canonical specs** (F2 expanded): per user direction, the term is not part of the vocabulary at all -- not deferred, not retired-with-successor, just absent. Purged from `docs/PRIMARY_SPEC.md`, `docs/specs/OBJECT_VOCABULARY.md`, `docs/specs/OBJECT_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md`, `docs/specs/SCENE_VOCABULARY.md`, `docs/specs/SCENE_YAML_FORMAT.md`, `docs/specs/SPEC_DESIGN_CHECKLIST.md`. Deleted the "Named groups deferred" subsections (OBJECT_VOCABULARY, OBJECT_YAML_FORMAT) and the SCENE_VOCABULARY "retired" paragraph. Replaced with "the vocabulary has no named-group construct"; the explicit-subpart pattern (`treatment_plate.A1`, ...) remains the only mechanism. Removed `target_groups` from every placement-may-not-override list. Validator gate in OBJECT_YAML_FORMAT now reads "unknown structure keys rejected" rather than a `target_groups`-specific rejection.
- **`docs/PRIMARY_SPEC.md` walker bullet** (F1 follow-on): "starts in the protocol's declared entry scene" replaced with "starts in the scene reached by the protocol's `entry_step` (resolved through that step's target adapter or a `SceneChange` operation)". Removes self-contradiction with the no-scene-at-protocol-level rule.
- **6-to-10 step "gate" softened to "guideline"** (F5): `docs/PRIMARY_SPEC.md` (two occurrences), `docs/PRIMARY_DESIGN.md`, and `docs/specs/PROTOCOL_VOCABULARY.md` updated. Sequence runners and `dev_smoke` remain exempt; wording now matches descriptive (not enforcement) language in PROTOCOL_VOCABULARY.
- **Render-layer primitive home moved to `docs/specs/OBJECT_VOCABULARY.md`** (F7): `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, `SetPointDisplayChange` are now canonically described in the `visual_states` section of `OBJECT_VOCABULARY.md`, including the `ObjectStateChange` boundary and the flat state fields it writes. `docs/specs/SCENE_YAML_FORMAT.md` shrunk to a one-line pointer.

### Decisions and Failures
- **F3 (asset SVG path scope)**: user chose to keep `assets/` as the parent scope in `PRIMARY_CONTRACT.md`. `assets/equipment/` in `SVG_PIPELINE.md` is a valid subdir, no edit required.
- **F4 (learning-block leading phrases)**: false positive on initial audit. `docs/specs/PROTOCOL_YAML_FORMAT.md` already quotes the three exact required phrases verbatim in its schema table.
- **F6 (`background` locked-field)**: false positive on initial audit. `docs/specs/SPEC_DESIGN_CHECKLIST.md` rule 20 already lists `background` among locked fields.
- **F8 (canonical `contents.yaml` path)**: not addressed this pass. `OBJECT_VOCABULARY.md` and `PRIMARY_DESIGN.md` reference a `contents.yaml` registry without a canonical path; resolve in a follow-up doc edit.

### Removals and Deprecations
- **All "deferred" / "reserved" / "not yet implemented" markers purged from canonical specs.** Per user direction, vocabulary docs state present tense only; no future-work hatches in spec surface. Changes:
  - `structure.layout: custom` enum value removed. `structure.layout` accepts only `grid` or `list`. Updated in `docs/specs/OBJECT_VOCABULARY.md` and `docs/specs/OBJECT_YAML_FORMAT.md`.
  - `liquidTransfer` capability id retired entirely (not declared by any scene, no module registered). Removed from `docs/specs/SCENE_YAML_FORMAT.md` and `docs/specs/SCENE_ARCHITECTURE.md` capability tables, from `tools/build_scene_data.py` `VALID_CAPABILITY_IDS`, and from `tests/test_spec_vocabulary.py` G9 allowlist.
  - "RESERVED" status column entries on five capability rows (`modalWorkspace`, `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`, `plateReaderWorkspace`) replaced with present-tense "Validates `scene_name` only" or equivalent.
  - `wrongOrderMessage` RESERVED-for-future-wiring note dropped from `SCENE_ARCHITECTURE.md` (the field's authoring surface remains documented).
  - `workspace` field "reserved for future runtime use" dropped from `SCENE_VOCABULARY.md`; now describes present-tense behavior.
  - "Future work" and "Out of scope" sections deleted from `SCENE_INHERITANCE.md`; replaced with present-tense "Inheritance depth" statement (one level, no multi-level).
  - "Referenced interaction names are deferred" removed from `PROTOCOL_VOCABULARY.md`; replaced with "Interactions are not addressable by name."
  - "Candidate future primitive `DataReadout`/`InstrumentReadDisplayChange`" paragraph deleted from `PROTOCOL_VOCABULARY.md`; instrument-produced data stays `feedback`-only.
  - "Complex branching is deferred" softened to present-tense statement: `outcome` mapping carries no `on_hint_requested`, no `branches`, no adaptive review.
  - "or marked deferred and excluded from current authoring" exit hatch removed from `docs/PRIMARY_DESIGN.md` closure-over-openness principle. Every container must have a closed schema, no exceptions.
  - `docs/specs/SPEC_DESIGN_CHECKLIST.md` rule 2 and smell-class table row dropped the "OR be explicitly marked future/deferred" clause.
  - "Named groups are deferred" purged everywhere it lingered (12+ residual mentions across all canonical specs). Replaced with "the vocabulary has no named-group construct".
  - `effects.ts` reference deleted from `SCENE_ARCHITECTURE.md` Bench scene row (file does not exist).

## 2026-05-15 (spec doc sweep: key normalization, camelCase removal, retired-language cleanup - giggly-mixing-minsky)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` Author YAML vocabulary lock extended (Class L1)**: Added ratified rule 8 to lock scope-specific identity handles in authored YAML. Bare `name:` is banned; the allowed handles are `protocol_name` (protocol), `step_name` (step), `object_name` (object identity, instruments included), and `field_name` (object state-field). Ordinary prose may still use the English word "name"; the ban applies to YAML fields and schema-table field-name cells. `entry_step` and `next_step` reference `step_name`. Any "the name of X" schema wording becomes "the `X_name`".
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` smell-class 29 (Class L1)**: New blocker-severity smell class flagging bare `name:` in authored YAML and schema tables. RD-16 records the live rule only; no retired-term table rows.
- **`tests/test_spec_vocabulary.py` G7, G8, G9 gates (Class L2)**: New hard-pass assertions enforce the vocabulary lock. G7 bans bare `name:` (excludes the checklist). G8 bans the retired root-of-protocol `entry:` block shape. G9 bans camelCase YAML keys in YAML fenced blocks and schema-table field-name cells, with a documented capability-id allowlist (`itemWorkspace`, `modalWorkspace`, `instrumentWorkspace`, `gridCountingWorkspace`, `incubatorWorkspace`, `plateReaderWorkspace`, `liquidTransfer`) and a fence-language parser that excludes TypeScript and other code-language fences.

### Behavior or Interface Changes
- **Tier 1 key normalization across `docs/PRIMARY_*.md` and `docs/specs/*.md`**:
  - **Protocol handle (Class A)**: bare `name:` -> `protocol_name:` in protocol-level schema tables and YAML examples. `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md` updated.
  - **Step handle (Class B)**: bare `name:` -> `step_name:` in step schema tables, YAML examples, and all "the `name`" prose. `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/PROTOCOL_VOCABULARY.md`, `docs/specs/PROTOCOL_STEPS.md`, `docs/specs/PROTOCOL_AUTHORING_GUIDE.md`, `docs/specs/WALKTHROUGH_GUIDE.md` updated. `next_step` and `entry_step` prose now reference `step_name`.
  - **Object state-field handle (Class C)**: bare `name:` -> `field_name:` in object `state_fields` entries. `docs/specs/OBJECT_VOCABULARY.md` and `docs/specs/OBJECT_YAML_FORMAT.md` updated.
  - **Instrument/object handle (Class D)**: `docs/specs/SCALING_MODEL.md` "Adding a new object" example flattened to canonical `object_name:` form. Removed redundant outer wrapper that introduced a bare `name:` field.
- **Tier 2 camelCase removal (Class E)**:
  - `colorKey` retired entirely from authored `contents.yaml` (legacy runtime field). `display_color` is the sole authored color field; it remains live as `contents.yaml` metadata, distinct from the retired object-state `liquid_color`.
  - `displayColor` -> `display_color` in `docs/specs/PROTOCOL_YAML_FORMAT.md` schema table and YAML example; the generated TypeScript example now reflects the renamed field.
  - `dayId` -> `day_name` in the Parts block schema and TypeScript example in `docs/specs/PROTOCOL_YAML_FORMAT.md`. The `id` row in the Parts table becomes `part_name`.
  - `sceneId` -> `scene_name` in the SCENE_YAML_FORMAT validator-rule prose (line 380), eliminating the contradiction with line 113.
  - `wrongOrderMessage` -> `wrong_order_message` and `toastDurationMs` -> `toast_duration_ms` in `docs/specs/SCENE_YAML_FORMAT.md` validator-gap list and in `docs/specs/SCENE_VOCABULARY.md` entry.
  - `{expectedLabel}` -> `{expected_label}` in toast-template field description and YAML examples (`docs/specs/SCENE_YAML_FORMAT.md`).
- **Tier 3 retired language and contradictions**:
  - **Retired step kinds (Class F)**: `interactionSequence`, `directTool`, `multipleChoice` removed from `docs/specs/WALKTHROUGH_GUIDE.md` "How the walker decides what to click" and "Completion-path support" sections. Replaced with the current interaction model: the walker dispatches from each interaction's `target.kind` plus `gesture`, not from a per-step kind discriminator. Legacy-to-current mapping documented so authors can find their bearings.
  - **Retired `src/content/` paths (Class G)**: `src/content/` -> `content/protocols/` (or `content/scenes/`) in `docs/specs/PROTOCOL_STEPS.md`, `docs/specs/PROTOCOL_YAML_FORMAT.md`, `docs/specs/SCENE_ARCHITECTURE.md`, `docs/specs/SCENE_YAML_FORMAT.md`, `docs/specs/WALKTHROUGH_GUIDE.md`.
  - **Retired `_id` identity in prose (Class H)**: `<object_id>.<subpart_id>` -> `<object_name>.<subpart_name>` in `docs/specs/SCENE_ARCHITECTURE.md`.
  - **`entry:` block contradiction (Class I)**: `docs/specs/PROTOCOL_YAML_FORMAT.md` "Entry block" section rewritten to the canonical flat top-level `entry_step:` field. Dropped the `scene:` and `step:` subkeys entirely; PRIMARY_SPEC.md wins by contract precedence per `docs/PRIMARY_CONTRACT.md`. Validation rules now match the canonical form.
  - **Retired `liquid_*` authored fields (Class J)**: `docs/specs/SCENE_YAML_FORMAT.md` `ObjectStateChange` prose rewritten from `liquid_id` / `liquid_volume` / `held_liquid_id` / `held_liquid_volume` to `contents_name` / `contents_volume` / `held_contents_name` / `held_contents_volume`, consistent with the broader `liquid_*` -> `contents_*` migration completed earlier.
  - **RD-10 runtime drift (Class K)**: `docs/specs/LIQUID_CONVENTION.md` reframed. The "Color Map" section now grounds color sourcing in `contents.yaml` `display_color` instead of `inventory_data.ts:REAGENTS:displayColor` and `style_constants.ts:COLOR_MAP`. The "Game State Integration" and "Rendering in Hood Scene" sections rewritten as an "Authored state model" section that names the canonical `held_contents_name` / `held_contents_volume` / `contents_name` / `contents_volume` authored fields and the `ObjectStateChange` protocol primitive that writes them; runtime-state names (`gameState.heldLiquid`, `gameState.tubeLiquids`, `gameState.plateLiquids`, `addTubeLiquid`) are no longer surfaced as authoring vocabulary. `docs/specs/SCENE_YAML_FORMAT.md` "Gaps not validated today" cross-reference updated from `inventory_data.ts` to `contents.yaml` and the object library.

### Fixes and Maintenance
- `docs/specs/PROTOCOL_YAML_FORMAT.md` generated-TypeScript example (the runtime emit shape) updated to drop retired `colorKey` and to use the renamed `display_color` and `day_name` / `part_name` fields, so the documented emit matches the authored YAML form.

### Removals and Deprecations
- `colorKey` removed from authored `contents.yaml` schema entirely (Class E). Color now derives solely from `display_color`.
- `interactionSequence`, `directTool`, `multipleChoice` removed from WALKTHROUGH_GUIDE normative dispatch description (Class F). These per-step kinds are retired per `docs/PRIMARY_SPEC.md`.
- The `entry:` multi-key block (`entry: { scene:, step: }`) removed from PROTOCOL_YAML_FORMAT.md (Class I). The flat top-level `entry_step:` field is the sole canonical form.
- Bare `name:` retired as an authored YAML field across protocol, step, object, and instrument surfaces (Classes A-D, locked by L1, gated by L2).

### Decisions and Failures
- **Instrument handle merged into `object_name`**: An earlier plan draft introduced `instrument_name` as a fourth scope-specific handle alongside `protocol_name` / `step_name` / `field_name`. Audit of object docs showed that instruments are already objects (instrument set-points live in `state_fields`; there is no separate instrument identity layer). The lock now states "Object identity handle is `object_name` (instruments included)" to avoid a synonym for the same concept and to honor "one canonical term per concept" from `docs/PRIMARY_DESIGN.md`.
- **Class L split into L1 (lock-first) and L2 (gate-last)**: L1 extends `SPEC_DESIGN_CHECKLIST.md` before any content edits so every subsequent class cites a canonical reference. L2 adds the pytest gates after Classes A-K land, so the test suite turns green in the same commit as the final cleanup.
- **`display_color` kept; `colorKey` dropped**: `contents.yaml` retains `display_color` as live authored color metadata for contents. `colorKey` is legacy runtime language with no current authoring use; dropping rather than renaming.
- **G9 table-cell regex requires backticks**: First-cut Markdown table parser flagged glossary tables like `| dispatchInteraction | The adapter's ...`. Tightened the regex to require backticks around the field-name cell (`` | `fieldName` | ``), the documented schema-table convention. Glossary tables (no backticks) stay out of scope.

### Developer Tests and Notes
- `source source_me.sh && pytest tests/test_spec_vocabulary.py -q`: **9 passed in 0.11s** (G1-G9).
- `tests/test_markdown_links.py` failures are pre-existing (unrelated CHANGELOG and FILE_STRUCTURE links); not introduced by this sweep.

## 2026-05-15 (Validator hardening: relational DB, Tier 1 cross-file checks, closure model)

### Additions and New Features
- **`tools/validators/` package**: validator split into modules - `constants.py` (closed sets + finding-tag registry), `findings.py` (Finding + Severity), `database.py` (ContentDatabase relational registry: objects, base_scenes, protocols, contents_by_protocol), `object_validator.py`, `scene_base_validator.py`, `scene_protocol_validator.py`, `protocol_validator.py`, `cross_protocol.py`, `summary.py`, `yaml_io.py`.
- **ContentDatabase lookup methods**: `resolve_object`, `resolve_target` (bare + dotted subpart forms), `resolve_state_field`, `resolve_contents`.
- **Tier 1 cross-file checks** with structured tags emitted by `ProtocolValidator`:
  - `T1_TARGET` - interaction target does not resolve to a declared object or subpart.
  - `T1_STATE_FIELD` - `ObjectStateChange` writes a field not declared on target's `state_fields`.
  - `T1_ENUM` - enum state field receives a value outside the declared `allowed` list.
  - `T1_CONTENTS_REF` - `contents_name` / `held_contents_name` does not resolve to a protocol contents entry.
  - `T1_TARGET_WITH_VALUE` - `target_with_value` payload key not a declared state field on the target.
- **`SCENE_EXTENDS` tag**: protocol scene `extends` lookup against base-scene registry.
- **`CLOSURE` tag**: closed top-level whitelists per container (`OBJECT_ALL_KEYS`, `PROTOCOL_ALL_KEYS`, `BASE_SCENE_ALL_KEYS`, `PROTOCOL_SCENE_ALLOWED_KEYS`). Unknown top-level keys flagged automatically.
- **`T3_CAMELCASE` tag**: general regex `[a-z][A-Z]` flags any camelCase key recursively across loaded YAML; no allow-list.

### Behavior or Interface Changes
- Validator now requires `protocol_name`, `step_name`, `field_name` per `docs/specs/SPEC_DESIGN_CHECKLIST.md` bare-`name:` ban; old bare `name:` keys are flagged via `CLOSURE`.
- `CONTENTS_REQUIRED_KEYS = {label, display_color}`; `colorKey` dropped.
- File-category counts now reflect every file walked, not only files that passed.
- Whole-tree scan walks `content/` only; `tests/content/` fixtures are out of scope.

### Fixes and Maintenance
- Pyflakes clean across `tools/validate_content_yaml.py` and `tools/validators/*.py`.
- All `from typing import ...` purged in favor of bare `dict`, `list`, `tuple`, `set`, `X | None` per `docs/PYTHON_STYLE.md`.
- Replaced repeated `try/except RuntimeError` per file with a single `_load_and_collect` helper.
- `yaml_io.py` catches only `yaml.YAMLError`; other I/O errors propagate.
- `database.subpart_matches` lets `re.error` surface instead of silently swallowing regex errors.
- Removed broad `except Exception` fallback around `Path(__file__).resolve()` in `main()`.
- Removed redundant `import sys as sys_module` and inner `import re as re_module`.
- Wired `BaseSceneValidator.set_object_names(db.objects.keys())` so placement cross-reference check is active.
- Verbose detail printers consolidated in `tools/validators/summary.py`; inline duplicates in `validate_content_yaml.py` removed.

### Removals and Deprecations
- Deleted `RETIRED_OBJECT_KEYS`, `RETIRED_BASE_SCENE_KEYS`, `RETIRED_PROTOCOL_KEYS`, and `BANNED_TOKENS` allow-lists. Replaced by `CLOSURE` + `T3_CAMELCASE`.
- Deleted unused `ContentDatabase.is_enum_value_valid` and `get_all_contents_names` (`ProtocolValidator` performs enum checks inline).
- Deferred `check_contents_drift`; not wired in this pass.

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: **Validated 42 files (34 objects, 1 base scenes, 1 protocol scenes, 6 protocols). 79 failures** - failures are real YAML drift now correctly surfaced for follow-up content cleanup.

## 2026-05-15 (protocol_type vocabulary consolidation)

### Additions and New Features
- **`docs/specs/PROTOCOL_VOCABULARY.md` Protocol kinds section** added: canonical home for protocol package terminology and the allowed `protocol_type` values. New rows in Container Terms for protocol package, protocol type, mini-protocol, sequence runner, and developer smoke. New `protocol_type` slot added to the protocol-level slot charters table; new closed-enum row added to the cost-guardrail table.
- **`docs/specs/PROTOCOL_YAML_FORMAT.md` top-level protocol-fields table** added with the `protocol_type` enum row and a worked YAML example.

### Behavior or Interface Changes
- **Field renamed: `protocolType` -> `protocol_type`** across normative docs (`docs/PRIMARY_DESIGN.md`, `docs/PRIMARY_SPEC.md`, `docs/specs/PROTOCOL_*.md`, `docs/active_plans/*.md`), content YAML (`content/protocols/*/protocol.yaml`), runtime contract (`src/scene_runtime/contract.ts`), validator and builder (`tools/validate_content_yaml.py`, `tools/build_protocol_data.py`), tests (`tests/test_protocol_entry_no_hood_default.py`), and Playwright fixtures (`tests/playwright/fixtures/*/protocol.mjs`). Aligns with the snake_case authored-field rule from `SPEC_DESIGN_CHECKLIST.md` Author YAML vocabulary lock.
- **Terminology surfaces trimmed to pointers**: `docs/specs/PROTOCOL_AUTHORING_GUIDE.md` "Terminology" section, `docs/PRIMARY_DESIGN.md` "Protocol and mini-protocol hierarchy" section, and `docs/PRIMARY_SPEC.md` "Protocol types" section now link into `PROTOCOL_VOCABULARY.md#protocol-kinds` instead of redefining the kinds independently.
- **Friendly-label paragraphs absorbed**: `PRIMARY_DESIGN.md` and `PRIMARY_SPEC.md` "Sequence runners and friendly terminology" sections removed; the "may be rendered as 'full protocol'" note now lives inside the canonical Sequence runner definition in `PROTOCOL_VOCABULARY.md`.

### Removals and Deprecations
- **Retired `protocol_type` value: `protocol`.** Active enum is now `{mini_protocol, sequence_runner, dev_smoke}` (`tools/validate_content_yaml.py` `PROTOCOL_TYPES`). The audit confirmed no in-tree content declared the retired value; no reclassification was required. The bare word "protocol" is no longer a formal kind or enum value, but it remains valid in structural contexts (`protocol.yaml`, protocol package, protocol-level field, `protocol_type` field name).
- **Retired field name: `protocolType`.** The camelCase form has no validator special case; an authored file that uses it fails the existing missing-required-key and unknown-extra-key checks. Historical changelog entries and archived planning docs that reference the old name are preserved (per REPO_STYLE "entries are never removed").

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: validator runs clean across the migrated `content/protocols/*/protocol.yaml` set after the rename.

## 2026-05-15 (M2 Wave 2a: five mini-protocols + 25 objects - sorted-snacking-kettle)

### Additions and New Features
- **25 new shared objects** under `content/objects/`: liquid-bearing (serological_pipette, conical_15ml, multichannel_pipette, micropipette, carboplatin_stock_bottle, metformin_stock_bottle, dmso_bottle, mtt_vial, sterile_water_bottle, microtube_15ml_intermediate, metformin_working_tube), structured (conical_15ml_rack, well_plate_96, dilution_tube_rack_8, hemocytometer), equipment (centrifuge, incubator, microscope, plate_reader, vortex, water_bath, micropipette_tip_box, professor_avatar), waste (biohazard_decant, sharps_container), plus `t75_flask_new` for passage workflow.
- **Five new mini-protocols** under `content/protocols/`: `drug_dilution_setup` (8 steps), `plate_drug_treatment` (7 steps), `cell_counting_and_seeding` (9 steps), `mtt_assay_readout` (7 steps), `cell_culture` (9 steps). All conform to two-level step/interaction model, closed gesture set, ratified `scene_operation` primitives, and 6-10 step gate.

### Behavior or Interface Changes
- **Cross-protocol contents standardization**: `cell_suspension` displayColor canonicalized to `#d89bb8`; `media` label canonicalized to "Complete RPMI media"; `trypsin` label canonicalized to "Trypsin-EDTA 0.25%".

### Fixes and Maintenance
- **Schema conformance fixes** applied across Wave 2a: vortex `running` field name; PDT parts/days `id`/`label` schema; well_plate_96 subpart addressing (A1..H12); contents_name enum alignment; TimedWait `duration_min`/`display` field names; hemocytometer flat state_fields addressing; aspirate_and_wash T-9 split.

### Developer Tests and Notes
- `source source_me.sh && python3 tools/validate_content_yaml.py`: **Validated 42 files (34 objects, 1 base scenes, 1 protocol scenes, 6 protocols). 0 failures.**

## 2026-05-15 (spec vocabulary consolidation sweep - cheeky-popping-hartmanis)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` extended**: New "Author YAML vocabulary lock" section codifies the closed authored-YAML surface, the identity tuple `(object_name, kind, label)`, the snake_case authored-field rule, the scene-placement override surface restricted to layout hints, and the `contents_container` rename.
- **`tests/test_spec_vocabulary.py` (new)**: Grep-gate test enforces vocabulary closure across `docs/specs/*.md` and `docs/PRIMARY_*.md`. G1-G4 hard-assert zero occurrences of retired tokens (`short_label`/`shortLabel`, `element_id`/`elementId`, `render_map`, `inventory_ref`/`inventoryRef`, `liquid_container`, camelCase YAML field references). G5-G6 are informational sweeps for residual drift.

### Behavior or Interface Changes
- **Spec sweep across `docs/specs/*.md` and `docs/PRIMARY_*.md`** (M2.W1-W7): Object, scene, protocol, layout-engine, liquid, SVG, and PRIMARY trio surfaces normalized to the locked vocabulary.
- **Identity tuple locked**: Object identity expressed exclusively as `(object_name, kind, label)`; legacy `short_label` and `element_id` references retired from normative spec text.
- **Scene-placement override surface locked**: Authored scene placements may override layout hints only; identity fields are not overridable at placement time.
- **Authored YAML enforced as snake_case**: `docs/specs/LAYOUT_ENGINE.md` and `docs/specs/SCALING_MODEL.md` camelCase authored-field references renamed to snake_case form.
- **`liquid_container` -> `contents_container` rename completed** across normative spec text (consistent with the broader `liquid_*` -> `contents_*` migration).
- **PRIMARY trio cross-links to the lock section added**: `docs/PRIMARY_CONTRACT.md`, `docs/PRIMARY_DESIGN.md`, and `docs/PRIMARY_SPEC.md` now point to the Author YAML vocabulary lock section in `docs/specs/SPEC_DESIGN_CHECKLIST.md`.

### Fixes and Maintenance
- **Dead-link cleanup** in `docs/CHANGELOG.md` and `docs/CHANGELOG-2026-05a.md`: historical `content/plate_drug_treatment/*.yaml` and `content/cell_culture/{items,reagents}.yaml` link wrappers rephrased to bare backticked paths (per REPO_STYLE "entries are never removed, may be rephrased for accuracy and clarity"). The underlying historical text is unchanged; only the broken hyperlink wrappers are removed because those paths were retired by the 2026-05-15 vocabulary closure.
- **`docs/FILE_STRUCTURE.md` "Where to add new work" table trimmed** of the `content/protocols/`, `content/objects/`, and `content/scenes/` rows pending layout settling. Content directories still exist on disk; the table rows return when the layout stabilizes.

### Removals and Deprecations
- **Deleted retired-terms tables** from `docs/specs/OBJECT_VOCABULARY.md`, `docs/specs/SCENE_VOCABULARY.md`, `docs/specs/SCENE_YAML_FORMAT.md`, and `docs/specs/PROTOCOL_VOCABULARY.md` (no quarantine doc; closure is enforced by `tests/test_spec_vocabulary.py`).
- **Retired tokens removed from normative spec text**: `short_label` / `shortLabel`, `element_id` / `elementId`, `liquid_color` as authored state, `render_map`, `inventory_ref` / `inventoryRef`, scene-placement `label` overrides, and all camelCase YAML field references.
- Removed `scene_kind` field from authored scene YAML and validator; `workspace` is the sole identity field.

### Decisions and Failures
- **D1 resolved**: `shortLabel` is fully retired in normative spec text regardless of any runtime residue. Runtime cleanup is tracked separately and is not a blocker for the spec lock.
- **D2 resolved**: `scene_kind` removed entirely. It duplicated `workspace` as the identity field. Footprint was 4 locations (SCENE_INHERITANCE.md locked-field row, hood_basic.yaml usage, validator optional-keys set, this changelog entry).

### Developer Tests and Notes
- `source source_me.sh && pytest tests/test_spec_vocabulary.py -q`: **6 passed in 0.08s** (G1-G6).

## 2026-05-15 (vocabulary audit sweep: retired-terms inventory and spec-consistency gates - WP-F1)

### Additions and New Features
- **`docs/specs/SPEC_DESIGN_CHECKLIST.md` extended**: Added four new checklist smell classes with examples and severity labels covering vocabulary drift:
  - RD-10 (semantic vs runtime): Flag authored YAML that uses runtime implementation terms (prefixes, coordinates, element names, internal state names) instead of semantic author vocabulary (object_name, scene_name, contents_name).
  - RD-13 (layer boundaries): Flag author vocabulary that mixes protocol layer (intent), object layer (state and visual), and scene layer (placement and geometry). Protocol must not name assets; scene must not name protocol steps; object must not read protocol sequencing.
  - RD-14 (closed visual variants): Objects declare closed `visual_states` enumeration only; no generic `render_map`, `render_config`, templating, expressions, or metadata escape hatches.
  - RD-15 (retired-terms closure): Sweepable audit table with fifteen retired-term renames and seven retired-field removals, guarded in examples and new authoring.
- **Retired-terms closure table (SPEC_DESIGN_CHECKLIST.md RD-15)**: Fifteen author-YAML renames documented as ratified migrations (liquid_id -> contents_name, object_id -> object_name, render_map -> visual_states, etc.). Seven retired authored fields documented as removed (element_id, liquid_color authored separately, inventory_ref, items.yaml, reagents.yaml, src/content/<protocol>/). Enables systematic sweep validation in future spec audits.

### Behavior or Interface Changes
- **Author-YAML semantic renaming (vocabulary closure WP-F1)**: Author-written YAML migrates from runtime-oriented naming to semantic author vocabulary:
  - liquid-state fields: `liquid_id` / `held_liquid_id` -> `contents_name` / `held_contents_name` (reflects semantic scope: reagents, waste, media, cells, mixtures, suspensions, drugs).
  - volume fields: `liquid_volume` / `held_liquid_volume` -> `contents_volume` / `held_contents_volume`.
  - identity fields: `object_id` -> `object_name`, `scene_id` -> `scene_name`, `placement_id` -> `placement_name`, `subpart_id` -> `subpart_name`, `step_id` -> `step_name`, `protocol_id` -> `protocol_name`, `part_id` -> `part_name`, `day_id` -> `day_name` (closure: all identity fields use _name suffix, not _id).
  - asset identity: `asset_id` -> `asset_name`, `overlay_id` -> `overlay_name` (consistency with subparts and elements).
  - rendering surface: `render_map` -> `visual_states` (emphasizes closed enumeration, not generic template or expression engine).
- **Authoring layout restructure**: Authored content relocates from protocol-centric `src/content/<protocol_name>/` to multi-layer organization under `content/`: protocols to `content/protocols/<protocol_name>/{protocol.yaml, contents.yaml, scenes/}`, shared objects to `content/objects/`, shared scenes to `content/scenes/`.
- **Contents registry unification**: `items.yaml` and `reagents.yaml` consolidated into `contents.yaml` reflecting unified semantic scope (reagents, waste, media, cells, mixtures, suspensions, drugs, not separate item/reagent categories).

### Removals and Deprecations
- **Dropped authored fields**: `element_id` (runtime derives mount identifier as `${scene_name}-scene`); `liquid_color` as authored state field (color derived from `contents_name` via object `visual_states`); scene-placement `label` / `short_label` overrides (use scene-global naming); `inventory_ref` (inventory external to author YAML).
- **Retired authored files**: `items.yaml`, `reagents.yaml` (merged into `contents.yaml`).
- **Retired path structure**: `src/content/<protocol_name>/` (moved to `content/protocols/<protocol_name>/`).
- **Retired rendering surface**: `render_map` (replaced by closed `visual_states` enumeration; no generic template, expression, or metadata-blob rendering engine).

## 2026-05-15 (scene_object_split: three-vocabulary model close-out - WP-EV1 through WP-DOC-C1)

### Additions and New Features
- **`docs/OBJECT_VOCABULARY.md` (new)**: Canonical object vocabulary
  defining object identity, structured surfaces and subparts (wells in
  plates, lanes in gels, slots in racks), the `state_fields` schema
  (flat primitive types per RD-11), the `render_map` (state-value to
  visual asset), the closed `capabilities` list per RD-6, and layout
  hints. Establishes that the object owns the state-to-visual map and
  all SVG manipulation; the protocol sets semantic state and the
  object resolves the asset.
- **`docs/OBJECT_YAML_FORMAT.md` (new)**: Canonical object-definition
  YAML schema with every field typed and worked examples (96-well
  plate, serological pipette). Encodes the closed per-type constraint
  metadata per RD-12 and the small closed `render_map` formula token
  set per RD-7 (unknown tokens = build error).
- **`docs/SPEC_DESIGN_CHECKLIST.md`**: New permanent checklist
  promoting the design philosophy that emerged during this plan
  (vocabulary closure, anti-drift, evidence-gated additions). Used by
  future spec edits to keep canonical docs internally consistent.
- **`docs/active_plans/scene_object_split_inventory.md` (new)**:
  Consolidated evidence artifact -- every `items[]` sub-field across
  current scene YAML files tagged object-identity vs placement, every
  scene-YAML top-level key tagged, every `src/asset_specs.ts` entry
  with its property names, the runtime liquid-state model, the
  ratified `scene_operation` primitive set with current layer, plus
  the M3 ratification and gap matrices.
- **`docs/active_plans/scene_object_split_design.md` (new)**: Working
  design doc for the three-vocabulary model -- object section, cleaned
  scene section, three-way boundary with per-key assignment table, and
  the protocol-side `ObjectStateChange` plus `SvgSwap` reclassification.
- **Three follow-on plan stubs in `docs/active_plans/`**: New stubs
  for the next stages of work --
  [content_yaml_migration_plan.md](archive/content_yaml_migration_plan.md),
  [typescript_migration_plan.md](active_plans/typescript_migration_plan.md),
  and [docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md).
  Each names inputs, targets, first decision or risk, and out-of-scope
  boundaries; full plans land when an owner picks one up.

- **Two-level step/interaction model**: Reworked
  `docs/active_plans/unified_interaction_vocabulary_design.md` from the
  superseded flat `target + mode + action` first-pass draft into a two-level
  model. A `step` owns an ordered `sequence` of `interaction` entries, so one
  step can span multiple gestures (for example, "wash the flask with 4 mL PBS"
  is one step, three gestures).
- **Step slots defined**: A `step` has six slots: `name` (stable snake_case
  identifier), `prompt`, `sequence` (ordered list of interactions),
  `step_validator`, `outcome` (the `on_success` / `on_failure` mapping), and
  `next_step`. In the tightened model `sequence` order is always meaningful;
  there is no unordered mode.
- **Naming and ordering rules**: Protocol flow is explicit through
  `next_step`, which names the next step by its `name`; flow is never inferred
  from YAML file order. `step_index` is display-only and carries no flow
  meaning.
- **Interaction slots defined**: Each `interaction` has exactly four slots: a
  `target` (an addressable semantic named scene object that declares its
  `kind`, so the kind carries task semantics and no separate task-type slot is
  needed), a `gesture` (`click` / `drag` / `adjust` / `select` / `type`, where
  `adjust` is the skill-based continuous set-point gesture), a `validator`
  (checks one gesture on one target), and a `response`. In the tightened model
  the interaction carries no `name` slot; the optional snake_case `name` is
  deferred until evidence shows interactions need naming.
- **`response` container defined**: The per-interaction `response` container
  holds post-validation system behavior: an ordered `scene_operations` list of
  typed primitives plus an optional `feedback` block structured into `correct`
  / `incorrect` messages. In the tightened model `response` has exactly those
  two fields; state change is explicit through a `scene_operation` mutation
  only -- there is no `state_update` field.
- **Initial six `scene_operation` typed primitives**: The first WP-SOP1 pass
  ratified `SvgSwap`, `ColorChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, and `LiquidDisplayChange`, each specified with typed fields to
  a durable-primitive standard. `LiquidDisplayChange` is first-class because it
  tracks liquid quantity and well-contents state. WP-STA1 and the WP-SOP1
  follow-up later grew the ratified set to eight by adding `TimedWait` and
  `SetPointDisplayChange` (see the WP-STA1 and WP-SOP1 follow-up lines below).
- **Domain-verb mechanism and cost guardrail**: Added a domain-verb mechanism
  of named compositions that expand at the interaction level to one
  interaction or at the step level to a whole sequence plus `step_validator`,
  with no hidden state change. A cost guardrail keeps domain verbs cheap while
  new `gesture` values and new `scene_operation` primitives are expensive and
  evidence-gated.
- **`protocol` level added (WP-STA1)**: Added a `protocol` level above `step`
  with three slots: `name` (stable snake_case identifier), `entry_step` (names
  the first step the runtime runs), and `steps` (the list of steps; list order
  is reading convenience, never flow). The level exists so protocol flow has a
  defined start instead of an implied file-order first step.
- **Named-preset validator system and preset library (WP-STA1)**: The
  interaction `validator` and the `step_validator` are now named presets with
  typed parameters (`{ preset: <name>, ...params }`); content creators select
  from a documented library and never write custom validation logic. The
  initial library has three interaction presets (`correct_target`,
  `correct_choice`, `target_with_value`) and two step presets
  (`sequence_complete`, `final_state_matches`). A new preset requires
  ratification evidence under the cost guardrail.
- **`outcome` mapping defined (WP-STA1)**: The step `outcome` is the simple
  two-key mapping `{ on_success: complete, on_failure: retry }`, where `retry`
  restarts the whole step and the entire `sequence` resets. `outcome` never
  carries an `advance` value; advancing is `next_step`'s job. The mapping shape
  absorbs future keys without a redefinition.
- **`TimedWait` seventh `scene_operation` primitive (WP-STA1)**: Ratified
  `TimedWait` with typed fields `type`, `target`, `duration_min`, and
  `display`. It runs a timed phase on a piece of equipment with a visible
  progress display, covering incubation, centrifugation, staining, destaining,
  and timed equipment runs. It is a `scene_operation` inside a `response`, not
  a special step type, closing the timed-wait residual gap.
- **Runtime state model, event-emission rule, and event naming (WP-STA1)**:
  Defined the named, non-positional runtime state the validator presets read
  (held material, target contents, set-point values, equipment state, phase
  state, object appearance), the rule that the runtime emits events on state
  transitions, and a single snake_case event-naming convention
  (`<step_name>_complete`, `<equipment_name>_elapsed`) that replaces the legacy
  `completionEvent` inconsistency. Event names are derived, not hand-authored.
- **Pedagogy-first rule (WP-PED1)**: Added the rule that an author chooses each
  interaction's `target` (and its `kind`) and its `gesture` to teach the
  specific lab skill the step is about -- the shape of an interaction is a
  pedagogical decision, not just a UI decision. Includes worked `click` and
  `adjust` examples showing the skill each teaches. This is the standard M3
  ratification checks each interaction against.
- **`SetPointDisplayChange` eighth `scene_operation` primitive (WP-SOP1
  follow-up)**: Ratified `SetPointDisplayChange` with typed fields `type`,
  `target` (a configured display target such as `pipette_volume_display` or
  `power_supply_display`), and `value` (a mapping such as `{ volume_ml: 4 }` or
  `{ voltage_v: 150 }`). It names the visible change an `adjust` gesture
  causes, giving the "set-point values" runtime state row a primitive that
  writes it (OQ-21). `ColorChange`, `LiquidDisplayChange`, and
  `SetPointDisplayChange` form a loose conceptual `DisplayChange` family -- a
  clarifying note only, not a nested taxonomy; the eight primitives stay a flat
  set.
- **Scene-vs-protocol boundary rule and slot-by-slot ownership map (WP-BND1)**:
  Added the quotable boundary rule -- the protocol vocabulary names no plate,
  well, tube, gel, column, lane, rack, or coordinate; the scene adapter owns
  all geometry, target expansion, and gesture rendering -- plus a slot-by-slot
  ownership map (protocol-owned / scene-owned / shared) across the `protocol`,
  `step`, `interaction`, and `response` slots. Protocol YAML is geometry-free.
- **Target-resolution mechanism (WP-BND1, OQ-16)**: Resolved how a protocol
  `target` resolves to a scene object: an adapter registry maps each semantic
  `target` name to a concrete scene object, and grouped targets (a row of
  wells, a tube rack, a set of gel lanes) are named groups defined in the scene
  YAML. The protocol writes `target: row_b`; the scene YAML defines the `row_b`
  group. All group membership and target expansion live on the scene side,
  which retires `plateTargets` and `tubeTargets`.
- **M3 ratification passed across all four source protocols**: Checked the
  two-level step/interaction model against 120 steps spanning OVCAR8, the 7
  shipped `content/*/protocol.yaml` files, Miraculin, and SDS-PAGE. Every step
  maps cleanly onto the ratified `protocol -> step -> interaction -> response`
  model with the eight `scene_operation` primitives and the named-preset
  validators. No M2 design revision was forced by the ratification pass.
- **M4 canonical-doc rewrites**:
  `docs/PROTOCOL_VOCABULARY.md` and
  `docs/SCENE_VOCABULARY.md` were fully rewritten to the
  ratified two-level model. WP-DOC-D1 aligned 10 dependent docs to the same
  model: `docs/PROTOCOL_YAML_FORMAT.md`,
  `docs/PROTOCOL_STEPS.md`,
  `docs/PROTOCOL_AUTHORING_GUIDE.md`,
  `docs/SCENE_YAML_FORMAT.md`,
  `docs/SCENE_ARCHITECTURE.md`,
  `docs/CODE_ARCHITECTURE.md`,
  `docs/FILE_STRUCTURE.md`,
  `docs/LAYOUT_ENGINE.md`,
  `docs/LIQUID_CONVENTION.md`, and
  `docs/WALKTHROUGH_GUIDE.md`.
  `docs/SVG_PIPELINE.md` was also audited under WP-DOC-D1
  and found to contain no interaction-model vocabulary, so it needed no
  alignment (audited-clean, not skipped). As a follow-on primary-doc pass,
  `docs/PRIMARY_SPEC.md` and
  `docs/PRIMARY_DESIGN.md` were reconciled to the
  ratified model as well (see the Decisions and Failures entry below).
- **`target_groups` schema section added to SCENE_YAML_FORMAT.md**: Documents
  the named-group schema (a row of wells, a tube rack, a set of gel lanes) that
  the scene YAML defines and the protocol `target` resolves against. Group
  membership and target expansion live entirely on the scene side.
- **Adapter-registry section added to SCENE_ARCHITECTURE.md**: Documents the
  registry that maps each semantic `target` name to a concrete scene object,
  the resolution mechanism ratified under WP-BND1 / OQ-16.
- **`docs/specs/SCENE_INHERITANCE.md` (new)**: Canonical scene-inheritance
  policy defining the three-layer asymmetry (objects canonical-by-id with no
  extends; protocols spec-shaped with no template layer; scenes shallow-extends
  with closed four-operation mutation surface). Establishes one-level depth
  maximum per protocol scene file, base-scene residence in `content/scenes/`,
  protocol-scene location under `content/protocols/<name>/scenes/`, and the four
  named operations (`add_placements`, `reposition_placements`,
  `deactivate_placements`, `remove_placements`). Includes the promotion rule: a
  base scene moves into `content/scenes/` when expected to serve multiple
  protocols or represents a stable workspace contract.
- **`docs/active_plans/scene_inheritance_migration.md` (new)**: Deferred
  content-side migration stub owning the folder-layout reshape, base-scene
  extraction, conversion of per-protocol `scene.yaml` files to `extends:` form,
  static scene-graph validator, and supporting-pipeline updates. Identifies six
  seed base scenes (bench_basic, hood_basic, plate_reader_basic,
  microscope_workspace_basic, well_plate_workspace_basic,
  centrifuge_workspace_basic) and current migration candidates.

### Behavior or Interface Changes
- **Scene-inheritance policy ratified; five dependent specs updated**: Ratified
  the three-layer scene-inheritance model in
  [specs/SCENE_INHERITANCE.md](specs/SCENE_INHERITANCE.md) with one-level depth,
  four named mutation operations, and a promotion rule. Updated five dependent
  spec docs: [specs/SCENE_YAML_FORMAT.md](specs/SCENE_YAML_FORMAT.md) (Inheritance
  section with four-operation schema), [specs/OBJECT_VOCABULARY.md](specs/OBJECT_VOCABULARY.md)
  (no-extends subsection), [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md)
  (no-template subsection), [specs/SPEC_DESIGN_CHECKLIST.md](specs/SPEC_DESIGN_CHECKLIST.md)
  (seven anti-drift smell classes), and [specs/SVG_PIPELINE.md](specs/SVG_PIPELINE.md)
  (Deactivated placements section). All five docs remain backward-compatible with
  current code; migration is deferred to the scene-inheritance migration plan.
- **Self-contained spec cleanup**: Stripped temporary-plan citations
  (RD-N codes, M0..M3 milestone references, WP-* work-package codes),
  archive/active_plans links, and `current-code` / `target-state` /
  `for now` / `previously` / `eventually` transitional wording from
  every file under `docs/specs/` plus `docs/PRIMARY_SPEC.md` and
  `docs/PRIMARY_DESIGN.md`. The spec set now reads as a single
  ratified normative surface; historical justification stays in
  `docs/archive/` and `docs/active_plans/` for anyone wanting it.
  Plan: out-of-tree, not in the repo tree.
- **docs/specs/ expanded by 7 more docs (Patch 3 of docs reorg plan)**:
  Seven additional spec-surface docs `git mv`'d into `docs/specs/`:
  `LAYOUT_ENGINE.md`, `LIQUID_CONVENTION.md`, `SCALING_MODEL.md`,
  `SPEC_DESIGN_CHECKLIST.md`, `SVG_PIPELINE.md`,
  `TARGET_FILE_STRUCTURE.md`, `WALKTHROUGH_GUIDE.md`. 142 markdown link
  errors closed: inbound references rewritten across all callers via
  the same Patch-2 migration script (expanded target list to 17);
  outbound `specs/X.md` and `../X` forms inside the moved files
  repointed to bare-sibling and `../../X` respectively. Two pre-existing
  broken-image references in `docs/archive/FLASK_DESIGN_REVIEW.md` and
  one nonexistent `images/` row in [FILE_STRUCTURE.md](FILE_STRUCTURE.md)
  removed per RD-G (target file or directory does not exist;
  surrounding text preserved). `AGENTS.md` "Core rules" and "Where to
  find things" inline path strings updated for `LIQUID_CONVENTION.md`
  and `SPEC_DESIGN_CHECKLIST.md`. `pytest tests/test_markdown_links.py`
  and `pytest tests/test_ascii_compliance.py` both pass.
- **docs/specs/ folder added; 10 spec docs relocated (Patch 2 of docs reorg plan)**:
  Created `docs/specs/` and `git mv`'d the ten specification-surface docs into
  it: all four `PROTOCOL_*` (`PROTOCOL_AUTHORING_GUIDE.md`, `PROTOCOL_STEPS.md`,
  `PROTOCOL_VOCABULARY.md`, `PROTOCOL_YAML_FORMAT.md`), all three `SCENE_*`
  (`SCENE_ARCHITECTURE.md`, `SCENE_VOCABULARY.md`, `SCENE_YAML_FORMAT.md`),
  both `OBJECT_*` (`OBJECT_VOCABULARY.md`, `OBJECT_YAML_FORMAT.md`), and
  `QTI_v3_SPEC.md`. `PRIMARY_*` docs, style docs, test docs, and architecture
  docs (`CODE_ARCHITECTURE.md`, `FILE_STRUCTURE.md`, `LAYOUT_ENGINE.md`,
  `LIQUID_CONVENTION.md`, `SVG_PIPELINE.md`, etc.) stay at root by design --
  `docs/specs/` admits only formal specification surfaces (project-native plus
  external standards reference). All inbound markdown links rewritten in the
  same patch via a one-shot Python migration script; outbound links inside
  the moved files repointed to repo-root and `docs/`-sibling locations with
  one extra `../`. `AGENTS.md` "Required reading" and "Where to find
  things" sections updated. `CLAUDE.md` was simultaneously trimmed to
  only the three `@docs/PRIMARY_*.md` import lines (length-reduction
  pass); the previous PROTOCOL_*, SCENE_*, OBJECT_*, and style/test
  `@`-imports were dropped from the manifest. `pytest tests/test_markdown_links.py` and
  `pytest tests/test_ascii_compliance.py` both pass. Plan source:
  [archive/docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md).
- **`docs/SCENE_VOCABULARY.md` rewritten**: Now defines only scene-side
  terms (placement, zones, object reference, background per RD-1).
  Object-identity terms moved out and pointed at OBJECT_VOCABULARY.md.
  The old fused `items[]` model is no longer the canonical authoring
  surface; target-state and current-code sections clearly labeled.
- **`docs/SCENE_YAML_FORMAT.md` rewritten**: Documents the cleaned
  scene YAML schema (object references plus placement). Adds a
  migration note pointing at the content/scene-YAML-migration follow-on
  plan for keys now owned by object YAML.
- **`docs/PROTOCOL_VOCABULARY.md` re-touched**: Reclassified four
  primitives -- `SvgSwap`, `ColorChange`, `LiquidDisplayChange`, and
  `SetPointDisplayChange` -- out of the protocol-level
  `scene_operation` set into the object/render layer. Added
  `ObjectStateChange` as the semantic primitive that sets declared
  object `state_fields` (per RD-8: target a named state field, value
  must match the field's declared primitive type, validator rejects
  unknown fields and type-mismatched values). The retired-terms section
  and the primitive list updated; the ratified protocol-level primitive
  count is five (`ObjectStateChange`, `CursorAttach`, `SceneChange`,
  `LayoutMove`, `TimedWait`). No other part of the M4-closed
  protocol model was changed.
- **`docs/PRIMARY_DESIGN.md` "Vocabulary closure and anti-drift"
  section**: Permanent design philosophy promoted from the working
  design doc -- vocabulary terms are closed sets ratified against real
  inputs; new terms require evidence and an explicit vocabulary edit;
  unknown tokens are build errors, not silent drift.
- **Dependent doc alignment**: `SCENE_ARCHITECTURE.md`, `LAYOUT_ENGINE.md`,
  `LIQUID_CONVENTION.md`, `PROTOCOL_AUTHORING_GUIDE.md`,
  `PROTOCOL_YAML_FORMAT.md`, `CODE_ARCHITECTURE.md`, `FILE_STRUCTURE.md`,
  and `PRIMARY_SPEC.md` all updated to point at OBJECT_VOCABULARY.md /
  OBJECT_YAML_FORMAT.md, reflect the cleaned scene scope, and remove
  fused-format wording. No transitional notes left in the canonical
  path.
- **Model tightened to a linear protocol spec (WP-STA1)**: A course-correction
  tightened the model to a tight linear protocol spec. It adds the `protocol`
  level, drops `sequence_mode` (sequence order is always meaningful), drops the
  optional interaction `name` (deferred), drops `state_update` from `response`
  (`response` is `scene_operations` plus optional `feedback`), and defers
  complex branching (`outcome` stays the simple `{ on_success, on_failure }`
  mapping). The tight model is `protocol -> step(name, prompt, sequence,
  step_validator, outcome, next_step) -> interaction(target, gesture,
  validator, response) -> response(scene_operations[], feedback?)`.
- **`LiquidDisplayChange.operation` set settled (WP-STA1)**: The
  `LiquidDisplayChange` operation set settled to `hold` (tool-carried
  contents), `set` (direct absolute assign; empty a tool or vessel via
  `volume_ml: 0`), and `add` (a destination transfer). The earlier `fill`
  operation is renamed `add`, and the earlier `empty` is expressed as `set`
  with `volume_ml: 0`.

### Fixes and Maintenance
- **docs/ link repair after protocols/ move (Patch 1 of docs reorg plan)**:
  Rewrote 13 broken markdown links left over from the in-flight `git mv`
  of five protocol-content docs into `docs/protocols/`. Touched
  [docs/CHANGELOG-2026-05b.md](CHANGELOG-2026-05b.md) (6 link rewrites
  pointing OVCAR8 references at `protocols/`),
  [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) (3 rewrites for OVCAR8 +
  VOSS_DILUTIONS_GUIDE), [docs/USAGE.md](USAGE.md) (1 OVCAR8 reference),
  [docs/archive/protocol_interaction_inventory.md](archive/protocol_interaction_inventory.md)
  (2 `../protocols/` rewrites for Miraculin and SDS-PAGE), and
  [docs/archive/2026-04-09-scene-layout-engine.md](archive/2026-04-09-scene-layout-engine.md)
  (1 stale superpowers/specs link repointed at the design doc's new
  sibling location in `docs/archive/`; pre-existing failure flagged in
  the same report). `pytest tests/test_markdown_links.py` and
  `pytest tests/test_ascii_compliance.py` both pass. See the docs
  reorganization plan [docs/archive/docs_folder_organization_plan.md](archive/docs_folder_organization_plan.md)
  for context; Patch 2 of that plan will create `docs/specs/`.
- **Unified interaction vocabulary plan marked closed**: Added a
  `Plan status: closed` section to
  [docs/archive/unified_interaction_vocabulary_plan.md](archive/unified_interaction_vocabulary_plan.md)
  and flipped 10 rollout-checklist boxes to checked. The plan's M1-M4 work
  (canonical doc rewrites, dependent-doc alignment, primary-doc reconcile,
  4-pass audit, final terminology gate) was already complete and committed
  earlier; this was stale plan-file bookkeeping only. The human-review gate
  checkbox was left unchecked because it is a human-only gate.
- **Markdown link sweep**: Converted 161 broken markdown links flagged by
  `tests/test_markdown_links.py` into backticked inline code spans. The broken
  links pointed at historical files (deleted code paths, old changelog refs,
  pre-`src/scene_runtime/` filenames, line-number-suffixed paths) where a real
  link target no longer exists; backticking preserves the historical text while
  satisfying the GitHub-browsable-link rule. Touched `docs/CHANGELOG.md`,
  `docs/CHANGELOG-2026-05a.md`, `docs/CHANGELOG-2026-05b.md`,
  `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`, `docs/QTI_v3_SPEC.md`,
  `docs/SCENE_ARCHITECTURE.md`, `docs/SCENE_VOCABULARY.md`, `docs/TODO.md`,
  `docs/USAGE.md`, `docs/WALKTHROUGH_GUIDE.md`,
  `docs/active_plans/unified_interaction_vocabulary_plan.md`, and several
  `docs/archive/` files. `pytest tests/test_markdown_links.py` now passes.

### Removals and Deprecations
- **Archived 4 stale plan files**: Moved four superseded plan files from
  `docs/active_plans/` to `docs/archive/` with `git mv`:
  `focused_well_plate_workspace_plan.md` and
  `well_plate_workspace_pause_note.md` (paused 2026-05-12, superseded by the
  Fresh Refactor Plan), `protocol-step-vocab-refinement-plan.md` (superseded by
  the unified interaction vocabulary plan), and `scene_runtime_doc_conflicts.md`
  (superseded M0 audit, already annotated by WP-DOC-C1). References to the old
  paths in `scene_runtime_spine_plan.md`,
  `2026_May_13-Fresh_Refactor_Plan.md`, and
  `unified_interaction_vocabulary_plan.md` were left as-is because they are plan
  steps that anticipate the archival.

### Decisions and Failures
- **RD-1 (background = backdrop)**: A scene background is a static
  backdrop declared in scene YAML; clickable regions are objects
  placed over the background, not properties of the background.
- **RD-2 (instance overrides bounded)**: A scene placement may
  override an object's `label` and layout hints only; identity,
  `state_fields`, `render_map`, and `capabilities` stay object-owned.
- **RD-3 (`ColorChange` to render layer)**: `ColorChange` lives in
  the object/render layer alongside `SvgSwap`. The single exception
  is a future protocol primitive when color itself is the learning
  target (a colorimetric reading); that primitive is its own slot,
  not generic `ColorChange`.
- **RD-4 (subparts belong to the object)**: Wells, lanes, rack
  slots, and similar internal structure are declared by the object,
  not by the scene. The named-groups portion of the original RD-4
  was superseded by RD-9.
- **RD-5 (no fixed asset / scene counts in canonical docs)**: Counts
  belong in the inventory artifact, not in plan prose or canonical
  docs. "31 / every entry" wording replaced with "every current
  `src/asset_specs.ts` entry" and similar across all canonical docs
  and the parent plan.
- **RD-6 (`capabilities` is a closed list)**: Initial closed set --
  `clickable`, `liquid_container`, `instrument_with_setpoint`,
  `structured_surface`, `cursor_attachable`, `decoration_only`.
  `decoration_only` mutually exclusive with the others. Adding a
  capability requires an explicit vocabulary edit.
- **RD-7 (`render_map` formula language is a small closed token
  set)**: No prose formulas. Closed token set defined in
  OBJECT_YAML_FORMAT.md. Unknown tokens = build error.
- **RD-8 (`ObjectStateChange` only sets declared `state_fields`)**:
  No arbitrary nested writes. Target a named state field; value must
  match the field's declared primitive type. Validator rejects
  unknown fields and type-mismatched values.
- **RD-9 (drop `target_groups` from initial vocabulary)**: Protocols
  list explicit subparts (`treatment_plate.A1`, `treatment_plate.A2`,
  ...). Named groups deferred until real authoring pain appears.
  Supersedes the named-groups portion of RD-4.
- **RD-10 (`LayoutMove` stays narrow)**: Move an existing placement
  only -- row-to-row reposition handled by the layout engine, plus
  cross-scene transitions (remove from one scene, add to another).
  The layout engine owns the visible motion; `LayoutMove` names what
  moves and where.
- **RD-11 (state-field types are flat primitives only)**: Allowed
  types -- `enum`, `int`, `float`, `bool`. No `string` (use `enum`
  with a closed `allowed` list). No structured `liquid` or
  `set_point` composite types. Liquid and set-point state model as
  multiple flat fields per object (well: `liquid_id`, `liquid_volume`,
  `liquid_color`; pipette: `set_volume`, `held_liquid_id`,
  `held_liquid_volume`).
- **RD-12 (per-type constraint metadata is closed)**: No open-ended
  `constraints:` object. Allowed metadata per primitive type --
  `enum`: `allowed`, `default`; `int`/`float`: `unit`, `min`, `max`,
  `step`, `default`; `bool`: `default`. Unknown metadata keys =
  build error.
- **RD-13 (`LiquidDisplayChange` reclassified to render layer)**:
  Same drift class as `SvgSwap` and `ColorChange` -- it named the
  display result instead of the semantic state change.
  `ObjectStateChange` is the sole protocol primitive for liquid state
  mutation; the object's `render_map` resolves the flat declared
  liquid fields to a fill height, tint, and asset. Prevents two
  competing liquid paths in canonical docs.
- **RD-14 (`SetPointDisplayChange` reclassified to render layer)**:
  Same drift class as `SvgSwap`, `ColorChange`, and
  `LiquidDisplayChange` -- it named the display result (a numeric
  overlay) instead of the semantic state change. Per user
  ratification on 2026-05-15 (option 1): reclassify
  `SetPointDisplayChange` to the object/render layer; keep
  `ObjectStateChange` as the protocol path for set-point state.
  Display changes belong to object rendering; protocol changes
  declared state. `ObjectStateChange` is the sole protocol primitive
  for set-point state mutation; it writes the flat declared set-point
  fields (`set_volume`, `set_temperature`, `set_rpm`, etc. per
  RD-11), and the object's `render_map` resolves the digit overlay
  or display visual. Brings the ratified protocol-level primitive
  count down from six (post RD-13) to five (`ObjectStateChange`,
  `CursorAttach`, `SceneChange`, `LayoutMove`, `TimedWait`).
- **RD-15 (semantic-state-vs-appearance rule)**: Generalized the
  drift class behind RD-3, RD-13, and RD-14 into a permanent rule.
  User-verbatim test: "Does this primitive change semantic simulation
  state, or does it merely describe how that state appears? If it
  merely describes appearance, move it to object/render." Every
  protocol-level primitive must change semantic simulation state, not
  describe appearance. Encoded as smell class 16 in
  `docs/SPEC_DESIGN_CHECKLIST.md` with the past-pitfalls (`SvgSwap`,
  `ColorChange`, `LiquidDisplayChange`, `SetPointDisplayChange`)
  named, and applied preemptively to the five remaining ratified
  primitives. PROTOCOL_VOCABULARY.md primitive-table reason column
  sharpened to state semantic effect explicitly for every primitive.
- **RD-16 (`CursorAttach` is the held-material state primitive)**:
  Per-primitive narrowing under RD-15. `CursorAttach` is protocol-
  level only when it means "the learner is now holding this object
  instance" (a semantic state change to the runtime's held-material
  state). It must not be read as "draw the object under the cursor"
  or as a cursor-follow visual; the cursor-follow render is owned by
  the scene / object-render layer. Operations stay limited to
  `attach` and `detach`.
- **RD-17 (`TimedWait` is the protocol-time-advance primitive)**:
  Per-primitive narrowing under RD-15. `TimedWait` is protocol-level
  only when it means "protocol time advances on this equipment" or
  "the timed condition on this equipment is satisfied" (a semantic
  change to the runtime's equipment-state). It must not be read as
  "show a spinner" or "render a progress bar"; the visible progress
  display is owned by the object's `render_map` over the equipment's
  declared timed-phase state. The `display` field is an authoring
  hint to the render layer about display style, not a protocol-side
  appearance knob.
- **RD-15 sweep verdict (per-primitive)**: `LayoutMove` already
  covered by RD-10 (placement-only; layout engine owns visible
  motion); PROTOCOL_VOCABULARY.md reason column extended to spell out
  RD-15 explicitly with no new RD. `ObjectStateChange` already
  covered by RD-8 (declared flat fields only); semantic by definition
  with no new RD. `SceneChange` is semantic by inherent definition (a
  scene transition is the scene-id state change); no new RD. Only
  `CursorAttach` and `TimedWait` required new RDs (RD-16 and RD-17
  respectively).
- **RD-18 (scene inheritance is three-layer asymmetric)**: Objects are
  canonical-by-id with no extends and no template-object layer; protocols are
  spec-shaped with no template-protocol layer; scenes use shallow one-level
  extends with a closed four-operation mutation surface. This asymmetry reflects
  semantic differences: objects are identity-bearing stateful entities; protocols
  are pedagogical workflows with their own learning contract; scenes are layout
  containers for shared workspaces. The bounded-inheritance rule prevents
  template-object proliferation, template-protocol duplication, and multi-level
  scene-inheritance chains. See SCENE_INHERITANCE.md.
- **RD-19 (one-level scene inheritance per protocol scene file)**:
  Scene inheritance is strictly one level with no chains (base -> protocol).
  No scene may extend a protocol scene, and no scene may extend a scene that
  already extends another scene. Depth = 1 per protocol scene file; multi-scene
  protocols allowed (each protocol scene file extends its own base
  independently). Cycles, multi-level chains, and unknown bases are build
  errors.
- **RD-20 (four named mutation operations, no generic overrides)**: Scene
  inheritance supports exactly four mutation operations on inherited placements:
  `add_placements`, `reposition_placements`, `deactivate_placements`,
  `remove_placements`. These are named explicit operations, not a generic
  `overrides:` block. Unknown operations are build errors. A protocol scene may
  not override any other field.
- **RD-21 (scene-inheritance promotion rule)**: A base scene moves from a
  protocol's internal scenes into `content/scenes/` when it is expected to serve
  multiple protocols OR when it represents a stable workspace contract shared
  across the curriculum. Seed workspace bases (bench_basic, hood_basic,
  plate_reader_basic, microscope_workspace_basic, well_plate_workspace_basic,
  centrifuge_workspace_basic) are promoted to `content/scenes/` and established
  as stable workspace context. Authoring convenience alone does not trigger
  promotion.
- **Deliberate reopen of just-closed `PROTOCOL_VOCABULARY.md`**: The
  M4-closed protocol vocabulary was reopened intentionally for the
  narrow `SvgSwap` / `ColorChange` / `LiquidDisplayChange`
  reclassification and the addition of `ObjectStateChange`. The
  reason is that the unified-interaction-vocabulary plan named those
  three primitives at the protocol layer before the object vocabulary
  existed; once the object layer was designed, they belonged on the
  render side. WP-DOC-PV1 was scoped narrowly to the primitive list
  and retired-terms sections; WP-RAT-C1 confirmed the re-partition
  before the doc edit.
- **Docs-first staging (docs ahead of YAML, YAML ahead of TypeScript)**:
  This plan deliberately ships canonical docs that describe a format
  the scene YAML files and TypeScript do not yet match. The two
  follow-on plans -- content/scene-YAML migration first, TypeScript
  migration second -- close that gap in order. Accepting the temporary
  doc/code mismatch is cheaper than designing the format inside the
  code rewrite.
- **`docs/CHANGELOG.md` rotation flagged for human decision**: With
  the 2026-05-15 entry appended, the active changelog crosses the
  ~1000-line rotation threshold (current: 1049 lines before the entry,
  more after). Per WP-DOC-C1's obvious-follow-on rule, rotation is
  not performed as part of this work package; the human owner decides
  when and how to rotate.
- **Flat model could not express a multi-gesture step**: The first-pass flat
  six-slot model could not represent a single step that needs several
  gestures, which forced the course-correction to the two-level
  step/interaction model. An earlier seven-slot variant was also tightened to
  six slots.
- **`scene_operation` kept distinct from `response`**: `scene_operation`
  stays the durable typed-primitive layer and was deliberately not renamed to
  `response`. The first pass's "base actions" are renamed to `scene_operation`
  primitives because they describe how the scene changes, not what the learner
  does (OQ-10).
- **Uniform snake_case, vocabulary rewrite not a compatibility layer**: Chose
  snake_case uniformly across the vocabulary for readability and repo
  consistency, and applied a uniform snake_case sweep across the design doc.
  This is a vocabulary rewrite: legacy camelCase terms such as
  `completionPath`, `volumeMl`, and `plateTargets` are removed from the
  target-state vocabulary, not preserved (OQ-10).
- **Naming and ordering rules locked in**: Ratified that `step.name` is the
  stable identifier, `next_step` names the next step explicitly, and
  `step_index` is display-only. In the tightened model `sequence` order is
  always meaningful; the earlier opt-in `sequence_mode: unordered` relaxation
  is dropped (OQ-9).
- **Tighten to a linear spec first, defer the branching model (WP-STA1)**:
  Decided to tighten the model to a tight linear protocol spec now and defer
  the learning-tree / complex-branching model. The `outcome` mapping stays the
  simple `{ on_success, on_failure }` shape; the graph-flow framing is a stated
  future direction, not built. Unordered sequences, the interaction `name`, and
  any non-visual bookkeeping path are likewise deferred until a later plan has
  evidence (OQ-14, OQ-15).
- **Set-point gap forced `SetPointDisplayChange` (WP-SOP1 follow-up)**: Found a
  real gap -- the `adjust` gesture sets a set-point and the runtime state model
  lists "set-point values" as a state row, but no `scene_operation` primitive
  wrote it. Ratified `SetPointDisplayChange` as the eighth primitive to close
  it (OQ-21), and fixed the stale WP-PED1 `adjust` worked example, which
  previously misused a `LiquidDisplayChange` `operation: hold` to render a
  set-point.
- **"click target" / `ClickTarget` naming collision resolved (WP-BND1)**:
  Resolved the `PROTOCOL_VOCABULARY.md` "click target" versus
  `SCENE_VOCABULARY.md` `ClickTarget` naming collision. A protocol names a
  `target`; the scene adapter resolves it to a `placement`; "click target"
  is retired from the protocol vocabulary, and `ClickTarget` is scoped to the
  narrow `{itemId}` driver-payload runtime type. This gives the M4
  canonical-doc rewrites one decision to follow.
- **Ninth `scene_operation` primitive deferred (M3, Option 2 accepted)**: M3
  ratification surfaced instrument-produced data (absorbance readouts, cell
  counts, gel band patterns, molecular-weight estimates) as a candidate ninth
  `scene_operation` primitive, `DataReadout` / `InstrumentReadDisplayChange`.
  Option 2 was accepted: instrument data stays feedback-only for this pass and
  is not modeled as a typed primitive. Designing and ratifying the ninth
  primitive is carried to the follow-on code-migration plan.
- **OQ-19 resolved: domain verbs are shorthand, not YAML fields**: Domain verbs
  are authoring and documentation shorthand only. They are not protocol YAML
  fields; executable protocol YAML is always the expanded two-level model.
  Domain verbs expand at author time and never appear in the runtime schema.
- **CHANGELOG / ROADMAP / TODO left untouched as historical record**: A
  deliberate decision was made to leave `docs/CHANGELOG.md` prior entries,
  `docs/ROADMAP.md`, and `docs/TODO.md` unedited. They are a historical record
  of how the vocabulary evolved; rewriting them to the ratified model would
  destroy that record. Only new dated entries are appended.
- **Two primary docs reconciled to the ratified model**: A follow-on
  primary-doc pass reconciled both primary docs to the ratified two-level
  model. `docs/PRIMARY_DESIGN.md` had its "Flow before
  implementation" passage rewritten off `completionPath.kind`,
  `interactionSequence`, and `nextId` onto the two-level model.
  `docs/PRIMARY_SPEC.md` had its top-level-fields YAML
  example, entry block, and the completion-paths / derived-fields sections
  rewritten to the ratified step / interaction / response schema, with
  clearly-labeled current-code notes where the legacy `completionPath.kind`,
  `completionEvent`, `completionTrigger`, `usedItems`, and `nextId` fields are
  still what the runtime reads. `docs/PRIMARY_CONTRACT.md`
  was checked and contains no retired vocabulary. The remaining residual is the
  code itself, carried to the follow-on code-migration plan.

### Developer Tests and Notes
- **M3 ratification evidence**: 120 steps across OVCAR8, the 7 shipped
  `content/*/protocol.yaml` files, Miraculin, and SDS-PAGE all map to the
  ratified two-level model with no M2 design revision required. The
  dependent-doc set rewritten under M4 / WP-DOC-D1 is internally consistent;
  `docs/PRIMARY_SPEC.md` and `docs/PRIMARY_DESIGN.md` are the only known
  residual contradictions and are handed off to the follow-on code-migration
  plan stub at
  [active_plans/protocol_vocabulary_code_migration_plan.md](active_plans/protocol_vocabulary_code_migration_plan.md).

