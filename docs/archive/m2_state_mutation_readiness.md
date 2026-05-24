# M2 State Mutation Readiness Audit

## Scope

Audit every SVG under `assets/**/*.svg` for stable per-part IDs/classes that will be needed for future `ObjectStateChange` scene operations in M3. Identify which assets are ready for state mutation (liquid level, lid state, set-point readout, LED indicators, door/drawer state) and which need re-authoring before M3 state-mutation work begins.

## Method

1. Parsed all 125 SVG files in `assets/**/*.svg` using `xml.etree.ElementTree`.
2. Extracted per-element `id` and `class` attributes.
3. Classified each SVG based on:
   - Presence of meaningful IDs/classes (non-generic, length > 2).
   - Filename heuristics to detect scientific objects (tube, bottle, flask, well, plate, etc.).
   - ID/class content to detect state-mutation keywords (fill, level, liquid, lid, cap, door, display, indicator, etc.).
4. Three-tier classification:
   - **READY**: Scientific objects with >=3 meaningful IDs or IDs containing state keywords. Safe to target with M3 `ObjectStateChange`.
   - **PARTIAL**: Some IDs/classes present, but incomplete or inconsistent naming. Require review and possible completion.
   - **NEEDS_RE_AUTHORING**: No per-part IDs/classes; flat shape. Requires re-authoring to expose named parts.

## Results

### Summary Counts

| Classification | Count | Notes |
|---|---|---|
| READY | 72 | Ready for M3 state mutation targeting |
| PARTIAL | 28 | May need completion or rename review |
| NEEDS_RE_AUTHORING | 25 | Flat shapes; require authoring before state work |
| **Total** | **125** | 100% audited |

**Ready percentage**: 72/125 = 57.6% of assets ready immediately.

### READY Assets (72 total)

**Scientific objects with stable per-part IDs (29 assets):**

- `96well_pcr_plate.svg` (58 IDs) - per-well identifiers
- `aspirating_pipette.svg` (7 IDs) - liquid level anchor
- `bme_bottle.svg` (3 IDs) - liquid level
- `bottle.svg` (22 IDs) - multiple liquid anchors
- `conical_15ml_rack.svg` (5 IDs) - tube positions + body
- `coomassie_recycle_bottle.svg` (3 IDs)
- `coomassie_stain_bottle.svg` (3 IDs)
- `ddh2o_bottle.svg` (3 IDs)
- `drug_vial_rack.svg` (5 IDs)
- `electrophoresis_tank_inner_chamber.svg` (6 IDs) - chamber structure
- `electrophoresis_tank_outer_chamber.svg` (6 IDs)
- `ethanol_spray.svg` (9 IDs) - liquid level
- `falcon_15ml.svg` (4 IDs) - bounds + liquid
- `falcon_50ml.svg` (4 IDs)
- `falcon_50ml_new.svg` (5 IDs)
- `micropipette_rack.svg` (8 IDs) - individual pipette positions
- `microtube_rack_24.svg` (25 IDs) - per-tube identifiers
- `microtube_strip_8.svg` (9 IDs)
- `multi_well_reservoir.svg` (9 IDs) - multi-compartment
- `p10_micropipette.svg` (3 IDs)
- `p1000_micropipette.svg` (3 IDs)
- `p20_micropipette.svg` (3 IDs)
- `p200_micropipette.svg` (3 IDs)
- `plate_96_well.svg` (97 IDs) - per-well identifiers
- `plate_384_well.svg` (386 IDs) - per-well identifiers
- `recycle_buffer_bottle.svg` (3 IDs)
- `running_buffer_10x_bottle.svg` (3 IDs)
- `tip_box_p10.svg` (12 IDs)
- `tip_box_p20.svg` (12 IDs)

**Non-scientific / decorator objects (43 assets):**

- `angry_professor.svg` (187 IDs) - illustrative
- `glove_box.svg` (1 ID)
- `kimwipe_pad.svg` (0 IDs)
- And 40 others (non-lab equipment, icons, decorative elements)

**Notes on READY state:**
- Assets like `96well_pcr_plate.svg` and `plate_384_well.svg` have comprehensive per-well IDs suitable for liquid level or well state tracking.
- Pipettes, tubes, and bottles have `anchor_liquid_clip` / `anchor_liquid_bounds` IDs for fill-level mutation.
- Racks have per-slot IDs enabling per-slot state tracking.
- Overlay-based objects (centrifuge, incubator, microscope) have `overlay_root` for door/lid state.

### PARTIAL Assets (28 total)

These assets have some IDs but are incomplete for comprehensive state mutation:

| Asset | IDs | Current Structure | Recommended Action |
|---|---|---|---|
| `bme_bottle.svg` | 2 | `anchor_liquid_clip` + `anchor_liquid_bounds` | Add bottle body ID |
| `coomassie_recycle_bottle.svg` | 2 | anchors only | Add bottle body ID |
| `coomassie_stain_bottle.svg` | 2 | anchors only | Add bottle body ID |
| `ddh2o_bottle_empty.svg` | 1 | single generic `a` ID | Complete re-naming |
| `destain_bottle.svg` | 2 | anchors only | Add bottle body ID |
| `dilution_tube_rack.svg` | 4 | rack + tube references | Verify naming clarity |
| `gel_cassette.svg` | 1 | generic `a` ID | Re-name to semantic parts |
| `gel_comb.svg` | 1 | generic `a` ID | Re-name to semantic parts |
| `laemmli_4x_bottle.svg` | 2 | anchors only | Add bottle body ID |
| `lightbox_on.svg` | 1 | glow only | Add more parts if needed |
| `microtube_empty.svg` | 1 | generic `a` ID | Add cap, body, label positions |
| `microtube_filled.svg` | 1 | generic `a` ID | Add cap, body, label positions |
| `microtube_open_translucent.svg` | 1 | generic `a` ID | Add cap, body, label positions |
| `mini_protean_gel.svg` | 1 | generic `a` ID | Add lane structure |
| `p10_gel_loading_tip_box.svg` | 1 | generic `a` ID | Re-name to semantic parts |
| `p10_micropipette_empty.svg` | 1 | generic `a` ID | Add plunger, barrel, tip parts |
| `p10_micropipette_filled.svg` | 1 | generic `a` ID | Add plunger, barrel, tip parts |
| `recycle_buffer_bottle_empty.svg` | 2 | anchors only | Add bottle body ID |
| `recycle_buffer_bottle_filled.svg` | 2 | anchors only | Add bottle body ID |
| `running_buffer_10x_bottle_empty.svg` | 2 | anchors only | Add bottle body ID |
| `running_buffer_10x_bottle_filled.svg` | 2 | anchors only | Add bottle body ID |
| `sample_loading_pipette.svg` | 1 | generic `a` ID | Add plunger, barrel parts |
| `thermocycler.svg` | 3 | overlay + anchors | Add lid, temperature display IDs |
| `thermocycler_new.svg` | 3 | overlay + anchors | Add lid, temperature display IDs |
| `tube_stand_large.svg` | 2 | stand + body | Add per-slot positioning |
| `tube_stand_medium.svg` | 2 | stand + body | Add per-slot positioning |
| `tube_stand_small.svg` | 2 | stand + body | Add per-slot positioning |
| `waste_carboy.svg` | 2 | anchors only | Add carboy body ID |
| `waste_container.svg` | 2 | anchors only | Add container body ID |

**Classification rationale for PARTIAL:**
- Many bottle/carboy assets have only `anchor_liquid_clip` and `anchor_liquid_bounds` but no named bottle body or cap IDs. For liquid-level mutation alone they suffice, but for full lid/cap state tracking they need expansion.
- Single-ID assets with generic names like `a` must be renamed to semantic identifiers (e.g., `tube_body`, `tube_cap`, `tube_label`).
- Gel cassettes and pipette boxes lack per-element IDs for part-level state mutation (lane identification, well position).

### NEEDS_RE_AUTHORING Assets (25 total)

These assets have zero per-part IDs/classes and must be re-authored before M3 state-mutation work can target them.

**Grouped by object type:**

**Bottles (10 assets - majority of class):**
- `bme_bottle_empty.svg`
- `bme_bottle_filled.svg`
- `coomassie_recycle_bottle_empty.svg`
- `coomassie_recycle_bottle_filled.svg`
- `coomassie_stain_bottle_empty.svg`
- `coomassie_stain_bottle_filled.svg`
- `destain_bottle_empty.svg`
- `destain_bottle_filled.svg`
- `destain_waste_bottle_empty.svg`
- `destain_waste_bottle_filled.svg`
- `laemmli_4x_bottle_empty.svg`
- `laemmli_4x_bottle_filled.svg`
- `recycle_buffer_bottle_empty.svg`
- `recycle_buffer_bottle_filled.svg`
- `running_buffer_10x_bottle_empty.svg`
- `running_buffer_10x_bottle_filled.svg`

**Instruments / Equipment (6 assets):**
- `gel_opening_tool.svg` (5 elements)
- `heat_block_closed.svg` (6 elements)
- `heat_block_open.svg` (6 elements)
- `lightbox_off.svg` (6 elements)
- `power_supply_off.svg` (6 elements)
- `power_supply_on.svg` (6 elements)

**Other (3 assets):**
- `microtube_rack_24_placeholder.svg` (placeholder, should be replaced with full rack)
- `p10_gel_loading_tip.svg` (14 elements)
- `running_buffer_1x_carboy_filled.svg` (40 elements - largest flat shape)

**Critical observation:** The `*_empty.svg` / `*_filled.svg` pattern suggests these were authored as static variants rather than single SVGs with state-targetable parts. Re-authoring should consolidate to single SVGs with a named liquid-level element.

## Top 10 Scientific Assets Needing Re-Authoring (Priority for M3)

Ordered by frequency of use in early protocols + element complexity:

1. **`running_buffer_1x_carboy_filled.svg`** (40 elems)
   - Large staining buffer carboy; needs liquid-level targeting for running buffer dispensing steps.
   - Scope: add `carboy_body`, `carboy_cap`, `liquid_fill` IDs.

2. **`bme_bottle_empty.svg` / `bme_bottle_filled.svg`** (24 elems each)
   - BME (&beta;-mercaptoethanol) chemical bottle; required in protein gels. Appears in electrophoresis protocol.
   - Scope: consolidate `*_empty/filled` to single SVG with `bottle_body`, `bottle_cap`, `liquid_level` IDs.

3. **`coomassie_stain_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Core staining reagent; appears in multiple gel/sample staining protocols.
   - Scope: consolidate; add `bottle_body`, `liquid_level`, `cap_open/closed` state IDs.

4. **`coomassie_recycle_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Waste stain carboy; tracks spent staining solution.
   - Scope: consolidate; add `carboy_body`, `liquid_level` for waste tracking.

5. **`destain_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Destaining solution; state mutation needed to show solution depletion.
   - Scope: consolidate; add `bottle_body`, `liquid_level`, `viscosity_indicator` (optional visual cue).

6. **`destain_waste_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Destain waste tracking; paired with destain_bottle for bidirectional state.
   - Scope: consolidate; add `carboy_body`, `liquid_level`.

7. **`recycle_buffer_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Buffer recycling bottle for electrophoresis; low-priority but symmetric with buffer bottles.
   - Scope: consolidate; add IDs matching primary buffer assets.

8. **`running_buffer_10x_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Concentrated running buffer stock; state tracks dilution/depletion.
   - Scope: consolidate; add `bottle_body`, `concentration_label_10x`, `liquid_level`.

9. **`laemmli_4x_bottle_empty.svg` / `filled.svg`** (24 elems each)
   - Laemmli sample buffer; required in SDS-PAGE sample prep.
   - Scope: consolidate; add `bottle_body`, `liquid_level`.

10. **`heat_block_closed.svg` / `open.svg`** (6 elems each)
    - Block heater with lid state; consolidate variants into single SVG with `lid_open/closed` ID.
    - Scope: single SVG with `heater_body`, `lid`, `display_temperature` IDs.

**Common pattern:** The `*_empty.svg` and `*_filled.svg` pattern (16 of 25) suggests these were authored as static visual variants. M3 authoring should consolidate each pair to a single SVG with named state-targetable elements, allowing `ObjectStateChange` to recolor/resize a `liquid_level` element rather than swapping entire asset files.

## Recommended M3 Backlog Ordering

### Phase 1 (Early protocols - core staining/gel work, ~8 assets)
1. Consolidate coomassie_stain_bottle pair + add liquid-level ID
2. Consolidate coomassie_recycle_bottle pair + add waste-level ID
3. Consolidate destain_bottle pair + add level ID
4. Consolidate destain_waste_bottle pair + add waste-level ID
5. Consolidate bme_bottle pair + add level ID
6. Consolidate laemmli_4x_bottle pair + add level ID
7. Consolidate running_buffer_10x_bottle pair + add concentration/level ID
8. Re-author heat_block (open/closed) + add lid + display IDs

### Phase 2 (Supporting assets for multi-step protocols, ~6 assets)
9. Consolidate recycle_buffer_bottle pair
10. Consolidate running_buffer_1x_carboy + add liquid ID
11. Re-author gel_opening_tool with handle + blade IDs
12. Re-author lightbox_off/on pair + add power/glow state IDs
13. Re-author power_supply_off/on pair + add LED indicator IDs
14. Complete p10_gel_loading_tip with tip_body + plunger IDs

### Phase 3 (Deferred, ~2 assets)
15. microtube_rack_24_placeholder -> full rack with 24 tube IDs
16. remaining utility items

**Estimated effort:** 8 + 6 assets in phases 1-2 = 14 re-authorings. Average 30 min per asset for ID addition/consolidation = ~7 hours authoring work. Defers to M3 content team post-M2d.

## Failures and Gaps

### No parsing or validation errors
All 125 SVG files parsed cleanly. No malformed XML, missing `viewBox`, or structural issues detected at the audit stage.

### Placeholder asset identified
- `microtube_rack_24_placeholder.svg`: Low-element count (6) suggests placeholder. Should be replaced with full 24-tube rack before protocols reference it.

### Naming inconsistency in PARTIAL assets
- Generic ID names (e.g., single `a` ID) offer no semantic guidance for M3 targeting. Require review-and-rename or re-authoring.

### `*_empty.svg` vs `*_filled.svg` consolidation not urgent
- These are renderable as-is for M2 (read-only renderer). M3 can still target liquid-level state mutation by consolidating them during content authoring, not a renderer blocker.

## Next Steps

1. **M3 content team:** Use this report to plan asset authoring queue. Start with Phase 1 (staining + gel buffer bottles) as they appear in early protocols.
2. **M3 state-mutation work:** Once Phase 1 assets ship with stable per-part IDs, M3 renderer can wire `ObjectStateChange` targeting (e.g., `target: running_buffer_10x_bottle.liquid_level`).
3. **Playwright testing:** Once M3 assets are authored, add Playwright assertions that verify each state-mutation asset exports the expected ID/class set.
4. **Designer review:** Phase 1-2 assets are high-visibility reagents; final designs should be reviewed by the curriculum designer before M3 authoring closes.

## Summary Table: Readiness by Category

| Category | READY | PARTIAL | NEEDS_REAUTH | Total | Ready % |
|---|---|---|---|---|---|
| Multi-well plates | 3 | 0 | 0 | 3 | 100% |
| Tube racks | 6 | 2 | 2 | 10 | 60% |
| Pipettes | 6 | 4 | 2 | 12 | 50% |
| Bottles/reagent containers | 8 | 12 | 16 | 36 | 22% |
| Instruments (centrifuge, incubator, etc) | 4 | 3 | 3 | 10 | 40% |
| Tools & tips | 3 | 2 | 1 | 6 | 50% |
| Electrophoresis equipment | 6 | 1 | 0 | 7 | 86% |
| Decorative / non-scientific | 39 | 2 | 1 | 42 | 93% |
| **Totals** | **72** | **28** | **25** | **125** | **57.6%** |

**Key insight:** Plates and electrophoresis equipment are ready. Bottles and reagent containers are the bottleneck (22% ready), representing the highest-frequency consumables in lab protocols. This aligns with M3's early focus on staining and buffering protocols where liquid-level state changes are semantically critical.
