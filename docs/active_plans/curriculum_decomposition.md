# Curriculum decomposition map

This document is the WP-DECOMP-0 deliverable for the scene-runtime refactor
plan. It maps the two existing monolithic protocols and the eight legacy
tutorials onto the proposed mini-protocol set so that WP-DECOMP-1 through
WP-DECOMP-7 can author each new mini-protocol from a single source of truth.

This is an authoring map only. No YAML under `content/` is edited by this
work package. Source line ranges below are taken from the current HEAD of
`content/cell_culture/protocol.yaml` (909 lines) and
`content/plate_drug_treatment/protocol.yaml` (866 lines).

## Proposed mini-protocol set

The plan replaces the two monoliths with five focused mini-protocols and one
sequence runner that strings them together.

| New protocol id                            | protocol_type     | Draft step count | Entry scene             | One-line learning goal                                                                       |
| ------------------------------------------ | ---------------- | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| hood_flask_prep                            | mini_protocol    | 7                | hood                    | Set up the sterile hood and prepare an adherent flask through trypsinization and spin-down.  |
| cell_counting_and_seeding                  | mini_protocol    | 7                | bench                   | Count cells on a hemocytometer and seed a defined density into a 96-well plate.              |
| drug_dilution_setup                        | mini_protocol    | 8                | well_plate_workspace    | Plan the carboplatin and metformin dilution series and the media-adjustment ordering rule.   |
| plate_drug_treatment                       | mini_protocol    | 9                | well_plate_workspace    | Execute the Day-2 plate dosing with media-adjusted wells, carboplatin series, and metformin. |
| mtt_assay_readout                          | mini_protocol    | 7                | hood                    | Run the Day-4 MTT incubation, DMSO solubilization, and plate-reader absorbance readout.      |
| cell_culture_full                          | sequence_runner  | 5 (sequence)     | hood (matches mini #1)  | Walk students through the full OVCAR8 carboplatin-and-metformin MTT IC50 protocol end-to-end.|

Step counts are drafts inside the 6-to-10 step gate from `docs/PRIMARY_SPEC.md`
and may shift by one or two during authoring.

## Mapping: content/cell_culture/protocol.yaml

The 909-line cell_culture monolith currently declares seven parts
(`part1_split` through `part7_read`) over three days. Each authored step maps
to exactly one new mini-protocol. The sequence runner reuses none of these
steps directly; it composes the new mini-protocols instead.

| Source step id      | Source line | Source part   | Target mini-protocol                       | Notes                                                              |
| ------------------- | ----------- | ------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| spray_hood          | 33          | part1_split   | hood_flask_prep         | Becomes step 1 of new mini.                                        |
| aspirate_old_media  | 50          | part1_split   | hood_flask_prep         | Survives as authored.                                              |
| pbs_wash            | 71          | part1_split   | hood_flask_prep         | Survives as authored.                                              |
| add_trypsin         | 103         | part1_split   | hood_flask_prep         | Survives as authored.                                              |
| neutralize_trypsin  | 134         | part1_split   | hood_flask_prep         | Survives as authored.                                              |
| centrifuge          | 167         | part1_split   | hood_flask_prep         | Closes flask prep with the spin-down.                              |
| resuspend           | 184         | part1_split   | hood_flask_prep         | Final step of new mini; produces the cell suspension.              |
| count_cells         | 217         | part2_count   | cell_counting_and_seeding         | Becomes step 1 of new mini.                                        |
| seed_plate          | 235         | part3_seed    | cell_counting_and_seeding         | Survives as authored.                                              |
| incubate_day1       | 266         | part3_seed    | cell_counting_and_seeding         | Final step of new mini; closes Day 1.                              |
| carb_intermediate   | 284         | part4_dilute  | drug_dilution_setup            | Survives as the carboplatin intermediate calculation step.         |
| carb_low_range      | 329         | part4_dilute  | drug_dilution_setup            | Survives as the low-range dilution step.                           |
| metformin_stock     | 535         | part4_dilute  | drug_dilution_setup            | Survives as the metformin stock calculation step.                  |
| prewarm_media       | 584         | part5_treat   | drug_dilution_setup            | Moves earlier as a prep step; closes the planning mini.            |
| media_adjust        | 601         | part5_treat   | plate_drug_treatment              | Opens the dosing mini; encodes the media-adjust-before-drug rule.  |
| add_carboplatin     | 626         | part5_treat   | plate_drug_treatment              | Survives; rewrite content overlaps WP-DECOMP-4.                    |
| add_metformin       | 748         | part5_treat   | plate_drug_treatment              | Survives; rewrite content overlaps WP-DECOMP-4.                    |
| incubate_48h        | 781         | part5_treat   | plate_drug_treatment              | Final step of dosing mini.                                         |
| add_mtt             | 799         | part6_mtt     | mtt_assay_readout                 | Becomes step 1 of MTT mini.                                        |
| incubate_mtt        | 819         | part6_mtt     | mtt_assay_readout                 | Survives as authored.                                              |
| decant_mtt          | 837         | part6_mtt     | mtt_assay_readout                 | Survives as authored.                                              |
| add_dmso            | 856         | part6_mtt     | mtt_assay_readout                 | Survives as authored.                                              |
| plate_read          | 876         | part7_read    | mtt_assay_readout                 | Survives; absorbs the plate-reader interaction.                    |
| results             | 894         | part7_read    | mtt_assay_readout                 | Final step; results review and exit.                               |

No cell_culture step is dropped. The `parts` and `days` framing of the
monolith is dropped because each new mini-protocol declares its own
single-part, single-day frame per `docs/PRIMARY_SPEC.md`.

## Mapping: content/plate_drug_treatment/protocol.yaml

The 866-line plate drug additions monolith currently declares 14 authored
steps under one part and one day. The new `plate_drug_treatment`
mini-protocol is a rewrite that survives the dosing-execution steps and
hands the math-only steps over to `drug_dilution_setup`.

| Source step id              | Source line | Disposition                                | Target mini-protocol or note                                                  |
| --------------------------- | ----------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| open_plate_workspace        | 14          | Survives                                   | plate_drug_treatment; remains step 1 of the dosing mini.             |
| calc_carb_parent_stock      | 42          | Moves to planning mini                     | drug_dilution_setup; merged with carb_intermediate from monolith. |
| calc_carb_first_dilution    | 83          | Moves to planning mini                     | drug_dilution_setup.                                              |
| calc_carb_pattern_check     | 124         | Dropped (consolidates into pattern check)  | Merged into a single planning step under drug_dilution_setup.     |
| calc_carb_last_dilution     | 165         | Moves to planning mini                     | drug_dilution_setup.                                              |
| prep_carb_first_dilution    | 206         | Survives                                   | plate_drug_treatment; physical dilution prep step.                   |
| prep_carb_middle_transition | 272         | Survives                                   | plate_drug_treatment.                                                |
| prep_carb_last_dilution     | 304         | Survives                                   | plate_drug_treatment.                                                |
| prep_metformin_dilution     | 370         | Survives                                   | plate_drug_treatment.                                                |
| add_media_cols_1_6          | 436         | Survives                                   | plate_drug_treatment; encodes media-adjust-before-drug ordering.     |
| add_media_cols_7_12         | 485         | Survives                                   | plate_drug_treatment.                                                |
| add_carboplatin             | 534         | Survives                                   | plate_drug_treatment.                                                |
| calc_metformin_working_stock| 710         | Moves to planning mini                     | drug_dilution_setup; merged with metformin_stock from monolith.   |
| calc_metformin_final_well   | 751         | Dropped (covered by planning mini)         | Folded into the metformin planning step.                                      |
| add_metformin               | 792         | Survives                                   | plate_drug_treatment.                                                |
| review_loaded_plate         | 841         | Survives                                   | plate_drug_treatment; final review step of the dosing mini.          |

Orphaned references such as the `distilled_water` reagent inside several
dilution steps are dropped during the rewrite; water sources are scoped to
the plate workspace toolbox and do not need to be student-visible scene
objects.

## Triage of the eight existing tutorials

The legacy tutorial folders predate the mini-protocol contract. WP-DECOMP-7
will act on these recommendations. The table classifies each tutorial as
absorb (its content folds into a new mini-protocol), retire-to-dev_smoke (it
becomes a `protocol_type: dev_smoke` diagnostic, not student curriculum), or
expand-and-keep (it stays as a standalone mini-protocol after a content
expansion to meet the 6-to-10 step gate).

| Tutorial folder                  | Lines | Status | Disposition                                          | Evidence                                                                                      |
| -------------------------------- | ----- | ------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| tutorial_bench_direct            | 26    | DONE   | Moved to tests/content/dev_smoke/bench_direct_check/ with protocol_type: dev_smoke         | git mv tracked files; protocol_type set; git status confirms renames (R, RM)                   |
| tutorial_cell_counter            | 27    | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |
| tutorial_drug_dilution           | 54    | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |
| tutorial_hemocytometer_count     | 50    | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |
| tutorial_hood_transfer           | 40    | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |
| tutorial_pbs                     | 133   | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |
| tutorial_plate_reader            | 27    | DONE   | Moved to tests/content/dev_smoke/plate_reader_check/ with protocol_type: dev_smoke        | git mv tracked files; protocol_type set; git status confirms renames (R, RM)                   |
| tutorial_split                   | 88    | DONE   | Deleted via git rm; no tracked files remain         | Six absorb tutorials deleted; git status confirms (D) entries                                 |

After absorption, no standalone tutorial in the table survives as a
student-facing mini-protocol. Two diagnostics survive only as `dev_smoke`
protocols and should be moved out of the student curriculum index.

## Decisions made where the plan was ambiguous

The following routing choices should be confirmed before WP-DECOMP-1 through
WP-DECOMP-5 dispatch.

- The entry scene for `cell_counting_and_seeding` is set to `bench`,
  not `hood`. The plan listed both as candidates. The hemocytometer count and
  seeding-volume calculation happen at the bench in the source monolith.
- The entry scene for `drug_dilution_setup` is set to
  `well_plate_workspace`, not `hood`. The planning mini is math-first and the
  plate workspace is where the dose pattern is visualized.
- The entry scene for `mtt_assay_readout` is set to `hood` because
  the MTT add, decant, and DMSO solubilization steps in the monolith are
  hood-scene steps; only `plate_read` is a bench or reader-scene step.
- `tutorial_pbs` (133 lines) is absorbed rather than expanded. It is the
  largest legacy tutorial and could be argued either way; the user should
  confirm that PBS wash is not promoted to its own mini-protocol.
- `prewarm_media` from the cell_culture monolith is routed into the planning
  mini rather than the dosing mini so that the dosing mini stays at nine
  steps and inside the gate.
- `calc_carb_pattern_check` and `calc_metformin_final_well` from the plate
  drug additions monolith are merged into adjacent planning steps rather
  than carried over one-for-one. This keeps the planning mini at eight steps.

## Residual risks

- Source steps with heavy `plateMap` annotations (open_plate_workspace, the
  add-media steps, and the carboplatin and metformin add steps) carry plate
  metadata that the new dosing mini must preserve faithfully. The map above
  routes these steps but does not yet enumerate which annotations move.
- The `results` step at line 894 of cell_culture has been routed into
  `mtt_assay_readout`. If the sequence runner needs its own results
  summary step, the routing may need to flip to the sequence runner instead.
- Orphaned reagents such as `distilled_water` referenced inside dilution
  steps of the plate drug additions monolith are flagged as dropped. The
  rewrite should confirm no scene-object dependency remains on these
  reagents before WP-DECOMP-4 closes.
