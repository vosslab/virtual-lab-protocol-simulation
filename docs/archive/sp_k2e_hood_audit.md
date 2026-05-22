# SP-K2e-hood: literal-id sweep audit

> Read-only audit. Inventories every literal-id `triggerStep('...')` call in
> `src/scenes/hood.ts` and classifies each. SP-K2e fixed bench.ts and
> microscope.ts but left hood.ts. Implementer applies the generic
> active-step pattern in one sweep.

## Inventory: 9 literal-id calls in hood.ts

| #   | Line | Literal id       | Surrounding item branch                     |
| --- | ---- | ---------------- | ------------------------------------------- |
| 1   | 1005 | `'spray_hood'`   | ethanol_bottle click                        |
| 2   | 1094 | `'add_trypsin'`  | trypsin_bottle + flask                      |
| 3   | 1138 | `'pbs_wash'`     | pbs_bottle + flask                          |
| 4   | 1151 | `'pbs_wash'`     | pbs_bottle + flask shortcut                 |
| 5   | 1202 | `'seed_plate'`   | serological_pipette_with_cells + well_plate |
| 6   | 1245 | `'media_adjust'` | multichannel + media_bottle + well_plate    |
| 7   | 1268 | `'add_mtt'`      | multichannel_pipette_with_mtt + well_plate  |
| 8   | 1281 | `'decant_mtt'`   | well_plate + biohazard_decant               |
| 9   | 1304 | `'add_dmso'`     | multichannel_pipette_with_dmso + well_plate |

All live in the legacy `onItemClick` fallback (starts ~line 997).

## Classification

**All 9 = (a) convert to active-step completion.**

Reason: each branch hardcodes the cell_culture step id. When the active
protocol is a tutorial (e.g. `tutorial_spray_hood`), the literal-id
`triggerStep` is dropped by `completeStep`'s id-match guard
(`game_state.ts:221-226`) and the step never advances. Same root cause as
SP-K2e fixed in bench.ts/microscope.ts.

No (b) dead branches and no (c) keep-as-is.

## Generic dispatch pattern (mirrors `bench.ts:403-420`)

For each literal-id callsite, the conversion is:

```ts
const currentStep = getCurrentStep();
if (
  currentStep?.completionPath?.kind === "directTool" &&
  currentStep.completionPath.tool === "<item-id-or-tool-id>" &&
  gameState.activeStepId
) {
  // existing side effects (state mutations, notifications, renders)
  triggerStep(gameState.activeStepId);
  renderHoodScene();
  renderProtocolPanel();
  renderScoreDisplay();
  return;
}
```

For chain-driven branches (e.g. `multichannel_pipette_with_drug + well_plate`),
the `completionPath.kind` may be `interactionSequence` rather than
`directTool` (the chain IS the sequence). For those, the right move is to
let `dispatchInteractionClick` own the routing and remove the legacy chain
handler entirely IF no protocol step still depends on it. The implementer
must verify per-step in `src/content/cell_culture/protocol.yaml` before
deleting.

Insert new dispatch blocks BEFORE the legacy fallback at ~line 997.

## Side-effect re-anchoring

Side effects in each branch (state mutations like `gameState.hoodSprayed =
true`, notifications, render calls) stay item-keyed for now - moving them
to `completionEvent`-keyed dispatch is a separate refactor. Keep this
patch bounded.

If `step_dispatch.ts` already has an event-keyed hook similar to bench/
microscope, prefer that pattern; otherwise item-keyed is acceptable.

## Verification gates

```
bash build_github_pages.sh
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_split
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_hood_transfer
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_drug_dilution
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_bench_direct
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_cell_counter
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_reader
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs   # cell_culture must stay >= 12/25
pytest tests/
npx tsc --noEmit -p src/tsconfig.json
```

After cell_culture walker runs (which leaves the active protocol set to
`cell_culture` already), restore is not required.

For mini-protocol walker runs, the walker auto-restores cell_culture at
the end of each invocation. Confirm by reading
`src/content/protocol_data.ts` line 6 = `PROTOCOL_ID = "cell_culture"`
after the gate set finishes.

## Risks to flag

1. Some branches are chain-driven (e.g. `multichannel_pipette_with_*` +
   `well_plate`) - these may be `interactionSequence` in the YAML, not
   `directTool`. Implementer must inspect each protocol step's
   `completionPath.kind` before assuming the directTool pattern. If the
   step is `interactionSequence`, the legacy chain branch is dead and
   should be deleted (`dispatchInteractionClick` owns routing).
2. `tutorial_split` is currently broken at `tutorial_spray_hood`; after
   sweep it must pass. That's the canary for call #1.
3. The carb_intermediate / carb_low_range completion still flows through
   `dispatchInteractionClick` (interactionSequence). The wrapper-div fix
   is independent and already landed; do not touch CSS in this patch.

## Out of scope

- No schema changes.
- No walker special cases.
- No tutorial-only one-off fixes.
- No broad hood layout rewrite.
- No completionEvent-keyed side-effect refactor (separate follow-up).
- No drug-modal step migration (SP-K2f-next territory).
