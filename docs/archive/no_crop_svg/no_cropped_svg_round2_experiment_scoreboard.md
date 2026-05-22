# No-Crop Round 2: Experiment Scoreboard

Date: 2026-05-21
Workstream: G (scoreboard, baseline reconciliation)
Status: ANALYSIS COMPLETE - awaiting WS-H full-corpus visual verification

## Purpose

Compare workstreams A-F on a single axis. Reconcile divergent baselines.
Declare canonical pre-fix count for WS-H. Surface caveats that block a
"ship it" call on hybrid (WS-F) without further visual evidence.

## Comparison Table

| WS  | Hypothesis                                                                  | Crops Before                                         | Crops After                | Crops Fixed               | New Hard Fails     | Score Change             | Off-Page Change | Region Overflow Change | Files Touched                                          | Complexity               | Keep/Reject/Escalate                              | Root-Cause Finding                                                                                            |
| --- | --------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- | ------------------------- | ------------------ | ------------------------ | --------------- | ---------------------- | ------------------------------------------------------ | ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A   | Missing/misnamed SVG assets drive crops; YAML rename fixes them             | 31 (AR>10%)                                          | 55 (AR>10%)                | -24 (regression)          | +24 AR distortions | regression               | 0               | 0                      | 5 object YAML (reverted)                               | HIGH                     | reject (reverted), escalate asset architecture    | 48 missing assets; empty/filled variant aspect ratios incompatible; YAML-only renames cannot resolve          |
| B   | Region min-height is the primary lever                                      | 28                                                   | 0                          | 28                        | 0                  | clean pass               | 0               | 0                      | bench.css, hood.css, instrument.css (2 lines each)     | LOW                      | keep                                              | Region height was the constraint; +40px rear_shelf, +20px front_tools eliminates all crops in 10-scene corpus |
| C   | Footprint classes mix incompatible shapes                                   | 23 (dedup HARD FAIL)                                 | 52 (Phase 1)               | -29 (regression)          | unbounded          | regression               | n/a             | n/a                    | bench.css footprint classes (reverted)                 | MED Phase1 / HIGH Phase2 | reject Phase 1; escalate Phase 2 (spec extension) | Shape mismatch is real but CSS-only tightening regresses; needs YAML shape_group vocab extension              |
| D   | overflow:hidden is the silent killer                                        | 34 (clipped_by_parent)                               | 21 isolated / 58 full      | -13 isolated / +24 full   | unstable           | regression on full apply | n/a             | cascading              | bench.css .placement, footprint max-heights (reverted) | MED                      | reject                                            | overflow:hidden is correct; removing it only shifts where clipping is measured; cascades to parent regions    |
| E   | One global policy cannot satisfy all scene classes; per-class CSS overrides | 28                                                   | not executed (design-only) | projected 13-16 reduction | unknown            | projected partial        | unknown         | unknown                | conceptual bench.css additions                         | MED                      | reject (unnecessary once WS-B passed)             | Per-class patterns exist but WS-B global fix already solves; complexity not warranted                         |
| F   | Best-of-A-E hybrid                                                          | 50+ (bench.css unfixed) / 28 (post-Trial5 reference) | 0                          | 28-50+                    | 0                  | clean pass               | 0               | 0                      | bench.css aligned to hood/instrument 320/260           | LOW                      | keep (= WS-B applied uniformly)                   | Hybrid reduces to WS-B; bench.css had not been updated, hence the 50+ "before" inflation                      |

## Baseline Reconciliation

Different workstreams measured against different artifacts using different
metrics. The divergence is not error; it reflects three distinct things
each workstream cared about.

### Reported counts and what they mean

- WS-A: 31. Counts SVG assets with rendered-vs-natural aspect ratio
  mismatch greater than 10 percent in post-Trial5 precheck. This is an
  asset-shape metric, not a crop metric. An object can be AR-distorted
  without being clipped, and vice versa.
- WS-B: 28. Counts `clipped_by_parent` items per `precheck.mjs` against
  the post-Trial5 visual confirmation report. This is the canonical
  visible-crop count for the 10-scene NEW0 corpus immediately after
  Trial 5.
- WS-C: 23. Same precheck baseline as WS-B, but deduplicated: a single
  object that crops in two scenes is counted once. This compresses the
  count toward unique HARD FAIL objects.
- WS-D: 34. Same precheck field as WS-B, but measured against WS-D's own
  audit run on its own CSS snapshot. Higher because bench.css was not
  at the same state as hood.css and instrument.css at the time WS-D ran.
- WS-E: 28. Adopted WS-B's count directly as the categorization base for
  per-scene-class analysis.
- WS-F: 0 after hybrid, against a 50-plus before count produced once
  WS-F applied the WS-B values uniformly across all three CSS files.
  The 50-plus "before" is the state with bench.css still at the legacy
  100px region heights while hood.css and instrument.css were already
  at 320px / 260px. It is not a clean apples-to-apples comparison with
  the 28 number.

### Why they diverged

1. Different metrics. AR distortion (WS-A) and clipped_by_parent (WS-B,
   D, F) measure different failure modes; they overlap but are not the
   same set.
2. Different dedup rules. WS-C deduplicated; everyone else counted
   per-placement instances.
3. Different CSS snapshots. bench.css drifted out of sync with hood.css
   and instrument.css partway through Round 2. Workstreams that ran
   after the partial sync (WS-D, WS-F initial) saw inflated counts
   compared to workstreams whose baseline was the matched Trial 5 state.
4. Different corpora measured. All six were nominally the 10-scene NEW0
   corpus, but the original Round 1 visible-crop number (28) traces back
   to a broader visual review across stress and gold scenes
   (`no_cropped_svg_visual_confirmation_report.md`). That review is not
   what `precheck.mjs` on 10 templates measures.

### Canonical pre-fix count for WS-H

Use **28** as the canonical visible-crop baseline.

Justification:

- 28 is the WS-B `clipped_by_parent` count on the 10-scene NEW0 corpus
  with the post-Trial5 CSS state (hood.css and instrument.css at
  320/260, bench.css at legacy 100/100 because Trial 5's edits had
  not been mirrored to bench.css yet).
- 28 is the value WS-B, WS-E, and the WS-F reconciliation both agree
  represents "crops still present after the documented Trial 5 fixes
  but before any Round 2 fix lands".
- The 50-plus number in WS-F's table is the same scene set with a
  worse-than-Trial5 CSS snapshot and should not be used as the Round 2
  starting point; it conflates Trial 5 drift with Round 2 work.
- The 23 number (WS-C) is a deduplicated view of the same population,
  not a different population.
- The 34 number (WS-D) is the same metric on a drifted CSS snapshot
  and should not be carried forward.

Therefore: WS-H verifies that "28 visible crops in the NEW0 10-scene
post-Trial5 baseline drop to 0 after WS-B/WS-F region-height edits".

## Caveats

WS-H must treat these as blockers to claiming "no-crop fix shipped":

- **Corpus scope mismatch.** WS-F measured 0 crops via `precheck.mjs`
  on the 10-scene NEW0 corpus. The original Round 1 baseline that
  produced "28 visible crops" came from a broader 200-plus PNG visual
  review across stress and gold scenes (see
  `docs/active_plans/no_cropped_svg_visual_confirmation_report.md`).
  WS-F's "0 crops" does NOT cover the full corpus where crops were
  originally observed. The 10-scene precheck is necessary but not
  sufficient.
- **Visual review not redone.** Precheck JSON measures
  `clipped_by_parent`, `off_page_artwork`, `region_overflow`, and
  aspect-ratio HARD FAILs. It does not catch subtle visible cropping
  that the JSON checks miss. Round 1's confirmation pass used eyeball
  inspection of rendered PNGs. WS-H must redo a comparable visual pass
  before declaring success.
- **Gold scenes not re-measured.** WS-E reported 73 visible crops in
  gold scenes at the post-Trial5 baseline. None of the Round 2
  workstreams report a post-fix gold count. WS-H must measure gold
  scenes under the WS-B region-height settings to confirm the fix is
  not regular-corpus-only.
- **Annotation PNG generation failed in WS-F.** WS-F notes the
  `_temp_annotate.py` script reference in `precheck.mjs` is broken, so
  the annotated PNGs that normally accompany the audit were not
  produced. WS-H needs working annotated PNGs to do the visual pass.
- **AR distortion not eliminated.** WS-B's "0 crops" addresses
  `clipped_by_parent`, not aspect-ratio distortion. WS-A's 31
  AR-distorted assets are a separate failure mode that survives
  WS-B; WS-H should report on whether any of those distortions are
  visible enough to count as crops by the PRIMARY_DESIGN visual
  integrity rule.

## WS-H Verification Scope

WS-H is the visual-confirmation workstream that closes (or reopens)
the no-crop loop. Required:

1. Render the full corpus that produced the original 28-crop visual
   number: stress scenes plus gold scenes plus the 10-scene NEW0
   precheck templates, using the current WS-B CSS state.
2. Visual eyeball pass on all rendered PNGs against the
   PRIMARY_DESIGN.md visual integrity rule (no cropped scientific
   assets, no aspect-distorted lab glassware/pipettes/plates/
   instruments beyond 5 percent).
3. Run `precheck.mjs` on all rendered scenes and report
   `clipped_by_parent`, `off_page_artwork`, `region_overflow`, and
   hard-fail counts per scene.
4. Cross-check WS-A's 31 AR-distorted assets against the rendered
   PNGs. Any that remain visibly distorted are residual user-gated
   decisions, not silent passes.
5. Fix or document the broken `_temp_annotate.py` reference so
   annotated PNGs are produced for the audit.
6. Produce a before/after gallery for at least the scenes that had
   crops in the Round 1 visual confirmation report.

WS-H decision matrix:

- 0 visible crops, 0 hard-fails, 0 off-page across full corpus:
  ship WS-B/WS-F fix.
- 0 visible crops on 10-scene precheck but residual visible crops
  in broader corpus: do NOT ship; reopen with the residual subset
  as the new baseline.
- AR distortions remain visible: escalate to WS-A asset
  architectural redesign (still blocked, still user-gated).

## Final Recommendation

### Best single experiment

**WS-B (region-height).** Two CSS values per stylesheet, three
stylesheets, six lines total. Eliminates all 28 visible crops in
the 10-scene NEW0 corpus per `precheck.mjs`. No regressions in
off-page, region-overflow, or hard-fail counts. Fully reversible.

### Hybrid result

**Hybrid reduces to WS-B.** WS-F's analysis confirms that once WS-B
values are applied uniformly to bench.css, hood.css, and
instrument.css, every other workstream's contribution is either
unnecessary (WS-E), regressing (WS-A, WS-C Phase 1, WS-D), or blocked
on architectural decisions outside CSS scope (WS-A redesign,
WS-C Phase 2). No additional CSS or YAML edits improve on WS-B.

### Residual user-gated decisions

These do not block shipping WS-B but remain open for later:

1. **WS-A: 48 missing SVG asset references and empty/filled variant
   strategy.** Architectural. Choose between (a) author base assets
   with mid-spectrum aspect ratio, (b) split empty/filled into
   distinct asset pathways and update object schema, (c) alias to
   generic shapes, or (d) remove unused authoring-error entries.
2. **WS-C Phase 2: YAML shape_group vocabulary extension.** Spec-level.
   Would resolve an additional 15-25 aspect-distortion cases by
   letting authors map object kinds to shape-aware footprint classes.
   Requires PRIMARY_SPEC.md amendment.
3. **AR distortion residue (WS-A's 31 assets).** Visual-integrity
   review needed to determine which AR distortions are visible enough
   to count as crops under the PRIMARY_DESIGN rule. Some may be within
   the 5 percent tolerance; others may force asset redesign.

### Action for WS-H

Run the full-corpus visual verification described above. Do not call
the no-crop work shipped on the strength of the 10-scene precheck
alone.

## Handoff

- Scoreboard path:
  `docs/active_plans/no_cropped_svg_round2_experiment_scoreboard.md`
- Canonical baseline declared: **28 visible crops**, NEW0 10-scene
  corpus, post-Trial5 CSS state (hood/instrument at 320/260,
  bench at legacy 100/100). Source: WS-B.
- WS-H verification scope: full corpus (NEW0 10-scene precheck +
  stress + gold), visual eyeball pass plus precheck JSON, annotated
  PNGs restored, AR-distortion residue cross-checked.
- Source artifacts:
  - `docs/active_plans/no_cropped_svg_round2_asset_resolution_experiment.md`
  - `experiments/css_native_layout/stress_results/no_cropped_svg_round2_region_height_experiment.md`
  - `experiments/css_native_layout/stress_results/no_cropped_svg_round2_footprint_shape_experiment.md`
  - `experiments/css_native_layout/stress_results/no_cropped_svg_round2_contain_card_experiment.md`
  - `experiments/css_native_layout/stress_results/no_cropped_svg_round2_scene_class_policy_experiment.md`
  - `experiments/css_native_layout/stress_results/no_cropped_svg_round2_hybrid_experiment.md`

## Boundary Compliance

- No commits. Human owns commits per guardrail.
- ASCII only per docs/MARKDOWN_STYLE.md.
- "workstream" used throughout, not "lane".
- No code, test, or runtime config modified; documentation only.
