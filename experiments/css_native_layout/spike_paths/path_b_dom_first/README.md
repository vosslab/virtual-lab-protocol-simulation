# Path B: DOM-first hit-target

## Summary

Path B renders `well_plate_96_zoom` as CSS-native DOM and resolves click
targets entirely through `data-target-id` plus `Element.closest()`, with no
coordinate emission from the layout adapter. The hypothesis is that the
runtime already does DOM-based hit testing (see
../../../../src/scene_runtime/dispatch/click.ts),
so if the CSS-native renderer emits the same `data-target-id` attributes,
the click pipeline works without any coordinate output. The adapter's
`ComputedItemLayout[]` return shape would be eliminated for the spike scene
or stubbed to a rects-free placeholder.

## Production files this path would touch

- ../../../../src/scene_runtime/layout/adapter.ts:32-90
  gate on `sceneId === 'well_plate_96_zoom'` and dispatch to a DOM-first
  renderer instead of `legacyComputeLayout`.
- ../../../../src/scene_runtime/render/scene.ts:235-238
  the sole external consumer of `layout.x`, `layout.y`, `layout.width`,
  `layout.height`. Path B must either branch this code path or have the
  CSS-native renderer take over rendering entirely for the spike scene.
- ../../../../src/scene_runtime/render/scene.ts:253
  forwards `x, y, width, height` into the well-plate adapter; same branch
  point applies.
- ../../../../src/scene_runtime/adapters/well_plate/render.ts:37-46
  signature accepts `x, y, width, height` as parameters. Path B does not
  edit this file but must short-circuit its caller so the function is not
  invoked for the spike scene (or pass synthetic zero rects, which the
  adapter would then propagate to per-cell SVG `<rect>` positions, breaking
  rendering).

## Per-feature analysis

- Hit testing without rects: feasible. The capture-phase click handler in
  ../../../../src/scene_runtime/dispatch/click.ts
  uses `closest('[data-target-id]')` exclusively; it reads no
  `ComputedItemLayout` field. CSS-native DOM that carries the same
  `data-target-id` attributes inherits this behavior with zero changes.
- Cursor-attach without rects: feasible. `applyCursorAttach` in
  ../../../../src/scene_runtime/render/apply.ts:149-198
  is state-only (writes `cursorState.attachedTo`); it never reads
  `layout.x` or `layout.y`. No rect dependence here.
- `ObjectStateChange` re-render: requires the CSS-native render entry
  to be invoked by the same `renderScene` entry the legacy path uses.
  Achievable only if Path B routes its rendering through a branch
  inside `render/scene.ts` (or replaces the entry for the spike scene).
  That branch lives outside `layout/adapter.ts` and therefore violates
  the "one conditional in adapter.ts" seam.
- Adapter return contract: Path B's natural shape is `void` (the
  renderer mutates the DOM directly) or `ComputedItemLayout[]` with all
  rects zeroed. Returning zeroed rects breaks
  ../../../../src/scene_runtime/render/scene.ts:235-238
  for the spike scene because the SVG `<g>` group is positioned at
  `(0, 0)` with zero `width`/`height`, and the well-plate adapter then
  divides zero width across 12 columns. Result: a degenerate scene that
  passes click dispatch but renders no visible cells.
- Rollback complexity: similar to Path A in revert count (one PR, one
  flag), but the change set is broader because at least
  `render/scene.ts` needs a branch. Spike packet forbids
  `render/**`. So Path B cannot ship under the current spike charter
  without a charter amendment.
- Precheck expectation: precheck pipeline reads emitted DOM only.
  Path B should pass precheck cleanly if the CSS-native DOM matches
  [../../spike_fixtures/expected_dom_selectors.md](../../spike_fixtures/expected_dom_selectors.md).
- Screenshot expectation: pixel parity is uncertain. The well-plate
  adapter currently lays out 96 wells via SVG `<rect>` at integer
  pixels; the CSS-native DOM lays them out via CSS Grid. Sub-pixel
  drift is plausible. Within the 5 percent tolerance noted in the
  packet, parity is likely but unproven.

## Key risk: layout.x / .y consumer count

Only one production call site reads `layout.x`, `layout.y`, `layout.width`,
or `layout.height` from a `ComputedItemLayout`:

- ../../../../src/scene_runtime/render/scene.ts:235-238
  inside `renderPlacement`. It reads all four fields, forwards them to
  the well-plate adapter (line 253) and to non-well-plate placements
  (lines 278 onward for SVG asset insertion).

See [layout_xy_consumers.md](layout_xy_consumers.md) for the full call
site list.

The single-consumer count looks attractive for "minimal seam", but the
consumer is in `render/scene.ts`, which the spike packet forbids editing.
Path B cannot bypass this constraint with a rects-free adapter return:
the consumer reads the rect fields unconditionally for every placement,
including the spike scene's placement.

## Recommendation: reject

Path B is structurally sound (DOM-first hit testing already works in the
runtime, and `closest()` ignores coordinates) but it cannot fit under the
"one conditional in adapter.ts" charter because the only external
coordinate consumer lives in a forbidden file
(../../../../src/scene_runtime/render/scene.ts).

To make Path B viable the charter would have to expand to permit a
second conditional in `render/scene.ts` that short-circuits coordinate
reads for the spike scene, plus a way for the CSS-native renderer to
mutate the scene DOM directly. That is a broader migration, not a
spike-scoped seam.

Path A's synthetic-coordinate strategy preserves the adapter return
contract and keeps the seam single-file. Path B's strengths (DOM-first,
zero coordinate dependence) become available naturally once Path A
proves out and a follow-up plan picks up the `ComputedItemLayout`
consumer reduction as separate work.

## Failure-mode honesty

This investigation found no general-coordinate-solver requirement in
Path B. The browser does the layout; Path B only proposes to not emit
coordinates. The failure is not "spike needs a TS coordinate solver" --
the failure is "spike needs to edit render/scene.ts", which the charter
forbids.
