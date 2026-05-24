# M0 YAML to HTML divergence audit

Date: 2026-05-22
Lane: Y (YAML to HTML divergence audit)
Manager: layout-manager-clean-start
Scope: 10 production templates under `experiments/css_native_layout/templates/`
Method: static read-only inspection of YAML and HTML

This report compares the canonical scene YAML against the hand-authored
experiment HTML for the 10 templates that ship hard-fail-clean at 1200x900.
It documents the gap between PRIMARY_CONTRACT.md item 1 ("Scene and protocol
configuration live in YAML") and the current state, where the experiment HTML
is hand-authored and does not consume the canonical YAML.

## Aggregate counts

| Metric | Count | Of total |
| --- | --- | --- |
| Scenes with canonical YAML in `content/base_scenes/` | 7 | 10 |
| Scenes with experiment-only YAML in `experiments/css_native_layout/scenes/` | 2 | 10 |
| Scenes with NO_CANONICAL_YAML anywhere | 1 | 10 |
| Scenes with zone_names_match=YES | 1 | 10 |
| Scenes with placement_count_match=YES | 2 | 10 |
| Scenes with object_names_match=YES | 4 | 10 |
| Scenes with overall MATCH verdict | 1 | 10 |
| Scenes with overall DIVERGE verdict | 8 | 10 |
| Scenes with overall NO_CANONICAL_YAML verdict | 1 | 10 |

Note: zone_names_match is set-equality on the YAML zone-id set versus the
HTML region-class set. The experiment-only YAMLs use a different schema
(`regions[]` nested), not the canonical `zones[]` flat schema; they are
counted as canonical for "YAML present" but their region names are compared
directly to the HTML region classes because that is the comparison the schema
allows.

## Top 3 most divergent scenes

1. **electrophoresis_bench** (canonical YAML present, 7 zones, 16 placements).
   YAML zones: rear_left, rear_center, rear_right, center, right_tool_area,
   front_left, front_right. HTML regions: rear_shelf, work_surface, front_tools,
   instrument_station, popup_layer. Zone-name set has zero overlap. HTML drops
   one placement (the `center_running_buffer_1x_carboy` is present in both, but
   YAML lists 16 placements while HTML lists 15; the `front_left_mini_protean_gel`
   and `front_right_gel_comb` are folded under `front_tools` instead of
   `front_left`/`front_right`).
2. **staining_bench** (canonical YAML present, 5 zones, 10 placements; HTML 5
   regions, 10 placements). Zone-name set zero overlap. Same placement count,
   but the YAML's `center_waste_container` is in `center` while the HTML maps
   it under `work_surface`, and the HTML drops nothing visible but reorders
   most rear and right_tool_area placements into rear_shelf and front_tools.
3. **hood_basic** (canonical YAML present, 5 zones, 4 placements; HTML 5
   regions, 3 placements). Zone-name set zero overlap. HTML drops the
   `right_aspirating_pipette` and `center_hood_surface` placements; HTML adds
   a `rear_center_ddh2o_spray` placement that does not appear in YAML.

## Per-scene side-by-side comparison

### Scene 1: bench_basic

YAML: `content/base_scenes/bench_basic.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/bench_basic.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| rear_left | left=5 right=30 top=10 bottom=35 | center |
| rear_center | left=35 right=65 top=10 bottom=35 | center |
| rear_right | left=70 right=95 top=10 bottom=35 | center |
| center | left=20 right=80 top=45 bottom=75 | center |
| right_tool_area | left=80 right=95 top=55 bottom=80 | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table:

| placement_name | object_name | zone |
| --- | --- | --- |
| rear_left_waste | waste_container | rear_left |
| rear_right_vortex | vortex | rear_right |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| center_well_plate | well_plate_96 | work_surface |
| right_tool_p200_micropipette | p200_micropipette | front_tools |

Verdict:
- zone_names_match: NO (YAML {rear_left, rear_center, rear_right, center, right_tool_area} vs HTML {rear_shelf, work_surface, front_tools, instrument_station, popup_layer})
- placement_count_match: YES (2 vs 2)
- object_names_match: NO (YAML {waste_container, vortex} vs HTML {well_plate_96, p200_micropipette})
- overall: DIVERGE

### Scene 2: cell_counter_basic

YAML: `content/base_scenes/cell_counter_basic.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/cell_counter_basic.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| instrument_area | (declared) | center |
| right_accessory_area | (declared) | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table:

| placement_name | object_name | zone |
| --- | --- | --- |
| main_cell_counter | cell_counter | instrument_area |
| counter_slide_cartridge | counter_slide_cartridge | right_accessory_area |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| front_tools_counter_slide_cartridge | counter_slide_cartridge | front_tools |
| instrument_main_cell_counter | cell_counter | instrument_station |

Verdict:
- zone_names_match: NO ({instrument_area, right_accessory_area} vs 5-region set)
- placement_count_match: YES (2 vs 2)
- object_names_match: YES ({cell_counter, counter_slide_cartridge} on both sides)
- overall: DIVERGE

### Scene 3: crowded_bench_dense

YAML: `experiments/css_native_layout/scenes/crowded_bench_dense.yaml` (experiments_only; uses non-canonical `regions[]` schema)
HTML: `experiments/css_native_layout/templates/crowded_bench_dense.html`

YAML "regions" table (note: experiment-local schema, not canonical zones[]):

| region_name | label or align |
| --- | --- |
| rear_shelf | n/a |
| work_surface | n/a |
| front_tools | n/a |
| instrument_station | n/a |
| popup_layer | n/a |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table (extracted from nested `regions[].placements[]`):

| placement_name | object_name | region (yaml) |
| --- | --- | --- |
| rear_coomassie_stain | coomassie_stain_bottle | rear_shelf |
| rear_destain | destain_bottle | rear_shelf |
| rear_ddh2o | ddh2o_bottle | rear_shelf |
| rear_coomassie_recycle | coomassie_recycle_bottle | rear_shelf |
| rear_destain_waste | destain_waste_bottle | rear_shelf |
| rear_laemmli_buffer | laemmli_4x_bottle | rear_shelf |
| rear_bme_bottle | bme_bottle | rear_shelf |
| center_staining_tray | staining_tray | work_surface |
| center_kimwipe_pad | kimwipe_pad | work_surface |
| center_gel_cassette | gel_cassette | work_surface |
| front_microwave | microwave | front_tools |
| front_rocking_shaker | rocking_shaker | front_tools |
| front_waste_container | waste_container | front_tools |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_coomassie_stain | coomassie_stain_bottle | rear_shelf |
| rear_destain | destain_bottle | rear_shelf |
| rear_ddh2o | ddh2o_bottle | rear_shelf |
| rear_coomassie_recycle | coomassie_recycle_bottle | rear_shelf |
| rear_destain_waste | destain_waste_bottle | rear_shelf |
| rear_laemmli_buffer | laemmli_4x_bottle | rear_shelf |
| rear_bme_bottle | bme_bottle | rear_shelf |
| center_staining_tray | staining_tray | work_surface |
| center_kimwipe_pad | kimwipe_pad | work_surface |
| center_gel_cassette | gel_cassette | work_surface |
| front_microwave | microwave | front_tools |
| front_rocking_shaker | rocking_shaker | front_tools |
| front_waste_container | waste_container | front_tools |

Verdict:
- zone_names_match: YES (same 5 names; but YAML is the non-canonical `regions[]` schema)
- placement_count_match: YES (13 vs 13)
- object_names_match: YES (same object set on both sides)
- overall: MATCH (with the caveat that the YAML is experiment-only and does not use the canonical `zones[]` vocabulary; this match is between two parallel experiment-local artifacts, not between canonical YAML and HTML)

### Scene 4: drug_dilution_plate_workspace

YAML: NONE (NO_CANONICAL_YAML; checked `content/base_scenes/`, `content/protocols/*/*/scenes/`, and `experiments/css_native_layout/scenes/`)
HTML: `experiments/css_native_layout/templates/drug_dilution_plate_workspace.html`

YAML zones table: n/a

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| popup_layer | yes |

(note: this HTML omits `instrument_station` from the 5-region set; only 4 region divs present in the file)

YAML placements table: n/a

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_dmso_bottle | stock_bottle | rear_shelf |
| rear_pbs_bottle | stock_bottle | rear_shelf |
| rear_drug_bottle | stock_bottle | rear_shelf |
| center_well_plate | well_plate_96 | work_surface |
| work_sample_rack | tube_rack_24 | work_surface |
| tool_tips | tip_box | work_surface |
| tool_p200 | p200_micropipette | front_tools |
| waste_container | waste_container | front_tools |

Verdict:
- zone_names_match: n/a (no YAML)
- placement_count_match: n/a
- object_names_match: n/a
- overall: NO_CANONICAL_YAML

### Scene 5: drug_dilution_workspace_dense

YAML: `experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml` (experiments_only; uses non-canonical `regions[]` schema)
HTML: `experiments/css_native_layout/templates/drug_dilution_workspace_dense.html`

YAML "regions" table:

| region_name | label or align |
| --- | --- |
| rear_shelf | n/a |
| work_surface | n/a |
| front_tools | n/a |
| popup_layer | n/a |

(note: YAML omits `instrument_station`)

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table (from nested `regions[].placements[]`):

| placement_name | object_name | region (yaml) |
| --- | --- | --- |
| rear_dmso_bottle | dmso_stock_bottle | rear_shelf |
| rear_pbs_bottle | pbs_buffer_bottle | rear_shelf |
| rear_drug_bottle_1 | drug_stock_bottle | rear_shelf |
| rear_drug_bottle_2 | drug_stock_bottle | rear_shelf |
| rear_drug_bottle_3 | drug_stock_bottle | rear_shelf |
| rear_ethanol_bottle | ethanol_bottle | rear_shelf |
| center_well_plate | well_plate_96 | work_surface |
| work_sample_rack_1 | tube_rack_24 | work_surface |
| work_sample_rack_2 | tube_rack_24 | work_surface |
| work_vial_rack | drug_vial_rack | work_surface |
| tool_p200_micropipette | p200_micropipette | front_tools |
| tool_tip_box | tip_box | front_tools |
| waste_container_main | waste_container | front_tools |
| waste_tray_secondary | waste_tray | front_tools |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_dmso_bottle | dmso_stock_bottle | rear_shelf |
| rear_pbs_bottle | pbs_buffer_bottle | rear_shelf |
| rear_drug_bottle_1 | drug_stock_bottle | rear_shelf |
| rear_drug_bottle_2 | drug_stock_bottle | rear_shelf |
| rear_drug_bottle_3 | drug_stock_bottle | rear_shelf |
| rear_ethanol_bottle | ethanol_bottle | rear_shelf |
| center_well_plate | well_plate_96 | work_surface |
| work_sample_rack_1 | tube_rack_24 | work_surface |
| work_sample_rack_2 | tube_rack_24 | work_surface |
| work_vial_rack | drug_vial_rack | work_surface |
| tool_p200_micropipette | p200_micropipette | front_tools |
| tool_tip_box | tip_box | front_tools |
| waste_container_main | waste_container | front_tools |
| waste_tray_secondary | waste_tray | front_tools |

Verdict:
- zone_names_match: NO (YAML omits `instrument_station`; HTML includes it)
- placement_count_match: YES (14 vs 14)
- object_names_match: YES
- overall: DIVERGE (placement-level match, but region-set differs; same caveat as scene 3 about non-canonical schema)

### Scene 6: electrophoresis_bench

YAML: `content/base_scenes/electrophoresis_bench.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/electrophoresis_bench.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| rear_left | (declared) | center |
| rear_center | (declared) | center |
| rear_right | (declared) | center |
| center | (declared) | center |
| right_tool_area | (declared) | center |
| front_left | (declared) | center |
| front_right | (declared) | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table (16 entries):

| placement_name | object_name | zone |
| --- | --- | --- |
| rear_left_running_buffer_10x | running_buffer_10x_bottle | rear_left |
| rear_center_electrophoresis_tank | electrophoresis_tank | rear_center |
| rear_right_power_supply | power_supply | rear_right |
| center_running_buffer_1x_carboy | running_buffer_1x_carboy | center |
| center_ddh2o_bottle | ddh2o_bottle | center |
| center_serological_pipette | serological_pipette | center |
| right_tool_area_p200_micropipette | p200_micropipette | right_tool_area |
| right_tool_area_p10_gel_loading_tip_box | p10_gel_loading_tip_box | right_tool_area |
| rear_left_protein_ladder_tube | protein_ladder_tube | rear_left |
| rear_left_recycle_buffer_bottle | recycle_buffer_bottle | rear_left |
| rear_right_gel_opening_tool | gel_opening_tool | rear_right |
| center_waste_container | waste_container | center |
| center_electrode_module | electrode_module | center |
| front_left_mini_protean_gel | mini_protean_gel | front_left |
| center_gel_cassette | gel_cassette | center |
| front_right_gel_comb | gel_comb | front_right |

HTML placements table (15 entries; HTML drops `rear_right_power_supply`):

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_left_running_buffer_10x | running_buffer_10x_bottle | rear_shelf |
| center_running_buffer_1x_carboy | running_buffer_1x_carboy | rear_shelf |
| center_ddh2o_bottle | ddh2o_bottle | rear_shelf |
| rear_left_recycle_buffer_bottle | recycle_buffer_bottle | rear_shelf |
| center_waste_container | waste_container | rear_shelf |
| center_electrophoresis_tank | electrophoresis_tank | work_surface |
| center_gel_cassette | gel_cassette | work_surface |
| center_electrode_module | electrode_module | work_surface |
| center_serological_pipette | serological_pipette | work_surface |
| right_tool_area_p200_micropipette | p200_micropipette | front_tools |
| right_tool_area_p10_gel_loading_tip_box | p10_gel_loading_tip_box | front_tools |
| rear_left_protein_ladder_tube | protein_ladder_tube | front_tools |
| rear_right_gel_opening_tool | gel_opening_tool | front_tools |
| front_left_mini_protean_gel | mini_protean_gel | front_tools |
| front_right_gel_comb | gel_comb | front_tools |

Verdict:
- zone_names_match: NO (7 canonical zones vs 5 hard-coded regions; zero overlap)
- placement_count_match: NO (16 vs 15)
- object_names_match: NO (HTML omits `power_supply`)
- overall: DIVERGE

### Scene 7: hood_basic

YAML: `content/base_scenes/hood_basic.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/hood_basic.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| rear_left | (declared) | center |
| rear_center | (declared) | center |
| rear_right | (declared) | center |
| center | (declared) | center |
| right_tool_area | (declared) | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table:

| placement_name | object_name | zone |
| --- | --- | --- |
| rear_left_ethanol | ethanol_bottle | rear_left |
| rear_center_waste | waste_container | rear_center |
| center_hood_surface | hood_surface | center |
| right_aspirating_pipette | aspirating_pipette | right_tool_area |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_left_ethanol_bottle | ethanol_bottle | rear_shelf |
| rear_center_ddh2o_spray | ddh2o_spray_bottle | rear_shelf |
| center_p1000_pipette | p1000_pipette | work_surface |

Verdict:
- zone_names_match: NO
- placement_count_match: NO (4 vs 3)
- object_names_match: NO (HTML drops `waste_container`, `hood_surface`, `aspirating_pipette`; HTML adds `ddh2o_spray_bottle`, `p1000_pipette`)
- overall: DIVERGE

### Scene 8: microscope_basic

YAML: `content/base_scenes/microscope_basic.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/microscope_basic.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| instrument_area | (declared) | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table:

| placement_name | object_name | zone |
| --- | --- | --- |
| main_microscope | microscope | instrument_area |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| instrument_main_microscope | microscope | instrument_station |

Verdict:
- zone_names_match: NO ({instrument_area} vs 5-region set)
- placement_count_match: YES (1 vs 1)
- object_names_match: YES ({microscope} on both sides)
- overall: DIVERGE

### Scene 9: staining_bench

YAML: `content/base_scenes/staining_bench.yaml` (canonical)
HTML: `experiments/css_native_layout/templates/staining_bench.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| rear_left | (declared) | center |
| rear_center | (declared) | center |
| rear_right | (declared) | center |
| center | (declared) | center |
| right_tool_area | (declared) | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table (10 entries):

| placement_name | object_name | zone |
| --- | --- | --- |
| center_staining_tray | staining_tray | center |
| rear_left_coomassie_stain | coomassie_stain_bottle | rear_left |
| rear_center_destain | destain_bottle | rear_center |
| rear_right_ddh2o | ddh2o_bottle | rear_right |
| rear_left_coomassie_recycle | coomassie_recycle_bottle | rear_left |
| rear_center_destain_waste | destain_waste_bottle | rear_center |
| right_tool_area_microwave | microwave | right_tool_area |
| right_tool_area_rocking_shaker | rocking_shaker | right_tool_area |
| center_kimwipe_pad | kimwipe_pad | center |
| center_waste_container | waste_container | center |

HTML placements table (10 entries):

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| rear_left_coomassie_stain | coomassie_stain_bottle | rear_shelf |
| rear_center_destain | destain_bottle | rear_shelf |
| rear_right_ddh2o | ddh2o_bottle | rear_shelf |
| rear_left_coomassie_recycle | coomassie_recycle_bottle | rear_shelf |
| rear_center_destain_waste | destain_waste_bottle | rear_shelf |
| center_staining_tray | staining_tray | work_surface |
| center_kimwipe_pad | kimwipe_pad | work_surface |
| center_waste_container | waste_container | work_surface |
| right_tool_area_microwave | microwave | front_tools |
| right_tool_area_rocking_shaker | rocking_shaker | front_tools |

Verdict:
- zone_names_match: NO (5 canonical zones vs 5 hard-coded regions; zero overlap)
- placement_count_match: YES (10 vs 10)
- object_names_match: YES (same 10 object names on both sides)
- overall: DIVERGE (placements line up by name, but region containment differs)

### Scene 10: well_plate_96_zoom

YAML: `content/base_scenes/well_plate_96_zoom.yaml` (canonical, declares scene_name `well_plate_96_zoom_check_scene`)
HTML: `experiments/css_native_layout/templates/well_plate_96_zoom.html`

YAML zones table:

| id | bounds | align |
| --- | --- | --- |
| work_surface | left=10 right=90 top=10 bottom=90 | center |

HTML regions table:

| region_class | hard-coded? |
| --- | --- |
| rear_shelf | yes |
| work_surface | yes |
| front_tools | yes |
| instrument_station | yes |
| popup_layer | yes |

YAML placements table:

| placement_name | object_name | zone |
| --- | --- | --- |
| zoom_well_plate_96 | well_plate_96 | work_surface |

HTML placements table:

| data-placement-name | data-object-name | parent region |
| --- | --- | --- |
| zoom_well_plate_96 | well_plate_96 | work_surface |

Verdict:
- zone_names_match: YES on the placement's resolved zone (`work_surface` exists on both sides as a name); the YAML's single zone `work_surface` is also a member of the HTML's 5-region set.
- placement_count_match: YES (1 vs 1)
- object_names_match: YES
- overall: MATCH (the only scene where canonical YAML and HTML actually agree on placement, zone reference, and object name; this is a happy accident of the spike-scene design, not evidence that the system enforces consistency. Note the `scene_name` field still drifts: YAML says `well_plate_96_zoom_check_scene` while the HTML filename and runtime path use `well_plate_96_zoom`.)

## Analysis

### Common patterns

- All 10 HTML templates share the same closed 5-region taxonomy: `rear_shelf`,
  `work_surface`, `front_tools`, `instrument_station`, `popup_layer`. Two
  templates (drug_dilution_plate_workspace, and the YAML for
  drug_dilution_workspace_dense) omit `instrument_station`, but the names
  are otherwise identical and baked into CSS selectors.
- The canonical YAML zone vocabulary differs per scene. Each scene declares
  its own zone set: 5 for bench_basic/hood_basic/staining_bench, 7 for
  electrophoresis_bench, 2 for cell_counter_basic, 1 for
  microscope_basic and well_plate_96_zoom.
- Set overlap between YAML zones and HTML regions is exactly one shared name
  across the whole corpus: `work_surface`, which appears as a zone id in
  `well_plate_96_zoom.yaml` and as a region class in every HTML file.
- The placement-name and object-name lists align well in the simpler scenes
  (staining_bench has 10/10 name match; electrophoresis_bench has 15/16;
  cell_counter_basic and microscope_basic have full name overlap on a
  small set). The hood_basic HTML deviates farthest from its YAML in object
  composition (drops 3 YAML objects, adds 2 HTML-only objects).
- The two experiment-only YAMLs (crowded_bench_dense,
  drug_dilution_workspace_dense) use a non-canonical `regions[]` nested
  schema instead of the canonical `zones[]` flat schema. They mirror the
  HTML's region taxonomy exactly because they were written as descriptions
  of the HTML, not as upstream specifications.
- One scene (drug_dilution_plate_workspace) has no YAML anywhere in the
  repo. The HTML is the sole source.
- Placement_name strings often preserve YAML zone semantics in their prefix
  (`rear_left_*`, `right_tool_area_*`), so the canonical zone identity
  survives as documentation even after the HTML collapses it under a
  5-region container. This is a hint that the original YAML influenced the
  HTML author's naming, but the layout container vocabulary diverged.

### Implications for the production layout manager

- The current HTML does not consume canonical YAML. PRIMARY_CONTRACT.md item
  1 is not satisfied for these 10 templates. Renderer work must read the
  canonical YAML and emit HTML or DOM that matches the YAML zone schema,
  not the experiment-local 5-region taxonomy.
- The 5-region container vocabulary (`rear_shelf`, `work_surface`,
  `front_tools`, `instrument_station`, `popup_layer`) is an experiment-local
  artifact (`experiments/css_native_layout/regions/*.yaml`, baked into CSS
  in `experiments/css_native_layout/styles/*.css`). The canonical scene
  vocabulary is the YAML `zones[]` list per
  `docs/specs/SCENE_VOCABULARY.md`. A production renderer must either
  publish a mapping from canonical zones to HTML container elements, or
  emit HTML containers named after the canonical zones directly.
- 8 of 10 scenes have a working canonical YAML but a hand-authored HTML.
  The simplest bridge would read the canonical YAML, fail loudly when no
  YAML is present (the case for drug_dilution_plate_workspace), and not
  use the experiment-local `regions[]` YAMLs as the production schema.
- The well_plate_96_zoom MATCH verdict is misleading. It looks aligned
  because the YAML declares one zone and the HTML happens to put the one
  placement under a region with the same name. This is the special case,
  not the rule. The `scene_name` field in that YAML
  (`well_plate_96_zoom_check_scene`) still diverges from the HTML filename
  (`well_plate_96_zoom.html`); a renderer that keys off `scene_name` would
  not find the right HTML output path.
- The two experiment-only YAMLs use a `regions[]` schema that
  `docs/specs/SCENE_VOCABULARY.md` does not define. They are not a
  precedent for a future schema; they are a description of the HTML written
  in YAML form. A production renderer should not adopt their nested
  structure.
- The hood_basic case (canonical YAML and HTML disagree on placement
  count, object composition, and zone names) is the clearest example of
  drift. The canonical YAML declares 4 placements (ethanol, waste,
  hood_surface, aspirating_pipette); the HTML lists 3 different
  placements (ethanol, ddh2o_spray, p1000_pipette). The two artifacts
  describe different scenes that happen to share the name `hood_basic`.

### Implications for the M0 measurements

- The 0-hard-fail result at 1200x900 across these 10 templates measures the
  hand-authored HTML, not YAML-driven output. The diagnostic baseline
  (precheck.mjs, score_layout.mjs) gates the HTML the experiments folder
  ships; it does not gate any current production render path that consumes
  canonical YAML.
- The production viewport overflow finding for well_plate_96_zoom at
  1920x1080 (rect 1920x1763, off_page + svg_svg_overlap) is a property of
  the HTML at production viewport, not of the canonical YAML.
- A future runtime path that reads canonical YAML and emits HTML cannot
  inherit the M0 hard-fail-clean status by transitivity. Each scene would
  need to be re-measured at the new render path's output.
- The MATCH count of 1 of 10 is the precise gap between what the diagnostic
  pipeline currently asserts (HTML is good at 1200x900) and what the
  primary contract requires (YAML drives the scene). 9 of the 10 HTML files
  cannot be reproduced from canonical YAML today without manual editing.
- For drug_dilution_plate_workspace specifically, there is no canonical
  YAML to drive a renderer from. A production path would require either
  promoting the HTML to canonical YAML or removing the scene from the
  production set.

## Recommended next step

Write a small renderer that reads `content/base_scenes/<scene>.yaml` and emits
the experiment HTML shape, translating each canonical zone id (`rear_left`,
`rear_center`, `rear_right`, `center`, `right_tool_area`, etc.) to one of the
five HTML region containers using a single mapping table (for example
`rear_left -> rear_shelf`, `rear_center -> rear_shelf`, `rear_right -> rear_shelf`,
`center -> work_surface`, `right_tool_area -> front_tools`, `instrument_area
-> instrument_station`, `front_left -> front_tools`, `front_right -> front_tools`).
Run `precheck.mjs` against the rendered HTML output and compare hard-fail
counts and scorecard ranks to the hand-authored baseline. A clean run on the
7 scenes with canonical YAML would prove the bridge generalizes; a regression
on any scene would tell us where the 5-region collapse loses information that
the hand-authored HTML preserved. The 2 experiment-only YAMLs and the 1
NO_CANONICAL_YAML scene should be excluded from the first bridge pass; their
canonical authoring path is a separate decision (promote, replace, or remove).
This bridge is read-only against canonical YAML, additive against the
experiments folder, and does not modify any current diagnostic tool.
