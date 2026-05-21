# NEW3 Batch 1 failure clusters

- Audit date: 2026-05-20
- Scope: 110 scenes in NEW3 stress Batch 1 (10 gold + 100 stress)
- Inputs: per-scene precheck JSONs, per-scene scorecard JSONs, per-scene PNGs,
  `batch1_failure_table.md`, `precheck_batch1_summary.md`
- Cross-references: `new3_css_drift_audit.md`, `new3_schema_drift_audit.md`,
  `new2_no_crop_audit.md`

## Headline (honest read)

Under the NEW2 hard rule "never crop SVG assets, aspect must match", every
scene in Batch 1 hard-fails. This is not 110 independent scene bugs. It is one
or two systemic CSS/layout faults amplified across every placement that uses
the dominant `.placement` card geometry. Until the systemic fault is fixed,
per-scene tuning is wasted effort.

| Metric | Value | Source |
| --- | --- | --- |
| Scenes with at least one HARD fail | 110 / 110 | precheck summary |
| Total clipped_by_parent records | 631 | aggregated precheck JSONs |
| Total aspect_distorted records (raw) | 800 | aggregated precheck JSONs |
| Total aspect_distorted_HF (per summary) | 570 | summary doc |
| Distinct overflow side patterns | bottom=544, top+bottom=85, top=2 | aggregated |
| Distinct clipper elements | `DIV.placement` (631 / 631) | aggregated |
| Aspect hard_fail_group distribution | glassware=339, unclassified=230, pipette=149, instrument=51, plate=31 | aggregated |
| Delta_pct buckets | <6%=2, 6-10%=265, 10-20%=313, >=20%=220 | aggregated |
| Natural sizes seen as (150,150) | 614 / 800 distortion records | aggregated |
| Region_overflow scenes | 2 (both `stress_many_bottles_scene_*`) | precheck JSONs |

Note: the 800 vs. 570 gap between raw aspect_distorted records and
"aspect_distorted_HF" in the summary suggests the summary deduplicates by
placement or filters by group. The user spec uses 570; this doc reports both
to stay honest.

## Cluster summary table

| Cluster | Scenes affected | Placement incidents | Fix type |
| --- | --- | --- | --- |
| C1: Universal .placement card clips img bottom 19px | 110 / 110 | ~430 (bottom-only CBP) | CSS |
| C2: Universal handheld aspect distortion (8.33% glassware) | 105 / 110 | 339 (glassware HF) | CSS + footprint table |
| C3: Tall-glassware double-axis crop | 8 / 110 | ~95 (top+bottom CBP) | scene-class policy + CSS |
| C4: Placeholder-asset square inflation | 60+ / 110 | 614 distortion records | generator + missing-asset gap |
| C5: Stress sub-class fallthrough to composition | 38 / 110 | mode-driven secondary | scorecard manifest |
| C6: Region overflow on many_bottles | 2 / 110 | 33 placements in 2 scenes | generator (over-stuff) |
| C7: Zoom_detail large-instrument-in-small-card | 11 / 110 | ~15 (microscope, plate_reader) | scene-class policy |
| C8: Template scenes still hard-fail | 20 / 110 | ~38 (small but universal) | CSS (downstream of C1) |
| C9: Unclassified hard_fail_group leaks | 18+ / 110 | 230 records | runtime adapter / object library |
| C10: 'composition' primary-object flag false positives | 50+ / 110 | scoring-only | diagnostic refinement (NOT a HARD fix) |

## Cluster details

### C1: Universal .placement card clips img bottom 19px

- **Frequency**: every scene in Batch 1 carries this. Bottom-only CBP records
  account for 544 of 631 clip incidents.
- **Representative scenes**:
  - `stress_many_bottles_scene_002` (17 bottle placements, all clipped 19px
    bottom): `test-results/new3_stress_batch1/audit/stress_many_bottles_scene_002.png`
  - `stress_dense_clutter_010` (13 bottom-clip incidents):
    `test-results/new3_stress_batch1/audit/stress_dense_clutter_010.png`
  - `gold_heat_block_sample_prep` (11 bottom-clip incidents):
    `test-results/new3_stress_batch1/audit/gold_heat_block_sample_prep.png`
- **Likely root cause**: the placement card geometry is 220 wide x 207 tall,
  but `img` renders at 220 x 240 because `.object-graphic img` uses
  `width:auto; height:auto; max-width:100%; max-height:100%; object-fit:contain`
  against a 220x150 natural square asset scaled to fit width. The card has
  `overflow:hidden` (or equivalent), giving a 19px bottom crop. This is the
  same pattern NEW3-E CSS drift audit names in Group 1 (`overflow: hidden` on
  card-like containers) and NEW2 no-crop audit names as the bottle-family
  overflow class. The precheck reports clipper = `DIV.placement` on 631 / 631
  incidents, which pinpoints the `.placement` rule, not `.region` or
  `.scene-container`.
- **Recommended fix**: CSS. Bump the dominant handheld/glassware card
  `min-height` to the contain-scaled natural height of the asset family that
  fills it (NEW2 names 230-260px for handheld bottles at 82-92px width;
  NEW3-E Patch C recommends 260px). At the same time, remove
  `overflow:hidden` on `.placement` so a residual mis-size still fails the
  diagnostic loudly instead of clipping silently.
- **5pt regression budget**: yes (this is one CSS edit class affecting most
  bottles; expected to clear the 5pt budget by a wide margin).

### C2: Universal handheld aspect distortion (8.33% glassware)

- **Frequency**: 339 records with `hard_fail_group=glassware` and
  `delta_pct=8.33`. 265 records sit in the 6-10% bucket, 313 in 10-20%,
  220 at >=20%. Glassware tolerance is 5%.
- **Representative scenes**:
  - `stress_many_bottles_scene_002` (17 glassware records at 8.33%)
  - `stress_dense_clutter_009` (13 records)
  - `gold_drug_dilution_workspace` (8 records)
- **Likely root cause**: same CSS card geometry as C1. The img renders at
  220 x 240 (aspect 0.917) against natural 1.000, a deterministic 8.33%
  delta. This is not a randomized layout fault, it is the card-vs-natural
  ratio. NEW2 no-crop audit lists this as the bottle-family universal cause.
  NEW3-E CSS drift audit Group 2 names footprint max-height as a contributor.
- **Recommended fix**: CSS. Either (a) match card aspect to the asset family
  (square handheld cards for square-natural bottles), or (b) raise card
  `min-height` to allow object-fit:contain to render at natural aspect, OR
  (c) hold card aspect and adjust the asset's natural viewBox if the asset
  pipeline guarantees square. Option (b) plus C1 is the same edit.
- **5pt regression budget**: yes.

### C3: Tall-glassware double-axis crop

- **Frequency**: 85 records with `overflow_sides=top,bottom`.
  Concentrated in `tall_glassware_scene_*`, `extreme_aspect_scene_*`, and the
  `instrument_main_microscope` placements in `zoom_detail_*`.
- **Representative scenes**:
  - `stress_tall_glassware_scene_001` (7 CBP, large bottom clip ~88px each)
  - `stress_extreme_aspect_scene_001` (4 CBP, water_bath clip 177px bottom)
  - `stress_zoom_detail_001` (microscope clip top 52px + bottom 112px)
- **Likely root cause**: card too short and too narrow for tall-aspect or
  oversized instrument assets. The asset's natural aspect ratio cannot fit
  the card, so `object-fit:contain` would shrink it; instead the asset is
  rendered at a fixed scale and overflows top + bottom symmetrically (when
  card forces a transform that does not center) or with growing magnitude.
- **Recommended fix**: scene-class policy + CSS. Add a `.footprint--tall`
  and a `.footprint--oversized-instrument` class, route via the scene-class
  manifest. Do NOT widen the universal handheld footprint to cover these;
  that re-opens C1. NEW3-E Patch C and D are the precedents.
- **5pt regression budget**: yes (small class, narrow blast radius).

### C4: Placeholder-asset square inflation

- **Frequency**: 614 of 800 aspect_distorted records have natural size
  exactly `(150, 150)`. That is the placeholder-square fingerprint. Many of
  these objects are real (`pbs_bottle`, `dmso_bottle`) and known to ship a
  real 150x150 viewBox; others (`brush`, `marker`, `kimwipes`, `slide`,
  `waste_container`) almost certainly should not be 150x150 and are missing
  assets resolved to a placeholder.
- **Representative scenes**:
  - `stress_many_small_tools_scene_001` (14 AD records, all 150x150)
  - `stress_dense_clutter_009` (13 AD records, mixed real + placeholder)
  - `stress_many_bottles_scene_002` (17 records, all real bottle 150x150)
- **Likely root cause**: hybrid. Some 150x150 records are genuine library
  assets (bottle naturals confirmed in NEW2 audit). Others are placeholder
  fallbacks for missing object SVGs. The diagnostic itself is not lying, but
  cannot distinguish a real square asset from a placeholder square, so the
  "55 missing object assets" inflate aspect_distorted_HF.
- **Classification**: this is **NOT a diagnostic false positive**, it is a
  genuine missing-asset gap AND a generator issue. The generator should not
  emit placements for objects whose canonical SVG is missing; or the runtime
  should refuse to render them. Inflated counts are a real signal that the
  object library has 55 holes.
- **Recommended fix**: runtime adapter + generator. (1) Tag placeholder
  renders distinctly in the DOM (a `data-placeholder=true` attribute), and
  let the diagnostic count them separately. (2) Add the 55 missing assets to
  the object library, or remove their references from the generator until the
  assets exist.
- **5pt regression budget**: no (this is a multi-week asset task, separate
  from the CSS regression budget).

### C5: Stress sub-class fallthrough to composition

- **Frequency**: scenes in classes `instrument_heavy` (19), `dense_clutter`
  (22), `extreme_aspect_scene` (2), `long_label_scene` (5),
  `many_bottles_scene` (2), `many_small_tools_scene` (3),
  `tall_glassware_scene` (3) all show `scene_mode=composition` in the
  scorecard primary-object check, with threshold=25. The scorecard's
  filename heuristic does not match these prefixes and falls through to the
  composition bucket.
- **Representative scenes**:
  - `stress_tall_glassware_scene_001` (primary_object.scene_mode =
    "composition")
  - `stress_many_bottles_scene_002` (same)
  - `stress_many_small_tools_scene_001` (same)
- **Likely root cause**: this is a **manifest gap**, not a scorecard bug and
  not "by design". The scorecard maps prefix-to-mode but the scene-class
  manifest at `experiments/css_native_layout/scene_class_manifest.yaml`
  defines the sub-classes that the scorecard does not recognize. The two
  sources of truth disagree.
- **Recommended fix**: scorecard manifest. Replace the filename heuristic in
  the scorecard with a lookup against `scene_class_manifest.yaml`. Until then,
  add explicit prefix mappings for the seven sub-classes. NEW3-D schema
  drift audit names the scene_class_manifest.yaml file as a non-scene YAML
  in Category G; it should remain that shape, but the scorecard should read
  it.
- **5pt regression budget**: yes (scorecard-only change, no runtime CSS
  impact).

### C6: Region overflow on many_bottles

- **Frequency**: 2 scenes (`stress_many_bottles_scene_001` and `_002`), 33
  placements collectively. `rear_shelf` region is 1888 x 232 nominal,
  scroll_height 649, overflow_h 417.
- **Representative scenes**:
  - `stress_many_bottles_scene_002` (17 bottles into a 232px shelf):
    `test-results/new3_stress_batch1/audit/stress_many_bottles_scene_002.png`
  - `stress_many_bottles_scene_001` (16 bottles, same pattern):
    `test-results/new3_stress_batch1/audit/stress_many_bottles_scene_001.png`
- **Likely root cause**: the generator emits more bottles than the region can
  hold; the region wraps onto multiple rows and the rows overflow vertically.
  This is generator over-stuff, not a CSS bug.
- **Recommended fix**: generator. Cap placement count per region in the
  generator, or auto-route overflow into a second region (`rear_shelf_2`).
  Do NOT shrink card to fit; that re-opens C1.
- **5pt regression budget**: yes (2 scenes only).

### C7: Zoom_detail large-instrument-in-small-card

- **Frequency**: 11 scenes in `zoom_detail` class. Microscope/plate_reader
  placements consistently clip top+bottom in zoom layouts.
- **Representative scenes**:
  - `stress_zoom_detail_001` (microscope top 52 + bottom 112 clip):
    `test-results/new3_stress_batch1/audit/stress_zoom_detail_001.png`
  - `stress_zoom_detail_004` (same): same path
  - `gold_well_plate_96_zoom_with_state`: same path
- **Likely root cause**: zoom_detail layout uses a tight card that targets a
  zoom on the asset, but the generator places a full-instrument SVG. The
  instrument natural aspect (microscope 114x150 -> 0.76) does not match the
  zoom card aspect (1.30 typical), producing 45.89% delta in the diagnostic.
- **Recommended fix**: scene-class policy. zoom_detail scenes must use the
  matching zoom-variant asset (microscope_eyepiece_zoom.svg) not the
  full-instrument SVG; or the runtime adapter must select the zoom variant
  when the scene-class is zoom_detail.
- **5pt regression budget**: yes.

### C8: Template scenes still hard-fail

- **Frequency**: 20 / 20 template scenes hard-fail. Object counts 2-4 per
  scene, so the absolute incident count is small.
- **Representative scenes**:
  - `stress_template_007` (2 CBP, well_plate + pbs_bottle):
    `test-results/new3_stress_batch1/audit/stress_template_007.png`
  - `stress_template_014` (2 CBP, plate_reader + ethanol_bottle): same path
  - `stress_template_019`: same path
- **Likely root cause**: same C1/C2 root cause; the template scenes are not
  exempt from the universal card geometry. They expose that C1 is universal,
  not density-dependent.
- **Recommended fix**: downstream of C1; no separate fix needed.
- **5pt regression budget**: covered by C1.

### C9: Unclassified hard_fail_group leaks

- **Frequency**: 230 of 800 aspect_distorted records have
  `hard_fail_group=None`. Top offenders: `brush` (32), `kimwipes` (27),
  `marker` (26), `slide` (25), `waste_container` (22), `drug_vial` (22),
  `waste_tray` (21), `drug_vial_rack` (20), `dilution_rack` (14).
- **Representative scenes**:
  - `stress_many_small_tools_scene_001` (brush, kimwipes, marker, slide all
    unclassified)
  - `stress_dense_clutter_009`: same path
  - `gold_staining_bench`: same path
- **Likely root cause**: the runtime/diagnostic adapter does not assign a
  `hard_fail_group` to every object; objects outside the four canonical
  groups (glassware, pipette, instrument, plate) leak through as None and
  still hard-fail with a default tolerance. NEW3-D schema drift audit notes
  the object library lacks a canonical group field; this is the symptom.
- **Recommended fix**: runtime adapter. Add a `hard_fail_group` field to the
  object library entry for each object (rack, vial, tray, consumable, label,
  etc.) and route the diagnostic through it. Default behavior on missing
  group should be "skip aspect HF, flag SOFT" not "hard-fail with default
  tolerance".
- **5pt regression budget**: yes (diagnostic-side, no asset/CSS change).

### C10: 'composition' primary-object flag false positives

- **Frequency**: many scenes have `primary_object.flag=true` because the
  largest placement exceeds the 25% threshold. This is a soft signal, not a
  HARD fail, but it contributes to scoring noise.
- **Representative scenes**: most `stress_zoom_detail_*` show
  primary_object.flag=true with ratio 2.1 to 2.7 (single large microscope).
- **Likely root cause**: the threshold is composition-class default 25%; the
  scene is actually a zoom and should use a different threshold.
- **Recommended fix**: diagnostic refinement, downstream of C5.
- **5pt regression budget**: not applicable (not a HARD fail; do NOT prioritize).

## Special-case answers

### Placeholder asset inflation (the 55 missing-asset question)

**Verdict: genuine missing-asset gap + generator issue, NOT a diagnostic
false positive.**

- 614 of 800 aspect_distorted records have natural (150,150). Of those, a
  large fraction (estimated ~230 by overlap with the unclassified group from
  C9) correspond to placeholder squares for assets that should have
  non-square viewBoxes (brush, marker, kimwipes, slide, etc.).
- A real square bottle asset and a placeholder square share the same
  natural-size signal; the diagnostic cannot tell them apart from JSON
  alone. So the inflated count is real failure data, not a bug in the
  precheck.
- Fix recommendation: tag placeholder renders distinctly at the DOM level
  (e.g., `<img data-placeholder="true">`), have the precheck downgrade
  placeholder aspect HF to SOFT, AND ship the 55 missing assets so the
  inflated count drops to its real residual.
- The diagnostic should NOT be silenced for non-placeholder square assets;
  bottles at 150x150 are real and the 8.33% delta is a real CSS bug.

### Stress sub-class fallthrough (instrument_heavy, tall_glassware_scene,
many_bottles_scene -> composition)

**Verdict: manifest gap, not a scorecard bug and not by design.**

- The scorecard uses a filename-prefix heuristic. The scene-class manifest
  at `experiments/css_native_layout/scene_class_manifest.yaml` already
  declares the seven sub-classes. The two sources of truth disagree.
- The fix is for the scorecard to read the manifest, not for the manifest
  to absorb the scorecard's heuristic.
- This is a five-line scorecard patch with no runtime CSS impact.

## Priority fix order

| Rank | Fix name | Target file | Cluster(s) resolved | Expected incidents resolved | Regression risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Bump handheld footprint min-height to 230-260px and drop `.placement { overflow:hidden }` | `experiments/css_native_layout/styles/bench.css`, `hood.css`, `instrument.css`, `src/style.css` | C1, C2, C8 | ~430 CBP + ~339 glassware HF (~770 incidents) | LOW (NEW2 already validated 230-260px range; NEW3-E lists this as Patch C) |
| 2 | Read scene_class_manifest.yaml from scorecard, replace filename heuristic | `experiments/css_native_layout/score_scene.py` or equivalent scorecard tool | C5 | 38 scenes mis-classified | LOW (scorecard-only; no CSS) |
| 3 | Add `.footprint--tall` and `.footprint--oversized-instrument` classes, route via scene-class | `bench.css`, `hood.css`, `instrument.css` | C3, C7 | ~95 + ~15 = ~110 CBP incidents | MEDIUM (new CSS classes; require scene-class routing) |
| 4 | Add `hard_fail_group` field to object library; route diagnostic | object library JSON, precheck script | C9 | 230 unclassified records | LOW (diagnostic refinement) |
| 5 | Generator: cap placements per region, route overflow to second region | scene generator | C6 | 33 incidents in 2 scenes | LOW (generator-only; bounded) |

NEW2 cross-reference: AUDIT-NOCROP recommendation "bump handheld footprint
to 230-260px" maps directly to rank 1 above. The NEW2 number is the right
number for the handheld family. NEW3-E confirms the same range
(Patch C: 260px).

## Anti-pattern callout (forbidden fix paths)

Three "fixes" would weaken diagnostics or hide cropped DOM. Do NOT do these.

1. **Forbidden**: add `overflow:hidden` to `.region` or `.scene-container` to
   suppress the C1 visible clip. This is the original NEW2 root cause and
   would re-violate the never-crop-SVG hard rule. NEW3-E Group 1 lists this
   pattern as the primary HIGH-severity drift.
2. **Forbidden**: widen tolerance on the aspect_distorted HARD threshold from
   5% to >=8.4% to mask C2. The 8.33% delta is a real geometric bug, not
   measurement noise. Widening the tolerance hides bottles that are actually
   distorted on screen.
3. **Forbidden**: filter aspect_distorted records by natural size (150,150)
   to mask C4. The 614 records include real bottle distortions and real
   placeholder inflation; filtering by natural size hides both. The right
   move is to tag placeholders in the DOM (see C4 fix), not to filter the
   diagnostic.

Forbidden fix path count: 3.

## Return summary

- File path: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/new3_batch1_failure_clusters.md`
- Cluster count: 10
- Top 1 highest-frequency cluster: C1 (Universal .placement card clips img
  bottom 19px, 110 / 110 scenes, ~430 CBP incidents)
- Top 1 fix candidate: bump handheld footprint min-height to 230-260px and
  drop `.placement { overflow:hidden }` (resolves ~770 incidents across
  C1+C2+C8)
- Forbidden fix path count: 3
