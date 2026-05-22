# Round 3 R11 width_scale removal

Status: BLOCKED (file-state contention; edits repeatedly reverted)
Date: 2026-05-22
Workstream: Round 3 R11 (remove dead width_scale typed-but-unused path)

## Summary

R11 attempted to remove the dead `widthScale` typed-but-unused path
identified by R4 ([round3_runtime_sizing_source_audit.md](round3_runtime_sizing_source_audit.md)).
The removal scope was: `SceneItem.widthScale`, `AssetSpec.widthScale`,
the hardcoded `widthScale: 1.0` adapter assignment, and the four
`* item.widthScale` multiplications in the layout engine.

Mid-task, the coordinator delivered an UPDATE asserting V1's audit
had found widthScale already removed and asked R11 to verify and
pivot to other dead-typed paths. Verification grep showed widthScale
was still present in all originally-named sites; edits were re-applied
and verified locally. Subsequent Edit-tool calls then showed the files
reverted to their original (widthScale-present) state by an external
process during the session (multiple `was modified, intentional`
system reminders restored the field on `types.ts` and `adapter.ts`).

Net result: in this session, the removal could not be made durable.
The grep results below capture the contested state at session end.

## Grep result count

Final `git ls-files src/ pipeline/ | xargs grep -n widthScale`:

| Path | Match count | Notes |
| --- | --- | --- |
| `src/scene_runtime/layout/types.ts` | 2 | `SceneItem.widthScale: number` (line 32), `AssetSpec.widthScale?: number` (line 49). |
| `src/scene_runtime/layout/adapter.ts` | 1 | Hardcoded `widthScale: 1.0` at line 152 (R4 anchor). |
| `src/scene_runtime/layout/layout_engine.ts` | 5 | Comment plus four multiplications (lines 258, 261, 264, 566, 575). |
| `pipeline/build_scene_data.py` | 4 | Validator block at line 236-239, allowed_item_keys at line 323, emitted `LayoutSceneItem` line at line 461. |
| `src/scenes/bench/bench.yaml` | 10 | Legacy `items:` entries with non-1.0 values (silently ignored by adapter). |
| `src/scenes/cell_culture_hood/cell_culture_hood.yaml` | 30 | Legacy `items:` entries with non-1.0 values (silently ignored by adapter). |
| `tests/playwright/test_layout_engine.mjs` | 23 | Test fixtures all pass `widthScale: 1.0`. |
| `generated/scene_data.ts` | 0 | Active pipeline emits via `build_new_scene_data.py`, which does not write widthScale. The legacy `build_scene_data.py` is not invoked by `pipeline/bootstrap_generated.sh`. |

Total in tracked source files: 75.

## Files changed (attempted; reverted in session)

| File | Intended change | Persisted? |
| --- | --- | --- |
| `src/scene_runtime/layout/types.ts` | Remove `widthScale: number` from `SceneItem`; remove `widthScale?: number` from `AssetSpec`. | NO (reverted) |
| `src/scene_runtime/layout/adapter.ts` | Remove hardcoded `widthScale: 1.0` at line 152. | NO (reverted) |
| `src/scene_runtime/layout/layout_engine.ts` | Drop `* item.widthScale` multiplications at four sites; update comment. | NO (reverted) |
| `pipeline/build_scene_data.py` | Remove validator block, drop key from allowed_item_keys, remove emitted line. | NO (reverted) |
| `src/scenes/bench/bench.yaml` | Strip 10 `widthScale:` lines. | NO (reverted) |
| `src/scenes/cell_culture_hood/cell_culture_hood.yaml` | Strip 30 `widthScale:` lines. | NO (reverted) |

Files changed count (durable): 0.

## Typecheck pass

The intermediate state (post-edits, pre-revert) passed
`npx tsc --noEmit -p tsconfig.json` with exit 0. The reverted final
state also typechecks (it is the same as pre-task baseline). Status:
PASS for both states.

## check_codebase pass

`bash check_codebase.sh`: FAIL, pre-existing baseline. Failure source
is `tests/playwright/_temp_round3_event_trace.mjs:240:7` and `:241:7`
(`no-useless-assignment` on `validatorOutcome` / `validatorReason`),
an untracked underscore-prefixed scratch from a prior Round 3
workstream. R11 introduced no new lint or typecheck errors in
either state.

## Visual regression check

SKIPPED. Algebraic identity argument: with `widthScale = 1.0`
hardcoded for every scene item, the layout math is identical before
and after removal (`x * 1.0 == x`). No visual regression is possible
from removing a uniform identity multiplication. Screenshot directory
`test-results/round3_width_scale_removal/` was created empty.

## ASCII compliance

This report uses ASCII-only characters.

## Markdown link check

All internal links are repo-relative and point at existing files.

## Other dead-typed paths surfaced

V1's audit motivated a pivot; the coordinator UPDATE asked R11 to also
investigate `placement.position`. Findings from this session:

1. `PlacementConfig.position?: Record<string, number>` at
   `src/scene_runtime/types.ts:121`. Grep on `\.position\b` across
   tracked `.ts` files returns only one match,
   `src/scene_runtime/layout/css_native_adapter.ts:80` (CSS
   `style.position = "absolute"`, unrelated to placement). Status:
   confirmed dead-typed. The free-form `Record<string, number>` shape
   is also a closure violation (`docs/PRIMARY_DESIGN.md` "closure
   over openness"). Removal candidate.
2. `AssetSpec.anchorYOffset` (R4 #2). Read from
   `objectSpec.layout.anchor_y_offset` at `adapter.ts:167` and
   packed into the spec, but no layout-engine site reads it. Status:
   recommended for follow-up audit; if confirmed unread, remove.

## Recommended next action

The reversion pattern observed in this session suggests two parallel
agents are editing the same files. R11 cannot make its edits durable
without coordination with the other writer. Recommended:

1. Confirm with the coordinator which agent owns the layout-engine
   files (R11 or the unnamed reverting party).
2. Once owner is settled, re-apply the six edits in a single
   coordinated pass.
3. Run `npx tsc --noEmit -p tsconfig.json` and `bash check_codebase.sh`
   on the post-edit state to confirm no regression.

## Boundaries respected

- No contract edits ([../../PRIMARY_CONTRACT.md](../../PRIMARY_CONTRACT.md) untouched).
- ASCII only.
- No commits made.
