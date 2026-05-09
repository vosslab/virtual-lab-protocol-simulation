# Scene vocabulary

## Purpose

This doc defines the canonical terms used in the scene system. When the
codebase or other docs use any of these words, they mean what is defined
here. The schema is in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md); the
runtime is in [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md). This doc is
the parallel of [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) for the
scene system: when a code comment, error message, validator output, or
test name uses any of these terms, it must use them with these meanings.

## Terms

| term | one-line definition |
| --- | --- |
| scene | A self-contained interactive surface (bench, hood, microscope, etc.) with one DOM root, one adapter, and one YAML config where static scene config exists. |
| scene id | The stable string id for a scene; matches the directory name and YAML basename and is the key into `SCENE_CONFIGS` and the scene registry. |
| adapter | The per-scene TypeScript object that owns `render` and `dispatchInteraction` for one scene id. |
| capability | A reusable runtime mechanic (click routing, modal flow, grid counting) that scenes opt into by listing in their YAML `capabilities` array. |
| workspace | A YAML-declared advisory family label naming a scene's surface kind (`equipment_bench`, `wet_lab_hood`, `modal_overlay`); reserved for future runtime use. |
| item | A clickable element declared by `items[]` in scene YAML and dispatched by `data-item-id`. |
| zone | A layout region declared by `zones[]` in scene YAML; items reference zones by id. |
| wrongOrderMessage | A YAML block with a per-scene wrong-order toast template; RESERVED today (the toast helper hardcodes the message). |
| elementId | The DOM element id where the driver attaches its capture-phase click listener; defaults to `${sceneId}-scene` if omitted. |
| instrument-overlay | The shared modal-slot DOM element used by both microscope and plate_reader; only one scene is visible in the slot at a time. |
| module-load side effect | Top-level statement in an adapter or capability module that runs when the module is imported (registration, emitter pre-registration, listener attach, registry mutation). |
| completion event | The string id passed to `triggerStep(stepId)` to signal that a step has completed; pre-registered via `registeredEmitters.add(...)`. |
| render | The adapter's `render(ctx)` method; rebuilds the scene's DOM/SVG and rewires its listeners. |
| dispatchInteraction | The adapter's `dispatchInteraction(itemId, ctx)` method; the fallback path the driver invokes when no capability claims a click. |
| SceneContext | The runtime context object passed to capability and adapter methods; carries `sceneId` and a `dispatchInteraction(itemId)` callback. |
| ClickTarget | The minimal `{itemId: string}` shape the driver builds from `data-item-id` and feeds to capability `onClick` handlers. |
| scene registry | The internal `SCENE_REGISTRY` map keyed by scene id; populated by `registerScene` calls at module load. |
| capability registry | The `CAPABILITY_REGISTRY` map keyed by capability id; populated by `registerCapability` calls at module load. |

## Term reference

### scene

A self-contained interactive surface in the game. Each scene has one DOM
root element and one TypeScript adapter, and where it has declarable
static scene config that config lives in one YAML file. Scenes that are
render-only or programmatically configured may opt out of YAML; today
every shipped scene has a YAML, but the rule is "one YAML where static
config exists," not "every scene must have a YAML." There are six scenes
today: bench, cell_culture_hood, incubator, microscope, plate, plate_reader.
Adapter files live under `src/scenes/<scene>/<scene>.ts`.

### scene id

The stable string id for a scene. It matches the directory name, the YAML
basename, the adapter's `sceneId` field, the key in
[src/content/scene_data.ts](../src/content/scene_data.ts) `SCENE_CONFIGS`,
and the key in the scene registry. Example: `bench`, `cell_culture_hood`,
`plate_reader`. The discoverer in
[tools/build_scene_data.py](../tools/build_scene_data.py) globs
`src/scenes/<scene>/<scene>.yaml` to pick scenes up.

### adapter

The per-scene TypeScript object that implements `SceneAdapter`
([src/scenes/scene_registry.ts:31-36](../src/scenes/scene_registry.ts)).
Owns `render(ctx)` and `dispatchInteraction(itemId, ctx)` for one scene
id. Adapters are registered at module load via `registerScene(adapter)`.
Example: the bench adapter at
[src/scenes/bench/bench.ts:609-619](../src/scenes/bench/bench.ts).

### capability

A reusable runtime mechanic shared across scenes. Implements the
`SceneCapability` interface
([src/scenes/scene_driver.ts:35-73](../src/scenes/scene_driver.ts)) with
`mount`, `onStepChange`, `onClick`, and `unmount`. Capability modules
self-register via `registerCapability(capability)` at module load. Six
capability ids exist; see [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md)
for which are ACTIVE versus RESERVED.

### workspace

A YAML field naming the workspace family for a scene; values seen today
are `equipment_bench`, `wet_lab_hood`, and `modal_overlay`. Required by
the validator
([tools/build_scene_data.py](../tools/build_scene_data.py)) but not yet
read by any TypeScript code. `workspace` is required by the scene YAML
validator, but it is advisory at runtime today. Reserved for future
selectors, telemetry, or scene-profile dispatch. Example:

```yaml
sceneId: bench
workspace: equipment_bench
```

### item

A clickable element declared by an entry in the scene YAML's `items[]`
array. Carries an `id` (used as `data-item-id` in the DOM), a `label`,
usually a `zone`, and (for layout-engine items) an `svgAsset`, `kind`,
`depthTier`, and tab-stop / anchor fields. The driver routes clicks on
elements bearing a matching `data-item-id` through capabilities and the
adapter's `dispatchInteraction`. Schema: see
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) "Items".

### zone

A layout region declared by an entry in the scene YAML's `zones[]` array.
Items reference zones by id via `items[].zone`. Layout-engine zones carry
`x0`, `x1`, `baseline`, `gap`, and `align` for the layout engine.
Schema: see [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) "Zones".

### wrongOrderMessage

A YAML block with two fields, `template` and `toastDurationMs`, declaring
a per-scene wrong-order toast template. Declared in every full scene YAML
but RESERVED at runtime today: the toast helper in
[src/scenes/shared/wrong_order_feedback.ts](../src/scenes/shared/wrong_order_feedback.ts)
hardcodes the styling and a 2 s lifetime. The YAML field is kept so the
per-scene template intent is recorded and so wiring it later is a
localized change.

### elementId

The DOM element id where the driver attaches its capture-phase click
listener. Optional in the YAML; defaults to `${sceneId}-scene` when
absent. The runtime read happens in
[src/scenes/scene_driver.ts:174-175](../src/scenes/scene_driver.ts).
Used by the cell_culture_hood scene (`hood-scene`) and the microscope
and plate_reader scenes (both `instrument-overlay`) where the DOM id
does not match `${sceneId}-scene`.

### instrument-overlay

The shared modal-slot DOM element used by both the microscope and
plate_reader scenes. Both adapters render into the same container; only
one is visible at a time. The shared name reflects the shared role; do
not add a third instrument-style scene without adopting the same slot or
introducing a clearly-named new slot. Rationale and the constraint live
in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

### module-load side effect

Any top-level statement in an adapter or capability module that runs when
the module is imported. Examples include `registerScene(...)`,
`registerCapability(...)`, `registeredEmitters.add(...)`, top-level
`addEventListener` calls, and `window.*` test-API bindings. Module-load
side effects only fire if the module is imported from
[src/init.ts](../src/init.ts) (directly or transitively); orphaning a
module silently disables every side effect inside it. See the dedicated
"Module-load side effects" section of
[SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) for the full list and the
A6a / B1 regression history.

### completion event

The string id passed to `triggerStep(stepId)` to signal that a step has
completed. Each completion-event id must be pre-registered via
`registeredEmitters.add('<event>')` at module load so the protocol
validator's coverage check (`validateCompletionEventCoverage` in
[src/init.ts](../src/init.ts)) can confirm every declared step has a
matching emitter at startup. Missing emitters either throw (STRICT
policy) or warn (RELAXED policy) depending on the protocol.

### render

The adapter's `render(ctx)` method. Rebuilds the scene's DOM/SVG and
reattaches its listeners on every frame. Required (not optional) on
`SceneAdapter` since the end of the A6b migration. Called from
`runSceneRender(sceneId)` at
[src/scenes/scene_driver.ts:91-108](../src/scenes/scene_driver.ts).

### dispatchInteraction

The adapter's `dispatchInteraction(itemId, ctx)` method. Invoked through
the `SceneContext.dispatchInteraction` callback. Today this is the
fallback path the driver uses when no mounted capability returns `true`
from `onClick` for a given item id. As more capabilities migrate
behavior off the adapter, this path will narrow.

### SceneContext

The runtime context object created by the driver and passed to capability
and adapter methods. Defined at
[src/scenes/scene_driver.ts:21-29](../src/scenes/scene_driver.ts).
Carries `sceneId` and a `dispatchInteraction(itemId)` callback bound to
the resolved adapter. Open for extension; capability-cross-talk fields
(DOM container, event dispatcher, item registry) are planned in later
patches.

### ClickTarget

The minimal click-event target shape the driver builds when a click
arrives on a `data-item-id` element. Defined at
[src/scenes/scene_driver.ts:12-15](../src/scenes/scene_driver.ts).
Today the only required field is `itemId`; the index signature reserves
room for capability-specific extension.

### scene registry

The internal `SCENE_REGISTRY` map at
[src/scenes/scene_registry.ts:38](../src/scenes/scene_registry.ts).
Keyed by scene id; values are `SceneAdapter` objects. Populated by
`registerScene(adapter)` calls that run at module load when each scene
file is imported from [src/init.ts](../src/init.ts). Looked up via
`getRegisteredScene(sceneId)`.

### capability registry

The `CAPABILITY_REGISTRY` map at
[src/scenes/scene_registry.ts:18](../src/scenes/scene_registry.ts).
Keyed by capability id; values are `SceneCapability` objects. Populated
by `registerCapability(capability)` calls that run at module load when
each capability file is imported from [src/init.ts](../src/init.ts).
Read by `runScene(sceneId)` to mount the capabilities a scene declares.
