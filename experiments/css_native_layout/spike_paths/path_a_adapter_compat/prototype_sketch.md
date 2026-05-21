# Path A prototype sketch

## Runtime requirement

This path requires a real DOM render step. The CSS-native adapter must
attach a scaffold node to `document.body` (or a hidden offscreen
container) so the browser runs CSS Grid / Flex layout, then read
`getBoundingClientRect()` per placement, then tear the scaffold down. If
the implementation tries to derive rects without a real DOM render
(synthesizing track sizes, gap math, or content fit in TypeScript), the
spike has slipped into reinventing the layout engine and must STOP per
the failure conditions in the implementation packet.

The spike walker runs under Playwright, so a real DOM is always
available. There is no headless-without-DOM mode to support.

## Pseudocode shape

```text
// src/scene_runtime/layout/css_native_adapter.ts

import { ComputedItemLayout, RuntimeWorld } from '../types';
import { ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE } from './feature_flags';

export function computeSceneLayoutCssNative(
    world: RuntimeWorld,
    sceneId: string,
    viewportW: number,
    viewportH: number,
): ComputedItemLayout[] {

    // INPUT 1: resolved scene + placements from runtime world
    const scene = world.scenes[sceneId];
    const placements = scene.placements;

    // INPUT 2: object specs (label text, footprint class)
    // INPUT 3: viewport dimensions (sizing the scaffold container)

    // STEP 1: build a detached scaffold root mirroring the NEW0 template.
    // Markup is generated from the manifest + the scene region list.
    // No coordinate fields are read from the manifest.
    const scaffold = document.createElement('div');
    scaffold.className = 'scene-container scene--bench scene-mode--detail';
    scaffold.style.width = viewportW + 'px';
    scaffold.style.height = viewportH + 'px';
    scaffold.style.position = 'absolute';
    scaffold.style.left = '-99999px';   // offscreen
    scaffold.style.visibility = 'hidden';

    // STEP 2: scaffold each region as a child div with the same
    //         data-region attribute the production renderer would emit.
    for (const region of scene.regions) {
        const regionEl = document.createElement('div');
        regionEl.className = 'region region--' + region.name;
        regionEl.dataset.region = region.name;
        scaffold.appendChild(regionEl);
    }

    // STEP 3: scaffold each placement inside its region, tagged with
    //         data-placement / data-object-name. No coordinates.
    const placementEls = new Map<string, HTMLElement>();
    for (const p of placements) {
        const host = scaffoldRegionFor(p.region, scaffold);
        const el = document.createElement('div');
        el.className = 'placement';
        el.dataset.placement = p.placement_name;
        el.dataset.objectName = p.object_name;
        host.appendChild(el);
        placementEls.set(p.placement_name, el);
    }

    // STEP 4: attach scaffold so the browser runs CSS Grid/Flex layout.
    document.body.appendChild(scaffold);

    // STEP 5: per placement, measure the rect produced by the browser
    //         and round to integer pixels at the adapter boundary.
    const layouts: ComputedItemLayout[] = [];
    for (const p of placements) {
        const el = placementEls.get(p.placement_name)!;
        const rect = el.getBoundingClientRect();
        const scaffoldRect = scaffold.getBoundingClientRect();
        const layout: ComputedItemLayout = {
            id: p.placement_name,
            x: Math.round(rect.left - scaffoldRect.left),
            y: Math.round(rect.top  - scaffoldRect.top),
            width:  Math.round(rect.width),
            height: Math.round(rect.height),
            footprint: Math.round(rect.width * rect.height),
            tooltip: world.objects[p.object_name].label ?? '',
            labelLines: [p.label ?? ''],
            labelX: Math.round(rect.left - scaffoldRect.left),
            labelY: Math.round(rect.bottom - scaffoldRect.top + 10),
            labelWidth: Math.round(rect.width),
            labelMultiline: false,
        };
        layouts.push(layout);
    }

    // STEP 6: tear down the scaffold so re-entry stays idempotent.
    document.body.removeChild(scaffold);

    // OUTPUT: ComputedItemLayout[], integer-pixel rects, manifest is
    //         not mutated, no coordinates were read from author YAML.
    return layouts;
}
```

## Inputs / intermediate state / outputs

- Inputs read:
  - `world.scenes[sceneId]` (scene + placements + region list)
  - `world.objects[*]` (label text)
  - `viewportW`, `viewportH`
  - CSS rules from already-loaded `bench.css`, `instrument.css`, `hood.css`
- Intermediate state constructed:
  - One detached `HTMLDivElement` scaffold
  - One child element per region
  - One child element per placement
- State NOT constructed:
  - No coordinate cache
  - No per-track sizing table
  - No persisted layout snapshot
- Outputs:
  - `ComputedItemLayout[]` returned to the caller, integer pixels.

## Stop condition

If the implementer finds themselves writing any of the following, this
path has failed and a stop-reason file must be added before continuing:

- Track-sizing math (column widths, row heights computed in TS)
- Gap distribution math (computing spacing between placements)
- Content-fit logic (deciding how big a placement "should" be)
- Any pure function that returns a rect without consulting
  `getBoundingClientRect()` on a real DOM node
