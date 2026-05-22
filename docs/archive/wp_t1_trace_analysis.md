# WP-T1 trace analysis: pbs_wash passes, add_trypsin fails

> **Status: resolved by WP-H1.** Kept as the root-cause record for M0. The
> per-event-switch scope statement was accurate at the time of WP-H1; later
> generic dispatch work (SP-K2e) further consolidated scene dispatch.

Date: 2026-05-08. Read-only investigation. No production-code edits.

## Root cause

`src/scenes/hood.ts:791` gates the resolver-first dispatch on the obsolete
top-level `activeStep.interactionSequence` field:

```ts
export function onItemClick(itemId: string): void {
    const activeStep = getCurrentStep();
    if (activeStep && activeStep.interactionSequence) {
        dispatchInteractionClick(itemId);
        return;
    }
    // Legacy path for steps without interactionSequence
    ...
}
```

Post-K2 the schema only emits `step.completionPath.interactions` (verified in
`src/content/protocol_data.ts`: every step has `completionPath`, none has
top-level `interactionSequence`). Therefore the guard at line 791 is **always
false** for every step, and `dispatchInteractionClick` (lines 521-785) is
**dead code**. Every click falls through to the legacy item-id ladder
(lines 798-1276).

Inside `dispatchInteractionClick` itself, the same stale field is read at
lines 553, 587, 606, 622, 637, 653, 669, 686, 706, 721, 732, 745, 760
(`activeStep.interactionSequence.length` and indexed reads). Even if the
guard at 791 were fixed, those internal reads would also need migrating to
`completionPath.interactions`.

The defensive backstop in `src/game_state.ts:236` reads the same obsolete
field and so never fires:

```ts
if (activeStep.interactionSequence && gameState.interactionIndex < activeStep.interactionSequence.length) { ... }
```

## Why pbs_wash passes but add_trypsin fails (asymmetry explained)

Both steps fall through to the legacy resolver (`resolveInteraction`, lines
64-164 of `src/interaction_resolver.ts`) and then to the legacy if-ladder.
The legacy resolver has Case 3 Subcase 3b (lines 150-158): match when
`!args.selectedTool && interaction.tool === args.clickedItem &&
interaction.destination`. This is a "tool-click shortcut" that returns
`discharge` immediately on click 1 if no tool is selected.

Walker click 1 of pbs_wash:

- `clickedItem='serological_pipette'`, `selectedTool=null` (clean state at
  start of step).
- Subcase 3b matches against `interaction[1]` of pbs_wash
  (`tool=serological_pipette`, `destination=flask`).
- Returns `discharge` with `completionEvent='pbs_wash'`.
- Hood legacy block at line 865 fires `triggerStep('pbs_wash')`.
- Step completes immediately on click 1.

The walker continues iterating the remaining 3 clicks of pbs_wash's plan
against the now-active `add_trypsin` step. None of those clicks match
anything meaningful, so they ping-pong through the legacy if-ladder:

- click 2 `pbs_bottle`: line 1002 picks it up, `selectedTool='pbs_bottle'`.
- click 3 `serological_pipette`: tool='pbs_bottle' has no handler;
  `registerWarning` resets `selectedTool=null`.
- click 4 `flask`: line 1002 picks it up, `selectedTool='flask'`.

Walker observes state changes after each click ("progressed"), then waits
for `pbs_wash` in `completedSteps` (already true). pbs_wash passes.

Now active step is `add_trypsin` and **`selectedTool='flask'` carries over**.
Walker click 1 of add_trypsin:

- `clickedItem='serological_pipette'`, `selectedTool='flask'`.
- Subcase 3b precondition `!args.selectedTool` is **false** (selectedTool is
  set). The shortcut does not fire.
- Case 2 i=0 (load): `selectedTool='flask' !== tool='serological_pipette'`.
  No match.
- Case 3 Subcase 3a i=1: `tool !== selectedTool`. No match.
- Returns `no-op`.
- Hood legacy if-ladder: tool='flask' has no
  `flask + serological_pipette` branch. Line 1268: `registerWarning`,
  `selectedTool=null`.

Walker clicks 2-4 ping-pong similarly: clickedItem gets picked up as
`selectedTool` (line 1002), then either has no matching tool+itemId branch
or hits `registerWarning`. None of the four clicks reaches a path that calls
`triggerStep('add_trypsin')`. The trypsin discharge handler at line 876 is
in the _legacy block_ (lines 841-947) but is only entered when
`resolveInteraction` returns `discharge`, which it does not because
`selectedTool='flask'` blocks every match.

After the four clicks, `completedSteps` does not include `add_trypsin`.
`waitForStepCompleted` at line 845 of the walker times out at 30s. Failure.

The asymmetry is environmental: pbs_wash inherits `selectedTool=null` from
the just-completed `aspirate_old_media` (which legitimately resets it via
`startAspiration`). add_trypsin inherits the polluted `selectedTool='flask'`
left by pbs_wash's "ghost clicks" 2-4 against the wrong active step.

## Mapping to handoff hypothesis list

| #   | Hypothesis                                                 | Verdict                                                                                                           |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Per-event branch bug in `dispatchInteractionClick` 600-800 | **Not the cause.** That function is dead code.                                                                    |
| 2   | `completeStep` defensive backstop misfires                 | Not the cause. The backstop reads the same stale field and never fires.                                           |
| 3   | `selectedTool` not cleared between steps                   | **Confirmed contributing factor.** Carryover from pbs_wash's ghost clicks pollutes add_trypsin.                   |
| 4   | `heldLiquid` issue                                         | Not the cause; heldLiquid is null throughout.                                                                     |
| 5   | Dispatch ownership: resolver-first path incomplete         | **Confirmed root cause.** Resolver-first path is dead-coded by the stale field-name guard at line 791.            |
| 6   | Walker assumption bug                                      | Not the cause. The walker's "wait for completedSteps" check is correct; the runtime is what fails to populate it. |

The dominant cause is hypothesis #5: the resolver-first dispatch is gated on
an obsolete property name. Hypothesis #3 (selectedTool carryover) is the
proximate trigger that exposes the asymmetry, but the real fix is to
activate the K2-aware path so the legacy ladder is never reached for
interactionSequence steps.

## Proposed fix shape (for WP-H1)

Mechanical migration of stale property reads, not a per-branch alignment.

1. `src/scenes/hood.ts:791` - change guard:
   `activeStep && activeStep.interactionSequence` ->
   `activeStep && activeStep.completionPath && activeStep.completionPath.kind === 'interactionSequence'`.
2. Inside `dispatchInteractionClick` (`src/scenes/hood.ts:521-785`): replace
   every `activeStep.interactionSequence` read with the K2 path. The hot
   sites are 553, 587, 606, 622, 637, 653, 669, 686, 706, 721, 732, 745, 760. Read interactions via a local
   `const interactions = activeStep.completionPath.kind === 'interactionSequence' ? activeStep.completionPath.interactions : null` near the top of the function and use `interactions.length` /
   `interactions[idx]` thereafter.
3. `src/game_state.ts:236` - same migration in the defensive backstop.
4. No changes to the resolver itself (already K2-aware post-#81).
5. No changes to per-event branches inside `dispatchInteractionClick`. The
   long event-switch is duplicative across `pbs_wash` /
   `pipette_trypsin` / `pipette_media` etc., but that is a separate
   refactor and is out of scope for M0. Per the plan's design guardrail,
   noted as a candidate for a follow-up that extracts shared discharge
   handling - but only after the walker is green at the design level.

The legacy block at lines 798-1276 stays in place for now; per WS-DeadCode
(M2), branches proven dead post-fix can be deleted then. Most of that
ladder is now formally unreachable for `interactionSequence` steps once
line 791 routes them to `dispatchInteractionClick`, but the same ladder
also handles legacy item-id flows and may still serve `directTool`/`modal`
items.

## Scope statement

This fix is bounded:

- 2 files touched (`src/scenes/hood.ts`, `src/game_state.ts`).
- No new types. No schema change. No walker change.
- No `step.id` branches added. No `window.set*ForWalker`. No top-level
  `interactionSequence` fallback.
- Aligns with M0 design guardrail: do not preserve a brittle per-event
  switch when identical-shape steps are handled differently. The
  asymmetry vanishes once the K2-aware path activates; the per-event
  switch inside `dispatchInteractionClick` already handles both pbs_wash
  and pipette_trypsin uniformly via `triggerStep(activeStep.id)`.
