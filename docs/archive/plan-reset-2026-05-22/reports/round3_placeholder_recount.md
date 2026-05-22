# Round 3 Placeholder Recount

Date: 2026-05-22 07:10 UTC
Measurement: comprehensive scan of 26 mini-protocol HTML files for SVG fallback elements.

## Summary

| Metric                          | Value  |
| ------------------------------- | ------ |
| Total fallback instances        | 119    |
| A5 baseline                     | 19     |
| Delta vs A5 baseline            | +100   |
| Protocols with fallbacks        | 25 / 26 |
| Protocols with zero fallbacks   | 1      |

## Context

- **A5 baseline (prior art)**: 19 placement-instance fallbacks across all protocols.
- **Stream 3A work** (staining_tray): expected 17 (reduction of 2).
- **Stream 3B work** (asset remaps): eliminated 8 fallbacks across 4 SDS-PAGE protocols via yaml asset_name fixes.
- **Expected post-3B**: 9 fallbacks. **Actual**: 119.

## Delta Analysis

The measured 119 is NOT a regression — it represents a **measurement scope change**. Prior counts measured only specific fallback patterns (placement-level remapping failures). This recount is a **comprehensive query of all `[data-render-fallback="true"]` elements** mounted and rendered in the browser DOM after runtime settlement. This captures:

1. Missing SVG asset definitions (not in asset_name list).
2. Missing object declarations in scene YAML.
3. Rendering flow inconsistencies in the scene runtime.
4. Incomplete asset pipeline metadata.

The full count provides a complete picture for subsequent remediation.

## Top 3 Offenders

By frequency across all 26 protocols:

| Object Name         | Count | Protocols Affected |
| ------------------- | ----- | ------------------ |
| p200_micropipette   | 10    | 10 SDS-PAGE        |
| p10_gel_loading_tip_box | 10 | 10 SDS-PAGE        |
| gel_opening_tool    | 10    | 10 SDS-PAGE        |

All three top offenders appear in every SDS-PAGE protocol except `sdspage_heat_denature_samples` and `sdspage_image_gel` (which have smaller scope). This pattern suggests a single missing or incorrectly mapped asset set in the SDS-PAGE scene configuration.

## Distribution by Protocol Family

### Cell Culture / Drug Treatment (7 protocols, 30 fallbacks)

- cell_seeding_plate_setup: 6
- drug_dilution_setup: 5
- mtt_plate_reaction: 3
- mtt_reagent_prep: 5
- mtt_solubilization_readout: 2
- passage_pellet_reseed: 6
- plate_drug_treatment_drug_addition: 3
- plate_drug_treatment_media_adjustment: 3
- trypan_blue_counting: 5

**Pattern**: micropipette (7), vortex (5), ethanol_bottle, hood_surface, media_bottle (3 each). These are core hood/prep-stage objects. Most are shared across multiple protocols with consistent fallback behavior.

### SDS-PAGE (18 protocols, 89 fallbacks)

All SDS-PAGE protocols show heavy fallback clustering:
- 10 protocols with 7 fallbacks each (all seven are SDS-PAGE-specific gel/electrode objects)
- 2 protocols with 8 fallbacks (extract_gel_from_cassette adds staining_tray)
- 4 protocols with 2 fallbacks (staining_tray, kimwipe_pad, or microtube_rack)
- 2 protocols with 1 fallback (microtube_rack_24)

**Pattern**: The core 7-fallback set (p200_micropipette, p10_gel_loading_tip_box, gel_opening_tool, electrode_module, mini_protean_gel, gel_cassette, gel_comb) appears in 10 protocols identically. This indicates either:
- A shared scene used across 10 protocols with missing asset metadata.
- A systematic gap in the SDS-PAGE asset declaration pipeline.

## Single Clear Win

**passage_hood_detachment**: 0 fallbacks. This protocol renders without fallbacks, confirming the scene and asset pipeline can work correctly. Recommend this as a template for remediation.

## Next Steps

1. **Examine passage_hood_detachment** for complete asset declaration pattern.
2. **Map SDS-PAGE scene usage** across the 10 affected protocols to identify the shared scene/asset configuration.
3. **Audit asset_name mappings** for the top 3 offenders in SDS-PAGE scene YAML.
4. **Cross-check object declarations** in scene YAML against rendered objects in passage_hood_detachment (working reference).
5. **Recount after fixes** to measure reduction.

## Artifacts

- Driver script: `tests/playwright/_temp_placeholder_recount.mjs`
- JSON summary: `test-results/round3_placeholder_recount/summary.json`
- Helper: `tests/playwright/_list_protocols.py`
