# Item naming audit (cell_culture dilution tubes)

> Read-only audit of dilution-tube and source-item naming. Pairs with
> `wet_lab_classification.md` (current decisions) and
> `sp_k2f_next_drug_steps_plan.md` (upcoming migrations).

## 1. Current naming patterns

| Item ID | Role | Holds | Used in step(s) |
| --- | --- | --- | --- |
| `carboplatin_stock` | reagent_source | carboplatin | `carb_intermediate`, `carb_high_range` |
| `metformin_stock` | reagent_source | metformin | `metformin_stock` (step id collision -- see sec 5) |
| `sterile_water` | reagent_source | water | `carb_intermediate`, `metformin_stock` |
| `dilution_tube_rack` | decoration (visual) | n/a | `count_cells`, `carb_high_range`, `metformin_stock`, `add_carboplatin`, `add_metformin` |
| `dilution_tube_carb_intermediate` | culture_vessel | carboplatin, water | `carb_intermediate`, `carb_low_range` |
| `dilution_tube_carb_b` | culture_vessel | carboplatin, media | `carb_low_range` |
| `dilution_tube_carb_c` | culture_vessel | carboplatin, media | `carb_low_range` |
| `dilution_tube_carb_d` | culture_vessel | carboplatin, media | `carb_low_range` |
| `dilution_tube_carb_e` | culture_vessel | carboplatin, media | `carb_low_range` |
| `dilution_tube_carb_f` | culture_vessel | carboplatin, media | `carb_low_range` |

Convention: `dilution_tube_<reagent_family>_<descriptor>`. Descriptor is a row letter (`_b`...`_f`) for plate-row mapping or a semantic label (`_intermediate`) for prep vessels. Consistent across all 6 existing dilution-tube items.

## 2. Items needed for upcoming migrations

### carb_high_range (rows G, H from 10 mM stock)

| Proposed ID | Label | allowedLiquids | capacityMl | Asset |
| --- | --- | --- | --- | --- |
| `dilution_tube_carb_g` | "Carb row G" | carboplatin, media | 1 | dilution_tube_rack |
| `dilution_tube_carb_h` | "Carb row H" | carboplatin, media | 1 | dilution_tube_rack |

Discrepancy: `wet_lab_classification.md` mentions 3 high-range stocks (5 uM, 25 uM, 100 uM) while protocol step label says 2 (rows G and H). 96-well plate has rows A-H; A control, B-F low-range -> only G and H remain. Resolve before authoring.

### metformin_stock (step: 10 uL stock + 990 uL diluent)

| Proposed ID | Label | allowedLiquids | capacityMl | Asset |
| --- | --- | --- | --- | --- |
| `dilution_tube_metformin_working` | "Metformin 10 mM working stock" | metformin, media | 1 | dilution_tube_rack |

Suffix `_working` distinguishes from the bottle (`metformin_stock`). Alternative `_10mm` is more self-documenting.

### add_carboplatin and add_metformin

Transfer from working-stock tubes -> `well_plate`. Sources are the named tube items already proposed (`dilution_tube_carb_b`...`_h` for carboplatin, `dilution_tube_metformin_working` for metformin). No new tube items needed.

## 3. Asset reuse vs new asset

All proposed items reuse the existing `dilution_tube_rack` asset. No new artwork needed. If per-tube click targets must be visually distinct, that is a UI rendering concern, not a naming concern.

## 4. Naming-convention rules (codified)

- All interactable dilution tubes use prefix `dilution_tube_`.
- Next segment is the reagent family abbreviation: `carb` for carboplatin, `metformin` for metformin. Use the established family abbreviation, not the full reagent name.
- Suffix is either a row letter (`_b`...`_h`) for plate-row mapping or a semantic descriptor (`_intermediate`, `_working`) for prep vessels.
- No positional aliases (`tube_a`, `tube_1`).
- The decoration rack item (`dilution_tube_rack`) is a visual-only exception; do not imitate for functional items.

## 5. Inconsistencies to fix later (do not fix now)

- **Step id `metformin_stock` collides with item id `metformin_stock`.** Step prepares the working stock; item is the bottle source. Same identifier string for different things. Rename item to `metformin_stock_bottle` or step to `prepare_metformin_stock` in a later cleanup pass.
- **`dilution_tube_rack` appears in `requiredItems`** for steps that lack individual tube items (`carb_high_range`, `metformin_stock`, `add_carboplatin`, `add_metformin`). After migration, `dilution_tube_rack` should appear only as decoration, never in `requiredItems`.
- **wet_lab classification vs protocol mismatch on high-range count** (3 vs 2). Resolve before authoring G/H tubes.

## 6. Cross-protocol check

Tutorial protocol items reviewed:
- `tutorial_pbs/items.yaml`: `serological_pipette`, `flask`, `pbs_bottle`, `hood_surface`.
- `tutorial_split/items.yaml`: `serological_pipette`, `aspirating_pipette`, `flask`, `pbs_bottle`, `ethanol_bottle`, `waste_container`.

No collisions with cell_culture. All shared ids are intentional reuses of universal lab equipment names. Tutorials introduce no `dilution_tube_*` items, so the carb/metformin namespace is clean.
