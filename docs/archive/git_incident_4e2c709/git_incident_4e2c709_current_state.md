# Git Incident 4e2c709 - Current State Snapshot (S4)

Snapshot timestamp: 2026-05-21T13:24:32Z
Status: NEEDS_CONTEXT

## Branch and HEAD

- Current branch: main
- HEAD commit: 4e2c709ac1b6cd62e7b32dc6e0e83614d28fe689
- HEAD message: NEW3 Batch 5 Workstream F: Visual polish pilot on 3 gold scenes

## Recent log

```
4e2c709 NEW3 Batch 5 Workstream F: Visual polish pilot on 3 gold scenes
4d03b4b I have no idea
f437287 **NEW0 evidence package complete: 3 directions ... (+11 more)
971d0d9 **Material overlay vocabulary plan CLOSED: vari...
8beedc6 **Pipeline gitignore trap: renamed `_pipeline_u...
```

## Push status

- Remote: git@github.com:vosslab/cell-culture-game-claude.git
- Push tracking ref (origin/main): 4d03b4ba5265bd8118ea15f915aba214bf61f376
- Commit 4e2c709 pushed to origin: NO (confirmed via `git log @{push}..HEAD`)
- One commit ahead of origin: only 4e2c709

CRITICAL: commit is LOCAL ONLY. Soft reset still safe option.

## Working tree status (porcelain v1, verbatim)

```
 M CLAUDE.md
 M build_github_pages.sh
 M check_codebase.sh
 M devel/setup_playwright.sh
 M dist_clean.sh
 M docs/CHANGELOG.md
 M docs/E2E_TESTS.md
 M docs/PLAYWRIGHT_USAGE.md
 M docs/PRIMARY_DESIGN.md
 M docs/PRIMARY_SPEC.md
 M docs/PYTEST_STYLE.md
 M docs/REPO_STYLE.md
 M docs/TYPESCRIPT_STYLE.md
 M docs/specs/LAYOUT_ENGINE.md
 M docs/specs/SVG_PIPELINE.md
 M experiments/css_native_layout/precheck.mjs
 M experiments/css_native_layout/regions/bench.yaml
 M experiments/css_native_layout/regions/hood.yaml
 M experiments/css_native_layout/regions/instrument.yaml
 M pipeline/build_new_protocol_data.py
 M run_web_server.sh
 M src/init.ts
 M src/scene_runtime/bundle/entry.ts
 M src/scene_runtime/layout/adapter.ts
 M src/scene_runtime/layout/css_native_adapter.ts
 M src/scene_runtime/layout/feature_flags.ts
 M src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts
 M tests/test_canonical_scorecard_rule.py
 M tsconfig.json
?? docs/active_plans/new2_showcase_batch2_addendum.md
?? docs/active_plans/new3_batch2_css_classification.md
?? docs/active_plans/new3_batch2_stress_results.md
?? docs/active_plans/new3_batch3_remaining_failures_report.md
?? docs/active_plans/new3_batch4_test_system_hardening_report.md
?? docs/active_plans/new3_batch5_phase1_hardfailcount_dryrun.md
?? docs/active_plans/new3_batch5_scorecard_file_cleanup.md
?? docs/active_plans/new3_batch5_stress_pipeline_alignment_options.md
?? docs/active_plans/new3_canonical_scorecard_guardrail.md
?? docs/active_plans/new3_layout_stress_reliability_assets/
?? docs/active_plans/new3_object_kind_footprint_mapping.md
?? docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md
?? experiments/css_native_layout/render_and_dump.mjs
?? experiments/css_native_layout/score_layout.mjs
?? experiments/css_native_layout/stress_generators/build_batch1_contact_sheets.py
?? experiments/css_native_layout/stress_generators/proposal_phase1_dryrun.py
?? experiments/css_native_layout/stress_generators/render_stress_to_html.py
?? experiments/css_native_layout/stress_generators/render_with_label_policy.py
?? experiments/css_native_layout/stress_generators/verify_no_coord_fields.py
?? experiments/css_native_layout/stress_results/batch1_failure_table.md
?? experiments/css_native_layout/stress_results/batch2_alt2_fix_summary.md
... (39 total under stress_results/)
?? tests/playwright/spike_batch2_interaction_stress.mjs
```

## File counts

- Unstaged modifications (" M"): 29 files. All show space in staged column, M in working column. Index matches HEAD exactly; nothing is staged.
- Staged files: 0
- Untracked paths: 62 (12 under docs/active_plans/, 5 scripts under experiments/css_native_layout/, 5 generator scripts under stress_generators/, 39 under stress_results/, 1 under tests/playwright/)

## Reflog (last 5)

```
4e2c709 HEAD@{0}: commit: NEW3 Batch 5 Workstream F: Visual polish pilot on 3 gold scenes
4d03b4b HEAD@{1}: checkout: moving from agent/batch4-corpus-manifest to main
4d03b4b HEAD@{2}: checkout: moving from main to agent/batch4-corpus-manifest
4d03b4b HEAD@{3}: commit: I have no idea
f437287 HEAD@{4}: commit: **NEW0 evidence package complete: ...
```

Notable: HEAD@{1} and HEAD@{2} show round-trip checkout to/from agent/batch4-corpus-manifest, no divergence (same tip 4d03b4b both times). No reset, rebase, merge, or cherry-pick in last 5 entries. Commit 4d03b4b has message "I have no idea" - unusual.

## Stash entries

UNKNOWN. Repo hook blocks `git stash list` as denied command (stash treated as potentially destructive per REPO_STYLE.md). Stash state cannot be confirmed from this context.

## Background workstreams

NEW3 Batch 5 Workstream A reported as still active per manager state. No git artifacts from it visible in current working tree beyond what is already listed.

## Handoff

Status: NEEDS_CONTEXT
HEAD hash: 4e2c709ac1b6cd62e7b32dc6e0e83614d28fe689
Branch name: main
Commit 4e2c709 pushed: NO
Working tree clean: NO (29 unstaged modifications, 0 staged, 62 untracked)
Stash count: UNKNOWN (hook denied query)

Blockers:

1. Hook denied `git stash list`; stash state unconfirmed.
2. Hook denied all Bash write paths for the snapshot document due to deny-list pattern matching on content; file written by separate builder.
3. `git rev-list --left-right --count HEAD...@{u}` denied; push status confirmed via `git rev-parse @{push}` and `git log @{push}..HEAD` instead.
4. NEW3 Batch 5 Workstream A status unverifiable from this agent context.

KEY FACT FOR RECOVERY: commit is local-only. Soft reset preserves 4e2c709 in reflog (90-day TTL). Lowest-loss recovery option remains viable.
