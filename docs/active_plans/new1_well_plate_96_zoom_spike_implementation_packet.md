# NEW1 well_plate_96_zoom spike implementation packet

## Scope

This packet is the implementation-ready handoff for the NEW1 `well_plate_96_zoom` integration spike. It captures reviewer-approved defaults and concrete specs the implementer needs to start work. The reviewer dispatched defaults on 2026-05-19; this packet locks them. Linked inputs: the spike readiness audit at [new1_spike_readiness_audit.md](new1_spike_readiness_audit.md), the NEW1 integration plan at [new1_css_native_layout_integration_plan.md](new1_css_native_layout_integration_plan.md), the spike implementation checklist at [new1_well_plate_96_zoom_spike_checklist.md](new1_well_plate_96_zoom_spike_checklist.md), the (unapplied) contract amendment draft at [new1_primary_contract_item3_amendment_draft.md](new1_primary_contract_item3_amendment_draft.md), and the spike fixtures under [../../experiments/css_native_layout/spike_fixtures/](../../experiments/css_native_layout/spike_fixtures/).

## Reviewer-approved defaults (2026-05-19)

- Seam: one conditional in `src/scene_runtime/layout/adapter.ts`, scene-limited to `well_plate_96_zoom`, feature-flagged, legacy fallback for all other scenes, rollback by one revert.
- Contract posture: spike runs under current contract item 3 as experimental conditional substitution. No edits to [../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md). The amendment draft remains post-spike material.
- `label_label_overlap` policy: advisory for the spike. Hard fails are `clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`. Label readability is still reported.
- Feature flag: hard-coded boolean named `ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE`. Default off unless the spike test explicitly enables it.
- Style debt note: production adapter param `sceneId` (camelCase + Id-suffix) violates current repo style. Out of scope for this prep round; recorded as pre-existing style debt; do not rename.

## Files expected to change during implementation

- `src/scene_runtime/layout/adapter.ts`: add one conditional gate before the legacy compute call. Diff target: ~4-6 lines.
- `src/scene_runtime/layout/css_native_adapter.ts`: NEW. The CSS-native compute function. Returns `ComputedItemLayout[]` matching the legacy shape. Module shape detailed below.
- `src/scene_runtime/layout/feature_flags.ts`: NEW, or an inline constant in `css_native_adapter.ts` if a one-flag module would be overweight. The implementer chooses, but the named constant must exist and be grep-findable.
- `tests/playwright/walker/well_plate_96_zoom_walkthrough.mjs` (or similar): NEW spike walker per checklist step 5.
- `tests/playwright/well_plate_96_zoom_spike_assertions.mjs`: NEW. Holds the click-target test plus the `ObjectStateChange` re-render test.

## Files forbidden during implementation

- `src/scene_runtime/dispatch/**`, `src/scene_runtime/render/**`, `src/scene_runtime/adapters/well_plate/**`, `src/scene_runtime/loader/**`: untouched.
- [../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md): untouched.
- `docs/specs/**`: untouched.
- `pipeline/**`, `validation/**`: untouched.
- `content/protocols/**`: untouched.
- `experiments/css_native_layout/**`: untouched (the fixtures pin spike inputs; do not modify during implementation).
- Any production scene YAML: untouched.

## Feature flag

Name: `ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE`.

Default: false. Off in normal walker runs and normal scene loads.

Location: declared in `src/scene_runtime/layout/css_native_adapter.ts` (or in `feature_flags.ts` if the implementer creates one).

Type: hard-coded `const ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE = false;` plus an internal test override (see "Spike test plan" sections below).

Rollback: one revert removes the flag, the new module, and the conditional.

## Proposed module shape for css_native_adapter.ts

The export signature only. No implementation pseudocode beyond function shape:

- `export function computeSceneLayoutCssNative(world, scene_id_param, viewportW, viewportH): ComputedItemLayout[]`. The implementer names the second parameter per local code style; the production adapter currently uses `sceneId`. Either match it or use snake_case, but record the chosen name in the PR.
- Inputs identical to the legacy adapter's public API so callers do not branch.
- Returns `ComputedItemLayout[]` matching the legacy shape exactly.
- Inside: reads the scene + placements + objects; produces DOM-shape data and computes synthetic integer-pixel rects for each placement.

## Expected return contract for ComputedItemLayout[]

- Field set matches legacy `ComputedItemLayout` (see `src/scene_runtime/layout/types.ts`, lines 109-122 area).
- `x` and `y` are integer pixels (rounded from CSS bounds).
- `width` and `height` are integer pixels.
- `footprint` and `label` populated where the legacy adapter would populate them.
- Element order matches placement enumeration order in the resolved scene.

## Compatibility rule: numeric rects are adapter output only

This is the central anti-drift rule.

- Numeric rects in `ComputedItemLayout[]` are an OUTPUT of the adapter for consumer compatibility.
- Numeric rects are NOT authored. The closed NEW1 manifest does NOT carry `x`, `y`, `bounds`, `align`, `offset`, `depth`, `width`, `height`, `coords`, `position`, or `transform` fields.
- The adapter does NOT compose a general coordinate solver. It reads CSS Grid / Flexbox layout produced by the browser and reports rounded element bounds.
- If implementation finds itself writing a layout solver in TypeScript (track sizing, gap distribution, content fitting) to produce these rects, that is a failure condition. Stop and escalate.

## One clickable target test plan

- Walker loads the spike-rendered DOM at the path pinned in [../../experiments/css_native_layout/spike_fixtures/expected_precheck_command.md](../../experiments/css_native_layout/spike_fixtures/expected_precheck_command.md).
- Walker clicks one well (recommend A1: top-left well) via `data-target-id` selector.
- Assert: dispatch resolves to the correct well object via `closest()`-based hit-testing (matches legacy behavior).
- Assert: hit-testing succeeds with the exact same `data-target-id` value the legacy renderer emits.
- Screenshot evidence at the path pinned in [../../experiments/css_native_layout/spike_fixtures/expected_screenshot_paths.md](../../experiments/css_native_layout/spike_fixtures/expected_screenshot_paths.md).

## ObjectStateChange and re-render test plan

- Walker triggers an `ObjectStateChange` affecting one well (e.g., add a material). Use an existing protocol step or a synthetic walker fixture.
- Assert: scene re-renders through the same render entry point as legacy.
- Assert: the well's visual state reflects the state change.
- Screenshot evidence before and after.
- No new render-side branching introduced.

## Precheck command

The canonical command is pinned at [../../experiments/css_native_layout/spike_fixtures/expected_precheck_command.md](../../experiments/css_native_layout/spike_fixtures/expected_precheck_command.md). Do not duplicate it verbatim here.

## Screenshot paths

The canonical path list is pinned at [../../experiments/css_native_layout/spike_fixtures/expected_screenshot_paths.md](../../experiments/css_native_layout/spike_fixtures/expected_screenshot_paths.md). Do not duplicate it here.

## Rollback

Command sketch (do not actually run):

```
git revert <spike-PR-commit-sha>
```

Strategy:

- One PR per the commit-scope rule.
- Removing the conditional + module + flag restores the prior state in full.
- No data migration. No schema change. No scene YAML touched.

## Failure conditions: CSS-native is recreating the old engine

Stop and escalate if any of the following appear:

- Implementation introduces track-sizing math, gap distribution, content fitting, or any function that computes layout independently of browser CSS Grid/Flexbox.
- Implementation reads `ComputedItemLayout.x` or `.y` somewhere OTHER than the existing consumer code paths (`render/scene.ts`, `well_plate/render.ts`).
- Implementation introduces a new persistence shape or a serialized layout cache.
- Implementation adds coordinate fields to YAML manifests or schema.
- Implementation requires modifying `dispatch/click.ts`, `render/apply.ts`, or any per-adapter render module.
- Feature flag default ever becomes true outside the spike test.

Any of these means the spike is reinventing the layout engine. Bail.

## Reviewer checklist

- [ ] One conditional only (single gate in `adapter.ts`)
- [ ] One new module only (`css_native_adapter.ts`; `feature_flags.ts` optional)
- [ ] No broad migration (only one scene name in the gate)
- [ ] No contract edit ([../PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md) untouched)
- [ ] No old layout deletion (legacy adapter + `layout_engine.ts` intact)
- [ ] No YAML coordinates (manifest carries no x/y/width/height/bounds/align/offset/depth)
- [ ] No general coordinate solver (no TS-side track/gap math)
- [ ] Feature flag present and named `ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE`
- [ ] All non-spike scenes remain legacy (verified by running precheck on the full template set)
- [ ] Tests pass: pytest gates green; spike walker passes; precheck on the spike scene matches the expected_*.md fixtures

## Open follow-ups (not blocking spike start)

- Style debt: rename `sceneId` -> snake_case alternative in `adapter.ts` (out of spike scope).
- Empty-region DOM scaffolds: implementer chooses scaffold-all vs scaffold-on-demand and records the choice in the PR (see [../../experiments/css_native_layout/spike_fixtures/expected_dom_selectors.md](../../experiments/css_native_layout/spike_fixtures/expected_dom_selectors.md)).
- Pixel-diff threshold (5%) uncalibrated; first spike run produces the calibration baseline.
- `dir_b_*` / `dir_c_*` CSS variants: historical reference; no role under NEW1 unless a future plan picks one.

## Implementation result (2026-05-19)

Path A implementation landed. See [new1_well_plate_96_zoom_spike_result.md](new1_well_plate_96_zoom_spike_result.md) for full report.

Summary:
- src/scene_runtime/layout/feature_flags.ts (NEW, 8 lines): `ENABLE_CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE = false`.
- src/scene_runtime/layout/css_native_adapter.ts (NEW, 224 lines): scaffold-and-measure adapter; throws if no DOM.
- src/scene_runtime/layout/adapter.ts (MODIFIED, +9 lines): 2 imports + 1 conditional gate after scene-not-found check.
- TS compile: clean for spike files. Pre-existing unrelated errors in generated/scene_data.ts (x9) and src/scene_runtime/render/scene.ts:316 (x1) noted; not fixed.
- Empirical browser proof of click-target / ObjectStateChange: NOT this round. Flag is hard-coded false with no runtime override seam; provisional call awaits reviewer disposition.
- Cursor-attach audit: Path C anchor API not needed; spike rect output suffices.
- Recommendation: continue, with reviewer disposition on flag-override mechanism.
