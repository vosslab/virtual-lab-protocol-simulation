# SDS-PAGE action map

Flat inventory of every atomic student interaction for the SDS-PAGE protocol
(BCHM 356/456, Spring 2026). Source doc: `docs/protocols/SDS-PAGE_Protocol_2026.md`.
Scope is the Experimental Procedure (Parts 1 through 10). Pre-lab parts
(Bradford, sample concentration math, Amicon MWCO concentration, stain/destain
stock prep) are out of scope per the M0 locked simplifications: no Bradford
prerequisite, fixed loading recipe, fixed 150 V / 30 min run, fixed 95 C heat,
fixed 50 sec microwave, fixed 7 min stain, single destain cycle, recycle-only
buffer disposal, no labeling interactions, pre-printed labels, 10 lanes,
3 student samples, ladder in lane 5.

Each line is `<part>.<index>: <gesture> <target>`. Gesture is one of `click`,
`adjust`, `select`, `type`. Targets are semantic names; the M0 decision lock
will resolve any gestures the current stepper does not yet handle.

## Part 1: Prepare protein sample and MW ladder

- P1.1: adjust micropipette_p20
- P1.2: click protein_stock_tube
- P1.3: click eppendorf_tube_1
- P1.4: adjust micropipette_p20
- P1.5: click laemmli_buffer_bottle
- P1.6: click eppendorf_tube_1
- P1.7: adjust micropipette_p20
- P1.8: click bme_bottle
- P1.9: click eppendorf_tube_1
- P1.10: adjust micropipette_p20
- P1.11: click protein_stock_tube
- P1.12: click eppendorf_tube_2
- P1.13: adjust micropipette_p20
- P1.14: click laemmli_buffer_bottle
- P1.15: click eppendorf_tube_2
- P1.16: adjust micropipette_p20
- P1.17: click bme_bottle
- P1.18: click eppendorf_tube_2
- P1.19: adjust micropipette_p20
- P1.20: click protein_stock_tube
- P1.21: click eppendorf_tube_3
- P1.22: adjust micropipette_p20
- P1.23: click laemmli_buffer_bottle
- P1.24: click eppendorf_tube_3
- P1.25: adjust micropipette_p20
- P1.26: click bme_bottle
- P1.27: click eppendorf_tube_3
- P1.28: click eppendorf_tube_1
- P1.29: click heat_block.slot_1
- P1.30: click eppendorf_tube_2
- P1.31: click heat_block.slot_2
- P1.32: click eppendorf_tube_3
- P1.33: click heat_block.slot_3
- P1.34: click ladder_tube
- P1.35: click heat_block.slot_4
- P1.36: click timer

## Part 2: Prepare 1x running buffer

- P2.1: adjust serological_pipette
- P2.2: click running_buffer_10x_bottle
- P2.3: click buffer_mix_bottle_1l
- P2.4: adjust serological_pipette
- P2.5: click di_water_carboy
- P2.6: click buffer_mix_bottle_1l

## Part 3: Prepare the gel cassette

- P3.1: click gel_cassette_package
- P3.2: click gel_cassette.bottom_tape
- P3.3: click gel_cassette
- P3.4: click electrode_assembly.slot_left
- P3.5: click electrode_assembly.clamp_left
- P3.6: click electrode_assembly.clamp_right
- P3.7: click gel_cassette.comb

## Part 4: Assemble the electrophoresis apparatus

- P4.1: click electrode_assembly.wing_clamp_left
- P4.2: click electrode_assembly.wing_clamp_right
- P4.3: click electrode_assembly
- P4.4: click electrophoresis_tank
- P4.5: adjust serological_pipette
- P4.6: click buffer_mix_bottle_1l
- P4.7: click electrophoresis_tank.inner_chamber
- P4.8: adjust serological_pipette
- P4.9: click buffer_mix_bottle_1l
- P4.10: click electrophoresis_tank.outer_chamber
- P4.11: click electrophoresis_tank.lid
- P4.12: click power_supply.lead_red
- P4.13: click power_supply.lead_black

## Part 5: Load samples into the wells

- P5.1: click pipette_tip_box_p10
- P5.2: adjust micropipette_p10
- P5.3: click ladder_tube
- P5.4: click gel_cassette.lane_5
- P5.5: click tip_eject_waste
- P5.6: click pipette_tip_box_p10
- P5.7: click eppendorf_tube_1
- P5.8: click gel_cassette.lane_2
- P5.9: click tip_eject_waste
- P5.10: click pipette_tip_box_p10
- P5.11: click eppendorf_tube_2
- P5.12: click gel_cassette.lane_4
- P5.13: click tip_eject_waste
- P5.14: click pipette_tip_box_p10
- P5.15: click eppendorf_tube_3
- P5.16: click gel_cassette.lane_6
- P5.17: click tip_eject_waste

## Part 6: Connect power supply and run the gel

- P6.1: click power_supply.power_switch
- P6.2: adjust power_supply.voltage_knob
- P6.3: click power_supply.run_button
- P6.4: click timer
- P6.5: click power_supply.run_button
- P6.6: click power_supply.power_switch

## Part 7: Recycle the SDS buffer

- P7.1: click electrophoresis_tank.lid
- P7.2: select buffer_inspection_choice
- P7.3: click funnel
- P7.4: click electrophoresis_tank.outer_chamber
- P7.5: click recycle_storage_bottle

## Part 8: Separate the gel from its cassette

- P8.1: click power_supply.lead_red
- P8.2: click power_supply.lead_black
- P8.3: click electrode_assembly
- P8.4: click gel_cassette
- P8.5: click gel_opening_tool
- P8.6: click gel_cassette.seal_left
- P8.7: click gel_opening_tool
- P8.8: click gel_cassette.seal_right
- P8.9: click gel_cassette.top_plate
- P8.10: click gel_slab
- P8.11: click staining_tray

## Part 9: Stain and destain the gel

- P9.1: click di_water_wash_bottle
- P9.2: click staining_tray
- P9.3: click staining_tray
- P9.4: click sink_drain
- P9.5: click coomassie_stain_bottle
- P9.6: click staining_tray
- P9.7: click staining_tray
- P9.8: click microwave
- P9.9: click microwave.start_button
- P9.10: click staining_tray
- P9.11: click shaker
- P9.12: click timer
- P9.13: click staining_tray
- P9.14: click coomassie_recycle_bottle
- P9.15: click di_water_wash_bottle
- P9.16: click staining_tray
- P9.17: click staining_tray
- P9.18: click sink_drain
- P9.19: click di_water_wash_bottle
- P9.20: click staining_tray
- P9.21: click staining_tray
- P9.22: click sink_drain
- P9.23: click destain_bottle
- P9.24: click staining_tray
- P9.25: click kimwipe_box
- P9.26: click staining_tray
- P9.27: click staining_tray
- P9.28: click microwave
- P9.29: click microwave.start_button
- P9.30: click staining_tray
- P9.31: click kimwipe_box
- P9.32: click stain_waste_bottle
- P9.33: click staining_tray
- P9.34: click shaker
- P9.35: click timer

## Part 10: Image the gel

- P10.1: click staining_tray
- P10.2: click stain_waste_bottle
- P10.3: click gel_slab
- P10.4: click di_water_wash_bottle
- P10.5: click staining_tray
- P10.6: click light_box
- P10.7: click smartphone_camera

Total atomic interactions: 132
