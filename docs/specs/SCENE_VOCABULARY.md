# Scene vocabulary

This document is the canonical vocabulary for the scene system: scene
authoring, scene-adapter code, scene tests, and scene documentation in
this repository. Every scene-related doc, code comment, error message,
validator output, and authoring guide must use these exact terms with
these exact meanings. Synonyms listed in the retired-terms table are
not used.

This doc is one corner of a three-vocabulary model. The protocol side
names what happens; the object side names what a thing is and how its
state appears; the scene side names where things appear and how the
space is arranged. The protocol-side counterpart is
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The object-side
counterpart is [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). Where a
concept is protocol-side or object-side, this doc points to the
relevant canonical doc rather than redefining it.

Related docs:

- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) -- scene YAML schema.
- [SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) -- how scenes are
  wired and run at runtime.
- [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) -- the object-side
  vocabulary; identity, structure, state, render map, capabilities,
  and layout hints all live there.
- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) -- the
  protocol-side vocabulary; the boundary section below cross-references
  it.
- [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) -- the shared placement system.
- [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md) -- the shared liquid
  convention referenced from object render rules.

## What a scene is

A scene is the unit of authoring for "where things appear and how the
space is arranged". One scene declares one workspace surface, one
optional static backdrop, one set of named placement regions
([zones](#zones)), one set of object [placements](#object-by-id-placement)
(each placement references an object from the object library by id),
and the spatial-arrangement rules that the layout engine consumes.

The scene definition does not say what any thing is (object identity,
structure, state, state-to-visual mapping, capabilities, and layout
hints are object-side; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)) and does not say what
should happen on the scene (that is protocol-side; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).

The scene replaces today's split between identity-bearing `items[]`
entries and placement-bearing `items[]` entries in the fused scene
YAML. After the split, every entry on the scene side is a placement:
it references an object by id and says where that object goes. Object
identity sub-fields (today's `id`, `label`, `shortLabel`, `kind`,
`svgAsset`, `inventoryRef`) move out of the scene; the scene names
objects through `object_id` and authors no identity data.

## The scene side of the boundary

The three-way boundary names what each vocabulary owns:

- **Protocol** names what happens. Canonical doc:
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).
- **Object** names what a thing is and how its state appears.
  Canonical doc: [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).
- **Scene** names where things appear and how the space is arranged.
  Canonical doc: this file.

The scene side encodes the following rule: a scene references objects
by id, places them inside named [zones](#zones), declares the outer
[scene_bounds](#scene-bounds) and the
[layout_rules](#layout-rules) the layout engine consumes, and declares
the static [background](#background-as-a-static-backdrop) backdrop.
A scene never declares object identity, `state_fields`, `render_map`,
`target_groups`, or `capabilities`.

A scene placement may carry exactly one bounded set of instance overrides: the object's `label` (and `short_label`) and the
object's layout hints (`default_width`, `label_width`,
`anchor_y_offset`, `width_scale`, `anchor_y`). A placement may not
override identity (`id`, `kind`, `inventory_ref`), `state_fields`,
`render_map`, or `capabilities`. The full override rule lives on the
object side; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).

`target_groups` is retired from the scene vocabulary with no successor in this vocabulary pass; named groups are deferred. A
protocol that needs to act on several subparts lists each subpart
explicitly (for example `treatment_plate.A1`, `treatment_plate.A2`).
Subparts belong to the object, not the scene.

The boundary exists because of a documented failure: PRIMARY_CONTRACT
item 1 records that earlier TypeScript was built around the hood scene
and treated other scenes as derivatives. The boundary rule keeps that
drift out. On the scene side, that means the scene never demands that
any one object's structure leak into placement; the scene names
objects only by id.

## Background as a static backdrop

A scene background is a pure backdrop. The scene declares a
background asset (an image or an SVG); the renderer paints it under
everything else. A background is not interactive and carries no
state.

A clickable region that authors might place on a background
image (a sink basin, a benchtop edge, a tool drop zone) is not a
property of the background. It is an object placed over the backdrop
through the normal object reference and placement mechanism. The
object library declares what the region is (identity, the
`clickable` capability, render rules); the scene places it on top of
the backdrop in the appropriate zone. See
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) for the object side of
"clickable region as object".

The scene declares one optional `background` block with an asset reference and the
scene-side bounds it covers; it never declares clickable behavior on
the background and never attaches state, capabilities, or a
`render_map` to it.

| Field | Required | Purpose |
| --- | --- | --- |
| `background.asset` | yes (if background present) | Asset id (image or SVG) used as the static backdrop. The asset library resolves the file. |
| `background.bounds` | no | Optional explicit bounds. Defaults to the scene's `scene_bounds`. |

## Object-by-id placement

A scene places objects by id. Each placement entry in the scene's
`placements` list names exactly one object from the object library
and states where that placement goes. The placement does not declare
object identity, structure, `state_fields`, `render_map`, or
`capabilities`; those belong to the object definition (see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)).

A placement may carry a small set of instance overrides:
`label`, `short_label`, and the layout hints `default_width`,
`label_width`, `anchor_y_offset`, `width_scale`, and `anchor_y`. A
placement may not override identity, `state_fields`, `render_map`,
`target_groups`, or `capabilities`. The full override surface is in
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## The object side of
the boundary".

| Field | Required | Purpose |
| --- | --- | --- |
| `placement.placement_id` | yes | Stable per-scene id for this placement. Distinct from `object_id`: a scene may place the same object more than once, and each placement needs its own scene-scoped id. |
| `placement.object_id` | yes | The id of the object in the object library. The object resolves identity, structure, state, rendering, and capabilities. |
| `placement.zone` | yes | The [zone](#zones) this placement belongs to. |
| `placement.depth_tier` | no | Numeric layering hint within the zone. |
| `placement.align_stop` | no | One of `left`, `center`, `right`. Tab-stop group for the layout engine. |
| `placement.baseline_override` | no | Per-instance baseline override. |
| `placement.label` | no | Instance override of the object's default label. |
| `placement.short_label` | no | Instance override of the object's default short label. |
| `placement.layout` | no | Instance override of object layout hints (`default_width`, `label_width`, `anchor_y_offset`, `width_scale`, `anchor_y`). Same shape as the object's `layout` block; a placement may set any subset, and unset fields fall through to the object default. |

Notes:

- A placement may not declare or modify subparts; subparts
  are object-side, not scene-side. Named groups are deferred.
- A placement may not declare state or a render map; the object owns
  state and rendering, and the protocol mutates state semantically
  through `ObjectStateChange` (see
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).
- The placement's `layout` block mirrors the object's `layout` block
  by field name so an author can read an override without learning a
  second vocabulary.

## Zones

A zone is a named region inside the scene. Zones are how the scene
expresses "this group of placements belongs together spatially": the
layout engine arranges placements within a zone using the zone's own
rules, then arranges zones within the scene using the scene's outer
bounds. Zones replace ad-hoc per-placement coordinates with a small
named-region vocabulary.

A zone is scene-side because it is a property of where things go, not
of what any thing is. Zones do not carry identity, state, or
rendering; they carry geometry and arrangement.

| Field | Required | Purpose |
| --- | --- | --- |
| `zone.id` | yes | Stable zone id, scoped to this scene. Placements reference it via `placement.zone`. |
| `zone.bounds` | yes | Zone bounds inside the scene. The layout engine uses these to size and position the zone. |
| `zone.align` | no | Arrangement rule for placements inside the zone. Includes `tab-stops` (today's behavior, paired with per-placement `align_stop`). |
| `zone.label` | no | Optional human-readable label for authoring and debugging. |

Schema detail belongs in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md)
"Zones".

## Scene bounds

The scene declares the outer bounds of its own surface.

| Field | Required | Purpose |
| --- | --- | --- |
| `scene_bounds` | yes | Outer bounds of the scene surface. Today's `sceneBounds`. |

## Layout rules

The scene declares scene-wide arrangement rules the layout engine
consumes when arranging zones and placements.

| Field | Required | Purpose |
| --- | --- | --- |
| `layout_rules` | no | Scene-wide arrangement rules (label sizing, offset hints, tab-stop budgets). |

`layout_rules` is intentionally narrow: it carries scene-wide hints
the layout engine needs to resolve placements; it does not carry
object identity or state. Per-placement overrides go on the
[placement](#object-by-id-placement), not here.

Tab-stop behavior is expressed by `zone.align: tab-stops` plus
per-placement `align_stop`, and that is the canonical path.

## Scene-level UI feedback

`wrong_order_message` is a scene-side UI string shown when a learner
clicks placements in an order the protocol rejects. It is a property
of how this scene gives feedback, not of any one object's identity or
state.

| Field | Required | Purpose |
| --- | --- | --- |
| `wrong_order_message` | no | UI toast text for wrong-order interactions. |

## Scene identity

The scene itself carries a small identity block. These fields name
the scene and the workspace it targets; they are not object identity.

| Field | Required | Purpose |
| --- | --- | --- |
| `scene_id` | yes | Stable scene id. |
| `workspace` | yes | Workspace this scene targets. |
| `element_id` | no | DOM mount point for the scene. |

The `scene_id` value matches the directory name and YAML basename
and is the key into the [scene registry](#scene-registry) and the
generated `SCENE_CONFIGS` table.

## The `ClickTarget` naming collision

`ClickTarget` is one narrow runtime type, not a vocabulary term for
"the thing a protocol addresses". The canonical resolution is a
three-way split:

- **`target` is the protocol-side term.** The semantic, geometry-free
  name a protocol author writes. Canonical in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The phrase "click
  target" is retired from the protocol vocabulary entirely.
- **An object id is the addressable identity.** The scene names
  objects by `object_id` (see
  [Object-by-id placement](#object-by-id-placement)); the object
  declares the structure and capabilities behind that name. Canonical
  on the object side: see
  [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).
- **`ClickTarget` is one narrow runtime type.** `ClickTarget` survives
  only as the name of the minimal `{itemId}` driver-payload shape -- a
  low-level click-event payload. It is **not** the protocol-side
  `target` and **not** an object id.

This doc keeps `ClickTarget` strictly as that runtime type name. See
the [`ClickTarget`](#clicktarget) term-reference entry for the
runtime definition. Wherever `ClickTarget` appears in scene code, a
comment, or an error message, it means the driver payload and
nothing else.

## Terms

| term | one-line definition |
| --- | --- |
| scene | A self-contained interactive surface with one DOM root, one adapter, and one YAML config where static scene config exists. |
| scene id | The stable string id for a scene; matches the directory name and YAML basename and is the key into `SCENE_CONFIGS` and the scene registry. |
| adapter | The per-scene TypeScript object that owns `render` and `dispatchInteraction` for one scene id. |
| placement | A scene-side entry that names an object by `object_id` and states where that object goes (zone, depth tier, align stop, optional layout overrides). |
| placement id | The stable per-scene id for one placement; distinct from `object_id` because a scene may place the same object more than once. |
| object id | The id of an object in the object library; the only handle the scene side uses to name an object. See [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). |
| background | The static backdrop asset declared on the scene; not interactive, carries no state. |
| zone | A layout region declared by `zones[]` in scene YAML; placements reference zones by id. |
| scene_bounds | Outer bounds of the scene surface. |
| layout_rules | Scene-wide arrangement rules the layout engine consumes. |
| layout engine | Shared placement system that positions object placements in zones. |
| structured surface | An object with meaningful internal coordinates or subparts; the structure schema is object-side (see [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)). |
| subpart | A visual or clickable element inside a structured surface; declared on the object, addressable via the object's `id_pattern`. |
| workspace | A YAML-declared advisory family label naming a scene's surface kind; reserved for future runtime use. |
| item | The runtime name for a clickable DOM element rendered by the adapter and dispatched by `data-item-id`; in cleaned authoring, every item is the rendering of one [placement](#object-by-id-placement). |
| wrong_order_message | A scene-side UI string shown when a learner clicks placements in an order the protocol rejects. |
| elementId | The DOM element id where the driver attaches its capture-phase click listener. |
| instrument-overlay | The shared modal-slot DOM element used by instrument-style scenes; only one scene is visible in the slot at a time. |
| module-load side effect | Top-level statement in an adapter or capability module that runs when the module is imported (registration, emitter pre-registration, listener attach, registry mutation). |
| completion event | The string id passed to `triggerStep(stepId)` to signal that a step has completed; pre-registered via `registeredEmitters.add(...)`. |
| render | The adapter's `render(ctx)` method; rebuilds the scene's DOM/SVG and rewires its listeners. |
| dispatchInteraction | The adapter's `dispatchInteraction(itemId, ctx)` method; the fallback path the driver invokes when no capability claims a click. |
| SceneContext | The runtime context object passed to capability and adapter methods; carries `sceneId` and a `dispatchInteraction(itemId)` callback. |
| ClickTarget | The minimal `{itemId: string}` driver payload built from `data-item-id`; a low-level click-event shape, not the protocol `target` and not an object id. |
| scene registry | The internal `SCENE_REGISTRY` map keyed by scene id; populated by `registerScene` calls at module load. |
| capability registry | The `CAPABILITY_REGISTRY` map keyed by capability id; populated by `registerCapability` calls at module load. |

## Term reference

### scene

A self-contained interactive surface in the game. Each scene has one
DOM root element and one TypeScript adapter, and where it has
declarable static scene config that config lives in one YAML file.
Scenes that are render-only or programmatically configured may opt
out of YAML; today every shipped scene has a YAML, but the rule is
"one YAML where static config exists," not "every scene must have a
YAML."

### scene id

The stable string id for a scene. It matches the directory name, the
YAML basename, the adapter's `sceneId` field, the key in
`generated/scene_data.ts` `SCENE_CONFIGS` (consumed via the
[../../src/scene_configs.ts](../../src/scene_configs.ts) facade), and the key
in the scene registry. The discoverer in
[../../tools/build_scene_data.py](../../tools/build_scene_data.py) globs
`src/scenes/<scene_name>/<scene_name>.yaml` to pick scenes up.

### adapter

The per-scene TypeScript object that implements `SceneAdapter`
(`src/scenes/scene_registry.ts:31-36`). It owns `render(ctx)` and
`dispatchInteraction(itemId, ctx)` for one scene id and is registered
at module load via `registerScene(adapter)`.

### placement

A scene-side entry that references one object from the object
library by `object_id` and states where the object goes (its zone,
depth tier, align stop, and instance overrides). See
[Object-by-id placement](#object-by-id-placement) for the field
table. Each placement carries its own `placement_id` because a scene
may place the same object more than once; the runtime DOM id remains
the placement id, and clicks dispatch through `data-item-id` against
that id (see [item](#item)).

### placement id

The stable per-scene id for one [placement](#placement). Distinct
from `object_id`: two placements may reference the same object (for
example two `dilution_tube_rack` instances on a hood scene), and
each placement gets its own scene-scoped id so the runtime can
address them independently.

### object id

The id of an object in the object library. The scene side names
objects only by `object_id`; identity, structure, state, render
rules, and capabilities are resolved object-side. Canonical
definition: [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object
identity".

### background

The static backdrop asset declared on the scene. A
background is not interactive and carries no state; clickable
regions on top of a backdrop are objects placed over it. See
[Background as a static backdrop](#background-as-a-static-backdrop)
for the field table.

### zone

A layout region declared by an entry in the scene YAML's `zones[]`
array. Placements reference zones by id via `placement.zone`.
Layout-engine zones carry `x0`, `x1`, `baseline`, `gap`, and
`align` for the layout engine. Schema: see
[SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) "Zones".

### scene_bounds

Outer bounds of the scene surface. The
layout engine consumes `scene_bounds` to position zones and
placements within the scene.

### layout_rules

Scene-wide arrangement hints the layout engine consumes when
resolving zone and placement geometry. Today's `layoutRules`.
Per-placement overrides do not live here; they live on the
placement itself.

### layout engine

The shared placement system that positions object placements within
zones. It computes placement from scene YAML, the object's layout
hints, and asset metadata; renderers consume the computed placement
and produce visible DOM or SVG. Structured-surface internals may
use their own coordinate geometry declared on the object. The
layout engine is scene-side geometry; the protocol vocabulary never
reaches into it. See [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md).

### structured surface

An object with meaningful internal coordinates or subparts, such as
wells, lanes, slots, or readout marks. The structured-surface schema
is object-side; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Structured
surfaces and subparts". Named groups are deferred. The scene
side only knows that a placement references such an object by id.

### subpart

A visual or clickable element inside a structured surface. Subparts
are declared on the object via the structure block; the scene
neither declares subparts nor names them. A protocol addresses a
subpart as `<object_id>.<subpart_id>` (for example
`treatment_plate.A1`); named groups are deferred, so a
protocol acting on several subparts lists each one explicitly. See
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).

### workspace

A YAML field naming the workspace family for a scene; values seen
today are stable strings used to classify scene surface kinds.
Required by the scene YAML validator
([../../tools/build_scene_data.py](../../tools/build_scene_data.py)) but not
yet read by any TypeScript code -- advisory at runtime today.
Reserved for future selectors, telemetry, or scene-profile
dispatch. Example:

```yaml
scene_id: <scene_name>
workspace: <workspace_kind>
```

### item

The runtime name for a clickable DOM element rendered by the
adapter and routed via `data-item-id`. Every item is the rendering of
one [placement](#placement); identity sub-fields move to the
object library, and the scene-side entry is purely a placement.

### wrongOrderMessage

A YAML block with two fields, `template` and `toastDurationMs`,
declaring a per-scene wrong-order toast template. The cleaned spelling is
[`wrong_order_message`](#scene-level-ui-feedback).

### elementId

The DOM element id where the driver attaches its capture-phase
click listener. Optional in the YAML; defaults to `${sceneId}-scene`
when absent. The runtime read happens in
`src/scenes/scene_driver.ts:174-175`. Used by scenes whose DOM id
does not match `${sceneId}-scene`.

### instrument-overlay

The shared modal-slot DOM element used by instrument-style scenes.
Only one scene is visible in the slot at a time. Rationale and
constraints live in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md).

### module-load side effect

Any top-level statement in an adapter or capability module that
runs when the module is imported. Examples include
`registerScene(...)`, `registerCapability(...)`,
`registeredEmitters.add(...)`, top-level `addEventListener` calls,
and `window.*` test-API bindings. Module-load side effects only
fire if the module is imported from
[../../src/init.ts](../../src/init.ts) (directly or transitively); orphaning
a module silently disables every side effect inside it. See the
dedicated "Module-load side effects" section of
[SCENE_ARCHITECTURE.md](SCENE_ARCHITECTURE.md) for the full list
and the A6a / B1 regression history.

### completion event

The string id passed to `triggerStep(stepId)` to signal that a step
has completed. Each completion-event id must be pre-registered via
`registeredEmitters.add('<event>')` at module load so the protocol
validator's coverage check (`validateCompletionEventCoverage` in
[../../src/init.ts](../../src/init.ts)) can confirm every declared step has
a matching emitter at startup. Missing emitters either throw
(STRICT policy) or warn (RELAXED policy) depending on the protocol.
The event-naming convention is on the protocol side;
see [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

The runtime mechanism `completion event` is distinct from the retired
hand-authored YAML field `completionEvent`: the runtime mechanism stays, the YAML field is retired.

### render

The adapter's `render(ctx)` method. Rebuilds the scene's DOM/SVG
and reattaches its listeners on every frame. Required (not
optional) on `SceneAdapter` since the end of the A6b migration.
Called from `runSceneRender(sceneId)` at
`src/scenes/scene_driver.ts:91-108`.

### dispatchInteraction

The adapter's `dispatchInteraction(itemId, ctx)` method. Invoked
through the `SceneContext.dispatchInteraction` callback. Today this
is the fallback path the driver uses when no mounted capability
returns `true` from `onClick` for a given item id. As more
capabilities migrate behavior off the adapter, this path will
narrow.

### SceneContext

The runtime context object created by the driver and passed to
capability and adapter methods. Defined at
`src/scenes/scene_driver.ts:21-29`. Carries `sceneId` and a
`dispatchInteraction(itemId)` callback bound to the resolved
adapter. Open for extension; capability-cross-talk fields (DOM
container, event dispatcher, item registry) are planned in later
patches.

### ClickTarget

The minimal click-event target shape the driver builds when a click
arrives on a `data-item-id` element. Defined at
`src/scenes/scene_driver.ts:12-15`. Today the only required field
is `itemId`; the index signature reserves room for
capability-specific extension.

`ClickTarget` is scoped strictly to this narrow runtime type. It is
**not** the protocol-side `target` (the semantic, geometry-free
name a protocol author writes; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)) and **not** the
[object id](#object-id) the scene names in a placement (the object
library handle; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)). It is a low-level
click-event payload only. See
[The `ClickTarget` naming collision](#the-clicktarget-naming-collision).

### scene registry

The internal `SCENE_REGISTRY` map at
`src/scenes/scene_registry.ts:38`. Keyed by scene id; values are
`SceneAdapter` objects. Populated by `registerScene(adapter)` calls
that run at module load when each scene file is imported from
[../../src/init.ts](../../src/init.ts). Looked up via
`getRegisteredScene(sceneId)`. Distinct from the
[capability registry](#capability-registry).

### capability registry

The `CAPABILITY_REGISTRY` map at
`src/scenes/scene_registry.ts:18`. Keyed by capability id; values
are `SceneCapability` objects. Populated by
`registerCapability(capability)` calls that run at module load when
each capability file is imported from
[../../src/init.ts](../../src/init.ts). Read by `runScene(sceneId)` to mount
the capabilities a scene declares.

This is the runtime registry that maps a capability **id** to its
implementation. It is distinct from the object-side `capabilities`
list, which declares which affordances an object carries; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Capabilities".

## Retired terms (do not use)

Retired terms may appear only in this table and in explicit
migration or rename notes. They must not appear in normal prose,
examples, code comments, or error messages.

### Retired with no successor here

| Retired | Use instead | Reason |
| --- | --- | --- |
| "click target" | **`target`** (protocol side) / **`object id`** (scene-side handle) | A prior canonical phrase for the protocol-to-scene addressable concept; ambiguous against the runtime `ClickTarget` type. The boundary split names the protocol side `target` and the scene side names objects by `object_id`; `ClickTarget` is scoped to the narrow `{itemId}` driver payload only. |
| `scene:` (alternate spelling for `zone:`) | `placement.zone` | Single observed use in `content/plate_drug_treatment/scene.yaml`; the cleaned vocabulary keeps `zone` and drops the alternate. |
| `target_groups` (top-level scene-YAML key) | retired with no successor in this vocabulary pass; named groups are deferred until shipped authoring pain appears | Subparts are on the object side; the named-groups expression itself is deferred. Protocols list explicit subparts (`<object_id>.<subpart_id>`) until a future plan revisits named groups. |

### Moved to OBJECT_VOCABULARY.md

Every term in this table moved to the object side. The scene side names
objects only by [object id](#object-id) and never declares the
underlying identity, structure, state, or render data.

| Retired here | New home | Reason |
| --- | --- | --- |
| `items[].id` (object identity) | object `id` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object identity") | Identity is object-owned; the scene names objects only by `object_id` on a placement. |
| `items[].label` | object `label` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object identity") | Object owns the default label; a placement may override per-instance. |
| `items[].shortLabel` | object `short_label` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object identity") | Object owns the default short label; a placement may override. |
| `items[].kind` | object `kind` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object identity") | Closed enum on the object; identity-class, scene may not override. |
| `items[].svgAsset` | object `render_map` entry ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Render map") | The object owns SVG manipulation; the asset id lives in `render_map` only. |
| `items[].inventoryRef` | object `inventory_ref` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Object identity") | Identity-class; the scene YAML never carries it. |
| `items[].anchorY` (placement sub-field) | object `layout.anchor_y` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Layout hints") | A serological pipette is tip-anchored regardless of placement; a scene placement may still override. |
| `items[].widthScale` (as the canonical home) | object `layout.width_scale` default ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Layout hints"); placement may override via `placement.layout.width_scale` | Per-asset visual metric; the object owns the default. |
| `capabilities` (top-level scene-YAML key) | object `capabilities` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md), "## Capabilities") | A capability is a property of what the thing is, not where it is placed; closed list, scene may not override. |
| adapter registry (as a scene-vocabulary term) | resolved by the object library: the scene names objects by `object_id` and the object library answers ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)) | The protocol writes `target` (protocol-side) and the scene names the object by `object_id`; identity resolution is object-side. The runtime [scene registry](#scene-registry) and [capability registry](#capability-registry) remain as runtime maps. |
| named group (as a scene-vocabulary term) | retired with no successor in this vocabulary pass; protocols list explicit subparts | Named groups are deferred. Subparts belong to the object. |
| `scene object` (as a scene-vocabulary term) | object library entry referenced by [object id](#object-id) | The addressable identity is the [object id](#object-id) (object-side); the in-scene rendering is the [item](#item) (scene-side runtime). |
| `state_fields`, `render_map` (as scene-vocabulary terms) | object `state_fields`, object `render_map` ([OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md)) | The scene declares neither state nor rendering; both are object-owned. |
