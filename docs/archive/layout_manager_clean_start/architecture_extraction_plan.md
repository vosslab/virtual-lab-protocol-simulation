# Architecture extraction plan: production layout manager

Date: 2026-05-22
Status: forward-looking plan, doc-only, no code changes proposed in this doc.
Lane: Lane H of the layout-manager-clean-start dispatch.
Scope owner: this doc lays out HOW to extract a clean production layout manager from the experiments folder. It does NOT execute the extraction. Every decision touching the contract, a spec, a forbidden boundary, or repo-wide policy is flagged USER_DECISION_REQUIRED.

Companion documents:

- [ONBOARDING.md](ONBOARDING.md) is the entry point and the layered-evidence story.
- [experiments_code_triage.md](experiments_code_triage.md) is the per-file audit; it answers what each artifact under `experiments/css_native_layout` is for.
- [diagnostics_baseline.md](diagnostics_baseline.md) records the diagnostic numbers at HEAD 8795d25.
- [svg_completeness_plan.md](svg_completeness_plan.md) records the SVG asset inventory plan.

Where this doc and ONBOARDING.md disagree, the onboarding wins. This doc only proposes the extraction recipe.

## 1. Goal

The end state is a production layout manager owned at one canonical surface under `src/scene_runtime/layout/` that satisfies [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 (clickable objects are SVG-backed scene objects laid out by the layout engine) OR an explicitly amended item 3. The manager consumes canonical scene YAML per [SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md), names zones per [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md), sizes objects per [SCALING_MODEL.md](../../specs/SCALING_MODEL.md), and renders SVG assets per [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md). It replaces the experiments-folder CSS-native adapter spike and the deleted legacy `layout_engine.ts` with one canonical surface. Until USER_DECISION_REQUIRED items in section 8 are resolved, the manager remains a feature-flagged spike; the contract reconciliation gates production promotion.

## 2. Input evidence

The extraction draws from three evidence pools. The plan does not invent new evidence; it lifts and translates what already exists.

- Experiments folder: `experiments/css_native_layout`. Triaged file by file in [experiments_code_triage.md](experiments_code_triage.md). Section 2 of that doc lists move-to-production candidates; section 3 lists stay-diagnostic; section 4 lists delete; section 5 lists rewrite-to-TypeScript.
- Archived plans under `plan-reset-2026-05-22`. Five canonical archive docs and their workstream artifacts. The "Pipeline shape" and "Anti-drift commitments" sections of [new2_css_native_production_blocker_plan.md](../plan-reset-2026-05-22/new2_css_native_production_blocker_plan.md) are cited literally below. The NEW1.5 results doc records what each lane landed.
- Canonical specs under `specs`: [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md), [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md), [SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md), [SCALING_MODEL.md](../../specs/SCALING_MODEL.md), [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md), [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md). Plus the root-level contract and design: [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md), [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md), [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md).

The plan never extracts from a non-canonical mirror. When the experiments folder and a canonical spec disagree, the spec wins.

## 3. Closed vocabulary the production layout manager inherits

The production layout manager does not invent vocabulary. It inherits the closed surfaces below. Every term ships in code as a typed enum or a named string union; nothing is open.

### Canonical zone term (renamed from experiment-local `region`)

The canonical term is `zone`, defined in [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md). The experiments folder uses `region` only as a filename in `experiments/css_native_layout/regions` and as a CSS class hook. The production manager translates `region` to `zone` at the move boundary; no production-facing surface keeps the word `region`. USER_DECISION_REQUIRED for whether the closed zone set proposed below is the right canonical set or whether [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) already names a different set that wins.

### Canonical sizing model

`layout.display_width_cm` lives on each object YAML; a per-scene `px_per_cm` constant converts it to pixels. The full rules live in [SCALING_MODEL.md](../../specs/SCALING_MODEL.md). The production manager consumes `width_scale` as derived by the existing formula. No new sizing channel is introduced.

### Canonical scene class set (closed, 5 names)

The set is closed at five values, declared today by `experiments/css_native_layout/scene_class_manifest.yaml` and the NEW2 archive plan: `template`, `composition`, `instrument_heavy`, `zoom_detail`, `dense_clutter`. Scene class is a policy dial only (scorecard weights, label policy, spacing policy, viewport policy, acceptance thresholds). Scene classes may NOT introduce new layout algorithms, open-ended strategy names, coordinate fields, per-scene solver logic, hidden diagnostic behavior, or unreviewed CSS variants. Adding a class requires an RFC. USER_DECISION_REQUIRED for adoption of this closed set as canonical in `docs/specs/` versus keeping it experiment-local.

### Canonical footprint vocabulary (closed, 7 classes today)

Today the seven classes live in experiments/css_native_layout/object_footprints.yaml: `small-tool`, `handheld`, `container`, `rack`, `instrument`, `large-equipment`, `zoom-view`. 146 object kinds are mapped. The vocabulary is experiment-local today. Promotion path: `docs/specs/OBJECT_FOOTPRINTS.md` (vocabulary doc) plus `src/scene_runtime/layout/data/object_footprints.yaml` (runtime input). USER_DECISION_REQUIRED for promotion. Until promotion lands, the production manager reads the experiment-local YAML at startup; it does NOT inline a copy.

### Canonical region set proposed for promotion under the `zone` term

The current experiment uses five names baked into CSS class selectors and the three `regions/<file>.yaml`: `rear_shelf`, `work_surface`, `front_tools`, `instrument_station`, `popup_layer`. These are proposed for promotion under the canonical `zone` term. USER_DECISION_REQUIRED for adoption; the proposal stands or falls on whether [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) already names a different closed zone set. If it does, the experiment-local five names migrate to the spec's names at the move boundary, not the other way around.

### Things NOT in the inherited vocabulary

- No `region` term in production-facing code, CSS, or YAML.
- No open-ended `scene_class` extension via YAML.
- No coordinate fields on scene objects (the layout engine owns placement).
- No new layout strategy names beyond the closed pipeline.
- No `_placeholder.svg` substitution in production rendering.

## 4. Pipeline stages the production layout manager owns

The pipeline is closed. Stages run in fixed order. Adding a stage requires an RFC. The order below is lifted from the "Pipeline shape" section of [new2_css_native_production_blocker_plan.md](../plan-reset-2026-05-22/new2_css_native_production_blocker_plan.md).

1. Scene manifest. The scene YAML loaded per [SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md) plus the closed manifests for footprint class and scene class.
2. CSS-native layout. The 3-band stage rules, zoom-mode rule, and dense-mode hide-labels rule applied to the rendered DOM. CSS owns spacing inside a zone; no pixel math leaves the stylesheet.
3. Measured rect extraction. Browser-measured `getBoundingClientRect` for every placement and every label. Drives downstream audit.
4. Constraint audit. Detects off-page placements, SVG overlap, region/zone overflow, clipped artwork, click-target size under 40 px on either axis, and label readability under 11 px or low-contrast. The audit primitives are owned by the diagnostic pipeline in `experiments/css_native_layout/precheck.mjs`; the production manager calls into the audit, it does not duplicate the logic.
5. Scorecard. Aggregates per-scene-class-weighted metrics into a single comparison knob. Hard-fail gate: any hard fail makes the score zero. Score number is calibrated against nothing external; treat as relative.
6. Runtime interaction proof. A Playwright spike under `tests/playwright/` that loads the built bundle, clicks visible scene objects, and asserts invocation count strictly increments. One spike per scene that is wired to production runtime.

Stages are shared across every scene; scene-class-specific values are limited to scorecard weights, label policy, spacing policy, viewport policy, and acceptance thresholds (verbatim from the archived NEW2 plan).

## 5. Production tree shape (proposed)

The proposal lays out the new files under `src/scene_runtime/layout/`. None of these files exist on disk; `src/` was wiped by the 2026-05-22 reset. The shape is a proposal; the next manager confirms or revises before opening M1.

```
src/scene_runtime/layout/
  types.ts                  closed type set: Zone, Placement, FootprintClass,
                            SceneClass, ComputedItemLayout. No `any`. Strict.
  layout_manager.ts         entry point. Orchestrates the 6-stage pipeline.
                            Exports compute_scene_layout(world, scene_id,
                            viewport_w, viewport_h): ComputedItemLayout[].
  zone_taxonomy.ts          closed Zone enum. Five names today; whatever the
                            user-approved set ends up being. Renamed from
                            experiment-local `region_taxonomy.ts` proposal.
  footprint_classes.ts      closed FootprintClass enum from
                            data/object_footprints.yaml. Loader fails loudly
                            on unmapped object names; no silent fallback.
  scene_class.ts            closed SceneClass enum from
                            data/scene_class_manifest.yaml. Maps each class
                            to its policy dial values.
  placement_renderer.ts     DOM emission. Writes `.scene-container >
                            .zone--<name> > .placement >
                            .object-graphic.footprint--<class> > <img>` per
                            the CSS-native template shape. Translates `zone`
                            to the canonical CSS class hook.
  scaling.ts                consumes SCALING_MODEL.md. Owns
                            compute_width_scale_from_display and the
                            per-scene SCENE_PX_PER_CM constant table.
  feature_flags.ts          gated rollout surface. Only present while
                            production promotion is gated by USER_DECISION
                            on PRIMARY_CONTRACT.md item 3.
  data/
    object_footprints.yaml  moved from experiments/css_native_layout/. The
                            "Not production schema" header is stripped at
                            move time.
    scene_class_manifest.yaml  same, same.
tests/
  playwright/
    spike_<scene_name>.mjs  one Playwright runtime-interaction proof per
                            wired scene. The first is
                            spike_well_plate_96_zoom.mjs.
  fixtures/
    scene_layout/           moved from experiments/css_native_layout/
                            templates/*.html (10 canonical files only).
                            Reference HTML the precheck consumes; not wired
                            to runtime.
    well_plate_96_zoom/     moved from experiments/css_native_layout/
                            spike_fixtures/. DOM contract and manifest for
                            the wired spike scene.
```

Diagnostics stay under `experiments/css_native_layout` or migrate to `tools/layout_diagnostics/` as a separate cleanup milestone. They never live under `src/`. The shipped-vs-not-shipped boundary is firm: anything that lands in `dist/main.js` is TypeScript under `src/`; anything that runs under `node tests/playwright/...` or `bash experiments/...` is `.mjs` or Python.

## 6. Extraction milestones

Six milestones beyond the M0 baseline-confirmation pass already named in [ONBOARDING.md](ONBOARDING.md) section 8. M0 remains read-only baseline confirmation; the milestones below assume M0 lands first.

### M1: Type skeleton plus one wired spike scene

Goal: rebuild the minimum production layout-manager skeleton under `src/scene_runtime/layout/` that compiles, type-checks, and renders one scene end-to-end. The spike scene is `well_plate_96_zoom`.

Acceptance criteria:

- `npx tsc --noEmit -p tsconfig.json` returns zero errors.
- `bash check_codebase.sh --fast` passes.
- `node tests/playwright/spike_well_plate_96_zoom.mjs` PASSES with 7 of 7 invocation-count assertions plus at least one new assertion that names a `zone` instead of a `region`.
- `bash experiments/css_native_layout/run_built_app_precheck.sh` reports `hard_fail_count` at most 2 on `well_plate_96_zoom` at 1920x1080. The precheck script is not modified.
- Grep on the M1 delta finds zero occurrences of `any`, `as unknown as`, `@ts-ignore`, debug `console.log`, hardcoded `-99999`, or `region` (outside of the move-translation block).

Files touched (proposed): `src/scene_runtime/layout/types.ts`, `layout_manager.ts`, `zone_taxonomy.ts`, `footprint_classes.ts`, `scene_class.ts`, `placement_renderer.ts`, `scaling.ts`, `feature_flags.ts`, `data/object_footprints.yaml`, `data/scene_class_manifest.yaml`, `tests/playwright/spike_well_plate_96_zoom.mjs`, `tests/fixtures/well_plate_96_zoom/`.

User-gated decisions: none for M1; M1 is the skeleton, not the production promotion.

Estimated effort: M (one dispatch, approximately 10 to 14 files, no spec amendments).

### M2: Diagnostic pipeline binding plus visual gate

Goal: bind the production layout manager to the existing diagnostic pipeline so the visual track is gated on canonical, unmodified diagnostic output. No diagnostic-tool edits.

Acceptance criteria:

- `bash experiments/css_native_layout/run_precheck.sh` reports `hard_fail_count = 0` across the 10 canonical templates at 1200x900 (unchanged from the M0 baseline).
- `node experiments/css_native_layout/score_layout.mjs` reports the four template scenes in the top 5 with revised Lane C weights (unchanged from the M0 baseline).
- `bash experiments/css_native_layout/run_built_app_precheck.sh` reports `hard_fail_count = 0` on the wired spike scene at 1920x1080. This is a stricter gate than M1; M1's acceptance allowed up to 2 hard fails to preserve the prior baseline, M2 closes the gap.
- The new `src/scene_runtime/layout/placement_renderer.ts` emits DOM that `render_and_dump.mjs` can dump into static HTML the precheck audits without modification.

Files touched (proposed): updates to `src/scene_runtime/layout/placement_renderer.ts` and CSS in `src/style.css`. The CSS edit is the 6-line patch from Workstream 2 of the archived NEW2 plan. No edits to `precheck.mjs`, `score_layout.mjs`, or `render_and_dump.mjs`.

User-gated decisions: USER_DECISION_REQUIRED on Phase 1 hardFailCount semantics (fold `clipped_by_parent` and `aspect_distorted_HF` into hard fails versus keep them advisory). The CSS patch itself is not user-gated per the NEW2 archive.

Estimated effort: S (one dispatch, two files plus rerun of the diagnostic chain).

### M3: Second wired scene (generalization evidence)

Goal: replicate the wired-scene pattern for one second scene to prove the integration pattern generalizes. NEW1.5's deferred next implementation step.

Acceptance criteria:

- One second scene is wired through `src/scene_runtime/layout/layout_manager.ts` end-to-end. The scene is chosen from the existing 10 hand-authored templates and matches one of the closed scene classes other than `zoom_detail` (which `well_plate_96_zoom` covers). Proposed choice: `bench_basic` or `microscope_basic` (both rank 90 on the revised scorecard).
- `node tests/playwright/spike_<second_scene>.mjs` PASSES with the canonical assertion set plus at least one assertion specific to the new scene class.
- `bash experiments/css_native_layout/run_built_app_precheck.sh` reports `hard_fail_count = 0` on both wired scenes at 1920x1080.
- No new layout strategy, plugin, or extension point introduced.

Files touched (proposed): one new spike test under `tests/playwright/`, one moved scene YAML under `content/base_scenes/`, possible additions to `data/object_footprints.yaml` if the second scene uses an object kind not previously mapped (mapping additions are vocabulary edits, not new classes).

User-gated decisions: USER_DECISION_REQUIRED on validator preset hierarchical-target matching ONLY IF the second scene needs a group target (`row_E`, `all_wells`, `gel_cassette.lane_1`). Individual cell targets work without the validator edit per the archived NEW2 update.

Estimated effort: M (one dispatch; depends on whether the second scene needs the validator preset fix).

### M4: Footprint vocabulary plus scene class promotion

Goal: promote `object_footprints.yaml` and `scene_class_manifest.yaml` from experiment-local data to canonical spec surfaces. Requires user approval per the closed-vocabulary rule.

Acceptance criteria:

- `docs/specs/OBJECT_FOOTPRINTS.md` exists and documents the closed 7-class set with one short row per class.
- `docs/specs/SCENE_CLASS_MANIFEST.md` exists and documents the closed 5-class set with policy-dial fields per class.
- The "Not production schema" header is removed from `src/scene_runtime/layout/data/object_footprints.yaml` and `src/scene_runtime/layout/data/scene_class_manifest.yaml`.
- `docs/active_plans/` records the RFC discussion linking to the new spec files.
- The closed vocabulary lock per [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md) is applied to the new spec files: no `additionalProperties: true`, no `extras`/`metadata`/`params` open maps.

Files touched (proposed): two new spec files plus header edits to the data YAMLs plus a short changelog entry under `docs/CHANGELOG.md` (the changelog edit is the only manager-edit; commit remains the user's).

User-gated decisions: USER_DECISION_REQUIRED for the entire milestone. Promotion is user-gated, not manager-gated.

Estimated effort: M (one dispatch for the spec drafting; user-time cost for the approval is separate).

### M5: Contract reconciliation (final production promotion)

Goal: resolve [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 with respect to the production layout manager. The contract today says clickable objects are SVG-backed scene objects laid out by the layout engine. The experiments folder uses CSS Grid and Flexbox to own placement; NEW0 bypassed the layout engine. The two views must reconcile before production promotion lands.

Acceptance criteria:

- Either [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 is amended (with user approval) to name CSS as the layout engine's output backend, OR
- The production layout manager is integrated as the layout engine's output backend without contract amendment (the engine produces a placement model, the CSS-native renderer consumes it).
- The feature flag `feature_flags.ts` is removed. The production runtime no longer gates layout dispatch.
- One full mini-protocol runs end-to-end through the runtime with the production layout manager owning placement, validated by an existing Playwright walkthrough (not the spike).

Files touched (proposed): possible edit to [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) under user approval, removal of `src/scene_runtime/layout/feature_flags.ts`, possible adjustments to `src/scene_runtime/layout/layout_manager.ts`.

User-gated decisions: USER_DECISION_REQUIRED for the contract amendment OR the integration choice. The decision is single-issue: which interpretation of item 3 is canonical.

Estimated effort: L (one to three dispatches plus user review).

### M6: Experiments-tree cleanup

Goal: retire the no-longer-needed experiments-tree files per [experiments_code_triage.md](experiments_code_triage.md) section 4. Diagnostic scripts remain in place per section 3.

Acceptance criteria:

- The 28 reference-variant CSS files (`bench_a.css`, `hood_diorama.css`, the `dir_b/dir_c` variants, etc.) are removed via `git rm`.
- The two `templates/dir_b/` and `templates/dir_c/` directories are removed (20 HTML files).
- The `_batch3_f_*.py` and the four batch-specific stress generators are removed (1188 LOC).
- `experiments/css_native_layout/render_stress_to_html.py` is removed (untracked drift per the WS-D audit).
- `experiments/css_native_layout/regions/` is removed only AFTER the canonical zone set is promoted (M4 or M5 dependency).
- The diagnostic chain (`precheck.mjs`, `score_layout.mjs`, `render_and_dump.mjs`) still runs after the cleanup; no test or runner imports a deleted file.

Files touched (proposed): file deletions only; no new files. Deletions land via `git rm`, never plain `mv`.

User-gated decisions: USER_DECISION_REQUIRED only for the binary artifact policy decision applied to any PNG/PDF/HTML retained from `experiments/`. The deletion list above is text/code only.

Estimated effort: S (one dispatch; mechanical deletions plus one rerun of the diagnostic chain to confirm nothing broke).

## 7. Anti-drift commitments

The plan inherits the four anti-drift commitments verbatim from the "Anti-drift commitments" section of [new2_css_native_production_blocker_plan.md](../plan-reset-2026-05-22/new2_css_native_production_blocker_plan.md). Every milestone is bound by them.

- No new layout strategies beyond the closed pipeline. The six stages in section 4 are the layout strategy.
- No general plugin system. Scene classes are policy dials, not extension points. Adding a class is an RFC, not a YAML edit.
- No use of "scene class" as a backdoor for arbitrary custom behavior. A scene class may adjust scorecard weights, label policy, spacing policy, viewport policy, and acceptance thresholds; nothing else.
- No diagnostic tool changes that hide a failure rather than expose it. `precheck.mjs`, `score_layout.mjs`, and `render_and_dump.mjs` are untouchable in this plan. Prior attempts to weaken thresholds or insert shadow placement divs were caught and reverted.

Plan-specific anti-drift additions for the extraction (not net-new, restated for clarity):

- No `region` term in any production-facing surface. Translate at the move boundary; do not propagate.
- No silent footprint-class fallback on unmapped object names. Fail loudly so the unmapped name is fixed at the YAML edit, not at runtime.
- No `_placeholder.svg` substitution in production rendering. The experiment-local convenience does not leak into `src/`.
- No editing of forbidden-boundary files (`src/scene_runtime/adapters/well_plate/render.ts`, `src/scene_runtime/chrome/scene_frame.ts`, the no-longer-extant `src/scene_runtime/layout/layout_engine.ts`) without an explicit user-approved lane scope.

## 8. User decision queue

Every item below is USER_DECISION_REQUIRED. The plan does not make these decisions; it lists them so the next manager opens them in order. The order matches the dependency chain: items higher on the list block items below.

1. USER_DECISION_REQUIRED: [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 reconciliation. Two viable answers: amend item 3 to name CSS as the layout engine's output backend, or integrate the production layout manager as the engine's renderer without amendment. Until this resolves, M5 cannot land and the feature flag stays on.
2. USER_DECISION_REQUIRED: Phase 1 hardFailCount semantics. Today `clipped_by_parent` and `aspect_distorted_HF` are advisory in the constraint audit. The Phase 1 proposal folds them into the hard-fail gate so no-crop becomes machine-enforceable, not author-discretionary. Until this resolves, M2's stricter `hard_fail_count = 0` gate may be unreachable for some scenes.
3. USER_DECISION_REQUIRED: validator preset hierarchical-target matching (Workstream 1 from the archived NEW2 plan). Edit the `correct_target` validator preset to call `isTargetSatisfied` so group targets (`row_E`, `all_wells`, `gel_cassette.lane_1`) work. Forbidden-boundary file. Cell targets work without the edit; group targets do not. Blocks M3 only if the second wired scene needs a group target.
4. USER_DECISION_REQUIRED: production viewport overflow CSS patch (Workstream 2 from the archived NEW2 plan). Two CSS files, approximately 6 lines total. Workstream 2 itself is not user-gated per the archive, but the question of whether the patch ships as part of M1 or M2 is. Default: ship in M2 alongside the visual-gate work.
5. USER_DECISION_REQUIRED: binary artifact policy. Commit 4e2c709 added 111 PNG/PDF blobs to git history. Future PNG/PDF/HTML commits need a policy: retain in repo, gitignore, or migrate to a separate binary store. Blocks parts of M6 (the experiments-tree cleanup may want to keep some galleries).
6. USER_DECISION_REQUIRED: footprint vocabulary promotion into `docs/specs/`. M4 cannot land without approval. Until promotion, `data/object_footprints.yaml` lives under `src/scene_runtime/layout/data/` but is not blessed as canonical.
7. USER_DECISION_REQUIRED: closed-region taxonomy adoption or rename to zone taxonomy. The five experiment-local names (`rear_shelf`, `work_surface`, `front_tools`, `instrument_station`, `popup_layer`) are proposed for promotion under the canonical `zone` term. If [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) names a different closed zone set, that set wins and the experiment-local names migrate to it.

## 9. Out of scope

This plan does NOT extract the following. Each item is diagnostic-only or covered by a separate plan, cited below.

- Stress generator scripts under `experiments/css_native_layout/stress_generators`. Diagnostic-only per section 3 of [experiments_code_triage.md](experiments_code_triage.md). They produce synthetic stress corpora that are not pedagogically valid; stress 100% FAIL is generator validity, not layout failure.
- Showcase demos under `experiments/css_native_layout/showcase`. Per [experiments_code_triage.md](experiments_code_triage.md) the 13 stakeholder demos move to `docs/showcase/` or delete; not part of the layout-manager extraction. Treat as separate gallery housekeeping.
- Direction-variant CSS files (`bench_a.css`, `hood_diorama.css`, `dir_b_*.css`, `dir_c_*.css`). Per [experiments_code_triage.md](experiments_code_triage.md) section 4 these delete after archival snapshot. Reference-only; never production-bound.
- Row-group height=0 fix in the well-plate render adapter. Forbidden-boundary file per the archived NEW2 update. Cell-target approach works without this fix; group-target approach needs validator preset fix first (item 3 in section 8) and then a separate adapter lane.
- Legacy layout engine removal. The pre-reset `src/scene_runtime/layout/layout_engine.ts` (932 lines) was already wiped by the reset. There is nothing to remove. Future engine-side surface lives in M5.

## 10. Verification commands per milestone

Each milestone has a literal verification chain. Commands are run from the repo root.

### Shared baseline (every milestone)

- `npx tsc --noEmit -p tsconfig.json` -> zero errors.
- `bash check_codebase.sh --fast` -> PASS.
- `source source_me.sh && python3 -m pytest tests/test_pyflakes_code_lint.py tests/test_ascii_compliance.py tests/test_markdown_links.py -q` -> PASS. (Note: per [experiments_code_triage.md](experiments_code_triage.md) Lane A finding, `tests/conftest.py` may need bootstrap recovery before pytest runs cleanly post-reset; if so, recovery is its own milestone, separate from M1.)

### M1 verification

- All shared baseline commands above.
- `bash build_github_pages.sh` -> produces `dist/main.js`.
- `node tests/playwright/spike_well_plate_96_zoom.mjs` -> 8+ assertions pass.
- `bash experiments/css_native_layout/run_built_app_precheck.sh` -> `hard_fail_count` at most 2 on `well_plate_96_zoom`.

### M2 verification

- All M1 commands.
- `bash experiments/css_native_layout/run_precheck.sh` -> 10 templates, 0 hard fails at 1200x900.
- `node experiments/css_native_layout/score_layout.mjs` -> four templates rank top 5.
- `bash experiments/css_native_layout/run_built_app_precheck.sh` -> `hard_fail_count = 0` on the wired spike scene at 1920x1080.

### M3 verification

- All M2 commands.
- `node tests/playwright/spike_<second_scene>.mjs` -> assertions pass.
- `bash experiments/css_native_layout/run_built_app_precheck.sh` (extended to two scenes) -> `hard_fail_count = 0` on both.

### M4 verification

- All M3 commands.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py -q` -> PASS (the two new spec files plus changelog entry must have valid links).
- Manual review: the new spec files apply the closed-vocabulary lock per [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md).

### M5 verification

- All M4 commands.
- One existing full-protocol Playwright walkthrough under `tests/playwright/` runs end-to-end with the feature flag removed.
- No occurrences of `region` in `src/` or in production-facing YAML (`content/`).

### M6 verification

- All M5 commands still pass after deletions.
- `git ls-files experiments/css_native_layout/` shows the trimmed file list.
- `bash experiments/css_native_layout/run_precheck.sh` still works (nothing the diagnostic chain imports was deleted).

## 11. Rollback per milestone

Each milestone has one-command rollback. The plan favors deletions over reverts where possible because the canonical surface is new code; reverting to absent code is cheap.

- M1: `git restore src/scene_runtime/layout/ tests/playwright/spike_well_plate_96_zoom.mjs tests/fixtures/well_plate_96_zoom/`. Plus removal of any moved YAMLs under `data/`.
- M2: `git restore src/scene_runtime/layout/placement_renderer.ts src/style.css experiments/css_native_layout/styles/bench.css`. Reverts the CSS patch and the renderer adjustment.
- M3: `git restore tests/playwright/spike_<second_scene>.mjs content/base_scenes/<second_scene>.yaml src/scene_runtime/layout/data/object_footprints.yaml`. Removes the second scene wiring.
- M4: `git restore docs/specs/OBJECT_FOOTPRINTS.md docs/specs/SCENE_CLASS_MANIFEST.md src/scene_runtime/layout/data/`. Restores the "Not production schema" headers.
- M5: `git restore docs/PRIMARY_CONTRACT.md src/scene_runtime/layout/feature_flags.ts src/scene_runtime/layout/layout_manager.ts`. Restores the feature flag and the contract text.
- M6: `git restore experiments/css_native_layout/`. The mechanical deletions revert in one command because they were tracked files.

Each rollback is intended to be reversible without losing work in subsequent milestones. If rollback is unsafe (a later milestone depends on the rolled-back file), the dependency is called out at the milestone that introduced the dependency.

## 12. Cross-references

- [ONBOARDING.md](ONBOARDING.md) is the entry point. Read first.
- [experiments_code_triage.md](experiments_code_triage.md) is the per-file audit. Reference for any "what is this file for" question.
- [diagnostics_baseline.md](diagnostics_baseline.md) records the diagnostic numbers at the HEAD this plan was written against.
- [svg_completeness_plan.md](svg_completeness_plan.md) records the SVG asset inventory plan. Out of scope here; cross-referenced for context.
- [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 governs production promotion. M5 must reconcile.
- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) governs the no-crop rule. Every milestone is bound by it.
- [PRIMARY_SPEC.md](../../PRIMARY_SPEC.md) governs the closed YAML schema. The footprint and scene-class promotions in M4 must comply.
- [SPEC_DESIGN_CHECKLIST.md](../../specs/SPEC_DESIGN_CHECKLIST.md) is the closed-vocabulary lock applied to M4's new spec files.
- [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) is the canonical layout engine surface. Section 5 of this plan must align with whatever it names.
- [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md) defines `zone`. Section 3 of this plan inherits the term.
- [SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md) defines scene YAML. M3 onwards consumes the canonical schema.
- [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) defines `display_width_cm` plus `px_per_cm`. Section 5 lifts the formula.
- [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md) defines SVG asset normalization. The no-`_placeholder.svg` rule comes from it.
- [new2_css_native_production_blocker_plan.md](../plan-reset-2026-05-22/new2_css_native_production_blocker_plan.md) is the source of the pipeline shape, the anti-drift commitments, and Workstreams 1 and 2.
- [new1_5_layout_hardening_results.md](../plan-reset-2026-05-22/new1_5_layout_hardening_results.md) is the source of the deferred "second wired scene" step that M3 picks up.
- [no_crop_round3_architecture_vocabulary_clarification.md](../plan-reset-2026-05-22/no_crop_round3_architecture_vocabulary_clarification.md) is the source of the `region`-versus-`zone` rename rule.
