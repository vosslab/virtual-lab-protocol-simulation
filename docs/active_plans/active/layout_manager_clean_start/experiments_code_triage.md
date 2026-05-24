# Experiments code triage for layout manager clean start

Date: 2026-05-22
Status: read-only audit, no code changes proposed in this doc
Scope: classify every notable artifact under [experiments/css_native_layout/](../../../../experiments/css_native_layout/) so the next manager can extract a production layout manager without re-litigating what each file is for.

The companion document is [ONBOARDING.md](ONBOARDING.md). Where this doc and the onboarding bundle disagree, the onboarding wins; this doc only triages the source tree.

Inputs cited:
- [docs/PRIMARY_CONTRACT.md](../../../PRIMARY_CONTRACT.md) item 3 (layout engine owns placement).
- [docs/specs/SCENE_VOCABULARY.md](../../../specs/SCENE_VOCABULARY.md) (`zone` is canonical; `region` is shadow).
- [docs/specs/LAYOUT_ENGINE.md](../../../specs/LAYOUT_ENGINE.md) (canonical layout surface).
- [docs/archive/plan-reset-2026-05-22/new1_5_layout_hardening_results.md](../../../archive/plan-reset-2026-05-22/new1_5_layout_hardening_results.md) "Next implementation step" section.
- [docs/archive/plan-reset-2026-05-22/no_crop_round3_architecture_vocabulary_clarification.md](../../../archive/plan-reset-2026-05-22/no_crop_round3_architecture_vocabulary_clarification.md) (regions vs object_footprints rename).

Current state of `src/` at HEAD: the directory exists but is empty. The reset wiped the prior `src/scene_runtime/` tree. Every path under `src/scene_runtime/...` mentioned by the onboarding bundle is a historical reference, not a present file. The triage below assumes the next manager rebuilds `src/scene_runtime/layout/` from scratch and treats the experiments tree as evidence.

## 1. Triage summary table

| Path | Category | Recommendation | Rationale |
| --- | --- | --- | --- |
| [experiments/css_native_layout/precheck.mjs](../../../../experiments/css_native_layout/precheck.mjs) | diagnostic | stay diagnostic-only | 1692 LOC Playwright visual auditor; gates depend on its unmodified output |
| [experiments/css_native_layout/score_layout.mjs](../../../../experiments/css_native_layout/score_layout.mjs) | diagnostic | stay diagnostic-only | 649 LOC scorecard aggregator; consumes precheck output |
| [experiments/css_native_layout/render_and_dump.mjs](../../../../experiments/css_native_layout/render_and_dump.mjs) | bridge | stay diagnostic-only, move to `tools/` later | 706 LOC bridge from production runtime to precheck input |
| experiments/css_native_layout/capture.mjs | diagnostic | stay diagnostic-only | 380 LOC multi-viewport screenshot driver |
| [experiments/css_native_layout/no_crop_audit/inspect.mjs](../../../../experiments/css_native_layout/no_crop_audit/inspect.mjs) | diagnostic | stay diagnostic-only | 263 LOC focused crop detector; complements precheck |
| experiments/css_native_layout/well_plate_rect_probe/probe.mjs | diagnostic | stay diagnostic-only | 617 LOC well-plate-specific sub-target rect probe |
| `experiments/css_native_layout/stress_generators/profile_runtime*.mjs` | diagnostic | stay diagnostic-only | 1455 LOC combined (745+710); adapter latency + DOM growth probes |
| experiments/css_native_layout/stress_generators/label_policy_audit.mjs | diagnostic | stay diagnostic-only | 181 LOC; label overlap + aspect distortion |
| experiments/css_native_layout/stress_generators/viewport_probe.mjs | diagnostic | stay diagnostic-only | 625 LOC; cross-viewport migration measurement |
| [experiments/css_native_layout/stress_generators/generate_stress_scenes.py](../../../../experiments/css_native_layout/stress_generators/generate_stress_scenes.py) | diagnostic | stay diagnostic-only | 555 LOC; deterministic-seed stress scene factory |
| `experiments/css_native_layout/stress_generators/{render_with_label_policy,build_batch1_contact_sheets,verify_no_coord_fields,proposal_phase1_dryrun}.py` | diagnostic | stay diagnostic-only or delete | 1188 LOC across 4 files; tooling for specific historical batches |
| [experiments/css_native_layout/styles/bench.css](../../../../experiments/css_native_layout/styles/bench.css), [hood.css](../../../../experiments/css_native_layout/styles/hood.css), [instrument.css](../../../../experiments/css_native_layout/styles/instrument.css) | production-candidate | move into the production CSS bundle | 1010 LOC total; the canonical 3-band stage rules |
| `experiments/css_native_layout/styles/{bench,hood,instrument}_{a,b,c,d,e,diorama,focusedstage,gameboard}.css` plus `dir_b_*.css`, `dir_c_*.css` (28 files) | reference variant | delete after archival snapshot | direction-comparison artifacts; no production candidate |
| experiments/css_native_layout/templates/*.html (10 files, flat) | production-candidate | move to `tests/fixtures/scene_layout/` or `tools/layout_preview/` | hand-authored canonical fixtures, 0 hard fails at 1200x900 |
| [experiments/css_native_layout/templates/dir_b/](../../../../experiments/css_native_layout/templates/dir_b/), [dir_c/](../../../../experiments/css_native_layout/templates/dir_c/) (20 files) | reference variant | delete | direction-variant fixtures kept only to compare against the canonical 10 |
| experiments/css_native_layout/regions/*.yaml (4 files) | shadow vocabulary | rename, gut, or delete; do not promote | `region` is not canonical; `kind_to_footprint` is consumed by no current render path |
| experiments/css_native_layout/object_footprints.yaml | proposed canonical | promote (after RFC) to `docs/specs/` or `src/scene_runtime/layout/data/` | closed footprint vocabulary; 7 classes; 146 object kinds mapped |
| [experiments/css_native_layout/scene_class_manifest.yaml](../../../../experiments/css_native_layout/scene_class_manifest.yaml) | proposed canonical | promote (after RFC) to `docs/specs/` | closed scene class enum; 10 scenes classified |
| [experiments/css_native_layout/showcase/](../../../../experiments/css_native_layout/showcase/) | demo gallery | move to `docs/showcase/` or delete | 13 stakeholder demos; not wired to runtime |
| experiments/css_native_layout/stress_scenes/, [stress_results/](../../../../experiments/css_native_layout/stress_results/) | stress corpus | retain in place but gitignore the heavy directories | 100% FAIL synthetic corpus; historical evidence, not pedagogy |
| [experiments/css_native_layout/spike_paths/](../../../../experiments/css_native_layout/spike_paths/) (Path A/B/C) | decision evidence | move to `docs/archive/plan-reset-2026-05-22/spike_paths/` | three written prototype sketches; Path A was chosen |
| [experiments/css_native_layout/spike_fixtures/](../../../../experiments/css_native_layout/spike_fixtures/) | runtime contract | move into `tests/fixtures/well_plate_96_zoom/` | DOM contract + manifest for the one wired spike scene |
| experiments/css_native_layout/trial_logs/ | decision evidence | delete | Lane E per-trial notes; closed and rolled up in NEW1.5 results |
| [experiments/css_native_layout/scenes/](../../../../experiments/css_native_layout/scenes/) (2 yaml) | reference fixture | delete unless wired | only two hand-authored YAMLs, both for dense scenes; templates carry the canonical examples |
| experiments/css_native_layout/_batch3_f_gallery_builder.py, _batch3_f_html_generator.py | dead | delete | 605 LOC of leading-underscore one-shot batch tooling; never imported by canonical scripts |
| experiments/css_native_layout/render_stress_to_html.py | dead | delete | 345 LOC; WS-D audit found it is the only consumer of `kind_to_footprint` and is missing from git history; the working-tree copy is untracked drift |
| [experiments/css_native_layout/run_built_app_precheck.sh](../../../../experiments/css_native_layout/run_built_app_precheck.sh), [run_precheck.sh](../../../../experiments/css_native_layout/run_precheck.sh) | runner | move to `tools/` or keep in place | 79 LOC each; thin wrappers around `node` invocations |
| `experiments/css_native_layout/{README,PRECHECK_USAGE,PRECHECK_SUMMARY,LAYOUT_SCORECARD,DECISION_MEMO,DIAGNOSTICS_REFERENCE,VISUAL_TARGETS}.md` | doc | keep in place | reference docs that the diagnostic scripts and the next manager cite |

## 2. Move-to-production

These artifacts are candidates for the new `src/scene_runtime/layout/` (or `tests/fixtures/`) tree once the next manager opens M1.

- [experiments/css_native_layout/styles/bench.css](../../../../experiments/css_native_layout/styles/bench.css), [hood.css](../../../../experiments/css_native_layout/styles/hood.css), [instrument.css](../../../../experiments/css_native_layout/styles/instrument.css). Target: `src/style.css` (single bundle) or `src/scene_runtime/layout/styles/`. Carries the canonical 3-band stage rules, the zoom-mode rule, and the dense-mode hide-labels rule from NEW1.5 Lane D. Total 1010 LOC. Translate `region--<name>` selectors to `zone--<name>` at the move boundary to align with `SCENE_VOCABULARY.md`.
- experiments/css_native_layout/templates/*.html (10 canonical files only). Target: `tests/fixtures/scene_layout/` (preferred) or `tools/layout_preview/`. They are the only known-good static visual baselines (0 hard fails at 1200x900). They are not wired to the runtime; they are reference HTML the precheck consumes.
- experiments/css_native_layout/object_footprints.yaml. Target after RFC: `docs/specs/OBJECT_FOOTPRINTS.md` (vocabulary doc) plus `src/scene_runtime/layout/data/object_footprints.yaml` (runtime input). Promotion is user-gated, not manager-gated. The header comment "Not production schema" stays in place until promotion lands.
- [experiments/css_native_layout/scene_class_manifest.yaml](../../../../experiments/css_native_layout/scene_class_manifest.yaml). Target after RFC: `docs/specs/SCENE_CLASS_MANIFEST.md` and `src/scene_runtime/layout/data/scene_class_manifest.yaml`. Same promotion gate as object_footprints.
- [experiments/css_native_layout/spike_fixtures/](../../../../experiments/css_native_layout/spike_fixtures/) (the manifest, expected DOM selectors, expected screenshot paths). Target: `tests/fixtures/well_plate_96_zoom/`. The DOM contract is what Playwright spike tests assert against.

Promotion checklist for each item:
- Rename `region` -> `zone` at every author-facing surface (CSS class selectors, YAML keys, doc text).
- Strip the experimental-only "Not production schema" headers when the file lands in `docs/specs/`.
- Update any path-shaped imports in the diagnostic scripts that still read from `experiments/css_native_layout/` so the experiments tree can be retired.

## 3. Stay diagnostic-only

These files prove things about a build. They are not shipped to students. They live under `experiments/` (or, after a follow-up consolidation, `tools/diagnostics/`) indefinitely.

- [experiments/css_native_layout/precheck.mjs](../../../../experiments/css_native_layout/precheck.mjs). Primary visual gate. The "only canonical, unmodified diagnostic output is cited as evidence" rule from the onboarding bundle binds the next manager to leave this file untouched.
- [experiments/css_native_layout/score_layout.mjs](../../../../experiments/css_native_layout/score_layout.mjs). Scorecard aggregator. Weights are calibrated, not absolute; treat the score as a relative knob.
- [experiments/css_native_layout/render_and_dump.mjs](../../../../experiments/css_native_layout/render_and_dump.mjs). Bridge between runtime and precheck. Required to validate that runtime-rendered scenes meet the same visual gates as hand-authored templates.
- experiments/css_native_layout/capture.mjs. Multi-viewport capture driver.
- [experiments/css_native_layout/no_crop_audit/inspect.mjs](../../../../experiments/css_native_layout/no_crop_audit/inspect.mjs). Focused crop detector. Complements precheck for the no-crop hard rule.
- experiments/css_native_layout/well_plate_rect_probe/probe.mjs. Well-plate-specific rect probe.
- [experiments/css_native_layout/stress_generators/](../../../../experiments/css_native_layout/stress_generators/) (the four `.mjs` files plus `generate_stress_scenes.py`). Stress corpus generation + adapter profiling.
- [experiments/css_native_layout/run_precheck.sh](../../../../experiments/css_native_layout/run_precheck.sh), [run_built_app_precheck.sh](../../../../experiments/css_native_layout/run_built_app_precheck.sh). Thin wrappers; move to `tools/` only if the experiments tree itself is retired.

## 4. Delete

Each candidate below has zero current consumer in either the runtime or the diagnostic pipeline.

- experiments/css_native_layout/_batch3_f_gallery_builder.py, _batch3_f_html_generator.py. 605 LOC of leading-underscore Python that built one historical contact sheet. Leading underscore in this repo means "scratch, safe to delete" (see [docs/CLAUDE_HOOK_USAGE_GUIDE.md](../../../CLAUDE_HOOK_USAGE_GUIDE.md) "File deletion (safe patterns)").
- experiments/css_native_layout/render_stress_to_html.py. 345 LOC. The WS-D audit (cited in the onboarding bundle, section 6) found it is the only consumer of `kind_to_footprint` and was never tracked in git; the file on disk is uncommitted drift. Deleting it makes the "no current consumer" finding concrete.
- `experiments/css_native_layout/styles/{bench,hood,instrument}_{a,c,d,e,diorama,focusedstage,gameboard}.css` and the `b/c` direction variants. 28 reference CSS files that exist only for side-by-side comparison. The `_b` variants (`bench_b.css`, `hood_b.css`, `instrument_b.css`) are the seed for the canonical `bench.css`/`hood.css`/`instrument.css`; once that lineage is recorded in the move-to-production step, the variants no longer need to live in the tree. Archive the LAYOUT_SCORECARD.md or DECISION_MEMO.md if not already documenting the choice; then delete.
- [experiments/css_native_layout/templates/dir_b/](../../../../experiments/css_native_layout/templates/dir_b/), [dir_c/](../../../../experiments/css_native_layout/templates/dir_c/). 20 HTML files that mirror the flat templates with direction-variant CSS hooks. They were comparison fodder for the dir_b vs dir_c decision; the decision is closed.
- experiments/css_native_layout/trial_logs/. NEW1.5 Lane E per-trial notes (8 docs, screenshots, orig copies). The Lane E result is rolled up in [new1_5_layout_hardening_results.md](../../../archive/plan-reset-2026-05-22/new1_5_layout_hardening_results.md); the raw trial logs no longer serve a downstream reader.
- [experiments/css_native_layout/scenes/crowded_bench_dense.yaml](../../../../experiments/css_native_layout/scenes/crowded_bench_dense.yaml), [drug_dilution_workspace_dense.yaml](../../../../experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml). Only two hand-authored YAMLs in this folder; neither matches the canonical [SCENE_YAML_FORMAT.md](../../../specs/SCENE_YAML_FORMAT.md) schema; the corresponding HTML templates carry the same visual content.
- `experiments/css_native_layout/stress_generators/{build_batch1_contact_sheets,proposal_phase1_dryrun,verify_no_coord_fields,render_with_label_policy}.py`. 1188 LOC across four files; each is named for a specific batch (batch1, phase1) or for a one-off check that has been folded into precheck. Verify with a quick grep that no live runner imports them before deletion; if any does, downgrade to "stay diagnostic-only".

Deletion notes:
- `experiments/` is gitignored except for the explicit `!` allowlist in [.gitignore](../../../../.gitignore) lines 8-72. Tracked files in the list above must be removed via `git rm`. Files that are not currently tracked (anything not on the allowlist) can be removed with plain `rm` since the gitignore already hides them; nothing in this tree is so large that retention is free.
- The next manager (not this audit) executes deletions. This doc is the proposal; the manager runs the commands with a clean review log.

## 5. Rewrite to TypeScript

Runtime code lives in TypeScript per [docs/TYPESCRIPT_STYLE.md](../../../TYPESCRIPT_STYLE.md). The following capabilities currently live in MJS or are absent and must be re-authored as `.ts` modules under `src/scene_runtime/layout/`:

- Scene layout adapter. The previous `src/scene_runtime/layout/css_native_adapter.ts` (261 lines, deleted by the reset) was the runtime entry. The next implementation needs an adapter that consumes scene YAML (`SCENE_YAML_FORMAT.md`), produces DOM placements in named zones, and exposes `ComputedItemLayout[]` for dispatch. Rewrite from scratch using the canonical `zone` vocabulary; do not port the deleted file verbatim.
- Scene class policy resolver. Maps `scene_class` -> label policy, spacing policy, viewport policy, acceptance thresholds. Currently encoded in `score_layout.mjs` weight tables and `scene_class_manifest.yaml`; the runtime needs a typed module that reads the manifest and emits the per-scene policy struct.
- Footprint class resolver. Maps placement `object_name` -> footprint CSS class. Currently encoded in `object_footprints.yaml`. The runtime needs a typed loader that fails loudly on unmapped names (no silent `small-tool` fallback in production).
- Feature flag surface. The pre-reset `src/scene_runtime/layout/feature_flags.ts` existed for the well-plate spike; if the next manager keeps a flag-gated rollout, that file is TypeScript by definition.
- Dispatch contract types. `ComputedItemLayout`, `Placement`, `Zone`, `SceneClass`, `FootprintClass` belong in `src/scene_runtime/layout/types.ts`. None of these exist on disk today.

These items are TypeScript because they ship in `dist/main.js` and are run in the student's browser. Type errors here are correctness bugs, not lint findings.

## 6. Remain JavaScript/MJS

These items run in node, drive Playwright, or generate static HTML. They do not ship to students. Rewriting them in TypeScript would inflate the bundle surface for no production benefit. They stay `.mjs` (or `.py` where existing).

- All diagnostic scripts named in section 3.
- All shell wrappers (`run_precheck.sh`, `run_built_app_precheck.sh`).
- The stress generator suite under `stress_generators/`.
- Any future static-HTML preview tool (for example a renamed `tools/layout_preview/` consumer of `templates/*.html`).

The boundary is shipped vs not shipped. Anything that lands in `dist/` is TypeScript; anything that runs under `node tests/playwright/...` or `bash experiments/...` is MJS or Python.

## 7. First clean implementation milestone

The NEW1.5 results doc proposes "Replicate the well_plate_96_zoom Path A wiring for one second scene to verify the integration pattern generalizes" as the next implementation step. The onboarding bundle proposes an M0 baseline-confirmation pass before that step. Both are sensible, but neither lands a production layout manager.

Proposed first milestone: **M1a-rewire-skeleton: rebuild the minimum production layout-manager skeleton under `src/scene_runtime/layout/` that compiles, type-checks, and renders one scene end-to-end (the same `well_plate_96_zoom` the previous spike used).**

Concrete scope:

1. Create `src/scene_runtime/layout/types.ts` with the four type names listed in section 5 (`ComputedItemLayout`, `Placement`, `Zone`, `FootprintClass`, `SceneClass`). No `any`. Strict mode passes.
2. Create `src/scene_runtime/layout/css_native_adapter.ts` (rewrite, not port) exposing `compute_scene_layout_css_native(world, scene_id, viewport_w, viewport_h): ComputedItemLayout[]`. Use snake_case for the public function and locals per the NEW1.5 Lane C-cleanup rule. No `as any`, `as unknown as`, `@ts-ignore`, or debug `console.log`.
3. Create `src/scene_runtime/layout/data/object_footprints.yaml` and `src/scene_runtime/layout/data/scene_class_manifest.yaml` as moved copies of the experiments YAMLs. Drop the "Not production schema" header at this moment.
4. Wire a single hand-authored `well_plate_96_zoom` scene through the adapter end-to-end. The wiring must use the canonical `zone` vocabulary (not `region`).
5. Drive the wiring with one Playwright spike under `tests/playwright/` that asserts: (a) the canonical 7 assertions the previous spike held, (b) at least one new assertion that names a `zone` rather than a `region`.
6. Run the built-app precheck via [experiments/css_native_layout/run_built_app_precheck.sh](../../../../experiments/css_native_layout/run_built_app_precheck.sh). Confirm `hard_fail_count` matches or improves the prior 2-fail finding at 1920x1080; do not modify precheck.mjs to make it pass.

Why this and not the NEW1.5 "second scene" step:

- The reset wiped `src/scene_runtime/` entirely. There is no `well_plate_96_zoom` Path A wiring in the tree to replicate; the previous wiring exists only in the archive doc. The first concrete milestone must be to put back the minimum runtime skeleton, not to add a second scene on top of an absent first scene.
- The NEW1.5 next step assumed the canonical 261-line `css_native_adapter.ts` was still present. It is not. The "second scene" milestone is the right one to take after M1a lands.
- Confining M1a to one scene plus types plus data files keeps the diff bounded to about 4-6 new files (well below the "atomic task" bar in [docs/REPO_STYLE.md](../../../REPO_STYLE.md)). The manager can ship M1a in one dispatch and only then open the "second scene" milestone.

Falsifiability:
- Either `npm run typecheck` (or `npx tsc --noEmit`) returns zero errors after M1a or it does not.
- Either the Playwright spike's 7+1 assertions pass on the built bundle or they do not.
- Either the built-app precheck reports `hard_fail_count <= 2` on `well_plate_96_zoom` at 1920x1080 or it does not.
- Either the new code contains no `any`, `as unknown as`, `@ts-ignore`, debug `console.log`, or hardcoded `-99999` offsets (grep on the final delta) or it does.

What M1a explicitly does not do:
- It does not promote `object_footprints.yaml` to `docs/specs/` (that needs an RFC).
- It does not amend [PRIMARY_CONTRACT.md](../../../PRIMARY_CONTRACT.md) item 3 (that needs user approval).
- It does not delete any experiments-tree files (that is a follow-up cleanup milestone after M1a is green).
- It does not touch [precheck.mjs](../../../../experiments/css_native_layout/precheck.mjs), [score_layout.mjs](../../../../experiments/css_native_layout/score_layout.mjs), or [render_and_dump.mjs](../../../../experiments/css_native_layout/render_and_dump.mjs). The diagnostic-integrity rule from the onboarding bundle is hard.

Open questions the next manager must resolve before M1a opens:
- Is the second scene from the NEW1.5 "next step" preempted by M1a, or does it remain the next milestone after M1a (call it M1b)?
- Should `src/scene_runtime/layout/data/` carry the YAMLs, or should the loader read directly from `experiments/css_native_layout/`? The former is cleaner; the latter avoids a move during M1a.
- The onboarding M0 is read-only baseline confirmation. M1a is the first writing milestone. Either M0 ships first (manager-time cost: low) or M0 and M1a run in series under one dispatch (manager-time cost: lower; verification cost: same). Pick one.
