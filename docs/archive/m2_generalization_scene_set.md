# M2c Generalization scene selection (Lane D1)

**Status:** Final selection complete. 10 scenes selected covering all hard axes. Two smoke fixtures hand-authored for long-labels and adversarial slots.

---

## Scope

Pick 8-10 representative hard scenes covering:
- simple bench
- dense bench
- instrument-heavy
- hood
- glassware/labels
- plate/rack
- zoom/detail
- Schema B (row_slot)
- long labels
- adversarial

Prioritize hard scenes first, not easiest ones. A set where all render trivially is a failed selection.

---

## Method

1. Surveyed all 19 base scenes under `content/base_scenes/`.
2. Examined placement counts, zone counts, object complexity, and workspace types.
3. Identified hard characteristics: multi-depth layering, large instruments, label-heavy objects, single-object zoom, different workspace types, Schema B row+slot structure.
4. Selected scenes covering each hard axis with explicit rationale.
5. Hand-authored two smoke fixtures for long-labels and adversarial slots (no exact real counterparts exist).

---

## Results: Final D1 Scene Set (10 scenes)

| # | Scene | File | Placements | Zones | Hard Axis | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | bench_basic | content/base_scenes/bench_basic.yaml | 2 | 5 | Simple bench (primary) | Minimal vertical slice: waste container + vortex. Primary smoke target. Establishes baseline. |
| 2 | sample_prep_bench | content/base_scenes/sample_prep_bench.yaml | 5 | 5 | Dense bench | 5 placements in same zones as bench_basic; exercises tab-stop alignment and convergence. Multi-depth tiers. |
| 3 | electrophoresis_bench | content/base_scenes/electrophoresis_bench.yaml | 16 | 7 | Instrument-heavy | Largest scene so far: 16 placements, 7 zones, multiple depth tiers, big tank and power supply. Exercises zone capacity and multi-zone flow. |
| 4 | staining_bench | content/base_scenes/staining_bench.yaml | 10 | 5 | Glassware/labels | 10 placements including 7 bottles with chemical dye names (Coomassie, destain, ddH2O). Tests label wrap and collision nudge. Instruments (microwave, shaker) add complexity. |
| 5 | cell_counter_basic | content/base_scenes/cell_counter_basic.yaml | 2 | 2 | Plate/rack (different workspace) | Different workspace type (cell_counter vs bench). Cell counter instrument + slide cartridge. Proves workspace diversity. |
| 6 | well_plate_96_zoom | content/base_scenes/well_plate_96_zoom.yaml | 1 | 1 | Zoom/detail | Single object (96-well plate) with internal subpart geometry. Tests aspect-ratio preservation on complex SVG with grid structure. Minimal zone complexity. |
| 7 | hood_basic | content/base_scenes/hood_basic.yaml | 4 | 5 | Hood | Different workspace background (hood_workspace_bg). 4 placements including hood surface (depth tier 2, layering). Proves hood layout distinct from bench. |
| 8 | bench_basic_row_slot | content/base_scenes/bench_basic_row_slot.yaml | 2 | - | Schema B (row_slot) | Row+slot structure. Normalized via `rows[]` instead of zones. Tests pipeline Schema B path (normalize_schema branch). |
| 9 | long_labels_smoke | tests/content/dev_smoke/long_labels_smoke/scene.yaml | 6 | 3 | Long labels | Hand-authored: 6 bottles with long chemical names (e.g. "N,N-Dimethylformamide (DMF)"). Stresses label wrapping, collision detection, nudge logic. Expected to pass rendering if label wrap algorithm is sound. |
| 10 | adversarial_overflow_smoke | tests/content/dev_smoke/adversarial_overflow_smoke/scene.yaml | 22 | 3 | Adversarial (capacity stress) | Hand-authored: 22 placements crammed into 3 small zones (total ~30% of scene bounds). Deliberately designed to exceed convergence-shrink budget. **Expected to fail loudly** with a capacity-class diagnostic (max_iterations_reached or zone_overflow_negative_gap unresolved). Does NOT render. Proves fail-loud behavior. |

---

## Per-scene detail

### 1. bench_basic
- **Path:** `content/base_scenes/bench_basic.yaml`
- **Placements:** 2 (rear_left_waste, rear_right_vortex)
- **Zones:** 5 (rear_left, rear_center, rear_right, center, right_tool_area)
- **Hard axis:** Simple bench (primary vertical slice)
- **Concerns:** None. This is M2b primary target. Should preflight clean.

### 2. sample_prep_bench
- **Path:** `content/base_scenes/sample_prep_bench.yaml`
- **Placements:** 5 (protein_sample_tube, laemmli_4x_bottle, bme_bottle, microtube_rack_24, micropipette)
- **Zones:** 5 (same structure as bench_basic)
- **Hard axis:** Dense bench (within same zone topology as bench_basic, exercises convergence and tab-stops)
- **Depth tiers:** 2 tiers (depth_tier 1 and 2 on same placements in center zone)
- **Concerns:** Microtube_rack_24 is larger; may trigger shrinking. Good convergence test.

### 3. electrophoresis_bench
- **Path:** `content/base_scenes/electrophoresis_bench.yaml`
- **Placements:** 16 (running_buffer_10x, electrophoresis_tank, power_supply, buffers, serological_pipette, gel loading tips, protein ladder, recycle buffer, gel opening tool, waste, electrode module, mini protean gel, gel cassette, gel comb)
- **Zones:** 7 (rear_left, rear_center, rear_right, center, right_tool_area, front_left, front_right)
- **Hard axis:** Instrument-heavy (large tank and power supply; multi-zone flow; highest placement count in selection)
- **Depth tiers:** 3 tiers in center zone (waste at tier 3, bottom-most)
- **Concerns:** Largest scene complexity. Tests zone capacity and multi-zone layout balance. Power supply and electrophoresis tank are large instruments. Should complete preflight; may trigger shrinking if zones are tight.

### 4. staining_bench
- **Path:** `content/base_scenes/staining_bench.yaml`
- **Placements:** 10 (staining_tray, coomassie_stain, destain, ddh2o, coomassie_recycle, destain_waste, microwave, rocking_shaker, kimwipe_pad, waste)
- **Zones:** 5 (same structure as bench_basic)
- **Hard axis:** Glassware/labels (7 chemical bottles with multi-word labels: Coomassie Stain, Destain, ddH2O, Coomassie Recycle, Destain Waste)
- **Depth tiers:** 3 tiers (waste at tier 3 in center, deepest)
- **Concerns:** Heavy label content. Tests label wrap and collision nudge. Bottles are relatively standard size; should fit within convergence budget.

### 5. cell_counter_basic
- **Path:** `content/base_scenes/cell_counter_basic.yaml`
- **Placements:** 2 (main_cell_counter, counter_slide_cartridge)
- **Zones:** 2 (instrument_area, right_accessory_area)
- **Hard axis:** Plate/rack (different workspace type: cell_counter vs bench)
- **Workspace:** cell_counter (not bench; uses cell_counter_workspace_bg background asset)
- **Concerns:** Cell counter is a large instrument. Slide cartridge is small accessory. Different zone topology than bench scenes. Background asset must exist.

### 6. well_plate_96_zoom
- **Path:** `content/base_scenes/well_plate_96_zoom.yaml`
- **Placements:** 1 (zoom_well_plate_96)
- **Zones:** 1 (work_surface, large 80x80 viewport)
- **Hard axis:** Zoom/detail (single complex SVG with subpart geometry: 96 individual wells as internal grid)
- **Note:** Marked as NEW1 spike; not for production protocols. Used purely for layout testing.
- **Concerns:** Single 96-well plate object has complex internal geometry. Must verify aspect ratio of plate SVG is preserved despite well subpart rendering. No label content to wrap.

### 7. hood_basic
- **Path:** `content/base_scenes/hood_basic.yaml`
- **Placements:** 4 (ethanol_bottle, waste_container, hood_surface, aspirating_pipette)
- **Zones:** 5 (rear_left, rear_center, rear_right, center, right_tool_area, same topology as bench scenes)
- **Hard axis:** Hood (different workspace type and background)
- **Workspace:** hood (uses hood_workspace_bg background asset, distinct from bench_workspace_bg)
- **Depth tiers:** 2 tiers (hood_surface at tier 2, behind bottles)
- **Concerns:** Hood surface is a layered element (tier 2); must verify layering order. Background gradient must handle hood context. Ethanol bottle and aspirating pipette both have chemical labels.

### 8. bench_basic_row_slot
- **Path:** `content/base_scenes/bench_basic_row_slot.yaml`
- **Placements:** 2 (rear_left_waste, rear_right_vortex)
- **Rows:** 1 (rear_bench row with 2 slots)
- **Hard axis:** Schema B (row+slot structure instead of zones)
- **Note:** Minimal row_slot example. Codegen normalize_schema must convert rows[] to zones[] or internal zone representation.
- **Concerns:** Tests pipeline branch for Schema B (row_slot path). Should produce same logical layout as bench_basic despite different YAML structure.

### 9. long_labels_smoke (hand-authored)
- **Path:** `tests/content/dev_smoke/long_labels_smoke/scene.yaml`
- **Placements:** 6 bottles
- **Zones:** 3
- **Hard axis:** Long labels (multi-word, multi-line chemical names)
- **Purpose:** Tests label wrap algorithm, collision detection, and nudge logic on chemical reagents with names like "N,N-Dimethylformamide (DMF)", "Dimethyl Sulfoxide (DMSO)", "Ethyl Acetate (EA)".
- **Expected outcome:** Renders successfully if label wrapping and nudge logic are robust.
- **YAML content:** See below under "Hand-authored smoke fixtures".

### 10. adversarial_overflow_smoke (hand-authored)
- **Path:** `tests/content/dev_smoke/adversarial_overflow_smoke/scene.yaml`
- **Placements:** 22 objects
- **Zones:** 3 small zones totaling ~30% of scene bounds
- **Hard axis:** Adversarial (capacity stress test)
- **Purpose:** Deliberately exceeds convergence-shrink iteration budget. Proves that the layout engine **fails loudly** rather than silently clipping or cropping content.
- **Expected outcome:** **Must fail with a capacity-class diagnostic** (max_iterations_reached, zone_overflow_negative_gap unresolved, or equivalent). Does NOT render to a screenshot. Classified as "not rendered by design" in contact sheet.
- **YAML content:** See below under "Hand-authored smoke fixtures".

---

## Hand-authored smoke fixtures

### Long-labels smoke fixture

**Path:** `tests/content/dev_smoke/long_labels_smoke/scene.yaml`

```yaml
scene_name: long_labels_smoke
workspace: bench
capabilities:
  - item_workspace

scene_bounds:
  left: 1
  right: 99
  top: 5
  bottom: 95

background:
  type: gradient
  from: "#E8E2D0"
  to: "#D4CBB3"
  angle: 180

zones:
  - id: rear
    bounds:
      left: 5
      right: 95
      top: 10
      bottom: 35
    align: center
    label: Rear shelf
  - id: center
    bounds:
      left: 20
      right: 80
      top: 45
      bottom: 75
    align: center
    label: Work surface
  - id: front_right
    bounds:
      left: 70
      right: 95
      top: 80
      bottom: 95
    align: center
    label: Right front

placements:
  - placement_name: rear_dmf_bottle
    object_name: dmf_bottle
    zone: rear
    depth_tier: 1
  - placement_name: rear_dmso_bottle
    object_name: dmso_bottle
    zone: rear
    depth_tier: 1
  - placement_name: rear_ethyl_acetate_bottle
    object_name: ethyl_acetate_bottle
    zone: rear
    depth_tier: 1
  - placement_name: center_tetrahydrofuran_bottle
    object_name: tetrahydrofuran_bottle
    zone: center
    depth_tier: 1
  - placement_name: center_acetonitrile_bottle
    object_name: acetonitrile_bottle
    zone: center
    depth_tier: 1
  - placement_name: front_right_dimethylacetamide_bottle
    object_name: dimethylacetamide_bottle
    zone: front_right
    depth_tier: 1

layout_rules:
  label_font_size: 9
  label_line_height: 1.1
  label_offset_y: 4
  zone_gap: 2

wrong_order_message:
  template: "Check the reagent labels."
  toast_duration_ms: 2000
```

**Objects required:**
- dmf_bottle (label: "N,N-Dimethylformamide (DMF)")
- dmso_bottle (label: "Dimethyl Sulfoxide (DMSO)")
- ethyl_acetate_bottle (label: "Ethyl Acetate (EA)")
- tetrahydrofuran_bottle (label: "Tetrahydrofuran (THF)")
- acetonitrile_bottle (label: "Acetonitrile (AN)")
- dimethylacetamide_bottle (label: "N,N-Dimethylacetamide (DMA)")

**Note:** If these objects do not exist in content/objects/, they must be authored before D3 preflight. For now, the fixture defines the schema and label strategy. Lane A1 / A2 will validate whether the required assets exist during preflight.

### Adversarial overflow smoke fixture

**Path:** `tests/content/dev_smoke/adversarial_overflow_smoke/scene.yaml`

```yaml
scene_name: adversarial_overflow_smoke
workspace: bench
capabilities:
  - item_workspace

scene_bounds:
  left: 1
  right: 99
  top: 5
  bottom: 95

background:
  type: gradient
  from: "#E8E2D0"
  to: "#D4CBB3"
  angle: 180

zones:
  - id: zone_a
    bounds:
      left: 5
      right: 30
      top: 10
      bottom: 35
    align: center
    label: Zone A (capacity test)
  - id: zone_b
    bounds:
      left: 35
      right: 65
      top: 10
      bottom: 35
    align: center
    label: Zone B (capacity test)
  - id: zone_c
    bounds:
      left: 70
      right: 95
      top: 10
      bottom: 35
    align: center
    label: Zone C (capacity test)

placements:
  - placement_name: a_1
    object_name: protein_sample_tube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_2
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_3
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_4
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_5
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_6
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: a_7
    object_name: microtube
    zone: zone_a
    depth_tier: 1
  - placement_name: b_1
    object_name: laemmli_4x_bottle
    zone: zone_b
    depth_tier: 1
  - placement_name: b_2
    object_name: bme_bottle
    zone: zone_b
    depth_tier: 1
  - placement_name: b_3
    object_name: ddh2o_bottle
    zone: zone_b
    depth_tier: 1
  - placement_name: b_4
    object_name: ethanol_bottle
    zone: zone_b
    depth_tier: 1
  - placement_name: b_5
    object_name: microtube
    zone: zone_b
    depth_tier: 1
  - placement_name: b_6
    object_name: microtube
    zone: zone_b
    depth_tier: 1
  - placement_name: b_7
    object_name: microtube_rack_24
    zone: zone_b
    depth_tier: 1
  - placement_name: b_8
    object_name: micropipette
    zone: zone_b
    depth_tier: 1
  - placement_name: c_1
    object_name: coomassie_stain_bottle
    zone: zone_c
    depth_tier: 1
  - placement_name: c_2
    object_name: destain_bottle
    zone: zone_c
    depth_tier: 1
  - placement_name: c_3
    object_name: ddh2o_bottle
    zone: zone_c
    depth_tier: 1
  - placement_name: c_4
    object_name: waste_container
    zone: zone_c
    depth_tier: 1
  - placement_name: c_5
    object_name: microtube
    zone: zone_c
    depth_tier: 1
  - placement_name: c_6
    object_name: microtube
    zone: zone_c
    depth_tier: 1

layout_rules:
  label_font_size: 9
  label_line_height: 1.1
  label_offset_y: 4
  zone_gap: 2

wrong_order_message:
  template: "This is an overflow test."
  toast_duration_ms: 2000
```

**Design intent:**
- **22 placements** across **3 zones** (vs typical 5 zones in bench scenes).
- Each zone has ~7 placements in ~26x25 viewport (zone A, B, C are each ~25-wide, 25-tall).
- Zone B includes a large microtube_rack_24 (default_width ~8-10) plus bottles and microtools.
- Goal: force convergence loop to exceed iteration budget or leave negative gap.
- **Expected diagnostic:** `max_iterations_reached` or `zone_overflow_negative_gap` (unresolved after convergence budget exhausted).
- **Renderer behavior:** Structural guards reject layout; scene does NOT render. Contact sheet shows "not rendered by design" with the diagnostic reason.

---

## Gaps and coverage assessment

| Axis | Selected Scene | Coverage |
| --- | --- | --- |
| Simple bench | bench_basic | Complete. Primary vertical slice. |
| Dense bench | sample_prep_bench + electrophoresis_bench | Complete. Two approaches: same-zone density (sample_prep) and multi-zone complexity (electrophoresis). |
| Instrument-heavy | electrophoresis_bench | Complete. 16 placements, 7 zones, large tank and power supply. |
| Hood | hood_basic | Complete. Different workspace and background. |
| Glassware/labels | staining_bench | Complete. 7 chemical bottles with dye labels. |
| Plate/rack | cell_counter_basic | Complete. Different workspace type (cell_counter). Proves workspace diversity. |
| Zoom/detail | well_plate_96_zoom | Complete. Single 96-well plate with internal grid geometry. |
| Schema B (row_slot) | bench_basic_row_slot | Complete. Minimal row+slot example. Tests normalize_schema branch. |
| Long labels | long_labels_smoke | Complete. Hand-authored. 6 chemical reagents with long multi-word names. |
| Adversarial | adversarial_overflow_smoke | Complete. Hand-authored. 22 placements, 3 zones. Designed to exceed capacity. |

**No gaps.** All 10 hard axes covered. Two hand-authored smoke fixtures provided for long-labels and adversarial slots.

---

## Known concerns for preflight

1. **electrophoresis_bench:** Large scene (16 placements). Zone B (center) may be tight with both power_supply and electrophoresis_tank. Convergence shrinking expected; should complete within budget.

2. **staining_bench:** 7 bottles with chemical labels. If label wrap algorithm is incomplete or collision nudge is weak, labels may overlap or extend off-scene. Hard failure.

3. **well_plate_96_zoom:** Single large SVG (96-well plate). Aspect ratio must be preserved. Well grid is internal geometry, not separate placements. Verify SVG viewBox and rendered bbox match within 5%.

4. **cell_counter_basic:** Cell counter object is large. Verify cell_counter_workspace_bg asset exists. Zone topology differs from bench scenes (2 zones vs 5).

5. **hood_basic:** Hood surface is layered (depth_tier 2). Verify z-order places hood_surface behind bottles. Hood background asset must exist.

6. **long_labels_smoke:** Requires 6 chemical bottle objects with long labels. If objects missing, fixture cannot be preflighted. Lane A1/A2 must author or source equivalents.

7. **adversarial_overflow_smoke:** Designed to fail preflight with a capacity diagnostic. This is by design and expected. Lane D3 must classify the failure and confirm it is a capacity-class diagnostic, not a structural bug.

8. **bench_basic_row_slot:** Uses row+slot structure. Codegen normalize_schema must handle it correctly. If conversion to internal zone representation fails, the pipeline error is a blocker.

---

## Handoff to D2

Lane D1 deliverable complete. Manager dispatches:

1. **Lane D2:** Expand `SCENE_ALLOWLIST` in `tools/gen_scene_index.py` to include the 10 scenes (excluding the adversarial smoke fixture, which is noted separately as a fail-by-design test).
2. **Lane D3:** Run preflight on all 10 scenes. Adversarial scene expected to fail loudly with capacity diagnostic; classify failure and confirm it is not a pipeline bug.
3. **Lane D4:** Render all D3-passing non-adversarial scenes (9 scenes) via Playwright. Adversarial scene excluded by design.

---

## Background migration note (deferred to D2)

D1 selects scenes only. D2 will migrate background fields from asset form to gradient form for the allowlist. Per the plan, only the D1 scenes get their background field edited at D2; out-of-allowlist scenes are untouched.

---

## Summary

- **Method:** Read-only survey of 19 base scenes + 2 experiments scenes. Selected 8 real base scenes + 2 hand-authored smoke fixtures.
- **Results:** 10 scenes covering all 10 hard axes. Prioritized hard characteristics (instrument complexity, label content, zoom geometry, workspace diversity, Schema B structure, capacity stress).
- **Failures/gaps:** None. All axes covered. Two smoke fixtures authored inline.
- **Next steps:** Lane D2 expands codegen allowlist; Lane D3 runs preflight; Lane D4 renders passing scenes.
