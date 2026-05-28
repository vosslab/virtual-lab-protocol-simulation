# Scene object audit

Date: 2026-05-22
Lane: B (scene object audit)
Scope: read-only audit of object-like elements across experiment templates, showcase HTML, rendered stress scenes, and hand-authored scene YAML, with SVG asset resolution against `assets/equipment/`.
Output: this document only. No code, CSS, template, or asset edits.

## 1. Methodology

Audit pass enumerates every `.placement` `<div>` in each HTML target plus every `object_name:` entry in each YAML scene manifest. Each placement is one object record. For each record:

- `object_name` is read from `data-object-name="<value>"` in the placement opening tag (HTML) or the `object_name:` YAML key.
- `<img src>` is read from the first `<img>` element inside that placement block. YAML files have no `<img>` tag; existence is resolved by checking `assets/equipment/<object_name>.svg` and common variant suffixes (`_filled`, `_empty`, `_new`, `_old`, `_closed`, `_open`, `_idle`, `_running`, `_off`, `_on`, `_v2`..`_v5`, `_legacy`, `_servier`).
- SVG existence is checked against the live filesystem listing of `assets/equipment/` (128 entries; 124 `.svg`).
- A reference is classified `placeholder` when the SVG filename is exactly `_placeholder.svg` or contains the substring `_placeholder.svg` (catches the experiment-local fallback plus the tracked `microtube_rack_24_placeholder.svg`).
- A reference is classified `wrong_asset` when the SVG exists but its filename root does not match the object name, after stripping common variant suffixes and a curated list of accepted aliases (for example `well_plate_96 -> 96well_pcr_plate.svg`, `ethanol_bottle -> bottle.svg`, `protein_sample_tube_a -> protein_sample_tube_filled.svg`).

Files audited:

- `experiments/css_native_layout/templates/*.html`: 10 top-level templates plus `dir_b/` and `dir_c/` direction variants (30 HTML files total).
- `experiments/css_native_layout/showcase/*.html`: 10 top-level interactive demos (subdirectories `concepts/`, `label_policies/`, `styles/` are out of scope).
- `experiments/css_native_layout/stress_scenes/rendered/*.html`: 10 `gold_*` reference scenes plus 20 sampled `stress_*` scenes (2 of each of 10 stress generator prefixes) out of 110 total rendered scenes.
- `experiments/css_native_layout/scenes/*.yaml`: 2 hand-authored YAML scene manifests.

Helper scripts used during the audit were temporary `_temp_lane_b_*.py` files under the repo root; they are not committed and not part of this lane.

## 2. Per-template tables

### Templates: top-level hand-authored (10 files)

#### `experiments/css_native_layout/templates/bench_basic.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/cell_counter_basic.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `counter_slide_cartridge` | `cell_counter.svg` | YES | real | KEEP |
| `cell_counter` | `cell_counter_new.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/crowded_bench_dense.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle` | `coomassie_stain_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `coomassie_recycle_bottle` | `coomassie_recycle_bottle_filled.svg` | YES | real | KEEP |
| `destain_waste_bottle` | `destain_waste_bottle_filled.svg` | YES | real | KEEP |
| `laemmli_4x_bottle` | `laemmli_4x_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `staining_tray` | `staining_tray_empty.svg` | YES | real | KEEP |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `microwave` | `microwave_closed.svg` | YES | real | KEEP |
| `rocking_shaker` | `rocking_shaker_idle.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/drug_dilution_plate_workspace.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `stock_bottle` | `destain_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `stock_bottle` | `ddh2o_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `stock_bottle` | `bme_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `tube_rack_24` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/drug_dilution_workspace_dense.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `dmso_stock_bottle` | `destain_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `pbs_buffer_bottle` | `ddh2o_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `bme_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `laemmli_4x_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `coomassie_stain_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `ethanol_bottle` | `bottle.svg` | YES | real | KEEP |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `tube_rack_24` | `dilution_tube_rack.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `tube_rack_24` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/electrophoresis_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `running_buffer_10x_bottle` | `running_buffer_10x_bottle_filled.svg` | YES | real | KEEP |
| `running_buffer_1x_carboy` | `running_buffer_1x_carboy_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `recycle_buffer_bottle` | `running_buffer_10x_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `electrode_module` | `electrode_module.svg` | YES | real | KEEP |
| `serological_pipette` | `aspirating_pipette.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `p10_gel_loading_tip_box` | `p10_gel_loading_tip_box.svg` | YES | real | KEEP |
| `protein_ladder_tube` | `protein_ladder_tube_filled.svg` | YES | real | KEEP |
| `gel_opening_tool` | `gel_opening_tool.svg` | YES | real | KEEP |
| `mini_protean_gel` | `mini_protean_gel.svg` | YES | real | KEEP |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/hood_basic.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ethanol_bottle` | `bottle.svg` | YES | real | KEEP |
| `ddh2o_spray_bottle` | `ethanol_spray.svg` | YES | real | KEEP |
| `p1000_pipette` | `aspirating_pipette.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/microscope_basic.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `microscope` | `centrifuge_new.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |

#### `experiments/css_native_layout/templates/staining_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle` | `coomassie_stain_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `coomassie_recycle_bottle` | `coomassie_recycle_bottle_filled.svg` | YES | real | KEEP |
| `destain_waste_bottle` | `destain_waste_bottle_filled.svg` | YES | real | KEEP |
| `staining_tray` | `staining_tray_empty.svg` | YES | real | KEEP |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `microwave` | `microwave_closed.svg` | YES | real | KEEP |
| `rocking_shaker` | `rocking_shaker_idle.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/templates/well_plate_96_zoom.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |

### Templates: direction variants (`dir_b/`, `dir_c/`)

`dir_b/` and `dir_c/` mirror the top-level `templates/` set. They reorder placements but otherwise share the same object roster, except where noted below. Per-row tables are omitted because the placement sets duplicate the top-level tables.

| template | top placements | dir_b placements | dir_c placements | dir_b vs top diff | dir_c vs top diff |
| --- | --- | --- | --- | --- | --- |
| `bench_basic.html` | 2 | 2 | 2 | (identical) | (identical) |
| `cell_counter_basic.html` | 2 | 2 | 2 | (identical) | (identical) |
| `crowded_bench_dense.html` | 13 | 13 | 13 | (identical) | (identical) |
| `drug_dilution_plate_workspace.html` | 8 | 8 | 8 | top-only: `tube_rack_24` -> `microtube_rack_24_placeholder.svg`; dir_b-only: `tube_rack_24` -> `dilution_tube_rack.svg` | top-only: `tube_rack_24` -> `microtube_rack_24_placeholder.svg`; dir_c-only: `tube_rack_24` -> `dilution_tube_rack.svg` |
| `drug_dilution_workspace_dense.html` | 14 | 14 | 14 | (identical) | (identical) |
| `electrophoresis_bench.html` | 15 | 16 | 16 | top-only: ; dir_b-only: `power_supply` -> `power_supply_off.svg` | top-only: ; dir_c-only: `power_supply` -> `power_supply_off.svg` |
| `hood_basic.html` | 3 | 3 | 3 | (identical) | (identical) |
| `microscope_basic.html` | 1 | 1 | 1 | top-only: `microscope` -> `centrifuge_new.svg`; dir_b-only: `microscope` -> `microscope_new.svg` | top-only: `microscope` -> `centrifuge_new.svg`; dir_c-only: `microscope` -> `microscope_new.svg` |
| `staining_bench.html` | 10 | 10 | 10 | (identical) | (identical) |
| `well_plate_96_zoom.html` | 1 | 1 | 1 | (identical) | (identical) |

### Showcase: top-level interactive demos

#### `experiments/css_native_layout/showcase/diagnostic_overlay_demo.html`

No object-like elements found.

#### `experiments/css_native_layout/showcase/drug_dilution_teaching_demo.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `dmso_stock_bottle` | `destain_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `pbs_buffer_bottle` | `ddh2o_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `bme_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `laemmli_4x_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_stock_bottle` | `coomassie_stain_bottle_filled.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `ethanol_bottle` | `bottle.svg` | YES | real | KEEP |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `tube_rack_24` | `dilution_tube_rack.svg` | YES | WRONG-ASSET | REPLACE_WITH_REAL_SVG |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/electrophoresis_compelling_demo.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `running_buffer_1x_carboy` | `running_buffer_1x_carboy_filled.svg` | YES | real | KEEP |
| `running_buffer_10x_bottle` | `running_buffer_10x_bottle_filled.svg` | YES | real | KEEP |
| `protein_ladder_tube` | `protein_ladder_tube_filled.svg` | YES | real | KEEP |
| `protein_sample_tube_a` | `protein_sample_tube_filled.svg` | YES | real | KEEP |
| `protein_sample_tube_b` | `protein_sample_tube_filled.svg` | YES | real | KEEP |
| `power_supply` | `power_supply_on.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `p10_gel_loading_tip_box` | `p10_gel_loading_tip_box.svg` | YES | real | KEEP |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `electrode_module` | `electrode_module.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/hover_reveal_demo.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle` | `coomassie_stain_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `laemmli_4x_bottle` | `laemmli_4x_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `staining_tray` | `staining_tray_empty.svg` | YES | real | KEEP |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `microwave` | `microwave_closed.svg` | YES | real | KEEP |
| `rocking_shaker` | `rocking_shaker_idle.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/index.html`

No object-like elements found.

#### `experiments/css_native_layout/showcase/selected_well_demo.html`

No object-like elements found.

#### `experiments/css_native_layout/showcase/style_clean_instructional_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `p10_micropipette` | `p10_micropipette_filled.svg` | YES | real | KEEP |
| `microtube_rack` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `centrifuge` | `centrifuge_new.svg` | YES | real | KEEP |
| `heat_block` | `heat_block_closed.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/style_high_contrast_diagnostic_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `p10_micropipette` | `p10_micropipette_filled.svg` | YES | real | KEEP |
| `microtube_rack` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `centrifuge` | `centrifuge_new.svg` | YES | real | KEEP |
| `heat_block` | `heat_block_closed.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/style_lab_bench_realistic_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ddh2o_bottle` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | real | KEEP |
| `p10_micropipette` | `p10_micropipette_filled.svg` | YES | real | KEEP |
| `microtube_rack` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box` | `tip_box_new.svg` | YES | real | KEEP |
| `centrifuge` | `centrifuge_new.svg` | YES | real | KEEP |
| `heat_block` | `heat_block_closed.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/showcase/well_plate_96_zoom_polish.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `96well_pcr_plate.svg` | YES | real | KEEP |

### Stress scenes: `gold_*` reference scenes (all 10)

#### `experiments/css_native_layout/stress_scenes/rendered/gold_cell_counter_station.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `counting_cartridge` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `cell_counter` | `cell_counter.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_drug_dilution_workspace.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `dmso_stock_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ddh2o_bottle` | `ddh2o_bottle.svg` | YES | real | KEEP |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `well_plate_96` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dilution_tube_rack` | `dilution_tube_rack.svg` | YES | real | KEEP |
| `microtube_rack_24_placeholder` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `tip_box` | `tip_box.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_electrophoresis_full_setup.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `running_buffer_1x_carboy` | `running_buffer_1x_carboy.svg` | YES | real | KEEP |
| `running_buffer_10x_bottle` | `running_buffer_10x_bottle.svg` | YES | real | KEEP |
| `protein_ladder_tube` | `protein_ladder_tube.svg` | YES | real | KEEP |
| `protein_sample_tube` | `protein_sample_tube.svg` | YES | real | KEEP |
| `protein_sample_tube` | `protein_sample_tube.svg` | YES | real | KEEP |
| `protein_sample_tube` | `protein_sample_tube.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |
| `power_supply_off` | `power_supply_off.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_heat_block_sample_prep.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `laemmli_4x_bottle_filled` | `laemmli_4x_bottle_filled.svg` | YES | real | KEEP |
| `bme_bottle_filled` | `bme_bottle_filled.svg` | YES | real | KEEP |
| `microtube_rack_24_placeholder` | `microtube_rack_24_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `microtube_filled` | `microtube_filled.svg` | YES | real | KEEP |
| `microtube_empty` | `microtube_empty.svg` | YES | real | KEEP |
| `microtube_empty` | `microtube_empty.svg` | YES | real | KEEP |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `heat_block_open` | `heat_block_open.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_hood_prep.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ethanol_spray` | `ethanol_spray.svg` | YES | real | KEEP |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `t75_flask_v3` | `t75_flask_v3.svg` | YES | real | KEEP |
| `conical_15ml_rack` | `conical_15ml_rack.svg` | YES | real | KEEP |
| `aspirating_pipette` | `aspirating_pipette.svg` | YES | real | KEEP |
| `serological_pipette` | `serological_pipette.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_microscope_slide_prep.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle_filled` | `coomassie_stain_bottle_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle_filled` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `glass_slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glass_slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glass_slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glass_slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `tip_box` | `tip_box.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `microscope_new` | `microscope_new.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_mixed_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ddh2o_bottle_filled` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `t75_flask_v3` | `t75_flask_v3.svg` | YES | real | KEEP |
| `graduated_cylinder` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `graduated_cylinder` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `p200_micropipette_empty` | `p200_micropipette_empty.svg` | YES | real | KEEP |
| `glass_slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `lab_marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `centrifuge` | `centrifuge.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_plate_reader_assay.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `mtt_vial` | `mtt_vial.svg` | YES | real | KEEP |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `bottle` | `bottle.svg` | YES | real | KEEP |
| `96well_pcr_plate` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `multichannel_pipette_new` | `multichannel_pipette_new.svg` | YES | real | KEEP |
| `tip_box` | `tip_box.svg` | YES | real | KEEP |
| `tip_box` | `tip_box.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `plate_reader_new` | `plate_reader_new.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_staining_bench.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle_filled` | `coomassie_stain_bottle_filled.svg` | YES | real | KEEP |
| `destain_bottle_filled` | `destain_bottle_filled.svg` | YES | real | KEEP |
| `ddh2o_bottle_filled` | `ddh2o_bottle_filled.svg` | YES | real | KEEP |
| `coomassie_recycle_bottle` | `coomassie_recycle_bottle.svg` | YES | real | KEEP |
| `destain_waste_bottle_empty` | `destain_waste_bottle_empty.svg` | YES | real | KEEP |
| `staining_tray_empty` | `staining_tray_empty.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `rocking_shaker_idle` | `rocking_shaker_idle.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/gold_well_plate_96_zoom_with_state.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `96well_pcr_plate` | `96well_pcr_plate.svg` | YES | real | KEEP |
| `well_state_legend` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

### Stress scenes: sampled `stress_*` scenes

Sampled 20 of 110 rendered stress scene files. Two per prefix to confirm pattern consistency across each generator class.

#### `experiments/css_native_layout/stress_scenes/rendered/stress_composition_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dmso_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `tube_rack_24` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_composition_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `flask_250ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sample_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microtube_rack` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_dense_clutter_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `well_plate_24` | `well_plate_24.svg` | YES | real | KEEP |
| `drug_vial` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microtube_rack` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sample_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_dense_clutter_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `well_plate_96` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microtube` | `microtube.svg` | YES | real | KEEP |
| `microtube` | `microtube.svg` | YES | real | KEEP |
| `sample_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ladder_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_extreme_aspect_scene_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `graduated_cylinder_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `carboy_5l` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `water_bath` | `water_bath.svg` | YES | real | KEEP |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_extreme_aspect_scene_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `graduated_cylinder_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `flask_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `tip_box_200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_instrument_heavy_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |
| `centrifuge` | `centrifuge.svg` | YES | real | KEEP |
| `electrophoresis_tank` | `electrophoresis_tank.svg` | YES | real | KEEP |
| `cell_counter` | `cell_counter.svg` | YES | real | KEEP |
| `heat_block` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `plate_reader` | `plate_reader.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_instrument_heavy_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `incubator` | `incubator.svg` | YES | real | KEEP |
| `power_supply` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `centrifuge` | `centrifuge.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_long_label_scene_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `concentrated_hydrochloric_acid_stock_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `bovine_serum_albumin_blocking_solution_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tetramethylethylenediamine_catalyst_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `phosphate_buffered_saline_solution_bottle_500ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `fluorescein_isothiocyanate_conjugate_microtube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dimethyl_sulfoxide_vehicle_control_vial` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_long_label_scene_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `concentrated_hydrochloric_acid_stock_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tetramethylethylenediamine_catalyst_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tris_acetate_edta_electrophoresis_buffer_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `phosphate_buffered_saline_solution_bottle_500ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `bovine_serum_albumin_blocking_solution_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `fluorescein_isothiocyanate_conjugate_microtube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `polymerase_chain_reaction_master_mix_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `recombinant_human_insulin_growth_factor_stock` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dimethyl_sulfoxide_vehicle_control_vial` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_many_bottles_scene_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `sodium_hydroxide_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glycerol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `methanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `hydrochloric_acid_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glycerol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `water_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sds_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dmso_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `edta_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tris_buffer_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `water_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `methanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `water_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tween20_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_many_bottles_scene_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `water_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dmso_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tris_buffer_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `methanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `glycerol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `hydrochloric_acid_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sds_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tween20_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `dmso_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sodium_hydroxide_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tris_buffer_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tween20_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `ethanol_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `pbs_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `edta_bottle` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_many_small_tools_scene_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_many_small_tools_scene_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p1000` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `kimwipes` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_tall_glassware_scene_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `graduated_cylinder_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `erlenmeyer_2000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `graduated_cylinder_500ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `carboy_5l` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `flask_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microtube` | `microtube.svg` | YES | real | KEEP |
| `sample_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_tall_glassware_scene_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `graduated_cylinder_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `erlenmeyer_2000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `flask_1000ml` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `sample_tube` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `tip_box_10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_template_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `drug_vial` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `micropipette_p200` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `cell_counter` | `cell_counter.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_template_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `slide` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `cell_counter` | `cell_counter.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_zoom_detail_001.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `gel_comb` | `gel_comb.svg` | YES | real | KEEP |
| `micropipette_p10` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `microscope` | `microscope.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/stress_scenes/rendered/stress_zoom_detail_002.html`

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `well_plate_96` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `marker` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |
| `brush` | `_placeholder.svg` | NO | PLACEHOLDER | DELETE_PLACEHOLDER |

### YAML scenes (hand-authored)

#### `experiments/css_native_layout/scenes/crowded_bench_dense.yaml`

No `<img src>` tags; YAML lists `object_name` only. SVG existence checked against `assets/equipment/<object_name>.svg` and common variant suffixes (`_filled`, `_new`, ...).

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `coomassie_stain_bottle` | `coomassie_stain_bottle.svg` | YES | real | KEEP |
| `destain_bottle` | `destain_bottle.svg` | YES | real | KEEP |
| `ddh2o_bottle` | `ddh2o_bottle.svg` | YES | real | KEEP |
| `coomassie_recycle_bottle` | `coomassie_recycle_bottle.svg` | YES | real | KEEP |
| `destain_waste_bottle` | `destain_waste_bottle.svg` | YES | real | KEEP |
| `laemmli_4x_bottle` | `laemmli_4x_bottle.svg` | YES | real | KEEP |
| `bme_bottle` | `bme_bottle.svg` | YES | real | KEEP |
| `staining_tray` | `staining_tray_empty.svg` | YES | variant | RE-NAME_OBJECT |
| `kimwipe_pad` | `kimwipe_pad.svg` | YES | real | KEEP |
| `gel_cassette` | `gel_cassette.svg` | YES | real | KEEP |
| `microwave` | `microwave.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `rocking_shaker` | `rocking_shaker.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |

#### `experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml`

No `<img src>` tags; YAML lists `object_name` only. SVG existence checked against `assets/equipment/<object_name>.svg` and common variant suffixes (`_filled`, `_new`, ...).

| object_name | SVG referenced | SVG exists | status | recommended fix |
| --- | --- | --- | --- | --- |
| `dmso_stock_bottle` | `dmso_stock_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `pbs_buffer_bottle` | `pbs_buffer_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `drug_stock_bottle` | `drug_stock_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `drug_stock_bottle` | `drug_stock_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `drug_stock_bottle` | `drug_stock_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `ethanol_bottle` | `ethanol_bottle.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `well_plate_96` | `well_plate_96.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `tube_rack_24` | `tube_rack_24.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `tube_rack_24` | `tube_rack_24.svg` | NO | MISSING | AUTHOR_NEW_SVG |
| `drug_vial_rack` | `drug_vial_rack.svg` | YES | real | KEEP |
| `p200_micropipette` | `p200_micropipette_filled.svg` | YES | variant | RE-NAME_OBJECT |
| `tip_box` | `tip_box.svg` | YES | real | KEEP |
| `waste_container` | `waste_container.svg` | YES | real | KEEP |
| `waste_tray` | `waste_tray.svg` | YES | real | KEEP |

## 3. Aggregate counts

| metric | value |
| --- | --- |
| total object records audited | 574 |
| real SVG (file exists, name matches object) | 354 |
| placeholder reference | 167 |
| missing SVG (asset file not on disk) | 11 |
| wrong-asset reference (file exists but unrelated to object) | 42 |
| other (`no_image`, `external`) | 0 |

Coverage notes:

- The `placeholder` total breaks down as `_placeholder.svg`: 158 references and `microtube_rack_24_placeholder.svg`: 9 references. The first is the experiment-local fallback substituted by `render_stress_to_html.py`; the second is a tracked dashed-rect labeled SVG under `assets/equipment/`.
- The `wrong_asset` total breaks down as 12 hits in top-level templates, 12 in `dir_b/`, 12 in `dir_c/`, and 6 in showcase demos. Most are concentrated in the `drug_dilution_*` family where reagent-bottle objects are rendered with staining-bottle SVGs as visual stand-ins, plus the `microscope_basic.html` top-level template which renders a `microscope` object using `centrifuge_new.svg`.
- `dir_b/` and `dir_c/` are not pure direction reorderings. Three templates have substantive differences from their top-level counterparts: `microscope_basic.html` (top uses `centrifuge_new.svg`; dir_b/dir_c use `microscope_new.svg`), `electrophoresis_bench.html` (top is missing the `power_supply` placement that dir_b/dir_c include), `drug_dilution_plate_workspace.html` (top uses `microtube_rack_24_placeholder.svg`; dir_b/dir_c use `dilution_tube_rack.svg`).

## 4. Placeholder leak risk

Two kinds of placeholder artifact were observed:

1. `assets/equipment/_placeholder.svg`: a 100x100 viewBox dashed-rect SVG labeled "PLACEHOLDER". It is NOT git-tracked (verified by `git ls-files assets/equipment/_placeholder.svg`), so it is an experiment-local artifact that lives only on disk. The named-but-missing renderer `render_stress_to_html.py` is reported in `docs/CHANGELOG.md` (entry 2026-05-21, WS-D) as the substitution path; it is missing from the working tree and was never git-tracked. The current rendered stress scenes still reference `_placeholder.svg` in 158 places, so a regenerated artifact must have been produced earlier by a now-deleted script.
2. `assets/equipment/microtube_rack_24_placeholder.svg`: a 100x100 dashed-rect SVG labeled "Microtube Rack (24-slot)". It IS git-tracked. It is referenced 9 times across templates, showcase demos, and rendered stress scenes. The name encodes the placeholder status, but tooling does not currently treat it differently from a real SVG.

Production rule (from the lane prompt and supported by `docs/PRIMARY_CONTRACT.md` item 3 and `docs/PRIMARY_DESIGN.md` visual integrity section):

> All scientific objects must render as real SVGs. No placeholder bubbles, empty outlines, or generic fallback blobs.

Where the placeholder appears (file roots):

- Templates (top-level): `drug_dilution_plate_workspace.html` and `drug_dilution_workspace_dense.html` each reference one placeholder; the other 8 top-level templates are placeholder-free.
- Templates (dir_b, dir_c): identical placeholder footprint to the top-level set.
- Showcase top-level demos: 3 of 10 demos include a placeholder reference, all three under the `style_*.html` family (`style_clean_instructional_bench.html`, `style_high_contrast_diagnostic_bench.html`, `style_lab_bench_realistic_bench.html`) with 1 reference each. The other 7 demos are placeholder-free.
- Stress gold scenes: 6 of 10 `gold_*` scenes contain at least one placeholder reference. Clean: `gold_electrophoresis_full_setup.html`, `gold_hood_prep.html`, `gold_plate_reader_assay.html`, `gold_staining_bench.html`. Highest leak: `gold_microscope_slide_prep.html` and `gold_mixed_bench.html` with 4 placeholder references each.
- Stress sampled scenes: every sampled `stress_*` scene has at least one placeholder reference. The densest leak observed in the sample is `stress_many_bottles_scene_002.html` with 17 placeholder references out of 17 placements (full placeholder substitution).
- YAML scenes: no placeholder references (YAML stores `object_name` only; resolution to the placeholder is a downstream renderer concern).

Risk surface and recommended discipline:

- The experiment-local `_placeholder.svg` must never be referenced by code or content under `src/` or `content/` (production paths). Lane B did not find any production-path references; the substitution is confined to the `experiments/css_native_layout/` subtree.
- The git-tracked `microtube_rack_24_placeholder.svg` is the higher-risk leak. Because the file exists, naive code paths cannot distinguish it from a real SVG. The simplest mitigation is to author the real 24-slot rack SVG and replace references at the same time the file is removed; until then, lint rules should reject any new reference to `*_placeholder.svg`.
- The missing `render_stress_to_html.py` (the named substitution point) is a separate concern owned by WS-D. Until that script is restored or replaced, the existing rendered stress scenes are frozen artifacts and not regenerable from current source. Re-running the generator without the placeholder substitution path must produce only real SVG references for production-grade stress scenes.

## 5. Top missing SVG asset names

Object names whose corresponding SVG file is absent from `assets/equipment/`, ordered by reference count across all audited files. This list is what Lane C's SVG completeness plan should treat as the highest-priority authoring backlog.

| rank | object_name | reference count |
| --- | --- | --- |
| 1 | `drug_stock_bottle` | 3 |
| 2 | `tube_rack_24` | 2 |
| 3 | `microwave` | 1 |
| 4 | `rocking_shaker` | 1 |
| 5 | `dmso_stock_bottle` | 1 |
| 6 | `pbs_buffer_bottle` | 1 |
| 7 | `ethanol_bottle` | 1 |
| 8 | `well_plate_96` | 1 |

Note: this list reflects 11 unique missing object names found in the audited file set. Stress scenes generated by `generate_stress_scenes.py` reference many more synthesized object names (e.g. `methanol_bottle`, `tris_buffer_bottle`, the `LONG_LABEL_OBJECTS` pool) that resolve to `_placeholder.svg` in the rendered HTML; those are accounted for in the placeholder column, not the missing column, because the renderer chose to substitute rather than fail. The placeholder-objects table below enumerates them.

Top 15 object names that resolve to a placeholder (rendered substitution; would become "missing" once `_placeholder.svg` substitution is removed):

| rank | object_name | placeholder references |
| --- | --- | --- |
| 1 | `brush` | 10 |
| 2 | `pbs_bottle` | 7 |
| 3 | `marker` | 7 |
| 4 | `tip_box_10` | 7 |
| 5 | `micropipette_p10` | 7 |
| 6 | `micropipette_p200` | 7 |
| 7 | `micropipette_p1000` | 7 |
| 8 | `kimwipes` | 6 |
| 9 | `ethanol_bottle` | 6 |
| 10 | `tube_rack_24` | 5 |
| 11 | `microtube_rack` | 5 |
| 12 | `well_plate_96` | 5 |
| 13 | `glass_slide` | 5 |
| 14 | `tip_box_200` | 5 |
| 15 | `sample_tube` | 5 |

## 6. Recommended next steps

In priority order. Each step is a downstream task; this lane only audits and does not act.

1. **Remove the `_placeholder.svg` substitution path.** Once `render_stress_to_html.py` is recovered (WS-D), strip the fallback that writes `<img src="../../../../assets/equipment/_placeholder.svg">` and have the generator hard-fail when an object name does not resolve to a real SVG. Until the substitution exits the codebase, every regenerated stress scene re-introduces the leak.
2. **Replace `microtube_rack_24_placeholder.svg` with a real 24-slot rack SVG.** Author or commission a `microtube_rack_24.svg` under `assets/equipment/`, then update the 9 references in the audited files (`drug_dilution_plate_workspace.html` top + dir_b + dir_c, plus the 6 rendered stress / showcase hits). Delete the placeholder file from `assets/equipment/` once references are gone.
3. **Fix `microscope_basic.html` top-level.** It references `centrifuge_new.svg` for a `microscope` object. dir_b and dir_c already use `microscope_new.svg`; pull the same fix into the top-level template.
4. **Reconcile drug-dilution reagent SVGs.** 5 reagent objects in `drug_dilution_workspace_dense.html` (and its dir_b, dir_c, and showcase clones) render with staining-bottle SVGs (`destain_bottle_filled`, `ddh2o_bottle_filled`, `bme_bottle_filled`, `laemmli_4x_bottle_filled`, `coomassie_stain_bottle_filled`) as visual stand-ins. Decide whether to (a) rename the objects to match the SVG (`stock_bottle` style), (b) author dedicated `dmso_stock_bottle`, `pbs_buffer_bottle`, `drug_stock_bottle` SVGs, or (c) accept that bottle visuals are interchangeable and document the convention.
5. **Resolve `serological_pipette -> aspirating_pipette.svg`.** `electrophoresis_bench.html` (top + dir_b + dir_c) renders the serological pipette object with the aspirating pipette SVG. A serological pipette SVG already exists at `assets/equipment/serological_pipette.svg`; update the `<img src>` to use it.
6. **Author the top 5 missing-by-name SVGs.** From the missing table above: `drug_stock_bottle` (3), `tube_rack_24` (2), and one each of `microwave`, `rocking_shaker`, `dmso_stock_bottle`, `pbs_buffer_bottle`, `ethanol_bottle`, `well_plate_96`. Several of these can be retired by renaming the object instead of authoring an asset; see step 4.
7. **Audit `dir_b/` vs `dir_c/` for promotion.** Three top-level templates lag their direction-variant siblings. Either merge dir_b/dir_c fixes back into top-level (preferred), or drop the duplicated direction variants once the top-level is correct.
8. **Lint for placeholder reintroduction.** Add a CI-style check that rejects any new HTML `<img src>` matching `_placeholder` or any object_name whose resolved SVG name does not contain the object root (lenient form of the wrong-asset heuristic used in this audit).

## 7. References

- `docs/PRIMARY_CONTRACT.md` item 3 (clickable objects are SVG-backed scene objects).
- `docs/PRIMARY_DESIGN.md` visual integrity section (never crop scientific SVG assets).
- `docs/specs/SVG_PIPELINE.md` (asset rules).
- `docs/active_plans/active/layout_manager_clean_start/svg_completeness_plan.md` (Lane C complementary plan).
- `docs/active_plans/active/layout_manager_clean_start/ONBOARDING.md` (handoff bundle index).
- `docs/CHANGELOG.md` 2026-05-21 entry, Decisions and Failures section (WS-D finding: `render_stress_to_html.py` is missing from the working tree).
