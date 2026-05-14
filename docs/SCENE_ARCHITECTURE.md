# Scene architecture

## Purpose

This document explains how scenes are wired and run at runtime. The schema for
scene YAML is documented separately in
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md); the canonical terms are in
[SCENE_VOCABULARY.md](SCENE_VOCABULARY.md). Read this doc when you need to
understand the driver, registry, adapter, or capability layers, when you are
adding a new scene, or when you are debugging runtime behavior.

This doc covers the runtime side only. It does not duplicate the YAML schema
and it does not document author-facing protocol concepts (those live under the
`PROTOCOL_*` family).

## Layered model

The scene system has four cooperating layers. Each layer owns a different
concern, and the layers communicate through small, documented interfaces.

```
+------------------------------------------------------------------+
| Layer 4: per-scene YAML config                                   |
|   src/scenes/<scene>/<scene>.yaml                                |
|   Owns: static declarations (sceneId, capabilities, items,       |
|   zones, elementId, wrongOrderMessage). No behavior.             |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
| Layer 3: per-scene adapter                                       |
|   src/scenes/<scene>/<scene>.ts                                  |
|   Owns: render assembly, dispatchInteraction, per-step state     |
|   mutations, completion-event emitters, scene-specific DOM.      |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
| Layer 2: capabilities (reusable mechanics)                       |
|   src/scenes/capabilities/*.ts                                   |
|   Owns: shared mechanics that multiple scenes can compose        |
|   (item-zone click routing, modal flow, grid counting, etc.).    |
+------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------+
| Layer 1: driver core                                             |
|   src/scenes/scene_driver.ts, src/scenes/scene_registry.ts       |
|   Owns: runSceneRender, runScene lifecycle, capture-phase click  |
|   dispatch, capability and adapter registries.                   |
+------------------------------------------------------------------+
```

Higher-numbered layers depend on lower-numbered layers but never the reverse.
The driver core knows nothing about specific scenes; capabilities know nothing
about which scenes will mount them; adapters bind a specific scene id to its
behavior; YAML carries that scene id's static configuration.

## Driver (`scene_driver.ts`)

The driver is the universal scene runtime. Two entry points matter:

- `runSceneRender(sceneId)` at
  [src/scenes/scene_driver.ts:91-108](../src/scenes/scene_driver.ts) -
  Looks up the registered adapter for `sceneId`, builds a `SceneContext`, and
  calls `adapter.render(ctx)`. Throws a loud error if no adapter is
  registered. Called every frame from the `setRenderGame` switch in
  [src/init.ts](../src/init.ts).

- `runScene(sceneId)` at
  [src/scenes/scene_driver.ts:123-210](../src/scenes/scene_driver.ts) -
  Called once per scene (the first time the scene is shown). Looks up the
  scene config from `SCENE_CONFIGS`, mounts every declared capability, and
  attaches a single capture-phase click listener to the scene's DOM element.
  When a click on a `data-item-id` element bubbles through, the driver walks
  the capability list until one returns `true` from `onClick`; if none claim
  the click, the adapter's `dispatchInteraction` runs as the fallback path.

`SceneAdapter.render(ctx)` is required (not optional). The optional `?` was
a temporary bridge during the A1-A6a render-ownership migration and was
removed at the end of A6b. Every adapter under `src/scenes/<scene>/` exports
a `render` method today.

`SceneContext` carries `sceneId` and a `dispatchInteraction(itemId)` callback
that closes over the resolved adapter. Capabilities and adapter code use the
context to route clicks back through the adapter without holding a direct
reference to the registry.

`ClickTarget` is a minimal `{itemId: string}` shape (with extension fields).
The capture-phase click handler reads `data-item-id` from the click target
element and feeds it to capability `onClick` handlers as a `ClickTarget`.

## Registry (`scene_registry.ts`)

The registry is two simple maps and four functions:

- `registerCapability(capability)` and the `CAPABILITY_REGISTRY` map at
  [src/scenes/scene_registry.ts:18,54-60](../src/scenes/scene_registry.ts) -
  Capability modules call this at module load. Duplicate ids throw loudly.

- `registerScene(adapter)` and an internal `SCENE_REGISTRY` map at
  [src/scenes/scene_registry.ts:38,76-83](../src/scenes/scene_registry.ts) -
  Scene adapter modules call this at module load. Duplicate scene ids throw
  loudly.

- `getRegisteredScene(sceneId)` at
  [src/scenes/scene_registry.ts:97-99](../src/scenes/scene_registry.ts) -
  The driver uses this to look up the adapter for a scene. Returns
  `undefined` if not registered (the driver throws on `undefined` so the
  registry stays a pure data-store).

Registration is the entire reason adapter and capability modules need to be
imported from `src/init.ts`: importing the module triggers its top-level
`registerScene(...)` or `registerCapability(...)` call. Without the import,
no registration runs and the registry stays empty for that scene.

## Adapters

Six first-class adapters live under `src/scenes/<scene>/`. Each registers
itself at module load and provides `dispatchInteraction(itemId, ctx)` and
`render(ctx)`.

| Scene | Adapter file | Notes |
| --- | --- | --- |
| Bench | [src/scenes/bench/bench.ts](../src/scenes/bench/bench.ts) | Persistent equipment-bench scene; layout-engine-driven items. Split by responsibility seam (Patch C2, 2026-05-09): `bench.ts` is a thin wrapper holding module-load registrations and the `SceneAdapter` shell; `render.ts` owns assembly + event wiring; `dispatch.ts` owns click handling and K2 completionPath routing; `effects.ts` is the reserved seam for future state-transition handlers. |
| Cell-culture hood | [src/scenes/cell_culture_hood/cell_culture_hood.ts](../src/scenes/cell_culture_hood/cell_culture_hood.ts) | Split across the adapter file (dispatch + registration) and a sibling [render.ts](../src/scenes/cell_culture_hood/render.ts) (assembly seam). Dispatch is K2-only (Patch C1, 2026-05-09): the legacy compatibility-token ladder folded into completionPath dispatch and `buildLegacyToken` was retired. |
| Incubator | [src/scenes/incubator/incubator.ts](../src/scenes/incubator/incubator.ts) | Modal overlay scene for incubation timing. |
| Microscope | [src/scenes/microscope/microscope.ts](../src/scenes/microscope/microscope.ts) | Modal overlay scene; mounts to the shared `instrument-overlay` element. Manual hemocytometer flow extracted (Patch C3, 2026-05-09) into sibling [manual_hemocytometer.ts](../src/scenes/microscope/manual_hemocytometer.ts) so the automated cell-counter and manual grid-counting paths no longer share a single dispatcher. |
| Well-plate workspace | [src/scenes/well_plate_workspace/well_plate_workspace.ts](../src/scenes/well_plate_workspace/well_plate_workspace.ts) | First-class workspace scene for plate-transfer and tube-prep mini-protocols. Render assembly and dispatch live in sibling [render.ts](../src/scenes/well_plate_workspace/render.ts) and [dispatch.ts](../src/scenes/well_plate_workspace/dispatch.ts). |
| Plate reader | [src/scenes/plate_reader/plate_reader.ts](../src/scenes/plate_reader/plate_reader.ts) | Render-only modal scene; click handlers are wired directly inside the renderer rather than dispatched through `data-item-id`. Mounts to the shared `instrument-overlay` element. |

The microscope and plate_reader adapters share a single DOM modal slot, the
`instrument-overlay` element. See
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) for the elementId design
rationale and the constraint on adding a third instrument-style scene.

## Capabilities

Capabilities are reusable mechanics that scenes opt into by listing them in
the YAML `capabilities` array. Each capability conforms to the
`SceneCapability` contract (`mount`, `onStepChange`, `onClick`, `unmount`)
and registers at module load.

Six capability ids are registered today. Their runtime status varies: most
capabilities serve as click routers or no-op state holders and validate a
small slice of their declared config. This matches the status recorded in
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

| Capability id | Module | Status |
| --- | --- | --- |
| `itemWorkspace` | [item_workspace.ts](../src/scenes/capabilities/item_workspace.ts) | ACTIVE. Validates `items` and `zones` and dispatches `data-item-id` clicks to the scene adapter. |
| `modalWorkspace` | [modal_workspace.ts](../src/scenes/capabilities/modal_workspace.ts) | RESERVED. Validates only `sceneId`; per-capability behavior not yet implemented. |
| `instrumentWorkspace` | [instrument_workspace.ts](../src/scenes/capabilities/instrument_workspace.ts) | RESERVED. Validates only `sceneId`. |
| `gridCountingWorkspace` | [grid_counting_workspace.ts](../src/scenes/capabilities/grid_counting_workspace.ts) | PARTIAL. Mounts and routes quadrant clicks; the per-scene `quadrants` config block is RESERVED. |
| `incubatorWorkspace` | [incubator_workspace.ts](../src/scenes/capabilities/incubator_workspace.ts) | RESERVED. Validates only `sceneId`. |
| `plateReaderWorkspace` | [plate_reader_workspace.ts](../src/scenes/capabilities/plate_reader_workspace.ts) | RESERVED. Validates only `sceneId`. |

A seventh capability id, `liquidTransfer`, is whitelisted in the YAML
validator but no capability module is registered for it and no scene
declares it. Treat it as RESERVED for a future shared liquid-transfer
capability.

## Module-load side effects

This section is load-bearing. Every adapter module performs work at module
load that nothing else triggers; if the adapter is not imported from
`src/init.ts`, that work silently does not happen.

The lesson comes from the post-execution review in
[archive/scene_render_migration_2026-05-09.md](archive/scene_render_migration_2026-05-09.md):
two patches (A6a and B1) shipped with orphaned `registeredEmitters.add(...)`
calls in source modules that nothing imported anymore. The protocol
validator threw `missing completion-event emitter` at page load and a
modal-alert overlay blocked walker pointer events on cell_culture step 6.
The fix was to move the side effects into the owning adapter; the cheaper
prevention is to enumerate and reason about side effects whenever ownership
moves.

When migrating, retiring, or auditing a scene module, enumerate every kind
of module-load side effect that lives in it:

- `registeredEmitters.add(...)` calls (completion-event registration).
- `registerScene(...)` and `registerCapability(...)` calls.
- `window.*` and test-API bindings.
- Top-level `addEventListener` and observer setup.
- Mutations of any global registry (`SCENE_REGISTRY`, `CAPABILITY_REGISTRY`,
  any other module-level map).
- Side-effect-only imports (`import "./foo";` with no name binding).

If a source module is being retired, every one of these must move with the
responsibility, not stay behind. After the move, the source module must
contain no top-level statements with side effects. After the move, the new
owning module must remain reachable from `src/init.ts` (directly or via the
chain of side-effect imports starting there).

Three adapter files (cell_culture_hood, plate_reader, microscope) carry an
explicit MODULE-LOAD warning comment at the top, added during the B5 audit,
spelling this out for future editors.

## How a frame renders

A single click-to-frame round trip looks like this:

1. The user clicks an item in the hood. The browser fires `click`.
2. The driver's capture-phase listener (attached during `runScene`) reads
   `data-item-id` from the target element. If absent, it returns.
3. The driver iterates the scene's mounted capabilities and calls
   `capability.onClick(ctx, {itemId})` on each. The first capability to
   return `true` claims the click; the driver marks the event as handled
   and stops propagation.
4. If no capability claims the click, the adapter's `dispatchInteraction`
   runs as the fallback path (used by adapters whose dispatch logic is not
   yet split into a capability).
5. `dispatchInteraction` mutates `gameState`, may call
   `triggerStep(stepId)` to advance the protocol, and finally calls
   `renderGame()`.
6. `renderGame()` runs the `setRenderGame` switch in
   [src/init.ts:216-287](../src/init.ts). The case for the active scene
   calls `runSceneRender(sceneId)`.
7. `runSceneRender` looks up the adapter and calls `adapter.render(ctx)`.
   The adapter rebuilds its DOM/SVG and reattaches its listeners.

The first time a scene is shown, the case in `setRenderGame` also calls
`runScene(sceneId)` (gated by the `DRIVER_INITIALIZED_SCENES` set) to mount
capabilities and attach the capture-phase listener. Subsequent frames only
re-render.

## How to add a new scene

See [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) for the complete scene
YAML schema. A new scene requires both a YAML configuration file and a
TypeScript adapter module that implement the runtime and rendering behavior.
At build time, the scene YAML is validated and compiled into generated
TypeScript exports consumed by the driver.

## Shared infrastructure

Several modules under [src/scenes/shared/](../src/scenes/shared/) host code
that multiple scene adapters reuse. Each is a single source of truth for
its concern.

- [liquid_transfer.ts](../src/scenes/shared/liquid_transfer.ts) - Liquid
  handling abstractions: `deriveHeldLiquid`, `canonicalTool`, and the
  `LIQUID_BY_ASSET_ID` map. Consolidated in the B1 patch; do not duplicate
  these helpers in adapters.
- [wrong_order_feedback.ts](../src/scenes/shared/wrong_order_feedback.ts) -
  `showWrongOrderToast(message)` for the transient warning toast. Today
  the toast styling and 2 s lifetime are hardcoded; the per-scene
  `wrongOrderMessage` YAML field is RESERVED for future wiring.
- [scene_item_lookup.ts](../src/scenes/shared/scene_item_lookup.ts) -
  Item-id lookup helpers introduced during the bench/hood YAML layout
  migration so adapters can resolve scene items without duplicating the
  lookup rules.

The legacy `src/scenes/shared/legacy_tokens.ts` module (and its
`buildLegacyToken` API) was deleted in Patch C4 (2026-05-09) once the
hood ladder folded into K2 completionPath dispatch. There is no
compatibility-token shim anymore: dispatch reads `completionPath`
directly.

## Relation to scene YAML

Scene YAML declares static configuration; this doc covers the runtime that
interprets it. See [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) for the
schema, the validator rules, and the build pipeline that emits
`generated/scene_data.ts` (consumed via `src/scene_configs.ts`). Scene YAML is engine-facing configuration
today, not author-facing content; if scene YAML becomes author-facing
later, the file location moves under `src/content/scenes/` in a separate
migration.

## Related docs

- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) - Scene YAML schema and
  validator rules.
- [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) - Canonical terms used by
  this doc, the schema doc, and scene-related code.
- [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) - Higher-level system
  overview; the "Capability-based scene architecture" section there points
  at this doc for the deep dive.
- [archive/scene_render_migration_2026-05-09.md](archive/scene_render_migration_2026-05-09.md) -
  Archived plan and post-execution lesson on module-load side effects.
