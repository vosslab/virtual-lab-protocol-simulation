# Object Asset Inventory Audit

Date: 2026-05-27
Scope: Complete audit of object library YAML definitions and SVG asset references.

## Executive Summary

- Object count: 74
- SVG asset count: 125
- Referenced assets (from objects): 62
- Broken references: 4
- Orphan assets: 67
- Status: WARNINGS

The object library is incomplete relative to the asset library. Four YAML asset
references cannot be resolved to SVG files. Sixty-seven SVG files in
assets/equipment/ have no object YAML references, indicating either legacy
assets, variant assets, or orphaned artwork.

## Object Inventory

### Objects by Kind (74 total)

| Kind | Count |
| ---- | ----- |
| bottle | 29 |
| decoration | 7 |
| equipment | 17 |
| flask | 2 |
| pipette | 7 |
| rack | 4 |
| waste | 4 |

Bottle objects (29): bme_bottle, carboplatin_stock_bottle, cell_suspension_tube,
conical_15ml, conical_tube_for_dilution, coomassie_recycle_bottle,
coomassie_stain_bottle, ddh2o_bottle, destain_bottle, destain_waste_bottle,
dmso_bottle, ethanol_bottle, laemmli_4x_bottle, media_bottle,
metformin_stock_bottle, metformin_working_tube, microtube_15ml_intermediate,
microtube, mtt_powder_container, mtt_solution_bottle, mtt_solution_tube,
mtt_vial, pbs_bottle, protein_ladder_tube, protein_sample_tube,
recycle_buffer_bottle, running_buffer_10x_bottle, running_buffer_1x_carboy,
sterile_water_bottle

Decoration objects (7): kimwipe_pad, lens_tissue, micropipette_tip_box,
p10_gel_loading_tip_box, p10_gel_loading_tip, paper_towel_pad, professor_avatar

Equipment objects (17): cell_counter, centrifuge, electrode_module,
electrophoresis_tank, gel_cassette, gel_comb, gel_opening_tool, heat_block,
hemocytometer_slide, hood_surface, incubator, lightbox, microscope, microwave,
mini_protean_gel, plate_reader, power_supply, rocking_shaker, staining_tray,
vortex, water_bath

Flask objects (2): t75_flask_new, t75_flask

Pipette objects (7): aspirating_pipette, label_pen, micropipette,
multichannel_pipette, p10_micropipette, p200_micropipette, serological_pipette

Rack objects (4): conical_15ml_rack, counter_slide_cartridge,
dilution_tube_rack_8, microtube_rack_24

Waste objects (4): biohazard_decant_bin, biohazard_decant, sharps_container,
waste_container


## SVG Asset Summary

Total SVG assets: 125 in assets/equipment/

Referenced assets (from object YAML): 62

Sample SVG asset characteristics:

- bme_bottle.svg: viewBox='0 0 142.955 398.08' (aspect 0.359)
- serological_pipette.svg: viewBox='0 0 16 142' (aspect 0.113)
- bottle.svg: viewBox='0 0 180.693 391.925' (aspect 0.461)

All sampled SVGs use viewBox without explicit width/height attributes.
This is correct for responsive rendering per SVG_PIPELINE.md.

## Cross-Reference Analysis

### Broken References (4)

The following asset_name references in object YAML cannot be resolved to SVG files:

1. electrophoresis_tank_with_lid
2. electrophoresis_tank_with_module
3. electrophoresis_tank_without_lid
4. electrophoresis_tank_without_module

Location: content/objects/equipment/electrophoresis_tank.yaml

These state variants are declared in visual_states but have no corresponding
.svg files in assets/equipment/. The tank asset itself exists, but the four
variant names do not.

**Recommendation:** Either create the 4 missing SVG files or update the object
YAML to reference existing assets (electrophoresis_tank,
electrophoresis_tank_inner_chamber, electrophoresis_tank_outer_chamber).

### Orphan Assets (67)

SVG files in assets/equipment/ with no object YAML references:

_placeholder, 96well_pcr_plate, angry_professor, biohazard_decant,
bme_bottle_empty, bme_bottle_filled, bottle_medium_pink, cell_counter_new,
cell_counter_old, centrifuge_new, conical_15ml_rack,
coomassie_recycle_bottle_empty, coomassie_recycle_bottle_filled,
coomassie_stain_bottle_empty, coomassie_stain_bottle_filled,
ddh2o_bottle_empty, ddh2o_bottle_filled, destain_bottle_empty,
destain_bottle_filled, destain_waste_bottle_empty, destain_waste_bottle_filled,
dilution_tube_rack, drug_vial_rack, electrophoresis_tank, ethanol_spray,
falcon_50ml, falcon_50ml_new, gel_cassette, incubator_legacy, incubator_new,
laemmli_4x_bottle_empty, laemmli_4x_bottle_filled, micropipette_rack,
microscope_new, microscope_old, microtube_empty, microtube_filled,
microtube_open_translucent, multichannel_pipette_new, multichannel_pipette_old,
p10_gel_loading_tip, plate_reader_new, plate_reader_old,
protein_ladder_tube_empty, protein_ladder_tube_filled,
protein_sample_tube_empty, protein_sample_tube_filled,
recycle_buffer_bottle_empty, recycle_buffer_bottle_filled,
running_buffer_10x_bottle_empty, running_buffer_10x_bottle_filled,
running_buffer_1x_carboy_empty, running_buffer_1x_carboy_filled,
t75_flask_legacy, t75_flask_servier, t75_flask_v2, t75_flask_v3,
t75_flask_v4, t75_flask_v5, tip_box_new, tip_box_old, vortex_new, vortex_old,
waste_tray, water_bath_new, water_bath_old, well_plate_24

**Interpretation:** These 67 assets have no YAML references. Many are versioned
variants (_v2, _v3, _v4, _v5) or state variants (_empty, _filled, _new, _old).
Categories may be:
  - Legacy assets from prior object versions
  - Unused/orphaned artwork
  - Assets awaiting object definitions
  - Variants for future use

Notable pattern: _empty and _filled variants present (e.g., bme_bottle_empty.svg,
bme_bottle_filled.svg) suggest prior per-state SVG patterns. Per
MATERIAL_CONVENTION.md, the current rule is 'single base SVG + runtime overlay'
(no per-state variants). These may need retirement or integration.

## Visual Integrity Assessment

Per PRIMARY_DESIGN.md visual integrity section:
- SVG assets must not be cropped or aspect-distorted beyond 5% in rendering
- Visible clipping is HARD FAIL for lab glassware, pipettes, plates, instruments

### Current Status

Sampled SVGs show correct use of viewBox with proportional scaling.
No explicit width/height attributes cause aspect distortion.

**Recommendation:** Implement artwork_integrity checks per SVG_PIPELINE.md:
  - Compare rendered asset bbox against parent placement card
  - Flag overflow clipping (HARD FAIL)
  - Flag aspect-ratio deviation > 5% (HARD FAIL for lab equipment)

## Status Label: WARNINGS

### Critical Issues (MUST FIX):
  - 4 broken asset references (electrophoresis_tank variants)

### Non-Critical Issues (SHOULD REVIEW):
  - 67 orphan SVG assets (classification and cleanup needed)
  - Per-state variant SVGs conflict with current MATERIAL_CONVENTION.md rule
  - No dynamic visual integrity checks currently implemented

## Next Steps

1. Resolve broken electrophoresis_tank references (create missing SVGs or update YAML)
2. Classify and retire unused orphan SVGs
3. Audit per-state variant assets against MATERIAL_CONVENTION.md
4. Implement artwork_integrity rendering checks
5. Update SVG_PIPELINE.md with current asset library status

## Files Analyzed

- Object library: content/objects/<kind>/*.yaml (74 total)
- SVG library: assets/equipment/*.svg (125 total)
- Specs: OBJECT_VOCABULARY.md, OBJECT_YAML_FORMAT.md, SVG_PIPELINE.md,
  PRIMARY_DESIGN.md, MATERIAL_CONVENTION.md

## 2026-05-28 fix

Resolved the 4 broken SVG references in
content/objects/equipment/electrophoresis_tank.yaml by rewriting
visual_states to point at the existing electrophoresis_tank.svg base asset
rather than the missing _with_lid, _without_lid, _with_module, and
_without_module variants. Per-variant SVG authoring was deferred as
out-of-scope; lid_present and module_present remain valid bool state
fields that protocols and validators can read, but both true/false cases
now render the single canonical tank asset. This keeps the YAML
schema-valid and the prebuild SVG registry clean (125 entries, zero
broken references). Distinct lid/module artwork can be added later by
authoring four new SVGs and pointing the cases back at them; no other
YAML or code changes are required to upgrade later. Prebuild exit 0 (the
unrelated "Zone missing id" warnings on base_scenes are pre-existing and
not introduced by this fix).
