# Path B prototype sketch

Pseudocode and call-site analysis for the DOM-first hit-target approach.

## Proposed entry point

A new module `css_native_dom_renderer.ts` that bypasses the
`ComputedItemLayout[]` return entirely for the spike scene and mutates
the scene DOM directly:

```
// pseudocode -- not real TypeScript
export function renderSceneCssNative(
    world: RuntimeWorld,
    sceneId: string,
    sceneRoot: HTMLElement,
): void {
    // 1. Read scene + placements + objects from world.
    // 2. Build CSS Grid container DOM.
    //    - .scene-container.scene--bench
    //    - .region[data-region="work_surface"]
    //    - .placement[data-placement-name="zoom_well_plate_96"]
    //      with data-target-id="well_plate_96"
    // 3. For each well: emit a <div class="well"
    //      data-target-id="well_plate_96.A1"> ... </div>
    //    inside a CSS Grid layout (8 rows x 12 cols).
    // 4. Per-cell fill color resolved from world.materials at render
    //    time, same lookup the well-plate adapter does.
    // 5. No ComputedItemLayout[] returned. No coords computed.
}
```

## How the adapter gate would look

```
// src/scene_runtime/layout/adapter.ts, inside computeSceneLayout
if (sceneId === 'well_plate_96_zoom' && FLAG.css_native) {
    // Path B: render directly, return a sentinel value.
    renderSceneCssNative(world, sceneId, sceneRootHandle);
    return [];  // empty array -- but this BREAKS the consumer.
}
return legacyComputeLayout(...);
```

Returning `[]` is the cleanest "no rects" signal, but the consumer at
../../../../src/scene_runtime/render/scene.ts:229-232
does `layoutMap.get(placement.placement_name)` and throws if the entry
is missing:

```
const layout = layoutMap.get(placement.placement_name);
if (!layout) {
    throw new Error(`renderPlacement: no computed layout for ...`);
}
```

So returning `[]` blows up immediately on the spike scene.

## Call sites that would need to change

To make Path B work without throwing, one of these edits is required
inside the FORBIDDEN files
(../../../../src/scene_runtime/render/scene.ts):

- (a) Wrap the entire `renderPlacement` body in a scene-id branch:
  for `well_plate_96_zoom`, skip the legacy path because the
  CSS-native renderer already mutated the DOM.
- (b) Make the missing-layout error tolerant for the spike scene.
- (c) Refactor `renderScene` to call `renderSceneCssNative` instead
  of building an SVG layout-map for the spike scene.

All three live in `render/scene.ts`. The spike packet forbids edits to
`src/scene_runtime/render/**`.

## Alternative: rects-free ComputedItemLayout shim

Return `ComputedItemLayout[]` with all numeric fields zeroed:

```
return [{
    id: 'zoom_well_plate_96',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    footprint: { ... },
    label: { ... },
}];
```

Consumer trace at
../../../../src/scene_runtime/render/scene.ts:235-253:

- `const x = layout.x;` -> `0`
- `const y = layout.y;` -> `0`
- `const width = layout.width;` -> `0`
- `const height = layout.height;` -> `0`
- `tryRenderWellPlate(placement, objectConfig, group, 0, 0, 0, 0, world)`
  -> well-plate adapter at
  ../../../../src/scene_runtime/adapters/well_plate/render.ts:51-52
  computes `cellWidth = 0 / 12 = 0` and `cellHeight = 0 / 8 = 0`.
- Result: 96 zero-sized `<rect>` cells at `(0, 0)`. SVG renders an
  invisible plate. Click dispatch resolves through `closest()` against
  the underlying CSS-native DOM (which Path B emitted separately), so
  the spike click test would still pass, but the SVG scene re-render
  for `ObjectStateChange` would update an invisible degenerate
  plate. Pixel-diff screenshots fail unless the CSS-native DOM is
  layered above and the SVG layer is hidden by CSS.

## Consumers do not blow up on zero rects -- they render degenerate output

Recorded honestly: zero rects are not a hard runtime error. They are a
silent failure: the SVG layer renders an invisible plate, while the
CSS-native DOM layer (if separately attached) renders the visible plate.
That two-layer arrangement is structurally fragile because:

- `renderScene` calls `tryRenderWellPlate` unconditionally for every
  well-plate placement. The SVG group always exists.
- The CSS-native layer needs a separate DOM mount, which means a new
  entry point outside `adapter.ts` -- i.e. an edit to `render/scene.ts`
  or a new render pipeline entirely.

## Net result

Path B's DOM-first prototype is implementable in isolation as a stand-
alone HTML/JS demo (the NEW0 templates already prove this works). The
prototype problem is integration: making it co-exist with the legacy
SVG render path that the spike packet forbids editing.

The minimal-seam version of Path B is not minimal: it requires either
charter expansion (to allow render/scene.ts edits) or a parallel render
pipeline (which is a broader migration). Path A's synthetic-coordinate
adapter sidesteps both issues and is the recommended spike approach.
