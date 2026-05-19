# NEW0 cleaned-audit decision memo

## Purpose

This memo documents the manager-side decisions made while executing the
outside-review handoff
([docs/active_plans/new0_outside_review_handoff.md](../../docs/active_plans/new0_outside_review_handoff.md)).
It exists so the user can read one short artifact and understand:

- which CSS variant was promoted to tracked per workspace family,
- what the re-audit against tracked code changed versus the pre-cleanup
  scratch numbers,
- the status of three mid-flight verdict-ladder amendments
  (`PASS_TEMPLATE`, `data-primary`, primary-ratio thresholds), and
- what is decided versus what is flagged for user review.

NEW0 is **not** scored in this memo. The verdict ladder is not run, and
NEW1 is not opened. The handoff explicitly defers both pending user
review of this artifact and the cleaned audit.

## CSS variants promoted to tracked

The previous state: every template linked a gitignored `_c` variant; the
drug-dilution composition scene linked a gitignored `_e` variant. The
tracked workspace CSS files (`bench.css`, `hood.css`, `instrument.css`)
existed but were not under test.

The pick:

| Workspace | Variants present | Promoted to tracked | Rationale |
| --- | --- | --- | --- |
| bench | bench_a, bench_b, bench_c, bench_d, bench_e, bench_diorama, bench_focusedstage, bench_gameboard | bench_c | Linked by 5 of 6 bench templates pre-cleanup. Highest in-tree use; closest to broad-applicability baseline. |
| hood | hood_b, hood_c, hood_d, hood_diorama, hood_e, hood_focusedstage, hood_gameboard | hood_c | Linked by hood_basic (the only hood template). Same numbering convention as bench_c. |
| instrument | instrument_b, instrument_c, instrument_d, instrument_diorama, instrument_e, instrument_focusedstage, instrument_gameboard | instrument_c | Linked by both instrument templates (cell_counter_basic, microscope_basic). |

The unchosen scratch variants remain in place under `experiments/`. They
are gitignored, so the repo is unaffected. They can be deleted later
without ceremony.

### Trade-off accepted: drug_dilution loses Direction E tuning

`drug_dilution_plate_workspace.html` previously linked `bench_e.css`, the
Direction E primary-workspace-tuned variant the user picked in a prior
turn. That variant defined the substitute regions
`primary_work_surface / reagent_shelf / tool_lane / waste_corner /
side_support` and tuned the well plate's footprint upward to lift the
primary ratio.

Promoting `bench_c.css` to tracked drops drug_dilution back onto the
generic bench layout. The visible cost in the cleaned audit:

- primary ratio drops from 12.9% to 1.4%;
- 6 placements now flag "artwork extends outside card";
- the WARN verdict is unchanged (already WARN before).

This is honest evidence. The pre-cleanup 12.9% was real but produced by
a CSS file that the build cannot reproduce. Direction E was the right
shape for that scene; demoting it is the cost of standardizing on tracked
code. Re-promoting Direction E (either by merging it into `bench.css` or
by adopting a per-scene CSS pattern) is open work flagged for the user
below.

## What the cleaned audit changed

Detail in [PRECHECK_SUMMARY.md](PRECHECK_SUMMARY.md). Headline:

- 8 scenes, same set as pre-cleanup.
- 0 hard fails, 0 FAIL verdicts (unchanged).
- 1 PASS, 4 PASS_TEMPLATE, 3 WARN (unchanged tallies).
- 3 primary-ratio shifts, biggest one drug_dilution (12.9% -> 1.4%) for
  the Direction E reason above.

The outside-review concern that "audit evidence does not reflect tracked
code" was real; the cleaned re-audit confirms the failure modes were
qualitatively the same (3 WARNs on composition scenes for low primary
ratio, no FAILs anywhere) but quantitatively shifted. Either reading is
honest evidence; the dishonest version was claiming the scratch numbers
as the tracked-code numbers.

## Disposition of mid-flight amendments

### PASS_TEMPLATE verdict

**Status**: KEEP for now, flag for user review.

`PASS_TEMPLATE` was added in the P2.5 cleanup patch as a fourth verdict
value. It distinguishes scenes that intentionally have only one or two
placements (workspace skeletons used as launch surfaces) from scenes
intended to test composition density.

Reasoning to keep:

- Without it, 4 of 8 scenes would be classified as WARN purely because a
  single-instrument scene does not "fill" the work surface. That is not
  what the precheck should be measuring.
- The four `_basic` scenes are pedagogically real categories
  (template/skeleton) and merit a distinct verdict.
- Removing PASS_TEMPLATE would force every template-mode scene to either
  be re-classified composition (forcing irrelevant warnings) or
  hand-excluded.

Reasoning the user should weigh:

- PASS_TEMPLATE was added without being in
  `~/.claude/plans/serene-stargazing-moore.md`. The controlling plan's
  goalpost-shift clause requires user approval for verdict-vocabulary
  changes.
- The plan called for verdict scoring under three values
  (`css_native_better / css_native_comparable / css_native_worse`).
  PASS_TEMPLATE does not roll up into one of those three without an
  explicit mapping.

Recommendation: keep PASS_TEMPLATE for the cleaned audit, but treat its
acceptance as a user decision before NEW0 is scored.

### data-primary attribute

**Status**: KEEP for now, flag for user review.

`data-primary="true"` was added to `electrophoresis_bench` in the P2.5
patch so the precheck would identify the electrophoresis tank as the
scene's primary object rather than falling back to "largest bbox".

Reasoning to keep:

- The fallback "largest bbox" rule misidentifies the primary in
  composition scenes whose largest single placement is not the
  pedagogical focus (a wide-base power supply, a tall reagent carboy).
- An author hint is a low-cost, semantic mechanism. It does not add a
  new continuous knob; it picks one of N existing placements.

Reasoning the user should weigh:

- Adding `data-primary` to one scene to lift its primary-ratio
  measurement does not actually lift the ratio; in electrophoresis_bench
  the tank still measures 2.7% of scene area, below the 25% threshold.
- The attribute change therefore does not rescue the verdict; it only
  makes the measurement honest.

Recommendation: keep the attribute as a semantic hint. The actual
verdict question is the primary-ratio threshold, addressed next.

### Primary-ratio thresholds (25% / 70%)

**Status**: UNRESOLVED DRIFT. Flag for user review.

The 25% threshold (non-zoom) and 70% threshold (zoom) are not sourced
from a calibrated reference. They were chosen as round numbers. Of four
composition scenes, three WARN against the 25% threshold; one PASSes the
70% zoom threshold.

This is the strongest signal in the cleaned audit that the metric, the
threshold, or the scenes are wrong. Per the outside-review handoff: when
a metric flags 75% of output, "the metric, the threshold, or the scenes
are wrong; likely all three".

Options the user can pick from:

1. **Source the thresholds**: calibrate against scenes the user calls
   "good visually" and back out the empirical primary-ratio. Likely
   yields a much lower number (5-15% non-zoom).
2. **Replace with a checklist**: primary object centered, primary is
   largest single bbox, no label overlap, primary is `data-primary`
   tagged. Drop the area-ratio metric.
3. **Re-author the scenes**: make the primary objects visibly larger
   through artwork or footprint changes. Direction E for drug_dilution
   was a step in this direction.

Recommendation: defer to user. This is the most consequential open
question for verdict scoring.

## What this memo does not decide

- Whether NEW0 is `css_native_better / comparable / worse` (deferred
  until the user picks a primary-ratio resolution).
- Whether to open NEW1 (production integration plan) at all.
- Whether to amend [docs/PRIMARY_CONTRACT.md](../../docs/PRIMARY_CONTRACT.md)
  item 3 or treat NEW0 as a permanent experiment.
- Whether to re-promote Direction E for drug_dilution (either by merging
  into `bench.css` or by adopting per-scene CSS).
- Whether to delete the gitignored `_a/_b/_d/_diorama/_focusedstage/
  _gameboard/_e` scratch variants.
- Whether the closed five-region taxonomy is the right shape or whether
  scenes should pick from a wider controlled vocabulary
  (drug_dilution effectively invented its own five).

All of the above are listed in the outside-review handoff as items that
benefit from user review rather than manager judgment.

## Actions completed (this memo's work)

- [x] Added experimental-status banner to
  [experiments/css_native_layout/README.md](README.md).
- [x] Promoted `bench_c.css / hood_c.css / instrument_c.css` to tracked
  `bench.css / hood.css / instrument.css`.
- [x] Relinked all 8 templates to tracked CSS (no `_*` variant
  references remain).
- [x] Re-ran `node experiments/css_native_layout/precheck.mjs` against
  the cleaned templates.
- [x] Replaced [PRECHECK_SUMMARY.md](PRECHECK_SUMMARY.md) with the
  tracked-code audit.
- [x] Wrote this decision memo.

## Actions not taken (deferred to user)

- [ ] Score NEW0 against the verdict ladder.
- [ ] Open NEW1.
- [ ] Amend [docs/PRIMARY_CONTRACT.md](../../docs/PRIMARY_CONTRACT.md).
- [ ] Restart M3 onward.
- [ ] Source or replace primary-ratio thresholds.
- [ ] Decide PASS_TEMPLATE and data-primary acceptance.
- [ ] Decide Direction E re-promotion for drug_dilution.

## Verification

- `git ls-files experiments/css_native_layout/styles/` returns three
  files (`bench.css`, `hood.css`, `instrument.css`).
- `git check-ignore experiments/css_native_layout/styles/bench_e.css`
  returns the path (still gitignored scratch).
- No template under `experiments/css_native_layout/templates/` links a
  `_<letter>.css`, `_diorama.css`, `_focusedstage.css`, or
  `_gameboard.css` variant.
- `pytest tests/test_markdown_links.py -q` exits 0.
