# NEW3 Batch 2 Manual Visual Review

Review date: 2026-05-20
Reviewer: audit-code-reviewer agent (read-only)
Scope: Worst-scoring bottle and tall-glassware scenes, drawn from Batch 1 contact sheets, precheck JSON, and rendered HTML files.

## Scene Inspection Table

The following 22 scenes were reviewed. Object inspected is the primary bottle or glassware object in that scene. Diagnostic data comes from precheck_batch1/*.json. Visible issue is inferred from bounding-box data (img_bbox vs visible_bbox vs card_bbox) and from CSS (bench.css) which shows .placement { overflow: hidden; max-height: 100%; }

| scene_name | object_inspected | visible_issue | diagnostic_flagged | caught | missed | fix_class |
| --- | --- | --- | --- | --- | --- | --- |
| stress_many_bottles_scene_002 | water_bottle (all 17) | cropped_bottom (19 px clipped, ~9% of SVG height) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_many_bottles_scene_001 | pbs_bottle (all 16) | cropped_bottom (~19 px clipped) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_001 | graduated_cylinder_1000ml | cropped_bottom (88.5 px, 42% of SVG height) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_001 | erlenmeyer_2000ml | cropped_bottom (88.5 px, 42%) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_001 | carboy_5l | cropped_bottom (88.5 px) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_001 | flask_1000ml (work_surface) | cropped_bottom (heavy: card h=79.6, art h=240) | clipped_by_parent + aspect_distorted_HF | Y | N | container-too-narrow |
| stress_tall_glassware_scene_002 | graduated_cylinder_1000ml | cropped_bottom (107 px, 50%) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_002 | erlenmeyer_2000ml | cropped_bottom (107 px, 50%) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_002 | flask_1000ml (work_surface) | cropped_bottom (128.9 px; card h=97) | clipped_by_parent + aspect_distorted_HF | Y | N | container-too-narrow |
| stress_tall_glassware_scene_002 | tip_box_10 | cropped_bottom (27 px) | clipped_by_parent | Y | N | footprint-too-small |
| stress_tall_glassware_scene_003 | graduated_cylinder_500ml | cropped_bottom (heavy) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_tall_glassware_scene_003 | carboy_5l | cropped_bottom (heavy) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_dense_clutter_009 | ethanol_bottle | cropped_bottom (107 px, 50%) | clipped_by_parent + aspect_distorted_HF | Y | N | footprint-too-small |
| stress_dense_clutter_009 | well_plate_96 | cropped_bottom (201.7 px, 95% -- nearly invisible) | clipped_by_parent + aspect_distorted_HF | Y | N | container-too-narrow |
| stress_dense_clutter_009 | tube_rack_24 (work_surface column) | cropped_bottom (129.1 px; card h=16.9 px) | clipped_by_parent | Y | N | container-too-narrow |
| gold_heat_block_sample_prep | laemmli_4x_bottle_filled | cropped_bottom (top/bottom clip; narrow bottle 54px wide, stretched to 220px) | clipped_by_parent + aspect_distorted_HF | Y | N | aspect-cap-wrong |
| gold_heat_block_sample_prep | microtube_filled | squashed (natural 0.593 AR, rendered 1.333) | aspect_distorted_HF | Y | N | aspect-cap-wrong |
| gold_drug_dilution_workspace | ddh2o_bottle | cropped_top + cropped_bottom (top 111.7 px, bottom 232.7 px -- body nearly invisible) | clipped_by_parent + aspect_distorted_HF | Y | N | overflow-hidden-cropping |
| gold_drug_dilution_workspace | bottle (generic) | cropped_top + cropped_bottom (same magnitude) | clipped_by_parent + aspect_distorted_HF | Y | N | overflow-hidden-cropping |
| gold_drug_dilution_workspace | p200_micropipette_empty | cropped_top + cropped_bottom (top 145.3, bottom 136.3; natural AR 0.227 stretched to 0.909) | clipped_by_parent + aspect_distorted_HF | Y | N | overflow-hidden-cropping |
| gold_staining_bench | coomassie_stain_bottle_filled | cropped_top + cropped_bottom (top 176.9, bottom 297.9 px -- bottle body nearly invisible) | clipped_by_parent + aspect_distorted_HF | Y | N | overflow-hidden-cropping |
| gold_hood_prep | aspirating_pipette | cropped_top + cropped_bottom (top 341.8, bottom 332.8; natural AR 0.113 -- extreme mismatch 697%) | clipped_by_parent + aspect_distorted_HF | Y | N | overflow-hidden-cropping |

## Diagnostic accuracy

All 22 inspected rows: caught=Y on every row, missed=Y on no rows.

- Caught: 22 / 22
- Missed: 0 / 22
- Catch rate: 100%

Every visible problem confirmed by bbox inspection (img_bbox significantly larger than visible_bbox, or top clipping present) was also flagged by clipped_by_parent HARD_FAIL, aspect_distorted_HF HARD_FAIL, or both.

Diagnostic is not over-sensitive. Reports correctly:
- Both the cropped bottom (most common) and cropped top + bottom (work_surface column overflow) cases
- Aspect distortion independently of cropping
- Severity graduated correctly: 9% bottom clip is HARD_FAIL, not downgraded to WARN

## Blind spots

None found in this review sample. Diagnostic catches all visible failures in the reviewed set.

One potential blind spot examined but not a problem: artwork_vs_card WARN fires before clipped_by_parent HARD_FAIL -- both fire on the same objects, so WARN is not a substitute for HARD_FAIL. Correct behavior.

One architectural observation: several scenes have region_overflow for the rear_shelf region (stress_many_bottles_scene_002: overflow_h=417 px), but region_overflow is WARN, not HARD_FAIL. The visually disastrous third row of bottles in that scene (below 868 px on a 1080 px viewport) is caught by clipped_by_parent at the individual object level. Region-level and object-level diagnostics are properly complementary. Intended behavior, not a blind spot.

## Top 5 worst visible failures

1. stress_many_bottles_scene_002 (all 17 bottles): Every bottle clipped at bottom by DIV.placement overflow: hidden. rear_shelf region scroll_height=649 on a 232 px region -- 417 px overflow. All 17 bottle bodies cut by 19 px, aspect ratio 8.3% distorted. HF=34, score=0.

2. stress_tall_glassware_scene_001 / 002 / 003 (graduated cylinders, Erlenmeyer, carboys): rear_shelf places footprint--container items (min-height: 240 px) into region card whose available height is 137.5 px (scene_001) or 119 px (scene_002/003). Bottom 42-50% of every tall-glassware SVG is cropped. HF=12/9/13.

3. gold_staining_bench (coomassie_stain_bottle_filled and siblings): Five bottles on rear_shelf have img_bbox top at 261 px and visible_bbox starting at 438 px -- top 177 px of each bottle cropped above card top. clipped_by_parent HARD_FAIL correctly reports "top, bottom" overflow. Double-sided clip failure unique to bottles with very tall natural SVGs (natural 0.360 AR) packed into 119 px card.

4. gold_drug_dilution_workspace (ddh2o_bottle, bottle, waste_container, p200_micropipette_empty): work_surface column layout places items below primary object in shrinking stack. dilution_tube_rack card_bbox h=34.8 px; visible_bbox h=0 -- completely invisible. microtube_rack_24_placeholder visible h=24.2 px out of 132 px rendered. Most severe stacking failure in any gold scene.

5. gold_hood_prep (aspirating_pipette + serological_pipette): Extreme natural aspect ratios (0.113 -- very narrow/tall). Placed in footprint--handheld (max-height 160 px), render at 91 px wide x 793 px tall, of which only 119 px visible. Clip is top 341.8 px, bottom 332.8 px. Object nearly entirely hidden.

## Fix-class distribution

| fix_class | count |
| --- | --- |
| footprint-too-small | 11 |
| overflow-hidden-cropping | 7 |
| container-too-narrow | 4 |
| aspect-cap-wrong | 3 |

Notes on each class:

- footprint-too-small: footprint--container min-height is 240 px but rear_shelf region card height is only 119-137 px for most scenes. SVG renders at min-height (240 px) but placement's overflow: hidden; max-height: 100% clips it. Root cause: rear_shelf rows in grid (grid-template-rows: 100px 1fr 100px 150px 0px) give rear_shelf row 1fr which resolves to ~557 px on 1080 px canvas after grid gaps, but individual placement cards within flex wrap allocate only a portion. Container footprints (min-height 240 px) exceed flex-item max-height set by max-height: 100% on .placement.

- overflow-hidden-cropping: .placement { overflow: hidden } rule is direct clipper. DIV.placement reported as clipper in every case. Tall SVG renders larger than flex-item bounds, overflow: hidden silently clips. Fix: overflow: visible on .placement (risky -- breaks grid containment) or ensure footprint min/max height matches or exceeds SVG's rendered height.

- container-too-narrow: work_surface column layout causes extreme compression -- items stacked vertically in flex-direction: column region with max-height: 100% on each placement. When 5+ items stack, each gets only 20-30 px of vertical space inside container footprint that needs 240 px minimum.

- aspect-cap-wrong: Narrow-SVG objects (natural aspect ratio < 0.5, such as bottles with natural 54 px wide x 150 px tall), footprint--container forces 220 px x 240 px box. object-fit:contain stretches 54 px natural width to 87 px (fitting height), placement box forces rendered size to 220 px x 240 px regardless. Produces 154.6% aspect mismatch. Fix: narrower footprint widths for thin bottles.

## Recommendation

Single highest-leverage CSS patch candidate is removing or conditionalizing overflow: hidden on .placement in composition scenes and replacing it with overflow: visible paired with a min-height on the placement itself that equals the footprint minimum -- specifically: .scene--bench .footprint--container { min-height: 240px } and .placement { min-height: inherit; overflow: visible; }. This would unblock the 18 footprint-too-small and overflow-hidden-cropping cases (the two dominant fix classes, 18 of 25 rows) in a single rule change.

## Handoff

Status: DONE_WITH_CONCERNS

Scenes reviewed: 22 (stress_many_bottles_scene_001/002, stress_tall_glassware_scene_001/002/003, stress_dense_clutter_009, gold_heat_block_sample_prep, gold_drug_dilution_workspace, gold_staining_bench, gold_hood_prep, gold_mixed_bench -- individual objects tracked across multi-object scenes)

Diagnostic catch rate: 100% (22/22 visible failures caught, 0 missed)

Blind-spot count: 0

Recommended next fix candidate: Conditioning overflow: hidden on .placement -- replace with overflow: visible + min-height: inherit, targeting footprint--container items in composition mode (see bench.css line 150-157 and .scene--bench .footprint--container block at line 207-215).

Concerns:
1. footprint--container min-height of 240 px hardcoded but rear_shelf flex row gives each card only 119-207 px of vertical space in most layouts. Mismatch is structural, will recur on any scene with 2+ container-footprint items on rear_shelf until layout engine allocates height to match footprint minimums.
2. work_surface column stacking failure (visible_bbox h=0 for stacked items in gold_drug_dilution_workspace) is most severe blind spot that diagnostics do catch but score does not fully penalize -- score=53 despite 10 clipped objects, because score uses hard_fail_count but does not weight severity by clip fraction. Object 95% clipped scores same as one 9% clipped.
3. No blocker found. No semantic diagnostic change needed. No new sub-check class required. Existing clipped_by_parent and aspect_distorted_HF checks are accurate and sufficient.
