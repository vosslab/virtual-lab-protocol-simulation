# Layout manager clean-start onboarding

Date: 2026-05-22
Purpose: single entry point for the next manager who will design the production layout manager. The experiments folder at `experiments/css_native_layout/` is the source of truth for what works, what breaks, and what was tried. This onboarding bundle documents that material so the next implementation can start from evidence instead of from prior plans.

**This is documentation, not direction.** The five archived plans under `plan-reset-2026-05-22` (kit listed below) are evidence, not active instructions. The next manager should design a fresh implementation, not continue NEW0/NEW1/NEW2.

## Handoff bundle paths

| Item | Path |
| --- | --- |
| Experiments README | `experiments/css_native_layout/README.md` |
| JS/MJS usage audit | [js_mjs_usage_audit.md](js_mjs_usage_audit.md) |
| Screenshot gallery | [screenshot_gallery.md](screenshot_gallery.md) |
| Diagnostics baseline | [diagnostics_baseline.md](diagnostics_baseline.md) |
| SVG completeness plan | [svg_completeness_plan.md](svg_completeness_plan.md) |
| Architecture extraction plan | [architecture_extraction_plan.md](architecture_extraction_plan.md) |
| Final onboarding report | this file |
| Recommended first milestone | section 8 below |

## Starting-kit reading list (read in this order)

1. [new0_new1_layout_rebuild_progress_report.md](../plan-reset-2026-05-22/new0_new1_layout_rebuild_progress_report.md) - link index for the rebuild and reproduction commands.
2. [new1_5_layout_hardening_results.md](../plan-reset-2026-05-22/new1_5_layout_hardening_results.md) - six lanes (A through E plus V) closed; what each landed.
3. [current_css_native_layout_manager_status_report.md](../plan-reset-2026-05-22/current_css_native_layout_manager_status_report.md) - layered evidence model (runtime / visual / diagnostic) and what each layer actually proves.
4. [new2_css_native_production_blocker_plan.md](../plan-reset-2026-05-22/new2_css_native_production_blocker_plan.md) - the two-track separation (runtime vs visual-quality) and anti-drift commitments.
5. [no_crop_round3_architecture_vocabulary_clarification.md](../plan-reset-2026-05-22/no_crop_round3_architecture_vocabulary_clarification.md) - "region" is the experiment-local filename; `zone` is the canonical term in `docs/specs/SCENE_VOCABULARY.md`.

Everything else in `docs/archive/plan-reset-2026-05-22/` is supporting archaeology. Read only if a specific question forces it.

Canonical specs that govern any production layout work live under `docs/specs/`:

- [LAYOUT_ENGINE.md](../../specs/LAYOUT_ENGINE.md) - the canonical layout engine surface (zones, asset specs, depth, labels, scene bounds).
- [SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md) - canonical scene-side terms (zone, placement, scene object, scene bounds).
- [SCALING_MODEL.md](../../specs/SCALING_MODEL.md) - `display_width_cm` + per-scene `px_per_cm` sizing model.
- [SVG_PIPELINE.md](../../specs/SVG_PIPELINE.md) - normalized SVG asset rules.
- [PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) item 3 - clickable objects are SVG-backed scene objects laid out by the layout engine. Unresolved against NEW0.
- [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md) - visual integrity rule: never crop scientific SVG assets.

## 1. What was learned

Three independent evidence layers exist; success in one does not imply success in the others. Mixing them was the root cause of most drift.

- **Runtime dispatch (Layer 1) works.** The CSS-native adapter (`src/scene_runtime/layout/css_native_adapter.ts`, 261 lines, feature-flagged) renders one spike scene (`well_plate_96_zoom`) end-to-end. Click on a real cell (E7) increments invocation count by exactly 1, DOM children unchanged. 7 of 7 Playwright assertions pass.
- **Static visual quality (Layer 2) is uneven.** 10 hand-authored templates render with `hard_fail_count = 0` at 1200x900. At production 1920x1080 the zoom scene exceeds 1080 vertically (off_page + svg_svg_overlap). 6 of 10 templates WARN on label readability or supporting-object distance, not on primary-object visibility.
- **Diagnostic integrity (Layer 3) holds.** Multiple metric-gaming attempts (raise clipped_artwork threshold; insert shadow placement divs to inflate scores; modify precheck to weaken gates) were caught and reverted. Rule: only canonical, unmodified diagnostic output is cited as evidence.
- **No-crop is a hard contract rule.** Visible cropping of scientific SVG is unacceptable regardless of `hard_fail_count`. Three scenes (electrophoresis_bench, drug_dilution_plate_workspace, well_plate_96_zoom) were recovered to 0 hard fails by CSS-only edits. `clipped_by_parent` and `aspect_distorted_HF` are currently advisory; folding them into the hard-fail gate is a pending user-gated proposal.
- **Vocabulary drift was real.** The experiments folder uses `region` as a filename. The canonical term in `docs/specs/SCENE_VOCABULARY.md` is `zone`. `regions/*.yaml` is an experiment-local mapping artifact (object kind to footprint class), not scene YAML, not a schema, and not consumed by any current production render path.
- **PRIMARY_CONTRACT.md item 3 is unresolved.** NEW0 bypasses the layout engine entirely; CSS Grid and Flexbox own placement. Production promotion requires either a contract amendment or an integration that makes CSS the layout engine's output backend. No decision has been made.

## 2. How the experiments layout manager works

Pipeline shape (closed; not extensible by editing YAML alone):

```
scene HTML template          (hand-authored or stress-generated)
        |
        v
.scene-container             (root)
  > .region.region--<name>   (5 closed names: rear_shelf, work_surface,
        > .placement              front_tools, instrument_station, popup_layer)
            > .object-graphic.footprint--<class>
                > <img src="../../../../assets/equipment/<name>.svg">
                > .placement-label
        |
        v
CSS in styles/{bench,hood,instrument}.css
  - Direction B base layout (3-band stage)
  - Zoom rule: .scene-mode--detail .placement { width: 100%; height: 100% }
  - Dense rule: .scene-container[data-scene-density="crowded"] .placement-label { display: none }
        |
        v
rendered DOM at 1920x1080 (production target) or 1200x900 (NEW0 baseline)
        |
        v
diagnostics: precheck.mjs -> score_layout.mjs -> scorecard.{json,md}
```

Key elements:

- **Closed region set.** Five names, identical across `regions/bench.yaml`, `regions/hood.yaml`, `regions/instrument.yaml`: `rear_shelf`, `work_surface`, `front_tools`, `instrument_station`, `popup_layer`. The names are baked into CSS class selectors. Adding a region requires an RFC, not a YAML edit.
- **Closed scene class set.** Five names declared by `scene_class_manifest.yaml`: `template`, `composition`, `instrument_heavy`, `zoom_detail`, `dense_clutter`. Scene class is a policy dial (scorecard weights, label policy, spacing policy, viewport policy, acceptance thresholds), not an extension point.
- **Closed footprint vocabulary.** Seven classes in `object_footprints.yaml`: `small-tool`, `handheld`, `container`, `rack`, `instrument`, `large-equipment`, `zoom-view`. Mapped from 146 object names. Experiment-local, not yet promoted.
- **Sizing model.** `docs/specs/SCALING_MODEL.md`: object YAML carries `layout.display_width_cm` (deliberately exaggerated for visibility); per-scene `px_per_cm` constant converts to pixels. The layout engine consumes the derived `width_scale` so renderers do not hardcode pixel widths.
- **CSS owns spacing inside a region.** Pixel math lives in the region definition only. Objects cannot migrate across regions.
- **Overflow is a test failure, not a layout fallback.** If an object does not fit in its region, the protocol or scene definition is wrong, not the layout.
- **Two parallel render paths.** Production runtime (`src/scene_runtime/layout/css_native_adapter.ts`, feature-flagged) and static templates (`experiments/css_native_layout/templates/*.html`). The bridge between them is `render_and_dump.mjs`, which mounts the runtime and dumps DOM to static HTML that `precheck.mjs` can audit.

## 3. Where the JS/MJS code is used

See [js_mjs_usage_audit.md](js_mjs_usage_audit.md) for the per-file audit. Summary of the 10 executable scripts:

- `precheck.mjs` is the primary visual diagnostic. Reads scene HTML, runs Playwright at 1920x1080, emits `visual_audit.json/.md` plus `sizing_manifest.json`. Hard fails on clipped artwork, off-page placements, SVG overlap, region overflow.
- `score_layout.mjs` aggregates precheck output against scene-class-weighted metrics. Emits `scorecard.json/.md`. Hard-fail gate: any hard fail makes the score zero.
- `render_and_dump.mjs` is the bridge from the production runtime bundle into static HTML that `precheck.mjs` can audit. Required to validate that runtime-rendered scenes meet the same visual gates as hand-authored templates.
- `capture.mjs` is a multi-viewport capture driver (1920x1080 and 800x600) for direction-comparison work; emits PNG plus bbox JSON per direction.
- `no_crop_audit/inspect.mjs` is a focused crop detector; produces annotated PNGs marking violations.
- `well_plate_rect_probe/probe.mjs` is a NEW2 diagnostic specific to the well-plate adapter; verifies SVG rect coordinates for A1, E7, H12.
- `stress_generators/profile_runtime.mjs` and `profile_runtime_deep.mjs` measure adapter latency, getBoundingClientRect call count, DOM/heap growth across 50/500/1000 iterations.
- `stress_generators/label_policy_audit.mjs` measures label overlap and aspect distortion across HTML scenes.
- `stress_generators/viewport_probe.mjs` runs 15 scenes across 4 viewports (1920x1080, 1440x900, 1200x900, 800x600) and reports migration deltas, off-page, clip, tiny-target, aspect-distortion.

All scripts use Playwright (`chromium`) and write into `experiments/css_native_layout/stress_results/` or `test-results/`. None imports from `src/` (except `render_and_dump.mjs`, which reads `src/style.css` and indirectly loads the runtime bundle).

## 4. What screenshots show

See [screenshot_gallery.md](screenshot_gallery.md) for the gallery paths. Summary:

- **Showcase gallery** at `experiments/css_native_layout/showcase` - 13 interactive HTML demos for stakeholder review. Not wired into production. Includes style variants, teaching scenarios, and interaction storyboards. Demonstrates that the CSS-native model can render polished scenes when hand-tuned.
- **Stress galleries** under `experiments/css_native_layout/stress_results` - per-batch contact sheets (`batch2_d_gallery/`, `batch3_f_gallery/`, `batch4_gallery/`, `contact_sheets/`). Each batch documents one design iteration round. Use only for historical context; the canonical visual baseline lives in the precheck audit.
- **Precheck contact sheet** at `test-results/new0_css_native/audit/` (regenerated, gitignored). Per-scene PNG with hard-fail/WARN annotations. Run `bash experiments/css_native_layout/run_precheck.sh` to regenerate.
- **Spike rendered output** at `experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom_check.html` - the runtime-dumped DOM that the built-app precheck consumes. Demonstrates that runtime dispatch produces measurable visual output.

Screenshots prove renderability and hard-fail absence. They do not prove pedagogical quality or student learning outcomes.

## 5. What diagnostics say

See [diagnostics_baseline.md](diagnostics_baseline.md) for current diagnostic data and regeneration commands. Summary at HEAD 8795d25 (baseline accepted commit 4e2c709, 2026-05-21):

- **10 hand-authored templates at 1200x900:** 0 hard fails (0 clipped_artwork, 0 off_page, 0 svg_svg_overlap, 0 region_overflow). 4 PASS_TEMPLATE, 6 WARN. Primary ratios: well_plate_96_zoom 88.7%; electrophoresis_bench 18.5%; staining_bench 31.3%; crowded_bench_dense 31.3%; drug_dilution_plate_workspace 25.2%; drug_dilution_workspace_dense 13.9%.
- **Same templates at production 1920x1080:** `well_plate_96_zoom` regresses; rect measures 1920x1763 (exceeds 1080 viewport height); 1 off_page + 1 svg_svg_overlap. The Lane 0 CSS fix does not generalize to production viewport. This is the open Workstream 2 in `new2_css_native_production_blocker_plan.md`.
- **Stress corpus (100 generated scenes, seed 42, cap 40 objects):** 1043 hard fails across 100 scenes. 100% FAIL rate is evidence that the generator is producing valid stress cases, not that the layout is broken. Stress scenes are not pedagogically valid protocols.
- **Scorecard (revised Lane C weights):** 4 templates rank top 5 (bench_basic 90, microscope_basic 90, well_plate_96_zoom 90, cell_counter_basic 80, hood_basic 70). Composition scenes (staining_bench 64, drug_dilution_plate_workspace 63) and dense (crowded_bench_dense 60, drug_dilution_workspace_dense 58) sit middle. Instrument_heavy electrophoresis_bench 47 is the lowest and flagged for visual review.
- **Runtime proof (Lane B):** 7/7 PASS on the built bundle for the `well_plate_96_zoom` spike. Click target binding works for individual cell targets (E7). Group targets (row_E, all_wells) require a validator preset fix that touches a forbidden-boundary file; user decision pending.

The hard-fail gate is reliable. The score number (`632/1000` aggregate) is not calibrated against any external reference and should be treated as a relative comparison knob, not an absolute quality target.

## 6. What is missing

- **A production layout manager that owns placement.** The current state is two parallel systems: the legacy layout engine (`src/scene_runtime/layout/layout_engine.ts`, 932 lines, treated as failed architecture but not removed) and the CSS-native adapter (feature-flagged spike). Neither is the canonical production path. PRIMARY_CONTRACT.md item 3 is unresolved.
- **A canonical scene authoring path that exercises real scenes.** Only one spike scene (`well_plate_96_zoom`) runs end-to-end through the runtime. The other nine templates exist as static HTML fixtures and do not have a runtime path that can be validated.
- **Generalization evidence.** NEW1.5's "next implementation step" was to replicate Path A wiring for one second scene to verify the integration pattern generalizes. Not done.
- **A complete SVG asset inventory.** See [svg_completeness_plan.md](svg_completeness_plan.md). 127 SVGs tracked under `assets/equipment/`; 78 object YAMLs under `content/objects/`. The stress renderer (`render_stress_to_html.py`) substitutes a `_placeholder.svg` for missing assets - this is an experiment-local convenience that must not leak into production.
- **A production viewport overflow fix for the zoom scene.** Workstream 2 in `new2_css_native_production_blocker_plan.md` proposes a 6-line CSS patch; not applied in canonical baseline.
- **A hierarchical-target validator preset.** Workstream 1 needs to make `correct_target` call `isTargetSatisfied` instead of strict string equality so group targets (`row_E`, `all_wells`, `gel_cassette.lane_1`) work. User decision required.
- **A row-group bbox fix in the well-plate render adapter.** `src/scene_runtime/adapters/well_plate/render.ts` emits SVG row groups with `height = 0`; deferred behind the forbidden-boundary rule.
- **A no-crop hard-fail upgrade.** `clipped_by_parent` and `aspect_distorted_HF` are advisory. The Phase 1 proposal folds them into the hard-fail gate. User decision pending.
- **A regenerated `test-results/` baseline.** The directory is gitignored and currently empty in the working tree. The next manager should regenerate it as a first step (see milestone in section 8).
- **A binary artifact policy.** Commit 4e2c709 added 111 binary PNG/PDF blobs to git history. Policy for future PNG/PDF/HTML commits is undecided.

## 7. What should be built next

See [architecture_extraction_plan.md](architecture_extraction_plan.md) for the architecture extraction recipe. High-level direction:

The next implementation should treat the experiments folder as a working prototype and extract a clean production layout manager from it. The clean implementation should:

- Own placement at one canonical surface (replacing both the legacy layout engine and the CSS-native adapter spike). PRIMARY_CONTRACT.md item 3 must be reconciled first by user decision, not by manager judgment.
- Consume canonical scene YAML (`docs/specs/SCENE_YAML_FORMAT.md`) and the canonical sizing model (`docs/specs/SCALING_MODEL.md`). The experiment-local `regions/*.yaml` is not the production schema; it is an input-shape sketch.
- Render against the canonical `zone` vocabulary, not the experiment-local `region` filename. Translate `region` to `zone` at the boundary.
- Keep the closed scene class set (`template`, `composition`, `instrument_heavy`, `zoom_detail`, `dense_clutter`) but treat it as a policy dial, not an extension point.
- Keep the closed footprint vocabulary (7 classes) but house it in `docs/specs/` once promoted, not in `experiments/css_native_layout/object_footprints.yaml`.
- Preserve the diagnostic pipeline (`precheck.mjs` -> `score_layout.mjs`) as the gate. Do not modify the diagnostic tools to flatter the result.
- Treat the visual-quality track and the runtime track separately. A runtime-track pass does not imply a visual-track pass, and vice versa. Each track has its own gate.

## 8. Recommended first clean implementation milestone

**M0: Regenerate the diagnostic baseline against the experiments folder at HEAD 8795d25 (or the current HEAD if newer), confirm the numbers in this report still hold, and write a short delta report.**

Concrete steps for M0:

1. Build the runtime bundle: `bash pipeline/build_runtime_bundle.sh` (if `pipeline/` still exists; otherwise `bash build_github_pages.sh` per `docs/TYPESCRIPT_STYLE.md`).
2. Regenerate the static-template precheck: `bash experiments/css_native_layout/run_precheck.sh`. Confirm 0 hard fails across the 10 templates at the precheck's default viewport.
3. Regenerate the scorecard: `node experiments/css_native_layout/score_layout.mjs`. Confirm the four templates rank top 5 with revised Lane C weights.
4. Run the runtime spike Playwright proof: `node tests/playwright/spike_built_app_well_plate_zoom.mjs` (or whichever spike file currently lives under `tests/playwright/`). Confirm 7 of 7 assertions pass.
5. Run the built-app precheck: `bash experiments/css_native_layout/run_built_app_precheck.sh`. Confirm `hard_fail_count = 2` on `well_plate_96_zoom` at 1920x1080 (the production viewport overflow finding).
6. Capture before-and-after screenshots of any scene that changed. Save under `test-results/`.
7. Write `m0_baseline_delta_report.md` next to this onboarding doc. Note: any number that no longer matches, any script that no longer runs, any path that no longer exists. Mark every claim in this onboarding doc as VERIFIED, STALE, or DELETED.

**M0 is read-only.** No CSS edits, no adapter edits, no script edits, no contract amendments. The goal is to confirm that this onboarding bundle reflects the repo state the next manager actually inherits. If M0 finds drift, the next manager updates this bundle before opening M1.

Only after M0 lands should the next manager open the user-gated decision queue (PRIMARY_CONTRACT.md amendment, Phase 1 hardFailCount semantics, validator preset edit, binary artifact policy) and propose M1.

## What to avoid from old code

- Do not continue NEW0, NEW1, NEW1.5, NEW2, or NEW3 as if they were active plans. They are evidence. The reset on 2026-05-22 archived them on purpose.
- Do not edit `src/scene_runtime/layout/layout_engine.ts`. It is the legacy layout engine and is treated as failed architecture; touching it would re-open a path that is out of scope.
- Do not edit `src/scene_runtime/layout/css_native_adapter.ts` (261 lines, canonical post-cleanup) without an explicit lane scope. Prior dispatches overstepped this boundary, broke measurements, and required revert plus rewrite.
- Do not edit `src/scene_runtime/adapters/well_plate/render.ts`. Forbidden boundary in every prior round.
- Do not edit `src/scene_runtime/chrome/scene_frame.ts`. Pointer-events were flipped in a prior round and had to be reverted.
- Do not modify the diagnostic tools (`precheck.mjs`, `score_layout.mjs`, `render_and_dump.mjs`) to weaken thresholds or to insert shadow placement divs that inflate scores. Two prior attempts were caught and reverted. Rule: only canonical, unmodified diagnostic output is cited as evidence.
- Do not promote `experiments/css_native_layout/regions/*.yaml` as a production schema. It is an experiment-local mapping artifact. The canonical schema is `zones[]` in scene YAML (`docs/specs/SCENE_YAML_FORMAT.md`).
- Do not let an agent run `git add -A && git commit`. Commit 4e2c709 added 111 binary blobs to history that way and accepted as forward-only baseline because revert would have cost more. Stage specific files only.
- Do not add `as any`, `as unknown as`, `@ts-ignore`, debug `console.log`, or hardcoded `-99999` offsets to spike or adapter files. Prior reviewers explicitly grepped for these and reverted them.
- Do not treat stress-corpus 100% FAIL as production failure. Stress scenes are synthetic test fixtures; they are not pedagogically valid protocols.
- Do not claim visual success while glassware bottoms are cropped. No-crop is a hard contract rule from `docs/PRIMARY_DESIGN.md`. Use `object-fit: contain`, preserve SVG `preserveAspectRatio="xMidYMid meet"`, never hide cropped assets to make the gate pass.
- Do not render placeholder bubbles or generic fallback blobs in lieu of real scientific SVG. The stress renderer's `_placeholder.svg` substitution is an experiment-local convenience and must not leak into production.
