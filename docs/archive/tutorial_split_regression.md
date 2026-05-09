# tutorial_split walker regression

> Read-only diagnosis. Mini-protocol `tutorial_split` fails on its first
> step `tutorial_spray_hood` with "click on ethanol_bottle produced no
> state change after 3000ms". `tutorial_bench_direct` (same `kind:
> directTool` shape) passes. Pair with
> `mini_protocol_integration.md` and `sp_k2e_step_id_dispatch_cleanup.md`.

## 1. Failing protocol step

File: `src/content/tutorial_split/protocol.yaml:11-26`

- step id: `tutorial_spray_hood`
- `completionPath.kind: directTool`
- `tool: ethanol_bottle`
- `completionEvent: spray_ethanol`

Walker log line: `click on ethanol_bottle produced no state change after 3000ms`.

## 2. Comparison: tutorial_split vs tutorial_bench_direct

| Aspect             | tutorial_split            | tutorial_bench_direct                  |
| ------------------ | ------------------------- | -------------------------------------- |
| Scene              | hood                      | bench                                  |
| Item               | ethanol_bottle            | centrifuge                             |
| Step id            | tutorial_spray_hood       | tutorial_centrifuge                    |
| completionEvent    | spray_ethanol             | centrifuge                             |
| Dispatch handler   | `hood.ts:997` (legacy)    | `bench.ts:403-420` (post-SP-K2e)       |
| Walker outcome     | timeout (3000ms)          | passes                                 |

## 3. Hood directTool support

**Hood scene does not implement directTool dispatch.** Hood has only:

- `hood.ts:830` — explicit `interactionSequence` route via
  `dispatchInteractionClick`.
- `hood.ts:837-992` — legacy `resolveInteraction` fallback.
- `hood.ts:997+` — per-item hardcoded handlers that predate the
  `completionPath` schema. The `ethanol_bottle` branch hardcodes
  `triggerStep('spray_hood')` (a literal cell_culture step id).

Bench was migrated by SP-K2e to key on `completionPath.kind === 'directTool'`
and `completionPath.tool`, then `triggerStep(gameState.activeStepId)`. Hood
was not.

## 4. Root cause classification

**Runtime gap.** SP-K2e cleaned up bench and microscope but did not extend the
same generic-dispatch pattern to hood's directTool callsites. The
`ethanol_bottle` legacy branch:

```ts
if (itemId === 'ethanol_bottle') {
    gameState.hoodSprayed = true;
    triggerStep('spray_hood');  // hardcoded literal cell_culture step id
```

When the active step is `tutorial_spray_hood`, the literal-id `triggerStep`
call is dropped by `completeStep`'s id-match guard
(`game_state.ts:221-226`), so no state change occurs and the walker times
out. Same SP-K2e family of bug, different file.

## 5. Recommended fix path

Add a directTool dispatch branch in hood that mirrors `bench.ts:403-420`,
keyed on `completionPath.tool === 'ethanol_bottle'`, calling
`triggerStep(gameState.activeStepId)`. Also remove the literal
`triggerStep('spray_hood')` call so cell_culture's spray_hood step routes
through the same generic path. Sketch:

```ts
const currentStep = getCurrentStep();
if (currentStep?.completionPath?.kind === 'directTool'
    && currentStep.completionPath.tool === 'ethanol_bottle'
    && gameState.activeStepId) {
    gameState.hoodSprayed = true;
    triggerStep(gameState.activeStepId);
    showNotification('Sprayed hood with 70% ethanol.', 'success');
    renderHoodScene();
    renderProtocolPanel();
    renderScoreDisplay();
    return;
}
```

Side-effect note: `gameState.hoodSprayed = true` should ideally be gated on
`completionEvent === 'spray_ethanol'` (event-keyed, not item-keyed) per the
SP-K2e principle. Acceptable to ship the item-keyed version first if event
dispatch infrastructure isn't already there for hood.

## 6. Blocking status

**Not blocking.** `tutorial_split` is a fresh mini-protocol, not on any
critical path. The fix is ~10 lines in `hood.ts`. Land after carb_low_range
clears (active wrapper-div coder is editing style.css; this would touch
hood.ts — separate file, but queue as the next task to keep scope clean).

## 7. Open follow-ups

- Audit: are there other literal-id `triggerStep('<cell_culture_id>')` calls
  remaining in hood.ts that SP-K2e missed? Likely yes — the legacy item
  handlers at `hood.ts:997+` look like they all share this pattern. Worth a
  read-only sweep before the next mini-protocol surfaces another instance.
- Mini-protocol integration table (`mini_protocol_integration.md`) should
  flag `tutorial_split` row with this regression note.
