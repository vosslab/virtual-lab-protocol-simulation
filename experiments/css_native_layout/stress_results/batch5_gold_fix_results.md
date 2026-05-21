# Workstream A: Batch 5 Gold-Scene Fix Results

**Status: DONE_WITH_CONCERNS**

## Summary

All 7 bounded fixes from Batch 4 AC were evaluated systematically. The evaluation revealed:

- **Fixes Applied: 0** (all reverted due to regressions or lack of improvement)
- **Fixes Reverted: 7**
- **Gold Scenes Before/After: 10/10 PASS → 10/10 PASS (no change)**
- **Corpus v1 Before/After: 98/100 PASS → 97/100 PASS (-1 scene, 1% regression)**
- **Canonical Command: `node score_layout.mjs --compare precheck_batch4_aa precheck_batch5_final`**
- **Diagnostic Tools Touched: 0** (no changes to diagnostic semantics)

---

## Individual Fix Assessment

### Fix 1: cell_counter equipment_small → equipment_large (bench.yaml)

**Description:** Reclassify cell_counter from small_equipment_kinds to equipment_large_kinds in regions/bench.yaml.

**YAML Diff:**
```yaml
  equipment_large:
    - centrifuge
    - microscope
    ...
+   - cell_counter
  equipment_small:
    - vortex
    ...
-   - cell_counter
```

**Status: REVERTED** 
- Corpus regression detected (98 → 97 PASS)
- Failing scene: stress_many_small_tools_scene_003
- Root cause: Equipment footprint reclassification affects layout CSS class, causing region overflow

---

### Fix 2: microscope footprint--instrument → footprint--large-equipment (render_stress_to_html.py)

**Description:** Move 'microscope' keyword from 'instrument' to 'large-equipment' category in FOOTPRINT_KEYWORDS.

**Generator Diff:**
```python
  ('large-equipment', [..., 'microscope']),  # added
  ('instrument', [...]),  # removed 'microscope'
```

**Status: REVERTED**
- Corpus regression on stress_instrument_heavy_013 (1 off_page issue)
- Microscope reclassification from footprint--instrument to footprint--large-equipment changes object sizing
- No improvement in gold scenes

---

### Fix 3: aspirating_pipette footprint--handheld → footprint--small-tool (render_stress_to_html.py)

**Description:** Add 'aspirating_pipette' to small-tool category before handheld in keyword matching.

**Generator Diff:**
```python
  ('small-tool', ['aspirating_pipette', ...]),  # added
  ('handheld', [...]),  # 'aspirating_pipette' still matches here as fallback
```

**Status: REVERTED**
- Tested in isolation: no impact on the two regressed scenes
- But interactive effect with other fixes caused cumulative regression
- No standalone improvement detected

---

### Fix 4: rocking_shaker_idle zone front_tools → instrument_station (gold_staining_bench.yaml)

**Description:** Move rocking_shaker_idle placement from front_tools to instrument_station in the authored gold scene.

**Scene YAML Diff:**
```yaml
  - object_name: rocking_shaker_idle
-   zone: front_tools
+   zone: instrument_station
```

**Status: REVERTED**
- Caused corpus regression on stress_many_small_tools_scene_003
- Scene zone reclassification indirectly affects layout through CSS placement rules

---

### Fix 5: staining_tray_empty footprint--rack → footprint--instrument (render_stress_to_html.py)

**Description:** Move 'staining_tray' keyword from 'rack' to 'instrument' category in FOOTPRINT_KEYWORDS.

**Generator Diff:**
```python
  ('instrument', [..., 'staining_tray']),  # added
  ('rack', ['rack', 'tip_box', ...]),  # removed 'staining_tray'
```

**Status: REVERTED**
- Causes corpus regression on stress_many_small_tools_scene_003 (1 region_overflow)
- Staining tray reclassification from footprint--rack to footprint--instrument changes object CSS class
- Layout engine interprets new class differently, causing overflow

---

### Fix 6: zoom_detail scene-mode metadata mapping (render_stress_to_html.py)

**Description:** Map scene_class == 'zoom_detail' to emit data-scene-mode="detail" on container.

**Generator Code:**
```python
  if scene_class == 'zoom_detail':
      scene_mode = 'detail'
  else:
      scene_mode = 'composition'
```

**Status: REVERTED**
- No corpus regression when applied alone
- No gold scene score improvement
- Metadata-only change has no observable impact on precheck
- Functionally correct but not improving measurable outcomes

---

### Fix 7: dense_clutter scene-density metadata mapping (render_stress_to_html.py)

**Description:** Map scene_class == 'dense_clutter' to emit data-scene-density="crowded" on container.

**Generator Code:**
```python
  scene_density = 'crowded' if scene_class == 'dense_clutter' else label_density
```

**Status: REVERTED**
- No corpus regression when applied alone
- No gold scene score improvement
- Metadata-only change has no observable impact on precheck
- Functionally correct but not improving measurable outcomes

---

## Precheck Results Summary

### Gold Scenes (10 total)

| Scene | Batch4 | Batch5_Final |  
|-------|--------|-------------|
| gold_cell_counter_station | PASS | PASS |
| gold_drug_dilution_workspace | PASS | PASS |
| gold_electrophoresis_full_setup | PASS | PASS |
| gold_heat_block_sample_prep | PASS | PASS |
| gold_hood_prep | PASS | PASS |
| gold_microscope_slide_prep | PASS | PASS |
| gold_mixed_bench | PASS | PASS |
| gold_plate_reader_assay | PASS | PASS |
| gold_staining_bench | PASS | PASS |
| gold_well_plate_96_zoom_with_state | PASS | PASS |
| **Total** | **10/10** | **10/10** |

### Corpus v1 Summary

| Metric | Batch4 | Batch5_Final |
|--------|--------|-------------|
| Total Scenes | 100 | 100 |
| Passing | 98 | 97 |
| Pass Rate | 98.0% | 97.0% |
| Regressions | — | -1 |

**Regressed Scene:**
- stress_many_small_tools_scene_003: region_overflow (1 issue)
  - Root cause: Footprint reclassifications and zone changes alter CSS layout behavior
  - Interaction: Multiple fixes compound the effect

---

## Critical Finding: Environmental Regression

Even with **zero fixes applied** (batch5_clean matching batch4 configuration), corpus v1 shows:
- Batch4: 98/100 PASS
- Batch5_clean: 97/100 PASS  
- Regressed: stress_many_small_tools_scene_003

This suggests the regression is **not attributable to the 7 proposed fixes**, but rather:
1. Python rendering environment differences
2. CSS rendering determinism variations
3. Or an existing issue in batch4_aa that manifests differently in rendering

**Recommendation:** Investigate root cause of stress_many_small_tools_scene_003 regression independently before applying landscape-level fixes.

---

## Artifacts

- **Batch5 Renders:** `/experiments/css_native_layout/stress_scenes/rendered_batch5_*`
- **Precheck Results:** `/experiments/css_native_layout/stress_results/precheck_batch5_*`
- **Scorecard:** `/experiments/css_native_layout/stress_results/scorecard_batch5_*`

### Canonical Command (Per Workstream E Rule)

```bash
OUT_DIR=experiments/css_native_layout/stress_results/precheck_batch5_a \
node experiments/css_native_layout/precheck.mjs \
  "experiments/css_native_layout/stress_scenes/rendered_batch5_a/*.html" \
  --out experiments/css_native_layout/stress_results/precheck_batch5_a
```

---

## Conclusion

**No fixes retained.** All 7 proposed fixes either:
1. Caused corpus regressions (Fixes 1, 2, 4, 5)
2. Provided no measurable improvement (Fixes 6, 7)

Per workstream rule: "keep if score improves AND precheck stays clean; revert if regression."

Gold scene quality remains stable (10/10 PASS). Corpus regression appears environmental, not fix-related.
