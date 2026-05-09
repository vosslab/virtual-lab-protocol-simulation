# Protocol YAML format

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

This document specifies the three-file YAML schema for the Cell Culture Game protocol.
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

Protocol YAML files are human-authored source content. They live under `src/content/<protocol_name>/` because the build treats them as app source inputs and compiles them into generated TypeScript modules in `src/content/`. Do not edit `src/content/protocol_data.ts` or `src/content/inventory_data.ts` by hand. Edit the YAML files and rebuild.

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

The active protocol is `cell_culture`:

- `src/content/cell_culture/items.yaml`: item definitions
- `src/content/cell_culture/reagents.yaml`: reagent definitions
- `src/content/cell_culture/protocol.yaml`: protocol steps, parts, and days

A Python generator at `tools/build_protocol_data.py` reads these files and emits two
TypeScript modules:

- `src/content/protocol_data.ts`: exports `PROTOCOL_STEPS`, `PROTOCOL_PARTS`, `PROTOCOL_DAYS`
- `src/content/inventory_data.ts`: exports `EQUIPMENT` (item map) and `REAGENTS` (reagent map)

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

Two YAML files handle items and reagents separately. Namespaces are disjoint:
item ids appear in layout, reagent ids appear in liquid state. Both can appear in
interaction blocks.

### Items block

Each item is a mapping keyed by snake_case id. Required fields vary by role.

#### Item fields (all items)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | string | yes | Display name (shown in UI) |
| `role` | string | yes | Item category; must be one of the closed set below |
| `scene` | string | yes | Where the item lives: `hood`, `bench`, `overlay`, `virtual`, or `none` |

#### Item fields (optional by role)

| Field | Type | When required | Description |
| --- | --- | --- | --- |
| `asset` | string | when `scene` != `virtual` and `scene` != `none` | SVG asset basename in `assets/equipment/` (no .svg). This is distinct from the legacy ASSET_SPECS lookup key in `src/hood_config.ts`. M1.C reconciles the two namespaces at build time. |
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
- `virtual_target`: a documentation marker for items that are not interactive click targets. **virtual_target items must not be used as `interaction.destination`.** Use a direct tool interaction instead.
- `decoration`: visual-only non-interactive item (professor, glove_box)

#### Scene vocabulary (closed set, required)

- `hood`: item renders in the hood scene
- `bench`: item renders in the bench scene
- `overlay`: persistent UI overlay (reserved for professor card)
- `virtual`: no scene rendering; used only in interaction targets
- `none`: modal-only item; never rendered in a 2D scene

### Reagents block

Each reagent is a mapping keyed by snake_case id. All fields required.

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Display name (shown in UI and step text) |
| `colorKey` | string | Internal identifier for color selection |
| `displayColor` | string | CSS hex color code (lowercase, ASCII-only) |

### Items and reagents example

src/content/cell_culture/items.yaml:
```yaml
items:
  serological_pipette:
    label: "Serological pipette"
    role: transfer_tool
    asset: sero_pipette
    scene: hood
    liquidCapable: true
    capacityMl: 10
    allowedLiquids: [media, pbs, trypsin, cells]

  pbs_bottle:
    label: "PBS bottle"
    role: reagent_source
    asset: pbs_bottle
    scene: hood
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

List of protocol steps. Order in this list is for convenience; the actual execution order
is determined by `nextId` linked-list pointers, not by array position.

#### Step fields (all steps)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Unique snake_case identifier |
| `label` | string | yes | Short display name (shown in UI) |
| `action` | string | yes | Imperative phrase (e.g. "Wash cells with 4 mL PBS") |
| `why` | string | yes | Rationale for the step (shown as professor feedback) |
| `partId` | string | yes | Reference to a part id in the parts block |
| `dayId` | string | yes | Reference to a day id in the days block |
| `stepIndex` | number | yes | 1-based position within the part |
| `scene` | string | yes | Where this step's interactions happen: `hood`, `bench`, `incubator`, `microscope`, or `plate_reader` |
| `requiredItems` | array of strings | yes | Item ids that must be available (shown in step card) |
| `usedItems` | array of strings | generated (not authored) | Derived item summary: items appearing in the step's interaction sequence, in first-use order (tool, source, destination). Required in generated TypeScript; never written in author YAML. |
| `completionPath` | object | yes | The completion path for this step. Carries a `kind` discriminator and the kind-specific fields. See "Completion paths" section below. |
| `completionTrigger` | object | derived (build-time), do not author | Step-level listener that maps a scene completion event to step completion. The builder synthesizes this from `step.scene` and `step.completionPath` (see "Derived fields"). Author YAML must NOT include this field; the validator rejects author-written `completionTrigger`. |
| `nextId` | string or null | yes | Id of the next step, or `null` if this is the final step |
| `errorHints` | map of strings | no | Feedback messages keyed by error type (e.g. `wrong_tool`, `volume_off`) |

## Completion paths

Every step has exactly one `completionPath`. The path's `kind` discriminator
selects which schema fields apply. The walker, runtime, and validator all
dispatch off `kind`; nothing downstream matches on `step.id`.

### Why every step has a completion path

Earlier schema iterations assumed every step advanced via an
`interactionSequence`. That model fits liquid-transfer steps cleanly, but it
forces modal-driven steps (the drug-treatment modal, the MTT modal) and
instrument-control steps (incubator door, water bath toggle, plate-reader
controls) into fake `tool`/`source`/`destination` rows that lie about what
the player actually does. Direct-tool steps such as `spray_hood` were already
informally outside the liquid-transfer shape.

Different step shapes deserve different schemas. The `completionPath`
contract makes the shape explicit at the YAML layer instead of hiding it
behind narrowly-typed fields the runtime had to interpret. Authors choose a
`kind` that matches the player experience; the validator and walker enforce
the rest.

The three allowed kinds are:

| Kind | Use when the player |
| --- | --- |
| `interactionSequence` | performs an ordered click flow (load liquid then discharge, etc.) |
| `directTool` | clicks one item once to complete the step (covers both hand tools like ethanol spray and instrument controls like incubator door, water bath, plate-reader scan button) |
| `modal` | opens a modal scene and clicks an advance control inside it |

The `directTool` kind covers what older drafts split into "direct tool" and
"instrument" kinds. Mechanically the two cases are identical: one click on an
item id with one completion event. The conceptual difference between a hand
tool and an instrument is carried by the item's `role` in `items.yaml`, not by
a separate completion-path kind.

### Kind: `interactionSequence`

Use for liquid-transfer flows and any step that advances via an ordered
sequence of tool clicks. This kind preserves the existing interaction-list
schema; only the wrapping has changed.

Required fields under `completionPath`:

| Field | Type | Description |
| --- | --- | --- |
| `kind` | string | Must be `interactionSequence` |
| `interactions` | list of objects | Ordered list of interactions; see "Interaction object structure" below |

Banned fields under `completionPath` for this kind: `tool`, `openClick`,
`advanceClick`. Those belong to other kinds.

Worked YAML example:

```yaml
- id: pbs_wash
  label: "Wash cells with 4 mL PBS"
  scene: hood
  requiredItems: [flask, pbs_bottle, serological_pipette]
  completionPath:
    kind: interactionSequence
    interactions:
      - tool: serological_pipette
        source: pbs_bottle
        liquid: pbs
        stateChange:
          heldLiquid:
            tool: serological_pipette
            liquid: pbs
            volumeMl: 4
            colorKey: pbs
      - tool: serological_pipette
        destination: flask
        liquid: pbs
        consumesVolumeMl: 4
        completionEvent: pbs_wash
  nextId: add_trypsin
```

The builder derives `step.completionTrigger` at build time from
`step.scene` and the final interaction's `completionEvent`. Authors do not
write `completionTrigger`; see "Derived fields" below.

Walker contract: the walker iterates `completionPath.interactions` in order.
For each interaction it clicks the `tool` first, then any `source` or
`destination`, waits for progress, and advances `interactionIndex`. The
final interaction's `completionEvent` completes the step.

### Kind: `directTool`

Use for one-click steps performed by clicking a single item directly. This
kind covers both hand-tool steps (for example, spraying ethanol with a
spray bottle) and instrument-control steps (for example, closing the
incubator door, starting the water bath, pressing the plate-reader scan
button). The conceptual difference between a hand tool and an instrument
is carried by `items.yaml` role; the completion-path schema is the same.

Required fields under `completionPath`:

| Field | Type | Description |
| --- | --- | --- |
| `kind` | string | Must be `directTool` |
| `tool` | string | Item id of the tool or instrument control the player clicks |
| `completionEvent` | string | Completion event emitted when the click registers |

Banned fields under `completionPath` for this kind: `interactions`, `source`,
`destination`, `openClick`, `advanceClick`.

Worked YAML example (hand tool):

```yaml
- id: spray_hood
  label: "Spray the hood with 70% ethanol"
  scene: hood
  requiredItems: [ethanol_bottle]
  completionPath:
    kind: directTool
    tool: ethanol_bottle
    completionEvent: spray_ethanol
  nextId: gather_supplies
```

Worked YAML example (instrument control):

```yaml
- id: incubate_48h
  label: "Place the plate in the incubator"
  scene: incubator
  requiredItems: [incubator]
  completionPath:
    kind: directTool
    tool: incubator
    completionEvent: incubate_48h
  nextId: read_plate
```

Walker contract: the walker resolves `completionPath.tool` to a single
visible item and clicks it once. The completion event fires; the step
completes. There is no `interactionIndex` and no source/destination click.

### Kind: `modal`

Use for steps completed through a modal scene. The player clicks an item
to open the modal, then clicks an advance control inside the modal that
emits the completion event.

Required fields under `completionPath`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | string | yes | Must be `modal` |
| `openClick` | string | no | Item id (declared in `items.yaml`) whose click opens the modal. Modal openers ARE protocol items (e.g., `well_plate`). **Optional**: if omitted, the modal is assumed to be already open from the previous step's completion event (used in split hybrid steps where setup is `interactionSequence` and confirm is `modal`). |
| `advanceClick` | string | yes | Kebab-case string that matches a `data-walker-advance="<string>"` attribute on a DOM control inside the modal scene. NOT an `items.yaml` id; modal-internal advance buttons are UI controls, not protocol items. |
| `completionEvent` | string | yes | Completion event emitted when the advance click registers |

Banned fields under `completionPath` for this kind: `interactions`, `tool`,
`source`, `destination`.

Worked YAML example (direct modal):

```yaml
- id: add_mtt
  label: "Add MTT reagent to each well"
  scene: bench
  requiredItems: [well_plate, mtt_vial]
  completionPath:
    kind: modal
    openClick: well_plate
    advanceClick: mtt-modal-advance
    completionEvent: add_mtt
  nextId: incubate_mtt
```

Worked YAML example (split hybrid step - modal without openClick):

```yaml
- id: add_carboplatin_setup
  completionPath:
    kind: interactionSequence
    interactions:
      - tool: multichannel_pipette
        source: dilution_tube_rack
      - tool: multichannel_pipette
        destination: well_plate
        completionEvent: add_carboplatin_modal_open
  nextId: add_carboplatin_confirm

- id: add_carboplatin_confirm
  completionPath:
    kind: modal
    advanceClick: drug-modal-advance
    completionEvent: carb-add-confirm
  nextId: add_metformin_setup
```

The matching DOM control inside the modal scene file:

```html
<!-- in the drug modal scene file -->
<button data-walker-advance="drug-modal-advance">Apply Drug</button>
```

Walker contract for modal with openClick: the walker clicks `openClick`, waits for the modal scene to appear, then clicks the element whose `data-walker-advance` attribute equals the `advanceClick` string. The advance click emits `completionEvent` and completes the step.

Walker contract for modal without openClick: the walker assumes the modal is already open (from the prior step's completion event). It waits for the element whose `data-walker-advance` attribute equals `advanceClick` to appear, clicks it, and the step completes.

#### Split hybrid steps: setup + confirm pattern

Complex steps that involve both a scene interaction sequence AND a modal confirmation are split into two consecutive steps:

1. A setup step with `kind: interactionSequence` that builds up the required state (e.g., loading a tool, selecting sources and destinations) and emits a completion event indicating the modal is ready to open.
2. A confirm step with `kind: modal` (with no `openClick`, since the modal is already open) that clicks the advance button to finalize the step.

This pattern avoids hybrid steps and keeps the dispatch logic schema-driven with no special cases.

#### Multi-step modals decompose into multiple modal steps

`advanceClick` is a single string, not a list. If a modal needs multiple
meaningful confirmations, the protocol declares multiple modal steps, each
with the same `openClick`, a different `advanceClick` string, and its own
`completionEvent`:

```yaml
- id: mtt_phase_one
  completionPath:
    kind: modal
    openClick: well_plate
    advanceClick: mtt-modal-confirm-strain
    completionEvent: mtt_phase_one
- id: mtt_phase_two
  completionPath:
    kind: modal
    openClick: well_plate
    advanceClick: mtt-modal-confirm-volume
    completionEvent: mtt_phase_two
```

This keeps every step's completion path self-contained: one open click, one
advance click, one completion event.

### Validator behavior

The validator (Rule 8) enforces:

- `completionPath` is present on every step. Steps that omit it fail.
- `completionPath.kind` is one of `interactionSequence`, `directTool`, or
  `modal`. Any other value (including the now-removed `instrument`) fails.
- For each kind, the kind-specific required fields are present and the
  banned fields are absent. Mixing fields across kinds fails.
- For `kind: interactionSequence`, the existing rules continue to apply to
  `completionPath.interactions`: tool-first click model, load-before-
  discharge ordering, completion-event placement on the final interaction
  only, volume sanity against `capacityMl`, item-ref resolution against
  `items.yaml`, no `virtual_target` as `destination`.
- For `kind: directTool`, the referenced `tool` exists in `items.yaml`.
  The same kind serves both hand-tool and instrument-control steps; role
  appropriateness is checked against `items.yaml`.
- For `kind: modal`, the referenced `openClick` item exists in
  `items.yaml`. `advanceClick` is validated by string presence: the
  validator confirms the field is a non-empty kebab-case string AND that
  a matching `data-walker-advance="<string>"` attribute exists somewhere
  in the built UI (or in a declared modal-control registry, however the
  scene code surfaces modal advance controls). The check is by string
  presence (existence in the modal-control registry or grep over scene
  `.ts` files), not by item-id resolution.
- Author-written `step.completionTrigger` is rejected. Authors MUST NOT
  write `completionTrigger` in YAML; the builder synthesizes it (see
  "Derived fields" below).

### Derived fields

The builder synthesizes a small set of step fields at build time. Author
YAML MUST NOT include these fields; the validator rejects YAML that writes
them by hand.

| Derived field | How the builder synthesizes it |
| --- | --- |
| `step.usedItems` | De-duplicated, first-use-ordered list of every `tool`, `source`, and `destination` referenced in the step's interaction sequence. |
| `step.completionTrigger` | Object with `scene` (copied from `step.scene`) and `completionEvent` (copied from `step.completionPath.completionEvent`). For `kind: interactionSequence`, the `completionEvent` is the one declared on the final interaction in `completionPath.interactions`; the validator already enforces "exactly one completionEvent per step" on the final interaction. |

In TypeScript pseudocode the builder synthesis for the trigger is:

```ts
step.completionTrigger = {
    scene: step.scene,
    completionEvent: step.completionPath.completionEvent
};
```

These fields appear in the generated TypeScript surface (`protocol_data.ts`)
because runtime code consumes them, but they are not part of the author
YAML schema. Writing them in author YAML is a validation error.

### Migration status

The K2 migration completed in Patch 2 (see SP-K2g in
[CHANGELOG.md](CHANGELOG.md)). All protocols
(`src/content/cell_culture/protocol.yaml` plus every tutorial protocol
under `src/content/tutorial_*/`) carry `completionPath` on every step,
and the runtime, walker, and validator dispatch on `completionPath.kind`
exclusively. The legacy top-level `step.interactionSequence` field has
been removed from the runtime types; YAML that uses it fails Rule 8.

#### Step fields (interaction-driven steps)

Steps with `completionPath.kind: interactionSequence` carry their ordered
interaction list at `completionPath.interactions`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `completionPath.interactions` | list of objects | when `kind: interactionSequence` | Ordered list of interactions that advance the step. The resolver enforces order via `interactionIndex`. |

#### Step fields (optional volume checks)

The following fields are optional and used for volume-checking steps:

| Field | Type | Description |
| --- | --- | --- |
| `correctVolumeMl` | number | Optional. Target volume for volume-checking steps (e.g. 9 mL for `neutralize_trypsin`). |
| `toleranceMl` | number | Optional. Tolerance window paired with `correctVolumeMl` (e.g. &plusmn;1 mL). |

#### Step fields (modal-owned steps)

Modal-driven steps are modeled by `completionPath` with `kind: modal`. See
the "Kind: `modal`" subsection above for the canonical schema. The legacy
top-level `step.modal` object has been removed; all modal steps must use
the `completionPath` shape.

#### Step fields (non-click steps)

Pure incubation or animation steps with no interaction:

| Field | Type | Description |
| --- | --- | --- |
| `isIncubation` | boolean | if `true`, the step is routed through `step_dispatch` with no resolver |

### Interaction object structure

Each interaction in an `interactionSequence` describes one logical player operation (one or more clicks).

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tool` | string | yes | Item id of the tool the student uses (clicked first) |
| `source` | string | no | Item id to draw from (for load interactions) |
| `destination` | string | no | Item id to apply to (for discharge interactions). Use `destination` only when the receiving item is an intended click target. Do not use virtual destinations or scene affordances as semantic placeholders for context. For a one-click action such as spraying ethanol or starting an instrument, use a direct tool interaction (`tool` + `completionEvent`, no `source`, no `destination`). |
| `liquid` | string | no | Reagent id involved in the interaction |
| `volumeMl` | number | no | Liquid volume for UI feedback |
| `consumesVolumeMl` | number | no | Amount to deduct from the tool's capacity after transfer |
| `completionEvent` | string | no | Completion event emitted when this interaction finishes (e.g. `pbs_wash`). Only the final interaction in a sequence may emit a completion event. |
| `stateChange` | object | no | Tool state change applied by this interaction. See state change structure below. |

State change structure (tool state after an interaction):

Nested under `stateChange` in an interaction object:

| Field | Type | Description |
| --- | --- | --- |
| `heldLiquid` | object | Optional. Liquid held by the tool after a load interaction. Contains: `tool` (item id), `liquid` (reagent id), `volumeMl` (number), `colorKey` (reagent color role). |

### Completion trigger structure

Wires a scene completion event to step completion. The builder validates that the final interaction's `completionEvent` matches this trigger's event.

| Field | Type | Description |
| --- | --- | --- |
| `scene` | string | Scene where the completion event fires (e.g. `hood`, `microscope`, `bench`) |
| `completionEvent` | string | Completion event identifier (e.g. `pbs_wash`, `count_cells`). Must match the `completionEvent` on the final interaction in the step's `interactionSequence`. |

## Worked example: pbs_wash step

The `pbs_wash` step demonstrates the canonical schema (from `src/content/cell_culture/protocol.yaml`).
This uses modern field names; at runtime (before Patch 1), YAML keys are still in legacy form.

```yaml
steps:
  - id: pbs_wash
    label: "Wash cells with 4 mL PBS"
    action: "Wash cells with 4 mL PBS"
    why: "PBS rinses off serum that would block trypsin."
    partId: part1_split
    dayId: day1
    stepIndex: 3
    scene: hood
    requiredItems: [flask, pbs_bottle, serological_pipette, waste_container]
    interactionSequence:
      - tool: serological_pipette
        source: pbs_bottle
        liquid: pbs
        stateChange:
          heldLiquid:
            tool: serological_pipette
            liquid: pbs
            volumeMl: 4
            colorKey: pbs
      - tool: serological_pipette
        destination: flask
        liquid: pbs
        completionEvent: pbs_wash
        consumesVolumeMl: 4
    errorHints:
      wrong_reagent: "PBS is the wash buffer. Media will stop trypsin."
      volume_off: "Use about 4 mL so the whole surface is rinsed."
    nextId: add_trypsin
```

```yaml
# generated by tools/build_protocol_data.py; not authored:
usedItems: [serological_pipette, pbs_bottle, flask]
completionTrigger:
  scene: hood
  completionEvent: pbs_wash
```

### Step anatomy

- **Required context** (`requiredItems`): tools and containers available for this step.
  These appear in the step card so the student knows what to look for.
- **Used items** (`usedItems`): derived item summary in first-use order (tools, sources,
  destinations) from the interaction sequence. Never authored; always derived. The active
  highlight items are derived from the current interaction, not directly from `usedItems`.
- **Interaction sequence** (`interactionSequence`): ordered list of logical player operations.
  Each interaction specifies a tool (clicked first), optional source (for load), optional
  destination (for discharge), optional liquid and volume. The resolver enforces order
  via `interactionIndex` set in M2 of the active plan.
- **State change** (`stateChange`): optional tool state updated by an interaction. Contains
  `heldLiquid` (what the tool holds after a load interaction). The next interaction may
  reference this held liquid state to validate or build on it.
- **Completion event** (`completionEvent`): optional event emitted by an interaction. Only
  the final interaction in a sequence may emit a completion event; it signals that the step
  is complete.
- **Completion trigger** (`completionTrigger`): step-level listener that fires on a completion
  event. Derived (build-time), do not author. The builder synthesizes it from `step.scene`
  and `step.completionPath.completionEvent`. The validator rejects author-written values.
- **Next step** (`nextId`): explicit linked-list pointer to the next protocol step.
  Can be a string id or `null` to mark the final step.

## Cross-file validation rules

The build process (`tools/build_protocol_data.py`) enforces these rules:

### Protocol structure

- Every `step.id` unique and snake_case.
- `nextId` references an existing step id or is `null`. Exactly one terminator.
- Walking `nextId` from the first step visits every step (no orphans).
- `partId` and `dayId` reference declared `parts` and `days`.
- `scene` is one of `hood | bench | incubator | microscope | plate_reader`.

### Item validation

- Every id in `requiredItems` exists in `items.yaml:items`.
- Every `tool`, `source`, and `destination` value in an interaction must be a declared
  item id in `items.yaml:items`. Virtual targets (role `virtual_target`) are permitted
  as interaction destinations even when absent from `requiredItems`.
- For a step with `scene: hood`, every non-virtual item must have `scene: hood`
  in items and have a layout entry in `HOOD_LAYOUT`.
  Symmetric rule for `scene: bench` and `BENCH_LAYOUT`.

### Interaction validation

- The `tool` exists in inventory and has role `transfer_tool`, `aspirate_tool`, or
  `modal_tool`.
- `source`, when present, has role `reagent_source` or `cell_container`.
- `destination`, when present, has role `cell_container`, `culture_vessel`,
  `waste_target`, or `virtual_target`.
- `liquid`, when present, exists in inventory and is in the tool's `allowedLiquids`.
- For a load interaction, the source item's `contains` matches the declared `liquid`.
- `volumeMl` and `consumesVolumeMl` do not exceed the tool's `capacityMl`.
- The `completionEvent` on an interaction, when present, is expected to be triggered
  upon completion of that interaction sequence step.

### Modal validation

- For every step with `modal:`, the `modal.owner` is in the set
  `{drug_treatment, incubator, microscope, plate_reader}`.
- `modal.screen` is unique within an owner.

### Asset validation

- Every item with an `asset` field has a corresponding file in
  `assets/equipment/<asset>.svg`. Items with `role: virtual_target` may omit `asset`.

### Hygiene rules

- ASCII-only across all YAML. UTF-8 glyphs escaped per [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md)
  (e.g. `&alpha;`, `&micro;`).
- Every item in items.yaml must be referenced by at least one step OR have
  `visualOnly: true`. Catches dead inventory.
- Every reagent in reagents.yaml must be referenced by at least one interaction or item
  `contains` field. Catches dead reagents.

## Generated TypeScript surface

The Python builder (`tools/build_protocol_data.py`) compiles YAML into two
TypeScript modules at `src/content/`:

### src/content/protocol_data.ts

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

### src/content/inventory_data.ts

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

- **Only item ids** appear in layout (`HOOD_SCENE_ITEMS`, `BENCH_SCENE_ITEMS`,
  asset specs, future `content/scenes.yaml`).
- **Only reagent ids** appear in `heldLiquid.liquid`, `contains` fields, and
  interaction `liquid:` fields.
- Interactions in the `interactionSequence` reference both item and reagent ids:
  `source: pbs_bottle` (item id) plus `liquid: pbs` (reagent id). The builder
  verifies that the source item's `contains` matches the liquid id.

This prevents accidental name collisions and catches copy-paste errors at build time.

## See also

- [docs/REPO_STYLE.md](REPO_STYLE.md) for repository conventions
- [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md) for ASCII-only and escaping rules
- [AGENTS.md](../AGENTS.md) for agent guidelines on YAML authoring
