# NEW3 Batch 3 Workstream A - Remaining Hard Failures

Date: 2026-05-21
Status: DONE_WITH_CONCERNS
Use "workstream" not "lane".

## Data sources

- stress_scenes/generated/stress_many_bottles_scene_001.yaml
- stress_scenes/generated/stress_many_bottles_scene_002.yaml
- stress_results/precheck_batch2_n_canonical/visual_audit.md
- stress_results/scorecard_batch2_n_canonical/stress_many_bottles_scene_001.json + _002.json
- stress_generators/generate_stress_scenes.py
- stress_scenes/rendered/stress_many_bottles_scene_001.html + _002.html
- regions/bench.yaml
- styles/bench.css
- stress_results/batch2_e_failure_recluster.md
- stress_results/batch2_workstream_n_fix_summary.md

## Scene 001 facts

- bottle count 16, all in zone rear_shelf
- region overflow rear_shelf h=202px w=0px
- scorecard region_filling 166.4 (66.4% over)
- scorecard hard_fails 1
- scorecard total_layout_score 0 (hard-fail forces zero)
- grid row for rear_shelf is 100px fixed. min-height 100px floor. With flex-wrap:wrap + 16 bottles each at min-height 110px+label, rendered exceeds 100px allocation by 202px.
- Root cause: generator overstuffing + footprint miscategorization

## Scene 002 facts

- bottle count 17 in rear_shelf
- region overflow h=417px w=0px
- scorecard region_filling 176.7 (76.7% over)
- scorecard hard_fails 1
- total_layout_score 0
- Non-linear overflow (202px for 16, 417px for 17) means 17th bottle triggers third wrap row.

## Bottle objects involved

All 12 unique kinds from BOTTLES pool: ethanol_bottle, dmso_bottle, pbs_bottle, methanol_bottle, tris_buffer_bottle, sds_bottle, glycerol_bottle, sodium_hydroxide_bottle, hydrochloric_acid_bottle, water_bottle, tween20_bottle, edta_bottle. Some kinds repeat.

CRITICAL FINDING: Rendered HTML assigns class="object-graphic footprint--container" on ALL bottles. bench.yaml kind_to_footprint says bottle: handheld. Render pipeline does NOT consult bench.yaml; bottles route to footprint--container via some other logic.

This contradicts Workstream K finding that "renderer does no footprint assignment." K examined css_native_adapter.ts and layout_engine.ts. Override happens elsewhere in the pipeline.

footprint--container min: 220x240. footprint--handheld min: 90x110. Each bottle renders at 220x240 instead of 90x110. Single row of containers at 220px width fits ~8 max before wrap; in 100px grid row, zero containers fit without overflow.

## Why current rear_shelf cannot contain N bottles at container footprint

CSS grid rear_shelf row: 100px fixed (grid-template-rows: 100px 1fr 100px 150px 0px). Region min-height 100px. flex-wrap:wrap enabled.

- container min-height 240px. Single row already overflows 100px by 140px.
- 16 bottles at 220px width + 8px gap: floor(1920 / 228) = 8 per row. 2 rows. Each ~270px tall (240 + label/padding).
- 16 bottles -> 2 x 270 = 540 in 100px slot. Overflow ~200px. Matches observed 202px.
- 17 bottles -> 3 rows = 810 in 100px slot. Overflow ~417px. Matches observed 417px.

If bottles were correctly assigned handheld (90px width, 110px height): floor(1920/98) = 19 per row. 16 fit in one row. Row height 110px in 100px slot. Only 10px overflow. Footprint miscategorization multiplies severity 2-4x.

## Three fix candidates ranked

### Fix A (recommended): generator placement cap enforcement

Generator has REGION_PLACEMENT_CAPS rear_shelf: 12 and enforce_placement_caps function. build_many_bottles calls sample_unique(BOTTLES, count, rng) with count = rng.randint(15, 20). enforce_placement_caps comment line 349: "Over-cap; mark as adversarial and still add (for now)". Cap code exists but does NOT reject over-cap placements.

Fix: change many_bottles count from randint(15, 20) to randint(8, 12). OR change enforce_placement_caps to truncate. Existing cap 12 is reasonable.

Impact: eliminates both r_ovf with no CSS change. Scoped to generator. No effect on other scene classes.

### Fix B: increase rear_shelf CSS grid row height

Change grid-template-rows first row from 100px to 300px or auto.

Concern: global CSS change. Affects all bench scenes including gold/composition. Visual balance regression risk. Does not fix footprint miscategorization; container-footprint bottles at 240px still overflow 300px if 3 rows form. Symptom fix not root cause.

Rank: third.

### Fix C: correct footprint assignment for bottles

Render pipeline assigns footprint--container to bottles. bench.yaml says bottle: handheld. Fix routing to honor YAML.

Concern: requires TS/generator pipeline change. Affects all bottle objects across all scenes. Broader regression risk than A. Even after fix, 110px in 100px row still marginal overflow.

Rank: second. Complementary to A. Risky in isolation.

## Best fix and rationale

Fix A. Generator already has cap infrastructure; just does not enforce truncation. many_bottles_scene is intended_difficulty: adversarial. Fix scoped entirely to generator. No CSS, no render pipeline, no scorecard changes. Eliminates both r_ovf by preventing physically impossible rear_shelf loads. Cap of 12 already in REGION_PLACEMENT_CAPS['rear_shelf']. Adjusting build_many_bottles count to randint(8, 12) aligns with cap and keeps stress meaningful.

Fix C is complementary and should be a separate workstream. bench.yaml states bottle: handheld but rendered output uses footprint--container. Render pipeline bug or YAML-to-template mapping gap. Correcting benefits all bottle scenes, reduces per-bottle footprint by ~60%, substantially improves layout density for realistic scenes.

## Realistic vs adversarial verdict

Adversarial. Both scenes carry intended_difficulty: adversarial. Generator marks them so. build_many_bottles fills with 15-20 reagent bottles, same zone, intentional duplicates. No real curriculum protocol requires 16 same-zone bottles.

Workstream E concurred: synthetic stress artifact; r_ovf incidents expected and acceptable for adversarial loads.

However: footprint miscategorization (Fix C) is latent defect affecting curriculum. Any realistic scene with 3+ bottles renders at container instead of handheld, wasting ~2.4x horizontal space. Curriculum-relevant concern independent of stress scenes.

## Handoff

Status: DONE_WITH_CONCERNS
Root cause: primary generator overstuffing; secondary compounding object-kind-to-footprint miscategorization (bottle rendered as container despite YAML handheld)
Recommended fix: Fix A - restrict build_many_bottles range randint(15,20) -> randint(8,12), OR make enforce_placement_caps truncate. No CSS change. Clears both r_ovf hard fails.
Realistic vs adversarial: adversarial. Both scenes marked intended_difficulty: adversarial. r_ovf expected for synthetic adversarial loads.
Concern: bottle:handheld in YAML rendered as footprint--container. Render pipeline override. Latent curriculum defect. Track as separate investigation. Contradicts Workstream K renderer audit (K examined css_native_adapter.ts and layout_engine.ts; override happens elsewhere).
Blocker: none for Fix A.
