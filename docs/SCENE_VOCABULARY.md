# Scene vocabulary

This document is the canonical vocabulary for the scene system: scene
authoring, scene-adapter code, scene tests, and scene documentation in
this repository. Every scene-related doc, code comment, error message,
validator output, and authoring guide must use these exact terms with
these exact meanings. Synonyms listed in the retired-terms table are not
used.

This doc is the scene-side counterpart of
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The protocol doc names
the protocol-side model -- the two-level `protocol` / `step` /
`interaction` spec, the `gesture` set, the eight `scene_operation`
primitives, the validator presets, and the protocol side of the
scene-vs-protocol boundary. This doc names the scene side of that
boundary: the scene adapter owns all geometry, all target expansion, and
how every `gesture` and every `scene_operation` is rendered and input.
Where a concept is protocol-side, this doc points to
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) rather than redefining it.

## Target-state vs current-code

Like [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md), this doc mixes a
designed vocabulary with terms that describe the runtime as it stands.
The unified interaction vocabulary was ratified in milestones M2 and M3 of
[active_plans/unified_interaction_vocabulary_plan.md](active_plans/unified_interaction_vocabulary_plan.md)
and promoted into the canonical docs in milestone M4. The boundary-side
terms here -- target resolution, the adapter registry, named groups,
gesture rendering, and scene_operation rendering -- are the scene-side
half of that ratified model. The full M2 model is the source of truth:
[active_plans/unified_interaction_vocabulary_design.md](active_plans/unified_interaction_vocabulary_design.md),
especially its "The scene-vs-protocol boundary" section.

Every section below is labeled:

- **Status: target-state** -- describes the designed vocabulary. The
  model is ratified, but the runtime, validator, walker, and shipped YAML
  do not implement it yet.
- **Status: current-code** -- describes what the scene runtime implements
  today.

If a section is not labeled current-code, treat it as target-state. A
reader must never be misled into thinking a target-state section
describes the code as it runs now.

Related docs:

- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) -- scene YAML schema.
- [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) -- how scenes are wired
  and run at runtime.
- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) -- the protocol-side
  vocabulary; the boundary sections below cross-reference it.
- [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) -- the shared placement system.
- [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md) -- the shared liquid
  convention.

## The scene side of the boundary

Status: **target-state.**

[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) defines the hard
scene-vs-protocol boundary and its quotable rule. The protocol side names
semantic targets, gestures, validators, and named runtime state; it names
no plate, no well, no tube, no gel, no column, no lane, no rack, and no
coordinate. This doc encodes the other half of that rule:

**The scene adapter owns all geometry, all target expansion, and how
every `gesture` is rendered and input. It owns how every
`scene_operation` is rendered. The protocol names a semantic `target`;
the scene adapter resolves that name to a concrete `scene object`. All
geometry, all coordinates, all plate-and-well structure, all hit regions,
all drag paths, and all display rendering live on the scene side.**

The boundary exists because of a documented failure: PRIMARY_CONTRACT
item 1 records that earlier TypeScript was built around the hood scene
and treated other scenes as derivatives. The same failure reappeared one
layer up in the shipped protocol vocabulary. The boundary rule keeps that
drift out. On the scene side, that means the scene adapter never demands
that the protocol vocabulary name a geometric noun; the scene side
absorbs all geometry behind semantic names.

The protocol-side slot-by-slot ownership map lives in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The scene side owns the
"shared" rows of that map: it resolves each `target`, renders each
`gesture` as input, supplies the state each `validator` and
`step_validator` checks, and renders each `response`.

## Target resolution

Status: **target-state.**

How a protocol `target` resolves to a concrete `scene object` is the
scene side's job. The mechanism is an adapter registry plus named groups
declared in the scene YAML. This resolves design open question OQ-16.

### The adapter registry

The scene adapter holds a registry that maps each semantic `target` name
the protocol writes to a concrete `scene object`. The protocol writes
`target: flask`; the adapter's registry resolves `flask` to the scene's
flask object. The protocol side is a flat namespace of names; the scene
side is the registry that grounds each name in geometry.

The adapter registry is distinct from the
[scene registry](#scene-registry) and the
[capability registry](#capability-registry): those are runtime maps
keyed by scene id and capability id. The adapter registry is the
per-scene `target`-name-to-`scene object` map. Its concrete shape is
scene-system architecture, not vocabulary; see
[SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md).

### Named groups and `target_groups`

A target that fans out to several scene objects -- a row of wells, a tube
rack, a set of gel lanes -- is a **named group** declared in the scene
YAML's `target_groups` block. The protocol writes one semantic group
name, for example `target: row_b`. The scene YAML defines `row_b` as the
list of scene objects it expands to:

```yaml
# scene YAML -- defines the named group; owns the geometry
target_groups:
  row_b: [well_b1, well_b2, well_b3, well_b4, well_b5, well_b6,
          well_b7, well_b8, well_b9, well_b10, well_b11, well_b12]
```

All group membership and all target expansion live on the scene side.
The protocol YAML writes `target: row_b` and never lists a well or a
coordinate. The scene owns `row_b` -- which scene objects it contains
and, through the layout engine and structured-surface geometry, where
each one sits. Fan-out is a scene-side expansion of a named group, not a
protocol-vocabulary construct.

This named-group mechanism is what retires `plateTargets` and
`tubeTargets` from the protocol vocabulary. Those fields pushed plate and
tube geometry into the protocol vocabulary; the named-group mechanism
pulls it back to the scene side where it belongs. The
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) retired-terms table
records the protocol-side removal.

## `scene object`

Status: **target-state** (the boundary-side definition) and
**current-code** (the existing YAML-item description).

A `scene object` is the concrete, geometry-bearing thing the adapter
registry resolves a protocol `target` name to. It is the canonical
scene-side term for an addressable object in a scene. A scene object is
declared as a scene `item` in scene YAML, normally carries a stable id,
a label, an SVG asset reference, and layout metadata, and is placed by
the layout engine.

`scene object` is one of the two terms in the canonical naming-collision
split (see [The `ClickTarget` naming collision](#the-clicktarget-naming-collision)):

- A protocol names a **`target`** -- the semantic, geometry-free name an
  author writes. `target` is the protocol-side term, canonical in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).
- The scene adapter resolves that name to a **`scene object`** -- the
  concrete, geometry-bearing object. `scene object` is the scene-side
  term, canonical here.

A grouped `target` resolves to a named group of scene objects, not a
single one (see [Named groups and `target_groups`](#named-groups-and-target_groups)).

This `## scene object` section is the authoritative definition. The
term-reference section carries a pointer entry, not a second definition.

## How a scene renders each `gesture`

Status: **target-state.**

The `gesture` value set -- `click`, `drag`, `adjust`, `select`, `type` --
is defined and closed in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc does not
redefine the gestures. The protocol names which gesture an interaction
uses; the scene adapter owns how that gesture is presented to the student
and how the student's input is captured. The scene side renders the
gesture and reads it back.

| Gesture | Scene adapter rendering and input responsibility |
| --- | --- |
| `click` | Owns the hit region of each scene object: where a click counts, how the clickable area maps to the rendered geometry, and how the click event reaches the driver. |
| `drag` | Owns the drag interaction: the drag path, the pickup and drop hit regions, the visible feedback while dragging, and what counts as a valid drop on a destination scene object. |
| `adjust` | Owns the continuous control: how a set-point control (a pipette volume dial, a power-supply slider) is drawn, how the student moves it, and how its current value is read back for the `target_with_value` validator. |
| `select` | Owns the option layout: how a presented set of choices is laid out on screen, how each option is rendered, and how the chosen option is captured. |
| `type` | Owns the text-entry surface: how the entry field or control is drawn, where it sits, and how the entered value is captured. |

The protocol says which gesture; the scene says how the student
physically performs it. The protocol vocabulary never names a hit region,
a drag path, a control geometry, or an option coordinate -- all of that
is scene-adapter territory.

## How `scene_operation` primitives render

Status: **target-state.**

The eight ratified `scene_operation` primitives -- `SvgSwap`,
`ColorChange`, `CursorAttach`, `SceneChange`, `LayoutMove`,
`LiquidDisplayChange`, `SetPointDisplayChange`, and `TimedWait` -- are
defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc does
not redefine them. A `scene_operation` describes how the scene changes;
the protocol names the effect, and the scene adapter renders it. Every
`scene_operation` that carries a `target` field names a semantic target;
the scene adapter configures and renders the thing the name points at.

| Primitive | Scene adapter rendering responsibility |
| --- | --- |
| `SvgSwap` | Owns the asset set of the target scene object and how one SVG asset is swapped for another in the rendered scene. |
| `ColorChange` | Owns the color palette of the target scene object and how a named fill or stroke color property is applied. |
| `CursorAttach` | Owns how an attached scene object follows the cursor and how detachment is rendered. |
| `SceneChange` | Owns the scene transition; the scene system owns what the destination scene is and how the swap is presented. |
| `LayoutMove` | Owns the layout-slot geometry: where each slot is, and how the layout engine moves or re-lays-out the target scene object. The protocol names `to_slot`; the scene and layout engine own where that slot sits. |
| `LiquidDisplayChange` | Owns how a tracked liquid is rendered on the target -- the liquid level, the well contents, the held-tool contents -- following the shared liquid convention. |
| `SetPointDisplayChange` | Owns the configured display target: how a set-point display (a pipette volume display, a power-supply display) is drawn, whether as text, an SVG state, overlay layers, or any other strategy. The protocol names the set-point and the display target; the scene owns the rendering. |
| `TimedWait` | Owns the timed-phase display: how a piece of equipment's progress is shown while a timed phase runs and elapses. |

This doc names what the scene side owns; it does not design the
renderers. The asset pipeline, the color palette mechanism, the layout
engine, the liquid convention, and the set-point display strategies are
scene-system architecture, specified by the scene-system docs
([SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md),
[LAYOUT_ENGINE.md](LAYOUT_ENGINE.md),
[LIQUID_CONVENTION.md](LIQUID_CONVENTION.md)), not by this vocabulary doc.

## The `ClickTarget` naming collision

Status: **target-state.**

`PROTOCOL_VOCABULARY.md` once said "click target" and this doc says
`ClickTarget`, with no cross-reference. The canonical resolution, ratified
in the M2 design doc, is a single three-way split:

- **`target` is the protocol-side term.** The semantic, geometry-free
  name a protocol author writes. Canonical in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The phrase "click
  target" is retired from the protocol vocabulary entirely.
- **`scene object` is the scene-side term.** The concrete,
  geometry-bearing thing the adapter registry resolves a `target` name
  to. Canonical in this doc (see [`scene object`](#scene-object)).
- **`ClickTarget` is one narrow runtime type.** `ClickTarget` survives
  only as the name of the minimal `{itemId}` driver-payload shape -- a
  low-level click-event payload. It is **not** the protocol-side `target`
  and **not** the scene-side `scene object`.

This doc keeps `ClickTarget` strictly as that runtime type name. See the
[`ClickTarget`](#clicktarget) term-reference entry for the runtime
definition. Wherever `ClickTarget` appears in scene code, a comment or
error message, it means the driver payload and nothing else.

## Terms

Status: **current-code** (these terms describe the scene runtime as it
runs today, except `scene object`, which carries the target-state
boundary meaning defined above).

| term | one-line definition |
| --- | --- |
| scene | A self-contained interactive surface with one DOM root, one adapter, and one YAML config where static scene config exists. |
| scene id | The stable string id for a scene; matches the directory name and YAML basename and is the key into `SCENE_CONFIGS` and the scene registry. |
| adapter | The per-scene TypeScript object that owns `render` and `dispatchInteraction` for one scene id; on the target-state model it also owns target resolution and gesture rendering. |
| adapter registry | The per-scene map from a semantic protocol `target` name to a concrete `scene object`; the scene side of OQ-16 target resolution. |
| target_groups | The scene YAML block declaring named groups; maps one semantic group name to the list of scene objects it expands to. |
| named group | A semantic `target` name that fans out to several scene objects; declared in the scene YAML `target_groups` block. |
| capability | A reusable runtime mechanic (click routing, modal flow, grid counting) that scenes opt into by listing in their YAML `capabilities` array. |
| workspace | A YAML-declared advisory family label naming a scene's surface kind; reserved for future runtime use. |
| item | A clickable element declared by `items[]` in scene YAML and dispatched by `data-item-id`. |
| scene object | The concrete, geometry-bearing thing the adapter resolves a protocol `target` to; declared as a scene `item` and placed by the layout engine. |
| zone | A layout region declared by `zones[]` in scene YAML; items reference zones by id. |
| layout engine | Shared placement system that positions YAML-declared scene items in zones. |
| structured surface | An object with meaningful internal coordinates or subparts, such as wells, lanes, slots, or readout marks. |
| subpart | A visual or clickable element inside a structured surface. |
| wrongOrderMessage | A YAML block with a per-scene wrong-order toast template; RESERVED today (the toast helper hardcodes the message). |
| elementId | The DOM element id where the driver attaches its capture-phase click listener; defaults to `${sceneId}-scene` if omitted. |
| instrument-overlay | The shared modal-slot DOM element used by instrument-style scenes; only one scene is visible in the slot at a time. |
| module-load side effect | Top-level statement in an adapter or capability module that runs when the module is imported (registration, emitter pre-registration, listener attach, registry mutation). |
| completion event | The string id passed to `triggerStep(stepId)` to signal that a step has completed; pre-registered via `registeredEmitters.add(...)`. |
| render | The adapter's `render(ctx)` method; rebuilds the scene's DOM/SVG and rewires its listeners. |
| dispatchInteraction | The adapter's `dispatchInteraction(itemId, ctx)` method; the fallback path the driver invokes when no capability claims a click. |
| SceneContext | The runtime context object passed to capability and adapter methods; carries `sceneId` and a `dispatchInteraction(itemId)` callback. |
| ClickTarget | The minimal `{itemId: string}` driver payload built from `data-item-id`; a low-level click-event shape, not the protocol `target` and not a `scene object`. |
| scene registry | The internal `SCENE_REGISTRY` map keyed by scene id; populated by `registerScene` calls at module load. |
| capability registry | The `CAPABILITY_REGISTRY` map keyed by capability id; populated by `registerCapability` calls at module load. |

## Term reference

### scene

Status: **current-code.**

A self-contained interactive surface in the game. Each scene has one DOM
root element and one TypeScript adapter, and where it has declarable
static scene config that config lives in one YAML file. Scenes that are
render-only or programmatically configured may opt out of YAML; today
every shipped scene has a YAML, but the rule is "one YAML where static
config exists," not "every scene must have a YAML."

### scene id

Status: **current-code.**

The stable string id for a scene. It matches the directory name, the YAML
basename, the adapter's `sceneId` field, the key in
`generated/scene_data.ts` `SCENE_CONFIGS` (consumed via the
[src/scene_configs.ts](../src/scene_configs.ts) facade), and the key in
the scene registry. The discoverer in
[tools/build_scene_data.py](../tools/build_scene_data.py) globs
`src/scenes/<scene_name>/<scene_name>.yaml` to pick scenes up.

### adapter

Status: **current-code** (the `render` and `dispatchInteraction`
description) and **target-state** (the target-resolution and
gesture-rendering responsibilities).

The per-scene TypeScript object that implements `SceneAdapter`
(`src/scenes/scene_registry.ts:31-36`).
Today it owns `render(ctx)` and `dispatchInteraction(itemId, ctx)` for
one scene id and is registered at module load via
`registerScene(adapter)`. On the target-state unified model, the adapter
also owns target resolution -- the [adapter registry](#adapter-registry)
that maps each protocol `target` name to a `scene object` -- and the
rendering and input capture for every `gesture` and every
`scene_operation`. See [The scene side of the boundary](#the-scene-side-of-the-boundary).

### adapter registry

Status: **target-state.**

The per-scene map that resolves each semantic protocol `target` name to a
concrete [`scene object`](#scene-object). It is the scene side of OQ-16
target resolution: the protocol writes a flat namespace of names, and the
adapter registry grounds each name in geometry. Grouped targets resolve
through the scene YAML [`target_groups`](#target_groups) block. The
registry's concrete shape is scene-system architecture; see
[SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md). It is distinct from the
[scene registry](#scene-registry) and the
[capability registry](#capability-registry).

### target_groups

Status: **target-state.**

The scene YAML block that declares [named groups](#named-group). Each key
is a semantic group name a protocol may write as a `target`; each value
is the list of scene objects the group expands to. All group membership
and all target expansion live on the scene side. Example:

```yaml
target_groups:
  row_b: [well_b1, well_b2, well_b3, well_b4, well_b5, well_b6,
          well_b7, well_b8, well_b9, well_b10, well_b11, well_b12]
```

The protocol writes `target: row_b` and never lists a well or a
coordinate. Schema detail belongs in
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

### named group

Status: **target-state.**

A semantic `target` name that fans out to several scene objects -- a row
of wells, a tube rack, a set of gel lanes. A named group is declared in
the scene YAML [`target_groups`](#target_groups) block. The protocol
writes one group name; the scene owns the expansion. The named-group
mechanism is what retires `plateTargets` and `tubeTargets` from the
protocol vocabulary; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

### capability

Status: **current-code.**

A reusable runtime mechanic shared across scenes. Implements the
`SceneCapability` interface
(`src/scenes/scene_driver.ts:35-73`) with
`mount`, `onStepChange`, `onClick`, and `unmount`. Capability modules
self-register via `registerCapability(capability)` at module load. Six
capability ids exist; see [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md)
for which are ACTIVE versus RESERVED.

### workspace

Status: **current-code.**

A YAML field naming the workspace family for a scene; values seen today
are stable strings used to classify scene surface kinds. Required by the
scene YAML validator
([tools/build_scene_data.py](../tools/build_scene_data.py)) but not yet
read by any TypeScript code -- advisory at runtime today. Reserved for
future selectors, telemetry, or scene-profile dispatch. Example:

```yaml
sceneId: <scene_name>
workspace: <workspace_kind>
```

### item

Status: **current-code.**

A clickable element declared by an entry in the scene YAML's `items[]`
array. Carries an `id` (used as `data-item-id` in the DOM), a `label`,
usually a `zone`, and (for layout-engine items) an `svgAsset`, `kind`,
`depthTier`, and tab-stop / anchor fields. The driver routes clicks on
elements bearing a matching `data-item-id` through capabilities and the
adapter's `dispatchInteraction`. An `item` is the YAML declaration; the
[`scene object`](#scene-object) is what that declaration resolves to as a
rendered, addressable object. Schema: see
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) "Items".

### scene object

Status: **target-state** (the boundary-side definition) and
**current-code** (the YAML-item rendering).

See the [`scene object`](#scene-object) featured section for the
authoritative definition of `scene object`. That section carries the
boundary-side framing and the naming-collision split; this entry is a
pointer only and does not restate the definition.

### zone

Status: **current-code.**

A layout region declared by an entry in the scene YAML's `zones[]` array.
Items reference zones by id via `items[].zone`. Layout-engine zones carry
`x0`, `x1`, `baseline`, `gap`, and `align` for the layout engine. Schema:
see [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) "Zones".

### layout engine

Status: **current-code.**

The shared placement system that positions YAML-declared scene items in
zones. It computes placement from scene YAML and asset metadata;
renderers consume the computed placement and produce visible DOM or SVG.
It is the shared system used by row-and-zone scene layouts.
Structured-surface internals may use their own coordinate geometry. The
layout engine is scene-side geometry; the protocol vocabulary never
reaches into it. See [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md).

### structured surface

Status: **current-code.**

An object with meaningful internal coordinates or subparts, such as
wells, lanes, slots, or readout marks. A structured surface can itself be
a scene object, while its internal subparts may need custom geometry in
the renderer.

### subpart

Status: **current-code.**

A visual or clickable element inside a structured surface. A subpart is
positioned relative to that structured surface's internal coordinate
system rather than directly by a scene zone.

### wrongOrderMessage

Status: **current-code.**

A YAML block with two fields, `template` and `toastDurationMs`, declaring
a per-scene wrong-order toast template. Declared in every full scene YAML
but RESERVED at runtime today: the toast helper in
[src/scenes/shared/wrong_order_feedback.ts](../src/scenes/shared/wrong_order_feedback.ts)
hardcodes the styling and a 2 s lifetime. The YAML field is kept so the
per-scene template intent is recorded and so wiring it later is a
localized change.

### elementId

Status: **current-code.**

The DOM element id where the driver attaches its capture-phase click
listener. Optional in the YAML; defaults to `${sceneId}-scene` when
absent. The runtime read happens in
`src/scenes/scene_driver.ts:174-175`.
Used by scenes whose DOM id does not match `${sceneId}-scene`.

### instrument-overlay

Status: **current-code.**

The shared modal-slot DOM element used by instrument-style scenes. Only
one scene is visible in the slot at a time. Rationale and constraints
live in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

### module-load side effect

Status: **current-code.**

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

Status: **current-code.**

The string id passed to `triggerStep(stepId)` to signal that a step has
completed. Each completion-event id must be pre-registered via
`registeredEmitters.add('<event>')` at module load so the protocol
validator's coverage check (`validateCompletionEventCoverage` in
[src/init.ts](../src/init.ts)) can confirm every declared step has a
matching emitter at startup. Missing emitters either throw (STRICT
policy) or warn (RELAXED policy) depending on the protocol. The
target-state event-naming convention is on the protocol side; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

The runtime mechanism `completion event` (current-code, the string id
passed to `triggerStep(stepId)`) is distinct from the retired
hand-authored YAML field `completionEvent` (see the
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) retired-terms table):
the runtime mechanism stays, the YAML field is retired.

### render

Status: **current-code.**

The adapter's `render(ctx)` method. Rebuilds the scene's DOM/SVG and
reattaches its listeners on every frame. Required (not optional) on
`SceneAdapter` since the end of the A6b migration. Called from
`runSceneRender(sceneId)` at
`src/scenes/scene_driver.ts:91-108`.

### dispatchInteraction

Status: **current-code.**

The adapter's `dispatchInteraction(itemId, ctx)` method. Invoked through
the `SceneContext.dispatchInteraction` callback. Today this is the
fallback path the driver uses when no mounted capability returns `true`
from `onClick` for a given item id. As more capabilities migrate behavior
off the adapter, this path will narrow.

### SceneContext

Status: **current-code.**

The runtime context object created by the driver and passed to capability
and adapter methods. Defined at
`src/scenes/scene_driver.ts:21-29`.
Carries `sceneId` and a `dispatchInteraction(itemId)` callback bound to
the resolved adapter. Open for extension; capability-cross-talk fields
(DOM container, event dispatcher, item registry) are planned in later
patches.

### ClickTarget

Status: **current-code.**

The minimal click-event target shape the driver builds when a click
arrives on a `data-item-id` element. Defined at
`src/scenes/scene_driver.ts:12-15`. Today
the only required field is `itemId`; the index signature reserves room
for capability-specific extension.

`ClickTarget` is scoped strictly to this narrow runtime type. It is
**not** the protocol-side `target` (the semantic, geometry-free name a
protocol author writes; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)) and **not** the
scene-side [`scene object`](#scene-object) (the concrete,
geometry-bearing object a `target` resolves to). It is a low-level
click-event payload only. See
[The `ClickTarget` naming collision](#the-clicktarget-naming-collision).

### scene registry

Status: **current-code.**

The internal `SCENE_REGISTRY` map at
`src/scenes/scene_registry.ts:38`. Keyed
by scene id; values are `SceneAdapter` objects. Populated by
`registerScene(adapter)` calls that run at module load when each scene
file is imported from [src/init.ts](../src/init.ts). Looked up via
`getRegisteredScene(sceneId)`. Distinct from the
[adapter registry](#adapter-registry), which maps `target` names to scene
objects within one scene.

### capability registry

Status: **current-code.**

The `CAPABILITY_REGISTRY` map at
`src/scenes/scene_registry.ts:18`. Keyed
by capability id; values are `SceneCapability` objects. Populated by
`registerCapability(capability)` calls that run at module load when each
capability file is imported from [src/init.ts](../src/init.ts). Read by
`runScene(sceneId)` to mount the capabilities a scene declares.

## Retired terms (do not use)

Status: **target-state** (the list of retired terms) and **current-code**
(the note on where they still appear in the runtime).

Retired terms may appear only in this table and in explicit migration or
rename notes. They must not appear in normal prose, target-state
examples, code comments, or error messages.

| Retired | Use instead | Reason |
| --- | --- | --- |
| "click target" | **`scene object`** (scene side) / **`target`** (protocol side) | A prior canonical phrase for the protocol-to-scene addressable concept; ambiguous against the runtime `ClickTarget` type. The boundary split names the protocol side `target` and the scene side `scene object`; `ClickTarget` is scoped to the narrow `{itemId}` driver payload only. |

Only "click target" is listed: it was a phrase that appeared in the prior
canonical vocabulary docs for the addressable concept and genuinely
needed retiring once the boundary split was ratified. Design-process
scratch terms that never shipped are not listed.
