# Round 3 M4: Scene Catalog Coverage Audit

Date: 2026-05-22
Scope: Every protocol under `content/protocols/`.
Method: For each protocol YAML, read `entry_step` and inspect its first
interaction's `response.scene_operations`. Predict whether the scene will
mount on protocol launch.

## Summary

- Protocols total: 31
- Mini-protocols: 26
- Sequence runners: 5 (mount via their first delegated mini-protocol)
- Predicted mount (`SceneChange` in first interaction's ops): 18 mini-protocols
- Predicted no-mount or unclear: 8 mini-protocols (the "cell_counter family")
- Sequence runners: 5 (out of scope for first-interaction check; depend on delegated mini-protocol)

## Coverage table

Columns: protocol_name | type | entry_step | first_target | gesture | scene_operations types | predicted mount

| protocol_name | type | entry_step | first_target | gesture | ops | predicted |
| --- | --- | --- | --- | --- | --- | --- |
| cell_seeding_plate_setup | mini_protocol | calculate_dilution_volume | serological_pipette | adjust | ObjectStateChange | no |
| drug_dilution_setup | mini_protocol | prepare_carb_parent_stock | micropipette | click | (empty) | no-ops |
| mtt_plate_reaction | mini_protocol | gather_mtt_materials | mtt_solution_bottle | click | (empty) | no-ops |
| mtt_reagent_prep | mini_protocol | pick_up_mtt_powder | mtt_powder_container | click | CursorAttach | no |
| mtt_solubilization_readout | mini_protocol | add_dmso_to_wells | micropipette | click | (empty) | no-ops |
| passage_hood_detachment | mini_protocol | inspect_confluence | microscope | click | SceneChange,ObjectStateChange | yes |
| passage_pellet_reseed | mini_protocol | transfer_to_conical | t75_flask | click | CursorAttach | no |
| plate_drug_treatment_drug_addition | mini_protocol | add_carb_row_b | micropipette | click | (empty) | no-ops |
| plate_drug_treatment_media_adjustment | mini_protocol | adjust_media_quadrant_a1_h6 | multichannel_pipette | click | (empty) | no-ops |
| trypan_blue_counting | mini_protocol | add_trypan_blue_to_chamber | micropipette | click | SceneChange,CursorAttach | yes |
| cell_culture_full | sequence_runner | inspect_confluence | (n/a) | (n/a) | (n/a) | runner |
| routine_passage | sequence_runner | inspect_confluence | (n/a) | (n/a) | (n/a) | runner |
| sdspage_full | sequence_runner | dilute_10x_concentrate | (n/a) | (n/a) | (n/a) | runner |
| sdspage_load_samples_batch | sequence_runner | swap_tip | (n/a) | (n/a) | (n/a) | runner |
| sdspage_prepare_sample_mix_batch | sequence_runner | add_protein_sample | (n/a) | (n/a) | (n/a) | runner |
| sdspage_assemble_electrode_module | mini_protocol | open_wing_clamps | electrode_module | click | SceneChange,ObjectStateChange | yes |
| sdspage_attach_lid_and_leads | mini_protocol | secure_apparatus | electrophoresis_tank | click | SceneChange,ObjectStateChange | yes |
| sdspage_destain_gel_rock | mini_protocol | rock_run | rocking_shaker | click | SceneChange | yes |
| sdspage_destain_gel_setup | mini_protocol | rinse_first | staining_tray | click | SceneChange | yes |
| sdspage_extract_gel_from_cassette | mini_protocol | disconnect_power_and_remove_lid | electrophoresis_tank | click | SceneChange | yes |
| sdspage_fill_tank_buffer | mini_protocol | fill_inner_chamber | serological_pipette | click | SceneChange | yes |
| sdspage_heat_denature_samples | mini_protocol | open_heat_block_lid | heat_block | click | SceneChange,ObjectStateChange | yes |
| sdspage_image_gel | mini_protocol | final_rinse | staining_tray | click | SceneChange | yes |
| sdspage_load_protein_ladder | mini_protocol | open_gel_workspace | gel_cassette | click | SceneChange | yes |
| sdspage_load_sample_single_lane | mini_protocol | swap_tip | p200_micropipette | click | SceneChange | yes |
| sdspage_prepare_gel_cassette | mini_protocol | open_package | mini_protean_gel | click | SceneChange,ObjectStateChange | yes |
| sdspage_prepare_running_buffer | mini_protocol | dilute_10x_concentrate | serological_pipette | click | SceneChange | yes |
| sdspage_prepare_sample_mix_single_lane | mini_protocol | add_protein_sample | micropipette | click | SceneChange | yes |
| sdspage_recycle_buffer | mini_protocol | inspect_buffer | electrophoresis_tank | click | SceneChange | yes |
| sdspage_run_electrophoresis | mini_protocol | set_voltage | power_supply | adjust | SceneChange,ObjectStateChange | yes |
| sdspage_stain_gel | mini_protocol | rinse_tray | staining_tray | click | SceneChange | yes |

## Predicted-mount breakdown

- yes (SceneChange in first interaction): 18 mini-protocols
- no (has ops but no SceneChange): 3 mini-protocols
  - cell_seeding_plate_setup (ObjectStateChange only)
  - mtt_reagent_prep (CursorAttach only)
  - passage_pellet_reseed (CursorAttach only)
- no-ops (empty scene_operations list): 5 mini-protocols
  - drug_dilution_setup
  - mtt_plate_reaction
  - mtt_solubilization_readout
  - plate_drug_treatment_drug_addition
  - plate_drug_treatment_media_adjustment
- runner (sequence_runner, delegates to mini-protocol): 5

Note on sdspage coverage: all 16 sdspage mini-protocols already declare a
SceneChange in their first interaction. The gap is concentrated in the
cell_culture cluster (only 2 of 10 cell_culture mini-protocols mount on
launch: passage_hood_detachment and trypan_blue_counting).

## cell_counter family (mount-fail siblings)

Eight mini-protocols share the missing-SceneChange root cause. All live
in the cell_culture cluster.

| protocol_name | entry_step | first_target | current ops |
| --- | --- | --- | --- |
| cell_seeding_plate_setup | calculate_dilution_volume | serological_pipette | ObjectStateChange |
| drug_dilution_setup | prepare_carb_parent_stock | micropipette | (empty) |
| mtt_plate_reaction | gather_mtt_materials | mtt_solution_bottle | (empty) |
| mtt_reagent_prep | pick_up_mtt_powder | mtt_powder_container | CursorAttach |
| mtt_solubilization_readout | add_dmso_to_wells | micropipette | (empty) |
| passage_pellet_reseed | transfer_to_conical | t75_flask | CursorAttach |
| plate_drug_treatment_drug_addition | add_carb_row_b | micropipette | (empty) |
| plate_drug_treatment_media_adjustment | adjust_media_quadrant_a1_h6 | multichannel_pipette | (empty) |

Family size: 8 (above the 3-protocol threshold for a content-side pass).

## Recommended fix plan

Each affected mini-protocol needs exactly one `SceneChange` scene operation
prepended (or merged into) the entry step's first interaction `response`.
The target scene is the workspace appropriate to the first target's home.

| protocol_name | suggested SceneChange.to_scene |
| --- | --- |
| cell_seeding_plate_setup | hood_workspace (serological_pipette + plate setup in hood) |
| drug_dilution_setup | hood_workspace |
| mtt_plate_reaction | hood_workspace (or plate_workspace if defined) |
| mtt_reagent_prep | hood_workspace |
| mtt_solubilization_readout | plate_workspace (DMSO into wells) |
| passage_pellet_reseed | hood_workspace |
| plate_drug_treatment_drug_addition | plate_workspace |
| plate_drug_treatment_media_adjustment | plate_workspace |

Authoritative scene names should be confirmed against the scene catalog
before applying. The pattern is:

```yaml
sequence:
  - target: <first_target>
    gesture: <existing>
    validator: <existing>
    response:
      scene_operations:
        - type: SceneChange
          to_scene: <workspace>
        - <existing operations preserved here>
```

## Verdict

- Keep: cell_counter family is real and shares one root cause.
- Reject: this is not a one-off; 8 protocols are affected.
- Next action: dispatch a content-side SceneChange-add pass across the
  eight cell_culture mini-protocols above. After the pass, re-run the
  walker against each entry step to verify mount.

## References

- A1 walker pass list (9 mounting protocols)
- R1 first-interaction SceneChange fix (applied to trypan_blue_counting)
- R2 base scene gallery (19 of 19 scenes render in isolation)
