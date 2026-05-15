# Protocol YAML format

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

This document specifies the three-file YAML schema for a protocol.
The protocol is author-editable at build time, not at runtime.

## Design rationale

The protocol is authored in YAML and compiled at build time into TypeScript constants.
This separation achieves:

- **Editability**: a non-coder can edit YAML in a text editor without touching code.
- **Separation of concerns**: protocol logic (branching, validation) lives in TypeScript;
  protocol content (steps, wiring, reagent properties) lives in YAML.
- **Build-time compilation**: a Python 3.12 script `tools/build_protocol_data.py` reads
  the YAML files and emits typed TypeScript exports. No YAML parser ships in the browser.
  The browser consumes only the generated TS constants.
- **Single source of truth**: every step, every item, every interaction is declared once
  in YAML. Drift between the banner text, the highlights, and the click handlers cannot
  happen because they all read from the same generated data structure.

## Where YAML lives

Protocol YAML files are human-authored source content. They live under `content/<protocol_name>/` and are compiled at build time into generated TypeScript modules. Do not edit generated output files by hand; edit the YAML source files and rebuild.

## File locations

Protocol-specific YAML files are organized in subfolders under `content/`. Each
protocol is self-contained:

```
content/
  protocols/
    <protocol_name>/
      protocol.yaml     # protocol steps, parts, and days
      contents.yaml     # contents (reagents, liquids, cells, waste)
      scenes/
        <scene_name>.yaml
  objects/
    <object_name>.yaml
  scenes/
    <base_scene_name>.yaml
```

Each mini-protocol is self-contained under `content/protocols/<protocol_name>/`:

- `content/protocols/<protocol_name>/protocol.yaml`: protocol steps, parts, and days
- `content/protocols/<protocol_name>/contents.yaml`: contents definitions (reagents, liquids, cells, waste)
- `content/protocols/<protocol_name>/scenes/`: protocol-specific scene overrides

A Python generator at `tools/build_protocol_data.py` reads these files and emits two
TypeScript modules:

- `generated/protocol_data.ts`: exports `PROTOCOL_STEPS`, `PROTOCOL_PARTS`, `PROTOCOL_DAYS` (gitignored; re-exported by the `src/protocol.ts` facade)
- `generated/inventory_data.ts`: exports `EQUIPMENT` (item map) and `REAGENTS` (reagent map) (gitignored; re-exported by the `src/inventory.ts` facade)

### Multiple protocols

To support future protocols (e.g. western blot, flow cytometry), each protocol is a
self-contained subfolder under `content/protocols/`. At build time, specify the protocol:

```bash
python3 tools/build_protocol_data.py --protocol cell_culture
python3 tools/build_protocol_data.py --protocol western_blot  # future
```

The `--protocol` flag defaults to `cell_culture` if omitted. To add a new protocol,
copy `content/protocols/cell_culture/` to `content/protocols/<new_protocol_name>/`, edit the YAML files,
and rebuild.

## content/protocols/&lt;protocol_name&gt;/contents.yaml

The `contents.yaml` file defines the materials used in the protocol: reagents, liquids, cells, waste, mixtures, suspensions, and diluted drugs. Contents are materials currently inside or held by an object. A contents id is what an `ObjectStateChange` `scene_operation` writes into an object's flat declared `contents_name` (or `held_contents_name`) `state_field`.

### Contents block

Each contents entry is a mapping keyed by snake_case name. All fields required.

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Display name (shown in UI and step text) |
| `colorKey` | string | Internal identifier for color selection |
| `displayColor` | string | CSS hex color code (lowercase, ASCII-only) |

### Contents example

content/protocols/cell_culture/contents.yaml:
```yaml
contents:
  pbs:
    label: "1x PBS"
    colorKey: pbs
    displayColor: "#b8e5ff"

  media:
    label: "Complete media"
    colorKey: media
    displayColor: "#f7a6b8"
```

## content/protocols/&lt;protocol_name&gt;/protocol.yaml

Three top-level blocks: `parts`, `days`, and `steps`. Parts organize steps by lab workflow
part; days mark when each part runs. Steps are the runnable units of the protocol.

A required top-level `learning` block carries pedagogy metadata for every mini-protocol.

### Top-level protocol fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `protocol_type` | enum | yes | One of `mini_protocol`, `sequence_runner`, `dev_smoke`. See [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) Protocol kinds section. |
| `name` | string | yes | Stable snake_case identifier for the protocol. |
| `entry_step` | string | yes | Name of the first step the runtime runs. |
| `steps` | list | yes | List of authored step entries (omitted for `sequence_runner`). |

Example top of a mini-protocol `protocol.yaml`:

```yaml
protocol_type: mini_protocol
name: hood_flask_prep
entry_step: open_hood
```

### Learning block (required for mini-protocols)

Every mini-protocol must include a `learning` block that records the pedagogy
contract. All three sub-keys are required strings (one or two sentences each).
The block is authored metadata that documents what the mini-protocol teaches,
what students will be able to do afterward, and why the mini-protocol exists
in the broader curriculum.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `objectives` | string | For mini-protocols | Begins with "Students completing this mini-protocol will have achieved..." and states what students will gain fluency with. |
| `outcomes` | string | For mini-protocols | Begins with "Students completing this mini-protocol will be able to..." and states what students can do after completing the mini-protocol. |
| `goals` | string | For mini-protocols | Begins with "Overall, this mini-protocol aims to accomplish..." and states the broader purpose. |

Mini-protocols use the required prefixes shown above ("Students completing this mini-protocol..."). Sequence runners also carry a `learning` block scoped to the overall pathway; for sequence runners the prefix may use "Students completing this protocol..." to describe the complete student-facing pathway. Developer smoke protocols and internal diagnostic protocols are exempt from the `learning` block requirement. See [../PRIMARY_SPEC.md](../PRIMARY_SPEC.md) for the full learning-block schema.

### Entry block (required for mini-protocols)

The `entry` block declares where the protocol starts. It is required for every mini-protocol.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | string | yes | Scene id where the protocol begins. Must match the first authored step's `scene`. |
| `step` | string | yes | Step id of the first authored step. Must match the first step in the `steps` list. |

Example:

```yaml
entry:
  scene: well_plate_workspace
  step: open_plate_workspace
```

Validation rules: `entry.step` must be the id of the first authored step, and `entry.scene` must equal that step's `scene`. See [../PRIMARY_SPEC.md](../PRIMARY_SPEC.md) for full validation.

### Learning block example

Example (from `content/protocols/tutorial_plate_drug_additions/protocol.yaml`):

```yaml
learning:
  objectives: Students completing this mini-protocol will have achieved fluency with
    the OVCAR8 96-well plate map and the media-adjustment-before-drug ordering rule.
  outcomes: Students completing this mini-protocol will be able to dose a 96-well assay plate Day-2 unsupervised.
  goals: Overall, this mini-protocol aims to accomplish bridging the single-technique tutorials to the full OVCAR8 protocol.
```

### Parts block

List of part definitions (order matters for UI display).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique snake_case identifier |
| `label` | string | Display name (e.g. "Part 1: Split") |
| `dayId` | string | Reference to a day id below |

### Days block

List of day definitions (order matters for UI display).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique snake_case identifier (e.g. day1, day2, day4) |
| `label` | string | Display name (e.g. "Day 1") |

### Steps block

List of protocol steps. Order in this list is reading convenience only; the
actual protocol flow is `entry_step` plus each step's `next_step` pointer,
never array position.

#### Step fields

A `step` has six required slots, all defined in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Stable snake_case identifier for the step. Used for protocol flow, tests, and debugging. |
| `prompt` | string | yes | States what the student is asked to accomplish in this step. |
| `sequence` | list of interactions | yes | The ordered list of `interaction` blocks that make up the step; order always matters. |
| `step_validator` | mapping | yes | Named preset that checks whole-step completion. See "Validator presets". |
| `outcome` | mapping | yes | The `{on_success, on_failure}` mapping that says how the step resolves. |
| `next_step` | string or null | yes | The `name` of the next step, or `null` for a terminal step. The slot is always present. |

Optional step-level fields used for display only:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | string | no | Short display name shown in the protocol panel. |
| `why` | string | no | One-line rationale shown under the step card. |
| `part_name` | string | no | Reference to a part name in the parts block; UI grouping only. |
| `day_name` | string | no | Reference to a day name in the days block; UI grouping only. |
| `step_index` | number | no | 1-based display position within the part. Display order only; never controls flow. |
| `scene` | string | no | The scene this step's interactions happen in. |
| `details` | list of strings | no | Short strings rendered as a bulleted side panel beneath the prompt. |

## The interaction block

Each entry in a step's `sequence` is one `interaction` block. An
`interaction` has exactly four literal slots:

| Slot | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | string | yes | The semantic name of the scene object or control the student acts on. Geometry-free; the scene resolves the name. |
| `gesture` | string | yes | How the student acts on the target. One of `click`, `drag`, `adjust`, `select`, `type`. |
| `validator` | mapping | yes | Named preset that checks this one gesture on this one target. See "Validator presets". |
| `response` | mapping | yes | Container for post-validation behavior: `scene_operations` and optional `feedback`. |

There is no separate interaction task-type slot. The work a gesture does
is determined by the gesture plus the kind of target it lands on.

### The `response` container

A `response` has two fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `scene_operations` | list of mappings | yes (may be empty) | An ordered list of typed `scene_operation` primitives. Order matters; the runtime applies the list top to bottom. |
| `feedback` | mapping | no | Optional learner-facing messaging, structured into `correct` and `incorrect`. |

A `scene_operation` requires a `type` field naming one of the five
ratified protocol-level primitives (`ObjectStateChange`, `CursorAttach`,
`SceneChange`, `LayoutMove`, `TimedWait`) plus that type's documented
typed fields. The full per-primitive field list lives in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). `SvgSwap` and `ColorChange`
are reclassified out of the protocol-level set into the object/render layer.
`LiquidDisplayChange` and `SetPointDisplayChange` are reclassified the same way:
liquid and set-point state mutation are expressed through `ObjectStateChange`
against the object's flat declared fields, and the object's `visual_states`
resolves how they appear. The protocol writes semantic state through
`ObjectStateChange` and never names an SVG asset id, a color value, a liquid
display update, or a set-point display update. The PascalCase type names are
the only non-snake_case identifiers in protocol YAML.

### Validator presets

Every `validator` and every `step_validator` is a named preset with typed
parameters, written as a mapping:

```yaml
validator: { preset: <name>, ...typed params }
```

The initial preset library has five presets (three interaction presets,
two step presets); their names and required fields are specified in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). A validator is never
free-form prose and never an inline expression.

### The `outcome` mapping

`outcome` is a mapping with exactly two keys:

```yaml
outcome:
  on_success: complete
  on_failure: retry
```

`on_success: complete` resolves the step; flow then moves to `next_step`.
`on_failure: retry` restarts the whole step. The bare-scalar form
`outcome: complete` is rejected. `outcome` never advances the protocol --
that is `next_step`'s job.

## Domain verbs are authoring shorthand only

A domain verb (`wash`, `dispense`, `grind`, `assemble`, and so on) is
authoring vocabulary and documentation shorthand, not a protocol YAML
field. The executable YAML is always the expanded two-level model:
`step`, `sequence`, `target`, `gesture`, `validator`, `response`,
`scene_operations`, `step_validator`, `outcome`, `next_step`. This doc
documents the literal slot schema only and carries no domain-verb keys.
[PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md) teaches with
domain verbs, but every domain verb it shows includes its explicit
expansion to literal slots. A future plan may add domain-verb macros,
but only after the expanded form is stable.

## Plate maps and grouped targets

The protocol YAML is geometry-free: it names no plate, no well, no tube,
no row, and no coordinate. Subparts of a structured object (wells, lanes,
slots) are declared by the object via `structure.subparts`; see
[OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). A protocol addresses one
subpart as `<object_name>.<subpart_name>` (for example `treatment_plate.A1`).
Named groups are deferred from this vocabulary pass; a step that acts on
several subparts emits one interaction per subpart. Plate and tube
geometry lives on the object side; the protocol addresses subparts by
name only.

## Worked example: pbs_wash step

"Wash the flask with 4 mL PBS" is one step. It is the canonical
multi-gesture case, shown here as one step inside a `protocol`'s `steps`
list:

```yaml
protocol:
  name: cell_culture
  entry_step: pbs_wash
  steps:
    - name: pbs_wash
      prompt: "Wash the flask with 4 mL PBS."
      sequence:
        - target: serological_pipette
          gesture: click
          validator: { preset: correct_target }
          response:
            scene_operations:
              - type: CursorAttach
                target: serological_pipette
                operation: attach
        - target: pbs_bottle
          gesture: click
          validator: { preset: correct_target }
          response:
            scene_operations:
              - type: ObjectStateChange
                target: serological_pipette
                state:
                  held_contents_name: pbs
                  held_contents_volume: 4
            feedback:
              correct: PBS loaded.
              incorrect: Use the PBS bottle.
        - target: flask
          gesture: click
          validator: { preset: correct_target }
          response:
            scene_operations:
              - type: ObjectStateChange
                target: serological_pipette
                state:
                  held_contents_name: null
                  held_contents_volume: 0
              - type: ObjectStateChange
                target: flask
                state:
                  contents_name: pbs
                  contents_volume: 4
      step_validator:
        preset: final_state_matches
        target: flask
        contains:
          contents_name: pbs
          contents_volume: 4
      outcome:
        on_success: complete
        on_failure: retry
      next_step: add_trypsin
```

### Step anatomy

- **Prompt** (`prompt`): the single thing the student is asked to
  accomplish in the step.
- **Sequence** (`sequence`): the ordered list of `interaction` blocks. Each
  is one `gesture` on one `target` with its own `validator` and `response`.
  Order always matters.
- **Interaction slots**: every interaction carries exactly `target`,
  `gesture`, `validator`, and `response`. There is no tool-first click
  field and no source or destination slot; the target's kind plus the
  gesture carries the task semantics.
- **Response** (`response`): `scene_operations` (an ordered list of typed
  primitives, possibly empty) plus optional `feedback`. State change is
  explicit in `scene_operation` mutations only.
- **Step validator** (`step_validator`): a named preset that checks
  whole-step completion after every interaction in the `sequence` has
  fired.
- **Outcome** (`outcome`): the `{on_success, on_failure}` mapping that
  resolves the step or restarts it.
- **Next step** (`next_step`): names the next step by its `name`, or
  `null` to mark a terminal step.

## Cross-file validation rules

The build process (`tools/build_protocol_data.py`) enforces these rules:

### Protocol structure

- Every step `name` is unique and snake_case.
- `entry_step` names a declared step. `next_step` names a declared step or
  is `null`. Exactly one step has `next_step: null` (the terminal step).
- Walking `next_step` from `entry_step` visits every step (no orphans).
- `part_name` and `day_name`, when present, reference declared `parts` and
  `days`.
- `scene`, when present, names a declared scene.

### Interaction validation

- Every `interaction` carries exactly the four slots `target`, `gesture`,
  `validator`, and `response`.
- Every `target` value resolves to a scene object or to a declared subpart
  of a structured object (`<object_name>.<subpart_name>`) through the scene's
  adapter registry; see [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) and
  [OBJECT_VOCABULARY.md](OBJECT_VOCABULARY.md). Named groups are deferred;
  explicit subparts only.
- `gesture` is one of `click`, `drag`, `adjust`, `select`, `type`.
- `validator` and `step_validator` each name a preset from the documented
  preset library, with that preset's required typed parameters.
- `response.scene_operations` is a list (possibly empty); every entry has a
  `type` naming one of the five ratified protocol-level `scene_operation`
  primitives (`SvgSwap`, `ColorChange`, `LiquidDisplayChange`, and
  `SetPointDisplayChange` have been moved to the object/render layer) plus
  that type's documented typed fields.

### Outcome validation

- Every `step` has an `outcome` mapping with exactly the keys `on_success`
  and `on_failure`. The bare-scalar form `outcome: complete` is rejected.

### Asset validation

- Every item with an `asset` field has a corresponding file in
  `assets/equipment/<asset>.svg`. Items with `role: virtual_target` may omit `asset`.

### Hygiene rules

- ASCII-only across all YAML. UTF-8 glyphs escaped per [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md)
  (e.g. `&alpha;`, `&micro;`).
- Every contents entry in contents.yaml must be referenced by at least one
  `scene_operation` (an `ObjectStateChange` writing the contents name into
  an object's flat `contents_name` or `held_contents_name` `state_field`; the
  field's declared `enum` `allowed` list is the binding reference). Catches dead contents.

## Generated TypeScript surface

This section describes the TypeScript the builder emits today. The
generated identifiers below are runtime output keys, not protocol YAML
keys; the canonical YAML schema authors write is the two-level model
documented above.

The Python builder (`tools/build_protocol_data.py`) compiles YAML into two
TypeScript modules at `generated/` (gitignored; consumed via the authored
facades `src/protocol.ts` and `src/inventory.ts`):

### generated/protocol_data.ts

```typescript
export const PROTOCOL_STEPS: readonly ProtocolStep[] = [
  // auto-generated from src/content/cell_culture/protocol.yaml
  { id: 'spray_hood', label: '...', ... },
  { id: 'gather_supplies', label: '...', ... },
  // ... remaining steps ...
];

export const PROTOCOL_PARTS: readonly Record<string, ProtocolPart> = {
  // keyed by part id
  part1_split: { id: 'part1_split', label: 'Part 1: Split', dayId: 'day1' },
  // ...
};

export const PROTOCOL_DAYS: readonly Record<string, ProtocolDay> = {
  // keyed by day id
  day1: { id: 'day1', label: 'Day 1' },
  // ...
};
```

### generated/inventory_data.ts

```typescript
export const EQUIPMENT: readonly Record<string, InventoryItem> = {
  // keyed by item id
  serological_pipette: { label: 'Serological pipette', role: 'transfer_tool', ... },
  // ...
};

export const REAGENTS: readonly Record<string, InventoryReagent> = {
  // keyed by reagent id
  pbs: { label: '1x PBS', colorKey: 'pbs', displayColor: '#b8e5ff' },
  // ...
};
```

Scene code imports and consumes these exports directly; no YAML parsing happens
at runtime. The generated types are read-only arrays and records, enforcing
immutability at compile time.

## Stable-id discipline

Every cross-reference uses snake_case ids, never display labels. Labels are free to
change without breaking the build; ids are durable.

## Contents reference model

Contents entries are referenced in protocol steps through `ObjectStateChange`
`scene_operations`. An `ObjectStateChange` targeting an object or subpart
writes contents names into the object's flat liquid `state_fields`
(`contents_name`, `held_contents_name`):

```yaml
- type: ObjectStateChange
  target: serological_pipette
  state:
    held_contents_name: pbs
    held_contents_volume: 4
```

The builder verifies that every contents name written by an `ObjectStateChange`
is declared in the protocol's `contents.yaml` file.

## See also

- [../REPO_STYLE.md](../REPO_STYLE.md) for repository conventions
- [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md) for ASCII-only and escaping rules
- [AGENTS.md](../../AGENTS.md) for agent guidelines on YAML authoring
