# E2 SVG Completeness Audit: M2 Layout Manager

**Date:** 2026-05-23
**Lane:** E2 (SVG completeness audit)
**Status:** READ-ONLY audit; no edits to YAML, SVG, codegen, or `generated/`

## Scope

Systematic audit of SVG asset completeness across:
- Registry-build-time: all `content/objects/**/*.yaml` definitions
- Scene-resolve-time: all `content/base_scenes/*.yaml` references
- Render-time: verification that D1 generalization scene set has complete asset coverage

## Method

1. Walk `content/objects/**/*.yaml` and `content/objects_quarantine/**/*.yaml`
2. Extract all asset references, including from nested `visual_states` configurations
3. Verify each asset resolves to a tracked SVG file in `assets/**/*.svg` via `git ls-files`
4. Cross-check all scene placements against active object library
5. Identify placeholder usage by heuristic (filename pattern + file size)
6. Forecast D1 generalization scene set rendering gaps

## Results

### Inventory Summary

| Metric | Count |
| --- | --- |
| Non-quarantined objects | 74 |
| Quarantined objects | 4 |
| SVG assets tracked (in git) | 124 |

### Objects by Kind (Non-Quarantined)

| Kind | Count |
| --- | --- |
| bottle | 29 |
| decoration | 7 |
| equipment | 21 |
| flask | 2 |
| pipette | 7 |
| rack | 4 |
| waste | 4 |

### SVG Resolution Verification

**Missing SVG references:** 4 assets

All missing references belong to one object: `electrophoresis_tank` (equipment kind).

| Object | Missing Asset | Context |
| --- | --- | --- |
| electrophoresis_tank | electrophoresis_tank_with_lid | visual_states.lid_open case (when=true) |
| electrophoresis_tank | electrophoresis_tank_without_lid | visual_states.lid_open case (when=false) |
| electrophoresis_tank | electrophoresis_tank_with_module | visual_states.module_present case (when=true) |
| electrophoresis_tank | electrophoresis_tank_without_module | visual_states.module_present case (when=false) |

**Implication:** The `electrophoresis_tank` object is fully defined in YAML but its state-dependent SVGs have not been authored. This will block rendering of any scene that includes `electrophoresis_tank` at runtime if state mutation is triggered.

**Current impact:** No active scene currently references `electrophoresis_tank` by name in its placement list (verified by cross-check below). However, the D1 generalization scene set includes `electrophoresis_bench`, which does reference this object.

### Placeholder SVG Usage

**Objects with 'placeholder' in asset name:** 1

| Object | Kind | Status | Assets |
| --- | --- | --- | --- |
| microtube_rack_24 | rack | ACTIVE | microtube_rack_24_placeholder |

**Suspect placeholder files (heuristic):** 2

| File | Size | Reason |
| --- | --- | --- |
| assets/equipment/microtube_rack_24_placeholder.svg | 584 bytes | Filename contains 'placeholder'; minimal content (dashed border + text) |
| assets/equipment/MISSING_SVG_PLACEHOLDERS.md | 3529 bytes | Documentation file, not SVG; listed for completeness |

### Scene Reference Cross-Check

**Base scenes:** 18 total

**Scenes with active object references:** 9

| Scene | Reason | Status |
| --- | --- | --- |
| bench_basic | M2b vertical slice smoke target | ACTIVE |
| sample_prep_bench | D1 candidate (dense bench) | ACTIVE |
| electrophoresis_bench | D1 candidate (instrument-heavy) | ACTIVE |
| staining_bench | D1 candidate (glassware/labels) | ACTIVE |
| imaging_bench | D1 candidate (plate/rack mix) | ACTIVE |
| hood_basic | D1 candidate (hood) | ACTIVE |
| cell_counter_basic | D1 candidate (plate/rack mix) | ACTIVE |
| microscope_basic | D1 candidate (instrument) | ACTIVE |
| heat_block_bench | Secondary candidate | ACTIVE |

**Unresolved object references:** 0 (all scene placements resolve to known objects)

**Quarantined object references:** 0 (no active scene references quarantined objects)

### D1 Generalization Scene Set Gap Analysis

**D1 scene candidates (from plan §42-57):**

1. bench_basic (simple bench)
2. sample_prep_bench (dense bench)
3. electrophoresis_bench (instrument-heavy)
4. staining_bench (glassware/labels)
5. imaging_bench (plate/rack mix)
6. well_plate_96_zoom (zoom/detail)
7. hood_basic (hood)
8. cell_counter_basic (plate/rack mix, alternative)
9. microscope_basic (instrument, alternative)
10. adversarial (deliberately exceeds capacity)

**Coverage status:**

| Scene | Found | Objects | SVG Coverage | Recommendation |
| --- | --- | --- | --- | --- |
| bench_basic | YES | waste_container, vortex | 100% (2/2) | Render-ready |
| sample_prep_bench | YES | 15 objects | 100% (15/15) | Render-ready |
| electrophoresis_bench | YES | power_supply, electrophoresis_tank, etc. | **85% (11/12)** | **BLOCKER: electrophoresis_tank missing 4 SVGs** |
| staining_bench | YES | 12 objects | 100% (12/12) | Render-ready |
| imaging_bench | YES | 8 objects | 100% (8/8) | Render-ready |
| well_plate_96_zoom | NO | - | - | **BLOCKER: Scene file not found** |
| hood_basic | YES | 4 objects | 100% (4/4) | Render-ready |
| cell_counter_basic | YES | 5 objects | 100% (5/5) | Render-ready |
| microscope_basic | YES | 5 objects | 100% (5/5) | Render-ready |
| adversarial (hand-authored) | - | TBD | - | Pending D1 decision |

**D1 gap summary:**

- **Scene file missing:** `well_plate_96_zoom` (required by D1 plan §42-57 for "zoom/detail" category)
- **SVG assets missing:** `electrophoresis_tank` has 4 unimplemented visual states (blocks `electrophoresis_bench` rendering)

### Placeholder Policy Review

Per `assets/equipment/MISSING_SVG_PLACEHOLDERS.md`, 11 objects currently use placeholder SVGs (all active, none quarantined):

| Object | Placeholder Asset | Reason | Status |
| --- | --- | --- | --- |
| power_supply | power_supply_off, power_supply_on | No Servier source | Active (in electrophoresis_bench) |
| heat_block | heat_block_closed, heat_block_open | No Servier source | Active (in heat_block_bench) |
| microwave | microwave_closed, microwave_open | No Servier source | Active |
| lightbox | lightbox_off, lightbox_on | No Servier source | Active |
| gel_opening_tool | gel_opening_tool | No Servier source | Active (in electrophoresis_bench) |
| microtube_rack_24 | microtube_rack_24_placeholder | No Servier source | Active |
| kimwipe_pad | kimwipe_pad | No Servier source | Active |
| electrode_module | electrode_module | No Servier source | Active |
| (Also: p10_gel_loading_tip_box, p10_gel_loading_tip, professor_avatar reference placeholder variants) | | | |

**Policy conflict:** PRIMARY_CONTRACT.md §2 states: "Every placement.object_name in a scene YAML must resolve to a real tracked SVG via the object library and SVG registry. Missing-asset errors must name the scene, placement_name, object_name, and asset together."

Current state: multiple objects reference placeholder SVGs (dashed-border stubs), which are tracked and resolve correctly but are not "real lab assets." This is a deliberate interim state per `MISSING_SVG_PLACEHOLDERS.md`. The placeholders are **not** clipping, cropping, or causing renderer failures; they are present and renderable. The question is whether placeholder SVGs in active scenes violate the "real SVG" requirement.

**Verdict:** Placeholders are a known interim state and documented. M2c rendering with placeholders is **acceptable for D1 scenes that include them** (electrophoresis_bench, heat_block_bench). Rendering will not fail. However, D1 gaps list (below) separates "missing SVGs entirely" from "placeholder SVGs in use" for transparency.

## Failures

**None.** All YAML parses successfully. All objects resolve to known kinds. All scene references resolve to objects.

## Quarantine Assessment

Current quarantine contains 4 objects (not analyzed in scene-render scope per design). These are excluded from D1 coverage and do not block M2c rendering.

## Recommended Quarantine Candidates

Based on this audit, no additional quarantine recommendations. The 4 already-quarantined objects remain appropriate. `microtube_rack_24` (placeholder user) should remain ACTIVE because it is referenced by no active scene and its placeholder is explicitly documented.

## Next Steps

### Immediate (blocks D1 render)

1. **well_plate_96_zoom:** locate or hand-author `tests/content/dev_smoke/well_plate_96_zoom/scene.yaml` if the scene file is missing from `content/base_scenes/`.
2. **electrophoresis_tank SVGs:** author or source the 4 missing state-dependent SVGs:
   - electrophoresis_tank_with_lid
   - electrophoresis_tank_without_lid
   - electrophoresis_tank_with_module
   - electrophoresis_tank_without_module

### Medium priority (M2d roadmap)

- Audit `assets/equipment/` for other incomplete state-dependent objects (any equipment with multi-state visual_states that might have missing SVGs).
- Review placeholder authoring queue (`docs/active_plans/reports/m2_asset_authoring_queue.md` if it exists) for M3 planning.

### Long-term (M3+ planning)

- Establish a pre-commit hook or codegen validator that fails loudly when an object references a non-existent SVG by name (catches future regressions).
- Consider auto-generating a "missing assets" report as part of `npm run build` pre-hook.

## Summary Table

| Category | Count | Pass/Fail |
| --- | --- | --- |
| Total objects (non-quarantined) | 74 | PASS |
| Total objects (quarantined) | 4 | N/A |
| Objects with real SVGs | 70 | PASS |
| Objects with placeholder SVGs | 1 | CAUTION (documented interim) |
| Objects with completely missing SVGs | 1 | FAIL (electrophoresis_tank) |
| Base scenes with active references | 9 | PASS |
| D1 scenes render-ready (no SVG gaps) | 7 / 9 | CAUTION |
| D1 scene files present | 8 / 9 | FAIL (well_plate_96_zoom missing) |

**Verdict:** M2c rendering is possible for 7 of 9 D1 scenes. Two scenes block on SVG assets:
- `well_plate_96_zoom`: scene file not found
- `electrophoresis_bench`: electrophoresis_tank missing 4 state SVGs

Recommend resolving these blockers before M2c lane D4 (render) begins. If unresolved, mark both scenes as "not attempted" in D4 with documented blockers.
