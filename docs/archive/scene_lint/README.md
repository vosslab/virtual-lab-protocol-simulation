# Scene-lint tracker

This directory tracks implementation progress, blockers, and design deferrals for the scene-lint and scene-design work package.

## Purpose

The scene-lint system validates rendered scene layouts against design intent, focusing on asset integrity, clickable object placement, and visual correctness. Related scene-design tools detect scene structure and enable rule-based audit workflows.

## Design source documents

- `SCENE_LINT_PLAN.md` - scene-lint architecture and rule set
- `SCENE_DESIGN_LINT_PLAN.md` - scene-design tool specification
- Approved implementation plan (maintained in `/Users/vosslab/.claude/plans/replicated-hatching-avalanche.md` outside the repo)

## Tracker files

- [blocked_by.md](blocked_by.md) - external blockers and unresolved dependencies
- [group_a_deferrals.md](group_a_deferrals.md) - design decisions deferred for future review

## Milestone status

### M1: Foundation (CLOSED 2026-05-23)

All M1 work packages complete:

- WP-SIM-1: scene calculator bbox + aspect primitives
- WP-SIM-2: zone-fit + label-box primitives + corpus dump
- WP-LOAD-1: shared YAML loader helpers (validation/shared_toolkit/scene_loaders.py)
- WP-LINT-1: scene_lint skeleton + CLI + finding shape
- WP-LINT-2: Group A rules + writers + coverage matrix
- WP-DESIGN-1: scene_design skeleton + class detection + card writers
- WP-DESIGN-2: per-class weight tables + score aggregation

Plus integration: scene-lint and scene-design wired as stages in `validation/validate.py`. Three standalone run_*.py scripts deleted in favor of unified entry.

Both pre-M1 blockers closed (see [blocked_by.md](blocked_by.md)): pytest_sessionstart bootstrap and validation/yaml/ pyyaml shadow.

Exit gates met:

- SIM golden-fixture tests green (155 passing across scene_calc + scene_lint + scene_design + scene_loaders)
- SIM corpus smoke produces dump for every base scene without raising
- scene-lint CLI exits 1 on any Group A (BLOCKED) finding
- scene-design emits stub cards marked `confidence: stub`, `score: null`

### M2: Predictors and metrics (IMPLEMENTER WORK CLOSED 2026-05-24)

All M2 implementer WPs landed:

- WP-B-RULES-1: B1 aspect_distorted_predicted + B2 item_taller_than_zone
- WP-B-RULES-2: B3 row_footprint_overflow + B4 placement_bbox_outside_scene + B5 placement_bbox_outside_zone + B6 item_item_overlap
- WP-B-RULES-3: B7 label_offscreen + B8 label_object_overlap + B9 invisible_placement + B10 zone_overlap
- WP-B-RULES-4: confusion-table runner (`validation/scene_lint/confusion.py`, CLI `--validate-against` + `--emit-confusion`)
- WP-METRICS-1: hierarchy + balance + proximity metrics
- WP-METRICS-2: label + density + composition metrics
- M2-EXIT-1: scene-design CLI threads `dump_scene_geometry` output through to all dump-consuming metrics; metric population rate 12% -> ~90% for primary scenes

Exit gates:

- 10/10 Group B rules implemented as advisory (`ESCAPE_REQUIRED`); none promoted to strict (that is M4 / WP-STRICT-1)
- 8/8 design metrics implemented with per-class weight tables
- Baseline refreshed at `test-results/scene_lint/base_scenes_baseline_2026-05-24.md` (gitignored runtime artifact): 9 primary scenes total 165 ESCAPE_REQUIRED findings, 9 row-slot scenes each emit 1 BLOCKED `dump_error` (pre-existing, decision-gated), CLI exits 0 across the board
- Per-rule confusion reports emitted under `test-results/scene_lint/` (gitignored runtime artifact) for the post-B7-B10 corpus
- Cross-check vs post-render scorecard: DEFERRED (no post-render scorecard data available; documented in `test-results/scene_design/metrics_baseline_2026-05-24.md`, gitignored runtime artifact)

M2 closure with the calibration check is gated on post-render scorecard data; the implementer scope itself is complete.

### M3: Suppression manifest (CLOSED 2026-05-24)

Per user direction 2026-05-24: all CI / GitHub / PR-comment workstreams (WP-CI-LINT-1, WP-CI-DESIGN-1, CI build gates, CI artifact persistence, PR-diff comment posting, label auto-application) are REMOVED FROM THE PLAN. The plan is agent-dispatched code only.

- WP-SUPPRESS-1: suppression manifest schema + enforcement -- LANDED 2026-05-24. `validation/scene_lint/suppressions.py`, example `validation/scene_lint/suppressions.yaml`, `--suppressions` CLI flag, advisory `malformed_suppression` + `expired_suppression` findings, Group A rule names rejected, 90-day max expiry, scene-wide (`placement_name: null`) and placement-specific matching.

### M4: Strict mode + archive + suggested-fix (PARTIAL 2026-05-24)

CI-data prerequisites removed per user direction. Entry criteria: at least one B-rule with sufficient labeled-corpus evidence to meet the static promotion bar (precision >= 0.90, recall >= 0.80, >= 20 ground-truth positives in `test-results/scene_lint/labeled_corpus.yaml`).

Scaffolding landed today:

- WP-STRICT-1: `validation/scene_lint/promotion.py` + `validation/scene_lint/promotions.yaml` + `--strict` CLI flag + `--promotions <path>` / `--no-promotions` flags. Closed schema (rule, promoted_at, precision, recall, positive_count). `malformed_promotion` + `promotion_below_bar` advisory findings. Re-validates promoted rules against current labeled corpus at load time; below-bar entries fall back to advisory. Group A rule names rejected from promotion. Ships with empty `promotions: []` -- authors populate as evidence accrues.
- WP-ARCHIVE-1: `validation/scene_design/archive.py` (write `append_history_row` + read `load_history` + lookup `score_for_run` + range filter `score_quarter_range`). Wired into scene_design CLI: every run appends one row per scored scene to `test-results/scene_design/history/scorecard_history.jsonl` (gitignored). `validation/scene_design/quarterly.py` emits Markdown rollup to `docs/active_plans/active/scene_lint/scorecard_quarterly_YYYY-Qn.md` on demand (manual-trigger only; no scheduling).
- WP-ARCHIVE-2: `validation/scene_design/suggest.py` with `suggest_moves(scene_path, n_suggestions=1)` entry. Three permutation classes (zone reassign, display_width_cm +/-10/20/30, data-primary flip). Score-monotonicity guard (delta > 0 required). Render-risk guard (writes mutated scene to temp YAML, runs scene-lint, filters moves that introduce new ESCAPE_REQUIRED findings vs baseline). Engine never edits YAML; output schema marks suggestions advisory.

Followup fix landed: scene_design CLI was hardcoding `score=None` in every SceneCard and every history row, which both gutted the per-card score field and made the quarterly drift report meaningless. Now calls `aggregate_score(metrics, scene_class)` per scene and threads the real score through SceneCard + archive row. The `except Exception` wrapper around `append_history_row` was removed (PYTHON_STYLE.md violation); the call now raises normally on IOError / OSError.

M4 exit criteria status:

1. At least one B-rule promoted to strict mode -- NOT MET (user-gated). The auto-seeded `labeled_corpus.yaml` does not currently carry 20 reviewer-confirmed positive labels for any single rule. Promotion mechanism exists and refuses to honor entries that fail their own bar; user populates the labeled corpus as a separate workflow.
2. `scorecard_history.jsonl` writer + reader live -- MET.
3. Quarterly report generator emits Markdown on demand -- MET (manual-trigger script).
4. Suggested-fix engine emits at least one suggestion per below-class-floor scene in M0 corpus -- NOT MET. Engine ships and all guards function correctly, but every below-floor scene returns 0 suggestions because `dump_scene_geometry_from_scene_dict` writes mutated scenes to `/tmp` for re-dump, and `dump_scene_geometry` cannot resolve `content/objects/*.yaml` asset references from a `/tmp` path. Engine fix requires either (a) refactoring `dump_scene_geometry` to accept an in-memory scene dict plus an explicit `repo_root` parameter, or (b) writing temp scenes under `content/base_scenes/`. Both are out of scope for the current pass. The `--strict`-flag scaffolding, render-risk guard, score-monotonicity guard, advisory output schema, and unit tests all work; the engine is wired and gated, just dump-blocked at runtime. Surfaced for user decision.

## Decision-gated items (awaiting user)

These five items surfaced during M1-M4 work and are intentionally left untouched until the user decides scope:

1. **WP-SIM-2 row-slot acceptance** -- 9/9 `*_row_slot.yaml` base scenes raise `KeyError: 'scene_bounds'` in `dump_scene_geometry`. Three options: (a) add row-slot format support to dump, (b) amend acceptance to exclude row-slot, (c) move row-slot scenes out of `content/base_scenes/`.
2. **Scene-design row-slot blindspot** -- `validation/scene_design/class_detect.py` only reads `scene['placements']`, ignoring `rows[].slots[]`. All 9 row-slot scenes misclassify as `composition`.
3. **Step-4 dead code (data-primary)** -- no object in the corpus has `data-primary: true`, so the class-detect Step-4 (data-primary primary detection) never fires.
4. **kind forwarding in `dump._synthesize_placement_inputs`** -- T6 added `SCIENTIFIC_KINDS` to `labels.py`, but the dump synth dict drops `kind`, so the live dump path always falls back to `LABEL_GAP_DECORATION` (4.0). Unit tests pass because they inject `kind` directly. Documented in `test-results/audits/dump_integration_audit_2026-05-24.md` (gitignored runtime artifact).
5. **`dump_scene_geometry` repo-root parameter** -- the in-memory mutation path in `validation/scene_design/suggest.py::dump_scene_geometry_from_scene_dict` writes mutated scenes to `/tmp`, but `dump_scene_geometry` resolves `content/objects/*.yaml` asset references by walking the scene path parent chain upward looking for `AGENTS.md`. From `/tmp` that walk reaches `/` without finding the repo, the object registry comes back empty, every placement gets `scale_source='skipped_error'`, and `_score_mutation` correctly treats the result as non-scorable. Net effect: WP-ARCHIVE-2's suggested-fix engine ships and all its guards work, but it produces zero surfaced suggestions across the M0 corpus. Fix paths: (a) refactor `dump_scene_geometry` to accept `(scene_dict, repo_root)`, or (b) write temp scenes under `content/base_scenes/`. Both are out of scope for the current pass.

## Quarterly reporting

Status and progress reports route to the design team lead. Use [blocked_by.md](blocked_by.md) and [group_a_deferrals.md](group_a_deferrals.md) as input for quarterly reviews.
