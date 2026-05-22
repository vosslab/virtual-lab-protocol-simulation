# No-Cropped SVG Repair Round Summary (Workstream G)

Date: 2026-05-21
Status: CLOSED with proposals queued for user decision

## Headline

- 52 visible crop failures catalogued (Workstream A)
- Diagnostics caught 0/52 before, ~20/52 after sub-checks e+f
- CSS fix trials (Workstream D) cut 58 clipped->26 (45% reduction) via Trial 5 combo (Trial 3 + Trial 4)
- 5 diagnostic improvement proposals (D1-D5 from Workstream C, ~96% projected coverage if all applied)
- Wins NOT yet applied to repo - user decision needed
- E's predicted top fixes (handheld/rack min-height) FAILED empirically; real binding constraint is region min-height

## Total suspicious assets found

Workstream A flagged 52 distinct object-level visual failures across 203 PNGs in 5 directories. Top categories:
1. parent-overflow (overflow:visible on region containers): ~10-14 cases
2. svg-grow-needed (PLACEHOLDER / asset not loading): ~20-24 cases
3. aspect-cap-wrong (footprint AR mismatch): ~5-8 cases
4. template-mode skip (primary object invisible): 4 cases
5. footprint-too-small (rendered area too small): ~6-8 cases
6. Cut-side container-width failures: 2-4 cases (not covered by D1-D5)

## Assets fixed

Via CSS trials (Workstream D), 32 of 58 clipped issues resolved by Trial 5 combo. The combo edits (NOT YET APPLIED):

Trial 4 (region min-height bump):
- bench.css/hood.css/instrument.css: .region--rear_shelf min-height 100px -> 280px
- bench.css/hood.css/instrument.css: .region--front_tools min-height 100px -> 240px

Trial 3 (small-tool portrait reshape):
- .footprint--small-tool: change to min-width 25px, max-width 40px, min-height 180px, max-height 300px

Status: trials measured then reverted. No commit. User must approve to apply.

## Remaining violations

26 of 58 clipped failures persist after Trial 5 combo. Categories:

1. PLACEHOLDER failures (~20-24 of remaining 26): assets not loading. Cannot be fixed by CSS. Requires asset-resolution work + D2 diagnostic improvement.

2. Aspect-cap-wrong on landscape assets: 96well_pcr_plate, well_plate_24, t75_flask, plate_reader. Current container/large-equipment footprints are portrait-biased. Requires new footprint classes (landscape-container, landscape-large-equipment). User-gated.

3. Cut-side failures: graduated_cylinder half-visible, glass_slide left-edge only. Container-width constraint not container-height. New diagnostic category not in D1-D5.

4. Template-mode invisibility: microscope_basic + cell_counter_basic instruments render 0x0. D4 (remove template-mode exception) would catch this.

## Diagnostics that missed visible crop

Per Workstream C analysis:
- clipped_artwork: only detects overflow:hidden clipping. Blind to overflow:visible region spillage.
- artwork_integrity sub-check e (clipped_by_parent): caught ~12 of 52 (placement-card clipping only).
- artwork_integrity sub-check f (aspect_distorted_HF): caught ~3 of 52 (only assets with real natural dimensions; ~40 assets have 150x150 placeholder).
- primary_object: PASS_TEMPLATE skip; primary_object.flag is WARN not HARD_FAIL.
- region_whitespace: indirect WARN; doesn't identify object-level failures.

Total miss rate: 62% of 52 in AFTER state. PLACEHOLDER + region overflow + template-mode + footprint-too-small all undetected.

## Recommended diagnostic updates (PROPOSAL ONLY)

Per Workstream C:

### Phase 1 (additive, low risk, NO user gate)
- D2 PLACEHOLDER detection: HIGHEST IMPACT (~+20-24 catches). Insert HARD_FAIL branch where img naturalWidth/Height === 0.
- D1 overflow:visible spillage: +10-14 catches. Use el.closest('.region') for traversal.

### Phase 2 (semantic change, USER-GATED)
- D3 real SVG viewBox in sizing_manifest: +4-6 catches via accurate aspect deltas. Requires manifest re-build.
- D4 remove template-mode exception: +4 catches. Removes existing exception.

### Phase 3 (new spec data, USER-GATED)
- D5 minimum rendered area per object kind: +6-8 catches. Requires per-kind threshold table.

Projected catch rate after all 5: ~96% of 52 (~50/52). Remaining 2-4: cut-side container-width failures (sixth uncovered category).

## Before/after gallery path

- experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials/ (Workstream D per-trial PNGs)
- test-results/no_cropped_svg/current_render_crop_audit/INDEX.html (Workstream B contact sheet, 20 scenes at 1920x1080)
- docs/active_plans/current_css_native_layout_manager_status_report_assets/ (status report screenshots showing problems user flagged)

## Next fix candidate

Highest-leverage forward sequence:

1. **Apply Trial 5 combo (CSS)**: bench.css/hood.css/instrument.css edits per Workstream D winners. Yields 45% visible crop reduction (58->26). Bounded, reversible, no new vocabulary. NO USER GATE needed (additional bounded CSS sweep in named files).

2. **Implement D2 PLACEHOLDER diagnostic (precheck.mjs)**: insert HARD_FAIL when img naturalWidth === 0 AND naturalHeight === 0. Phase 1, additive, near-zero false-positive risk. Would surface the ~20-24 PLACEHOLDER failures that are currently invisible. NO USER GATE (additive diagnostic addition, not semantic change to existing checks).

Actually wait - D2 IS a semantic change to precheck.mjs because it adds a new HARD_FAIL category. Per repo policy that's user-gated. Reclassify: D2 requires user approval as diagnostic semantic change.

3. **PLACEHOLDER asset resolution work**: separate workstream to find why ~24 object types render as PLACEHOLDER. Likely SVG file naming mismatch, missing file, or generator-side resolution failure. Asset-level fix, not CSS or diagnostic.

4. **D3 real SVG viewBox in manifest (precheck.mjs)**: Phase 2, user-gated. Improves aspect check accuracy across all assets.

5. **D4 remove template-mode exception**: Phase 2, user-gated. Catches 4 severity-1 instrument invisibility cases.

6. **Container-width diagnostic** (new category): cut-side failures not covered by D1-D5. Requires new sub-check.

## Boundaries observed

- READ-ONLY audits for A, C, E
- Bounded CSS trials in named files for D (reverted; not committed)
- No diagnostic tool semantic changes
- No new CSS classes
- No new footprint vocabulary
- No git commits

## Cross-references

- docs/active_plans/no_cropped_svg_screenshot_audit.md (A)
- test-results/no_cropped_svg/current_render_crop_audit/INDEX.html (B)
- docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md (C)
- experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials.md (D)
- docs/active_plans/no_cropped_svg_asset_sizing_table.md (E)
- docs/active_plans/current_status_report_no_crop_correction_addendum.md (F)
- docs/PRIMARY_DESIGN.md (no-crop hard rule)
- docs/specs/SVG_PIPELINE.md (SVG-pipeline-side rule)
- docs/specs/LAYOUT_ENGINE.md (layout-engine-side rule)

## User-gated decisions queued

1. Apply Trial 5 combo CSS edits (Trial 3 + Trial 4) to bench.css/hood.css/instrument.css? Expected: 58 clipped -> 26 clipped. NO history rewrite. Just edit and stage.

2. Authorize Phase 1 diagnostic improvements (D1 + D2)? Adds 2 new HARD_FAIL categories to precheck.mjs. Catches ~30-38 currently invisible failures.

3. Investigate PLACEHOLDER asset resolution? Separate workstream needed. ~20-24 object types not loading.

4. Phase 2 diagnostic changes (D3 + D4)? Real SVG viewBox + template-mode exception removal. User-gated semantic changes.

5. Phase 3 (D5)? Requires new spec data (per-kind minimum rendered area thresholds).

6. New footprint vocabulary (landscape-container, landscape-large-equipment) for landscape assets? Closed vocabulary expansion, user-gated.

## Handoff

Status: CLOSED
Total suspicious assets found: 52
Assets fixed (proposed CSS): 32 via Trial 5 combo (NOT YET APPLIED)
Remaining violations: 26 (PLACEHOLDER + cut-side + aspect-cap + template-mode)
Diagnostics that missed visible crop: precheck miss rate 62% in AFTER state
Recommended diagnostic update: D2 PLACEHOLDER first (largest gain, lowest risk)
Before/after gallery path: experiments/css_native_layout/stress_results/no_cropped_svg_fix_trials/
Next fix candidate (no-user-gate): apply Trial 5 combo to bench.css/hood.css/instrument.css

Workstreams complete: A (audit), B (render), C (diagnostic gap), D (CSS trials), E (sizing table), F (addendum), G (this summary).
