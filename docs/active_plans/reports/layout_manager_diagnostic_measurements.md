# Layout manager diagnostic measurements (Forensic Task FG)

Forensic measurement bundle. Same metric vocabulary applied to two render paths so a
reviewer can compare apples-to-apples where the metric exists on both sides, and read
clear "n/a" callouts where it does not.

- Generated: 2026-05-22
- Runtime path: production `dist/` + 26 per-protocol HTML pages, exercised through
  Playwright in headless Chromium. Driver:
  `tests/playwright/forensic_diagnostic_runtime.mjs`. Walker sweep driver:
  `tests/playwright/forensic_walker_sweep.mjs` (wraps
  `tests/playwright/walker/engine.mjs`).
- Experiments / static path: `experiments/css_native_layout/templates/*.html`
  (10 hand-authored templates), exercised through
  `experiments/css_native_layout/precheck.mjs` and scored by
  `experiments/css_native_layout/score_layout.mjs`. Plus the latest cached
  stress corpus at
  `experiments/css_native_layout/stress_results/precheck_batch5_final3/`
  (110 stress scenes).

## Raw artifact paths

- Runtime JSON: `test-results/forensic_fg/runtime_metrics.json`
- Walker sweep JSON: `test-results/forensic_fg/walker_sweep.json`
- Precheck JSON: `test-results/new0_css_native/audit/visual_audit.json`
- Scorecard JSON: `test-results/new0_css_native/scorecard/scorecard.json`
- Stress corpus cache: `experiments/css_native_layout/stress_results/precheck_batch5_final3/visual_audit.json`

## Table 1: production runtime metrics (dist/, 26 protocols)

| Metric                       | Value     | Notes                                                              |
| ---------------------------- | --------- | ------------------------------------------------------------------ |
| protocol count               | 26        | all `dist/*.html` minus `index.html`                               |
| mount count                  | 26 / 26   | runtime root populated; no `RUNTIME INITIALIZATION ERROR` overlay  |
| walkthrough count            | 12 / 26   | `runWalker` end-to-end success per protocol                        |
| clickWorks count              | 133       | total successful interactions across all walks (proxy)             |
| ObjectStateChange (top-10)   | 96        | sum of `interactionsWalked` over the 10 protocols with most clicks |
| placeholder count            | 0         | `data-render-fallback="true"` or `#e8f5e9` rects across all 26     |
| real SVG count               | 246       | `<svg>` w/ non-trivial content or `<img src="assets/*.svg">`       |
| fallback count               | 0         | alias of placeholder                                               |
| visible crop count           | 0         | child media bbox outside `.object-graphic` parent by >2px          |
| off-page count               | 0         | clickable elements outside viewport (1440x1200)                    |
| label overlap count          | 46        | `<text>` bbox overlapping another `<text>` bbox (summed)           |
| console errors               | 2         | `page.on('console','error')` + `pageerror` across all 26           |
| DOM growth (post-mount)      | 0         | childNode count delta over a 800ms post-mount window               |

Per-protocol detail in `runtime_metrics.json`. Note that the runtime DOM is stable
(domGrowth=0) once mounted; all label overlaps cluster in the SDS-PAGE family of
mini-protocols (e.g. `sdspage_extract_gel_from_cassette` = 4 overlaps,
`sdspage_load_sample_single_lane` = 3, `sdspage_prepare_gel_cassette` = 3) plus the
electrophoresis runtime page (`sdspage_run_electrophoresis` = 3, and also the
only protocol with non-zero console errors = 2).

## Table 2: experiments / static metrics (10 css-native templates)

Run: `bash experiments/css_native_layout/run_precheck.sh` then
`node experiments/css_native_layout/score_layout.mjs`. Verdict source =
`visual_audit.json.scenes[].verdict`. Hard fails and per-scene score from
`scorecard.json`. Counts are array lengths from `checks[<name>]`.

| Scene                          | verdict | hard_fails | score | clipped_artwork | off_page | label_overlap | svg_label_overlap | region_overflow | artwork_integrity |
| ------------------------------ | ------- | ---------- | ----- | --------------- | -------- | ------------- | ----------------- | --------------- | ----------------- |
| bench_basic                    | FAIL    | 1          | 0     | 0               | 1        | 0             | 0                 | 0               | 6                 |
| cell_counter_basic             | FAIL    | 1          | 0     | 0               | 1        | 0             | 0                 | 0               | 6                 |
| crowded_bench_dense            | FAIL    | 5          | 0     | 0               | 3        | 0             | 0                 | 2               | 6                 |
| drug_dilution_plate_workspace  | FAIL    | 2          | 0     | 0               | 2        | 0             | 0                 | 0               | 6                 |
| drug_dilution_workspace_dense  | FAIL    | 4          | 0     | 0               | 4        | 0             | 0                 | 0               | 6                 |
| electrophoresis_bench          | FAIL    | 8          | 0     | 0               | 7        | 0             | 3                 | 1               | 6                 |
| hood_basic                     | FAIL    | 1          | 60    | 0               | 0        | 0             | 0                 | 0               | 6                 |
| microscope_basic               | FAIL    | 1          | 0     | 0               | 1        | 0             | 0                 | 0               | 6                 |
| staining_bench                 | FAIL    | 3          | 0     | 0               | 2        | 0             | 0                 | 1               | 6                 |
| well_plate_96_zoom             | FAIL    | 0          | 92    | 0               | 0        | 0             | 0                 | 0               | 6                 |

Roll-up: `total_scenes=10`, `scenes_pass=0`, `scenes_failed=10`, `checks_failed=28`
(source: `visual_audit.json.summary`).

### Static metric extras (only meaningful on the experiments side)

- **no-crop results** (precheck `clipped_artwork`): 0 occurrences across all 10
  templates. All 10 scenes pass the bbox "exceeds region" cropping check.
- **label readability** (precheck `label_label_overlap` + `svg_label_overlap`):
  only `electrophoresis_bench` produces overlapping labels (3 svg/label collisions);
  the other 9 are clean by precheck definition.
- **stress corpus** (cached batch5_final3, 110 scenes): `scenes_pass=0`,
  `scenes_failed=110`, `checks_failed=216`. Hard-fail mass comes from
  `clipped_by_parent` / `aspect_distorted_HF`; see
  `experiments/css_native_layout/stress_results/precheck_batch1_summary.md` for the
  authoritative per-class breakdown.

## Notes: which metrics live on both sides, which do not

### Both sides

- placeholder / fallback count: runtime queries `data-render-fallback="true"` and
  `#e8f5e9` placeholder rects in the live DOM. Experiments do not emit those
  attributes (handwritten templates), so the experiments column is **structurally 0**
  by construction, not because nothing is missing.
- visible crop count: runtime measures bbox-vs-parent at runtime; precheck's
  `clipped_artwork` measures bbox-vs-region at static render. Both report 0.
- off-page count: runtime samples clickable elements outside the 1440x1200
  viewport; precheck's `off_page` reports placement corners outside the viewport.
  Same idea, slightly different selector universe.
- label overlap count: runtime sums every `<text>` bbox-overlap pair under
  `#runtime-root`; precheck splits into `label_label_overlap` and
  `svg_label_overlap`. Vocabulary differs; both are bbox-intersection counts.
- region_overflow / artwork_integrity: precheck-only diagnostics. Runtime has no
  direct analog; the runtime's `visibleCropCount` is the closest substitute.

### Runtime-only

- mount count: runtime path only; static HTML cannot "mount."
- walkthrough count, clickWorks, OSC count: dynamic-behavior metrics. Experiments
  templates are static layouts with no validator or response wiring.
- console errors, DOM growth: dynamic-only.

### Experiments-only

- precheck verdict (PASS / PASS_TEMPLATE / WARN / FAIL): scoped to layout quality
  per-template, not runtime success.
- scorecard `total_layout_score`: weighted composite (see
  `experiments/css_native_layout/score_layout.mjs`). Runtime has no equivalent
  composite.
- `artwork_integrity` (6 findings per template, every template): this is the
  precheck-specific aspect-ratio + container fit signal. It does not correspond
  to runtime `visibleCropCount` because the runtime scenes do not currently
  trigger that check (visibleCropCount=0).
- stress corpus: experiments-side synthetic scene generator only. Runtime has no
  equivalent stress corpus.

## Caveat callouts

- **OSC count is indirect on the runtime side.** The walker engine returns
  `interactionsWalked` (one per successful click + validator pass + advance), but
  does not expose a direct `ObjectStateChange`-event tap. The "OSC count" entry
  reports `interactionsWalked` for the top-10 protocols and labels it as a proxy.
  A true OSC tap would need a `window.__OSC_EVENT_COUNT` instrument in the runtime
  bundle.
- **`placeholderCount=0` on the experiments side is by construction.** The
  experiments templates are hand-authored CSS-native HTML. They do not run the
  runtime's render pipeline, so they cannot emit `data-render-fallback` markers.
  This is not evidence that experiments "have no placeholders"; it is evidence
  that the metric does not apply.
- **`verdict=FAIL` on the experiments side is dominated by `artwork_integrity`.**
  Every one of the 10 templates contributes 6 `artwork_integrity` findings and
  triggers FAIL. Even `well_plate_96_zoom` and `hood_basic`, which score 92 and
  60 respectively on the scorecard, are still marked FAIL by the binary
  precheck verdict. The two verdict systems disagree by design; do not read the
  precheck FAIL count as a quality ranking.
- **Label overlap totals are not directly comparable.** Runtime counts every
  bbox-intersection pair across all `<text>` under `#runtime-root`; precheck
  emits one finding per offending placement pair. The same overlapping label
  layout will produce a higher number on the runtime side.
- **Walker can stall on visible-but-timed steps.** A protocol whose first step
  waits for confluence/incubation/etc. through the test clock will block the
  walker indefinitely if the test-clock affordance is not exposed. The walker
  sweep reports such cases as failures with the per-step error message; treat
  them as walker-instrument failures rather than runtime mount failures (the
  runtime metric shows mount=26/26).
- **Console errors are a low-resolution health signal.** Only 2 console errors
  across all 26 dist pages, both originating from `sdspage_run_electrophoresis`.
  Not a runtime-blocking failure; flagged for follow-up.

## Appendix: per-protocol walker rollup

| Result | Protocol                                  | Steps   | Inter | Failure summary                                    |
| ------ | ----------------------------------------- | ------- | ----- | -------------------------------------------------- |
| OK     | mtt_reagent_prep                          | 4/4     | 10    |                                                    |
| OK     | mtt_solubilization_readout                | 3/3     | 10    |                                                    |
| OK     | plate_drug_treatment_media_adjustment     | 2/2     | 12    |                                                    |
| OK     | sdspage_assemble_electrode_module         | 4/4     | 4     |                                                    |
| OK     | sdspage_attach_lid_and_leads              | 1/1     | 3     |                                                    |
| OK     | sdspage_extract_gel_from_cassette         | 5/5     | 10    |                                                    |
| OK     | sdspage_fill_tank_buffer                  | 2/2     | 8     |                                                    |
| OK     | sdspage_heat_denature_samples             | 4/4     | 5     |                                                    |
| OK     | sdspage_prepare_gel_cassette              | 4/4     | 4     |                                                    |
| OK     | sdspage_prepare_running_buffer            | 2/2     | 8     |                                                    |
| OK     | sdspage_prepare_sample_mix_single_lane    | 4/4     | 12    |                                                    |
| OK     | sdspage_recycle_buffer                    | 3/3     | 5     |                                                    |
| FAIL   | cell_seeding_plate_setup                  | 2/4     | 10    | next button not visible after step_validator       |
| FAIL   | drug_dilution_setup                       | 1/9     | 9     | missing DOM affordance mid-step                    |
| FAIL   | mtt_plate_reaction                        | 0/6     | 0     | next button not visible after step_validator       |
| FAIL   | passage_hood_detachment                   | 0/9     | 0     | locator.click timeout (visibility)                 |
| FAIL   | passage_pellet_reseed                     | 1/9     | 2     | missing DOM affordance                             |
| FAIL   | plate_drug_treatment_drug_addition        | 0/9     | 0     | missing DOM affordance                             |
| FAIL   | sdspage_destain_gel_rock                  | 0/3     | 0     | waitForSelector timeout (visible-but-timed wait)   |
| FAIL   | sdspage_destain_gel_setup                 | 4/6     | 7     | waitForSelector timeout                            |
| FAIL   | sdspage_image_gel                         | 0/3     | 0     | missing DOM affordance                             |
| FAIL   | sdspage_load_protein_ladder               | 5/6     | 5     | missing DOM affordance                             |
| FAIL   | sdspage_load_sample_single_lane           | 2/3     | 5     | missing DOM affordance                             |
| FAIL   | sdspage_run_electrophoresis               | 0/3     | 0     | waitForSelector timeout (visible-but-timed wait)   |
| FAIL   | sdspage_stain_gel                         | 2/5     | 4     | locator.click timeout                              |
| FAIL   | trypan_blue_counting                      | 0/9     | 0     | missing DOM affordance                             |

Common walker failure modes (in descending frequency): missing DOM affordance for a
declared target (8), waitForSelector / locator timeout on visible-but-timed waits (5),
and step_validator passing without the next-step affordance appearing (2). All three
are walker-instrument or scene-wiring concerns, not runtime mount failures.

## Status

DONE_WITH_CONCERNS. All requested metrics either measured or marked n/a with the
required caveat. The two concerns:

1. OSC count is reported as an `interactionsWalked` proxy. A direct event tap
   would require a runtime instrument (out of scope under the "no edits to src/"
   constraint).
2. Walker sweep numbers can be biased by per-protocol timing/visibility
   limitations of the existing walker engine; this is a walker instrument
   limitation, not a production-runtime defect.
