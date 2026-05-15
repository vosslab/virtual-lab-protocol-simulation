# Protocol YAML format

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

This document specifies the three-file YAML schema for a protocol.
The protocol is author-editable at build time, not at runtime.

## Target-state vs current-code

This doc has two kinds of sections, labeled like
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md):

- **target-state** -- the ratified two-level interaction schema: a
  `protocol` of `step` blocks, each wrapping an ordered `sequence` of
  `interaction` blocks with the four literal slots `target`, `gesture`,
  `validator`, `response`. This is the schema authors write going
  forward. The model is ratified; the runtime, builder, and shipped YAML
  do not implement it yet.
- **current-code** -- the `items.yaml` and `reagents.yaml` build inputs
  and the build pipeline as they run today.

If a section is not labeled current-code, treat it as target-state. The
retired `completionPath.kind` taxonomy, `plateTargets`, `tubeTargets`,
`stateChange`, `completionEvent`, `completionTrigger`, `nextId`, and the
overloaded `action` field are not part of this schema; see the
retired-terms table in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

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

Protocol YAML files are human-authored source content. They live under `src/content/<protocol_name>/` because the build treats them as app source inputs and compiles them into generated TypeScript modules under `generated/` (gitignored). Do not edit `generated/protocol_data.ts` or `generated/inventory_data.ts` by hand; runtime callers consume them via the authored facades `src/protocol.ts` and `src/inventory.ts`. Edit the YAML files and rebuild.

## File locations

Protocol-specific YAML files are organized in subfolders under `src/content/`. Each
protocol is self-contained:

```
src/content/
  <protocol_name>/
    items.yaml        # item definitions
    reagents.yaml     # reagent definitions
    protocol.yaml     # protocol steps, parts, and days
```

Each mini-protocol is self-contained under `src/content/<protocol_name>/`:

- `src/content/<protocol_name>/items.yaml`: item definitions
- `src/content/<protocol_name>/reagents.yaml`: reagent definitions
- `src/content/<protocol_name>/protocol.yaml`: protocol steps, parts, and days

A Python generator at `tools/build_protocol_data.py` reads these files and emits two
TypeScript modules:

- `generated/protocol_data.ts`: exports `PROTOCOL_STEPS`, `PROTOCOL_PARTS`, `PROTOCOL_DAYS` (gitignored; re-exported by the `src/protocol.ts` facade)
- `generated/inventory_data.ts`: exports `EQUIPMENT` (item map) and `REAGENTS` (reagent map) (gitignored; re-exported by the `src/inventory.ts` facade)

### Multiple protocols

To support future protocols (e.g. western blot, flow cytometry), each protocol is a
self-contained subfolder under `src/content/`. At build time, specify the protocol:

```bash
python3 tools/build_protocol_data.py --protocol cell_culture
python3 tools/build_protocol_data.py --protocol western_blot  # future
```

The `--protocol` flag defaults to `cell_culture` if omitted. To add a new protocol,
copy `src/content/cell_culture/` to `src/content/<new_protocol_name>/`, edit the YAML files,
and rebuild.

## src/content/&lt;protocol_name&gt;/items.yaml and src/content/&lt;protocol_name&gt;/reagents.yaml

Status: **current-code.**

Two YAML files handle items and reagents separately. Namespaces are disjoint:
item ids appear in layout, reagent ids appear in liquid state. An item id is
what a step `interaction` names as its `target`; a reagent id is what a
`LiquidDisplayChange` `scene_operation` names as its `liquid`.

### Items block

Each item is a mapping keyed by snake_case id. Required fields vary by role.

#### Item fields (all items)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | string | yes | Display name (shown in UI) |
| `role` | string | yes | Item category; must be one of the closed set below |
| `scene` | string | yes | Where the item lives: `cell_culture_hood`, `bench`, `overlay`, `virtual`, or `none` |

#### Item fields (optional by role)

| Field | Type | When required | Description |
| --- | --- | --- | --- |
| `asset` | string | when `scene` != `virtual` and `scene` != `none` | SVG asset basename in `assets/equipment/` (no .svg). |
| `liquidCapable` | boolean | items that hold liquid | whether the item can be filled/emptied |
| `capacityMl` | number | if `liquidCapable: true` | max volume in mL |
| `allowedLiquids` | array of strings | if `liquidCapable: true` | list of reagent ids that can be stored (e.g. `[media, pbs, trypsin]`) |
| `contains` | string | reagent sources only | reagent id currently inside (e.g. `pbs_bottle` contains `pbs`) |
| `containsAny` | array of strings | when `contains` is insufficient | reagent ids that might be inside (future use) |
| `visualOnly` | boolean | decoration items | if `true`, exempts the item from "must be referenced by a step" validation rule |

#### Role vocabulary (closed set, validated)

- `transfer_tool`: a pipette used to move liquid (serological, multichannel)
- `aspirate_tool`: a pipette used to draw off liquid (aspirating pipette)
- `reagent_source`: a bottle or vial holding a reagent (media_bottle, pbs_bottle)
- `culture_vessel`: a multi-well plate (well_plate_24, etc.)
- `cell_container`: a tissue culture vessel (flask)
- `waste_target`: a disposal container (waste_container)
- `instrument`: bench equipment (centrifuge, incubator)
- `modal_tool`: an item used only inside a modal (mtt_vial)
- `virtual_target`: a documentation marker for items that are not addressable scene objects. **virtual_target items must not be named as an interaction `target`.**
- `decoration`: visual-only non-interactive item (professor, glove_box)

#### Scene vocabulary (closed set, required)

- `cell_culture_hood`: item renders in the cell culture hood scene
- `bench`: item renders in the bench scene
- `overlay`: persistent UI overlay (reserved for professor card)
- `virtual`: no scene rendering; used only in interaction targets
- `none`: modal-only item; never rendered in a 2D scene

Note (no-hood-default rule): a mini-protocol may not declare `entry.scene: cell_culture_hood` unless its first authored step is also in the cell culture hood. The pytest gate `tests/test_items_scene_no_hood_default.py` enforces this. Full rewrite of scene-vocabulary rules is deferred to M9.

### Reagents block

Each reagent is a mapping keyed by snake_case id. All fields required.

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Display name (shown in UI and step text) |
| `colorKey` | string | Internal identifier for color selection (legacy field, see note) |
| `displayColor` | string | CSS hex color code (lowercase, ASCII-only) |

Note: `colorKey` is a legacy field. It is in the retired-terms table in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) and is slated for removal by
the follow-on code-migration plan. It is still accurate for current `reagents.yaml`;
target-state expresses reagent color via a `LiquidDisplayChange` scene_operation.

### Items and reagents example

src/content/cell_culture/items.yaml:
```yaml
items:
  serological_pipette:
    label: "Serological pipette"
    role: transfer_tool
    asset: sero_pipette
    scene: cell_culture_hood
    liquidCapable: true
    capacityMl: 10
    allowedLiquids: [media, pbs, trypsin, cells]

  pbs_bottle:
    label: "PBS bottle"
    role: reagent_source
    asset: pbs_bottle
    scene: cell_culture_hood
    liquidCapable: true
    contains: pbs

  hood_surface:
    label: "Hood work surface"
    role: virtual_target
    scene: virtual

  professor:
    label: "Professor"
    role: decoration
    asset: angry_professor
    scene: overlay
    visualOnly: true
```

src/content/cell_culture/reagents.yaml:
```yaml
reagents:
  pbs:
    label: "1x PBS"
    colorKey: pbs
    displayColor: "#b8e5ff"

  media:
    label: "Complete media"
    colorKey: media
    displayColor: "#f7a6b8"
```

## src/content/&lt;protocol_name&gt;/protocol.yaml

Three top-level blocks: `parts`, `days`, and `steps`. Parts organize steps by lab workflow
part; days mark when each part runs. Steps are the runnable units of the protocol.

A required top-level `learning` block carries pedagogy metadata for every mini-protocol.

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

Mini-protocols use the required prefixes shown above ("Students completing this mini-protocol..."). Sequence runners also carry a `learning` block scoped to the overall pathway; for sequence runners the prefix may use "Students completing this protocol..." to describe the complete student-facing pathway. Developer smoke protocols and internal diagnostic protocols are exempt from the `learning` block requirement. See [PRIMARY_SPEC.md](PRIMARY_SPEC.md) for the full learning-block schema.

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

Validation rules: `entry.step` must be the id of the first authored step, and `entry.scene` must equal that step's `scene`. See [docs/PRIMARY_SPEC.md](PRIMARY_SPEC.md) for full validation.

### Learning block example

Example (from `src/content/tutorial_plate_drug_additions/protocol.yaml`):

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

Status: **target-state.**

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
| `part_id` | string | no | Reference to a part id in the parts block; UI grouping only. |
| `day_id` | string | no | Reference to a day id in the days block; UI grouping only. |
| `step_index` | number | no | 1-based display position within the part. Display order only; never controls flow. |
| `scene` | string | no | The scene this step's interactions happen in. |
| `details` | list of strings | no | Short strings rendered as a bulleted side panel beneath the prompt. |

The retired `action`, `requiredItems`, `usedItems`, `completionPath`,
`completionTrigger`, and `nextId` step fields are not part of this schema.
`action` is replaced by `prompt`; `nextId` is replaced by `next_step`;
the `completionPath` wrapper is replaced by the `sequence`,
`step_validator`, `outcome`, and `next_step` slots; `requiredItems` and
`usedItems` are derived from the `sequence`'s `target` slots.

## The interaction block

Status: **target-state.**

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

A `scene_operation` requires a `type` field naming one of the eight
ratified primitives (`SvgSwap`, `ColorChange`, `CursorAttach`,
`SceneChange`, `LayoutMove`, `LiquidDisplayChange`,
`SetPointDisplayChange`, `TimedWait`) plus that type's documented typed
fields. The full per-primitive field list lives in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The PascalCase type
names are the only non-snake_case identifiers in protocol YAML.

### Validator presets

Status: **target-state.**

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

Status: **target-state.**

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

Status: **target-state.**

The protocol YAML is geometry-free: it names no plate, no well, no tube,
no row, and no coordinate. A step that treats a row of wells writes one
semantic `target` name (for example `target: row_b`); the scene YAML owns
the named group that the name expands to. See the `target_groups` schema
in [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md) and the scene-vs-protocol
boundary section of [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). The
retired `plateTargets` and `tubeTargets` fields pushed plate and tube
geometry into protocol YAML; the named-group mechanism pulls it back to
the scene side where it belongs.

## Worked example: pbs_wash step

Status: **target-state.**

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
              - type: LiquidDisplayChange
                target: serological_pipette
                liquid: pbs
                volume_ml: 4
                operation: hold
            feedback:
              correct: PBS loaded.
              incorrect: Use the PBS bottle.
        - target: flask
          gesture: click
          validator: { preset: correct_target }
          response:
            scene_operations:
              - type: LiquidDisplayChange
                target: serological_pipette
                liquid: pbs
                volume_ml: 0
                operation: set
              - type: LiquidDisplayChange
                target: flask
                liquid: pbs
                volume_ml: 4
                operation: add
      step_validator:
        preset: final_state_matches
        target: flask
        contains:
          liquid: pbs
          volume_ml: 4
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

Status: **target-state.**

The build process (`tools/build_protocol_data.py`) enforces these rules:

### Protocol structure

- Every step `name` is unique and snake_case.
- `entry_step` names a declared step. `next_step` names a declared step or
  is `null`. Exactly one step has `next_step: null` (the terminal step).
- Walking `next_step` from `entry_step` visits every step (no orphans).
- `part_id` and `day_id`, when present, reference declared `parts` and
  `days`.
- `scene`, when present, names a declared scene.

### Interaction validation

- Every `interaction` carries exactly the four slots `target`, `gesture`,
  `validator`, and `response`.
- Every `target` value resolves to a scene object or a named group through
  the scene's adapter registry and `target_groups` (see
  [SCENE_YAML_FORMAT.md](SCENE_YAML_FORMAT.md)).
- `gesture` is one of `click`, `drag`, `adjust`, `select`, `type`.
- `validator` and `step_validator` each name a preset from the documented
  preset library, with that preset's required typed parameters.
- `response.scene_operations` is a list (possibly empty); every entry has a
  `type` naming one of the eight ratified `scene_operation` primitives plus
  that type's documented typed fields.

### Outcome validation

- Every `step` has an `outcome` mapping with exactly the keys `on_success`
  and `on_failure`. The bare-scalar form `outcome: complete` is rejected.

### Asset validation

- Every item with an `asset` field has a corresponding file in
  `assets/equipment/<asset>.svg`. Items with `role: virtual_target` may omit `asset`.

### Hygiene rules

- ASCII-only across all YAML. UTF-8 glyphs escaped per [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md)
  (e.g. `&alpha;`, `&micro;`).
- Every item in items.yaml must be referenced by at least one step (as an
  interaction `target`) OR have `visualOnly: true`. Catches dead inventory.
- Every reagent in reagents.yaml must be referenced by at least one
  `scene_operation` (a `LiquidDisplayChange` `liquid`) or item `contains`
  field. Catches dead reagents.

## Generated TypeScript surface

Status: **current-code.**

This section describes the TypeScript the builder emits today. The
generated identifiers below are runtime output keys, not protocol YAML
keys; the target-state YAML schema authors write is the two-level model
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

## Item vs reagent namespace

The two namespaces are intentionally disjoint:

- **Only item ids** appear as interaction `target` values, in scene layout,
  and in asset specs.
- **Only reagent ids** appear in a `LiquidDisplayChange` `liquid` field and
  in item `contains` fields.
- A `LiquidDisplayChange` `scene_operation` references both an item id and a
  reagent id: `target: serological_pipette` (item id) plus `liquid: pbs`
  (reagent id). The builder verifies that a source item's `contains` matches
  the liquid id it is drawn for.

This prevents accidental name collisions and catches copy-paste errors at build time.

## See also

- [docs/REPO_STYLE.md](REPO_STYLE.md) for repository conventions
- [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md) for ASCII-only and escaping rules
- [AGENTS.md](../AGENTS.md) for agent guidelines on YAML authoring
