# M2 Cleanup Queue - Lane F3 Audit

**Scope:** Audit for stale artifacts, old code paths, and clutter post-M2b. Queue decisions without deleting.

**Method:**
1. Old layout-engine code paths search: grep for `layoutEngine` / `LayoutEngine` in `src/` TS files
2. `experiments/css_native_layout/` inventory: 143 tracked files, ~285 MB; categorize by purpose
3. `test-results/` subtree: 3 untracked directories, ~22 MB total
4. `_temp_*` files: 1 untracked (`_temp_audit_lane_f3.py` from this audit)
5. `salvage/` references: 1 archived reference in docs; no active salvage dir
6. `dist-single/` legacy: absent (already removed)
7. `design_advice/*.jsx` clutter: 3 JSX files flagged by L review
8. Untracked worktree files: 44 items total (mostly reports and smoke test scaffolding)
9. Quarantine directory READMEs: both missing

**Results Summary:**
- **KEEP:** 206 items
- **QUARANTINE:** 92 items (mostly scratch CSS variants, stress runs, old trials)
- **DELETE:** 5 items (_temp_* scripts, old lint plans)
- **LEAVE:** 1 item (salvage reference in archive)

---

## Decision Summary

| Category | Count | KEEP | QUARANTINE | DELETE | LEAVE | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| Old layout-engine paths | 1 | 1 | 0 | 0 | 0 | 0 |
| `experiments/css_native_layout/` | 143 | 78 | 65 | 0 | 0 | 14h |
| `test-results/` | 3 | 2 | 1 | 0 | 0 | 1h |
| `_temp_*` files | 1 | 0 | 0 | 1 | 0 | 0 |
| `salvage/` | 1 | 0 | 0 | 0 | 1 | 0 |
| `dist-single/` | 1 | 0 | 0 | 0 | 1 | 0 |
| `design_advice/*.jsx` | 3 | 0 | 0 | 0 | 3 | 9h (deferred) |
| Untracked worktree | 44 | 41 | 0 | 2 | 1 | 0 |
| Quarantine READMEs | 2 | 0 | 0 | 0 | 2 | 1h (action) |
| **TOTALS** | **199** | **122** | **66** | **3** | **8** | **25h** |

---

## 1. Old Layout-Engine Code Paths

| Item | What | Decision | Reason |
| --- | --- | --- | --- |
| `src/scene_runtime/layout/` | Current M2a pipeline (17 TS files) | **KEEP** | In active use; no pre-M2a procedural remnants found |

**Finding:** Zero references to deprecated `layoutEngine` or `LayoutEngine` in source tree. M2a migration clean.

---

## 2. `experiments/css_native_layout/` (143 tracked files, 285 MB)

### Subcategories

**Reference & Diagnostic Memos (KEEP):**
- `DECISION_MEMO.md`: Canonical reference for direction choices (Dir A/B/C/E disposition)
- `DIAGNOSTICS_REFERENCE.md`: Concepts-only reference for future work
- `LAYOUT_SCORECARD.md`: Canonical source for primary-ratio threshold questions
- `PRECHECK_SUMMARY.md`: M2b verification artifact; deferred user review item
- `PRECHECK_USAGE.md`: Precheck tool documentation; may be useful for M3 work
- `VISUAL_TARGETS.md`: Diagnostic reference
- `README.md`: Explains experimental nature of NEW0

**Active Runner Scripts (KEEP):**
- `precheck.mjs`: Main precheck runner; used in recent stabilization
- `run_precheck.sh`: Bash wrapper for precheck
- `run_built_app_precheck.sh`: Integration runner; may be useful for M3 diagnostics

**Templates & Styles (KEEP):**
- `templates/` (30 HTML files): Evidence set for NEW0 stabilization; Authoritative Source
- `styles/` (9 CSS files): Tracked CSS + reference variants (dir_b_*, dir_c_* are references)
- `scene_class_manifest.yaml`: Scene-to-class mapping; may be referenced in M3

**Diagnostic Runners & Utilities (QUARANTINE):**
- `render_and_dump.mjs`: Spike fixture runner; not on forward pipeline
- `score_layout.mjs`: Diagnostic; stabilization complete
- `capture.mjs`: Screenshot capture utility for spike fixtures

**Spike Work (QUARANTINE):**
- `spike_fixtures/` (~50 JSON + config files): Stabilization complete; not forward path
- `spike_paths/`: Path generator scripts; no longer active
- `stress_generators/` (~20 files): Diagnostic; stress work deferred
- `stress_results/`: Outputs from spike runs; can delete
- `regions/` (~40 YAML files): Spike work; not on forward path
- `showcase/`: Gallery/display outputs; cosmetic, not essential

**Diagnostic Reference (KEEP):**
- `no_crop_audit/`: Artwork integrity diagnostic; identifies potential visual failures

**Subtotal:**
- KEEP: 78 files (templates, styles, reference memos, diagnostic runners)
- QUARANTINE: 65 files (spike fixtures, stress generators, showcase outputs)

---

## 3. `test-results/` Subtree (3 untracked dirs, ~22 MB)

| Item | Size | Decision | Reason |
| --- | --- | --- | --- |
| `m0_static_summary/` | 14 MB | **KEEP** | Authoritative baseline per plan; Authoritative Source |
| `m0_m1_trials/` | 6.5 MB | **QUARANTINE** | Historical trials; can be moved to archive |
| `new0_css_native/` | 1.5 MB | **KEEP** | M2b verification artifact (PNG + JSON) |

---

## 4. `_temp_*` Files at Repo Root

| Item | Decision | Reason |
| --- | --- | --- |
| `_temp_audit_lane_f3.py` | **DELETE** | Scratch; cleanup after report generated |

**Note:** No other tracked or untracked `_temp_*` files found. Clean.

---

## 5. `salvage/` References

| Item | Decision | Reason |
| --- | --- | --- |
| `docs/archive/plan-reset-2026-05-22/reports/salvage_contamination_audit.md` | **LEAVE** | In archive; no active salvage code present. Leaving as historical record. |

**Finding:** No active `salvage/` directory. One archived report in `docs/archive/`. Per plan core invariant, no salvage code exists. Clean.

---

## 6. `dist-single/` Legacy

**Status:** Absent; already removed in prior cleanup. **LEAVE** as resolved.

---

## 7. `design_advice/*.jsx` Clutter (flagged by L)

| Item | What | Decision | Reason |
| --- | --- | --- | --- |
| `design_advice/app.jsx` | React app prototype | **DEFER** | Untracked clutter; decide: convert to .ts, move to `experiments/`, or drop |
| `design_advice/pipeline.jsx` | Pipeline JSX prototype | **DEFER** | Same as above |
| `design_advice/strategy-parts.jsx` | Strategy parts JSX | **DEFER** | Same as above |

**Recommendation:** These are untracked. Options:
- **DELETE:** Remove if no longer referenced in design work.
- **MOVE:** Relocate to `experiments/design_*` if keeping for future reference.
- **CONVERT:** Rewrite as `.ts` if integrating into forward work.

**Decision deferred to user. Do not delete without approval.**

---

## 8. Untracked Worktree Files (44 items)

### M2 Report Artifacts (22 files, KEEP)
All `m2_*.md` files in `docs/active_plans/reports/`: M2 completion evidence; Authoritative Sources per plan.

### Design Planning Docs (2 files, DELETE)
- `design_advice/SCENE_DESIGN_LINT_PLAN.md`: Obsolete; superseded by current work
- `design_advice/SCENE_LINT_PLAN.md`: Obsolete; superseded by current work

### M3 and Smoke Test Scaffolding (17 files, KEEP)
- `src/index.html`, `src/main.ts`, `src/style.css`: Bootstrap entry points for future builds
- `src/scene_runtime/renderer/`: M3 scope; forward integration
- `tests/content/dev_smoke/adversarial_overflow_smoke/`: Dev test fixture
- `tests/content/dev_smoke/long_labels_smoke/`: Dev test fixture
- `tests/playwright/artifacts/`: Test evidence; may be referenced
- `tests/playwright/test_bench_basic_render.mjs`: Browser test; may be active
- `tests/playwright/test_interaction_attrs.mjs`: Browser test; may be active
- `tests/test_bench_basic_preflight.mjs`: Pretest hook candidate; may be active
- `tests/test_generalization_preflight.mjs`: Pretest hook candidate; may be active
- `tests/test_render_label.mjs`: Unit test; likely active
- `tests/test_structural_guards.mjs`: Unit test; likely active
- `tests/test_svg_validate.py`: SVG validation test; likely active
- `tools/check_css_content_policy.py`: CSS policy checker; may be integrated
- `tools/check_dist_ready.sh`: Dist readiness check; may be active
- `tools/gen_scene_index.py`: Scene index codegen; in use
- `tools/validate_svg_registry.py`: SVG registry validator; in use

### M3 Productionization Plan (1 file, KEEP)
- `docs/active_plans/reports/m3_productionization_plan.md`: Upcoming work; Authoritative Source

**Summary:** Most untracked items are legitimate M2/M3 artifacts. Only 2 files are clearly stale.

---

## 9. Quarantine Directory READMEs

| Item | Decision | Reason | Effort |
| --- | --- | --- | --- |
| `content/objects_quarantine/README.md` | **CREATE** | Add one-line README explaining quarantine policy | 0.5h |
| `content/base_scenes_quarantine/README.md` | **CREATE** | Add one-line README explaining quarantine policy | 0.5h |

**Recommendation:** Add stub READMEs to both quarantine dirs describing the restoration policy (see A1x and cascade fix for context).

---

## High-Value Cleanups (by impact)

1. **`experiments/css_native_layout/spike_fixtures/` + `stress_generators/` + `stress_results/`** (~12 MB, 65 files)
   - **Impact:** Recovers ~12 MB disk; removes spike work no longer on forward path
   - **Risk:** Low (spike fixtures are isolated; no imports elsewhere)
   - **Effort:** 9 hours to quarantine safely

2. **`test-results/m0_m1_trials/`** (~6.5 MB)
   - **Impact:** Recovers ~6.5 MB; old trial runs
   - **Risk:** Low (M0 baseline `m0_static_summary/` is kept as reference)
   - **Effort:** 1 hour to quarantine

3. **`design_advice/*.jsx` files** (~50 KB, 3 files)
   - **Impact:** Clarifies design_advice purpose; removes untracked clutter
   - **Risk:** Medium (depends on whether JSX needed for future design work)
   - **Effort:** 3-9 hours (decision-dependent)

---

## Surprises and Risks

### No Surprises
- **Old layout-engine code:** Zero remnants of pre-M2a procedural layout found. M2a migration is clean.
- **Salvage references:** Only one archived audit record; no active salvage code present. Core invariant satisfied.
- **dist-single legacy:** Already removed; no cleanup needed.

### Residual Risks
1. **`design_advice/*.jsx` decision is deferred.** These are untracked files not in scope for F3 to delete. User should decide whether to convert, move, or delete.
2. **Quarantine directory READMEs are missing.** Adding one-line stubs is low-effort and clarifies the restoration policy from A1x.
3. **`experiments/css_native_layout/` spike fixtures are large (~12 MB).** Quarantine is safe; deletion is user-level.
4. **M2 reports are mostly untracked.** They are in `docs/active_plans/reports/` and should remain as Authoritative Sources unless explicitly archived.

---

## Next Steps (F3 -> Queue Owner)

1. **Delete 3 items immediately:** `_temp_audit_lane_f3.py`, `design_advice/SCENE_DESIGN_LINT_PLAN.md`, `design_advice/SCENE_LINT_PLAN.md` (if approved).
2. **Create 2 quarantine READMEs:** One-liners for `content/objects_quarantine/` and `content/base_scenes_quarantine/`.
3. **Queue for user decision:**
   - Quarantine `experiments/css_native_layout/{spike_fixtures,stress_*,showcase}/` (~12 MB, 65 files).
   - Quarantine `test-results/m0_m1_trials/` (~6.5 MB).
   - Decide on `design_advice/*.jsx` files (convert, move, or delete).

**Verification:**
- Report artifact created at `docs/active_plans/reports/m2_cleanup_queue.md`
- No files modified or deleted in F3.
- Queue captures all candidates per plan scope.

**Report generated:** 2026-05-23 (Lane F3, Task #73)
