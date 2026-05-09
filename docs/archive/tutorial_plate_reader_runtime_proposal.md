# tutorial_plate_reader Modal Dispatch Fix

> **Merged into `sp_k2e_step_id_dispatch_cleanup.md`.**
>
> The plate-reader issue is one instance of the generic directTool/modal
> dispatch problem fixed by SP-K2e. No separate work remaining.

## Summary

Mini-protocol `tutorial_plate_reader` is complete and passes YAML validation. However, the walker fails because the bench scene hardcodes step ID checks for `plate_reader` modal dispatch.

## Root Cause

**File:** `src/scenes/bench.ts`, **Lines:** 393-401

```typescript
if (itemId === 'plate_reader') {
    const currentStep = getCurrentStep();
    if (currentStep && (currentStep.id === 'plate_read' || currentStep.id === 'results')) {
        switchScene('plate_reader');
        return;
    }
    showNotification('The plate reader is ready for the readout step.');
    return;
}
```

The handler checks `currentStep.id === 'plate_read' || currentStep.id === 'results'`. Any other step ID (including the test step `tutorial_plate_read`) fails to trigger the scene switch. The user sees a notification "The plate reader is ready for the readout step." and the modal never opens.

## Generic Fix

Replace hardcoded step ID checks with dispatch via `completionPath.kind === 'modal' && completionPath.openClick === itemId'`. This pattern already works for other modal instruments (e.g., cell_counter, which routes through `switchScene('microscope')`; see lines 438-449).

**Proposed change:**
- Check if the current step's `completionPath.kind === 'modal'` and `openClick === 'plate_reader'`
- If true, switch to the appropriate scene (extracted from step metadata or inferred)
- Fall back to the notification if the step does not use a plate_reader modal

This makes bench modal dispatch generic (one handler per openClick value, not per step ID).

## Blast Radius

**Small:** Only affects:
- `plate_read` step (cell_culture protocol)
- `results` step (cell_culture protocol)
- New mini-protocols or walkthroughs using `openClick: plate_reader` with custom step IDs

No other instruments on the bench have hardcoded step ID checks; they use direct trigger or generic modal paths (cell_counter, centrifuge, water_bath, vortex, incubator).

## Affected Steps

All bench steps that use `openClick: plate_reader` with step ID != 'plate_read' and != 'results':
- `tutorial_plate_read` (new mini-protocol)
- Any future test or training protocol using the plate_reader modal

Existing cell_culture and tutorial_* protocols are unaffected.

## Test Plan

1. Verify cell_culture protocol still passes walker (`step plate_read` and `results`)
2. Run `tutorial_plate_reader` walker with the fix and confirm it passes
3. Add a second mini-protocol with a different step ID using `openClick: plate_reader` to catch future regressions
4. Check that the `plate_reader` scene properly initializes well_plate data without full protocol context (may need fallback gameState init)

## Notes

The `plate_reader` scene (registered emitter line 20: `registeredEmitters.add('plate_read')`) expects gameState to have well_plate data populated. A bare mini-protocol with just one plate_read step may expose gameState initialization gaps. If the scene fails to render (e.g., missing well data), a secondary fix may be needed in the scene initialization logic (src/scenes/microscope.ts for plate_reader rendering).
