# Pipeline runtime contract

Date: 2026-05-27
Mission: extract the implicit runtime contract that pipeline scripts and
walker tests expect from the missing src/scene_runtime/bundle/entry.ts.

## Sources audited

- pipeline/build_protocol_html.py (~2400 lines).
- pipeline/build_runtime_bundle.sh (55 lines; esbuild IIFE config,
  global name `SceneRuntime`).
- tests/playwright/e2e/protocol_walkthrough_yaml.mjs (~1425 lines).
- tests/playwright/e2e/walker_helpers.mjs (~323 lines).

## Global exports the runtime must register

| Symbol | Signature | Purpose |
| --- | --- | --- |
| `loadAndMountByProtocolName(root: HTMLElement, protocolName: string): void` | function | entry point called by per-protocol HTML script tag |
| `gameState` | mutable object | observable state (see below) |
| `PROTOCOL_STEPS` | `ProtocolStep[]` | step catalog read by walker |
| `resolveInteractionByIndex` | function | unclear usage; walker references it |
| `renderGame` | optional function | optional manual render trigger |

`pipeline/build_runtime_bundle.sh` flags `--global-name=SceneRuntime`, so
the IIFE attaches `window.SceneRuntime.{loadAndMountByProtocolName,
gameState, ...}`. Walker tests usually read `window.gameState` directly,
suggesting the runtime also assigns top-level globals (or
`SceneRuntime.gameState === window.gameState`).

## window.gameState shape

| Property | Type | Notes |
| --- | --- | --- |
| `interactionIndex` | number | current interaction within step.sequence |
| `selectedTool` | string \| null | last tool picked up |
| `heldLiquid` | `{tool: string, liquid: string}` | derived from selectedTool |
| `activeStepId` | string \| null | currently active step |
| `activeScene` | string | one of "bench", "cell_culture_hood", "well_plate_workspace", etc |
| `completedSteps` | string[] | completed step IDs |
| `wrongOrderClicks` | number | negative-test tracking |
| `stepsOutOfOrder` | number | out-of-order detection |
| `microscopeViabilityChecked` | boolean | hemocytometer per-step flag |

All read-only from the walker side. The runtime mutates internally.

## DOM mount contract

- `#runtime-root` -- empty container; runtime fills it.
- `#protocol-runtime-data` -- `<script type="application/json">` carrying
  `{ "protocol_name": "<name>" }` only.
- Scene containers: `#bench-scene`, `#hood-scene`,
  `#well_plate_workspace-scene`, etc -- one per scene the runtime renders.
- Interactive items: `[data-item-id="<name>"]` attribute-based selectors
  (matches walker click strategy).
- Modal overlays: `#instrument-overlay`, `#incubator-screen` etc.

## Per-protocol JSON shape

Minimal inlined JSON in the page:

```json
{ "protocol_name": "<protocol_name>" }
```

The runtime resolves the full protocol definition (ProtocolStep[] with
completionPath discriminated union) from its internal catalog, not from
the inlined JSON. So the runtime must ship the protocol catalog inside
the bundle or load it lazily.

## Scene rendering interaction

The runtime appears to own the rendering and click dispatch entirely.
It does not currently consume src/scene_runtime/layout + renderer as a
library; instead it duplicates that responsibility (per the recovered
entry.ts imports: `../render/scene`, `../render/apply`,
`../chrome/...`).

This is a duplication smell. The runtime-seam plan should consider
making the runtime consume the existing
src/scene_runtime/{layout,renderer}/ modules rather than carrying its own
render path, so the layout-engine work the user just completed is
actually used at runtime.

State observability is polling-only. Walker reads `window.gameState` via
`page.evaluate` on a 3000 ms timeout per click. No event emission, no
callback registration.

## Recommended typed seam (input to runtime-seam plan)

ProtocolShellEvent discriminated union (boundary crossing):

```ts
type ProtocolShellEvent =
  | { kind: "load"; protocol: string; root: HTMLElement }
  | { kind: "step_started"; stepId: string; step: ProtocolStep }
  | { kind: "step_completed"; stepId: string }
  | { kind: "interaction_click"; itemId: string; isWrongOrder: boolean }
  | { kind: "scene_changed"; from: string; to: string }
  | { kind: "protocol_complete"; score: number };
```

ShellViewSnapshot (readonly polling alternative):

```ts
type ShellViewSnapshot = {
  readonly protocol: string;
  readonly activeStepId: string | null;
  readonly activeScene: string;
  readonly completedSteps: readonly string[];
  readonly selectedTool: string | null;
  readonly wrongOrderClicks: number;
  readonly heldLiquid: { readonly tool: string; readonly liquid: string } | null;
};
```

Recommend ProtocolShellEvent over ShellViewSnapshot: the discriminated
union expresses every observable transition once; the snapshot still
requires polling. The runtime-seam plan should adopt the event form and
emit on every transition, then derive a snapshot inside the shell adapter
if needed for Solid signals.

## Status

- Status label: DONE.
- Contract stable across walkers as of 2026-05-27.
- Open question for runtime-seam plan: does the revived runtime consume
  src/scene_runtime/{layout,renderer}/ as a library, or carry its own
  render path? Recommend the former; do not duplicate.
