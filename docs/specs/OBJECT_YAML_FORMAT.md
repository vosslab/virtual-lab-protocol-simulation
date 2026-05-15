# Object YAML format

Object terminology is defined in [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).
This doc uses that vocabulary. Where this doc names a section without
restating its meaning (for example "render map" or "named group"), the
vocabulary doc is the authority.

This document specifies the per-object YAML schema for the object library.
An object library file declares one object: identity, structure, the typed
`state_fields` schema, the `render_map` from state value to visual asset,
the closed `capabilities` set, and object-default layout hints. The scene
side names the object only by `id`
([SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md)); the protocol side mutates
declared state through `ObjectStateChange`
([PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).

## Target-state vs current-code

This doc is **target-state** end to end. The runtime does not yet read any
file in this format; today's runtime carries object-identity sub-fields
inline in scene YAML `items[]` entries and per-asset visual metrics in
`src/asset_specs.ts`. The vocabulary this format encodes was ratified in
milestones M2 and M3 of the scene-object split plan
([../archive/scene_object_split_plan.md](../archive/scene_object_split_plan.md))
and promoted into [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) in M4. This
format doc is the M4 schema deliverable; the follow-on code-migration plan
adds the runtime loader, the build pipeline, and the migration of every
current scene YAML file to this format.

A reader working in the code today will not find an object library file.
Every section below describes the file shape authors will write once the
follow-on plan lands.

Per RD-5 of the scene-object split plan, this canonical doc does not
quote fixed asset or scene counts. Counts live in
[../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md).

## File layout

Status: **target-state.**

One object per file. The filename is the object `id` plus `.yaml`, in
snake_case. Examples: `well_plate_96.yaml`, `serological_pipette.yaml`,
`pbs_bottle.yaml`.

The rule is "one object per file" so a file rename always renames exactly
one object id and a code-search for an object id always lands in exactly one
file. Grouped library files (one file per `kind`, or one file per scene)
are explicitly out of scope for this doc; if grouped libraries become
useful later, the follow-on plan introduces them under a new convention,
not as a variant of this one.

Files live under `content/objects/`. Subdirectory grouping by `kind`
(`content/objects/plate/`, `content/objects/bottle/`, etc.) is a follow-on
plan decision and is not specified here; for the M4 schema, every object
file lives directly under `content/objects/`.

The object library is the authoring surface. The build pipeline (a
follow-on plan deliverable, not specified here) compiles the object library
into a generated TypeScript module the scene driver and adapters consume.
No YAML parser ships in the browser; runtime callers read the generated
module.

## Top-level fields

Status: **target-state.**

Every object file is a single YAML mapping with the following top-level
keys. The "Required" column is the schema rule; the "Section" column links
to the per-section detail below.

| Field | Type | Required | Section |
| --- | --- | --- | --- |
| `id` | string | yes | [Object identity](#object-identity) |
| `kind` | enum string | yes | [Object identity](#object-identity) |
| `label` | string | yes | [Object identity](#object-identity) |
| `short_label` | string | no | [Object identity](#object-identity) |
| `inventory_ref` | string | no | [Object identity](#object-identity) |
| `structure` | mapping | no | [Structure](#structure) |
| `state_fields` | list of mapping | yes (may be empty) | [state_fields](#state_fields) |
| `render_map` | mapping | yes (may be empty) | [Render map](#render-map) |
| `capabilities` | list of enum string | yes (may be empty) | [Capabilities](#capabilities) |
| `layout` | mapping | yes | [Layout hints](#layout-hints) |

`state_fields`, `render_map`, and `capabilities` are required even when
empty (the empty list and empty mapping forms). This is deliberate: an
object's authoring surface always lists its declared state, its render map,
and its capabilities, even when there are none, so a reader never has to
guess whether absence means "none" or "forgot to add". The empty forms
are written `state_fields: []`, `render_map: {}`, `capabilities: []`.

## Object identity

Status: **target-state.**

Identity fields name the object and classify it. They are stable across
scenes; per RD-2 of the scene-object split plan, a scene placement may not
override `id`, `kind`, or `inventory_ref`. A scene placement may override
`label` and `short_label`.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `id` | string | yes | snake_case, unique across the object library | none (must be set) |
| `kind` | enum string | yes | one of `plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`, `equipment`, `decoration` | none (must be set) |
| `label` | string | yes | any non-empty string | none (must be set) |
| `short_label` | string | no | any non-empty string | unset; UI falls back to `label` |
| `inventory_ref` | string | no | snake_case id into a curriculum-level inventory entry | unset |

The `id` value must equal the filename without the `.yaml` extension. The
build pipeline rejects a mismatch.

`svgAsset` (today's `items[]` sub-field in scene YAML) is **not** an
identity field. The object resolves an asset through `render_map` from
declared state; a single literal asset becomes a `render_map` entry with
one case. See [Render map](#render-map).

## Structure

Status: **target-state.**

The `structure` block declares addressable internal subparts. It is
optional. An object with no `structure` block is a flat object (a bottle, a
flask, a single-tube vial). An object with a `structure` block is a
structured surface; its subparts are first-class addressable units inside
the object's namespace.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `structure.subpart_kind` | enum string | yes (if `structure` present) | one of `well`, `tube`, `lane`, `slot`, `channel` | none |
| `structure.layout` | enum string | yes (if `structure` present) | one of `grid`, `list`, `custom` | none |
| `structure.rows` | int | yes (if `layout: grid`) | positive integer | none |
| `structure.cols` | int | yes (if `layout: grid`) | positive integer | none |
| `structure.count` | int | yes (if `layout: list`) | positive integer | none |
| `structure.id_pattern` | string | yes (if `structure` present) | a string with one or more bracketed tokens drawn from the closed token set below | none |
| `structure.subpart_state_fields` | list of mapping | no | same shape as [state_fields](#state_fields) entries; applied per subpart | unset |

`structure.layout: custom` is reserved for future use; this format does not
specify `custom` schema fields. An object with `layout: custom` is invalid
under this schema and is rejected by the build pipeline.

### id_pattern token set

Status: **target-state.**

`structure.id_pattern` is a small templating string. The closed token set
fixed by this format is:

| Token | Meaning | Valid in |
| --- | --- | --- |
| `{row_letter}` | The row index `0..rows-1` mapped to letters `A..Z` | `layout: grid` only |
| `{row}` | The row index `1..rows` (1-based numeric) | `layout: grid` only |
| `{col}` | The column index `1..cols` (1-based numeric) | `layout: grid` only |
| `{col_letter}` | The column index `0..cols-1` mapped to letters `A..Z` | `layout: grid` only |
| `{index}` | The subpart index `0..count-1` (0-based numeric) | `layout: list` only |

A token is written exactly as shown above, including the braces. Literal
characters between tokens are preserved verbatim. No other tokens are
allowed; an unknown token is a build-time error.

Examples:

- `id_pattern: "{row_letter}{col}"` on an 8x12 grid yields `A1`, `A2`,
  ..., `H12` (the 96-well plate convention).
- `id_pattern: "slot_{index}"` on a list of count 8 yields `slot_0`,
  `slot_1`, ..., `slot_7` (a tube-rack convention).
- `id_pattern: "lane_{row}"` on a 6x1 grid yields `lane_1`, `lane_2`, ...,
  `lane_6` (a single-column gel convention).

### Named groups deferred (RD-9)

Status: **target-state.**

Per RD-9 of the scene-object split plan, named groups (`target_groups`)
are deferred. Protocols list explicit subparts (for example
`treatment_plate.A1`, `treatment_plate.A2`, ...,
`treatment_plate.A12`). A future addition is gated on real authoring
pain in shipped protocols. RD-4's "subparts belong to the object, not
the scene" rule still holds; only the named-groups expression is
deferred.

## state_fields

Status: **target-state.**

`state_fields` is the typed schema of declared state variables on this
object. Per RD-11 of the scene-object split plan, every field is a flat
primitive: `enum`, `int`, `float`, or `bool`. There is no `string` type
(use `enum` with a closed `allowed` list) and no composite `liquid` or
`set_point` type. Liquid contents and instrument set-points are modeled
as multiple flat fields per object.

Every entry is a mapping with the required keys `name`, `type`,
`default`, plus per-type metadata (per RD-12) and the optional
`applies_to` and `description`.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `name` | string | yes | snake_case, unique within this object's `state_fields` | none |
| `type` | enum string | yes | one of `enum`, `int`, `float`, `bool` | none |
| `default` | matches `type` | yes | must satisfy `type` and the per-type metadata below | none |
| `applies_to` | enum string | no | one of `object`, `subpart` | `object` |
| `description` | string | no | one-line author-facing string | unset |

`applies_to: subpart` is only valid when this object has a `structure`
block. Declaring `applies_to: subpart` on a flat object is a build-time
error. The form is equivalent to listing the same field under
`structure.subpart_state_fields`; an author may use either form.

### Per-type constraint metadata (RD-12)

Status: **target-state.**

Per RD-12, constraint metadata is a closed per-type set. Only the keys
listed below are allowed on a `state_field` entry; an unknown metadata
key is a build-time error. There is no open-ended `constraints:`
object.

| `type` | Allowed metadata keys (alongside `name`, `type`, `default`, `applies_to`, `description`) |
| --- | --- |
| `enum` | `allowed` (non-empty list of strings, required); `default` is one value from `allowed` |
| `int` | `unit` (string), `min` (int), `max` (int), `step` (int); `default` is an int satisfying `min`/`max`/`step` when present |
| `float` | `unit` (string), `min` (float), `max` (float), `step` (float); `default` is a float satisfying `min`/`max`/`step` when present |
| `bool` | none beyond `default` (one of `true`, `false`) |

Unit strings for numeric fields are ASCII-only per
[../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md). Standard runtime units include
`ml`, `ul`, `rpm`, `C`, `s`, `min`. Greek-letter units (for example
micro) are written ASCII-only; a future plan may introduce a unit
table doc.

### Modeling liquid and set-point state with flat fields (RD-11)

Liquid contents are modeled as several flat fields per object or per
subpart. The canonical pattern is `liquid_id` (an `enum` of allowed
reagent ids), `liquid_volume` (a `float` with a `unit` and a range),
and `liquid_color` (an `enum` of color names) for a vessel; or
`held_liquid_id` plus `held_liquid_volume` for a tool that carries
liquid. Reagent ids in the `enum`'s `allowed` list must resolve to
declared reagents in the protocol's reagents file (see
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md)). The shared liquid
model is in [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md); render-rule
helpers (`fill_height`, color tints) are defined in the [formula
mini-language](#formula-mini-language) below.

Instrument set-points are modeled as a single `float` field with `unit`,
`min`, `max`, and `step` metadata (for example `set_volume` on a
serological pipette).

## Render map

Status: **target-state.**

The `render_map` is the object's state-to-visual function. It is a mapping
keyed by `state_field` name. For each named field, it declares how to
resolve the field's value to a visual output (an SVG asset id, a color
key, an SVG overlay id, or a composite of these).

The `render_map` is the only authoring surface in this format that names
SVG asset ids or color keys. An identity field, a `state_field`, a
capability, or a layout hint never names an asset id.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `render_map.<field>.kind` | enum string | yes | one of `svg`, `color`, `overlay`, `composite` | none |
| `render_map.<field>.cases` | list of case mappings | required for `state_field.type` of `enum` or `bool`; forbidden for `int` or `float` | see [Cases schema](#cases-schema) below | none |
| `render_map.<field>.formula` | string | required for `state_field.type` of `int` or `float`; forbidden for `enum` or `bool` | a string drawn from the closed [formula mini-language](#formula-mini-language) | none |
| `render_map.<field>.applies_to` | enum string | no | one of `object`, `subpart` | `object` |

Every key in `render_map` must name a declared `state_field` on this
object. A `render_map` key with no matching `state_field` is a build-time
error. The reverse is also enforced: every `state_field` must have a
matching `render_map` entry. A field whose value never affects the
visual is declared with an explicit `render_map.<field>.kind: composite`
and an empty composite list so absence stays loud.

A `render_map` entry for an `applies_to: subpart` `state_field` must
itself be `applies_to: subpart`. Mixing per-subpart state with per-object
rendering, or vice versa, is a build-time error.

### Cases schema

Status: **target-state.**

A `cases` list contains one case mapping per allowed value of the
`state_field`. Coverage is enforced: every value in the field's `allowed`
list must appear as a `when` value in exactly one case (for `bool`, both
`true` and `false` must be covered).

Every case mapping has the shape:

| Field | Type | Required | Allowed |
| --- | --- | --- | --- |
| `when` | matches `state_field.type` | yes | a value from the field's `allowed` list |
| `output` | mapping | yes | one of the four output shapes below |

The `output` mapping takes one of four shapes, matching the
`render_map.<field>.kind`:

| `kind` | `output` shape |
| --- | --- |
| `svg` | `{svg: <asset_id>}` -- one asset id resolved by the SVG pipeline |
| `color` | `{color: <color_key>}` -- one color key matching the runtime `LiquidEntry.colorKey` and the reagent `colorKey` in [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) |
| `overlay` | `{overlay: <overlay_id>}` -- one SVG fragment id composited over the base |
| `composite` | `{composite: [<output mapping>, ...]}` -- a non-empty ordered list of any of the three shapes above |

A composite list is rendered top to bottom; the first entry is the base
layer and each subsequent entry composites over the previous.

### Formula mini-language

Status: **target-state.**

Resolves [WP-DOC-OV1 concern (a)] -- the closed list of allowed formula
tokens. Per RD-7 of the scene-object split plan, the token set below is
closed; an unknown token is a build-time error.

A `formula` value is a string drawn from a closed mini-language. The
mini-language is intentionally narrow: every token is fixed by this format
and the runtime resolves it. Per-object formula code is not allowed; if a
state-to-visual mapping cannot be expressed in the tokens below, the
correct response is to extend the mini-language in a future revision of
this doc, not to embed code in an object file.

The closed token set is:

| Token | Operand types | Meaning |
| --- | --- | --- |
| `state(<field_name>)` | any `int` or `float` `state_field` declared on this object | the current numeric value of the named field |
| `const(<number>)` | numeric literal | a literal number (decimal or integer) |
| `const(<string>)` | string literal | a literal string in double quotes |
| `+` `-` `*` `/` | numeric operands | basic arithmetic, left-associative |
| `min(a, b)` `max(a, b)` | numeric operands | bounded arithmetic |
| `clamp(value, lo, hi)` | numeric operands | clamp `value` to `[lo, hi]` |
| `fill_height(state(<volume_field>), capacity_ml=<number>)` | a numeric volume `state_field` (typically a `float` named `liquid_volume`, `held_liquid_volume`, etc.) | resolve the field to a fill height proportional to the volume divided by `capacity_ml` (or `capacity_ul` when units match); the runtime applies it to the rendered SVG container |
| `label(state(<numeric_field>), format=<string>)` | a numeric `state_field` (typically a set-point `float`) | render the value as an overlay text label, using the format string with `{value}` placeholder; the format string supplies the unit text |
| `compose(<token>, <token>, ...)` | any of the above | compose multiple effects (for example a fill plus a label) into one render output; ordered top to bottom |

A formula is one expression. Multiple expressions are composed through
`compose(...)`, not by concatenation or by multi-line strings.

This is the complete token set. An unknown token (per RD-7), an arity
mismatch (wrong number of operands), or a type mismatch (for example
`fill_height` applied to a non-numeric field) is a build-time error.

Color tints for `enum` color fields (typically `liquid_color`) are
expressed as `render_map.<field>.kind: color` with `cases`, not as a
formula token. This keeps every color value scoped to a declared
`enum` value.

Worked formula examples appear in the [worked-example sections](#worked-example-96-well-plate)
below.

## Capabilities

Status: **target-state.**

Resolves [WP-DOC-OV1 concern (b)] -- the capability mutual-exclusion rule.
Per RD-6 of the scene-object split plan, the capability list is closed.

`capabilities` is a list of affordance tags drawn from the closed
vocabulary owned by [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). The
list may be empty. An object may not invent capabilities; adding a
capability value requires an explicit edit to the vocabulary doc.

The closed list (with the meaning summary; the vocabulary doc is the
authority):

| Capability | Summary |
| --- | --- |
| `clickable` | accepts a `click` gesture |
| `liquid_container` | holds a tracked liquid; expects flat liquid `state_fields` (per RD-11) such as `liquid_id`, `liquid_volume`, and `liquid_color` and matching `render_map` entries |
| `instrument_with_setpoint` | exposes one or more numeric set-point `state_fields` (typically `float` with `unit`, `min`, `max`); expects an `adjust` gesture |
| `structured_surface` | has a `structure` block with subparts |
| `cursor_attachable` | may be attached to the cursor by a `CursorAttach` `scene_operation` |
| `decoration_only` | rendered as a static visual; accepts no gestures and no state mutation |

### Mutual-exclusion rule

`decoration_only` is mutually exclusive with `clickable`,
`liquid_container`, `instrument_with_setpoint`, `structured_surface`,
and `cursor_attachable`. An object that declares `decoration_only` may
not declare any of the other five; an object that declares any of the
other five may not declare `decoration_only`. The build pipeline
enforces this rule and rejects a violating capability list.

The five non-decoration capabilities are otherwise freely combinable. A
96-well plate is `[clickable, structured_surface, liquid_container]`; a
serological pipette is `[clickable, liquid_container,
instrument_with_setpoint, cursor_attachable]`; a benchtop label is
`[decoration_only]`.

### Capability-to-schema dependencies

When a capability is declared, the rest of the object schema must support
it. The dependencies are:

| Capability | Required schema |
| --- | --- |
| `liquid_container` | at least one liquid `state_field` (typically a `liquid_id` `enum` and a `liquid_volume` `float`) and matching `render_map` entries |
| `instrument_with_setpoint` | at least one numeric set-point `state_field` (a `float` with `unit`, `min`, `max`) and a matching `render_map` entry |
| `structured_surface` | a `structure` block with `subpart_kind`, `layout`, and `id_pattern` |
| `cursor_attachable` | no schema dependency (an object that is cursor-attachable simply declares it; the protocol-level `CursorAttach` `scene_operation` consumes the capability) |
| `clickable` | no schema dependency (every object that is clickable simply declares it) |
| `decoration_only` | the object's `state_fields` list is empty and the `render_map` mapping is empty (a decoration carries no declared state and no state-driven rendering) |

A capability declared without its required schema is a build-time error.

## Layout hints

Status: **target-state.**

`layout` is a mapping of object-default visual metrics the layout engine
([LAYOUT_ENGINE.md](LAYOUT_ENGINE.md)) consumes when a scene places the
object. Per RD-2, a scene placement may override every field in the
`layout` block.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `layout.default_width` | float | yes | positive number, in layout units | none |
| `layout.label_width` | float | no | positive number, in layout units | unset; layout engine falls back to `default_width` |
| `layout.anchor_y_offset` | float | no | any number (positive or negative) | `0` |
| `layout.width_scale` | float | no | positive number | `1.0` |
| `layout.anchor_y` | enum string | no | one of `bottom`, `tip` | `bottom` |

`layout` itself is required; `layout.default_width` is the only required
sub-field. The other sub-fields are optional and fall through to the
defaults listed above.

## Worked example: 96-well plate

Status: **target-state.**

The 96-well plate is the canonical example for structured surfaces,
per-subpart flat-primitive `state_fields` (per RD-11), the
`structured_surface` capability, and per-subpart `render_map`
entries.

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
  id_pattern: "{row_letter}{col}"

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

Reading: the plate has no plate-level state, 96 wells (`A1..H12`) each
carrying three flat `state_fields` (`liquid_id`, `liquid_volume`,
`liquid_color`) per RD-11. Per RD-9, named groups are deferred; a
protocol that needs to act on row A lists each subpart explicitly
(`treatment_plate.A1`, ..., `treatment_plate.A12`). Each well's
`render_map` resolves the three flat fields independently: an SVG case
table for the reagent, a `fill_height(...)` formula for the volume,
and a color case table for the visible color. No SVG asset id appears
in any `state_field`.

## Worked example: serological pipette

Status: **target-state.**

The serological pipette is the canonical example for flat-primitive
`state_fields` on a flat object (per RD-11), the
`instrument_with_setpoint` and `cursor_attachable` capabilities, the
`label(...)` formula token, and the `anchor_y: tip` layout hint.

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
`set_volume` (a `float` with `unit`, `min`, `max`, and `step`),
`held_liquid_id` (an `enum` of which reagent is loaded), and
`held_liquid_volume` (a `float` for the amount held). The `render_map`
resolves each independently: the set-point becomes an overlay label,
the reagent becomes a base SVG, and the volume becomes a fill height.
No SVG asset id appears in any `state_field`. The layout hints
replicate today's `serological_pipette` row in `src/asset_specs.ts`
(`defaultWidth: 3`, `labelWidth: 6`, `anchorYOffset: 0`), now
object-owned, plus `anchor_y: tip` reclassified from today's per-item
placement sub-field (a serological pipette is anchored at its tip
wherever it is placed).

## Cross-file validation rules

Status: **target-state.**

The build pipeline (a follow-on plan deliverable) enforces these rules at
build time. A violating object file fails the build loudly; this format
does not specify defensive defaults that hide a missing required field.

### Identity

- The object's `id` equals the filename without the `.yaml` extension.
- `id` is unique across the object library.
- `kind` is one of the eight values in [Object identity](#object-identity).

### Structure

- `structure.layout: grid` requires `rows` and `cols`; `layout: list`
  requires `count`; `layout: custom` is rejected (reserved).
- Every token in `structure.id_pattern` is in the closed token set; arity
  matches the layout (`{row_letter}` and `{row}` only valid for grid;
  `{index}` only valid for list).
- Per RD-9, named groups (`structure.target_groups`) are not part of
  this schema; an object that declares them is rejected.

### state_fields

- Every `state_field.name` is unique within this object's
  `state_fields`.
- `type` is one of `enum`, `int`, `float`, `bool` (per RD-11).
- Per-type metadata satisfies the
  [closed metadata rules](#per-type-constraint-metadata-rd-12) above
  (per RD-12); unknown metadata keys are rejected.
- `default` is present and satisfies the type and metadata.
- `applies_to: subpart` is only valid when the object has a `structure`
  block.
- For liquid `enum` fields (typically `liquid_id`), reagent ids in
  `allowed` must resolve to declared reagents in the protocol's
  reagents file.

### render_map

- Every `render_map` key matches a declared `state_field` name.
- Every declared `state_field` has a matching `render_map` entry (a
  field with no visual effect declares an explicit
  `render_map.<field>.kind: composite` with an empty composite list).
- For `enum` and `bool` `state_fields`, every value in the field's
  `allowed` list appears in exactly one `cases[].when`.
- For `int` and `float` `state_fields`, the `formula` string parses
  against the closed
  [formula mini-language](#formula-mini-language) (per RD-7).
- A `render_map` entry for an `applies_to: subpart` `state_field` is
  itself `applies_to: subpart`.

### capabilities

- Every entry is in the closed six-value capability list (per RD-6:
  `clickable`, `liquid_container`, `instrument_with_setpoint`,
  `structured_surface`, `cursor_attachable`, `decoration_only`).
- `decoration_only` is mutually exclusive with the other five.
- Every declared capability's
  [schema dependency](#capability-to-schema-dependencies) is satisfied.

### layout

- `layout.default_width` is set and positive.
- Optional sub-fields, when present, satisfy their type and range rules.

### Hygiene

- ASCII-only across the file; UTF-8 glyphs are escaped per
  [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md) (for example `&micro;`).
- Snake_case is used for every id (`id`, `state_field.name`, reagent
  ids).

## Generated TypeScript surface

Status: **target-state.**

The follow-on code-migration plan adds the build pipeline that compiles
the object library into a generated TypeScript module. This format doc
does not specify the runtime shape of that module; the protocol-side
analogue (the per-protocol generated module described in
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md)) is the closest
reference. The runtime never reads object YAML directly; it reads the
generated module the build emits.

## See also

- [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md) -- the canonical object
  vocabulary; this doc encodes its YAML schema.
- [SCENE_VOCABULARY.md](SCENE_VOCABULARY.md) -- the scene-side
  vocabulary; the scene names objects by `id`.
- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) -- the scene YAML schema;
  scene placements consume the override surface this format declares.
- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) -- the protocol
  vocabulary, including the `ObjectStateChange` primitive that mutates
  declared object state.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) -- the protocol
  YAML schema; reagent ids referenced by `liquid` `state_fields` are
  declared there.
- [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) -- the layout engine that
  consumes object-side layout hints.
- [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md) -- the shared liquid
  model that the `liquid` `state_field` type and the `fill_height` /
  `tint` formula tokens build on.
- [SVG_PIPELINE.md](SVG_PIPELINE.md) -- the SVG asset pipeline; the
  `render_map` resolves to asset ids the pipeline owns.
- [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md) -- ASCII-only and escaping
  rules for YAML and markdown.
- [../archive/scene_object_split_plan.md](../archive/scene_object_split_plan.md) --
  the plan that ratified this format's vocabulary.
- [../archive/scene_object_split_design.md](../archive/scene_object_split_design.md) --
  the M2 design doc the schema encodes.
- [../archive/scene_object_split_inventory.md](../archive/scene_object_split_inventory.md) --
  the M3 ratification evidence.
