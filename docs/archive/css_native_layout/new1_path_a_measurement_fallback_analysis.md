# NEW1 Path A measurement fallback analysis

## Scope

This document records alternatives to the per-render scaffold attach/detach pattern used by the Path A CSS-native measurement spike in `css_native_adapter.ts`. It exists to capture design options uncovered while reviewing the spike's perf risk in `new1_well_plate_96_zoom_spike_result.md` and the spike path notes in `README.md`. It is documentation only; no implementation is proposed in this round, and no production code changes follow from this file.

## Baseline cost (current implementation)

- Per `compute_scene_layout_css_native()` call: create scaffold, create N region divs, create M placement divs, append to `document.body`, force layout (implicit via `getBoundingClientRect()`), read M rects, detach scaffold.
- For `well_plate_96_zoom` (1 placement currently in the manifest fixture; the real plate has 96 wells via SVG sub-rendering, not separate scaffold nodes), per-render cost is bounded.
- For a scene with N regions plus M placements: O(N+M) DOM-node creations, one layout flush, M rect reads, and O(N+M) removals.
- Memory: scaffold nodes are garbage-collected after teardown.

## Alternative 1: hidden persistent measurement root

- One scaffold attached at module load and reused across renders.
- Each render mutates the persistent scaffold's children (adds, removes, or reuses div nodes) rather than building a fresh scaffold.
- Tradeoffs: avoids attach and detach cost per render; risks DOM-state leak between renders (stale children if not reset); requires explicit reset logic per render.
- Open question: does this become a "DOM diff engine"? If the diff is non-trivial it edges toward layout-engine reinvention.
- Recommendation: only consider after empirical perf measurement shows attach and detach dominates.

## Alternative 2: per-scene plus viewport plus state cache

- Cache the most recent `ComputedItemLayout[]` result keyed by (`scene_name`, `viewport_width`, `viewport_height`, `world_state_signature`).
- Subsequent renders with the same key return the cached result without DOM work.
- Cache invalidation triggers:
  - viewport size change
  - placement count or `placement_name` change
  - `object_name` change (object swap)
  - `ObjectStateChange` that affects `visual_states` tied to layout (size, footprint)
  - CSS file load or change
- Risk: state-signature derivation. If an invalidation trigger is missed, cached rects are wrong.
- Risk: the cache becomes a parallel layout snapshot, a coordinate persistence. Borderline failure-mode per Path A's stop conditions ("No persistence shape or serialized layout cache").
- Recommendation: REJECT unless empirical perf measurement shows it is the only viable option. Reinvents the engine via the back door.

## Alternative 3: lazy or on-demand measurement

- Do not measure all placements up front. Return a `ComputedItemLayout[]` shape where rect fields are populated lazily on first access.
- Tradeoffs: defers cost; changes the return contract from "snapshot at compute time" to "live read at access time"; downstream consumers may break if they expect frozen rects.
- Risk: timing inconsistencies if the scene's DOM mutates between adapter return and consumer access.
- Recommendation: REJECT. Changes the legacy `ComputedItemLayout[]` contract; downstream consumers (`render/scene.ts`, the well-plate adapter) read rects as frozen values.

## Alternative 4: skip the adapter entirely; render CSS-native DOM directly

- The legacy adapter's whole purpose is producing `ComputedItemLayout[]` for the SVG renderer in `render/scene.ts`.
- If the spike rendered CSS-native DOM as the actual scene (not as a measurement scaffold), the rects would not be needed at all.
- Tradeoffs: requires editing `render/scene.ts` to take a different path for the spike scene, beyond the approved seam.
- The reviewer brief explicitly forbids this in this round.
- Recommendation: NOT FOR THIS ROUND. Document as a future architectural option after the Path A spike result is in.

## Invalidation triggers (Alternative 2 detail, if pursued)

- `viewport_width` changed
- `viewport_height` changed
- placements list length changed
- any placement's `placement_name` changed
- any placement's `object_name` changed
- any placement's zone changed
- any `world.objects[object_name].label` changed (affects rendered text width)
- any `visual_state`-driven asset swap (affects rendered size)
- any CSS stylesheet load or modification

## Decision matrix

| Option                        | Reinvents engine | Touches forbidden files | Changes contract | Recommendation                           |
| ----------------------------- | ---------------- | ----------------------- | ---------------- | ---------------------------------------- |
| Per-render scaffold (current) | No               | No                      | No               | KEEP (default)                           |
| Persistent measurement root   | Borderline       | No                      | No               | Consider only if measured cost dominates |
| State-keyed cache             | Yes (back door)  | No                      | No               | REJECT unless empirical proof forces it  |
| Lazy measurement              | No               | No                      | YES              | REJECT (breaks consumer contract)        |
| Bypass adapter entirely       | No               | YES                     | YES              | NOT FOR THIS ROUND                       |

## Conclusion

- Keep per-render scaffold attach and detach until empirical perf data justifies a change.
- If perf becomes blocking, the persistent measurement root is the safest next step.
- Never introduce a state-keyed cache without explicit reviewer approval.
