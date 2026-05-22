# Scene-object split inventory (WP-EV1)

This is the M1 evidence artifact for the plan in
[scene_object_split_plan.md](scene_object_split_plan.md). It catalogs what the
fused scene YAML format authors today, and tags each field as object-identity
or placement so M2 can split the vocabulary without losing a field.

This file is fact-finding only. It does not propose a design, a fix, or a
boundary rule. M2 (WP-OBJ1, WP-SCN1, WP-BND1, WP-PROTO1) consumes it; M3
ratification appends additional matrix sections to it.

Inputs cataloged:

- The 7 scene YAML files: `src/scenes/bench/bench.yaml`,
  `src/scenes/cell_culture_hood/cell_culture_hood.yaml`,
  `src/scenes/incubator/incubator.yaml`,
  `src/scenes/microscope/microscope.yaml`,
  `src/scenes/plate_reader/plate_reader.yaml`,
  `src/scenes/well_plate_workspace/well_plate_workspace.yaml`, and
  `content/plate_drug_treatment/scene.yaml`.
- `src/asset_specs.ts` (per-asset visual metrics table).
- `src/scene_runtime/types.ts` (runtime liquid-state model).
- The 8 `scene_operation` primitives named in the plan.

## items[] sub-fields across the 7 scene YAML files

Counts are file-presence counts: how many of the 7 scene YAML files contain at
least one `items[]` entry that uses the sub-field. Some files have empty
`items: []` (incubator, plate_reader); they contribute 0 to every sub-field.

| Sub-field        | Tag             | Files using it (out of 7) | Notes                                                                                                                                       |
| ---------------- | --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| id               | object-identity | 5                         | Every non-empty `items[]` entry has it.                                                                                                     |
| label            | object-identity | 5                         | Display name.                                                                                                                               |
| shortLabel       | object-identity | 2                         | Optional shorter label.                                                                                                                     |
| kind             | object-identity | 3                         | One of `plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`, `equipment`, `decoration`.                                                   |
| svgAsset         | object-identity | 3                         | Asset id; a key into `src/asset_specs.ts`.                                                                                                  |
| inventoryRef     | object-identity | 0                         | Listed in plan Current state summary; not observed in any of the 7 files at WP-EV1 read. Confirmed candidate for the object side.           |
| zone             | placement       | 3                         | Names a zone declared in the same scene file.                                                                                               |
| scene            | placement       | 1                         | `content/plate_drug_treatment/scene.yaml` uses `scene:` instead of `zone:` to name a placement region. Inconsistent with the other 6 files. |
| depthTier        | placement       | 3                         | Numeric layering hint within a zone.                                                                                                        |
| widthScale       | placement       | 3                         | Per-instance multiplier on the asset width.                                                                                                 |
| anchorY          | placement       | 3                         | One of `bottom`, `tip`.                                                                                                                     |
| alignStop        | placement       | 3                         | One of `left`, `center`, `right`; tab-stop group.                                                                                           |
| baselineOverride | placement       | 1                         | One observed use (the flask in cell_culture_hood).                                                                                          |
| depth            | placement       | 0                         | Listed in plan Current state summary; not observed. Candidate placement field.                                                              |

Object-identity sub-fields observed in YAML: 5 (`id`, `label`, `shortLabel`,
`kind`, `svgAsset`). Plus `inventoryRef` named by the plan but not observed.

Placement sub-fields observed in YAML: 7 (`zone`, `scene`, `depthTier`,
`widthScale`, `anchorY`, `alignStop`, `baselineOverride`). Plus `depth` named
by the plan but not observed.

Total tagged sub-fields cataloged: 14 (12 observed in at least one file plus
2 plan-listed but not observed at WP-EV1 read).

## Scene-YAML top-level keys

The plan names 12 top-level keys. Counts are file-presence counts across the
7 scene YAML files.

| Key               | Tag                         | Files using it (out of 7) | Notes                                                                                                                                                                                                                                         |
| ----------------- | --------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sceneId           | object-identity             | 7                         | Scene id. Object-identity in the sense that it names the scene itself.                                                                                                                                                                        |
| workspace         | object-identity             | 7                         | Names the workspace this scene targets.                                                                                                                                                                                                       |
| elementId         | object-identity             | 3                         | DOM mount point for the scene.                                                                                                                                                                                                                |
| capabilities      | object-identity             | 6                         | Capability list (one file declares `capabilities: []`).                                                                                                                                                                                       |
| items             | object-identity + placement | 5                         | Mixed: each item carries identity sub-fields (id, label, kind, svgAsset, inventoryRef) and placement sub-fields (zone/scene, depthTier, widthScale, anchorY, alignStop, baselineOverride). This is the central conflation the plan addresses. |
| zones             | placement                   | 5                         | Named placement regions inside the scene.                                                                                                                                                                                                     |
| sceneBounds       | placement                   | 2                         | Outer bounds of the scene.                                                                                                                                                                                                                    |
| layoutRules       | placement                   | 3                         | Label sizing and offset hints.                                                                                                                                                                                                                |
| accentRules       | placement                   | 0                         | Plan-listed; not observed in any of the 7 files at WP-EV1 read.                                                                                                                                                                               |
| tabStops          | placement                   | 0                         | Plan-listed; not observed (tab-stop alignment is currently expressed via per-zone `align: tab-stops` plus per-item `alignStop`).                                                                                                              |
| target_groups     | object-identity             | 0                         | Plan-listed; not observed. RD-4 binds it to the object side.                                                                                                                                                                                  |
| wrongOrderMessage | placement                   | 5                         | UI-side toast for wrong-order interactions. Tagged placement because it concerns scene-level UI feedback, not object identity.                                                                                                                |

Total top-level keys cataloged: 12 (matches the plan's count). Object-identity:
6 (sceneId, workspace, elementId, capabilities, items-identity-half,
target_groups). Placement: 7 (items-placement-half, zones, sceneBounds,
layoutRules, accentRules, tabStops, wrongOrderMessage). `items` straddles both
categories by design and is counted once on each side; net distinct keys = 12.

## src/asset_specs.ts entries

Source: `src/asset_specs.ts` (`ASSET_SPECS` table). Each entry has up to four
property names: `defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`.
`defaultWidth` and `labelWidth` are present on every entry; `anchorYOffset`
and `widthScale` are present on a subset.

| #   | Asset id             | defaultWidth | labelWidth | anchorYOffset | widthScale |
| --- | -------------------- | ------------ | ---------- | ------------- | ---------- |
| 1   | flask                | 12           | 6          | -             | -          |
| 2   | well_plate           | 14           | 8          | -             | -          |
| 3   | well_plate_96        | 14           | 8          | -             | -          |
| 4   | media_bottle         | 8            | 5          | -             | -          |
| 5   | trypsin_bottle       | 7            | 5          | -             | -          |
| 6   | ethanol_bottle       | 5            | 5          | -             | -          |
| 7   | serological_pipette  | 3            | 6          | 0             | -          |
| 8   | aspirating_pipette   | 3            | 6          | 0             | -          |
| 9   | multichannel_pipette | 5            | 6          | 0             | -          |
| 10  | drug_vials           | 14           | 8          | -             | -          |
| 11  | waste_container      | 7            | 5          | -             | -          |
| 12  | sterile_water        | 7            | 5          | -             | -          |
| 13  | pbs_bottle           | 7            | 5          | -             | -          |
| 14  | conical_15ml_rack    | 8            | 5          | -             | -          |
| 15  | dilution_tube_rack   | 9            | 5          | -             | -          |
| 16  | mtt_vial             | 6            | 4          | -             | -          |
| 17  | dmso_bottle          | 7            | 4          | -             | -          |
| 18  | carboplatin_stock    | 7            | 6          | -             | -          |
| 19  | metformin_stock      | 7            | 6          | -             | -          |
| 20  | micropipette_rack    | 8            | 6          | -             | -          |
| 21  | biohazard_decant     | 7            | 5          | -             | -          |
| 22  | centrifuge           | 14           | 10         | -             | 1.6        |
| 23  | water_bath           | 16           | 10         | -             | 1.5        |
| 24  | incubator            | 10           | 6          | -             | 1.4        |
| 25  | plate_reader         | 12           | 8          | -             | 1.2        |
| 26  | cell_counter         | 12           | 8          | -             | 1.0        |
| 27  | microscope           | 8            | 7          | -             | 0.9        |
| 28  | vortex               | 8            | 6          | -             | 0.5        |
| 29  | tip_box              | 9            | 5          | -             | -          |
| 30  | glove_box            | 10           | 6          | -             | -          |
| 31  | waste_tray           | 12           | 6          | -             | -          |

Inconsistency noted: the plan and several work-package descriptions cite "45
`src/asset_specs.ts` entries". The `ASSET_SPECS` map at WP-EV1 read time
contains 31 entries. M2 and M3 should treat 31 as the authoritative count and
revise the plan's "45" callouts (or supply the missing 14 entries if a
separate asset table exists that this work package missed). See "Known
inconsistencies" below.

## Runtime liquid-state model (src/scene_runtime/types.ts)

| Type            | Fields                                            | Current layer | Notes                                 |
| --------------- | ------------------------------------------------- | ------------- | ------------------------------------- |
| LiquidEntry     | key: string; volumeMl: number; colorKey?: string  | runtime       | One reagent in a container.           |
| ContainerLiquid | liquids: LiquidEntry[]; totalVolumeMl: number     | runtime       | Per-container state.                  |
| LiquidState     | containers: Record&lt;string, ContainerLiquid&gt; | runtime       | Scene-wide map keyed by container id. |

Related runtime type observed in the same file but not part of the
liquid-state schema itself: `LiquidTransfer` (kind: transfer | discharge | mix;
from, to, liquid, volumeMl, colorKey). It is an operation, not state.

Current layer: all three liquid-state types live in the runtime layer
(`src/scene_runtime/types.ts`). They are computed and held at runtime; no
authoring surface declares them.

## scene_operation primitives

The 8 primitives named in the plan, with their current layer per
`docs/PROTOCOL_VOCABULARY.md`.

Note: This table reflects the M3 ratification snapshot. Subsequent RD-13
and RD-14 reclassified `LiquidDisplayChange` and `SetPointDisplayChange`
to the object/render layer. See [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md)
for the post-RD authoritative primitive list.

| #   | Primitive             | Current layer           | Notes                                                                                                                                     |
| --- | --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SvgSwap               | protocol-level (target) | Currently documented as a `scene_operation`. Plan brainstorm and RD-3 conclude it is render-level and belongs in the object/render layer. |
| 2   | ColorChange           | protocol-level (target) | RD-3 reclassifies it to the object/render layer alongside SvgSwap.                                                                        |
| 3   | CursorAttach          | protocol-level (target) | UI cursor follow.                                                                                                                         |
| 4   | SceneChange           | protocol-level (target) | Switch active scene.                                                                                                                      |
| 5   | LayoutMove            | protocol-level (target) | Move an object's placement.                                                                                                               |
| 6   | LiquidDisplayChange   | protocol-level (target) | Update displayed liquid in a container.                                                                                                   |
| 7   | SetPointDisplayChange | protocol-level (target) | Update displayed set-point on an instrument.                                                                                              |
| 8   | TimedWait             | protocol-level (target) | Pause for a fixed duration.                                                                                                               |

All 8 are target-state; none are implemented in code at WP-EV1 read time. The
re-partition into protocol-level versus object/render-layer is a WP-PROTO1
deliverable, not a WP-EV1 one.

## Candidate state_fields

Drawn from the runtime liquid-state model and the plan's own
worked-example callouts. Listed for M2 (WP-OBJ1) consideration; not designed
here.

| Candidate state_field | Source                                                              | Likely owning object kind |
| --------------------- | ------------------------------------------------------------------- | ------------------------- |
| held_liquid           | LiquidEntry / ContainerLiquid                                       | pipette, container        |
| total_volume_ml       | ContainerLiquid.totalVolumeMl                                       | container                 |
| liquids               | ContainerLiquid.liquids                                             | container                 |
| color_key             | LiquidEntry.colorKey                                                | container, liquid         |
| set_point             | plan worked-example callout (serological pipette)                   | pipette                   |
| temperature           | implied by water_bath, incubator equipment                          | equipment                 |
| display_value         | implied by SetPointDisplayChange and LiquidDisplayChange primitives | instrument                |

## Candidate structured surfaces

Drawn from observed scenes and plan callouts. A structured surface is an
object whose internal subparts (wells, lanes, tubes, rack slots) are
addressable and may form named groups (RD-4).

| Candidate                                    | Subpart                  | Source                                                                                               |
| -------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| 96-well plate (well_plate, well_plate_96)    | wells (8 rows x 12 cols) | observed in 3 scenes; plan worked example                                                            |
| dilution tube rack (dilution_tube_rack)      | tubes                    | observed (cell_culture_hood reuses this asset for many rack instances)                               |
| micropipette rack (micropipette_rack)        | rack slots               | observed (cell_culture_hood)                                                                         |
| 15 mL conical rack (conical_15ml_rack)       | tubes                    | observed (cell_culture_hood)                                                                         |
| drug vial rack (drug_vials)                  | vials                    | observed (cell_culture_hood)                                                                         |
| gel (named in plan as a liquid/lane example) | lanes                    | not observed in the 7 scenes; plan callout                                                           |
| microscope quadrants (quadrant_0..3)         | quadrant subparts        | observed as separate items in microscope.yaml; may instead be subparts of a single microscope object |

## Known inconsistencies

These are observed at WP-EV1 read time and handed to M2 / M3 for resolution.
WP-EV1 only records them; it does not propose dispositions.

1. **Object data is split across YAML and `src/asset_specs.ts`.** The asset
   id in YAML (`svgAsset:`) keys into a hand-maintained TypeScript table that
   carries `defaultWidth`, `labelWidth`, `anchorYOffset`, and `widthScale`.
   Authors edit two files in two languages to define one object. This is the
   plan's central motivation.
2. **`SvgSwap` is mis-layered.** It is documented as a protocol-level
   `scene_operation`, but it names an SVG asset directly. RD-3 binds it (and
   `ColorChange`) to the object/render layer.
3. **Plan cites 45 `asset_specs.ts` entries; the file has 31.** The
   `ASSET_SPECS` map in `src/asset_specs.ts` at WP-EV1 read contains 31
   entries (cataloged above). M2 / M3 should reconcile the count or surface
   the missing 14.
4. **Plan-listed top-level keys not observed in any of the 7 scene YAML
   files**: `accentRules`, `tabStops`, `target_groups`. They are still listed
   in the top-level table for completeness; M3 ratification can confirm
   whether they are dead documentation or live but unused.
5. **`zone:` versus `scene:` placement reference**:
   `content/plate_drug_treatment/scene.yaml` uses `scene:` on items where the
   other 6 files use `zone:`. The two name the same concept (a placement
   region declared in `zones[]` of the same file). M2 / M3 must pick one
   spelling for the cleaned scene vocabulary.
6. **`items[]` sub-fields named in the plan's Current state summary but not
   observed**: `inventoryRef` (object-identity) and `depth` (placement). They
   may live in code paths or in the build-time validator
   (`tools/build_scene_data.py`) without appearing in YAML; M2 should confirm.
7. **Microscope quadrants are top-level items, not subparts of a microscope
   object.** `src/scenes/microscope/microscope.yaml` declares `quadrant_0`
   through `quadrant_3` as four separate `items[]` entries with no parent
   microscope object. In the new vocabulary they may instead be subparts of a
   single microscope object (RD-4). M3 ratification decides.

## Cataloged counts (summary)

- items[] sub-fields tagged: 14 (12 observed in YAML; 2 plan-listed only).
- Scene-YAML top-level keys tagged: 12 (matches plan).
- src/asset_specs.ts entries listed: 31 (plan says 45; inconsistency 3).
- scene_operation primitives recorded: 8 (matches plan).

## State model + scene_operation re-partition coverage

This is the WP-RAT-C1 ratification section. It cross-checks two things against
the M2 design doc
([scene_object_split_design.md](scene_object_split_design.md)) and the WP-EV1
inventory tables above:

1. Every runtime liquid-state value declared in `src/scene_runtime/types.ts`
   maps to a declared `state_field` per WP-OBJ1's object vocabulary
   ([scene_object_split_design.md](scene_object_split_design.md), "## Object
   vocabulary", "### state_fields schema").
2. Every one of the 8 `scene_operation` primitives has a confirmed owning
   layer per WP-PROTO1's re-partition
   ([scene_object_split_design.md](scene_object_split_design.md), "##
   Protocol-side touch", "### Re-partition table for the eight scene_operation
   primitives").

Resolved decisions cross-checked: RD-3 (`ColorChange` and `SvgSwap` both
render-layer) and RD-4 (`target_groups` object-side) per the plan
([scene_object_split_plan.md](scene_object_split_plan.md), "## Resolved
decisions").

### Runtime liquid-state value coverage

Source inputs: the runtime types in `src/scene_runtime/types.ts`
(`LiquidEntry`, `ContainerLiquid`, `LiquidState`) catalogued in the
"## Runtime liquid-state model (src/scene_runtime/types.ts)" table above; the
candidate `state_fields` table above; WP-OBJ1's `state_fields` schema (typed
fields name, type, allowed, default, with `liquid` and `set_point` first-class
types) and the worked 96-well plate and serological pipette examples.

Each row maps one runtime value to a declared `state_field` on a target object
kind. The `applies_to` column reflects WP-OBJ1's object/subpart axis: a
container's `held_liquid` is per-container for a flask or bottle but per-well
for a plate.

| #   | Runtime type.field            | Carried value                        | Mapped state_field                                       | type   | applies_to        | Owning object kind(s)          | Source row                              |
| --- | ----------------------------- | ------------------------------------ | -------------------------------------------------------- | ------ | ----------------- | ------------------------------ | --------------------------------------- |
| 1   | LiquidEntry.key               | reagent name (string)                | held_liquid (sub-key: key)                               | liquid | object or subpart | container, pipette, well, tube | candidate state_fields: held_liquid     |
| 2   | LiquidEntry.volumeMl          | reagent volume (number, mL)          | held_liquid (sub-key: volume_ml)                         | liquid | object or subpart | container, pipette, well, tube | candidate state_fields: held_liquid     |
| 3   | LiquidEntry.colorKey          | optional color tint (string)         | held_liquid (sub-key: color_key)                         | liquid | object or subpart | container, pipette, well, tube | candidate state_fields: color_key       |
| 4   | ContainerLiquid.liquids       | ordered list of LiquidEntry          | held_liquid (composite shape)                            | liquid | object or subpart | container, pipette, well, tube | candidate state_fields: liquids         |
| 5   | ContainerLiquid.totalVolumeMl | sum of reagent volumes (number, mL)  | total_volume_ml (derived from held_liquid)               | float  | object or subpart | container, pipette, well, tube | candidate state_fields: total_volume_ml |
| 6   | LiquidState.containers        | scene-wide map keyed by container id | n/a -- runtime aggregation, not a per-object state_field | n/a    | n/a               | scene runtime                  | see notes below                         |

Coverage summary: 5 of 6 runtime liquid-state values map to declared
`state_field` entries on container, pipette, well, or tube objects. The 6th
(`LiquidState.containers`) is not a per-object state_field; it is the runtime
aggregation that holds every container's state in one map. WP-OBJ1's object
vocabulary does not need to express it because each object owns its own
state, and the runtime composes the per-scene map from the per-object state.
This is consistent with WP-OBJ1's design rule that "anything not in
`state_fields` is not part of the object's authoring surface" -- the
aggregation belongs to the runtime spine, not the authoring surface.

WP-OBJ1's `liquid` type (declared in the `state_fields` schema) is the
direct match for `LiquidEntry` and `ContainerLiquid`: a `liquid` value carries
"one or more named reagents with volume and color key", and `default: empty`
covers the no-liquid case. The 96-well plate worked example declares
`held_liquid` as `applies_to: subpart` for per-well state; the serological
pipette worked example declares `held_liquid` for the whole pipette barrel.
Both examples cover the runtime shape without extension.

Unmapped runtime values: 1 (`LiquidState.containers`, runtime aggregation
only). No runtime liquid-state value requires a new `state_field` type beyond
the six WP-OBJ1 declared (enum, int, float, bool, string, liquid, set_point).

Related runtime type observed but explicitly not part of the state-coverage
check: `LiquidTransfer` (kind: transfer | discharge | mix; from, to, liquid,
volumeMl, colorKey). Per the WP-EV1 catalog row, it is an operation, not
state. WP-PROTO1's `ObjectStateChange` is the protocol-level primitive that
expresses a transfer's net effect on the source and destination
`held_liquid` state; the `LiquidTransfer` runtime type is the spine's
internal representation of that operation, not an authoring surface.

### scene_operation primitive ownership

Source inputs: the 8 primitives catalogued in the "## scene_operation
primitives" table above; WP-PROTO1's re-partition table
([scene_object_split_design.md](scene_object_split_design.md), "###
Re-partition table for the eight scene_operation primitives"); RD-3 and RD-4
([scene_object_split_plan.md](scene_object_split_plan.md), "## Resolved
decisions").

Each row records the WP-PROTO1 layer assignment, this ratification's
confirmation, and any disagreement.

| #   | Primitive             | WP-PROTO1 layer | Confirmed? | Notes                                                                                                                                                                                                                                                                                               |
| --- | --------------------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | SvgSwap               | object/render   | yes        | Names an SVG asset id; visual mechanism resolved by the object's render_map. Consistent with RD-3 (render-layer alongside ColorChange).                                                                                                                                                             |
| 2   | ColorChange           | object/render   | yes        | Names a color value; visual mechanism resolved by render_map. RD-3 binding: confirmed.                                                                                                                                                                                                              |
| 3   | CursorAttach          | protocol        | yes        | Semantic interaction (cursor carries an object reference). No SVG id or color named.                                                                                                                                                                                                                |
| 4   | SceneChange           | protocol        | yes        | Scene-level transition; outside any single object's render_map.                                                                                                                                                                                                                                     |
| 5   | LayoutMove            | protocol        | yes        | Semantic placement change. WP-PROTO1's "### Ambiguity beyond what RD-3 settled" note acknowledges this is the genuinely ambiguous case; the protocol-level assignment is accepted here for the same reason WP-PROTO1 gave (semantic scene-level event, not a render-layer detail). No disagreement. |
| 6   | LiquidDisplayChange   | object/render   | yes        | Resolved by render_map formula on a `liquid` state_field; the protocol sets the underlying `held_liquid` state via ObjectStateChange.                                                                                                                                                               |
| 7   | SetPointDisplayChange | object/render   | yes        | Resolved by render_map formula on a `set_point` state_field; the protocol sets the underlying `set_point` state via ObjectStateChange.                                                                                                                                                              |
| 8   | TimedWait             | protocol        | yes        | Semantic pause; no object state and no visual identifier named.                                                                                                                                                                                                                                     |

Ownership summary: 4 protocol-level (CursorAttach, SceneChange, LayoutMove,
TimedWait) and 4 object/render-layer (SvgSwap, ColorChange,
LiquidDisplayChange, SetPointDisplayChange). This matches WP-PROTO1's
re-partition exactly. No disagreement with WP-PROTO1.

`ObjectStateChange` is the protocol-level superseder for all four
render-layer primitives per WP-PROTO1's table; it is not itself one of the 8
`scene_operation` primitives catalogued by WP-EV1, so it is not listed in
this ratification table. Its existence as the semantic primitive is what
lets the four render-layer primitives stay render-side without losing
protocol expressivity.

### RD-3 cross-check

RD-3 binds `ColorChange` to the object/render layer alongside `SvgSwap`. The
ownership table above places both at object/render: `SvgSwap` row 1 and
`ColorChange` row 2. WP-PROTO1's "### ColorChange is reclassified to the
object/render layer (RD-3)" section gives the reasoning (a color value is a
visual identifier and a protocol that names a color is coupled to that color)
and reserves the colorimetric-reading exception as a future protocol primitive
in its own slot (not generic `ColorChange`). RD-3 cross-check: passed.

### RD-4 cross-check

RD-4 places `target_groups` in the object vocabulary, not the scene. WP-OBJ1
encodes named groups under `structure.target_groups`
([scene_object_split_design.md](scene_object_split_design.md), "### Named
groups (target_groups)") with `group.name`, `group.members`, and optional
`group.label`; a protocol references a group as `<object_id>.<group_name>`
(for example `treatment_plate.row_A`). WP-BND1's per-key assignment table
places `target_groups` on the object side
([scene_object_split_design.md](scene_object_split_design.md), "### Per-key
assignment table: scene-YAML top-level keys": `target_groups` row, vocabulary
column = object, override column = "no -- structure, scene may not
override").

The state-model coverage check is consistent with RD-4: `ObjectStateChange`
applied to a named group (`target=<object_id>.<group_name>` per WP-PROTO1's
typed fields) sets the same `state_field` value on every member subpart
through the same `render_map` entry. No state value escapes into a
scene-side group declaration. RD-4 cross-check: passed.

Note: RD-9 supersedes the named-groups portion of RD-4. The cross-check
passes only on RD-4's "subparts belong to the object, not the scene"
rule. Named groups are deferred per RD-9; canonical OBJECT_VOCABULARY.md
follows the RD-9 supersession (no `target_groups`).

### Gap entries handed to WP-RAT-A1

Entries below are residual gaps surfaced by this state-model + primitive
ratification, formatted for the WP-RAT-A1 consolidated residual-gap list.
Each entry names the construct, the gap class (per the plan's gap-class
vocabulary: needs a new object concept, needs a boundary revision, needs a
design revision, or needs a follow-on-plan touch), and the suggested
disposition.

| #   | Construct                                                                              | Gap class                                                                 | Suggested disposition                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | LiquidState.containers (scene-wide aggregation)                                        | needs no design action -- runtime spine concern, not authoring surface    | Record as a known non-mapping in WP-RAT-A1's matrix; no design or boundary change required.                                                                                                                                                                                                                                    |
| 2   | LiquidEntry.colorKey routed via state_fields rather than via ColorChange               | needs no design action -- design already resolves this                    | Confirm in WP-RAT-A1's per-scene decomposition that any current scene that paints a liquid color does so by setting `held_liquid.color_key` and letting the object's render_map.held_liquid resolve the tint, not by emitting a protocol-level ColorChange. RD-3 binding.                                                      |
| 3   | LayoutMove ambiguity (no `state_field` of any object owns scene placement coordinates) | needs no design action for M2 -- WP-PROTO1 acknowledged and dispositioned | Carry forward as a known watch item. If a follow-on mini-protocol needs continuous layout animation, revisit per WP-PROTO1's "### Ambiguity beyond what RD-3 settled" note.                                                                                                                                                    |
| 4   | ContainerLiquid.totalVolumeMl as a derived value vs an authored state_field            | needs a design clarification (M4 doc-edit, not an M2 design revision)     | WP-DOC-OV1 / WP-DOC-OY1 should clarify whether `total_volume_ml` is an authored `state_field` (float, derived constraint) or a render-time computation from the `liquid` value's reagent list. Both readings are consistent with WP-OBJ1's `liquid` type description; the canonical doc should pick one. Not a blocker for M3. |
| 5   | Future colorimetric-reading primitive (RD-3 exception)                                 | needs a follow-on-plan touch                                              | Reserve as a target-state slot in `docs/PROTOCOL_VOCABULARY.md` per WP-PROTO1's "### ColorChange is reclassified" note; the specification belongs to the first colorimetric-reading mini-protocol, not this plan.                                                                                                              |

Gap summary: 5 entries handed to WP-RAT-A1. None require a WP-OBJ1, WP-SCN1,
WP-BND1, or WP-PROTO1 design revision; entries 1-3 are dispositions only,
entry 4 is an M4 doc clarification, and entry 5 is a follow-on-plan
reservation.

### Cataloged counts (WP-RAT-C1 summary)

- Runtime liquid-state values cross-checked: 6 (5 mapped to declared
  state_fields; 1 runtime-aggregation non-mapping recorded).
- scene_operation primitives ratified: 8 (4 protocol-level, 4
  object/render-layer; ownership matches WP-PROTO1 exactly).
- RD-3 cross-check: passed.
- RD-4 cross-check: passed.
- Residual-gap entries handed to WP-RAT-A1: 5.

## Asset_specs to object mapping

This is the M3 / WS-RAT-B (WP-RAT-B1) ratification artifact. It maps every
entry in `src/asset_specs.ts` to the object-vocabulary slots defined in the M2
design doc [scene_object_split_design.md](scene_object_split_design.md), and
hands gap entries forward to WP-RAT-A1.

Source for the 31 cataloged assets: the table in section "## src/asset_specs.ts
entries" of this same inventory artifact (rows 1..31). Source for the
object-vocabulary slot names (`layout.default_width`, `layout.label_width`,
`layout.anchor_y_offset`, `layout.width_scale`, `state_fields`, `render_map`,
`structure`, `capabilities`): WP-OBJ1 in
[scene_object_split_design.md](scene_object_split_design.md), specifically the
"### Layout hints", "### state_fields schema", "### Render map", "### Structured
surfaces and subparts", and "### Capabilities" sections.

### Reconciliation of the 45-vs-31 count discrepancy

The plan
[scene_object_split_plan.md](scene_object_split_plan.md) cites "45
`src/asset_specs.ts` entries" in 16 distinct lines (at WP-RAT-B1 read time:
lines 40, 62, 88, 103, 153, 226, 250, 309, 426, 518, 632, 638, 803, 858, 868,
917). The actual `ASSET_SPECS` map in `src/asset_specs.ts` at WP-RAT-B1 read
time contains exactly 31 entries (rows 1..31 in the "## src/asset_specs.ts
entries" table above). WP-EV1 already flagged this as "Known inconsistency 3";
this section ratifies the count.

Authoritative current count: 31 entries.

Where the plan's "45" came from: not discoverable from the current
`src/asset_specs.ts`, the git log of that file (only two commits at
WP-RAT-B1 read time: the lift from `parts/` and one M2 patch), or the
inventory artifact. The plan was authored before WP-EV1 produced its count and
the 45 figure appears to be an early estimate that was never reconciled. The
16 plan callouts to "45" are stale documentation, not evidence of 14 missing
entries. The plan should be updated to read "31" wherever it currently reads
"45"; that update is a WP-DOC-DEP1 deliverable (M4 dependent-doc alignment),
not a WP-RAT-B1 deliverable.

Note: the broader `assets/equipment/` SVG directory contains roughly 60+ raw
SVG files (legacy, \_new, \_old, \_v2 variants, plus assets the layout engine
does not know about such as `angry_professor.svg`, `falcon_15ml.svg`,
`microtube_open_translucent.svg`, color-map JSON sidecars). Those raw SVGs are
not `asset_specs.ts` entries and are outside the WP-RAT-B1 scope. The
authoritative count of 31 is the count of entries in the `ASSET_SPECS` map,
which is the layout engine's per-asset visual-metrics table.

### Mapping table: asset_specs.ts entries to object-vocabulary slots

Columns:

- "Asset id" / "kind": the asset_specs.ts key and the object `kind` enum it
  fits per WP-OBJ1's identity table (plate, bottle, flask, pipette, rack,
  waste, equipment, decoration).
- "default_width / label_width / anchor_y_offset / width_scale": the four
  asset_specs.ts properties; "-" means the asset does not declare that
  property today. Every value lands in the object's `layout` block per WP-OBJ1
  "### Layout hints" (today's `defaultWidth` -> `layout.default_width`,
  `labelWidth` -> `layout.label_width`, `anchorYOffset` -> `layout.anchor_y_offset`,
  `widthScale` -> `layout.width_scale`).
- "state_fields needed": the candidate state_fields the asset requires per the
  inventory's "## Candidate state_fields" table and the M2 design's
  state_fields schema. "none" means a flat object with no declared state
  (typical of decoration and rack-only assets).
- "render_map needed": yes if the asset requires a non-trivial render_map
  entry (a `formula` for liquid fill, a numeric overlay for set_point, or
  cases for an enum). no if the object is a flat single-asset render
  (decoration) where the render_map collapses to the trivial single-asset
  case. gap if WP-RAT-A1 must decide.
- "structure": yes if the asset is a structured surface per the inventory's
  "## Candidate structured surfaces" table. no otherwise. gap if WP-RAT-A1
  must decide.

| #   | Asset id             | kind       | default_width | label_width | anchor_y_offset | width_scale | state_fields needed                     | render_map needed | structure |
| --- | -------------------- | ---------- | ------------- | ----------- | --------------- | ----------- | --------------------------------------- | ----------------- | --------- |
| 1   | flask                | flask      | 12            | 6           | -               | -           | held_liquid                             | yes               | no        |
| 2   | well_plate           | plate      | 14            | 8           | -               | -           | held_liquid (subpart)                   | yes               | yes       |
| 3   | well_plate_96        | plate      | 14            | 8           | -               | -           | held_liquid (subpart)                   | yes               | yes       |
| 4   | media_bottle         | bottle     | 8             | 5           | -               | -           | held_liquid                             | yes               | no        |
| 5   | trypsin_bottle       | bottle     | 7             | 5           | -               | -           | held_liquid                             | yes               | no        |
| 6   | ethanol_bottle       | bottle     | 5             | 5           | -               | -           | held_liquid                             | yes               | no        |
| 7   | serological_pipette  | pipette    | 3             | 6           | 0               | -           | held_liquid, set_point                  | yes               | no        |
| 8   | aspirating_pipette   | pipette    | 3             | 6           | 0               | -           | held_liquid                             | yes               | no        |
| 9   | multichannel_pipette | pipette    | 5             | 6           | 0               | -           | held_liquid (subpart), set_point        | yes               | yes       |
| 10  | drug_vials           | rack       | 14            | 8           | -               | -           | held_liquid (subpart)                   | yes               | yes       |
| 11  | waste_container      | waste      | 7             | 5           | -               | -           | held_liquid, total_volume_ml            | yes               | no        |
| 12  | sterile_water        | bottle     | 7             | 5           | -               | -           | held_liquid                             | yes               | no        |
| 13  | pbs_bottle           | bottle     | 7             | 5           | -               | -           | held_liquid                             | yes               | no        |
| 14  | conical_15ml_rack    | rack       | 8             | 5           | -               | -           | held_liquid (subpart)                   | yes               | yes       |
| 15  | dilution_tube_rack   | rack       | 9             | 5           | -               | -           | held_liquid (subpart)                   | yes               | yes       |
| 16  | mtt_vial             | bottle     | 6             | 4           | -               | -           | held_liquid                             | yes               | no        |
| 17  | dmso_bottle          | bottle     | 7             | 4           | -               | -           | held_liquid                             | yes               | no        |
| 18  | carboplatin_stock    | bottle     | 7             | 6           | -               | -           | held_liquid                             | yes               | no        |
| 19  | metformin_stock      | bottle     | 7             | 6           | -               | -           | held_liquid                             | yes               | no        |
| 20  | micropipette_rack    | rack       | 8             | 6           | -               | -           | gap (slot occupancy; WP-RAT-A1)         | gap               | yes       |
| 21  | biohazard_decant     | waste      | 7             | 5           | -               | -           | held_liquid, total_volume_ml            | yes               | no        |
| 22  | centrifuge           | equipment  | 14            | 10          | -               | 1.6         | set_point (speed), display_value        | yes               | no        |
| 23  | water_bath           | equipment  | 16            | 10          | -               | 1.5         | set_point (temperature), temperature    | yes               | no        |
| 24  | incubator            | equipment  | 10            | 6           | -               | 1.4         | set_point (temperature), temperature    | yes               | no        |
| 25  | plate_reader         | equipment  | 12            | 8           | -               | 1.2         | display_value, set_point (mode)         | yes               | no        |
| 26  | cell_counter         | equipment  | 12            | 8           | -               | 1.0         | display_value                           | yes               | no        |
| 27  | microscope           | equipment  | 8             | 7           | -               | 0.9         | display_value (quadrant); see gap entry | yes               | gap       |
| 28  | vortex               | equipment  | 8             | 6           | -               | 0.5         | set_point (speed)                       | yes               | no        |
| 29  | tip_box              | decoration | 9             | 5           | -               | -           | none                                    | no                | no        |
| 30  | glove_box            | decoration | 10            | 6           | -               | -           | none                                    | no                | no        |
| 31  | waste_tray           | decoration | 12            | 6           | -               | -           | none                                    | no                | no        |

Coverage: 31 of 31 asset_specs.ts entries mapped. Every layout property
(`defaultWidth`, `labelWidth`, `anchorYOffset`, `widthScale`) lands in the
object's `layout` block per WP-OBJ1's "### Layout hints" rule. Per RD-2 a
scene placement may override any of these, but the default lives on the
object.

### Counts

- Assets requiring `state_fields`: 28 of 31 (every entry except the 3
  decoration assets `tip_box`, `glove_box`, `waste_tray`; the
  `micropipette_rack` and `microscope` rows are counted here even though their
  exact state model is gap-flagged for WP-RAT-A1).
- Assets requiring `render_map`: 28 of 31 (the same 28; the 3 decoration
  assets render as a single trivial asset and need no state-driven
  render_map).
- Assets requiring `structure` (structured surface): 7 of 31 (`well_plate`,
  `well_plate_96`, `multichannel_pipette`, `drug_vials`, `conical_15ml_rack`,
  `dilution_tube_rack`, `micropipette_rack`). 1 additional (`microscope`) is
  gap-flagged for WP-RAT-A1; if it becomes a structured surface of 4
  quadrants, the count rises to 8.
- Assets needing `anchor_y_offset` layout hint: 3 of 31 (the three pipettes).
- Assets needing `width_scale` layout hint: 7 of 31 (the seven equipment
  entries with explicit widthScale today).

### Gap entries handed to WP-RAT-A1

These are residual-gap entries per the plan's WP-RAT-B1 acceptance criteria:
"properties with no clean object-vocabulary home" or assets whose state /
structure model cannot be settled without consulting the 7 scene YAML files
that WP-RAT-A1 ratifies. WP-RAT-A1 owns the per-scene decision; WP-RAT-B1
flags the entries.

1. **microscope** (asset row 27, kind `equipment`). The inventory's "Known
   inconsistency 7" notes that `quadrant_0` through `quadrant_3` are top-level
   `items[]` entries in `src/scenes/microscope/microscope.yaml` rather than
   subparts of a single microscope object. WP-OBJ1 provides the
   structured-surface mechanism (`structure.subpart_kind: quadrant`,
   `structure.layout: grid`, `structure.id_pattern: "quadrant_{index}"`) that
   would let them be subparts. WP-RAT-A1 decides per-scene whether the
   microscope object declares a structure block of 4 quadrant subparts (and
   the four `quadrant_*` items disappear from microscope.yaml) or stays flat
   (and the quadrant items remain top-level placements).

2. **micropipette_rack** (asset row 20, kind `rack`). The asset is a
   structured surface (the rack holds tip boxes / micropipette slots) but the
   M2 design does not specify a state_field for "is this slot occupied"
   versus "is the held pipette of this size". WP-RAT-A1 decides per-scene
   (cell_culture_hood is the consumer) whether slot occupancy is a declared
   `state_field` (`occupied: bool` per slot, or `held_pipette_kind: enum` per
   slot) or whether the rack is decoration-only with no per-slot state. The
   M2 `state_fields` schema supports either; WP-RAT-B1 cannot pick without
   the scene-level evidence that WP-RAT-A1 produces.

3. **well_plate vs well_plate_96 schema choice** (asset rows 2 and 3). Both
   entries share identical `defaultWidth: 14`, `labelWidth: 8` and both are
   plates. The M2 design's worked example uses `well_plate_96` as a
   `structure.layout: grid` with `rows: 8 cols: 12`. The `well_plate` entry
   may be a 6-well or 24-well plate (different grid dimensions) or a
   duplicate placeholder. WP-RAT-A1 confirms by inspecting the 7 scene YAML
   files which one (or both) is referenced and what grid dimensions each
   scene assumes. If only `well_plate_96` is used, `well_plate` is a dead
   `asset_specs.ts` entry that WP-RAT-A1 should flag for removal in a
   follow-on plan.

4. **anchor_y placement-override survey** (the 3 pipette assets, rows
   7, 8, 9). WP-OBJ1 reclassifies `anchorY` from a per-item placement
   sub-field to an object layout hint (`layout.anchor_y: tip` for pipettes).
   The "Out of scope" close of WP-OBJ1's section explicitly defers to
   WP-RAT-A1: "whether any scene actually needs to override `anchor_y`;
   WP-RAT-A1 will check this against the 7 scenes". WP-RAT-B1 confirms the
   3 pipette assets are the only entries that carry `anchor_y_offset` today
   and that the object-side default `layout.anchor_y: tip` covers all three;
   WP-RAT-A1 confirms whether any of the 7 scenes needs a per-placement
   override of `anchor_y`.

5. **drug_vials structure granularity** (asset row 10, kind `rack`). The
   asset id reads as a rack of vials (per the SVG file
   `assets/equipment/drug_vial_rack.svg` referenced by the asset). The M2
   design supports a `structure.subpart_kind: vial` block with
   `structure.layout: list` and a per-vial `held_liquid` state_field.
   WP-RAT-A1 confirms per-scene the vial count and whether the rack-level
   liquid state is per-vial (recommended per the inventory's structured
   surfaces table) or rack-aggregated.

Total gap entries handed to WP-RAT-A1 from WP-RAT-B1: 5 (microscope structure,
micropipette_rack slot state, well_plate-vs-well_plate_96 schema,
pipette anchor_y override survey, drug_vials granularity).

### Cataloged counts (WP-RAT-B1 summary)

- asset_specs.ts entries mapped: 31 of 31.
- Plan-vs-file count discrepancy: plan says 45 (16 callouts), file has 31.
  Authoritative count is 31; plan to be updated by WP-DOC-DEP1.
- Assets needing `state_fields`: 28 of 31.
- Assets needing `render_map`: 28 of 31.
- Assets needing `structure`: 7 of 31 (1 additional gap-flagged).
- Gap entries handed to WP-RAT-A1: 5.

## 7-scene decomposition matrix

This is the M3 / WS-RAT-A (WP-RAT-A1) ratification artifact. It walks every
one of the 7 scene YAML files named in the plan
([scene_object_split_plan.md](scene_object_split_plan.md)) and decomposes the
fused file on paper into:

1. The set of object definitions it would produce in the M2 object vocabulary
   ([scene_object_split_design.md](scene_object_split_design.md), "## Object
   vocabulary"). Each object lists `id`, `kind`, and a sketch of any
   `state_fields` it needs (drawn from the inventory's "## Candidate
   state_fields" table and the WP-RAT-B1 mapping table above).
2. The cleaned scene-placement file it would produce in the M2 scene
   vocabulary ([scene_object_split_design.md](scene_object_split_design.md),
   "## Cleaned scene vocabulary"). Each placement shows which keys land where
   per WP-BND1's per-key assignment table
   ([scene_object_split_design.md](scene_object_split_design.md), "## Three-way
   boundary", "### Per-key assignment table: scene-YAML top-level keys" and
   "### Per-sub-field assignment table: items[] sub-fields").

Object reuse: when several `items[]` rows in one scene share the same
`svgAsset:` (for example the eight `dilution_tube_rack` placements in
`cell_culture_hood.yaml`), the cleaned vocabulary produces a single object
definition (one `dilution_tube_rack` object in the object library) with
multiple placements (each row becomes its own `placement_id` referencing
the same `object_id`). The "distinct objects" count below is the count of
object library entries the scene drives; the "placements" count is the
number of `placements[]` entries in the cleaned scene file.

Inputs read for this section: the 7 YAML files at WP-RAT-A1 read time
(`src/scenes/bench/bench.yaml`,
`src/scenes/cell_culture_hood/cell_culture_hood.yaml`,
`src/scenes/incubator/incubator.yaml`,
`src/scenes/microscope/microscope.yaml`,
`src/scenes/plate_reader/plate_reader.yaml`,
`src/scenes/well_plate_workspace/well_plate_workspace.yaml`, and
`content/plate_drug_treatment/scene.yaml`); the WP-RAT-B1 mapping table for
asset-to-object slot resolution; WP-BND1's per-key boundary table for
sub-field placement.

### Scene 1: src/scenes/bench/bench.yaml

Top-level: `sceneId: bench`, `workspace: equipment_bench`,
`capabilities: [itemWorkspace]`, `sceneBounds`, `zones` (back_shelf,
mid_bench), `layoutRules`, `wrongOrderMessage`, `items` (10 entries).

Object definitions produced (10 distinct):

| #   | Object id    | kind       | state_fields sketch                                                     |
| --- | ------------ | ---------- | ----------------------------------------------------------------------- |
| 1   | centrifuge   | equipment  | set_point (speed), display_value                                        |
| 2   | water_bath   | equipment  | set_point (temperature), temperature                                    |
| 3   | cell_counter | equipment  | display_value                                                           |
| 4   | microscope   | equipment  | display_value (quadrant); structure gap (see consolidated gap entry G6) |
| 5   | vortex       | equipment  | set_point (speed)                                                       |
| 6   | incubator    | equipment  | set_point (temperature), temperature                                    |
| 7   | plate_reader | equipment  | display_value, set_point (mode)                                         |
| 8   | tip_box      | decoration | none                                                                    |
| 9   | glove_box    | decoration | none                                                                    |
| 10  | waste_tray   | decoration | none                                                                    |

Note: `itemWorkspace` is today's scene-level capability tag. Per WP-BND1 the
top-level `capabilities` key moves object-side. The string `itemWorkspace` is
not an object affordance; it is a workspace-class tag (see consolidated gap
entry G7). The object definitions above carry per-object capabilities
(`clickable`, `instrument_with_setpoint`, `decoration_only`) per the WP-OBJ1
closed list, not the scene's `itemWorkspace` tag.

Cleaned scene-placement file produced:

| Cleaned key                  | Source field                    | Vocabulary | Notes                                                                                                          |
| ---------------------------- | ------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| scene_id: bench              | sceneId                         | scene      | identity                                                                                                       |
| workspace                    | workspace                       | scene      | identity                                                                                                       |
| scene_bounds                 | sceneBounds                     | scene      | outer surface                                                                                                  |
| zones[]                      | zones[] (back_shelf, mid_bench) | scene      | 2 zones, each with `align: tab-stops`                                                                          |
| layout_rules                 | layoutRules                     | scene      | label sizing hints                                                                                             |
| wrong_order_message          | wrongOrderMessage               | scene      | UI feedback                                                                                                    |
| placements[]                 | items[]                         | scene      | 10 placements                                                                                                  |
| placement.placement_id       | items[].id                      | scene      | per-placement id                                                                                               |
| placement.object_id          | items[].id (same value)         | scene      | references object library                                                                                      |
| placement.zone               | items[].zone                    | scene      | back_shelf or mid_bench                                                                                        |
| placement.depth_tier         | items[].depthTier               | scene      | 1..7 (mid_bench) and 1..3 (back_shelf)                                                                         |
| placement.align_stop         | items[].alignStop               | scene      | left / center / right                                                                                          |
| placement.layout.width_scale | items[].widthScale              | scene      | per-RD-2 override of object default                                                                            |
| placement.layout.anchor_y    | items[].anchorY                 | scene      | all `bottom` here; per-RD-2 override surface unused (object default already `bottom` for equipment/decoration) |

Placements: 10. Distinct objects: 10. Top-level capability `itemWorkspace`
flagged (G7); no other unmappable constructs.

### Scene 2: src/scenes/cell_culture_hood/cell_culture_hood.yaml

Top-level: `sceneId: cell_culture_hood`, `elementId: hood-scene`,
`workspace: wet_lab_hood`, `capabilities: [itemWorkspace]`, `sceneBounds`,
`zones` (back_row, front_row, shelf_row), `layoutRules`, `wrongOrderMessage`,
`items` (30 entries; heavy reuse of `dilution_tube_rack` and
`micropipette_rack`).

Object definitions produced (16 distinct object-library entries; many
placements collapse onto the same object):

| #   | Object id (library)  | kind    | state_fields sketch                                | Driven by these scene items[]                                                                                                          |
| --- | -------------------- | ------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | well_plate_96        | plate   | held_liquid (subpart, per well, 8x12 grid)         | well_plate                                                                                                                             |
| 2   | media_bottle         | bottle  | held_liquid                                        | media_bottle                                                                                                                           |
| 3   | trypsin_bottle       | bottle  | held_liquid                                        | trypsin_bottle                                                                                                                         |
| 4   | flask                | flask   | held_liquid                                        | flask (carries the only `baselineOverride: 52` in this scene)                                                                          |
| 5   | serological_pipette  | pipette | held_liquid, set_point                             | serological_pipette                                                                                                                    |
| 6   | aspirating_pipette   | pipette | held_liquid                                        | aspirating_pipette                                                                                                                     |
| 7   | multichannel_pipette | pipette | held_liquid (subpart per channel), set_point       | multichannel_pipette                                                                                                                   |
| 8   | micropipette_rack    | rack    | gap (slot occupancy; see consolidated gap G2)      | micropipette_rack, micropipette                                                                                                        |
| 9   | ethanol_bottle       | bottle  | held_liquid                                        | ethanol_bottle                                                                                                                         |
| 10  | drug_vials           | rack    | held_liquid (subpart per vial; granularity gap G3) | drug_vials                                                                                                                             |
| 11  | waste_container      | waste   | held_liquid, total_volume_ml                       | waste_container                                                                                                                        |
| 12  | biohazard_decant     | waste   | held_liquid, total_volume_ml                       | biohazard_decant                                                                                                                       |
| 13  | sterile_water        | bottle  | held_liquid                                        | sterile_water                                                                                                                          |
| 14  | pbs_bottle           | bottle  | held_liquid                                        | pbs_bottle                                                                                                                             |
| 15  | conical_15ml_rack    | rack    | held_liquid (subpart per tube)                     | conical_15ml_rack                                                                                                                      |
| 16  | dilution_tube_rack   | rack    | held_liquid (subpart per tube)                     | dilution_tube_rack, dilution_tube_carb_intermediate, dilution_tube_carb_b..h, dilution_tube_metformin_working (9 placements, 1 object) |
| 17  | mtt_vial             | bottle  | held_liquid                                        | mtt_vial                                                                                                                               |
| 18  | dmso_bottle          | bottle  | held_liquid                                        | dmso_bottle                                                                                                                            |
| 19  | carboplatin_stock    | bottle  | held_liquid                                        | carboplatin_stock                                                                                                                      |
| 20  | metformin_stock      | bottle  | held_liquid                                        | metformin_stock_bottle                                                                                                                 |

Distinct object-library entries: 20 (the `micropipette` placement reuses
`micropipette_rack` as its `svgAsset:`, which is the SVG-asset reuse case
called out in consolidated gap G5; conceptually that placement should
reference an object in the `pipette` `kind`, not the `micropipette_rack`
object). Distinct underlying SVG assets: 16 (the 9 `dilution_tube_rack`
placements share one SVG; the 2 `micropipette_rack`-asset placements share
one SVG).

Cleaned scene-placement file produced:

| Cleaned key                  | Source field                             | Vocabulary | Notes                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scene_id: cell_culture_hood  | sceneId                                  | scene      | identity                                                                                                                                                                     |
| element_id: hood-scene       | elementId                                | scene      | identity (DOM mount)                                                                                                                                                         |
| workspace                    | workspace                                | scene      | identity                                                                                                                                                                     |
| scene_bounds                 | sceneBounds                              | scene      | outer surface                                                                                                                                                                |
| zones[]                      | zones[] (back_row, front_row, shelf_row) | scene      | 3 zones, all `align: tab-stops`                                                                                                                                              |
| layout_rules                 | layoutRules                              | scene      | label sizing hints                                                                                                                                                           |
| wrong_order_message          | wrongOrderMessage                        | scene      | UI feedback                                                                                                                                                                  |
| placements[]                 | items[]                                  | scene      | 30 placements                                                                                                                                                                |
| placement.placement_id       | items[].id                               | scene      | per-placement id (the 9 dilution-tube and 2 micropipette-rack placements get distinct placement_ids that reference shared object_ids)                                        |
| placement.object_id          | items[].svgAsset (collapsed)             | scene      | 20 distinct object_ids drive 30 placements                                                                                                                                   |
| placement.zone               | items[].zone                             | scene      | back_row / front_row / shelf_row                                                                                                                                             |
| placement.depth_tier         | items[].depthTier                        | scene      | numeric layering (note: shelf_row uses fractional 28.0..28.8 to enforce ordering of dilution-tube placements -- this is a placement-side detail, not an object-side concern) |
| placement.align_stop         | items[].alignStop                        | scene      | left / center / right                                                                                                                                                        |
| placement.label              | items[].label                            | scene      | per-RD-2 override of object default (for example `Carb 200 uM intermediate` overrides the object's default `1.5 mL Tubes`)                                                   |
| placement.short_label        | items[].shortLabel                       | scene      | per-RD-2 override                                                                                                                                                            |
| placement.layout.width_scale | items[].widthScale                       | scene      | per-RD-2 override of object default                                                                                                                                          |
| placement.layout.anchor_y    | items[].anchorY                          | scene      | most are `bottom`; the 3 pipettes use `tip` which matches the object default `layout.anchor_y: tip`, so the override is redundant and could be omitted                       |
| placement.baseline_override  | items[].baselineOverride                 | scene      | one observed use (flask, value 52)                                                                                                                                           |

Unmappable constructs flagged: 0 within this scene's own vocabulary. The
`micropipette` placement that piggy-backs the `micropipette_rack` SVG asset
(G5) and the slot-occupancy gap on `micropipette_rack` (G2) are recorded in
the consolidated gap list and disposition there.

Placements: 30. Distinct objects: 20. Heavy per-placement label override
(the dilution-tube placements rename the object's `1.5 mL Tubes` default to
chemistry-specific labels like `Carb 200 uM intermediate`); this is the
RD-2 override surface working as intended.

### Scene 3: src/scenes/incubator/incubator.yaml

Top-level: `sceneId: incubator`, `workspace: modal_overlay`,
`capabilities: [incubatorWorkspace]`, `items: []`, `zones: []`,
`wrongOrderMessage`.

Object definitions produced: 0 (the file declares `items: []`).

Cleaned scene-placement file produced:

| Cleaned key              | Source field      | Vocabulary | Notes                                    |
| ------------------------ | ----------------- | ---------- | ---------------------------------------- |
| scene_id: incubator      | sceneId           | scene      | identity                                 |
| workspace: modal_overlay | workspace         | scene      | identity (modal-overlay class workspace) |
| zones[]                  | zones: []         | scene      | empty list                               |
| placements[]             | items: []         | scene      | empty list                               |
| wrong_order_message      | wrongOrderMessage | scene      | UI feedback                              |

Unmappable constructs flagged: the top-level capability `incubatorWorkspace`
is a workspace-class tag, not an object affordance (G7). The scene declares
an interactive workspace but no `items[]`; the actual incubator-interior
interactions live in the protocol layer or are rendered by code keyed off
the workspace tag. M3 records this as a workspace-class-vs-object-
capability gap (G7) rather than a per-scene unmappable.

Placements: 0. Distinct objects: 0. Capability tag flagged (G7).

### Scene 4: src/scenes/microscope/microscope.yaml

Top-level: `sceneId: microscope`, `elementId: instrument-overlay`,
`workspace: modal_overlay`, `capabilities: [instrumentWorkspace,
modalWorkspace, gridCountingWorkspace]`, `items` (4 quadrant entries),
`zones: []`, `wrongOrderMessage`.

The 4 `items[]` entries are `quadrant_0`..`quadrant_3` with only `id` and
`label`; no `svgAsset`, no `zone`, no layout sub-fields. Per inventory note
7 and consolidated gap G6, the cleaned vocabulary may treat these as
subparts of a single `microscope` object rather than as 4 top-level
placements. Two readings are presented; G6 picks one.

Reading A (subparts of one microscope object; recommended per RD-4 and
WP-OBJ1 structured-surface mechanism):

| #   | Object id  | kind      | state_fields sketch                                                                                                      |
| --- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | microscope | equipment | display*value (per quadrant); structure: 4 quadrant subparts, id_pattern `quadrant*{index}`; named group `all_quadrants` |

Cleaned scene file under Reading A produces 0 placements (the microscope
object is invoked by the protocol via `target=microscope.quadrant_0`
through `microscope.quadrant_3`, not via scene placement).

Reading B (4 top-level quadrant placements; matches today's structure):

4 object definitions (quadrant_0..quadrant_3, each kind `decoration` with
no `state_fields`) and 4 placements with no zone, no depth_tier, no layout
sub-fields.

Cleaned scene-placement file (common to both readings):

| Cleaned key          | Source field                   | Vocabulary | Notes                          |
| -------------------- | ------------------------------ | ---------- | ------------------------------ |
| scene_id: microscope | sceneId                        | scene      | identity                       |
| element_id           | elementId (instrument-overlay) | scene      | shared modal slot              |
| workspace            | workspace                      | scene      | identity                       |
| zones[]              | zones: []                      | scene      | empty list                     |
| placements[]         | items[]                        | scene      | 0 (Reading A) or 4 (Reading B) |
| wrong_order_message  | wrongOrderMessage              | scene      | UI feedback                    |

Unmappable constructs flagged: 1 (the structure-vs-placement choice for
quadrants; G6 disposition). The three workspace-class capability tags
(`instrumentWorkspace`, `modalWorkspace`, `gridCountingWorkspace`) are
flagged under G7.

Placements: 0 (Reading A, recommended) or 4 (Reading B). Distinct objects:
1 (Reading A) or 4 (Reading B).

### Scene 5: src/scenes/plate_reader/plate_reader.yaml

Top-level: `sceneId: plate_reader`, `elementId: instrument-overlay`,
`workspace: modal_overlay`, `capabilities: [modalWorkspace,
plateReaderWorkspace]`, `items: []`, `zones: []`. No
`wrongOrderMessage` declared.

Object definitions produced: 0 (the file declares `items: []`).

Cleaned scene-placement file produced:

| Cleaned key              | Source field                   | Vocabulary | Notes             |
| ------------------------ | ------------------------------ | ---------- | ----------------- |
| scene_id: plate_reader   | sceneId                        | scene      | identity          |
| element_id               | elementId (instrument-overlay) | scene      | shared modal slot |
| workspace: modal_overlay | workspace                      | scene      | identity          |
| zones[]                  | zones: []                      | scene      | empty list        |
| placements[]             | items: []                      | scene      | empty list        |

Unmappable constructs flagged: workspace-class capability tags
(`modalWorkspace`, `plateReaderWorkspace`) under G7. No `wrong_order_message`
declared in this file; the cleaned scene format treats the field as
optional (per WP-SCN1).

Placements: 0. Distinct objects: 0.

### Scene 6: src/scenes/well_plate_workspace/well_plate_workspace.yaml

Top-level: `sceneId: well_plate_workspace`, `workspace: dedicated_plate`,
`capabilities: []`, `items` (1 entry: `well_plate` with only `id` and
`label`), `zones: []`, `wrongOrderMessage`.

Object definitions produced (1 distinct):

| #   | Object id  | kind  | state_fields sketch                                                                                      |
| --- | ---------- | ----- | -------------------------------------------------------------------------------------------------------- |
| 1   | well_plate | plate | held_liquid (subpart, per well; grid is well_plate-vs-well_plate_96 schema gap, see consolidated gap G4) |

The single `items[]` entry has no `svgAsset:`, no `zone:`, no
`depthTier:`, no layout sub-fields. The cleaned vocabulary requires
`placement.zone`. The scene declares no zones either. Per WP-SCN1,
`placement.zone` is required.

Cleaned scene-placement file produced:

| Cleaned key                    | Source field      | Vocabulary | Notes                                  |
| ------------------------------ | ----------------- | ---------- | -------------------------------------- |
| scene_id: well_plate_workspace | sceneId           | scene      | identity                               |
| workspace: dedicated_plate     | workspace         | scene      | identity                               |
| zones[]                        | zones: []         | scene      | empty list -- zone-required gap (G8)   |
| placements[]                   | items[] (1 entry) | scene      | 1 placement; placement.zone unset (G8) |
| wrong_order_message            | wrongOrderMessage | scene      | UI feedback                            |

Unmappable constructs flagged: 1 (a placement with no zone in a scene with
no zones; G8 disposition). The empty `capabilities: []` collapses to
no scene-side capability rewrite under WP-BND1; per-object capabilities
are object-side.

Placements: 1. Distinct objects: 1.

### Scene 7: content/plate_drug_treatment/scene.yaml

Top-level: `sceneId: well_plate_workspace`, `workspace: dedicated_plate`,
`items` (13 entries; all use `scene:` not `zone:`), `zones`
(main_plate_area, top_left_bench, right_shelf). No `sceneBounds`, no
`layoutRules`, no `wrongOrderMessage`, no `capabilities`.

Note on identity collision: this file declares `sceneId:
well_plate_workspace`, the same id as Scene 6. The cleaned vocabulary
requires unique scene_id values across the scene library; this is a
content-vs-src naming overlap (Scene 6 is the src/ stub, Scene 7 is the
content/ realization). G9 disposition.

Object definitions produced (10 distinct object-library entries; 13
placements collapse onto these via reuse):

| #   | Object id (library)             | kind    | state_fields sketch                          | Driven by these scene items[]                                                                                        |
| --- | ------------------------------- | ------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | well_plate                      | plate   | held_liquid (subpart per well; grid gap G4)  | well_plate                                                                                                           |
| 2   | multichannel_pipette            | pipette | held_liquid (subpart per channel), set_point | multichannel_pipette                                                                                                 |
| 3   | carboplatin_stock               | bottle  | held_liquid                                  | carboplatin_stock_solution (placement_id renames the library object)                                                 |
| 4   | media_bottle                    | bottle  | held_liquid                                  | media_bottle                                                                                                         |
| 5   | dilution_tube_rack              | rack    | held_liquid (subpart per tube)               | dilution_tube_carb_b..h (7 placements, 1 object)                                                                     |
| 6   | metformin_stock                 | bottle  | held_liquid                                  | metformin_stock_solution (placement_id renames the library object)                                                   |
| 7   | dilution_tube_metformin_working | rack    | held_liquid (subpart per tube)               | dilution_tube_metformin_working (also resolves to the dilution_tube_rack library object via shared svgAsset; see G5) |

Distinct object-library entries: 7 (treating the 7 carb dilution placements
as 1 shared `dilution_tube_rack` object, the metformin working placement as
the same object, and the two `_solution`-suffixed placements as renames of
the existing `carboplatin_stock` and `metformin_stock` library objects).
The metformin working placement is the same SVG-asset reuse pattern as
cell_culture_hood (G5).

Cleaned scene-placement file produced:

| Cleaned key                | Source field                                       | Vocabulary | Notes                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scene_id                   | sceneId                                            | scene      | collides with Scene 6 (G9)                                                                                                                                                    |
| workspace: dedicated_plate | workspace                                          | scene      | identity                                                                                                                                                                      |
| zones[]                    | zones[]                                            | scene      | 3 zones (main_plate_area `align: center`; top_left_bench and right_shelf `align: tab-stops`)                                                                                  |
| placements[]               | items[] (13 entries)                               | scene      | 13 placements; 7 distinct object_ids                                                                                                                                          |
| placement.placement_id     | items[].id                                         | scene      | per-placement id                                                                                                                                                              |
| placement.object_id        | items[].id (resolved via library)                  | scene      | object library lookup (placements like `dilution_tube_carb_b` resolve to the `dilution_tube_rack` object; the placement_id and the per-placement label distinguish chemistry) |
| placement.zone             | items[].scene (renamed; inventory inconsistency 5) | scene      | every items[] entry uses `scene:` -- the cleaned vocabulary rewrites all 13 to `placement.zone:` per WP-SCN1                                                                  |
| placement.label            | items[].label                                      | scene      | per-RD-2 override of object default (for example `4 uM carboplatin working solution` overrides the dilution-tube-rack object default)                                         |

Unmappable constructs flagged: 2 (every `items[]` entry uses `scene:` instead
of `zone:` -- 13 occurrences resolved by the WP-SCN1 rename, captured under
inventory inconsistency 5; and the scene_id collision with Scene 6, G9). No
`sceneBounds` and no `layoutRules` declared; the cleaned scene format treats
both as optional (the layout engine falls back to defaults), so this is not
a gap.

Placements: 13. Distinct objects: 7.

### 7-scene decomposition counts

| Scene                                   |                       placements |                 distinct objects | unmappable constructs                                              |
| --------------------------------------- | -------------------------------: | -------------------------------: | ------------------------------------------------------------------ |
| bench.yaml                              |                               10 |                               10 | 0 in-scene (G7 carries the workspace-tag concern)                  |
| cell_culture_hood.yaml                  |                               30 |                               20 | 0 in-scene (G2 / G3 / G5 carried in gap list)                      |
| incubator.yaml                          |                                0 |                                0 | 0 in-scene (G7)                                                    |
| microscope.yaml                         |   0 (Reading A) or 4 (Reading B) |   1 (Reading A) or 4 (Reading B) | 1 (G6 reading choice)                                              |
| plate_reader.yaml                       |                                0 |                                0 | 0 in-scene (G7)                                                    |
| well_plate_workspace.yaml (src/)        |                                1 |                                1 | 1 (G8 zone-required)                                               |
| content/plate_drug_treatment/scene.yaml |                               13 |                                7 | 2 (the 13 `scene:` uses resolved by WP-SCN1; G9 sceneId collision) |
| total                                   | 54 (Reading A) or 58 (Reading B) | 39 (Reading A) or 42 (Reading B) | 4 distinct unmappable constructs                                   |

Total distinct objects in the cleaned object library across all 7 scenes:
24 (deduplicating overlap between bench equipment and cell_culture_hood
shared objects -- bench's microscope and cell_culture_hood's
multichannel_pipette etc. are independent library entries because no two
scenes share an `id`; the only cross-scene shared object is the conceptual
microscope, which appears as a `kind: equipment` entry in bench and as a
modal-overlay scene in microscope.yaml -- the latter under Reading A is one
microscope object with 4 quadrant subparts, which is the same library
entry by id `microscope`). The cleaned object library has roughly 24
distinct entries; per WP-RAT-B1, every entry maps to one of the 31
`asset_specs.ts` rows (or, in the case of placements like
`dilution_tube_carb_intermediate`, to a shared underlying asset row).

## Consolidated residual-gap list

This is the final M3 / WS-RAT-A artifact. It merges WP-RAT-B1's 5 gap
entries (asset_specs side), WP-RAT-C1's 5 gap entries (state model and
scene_operation primitive side), and the new gap entries surfaced by the
WP-RAT-A1 7-scene decomposition above. Each entry is classified by gap
class (`needs a new object concept` -- cheap; `needs a boundary revision`
-- medium; `needs a design revision` -- expensive) and given a one-line
disposition (accepted-as-noted, defer-to-M4, defer-to-follow-on-plan, or
revise-M2-and-re-ratify).

| #   | Source                                     | Construct                                                                                                                                                                                                                                                                                                                                          | Gap class                                                                                                                                                         | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | WP-RAT-B1 #1                               | microscope: quadrants as 4 top-level items vs 4 subparts of one microscope object                                                                                                                                                                                                                                                                  | needs a new object concept (cheap; structured-surface mechanism already exists)                                                                                   | defer-to-follow-on-plan: Reading A (subparts) is recommended; the per-scene resolution lives in the YAML rewrite plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| B2  | WP-RAT-B1 #2                               | micropipette_rack: slot-occupancy state_field unspecified                                                                                                                                                                                                                                                                                          | needs a new object concept (cheap; bool or enum per slot)                                                                                                         | defer-to-follow-on-plan: pick `occupied: bool` or `held_pipette_kind: enum` when the YAML rewrite reaches cell_culture_hood.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| B3  | WP-RAT-B1 #3                               | well_plate vs well_plate_96: schema choice (grid dims, possible duplicate)                                                                                                                                                                                                                                                                         | needs a boundary revision (medium; one row may be dead)                                                                                                           | defer-to-follow-on-plan: confirm which is referenced in the YAML rewrite; flag dead `asset_specs.ts` row for removal then.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| B4  | WP-RAT-B1 #4                               | anchor_y override survey across the 3 pipette assets                                                                                                                                                                                                                                                                                               | needs no design action (cheap; survey only)                                                                                                                       | accepted-as-noted: the WP-RAT-A1 decomposition above confirms the 3 pipettes in cell_culture_hood use `anchor_y: tip` matching the object default; no scene needs an override.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| B5  | WP-RAT-B1 #5                               | drug_vials: structure granularity (per-vial vs rack-aggregated held_liquid)                                                                                                                                                                                                                                                                        | needs a new object concept (cheap)                                                                                                                                | defer-to-follow-on-plan: pick per-vial granularity in the cell_culture_hood YAML rewrite (recommended per inventory's structured surfaces table).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| C1  | WP-RAT-C1 #1                               | LiquidState.containers: scene-wide aggregation, not a per-object state_field                                                                                                                                                                                                                                                                       | needs no design action (runtime spine concern)                                                                                                                    | accepted-as-noted: recorded as a known non-mapping; no design or boundary change required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| C2  | WP-RAT-C1 #2                               | LiquidEntry.colorKey routed via state_fields rather than via ColorChange                                                                                                                                                                                                                                                                           | needs no design action (RD-3 already resolves)                                                                                                                    | accepted-as-noted: the WP-RAT-A1 per-scene decomposition confirms no scene authors a protocol-level color set today; all liquid color comes through `held_liquid.color_key`.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| C3  | WP-RAT-C1 #3                               | LayoutMove ambiguity (no state_field owns scene placement)                                                                                                                                                                                                                                                                                         | needs no design action for M2 (WP-PROTO1 dispositioned)                                                                                                           | accepted-as-noted: carried as a watch item per WP-PROTO1's "### Ambiguity beyond what RD-3 settled".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| C4  | WP-RAT-C1 #4                               | total_volume_ml: derived value vs authored state_field                                                                                                                                                                                                                                                                                             | needs a boundary revision (medium; doc clarification only)                                                                                                        | defer-to-M4: WP-DOC-OV1 / WP-DOC-OY1 picks one reading. Not a blocker for M3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| C5  | WP-RAT-C1 #5                               | future colorimetric-reading primitive (RD-3 exception)                                                                                                                                                                                                                                                                                             | needs a design revision (expensive; new protocol primitive)                                                                                                       | defer-to-follow-on-plan: reserve the slot in PROTOCOL_VOCABULARY.md per WP-PROTO1's note; specification belongs to the first colorimetric-reading mini-protocol.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| A6  | WP-RAT-A1 (microscope.yaml)                | quadrants reading choice (A: subparts of microscope object; B: 4 top-level placements)                                                                                                                                                                                                                                                             | needs a new object concept (cheap; structured-surface mechanism already exists) -- duplicates B1 from a different angle                                           | defer-to-follow-on-plan: Reading A is recommended and consistent with B1's disposition. Counted separately because the scene-side decomposition is a distinct artifact from the asset-side mapping.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A7  | WP-RAT-A1 (5 scenes)                       | top-level capabilities use workspace-class tags (`itemWorkspace`, `modalWorkspace`, `instrumentWorkspace`, `incubatorWorkspace`, `gridCountingWorkspace`, `plateReaderWorkspace`) that are not object affordances per WP-OBJ1's closed list (`clickable`, `liquid_container`, `instrument_with_setpoint`, `structured_surface`, `decoration_only`) | needs a boundary revision (medium; today's `capabilities` is a free-form scene-level workspace tag, not the object-side closed list WP-OBJ1 specifies)            | defer-to-follow-on-plan: the workspace-class tags are scene-side (a property of where, not what); the cleaned vocabulary should keep them as `scene.workspace_class` (or similar scene-side slot) and reserve `capabilities` for the object-side closed list. M2 design already places `capabilities` object-side; this gap is the recognition that the field's existing values are a different kind of tag. The follow-on YAML-rewrite plan picks the slot name and migrates the existing 5 tags; no M2 design revision required because the boundary call (object-side `capabilities` is a closed object-affordance list) stands. |
| A8  | WP-RAT-A1 (well_plate_workspace.yaml src/) | one placement with no zone, in a scene with no zones; cleaned vocabulary requires `placement.zone`                                                                                                                                                                                                                                                 | needs a boundary revision (medium; either the zone requirement softens to "required when zones[] non-empty" or the well_plate_workspace stub gets a default zone) | defer-to-follow-on-plan: the src/ well_plate_workspace.yaml is a sparse stub; the realization in `content/plate_drug_treatment/scene.yaml` declares zones (under the `scene:` spelling, resolved by inventory inconsistency 5). The follow-on YAML-rewrite plan either drops the src/ stub (its content is superseded by the content/ version) or adds a default zone; no M2 design revision required.                                                                                                                                                                                                                              |
| A9  | WP-RAT-A1 (Scene 6 vs Scene 7)             | scene_id collision: both `well_plate_workspace.yaml` files declare `sceneId: well_plate_workspace`                                                                                                                                                                                                                                                 | needs a boundary revision (medium; the cleaned vocabulary requires unique scene_id)                                                                               | defer-to-follow-on-plan: the YAML-rewrite plan resolves by keeping the `content/` realization and either renaming or deleting the `src/` stub. No M2 design revision required.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Total entries: 14 (5 from WP-RAT-B1 + 5 from WP-RAT-C1 + 4 new from
WP-RAT-A1).

Disposition counts:

- accepted-as-noted: 4 (B4, C1, C2, C3).
- defer-to-M4: 1 (C4).
- defer-to-follow-on-plan: 9 (B1, B2, B3, B5, C5, A6, A7, A8, A9).
- revise-M2-and-re-ratify: 0.

No entry requires a WP-OBJ1, WP-SCN1, WP-BND1, or WP-PROTO1 design
revision. M2 stands as ratified across all three peer ratifications. M3
closes with this gap list as the final artifact; the follow-on YAML
rewrite plan picks up the 9 deferred entries and the M4 doc work picks
up entry C4.

### Cataloged counts (WP-RAT-A1 summary)

- Scenes decomposed: 7 of 7.
- Total placements produced (Reading A on microscope): 54.
- Total distinct object-library entries driven (cross-scene): roughly 24
  (deduplicated by object_id; full library size is the union of per-scene
  distinct objects).
- Unmappable constructs flagged: 4 (microscope quadrants Reading A vs B;
  workspace-class capability tags; well_plate_workspace zone gap;
  scene_id collision).
- Consolidated residual-gap entries: 14 (5 + 5 + 4).
- revise-M2-and-re-ratify dispositions: 0. M3 closes.
