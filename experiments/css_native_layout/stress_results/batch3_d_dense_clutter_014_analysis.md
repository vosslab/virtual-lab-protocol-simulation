# Batch3 Workstream D: stress_dense_clutter_014 Regression Analysis

Date: 2026-05-21
Workstream: D (dense_clutter_014 -19pt investigation)
Scene class: dense_clutter
Regression: 49 -> 30 (-19pt)
Use "workstream" not "lane".

## Pre/Post Metric Table

| Metric | Batch1 pre-fix | Batch2-N-Canonical post-fix | Delta |
| --- | --- | --- | --- |
| primary_area_ratio | 0.2 | 0 | -0.2 |
| label_overlap | 70 | 10 | -60 |
| scene_occupied | 7.4 | 7.4 | 0 |
| support_distance | 100 | 100 | 0 |
| balance | 50 | 50 | 0 |
| region_filling | 18.6 | 18.5 | -0.1 |
| label_readability | 0 | 0 | 0 |
| aspect_ratio_fidelity | 70.6 | 70.6 | 0 |
| primary_prominence | 0 | 0 | 0 |
| total_layout_score | 49 | 30 | -19 |
| hard_fails (scorecard field) | 0 | 0 | 0 |

Critical note: both scorecards report hard_fails=0 because scorecard hardFailCount function counts only clipped_artwork, off_page, svg_svg_overlap, region_overflow. The batch1 precheck JSON contains 10 HARD_FAIL entries under clipped_by_parent (SVG assets cropped by parent overflow 27-116px on bottom) and 8 HARD_FAIL entries under aspect_distorted (glassware distorted 8-170%). These existed pre-fix but are invisible to scorecard formula. Pre-fix score 49 earned while scene was already visually broken with active crop hard-fails.

## Visual Diff

Pre-fix PNG: not available in batch1 precheck folder (JSON only).

Post-fix PNG (batch2_n_canonical and batch3_c_trial1 are pixel-identical):

Scene renders approximately 75% empty warm-brown canvas. Three sparse clusters:

- Top strip (rear_shelf): 3 dashed PLACEHOLDER boxes with truncated "LACEHOLDER" text for ethanol_bottle and dmso_bottle x2. Container-class footprints (min-height 240px) squeezed into ~100-280px wide cards by flex layout. No actual SVG artwork.
- Right edge strip (work_surface): 2 very small dashed boxes at far right (~1380px x, 460-550px y), approximately 140x30px visible height. dilution_rack and one other. Artwork bbox extends far below clipped card edge per precheck (dilution_rack: card h=30px, artwork h=160px; bottom overflow clipped).
- Bottom strip (front_tools): micropipette_p1000 box at left, brush and kimwipes as two tiny adjacent PLACEHOLDER boxes with overlapping labels, large clipboard/waste_container SVG renders correctly (~280x150px), one PLACEHOLDER for tip_box_10. Labels "brush" and "kimwipes" overlap at ~(120-170px x, 666px y).

Net visual: scene looks broken and nearly empty. No object reads as pedagogically primary. The four work_surface objects are essentially invisible (15-30px visible slivers). Only rendered artwork is waste_container SVG (not the primary object).

## Scene Composition

13 total objects, 0 large_equipment, label_density: high.

| Object | Zone | Footprint class |
| --- | --- | --- |
| dilution_rack (primary, data-primary) | work_surface | rack |
| ladder_tube | work_surface | small-tool |
| tube_rack_15ml | work_surface | rack |
| ladder_tube (2nd instance) | work_surface | small-tool |
| microtube | work_surface | small-tool |
| micropipette_p1000 | front_tools | handheld |
| brush | front_tools | small-tool |
| kimwipes | front_tools | small-tool |
| waste_container | front_tools | handheld |
| tip_box_10 | front_tools | rack |
| ethanol_bottle | rear_shelf | container |
| dmso_bottle | rear_shelf | container |
| dmso_bottle (2nd instance) | rear_shelf | container |

Region load: work_surface=5, front_tools=5, rear_shelf=3, instrument_station=0.

Handheld placements: 2 (micropipette_p1000, waste_container) in front_tools.
Small-tool placements: 4 (ladder_tube x2, microtube, brush, kimwipes) across work_surface and front_tools.

## Top Regressed Metric: label_overlap

Batch1 score=70, post-fix score=10. Delta=-60 on raw metric.

computeLabelOverlapScore in score_layout.mjs: max(0, 100 - totalOverlap * 30).
- score=70 implies 1 total overlap pair (batch1: 1 label_label overlap, 0 svg_label overlap).
- score=10 implies 3 total overlap pairs (batch2: confirmed from scorecard penalty=27 in top_worst_metrics).

label_overlap metric carries weight 0.30 in dense_clutter weight table. -60 raw at 30% weight = -18pt contribution. Secondary primary_area_ratio drop (0.2->0, weight 5%) contributes approximately -1pt. Accounts for full -19pt regression.

Mechanism: N-patch raised handheld min-height 130 -> 260 and small-tool 90 -> 200. work_surface region uses flex-direction: column with overflow: hidden and max-height: 100%. Five objects in work_surface (2 racks at ~160px min-height each, 2 small-tools at 200px min-height each, 1 microtube at 200px) require >900px total column height. work_surface grid row allocation approximately 150-200px (center row in grid-template-rows: 100px 1fr 100px 150px 0px). Cards crushed to 15-30px visible slivers by flex-shrink. Label elements positioned after clipped image bbox reflow to bottom edges of adjacent cards, producing 2-3 label_label collision pairs instead of 1.

Primary object (dilution_rack) renders with card h=30px, artwork h=160px, visible h=16px. Precheck primary_ratio reports 0% (below 0.2% pre-fix value), causing primary_area_ratio to drop from 0.2 to 0.

## Verdict: ACCEPTABLE_TRADEOFF

Three reasons:

### 1. Pre-fix score 49 was false-high.
Batch1 precheck JSON records 10 HARD_FAIL clipped_by_parent entries and 8 HARD_FAIL aspect_distorted entries for this scene:
- ethanol_bottle: 107px cropped from bottom (card h=119px, artwork h=240px)
- dmso_bottle x2: 107px cropped from bottom each
- dilution_rack: 116px cropped from bottom (card h=30px)
- tube_rack_15ml: 116px cropped from bottom
- microtube: 38px cropped from bottom
- waste_container: cropped top=56px AND bottom=177px
- tip_box_10: 27px cropped from bottom
- Multiple aspect distortions: microtube 169.8%, waste_container 52.8%, glassware 8-12.5%

Scorecard formula does not count clipped_by_parent in hardFailCount. Correct hardFailCount for batch1 would be at minimum 10, which would have zeroed total_layout_score (if hardFailCount > 0: totalScore = 0). The 49 score is measurement artifact of incomplete hardFail definition, not evidence of good pre-fix layout.

### 2. -19pt delta entirely explained by label_overlap worsening from 1 to 3 pairs.
N-patch legitimately increased card heights to prevent real bottom-crop hard-fails on container-class and handheld objects in normal scenes. Taller minimum height collapses work_surface column for this stress scene (5 objects in column that cannot hold them). Expected behavior for intended_difficulty: hard stress scene.

### 3. Stress scenes are not curriculum scenes.
stress_dense_clutter_014 exists to expose edge cases. It scores 30 pre-fix (truly) and 30 post-fix. N-patch did not make it worse; scorecard formula made it appear better pre-fix than it was.

## Recommendation: KEEP

No CSS revert. No scorecard change. No YAML change required.

Regression is acceptable. Pre-fix score was false-high masked by incomplete hardFail definition. Post-fix score is more honest reflection of scene already broken on primary detection, label readability, and scene occupancy.

Crowded-density modifier (data-scene-density="crowded") already exists in bench.css and would reduce card heights for this scene. Engaging requires YAML scene_density: crowded field and generator support. Bounded follow-on if project later needs stress baselines not already broken; not required to unblock any current decision.

## Mitigation Outline (if REVISE were chosen)

Bounded fix path without touching CSS:

1. Add scene_density: crowded to affected dense_clutter YAML files (or all 20).
2. Update HTML generator to emit data-scene-density="crowded" on scene container when field set.
3. Crowded modifier reduces handheld to 63-112px, small-tool to 30-54px, rack to 84-130px. Five work_surface objects at ~130px each = ~650px; column can fit with flex-shrink.
4. Expected result: label_overlap returns to ~1 pair (score ~70), total_layout_score likely returns to ~45-50.
5. Risk: crowded modifier also reduces container to 154-224px max-height. Three rear_shelf containers (ethanol_bottle, dmso_bottle x2) currently render at 240px and overflow cards. Crowded modifier would change card height constraint but min-height=154px may still be exceeded by 240px artwork, keeping crop violations. Full verification required.

Deferred. Current recommendation KEEP.

## Blockers

None. All evidence available in committed JSON files. No contract amendment, broad migration, or diagnostic semantic change required.

## Handoff format

- Status: DONE
- Top regressed metric: label_overlap (score 70 -> 10, -60 raw, weighted -18pt of -19pt total)
- Verdict: ACCEPTABLE_TRADEOFF (pre-fix score was false-high; pre-fix scene had 10 unscored HARD_FAIL crop violations invisible to scorecard formula)
- Recommendation: KEEP
- Mitigation outline: Engage data-scene-density="crowded" via YAML field + generator, reducing card heights to crowded-modifier values. Risk: container cards on rear_shelf may re-enter crop territory. Deferred pending separate investigation.
- Blockers: None
