# NEW3 Batch 5 Resume Notes (Post-Commit Forward Mode)

Date: 2026-05-21
Status: Forward-only after commit 4e2c709 acceptance.

## What stays as-is

### Workstream A (gold fixes) - DONE

All 7 fixes REVERTED. No keeper. Reason: footprint reclassifications caused corpus regressions; metadata mappings produced no measurable change.
Implication: AC's predicted ROI assumed YAML changes propagate. Static stress harness has hardcoded footprint mapping in render_stress_to_html.py (per Workstream AB/D). Predicted gains require Option 1 ALIGN from D (user-gated) OR measurement against production runtime not stress harness.

### Workstream B (Phase 1 dry-run) - DONE_WITH_CONCERNS

Helper script + evidence doc landed. Critical finding: Batch 2-N canonical visual_audit.json is STALE. Helper read pre-fix data. N-win confirmation needs full_comparison.json, not visual_audit.json.
Status: proposal-ready. User can review docs/active_plans/new3_scorecard_no_crop_alignment_proposal.md + new3_batch5_phase1_hardfailcount_dryrun.md.
No code change to score_layout.mjs without user approval.

### Workstream C (Corpus v1 measurement) - DONE

100 scenes, 1043 hard_fails (549 cbp + 490 ad_HF). Median 10/scene. Confirmed Corpus v1 baseline.
Status: stored at scorecard_batch5_corpus_v1/. Use as comparison baseline going forward.

### Workstream D (pipeline alignment options) - DONE_WITH_CONCERNS

Recommendation: DOCUMENT_DIVERGENCE (defer ALIGN to production-fidelity phase).
Status: proposal landed. No code change.

### Workstream E (scorecard cleanup) - DONE

2 files annotated. Hygiene test passes.
Status: complete.

### Workstream F (visual polish pilot) - DONE (but triggered the commit incident)

2 CSS tweaks applied: label max-width 100->110, --gap-object: 10px for crowded.
Status: tweaks accepted as part of baseline 4e2c709. Visual improvement marginal.

### Workstream G (gallery) - DONE

BATCH4_VISUAL_OK. 6 contact sheets, 43 scenes.
Status: complete.

### Workstream H (Batch 4 report) - DONE

Synthesis report at new3_batch4_test_system_hardening_report.md.

## What is kept as proposal-only

- Phase 1 hardFailCount alignment - awaits user approval (diagnostic semantic change)
- Phase 2 hardFailCount zeroing switch - awaits Phase 1 evidence + user
- ALIGN render_stress_to_html.py with YAML - deferred to production-fidelity phase
- New footprint classes (landscape-container, etc.) - awaits user vocab decision
- Contract item 3 amendment - awaits Version A/B/reject decision
- Game viewport contract (4:3) - carryover from Batch 1

## What can resume immediately (safe forward work)

1. Continue gold scene polish work via canonical scorecard (do not touch stress harness alignment).
2. Generate Batch 6 candidates: visual polish trials on remaining 7 gold scenes.
3. Document static-stress-pipeline divergence further (no code change).
4. Run pytest periodically to keep 1201 passing.
5. Refresh Corpus v1 measurement when needed.
6. Continue read-only audits.

## Batch 6 readiness

Ready to plan if user approves continuation. Suggested Batch 6 scope: visual polish on remaining gold scenes + scorecard alignment Phase 1 (if user approves) + documentation pass.

## Boundaries

- No further agent commits.
- No git add -A.
- No history rewrite.
- No diagnostic semantic changes without user approval.
- No new footprint vocabulary without user approval.
- No contract surface additions.
