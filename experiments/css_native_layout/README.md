# CSS native layout experiment

Status: experimental documentation source. Not contract-compliant. Not a candidate for production promotion in its current shape.

This folder is a self-contained workspace owned by the layout-manager clean-start onboarding bundle at [../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md](../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md). The 2026-05-22 reset archived every prior plan (NEW0 through NEW3) under [../../docs/archive/plan-reset-2026-05-22/](../../docs/archive/plan-reset-2026-05-22/). Treat this experiment as evidence, not as active direction. The next manager designs the production layout manager from this evidence; they do not continue any prior numbered plan.

## 1. Purpose

The experiment is a clean-room CSS-native prototype of a scene layout system. It tests whether semantic regions plus CSS Grid/Flexbox can replace pixel-math placement code from the legacy layout engine.

Core principle: semantic regions own placement; CSS owns spacing within each region only.

The experiment exists to answer one question: can a closed region set, a closed footprint vocabulary, and a closed scene class set render every current scene at acceptable visual quality without per-scene placement code? The answer so far is "yes at 1200x900 for 10 hand-authored templates, with caveats". See [../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md](../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md) for the full layered-evidence summary (runtime / visual / diagnostic).

Scope of this README:

- Orient the next manager to the experiment as a workspace.
- Cross-reference the onboarding bundle, the lane audits, and the canonical specs.
- Avoid restating onboarding content; link to it.

## 2. What this experiment replaces

The experiment is positioned as a replacement candidate for the legacy layout engine.

- Legacy surface: [../../docs/specs/LAYOUT_ENGINE.md](../../docs/specs/LAYOUT_ENGINE.md) describes the canonical layout engine that the contract names. The pre-reset implementation under `src/scene_runtime/layout/layout_engine.ts` was 932 lines and is treated as failed architecture. The reset wiped that tree; the spec remains.
- Contract status: [../../docs/PRIMARY_CONTRACT.md](../../docs/PRIMARY_CONTRACT.md) item 3 vests scene-object layout in the layout engine. This experiment proposes to replace that engine with CSS-native placement. The contract has not been amended. Promotion requires either (a) an approved contract amendment or (b) an explicit user decision to rescope the experiment.
- Archived integration plan: [../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md](../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md) is the prior rebuild plan; it is archived evidence, not active direction.

Until the contract item is reconciled, every artifact under this folder is exploratory. Verdicts, screenshots, audits, and CSS variants are evidence for a future decision, not commitments.

## 3. What not to use from old code

The "What to avoid from old code" section of [../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md](../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md) is the authoritative list. Highlights for this folder:

- Do not continue NEW0, NEW1, NEW1.5, NEW2, or NEW3 as if they were active plans. The reset archived them.
- Do not edit the diagnostic tools (`precheck.mjs`, `score_layout.mjs`, `render_and_dump.mjs`) to weaken thresholds or to insert shadow placement divs that inflate scores. Prior attempts were caught and reverted.
- Do not promote [regions/](regions/) `*.yaml` as a production schema. It is an experiment-local mapping artifact. The canonical schema is `zones[]` in scene YAML per [../../docs/specs/SCENE_YAML_FORMAT.md](../../docs/specs/SCENE_YAML_FORMAT.md).
- Do not let an agent run `git add -A && git commit`. Commit 4e2c709 added 111 binary blobs to history that way.
- Do not render placeholder bubbles or generic fallback blobs. The stress renderer's `_placeholder.svg` substitution is experiment-local convenience; it must not leak into production.

Two specific Lane B findings document leaks that are already in the tree and must not be promoted (see [../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md](../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md)):

- [templates/microscope_basic.html](templates/microscope_basic.html) references `centrifuge_new.svg` as the microscope asset. Wrong asset. The corrected variant exists at [templates/dir_b/microscope_basic.html](templates/dir_b/microscope_basic.html) (which references `microscope_new.svg`). Do not copy the broken reference forward.
- Two top-level templates reference the named placeholder `microtube_rack_24_placeholder.svg`: [templates/drug_dilution_plate_workspace.html](templates/drug_dilution_plate_workspace.html) and [templates/drug_dilution_workspace_dense.html](templates/drug_dilution_workspace_dense.html). The placeholder is a tracked SVG, not the fallback file, but the visual integrity rule still applies.

## 4. Directory map

Immediate subdirectories of `experiments/css_native_layout/` and what each holds. Cross-checked against [../../docs/active_plans/active/layout_manager_clean_start/experiments_code_triage.md](../../docs/active_plans/active/layout_manager_clean_start/experiments_code_triage.md).

- [regions/](regions/) - experiment-local YAML mapping object kinds to footprint classes per region set (bench, hood, instrument, bench_e). Shadow vocabulary; the canonical term is `zone`.
- [scenes/](scenes/) - two hand-authored YAML scene manifests (`crowded_bench_dense.yaml`, `drug_dilution_workspace_dense.yaml`). Reference fixtures; not wired to runtime.
- `stress_scenes/` - generator output (`generated/`, `rendered/`, `gold/`) plus per-batch reruns. 100% FAIL synthetic corpus. Gitignored on disk.
- [stress_generators/](stress_generators/) - Playwright probes and Python generators that build stress scenes and measure runtime cost (`profile_runtime.mjs`, `profile_runtime_deep.mjs`, `label_policy_audit.mjs`, `viewport_probe.mjs`, `generate_stress_scenes.py`, `render_with_label_policy.py`, `build_batch1_contact_sheets.py`, `proposal_phase1_dryrun.py`, `verify_no_coord_fields.py`).
- [stress_results/](stress_results/) - per-batch precheck output, scorecard output, manual review notes, gallery summaries. Historical evidence by date and batch index.
- [templates/](templates/) - 10 hand-authored canonical scene HTML templates (flat) plus 20 direction variants under [templates/dir_b/](templates/dir_b/) and [templates/dir_c/](templates/dir_c/).
- [styles/](styles/) - canonical [styles/bench.css](styles/bench.css), [styles/hood.css](styles/hood.css), [styles/instrument.css](styles/instrument.css) plus 28 direction-comparison variants (`_a`, `_b`, `_c`, `_d`, `_e`, `_diorama`, `_focusedstage`, `_gameboard`) and the dir_b/dir_c CSS hooks.
- [showcase/](showcase/) - 13 interactive HTML stakeholder demos plus `concepts/`, `label_policies/`, `styles/` subdirectories. Not wired to runtime.
- [spike_fixtures/](spike_fixtures/) - pinned DOM contract for the well_plate_96_zoom runtime spike (manifest YAML, expected DOM selectors, expected screenshot paths, plus `spike_rendered/`).
- [spike_paths/](spike_paths/) - three written prototype sketches (`path_a_adapter_compat/`, `path_b_dom_first/`, `path_c_hybrid/`). Path A was chosen.
- `trial_logs/` - NEW1.5 Lane E per-trial notes, original-copy HTML, and trial screenshots. Closed; rolled up in the archive. Gitignored on disk.
- `test-results/` - gitignored output of the diagnostic runs (regenerable). Currently `new0_css_native/` only.
- `well_plate_rect_probe/` - NEW2 diagnostic that verifies SVG rect coordinates for A1, E7, H12 in the well-plate adapter (`well_plate_rect_probe/probe.mjs`). Gitignored on disk.
- [no_crop_audit/](no_crop_audit/) - focused crop detector ([no_crop_audit/inspect.mjs](no_crop_audit/inspect.mjs)) plus committed result JSON.

The [templates/](templates/) folder has no `dir_b/` or `dir_c/` placeholder of its own; those are full sibling directories under [templates/](templates/).

## 5. Executable files and commands

The 10 executable scripts plus 2 shell wrappers from [../../docs/active_plans/active/layout_manager_clean_start/js_mjs_usage_audit.md](../../docs/active_plans/active/layout_manager_clean_start/js_mjs_usage_audit.md). Categories: diagnostic tooling (8), experiment runtime bridge (1), screenshot tooling (1), Python stress generators (4).

Diagnostic and experiment scripts:

- [precheck.mjs](precheck.mjs) - primary visual diagnostic. Renders scene HTML in Playwright and emits `visual_audit.json/.md` plus `sizing_manifest.json`. Hard fails on `clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`.
  ```
  node experiments/css_native_layout/precheck.mjs \
    'experiments/css_native_layout/templates/*.html' \
    --out test-results/new0_css_native/audit --annotate on
  ```
- [score_layout.mjs](score_layout.mjs) - aggregates precheck output against scene-class-weighted metrics; emits `scorecard.json/.md`. Hard-fail gate forces score to zero.
  ```
  node experiments/css_native_layout/score_layout.mjs
  ```
- [render_and_dump.mjs](render_and_dump.mjs) - bridge from the production runtime bundle into static HTML that `precheck.mjs` can audit. Required to validate that runtime-rendered scenes meet the same visual gates as hand-authored templates.
  ```
  node experiments/css_native_layout/render_and_dump.mjs \
    --scene well_plate_96_zoom \
    --out experiments/css_native_layout/spike_fixtures/spike_rendered/
  ```
- `capture.mjs` (gitignored on disk) - multi-viewport screenshot driver (1920x1080 and 800x600) for direction-comparison work; emits PNG plus bbox JSON per direction.
  ```
  node experiments/css_native_layout/capture.mjs \
    --templates 'experiments/css_native_layout/templates/*.html' \
    --viewports 1920x1080,800x600
  ```
- [no_crop_audit/inspect.mjs](no_crop_audit/inspect.mjs) - focused crop detector; produces annotated PNGs marking violations.
  ```
  node experiments/css_native_layout/no_crop_audit/inspect.mjs
  ```
- `well_plate_rect_probe/probe.mjs` (gitignored on disk) - NEW2 diagnostic specific to the well-plate adapter; verifies SVG rect coordinates for A1, E7, H12.
  ```
  node experiments/css_native_layout/well_plate_rect_probe/probe.mjs
  ```
- `stress_generators/profile_runtime.mjs` and `stress_generators/profile_runtime_deep.mjs` (both gitignored on disk) - adapter latency, `getBoundingClientRect` call count, DOM and heap growth across 50/500/1000 iterations.
- `stress_generators/label_policy_audit.mjs` (gitignored on disk) - label overlap and aspect distortion across rendered scene HTML.
- `stress_generators/viewport_probe.mjs` (gitignored on disk) - 15 scenes across 4 viewports (1920x1080, 1440x900, 1200x900, 800x600); reports migration deltas, off-page, clip, tiny-target, aspect distortion.

Shell wrappers:

- [run_precheck.sh](run_precheck.sh) - thin wrapper around the static-template precheck.
  ```
  bash experiments/css_native_layout/run_precheck.sh
  ```
- [run_built_app_precheck.sh](run_built_app_precheck.sh) - production-viewport precheck against the built-bundle DOM dump (1920x1080).
  ```
  bash experiments/css_native_layout/run_built_app_precheck.sh
  ```

Python tooling (under [stress_generators/](stress_generators/)):

- [stress_generators/generate_stress_scenes.py](stress_generators/generate_stress_scenes.py) - deterministic-seed stress scene factory.
- [stress_generators/render_with_label_policy.py](stress_generators/render_with_label_policy.py), [stress_generators/build_batch1_contact_sheets.py](stress_generators/build_batch1_contact_sheets.py), [stress_generators/proposal_phase1_dryrun.py](stress_generators/proposal_phase1_dryrun.py), [stress_generators/verify_no_coord_fields.py](stress_generators/verify_no_coord_fields.py) - per-batch one-shot tooling; candidates for deletion per Lane A unless a live runner imports them.

Note on a missing tracked artifact: `render_stress_to_html.py` is present on disk at HEAD but per Lane A is untracked drift and the only consumer of `regions/<file>.yaml` `kind_to_footprint`. The next manager either re-tracks it or deletes it. Treat the on-disk copy as unstable.

## 6. Input scenes and templates

The canonical static input set is 10 hand-authored HTML files under [templates/](templates/), plus 20 direction-variant mirrors under [templates/dir_b/](templates/dir_b/) and [templates/dir_c/](templates/dir_c/). Per [../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md](../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md):

- [templates/bench_basic.html](templates/bench_basic.html) - 2 placements, all real SVG.
- [templates/cell_counter_basic.html](templates/cell_counter_basic.html) - 2 placements, all real SVG.
- [templates/crowded_bench_dense.html](templates/crowded_bench_dense.html) - 13 placements, all real SVG.
- [templates/drug_dilution_plate_workspace.html](templates/drug_dilution_plate_workspace.html) - 8 placements; 3 wrong-asset references on `stock_bottle`; 1 named-placeholder reference on `tube_rack_24`.
- [templates/drug_dilution_workspace_dense.html](templates/drug_dilution_workspace_dense.html) - 14 placements; 5 wrong-asset references on bottles; 1 wrong-asset and 1 named-placeholder on `tube_rack_24`.
- [templates/electrophoresis_bench.html](templates/electrophoresis_bench.html) - 15 placements; 2 wrong-asset references (`recycle_buffer_bottle`, `serological_pipette`).
- [templates/hood_basic.html](templates/hood_basic.html) - 3 placements, all real SVG.
- [templates/microscope_basic.html](templates/microscope_basic.html) - 1 placement; the microscope references `centrifuge_new.svg` (wrong asset).
- [templates/staining_bench.html](templates/staining_bench.html) - 10 placements, all real SVG.
- [templates/well_plate_96_zoom.html](templates/well_plate_96_zoom.html) - 1 placement, real SVG.

Direction variants (`dir_b/`, `dir_c/`) duplicate the top-level set with reordered placements. The `microscope_basic.html` variants under `dir_b/` and `dir_c/` reference the correct `microscope_new.svg` and are the fix source if the top-level template is corrected.

Two hand-authored YAML scene manifests live under [scenes/](scenes/) ([scenes/crowded_bench_dense.yaml](scenes/crowded_bench_dense.yaml), [scenes/drug_dilution_workspace_dense.yaml](scenes/drug_dilution_workspace_dense.yaml)). Neither matches the canonical scene YAML format; the templates carry the canonical visual content.

The closed scene class manifest is [scene_class_manifest.yaml](scene_class_manifest.yaml) (5 classes: `template`, `composition`, `instrument_heavy`, `zoom_detail`, `dense_clutter`).

The closed footprint vocabulary is `object_footprints.yaml` (gitignored on disk) (7 classes: `small-tool`, `handheld`, `container`, `rack`, `instrument`, `large-equipment`, `zoom-view`; 146 object kinds mapped).

## 7. Output artifacts

Canonical output paths used by the diagnostic pipeline. All of `test-results/` is gitignored and regenerated on each run.

- Static template precheck: `test-results/new0_css_native/audit/visual_audit.json`, `test-results/new0_css_native/audit/visual_audit.md`, `test-results/new0_css_native/audit/sizing_manifest.json`, `test-results/new0_css_native/audit/*.png` per scene, `test-results/new0_css_native/audit/*_annotated.png` (when the optional annotator runs).
- Scorecard: `test-results/new0_css_native/scorecard/scorecard.json`, `test-results/new0_css_native/scorecard/scorecard.md`.
- Stress corpus output: under [stress_results/](stress_results/) by batch (for example `stress_results/precheck_batch5_corpus_v1/`, `stress_results/scorecard_batch5_corpus_v1/`).
- Spike DOM dump: `spike_fixtures/spike_rendered/` (well_plate_96_zoom_check.html plus screenshots; gitignored on disk).
- No-crop audit: [no_crop_audit/no_crop_audit_results.json](no_crop_audit/no_crop_audit_results.json) plus annotated PNGs under `test-results/`.

For the full source-of-truth list per column see [../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md](../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md) section 1.

## 8. Diagnostics

Diagnostic baseline at HEAD 8795d25 (baseline accepted commit 4e2c709, 2026-05-21), sourced from [../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md](../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md).

Headline numbers:

- 10 hand-authored templates at 1200x900 (precheck default): 0 hard fails. Verdict mix: 0 PASS, 4 PASS_TEMPLATE, 6 WARN, 0 FAIL.
- Same templates at production 1920x1080: only `well_plate_96_zoom` was re-measured through the built-app bridge; reports `hard_fail_count = 2` (1 off_page on rect 1920x1763 exceeding 1080, 1 svg_svg_overlap in the overflow region). The 1200x900 CSS fix does not generalize to 1920x1080.
- Stress corpus (100 generated scenes, seed 42, cap 40): 1043 hard fails across 100 scenes. 100% FAIL is STRESS-ONLY; evidence the generator produces valid stress cases, not that the layout is broken. Stress scenes are not pedagogically valid protocols.
- Scorecard (revised Lane C weights): 4 templates plus `well_plate_96_zoom` rank top 5 (90, 90, 90, 80, 70). Composition and dense scenes sit middle (47 to 64). `electrophoresis_bench` is the lowest at 47.
- Runtime proof (Lane B): 7 of 7 Playwright assertions pass for `well_plate_96_zoom` on the built bundle. Group-target validator preset fix is pending and touches a forbidden boundary; user decision required.

The hard-fail gate is reliable. The aggregate score (`632/1000`) is not calibrated against any external reference; treat as a relative comparison knob, not an absolute target.

Validator preset bug: `correct_target` currently uses strict string equality; group targets (`row_E`, `all_wells`, `gel_cassette.lane_1`) fail to match. The fix touches a forbidden-boundary file and is user-gated.

## 9. Current best results

See [../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md](../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md) and [../../docs/active_plans/active/layout_manager_clean_start/contact_sheet.html](../../docs/active_plans/active/layout_manager_clean_start/contact_sheet.html) for the full 4-column thumbnail index.

Top 5 best scenes (from `stress_results/precheck_b1_final/` at 1200x900; 0 hard fails on composition checks; real SVG; no `_placeholder.svg` substitution):

- `microscope_basic` (template class; PASS_TEMPLATE). The only PASS_TEMPLATE in the 10-template baseline. Single instrument centered, no overlap, no crops.
- `bench_basic` (template class). Well plate plus pipette at intended size; small decorative overlap only.
- `cell_counter_basic` (template class). Instrument fully visible; aspect-mismatch hard fail flagged on instrument body is the kind of defect the next manager should design against.
- `hood_basic` (template class). Three placements; clean reference for a 3-tool front-tools layout.
- `well_plate_96_zoom` (zoom_detail class). Primary ratio 88.7% at 1200x900; the canonical zoom reference.

## 10. Known failures

Sources: [../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md](../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md), [../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md](../../docs/active_plans/active/layout_manager_clean_start/scene_object_audit.md), [../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md](../../docs/active_plans/active/layout_manager_clean_start/diagnostics_baseline.md).

Worst 10 reference scenes (from `stress_results/precheck_post_trial5_gold/` plus two stress samples; multiple `clipped_by_parent` HARD FAILs and aspect-distorted HARD FAILs):

- 10 synthetic gold composition scenes under `precheck_post_trial5_gold/`. All 10 FAIL precheck.
- Two stress samples from `precheck_batch2_container_sweep_container_C2_400_292/` (dense_clutter and many_small_tools categories).

Per-template object failures (Lane B):

- `microscope_basic` -> wrong asset (`centrifuge_new.svg` instead of `microscope_new.svg`).
- `drug_dilution_plate_workspace` -> 3 wrong-asset bottle references plus 1 named-placeholder rack reference.
- `drug_dilution_workspace_dense` -> 5 wrong-asset bottles plus 2 problematic rack references.
- `electrophoresis_bench` -> 2 wrong-asset references (`recycle_buffer_bottle`, `serological_pipette`).
- Stress and gold scenes -> heavy use of `_placeholder.svg` substitution.

Production viewport overflow:

- `well_plate_96_zoom` at 1920x1080 has 2 hard fails. Rect measures 1920x1763. The 6-line CSS patch proposed in the archived NEW2 plan is not applied in the canonical baseline.

Validator preset:

- `correct_target` strict-string-equality means group targets fail. The fix is forbidden-boundary; user decision required.

## 11. How to add a new scene

The CSS-native pipeline is closed; adding a scene is composition of existing terms, not invention of new ones.

Steps:

1. Write a YAML scene manifest under [scenes/](scenes/) or follow the canonical schema at [../../docs/specs/SCENE_YAML_FORMAT.md](../../docs/specs/SCENE_YAML_FORMAT.md). The experiment-local YAMLs under [scenes/](scenes/) are not the production schema; for new work prefer the canonical schema.
2. Choose a region set from [regions/](regions/) (`bench`, `hood`, `instrument`, `bench_e`). The five closed region names are `rear_shelf`, `work_surface`, `front_tools`, `instrument_station`, `popup_layer`. Adding a region requires an RFC, not a YAML edit. At the move boundary, `region` becomes `zone` per [../../docs/specs/SCENE_VOCABULARY.md](../../docs/specs/SCENE_VOCABULARY.md).
3. Assign each object a footprint class from `object_footprints.yaml` (gitignored on disk). Seven closed classes. Use the existing 146 kind-to-footprint mappings as the reference set; an unmapped kind fails loudly. No silent `small-tool` fallback.
4. Declare the scene class in [scene_class_manifest.yaml](scene_class_manifest.yaml). Five closed classes. Scene class drives label policy, spacing policy, viewport policy, and acceptance thresholds; it is a dial, not an extension point.
5. Size objects per [../../docs/specs/SCALING_MODEL.md](../../docs/specs/SCALING_MODEL.md): each object YAML carries `layout.display_width_cm`; per-scene `px_per_cm` converts to pixels. The layout consumes the derived `width_scale`; do not hardcode pixel widths.
6. Author the SVG asset under `assets/equipment/` if it does not exist. Real SVGs only; no placeholder bubbles, empty outlines, or generic fallback blobs.
7. Run precheck and scorecard (see sections 12 and 14).

Vocabulary closure: do not invent new region names, footprint classes, or scene classes by editing YAML. Each extension is RFC-gated per [../../docs/specs/SPEC_DESIGN_CHECKLIST.md](../../docs/specs/SPEC_DESIGN_CHECKLIST.md).

## 12. How to run screenshots

Playwright must be installed first; see [../../docs/PLAYWRIGHT_USAGE.md](../../docs/PLAYWRIGHT_USAGE.md). The local helper [../../devel/setup_playwright.sh](../../devel/setup_playwright.sh) automates Chromium install when available.

Multi-viewport capture (1920x1080 and 800x600):

```
node experiments/css_native_layout/capture.mjs \
  --templates 'experiments/css_native_layout/templates/*.html' \
  --viewports 1920x1080,800x600
```

Bridge from runtime to static HTML (required for the production-viewport built-app gates):

```
node experiments/css_native_layout/render_and_dump.mjs \
  --scene well_plate_96_zoom \
  --out experiments/css_native_layout/spike_fixtures/spike_rendered/
```

Annotated precheck PNGs (when the optional `_temp_annotate.py` helper is present):

```
bash experiments/css_native_layout/run_precheck.sh
```

Screenshots land under `test-results/new0_css_native/audit/<scene>.png` (and `<scene>_annotated.png` when annotation runs). The `test-results/` tree is gitignored.

## 13. How to run no-crop checks

The no-crop rule is a hard contract item from [../../docs/PRIMARY_DESIGN.md](../../docs/PRIMARY_DESIGN.md) visual-integrity section: a scene cannot pass visual review if any scientific SVG asset is cropped or aspect-distorted enough to change what the object is.

Run the focused crop detector:

```
node experiments/css_native_layout/no_crop_audit/inspect.mjs
```

This emits annotated PNGs that mark `clipped_by_parent` and `aspect_distorted` violations plus a [no_crop_audit/no_crop_audit_results.json](no_crop_audit/no_crop_audit_results.json) update.

Status of the no-crop checks today:

- `clipped_artwork` (parent overflow) is a precheck HARD FAIL.
- `clipped_by_parent` and `aspect_distorted_HF` are precheck advisory only. A Phase 1 proposal to fold them into the hard-fail gate is pending user decision.

Lane B placeholder leaks (must not pass no-crop intent even when the placeholder rectangle technically fits its card):

- The named tracked placeholder `microtube_rack_24_placeholder.svg` is referenced by [templates/drug_dilution_plate_workspace.html](templates/drug_dilution_plate_workspace.html), [templates/drug_dilution_workspace_dense.html](templates/drug_dilution_workspace_dense.html), and three showcase HTML files.
- The fallback `_placeholder.svg` (dashed-border rectangle, 100x100) is heavily substituted by `render_stress_to_html.py` in stress and gold scenes.

Neither placeholder is acceptable in production renders.

## 14. How to make a report

A reportable round chains precheck, scorecard, screenshots, and a markdown writeup. The canonical worked example is the contact-sheet bundle at [../../docs/active_plans/active/layout_manager_clean_start/contact_sheet.html](../../docs/active_plans/active/layout_manager_clean_start/contact_sheet.html) (paired with [../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md](../../docs/active_plans/active/layout_manager_clean_start/screenshot_gallery.md)).

Steps:

1. Regenerate the baseline:
   ```
   bash experiments/css_native_layout/run_precheck.sh
   node experiments/css_native_layout/score_layout.mjs
   ```
2. Capture multi-viewport screenshots:
   ```
   node experiments/css_native_layout/capture.mjs \
     --templates 'experiments/css_native_layout/templates/*.html' \
     --viewports 1920x1080,800x600
   ```
3. For production-viewport evidence on the spike scene:
   ```
   bash experiments/css_native_layout/run_built_app_precheck.sh
   ```
4. Write a markdown summary that links the screenshots, cites `visual_audit.md` and `scorecard.md`, and notes what changed against the prior baseline. Save the report under `docs/active_plans/active/<topic>/` so the next manager can find it. Use the screenshot gallery's structure (best N, worst N, source rounds chosen, methodology) as the template.
5. Do not modify the diagnostic tools to flatter the result. Two prior gaming attempts were caught and reverted. The only canonical, unmodified diagnostic output is admissible as evidence.

## 15. First productionization milestone

The full architecture extraction recipe (M0 through M6) lives in [../../docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md](../../docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md). The two anchor milestones for the next manager:

- M0 (recommended first; from [../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md](../../docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md) section 8): regenerate the diagnostic baseline against the experiments folder at HEAD, confirm the numbers in the onboarding bundle still hold, and write `m0_baseline_delta_report.md`. M0 is read-only. No CSS edits, no adapter edits, no script edits, no contract amendments. The goal is to verify the onboarding bundle reflects the repo state the next manager actually inherits.
- M1a (recommended after M0; from [../../docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md](../../docs/active_plans/active/layout_manager_clean_start/architecture_extraction_plan.md) and [../../docs/active_plans/active/layout_manager_clean_start/experiments_code_triage.md](../../docs/active_plans/active/layout_manager_clean_start/experiments_code_triage.md) section 7): rebuild the minimum production layout-manager skeleton under `src/scene_runtime/layout/` that compiles, type-checks, and renders the `well_plate_96_zoom` scene end-to-end. M1a uses canonical `zone` vocabulary (not `region`), drops the "Not production schema" header on the promoted YAML data files, and lands one Playwright spike that asserts on a `zone` rather than a `region`.

Order: M0 ships first; M1a opens only after M0 lands. The user-gated decision queue (PRIMARY_CONTRACT.md item 3 amendment, Phase 1 `hardFailCount` semantics, validator preset edit, binary artifact policy) opens between M0 and M1a; the next manager does not resolve those decisions, the user does.
