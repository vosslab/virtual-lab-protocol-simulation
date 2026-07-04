## 2026-05-14 (unified interaction vocabulary: M1 evidence)

### Additions and New Features

- **Unified interaction vocabulary plan**: Added
  `docs/active_plans/unified_interaction_vocabulary_plan.md`, the approved
  docs-first plan to design one scene-agnostic protocol interaction vocabulary
  (`target + mode + action`) ratified against all four source protocols
  before any code changes.
- **Protocol interaction inventory (M1 evidence artifact)**: Added
  `docs/active_plans/protocol_interaction_inventory.md`, consolidating the
  evidence base: the click-target fields and 54-step mapping across the 7
  shipped `content/*/protocol.yaml` files, the legacy
  `src/interaction_resolver.ts` action model, the `target + mode + action`
  mappings of OVCAR8 / Miraculin / SDS-PAGE, the candidate base primitives and
  composed-action categories, the candidate mode set, the residual gaps, and
  the known content inconsistencies.

### Decisions and Failures

- **Drift origin recorded**: The protocol vocabulary was designed against the
  cell-culture scene; `plateTargets` / `tubeTargets` and the four
  `completionPath.kind` step types are scene-specific drift. The M0 doc audit
  (`docs/active_plans/scene_runtime_doc_conflicts.md`) mis-classified the
  `plateTargets` / `tubeTargets` sections as `matches-contract`; the new plan
  supersedes that verdict. `tubeTargets` is broken in the modern runtime
  (contract types it as `{tubeId}`, YAML authors `{source, diluent, ...}`).

## 2026-05-14 (scene_runtime spine and subsystems: M3-M6)

### Additions and New Features

- **New `src/scene_runtime/` runtime spine**: Added the modern scene runtime tree to replace the
  legacy hood-centric design from `src/scenes/`. New modules:
  - `src/scene_runtime/contract.ts` - shared runtime contract types.
  - `src/scene_runtime/types.ts` - core scene runtime type definitions.
  - `src/scene_runtime/layout/` - layout engine for positioning clickable scene objects.
  - `src/scene_runtime/dispatch/` - click dispatch subsystem.
  - `src/scene_runtime/highlight/` - object highlighting subsystem.
  - `src/scene_runtime/liquid/` - liquid state subsystem per the liquid convention.
- **Well plate adapter**: Added `src/scene_runtime/adapters/well_plate/` (`index.ts`, `render.ts`).
  The adapter renders the 96-well plate as a structured scientific object with addressable wells
  (`data-well-id`, unpadded `A1`..`H12`). Equipment around the plate is placed via `layoutScene()`;
  only the wells inside the plate use custom geometry, consistent with PRIMARY_CONTRACT item 3.
- **Scene runtime unit tests**: Added focused tests for each new subsystem:
  - `tests/test_dispatch_click.ts` - click dispatch behavior.
  - `tests/test_highlight.ts` - highlight subsystem behavior.
  - `tests/test_layout_engine.mjs` - layout engine positioning.
  - `tests/test_liquid_state.mjs` - liquid state transitions.
  - `tests/test_scene_runtime_loader.py` - scene runtime loader.

### Behavior or Interface Changes

- **Layout engine default constants changed**: In `src/scene_runtime/layout/`, `DEFAULT_ITEM_WIDTH`
  and `DEFAULT_ITEM_HEIGHT` changed from 10 to 100, and `MIN_GAP` changed from 2 to 10. The earlier
  values produced scene objects too small to interact with at realistic viewport sizes.

## 2026-05-14 (Generic schema-driven walker: M4-M6)

### Additions and New Features

- **Generic schema-driven walker**: Added `tests/playwright/walker/` (engine) and
  `tests/playwright/walker.mjs` (CLI). The walker dispatches only on `completionPath.kind`. It
  contains zero `step.id` or `protocolId` branches and never writes runtime state, so it advances
  a protocol only through the same visible UI path a student would use.
- **Walker fixtures**: Added fixtures under `tests/playwright/fixtures/`: `smoke`,
  `interactions_array`, `plate_drug_treatment`, `plate_drug_treatment_full`, and
  `plate_drug_treatment_real`. The walker reads steps from each fixture's `protocol.mjs`.
- **Test fixture build tool**: Added `tools/build_test_fixture.sh`, which esbuild-bundles the real
  well plate adapter to `adapter-wrapped.js` so fixtures load it under `file://` without CORS
  errors.
- **Walker branch enforcement test**: Added `tests/test_walker_no_step_branches.py` to enforce that
  the walker stays schema-driven (no per-step or per-protocol branching).

### Developer Tests and Notes

- **M6 schema-coverage track CLOSED**: The `plate_drug_treatment_full` fixture passes all 9 steps
  through the generic walker (9/9), proving the walker handles the full schema surface for that
  protocol shape.
- **M6 real-adapter track PARTIAL**: Steps 1-5 of `plate_drug_treatment` are proven through the
  real `src/scene_runtime/adapters/well_plate/` adapter via visible UI clicks (walker 5/5). Steps
  6-9 against the real adapter are deferred; see Decisions and Failures below.

## 2026-05-14 (src/scenes/ freeze: M3)

### Behavior or Interface Changes

- **`src/scenes/` frozen as legacy**: Added a legacy banner header to every file under
  `src/scenes/`. New scene work lives in `src/scene_runtime/` plus `content/*/` YAML; `src/scenes/`
  is no longer extended.

### Additions and New Features

- **Freeze enforcement tests**: Added tests to lock the freeze:
  - `tests/test_scenes_freeze_baseline.py` with `tests/data/scenes_freeze_baseline.json` locks the
    per-file line counts of every `src/scenes/` file.
  - `tests/test_scenes_legacy_banner.py` enforces the legacy banner header on every `src/scenes/`
    file.
  - `tests/test_scene_runtime_no_scenes_imports.py` enforces zero imports from `src/scenes/` into
    `src/scene_runtime/`.

## 2026-05-14 (plate_drug_treatment content and backend status)

### Additions and New Features

- **Scene YAML for plate_drug_treatment**: Added `content/plate_drug_treatment/scene.yaml`.

### Behavior or Interface Changes

- **plate_drug_treatment protocol content reworked**: Revised the content text in
  `content/plate_drug_treatment/protocol.yaml`.

### Decisions and Failures

- **Backend architecture refactor PAUSED**: An architect-proposed backend design was rejected by
  the user. The proposal introduced `plateTargets`/`tubeTargets` as first-class primitives; the
  user judged this a regression on the protocol vocabulary. `interactions` is the canonical
  primitive and should stay that way.
- **Schema reconciliation findings**: A reconciliation pass over the modern runtime found:
  - `interactions[]` and `plateTargets[]` are LIVE: exercised across the walker, dispatch,
    highlight, and build paths.
  - `tubeTargets[]` is BROKEN: `contract.ts` types it as `{tubeId}`, but the YAML uses
    `{source, diluent, destination, ...}`. The walker produces zero clicks for it.
  - `stateChange.heldLiquid`, `consumesVolumeMl`, per-interaction `completionEvent`,
    `requiredItems`, and `plateMap` are DEAD in the modern runtime (declared but not consumed).
- **Open question blocking resumption**: How should the schema express a transfer into many wells
  or tubes (for example, `add_carboplatin` targeting 84 wells) without either hand-authoring 84
  individual interactions or reintroducing a parallel target-collection like `plateTargets`?
  Resolving this is a prerequisite to resuming the backend refactor.

## 2026-05-14 (Content quality verification: cell_culture_full sequence runner)

### Verification and Audit

- **Verified cell_culture_full sequence runner contract compliance**: Audited `content/cell_culture_full/protocol.yaml` against PRIMARY_CONTRACT item 5 (learning block requirement for sequence runners).
  - Learning block carries all three required fields with correct sequence-runner-specific prefixes (not mini-protocol prefixes).
  - `learning.objectives` begins with "Students completing this protocol will have achieved..." [OK]
  - `learning.outcomes` begins with "Students completing this protocol will be able to..." [OK]
  - `learning.goals` begins with "Overall, this protocol aims to accomplish..." [OK]
  - All three fields accurately describe the complete OVCAR8 cell culture dose-response workflow from flask prep through MTT readout.

- **Verified sequence runner structure and constituent references**: Confirmed all required structural elements and integrity of mini-protocol linkage.
  - `protocolType: sequence_runner` declared [OK]
  - `entry` block present and correctly points to first constituent mini-protocol's entry (`scene: cell_culture_hood`, `step: spray_hood`) [OK]
  - `steps`, `parts`, `days` are all empty arrays as required for sequence runners [OK]
  - `sequence` list contains five mini-protocol ids in correct scientific order:
    1. `hood_flask_prep` - flask cleaning and enzymatic dissociation
    2. `cell_counting_and_seeding` - cell counting and plate seeding
    3. `drug_dilution_setup` - drug dilution planning and calculation verification
    4. `plate_drug_treatment` - plate drug additions (Day 2)
    5. `mtt_assay_readout` - MTT viability assay and readout
  - All five constituent mini-protocol folders and protocol.yaml files exist with correct ids [OK]

- **Verified consistency with reworked mini-protocol learning blocks**: The sequence runner's learning block accurately reflects the scope and pedagogy of all five constituent mini-protocols post-rework:
  - hood_flask_prep teaches aseptic flask passaging and enzymatic dissociation (included in "aseptic hood technique")
  - cell_counting_and_seeding teaches hemocytometer counting and accurate plate seeding (included in "cell counting")
  - drug_dilution_setup teaches dilution planning and calculation verification (included in "dilution calculations")
  - plate_drug_treatment teaches dose-response design and plate preparation (included in "plate preparation" and "drug dosing")
  - mtt_assay_readout teaches complete MTT workflow (included in "quantitative viability assay readout")

### Developer Tests and Notes

- All verification commands pass cleanly:
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema or reference errors)
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (size-exempt sequence runner; learning block fully compliant)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
- Sequence runner is schema-compliant and ready for walker integration in subsequent milestones.
- Residual risk: None. All structure verified, learning block accurate, all referenced mini-protocols exist and are post-rework.

## 2026-05-14 (Content quality rework: drug_dilution_setup)

### Behavior or Interface Changes

- **Mini-protocol reframed as planning/calculation workflow**: `content/drug_dilution_setup/protocol.yaml` was entirely quiz-based (8 multipleChoice steps with no hands-on interaction). Reworked to explicitly frame as a **dilution planning and calculation verification** mini-protocol rather than a hands-on lab workflow.
  - Updated learning block to emphasize planning, calculation verification, and preparation for execution.
  - `learning.objectives` now focuses on "calculations required to plan and verify the preparation" rather than abstract fluency.
  - `learning.outcomes` now emphasizes "calculate and verify the complete dilution cascade" for multi-drug experiments.
  - `learning.goals` now targets "mastery of dilution planning and calculation verification for complex multi-drug experiments" as a bridge to the full protocol planning phase.
  - Entry scene remains `well_plate_workspace` as reference context for where solutions will be added (not for interactive manipulation).

- **Normalized step labels and actions to consistent imperative voice**: All 8 steps now use parallel "Verify..." or "Recognize..." imperatives, reflecting the planning/calculation mindset.
  - Step 1: "Verify carboplatin intermediate dilution recipe" (was "Calculate...")
  - Step 2: "Verify final carboplatin concentration for Row B" (was "Calculate...")
  - Step 3: "Recognize the 1-2-5 dose-series pattern" (was "Identify...")
  - Step 4: "Verify the recipe for 4 uM carboplatin working stock" (was "Calculate...")
  - Step 5: "Verify metformin working stock recipe" (was "Calculate...")
  - Step 6: "Verify final metformin concentration in well" (was "Calculate...")
  - Step 7: "Verify the requirement to pre-warm media adjustments" (was "Explain...")
  - Step 8: "Verify the complete dilution strategy" (was "Review...")

- **Updated all `why` fields** to reinforce planning/calculation focus and interdependencies:
  - Emphasized parent-child cascade relationships.
  - Connected each calculation to its practical importance in planning.
  - Highlighted how pre-planning prevents errors during execution.
  - Reframed as components of a cohesive multi-drug dose-response planning workflow.

### Fixes and Maintenance

- **Verified science accuracy**: Reviewed all 8 steps for arithmetic correctness:
  - Carboplatin 10 mM -> 400 uM: 40 uL stock + 960 uL (VERIFIED).
  - 400 uM -> 4 uM: 10 uL + 990 uL (VERIFIED).
  - 4 uM x 5 uL / 200 uL well = 0.1 uM (VERIFIED).
  - Metformin 1 M -> 200 mM: 200 uL stock + 800 uL (VERIFIED).
  - 200 mM x 5 uL / 200 uL well = 5 mM (VERIFIED).
  - All multipleChoice feedback text is arithmetically consistent.
  - Pre-warming rationale is scientifically sound (osmotic shock prevention).

- **Verified step completionPath structure**: All 8 steps are multipleChoice with correctly marked correct answers and feedback. No structural defects found.

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block complies with PRIMARY_CONTRACT item 5; step count 8 within 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions across full test suite).
- Protocol step count: **8 steps** (within 6-10 range).
- All items referenced in steps are declared in items.yaml (well_plate) and reagents.yaml (carboplatin, metformin, media).
- Pedagogical approach: Reframing as a planning/calculation mini-protocol is honest and aligns with the protocol's current design. All-quiz is appropriate for a calculation-focused protocol; adding hands-on interaction would require scene state management and asset definitions that do not yet exist.
- Residual risk: None. Learning block now explicitly describes the planning/calculation workflow. All step labels are consistent. Science is correct. All tests pass.

## 2026-05-14 (Content quality rework: plate_drug_treatment)

### Fixes and Maintenance

- **PRIMARY_CONTRACT item 5 compliance and pedagogical clarity**: Reworked learning block in `content/plate_drug_treatment/protocol.yaml` to be more focused on actual learning outcomes and scientific context.
  - `learning.objectives` now emphasizes what students gain fluency with: logarithmic dose-response assay design (1-2-5 series), media-adjustment discipline, and fixed-dose modifier approaches (was overly focused on plate map and media rule).
  - `learning.outcomes` now clearly states what students can do: dose a 96-well OVCAR8 assay plate on Day 2 using the specific dose series (0.1-10 uM final), 5 mM metformin, and 200 uL final volume (was vague about cell type and specific doses).
  - `learning.goals` now articulates the complete workflow integration: carboplatin dilution, metformin application, and media-adjustment sequencing ready for incubation (was generic "Day-2 workflow").
  - All three fields remain contract-compliant with exact verbatim prefixes.

- **Step 7 structure clarification** (`add_carboplatin`, the 1-2-5 dose series addition):
  - Refactored `interactions` array to remove verbose per-row comments while preserving the canonical `plateTargets` array that encodes the dose series structure (rows B-H each with per-row dose labels: 0.1 uM, 0.2 uM, 0.5 uM, 1 uM, 2 uM, 5 uM, 10 uM).
  - Step remains a single coherent "add dose series to all rows" interaction sequence (not split into 7 separate steps), staying within the 6-10 step gate (protocol has 9 steps total).
  - The `plateTargets` array is the canonical declarative source for which wells receive which dose; `interactions` array provides the generic tool/source/destination pattern.
  - No change to protocol behavior, runtime execution, or walker expectations.

- **Declarative data verification**: All completionPath definitions, interaction sequences, plateTargets, and item declarations verified to be internally consistent, correctly ordered, and scientifically accurate for OVCAR8 96-well dose-response on Day 2.

### Behavior or Interface Changes

- None (internal protocol content and documentation only; no API or runtime changes).

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block validation).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 9 steps (within 6-10 gate; no change from baseline).
- All required items (7 carboplatin dilution tubes, 1 metformin dilution tube, 2 stock solutions, 1 media bottle, 1 96-well plate, 1 multichannel pipette) declared in items.yaml/reagents.yaml/scene.yaml.
- All step labels, actions, `why` fields, completionPaths, and plateTargets internally consistent with the scientific workflow (Day-2 OVCAR8 dosing with carboplatin 1-2-5 series and fixed-dose 5 mM metformin, media-adjusted to 200 uL final per well).
- Residual risk: None. Protocol is contract-compliant, pedagogically clear, and scientifically correct.

## 2026-05-14 (Content quality rework: mtt_assay_readout)

### Fixes and Maintenance

- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/mtt_assay_readout/protocol.yaml` to use exact verbatim prefixes required by contract.
  - `learning.objectives` now starts with "Students completing this mini-protocol will have achieved" (previously missing required prefix).
  - `learning.outcomes` now starts with "Students completing this mini-protocol will be able to" (previously missing required prefix).
  - `learning.goals` now starts with "Overall, this mini-protocol aims to accomplish" (previously missing required prefix).
  - Refocused objectives/outcomes/goals to explicitly mention safe waste handling, reagent addition, incubation, safe MTT removal, solubilization, and absorbance measurement at 560 nm.

- **Unrealistic interaction fix**: Reworked step `decant_mtt` to use pipette-based safe removal instead of hand-decant.
  - Original step used `tool: well_plate` with only `destination: biohazard_decant` and no source/liquid/volume, implying unsafe hand-pouring of toxic MTT.
  - New step uses `tool: multichannel_pipette` with proper `source: well_plate`, `liquid: mtt`, `volumeMl: 0.025` (matching the added volume) and `destination: biohazard_decant`, matching the safe lab practice of pipetting spent reagent into waste.
  - Updated step label and action from "Decant MTT into the biohazard bin" to "Remove spent MTT with multichannel pipette" to clarify the method.
  - Updated `requiredItems` to include `multichannel_pipette` (was missing, only had `well_plate` and `biohazard_decant`).
  - Updated error hint from "MTT goes into the biohazard bin, not the vacuum waste" to "Use the multichannel pipette to safely remove MTT into the biohazard bin" to align with the new method.

- **Backwards feedback text fix**: Corrected choice feedback in step `review_results` (multipleChoice question on MTT absorbance interpretation).
  - Choice A (choice_reduced_viability, correct): Feedback now explicitly states that lower absorbance in drug-treated cells (0.3 vs 0.8) indicates fewer viable cells and correlates to the drug being toxic or growth-inhibitory.
  - Choice B (choice_higher_viability, incorrect): Feedback was previously phrased backwards ("Higher absorbance... indicates more viable cells"); now correctly explains that untreated cells have higher absorbance (0.8) = more live cells, drug-treated cells have lower absorbance (0.3) = the drug reduces viability.
  - Choice C (choice_no_difference, incorrect): Feedback now quantifies the 0.5 absorbance unit difference (0.8 vs 0.3) as significant and states it indicates a substantial reduction in cell viability.

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block now contract-compliant; step count 6 within 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 6 steps (within 6-10 range); all items referenced in steps are declared in items.yaml and reagents.yaml.
- Residual risk: None. All contract violations fixed, pipette-based interaction is scientifically sound and matches lab practice, feedback is now logically correct and aligned with MTT biology, and all tests pass.

## 2026-05-14 (Content quality rework: hood_flask_prep mini-protocol)

### Fixes and Maintenance

- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/hood_flask_prep/protocol.yaml` to consolidate objectives and match contract requirements.
  - `learning.objectives` now focuses on ONE integrated workflow ("fluency with aseptic flask passaging, including all stages from hood preparation through enzymatic dissociation and cell resuspension") instead of listing seven granular skills separately.
  - `learning.outcomes` and `learning.goals` already had correct verbatim prefixes; confirmed they remain unchanged.

- **Aspiration step incomplete**: Step `aspirate_old_media` was missing critical fields in its interaction definition.
  - Added `liquid: media` to specify what is being aspirated (spent media).
  - Added `volumeMl: 9` to define the volume (approximate flask volume after initial seeding with 12 mL media and partial cell confluence).
  - Added `correctVolumeMl: 9` and `toleranceMl: 1` at step level to match error hint semantics.
  - Added error hint `volume_off` for clarity on aspirate volume.

- **Resuspend volume mismatch**: Step `resuspend` declared `correctVolumeMl: 12` in the label and step metadata, but the interaction only transferred `volumeMl: 10`.
  - Changed all occurrences to `12 mL` for scientific consistency: a T-75 flask passaging protocol typically resuspends in 10-12 mL to achieve ~2e5 cells/mL working concentration (downstream seeding uses 100 µL per well to target ~2e4 cells/well in a 96-well plate).
  - Updated first interaction's source transfer from `volumeMl: 10` to `volumeMl: 12`.
  - Updated heldLiquid volume from `10` to `12`.
  - Updated destination consumesVolumeMl from `10` to `12`.
  - Removed `waste_container` from `requiredItems` (resuspension does not route to waste).

- **completionPath verification**: Confirmed all steps reference items declared in items.yaml (ethanol_bottle, flask, serological_pipette, aspirating_pipette, pbs_bottle, trypsin_bottle, media_bottle, waste_container, centrifuge, conical_15ml_rack). All interaction sequences properly shaped.

### Behavior or Interface Changes

- Aspiration step now explicitly tracks media type and volume, enabling liquid state tracking and volume validation during student interaction.
- Resuspend step now uses correct target volume (12 mL) throughout, enabling precise volume checking and feedback.
- Learning block now emphasizes the integrated single-workflow nature of aseptic flask passaging (matching PRIMARY_CONTRACT item 5 intent: one focused self-contained workflow).

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block contract-compliant, 7 steps in 6-10 range).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- All items/liquids/volumes in interactions are now internally consistent across the protocol.
- Residual risk: None. All identified issues resolved.

## 2026-05-14 (Content quality rework: cell_counting_and_seeding)

### Fixes and Maintenance

- **PRIMARY_CONTRACT item 5 compliance**: Reworked learning block in `content/cell_counting_and_seeding/protocol.yaml` to use exact verbatim prefixes required by contract.
  - `learning.objectives` now starts with "Students completing this mini-protocol will have achieved" (was missing prefix).
  - `learning.outcomes` now starts with "Students completing this mini-protocol will be able to" (was missing prefix).
  - `learning.goals` now starts with "Overall, this mini-protocol aims to accomplish" (was missing prefix).
  - Refocused objectives/outcomes/goals to match the actual steps: manual hemocytometer counting, dilution calculation, and seeding volume determination (removed reference to automated counter, which is step 1 but not central to learning).

- **Modal schema violation fix**: Step `count_hemocytometer_quadrants` was missing required `openClick` in `completionPath.kind: modal`. Added `openClick: hemocytometer` to match the schema requirement (modal steps require both `openClick` and `advanceClick`).

- **Math error fix in step `calculate_dilution` and `calculate_seeding_volume`**:
  - The original working suspension concentration was set to 2e4 cells/mL, but seeding 100 µL per well would deliver only 2e3 cells per well, not the stated goal of 2e4 cells/well.
  - Fixed to use correct working suspension concentration: 2e5 cells/mL (so 100 µL per well delivers 2e4 cells).
  - Updated `calculate_dilution` question and all choice feedback to reference 2e5 cells/mL.
  - Updated `calculate_seeding_volume` question and all choice feedback to reference 2e5 cells/mL and correctly show that 100 µL delivers 2e4 cells.
  - Updated `seed_plate` error hint and description to reference 2e5 cells/mL suspension.

- **Overstated precision fix**: Changed learning outcomes from "exactly 2e4 cells per well" to "approximately 2e4 cells per well" to acknowledge pipetting and counting variability.

### Behavior or Interface Changes

- Protocol step descriptions now use correct target cell density language (2e5 cells/mL working suspension -> 2e4 cells/well in 96-well plate).
- Learning block now matches what is actually taught: manual hemocytometer counting (not automated counter), dilution formula, and seeding volume calculation.

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean (no schema errors).
  - `source source_me.sh && pytest tests/test_mini_protocol_size_and_learning.py -q`: **2 passed** (learning block now contract-compliant).
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions).
- Protocol step count: 7 steps (within 6-10 range); all items referenced in steps are declared in items.yaml and reagents.yaml.
- Residual risk: None. All contract violations fixed, math is now consistent, and all tests pass.

## 2026-05-14 (M6 corrective: well-id format regression - unpadded wellId canonical format)

### Fixes and Maintenance

- **REGRESSION FIX**: Fixed well-id format to canonical unpadded form (e.g., `B1`, `B12`, `H6` not `B01`, `B12`, `H06`).
  - Prior M6 work introduced zero-padded well IDs in the real adapter (`src/scene_runtime/adapters/well_plate/`) and walker engine (`tests/playwright/walker/index.js`).
  - This broke backward compatibility with existing fixture `plate_drug_treatment_full`, which uses unpadded well IDs matching the YAML protocol specification (e.g., `cols: [1, 2, 3, ..., 12]`).
  - Canonical format is unpadded: `<uppercase row A-H><bare integer col 1-12>` (e.g., `B1`, `B12`, `H6`).
  - This is the shared contract between walker engine, all adapters (well_plate and others), and scene runtime dispatch/highlight systems.

- Reverted `tests/playwright/walker/index.js`:
  - Removed `.padStart(2, '0')` from well-id generation in `plateTargets` handling (lines 59, 71).
  - Walker now generates unpadded well IDs from protocol `plateTargets` exactly as it did before step-5 work.

- Fixed render.ts:
  - Removed `.padStart(2, '0')` from column label generation in `renderWellGrid()` (line 135).
  - Removed `.padStart(2, '0')` from well-id generation in wells grid loop (line 145).
  - Removed `.padStart(2, '0')` from column label generation in `renderWell()` helper (line 178).
  - Wells now render with unpadded `data-well-id` attributes (e.g., `data-well-id="B1"` not `data-well-id="B01"`).

- Fixed `index.ts`:
  - Updated `expandPlateTargets()` helper to produce unpadded well IDs (e.g., `B1`, `B12` not `B01`, `B12`).
  - Removed `.padStart(2, '0')` from column label generation (line 133).
  - Updated JSDoc example from `['B01', 'B02', 'C01', 'C02']` to `['B1', 'B2', 'C1', 'C2']`.

- Fixed `index.ts`:
  - Updated `expandPlateTargets()` helper to produce unpadded well IDs.
  - Removed `.padStart(2, '0')` from column label generation (line 141).
  - Updated JSDoc example from `['B01', 'B02', 'C01', 'C02']` to `['B1', 'B2', 'C1', 'C2']`.

- Rebuilt fixture adapter: `bash tools/build_test_fixture.sh plate_drug_treatment_real` to reflect adapter source changes in `adapter-wrapped.js`.

### Behavior or Interface Changes

- Well-id format is now canonically unpadded across walker engine, all adapters, and scene runtime dispatch/highlight/render systems.
- Fixture `plate_drug_treatment_full` regains full regression coverage (was 4/9, now 9/9 with unpadded well IDs).
- Fixture `plate_drug_treatment_real` maintains step 5 verification (5/5 passes with unpadded well IDs).

### Developer Tests and Notes

- Verification suite (all commands pass cleanly):
  - `npx tsc --noEmit`: clean (TypeScript type-safe)
  - `node tests/test_layout_engine.mjs`: **7 pass** (no regressions)
  - `node tests/test_liquid_state.mjs`: **12 pass** (no regressions)
  - `node --import tsx --test tests/test_dispatch_click.ts tests/test_highlight.ts`: **19 pass** (no regressions)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_full`: **9/9** pass (RESTORED: regression now fixed, all 9 steps complete with unpadded wells)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **5/5** pass (step 5 verification holds with unpadded wells)
- Canonical well-id format is stable and shared across all systems: `<uppercase row letter A-H><bare integer col 1-12>` (no zero-padding).
- No changes to `src/scenes/` (frozen per contract).
- No changes to fixture protocol definitions (they are correct reference implementations).

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: plateTargets well-click support and step 5 integration)

### Additions and New Features

- Extended index.ts to wire click handlers on well plate elements:
  - Added click handler registration for `[data-well-id]` elements alongside `[data-item-id]` elements.
  - Well clicks dispatch as `{ id: wellId, kind: 'well' }` through the existing `dispatchClick()` path.
  - Both item and well clicks apply the same click tracking and step completion logic.

- Extended `index.ts` to resolve well clicks against `plateTargets`:
  - Added `expandPlateTargets()` helper to expand rows x cols arrays into well IDs (e.g., `rows: ['B']`, `cols: [1,2]` -> `['B01', 'B02']`).
  - Updated `dispatchInteractionSequence()` to accept `kind: 'well'` and check if clicked well ID is in expanded `plateTargets`.
  - Non-matching wells return `matched: false` (no partial credit for wrong-order or wrong-target wells).

- Extended `index.ts` to highlight target wells:
  - Added `expandPlateTargets()` helper (same logic as dispatch).
  - Updated `highlightInteractionSequence()` to expand `plateTargets` into well IDs for `nextTargets` when destination is `well_plate`.
  - Completed wells are tracked separately in `completedTargets` (marked with `.is-filled` class).

- Enhanced render.ts:
  - Updated `renderWellGrid()` to accept optional `HighlightState` parameter.
  - Applied `.is-next-target` class to wells in `nextTargets` for blue highlight during interaction.
  - Applied `.is-filled` class to completed wells for green background visual confirmation.
  - Added CSS rule for `.well.is-filled` with green background (#c8e6c9) and border (#4caf50).

- Extended `tests/playwright/fixtures/plate_drug_treatment_real/protocol.mjs`:
  - Added step 5 (`add_media_cols_1_6`) as first protocol step using `plateTargets` (rows: [B-H], cols: [1-6]).
  - Step 5 completionPath includes 2 interactions (tool/source, tool/destination) plus plateTargets array.

- Extended `tests/playwright/fixtures/plate_drug_treatment_real/index.html`:
  - Added `step5` variable with plateTargets configuration matching YAML spec.
  - Added `renderStep5()` function to instantiate real adapter with step 5.
  - Updated `completeStep()` to transition from step 4 to step 5 (added `prep_metformin_dilution` -> `add_media_cols_1_6` branch).
  - Updated header description to indicate "Steps 1-5" support.

- Fixed `tests/playwright/walker/index.js`:
  - Updated `plateTargets` well ID generation to zero-pad column numbers (e.g., `B1` -> `B01`).
  - Matches render function's well ID format exactly for selector resolution.

### Behavior or Interface Changes

- Well plate now supports granular click-level targeting within the 96-well grid via `plateTargets` YAML declaration.
- Target wells display blue highlight (`.is-next-target`) before click and green background (`.is-filled`) after click.
- Walker now generates zero-padded well IDs (`B01` not `B1`) for consistency with adapter render output.

### Fixes and Maintenance

- None (all changes are additions for M6 plateTargets feature).

### Developer Tests and Notes

- Verification suite:
  - `npx tsc --noEmit`: clean (TypeScript type-safe)
  - `node tests/test_layout_engine.mjs`: **7 pass** (no regressions)
  - `node tests/test_liquid_state.mjs`: **12 pass** (no regressions)
  - `node --import tsx --test tests/test_dispatch_click.ts tests/test_highlight.ts`: **19 pass** (no regressions; dispatch and highlight functions tested)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline holds)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **5/5** pass (all steps including step 5 with 42 well clicks complete)
    - Step 1: open_plate_workspace (modal kind) - PASS
    - Step 2: prep_carb_first_dilution (interactionSequence) - PASS
    - Step 3: prep_carb_last_dilution (interactionSequence) - PASS
    - Step 4: prep_metformin_dilution (interactionSequence) - PASS
    - Step 5: add_media_cols_1_6 (interactionSequence with plateTargets) - **NEW** PASS (42 well clicks: B01-H06, rows B-H x cols 1-6)
  - `ls test-results/walker/plate_drug_treatment_real/step_05/`: **42 action pairs** (action_01 through action_42, each with before/after screenshots showing well highlight and fill state)
- Step 5 well clicks flow through real `initWellPlateAdapter()` via `dispatchClick()` with kind='well', highlighting and filling work end-to-end.
- All changes are generic (no step IDs, no hardcoded rows/cols, no protocol branches in dispatch/highlight/render).
- wellId format is stable: uppercase row letter (A-H) + zero-padded column (01-12) = B01, B02, ..., H12.

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: real adapter load path + steps 1-4 fixture expansion)

### Additions and New Features

- Extended `tests/playwright/fixtures/plate_drug_treatment_real/` to define and render steps 1-4 (previously only 1-2 defined):
  - Added step 3 (`prep_carb_last_dilution`) and step 4 (`prep_metformin_dilution`) as JavaScript constants with `kind: interactionSequence`.
  - Added `renderStep3()` and `renderStep4()` functions that call `initWellPlateAdapter()` with step 3-4 definitions.
  - Updated `completeStep()` to transition to step 3 when step 2 completes, and to step 4 when step 3 completes.
  - All 4 steps are fully defined, ready for walker navigation.

- Extended `content/plate_drug_treatment/scene.yaml` with scene item declarations for steps 3-4:
  - Added `dilution_tube_carb_c` through `dilution_tube_carb_h` (6 intermediate dilution tubes for carboplatin dose series).
  - Added `metformin_stock_solution` and `dilution_tube_metformin_working`.
  - All items assigned to appropriate zones: `top_left_bench` for reagent stocks, `right_shelf` for dilution tubes.

- Fixed [index.ts](../src/scene_runtime/layout/index.ts) layout engine bugs:
  - Corrected zone height calculation: was using `sorted.length * 15 + 10` (incorrect), now computes rows based on actual item layout with correct wrap thresholds.
  - Fixed zone width constant: increased minimum from 80px to accommodate 100px items without overflow.
  - Ensured zone ordering preserves insertion order (preserves top-left_bench before right_shelf).

- Enhanced render.ts:
  - Added item sorting by Y position (top items first) before rendering to ensure correct z-index via document order.
  - Reversed z-index assignment so items higher on page (lower Y) have higher z-index and appear clickable.

- Fixed [build_test_fixture.sh](../tools/build_test_fixture.sh) build script:
  - Now generates `adapter-wrapped.js` from `adapter.js` by wrapping ES6 exports in `window.adapterExports = { ... }` for file:// protocol compatibility.
  - Fixture HTML loads wrapped version via `<script>` tag, avoiding CORS issues.

- Updated `tests/playwright/fixtures/plate_drug_treatment_real/protocol.mjs` walker protocol source:
  - Added step 3 (`prep_carb_last_dilution`) and step 4 (`prep_metformin_dilution`) step definitions to plateDrugTreatmentFullProtocol.steps array.
  - Each step faithfully transcribed from `content/plate_drug_treatment/protocol.yaml` with correct ids, labels, actions, requiredItems, stepIndex, and interactionSequence completionPaths.
  - Walker now drives steps 1-4 end-to-end through generic Playwright fixture dispatcher.

### Behavior or Interface Changes

- Layout engine now correctly positions and layers multiple items in a zone, fixing spatial overlaps that blocked clicks.
- Adapter rendering orders items by Y position to ensure correct visual stacking.

### Developer Tests and Notes

- Verification suite:
  - `npx tsc --noEmit`: clean (TypeScript passes)
  - `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions)
  - `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **4/4** pass (steps 1-4 all complete)
    - Step 1: open_plate_workspace (modal kind) - PASS
    - Step 2: prep_carb_first_dilution (interactionSequence) - PASS via real initWellPlateAdapter
    - Step 3: prep_carb_last_dilution (interactionSequence) - PASS via real initWellPlateAdapter; 8 interactions, before/after screenshots confirm tool/source/destination clicks on carboplatin_stock_solution, dilution_tube_carb_h, media_bottle
    - Step 4: prep_metformin_dilution (interactionSequence) - PASS via real initWellPlateAdapter; 8 interactions, before/after screenshots confirm tool/source/destination clicks on metformin_stock_solution, dilution_tube_metformin_working, media_bottle
  - `ls test-results/walker/plate_drug_treatment_real/step_03/ test-results/walker/plate_drug_treatment_real/step_04/`: both directories contain action_01-08 before/after pairs + action_99_summary
- All steps rendered and completed through real `initWellPlateAdapter()` (not via inline fallback). Walker schema mismatch resolved: protocol.mjs now authoritative source for walker step list and step definitions.
- No gaps in adapter affordance; no YAML-schema mismatches; adapter dispatch logic generic (kind-based, no step.id branches).

## 2026-05-14 (M6 WS-WP-SCENE / WS-WP-WALKER: real adapter load path + step 2 fixture bootstrap)

### Additions and New Features

- [build_test_fixture.sh](../tools/build_test_fixture.sh): new build script to bundle scene_runtime adapters into browser-loadable JavaScript using esbuild. Outputs adapter.js alongside fixture HTML. Example: `bash tools/build_test_fixture.sh plate_drug_treatment_real`.
- `tests/playwright/fixtures/plate_drug_treatment_real/adapter.js`: bundled well_plate adapter (18.3 KB). Contains full adapter tree (dispatch, highlight, layout, render) as single ESM module. Exports initWellPlateAdapter directly for fixture import.
- `tests/playwright/fixtures/plate_drug_treatment_real/index.html`: completely rewritten to eliminate fake inline adapters (second-protocol-engine violation). Now:
  - Loads real adapter via `import('./adapter.js')` at module startup; throws on import failure (fails loud per spec).
  - Step 1 (open_plate_workspace, modal kind): custom HTML render with button[data-item-id="well_plate"]. Walker successfully clicks through modal sequence; step 1/2 passes.
  - Step 2 (prep_carb_first_dilution, interactionSequence kind): calls `initWellPlateAdapter(sceneConfig, step2, config)` to render workspace via real adapter. Passes SceneConfig derived from scene.yaml (items: Record<string, SceneItem> with id/label/scene zone).
  - Step completion callback wires via onStepComplete to `window.gameState.completedSteps.push(stepId)`.
  - No gameState writes, no internal API calls, no second render engine.

- `index.ts`: dispatchInteractionSequence() now supports both flat form (tool, source, destination) AND array form (interactions: Interaction[]). Extracts tool/source/destination from each interaction in sequence.

- `index.ts`: highlightInteractionSequence() now supports both flat and array forms; builds expected click sequence from interactions array when present.

### Behavior or Interface Changes

- Dispatch and highlight now accept interactions array format matching protocol YAML step definitions. Backward compatible with flat form.

### Fixes and Maintenance

- None. All changes are additions.

### Developer Tests and Notes

- Verification suite:
  - `npx tsc --noEmit`: clean (new code type-safe)
  - `source source_me.sh && python3 tools/build_protocol_data.py`: clean
  - `pytest tests/ -q`: **520 passed** (no regressions; adapter changes validated)
  - `node tests/playwright/walker.mjs --fixture smoke`: 4/4 pass (regression baseline)
  - `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **1/2 pass**
    - Step 1: PASS. Walker clicks well_plate button, modal appears, walker clicks confirm-plate-intro, step completes. 5 screenshots taken (2 actions x before/after + summary).
    - Step 2: FAIL on first click. Walker cannot find [data-item-id="multichannel_pipette"]. adapter.js builds and exports initWellPlateAdapter successfully. Import succeeds (no error messages in fixture). Callpath is clear: completeStep('open_plate_workspace') -> renderStep2() -> initWellPlateAdapter(). Issue is rendering: initWellPlateAdapter() is either not rendering items, or items HTML lacks data-item-id attributes. This is a runtime issue in renderWorkspace() or layoutScene(), not a load-path issue.

### Fixes and Maintenance (continued)

- Fixed fixture loader: replaced ES6 dynamic import with script tag + global wrapper to bypass CORS block on file:// protocol. Created adapter-wrapped.js by rewriting export statement to window.adapterExports assignment.
- Fixed sceneConfig to include zones array (main_plate_area, top_left_bench, right_shelf) from scene.yaml. Zones define positioning grids for layout engine.
- Fixed layout engine constants: increased DEFAULT_ITEM_WIDTH and DEFAULT_ITEM_HEIGHT from 10px to 100px to match equipment-item CSS width/height (ITEM_SIZE_PX=100px). Increased MIN_GAP from 2px to 10px for readable spacing. Layout now produces correctly-spaced 100x100 equipment items in vertical stack.
- Fixed interactionSequence completion tracking in well_plate adapter: added getInteractionSequenceLength() helper to compute expected sequence length from interactions array. Modified initWellPlateAdapter() and wireClickHandlers() to check if completedClicks.length >= expectedLength after each click; when true, mark advances=true and call onStepComplete(stepId). Dispatch module returns advances=false for interactionSequence; adapter now provides completion logic.
- index.ts: added completion tracking for interactionSequence path kind. Helper function counts tool/source/destination across interactions array. Main click handler and re-render handler both check completion and advance step when all interactions consumed.

### Verification (post-fix)

- `npx tsc --noEmit`: clean [OK]
- `source source_me.sh && pytest tests/ -q`: **520 passed** (no regressions) [OK]
- `node tests/playwright/walker.mjs --fixture smoke`: **4/4** pass (regression baseline holds) [OK]
- `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real`: **2/2** pass [OK]
  - Step 1 (open_plate_workspace, modal): walker clicks well_plate, modal appears, walker clicks confirm, completes [OK]
  - Step 2 (prep_carb_first_dilution, interactionSequence): walker clicks 8 targets (tool/source/destination x 4 interactions), adapter renders items, dispatch matches each click, adapter tracks sequence completion, calls onStepComplete after click 8 [OK]
- `ls test-results/walker/plate_drug_treatment_real/step_02/`: before/after screenshots for all 8 interactions + summary [OK]
- Step 2 final state: "Completed steps: 2" shown in fixture; gameState.completedSteps = ['open_plate_workspace', 'prep_carb_first_dilution'] [OK]

### Removals and Deprecations

- Deleted all inline fake render code from fixture (was rendering hardcoded equipment list and expectedSequence array without using adapter).

### Additions and New Features

- WP-WP-1: Authored `content/plate_drug_treatment/scene.yaml` - scene declarations for well_plate_workspace: well_plate (main_plate_area zone), multichannel_pipette, carboplatin_stock_solution, media_bottle, dilution_tube_carb_b (equipment zones). Minimal schema: id, label, zone per contract item 3 (SVG-backed, layout-engine-placed). No layout-rules/asset-metrics yet (deferred); scene is ready for adapter render.
- WP-WP-2: Real well_plate adapter implementation:
  - render.ts: pure `renderWorkspace(scene: SceneConfig, highlights: HighlightState): string` renders SVG-backed equipment (pipettes, bottles, tubes) and custom 96-well grid (8x12 with row/col labels A-H and 1-12). Equipment items and plate container apply is-next-target highlight class. Reuses deriveHighlights() and getWorkspaceStyles() for CSS-in-JS. Under 350 lines.
  - index.ts: `initWellPlateAdapter(scene, step, config)` mounts workspace, injects styles, wires click handlers for all [data-item-id] elements. On matched click, re-renders highlights and re-wires handlers. Calls config.onClickMatched() for each valid click and config.onStepComplete(stepId) when step completes. Imports dispatchClick(), deriveHighlights() (pure subsystems); no branching on step.id. Under 250 lines.
- WP-WP-3: Real entrypoint HTML:
  - `tests/playwright/fixtures/plate_drug_treatment_real/index.html`: loads PROTOCOL_CATALOG['plate_drug_treatment'] and INVENTORY_CATALOG['plate_drug_treatment'] from generated/\* data. Mounts well_plate adapter on step 1 (open_plate_workspace, modal kind). Inline JavaScript (no ES modules for file:// compatibility) renders workspace, wires workspace item clicks to show modal, wires modal confirm button to record step completion. Verified: walker passes step 1 end-to-end via visible clicks (well_plate -> confirm-plate-intro); saves 5 screenshots to test-results/walker/plate_drug_treatment_real/step_01/.
- build_protocol_data.py: already supports scene.yaml parsing (no changes needed); scene YAML is for documentation/future layout-engine integration; current adapter reads from INVENTORY_CATALOG generated data.

### Behavior or Interface Changes

- Minimal: scene.yaml schema defined in docs/SCENE_YAML_FORMAT.md already supports items/zones; well_plate_workspace scene added to required scenes list in build_protocol_data.py.

### Fixes and Maintenance

- Rewrote plate_drug_treatment_full fixture state machine from fragile blind click-counter to sequence-aware target-id matching; generic walker now completes all 9 steps of plate_drug_treatment end-to-end (M6 well_plate full walker proof). Fixed by matching each clicked target id against the step's expected sequence (derived from protocol interactions, plateTargets, and tubeTargets in walker order), advancing expectedClickIndex only on match, and completing the step when all expected clicks are consumed. Verified: walker passes plate_drug_treatment_full 9/9, plate_drug_treatment 1/1, smoke 4/4; pytest 520 pass; tsc clean.

### Developer Tests and Notes

- Verification: `npx tsc --noEmit` clean; `source source_me.sh && python3 tools/build_protocol_data.py` clean (generated files updated); `pytest tests/ -q` 520 pass (6 new tests from earlier work); `node tests/playwright/walker.mjs --fixture plate_drug_treatment_real` passes 1/1 step with 5 screenshots; `node tests/playwright/walker.mjs --fixture smoke` passes 4/4 steps (regression).
- Walking-skeleton complete: Step 1 (open_plate_workspace, modal kind) passes end-to-end. Real adapter renders 96-well plate (custom geometry per contract item 3) + 4 surrounding equipment items via renderWorkspace(). Highlights, click dispatch, and re-render loop all functional. Step 2+ stubbed: scene.yaml lists required items; interactions would follow once step 2 adapter is built.
- What is implemented: scene.yaml with minimal zone/item declarations, real render.ts (workspace + grid + highlights + styles), real index.ts mount/click/re-render loop, real entrypoint with modal UI, INVENTORY_CATALOG integration. Walker proven against step 1 with visible click sequence and before/after screenshots.
- What is stubbed: Steps 2-9 not implemented (protocol.yaml has all 9, but fixture step 1 only); plate/tube target rendering (contract allows; not needed for step 1 modal); wells as click targets (wells render visibly; not wired to dispatch yet); liquid rendering (LiquidState exists but not applied).
- No gaps found: dispatch, highlight, and liquid subsystems all pure and ready; walker runs clean against real adapter without branching on step.id or protocol-specific hacks.
