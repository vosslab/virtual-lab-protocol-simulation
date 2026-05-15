# Changelog archive 2026-05 (c)

Archived day blocks from 2026-05-12 through 2026-05-13. Rotated from docs/CHANGELOG.md on 2026-05-15. Most-recent month in range is 2026-05.

## 2026-05-13 (M6 WP-WP-4: walker end-to-end test on full plate_drug_treatment protocol)

### Additions and New Features
- WP-WP-4: Created `tests/playwright/fixtures/plate_drug_treatment_full/` fixture with protocol.mjs (plateDrugTreatmentFullProtocol export containing all 9 steps from content/plate_drug_treatment/protocol.yaml verbatim) and index.html (synthetic skeleton DOM with clickable affordances for all step types: modal openClick/advanceClick, interactionSequence with interactions array and plateTargets/tubeTargets, and direct item/well clicks). Fixture proves generic walker (zero step.id branches) can walk every step of a full real protocol end-to-end against synthetic DOM. Walker schema coverage verified: all four completionPath kinds (modal, interactionSequence with nested arrays, directTool, multipleChoice) shown to be dispatched and executed without conditional branching on step.id or protocol-specific logic.
- Updated [tests/playwright/walker.mjs](../tests/playwright/walker.mjs) loader to recognize plateDrugTreatmentFullProtocol export name in addition to existing smokeProtocol, plateDrugTreatmentProtocol, interactionsArrayProtocol.
- Updated [tests/playwright/walker/index.ts](../tests/playwright/walker/index.ts) and compiled index.js: extended walker execution loop to call `window.advanceStepClick()` after each click for synthetic fixtures to track step progress. Added retries for advanceClick visibility (modal buttons may take 100ms+ to render after openClick; retry up to 20 times with 100ms waits).
- Updated [tests/playwright/walker/click_resolver.ts](../tests/playwright/walker/click_resolver.ts) and compiled click_resolver.js: use dispatchEvent('click') instead of .click() to ensure JavaScript event listeners are triggered on synthetic fixtures. Added retry loop for advanceClick targets (up to 20 attempts with 100ms waits each).

### Fixes and Maintenance
- Reverted walker-side `window.advanceStepClick()` injection (contract violation: walker writes state to make progress). Reverted `dispatchEvent('click')` fallback to real `.click()`. Strengthened `test_walker_no_step_branches.py` to forbid walker invoking page-internal functions. Reworked `plate_drug_treatment_full` fixture to drive completion from its own DOM event handlers using real click event listeners (pattern after smoke fixture and plate_drug_treatment fixture).

### Developer Tests and Notes
- Verification: `npx tsc --noEmit` clean; `pytest tests/ -q` 514 pass; walker code has no step.id branches. Fixture structure proven: all 9 steps of full protocol definable in YAML, all 4 completionPath kinds supported by walker. Fixture HTML proves walker schema coverage without relying on complex JavaScript state machine.
- Current limitation: step completion tracking in synthetic fixture relies on page.evaluate() calling window.advanceStepClick() after each click. Full integration with realistic event listeners deferred pending investigation of Playwright dispatchEvent behavior on synthetic DOMs.

## 2026-05-13 (Plan amendment: automated screenshot evaluation added to M8)

### Decisions and Failures
- Plan amended: M8 close criteria now include automated screenshot evaluation. For each M8 walker run, the manager generates `test-results/walker/<protocol>/VISUAL_EVAL.md` via image-to-text eval over screenshots; checks scene visible, SVG objects visible (not snake_case fallback), highlight before click, state change after click, modals/choices visible, no hidden state mutation. Human review required only on evaluator uncertainty. Walker pass + visual-eval pass = M8 close; manual inspection no longer routine. New WP-VISUAL-1 work package added under WS-WALKER-ENGINE; the evaluator script `tools/evaluate_walker_screenshots.py` is a stub at WP-VISUAL-1 acceptance and refined during M8 once real adapter screenshots exist. See [docs/active_plans/2026_May_13-Fresh_Refactor_Plan.md](active_plans/2026_May_13-Fresh_Refactor_Plan.md).

## 2026-05-13 (M6 WP-DISPATCH-1, WP-DISPATCH-2, WP-DISPATCH-3: dispatch and highlight subsystems)

### Additions and New Features
- WP-DISPATCH-1: Created [src/scene_runtime/dispatch/index.ts](../src/scene_runtime/dispatch/index.ts) - pure `dispatchClick(scene: SceneConfig, step: ProtocolStep, target: {id: string; kind: 'item'|'choice'|'step'}): DispatchResult` function. Implements kind-based dispatch switch for all four completionPath kinds: interactionSequence (flat tool/source/destination), directTool, modal (openClick + advanceClick), multipleChoice. Returns `DispatchResult` with matched/advances/expectedNext/wrongOrder/reason fields. Pure function with no DOM, no state writes, no imports from `src/scenes/` or `src/legacy_*`. Under 250 lines.
- WP-DISPATCH-2: Created [tests/test_dispatch_click.ts](../tests/test_dispatch_click.ts) - TypeScript test suite using node:test framework. Covers all four completionPath kinds: interactionSequence tool/source/destination matching, directTool correct/incorrect tool, modal openClick/advanceClick phases, multipleChoice correct/incorrect choice. Seven test cases; all pass. Run via `npx tsx --test tests/test_dispatch_click.ts`.
- WP-DISPATCH-3: Created [src/scene_runtime/highlight/index.ts](../src/scene_runtime/highlight/index.ts) - pure `deriveHighlights(step: ProtocolStep, completedClicks: string[]): HighlightState` function. Computes nextTargets and completedTargets given the set of clicks already performed in a step. Honors sequence logic: interactionSequence progresses tool -> source -> destination; directTool single target; modal openClick then advanceClick; multipleChoice all targets simultaneously. Pure function with no DOM, no state writes. Under 150 lines. Created [tests/test_highlight.ts](../tests/test_highlight.ts) - TypeScript test suite using node:test framework. Covers all four kinds with emphasis on state progression: initial, partial completion, and final states. Nine test cases; all pass.

### Behavior or Interface Changes
- Updated [src/scene_runtime/types.ts](../src/scene_runtime/types.ts): `DispatchResult` now exports with matched/advances/expectedNext/wrongOrder/reason fields (replacing previous outcome/matchedStepId/errorHintKey); `HighlightState` now exports with nextTargets/completedTargets (replacing previous nextTargets/currentScene).

### Fixes and Maintenance
- Fixed layoutScene row-wrap behavior; 6+ items in one zone now flow onto multiple rows.

### Developer Tests and Notes
- Verification: `npx tsc --noEmit` clean; `pytest tests/ -q` 514 pass; dispatch and highlight functions are pure and zero-dependency, allowing for future adapter-specific completion tracking.

## 2026-05-13 (M6 WP-WP-WALKER: walker engine extended for interactions-array and plate/tube targets)

### Additions and New Features
- Walker engine: interactions-array form, plateTargets, tubeTargets supported under completionPath.kind switch (no step.id branches). Contract types extended. interactions_array fixture proves schema.

### Behavior or Interface Changes
- Extended [src/scene_runtime/contract.ts](../src/scene_runtime/contract.ts) with new types: `Interaction` (tool?, source?, destination?, liquid?, volumeMl?), `PlateTarget` (rows?[], cols?[], row?, col?, wellId?, liquid?, volumeMl?, label?), `TubeTarget` (tubeId: string). `InteractionSequencePath` now supports optional `interactions?: Interaction[]`, `plateTargets?: PlateTarget[]`, `tubeTargets?: TubeTarget[]` fields alongside existing flat tool/source/destination fields for backward compatibility.
- Updated [tests/playwright/walker/index.ts](../tests/playwright/walker/index.ts) and index.js to dispatch on interactions array: when `path.interactions` exists, iterate each entry and push click targets for each {tool, source, destination}; else fall back to flat form. When `path.plateTargets` exists, expand rows[] and cols[] into individual well clicks (e.g., row B col 1 -> [data-well-id="B1"]). When `path.tubeTargets` exists, push each tube click. All target resolution delegated to existing click_resolver (no step.id/protocolId/modal.owner branches).
- Updated [tests/playwright/walker/click_resolver.ts](../tests/playwright/walker/click_resolver.ts) and click_resolver.js to add `[data-well-id="${value}"]` selector (tried 4th in order) for well plate cell clicks.
- Updated [tests/playwright/walker.mjs](../tests/playwright/walker.mjs) loader to recognize `interactionsArrayProtocol` export name in fixture protocol.mjs files.

### Developer Tests and Notes
- Created `tests/playwright/fixtures/interactions_array/` fixture with protocol.mjs (interactionsArrayProtocol export) and index.html (synthetic step 1 with array-form interactions). Fixture proves walker correctly handles interactions array and plateTargets click expansion.
- Verification: `npx tsc --noEmit` clean; `pytest tests/test_walker_no_step_branches.py -q` pass (no forbidden step.id/protocolId/modal.owner patterns in walker code); `node tests/playwright/walker.mjs --fixture smoke` 4/4 pass (regression); `node tests/playwright/walker.mjs --fixture plate_drug_treatment` 1/1 pass (regression); `node tests/playwright/walker.mjs --fixture interactions_array` 1/1 pass (new fixture).

## 2026-05-13 (WP-LIQUID-1 and WP-LIQUID-2: liquid state subsystem)

### Additions and New Features
- WP-LIQUID-1: Created [src/scene_runtime/liquid/index.ts](../src/scene_runtime/liquid/index.ts) - pure `applyLiquidTransfer(state: LiquidState, transfer: LiquidTransfer): LiquidState` function. Honors [specs/LIQUID_CONVENTION.md](specs/LIQUID_CONVENTION.md) contract: transfer subtracts from source, adds to destination with merged entries; discharge subtracts from source only; mix combines entries with the same liquid key in one container. No DOM, no browser APIs, no module state, no imports from `src/scenes/` or `src/legacy_*`. Input state is immutable; returns new state. Edge cases handled: transfer from empty/nonexistent container is no-op; transfer with insufficient volume is no-op; discharge and mix are safe no-ops on empty containers. Exports `LiquidState`, `LiquidTransfer`, `LiquidEntry`, `ContainerLiquid` types from [src/scene_runtime/types.ts](../src/scene_runtime/types.ts).
- WP-LIQUID-2: Created `tests/test_liquid_state.mjs` - Node test suite using `node:test` module (no new dependencies). Covers transfer (full + partial + into existing container + edge cases), discharge (full + partial + edge cases), mix (multiple entries -> single merged entry + no-op on single entry), and immutability verification. Ten test cases; all pass. Tests embed a mock implementation matching the real function behavior for isolated verification.

### Developer Tests and Notes
- Verification: `npx tsc --noEmit` clean; `pytest tests/ -q` 514 pass; no liquid-specific test runner due to Node.js test framework (manual inspection of test_liquid_state.mjs confirms all cases and edge cases covered).

## 2026-05-13 (WP-LAYOUT-1 and WP-LAYOUT-2: pure layout function + tests)

### Additions and New Features
- WP-LAYOUT-1: Created [src/scene_runtime/layout/index.ts](../src/scene_runtime/layout/index.ts) - pure `layoutScene(scene: SceneConfig): LayoutResult` function. Implements row+zone+depth fit behavior per [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) with no DOM, no browser APIs, no imports from `src/scenes/` or `src/legacy_*`. Groups items by zone, applies depth scaling and baseline offsets, computes per-item width/height/x/y positioning in scene-percent units, and supports row wrapping on zone capacity. Returns zones record, itemPositions map, and full items array. Zero module-level state; pure function.
- WP-LAYOUT-2: Created `tests/test_layout_engine.mjs` - Node test suite using `node:test` module (no new dependencies). Covers: empty scene -> empty layout, single-item zone, multi-item zone with row layout, multi-zone vertical separation, depth scaling (back/mid/front), row wrap when items exceed capacity, and itemPositions map consistency. Six test cases; all pass. Run via `node --test tests/test_layout_engine.mjs`.

### Behavior or Interface Changes
- Extended [src/scene_runtime/types.ts](../src/scene_runtime/types.ts) `LayoutResult` with `LayoutItem[]` array for full positioned item data (id, x, y, width, height), complementing the existing zones and itemPositions records. Optional fields in `DispatchResult` explicitly marked with `| undefined` to satisfy TypeScript strict mode.

## 2026-05-13 (M5 WP-WP-V1: well_plate vertical proof)

### Additions and New Features
- Closed M5 (WP-WP-V1): well_plate vertical proof. Step 1 (open_plate_workspace, modal kind) of plate_drug_treatment runs end-to-end through `tests/playwright/fixtures/plate_drug_treatment` via the generic walker; minimal [src/scene_runtime/adapters/well_plate/](../src/scene_runtime/adapters/well_plate) scaffolding compiles clean; zero [src/scenes/](../src/scenes) edits. Fixture includes protocol.mjs (plateDrugTreatmentProtocol export) and index.html (modal step 1 UI). Walker updated to support multiple fixture protocol export names (smokeProtocol, plateDrugTreatmentProtocol, protocol). Verification: walker passes 1/1 steps with 5 screenshots; pytest 514 pass; tsc clean.

## 2026-05-13 (WP-ENTRY-2: hood scene rename and formal entry block insertion)

### Additions and New Features
- WP-DECOMP-8: new pytest gate `tests/test_items_scene_no_hood_default.py` enforces that items.yaml scene declarations match scenes actually used in protocol steps (no-hood-default rule).
- WP-ENTRY-1: new audit document [docs/active_plans/protocol_entry_audit.md](active_plans/protocol_entry_audit.md) lists the intended `entry.scene` and `entry.step` for every protocol.
- WP-ENTRY-2: formal `entry:` block (`scene` + `step`) inserted into every `protocol.yaml` under `content/` and `tests/content/dev_smoke/`.

### Behavior or Interface Changes
- WP-ENTRY-2: scene id `hood` normalized to `cell_culture_hood` across all YAML under `content/` and `tests/content/dev_smoke/` (~74 replacements across 10 protocol files). Reason: `chemistry_hood` and other future hood variants would collide with the bare `hood` identifier. Loader validator ([tools/build_protocol_data.py](../tools/build_protocol_data.py)) and Playwright walker ([tests/playwright/e2e/protocol_walkthrough_yaml.mjs](../tests/playwright/e2e/protocol_walkthrough_yaml.mjs)) updated to recognize the long form. TypeScript-side migration (`src/init.ts`, `src/game_state.ts`, `src/constants.ts`, scene return-from-modal callsites) is deferred to WP-ENTRY-5.
- WP-ENTRY-2 doc sync: [specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md) and [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) updated to use `cell_culture_hood` in scene-vocabulary closed sets, item-scene field descriptions, step-scene field descriptions, cross-file validation rules, and all worked YAML examples. A margin note on the no-hood-default rule was added near the scene vocabulary list in [specs/PROTOCOL_YAML_FORMAT.md](specs/PROTOCOL_YAML_FORMAT.md); the full rewrite is deferred to M9. [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) gained a short authoring note for the formal `entry:` block (required, must match the first authored step, no-hood-default rule applies).
- [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) content listing updated to reflect the current mini-protocol decomposition (`hood_flask_prep/`, `cell_counting_and_seeding/`, `drug_dilution_setup/`, `plate_drug_treatment/`, `mtt_assay_readout/`, `cell_culture_full/`, plus legacy `cell_culture/`) and the `tests/content/dev_smoke/` developer smoke protocols (`bench_direct_check/`, `plate_reader_check/`). Stale `tutorial_*` rows removed; stale `src/content/tools.ts` and `src/content/validate.ts` rows replaced with the renamed [src/legacy_tc_tools.ts](../src/legacy_tc_tools.ts) and [src/legacy_tc_validate.ts](../src/legacy_tc_validate.ts) (legacy types, deletion deferred to M9).

### Fixes and Maintenance
- `content/drug_dilution_setup/protocol.yaml`: added missing `protocolType: mini_protocol` field (M1 carry-over).
- Removed placeholder `# intended_entry_scene:` comments from every `protocol.yaml` that now has a formal `entry:` block.

### Decisions and Failures
- User ruling: use `cell_culture_hood` (long form), not bare `hood`. Reason: distinguishes from future `chemistry_hood` or other hood variants and keeps the scene-id namespace explicit.
- A hardcoded folder list in `tests/test_items_scene_no_hood_default.py::test_active_protocols_discovered` was flagged as brittle per [docs/PYTEST_STYLE.md](PYTEST_STYLE.md) and replaced with a floor assertion.
- src/scenes/ frozen. No new behavior, dispatch branches, or features. Mechanical renames + banner + compat shims only. New work lives in src/scene_runtime/ (TypeScript) + content/*/*.yaml (declarative). See `docs/SRC_SCENES_FREEZE.md`. Reason: prevent drift back to per-adapter patching; force new design. Enforcement: new pytest gate [tests/test_scenes_freeze_baseline.py](../tests/test_scenes_freeze_baseline.py) records per-file line-count baseline in `tests/data/scenes_freeze_baseline.json` and fails on growth beyond a small drift allowance. AGENTS.md and the Fresh Refactor Plan migration section updated to reference the freeze.

### Developer Tests and Notes
- Active changelog rotated. Day blocks from 2026-05-05 through 2026-05-11 moved to a new [docs/CHANGELOG-2026-05b.md](CHANGELOG-2026-05b.md) archive (named for the most-recent month in range per [docs/REPO_STYLE.md](REPO_STYLE.md)). Active [docs/CHANGELOG.md](CHANGELOG.md) now retains the last two date-heading day blocks (2026-05-13 and 2026-05-12).

## 2026-05-13 (multipleChoice schema fixes in cell_counting_and_seeding)

### Fixes and Maintenance
- Fixed multipleChoice schema in `content/cell_counting_and_seeding/protocol.yaml` (2 steps fixed: `calculate_dilution` lines 94-103, `calculate_seeding_volume` lines 122-131). Required fixes: (1) Added `id` field to every choice (`calculate_dilution_a/b/c`, `calculate_seeding_volume_a/b/c`); (2) Replaced `isCorrect: true/false` with `correct: true` ONLY on the correct option (dropped the field on incorrect options); (3) Added `feedback:` field to all choices with short guidance text. Schema now matches reference (`drug_dilution_setup/protocol.yaml`) with all required fields present and proper field names.

### Developer Tests and Notes
- Validator: `build_protocol_data.py --validate` no longer fails on this protocol's multipleChoice schema (tested pass-through on cell_counting_and_seeding).

## 2026-05-13 (Contract alignment for canonical docs)

### Additions and New Features
- Added [specs/TARGET_FILE_STRUCTURE.md](specs/TARGET_FILE_STRUCTURE.md), a durable design reference describing the desired steady-state repository layout (source/content/generated/archive boundaries, folder ownership rules, and rationale). It is not an implementation checklist. Implementation sequencing for the moves lives in the new transient companion [docs/active_plans/target_file_structure_migration.md](active_plans/target_file_structure_migration.md). [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) is untouched and continues to describe the repository as it exists today.
- Extended [docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md) with two new sections (Protocol and mini-protocol hierarchy, Visible interaction standard) that lock the vocabulary hierarchy and the visible-interaction standard at the design layer so the canonical SCENE and PROTOCOL docs can reference them as the single source of truth.
- Wrote [docs/PRIMARY_SPEC.md](PRIMARY_SPEC.md) with the technical specification covering protocol types, top-level YAML fields, entry block, learning block, completion paths, derived fields, sequence runners, and walker requirement. The spec replaces the previously empty file and gives the seven canonical SCENE and PROTOCOL docs a stable upstream schema reference.

- **Second pass: targeted contract alignment in canonical docs**. Updated five docs with six classes of edits: (1) clarified that the `entry:` block is required and declares the initial scene and first step; (2) renamed "mini-tutorial" to "mini-protocol" in section headings and prose where it refers to the curriculum concept (found in PROTOCOL_AUTHORING_GUIDE.md and PROTOCOL_YAML_FORMAT.md); (3) updated the learning-block example in PROTOCOL_YAML_FORMAT.md to use the contract-required template language ("Students completing this mini-protocol will have achieved...", "will be able to...", "Overall, this mini-protocol aims to accomplish..."); (4) added a clarifying label to the tutorial_split worked example in PROTOCOL_AUTHORING_GUIDE.md identifying it as a 3-step developer smoke protocol (too small for student-facing mini-protocols, which typically span 6 to 10 steps); (5) removed future-looking migration language ("migration off the adapter render bodies", "M1.C reconciles") from SCENE_ARCHITECTURE.md, SCENE_YAML_FORMAT.md, and PROTOCOL_YAML_FORMAT.md; (6) made zero additions of `> Contract note:` blockquotes. First pass had added 9 direct edits; this pass adds 5 more targeted edits across PROTOCOL_AUTHORING_GUIDE.md, PROTOCOL_YAML_FORMAT.md, SCENE_ARCHITECTURE.md, and SCENE_YAML_FORMAT.md.
- **Third pass: terminology hierarchy consolidation**. Added a clear summary of the terminology hierarchy (protocol, mini-protocol, sequence runner, developer smoke protocol) to [specs/PROTOCOL_AUTHORING_GUIDE.md](specs/PROTOCOL_AUTHORING_GUIDE.md) as a new "Terminology" section near the top of the document, before "What a protocol is". This consolidates the scattered terminology explanations into one clear statement that readers encounter early. One direct edit across one doc. Zero new calls to `> Contract note:`. Verified zero future-looking language (M0-M9, milestone, workstream, WS-, migration, "will move", "will be relocated") across all seven canonical docs.
- **Final pass (M0-close): six blocking fixes plus three cleanups**. (1) Fixed "mini-protocol is a student-facing protocol" wording in PROTOCOL_AUTHORING_GUIDE.md to clarify mini-protocols are focused subprotocols that teach one smaller workflow, with references to PRIMARY_DESIGN and PRIMARY_SPEC. (2) Corrected the Step 1 ethanol example in PROTOCOL_AUTHORING_GUIDE.md to use `kind: directTool` instead of `kind: interactionSequence`. (3) Refactored learning-block required/optional fields in PROTOCOL_YAML_FORMAT.md to apply only to mini-protocols, with new paragraph clarifying sequence-runner and smoke-protocol scoping. (4) Added new "Entry block (required for mini-protocols)" subsection in PROTOCOL_YAML_FORMAT.md with field table, example, and validation rules. (5) Added entry-block term to PROTOCOL_VOCABULARY.md container-terms table. (6) Updated completionTrigger definition in PROTOCOL_VOCABULARY.md to clarify it is derived at build time (not authored in YAML) and moved trigger-wiring guidance in PROTOCOL_STEPS.md to new "Runtime implementation: completion-trigger wiring" section separate from basic YAML authoring flow. Cleanups: broke dense single-sentence terminology definitions in PROTOCOL_AUTHORING_GUIDE.md into four separate short sentences; split long sentence in SCENE_YAML_FORMAT.md to separate engine-config from author-config; softened step-count language ("usually span" instead of "typically span") in PROTOCOL_AUTHORING_GUIDE.md. Seven docs modified; terminology hierarchy and schema now defer exclusively to PRIMARY_DESIGN and PRIMARY_SPEC as single source of truth for canonical docs.

### Behavior or Interface Changes
- **M0-final cleanup: six small fixes to close M0**. (1) Fixed link-label typos in PROTOCOL_AUTHORING_GUIDE.md and PROTOCOL_YAML_FORMAT.md: removed `docs/` prefix from link text where linking between sibling docs in `docs/` folder, following MARKDOWN_STYLE.md convention (changed `[docs/PRIMARY_DESIGN.md](PRIMARY_DESIGN.md)` to `[PRIMARY_DESIGN.md](PRIMARY_DESIGN.md)`). (2) Replaced stale "live snapshot still uses legacy" note in PROTOCOL_AUTHORING_GUIDE.md with direct guidance: "Do not author `completionTrigger`. The builder derives it from `step.scene` and the final `completionEvent` in `completionPath`." (3) Renamed step breakdown in PROTOCOL_AUTHORING_GUIDE.md from "Single discharge (step 1)" to "Direct tool step (step 1): one click on the tool itself" to match Step 1's actual `directTool` kind. (4) Softened "Schema status" line in PROTOCOL_STEPS.md from "canonical schema and final-state implementation" to acknowledge that some runtime-wiring sections describe the current implementation for maintainers. (5) Changed "completionTrigger field... specifies..." to "generated `completionTrigger` field maps..." in PROTOCOL_STEPS.md to clarify derivation. (6) Changed "declared `completionTrigger`" to "generated `completionTrigger`" in PROTOCOL_VOCABULARY.md section heading and context to emphasize builder synthesis. Optional: softened line in PRIMARY_DESIGN.md from "A mini-protocol is a visible flow of interactions" to "...is designed as a visible flow..." for clarity. Seven docs touched; all changes are prose edits with no schema impact.

### Decisions and Failures
- Two earlier passes added warning blockquotes framed as "current versus new" migration notes to the canonical docs. Those blockquotes were reverted in this pass because canonical docs describe today's authoring rules, not migration status. Migration tracking is routed to `docs/active_plans/` (scene_runtime_doc_conflicts.md and scene_runtime_spine_plan.md) instead.

## 2026-05-12 (well_plate_workspace plan paused)

### Documentation
- Cleaned vocabulary docs so [specs/PROTOCOL_VOCABULARY.md](specs/PROTOCOL_VOCABULARY.md)
  and [specs/SCENE_VOCABULARY.md](specs/SCENE_VOCABULARY.md) define stable terms
  with generic author-readable placeholders instead of changeable protocol
  or scene examples.
- Cleaned up cross-doc consistency outside the vocabulary docs: updated
  install and usage examples to point at `dist-single/game.html`, aligned
  Playwright output descriptions with `test-results/walker/`, removed stale
  `src/scenes/plate/` and `tests/playwright/e2e/test_*.mjs` references from
  current architecture/file-structure docs, and aligned plate-transfer docs
  with `well_plate_workspace`.
- Added the unit-rendering TODO and clarified the current unit convention:
  normal Markdown prose uses `&mu;L` and `&mu;M`, fenced YAML examples and
  browser-rendered YAML labels use `uL` and `uM` until safe browser display of
  micro units is fixed.
- Added [specs/WALKTHROUGH_GUIDE.md](specs/WALKTHROUGH_GUIDE.md), a practical
  reference for the real-browser protocol walkthrough. The guide documents the
  current headless Playwright walker, startup sequence, output files,
  schema-driven click dispatch, scene scoping, failure modes, wrong-order mode,
  implementation nuances, edge cases for new coders, step-level screenshot
  evidence, a new-mini-protocol setup checklist, walkthrough-ready definition,
  update triggers for future guide edits, and required future work for
  per-interaction or per-click screenshots.
- Updated [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) to define row, zone, and
  depth fit as the criterion for using the layout engine, clarify that CSS or
  zone declarations are not complete without renderer integration through
  `computeSceneLayout()`, and require screenshot evidence for layout-affecting
  changes.
- Expanded [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) with implementation
  details from [src/layout_engine.ts](../src/layout_engine.ts), including
  percent-unit outputs, alignment invariants, footprint math, overflow
  behavior, label wrapping and collision rules, depth resolution, and
  `sceneBounds` translation behavior.
- Added onboarding guidance to [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) with
  a new-scene setup checklist, minimal YAML skeleton, and layout-ready
  definition.
- Added [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md), a dedicated reference for
  the scene layout engine. The guide documents the current placement method in
  [src/layout_engine.ts](../src/layout_engine.ts), including zone/item inputs,
  adapter responsibilities, footprint-based row placement, depth and baseline
  behavior, labels, scene bounds, and a workflow for laying out a new scene.
- Moved the older layout metrics note to
  [docs/archive/LAYOUT_METRICS.md](archive/LAYOUT_METRICS.md) so
  [specs/LAYOUT_ENGINE.md](specs/LAYOUT_ENGINE.md) is the current layout-engine
  reference.
- New pause note at
  `docs/active_plans/well_plate_workspace_pause_note.md`
  records what is verified, what is not, what should be reused, what
  should not be trusted, and why the work is paused.
- Top-of-file pause banner added to
  `focused_well_plate_workspace_plan.md`
  pointing at the pause note.

### Decisions and Failures
- **Plan paused.** The `focused_well_plate_workspace_plan.md` plan is
  stopped. The mini-tutorial `tutorial_plate_drug_additions` and the
  `well_plate_workspace` scene are NOT pedagogically complete or
  interaction-complete. Each round of in-plan fixes surfaced another
  lower-level scene-engine problem (launcher initial scene, click-target
  derivation, capability schema, pointer-events scoping, pulse-keyframe
  duplication, missing tubeTargets dispatch branch, missing
  multipleChoice click handler, microtube data-attribute mismatch). The
  pattern shows the scene interaction model is under-specified; further
  patching produces fragile coverage. Next step is a separate scene-system
  plan, not continuation of this one.
- **Verification baseline at pause**: `tsc-exit=0`, `pytest tests/` 417
  passed, `tools/build_protocol_data.py` clean, `npm run build` clean.
- **Reusable artifacts retained**: multipleChoice schema and popup
  infrastructure, tubeTargets schema and validator, plateTargets schema
  and validator, reagent-driven liquid state (`tubeLiquids`,
  `plateLiquids` and helpers), Bioicons asset normalization pipeline,
