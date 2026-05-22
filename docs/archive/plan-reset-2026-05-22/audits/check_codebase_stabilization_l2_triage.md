# Check codebase stabilization L2 triage

Workstream L2 triage of remaining `check_codebase.sh` typecheck failures after WS-L
fixed `tests/test_layout_integration.ts`. This is a read-only triage; no source
edits, no `tsconfig.json` or `package.json` edits, no git mutation.

Source: `./check_codebase.sh > /tmp/typecheck_full.txt 2>&1` (run from repo root).
Total `tsc --noEmit` diagnostics: 138 lines, comprising 134 errors plus 4
multi-line "Type 'X' is not assignable" continuation lines.

Path note: per `docs/REPO_STYLE.md`, triage/audit artifacts normally land under
`docs/active_plans/audits/`. The L2 task specified this root-level path
explicitly; honoring the explicit path but flagging the policy variance for the
manager.

## Failure count by category

| Category                                                                                                               | Count | Notes                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| TS2305 missing exports from `src/protocol.ts`, `src/inventory.ts`, `src/scene_configs.ts`, `src/step_dispatch.ts`      | 14    | All four modules are deliberately-gutted legacy facades (`export {};` only). Stale callers.                   |
| TS2305 missing exports from `generated/protocol_data.ts` (called from `generated/inventory_data.ts` and `src/init.ts`) | 8     | Generated file only exports `PROTOCOL_CATALOG`. Its own dependent generated file and `src/init.ts` are stale. |
| TS2305 missing `deriveHighlights` from `src/scene_runtime/highlight/index.ts`                                          | 1     | Only `renderHighlight` exists. Caller is stale.                                                               |
| TS2304 unbound `PROTOCOL_STEPS` / `PROTOCOL_ID` inside `src/init.ts`                                                   | 14    | Downstream of the TS2305 import removal above; same root cause.                                               |
| TS2591 `node:test` / `node:assert/strict` not found                                                                    | 6     | Three test files: `test_dispatch_adjust.ts`, `test_dispatch_click.ts`, `test_highlight.ts`.                   |
| TS2353 unknown property `rows` on `ResolvedSceneConfig` (in `generated/scene_data.ts`)                                 | 9     | Generated data has fields the contract type does not declare.                                                 |
| TS6133 / TS6196 unused locals, imports, parameters                                                                     | 47    | Mechanical across `src/scenes/`, `src/scene_runtime/`, `src/steps/`, walker, etc.                             |
| TS6192 all-imports-unused in `generated/inventory_data.ts`                                                             | 1     | Downstream of the TS2305 cluster on that same line.                                                           |
| TS2416 `SimpleEvent` base-type incompatibility (test mock)                                                             | 4     | `tests/test_dispatch_click.ts` lines 146-149.                                                                 |
| TS2345 narrowing failures (`undefined` not assignable)                                                                 | 3     | `src/init.ts:98`, `tests/playwright/walker/index.ts:180,296`.                                                 |
| TS18048 possibly-undefined narrowing                                                                                   | 1     | `tests/playwright/walker/index.ts:309`.                                                                       |
| TS2532 object possibly undefined                                                                                       | 3     | `generated/inventory_data.ts:35,36`; `src/init.ts:165`.                                                       |
| TS2551 typo (`hasEventListener` vs `addEventListener`)                                                                 | 1     | `tests/playwright/walker/index.ts:213`, real bug.                                                             |
| TS2345 SimpleEvent missing `defaultPrevented`                                                                          | 1     | `tests/test_dispatch_click.ts:158`.                                                                           |
| TS2339 `summary` / `labelFontSize` not on object type                                                                  | 2     | `src/init.ts:165`; `src/scene_runtime/render/scene.ts:316`.                                                   |
| TS7006 implicit any on `s` parameters                                                                                  | 6     | `src/game_state.ts` and `src/init.ts`.                                                                        |
| TS2307 / TS6142 / TS7006 in `OTHER_REPOS/scienceicons/...`                                                             | 7     | Third-party vendored code under `OTHER_REPOS/`, pulled in by `include: ["**/*.ts"]`.                          |

Approximate total reportable errors: ~128 distinct error lines (some categories
overlap; the TS2304 cluster is causally one fix).

## Per-error table

Risk legend: LOW = mechanical or local; MED = touches caller logic; HIGH =
crosses module boundaries, may need design decision.

| File:line                                                           | Code                 | Category                                                            | Proposed fix                                                                                                                                                                                                  | Risk                          | Investigation needed              |
| ------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- |
| generated/inventory_data.ts:3                                       | TS2305               | missing-export downstream of gutting                                | Regenerate `generated/inventory_data.ts` from current `generated/protocol_data.ts` shape, OR rewrite import to use `PROTOCOL_CATALOG` keys.                                                                   | HIGH                          | YES (generator pipeline)          |
| generated/inventory_data.ts:5                                       | TS6192               | unused import (downstream)                                          | Drops out once line 3 fix lands.                                                                                                                                                                              | LOW                           | NO                                |
| generated/inventory_data.ts:35,36                                   | TS2532               | possibly-undefined index access                                     | Fix in regeneration; needs `noUncheckedIndexedAccess` guard.                                                                                                                                                  | MED                           | YES                               |
| generated/scene_data.ts:74,140,719,1046,1197,1399,1558,2242,3751    | TS2353               | `rows` not declared on `ResolvedSceneConfig`                        | Either add `rows?: ...` to `ResolvedSceneConfig` in `src/scene_runtime/contract.ts` (or wherever defined), or stop emitting `rows` in the generator. Choose based on whether `rows` is semantically required. | HIGH                          | YES (contract decision)           |
| OTHER_REPOS/scienceicons/\* (7 errors)                              | TS2307/TS6142/TS7006 | vendored third-party, not in deps                                   | Exclude `OTHER_REPOS/` from `tsconfig.json` `include`/`exclude`. Out of scope: tsconfig edits forbidden in WS-L2.                                                                                             | LOW (mechanical once allowed) | NO                                |
| src/game_state.ts:6                                                 | TS2305               | gutted facade `./protocol`                                          | Replace `PROTOCOL_STEPS` import with consumer of `PROTOCOL_CATALOG` or remove dead consumer.                                                                                                                  | HIGH                          | YES                               |
| src/game_state.ts:7                                                 | TS2305               | gutted facade `./inventory`                                         | Replace `REAGENTS` import with current source-of-truth or delete dead code.                                                                                                                                   | HIGH                          | YES                               |
| src/game_state.ts:211,304,348,361,428                               | TS7006               | implicit any on `s`                                                 | Add explicit type for the callback param once the iteration source is rewired.                                                                                                                                | MED                           | NO (mechanical once parent fixed) |
| src/init.ts:16-20                                                   | TS2305               | missing exports from `generated/protocol_data`                      | Rewrite to consume `PROTOCOL_CATALOG: Record<string, ProtocolConfig>` directly.                                                                                                                               | HIGH                          | YES                               |
| src/init.ts:98                                                      | TS2345               | `string \| undefined` not assignable                                | Add explicit guard or `??` fallback at the call site.                                                                                                                                                         | LOW                           | NO                                |
| src/init.ts:165                                                     | TS2532 / TS2339      | `summary` property absent on `ProtocolConfig`                       | `learning.goals` (or similar) is the new equivalent; map field.                                                                                                                                               | MED                           | YES                               |
| src/init.ts:247-510 (14 hits)                                       | TS2304               | `PROTOCOL_STEPS`/`PROTOCOL_ID` unbound                              | Downstream of TS2305 cluster at top of file; one fix removes all.                                                                                                                                             | MED                           | NO (depends on init.ts rewrite)   |
| src/init.ts:268                                                     | TS7006               | implicit any on `s`                                                 | Mechanical typing once iteration source is rewired.                                                                                                                                                           | LOW                           | NO                                |
| src/init.ts:529                                                     | TS6133               | unused `id`                                                         | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/protocol_ui.ts:9                                                | TS2305               | gutted facade `./protocol`                                          | Rewire to `PROTOCOL_CATALOG`.                                                                                                                                                                                 | HIGH                          | YES                               |
| src/scene_runtime/bundle/entry.ts:15                                | TS6196               | unused `Interaction` import                                         | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/scene_runtime/layout/adapter.ts:107,110,111                     | TS6133               | unused parameters                                                   | Underscore-prefix or remove.                                                                                                                                                                                  | LOW                           | NO                                |
| src/scene_runtime/layout/layout_engine.ts:22                        | TS6196               | unused `Row`,`Slot` imports                                         | Remove from import list.                                                                                                                                                                                      | LOW                           | NO                                |
| src/scene_runtime/layout/layout_engine.ts:724                       | TS6133               | unused `slotIndex`                                                  | Underscore-prefix or remove.                                                                                                                                                                                  | LOW                           | NO                                |
| src/scene_runtime/loader/world.ts:134,174                           | TS6133               | unused locals                                                       | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/scene_runtime/render/scene.ts:131,213                           | TS6133               | unused                                                              | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/scene_runtime/render/scene.ts:316                               | TS2339               | `labelFontSize` not on `ComputedItemLayout`                         | Either add field to layout type or stop accessing it.                                                                                                                                                         | MED                           | YES                               |
| src/scenes/bench/bench.ts:29,33                                     | TS6133               | unused `ctx`                                                        | Underscore-prefix `_ctx`.                                                                                                                                                                                     | LOW                           | NO                                |
| src/scenes/bench/dispatch.ts:15                                     | TS2305               | gutted facade                                                       | Rewire or delete.                                                                                                                                                                                             | HIGH                          | YES                               |
| src/scenes/bench/dispatch.ts:20                                     | TS2305               | gutted facade `SCENE_CONFIGS`                                       | Rewire to current scene catalog source.                                                                                                                                                                       | HIGH                          | YES                               |
| src/scenes/bench/dispatch.ts:37                                     | TS6133               | unused `step`                                                       | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/bench/render.ts:14,19,49,50                              | TS2305/TS6133        | gutted facades + unused                                             | Rewire SCENE_CONFIGS / SceneItem; remove unused.                                                                                                                                                              | HIGH                          | YES                               |
| src/scenes/capabilities/\*.ts (7 unused-param errors)               | TS6133               | unused `ctx`,`target`,`step`                                        | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/cell_culture_hood/cell_culture_hood.ts:21-32 (10 errors) | TS2305/TS6133        | gutted facades + dead helpers                                       | Rewire `REAGENTS`,`SCENE_CONFIGS`; remove unused helper imports.                                                                                                                                              | HIGH                          | YES                               |
| src/scenes/cell_culture_hood/cell_culture_hood.ts:770,774           | TS6133               | unused `ctx`                                                        | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/cell_culture_hood/render.ts:8,10,61,62,145,236           | TS2305/TS6133        | gutted facades + unused                                             | Same rewire pattern.                                                                                                                                                                                          | HIGH                          | YES                               |
| src/scenes/incubator/incubator.ts:17                                | TS2305               | `isIncubationStep`/`getIncubationSteps` from gutted `step_dispatch` | Rewire to new vocabulary equivalent or delete scene.                                                                                                                                                          | HIGH                          | YES                               |
| src/scenes/incubator/incubator.ts:139,143                           | TS6133               | unused                                                              | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/microscope/manual_hemocytometer.ts:9,309                 | TS6133               | unused                                                              | Remove import; underscore-prefix `ctx`.                                                                                                                                                                       | LOW                           | NO                                |
| src/scenes/microscope/microscope.ts:297                             | TS6133               | unused `ctx`                                                        | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/plate_reader/plate_reader.ts:167,173                     | TS6133               | unused                                                              | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/scenes/scene_driver.ts:7                                        | TS2305               | gutted facade `SCENE_CONFIGS`,`SceneConfig`                         | Rewire to current source.                                                                                                                                                                                     | HIGH                          | YES                               |
| src/scenes/shared/multiple_choice_prompt.ts:6                       | TS6196               | unused `CompletionPathMultipleChoice`                               | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/scenes/shared/scene_item_lookup.ts:10                           | TS2305               | gutted facade `SceneItem`                                           | Rewire to current type source.                                                                                                                                                                                | HIGH                          | YES                               |
| src/scenes/well_plate_workspace/dispatch.ts:7,8                     | TS6133               | unused imports                                                      | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/scenes/well_plate_workspace/render.ts:10,11,12,19,25,294        | TS2305/TS6133/TS6196 | gutted REAGENTS + unused                                            | Rewire REAGENTS; remove unused.                                                                                                                                                                               | HIGH                          | YES                               |
| src/scenes/well_plate_workspace/well_plate_workspace.ts:41          | TS6133               | unused `ctx`                                                        | Underscore-prefix.                                                                                                                                                                                            | LOW                           | NO                                |
| src/steps/drug_treatment.ts:27                                      | TS6133               | unused `registerWarning`                                            | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| src/steps/drug_treatment.ts:29                                      | TS2305               | `getModalOwnedSteps` from gutted `step_dispatch`                    | Rewire or delete step module.                                                                                                                                                                                 | HIGH                          | YES                               |
| src/svg_overlays.ts:169                                             | TS6133               | unused `message`                                                    | Underscore-prefix `_message`.                                                                                                                                                                                 | LOW                           | NO                                |
| src/ui_rendering.ts:9                                               | TS2305               | `PROTOCOL_STEPS` from gutted `./protocol`                           | Rewire to `PROTOCOL_CATALOG`.                                                                                                                                                                                 | HIGH                          | YES                               |
| src/ui_rendering.ts:13                                              | TS6133               | unused `renderGame` import                                          | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| tests/playwright/walker/index.ts:10                                 | TS6196               | unused `CompletionPath`                                             | Remove.                                                                                                                                                                                                       | LOW                           | NO                                |
| tests/playwright/walker/index.ts:180                                | TS2345               | `ClickTarget \| undefined` not assignable                           | Add explicit guard (`if (!target) continue;`).                                                                                                                                                                | LOW                           | NO                                |
| tests/playwright/walker/index.ts:213                                | TS2551               | `document.hasEventListener` does not exist                          | Remove the spurious diagnostic call; there is no such DOM API. Replace with `(document as any).__hasClickListener` if a custom hook is intended, or just drop the field.                                      | LOW                           | NO (real bug, simple)             |
| tests/playwright/walker/index.ts:234                                | TS6133               | unused `screenshotDir`                                              | Remove or underscore-prefix.                                                                                                                                                                                  | LOW                           | NO                                |
| tests/playwright/walker/index.ts:296                                | TS2345               | `ProtocolStep \| undefined` not assignable                          | Guard `if (!step) continue;` inside `for` loop body.                                                                                                                                                          | LOW                           | NO                                |
| tests/playwright/walker/index.ts:309                                | TS18048              | `step` possibly undefined                                           | Same guard fixes this.                                                                                                                                                                                        | LOW                           | NO                                |
| tests/test_dispatch_adjust.ts:12,13                                 | TS2591               | node modules not found                                              | See "Node-types decision" below.                                                                                                                                                                              | LOW                           | NO                                |
| tests/test_dispatch_click.ts:12,13                                  | TS2591               | node modules not found                                              | Same.                                                                                                                                                                                                         | LOW                           | NO                                |
| tests/test_dispatch_click.ts:146-149                                | TS2416               | `SimpleEvent` `NONE`/etc. typed as `number`, base wants literal     | Annotate as literal: `NONE = 0 as const;` (or `NONE: 0 = 0;`).                                                                                                                                                | LOW                           | NO                                |
| tests/test_dispatch_click.ts:158                                    | TS2345               | `defaultPrevented` missing from `SimpleEvent`                       | Add `defaultPrevented = false;` to the mock.                                                                                                                                                                  | LOW                           | NO                                |
| tests/test_highlight.ts:10,11                                       | TS2591               | node modules not found                                              | Same.                                                                                                                                                                                                         | LOW                           | NO                                |
| tests/test_highlight.ts:13                                          | TS2305               | `deriveHighlights` not exported                                     | Test is stale; only `renderHighlight` exists. Either delete the test, rename to `renderHighlight`, or implement `deriveHighlights` if planned.                                                                | MED                           | YES                               |

## Missing-export investigation

For each TS2305 target the gutted source module was inspected directly.

| Target import                                                                                                                                                                 | Source module                | Verdict                                                                                                                                                                                                                                                                                                     | Evidence                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PROTOCOL_STEPS`, `PROTOCOL_SUMMARY` from `src/protocol.ts`                                                                                                                   | `src/protocol.ts`            | Removed deliberately. Module is a legacy facade with body `export {};` and a comment "LEGACY FACADE: scheduled for deletion post-M6 ... re-export facade for generated/protocol_data".                                                                                                                      | Read of `src/protocol.ts` lines 1-10.                                              |
| `REAGENTS` from `src/inventory.ts`                                                                                                                                            | `src/inventory.ts`           | Removed deliberately. Same legacy-facade pattern, comment "Inventory is out of scope for the scene runtime activation plan."                                                                                                                                                                                | Read of `src/inventory.ts` lines 1-11.                                             |
| `SCENE_CONFIGS`, `SceneConfig`, `SceneItem` from `src/scene_configs.ts`                                                                                                       | `src/scene_configs.ts`       | Removed deliberately. Same legacy-facade pattern.                                                                                                                                                                                                                                                           | Read of `src/scene_configs.ts` lines 1-10.                                         |
| `getModalOwnedSteps`, `isIncubationStep`, `getIncubationSteps` from `src/step_dispatch.ts`                                                                                    | `src/step_dispatch.ts`       | Removed deliberately. Comment: "ARCHIVE: retired in WP-CONTRACT-2 ... The closed vocabulary replaces this entirely. No useful primitive remains."                                                                                                                                                           | Read of `src/step_dispatch.ts` lines 1-10.                                         |
| `DEFAULT_PROTOCOL_ID`, `SELECTED_PROTOCOL_ID`, `ProtocolId`, `PROTOCOL_IDS`, `PROTOCOL_SUMMARY`, `REQUESTED_PROTOCOL_ID`, `ProtocolSummary` from `generated/protocol_data.ts` | `generated/protocol_data.ts` | Never existed in the current emitted file. The current generator emits exactly one export: `export const PROTOCOL_CATALOG: Record<string, ProtocolConfig>` (verified by scanning the diff against `/dev/null` for `^+export`). The consumers are stale relative to the new closed-vocabulary catalog shape. | `git diff /dev/null generated/protocol_data.ts \| grep ^+export` returns one line. |
| `deriveHighlights` from `src/scene_runtime/highlight/index.ts`                                                                                                                | exists                       | Never existed. The module exports only `renderHighlight` (line 45). The test file `tests/test_highlight.ts` was written against a function that was never implemented or was renamed before merge.                                                                                                          | Read of `src/scene_runtime/highlight/index.ts`.                                    |

`git log` does not show a commit that removed these specific exports because
the gutting happened in larger refactor commits (e.g. `bdf5a9b` "Patch 1:
Browser-first protocol launcher", `92839da` "Patch C5 (WP-3.5.1, M3.WS5): Scene
migration", `ff8c664` "Stepper Part 1") that rewrote, rather than deleted, the
facade contents. The doc comments inside the facade files are themselves the
authoritative record.

## Node-types decision recommendation

The L2 cluster of TS2591 errors (`tests/test_dispatch_adjust.ts`,
`tests/test_dispatch_click.ts`, `tests/test_highlight.ts`, six lines total) has
two viable fixes.

Option A: file-scoped declarations (the WS-L pattern)

Add to the top of each affected file:

    declare module 'node:test' {
        export default function test(name: string, fn: () => void | Promise<void>): void;
    }
    declare module 'node:assert/strict' {
        const strict: { equal(a: unknown, b: unknown, msg?: string): void; ok(v: unknown, msg?: string): void; deepEqual(a: unknown, b: unknown, msg?: string): void; throws(fn: () => unknown, msg?: string): void; };
        export default strict;
    }

- Pros: zero change to `tsconfig.json` or `package.json`. Matches WS-L precedent
  (`declare const process: ...` in `tests/test_layout_integration.ts`).
- Cons: scattered across three files; declaration set must be kept in sync with
  what each test actually uses; partial type coverage of `node:assert/strict`.

Option B: install `@types/node` and add `"types": ["node"]` to tsconfig

- Pros: one fix; complete and accurate node API types for every current and
  future test file; matches the standard recipe TypeScript itself prints in the
  TS2591 message.
- Cons: adds a devDependency; adds a `types` entry to `tsconfig.json` (broader
  scope than this triage permits); restricting `types: ["node"]` shrinks the
  ambient lib surface (must explicitly opt in to any future ambient type
  packages); the canonical `docs/TYPESCRIPT_STYLE.md` `tsconfig` table does not
  currently list a `types` field.

Recommendation: Option B (install `@types/node`, add `"types": ["node"]` to
`tsconfig.json`). Rationale:

- Three test files affected today, and any future `node:*` import (timers,
  fs, path) will hit the same wall. The scattered-declare approach scales
  linearly with new tests.
- The Node test runner is the canonical pure-Node test target per
  `docs/TYPESCRIPT_STYLE.md` (`tests/test_smoke.mjs`, "pure Node unit tests via
  `node --test`"). Treating `node:test` as a first-class supported import set
  matches that intent.
- The cost is one devDependency line and one tsconfig field. The `types` field
  is a standard, documented `tsc` option; adding it does not violate any
  current style rule, though it does require either updating the
  `tsconfig.json` canonical table in `docs/TYPESCRIPT_STYLE.md` or
  explicitly noting the deviation in `docs/CHANGELOG.md`.

If the manager is unwilling to touch `tsconfig.json` / `package.json` in this
sweep, Option A is acceptable but should be marked technical debt with a
followup ticket to migrate to Option B.

## Recommended dispatch order

Mechanical first (LOW risk, no investigation), then narrow guards, then
broader-scope rewires last.

### Phase 1: mechanical sweep (LOW risk, parallelizable)

Single fresh subagent per file or per directory. No design decisions.

1. Unused-import/local/parameter sweep across:
   - `src/scene_runtime/bundle/entry.ts:15`
   - `src/scene_runtime/layout/adapter.ts:107,110,111`
   - `src/scene_runtime/layout/layout_engine.ts:22,724`
   - `src/scene_runtime/loader/world.ts:134,174`
   - `src/scene_runtime/render/scene.ts:131,213`
   - `src/scenes/bench/bench.ts:29,33`
   - `src/scenes/bench/dispatch.ts:37` (the other errors in this file are HIGH; handle :37 with the other unused-param fixes)
   - `src/scenes/capabilities/*.ts` (7 unused-param errors across 7 files)
   - `src/scenes/cell_culture_hood/cell_culture_hood.ts:770,774`
   - `src/scenes/incubator/incubator.ts:139,143`
   - `src/scenes/microscope/manual_hemocytometer.ts:9,309`
   - `src/scenes/microscope/microscope.ts:297`
   - `src/scenes/plate_reader/plate_reader.ts:167,173`
   - `src/scenes/shared/multiple_choice_prompt.ts:6`
   - `src/scenes/well_plate_workspace/dispatch.ts:7,8`
   - `src/scenes/well_plate_workspace/well_plate_workspace.ts:41`
   - `src/steps/drug_treatment.ts:27`
   - `src/svg_overlays.ts:169`
   - `src/ui_rendering.ts:13`
   - `tests/playwright/walker/index.ts:10,234`
   - `src/init.ts:529`
     Rule: underscore-prefix unused parameters that document call signatures;
     remove unused imports and unused locals outright.
2. Walker narrowing fixes in `tests/playwright/walker/index.ts`:
   - lines 180, 296, 309: add `if (!target) continue;` / `if (!step)
continue;` guards inside the `for` loops.
   - line 213: remove the bogus `document.hasEventListener?.('click')`
     diagnostic call; there is no such DOM API.
3. `SimpleEvent` mock fixes in `tests/test_dispatch_click.ts`:
   - lines 146-149: change `NONE = 0;` etc. to `NONE = 0 as const;` (and
     same for the other three numeric phase constants) to satisfy the
     literal-type constraint from `Event`.
   - line 158: add `defaultPrevented = false;` member to the mock class so
     the `SimpleEvent` is assignable to `Event`.

### Phase 2: node-types fix (LOW once decided, but broader scope)

One subagent. Either apply Option A (file-scoped declares) across three test
files, or apply Option B (install `@types/node`, add `"types": ["node"]`).
This phase is gated on the manager picking A or B. Recommendation above is B
but requires lifting the "no tsconfig/package.json edits" boundary; if that
boundary stays, dispatch as A.

### Phase 3: investigation-required, narrow scope (MED risk)

3a. `tests/test_highlight.ts:13` `deriveHighlights` import.
Decide: delete the test, rename to `renderHighlight` (with corresponding
test body rewrite), or implement `deriveHighlights`. This is a small,
isolated test file; one subagent.

3b. `src/scene_runtime/render/scene.ts:316` `labelFontSize` access.
Decide: add `labelFontSize?: number;` to `ComputedItemLayout` (in the
layout/contract module), or stop reading it. One subagent.

3c. `src/init.ts:98` narrowing, `:165` `summary` access.
Local guard fixes; one subagent.

### Phase 4: broader-scope rewires (HIGH risk, sequential)

The gutted-facade cluster is the largest remaining piece. All four facades
(`src/protocol.ts`, `src/inventory.ts`, `src/scene_configs.ts`,
`src/step_dispatch.ts`) plus the stale `generated/protocol_data.ts`
consumers must be rewired to either the closed-vocabulary
`PROTOCOL_CATALOG` shape or to the current scene/inventory source of truth.
Affected files (each may need its own subagent, but planning must precede
dispatch):

- `src/init.ts` (heaviest; 5 missing imports drive 14 unbound references).
- `src/game_state.ts`
- `src/protocol_ui.ts`
- `src/ui_rendering.ts`
- `src/scenes/scene_driver.ts`
- `src/scenes/bench/dispatch.ts`, `src/scenes/bench/render.ts`
- `src/scenes/cell_culture_hood/cell_culture_hood.ts`, `src/scenes/cell_culture_hood/render.ts`
- `src/scenes/incubator/incubator.ts`
- `src/scenes/shared/scene_item_lookup.ts`
- `src/scenes/well_plate_workspace/render.ts`
- `src/steps/drug_treatment.ts`
- `generated/inventory_data.ts` (regeneration, or pipeline fix)
- `generated/scene_data.ts` (TS2353 `rows`: contract decision required)

Before dispatching Phase 4, the manager needs an explicit design call on:

- What is the canonical replacement for `PROTOCOL_STEPS`, `PROTOCOL_SUMMARY`,
  `REAGENTS`, `SCENE_CONFIGS`, `SceneConfig`, `SceneItem`,
  `getModalOwnedSteps`, `isIncubationStep`, `getIncubationSteps`? Is each of
  these dead (delete callers), renamed (rewire), or pending (write
  placeholder/stub)?
- For `rows` on `ResolvedSceneConfig`: extend the contract type, or stop
  emitting it from the generator?
- For `generated/inventory_data.ts`: regenerate from the pipeline, or
  hand-edit to consume `PROTOCOL_CATALOG`?

### Phase 5: vendored code

`OTHER_REPOS/scienceicons/` is third-party vendored code pulled in by
`include: ["**/*.ts"]`. The clean fix is to add `OTHER_REPOS` to
`tsconfig.json` `exclude`. Defer until Phase 2's tsconfig boundary is
resolved.
