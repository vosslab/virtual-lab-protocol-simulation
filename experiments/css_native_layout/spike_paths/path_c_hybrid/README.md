# Path C: Hybrid bridge

## Summary

Path C renders visual layout in CSS-native DOM (browser owns layout via CSS
Grid / Flexbox) and exposes a minimal runtime anchor API for the two
production code paths that currently consume coordinate fields: cursor-attach
visuals and any callsite that wants a numeric point for an object. Anchors are
derived from the live DOM at the moment they are requested using
`getBoundingClientRect()`. They are not authored, not cached across renders,
and not computed by TypeScript. The browser computes layout; the API only
reports what the browser already decided.

## Minimal anchor API surface

Three functions, all in a new module `src/scene_runtime/layout/dom_anchors.ts`
(spike-only; not added in this audit pass). Each is a thin read over the live
DOM. None of them computes, allocates, or solves layout.

- `getAnchorForObject(name: string): {x: number, y: number} | null`. Queries
  `document.querySelector('[data-object-name="<name>"]')`, reads
  `getBoundingClientRect()`, returns the rect center as integer pixels.
  Returns `null` if no element matches.
- `getAnchorForTarget(targetId: string): {x: number, y: number} | null`.
  Same shape as above but keyed on `data-target-id` (matches the click
  dispatcher's selector at ../../../../src/scene_runtime/dispatch/click.ts
  line 43). Used when cursor-attach needs to follow a sub-target (a well in
  a plate) rather than the parent object.
- `getAnchorBoundsForObject(name: string): {x: number, y: number, width: number, height: number} | null`.
  Same query as the first; returns rounded rect bounds. Exists only because
  the existing `ComputedItemLayout` shape carries width/height and a caller
  may want them. If no caller actually reads width/height for cursor-attach,
  this function is dropped (see Risk).

Function count: 3 (with 2 as the floor if `getAnchorBoundsForObject` is
unneeded).

## Production files this path touches

- ../../../../src/scene_runtime/layout/adapter.ts lines 32-90: add one conditional gate scoped to
  `well_plate_96_zoom` that returns an empty or synthetic `ComputedItemLayout[]`
  when the feature flag is on. No coordinate math runs in TS.
- the new `src/scene_runtime/layout/dom_anchors.ts` module (created by the spike): the three-function anchor
  module above.
- the new `src/scene_runtime/layout/css_native_adapter.ts` module (created by the spike, optional): a stub
  adapter that emits the CSS-native DOM (or just trusts the existing render
  pipeline to mount the template at a fixed root). For the spike, the
  template fixture at
  [../../templates/well_plate_96_zoom.html](../../templates/well_plate_96_zoom.html)
  drives the DOM, so this module may be a no-op shim.

NOT touched by Path C:

- ../../../../src/scene_runtime/render/apply.ts lines 31-198. CursorAttach and
  ObjectStateChange remain state-only. No new render-side branching.
- ../../../../src/scene_runtime/dispatch/click.ts lines 29-79. Click dispatch already
  reads `data-target-id` from the live DOM via `closest()`. CSS-native DOM
  with the same attributes inherits this pipeline unchanged.
- Any per-adapter render module under `src/scene_runtime/adapters/`.

## Per-feature analysis

### Cursor-attach via DOM-derived anchors

- Production CursorAttach at ../../../../src/scene_runtime/render/apply.ts
  lines 149-198 is state-only: it sets `cursorState.attachedTo` and
  `cursorState.operation`. No coordinate math runs in `applyCursorAttach`.
- Visual cursor following (the ghost element that tracks the cursor while
  attached) is the only consumer that needs a point. With Path C, the
  cursor-follower calls `getAnchorForObject(name)` once at attach time to
  pin the ghost's initial offset, then follows native `pointermove` events
  for the live position. No per-frame call to the anchor API.
- DOM mechanism: a single `document.querySelector('[data-object-name="..."]')`
  plus `Element.getBoundingClientRect()`. Both are native and cheap; no
  layout thrash because the query is one-shot.

### ObjectStateChange re-render via existing apply.ts path

- ObjectStateChange at ../../../../src/scene_runtime/render/apply.ts lines
  31-111 is a pure state swap. It does not read DOM and does not read
  coordinates. Path C does not change this code.
- After the state swap, the existing scene re-render runs. In Path C the
  re-render reads `world.objectStates` and re-paints visual state into the
  CSS-native DOM (color classes, material fill, etc.). The browser then
  re-runs CSS layout. The anchor API is not called during re-render.
- Net: ObjectStateChange does NOT need the anchor API. State change is data;
  re-render is DOM update; layout is browser.

### Adapter return: can `ComputedItemLayout[]` be empty or synthetic?

- Downstream consumers under `src/scene_runtime/adapters/well_plate/render.ts`
  read `layout.x`, `layout.y`, `layout.width`, `layout.height` for SVG
  positioning. Path C bypasses that render path entirely for the spike scene
  by mounting the CSS-native DOM at the scene root. The legacy adapter call
  for `well_plate_96_zoom` returns an empty `ComputedItemLayout[]`, since no
  legacy consumer needs to run.
- If a legacy consumer is still wired in for the spike scene, Path C returns
  a synthetic single-entry `ComputedItemLayout[]` whose `x`, `y`, `width`,
  `height` are derived by calling `getAnchorBoundsForObject(name)` at
  adapter-call time. This is a one-shot DOM read, not a solver.
- Recommended posture for the spike: empty array. Force the legacy render to
  no-op for this scene and let the CSS-native DOM stand on its own. If that
  breaks something, fall back to synthetic.

### Rollback complexity

- One PR. One feature flag (`ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE`). One
  conditional in `adapter.ts`. One new module (`dom_anchors.ts`). Optional
  shim module (`css_native_adapter.ts`) if needed.
- `git revert <spike-PR-commit-sha>` removes the flag, the conditional, the
  anchor module, and the optional shim. No render, dispatch, or state code
  was edited, so nothing else needs unwinding.
- Risk: the anchor API leaks into a caller outside the spike scope.
  Mitigation: name the module and functions with the `Spike` suffix during
  the spike (`getAnchorForObjectSpike`, etc.) so a grep finds every call
  site at revert time. Drop the suffix only if the spike graduates.

### Precheck

- Run the canonical precheck pinned at
  [../../spike_fixtures/expected_precheck_command.md](../../spike_fixtures/expected_precheck_command.md). The precheck inspects
  the rendered DOM, not the adapter output, so Path C's empty-array adapter
  return does not perturb it.
- Expected: all five regions present; `data-region`, `data-placement-name`,
  `data-object-name`, `data-primary` attributes match
  [../../spike_fixtures/expected_data_attributes.md](../../spike_fixtures/expected_data_attributes.md).
- Hard fails (`clipped_artwork`, `off_page`, `svg_svg_overlap`,
  `region_overflow`) come from CSS layout, not from anchor reads, so they
  are independent of the anchor API surface.

### Screenshot

- Screenshots captured per
  [../../spike_fixtures/expected_screenshot_paths.md](../../spike_fixtures/expected_screenshot_paths.md). The two-shot
  contract (before / after for ObjectStateChange) is unchanged: the spike
  walker drives an interaction, screenshots before, drives ObjectStateChange,
  screenshots after.

## Risk: anchor API surface size

Path C is recognizable as a layout engine in disguise the moment the anchor
API stops being "read what the browser already decided" and starts being
"figure out where something should be."

Concrete threshold: Path C is silently becoming a layout engine if any of
the following appear.

- The anchor API exceeds 3 functions, OR adds a 4th function whose name
  encodes intent rather than a DOM query (`getAnchorBetween`,
  `getAnchorWithOffset`, `placeAnchorRelativeTo`, `solveAnchorChain`).
- Any function in the anchor module takes more than (name + optional fallback)
  as input. The moment an anchor function takes `zone`, `region`, `align`,
  `gap`, `depth`, `viewport`, or `scale`, the module is computing layout.
- The anchor module reads anything other than the live DOM. No reading from
  `world.scenes[*].placements[*]`, no reading from
  `world.objects[*].layout`, no reading from `ComputedItemLayout[]`. The
  contract is "browser decides, anchor module reports." If the module starts
  reading authored layout intent to construct points, it is a solver.
- Any caller invokes the anchor API in a per-frame loop. Per-frame anchor
  reads turn the module into a tracker and force layout thrash. Cursor-attach
  attaches once and then follows native pointer events; it does not poll.

If any threshold is hit during the spike: STOP. Path C has become a layout
engine. Bail and document, per the NEW1 packet's failure conditions at
[new1_well_plate_96_zoom_spike_implementation_packet.md](../../../../docs/archive/css_native_layout/new1_well_plate_96_zoom_spike_implementation_packet.md)
section "Failure conditions: CSS-native is recreating the old engine."

## Recommendation

KEEP, with the explicit threshold in Risk above as the bail condition.

Path C is the cheapest path among the three under audit because it adds no
TS-side layout math and touches no render-side code. The cursor-attach
question is the only place where an anchor point matters at all, and a
one-shot DOM read at attach time is the smallest possible answer. If the
ObjectStateChange re-render test passes (which the audit says it should,
because state mutation is data-only), the only spike-level question Path C
needs to answer is whether the one-shot anchor read returns a point that
the cursor-follower can use without per-frame correction.

If the spike walker passes cursor-attach with a one-shot anchor read and
the anchor module stays at 2-3 functions with name-only inputs, Path C is
viable for the spike scope and is the lowest-risk path. If the cursor
follower needs richer information than a single point at attach time,
Path C escalates to "anchor API growing" and the threshold above triggers
a bail, not a band-aid.
