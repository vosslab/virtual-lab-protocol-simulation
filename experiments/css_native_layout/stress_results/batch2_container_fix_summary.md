# NEW3 Batch 2 Workstream AB v2: footprint--container sweep summary

Date: 2026-05-20
Status: BLOCKED (all three candidates produced identical metrics to baseline; no improvement, no regression)
CSS: bench.css RESTORED to canonical (no permanent edit applied)

## Scope and corrected target

Previous AB v1 lane (failed) targeted `.footprint--handheld`, but the renderer at
`experiments/css_native_layout/stress_generators/render_stress_to_html.py:36-40`
maps the C1 culprits (bottle, flask, carboy, cylinder, beaker, erlenmeyer, plate)
to `footprint--container`. `footprint--handheld` is pipettes only.

AB v2 re-targeted `.scene--bench .footprint--container` and its `[data-scene-density="crowded"]` variant.

## Canonical values (captured before sweep)

`.scene--bench .footprint--container` (canonical):

| property | value |
| --- | --- |
| min-width | 220px |
| max-width | 320px |
| min-height | 240px |
| max-height | 360px |
| flex-shrink | 1 |
| flex-grow | 0 |

`.scene-container[data-scene-density="crowded"] .scene--bench .footprint--container`:

| property | value |
| --- | --- |
| min-width | 154px |
| max-width | 224px |
| min-height | 168px |
| max-height | 252px |

## Candidate sweep (subset = 20 scenes from batch2_subset.json)

Only `max-height` (canonical and crowded) was changed. min-width / max-width / min-height left at canonical values.

| candidate | canonical max-h | crowded max-h | cbp | ad_HF | r_ovf | off | total_HF |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline_canonical | 360 | 252 | 186 | 171 | 2 | 0 | 359 |
| container_C1_380_272 | 380 | 272 | 186 | 171 | 2 | 0 | 359 |
| container_C2_400_292 | 400 | 292 | 186 | 171 | 2 | 0 | 359 |
| container_C3_440_332 | 440 | 332 | 186 | 171 | 2 | 0 | 359 |

All three candidates produced **bit-identical** metrics to baseline. No improvement, no regression.

### Per-scene clipped_by_parent (worst 5 in subset)

| scene | baseline | C1 (380/272) | C2 (400/292) | C3 (440/332) |
| --- | --- | --- | --- | --- |
| stress_many_bottles_scene_002 | 17 | 17 | 17 | 17 |
| stress_many_bottles_scene_001 | 16 | 16 | 16 | 16 |
| stress_dense_clutter_010 | 13 | 13 | 13 | 13 |
| stress_dense_clutter_009 | 12 | 12 | 12 | 12 |
| gold_staining_bench | 10 | 10 | 10 | 10 |

## Why container max-height has no effect (binding-constraint analysis)

Evidence from `stress_many_bottles_scene_002` baseline JSON:

- `artwork_vs_card.card_bbox`: `220 x 207` (the `.placement` element)
- `artwork_vs_card.artwork_bbox`: `220 x 240` (the inner `<img>`)
- `clipped_by_parent.clipper`: `DIV.placement`
- `clipped_by_parent.clip_over_px.bottom`: `19`
- `natural_vs_rendered.rendered_height_px`: `240` (== footprint min-height; unchanged across all 3 candidates)
- `region_whitespace.rear_shelf.area`: 438016, width 1888 -> rear_shelf height ~232 px

The inner `.object-graphic.footprint--container` is rendered at its **min-height: 240px**
(not at max-height: 360). Even at canonical max-height: 360, the box renders at 240
because that is the minimum. The container's max-height is never the binding constraint
on these scenes; the binding constraint is the placement wrapper:

```css
.placement {
    flex-shrink: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    max-height: 100%;   /* <- binding */
    overflow: hidden;   /* <- binding */
}
```

Because `.placement` has `max-height: 100%` of the rear_shelf region (which itself is
flex-wrapped at ~232px), the placement is squeezed to 207px (232 region minus padding
and label gap). The footprint-container inside is allowed to render at its 240px
min-height, but the `overflow: hidden` on the placement clips the bottom 19px.
Raising `.footprint--container` max-height changes nothing because:

1. The inner box is already at min-height (240), not max-height (360).
2. The clipping wrapper is `.placement`, not `.footprint--container`.

## Alternative target (recommended follow-up; outside this lane)

The fix has to act on `.placement` or the region row height, not the footprint card.
Two candidate directions for a follow-up lane (each one paragraph; not implemented
here per scope discipline):

### Option ALT-1: relax placement overflow (workstream-C territory)

Drop or relax `overflow: hidden` on `.placement` for composition mode (keep it for
detail mode where it is already `visible`). The trade-off is that overflow will leak
into the next region row in flex-wrap layouts; that may cause inter-region overlap.
A safer variant is `overflow: visible` paired with explicit row gap so wrapped rows
do not collide. This is Patch 1 from workstream C and is intentionally out of scope
for this lane.

### Option ALT-2: relax placement max-height (smaller blast radius)

Remove `max-height: 100%` on `.placement` (keep `overflow: hidden`). The placement
then assumes the height of its children (the 240px footprint min-height plus label).
The rear_shelf row will grow to fit, which preserves the no-crop rule but expands
the rear_shelf row in dense scenes. Risk: rear_shelf overflow into work_surface row
when many rows of containers wrap. Needs a precheck sweep before being adopted.

### Option ALT-3: lower footprint min-height (geometric fit)

Lower `.scene--bench .footprint--container` min-height from 240 to 200 (close to the
207 placement budget) so the inner box stops asking for more space than the wrapper
can give. The trade-off is the bottles render smaller in non-dense scenes too;
aspect_ratio changes for non-square SVGs would need re-evaluation.

Of the three, **ALT-2 is the smallest semantic change** and the most direct fit for a
follow-on AB sweep. ALT-1 has the largest blast radius and overlaps with workstream-C.
ALT-3 changes nominal asset size and risks aspect-distortion regressions elsewhere.

## Artifacts

- Subset baseline precheck: `experiments/css_native_layout/stress_results/precheck_batch2_container_baseline_subset/`
- Candidate sweeps:
  - `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C1_380_272/`
  - `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C2_400_292/`
  - `experiments/css_native_layout/stress_results/precheck_batch2_container_sweep_container_C3_440_332/`
- Aggregated sweep summary JSON: `experiments/css_native_layout/stress_results/batch2_container_sweep_summary.json`
- Orchestrator: `_temp_run_sweep.py` (root-level, underscore-prefixed scratch)
- Evidence files: `_temp_inspect.py`, `_temp_inspect2.py`, `_temp_inspect3.py` (scratch)

## Final state

- bench.css restored to canonical (`git diff experiments/css_native_layout/styles/bench.css` returns empty)
- Failed v1 handheld sweep artifacts preserved per plan:
  - `precheck_batch2_sweep_C1_230_260/`
  - `precheck_batch2_sweep_C2_245_280/`
  - `precheck_batch2_sweep_C3_260_320/`
- No 110-scene precheck or scorecard run was performed because no winner was identified.
- No before/after PNGs were generated because no change is being adopted.

## Handoff

BLOCKED. footprint--container max-height adjustments cannot reduce C1 clipped_by_parent.
The binding constraint is `.placement { max-height: 100%; overflow: hidden }`, not the
footprint container's sizing. Recommend follow-on lane on ALT-2 (relax `.placement
max-height: 100%`) before any further `.footprint--container` tuning.
