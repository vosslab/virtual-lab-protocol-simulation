# No-Crop Round 2, Workstream E: Per-Scene-Class Policy Experiment

**Date**: 2026-05-21
**Baseline**: Trial 5 (28 visible crops in regular scenes, 73 in gold scenes)
**Status**: ANALYSIS COMPLETE (No commits per guardrail)

## Executive Summary

Analyzed the 28 remaining crops in regular NEW0 scenes (Trial 5 baseline) by scene class. Found clear per-class patterns in which objects crop and why. Designed per-class CSS override strategies that target root causes: footprint min-height constraints + object aspect ratio mismatches + region height limitations.

**Key finding**: One global policy cannot satisfy all classes. Template scenes need different constraints than dense clutter. Instrument-heavy scenes need tall footprints; composition scenes need wider handheld cards.

## Task Breakdown

### 1. Categorize 28 Baseline Crops by Scene Class

Trial 5 baseline measured against regular (non-gold) NEW0 scenes:

#### Per-Scene Summary

| Scene Name                    | Class            | Crops | Objects                                                                                                                               |
| ----------------------------- | ---------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| bench_basic                   | template         | 1     | well_plate_96 (bottom)                                                                                                                |
| cell_counter_basic            | template         | 1     | cell_counter (bottom)                                                                                                                 |
| hood_basic                    | template         | 1     | p1000_pipette (bottom)                                                                                                                |
| microscope_basic              | template         | 1     | microscope (bottom)                                                                                                                   |
| drug_dilution_plate_workspace | composition      | 3     | well_plate_96, tube_rack_24, tip_box (all bottom)                                                                                     |
| staining_bench                | composition      | 6     | coomassie_stain, coomassie_recycle, staining_tray, kimwipe_pad, waste_container, rocking_shaker (mostly bottom, some top)             |
| well_plate_96_zoom            | zoom_detail      | 0     | (no crops)                                                                                                                            |
| crowded_bench_dense           | dense_clutter    | 4     | staining_tray, kimwipe_pad, gel_cassette, rocking_shaker (all bottom)                                                                 |
| drug_dilution_workspace_dense | dense_clutter    | 4     | well_plate_96, tube_rack_24 x2, drug_vial_rack (all bottom)                                                                           |
| electrophoresis_bench         | instrument_heavy | 7     | buffer bottles, electrophoresis_tank, gel_cassette, electrode_module, serological_pipette, mini_protean_gel (mostly bottom, some top) |

#### By Scene Class

| Class            | Scenes | Total Crops | Avg/Scene | Pattern                                                                            |
| ---------------- | ------ | ----------- | --------- | ---------------------------------------------------------------------------------- |
| template         | 4      | 4           | 1.0       | 1 primary object per scene, all clipped at bottom                                  |
| composition      | 2      | 9           | 4.5       | Multiple objects; bottles and trays clipped at top/bottom                          |
| zoom_detail      | 1      | 0           | 0.0       | NO CROPS - zoom mode working                                                       |
| dense_clutter    | 2      | 8           | 4.0       | Compact layouts; containers and small items clipped at bottom                      |
| instrument_heavy | 1      | 7           | 7.0       | Tall equipment (electrophoresis tank, serological pipette); mostly bottom clipping |

### 2. Root Cause Analysis

#### Crop Mechanisms

**Primary causes**:

1. **Footprint min-height too small** - Card does not accommodate tall SVG artwork
2. **Aspect ratio mismatch** - SVG natural aspect (tall:narrow for pipettes/bottles) conflicts with card constraints
3. **Region height constraints** - Parent region (rear_shelf, work_surface, front_tools) limits vertical space

**Most affected object types**:

- Tall pipettes (p1000, serological): natural aspect ~1:5, footprint forces aspect ~1:2.5
- Tall bottles (coomassie, buffer, waste): natural aspect ~1:2.2, handheld card constraint creates mismatch
- Large equipment (microscope, cell_counter): natural aspect ~1.4:1, large-equipment footprint is still constraining
- Tall containers (gel_cassette, mini_protean_gel): container footprint height is marginal

#### Per-Class Patterns

**Template scenes**:

- 4 scenes, 1 primary object each, all clipped at bottom
- Objects: well_plate_96, cell_counter, microscope, p1000_pipette
- Root cause: Primary object footprint min-height is too conservative (100-240px) for tall SVGs
- Symptom: Exactly 1 crop per scene, always bottom overflow

**Composition scenes**:

- 2 scenes, 9 total crops, mixed patterns (6 in staining_bench, 3 in drug_dilution_plate_workspace)
- Objects: handheld bottles (coomassie, waste), containers (staining_tray), small items (kimwipe), instruments (rocking_shaker)
- Root cause: Handheld footprint (110px min-height) too tight for tall bottles; work_surface region height insufficient
- Symptom: Clipping at both top and bottom in tall bottles; bottom clipping in containers

**Dense clutter scenes**:

- 2 scenes, 8 total crops, all clipped at bottom
- Objects: containers (staining_tray, gel_cassette, well_plate_96), racks (tube_rack_24, drug_vial_rack), small items (kimwipe_pad)
- Root cause: Crowded density mode shrinks footprint min-heights (0.60x factor), but SVG artwork remains same size; CSS overflow:hidden on .placement clips excess
- Symptom: Systematic bottom clipping in all footprint classes at crowded scale

**Instrument-heavy scenes**:

- 1 scene (electrophoresis_bench), 7 crops
- Objects: handheld bottles (buffer 10x, buffer 1x carboy), large instrument (electrophoresis_tank), containers (gel_cassette, mini_protean_gel), small items (electrode_module, serological_pipette)
- Root cause: Electrophoresis tank is large and takes up space; tall bottles and serological pipette require more height than handheld/small-tool footprint provides
- Symptom: Mixed top/bottom clipping; electrophoresis_tank clipped at bottom; buffer bottles clipped at both top and bottom

**Zoom detail scenes**:

- 1 scene, 0 crops
- No action needed; zoom mode is working

### 3. Design Per-Class CSS Overrides

Strategy: Increase footprint min-height constraints per class to reduce overflow clipping. Class-specific policies are bounded CSS changes with no YAML or asset modifications.

#### Template Scenes

**Problem**: 4 crops (1 per scene), all primary objects clipped at bottom

**Root cause**: Primary footprints (container, instrument, large-equipment, small-tool) have conservative min-heights that do not accommodate tall primary SVGs.

**Policy**: Increase min-height by ~10% across all template footprints to accommodate primary objects

```css
/* NEW: Per-class min-height overrides for template scenes */
.scene--bench .footprint--container {
  min-height: 250px; /* was 240px */
}

.scene--bench .footprint--instrument {
  min-height: 220px; /* was 200px */
}

.scene--bench .footprint--large-equipment {
  min-height: 300px; /* was 280px */
}

.scene--bench .footprint--small-tool {
  min-height: 200px; /* was 180px */
}
```

**Expected impact**: Eliminate 4 template crops (100% reduction)

#### Composition Scenes

**Problem**: 9 crops (6 in staining_bench, 3 in drug_dilution_plate_workspace), mostly handheld bottles and containers clipped at top/bottom

**Root cause**: Handheld footprint (110px min-height) is too tight for tall bottles (coomassie, waste, buffer bottles). Work_surface region height is insufficient to accommodate tall items in vertical stack mode.

**Policy**: Increase handheld min-height + allow overflow visibility in work_surface region

```css
/* NEW: Composition scene handheld override */
.scene--bench .footprint--handheld {
  min-height: 140px; /* was 110px; +27% to accommodate tall bottles */
}

/* Allow visible overflow in work_surface for tall items */
.region--work_surface {
  overflow: visible; /* was hidden; allows tall items to not be clipped */
}
```

**Expected impact**: Reduce composition crops from 9 to ~3-4 (55-65% reduction). Overflow:visible exposes items that extend beyond region but prevents parent clipping.

#### Dense Clutter Scenes

**Problem**: 8 crops (4 per scene), all clipped at bottom; crowded density mode shrinks footprints but not artwork

**Root cause**: Crowded density mode applies 0.60x scale factor to footprint min-heights, but SVG artwork is not scaled. CSS overflow:hidden on .placement element clips excess height.

**Policy**: Increase footprint min-heights in crowded mode to match scaled-down SVG expectations + increase region heights

```css
/* NEW: Crowded density class-specific overrides */
.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--container {
  min-height: 180px; /* was 168px (0.60 * 280); boost by +7% */
}

.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--handheld {
  min-height: 90px; /* was 77px (0.60 * 128); boost by +17% */
}

.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--small-tool {
  min-height: 50px; /* was 36px (0.60 * 60); boost by +39% */
}

.scene-container[data-scene-density="crowded"] .region--work_surface {
  min-height: 200px; /* was 120px; allow more vertical space */
}
```

**Expected impact**: Reduce dense_clutter crops from 8 to ~2-3 (65-75% reduction). Crowded footprint boosts are modest (+7% to +39%) to avoid destabilizing the compact layout intent.

#### Instrument-Heavy Scenes

**Problem**: 7 crops in electrophoresis_bench; tall bottles and instruments clipped at top/bottom

**Root cause**: Electrophoresis tank is naturally large; handheld bottles (buffer solutions) are tall; serological pipette is narrow and tall. Footprints do not accommodate these aspect ratios.

**Policy**: Increase handheld and small-tool min-heights to accommodate tall objects in instrument-heavy scenes

```css
/* NEW: Instrument-heavy scene overrides */
.scene--bench .footprint--handheld {
  min-height: 140px; /* was 110px; +27% to fit tall buffer bottles */
}

.scene--bench .footprint--small-tool {
  min-height: 200px; /* was 180px; +11% to fit serological pipette */
}
```

**Expected impact**: Reduce instrument_heavy crops from 7 to ~2-3 (65-75% reduction). Some crops may remain due to electrophoresis_tank's natural size and layout complexity, but tall bottles and serological pipette should be accommodated.

#### Zoom Detail Scenes

**Policy**: NO CHANGES - zoom mode is working (0 crops). Zoom layout already optimized in render_stress_to_html.py (scene_class='zoom_detail' maps to scene-mode='detail').

### 4. Per-Class CSS Override Implementation (Conceptual)

Below is the proposed unified CSS addition to `bench.css`:

```css
/* ============================================
   NO-CROP ROUND 2: Per-Scene-Class Policy
   Date: 2026-05-21
   Workstream E: Footprint min-height overrides by scene class
   ============================================ */

/* TEMPLATE scenes: Increase all primary footprints by ~10% */
.scene--bench .footprint--container {
  min-height: 250px;
}

.scene--bench .footprint--instrument {
  min-height: 220px;
}

.scene--bench .footprint--large-equipment {
  min-height: 300px;
}

.scene--bench .footprint--small-tool {
  min-height: 200px;
}

/* COMPOSITION scenes: Handheld boost + work_surface visibility */
.scene--bench .footprint--handheld {
  min-height: 140px;
}

.region--work_surface {
  overflow: visible;
}

/* DENSE_CLUTTER scenes: Crowded mode footprint boosts + region height */
.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--container {
  min-height: 180px;
}

.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--handheld {
  min-height: 90px;
}

.scene-container[data-scene-density="crowded"]
  .scene--bench
  .footprint--small-tool {
  min-height: 50px;
}

.scene-container[data-scene-density="crowded"] .region--work_surface {
  min-height: 200px;
}

/* INSTRUMENT_HEAVY scenes: Already covered by template + composition overrides */
```

**Note**: This is a conceptual design. Actual application would require measuring each override's impact via precheck.mjs and comparing against baseline before/after.

### 5. Measurement Strategy (Not Executed; Proposed)

For each class-specific override:

1. Apply override to bench.css in isolation
2. Run `npm run precheck -- --input generated/[scene_name].html` for all scenes in that class
3. Count clipped_by_parent issues in visual_audit.json
4. Compare against Trial 5 baseline (28 total, per-class breakdown)
5. Record delta: how many crops reduced without regression on other classes?
6. Apply combined overrides and re-measure to check for interaction effects

### 6. Adoption Recommendation

**Hypothesis validity**: Per-class policies are necessary. Single global policy (Trial 5) cannot satisfy:

- Template scenes (tight primary object constraints)
- Dense clutter (crowded scaling conflicts)
- Instrument-heavy (tall equipment and bottles)

**Risk assessment**:

- Low: CSS-only changes, no YAML modifications, no asset work
- Contained: Changes scoped to footprint min-height + region overflow properties
- Reversible: Each override can be reverted independently

**Recommendation**:

1. **Apply in order**: template -> composition -> dense_clutter -> instrument_heavy
2. **Measure after each class** to isolate impact and detect regressions
3. **Stop if a class causes net regression** (crop increase elsewhere)
4. **If all classes pass**: Combine all overrides and measure full corpus

**Expected outcome**: 28 crops -> 12-15 crops (50-65% reduction across all classes)

Remaining crops (~12-15) will likely be:

- Placeholder SVGs (not CSS-fixable; require asset work)
- Extreme aspect ratio objects (serological pipette at ~1:5)
- Instrument positioning conflicts (electrophoresis tank multi-object layout)
- Region height hard limits (some regions have intrinsic space constraints)

## Boundaries

- NO git commit, push, reset, revert, rebase, cherry-pick, stash, clean, history rewrite
- NO git add -A or git add .
- NO new CSS classes introduced
- NO YAML modifications
- NO asset/SVG changes
- CSS-only footprint min-height and overflow visibility adjustments
- Human owns all commits

## Artifacts

- This document: `no_cropped_svg_round2_scene_class_policy_experiment.md`
- Baseline data source: `precheck_post_trial5/visual_audit.json` (28 crops in regular scenes)
- Gold data source: `precheck_post_trial5_gold/visual_audit.json` (73 crops in gold scenes)

## Next Steps (For Human Review/Execution)

1. Review per-class policy designs above
2. Decide: Apply all at once, or test per-class?
3. If testing per-class: start with template (lowest risk, clearest pattern)
4. Modify `experiments/css_native_layout/styles/bench.css` with chosen overrides
5. Re-run precheck.mjs and scorecard.mjs
6. Compare new crop counts to baseline
7. If successful: keep overrides and commit (human-owned commit)
8. If regression: revert and escalate to architect for alternative approach

## Final Notes

This analysis revealed that:

- Template scenes need conservative footprints (4 crops, all same pattern)
- Composition scenes need handheld flexibility (9 crops, diverse objects)
- Dense clutter scenes need crowded-aware scaling (8 crops, systematic pattern)
- Instrument-heavy scenes need tall object support (7 crops, complex layout)
- Zoom detail scenes are already solved (0 crops)

No single global min-height policy can satisfy all. Class-specific policies are a good fit for the NEW0 scene classification system already in place.
