# Path A: Adapter compatibility

## Summary

Path A adds a CSS-native adapter module that intercepts `computeSceneLayout` in
`src/scene_runtime/layout/adapter.ts` only for `well_plate_96_zoom`. The adapter
performs a real DOM render (CSS Grid/Flex layout) inside the same document the
runtime already uses, then reads `getBoundingClientRect()` per placement and
returns `ComputedItemLayout[]` with integer-pixel rects. The closed NEW1
manifest stays coordinate-free; numeric rects exist only as compatibility
output for the legacy renderer, dispatch, and CursorAttach paths. The seam is
one conditional, one new module, one named feature flag, and one revert to roll
back.

## Production files this path would touch

- `src/scene_runtime/layout/adapter.ts:32-90` -- add one gated conditional
  before the `legacyComputeLayout(...)` call inside `computeSceneLayout(...)`.
  Estimated diff: 4-6 lines.
- `src/scene_runtime/layout/css_native_adapter.ts` -- NEW. Exports
  `computeSceneLayoutCssNative(world, sceneId, viewportW, viewportH)
: ComputedItemLayout[]`. Estimated size: ~80-120 lines including the DOM
  render helper.
- `src/scene_runtime/layout/feature_flags.ts` -- NEW (optional). Holds
  `export const ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE = false;`. May be
  inlined in `css_native_adapter.ts` instead.

No other production files are touched. Dispatch, render/apply, per-adapter
well_plate code, loader, pipeline, validation, contract, specs, and scene YAML
all remain untouched.

## Per-feature analysis

### Adapter signature compatibility

`computeSceneLayoutCssNative` returns `ComputedItemLayout[]` (see
[../../../../src/scene_runtime/layout/types.ts](../../../../src/scene_runtime/layout/types.ts)
lines 109-122) with the same field set the legacy path emits today. Callers
inside `render/scene.ts` and `adapters/well_plate/render.ts` consume opaque
`x`, `y`, `width`, `height`, `footprint`, `label*` fields and never need to
know which adapter produced them.

### Hit testing

Dispatch in `src/scene_runtime/dispatch/click.ts:29-79` uses `data-target-id`
attributes plus `Element.closest()`. Path A keeps the legacy renderer in
charge of emitting those attributes; the CSS-native step only changes how
rects are computed. Hit testing is unchanged.

### Cursor attach

`CursorAttach` handlers in `src/scene_runtime/render/apply.ts:149-198` rely on
state plus data attributes, not on `ComputedItemLayout.x/y`. Synthetic rects
returned by Path A keep `x` and `y` populated so any latent consumer that
reads them continues to work. No new cursor coordinate code.

### ObjectStateChange

State mutation followed by re-render at
`src/scene_runtime/render/apply.ts:31-111` and
`src/scene_runtime/adapters/well_plate/render.ts:61-113` is the same entry
point. Path A re-runs `computeSceneLayout` on re-render, which re-enters the
gated CSS-native function and re-measures rects. No new re-render branching.

### Re-render path

Re-render flows through the same `computeSceneLayout` entry point. The
CSS-native adapter must be idempotent and cheap on re-entry: a hidden render
target (a detached scaffold node attached to `document.body` with
`visibility: hidden`) is constructed, measured, and torn down per call. For
one placement (`zoom_well_plate_96`) this is trivial; for full plate detail,
measurement cost is dominated by browser layout, not JS.

### Rollback complexity

Trivial. One revert removes the conditional, the new module, the flag, and
the optional flag module. No schema or YAML to migrate.

### Precheck expectation

Precheck compares the spike-rendered template against the legacy renderer
output for the same scene. Because rects are derived from the actual NEW0
template at
[../../templates/well_plate_96_zoom.html](../../templates/well_plate_96_zoom.html)
and `bench.css` / `instrument.css`, precheck should land at PASS_TEMPLATE
when the synthetic rects round to the same integer pixels as the legacy
output for the same viewport. Sub-pixel drift in track sizing is the known
risk; spike must verify across the production viewport range.

### Screenshot expectation

Screenshots come from the Playwright walker. Path A renders through the
existing render entry point, so screenshots are produced normally. The spike
walker pinned at the paths in
[../../spike_fixtures/expected_screenshot_paths.md](../../spike_fixtures/expected_screenshot_paths.md)
remains valid.

## Risk assessment

The "general coordinate solver" failure mode triggers if any of these
appear during implementation:

- The CSS-native adapter computes track sizes, gap distribution, or
  content-fit widths in TypeScript instead of letting the browser run CSS
  layout.
- The adapter synthesizes rects without a real DOM render step
  (`document.body.appendChild` + measurement).
- Rects are derived from manifest fields rather than from
  `getBoundingClientRect()`.
- The adapter introduces fields on the closed NEW1 manifest to back-feed
  coordinate data.
- Re-render requires reading cached pixel rects from a persisted source.

Path A avoids these by binding measurement to the browser CSS engine and
treating the manifest as a coordinate-free declarative input. The remaining
risk is sub-pixel drift between CSS Grid track output and legacy engine
output, mitigated by integer rounding at the adapter boundary.

## Recommendation

Keep. Path A is the smallest production seam compatible with the existing
`ComputedItemLayout[]` consumer contract, has trivial rollback, and does not
require new render-side branching.

Implementation outcome: shipped function signature is compute_scene_layout_css_native(world, scene_name, viewport_width, viewport_height) (snake_case throughout). See docs/active_plans/new1_well_plate_96_zoom_spike_result.md and docs/CHANGELOG.md (2026-05-19).
