# NEW1 spike path comparison

## Scope

Three implementation paths for the NEW1 `well_plate_96_zoom` CSS-native
layout spike were investigated in parallel. Each path produced a packet
under `spike_paths`
containing a README, a prototype sketch, and a JSON assessment. This
document compares the three packets and recommends a single safest-first
path. It also reconciles a tension between Path B (rejected for breaking
the lone `ComputedItemLayout[]` consumer) and Path C (claims an empty
adapter return is safe).

## Paths inspected

- Path A: Adapter compatibility. Packet:
  `path_a_adapter_compat`.
  Summary: gate `computeSceneLayout`, run a hidden DOM scaffold, measure
  with `getBoundingClientRect()`, return populated `ComputedItemLayout[]`
  with integer rects.
- Path B: DOM-first hit target. Packet:
  `path_b_dom_first`.
  Summary: render CSS-native DOM, eliminate the rect emission, rely on
  `data-target-id` and `closest()`. Rejected because the lone external
  rect consumer at `src/scene_runtime/render/scene.ts:235-238` is in a
  forbidden file.
- Path C: Hybrid bridge. Packet:
  `path_c_hybrid`.
  Summary: CSS-native DOM mounted "elsewhere", empty `ComputedItemLayout[]`
  from the adapter, plus a minimal 2-3 function anchor API
  (`getAnchorForObject`, `getAnchorForTarget`, `getAnchorBoundsForObject`)
  that reads `getBoundingClientRect()` on demand. See the reconciliation
  section below.

## Comparison table

| Criterion                                     | Path A                        | Path B                           | Path C (as written)                              | Path C (reclassified as A + anchor)            |
| --------------------------------------------- | ----------------------------- | -------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Production files touched (count)              | 3                             | 4                                | 2                                                | 4                                              |
| Production lines added (estimate)             | 110                           | 180                              | ~60                                              | ~150                                           |
| Needs ComputedItemLayout[] populated          | yes                           | no                               | no (empty)                                       | yes                                            |
| Uses DOM hit targets                          | yes                           | yes                              | yes                                              | yes                                            |
| Introduces coordinate math                    | no                            | no                               | no                                               | no                                             |
| CursorAttach works                            | yes (state + synthetic rects) | yes (state-only)                 | yes (one-shot anchor read)                       | yes (one-shot anchor read)                     |
| ObjectStateChange re-renders cleanly          | yes (re-enters adapter)       | only with render/scene.ts branch | unclear: empty return throws at scene.ts:229-232 | yes (re-enters adapter; anchor API not called) |
| Rollback complexity                           | trivial                       | moderate                         | low on paper, broken in practice                 | low                                            |
| Precheck expected verdict                     | PASS_TEMPLATE                 | PASS_TEMPLATE                    | n/a (renderer throws)                            | PASS_TEMPLATE                                  |
| Screenshot expected                           | yes                           | yes                              | no (throw before paint)                          | yes                                            |
| Failure mode triggered (general coord solver) | no                            | no                               | no                                               | no                                             |
| Forbidden-file edit required                  | no                            | yes (render/scene.ts)            | yes (render/scene.ts) to suppress the throw      | no                                             |
| Recommendation                                | keep                          | reject                           | reject as written                                | keep as follow-up to A                         |

## Evaluation against reviewer gates

Gates per the NEW1 implementation packet at
[new1_well_plate_96_zoom_spike_implementation_packet.md](new1_well_plate_96_zoom_spike_implementation_packet.md):

- Zero hard precheck failures
  - Path A: expected pass. Adapter scaffolds the NEW0 template DOM and
    measures it; precheck inspects the live DOM and finds the same
    `data-region`, `data-placement-name`, `data-object-name` attributes.
  - Path B: expected pass at the DOM-attribute layer, but blocked
    upstream by the render-side throw.
  - Path C as written: cannot reach precheck. `render/scene.ts:229-232`
    throws when `layoutMap.get(placement.placement_name)` returns
    undefined, which is exactly what an empty `ComputedItemLayout[]`
    produces for the spike scene.
- One visible screenshot per path
  - Path A: yes (production render entry runs normally).
  - Path B: only with a charter expansion to edit `render/scene.ts`.
  - Path C as written: no, the throw happens before paint.
  - Path C reclassified: yes, identical to Path A.
- Click target can be reasoned about or proven
  - All three paths use `data-target-id` plus `Element.closest()`. The
    click pipeline at `src/scene_runtime/dispatch/click.ts:29-79` does
    not read rect fields. This gate passes structurally for every path.
- No hidden dependency on the old layout manager beyond the explicit
  compatibility seam
  - Path A: yes. The seam is one conditional in `adapter.ts`. The
    legacy solver is not called for the spike scene.
  - Path B: no. Hidden dependency on `render/scene.ts` reading the
    coordinate fields.
  - Path C as written: same hidden dependency as Path B (the throw at
    `render/scene.ts:229-232` is the dependency).
  - Path C reclassified: yes, the rect population is honest and the
    anchor API is purely additive.
- No YAML coordinates
  - All three paths leave the closed NEW1 manifest coordinate-free.
- No general coordinate solver
  - All three paths defer layout to the browser CSS engine. Path A
    measures via `getBoundingClientRect()`; Path B does not emit
    coordinates at all; Path C reads bounds on demand via the same
    native API. None of the three reinvents track sizing, gap math, or
    content-fit logic in TypeScript.

## Resolution of the Path C ambiguity

Tension: Path C's assessment lists `adapter_return.populated_at_all:
false` and recommends returning an empty `ComputedItemLayout[]`. Path B
was rejected explicitly because the lone external consumer at
`scene.ts`:229-232
calls `layoutMap.get(placement.placement_name)` and throws when the
entry is missing. The full consumer audit lives at
`layout_xy_consumers.md`.

Finding: Path C as written has the same hidden defect as Path B. An
empty adapter return for the spike scene does not bypass
`renderPlacement`; it triggers the same `no computed layout for ...`
error path. Path C's prototype sketch handwaves this with phrases like
"CSS-native DOM is mounted elsewhere" and "may be a no-op shim", but
"elsewhere" is undefined and the only entry that mounts placement DOM
is `renderPlacement` itself. To suppress the throw, Path C would need
to edit the same forbidden file (`src/scene_runtime/render/scene.ts`)
that disqualified Path B. The path-C assessment's
`"forbidden_file_edit_required": false` posture is incorrect on the
facts of the renderer.

Reclassification: Path C is not viable as a standalone spike path. It
is, however, salvageable as a strict superset of Path A. Specifically,
if the spike adopts Path A's hidden-scaffold measurement to keep the
`ComputedItemLayout[]` consumer fed with honest rects, the Path C
anchor API (`getAnchorForObject`, `getAnchorForTarget`,
`getAnchorBoundsForObject`) is purely additive surface area that
serves cursor-attach without touching the renderer. The comparison
table above carries the reclassified column to make this honest.

Under that reclassification the anchor API is a follow-up, not a
prerequisite. The spike does not need it to land Path A; it is the
right shape to add once cursor-attach asks for a point.

## Recommendation

- Safest path to implement first: Path A. It is the only path among the
  three that has both a populated `ComputedItemLayout[]` return and a
  single-conditional seam inside `adapter.ts`. It does not require any
  edit to forbidden files and does not depend on any "elsewhere" DOM
  mount that does not exist.
- Highest-risk path: Path C as written. It looks cheapest on paper
  (two production files, ~60 lines), but the empty adapter return
  collides with the renderer throw at `render/scene.ts:229-232` in a
  way that the packet did not surface. The risk is not coordinate math;
  the risk is silent integration breakage hidden behind handwaving
  about an unspecified DOM mount.
- Path most likely to preserve NEW0 design philosophy (browser CSS
  engine owns layout; manifests stay coordinate-free; no general
  solver in TS): Path A. Every rect comes from
  `getBoundingClientRect()` on a real DOM render of the closed
  manifest. No author YAML carries coordinates. No TypeScript computes
  track sizes, gap distribution, or content fit. The anchor API from
  Path C (reclassified) layers on cleanly later without changing this
  property.
- Note: shipped function signature is compute_scene_layout_css_native(world, scene_name, viewport_width, viewport_height). Block below preserves original pre-implementation pseudocode.
- Exact next implementation step: create branch
  `agent/new1_path_a_adapter_compat_spike`; add the new
  `src/scene_runtime/layout/css_native_adapter.ts` module (created by the spike)
  exporting `computeSceneLayoutCssNative(world, sceneId, viewportW,
viewportH): ComputedItemLayout[]` that builds a hidden offscreen
  scaffold, attaches it to `document.body`, reads
  `getBoundingClientRect()` per placement, and returns integer-rounded
  rects; gate the existing
  `adapter.ts`:32-90
  call to `legacyComputeLayout(...)` behind one conditional
  `if (sceneId === 'well_plate_96_zoom' && ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE) { return computeSceneLayoutCssNative(...); }`.

## Open follow-ups

- Anchor API surface threshold (Path C bail-out criterion): if and when
  Path C is added on top of Path A, hold the surface to at most 3 read-
  only functions whose only input is a `string` name or target id. Any
  4th function, any non-name input (`zone`, `region`, `align`, `offset`,
  `viewport`), or any read outside the live DOM marks the anchor module
  as a layout engine in disguise and triggers the bail per the failure
  conditions in [new1_well_plate_96_zoom_spike_implementation_packet.md](new1_well_plate_96_zoom_spike_implementation_packet.md).
- Sub-pixel drift mitigation (integer rounding at adapter boundary,
  evidence required from spike): Path A rounds rect fields with
  `Math.round` at the adapter boundary. The spike must capture
  measured rects for the production viewport range and confirm they
  fall inside the pixel-diff tolerance described in
  `expected_screenshot_paths.md`.
  If rounding shifts a placement by more than one pixel relative to
  the legacy solver at any supported viewport width, document the
  shift and revisit before promoting beyond the spike scene.
- Renderer-side rect zero-tolerance behavior of
  `scene.ts`:235-238:
  the consumer reads `layout.x`, `layout.y`, `layout.width`,
  `layout.height` unconditionally and the upstream `layoutMap.get`
  throws on a missing entry at lines 229-232. Path A satisfies this by
  always returning a populated entry. Any future migration that wants
  to thin the rect contract must first decide how this consumer
  behaves on a missing or zero-width entry; today, both cases produce
  a broken render rather than a clean opt-out.

## Implementation outcome (2026-05-19)

Path A selected and implemented. See `new1_well_plate_96_zoom_spike_result.md`.

Outcome by path:

- Path A: implemented; TS compile clean; empirical proof deferred pending flag-override decision.
- Path B: not implemented (rejected on `src/scene_runtime/render/scene.ts:235-238` consumer-edit requirement).
- Path C: cursor-attach audit concluded anchor API NOT needed; Path A rect output sufficient; Path C deferred indefinitely.
