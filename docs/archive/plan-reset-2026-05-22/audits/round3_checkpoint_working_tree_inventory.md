# Round 3 checkpoint working tree inventory

Read-only checkpoint catalog of every uncommitted path in the working tree.
HEAD reference cited inside the audited docs: `8795d25`.
Date: 2026-05-21.
Source commands: `git status --short`, `git diff --stat`, `git diff --name-status`.

## Summary

- Total uncommitted paths: 7 files across 2 new subdirectories and 2 root files.
- All paths are untracked. No tracked file is modified, renamed, or deleted.
- Every file is Markdown under `docs/active_plans/`. No source, YAML, CSS, TS,
  test, or generated artifact is touched.
- All seven files declare `Read-only` or `doc-only; no code, YAML, or CSS edits`
  scope and cite HEAD `8795d25` as the audited revision.
- Subdirectory placement matches the closed set in
  REPO_STYLE.md "Active plans folder organization"
  (`audits/` and `decisions/`).

## File count by category

| Category         | Count |
| ---------------- | ----- |
| docs-active-plan | 7     |
| source           | 0     |
| experiment       | 0     |
| docs-canonical   | 0     |
| generated-output | 0     |
| test-result      | 0     |
| config           | 0     |

## Inventory table

All entries are category `docs-active-plan`.

| path                                                                       | category         | purpose                                                                                                                                                                            | recommendation | rationale                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/active_plans/active_plans_organization_proposal.md                    | docs-active-plan | Phase 1 proposal cataloging the 52 tracked files under `docs/active_plans/` and proposing a closed subdirectory set; explicitly proposal-only with no file moves.                  | KEEP           | Documents the rationale for the new `audits/` and `decisions/` subdirs that hold the rest of this checkpoint set; aligns with REPO_STYLE.md active-plans organization rule. |
| docs/active_plans/no_crop_round3_next_fix_queue.md                         | docs-active-plan | Synthesis queue ranking the next durable no-crop fixes against the 8-tier fix-priority chain, citing the five Round 3 audits and the reconciliation decision record.               | KEEP           | Acts as the index doc tying the six sibling audit/decision files together; doc-only synthesis, no code impact.                                                              |
| docs/active_plans/audits/no_crop_asset_specs_coverage.md                   | docs-active-plan | Read-only audit cross-checking `src/asset_specs.ts` (31 entries) against the 125 SVGs in `assets/equipment/`; counts orphans and suspect default widths for fix-priority step 3.   | KEEP           | Discrete evidence artifact feeding the next-fix queue; placed correctly under `audits/`.                                                                                    |
| docs/active_plans/audits/no_crop_object_sizing_coverage.md                 | docs-active-plan | Read-only audit of `content/objects/**` and scene placements; quantifies the 78/78 object YAMLs missing `layout.display_width_cm` (fix-priority step 4 coverage gap).              | KEEP           | Independent evidence cited by the next-fix queue; placement matches REPO_STYLE.md closed subdir set.                                                                        |
| docs/active_plans/audits/no_crop_precheck_semantics.md                     | docs-active-plan | Reconciles diagnostic field-name confusion in `experiments/css_native_layout/precheck.mjs`; pins `artwork_integrity.clipped_by_parent` as the canonical no-crop metric.            | KEEP           | Establishes the vocabulary baseline the other audits rely on; doc-only and read-only.                                                                                       |
| docs/active_plans/audits/no_crop_sizing_chain_root_cause.md                | docs-active-plan | Read-only root-cause audit walking each clipped object through the 7-step sizing chain to find the first-failing layer.                                                            | KEEP           | Core Round 3 audit referenced by the queue and decision doc; cites evidence under `test-results/` without modifying it.                                                     |
| docs/active_plans/audits/no_crop_svg_viewbox_audit.md                      | docs-active-plan | Read-only audit of every root `<svg>` `viewBox` across the 125 equipment SVGs; classifies recommendations into the 8-tier fix framework.                                           | KEEP           | Feeds fix-priority step 2; exonerates the SVG layer per the queue summary.                                                                                                  |
| docs/active_plans/decisions/no_crop_round3_sizing_source_reconciliation.md | docs-active-plan | Decision record capturing the user directive that permanent CSS footprint classes are the wrong direction; durable fixes flow through the existing scaling model and SVG pipeline. | KEEP           | Authority record cited by the queue's tier definitions; correctly filed under `decisions/`.                                                                                 |

## Top REVERT candidates

None. Every uncommitted file is a doc-only audit, decision, or synthesis
artifact that produced the evidence base for the no-crop Round 3 fix queue.
No production surfaces were edited.

## Notes for next checkpoint pass

- The prompt anticipated a large mixed working tree (source, YAML, generated
  artifacts). Actual scope is narrower: only the seven doc artifacts above.
- If the manager expected uncommitted source or experiment edits, those
  changes are not present in this working tree and were likely committed
  upstream of HEAD `8795d25` referenced inside the audit docs themselves.
