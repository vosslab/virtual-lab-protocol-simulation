# Round 3 C1: Static-template hardcoding audit

## Context

Round 3, Workstream C1, of the magical-whale plan. The work investigates why
static-template visual evidence diverges from production-runtime evidence. The
working hypothesis: static templates hardcode sizes, viewport dimensions, and
asset names, bypassing the runtime's `ASSET_SPECS` lookup path
(`generated/object_data.ts`) and the `generated/svg_manifest.ts` alias map. C1
locates the bypass points. Output feeds C3 (render-path matrix) and Batch F1
(decision report).

This audit is read-only. No template, script, or generator was modified.

## Summary

- Static-template files audited: 89.
- Bypass findings: 99+ across 4 categories.
- Evidence-role tally: 80 static-only / 20 gold-scene reference / 0 runtime /
  8 showcase.
- Critical insight: static hardcoding is evidence of divergence from the
  runtime path; it is not evidence of runtime behavior. Any visual claim
  ("no-crop OK", "scene looks good") sourced from these templates speaks only
  to the static-template render, not to what users see in the live runtime.

## Top 3 most damaging bypasses

These three explain most of the runtime-vs-static divergence.

### 1. CSS footprint classes hardcode min/max width and height

File: `experiments/css_native_layout/styles/bench.css`, lines 190-247 (base
footprint classes) and lines 250-304 (crowded-density modifier).

Mechanism: the six semantic footprint classes (`footprint--small-tool`,
`footprint--handheld`, `footprint--container`, `footprint--rack`,
`footprint--instrument`, `footprint--large-equipment`) bind min-width,
max-width, min-height, max-height to literal pixel values in the stylesheet.
Example: `.scene--bench .footprint--container` at line 210 sets
`min-width: 220px; max-width: 320px; min-height: 240px; max-height: 360px`.

Shadows: `ASSET_SPECS.default_width` and `display_width_cm` in
`generated/object_data.ts`. The runtime path computes display size per asset
from those fields. The CSS class assigns a category-wide range regardless of
which asset lives inside the placement.

Why this is damaging: a placement that displays an asset whose
`default_width` would exceed the class max is silently capped by CSS; one
whose `default_width` is smaller than the class min is silently inflated.
Either way the rendered size in static templates is the CSS clamp, not the
runtime-emitted size, and a static screenshot cannot detect the mismatch.

### 2. Viewport fixed at 1920x1080 in the scene container

File: `experiments/css_native_layout/styles/bench.css`, lines 62-74.

Mechanism: `.scene-container` declares `width: 1920px; height: 1080px;
overflow: auto;` with the grid track template
`grid-template-rows: 100px 1fr 100px 150px 0px;` (line 65). The
`@media (max-width: 1920px)` block at line 367 only relaxes `width` to
`auto`; the row template and absolute pixel sizes remain.

Shadows: the runtime viewport, which is sized to the browser window and to
the scene's declared placement footprints (not to a fixed 1920x1080 box).

Why this is damaging: static screenshots are captured at a viewport size
that the runtime never uses unscaled. Crop, scroll, and overflow behavior
observed in the static templates is the behavior of this fixed box, not the
runtime viewport. Any "no-crop" claim from a 1920x1080 static render does
not transfer to the production runtime.

### 3. Crowded density modifier hardcodes scaled pixel ranges

File: `experiments/css_native_layout/styles/bench.css`, lines 250-304.

Mechanism: `.scene-container[data-scene-density="crowded"]` overrides each
footprint class with a second hardcoded min/max pair. Example: lines 263-270
override `footprint--handheld` to
`min-width: 63px; max-width: 91px; min-height: 77px; max-height: 112px`.
The 0.60x / 0.70x scaling described in the comment at line 249 is baked in
as literal numbers; the modifier does not read a density factor at runtime.

Shadows: any runtime-level density or scale parameter that the production
path would apply per scene. The CSS branch fork is selected by an
attribute set on the static template; the runtime cannot use the same
mechanism to express density without round-tripping through this attribute,
and the values are not recomputed from `ASSET_SPECS`.

Why this is damaging: a "crowded" static template carries a second, deeper
layer of hardcoding (the 0.60x/0.70x literals) on top of the base footprint
hardcoding. Visual evidence from `data-scene-density="crowded"` templates is
two steps removed from any runtime-computed sizing.

## Bypass categories

| Category                  | Mechanism                                                                                  | Where                                                                          | Approx count |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------ |
| CSS footprint hardcoding  | Footprint class binds min/max width and height to literal px values, including density variant. | `experiments/css_native_layout/styles/bench.css` and sibling theme stylesheets | 40+          |
| Viewport size fixing      | `.scene-container width: 1920px; height: 1080px`; grid rows in absolute px.                | Same stylesheet family.                                                        | 7            |
| Inline SVG galleries      | Static `.html` files embed `<svg>` markup directly with hardcoded `width=`, `height=`, `viewBox=`. | `experiments/css_native_layout/*.html`, `test-results/*.html`.                 | 30+          |
| HTML template markup      | Object placeholders carry inline `width=`, `height=`, `transform="scale(...)"`, or `style="width: <px>"`. | Same `.html` files plus template-generator output.                             | 20+          |

## Shadowed runtime data sources

Each bypass category hides a specific source of truth from the static render.

1. `ASSET_SPECS.default_width` (in `generated/object_data.ts`): the per-asset
   intrinsic display width. CSS footprint classes shadow this with a
   category min/max clamp; inline SVG `width=` attributes shadow it with a
   literal pixel number.
2. `ASSET_SPECS.display_width_cm`: the centimetres-to-pixels display
   conversion used to size the asset in scene context. No static template
   reads this; the CSS clamp is the only sizing input.
3. SVG `viewBox` aspect ratio (from the source asset under `assets/`):
   `viewBox="..."` baked into inline SVGs in static `.html` files
   substitutes a snapshot aspect for the live asset's aspect. If the asset
   is later normalized or revised, the static template will not pick up the
   change.
4. Runtime viewport and zone dimensions: the live runtime sizes the scene
   viewport and per-region zones from the active scene's declared
   placements. Static templates use the fixed `1920x1080` scene container
   and the literal `grid-template-rows: 100px 1fr 100px 150px 0px;` (line
   65) instead.

## Root-cause analysis: why static differs from runtime

Two render paths exist, and they bind sizing data at different times:

- Static template render path. Sizing is bound at authoring time. Each
  footprint class in the stylesheet carries min/max pixels; the viewport is
  a fixed `1920x1080` container; inline SVG markup carries
  `width=`/`height=`/`viewBox=` directly. The browser then composes a
  rendered scene by reading immutable CSS class declarations and
  hand-authored attributes. Nothing on this path reads `generated/object_data.ts`
  or `generated/svg_manifest.ts`.

- Production runtime render path. Sizing is bound at runtime. The runtime
  reads `ASSET_SPECS` for the current asset, resolves the alias through
  `generated/svg_manifest.ts`, and emits computed inline styles for the
  placement. The footprint category may still bound the placement, but the
  computed width/height comes from per-asset data.

The structural reason static differs from runtime is the binding layer:
immutable CSS class binding vs. computed inline styles. CSS classes cannot
read `ASSET_SPECS`, so the static path cannot reach the same numbers the
runtime emits. A static-template screenshot is therefore evidence about the
stylesheet plus the inline markup, not about the runtime's sizing
decisions.

A secondary effect: because static templates carry their own snapshots of
asset markup (inline SVG), they are also stale with respect to any asset
normalization that has happened in `assets/` since the snapshot was
captured. Runtime evidence picks up the current asset; static evidence
picks up the snapshot.

## Evidence-role tally

The 89 audited files split by how they are used downstream:

- 80 static-only: rendered only from the static template path; not
  cross-referenced by runtime evidence.
- 20 gold-scene reference: cited in gold-scene comparison reports as the
  target render the runtime is supposed to match. These are the most
  load-bearing static templates and the most consequential to mis-trust.
- 0 runtime: no audited static template is sourced from a runtime render.
- 8 showcase: rendered for visual-polish or demo reports
  (`docs/active_plans/reports/`), not for correctness gating.

Categories overlap; a gold-scene file is also a static-only file. The
counts reflect the role each file plays in downstream reports.

## Critical insight

Static hardcoding is evidence of divergence, not evidence of runtime
behavior. A "no-crop OK" screenshot taken from
`experiments/css_native_layout/*.html` proves only that the CSS clamps and
inline SVG snapshots in that file render without crop at 1920x1080. It does
not prove the runtime renders without crop, because the runtime never
reaches the same CSS class numbers or the same inline SVG markup. Any
acceptance gate that consumes static-template screenshots as a stand-in for
runtime behavior is consuming the wrong signal.

The fix direction (out of scope for this audit) is to either route static
templates through the same `ASSET_SPECS` path as the runtime, or to mark
static templates as showcase-only and exclude them from acceptance gating.

## Related references

- PRIMARY_CONTRACT.md: "Scientific SVG assets must never be cropped" rule.
- PRIMARY_DESIGN.md: visual-integrity section.
- PRIMARY_SPEC.md: scene-vocabulary boundary and
  layout-engine ownership of placement.
