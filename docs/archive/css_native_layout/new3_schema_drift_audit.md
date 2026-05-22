# NEW3 schema drift audit

- Audit date: 2026-05-20
- Scope: all 201 git-tracked .yaml files
- Reference schema: `docs/specs/SCENE_YAML_FORMAT.md`

## Summary

| Metric                                         | Count                                     |
| ---------------------------------------------- | ----------------------------------------- |
| Total YAML files scanned                       | 201                                       |
| Files with HARD violations                     | 8                                         |
| Files with SOFT violations                     | 30                                        |
| Total distinct HARD violation instances        | 47                                        |
| Total distinct SOFT violation instances        | 51                                        |
| Production protocol files with HARD violations | 0                                         |
| `src/` frozen scenes with HARD violations      | 8 (all frozen per `SRC_SCENES_FREEZE.md`) |

## HARD violations

HARD = coordinate-bearing fields (`x0`, `x1`, `baseline`, `gap`), identity-mixing fields (`svgAsset`, `kind`, `widthScale`, `anchorY`, `alignStop`) on placements, or fields explicitly forbidden by the spec.

All 8 HARD-violation files are under `src/scenes/` (frozen legacy format per `SRC_SCENES_FREEZE.md`).

### src/scenes/bench/bench.yaml

- `zones[*]`: `x0`, `x1`, `baseline`, `gap` -- HARD
- `items[*]`: `svgAsset`, `kind`, `widthScale`, `anchorY`, `alignStop` -- HARD
- root: `sceneId`, `items`, `sceneBounds`, `layoutRules`, `wrongOrderMessage` -- HARD

### src/scenes/cell_culture_hood/cell_culture_hood.yaml

- `zones[*]`: `x0`, `x1`, `baseline`, `gap` -- HARD
- `items[*]`: `svgAsset`, `kind`, `widthScale`, `anchorY`, `alignStop`, `baselineOverride`, `shortLabel` -- HARD
- root: `sceneId`, `elementId`, `items`, `sceneBounds`, `layoutRules`, `wrongOrderMessage` -- HARD

### src/scenes/incubator/incubator.yaml

- root: `sceneId`, `items`, `wrongOrderMessage` -- HARD

### src/scenes/microscope/microscope.yaml

- root: `sceneId`, `elementId`, `items`, `wrongOrderMessage` -- HARD

### src/scenes/plate_reader/plate_reader.yaml

- root: `sceneId`, `elementId`, `items` -- HARD

### src/scenes/well_plate_workspace/well_plate_workspace.yaml

- root: `sceneId`, `items`, `wrongOrderMessage` -- HARD

Critical context: all 6 `src/scenes/` files are governed by `SRC_SCENES_FREEZE.md`. Frozen legacy pending migration. No production protocol YAML has HARD violations.

## SOFT violations

### Category A: row-slot prototype schema (9 files)

Files in `content/base_scenes/*_row_slot.yaml` use a `rows[]`/`slots[]` schema not in `docs/specs/SCENE_YAML_FORMAT.md`. Experimental prototypes.

- `bench_basic_row_slot.yaml`
- `cell_counter_basic_row_slot.yaml`
- `electrophoresis_bench_row_slot.yaml`
- `heat_block_bench_row_slot.yaml`
- `hood_basic_row_slot.yaml`
- `imaging_bench_row_slot.yaml`
- `microscope_basic_row_slot.yaml`
- `sample_prep_bench_row_slot.yaml`
- `staining_bench_row_slot.yaml`

Fields: `rows`, `row_name`, `slots` -- SOFT (undocumented schema)

### Category B: NEW0 region-based scene manifests (2 files)

- `experiments/css_native_layout/scenes/crowded_bench_dense.yaml`
- `experiments/css_native_layout/scenes/drug_dilution_workspace_dense.yaml`

Fields: `regions`, `region_name`, `role` (open string escape hatch), `label` -- SOFT

### Category C: spike fixture (1 file)

- `experiments/css_native_layout/spike_fixtures/well_plate_96_zoom_manifest.yaml`

Fields: `region` (should be `zone`), `primary` (boolean escape hatch), `label` -- SOFT

### Category D: scene_notes field (17 files)

Free-text metadata string not documented. Root-level escape hatch.

Files include:

- `content/protocols/cell_culture/passage_hood_detachment/scenes/hood_workspace.yaml`
- `content/protocols/cell_culture/passage_pellet_reseed/scenes/centrifuge_workspace.yaml`
- `content/protocols/cell_culture/trypan_blue_counting/scenes/cell_counter_workspace.yaml`
- `content/protocols/cell_culture/trypan_blue_counting/scenes/hemocytometer_view.yaml`
- `content/protocols/cell_culture/mtt_plate_reaction/scenes/incubator_workspace.yaml`
- `content/protocols/cell_culture/mtt_solubilization_readout/scenes/plate_reader_workspace.yaml`
- `content/protocols/sdspage/*_workspace.yaml` (multiple)
- `content/protocols/cell_culture/drug_dilution_setup/scenes/bench_setup.yaml`

### Category E: dev smoke items.yaml (3 files)

- `tests/content/dev_smoke/bench_direct_check/items.yaml`
- `tests/content/dev_smoke/plate_reader_check/items.yaml`
- `tests/content/dev_smoke/well_plate_96_zoom_check/items.yaml`

Fields: `role`, `asset`, `scene`, `visualOnly`, `liquidCapable`, `capacityMl`, `allowedLiquids` -- SOFT (old items mapping schema)

### Category F: dev smoke protocol.yaml (3 files)

Pre-migration protocol schema. Test fixtures, not production.

### Category G: experiments non-scene YAMLs (4 files)

Not scene manifests. Domain-specific tooling vocabularies.

- `experiments/css_native_layout/regions/bench.yaml`
- `experiments/css_native_layout/regions/hood.yaml`
- `experiments/css_native_layout/regions/instrument.yaml`
- `experiments/css_native_layout/scene_class_manifest.yaml`

## Top 5 offending files

1. `src/scenes/cell_culture_hood/cell_culture_hood.yaml` (16+ forbidden fields, 32 items, 3 zones)
2. `src/scenes/bench/bench.yaml` (14+ forbidden fields, 10 items, 2 zones)
3. `content/base_scenes/*_row_slot.yaml` (9 files, undocumented `rows`/`slots`)
4. `experiments/css_native_layout/scenes/crowded_bench_dense.yaml` + `drug_dilution_workspace_dense.yaml` (`role` open string + `regions` vs canonical placements)
5. `tests/content/dev_smoke/*/items.yaml` (3 files, old items schema)

## Production protocols with HARD violations

None. All HARD violations confined to:

- `src/scenes/` (6 files, all frozen per `SRC_SCENES_FREEZE.md`)

No file under `content/protocols/`, `content/base_scenes/` (excluding `_row_slot`), or `content/objects/` has a HARD coordinate-bearing violation.

## Proposed cleanup (HARD only)

All HARD live in `src/scenes/` which is explicitly frozen. Cleanup is migration, not direct editing.

- `bench.yaml` + `cell_culture_hood.yaml`: migrate `x0`/`x1`/`baseline`/`gap` zone fields to `bounds: {left, right, top, bottom}`. Remove `svgAsset`, `kind`, `widthScale`, `anchorY`, `alignStop` from items (belong in object library). Rename camelCase root keys to snake_case.
- `incubator`/`microscope`/`plate_reader`/`well_plate_workspace`: rename camelCase root keys to snake_case. Remove `elementId` (non-spec DOM override field).

These migrations cannot proceed until `SRC_SCENES_FREEZE.md` is resolved and a migration plan is approved.

## Proposed closed schema

Per `docs/specs/SCENE_YAML_FORMAT.md`:

- Root-level: `scene_name`, `workspace`, `capabilities`, `background`, `scene_bounds`, `zones`, `placements`, `layout_rules`, `accent_rules`, `wrong_order_message`, `extends`, `add_placements`, `reposition_placements`, `deactivate_placements`, `remove_placements`
- `background`: `asset`, `bounds`
- `scene_bounds`: `left`, `right`, `top`, `bottom`
- `zones[*]`: `id`, `bounds` (with `left`, `right`, `top`, `bottom`), `align`, `label`
- `placements[*]`: `placement_name`, `object_name`, `zone`, `depth_tier`, `align_stop`, `baseline_override`, `layout`
- `layout`: `default_width`, `label_width`, `anchor_y_offset`, `width_scale`, `anchor_y`
- `layout_rules`: `cluster_spacing_px`, `tier_brightness_factor`, `tier_opacity`, `default_align_stop`, `label_font_size`, `label_line_height`, `label_offset_y`, `zone_gap`
- `accent_rules`: `stroke`, `fill`, `pattern` per accent
- `wrong_order_message`: `template`, `toast_duration_ms`

Not in spec (require removal or spec promotion): `rows`, `slots`, `row_name`, `regions`, `region_name`, `role`, `primary` (boolean), `scene_notes`, `svgAsset`, `kind`, `widthScale`, `anchorY`, `alignStop`, `baselineOverride`, `shortLabel`, `sceneId`, `elementId`, `sceneBounds`, `layoutRules`, `wrongOrderMessage` (camelCase), `items`, `x0`, `x1`, `baseline`, `gap`
