# Mini-protocol integration summary

Mini-protocols are atomic regression fixtures: one tiny YAML protocol per
(workspace, completionPath.kind) pair, each isolating a single dispatch shape
that the production `cell_culture` protocol exercises in aggregate. They exist
because step-id-specific walker branches and tightly coupled cell_culture step
ids historically masked latent dispatch bugs (modal open chain, source ->
destination state propagation, directTool one-click). A mini-protocol fails
loudly the moment a dispatch shape regresses, without needing the full
cell_culture chain to reach the affected step.

## Integration table

| protocol               | workspace    | completionPath.kind              | proves                                                                                                                                           | walker status                                                                                           |
| ---------------------- | ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| tutorial_hood_transfer | hood         | interactionSequence              | source -> destination physical transfer with `stateChange.heldLiquid` (serological pipette, single liquid, terminal `completionEvent: pbs_wash`) | Walker PASSED                                                                                           |
| tutorial_drug_dilution | hood         | interactionSequence              | two-liquid micropipette load/discharge cycle into shared destination tube; mirrors `carb_intermediate` shape                                     | Walker PASSED                                                                                           |
| tutorial_bench_direct  | bench        | directTool                       | one-click instrument completion (`tool: centrifuge`, `completionEvent: centrifuge`)                                                              | Walker PASSED                                                                                           |
| tutorial_cell_counter  | cell_counter | modal                            | modal `openClick` + `advanceClick` chain on a bench-hosted instrument (`openClick: cell_counter`, `advanceClick: capture-count`)                 | Walker PASSED                                                                                           |
| tutorial_plate_reader  | plate_reader | modal                            | modal `openClick` + `advanceClick` chain on the plate reader instrument (`openClick: plate_reader`, `advanceClick: complete-plate-read`)         | Walker PASSED                                                                                           |
| tutorial_pbs           | hood         | interactionSequence              | repeatable pipette source -> destination across a four-step chain (regression for nextId chaining of identical interactionSequence steps)        | Walker PASSED                                                                                           |
| tutorial_split         | hood         | directTool + interactionSequence | mixed-kind chain: directTool spray (ethanol_bottle) followed by interactionSequence pipette steps                                                | Walker FAILED (`tutorial_spray_hood`: click on `ethanol_bottle` produced no state change after 3000 ms) |

## Coverage gaps

Workspace x completionPath.kind pairs not yet covered:

- bench x interactionSequence -- no mini-protocol covers a pipette source ->
  destination physical transfer whose scene is `bench` (e.g., dispensing into
  a well plate or rack tube outside the hood). A `tutorial_bench_transfer`
  fixture would close this gap.
- cell_counter x directTool -- no mini-protocol exercises a one-click
  cell_counter completion (today's only cell_counter coverage is the modal
  open/advance path). Likely low-value; cell_counter is inherently modal.
- plate_reader x directTool -- same situation. Likely low-value.
- incubator x (any kind) -- no mini-protocol exists for the `incubator`
  workspace. A `tutorial_incubator` fixture (modal or directTool) would cover
  the third instrument workspace from `wet_lab_classification.md`.
- bench x modal -- no mini-protocol exercises a non-instrument modal
  (calculation/confirmation overlay) hosted on the bench. Open question
  whether this shape is in scope.

The currently failing `tutorial_split` is also the only fixture that mixes
two completionPath kinds in a single chain; its failure on the directTool
leaf is an existing bug captured here, not addressed by this doc.

## Conventions

Shared rules for authoring mini-protocols:

- One workspace x completionPath.kind shape per fixture. Keep each fixture
  single-step where the shape allows; add chained steps only when the chain
  itself is what is under test (e.g., `tutorial_pbs` chains four identical
  interactionSequence steps to regression-test nextId handling).
- Use only the three documented `completionPath.kind` values:
  `interactionSequence`, `directTool`, `modal`. Do not invent new kinds in
  mini-protocol YAML.
- No step-id-specific walker branches. The walker must complete the fixture
  using only its declared `completionPath`, `requiredItems`, and `scene`.
  If the walker needs to special-case a step id to pass, the dispatch is
  wrong; fix the dispatch, not the walker.
- No fake source or destination items. Every `source` and `destination` in
  an `interactionSequence` must resolve to a real item declared in the
  fixture's `items.yaml`. Mini-protocols are regression fixtures, not
  imaginary scenarios.
- `requiredItems` lists every item the step touches (source, destination,
  tool, instrument). Walker-visible state changes go through
  `stateChange.heldLiquid` for pipette load steps.
- Workspace is the conceptual workspace from
  `docs/active_plans/wet_lab_classification.md`. The YAML `scene:` field
  remains the rendered scene id (e.g., bench-hosted modals like
  `cell_counter` and `plate_reader` keep `scene: bench`); workspace is a
  documentation concept, not a YAML key.
- Terminal step has `nextId: null`. Chained mini-protocols set `nextId` to
  the next step's id and end the chain with `nextId: null`.

## Notes

- `tutorial_split` walker failure is recorded here as observed status; this
  doc does not propose a fix. The failure isolates a directTool dispatch
  regression on `ethanol_bottle` that the same shape in
  `tutorial_bench_direct` (centrifuge) does not exhibit, which is itself
  useful triage signal.
