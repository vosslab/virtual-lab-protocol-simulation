# NEW1 well_plate_96_zoom spike implementation checklist

## Scope

This is the implementation checklist a doer follows to execute the NEW1
integration spike defined in
[new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md)
section 3. It is a planning document only. It IS the step-by-step,
gate-by-gate playbook for rendering `well_plate_96_zoom` through the
production runtime via the CSS-native path, wiring one click target, running
one end-to-end interaction, and producing the evidence the section 9 success
gates consume. It is NOT a production edit, NOT a contract amendment, and
NOT a broad migration plan. Inputs: the NEW1 plan above, the spike readiness
audit (seam at `src/scene_runtime/layout/adapter.ts`), the spike fixtures in
`spike_fixtures`,
`PRECHECK_USAGE.md`,
and
`run_precheck.sh`.

## Preconditions

Manager must verify all of the following before spike start:

- [ ] Spike readiness audit reviewed and accepted by reviewer. Audit
      identifies the integration seam as a conditional substitution inside
      `src/scene_runtime/layout/adapter.ts` and lists the code paths it
      crosses (adapter -> legacy layout engine -> renderer; click dispatch
      via `closest()` on `data-target-id`).
- [ ] Contract decision NOT required to start. The spike runs under the
      current
      `PRIMARY_CONTRACT.md` item 3 because the
      seam is a conditional substitution inside the existing adapter, not
      a replacement of the contract-mandated layout engine. Reviewer should
      still confirm this interpretation in writing before implementation
      begins. Path A vs Path B (NEW1 plan section 1) is a post-spike
      decision.
- [ ] Spike fixtures present under
      `spike_fixtures`:
      manifest, expected DOM selectors, expected data attributes, expected
      precheck command, expected screenshot paths.
- [ ] Precheck reproducible: a clean run of
      `bash experiments/css_native_layout/run_precheck.sh` from the repo
      root produces `visual_audit.json` and the per-scene MD report under
      `test-results/new0_css_native/audit/` with 0 hard fails on the
      stabilized NEW0 set, per
      `PRECHECK_USAGE.md`.
- [ ] Baseline screenshot of current `well_plate_96_zoom` production
      rendering captured at
      `test-results/new1_spike/well_plate_96_zoom/baseline_layout_engine.png`
      using the existing production layout-engine path. This is the
      pixel-diff reference for step 8.

## Implementation steps

Each step lists: action, file(s) touched, verification command, rollback note.

1. **Add a feature flag / scene-name switch at the adapter seam.**
   - Action: introduce a single conditional in the adapter that, when the
     scene name is `well_plate_96_zoom` AND a CSS-native flag is on, routes
     layout/rendering to the new module instead of `legacyComputeLayout`.
     The audit verbatim seam is "a conditional substitution inside existing
     adapter" at `src/scene_runtime/layout/adapter.ts`.
   - File(s): `src/scene_runtime/layout/adapter.ts` (one new conditional
     branch; no signature change).
   - Verify: `npx tsc --noEmit` passes; existing scenes still route to
     `legacyComputeLayout` when the flag is off; running any non-spike
     scene through the runtime produces unchanged output.
   - Rollback: revert the single commit that introduced the conditional;
     flag default-off keeps production path untouched.

2. **Add a CSS-native scene renderer module for `well_plate_96_zoom`.**
   - Action: implement the module the adapter delegates to under the flag.
     Path name is deferred to the implementer; do not prejudge. A plausible
     home is `src/scene_runtime/layout/` next to `adapter.ts`, but the
     final filename is the implementer's call.
   - File(s): one new module under `src/scene_runtime/layout/` (name TBD by
     implementer).
   - Verify: `npx tsc --noEmit`; module exports the surface the adapter
     conditional calls; no imports outside the existing layout subtree.
   - Rollback: delete the new module; remove the adapter conditional
     branch.

3. **DOM render path: read fixture, emit selectors and data attributes.**
   - Action: render the manifest at
     `well_plate_96_zoom_manifest.yaml`
     to a DOM whose selectors match
     `expected_dom_selectors.md`
     and whose `data-*` attributes match
     `expected_data_attributes.md`.
     Emit no coordinate `data-*` attributes (closed-schema denylist).
   - File(s): the new render module from step 2 only.
   - Verify: Playwright walkthrough asserts each required selector resolves
     to exactly one node; assert no forbidden coordinate `data-*`.
   - Rollback: same as step 2.

4. **Wire one clickable plate target through `data-target-id`.**
   - Action: ensure the primary placement DOM node carries the
     `data-target-id` value the existing click dispatch path expects (the
     audit confirms hit-testing uses `closest()`; no coordinate math at
     click time). The scene adapter resolves the semantic target name to
     this DOM node.
     (The audit confirms hit-testing uses `closest()`; see audit doc,
     "Click target binding path" section.)
   - File(s): the new render module from step 2; no edits to dispatch,
     validators, or response handling.
   - Verify: Playwright click on
     `.placement[data-placement-name="zoom_well_plate_96"]` triggers the
     existing dispatch path; runtime emits the expected validator call.
   - Rollback: same as step 2.

5. **Run one interaction flow end-to-end.**
   - Action: drive the spike walkthrough: scene load -> pipette pickup
     (cursor-attach) -> click on the primary placement -> validator passes
     -> response runs -> `ObjectStateChange` re-renders. Use the existing
     runtime dispatch and response paths unchanged.
   - File(s): `tests/playwright/` walkthrough script (new test file under
     existing tree, name follows `*_walkthrough.mjs` convention).
   - Verify: walkthrough completes with the visible-UI path only (no
     internal state writes, no API shortcuts), per contract item 4 in
     `PRIMARY_CONTRACT.md`.
   - Rollback: delete the walkthrough script.

6. **Run precheck against the rendered scene.**
   - Action: execute the command pinned in
     `expected_precheck_command.md`.
     The rendered DOM is captured to
     `experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom.html`,
     then audited by the existing
     `precheck.mjs`.
     Do NOT modify the precheck runner.
   - File(s): no source edits; writes only to `test-results/new1_spike/`
     and `experiments/css_native_layout/spike_fixtures/spike_rendered/`.
   - Verify: `test-results/new1_spike/well_plate_96_zoom/visual_audit.json`
     reports 0 hard fails on the spike scene.
   - Rollback: delete the rendered HTML and the `test-results/new1_spike/`
     output tree.

7. **Capture Playwright screenshots at pinned paths.**
   - Action: walkthrough script writes the five interaction screenshots and
     the precheck-side captures to the paths listed in
     `expected_screenshot_paths.md`.
   - File(s): no source edits; outputs under `test-results/new1_spike/`
     (gitignored).
   - Verify: all five `0N_*.png` paths exist; raw and annotated precheck
     PNGs exist.
   - Rollback: delete the output tree.

8. **Pixel-diff against production baseline.**
   - Action: compare
     `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.png`
     against `baseline_layout_engine.png`. Write
     `diff_css_native_vs_baseline.png`. Report per-region delta and
     per-well-center delta. Note: the central risk from the audit is
     CSS-region bounds vs legacy coordinates and floating-point precision
     across 96 wells.
   - File(s): no source edits. Routing rule for the diff utility: if it
     imports Playwright OR is written as `.mjs`, it MUST live under
     `tests/playwright/`. If it uses Pillow only (pure Python, no
     Playwright), `_temp.py` scratch is acceptable.
   - Verify: NEW1 plan section 9 acceptable criterion: (a) under 5%
     per-region delta (threshold uncalibrated; see Open issues), OR (b)
     explicit human review pass recorded in the spike report.
   - Rollback: delete the diff output.

9. **Walker compatibility check.**
   - Action: run the existing protocol walker
     (`tests/playwright/walker/run.mjs`) against the spike scene with
     the flag on. The walker must complete every step via the visible UI
     per contract item 4. No walker code changes are permitted for the
     spike.
   - File(s): none modified; walker invocation only
     (`tests/playwright/walker/run.mjs`).
   - Verify: walker exit code 0; walker screenshot evidence captured per
     `E2E_TESTS.md` and
     `PLAYWRIGHT_USAGE.md`.
   - Rollback: turn the feature flag off; the walker falls back to the
     legacy adapter path.

## Gates

All gates must pass before the spike is declared successful. Sources are the
NEW1 plan, the spike readiness audit, and the precheck runner.

Policy precedence: if a gate criterion derives from NEW1 plan section 5 but
precheck currently treats it as advisory, the NEW1 plan precedence applies;
the spike must explicitly verify by reading the relevant boolean from the
precheck output rather than relying on the hard-fail count alone.

| Gate                                                           | Source                                                  | Pass criterion                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Scene renders through production runtime under flag-on         | NEW1 plan section 9                                     | `well_plate_96_zoom` loads via the production scene loader and adapter, not via the experiment harness                   |
| One click target via visible UI                                | NEW1 plan section 9                                     | Playwright click on the primary placement registers through `data-target-id` dispatch                                    |
| End-to-end interaction completes                               | NEW1 plan section 9                                     | click -> validator -> response -> `ObjectStateChange` re-render runs without internal API writes                         |
| Precheck hard-fail count = 0                                   | NEW1 plan section 5; precheck `visual_audit.json`       | Zero of: `clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`, `label_label_overlap`                      |
| Pixel-diff vs production baseline acceptable                   | NEW1 plan section 9                                     | Under 5% per-region delta OR documented human review pass                                                                |
| No reintroduction of coordinate engine                         | NEW1 plan section 9 failure gate; spike readiness audit | No pixel-math, JS-side `getBoundingClientRect()`-keyed state, or coordinate-keyed lookups added in adapter or new module |
| CSS region bounds vs legacy coordinates stable across 96 wells | Spike readiness audit (central risk)                    | Per-well-center delta within the pixel-diff threshold; no floating-point precision drift visible in diff overlay         |
| Walker completes via visible UI                                | Contract item 4; NEW1 plan section 7 stage-1 gate       | Walker exit 0 against the spike scene with the flag on                                                                   |

## Rollback plan

Per the spike readiness audit: the spike is recoverable by one `git revert`.
Commit-scope rule:

- One PR.
- One feature flag / scene-name conditional at the seam.
- One conditional gate in `src/scene_runtime/layout/adapter.ts`; no other
  source file in `src/` is modified.
- All new test, walkthrough, and rendered-HTML artifacts live outside `src/`
  (under `tests/playwright/` and `experiments/css_native_layout/`).
- `git revert <spike-pr-merge-commit>` returns the runtime to the legacy
  adapter path. The flag default-off provides a soft rollback without
  revert.

## Boundaries during spike

- No edits to other scenes (no YAML, no scene-loader changes touching
  non-spike scenes).
- No changes to dispatch, render/apply, or state mutation paths.
- No schema edits to existing YAML.
- No contract amendment; Path A vs Path B is deferred to the post-spike
  decision in NEW1 plan section 1.
- No new metrics added to
  `precheck.mjs`.
  The precheck runner is consumed as-is.

## Post-spike decision matrix

| Outcome                                                                                                                                                             | Next action                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Spike passes all gates                                                                                                                                              | Recommend Path A (contract amendment) to reviewer; open NEW1 stage-2 one-protocol spike per plan section 7                                |
| Spike fails coord-math / no-coordinate-engine gate                                                                                                                  | Recommend Path B (CSS-native stays under `experiments/`); close NEW1 spike; revert via the one-PR rule                                    |
| Spike passes but reveals new requirement (e.g., footprint class (e.g., the `.footprint--zoom-view` class), scene_mode field)                                        | Pause spike closure; open a focused fixture/schema follow-up under `experiments/`; do NOT silently expand the closed schema               |
| Spike inconclusive (precheck passes, pixel-diff inconclusive, walker passes but cursor-attach behavior (CursorAttach scene operation; see PRIMARY_SPEC.md) unclear) | Record findings; extend the walkthrough to cover the unclear interaction; re-run gates; do not declare success and do not declare failure |

## Open issues from prep phase

Prep subagents flagged these unresolved questions. Resolve before declaring
the spike closed; do not silently absorb them into the schema.

- `expected_data_attributes` divergences vs the NEW0 template (see
  `expected_data_attributes.md`):
  `data-scene-mode` vs no `scene_mode` schema field; `data-placement`
  duplicate of `data-placement-name`; `footprint--zoom-view` class with no
  schema source; `scene-mode--detail` class with no schema source; the five
  empty-region scaffolds rendered even when unused in zoom view.
- `precheck.mjs` has no `--scene` filter flag. Workaround documented in
  `PRECHECK_USAGE.md`:
  pass an explicit HTML path or a narrower glob as the positional argument.
- Contract item 3 wording ambiguities flagged in
  [new1_primary_contract_item3_amendment_draft.md](new1_primary_contract_item3_amendment_draft.md):
  `assets/` reference, "custom geometry" boundary, "the layout engine"
  singular vs pluggable.
- `label_label_overlap` policy choice (NEW1 plan section 5 flags hard fail;
  precheck currently treats it as advisory). Reconcile before the gate
  reads it as hard.
- Pixel-diff threshold is uncalibrated. The 5% per-region delta in NEW1
  plan section 9 has no prior measurement on this scene; the spike report
  must record the observed delta even when it passes, so the threshold can
  be calibrated for the stage-2 spike.
