# NEW1 spike readiness audit

## Scope

Read-only audit of production code paths a CSS-native renderer must intercept to render one scene (well_plate_96_zoom) for the NEW1 spike. Produces seam proposal, risk callouts, rollback plan. NO production edits. Input to the NEW1 spike implementation checklist at [new1_well_plate_96_zoom_spike_checklist.md](new1_well_plate_96_zoom_spike_checklist.md). Conducted under the NEW1 plan at [new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md).

## Scene loading path

Scene YAML resolves to runtime data through `src/scene_runtime/loader/scene.ts` (around lines 91-182). The runtime constructs scene DOM through `src/scene_runtime/render/scene.ts` (around lines 31-84). First paint calls `computeSceneLayout()` from `src/scene_runtime/layout/adapter.ts` (around lines 32-90) as the sole layout entry point. CSS-native spike intercepts here.

## Click target binding path

Click dispatch lives in `src/scene_runtime/dispatch/click.ts` (around lines 29-79). Hit-testing uses `data-target-id` attributes plus native `Element.closest()` traversal. No runtime coordinate math at dispatch time. Click binding established during render at `src/scene_runtime/render/scene.ts` (around lines 241-249). Plate-specific binding at `src/scene_runtime/adapters/well_plate/render.ts:136` reads layout output to position per-well hit targets.

Consequence: CSS-native renderer that emits the same `data-target-id` attributes inherits the existing click pipeline without modification.

## Cursor attach and drag path

`CursorAttach` scene operation handled in `src/scene_runtime/render/apply.ts` (around lines 149-198). State-only mutation; no per-frame coordinate updates from production code. Drag visual deferred to CSS transitions and pointermove handlers attached at render time.

Consequence: spike does not need to reproduce coordinate tracking for cursor-attach. If CSS-native DOM exposes the same data attributes, existing handlers continue to work.

## ObjectStateChange path

State mutation + re-render at `src/scene_runtime/render/apply.ts` (around lines 31-111). Mutation is immutable swap followed by full scene re-render. Material colors and visual states resolved from `world.materials` at render time, not at mutation time. Well-plate-specific re-render path at `src/scene_runtime/adapters/well_plate/render.ts` (around lines 61-113).

Consequence: ObjectStateChange driving a CSS-native scene works as long as the CSS-native render path is invoked from the same entry point as legacy render.

## Current adapter output

`src/scene_runtime/layout/adapter.ts` exposes `computeSceneLayout()` returning `ComputedItemLayout[]` defined in `src/scene_runtime/layout/types.ts` (around lines 109-122). Fields include `x`, `y`, `width`, `height` (coordinate-based) plus `footprint` and `label`. Downstream renderers consume the coordinate fields directly.

Consequence: CSS-native path must either return matching `ComputedItemLayout[]` with synthetic coordinates derived from CSS bounds, or branch the consumer to accept a region-keyed shape. Spike must pick one. Lower-risk path: synthetic coordinates that the existing renderer treats as opaque positions.

## Proposed CSS-native plug-in point

Single seam at `src/scene_runtime/layout/adapter.ts`. Inside `computeSceneLayout()` (or whatever it calls), gate on `sceneId === 'well_plate_96_zoom'` and dispatch to a new `computeSceneLayoutCssNative()` function. All other scenes fall through to the legacy path. No changes to render/apply, dispatch/click, state mutation, or per-adapter code.

## Smallest safe seam

File: `src/scene_runtime/layout/adapter.ts`.
Position: before the legacy compute call inside the main exported function.
Shape:

```
if (sceneId === 'well_plate_96_zoom' && featureFlag.cssNative) {
    return computeSceneLayoutCssNative(world, sceneId, viewportW, viewportH);
}
return legacyComputeLayout(sceneItems, assetSpecs, layoutRules, viewportW, viewportH);
```

Why least invasive:
- Single conditional, one call site.
- Returns the same type signature (`ComputedItemLayout[]`).
- Other five scenes untouched.
- Feature flag allows in-flight disable without rebuild.
- No new exports from layout module beyond the gated function.

## Rollback plan

One revert of the spike PR. The new function and conditional gate live in a single feature-flagged code path. Removing the flag + the function + the conditional restores prior behavior with no schema, render, dispatch, or state changes to undo.

Commit-scope rule for spike PR:
- One PR.
- One feature flag.
- One new module (`computeSceneLayoutCssNative`).
- One conditional in `adapter.ts`.
- No edits to dispatch, render, apply, or state code.

## Files likely touched during spike

Production code:
- `src/scene_runtime/layout/adapter.ts` (one conditional added)
- `src/scene_runtime/layout/css_native_adapter.ts` (NEW, proposed name; implementer may choose differently)
- one feature-flag config file (TBD by implementer; may be a top-level config or inline constant)

Non-production:
- `experiments/css_native_layout/spike_fixtures/` (already in place)
- `test-results/new1_well_plate_96_zoom/` (output only)
- spike screenshot fixtures + Playwright walker addition under `tests/playwright/`

NOT touched:
- production scene YAML
- `docs/PRIMARY_CONTRACT.md`
- `docs/specs/`
- pipeline/
- validation/

## Open questions for reviewer

1. **CSS region bounds vs legacy coordinates (central risk).** CSS-native layout computes region bounds from the cascade. Across 96 wells in an 8 x 12 grid, floating-point precision in CSS Grid track sizing may produce sub-pixel drift relative to legacy coordinate output. Spike must verify per-well click targets resolve to the correct cell at all viewport sizes the production app supports. Mitigation candidates: round to integer pixel in the synthetic coordinates returned to the existing renderer; or have the renderer trust CSS bounds and skip the coordinate emission. Decision deferred to spike implementer pending evidence.

2. **Synthetic coordinates vs branched consumer.** Adapter output is currently typed `ComputedItemLayout[]` with coordinate fields. CSS-native path can either emit synthetic coordinates (low risk; preserves consumer contract) or change the consumer to accept a region-keyed shape (higher risk; touches per-adapter render code, breaks the "single seam" promise). Recommendation: synthetic coordinates for the spike. If the spike proves out, evaluate consumer refactor as separate work.

3. **Feature flag location.** Implementer to choose between a config file flag, an env variable check, and a hard-coded boolean. Reviewer should weigh: rollback latency, test isolation, walker reproducibility. Hard-coded boolean is simplest for a spike with one-revert rollback.

4. **Region-keyed state for cursor attach.** Audit found no per-frame coordinate dependency for CursorAttach in production. This needs spike-time confirmation: if some unseen path reads `ComputedItemLayout.x/y` to position a cursor-following ghost, the synthetic-coordinate strategy must keep those fields populated. Spike-time confirmation should start with `src/scene_runtime/render/apply.ts` CursorAttach handler and any caller that reads `layout.x`/`layout.y` for cursor positioning.
