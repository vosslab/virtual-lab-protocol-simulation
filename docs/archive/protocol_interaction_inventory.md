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

| kind                | steps |
| ------------------- | ----- |
| interactionSequence | 34    |
| multipleChoice      | 8     |
| modal               | 6     |
| directTool          | 6     |

### Distinct click-target fields

| Field          | Appears under                                      | Rough usage              |
| -------------- | -------------------------------------------------- | ------------------------ |
| `tool`         | `directTool`, `interactionSequence.interactions[]` | ~45 steps                |
| `source`       | `interactionSequence.interactions[]`               | ~30 steps                |
| `destination`  | `interactionSequence.interactions[]`               | ~30 steps                |
| `openClick`    | `modal`                                            | 6 steps                  |
| `advanceClick` | `modal`                                            | 6 steps                  |
| `choices[].id` | `multipleChoice`                                   | 8 steps                  |
| `plateTargets` | `interactionSequence`                              | 3 files, ~6 steps        |
| `tubeTargets`  | `interactionSequence`                              | 1 file, 3 steps (BROKEN) |

### Event and state fields

| Field                    | Level                   | Notes                                                  |
| ------------------------ | ----------------------- | ------------------------------------------------------ |
| `completionEvent`        | step and interaction    | one per step, on the final interaction                 |
| `stateChange.heldLiquid` | interaction (load only) | ~30 interactions; `{tool, liquid, volumeMl, colorKey}` |
| `consumesVolumeMl`       | interaction (discharge) | ~30 interactions                                       |
| `isIncubation`           | step                    | 5 steps; inconsistently applied                        |

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

| Step id                       | kind                | clicks: (target, action)                                                                | new-model mode | completion                 |
| ----------------------------- | ------------------- | --------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| count_cells                   | modal               | (cell_counter, popup/open), (capture-count, popup/confirm)                              | click          | capture-count              |
| load_hemocytometer            | modal               | (microscope, popup/open), (confirm-viability, popup/confirm)                            | click          | confirm-viability          |
| count_hemocytometer_quadrants | modal               | (hemocytometer, popup/open), (submit-cell-count, popup/confirm)                         | click          | submit-cell-count          |
| calculate_dilution            | multipleChoice      | (choice, question/answer)                                                               | click          | dilution-factor-calculated |
| calculate_seeding_volume      | multipleChoice      | (choice, question/answer)                                                               | click          | seeding-volume-calculated  |
| seed_plate                    | interactionSequence | (serological_pipette, liquid/take), (flask, liquid/draw), (well_plate, liquid/dispense) | dial (volume)  | pipette_to_plate           |
| incubate_day1                 | directTool          | (incubator, equipment/use)                                                              | click          | place_in_incubator         |

### cell_culture (24 steps)

| Step id            | kind                | clicks: (target, action)                                                               | new-model mode | completion                 |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| spray_hood         | directTool          | (ethanol_bottle, liquid/spray)                                                         | click          | spray_ethanol              |
| aspirate_old_media | interactionSequence | (aspirating_pipette, liquid/take), (flask, liquid/aspirate -> waste_container)         | click          | aspirate                   |
| pbs_wash           | interactionSequence | take, draw(pbs_bottle), dispense(flask)                                                | dial (volume)  | pbs_wash                   |
| add_trypsin        | interactionSequence | take, draw(trypsin_bottle), dispense(flask)                                            | dial (volume)  | pipette_trypsin            |
| neutralize_trypsin | interactionSequence | take, draw(media_bottle), dispense(flask)                                              | dial (volume)  | pipette_media              |
| centrifuge         | directTool          | (centrifuge, equipment/use)                                                            | click          | centrifuge                 |
| resuspend          | interactionSequence | take, draw(media_bottle), dispense(flask)                                              | dial (volume)  | resuspend                  |
| count_cells        | modal               | (cell_counter, popup/open), (capture-count, popup/confirm)                             | click          | count-cells-capture        |
| seed_plate         | interactionSequence | take, draw(flask), dispense(well_plate)                                                | dial (volume)  | pipette_to_plate           |
| incubate_day1      | directTool          | (incubator, equipment/use)                                                             | click          | place_in_incubator         |
| carb_intermediate  | interactionSequence | take, draw(carboplatin_stock), dispense(tube), draw(sterile_water), dispense(tube)     | dial (volume)  | carb_intermediate_complete |
| carb_low_range     | interactionSequence | fan-out: 7 tubes, each draw+dispense pair x2                                           | dial (volume)  | carb-low-range-confirm     |
| metformin_stock    | interactionSequence | take, draw(metformin_stock_bottle), dispense(tube), draw(media_bottle), dispense(tube) | dial (volume)  | metformin-stock-prepare    |
| prewarm_media      | directTool          | (water_bath, equipment/use)                                                            | click          | prewarm                    |
| media_adjust       | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out via plateTargets             | dial (volume)  | media_adjust               |
| add_carboplatin    | interactionSequence | fan-out: 7 rows, each draw(carb tube)+dispense(well_plate)                             | dial (volume)  | carb-add-confirm           |
| add_metformin      | interactionSequence | take, draw(metformin tube), dispense(well_plate) -- fan-out via plateTargets           | dial (volume)  | metformin-add-confirm      |
| incubate_48h       | directTool          | (incubator, equipment/use)                                                             | click          | place_in_incubator_48h     |
| add_mtt            | interactionSequence | take, draw(mtt_vial), dispense(well_plate)                                             | dial (volume)  | add_mtt                    |
| incubate_mtt       | directTool          | (incubator, equipment/use)                                                             | click          | place_in_incubator_mtt     |
| decant_mtt         | interactionSequence | (well_plate, liquid/pour -> biohazard_decant)                                          | click          | decant_mtt                 |
| add_dmso           | interactionSequence | take, draw(dmso_bottle), dispense(well_plate)                                          | dial (volume)  | add_dmso                   |
| plate_read         | modal               | (plate_reader, popup/open), (complete-plate-read, popup/confirm)                       | click          | plate-read-complete        |
| results            | modal               | (plate_reader, popup/open), (modal-close, popup/confirm)                               | click          | results-finalize           |

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

| Step id            | kind                | clicks: (target, action)                                     | new-model mode | completion      |
| ------------------ | ------------------- | ------------------------------------------------------------ | -------------- | --------------- |
| spray_hood         | directTool          | (ethanol_bottle, liquid/spray)                               | click          | spray_ethanol   |
| aspirate_old_media | interactionSequence | take(aspirating_pipette), aspirate(flask -> waste_container) | click          | aspirate        |
| pbs_wash           | interactionSequence | take, draw(pbs_bottle), dispense(flask)                      | dial (volume)  | pbs_wash        |
| add_trypsin        | interactionSequence | take, draw(trypsin_bottle), dispense(flask)                  | dial (volume)  | pipette_trypsin |
| neutralize_trypsin | interactionSequence | take, draw(media_bottle), dispense(flask)                    | dial (volume)  | pipette_media   |
| centrifuge         | directTool          | (centrifuge, equipment/use)                                  | click          | centrifuge      |
| resuspend          | interactionSequence | take, draw(media_bottle), dispense(flask)                    | dial (volume)  | resuspend       |

### mtt_assay_readout (5-6 steps)

| Step id        | kind                | clicks: (target, action)                                             | new-model mode | completion             |
| -------------- | ------------------- | -------------------------------------------------------------------- | -------------- | ---------------------- |
| add_mtt        | interactionSequence | take, draw(mtt_vial), dispense(well_plate)                           | dial (volume)  | add_mtt                |
| incubate_mtt   | directTool          | (incubator, equipment/use)                                           | click          | place_in_incubator_mtt |
| decant_mtt     | interactionSequence | take(multichannel_pipette), aspirate(well_plate -> biohazard_decant) | click          | decant_mtt             |
| add_dmso       | interactionSequence | take, draw(dmso_bottle), dispense(well_plate)                        | dial (volume)  | add_dmso               |
| plate_read     | modal               | (plate_reader, popup/open), (complete-plate-read, popup/confirm)     | click          | plate-read-complete    |
| review_results | multipleChoice      | (choice, question/answer)                                            | click          | results_interpreted    |

### plate_drug_treatment (9 steps)

| Step id                  | kind                | clicks: (target, action)                                                                                                                       | new-model mode | completion               |
| ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| open_plate_workspace     | modal               | (well_plate, popup/open), (confirm-plate-intro, popup/confirm)                                                                                 | click          | plate-workspace-opened   |
| prep_carb_first_dilution | interactionSequence | take, draw(carboplatin_stock_solution), dispense(dilution_tube_carb_b), draw(media_bottle), dispense(dilution_tube_carb_b)                     | dial (volume)  | carb_first_dilution_done |
| prep_carb_last_dilution  | interactionSequence | take, draw(carboplatin_stock_solution), dispense(dilution_tube_carb_h), draw(media_bottle), dispense(dilution_tube_carb_h)                     | dial (volume)  | carb_last_dilution_done  |
| prep_metformin_dilution  | interactionSequence | take, draw(metformin_stock_solution), dispense(dilution_tube_metformin_working), draw(media_bottle), dispense(dilution_tube_metformin_working) | dial (volume)  | metformin_dilution_done  |
| add_media_cols_1_6       | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out plateTargets rows B-H cols 1-6                                                       | dial (volume)  | media-cols-1-6-confirm   |
| add_media_cols_7_12      | interactionSequence | take, draw(media_bottle), dispense(well_plate) -- fan-out plateTargets rows B-H cols 7-12                                                      | dial (volume)  | media-cols-7-12-confirm  |
| add_carboplatin          | interactionSequence | fan-out: 7 rows, each draw(carb tube)+dispense(well_plate)                                                                                     | dial (volume)  | carb-add-confirm         |
| add_metformin            | interactionSequence | take, draw(metformin tube), dispense(well_plate) -- fan-out plateTargets rows B-H cols 7-12                                                    | dial (volume)  | metformin-add-confirm    |
| review_loaded_plate      | modal               | (well_plate, popup/open), (confirm-loaded-plate, popup/confirm)                                                                                | click          | review-loaded-plate      |

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

| Candidate primitive | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `SvgSwap`           | swap one SVG asset for another (berries -> powder, gel -> stained gel) |
| `ColorChange`       | change a fill or color (liquid color in a well, an indicator)          |
| `CursorAttach`      | a picked-up tool follows the cursor; attach or detach cursor state     |
| `SceneChange`       | transition the scene context                                           |
| `LayoutMove`        | move or re-layout a scene object (assembly: cassette into tank)        |

Open question for M2: whether the duration of a timed `equipment` action and
the recorded output of a `read` action are base primitives, properties, or
effects. Flagged as a residual gap (Part 8).

## Part 6: Candidate composed-action categories

Composed actions are built from base primitives and grouped into author-facing
categories. These categories are provisional input to M2 (WP-ACT1), not a
ratified vocabulary.

| Category    | Composed actions seen across the four protocols     |
| ----------- | --------------------------------------------------- |
| `liquid`    | take, draw, dispense, aspirate, mix, pour, spray    |
| `equipment` | run / use, incubate, shake, heat, read              |
| `object`    | place, attach, remove, move, pry                    |
| `choose`    | pick a phase, pick a fraction                       |
| `popup`     | open, confirm                                       |
| `question`  | answer a knowledge question (not parameter-setting) |
| `navigate`  | enter a scene                                       |

The earlier `solid` category was dropped: grinding berries to powder appears
to reduce mainly to an `equipment` action with an `SvgSwap` effect. M2 should
confirm whether any solid-handling case needs a base primitive beyond
`SvgSwap`.

## Part 7: Candidate mode set

| Mode    | Meaning                                                                                                                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `click` | the simple mode -- click a target. All 54 shipped content steps use it.                                                                                                                         |
| `dial`  | the continuous, skill-based set-point mode -- volume, voltage, pH-to-target. Does not exist in the runtime yet; required by OVCAR8 pipetting volumes, SDS-PAGE voltage, Miraculin pH titration. |

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

## M3 ratification: OVCAR8 and shipped content

This is the WP-RAT-A1 ratification slice: OVCAR8 plus all 7 shipped
`content/*/protocol.yaml` files, mapped to the M2 two-level model in
[unified_interaction_vocabulary_design.md](unified_interaction_vocabulary_design.md).
The Miraculin slice (WP-RAT-B1) and the SDS-PAGE slice (WP-RAT-C1) are separate
sections. This slice maps protocols on paper only; it changes no protocol and no
code, and it does not change the M2 model. Where a step will not map, it is
recorded as a gap entry, not a redesign.

### Method

Every step is mapped to the M2 step slots (`name`, `prompt`, `sequence`,
`step_validator`, `outcome`, `next_step`) and every interaction in a `sequence`
to its four slots (`target`, `gesture`, `validator`, `response`). The matrices
below give a row per step. Slot values that are uniform across a whole protocol
are stated once in the protocol's lead-in rather than repeated per row. The
`response` column names which of the eight ratified `scene_operation` primitives
the interactions use; `SO` abbreviates `scene_operation`. The domain verb and
the lab skill columns answer the pedagogy-first ratification standard.

The shipped content uses legacy field names (`completionPath.kind`, `tool`,
`source`, `destination`, `stateChange.heldLiquid`, `consumesVolumeMl`,
`completionEvent`, `plateTargets`, `tubeTargets`). This ratification reads those
under the M2 model: a `directTool` step is a one-interaction `click` step; a
`modal` step is two `click` interactions (open, confirm); a `multipleChoice`
step is one `select` interaction; an `interactionSequence` step is an ordered
`sequence` of `click` interactions. The legacy `completionEvent` is superseded
by the derived `<step_name>_complete` event and is not a slot in the M2 model.

### Step counts for this slice

| Source                    | Mappable steps                     |
| ------------------------- | ---------------------------------- |
| OVCAR8 source protocol    | 24                                 |
| cell_counting_and_seeding | 7                                  |
| cell_culture              | 24                                 |
| cell_culture_full         | 0 (sequence_runner, empty `steps`) |
| drug_dilution_setup       | 8                                  |
| hood_flask_prep           | 7                                  |
| mtt_assay_readout         | 6                                  |
| plate_drug_treatment      | 9                                  |
| Content total             | 61                                 |
| Slice total               | 85                                 |

Note on the count: Part 2 of this inventory reported 54 content steps. The
actual shipped files total 61 mappable steps. The earlier figure undercounted
`cell_counting_and_seeding` (7, listed as 8 in a table that shows 7 rows),
`cell_culture` (24, correct), and `mtt_assay_readout` (6, listed as "5-6"). The
ratification count of record for this slice is 61 content steps, 85 including
OVCAR8.

### OVCAR8 coverage matrix

OVCAR8 is a complete source protocol. It is mapped here as 24 discrete M2 steps
grouped by its document parts. Every liquid-handling step is a step-level `wash`
or `draw`/`dispense` composition: a `click` on the tool (`CursorAttach` attach),
an `adjust` on the tool to set the volume set-point (`SetPointDisplayChange`),
a `click` on the source (`LiquidDisplayChange` hold), a `click` on the
destination (`LiquidDisplayChange` set to 0 on the tool, `add` on the
destination). `step_validator` is `final_state_matches` for liquid steps and
`sequence_complete` for the rest. `outcome` is `{on_success: complete,
on_failure: retry}` for every step. `next_step` is the next row; the last row is
`null`.

| OVCAR8 step                 | gesture set                           | SO primitives used                                       | domain verb          | lab skill taught                                   |
| --------------------------- | ------------------------------------- | -------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| aspirate_old_media          | click, click                          | CursorAttach, LiquidDisplayChange (set 0)                | aspirate             | tool selection, removing spent media to waste      |
| pbs_wash                    | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash                 | volume set-point, rinsing residual serum           |
| add_trypsin                 | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash (draw+dispense) | volume set-point, enzymatic dissociation           |
| confirm_detachment          | click, click                          | (none; feedback only)                                    | use (microscope)     | visual confirmation under microscope               |
| neutralize_trypsin          | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash (draw+dispense) | 3x-volume neutralization calculation and transfer  |
| transfer_to_conical         | click, click                          | CursorAttach, LayoutMove                                 | move                 | transferring suspension to a labeled conical tube  |
| centrifuge                  | click                                 | TimedWait                                                | use (equipment)      | pelleting cells                                    |
| aspirate_supernatant        | click, click                          | CursorAttach, LiquidDisplayChange (set 0)                | aspirate             | removing supernatant without disturbing the pellet |
| resuspend                   | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash (draw+dispense) | resuspension at a known volume                     |
| add_media_new_plate         | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash (draw+dispense) | plating media at the split ratio                   |
| add_trypan_blue             | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | viability-dye addition to the counting chamber     |
| add_cell_suspension         | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | loading the counting-chamber sample                |
| mix_by_pipetting            | click                                 | LiquidDisplayChange (mix)                                | mix                  | pipette-mixing a sample                            |
| load_counting_slide         | click, click                          | CursorAttach, LayoutMove                                 | move                 | loading the counting-chamber slide                 |
| capture_count               | click, click                          | (none; feedback only; data recorded)                     | use (cell counter)   | reading an instrument count and viability          |
| seed_plate                  | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | wash (draw+dispense) | seeding a 96-well plate at target density          |
| incubate_day1               | click                                 | TimedWait                                                | use (equipment)      | timed incubation for attachment                    |
| prepare_carb_intermediate   | click, adjust, click, click (x2)      | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | first dilution-cascade step (200 uM intermediate)  |
| prepare_carb_working_stocks | click, adjust, click, click (fan-out) | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | the carboplatin working-stock dilution table       |
| prepare_metformin_working   | click, adjust, click, click           | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | metformin working-stock dilution                   |
| media_adjust_plate          | click, adjust, click (fan-out)        | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | per-well media adjustment to target volume         |
| add_carboplatin_plate       | click, adjust, click (fan-out)        | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | dosing the carboplatin series into the plate       |
| add_metformin_plate         | click, adjust, click (fan-out)        | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense       | fixed-dose modifier into the combination columns   |
| incubate_48h                | click                                 | TimedWait                                                | use (equipment)      | 48 h drug-exposure incubation                      |

OVCAR8 Part 3 Day 4 (MTT readout) and Part 5 (plate map) also map; the Day 4
steps are the same shapes already shown in the `mtt_assay_readout` matrix below
(MTT addition, 1.5 h incubation `TimedWait`, decant to biohazard, DMSO add and
pipette-mix, plate read). The plate map (Part 5) is reference data, not steps:
under the scene/protocol boundary the per-well volumes resolve through semantic
targets, so the plate map is not a separate set of M2 steps. The
`dissolve MTT powder in PBS` prep line maps as a `draw`/`dispense` plus an
`SvgSwap` (powder asset to dissolved-reagent asset) -- it is the only OVCAR8
solid-handling shape and it maps with no new primitive.

### cell_counting_and_seeding coverage matrix

7 steps. `entry_step: count_cells`. `outcome` is
`{on_success: complete, on_failure: retry}` on every step.

| Step `name`                   | gesture(s)   | validator / step_validator           | SO primitives                                     | domain verb          | lab skill taught                            |
| ----------------------------- | ------------ | ------------------------------------ | ------------------------------------------------- | -------------------- | ------------------------------------------- |
| count_cells                   | click, click | correct_target / sequence_complete   | SceneChange or feedback-only (modal open/confirm) | use (cell counter)   | reading an automated count                  |
| load_hemocytometer            | click, click | correct_target / sequence_complete   | SceneChange or feedback-only                      | use, move            | preparing and loading a hemocytometer slide |
| count_hemocytometer_quadrants | click, click | correct_target / sequence_complete   | SceneChange or feedback-only                      | use                  | manual quadrant counting                    |
| calculate_dilution            | select       | correct_choice / sequence_complete   | feedback-only                                     | select (answer)      | dilution-factor calculation                 |
| calculate_seeding_volume      | select       | correct_choice / sequence_complete   | feedback-only                                     | select (answer)      | seeding-volume calculation                  |
| seed_plate                    | click, click | correct_target / final_state_matches | CursorAttach, LiquidDisplayChange                 | wash (draw+dispense) | seeding the plate at target density         |
| incubate_day1                 | click        | correct_target / sequence_complete   | TimedWait                                         | use (equipment)      | timed incubation                            |

### cell_culture coverage matrix

24 steps. `entry_step: spray_hood`. The longest shipped protocol; it covers the
whole pipeline. Step shapes by `completionPath.kind`: `directTool` -> one
`click`; `modal` -> two `click`; `multipleChoice` -> one `select`;
`interactionSequence` -> ordered `click` sequence.

| Step `name`        | kind                | gesture(s)               | SO primitives                             | domain verb          | lab skill taught                      |
| ------------------ | ------------------- | ------------------------ | ----------------------------------------- | -------------------- | ------------------------------------- |
| spray_hood         | directTool          | click                    | feedback-only (or SvgSwap/ColorChange)    | spray                | aseptic hood prep                     |
| aspirate_old_media | interactionSequence | click                    | CursorAttach, LiquidDisplayChange (set 0) | aspirate             | removing spent media to waste         |
| pbs_wash           | interactionSequence | click, click             | CursorAttach, LiquidDisplayChange         | wash                 | rinsing residual serum                |
| add_trypsin        | interactionSequence | click, click             | CursorAttach, LiquidDisplayChange         | draw, dispense       | enzymatic dissociation                |
| neutralize_trypsin | interactionSequence | click, click             | CursorAttach, LiquidDisplayChange         | draw, dispense       | trypsin neutralization                |
| centrifuge         | directTool          | click                    | TimedWait                                 | use (equipment)      | pelleting cells                       |
| resuspend          | interactionSequence | click, click             | CursorAttach, LiquidDisplayChange         | draw, dispense       | resuspension at known volume          |
| count_cells        | modal               | click, click             | SceneChange or feedback-only              | use (cell counter)   | reading a count                       |
| seed_plate         | interactionSequence | click, click             | CursorAttach, LiquidDisplayChange         | wash (draw+dispense) | seeding at target density             |
| incubate_day1      | directTool          | click                    | TimedWait                                 | use (equipment)      | timed incubation                      |
| carb_intermediate  | interactionSequence | click x4                 | CursorAttach, LiquidDisplayChange         | draw, dispense       | first dilution-cascade step           |
| carb_low_range     | interactionSequence | click (fan-out, 7 tubes) | CursorAttach, LiquidDisplayChange         | draw, dispense       | the carboplatin dilution table        |
| metformin_stock    | interactionSequence | click x4                 | CursorAttach, LiquidDisplayChange         | draw, dispense       | metformin working-stock dilution      |
| prewarm_media      | directTool          | click                    | TimedWait or feedback-only                | use (equipment)      | pre-warming media to avoid cold shock |
| media_adjust       | interactionSequence | click (fan-out)          | CursorAttach, LiquidDisplayChange         | draw, dispense       | per-well media adjustment             |
| add_carboplatin    | interactionSequence | click (fan-out, 7 rows)  | CursorAttach, LiquidDisplayChange         | draw, dispense       | dosing the carboplatin series         |
| add_metformin      | interactionSequence | click (fan-out)          | CursorAttach, LiquidDisplayChange         | draw, dispense       | fixed-dose modifier                   |
| incubate_48h       | directTool          | click                    | TimedWait                                 | use (equipment)      | 48 h drug-exposure incubation         |
| add_mtt            | interactionSequence | click (fan-out)          | CursorAttach, LiquidDisplayChange         | draw, dispense       | MTT reagent addition                  |
| incubate_mtt       | directTool          | click                    | TimedWait                                 | use (equipment)      | 1.5 h formazan-conversion incubation  |
| decant_mtt         | interactionSequence | click                    | LiquidDisplayChange (set 0)               | aspirate or pour     | toxic-waste decant to biohazard       |
| add_dmso           | interactionSequence | click (fan-out)          | CursorAttach, LiquidDisplayChange         | draw, dispense       | formazan solubilization               |
| plate_read         | modal               | click, click             | SceneChange or feedback-only              | use (plate reader)   | absorbance reading at 560 nm          |
| results            | modal               | click, click             | SceneChange or feedback-only              | use (plate reader)   | reading dose-response curves          |

Note: `cell_culture` `pbs_wash`, `add_trypsin`, etc. do not currently carry an
`adjust` interaction for the volume set-point -- they encode the volume as a
field on a `click` interaction. Under the pedagogy-first rule this is the
documented timed-click regression; see the flagged items below. The matrix maps
the steps as the M2 model intends them (with an `adjust` set-point gesture),
which is the ratified target, not the regressed shipped shape.

### drug_dilution_setup coverage matrix

8 steps, all `multipleChoice`. `entry_step: calc_carb_stock`. Each step is one
`select`-gesture interaction on an answer-choice target, validated by
`correct_choice`; `step_validator` is `sequence_complete`; `response` is
`feedback`-only with an empty `scene_operations` list; domain verb is
`select` (answer); `outcome` is `{on_success: complete, on_failure: retry}`.

| Step `name`               | lab skill taught                                      |
| ------------------------- | ----------------------------------------------------- |
| calc_carb_stock           | C1V1=C2V2 stock-to-intermediate calculation           |
| calc_carb_working_b       | intermediate-to-working-to-final concentration chain  |
| calc_carb_series          | recognizing the 1-2-5 dose-series pattern             |
| calc_carb_low_range       | intermediate-to-working dilution recipe               |
| calc_metformin_stock_prep | metformin stock-to-working calculation                |
| calc_metformin_final      | volume-adjusted final-concentration calculation       |
| prewarm_media_check       | reasoning about cold-shock and dose-response kinetics |
| planning_summary          | synthesizing the full dilution cascade                |

This file also carries a `plateMap.annotations` block with `row`, `colRange`
geometry on every step. That is a scene/protocol boundary violation by the
WP-BND1 rule (the protocol vocabulary names no plate, no row, no column, no
coordinate). It is not a vocabulary expressiveness gap -- the M2 model maps
every step fine -- but it is a content-side cleanup the M2 boundary rule already
identifies. Recorded in the gap list as a rough-protocol / boundary-cleanup item.

### hood_flask_prep coverage matrix

7 steps. `entry_step: spray_hood`. Same shapes as the first seven `cell_culture`
steps; this is the extracted mini-protocol for that span.

| Step `name`        | kind                | gesture(s)   | SO primitives                             | domain verb     | lab skill taught              |
| ------------------ | ------------------- | ------------ | ----------------------------------------- | --------------- | ----------------------------- |
| spray_hood         | directTool          | click        | feedback-only (or SvgSwap/ColorChange)    | spray           | aseptic hood prep             |
| aspirate_old_media | interactionSequence | click        | CursorAttach, LiquidDisplayChange (set 0) | aspirate        | removing spent media to waste |
| pbs_wash           | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | wash            | rinsing residual serum        |
| add_trypsin        | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | draw, dispense  | enzymatic dissociation        |
| neutralize_trypsin | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | draw, dispense  | trypsin neutralization        |
| centrifuge         | directTool          | click        | TimedWait                                 | use (equipment) | pelleting cells               |
| resuspend          | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | draw, dispense  | resuspension at known volume  |

### mtt_assay_readout coverage matrix

6 steps. `entry_step: add_mtt`. The extracted MTT readout mini-protocol.

| Step `name`    | kind                | gesture(s)   | SO primitives                             | domain verb        | lab skill taught                       |
| -------------- | ------------------- | ------------ | ----------------------------------------- | ------------------ | -------------------------------------- |
| add_mtt        | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | draw, dispense     | MTT reagent addition                   |
| incubate_mtt   | directTool          | click        | TimedWait                                 | use (equipment)    | 1.5 h formazan-conversion incubation   |
| decant_mtt     | interactionSequence | click, click | CursorAttach, LiquidDisplayChange (set 0) | aspirate           | toxic-waste removal to biohazard       |
| add_dmso       | interactionSequence | click, click | CursorAttach, LiquidDisplayChange         | draw, dispense     | formazan solubilization and mix        |
| plate_read     | modal               | click, click | SceneChange or feedback-only              | use (plate reader) | absorbance reading at 560 nm           |
| review_results | multipleChoice      | select       | feedback-only                             | select (answer)    | interpreting viability absorbance data |

### plate_drug_treatment coverage matrix

9 steps. `entry_step: open_plate_workspace`.

| Step `name`              | kind                | gesture(s)              | SO primitives                     | domain verb    | lab skill taught                   |
| ------------------------ | ------------------- | ----------------------- | --------------------------------- | -------------- | ---------------------------------- |
| open_plate_workspace     | modal               | click, click            | SceneChange                       | navigate, use  | entering the plate workspace scene |
| prep_carb_first_dilution | interactionSequence | click x4                | CursorAttach, LiquidDisplayChange | draw, dispense | lowest-dose working solution       |
| prep_carb_last_dilution  | interactionSequence | click x4                | CursorAttach, LiquidDisplayChange | draw, dispense | highest-dose working solution      |
| prep_metformin_dilution  | interactionSequence | click x4                | CursorAttach, LiquidDisplayChange | draw, dispense | metformin working solution         |
| add_media_cols_1_6       | interactionSequence | click, click (fan-out)  | CursorAttach, LiquidDisplayChange | draw, dispense | media adjustment, columns 1-6      |
| add_media_cols_7_12      | interactionSequence | click, click (fan-out)  | CursorAttach, LiquidDisplayChange | draw, dispense | media adjustment, columns 7-12     |
| add_carboplatin          | interactionSequence | click (fan-out, 7 rows) | CursorAttach, LiquidDisplayChange | draw, dispense | dosing the carboplatin series      |
| add_metformin            | interactionSequence | click, click (fan-out)  | CursorAttach, LiquidDisplayChange | draw, dispense | fixed-dose modifier                |
| review_loaded_plate      | modal               | click, click            | SceneChange or feedback-only      | use            | confirming the loaded plate        |

This file carries both `plateTargets` (`rows`, `cols` geometry) and
`tubeTargets` blocks. Both are scene/protocol boundary violations under WP-BND1
and `tubeTargets` is additionally the broken field from Part 9. Neither is a
vocabulary expressiveness gap; both are content-side boundary cleanups. Recorded
in the gap list as rough-protocol / boundary-cleanup items.

### cell_culture_full

`protocolType: sequence_runner` with an empty `steps` array. It chains the five
mini-protocols (`hood_flask_prep`, `cell_counting_and_seeding`,
`drug_dilution_setup`, `plate_drug_treatment`, `mtt_assay_readout`) via a
`sequence` list. It contributes zero interaction steps. The M2 model is a
single-protocol linear spec (`protocol -> step -> interaction`); it has no
protocol-of-protocols level. A multi-protocol runner is not expressible in the
M2 model as written. This is recorded as a gap entry -- it is a design-scope
question, not an interaction-vocabulary failure: the M2 model never claimed to
cover protocol composition, and the WP-STA1 `protocol` level is explicitly a
single linear protocol. See the gap list.

### Flagged items

Items the model maps but that ratification flags for pedagogy or correctness.

- **Timed-click pipetting regression (all liquid-handling steps in the shipped
  content).** Every `interactionSequence` liquid step in `cell_culture`,
  `hood_flask_prep`, `cell_counting_and_seeding`, `mtt_assay_readout`, and
  `plate_drug_treatment` encodes the volume as a `volumeMl` field on a `click`
  interaction. There is no `adjust` gesture and no set-point interaction. By the
  pedagogy-first rule this is the named anti-pattern: a set-point skill
  collapsed into a rote `click`. The M2 target shape inserts an `adjust`
  interaction on the tool validated by `target_with_value`. This is a flagged
  ratification finding against the shipped content, not a vocabulary gap -- the
  M2 model expresses the correct shape; the content does not yet use it.
- **`spray_hood` response is underspecified.** The `spray` domain verb expands
  to a `feedback`-only response, optionally with an `SvgSwap` or `ColorChange`
  if the sprayed surface changes appearance. The shipped step gives no scene
  effect. Pedagogy (aseptic technique) is clear; the `target`/`gesture` pairing
  (`click` on `ethanol_bottle`) is right. Flagged only because the response is
  thin, not wrong.
- **`prewarm_media` -- TimedWait or instant.** Pre-warming media in a 37C water
  bath is plausibly a timed phase (`TimedWait`) but the shipped `directTool`
  step treats it as instant. Pedagogy is clear (avoid cold shock). The
  `target`/`gesture` pairing is right. Flagged as a duration-modeling choice for
  the content author, not a vocabulary gap.
- **`decant_mtt` two shapes.** `cell_culture` decants with `tool: well_plate`
  (an implied pour); `mtt_assay_readout` decants with
  `tool: multichannel_pipette` (an explicit aspirate). Both map -- `pour` and
  `aspirate` are both clean domain verbs over `LiquidDisplayChange` with
  `operation: set, volume_ml: 0`. This is the Part 9 inconsistency; the M2 model
  expresses either, so it is a content-canonicalization item, not a vocabulary
  gap.
- **`results` / `review_results` / `count_cells` modal steps.** Modal open and
  confirm map as two `click` interactions. Whether the open carries a
  `SceneChange` (a real scene transition) or just a `feedback`-only response
  (a popup overlay) depends on the scene adapter. The design doc states a modal
  open or close is a `response` that opens a control surface, not a
  `SceneChange`. So these map cleanly as `feedback`-only `click` interactions.
  Flagged only to note the modal-vs-scene distinction was checked and resolves
  inside the model.
- **Instrument-reading steps produce data.** `capture_count` (OVCAR8 /
  `count_cells`) and `plate_read` produce recorded data (a cell count, an
  absorbance reading). The M2 model has no `scene_operation` for "instrument
  produced a data value" -- the closest is a `feedback`-only response. Mapping
  works for the interaction (a `click` on the instrument, validated by
  `correct_target`), but the produced data is not represented as runtime state
  any `scene_operation` writes. Flagged; see the gap list (recorded data is the
  open question Part 5 already raised, not closed by the eight primitives).

### The six M3 ratification questions, answered for this slice

1. **Does every step map to the two-level model?** Yes for all 85 mappable
   steps -- OVCAR8's 24 and the 61 content steps. Each is a `step` with the six
   required slots wrapping an ordered `sequence` of interactions. The one
   non-mapping artifact is `cell_culture_full`, which has zero steps and is a
   `sequence_runner` (a protocol-of-protocols), a construct the single-linear-
   protocol M2 model does not have a level for. That is a scope gap, not a
   per-step mapping failure: there are no `cell_culture_full` steps that fail to
   map, because it has none.

2. **Does every interaction have `target`, `gesture`, `validator`, and
   `response`?** Yes. Every interaction across the slice resolves to a named
   `target` (a scene object, an instrument, or an answer choice), a `gesture`
   from the closed set (`click` for lab objects and modal controls, `select`
   for answer choices, `adjust` for the volume set-points the M2 target shape
   adds), a `validator` preset (`correct_target`, `correct_choice`, or
   `target_with_value`), and a `response` (either `scene_operations` or
   `feedback`-only). No interaction in the slice needs a fifth slot.

3. **Do responses use only the 8 ratified `scene_operation` primitives?** Yes.
   The slice exercises seven of the eight: `CursorAttach` (tool pickup),
   `LiquidDisplayChange` (every draw/dispense/aspirate), `SetPointDisplayChange`
   (the volume set-points in the M2 target shape), `TimedWait` (every
   incubation, the centrifuge, prewarm), `SceneChange` (plate-workspace entry),
   `SvgSwap` (the OVCAR8 MTT-powder dissolve, and optionally `spray_hood`),
   `ColorChange` (optionally formazan color development, `spray_hood`).
   `LayoutMove` is exercised by OVCAR8's transfer-to-conical and
   load-counting-slide steps. No response in the slice needs a ninth primitive.

4. **Do domain verbs expand cleanly?** Yes. The verbs this slice needs --
   `wash`, `draw`, `dispense`, `aspirate`, `pour`, `mix`, `spray`, `move`,
   `use` (equipment), `navigate`, `select` (answer) -- each expand to slots the
   two-level model already has. `wash` is the step-level draw-plus-dispense
   composition; `draw`/`dispense`/`aspirate`/`pour`/`mix`/`spray`/`move` are
   interaction-level; `use` and `navigate` and `select` are interaction-level.
   No verb in this slice needs runtime behavior with no home in `target`,
   `gesture`, `validator`, or `response`.

5. **Are any new `gesture` values, validator presets, or `scene_operation`
   primitives required?** No new ones are required to map this slice. The closed
   `gesture` set (`click`, `drag`, `adjust`, `select`, `type`) covers it --
   `drag` and `type` are unused by this slice but no slice interaction needs a
   sixth gesture. The five-preset validator library covers it. The eight
   `scene_operation` primitives cover it. One soft pressure point: instrument-
   produced data (a cell count, an absorbance value) has no `scene_operation`
   that records it as runtime state; it currently maps as a `feedback`-only
   response. That is not a hard requirement for a new primitive yet -- the
   interaction maps -- but it is the recurring shape Part 5 already flagged, and
   the Miraculin and SDS-PAGE slices should test whether instrument data
   recurs strongly enough to clear the cost-guardrail bar.

6. **Are any gaps real design gaps versus rough-protocol gaps?** The one
   structural gap -- `cell_culture_full` as a `sequence_runner` -- is a
   design-scope gap, not a rough-protocol gap and not an interaction-vocabulary
   failure: the M2 model is a deliberately single-linear-protocol spec, and
   composition of protocols was never in its scope. It does not force an M2
   revision of the interaction vocabulary; it is a separate question of whether
   the plan wants a protocol-composition level. Everything else in the slice is
   either a clean map, a content-side cleanup (the boundary-violating
   `plateMap`, `plateTargets`, `tubeTargets` blocks; the `decant_mtt` two
   shapes; `completionEvent` naming drift), or the timed-click regression --
   which is a content fidelity finding, not a vocabulary gap, because the M2
   model already expresses the correct `adjust` shape.

### Gap list for this slice

Each entry is classified: new domain verb (cheap), new `gesture` value
(medium), new `scene_operation` primitive (expensive), design revision
(expensive), or rough-protocol gap (not a vocabulary gap). This list is written
to be merged with the Miraculin (WP-RAT-B1) and SDS-PAGE (WP-RAT-C1) gap lists
by the downstream consolidation task.

| Gap ID   | Description                                                                                                                                                                                                                                                                | Classification                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAT-A-G1 | `cell_culture_full` is a `sequence_runner` chaining five mini-protocols; the M2 model is a single linear protocol with no protocol-of-protocols level. No `cell_culture_full` step fails to map (it has none), but the runner artifact itself has no home in the M2 model. | design revision -- but scoped: it is a protocol-composition scope question, NOT an interaction-vocabulary failure. Does not force an M2 interaction-vocabulary revision. Escalate as a plan-scope decision.                                                               |
| RAT-A-G2 | Instrument-reading steps (`capture_count`, `plate_read`, `count_cells`) produce recorded data (a cell count, an absorbance value). No `scene_operation` writes "instrument produced a data value" as runtime state; it currently maps as a `feedback`-only response.       | possible new `scene_operation` primitive (expensive) -- NOT yet required: the interaction maps. This is the Part 5 / Part 8 open question (recorded output of a `read` action). Hold for the Miraculin and SDS-PAGE slices to test recurrence against the cost guardrail. |
| RAT-A-G3 | Shipped liquid-handling steps encode volume as a `volumeMl` field on a `click` interaction with no `adjust` set-point gesture (the documented timed-click regression).                                                                                                     | rough-protocol gap -- NOT a vocabulary gap. The M2 model expresses the correct `adjust` + `target_with_value` shape; the content must be updated to use it. Content fidelity finding.                                                                                     |
| RAT-A-G4 | `drug_dilution_setup` carries `plateMap.annotations` (`row`, `colRange`); `plate_drug_treatment` carries `plateTargets` (`rows`, `cols`) and `tubeTargets`. These are geometric nouns and coordinates in protocol YAML -- boundary violations under the WP-BND1 rule.      | rough-protocol gap / boundary cleanup -- NOT a vocabulary gap. The M2 model maps every step; the geometry belongs on the scene side via semantic targets. Content-side cleanup.                                                                                           |
| RAT-A-G5 | `tubeTargets` is the broken field from Part 9 (typed `{tubeId}` in `contract.ts`, authored as `{source, diluent, destination, ...}`).                                                                                                                                      | rough-protocol gap -- NOT a vocabulary gap. Broken legacy field; superseded entirely by the M2 model. Content-side removal.                                                                                                                                               |
| RAT-A-G6 | `decant_mtt` has two interaction shapes across files (`well_plate` pour vs `multichannel_pipette` aspirate); `completionEvent` naming has no convention (kebab-case, snake_case mixed); `resuspend` volume mismatch; `metformin_stock` tool choice differs.                | rough-protocol gap -- NOT a vocabulary gap. The M2 model expresses every variant cleanly and the WP-STA1 derived-event rule already replaces `completionEvent`. Content canonicalization.                                                                                 |
| RAT-A-G7 | `prewarm_media` is modeled as an instant `directTool` step; pre-warming in a water bath is plausibly a `TimedWait` phase.                                                                                                                                                  | rough-protocol gap -- NOT a vocabulary gap. `TimedWait` already exists; this is an authoring choice about whether to model the duration.                                                                                                                                  |

No gap in this slice is a real design gap that forces a revision of the M2
**interaction vocabulary**. RAT-A-G1 is a design-scope question one level up
(protocol composition), and RAT-A-G2 is a hold-for-evidence watch item, not a
confirmed requirement. The eight `scene_operation` primitives, the five
validator presets, the five `gesture` values, and the two-level
`protocol -> step -> interaction -> response` model all hold for OVCAR8 and all
61 shipped content steps.

### Notes for the downstream consolidation and the other slices

- RAT-A-G2 (instrument-produced data as runtime state) is the gap most likely
  to recur. OVCAR8's cell counter and plate reader hit it; Miraculin's
  centrifuge phase-separation result and SDS-PAGE's gel image / light-box read
  are candidates. If two more slices hit it, it clears the cost-guardrail
  recurrence bar and becomes a real new-primitive proposal. The consolidation
  task should specifically check this.
- RAT-A-G1 (`sequence_runner`) is unique to the shipped content; the three
  source protocols are single protocols, so Miraculin and SDS-PAGE will not
  re-raise it. It still needs a plan-scope decision.
- The boundary-violation gaps (RAT-A-G4, RAT-A-G5) are content-file specific
  and will not appear in the source-protocol slices, which have no YAML yet.
  They should stay in the consolidated list as content-cleanup work the M2
  boundary rule already mandates.
- The timed-click regression (RAT-A-G3) is the highest-volume content fidelity
  finding -- it touches every liquid-handling step in five of the seven files.
  The consolidation task should keep it as a single rolled-up finding rather
  than one row per step.

## M3 ratification: Miraculin

This is the WP-RAT-B1 ratification slice: the Miraculin protocol
([../protocols/Miraculin_Protocol_2026.md](../protocols/Miraculin_Protocol_2026.md)), a protein
purification by reverse-micelle extraction, mapped to the M2 two-level model in
[unified_interaction_vocabulary_design.md](unified_interaction_vocabulary_design.md).
The OVCAR8 and shipped-content slice (WP-RAT-A1) and the SDS-PAGE slice
(WP-RAT-C1) are separate sections. This slice maps the protocol on paper only;
it changes no protocol and no code, and it does not change the M2 model. Where a
step will not map, it is recorded as a gap entry, not a redesign. Miraculin is a
rough draft: a step too stubbed to map is a rough-protocol gap, not a vocabulary
failure, and is classified that way.

### Method

The Miraculin doc carries the procedure twice. The `Experimental Procedure`
`Overview` section is the authoritative linear recipe with real content:
`Preparing Miraculin Berry Extract` (7 steps), `Stage 1: Forward Extraction`
(6 steps), and `Stage 2: Backward Extraction` (5 steps). The later
`Part 1` through `Part 7` headings re-state the same material at a coarser
grain: `Part 1` (breaking the cells) and `Part 3` (salting out) are heading-only
stubs, `Part 2` (first centrifugation) duplicates two Overview steps, `Part 4`
(reverse micelle extraction) has empty `Forward Extraction Protocol` and
`Backward Stripping Protocol` sub-stubs, and `Part 5` through `Part 7` (size
exclusion, ion exchange, and IMAC chromatography) are pure stubs -- a student
assignment line and nothing else. This ratification maps the 18 real Overview
steps and records Parts 5-7 as unmappable rough-protocol stubs. Each step is
mapped to the M2 step slots (`name`, `prompt`, `sequence`, `step_validator`,
`outcome`, `next_step`) and every interaction to its four slots (`target`,
`gesture`, `validator`, `response`). `SO` abbreviates `scene_operation`. The
domain verb and lab skill columns answer the pedagogy-first ratification
standard. The proposed step `name` values are snake_case identifiers chosen for
meaning; they are mapping conveniences, not authored YAML.

### Step counts for this slice

| Source                                 | Mappable steps                         |
| -------------------------------------- | -------------------------------------- |
| Preparing Miraculin Berry Extract      | 7                                      |
| Stage 1: Forward Extraction            | 6                                      |
| Stage 2: Backward Extraction           | 5                                      |
| Part 1 (breaking the cells)            | 0 (heading-only stub)                  |
| Part 2 (first centrifugation)          | 0 (duplicates Overview steps)          |
| Part 3 (salting out)                   | 0 (heading-only stub)                  |
| Part 4 (reverse micelle extraction)    | 0 (empty sub-stubs; duplicates stages) |
| Part 5 (size exclusion chromatography) | 0 (pure stub)                          |
| Part 6 (ion exchange chromatography)   | 0 (pure stub)                          |
| Part 7 (IMAC)                          | 0 (pure stub)                          |
| Slice total                            | 18                                     |

`outcome` is `{on_success: complete, on_failure: retry}` on every mapped step.
`next_step` is the next row in reading order; the final mapped step
(`collect_aqueous_phase` in Stage 2) has `next_step: null` until the
chromatography Parts are written.

### Preparing Miraculin Berry Extract coverage matrix

7 steps. `entry_step: obtain_berries`. This is the sample-prep phase: berries to
crude salt extract.

| Step `name`              | gesture(s)                  | validator / step_validator                              | SO primitives                                            | domain verb         | lab skill taught                               |
| ------------------------ | --------------------------- | ------------------------------------------------------- | -------------------------------------------------------- | ------------------- | ---------------------------------------------- |
| obtain_berries           | click                       | correct_target / sequence_complete                      | feedback-only                                            | use                 | retrieving freeze-dried starting material      |
| remove_skin_seed         | click                       | correct_target / sequence_complete                      | SvgSwap                                                  | dissect             | preparing berries by removing skin and seed    |
| grind_berries            | click                       | correct_target / final_state_matches                    | SvgSwap                                                  | grind               | reducing prepared berries to a powder          |
| homogenize_water         | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense, mix | homogenizing powder in DI water at a set ratio |
| centrifuge_crude         | click                       | correct_target / final_state_matches                    | TimedWait                                                | use (equipment)     | pelleting solids by centrifugation             |
| discard_pink_supernatant | select                      | correct_choice / final_state_matches                    | feedback-only (optionally LiquidDisplayChange set 0)     | select (phase)      | identifying and discarding the inactive phase  |
| resuspend_nacl           | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense, mix | resuspending the sediment in 0.5 M NaCl        |

Notes on this matrix:

- `remove_skin_seed` maps as a `click` on the berries with an `SvgSwap`
  (whole-berry asset to prepared-berry asset). A `dissect` domain verb is the
  natural author word; it is interaction-level and expands to one `SvgSwap`,
  the same shape as `grind`. `dissect` is a new domain verb (cheap) -- it adds
  no new slot.
- `grind_berries` is the explicitly tested grinding shape; see the tested
  shapes section below.
- `homogenize_water` is the Overview step "Dissolve miraculin powder in DI
  water and homogenize 1 g of berry powder to 10 mL of DI water." It maps as a
  `draw`/`dispense` of DI water onto the powder plus a `mix` (homogenize). The
  set ratio (1 g powder, 10 mL water) needs the `adjust` set-point gesture on
  the liquid-handling tool, validated by `target_with_value`, so the volume is
  a real set-point skill, not a rote `click`. The solid mass (1 g powder) has
  no liquid set-point; it is either preset target state or a `select` of a
  pre-portioned amount -- noted in the gap list as a minor authoring choice.
- `discard_pink_supernatant` is the explicitly tested phase-separation shape;
  see the tested shapes section below.
- `resuspend_nacl` is the Overview step "Sediment was homogenized with 0.5 M
  NaCl solution at pH 6.8 (1 g of powder to 6 mL of the NaCl solution)." It is
  the same `draw`/`dispense`/`mix` shape as `homogenize_water`. The NaCl
  solution is pre-made at pH 6.8, so no titration happens in this step -- the
  titration shape is tested under Stage 1 below.

### Stage 1: Forward Extraction coverage matrix

6 steps. `entry_step` of this phase is `adjust_ph_forward`; flow reaches it from
`resuspend_nacl` via `next_step`. This phase moves the protein into the organic
reverse-micelle phase.

| Step `name`           | gesture(s)                  | validator / step_validator                              | SO primitives                                                             | domain verb     | lab skill taught                                                          |
| --------------------- | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| adjust_ph_forward     | click, adjust               | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange                                       | titrate         | titrating the crude extract to pH 8.0                                     |
| prepare_aot_solution  | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange                  | draw, dispense  | preparing the 0.1 M AOT in isooctane organic solution                     |
| mix_phases_forward    | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange                  | draw, dispense  | combining equal volumes of aqueous and organic phases                     |
| agitate_forward       | click                       | correct_target / sequence_complete                      | TimedWait                                                                 | use (equipment) | timed gentle agitation (10 min)                                           |
| centrifuge_forward    | click                       | correct_target / final_state_matches                    | TimedWait                                                                 | use (equipment) | phase separation by centrifugation (4000 x g, 5 min)                      |
| collect_organic_phase | select                      | correct_choice / final_state_matches                    | feedback-only (optionally LiquidDisplayChange set 0 on the aqueous phase) | select (phase)  | discarding the aqueous phase, retaining the protein-bearing organic layer |

Notes on this matrix:

- `adjust_ph_forward` is the explicitly tested pH-titration shape; see the
  tested shapes section below.
- `prepare_aot_solution` and `mix_phases_forward` are ordinary `draw`/`dispense`
  liquid-handling steps with `adjust` volume set-points on the tool. "Combine
  equal volumes" is a relational volume, but it still resolves to a concrete
  `volume_ml` set-point per `draw` once the scene supplies the aqueous volume;
  no new slot is needed.
- `agitate_forward` ("Shake the mixture gently for 10 minutes") maps as a `use`
  (equipment) interaction whose `response` carries one `TimedWait` on a shaker
  target -- the same shape as a centrifuge or incubator timed phase.
- `centrifuge_forward` and `collect_organic_phase` are the centrifuge-then-pick
  pattern: a `TimedWait` produces a multi-phase result (the "phase state"
  runtime-state row), then a `select`-gesture interaction on a phase target
  resolves which phase the student keeps.

### Stage 2: Backward Extraction coverage matrix

5 steps. `entry_step` of this phase is `prepare_stripping_buffer`; flow reaches
it from `collect_organic_phase` via `next_step`. This phase strips the protein
back into a clean aqueous buffer.

| Step `name`              | gesture(s)                  | validator / step_validator                              | SO primitives                                                             | domain verb     | lab skill taught                                                        |
| ------------------------ | --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| prepare_stripping_buffer | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange                  | draw, dispense  | preparing the 0.02 M phosphate / 0.5 M NaCl stripping buffer at pH 11.0 |
| mix_phases_backward      | click, adjust, click, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange                  | draw, dispense  | combining the retained organic phase with equal-volume stripping buffer |
| agitate_backward         | click                       | correct_target / sequence_complete                      | TimedWait                                                                 | use (equipment) | timed agitation (20 min) to drive back-transfer                         |
| centrifuge_backward      | click                       | correct_target / final_state_matches                    | TimedWait                                                                 | use (equipment) | phase separation by centrifugation (4000 x g, 5 min)                    |
| collect_aqueous_phase    | select                      | correct_choice / final_state_matches                    | feedback-only (optionally LiquidDisplayChange set 0 on the organic phase) | select (phase)  | retaining the bottom aqueous phase holding partially purified miraculin |

Notes on this matrix:

- `prepare_stripping_buffer` makes a buffer "at pH 11.0." As written the buffer
  is specified at a target pH, but the Overview does not say the student
  titrates it -- it reads as a pre-made recipe like the pH 6.8 NaCl solution.
  If a future draft makes the student titrate this buffer, it is the same
  `titrate` shape as `adjust_ph_forward` and needs no new slot. Recorded in the
  gap list as a rough-protocol authoring ambiguity.
- `mix_phases_backward`, `agitate_backward`, `centrifuge_backward`, and
  `collect_aqueous_phase` repeat the Stage 1 shapes exactly: `draw`/`dispense`,
  a `TimedWait` agitation, a `TimedWait` centrifugation producing a phase
  state, and a `select`-gesture phase pick. The recurrence is itself ratifying
  evidence -- the same four shapes carry both extraction stages.
- `collect_aqueous_phase` is the last mapped step; its `next_step` is `null`
  until chromatography Parts 5-7 are authored.

### The three Miraculin-specific shapes tested against the design

WP-RAT-B1 explicitly tests three Miraculin shapes against the M2 model.

**Phase separation.** Expected mapping: an answer-choice-style `target` with a
`select` gesture. Miraculin has three phase-separation decisions:
`discard_pink_supernatant`, `collect_organic_phase`, and
`collect_aqueous_phase`. Each maps cleanly. After a `TimedWait` centrifugation,
the runtime holds a "phase state" -- the runtime state model's dedicated row,
"a multi-phase result the student must resolve" -- with the worked example
"a centrifuged tube holding an aqueous phase and an organic phase." The student
then performs a `select` gesture on a phase target (the pink supernatant, the
organic layer, the aqueous layer), validated by the `correct_choice` interaction
preset. This is the `select` (answer) domain verb shape, applied to a phase
choice rather than a multiple-choice answer; the design doc's `select`-versus-
`click` discussion names "a phase to keep after centrifugation" as an explicit
`select` case. The `response` is `feedback`-only, optionally with a
`LiquidDisplayChange` `operation: set, volume_ml: 0` on the discarded phase to
show it being removed. **Result: maps cleanly with no new slot, gesture, or
primitive.** It is also a positive data point for OQ-8 -- the open question of
whether `select` could merge into `click` -- because the phase target is one
option among a runtime-presented set, which reads as `select`, not as acting on
a free-standing lab object.

**Grinding.** Expected mapping: the `grind` domain verb expanding to an
interaction whose `response` carries an `SvgSwap`. Miraculin's `grind_berries`
step ("Use coffee grinder to grind prepared miraculin berries into a powder") is
the canonical case the design doc already cites -- the `SvgSwap` primitive's
documentation names "Miraculin 'grind berries' -- the berries asset swaps to a
powder asset" as a worked example, and the `grind` domain-verb expansion is
spelled out in full in the design doc with `tool: coffee_grinder`,
`sample: berries`, `result: berry_powder`. The step maps as one `click` on the
`coffee_grinder` target, validated by `correct_target`, whose `response` carries
one `SvgSwap` from the prepared-berry asset to the `berry_powder` asset. The
`step_validator` is `final_state_matches` asserting the grinder shows the
`berry_powder` asset (the "object appearance" runtime-state row). **Result: maps
cleanly, exactly as the design doc predicts; no new slot, gesture, or
primitive.**

**pH titration to a target.** Expected mapping: an `adjust` gesture, and a
check of whether `SetPointDisplayChange` is the right `scene_operation` for the
titrated-to pH value. Miraculin's `adjust_ph_forward` step ("Use 2.5 M NaOH and
0.1 M HCl to adjust the pH of your crude extract to 8.0") maps as a `click` to
pick up the titration tool followed by an `adjust` gesture on the tool or the
extract target, validated by the `target_with_value` interaction preset with
`value: { ph: 8.0 }`. This is the design doc's named set-point skill: `adjust`
"is the continuous, skill-based set-point gesture ... a pH titrated to a target,"
and `target_with_value` "is the preset an `adjust`-gesture interaction uses."
The `response` carries one `SetPointDisplayChange` with `value: { ph: 8.0 }`.
`SetPointDisplayChange` is the right primitive: its documentation explicitly
lists "Titrating a Miraculin buffer to a target pH shows `ph` on the configured
display target," its `value` field is a mapping that already shows `{ ph: 8.0 }`
as an example, and the runtime state model's "set-point values" row names "a
titration at pH 8.0" as a tracked value. The `step_validator` is
`final_state_matches` on the extract's pH. **Result: maps cleanly;
`SetPointDisplayChange` is confirmed as the correct primitive for the titrated-to
pH value, no new slot, gesture, or primitive required.** One soft note: a real
titration uses two reagents (NaOH up, HCl down) to converge on a target, which
is richer than setting a dial; but the design doc deliberately models
titration-to-a-target as an `adjust` set-point, and that abstraction holds for
ratification. If a future plan wants to model the two-reagent convergence as
distinct gestures, that is a pedagogy-depth question, not an M2 expressiveness
gap -- recorded in the gap list as a watch item, not a failure.

### The six M3 ratification questions, answered for this slice

1. **Does every step map to the two-level model?** Yes for all 18 mappable
   steps -- the 7 berry-extract steps, the 6 forward-extraction steps, and the
   5 backward-extraction steps. Each is a `step` with the six required slots
   wrapping an ordered `sequence` of interactions. The non-mapping material is
   not steps that fail to map: Parts 1, 3, 5, 6, and 7 are heading-only or pure
   stubs with no procedure text, and Parts 2 and 4 duplicate Overview content
   already mapped. There is no Miraculin step with real content that fails to
   map to the two-level model.

2. **Does every interaction have `target`, `gesture`, `validator`, and
   `response`?** Yes. Every interaction across the slice resolves to a named
   `target` (a scene object such as `coffee_grinder` or a liquid-handling tool,
   a piece of equipment such as a centrifuge or shaker, or a phase target), a
   `gesture` from the closed set (`click` for lab objects and equipment,
   `adjust` for the volume and pH set-points, `select` for the phase-choice
   decisions), a `validator` preset (`correct_target`, `target_with_value`, or
   `correct_choice`), and a `response` (`scene_operations`, or `feedback`-only
   for the phase picks and `obtain_berries`). No interaction in the slice needs
   a fifth slot.

3. **Do responses use only the 8 ratified `scene_operation` primitives?** Yes.
   The slice exercises six of the eight: `SvgSwap` (`remove_skin_seed`,
   `grind_berries`), `CursorAttach` (every tool pickup), `SetPointDisplayChange`
   (every volume set-point and the pH titration), `LiquidDisplayChange` (every
   draw/dispense/mix), `TimedWait` (the crude centrifugation, both agitations,
   both stage centrifugations). The phase-pick `select` steps optionally use a
   `LiquidDisplayChange` `operation: set, volume_ml: 0` to show a discarded
   phase. `ColorChange` is not strictly required by the Overview text, though
   the design doc names "a pH indicator changing color during the Miraculin
   pH-adjust step" as a `ColorChange` example, so it could appear in
   `adjust_ph_forward` if the scene shows an indicator. `SceneChange` and
   `LayoutMove` are unused by this slice. No response in the slice needs a ninth
   primitive.

4. **Do domain verbs expand cleanly?** Yes. The verbs this slice needs --
   `grind`, `draw`, `dispense`, `mix`, `titrate`, `use` (equipment), `select`
   (phase), and one new `dissect` -- each expand to slots the two-level model
   already has. `grind` and `dissect` are interaction-level, expanding to one
   `SvgSwap`; `draw`, `dispense`, and `mix` are interaction-level over
   `LiquidDisplayChange`; `titrate` is interaction-level over
   `SetPointDisplayChange` (the `adjust`-gesture set-point verb the design doc
   already describes for pH); `use` (equipment) is interaction-level over
   `TimedWait`; `select` (phase) is interaction-level using the `select`
   gesture. `titrate` and `dissect` are new domain verbs but cheap -- each has a
   documented expansion to existing slots and adds no runtime concept. No verb
   in this slice needs runtime behavior with no home in `target`, `gesture`,
   `validator`, or `response`.

5. **Are any new `gesture` values, validator presets, or `scene_operation`
   primitives required?** No. The closed `gesture` set (`click`, `drag`,
   `adjust`, `select`, `type`) covers the slice -- `drag` and `type` are unused
   but no slice interaction needs a sixth gesture. The five-preset validator
   library (`correct_target`, `correct_choice`, `target_with_value`,
   `sequence_complete`, `final_state_matches`) covers it. The eight
   `scene_operation` primitives cover it. The only additions the slice asks for
   are two domain verbs (`titrate`, `dissect`), and domain verbs are the cheap,
   expected layer -- not new base vocabulary. One watch item carries over from
   WP-RAT-A1: instrument-produced data. Miraculin's centrifugation phase-
   separation result is recorded as the M2 "phase state" runtime-state row,
   which the model already names and a `TimedWait` plus the downstream `select`
   already drive -- so phase separation does NOT recur RAT-A-G2 (it has a home
   in the state model). The closest Miraculin candidate for RAT-A-G2 would be a
   purity readout or yield measurement, but the Overview's "94.8% purity" line
   is a stated expected result, not an instrument-read step the student
   performs, so this slice does not add a second hit to RAT-A-G2.

6. **Are any gaps real design gaps versus rough-protocol gaps?** No gap in this
   slice is a real design gap. Every unmappable item is a rough-protocol gap:
   Parts 1, 3, 5, 6, and 7 are unwritten stubs, and Parts 2 and 4 are
   redundant re-statements -- none of that is an interaction-vocabulary failure,
   it is a draft that is not finished. The 18 real Overview steps all map
   cleanly. The two new domain verbs (`titrate`, `dissect`) are cheap
   additions, not design gaps. The minor authoring ambiguities (solid-mass
   metering, whether the stripping buffer is titrated, two-reagent titration
   depth) are rough-protocol authoring choices, not vocabulary gaps. **Nothing
   in the Miraculin slice forces an M2 revision.**

### Gap list for this slice

Each entry is classified: new domain verb (cheap), new `gesture` value
(medium), new `scene_operation` primitive (expensive), design revision
(expensive), or rough-protocol gap (not a vocabulary gap). This list is written
to be merged with the OVCAR8 (WP-RAT-A1) and SDS-PAGE (WP-RAT-C1) gap lists by
the downstream consolidation task.

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                     | Classification                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RAT-B-G1 | Parts 5, 6, and 7 (size exclusion, ion exchange, and IMAC chromatography) are pure stubs -- a student-assignment line and nothing else. There is no procedure text to map.                                                                                                                                                                      | rough-protocol gap -- NOT a vocabulary gap. The protocol needs polishing: these sections must be written before they can be ratified. No M2 model change implied.                                                                                                                                                                                                                                      |
| RAT-B-G2 | Parts 1 and 3 (breaking the cells, salting out) are heading-only stubs; Part 2 duplicates two Overview steps; Part 4 has empty `Forward Extraction Protocol` and `Backward Stripping Protocol` sub-stubs that duplicate Stages 1-2. The `Part 1`-`Part 7` outline and the `Overview` recipe are two un-reconciled drafts of the same procedure. | rough-protocol gap -- NOT a vocabulary gap. The 18 real steps are mapped from the `Overview` recipe; the `Part N` outline needs to be reconciled with or removed in favor of the `Overview`. Content-side cleanup.                                                                                                                                                                                     |
| RAT-B-G3 | The `titrate` domain verb (pH-to-target via `adjust` + `SetPointDisplayChange`) and the `dissect` domain verb (remove skin and seed via one `SvgSwap`) are used by this slice but not in the WP-RAT-A1 verb set.                                                                                                                                | new domain verb (cheap) x2. Each has a documented expansion to existing slots and adds no new runtime concept; this is the cheap, expected layer. Not a design gap.                                                                                                                                                                                                                                    |
| RAT-B-G4 | Solid-mass metering: `homogenize_water` and `resuspend_nacl` specify a solid quantity (1 g powder) alongside a liquid volume. `LiquidDisplayChange` tracks liquid; there is no primitive that tracks a weighed solid mass as runtime state. The slice maps the solid mass as preset target state or a `select` of a pre-portioned amount.       | rough-protocol / authoring choice -- NOT a confirmed vocabulary gap. The interaction maps (the liquid half uses `adjust` + `LiquidDisplayChange`; the solid is preset or selected). A weighed-mass set-point is a possible future `adjust` case if solid weighing recurs as a taught skill across protocols, but Miraculin alone does not clear the cost-guardrail bar. Watch item, not a requirement. |
| RAT-B-G5 | `prepare_stripping_buffer` specifies a buffer "at pH 11.0" but the Overview does not say the student titrates it; it reads as a pre-made recipe like the pH 6.8 NaCl solution. The authored intent (pre-made versus student-titrated) is ambiguous.                                                                                             | rough-protocol gap -- NOT a vocabulary gap. Either reading maps: pre-made is preset target state, student-titrated is the same `titrate` shape as `adjust_ph_forward`. The draft needs to state which. Content-side clarification.                                                                                                                                                                     |
| RAT-B-G6 | `adjust_ph_forward` titrates with two reagents (2.5 M NaOH up, 0.1 M HCl down) converging on pH 8.0. The M2 model abstracts titration-to-a-target as a single `adjust` set-point gesture, which does not represent the two-reagent convergence.                                                                                                 | rough-protocol / pedagogy-depth watch item -- NOT a vocabulary gap. The design doc deliberately models titration-to-a-target as an `adjust` set-point, and that abstraction holds for ratification. Modeling the two-reagent convergence as distinct gestures is a future pedagogy-depth question, not an M2 expressiveness failure. Does not force an M2 revision.                                    |

No gap in this slice is a real design gap that forces a revision of the M2
**interaction vocabulary**. RAT-B-G1, RAT-B-G2, and RAT-B-G5 are rough-protocol
gaps -- Miraculin is an unfinished draft. RAT-B-G3 is the cheap domain-verb
layer working as intended. RAT-B-G4 and RAT-B-G6 are hold-for-evidence watch
items, not confirmed requirements. The eight `scene_operation` primitives, the
five validator presets, the five `gesture` values, and the two-level
`protocol -> step -> interaction -> response` model all hold for every one of
the 18 real Miraculin steps.

### Notes for the downstream consolidation and the other slices

- RAT-A-G2 (instrument-produced data as runtime state) does NOT recur in
  Miraculin. The WP-RAT-A1 notes flagged Miraculin's centrifuge phase-separation
  result as a candidate; ratification finds it is not one. Phase separation has
  an explicit home in the M2 model -- the "phase state" runtime-state row, a
  `TimedWait` that produces it, and a `select`-gesture interaction that resolves
  it. The centrifuge result is tracked state the model already names, not an
  un-homed instrument data value. Miraculin therefore adds zero hits to
  RAT-A-G2; it stays a one-slice (OVCAR8) watch item pending the SDS-PAGE slice.
- The two new domain verbs (`titrate`, `dissect`, RAT-B-G3) should merge into
  the consolidated verb list as cheap additions. `titrate` in particular is
  worth noting: the design doc already anticipates it (pH-to-target `adjust`),
  so it is a verb the model was designed to receive.
- Miraculin is the rough-draft slice: most of its gap list (RAT-B-G1, RAT-B-G2,
  RAT-B-G5) is "the protocol needs polishing," not "the vocabulary needs
  changing." The consolidation task should keep these clearly separated from
  the WP-RAT-A1 content-fidelity findings -- both are content-side, but
  Miraculin's are unwritten-draft gaps while WP-RAT-A1's are
  wrong-shape-in-finished-content gaps.
- The phase-separation, grinding, and pH-titration shapes all mapped cleanly and
  exactly as the design doc predicted. That is three Miraculin-specific shapes
  the M2 model was stress-tested against and passed; the SDS-PAGE slice should
  similarly stress-test its assembly and iterative-destain shapes.

## M3 ratification: SDS-PAGE

This is the WP-RAT-C1 ratification slice: the SDS-PAGE protocol
([../protocols/SDS-PAGE_Protocol_2026.md](../protocols/SDS-PAGE_Protocol_2026.md)), a polyacrylamide
gel electrophoresis run for protein separation, mapped to the M2 two-level model
in
[unified_interaction_vocabulary_design.md](unified_interaction_vocabulary_design.md).
The OVCAR8 and shipped-content slice (WP-RAT-A1) and the Miraculin slice
(WP-RAT-B1) are separate sections above. This slice maps the protocol on paper
only; it changes no protocol and no code, and it does not change the M2 model.
Where a step will not map, it is recorded as a gap entry, not a redesign.
SDS-PAGE is a rough draft -- several Parts are heading-only or one-line stubs --
and a step too stubbed to map is a rough-protocol gap, not a vocabulary failure,
and is classified that way.

### Method

The SDS-PAGE doc's `Experimental Procedure` is organized as Parts 1 through 10.
Three of those Parts carry real, mappable procedure text: Part 3 (`Preparation
of the BioRad Gel Cassette`, 6 numbered sub-steps), Part 5 (`Step-by-Step
Loading Procedure`, real numbered loading steps), and Part 6 (`Connect Power
Supply and Run the Gel`, with the voltage and run-time table and the
bands-at-bottom visual cue). Part 2 (`Prepare Tris/Glycine/SDS electrophoresis
buffer`) carries one real recipe line (dilute 100 mL of 10X stock with 900 mL
deionized water). Part 1 (`Prepare Protein Sample and MW Ladder`) is half-written
-- it states "Mix BME, Laemmli, and protein sample (provide more details), heat,
etc." plus volume formulas, enough to map at a coarse grain but explicitly
flagged "provide more details." Parts 8, 9, and 10 are one-line stubs ("Use the
tool"; "Stain and destain, microwave, shake"; "Light box, smartphone camera")
that name the lab action but carry no step-by-step text; they are mapped at the
coarsest grain the one line supports and the missing detail is recorded as a
rough-protocol gap. Part 4 (`Assemble the BioRad electrophoresis apparatus`) and
Part 7 (`Recycle the SDS buffer and store`) are heading-plus-fragment stubs with
no procedure text -- Part 4 reads only "Spacers, SDS buffer (volume), check for
leaks" and Part 7 has no body -- and are recorded as unmappable rough-protocol
stubs. The `Pre-Laboratory Procedure` Parts 1-4 (Bradford concentration assay,
sample concentration range, 10k MWCO filter concentration, stain and destain
preparation) are pre-lab calculation or preparation sections: Part 1 is a
Bradford calculation, Parts 2-4 are stubs; none is a wet bench interaction step
of the gel run itself, and they are recorded but not mapped as run steps.

Each mappable step is mapped to the M2 step slots (`name`, `prompt`, `sequence`,
`step_validator`, `outcome`, `next_step`) and every interaction to its four
slots (`target`, `gesture`, `validator`, `response`). `SO` abbreviates
`scene_operation`. The domain verb and lab skill columns answer the
pedagogy-first ratification standard. The proposed step `name` values are
snake_case identifiers chosen for meaning; they are mapping conveniences, not
authored YAML.

### Step counts for this slice

| Source                                                | Mappable steps                                   |
| ----------------------------------------------------- | ------------------------------------------------ |
| Part 1 (prepare protein sample and MW ladder)         | 1 (half-written; coarse-grain map)               |
| Part 2 (prepare running buffer)                       | 1                                                |
| Part 3 (prepare the BioRad gel cassette)              | 6                                                |
| Part 4 (assemble the electrophoresis apparatus)       | 0 (heading-plus-fragment stub)                   |
| Part 5 (sample loading in the well)                   | 3                                                |
| Part 6 (connect power supply and run the gel)         | 2                                                |
| Part 7 (recycle the SDS buffer and store)             | 0 (heading-only stub)                            |
| Part 8 (separate the gel from its cassette)           | 1 (one-line stub; coarse-grain map)              |
| Part 9 (staining the gel)                             | 2 (one-line stub; coarse-grain map)              |
| Part 10 (imaging the gel)                             | 1 (one-line stub; coarse-grain map)              |
| Pre-Lab Parts 1-4 (Bradford, range, MWCO, stain prep) | 0 (pre-lab; calculation or stub, not a run step) |
| Slice total                                           | 17                                               |

`outcome` is `{on_success: complete, on_failure: retry}` on every mapped step.
`next_step` is the next row in reading order; the final mapped step
(`image_gel` in Part 10) has `next_step: null`.

### Part 1 and Part 2 coverage matrix

Sample and buffer preparation. `entry_step: prepare_sample`. Part 1 is
half-written; it is mapped at the coarsest grain its text supports.

| Step `name`            | gesture(s)                 | validator / step_validator           | SO primitives                                | domain verb                          | lab skill taught                                                                                |
| ---------------------- | -------------------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| prepare_sample         | click, click, click, click | correct_target / final_state_matches | CursorAttach, LiquidDisplayChange, TimedWait | draw, dispense, mix, use (equipment) | preparing a reduced, denatured protein sample with Laemmli buffer and BME, then heating at 95 C |
| prepare_running_buffer | click, click               | correct_target / final_state_matches | CursorAttach, LiquidDisplayChange            | draw, dispense                       | diluting 10X running buffer stock to 1X working buffer                                          |

Notes on this matrix:

- `prepare_sample` is the Part 1 step "Mix BME, Laemmli, and protein sample ...
  heat, etc." It maps as a `draw`/`dispense` sequence combining BME, Laemmli
  sample buffer, and the protein sample in a microtube, followed by a `use`
  (equipment) interaction on the 95 C heating block that carries a `TimedWait`
  for the denaturation heat step. The volume formulas (total volume y = x/0.7,
  BME = y/20, Laemmli = y/4) are relational volumes; like Miraculin's "combine
  equal volumes," each resolves to a concrete `volume_ml` set-point per `draw`
  once the scene supplies the protein volume, so no new slot is needed. The
  step is half-written ("provide more details"), so the exact interaction count
  is provisional -- recorded in the gap list as a rough-protocol gap.
- `prepare_running_buffer` is the Part 2 step "Dilute 100 ml 10x stock with
  900 ml deionized water." It is an ordinary two-`draw`/`dispense` liquid-handling
  step over `LiquidDisplayChange`. The volumes are large (mL, not uL) but the
  shape is identical to every other draw/dispense in the OVCAR8 and Miraculin
  slices.

### Part 3 coverage matrix: preparing the BioRad gel cassette

6 steps. `entry_step` of this phase is `open_precast_gel`; flow reaches it from
`prepare_running_buffer` via `next_step`. This is the ordered-assembly phase --
the explicitly tested ordered-assembly shape; see the tested shapes section
below.

| Step `name`            | gesture(s)   | validator / step_validator           | SO primitives                     | domain verb             | lab skill taught                                                                 |
| ---------------------- | ------------ | ------------------------------------ | --------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| open_precast_gel       | click        | correct_target / sequence_complete   | SvgSwap                           | unwrap                  | unpacking a precast gel and removing the protective tape                         |
| orient_cassette        | drag         | correct_target / final_state_matches | LayoutMove                        | place                   | orienting the cassette so the wells face inward                                  |
| seat_cassette_in_tank  | drag         | correct_target / final_state_matches | LayoutMove                        | place                   | replacing a glass wall with the gel cassette in the tank                         |
| clamp_cassette         | drag, drag   | correct_target / sequence_complete   | LayoutMove                        | clamp                   | securing the side clamps for a watertight seal                                   |
| leak_check_remove_comb | click, click | correct_target / final_state_matches | TimedWait, SvgSwap                | use (equipment), remove | leak-checking the assembled tank and removing the comb                           |
| fill_running_buffer    | click, click | correct_target / final_state_matches | CursorAttach, LiquidDisplayChange | draw, dispense          | filling the inner chamber and outer tank with 1X running buffer to the well line |

Notes on this matrix:

- The whole of Part 3 is one `assemble` step-level domain verb's expansion: an
  ordered `sequence` of placement interactions whose `step_validator` checks
  every part reached its slot. The matrix shows it broken into six M2 steps
  because the protocol numbers six distinct sub-steps with their own pedagogy;
  whether the YAML author writes one `assemble` step or six steps is an
  authoring grain choice, not a vocabulary question -- both map.
- `open_precast_gel` maps as a `click` on the packaged gel with an `SvgSwap`
  (bagged-gel asset to ready-cassette asset). An `unwrap` domain verb is the
  natural author word; it is interaction-level and expands to one `SvgSwap`, the
  same shape as Miraculin's `grind` and `dissect`. `unwrap` is a new domain verb
  (cheap) -- it adds no new slot.
- `orient_cassette`, `seat_cassette_in_tank`, and `clamp_cassette` are the
  ordered-assembly core. Each maps as a `drag` gesture on a named target whose
  `response` carries a `LayoutMove` to a named layout slot -- exactly the
  `LayoutMove` primitive's documented SDS-PAGE example ("the gel cassette moving
  into the tank ... ordered-assembly moves where the object changes position,
  not appearance"). A `place` domain verb (and a `clamp` verb for the clamp
  pair) expands to a `drag` interaction over one `LayoutMove`; both are new
  domain verbs (cheap).
- `leak_check_remove_comb` maps as a `use` (equipment) interaction -- raising
  the tank and watching for leaks reads as a short `TimedWait` or an
  inspect-style `feedback`-only interaction -- followed by a comb-removal
  interaction whose `response` carries an `SvgSwap` (cassette-with-comb asset to
  cassette-without-comb asset). The protocol gates comb removal on "once there
  is no leakage," which is an ordering constraint inside the step's `sequence`;
  `sequence` order already enforces it.
- `fill_running_buffer` is an ordinary `draw`/`dispense` over
  `LiquidDisplayChange`, filling to a named level ("the same level where the
  wells are filled"). The fill level is a `volume_ml` target on the destination;
  no new slot is needed.

### Part 5 coverage matrix: sample loading in the well

3 steps. `entry_step` of this phase is `determine_loading_volume`; flow reaches
it from `fill_running_buffer` via `next_step`. This phase loads the ladder and
the samples into the gel lanes.

| Step `name`              | gesture(s)           | validator / step_validator                              | SO primitives                                            | domain verb     | lab skill taught                                                                |
| ------------------------ | -------------------- | ------------------------------------------------------- | -------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| determine_loading_volume | select               | correct_choice / sequence_complete                      | feedback-only                                            | select (answer) | calculating the protein volume needed to load 2 ug per well                     |
| load_ladder              | click, adjust, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense  | loading the molecular weight ladder into the middle well as a size reference    |
| load_samples             | click, adjust, click | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange, LiquidDisplayChange | draw, dispense  | loading prepared protein samples into the gel wells without cross-contamination |

Notes on this matrix:

- `determine_loading_volume` is the Part 5 calculation step ("determine the
  exact volume of your protein concentration is needed to reach 2 ug of protein
  per well"). It maps the same way the OVCAR8 / `drug_dilution_setup` and the
  OVCAR8 slice's calculation steps map: as a `select`-gesture interaction on an
  answer-choice target validated by `correct_choice`, with a `feedback`-only
  `response`. A calculation step is a decision, not a scene mutation. This is
  the worked-volume pattern from the protocol's own "Example" block (C =
  0.40 ug/uL gives 5 uL).
- `load_ladder` and `load_samples` are the volume-set-point loading steps. Each
  maps as: a `click` to pick up the P10 micropipette (`CursorAttach`); an
  `adjust` gesture setting the micropipette to the calculated volume, validated
  by `target_with_value` and carrying a `SetPointDisplayChange` -- this is the
  volume set-point shape tested below, and encoding it as a plain `click` would
  be the named timed-click anti-pattern; then a `click` on the target well to
  dispense (`LiquidDisplayChange`). The `step_validator` is `final_state_matches`
  asserting the well holds the loaded volume.
- The protocol's loading tips ("use two hands," "push slowly," "use a new
  gel-loading tip for each well," "do not exceed the well's volume capacity")
  are technique guidance, not extra interactions. They belong in `prompt` text
  or `feedback`, not as new slots. The "middle well" and "desired well" targets
  are semantic target names; the scene adapter resolves which scene object each
  is -- the protocol vocabulary names no lane index or coordinate, consistent
  with the WP-BND1 boundary rule.

### Part 6 coverage matrix: connect power supply and run the gel

2 steps. `entry_step` of this phase is `set_power_supply`; flow reaches it from
`load_samples` via `next_step`. This phase runs the electrophoresis.

| Step `name`      | gesture(s)    | validator / step_validator                              | SO primitives                       | domain verb     | lab skill taught                                              |
| ---------------- | ------------- | ------------------------------------------------------- | ----------------------------------- | --------------- | ------------------------------------------------------------- |
| set_power_supply | click, adjust | correct_target, target_with_value / final_state_matches | CursorAttach, SetPointDisplayChange | connect, set    | connecting the power supply leads and setting the run voltage |
| run_gel          | click         | correct_target / final_state_matches                    | TimedWait                           | use (equipment) | running the gel until the dye front reaches the bottom        |

Notes on this matrix:

- `set_power_supply` is the explicitly tested voltage set-point shape; see the
  tested shapes section below. It maps as a `click` to connect the leads
  (`CursorAttach` or a `feedback`-only connect interaction) followed by an
  `adjust` gesture on the power supply, validated by `target_with_value` with
  `value: { voltage_v: 150 }`, whose `response` carries one
  `SetPointDisplayChange` with `value: { voltage_v: 150 }`. A `connect` domain
  verb covers the lead connection; `set` is the `adjust`-gesture set-point verb.
- `run_gel` maps as a `use` (equipment) interaction whose `response` carries one
  `TimedWait` on the electrophoresis tank -- the `TimedWait` primitive's
  documented SDS-PAGE example ("running the gel -- the gel tank runs its timed
  electrophoresis phase"). The voltage/run-time table (150 V for 25-30 min,
  200 V for 20-25 min) supplies `duration_min`. The bands-at-bottom visual cue
  ("If bands have reached the bottom of the gel, turn off the power supply") is
  the completion condition; it maps as the `final_state_matches` `step_validator`
  asserting the dye front reached the bottom, or as the `_elapsed` event the
  `TimedWait` emits. No new construct is needed.

### Part 8, Part 9, Part 10 coverage matrix: separate, stain, image

4 steps. `entry_step` of this phase is `separate_gel`; flow reaches it from
`run_gel` via `next_step`. These three Parts are one-line stubs in the draft;
each is mapped at the coarsest grain its single line supports, and the missing
step-by-step text is recorded as a rough-protocol gap.

| Step `name`  | gesture(s)   | validator / step_validator           | SO primitives                           | domain verb              | lab skill taught                                                  |
| ------------ | ------------ | ------------------------------------ | --------------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| separate_gel | click        | correct_target / final_state_matches | SvgSwap                                 | open                     | freeing the gel from its cassette with the gel opening tool       |
| stain_gel    | click, click | correct_target / final_state_matches | LiquidDisplayChange, SvgSwap, TimedWait | stain, use (equipment)   | submerging the gel in Coomassie stain and agitating on the shaker |
| destain_gel  | click, click | correct_target / final_state_matches | LiquidDisplayChange, TimedWait          | destain, use (equipment) | destaining the gel on the shaker until the background runs clear  |
| image_gel    | click        | correct_target / final_state_matches | feedback-only (optionally SvgSwap)      | image                    | imaging the stained gel on a light box to read the protein bands  |

Notes on this matrix:

- `separate_gel` is the Part 8 stub ("Use the tool"). It maps as one `click` on
  the gel opening tool whose `response` carries an `SvgSwap` (gel-in-cassette
  asset to free-gel asset). The single line maps; the absence of step-by-step
  detail is a rough-protocol gap.
- `stain_gel` and `destain_gel` are the Part 9 stub ("Stain and destain,
  microwave, shake"). `stain_gel` maps as a `stain` interaction
  (`LiquidDisplayChange` adding Coomassie to the staining tray, plus an `SvgSwap`
  as the gel takes up stain -- the `SvgSwap` primitive's documented SDS-PAGE
  example, "the gel asset swaps to a stained-gel asset") followed by a `use`
  (equipment) interaction carrying a `TimedWait` on the shaker. `destain_gel` is
  the explicitly tested iterative-destain shape; see the tested shapes section
  below. The "microwave" mention in the stub is an acceleration technique with
  no procedure text; recorded as a rough-protocol gap.
- `image_gel` is the Part 10 stub ("Light box, smartphone camera"). It maps as
  one `click` on the light box, validated by `correct_target`, with a
  `feedback`-only `response` (optionally an `SvgSwap` to a lit-gel asset). This
  is the gel-image read -- see the RAT-A-G2 recurrence discussion in the gap
  list below.

### The three SDS-PAGE-specific shapes tested against the design

WP-RAT-C1 explicitly tests three SDS-PAGE shapes against the M2 model.

**Ordered assembly.** Expected mapping: a `sequence` of `drag` or `select`
interactions on ordered targets, with an order-checking `step_validator`
(`sequence_complete`). SDS-PAGE has two ordered-assembly spans: the Part 3 gel
cassette assembly (`open_precast_gel`, `orient_cassette`, `seat_cassette_in_tank`,
`clamp_cassette`, `leak_check_remove_comb`, `fill_running_buffer`) and, within a
step, the clamp pair in `clamp_cassette`. Each maps cleanly. The `assemble`
step-level domain verb is exactly this: the design doc defines it as "an ordered
sequence of `LayoutMove` interactions (place the cassette, orient it, attach the
clamps)" with a `step_validator` that "checks every part reached its slot in
order," and it names "SDS-PAGE assembly" as the source case. Each placement
interaction is a `drag` gesture on a named target whose `response` carries one
`LayoutMove` to a named layout slot. The order is enforced two ways, both already
in the model: the `sequence` slot's order is "always meaningful ... there is no
unordered mode," so the interactions validate in listed order; and the
`step_validator` is `sequence_complete` ("every interaction in the step's
`sequence` validated, in order"). The ordered `sequence` plus `sequence_complete`
together enforce order with no new construct: a student who clamps before
seating the cassette fails the next interaction's validator because the sequence
is positional. **Result: maps cleanly; the ordered `sequence` plus
`sequence_complete` enforce assembly order with no new slot, gesture, or
primitive. `place`, `clamp`, and `unwrap` are new domain verbs (cheap).**

**Voltage and volume set-points.** Expected mapping: an `adjust` gesture writing
a `SetPointDisplayChange` -- `value: { voltage_v: ... }` for the power supply,
`value: { volume_ml: ... }` for loading volumes. SDS-PAGE has both. The power
supply in `set_power_supply` maps as an `adjust` gesture validated by
`target_with_value` with `value: { voltage_v: 150 }`, whose `response` carries
one `SetPointDisplayChange` with `target: power_supply_display` and
`value: { voltage_v: 150 }` -- this is verbatim the design doc's
`SetPointDisplayChange` canonical voltage example and its named example "Setting
the SDS-PAGE power supply to 150 V." The micropipette volume set-points in
`load_ladder` and `load_samples` map as `adjust` gestures validated by
`target_with_value` with `value: { volume_ml: ... }`, each carrying a
`SetPointDisplayChange` with `target: pipette_volume_display`. Both are the
pedagogy-first correct shape: encoding the micropipette volume as a plain `click`
would be the design doc's named timed-click anti-pattern, "a set-point skill
collapsed into a rote `click`." **Result: both map cleanly;
`SetPointDisplayChange` with `value: { voltage_v: ... }` and
`value: { volume_ml: ... }` is confirmed as the correct primitive for both the
power-supply voltage and the loading volumes, no new slot, gesture, or primitive
required.**

**The iterative destain loop.** Expected mapping: a `step_validator` condition
plus `outcome.on_failure: retry`, where retry restarts the whole step. SDS-PAGE's
`destain_gel` step destains the gel "until the background runs clear" -- a
repeat-until-condition loop. It maps exactly as the design doc spells out for
this case: the design doc names "the iterative loop -- SDS-PAGE destaining until
the background is clear" and shows the precise mapping -- a `final_state_matches`
`step_validator` with `target: gel` and `contains: { background_clear: true }`,
plus `outcome: { on_success: complete, on_failure: retry }`. While the
background-clear state is not reached, `on_failure: retry` "restarts the whole
step -- the entire `sequence` resets and the student redoes the step from its
first interaction." The destain-and-check cycle is the `step_validator` preset
and the `retry` outcome working together; the design doc is explicit that "there
is no separate `repeat_until` construct and no separate loop step type."
**Result: maps cleanly; the destain-until-clear loop is
`outcome: { on_success: complete, on_failure: retry }` plus a
`final_state_matches` `step_validator` -- exactly the design doc's worked
example, with no new construct.**

### The six M3 ratification questions, answered for this slice

1. **Does every step map to the two-level model?** Yes for all 17 mappable
   steps -- Part 1's 1 step, Part 2's 1 step, Part 3's 6 steps, Part 5's 3
   steps, Part 6's 2 steps, and Parts 8-10's 4 steps. Each is a `step` with the
   six required slots wrapping an ordered `sequence` of interactions. The
   non-mapping material is not steps that fail to map: Part 4 (assemble the
   apparatus) and Part 7 (recycle the buffer) are heading-plus-fragment stubs
   with no procedure text, and the `Pre-Laboratory Procedure` Parts 2-4 are
   pre-lab stubs. There is no SDS-PAGE step with real content that fails to map
   to the two-level model. Parts 1, 8, 9, and 10 are one-line or half-written
   stubs; they map at a coarse grain, and the missing detail is recorded as
   rough-protocol gaps, not vocabulary failures.

2. **Does every interaction have `target`, `gesture`, `validator`, and
   `response`?** Yes. Every interaction across the slice resolves to a named
   `target` (a scene object such as the gel cassette or the staining tray, a
   liquid-handling tool such as the P10 micropipette, a piece of equipment such
   as the heating block, the shaker, the electrophoresis tank, or the power
   supply, or an answer-choice target for the loading-volume calculation), a
   `gesture` from the closed set (`click` for lab objects and equipment, `drag`
   for the cassette-assembly placement moves, `adjust` for the voltage and
   volume set-points, `select` for the calculation decision), a `validator`
   preset (`correct_target`, `target_with_value`, or `correct_choice`), and a
   `response` (`scene_operations`, or `feedback`-only for the calculation step
   and the gel-image read). No interaction in the slice needs a fifth slot.

3. **Do responses use only the 8 ratified `scene_operation` primitives?** Yes.
   The slice exercises seven of the eight: `SvgSwap` (`open_precast_gel`,
   comb removal in `leak_check_remove_comb`, `separate_gel`, the gel taking up
   stain in `stain_gel`), `LayoutMove` (every Part 3 cassette-placement move --
   the design doc's named `LayoutMove` example), `CursorAttach` (every
   liquid-handling tool pickup), `LiquidDisplayChange` (every draw/dispense and
   every buffer or stain fill), `SetPointDisplayChange` (the voltage set-point
   and the micropipette volume set-points), `TimedWait` (the 95 C heat step, the
   leak-check, the gel run, and the stain and destain shaker phases),
   `ColorChange` is the one that is only optionally exercised -- the gel
   background going from blue to clear during destaining could be a
   `ColorChange`, though the slice maps `destain_gel` with a
   `LiquidDisplayChange` swap of destain solution and a `final_state_matches`
   check on the background-clear state. `SceneChange` is unused by this slice.
   No response in the slice needs a ninth primitive.

4. **Do domain verbs expand cleanly?** Yes. The verbs this slice needs --
   `draw`, `dispense`, `mix`, `use` (equipment), `assemble`, `place`, `clamp`,
   `unwrap`, `remove`, `connect`, `set`, `stain`, `destain`, `open`, `image`,
   `select` (answer) -- each expand to slots the two-level model already has.
   `draw`, `dispense`, `mix`, `place`, `clamp`, `unwrap`, `remove`, `connect`,
   `set`, `stain`, `destain`, `open`, `image`, and `select` are
   interaction-level; `assemble` is the step-level ordered-`LayoutMove`
   composition the design doc already defines with SDS-PAGE as its source case.
   The new verbs in this slice (`place`, `clamp`, `unwrap`, `remove`, `connect`,
   `set`, `stain`, `destain`, `open`, `image`) are all cheap -- each has a
   documented expansion to existing slots (`place`/`clamp` over `LayoutMove`;
   `unwrap`/`remove`/`open` over `SvgSwap`; `connect`/`image` as `click`
   interactions; `set` over `SetPointDisplayChange`; `stain`/`destain` over
   `LiquidDisplayChange` plus a `TimedWait`) and adds no new runtime concept. No
   verb in this slice needs runtime behavior with no home in `target`,
   `gesture`, `validator`, or `response`.

5. **Are any new `gesture` values, validator presets, or `scene_operation`
   primitives required?** No. The closed `gesture` set (`click`, `drag`,
   `adjust`, `select`, `type`) covers the slice -- and SDS-PAGE is the slice that
   finally exercises `drag` (the cassette-assembly placement moves), which the
   OVCAR8 and Miraculin slices left unused. `type` is still unused, but no slice
   interaction needs a sixth gesture. The five-preset validator library
   (`correct_target`, `correct_choice`, `target_with_value`, `sequence_complete`,
   `final_state_matches`) covers it -- the ordered-assembly `sequence_complete`
   and the destain-loop `final_state_matches` are both exercised. The eight
   `scene_operation` primitives cover it. The only additions the slice asks for
   are domain verbs, which are the cheap, expected layer. One watch item carries
   over from WP-RAT-A1 and is addressed in the gap list: the Part 10 gel-image
   read.

6. **Are any gaps real design gaps versus rough-protocol gaps?** No gap in this
   slice is a real design gap that forces an M2 revision. Every unmappable item
   is a rough-protocol gap: Part 4 and Part 7 are unwritten stubs, the
   `Pre-Laboratory Procedure` Parts 2-4 are pre-lab stubs, and Parts 1, 8, 9,
   and 10 are half-written or one-line stubs that map at a coarse grain but lack
   step-by-step detail -- none of that is an interaction-vocabulary failure, it
   is a draft that is not finished. The 17 mappable steps all map cleanly. The
   new domain verbs are cheap additions, not design gaps. The gel-image read
   (Part 10) does map -- as a `click` with a `feedback`-only response -- so it is
   not a hard expressiveness gap; it is the RAT-A-G2 recurrence watch item,
   discussed in the gap list and the notes below. **Nothing in the SDS-PAGE
   slice forces an M2 revision.**

### Gap list for this slice

Each entry is classified: new domain verb (cheap), new `gesture` value
(medium), new `scene_operation` primitive (expensive), design revision
(expensive), or rough-protocol gap (not a vocabulary gap). This list is written
to be merged with the OVCAR8 (WP-RAT-A1) and Miraculin (WP-RAT-B1) gap lists by
the downstream consolidation task.

| Gap ID   | Description                                                                                                                                                                                                                                                                                                                                                                                                                            | Classification                                                                                                                                                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAT-C-G1 | Part 4 (assemble the electrophoresis apparatus) and Part 7 (recycle the SDS buffer and store) are heading-plus-fragment stubs with no procedure text -- Part 4 reads only "Spacers, SDS buffer (volume), check for leaks" and Part 7 has no body. The `Pre-Laboratory Procedure` Parts 2-4 (sample concentration range, 10k MWCO filter, stain and destain preparation) are likewise pre-lab stubs. There is no procedure text to map. | rough-protocol gap -- NOT a vocabulary gap. The protocol needs polishing: these sections must be written before they can be ratified. No M2 model change implied.                                                                                                                                                                                                      |
| RAT-C-G2 | Parts 1, 8, 9, and 10 are half-written or one-line stubs. Part 1 ("Mix BME, Laemmli, and protein sample (provide more details), heat, etc.") explicitly flags missing detail; Part 8 is "Use the tool"; Part 9 is "Stain and destain, microwave, shake"; Part 10 is "Light box, smartphone camera." Each maps at a coarse grain, but the exact interaction count and per-step detail are provisional.                                  | rough-protocol gap -- NOT a vocabulary gap. The coarse-grain map holds and uses only existing slots and primitives; the steps need step-by-step text written before the mapping can be finalized. Content-side authoring work.                                                                                                                                         |
| RAT-C-G3 | The new domain verbs this slice uses -- `place` and `clamp` (over `LayoutMove`), `unwrap`, `remove`, and `open` (over `SvgSwap`), `connect` and `image` (`click` interactions), `set` (over `SetPointDisplayChange`), and `stain` and `destain` (over `LiquidDisplayChange` plus `TimedWait`) -- are used by this slice but not in the WP-RAT-A1 or WP-RAT-B1 verb sets.                                                               | new domain verb (cheap), multiple. Each has a documented expansion to existing slots and adds no new runtime concept; this is the cheap, expected layer. `assemble` was already anticipated by the design doc with SDS-PAGE as its named source case. Not a design gap.                                                                                                |
| RAT-C-G4 | The Part 10 gel-image read (`image_gel`) is an instrument read: the student images the stained gel on a light box and reads the protein bands. As in OVCAR8's `capture_count` and `plate_read`, no `scene_operation` writes "instrument produced a data value" (here, the band pattern / molecular weight read) as runtime state; it maps as a `feedback`-only response. This recurs RAT-A-G2.                                         | possible new `scene_operation` primitive (expensive) -- NOT yet required: the interaction maps. This is RAT-A-G2's second slice hit (see the recurrence note below). It crosses the cost-guardrail recurrence bar and should be escalated to the consolidation task as a confirmed new-primitive proposal to evaluate -- but it is still not a step that fails to map. |
| RAT-C-G5 | Part 1's volume formulas (total volume y = x/0.7, BME = y/20, Laemmli = y/4) and Part 5's loading-volume calculation are relational and calculated volumes rather than fixed authored set-points. The slice maps them as concrete `volume_ml` set-points resolved once the scene supplies the input volume, and the calculation itself as a `select` decision.                                                                         | rough-protocol / authoring choice -- NOT a vocabulary gap. The same relational-volume pattern was mapped cleanly in Miraculin ("combine equal volumes"); each resolves to a concrete `volume_ml` per `draw`. The draft would benefit from stating worked example volumes, but the mapping holds.                                                                       |
| RAT-C-G6 | Part 9 mentions "microwave" as a stain or destain acceleration step with no procedure text -- it is named in the one-line stub but never described. Whether it is a `TimedWait` on a microwave target or a technique note is unspecified.                                                                                                                                                                                              | rough-protocol gap -- NOT a vocabulary gap. If it is a timed acceleration phase, `TimedWait` already expresses it (a `use` (equipment) interaction on a microwave target); if it is a technique note, it belongs in `prompt` or `feedback`. The draft needs to state which. Content-side clarification.                                                                |

No gap in this slice is a real design gap that forces a revision of the M2
**interaction vocabulary**. RAT-C-G1, RAT-C-G2, RAT-C-G5, and RAT-C-G6 are
rough-protocol gaps -- SDS-PAGE is an unfinished draft. RAT-C-G3 is the cheap
domain-verb layer working as intended. RAT-C-G4 is the RAT-A-G2 recurrence: it
is a confirmed-recurring watch item that the consolidation task must now treat
as a real new-primitive proposal, but it is still not a step that fails to map,
so it does not by itself force an M2 revision -- it forces a consolidation-level
decision. The eight `scene_operation` primitives, the five validator presets,
the five `gesture` values, and the two-level
`protocol -> step -> interaction -> response` model all hold for every one of
the 17 mappable SDS-PAGE steps.

### Notes for the downstream consolidation and the other slices

- **RAT-A-G2 recurrence count: RAT-C-G4 is the second slice hit.** OVCAR8
  (`capture_count`, `plate_read`) raised RAT-A-G2 -- instrument-produced data
  with no `scene_operation` to record it as runtime state. The WP-RAT-A1 notes
  asked the Miraculin and SDS-PAGE slices to test recurrence. Miraculin did NOT
  recur it -- its centrifuge phase-separation result has an explicit home in the
  M2 "phase state" runtime-state row. SDS-PAGE DOES recur it: the Part 10
  gel-image / light-box read (`image_gel`, RAT-C-G4) produces a band pattern and
  a molecular-weight read that no `scene_operation` records as runtime state, the
  same shape as OVCAR8's cell count and absorbance value. That is **two slices**
  (OVCAR8 and SDS-PAGE) hitting the same gap. The design doc's cost guardrail
  sets the bar for a new `scene_operation` primitive at "a recurring shape,
  across more than one protocol, that no existing primitive or composition
  expresses." RAT-A-G2 now meets that bar. The consolidation task should escalate
  RAT-A-G2 / RAT-C-G4 as a **confirmed new-primitive proposal** -- a candidate
  `DataReadout` or `InstrumentReadDisplayChange` primitive that records an
  instrument-produced data value as runtime state -- to be evaluated under the
  cost guardrail. Important scoping note: this is still not a step that fails to
  map. Every instrument-read interaction maps cleanly as a `click` with a
  `feedback`-only response; what is missing is only the runtime-state recording
  of the produced value. So this is a guardrail-triggered enhancement proposal,
  NOT an M2 revision that blocks M3 -- M3 ratification succeeds; the consolidation
  decides whether to act on the now-confirmed recurrence.
- **SDS-PAGE is the slice that exercises `drag` and `LayoutMove`.** The OVCAR8
  and Miraculin slices left the `drag` gesture unused; SDS-PAGE's gel-cassette
  assembly is the first slice to exercise it, and the first to exercise
  `LayoutMove` heavily (OVCAR8 used it lightly). Both held cleanly. That is a
  positive coverage data point: the closed five-gesture set and the eight-primitive
  set are now each exercised by the ratification slices, with only `type`
  unexercised across all three.
- **The `assemble` step-level verb is confirmed by its named source case.** The
  design doc defined `assemble` with "SDS-PAGE assembly is the source case." This
  slice confirms that: the Part 3 cassette assembly maps exactly as `assemble`
  predicts -- an ordered `sequence` of `LayoutMove` interactions with a
  `sequence_complete` `step_validator` enforcing order. The verb the model was
  designed to receive is the verb the protocol needs.
- **The iterative destain loop is confirmed by its named worked example.** The
  design doc's validator section uses "SDS-PAGE destaining until the background
  is clear" as the worked example for the `final_state_matches` plus
  `outcome.on_failure: retry` loop. This slice confirms that mapping verbatim --
  no `repeat_until` construct, no loop step type, just the `step_validator`
  preset and the `retry` outcome working together.
- SDS-PAGE is the rough-draft slice, like Miraculin: most of its gap list
  (RAT-C-G1, RAT-C-G2, RAT-C-G5, RAT-C-G6) is "the protocol needs polishing,"
  not "the vocabulary needs changing." The consolidation task should group these
  with Miraculin's unwritten-draft gaps (RAT-B-G1, RAT-B-G2, RAT-B-G5), distinct
  from WP-RAT-A1's wrong-shape-in-finished-content gaps.
- The ordered-assembly, voltage/volume set-point, and iterative-destain shapes
  all mapped cleanly and exactly as the design doc predicted. That is three
  SDS-PAGE-specific shapes the M2 model was stress-tested against and passed,
  matching the three Miraculin shapes and completing the M3 ratification's
  shape-coverage stress test.

## M3 ratification: consolidated residual-gap list

This is the WS-RAT-A serial-join section: the consolidated residual-gap list
that closes milestone M3 ratification. It merges every gap entry from the three
ratification slices -- OVCAR8 and shipped content (WP-RAT-A1, gaps
RAT-A-G1..G7), Miraculin (WP-RAT-B1, gaps RAT-B-G1..G6), and SDS-PAGE
(WP-RAT-C1, gaps RAT-C-G1..G6) -- into one list grouped by gap class, not by
slice. It also gives a disposition for the one item that crosses the design
doc's new-primitive evidence bar, answers the six M3 ratification questions
globally across all 120 mapped steps, states the M3 integration-gate verdict,
and states whether the M2 model needs revising.

This section consolidates what the three slices already produced. It does not
re-map any step and does not re-do any slice. The M2 model in
[unified_interaction_vocabulary_design.md](unified_interaction_vocabulary_design.md)
is unchanged by this section; no primitive is added here. The one item that
crosses the evidence bar is written as a decision-needed disposition for the
user, not a unilateral model change.

### How the gaps are classified

The three slices each classified their gaps with the same scheme: new domain
verb (cheap), new `gesture` value (medium), new `scene_operation` primitive
(expensive), design revision (expensive), or rough-protocol gap (not a
vocabulary gap). The consolidation regroups all 19 gap entries into five
classes for the close-out:

- new domain verb (cheap) -- proposed cheap domain verbs, no model change.
- new `scene_operation` primitive (expensive, evidence-gated) -- the one item
  that crosses the cost-guardrail evidence bar.
- rough-protocol gaps (not vocabulary gaps) -- unfinished-draft and
  wrong-shape-in-finished-content issues.
- design-scope questions (one level above the interaction vocabulary).
- watch items (not confirmed gaps) -- carry forward to a future evidence pass.

No gap was silently re-classified. Every slice's own classification is
preserved; the consolidation only regroups and rolls up.

### Class 1: new domain verb (cheap)

These are the proposed domain verbs the three slices surfaced. Domain verbs are
the cheap, expected layer: the cost guardrail sets the bar at "a documented
expansion to existing slots," and every verb below has one. They require no M2
model change, no new `gesture`, and no new `scene_operation`. Authors add them
with documented expansions as their protocols read naturally; adding a domain
verb is authoring work, not vocabulary work.

| Verb      | From slice | Expands to                                                       |
| --------- | ---------- | ---------------------------------------------------------------- |
| `titrate` | RAT-B-G3   | `adjust` interaction over `SetPointDisplayChange` (pH-to-target) |
| `dissect` | RAT-B-G3   | `click` interaction over one `SvgSwap`                           |
| `place`   | RAT-C-G3   | `drag` interaction over one `LayoutMove`                         |
| `clamp`   | RAT-C-G3   | `drag` interaction over one `LayoutMove`                         |
| `unwrap`  | RAT-C-G3   | `click` interaction over one `SvgSwap`                           |
| `remove`  | RAT-C-G3   | `click` interaction over one `SvgSwap`                           |
| `open`    | RAT-C-G3   | `click` interaction over one `SvgSwap`                           |
| `connect` | RAT-C-G3   | `click` interaction (lead connection)                            |
| `image`   | RAT-C-G3   | `click` interaction, `feedback`-only response                    |
| `set`     | RAT-C-G3   | `adjust` interaction over `SetPointDisplayChange`                |
| `stain`   | RAT-C-G3   | `click` interaction over `LiquidDisplayChange` plus `TimedWait`  |
| `destain` | RAT-C-G3   | `click` interaction over `LiquidDisplayChange` plus `TimedWait`  |

Notes on this class:

- WP-RAT-A1 proposed no new domain verbs. Its verb set -- `wash`, `draw`,
  `dispense`, `aspirate`, `pour`, `mix`, `spray`, `move`, `use` (equipment),
  `navigate`, `select` (answer) -- is the baseline the design doc's worked
  expansions already cover, so RAT-A added no Class 1 entries. The 12 new verbs
  above all come from RAT-B-G3 (2) and RAT-C-G3 (10).
- `titrate` is worth calling out: the design doc already anticipates it (it
  describes pH-to-target as an `adjust` set-point), so it is a verb the model
  was designed to receive.
- `assemble` is not a new verb in this class. The design doc already defines it
  as a step-level verb with SDS-PAGE assembly as its named source case;
  WP-RAT-C1 confirmed it, it did not propose it.
- Plain statement: this class is the cheap layer working as intended. None of
  these 12 verbs is a design gap; none forces an M2 model change.

### Class 2: new `scene_operation` primitive (expensive, evidence-gated)

This class has exactly one entry: **RAT-A-G2 recurring as RAT-C-G4** --
instrument-produced data has no `scene_operation` that records it as runtime
state.

- RAT-A-G2 (WP-RAT-A1): OVCAR8 `capture_count` and `plate_read` (and the
  shipped `count_cells`) -- the cell counter produces a count, the plate reader
  produces an absorbance value. No `scene_operation` writes "instrument
  produced a data value" as runtime state; it maps as a `feedback`-only
  response.
- RAT-C-G4 (WP-RAT-C1): SDS-PAGE `image_gel` (Part 10) -- the light-box read
  produces a band pattern and a molecular-weight read. Same shape, same gap.
- Miraculin (WP-RAT-B1) did NOT recur it: its centrifuge phase-separation
  result has an explicit home in the M2 "phase state" runtime-state row, driven
  by a `TimedWait` plus a downstream `select`. Miraculin added zero hits.

That is two slices (OVCAR8 and SDS-PAGE) hitting one shape. The design doc's
cost guardrail sets the bar for a new `scene_operation` primitive at "a
recurring scene effect no composition of existing primitives expresses ... a
recurring shape, across more than one protocol." RAT-A-G2 / RAT-C-G4 now meets
that bar. Its disposition is below; it is the one M3 item that needs an
accepted disposition before the milestone closes.

### Disposition: RAT-A-G2 / RAT-C-G4

This is the only consolidated gap that crosses the new-primitive evidence bar,
so per the plan it needs an accepted disposition before M3 closes.

**(a) The recurring shape.** An instrument produces a data value -- a cell
count, an absorbance reading, a band pattern plus a molecular-weight read --
that the protocol should be able to record as runtime state. No current
`scene_operation` writes that value. The eight ratified primitives cover asset
swaps, color, cursor attachment, scene transitions, layout moves, tracked
liquid, set-point displays, and timed phases; none records an
instrument-produced data value. Today the interaction maps as a `click` on the
instrument with a `feedback`-only response.

**(b) It does not block step mapping.** Every instrument-read interaction maps
cleanly: a `click` on the instrument target, validated by `correct_target`,
with a `feedback`-only `response`. No instrument-read step fails to map. What is
missing is only the runtime-state RECORDING of the produced value -- the value
the `step_validator` could later check. This is an enhancement gap, not a
mapping failure.

**(c) The two options.**

- **Option 1 -- add a ninth `scene_operation` primitive.** A candidate
  `InstrumentReadDisplayChange` or `DataReadout` primitive: narrow and typed,
  documented to the durable-primitive standard (typed fields and their value
  types, what it means, what state it may read, what state it may change, what
  visual effect it produces, what it must not do, examples from at least two
  protocols, anti-patterns, and how domain verbs build on it). It would follow
  the exact evidence-gated path `TimedWait` (WP-STA1) and `SetPointDisplayChange`
  (WP-SOP1) took -- a recurring shape, named and ratified. This is an M2 model
  change and requires user ratification.
- **Option 2 -- accept the `feedback`-only mapping for now and defer the
  ninth-primitive proposal to the follow-on code-migration plan.** Record the
  proposal as the first deliverable of that plan, with the M3 evidence captured
  so the follow-on plan inherits a ready proposal: two slices (OVCAR8,
  SDS-PAGE), named steps (`capture_count`, `plate_read`, `count_cells`,
  `image_gel`), and the worked candidate names (`InstrumentReadDisplayChange` /
  `DataReadout`). M3 ratification still closes, because every instrument-read
  step maps.

**Recommendation: Option 2.** The evidence bar is met for proposing the
primitive, but not for ratifying its exact shape inside this docs-first
vocabulary plan. M3's scope is to ratify the M2 model against real protocols;
it has done that -- all 120 steps map, and the instrument-read gap is an
enhancement, not a mapping failure. Adding a ninth primitive now would mean
designing typed fields, the durable-primitive documentation, and at least two
protocol examples under time pressure at the very end of M3, and every
`scene_operation` primitive so far has been personally ratified by the user
after a deliberate WP cycle (`TimedWait` via WP-STA1, `SetPointDisplayChange`
via WP-SOP1). The disciplined path is to carry the now-confirmed recurrence
forward as a ready, evidence-backed proposal -- the first deliverable of the
follow-on code-migration plan -- so the primitive gets the same deliberate,
user-ratified treatment the other eight got, rather than a rushed addition.
This keeps M3 honest: M3 closes on a complete mapping, and the one
guardrail-triggered enhancement is handed off with its evidence intact.

**This is a user decision.** The user has personally ratified every
`scene_operation` primitive to date. This disposition frames the choice as
decision-needed and recommends Option 2; it does not add the ninth primitive.
Whichever option the user accepts becomes the accepted disposition that closes
the RAT-A-G2 / RAT-C-G4 entry.

**Disposition: ACCEPTED -- Option 2 (deferred follow-on).** Instrument-produced
data stays `feedback`-only in this vocabulary pass. The ninth `scene_operation`
primitive -- candidate name `DataReadout` / `InstrumentReadDisplayChange` -- is
carried as a named follow-on proposal, NOT added to the M2 model now. All 120 M3
steps map cleanly and no step requires this primitive to express learner
interaction, so it does not block M4. The follow-on code-migration plan designs
the primitive deliberately, with typed fields for: absorbance, cell count, gel
band pattern, molecular weight estimate, and instrument metadata. The M3
evidence (two slices -- OVCAR8 and SDS-PAGE -- with named steps) is the
proposal's evidence base.

### Class 3: rough-protocol gaps (not vocabulary gaps)

These are unfinished-draft or wrong-shape-in-content issues. They are NOT
vocabulary failures: the M2 model maps every affected step (or would, once the
draft text exists). They are protocol-polishing follow-ons, out of scope for
this vocabulary plan. WP-RAT-A1's distinction is kept: "wrong shape in finished
content" is separate from "unwritten draft."

Sub-class 3a -- wrong shape in finished content (the WP-RAT-A1 findings). The
content is written; it uses a shape the M2 model already expresses better.

| Gap ID   | Rolled-up finding                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAT-A-G3 | Timed-click pipetting regression: every `interactionSequence` liquid step in five of the seven shipped files encodes volume as a `volumeMl` field on a `click` with no `adjust` set-point gesture. Highest-volume content-fidelity finding; kept as one rolled-up entry, not one row per step. The M2 model expresses the correct `adjust` plus `target_with_value` shape; the content must be updated to use it. |
| RAT-A-G4 | Scene/protocol boundary violations in content YAML: `drug_dilution_setup` carries `plateMap.annotations` (`row`, `colRange`); `plate_drug_treatment` carries `plateTargets` (`rows`, `cols`). Geometric nouns and coordinates belong on the scene side via semantic targets per the WP-BND1 rule. The M2 model maps every step.                                                                                   |
| RAT-A-G5 | `tubeTargets` is the broken legacy field (typed `{tubeId}` in `contract.ts`, authored as `{source, diluent, destination, ...}`). Superseded entirely by the M2 model; content-side removal.                                                                                                                                                                                                                       |
| RAT-A-G6 | Content canonicalization: `decant_mtt` has two interaction shapes across files (`well_plate` pour vs `multichannel_pipette` aspirate); `completionEvent` naming has no convention; `resuspend` volume mismatch; `metformin_stock` tool choice differs. The M2 model expresses every variant cleanly and the WP-STA1 derived-event rule already replaces `completionEvent`.                                        |
| RAT-A-G7 | `prewarm_media` is modeled as an instant `directTool` step; pre-warming in a water bath is plausibly a `TimedWait` phase. `TimedWait` already exists; this is an authoring choice about whether to model the duration.                                                                                                                                                                                            |

Sub-class 3b -- unwritten or under-written draft (the WP-RAT-B1 and WP-RAT-C1
findings). The source protocols are rough drafts; these sections need procedure
text written before they can be finalized.

| Gap ID   | Rolled-up finding                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAT-B-G1 | Miraculin Parts 5, 6, 7 (size exclusion, ion exchange, IMAC chromatography) are pure stubs -- a student-assignment line and nothing else. No procedure text to map.                                                                                                                                                                                           |
| RAT-B-G2 | Miraculin Parts 1 and 3 are heading-only stubs; Part 2 duplicates Overview steps; Part 4 has empty sub-stubs duplicating Stages 1-2. The `Part N` outline and the `Overview` recipe are two un-reconciled drafts; the `Part N` outline should be reconciled with or removed in favor of the `Overview`.                                                       |
| RAT-B-G5 | Miraculin `prepare_stripping_buffer` specifies a buffer "at pH 11.0" but the Overview does not say the student titrates it; pre-made vs student-titrated intent is ambiguous. Either reading maps; the draft must state which.                                                                                                                                |
| RAT-C-G1 | SDS-PAGE Part 4 (assemble the apparatus) and Part 7 (recycle the buffer) are heading-plus-fragment stubs with no procedure text; `Pre-Laboratory Procedure` Parts 2-4 are likewise pre-lab stubs. No procedure text to map.                                                                                                                                   |
| RAT-C-G2 | SDS-PAGE Parts 1, 8, 9, 10 are half-written or one-line stubs. Each maps at a coarse grain, but the exact interaction count and per-step detail are provisional; step-by-step text is needed before the mapping is finalized.                                                                                                                                 |
| RAT-C-G5 | SDS-PAGE Part 1 volume formulas and Part 5 loading-volume calculation are relational and calculated volumes rather than fixed authored set-points. The same relational-volume pattern mapped cleanly in Miraculin ("combine equal volumes"); each resolves to a concrete `volume_ml` per `draw`. The draft would benefit from stating worked example volumes. |
| RAT-C-G6 | SDS-PAGE Part 9 mentions "microwave" as a stain/destain acceleration step with no procedure text. If it is a timed acceleration phase, `TimedWait` already expresses it; if it is a technique note, it belongs in `prompt` or `feedback`. The draft must state which.                                                                                         |

Plain statement: every Class 3 entry is content-side work. Sub-class 3a is
wrong-shape-in-finished-content; sub-class 3b is unwritten-draft. Neither is a
vocabulary expressiveness gap. The M2 model is not implicated by any of them.

### Class 4: design-scope questions (one level above the interaction vocabulary)

This class has exactly one entry: **RAT-A-G1** -- `cell_culture_full` is a
`sequence_runner` chaining five mini-protocols, and the M2 model is a single
linear protocol with no protocol-of-protocols level.

Plain statement: this is a protocol-composition scope question, NOT an
interaction-vocabulary failure. No `cell_culture_full` step fails to map,
because it has none -- its `steps` array is empty. The M2 model is a single
linear protocol spec (`protocol -> step -> interaction`) by deliberate
tightening; the WP-STA1 `protocol` level is explicitly a single linear
protocol, and protocol composition was never in M2's scope. Protocol
composition is a stated future direction. RAT-A-G1 does not force an M2
interaction-vocabulary revision; it is a plan-scope decision about whether a
future plan adds a protocol-composition level. It is unique to the shipped
content -- the three source protocols are single protocols, so neither
Miraculin nor SDS-PAGE re-raised it.

### Class 5: watch items (not confirmed gaps)

These are not confirmed gaps. Each maps today; each is a hold-for-evidence item
for a future evidence pass, not a requirement.

| Gap ID   | Watch item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RAT-B-G4 | Solid-mass metering: Miraculin `homogenize_water` and `resuspend_nacl` specify a solid quantity (1 g powder) alongside a liquid volume. `LiquidDisplayChange` tracks liquid; no primitive tracks a weighed solid mass as runtime state. The interaction maps -- the liquid half uses `adjust` plus `LiquidDisplayChange`, the solid is preset target state or a `select` of a pre-portioned amount. A weighed-mass set-point is a possible future `adjust` case IF solid weighing recurs as a taught skill across protocols; Miraculin alone does not clear the cost-guardrail bar. |
| RAT-B-G6 | Two-reagent titration depth: Miraculin `adjust_ph_forward` titrates with two reagents (2.5 M NaOH up, 0.1 M HCl down) converging on pH 8.0. The M2 model abstracts titration-to-a-target as a single `adjust` set-point, which holds for ratification. Modeling the two-reagent convergence as distinct gestures is a future pedagogy-depth question, not an M2 expressiveness failure.                                                                                                                                                                                             |

Plain statement: neither watch item forces an M2 revision. Both map under the
current model. They are recorded so a future evidence pass can re-check them if
solid-mass metering or two-reagent titration recurs across more protocols.

### Consolidated gap count by class

| Class                                                       | Count                    | Gap IDs                                                                                                                |
| ----------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Class 1 -- new domain verb (cheap)                          | 12 verbs (2 gap entries) | RAT-B-G3, RAT-C-G3                                                                                                     |
| Class 2 -- new `scene_operation` primitive (evidence-gated) | 1                        | RAT-A-G2 = RAT-C-G4                                                                                                    |
| Class 3 -- rough-protocol gaps                              | 12                       | RAT-A-G3, RAT-A-G4, RAT-A-G5, RAT-A-G6, RAT-A-G7, RAT-B-G1, RAT-B-G2, RAT-B-G5, RAT-C-G1, RAT-C-G2, RAT-C-G5, RAT-C-G6 |
| Class 4 -- design-scope questions                           | 1                        | RAT-A-G1                                                                                                               |
| Class 5 -- watch items                                      | 2                        | RAT-B-G4, RAT-B-G6                                                                                                     |

The 19 slice gap entries (RAT-A-G1..G7, RAT-B-G1..G6, RAT-C-G1..G6) consolidate
into 18 distinct items, because RAT-A-G2 and RAT-C-G4 are the same gap counted
once in Class 2.

### The six M3 ratification questions, answered globally

The three slices answered these per-slice. Here is the consolidated answer
across all 120 mapped steps (OVCAR8 24, shipped content 61, Miraculin 18,
SDS-PAGE 17).

1. **Does every step map to the two-level model?** Yes. All 120 mappable steps
   map -- each is a `step` with the six required slots wrapping an ordered
   `sequence` of interactions. The only non-mapping artifact is
   `cell_culture_full`, a `sequence_runner` with zero steps; it does not have a
   step that fails to map, it has no steps (Class 4 / RAT-A-G1). Stubbed
   source-protocol sections (Miraculin Parts 1-7 stubs, SDS-PAGE Parts 4, 7 and
   pre-lab stubs) are unwritten draft, not steps that fail to map (Class 3).

2. **Does every interaction have `target`, `gesture`, `validator`, and
   `response`?** Yes. Every interaction across all three slices resolves to a
   named `target`, a `gesture` from the closed five-value set, a `validator`
   preset from the five-preset library, and a `response` (`scene_operations` or
   `feedback`-only). No interaction in any slice needs a fifth slot.

3. **Do responses use only the 8 ratified `scene_operation` primitives?** Yes.
   Across the three slices the responses use only `SvgSwap`, `ColorChange`,
   `CursorAttach`, `SceneChange`, `LayoutMove`, `LiquidDisplayChange`,
   `SetPointDisplayChange`, and `TimedWait`. No response uses or needs a ninth
   primitive. The one soft pressure point -- instrument-produced data as
   runtime state -- does not break this answer: every instrument-read
   interaction still maps with a `feedback`-only response using zero
   `scene_operations`. The ninth-primitive question is an enhancement
   (Class 2), not a primitive the slices were forced to invent.

4. **Do domain verbs expand cleanly?** Yes. Every domain verb the three slices
   need expands to slots the two-level model already has -- the baseline verbs
   (`wash`, `draw`, `dispense`, `aspirate`, `pour`, `mix`, `spray`, `move`,
   `use`, `navigate`, `select`) plus the 12 new cheap verbs in Class 1
   (`titrate`, `dissect`, `place`, `clamp`, `unwrap`, `remove`, `open`,
   `connect`, `image`, `set`, `stain`, `destain`) and the step-level `assemble`
   the design doc already defines. No verb in any slice needs runtime behavior
   with no home in `target`, `gesture`, `validator`, or `response`.

5. **Are any new `gesture` values, validator presets, or `scene_operation`
   primitives required?** No new `gesture` value and no new validator preset is
   required -- the closed five-gesture set (`click`, `drag`, `adjust`,
   `select`, `type`) and the five-preset validator library cover all 120 steps.
   No new `scene_operation` primitive is REQUIRED to map any step -- the eight
   ratified primitives map everything. One `scene_operation` primitive is
   PROPOSED, not required: RAT-A-G2 / RAT-C-G4 (Class 2) crosses the
   cost-guardrail evidence bar as a recurring shape, so it is escalated as a
   confirmed new-primitive proposal with an accepted disposition (see above) --
   but no step fails to map without it.

6. **Are any gaps real design gaps versus rough-protocol gaps?** The
   consolidated answer: no gap is a real design gap that forces an M2
   interaction-vocabulary revision. Class 3 (12 items) is rough-protocol gaps --
   content-side polishing, not vocabulary failures. Class 4 (RAT-A-G1) is a
   design-scope question one level ABOVE the interaction vocabulary (protocol
   composition), not an interaction-vocabulary failure. Class 5 (2 items) is
   hold-for-evidence watch items, not confirmed gaps. Class 2 (RAT-A-G2 /
   RAT-C-G4) is a guardrail-triggered ENHANCEMENT proposal -- it is not a model
   failure, because every affected step maps. Class 1 (12 verbs) is the cheap
   domain-verb layer working as intended. Nothing in the consolidated list
   forces a revision of the M2 model.

### Coverage summary

| Metric                                     | Value |
| ------------------------------------------ | ----- |
| OVCAR8 mapped steps                        | 24    |
| Shipped content mapped steps               | 61    |
| Miraculin mapped steps                     | 18    |
| SDS-PAGE mapped steps                      | 17    |
| Total mapped steps across all three slices | 120   |

`gesture` values exercised: `click`, `drag`, `adjust`, and `select` are all
exercised across the three slices -- `click` everywhere, `adjust` on every
volume, voltage, and pH set-point, `select` on answer choices and phase picks,
and `drag` on the SDS-PAGE gel-cassette assembly moves (the slice that finally
exercised it). `type` is the one `gesture` value unexercised across all three
slices; no slice interaction needed free-text or value entry.

`scene_operation` primitives exercised: all eight are exercised across the
three slices combined -- `SvgSwap` (grind, dissect, unwrap, stain, comb
removal, gel separation, MTT-powder dissolve), `ColorChange` (optionally, MTT
formazan development and pH-indicator color), `CursorAttach` (every tool
pickup), `SceneChange` (plate-workspace entry), `LayoutMove` (OVCAR8
transfer-to-conical and counting-slide load, SDS-PAGE cassette assembly),
`LiquidDisplayChange` (every draw, dispense, aspirate, pour, mix, fill),
`SetPointDisplayChange` (every volume, voltage, and pH set-point), and
`TimedWait` (every incubation, centrifugation, agitation, heat step, gel run,
stain and destain phase).

**M3 integration-gate verdict.** The consolidated gap list now has an accepted
disposition for EVERY entry: Classes 1, 3, 4, and 5 are all dispositioned within
this plan's scope (Class 1 is cheap-layer authoring work; Class 3 is
content-side protocol polishing; Class 4 is a flagged plan-scope question;
Class 5 is recorded watch items). The Class 2 entry -- RAT-A-G2 / RAT-C-G4 --
crossed the new-primitive evidence bar and is now dispositioned as Option 2: the
user has accepted the deferred follow-on, so the ninth-primitive proposal is
carried to the follow-on code-migration plan with the M3 evidence captured, and
no primitive is added to the M2 model now. With every gap class accepted, the
M3 integration gate is CLEAN and M3 is closed. It was never blocked: every one
of the 120 steps maps, so M3 ratification itself succeeds; the RAT-A-G2 /
RAT-C-G4 item is a guardrail-triggered enhancement dispositioned as Option 2 /
deferred follow-on, not a mapping failure.

### Does M2 need revising

No. Per all three ratification slices and this consolidation, **no gap forces a
revision of the M2 interaction vocabulary.** All 120 mapped steps map to the
two-level `protocol -> step -> interaction -> response` model; every
interaction has its four slots; every response uses only the eight ratified
`scene_operation` primitives; the closed five-`gesture` set and the five-preset
validator library cover everything; and every domain verb expands cleanly.

The single item that crosses the design doc's new-primitive evidence bar --
RAT-A-G2 / RAT-C-G4, instrument-produced data as runtime state -- is a
guardrail-triggered ENHANCEMENT proposal, dispositioned above with a
recommendation of Option 2. It is not an M2 model failure: every
instrument-read step maps cleanly today with a `feedback`-only response. The
cost guardrail working as designed -- surfacing a recurring shape across more
than one protocol as a candidate for a future ratified primitive -- is the
model behaving correctly, not the model breaking. M2 stands as ratified.
