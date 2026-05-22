# Round 3 runtime interaction smoke (Workstream R7)

Date: 2026-05-22
Owner: R7 smoke pass (read-only, no production source edits)
Plan ref: Round 3 pivot, workstream R7 (interaction smoke on mounted scenes)
Artifacts: `test-results/round3_runtime_interaction_smoke/` (per-scene `.log` + `summary.json`)

## Purpose

Confirm that the four production-runtime-mounted scenes from Workstream A1
(`docs/active_plans/reports/round3_runtime_truth_audit.md`) still respond to
real browser interactions after Round 3 visual fixes. R7 is a behavioral
companion to A1's visual capture: A1 took screenshots; R7 clicks targets and
inspects whether runtime state changes.

## Method

1. Built dist: `bash pipeline/build_runtime_bundle.sh` (creates
   `dist/runtime.bundle.js`) plus per-protocol HTML via
   `python3 pipeline/build_protocol_html.py --protocol <name>`. The shared
   driver `build_github_pages.sh` is destructive (`rm -rf dist`) and must be
   followed by the bundle + per-protocol builds before any runtime smoke.
2. Wrote `tests/playwright/_temp_round3_interaction_smoke.mjs` (temporary,
   deletable). The driver follows the existing `_temp_runtime_truth.mjs`
   pattern (Playwright + `file://dist/<protocol>.html` + a 3.5 s mount wait
   reading `globalThis.__RUNTIME_PROTOCOL_CONFIG`).
3. For each protocol it runs five probes against the mounted target scene:
   - `clickWorks`: click the active step's first target. Pass if any of
     `activeStepIndex`, `activeSceneId`, or the `world.objects[*].state`
     snapshot changes after the click.
   - `wrongTarget`: click an arbitrary other `data-target-id` element. Pass
     if the runtime is still alive (`__RUNTIME_PROTOCOL_CONFIG` still
     present) and no fatal page error is emitted.
   - `objectStateChange`: scan forward from the current step for the first
     `ObjectStateChange` `scene_operation`; click its `target`; pass if
     `world.objects[*].state` snapshot diffs.
   - `consoleErrors`: count of `pageerror` plus `console.error` messages
     emitted during the smoke.
   - `domGrowth`: `document.querySelectorAll("*").length` before vs after
     the smoke; reported as a delta (positive = nodes added).

The driver does not rebuild, mutate game state, call internal APIs, or
introduce per-scene branches.

## Results

| Scene | clickWorks | wrongTarget | ObjectStateChange | Console errors | DOM growth (before -> after, delta) |
| --- | --- | --- | --- | --- | --- |
| `mtt_reagent_prep_bench_workspace` | fail | pass | untested | 0 | 69 -> 70, +1 |
| `mtt_solubilization_readout_plate_reader_workspace` | fail | pass | fail | 0 | 203 -> 209, +6 |
| `sdspage_attach_lid_and_leads_workspace` | fail | pass | fail | 0 | 359 -> 359, +0 |
| `sdspage_heat_denature_samples_workspace` | fail | pass | fail | 0 | 114 -> 114, +0 |

Per-column tally (4 scenes):

- `clickWorks`: 0 pass, 4 fail, 0 untested.
- `wrongTarget`: 4 pass, 0 fail, 0 untested.
- `ObjectStateChange`: 0 pass, 3 fail, 1 untested.
- Console errors: 0 across all four scenes.
- DOM growth: bounded (+0 to +6 nodes); no growth runaway.

## Per-scene notes

### `mtt_reagent_prep_bench_workspace`

- Mount: success (`activeSceneId = mtt_reagent_prep_bench_workspace`,
  `activeStepIndex = 0`, first target `mtt_powder_container`).
- `clickWorks=fail`: click on `mtt_powder_container` did not change
  `activeStepIndex`, `activeSceneId`, or any `world.objects[*].state` snapshot
  surfaced through `__RUNTIME_PROTOCOL_CONFIG`. DOM delta of +1 indicates the
  click was received and produced some visual effect (likely a chrome /
  feedback node), but did not advance the protocol state model.
- `wrongTarget=pass`: clicking `waste_container` (an unrelated scene object)
  left the runtime alive and produced zero new console errors.
- `ObjectStateChange=untested`: protocol's first `ObjectStateChange` op is on
  step 1 (`micropipette` -> `set_volume: 1000`); we could not advance past
  step 0 to reach it because step 0 itself did not advance.

### `mtt_solubilization_readout_plate_reader_workspace`

- Mount: success but the initial scene is
  `mtt_solubilization_readout_bench_workspace`, not the plate-reader
  workspace. The driver attempted up to 4 click-to-advance iterations on the
  step 0 target (`micropipette`); none advanced `activeStepIndex` or
  `activeSceneId`, so the smoke never reached the plate-reader scene.
- `clickWorks=fail` recorded for the (unreached) target scene.
- `wrongTarget=pass`: off-target click on `waste_container` did not crash.
- `ObjectStateChange=fail`: clicked `micropipette` (the step 0 target whose
  `response.scene_operations` contains an `ObjectStateChange` op setting
  `set_volume: 200`); object-state snapshot did not change after the click.

### `sdspage_attach_lid_and_leads_workspace`

- Mount: success (target scene equals initial scene; first target
  `electrophoresis_tank`).
- `clickWorks=fail`: click on `electrophoresis_tank` did not advance step,
  scene, or object state. DOM delta of 0 indicates the click resolved with
  no visible state change.
- `wrongTarget=pass`: off-target click on `running_buffer_10x_bottle` did
  not crash and produced zero console errors.
- `ObjectStateChange=fail`: same step 0 target carries an `ObjectStateChange`
  op (`lid_present: true`); object-state snapshot did not change after the
  click.

### `sdspage_heat_denature_samples_workspace`

- Mount: success (target scene equals initial scene; first target
  `heat_block`).
- `clickWorks=fail`: click on `heat_block` timed out at 4 s. Playwright
  reports the element is visible / enabled / stable, but
  `<div class="scene-chrome">` intercepts pointer events at the click point.
  The runtime did not advance.
- `wrongTarget=pass`: off-target click on `microtube_rack_24` succeeded and
  left the runtime alive.
- `ObjectStateChange=fail`: same step 0 target carries an `ObjectStateChange`
  op (`lid_open: true`); click was intercepted by the chrome overlay, so the
  operation never ran.

## Interpretation

R7 confirms two distinct runtime conditions and rules out a third:

- (Rule out) Catastrophic regression. All four scenes mount through
  `SceneRuntime.loadAndMountByProtocolName`, emit zero console errors during
  the smoke, and survive off-target clicks without crashing. Mount and the
  wrong-target failure path are healthy.
- (Confirm) Click -> state transition is not visibly wired through the
  surfaced runtime config in any of the four smokes. Clicking the active
  step's first target does not change `activeStepIndex`, `activeSceneId`, or
  the `world.objects[*].state` snapshot. This is consistent with A1's
  Finding 2 ("dominant failure mode is oversized labels with
  under-rendered assets") in that the runtime is reachable but
  interaction-level behavior is not yet producing the expected protocol
  advance.
- (Confirm) On `sdspage_heat_denature_samples_workspace` the
  `scene-chrome` div intercepts pointer events at the asset's screen
  position, so clicks never reach the target. This is a chrome-stack /
  pointer-events regression in addition to whatever logic gap drives the
  other three `clickWorks=fail` rows.

Caveats:

- The `clickWorks` detector is conservative: it only sees a "pass" if the
  click changes `activeStepIndex`, `activeSceneId`, or the object-state
  snapshot surfaced through `__RUNTIME_PROTOCOL_CONFIG`. A click that
  produces feedback / chrome updates without mutating those fields is
  counted as `fail`. The +1 / +6 DOM-delta rows show that something did
  render after the click; we did not classify what.
- `ObjectStateChange=fail` rows mean the click ran but no `world.objects`
  state diff was observable through the surfaced config. We did not chase
  whether the runtime mutates state through a separate channel not visible
  on `__RUNTIME_PROTOCOL_CONFIG`.

## Reproduce

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_solubilization_readout
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_attach_lid_and_leads
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_heat_denature_samples
node tests/playwright/_temp_round3_interaction_smoke.mjs
```

Outputs:

- `test-results/round3_runtime_interaction_smoke/<scene>.log` (one log per
  scene)
- `test-results/round3_runtime_interaction_smoke/summary.json`

## Boundaries respected

- Read-only on production source. Edits only to:
  `tests/playwright/_temp_round3_interaction_smoke.mjs` (temp driver, safe
  to delete), `test-results/round3_runtime_interaction_smoke/`, this report.
- Reused existing walker pattern (`_temp_runtime_truth.mjs`) rather than
  inventing a new harness. `tests/playwright/walker.mjs` was not modified.
- ASCII only.
- No `git commit`. No `git mv`. No edits under `src/`, `generated/`,
  `content/`, or `pipeline/`.
