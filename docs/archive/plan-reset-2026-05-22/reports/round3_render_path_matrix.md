# Round 3 C3 render path matrix

Context: Round 3, check C3. This report enumerates the three render paths used
to produce scene visuals in the repo, identifies the inputs each path consumes,
and assigns a trust level to each. The motivating question is which path is
authoritative for visual acceptance and which are supporting references.

## Render path matrix

| Render path | Inputs consumed | Asset source | Sizing source | Screenshot source |
| --- | --- | --- | --- | --- |
| Production runtime (HIGH trust) | `generated/object_data.ts` + `generated/scene_data.ts` | `generated/svg_assets/index.ts` barrel | `ASSET_SPECS` `layout.default_width` plus computed aspect in [layout_engine.ts](../../../src/scene_runtime/layout/layout_engine.ts) lines 404-412 | Playwright walker [walker.mjs](../../../tests/playwright/walker.mjs) against `dist/index.html` |
| Static templates (MEDIUM trust) | Hand-authored HTML at `experiments/css_native_layout/templates/*.html` | Direct `<img src>` refs to `assets/equipment/*.svg` | Hardcoded CSS `.footprint--*` classes in `experiments/css_native_layout/styles/bench.css` | Direct browser or Playwright `file://` URLs |
| Stress static HTML (MEDIUM trust) | Experiment-local YAML at `experiments/css_native_layout/stress_scenes/{gold,generated}/*.yaml` plus `experiments/css_native_layout/object_footprints.yaml` | File-based with `_placeholder.svg` fallback | Experiment-local `object_footprints.yaml` CSS class mapping | `render_stress_to_html.py` output |

Trust column (collapsed into the path label above): HIGH for the production
runtime, MEDIUM for both static paths.

## Key divergence points

- Asset resolution: production reads SVGs through the generated
  `svg_assets/index.ts` barrel, so missing assets are build-time failures;
  the two static paths reach the filesystem directly and silently substitute
  `_placeholder.svg` when an asset is absent.
- Sizing source: production sizing is computed from `ASSET_SPECS`
  `layout.default_width` plus measured aspect ratio in
  [layout_engine.ts](../../../src/scene_runtime/layout/layout_engine.ts)
  lines 404-412; static paths use hand-tuned CSS classes
  (`.footprint--*`) or an experiment-local footprint YAML that has no
  guaranteed relationship to `ASSET_SPECS`.
- Scene composition: production composes scenes from `generated/scene_data.ts`
  driven by the layout engine; the templates path hardcodes layout in HTML and
  the stress path resolves YAML through `render_stress_to_html.py`, a separate
  renderer with its own conventions.
- Screenshot path: production evidence comes from the Playwright walker
  against the built `dist/` bundle; the static paths can be opened directly
  in a browser or via `file://`, which bypasses the build step and the
  walker contract.
- Drift surface: the static paths do not consume `ASSET_SPECS`, the layout
  engine, or `generated/scene_data.ts`, so any production change to those
  inputs leaves the static renders stale without a build-time signal.

## Trust verdict

Only the production runtime path is authoritative for visual acceptance.
A mini-protocol is complete only when the production runtime produces the
correct visible result under the Playwright walker against `dist/index.html`.

The static template path and the stress static HTML path are supporting
visual references. They are useful for layout exploration, CSS prototyping,
and stress-testing footprint math in isolation, but they must not be used
as evidence that a scene is correct in the production runtime. A passing
static render is not a substitute for a passing walker run, and a failing
static render is not by itself a production regression.
