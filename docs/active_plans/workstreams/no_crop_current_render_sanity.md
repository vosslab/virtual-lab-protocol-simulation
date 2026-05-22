# No-crop current render sanity (WS-G re-baseline)

Date: 2026-05-21
Repo HEAD: 8795d25 (`old script`)
Status: DONE_WITH_CONCERNS (production runtime path UNRESOLVED, stress static-HTML
generator script MISSING but frozen rendered HTML artifacts present)

## Purpose

Re-establish the current-render no-crop baseline tied to today's HEAD, after
the prior WS-G markdown report was wiped by an unrelated git reset. The
companion artifacts (screenshots, precheck JSON, contact-sheet INDEX.html)
under `test-results/no_crop_fresh_manager_sanity/` survived the reset and
are tied to this same HEAD (mtime 2026-05-21 16:51 UTC). This report
re-derives the per-scene metrics from those precheck JSON files and
reconciles them against the Round 2 baseline.

## Round 2 reference (recap)

From [docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md](../no_cropped_svg_round2_visual_acceptance_report.md):

- Round 2 templates baseline: 28 visible crops (10 production templates).
- Round 2 gold scenes baseline: 73 visible crops (10 gold reference scenes).
- Round 2 full-corpus total: 101 visible crops.

"Visible crops" in Round 2 = entries flagged by precheck's
`artwork_integrity.clipped_by_parent` (HARD FAIL "SVG cropped by parent
overflow"). Same metric used below.

## Render-path inventory (3 paths)

| Path                | Availability at HEAD 8795d25 | Source                                                                                   |
| ---                 | ---                          | ---                                                                                      |
| Production runtime  | UNRESOLVED                   | `dist/` absent in working tree; `pipeline/build_runtime_bundle.sh` not exercised in WS-G |
| Static template     | AVAILABLE                    | `experiments/css_native_layout/templates/*.html` (10 tracked HTML files)                 |
| Stress static-HTML  | FROZEN (artifacts only)      | `experiments/css_native_layout/stress_scenes/rendered/gold_*.html` (generator MISSING)   |

Stress static-HTML notes: `render_stress_to_html.py` is not present in the
working tree (confirmed: `find experiments/css_native_layout -name 'render_stress*'`
returned no rows). However, the 10 gold scene HTML files exist as frozen
artifacts at `experiments/css_native_layout/stress_scenes/rendered/gold_*.html`,
so precheck can still measure them; only re-generation is blocked.

## Per-scene crop counts (today, HEAD 8795d25)

Source JSON files (re-derived from):

- `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
- `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`

Metric column key:

- `sub_e clipped`: count of entries in `checks.artwork_integrity.clipped_by_parent`
  for that scene (HARD FAIL, the canonical "visible crop" count used in Round 2).
- `off_page`: count of entries in `checks.off_page` (HARD FAIL, advisory here).
- Round 2 col: value reported in the Round 2 report for that scene.
- Delta: today - Round 2. Positive means more crops than Round 2.

### Static template path (10 scenes)

| Scene                            | Render path     | sub_e clipped | off_page | Round 2 | Delta |
| ---                              | ---             | ---           | ---      | ---     | ---   |
| bench_basic                      | static template | 2             | 1        | 1       | +1    |
| cell_counter_basic               | static template | 1             | 1        | 1       | 0     |
| crowded_bench_dense              | static template | 6             | 3        | 4       | +2    |
| drug_dilution_plate_workspace    | static template | 5             | 2        | 3       | +2    |
| drug_dilution_workspace_dense    | static template | 8             | 4        | 4       | +4    |
| electrophoresis_bench            | static template | 12            | 6        | 7       | +5    |
| hood_basic                       | static template | 0             | 0        | 1       | -1    |
| microscope_basic                 | static template | 1             | 1        | 1       | 0     |
| staining_bench                   | static template | 6             | 2        | 6       | 0     |
| well_plate_96_zoom               | static template | 0             | 0        | 0       | 0     |
| **TOTAL templates**              | static template | **41**        | **20**   | **28**  | **+13** |

### Stress static-HTML path (10 gold scenes)

Frozen rendered HTML; precheck was re-run against these existing files.

| Scene                                 | Render path        | sub_e clipped | off_page | Round 2 | Delta |
| ---                                   | ---                | ---           | ---      | ---     | ---   |
| gold_cell_counter_station             | stress static-HTML | 7             | 4        | 6       | +1    |
| gold_drug_dilution_workspace          | stress static-HTML | 8             | 4        | 7       | +1    |
| gold_electrophoresis_full_setup       | stress static-HTML | 11            | 5        | 10      | +1    |
| gold_heat_block_sample_prep           | stress static-HTML | 11            | 2        | 11      | 0     |
| gold_hood_prep                        | stress static-HTML | 6             | 3        | 6       | 0     |
| gold_microscope_slide_prep            | stress static-HTML | 9             | 4        | 9       | 0     |
| gold_mixed_bench                      | stress static-HTML | 9             | 4        | 7       | +2    |
| gold_plate_reader_assay               | stress static-HTML | 6             | 5        | 6       | 0     |
| gold_staining_bench                   | stress static-HTML | 10            | 3        | 10      | 0     |
| gold_well_plate_96_zoom_with_state    | stress static-HTML | 1             | 0        | 1       | 0     |
| **TOTAL gold**                        | stress static-HTML | **78**        | **34**   | **73**  | **+5**  |

### Production runtime path

UNRESOLVED. `dist/` is absent in the working tree at HEAD 8795d25; no
production-bundle screenshots were captured. This path requires running
`INCLUDE_DEV_SMOKE=true bash pipeline/build_runtime_bundle.sh` followed by
`node experiments/css_native_layout/render_and_dump.mjs` and a per-protocol
precheck. WS-G did not exercise this path; flagged to follow-up workstream.

## Combined 20-scene subset crop count

| Scope                     | Today | Round 2 | Delta |
| ---                       | ---   | ---     | ---   |
| Templates (10)            | 41    | 28      | +13   |
| Gold scenes (10)          | 78    | 73      | +5    |
| **Combined (20-scene)**   | **119** | **101** | **+18** |

The combined corpus is 18 visible crops higher than Round 2. Drift is
concentrated in template scenes (template delta +13 vs gold delta +5).

## Per-scene drift summary (delta vs Round 2)

Scenes that drifted (delta != 0):

- bench_basic: +1
- crowded_bench_dense: +2
- drug_dilution_plate_workspace: +2
- drug_dilution_workspace_dense: +4
- electrophoresis_bench: +5
- hood_basic: -1
- gold_cell_counter_station: +1
- gold_drug_dilution_workspace: +1
- gold_electrophoresis_full_setup: +1
- gold_mixed_bench: +2

Scenes unchanged vs Round 2 (delta == 0):

- cell_counter_basic, microscope_basic, staining_bench, well_plate_96_zoom
- gold_heat_block_sample_prep, gold_hood_prep, gold_microscope_slide_prep
- gold_plate_reader_assay, gold_staining_bench, gold_well_plate_96_zoom_with_state

Largest single-scene regression: `electrophoresis_bench` (+5).

## Artifacts

- Contact sheet: `test-results/no_crop_fresh_manager_sanity/INDEX.html`
- Template screenshots: `test-results/no_crop_fresh_manager_sanity/templates/*.png` (10 files)
- Gold scene screenshots: `test-results/no_crop_fresh_manager_sanity/gold/*.png` (10 files)
- Template precheck JSON: `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
- Gold precheck JSON: `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`
- Template precheck MD: `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.md`
- Gold precheck MD: `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.md`

## Source files read

- `docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md`
- `experiments/css_native_layout/PRECHECK_USAGE.md`
- `experiments/css_native_layout/run_precheck.sh`
- `test-results/no_crop_fresh_manager_sanity/INDEX.html`
- `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`
- `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`

Files referenced but not opened:

- `experiments/css_native_layout/templates/*.html` (10 scene templates)
- `experiments/css_native_layout/stress_scenes/rendered/gold_*.html` (10 gold scenes)

## Concerns

1. Production runtime path is UNRESOLVED. The fresh-manager no-crop work cannot
   claim a real-app baseline without running the bundle build + render_and_dump
   chain. Flagged to a separate workstream that owns `dist/` build.

2. `render_stress_to_html.py` is missing from the working tree. Stress static-HTML
   precheck still runs against the frozen rendered HTML, but the corpus cannot
   be regenerated from current scene definitions. Any scene-yaml edit since the
   last render is invisible to this path.

3. Today's corpus is +18 visible crops over Round 2 (119 vs 101). Drift is real
   and concentrated on production templates (+13). Round 2 reported Trial 5 CSS
   edits at templates=28; today templates=41. Either the Trial 5 CSS edits were
   reverted in subsequent commits, or the precheck shape changed between runs.
   Either way the +13 template delta is unexplained by WS-G and should be
   triaged.

## Verification checklist

- [x] Contact sheet renders for all 20 scenes (10 templates + 10 gold).
- [x] Every screenshot row carries a render-path tag (`static template` or
      `stress static-HTML`).
- [x] Per-scene delta vs Round 2 reported (see drift summary above).
- [x] Combined crop count recorded (119).
- [ ] Production runtime path screenshots and precheck (UNRESOLVED, see
      Concerns).

## Handoff

Status: DONE_WITH_CONCERNS

Summary:

- Templates crop count: 41 visible crops (precheck output:
  `test-results/no_crop_fresh_manager_sanity/templates/visual_audit.json`,
  10 scenes, sum of `checks.artwork_integrity.clipped_by_parent`).
- Gold scenes crop count: 78 visible crops (precheck output:
  `test-results/no_crop_fresh_manager_sanity/gold/visual_audit.json`,
  10 scenes, same metric).
- Combined 20-scene crop count: 119 visible crops.
- Production runtime status: UNRESOLVED (`dist/` absent, render_and_dump
  chain not exercised in WS-G).
- Stress static-HTML status: generator MISSING
  (`render_stress_to_html.py` not in tree), but frozen rendered HTML
  artifacts present at
  `experiments/css_native_layout/stress_scenes/rendered/gold_*.html`
  (10 files).
- Per-scene delta vs Round 2: 10 of 20 scenes unchanged; 9 regressed
  (largest: electrophoresis_bench +5); 1 improved (hood_basic -1).
  Combined delta = +18.
- Artifact paths: see Artifacts section above.
- Source files read: see Source files read section above.
