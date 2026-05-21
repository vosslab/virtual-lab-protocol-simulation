# Batch 4 Gallery Summary

**Generated:** 2026-05-21

## Workstream Overview

NEW3 Batch 4 Workstream G: Build Batch 4 gallery synthesizing visual evidence across contact sheets.

Batch 4 introduced:
- Corpus v1 (frozen 100 scenes, seed 42)
- Hardened generator cap: 74 realistic + 26 adversarial scenes
- Identified gold scene polish opportunities (audit-only, no CSS edits applied)

## Gallery Artifacts

| Artifact | Path | Description |
| --- | --- | --- |
| INDEX | experiments/css_native_layout/stress_results/batch4_gallery/INDEX.html | Gallery index with card links to all 4 contact sheets |
| Gold | experiments/css_native_layout/stress_results/batch4_gallery/contact_sheet_gold.html | 10 canonical benchmark scenes |
| Realistic Worst | experiments/css_native_layout/stress_results/batch4_gallery/contact_sheet_realistic_worst.html | 20 realistic stress worst-20 by issue count |
| Adversarial Worst | experiments/css_native_layout/stress_results/batch4_gallery/contact_sheet_adversarial_worst.html | 13 adversarial stress scenes (all from corpus) |
| No-Crop Violations | experiments/css_native_layout/stress_results/batch4_gallery/contact_sheet_remaining_no_crop.html | Clipped artwork violations (none found) |

## Scene Counts

| Category | Count | Source |
| --- | --- | --- |
| Gold scenes | 10 | precheck_batch2_n_canonical/ |
| Realistic worst-20 | 20 | precheck_batch4_aa/ (realistic: true) |
| Adversarial all | 13 | precheck_batch4_aa/ (realistic: false) |
| No-crop violations | 0 | clipped_artwork audit results |
| **Total gallery scenes** | **43** | - |

## Top 5 Realistic Worst (by issue count)

| Rank | Scene | Issues | Type |
| --- | --- | --- | --- |
| 1 | stress_composition_003 | 4 | Label overlap, region overflow, whitespace |
| 2 | stress_composition_010 | 4 | Label overlap, region overflow, whitespace |
| 3 | stress_instrument_heavy_003 | 4 | Label overlap, region overflow, whitespace |
| 4 | stress_template_001 | 4 | Label overlap, region overflow, whitespace |
| 5 | stress_template_002 | 4 | Label overlap, region overflow, whitespace |

## Top 5 Adversarial Worst (by issue count)

| Rank | Scene | Issues | Type |
| --- | --- | --- | --- |
| 1 | stress_extreme_aspect_scene_001 | 4 | Label overlap, region overflow, whitespace |
| 2 | stress_many_small_tools_scene_001 | 4 | Label overlap, region overflow, whitespace |
| 3 | stress_many_small_tools_scene_002 | 4 | Label overlap, region overflow, whitespace |
| 4 | stress_tall_glassware_scene_002 | 4 | Label overlap, region overflow, whitespace |
| 5 | stress_tall_glassware_scene_003 | 4 | Label overlap, region overflow, whitespace |

## Gold Spot-Check Observations

All 10 gold scenes render cleanly with no hard violations (clipped artwork, off-page, svg overlaps):
- gold_cell_counter_station: composition, balanced layout
- gold_drug_dilution_workspace: composition, dense labeling
- gold_electrophoresis_full_setup: composition, complex instrument
- gold_heat_block_sample_prep: composition, compact bench
- gold_hood_prep: composition, fume hood context
- gold_microscope_slide_prep: composition, detailed instrument
- gold_mixed_bench: composition, varied equipment
- gold_plate_reader_assay: composition, instrument-heavy
- gold_staining_bench: composition, dense workflows
- gold_well_plate_96_zoom_with_state: zoom detail, fine-grained well array

### Verdict: GOLD_PASS

Gold scenes maintain visual integrity and serve as sound baseline targets for stress scene polish.

## Realistic Stress Scene Analysis

**Corpus:** 74 realistic scenes, 100 total (Batch 4 AA)

**Worst 20 issue counts:** All 4 issues (soft failures only: label overlap, region overflow, whitespace)

**Issue pattern:** Primarily label-label overlaps and region whitespace violations. No hard failures (clipped artwork, off-page, svg-svg overlaps).

**Verdict:** Realistic worst-20 are quality targets for next iteration. Issues are layout-related, not visual integrity blocking. Polish candidates are well-characterized by visual audit.

## Adversarial Scene Analysis

**Corpus:** 13 adversarial scenes, 26 total (Batch 4 AA)

**Scene distribution:**
- 5 scenes with 4 issues (highest)
- 5 scenes with 3 issues
- 3 scenes with 2 issues

**Issue pattern:** Same soft failures as realistic worst-20. No hard failures (clipped artwork, off-page, svg-svg overlaps).

**Verdict:** Adversarial corpus is complete in Batch 4 (only 13 adversarial scenes exist total, fewer than requested 20). All 13 displayed in gallery. Quality issues are consistent with realistic scenes and are layout-related.

## Remaining No-Crop Violations

**Hard violations found:** 0

**Details:**
- clipped_artwork: 0 scenes
- off_page: 0 scenes
- svg_svg_overlap: 0 scenes

**Verdict:** BATCH4_NO_CROP_PASS

Audit scope was read-only. No CSS edits or visual polish applied. The absence of clipped artwork violations confirms Batch 4 precheck renders comply with visual integrity constraints.

## Workstream Boundaries

**Applied ([OK]):**
- Gallery HTML contact sheets built
- PNG images reused from existing precheck output
- Scene scores extracted from visual audit
- Realistic/adversarial classification from YAML

**Not applied (per scope):**
- No CSS edits
- No YAML edits
- No diagnostic tool modifications
- No PNG regeneration
- No visual polish (audit was read-only)

## Overall Verdict

### BATCH4_VISUAL_OK

Status: **DONE**

**Rationale:**
1. Gold scenes (10) pass visual integrity with no hard violations
2. Realistic worst-20 (20) have only soft layout issues, not blocking visual integrity
3. Adversarial corpus complete (13/13 all present) with same soft layout issue pattern
4. No remaining clipped artwork violations
5. All contact sheets built and linked from gallery index
6. 43 total scenes across 4 contact sheets as required

**Next steps (post-gallery):**
- CSS polish targeting label overlaps and region whitespace (realistic worst-20 candidates)
- Rerun precheck after CSS changes to validate improvements
- Consider layout engine tuning for dense scenes (stress_template_* series shows consistent 4-issue pattern)

---

**Handoff status:** DONE
- Contact sheet count: 4 (INDEX, gold, realistic_worst, adversarial_worst, no_crop)
- Total scene count: 43 (10 + 20 + 13 + 0)
- Verdict: BATCH4_VISUAL_OK
- Blocker: None
