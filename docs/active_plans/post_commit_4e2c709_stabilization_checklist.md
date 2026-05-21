# Post-Commit 4e2c709 Stabilization Checklist

Date: 2026-05-21
Status: Forward-only mode active.

## Decision

User accepted commit 4e2c709 as current local baseline. No further recovery actions. Move forward.

## Accepted as baseline

- HEAD: 4e2c709 (local main; NOT pushed to origin)
- 224 files / 20,424 insertions / 163 deletions committed
- Includes 3 production TS files (src/scene_runtime/layout/css_native_adapter.ts, feature_flags.ts; src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts)
- Includes 5 new pytest files + 6 Playwright spike scripts + 1 dev_smoke fixture (3 YAMLs)
- Includes 1 contract amendment DRAFT (new1_primary_contract_item3_amendment_draft.md)
- 111 binary blobs (PNGs/PDFs/HTML)

## Known risky areas (do NOT modify without explicit approval)

1. src/scene_runtime/layout/css_native_adapter.ts (242 lines spike code)
2. src/scene_runtime/layout/feature_flags.ts (module-level mutable state for spike)
3. src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts (SceneAdapter object literal not typed)
4. src/style.css (8 added lines include `overflow: hidden` on detail-mode SVGs; potential no-crop rule conflict)
5. docs/active_plans/new1_primary_contract_item3_amendment_draft.md (contract amendment proposal; requires user Version A/B/reject)

## Files still requiring user review

See docs/active_plans/post_commit_4e2c709_risky_file_review.md for detail.

## Tests to run before any human commit/push

```bash
source source_me.sh && pytest tests/ -q
```

Currently: 1201 passing, 2 pre-existing failures (TypeScript setup unrelated to incident).

If any of the 5 risky files are modified, additionally:
```bash
npx tsc --noEmit
npx eslint src/
```

For visual verification of src/style.css no-crop concern:
```bash
node experiments/css_native_layout/precheck.mjs
```
Then visually inspect well_plate_96_zoom rendered output.

## What agents should avoid

NO git commit
NO git add -A or git add .
NO git reset, git revert, git rebase, git cherry-pick, git push
NO history rewrite operations
NO broad cleanup that sweeps uncommitted working tree
NO modifications to the 5 risky files without explicit user approval
NO new contract surface additions (PRIMARY_CONTRACT items) without user approval

Agents MAY:
- Stage specific files when explicitly instructed by user
- Run pytest / canonical scorecard / precheck
- Edit bounded experiment files per existing workstream plans
- Write new docs/active_plans/ documentation
- Continue NEW3 stress/polish forward work
- Run read-only git inspection

## Future commits

Humans own all commits. When ready, human will:
1. Review staged changes via `git diff` or `git status`
2. Make a clean commit (or split into multiple)
3. Push when ready

Agents will provide commit-ready stage state but never execute the commit.

## Working-tree state post-incident

29 modified tracked files + 62 untracked files at time of S4 snapshot. Subsequent pytest cleanup added more bounded modifications. Working tree continues to evolve as forward work proceeds.

## Cross-references

- docs/active_plans/git_incident_4e2c709_inventory.md (S1)
- docs/active_plans/git_incident_4e2c709_scope_audit.md (S2)
- docs/active_plans/git_incident_4e2c709_recovery_options.md (S3)
- docs/active_plans/git_incident_4e2c709_current_state.md (S4)
- docs/active_plans/git_incident_4e2c709_preserve_candidates.md (S5)
- docs/active_plans/git_incident_4e2c709_risk_list.md (S6)
- docs/active_plans/post_commit_4e2c709_risky_file_review.md (forthcoming)
- docs/active_plans/post_commit_4e2c709_binary_artifact_review.md (forthcoming)
- docs/active_plans/no_agent_commits_guardrail.md (forthcoming)
- docs/active_plans/new3_batch5_closeout_after_commit_incident.md (forthcoming)
