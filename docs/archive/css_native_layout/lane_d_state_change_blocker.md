# Lane D State Change Test - Blocker Report

## Goal
Prove that a state change (protocol step completion via correct click) triggers renderScene re-execution, the spike adapter re-runs, and remains idempotent (no DOM leak).

## Current Status: BLOCKED
State change cannot be triggered cleanly from the existing protocol harness. The dispatch layer rejects the click interaction after applying ObjectStateChange, preventing step completion and renderScene re-execution.

## Root Cause
The protocol target matching logic in the dispatch layer is failing to validate clicks on well sub-targets, even when the protocol explicitly targets those wells.

### Evidence Chain
1. Modified `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml` to expect target `well_plate_96.E7`
2. Playwright clicks land on well center, click dispatch emits `well_plate_96.E7`
3. ObjectStateChange APPLIES successfully (well_plate_96.material_name changes to "empty")
4. BUT currentInteractionIndex resets from 1 to 0 immediately after
5. This reset indicates step validator FAILED and triggered step restart (entry.ts:254-256)
6. renderScene is NOT called because step never completes
7. Spike invocation count remains 1 (no re-render after click)

### Execution Trace
```
1. Mount scene (spike enabled)
   -> spike invocation count = 1 (OK)

2. User clicks center of viewport
   -> click dispatch triggered
   -> click lands on "well_plate_96.E7" (confirmed)

3. isTargetSatisfied() evaluates (entry.ts:761)
   -> accepts target OR validator preset checks fail elsewhere

4. ObjectStateChange applied (lines 769-772)
   -> well_plate_96.material_name = "empty" (OK)

5. currentInteractionIndex incremented (line 778)

6. orchestrateNextInteractionWithCompletion (line 785)
   -> checkStepCompletion() called (line 421)
   -> evaluateStepValidator() called (line 250)
   -> VALIDATOR FAILS (returns false)
   -> step restarted (currentInteractionIndex = 0)

7. NO renderScene() call happens because step didn't complete
   -> spike invocation count stays 1
```

## Boundaries Preventing Fix
The target matching logic lives in `src/scene_runtime/bundle/entry.ts` lines 443-491 (`isTargetSatisfied` function), which is in the forbidden boundary. Cannot edit:
- `src/scene_runtime/dispatch/`
- `src/scene_runtime/render/`
- `src/scene_runtime/adapters/well_plate/`
- `src/scene_runtime/loader/`
- `src/scene_runtime/bundle/entry.ts`

Without access to edit these files, the target matching issue cannot be debugged or fixed.

## Possible Root Causes (Speculative)
1. **Subpart-as-group semantics issue**: The `isTargetSatisfied` function at lines 454-488 checks if emitted target is a member of a named group. For `well_plate_96.E7`, it would search the object structure for a group containing "E7". The well_plate_96 object has:
   - `rows` group with members like `row_A` containing `A1-A12`
   - `columns` group with members like `col_1` containing `A1,B1,C1,D1,E1,F1,G1,H1`
   - `regions` group with `all_wells` containing all 96 wells

   But E7 is NOT a direct member of any group (it's at the grid coordinate level). The logic may be looking for exact group matches.

2. **Validator preset implementation**: The `correct_target` preset validator may be implemented separately and have different matching logic than `isTargetSatisfied`.

3. **SVG Rendering Issue**: The rendered SVG may be emitting a different target ID than expected due to how the layout engine structures the well group hierarchy.

## Test Artifacts
- **Test file**: `tests/playwright/spike_built_app_state_change.mjs`
- **Modified protocol**: `tests/content/dev_smoke/well_plate_96_zoom_check/protocol.yaml` (now targets `well_plate_96.E7`)
- **Screenshots**: `test-results/new1_spike/lane_d_*.png`
- **Debug scripts**: Created `_debug_*.mjs` files during investigation

## Measurements Before Blocker
- [x] Spike flag: set successfully (set_css_native_well_plate_zoom_spike_enabled_for_test = true)
- [x] Mount: spike invocation count incremented from 0 to 1
- [x] SVG render: scene-viewport contains 26 KB HTML, 122+ elements with data-target-id
- [x] Click detection: Playwright confirmed click lands on "well_plate_96.E7"
- [x] ObjectStateChange: well_plate_96.material_name successfully changed to "empty"
- [ ] Step completion: step validation failed, step restarted instead of completing
- [ ] renderScene re-run: NOT executed (invocation count = 1 throughout)

## Impact on Lane D
Lane D cannot be completed without:
1. Fixing the target matching bug in entry.ts, OR
2. Using a different object that doesn't have sub-part complexity, OR
3. Using a different gesture that doesn't require target matching, OR
4. Editing the dispatch/validator boundary to debug the issue

## Recommendation for Continuation
If this blocker is not resolvable by the user, the smallest path forward is:
- Create a new dev_smoke protocol that uses an object with NO sub-parts (e.g., a simple "media_bottle" or "beaker")
- Target that object directly (no dot notation)
- Trigger an ObjectStateChange on that object
- This avoids the subpart matching complexity entirely
- Proves renderScene re-executes on any valid state change, not specifically on well-plate sub-targets

## Flag State
Spike feature flag enabled for this test. File markers:
- Feature flag location: `src/scene_runtime/layout/feature_flags.ts`
- Spike accessor in bundle: `SceneRuntime.__spike`
- Reset: `SceneRuntime.__spike.set_css_native_well_plate_zoom_spike_enabled_for_test(null)` called after test
