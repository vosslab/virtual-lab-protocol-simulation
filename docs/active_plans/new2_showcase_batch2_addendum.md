# NEW2 Showcase Batch 2 Addendum

Date: 2026-05-21
Companion to: docs/active_plans/new2_css_native_best_case_showcase_no_crop_addendum.md

## Why this addendum exists

NEW2 closed with a best-case showcase under the no-crop hard rule. The rule itself, plus the diagnostics that enforced it, drove NEW3 stress and reliability work. This addendum records what that follow-on work showed.

## Headline outcomes

- Precheck artwork-integrity hard failures: 1203 -> 2 across 110 stress scenes (-99.8%).
- Visual gallery confirms: bottle bottoms restored, glassware renders full, pipettes intact, aspect preserved.
- 7 of 9 Batch 1 failure clusters collapsed.
- Runtime interaction remains stable: 6/6 stress paths PASS, no DOM growth, no heap leak.
- The no-crop hard rule did its job: hidden failures were forced into the open and fixed.

## Where the fix landed

Workstream-N raised two CSS values across three experiment files (bench.css, hood.css, instrument.css):

- .footprint--handheld max-height: 130/160px -> 260px
- .footprint--small-tool max-height: 90px -> 200px

Closed footprint vocabulary preserved. No new classes. No diagnostic-tool semantic changes. src/style.css untouched. docs/PRIMARY_CONTRACT.md untouched. Legacy layout engine intact. Bridge placement-count guardrail active.

## Why stress testing was the right call

Several wrong-axis fixes were proposed and caught before they shipped:

- AB v1 assumed bottles mapped to footprint--handheld; YAML and source audit later disagreed and forced re-examination.
- AB v2 tried widening footprint--container max-height; binding constraint was elsewhere.
- ALT-2 tried removing .placement max-height; subset wins reversed on full 110-scene run.
- SCOPED ALT-2 hit a self-contradiction: dropping max-height alone insufficient while overflow:hidden still clips.
- Workstream-N's smallest correct change emerged only after this evidence ladder.

## What the diagnostics caught

Manual no-crop review (Workstream M): 22 scenes inspected, 100% diagnostic catch rate, 0 blind spots. Diagnostic flagged every visible failure: cropped bottoms, cropped necks, top+bottom clips, aspect distortion. No over-sensitive false alarms.

Two diagnostic methodology issues surfaced during stress:

1. A throwaway Python helper replicating score_layout.mjs hardcoded 4 of 9 metrics. Produced bogus "regression" signal that nearly forced an unnecessary revert. Workstream O exposed the false alarm. Workstream E wrote canonical-scorecard rule + hygiene test to ban this anti-pattern.

2. Scorecard hardFailCount field counts clipped_artwork, off_page, svg_svg_overlap, region_overflow -- NOT clipped_by_parent. Pre-fix scores were systematically inflated for scenes with crop violations. dense_clutter_014 pre-fix score 49 was false-high (10 unscored clipped_by_parent hard fails). Honest post-fix score 30 looks like regression but is not.

## What is left

- 2 remaining hard failures are generator over-stuffing of rear_shelf (16-17 bottles in stress_many_bottles_scene_001/_002). Adversarial synthetic load, not curriculum content. Workstream-B added generator placement cap; B-verify confirms metrics.
- 4 latent YAML reclassifications applied (cell_counter -> equipment_large; well_plate_96, tube_rack_24, tube_rack_15ml -> out of equipment_large). Semantically correct; no visible effect on stress templates (static HTML); benefits production runtime.
- 2 latent landscape-asset issues (t75_flask 2.15:1, drug_vial_rack 2.03:1) deferred. Need new CSS classes (user-gated).

## Runtime layer remained stable

Workstream-I (interaction stress) Batch 2: 6/6 paths PASS. Workstream-H (runtime profiling): adapter cost 0.1ms p99 at 1 placement, 0.6ms p99 at 200 placements. No DOM growth, no heap leak. Lane R rerender behavior intact.

## Takeaway

The no-crop hard rule exposed real failures that previous heuristics missed. Stress testing prevented several wrong-axis fixes. Diagnostics caught their own measurement bugs. The final fix is small (six CSS values across three experiment files), closed-vocabulary, evidence-grounded, and visually confirmed.

NEW3 can plausibly move from stress fixing to visual polish after Batch 3 closes.
