# Round 3: SDS-PAGE Gel/Electrode Fallback Fix Report

**Status**: Partial success (66/120 fallbacks eliminated; 54 eliminated)
**Date**: 2026-05-22
**Baseline**: 119 fallback instances post-foundation (af8024506f95425e5)
**Pre-fix**: 120 instances
**Post-fix**: 66 instances
**Delta**: 54 fallbacks eliminated

## Diagnosis

Analyzed 7 SDS-PAGE gel/electrode objects with identical 10-instance frequency across 10 protocols, indicating a single shared scene configuration gap.

### Per-Object Diagnosis

1. **p10_gel_loading_tip_box** (decoration)
   - **Cause**: VISUAL_STATE_GAP — empty `visual_states: {}`
   - **Root**: Stateless object with no state field to key visual_states
   - **Fix Applied**: Added `visible` bool field; svg case for both true/false
   - **Generated**: field_name="visible", kind="svg_swap", cases for true/false
   - **Asset**: SVG_P10_GEL_LOADING_TIP_BOX exists ✓
   - **Result**: ELIMINATED (10 instances → 0)

2. **gel_opening_tool** (equipment)
   - **Cause**: VISUAL_STATE_GAP — empty `visual_states: {}`
   - **Root**: Stateless object with no state field to key visual_states
   - **Fix Applied**: Added `visible` bool field; svg case for both true/false
   - **Generated**: field_name="visible", kind="svg_swap", cases for true/false
   - **Asset**: SVG_GEL_OPENING_TOOL exists ✓
   - **Result**: ELIMINATED (10 instances → 0)

3. **electrode_module** (equipment)
   - **Cause**: VISUAL_STATE_GAP — composite/overlay only visual_states
   - **Root**: Had 3 state fields with svg cases, but all mapped composite/overlay only in schema
   - **Existing State**: mounted, cassette_mounted, wing_clamps_open (all bool)
   - **Original visual_states**: All three fields present but marked composite (incorrectly)
   - **Fix Applied**: Changed visual_states to svg kind with cases for true/false for all three fields
   - **Generated**: All three fields now kind="svg_swap" with correct cases
   - **Asset**: SVG_ELECTRODE_MODULE exists ✓
   - **Result**: ELIMINATED (10 instances → 0)

4. **mini_protean_gel** (equipment)
   - **Cause**: VISUAL_STATE_GAP — composite-only visual_state
   - **Root**: sealed bool field had kind: composite with empty composite: []
   - **Fix Applied**: Changed visual_states.sealed from composite to svg kind; added cases for true/false
   - **Generated**: field_name="sealed", kind="svg_swap", cases for true/false
   - **Asset**: SVG_MINI_PROTEAN_GEL exists ✓
   - **Result**: ELIMINATED (10 instances → 0)

5. **gel_comb** (equipment)
   - **Cause**: VISUAL_STATE_GAP — composite-only visual_state
   - **Root**: position enum field had kind: composite; single enum value not_in_cassette
   - **Fix Applied**: Changed visual_states.position from composite to svg kind; expanded enum to include in_cassette; added cases for both
   - **Generated**: field_name="position", kind="svg_swap", cases for in_cassette/not_in_cassette
   - **Asset**: SVG_GEL_COMB exists ✓
   - **Result**: ELIMINATED (10 instances → 0)

6. **p200_micropipette** (pipette)
   - **Status**: NOT FIXED
   - **Current Fallback Count**: 10 instances remain
   - **Diagnosis**: Object already had proper visual_states entries for held_material_name (svg_swap kind with cases for empty/filled); assets exist (p200_micropipette_empty, p200_micropipette_filled)
   - **Root Cause**: Unclear — asset resolution should work. Likely issue:
     - Object state not initialized with default held_material_name="empty" at scene start
     - OR runtime rendering skips this object for unknown reason
   - **Required Investigation**: Runtime state initialization flow; why held_material_name defaults not applied to p200_micropipette in SDS-PAGE scenes
   - **Recommendation**: DEFER pending runtime state initialization audit

7. **gel_cassette** (equipment, structured)
   - **Status**: NOT FIXED
   - **Current Fallback Count**: 10 instances remain
   - **Diagnosis**: Object has structure with subparts (lanes). visual_states define per-subpart rendering:
     - material_name (svg kind): references gel_lane_empty, gel_lane_ladder, gel_lane_sample
     - material_volume, tape_present, comb_present, top_plate_inserted, side_clamps_locked, wing_clamps_locked: all composite kind
   - **Root Cause**: ASSET_NAME_MISSING — referenced assets do not exist:
     - gel_lane_empty: NOT FOUND in svg_assets/index.ts
     - gel_lane_ladder: NOT FOUND in svg_assets/index.ts
     - gel_lane_sample: NOT FOUND in svg_assets/index.ts
   - **Asset Available**: SVG_GEL_CASSETTE exists (for the cassette itself)
   - **Remediation**: Requires creating 3 new SVG assets (gel_lane_*.svg files). Out of scope for this task (requires asset authoring).
   - **Recommendation**: DEFER to asset authoring task

## Build & Verification

### Build Status
- **build_github_pages.sh**: SUCCESS
- **npx tsc --noEmit**: PASS (zero errors)
- **Object generator**: Re-run to include state field changes
  - Command: `source source_me.sh && python3 pipeline/build_object_data.py`
  - Generated objects for 5 objects with updated visual_states

### Fallback Recount
**Pre-fix baseline**: 120 instances
**Post-fix result**: 66 instances
**Reduction**: 54 instances (45% reduction from baseline)

### Top Remaining Fallbacks (Post-Fix)
| Object | Count | Reason |
| --- | --- | --- |
| p200_micropipette | 10 | State initialization issue (investigate) |
| gel_cassette | 10 | Missing gel_lane_* assets |
| micropipette | 7 | Not in scope (general mixed-protocol issue) |
| ethanol_bottle | 4 | Hood scene issue (not SDS-PAGE cluster) |
| hood_surface | 4 | Hood scene issue (not SDS-PAGE cluster) |
| media_bottle | 4 | Hood scene issue (not SDS-PAGE cluster) |
| incubator | 3 | Mixed protocol issue |
| kimwipe_pad | 3 | Staining scene issue |
| metformin_working_tube | 2 | Not in scope |
| label_pen | 2 | Not in scope |

## Modified Files

All files under `content/objects/`:
1. `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/decoration/p10_gel_loading_tip_box.yaml`
2. `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/gel_opening_tool.yaml`
3. `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/electrode_module.yaml` (reverted to use svg instead of composite)
4. `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/mini_protean_gel.yaml`
5. `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/equipment/gel_comb.yaml`

Generated files updated:
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/generated/object_data.ts` (regenerated via build_object_data.py)

## Deferred Objects

| Object | Reason | Next Step |
| --- | --- | --- |
| p200_micropipette | Runtime state initialization unclear despite correct visual_states schema | Debug runtime state initialization; may be scene-specific |
| gel_cassette | Missing 3 required SVG assets (gel_lane_empty, gel_lane_ladder, gel_lane_sample) | Authoring task: create gel_lane SVG files and update svg_assets generator |

## Key Findings

1. **Stateless Object Pattern**: Objects without state fields cannot use visual_states unless a dummy field is added. The resolveVisualAsset function requires a state_field to match against visual_states entries.

2. **Asset Availability**: All 5 fixed objects had SVG assets available in the barrel export (svg_assets/index.ts).

3. **Structural Objects**: gel_cassette's subpart rendering requires per-lane assets that do not currently exist. This is an architecture + asset-authoring dependency.

4. **Visual State Gap Detection**: The 120→66 reduction demonstrates that composite-only visual_states (without an svg fallback case) are the primary gap for this cluster.

## Recommendations

1. **Immediate**: Consider adding a schema validator that warns when an object has empty visual_states (like p10_gel_loading_tip_box originally).

2. **Short-term**: Investigate p200_micropipette state initialization in SDS-PAGE scenes; likely simple fix once root cause identified.

3. **Medium-term**: Implement gel_lane asset suite (3 SVG files) and integrate into gel_cassette's per-lane rendering.

4. **Long-term**: Document the stateless object pattern and consider a schema-level default that auto-generates a dummy state field if visual_states is non-empty.

## Summary

Round 3 eliminated 54 fallback instances (45%) through targeted visual_states fixes on 5 objects. Two objects remain deferred: one pending runtime investigation (p200_micropipette) and one pending asset authoring (gel_cassette). The core SDS-PAGE gel/electrode cluster has been substantially improved.
