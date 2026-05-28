# Git archaeology: runtime bundle

Date: 2026-05-27
Mission: locate / recover src/scene_runtime/bundle/ source from git history.

## Conclusion

Runtime existed in repo from 2026-05-17 to 2026-05-22. Deleted on
2026-05-22 in commit 635f827 ("clean up", 41 files, 9336 lines removed).
Full source recovered from git history. Branch
`agent/batch4-corpus-manifest` still carries an earlier 817-line version.

This downgrades the WP-0-3 Case C classification toward Case B with a
recoverable target: runtime existed, contract is known, recovery path
exists.

## Commits found

| SHA | Date | Author | Event |
| --- | --- | --- | --- |
| ff8c664 | 2026-05-17 18:04:19 | Dr. Neil R Voss | CREATED bundle/ directory |
| 03a50dc | 2026-05-21 16:27:46 | Dr. Neil R Voss | Status report corrections |
| b24d031 | 2026-05-22 00:49:04 | Dr. Neil R Voss | NEW2 prep-and-prototype closure |
| 635f827 | 2026-05-22 08:49:42 | Dr. Neil R Voss | DELETED bundle/ (41 files, 9336 lines) |

## Recovered files

Location: `/tmp/recovered_runtime/`

| File | Lines | Size | Source |
| --- | --- | --- | --- |
| `entry.ts` | 952 | 32 KB | Latest state before deletion (635f827^) |
| `entry_creation.ts` | 817 | 29 KB | Initial creation state (ff8c664) |
| `entry_batch4.ts` | 817 | 29 KB | Branch `agent/batch4-corpus-manifest` |

The 952-line `entry.ts` is the most evolved. Recommend using it as primary
source for the runtime-seam plan.

## Runtime architecture (from entry.ts:1-40)

`entry.ts` exports `mountRuntime(rootElement, runtimeData)`. Imports
indicate the full subsystem layout:

- `../types` -- RuntimeWorld, SceneOperation, InteractionEvent,
  ValidatorPreset, Step.
- `../render/scene` -- renderScene.
- `../render/apply` -- applySceneOperation.
- `../render/clock` -- Clock type.
- `../dispatch/click` -- attachClickDispatch.
- `../chrome/adjust_panel`, `next_button`, `prompt_panel`,
  `feedback_area`, `scene_frame` -- UI surfaces.
- `../loader/index` -- setProtocolCatalog, setSceneCatalog,
  setObjectCatalog.

This means the deletion removed not just one file but an entire subsystem
(~41 files per the commit's 9336-line footprint):

- `src/scene_runtime/bundle/entry.ts`
- `src/scene_runtime/render/` (scene, apply, clock)
- `src/scene_runtime/dispatch/` (click)
- `src/scene_runtime/chrome/` (adjust_panel, next_button, prompt_panel,
  feedback_area, scene_frame)
- `src/scene_runtime/loader/`
- Supporting `types.ts` additions

Current `src/scene_runtime/` carries only `layout/` and `renderer/`. The
deletion did not touch those.

## Branch status

- `main`: directory deleted in 635f827.
- `agent/batch4-corpus-manifest`: directory preserved at the 817-line
  creation state.

## Recommendation

The runtime-seam follow-on plan now has three concrete recovery options
instead of speculation:

1. Cherry-pick / revert the deletion commit 635f827. Restores the
   entire 9336-line subsystem. Risk: pulls back architectural problems
   that motivated the deletion. Verify the commit message ("clean up")
   and surrounding plan docs to understand the reason for removal.
2. Bring back from branch `agent/batch4-corpus-manifest`. Different
   tradeoff: 817-line earlier version, may be cleaner / less
   experimental.
3. Use recovered source as reference, redesign. Read
   `/tmp/recovered_runtime/entry.ts` to extract the runtime contract,
   then design a cleaner version that consumes the typed seam directly
   instead of `window.gameState`.

Recommend the runtime-seam plan evaluate option 1 first (full restore +
audit), since 9336 lines of working code likely is cheaper to revive
than redesign.

## Status

- Status label: DONE.
- Plan implication: update WP-0-3 case classification from C to
  "C-recoverable" or B. The web-ui shell plan halt remains in effect
  until the runtime-seam plan resumes the runtime in `src/`.
- Followup actions for the runtime-seam plan agent:
  - Read 635f827 commit message and surrounding CHANGELOG entries to
    understand the deletion motivation.
  - Inspect /tmp/recovered_runtime/entry.ts for the implicit runtime
    contract.
  - Decide which of the three recovery options the plan recommends.
