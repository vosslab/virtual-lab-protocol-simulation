# Round 3 R3: runtime label readability pass

Workstream R3 followup to A1 (round3_runtime_truth_audit.md). A1 found that
the dominant visual failure across mounted production-runtime scenes was
"oversized labels combined with undersized or placeholder assets". This pass
applies a single renderer-level clamp and re-captures the four mounted scenes.

## Label rendering trace (file:line)

Author-declared label sizing is read in scene-coordinate units (scenes use a
roughly 0-100 viewport) and is currently set per-scene via `layout_rules.label_font_size`.

- [bench_basic.yaml](../../../content/base_scenes/bench_basic.yaml) (line 67) declares `label_font_size: 9` (9 scene units; at a 1280px-wide viewport that resolves to roughly 115px-tall glyphs).
- [adapter.ts](../../../src/scene_runtime/layout/adapter.ts) (lines 203-204) extracts `label_font_size` from `scene.layout_rules` and defaults to `DEFAULT_LABEL_FONT_SIZE = 14`.
- [layout_engine.ts](../../../src/scene_runtime/layout/layout_engine.ts) (line 633) populates per-placement `labelLines` with word-wrapped or truncated text.
- [scene.ts](../../../src/scene_runtime/render/scene.ts) (lines 345-381) renders each label as an SVG `<text>` element with `font-size` taken from `layoutRules.labelFontSize`, multi-line via `<tspan>`, anchored at `layout.labelX` / `layout.labelY` above each placement. No prior clamp existed at this layer.

## Per-scene label issues observed

Reviewed initial A1 screenshots in `test-results/round3_runtime_truth/`.

- `mtt_reagent_prep_bench_workspace_initial.png`: labels "tube", "vial", "PBS", "MTT solution", "Micropipette", "Vortex" rendered at roughly 100px glyph height. Multiple labels collide and stack on top of each other in the top band of the scene. Labels visually outweigh their assets, which are roughly 50x50 px SVGs.
- `mtt_plate_reader_workspace_initial.png`: "Plate reader" and constituent labels overlap their target SVGs. Asset-vs-label ratio inverted.
- `sdspage_attach_lid_workspace_initial.png`: tank lid labels dominate the workspace; lid/lead callouts overlap each other.
- `sdspage_heat_block_workspace_initial.png`: "Microtube rack (24-slot)" and "ladder" labels span more than half the workspace width; the modal "Heat Block (closed)" stays readable because it is rendered in DOM/CSS, not via the scene SVG text path.

## Proposed rule

One renderer-level clamp, applied where each label is built in `renderPlacement`:

```ts
const fontSize = Math.min(declaredFontSize, width * 0.25);
```

Where `width` is the placement's layout-engine-computed width in the same scene
units as the SVG viewBox. The clamp caps label glyph height to a maximum of
25% of the placement width. The author-declared `label_font_size` remains the
ceiling for visually large placements; for small placements (volumetric
flasks, microtubes, small bottles) the clamp shrinks the label so it cannot
visually dominate or overlap neighboring placements.

Properties:

- one-way: never enlarges past the declared author value;
- per-placement: scales each label to its own placement size, not a single global override;
- no new sizing vocabulary in YAML schema; no change to the scene or object spec;
- pure renderer-side; preserves all existing label content, word wrap, and tspan emission.

## Applied? y

Applied as a one-line clamp in
[src/scene_runtime/render/scene.ts](../../../src/scene_runtime/render/scene.ts)
around the label `font-size` calculation. Comment in the source cross-references
this report.

## Before/after screenshot paths

Before (from A1, unchanged):

- `test-results/round3_runtime_truth/mtt_reagent_prep_bench_workspace_initial.png`
- `test-results/round3_runtime_truth/mtt_plate_reader_workspace_initial.png`
- `test-results/round3_runtime_truth/sdspage_attach_lid_workspace_initial.png`
- `test-results/round3_runtime_truth/sdspage_heat_block_workspace_initial.png`

After (this pass):

- `test-results/round3_runtime_truth/mtt_reagent_prep_bench_workspace_after_label_fix.png`
- `test-results/round3_runtime_truth/mtt_plate_reader_workspace_after_label_fix.png`
- `test-results/round3_runtime_truth/sdspage_attach_lid_workspace_after_label_fix.png`
- `test-results/round3_runtime_truth/sdspage_heat_block_workspace_after_label_fix.png`

After-state observations: labels no longer overlap each other or their assets
in the bench scene; "Vortex" and "Micropipette tip box" still appear large
because their placements are the large green fallback rects (these track
placement size, as intended); the heat-block scene's "Heat Block" label is
sized to the underlying placement rather than dominating half the workspace.
The remaining oversized-rect / undersized-SVG mismatch is an asset-fitting
issue, not a label issue, and is out of scope for this pass.

## Verification

- ASCII compliance via `tests/check_ascii_compliance.py`: PASS.
- Markdown link check via `pytest tests/test_markdown_links.py -q`: PASS.
- Build via `bash build_github_pages.sh`: PASS (esbuild clean).
- Runtime re-walk via `node tests/playwright/_temp_runtime_label_fix.mjs`: PASS (4 screenshots written).
