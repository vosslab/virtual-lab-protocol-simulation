# NEW3 layout stress, reliability, and profiling plan

Status: draft, 2026-05-20.
Owner: layout pipeline team.
Predecessors: [new1_5_layout_hardening_before_new2.md](new1_5_layout_hardening_before_new2.md), `new2_css_native_production_blocker_plan.md`, `new2_no_crop_audit_assets`.

## 1. Purpose and scope

NEW3 is a month-scale stress-test and hardening program for the CSS-native
layout pipeline. It is not a new architecture phase, and it is not the broad
production-migration phase. The CSS-native pipeline established in NEW2 is
treated as fixed; NEW3 only tries to break it under realistic and adversarial
load and to harden it where it breaks.

Core question: can the CSS-native layout pipeline survive realistic clutter,
large instruments, detail and zoom scenes, dense labels, varied object sizes,
and repeated runtime re-rendering without clipping, overlap, off-page artwork,
distorted SVG assets, or slow performance?

Anti-drift boundaries inherited from NEW2 (see
`new2_css_native_production_blocker_plan.md`):

- No coordinate-bearing fields in scene manifests.
- No reintroduction of the deprecated layout engine.
- No new authoring vocabulary; authors compose existing terms only.
- No amending `docs/PRIMARY_CONTRACT.md` in NEW3.
- No alternate strategy or plugin system for layout.

Closed scene class list (same five classes as NEW2):

- `hood`
- `bench`
- `incubator`
- `microscope`
- `instrument`

NEW3 generates and audits scenes only within this closed class list. No new
scene class is added.

## 2. Hard rule: never crop SVG assets

NEVER crop SVG assets in display. A scene cannot pass visual review if any
scientific asset is visibly cropped, clipped, or aspect-distorted enough to
change what the object is.

This rule is verbatim and must not be softened in derived documents, reports,
or fix-loop summaries. Any stress scene whose primary scientific asset is
cropped, clipped, or aspect-distorted is a failing scene regardless of every
other metric.

## 3. Pipeline framing

NEW3 audits the pipeline end to end:

```
scene manifest
    -> CSS-native layout
    -> measured rect extraction
    -> artwork integrity audit
    -> constraint audit
    -> scorecard
    -> runtime proof
    -> profiling
    -> screenshot review
```

The diagram in `docs/active_plans/new3_layout_stress_reliability_report.html`
(Lane I-equivalent) is the canonical rendered version of this pipeline. This
plan document describes it textually only.

## 4. Deliverables

- `docs/active_plans/new3_layout_stress_reliability_plan.md` (this file).
- `experiments/css_native_layout/stress_scenes/` (generated and hand-authored
  scene manifests).
- `experiments/css_native_layout/stress_generators/` (generator scripts and
  configs).
- `experiments/css_native_layout/stress_results/` (precheck, scorecard,
  artwork, profiling, and clustering outputs).
- `docs/active_plans/new3_layout_stress_reliability_report.html` (rendered
  final report).
- `docs/active_plans/new3_layout_stress_reliability_report.md` (source of
  final report).
- `docs/active_plans/new3_layout_stress_reliability_assets/` (charts, gallery
  thumbnails, failure museum exhibits).
- PDF snapshot:
  `docs/active_plans/new3_layout_stress_reliability_report.pdf`.

## 5. Workstream catalog

Each workstream runs in parallel where possible. Each has its own success
criteria (section 11). Outputs land under
`experiments/css_native_layout/stress_results/<workstream>/`.

### A. Stress scene generator

A scripted generator under `experiments/css_native_layout/stress_generators/`
produces 100 or more scene manifests across the closed scene-class list. The
generator parameterizes object count, large equipment count, label density,
and intended difficulty. It does not emit coordinate fields. Output:
`experiments/css_native_layout/stress_scenes/generated/`.
Metrics: scenes generated, class distribution, parameter coverage.

### B. Hand-authored gold stress scenes

Ten hand-authored stress scenes act as fixed reference points across runs.
Each gold scene has a documented intent (for example "instrument-heavy bench
with dense labels"). Gold scenes do not change between iterations of the fix
loop. Output: `experiments/css_native_layout/stress_scenes/gold/`.
Metrics: ten gold scenes ratified, intent documented per scene.

### C. Artwork integrity audit

Per-scene check that every scientific SVG asset is rendered without crop,
clip, or aspect distortion that changes object identity. Implements the hard
rule from section 2. Output:
`experiments/css_native_layout/stress_results/artwork_integrity/`.
Metrics: integrity pass rate, count of cropped assets, count of distorted
assets.

### D. Layout constraint audit at scale

Runs the constraint checks (no overlap, no off-page artwork, label-to-target
adjacency, viewport containment) across the full generated and gold corpus.
Output:
`experiments/css_native_layout/stress_results/constraint_audit/`.
Metrics: per-constraint failure rate, per-scene-class failure rate.

### E. Scorecard stress run

Runs the NEW2 scorecard against the full corpus. Tracks scorecard score
distribution and regressions versus NEW2 baseline. Output:
`experiments/css_native_layout/stress_results/scorecard/`.
Metrics: scorecard median, p10, p90, regression count vs baseline.

### F. Screenshot corpus

Captures one screenshot per gold scene and per worst-20 generated scene under
fixed viewport policy. Output:
`experiments/css_native_layout/stress_results/screenshots/`.
Metrics: screenshot count, missing-screenshot count, screenshot byte total.

### G. Failure clustering

Groups failing scenes by root-cause signature (constraint class, asset, scene
class, label density). Output:
`experiments/css_native_layout/stress_results/clusters/`.
Metrics: cluster count, top-cluster size, share of failures in top three
clusters.

### H. Fix loop

For each top cluster, propose and apply a narrow fix in the CSS-native
pipeline, then rerun the full corpus. Tracks before/after deltas. Output:
`experiments/css_native_layout/stress_results/fix_loop/`.
Metrics: iterations run, per-iteration regression count, per-iteration net
fail reduction.

### I. Label policy stress test

Varies label density (low/medium/high) and label-target distance under fixed
scene composition. Output:
`experiments/css_native_layout/stress_results/labels/`.
Metrics: label overlap rate, label off-page rate, label-target adjacency
pass rate.

### J. Viewport policy stress test

Varies viewport size (small mobile, standard, large) and aspect ratio across
the corpus. Output:
`experiments/css_native_layout/stress_results/viewport/`.
Metrics: off-page rate per viewport, aspect-distortion rate per viewport.

### K. Runtime profiling

Measures CSS-native layout time, measured-rect extraction time, and full
render time per scene class. Output:
`experiments/css_native_layout/stress_results/profiling/`.
Metrics: ms per scene (median, p95), ms per object, ms per re-render.

### L. Runtime interaction stress

Triggers repeated re-renders (state changes, resize, hover) and measures
stability of measured rects and absence of drift. Output:
`experiments/css_native_layout/stress_results/interaction/`.
Metrics: rect drift per re-render, drift after N=100 re-renders, runtime
crashes.

### M. Schema drift audit

Checks every generated and gold manifest against the closed scene schema.
Flags any escape hatch (open maps, `metadata`, `extras`, coordinate fields).
Output:
`experiments/css_native_layout/stress_results/schema_drift/`.
Metrics: drift count, drift class distribution.

### N. CSS drift audit

Compares the CSS used by the pipeline against the committed canonical CSS.
Flags ad hoc per-scene overrides. Output:
`experiments/css_native_layout/stress_results/css_drift/`.
Metrics: override count, override locations.

### O. Diagnostic integrity audit

Verifies that the audit and scorecard tools themselves produce stable output
across reruns (no nondeterminism, no time-of-day drift). Output:
`experiments/css_native_layout/stress_results/diagnostics/`.
Metrics: rerun delta, nondeterministic field count.

### P. Rolling daily-style rollup log

A short daily-style log (date-stamped, append-only) recording corpus size,
top failures, fixes applied, and next-day intent. Output:
`experiments/css_native_layout/stress_results/rollup.md`.
Metrics: log entries per week, days with zero progress (target: zero).

### Q. Best/worst galleries and failure museum

Curated galleries of the ten best and ten worst scenes per iteration, plus a
failure museum of representative failure modes with annotated screenshots.
Output:
`docs/active_plans/new3_layout_stress_reliability_assets/galleries/` and
`.../failure_museum/`.
Metrics: gallery scene count, museum exhibit count.

### R. Final report

Synthesizes all workstreams into the rendered report at
`docs/active_plans/new3_layout_stress_reliability_report.md` and its HTML and
PDF siblings. Includes the canonical pipeline diagram.
Metrics: report shipped, all workstream sections present, PDF snapshot
attached.

## 6. Scene count targets

- 20 template-like sparse scenes.
- 20 realistic composition scenes.
- 20 dense clutter scenes.
- 15 instrument-heavy scenes.
- 10 zoom and detail scenes.
- 15 adversarial scenes.

Total generated corpus: 100 scenes, plus the 10 hand-authored gold scenes.

## 7. Per-scene metadata schema

Closed schema. No coordinate fields, no `bounds`, no x/y, no `metadata`
blob, no `extras`.

| Field                     | Type | Notes                                                            |
| ------------------------- | ---- | ---------------------------------------------------------------- |
| `scene_class`             | enum | one of: `hood`, `bench`, `incubator`, `microscope`, `instrument` |
| `object_count`            | int  | total scene objects                                              |
| `large_equipment_count`   | int  | large instruments only                                           |
| `label_density`           | enum | `low`, `medium`, `high`                                          |
| `expected_primary_object` | name | semantic target name                                             |
| `intended_difficulty`     | enum | `easy`, `medium`, `hard`, `adversarial`                          |

No other fields are permitted in the stress-scene manifest header.

## 8. First batch exit criteria

The first batch closes when all of the following are true:

- 50 generated scenes exist under
  `experiments/css_native_layout/stress_scenes/generated/`.
- 10 gold scenes exist under
  `experiments/css_native_layout/stress_scenes/gold/`.
- Precheck has run on all 60.
- Scorecard has run on all 60.
- Screenshots exist for all 10 gold scenes plus the worst 20 generated
  scenes.
- An artwork integrity report exists under
  `experiments/css_native_layout/stress_results/artwork_integrity/`.
- A first failure cluster summary exists under
  `experiments/css_native_layout/stress_results/clusters/`.
- A first performance profile exists under
  `experiments/css_native_layout/stress_results/profiling/`.
- A first fix recommendation exists in the rollup log
  (`experiments/css_native_layout/stress_results/rollup.md`).

## 9. Anti-idle operating rules

- Every working day produces at least one append to the rollup log.
- No day passes without either a new scene batch, a new audit run, or a new
  fix iteration.
- A blocked workstream is recorded explicitly in the rollup, with a named
  unblock owner and date.
- No silent pauses; an idle day is a recorded day with a stated reason.
- The fix loop runs to convergence per cluster (regression count stable for
  two consecutive iterations) before moving to the next cluster.

## 10. Boundaries

- No production migration in NEW3.
- No deletion of the legacy layout engine in NEW3.
- No new architecture in NEW3.
- No amending `docs/PRIMARY_CONTRACT.md` in NEW3.
- No new strategy or plugin systems in NEW3.
- No coordinate-bearing manifest fields in NEW3.
- No new authoring vocabulary terms in NEW3.
- No expansion of the closed scene-class list in NEW3.

## 11. Per-workstream success criteria

- A: at least 100 generated scenes with the required class and difficulty
  distribution.
- B: 10 ratified gold scenes with documented intent, unchanged across fix
  iterations.
- C: artwork integrity pass rate measured for all scenes; zero cropped or
  identity-distorted scientific assets in the gold set.
- D: per-constraint failure rate reported for every constraint; no
  constraint untested.
- E: scorecard distribution reported; no regression versus NEW2 baseline on
  the gold set.
- F: one screenshot per gold scene and per worst-20 generated scene.
- G: failure clusters ranked; top three clusters cover at least 60 percent
  of failures.
- H: at least two fix iterations completed; net failure count decreasing
  monotonically across iterations.
- I: label overlap rate reported per density level.
- J: off-page rate reported per viewport size.
- K: median and p95 ms per scene reported per scene class.
- L: rect drift after 100 re-renders below a documented threshold; zero
  runtime crashes.
- M: zero schema escape hatches in the gold set; drift count reported for
  the generated set.
- N: zero ad hoc per-scene CSS overrides in the gold set.
- O: rerun delta of audit tools is zero on a fixed input.
- P: rollup log has an entry for every working day of NEW3.
- Q: galleries and failure museum populated for each fix iteration.
- R: final report shipped in md, html, and pdf; all workstreams represented.

## 12. Risk register

- The generator may produce unrealistic scenes that do not represent real
  curriculum content. Mitigation: gold scenes anchor the corpus to authored
  reality; generator parameters are tuned against gold-scene distributions.
- The performance profiler may show CI-impractical times. Mitigation: report
  the numbers honestly; do not pre-tune the profiler to fit CI; treat CI
  budget as a separate decision.
- Many failures may map to one root cause (schema or CSS). Mitigation:
  failure clustering is explicit; a single root cause is a feature, not a
  problem, because it concentrates the fix.
- The artwork integrity check may have false positives early. Mitigation:
  gold set drives calibration; false-positive rate is tracked and reduced
  iteratively.
- The fix loop may create churn without convergence. Mitigation: convergence
  rule in section 9 (two stable iterations per cluster) and the fixed gold
  set provide a stop condition.

## 13. Out of scope

- Production migration of the CSS-native pipeline.
- Deletion of the legacy layout engine.
- New architecture phases beyond NEW3.
- Amending `docs/PRIMARY_CONTRACT.md`.
- New strategy or plugin systems for layout.
- Coordinate-bearing manifest fields in any form.
