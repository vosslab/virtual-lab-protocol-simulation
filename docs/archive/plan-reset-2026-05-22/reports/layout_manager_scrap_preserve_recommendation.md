# Layout manager scrap/preserve recommendation (Forensic Task FI)

Date: 2026-05-22
Role: planner (documentation-only)
Synthesizes FA (provenance), FB (experiments value audit), FC (salvage contamination), FD (runtime SVG completeness), FF (side-by-side), FG (diagnostic measurements), FH (integrated assessment).

## 1. Headline verdict

KEEP the runtime layout manager in `src/scene_runtime/`, scrap the spike-gated CSS-native code path, and promote four unblocked items from `experiments/css_native_layout/` immediately; the runtime wins 5/6 side-by-side, has 26/26 mount, 230/278 real-SVG render, 0 placeholders, and 0 visible crops, while the CSS-native experiments side has 0/10 precheck PASS and 0/110 stress PASS.

## 2. Scrap-or-keep table

| Subsystem | Files | Decision | Evidence |
| --- | --- | --- | --- |
| Zone-based layout engine | `src/scene_runtime/layout/layout_engine.ts` (958 lines) | KEEP | FA: mined from production `src/layout_engine.ts` (2026-05-05); FF: wins 5/6 pairs; FG: 0 visible crops, 0 off-page across 26 protocols |
| Layout adapter (RuntimeWorld bridge) | `src/scene_runtime/layout/adapter.ts` (228 lines) | KEEP (with type-safety follow-up) | FA Concern 2: broad ESLint suppressions at file scope; functional but untyped at YAML boundary |
| Layout types | `src/scene_runtime/layout/types.ts` | KEEP | FA: clean |
| Layout barrel | `src/scene_runtime/layout/index.ts` | KEEP (trim re-exports) | Re-exports `computeRowSlotSceneLayout` for nothing; trim |
| CSS-native adapter spike | `src/scene_runtime/layout/css_native_adapter.ts` (259 lines) | DELETE | FA Concern 1: ships in every bundle, never called, file header says "remove before NEW1 promotion"; FB: spike-gated and incomplete (no footprint wiring) |
| Feature flag gate | `src/scene_runtime/layout/feature_flags.ts` (49 lines) | DELETE with the spike | Only consumer is the spike adapter; flag default `false` permanently |
| Render pipeline | `src/scene_runtime/render/{scene,apply,svg_loader,clock}.ts` | KEEP | FG: 26/26 mount; FD: 230/278 real-SVG |
| Bundle entry | `src/scene_runtime/bundle/entry.ts` | KEEP | FA: single canonical entry; healthy import graph |
| Loader subsystem | `src/scene_runtime/loader/*.ts` | KEEP | FA: production-runtime; clean |
| Dispatch (click/adjust) | `src/scene_runtime/dispatch/*.ts` | KEEP | FG: 133 clickWorks across 12/26 walkthroughs |
| Chrome (prompt, feedback, scene frame, etc.) | `src/scene_runtime/chrome/*` | KEEP | FA: production; not in scope of layout decision |
| Well-plate subpart adapter | `src/scene_runtime/adapters/well_plate/*` | KEEP | FA: production; correct subpart pattern per contract item 3 |
| `computeRowSlotSceneLayout` (orphan export) | inside `layout_engine.ts` lines ~700-799 | DELETE | FA Concern 3: exported, not wired, no roadmap |
| Salvage Python utilities | `salvage/normalize_svg.py`, `salvage/purge_inline_images.py` | KEEP (rename folder) | FC: untracked but not contamination; folder name is misleading documentation debt |
| Salvage agent transcripts | `salvage/render_migration_2026-05-09/` (54 `.output`/`.diff`/`.patch`) | FREEZE or move to `docs/archive/` | FC: zero source files; not contamination |
| Experiments tree | `experiments/css_native_layout/` (full subtree) | FREEZE in place; selectively promote | FA: isolated bidirectionally; FB: 4 items unblocked by contract; FG: 0/10 PASS verdict |
| CSS-native scene CSS | `experiments/css_native_layout/styles/bench.css`, `hood.css`, `instrument.css` | FREEZE (blocked by contract item 3) | FB Feature 1 + 6: forward Direction B baseline; cannot promote without amendment |
| `precheck.mjs` (1692 lines, 12 checks) | `experiments/css_native_layout/precheck.mjs` | PORT `checkArtworkIntegrity`; FREEZE the rest | FB Feature 3: only no-crop enforcement; rest of harness is experiment-only |
| `score_layout.mjs` + LAYOUT_SCORECARD.md | `experiments/css_native_layout/score_layout.mjs` | FREEZE (spec is valuable, code is experiment-only) | FB Feature 4: scorer needs experiments harness to run |
| 10 gold stress YAMLs | `experiments/css_native_layout/stress_scenes/gold/gold_*.yaml` | PORT to `tests/content/dev_smoke/` | FB Feature 5: standard placement/zone vocabulary; not blocked by contract |
| `object_footprints.yaml` (146 entries) | `experiments/css_native_layout/object_footprints.yaml` | PORT to `docs/specs/` or `generated/` | FB Feature 8: authoritative footprint registry; not blocked by contract |
| Showcase gallery | `experiments/css_native_layout/showcase/` | DELETE concepts/storyboards; FREEZE label_policies | FB Feature 7: storyboards obsolete; label_policies need contract amendment |
| Stress generator and batch outputs | `experiments/css_native_layout/stress_generators/`, `stress_scenes/generated/`, `rendered_batch5_*` | DELETE | FG: 0/110 PASS in latest batch; consumed their value |

## 3. Top 5 preservation items (must keep no matter what)

1. `src/scene_runtime/layout/layout_engine.ts` -- the zone-based engine, mined verbatim from a production file (FA), demonstrably correct on every measured rubric (FF, FG).
2. `src/scene_runtime/render/scene.ts` + `src/scene_runtime/render/apply.ts` -- 26/26 mount and the only render path that emits real-SVG content with measured 0 visible crops (FG).
3. `src/scene_runtime/loader/world.ts` and the loader subsystem -- the YAML-to-RuntimeWorld pipeline that every protocol depends on (FA).
4. `src/scene_runtime/bundle/entry.ts` -- the single canonical bundle entry, no shadow surfaces (FA).
5. `src/scene_runtime/adapters/well_plate/` -- the only working example of the contract-mandated subpart layout pattern; future plates/racks/gels should follow this shape (FA, contract item 3).

## 4. Top 5 promotion candidates (from `experiments/`)

1. `.object-graphic` wrapper + `object-fit: contain` (`experiments/css_native_layout/styles/bench.css` lines 334-358) -- structural no-crop enforcement; not blocked by contract; FB ranked #1 most urgent.
2. `checkArtworkIntegrity` from `precheck.mjs` (~lines 1050-1200) -- only automated verification of the PRIMARY_DESIGN no-crop hard rule; port as a `tests/playwright/` gate.
3. `object_footprints.yaml` (146 entries) -- authoritative object-to-footprint mapping; lands in `docs/specs/` or `generated/`; no contract impact.
4. 10 gold stress YAMLs at `experiments/css_native_layout/stress_scenes/gold/gold_*.yaml` -- register as `tests/content/dev_smoke/` fixtures with `protocol_type: dev_smoke`; adversarial compositions no current fixture covers.
5. `LAYOUT_SCORECARD.md` (386 lines, weight tables + recommendation taxonomy) -- promote as `docs/specs/LAYOUT_SCORECARD.md` so the spec survives even when the JS scorer doesn't.

## 5. Top 5 deletion candidates

1. `src/scene_runtime/layout/css_native_adapter.ts` -- spike ships in every bundle, header says "remove before NEW1 promotion," never called (FA Concern 1).
2. `src/scene_runtime/layout/feature_flags.ts` -- only consumer is the spike adapter; flag default `false` permanently; delete with the spike.
3. `computeRowSlotSceneLayout` export inside `src/scene_runtime/layout/layout_engine.ts` -- not wired, no plan, mild misleading-future-contributors risk (FA Concern 3).
4. `experiments/css_native_layout/stress_scenes/generated/` and all `rendered_batch5_*` directories -- batch outputs; 0/110 PASS in the latest batch; consumed their value (FG).
5. `experiments/css_native_layout/showcase/concepts/` and `showcase/*_demo.html` polish demos -- interaction-state and visual storyboards superseded by production dispatch (FB Feature 7).

Soft deletions (move to `docs/archive/` rather than `rm`): `salvage/render_migration_2026-05-09/` (FC: zero source files, just transcripts); the dir_b template HTML set (FB Feature 6: reference value only, blocked by contract).

## 6. Next decisive prototype

Build `.object-graphic` wrapper into the runtime render path under a single small PR, then port `checkArtworkIntegrity` as a Playwright gate against the existing 26 `dist/*.html` protocols.

Concrete shape:

- Modify `src/scene_runtime/render/scene.ts` (or `apply.ts`) so every placement DOM emits `<div class="placement"><div class="object-graphic">{svg|img}</div><span class="placement-label">...</span></div>`.
- Add `src/style.css` rules for `.placement { overflow: visible; }`, `.object-graphic { display: flex; align-items: center; justify-content: center; }`, `.object-graphic img, .object-graphic svg { object-fit: contain; width: auto; height: auto; max-width: 100%; max-height: 100%; }`.
- Port `checkArtworkIntegrity` into `tests/playwright/test_artwork_integrity.mjs` running over every `dist/*.html`.
- Expected signal: hard-fail count on `clipped_by_parent` should drop from "unmeasured" to 0; aspect-distortion findings on glassware/pipette/plate should drop to 0. If they do not, the wrapper alone is insufficient and the contract amendment conversation becomes load-bearing.

Why this is decisive: it is the smallest concrete change that operationalizes the PRIMARY_DESIGN no-crop rule against the runtime path, does not touch the contract, does not depend on CSS-native promotion, and gives a binary signal on whether the runtime path can satisfy the visual-integrity bar without scene-class CSS.

## 7. What needs user approval

Required:

- Approval to delete `src/scene_runtime/layout/css_native_adapter.ts`, `src/scene_runtime/layout/feature_flags.ts`, and the `computeRowSlotSceneLayout` export. Each is non-functional, but deletion changes the public layout module surface; this should be a single review-gated commit.
- Approval to register the 10 gold stress YAMLs as `tests/content/dev_smoke/` fixtures (additive, no contract impact, but new content surface).

Not required (do without approval):

- Adding `.object-graphic` wrapper to runtime render path (render-layer CSS, not layout-engine behavior; explicitly called out as unblocked in FB).
- Porting `checkArtworkIntegrity` as a Playwright gate (test, not production logic).
- Promoting `object_footprints.yaml` to `docs/specs/` (mapping reference, not engine logic).
- Promoting `LAYOUT_SCORECARD.md` as a spec doc (documentation only).

Future approval gates (defer until trigger fires):

- Contract item 3 amendment to allow scene-class CSS layout (`bench.css` / `hood.css` / `instrument.css` and Direction B templates). Draft exists at `docs/archive/css_native_layout/new1_primary_contract_item3_amendment_draft.md`. Do NOT pursue this amendment until the `.object-graphic` + `checkArtworkIntegrity` decisive prototype above produces evidence that the runtime path cannot satisfy the no-crop bar. Current evidence (FF: runtime 5/6, FG: 0 visible crops in runtime) is that it likely can.
- Rename of `salvage/` folder to something accurate (e.g. `tools/svg_utilities/`). Trivial, but renames need user sign-off per repo convention.

## Status

DONE_WITH_CONCERNS. Memo at `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/reports/layout_manager_scrap_preserve_recommendation.md`.

Concerns:

1. The "keep runtime, scrap spike, promote 4 items" recommendation rests on FF's 5/6 verdict and FG's 0-visible-crop metric, both measured against current `dist/`. The 46 label overlaps in the SDS-PAGE family (FG Table 1) and 14/26 walker failures (FG Appendix) are real and not addressed by this memo; they are walker-instrument and scene-wiring issues per FG's own classification, but a future audit should confirm that.
2. FD reports 48 hard fails across 278 placements (12 of 26 protocols affected). These are missing/thin SVG assets (`empty_bubble` x6 for `well_plate_96`, `generic_outline` x42 for `power_supply`, `gel_opening_tool`, `electrode_module`, `kimwipe_pad`, `microwave_closed`, `heat_block_closed`, `lightbox_off`, `microtube_rack_24_placeholder`). These are asset-completeness defects, not layout defects; the recommendation here does not fix them but the artwork-integrity gate in section 6 will catch them as hard fails.
