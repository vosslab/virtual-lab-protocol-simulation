# Round 3 object frequency inventory

Ranked reference inventory for all 78 catalogued objects in
`content/objects/`, measured by occurrences of the object basename
in `content/base_scenes/*.yaml` and
`content/protocols/*/*/protocol.yaml`. Intended as the evidence base
for B2 priority drops and Round 3 visual polish triage.

## Methodology

- Object set: every `content/objects/*/*.yaml` tracked in git
  (78 files across 8 categories).
- Scene set: every `content/base_scenes/*.yaml` (19 files).
- Protocol set: every `content/protocols/*/*/protocol.yaml`
  (31 files).
- Reference count per object: `git grep -c "\b<basename>\b"`
  against each tree, summed across matching files. Hit-counts
  (not file-counts) so a step that names the object three times
  contributes three.
- `default_width_cm`: value of the `default_width:` key inside
  the object's own YAML under `layout.default_width`. `NA` when
  absent.
- Total references are `base_scene_refs + protocol_refs`.
- Generated with `_temp_freq.sh` (since removed) using
  `git ls-files`, `git grep -c`, `cut`, `paste`, `bc`.

Substring artifacts: word-boundary anchors keep `t75_flask` and
`t75_flask_new` distinct, but ambiguous short names that contain
each other (none observed in this set) would inflate counts; spot
checks of the top 5 against `git grep -l` confirmed no aliasing.

## Summary statistics

- Objects catalogued: 78
- Base scenes scanned: 19
- Protocols scanned: 31
- Category breakdown:
  | Category | Object count |
  | --- | --- |
  | bottle | 31 |
  | equipment | 22 |
  | decoration | 7 |
  | pipette | 7 |
  | rack | 4 |
  | waste | 4 |
  | flask | 2 |
  | plate | 1 |
- Objects with zero total references: 7
- Objects referenced only in protocols (no base_scene placement): 36
- Objects referenced only in base_scenes (no protocol step): 1
  (`counter_slide_cartridge`)

## Top 20 by total references

| Rank | Object | Category | base_scene | protocol | total | default_width_cm |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | well_plate_96 | plate | 1 | 291 | 292 | 14 |
| 2 | micropipette | pipette | 2 | 148 | 150 | 2 |
| 3 | staining_tray | equipment | 4 | 30 | 34 | 16 |
| 4 | dilution_tube_rack_8 | rack | 0 | 34 | 34 | 8 |
| 5 | serological_pipette | pipette | 2 | 24 | 26 | 3 |
| 6 | electrophoresis_tank | equipment | 2 | 24 | 26 | 18 |
| 7 | aspirating_pipette | pipette | 2 | 20 | 22 | 3 |
| 8 | microwave | equipment | 2 | 19 | 21 | 16 |
| 9 | microtube | bottle | 0 | 21 | 21 | 2 |
| 10 | media_bottle | bottle | 0 | 21 | 21 | 3 |
| 11 | incubator | equipment | 0 | 20 | 20 | 22 |
| 12 | power_supply | equipment | 2 | 17 | 19 | 18 |
| 13 | t75_flask | flask | 0 | 18 | 18 | 12 |
| 14 | rocking_shaker | equipment | 2 | 15 | 17 | 20 |
| 15 | multichannel_pipette | pipette | 0 | 17 | 17 | 6 |
| 16 | waste_container | waste | 8 | 8 | 16 | 4 |
| 17 | p200_micropipette | pipette | 2 | 14 | 16 | 2 |
| 18 | vortex | equipment | 2 | 13 | 15 | 12 |
| 19 | gel_cassette | equipment | 2 | 13 | 15 | 16 |
| 20 | lightbox | equipment | 2 | 12 | 14 | 18 |

## Full ranked table

| Rank | Object | Category | base_scene | protocol | total | default_width_cm |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | well_plate_96 | plate | 1 | 291 | 292 | 14 |
| 2 | micropipette | pipette | 2 | 148 | 150 | 2 |
| 3 | staining_tray | equipment | 4 | 30 | 34 | 16 |
| 4 | dilution_tube_rack_8 | rack | 0 | 34 | 34 | 8 |
| 5 | serological_pipette | pipette | 2 | 24 | 26 | 3 |
| 6 | electrophoresis_tank | equipment | 2 | 24 | 26 | 18 |
| 7 | aspirating_pipette | pipette | 2 | 20 | 22 | 3 |
| 8 | microwave | equipment | 2 | 19 | 21 | 16 |
| 9 | microtube | bottle | 0 | 21 | 21 | 2 |
| 10 | media_bottle | bottle | 0 | 21 | 21 | 3 |
| 11 | incubator | equipment | 0 | 20 | 20 | 22 |
| 12 | power_supply | equipment | 2 | 17 | 19 | 18 |
| 13 | t75_flask | flask | 0 | 18 | 18 | 12 |
| 14 | rocking_shaker | equipment | 2 | 15 | 17 | 20 |
| 15 | multichannel_pipette | pipette | 0 | 17 | 17 | 6 |
| 16 | waste_container | waste | 8 | 8 | 16 | 4 |
| 17 | p200_micropipette | pipette | 2 | 14 | 16 | 2 |
| 18 | vortex | equipment | 2 | 13 | 15 | 12 |
| 19 | gel_cassette | equipment | 2 | 13 | 15 | 16 |
| 20 | lightbox | equipment | 2 | 12 | 14 | 18 |
| 21 | hemocytometer_slide | equipment | 0 | 14 | 14 | 8 |
| 22 | centrifuge | equipment | 0 | 14 | 14 | 20 |
| 23 | cell_counter | equipment | 4 | 10 | 14 | 22 |
| 24 | microtube_15ml_intermediate | bottle | 0 | 13 | 13 | 2 |
| 25 | hemocytometer | equipment | 0 | 12 | 12 | 12 |
| 26 | heat_block | equipment | 2 | 10 | 12 | 20 |
| 27 | electrode_module | equipment | 2 | 9 | 11 | 16 |
| 28 | conical_15ml | bottle | 0 | 11 | 11 | 3 |
| 29 | running_buffer_1x_carboy | bottle | 2 | 8 | 10 | 4 |
| 30 | metformin_working_tube | bottle | 0 | 10 | 10 | 2 |
| 31 | ddh2o_bottle | bottle | 4 | 6 | 10 | 3 |
| 32 | microscope | equipment | 4 | 5 | 9 | 16 |
| 33 | mtt_solution_tube | bottle | 0 | 8 | 8 | 2 |
| 34 | microtube_rack_24 | rack | 4 | 4 | 8 | 10 |
| 35 | recycle_buffer_bottle | bottle | 2 | 5 | 7 | 3 |
| 36 | plate_reader | equipment | 0 | 7 | 7 | 18 |
| 37 | label_pen | pipette | 0 | 7 | 7 | 2 |
| 38 | conical_tube_for_dilution | bottle | 0 | 7 | 7 | 3 |
| 39 | protein_ladder_tube | bottle | 4 | 2 | 6 | 2 |
| 40 | pbs_bottle | bottle | 0 | 5 | 5 | 3 |
| 41 | mtt_powder_container | bottle | 0 | 5 | 5 | 2 |
| 42 | kimwipe_pad | decoration | 2 | 3 | 5 | 3 |
| 43 | hood_surface | equipment | 2 | 3 | 5 | 50 |
| 44 | gel_opening_tool | equipment | 2 | 3 | 5 | 2 |
| 45 | destain_waste_bottle | bottle | 2 | 3 | 5 | 3 |
| 46 | running_buffer_10x_bottle | bottle | 2 | 2 | 4 | 3 |
| 47 | p10_gel_loading_tip_box | decoration | 2 | 2 | 4 | 8 |
| 48 | mini_protean_gel | equipment | 2 | 2 | 4 | 10 |
| 49 | destain_bottle | bottle | 2 | 2 | 4 | 3 |
| 50 | counter_slide_cartridge | rack | 4 | 0 | 4 | 8 |
| 51 | coomassie_stain_bottle | bottle | 2 | 2 | 4 | 3 |
| 52 | coomassie_recycle_bottle | bottle | 2 | 2 | 4 | 3 |
| 53 | trypsin_bottle | bottle | 0 | 3 | 3 | 3 |
| 54 | protein_sample_tube | bottle | 2 | 1 | 3 | 2 |
| 55 | mtt_solution_bottle | bottle | 0 | 3 | 3 | 4 |
| 56 | metformin_stock_bottle | bottle | 0 | 3 | 3 | 3 |
| 57 | lens_tissue | decoration | 0 | 3 | 3 | 4 |
| 58 | laemmli_4x_bottle | bottle | 2 | 1 | 3 | 3 |
| 59 | ethanol_bottle | bottle | 2 | 1 | 3 | 3 |
| 60 | conical_15ml_rack | rack | 0 | 3 | 3 | 10 |
| 61 | cell_suspension_tube | bottle | 0 | 3 | 3 | 3 |
| 62 | carboplatin_stock_bottle | bottle | 0 | 3 | 3 | 3 |
| 63 | bme_bottle | bottle | 2 | 1 | 3 | 3 |
| 64 | biohazard_decant_bin | waste | 0 | 3 | 3 | 4 |
| 65 | trypan_blue_bottle | bottle | 0 | 2 | 2 | 3 |
| 66 | sterile_water_bottle | bottle | 0 | 2 | 2 | 3 |
| 67 | paper_towel_pad | decoration | 0 | 2 | 2 | 6 |
| 68 | micropipette_tip_box | decoration | 0 | 2 | 2 | 10 |
| 69 | gel_comb | equipment | 2 | 0 | 2 | 8 |
| 70 | dmso_bottle | bottle | 0 | 2 | 2 | 3 |
| 71 | biohazard_decant | waste | 0 | 1 | 1 | 4 |
| 72 | water_bath | equipment | 0 | 0 | 0 | 18 |
| 73 | t75_flask_new | flask | 0 | 0 | 0 | 12 |
| 74 | sharps_container | waste | 0 | 0 | 0 | 4 |
| 75 | professor_avatar | decoration | 0 | 0 | 0 | 8 |
| 76 | p10_micropipette | pipette | 0 | 0 | 0 | 2 |
| 77 | p10_gel_loading_tip | decoration | 0 | 0 | 0 | 1 |
| 78 | mtt_vial | bottle | 0 | 0 | 0 | 2 |

## Zero-reference objects (B2 priority drop candidates)

These seven objects are catalogued under `content/objects/` but never
referenced by any base scene or protocol. They are the strongest
candidates for B2 priority drops in the Round 3 polish pass: no
runtime surface, no visual cost.

| Object | Category | default_width_cm | Note |
| --- | --- | --- | --- |
| water_bath | equipment | 18 | Equipment item without placement; verify whether a future protocol needs it before drop. |
| t75_flask_new | flask | 12 | Likely supersedes `t75_flask` (rank 13, 18 refs); review for rename/merge rather than drop. |
| sharps_container | waste | 4 | Safety prop only; low polish value. |
| professor_avatar | decoration | 8 | Decoration; non-scientific asset. |
| p10_micropipette | pipette | 2 | Pipette variant; `p200_micropipette` (rank 17) and generic `micropipette` (rank 2) carry the load. |
| p10_gel_loading_tip | decoration | 1 | Disposable; `p10_gel_loading_tip_box` (rank 47) handles the box. |
| mtt_vial | bottle | 2 | Likely superseded by `mtt_powder_container` / `mtt_solution_tube` / `mtt_solution_bottle`. |

## Long-tail single-digit references

Ranks 53-71 (19 objects) carry total references between 1 and 3.
Most are protocol-specific reagent bottles. They are not zero-ref,
but are reasonable secondary B2 candidates if the polish budget is
tight: each one appears in at most one or two protocol steps.

## Notable patterns

- `well_plate_96` dominates the protocol surface (291 hits) because
  multi-well operations expand by well address.
- The generic `micropipette` (rank 2) plus specific
  `p200_micropipette` (rank 17) and `multichannel_pipette` (rank 15)
  together total 183 references; the pipette family is the second
  heaviest visual load after the plate.
- Equipment dominates the visible scene baseline: 11 of the top 20
  are `equipment/` category, reflecting that base scenes mostly
  place fixed instruments.
- 36 objects have a `base_scene_refs` of 0 and a positive
  `protocol_refs`. These are inventory items spawned by protocol
  steps rather than pre-placed by the scene.
