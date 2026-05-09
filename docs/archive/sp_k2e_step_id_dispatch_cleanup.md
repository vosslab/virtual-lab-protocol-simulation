# SP-K2e: Generic directTool/modal dispatch (step.id branch cleanup)

## Status

Implemented. Kept for design rationale and verification history. Do not
re-run as a future task.

Final gate result: all five mini-protocols pass (tutorial_bench_direct,
tutorial_cell_counter, tutorial_plate_reader, tutorial_drug_dilution,
tutorial_hood_transfer); cell_culture walker holds at the prior ceiling
with no regression; build, pytest, and tsc green.

## Background

SP-K2d landed `completionPath` on every protocol step and rewired the walker to
read `kind`, `tool`, `openClick`, `advanceClick`, and `completionEvent` directly
from YAML. The runtime scene handlers, however, still gate completion on
hardcoded `currentStep.id === '<cell_culture_id>'` branches and call
`triggerStep('<cell_culture_id>')` literals. Mini-protocols whose step ids
differ from the cell_culture protocol therefore never advance even though the
walker drives the same UI gestures correctly.

## Evidence

### Blocker 1: tutorial_bench_direct

- Failing command: walker `walkDirectTool` path for `kind: directTool`,
  `tool: centrifuge`, `completionEvent: centrifuge`.
- Failing step id: any id other than literal `centrifuge` (the tutorial uses
  a tutorial-scoped id).
- Observed behavior: walker clicks centrifuge, notification fires, step never
  completes; per-step budget eventually trips `step_stalled`.
- Expected behavior: clicking the centrifuge while a `directTool` step with
  `tool: centrifuge` is active should advance that step regardless of id.
- Likely shared file/function: `src/scenes/bench.ts:402-418` (centrifuge
  handler) and `src/scenes/bench.ts:419-428` (water_bath handler).
- Code excerpt (bench.ts:402-418):

```ts
// Centrifuge: complete the centrifuge step when clicked
if (itemId === 'centrifuge') {
    const currentStep = getCurrentStep();
    // TODO: replace activeStepId peek with completion trigger lookup
    if (currentStep && currentStep.id === 'centrifuge') {
        triggerStep('centrifuge');
        gameState.flaskMediaMl = 0;
        gameState.flaskMediaAge = 'old';
    }
    showNotification('Cells centrifuged.');
    return;
}
```

### Blocker 2: tutorial_cell_counter

- Failing command: walker `walkModalStep` for `kind: modal`,
  `openClick: cell_counter`, `advanceClick: capture-count`,
  `completionEvent: count-cells-capture`.
- Failing step id: any id other than literal `count_cells`.
- Observed behavior: walker times out at
  `page.waitForFunction(...)` (30s) on the modal-readiness probe in
  `tests/playwright/e2e/protocol_walkthrough_yaml.mjs:553`. The capture
  button does render, but the step never completes; `waitForStepCompleted`
  times out because `captureCellCount` calls `triggerStep('count_cells')`,
  which `completeStep` (`src/game_state.ts:221-226`) then records as an
  out-of-order attempt and discards.
- Expected behavior: clicking `#capture-count` while a `modal` step with
  `completionEvent: count-cells-capture` is active should advance that step.
- Likely shared file/function: `src/scenes/microscope.ts:115-124`
  (`captureCellCount`).
- Code excerpt (microscope.ts:115-124):

```ts
function captureCellCount(): void {
    gameState.cellCount = gameState.actualCellCount;
    const cellState = getCellState();
    const viabilityPct = Math.round(cellState.viability * 100);
    showNotification('Captured: ~' + gameState.cellCount.toLocaleString() + ' cells/mL at ' + viabilityPct + '% viability.', 'success');
    triggerStep('count_cells');           // hardcoded id
    const overlay = document.getElementById('microscope-overlay');
    if (overlay) overlay.classList.remove('active');
    switchScene('hood');
}
```

The same shape recurs at `microscope.ts:386` (legacy quadrant submit ->
`triggerStep('count_cells')`) and `microscope.ts:494` / `:509`
(`triggerStep('plate_read')` / `triggerStep('results')`).

## Inventory of step.id branches in scene/dispatch code

| file:line | step.id checked | branch behavior | derivable from completionEvent? |
| --- | --- | --- | --- |
| `src/scenes/bench.ts:395` | `'plate_read'`, `'results'` | route plate_reader click to plate_reader scene | yes (directTool tool=`plate_reader`) |
| `src/scenes/bench.ts:406` | `'centrifuge'` | `triggerStep('centrifuge')` + zero flask volume | yes (directTool completionEvent=`centrifuge`) |
| `src/scenes/bench.ts:423` | `'prewarm_media'` | `triggerStep('prewarm_media')` | yes (directTool completionEvent=`prewarm`) |
| `src/scenes/microscope.ts:120` | (implicit) hardcoded `triggerStep('count_cells')` in capture handler | advance count_cells | yes (modal completionEvent) |
| `src/scenes/microscope.ts:386` | (implicit) hardcoded `triggerStep('count_cells')` in legacy submit | advance count_cells | yes (modal completionEvent) |
| `src/scenes/microscope.ts:494` | (implicit) hardcoded `triggerStep('plate_read')` | advance plate_read | yes (modal completionEvent) |
| `src/scenes/microscope.ts:508` | `gameState.activeStepId === 'results'` | `triggerStep('results')` on close | yes (separate modal step or close-event mapping) |
| `src/steps/drug_treatment.ts:144,162,276` | active id keyed dict `DRUG_MODAL_SCREENS[active]` | per-step modal screen + `triggerStep(stepId)` | partial (already passes active id; safe -- not a literal id check) |

`src/scenes/bench.ts:241,255,326,333` already use `result.completionEvent`
strings (`'centrifuge'`, `'prewarm'`) instead of step.id and call
`triggerStep(activeStep.id)`. That is the pattern the remaining sites should
adopt.

## Proposed global fix

Make scene click handlers and modal advance handlers id-agnostic:

1. For `directTool` steps, the bench/hood click handler reads
   `getCurrentStep().completionPath` and dispatches when:
   - `completionPath.kind === 'directTool'` AND
   - `completionPath.tool === itemId`
   Then call `triggerStep(currentStep.id)` (the active id) instead of a literal.
   Per-tool side effects (zero flask volume on centrifuge, etc.) move into a
   small map keyed by `completionPath.tool` or `completionEvent`, not step id.

2. For `modal` steps, the modal advance button handler calls
   `triggerStep(gameState.activeStepId)` instead of a literal id. Modal
   readiness/render uses `gameState.activeStepId`'s `completionPath` to choose
   screen content (the drug_treatment modal already does this; replicate the
   pattern for cell counter and plate reader).

3. Delete the `currentStep.id === '<literal>'` branches at
   `bench.ts:395, 406, 423` and the `triggerStep('<literal>')` calls at
   `microscope.ts:120, 386, 494, 509` once 1+2 land.

## Risk and blast radius

- Currently green cell_culture steps that depend on the literal-id paths:
  `centrifuge`, `prewarm_media`, `count_cells`, `plate_read`, `results`,
  and the `plate_read`/`results` -> plate_reader scene route. Each must
  keep working through the generic dispatcher. Their completionPath kinds
  in `src/content/cell_culture/protocol.yaml` need to be confirmed
  (`directTool` for centrifuge / prewarm_media / plate_reader-route;
  `modal` for count_cells / plate_read / results).
- Regression test plan: run existing
  `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` against
  `cell_culture` (must stay green), then add walkthrough invocations for
  `tutorial_pbs`, `tutorial_split`, `tutorial_bench_direct`, and
  `tutorial_cell_counter`.
- Walker `--wrong-order`: no changes required. Wrong-order detection lives in
  `walkInteractionSequence`; directTool and modal walkers do not inject and
  the proposed dispatcher continues to route unmatched clicks through the
  existing wrong-order accounting in `completeStep`.

## Recommended next atomic task

A `superpowers:subagent-driven-development` lane should implement the
generic directTool/modal dispatcher in `src/scenes/bench.ts` and
`src/scenes/microscope.ts`, then delete the literal-id branches; verify by
running the full Playwright walkthrough across cell_culture plus all four
tutorial protocols.

## Out of scope

- Refactoring `drug_treatment.ts` modal screen registry (already id-keyed
  in a way that supports tutorials by registering more entries).
- Touching `src/content/cell_culture/protocol.yaml` step ids or the walker
  helpers themselves.
- Adding new completionPath kinds (e.g. `incubation`); incubation steps stay
  on the legacy path until a separate proposal.
- Any UI/UX changes to the cell counter or plate reader modals beyond
  rewiring the trigger call.
