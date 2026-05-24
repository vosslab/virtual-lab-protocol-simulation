# M0 first productionization milestones

STATIC EXPERIMENT EVIDENCE. Date: 2026-05-22.

Lane P (productionization milestone list) for the layout-manager-clean-start
manager. Documentation-only. No code, CSS, HTML, SVG, JS, or YAML is modified
by this report. Every milestone here is a proposal; ranked easiest + lowest
risk first.

The list below is grounded in M0 evidence already on disk:

- Lane A precheck output under `test-results/m0_static_summary/precheck/`
  (`visual_audit.json`, `visual_audit.md`, `HARD_FAIL_TABLE.md`,
  `sizing_manifest.json`, 10 per-scene PNGs at 1920x1080).
- Lane B scorecard under `test-results/m0_static_summary/scorecard/`
  (aggregate 152/1000; only `well_plate_96_zoom` at 92 and `hood_basic`
  at 60 clear the hard-fail floor).
- Lane D SVG completeness report at
  [m0_static_svg_completeness.md](m0_static_svg_completeness.md).
- Lane M per-scene root-cause report at
  [m0_static_failed_scenes.md](m0_static_failed_scenes.md).
- Lane E visual capability summary at
  [m0_static_visual_summary.md](m0_static_visual_summary.md).
- Lane H architecture extraction plan at
  ../active/layout_manager_clean_start/architecture_extraction_plan.md.
- Lane onboarding context at
  ../active/layout_manager_clean_start/ONBOARDING.md.

## 1. Status banner

STATIC EXPERIMENT EVIDENCE. Not runtime evidence. `src/` is empty post the
2026-05-22 reset, so the runtime dispatch path is broken. Static-template
diagnostics still work. Pure CSS fixes outrank asset authoring and asset
authoring outranks `src/` rebuild because each step's evidence delta is
measurable against an already-running diagnostic.

## 2. M0 aggregate numbers cited below

- 10 of 10 templates FAIL at 1920x1080 per Lane A precheck.
- Aggregate scorecard 152/1000 per Lane B; only `well_plate_96_zoom` (92)
  and `hood_basic` (60) clear the hard-fail floor.
- Per Lane M: 21 off_page, 4 region_overflow, 3 svg_label_overlap, 38
  aspect_distorted (HARD_FAIL), 21 clipped_by_parent (HARD_FAIL). Aggregate
  total HF = 89.
- Per Lane D: 14 WRONG_ASSET references plus 2 PLACEHOLDER references to
  `microtube_rack_24_placeholder.svg`.
- Lane M top three root causes:
  1. `front_tools` region 70 px past viewport h=1080 ->
     17 of 21 off_page hits.
  2. Aspect distortion is card-driven, not SVG-content driven ->
     38 hard fails.
  3. `instrument_station` y=1174 below viewport in template-mode
     (`cell_counter_basic` and `microscope_basic`).

## 3. Ranked milestones

### Rank 1: M1a fix front_tools region overflow

- Title: Fix `region--front_tools` viewport overflow.
- Goal: Push the `front_tools` region back into the 1920x1080 viewport so
  pipette-row and tool-row placements no longer clip past y=1080.
- Acceptance: Lane A precheck `off_page` total drops by at least 12 across
  the 5 affected scenes (`bench_basic`, `crowded_bench_dense`,
  `drug_dilution_plate_workspace`, `drug_dilution_workspace_dense`,
  `staining_bench`). Per-scene: each of those 5 scenes' `off_page` count
  decreases by at least 1.
- Files touched: `experiments/css_native_layout/styles/bench.css`
  (`.region--front_tools` rule). One file.
- Dependencies: none.
- Estimated effort: S.
- User-gated? No.
- Evidence basis: Lane M section "Aggregate table" (off=21 with 17 of 21
  attributed to `front_tools`); Lane A `HARD_FAIL_TABLE.md`; Lane E
  `m0_static_visual_summary.md` section 2.

### Rank 2: M1b fix aspect distortion on pipette and tip_box cards

- Title: Fix `footprint--pipette` and `footprint--tip-box` aspect distortion.
- Goal: Constrain pipette and tip_box card aspect ratios so the rendered
  asset matches the natural SVG aspect within the 5% tolerance.
- Acceptance: Lane A precheck `aspect_distorted` HARD_FAIL count drops from
  38 to at most 5 across all 10 scenes. The two worst cases drop below the
  5% threshold: `center_p1000_pipette` (currently 480% distortion) and
  `center_serological_pipette` (currently 253% distortion).
- Files touched: `experiments/css_native_layout/styles/bench.css`
  (`footprint--pipette`, `footprint--tip-box` rules). One file.
- Dependencies: none. Parallelizable with M1a (separate CSS rules).
- Estimated effort: S.
- User-gated? No.
- Evidence basis: Lane M aggregate (aspect=38); Lane M per-scene rows
  (`hood_basic` 480%, multiple scenes 253%+); Lane A `visual_audit.json`
  `artwork_integrity.aspect_distorted` entries.

### Rank 3: M1c repair instrument_station template-mode origin

- Title: Fix `region--instrument_station` y-origin in template mode.
- Goal: Move the `instrument_station` card up so its primary placement
  rect is inside the 1080 viewport in template mode.
- Acceptance: Lane A precheck primary placement rect for
  `cell_counter_basic` and `microscope_basic` has `rect.y < 1080`. Both
  scenes' `clipped_by_parent` HARD_FAIL on the instrument placement
  disappears.
- Files touched:
  `experiments/css_native_layout/styles/bench.css`
  (or instrument.css if the rule lives there).
  Touches one of these two files.
- Dependencies: none.
- Estimated effort: S.
- User-gated? No.
- Evidence basis: Lane M sections 3.2 (`cell_counter_basic`, instrument
  card too short) and the parallel `microscope_basic` row; Lane M aggregate
  total (instrument_station y=1174 noted in the Lane M root-cause summary).

### Rank 4: M1d replace microtube_rack_24 placeholder SVG

- Title: Replace `microtube_rack_24_placeholder.svg` with a real
  `microtube_rack_24.svg` asset.
- Goal: Remove every PLACEHOLDER reference from the 10 production
  templates so no scene depends on placeholder geometry.
- Acceptance: Zero references to `microtube_rack_24_placeholder.svg` in
  the 10 tracked templates after the real asset is in place. Lane D
  re-run reports 0 PLACEHOLDER entries.
- Files touched:
  - `assets/equipment/microtube_rack_24.svg` (new asset; author or
    commission).
  - `experiments/css_native_layout/templates/drug_dilution_plate_workspace.html`
    (1 reference to swap).
  - `experiments/css_native_layout/templates/drug_dilution_workspace_dense.html`
    (1 reference to swap).
- Dependencies: none.
- Estimated effort: M.
- User-gated? Yes. Asset authoring requires the user to commission or
  hand-author the SVG to repo SVG-pipeline standards
  (`docs/specs/SVG_PIPELINE.md`).
- Evidence basis: Lane D `m0_static_svg_completeness.md` PLACEHOLDER rows
  (2 references); Lane M `place` column (1 each on the two drug-dilution
  scenes).

### Rank 5: M1e fix microscope_basic SVG reference

- Title: Repair `microscope_basic.html` SVG src to point at the correct
  asset.
- Goal: The `microscope` object in `microscope_basic.html` must reference
  the microscope SVG, not the centrifuge SVG.
- Acceptance: The `<img>` for `data-object-name="microscope"` in
  `microscope_basic.html` references `microscope_new.svg`. Lane D re-run
  shows 0 WRONG_ASSET on the `microscope` object in that file.
- Files touched:
  `experiments/css_native_layout/templates/microscope_basic.html`.
  One file.
- Dependencies: none.
- Estimated effort: S.
- User-gated? No.
- Evidence basis: Lane D table row showing `microscope` -> incorrect
  asset (matches the Lane D rule "WRONG_ASSET: file exists but its name
  does not match the `data-object-name` semantically (for example a
  `microscope` object using `centrifuge_new.svg`)").

### Rank 6: M1f sweep remaining WRONG_ASSET references

- Title: Sweep the remaining 13 WRONG_ASSET references after M1e.
- Goal: After M1e fixes the marquee microscope swap, the rest of the 14
  WRONG_ASSET references (per Lane D) need a one-shot review pass.
- Acceptance: Lane D re-run reports 0 WRONG_ASSET entries across all 10
  tracked templates.
- Files touched: templates under
  `experiments/css_native_layout/templates/` (subset of the 10 files;
  cell_counter_basic.html is a confirmed candidate per Lane D row
  `counter_slide_cartridge` -> `cell_counter.svg`).
- Dependencies: M1e (so the review is scoped to the residual 13).
- Estimated effort: M.
- User-gated? No, unless a swap requires a new asset (then escalate to a
  follow-on of M1d).
- Evidence basis: Lane D table (14 WRONG_ASSET total; 1 retired by M1e).

### Rank 7: M2 rebuild src/ minimum runtime

- Title: Rebuild the minimum `src/scene_runtime/` runtime required to
  re-prove the spike runtime dispatch.
- Goal: Re-establish a runtime bundle so the Lane R-style Playwright
  spike for `well_plate_96_zoom` passes 7 of 7 again. Closes the gap
  noted in Lane E section 3 ("`src/` is empty, so the runtime bundle
  cannot be built").
- Acceptance: `tests/playwright/spike_built_app_well_plate_zoom.mjs` (or
  the spike file name that currently lives under `tests/playwright/`)
  passes 7 of 7. The built-app precheck
  (`bash experiments/css_native_layout/run_built_app_precheck.sh`)
  produces a runtime-rendered `well_plate_96_zoom` HTML dump.
- Files touched: new files only under `src/scene_runtime/` (per the
  Lane H architecture extraction plan section 5). Empty list relative
  to existing files.
- Dependencies: none from M1a-M1f (those are pure CSS/asset/template
  edits). Sequencing M2 after the M1 group keeps the visual baseline
  clean before runtime work resumes.
- Estimated effort: L.
- User-gated? Yes. `docs/PRIMARY_CONTRACT.md` item 3 is unresolved per
  ONBOARDING.md section 6; the user decides whether the rebuilt runtime
  reconciles the contract (item 3 amendment) or rebuilds within it.
- Evidence basis: Lane E `m0_static_visual_summary.md` section 3
  ("`src/` is empty ... blocks `render_and_dump.mjs` ... blocks built-app
  precheck"); Lane H architecture extraction plan sections 5 and 8.

### Rank 8: M3 generalize spike to a second scene

- Title: Wire one second scene through `SceneRuntime` to prove
  generalization.
- Goal: Replicate the Path A wiring on `hood_basic` or `bench_basic` so
  the runtime dispatch is not only a `well_plate_96_zoom` artifact.
  Picks up the "next implementation step" called out in
  ONBOARDING.md section 6 ("Generalization evidence ... Not done.").
- Acceptance: A second Playwright spike file under `tests/playwright/`
  loads the built bundle, clicks one visible scene object in the chosen
  scene, and asserts invocation count strictly increments by exactly 1.
  The runtime renders a measurable, non-zero number of placements for
  that scene.
- Files touched: a new spike file under `tests/playwright/` plus the
  minimum runtime wiring under `src/scene_runtime/` for the second
  scene (file list deferred to M3's own atomic plan).
- Dependencies: M2 (runtime bundle must exist before a second scene can
  be wired through it).
- Estimated effort: M.
- User-gated? No (M2 already absorbs the contract decision).
- Evidence basis: ONBOARDING.md section 6 ("NEW1.5's 'next
  implementation step' was to replicate Path A wiring for one second
  scene ... Not done.").

### Rank 9: M4 promote experiment-local vocabulary into docs/specs/

- Title: Promote footprint classes, region taxonomy, and scene class set
  into `docs/specs/`.
- Goal: The 7 footprint classes
  (`small-tool`, `handheld`, `container`, `rack`, `instrument`,
  `large-equipment`, `zoom-view`), the 5 region names
  (`rear_shelf`, `work_surface`, `front_tools`, `instrument_station`,
  `popup_layer`) translated to the canonical `zone` term, and the 5
  scene classes
  (`template`, `composition`, `instrument_heavy`, `zoom_detail`,
  `dense_clutter`) become canonical, not experiment-local.
- Acceptance: Three new specs (or three new sections in an existing
  spec) live under `docs/specs/`. Lane H architecture extraction plan
  section 3 USER_DECISION_REQUIRED items for footprint promotion,
  zone-name promotion, and scene-class promotion all flip from "experiment
  local" to "canonical". Markdown link checks pass.
- Files touched: new files under `docs/specs/` (e.g.
  `docs/specs/OBJECT_FOOTPRINTS.md`, plus zone-term additions in
  `docs/specs/SCENE_VOCABULARY.md` or `docs/specs/LAYOUT_ENGINE.md`,
  plus scene-class additions). File list deferred to M4's atomic plan.
- Dependencies: M2 and M3 (the production layout manager's runtime
  shape must be settled before its closed vocabularies are frozen in
  spec).
- Estimated effort: L.
- User-gated? Yes. Lane H section 3 lists this explicitly as
  USER_DECISION_REQUIRED ("adoption of this closed set as canonical in
  `docs/specs/` versus keeping it experiment-local").
- Evidence basis: Lane H architecture extraction plan section 3
  (closed-vocabulary table); ONBOARDING.md section 7
  ("Keep the closed scene class set ... but treat it as a policy dial,
  not an extension point.").

## 4. Recommended starter milestone

**Start with M1a and M1b in parallel.** Reason:

- Both are pure CSS. No `src/` rebuild. No asset authoring. No user
  decision. The forbidden boundary lists in ONBOARDING.md section 7
  do not name `experiments/css_native_layout/styles/bench.css`.
- They target separate CSS rules (`.region--front_tools` vs
  `footprint--pipette` / `footprint--tip-box`), so they do not race.
- Together they account for the biggest evidence delta in the M0 data:
  off_page drops by 12 (M1a) plus aspect_distorted drops from 38 to 5
  (M1b) covers roughly 45 of the 89 total hard fails per Lane M
  aggregate.
- The diagnostic loop is already running. Lane A precheck completes in
  9.180 s wall time per Lane E section 2; the verification cycle is
  cheap.

Recommended sequence after the M1a + M1b parallel pair:

1. M1c (`instrument_station` y-origin), closes the next 2 to 4 hard
   fails on `cell_counter_basic` and `microscope_basic`.
2. M1e (microscope_basic SVG reference), one-line repair, no risk.
3. M1f (remaining WRONG_ASSET sweep), one-shot review pass.
4. M1d (microtube_rack_24 placeholder), gated on user-supplied SVG.
5. M2 then M3 then M4 in order; do not start M2 until the M1 group is
   green.

## 5. Forbidden boundary in NEW3 era

The NEW3 era's anti-drift list applies to every milestone above. Lifted
verbatim in spirit (paraphrased to avoid restating archive details
without reference):

- Do not edit the diagnostic tools (`precheck.mjs`, `score_layout.mjs`,
  `render_and_dump.mjs`, `no_crop_audit/inspect.mjs`) to weaken
  thresholds, raise the `clipped_artwork` ceiling, insert shadow
  placement divs that inflate scores, or otherwise flatter the result.
  Two prior attempts were caught and reverted. Only canonical,
  unmodified diagnostic output counts as evidence.
- Do not substitute `_placeholder.svg` (or any other placeholder asset)
  for a missing scientific SVG in production templates. The stress
  renderer's `_placeholder.svg` substitution is an experiment-local
  convenience and must not leak into production.
- Do not introduce `as any`, `as unknown as`, `@ts-ignore`, debug
  `console.log`, or hardcoded `-99999` offset values in spike or
  adapter files. Prior reviewers explicitly grepped for these and
  reverted them.
- Do not edit `src/scene_runtime/layout/layout_engine.ts`
  (legacy, failed architecture; treat as out of scope).
- Do not edit `src/scene_runtime/layout/css_native_adapter.ts`
  without an explicit lane scope. Prior dispatches overstepped this
  boundary and required revert plus rewrite.
- Do not edit `src/scene_runtime/adapters/well_plate/render.ts`. Forbidden
  boundary in every prior round.
- Do not edit `src/scene_runtime/chrome/scene_frame.ts`. Pointer-events
  flipped in a prior round and had to be reverted.
- Do not promote `experiments/css_native_layout/regions/*.yaml` as the
  production schema. It is an experiment-local mapping artifact; the
  canonical schema is `zones[]` in scene YAML per
  `docs/specs/SCENE_YAML_FORMAT.md`.
- Do not let an agent run `git add -A && git commit`. A prior commit
  added 111 binary blobs to history that way. Stage specific files only.
- Do not treat stress-corpus 100% FAIL as production failure. Stress
  scenes are synthetic test fixtures, not pedagogically valid protocols.
- Do not claim visual success while glassware bottoms are cropped.
  No-crop is a hard contract rule from `docs/PRIMARY_DESIGN.md`. Use
  `object-fit: contain`, preserve SVG `preserveAspectRatio="xMidYMid meet"`,
  and never hide cropped assets to make the gate pass.
- Do not branch the walker on a `step_name`, a `protocol_name`, or any
  per-protocol special case. If a step does not work through visible UI,
  fix the YAML, the scene, or the runtime; do not add a walker branch.
- Do not introduce `schema_version` or per-surface schema-version
  constants. The repo `VERSION` file is the schema version per
  `docs/PRIMARY_SPEC.md` ("No schema version").

## 6. Open questions deferred to the manager

- Whether M1a, M1b, and M1c should each ship as one CSS PR or batch into
  a single CSS PR. The list ranks them separately because their
  acceptance criteria are independent; the manager may batch.
- Whether M1d should wait on the M2 runtime rebuild or proceed in
  parallel. The list ranks M1d before M2 because asset authoring is
  user-gated and runs at the user's pace; the manager may swap if the
  user prefers serial execution.
- Whether M4 (vocabulary promotion) requires its own RFC pass before
  landing as canonical spec. The list assumes the architecture
  extraction plan section 8 USER_DECISION items cover it; the manager
  may insert an RFC step.
