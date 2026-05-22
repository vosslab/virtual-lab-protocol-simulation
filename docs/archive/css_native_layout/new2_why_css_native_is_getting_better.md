# Why CSS-native is getting better

A 2-3 minute read for stakeholders. Plain numbers, no jargon dump.

## 1. Hard failures are now detectable

The precheck tool catches four hard-fail classes: clipped artwork, off-page
objects, SVG-SVG overlap, and region overflow. Before Candidate-1, the
electrophoresis_bench scene had 4 hard fails. After the fix, hard fails
across all 10 scenes dropped to 0. Failures that previously hid in screenshots
now stop the build.

## 2. Runtime proof passed in a built app

Lane R reported 7 of 7 PASS on `dist/runtime.bundle.js`. A real click on
`well_plate_96.E7` flows through the production dispatch chain: validator,
then ObjectStateChange, then renderScene, then a CSS-native adapter call from
pass 1 to pass 2, with zero DOM leak. This is the production code path under a
real protocol event, not a static template render.

## 3. Scorecard catches visual regressions

The scorecard reports 632 of 1000 across 10 scenes. The number is honest, not
tuned. When Candidate 2 introduced a bench.css scope guard, the scorecard
caught a NET -26 regression and the change was reverted. The scorecard is
working as a brake, not a press release.

## 4. Oversteps were caught and reverted

Multiple agent oversteps were caught in the same round and reverted: the
Lane O-prototype DOM removal, a 243-line edit to precheck.mjs, and the Lane A
NEW1.5 adapter overstep. No metric-gamed result reached final evidence. A
bridge-integrity guardrail (Task #103) now blocks any placement-count
decrease introduced by post-processing.

## 5. The next work is specific, not vague

Three concrete next steps, each with a named file and a measurable outcome:

- Workstream 1: validator preset group-target fix at `entry.ts:755`.
- Workstream 2: production CSS viewport overflow patch (already applied).
- Per-scene-class threshold matrix design across the 5 scene classes.

Each has a defined non-goal so scope does not creep.

## 6. Anti-drift boundaries are explicit

- Closed manifest schema.
- Closed scene class list (5 classes).
- No coordinates in authoring YAML.
- Diagnostic tools are off-limits as a way to "fix" scorecard results.
- 5-point regression budget per scene.

These boundaries are documented in the NEW2 plan and enforced at review.

## 7. Two-track separation is enforced

The runtime track (Lane R) and the visual-quality track (scorecard) are
independent. A Lane R PASS does not flatter the scorecard. A scorecard WARN
does not cancel a runtime PASS. Each track owns its evidence and its own
next steps.

## What this is not yet

Production migration is not done. The old layout engine is not removed. Some
scenes still WARN on the scorecard. The validator preset is still strict for
group targets, so a cell-target workaround is in use. These are the open
items, not the headline.
