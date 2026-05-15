# Object YAML format

Object terminology is defined in [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md).
This doc uses that vocabulary. Where this doc names a section without
restating its meaning (for example "render map" or "named group"), the
vocabulary doc is the authority.

This document specifies the per-object YAML schema for the object library.
An object library file declares one object: identity, structure, the typed
`state_fields` schema, the `visual_states` from state value to visual asset,
the closed `capabilities` set, and object-default layout hints. The scene
side names the object only by `object_name`
([SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md)); the protocol side mutates
declared state through `ObjectStateChange`
([PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).

## File layout

One object per file. The filename is the object `object_name` plus `.yaml`, in
snake_case. Examples: `well_plate_96.yaml`, `serological_pipette.yaml`,
`pbs_bottle.yaml`.

The rule is "one object per file" so a file rename always renames exactly
one object name and a code-search for an object name always lands in exactly one
file. Grouped library files (one file per `kind`, or one file per scene)
are explicitly out of scope for this doc.

Files live under `content/objects/`. Subdirectory grouping by `kind`
(`content/objects/plate/`, `content/objects/bottle/`, etc.) is allowed.
Every object file lives directly under `content/objects/` or in a
subdirectory named after its `kind`.

The object library is the authoring surface. The build pipeline compiles
the object library into a generated TypeScript module the scene driver and
adapters consume. No YAML parser ships in the browser; runtime callers read
the generated module.

## Top-level fields

Every object file is a single YAML mapping with the following top-level
keys. The "Required" column is the schema rule; the "Section" column links
to the per-section detail below.

| Field | Type | Required | Section |
| --- | --- | --- | --- |
| `object_name` | string | yes | [Object identity](#object-identity) |
| `kind` | enum string | yes | [Object identity](#object-identity) |
| `label` | string | yes | [Object identity](#object-identity) |
| `structure` | mapping | no | [Structure](#structure) |
| `state_fields` | list of mapping | yes (may be empty) | [state_fields](#state_fields) |
| `visual_states` | mapping | yes (may be empty) | [Visual states](#visual-states) |
| `capabilities` | list of enum string | yes (may be empty) | [Capabilities](#capabilities) |
| `layout` | mapping | yes | [Layout hints](#layout-hints) |

`state_fields`, `visual_states`, and `capabilities` are required even when
empty (the empty list and empty mapping forms). This is deliberate: an
object's authoring surface always lists its declared state, its visual states,
and its capabilities, even when there are none, so a reader never has to
guess whether absence means "none" or "forgot to add". The empty forms
are written `state_fields: []`, `visual_states: {}`, `capabilities: []`.

## Object identity

Identity fields name the object and classify it. They are stable across
scenes; a scene placement may not override identity.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `object_name` | string | yes | snake_case, unique across the object library | none (must be set) |
| `kind` | enum string | yes | one of `plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`, `equipment`, `decoration` | none (must be set) |
| `label` | string | yes | any non-empty string | none (must be set) |

The `object_name` value must equal the filename without the `.yaml` extension. The
build pipeline rejects a mismatch.

`asset_name` (today's `items[]` sub-field in scene YAML) is **not** an
identity field. The object resolves an asset through `visual_states` from
declared state; a single literal asset becomes a `visual_states` entry with
one case. See [Visual states](#visual-states).

## Structure

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
| `structure.name_pattern` | string | yes (if `structure` present) | a string with one or more bracketed tokens drawn from the closed token set below | none |
| `structure.subpart_state_fields` | list of mapping | no | same shape as [state_fields](#state_fields) entries; applied per subpart | unset |

`structure.layout: custom` is reserved for future use; this format does not
specify `custom` schema fields. An object with `layout: custom` is invalid
under this schema and is rejected by the build pipeline.

### name_pattern token set

`structure.name_pattern` is a small templating string. The closed token set
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

- `name_pattern: "{row_letter}{col}"` on an 8x12 grid yields `A1`, `A2`,
  ..., `H12` (the 96-well plate convention).
- `name_pattern: "slot_{index}"` on a list of count 8 yields `slot_0`,
  `slot_1`, ..., `slot_7` (a tube-rack convention).
- `name_pattern: "lane_{row}"` on a 6x1 grid yields `lane_1`, `lane_2`, ...,
  `lane_6` (a single-column gel convention).

### Named groups deferred

Named groups (`target_groups`) are deferred. Protocols list explicit
subparts (for example `treatment_plate.A1`, `treatment_plate.A2`, ...,
`treatment_plate.A12`). A future addition is gated on real authoring
pain in shipped protocols. The "subparts belong to the object, not
the scene" rule still holds; only the named-groups expression is
deferred.

## state_fields

`state_fields` is the typed schema of declared state variables on this
object. Every field is a flat primitive: `enum`, `int`, `float`, or
`bool`. There is no `string` type (use `enum` with a closed `allowed`
list) and no composite `liquid` or `set_point` type. Liquid contents
and instrument set-points are modeled as multiple flat fields per
object.

Every entry is a mapping with the required keys `name`, `type`,
`default`, plus per-type metadata and the optional `applies_to` and
`description`.

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

### Per-type constraint metadata

Constraint metadata is a closed per-type set. Only the keys listed
below are allowed on a `state_field` entry; an unknown metadata key is
a build-time error. There is no open-ended `constraints:` object.

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

### Modeling contents and set-point state with flat fields

Contents are modeled as several flat fields per object or per
subpart. The canonical pattern is `contents_name` (an `enum` of allowed
contents ids) and `contents_volume` (a `float` with a `unit` and a range)
for a vessel; or `held_contents_name` plus `held_contents_volume` for a tool
that carries contents. Contents ids in the `enum`'s `allowed` list must
resolve to declared entries in a `contents.yaml` registry (see
[LIQUID_CONVENTION.md](LIQUID_CONVENTION.md)). The shared contents
model is in [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md); render-rule
helpers (`fill_height`) are defined in the [formula
mini-language](#formula-mini-language) below.

Instrument set-points are modeled as a single `float` field with
`unit`, `min`, `max`, and `step` metadata (for example `set_volume`
on a serological pipette).

## Visual states

The `visual_states` is the object's state-to-visual function. It is a mapping
keyed by `state_field` name. For each named field, it declares how to
resolve the field's value to a visual output (an SVG asset name, an SVG
overlay name, or a composite of these). An object declares named closed
visual variants; `visual_states` is not a generic rendering map or
expression surface.

The `visual_states` is the only authoring surface in this format that names
SVG asset names or overlay names. An identity field, a `state_field`, a
capability, or a layout hint never names an asset name.

| Field | Type | Required | Allowed | Default |
| --- | --- | --- | --- | --- |
| `visual_states.<field>.kind` | enum string | yes | one of `svg`, `overlay`, `composite` | none |
| `visual_states.<field>.cases` | list of case mappings | required for `state_field.type` of `enum` or `bool`; forbidden for `int` or `float` | see [Cases schema](#cases-schema) below | none |
| `visual_states.<field>.formula` | string | required for `state_field.type` of `int` or `float`; forbidden for `enum` or `bool` | a string drawn from the closed [formula mini-language](#formula-mini-language) | none |
| `visual_states.<field>.applies_to` | enum string | no | one of `object`, `subpart` | `object` |

Every key in `visual_states` must name a declared `state_field` on this
object. A `visual_states` key with no matching `state_field` is a build-time
error. The reverse is also enforced: every `state_field` must have a
matching `visual_states` entry. A field whose value never affects the
visual is declared with an explicit `visual_states.<field>.kind: composite`
and an empty composite list so absence stays loud.

A `visual_states` entry for an `applies_to: subpart` `state_field` must
itself be `applies_to: subpart`. Mixing per-subpart state with per-object
rendering, or vice versa, is a build-time error.

### Cases schema

A `cases` list contains one case mapping per allowed value of the
`state_field`. Coverage is enforced: every value in the field's `allowed`
list must appear as a `when` value in exactly one case (for `bool`, both
`true` and `false` must be covered).

Every case mapping has the shape:

| Field | Type | Required | Allowed |
| --- | --- | --- | --- |
| `when` | matches `state_field.type` | yes | a value from the field's `allowed` list |
| `output` | mapping | yes | one of the four output shapes below |

The `output` mapping takes one of three shapes, matching the
`visual_states.<field>.kind`:

| `kind` | `output` shape |
| --- | --- |
| `svg` | `{asset_name: <asset_name>}` -- one asset name resolved by the SVG pipeline |
| `overlay` | `{overlay_name: <overlay_name>}` -- one SVG fragment name composited over the base |
| `composite` | `{composite: [<output mapping>, ...]}` -- a non-empty ordered list of any of the two shapes above |

A composite list is rendered top to bottom; the first entry is the base
layer and each subsequent entry composites over the previous.

### Formula mini-language

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
| `fill_height(state(<volume_field>), capacity_ml=<number>)` | a numeric volume `state_field` (typically a `float` named `contents_volume`, `held_contents_volume`, etc.) | resolve the field to a fill height proportional to the volume divided by `capacity_ml` (or `capacity_ul` when units match); the runtime applies it to the rendered SVG container |
| `label(state(<numeric_field>), format=<string>)` | a numeric `state_field` (typically a set-point `float`) | render the value as an overlay text label, using the format string with `{value}` placeholder; the format string supplies the unit text |
| `compose(<token>, <token>, ...)` | any of the above | compose multiple effects (for example a fill plus a label) into one render output; ordered top to bottom |

A formula is one expression. Multiple expressions are composed through
`compose(...)`, not by concatenation or by multi-line strings.

This is the complete token set. An unknown token, an arity mismatch
(wrong number of operands), or a type mismatch (for example `fill_height`
applied to a non-numeric field) is a build-time error.

Worked formula examples appear in the [worked-example sections](#worked-example-96-well-plate)
below.

## Capabilities

`capabilities` is a list of affordance tags drawn from the closed
vocabulary owned by [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). The
list may be empty. An object may not invent capabilities; adding a
capability value requires an explicit edit to the vocabulary doc.

The closed list (with the meaning summary; the vocabulary doc is the
authority):

| Capability | Summary |
| --- | --- |
| `clickable` | accepts a `click` gesture |
| `contents_container` | holds tracked contents; expects flat contents `state_fields` such as `contents_name` and `contents_volume` and matching `visual_states` entries |
| `instrument_with_setpoint` | exposes one or more numeric set-point `state_fields` (typically `float` with `unit`, `min`, `max`); expects an `adjust` gesture |
| `structured_surface` | has a `structure` block with subparts |
| `cursor_attachable` | may be attached to the cursor by a `CursorAttach` `scene_operation` |
| `decoration_only` | rendered as a static visual; accepts no gestures and no state mutation |

### Mutual-exclusion rule

`decoration_only` is mutually exclusive with `clickable`,
`contents_container`, `instrument_with_setpoint`, `structured_surface`,
and `cursor_attachable`. An object that declares `decoration_only` may
not declare any of the other five; an object that declares any of the
other five may not declare `decoration_only`. The build pipeline
enforces this rule and rejects a violating capability list.

The five non-decoration capabilities are otherwise freely combinable. A
96-well plate is `[clickable, structured_surface, contents_container]`; a
serological pipette is `[clickable, contents_container,
instrument_with_setpoint, cursor_attachable]`; a benchtop label is
`[decoration_only]`.

### Capability-to-schema dependencies

When a capability is declared, the rest of the object schema must support
it. The dependencies are:

| Capability | Required schema |
| --- | --- |
| `contents_container` | at least one contents `state_field` (typically a `contents_name` `enum` and a `contents_volume` `float`) and matching `visual_states` entries |
| `instrument_with_setpoint` | at least one numeric set-point `state_field` (a `float` with `unit`, `min`, `max`) and a matching `visual_states` entry |
| `structured_surface` | a `structure` block with `subpart_kind`, `layout`, and `name_pattern` |
| `cursor_attachable` | no schema dependency (an object that is cursor-attachable simply declares it; the protocol-level `CursorAttach` `scene_operation` consumes the capability) |
| `clickable` | no schema dependency (every object that is clickable simply declares it) |
| `decoration_only` | the object's `state_fields` list is empty and the `visual_states` mapping is empty (a decoration carries no declared state and no state-driven rendering) |

A capability declared without its required schema is a build-time error.

## Layout hints

`layout` is a mapping of object-default visual metrics the layout engine
([LAYOUT_ENGINE.md](LAYOUT_ENGINE.md)) consumes when a scene places the
object. A scene placement may override every field in the `layout` block.

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

The 96-well plate is the canonical example for structured surfaces,
per-subpart flat-primitive `state_fields`, the `structured_surface`
capability, and per-subpart `visual_states` entries.

```yaml
object_name: well_plate_96
kind: plate
label: 96-well plate

structure:
  subpart_kind: well
  layout: grid
  rows: 8
  cols: 12
  name_pattern: "{row_letter}{col}"

state_fields:
  - name: contents_name
    type: enum
    allowed: [empty, pbs, media, trypsin, dmso, drug_a, drug_b]
    default: empty
    applies_to: subpart
    description: Contents currently in this well.
  - name: contents_volume
    type: float
    unit: ul
    min: 0
    max: 300
    default: 0
    applies_to: subpart
    description: Volume of contents in this well, in microliters.

visual_states:
  contents_name:
    kind: svg
    applies_to: subpart
    cases:
      - when: empty
        output: { asset_name: well_empty }
      - when: pbs
        output: { asset_name: well_filled }
      - when: media
        output: { asset_name: well_filled }
      - when: trypsin
        output: { asset_name: well_filled }
      - when: dmso
        output: { asset_name: well_filled }
      - when: drug_a
        output: { asset_name: well_filled }
      - when: drug_b
        output: { asset_name: well_filled }
  contents_volume:
    kind: composite
    applies_to: subpart
    formula: fill_height(state(contents_volume), capacity_ul=300)

capabilities: [clickable, structured_surface, contents_container]

layout:
  default_width: 14
  label_width: 8
```

Reading: the plate has no plate-level state, 96 wells (`A1..H12`) each
carrying two flat `state_fields` (`contents_name`, `contents_volume`).
Named groups are deferred; a protocol that needs to act on row A lists
each subpart explicitly (`treatment_plate.A1`, ..., `treatment_plate.A12`).
Each well's `visual_states` resolves the two flat fields independently: an
SVG case table for the contents and a `fill_height(...)` formula for the
volume. No SVG asset name appears in any `state_field`.

## Worked example: serological pipette

The serological pipette is the canonical example for flat-primitive
`state_fields` on a flat object, the `instrument_with_setpoint` and
`cursor_attachable` capabilities, the `label(...)` formula token, and
the `anchor_y: tip` layout hint.

```yaml
object_name: serological_pipette
kind: pipette
label: Serological pipette

state_fields:
  - name: set_volume
    type: float
    unit: ml
    min: 0.1
    max: 25.0
    step: 0.1
    default: 1.0
    description: Volume the pipette is set to dispense.
  - name: held_contents_name
    type: enum
    allowed: [empty, pbs, media, trypsin, dmso]
    default: empty
    description: Contents currently aspirated in the pipette barrel.
  - name: held_contents_volume
    type: float
    unit: ml
    min: 0
    max: 25.0
    default: 0
    description: Volume of contents currently held, in milliliters.

visual_states:
  set_volume:
    kind: overlay
    formula: label(state(set_volume), format="{value} ml")
  held_contents_name:
    kind: svg
    cases:
      - when: empty
        output: { asset_name: pipette_empty }
      - when: pbs
        output: { asset_name: pipette_filled }
      - when: media
        output: { asset_name: pipette_filled }
      - when: trypsin
        output: { asset_name: pipette_filled }
      - when: dmso
        output: { asset_name: pipette_filled }
  held_contents_volume:
    kind: composite
    formula: fill_height(state(held_contents_volume), capacity_ml=25.0)

capabilities: [clickable, contents_container, instrument_with_setpoint, cursor_attachable]

layout:
  default_width: 3
  label_width: 6
  anchor_y: tip
  anchor_y_offset: 0
```

Reading: the pipette is a flat object (no `structure` block, no
subparts). It declares three flat `state_fields`: `set_volume` (a
`float` with `unit`, `min`, `max`, and `step`), `held_contents_name` (an
`enum` of which contents is loaded), and `held_contents_volume` (a `float`
for the amount held). The `visual_states` resolves each independently:
the set-point becomes an overlay label, the contents becomes a base SVG,
and the volume becomes a fill height. No SVG asset name appears in any
`state_field`. The layout hints (`default_width: 3`, `label_width: 6`,
`anchor_y_offset: 0`, `anchor_y: tip`) are object-owned; the tip anchor
reflects that a serological pipette is tip-anchored wherever it is
placed.

## Cross-file validation rules

The build pipeline (a follow-on plan deliverable) enforces these rules at
build time. A violating object file fails the build loudly; this format
does not specify defensive defaults that hide a missing required field.

### Identity

- The object's `object_name` equals the filename without the `.yaml` extension.
- `object_name` is unique across the object library.
- `kind` is one of the eight values in [Object identity](#object-identity).

### Structure

- `structure.layout: grid` requires `rows` and `cols`; `layout: list`
  requires `count`; `layout: custom` is rejected (reserved).
- Every token in `structure.name_pattern` is in the closed token set; arity
  matches the layout (`{row_letter}` and `{row}` only valid for grid;
  `{index}` only valid for list).
- Named groups (`structure.target_groups`) are not part of this schema;
  an object that declares them is rejected.

### state_fields

- Every `state_field.name` is unique within this object's
  `state_fields`.
- `type` is one of `enum`, `int`, `float`, `bool`.
- Per-type metadata satisfies the [closed metadata rules](#per-type-constraint-metadata)
  above; unknown metadata keys are rejected.
- `default` is present and satisfies the type and metadata.
- `applies_to: subpart` is only valid when the object has a `structure`
  block.
- For contents `enum` fields (typically `contents_name`), contents ids in
  `allowed` must resolve to declared entries in a contents registry.

### visual_states

- Every `visual_states` key matches a declared `state_field` name.
- Every declared `state_field` has a matching `visual_states` entry (a
  field with no visual effect declares an explicit
  `visual_states.<field>.kind: composite` with an empty composite list).
- For `enum` and `bool` `state_fields`, every value in the field's
  `allowed` list appears in exactly one `cases[].when`.
- For `int` and `float` `state_fields`, the `formula` string parses
  against the closed [formula mini-language](#formula-mini-language).
- A `visual_states` entry for an `applies_to: subpart` `state_field` is
  itself `applies_to: subpart`.

### capabilities

- Every entry is in the closed six-value capability list: `clickable`,
  `contents_container`, `instrument_with_setpoint`, `structured_surface`,
  `cursor_attachable`, `decoration_only`.
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
  vocabulary; the scene names objects by `object_name`.
- [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) -- the scene YAML schema;
  scene placements consume the override surface this format declares.
- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) -- the protocol
  vocabulary, including the `ObjectStateChange` primitive that mutates
  declared object state.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) -- the protocol
  YAML schema; contents ids referenced by `contents_name` `state_fields`
  are declared in a contents registry.
- [LAYOUT_ENGINE.md](LAYOUT_ENGINE.md) -- the layout engine that
  consumes object-side layout hints.
- [LIQUID_CONVENTION.md](LIQUID_CONVENTION.md) -- the shared contents
  model that the contents `state_field` type and the `fill_height` formula
  token build on.
- [SVG_PIPELINE.md](SVG_PIPELINE.md) -- the SVG asset pipeline; the
  `visual_states` resolves to asset names the pipeline owns.
- [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md) -- ASCII-only and escaping
  rules for YAML and markdown.
