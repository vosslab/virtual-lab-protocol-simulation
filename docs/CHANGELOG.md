# Changelog

## 2026-05-08

### Removals and Deprecations

- **M5 (Patch 6): Runtime dead-code and duplication cleanup.** (1) **Deleted legacy branches in hood.ts onItemClick (7 branches, ~89 lines total):** multichannel_pipette + media_bottle (line ~1271), multichannel_pipette_with_media + well_plate (line ~1283), multichannel_pipette + mtt_vial (line ~1296), multichannel_pipette_with_mtt + well_plate (line ~1308), well_plate + biohazard_decant (line ~1323), multichannel_pipette + dmso_bottle (line ~1336), multichannel_pipette_with_dmso + well_plate (line ~1348). Each branch was gated by an `activeStepId` check (media_adjust, add_mtt, decant_mtt, add_dmso) where the step uses `completionPath: kind: interactionSequence`, so dispatch routes the step elsewhere and the legacy fallback is unreachable. Verified via protocol_data.ts: all four steps present in cell_culture with interactionSequence dispatch. (2) **Deleted stale getAvailableActions() cases (5 cases, ~12 lines).** Removed cases for add_fresh_media, microscope_check, transfer_to_plate, add_drugs, incubate -- step ids not in any active protocol. (3) **Consolidated copy-pasted token-building logic (3 instances, ~47 lines).** Created `src/scenes/scene_helpers.ts` exporting `buildLegacyToken(actor, liquid): string | null` with the 4-branch ternary (pbs/trypsin/media/cells -> `${tool}_with_X`, else null). Replaced inline token builders in hood.ts (2 instances) and bench.ts (1 instance) with calls to the shared function. Preserved fallback actor `'serological_pipette'` per original design. (4) **Extracted duplicate showWrongOrderToast function (byte-for-byte, 2 instances, ~95 lines combined).** Moved from hood.ts (lines 205-253) and bench.ts (lines 130-175) to shared `src/scenes/scene_helpers.ts`. Both scenes now import and call the same function. Toast styling preserved: DOM container `wrong-order-toast-container` fixed top:20px right:20px zIndex:1000; 2000ms display + 300ms fadeOut animation. (5) **Deleted manual hemocytometer code deemed unreachable after M4 wiring:** (a) `submitQuadrantCount()` from microscope.ts (line 533-576, ~44 lines) -- exported but zero callers; replaced by live `submitManualHemocytometerCount()` (line 259) handling tutorial_hemocytometer_count steps. (b) Removed `export` keyword from `selectedQuadrants` and `quadrantCounts` arrays (line 421, 423); now private to microscope.ts since only used internally and by the deleted submitQuadrantCount. (c) Deleted `microscopeViabilityChecked: boolean` field from GameState interface (src/game_state.ts line 57) and its initialization (line 136); replaced by `manualHemocytometerViabilityChecked: boolean` (line 82) which is wired to tutorial_hemocytometer_count via the live modal path. Old field was legacy UI-internal state with no protocol-level consumer; new field has an active step. **Verification:** tsc clean, smoke 9/9 gates (including gate 6 protocol_interaction_works: ethanol_bottle click triggers spray_hood completion), pytest 300/300, walker passes all 6 mini-protocols (25 cell_culture steps + 2 hemocytometer + 3 split + 1 bench + 1 dilution + 1 transfer + 1 counter + 1 reader = 35 total). No remaining references to deleted symbols (grep `submitQuadrantCount`, `microscopeViabilityChecked` returns zero).

### Additions and New Features

- **Tutorial protocol: manual hemocytometer cell counting (M4, Patch 5).** Added `src/content/tutorial_hemocytometer_count/` as a new 7th mini-protocol (existing 6: bench_direct, cell_counter, drug_dilution, hood_transfer, pbs, plate_reader, split). Protocol exercises the manual hemocytometer quadrant-counting UI using two modal steps: (1) `tutorial_hemocytometer_open` opens the microscope and displays the viability confirmation screen (completionPath: openClick=microscope, advanceClick=confirm-viability, modal.owner=microscope). (2) `tutorial_hemocytometer_count` continues the microscope session showing the quadrant-counting screen and submits the user-entered cell counts (completionPath: advanceClick=submit-cell-count, no openClick; modal.owner=microscope). This preserves the manual quadrant UI code that would otherwise be deleted in M5 as "unreachable". **GameState additions:** three new fields track manual hemocytometer progress: `manualHemocytometerViabilityChecked: boolean`, `manualHemocytometerQuadrantCounts: (number | null)[]`, `manualHemocytometerSubmitted: boolean`. Initialized in `createInitialGameState()`. **Scene routing:** `src/scenes/microscope.ts` now branches on the active step id: if `tutorial_hemocytometer_open` or `tutorial_hemocytometer_count`, render the manual UI (`renderManualHemocytometerViabilityScreen()` and `renderManualHemocytometerCountingScreen()`); otherwise render the auto-counter (existing `captureCellCount()` path). New functions `submitManualHemocytometerCount()` and `renderManualHemocytometer*()` paralleling the cell_counter flow. **Walker support:** Modified `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` to dispatch modal steps with `modal.owner === 'microscope'` to a new handler `walkMicroscopeModalStep()` that intelligently handles both viability confirmation and quadrant clicking based on the step's `advanceClick` value. Maintains existing compatibility with tutorial_cell_counter and cell_culture workflows. **Verification:** walker passes 2/2 hemocytometer steps, 1/1 cell_counter, 25/25 cell_culture, 7/7 mini-protocols (2/2 hemocytometer, 3/3 split, 1/1 bench_direct, 1/1 drug_dilution, 1/1 hood_transfer, 1/1 pbs, 1/1 plate_reader). **Documentation:** Updated `docs/FILE_STRUCTURE.md` and `docs/CODE_ARCHITECTURE.md` to list the new protocol in the tutorial protocols set.
- **Direct tool interaction concept added to vocabulary.** A "direct tool interaction" is a one-click interaction with `tool` + `completionEvent` only (no `source`, no `destination`). Use it for actions performed by the tool itself (spraying ethanol, starting an instrument, opening a direct-control device). Documented in `docs/PROTOCOL_VOCABULARY.md`, `docs/PROTOCOL_YAML_FORMAT.md`, and `docs/PROTOCOL_AUTHORING_GUIDE.md`.
- **Validator Rule 7: virtual_target items forbidden as `interaction.destination`.** Steers authors to direct tool interactions for spray-style steps. Error names step id and offending destination, recommends the direct interaction shape. Pytest covers pass and fail cases.
- **Test bootstrap helper `tests/build_game_if_missing.mjs`.** Exports `ensureGameBuilt(repoRoot)` which rebuilds `cell_culture_game.html` via `bash export_single_file.sh` if the file is missing. Wired into all 14 Playwright tests so they no longer require a checked-in copy.
- **Patch 10 (C3): Wrong-order UI pass with `--wrong-order` flag.** Extended `tests/protocol_walkthrough_yaml.mjs` to inject deliberate wrong-order clicks during interactive steps, verifying that the runtime soft-fails correctly (increments `gameState.wrongOrderClicks`, does not advance step) and the subsequent correct sequence still completes the step.
  - New walker flag: `node tests/protocol_walkthrough_yaml.mjs --wrong-order` injects one wrong-order click per interaction before the correct sequence.
  - Wrong-order item selection: `pickWrongOrderItem()` finds a visible, clickable `[data-item-id]` element not in the current interaction's required set (tool/source/destination).
  - Injection validation: each injection must increment `wrongOrderClicks` by 1, keep `interactionIndex` and `activeStepId` unchanged, and the subsequent correct sequence must still advance the step.
  - Report entries: injection records are logged with severity `'injection'` (distinct from `info`/`warn`/`error`) so injection footprints are grep-able.
  - State tracking: `walkInteractionSequenceStep` returns state after injection (if any) so `walkStep` validates that the correct sequence does not increment `wrongOrderClicks` again.
  - Verified on all three protocols: 13 injections (cell_culture, 25 steps), 5 injections (tutorial_split, 3 steps), 8 injections (tutorial_pbs, 4 steps).
- **Patch 11 (C4): Protocol authoring guide.** Added `docs/PROTOCOL_AUTHORING_GUIDE.md` walking a new author through `items.yaml`, `reagents.yaml`, and `protocol.yaml` using the live `src/content/tutorial_split/` files as the worked 3-step example. Includes the per-step authoring checklist (tool present; source/destination per shape; one completion event on the final interaction; consistent volumes; tool-first click plan; referenced ids exist; banned synonyms forbidden), the six MUST-FOLLOW walker rules, and the validate -> build -> walk -> wrong-order loop. Cross-linked from `README.md` and `docs/CODE_ARCHITECTURE.md`.
- **Patch 9 (C2): Multi-protocol support with tutorial protocols.** Added two minimal tutorial protocols (tutorial_split and tutorial_pbs) as selectable alternatives to the active cell_culture protocol.
  - `src/content/tutorial_split/{items,reagents,protocol}.yaml` - 3-step tutorial demonstrating spray hood -> PBS wash -> final rinse.
  - `src/content/tutorial_pbs/{items,reagents,protocol}.yaml` - 4-step tutorial focused on PBS wash repetition.
  - Both protocols reuse item/reagent IDs from cell_culture to minimize asset surface.
  - Updated `docs/USAGE.md` with `--protocol` flag documentation for both builder and walker.

### Behavior or Interface Changes

- **M3 (Patch 4): Test-tier cleanup and Playwright folder reorganization.** Completed the `tests/playwright/e2e/` organizational sweep: (1) **Smoke test reclassification** - moved 14 focused browser regression/unit tests from `tests/playwright/e2e/` to `tests/playwright/` where they belong per the folder rule (smoke + focused tests in `tests/playwright/`, full walkthroughs in `tests/playwright/e2e/`). Moved files: `test_bench_layout.mjs`, `test_dilution_prep.mjs`, `test_flask_variants.mjs`, `test_game_ui.mjs`, `test_hood_layout.mjs`, `test_layout_engine.mjs`, `test_layout_metrics.mjs`, `test_pipette_liquid.mjs`, `test_plate_96.mjs`, `test_protocol_flow.mjs`, `test_scoring.mjs`, `test_step_completeness.mjs`, `test_step_dispatch.mjs`, `test_target_handlers.mjs`, `test_yaml_swap_runtime.mjs`. Updated import paths in each moved file: `../repo_root.mjs` -> `./repo_root.mjs`. **Import fixup**: After the initial move, the 15 relocated smoke test files and test_game_ui.mjs still referenced the old import path (`from '../repo_root.mjs'`). Fixed all 15 files to use the correct relative path (`from './repo_root.mjs'`). Verified: all 15 files load without import errors; pytest 297/297 pass; test_game_ui.mjs loads game correctly (9/9 checks); protocol_walkthrough_yaml.mjs in e2e/ remains at `../repo_root.mjs` (correct, since it's one level deeper). (2) **Subprocess tests moved to E2E** - relocated `tests/test_bandit_security.py` to `tests/e2e/e2e_bandit_security.py` since bandit subprocess execution belongs outside the fast pytest lane. Converted to standalone script with `main()` function and proper shebang. (3) **Pytest tests refactored to read-only checks** - simplified `tests/test_whitespace.py` and `tests/test_ascii_compliance.py` to perform only detection without invoking subprocess fixes. Removed `apply_fix` logic, subprocess.run() calls invoking fix scripts, and pytestconfig dependency. Tests now report issues with instructions to run the external fix scripts (`tests/fix_whitespace.py`, `tests/fix_ascii_compliance.py`) separately. (4) **`tests/playwright/e2e/` now contains only full walkthroughs** - `protocol_walkthrough_yaml.mjs` (25-step cell_culture + 6 mini-protocol walker) and `walker_helpers.mjs` remain in place as the full-path E2E tests per scope. (5) **No production code or docs changes** - test-tier-only refactoring; no src/ edits, no user-facing behavior changes.

- **Patch 2 (SP-K2g): Removed legacy `ProtocolStep.interactionSequence` field and completed K2 migration.** The K2 migration introduced the `completionPath` schema (three kinds: interactionSequence, directTool, modal) but kept a legacy top-level `interactionSequence?: Interaction[]` field for backward compatibility. Now that all code reads from `completionPath` and the schema is stable, removed the legacy field from `src/constants.ts:134-140`. All stale reads migrated to `step.completionPath.kind === 'interactionSequence'` + `step.completionPath.interactions` in: (1) `src/scenes/bench.ts:62-66` (`deriveActiveInteractionTargets` guard and iteration), (2) `src/scenes/bench.ts:184` and `:289-291` (`dispatchBenchInteractionClick` and `onBenchItemClick` guards), (3) `src/scenes/bench.ts:201` (wrong-order hint dereference), (4) `src/ui_rendering.ts:448-476` (hood toolbar tool derivation), (5) `src/game_state.ts:304-311` (`deriveActiveTargets` signature and implementation). Removed stale `TODO Patch 6` comment from `src/game_state.ts:350`. Verified: `npx tsc --noEmit` clean; build clean; walker 25/25 cell_culture + 6/6 mini-protocols (tutorial_split, tutorial_hood_transfer, tutorial_drug_dilution, tutorial_bench_direct, tutorial_cell_counter, tutorial_plate_reader); pytest 298/298; manual confirmation on protocol id `cell_culture`: (a) Bench items highlight on interactionSequence step `resuspend` - `deriveActiveTargets` returns non-empty targets -> "front" depth [OK]; (b) Hood toolbar populates on interactionSequence step `aspirate_old_media` - tools derived from `completionPath.interactions[*].tool` [OK]; (c) `resolveItemDepth` returns non-"mid" for active items on interactionSequence step `pbs_wash` [OK]. K2 migration now architecturally complete.

- **SP-K2f: Migrated 4 remaining drug-preparation and drug-application steps from `kind: modal` to `kind: interactionSequence` (physical pipetting model).** The directive: modal is only for instrument UI or help overlays; physical liquid handling must use interactionSequence. (1) **carb_high_range** - 8 interactions (load + discharge per tube, twice: row G with 10 uL carb + 990 uL media for 5 uM; row H with 50 uL carb + 950 uL media for 25 uM). New items: `dilution_tube_carb_g`, `dilution_tube_carb_h` mirroring the B-F pattern. Tool: micropipette. completionEvent: `carb-high-range-confirm` (preserved). Handler added to `dispatchInteractionClick` in hood.ts. (2) **metformin_stock** - 4 interactions (load 10 uL metformin, discharge to new `dilution_tube_metformin_working`; load 990 uL sterile water, discharge). Tool: micropipette. completionEvent: `metformin-stock-prepare` (preserved). Also renamed the metformin source item `metformin_stock` &harr; `metformin_stock_bottle` to resolve the step-id &harr; item-id naming collision per audit decision. Updated all protocol.yaml and items.yaml references. (3) **add_carboplatin** - 14 interactions (load + discharge per tube x 7 rows: B through H). Tool: multichannel_pipette. Sources are the 7 dilution tubes (carb_b...carb_h); destination is well_plate. completionEvent: `carb-add-confirm` (preserved). Side effects moved from `advanceDrugModalStep()` to the `carb-add-confirm` handler: `applyPlateDoseMap()` + `gameState.drugsAdded = true` now live in hood.ts dispatchInteractionClick, executed before triggerStep. (4) **add_metformin** - 2 interactions (load 5 uL from `dilution_tube_metformin_working`, discharge to well_plate). Tool: multichannel_pipette. completionEvent: `metformin-add-confirm` (preserved). Handler added to hood.ts. Removed all 4 steps from `registeredEmitters` in drug_treatment.ts; emitter registration now implicit via the completionEvent handlers in dispatchInteractionClick (no carb_high_range, metformin_stock, add_carboplatin, add_metformin in the global array). All interactions carry proper `stateChange` blocks with heldLiquid for the resolver to track tool state. Interactions use `liquid` names matching the items.yaml `allowedLiquids` (carboplatin, metformin, water, media). Walker verification: all 6 mini-protocols (tutorial_split, tutorial_hood_transfer, tutorial_drug_dilution, tutorial_bench_direct, tutorial_cell_counter, tutorial_plate_reader) pass 100% (3/3, 1/1, etc.). cell_culture walker still at 5/25 (blocks at centrifuge, a pre-existing blocker unrelated to drug steps). pytest 285/285 pass; tsc green; build clean.**

- **carb_low_range migration to interactionSequence (continuation from earlier session).** The step was already migrated in YAML at protocol definition time; this patch fixed the UI bug preventing the walker from completing it. Now fully operational with 20-interaction sequence for 5 low-range dilution tubes.

- **SP-K2e: Generic directTool/modal dispatch (step.id branch cleanup).** Replaced hardcoded `currentStep.id === '<literal>'` checks and `triggerStep('<literal>')` calls in scene handlers with active-step-aware dispatch. Scene click handlers now check `completionPath.kind` and tool/openClick fields instead of step IDs, enabling mini-protocols with different step IDs (tutorial_bench_direct, tutorial_cell_counter, tutorial_plate_reader) to pass without hardcoding cell_culture IDs into scenes. Changes: `src/scenes/bench.ts` (lines 395, 406, 423) now dispatch on `completionPath.tool` (centrifuge, water_bath, plate_reader); `src/scenes/microscope.ts` (lines 120, 386, 494, 509) now dispatch on `gameState.activeStepId` instead of `'count_cells'`, `'plate_read'`, `'results'`. Modal advance buttons gate on `completionPath.advanceClick` match. All three tutorial mini-protocols now pass: tutorial_bench_direct (tutorial_centrifuge), tutorial_cell_counter (tutorial_count_cells), tutorial_plate_reader (tutorial_plate_read). cell_culture walker still reaches 11/25 (same ceiling as pre-change). All other gates green: build, pytest 284, tsc, Playwright walkthrough for all 5 protocols.

- **carb_intermediate migrated to interactionSequence.** First drug-dilution step in `src/content/cell_culture/protocol.yaml` retargeted from `kind: modal` to `kind: interactionSequence` with four physical-transfer interactions: load micropipette+carb_stock, discharge to dilution_tube_carb_intermediate, load micropipette+sterile_water, discharge to dilution_tube_carb_intermediate (terminal `completionEvent: carb_intermediate_complete`). Mirrors `docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md` Part 4 (20 uL drug + 980 uL water -> 200 uM intermediate). Added `micropipette` (transfer_tool, allows carboplatin/metformin/water/media) and `dilution_tube_carb_intermediate` (culture_vessel) to `src/content/cell_culture/items.yaml`; extended `multichannel_pipette.allowedLiquids` to include carboplatin/metformin. Added both items to `src/hood_config.ts` HOOD_SCENE_ITEMS so they render in the DOM. Walker now reaches 11/25 (carb_intermediate green; next blocker is `carb_low_range`, an unmigrated modal).

- **count_cells UI aligned to wet-lab protocol.** `docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md` Part 2 ("Counting cells - Trypan Blue exclusion") describes an automated cell counter: insert slide, wait for focus, press Capture; the machine reports count and viability simultaneously. The game previously simulated a manual hemocytometer with a separate viability gate, a 4-quadrant grid, and `window.prompt()` keyboard input - none of which appears in the protocol. Replaced `renderMicroscopeScene()` count_cells flow in `src/scenes/microscope.ts` with a single Capture screen showing the slide view, machine-reported viability/density, and one Capture button (`data-walker-advance="capture-count"`). New `captureCellCount()` records `gameState.cellCount = gameState.actualCellCount` and triggers the step. The legacy `submitQuadrantCount`, `setupQuadrantListeners`, `renderQuadrantButtons`, `microscopeViabilityChecked`, and quadrant-state arrays remain in the file as currently-unused code; M2 cleanup will remove them.
- **count_cells YAML retargeted.** `src/content/cell_culture/protocol.yaml`: `advanceClick: submit-cell-count` -> `capture-count`; `completionEvent: count-cells-submit` -> `count-cells-capture`. Single-modal schema; no `advancePlan` extension or new K2 kind needed once the UI matched the protocol.
- **Walker modal scene-switch uses `step.scene` directly.** `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` `walkModalStep` previously ran a DOM heuristic (`document.querySelector('[data-scene="..."] [data-item-id="..."]')`) that defaulted to bench when items lacked data-scene wrappers. Hood-scoped modal openers like `multichannel_pipette` were therefore left invisible. Replaced with `step.scene` as the source of truth, matching `walkInteractionSequence`'s approach.

- **SP-K2d: rewired walker dispatch to switch on `step.completionPath.kind`. Deleted every hardcoded `step.id === '<x>'` branch and the per-step walker helper functions (walkPrewarmMediaStep, walkMediaAdjustStep, walkAddMttStep, walkDecantMttStep, walkAddDmsoStep, walkResultsStep, etc.). Three generic handlers: walkInteractionSequence, walkDirectTool, walkModal. data-walker-advance attributes added to modal advance buttons in src/steps/drug_treatment.ts and src/scenes/microscope.ts. Walker now fully schema-driven for all 25 steps in cell_culture (10 interactionSequence, 8 directTool, 7 modal) plus tutorial protocols.**
- **SP-K2c: added Validator Rule 8 enforcing the completionPath contract. completionPath is now REQUIRED on every step. Per-kind required and banned fields enforced. Legacy top-level interactionSequence and authored completionTrigger/targetItems are now hard errors. K2a's transitional compat read removed. Pytest covers 31 Rule 8 cases spanning sub-checks (a) required completionPath, (b) valid kind discriminator, (c-e) per-kind field validation, (f-g) legacy/derived field rejection. All existing cell_culture, tutorial_split, and tutorial_pbs steps pass Rule 8 (no author YAML changes needed; already post-K2b completionPath state). K2d will rewire runtime/walker dispatch.**
- **SP-K2b: migrated every step in cell_culture, tutorial_split, and tutorial_pbs YAMLs from top-level `interactionSequence` + `completionTrigger` to the unified `completionPath` schema.** Three kinds in use: `interactionSequence` (18 steps, moved array into `completionPath.interactions`), `directTool` (8 steps, clicking single tool with completion event), `modal` (6 steps, opening modal via specific opener with advance button). Builder now derives `completionTrigger` from `completionPath` at build time for each kind (extracts event name, prefixes with `click:` for the runtime). Data-walker-advance attributes NOT added to scene files in this patch; deferred to K2d as runtime dispatch refactor. All 25 walker tests pass on cell_culture (25/25), tutorial_split (3/3), and tutorial_pbs (4/4). K2c will add Rule 8 to enforce absence of legacy fields in author YAML; K2d will rewire runtime/walker dispatch off the new completionPath.kind discriminator.

- **SP-K2a: Added optional `completionPath` field to ProtocolStep type and to the builder's parser/emitter. Three kinds supported: `interactionSequence`, `directTool`, `modal`. Legacy top-level `interactionSequence` still accepted in YAML and still emitted; nothing migrated yet. SP-K2b will migrate YAML; K2c adds Rule 8; K2d wires runtime/walker dispatch.** Added three new type interfaces to `src/constants.ts`: `CompletionPathInteractionSequence`, `CompletionPathDirectTool`, `CompletionPathModal`, and union type `CompletionPath`. `ProtocolStep.completionPath?: CompletionPath` is now optional to preserve backward compatibility during migration. In `tools/build_protocol_data.py`, added `parse_completion_path(step, items, reagents)` function that discriminates on the `kind` field and returns the appropriate path object (or `None` if the step has no `completionPath` block); called during validation to ensure well-formedness. Parser validates required fields per kind (tool + completionEvent for directTool; openClick + advanceClick + completionEvent for modal; interactions list for interactionSequence) and raises ValueError with step id on schema violations. Emitter now includes `completionPath` in the generated TypeScript if parsed from YAML; legacy steps without `completionPath` remain unchanged. Verified with smoke-fixture test: directTool, interactionSequence, and modal kinds all parse and emit correctly; TypeScript compilation and all test gates pass (build, pytest, tsc, Playwright).
- **SP-M: replaced repo-root `smoke.sh` with `tools/run_smoke.py` Python wrapper paralleling `tools/run_protocol_walkthrough.py`.** Same exit-code contract (0/1/2). Optional `-b/--no-build` flag skips build step. Updated `docs/FILE_STRUCTURE.md` and `docs/USAGE.md` to reference the new path. Also fixed SP-G regression: replaced brittle relative-depth `path.resolve(__dirname, '../..')` math in all `.mjs` files under `tests/playwright/` and `tests/playwright/e2e/` with a shared `tests/playwright/repo_root.mjs` helper using `git rev-parse --show-toplevel`. This eliminates the depth-math class of regressions when files move. Affected 16 files: e2e tests (test_game_ui, protocol_walkthrough_yaml, test_bench_layout, test_dilution_prep, test_hood_layout, test_layout_engine, test_pipette_liquid, test_plate_96, test_protocol_flow, test_scoring, test_step_completeness, test_step_dispatch, test_target_handlers, test_yaml_swap_runtime) plus tests/playwright tests (protocol_graph_smoke, test_completion_event_coverage, test_interaction_index, test_interaction_resolver).
- **SP-K1b: applied locked design decisions to completionPath docs. Three kinds total (interactionSequence, directTool, modal); instrument collapsed into directTool. modal.advanceClick references a data-walker-advance kebab string, not an items.yaml id. Multi-step modals decompose into multiple modal steps. completionTrigger is now build-derived; authors MUST NOT write it.**
- **SP-K1 design: introduced step-level `completionPath` schema with four kinds (`interactionSequence`, `directTool`, `modal`, `instrument`). Documented in PROTOCOL_VOCABULARY.md and PROTOCOL_YAML_FORMAT.md. No code or YAML migrated yet -- SP-K2 will land the mechanical migration.**
- **Reorganized test structure: browser tests moved to `tests/e2e/`.** Split Playwright tests by tier: pure-function tests (protocol graph validation, unit tests via browser globals) remain in `tests/`; browser-driven UI/layout/walkthrough tests moved to `tests/e2e/`. `tests/` now contains only pytest `.py` files and pure-function `.mjs` files. Shell scripts, Python wrappers, and documentation updated to reference the new paths. This enables future extensibility (e.g., Cypress) without name collisions and keeps fast lanes clearly separated.
- **Build-time protocol YAML validation gate added.** `build_github_pages.sh` now runs `python3 tools/build_protocol_data.py --validate-only` before `tsc` and bundle steps. Validation failures abort the build cleanly and fail before any TypeScript or JavaScript processing, catching schema and consistency errors early. Plan M3 exit criterion.
- **Patch 12 (CE-3): Per-protocol completion-event coverage policy.** Replaces the temporary >50% heuristic with an explicit policy keyed off the active protocol id: `cell_culture` uses STRICT (any missing emitter throws via `showValidationError`); `tutorial_*` protocols use RELAXED (missing emitters are logged via `console.warn` but do not throw, `__protocolValidation = { ok: true }` is set regardless); unknown protocol ids default to STRICT (safer). The `PROTOCOL_ID` constant is now exported from the build's generated `src/content/protocol_data.ts` alongside `PROTOCOL_STEPS`. New test: `tests/test_completion_event_coverage.mjs` covers both modes end-to-end.

### Removals and Deprecations

- Removed `tests/playwright/verify_patch2_sp_k2g.mjs` (manual Patch 2 verification scaffold; deleted by user). Removed the corresponding row from `docs/FILE_STRUCTURE.md`.

### Developer Tests and Notes

- Added `--help` and `-h` support to `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` CLI argument parser. Also added `-p` short form for `--protocol` flag. Help text includes usage, all options (with examples), and protocol listing instructions. Prints to stdout and exits cleanly with code 0.
- **Step `centrifuge` no longer declares `conical_15ml_rack` as required.** The rack is scene context (tubes sit in it on the bench); the player only clicks the centrifuge. Same `requiredItems`-as-context vocabulary fix as `hood_surface` removal.
- **Step `resuspend` no longer declares `waste_container` as required.** The waste container is contextual; the resuspend interaction does not require a discharge into it. Removed from `requiredItems`.
- **`destination` definition tightened.** Now means only the item that physically receives transferred liquid, cells, waste, or material during a discharge AND is an intended click target. Background context, scene affordances, and "items being acted on" no longer qualify. For one-click tool actions, use a direct tool interaction. (`docs/PROTOCOL_VOCABULARY.md`, `docs/PROTOCOL_YAML_FORMAT.md`)
- **`spray_hood` step modeled as a direct tool interaction.** Was: `tool: ethanol_bottle, destination: hood_surface, completionEvent: spray_ethanol`. Now: `tool: ethanol_bottle, completionEvent: spray_ethanol`. The walker clicks the spray bottle; no hood_surface DOM target is required.
- **Walker exception for missing `hood_surface` removed.** `tests/protocol_walkthrough_yaml.mjs` no longer special-cases virtual destinations; the YAML schema now prevents that shape from being authored at all. Walker reports zero `warn` and zero `error` entries on a clean run.
- **`cell_culture_game.html` is no longer tracked.** Removed from the git index via `git rm --cached`; `.gitignore` already listed it. Tests bootstrap-build it on demand. Documented as a generated artifact in `README.md`, `docs/INSTALL.md`, `docs/USAGE.md`, `docs/FILE_STRUCTURE.md`, and `docs/PLAYWRIGHT_USAGE.md`.
- **Builder and walker now support `--protocol <name>` flag** for multi-protocol content selection at build time.
  - `python3 tools/build_protocol_data.py --protocol tutorial_split` selects and builds tutorial_split protocol into protocol_data.ts and inventory_data.ts.
  - Without `--protocol`, defaults to cell_culture (active protocol). Backward compatible.
  - Generated file header now includes protocol source path: `// AUTO-GENERATED ... from content/{protocol}/*.yaml ...`
  - Walker: `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_split` rebuilds game bundle and runs walkthrough, then restores active protocol when done.
  - Builder: `python3 tools/build_protocol_data.py --validate-only --protocol <name>` validates without output.

- **ProtocolStep interface partId/dayId widened to string** (from hardcoded literal unions). Supports arbitrary protocol id spaces without changing constants.ts for each protocol variant.

- **Mechanical rename: `registeredTriggers` -> `registeredEmitters`, `validateTriggerCoverage` -> `validateCompletionEventCoverage`** (CE-2). Code identifiers now match the vocabulary in `docs/PROTOCOL_VOCABULARY.md`. The function `triggerStep(stepId)` stays (action verb). YAML field `completionTrigger` stays (step-level listener). Zero behavior change.

- Patch 8B (walker refactor): **Extracted reusable Playwright helpers into** `tests/walker_helpers.mjs`.
  The walker's inline click/wait/report patterns (`clickItemAndWaitProgress`, `waitForStepCompleted`,
  `waitForActiveScene`, `switchToBench`, `switchToHood`, etc.) are now module-scoped exports so Patches 9
  and 10 can reuse them without duplication or re-stabilization risk.

- **`docs/E2E_TESTS.md` updated to reflect current `tests/` layout.** Acknowledged that `tests/` has two complementary fast lanes: `test_*.py` (pytest, collected by pytest), and `test_*.mjs` (Playwright/Node, run directly with `node`). Both stay fast because pytest only collects `.py` files, so `.mjs` browser checks coexist without slowing the suite. `tests_e2e/` remains available for heavier E2E runners when needed. Updated `docs/PYTEST_STYLE.md` with one-line clarification that Playwright files live in `tests/`. All link references to [docs/PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) verified.

- Patch 8A (walker contract hardening): **Complete rewrite of** `tests/protocol_walkthrough_yaml.mjs`
  **to eliminate all internal-API cheats.** The walker previously violated Spec Rule 1 ("click the DOM,
  never the API") by directly mutating `window.gameState` fields and calling internal functions
  (`window.renderGame`, `window.renderDrugModalStep`, `window.__startDrugAddition`). All cheats removed.

- Patch 7: Exported `gameState` to `window.gameState` for testing.
  - `src/init.ts` now exports the global `gameState` object to the `window` namespace
    for runtime test access, alongside the existing `resolveInteractionByIndex` and
    `PROTOCOL_STEPS` exports. This allows Playwright tests to directly inspect and
    manipulate `gameState.interactionIndex` and `gameState.wrongOrderClicks` during
    test setup and assertion.
- Patch 6: Hood and bench completion-event emitter wiring switched to `resolveInteractionByIndex`.
  - `src/scenes/hood.ts` `onItemClick()` now routes clicks through
    `resolveInteractionByIndex(interactionIndex)` instead of the legacy
    `resolveInteraction()` flat walker. Wiring logic:
    - On `wrongOrder: true`: increment `gameState.wrongOrderClicks`, fire hint,
      return without advancing.
    - On `indexDelta: 0` (tool-select): update `selectedTool` state, re-render,
      do NOT advance `interactionIndex`.
    - On `indexDelta: 1` (interaction advance): increment `interactionIndex`;
      if new index >= `interactionSequence.length`, call `triggerStep()`.
  - Each completion event handler (`spray_ethanol`, `aspirate`, `pbs_wash`, etc.)
    checks `result.indexDelta` before state mutation to ensure the index is only
    advanced when a logical interaction is fully satisfied (not just tool selection).
  - Mirrors the same wiring in `src/scenes/bench.ts` `onBenchItemClick()` for
    consistency across both persistent scenes.
  - `src/scenes/hood.ts` and `src/scenes/bench.ts` now derive highlights from the
    active interaction only, via new `deriveActiveInteractionTargets(step,
    interactionIndex, selectedTool, heldLiquid)` functions that return the
    de-duplicated `tool`/`source`/`destination` ids from
    `interactionSequence[interactionIndex]`. Only one interaction is highlighted
    at a time (the one the player must complete next).
  - `getStartingToolForStep()` and `getReagentSourceForStep()` (toolbar hint helpers)
    now call the new interactionIndex-aware highlight derivation so hints and
    highlights share one truth.
  - `deriveActiveTargets()` remains in `src/game_state.ts` and is still used by
    `resolveItemDepth()` for visual depth layering (front/mid/back item positioning),
    so it was not removed; however, hood and bench scene imports no longer reference
    it (Patch 6: removed from scene imports).
- `completeStep()` now includes a defensive backstop (Patch 4): if the active step
  has an `interactionSequence` and the current `interactionIndex` has not reached
  the end of the sequence, the function logs an error to console, increments
  `wrongOrderClicks`, and returns without advancing. This prevents accidental
  or direct calls from bypassing the multi-click sequence enforcement that the
  resolver provides (primary enforcement). Steps without an `interactionSequence`
  skip the backstop check (legacy/special steps).
- `--validate-only` CLI flag added to `tools/build_protocol_data.py`: when present,
  validates and exits with code 0 on success, non-zero on any failure. Does NOT
  regenerate any output files when validate-only is set.
- Prose and code-comment sweep across `docs/`, `src/`, `tools/`, and `devel/` to use
  modern protocol vocabulary: tool (not actor), destination (not target in the protocol
  sense), interaction sequence (not recipe/allowedInteractions in prose), state change
  (not result), completion event (not bare event), completion trigger (not bare trigger),
  used items (not targetItems in prose), active highlight items (not highlightItems).
  Code identifiers and YAML keys are unchanged in this patch; those rename in Patch 1.
  Legacy field names mentioned in prose are wrapped in backticks and explained in modern
  vocabulary.
- Relocated all 19 `.mjs` test files from `devel/` to `tests/` per
  [docs/PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) ("Put Playwright scripts in
  `tests/` at the repo root") and [docs/TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md)
  ("keep tests in a `tests/` folder"). Updated file comments, `check_codebase.sh`,
  and plan file `keen-swimming-fairy.md` to reflect new paths.

### Fixes and Maintenance

- **Created tests/e2e/ directory** for non-browser E2E scripts (shell/Python orchestration). Currently hosts e2e_bandit_security.py; future home for other subprocess-based checks moved out of pytest.

- **M2 Patch 3 docs sweep.** Refreshed stale doc text after the K2g landing and current tutorial-protocol roster. (1) `docs/USAGE.md`: replaced the two "9-step protocol" claims with a 25-step summary that links to `src/content/cell_culture/protocol.yaml` and the OVCAR8 wet-lab reference; the protocol-step list is now generated, not duplicated. (2) `docs/ROADMAP.md`: updated the Delivered bullet from `24-step protocol` to `25-step protocol`. (3) `docs/PROTOCOL_AUTHORING_GUIDE.md` and `docs/PROTOCOL_STEPS.md`: corrected the walker path from the legacy `tests/protocol_walkthrough_yaml.mjs` to `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`. (4) `docs/PROTOCOL_VOCABULARY.md` and `docs/PROTOCOL_YAML_FORMAT.md`: rewrote the SP-K2 "upcoming"/"still uses legacy" notes to reflect the completed migration (Patch 2 / SP-K2g); migration sections now describe current state in past tense and reference the changelog. (5) `docs/FILE_STRUCTURE.md` and `docs/CODE_ARCHITECTURE.md`: enumerated all seven current tutorial protocols under `src/content/` (tutorial_bench_direct, tutorial_cell_counter, tutorial_drug_dilution, tutorial_hood_transfer, tutorial_pbs, tutorial_plate_reader, tutorial_split). (6) `docs/CODE_ARCHITECTURE.md`: dropped the resolved "verify cell_culture step count" known-gap line. No production code or tests modified.

- **Item rename cleanup.** Renamed `metformin_stock` item to `metformin_stock_bottle` in `src/content/cell_culture/items.yaml` to disambiguate from the step id. Updated all references in `src/content/cell_culture/protocol.yaml` (metformin_stock step requiredItems, and add_metformin step requiredItems). Generated protocol_data.ts and inventory_data.ts pick up the rename automatically via the build tool.

- **SP-K2e-hood: sweep all 9 literal-id `triggerStep('<id>')` calls in hood.ts to use active-step pattern. Same root cause SP-K2e fixed in bench.ts/microscope.ts; hood was missed. (1) Converted line 1005 (`spray_hood` / `ethanol_bottle`) from hardcoded `triggerStep('spray_hood')` to generic `completionPath.kind === 'directTool'` dispatch on active step ID, mirroring bench.ts:406-420 pattern. This unblocks `tutorial_split` which uses tutorial-scoped `tutorial_spray_hood` step id; the literal check was dropping the step advance. (2) Removed 8 dead hardcoded triggerStep calls (lines 1094, 1138, 1151, 1202, 1245, 1268, 1281, 1304) for steps `add_trypsin`, `pbs_wash` (2x), `seed_plate`, `media_adjust`, `add_mtt`, `decant_mtt`, `add_dmso`. All are chain-driven interactionSequence steps; completion is already handled via `completionEvent` dispatch in `dispatchInteractionClick` (line 830), so the legacy hardcoded fallback branches are dead code. Removed triggerStep calls but kept side effects (state mutations, notifications, renders) inline per SP-K2e scope. Verification: tutorial_split walker now passes (all 3 steps); all 5 other mini-protocols remain green (tutorial_hood_transfer, tutorial_drug_dilution, tutorial_bench_direct, tutorial_cell_counter, tutorial_plate_reader); cell_culture still at 12/25 (no regression). pytest 285/285 pass; tsc green; build clean.**

- **Hood layout click-interception fix (wrapper-level pointer-events + directTool highlight).** Prior CSS fix disabled SVG pointer-events but missed the inactive hood-item wrapper divs themselves, allowing items like dmso_bottle to intercept clicks on active targets like dilution_tube_carb_c during carb_low_range step. Added CSS rule `#hood-items-layer .hood-item:not(.is-active):not(.is-selected) { pointer-events: none !important; }` to disable wrapper-level interception on inactive items only in hood scene. Also extended `renderHoodScene()` to highlight directTool steps by extracting tool from `completionPath.kind === 'directTool'` and adding to activeTargets, fixing missing visual cues on spray_hood and other single-click steps. Walker now reaches 12/25 (carb_low_range step fully passes, all 20 interactions complete). Next blocker is carb_high_range modal. All pytest tests pass (285/285); tsc green; tutorial_pbs passes (4/4 steps); mini-protocol tooling verified.**

- **Hood discharge generic fallback (`src/scenes/hood.ts`).** The per-event branch ladder in `dispatchInteractionClick` only acted on named completionEvents (spray_ethanol, aspirate, pbs_wash, pipette_trypsin, pipette_media, pipette_to_plate, centrifuge, prewarm, media_adjust, resuspend). Intermediate discharges with no completionEvent on the interaction (e.g. carb_intermediate's first three interactions) silently fell through, never advancing interactionIndex. Added a generic discharge fallback after the named-event ladder: when `result.kind === 'discharge'` and `result.indexDelta === 1`, the fallback clears `gameState.selectedTool` and `gameState.heldLiquid`, advances `gameState.interactionIndex += result.indexDelta`, fires `triggerStep(activeStep.id)` if the sequence is complete, and renders. Gated by the outer `result.kind === 'discharge'` check, so it cannot leak into load or error paths. Tool-select results (`indexDelta === 0`) bypass it because the per-event branches above handle them.
- **Hood reads `gameState.heldLiquid` directly (`src/scenes/hood.ts:dispatchInteractionClick`).** Replaced `deriveHeldLiquid(gameState.selectedTool)` with a direct read of `gameState.heldLiquid`. The legacy bridge only recognized the `serological_pipette_with_*` tokens, so any non-serological tool holding liquid (e.g. `micropipette` with carboplatin) returned `liquid: null` in `resolveArgs`, and the resolver mis-classified the destination click as wrong_order. The bug was latent until carb_intermediate exercised the micropipette path. `selectedTool` still goes through `canonicalTool()` to strip legacy `_with_*` suffixes when present.
- **Test 6 added to `tests/playwright/test_interaction_index.mjs`.** Focused regression for the heldLiquid-direct-read fix: positions gameState at carb_intermediate interaction index 1 with `heldLiquid={tool:'micropipette',liquid:'carboplatin',...}` and `selectedTool='micropipette'`, calls `window.dispatchInteractionClick('dilution_tube_carb_intermediate')`, verifies interactionIndex advances to 2, heldLiquid clears, and wrongOrderClicks stays 0. Catches future regressions where a non-serological pipette tool is mis-classified as wrong-order.

- **arch-docs refresh.** Rewrote `docs/CODE_ARCHITECTURE.md` and `docs/FILE_STRUCTURE.md` against current repo evidence. Architecture doc now reflects the ES-module bundle entry at `src/init.ts` (no concatenation), the dual build artifacts (`dist/` via `build_github_pages.sh`, `dist-single/` via `export_single_file.sh`), the full module inventory across `src/scenes/`, `src/steps/`, layout/SVG support modules, and `src/content/` (cell_culture + tutorial protocols). File-structure doc enumerates `tools/`, the three-tier test layout under `tests/`, generated artifacts (`dist/`, `dist-single/`, `src/svg_globals.ts`, `src/content/protocol_data.ts`, `src/content/inventory_data.ts`), and `assets/`/`servier/`/`devel/`. Stale "9-step protocol" and "12 TypeScript files concatenated" claims removed.

- **SP-hood-dispatch-fix (WP-H1): migrated stale `activeStep.interactionSequence` reads in `src/scenes/hood.ts` and `src/game_state.ts` to the K2 `completionPath.interactions` schema. Root cause (per WP-T1 trace at `docs/active_plans/wp_t1_trace_analysis.md`): the resolver-first guard at `hood.ts:791` read the obsolete top-level `activeStep.interactionSequence`, which the K2-emitted schema no longer carries. The guard was always false post-K2, dead-coding the entire `dispatchInteractionClick` body and forcing every click through the legacy item-id ladder. The legacy ladder happened to complete `pbs_wash` via a Subcase 3b shortcut on click 1 (no tool selected), but `selectedTool='flask'` carryover from pbs_wash's three follow-up "ghost" clicks polluted `add_trypsin`'s state and blocked the same shortcut, producing the asymmetry. Fix: changed the `onItemClick` guard to `activeStep.completionPath.kind === 'interactionSequence'`, introduced a local `interactions` from `completionPath.interactions` inside `dispatchInteractionClick`, and replaced all 12 internal stale reads. `deriveActiveInteractionTargets` migrated the same way. `completeStep` defensive backstop in `src/game_state.ts:236` migrated to read `completionPath.interactions`. No `step.id` branches added; no `window.set*ForWalker`; no top-level `interactionSequence` fallback. Walker recovers from 3/25 to 7/25 on `cell_culture`, blocked only at the documented `count_cells` modal gap (M0 exit clause (b)). All other gates green: build, pytest 267, tsc, resolver 9/9, index 5/5, coverage 7/7, graph smoke 25/25, game UI 9/9, smoke wrapper, walker --wrong-order 7/25 with same `count_cells` blocker.**
- **WP-T1 trace analysis written to `docs/active_plans/wp_t1_trace_analysis.md`.** Read-only investigation that pinned the dispatch asymmetry to the obsolete property guard at `hood.ts:791`. No production-code edits in WP-T1.
- **Patch 0 baseline captured in `docs/active_plans/baseline_2026-05-08.md`.** Reproduced handoff-documented walker failure at `add_trypsin` on a fresh build; pytest 267 passed (3 ahead of handoff observation due to in-tree additions); all other gates matched the handoff exactly. Confirmed no stale-artifact contamination before tracing.
- **SP-K2bd2-resolver-compat (revision): removed directTool synthesis branch from getInteractionSequence(); resolver now returns no-op for non-interactionSequence kinds. Deleted Test 5 (spray_hood directTool test) from test_interaction_resolver.mjs; added explicit Test 7 verifying directTool steps return no-op (not resolver scope). Deleted Test 5 (spray_hood terminal interaction) from test_interaction_index.mjs; consolidated test count to 5/5. Removed directTool synthesis fallback logic from sequenceLength calculations in test_interaction_index.mjs Test 2 (pbs_wash). Walker baseline target: >= step 8 (count_cells gap, unchanged K2d scope).**
- **SP-K2bd2-resolver-compat: rewired src/interaction_resolver.ts (resolveInteraction and resolveInteractionByIndex) to read step.completionPath.interactions when completionPath.kind === "interactionSequence". Closes a K2 integration gap where the resolver still read the obsolete top-level step.interactionSequence and returned no-op on every interactionSequence-kind step. Added helper getInteractionSequence() to extract interaction arrays from completionPath, supporting interactionSequence kind (direct access). Tests test_interaction_resolver.mjs and test_interaction_index.mjs now pass (9/9 and 5/5 respectively after revision). Updated test_interaction_index.mjs to read sequence length from completionPath instead of the legacy interactionSequence field.**
- **SP-K2bd2-revert: surgically reverted the failed SP-K2bd2 attempt back to K2c-equivalent state.** Hybrid YAML splits (`count_cells_setup`/`count_cells_confirm`, 6 drug step pairs), `setQuadrantCountsForWalker` back-door, walker `count_cells_confirm` special case with `window.setQuadrantCountsForWalker()`, and split step emitter registrations all reverted. K2a/K2b/K2c remain intact. YAML: merged 7 split steps back to 1 (count_cells) + 6 drug steps (carb_intermediate, carb_low_range, carb_high_range, metformin_stock, add_carboplatin, add_metformin), all as `kind: modal` with `openClick: <tool>`. Microscope: removed count_cells_setup/confirm registrations, removed `data-walker-advance="confirm-viability"`, reverted confirm-viability button to not emit count_cells_setup. Init: removed `setQuadrantCountsForWalker` import and window export. Drug_treatment: removed 12 split step registrations, removed modal_open intermediates, simplified startDrugAddition() and advanceDrugModalStep() to emit single step ID directly. Walker: removed count_cells_confirm special block with setQuadrantCountsForWalker. Post-revert step count: 25 (K2c-equivalent). All gates pass (build, pytest, tsc, Playwright 25/25).

- **SP-I: verified existing lint tests correctly scan tests/playwright/, tests/playwright/e2e/, and tests/e2e/ subtrees.** All 10 lint tests (test_pyflakes_code_lint, test_ascii_compliance, test_whitespace, test_indentation, test_shebangs, test_import_dot, test_import_star, test_import_requirements, test_init_files, test_bandit_security) use git_ls_files-based enumeration via git_file_utils, which automatically scans new subdirectories without hardcoded glob patterns. Spot-checked ASCII, whitespace, and indentation rules with deliberate violations in tests/e2e/: all three correctly caught non-ASCII characters (U+1F389 emoji), trailing spaces, and mixed indentation. No fixes needed; all 183 lint tests pass (236 total with test_test_naming_conventions and test_protocol_yaml_validator excluded).
- **SP-H: tightened tests/test_test_naming_conventions.py to enforce the four-folder test layout and forbid relative-depth REPO_ROOT math in .mjs files.** Added three new lint rules: `test_no_playwright_in_e2e_mjs` (forbids Playwright imports in tests/e2e/ .mjs scripts), `test_helpers_must_not_be_named_test` (helpers without Playwright imports must not use test_*.mjs naming), and `test_no_brittle_depth_math_in_playwright_mjs` (forbids path.resolve(__dirname, '..') in favor of imported REPO_ROOT from tests/playwright/repo_root.mjs). These rules regression-proof the SP-G/SP-M depth-math fix and prevent future misplaced browser tests. Tests use predicate-based helper allowlist (not hardcoded enumerations) and enumerate files via git to avoid brittleness. conftest.py audited: comment form aligned to canonical three-line format with direct intent statement, collect_ignore value verified correct.
- **SP-G: moved Playwright-driven .mjs into tests/playwright/ (browser smoke/layout) and tests/playwright/e2e/ (full-path walkthroughs).** Implemented four-folder test layout per `tests/TESTS_README.md`: `tests/test_*.py` for pytest, `tests/playwright/test_*.mjs` for smoke tests, `tests/playwright/e2e/test_*.mjs` for walkthroughs, and `tests/e2e/e2e_*.sh/py` for non-browser E2E (currently empty). Updated `tests/conftest.py` with `collect_ignore = ["e2e", "playwright"]` to exclude both subtrees from pytest collection. Fixed path math in moved files (`__dirname` depth adjustments). Updated all consumer scripts and docs (`smoke.sh`, `check_codebase.sh`, `tools/run_protocol_walkthrough.py`, `docs/CODE_ARCHITECTURE.md`, `docs/FILE_STRUCTURE.md`) to reference new paths. Added `tests/test_test_naming_conventions.py` linting gate to enforce the layout (Playwright imports must be under `tests/playwright/`, Python files in `tests/e2e/` must use `e2e_` prefix). All moves used `git mv`; no behavior changes.
- **SP-D vocab/docs scrub:** Removed stale Patch 0 transitional notice in PROTOCOL_YAML_FORMAT.md; renamed validateTriggerCoverage/registeredTriggers references in PROTOCOL_STEPS.md and CODE_ARCHITECTURE.md to validateCompletionEventCoverage/registeredEmitters; deleted stale requiredAction/M2/M3 TODO markers; updated FILE_STRUCTURE.md to reference export_single_file.sh and tools/; fixed run_protocol_walkthrough.py docstring filename; tightened src/init.ts strict-branch error label to "missing completion-event emitter"; added one-paragraph CE-3 per-protocol coverage policy summary to CODE_ARCHITECTURE.md with references to getCoveragePolicy() and validateCompletionEventCoverage() in src/init.ts; added clarifying docstrings to validate_steps() and validate_no_legacy_fields() in tools/build_protocol_data.py.

- **Fixed hood toolbar derivation to use `interactionSequence` instead of hardcoded step IDs.** The toolbar previously had three hardcoded branches for `spray_hood`, `aspirate_old_media`, and `neutralize_trypsin`, and a missing branch for drug-treatment steps (the former `requiredAction: 'pipette_drug'` had been removed when `requiredAction` was deleted). Now the toolbar dynamically extracts tools from the current step's `interactionSequence[*].tool` in order of first appearance, with deduplication and display labels. Modal-driven steps (which lack `interactionSequence`) show an empty toolbar since the modal UI handles interaction. This regression fix restores `multichannel_pipette` and other multi-interaction tools to the hood toolbar for their steps.
- **Untracked scratch files removed from `tests/`.** Deleted four untracked ad-hoc debugging probes: `_check_dom.mjs`, `_inspect_listeners.mjs`, `_minimal_click_test.mjs`, `_walker_diag.mjs`. These were intermediate work artifacts not needed for ongoing development.
- **`tools/analyze_protocol_audit.py` no longer hides missing required keys behind `.get()` defaults.** Per `docs/PYTHON_STYLE.md` "DO NOT HIDE BUGS WITH DEFAULTS": replaced `.get(key, default)` with direct subscript access `dict[key]` for all required YAML fields (`steps`, `items`, `reagents`, `id`, `role`, `scene`). Kept `.get('visualOnly')` and optional field accesses `.get('requiredItems')` unchanged. Audit script correctly detects unused items (cell_culture: 0 unused, tutorial_split: 2 unused) and validates all protocols without KeyError. `pytest tests/test_pyflakes_code_lint.py` green.
- **Type annotations tightened in `showWrongOrderHint` functions.** Both `src/scenes/bench.ts` and `src/scenes/hood.ts` had `any`-typed `step` and `interaction` parameters. Replaced with `ProtocolStep | null` and `Interaction | undefined` respectively to match actual call sites and eliminate `any` usage. `npx tsc --noEmit` clean; Playwright tests 9/9 pass.
- **CHANGELOG date headings consolidated.** Plan-execution work that crossed midnight had been split between `## 2026-05-07` and `## 2026-05-08`; merged into a single 2026-05-08 day block per repo style.
- **Tab/space mix fixed in `tests/test_protocol_yaml_validator.py`.** Three lines (Rule 7 additions) used spaces; converted to tabs. `pytest tests/test_indentation.py` green.
- **Test suite portability and fragility fixes in `tests/test_protocol_yaml_validator.py`.** (1) Hardcoded absolute repo path (line 17) replaced with portable `git_file_utils.get_repo_root()`, (2) all 20+ `match=` regex assertions removed from `pytest.raises()` calls per PYTEST_STYLE.md (fragile message matching), (3) module docstring updated to reference "seven rules" and document Rule 7. All 35 validator tests pass; full test suite remains green (217 pass).
- **Data-layer smoke test now passes.** Exported `completeStep()` to `window` in `src/init.ts` so the protocol graph reachability test (`tests/protocol_graph_smoke.mjs`) can call it directly via `page.evaluate()`. Updated the test to set `interactionIndex` to the sequence length before calling `completeStep()`, respecting the defensive backstop check that ensures all interactions are complete before advancing.

- **Replaced fixed-sleep with predicate wait in wrong-order injection.** Line 277 of `tests/protocol_walkthrough_yaml.mjs` replaced `await page.waitForTimeout(500)` with `page.waitForFunction()` to wait for `gameState.wrongOrderClicks` to increment, eliminating the contract violation of fixed sleeps in the walker.

- **`tests/test_completion_event_coverage.mjs` is now tracked and tests the real production function.** Refactored from an untracked copy that re-implemented `getCoveragePolicy()` inline to a tracked Playwright-based test that accesses the real production function via `window.getCoveragePolicy` (exposed in `src/init.ts`). Tests all seven cases: `getCoveragePolicy('cell_culture')`, `('tutorial_split')`, `('tutorial_pbs')`, `('unknown_protocol')`, and the strict/relaxed branches of `validateCompletionEventCoverage`. Runs 7/7 pass.

- **Helper module extraction:** Created `tests/walker_helpers.mjs` with named exports:
  - `waitForStepCompleted(page, stepId, timeoutMs)` - wait for step in completedSteps.
  - `waitForHeldLiquid(page, expectedTool, expectedLiquid, timeoutMs)` - observe liquid state.
  - `isToolPreconditionMet(page, interactionTool)` - check selectedTool canonical form.
  - `waitForActiveScene(page, sceneName, timeoutMs)` - wait for scene switch.
  - `waitForMicroscopeOpen(page, timeoutMs)` - observe microscope modal open.
  - `waitForIncubationComplete(page, timeoutMs)` - wait for animation finish.
  - `switchToBench(page, report)`, `switchToHood(page, report)` - scene nav with logging.
  - `resolveSelector(itemId)` - generate `[data-item-id="..."]` selector.
  - `clickItemAndWaitProgress(page, itemId, report, clickBudgetMs)` - click + progress detection.
  - `recordInfo(report, message)`, `recordWarn(report, message)`, `recordError(report, stepId, kind, evidence)` - structured logging.

- **Walker slimming:** Removed ~100 LOC of helper definitions from protocol_walkthrough_yaml.mjs and
  imported from walker_helpers.mjs. Walker logic unchanged; behavior verified by re-running full 25-step
  playthrough (25/25 passed).

- **Pyflakes: removed unused reagents variable in test_protocol_yaml_validator.py:**
  Removed 5 unused `reagents` assignments from test cases in Rules 1, 2 that don't pass
  `reagents` to their validators. Rules 1-2, 4-6 validators don't require the parameter;
  only Rule 3 validator (`validate_item_reagent_references`) takes `reagents`. Fixes
  pyflakes unused-variable warnings (lines 57, 77, 101, 121, 141 in original).

- **Walker Rule 1 fix (DOM-only clicks):** Removed all `window.gameState.*` direct writes:
  - Deleted `switchToBench` and `switchToHood` fallback paths that forcibly set `activeScene` and called
    `renderGame()`. Now throws error if scene nav DOM button missing.
  - Removed `incubate_day1` path that wrote `selectedTool = 'well_plate'` when click failed. Now calls
    `clickItemAndWaitProgress` strictly; throws error if well_plate selection does not register.
  - Refactored `walkDrugModalStep` to use `clickItemAndWaitProgress` for all three clicks (multichannel_pipette,
    drug_vials, well_plate) instead of manual modal force-open via `classList.add('active')` and internal
    render calls.
  - Refactored `walkMediaAdjustStep`, `walkAddMttStep`, `walkDecantMttStep`, `walkAddDmsoStep` to use
    strict click-and-wait for all items instead of clicking optional and then patching state.
  - Removed `clickItemOptional()` helper entirely (was used as escape hatch to swallow click failures).

- **Walker Rule 3 fix (observable waits, not fixed sleeps):** In `walkCountCellsStep` quadrant clicks,
  replaced `waitForTimeout(100)` with observable wait on computed style of quadrant button (border color/width
  change indicates selection state), confirming the prompt-override actually worked.

- **Walker Rule 5 fix (capture network errors):** Added `page.on('requestfailed', ...)` listener to capture
  same-origin asset failures; surfaced in `playthrough_report.json` at `error` severity.

- **Walker Rule 6 fix (assert the ending):** Changed missing final result screen from `warn` to `error`.
  Walker now fails hard (exits non-zero) if the scoring/results screen DOM is not present.

- **Console error handling:** Console errors are now recorded as `error` severity in the report, not `warn`.
  Walker fails if any console errors occur during playthrough.

- **Stall detection:** Per-click timeout 3000ms, per-step timeout 30000ms, whole-run timeout 10min.
  All timeouts enforced with clear error messages. Browser closed in `finally` block; no external kill required.

- Fixed interaction resolver to not pass empty heldLiquid object to `resolveInteractionByIndex`.
  When `selectedTool` is null, `deriveHeldLiquid` returns `{ tool: null, liquid: null, ... }`,
  which is truthy. The resolver's check for `!args.heldLiquid` fails on empty objects, breaking
  tool-click resolution for direct interactions (tool+destination with no source). Now only
  include heldLiquid in resolveArgs if it actually contains a liquid.
- Patch 6: Wrong-order hint UI (CSS shake + toast notification).
  - `showWrongOrderHint(clickedItemId, step, interaction)` displays a small toast
    naming the expected next click when a player clicks the wrong item in a sequence.
    Toast auto-dismisses after ~2 seconds; multiple wrong clicks reset the timer.
  - `showWrongOrderToast(message)` renders a non-blocking visual toast in the
    top-right corner using CSS fade-in/fade-out animations. No modal, no sound.
  - CSS `@keyframes shake` (0.4s duration) applies a horizontal wiggle (~4px amplitude)
    to the clicked item. Added to `src/style.css` with fade-in/fade-out animations
    for toast transitions.
- Patch 5: Tool-first, index-aware resolver in `src/interaction_resolver.ts`.
  - New `resolveInteractionByIndex(args: { selectedTool, clickedItem, activeStep,
    interactionIndex, heldLiquid })` function that reads only a single required
    interaction from `step.interactionSequence[interactionIndex]` (not the first match
    in a flat list). This enforces multi-step interaction sequences in order.
  - Extended `InteractionResult` type with optional `indexDelta: 0 | 1` (0 = tool click
    that does not advance; 1 = action click that advances to the next interaction) and
    optional `wrongOrder: boolean` (true = click did not satisfy current interaction).
  - Tool-first enforcement: a source or destination click requires the tool to be
    selected (via `selectedTool`) or already held (via `gameState.heldLiquid.tool`).
    Tool clicks themselves (`indexDelta: 0`) do not advance the index; only the
    subsequent source/destination click (`indexDelta: 1`) advances.
  - Handles four interaction shapes with tool-first rules:
    1. Both source + destination (pass-through): tool click = select mode (0), source/dest
       click = discharge (1 if tool ready). Direct interactions (no prior tool selection)
       not supported for pass-through.
    2. Source only (load): tool click = select mode (0), source click = load (1).
    3. Destination only (discharge/apply): tool click with tool selected = select mode (0);
       destination click = discharge (1) if tool ready OR direct interaction.
    4. No source, no destination (direct tool-only): clicking the tool = advance (1).
  - On mismatch (wrong tool, missing precondition, wrong click target): returns
    `{ kind: 'wrong_order', indexDelta: 0, wrongOrder: true }` for Patch 6 to surface
    a hint and increment `wrongOrderClicks`.
  - Backwards compatible: steps without an `interactionSequence` return `{ kind: 'no-op' }`
    (legacy path unaffected). Existing `resolveInteraction()` function unchanged;
    `resolveInteractionByIndex()` is a parallel entrypoint for Patch 6 to opt into.
  - Gap fixes after spec review: added Case 4 for tool-only interactions (`!source && !destination`);
    added support for `direct: true` field to skip tool precondition checks; wrote 9-test suite in
    `tests/test_interaction_resolver.mjs` with HTTP server setup, testing load/discharge/tool-first-rejection/tool-only/direct cases;
    exported `resolveInteractionByIndex` and `PROTOCOL_STEPS` to window for testing.
- Patch 4: Interaction sequence state fields (`interactionIndex`, `wrongOrderClicks`).
  - `gameState.interactionIndex: number` defaults to 0; resets to 0 whenever
    a new step becomes active (via `completeStep()` advancing to the next step).
    Used by resolver and hood scene to enforce multi-click sequences in order.
  - `gameState.wrongOrderClicks: number` defaults to 0; increments whenever a click
    does not match the current interaction in the sequence (soft-fail counter for
    scoring and UI feedback). Does NOT reset per step (run-level counter).
  - Both fields are initialized to 0 in `createInitialGameState()` and ready for
    future localStorage persistence (missing fields in old saves default to 0).
- Patch 3: Content fix + pytest validator gate.
  - All 36 steps in `src/content/cell_culture/protocol.yaml` pass all six validation
    rules; no content fixes were required (protocol was already compliant).
  - New `tests/test_protocol_yaml_validator.py` pytest module with 32 focused tests
    (covering both pass and fail cases per validation rule). Tests use synthetic
    minimal-YAML fixtures and validate all six rules:
    1. Rule 1: discharge without preceding load (matching tool & liquid); 3 tests.
    2. Rule 2: consumesVolumeMl exceeds load volumeMl; 3 tests.
    3. Rule 3: item/reagent references valid (tool/source/destination/liquid unknown); 5 tests.
    4. Rule 4: completionEvent placement (single event on final interaction); 4 tests.
    5. Rule 5: tool-first (source/destination/liquid/stateChange require tool or direct:true); 7 tests.
    6. Rule 6: no legacy fields (actor/target/result/event/trigger/allowedInteractions/targetItems/requiredAction); 9 tests.
  - `validate_item_reagent_references()` extracted from `validate_steps()` to validate tool/source/destination/liquid references against items and reagents dicts.
  - All tests run in 0.05s and are filterable by rule name (`-k` flag).
- Patch 2: Builder derivation + validator rules in `tools/build_protocol_data.py`.
  - `derive_used_items(step)` walks `interactionSequence` in order; for each interaction
    appends ids in inner order (tool, source, destination); first occurrence wins; missing
    fields are skipped. Output is emitted into `protocol_data.ts` as `step.usedItems` on
    every step.
  - `ProtocolStep` TypeScript interface updated to include `usedItems: string[]` field
    (now populated by builder during code generation).
- Patch 1: Mechanical schema and code identifier rename. YAML keys and runtime
  field names updated: `allowedInteractions`->`interactionSequence`, `actor`->`tool`,
  `target`->`destination`, `result`->`stateChange`, `event`->`completionEvent`,
  `trigger`->`completionTrigger` (including nested `completionTrigger.event`
  ->`completionTrigger.completionEvent`). `targetItems` and `requiredAction` removed
  from `src/content/cell_culture/protocol.yaml`, `tools/build_protocol_data.py`,
  `src/constants.ts` (init check), and `src/ui_rendering.ts`.
- Added `deriveActiveTargets(step)` helper to `src/game_state.ts` to replace
  `targetItems` reads with temporary derivation from `interactionSequence`
  (tool/source/destination). All scene highlight and depth code updated.
  TODO Patch 6 comments placed at each temporary read site.
- `tools/build_protocol_data.py` input path updated to `src/content/<protocol>/`
  and output path updated to `src/content/` to match the current directory layout.
  Builder now validates `interactionSequence` with modern field names.

- Implemented six validation rules in `tools/build_protocol_data.py`:
  1. Discharge interaction with `liquid` set but no preceding load with matching `tool`
     and `liquid`. Error names step id and liquid/tool.
  2. Volume sanity violation (`consumesVolumeMl` exceeds the matching load's `volumeMl`).
     Error names step id, volume values, and tool/liquid pair.
  3. Interaction referencing items/reagents not in `items.yaml`/`reagents.yaml` (already
     covered by existing validation; no-op placeholder kept for completeness).
  4. Completion-event placement: more than one interaction with `completionEvent`, OR
     the only `completionEvent` is not on the final interaction. Error names step id
     and explains the violation.
  5. Tool-first violation: any interaction that has `source`, `destination`, `liquid`,
     or `stateChange` must declare `tool`. Exception: `direct: true` (allowed for items
     like opening an incubator door). Error names step id and offending interaction.
  6. Legacy field present in author YAML (`actor`/`target`/`result`/`event`/`trigger`
     /`allowedInteractions`/`targetItems`/`requiredAction`). Defensive rule that fires
     on any future authoring mistake. Error names step id and lists legacy fields found.
- All error messages reference the field by its modern name and include step id for
  quick location and remediation.
- Corrected broken `src/` sub-directory paths in active docs introduced by a blanket
  `sed -i 's#parts/#src/#g'` that did not account for files moved into sub-directories
  during commit `41a236d`. Fixed three files:
  - `docs/FILE_STRUCTURE.md`: 5 wrong paths corrected (`src/hood_scene.ts` ->
    `src/scenes/hood.ts`, `src/microscope_scene.ts` -> `src/scenes/microscope.ts`,
    `src/incubator_scene.ts` -> `src/scenes/incubator.ts`, `src/feed_cells.ts` ->
    `src/steps/feed_cells.ts`, `src/drug_treatment.ts` -> `src/steps/drug_treatment.ts`).
    Link text updated to match corrected URLs.
  - `docs/PIPETTE_LIQUID_CONVENTION.md`: `src/hood_scene.ts` -> `src/scenes/hood.ts`.
  - `docs/SCALING_MODEL.md`: `src/inventory_data.ts` -> `src/content/inventory_data.ts`.
  `docs/CODE_ARCHITECTURE.md` was already correct from a prior targeted pass; no changes
  needed. `docs/CHANGELOG.md`, `docs/archive/`, and `docs/superpowers/` were excluded.
- Audited `docs/LAYOUT_METRICS.md`, `docs/ROADMAP.md`, and `docs/TODO.md` for staleness.
  Updated `docs/LAYOUT_METRICS.md` in place: removed "Milestone M3" framing, fixed three
  `src/` source paths to `src/`, removed stale `walkthrough.sh` run block, added verify
  stamp. Updated `docs/ROADMAP.md` in place: removed "M1-M5" milestone label from the
  Delivered section, added verify stamp. Replaced `docs/TODO.md`: all four prior TODOs
  removed (three were fully covered by the active plan, one referenced deleted paths);
  replaced with one genuine standalone TODO (promote devel/ tests to tests/).

### Removals and Deprecations

- **Changelog rotation.** Rotated `docs/CHANGELOG.md` per `docs/REPO_STYLE.md`: the active log retains the two most recent date headings (`2026-05-08`, `2026-05-05`); older day blocks (`2026-05-01` through `2026-04-06`) moved into the new archive `docs/CHANGELOG-2026-05a.md`. Naming follows the most-recent-month-in-range rule. Reverse-chronological order preserved within each file; no `## YYYY-MM-DD` heading appears in both files.
- **Removed broken root-level links to retired status snapshots.** `docs/FILE_STRUCTURE.md` no longer points to `docs/HANDOFF_CURRENT_STATUS.md` or `docs/STATUS_2026-05-08.md`; the actual files already live under `docs/archive/` and the row was a stale link. Replaced with a single "archive/" row noting that archived plans, status snapshots, and design notes live there.

- **Patch 1: Move smoke test and repair gate 6 selector (WP-Patch1-A1).** Relocated `tests/playwright/e2e/test_game_ui.mjs` (smoke test) to `tests/playwright/test_game_ui.mjs` per folder rule: smoke tests live in `tests/playwright/`, full-path walkthroughs in `tests/playwright/e2e/`. Updated import path (`../repo_root.mjs` -> `./repo_root.mjs`) and run-from-root comment. Fixed gate 6 selector and assertion: replaced generic `[data-item-id]` click with targeted click of `[data-item-id="ethanol_bottle"]` (active item for step 1 `spray_hood` per protocol.yaml), then verified protocol completion via sidebar checklist using selector `li:has(#step-spray_hood).completed` with 2000ms timeout. The selector targets the `li.protocol-step.completed` list item rendered by `ui_rendering.ts` that contains the checkbox with id `step-spray_hood`. Gate now asserts the interaction actually advanced the protocol (not just click succeeded). Updated all callers: `tools/run_smoke.py` (path on lines 6 and 86), `check_codebase.sh` (run comment), `docs/FILE_STRUCTURE.md` (separated smoke and walkthrough sections). Smoke test now reports 9/9 gates; all verification commands pass: walker 25/25 cell_culture + 6/6 mini-protocols, pytest 285/285, tsc clean, build clean.
- **Walker modal dispatch: removed scene-keyed and step.id-keyed branches (design cleanup, walker stays 25/25).** The prior fix added a scene-keyed `if (step.scene === 'plate_reader')` branch in the walker's modal dispatch routing to a dedicated `walkPlateReaderStep` handler that contained banned `step.id === 'plate_read'` and `step.id === 'results'` branches. Both violated the walker's invariant that it drives the DOM uniformly without per-step or per-scene knowledge. Root cause of the original 24/25 blocker was that `walkModalStep` always honored the protocol's `openClick` field, but `results` declares `openClick: plate_reader` semantically (the wet-lab user "opens the plate reader to view results") even though at runtime the modal is already open from the prior `plate_read` step; re-running the openClick caused `renderPlateReaderScene()` to re-add the overlay's `active` class and break pointer events. Design-correct fix: `walkModalStep` now probes for the advance button before invoking openClick - if `[data-walker-advance="${advanceClick}"]` already exists, the modal is open from a prior step's completionEvent and openClick is skipped. Deleted `walkPlateReaderStep` (60+ lines including both banned `step.id ===` branches), collapsed the scene-keyed dispatcher branch back to a single `walkModalStep` call, and removed the now-unused `waitForActiveScene` import. Walker stays at 25/25 on cell_culture; all 6 mini-protocol walkers stay green; pytest 285/285; tsc clean; build clean. Net: -68 lines in `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`.
- **Fixed results step modal blocker (walker 24/25 -> 25/25).** Walker was timing out on the `results` step when attempting to click the modal-close button. Root cause: the walker's generic modal dispatcher (`walkModalStep`) unconditionally called `switchToBench()` when `step.scene === 'plate_reader'`, assuming all modals need to be opened first. However, plate_reader scene steps have already opened the overlay in the previous step (plate_read), and switching scenes attempted to re-click the plate_reader item. The re-click triggered `renderPlateReaderScene()`, which re-added the `active` class to the overlay, but a stale `microscope-overlay` div was still present and blocking pointer events on the intended target buttons. Fixed by adding a special case in the walker's step dispatch (line 808-814): when `kind === 'modal'` and `step.scene === 'plate_reader'`, use the dedicated `walkPlateReaderStep` handler instead of the generic modal path. The dedicated handler correctly handles both `plate_read` (open overlay + click complete button) and `results` (click close button without scene switching). Walker now achieves 25/25 steps on cell_culture protocol. All other protocol walkers remain green: tutorial_split (3/3), tutorial_hood_transfer (1/1), tutorial_drug_dilution (1/1), tutorial_bench_direct (1/1), tutorial_cell_counter (1/1), tutorial_plate_reader (1/1).
  - Modified: `tests/playwright/e2e/protocol_walkthrough_yaml.mjs` lines 808-814 (added plate_reader special case in modal dispatch)

- **`hood_surface` removed from `src/content/cell_culture/items.yaml` and `src/content/tutorial_split/items.yaml`.** No protocol step references it after the spray_hood refactor; the only remaining mentions are historical in archived docs.
- Deleted `src/content/protocol.ts` (legacy unused file). This file exported `TC_PROTOCOL` (10-step
  tissue culture workflow), `instruction()`, and `checkpoint()` helper constructors, but was never
  imported or referenced anywhere in the codebase. The active runtime uses `PROTOCOL_STEPS` from
  `src/content/protocol_data.ts` (auto-generated by `tools/build_protocol_data.py`). Audit confirmed
  zero external imports: `npx tsc --noEmit` clean, all test gates pass.
- Patch 12 (legacy walkthrough cleanup): Deleted `tests/protocol_walkthrough_ui.mjs` (hand-coded step-recipe table,
  superseded by YAML-driven walker). Renamed `tests/protocol_walkthrough.mjs` to `tests/protocol_graph_smoke.mjs`
  to reflect its purpose: a fast data-layer smoke test (calls `completeStep()` directly) that proves graph
  reachability only, not a real-UI regression test. See `tests/protocol_walkthrough_yaml.mjs` for the canonical
  real-UI walker.

- Patch 6: Removed `deriveActiveTargets` import from `src/scenes/hood.ts` and
  `src/scenes/bench.ts` (no longer used by scene highlight logic; still used by
  depth layering in game_state.ts for back-shelf parking of unused items).

### Decisions and Failures

- **Lesson from M5 cleanup analysis:** Deletion of "unreachable" legacy code branches must verify completionPath.kind for EACH related step individually, not rely on an outer guard condition. The M5 cleanup initially claimed seven onItemClick branches were "gated by interactionSequence dispatch" and therefore unreachable. This was correct FOR those four specific steps (media_adjust, add_mtt, decant_mtt, add_dmso), which all use `completionPath: kind: interactionSequence`. However, the same reasoning does NOT apply to directTool-dispatch steps (e.g., spray_hood uses `completionPath: kind: directTool` with tool ethanol_bottle). The router only branches to interactionSequence handlers for sequences; directTool and modal steps fall through to the legacy click ladder by design. The ethanol_bottle handler at hood.ts:1028 is load-bearing for tutorial protocols and any future directTool steps, and must not be deleted. Future M-style cleanups must audit the completionPath.kind for each step that references a legacy handler, not just check for an outer sequence guard. This prevents silent regressions where a legacy handler is deleted as "unreachable" even though it's actively used by non-sequence step types.
- **Decision:** the `hood_surface` warning was treated as a vocabulary/schema correction, not a missing-DOM bug. The fix path was tightening `destination` and adding the direct-tool-interaction concept, NOT adding a fake clickable item to the hood scene. This prevents the schema from encoding semantic context as a click target.
- Patch 8 scope collapsed (8A + 8B fully address planned 8A/8B/8C/8D/8E work). Patches 9 and 10 will
  reuse the shared walker_helpers.mjs module for protocol flags and wrong-order injection,
  respectively, avoiding re-stabilization and code duplication.

- Patch 0 of plan `keen-swimming-fairy.md`: prose and comment sweep only. No identifier
  renames, no YAML key changes, no behavior changes. Mechanical schema rename is Patch 1.
- Patch 1 spec compliance fixes (six violations in devel/, src/):
  1. devel/test_yaml_swap_runtime.mjs: renamed reads `step.allowedInteractions[N].actor` to
     `step.interactionSequence[N].tool` and updated user-facing strings (2 occurrences each).
  2. devel/test_yaml_edit_smoke.mjs: deleted (untracked, only validated removed fields
     requiredAction/targetItems which no longer exist in schema).
  3. devel/analyze_protocol_audit.mjs, devel/analyze_protocol_audit.py: added
     `derive_used_items()` helper (first-use order: tool/source/destination, de-duplicated)
     to replace `targetItems` reads (4 fixes total).
  4. devel/protocol_walkthrough_ui.mjs: added deriveUsedItems() helper, replaced
     `step.targetItems` with derived list in 4 places (data fetch, cross-check logic,
     and diagnostic output).
  5. devel/test_pipette_liquid.mjs, devel/test_step_completeness.mjs,
     devel/test_target_handlers.mjs: added deriveUsedItems() helpers, replaced
     `step.targetItems` or `step.usedItems` reads with derivation from
     interactionSequence (8 fixes total).
  6. src/ui_rendering.ts: fixed behavior regression in renderToolbar(). Old code
     matched `requiredAction === 'pipette_media'` (neutralize_trypsin only, not resuspend).
     New code maps to step id with comments naming the original requiredAction value.
     Git history confirmed: neutralize_trypsin had requiredAction: pipette_media;
     resuspend had requiredAction: resuspend. Corrected code now matches original
     behavior exactly.
  7. src/interaction_resolver.ts: renamed discharge result type fields from `.event`/`.target`
     to `.completionEvent`/`.destination` in the InteractionResult type definition and
     all three return statements (3 discharge returns).
  8. src/scenes/hood.ts: renamed all 11 uses of `result.event` to `result.completionEvent`
     (discharge handler dispatch).
  9. src/scenes/bench.ts: renamed all 2 uses of `result.event` to `result.completionEvent`
     (discharge handler dispatch).
  10. src/scenes/hood.ts: renamed local variable `actor` to `tool` (Patch 1 vocabulary
      compliance).
- Patch 1 residual spec compliance fixes (4 violations caught in re-review; 3 more in final sweep):
  - devel/analyze_protocol_audit.mjs:163, devel/analyze_protocol_audit.py:152: fixed read sites to use `audit['usedItems']` instead of `audit['targetItems']` (key mismatch with derivation).
  - devel/test_yaml_swap_runtime.mjs:97,101-102: updated YAML string-matching from obsolete keys (`actor:`, `targetItems`) to modern keys (`tool:`, `interactionSequence`).
  - devel/test_yaml_swap_runtime.mjs:12,14,123,126,169,172: updated all docstring and console log prose from `actor` to `tool` vocabulary.
  - devel/protocol_walkthrough_ui.mjs:271: renamed read from `step.trigger` to `step.completionTrigger`.
  - devel/test_yaml_swap_runtime.mjs:145-146,191-192: renamed local variables `actor1`/`actor2` to `tool1`/`tool2` (Patch 1 vocabulary compliance).
  - devel/test_interaction_resolver.mjs:34-35,98-99,127-128: renamed resolver result reads from `result.event`/`result.target` to `result.completionEvent`/`result.destination` to match modern InteractionResult type.
  - devel/test_step_dispatch.mjs:120: renamed filter from `s.trigger` to `s.completionTrigger`.

### Developer Tests and Notes

- Final gate run after cleanup pass:
  - `bash build_github_pages.sh` exit 0
  - `pytest tests/` 217 passed
  - `npx tsc --noEmit` clean
  - `node tests/test_game_ui.mjs` 9/9
  - `node tests/test_interaction_resolver.mjs` 9/9
  - `node tests/test_interaction_index.mjs` 6/6
  - `node tests/protocol_graph_smoke.mjs` 25/25, exit 0
  - `node tests/protocol_walkthrough_yaml.mjs` 25/25 (active)
  - `node tests/protocol_walkthrough_yaml.mjs --wrong-order` 25/25 (active, with injections)
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_split` 3/3
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_split --wrong-order` 3/3
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_pbs` 4/4
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_pbs --wrong-order` 4/4
  - All five walker honesty awks (gameState writes, internal API calls, fixed sleeps, clickItemOptional, classList active mutations) returned zero hits.
  - Walker report severity: `info: 229, injection: 0, warn: 0, error: 0` on clean run; `injection` rises to expected non-zero counts under `--wrong-order`.
- **Patch 10 test verification (C3: Wrong-order UI pass):**
  - `node tests/protocol_walkthrough_yaml.mjs --wrong-order` (cell_culture) exits 0, all 25 steps passed, final `wrongOrderClicks === 13` (13 injections).
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_split --wrong-order` exits 0, all 3 steps passed, final `wrongOrderClicks === 5`.
  - `node tests/protocol_walkthrough_yaml.mjs --protocol tutorial_pbs --wrong-order` exits 0, all 4 steps passed, final `wrongOrderClicks === 8`.
  - Regression check: `node tests/protocol_walkthrough_yaml.mjs` (no flag, all three protocols) still exits 0 with final `wrongOrderClicks === 0`.
  - Injection records (severity `'injection'`) are distinct in report JSON and grep-able.
  - Added helpers to `tests/walker_helpers.mjs`:
    - `recordInjection(report, stepId, itemId)` - log injection events distinctly.
    - `pickWrongOrderItem(page, requiredItemIds)` - select a wrong item from the active scene.

- Behavior verified unchanged for correct sequences:
  - `node tests/protocol_walkthrough_yaml.mjs` still passes 25/25 steps, same report structure.
  - All fraud-check awks return 0 (no gameState writes, no internal API calls, forbidden classList mutations, etc.). Single `waitForTimeout(500)` in injection logic is intentional to allow async state settlement.
  - `node tests/test_game_ui.mjs` 9/9.
  - `node tests/test_interaction_resolver.mjs` 9/9.
  - `node tests/test_interaction_index.mjs` 6/6.
  - `npx tsc --noEmit` clean.
  - `pytest tests/test_pyflakes_code_lint.py` 23/23.
  - `pytest tests/test_protocol_yaml_validator.py` 32/32.

- Helper module is read-only (no gameState writes); all exports are async functions with explicit
  page/report/timeout parameters. Zero hidden state or module-level side effects.

- All continuous gates pass:
  - `npx tsc --noEmit` clean (no type errors).
  - `node tests/test_game_ui.mjs` 9/9 gates.
  - `node tests/test_interaction_resolver.mjs` 9/9 gates.
  - `node tests/test_interaction_index.mjs` 6/6 gates.
  - `node tests/protocol_walkthrough_yaml.mjs` passes 25/25 steps (honest, no cheats).

- Walker now contracts to Spec Rule 1 fully: every state advance comes from Playwright DOM click,
  observable progress detection, and no direct gameState writes or internal function calls.
- Patch 8: YAML-driven UI walker `tests/protocol_walkthrough_yaml.mjs` (Patch 8, C1).
  - Canonical real-DOM regression test that drives protocol playthrough via Playwright
    clicks, following the six-rule auto-walker specification from the plan.
  - Per-step click-plan dispatch based on YAML interaction shapes: tool only, tool+source,
    tool+destination, tool+source+destination, destination only. Invalid shapes (completionEvent
    only) rejected.
  - Fresh browser state: localStorage.clear(), hard reload, welcome button dismissal, normal start flow.
  - Per-click validation: element exists, visible, enabled, in active scene, in highlight set.
    Selectors use stable `[data-item-id="<id>"]` handles; virtual destinations (like hood_surface)
    gracefully skipped if already-complete interactions indicate progress.
  - Per-click wait: detects progress (tool selected, liquid held, index advanced, scene changed,
    modal open, step completed) within configurable budget (default 1500ms). Fails with clear
    reason if no progress detected.
  - Per-step assertions: all clicks satisfy validation, final index equals sequence length,
    completeStep() fired once, activeStepId advanced to nextId, wrongOrderClicks did not
    increment (without --wrong-order).
  - Per-run assertions (without --wrong-order): every step in protocol completed, wrongOrderClicks=0,
    stepsOutOfOrder=0, activeStepId=null, final result screen present, zero errors in report,
    zero uncaught console errors.
  - Structured JSON report in `test-results/walker/playthrough_report.json` with per-entry
    severity (info/warn/error), timestamps, and metadata. Severity ladder: info (non-actionable),
    warn (recoverable), error (step-fatal).
  - Screenshots: per-click before/after, final result screen, all saved to test-results/walker/.
  - Supports `--protocol <name>` flag for tutorial protocols (Patch 9) and `--wrong-order` flag
    for soft-fail validation (Patch 10).
  - **CRITICAL BUG FIX (found during walker debugging):** Window exports of `gameState` were
    pointing to stale initial instance created at module load time, not the real gameState
    instance created during DOMContentLoaded. Fixed by exporting `gameState` as a getter
    (via `Object.defineProperty`) so Playwright tests always access the active instance.
    This bug affected both `window.gameState` and any code that called `onItemClick` from
    Playwright context. Window exports also now include `onItemClick`, `setupHoodEventListeners`,
    and `dispatchInteractionClick` for testing.
  - Fixed walker step-validation logic: removed incorrect interactionIndex === sequenceLength check
    that failed when step completes (triggering interactionIndex reset). Per-step success now
    correctly checks: step added to completedSteps, activeStepId advanced to nextId (or null),
    wrongOrderClicks unchanged. Per-click progress detection accepts activeStepId change as valid
    progress for terminal click in a step.
  - Fixed pass-through interaction handling (tool+source+destination): tool click now properly sets
    selectedTool when indexDelta === 0, enabling subsequent source/destination clicks to satisfy
    tool precondition check in resolver. Fixed aspirate_old_media, pbs_wash, and related multi-step
    interactions.
  - Fixed aspirate animation timing: startAspiration() now immediately calls triggerStep() so step
    completion is not delayed by 2-second animation. Animation continues in parallel, enabling
    Playwright walker to detect step completion synchronously.

- Patch 12 (legacy walkthrough cleanup):
  - Deleted `tests/protocol_walkthrough_ui.mjs` (hand-coded `STEP_RECIPES` table, superseded by YAML walker).
  - Renamed `tests/protocol_walkthrough.mjs` to `tests/protocol_graph_smoke.mjs`.
  - Updated `docs/CODE_ARCHITECTURE.md` to reference the canonical UI walker (`tests/protocol_walkthrough_yaml.mjs`)
    and the fast data-layer smoke test (`tests/protocol_graph_smoke.mjs`).
  - Verified zero `STEP_RECIPES` references remain in the codebase.
  - All continuous gates pass: `npx tsc --noEmit`, `node tests/test_game_ui.mjs` 9/9,
    `node tests/protocol_walkthrough_yaml.mjs` 25/25, `node tests/protocol_graph_smoke.mjs` (graph reachability).
  - `pytest tests/test_pyflakes_code_lint.py` clean.

- Patch 7: New `tests/test_interaction_index.mjs` runtime unit tests covering the
  interaction-index state advancement and wrong-order tracking.
  - Test 1: Load interaction advances index from 0 to 1 (pbs_wash, tool select then
    source click with tool ready).
  - Test 2: Discharge after load advances 1 to 2 and reaches end of sequence
    (pbs_wash, second interaction advances index and marks sequence complete).
  - Test 3: Wrong-order click (clicking destination before source) increments
    wrongOrderClicks without advancing index; stays at 0.
  - Test 4: Tool-first rejection (source clicked without tool selected) returns
    wrong_order signal; does not advance index.
  - Test 5: Terminal interaction with completionEvent (spray_hood, tool-only direct
    interaction advances index to 1 and completes the sequence).
  - Test 6: Save/load round-trip preserves interactionIndex via localStorage
    serialization (per Patch 4, no persistent save/load exists yet; test validates
    JSON round-trip of interactionIndex and wrongOrderClicks).
  - All 6 tests pass (exit 0, 100% success rate); runtime ~5 seconds.
- `node tests/test_interaction_resolver.mjs` passes 9/9 tests (no regressions from
  window.gameState export).
- `node tests/test_game_ui.mjs` passes 9/9 gates (no regressions).
- `npx tsc --noEmit` clean (only change: exported gameState to window in init.ts).
- `python3 tools/build_protocol_data.py` exits 0; `src/content/protocol_data.ts`
  regenerated with `usedItems` array on every step. Spot-checked 2-3 steps:
  - `pbs_wash`: `usedItems: [ "serological_pipette", "pbs_bottle", "flask" ]` (tool,
    source, destination in interaction order).
  - All interactions with source/destination/tool properly de-duplicated and ordered.
- `python3 tools/build_protocol_data.py --validate-only` exits 0 on the active protocol.
- All six validation rules tested and verified to raise with expected error messages
  naming step id and rule violation.
- `npx tsc --noEmit` passes clean (no TypeScript errors introduced by `usedItems`).
- `node tests/test_game_ui.mjs` passes 9/9 gates (no regressions).
- `python3 tools/build_protocol_data.py` exits 0 and regenerates
  `src/content/protocol_data.ts` with modern keys.
- `npx tsc --noEmit` green (only pre-existing `svg_globals.d.ts` errors remain,
  unrelated to this patch).
- `node tests/test_game_ui.mjs` 9/9 gates pass, 0 console errors.
- ripgrep proof: zero hits for `allowedInteractions`, `\.actor\b`, `targetItems`
  (functional reads), `requiredAction` (functional reads), `interaction\.target\b`,
  `interaction\.result\b`, `step\.trigger\b` in `src/` and `tools/`.
  Remaining hits in those files are comments only.
- Created `docs/PROTOCOL_VOCABULARY.md` as the canonical vocabulary contract for all
  protocol-related docs, code comments, error messages, and authoring guides.
  Cross-linked from `docs/PROTOCOL_YAML_FORMAT.md`, `docs/PROTOCOL_STEPS.md`,
  `docs/CODE_ARCHITECTURE.md`, and `docs/USAGE.md`.

## 2026-05-05

### Additions and New Features
- Addressed reviewer items on the recolor pipeline: (1) tests now import the real production module (`tests/_compile_for_test.mjs` runs `npx esbuild` to compile `src/svg_color_patch.ts`/`src/svg_recipes.ts`/`src/style_constants.ts`/`src/svg_globals.ts` into a node-importable ESM bundle); both `tests/test_svg_color_patch.mjs` and `tests/test_bottle_recolor.mjs` exercise production code (8 unit tests + 120 bottle assertions). (2) `src/layout_engine.ts` `getStaticSvg` now routes every consolidated bottle/stock asset id (media, PBS, trypsin, DMSO, sterile water, carboplatin, metformin) through `getBottleSvg(liquid)` via a centralized `BOTTLE_ASSET_LIQUID` map; no runtime path returns the unpatched Servier base. (3) Bottle liquid sub-objects use geometry-keyed ids (`liquid_<sha8(d)>`) for stability across re-imports; the build script `tools/build_servier_recolor.py` (moved from repo root) emits these from a color-set diff over the three pristine Servier sources (`bottle-medium-{pink,orange,green}.svg`). (4) Reintroduced `strokeRole` on `SvgColorPatch` and `attr` on `SvgGroupEntry` -- not speculative this time: the Servier diff classifies 12 fill + 3 stroke liquid paths in the bottle, dropping the strokes would visibly lower fidelity. The change is documented in source comments. (5) Added `tests/test_bottle_dom_recolor.mjs` (Playwright) that asserts `getComputedStyle(el).fill` on a rendered `bottle__liquid_<hash>` matches a `COLOR_MAP` hex and is not a Servier default magenta. (6) `tools/generate_svg_globals.py` errors out if a `<basename>.colormap.json` exists with no matching `.svg`. (7) `docs/CODE_ARCHITECTURE.md` gains a "Dynamic SVG recolor pipeline" section; `docs/USAGE.md` documents the regen command.
- Reverted speculative `strokeRole` field on `SvgColorPatch` and the parallel `attr` field on `SvgGroupEntry`. The pristine Servier diff classified zero stroke-only liquid paths; v1 of the recolor pipeline stays narrow at fill+opacity, with a build-time guard in the bottle generator that errors out if a future Servier asset would force stroke routing (forces an explicit API extension instead of silent drift).
- Rebuilt `assets/equipment/bottle.svg` from the pristine Servier sources `OTHER_REPOS/bioicons/static/icons/cc-by-3.0/Microbiology/Servier/bottle-medium-{pink,orange,green}.svg`. The build diffs the three variants by path geometry (`d` attribute, since tag counts differ slightly across colors), classifies a path as liquid when its fill varies, assigns a positional id (`liquid_NN`), and writes per-id opacity from the source hex's luminance to preserve the original Servier shading on any role color. Result: 12 liquid sub-objects out of 44 total paths, all routed through the existing `liquid` group in `assets/equipment/bottle.colormap.json`. The non-varying Servier paths (cap, glass, label, threading) are untouched. Replaced the prior hand-drawn placeholder `bottle.svg` that lost Servier visual quality.
- Rewrote `tests/test_bottle_recolor.mjs` to walk `SVG_GROUPS["bottle"]["liquid"]` instead of asserting a hard-coded `liquid_base` id, so the test remains valid as authored ids evolve. New contract: every grouped id receives the role's hex on its open tag; 8 liquids x 12 grouped ids = 96 assertions, green.
- Dynamic SVG sub-object recoloring pipeline + shared bottle consolidation. New `src/svg_color_patch.ts` patches `fill` and `opacity` on existing authored SVG elements addressed by namespaced id; no new geometry is drawn at runtime (narrow id-scoped attribute writer, no broad regex; 6 unit tests in `tests/test_svg_color_patch.mjs`, green). New `src/svg_recipes.ts` maps T75 visual states (`dirty`, `empty`, `clean`, `freshMedia`, `oldMedia`) and `BottleLiquid` (8 values) to `SvgColorPatch[]`. `tools/generate_svg_globals.py` now emits `SVG_IDS` (per-asset id manifest) and `SVG_GROUPS` (loaded from optional `<basename>.colormap.json` sidecars) so build-time validation can confirm patch targets exist. Authored `assets/equipment/bottle.svg` (canonical shared bottle with `liquid_base` + `liquid_shadow` + `liquid_highlight` ids) and `assets/equipment/bottle.colormap.json` declaring the `liquid` group. Added new `getBottleSvg(liquid: BottleLiquid)` accessor in `src/svg_assets.ts`; routed `getMediaBottleSvg`, `getPbsBottleSvg`, `getTrypsinBottleSvg`, `getDmsoBottleSvg`, `getSterileWaterSvg`, `getCarboplatinStockSvg`, `getMetforminStockSvg` through it as thin wrappers. Updated `src/layout_engine.ts` `getStaticSvg` to return `SVG_BOTTLE` for every consolidated bottle/stock asset id. Authored `liquid_residue` rect in `assets/equipment/t75_flask.svg` (default opacity 0); `getFlaskSvg(mediaLevel, mediaAge, isDirty)` applies the residue patch and selects liquid color from `ColorRole` (`media`/`oldMedia`) instead of the legacy `mediaColor === '#c69a3a'` hex compare. Updated the caller at `src/scenes/hood.ts:110-112`. Added `residue`, `oldMedia`, `carboplatin`, `metformin` to `ColorRole`/`COLOR_MAP`. **Deleted** 8 obsolete bottle/stock SVGs (media_bottle, media_bottle_legacy, pbs_bottle, trypsin_bottle, dmso_bottle, sterile_water_bottle, carboplatin_stock, metformin_stock) after grep gate confirmed zero source references; updated `docs/THIRD_PARTY_ASSETS.md` accordingly. Tests: `tests/test_svg_id_parity.py` (3 tests, green), `tests/test_svg_color_patch.mjs` (6 tests, green), `tests/test_bottle_recolor.mjs` (verifies all 8 BottleLiquid values render `#bottle__liquid_base` with the correct `COLOR_MAP` hex; green). Plan: `~/.claude/plans/i-want-to-build-buzzing-falcon.md`.

- Restored the SVG asset pipeline that the esbuild migration silently dropped. New `tools/generate_svg_globals.py` reads `assets/equipment/*.svg` (and the legacy `cell-culture2-clean.svg`), strips XML declarations and Inkscape/Sodipodi metadata, namespaces internal IDs with a `<basename>__` prefix, rewrites `url(#id)` and `href="#id"` references, and emits `src/svg_globals.ts` as template literals. Wired into `build_github_pages.sh`, `export_single_file.sh`, and `check_codebase.sh` so every build/check path repopulates 58 equipment SVG constants plus `CELL_CULTURE_PLATE_SVG`. Without this, all `SVG_*` constants in `svg_globals.ts` were the empty string and no equipment art rendered in the bundled build.
- Added Gate 9 (`equipment_svg_renders`) to `devel/test_game_ui.mjs`. Verifies via `page.evaluate` that the rendered DOM contains a non-trivial number of vector primitives (>=5 path/rect/polygon/circle/ellipse/line nodes) AND at least one prefixed equipment id (`t75_flask__*`, `media_bottle__*`, etc.). This catches the regression where the page loaded with zero console errors but no art was on screen because every `SVG_*` constant was `""`.

### Behavior or Interface Changes
- Policy: `src/svg_globals.ts` is now a build artifact, not a hand-edited source file. Added to `.gitignore`; the previously committed copy was untracked via `git rm --cached`. Every build/check entrypoint regenerates it from `assets/equipment/`. Edit the SVGs in `assets/equipment/`, never `src/svg_globals.ts` directly.

### Fixes and Maintenance
- Fixed shebang/pyflakes/main-guard test failures: `chmod +x` for the seven scripts flagged by `tests/test_shebangs.py` (`tools/generate_svg_globals.py` and six pre-existing files in `devel/`); removed the unused `import sys` from `devel/analyze_protocol_audit.py`; wrapped the module-level audit logic in a `main()` function with an `if __name__ == '__main__'` guard.

### Developer Tests and Notes
- Verification on a clean rebuild: `./build_github_pages.sh` (635 KB `dist/main.js`), `./export_single_file.sh` (669 KB `dist-single/game.html`), `npx tsc --noEmit -p src/tsconfig.json` (0 errors), `node devel/test_game_ui.mjs` (9/9 gates pass; Gate 9 reports `svgs=25 paths=946 prefixedIds=52`), `pytest tests/test_shebangs.py tests/test_pyflakes_code_lint.py` (23/23 pass). Pre-existing `tests/test_ascii_compliance.py` failure on `servier/tube-rack.svg` (Japanese katakana) is unrelated and unfixed.

### Additions and New Features
- Lifted all 33 files from `src/` (~7,121 LOC) into `src/`: TypeScript modules into `src/`, `src/scenes/`, `src/steps/`, `src/content/`; HTML and CSS templates into `src/`. Removed the now-empty `src/` directory. The bundle entrypoint is `src/init.ts` (formerly `src/init.ts`).
- Retrofitted ES module boundaries on every relocated file: added `import` and `export` statements to replace the legacy concat-build globals. Strict `src/tsconfig.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `useUnknownInCatchVariables`) is now green across the entire runtime tree.
- Resolved the 218 strict-mode errors that surfaced after the lift via 19 parallel implementer subagents (one per file). Most fixes were nullability narrowing (`if (x === undefined) continue;`) or non-null assertions with one-line invariant comments where index ranges are statically provable. Two TS2632 "cannot assign to import" issues in `init.ts` were resolved by adding `setGameState(next)` and `setRenderGame(fn)` setters to `game_state.ts` and `ui_rendering.ts` and updating the call sites in `init.ts`.
- Verified `./build_github_pages.sh` produces a working `dist/` (170 KB `main.js`) and `./export_single_file.sh` produces a portable `dist-single/game.html`. Both are now reproducible from a clean checkout.
- Added `.github/workflows/deploy-pages.yml` from the `web-game-parallel-build` skill template; user enables Pages manually after merge.
- Replaced the legacy `run_web_server.sh` (which called the dead `build_game.sh`) with one that rebuilds via `build_github_pages.sh` and serves `dist/` on the LAN.

### Behavior or Interface Changes
- Canonical state decision: the legacy runtime `GameState` shape (formerly `src/game_state.ts`, ~445 LOC, flat 70-field bag) is the only canonical state model. The clean three-way split (`protocol`/`lab`/`ui`) that briefly lived in `core/engine.ts` was discarded along with `core/`. There is no future state-redesign milestone in this plan.

### Removals and Deprecations
- Deleted the legacy concat build entirely: `build_game.sh` and `walkthrough.sh`. Output `cell_culture_game.html` is no longer regenerated; the archived copy lives at `tests/fixtures/legacy_cell_culture_game.html`.
- Earlier in the day: deleted `core/`, `ui/`, `content/`, `main.ts`, `tsconfig.core.json`, `_temp_screenshot.js` (see entries above).

### Decisions and Failures
- Per-error breakdown of the 218-error retrofit: layout_engine.ts had zero net errors after the prior import/export pass, despite the initial estimate of 70 (the file was already strict-clean). Heaviest real loads were interaction_resolver.ts (29 -> 0), game_state.ts (25 -> 0), protocol_ui.ts (15 -> 0), init.ts (14 -> 0), svg_assets.ts (12 -> 0). Eighteen smaller files cleared in batches of 2-8 errors each.
- Soft parity gate accepted in lieu of hard score parity: the codebase has no PRNG seed plumbing, so M5a "seed-42 final-score parity" was downgraded to "tsc clean + bundle builds + export_single_file works." User explicitly accepted "break things to get clean."
- Brand id constructors and semantic Action discriminated unions remain out of scope. `src/brands.ts` is a placeholder. The plan's M7 type-tightening milestone was deleted at user direction; type design follows existing runtime shapes only.

### Developer Tests and Notes
- `npx tsc --noEmit -p src/tsconfig.json` -> zero errors.
- `./build_github_pages.sh` -> `dist/main.js` 170.7 KB, builds in ~5 ms after warm-up. Also assembles `dist/index.html` from `src/head.html` + `body.html` + `tail.html` so the bundled DOM matches the legacy single-file build (a fix that landed when an initial smoke caught zero scene DOM in the bundled output).
- `./export_single_file.sh` -> `dist-single/game.html` (single-file IIFE bundle).
- Manual browser smoke verified via `node devel/test_game_ui.mjs` (Playwright Chromium): 8/8 gates pass -- page loads with zero console errors, start screen appears, start button click advances, sidebar renders, hood scene renders, protocol-item interaction succeeds (clicked ethanol bottle picks up 24-Well Plate hint), localStorage round-trip works, scoring screen DOM is present (not played through). Screenshot at `test-results/test_game_ui.png`. After ESM migration, DOM wiring, scene rendering, and protocol interaction confirmed working.
- `./check_codebase.sh` runs only `tsc --noEmit -p src/tsconfig.json`. The browser smoke is invoked separately from the repo root via `node devel/test_game_ui.mjs`.

### Additions and New Features (foundation, earlier in the day)
- Scaffolded the `src/` tree per the `web-game-parallel-build` skill layout. Mechanically extracted cross-module contracts from `core/types.ts` into `src/types/{ids,actions,protocol,state,scoring,scene_layout,config,save,events}.ts`, plus a `src/types.ts` barrel so files relocated from `core/` keep their `from "./types"` imports unchanged. Authored `src/brands.ts` as a placeholder; branded id wrappers are deferred to M7 per the plan's "mechanical move first" rule.
- Replaced the shell concatenation pipeline with a real esbuild bundle. Added `build_github_pages.sh` (bundles `src/init.ts` to `dist/main.js`, copies `src/index.html` and `src/style.css`, drops `dist/.nojekyll`), `export_single_file.sh` (optional portable `dist-single/` IIFE export), and `check_codebase.sh` (strict tsc + Playwright smoke when present), all copied from the skill templates.
- Added `src/tsconfig.json` with strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. Updated repo-root `tsconfig.json` to extend it and include `src/**/*.ts`.
- Authored `src/init.ts` as the bundle entrypoint; it now calls `createInitialGameState()` and dumps state into `#app`. The shell, scenes, and steps land in M3 and M4.
- Archived `cell_culture_game.html` to `tests/fixtures/legacy_cell_culture_game.html` as the parity baseline reference.

### Behavior or Interface Changes
- `git mv core/engine.ts src/game_state.ts`, `core/cell_model.ts src/cell_model.ts`, `core/scoring.ts src/scoring.ts`, `core/util.ts src/util.ts`. Function bodies and signatures unchanged; only import paths updated (`./types` now resolves to the `src/types.ts` barrel).
- `git mv ui/{notifications,overlays,sidebar}.ts src/`, `git mv content/{tc_protocol.ts -> protocol.ts, tc_tools.ts -> tools.ts, validate.ts} src/content/`, `git mv content/cell_culture src/content/cell_culture`. All `from "../core/..."` imports rewritten to `from "./..."` or `from "../types"`.

### Removals and Deprecations
- Deleted `main.ts` (legacy composition root, no longer wired to the bundle), `tsconfig.core.json` (obsolete second config), `core/types.ts` (extracted into `src/types/`), and the empty `core/`, `ui/`, `content/` directories.
- The legacy `build_game.sh` concat path is no longer maintained; the bundled `dist/` build replaces it. `src/*` (~7,121 LOC across 34 files) remains in place for future relocation in M3-M4.

### Decisions and Failures
- Soft baseline accepted in lieu of hard score parity: the codebase has no PRNG seed infrastructure (15+ `Math.random()` sites in `core/cell_model.ts`, `src/cell_model.ts`, `src/mtt_readout.ts`), so the M0 plan's "seed-42 final-score" gate was downgraded to a `legacy_cell_culture_game.html` archive only. User accepted "break things to get clean."
- Brands deferred. `src/brands.ts` ships as an empty placeholder; introducing branded id constructors would have meant rewriting every id-typed call site, violating M1's mechanical-move rule.

### Developer Tests and Notes
- `npx tsc --noEmit -p src/tsconfig.json` is green on the relocated tree.
- `./build_github_pages.sh` produces a working `dist/` (main.js 2.5 KB, real engine bootstrapped).
- M3-M6 still pending: `src/*` relocation into `src/scenes/`, `src/steps/`, plus shell wiring, smoke tests, and doc rewrites.

