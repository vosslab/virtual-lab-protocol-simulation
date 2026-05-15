# Plan stub: content/scene-YAML migration

Status: stub. Owner: TBD. Depends on: scene_object_split plan close-out
(this stub is created by WP-DOC-C1 of `scene_object_split_plan.md`).

## Purpose

Migrate every existing scene YAML file into the three-vocabulary model
ratified by the scene_object_split plan. The new model splits authoring
into `protocol`, `object`, and `scene` vocabularies, each in its own YAML
file. Today object identity and spatial placement are fused in one scene
YAML; this plan rewrites those files into separate object definitions plus
cleaned scene-placement files.

## Inputs

The ratified canonical docs land before this plan starts:

- [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md)
- [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md)
- [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md)
- [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md)
- [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md) (re-touched for
  `ObjectStateChange` and the `SvgSwap` / `ColorChange` /
  `LiquidDisplayChange` reclassification)

Supporting evidence:

- `docs/active_plans/scene_object_split_inventory.md` (decomposition
  matrices for current scene YAML files and `src/asset_specs.ts` entries).
- `docs/active_plans/scene_object_split_design.md` (working design doc).

## Targets

- Every file under `src/scenes/*/`. Note: `src/scenes/` is frozen per
  [SRC_SCENES_FREEZE.md](SRC_SCENES_FREEZE.md), so migrated output lands
  in the new `content/` layout (see first decision below), not in place.
- `content/plate_drug_treatment/scene.yaml` (the active content-side
  scene that stalled the runtime work).
- The `src/asset_specs.ts` entries fold into object YAML during this plan
  (TypeScript deletion is the second follow-on, not this plan).

## First decision: content/ folder layout

Object, scene, and protocol YAML files now live side-by-side. The
migration must split them into separate subdirectories so the three
vocabularies have a one-to-one mapping to folders. Proposed layout:

- `content/objects/` -- object definitions (one file per object family,
  or per-protocol overrides).
- `content/scenes/` -- scene placements that reference objects by id.
- `content/protocols/` -- protocol step / interaction YAML.

Open sub-decisions for the plan to settle up front:

- Per-protocol subfolders vs. flat shared object library, or a hybrid
  (shared library plus per-protocol overrides).
- Naming conventions for object ids vs. file names.
- How to express scene-level instance overrides (per RD-2: only `label`
  and layout hints).
- How to retire the fused-format `items[]` keys in old scene YAML files
  (delete vs. archive snapshot).

## Scope

- YAML rewrites only. No TypeScript edits.
- New object YAML files plus the content/ folder reshape.
- Migration-time validation by hand or by a temporary script under
  `tools/`; permanent loaders ship in the second follow-on plan.

## Out of scope

- Editing `src/asset_specs.ts`, `src/layout_engine.ts`, `src/scene_runtime/`,
  or `tools/build_scene_data.py`. That work belongs to
  [typescript_migration_plan.md](typescript_migration_plan.md).
- Editing `src/scenes/` (frozen).
- Adding new object capabilities or new state-field types.
- The docs/ folder reorganization (separate plan,
  [docs_folder_organization_plan.md](docs_folder_organization_plan.md)).

## First risks

- Hidden coupling between `src/asset_specs.ts` numeric metrics and
  hand-tuned scene placements: a clean object/scene split may surface
  layout regressions.
- The first migrated scene becomes the de-facto template; pick a small
  representative scene first (not the 96-well plate).
- The first follow-on (this plan) must finish before the TypeScript
  follow-on starts; partial migrations create two formats in flight.

## Suggested entry milestone

M1: pick the smallest current scene; migrate it end-to-end as the
template; document the per-object decomposition pattern; only then fan
out to the remaining scenes plus the 96-well plate.

## References

- Parent plan (close-out): [scene_object_split_plan.md](../archive/scene_object_split_plan.md).
- Following plan: [typescript_migration_plan.md](typescript_migration_plan.md).
- Related: [docs_folder_organization_plan.md](docs_folder_organization_plan.md).

## Object inventory table (WP-INVENT-1)

This table is the single source of truth for every object the seven
reauthored mini-protocols will reference. Rows are derived pedagogy-first
from the real-world OVCAR-8 carboplatin/metformin/MTT protocol in
[../protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](../protocols/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)
and the dilution math in
[../protocols/OVCAR8_MATH_REVIEW.md](../protocols/OVCAR8_MATH_REVIEW.md)
and [../protocols/VOSS_DILUTIONS_GUIDE.md](../protocols/VOSS_DILUTIONS_GUIDE.md).
Legacy `archive/content_legacy_2026_05/<name>/items.yaml` files were
consulted for name and label recovery only; legacy `role` and `asset`
fields are not authoritative.

Column meaning:

- `object_name`: stable snake_case name; one object per file
  (`content/objects/<object_name>.yaml`).
- `kind`: closed enum from [../specs/OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md)
  (one of `plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`,
  `equipment`, `decoration`).
- `target_file`: the YAML file that will be authored.
- `workstream`: one of WS-PILOT-OBJ (M1 pilot subset for `hood_flask_prep`),
  WS-OBJ-LIQUID, WS-OBJ-STRUCT, WS-OBJ-EQUIP, WS-OBJ-WASTE (M2 lanes).
- `state_fields_needed`: flat-primitive `state_fields` the object must
  declare, with spec citation. References to `contents_name` and
  `contents_volume` follow the registry rule in
  [../specs/LIQUID_CONVENTION.md](../specs/LIQUID_CONVENTION.md).
- `spec_cite`: anchor in the canonical object spec the row implements.
- `notes`: pedagogy or schema notes; which mini-protocols touch the
  object; legacy parity callouts.

Abbreviations used in `state_fields_needed`:

- `cn` = `contents_name` (enum, allowed list per protocol).
- `cv` = `contents_volume` (float, with unit).
- `hcn` = `held_contents_name`; `hcv` = `held_contents_volume`
  (the tool-side pair, same shape).
- `sv` = `set_volume` (float, instrument set-point).

Mini-protocol abbreviations used in `notes`:

- HFP = `hood_flask_prep` (pilot, M1).
- DDS = `drug_dilution_setup`.
- PDT = `plate_drug_treatment`.
- CCS = `cell_counting_and_seeding`.
- MTT = `mtt_assay_readout`.
- CC = `cell_culture` (general passaging).
- CCF = `cell_culture_full` (sequence runner; references the same
  objects through its constituent mini-protocols, no new objects).

### Pilot subset (M1, WS-PILOT-OBJ) -- objects `hood_flask_prep` needs

HFP M1 scope: 6-step hood-only initial cell detachment workflow.
Steps: (1) spray hood with 70% ethanol, (2) aspirate spent media,
(3) add PBS wash, (4) aspirate PBS, (5) add trypsin, (6) add fresh
media to neutralize trypsin. Pilot stops before transferring to a
conical, centrifuging, aspirating the supernatant, and reseeding.

Constrained palette doctrine: M1 intentionally limits the authoring
vocabulary to one workspace, eight objects, click-primary gestures,
and three scene_operation primitives (ObjectStateChange, CursorAttach,
TimedWait). Reagent bottles dispense directly via CursorAttach on
the bottle plus ObjectStateChange on the flask -- no intermediate
serological pipette in M1. Later reviewers reject complexity creep
on this basis.

Not in M1 pilot: serological_pipette, centrifuge, conical_15ml,
conical_15ml_rack, incubator, water_bath.

Note on `hood_surface`: it is scene-support (the base scene needs the object name to reference); it is not a student interaction target.

| object_name | kind | target_file | workstream | state_fields_needed | spec_cite | notes |
| --- | --- | --- | --- | --- | --- | --- |
| hood_surface | decoration | content/objects/hood_surface.yaml | WS-PILOT-OBJ | none | OBJECT_YAML_FORMAT.md object identity | HFP, all hood-based mini-protocols. Static BSC workspace backdrop; no state. Scene-support object referenced by the base scene; not a student interaction target. |
| ethanol_bottle | bottle | content/objects/ethanol_bottle.yaml | WS-PILOT-OBJ | cn (enum: ethanol), cv (float, unit=ml, max=500) | OBJECT_YAML_FORMAT.md contents pattern | HFP. 70 percent ethanol surface-decontamination spray; instructor opens the hood with this. |
| aspirating_pipette | pipette | content/objects/aspirating_pipette.yaml | WS-PILOT-OBJ | hcn (enum: empty, media, pbs, trypsin, cells), hcv (float, unit=ml, max=10) | OBJECT_YAML_FORMAT.md worked example | HFP, CC. Vacuum aspirate-only; no set-point (continuous suction). `cells` covers aspirated waste containing detached or suspended cells (spent media post-trypsin, PBS wash carrying cells, supernatant after centrifuge spin). |
| t75_flask | flask | content/objects/t75_flask.yaml | WS-PILOT-OBJ | cn (enum: empty, media, pbs, trypsin, cells), cv (float, unit=ml, max=25) | OBJECT_YAML_FORMAT.md state_fields; LIQUID_CONVENTION.md | HFP, CC, CCS. Adherent OVCAR-8 culture vessel; capacity 25 ml usable. |
| pbs_bottle | bottle | content/objects/pbs_bottle.yaml | WS-PILOT-OBJ | cn (enum: pbs), cv (float, unit=ml, max=500) | OBJECT_YAML_FORMAT.md contents pattern | HFP, CC. Source bottle for sterile wash buffer; never mixed. |
| trypsin_bottle | bottle | content/objects/trypsin_bottle.yaml | WS-PILOT-OBJ | cn (enum: trypsin), cv (float, unit=ml, max=100) | OBJECT_YAML_FORMAT.md contents pattern | HFP, CC, CCS. Trypsin-EDTA detach reagent. |
| media_bottle | bottle | content/objects/media_bottle.yaml | WS-PILOT-OBJ | cn (enum: media), cv (float, unit=ml, max=500) | OBJECT_YAML_FORMAT.md contents pattern | HFP, DDS, PDT, CCS, CC. Complete media (RPMI + FBS + pen/strep). |
| waste_container | waste | content/objects/waste_container.yaml | WS-PILOT-OBJ | cn (enum: empty, mixed), cv (float, unit=ml, max=1000) | OBJECT_YAML_FORMAT.md contents pattern | HFP, CC. Vacuum-line liquid waste; receives aspirated media and PBS. |

### M2 liquid-bearing objects (WS-OBJ-LIQUID)

| object_name | kind | target_file | workstream | state_fields_needed | spec_cite | notes |
| --- | --- | --- | --- | --- | --- | --- |
| serological_pipette | pipette | content/objects/serological_pipette.yaml | WS-OBJ-LIQUID | sv (float, unit=ml, min=0.1, max=25, step=0.1), hcn (enum: empty, media, pbs, trypsin, cells), hcv (float, unit=ml, max=25) | OBJECT_YAML_FORMAT.md worked example | NOT in HFP M1 pilot. M1 bottles dispense directly via CursorAttach. Serological pipette enters M2 when a downstream protocol needs volume-set transfers. DDS, PDT, CCS, MTT, CC. Cursor-attachable transfer tool; tip-anchored. |
| conical_15ml | bottle | content/objects/conical_15ml.yaml | WS-OBJ-LIQUID | cn (enum: empty, cells, media, trypsin), cv (float, unit=ml, max=15) | OBJECT_YAML_FORMAT.md state_fields | NOT in HFP M1 pilot. M1 stops before transfer to a conical. Conical lands in M2 with the next mini-protocol that picks up the cell suspension. CCS, CC. Single 15 ml conical tube; transfer target for cell suspension; pellet forms during spin; supernatant aspirated; pellet resuspended in media. Flat container (multi-slot rack lives under WS-OBJ-STRUCT). |
| multichannel_pipette | pipette | content/objects/multichannel_pipette.yaml | WS-OBJ-LIQUID | sv (float, unit=ul, min=20, max=300, step=1), hcn (enum: empty, media, drug_combo, dmso, mtt), hcv (float, unit=ul, max=300) | OBJECT_YAML_FORMAT.md worked example; structure deferred | PDT, MTT. 8-channel transfer for plate dispense; channel structure deferred per OBJECT_VOCABULARY.md (treated as a flat per-channel pair until named groups land). |
| micropipette | pipette | content/objects/micropipette.yaml | WS-OBJ-LIQUID | sv (float, unit=ul, min=0.5, max=1000, step=0.5), hcn (enum: empty, water, carboplatin, metformin, media), hcv (float, unit=ul, max=1000) | OBJECT_YAML_FORMAT.md state_fields | DDS. Variable-volume single-channel pipette used to build the dilution series. |
| carboplatin_stock_bottle | bottle | content/objects/carboplatin_stock_bottle.yaml | WS-OBJ-LIQUID | cn (enum: carboplatin), cv (float, unit=ml, max=50) | OBJECT_YAML_FORMAT.md contents pattern | DDS. 10 mM carboplatin parent stock; pedagogy source for the 4-fold serial dilution. |
| metformin_stock_bottle | bottle | content/objects/metformin_stock_bottle.yaml | WS-OBJ-LIQUID | cn (enum: metformin), cv (float, unit=ml, max=50) | OBJECT_YAML_FORMAT.md contents pattern | DDS. 1 M metformin parent stock. |
| dmso_bottle | bottle | content/objects/dmso_bottle.yaml | WS-OBJ-LIQUID | cn (enum: dmso), cv (float, unit=ml, max=50) | OBJECT_YAML_FORMAT.md contents pattern | MTT. Solubilizes formazan crystals at readout. |
| mtt_vial | bottle | content/objects/mtt_vial.yaml | WS-OBJ-LIQUID | cn (enum: mtt), cv (float, unit=ml, max=10) | OBJECT_YAML_FORMAT.md contents pattern | MTT. 5 mg/ml MTT reagent vial; light-sensitive in real life (notes only). |
| sterile_water_bottle | bottle | content/objects/sterile_water_bottle.yaml | WS-OBJ-LIQUID | cn (enum: water), cv (float, unit=ml, max=500) | OBJECT_YAML_FORMAT.md contents pattern | DDS. Diluent for the carboplatin intermediate stock; pedagogy: water vs. media as diluent matters. |
| microtube_15ml_intermediate | bottle | content/objects/microtube_15ml_intermediate.yaml | WS-OBJ-LIQUID | cn (enum: empty, carboplatin), cv (float, unit=ml, max=15) | OBJECT_YAML_FORMAT.md contents pattern | DDS. 400 uM carboplatin intermediate stock tube (the bridge between 10 mM stock and the 8-step working series); kept flat because pedagogy treats it as one labeled vessel. |
| metformin_working_tube | bottle | content/objects/metformin_working_tube.yaml | WS-OBJ-LIQUID | cn (enum: empty, metformin, media), cv (float, unit=ul, max=1000) | OBJECT_YAML_FORMAT.md contents pattern | DDS. Single 200 mM metformin working stock tube (pedagogy: one final working dilution from 1 M stock). Flat labeled vessel; structured rack not needed. |

### M2 structured objects (WS-OBJ-STRUCT)

| object_name | kind | target_file | workstream | state_fields_needed | spec_cite | notes |
| --- | --- | --- | --- | --- | --- | --- |
| conical_15ml_rack | rack | content/objects/conical_15ml_rack.yaml | WS-OBJ-STRUCT | per-slot: cn (enum: empty, cells, media), cv (float, unit=ml, max=15, applies_to=subpart) | OBJECT_YAML_FORMAT.md structure (list layout) | NOT in HFP M1 pilot. M1 stops before transfer to a conical. Rack lands in M2 with the next mini-protocol that picks up the cell suspension. CCS, CC. Slotted rack of 15 ml conicals; list layout, count=6, name_pattern "slot_{index}". |
| well_plate_96 | plate | content/objects/well_plate_96.yaml | WS-OBJ-STRUCT | per-well: cn (enum: empty, media, cells, carboplatin, metformin, drug_combo, mtt, dmso), cv (float, unit=ul, max=300, applies_to=subpart) | OBJECT_YAML_FORMAT.md worked example (96-well plate) | PDT, CCS, MTT. Canonical structured surface: 8x12 grid, name_pattern "{row_letter}{col}". |
| dilution_tube_rack_8 | rack | content/objects/dilution_tube_rack_8.yaml | WS-OBJ-STRUCT | per-tube: cn (enum: empty, carboplatin, media), cv (float, unit=ul, max=1000, applies_to=subpart) | OBJECT_YAML_FORMAT.md structure (grid layout) | DDS. 8 microtubes holding the carboplatin working dilution series; structure.layout=grid, rows=8, cols=1, name_pattern "tube_{row_letter}" yields tube_A..tube_H. |
| hemocytometer | equipment | content/objects/hemocytometer.yaml | WS-OBJ-STRUCT | count_quadrant_a, count_quadrant_b, count_quadrant_c, count_quadrant_d (int, min=0, max=999); applies_to=object (four named fields, no subparts in this pass) | OBJECT_YAML_FORMAT.md state_fields (int) | CCS. Pedagogy: student counts four 1 mm-squared quadrants and averages; the four counts are explicit named state fields rather than subparts because named groups are deferred. |

### M2 instrument and decoration objects (WS-OBJ-EQUIP)

| object_name | kind | target_file | workstream | state_fields_needed | spec_cite | notes |
| --- | --- | --- | --- | --- | --- | --- |
| centrifuge | equipment | content/objects/centrifuge.yaml | WS-OBJ-EQUIP | set_rpm (float, unit=rpm, min=0, max=4000, step=100), set_time_min (float, unit=min, min=0, max=30, step=0.5), running (bool) | OBJECT_YAML_FORMAT.md state_fields; capability instrument_with_setpoint | NOT in HFP M1 pilot. M1 stops before centrifugation. Centrifuge lands in M2 with the next mini-protocol that picks up the cell suspension. CCS, CC. Pellet adherent cells at 300 g (approx. 1200 rpm) for 5 min after trypsin neutralization. |
| incubator | equipment | content/objects/incubator.yaml | WS-OBJ-EQUIP | set_temperature_c (float, unit=C, min=4, max=45, default=37), set_co2_pct (float, unit=pct, min=0, max=10, default=5), door_open (bool) | OBJECT_YAML_FORMAT.md state_fields; capability instrument_with_setpoint | PDT, CC, CCS, MTT. 37 C / 5 percent CO2; pedagogy: open door starts the timed warm-up wait when a flask returns. NOT in HFP M1 pilot: HFP M1 ends after resuspending the cell pellet; returning the flask to the incubator is the next mini-protocol's responsibility. |
| microscope | equipment | content/objects/microscope.yaml | WS-OBJ-EQUIP | objective (enum: 4x, 10x, 20x, 40x), light_on (bool) | OBJECT_YAML_FORMAT.md state_fields | CCS, CC. Inspect adherent confluence before passaging; clickable but stateless beyond objective. |
| plate_reader | equipment | content/objects/plate_reader.yaml | WS-OBJ-EQUIP | wavelength_nm (int, unit=nm, min=400, max=750, default=570), reading (bool) | OBJECT_YAML_FORMAT.md state_fields | MTT. 570 nm absorbance readout step. |
| vortex | equipment | content/objects/vortex.yaml | WS-OBJ-EQUIP | running (bool) | OBJECT_YAML_FORMAT.md state_fields (bool) | DDS. Mix the intermediate carboplatin stock before serial dilution. |
| water_bath | equipment | content/objects/water_bath.yaml | WS-OBJ-EQUIP | set_temperature_c (float, unit=C, min=20, max=60, default=37), running (bool) | OBJECT_YAML_FORMAT.md state_fields | CC, CCS. Pre-warm media and trypsin before flask work. NOT in HFP M1 pilot: pre-warming is a setup activity outside the seven-step HFP M1 scope; assumed warm at HFP start. |
| micropipette_tip_box | decoration | content/objects/micropipette_tip_box.yaml | WS-OBJ-EQUIP | none | OBJECT_YAML_FORMAT.md object identity | DDS. Static rack of P20/P200/P1000 tips; pedagogy presence only. |
| professor_avatar | decoration | content/objects/professor_avatar.yaml | WS-OBJ-EQUIP | none | OBJECT_YAML_FORMAT.md object identity | HFP, DDS, PDT, CCS, MTT, CC. Instructor overlay used for prompts; no state, no gestures (UI overlay only). |

### M2 waste and virtual-target objects (WS-OBJ-WASTE)

| object_name | kind | target_file | workstream | state_fields_needed | spec_cite | notes |
| --- | --- | --- | --- | --- | --- | --- |
| biohazard_decant | waste | content/objects/biohazard_decant.yaml | WS-OBJ-WASTE | cn (enum: empty, mixed), cv (float, unit=ml, max=2000) | OBJECT_YAML_FORMAT.md contents pattern | MTT, CC. Solid/biohazard pour-off receptacle; receives MTT-treated media before DMSO solubilization. |
| sharps_container | waste | content/objects/sharps_container.yaml | WS-OBJ-WASTE | none (capabilities: clickable only, no contents tracked) | OBJECT_VOCABULARY.md capabilities (clickable) | HFP, DDS, PDT, CCS, MTT, CC. Receives used serological pipette barrels and pipette tips. New row vs legacy (legacy items did not declare it); pedagogy requires a non-liquid disposal target so the student does not drop tips in the vacuum waste. State-fields list is empty because the runtime does not track sharps contents at the bench. |

### Legacy rows dropped (with pedagogy reason)

- `cell_counter` (legacy `cell_counting_and_seeding`): redundant with
  hemocytometer; the protocol teaches manual quadrant counting, not an
  automated counter. Drop.
- `dilution_tube_rack` (legacy `cell_culture` decoration): legacy used
  this both as decoration and as the asset for individual dilution
  tubes. Replaced by `dilution_tube_rack_8` (structured) plus
  `microtube_15ml_intermediate` (flat). The decoration-only version is
  not needed because the structured rack carries its own visual.
- `micropipette_rack`, `drug_vials` (legacy `cell_culture` decoration):
  superseded by `micropipette_tip_box` (one decoration object) and by
  the explicit dilution rack. Two decoration objects collapsed into
  one.
- `professor` (legacy `cell_culture`, scene=overlay): kept but renamed
  `professor_avatar` for clarity that it is the instructor figure, not
  a real lab object.

### New rows added vs legacy (with pedagogy reason)

- `sterile_water_bottle`: legacy DDS lacked a water source. The
  pedagogy in [VOSS_DILUTIONS_GUIDE.md](../protocols/VOSS_DILUTIONS_GUIDE.md)
  explicitly contrasts water vs media as the diluent for the
  intermediate stock; without a water bottle the dilution math step
  is meaningless.
- `microtube_15ml_intermediate`: legacy DDS jumped directly from the
  10 mM parent stock to the 400 uM working series. Real bench practice
  builds a 400 uM intermediate first; pedagogy required a labeled
  intermediate tube as its own object.
- `dilution_tube_rack_8` (structured rack): legacy DDS authored eight
  separate `dilution_tube_carb_b..h` rows. The structured surface
  pattern from
  [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md) folds them
  into one object with eight subparts (saves seven YAML files and
  matches how an instructor describes the rack at the bench).
- `sharps_container`: legacy had no sharps target. Pedagogy: aspirating
  pipettes and serological pipette barrels are sharps; teaching the
  student to discard them into the vacuum waste is wrong. New object.
- `hood_surface`: legacy treated the BSC as scene-only background. The
  three-vocabulary split moves background visuals to a decoration
  object so a base scene can reference it by `object_name`.
- `micropipette_tip_box`: legacy had `micropipette_rack` (the gun rack)
  and no tip box. DDS pedagogy needs the visible tip box because tips
  are part of the variable-volume pipetting workflow.

### Concerns and open questions

- The `multichannel_pipette` channel structure is deferred under the
  named-groups deferral. Plate transfer in PDT and MTT teaches the
  student to think of all eight channels acting as one column. If a
  later authoring pain forces named groups, this row will gain a
  `structure` block.
- The `hemocytometer` four-quadrant count is modeled with four named
  `int` fields because named groups are deferred. If a future pass
  introduces a `count_quadrant` structured surface (list layout,
  count=4), these four fields collapse into one per-subpart field.
- The legacy archive used UTF-8 micro (Unicode mu) in tube labels
  (for example "4 uM"). Per
  [../MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md) every label here uses
  ASCII `uM` or `ul`; the object author must keep that escape on the
  way through.
- Capacities in `state_fields_needed` are minimum schema floors. The
  authoring pass (WP-PILOT-OBJ-1 and WS-OBJ-* lanes) may refine
  `min`, `max`, and `step` per object once the per-protocol contents
  registry is final.
