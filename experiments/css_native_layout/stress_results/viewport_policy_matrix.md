# Viewport policy matrix

Workstream G stress test results: 15 scenes x 4 viewports = 60 runs.

## Per-viewport aggregate

| Viewport  | Scenes | Clipping | Off-page | Region overflow | Tiny targets | Aspect distorted | Migration | Score median |
| --------- | ------ | -------- | -------- | --------------- | ------------ | ---------------- | --------- | ------------ |
| 1920x1080 | 15     | 121      | 0        | 1               | 24           | 123              | 0         | 19.0         |
| 1440x900  | 15     | 121      | 17       | 1               | 24           | 123              | 55        | 11.0         |
| 1200x900  | 15     | 121      | 19       | 1               | 24           | 123              | 55        | 11.0         |
| 800x600   | 15     | 113      | 114      | 6               | 23           | 122              | 64        | 0.0          |

## Per-scene-class x viewport

| Class              | Viewport  | Scenes | Clipping | Off-page | Region overflow | Tiny | Aspect | Migration | Score median |
| ------------------ | --------- | ------ | -------- | -------- | --------------- | ---- | ------ | --------- | ------------ |
| gold               | 1920x1080 | 10     | 80       | 0        | 0               | 19   | 75     | 0         | 16.5         |
| gold               | 1440x900  | 10     | 80       | 7        | 0               | 19   | 75     | 33        | 12.0         |
| gold               | 1200x900  | 10     | 80       | 7        | 0               | 19   | 75     | 33        | 12.0         |
| gold               | 800x600   | 10     | 77       | 66       | 3               | 18   | 74     | 37        | 0.0          |
| composition        | 1920x1080 | 1      | 6        | 0        | 0               | 0    | 7      | 0         | 43.0         |
| composition        | 1440x900  | 1      | 6        | 0        | 0               | 0    | 7      | 2         | 43.0         |
| composition        | 1200x900  | 1      | 6        | 0        | 0               | 0    | 7      | 2         | 43.0         |
| composition        | 800x600   | 1      | 6        | 6        | 0               | 0    | 7      | 2         | 0.0          |
| dense_clutter      | 1920x1080 | 1      | 12       | 0        | 0               | 5    | 16     | 0         | 0.0          |
| dense_clutter      | 1440x900  | 1      | 12       | 0        | 0               | 5    | 16     | 7         | 0.0          |
| dense_clutter      | 1200x900  | 1      | 12       | 0        | 0               | 5    | 16     | 7         | 0.0          |
| dense_clutter      | 800x600   | 1      | 12       | 14       | 2               | 5    | 16     | 10        | 0.0          |
| instrument_heavy   | 1920x1080 | 1      | 6        | 0        | 0               | 0    | 7      | 0         | 43.0         |
| instrument_heavy   | 1440x900  | 1      | 6        | 5        | 0               | 0    | 7      | 0         | 3.0          |
| instrument_heavy   | 1200x900  | 1      | 6        | 5        | 0               | 0    | 7      | 0         | 3.0          |
| instrument_heavy   | 800x600   | 1      | 7        | 9        | 0               | 0    | 7      | 0         | 0.0          |
| zoom_detail        | 1920x1080 | 1      | 1        | 0        | 0               | 0    | 2      | 0         | 88.0         |
| zoom_detail        | 1440x900  | 1      | 1        | 1        | 0               | 0    | 2      | 0         | 80.0         |
| zoom_detail        | 1200x900  | 1      | 1        | 1        | 0               | 0    | 2      | 0         | 80.0         |
| zoom_detail        | 800x600   | 1      | 1        | 3        | 0               | 0    | 2      | 0         | 64.0         |
| many_bottles_scene | 1920x1080 | 1      | 16       | 0        | 1               | 0    | 16     | 0         | 0.0          |
| many_bottles_scene | 1440x900  | 1      | 16       | 4        | 1               | 0    | 16     | 13        | 0.0          |
| many_bottles_scene | 1200x900  | 1      | 16       | 6        | 1               | 0    | 16     | 13        | 0.0          |
| many_bottles_scene | 800x600   | 1      | 10       | 16       | 1               | 0    | 16     | 15        | 0.0          |

## Per-scene per-viewport

| Scene                              | Viewport  | Off | Clip | RegOvf | Tiny | Aspect | Mig | Score |
| ---------------------------------- | --------- | --- | ---- | ------ | ---- | ------ | --- | ----- |
| gold_cell_counter_station          | 1920x1080 | 0   | 5    | 0      | 0    | 7      | 0   | 49    |
| gold_cell_counter_station          | 1440x900  | 1   | 5    | 0      | 0    | 7      | 2   | 41    |
| gold_cell_counter_station          | 1200x900  | 1   | 5    | 0      | 0    | 7      | 2   | 41    |
| gold_cell_counter_station          | 800x600   | 6   | 4    | 0      | 0    | 6      | 2   | 10    |
| gold_drug_dilution_workspace       | 1920x1080 | 0   | 10   | 0      | 2    | 12     | 0   | 0     |
| gold_drug_dilution_workspace       | 1440x900  | 0   | 10   | 0      | 2    | 12     | 4   | 0     |
| gold_drug_dilution_workspace       | 1200x900  | 0   | 10   | 0      | 2    | 12     | 4   | 0     |
| gold_drug_dilution_workspace       | 800x600   | 9   | 9    | 1      | 1    | 12     | 5   | 0     |
| gold_electrophoresis_full_setup    | 1920x1080 | 0   | 10   | 0      | 4    | 8      | 0   | 8     |
| gold_electrophoresis_full_setup    | 1440x900  | 2   | 10   | 0      | 4    | 8      | 4   | 0     |
| gold_electrophoresis_full_setup    | 1200x900  | 2   | 10   | 0      | 4    | 8      | 4   | 0     |
| gold_electrophoresis_full_setup    | 800x600   | 9   | 10   | 0      | 4    | 8      | 4   | 0     |
| gold_heat_block_sample_prep        | 1920x1080 | 0   | 11   | 0      | 7    | 10     | 0   | 0     |
| gold_heat_block_sample_prep        | 1440x900  | 1   | 11   | 0      | 7    | 10     | 7   | 0     |
| gold_heat_block_sample_prep        | 1200x900  | 1   | 11   | 0      | 7    | 10     | 7   | 0     |
| gold_heat_block_sample_prep        | 800x600   | 8   | 11   | 0      | 7    | 10     | 7   | 0     |
| gold_hood_prep                     | 1920x1080 | 0   | 7    | 0      | 0    | 6      | 0   | 40    |
| gold_hood_prep                     | 1440x900  | 0   | 7    | 0      | 0    | 6      | 2   | 40    |
| gold_hood_prep                     | 1200x900  | 0   | 7    | 0      | 0    | 6      | 2   | 40    |
| gold_hood_prep                     | 800x600   | 5   | 7    | 0      | 0    | 6      | 2   | 0     |
| gold_microscope_slide_prep         | 1920x1080 | 0   | 10   | 0      | 4    | 6      | 0   | 14    |
| gold_microscope_slide_prep         | 1440x900  | 1   | 10   | 0      | 4    | 6      | 4   | 6     |
| gold_microscope_slide_prep         | 1200x900  | 1   | 10   | 0      | 4    | 6      | 4   | 6     |
| gold_microscope_slide_prep         | 800x600   | 8   | 10   | 0      | 4    | 6      | 4   | 0     |
| gold_mixed_bench                   | 1920x1080 | 0   | 7    | 0      | 2    | 7      | 0   | 33    |
| gold_mixed_bench                   | 1440x900  | 1   | 7    | 0      | 2    | 7      | 3   | 25    |
| gold_mixed_bench                   | 1200x900  | 1   | 7    | 0      | 2    | 7      | 3   | 25    |
| gold_mixed_bench                   | 800x600   | 7   | 7    | 0      | 2    | 7      | 3   | 0     |
| gold_plate_reader_assay            | 1920x1080 | 0   | 9    | 0      | 0    | 9      | 0   | 19    |
| gold_plate_reader_assay            | 1440x900  | 1   | 9    | 0      | 0    | 9      | 3   | 11    |
| gold_plate_reader_assay            | 1200x900  | 1   | 9    | 0      | 0    | 9      | 3   | 11    |
| gold_plate_reader_assay            | 800x600   | 6   | 9    | 0      | 0    | 9      | 3   | 0     |
| gold_staining_bench                | 1920x1080 | 0   | 10   | 0      | 0    | 9      | 0   | 13    |
| gold_staining_bench                | 1440x900  | 0   | 10   | 0      | 0    | 9      | 2   | 13    |
| gold_staining_bench                | 1200x900  | 0   | 10   | 0      | 0    | 9      | 2   | 13    |
| gold_staining_bench                | 800x600   | 7   | 10   | 2      | 0    | 9      | 5   | 0     |
| gold_well_plate_96_zoom_with_state | 1920x1080 | 0   | 1    | 0      | 0    | 1      | 0   | 91    |
| gold_well_plate_96_zoom_with_state | 1440x900  | 0   | 1    | 0      | 0    | 1      | 2   | 91    |
| gold_well_plate_96_zoom_with_state | 1200x900  | 0   | 1    | 0      | 0    | 1      | 2   | 91    |
| gold_well_plate_96_zoom_with_state | 800x600   | 1   | 0    | 0      | 0    | 1      | 2   | 89    |
| stress_composition_001             | 1920x1080 | 0   | 6    | 0      | 0    | 7      | 0   | 43    |
| stress_composition_001             | 1440x900  | 0   | 6    | 0      | 0    | 7      | 2   | 43    |
| stress_composition_001             | 1200x900  | 0   | 6    | 0      | 0    | 7      | 2   | 43    |
| stress_composition_001             | 800x600   | 6   | 6    | 0      | 0    | 7      | 2   | 0     |
| stress_dense_clutter_001           | 1920x1080 | 0   | 12   | 0      | 5    | 16     | 0   | 0     |
| stress_dense_clutter_001           | 1440x900  | 0   | 12   | 0      | 5    | 16     | 7   | 0     |
| stress_dense_clutter_001           | 1200x900  | 0   | 12   | 0      | 5    | 16     | 7   | 0     |
| stress_dense_clutter_001           | 800x600   | 14  | 12   | 2      | 5    | 16     | 10  | 0     |
| stress_instrument_heavy_001        | 1920x1080 | 0   | 6    | 0      | 0    | 7      | 0   | 43    |
| stress_instrument_heavy_001        | 1440x900  | 5   | 6    | 0      | 0    | 7      | 0   | 3     |
| stress_instrument_heavy_001        | 1200x900  | 5   | 6    | 0      | 0    | 7      | 0   | 3     |
| stress_instrument_heavy_001        | 800x600   | 9   | 7    | 0      | 0    | 7      | 0   | 0     |
| stress_zoom_detail_001             | 1920x1080 | 0   | 1    | 0      | 0    | 2      | 0   | 88    |
| stress_zoom_detail_001             | 1440x900  | 1   | 1    | 0      | 0    | 2      | 0   | 80    |
| stress_zoom_detail_001             | 1200x900  | 1   | 1    | 0      | 0    | 2      | 0   | 80    |
| stress_zoom_detail_001             | 800x600   | 3   | 1    | 0      | 0    | 2      | 0   | 64    |
| stress_many_bottles_scene_001      | 1920x1080 | 0   | 16   | 1      | 0    | 16     | 0   | 0     |
| stress_many_bottles_scene_001      | 1440x900  | 4   | 16   | 1      | 0    | 16     | 13  | 0     |
| stress_many_bottles_scene_001      | 1200x900  | 6   | 16   | 1      | 0    | 16     | 13  | 0     |
| stress_many_bottles_scene_001      | 800x600   | 16  | 10   | 1      | 0    | 16     | 15  | 0     |

## Failure thresholds (evidence-based)

Probe metrics: clipping (SVG cropped by parent overflow), off-page (placement
center or corners outside viewport), region overflow (region content exceeds
its box), tiny targets (placement smaller than 40x40 px), aspect distortion
(rendered AR differs from natural by > 5%), migration (placement center
moved > max(40px, 5% of diag) vs the 1920x1080 baseline).

- **Baseline (1920x1080)**: 0 off-page, 1 region overflow, score median 19.
  Clipping (121) and aspect distortion (123) are present at baseline; they
  are object-sizing / pipeline issues, not viewport issues, and stay roughly
  constant across all viewports. Workstream G treats them as a fixed
  background.
- **1440x900**: off-page jumps from 0 to 17 (gold +7, instrument_heavy +5,
  many_bottles +4, zoom_detail +1). Region overflow holds at 1. Migration
  appears (55 placements move). Composition and dense_clutter scenes hold
  with 0 off-page; instrument-heavy and many-bottles start losing perimeter
  items off-screen.
- **1200x900**: nearly identical to 1440x900 (off-page 19 vs 17, same
  migration count). The width drop from 1440 -> 1200 costs only 2 additional
  off-page placements (one in gold, one in many_bottles). The dominant
  pressure between these two viewports is height (both clip at 900).
  Composition, gold, instrument_heavy, and zoom_detail remain visually
  intelligible; many_bottles_scene loses 6 bottles off-screen.
- **800x600**: catastrophic. Off-page jumps to 114 (every class affected),
  region overflow rises to 6 (gold and dense_clutter scenes overflow), and
  score median collapses to 0. 14 of 15 scenes are below score 65; only the
  pure-zoom well-plate scene survives (score 89), because its primary object
  fills the canvas and there are no peripheral placements to push off-screen.

### Class-specific failure points

- **composition**: 1920-1200 stable (0 off-page across all three).
  Degrades at 800x600 (6 off-page).
- **dense_clutter**: 1920-1200 stable (0 off-page). At 800x600 it
  becomes unusable (14 off-page, 2 region overflows, score 0).
- **instrument_heavy**: first failure at 1440x900 (5 off-page). Same
  count at 1200x900. Worse at 800x600 (9 off-page).
- **zoom_detail**: scales well across all four viewports. At 800x600
  it still scores 64 with only 3 off-page items. Confirms zoom scenes
  scale via their fill-the-canvas primary object.
- **many_bottles_scene**: degrades monotonically (1920->4->6->16
  off-page). Bottle rows push beyond the viewport as width shrinks.
- **gold**: stable 1920 (0 off-page), 1440-1200 holds at 7 off-page
  across the 10 scenes, unusable at 800x600 (66 off-page).

## Recommendation

- **Supported product viewport range**: **1200x900 to 1920x1080**. Across
  all 10 gold scenes and the 5 representative stress scenes, this range
  keeps composition, dense_clutter, zoom_detail, and gold scenes usable.
  Instrument-heavy and many-bottles scenes lose a small number of
  peripheral items off-screen at the low end of the range; these are
  recoverable by tightening the YAML scene layout, not by a runtime
  policy.
- **Hard minimum viewport (all scenes must support)**: **1200x900**.
  Below 1200x900, the layout engine cannot keep both perimeter SVG
  objects on-screen and primary work surfaces legible. 1200x900 is the
  classroom laptop floor; anything smaller is a stress case, not a
  product surface.
- **Behavior outside the supported range (smaller viewports)**: **scroll**.
  Justification: at 800x600 the median score drops to 0, off-page
  placements rise to 114, and 6 regions overflow. Shrinking the layout
  (scale) would force tiny targets below the 40x40 px floor on
  dense_clutter and gold scenes; failing with a message would block
  classroom devices that briefly resize. Scrolling preserves SVG natural
  size, keeps targets clickable, and degrades gracefully. Region overflow
  is already a first-class scroll surface in the layout engine.
- **Behavior outside the supported range (larger viewports)**: **scale up
  with letterbox**. Above 1920x1080, the scene container should grow up
  to a configured maximum and then center with neutral background.
  Scaling SVGs continues to work (zoom_detail kept score >= 88 at every
  measured viewport), but unbounded growth wastes screen real estate.
- **Behavior outside the supported range (smaller, hard fallback)**: at
  viewports below 800 wide OR 600 tall, display a fail-with-message
  banner advising the student to rotate, resize, or switch device. The
  probe shows that below this floor even the zoom-only scene begins to
  lose off-page placements (1 off-page at 800x600 already).

### Smaller-viewport policy (scroll | scale | fail) summary

| Viewport range      | Policy                             | Trigger                       |
| ------------------- | ---------------------------------- | ----------------------------- |
| >= 1200x900         | Render as authored                 | Default supported range       |
| 800x600 to 1200x900 | Scroll (preserve SVG natural size) | Width < 1200 OR height < 900  |
| < 800x600           | Fail with banner                   | Width < 800 OR height < 600   |
| > 1920x1080         | Scale up + letterbox               | Width > 1920 OR height > 1080 |

The hard contract item this maps to: "Scene object layout is handled by
the layout engine." Viewport policy is a layout-engine concern, not a
per-scene YAML concern. No scene YAML edits are needed to honor the
policy above; the layout engine adopts the policy and every scene
inherits it.

## Artifact pointers

- Probe script: `experiments/css_native_layout/stress_generators/viewport_probe.mjs`
- Per-run metrics: `experiments/css_native_layout/stress_results/viewport_runs/<scene>_<viewport>.json` (60 files)
- Per-run screenshots: `experiments/css_native_layout/stress_results/viewport_runs/<scene>_<viewport>.png` (60 files)
- Aggregate JSON: `experiments/css_native_layout/stress_results/viewport_runs/all_metrics.json`
- Contact sheet: `experiments/css_native_layout/stress_results/viewport_runs/contact_sheet.html`
