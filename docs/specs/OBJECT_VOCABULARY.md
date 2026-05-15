# Object vocabulary

This document is the canonical vocabulary for the object system: object
authoring, the object library, object-side validators, and object-related
documentation in this repository. Every object-related doc, code comment,
error message, validator output, and authoring guide must use these exact
terms with these exact meanings.

This doc is the third corner of a three-vocabulary model. The protocol
side names what happens; the object side names what a thing is and how
its state appears; the scene side names where things appear and how the
space is arranged. The protocol-side counterpart is
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md); the scene-side
counterpart is [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md). Where a
concept is protocol-side or scene-side, this doc points to the relevant
canonical doc rather than redefining it.

YAML schema detail (the exact authoring file shape, file naming, and
validation rules) belongs in `docs/OBJECT_YAML_FORMAT.md` -- a separate
canonical doc to be authored next under the same plan. This doc names
the vocabulary; the format doc encodes the schema.

## Target-state vs current-code

This doc encodes a designed vocabulary the runtime does not yet
implement. That is intentional. The designed vocabulary was ratified in
milestones M2 and M3 of the scene-object split plan
([../archive/scene_object_split_plan.md](../archive/scene_object_split_plan.md))
and promoted into this canonical doc in milestone M4. Today there is no
object library file format and no object library file: object identity
sub-fields live inline in scene YAML `items[]` entries, and per-asset
visual metrics live in `src/asset_specs.ts`. The follow-on code-migration
plan introduces the object file format; the vocabulary in this doc is
the contract that file format encodes.

Every section below is labeled:

- **Status: target-state** -- describes the designed vocabulary. The
  model is ratified (M3 mapped the designed vocabulary against every
  current scene YAML file, every current `src/asset_specs.ts` entry,
  the runtime liquid-state model, and every ratified `scene_operation`
  primitive, with no model revision forced) but no authoring file in
  the repo speaks it yet. Per RD-5 of the scene-object split plan, the
  exact counts live in
  [../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md)
  rather than here.
- **Status: current-code** -- describes what the runtime implements
  today.

If a section is not labeled current-code, treat it as target-state. A
reader must never be misled into thinking a target-state section
describes the code as it runs now.

The full M2 model is the source of truth for this doc:
[../archive/scene_object_split_design.md](../archive/scene_object_split_design.md).
The M3 ratification evidence is in
[../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md).

Related docs:

- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) -- the protocol-side
  vocabulary, including the `ObjectStateChange` primitive that mutates
  declared object state.
- [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) -- the scene-side
  vocabulary, including object-by-id placement and the adapter registry.
- [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) -- the shared placement system
  that consumes object-side layout hints.
- [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md) -- the shared liquid
  convention. Per RD-11, liquid state on an object is modeled as
  multiple flat `state_fields` (typically `liquid_id`, `liquid_volume`,
  `liquid_color`); the liquid convention informs the render rules
  (`fill_height`, color tints) the `render_map` invokes.
- [SVG_PIPELINE.md](SVG_PIPELINE.md) -- the SVG asset pipeline whose
  asset ids the object's `render_map` resolves to.

## What an object is

Status: **target-state.**

An **object** is the unit of authoring for "what a thing is". One object
definition declares one identity, one structure (subparts; named groups
are deferred per RD-9), one schema of flat-primitive state variables
(per RD-11), one map from state values to visual assets, one closed
capability set (per RD-6), and one set of layout hints. The object definition does not say where the thing goes (that is
scene-side; see [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md)) and does not
say what should happen to it (that is protocol-side; see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).

The object owns SVG manipulation. The protocol sets semantic state
through `ObjectStateChange`; the object's `render_map` resolves the
state value to a visual asset. The protocol never names an SVG asset id
and never names a color value. This is the central design rule of the
object vocabulary; every part of the schema below exists to make it
true.

The object replaces today's split between identity-bearing `items[]`
sub-fields in scene YAML (`id`, `label`, `shortLabel`, `kind`,
`svgAsset`, `inventoryRef`) and the per-asset visual metrics in
`src/asset_specs.ts` (`defaultWidth`, `labelWidth`, `anchorYOffset`,
`widthScale`). After the split, every object-identity slot lives in one
place -- the object library -- and the scene side names objects only by
id.

## Object identity

Status: **target-state.**

Identity fields name the object and classify it. They are stable across
scenes; per RD-2 of the scene-object split plan, a scene placement may
not override them.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Stable object id. Unique across the object library. The scene side names this object only by `id`. |
| `kind` | yes | Coarse classification. Closed enum: `plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`, `equipment`, `decoration`. The eight values mirror today's `kind` sub-field; the inventory observed all eight in shipped scene YAML. |
| `label` | yes | Default human-readable name. A scene placement may override per RD-2; the object owns the default. |
| `short_label` | no | Optional shorter label for tight zones. Object-owned default; scene may override per RD-2. |
| `inventory_ref` | no | Reference into a curriculum-level inventory entry. Reserved on the object side so the cleaned scene YAML never carries it. |

`svgAsset` (today's `items[]` sub-field) is **not** an identity field on
the object. The object resolves an asset through `render_map` from
declared state, so a single `svgAsset` literal is just a `render_map`
with one entry. See [Render map](#render-map) below.

## Structured surfaces and subparts

Status: **target-state.**

Some objects have addressable internal structure. A 96-well plate has
96 wells. A dilution tube rack has tubes. A gel has lanes. A
multichannel pipette has channels. The object declares this structure
once; a protocol addresses individual subparts by reference into the
object's own declared structure.

Per RD-9 of the scene-object split plan, the object vocabulary does
not declare named groups of subparts in the initial design. Protocols
list explicit subparts (for example `treatment_plate.A1`,
`treatment_plate.A2`). Named groups are deferred until real authoring
pain appears, then revisited as a separate vocabulary addition. The
named-groups portion of RD-4 is superseded by RD-9; RD-4's "subparts
belong to the object, not the scene" rule still holds and is encoded
below.

The structure block is optional. An object with no structure block is a
**flat object** (a bottle, a flask, a single-tube vial). An object with
a structure block is a **structured surface**, and its subparts are
first-class addressable units inside that object's namespace.

| Field | Required | Purpose |
| --- | --- | --- |
| `structure.subpart_kind` | yes (if structure present) | What each subpart is (`well`, `tube`, `lane`, `slot`, `channel`). |
| `structure.layout` | yes (if structure present) | One of `grid`, `list`, or `custom`. A grid declares rows and cols; a list declares an ordered count; custom is reserved for future use. |
| `structure.rows` | grid only | Row count. |
| `structure.cols` | grid only | Column count. |
| `structure.count` | list only | Subpart count. |
| `structure.id_pattern` | yes (if structure present) | How a subpart id is built from its row, col, or index. For example `{row_letter}{col}` for a 96-well plate (A1..H12); `slot_{index}` for a list-layout rack (slot_0..slot_n). |
| `structure.subpart_state_fields` | no | A schema of state variables that every subpart carries. Same shape as the object-level `state_fields` schema, applied per subpart. |

Subpart state is not a separate vocabulary. It is the same
[`state_fields`](#state_fields) schema applied at subpart granularity.
A 96-well plate has zero or few plate-level state fields and several
flat per-well fields (per RD-11: `liquid_id`, `liquid_volume`,
`liquid_color`); a multichannel pipette has the same flat liquid
fields per channel.

### Named groups deferred (RD-9)

Per RD-9 of the scene-object split plan, named groups (`target_groups`)
are not declared on the object in the initial vocabulary. A protocol
that needs to act on a row of wells, a tube column, or a set of gel
lanes lists each subpart by reference (for example
`treatment_plate.A1`, `treatment_plate.A2`, ...,
`treatment_plate.A12`). The object's `id_pattern` is the only naming
contract; the scene never sees grouping. Named groups become a
separate vocabulary addition once real authoring pain appears in
shipped protocols.

## state_fields

Status: **target-state.**

`state_fields` is the object's typed schema of declared state
variables. It is the contract between the protocol and the object: a
protocol reads or sets a `state_field` by name; the object resolves
what that state means visually through [`render_map`](#render-map).
Anything not in `state_fields` is not part of the object's authoring
surface.

Per RD-11 of the scene-object split plan, every `state_field` is a
flat primitive. Allowed types are `enum`, `int`, `float`, and `bool`.
There is no `string` type (use `enum` with a closed `allowed` list)
and no composite `liquid` or `set_point` type. Liquid contents and
instrument set-points are modeled as multiple flat fields per object
(for example `liquid_id` plus `liquid_volume` plus `liquid_color` for
a well; `set_volume` for a pipette set-point). The runtime liquid-state
model (`LiquidEntry`, `ContainerLiquid`, `LiquidState`) decomposes
across these flat fields; that ratification is recorded in the M3
inventory.

| Field | Required | Purpose |
| --- | --- | --- |
| `name` | yes | Field name, snake_case, scoped to this object. |
| `type` | yes | One of `enum`, `int`, `float`, `bool` (RD-11). |
| `default` | yes | Initial value. Required so an object's start state is never undefined. Must satisfy the per-type metadata below. |
| `applies_to` | no | `object` (default) or `subpart`. When `subpart`, the field is declared per subpart instead of per object. Equivalent to listing the same field under `structure.subpart_state_fields`. |
| `description` | no | One-line author-facing description. |

### Per-type constraint metadata (RD-12)

Per RD-12, constraint metadata is closed per primitive type. Only the
keys listed below are allowed; an unknown metadata key is a build-time
error. There is no open-ended `constraints` object.

| Type | Allowed metadata keys |
| --- | --- |
| `enum` | `allowed` (non-empty list of strings, required), `default` (one value from `allowed`, required) |
| `int` | `unit` (string), `min` (int), `max` (int), `step` (int), `default` (int, required) |
| `float` | `unit` (string), `min` (float), `max` (float), `step` (float), `default` (float, required) |
| `bool` | `default` (`true` or `false`, required) |

The `render_map` entry for an `enum` field must cover every value in
`allowed`. Numeric fields (`int`, `float`) are resolved through the
formula mini-language defined in
[OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md). `bool` fields use the
`cases` form (one case for `true`, one for `false`).

The `applies_to: subpart` form is the bridge between object-level
`state_fields` and `structure.subpart_state_fields`. An author may
declare "every well has a `liquid_volume` field" once at the object
level with `applies_to: subpart`, instead of restating it under
structure. Both forms are equivalent.

## Render map

Status: **target-state.**

The `render_map` is the object's state-to-visual function. The protocol
sets semantic state via `ObjectStateChange`; the object's `render_map`
resolves the new state value to a visual asset (an SVG file, a color,
an overlay). The `render_map` is the only place an SVG asset id or a
color value appears in object authoring. Per RD-3 of the scene-object
split plan, `ColorChange` is reclassified to this layer alongside
`SvgSwap`; the protocol stays semantic, the object owns the visual.

The `render_map` is keyed by `state_field` name. For each named
`state_field`, it maps state values to visual outputs.

| Field | Required | Purpose |
| --- | --- | --- |
| `render_map.<field>.kind` | yes | One of `svg`, `color`, `overlay`, `composite`. `svg` names a base SVG asset id. `color` names a color key (matching the runtime `LiquidEntry.colorKey`). `overlay` names an SVG fragment composited over the base. `composite` is a list of any of the above. |
| `render_map.<field>.cases` | yes for `enum` / `bool` | One case per allowed value of the `state_field`. Each case has a `when` (the state value) and an output (svg id, color, overlay, or composite list). |
| `render_map.<field>.formula` | yes for `int` / `float` | A declarative recipe drawn from the closed mini-language in [OBJECT_YAML_FORMAT.md](OBJECT_YAML_FORMAT.md) (for example "fill the container SVG to height proportional to `liquid_volume / capacity`"). For numeric fields where enumerating cases is impractical, the formula names the rendering rule; the runtime resolves it. The token set is closed (RD-7); per-object formula code is not allowed. |
| `render_map.<field>.applies_to` | no | `object` or `subpart`. When `subpart`, the `render_map` applies per subpart (for example one fill per well). Default: `object`. |

Rules:

- Every value in a `state_field`'s `allowed` list must have a
  `render_map` case (`enum`, `bool`) or be covered by a formula
  (numeric `int` and `float` fields).
- A `render_map` entry for an `applies_to: subpart` `state_field` must
  itself be `applies_to: subpart`.
- The `render_map` is the only object-side authoring surface that names
  SVG asset ids or color keys. An identity field, a `state_field`, a
  capability, or a layout hint never names an asset id.

The full set of allowed `formula` tokens (the formula mini-language) is
intentionally narrow; the canonical enumeration belongs in
`docs/OBJECT_YAML_FORMAT.md` alongside the schema for `cases`.

## Capabilities

Status: **target-state.**

**Capabilities** are coarse declarations of what an object affords. The
capability set is the contract for what kinds of interactions a scene
and a protocol may attempt against this object. The inventory observed
`capabilities` as a top-level scene-YAML key on most current scene
files; in the cleaned vocabulary it moves to the object (a capability
is a property of what the thing is, not where it is placed).

| Field | Required | Purpose |
| --- | --- | --- |
| `capabilities` | yes (may be empty) | Closed list of affordance tags. |

Per RD-6 of the scene-object split plan, the capability vocabulary is
a closed list owned by this doc. An object may not invent
capabilities, and there are no open-ended capability objects. Adding a
capability value requires an explicit edit to this vocabulary. The
closed list is:

| Capability | Meaning |
| --- | --- |
| `clickable` | The object accepts a `click` gesture (per the `gesture` set in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)). An object that is not `clickable` is never clickable, regardless of placement. |
| `liquid_container` | The object holds a tracked liquid; expects flat `state_fields` such as `liquid_id`, `liquid_volume`, and `liquid_color` (per RD-11) and a render rule for them. Used by every container (bottle, flask, pipette, well-as-subpart). |
| `instrument_with_setpoint` | The object exposes one or more numeric set-point `state_fields` (typically `float` with `unit`, `min`, `max`); expects an `adjust` gesture from the protocol side. |
| `structured_surface` | The object has a `structure` block with subparts. Every plate, gel, rack, and multichannel pipette carries this capability. |
| `cursor_attachable` | The object may be attached to the cursor by a `CursorAttach` `scene_operation`. Tools that the learner picks up and carries (a serological pipette, a transfer pipette) carry this capability. |
| `decoration_only` | The object is rendered as a static visual and accepts no gestures and no state mutation. Mutually exclusive with every other capability above. |

`decoration_only` is mutually exclusive with `clickable`,
`liquid_container`, `instrument_with_setpoint`, `structured_surface`,
and `cursor_attachable`. The other five are freely combinable.

A scene placement may not override `capabilities` (RD-2). An object that
declares `[clickable, liquid_container]` carries those affordances in
every scene that places it.

## Layout hints

Status: **target-state.**

**Layout hints** are object-side defaults that the layout engine
([LAYOUT_ENGINE.md](LAYOUT_ENGINE.md)) consumes when the scene places
the object. They replace today's `src/asset_specs.ts` properties
(`defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`), which
are visual metrics of the object itself, not of any one scene. Per
RD-2, a scene placement may override layout hints (this is the only
override category besides `label` and `short_label`).

| Field | Required | Purpose |
| --- | --- | --- |
| `layout.default_width` | yes | Default visual width in layout units. Today's `defaultWidth`. |
| `layout.label_width` | no | Width budget for the label. Today's `labelWidth`. |
| `layout.anchor_y_offset` | no | Vertical anchor adjustment. Today's `anchorYOffset`; observed only on pipette assets in the inventory (per RD-5, exact counts live in [../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md)). |
| `layout.width_scale` | no | Per-object width multiplier. Today's `widthScale`; observed mainly on equipment. |
| `layout.anchor_y` | no | One of `bottom` or `tip`. Today's `anchorY` placement sub-field; reclassified as an object default per the rule that a serological pipette is anchored at its tip wherever it is placed. A scene may override per RD-2. |

## Object ownership of SVG manipulation

Status: **target-state.**

The object owns the state-to-visual map and SVG manipulation. The
protocol sets semantic state through `ObjectStateChange`; the object's
`render_map` resolves the asset. The protocol never names an SVG asset
id and never names a color value.

This rule is binding on:

- [`state_fields`](#state_fields) -- the only authoring surface for
  declared state.
- [`render_map`](#render-map) -- the only authoring surface for
  state-to-visual resolution.
- `ObjectStateChange` (defined in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)) -- the only
  protocol primitive that mutates declared state on an object. Per
  RD-8, an `ObjectStateChange` targets a declared `state_field` by
  name and provides a value matching that field's primitive type
  (`enum`, `int`, `float`, or `bool`). Nested writes are not allowed.
  The validator rejects unknown field names and type-mismatched
  values. Example payload (well at A1 receives 100 ul of PBS):
  `state: { liquid_id: pbs, liquid_volume: 100, liquid_color: clear }`.
  The earlier nested form `state: { held_liquid: { reagent: pbs,
  volume: 100 } }` is not valid.
- The `SvgSwap` and `ColorChange` reclassification (RD-3) -- both are
  object/render-layer mechanisms invoked by the object's `render_map`,
  not protocol-level operations. See the retired-terms table in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) for the protocol-side
  retirement note.

## The object side of the boundary

Status: **target-state.**

The three-way boundary names what each vocabulary owns:

- **Protocol** names what happens. The protocol asks the object to be
  in a different declared state through `ObjectStateChange`; the
  object resolves the visual. Canonical doc:
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).
- **Object** names what a thing is and how its state appears. An
  object declares identity, structure (subparts; named groups are
  deferred per RD-9), the typed flat-primitive `state_fields` schema
  (per RD-11), the `render_map` from state value to visual asset, the
  closed `capabilities` set (per RD-6), and object-default layout
  hints. The object owns the state-to-visual map and SVG manipulation.
  The object never names where it goes in any one scene.
- **Scene** names where things appear and how the space is arranged.
  A scene references objects by id, places them inside named zones,
  declares the outer scene bounds and the layout rules the layout
  engine consumes, and declares the static background backdrop. A
  scene never declares object identity, `state_fields`, `render_map`,
  or `capabilities`. Canonical doc:
  [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md).

Per RD-2, a scene placement may carry exactly one bounded set of
instance overrides: the object's `label` (and `short_label`) and the
object's layout hints (`default_width`, `label_width`,
`anchor_y_offset`, `width_scale`, `anchor_y`). A placement may not
override identity (`id`, `kind`, `inventory_ref`), `state_fields`,
`render_map`, or `capabilities`.

## Worked example: 96-well plate

Status: **target-state.**

The 96-well plate is the canonical example for structured surfaces and
per-subpart flat-primitive `state_fields` (per RD-11). The candidate is
the `well_plate_96` asset observed in the inventory.

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

state_fields:
  - name: liquid_id
    type: enum
    allowed: [empty, pbs, media, trypsin, dmso, drug_a, drug_b]
    default: empty
    applies_to: subpart
    description: Reagent currently in this well.
  - name: liquid_volume
    type: float
    unit: ul
    min: 0
    max: 300
    default: 0
    applies_to: subpart
    description: Volume of liquid in this well, in microliters.
  - name: liquid_color
    type: enum
    allowed: [clear, red, pink, yellow, blue, brown]
    default: clear
    applies_to: subpart
    description: Visible color of the well contents.

render_map:
  liquid_id:
    kind: svg
    applies_to: subpart
    cases:
      - when: empty
        output: { svg: well_empty }
      - when: pbs
        output: { svg: well_filled }
      - when: media
        output: { svg: well_filled }
      - when: trypsin
        output: { svg: well_filled }
      - when: dmso
        output: { svg: well_filled }
      - when: drug_a
        output: { svg: well_filled }
      - when: drug_b
        output: { svg: well_filled }
  liquid_volume:
    kind: composite
    applies_to: subpart
    formula: fill_height(state(liquid_volume), capacity_ul=300)
  liquid_color:
    kind: color
    applies_to: subpart
    cases:
      - when: clear
        output: { color: clear }
      - when: red
        output: { color: red }
      - when: pink
        output: { color: pink }
      - when: yellow
        output: { color: yellow }
      - when: blue
        output: { color: blue }
      - when: brown
        output: { color: brown }

capabilities: [clickable, structured_surface, liquid_container]

layout:
  default_width: 14
  label_width: 8
```

Reading: the plate has no plate-level state, 96 wells (A1..H12) each
carrying three flat `state_fields` per RD-11 (`liquid_id`,
`liquid_volume`, `liquid_color`). A protocol that today wanted to act
on row A lists each subpart explicitly (per RD-9): `treatment_plate.A1`,
`treatment_plate.A2`, ..., `treatment_plate.A12`. Each well's
`render_map` resolves the three flat fields to a base SVG, a fill
height, and a color tint independently. No SVG asset id appears in any
`state_field`. The `row_letter` and `col` tokens in `id_pattern` are
object-vocabulary literals (the row index 0..7 maps to A..H; the col
index 1..12 maps to itself); the same pattern would express
`slot_0..slot_7` for a list-layout rack via `id_pattern: "slot_{index}"`.

## Worked example: serological pipette

Status: **target-state.**

The serological pipette is the canonical example for flat-primitive
`state_fields` (per RD-11) on a flat object: a numeric set-point and a
held-liquid pair. The candidate is the `serological_pipette` asset
observed in the inventory.

```yaml
id: serological_pipette
kind: pipette
label: Serological pipette
short_label: Pipette

state_fields:
  - name: set_volume
    type: float
    unit: ml
    min: 0.1
    max: 25.0
    step: 0.1
    default: 1.0
    description: Volume the pipette is set to dispense.
  - name: held_liquid_id
    type: enum
    allowed: [empty, pbs, media, trypsin, dmso]
    default: empty
    description: Reagent currently aspirated in the pipette barrel.
  - name: held_liquid_volume
    type: float
    unit: ml
    min: 0
    max: 25.0
    default: 0
    description: Volume of liquid currently held, in milliliters.

render_map:
  set_volume:
    kind: overlay
    formula: label(state(set_volume), format="{value} ml")
  held_liquid_id:
    kind: svg
    cases:
      - when: empty
        output: { svg: pipette_empty }
      - when: pbs
        output: { svg: pipette_filled }
      - when: media
        output: { svg: pipette_filled }
      - when: trypsin
        output: { svg: pipette_filled }
      - when: dmso
        output: { svg: pipette_filled }
  held_liquid_volume:
    kind: composite
    formula: fill_height(state(held_liquid_volume), capacity_ml=25.0)

capabilities: [clickable, liquid_container, instrument_with_setpoint, cursor_attachable]

layout:
  default_width: 3
  label_width: 6
  anchor_y: tip
  anchor_y_offset: 0
```

Reading: the pipette is a flat object (no `structure` block, no
subparts). Per RD-11 it declares three flat `state_fields`:
`set_volume` (a `float` set-point), `held_liquid_id` (an `enum` of
which reagent is loaded), and `held_liquid_volume` (a `float` for the
amount held). The `render_map` resolves each independently: the
set-point becomes an overlay label, the reagent becomes a base SVG,
and the volume becomes a fill height. No SVG asset id appears in any
`state_field`. The layout hints replicate today's
`serological_pipette` row in `src/asset_specs.ts` (`defaultWidth: 3`,
`labelWidth: 6`, `anchorYOffset: 0`), now object-owned, plus
`anchor_y: tip` reclassified from today's per-item placement
sub-field.

## Terms

Status: **target-state.**

| Term | One-line definition |
| --- | --- |
| object | The unit of authoring for "what a thing is"; one identity, one structure, one schema of state, one render map, one capability set, one set of layout hints. |
| object library | The collection of object definitions a scene references by `id`; the home of every object-identity slot. |
| object id | The stable string id for an object; the only handle the scene side names. |
| flat object | An object with no `structure` block; no subparts. |
| structured surface | An object with a `structure` block declaring addressable subparts. |
| subpart | An addressable internal unit of a structured surface (a `well`, `tube`, `lane`, `slot`, `channel`). |
| `state_field` | One declared, typed flat-primitive state variable (per RD-11) on an object or per subpart; the contract between the protocol and the object. |
| `render_map` | The object's state-to-visual function; resolves a `state_field` value to an SVG asset, color, overlay, or composite. |
| capability | A closed-vocabulary affordance tag declared on the object (per RD-6: `clickable`, `liquid_container`, `instrument_with_setpoint`, `structured_surface`, `cursor_attachable`, `decoration_only`). |
| layout hint | An object-default visual metric the layout engine consumes (`default_width`, `label_width`, `anchor_y_offset`, `width_scale`, `anchor_y`). |
| `ObjectStateChange` | The protocol-level primitive that mutates declared `state_fields` on an object; defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). |

## Retired and reclassified terms

Status: **target-state.**

Object-side retirements and reclassifications. Each item below moves
into the object vocabulary from somewhere else.

| Reclassified or retired | Use instead | Reason |
| --- | --- | --- |
| `items[].svgAsset` (literal asset id in scene YAML) | a `render_map` entry on the object | the object owns SVG manipulation; the asset id lives in `render_map` only |
| `items[].kind`, `items[].id`, `items[].label`, `items[].shortLabel`, `items[].inventoryRef` (object-identity sub-fields in scene YAML) | object identity (`id`, `kind`, `label`, `short_label`, `inventory_ref`) | identity is object-owned; the scene names objects only by `id` |
| `items[].anchorY` (placement sub-field in scene YAML) | object `layout.anchor_y` (a scene placement may still override per RD-2) | a serological pipette is tip-anchored regardless of placement; the anchor is an object property |
| `capabilities` (top-level scene YAML key) | object `capabilities` (closed list per RD-6) | a capability is a property of what the thing is, not where it is placed |
| `target_groups` (top-level scene YAML key, plan-listed) | retired with no successor in this vocabulary pass per RD-9; named groups are deferred until shipped authoring pain appears | structure belongs to the object (RD-4) but the named-groups expression is deferred (RD-9); protocols list explicit subparts instead |
| per-asset entries in `src/asset_specs.ts` (`defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`) | object `layout` block | per-asset visual metrics are object properties, not engine constants |
| `SvgSwap` (as a protocol-level `scene_operation`) | invoked by the object's `render_map` from an `ObjectStateChange` mutation | render-layer mechanism, not a protocol semantic primitive; see the retired-terms table in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) |
| `ColorChange` (as a protocol-level `scene_operation`) | invoked by the object's `render_map` from an `ObjectStateChange` mutation | render-layer mechanism (RD-3); a future colorimetric-reading primitive is reserved but is not generic `ColorChange` |

## Status

Status: **current-code** (this section).

This doc is **target-state**. The vocabulary it encodes is ratified --
M3 mapped the designed vocabulary against every current scene YAML
file, every current `src/asset_specs.ts` entry, the runtime
liquid-state model, and every ratified `scene_operation` primitive --
but no authoring file format in the repo speaks it yet. Per RD-5,
the exact counts live in
[../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md)
rather than in this canonical doc.

The current runtime still carries object-identity slots inline in scene
YAML `items[]` and per-asset visual metrics in `src/asset_specs.ts`; no
`render_map` exists, and the `capabilities` key still sits at the top
of scene YAML. Migrating the runtime to this vocabulary is the
follow-on code-migration plan's job. Until then, a reader working in
the code will see the pre-split layout; this doc names the cleaned
vocabulary so the gap between the designed model and the running code
is explicit, not hidden. The companion `docs/OBJECT_YAML_FORMAT.md`
will encode the authoring file shape.
