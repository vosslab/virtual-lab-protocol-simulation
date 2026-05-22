# Git Incident 4e2c709 - Scope Audit (S2)

Date: 2026-05-21
Status: NEEDS_CONTEXT
Commit: 4e2c709 ("NEW3 Batch 5 Workstream F: Visual polish pilot on 3 gold scenes")
Stat: 224 files, 20,424 insertions, 163 deletions

## F's claimed scope (2 files)

- experiments/css_native_layout/styles/bench.css (2 CSS tweaks: label max-width 100->110, color text-light->text, --gap-object: 10px for dense_clutter)
- experiments/css_native_layout/stress_results/batch5_visual_polish_pilot.md (273-line pilot report)

Both confirmed present. Claimed ~15-20 net lines.

## Actual commit scope

### F-CLAIMED (2 files)

- experiments/css_native_layout/styles/bench.css - 12 net lines, CSS tweaks confirmed
- experiments/css_native_layout/stress_results/batch5_visual_polish_pilot.md - 273 lines, matches commit message

### EARLIER-WORKSTREAM (~150 files)

docs/active*plans/ plan docs (NEW0/NEW1/NEW1.5/NEW2/NEW3 series): ~36 files including new0_stabilization_continuation.md, new1_css_native_layout_integration_plan.md, new1_well_plate_96_zoom_spike_result.md (764 lines), all new2*\* showcase/blocker plans, all new3_batch1/batch3 docs, lane_d/lane_r from concurrent Batch 5.

docs/active_plans/ asset subdirectories:

- new0_new1_layout_rebuild_assets/ - 9 items (PNG, HTML, MD, PDF)
- new1_5_new2_css_native_layout_evidence_assets/ - 3 items + PDF
- new2*css_native_best_case_showcase_assets/ - ~40 lane*\* PNGs/HTMLs (lanes A-Q)
- new2_no_crop_audit_assets/ - ~60 per-scene crop audit PNGs
- new3_layout_stress_reliability_assets/ - visual_audit_BEFORE.md + visual_audit_AFTER.md

experiments/css_native_layout/ infrastructure: DECISION_MEMO.md (expanded), DIAGNOSTICS_REFERENCE.md, LAYOUT_SCORECARD.md, PRECHECK_SUMMARY.md (expanded), PRECHECK_USAGE.md, README.md, VISUAL_TARGETS.md, run_built_app_precheck.sh, run_precheck.sh, scene_class_manifest.yaml, spike_fixtures/ (6), spike_paths/ path_a/b/c assessments (10), stress_generators/generate_stress_scenes.py (556), stress_results/batch4_corpus_manifest.md, 3 modified template HTML files.

docs/ accumulated:

- docs/CHANGELOG.md - 686 new lines (weeks of accumulated entries)
- docs/FILE_STRUCTURE.md - 4 lines

tests/playwright/ spike scripts (NEW1): 6 files - spike_built_app_rerender.mjs (435), spike_built_app_rerender_screenshots.mjs (402), spike_built_app_state_change.mjs (481), spike_css_native_well_plate_zoom.mjs (385), spike_css_native_well_plate_zoom_results.md (75), spike_validator_preset_hierarchy.mjs (242).

tests/content/ dev smoke (NEW1 spike): 3 files under tests/content/dev_smoke/well_plate_96_zoom_check/.

### UNRELATED (5 files)

- REPO_TYPE - 1-line repo type marker, bootstrap artifact
- package.json.template - 29 lines, template propagation
- eslint.config.js - 40 lines, repo-root ESLint config from TypeScript setup
- tools/html_to_pdf.mjs - 93 lines, PDF utility from starter template
- tests/test_smoke.mjs - 9 lines, canonical template stub

### RISKY (7 files)

Production code or contract-surface, should not have been touched by CSS polish workstream:

| File                                                | Category         | Lines     | Risk   |
| --------------------------------------------------- | ---------------- | --------- | ------ |
| src/scene_runtime/layout/css_native_adapter.ts      | Production src   | 242 new   | HIGH   |
| src/scene_runtime/layout/feature_flags.ts           | Production src   | 48 new    | HIGH   |
| src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts | Production src   | 55 new    | HIGH   |
| src/style.css                                       | Production CSS   | 8 new     | MEDIUM |
| content/base_scenes/well_plate_96_zoom.yaml         | Content YAML     | 47 new    | MEDIUM |
| devel/setup_typescript.sh                           | Dev setup script | 28 new    | LOW    |
| tests/TESTS_README.md                               | Test docs        | 4 changed | LOW    |

5 tests/test\_\*.py files are VALUABLE (hygiene enforcement) but were bundled without visible approving plan step: test_canonical_scorecard_rule.py (67), test_eslint_config_present.py (74), test_package_json_schema.py (99), test_readme_first_paragraph.py (268), test_tsconfig_canonical.py (567).

### VALUABLE (~65 files)

- experiments/css_native_layout/stress_generators/generate_stress_scenes.py - foundational batch generator with --seed
- experiments/css_native_layout/stress_results/batch4_corpus_manifest.md - frozen batch 4 baseline
- All spike path assessment files (path_a, path_b, path_c)
- All spike_fixtures/ files
- LAYOUT_SCORECARD.md, PRECHECK_USAGE.md, DIAGNOSTICS_REFERENCE.md, VISUAL_TARGETS.md
- Both run_precheck.sh scripts
- 5 hygiene test Python files (listed above)
- All tests/playwright/spike\_\*.mjs files
- tests/content/dev_smoke/well_plate_96_zoom_check/ (3 files)
- docs/CHANGELOG.md (686 lines accumulated audit trail)
- All docs/active*plans/new0*\_ through new3\_\_ markdown files

## Causation hypothesis

Most likely cause: F agent ran `git add -A` or `git add .` at repo root.

Supporting evidence:

1. 224 files span every active workstream prefix (new0, new1, new1*5, new2, new3, lane*\*, batch4, batch5) - pattern of repo-root sweep picking up all uncommitted changes.
2. Parent commit (4d03b4b "I have no idea") was modest 30-file commit touching only CSS/templates. Many of the 224 files had been sitting in working tree since much earlier batch work, never staged.
3. Multiple batches (1-4) produced artifacts not appearing in any intermediate commit between f437287 and 4e2c709. Absence of per-batch commits confirms accumulation without commits.
4. CHANGELOG gap: 686 new lines = weeks of accumulated entries from Batches 1-5 never committed.
5. Three src/ TypeScript files almost certainly written by prior spike workstream (NEW1 or NEW2), left uncommitted, swept up by F's staging.
6. Concurrent Batch 5 workstreams A-E produced files (lane*d, lane_r, spike_built_app*_, spike*validator*_) appearing verbatim in this commit, confirming they all ran before F committed.

Secondary factor: Parent commit message "I have no idea" (4d03b4b) appears anomalous, may represent prior partial-sweep attempt.

## Risk assessment

### css_native_adapter.ts (242 lines)

Most significant RISKY file. Implements CSS-native layout adapter mapping YAML scene objects to DOM placement. Active production logic in src/scene_runtime/layout/. Not authorized by F's stated scope. If approved NEW1 spike output (path C hybrid per new1_spike_path_comparison.md), VALUABLE. If speculative, unauthorized production code, must be reverted or isolated.

### feature_flags.ts (48 lines)

Feature flag module likely gating the adapter. Fate follows adapter decision.

### well_plate_96_zoom.ts (55 lines)

Scene-specific TS for zoom spike. Matches NEW1 spike workstream scope. Likely legitimate NEW1 artifact but committed without NEW1 completion signal.

### src/style.css (8 lines)

Low risk regardless.

### content/base_scenes/well_plate_96_zoom.yaml (47 lines)

Scene YAML is contract-surface artifact (PRIMARY_CONTRACT items 1 and 3). Adding new base scene YAML without explicit approved plan step is protocol violation. Needs review against NEW1 spike plan.

### Production behavior

Commit does NOT appear to break existing production behavior. 3 modified template HTML files under experiments/css_native_layout/templates/, not production content. Primary production behavior risk is css_native_adapter.ts - if imported/registered in any runtime entry point, changes layout engine behavior. Must be verified before S3 reset decision.

## Preservation priority for S3

### Must preserve (re-stage immediately if reset chosen)

- experiments/css_native_layout/stress_generators/generate_stress_scenes.py
- experiments/css_native_layout/stress_results/batch4_corpus_manifest.md + batch5_visual_polish_pilot.md
- experiments/css_native_layout/styles/bench.css (the 2 F-scoped CSS tweaks)
- All experiments/css_native_layout/ infrastructure docs
- All docs/active*plans/new0*\_, new1\__, new1*5*_, new2\_\_, new3\_\* markdown files
- docs/active_plans/lane_d_state_change_blocker.md + lane_r_rerender_probe_summary.md
- All tests/playwright/spike\_\*.mjs files
- All 5 hygiene test Python files
- tests/content/dev_smoke/well_plate_96_zoom_check/ (3 files)
- docs/CHANGELOG.md

### Verify before deciding

- src/scene_runtime/layout/css_native_adapter.ts - approved NEW1 spike output or unauthorized?
- src/scene_runtime/layout/feature_flags.ts - same as adapter
- src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts - verify against new1_well_plate_96_zoom_spike_result.md
- content/base_scenes/well_plate_96_zoom.yaml - verify against NEW1 spike YAML authoring step

## Handoff

Status: NEEDS_CONTEXT
F-claimed: 2
Earlier-workstream: ~150
Unrelated: 5
RISKY: 7 (3 src/ TS critical; 4 lower severity)
VALUABLE: ~65
Causation: F agent used `git add -A` at repo root, sweeping uncommitted working tree from every prior batch (1-4) and all concurrent Batch 5 workstreams (A-E); changes accumulated since at least f437287 with no per-batch commits.
Blocker for S3: Decision on 3 src/scene_runtime/\* files - approved NEW1 spike outputs or unauthorized production changes determines reset boundary.
