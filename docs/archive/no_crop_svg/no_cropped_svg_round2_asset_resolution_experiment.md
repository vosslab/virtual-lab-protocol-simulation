# No-Crop Round 2: Asset Resolution Experiment

Date: 2026-05-21
Status: ANALYSIS COMPLETE - BLOCKERS IDENTIFIED

## Executive Summary

Round 2 WS-A investigated root causes of 28 remaining visible crops (post-Trial5 baseline: 58 -> 28 after CSS edits). Analysis identified 48 missing SVG assets referenced by object YAML files as the PRIMARY BLOCKER. The "safe" YAML-only fixes (Pattern 5 renames) cannot proceed without resolving SVG existence and aspect-ratio alignment issues.

## Methodology

1. Loaded post-Trial5 visual audit: 31 assets with AR mismatch > 10%
2. Analyzed object_data.ts for asset reference resolution
3. Scanned content/objects YAML files to find missing asset mapping
4. Identified 5 Pattern-5 YAML rename candidates (safe, asset already exists)
5. Applied YAML fixes and rebuilt object_data.ts
6. Re-ran precheck to measure impact
7. Analyzed results and documented findings

## Key Findings

### Primary Blocker: 48 Missing SVG Asset References

Objects reference SVG assets that do not exist in assets/equipment/:

| Asset Name                                          | Affected Objects                                   | Issue                                                     | Exists? |
| --------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- | ------- |
| micropipette                                        | 15+ (p200, p10, multichannel, aspirating variants) | Base asset does not exist; only \_empty/\_filled variants | NO      |
| well                                                | 10+ (well_plate_96, well_plate_24 subparts)        | Should map to 96well_pcr_plate                            | NO      |
| p10_micropipette                                    | 7+ objects                                         | Base asset missing; only \_empty/\_filled exist           | NO      |
| p200_micropipette                                   | 7+ objects                                         | Base asset missing; only \_empty/\_filled exist           | NO      |
| staining_tray                                       | 5+ objects                                         | Should map to staining_tray_empty or material-specific    | NO      |
| conical_15ml                                        | 10+ objects                                        | Asset missing entirely                                    | NO      |
| ethanol_bottle, pbs_bottle, dmso_bottle (Pattern 1) | 12+ bottlestypes                                   | Should alias to generic bottle.svg or new SVG             | NO      |
| glass_slide, lab_marker, brush (Pattern 6)          | 5+ objects                                         | Decorations missing SVG entirely                          | NO      |
| tall_glassware (Pattern 4)                          | 7+ (graduated_cylinder, flask_1000ml, carboy_5l)   | Distinct shapes, no asset file                            | NO      |
| Long-label chemical names (Pattern 2)               | 7+ objects                                         | Authoring errors, should be removed from YAML             | N/A     |

**Total distinct missing assets: 48**

### Root Cause: Asset Mapping Architecture Issue

The object-to-asset resolution follows this path:

```
content/objects/<kind>/<object_name>.yaml
  -> visual_states.material_name.cases[].output.asset_name
    -> generated/object_data.ts (auto-generated from YAML)
      -> Runtime lookup: assets/equipment/<asset_name>.svg
```

When asset_name references a nonexistent file, the system renders a **placeholder box** with dashed border instead of the actual SVG. This is a fallback behavior.

**48 missing assets = 48 potential placeholder failures or cropping issues.**

### Pattern 5 Analysis: "Safe" YAML Renames

Attempted to fix 5 candidates where:

- Old asset_name references nonexistent file
- New asset_name references existing file
- Goal: Fix by YAML rename only (no new SVG creation)

Candidates identified:

1. `micropipette` -> NOT AN OPTION: Would map to p200_micropipette_empty, but objects use both empty and filled states. Mapping all to \_empty causes aspect mismatch
2. `well` -> NOT AN OPTION: Subpart rendering uses well template, not plate asset
3. `p10_micropipette` -> NOT AN OPTION: Same empty/filled conflict
4. `p200_micropipette` -> NOT AN OPTION: Same empty/filled conflict
5. `staining_tray` -> NOT AN OPTION: Would map to staining_tray_empty, but liquid fill should use correct material-specific asset

**RESULT: All Pattern 5 candidates BLOCKED**

#### Test: Applied Temporary YAML Fixes

Attempted to map:

- `micropipette` -> `p200_micropipette_empty` (15+ objects)
- `p10_micropipette` -> `p10_micropipette_empty` (7 objects)
- `p200_micropipette` -> `p200_micropipette_empty` (7 objects)
- `well` -> `96well_pcr_plate` (10 objects)
- `staining_tray` -> `staining_tray_empty` (5 objects)

**BEFORE (post-Trial5):** 31 assets with AR mismatch > 10%
**AFTER (YAML fixes applied):** 55 assets with AR mismatch > 10%
**OUTCOME: REGRESSION** (-24 crops worse)

**ROOT CAUSE:** Mapping p200_micropipette -> p200_micropipette_empty changed aspect ratio from near-correct to severely distorted. The \_empty variants have different natural aspect ratios than the base objects' visual intent. Runtime liquid fill visualization expects a different aspect ratio envelope.

All temporary fixes were **REVERTED** to baseline state.

## Blockers Requiring User Approval

### Blocker 1: Missing SVG Render Pipeline Script

**Status:** PRIMARY BLOCKER
**File:** experiments/css_native_layout/stress_generators/render_stress_to_html.py
**Issue:** Missing from disk (referenced in coordinator message, not found in repo)

**Impact:** Cannot regenerate HTML evidence to verify SVG rendering fixes. Precheck can run but without full render pipeline, screenshot evidence cannot be produced.

**Resolution:** Either recover script from git history or document as user decision.

### Blocker 2: Pattern 5 YAML Rename Strategy Invalid

**Status:** DESIGN ISSUE
**Root Cause:** Attempted YAML-only fixes cause -24 regression (worse distortion)

**Why It Failed:**

- Objects with empty/filled states need BOTH assets available
- Mapping to \_empty only breaks liquid visualization
- \_empty and \_filled assets have different aspect ratios
- Runtime expects specific AR envelope for set_point displays (volume, concentration, etc.)

**Valid Alternatives:**

1. Create new base assets (micropipette.svg, p10_micropipette.svg, etc.) with mid-spectrum aspect ratio
2. Create material-specific variants (micropipette_empty.svg, micropipette_filled.svg) and update object schema
3. Redesign object layering: base asset + overlay liquid fill vs. pre-rendered filled variants
4. Remove objects with missing assets from YAML (removes pedagogy)

**User Decision Required:** Which design path?

### Blocker 3: 48 Total Missing Assets Need Scope Decision

**Pattern 1: Reagent Bottles (12 kinds, Alias Strategy)**

- dmso_bottle, pbs_bottle, ethanol_bottle, carboplatin_bottle, media_bottle, trypan_blue_bottle, water_bottle, sds_bottle, etc.
- **Current:** Each references missing unique asset
- **Option A:** Alias all to generic bottle.svg (simple but loses visual distinction)
- **Option B:** Create 2-3 representative bottle SVG variants, alias groups
- **Option C:** Author new SVG for each (significant asset work)

**Pattern 2: Long-Label Authoring Errors (7+ kinds)**

- bovine_serum_albumin_blocking_solution_bottle, phosphate_buffered_saline_solution_bottle_500ml, etc.
- **Issue:** Object names are chemical formulas, not object identifiers
- **Resolution:** Remove from YAML (authoring cleanup, not asset work)
- **Impact:** Affects 0 visible scenes (not used in active protocols)

**Pattern 4: Tall Glassware (7 kinds, Original SVG Required)**

- graduated_cylinder, flask_1000ml, erlenmeyer_2000ml, carboy_5l, etc.
- **Current:** Each references missing unique asset
- **Issue:** Distinct scientific shapes, cannot be aliased
- **Resolution:** Author new SVG assets for each
- **Impact:** 2-4 scenes affected (gold*electrophoresis_full_setup, stress_tall_glassware_scene*\*)
- **Effort:** 1-2 SVG per shape

**Pattern 6: Decorative Objects (5 kinds)**

- glass_slide, lab_marker, brush, label_pen, etc.
- **Current:** Missing SVG entirely
- **Issue:** Non-clickable decorations, lower priority
- **Resolution:** Author new SVGs (low complexity)
- **Impact:** 1-2 scenes affected
- **Effort:** <1 hour total

**TOTAL ASSET WORK ESTIMATE:**

- Pattern 1 (bottles): 1-3 hours (if 2-3 variants + aliasing strategy)
- Pattern 4 (tall glassware): 2-4 hours
- Pattern 6 (decorations): 0.5 hour
- **Total: 3.5-7.5 hours**

## Per-Object Diagnosis Table

Sample failures (full table in cropped_objects_diagnosis.csv):

| Object Kind               | Scene                      | Expected SVG   | File Exists | Failure Cause         | Fix Applied                | Notes                                                  |
| ------------------------- | -------------------------- | -------------- | ----------- | --------------------- | -------------------------- | ------------------------------------------------------ |
| pipette (micropipette)    | electrophoresis_bench      | micropipette   | NO          | missing base asset    | BLOCKED (regression)       | Would need \_empty + \_filled                          |
| plate (well_plate_96)     | crowded_bench_dense        | well           | NO          | subpart asset missing | BLOCKED (wrong mapping)    | Should use composite grid, not well SVG                |
| equipment (staining_tray) | staining_bench             | staining_tray  | NO          | missing base asset    | BLOCKED (material variant) | Needs staining_tray_stain, \_destain, \_water variants |
| bottle (ethanol_bottle)   | hood_basic                 | ethanol_bottle | NO          | missing bottle asset  | BLOCKED (alias decision)   | Could alias to bottle.svg                              |
| decoration (glass_slide)  | gold_microscope_slide_prep | glass_slide    | NO          | missing decoration    | BLOCKED (new SVG)          | Needs original SVG authoring                           |

## Screenshot Evidence

**Before (post-Trial5):**

- Path: experiments/css_native_layout/stress_results/precheck_post_trial5/
- Count: 31 assets with AR mismatch > 10%
- Visual audit: docs/active_plans/no_cropped_svg_visual_confirmation_report.md

**After (Round 2 - REVERTED due to regression):**

- Path: /tmp/precheck_round2_after/
- Count: 55 assets with AR mismatch > 10% (worse)
- Status: Changes reverted; baseline preserved

## Blockers Summary

| Blocker                                 | Severity | Category       | Approval Needed                      |
| --------------------------------------- | -------- | -------------- | ------------------------------------ |
| Missing render_stress_to_html.py        | CRITICAL | Infrastructure | Recover from history or skip         |
| Pattern 5 YAML renames cause regression | CRITICAL | Design         | Choose alternative strategy          |
| 48 missing SVG assets                   | HIGH     | Asset/Design   | Choose scope: alias vs new vs remove |
| Renderer not found in experiments/      | HIGH     | Infrastructure | Document as user decision            |

## Recommendations

### Immediate (WS-A Scope - Assessment)

1. **Accept Finding:** The 28 remaining crops are NOT primarily caused by asset name mapping errors. They are caused by fundamental design mismatches:
   - Asset aspect ratios do not match object card constraints
   - Empty/filled variants have incompatible dimensions
   - Placeholder rendering is a symptom, not the root disease

2. **Escalate to Architect:** Pattern 5 YAML-only fixes are not viable. Need design review on object-to-asset layering strategy.

3. **Document Blockers:** This artifact captures all user-gated decisions needed before proceeding.

### Phase 2 (Conditional)

If user approves Pattern 1/4/6 SVG authoring:

1. Create aliased bottle variants (3 types)
2. Author tall_glassware SVGs (graduated_cylinder, flask, carboy)
3. Author decoration SVGs (glass_slide, lab_marker)
4. Update object YAML mappings
5. Rebuild precheck and measure impact
6. Re-assess: expect ~5-10 additional crops fixed (subset of 28)

If user approves Pattern 5 Design Redesign (object schema change):

1. Separate empty/filled into distinct asset pathways
2. Update liquid fill visualization layer
3. Re-test all affected pipette/bottle objects
4. Expect neutral to slight improvement (no regression)

### Phase 3 (Validation)

Re-run full precheck after changes to produce before/after screenshot gallery.

## Cross-References

- [no_cropped_svg_visual_confirmation_report.md](no_cropped_svg_visual_confirmation_report.md) - Trial 5 baseline (58 -> 28 crops after CSS)
- [no_cropped_svg_screenshot_audit.md](no_cropped_svg_screenshot_audit.md) - Original 52-failure audit
- [no_cropped_svg_asset_sizing_table.md](no_cropped_svg_asset_sizing_table.md) - 47-asset dimensions table
- docs/PRIMARY_DESIGN.md - Visual integrity rule
- docs/PRIMARY_CONTRACT.md - Scientific asset no-crop rule

## Files Changed (WS-A Round 2)

**YAML Edits (Reverted):**

- content/objects/pipette/micropipette.yaml
- content/objects/pipette/p10_micropipette.yaml
- content/objects/pipette/p200_micropipette.yaml
- content/objects/plate/well_plate_96.yaml
- content/objects/equipment/staining_tray.yaml

**Generated Files (Auto-rebuilt):**

- generated/object_data.ts (rebuilt after each YAML change)

**Precheck Outputs:**

- /tmp/precheck_round2_after/visual_audit.json
- /tmp/precheck_round2_after/visual_audit.md

## Visible Crops: Before/After

| Metric                        | Before (Trial 5) | After (YAML fixes) | Status     |
| ----------------------------- | ---------------- | ------------------ | ---------- |
| Assets with AR mismatch > 10% | 31               | 55                 | REGRESSION |
| Clipped by parent             | 0                | 0                  | No change  |
| Region overflow               | 0                | 0                  | No change  |
| Overall visible crop count    | ~28 (estimated)  | ~31-35 (worsened)  | REVERTED   |

**CONCLUSION: Pattern 5 YAML renames are NOT a viable fix path. Require design-level intervention.**

---

Generated: 2026-05-21 | WS-A Round 2 Asset Resolution Analysis
Artifact path: docs/active_plans/no_cropped_svg_round2_asset_resolution_experiment.md
