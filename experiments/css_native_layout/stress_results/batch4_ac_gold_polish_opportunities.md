# NEW3 Batch 4 Workstream AC - Gold Scene Polish Opportunities

Date: 2026-05-21
Status: DONE
Use "workstream" not "lane".

## Gold Scene Count: 10

| scene_name                         | canonical_score | scene_class | primary_ratio |
| ---------------------------------- | --------------- | ----------- | ------------- |
| gold_staining_bench                | 52              | composition | 0.4           |
| gold_drug_dilution_workspace       | 53              | composition | 0.5           |
| gold_mixed_bench                   | 40              | composition | 0.5           |
| gold_cell_counter_station          | 38              | composition | 1.7           |
| gold_hood_prep                     | 38              | composition | 0.9           |
| gold_microscope_slide_prep         | 34              | composition | 1.7           |
| gold_plate_reader_assay            | 32              | composition | 2.7           |
| gold_heat_block_sample_prep        | 28              | composition | 1.7           |
| gold_electrophoresis_full_setup    | 28              | composition | 2.7           |
| gold_well_plate_96_zoom_with_state | 20              | zoom_detail | 3.5           |

## Per-Scene Polish Opportunities

### gold_staining_bench (52)

- primary_prominence: staining_tray_empty (footprint--rack 140-190px) shares work_surface with gel_cassette (footprint--container 220-320px). Supporting wider than primary. primary_ratio=0.4.
- label_readability: 5 bottles on rear_shelf with long chemical names. coomassie_stain_bottle_filled, destain_bottle_filled, destain_waste_bottle_empty, coomassie_recycle_bottle. Each >10 chars exceeds 100px max-width label budget.
- zone-footprint mismatch: rocking_shaker_idle in front_tools with footprint--large-equipment (min 360px). flex-wrap region; pedagogically belongs in instrument_station.
- Bounded fix: promote staining_tray_empty to footprint--instrument; move rocking_shaker_idle to instrument_station zone.

### gold_drug_dilution_workspace (53)

- primary_prominence: well_plate_96 (container) shares work_surface with dilution_tube_rack + 2x drug_vial_rack (all rack). 80px width advantage insufficient. primary_ratio=0.5.
- label_readability: microtube_rack_24_placeholder label "microtube rack 24 placeholder" - "placeholder" is authoring artifact. dmso_stock_bottle uses \_placeholder.svg.
- region_filling: instrument_station empty -> 150px dead row at bottom.
- Bounded fix: accept-as-is (highest score). Label cleanup user-gated. Empty region collapse user-gated.

### gold_mixed_bench (40)

- primary_prominence: t75_flask_v3 + 2x graduated_cylinder all footprint--container in work_surface. No CSS size differentiation. primary_ratio=0.5.
- label_readability: graduated_cylinder, glass_slide, lab_marker all use \_placeholder.svg.
- balance: balance=50.0 indicates left-right asymmetry. rear_shelf left-heavy, instrument_station right-heavy.
- Bounded fix: move one graduated_cylinder to front_tools to break work_surface peer-count.

### gold_cell_counter_station (38)

- primary_prominence: cell_counter in instrument_station with footprint--instrument (220-280px). Vi-CELL/Countess scale belongs at footprint--large-equipment (360-480px). primary_ratio=1.7 but absolute size insufficient.
- label_readability: label_overlap=70 on 7-object scene. counting_cartridge + p200_micropipette_empty + waste_container labels collide.
- scene_occupied: 5.5% on 7 objects. Reads as unfinished not focused.
- Bounded fix: reclassify cell_counter to footprint--large-equipment in YAML.

### gold_hood_prep (38)

- primary_prominence: t75_flask_v3 primary_ratio=0.9. Bottle on rear_shelf + waste_container in front_tools all at same container class. No clear primary.
- aspect_ratio: aspirating_pipette natural 17x150px rendered as 99x110px (footprint--handheld min). 697% aspect mismatch - worst in any gold scene.
- region_filling: instrument_station empty.
- Bounded fix: reclassify aspirating_pipette to footprint--small-tool (max-width 80px allows thin SVG closer to native).

### gold_microscope_slide_prep (34)

- primary_prominence: microscope_new footprint--instrument 220-280px. Brightfield scope size comparable to centrifuge (large-equipment). 60px width advantage over rear_shelf bottles insufficient.
- repeated identical objects: 4x glass_slide footprint--small-tool placeholder in work_surface column. No pedagogical signal.
- label_overlap: label_overlap=40 (third-worst). coomassie_stain_bottle_filled (25 chars) + ddh2o_bottle_filled (18 chars) + 4x "glass slide".
- Bounded fix: reclassify microscope_new to footprint--large-equipment.

### gold_plate_reader_assay (32)

- supporting_object_proximity: 96well_pcr_plate in work_surface; plate_reader_new in instrument_station. Plate belongs on reader. No spatial proximity cue.
- label_readability: label_overlap=10. 96well_pcr_plate (15 chars), multichannel_pipette_new (23 chars) exceed 100px max-width.
- aspect_ratio: aspect_ratio_fidelity=34.99. 3 generic bottle objects (AR 0.46 -> 0.917, 99.3% mismatch).
- Bounded fix: move 96well_pcr_plate from work_surface to front_tools (closer to instrument_station).

### gold_heat_block_sample_prep (28)

- density mismatch: scene_class=dense_clutter in YAML, but HTML emits data-scene-density="medium". Crowded modifiers never activate. 6 microtubes at full small-tool size, under-dense for declared class.
- repeated labels: 4x microtube_filled + 2x microtube_empty - near-identical labels at 50-80px. microtube_rack_24_placeholder includes "placeholder".
- label_readability=0 with label_overlap=0: labels clip against container edges rather than overlap.
- Bounded fix: emit data-scene-density="high" for scene_class=dense_clutter. Activates existing crowded modifiers.

### gold_electrophoresis_full_setup (28)

- dual-large-equipment: electrophoresis_tank (large-equipment) + power_supply_off (instrument) in instrument_station nowrap. 580-760px minimum. Power supply competes with primary visually.
- label_readability: running_buffer_1x_carboy (24), running_buffer_10x_bottle (25), protein_ladder_tube (19), 4x protein_sample_tube (18) - all clip at 100px.
- work_surface column density: 4 protein tubes as small-tool in column = 200-320px column of identical labels.
- Bounded fix: move gel_cassette from front_tools to work_surface to break 4-tube identical column.

### gold_well_plate_96_zoom_with_state (20)

- zoom mode not activated (critical): scene_class=zoom_detail in YAML but HTML emits data-scene-mode="composition" not "detail". CSS .scene-mode--detail never applied. footprint--zoom-view (600-1200px) never used. 96well_pcr_plate at footprint--container 220-320px instead of zoom. primary_area_ratio=0 penalty=50 (highest single penalty).
- popup_layer footprint vocabulary gap: well_state_legend in popup_layer uses footprint--small-tool (50-80px). Needs popup-specific footprint class or larger overlay context.
- scene mode CSS mismatch: generator mapping failure. Fix at generator level.
- Bounded fix: emit data-scene-mode="detail" when scene_class: zoom_detail. HIGHEST ROI in entire gold set.

## Cross-Scene Patterns

### Systemic (8+ of 10 scenes)

S1. primary_area_ratio=0 (10/10): footprint underclassification + canvas utilization + zoom failure
S2. label_readability=0 (9/10): bench.css .placement-label max-width 100px too short for lab equipment names
S3. scene_occupied 4.9-12.1% (10/10): objects at footprint minimums in left-aligned regions
S4. aspect_ratio_fidelity=0 on 6/10: bottle (99.3% mismatch), bme_bottle_filled (154.6%), aspirating_pipette (697%)

### Scene-specific

SS1. Zoom scene mode not activated (gold_well_plate_96_zoom_with_state)
SS2. Rocking_shaker zone-footprint mismatch (gold_staining_bench)
SS3. Aspirating_pipette extreme aspect distortion (gold_hood_prep)
SS4. Undifferentiated repeated-object columns (gold_microscope_slide_prep, gold_heat_block_sample_prep)

## Recommended Priority Order

| rank | opportunity                                                            | scene(s)                                              | category           | fix_type                | estimated_score_impact  |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------ | ----------------------- | ----------------------- |
| 1    | Activate zoom_detail mode in generator                                 | gold_well_plate_96_zoom_with_state                    | primary_prominence | bounded generator tweak | +30 to +40 pts          |
| 2    | Reclassify cell_counter + microscope_new to footprint--large-equipment | gold_cell_counter_station, gold_microscope_slide_prep | primary_prominence | bounded YAML tweak      | +5 to +10 pts per scene |
| 3    | Reclassify aspirating_pipette to footprint--small-tool                 | gold_hood_prep                                        | aspect_ratio       | bounded YAML tweak      | +3 to +6 pts            |

## User-Gated Items

| item                                                   | scene(s)                                                          | reason_gated                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Zoom popup_layer legend footprint vocabulary           | gold_well_plate_96_zoom_with_state                                | needs popup-specific footprint class not in closed vocabulary |
| Label max-width policy (increase from 100px)           | all 10                                                            | global CSS change; requires label-width policy decision       |
| Generic bottle SVG aspect fix                          | 5 scenes                                                          | SVG rework or new narrow-bottle footprint class               |
| Aspirating_pipette SVG natural width fix               | gold_hood_prep                                                    | 17px natural width is SVG authoring issue                     |
| data-scene-density generator mapping for dense_clutter | gold_heat_block_sample_prep, gold_drug_dilution_workspace         | generator density-policy decision                             |
| Empty instrument_station row collapse                  | gold_hood_prep, gold_staining_bench, gold_drug_dilution_workspace | no CSS rule for auto-collapsing empty regions                 |
| Differentiated labels for repeated objects             | gold_microscope_slide_prep, gold_heat_block_sample_prep           | YAML label vocabulary extension or generator index system     |

## Bounded Fix Count vs User-Gated

| type                    | count |
| ----------------------- | ----- |
| bounded YAML tweak      | 5     |
| bounded generator tweak | 2     |
| user-gated              | 7     |
| accept-as-is            | 3     |

Bounded YAML tweaks:

1. cell_counter: footprint--instrument -> footprint--large-equipment
2. microscope_new: footprint--instrument -> footprint--large-equipment
3. aspirating_pipette: footprint--handheld -> footprint--small-tool
4. rocking_shaker_idle: zone front_tools -> zone instrument_station
5. staining_tray_empty: footprint--rack -> footprint--instrument

Bounded generator tweaks:

1. Map scene_class: zoom_detail to data-scene-mode="detail" in HTML template
2. Map scene_class: dense_clutter to data-scene-density="high" in HTML template (pending user approval)

Accept-as-is:

1. Low scene_occupied (structural to 1920x1080 canvas)
2. balance=50 (symmetric CSS layout by design)
3. instrument_station empty for hood-context scenes

## Handoff

Status: DONE
Gold scene count: 10
Top 3 cross-scene opportunities: zoom mode activation, instrument footprint reclassification, aspirating_pipette aspect fix
Bounded-fix count: 7 (5 YAML + 2 generator)
User-gated count: 7
Blockers: None
