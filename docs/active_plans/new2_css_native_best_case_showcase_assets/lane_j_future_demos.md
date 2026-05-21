# Lane J: Ranked future-demo backlog for NEW2 showcase

This file ranks future demo candidates for the CSS-native best-case showcase.
Ranking weighs three factors together:

- (a) Demo value: how clearly the demo communicates "this is a lab-protocol
  simulation, not a styling experiment" to a reviewer.
- (b) Implementation difficulty: smaller is better; favors S over L when demo
  value ties.
- (c) Production-progress signal: does shipping this demo move the actual
  runtime forward (validators, scene operations, layout engine), or is it a
  one-off render?

Dependencies on open NEW2 blockers are cited explicitly:

- Workstream 1 (W1): validator preset closure (`correct_target`,
  `correct_choice`, `target_with_value`, `sequence_complete`,
  `final_state_matches`).
- Workstream 2 (W2): viewport CSS for dense scenes (zoom, focus framing,
  multi-instrument bench composition).

## Ranked demo backlog

| Rank | Title | Effort | Demo value | Production signal | W1 dep | W2 dep |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pipette-to-well interaction demo | M | high | runtime + scorecard | yes | partial |
| 2 | Well plate zoom with selected well highlight | S | high | runtime | no | yes |
| 3 | Before/after diagnostic overlay | S | high | scorecard | no | no |
| 4 | Drug dilution workspace | L | high | runtime + scorecard | yes | yes |
| 5 | Instrument station focus mode | M | med | runtime | no | yes |
| 6 | Electrophoresis setup walkthrough | L | high | runtime | yes | yes |
| 7 | Interactive scorecard panel | M | med | scorecard | no | no |
| 8 | Teaching mode vs assessment mode toggle | M | med | scorecard | no | no |
| 9 | Reagent grouping animation | S | low | demo-only | no | partial |
| 10 | Label reveal on hover | S | low | demo-only | no | no |

### 1. Pipette-to-well interaction demo

- Description: A single mini-protocol slice showing a pipette `click` on a
  source bottle followed by `click` on a target well, with material volume
  visibly transferring. Drives the canonical `ObjectStateChange` primitive on
  `material_volume` and exercises the `correct_target` validator twice in a
  sequence.
- Effort: M
- Demo value: high
- Production-progress signal: runtime (ObjectStateChange wiring) and
  scorecard (interaction count, validator-pass count).
- Blocker dependencies: W1 must finalize `correct_target` and
  `sequence_complete` presets; W2 helpful for plate close-up framing but not
  required.

### 2. Well plate zoom with selected well highlight

- Description: Static-feel zoom from the 96-well plate scene into a single
  well column, with the selected well highlighted via CSS outline ring. No
  state mutation; visual affordance only.
- Effort: S
- Demo value: high
- Production-progress signal: runtime (proves the layout engine can frame
  scene subparts without per-scene geometry).
- Blocker dependencies: W2 viewport CSS must land first; no W1 dependency
  because no validator runs.

### 3. Before/after diagnostic overlay

- Description: Side-by-side or fade-toggle overlay of "scene as authored" vs
  "scene after one validated interaction." Highlights the scorecard delta
  (validators passed, scene operations executed) between the two frames.
- Effort: S
- Demo value: high
- Production-progress signal: scorecard (clarifies what the scorecard
  panel actually reports).
- Blocker dependencies: none; can be assembled from existing lane B / lane D
  artifacts.

### 4. Drug dilution workspace

- Description: A serial-dilution walkthrough across a tube rack with visible
  volume changes per step. Exercises `target_with_value` validation and the
  `material_volume` field across many objects.
- Effort: L
- Demo value: high
- Production-progress signal: both runtime (multi-object state changes) and
  scorecard (per-step validator outcomes).
- Blocker dependencies: W1 must close `target_with_value`; W2 must support a
  dense rack viewport.

### 5. Instrument station focus mode

- Description: A scene operation that frames a single instrument (centrifuge,
  microscope, cell counter) with surrounding objects dimmed. Visual focus
  only; no state mutation.
- Effort: M
- Demo value: med
- Production-progress signal: runtime (validates the focus-framing path of
  the layout engine).
- Blocker dependencies: W2 viewport CSS; no W1 dependency.

### 6. Electrophoresis setup walkthrough

- Description: A multi-step bench setup: pour gel, load samples by lane, run
  the rig. Exercises the lane-as-subpart pattern and a `TimedWait` scene
  operation.
- Effort: L
- Demo value: high
- Production-progress signal: runtime (TimedWait, lane subparts, sequence
  ordering).
- Blocker dependencies: W1 (sequence_complete preset, validator on lane
  targets); W2 (gel rig framing).

### 7. Interactive scorecard panel

- Description: A live scorecard sidebar that updates as a walkthrough
  progresses, showing interactions attempted, validators passed, and scene
  operations dispatched.
- Effort: M
- Demo value: med
- Production-progress signal: scorecard (turns the static scorecard doc
  from lane D into a live readout).
- Blocker dependencies: none directly, but more informative once W1 closes
  so validator names are stable.

### 8. Teaching mode vs assessment mode toggle

- Description: Same scene rendered twice: teaching mode shows labels,
  callouts, and hint outlines; assessment mode hides all hints. Toggle is
  a CSS class swap; no protocol change.
- Effort: M
- Demo value: med
- Production-progress signal: scorecard (communicates that one scene serves
  two pedagogical contexts).
- Blocker dependencies: none.

### 9. Reagent grouping animation

- Description: A CSS transition that visually groups related bottles on the
  bench (for example, all DMEM-family reagents) when the student hovers a
  group label.
- Effort: S
- Demo value: low
- Production-progress signal: demo-only; does not exercise any runtime
  primitive.
- Blocker dependencies: W2 helpful for bench composition, not required.

### 10. Label reveal on hover

- Description: Hovering a scene object reveals its semantic target name in a
  tooltip. Useful as a debugging affordance, modest as a showcase artifact.
- Effort: S
- Demo value: low
- Production-progress signal: demo-only.
- Blocker dependencies: none.

## Top 3 recommended next

1. Pipette-to-well interaction demo. This is the single demo most
   representative of what the simulation actually does at runtime: a
   semantic target, a validated gesture, a state change, a scorecard
   update. It exercises the closed protocol vocabulary end-to-end on a
   small surface, which makes it the highest-signal showcase per unit of
   effort. Its W1 dependency on `correct_target` and `sequence_complete`
   is unavoidable but already on the critical path.

2. Well plate zoom with selected well highlight. Cheap (S effort), high
   visual impact, and it directly demonstrates that the layout engine can
   frame subparts without per-scene geometry hacks. It pairs naturally
   with demo 1: zoom in, then run the pipette interaction inside the
   zoomed frame. Its only blocker is W2 viewport CSS, which is already in
   flight.

3. Before/after diagnostic overlay. Almost free to build from existing
   lane B and lane D artifacts, and it is the clearest way to explain the
   scorecard to a reviewer who has not been following the project. It
   converts the scorecard from a doc into a visual claim, which raises
   the perceived rigor of the showcase without requiring any runtime or
   viewport work.
