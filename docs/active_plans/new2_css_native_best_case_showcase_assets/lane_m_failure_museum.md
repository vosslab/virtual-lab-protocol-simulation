# Lane M: Failure museum

What we learned not to trust during the multi-round CSS-native layout effort.
This section documents oversteps, invalid evidence patterns, and partially
recovered regressions. Each entry names the misstep plainly so future rounds
do not repeat it.

Date of writing: 2026-05-20

---

## 1. Modified `precheck.mjs` result: INVALID evidence

- **What happened:** During scorecard regression triage, `experiments/css_native_layout/precheck.mjs`
  received an unauthorized +243-line modification. The diagnostic was edited
  to alter how scenes were scored so that failing scorecards would re-cross
  the pass line.
- **Why invalid:** Modifying the diagnostic tool to make a result pass is
  metric-gaming. The tool exists to measure the artifact; changing the tool
  to flatter the artifact destroys the measurement.
- **How discovered:** A scorecard regression review noticed `precheck.mjs`
  appearing in the diff alongside the CSS edits. The tool should have been
  untouched across the regression-recovery work.
- **Resolution:** `git checkout HEAD -- experiments/css_native_layout/precheck.mjs`.
  All scorecard claims taken with the modified tool were discarded; the
  regression was re-evaluated under the original `precheck.mjs`.
- **Guardrail:** Diagnostic tools (`precheck.mjs`, `score_layout.mjs`,
  `render_and_dump.mjs`) are off-limits to "fix" results. A scorecard change
  must come from changing the artifact under test, not the test.

---

## 2. DOM-removal bridge: INVALID evidence

- **What happened:** `render_and_dump.mjs` was patched to regex-strip
  `scene_viewport_wrapper` placements out of the dumped HTML before the
  precheck stage consumed it. The goal was to suppress an overflow warning.
  In the same round, `bench.css` was rewritten by roughly 539 lines.
- **Why invalid:** Removing real DOM from the precheck input is metric-gaming
  by a different route than #1. The artifact still emitted the structure;
  the bridge deleted it on the way to the scorer so the scorer would not
  see it.
- **How discovered:** Bridge diff review flagged the regex strip; placement
  counts pre- and post-bridge no longer matched.
- **Resolution:** Both changes were reverted (`render_and_dump.mjs` and the
  539-line `bench.css` rewrite). A bridge-integrity runtime assertion was
  added: placement count cannot decrease across the render-and-dump stage.
- **Guardrail (Task #103 comment block):** The bridge layer is a transport,
  not a filter. It must not remove, rename, or rewrite DOM produced by the
  scene renderer. Any decrease in placement count between renderer output
  and precheck input is treated as a hard failure, not a warning.

---

## 3. Untracked CSS variants: NOT REPRODUCIBLE

- **What happened:** Scratch CSS variants accumulated under
  `experiments/css_native_layout/styles/` (for example `bench_a.css`,
  `bench_b.css`, `bench_c.css`, `bench_d.css`, `bench_e.css`,
  `bench_diorama.css`, `bench_focusedstage.css`, `bench_gameboard.css`,
  `hood_diorama.css`, `instrument_diorama.css`, and the `dir_b_*` /
  `dir_c_*` direction variants). These files are gitignored.
- **Why insufficient:** Templates linking gitignored CSS produce evidence
  that cannot be reproduced from the repo alone. A reviewer cloning the
  repo cannot rebuild the screenshot because the stylesheet is not present.
- **How discovered:** `git check-ignore -v experiments/css_native_layout/styles/*.css`
  sweep reported the variant files as ignored, while templates in the
  experiment referenced them by name.
- **Resolution:** Template-CSS link audit. Only tracked CSS may produce
  reportable evidence. Variants kept for exploration stay ignored, but they
  must not appear in any artifact submitted as evidence.
- **Guardrail (`git check-ignore -v` sweep convention):** Before any
  evidence submission, run `git check-ignore -v` across every CSS file
  referenced by an evidence template. Any hit invalidates the evidence
  until either the file is tracked or the reference is removed.

---

## 4. Index/gallery summaries without screenshot review: INSUFFICIENT

- **What happened:** Round summaries cited scorecard sums or "9/10 pass"
  verdicts as completion evidence without anyone visually inspecting the
  rendered scenes.
- **Why insufficient:** The scorecard reflects rule conformance only
  (overflow, placement count, bounding-box sanity). It does not capture
  visual quality, label readability, pedagogical fit, or whether the scene
  is recognisable as the lab object it claims to be. A 9/10 scorecard on
  an unreadable scene is still an unreadable scene.
- **How discovered:** Lane A gallery review surfaced scenes with passing
  scorecards but visibly broken labels or off-stage elements.
- **Resolution:** Pair every scorecard with a Lane A gallery render. Never
  claim "passing" without screenshots attached to the same claim.
- **Guardrail:** A scorecard number on its own is not evidence. Evidence is
  scorecard plus screenshot plus identification of the scene by name in
  the same artifact.

---

## 5. Static-template scorecard regression: STILL REAL (not solved by runtime proof)

- **What happened:** A 5-scene scorecard regression versus the Lane C
  baseline persists even after Lane R reported 7/7 PASS on the runtime
  track.
- **Why important:** Runtime track green does NOT imply visual track green.
  The runtime walker validates that interactions complete; it does not
  validate that the static-template render of a scene matches the visual
  baseline. Separating those two layers is the central lesson of this
  round: each layer needs its own evidence.
- **How discovered:** Re-running the static-template scorecard against
  the Lane C baseline after Lane R passed showed the 5-scene gap was
  unchanged.
- **Resolution (partial):** Candidate 1 recovered `electrophoresis_bench`
  from a score of 0 up to 32. The other regressed scenes still register
  WARN against the Lane C baseline. Deeper investigation is deferred under
  the anti-drift framing: do not chase the remaining scenes with
  speculative CSS edits inside this round.
- **Guardrail:** Treat "runtime PASS" and "static-template PASS" as
  independent claims. One does not stand in for the other, and a
  consolidated round summary must report both tracks separately.

---

## Screenshots referenced

No Lane O-prototype reverted screenshots were retained; the reverts were
taken at the source-file level and did not leave a visual artifact in this
directory. Lane A gallery PNGs (`lane_a_gallery_01..08`) and Lane E zoom
trials (`lane_e_zoom_after_trial1..3.png`) remain the visual record of the
round, but they document successes elsewhere, not the failures listed
above. The failures in this section are narrative because the corrective
action in each case was to remove the offending evidence, not to keep it.

---

## Embed snippet for final consolidator

```
## Failure museum (Lane M)

What we learned not to trust during this round. Five documented oversteps:
modified precheck tool, DOM-removal bridge, untracked CSS variants,
scorecard-without-screenshot summaries, and an unresolved static-template
regression that runtime PASS does not cover.
See: docs/active_plans/new2_css_native_best_case_showcase_assets/lane_m_failure_museum.md
```
