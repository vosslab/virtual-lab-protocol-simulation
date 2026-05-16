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
| A20 | Add 10 microL Trypan Blue to diamond chamber | ABSENT | | MP-3 pending |
| A21 | Add 10 microL cell suspension | ABSENT | | MP-3 pending |
| A22 | Mix by pipetting | ABSENT | | MP-3 pending |
| A23 | Load 10 microL mixture into semicircle chamber | ABSENT | | MP-3 pending |
| A24 | Wipe off excess | ABSENT | | MP-3 pending |
| A25 | Insert slide into cell counter | ABSENT | | MP-3 pending |
| A26 | Wait for focus | ABSENT | | MP-3 pending |
| A27 | Press Capture (record count + viability) | ABSENT | | MP-3 pending |
| A28 | Viability gate >90% | ABSENT | | MP-3 pending |
| A29 | Prepare 12 mL of 2x10^5 cells/mL suspension (dilution math) | ABSENT | | MP-4 pending |
| A30 | Seed 100 microL per well into 96-well plate | ABSENT | | MP-4 pending |
| A31 | Incubate 24 h for attachment | ABSENT | | MP-4 pending |
| A32 | Per-quadrant media adjustment (100/90/95/85 microL) | ABSENT | | MP-6 pending |
| A33 | Prepare working stocks (Part 4) | ABSENT | | MP-5 prep pending |
| A34 | Add 5 microL Carboplatin to cols 1-12, rows B-H | ABSENT | | MP-7 pending |
| A35 | Row A cols 1-6 untreated control | ABSENT | | MP-6 pending |
| A36 | Row A cols 7-12 Metformin-only control (gets 5 microL met) | ABSENT | | MP-6 pending |
| A37 | Add 5 microL Metformin to cols 7-12, rows B-H | ABSENT | | MP-7 pending |
| A38 | Incubate 48 h for drug effect | ABSENT | | MP-7 pending |
| A39 | Prepare 12 mM MTT (dissolve 5 mg + 1 mL PBS) | ABSENT | | MP-8 pending |
| A40 | Add 25 microL of 12 mM MTT per well | ABSENT | | MP-9 pending |
| A41 | Incubate 1.5 h for formazan conversion | ABSENT | | MP-9 pending |
| A42 | Decant MTT into biohazard bin | ABSENT | | MP-9 pending |
| A43 | Pat plate dry on paper towels | ABSENT | | MP-9 pending |
| A44 | Add 200 microL DMSO per well | ABSENT | | MP-10 pending |
| A45 | Pipette up/down ~10x (trituration) | ABSENT | | MP-10 pending |
| A46 | Read absorbance at 560 nm | ABSENT | | MP-10 pending |
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
