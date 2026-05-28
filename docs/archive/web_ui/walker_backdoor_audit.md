# Walker backdoor audit (web-ui shell side quest)

Date: 2026-05-27
Mission: read-only catalog of every non-visible-UI path in existing
Playwright walkers and walkthrough scripts, so the shell never reproduces
those patterns. Feeds the no-backdoor list in
[protocol_execution_seam.md](protocol_execution_seam.md) question (c).

## Files audited

Playwright tree (recursive):

- `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` (main walker).
- `tests/playwright/e2e/walker_helpers.mjs` (helpers).
- `tests/playwright/walker/engine.mjs` (alternate schema-driven walker).
- `tests/playwright/walker/index.js` (legacy walker, deprecated).
- `tests/playwright/walker/click_resolver.js`.
- `tests/playwright/walker/screenshot.js`.
- `tests/playwright/walker/run.mjs`.
- `tests/playwright/walker/audit_all.mjs`.

Python wrappers:

- `tools/run_protocol_walkthrough.py`.
- `tools/run_smoke.py`.

## Findings by severity

Total: 15 distinct backdoor patterns. BLOCKING 10, CONCERN 2, INFO 3.

| Category | Count | Example |
| --- | --- | --- |
| window-global mutation | 5 | `window.prompt = function() {...}`, `window.gameState.activeScene = "..."` |
| internal-API call | 8 | `window.gameState.interactionIndex` reads, `window.PROTOCOL_STEPS` reads |
| game-state write | 2 | Direct `gameState` assignment, `localStorage.clear()` |
| prompt-confirm override | 2 | `window.prompt()` stub for quadrant counting |
| force-scene-change | 1 | Direct scene mutation as fallback path |

## Per-protocol branching scan

**None in walker dispatch.** Walker dispatch is pure schema-driven:

- `protocol_walkthrough_yaml.mjs` switches on `step.completionPath.kind`.
- `engine.mjs` has zero protocol-name conditionals.
- Scene switching driven by `step.scene` YAML field.
- One assertion at `protocol_walkthrough_yaml.mjs:1105` keyed on
  `protocolId === "tutorial_plate_drug_additions"` for test verification
  only. Acceptable in a test; never acceptable in a shell.

Walker dispatch is conformant with PRIMARY_SPEC.md walker requirement.
The shell must preserve that property: no `if (protocolName === ...)` in
`src/shell/`.

## No-backdoor list (shell must never call)

Window exports:

- `window.gameState.*` (any property, read or write).
- `window.PROTOCOL_STEPS` (read or write).
- `window.resolveInteractionByIndex` (call).
- `window.renderGame()` (call).
- `window.prompt` (read or assignment).
- `localStorage` (direct mutation; use UI button instead).
- `__RUNTIME_PROTOCOL_CONFIG`, `__RUNTIME_TEST_CLOCK`,
  `__RUNTIME_CLICK_LOG`, `__RUNTIME_CHECK_STEP_LOG`,
  `__RUNTIME_ORCHESTRATE_LOG`, `__RUNTIME_LAST_BUTTON_RENDER`.

Mutation patterns (forbidden in shell):

- `window.gameState = {...}` (full assignment).
- `window.gameState.activeScene = "..."` (scene force).
- `window.gameState.selectedTool = "..."` (tool force).
- `window.gameState.interactionIndex = ...` (step force).
- `localStorage.clear()`.
- Any `window.prompt` reassignment.

Scene-skip patterns (forbidden):

- Per-protocol conditionals in scene switching.
- Hard-coded scene names in branching.
- Direct scene state mutation (visible UI clicks only).

## Constraint for boundary lint (WP-1-7)

When WP-1-7 ships, the boundary lint should also reject:

- Any string-literal `window.gameState` access from
  `src/shell/`. The shell-side accessor must go through the typed
  adapter (`src/shell/adapter/types.ts` once the runtime-seam plan
  defines it).
- Any string-literal `window.PROTOCOL_STEPS`,
  `window.resolveInteractionByIndex`, `window.renderGame`,
  `window.prompt = ` from `src/shell/` or `src/launcher/`.

This widens the boundary lint beyond the original two rules (no
`solid-js` and no `src/shell/` imports under `src/scene_runtime/`). Add
as a third rule when the runtime-seam plan resumes.

## Walker references the audit relies on

- `protocol_walkthrough_yaml.mjs:294` -- read `interactionIndex`.
- `protocol_walkthrough_yaml.mjs:314, :344` -- read `wrongOrderClicks`.
- `protocol_walkthrough_yaml.mjs:316, :348` -- read `activeStepId`.
- `protocol_walkthrough_yaml.mjs:1105` -- per-protocol assertion (test
  verification, acceptable in test, forbidden in shell).
- `walker_helpers.mjs:17-18` -- read `gameState`, `completedSteps`.
- `walker_helpers.mjs:35` -- read `heldLiquid`.
- `walker_helpers.mjs:56` -- read `selectedTool`.
- `walker_helpers.mjs:69` -- read `activeScene`.

## Status

- Status label: `DONE_WITH_CONCERNS`.
- Concern: walkers rely on `window.gameState` polling, an untyped global
  surface. The shell must replace that with a typed observer once the
  runtime-seam plan resumes.
- All 15 backdoor patterns documented and forbidden for shell code.
- No per-protocol branching in walker dispatch; preserve this property
  in shell.
