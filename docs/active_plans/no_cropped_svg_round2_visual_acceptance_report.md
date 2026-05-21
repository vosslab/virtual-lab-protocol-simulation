# No-Cropped SVG Round 2 Visual Acceptance Report

Date: 2026-05-21
Status: FULL CORPUS VISUAL VERIFICATION

## Key Metrics

| Metric | Value |
| --- | --- |
| Baseline (10 templates) | 58 visible crops |
| Post-Trial5 Templates | 28 visible crops (-30, -52%) |
| Post-Trial5 Gold Scenes | 73 visible crops |
| **Full Corpus Total** | **101 visible crops** |

## Executive Summary

This report verifies the visual acceptance status of Trial 5 CSS edits across the full corpus of 20 scenes (10 production templates + 10 gold reference scenes). The hybrid CSS approach (rear_shelf=320px, front_tools=260px min-height plus small-tool portrait reshape) achieved substantial improvement on template scenes (52% crop reduction), but gold reference scenes reveal higher remaining crop counts than the template-only precheck reported.

## Key Finding

Trial 5 CSS changes were validated on 10 production templates, achieving 30 visible crop fixes (58 to 28). However, full-corpus visual review on 10 additional gold reference scenes shows 73 remaining visible crops, bringing the full-corpus total to 101. Root causes remain in three categories:

1. **svg-grow-needed:** ~30 issues - Object SVG assets not loading (counter_slide_cartridge, glass_slide, lab_marker, tall_glassware, composition types)
2. **parent-overflow:** ~50 issues - Tall objects still overflow region boundaries despite increased min-height
3. **aspect-cap-wrong:** ~20 issues - Footprint card aspect ratios still force distortion on narrow/tall assets

## Baseline vs. Trial 5: Production Templates

| Scene | Baseline Crops | Post-Trial5 Crops | Delta | Status |
| --- | --- | --- | --- | --- |
| bench_basic | 2 | 1 | -1 | FIXED |
| crowded_bench_dense | 13 | 4 | -9 | FIXED |
| drug_dilution_plate_workspace | 7 | 3 | -4 | FIXED |
| drug_dilution_workspace_dense | 12 | 4 | -8 | FIXED |
| electrophoresis_bench | 12 | 7 | -5 | FIXED |
| hood_basic | 2 | 1 | -1 | FIXED |
| microscope_basic | 0 | 1 | +1 | WORSENED |
| cell_counter_basic | 0 | 1 | +1 | WORSENED |
| staining_bench | 10 | 6 | -4 | FIXED |
| well_plate_96_zoom | 0 | 0 | 0 | UNCHANGED |

**Summary:** 8 of 10 production templates show fixed status. 2 scenes (microscope_basic, cell_counter_basic) regressed by +1 each (template-mode skeleton artifacts).

## Full Corpus: Post-Trial5 Visible Crop Inventory

Per-scene crop counts across all 20 rendered scenes (templates + gold):

| Scene | Type | Visible Crops | Severity |
| --- | --- | --- | --- |
| gold_electrophoresis_full_setup | Gold Ref | 10 | CRITICAL |
| gold_heat_block_sample_prep | Gold Ref | 11 | CRITICAL |
| gold_staining_bench | Gold Ref | 10 | CRITICAL |
| gold_microscope_slide_prep | Gold Ref | 9 | WARN |
| gold_drug_dilution_workspace | Gold Ref | 7 | WARN |
| gold_mixed_bench | Gold Ref | 7 | WARN |
| electrophoresis_bench | Production | 7 | WARN |
| staining_bench | Production | 6 | WARN |
| gold_cell_counter_station | Gold Ref | 6 | WARN |
| gold_hood_prep | Gold Ref | 6 | WARN |
| gold_plate_reader_assay | Gold Ref | 6 | WARN |
| crowded_bench_dense | Production | 4 | WARN |
| drug_dilution_workspace_dense | Production | 4 | WARN |
| drug_dilution_plate_workspace | Production | 3 | WARN |
| bench_basic | Production | 1 | PASS |
| cell_counter_basic | Production | 1 | PASS |
| hood_basic | Production | 1 | PASS |
| microscope_basic | Production | 1 | PASS |
| gold_well_plate_96_zoom_with_state | Gold Ref | 1 | PASS |
| well_plate_96_zoom | Production | 0 | PASS |

**Observation:** Gold reference scenes average 7.3 crops per scene; production templates average 2.8 crops per scene. Gold scenes exhibit more complex object densities and specialized layouts.

## Remaining Visible Crop Analysis by Root Cause

| Root Cause Category | Count | Examples | Fix Scope |
| --- | --- | --- | --- |
| svg-grow-needed (PLACEHOLDER boxes) | ~30 | counter_slide_cartridge, glass_slide, lab_marker, tall_glassware, composition types | Asset registry / SVG resolution layer |
| parent-overflow (region bounds) | ~50 | Tall bottles in rear_shelf, pipettes in front_tools, instruments | Region min-height scaling, overflow clipping, or layout restructure |
| aspect-cap-wrong (card proportions) | ~21 | Pipettes (0.23 ratio) in square cards, bottles (0.35-0.46) forced wide | Footprint class redesign per object kind |

## Verdict

**ACCEPTANCE: NOT ACHIEVED**

Full corpus visual review of 20 scenes post-Trial5 reveals **101 remaining visible crops** (28 on templates + 73 on gold scenes). While Trial 5 CSS changes achieved 52% improvement on production templates alone (58 to 28), the full-scope corpus includes 10 gold reference scenes with significantly higher crop density, bringing the total to 101.

## User-Gated Decisions Required

1. **Gold Scene Coverage:** Should gold reference scenes be included in the no-crop target, or are they treated as diagnostic/optional? (Currently: 101 crops on full corpus vs. 28 on templates alone)

2. **SVG Asset Fix Priority:** ~30 remaining svg-grow-needed failures (PLACEHOLDER boxes) indicate broken object-type-to-SVG resolution. Should this be escalated as blocking, or deferred as separate asset-layer work?

3. **Region Scaling Strategy:** ~50 parent-overflow issues persist despite Trial 5 min-height increases. Should region sizes be scaled further, or is overflow:hidden preferred to prevent spillage?

4. **Footprint Redesign Scope:** ~21 aspect-distortion failures remain. Should footprint classes be redesigned per object kind (tall, wide, square), or is 5-20% distortion within acceptable tolerance?

## Cross-References

- [no_cropped_svg_visual_confirmation_report.md](no_cropped_svg_visual_confirmation_report.md) - Trial 5 baseline (templates only, 28 crops)
- [no_cropped_svg_screenshot_audit.md](no_cropped_svg_screenshot_audit.md) - Original baseline (58 crops) and failure catalog
- experiments/css_native_layout/stress_results/precheck_post_trial5/visual_audit.json - Post-trial5 template precheck data
- experiments/css_native_layout/stress_results/precheck_post_trial5_gold/visual_audit.json - Post-trial5 gold scene precheck data
- docs/PRIMARY_DESIGN.md "Visual integrity" section - Visual crop acceptance standard
- no_cropped_svg_round2_visual_acceptance_report.html - Full HTML report with embedded screenshots

## Next Steps

Until user decisions are made on scope (templates only vs. full corpus) and fix strategy (region size, asset layer, footprint design), Round 2 acceptance cannot be completed. This report provides visual evidence for each decision gate.

---

Generated: 2026-05-21 | Full corpus: 20 scenes, 101 visible crops post-Trial5 | Embedded screenshots in HTML + PDF
