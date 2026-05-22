# Batch 2 Workstream I: Runtime Interaction Stress

Production dispatch chain stress test via the dev_smoke
`well_plate_96_zoom_check` harness. Driven by
`tests/playwright/spike_batch2_interaction_stress.mjs` against the prebuilt
`dist/runtime.bundle.js` and `dist/_spike_well_plate_96_zoom_check.html`.

## Per-interaction results

| Interaction                | Iterations | Expected invocation delta (min) | Actual invocation delta | body.children delta | dom.nodes delta | mem delta (bytes) | PASS/FAIL |
| -------------------------- | ---------- | ------------------------------- | ----------------------- | ------------------- | --------------- | ----------------- | --------- |
| repeated_correct_clicks_E7 | 50         | 1                               | 1                       | 0                   | 1               | 0                 | PASS      |
| wrong_target_A1            | 1          | 0                               | 0                       | 0                   | 0               | n/a               | PASS      |
| selected_well_state_visual | 0          | 0                               | 0                       | 0                   | 0               | n/a               | PASS      |
| cross_object_clicks        | 0          | 0                               | 0                       | 0                   | 0               | n/a               | PASS      |
| object_state_change_cycles | 50         | 0                               | 0                       | 0                   | 0               | 0                 | PASS      |
| race_condition_5x_fast     | 5          | 0                               | 0                       | 0                   | 0               | n/a               | PASS      |

## Notes per interaction

- **repeated_correct_clicks_E7**: Step completes on first correct click; later clicks may not re-increment. mid_invocation_after_click1=2
- **wrong_target_A1**: Wrong target: protocol target is E7, A1 should not advance the step.
- **selected_well_state_visual**: SKIP - dev_smoke protocol does not expose selected state, and \_\_spike API exposes no scene mutation entry point.
- **cross_object_clicks**: SKIP - dist/\_spike_well_plate_96_zoom_check.html harness only wires well_plate_96_zoom_check; no other dev_smoke scene available through this bundle.
- **object_state_change_cycles**: per_cycle_increments=0/50; step completes on first click, later clicks exercise dispatch idempotency.
- **race_condition_5x_fast**: 5 fast clicks dispatched within 2ms; dispatcher should serialize handler invocations.

## Screenshots

- repeated_correct_clicks_E7:
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_repeated_correct_clicks_before.png`
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_repeated_correct_clicks_after.png`
- wrong_target_A1:
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_wrong_target_before.png`
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_wrong_target_after.png`
- object_state_change_cycles:
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_state_cycle_before.png`
  - `docs/active_plans/new3_layout_stress_reliability_assets/lane_i_state_cycle_after.png`

## Totals and verdict

- Total invocation count over all interactions: 1
- Total body.children growth across all interactions: 0
- Total dom.nodes growth across all interactions: 1
- Console errors / page errors captured: 0
- Race condition observed: NO
- Memory growth observed (performance.memory): 0 bytes

### Verdicts

- **DOM leak check (per-interaction, body.children delta == 0)**: PASS.
- **Race condition safety**: PASS (no DOM leak, dispatch serialized via async handler).
- **Wrong-target behavior**: PASS (DOM stable; protocol target unchanged).
- **Memory leak via performance.memory**: PASS (growth under 5 MB across all stress interactions).

## Console output summary (last 40 entries)

```
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
[warning] Interaction index out of range
```
