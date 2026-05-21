# Path C: Prototype sketch

Pseudocode for the minimal anchor API and its two consumers. Not production
code. ASCII-only. Reads the live DOM only.

## Contract

The anchor API reads DOM bounds. It does NOT compute layout. The browser
computes layout via CSS Grid / Flexbox. The API only reports the rounded
center (and optionally rounded bounds) of an element the browser has already
placed. If the element does not exist in the DOM, the API returns `null`;
it never falls back to a computed default.

## Module sketch: `dom_anchors.ts`

```
// All three functions are thin wrappers over a native DOM query
// plus Element.getBoundingClientRect(). No imports from src/scene_runtime
// state or layout modules.

export type AnchorPoint = { x: number; y: number };
export type AnchorBounds = AnchorPoint & { width: number; height: number };

function queryByObjectName(name: string): HTMLElement | null {
    const selector = '[data-object-name="' + name + '"]';
    const element = document.querySelector(selector);
    return element as HTMLElement | null;
}

function queryByTargetId(targetId: string): HTMLElement | null {
    const selector = '[data-target-id="' + targetId + '"]';
    const element = document.querySelector(selector);
    return element as HTMLElement | null;
}

// Function 1: center point for a named object.
// Used by cursor-attach to pin the ghost element at attach time.
export function getAnchorForObject(name: string): AnchorPoint | null {
    const element = queryByObjectName(name);
    if (!element) {
        return null;
    }
    const rect = element.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    return { x, y };
}

// Function 2: center point for a target id (sub-target case).
// Used when cursor-attach follows a well, not the whole plate.
export function getAnchorForTarget(targetId: string): AnchorPoint | null {
    const element = queryByTargetId(targetId);
    if (!element) {
        return null;
    }
    const rect = element.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    return { x, y };
}

// Function 3: rounded bounds for a named object.
// Exists only to satisfy callers that read width/height from
// ComputedItemLayout. If no such caller is found during the spike,
// this function is removed and the API drops to 2 functions.
export function getAnchorBoundsForObject(name: string): AnchorBounds | null {
    const element = queryByObjectName(name);
    if (!element) {
        return null;
    }
    const rect = element.getBoundingClientRect();
    const x = Math.round(rect.left);
    const y = Math.round(rect.top);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    return { x, y, width, height };
}
```

That is the entire surface. No state. No caching. No layout math.

## Cursor-attach call site (one-shot)

CursorAttach state mutation already lives at
[../../../../src/scene_runtime/render/apply.ts](../../../../src/scene_runtime/render/apply.ts) lines 149-198 and is unchanged
by Path C. The cursor-follower (the chrome layer that paints the ghost
element while attached) calls the anchor API exactly once, at the moment
the cursor state flips from `null` to `attached`.

```
// Pseudocode in the cursor-follower chrome layer.
// Runs ONCE per attach, not per frame.

function onCursorStateChange(prevState, nextState) {
    if (nextState.operation !== 'attach') {
        return;
    }
    const targetName = nextState.attachedTo;
    const anchor = getAnchorForObject(targetName);
    if (!anchor) {
        // Target was not present in DOM at attach time.
        // Surface as a loud error per the no-defensive-defaults rule.
        throw new Error('cursor attach: no DOM anchor for ' + targetName);
    }
    // Pin the ghost element's initial offset relative to the pointer.
    // After this one-shot read, the ghost follows native pointermove events.
    // No further calls to the anchor API are needed.
    ghostElement.style.left = anchor.x + 'px';
    ghostElement.style.top = anchor.y + 'px';
    startPointerMoveTracking(ghostElement);
}
```

Key property: the anchor API is invoked once per attach. The per-frame
position of the ghost element comes from the browser's native
`pointermove` event, not from repeated anchor reads. Per-frame anchor reads
would force a synchronous layout each frame and would mean the API has
become a tracker.

## ObjectStateChange call site: there is none

ObjectStateChange does NOT call the anchor API. The applier at
[../../../../src/scene_runtime/render/apply.ts](../../../../src/scene_runtime/render/apply.ts) lines 31-111 only mutates
`world.objectStates`. The downstream re-render reads the new state, updates
class names or inline styles on DOM elements (for example, a `data-material`
attribute or a `style="background-color: ..."` on the well's div), and the
browser re-runs CSS layout on its own.

```
// Pseudocode for re-render after ObjectStateChange.
// No anchor API calls here.

function renderObjectVisualState(world, objectName) {
    const state = world.objectStates[objectName];
    const element = queryByObjectName(objectName);
    if (!element) {
        // Object is not currently in the DOM (e.g., off-scene). No-op.
        return;
    }
    // Update visual class names or inline styles from state.
    // Browser handles layout from there.
    applyMaterialClass(element, state.material_name);
    applyVolumeFill(element, state.material_volume);
    // No coordinate math. No anchor read.
}
```

## Adapter return: empty by preference

```
// In src/scene_runtime/layout/adapter.ts, the spike conditional:

if (sceneId === 'well_plate_96_zoom' && ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE) {
    // CSS-native DOM is mounted elsewhere. Legacy consumers for this scene
    // are bypassed. Return an empty layout array.
    return [];
}
return legacyComputeLayout(/* ... */);
```

If empirical testing shows a legacy consumer still runs for this scene and
reads `layout.x` / `layout.y`, switch to a synthetic single-entry return
that calls `getAnchorBoundsForObject('well_plate_96')` once at adapter
time. That is still a one-shot DOM read, not a solver.

## Why this stays small

The discipline is enforced by the contract sentence at the top of this
file and by the Risk threshold in
[README.md](README.md): the anchor API reads DOM bounds; it does not
COMPUTE layout. Browser computes layout; API only reports. The moment a
function in this module takes a parameter that is not a name (no `zone`,
no `region`, no `align`, no `offset`, no `viewport`), Path C has stopped
being a bridge and started being a layout engine. Bail at that point,
per the failure conditions at [../../../../docs/active_plans/new1_well_plate_96_zoom_spike_implementation_packet.md](../../../../docs/active_plans/new1_well_plate_96_zoom_spike_implementation_packet.md).
