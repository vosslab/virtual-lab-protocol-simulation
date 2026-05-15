# Scene-object split design

This is the M2 working design doc for the plan in
[scene_object_split_plan.md](scene_object_split_plan.md). It defines the
three-vocabulary model on paper before any canonical doc rewrite (M4) or any
YAML / TypeScript change (follow-on plans).

The doc is structured as four H2 sections, one per M2 work package. WP-OBJ1
authors the object section below; WP-SCN1, WP-BND1, and WP-PROTO1 append the
remaining three sections later. Section markers are reserved here so later
work packages append without colliding.

Evidence base for every claim in this file:
[scene_object_split_inventory.md](scene_object_split_inventory.md). Where a
section cites a candidate field, structured surface, or runtime type, the row
in the inventory artifact is the source.

Resolved decisions binding this doc are in the plan's "## Resolved decisions"
section (RD-1 through RD-4); each section below cites the RDs that govern it
by name.

## Object vocabulary

Owner: WP-OBJ1. Governs: RD-4 (named groups belong to the object, not the
scene); the design philosophy clause that the object owns the state-to-visual
map and SVG manipulation.

### What an object is

An object is the unit of authoring for "what a thing is". One object
definition declares one identity, one structure (subparts and named groups
of subparts), one schema of state variables, one map from state values to
visual assets, one capability set, and one set of layout hints. The object
definition does not say where the thing goes (that is scene-side; WP-SCN1)
and does not say what should happen to it (that is protocol-side; WP-PROTO1).

The object owns SVG manipulation. The protocol sets semantic state through
`ObjectStateChange` (designed by WP-PROTO1); the object's `render_map`
resolves the state value to a visual asset. The protocol never names an SVG
asset id and never names a color value. This is the central design rule of
the object vocabulary; every part of the schema below exists to make it true.

The object replaces today's split between `items[]` object-identity
sub-fields in scene YAML (`id`, `label`, `shortLabel`, `kind`, `svgAsset`,
`inventoryRef`) and the per-asset visual metrics in `src/asset_specs.ts`
(`defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`). The
inventory's "Known inconsistency 1" (object data split across two files in
two languages) is resolved by giving the object a single authoring surface.

### Object identity

Identity fields name the object and classify it. They are stable across
scenes; a scene placement may not override them (RD-2, encoded by WP-BND1).

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| id | string | yes | Stable object id. Unique across the object library. |
| kind | enum | yes | Coarse classification: plate, bottle, flask, pipette, rack, waste, equipment, decoration. Mirrors today's `kind` sub-field; the inventory observed all eight values. |
| label | string | yes | Default human-readable name. A scene placement may override per RD-2; the object owns the default. |
| short_label | string | no | Optional shorter label for tight zones. Object-owned default; scene may override per RD-2. |
| inventory_ref | string | no | Reference into a curriculum-level inventory entry. Plan-listed identity field; not observed in current YAML (inventory note 6). Reserved on the object side so the cleaned scene YAML never carries it. |

Notes:

- `svgAsset` (today's `items[]` sub-field) is not an identity field on the
  object. The object resolves an asset through `render_map` from declared
  state, so a single `svgAsset` literal is just `render_map` with one entry
  (see "Render map" below).
- The fused-format key `target_groups` is moved into object structure
  per RD-4 and is defined under "Structured surfaces and named groups"
  below; it is not an identity field.

### Structured surfaces and subparts

Some objects have addressable internal structure. A 96-well plate has 96
wells. A dilution tube rack has tubes. A gel has lanes. A multichannel
pipette has channels. The object declares this structure once; a protocol
addresses an individual subpart, or a named group of subparts, by reference
into the object's own declared structure.

The structure block is optional. An object with no structure block is a flat
object (a bottle, a flask, a single-tube vial). An object with a structure
block is a structured surface, and its subparts are first-class addressable
units inside that object's namespace.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| structure.subpart_kind | string | yes (if structure present) | What each subpart is (well, tube, lane, slot, channel). |
| structure.layout | enum | yes (if structure present) | grid, list, or custom. A grid declares rows and cols; a list declares an ordered count; custom is reserved for future use. |
| structure.rows | int | grid only | Row count. |
| structure.cols | int | grid only | Column count. |
| structure.count | int | list only | Subpart count. |
| structure.id_pattern | string | yes (if structure present) | How a subpart id is built from its row / col / index (for example A1..H12 for a 96-well plate, slot_0..slot_7 for a rack). |
| structure.subpart_state_fields | list of state_field | no | A schema of state variables that every subpart carries (for example `held_liquid` per well). Same shape as the object-level `state_fields` schema below; applied per subpart. |

Subpart state is not a separate vocabulary; it is the same `state_fields`
schema applied at subpart granularity. A 96-well plate has zero or few
plate-level state fields and one `held_liquid` field per well; a multichannel
pipette has one `held_liquid` field per channel.

#### Named groups (target_groups)

Per RD-4, `target_groups` is part of object structure, not scene placement.
A named group is a stable identifier for a subset of subparts that a
protocol may address as a unit ("row A", "lane 1", "tip column 3"). The
object declares its own groups; the scene never sees `target_groups`. The
boundary table in WP-BND1 keeps `target_groups` on the object side.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| structure.target_groups | list of group | no | Named subsets of subparts. |
| group.name | string | yes | Stable group id, scoped to this object. |
| group.members | list of string | yes | Subpart ids belonging to this group. May reference subparts by id_pattern output (A1..A12) or by enumeration. |
| group.label | string | no | Optional human-readable label. |

A protocol references a group as `<object_id>.<group_name>` (for example
`treatment_plate.row_A`); the object resolves the group name to its member
subpart ids. A scene never declares groups and never overrides them.

### state_fields schema

`state_fields` is the object's typed schema of declared state variables. It
is the contract between the protocol and the object: a protocol reads or
sets a `state_field` by name; the object resolves what that state means
visually through `render_map` (next section). Anything not in
`state_fields` is not part of the object's authoring surface.

Every `state_field` entry has the four-tuple required by the WP-OBJ1
acceptance criteria: name, type, allowed values or range, default. The
inventory's runtime liquid-state model (`LiquidEntry`, `ContainerLiquid`,
`LiquidState`) is the test case: every runtime state value must be
expressible as a declared `state_field` (WP-RAT-C1 will check this).

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| name | string | yes | Field name, snake_case, scoped to this object. |
| type | enum | yes | One of: enum, int, float, bool, string, liquid, set_point. The non-primitive types (liquid, set_point) are named because the inventory's candidate state_fields require them. |
| allowed | list or range | yes | For enum: list of allowed string values. For int / float: a {min, max} range or `unbounded`. For liquid / set_point: a structured constraint (see below). For bool / string: omitted or `any`. |
| default | matches type | yes | Initial value when the object is instantiated. Required so an object's start state is never undefined. |
| applies_to | enum | no | object (default) or subpart. When `subpart`, the field is declared per subpart instead of per object. Equivalent to listing the same field under `structure.subpart_state_fields`. |
| description | string | no | One-line author-facing description. |

Type-specific constraints:

- `enum`: allowed is a closed list of strings. The render_map must cover
  every value in `allowed`.
- `int` / `float`: allowed is `{min, max}` (inclusive) or the literal
  `unbounded`. Default must satisfy the range.
- `liquid`: a structured value matching the runtime `LiquidEntry` /
  `ContainerLiquid` shape (one or more named reagents with volume and color
  key). `allowed` may name a reagent whitelist; default is empty (no liquid).
- `set_point`: a numeric instrument set-point with a unit (volume, speed,
  temperature). `allowed` is `{min, max, unit}`; default is the
  instrument's idle value. Maps to today's `SetPointDisplayChange` and
  `LiquidDisplayChange` primitives.
- `bool` / `string`: allowed is `any` or omitted; default required.

The `applies_to: subpart` form is the bridge between object-level
`state_fields` and `structure.subpart_state_fields`. An author may declare
"every well has a `held_liquid` field" once at the object level with
`applies_to: subpart`, instead of restating it under structure. Both forms
are equivalent.

### Render map

The render_map is the object's state-to-visual function. The protocol sets
semantic state via `ObjectStateChange` (WP-PROTO1); the object's render_map
resolves the new state value to a visual asset (an SVG file, a color, an
overlay). The render_map is the only place an SVG asset id or a color value
appears in object authoring. Per RD-3, `ColorChange` lives in this layer
alongside `SvgSwap`; the protocol stays semantic, the object owns the
visual.

The render_map is keyed by `state_field` name. For each named state_field,
it maps state values to visual outputs.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| render_map.<field>.kind | enum | yes | One of: svg, color, overlay, composite. svg names a base SVG asset id. color names a color key (matching the inventory's `LiquidEntry.colorKey`). overlay names an SVG fragment composited over the base. composite is a list of any of the above. |
| render_map.<field>.cases | list of case | yes for enum / bool | One case per allowed value of the state_field. Each case has a `when` (the state value) and an output (svg id, color, overlay, or composite list). |
| render_map.<field>.formula | string | yes for int / float / liquid / set_point | A declarative recipe (for example "fill the container SVG to height proportional to total_volume_ml / capacity"). For numeric and liquid types where enumerating cases is impractical, the formula names the rendering rule; the runtime resolves it. The formula vocabulary is intentionally small and is fixed by the object vocabulary, not by per-object code. |
| render_map.<field>.applies_to | enum | no | object (default) or subpart. When `subpart`, the render_map applies per subpart (for example one fill per well). |

Rules:

- Every value in a state_field's `allowed` list must have a render_map
  case (enum, bool) or be covered by a formula (numeric, liquid, set_point).
- A render_map entry for an `applies_to: subpart` state_field must itself be
  `applies_to: subpart`.
- The render_map is the only object-side authoring surface that names SVG
  asset ids or color keys. An identity field, a state_field, a capability,
  or a layout hint never names an asset id.

### Capabilities

Capabilities are coarse declarations of what an object affords (clickable,
liquid_container, instrument_with_setpoint, structured_surface,
decoration_only). The capability set is the contract for what kinds of
interactions a scene and a protocol may attempt against this object. The
inventory observed `capabilities` as a top-level scene-YAML key on 6 of 7
files; in the cleaned vocabulary it moves to the object (a capability is a
property of what the thing is, not where it is placed).

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| capabilities | list of string | yes (may be empty) | Coarse affordance tags. The vocabulary itself defines the closed list of allowed capability strings; an object may not invent capabilities. |

Per RD-2, a scene placement may not override capabilities. An object that is
not `clickable` is never clickable, regardless of where it is placed.

### Layout hints

Layout hints are object-side defaults that the layout engine consumes when
the scene places the object. They replace today's `src/asset_specs.ts`
properties (`defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`),
which are visual metrics of the object itself, not of any one scene.
Per RD-2, a scene placement may override layout hints (this is the only
override category besides `label`).

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| layout.default_width | float | yes | Default visual width in layout units. Today's `defaultWidth`. |
| layout.label_width | float | no | Width budget for the label. Today's `labelWidth`. |
| layout.anchor_y_offset | float | no | Vertical anchor adjustment. Today's `anchorYOffset`; observed only on the three pipette assets. |
| layout.width_scale | float | no | Per-object width multiplier. Today's `widthScale`; observed mainly on equipment. |
| layout.anchor_y | enum | no | bottom or tip. Today's `anchorY` placement sub-field; reclassified as an object default per the rule that a serological pipette is anchored at its tip wherever it is placed. A scene may override per RD-2. |

### Object ownership of SVG manipulation (rule statement)

The object owns the state-to-visual map and SVG manipulation. The protocol
sets semantic state through `ObjectStateChange`; the object's render_map
resolves the asset. The protocol never names an SVG asset id and never
names a color value.

This rule is binding on:

- `state_fields`: the only authoring surface for declared state.
- `render_map`: the only authoring surface for state-to-visual resolution.
- `ObjectStateChange` (WP-PROTO1): the only protocol primitive that mutates
  declared state on an object.
- The `SvgSwap` and `ColorChange` reclassification (RD-3, WP-PROTO1): both
  are object/render-layer mechanisms invoked by the object's render_map,
  not protocol-level operations.

### Worked example: 96-well plate

The 96-well plate is the WP-OBJ1 acceptance test for structured surfaces,
named groups, and per-subpart state_fields. The candidate is the
`well_plate_96` asset observed in the inventory.

```yaml
id: well_plate_96
kind: plate
label: 96-well plate
short_label: 96-well

structure:
  subpart_kind: well
  layout: grid
  rows: 8
  cols: 12
  id_pattern: "{row_letter}{col}"   # A1..H12; row_letter is A..H, col is 1..12
  target_groups:
    - name: row_A
      label: Row A
      members: [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12]
    - name: column_1
      label: Column 1
      members: [A1, B1, C1, D1, E1, F1, G1, H1]
    - name: control_wells
      label: Untreated controls
      members: [A1, B1, C1]
    - name: treatment_wells
      label: Treatment wells
      members: [A4, B4, C4, A5, B5, C5, A6, B6, C6]

state_fields:
  - name: held_liquid
    type: liquid
    allowed: any
    default: empty
    applies_to: subpart
    description: Liquid contents of one well; matches runtime LiquidEntry shape.

render_map:
  held_liquid:
    kind: composite
    applies_to: subpart
    formula: fill the well SVG to a height proportional to held_liquid.total_volume_ml; tint by held_liquid.color_key

capabilities: [clickable, structured_surface, liquid_container]

layout:
  default_width: 14
  label_width: 8
```

Reading: the plate has no plate-level state, 96 wells (A1..H12) each
carrying a `held_liquid` state_field, four named groups (a row, a column,
a control set, a treatment set) that a protocol may address as
`treatment_plate.row_A` or `treatment_plate.control_wells`, and a single
render_map entry that resolves any well's `held_liquid` value to a fill
height and tint. No SVG asset id appears in any state_field. The
`row_letter` and `col` tokens in `id_pattern` are object-vocabulary
literals (the row index 0..7 maps to A..H; the col index 1..12 maps to
itself); the same pattern would express `slot_0..slot_7` for a list-layout
rack via `id_pattern: "slot_{index}"`.

### Worked example: serological pipette

The serological pipette is the WP-OBJ1 acceptance test for `held_liquid`
and `set_point` state_fields on a flat object. The candidate is the
`serological_pipette` asset observed in the inventory.

```yaml
id: serological_pipette
kind: pipette
label: Serological pipette
short_label: Pipette

state_fields:
  - name: held_liquid
    type: liquid
    allowed: any
    default: empty
    description: Aspirated liquid currently in the pipette barrel.
  - name: set_point
    type: set_point
    allowed: {min: 0.1, max: 25.0, unit: mL}
    default: 1.0
    description: Volume the pipette is set to dispense.

render_map:
  held_liquid:
    kind: composite
    formula: fill the pipette barrel SVG to a height proportional to held_liquid.total_volume_ml / max_volume; tint by held_liquid.color_key
  set_point:
    kind: overlay
    formula: render set_point as a numeric label overlaid on the pipette body, formatted as "{value} {unit}"

capabilities: [clickable, liquid_container, instrument_with_setpoint]

layout:
  default_width: 3
  label_width: 6
  anchor_y: tip
  anchor_y_offset: 0
```

Reading: the pipette is a flat object (no `structure` block, so no
subparts and no named groups). It declares two state_fields: `held_liquid`
(matching the runtime `LiquidEntry` shape) and `set_point` (a numeric
instrument set-point with a unit constraint). The render_map resolves both
to visuals through formulas; no SVG asset id appears in either state_field.
The layout hints replicate today's `serological_pipette` row in
`src/asset_specs.ts` (`defaultWidth: 3`, `labelWidth: 6`,
`anchorYOffset: 0`), now object-owned, plus `anchor_y: tip` reclassified
from today's per-item placement sub-field (a serological pipette is
anchored at its tip wherever it is placed).

### Section close: what WP-OBJ1 leaves to the other M2 work packages

- The cleaned scene vocabulary, including how a scene references an object
  by id and how it places that object (WP-SCN1, "## Cleaned scene
  vocabulary" below).
- The three-way boundary rule and the per-key assignment table for every
  current scene-YAML top-level key and every `items[]` sub-field
  (WP-BND1, "## Three-way boundary" below). This includes encoding RD-2
  (instance overrides limited to label and layout hints) and confirming
  that `target_groups` lands on the object side, not the scene side.
- The `ObjectStateChange` protocol primitive and the re-partition of the
  8 `scene_operation` primitives between protocol-level and object/render
  layer (WP-PROTO1, "## Protocol-side touch" below). The object vocabulary
  above states the rule (object owns state-to-visual; protocol stays
  semantic); WP-PROTO1 specifies the primitive and reclassifies `SvgSwap`
  and `ColorChange` per RD-3.

### Concepts WP-OBJ1 introduced beyond the inventory

The inventory cataloged fields and tagged them; it did not propose schema.
WP-OBJ1 introduced the following concepts that the inventory did not name:

- The `state_fields` four-tuple (name, type, allowed, default) and its
  six declared types (enum, int, float, bool, string, liquid, set_point).
  In scope: the WP-OBJ1 acceptance criteria require "name, type, allowed
  values or range, default", and the inventory's candidate state_fields
  table required `liquid` and `set_point` as first-class types.
- The `render_map` `kind` enum (svg, color, overlay, composite) and the
  `cases` versus `formula` split. In scope: the WP-OBJ1 acceptance
  criteria require a render_map; the inventory did not constrain its
  shape. Both `cases` (for enum / bool) and `formula` (for numeric /
  liquid / set_point) are needed because the inventory's candidate
  state_fields include both kinds.
- The `applies_to: object | subpart` axis on state_fields and render_map
  entries. In scope: the WP-OBJ1 acceptance criteria require per-subpart
  `state_fields` on the 96-well plate worked example, and the cleanest
  way to express that without duplicating schema is a single
  `applies_to` axis.
- The `structure.layout` enum (grid, list, custom) and `structure.id_pattern`.
  In scope: the WP-OBJ1 acceptance criteria require a worked 96-well
  plate, which requires an addressable subpart id scheme.
- The closed capability vocabulary (clickable, liquid_container,
  instrument_with_setpoint, structured_surface, decoration_only). In
  scope: today's `capabilities` key is a free-form string list; the
  WP-OBJ1 design needs a closed list so the boundary rule (object owns
  capabilities, scene may not override) has a definite contract.
  Out of scope for WP-OBJ1: the exact membership of the capability list
  beyond the five named here is a WP-BND1 / WP-DOC-OV1 detail; WP-OBJ1
  fixes the rule (closed list owned by the object vocabulary) but not the
  full enumeration.
- The reclassification of `anchor_y` from a placement sub-field to an
  object layout hint. In scope: the inventory observed `anchor_y` as a
  placement sub-field on 3 of 7 files, but the value is a property of
  the asset (a pipette is tip-anchored regardless of placement). RD-2
  permits a scene override.
  Out of scope: whether any scene actually needs to override `anchor_y`;
  WP-RAT-A1 will check this against the 7 scenes.

Out of scope for WP-OBJ1 (deliberately deferred):

- The `formula` mini-language vocabulary (the exact set of allowed
  formula tokens). Named here as a closed object-vocabulary surface;
  enumerated by WP-DOC-OV1 / WP-DOC-OY1 in M4.
- Reconciling the inventory's "Known inconsistency 3" (plan cites 45
  `asset_specs.ts` entries; file has 31). M2 acknowledges the gap; M3
  ratification (WP-RAT-B1) reconciles.
- Whether microscope quadrants are subparts of a single microscope
  object or remain top-level items (inventory note 7). WP-OBJ1 provides
  the structured-surface mechanism that would let them be subparts; M3
  ratification (WP-RAT-A1) decides per-scene.

## Cleaned scene vocabulary

Owner: WP-SCN1. Governs: RD-1 (background is a static backdrop; clickable
regions are objects placed over it). Consumes: WP-OBJ1's object definitions
(identity, structure, state_fields, render_map, capabilities, layout hints)
and the inventory artifact
[scene_object_split_inventory.md](scene_object_split_inventory.md).

### What a scene is

A scene is the unit of authoring for "where things appear and how the space
is arranged". One scene declares one workspace surface, one static backdrop,
one set of named placement regions (zones), one set of object placements
(each placement references an object from the object library by id), and the
spatial-arrangement rules that the layout engine consumes. The scene
definition does not say what any thing is (object identity, state, or
state-to-visual mapping is object-side per WP-OBJ1) and does not say what
should happen on the scene (that is protocol-side per WP-PROTO1).

The scene replaces today's split between identity-bearing `items[]` entries
and placement-bearing `items[]` entries in the fused scene YAML. After the
split, every `items[]` entry on the scene side is a placement: it references
an object by id and says where that object goes. Object identity sub-fields
(today's `id`, `label`, `shortLabel`, `kind`, `svgAsset`, `inventoryRef`)
move out of the scene; the scene names objects through `object_id` and
authors no identity data.

### Background as a static backdrop (RD-1)

Per RD-1, a scene background is a pure backdrop. The scene declares a
background asset (an image or an SVG); the renderer paints it under
everything else. A background is not interactive and carries no state.

A clickable region that today might be drawn on top of a background image
(a sink, a benchtop edge, a tool drop zone) is not a property of the
background. It is an object placed over the background through the normal
object reference and placement mechanism. The object library declares what
the region is (identity, capabilities such as `clickable`, render_map);
the scene places it on top of the backdrop in the appropriate zone.

Consequence for the cleaned scene YAML: the scene declares one optional
`background` block with an asset reference and the scene-side bounds it
covers; it never declares clickable behavior on the background and never
attaches state, capabilities, or a render_map to it.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| background.asset | string | yes (if background present) | Asset id (image or SVG) used as the static backdrop. The asset library resolves the file. |
| background.bounds | rect | no | Optional explicit bounds. Defaults to the scene's `scene_bounds`. |

### Object reference (object-by-id placement)

A scene places objects by id. Each placement entry in the scene's
`placements` list names exactly one object from the object library and
states where the placement goes. The placement does not declare object
identity, structure, state_fields, render_map, or capabilities; those
belong to the object definition (WP-OBJ1).

Per RD-2 (encoded by WP-BND1), a placement may carry a small set of
instance overrides: `label` and the layout hints `default_width`,
`label_width`, `anchor_y_offset`, `width_scale`, and `anchor_y`. A
placement may not override identity, `state_fields`, `render_map`, or
`capabilities`. The boundary table in "## Three-way boundary" is the
authoritative list; the scene side simply consumes the override surface
the boundary defines.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| placement.placement_id | string | yes | Stable per-scene id for this placement. Distinct from `object_id`: a scene may place the same object more than once, and each placement needs its own scene-scoped id (for example two `dilution_tube_rack` instances). |
| placement.object_id | string | yes | The id of the object in the object library. The object resolves identity, structure, state_fields, render_map, and capabilities. |
| placement.zone | string | yes | The zone (named region) this placement belongs to. See "Zones" below. The fused-format `scene:` spelling observed in `content/plate_drug_treatment/scene.yaml` (inventory inconsistency 5) is replaced by `zone:` everywhere; `scene:` is removed from the cleaned vocabulary. |
| placement.depth_tier | int | no | Numeric layering hint within the zone. Today's `depthTier`. |
| placement.align_stop | enum | no | One of `left`, `center`, `right`. Tab-stop group for the layout engine. Today's `alignStop`. |
| placement.baseline_override | float | no | Per-instance baseline override. Today's `baselineOverride` (rare; one observed use). |
| placement.label | string | no | Per-RD-2 instance override of the object's default label. |
| placement.layout | object | no | Per-RD-2 instance override of object layout hints (`default_width`, `label_width`, `anchor_y_offset`, `width_scale`, `anchor_y`). Same shape as the object's `layout` block; a placement may set any subset, and unset fields fall through to the object default. |

Notes:

- A placement may not declare or modify subparts or named groups
  (`target_groups`); per RD-4 those are object-side, not scene-side.
- A placement may not declare state or a render_map; the object owns
  state and rendering, and the protocol mutates state semantically
  through `ObjectStateChange` (WP-PROTO1).
- The placement's `layout` block mirrors the object's `layout` block by
  field name so an author can read an override without learning a second
  vocabulary.

### Zones

A zone is a named region inside the scene. Zones are how the scene
expresses "this group of placements belongs together spatially": the
layout engine arranges placements within a zone using the zone's own
rules, then arranges zones within the scene using the scene's outer
bounds. Zones replace ad-hoc per-placement coordinates with a small
named region vocabulary.

A zone is scene-side because it is a property of where things go, not of
what any thing is. Zones do not carry identity, state, or rendering;
they carry geometry and arrangement.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| zone.id | string | yes | Stable zone id, scoped to this scene. Placements reference it via `placement.zone`. |
| zone.bounds | rect | yes | Zone bounds inside the scene. The layout engine uses these to size and position the zone. |
| zone.align | enum | no | Arrangement rule for placements inside the zone. Includes `tab-stops` (today's behavior, paired with per-placement `align_stop`). |
| zone.label | string | no | Optional human-readable label for authoring and debugging. |

### Spatial arrangement (scene_bounds, layout_rules)

The scene declares the outer bounds of its own surface and the
scene-wide layout rules the layout engine consumes when arranging
zones and placements.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| scene_bounds | rect | yes | Outer bounds of the scene surface. Today's `sceneBounds`. |
| layout_rules | object | no | Scene-wide arrangement rules (label sizing, offset hints, tab-stop budgets). Today's `layoutRules`. |

`layout_rules` is intentionally narrow: it carries scene-wide hints the
layout engine needs to resolve placements; it does not carry object
identity or state. Per-placement overrides go on the placement, not
here.

The accent-rules and tab-stops top-level keys named in the plan
(`accentRules`, `tabStops`) were not observed in any of the 7 scene
YAML files at WP-EV1 read (inventory inconsistency 4). The cleaned
scene vocabulary reserves them as scene-side names but does not
require them; M3 ratification (WP-RAT-A1) confirms whether either is
live or dead. Today's tab-stop behavior is expressed by
`zone.align: tab-stops` plus per-placement `align_stop`, and that
remains the canonical path in the cleaned vocabulary.

### Scene-level UI feedback

`wrong_order_message` is a scene-side UI string shown when a learner
clicks placements in an order the protocol rejects. It is a property of
how this scene gives feedback, not of any one object's identity or
state. The cleaned scene vocabulary keeps it scene-side.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| wrong_order_message | string | no | UI toast text for wrong-order interactions. Today's `wrongOrderMessage`. |

### Scene identity

The scene itself carries a small identity block. These fields name the
scene and the workspace it targets; they are not object identity.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| scene_id | string | yes | Stable scene id. Today's `sceneId`. |
| workspace | string | yes | Workspace this scene targets. Today's `workspace`. |
| element_id | string | no | DOM mount point for the scene. Today's `elementId`. |

### Keys and item sub-fields that move out of scene YAML into object YAML

Source list: the inventory artifact
[scene_object_split_inventory.md](scene_object_split_inventory.md),
specifically the "## items[] sub-fields across the 7 scene YAML files"
table and the "## Scene-YAML top-level keys" table. Every entry below is
drawn from those tables; the inventory tag and file-presence count are
the evidence.

The boundary call for each entry is owned by WP-BND1's "## Three-way
boundary" table. WP-SCN1 lists the entries that move off the scene side
so the cleaned scene vocabulary can be read on its own; WP-BND1
finalizes the cross-vocabulary classification (object versus protocol
versus scene).

#### items[] sub-fields that move into object YAML

| Today's sub-field | Inventory tag | Files using it (out of 7) | Cleaned-vocabulary home |
| --- | --- | --- | --- |
| id | object-identity | 5 | Object YAML: object identity. Scene placement instead names the object via `object_id`. |
| label | object-identity | 5 | Object YAML: object identity. Per RD-2, a scene placement may override per-instance. |
| shortLabel | object-identity | 2 | Object YAML: object identity (`short_label`). Per RD-2, a scene placement may override. |
| kind | object-identity | 3 | Object YAML: object identity (closed enum: plate, bottle, flask, pipette, rack, waste, equipment, decoration). |
| svgAsset | object-identity | 3 | Object YAML: resolved through `render_map`, not declared as a literal field. The object owns SVG manipulation. |
| inventoryRef | object-identity | 0 | Object YAML: object identity (`inventory_ref`). Plan-listed; not observed in any of the 7 files (inventory note 6). |

#### items[] sub-field reclassified to object layout hints

| Today's sub-field | Inventory tag | Files using it (out of 7) | Cleaned-vocabulary home |
| --- | --- | --- | --- |
| anchorY | placement | 3 | Object YAML: layout hint (`layout.anchor_y`). Reclassified by WP-OBJ1 because a serological pipette is anchored at its tip wherever it is placed. Per RD-2, a scene placement may override. |

#### items[] sub-fields that stay scene-side

| Today's sub-field | Inventory tag | Files using it (out of 7) | Cleaned-vocabulary home |
| --- | --- | --- | --- |
| zone | placement | 3 | Scene YAML: `placement.zone`. |
| scene | placement | 1 | Removed. The single `content/plate_drug_treatment/scene.yaml` use is renamed to `zone` (inventory inconsistency 5). |
| depthTier | placement | 3 | Scene YAML: `placement.depth_tier`. |
| widthScale | placement | 3 | Scene YAML override only when the placement overrides the object default; the underlying field is the object's `layout.width_scale`. Per RD-2 a placement may override. |
| alignStop | placement | 3 | Scene YAML: `placement.align_stop`. |
| baselineOverride | placement | 1 | Scene YAML: `placement.baseline_override`. |
| depth | placement | 0 | Scene YAML: reserved on the placement side; plan-listed but not observed (inventory note 6). |

#### Top-level scene-YAML keys that move into object YAML

| Today's top-level key | Inventory tag | Files using it (out of 7) | Cleaned-vocabulary home |
| --- | --- | --- | --- |
| capabilities | object-identity | 6 | Object YAML: object capabilities. Per RD-2 a scene placement may not override. |
| target_groups | object-identity | 0 | Object YAML: object structure (named subpart groups). Per RD-4. Plan-listed; not observed. |
| items (identity half) | object-identity + placement | 5 | Split: identity sub-fields above move into object YAML; placement sub-fields above stay scene-side as `placements[]`. |

#### Top-level scene-YAML keys that stay scene-side

| Today's top-level key | Inventory tag | Files using it (out of 7) | Cleaned-vocabulary home |
| --- | --- | --- | --- |
| sceneId | object-identity | 7 | Scene YAML: scene identity (`scene_id`). Object-identity in the inventory only in the sense of naming the scene itself. |
| workspace | object-identity | 7 | Scene YAML: scene identity. |
| elementId | object-identity | 3 | Scene YAML: scene identity (`element_id`). |
| zones | placement | 5 | Scene YAML: `zones[]`. |
| sceneBounds | placement | 2 | Scene YAML: `scene_bounds`. |
| layoutRules | placement | 3 | Scene YAML: `layout_rules`. |
| accentRules | placement | 0 | Scene YAML: reserved; plan-listed but not observed (inventory note 4). |
| tabStops | placement | 0 | Scene YAML: reserved; plan-listed but not observed. Today expressed via `zone.align: tab-stops` plus per-placement `align_stop`. |
| wrongOrderMessage | placement | 5 | Scene YAML: `wrong_order_message`. |

Boundary calls deferred to WP-BND1: the cross-vocabulary placement of
`SvgSwap` and `ColorChange` (RD-3) is WP-PROTO1's; the per-key,
single-vocabulary assignment table that covers every entry above is
WP-BND1's. WP-SCN1 commits the moved-keys list above as input to
WP-BND1 and does not draw the final boundary.

### Section close: what WP-SCN1 leaves to the other M2 work packages

- The single per-key, per-sub-field assignment table that picks one
  vocabulary (object, scene, or protocol) for every entry in the
  inventory and encodes the RD-2 instance-override surface (WP-BND1).
- The `ObjectStateChange` primitive and the re-partition of the 8
  `scene_operation` primitives between protocol-level and object/render
  layer per RD-3 (WP-PROTO1).

### Concepts WP-SCN1 introduced beyond the inventory

- `placement_id` distinct from `object_id`. The fused format used a
  single `id` per `items[]` entry that doubled as both placement id and
  object id. The cleaned scene vocabulary needs them to be separable
  because a scene may place the same object more than once (the
  cell_culture_hood scene reuses the dilution tube rack across multiple
  placements per the inventory).
- A `background` block with `asset` and optional `bounds`. The
  inventory cataloged no `background` key in any of the 7 files; the
  cleaned scene vocabulary introduces it because RD-1 fixes the
  background as a scene-side concept and authors need a place to
  declare the backdrop asset.
- The `placement.layout` instance-override sub-block. The fused format
  spread `widthScale` and `anchorY` directly on each `items[]` entry.
  The cleaned vocabulary groups instance overrides into a `layout`
  block that mirrors the object's `layout` block by field name (RD-2),
  so an author reads override and default in the same shape.
- The decision to remove `scene:` (the alternate spelling for `zone:`
  observed only in `content/plate_drug_treatment/scene.yaml`) from the
  cleaned vocabulary. Inventory inconsistency 5 surfaced the
  duplication; the cleaned vocabulary keeps `zone:` and drops `scene:`.

## Three-way boundary

Owner: WP-BND1. Governs: RD-2 (instance overrides are tightly bounded to
`label` and layout hints) and RD-4 (`target_groups` belongs to the object
vocabulary, not the scene). Consumes: WP-OBJ1's object schema (identity,
structure, `state_fields`, `render_map`, capabilities, layout hints), WP-SCN1's
cleaned scene vocabulary (object-by-id placement, zones, scene_bounds,
layout_rules, background, scene-level UI feedback, scene identity), and
WP-PROTO1's protocol-side touch (`ObjectStateChange` plus the eight-primitive
re-partition).

### Boundary rule

The three-way boundary is the single rule that governs every authoring slot:

- **Protocol** names what happens. A protocol declares ordered steps and
  interactions, the validators that check them, and the `scene_operation`
  primitives that mutate state semantically. A protocol never names an SVG
  asset id, a color value, a zone geometry, or an object's structural
  schema. The protocol asks the object to be in a different declared state
  through `ObjectStateChange`; the object resolves the visual.
- **Object** names what a thing is and how its state appears. An object
  declares identity, structure (subparts and `target_groups`), the typed
  `state_fields` schema, the `render_map` from state value to visual asset,
  the closed `capabilities` set, and object-default layout hints. The
  object owns the state-to-visual map and SVG manipulation. The object never
  names where it goes in any one scene.
- **Scene** names where things appear and how the space is arranged. A scene
  references objects by id, places them inside named zones, declares the
  outer scene_bounds and the layout_rules the layout engine consumes, and
  declares the static background backdrop. A scene never declares object
  identity, `state_fields`, `render_map`, or `capabilities`.

Per RD-2, a scene placement may carry exactly one bounded set of instance
overrides: the object's `label` (and `short_label`) and the object's layout
hints (`default_width`, `label_width`, `anchor_y_offset`, `width_scale`,
`anchor_y`). A placement may not override identity (`id`, `kind`,
`inventory_ref`), `state_fields`, `render_map`, `target_groups`, or
`capabilities`. Per RD-4, `target_groups` is object structure; the scene
side of the boundary table never carries it.

### Per-key assignment table: scene-YAML top-level keys

Every one of the 12 top-level keys cataloged in
[scene_object_split_inventory.md](scene_object_split_inventory.md) is assigned
to exactly one vocabulary. The "Override" column states whether a scene
placement may override the object-side value per RD-2; for scene-side keys it
records "n/a" (the key has no object-side counterpart).

| Today's top-level key | Vocabulary | Cleaned-vocabulary home | Override (RD-2) |
| --- | --- | --- | --- |
| sceneId | scene | `scene_id` (scene identity) | n/a |
| workspace | scene | `workspace` (scene identity) | n/a |
| elementId | scene | `element_id` (scene identity) | n/a |
| capabilities | object | object `capabilities` (closed list) | no -- identity-class, scene may not override |
| items | object + scene (split) | identity sub-fields move to object YAML; placement sub-fields stay scene-side as `placements[]` | per sub-field row below |
| zones | scene | `zones[]` (named placement regions) | n/a |
| sceneBounds | scene | `scene_bounds` (outer surface) | n/a |
| layoutRules | scene | `layout_rules` (scene-wide arrangement hints) | n/a |
| accentRules | scene | `accent_rules` (reserved; not observed) | n/a |
| tabStops | scene | reserved; expressed today as `zone.align: tab-stops` plus per-placement `align_stop` | n/a |
| target_groups | object | object `structure.target_groups` (RD-4) | no -- structure, scene may not override |
| wrongOrderMessage | scene | `wrong_order_message` (scene-level UI feedback) | n/a |

Coverage: 12 keys, each assigned to exactly one vocabulary. The `items` row
straddles object and scene because every `items[]` entry today fuses identity
and placement; the per-sub-field table below splits the entry. No top-level
key lands on the protocol side, because today's scene YAML carries no
protocol slots; protocol-vocabulary slots (`scene_operation`, `validator`,
`step`, `interaction`) come from the protocol YAML, not the scene YAML.

### Per-sub-field assignment table: items[] sub-fields

Every one of the 14 `items[]` sub-fields cataloged in the inventory is
assigned to exactly one vocabulary. The "Override (RD-2)" column states
whether a scene placement may override the object-side default; placement
sub-fields are scene-native and the column reads "n/a".

| Today's items[] sub-field | Vocabulary | Cleaned-vocabulary home | Override (RD-2) |
| --- | --- | --- | --- |
| id | object | object `id` (identity) | no -- identity, scene may not override |
| label | object | object `label` (identity) | yes -- placement may override per RD-2 |
| shortLabel | object | object `short_label` (identity) | yes -- placement may override per RD-2 |
| kind | object | object `kind` (identity, closed enum) | no -- identity, scene may not override |
| svgAsset | object | resolved through object `render_map`; not authored as a literal field | no -- render_map is object-owned |
| inventoryRef | object | object `inventory_ref` (identity) | no -- identity, scene may not override |
| anchorY | object | object `layout.anchor_y` (layout hint) | yes -- placement may override per RD-2 |
| zone | scene | `placement.zone` | n/a |
| scene | scene | removed -- single use renamed to `placement.zone` (inventory inconsistency 5) | n/a |
| depthTier | scene | `placement.depth_tier` | n/a |
| widthScale | scene + object | object `layout.width_scale` default; placement may override per RD-2 | yes -- placement override surface |
| alignStop | scene | `placement.align_stop` | n/a |
| baselineOverride | scene | `placement.baseline_override` | n/a |
| depth | scene | `placement.depth` (reserved; plan-listed but not observed) | n/a |

Coverage: 14 sub-fields, each assigned to exactly one vocabulary. The
`widthScale` row notes that the object owns the default layout hint and the
placement carries the per-instance override; this is a single object-side
field with a bounded scene-side override surface, not a split assignment.
The `anchorY` row reflects WP-OBJ1's reclassification of today's per-item
`anchorY` to an object layout hint (a serological pipette is anchored at its
tip wherever it is placed); RD-2 lets a placement override the object
default. The `scene` row records the renaming decision from WP-SCN1: the
single occurrence in `content/plate_drug_treatment/scene.yaml` is rewritten
to `placement.zone` and the alternate spelling is dropped.

### Instance-override surface (RD-2, normative summary)

A scene placement carries at most the following overrides; every other
object-side field is fixed by the object definition.

| Override field on `placement` | Object-side default it overrides | Vocabulary section |
| --- | --- | --- |
| placement.label | object `label` | object identity |
| placement.short_label | object `short_label` | object identity |
| placement.layout.default_width | object `layout.default_width` | object layout hints |
| placement.layout.label_width | object `layout.label_width` | object layout hints |
| placement.layout.anchor_y_offset | object `layout.anchor_y_offset` | object layout hints |
| placement.layout.width_scale | object `layout.width_scale` | object layout hints |
| placement.layout.anchor_y | object `layout.anchor_y` | object layout hints |

Per RD-2, a placement may not override `id`, `kind`, `inventory_ref`,
`state_fields`, `render_map`, `target_groups`, or `capabilities`. An attempt
to do so in scene YAML is an authoring error caught at validation, not a
silent shadowing.

### Where each protocol primitive lives (cross-link to WP-PROTO1)

The boundary table covers scene-YAML keys and `items[]` sub-fields; protocol
primitives are governed by WP-PROTO1's "## Protocol-side touch" section
above. For the boundary it is enough to record:

- The four protocol-level primitives (`CursorAttach`, `SceneChange`,
  `LayoutMove`, `TimedWait`) and `ObjectStateChange` are protocol-vocabulary;
  they appear in protocol YAML, not scene YAML.
- The four object/render-layer mechanisms (`SvgSwap`, `ColorChange`,
  `LiquidDisplayChange`, `SetPointDisplayChange`) are object-vocabulary; they
  are invoked by the object's `render_map` and never appear as authored
  protocol slots.

This mapping is consistent with WP-SCN1's moved-keys list (no protocol slots
on the scene side) and WP-PROTO1's re-partition (four protocol-level, four
render-layer, with `ObjectStateChange` as the semantic superseder).

### Section close: what WP-BND1 leaves to M3 and M4

- M3 ratification (WP-RAT-A1, WP-RAT-B1, WP-RAT-C1) tests the per-key and
  per-sub-field tables against the 7 scene YAML files, the 31 observed
  `asset_specs.ts` entries, the runtime liquid-state model, and the eight
  `scene_operation` primitives. Any sub-field, key, or primitive that does
  not land in its assigned vocabulary becomes a residual-gap entry.
- M4 doc rewrites (WP-DOC-SV1, WP-DOC-SY1, WP-DOC-OV1, WP-DOC-OY1,
  WP-DOC-PV1) encode the boundary rule and the override surface in the
  canonical docs; the boundary table here is the source the canonical docs
  consume, not a parallel target.

## Protocol-side touch

Owner: WP-PROTO1. Governs: RD-3 (`ColorChange` is reclassified to the
object/render layer alongside `SvgSwap`); the design philosophy clause that
the protocol stays semantic and the object owns the state-to-visual map.

Source for the current `scene_operation` primitive set: M4-closed
[../PROTOCOL_VOCABULARY.md](../PROTOCOL_VOCABULARY.md), which ratifies the
eight primitives `SvgSwap`, `ColorChange`, `CursorAttach`, `SceneChange`,
`LayoutMove`, `LiquidDisplayChange`, `SetPointDisplayChange`, and
`TimedWait`.

### ObjectStateChange primitive

`ObjectStateChange` is the protocol-level primitive that mutates declared
state on an object. It is the only protocol primitive that writes into
`state_fields` (defined by WP-OBJ1 above). The protocol names a target
object (or subpart, or named group) and a state mapping by `state_field`
name and value; the object's `render_map` resolves the new state value to
a visual asset. The protocol never names an SVG asset id and never names
a color value.

Typed fields:

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| op | const string | yes | Literal `ObjectStateChange`. Discriminates this primitive in the `scene_operation` union. |
| target | object_ref | yes | Reference to the object, subpart, or named group whose state is being set. Forms: `<object_id>` (whole object), `<object_id>.<subpart_id>` (one subpart, for example `treatment_plate.A1`), or `<object_id>.<group_name>` (a named group declared by the object, for example `treatment_plate.row_A`). |
| state | map of state_field name to value | yes | One or more `<state_field_name>: <value>` entries. Each name must exist in the target object's declared `state_fields`; each value must satisfy that field's `type` and `allowed` constraint. A multi-entry map sets fields atomically. |
| transition | enum | no | One of: `instant`, `animated`. Default `instant`. Animation timing is an object/render-layer detail; the protocol only declares intent. |

Rules:

- `state` keys are `state_field` names declared by the target object. An
  unknown field name is an authoring error caught at validation, not a
  silent no-op.
- `state` values must match the field's declared `type` and satisfy
  `allowed`. A value outside `allowed` is an authoring error.
- When `target` references a named group, the state map applies to every
  member subpart, with each member resolved through the same `render_map`
  entry (per the WP-OBJ1 rule that a `render_map` for an `applies_to:
  subpart` field must itself be `applies_to: subpart`).
- `ObjectStateChange` does not name SVG asset ids, color values, overlay
  ids, or layout coordinates. Anything visual is resolved by the object's
  `render_map`.

### SvgSwap and asset / overlay selection are object/render-layer mechanisms

`SvgSwap` and any selection of an SVG asset, overlay, or composite is an
object/render-layer mechanism, not a protocol primitive. The reason: the
protocol stays semantic, and asset names stay replaceable. If a protocol
named an SVG asset id directly (`SvgSwap target=foo asset=bar.svg`), then
renaming `bar.svg` to `bar_v2.svg` would break every protocol that mentions
it; the protocol would be coupled to file-system-level identifiers. By
routing every visual change through `ObjectStateChange` and the object's
`render_map`, the protocol mentions only declared `state_field` names and
declared state values, both of which are part of the object's authoring
contract. The asset id lives in exactly one place (the `render_map`) and
can be renamed there without touching any protocol.

The same argument applies to overlays and composites. An overlay id is an
asset identifier; the protocol must not name it. The object declares which
state value triggers which overlay through the `render_map.<field>.cases`
or `render_map.<field>.formula` mechanism (WP-OBJ1). The protocol's only
interaction with overlays is through the underlying state change.

### ColorChange is reclassified to the object/render layer (RD-3)

Per RD-3, `ColorChange` is reclassified to the object/render layer alongside
`SvgSwap`. The same argument applies: a color value (`#ff0000`, `red`, a
color key like `colorKey: media_red`) is a visual identifier, and a protocol
that names a color is coupled to that color. The object's `render_map`
already resolves state values to colors through `kind: color` or through
the `color_key` axis of `kind: composite`; that is where color selection
belongs. A protocol that today reads "turn the indicator red" is rewritten
as `ObjectStateChange target=indicator state={status: alarm}`, and the
indicator object's `render_map.status.cases` resolves `alarm` to the red
color key.

Single exception: a future protocol primitive may set color directly when
color itself is the learning target. The motivating case is a colorimetric
reading (a pH indicator strip, a Bradford assay, a colorimetric ELISA)
where the student's task is to observe and record the color a sample turns,
and the color is not a downstream consequence of some other declared state.
That future primitive is its own slot in the `scene_operation` union (with
its own typed fields, including a constrained color vocabulary tied to the
learning context); it is not generic `ColorChange`. WP-PROTO1 names the
exception and reserves the slot but does not specify it; the specification
belongs to the protocol that introduces the first colorimetric reading
mini-protocol.

### Re-partition table for the eight scene_operation primitives

The table assigns each currently-ratified `scene_operation` primitive to
either the protocol level (a semantic primitive that names declared state
or scene-level intent) or the object/render layer (a visual mechanism
invoked by the object's `render_map`). The fourth column names the
protocol-level primitive that supersedes a render-layer mechanism, where
applicable.

| Primitive               | Layer         | Reason                                                                                                  | Protocol-level superseder         |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| SvgSwap                 | object/render | Names an SVG asset id; visual mechanism resolved by the object's render_map.                            | ObjectStateChange                 |
| ColorChange             | object/render | Names a color value; visual mechanism resolved by the object's render_map. Reclassified per RD-3.        | ObjectStateChange                 |
| CursorAttach            | protocol      | Names a semantic interaction (the cursor carries a referenced object). No SVG id or color is named.      | n/a (already protocol-level)      |
| SceneChange             | protocol      | Names a scene-level transition. Outside any single object's render_map; belongs to scene-level intent.   | n/a (already protocol-level)      |
| LayoutMove              | protocol      | Names a semantic placement change (where an object lives in the scene). Layout coordinates are scene-level, not asset-level. | n/a (already protocol-level)      |
| LiquidDisplayChange     | object/render | Resolves a `liquid` state_field to a fill height and tint via render_map formula (WP-OBJ1). The protocol sets the underlying `held_liquid` state, not the display. | ObjectStateChange                 |
| SetPointDisplayChange   | object/render | Resolves a `set_point` state_field to an overlay label via render_map formula (WP-OBJ1). The protocol sets the underlying `set_point` state, not the display. | ObjectStateChange                 |
| TimedWait               | protocol      | Names a semantic pause in protocol flow; no object state and no visual identifier are named.             | n/a (already protocol-level)      |

Reading: three of the eight primitives (`CursorAttach`, `SceneChange`,
`LayoutMove`, `TimedWait` -- four total) stay at the protocol level because
they name semantic intent and never name an asset id or color. Four
(`SvgSwap`, `ColorChange`, `LiquidDisplayChange`, `SetPointDisplayChange`)
move to the object/render layer because they name a visual identifier (an
SVG id, a color, a fill display, a numeric overlay) that the object's
`render_map` already owns. `ObjectStateChange` supersedes all four
render-layer primitives at the protocol level: a protocol that today emits
`SvgSwap` or `LiquidDisplayChange` is rewritten as `ObjectStateChange`
against the relevant declared `state_field`, and the object's `render_map`
resolves the visual.

### Ambiguity beyond what RD-3 settled

`LayoutMove` is the genuinely ambiguous case. It does not name an SVG asset
or a color (so it is not a visual identifier in the RD-3 sense), but a
layout coordinate is also not a declared `state_field` of any single
object; it is a property of the scene placement. WP-PROTO1 assigns
`LayoutMove` to the protocol level on the grounds that a layout move is a
semantic scene-level event (an object is being relocated as part of the
workflow, for example moving a flask from the rack to the hood deck), not
a render-layer detail. The alternative -- treating placement coordinates
as a declared scene-level `state_field` and routing moves through a
hypothetical `SceneStateChange` -- is rejected here because the scene
vocabulary (WP-SCN1) does not currently define a `state_fields` schema and
because the inventory shows `LayoutMove` is invoked rarely and at
human-meaningful boundaries (between mini-protocol stages), not as a
continuous animation. If a later mini-protocol needs continuous layout
animation, that case is revisited in a follow-on plan; for M2 the layer
assignment is protocol-level.

`SceneChange` is adjacent but unambiguous: a scene transition is by
definition outside any single object's render_map and is the canonical
example of scene-level semantic intent.
