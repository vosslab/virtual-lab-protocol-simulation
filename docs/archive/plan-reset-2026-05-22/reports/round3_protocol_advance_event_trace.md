# Round 3 P1 protocol advance event trace

Date: 2026-05-22
Owner: P1 event-target trace (read-only probe; no source edits)
Plan ref: Round 3 pivot, P1 follow-up to R7 (R7 reported clickWorks 0/4)
Source data: `test-results/round3_protocol_advance_event_trace/` (temporary output directory)
Probe driver: `tests/playwright/_temp_round3_event_trace.mjs` (underscore-prefixed temp; safe to delete)
Related: [round3_runtime_interaction_smoke.md](round3_runtime_interaction_smoke.md)

## Method

Read-only probe. No `src/` files modified. The probe:

- adds a Playwright `addInitScript` that installs a capture-phase
  `document.addEventListener('click', ...)` listener which records each
  click's `event.target` tag, class, direct `data-target-id`, the closest
  ancestor's `data-target-id`, and screen coordinates into
  `globalThis.__CLICK_TRACE`.
- captures all page `console` and `pageerror` events on the Playwright
  side. The runtime's existing `console.warn("Wrong target: expected X,
  got Y")` and `console.warn("Click target ... not found in
  world.objects")` are the validator-side outcome signal.
- snapshots `__RUNTIME_PROTOCOL_CONFIG.world` (`activeSceneId`,
  `activeStepIndex`, `currentInteractionIndex`, the active step's first
  interaction's `target`, `gesture`, `validator`, plus
  `world.objectStates[<expected_object>]`) before and after the click.

Build sequence used (same as R7):

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_solubilization_readout
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_attach_lid_and_leads
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_heat_denature_samples
node tests/playwright/_temp_round3_event_trace.mjs
```

## Per-scene results

### mtt_reagent_prep_bench_workspace

- Clicked DOM: `tag=rect class="" directId=null closestId=mtt_powder_container at=(274,229)`.
- Emitted target (from `closest("[data-target-id]")`): `mtt_powder_container`.
- Expected target (active step `pick_up_mtt_powder`, interaction 0): `mtt_powder_container`, gesture `click`, validator `{preset: correct_target}`.
- Validator outcome: PASS. No `Wrong target` warning. Runtime advanced `currentInteractionIndex` 0 -> 1.
- Step delta: `activeStepIndex` 0 -> 0 (unchanged; step not yet validator-complete).
- State delta: `mtt_powder_container.state` `{material_name:"mtt_powder",material_volume:5}` unchanged (step 0 interaction 0 has no `ObjectStateChange` op).

### mtt_solubilization_readout_plate_reader_workspace

- Initial scene at mount is `mtt_solubilization_readout_bench_workspace`, not the plate-reader workspace.
- Clicked DOM: `tag=rect class="" directId=null closestId=micropipette at=(1129,798)`.
- Emitted target: `micropipette`.
- Expected target (active step `add_dmso_to_wells`, interaction 0): `micropipette`, gesture `click`, validator `{preset: correct_target}`.
- Validator outcome: PASS. No warning. `currentInteractionIndex` 0 -> 1.
- Step delta: 0 -> 0.
- State delta: `micropipette.state` `{set_volume:100, held_material_name:"empty", held_material_volume:0}` unchanged (interaction 0 has no `ObjectStateChange`; the `adjust` interaction that sets `set_volume:200` is a later interaction in the sequence).

### sdspage_attach_lid_and_leads_workspace

- Clicked DOM: `tag=rect class="" directId=null closestId=electrophoresis_tank at=(640,229)`.
- Emitted target: `electrophoresis_tank`.
- Expected target (active step `secure_apparatus`, interaction 0): `electrophoresis_tank`, gesture `click`, validator `{preset: correct_target}`.
- Validator outcome: PASS. `currentInteractionIndex` 0 -> 1.
- Step delta: 0 -> 0.
- State delta: `electrophoresis_tank.state` unchanged in snapshot, but the post-snapshot reads from a different expected object (`power_supply`) because step's interaction 1 retargets to `power_supply`. The probe re-evaluates "expected target" against `currentInteractionIndex` after click; the new expected target is `power_supply`. Runtime did mutate world objects (raw `stateChanged=true` in the probe's diff).

### sdspage_heat_denature_samples_workspace

- Clicked DOM: `tag=text class="placeholder-text" directId=null closestId=heat_block at=(640,718)`.
- Emitted target: `heat_block`.
- Expected target (active step `open_heat_block_lid`, interaction 0): `heat_block`, gesture `click`, validator `{preset: correct_target}`.
- Validator outcome: PASS. `currentInteractionIndex` 0 -> 1.
- Step delta: 0 -> 0.
- State delta: `heat_block.state.lid_open` `false -> true`. This is the `ObjectStateChange` from interaction 0's `response.scene_operations` -- it ran successfully.
- Note: the R7 report stated "the `scene-chrome` div intercepts pointer events at the click point" and the click "timed out". This probe used the same Playwright locator (`[data-target-id="heat_block"]`) and the click landed and resolved within the 4s timeout. The chrome-intercept hypothesis is not reproduced here. Either chrome geometry changed between R7 and this probe run, or R7's timeout was driven by the test code path (e.g., the long drive loop) rather than a real pointer-events block. The trace captures `tag=text class="placeholder-text"` as the actual event target, with `heat_block` resolved via `closest`, which means the asset placeholder caught the click and the closest ancestor walk found the target correctly.

## Synthesis: which boundary fails?

None of the four target-capture, name-emission, validator, or state-mutation boundaries is failing.

- DOM target capture: WORKING. `closest("[data-target-id]")` resolves the correct target id on every clicked element across all four scenes, even when the direct event target is a child node (`rect` with no `data-target-id`, or a `text.placeholder-text`).
- Emitted target name: WORKING. The id passed into the validator equals the active step's expected `target` in all four scenes.
- Validator (`correct_target`): WORKING. No `Wrong target: expected ..., got ...` warning was emitted on any of the four expected-target clicks. The runtime took the success branch and applied `response.scene_operations` (visible as `heat_block.lid_open: false -> true`, plus the post-click electrophoresis-step retarget).
- Step advancer (`currentInteractionIndex++`): WORKING. All four scenes advance `currentInteractionIndex` from 0 to 1 on the expected click.

The actual failing boundary is in the R7 detector, not the runtime. R7's `clickWorks` definition counted a pass only when `activeStepIndex`, `activeSceneId`, or `world.objects[*].state` changed. It did not look at `currentInteractionIndex`. A step in this runtime advances `activeStepIndex` only after `step_validator` (`sequence_complete`) passes AND the user clicks the chrome next-button; a single click on the first interaction advances `currentInteractionIndex` but leaves `activeStepIndex` unchanged when the step has more than one interaction or when the step-completion path waits on the next-button. The R7 detector therefore reported `clickWorks=fail` on four runs where the protocol-advance machinery was actually functioning correctly.

Two secondary findings:

- The R7 report cited a `scene-chrome` pointer-events intercept on `sdspage_heat_denature_samples_workspace`. This probe did not reproduce that intercept; the click reached the asset and produced the expected `lid_open` state mutation. The R7 timeout is more plausibly an artifact of R7's repeated drive-loop clicking the same target while `currentInteractionIndex` continued to advance, eventually clicking a placeholder text node whose chrome occlusion the harness then attributed to a layout bug.
- `world.objects[*].state` mutates correctly when the interaction's `response.scene_operations` contains an `ObjectStateChange`. The two scenes whose interaction 0 has no `ObjectStateChange` (`mtt_reagent_prep` interaction 0 and `mtt_solubilization_readout` interaction 0) showed unchanged object state, which is correct behavior.

Recommendation for the next R7 iteration: include `world.currentInteractionIndex` in the `clickWorks` pass condition alongside `activeStepIndex`, `activeSceneId`, and the object-state diff. Re-run R7 with the broadened detector to retire the false-negative row.

## Instrumentation cleanup

- No edits to any file under `src/`, `generated/`, `content/`, or `pipeline/`.
- The only new files are the underscore-prefixed temp driver
  `tests/playwright/_temp_round3_event_trace.mjs`, the build script
  `_temp_build_htmls.sh`, this report, and the artifacts under
  `test-results/round3_protocol_advance_event_trace/`.
- All page-side instrumentation is in `addInitScript` strings inside the
  temp driver. There are zero `console.log` or `console.warn` statements
  added to runtime source. Reverting is a single `rm` of the temp files.

## Reproduce

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_reagent_prep
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol mtt_solubilization_readout
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_attach_lid_and_leads
source source_me.sh && python3 pipeline/build_protocol_html.py --protocol sdspage_heat_denature_samples
node tests/playwright/_temp_round3_event_trace.mjs
```

Outputs:

- `test-results/round3_protocol_advance_event_trace/<scene>.log`
- `test-results/round3_protocol_advance_event_trace/<scene>.json`
- `test-results/round3_protocol_advance_event_trace/summary.json`
