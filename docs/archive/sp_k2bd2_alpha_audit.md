# SP-K2bd2-Alpha: Read-Only Classification Audit

> **Superseded by `wet_lab_classification.md`.**
>
> This audit treated existing UI flows as authoritative. Later review made
> the wet-lab protocol the source of truth. Under that model, `count_cells`
> is an automated instrument modal, and drug dilution/addition steps are
> physical pipetting workflows, not modal completion paths. Kept for
> history of the direction change.

## Summary

This audit traces the YAML definitions and UI implementations of 7 candidate steps to determine whether they fit the current K2 schema (modal, interactionSequence, directTool) or require YAML splitting or a new K2 kind.

## Classification Summary

| Step | Current Kind | Recommendation | Notes |
|------|--------------|-----------------|-------|
| count_cells | modal | **ESCALATE** -- multi-stage modal (viability + 4 quadrants + submit); current single-modal kind cannot drive the walker through the gates without back-doors | See section 1 below for three options |
| plate_read | modal | Keep as single modal | Complete with data-walker-advance; modal ownership is clean |
| add_carboplatin | modal | Keep as single modal | Standard drug modal; advance via drug_treatment.ts handler |
| add_metformin | modal | Keep as single modal | Standard drug modal; same flow as add_carboplatin |
| add_mtt | interactionSequence | Keep as single step | Load + discharge pair; interactionSequence handles it naturally |
| add_dmso | interactionSequence | Keep as single step | Load + discharge pair; identical to add_mtt pattern |
| media_adjust | interactionSequence | Keep as single step | Load + discharge pair; completed via hood.ts click chain |

**Recommendation (corrected):** 6 of 7 steps are well-served by existing K2
kinds and need no migration. **count_cells requires a maintainer design
decision** (see section 1) before any beta/gamma/delta work begins.

---

## Per-Step Audit

### 1. count_cells -- CORRECTION (initial audit was wrong)

**YAML Shape:**
```
kind: modal
openClick: cell_counter
advanceClick: submit-cell-count
completionEvent: count-cells-submit
```

**Actual UI flow (multi-stage; the initial audit missed two gates):**

1. Walker clicks `cell_counter` on bench. Modal opens in **viability stage**.
   `microscope.ts:78` renders a `confirm-viability` button with NO
   `data-walker-advance` attribute. The `submit-cell-count` element does
   not exist in the DOM at this point.
2. User clicks `confirm-viability`. Listener at `microscope.ts:117-123`
   sets `gameState.microscopeViabilityChecked = true` and re-renders.
3. Modal switches to **counting stage**. `microscope.ts:99` now renders the
   submit button with `data-walker-advance="submit-cell-count"`, but it
   carries `disabled` until 4 quadrants are counted.
4. User clicks each of 4 quadrants and enters a count via
   `setupQuadrantListeners()` (`microscope.ts:126`). The submit button is
   only enabled once all 4 are filled.
5. User clicks submit. Listener at `microscope.ts:127-130` fires
   `submitQuadrantCount()` which calls `triggerStep('count_cells')`.

The walker's generic modal handler does:
`clickItemAndWaitProgress(openClick)` then waits for
`[data-walker-advance="${advanceClick}"]` to be visible, then clicks it.
This cannot drive stages 2-4: there is no `data-walker-advance` on
`confirm-viability`, and even if `submit-cell-count` were visible, it is
disabled until quadrant input is entered (which the walker does not do).

The reverted SP-K2bd2 attempt addressed this with a `setQuadrantCountsForWalker`
back-door (write to `gameState` from outside the UI), which violated
"fix the design, not the symptom" and was correctly rejected.

**Recommendation: ESCALATE -- design decision required.**

Three viable options, none free:

- **Option A: Add `data-walker-advance` attributes to all advance buttons in
  the count_cells modal flow.** Add `data-walker-advance="confirm-viability"`
  to the line-78 button. Add per-quadrant `data-walker-advance` attributes
  to quadrant elements. Have the walker chain `confirm-viability` ->
  4 quadrant clicks -> `submit-cell-count`. This requires either (a)
  enriching `kind: modal` to support a multi-step advance chain (a schema
  extension, not a new kind), or (b) the walker doing per-step special-case
  handling (which the K2d schema-driven walker explicitly forbids).
- **Option B: Split count_cells into multiple K2 modal steps.** For
  example: `count_cells_viability` (advanceClick=confirm-viability),
  `count_cells_count` (advanceClick=submit-cell-count). Quadrant input
  becomes part of the second modal's "user fills inputs before advance".
  This was the structural shape SP-K2bd2 tried, minus the back-door. The
  YAML splits are fine; the gap is that the walker still cannot fill
  quadrant counts via clicks alone.
- **Option C: Introduce a new `completionPath.kind` -- e.g.
  `kind: compositeModal` with a `steps:` list of advance clicks.** The
  walker iterates the list. Quadrant input is still a problem.

The shared blocker across A/B/C: **the walker needs a way to satisfy the
quadrant-input precondition without `window.set*ForWalker` back-doors.**
The cleanest design is to make each quadrant carry a `data-walker-advance`
attribute and have its click handler accept a default count value (or
expose a "fill all" affordance) so the walker can drive the UI through
real DOM clicks. This is not a K2 schema question; it is a UI affordance
question for the count_cells modal specifically.

**Maintainer decision needed before SP-K2bd2-beta:** which option, and is
the quadrant-input affordance acceptable as a UI change?

This is stop-and-ask trigger #1 (potential new kind) AND #4 (broad
refactor potential). Pause WP-B1/G1/D1 pending decision.

---

### 2. plate_read

**YAML Shape (lines 524-540):**
```
kind: modal
openClick: plate_reader
advanceClick: complete-plate-read
completionEvent: plate-read-complete
```

**UI Flow:**
- src/scenes/bench.ts:393-401 -- plate_reader item click routes to plate reader scene via switchScene("plate_reader").
- src/scenes/microscope.ts:421-539 -- renderPlateReaderScene() renders the 8x12 plate grid with absorbance values.
- src/scenes/microscope.ts:510-511 -- "Complete Experiment" button carries data-walker-advance="complete-plate-read" (correct).
- src/scenes/microscope.ts:517-522 -- Click fires triggerStep("plate_read"), then triggerStep("results") on close.

**Recommendation: Keep as single modal**

Justification: The plate reader modal is a single, well-defined readout view with one advance button. No splitting needed; the flow from plate_read -> results is handled cleanly by the close button handler.

---

### 3. add_carboplatin

**YAML Shape (lines 393-409):**
```
kind: modal
openClick: multichannel_pipette
advanceClick: drug-modal-advance
completionEvent: carb-add-confirm
```

**UI Flow:**
- src/steps/drug_treatment.ts:129-135 -- startDrugAddition() opens overlay and renders current step.
- src/steps/drug_treatment.ts:140-175 -- renderDrugModalStep() dispatches to renderSingleButtonScreen().
- src/steps/drug_treatment.ts:192 -- Button carries data-walker-advance="drug-modal-advance" (correct).
- src/steps/drug_treatment.ts:199-204 -- Click fires advanceDrugModalStep(), which applies applyPlateDoseMap(), fires triggerStep(stepId), then rerenders.

**Recommendation: Keep as single modal**

Justification: Add_carboplatin is a standalone drug addition modal with a fixed, single-button interaction. Modal ownership is clean: drug_treatment.ts owns all six modal-owned steps and dispatches them in sequence. No splitting needed.

---

### 4. add_metformin

**YAML Shape (lines 411-427):**
```
kind: modal
openClick: multichannel_pipette
advanceClick: drug-modal-advance
completionEvent: metformin-add-confirm
```

**UI Flow:**
- Same as add_carboplatin: src/steps/drug_treatment.ts renders via renderSingleButtonScreen().
- Button carries data-walker-advance="drug-modal-advance" (correct).
- src/steps/drug_treatment.ts:275-288 -- advanceDrugModalStep() fires triggerStep(stepId) and rerenders.

**Recommendation: Keep as single modal**

Justification: Identical structure to add_carboplatin. Single advance button, no side effects beyond the step trigger. No splitting needed.

---

### 5. add_mtt

**YAML Shape (lines 447-465):**
```
kind: interactionSequence
interactions:
  - tool: multichannel_pipette
    source: mtt_vial
    destination: well_plate
    completionEvent: add_mtt
```

**UI Flow:**
- src/scenes/hood.ts:1213-1221 -- Click multichannel_pipette + mtt_vial (if activeStepId === "add_mtt"). Sets selectedTool. Shows notification.
- src/scenes/hood.ts:1223-1234 -- Click multichannel_pipette_with_mtt + well_plate. Clears selectedTool. Fires triggerStep("add_mtt"). Shows success notification.

**Recommendation: Keep as single step**

Justification: The interactionSequence naturally captures the two-part flow: load then discharge. The completionEvent fires once the entire sequence completes. No semantic split is needed; UI state tracks the intermediate "loaded" state. The walker already proves this works.

---

### 6. add_dmso

**YAML Shape (lines 504-522):**
```
kind: interactionSequence
interactions:
  - tool: multichannel_pipette
    source: dmso_bottle
    destination: well_plate
    completionEvent: add_dmso
```

**UI Flow:**
- src/scenes/hood.ts:1249-1257 -- Click multichannel_pipette + dmso_bottle (if activeStepId === "add_dmso"). Sets selectedTool. Shows notification.
- src/scenes/hood.ts:1259-1270 -- Click multichannel_pipette_with_dmso + well_plate. Clears selectedTool. Fires triggerStep("add_dmso"). Shows success notification.

**Recommendation: Keep as single step**

Justification: Identical pattern to add_mtt. InteractionSequence captures load + discharge in one step. No YAML migration needed.

---

### 7. media_adjust

**YAML Shape (lines 373-391):**
```
kind: interactionSequence
interactions:
  - tool: multichannel_pipette
    source: media_bottle
    destination: well_plate
    completionEvent: media_adjust
```

**UI Flow:**
- src/scenes/hood.ts:1190-1198 -- Click multichannel_pipette + media_bottle (if activeStepId === "media_adjust"). Sets selectedTool. Shows notification.
- src/scenes/hood.ts:1200-1211 -- Click multichannel_pipette_with_media + well_plate. Clears selectedTool. Fires triggerStep("media_adjust"). Shows success notification.

**Recommendation: Keep as single step**

Justification: Standard interactionSequence pattern. No split needed; one interaction pair maps to one protocol step. The UI walker will reach and advance this step cleanly.

---

## Closing Recommendation (corrected)

**For 6 of 7 steps:** the existing K2 kinds (modal, interactionSequence)
suffice. plate_read, add_carboplatin, add_metformin, add_mtt, add_dmso, and
media_adjust are correctly modeled and walker-drivable as-is. No YAML
migration is needed for these.

**For count_cells:** the current `kind: modal` shape cannot drive the
multi-stage flow (viability gate + 4 quadrant inputs + disabled submit
button) through pure DOM clicks. The reverted SP-K2bd2 hack
(`setQuadrantCountsForWalker`) was an attempt to paper over this without
fixing the design. This audit cannot recommend a path without a maintainer
decision among:

- (A) Schema extension: enrich `kind: modal` with a multi-step advance
  chain. Would require adding `data-walker-advance` attributes to
  intermediate buttons (confirm-viability, per-quadrant) and a UI
  affordance so quadrant input can be filled via clicks alone.
- (B) YAML split: break count_cells into two or more K2 modal steps,
  matching the natural UI stages. Same UI affordance gap on quadrants.
- (C) New `completionPath.kind` (e.g. `compositeModal`). High cost; the
  default is to reject unless A/B are clearly worse.

**WP-B1/G1/D1 status:** PAUSED. The shared blocker is the quadrant-input
affordance; whichever option is chosen for count_cells, that affordance
must come first. No mechanical YAML splits should be authored until the
maintainer picks an option.

**Stop-and-ask triggers hit:** #1 (potential new kind) and #4 (broader
modal refactor potential). Per the active plan's R3 risk and D2 default
(pause and ask), this is exactly when M1 should pause for a decision.
