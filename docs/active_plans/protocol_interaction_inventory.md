# Protocol interaction inventory

This is the M1 evidence artifact for the unified interaction vocabulary plan
([unified_interaction_vocabulary_plan.md](unified_interaction_vocabulary_plan.md)).
It is the single source of truth for what scene interactions exist across all
inputs: the 7 shipped `content/*/protocol.yaml` files, the legacy
`src/interaction_resolver.ts` action model, and the four source protocol docs.

It is evidence, not design. The design work (the base-action set, the
composition rule, the mode definitions) happens in M2. Step-level details here
are formalized from the investigation that produced the plan and are subject
to verification during M3 ratification.

## The model being inventoried against

The plan's working model: an interaction is `target + mode + action`.

- `target` -- a scene object or control that receives the student's
  interaction.
- `mode` -- how the student inputs. `click` (the simple mode) or `dial` (the
  continuous, skill-based set-point mode: volume, voltage, pH-to-target).
- `action` -- what the interaction does. A class hierarchy in the vocabulary
  sense: a small ratified set of base primitive actions, plus composed actions
  built by composing one or more base primitives. Composed actions are grouped
  into author-facing categories.

This inventory tags every step against that model so M2 can design the base
set and M3 can ratify it.

## Part 1: Click-target fields in the shipped content

Seven `content/*/protocol.yaml` files, 54 steps total
(`cell_culture_full` is a `sequence_runner` with an empty `steps` array).

### completionPath.kind distribution

| kind | steps |
| --- | --- |
| interactionSequence | 34 |
| multipleChoice | 8 |
| modal | 6 |
| directTool | 6 |

### Distinct click-target fields

| Field | Appears under | Rough usage |
| --- | --- | --- |
| `tool` | `directTool`, `interactionSequence.interactions[]` | ~45 steps |
| `source` | `interactionSequence.interactions[]` | ~30 steps |
| `destination` | `interactionSequence.interactions[]` | ~30 steps |
| `openClick` | `modal` | 6 steps |
| `advanceClick` | `modal` | 6 steps |
| `choices[].id` | `multipleChoice` | 8 steps |
| `plateTargets` | `interactionSequence` | 3 files, ~6 steps |
| `tubeTargets` | `interactionSequence` | 1 file, 3 steps (BROKEN) |

### Event and state fields

| Field | Level | Notes |
| --- | --- | --- |
| `completionEvent` | step and interaction | one per step, on the final interaction |
| `stateChange.heldLiquid` | interaction (load only) | ~30 interactions; `{tool, liquid, volumeMl, colorKey}` |
| `consumesVolumeMl` | interaction (discharge) | ~30 interactions |
| `isIncubation` | step | 5 steps; inconsistently applied |

### interactionSequence.interactions[] object fields

`tool`, `source`, `destination`, `liquid`, `volumeMl`, `stateChange`,
`heldLiquid` (nested), `consumesVolumeMl`, `completionEvent`, `colorKey`
(nested in `heldLiquid`).

## Part 2: The 54-step mapping (shipped content)

Every step mapped to `target + mode + action`. As shipped, every current step
runs in `click` mode -- `dial` mode does not exist in the runtime yet. The
"new-model mode" column flags steps the unified model would move to `dial`
(volume set-points). Composed-action category names are provisional input to
M2, not a ratified vocabulary.

### cell_counting_and_seeding (8 steps)

| Step id | kind | clicks: (target, action) | new-model mode | completion |
| --- | --- | --- | --- | --- |
| count_cells | modal | (cell_counter, popup/open), (capture-count, popup/confirm) | click | capture-count |
| load_hemocytometer | modal | (microscope, popup/open), (confirm-viability, popup/confirm) | click | confirm-viability |
| count_hemocytometer_quadrants | modal | (hemocytometer, popup/open), (submit-cell-count, popup/confirm) | click | submit-cell-count |
| calculate_dilution | multipleChoice | (choice, question/answer) | click | dilution-factor-calculated |
| calculate_seeding_volume | multipleChoice | (choice, question/answer) | click | seeding-volume-calculated |
| seed_plate | interactionSequence | (serological_pipette, liquid/take), (flask, liquid/draw), (well_plate, liquid/dispense) | dial (volume) | pipette_to_plate |
| incubate_day1 | directTool | (incubator, equipment/use) | click | place_in_incubator |

### cell_culture (24 steps)

| Step id | kind | clicks: (target, action) | new-model mode | completion |
| --- | --- | --- | --- | --- |
| spray_hood | directTool | (ethanol_bottle, liquid/spray) | click | spray_ethanol |
| aspirate_old_media | interactionSequence | (aspirating_pipette, liquid/take), (flask, liquid/aspirate -> waste_container) | click | aspirate |
| pbs_wash | interactionSequence | take, draw(pbs_bottle), dispense(flask) | dial (volume) | pbs_wash |
| add_trypsin | interactionSequence | take, draw(trypsin_bottle), dispense(flask) | dial (volume) | pipette_trypsin |
| neutralize_trypsin | interactionSequence | take, draw(media_bottle), dispense(flask) | dial (volume) | pipette_media |
| centrifuge | directTool | (centrifuge, equipment/use) | click | centrifuge |
| resuspend | interactionSequence | take, draw(media_bottle), dispense(flask) | dial (volume) | resuspend |
| count_cells | modal | (cell_counter, popup/open), (capture-count, popup/confirm) | click | count-cells-capture |
| seed_plate | interactionSequence | take, draw(flask), dispense(well_plate) | dial (volume) | pipette_to_plate |
| incubate_day1 | directTool | (incubator, equipment/use) | click | place_in_incubator |
| carb_intermediate | interactionSequence | take, draw(carboplatin_stock), dispense(tube), draw(sterile_water), dispense(tube) | dial (volume) | carb_intermediate_complete |
| carb_low_range | interactionSequence | fan-out: 7 tubes, each draw+dispense pair x2 | dial (volume) | carb-low-range-confirm |
| metformin_stock | interactionSequence | take, draw(metformin_stock_bottle), dispense(tube), draw(media_bottle), dispense(tube) | dial (volume) | metformin-stock-prepare |
| prewarm_media | directTool | (water_bath, equipment/use) | click | prewarm |
| media_adjust | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out via plateTargets | dial (volume) | media_adjust |
| add_carboplatin | interactionSequence | fan-out: 7 rows, each draw(carb tube)+dispense(well_plate) | dial (volume) | carb-add-confirm |
| add_metformin | interactionSequence | take, draw(metformin tube), dispense(well_plate) -- fan-out via plateTargets | dial (volume) | metformin-add-confirm |
| incubate_48h | directTool | (incubator, equipment/use) | click | place_in_incubator_48h |
| add_mtt | interactionSequence | take, draw(mtt_vial), dispense(well_plate) | dial (volume) | add_mtt |
| incubate_mtt | directTool | (incubator, equipment/use) | click | place_in_incubator_mtt |
| decant_mtt | interactionSequence | (well_plate, liquid/pour -> biohazard_decant) | click | decant_mtt |
| add_dmso | interactionSequence | take, draw(dmso_bottle), dispense(well_plate) | dial (volume) | add_dmso |
| plate_read | modal | (plate_reader, popup/open), (complete-plate-read, popup/confirm) | click | plate-read-complete |
| results | modal | (plate_reader, popup/open), (modal-close, popup/confirm) | click | results-finalize |

### cell_culture_full (sequence_runner)

Empty `steps`. Chains the five constituent mini-protocols; contributes no
interaction steps.

### drug_dilution_setup (8 steps)

All 8 steps are `multipleChoice`, one `(choice, question/answer)` click each,
mode `click`. Steps: `calc_carb_stock`, `calc_carb_working_b`,
`calc_carb_series`, `calc_carb_low_range`, `calc_metformin_stock_prep`,
`calc_metformin_final`, `prewarm_media_check`, `planning_summary`. Completion
events: `<step_id>_done`.

### hood_flask_prep (7 steps)

| Step id | kind | clicks: (target, action) | new-model mode | completion |
| --- | --- | --- | --- | --- |
| spray_hood | directTool | (ethanol_bottle, liquid/spray) | click | spray_ethanol |
| aspirate_old_media | interactionSequence | take(aspirating_pipette), aspirate(flask -> waste_container) | click | aspirate |
| pbs_wash | interactionSequence | take, draw(pbs_bottle), dispense(flask) | dial (volume) | pbs_wash |
| add_trypsin | interactionSequence | take, draw(trypsin_bottle), dispense(flask) | dial (volume) | pipette_trypsin |
| neutralize_trypsin | interactionSequence | take, draw(media_bottle), dispense(flask) | dial (volume) | pipette_media |
| centrifuge | directTool | (centrifuge, equipment/use) | click | centrifuge |
| resuspend | interactionSequence | take, draw(media_bottle), dispense(flask) | dial (volume) | resuspend |

### mtt_assay_readout (5-6 steps)

| Step id | kind | clicks: (target, action) | new-model mode | completion |
| --- | --- | --- | --- | --- |
| add_mtt | interactionSequence | take, draw(mtt_vial), dispense(well_plate) | dial (volume) | add_mtt |
| incubate_mtt | directTool | (incubator, equipment/use) | click | place_in_incubator_mtt |
| decant_mtt | interactionSequence | take(multichannel_pipette), aspirate(well_plate -> biohazard_decant) | click | decant_mtt |
| add_dmso | interactionSequence | take, draw(dmso_bottle), dispense(well_plate) | dial (volume) | add_dmso |
| plate_read | modal | (plate_reader, popup/open), (complete-plate-read, popup/confirm) | click | plate-read-complete |
| review_results | multipleChoice | (choice, question/answer) | click | results_interpreted |

### plate_drug_treatment (9 steps)

| Step id | kind | clicks: (target, action) | new-model mode | completion |
| --- | --- | --- | --- | --- |
| open_plate_workspace | modal | (well_plate, popup/open), (confirm-plate-intro, popup/confirm) | click | plate-workspace-opened |
| prep_carb_first_dilution | interactionSequence | take, draw(carboplatin_stock_solution), dispense(dilution_tube_carb_b), draw(media_bottle), dispense(dilution_tube_carb_b) | dial (volume) | carb_first_dilution_done |
| prep_carb_last_dilution | interactionSequence | take, draw(carboplatin_stock_solution), dispense(dilution_tube_carb_h), draw(media_bottle), dispense(dilution_tube_carb_h) | dial (volume) | carb_last_dilution_done |
| prep_metformin_dilution | interactionSequence | take, draw(metformin_stock_solution), dispense(dilution_tube_metformin_working), draw(media_bottle), dispense(dilution_tube_metformin_working) | dial (volume) | metformin_dilution_done |
| add_media_cols_1_6 | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out plateTargets rows B-H cols 1-6 | dial (volume) | media-cols-1-6-confirm |
| add_media_cols_7_12 | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out plateTargets rows B-H cols 7-12 | dial (volume) | media-cols-7-12-confirm |
| add_carboplatin | interactionSequence | fan-out: 7 rows, each draw(carb tube)+dispense(well_plate) | dial (volume) | carb-add-confirm |
| add_metformin | interactionSequence | take, draw(metformin tube), dispense(well_plate) -- fan-out plateTargets rows B-H cols 7-12 | dial (volume) | metformin-add-confirm |
| review_loaded_plate | modal | (well_plate, popup/open), (confirm-loaded-plate, popup/confirm) | click | review-loaded-plate |

### Fan-out steps

Eight steps apply one action to a target set (the `plateTargets` /
`tubeTargets` cases): `cell_culture` `carb_low_range`, `media_adjust`,
`add_carboplatin`, `add_metformin`; `plate_drug_treatment`
`add_media_cols_1_6`, `add_media_cols_7_12`, `add_carboplatin`,
`add_metformin`. Under the unified model, fan-out is a step whose required
interactions target a set the scene adapter expands; it is not a new action.

## Part 3: The legacy interaction_resolver.ts action model

The legacy `src/interaction_resolver.ts` already derived a click-level action
model. It is the strongest existing precedent for "the action is derived from
click context, not hand-declared."

### InteractionResult.kind

`'no-op' | 'load' | 'discharge' | 'error' | 'wrong_order'`

- `no-op` -- no interaction matched; click ignored.
- `load` -- held-liquid state updated (resultActor, resultLiquid, volumeMl,
  colorKey).
- `discharge` -- held liquid applied to a destination; the step may complete.
- `error` -- invalid action; a hint is shown.
- `wrong_order` -- a precondition failed (tool not selected, liquid mismatch,
  out-of-sequence click).

### resolveInteraction inputs

`resolveInteraction({ selectedTool, clickedItem, activeStep, heldLiquid? })`.
It walks `step.completionPath.interactions` and matches on the shape of the
interaction: `source + destination` -> discharge; `source` only -> load;
`destination` only -> discharge. `resolveInteractionByIndex` enforces
tool-first sequencing via `interactionIndex` and returns `indexDelta` (0 for a
tool select, 1 for a completed interaction) plus a `wrongOrder` flag.

### Related game_state machinery

`triggerStep(stepId)`, `completeStep(stepId)`, `switchScene(sceneId)`,
`registeredEmitters` (a `Set` of wired step ids, for coverage validation),
`wrongOrderClicks` (a scored counter), `interactionIndex` (position in the
current step's interaction list), `activeStepId`, `completedSteps`,
`heldLiquid`.

### What the legacy model did well

It derived `load` / `discharge` from the interaction shape rather than making
the author hand-declare them. The K2 `completionPath.kind` refactor lost this
and pushed action semantics into structural YAML conventions plus
hand-authored `stateChange`. The unified model should recover the
derive-don't-declare property.

## Part 4: Source-protocol mappings

The four source protocols, mapped to `target + mode + action`. OVCAR8 is
complete; Miraculin and SDS-PAGE are rough drafts with stubbed sections (see
Part 7). Composed-action category names are provisional input to M2.

### OVCAR8 (docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md)

Maps cleanly. Distinct interaction shapes observed:

- Liquid handling: aspirate-to-waste, wash (aspirate then refill), draw +
  dispense, resuspend (draw + dispense + mix), decant/pour to biohazard,
  pipette-mix (up and down).
- Solids: dissolve MTT powder in PBS.
- Equipment: centrifuge, incubator (timed), cell counter (produces data),
  plate reader (produces data at 560 nm).
- Objects: transfer to a conical tube, load a counting-chamber slide, pat
  plate dry.
- Modes: most pipetting volumes (5 &micro;L per well, the dilution-table
  volumes) are `dial`-mode set-points under the unified model. Reading
  absorbance and capturing a cell count are `equipment` actions whose effect
  is recorded data.
- Notable shapes the four `kind`s do not express well: timed incubations
  (24 h, 48 h, 1.5 h), the calculation-gated dilution table (Part 4), 96-well
  fan-out, and instrument readings that produce data.

### Miraculin (docs/Miraculin_Protocol_2026.md)

Only the "Experimental Procedure" reverse-micelle core (Preparing Berry
Extract, Stage 1 Forward Extraction, Stage 2 Backward Extraction) and Part 2
have real procedure text. Distinct interaction shapes:

- Solids: grind berries (coffee grinder), dissolve / homogenize powder.
- Liquid handling: draw, dispense, mix phases, pour off a phase.
- Equipment: centrifuge (produces phase separation), shaker (timed
  agitation, 10 and 20 min).
- `choose`: after centrifugation the tube holds two phases; the student picks
  which phase to keep (discard the bottom aqueous, retain the top organic; or
  retain the bottom aqueous). One input, two outputs, pick one.
- `dial`: pH adjustment to a target (2.5 M NaOH and 0.1 M HCl to pH 8.0) is a
  titration-to-target -- a continuous skill-based set-point.
- Stubbed: column chromatography (Parts 5-7) would add load-onto-column,
  wash, elute, collect-fractions shapes; cannot be mapped until written.

### SDS-PAGE (docs/SDS-PAGE_Protocol_2026.md)

Parts 1-10 plus Pre-Laboratory Parts 1-4. Assembly-heavy. Distinct
interaction shapes:

- Objects: remove tape, remove glass wall, place gel cassette, orient
  cassette, attach side clamps, remove comb, pry the gel from the cassette,
  move the staining tray to the shaker -- multi-part ordered assembly where
  order matters.
- Liquid handling: dilute buffer, mix sample (BME + Laemmli + protein), load
  a well, pour buffer, pour stain / destain.
- Equipment: heat block (timed, 95 C), power supply (runs the gel),
  microwave, shaker, light box.
- `dial`: setting the voltage (150 V or 200 V) is a continuous-parameter
  set-point under the unified model -- not a `question`-family popup.
- `question`: the Bradford calculation-gated loading volume
  (OD595 -> &micro;g/mL -> &micro;L) is a knowledge question.
- Notable shapes the four `kind`s do not express well: multi-part ordered
  assembly with a leak-inspection gate, the timed run with a visual or
  timer-based stop condition, and the iterative destain loop.

## Part 5: Candidate base primitive actions

Base primitive actions are the smallest protocol-visible interaction effects.
This is the candidate set the investigation surfaced; M2 (WP-ACT1) ratifies
the initial set.

| Candidate primitive | What it does |
| --- | --- |
| `SvgSwap` | swap one SVG asset for another (berries -> powder, gel -> stained gel) |
| `ColorChange` | change a fill or color (liquid color in a well, an indicator) |
| `CursorAttach` | a picked-up tool follows the cursor; attach or detach cursor state |
| `SceneChange` | transition the scene context |
| `LayoutMove` | move or re-layout a scene object (assembly: cassette into tank) |

Open question for M2: whether the duration of a timed `equipment` action and
the recorded output of a `read` action are base primitives, properties, or
effects. Flagged as a residual gap (Part 8).

## Part 6: Candidate composed-action categories

Composed actions are built from base primitives and grouped into author-facing
categories. These categories are provisional input to M2 (WP-ACT1), not a
ratified vocabulary.

| Category | Composed actions seen across the four protocols |
| --- | --- |
| `liquid` | take, draw, dispense, aspirate, mix, pour, spray |
| `equipment` | run / use, incubate, shake, heat, read |
| `object` | place, attach, remove, move, pry |
| `choose` | pick a phase, pick a fraction |
| `popup` | open, confirm |
| `question` | answer a knowledge question (not parameter-setting) |
| `navigate` | enter a scene |

The earlier `solid` category was dropped: grinding berries to powder appears
to reduce mainly to an `equipment` action with an `SvgSwap` effect. M2 should
confirm whether any solid-handling case needs a base primitive beyond
`SvgSwap`.

## Part 7: Candidate mode set

| Mode | Meaning |
| --- | --- |
| `click` | the simple mode -- click a target. All 54 shipped content steps use it. |
| `dial` | the continuous, skill-based set-point mode -- volume, voltage, pH-to-target. Does not exist in the runtime yet; required by OVCAR8 pipetting volumes, SDS-PAGE voltage, Miraculin pH titration. |

`dial` resolves the three coverage gaps the investigation flagged (continuous
voltage, volume set-point, pH titration); they are not `question`-family
popups. OQ-1 in the plan asks whether two modes are enough or a third (for
example a `drag` mode for moving an object along a path during assembly) is
needed.

## Part 8: Residual gaps

Genuine gaps the investigation flagged, not yet designed. M2 must give each a
written disposition.

- Iterative loop: a step that repeats until a state condition rather than a
  fixed interaction count -- for example SDS-PAGE destaining until the
  background is clear. No current construct expresses "repeat until X".
- Timed-wait visualization: duration as a property of `equipment` actions
  (incubate 48 h, shake 10 min, run gel 25 min, heat 95 C). The investigation
  treats duration as a property the scene shows, not a vocabulary word, but
  the start / progress / completion event model around it is undesigned.
- Stubbed source-protocol sections: Miraculin Parts 3, 5, 6, 7 (salting out,
  size-exclusion / ion-exchange / IMAC chromatography) and several SDS-PAGE
  sub-steps are headers without procedure text. They are recorded as
  "protocol needs polishing", not as vocabulary gaps.

## Part 9: Known inconsistencies in the shipped content

Same logical action expressed differently across files, found during the
54-step mapping. These are evidence that the current vocabulary lacks a
canonical form, not action items for this plan.

- `decant_mtt` two ways: `cell_culture` uses `tool: well_plate` as the source
  (an implied pour); `mtt_assay_readout` uses `tool: multichannel_pipette`
  (an explicit aspirate). Same task, two interaction shapes.
- `resuspend` volume mismatch: `cell_culture` interactions specify
  `volumeMl: 10` while the label and `errorHints` say 12 mL;
  `hood_flask_prep` correctly uses `volumeMl: 12`.
- `metformin_stock` tool choice: `cell_culture` uses `micropipette`;
  `plate_drug_treatment` `prep_metformin_dilution` uses `multichannel_pipette`
  for the equivalent preparation.
- `aspirate_old_media` field drift: `hood_flask_prep` includes `liquid: media`
  on the source interaction; `cell_culture` omits `liquid` on the first
  interaction.
- `completionEvent` naming has no convention: kebab-case
  (`count-cells-capture`), snake_case (`pipette_to_plate`), and mixed forms
  coexist.
- `isIncubation` is set on only some incubation steps across the four
  protocols that have incubation steps.
- `tubeTargets` is broken: `src/scene_runtime/contract.ts` types it as
  `{tubeId}`, but the YAML authors `{source, diluent, destination, ...}`; the
  walker produces zero clicks from it.

## Status

M1 evidence artifact, first pass. Step-level details are formalized from the
investigation's draft tables and are subject to verification during M3
ratification ([unified_interaction_vocabulary_plan.md](unified_interaction_vocabulary_plan.md)).
