# Protocol -> object xref audit (full enumeration)

Date: 2026-05-28
Status: DONE_WITH_BLOCKERS

Mission: resolve every `step.sequence[].target` in every protocol to a
concrete scene + object_name. Flag broken, ambiguous, and fanout subparts.

## Resolution model

For every `step.sequence[].target` string in a `protocol.yaml`:

1. Split target on `.` to isolate base object name and optional subpart.
   Example: `treatment_plate.A1` -> base `treatment_plate`, subpart `A1`.
2. Build the protocol's scene scope:
   - every scene in `<protocol_dir>/scenes/*.yaml` (with `extends:` chain
     resolved into `content/base_scenes/`),
   - plus every base scene referenced by a `SceneChange.to_scene` op in
     the protocol's step responses (so protocols with no local
     `scenes/` directory still resolve against `content/base_scenes/`).
3. For each placement (own and inherited via `extends`), record
   `placement.object_name`.
4. Match the target base name against `object_name` across the scope.
5. Flag:
   - `UNRESOLVED` - no scene in scope declares that object_name.
   - `AMBIGUOUS` - object_name appears in multiple scenes in scope.
   - `FANOUT` - target carries a `.` subpart (resolved by structured
     object subpart logic at runtime, not by scene placement).

Method: scanned 34 `protocol.yaml` files plus all 18 `content/base_scenes/`
files. Helper script walked every step.sequence entry and built a full
target table. Sequence runners contain no `steps` and contribute zero
targets.

## Summary

| Metric | Count |
| --- | --- |
| Protocols scanned | 34 |
| Total target invocations | 452 |
| UNRESOLVED | 6 |
| AMBIGUOUS | 75 |
| FANOUT (subpart references) | 156 |

Protocol type breakdown:

- 10 mini-protocols under `content/protocols/cell_culture/`
- 15 mini-protocols under `content/protocols/sdspage/`
- 5 sequence runners under `content/protocols/runners/` (zero targets each)
- 3 dev_smoke protocols under `tests/content/dev_smoke/`
- 1 of 3 dev_smoke protocols has steps (`well_plate_96_zoom_check`); the
  other two (`bench_direct_check`, `plate_reader_check`) are step-empty.

## Per-protocol counts

| Protocol | Type | Targets | Unres | Ambig | Fanout |
| --- | --- | ---:| ---:| ---:| ---:|
| cell_seeding_plate_setup | mini | 16 | 0 | 0 | 0 |
| drug_dilution_setup | mini | 61 | 0 | 53 | 12 |
| mtt_plate_reaction | mini | 13 | 0 | 0 | 1 |
| mtt_reagent_prep | mini | 10 | 0 | 0 | 0 |
| mtt_solubilization_readout | mini | 10 | 0 | 3 | 3 |
| passage_hood_detachment | mini | 22 | 1 | 5 | 0 |
| passage_pellet_reseed | mini | 23 | 1 | 7 | 0 |
| plate_drug_treatment_drug_addition | mini | 151 | 0 | 0 | 133 |
| plate_drug_treatment_media_adjustment | mini | 12 | 0 | 0 | 4 |
| trypan_blue_counting | mini | 20 | 1 | 6 | 0 |
| sdspage_assemble_electrode_module | mini | 4 | 0 | 0 | 0 |
| sdspage_attach_lid_and_leads | mini | 3 | 0 | 0 | 0 |
| sdspage_destain_gel_rock | mini | 7 | 0 | 0 | 0 |
| sdspage_destain_gel_setup | mini | 10 | 0 | 0 | 0 |
| sdspage_extract_gel_from_cassette | mini | 10 | 0 | 1 | 0 |
| sdspage_fill_tank_buffer | mini | 8 | 0 | 0 | 0 |
| sdspage_heat_denature_samples | mini | 5 | 0 | 0 | 0 |
| sdspage_image_gel | mini | 9 | 2 | 0 | 0 |
| sdspage_load_protein_ladder | mini | 6 | 0 | 0 | 1 |
| sdspage_load_sample_single_lane | mini | 7 | 0 | 0 | 1 |
| sdspage_prepare_gel_cassette | mini | 4 | 0 | 0 | 0 |
| sdspage_prepare_running_buffer | mini | 8 | 0 | 0 | 0 |
| sdspage_prepare_sample_mix_single_lane | mini | 12 | 0 | 0 | 0 |
| sdspage_recycle_buffer | mini | 5 | 0 | 0 | 0 |
| sdspage_run_electrophoresis | mini | 3 | 0 | 0 | 0 |
| sdspage_stain_gel | mini | 12 | 0 | 0 | 0 |
| bench_direct_check | dev_smoke | 0 | 0 | 0 | 0 |
| plate_reader_check | dev_smoke | 0 | 0 | 0 | 0 |
| well_plate_96_zoom_check | dev_smoke | 1 | 1 | 0 | 1 |
| cell_culture_full | sequence_runner | 0 | 0 | 0 | 0 |
| routine_passage | sequence_runner | 0 | 0 | 0 | 0 |
| sdspage_full | sequence_runner | 0 | 0 | 0 | 0 |
| sdspage_load_samples_batch | sequence_runner | 0 | 0 | 0 | 0 |
| sdspage_prepare_sample_mix_batch | sequence_runner | 0 | 0 | 0 | 0 |

## BLOCKING - UNRESOLVED targets (6 invocations across 5 protocols)

These target base names do not match any `placement.object_name` in any
scene in the protocol's scope. The runtime cannot bind the target without
a fix to the scene YAML (add a placement) or to the protocol YAML
(rename the target).

| Protocol | Step | Target | Notes |
| --- | --- | --- | --- |
| passage_hood_detachment | incubate_for_detachment | incubator | No `incubator` placement in either scoped scene (`passage_hood_detachment_hood_workspace`, `passage_hood_detachment_microscope_view`). Sibling protocol `passage_pellet_reseed` declares `incubator` in its `hood_workspace`. |
| passage_pellet_reseed | aspirate_supernatant | biohazard_decant | No scene in scope declares `biohazard_decant`. Compare to `mtt_plate_reaction.biohazard_decant_bin` (different object name). |
| trypan_blue_counting | add_cell_suspension_to_chamber | cell_suspension_tube | No placement; sibling `cell_seeding_plate_setup` defines `cell_suspension_tube` in its `seeding_workspace`. |
| sdspage_image_gel | final_rinse (x2) | waste_container | Protocol references the scoped scene `imaging_bench`, which has no `waste_container` placement. The base `staining_bench` declares one, but `imaging_bench` does not, and the protocol does not include `staining_bench` in its scene flow. |
| well_plate_96_zoom_check | view_zoom_plate | well_plate_96.E7 | Dev-smoke protocol has no `scenes/` dir and no `SceneChange` operations, so the scope is empty. Base name `well_plate_96` plus subpart `E7`. |

Total UNRESOLVED invocations: 6. All 6 are BLOCKING for runtime use of
their respective steps.

## CONCERN - AMBIGUOUS targets (75 invocations across 8 protocols)

Target base name appears in multiple scenes in scope. The runtime needs
to pick one. Today's `interactionRegistry` adapter selects by active
scene context, but the YAML does not state which scene the click is
expected in. If a target is intended in only one scene, the duplicate
placement should be removed; if it is legitimately in both (the
scenes share a structured object), the adapter must continue to resolve
by active scene.

Aggregate by protocol:

| Protocol | Distinct ambiguous base names | Total ambiguous invocations |
| --- | --- | ---:|
| drug_dilution_setup | 9 | 53 |
| passage_hood_detachment | 1 (`t75_flask`) | 5 |
| passage_pellet_reseed | 5 | 7 |
| trypan_blue_counting | 1 (`hemocytometer_slide`) | 6 |
| mtt_solubilization_readout | 1 (`well_plate_96`) | 3 (also FANOUT) |
| sdspage_extract_gel_from_cassette | 1 (`staining_tray`) | 1 |

Representative ambiguous base names and their dual scenes:

| Protocol | Target base | Scene matches |
| --- | --- | --- |
| drug_dilution_setup | carboplatin_stock_bottle, metformin_stock_bottle, metformin_working_tube, micropipette, microtube_15ml_intermediate, vortex, dilution_tube_rack_8 | dilution_workspace, drug_dilution_setup_bench_setup |
| passage_hood_detachment | t75_flask | passage_hood_detachment_hood_workspace, passage_hood_detachment_microscope_view |
| passage_pellet_reseed | t75_flask, conical_15ml_rack, aspirating_pipette, label_pen | hood_workspace, centrifuge_workspace |
| trypan_blue_counting | hemocytometer_slide | hemocytometer_view, cell_counter_workspace |
| mtt_solubilization_readout | well_plate_96.all_wells | mtt_solubilization_readout_plate_reader_workspace, mtt_solubilization_readout_bench_workspace |
| sdspage_extract_gel_from_cassette | staining_tray | extraction_workspace, staining_bench |

Notes:

- `passage_hood_detachment.t75_flask` and `trypan_blue_counting.hemocytometer_slide`
  appearing in both a workspace scene and a zoom/microscope view is the
  intended cross-scene fanout (the same physical object is visible in two
  scenes). Adapter must resolve by active scene.
- `drug_dilution_setup` has the largest ambiguity surface (9 base names),
  because the protocol declares two scenes (`dilution_workspace` and
  `drug_dilution_setup_bench_setup`) that share most placements. Review
  whether the bench setup scene should be a strict subset/superset
  rather than a near-duplicate.

## INFO - FANOUT (156 invocations across 7 protocols)

Targets with `.` subpart syntax. These do not require scene-level
placement of the subpart; resolution is delegated to the structured
object adapter. Examples:

| Protocol | Subpart pattern | Count | Resolves via |
| --- | --- | ---:| --- |
| plate_drug_treatment_drug_addition | well_plate_96.<row><col> (B1..H12 minus row A) | 133 | well_plate_96 structured object |
| plate_drug_treatment_media_adjustment | well_plate_96.block_A_1_6, block_A_7_12, block_B_H_1_6, block_B_H_7_12 | 4 | well_plate_96 named blocks |
| drug_dilution_setup | dilution_tube_rack_8.tube_B..tube_G | 12 | dilution_tube_rack_8 structured object |
| mtt_plate_reaction | well_plate_96.all_wells | 1 | well_plate_96 named group |
| mtt_solubilization_readout | well_plate_96.all_wells | 3 | well_plate_96 named group |
| sdspage_load_protein_ladder | gel_cassette.lane_5 | 1 | gel_cassette structured object |
| sdspage_load_sample_single_lane | gel_cassette.lane_1 | 1 | gel_cassette structured object |
| well_plate_96_zoom_check | well_plate_96.E7 | 1 | UNRESOLVED + FANOUT (base also unresolved) |

These are not authoring defects per se: subpart references are valid
per `PROTOCOL_VOCABULARY.md` (explicit subparts; no named-group
construct except `all_wells` and `block_*` aliases declared on the
structured object). Confirm each subpart name is declared by the
parent object as a separate audit step (out of scope for this xref).

## Per-(protocol, target) compact roll-up

Full row-by-row data lives at `/tmp/xref_data.txt` (regenerated by the
helper). The compact unique-target rollup (one row per protocol+target,
with invocation count, resolved scenes, and aggregate flag) is in the
same artifact under the `=== COMPACT ===` section.

To regenerate from current YAML:

1. Write a `_temp.py` at repo root that walks
   `content/protocols/**/protocol.yaml` plus
   `tests/content/dev_smoke/**/protocol.yaml`, extracts
   `step.sequence[].target` from each, resolves placements from local
   scenes + base scenes via `extends:`, and resolves
   `SceneChange.to_scene` references against `content/base_scenes/`.
2. Run via `source source_me.sh && python3 _temp.py > /tmp/xref_data.txt`.

## Findings and follow-up

1. BLOCKING: 6 unresolved targets in 5 protocols. Each needs either a
   scene fix (declare the placement) or a protocol fix (rename the
   target). See the BLOCKING table above. The two `sdspage_image_gel`
   waste_container hits suggest the protocol should add a
   `staining_bench` scene step before `final_rinse`, or the
   `imaging_bench` scene should add a waste_container placement.

2. CONCERN: 9 ambiguous base names in `drug_dilution_setup` indicate
   structural duplication between `dilution_workspace` and
   `drug_dilution_setup_bench_setup`. Recommend reviewing whether the
   bench setup scene is meant to be a parent (use `extends:`), a strict
   subset, or a parallel scene.

3. CONCERN: Cross-scene targets `t75_flask`, `hemocytometer_slide`,
   `well_plate_96.all_wells`, `staining_tray` appear in both workspace
   and zoom/secondary scenes. These are legitimate but depend on the
   adapter resolving by active scene. Verify the adapter contract is
   documented in the registry implementation.

4. INFO: 156 fanout invocations confirm the structured-object subpart
   pattern is heavily used. Audit each parent object (`well_plate_96`,
   `dilution_tube_rack_8`, `gel_cassette`) to confirm every referenced
   subpart name is declared.

5. The 5 sequence runners and 2 step-empty dev_smoke protocols
   contribute zero targets and are correctly empty by design.

## Status

- Status label: DONE_WITH_BLOCKERS.
- Full enumeration complete (was: 8 of 34 spot-check).
- Blockers: 6 unresolved targets across 5 protocols listed above.
- Recommendation: fix BLOCKING entries before Milestone 4 pilot work
  on `sdspage_image_gel`, `passage_hood_detachment`,
  `passage_pellet_reseed`, `trypan_blue_counting`, or
  `well_plate_96_zoom_check`.
