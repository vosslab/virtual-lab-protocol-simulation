# No-crop precheck semantics audit

Read-only reconciliation of diagnostic field names emitted by
[precheck.mjs](../../../experiments/css_native_layout/precheck.mjs)
against numbers cited under conflicting names by prior agents in this work
stream. All counts in this document were re-derived in-session from the
visual_audit.json files listed under "Source files read"; none were copied
from prior reports.

Repo HEAD at audit time: 8795d25.

## 1. Diagnostic catalog (precheck.mjs)

Every check defined in precheck.mjs, in source order. Severity column reflects
how the check feeds the verdict ladder (precheck.mjs lines 1090-1111).

| #   | Check function (line)                     | What it counts                                                                                                                                                                                                                                       | Severity                                               | Output field in visual_audit.json                                                                                                  |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `checkClippedArtwork` (66)                | `.placement` bbox that overflows its parent `.region` bbox on any of 4 sides                                                                                                                                                                         | HARD FAIL                                              | `scenes[i].checks.clipped_artwork` (array)                                                                                         |
| 2   | `checkOffPageArtwork` (122)               | `.placement` whose center OR any of 4 corners exits the 1920x1080 viewport                                                                                                                                                                           | HARD FAIL                                              | `scenes[i].checks.off_page` (array)                                                                                                |
| 3   | `checkSvgSvgOverlap` (190)                | Unordered pair of `.placement` bboxes whose AABBs intersect by any positive area                                                                                                                                                                     | HARD FAIL                                              | `scenes[i].checks.svg_svg_overlap` (array)                                                                                         |
| 4   | `checkLabelLabelOverlap` (236)            | Unordered pair of `.placement-label` bboxes that intersect                                                                                                                                                                                           | ADVISORY (drives WARN)                                 | `scenes[i].checks.label_label_overlap` (array)                                                                                     |
| 5   | `checkSvgLabelOverlap` (663)              | Cross-pair `.placement` x `.placement-label` intersections (skips self-pair)                                                                                                                                                                         | ADVISORY                                               | `scenes[i].checks.svg_label_overlap` (array)                                                                                       |
| 6   | `checkRegionOverflow` (724)               | `.region` with `scrollHeight > clientHeight` or `scrollWidth > clientWidth`; skips `popup_layer`                                                                                                                                                     | HARD FAIL                                              | `scenes[i].checks.region_overflow` (array)                                                                                         |
| 7   | `checkRegionWhitespace` (757)             | Per-region occupied-vs-empty ratio; flags when `whitespace_pct > 80 && placement_count > 0`                                                                                                                                                          | ADVISORY (drives WARN via `.flag`)                     | `scenes[i].checks.region_whitespace` (array of `{region_name, area, occupied, whitespace_pct, placement_count, flag}`)             |
| 8   | `checkSceneWhitespace` (798)              | Whole-scene occupied area vs `.scene-container` area                                                                                                                                                                                                 | INFO                                                   | `scenes[i].checks.scene_whitespace` (object)                                                                                       |
| 9   | `checkPrimaryObjectRatio` (824)           | Area ratio of `[data-primary="true"]` placement to scene; flags below 25% (composition) or 70% (zoom); skipped in template mode                                                                                                                      | ADVISORY (drives WARN via `.flag`)                     | `scenes[i].checks.primary_object` (object)                                                                                         |
| 10  | `checkLargestEmptyBand` (908)             | Largest empty quadrant of the 4 quadrants                                                                                                                                                                                                            | INFO                                                   | `scenes[i].checks.largest_empty_band` (object)                                                                                     |
| 11  | `checkSupportingDistance` (962)           | Mean and max normalized distance from primary placement to each supporting placement; skipped in template mode                                                                                                                                       | ADVISORY                                               | `scenes[i].checks.supporting_distance` (object or `{skipped, reason}`)                                                             |
| 12a | `checkArtworkIntegrity` sub-check a (361) | Per-placement: aspect mismatch >5%, forced shrink <60% area, or upscaling >120% area (severity WARN otherwise OK)                                                                                                                                    | ADVISORY                                               | `scenes[i].checks.artwork_integrity.natural_vs_rendered[*]` (array of records; only entries with `severity == "WARN"` are flagged) |
| 12b | `checkArtworkIntegrity` sub-check b (418) | `.object-graphic` bbox extending outside its `.placement` card                                                                                                                                                                                       | ADVISORY                                               | `scenes[i].checks.artwork_integrity.artwork_vs_card` (array)                                                                       |
| 12c | `checkArtworkIntegrity` sub-check c (443) | `.placement` card with `<100%` visible after intersecting its `.region` bbox                                                                                                                                                                         | ADVISORY                                               | `scenes[i].checks.artwork_integrity.object_vs_region` (array)                                                                      |
| 12d | `checkArtworkIntegrity` sub-check d (485) | `.placement-label` with `<100%` visible after intersecting its `.region` bbox                                                                                                                                                                        | ADVISORY                                               | `scenes[i].checks.artwork_integrity.label_clipping` (array)                                                                        |
| 12e | `checkArtworkIntegrity` sub-check e (529) | Rendered `<img>` bbox clipped by any ancestor whose `overflow != visible`, exceeding `CLIP_TOLERANCE_PX` (1px) on any side; clip computed from intersection of all ancestor clip rects, walking up to `document.body`                                | HARD FAIL (always)                                     | `scenes[i].checks.artwork_integrity.clipped_by_parent` (array)                                                                     |
| 12f | `checkArtworkIntegrity` sub-check f (628) | Rendered-vs-natural aspect ratio delta exceeding `ASPECT_DISTORTION_TOLERANCE_PCT` (5%); escalates to HARD FAIL when `object_name` substring-matches `glassware`, `pipette`, `plate`, or `instrument` patterns (HARD_FAIL_OBJECT_PATTERNS, line 298) | ADVISORY by default; HARD FAIL when classifier matches | `scenes[i].checks.artwork_integrity.aspect_distorted` (array with per-record `severity`)                                           |

Total: 11 top-level checks (clipped_artwork, off_page, svg_svg_overlap,
label_label_overlap, svg_label_overlap, region_overflow, region_whitespace,
scene_whitespace, primary_object, largest_empty_band, supporting_distance)
plus 1 grouped check (`artwork_integrity`) holding 6 sub-checks. Total
distinct array-shaped finding lists in the JSON: 12 (6 top-level + 6
sub-check arrays).

### Verdict feed (precheck.mjs lines 1090-1099)

Hard-fail boolean is OR of:

- `clipped_artwork.length > 0`
- `off_page.length > 0`
- `svg_svg_overlap.length > 0`
- `region_overflow.length > 0`
- `artwork_integrity.clipped_by_parent.length > 0`
- `artwork_integrity.aspect_distorted` contains any record with `severity == "HARD_FAIL"`

Note: `region_whitespace`, `label_label_overlap`, and `primary_object.flag`
drive WARN, not FAIL. Sub-checks 12a, 12b, 12c, 12d are advisory only.

## 2. Field-to-check map (visual_audit.json schema)

For each scene entry under `scenes[i].checks.*`:

| JSON field                              | Populated by | Semantic meaning                                                                                   | Severity contribution                                               |
| --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `clipped_artwork`                       | Check 1      | `.placement` overflows its parent `.region` (4-sided bbox check). NOT about `<img>` cropping.      | HARD FAIL                                                           |
| `off_page`                              | Check 2      | Placement extends outside the 1920x1080 viewport.                                                  | HARD FAIL                                                           |
| `svg_svg_overlap`                       | Check 3      | Placement-to-placement bbox overlap.                                                               | HARD FAIL                                                           |
| `label_label_overlap`                   | Check 4      | Label-to-label bbox overlap.                                                                       | WARN                                                                |
| `svg_label_overlap`                     | Check 5      | Cross-pair placement-to-label overlap (self-pair excluded).                                        | WARN                                                                |
| `region_overflow`                       | Check 6      | Region content height/width exceeds region client size.                                            | HARD FAIL                                                           |
| `region_whitespace`                     | Check 7      | Per-region occupancy info; `flag=true` when whitespace > 80% with placements.                      | WARN if any `flag`                                                  |
| `scene_whitespace`                      | Check 8      | Whole-scene whitespace info.                                                                       | INFO                                                                |
| `primary_object`                        | Check 9      | Primary placement ratio and threshold flag.                                                        | WARN if `flag`                                                      |
| `largest_empty_band`                    | Check 10     | Largest empty quadrant.                                                                            | INFO                                                                |
| `supporting_distance`                   | Check 11     | Primary-to-supporting distance stats; `{skipped: true}` for template mode.                         | INFO                                                                |
| `artwork_integrity.natural_vs_rendered` | Check 12a    | All placements recorded; only records with `severity == "WARN"` are flagged.                       | WARN                                                                |
| `artwork_integrity.artwork_vs_card`     | Check 12b    | `.object-graphic` extends outside `.placement` card.                                               | WARN                                                                |
| `artwork_integrity.object_vs_region`    | Check 12c    | `.placement` card clipped by `.region`.                                                            | WARN                                                                |
| `artwork_integrity.label_clipping`      | Check 12d    | Label clipped by `.region`.                                                                        | WARN                                                                |
| `artwork_integrity.clipped_by_parent`   | Check 12e    | Rendered `<img>` clipped by ancestor `overflow != visible`. THE canonical "SVG cropped" hard fail. | HARD FAIL                                                           |
| `artwork_integrity.aspect_distorted`    | Check 12f    | Aspect-ratio mismatch records; per-record severity governs escalation.                             | WARN, escalates to HARD FAIL for glassware/pipette/plate/instrument |

### Key naming pitfalls observed in prior reports

- "visible_crops" is **not** a precheck field name. It does not appear in
  precheck.mjs or any visual_audit.json. Prior reports used "visible_crops"
  as a colloquial label that was implicitly mapped, inconsistently, to one
  of `clipped_artwork`, `artwork_integrity.clipped_by_parent`, or
  `artwork_integrity.aspect_distorted[HARD_FAIL]`.
- `clipped_artwork` is **not** the SVG-cropping metric. It is a
  placement-vs-region bbox containment check. A scene can have
  `clipped_artwork == []` while still having dozens of cropped SVGs reported
  under `artwork_integrity.clipped_by_parent`. The Exp 4 reports that cited
  `clipped_artwork: 0` as evidence of "no crops" were citing the wrong field.
- `artwork_integrity.clipped_by_parent` is the only field that directly
  measures "rendered SVG asset clipped by parent overflow." This is the
  canonical "no-crop" hard-fail field.
- The production-runtime path (Exp 4 new-render, `render_and_dump.mjs`)
  emits real SVG elements, not `<img>` elements. Sub-check e looks up
  `<img>` inside `.object-graphic`. When `<img>` is absent or zero-sized,
  the closure returns early (line 536) and the placement records no
  clipped_by_parent entry. The 0-value for the new-render path is not
  evidence of "no crops"; it is a measurement gap. See limitation note in
  [PRECHECK_USAGE.md](../../../experiments/css_native_layout/PRECHECK_USAGE.md)
  section "Known limitations".

## 3. Reconciliation of prior reports

Each prior-reported figure is re-derived below from the JSON. Methodology:
sum the indicated field's `len()` across all scenes in
`<file>.scenes[*].checks`, with severity filters where required.

### 3.1 WS-G baseline ("visible_crops": templates 41, gold 78)

- Templates source: `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
- Gold source: `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`

Per-field totals across 10 scenes each:

| Field                                            | Templates | Gold   |
| ------------------------------------------------ | --------- | ------ |
| `clipped_artwork`                                | 0         | 0      |
| `artwork_integrity.clipped_by_parent`            | **41**    | **78** |
| `artwork_integrity.aspect_distorted` (total)     | 50        | 74     |
| `artwork_integrity.aspect_distorted` (HARD_FAIL) | 38        | 59     |

The reported 41 and 78 match `artwork_integrity.clipped_by_parent` exactly.
WS-G's "visible_crops" alias = `artwork_integrity.clipped_by_parent`.
Resolved.

### 3.2 WS-A retry Strategy C ("visible_crops" / "clipped_by_parent": templates 21, gold 38)

- Templates source: `test-results/no_crop_round3_static_template_repair/strategy_c/visual_audit.json`
- Gold source (Strategy C applied to gold scenes via Exp 1): `test-results/no_crop_round3_exp1_applied/gold/visual_audit.json`

Note: the round-3 static-template-repair directory contains a `baseline/`
and a `strategy_c/` run, but only the template scenes; the matching gold
results were captured in the round-3 exp1 applied directory.

Per-field totals:

| Field                                            | strat_c/templates | exp1/gold (Strategy C applied) |
| ------------------------------------------------ | ----------------- | ------------------------------ |
| `clipped_artwork`                                | 0                 | 0                              |
| `artwork_integrity.clipped_by_parent`            | **21**            | **38**                         |
| `artwork_integrity.aspect_distorted` (total)     | 47                | 55                             |
| `artwork_integrity.aspect_distorted` (HARD_FAIL) | 38                | 47                             |

The reported 21 and 38 match `artwork_integrity.clipped_by_parent` exactly.
WS-A's "visible_crops" alias = `artwork_integrity.clipped_by_parent`.
Resolved. The two prior runs (WS-G baseline 41/78 and WS-A Strategy C
21/38) are measuring the same metric; the drop reflects Strategy C
genuinely cutting `clipped_by_parent` by 49% on templates and 51% on gold.

### 3.3 Exp 4 frozen rerun under Strategy C ("clipped_artwork" gold 0)

- Source: `test-results/no_crop_round3_exp4_rendered/precheck_frozen/visual_audit.json`

Per-field totals:

| Field                                            | Value |
| ------------------------------------------------ | ----- |
| `clipped_artwork`                                | **0** |
| `artwork_integrity.clipped_by_parent`            | 38    |
| `artwork_integrity.aspect_distorted` (HARD_FAIL) | 47    |

The reported 0 is technically accurate for the literal field name
`clipped_artwork`, but that field measures placement-vs-region overflow,
not SVG cropping. Citing `clipped_artwork: 0` as evidence of "no SVG
crops" is a field-naming error: this same JSON shows 38 `clipped_by_parent`
findings. The frozen-precheck rerun is in fact identical in counts to
`exp1/gold` (see 3.2 table), confirming the frozen run did not regress
relative to Strategy C, but it did not reach 0 crops on the SVG metric.
Resolved against the JSON; the prior report's framing was wrong.

### 3.4 Exp 4 new-render under Strategy C ("clipped_artwork" gold 0)

- Source: `test-results/no_crop_round3_exp4_rendered/precheck/visual_audit.json`

Per-field totals:

| Field                                            | Value |
| ------------------------------------------------ | ----- |
| `clipped_artwork`                                | **0** |
| `artwork_integrity.clipped_by_parent`            | **0** |
| `svg_svg_overlap`                                | 53    |
| `svg_label_overlap`                              | 39    |
| `artwork_integrity.aspect_distorted` (HARD_FAIL) | 62    |
| `artwork_integrity.aspect_distorted` (total)     | 88    |

Both `clipped_artwork` and `clipped_by_parent` are 0 here. But this run
audits the production-runtime DOM dumped via `render_and_dump.mjs`,
which emits real SVG, not the `<img>`-wrapped artwork the static template
pipeline produces. Sub-check 12e early-returns when `<img>` bbox is
zero-area (precheck.mjs line 536) and adds no record. The 0 is therefore
ambiguous: it could mean "no crops" OR "no measurable `<img>` to check."
The matching `clipped_artwork: 0` is on the placement-vs-region check and
does work on the dumped DOM, but it is not the SVG-cropping metric. The
new-render path also shows 53 `svg_svg_overlap` and 62 hard-fail aspect
distortions, so this run is not crop-free in any meaningful sense. The
prior framing conflated three different measurement gaps. Resolved; the
0-value is a measurement gap on this specific render path and should not
be cited as a crop-free baseline.

## 4. Canonical baseline table

The columns below are re-derived from the JSON in this session and are
the recommended canonical baseline for the Round 3 ready-to-fix table.
"Baseline" = WS-G fresh-manager-sanity run before any Strategy C edits.
"Strategy C applied" = the strat_c result for templates and the
exp1/gold result for gold (the two runs that landed on top of Strategy C).

| Metric                                              | Definition                                                          | Baseline templates | Baseline gold  | Strategy C templates | Strategy C gold | Notes                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------------------ | -------------- | -------------------- | --------------- | ---------------------------------------------------------------- |
| `artwork_integrity.clipped_by_parent`               | Rendered `<img>` clipped by ancestor `overflow != visible` (12e)    | 41                 | 78             | 21                   | 38              | Canonical "SVG cropped" hard fail. -49% / -51% under Strategy C. |
| `artwork_integrity.aspect_distorted` HARD_FAIL      | Aspect-ratio delta > 5% on glassware/pipette/plate/instrument (12f) | 38                 | 59             | 38                   | 47              | Hard fail; Strategy C did not move templates, -20% on gold.      |
| `artwork_integrity.aspect_distorted` total          | All aspect-ratio delta > 5% records (12f)                           | 50                 | 74             | 47                   | 55              | Includes non-escalated WARN records.                             |
| `clipped_artwork`                                   | Placement bbox overflows its region (1)                             | 0                  | 0              | 0                    | 0               | Never the SVG-cropping metric. All four states show 0.           |
| `off_page`                                          | Placement center/corner outside 1920x1080 (2)                       | 20                 | 34             | 21                   | 38              | Independent of crop work.                                        |
| `svg_svg_overlap`                                   | Placement bboxes intersect (3)                                      | 0                  | 0              | 0                    | 15              | Strategy C introduced 15 gold overlaps.                          |
| `region_overflow`                                   | Region scroll size exceeds client size (6)                          | 0                  | 0              | 4                    | 20              | Strategy C regressed region containment.                         |
| `label_label_overlap`                               | Two labels overlap (4)                                              | 0                  | 10             | 0                    | 4               | WARN only.                                                       |
| `svg_label_overlap`                                 | Cross-pair placement-label overlap (5)                              | 0                  | 4              | 3                    | 20              | WARN only; gold regressed.                                       |
| `artwork_integrity.artwork_vs_card`                 | `.object-graphic` outside its `.placement` card (12b)               | 23                 | 46             | 2                    | 0               | WARN; Strategy C nearly eliminated.                              |
| `artwork_integrity.natural_vs_rendered` WARN        | Aspect mismatch / shrink / upscale (12a)                            | 64                 | 87             | 63                   | 77              | WARN; small change.                                              |
| Verdict counts (FAIL / WARN / PASS_TEMPLATE / PASS) | (per ladder)                                                        | 10 / 0 / 0 / 0     | 10 / 0 / 0 / 0 | 10 / 0 / 0 / 0       | 10 / 0 / 0 / 0  | All 40 scene verdicts are FAIL across all four runs.             |

All counts above were emitted by `/tmp/_audit_counts.py` against the
sources listed in section 6.

## 5. Conclusion: canonical metric for Round 3 ready-to-fix

Round 3 ready-to-fix tables should cite
**`artwork_integrity.clipped_by_parent`** (sub-check 12e) as the canonical
"crop count" metric, with the per-scene array length summed across all
scenes in a run. Rationale:

1. It is the only precheck field that directly measures
   "rendered SVG asset clipped by parent overflow", which is the visual
   integrity contract from
   [PRIMARY_DESIGN.md](../../PRIMARY_DESIGN.md)
   ("Visual integrity: never crop scientific assets").
2. It is unambiguously a HARD FAIL (precheck.mjs line 623) and feeds the
   verdict path directly (line 1086, 1090-1097).
3. Both pre-Strategy-C numbers (41/78) and post-Strategy-C numbers (21/38)
   reconcile cleanly when this field is named explicitly. The conflicts in
   prior reports stem entirely from informal aliases ("visible_crops") and
   from citing the wrong-but-similarly-named `clipped_artwork` field.

Secondary metric to track alongside:
**`artwork_integrity.aspect_distorted` filtered to `severity == "HARD_FAIL"`**.
This is the second hard-fail contributor from the same sub-check group and
remains high under Strategy C (templates 38, gold 47).

Do not cite `clipped_artwork` as a crop metric. Do not cite "visible_crops"
without specifying which underlying field it aliases. When reporting a 0
value, also confirm the render path produces measurable `<img>` elements;
the `render_and_dump.mjs` SVG path makes sub-check 12e silently zero
regardless of actual cropping.

Reports that need a single composite "crops fixed" number should sum
`clipped_by_parent` plus `aspect_distorted[HARD_FAIL]` and label it
explicitly, e.g. "artwork-integrity hard fails".

## 6. Source files read

Precheck source and references:

- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/experiments/css_native_layout/precheck.mjs`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/experiments/css_native_layout/PRECHECK_USAGE.md`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md`

Visual audit JSON inputs (all present and parseable):

- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_static_template_repair/baseline/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_static_template_repair/strategy_c/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_exp1_applied/templates/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_exp1_applied/gold/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_exp4_rendered/precheck/visual_audit.json`
- `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/test-results/no_crop_round3_exp4_rendered/precheck_frozen/visual_audit.json`

Helper used for tallies (scratch, not committed):

- `/tmp/_audit_counts.py`
