# Round 3 R3-ALT runtime label readability (CSS-only variant)

Date: 2026-05-22
Owner: R3-ALT path B (CSS-only) of Round 3 label readability competition.
Plan ref: Round 3 R3-ALT label readability task, competing with the peer
renderer/TS-level path A.
Inputs:

- Baseline audit: [round3_runtime_truth_audit.md](round3_runtime_truth_audit.md)
- Baseline screenshots: `test-results/round3_runtime_truth/*.png`
- Variant screenshots: `test-results/round3_runtime_label_css_variant/*.png`

## Approach summary

Path B is constrained to CSS-only. No edits to TypeScript, the layout
engine, scene YAML, or the asset pipeline. The intervention surface is
the inlined `<style>` block emitted by `pipeline/build_protocol_html.py`,
because each per-protocol HTML shell loads `dist/runtime.bundle.js`
without pulling in `src/scene_runtime/chrome/style.css`. The chrome CSS
was also updated in parallel so the rule lives next to the rest of the
scene-runtime chrome styling, but the rule that actually reaches the
runtime ships through the inlined `<style>` block.

## Diagnostic path before the final rule

The first attempt tried to clamp font-size:

```css
#runtime-root .scene-viewport svg text,
#runtime-root svg text {
	font-size: 10px !important;
	font-weight: 500;
	paint-order: stroke fill;
	stroke: #ffffff;
	stroke-width: 2.5px;
	stroke-linejoin: round;
}
```

A live probe (`getComputedStyle(text).fontSize`) confirmed the rule was
matching every scene label and reporting `10px`. But the visual result
made labels *larger*, not smaller, because scene viewBoxes are tiny
(`mtt_reagent_prep` uses `viewBox="1 5 98 90"`, scenes range roughly
from 98x90 to 1000x700 user-units). With the SVG viewBox transform
applied, CSS `10px` is interpreted in the user-coordinate system, so
10px translated to ~10 user-units against a 90-unit-tall viewBox is
~11% of scene height per label -- well above the layout engine's
authored per-scene font-size, which already varies between 0.375 and 3
user-units across the four mounted scenes.

This rules out any single CSS px font-size clamp: a value safe for one
scene's viewBox is wrong for another. CSS exposes no viewBox-relative
unit, so the variant abandons font-size control entirely and limits
the CSS-only intervention to legibility.

## Final CSS rule (shipped in dist/<protocol>.html)

Inlined in `pipeline/build_protocol_html.py` so it lands in every
generated per-protocol HTML shell:

```css
#runtime-root .scene-viewport svg text,
#runtime-root svg text {
	paint-order: stroke fill;
	stroke: #ffffff;
	stroke-width: 0.35px;
	stroke-linejoin: round;
	font-weight: 600;
}
```

Mirrored (without the `#runtime-root` scope) into
`src/scene_runtime/chrome/style.css` for documentation and so future
runtime hosts that do load chrome CSS pick up the same rule. The HTML
shell rule is authoritative because the runtime bundle does not import
that stylesheet today.

Mechanics:

- `paint-order: stroke fill` draws the stroke behind the fill, so the
  fill silhouette is unbroken and the stroke is the halo around it.
- `stroke: #ffffff` puts a white halo behind every glyph.
- `stroke-width: 0.35px` is intentionally tiny: stroke-width inside an
  SVG with a viewBox transform is also expressed in user-units, so the
  halo scales with the label rather than swamping small text.
- `font-weight: 600` adds enough glyph weight to keep the haloed
  strokes from eating the visible fill on small labels.
- No `font-size` override, no `transform`, no `white-space`. Labels
  remain at their authored per-scene size.

## Before / after screenshots

Four scenes, same picks as the baseline runtime-truth audit so the
visual delta is directly comparable.

| Scene | Baseline (no CSS) | Variant (CSS-only halo) |
| --- | --- | --- |
| `mtt_reagent_prep_bench_workspace` | `test-results/round3_runtime_truth/mtt_reagent_prep_bench_workspace_initial.png` | `test-results/round3_runtime_label_css_variant/mtt_reagent_prep_bench_workspace_initial.png` |
| `mtt_solubilization_readout_plate_reader_workspace` | `test-results/round3_runtime_truth/mtt_plate_reader_workspace_after_entry.png` | `test-results/round3_runtime_label_css_variant/mtt_plate_reader_workspace_after_entry.png` |
| `sdspage_attach_lid_and_leads_workspace` | `test-results/round3_runtime_truth/sdspage_attach_lid_workspace_initial.png` | `test-results/round3_runtime_label_css_variant/sdspage_attach_lid_workspace_initial.png` |
| `sdspage_heat_denature_samples_workspace` | `test-results/round3_runtime_truth/sdspage_heat_block_workspace_initial.png` | `test-results/round3_runtime_label_css_variant/sdspage_heat_block_workspace_initial.png` |

Capture driver: `tests/playwright/_temp_runtime_label_css_variant.mjs`
(temporary, safe to delete). Mirrors `_temp_runtime_truth.mjs` from the
A1 audit but writes to the variant output directory.

## Subjective improvement score

Score: 4 / 5.

Per-scene notes:

- `mtt_reagent_prep_bench_workspace`: Baseline showed overlapping
  giant glyphs ("vorte..." clipped, "MTT solution" running through
  the asset zone, "Micropipette"/"tube" stacked atop one another).
  Variant: each label is clearly readable, only "Vortex" and
  "Micropipette tip box" still clip the right edge because their
  authored font-size of 3 and 1.875 user-units is larger than other
  labels on the same scene; that is a per-scene authoring fix, not a
  CSS-fixable defect.
- `sdspage_heat_denature_samples_workspace`: Baseline showed
  "(4-slot)" + "ladder" + "Heat Block" running into each other and
  the dashed placeholder. Variant: clean stack of "Microtube rack
  (24-slot)" top-left, "Protein ladder tube" small near the tube
  asset, "Heat Block" sized to identify the dashed placeholder it
  labels, and the embedded "Heat Block (closed)" text inside the
  placeholder asset is untouched.
- `mtt_solubilization_readout_plate_reader_workspace`: Baseline
  showed "DMSO container"/"vortex"/"Micropi..." clipping the right
  edge with massive glyphs. Variant: DMSO, Waste container, Vortex,
  Micropipette tip box all sit at their items with halos; the 96-well
  plate placeholder is now visibly a plate, not buried under text.
- `sdspage_attach_lid_and_leads_workspace`: Best legibility gain of
  the four. Lab equipment cluster (Running buffer 10x, Protein ladder
  tube, Buffer recycle bottle, Serological pipette, ddH2O,
  Mini-PROTEAN, p10 gel loading tip box, p100 micropipette, Waste
  container) all readable. Residual: "Electrophoresis"+"Power Supply"
  overlap in the upper banner, and "Gel cassette"+"electrode module"
  collide mid-scene. Both are scene-layout collisions where the
  layout engine placed two large labels at conflicting coordinates.

The halo + per-scene-honored font-size combination eliminates the
"can't tell what's a label vs the artwork" failure mode that dominated
the baseline.

## Residual issues

1. CSS-only cannot fix labels whose authored per-scene font-size is
   too large for their target. `Vortex` (3 user-units in a 98-unit
   viewBox) is a content/layout problem, not a stylesheet problem.
2. CSS-only cannot reposition labels. Where the layout engine places
   two labels on near-identical coordinates (`Electrophoresis` vs
   `Power Supply` in the SDS-PAGE lid-and-leads scene), the halo
   makes both legible but they still overlap horizontally.
3. The halo is white-only. On a future dark theme the same rule would
   need a different stroke colour; this is a known forward-cost
   accepted for the current light-bg scenes.
4. `font-weight: 600` is applied to every scene label including those
   already inside SVG assets (the heat-block placeholder's "Heat
   Block (closed)" text). That made the embedded text bolder than the
   asset author specified. The visible result is acceptable but the
   over-reach is real; a more targeted selector would need a
   `data-scene-label` marker attribute, which is an asset-pipeline
   change outside CSS-only scope.

## Recommendation

Adopt this variant as the immediate quick-win, and **keep it
independently of the peer A path**. The two paths are not exclusive:

- Path B (this variant) cheaply makes existing labels legible and
  ships with one stylesheet edit; cost is bounded; rollback is one
  hunk.
- Path A (renderer/TS) is the only path that can address the residual
  font-size and position issues by changing how labels are emitted.

Suggested merge order:

1. Land this CSS-only rule first (low risk, immediate readability win
   on all 4 mounted scenes).
2. Let path A continue work on font-size capping and position
   anti-collision at the renderer/layout layer.
3. Once path A lands, re-evaluate whether the white halo is still
   needed; it likely stays because halos help any scene that mixes
   labels with coloured assets, but `stroke-width` may shrink.

If only one variant can land, this CSS-only path is the safer pick
because it cannot regress any scene's authored font-size; path A's
renderer change has scope to regress per-scene tuning that the layout
engine already does correctly for several scenes.

## Verification

- ASCII compliance:
  `source source_me.sh && python3 tests/check_ascii_compliance.py
  docs/active_plans/reports/round3_runtime_label_readability_css_variant.md`
  -> PASS (run inline with no findings).
- Markdown link check: `pytest tests/test_markdown_links.py -q`
  -> PASS (links in this report resolve under repo root).

## Boundaries respected

- Read-only on production source for everything except
  `pipeline/build_protocol_html.py` (one inlined `<style>` block) and
  `src/scene_runtime/chrome/style.css` (documentation mirror).
- No edits to TypeScript runtime, layout engine, scene YAML, asset
  pipeline, generated data, or tests other than the one new
  walker harness under `tests/playwright/_temp_runtime_label_css_variant.mjs`.
- No `git commit`. No `./check_codebase.sh`. No `pytest tests/` beyond
  the markdown-links check.

## Reproduce

```
bash build_github_pages.sh
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --all
node tests/playwright/_temp_runtime_label_css_variant.mjs
```

Output lands in `test-results/round3_runtime_label_css_variant/`.
