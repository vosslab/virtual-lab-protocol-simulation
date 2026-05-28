# web_ui plan workspace

Status: forward plan = `runtime_seam_plan.md` ("Solid.js shell + new
typed runtime seam (new build)"). Direction is new code from current
repo state. No recovery, revert, cherry-pick, or restore of deleted
runtime. Historical audits under `audits/` are reference material for
context only; the forward plan does not consume them.

## Plan files

- Approved web-ui shell plan: `/Users/vosslab/.claude/plans/sunny-enchanting-allen.md`
  (saved to plans dir, not the repo).
- Approved framework decision: [ADR_001_frontend_framework.md](ADR_001_frontend_framework.md).
- Runtime-seam follow-on plan: [runtime_seam_plan.md](runtime_seam_plan.md).
- Seam discovery + Case classification: [protocol_execution_seam.md](protocol_execution_seam.md).
- Walker backdoor catalog: [walker_backdoor_audit.md](walker_backdoor_audit.md).
- Baseline check log: [baseline_check_log.md](baseline_check_log.md).
- Pilot pair shortlist: [protocol_corpus_inventory.md](protocol_corpus_inventory.md).

## Overnight audit set

In `audits`:

- [git_archaeology_runtime.md](audits/git_archaeology_runtime.md) -- recovered
  runtime source from git; commit 635f827 deleted 41 files / 9336 lines on
  2026-05-22. `/tmp/recovered_runtime/entry.ts` is the 952-line latest state.
- [sibling_repo_hunt.md](audits/sibling_repo_hunt.md) -- zero matches across
  six sibling TS repos.
- [pipeline_runtime_contract.md](audits/pipeline_runtime_contract.md) --
  extracted window.gameState contract; ProtocolShellEvent sketch.
- [generated_artifacts_audit.md](audits/generated_artifacts_audit.md) --
  prebuild green; two parallel codegen pipelines (tools/gen_* vs
  pipeline/build_*) coexist.
- [ts_dependency_graph.md](audits/ts_dependency_graph.md) -- 25 files, zero
  dead exports, six-layer clean DAG.
- [object_asset_inventory.md](audits/object_asset_inventory.md) -- 74
  objects, 125 SVGs, 4 broken refs (electrophoresis_tank), 67 orphan SVGs.
- [base_scene_inventory.md](audits/base_scene_inventory.md) -- 9 concrete
  scenes ready for shell pilots; 9 deprecated row_slot scenes.
- [protocol_object_xref.md](audits/protocol_object_xref.md) -- spot-check
  only; 8 of 34 protocols sampled, zero broken refs; full enumeration
  pending.
- [test_coverage_map.md](audits/test_coverage_map.md) -- 37 tests; shell
  surfaces (HUD, modal, tray, professor, launcher, adapter) have zero
  coverage.
- [vocabulary_closure_audit.md](audits/vocabulary_closure_audit.md) -- 12
  BLOCKING, 20 CONCERN, 13 INFO closure violations across the four
  authoring specs.
- [lint_style_sweep.md](audits/lint_style_sweep.md) -- pyflakes, ASCII,
  markdown links, prettier, tsc all clean after FILE_STRUCTURE fix; ESLint
  has 16 config-drift errors on .mjs files outside `parserOptions.project`
  (pre-existing, unrelated to this work).

## Forward direction

Direction is locked: new Solid.js shell + new typed protocol runtime,
built from current repo state. No archaeology. See
`runtime_seam_plan.md` for the milestone breakdown (M1 typed seam
interface, M2 new runtime, M3 vertical slice on `mtt_reagent_prep`,
M4 Playwright proof via typed seam, M5 parallel cleanup).

First dispatch (when work resumes):
- WP-1-1 typed seam types under `src/shell/adapter/types.ts`.
- WP-1-2 user-approved `npm install --save-dev solid-js` + esbuild
  probe.
- WP-1-3 `seam_interface.md` documenting the event lifecycle.

Parallel cleanup (M5, no recovery work involved):
- WP-5-1 codegen consolidation -- `tools/gen_*.py` canonical; archive
  `pipeline/build_new_*.py`, `pipeline/build_protocol_html.py`,
  `pipeline/build_runtime_bundle.sh`, `pipeline/generate_svg_globals.py`.
- WP-5-2 vocabulary closure -- address 12 BLOCKING items in
  `audits/vocabulary_closure_audit.md`.
- WP-5-3 broken SVG refs -- 4 electrophoresis_tank variants.
- WP-5-4 protocol-object xref full enumeration (8/34 spot-checked).

## Today's CHANGELOG entry

Drafted in `docs/CHANGELOG.md` under `## 2026-05-27`. Categories: 4
Additions, 1 Fixes, 4 Decisions, 5 Developer Tests. Not committed; awaits
human review.

## Repo state

`npm run check` baseline on main is green (typecheck, lint, format:check,
css:policy, test:node, 25/25 node tests). Markdown link gate is green
after FILE_STRUCTURE.md fix. ESLint .mjs config drift is pre-existing.

No production code changed. No git commits. All edits limited to docs/.
