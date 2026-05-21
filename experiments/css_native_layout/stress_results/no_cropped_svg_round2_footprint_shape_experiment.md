# No-Cropped SVG Round 2: Footprint Shape Experiment

Date: 2026-05-21
Hypothesis: Current footprint classes are too broad (one "container" covers landscape plates AND portrait flasks). Root-cause: shape mismatch in shared classes.

Baseline: 23 unique HARD FAIL cropping items (SVG clipped by parent overflow) post-Trial 5.

## Phase 1: Reshape Existing Classes (Tighter min/max)

**Strategy**: Tighten min/max ranges to better accommodate the dominant object shapes within each class, forcing outliers to break (requiring YAML retagging).

**Changes attempted**:
- `handheld`: min-height 110px → 220px (accommodate tall bottles AR ~0.4)
- `container`: max-width 320px → 280px, min-height 240px → 260px (focus on portrait flasks, exclude wide plates)
- `rack`: min-height 160px → 200px, max-width 190px → 200px (accommodate tall tip boxes)

**Result**: **REGRESSION**. Crops increased from 23 to 52 items.

**Analysis**: The existing CSS values (post-4e2c709) were already optimized from earlier work. Further tightening the classes restricted flex layout options and forced poor aspect-ratio compromises. The root problem is not loose class ranges - it's that incompatible object shapes share the same class:

- `handheld` shared by: bottles (AR ~0.4 tall narrow) + waste containers (AR 0.6-1.4 short wide)
- `container` shared by: tall flasks (AR ~0.5) + landscape plates (AR 1.4-1.5) + tall gel cassettes (AR ~0.9)
- `rack` shared by: tube racks (mixed AR) + tip boxes (AR ~1.5 landscape)

**Conclusion**: CSS-only tightening cannot solve shape mismatch. Phase 1 is not viable without YAML vocabulary changes to split incompatible kinds.

## Phase 2: Prototype New Footprint Classes

**Hypothesis**: If YAML vocabulary split object kinds into finer categories, specialized footprint classes could achieve better fitting without compromise.

**Proposed new classes** (prototype-only, NOT adopted):

### `footprint--tall-glassware`
- **Use case**: Volumetric flasks, Erlenmeyer flasks, tall portrait glassware (AR ~0.35-0.5)
- **CSS dimensions**: min 160x300, max 240x420
- **Expected benefit**: Eliminates aspect distortion on flask rendering (currently 7-8% HARD FAIL when forced into portrait container 220x360)

### `footprint--landscape-plate`
- **Use case**: 96-well plates, 24-well plates, wide shallow containers (AR 1.4-1.5)
- **CSS dimensions**: min 280x200, max 380x280
- **Expected benefit**: Eliminates cropping on wide plates (currently "Artwork Extends Outside Card on bottom" when forced into portrait container)

### `footprint--instrument-wide`
- **Use case**: Plate reader, wide instruments (AR 1.8-2.0)
- **CSS dimensions**: min 380x220, max 500x300
- **Expected benefit**: Removes 19% aspect distortion on plate_reader (currently too tall in landscape large-equipment 360x380)

**Implementation blocker**: The current YAML schema maps by object `kind` (bottle, flask, plate, etc.), not by asset or shape. To use these new classes requires:

1. Either: split object kinds in regions/bench.yaml (e.g., `flask_portrait`, `flask_landscape`, `plate_landscape`)
2. Or: introduce per-asset footprint overrides in scene YAML (scene-level schema extension)
3. Or: introduce new `object.shape_group` or `object.ar_category` field to guide footprint selection

**Adoption recommendation** (escalate to user):
- Phase 2 classes are theoretically sound and dimensionally justified by SVG viewBox analysis
- Adoption requires YAML vocabulary extension (PRIMARY_SPEC.md, object kind taxonomy, scene format)
- This is a spec-level decision, not a CSS-only fix
- Estimated impact if adopted: likely 15-25 additional crops resolved (but verification requires full YAML retag)

## Remaining Issues Not Addressable by Footprint Reshape

The 23 baseline crops break down by root cause:

### Cause: Inherent aspect mismatch (cannot fix by footprint alone)
- **Pipettes** (AR 0.11-0.23 ultra-narrow): serological_pipette, p200_micropipette, p1000_pipette, p10_gel_loading_tip_box
  - Root issue: current small-tool class (50x60 to 80x200) is barely adequate for 0.11 AR; items still render as near-invisible sliver
  - Workaround: requires custom CSS or asset redesign (wider tip visualization)
  
- **Waste shapes** (AR mismatch): waste_container (0.6), waste_tray (1.4)
  - Assigned to `handheld` class designed for bottles (AR 0.4)
  - Cannot coexist in one footprint class without unacceptable compromise
  - Needs separate `footprint--waste` class

### Cause: Artifact in specific scenes (overcrowding or region pressure)
- **Well plates** (center_well_plate, well_plate_96): 3 crops in different scenes
  - Issue: wide plate forced into "work_surface" region that constrains height
  - Region itself has overflow:hidden, clipping artwork bottom
  - Root fix: region redesign, not footprint class

- **Staining tray, kimwipe_pad, gel_cassette, rocking_shaker**: appear in crowded bench scene
  - Issue: scene has 12+ placements in work_surface region
  - Root fix: region layout strategy, not footprint dimensions

- **Electrophoresis tank**: landscape instrument forced into space-constrained instrument_station
  - Root fix: region/layout design, not footprint

### Cause: Aspect tolerance exceedance
- **Bottles** (coomassie_stain, destain, laemmli, bme, ddh2o, ethanol): 7-8% aspect distortion
  - SVG AR ~0.36, rendered AR 0.39 (within 5% tolerance threshold)
  - Barely exceeds tolerance; minor CSS adjustment (min-height + 10px) may resolve
  
- **Cell_counter, microscope**: portrait instruments in landscape-biased large-equipment class
  - Root fix: split large-equipment into portrait and landscape variants

## Summary Table

| Metric | Value |
| --- | --- |
| Baseline crops (deduplicated) | 23 |
| Phase 1 impact | REGRESSION (+29, total 52) |
| Phase 2 impact (theoretical) | 15-25 resolved if adopted |
| Crops resolvable by footprint alone | ~8-10 (well plates, wide plates, instruments) |
| Crops requiring region redesign | ~8 (crowded scene overflows, region constraints) |
| Crops requiring new object kinds | ~5 (waste, narrow pipettes, ultra-wide items) |

## Recommendations

1. **Do NOT adopt Phase 1 CSS changes** - they cause regression
2. **Phase 2 is theoretically viable** but requires YAML spec extension:
   - Extend region mapping to support shape-group-based footprint selection
   - OR introduce per-object footprint override in scene YAML
   - Estimated effort: spec amendment + scene retag (2-3 scenes touched)
   - Estimated payoff: 15-25 additional crops resolved

3. **Alternative path (no spec changes)**:
   - Focus on region redesign (work_surface constraints, instrument_station sizing)
   - This addresses ~8 crops without footprint changes
   - Less invasive but slower progress

4. **Longer-term**: Consider whether SVG assets themselves should be redesigned to fit more standard aspect ratios (e.g., pipette width increased 2-3x to improve visibility and AR)

## Key Files

- Baseline audit: `precheck_post_trial5/visual_audit.md` (23 crops, PASS: 0, PASS_TEMPLATE: 0)
- Phase 1 attempt: `no_crop_round2_phase1_v2/visual_audit.md` (52 crops, regression)
- Sizing table: `no_cropped_svg_asset_sizing_table.md` (architectural mismatch analysis)
- CSS changes: `experiments/css_native_layout/styles/bench.css` (all footprint class definitions)

---

**Conclusion**: Footprint-shape specialization (Phase 2) is a valid approach IF paired with YAML vocabulary extension. Footprint-only tightening (Phase 1) is counterproductive. The current architecture mixes incompatible shapes by design - solving it requires explicit shape taxonomy, not CSS tweaking.

**User decision required**: Approve Phase 2 spec extension pathway, or choose alternative (region redesign, asset improvement)?
