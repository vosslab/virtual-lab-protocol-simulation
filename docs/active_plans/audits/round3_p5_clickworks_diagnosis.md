# Round 3 p5 clickWorks=0/11 diagnosis

## Verdict

DRIVER_DIVERGENCE. P5's clickWorks=0/11 is a measurement bug, not a runtime regression. The P5 driver at `tests/playwright/_temp_round3_protocol_smoke_expansion.mjs` was described as "adapted from R7" but was not adapted from R9's corrected version. It carries all three bugs R9 identified and fixed.

(Note: the P5 driver file was deleted by the parallel cleanup workstream after diagnosis completed; reconstruction would require git history.)

## Bug 1: wrong state field path

P5 `snapshotState` lines 62-66 reads `cfg?.world?.objects[k]?.state`. R9 report lines 86-91 documented that `RuntimeWorld` stores per-object state in `world.objectStates`, not in `world.objects[k].state`. The `objects` map holds `ObjectConfig` (declarative metadata) and has no `state` field. Every P5 snapshot key serializes to `{}`. The `statesChanged` check at P5 lines 147-149 can never fire.

The R9 / M5-PIVOT driver at `tests/playwright/_temp_round3_advance_repair_smoke.mjs` lines 74-78 correctly reads `cfg?.world?.objectStates`.

## Bug 2: currentInteractionIndex absent from snapshot and pass criteria

P5 `snapshotState` (lines 50-77) does not capture `currentInteractionIndex` at all. The clickWorks pass criterion at lines 143-151 checks only `stepChanged`, `sceneChanged`, and `statesChanged`. R9 root cause 2 established that a single click on interaction 0 of a step never changes `activeStepIndex` (steps advance only after the next-button). The only signal from a correct click is `currentInteractionIndex` incrementing 0->1. P5 is blind to that signal.

The R9 / M5-PIVOT driver captures `currentInteractionIndex` at line 69 and includes `interactionDelta !== 0` in its pass criterion at lines 179-182.

## Bug 3: missing force:true on clicks

P5 line 141: `.click({ timeout: 4000 })`. R9 report lines 101-109 documented that Playwright's actionability heuristic rejects small SVG `<g>` targets as "not visible" even when `pointer-events: auto` and non-zero bbox are present. The R9 and M5-PIVOT drivers use `.click({ timeout: 4000, force: true })`.

## Compound effect

Bugs 1 and 2 together make `clickWorks=yes` structurally impossible in P5's driver for any protocol whose click advances only `currentInteractionIndex` and changes `objectStates`. That is the normal behavior for interaction 0 of step 0. The R9 report confirmed that pattern on 3 of the 4 R7 scenes, and those same 3 scenes are in P5's 11-scene set.

## R9-corrected driver score prediction on p5's 11

>= 3/11. R9 and M5-PIVOT confirmed clickWorks=pass on `mtt_reagent_prep_bench_workspace`, `sdspage_attach_lid_and_leads_workspace`, and `sdspage_heat_denature_samples_workspace`. P5's run reports zero console errors and DOM-resident `data-target-id` elements for all 11 protocols. The runtime click handler is a shared code path (`src/scene_runtime/dispatch/click.ts`) with no scene-specific branches.

## Secondary finding

P5's `objectStateChange` probe (lines 197-258) also reads `world.objects[k].state`. The `objectStateChange=no` result on 8 scenes is also a measurement artifact of Bug 1, NOT confirmed evidence that OSC ops are non-functional.

## Status

DONE. Diagnostic complete. Follow-up R9-driver-rerun workstream a2c3d5dfcb7d5314d in flight to confirm prediction.
