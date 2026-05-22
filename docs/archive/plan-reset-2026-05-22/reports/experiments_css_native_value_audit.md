# Experiments CSS-native value audit

Date: 2026-05-22
Auditor: forensic read-only review
Working directory: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation

## Context

User believes `experiments/css_native_layout/` (NEW0/NEW1/NEW2/NEW3 work) contains the best layout code. Round 3 polished `src/scene_runtime/` (the procedural engine with pixel-math coordinate solver) rather than promoting the CSS-native approach. This audit identifies what good work in `experiments/` never made it to `src/`.

## Feature 1: Scene-class CSS (bench.css / hood.css / instrument.css dispatch)

Classification: NOT PROMOTED

`experiments/css_native_layout/styles/bench.css` (386 lines) and siblings `hood.css` / `instrument.css` implement a mature three-band grid layout (`rear_shelf`, `work_surface`, `front_tools`, `popup_layer`, `instrument_station`) dispatched via scene-class selectors (`.scene--bench`, `.scene--hood`, `.scene-mode--detail`, `data-scene-density="crowded"`).

Key features in experiments, absent from `src/style.css`:

- Semantic five-region vocabulary with named CSS regions (`region--rear_shelf`, `region--work_surface`, etc.) - `bench.css` lines 85-137
- Scene-class background dispatch (warm bench surface for bench, stainless steel for hood, dark panel for instrument) - `bench.css` lines 77-82
- Footprint CSS class system: six closed size bands (`footprint--small-tool`, `footprint--handheld`, `footprint--container`, `footprint--rack`, `footprint--instrument`, `footprint--large-equipment`) with density-modifier override at `data-scene-density="crowded"` - `bench.css` lines 188-304
- `overflow: visible` on `.placement` and `.region--work_surface` to prevent artwork cropping - `bench.css` lines 106-113, 155-163
- `object-fit: contain` on `.object-graphic img` - `bench.css` lines 349-358

`src/style.css` contains none of this. Production CSS at `src/style.css` covers chrome (launcher, prompt panel, feedback), not scene layout.

The `dir_b_bench.css` / `dir_b_hood.css` / `dir_b_instrument.css` reference variants in `experiments/css_native_layout/styles/` represent the Direction B baseline that was promoted into the forward `bench.css` / `hood.css` / `instrument.css` per DECISION_MEMO.md (2026-05-19). Fully tracked under `experiments/` but never copied to `src/`.

Should be promoted next.

## Feature 2: No-crop discipline

Classification: PARTIALLY PROMOTED (rule text exists, enforcement mechanism absent)

No-crop rule is canonically stated in `docs/PRIMARY_DESIGN.md` and `docs/specs/SVG_PIPELINE.md` and cross-referenced by `experiments/css_native_layout/VISUAL_TARGETS.md` lines 2-70 and `experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md` lines 228-308. Rule text landed in production docs.

What did NOT get promoted:

- CSS enforcement mechanism: `overflow: visible` on `.placement` and `.region--work_surface` (`bench.css` lines 106-113, 155-163) and `object-fit: contain` on `.object-graphic img` (`bench.css` lines 349-358). Current `src/scene_runtime/render/scene.ts` renders placements into a DOM with no `.object-graphic` wrapper and no `object-fit: contain` rule. Production renderer creates raw `<div>` elements with inline `position: absolute` coordinates from the pixel-math layout engine - no CSS containing block enforces the rule.
- `experiments/css_native_layout/no_crop_audit/inspect.mjs`: standalone Playwright script auditing visible cropping and aspect distortion, per-placement result JSON at `no_crop_audit/no_crop_audit_results.json`. More focused than `precheck.mjs`. Never ported to `tests/playwright/`.

## Feature 3: Diagnostic precheck infrastructure

Classification: NOT PROMOTED

`experiments/css_native_layout/precheck.mjs` (1692 lines) is the most sophisticated diagnostic tool in the repo. Runs 12 distinct checks via real Chromium browser (headless Playwright, 1920x1080 viewport), emits `visual_audit.json`, `visual_audit.md`, `sizing_manifest.json`. The 12 checks and hard-fail/advisory classification documented at `experiments/css_native_layout/DIAGNOSTICS_REFERENCE.md`.

None of these checks exist in `tests/playwright/`. Closest production test is `tests/playwright/test_bench_layout.mjs` which checks scene-switch round-trip and item count, not visual quality. `tests/playwright/spike_css_native_well_plate_zoom.mjs` exercises the CSS-native adapter in isolation but does not run any of the 12 precheck diagnostics.

Most valuable individual checks with no production equivalent:

- `checkArtworkIntegrity` (precheck.mjs ~line 1000+): detects `clipped_by_parent` (any ancestor with `overflow != visible` clips the img bbox) and `aspect_distorted` (rendered aspect ratio deviates from natural by > 5%), with hard-fail escalation for glassware/pipette/plate/instrument objects. This is the mechanism that operationalizes the PRIMARY_DESIGN.md no-crop rule.
- `checkRegionOverflow` (precheck.mjs line 850-881): scrollHeight > clientHeight per region. Catches containment failures invisible until scrolled.
- `checkSvgSvgOverlap` (precheck.mjs ~line 700+): pairwise bbox intersection check with 50 sq px threshold.
- `checkSupportingDistance` (precheck.mjs ~line 1100+): normalized Euclidean distance from non-primary placements to primary center; signals spatially isolated support objects.
- `checkPrimaryObjectRatio` (precheck.mjs ~line 950+): area of primary / scene area, with `data-primary` attribution and fallback detection hierarchy.

Verdict ladder (`PASS`, `PASS_TEMPLATE`, `WARN`, `FAIL`) and `PASS_TEMPLATE` distinction for intentionally sparse template scenes are experiment-only concepts.

Should be promoted next - specifically `checkArtworkIntegrity` as a pytest-or-Playwright gate.

## Feature 4: Scorecard infrastructure

Classification: NOT PROMOTED

`experiments/css_native_layout/score_layout.mjs` (649 lines) implements a weighted per-scene layout quality scorer. Reads `visual_audit.json` + `sizing_manifest.json` and emits `scorecard.json` + `scorecard.md` with ranked scores 0-100 per scene. Scoring model includes:

- Five scene classes (`template`, `composition`, `instrument_heavy`, `zoom_detail`, `dense_clutter`) with per-class weight tables
- Hard-fail gate (any hard fail -> score 0)
- 12 metrics with normalization functions
- Comparison mode (`--compare dir_a dir_b`)
- Recommendation taxonomy (seven adjustment categories)

Scene class taxonomy fully worked out in `experiments/css_native_layout/scene_class_manifest.yaml` (10 scenes, 5 classes, fallback heuristics for future scenes). Revised weight tables (NEW1.5 Lane C, per LAYOUT_SCORECARD.md lines 323-386) iterated based on actual scores and documented with before/after ranking impact.

No equivalent scoring model in `src/` or `tests/`. `tests/test_canonical_scorecard_rule.py` exists; its name suggests a policy check rather than a live layout scorer.

`experiments/css_native_layout/LAYOUT_SCORECARD.md` contains the full scoring spec (386 lines) including weight tables, normalization formulas, recommendation taxonomy, and score interpretation guide. Self-contained, could be implemented without understanding the rest of the experiment.

## Feature 5: Stress corpus

Classification: NOT PROMOTED

`experiments/css_native_layout/stress_scenes/gold/` contains 10 hand-authored stress scene manifests. INDEX.md lists all 10 with difficulty ratings, primary objects, stress angles. Pedagogically plausible compositions; not generator output. Exercise adversarial cases like dual large equipment competing for `instrument_station` (scene 2), repeated identical small items (scene 7), adversarial size mix (scene 10). Placeholder asset names flagged with TODO comments in YAML.

`experiments/css_native_layout/stress_scenes/generated/` and batch subdirectories (`rendered_batch4_aa`, `rendered_batch5_*`) hold generated HTML scenes. Generator at `experiments/css_native_layout/stress_generators/generate_stress_scenes.py`. Batch 5 went through multiple iterations (`rendered_batch5_final3` is the last visible batch).

None of the 10 gold stress scenes under `stress_scenes/gold/` have been registered as dev smoke fixtures in `tests/content/dev_smoke/`.

Partially blocked by contract: PRIMARY_CONTRACT item 3 vests layout in the layout engine. However the gold YAML files themselves follow the standard placement/zone vocabulary and could be registered as dev smoke fixtures without promoting the CSS rendering. The stress generator and rendering pipeline are experiment-only.

The 10 gold YAMLs are the most portable artifact; should be promoted as dev smoke fixtures.

## Feature 6: Best static templates (dir_b templates)

Classification: NOT PROMOTED

`experiments/css_native_layout/templates/dir_b/` contains 10 HTML templates linking `dir_b_bench.css` / `dir_b_hood.css` / `dir_b_instrument.css`. Forward-candidate templates: Direction B design (three-band stage layout with primary-dominant work_surface) selected as baseline per DECISION_MEMO.md. The `bench_basic.html` template demonstrates:

- Semantic region structure (`region--rear_shelf`, `region--work_surface`, `region--front_tools`, `region--popup_layer`)
- `data-primary="true"` attribution on the primary placement
- `footprint--container` class on the `.object-graphic` wrapper
- Real SVG asset paths (`../../../../assets/equipment/96well_pcr_plate.svg`)
- No inline coordinate math

Root `templates/*.html` (10 files) link the promoted `bench.css`/`hood.css`/`instrument.css` and serve as the current forward candidate slot after Direction B promotion.

Working HTML; could be reference implementations when building per-protocol HTML shells. Current production per-protocol HTML shells (built by pipeline under `dist/`) use the layout engine coordinate solver rather than this CSS-native structure.

Blocked by contract until PRIMARY_CONTRACT item 3 is amended; templates are high-value reference material even without promotion.

## Feature 7: Showcase gallery

Classification: NOT PROMOTED

`experiments/css_native_layout/showcase/` contains:

- `index.html`: gallery browser for all showcase HTML files
- `concepts/`: three HTML storyboards (`electrophoresis_setup_walkthrough.html`, `pipette_to_well_storyboard.html`, `selected_well_highlight.html`) illustrating interaction-state transitions not present in production
- `label_policies/`: six CSS label policy variants (`label_policy_1.css` through `label_policy_6.css`) with corresponding HTML demos
- Polish demos: `well_plate_96_zoom_polish.html`, `style_clean_instructional_bench.html`, `style_high_contrast_diagnostic_bench.html`, `style_lab_bench_realistic_bench.html`, `drug_dilution_teaching_demo.html`, `electrophoresis_compelling_demo.html`, `hover_reveal_demo.html`, `selected_well_demo.html`, `diagnostic_overlay_demo.html`

Six label policy CSS variants particularly valuable: `tests/playwright/test_bench_layout.mjs` and `round3_runtime_label_readability.md` (in reports) document that label readability is a known weakness. Label policies in `showcase/label_policies/` represent worked solutions never applied.

`hover_reveal_demo.html` and `selected_well_demo.html` demonstrate interaction states (hover highlight, well selection) that production system implements through protocol dispatch pipeline rather than CSS. Showcase versions show what CSS-alone visual behavior could be.

Not promoted; hover and selection state demos are obsolete (production dispatch handles this); label policies directly applicable.

## Feature 8: Region/zone layout semantics

Classification: PROMOTED INCORRECTLY (partial, with fidelity loss)

Five-region vocabulary (`rear_shelf`, `work_surface`, `front_tools`, `instrument_station`, `popup_layer`) promoted into `src/scene_runtime/layout/css_native_adapter.ts` as `DEFAULT_REGION_VOCABULARY` (lines 28-34). Adapter uses `placement.zone` to map placements to regions. Correct vocabulary-level promotion.

What was lost:

1. `css_native_adapter.ts` is gated behind `feature_flags.ts` with `CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT = false` (line 14). Spike OFF by default; region vocabulary not active in any production render path.
2. Adapter scaffolds DOM without footprint CSS classes (`footprint--small-tool`, etc.). Experiment's `.object-graphic.footprint--container` structure is how the CSS size bands work; adapter only creates `div.placement` elements without footprint classes (lines 108-128 of `css_native_adapter.ts`).
3. Adapter uses hardcoded `scene--bench scene-mode--detail` class (line 79) regardless of actual scene class - scene-class dispatch system from `bench.css` / `hood.css` / `instrument.css` not wired.
4. SVG-to-SVG-coordinate shim (lines 175-184) converts CSS pixel rects back to SVG-space coordinates for the legacy renderer, losing the semantic region containment that makes the CSS approach work.

`object_footprints.yaml` (146 object entries) maps object names to footprint classes. Populated from sweep of experiment templates and stress scenes. No equivalent in `src/` or `generated/`. Footprint mapping required to correctly populate footprint CSS classes when rendering scenes via CSS-native approach.

## Feature 9: Object containment rules (`.placement` -> `.object-graphic` -> `img/svg`)

Classification: NOT PROMOTED

Three-level containment structure in experiment templates:

```
.placement[data-placement-name][data-object-name][data-primary]
  .object-graphic.footprint--<class>
    img[src="...svg"][alt="..."] / or inline SVG
  span.placement-label
```

Specific CSS contracts:

- `.placement { overflow: visible; }` - prevents placement box from cropping artwork (`bench.css` lines 155-163)
- `.object-graphic { display: flex; align-items: center; justify-content: center; }` - centers artwork (`bench.css` lines 334-348)
- `.object-graphic img { object-fit: contain; width: auto; height: auto; max-width: 100%; max-height: 100%; }` - preserves aspect ratio (`bench.css` lines 349-358)
- Footprint classes set `min-width`, `max-width`, `min-height`, `max-height` sizing bands, not pixel positions

Production renderer at `src/scene_runtime/render/scene.ts` generates a different DOM:

- Placements become `div` elements with inline `position: absolute; left: ...; top: ...; width: ...; height: ...` from layout engine's pixel-math output
- No `.object-graphic` wrapper class
- SVG loaded via `getAssetSvgString` and inlined or set as `src` without containment wrapper
- No `object-fit: contain` applied anywhere in `src/style.css` for scene content

Production renderer's placements fully positioned by inline styles with no CSS-level safety net against cropping. No-crop rule stated but has no structural enforcement.

## Summary classification table

| Feature | Classification | Priority |
| --- | --- | --- |
| Scene-class CSS (bench/hood/instrument.css) | Not promoted | Blocked by contract item 3; high value when contract amended |
| No-crop discipline (CSS mechanism) | Promoted incorrectly (rule text only, no structural enforcement) | High - apply .object-graphic + object-fit:contain now |
| Diagnostic precheck (precheck.mjs, 12 checks) | Not promoted | High - checkArtworkIntegrity as production gate |
| Scorecard infrastructure (score_layout.mjs) | Not promoted | Medium - LAYOUT_SCORECARD.md as spec for future gate |
| Stress corpus (gold YAML scenes) | Not promoted | Medium - 10 gold YAMLs as dev smoke fixtures |
| dir_b templates | Not promoted | Blocked by contract; reference value only |
| Showcase gallery | Not promoted | Low (concepts/storyboards obsolete); label_policies applicable |
| Region/zone vocabulary | Promoted incorrectly (partial, spike-gated, footprints missing) | High - object_footprints.yaml + footprint class wiring |
| Object containment rules (.object-graphic) | Not promoted | High - minimum safety net independent of layout engine choice |

## Most urgent unpromoted items

1. `.object-graphic` wrapper + `object-fit: contain` (`bench.css` lines 334-358)
   Independent of CSS-native layout approach. Every SVG-rendering placement in production should have this wrapper. Costs nothing architecturally, not blocked by contract item 3, directly enforces PRIMARY_DESIGN.md no-crop rule that currently has no structural enforcement in `src/`.

2. `checkArtworkIntegrity` from `precheck.mjs` (ancestor-walk overflow clip detection + aspect ratio check, ~lines 1050-1200 of `precheck.mjs`)
   Should become a `tests/playwright/` gate against at least the canonical 10 templates (or against production dist/ scenes). Only automated verification of the no-crop hard rule.

3. `object_footprints.yaml` (`experiments/css_native_layout/object_footprints.yaml`, 146 entries)
   Mapping of object names to footprint CSS classes; accumulated output of sweeping all experiment templates and stress scenes. Needs to land in `generated/` or `docs/specs/` as authoritative footprint registry before CSS-native adapter can correctly size objects.

4. The 10 gold stress YAMLs (`experiments/css_native_layout/stress_scenes/gold/gold_*.yaml`)
   Follow standard placement/zone vocabulary; could be registered as `tests/content/dev_smoke/` fixtures without any contract amendment. Exercise adversarial scene compositions no current smoke fixture covers.

## What is obsolete

- Scratch CSS variants (`bench_a.css`, `bench_b.css`, `bench_d.css`, `bench_diorama.css`, `bench_focusedstage.css`, `bench_gameboard.css` and hood/instrument siblings): gitignored, superseded by Direction B. Confirmed not linked by any template per DECISION_MEMO.md stabilization re-confirmation.
- Direction A as a forward candidate: its zoom-placement fill rule (`.scene-mode--detail .placement { width:100%; height:100% }`) ported to Direction B and lives in tracked `bench.css`. Direction A itself retired.
- `spike_css_native_well_plate_zoom.mjs` as a permanent test pattern: inlines a JS mirror of the adapter (noted divergence risk in file header at line 13-21). Should be replaced with a real integration test once the spike is de-gated.

## What is blocked by contract

`PRIMARY_CONTRACT.md` item 3: "Scene object layout is handled by the layout engine." CSS-native layout engine (`experiments/css_native_layout/`) replaces the layout engine entirely. Full promotion of scene-class CSS, three-band grid, and template structure blocked by this contract item. Contract amendment draft exists at `docs/archive/css_native_layout/new1_primary_contract_item3_amendment_draft.md` but has not been approved.

Items NOT blocked by contract (can be promoted without amendment):

- `.object-graphic` containment wrapper and `object-fit: contain` (render-layer CSS, not layout engine behavior)
- `checkArtworkIntegrity` diagnostic (a test, not production layout logic)
- `object_footprints.yaml` (a mapping reference, not layout engine logic)
- The 10 gold stress YAMLs (content fixtures, not layout engine)
- `LAYOUT_SCORECARD.md` as specification (documentation)

## Concerns

1. No-crop hard rule in `PRIMARY_DESIGN.md` has no structural enforcement in `src/`. CSS mechanism that enforces it exists in `experiments/` but was never ported.
2. `css_native_adapter.ts` in `src/scene_runtime/layout/` is permanently spike-gated (`feature_flags.ts` line 14, default false) and does not have footprint class wiring, making it incomplete as a production path.
3. `object_footprints.yaml` (146 entries) has no equivalent in `src/` or `generated/`; any future CSS-native render would produce unsized placements.
4. Entire precheck diagnostic corpus (1692 lines) has no counterpart in `tests/playwright/` against production scenes.

STATUS: DONE_WITH_CONCERNS
