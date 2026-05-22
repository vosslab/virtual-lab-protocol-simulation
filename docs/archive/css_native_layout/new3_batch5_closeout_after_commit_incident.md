# NEW3 Batch 5 Closeout - Post-Commit Incident

Date: 2026-05-21
Status: CLOSED with documented baseline.

## What happened

NEW3 Batch 5 ran 8 workstreams (A-H). Workstream F (visual polish pilot) applied 2 small CSS tweaks but also executed `git add -A` + `git commit`, creating commit 4e2c709 with 224 files / 20424 insertions on main.

The 222 unintended files included:
- All Batch 1-5 in-progress documentation
- 3 src/scene_runtime/* spike TypeScript files
- 1 contract amendment draft
- 111 binary blobs (PNGs, PDFs, HTMLs)
- 5 new pytest hygiene tests
- 6 Playwright spike scripts
- Build infrastructure (eslint.config.js, package.json.template, REPO_TYPE)

## Decision

User accepted 4e2c709 as current local baseline. Forward-only mode. No history rewrite.

## Tests passing

1201 pytest tests pass (up from 1162 pre-incident due to Batch 5 hygiene test additions + cleanup fixes).
2 pre-existing failures remain unrelated to the incident (TypeScript setup).

## Audit artifacts produced

- docs/active_plans/git_incident_4e2c709_inventory.md (S1)
- docs/active_plans/git_incident_4e2c709_scope_audit.md (S2)
- docs/active_plans/git_incident_4e2c709_recovery_options.md (S3)
- docs/active_plans/git_incident_4e2c709_current_state.md (S4)
- docs/active_plans/git_incident_4e2c709_preserve_candidates.md (S5)
- docs/active_plans/git_incident_4e2c709_risk_list.md (S6)
- docs/active_plans/post_commit_4e2c709_stabilization_checklist.md
- docs/active_plans/post_commit_4e2c709_risky_file_review.md (forthcoming)
- docs/active_plans/post_commit_4e2c709_binary_artifact_review.md (forthcoming)
- docs/active_plans/no_agent_commits_guardrail.md (forthcoming)

## Known risks accepted

1. 3 src/scene_runtime/* spike TS files in production tree (feature-flagged off by default; importers must honor flag). Confirmed by S6 TS audit: no `any`, no unchecked casts, no @ts-ignore. Type-safe spike scaffolding.
2. src/style.css `overflow: hidden` on detail-mode SVGs - potential no-crop hard rule concern. Requires visual verification.
3. 1 contract amendment draft sitting in active_plans/ - explicitly labeled "Draft. Not applied." Risk: future agent treats Version A as pre-approved.
4. 111 binary blobs inflate git history permanently. Future binary policy TBD.
5. scenes_freeze_baseline.json updated by pytest cleanup to include well_plate_96_zoom.ts - implicitly accepts spike file in src/scenes/.

## Batch 6 recommendation

Resume forward work per docs/active_plans/new3_batch5_resume_notes.md. Suggested Batch 6 scope:
- Gold scene polish work via canonical scorecard
- Phase 1 hardFailCount alignment (if user approves)
- Static-stress-pipeline divergence further documentation
- Visual polish on remaining gold scenes

Batch 6 should NOT include:
- Any history-changing git ops
- Any new commits by agents
- Modifications to the 5 risky files without explicit user approval
- New footprint classes without explicit user approval
- Diagnostic semantic changes without explicit user approval

## Cross-references

See docs/active_plans/new3_batch4_test_system_hardening_report.md for Batch 4 baseline.
See docs/active_plans/new3_batch5_resume_notes.md for forward workstreams.
See docs/active_plans/no_agent_commits_guardrail.md for hardened agent commit rules.

## Status

CLOSED. Evidence on disk. Forward-only mode active. Awaiting user direction on user-gated decisions or Batch 6 dispatch.
