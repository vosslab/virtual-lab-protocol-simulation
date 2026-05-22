# Coverage evidence log for dazzling-juggling-tide

This file accumulates per-MP coverage-matrix entries as M2 lands minis and subsequent patches verify their canonical-action coverage against the OVCAR8 source document. M1 creates the empty scaffold. Each WP-MP-N patch appends rows to the coverage matrix as its mini is delivered and validated.

## Coverage matrix (A1-A57)

| Action ID | Description | Status | Where (mini.step) | Notes |
| --- | --- | --- | --- | --- |
| A1 | Inspect cells; confirm 70-80% confluency | PRESENT-EXPLICIT | passage_hood_detachment.inspect_confluence | Microscope click triggers SceneChange to microscope_view, updates t75_flask.inspection_status |
| A2 | Spray hood with 70% ethanol | PRESENT-EXPLICIT | passage_hood_detachment.spray_hood_with_ethanol | Ethanol_bottle click updates hood_surface.surface_cleanliness to ethanol_sprayed |
| A3-prep | Warm reagents (PBS, trypsin, media) -- IMPLIED PREP, not OVCAR8 doc-explicit. NON-COUNTED prep action | NOT-INCLUDED | | Pedagogically optional; protocol focuses on core detachment technique |
| A4 | Aspirate spent media from plate | PRESENT-EXPLICIT | passage_hood_detachment.aspirate_spent_media | Aspirating_pipette click, then flask click removes spent media |
| A5 | Wash with ~4 mL PBS | PRESENT-EXPLICIT | passage_hood_detachment.pbs_wash | Pipette adjust to 4 mL, PBS_bottle click draws PBS, flask click dispenses |
| A6 | Aspirate PBS | PRESENT-EXPLICIT | passage_hood_detachment.aspirate_pbs | Aspirating_pipette click, then flask click removes PBS wash |
| A7 | Add trypsin (volume by plate size) | PRESENT-EXPLICIT | passage_hood_detachment.add_trypsin | Pipette adjust to ~3 mL for T75, trypsin_bottle click draws, flask click dispenses |
| A8 | Incubate ~2 min for detachment | PRESENT-EXPLICIT | passage_hood_detachment.incubate_for_detachment | Incubator click triggers TimedWait primitive (120 seconds) |
| A9 | Confirm detachment under microscope | PRESENT-EXPLICIT | passage_hood_detachment.confirm_detachment | Microscope click triggers SceneChange to microscope_view, updates t75_flask.material_name to cell_suspension |
| A10 | Neutralize trypsin (3x media volume) | PRESENT-EXPLICIT | passage_hood_detachment.neutralize_trypsin | Pipette adjust to ~9 mL, media_bottle click draws, flask click dispenses to neutralize |
| A11 | Transfer to 15 mL conical tube | PRESENT-EXPLICIT | passage_pellet_reseed.transfer_to_conical | Interaction 2: click conical_15ml_rack; ObjectStateChange sets conical_15ml.material_name = cell_suspension |
| A12 | Label conical tube | PRESENT-EXPLICIT | passage_pellet_reseed.label_conical_tube | Interactions 1-2: click label_pen, then type on conical_15ml |
| A13 | Centrifuge | PRESENT-EXPLICIT | passage_pellet_reseed.centrifuge_spin | Interactions 3-5: click centrifuge, adjust rpm (200), adjust time (5 min), click to run; TimedWait 5000 ms |
| A14 | Aspirate supernatant | PRESENT-EXPLICIT | passage_pellet_reseed.aspirate_supernatant | Interactions 1-3: click aspirating_pipette, click conical_15ml (material_volume->0.1), click biohazard_decant |
| A15 | Resuspend pellet | PRESENT-EXPLICIT | passage_pellet_reseed.resuspend_pellet | Interactions 1-3: click aspirating_pipette, click media_bottle (held_material->fresh_media), click conical_15ml (material->cell_suspension) |
| A16 | Split at 1:7 (volume calculation) | PRESENT-EXPLICIT | passage_pellet_reseed.calculate_split_volume | Interactions 1-3: click aspirating_pipette, click conical_15ml (held_material=cell_suspension, held_volume=1.14), adjust set_volume to 1.14 (+/-0.2 tolerance) |
| A17 | Add fresh media to new plate | PRESENT-EXPLICIT | passage_pellet_reseed.add_fresh_media_to_plate | Interactions 1-2: click media_bottle (SceneChange->hood_workspace), click well_plate_96 (material->fresh_media, volume->7) |
| A18 | Label plate (cell line, date, passage #, initials) | PRESENT-EXPLICIT | passage_pellet_reseed.label_plate | Interactions 1-2: click label_pen, then type on well_plate_96 |
| A19 | Return new plate to incubator | PRESENT-EXPLICIT | passage_pellet_reseed.return_to_incubator | Interactions 1-2: click well_plate_96, click incubator (door_open->false) |
| A20 | Add 10 microL Trypan Blue to diamond chamber | PRESENT-EXPLICIT | trypan_blue_counting.add_trypan_blue_to_chamber | Micropipette adjust to 10 uL, click trypan_blue_bottle (draws trypan_blue), click hemocytometer_slide (dispenses); hemocytometer_slide.material_name->trypan_blue, material_volume->0.01 mL |
| A21 | Add 10 microL cell suspension | PRESENT-EXPLICIT | trypan_blue_counting.add_cell_suspension_to_chamber | Micropipette adjust to 10 uL, click cell_suspension_tube (draws cell_suspension), click hemocytometer_slide (dispenses into same chamber); hemocytometer_slide.material_name->trypan_blue_mixture, material_volume->0.02 mL |
| A22 | Mix by pipetting | PRESENT-EXPLICIT | trypan_blue_counting.mix_by_pipetting | Micropipette click, then click hemocytometer_slide (3-4 pipetting passes); verifies trypan_blue_mixture state ready for loading |
| A23 | Load 10 microL mixture into semicircle chamber | PRESENT-EXPLICIT | trypan_blue_counting.load_semicircle_chamber | Micropipette adjust to 10 uL, click hemocytometer_slide for loading chamber fill; hemocytometer_slide.material_volume->0.03 mL (accumulation of A20, A21, A23 dispenses) |
| A24 | Wipe off excess | PRESENT-EXPLICIT | trypan_blue_counting.wipe_off_excess | Click lens_tissue, then click hemocytometer_slide; hemocytometer_slide.excess_wiped->true, maintaining chamber saturation |
| A25 | Insert slide into cell counter | PRESENT-EXPLICIT | trypan_blue_counting.insert_slide_into_counter | SceneChange from hemocytometer_view to cell_counter_workspace; click cell_counter (slide_loaded->true). Cross-workspace transition is pedagogically necessary boundary: manual (A20-A24) vs. automated (A25-A28). |
| A26 | Wait for focus | PRESENT-EXPLICIT | trypan_blue_counting.wait_for_focus | Click cell_counter; TimedWait primitive 0.05 min (3 seconds, display='spinner'); cell_counter.focused->true |
| A27 | Press Capture (record count + viability) | PRESENT-EXPLICIT | trypan_blue_counting.press_capture | Click cell_counter (Capture button interaction); cell_counter.capture_pressed->true, cell_count and viability_percent outputs populated by analyzer |
| A28 | Viability gate >90% | PRESENT-EXPLICIT | trypan_blue_counting.verify_viability_gate | Select gesture on cell_counter; validator target_with_value checks viability_percent >= 90; cell_counter.viability_verified->true or -> false (gates downstream progression to MP-4 cell seeding) |
| A29 | Prepare 12 mL of 2x10^5 cells/mL suspension (dilution math) | PRESENT-EXPLICIT | cell_seeding_plate_setup.calculate_dilution_volume, prepare_diluted_suspension | Dilution calculation and suspension prep across two steps; uses micropipette adjust + material transfers |
| A30 | Seed 100 microL per well into 96-well plate | PRESENT-EXPLICIT | cell_seeding_plate_setup.seed_96_well_plate | Micropipette adjust to 100 microL, draws from dilution tube, seeds all wells via click gesture |
| A31 | Incubate 24 h for attachment | PRESENT-EXPLICIT | cell_seeding_plate_setup.incubate_for_attachment | TimedWait 1440 minutes (24 hours) in incubator after plate placement |
| A32 | Per-quadrant media adjustment (100/90/95/85 microL) | PRESENT-EXPLICIT | plate_drug_treatment_media_adjustment.adjust_media_quadrant_a1_h6, adjust_media_quadrant_a7_h12 | MP-6 delivered |
| A33 | Prepare working stocks (Part 4) | PRESENT-MERGED | drug_dilution_setup (MP-5 actions A47-A57) | Covered by MP-5 actions A47-A57 (drug_dilution_setup) per plan mapping; A33 is the Part 4 working-stock prep umbrella satisfied by the detailed stock-prep actions. |
| A34 | Add 5 microL Carboplatin to cols 1-12, rows B-H | PRESENT-EXPLICIT | plate_drug_treatment_drug_addition.add_carb_row_b through add_carb_row_h | MP-7 delivered |
| A35 | Row A cols 1-6 untreated control | PRESENT-EXPLICIT | plate_drug_treatment_media_adjustment.adjust_media_quadrant_a1_h6 | MP-6 delivered |
| A36 | Row A cols 7-12 Metformin-only control (gets 5 microL met) | PRESENT-EXPLICIT | plate_drug_treatment_media_adjustment.adjust_media_quadrant_a7_h12 | MP-6 delivered |
| A37 | Add 5 microL Metformin to cols 7-12, rows B-H | PRESENT-EXPLICIT | plate_drug_treatment_drug_addition.add_metformin_cols_7_12 | MP-7 delivered |
| A38 | Incubate 48 h for drug effect | PRESENT-EXPLICIT | plate_drug_treatment_drug_addition.incubate_48h | MP-7 delivered |
| A39 | Prepare 12 mM MTT (dissolve 5 mg + 1 mL PBS) | PRESENT-EXPLICIT | mtt_reagent_prep.prepare_solution_tube, dissolve_and_mix | MP-8 delivered |
| A40 | Add 25 microL of 12 mM MTT per well | PRESENT-EXPLICIT | mtt_plate_reaction.add_mtt_to_wells | MP-9 delivered |
| A41 | Incubate 1.5 h for formazan conversion | PRESENT-EXPLICIT | mtt_plate_reaction.incubate_formazan_conversion | MP-9 delivered |
| A42 | Decant MTT into biohazard bin | PRESENT-EXPLICIT | mtt_plate_reaction.decant_mtt_to_waste | MP-9 delivered |
| A43 | Pat plate dry on paper towels | PRESENT-EXPLICIT | mtt_plate_reaction.pat_plate_dry | MP-9 delivered |
| A44 | Add 200 microL DMSO per well | PRESENT-EXPLICIT | mtt_solubilization_readout.add_dmso_to_wells | MP-10 delivered |
| A45 | Pipette up/down ~10x (trituration) | PRESENT-EXPLICIT | mtt_solubilization_readout.trituration_to_dissolve | MP-10 delivered |
| A46 | Read absorbance at 560 nm | PRESENT-EXPLICIT | mtt_solubilization_readout.read_absorbance | MP-10 delivered |
| A47 | Carboplatin 200 microM intermediate (20 microL + 980) | PRESENT-EXPLICIT | drug_dilution_setup.prepare_carb_intermediate, add_diluent_to_intermediate, vortex_intermediate | MP-5 delivered |
| A48-A55 | 8 carboplatin working stocks (full series) | PRESENT-EXPLICIT | drug_dilution_setup.prepare_carb_400nm through label_carb_2mm (8 stocks x 3 steps each) | MP-5 delivered |
| A56 | 10 mM metformin working stock (10 microL 1 M + 990) | PRESENT-EXPLICIT | drug_dilution_setup.prepare_metformin_10mm, fill_metformin_media, vortex_metformin, label_metformin | MP-5 delivered |
| A57 | >=60 microL metformin volume gate | PRESENT-EXPLICIT | drug_dilution_setup.verify_metformin_volume (target_with_value enforces >=1000 µL) | MP-5 delivered |

## Reference: Canonical OVCAR8 action map

For MP authors authoring minis M2 onward, the full canonical action map from the plan is reproduced below for reference so you do not need to retrieve the plan file repeatedly.

| ID | Action | Cluster |
| --- | --- | --- |
| A1  | Inspect cells; confirm 70-80% confluency | passage_hood_detachment |
| A2  | Spray hood with 70% ethanol | passage_hood_detachment |
| A3-prep | Warm reagents (PBS, trypsin, media) -- IMPLIED PREP, not OVCAR8 doc-explicit. NON-COUNTED prep action: not part of the 57-action accounting; include only if the mini teaches reagent prep | optional / passage_hood_detachment |
| A4  | Aspirate spent media from plate | passage_hood_detachment |
| A5  | Wash with ~4 mL PBS | passage_hood_detachment |
| A6  | Aspirate PBS | passage_hood_detachment |
| A7  | Add trypsin (volume by plate size) | passage_hood_detachment |
| A8  | Incubate ~2 min for detachment | passage_hood_detachment |
| A9  | Confirm detachment under microscope | passage_hood_detachment |
| A10 | Neutralize trypsin (3x media volume) | passage_hood_detachment |
| A11 | Transfer to 15 mL conical tube | passage_pellet_reseed |
| A12 | Label conical tube | passage_pellet_reseed |
| A13 | Centrifuge | passage_pellet_reseed |
| A14 | Aspirate supernatant | passage_pellet_reseed |
| A15 | Resuspend pellet | passage_pellet_reseed |
| A16 | Split at 1:7 (volume calculation) | passage_pellet_reseed |
| A17 | Add fresh media to new plate | passage_pellet_reseed |
| A18 | Label plate (cell line, date, passage #, initials) | passage_pellet_reseed |
| A19 | Return new plate to incubator | passage_pellet_reseed |
| A20 | Add 10 microL Trypan Blue to diamond chamber | trypan_blue_counting |
| A21 | Add 10 microL cell suspension | trypan_blue_counting |
| A22 | Mix by pipetting | trypan_blue_counting |
| A23 | Load 10 microL mixture into semicircle chamber | trypan_blue_counting |
| A24 | Wipe off excess | trypan_blue_counting |
| A25 | Insert slide into cell counter | trypan_blue_counting |
| A26 | Wait for focus | trypan_blue_counting |
| A27 | Press Capture (record count + viability) | trypan_blue_counting |
| A28 | Viability gate >90% | trypan_blue_counting |
| A29 | Prepare 12 mL of 2x10^5 cells/mL suspension (dilution math) | cell_seeding_plate_setup |
| A30 | Seed 100 microL per well into 96-well plate | cell_seeding_plate_setup |
| A31 | Incubate 24 h for attachment | cell_seeding_plate_setup |
| A32 | Per-quadrant media adjustment (100/90/95/85 microL) | plate_drug_treatment_media_adjustment |
| A33 | Prepare working stocks (Part 4) | drug_dilution_setup (covered as MP-5 prep) |
| A34 | Add 5 microL Carboplatin to cols 1-12, rows B-H | plate_drug_treatment_drug_addition |
| A35 | Row A cols 1-6 untreated control | plate_drug_treatment_media_adjustment |
| A36 | Row A cols 7-12 Metformin-only control (gets 5 microL met) | plate_drug_treatment_media_adjustment |
| A37 | Add 5 microL Metformin to cols 7-12, rows B-H | plate_drug_treatment_drug_addition |
| A38 | Incubate 48 h for drug effect | plate_drug_treatment_drug_addition |
| A39 | Prepare 12 mM MTT (dissolve 5 mg + 1 mL PBS) | mtt_reagent_prep |
| A40 | Add 25 microL of 12 mM MTT per well | mtt_plate_reaction |
| A41 | Incubate 1.5 h for formazan conversion | mtt_plate_reaction |
| A42 | Decant MTT into biohazard bin | mtt_plate_reaction |
| A43 | Pat plate dry on paper towels | mtt_plate_reaction |
| A44 | Add 200 microL DMSO per well | mtt_solubilization_readout |
| A45 | Pipette up/down ~10x (trituration) | mtt_solubilization_readout |
| A46 | Read absorbance at 560 nm | mtt_solubilization_readout |
| A47 | Carboplatin 200 microM intermediate (20 microL + 980) | drug_dilution_setup |
| A48-A55 | 8 carboplatin working stocks (full series) | drug_dilution_setup |
| A56 | 10 mM metformin working stock (10 microL 1 M + 990) | drug_dilution_setup |
| A57 | >=60 microL metformin volume gate | drug_dilution_setup |
