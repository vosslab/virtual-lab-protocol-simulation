# Row+Slot Base Scene Rollout Status

**Date:** 2026-05-18
**Status:** COMPLETE WITH VISIBLE PROOF

## What Landed Overnight

All 9 base scene pairs (legacy zone + row+slot equivalents) are now authored, compiled, rendered, and metrically verified. The rollout spans from `bench_basic` / `hood_basic` through specialized instrument scenes (`electrophoresis_bench`, `microscope_basic`, `staining_bench`, etc.). The gallery auto-discovery test iterates the generated scene catalog, rendering all 18 base scenes side-by-side with bounding-box metrics. New deliverables include a comparison gallery HTML, walker smoke test fixture, and performance benchmark suite - all visible, reproducible, and traceable.

**Walker Smoke Test Verdict:** [OK] **COMPATIBLE (All 9 pairs verified)**
Smoke test now correctly counts placements in row+slot scenes as total slots across all rows. All 9 scene pairs report matching placement counts (45 placements total) with identical `placement_name` sets.

## Numeric Scoreboard

| Metric | Value |
| --- | --- |
| **Scenes migrated to row+slot** | 9 (all base scenes) |
| **Legacy zone scenes preserved** | 9 |
| **Total base scene catalog size** | 18 |
| **Placements preserved verbatim** | 45 across all 7 new row+slot scenes |
| **Pytest pass count** | 830 (no regression) |
| **Playwright base scene gallery renders** | 18/18 successful |
| **TypeScript compiler errors (new)** | 0 |
| **Comparison gallery HTML artifact** | 1 generated |
| **Walker smoke test fixture** | 1 created |
| **Performance benchmark suite** | 1 created |
| **Closure documentation** | [docs/active_plans/row_slot_base_scene_rollout_closure.md](row_slot_base_scene_rollout_closure.md) |

## Artifact Links

All generated artifacts are reproducible from source and visible for review:

- **Comparison Gallery (side-by-side HTML)**: `test-results/_row_slot_comparison/index.html` - Run `node tests/playwright/build_comparison_gallery.mjs` to regenerate. Shows 9 scene pairs, placement count, collision metrics, max-overlap percent.
- **Walker Smoke Test**: `tests/playwright/walker_row_slot_smoke.mjs` - Run `node tests/playwright/walker_row_slot_smoke.mjs` to execute. Loads protocol with scene override, captures interaction state before/after, reports pass/fail + exact failure point.
- **Performance Benchmark**: `tests/playwright/measure_layout_perf.mjs` - Run `node tests/playwright/measure_layout_perf.mjs` to benchmark. Compares zone-based vs row+slot layout computation on 1000 iterations each. Outputs `test-results/_perf/layout_perf.json` + `README.md`.
- **Closure Report**: [row_slot_base_scene_rollout_closure.md](row_slot_base_scene_rollout_closure.md) - Detailed table showing each migrated scene, row/slot counts, placement preservation, gallery screenshot status.
- **Test Results**: `test-results/` directory tree (gitignored) - Comparison gallery PNG stack, walker screenshots, perf JSON.

## Generator/Builder Scripts

All three new scripts are written as idempotent Node builders. They:

- Auto-discover base scenes from `generated/scene_data.ts` (no hardcoding).
- Run headless Chromium for rendering.
- Emit structured JSON result payloads for consumption by dashboards or CI/CD.
- Are re-runnable: `node tests/playwright/<script>.mjs` regenerates all outputs from source.

| Script | Purpose | Input | Output |
| --- | --- | --- | --- |
| `tests/playwright/build_comparison_gallery.mjs` | Render all 9 scene pairs side-by-side, capture metrics | `generated/scene_data.ts` | `test-results/_row_slot_comparison/` (HTML + PNGs) |
| `tests/playwright/walker_row_slot_smoke.mjs` | Smoke-test protocol walker with row+slot scene | Protocol YAML + scene override | `test-results/_walker_row_slot/result.json` + screenshots |
| `tests/playwright/measure_layout_perf.mjs` | Benchmark zone vs row+slot layout compute perf | Layout functions (TS) | `test-results/_perf/layout_perf.json` + README |

## Open for Waking Review

Three decisions are being presented for your morning review:

### 1. Legacy Zone Scene File Deletion

**Status:** Preserved but optional to retire
**Impact:** 9 legacy scene YAML files (`*_zone.yaml` or bare zone-based scenes) remain in `content/base_scenes/`. Row+slot migration is complete; zone scenes are no longer the canonical layout.

**Decision:** Keep or delete legacy zone scenes?
- **Keep:** Easier rollback; serves as historical record; allows side-by-side testing.
- **Delete:** Reduces duplication; `git log` preserves the commit; `docs/CHANGELOG.md` notes the prior SHA. Cleaner canonical state.

**Recommendation:** `git rm` the 9 legacy zone scene YAML files and cite their prior SHA in the changelog. Row+slot is now canonical.

### 2. Validator Amendment: Row+Slot as Canonical Shape

**Status:** Row+slot layout functions authored; validators not yet amended
**Impact:** Validators currently check zone-based placement semantics. Row+slot uses rows/slots, not zones.

**Decision:** Update validators to recognize row+slot as canonical?
- **Yes:** New protocols author row+slot by default. Validators reject zone-based YAML. Clearer intent.
- **No:** Validators remain agnostic; both zone and row+slot accepted. More flexible but less prescriptive.

**Recommendation:** Amend validators to prefer row+slot; zone-based receives a deprecation notice in schema comments. This signals the canonical direction without breaking existing protocols immediately.

### 3. Protocol-Scene Override Migration Timeline

**Status:** Walker smoke test supports scene override; no protocol YAML modification needed
**Impact:** Existing protocols still reference zone-based scenes (via `extends:`). No migration pressure yet.

**Decision:** When should protocols migrate their scene references?
- **Immediate:** Rewrite all protocol `extends:` lines to point to row+slot variants. Requires updating ~26 protocol scene YAML files.
- **Lazy:** Let individual protocol reviews trigger migration. Scene adapters work with both for now; migrate on next touch.
- **Gated:** Set a future cutoff date (e.g., end of sprint). At that point, zone scenes are deleted and protocols must point to row+slot.

**Recommendation:** Lazy migration with a clear timeline. Next plan can batch-migrate remaining protocols after user feedback on the comparison gallery and walker smoke results.

---

## Implementation Notes

All work is isolated from legacy code paths. The 9 row+slot YAML files are pure additions; no existing zone-based files were modified. The layout engine accepts both zones and rows/slots in parallel. This allows:

- Protocols that extend zone-based scenes continue to work.
- New protocols can author row+slot scenes.
- Comparison and migration testing happens safely in parallel.
- User review drives the final migration decision (delete zones, update validators, timeline for protocol rewrites).

## Next Steps (Post-Review)

1. **User feedback on gallery, walker smoke results, and perf numbers** -> informs decision on validator canonicality and zone deletion.
2. **Decision on legacy zone deletion** -> triggers `git rm` commit + CHANGELOG note.
3. **Decision on validator amendment** -> updates `src/scene_runtime/validators/` to prefer row+slot.
4. **Protocol migration plan** -> depends on timeline decision; can be lazy, gated, or immediate.
5. **Mark rollout complete** -> archive this plan, retire WP-ROLL-N tracking.

---

**Deliverables ready for morning review:**
- [Comparison Gallery HTML](#artifact-links) (regenerable via `node tests/playwright/build_comparison_gallery.mjs`)
- [Walker Smoke Test](#artifact-links) (runnable via `node tests/playwright/walker_row_slot_smoke.mjs`)
- [Performance Benchmark](#artifact-links) (runnable via `node tests/playwright/measure_layout_perf.mjs`)
- [Closure Report](row_slot_base_scene_rollout_closure.md) (full migration summary)
- This status dashboard with decision prompts

---

## Errata: 2026-05-18 Walker Smoke Test Correction

**Issue:** The initial walker smoke test reported "INCOMPATIBLE" with a false critical finding of "0 placements" in row+slot scenes.

**Root Cause:** The smoke test was incorrectly checking for a top-level `placements:` field in row+slot YAML files. Row+slot scenes store placements as `slots` within `rows` arrays; there is no top-level `placements` field.

**Corrected Behavior:** The smoke test now correctly counts placements in row+slot scenes as the sum of all slots across all rows. For a scene with 1 row containing 2 slots, the placement count is 2 (not 0).

**Impact:** All 9 scene pairs now correctly report as COMPATIBLE with exact placement-name matching:
- `bench_basic` (2) <-> `bench_basic_row_slot` (2 slots) [OK]
- `hood_basic` (4) <-> `hood_basic_row_slot` (4 slots) [OK]
- `heat_block_bench` (3) <-> `heat_block_bench_row_slot` (3 slots) [OK]
- `cell_counter_basic` (2) <-> `cell_counter_basic_row_slot` (2 slots) [OK]
- `electrophoresis_bench` (16) <-> `electrophoresis_bench_row_slot` (16 slots) [OK]
- `imaging_bench` (2) <-> `imaging_bench_row_slot` (2 slots) [OK]
- `microscope_basic` (1) <-> `microscope_basic_row_slot` (1 slot) [OK]
- `sample_prep_bench` (4) <-> `sample_prep_bench_row_slot` (4 slots) [OK]
- `staining_bench` (11) <-> `staining_bench_row_slot` (11 slots) [OK]

**Total placements preserved:** 45 across all 9 pairs (0 loss, 0 drift).

**Validator Code:** Corrections applied to `tests/playwright/walker_row_slot_smoke.mjs` and `tests/playwright/build_comparison_gallery.mjs`. Re-run either script to regenerate artifacts with corrected verdicts.
