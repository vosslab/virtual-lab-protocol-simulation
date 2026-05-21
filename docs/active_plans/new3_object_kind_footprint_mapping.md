# NEW3 Batch 2 Workstream K - Object-Kind to Footprint Mapping Audit

Audit date: 2026-05-20
Scope: experiments/css_native_layout/ (read-only), src/scene_runtime/ (read-only), assets/ SVG viewBox extraction
Source of truth: experiments/css_native_layout/regions/bench.yaml (identical content in hood.yaml, instrument.yaml)

## Critical finding: runtime does NOT override YAML

src/scene_runtime/layout/css_native_adapter.ts does not perform any footprint class assignment. It scaffolds DOM elements with class="placement" and delegates entirely to CSS and the region YAML. src/scene_runtime/layout/layout_engine.ts is a coordinate-based SVG solver that does not use CSS footprint classes at all. The kind_to_footprint map in the region YAML files is the sole authority for footprint assignment in the CSS-native experiment path. The background claim that "renderer assigns container to bottles" is NOT confirmed by source code - the YAML explicitly assigns bottle: handheld.

## Mapping Table

Notes on columns:
- current_footprint_class: direct from kind_to_footprint in bench.yaml
- natural_aspect_ratio: W:H from SVG viewBox (tall portrait = < 1.0, wide landscape = > 1.0)
- expected_footprint_class: based on natural aspect ratio and bench.css footprint box geometry

| object_kind | current_footprint_class | expected_footprint_class | natural_aspect_ratio | common_failure_mode | proposed_class_change |
|---|---|---|---|---|---|
| pipette (p10/p200) | small-tool | small-tool (needs taller box) | 0.23:1 (very tall portrait) | C1: .placement overflow clips bottom; box max-height 90px vs 478px SVG height | NO class change - raise small-tool max-height from 90px to 200px |
| pipette (serological) | small-tool | small-tool (needs taller box) | 0.11:1 (extreme portrait) | C1 + C2: extreme aspect mismatch, bottom crop guaranteed, 8.33% distortion cluster | NO class change - raise small-tool max-height from 90px to 200px |
| pipette (multichannel) | small-tool | small-tool (needs taller box) | 0.34:1 (tall portrait) | C1: .placement clips bottom at 90px max-height; distortion forces 0.34:1 into ~0.89:1 box | NO class change - raise small-tool max-height from 90px to 200px |
| bottle | handheld | handheld (needs taller box) | 0.46:1 (portrait) | C2: 8.33% distortion; bench handheld box (max 130x160px = 0.81:1) vs bottle 0.46:1 natural; bottom clips at 160px | NO class change - raise handheld max-height from 160px (bench) / 130px (hood, instrument) to 260px |
| ethanol_spray | handheld | handheld (needs taller box) | 0.34:1 (tall portrait) | Same as bottle - distortion worse because narrower; max-height 160/130px clips body | NO class change - same fix as bottle |
| waste (waste_container) | handheld | handheld | unknown (no waste_container.svg found) | C9: 230 unclassified hard_fail_group=None records include waste_container | Confirm SVG aspect ratio; likely correct class |
| flask (t75_flask) | container | container | 2.15:1 (landscape, very wide) | t75_flask viewBox="0 0 69.23 32.16" - wider than tall; bench container box (220-320px wide x 240-360px tall) fits portrait assumption, forces landscape into portrait box | CONCERN: flask wider than tall but container box is portrait-biased; no crop but aspect distortion likely |
| plate (well_plate_24) | container | container | 1.54:1 (landscape) | well_plate_24 viewBox="0 0 200 130"; container box has min-height:240px > min-width:220px on bench; landscape plate crammed into taller-than-wide box produces distortion | CONCERN: same portrait-bias issue as flask; object-fit contain prevents crop but produces whitespace |
| plate (96well_pcr) | container | container | 1.41:1 (landscape) | Same landscape-in-portrait-box issue; viewBox="0 0 393.3275 278.5243" | Same as well_plate_24 |
| rack (conical_15ml_rack) | rack | rack | 0.86:1 (near square, slightly portrait) | viewBox="0 0 60 70"; bench rack box (140-190px wide x 160-220px tall) fits well | No change needed |
| rack (micropipette_rack) | rack | rack | 0.71:1 (portrait) | viewBox="0 0 60 85"; fits rack box adequately | No change needed |
| rack (dilution_tube_rack) | rack | rack | 1.6:1 (landscape) | viewBox="0 0 80 50"; landscape asset in portrait-biased rack box - aspect mismatch | CONCERN: may appear small in tall narrow rack box |
| rack (drug_vial_rack) | rack | rack | 2.03:1 (landscape) | viewBox="0 0 120 59"; severe landscape in portrait box; drug_vial_rack in C9 unclassified hard_fail_group=None | CONCERN: severe landscape-in-portrait mismatch |
| vortex | equipment_small -> footprint--instrument | instrument | 0.84:1 (near square) | viewBox="0 0 271.143 322.847"; bench instrument box (220-280px wide x 200-260px tall) fits well | No change needed |
| heat_block | equipment_small -> footprint--instrument | instrument | 1.0:1 (square) | viewBox="0 0 100 100"; fits instrument box well | No change needed |
| cell_counter | equipment_small -> footprint--instrument | large-equipment | 1.41:1 (landscape) | viewBox="0 0 510.123 361.058"; cell_counter is physically larger than vortex/heat_block | MISMATCH: cell_counter in equipment_small should be equipment_large |
| microscope | equipment_large -> footprint--large-equipment | large-equipment | 0.58:1 (portrait) | viewBox="0 0 283.843 489.184"; bench large-equipment box (360-480px wide x 280-380px tall) is landscape-biased; portrait microscope (max-height 380px) vs microscope 489px natural - crops at max-height | CONCERN: crops at max-height |
| electrophoresis_tank | equipment_large -> footprint--large-equipment | large-equipment | 1.54:1 (landscape) | viewBox="0 0 656.013 427.124"; fits large-equipment box geometry well | Fits well; no change needed |
| power_supply | equipment_large -> footprint--large-equipment | large-equipment | 1.0:1 (square) | viewBox="0 0 100 100"; minor whitespace from landscape-biased box | Not a hard fail |
| well_plate_96 | equipment_large -> footprint--large-equipment | container or rack | 1.41:1 (96well_pcr_plate.svg) | In equipment_large list - footprint--large-equipment (360-480px x 280-380px on bench) but semantically a plate/container; over-large box | MISMATCH: well_plate_96 should be footprint--container |
| tube_rack_24 | equipment_large -> footprint--large-equipment | rack | unknown (no tube_rack_24.svg found) | equipment_large over-sizes a 24-well tube rack | LIKELY MISMATCH: tube_rack_24 should be footprint--rack |
| tube_rack_15ml | equipment_large -> footprint--large-equipment | rack | 0.86:1 (conical_15ml_rack.svg proxy) | Same as tube_rack_24 | LIKELY MISMATCH: tube_rack_15ml should be footprint--rack |
| decoration | small-tool | small-tool | unknown | C9 includes brush, kimwipes, marker, slide; kimwipes/brush may be taller than 90px max-height | CONCERN: need per-asset check |

## Mismatches Detected

### M1 - CONFIRMED CRITICAL: bottle:handheld with portrait mismatch (339 incidents - C2)
YAML assigns bottle: handheld. Bench handheld box is max 130px wide x 160px tall (0.81:1). bottle.svg is 0.46:1 (180px x 392px natural). Aspect delta is (0.81 - 0.46) / 0.46 = 76% geometric mismatch. The 8.33% CSS distortion measured in C2 is produced by object-fit: contain fitting 0.46:1 content into ~0.81:1 box. Hood and instrument handheld boxes (max-height 130px) are worse.

### M2 - CONFIRMED CRITICAL: .placement { overflow: hidden } clips tall portrait assets (~430 incidents - C1)
All three CSS files set .placement { overflow: hidden }. Pipettes (0.11:1 - 0.34:1) and bottles (0.46:1) rendered into underconstrained placement heights hit the clip. CSS-native adapter assigns class="placement" only - no additional height constraint - so placement height is determined by flex container, which collapses to region min-height.

### M3 - CONFIRMED: cell_counter in equipment_small list
cell_counter.svg is 510px x 361px natural (1.41:1). Bench instrument box max-width is 280px, max-height is 260px. Cell counters are physically similar to plate readers, not vortexes.

### M4 - CONFIRMED: well_plate_96, tube_rack_24, tube_rack_15ml in equipment_large list
These three object kinds are in the equipment_large list in all three region YAML files. A 96-well plate and tube racks do not require centrifuge-scale footprint. well_plate_96 is also in the plate semantic kind and should map to footprint--container.

### M5 - CONFIRMED: t75_flask (flask -> container) landscape asset in portrait-biased box
t75_flask.svg is 2.15:1 landscape. Container box min-height (240px) exceeds min-width (220px), creating portrait bias.

### M6 - CONFIRMED: rack landscape mismatch for dilution_tube_rack (1.6:1) and drug_vial_rack (2.03:1)
Rack box is portrait-biased on bench (160-220px tall x 140-190px wide). Both these SVGs are landscape. drug_vial_rack in C9 unclassified cluster.

### M7 - CONFIRMED: micropipette_rack listed under rack kind but rendered in front_tools
micropipette_rack.svg is 0.71:1. Rack box fits. No mismatch.

## New Class Proposals

### P1: Add footprint--handheld-tall class (portrait-primary handheld)
For bottle (0.46:1) and ethanol_spray (0.34:1). Target: min-width 55px, max-width 95px, min-height 150px, max-height 260px. If new class rejected: raise existing handheld max-height to 260px across all three CSS files.

### P2: Move cell_counter from equipment_small to equipment_large
No new class. YAML change only. All three region YAML files require same edit.

### P3: Move well_plate_96 out of equipment_large into plate kind handling
Receive footprint--container via existing plate: container mapping.

### P4: Move tube_rack_24 and tube_rack_15ml from equipment_large to rack kind
Both are racks. Remove from equipment_large list in all three region YAML files.

### P5: Add footprint--landscape-container class for wide-aspect containers
For t75_flask (2.15:1) and landscape plates. Target: min-width 280px, max-width 500px, min-height 180px, max-height 300px. High vocabulary impact.

## Risk Ranking (Top 5)

### Rank 1 - CRITICAL: .placement { overflow: hidden } clips ~430 incidents (C1 root cause)
Files: bench.css line 156, hood.css line 166, instrument.css line 164
Fix: remove overflow: hidden from .placement rule. Highest incident count. Safest fix.

### Rank 2 - CRITICAL: bottle:handheld with max-height 130px/160px clips 339 distortion records (C2 root cause)
Files: bench.yaml, hood.yaml, instrument.yaml (kind_to_footprint), bench.css lines 198-204, hood.css lines 232-238, instrument.css lines 239-245
Fix: raise handheld max-height from 130px (hood/instrument) and 160px (bench) to 260px. No class change.

### Rank 3 - HIGH: cell_counter in equipment_small, renders at instrument scale (~280px max) instead of large-equipment scale (~480px max)
Files: bench.yaml line 101, hood.yaml, instrument.yaml (equipment_small list)
Fix: move cell_counter from equipment_small to equipment_large in all three YAML files.

### Rank 4 - MEDIUM: drug_vial_rack landscape (2.03:1) in portrait rack box (0.74:1 max aspect on bench)
Files: bench.yaml, hood.yaml, instrument.yaml (rack kind, footprint--rack CSS)
Fix options: (a) create landscape-rack sub-class, (b) widen rack box to near-square. Option (b) lower vocabulary impact.

### Rank 5 - MEDIUM: well_plate_96, tube_rack_24, tube_rack_15ml over-sized in equipment_large
Files: bench.yaml lines 90-92, hood.yaml, instrument.yaml (equipment_large list)
Fix: remove these three from equipment_large. well_plate_96 receives footprint--container. tube_rack_24 and tube_rack_15ml receive footprint--rack.

## Key Discrepancy Resolution

The user background stated "the renderer actually maps bottles to footprint--container." Source audit disproves this:

- css_native_adapter.ts performs zero footprint class assignment
- layout_engine.ts does not use CSS footprint classes at all
- regions/bench.yaml kind_to_footprint explicitly states bottle: handheld
- The failure new3-batch2-AB v1 likely assumed bottles used footprint--container geometry when writing the AB test, but the actual assignment is handheld

The bottle/handheld assignment IS the bug, not an assumption error. The handheld box (max-height 130-160px) is too short for a tall portrait bottle (0.46:1 natural). Fix is to raise handheld max-height or split the class, not reclassify bottles as containers.

## Evidence Files

- experiments/css_native_layout/regions/bench.yaml - authoritative kind_to_footprint map
- experiments/css_native_layout/styles/bench.css - footprint class geometry, bench scene
- experiments/css_native_layout/styles/hood.css - footprint class geometry, hood scene
- experiments/css_native_layout/styles/instrument.css - footprint class geometry, instrument scene
- src/scene_runtime/layout/css_native_adapter.ts - confirmed: no footprint assignment in runtime
- src/scene_runtime/layout/layout_engine.ts - confirmed: SVG coordinate solver
- assets/equipment/bottle.svg (viewBox 0 0 180.693 391.925, W:H 0.46:1)
- assets/equipment/t75_flask.svg (viewBox 0 0 69.23 32.16, W:H 2.15:1)
- assets/equipment/cell_counter.svg (viewBox 0 0 510.123 361.058, W:H 1.41:1)

## Handoff status: DONE_WITH_CONCERNS

Concerns:
1. bottle -> handheld assignment is confirmed (not container as background claimed); root cause of C2 is the handheld box max-height, not the class assignment
2. equipment_large over-sizing of well_plate_96/tube_rack_24/tube_rack_15ml is a latent YAML bug affecting all scenes that use those kinds
3. drug_vial_rack, dilution_tube_rack are landscape assets in a portrait-biased rack box - flagged as C9 unclassified
4. t75_flask (2.15:1 landscape) and plates (1.41-1.54:1 landscape) mapped to portrait-biased container box - object-fit contain prevents hard crop but produces systematic whitespace waste; degrades visual quality
