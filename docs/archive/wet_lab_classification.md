# Wet-lab interaction classification (per-step)

Source of truth: `docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md`.

## Vocabulary

`scene:` is the rendered viewport. The protocol-author-facing concept is
**workspace** (where the student does the action). For now, keep using
`scene:` in YAML; document workspace as the conceptual layer in
`docs/PROTOCOL_VOCABULARY.md`. No mechanical rename in this pass.

Workspaces:

- `hood` -- aseptic liquid handling.
- `bench` -- general equipment and staging.
- `cell_counter` -- automated counting instrument (modal overlay opened from
  the bench `cell_counter` item).
- `incubator` -- incubation instrument workspace.
- `plate_reader` -- absorbance instrument workspace.

`completionPath.kind` mapping:

- `interactionSequence` -- physical transfer workflow (pipetting).
- `directTool` -- one visible item/control click.
- `modal` -- instrument/control UI workflow OR a calculation/confirmation
  overlay layered on top of physical action (not as a substitute for the
  physical action).

## Classification per blocker / step

### count_cells -- DONE

Wet-lab action: insert slide, press Capture.

- workspace: `cell_counter` (rendered as modal overlay, opened from bench
  `cell_counter` item).
- `kind: modal`, `openClick: cell_counter`, `advanceClick: capture-count`,
  `completionEvent: count-cells-capture`.
- Scene field stays `bench` (the equipment item lives there); the modal IS
  the workspace UI.
- Status: shipped. Walker passes.

### plate_read -- LIKELY OK

Wet-lab action: insert plate into reader, press Read, view results.

- workspace: `plate_reader` (modal overlay, scene=bench equipment).
- `kind: modal` is appropriate.
- Status: walker not yet reaching this step; verify when blocker chain
  resolves.

### Drug dilution preparation: `carb_intermediate`, `carb_low_range`,

### `carb_high_range`, `metformin_stock`

Wet-lab actions (Part 4 of protocol):

- `carb_intermediate`: pipette 20 uL of 10 mM Carboplatin stock + 980 uL
  sterile water -> 200 uM intermediate (1 mL).
- `carb_low_range`: prepare 5 working stocks (50 nM, 250 nM, 625 nM,
  1.25 uM, 2.5 uM) by pipetting from the intermediate + media into
  five 1.5 mL tubes.
- `carb_high_range`: prepare 3 working stocks (5 uM, 25 uM, 100 uM) by
  pipetting from the 10 mM stock + media into three 1.5 mL tubes.
- `metformin_stock`: pipette 10 uL of 1 M Metformin stock + 990 uL media
  -> 10 mM working stock.

These are physical pipetting workflows. Per the directive, model as
`interactionSequence`. The current `kind: modal` with `startDrugAddition()`
is a calculation-tutorial modal that substitutes for pipetting; per the
directive, do not use modal as a shortcut for wet-lab liquid handling.

Proposed shape (carb_intermediate, two-interaction sequence):

```yaml
- id: carb_intermediate
  scene: hood
  completionPath:
    kind: interactionSequence
    interactions:
      - tool: micropipette_p1000 # NEW item, see "Items needed"
        source: carboplatin_stock
        destination: dilution_tube_rack
        liquid: carboplatin
        volumeMl: 0.020
        completionEvent: load_carb_to_intermediate
      - tool: micropipette_p1000
        source: sterile_water
        destination: dilution_tube_rack
        liquid: water
        volumeMl: 0.980
        completionEvent: carb_intermediate_complete
```

The four-tube and five-tube dilution series (`carb_low_range`,
`carb_high_range`) become longer interactionSequences -- one
load+discharge pair per tube. That is verbose but accurate. Alternative:
split each dilution series into one step per tube and let the protocol
have more steps. The directive says "If the modal is only for calculation
guidance or confirmation, keep the physical action in YAML and use the
modal only where the student actually confirms something" -- so the
existing calculation tables can remain as a modal layered alongside
(opened by clicking a help icon, not as the step's completionPath).

### Drug application: `add_carboplatin`, `add_metformin`, `add_mtt`,

### `add_dmso`

Wet-lab actions (Part 3 / Part 5):

- `add_carboplatin`: load multichannel from each working-stock tube,
  dispense 5 uL per well into the assigned columns/rows of the plate.
- `add_metformin`: load multichannel from Metformin working stock,
  dispense 5 uL per well into columns 7-12.

These are physical pipetting onto the well plate. `interactionSequence`
with `multichannel_pipette` + working-stock-tube + `well_plate`.

`add_mtt` and `add_dmso` are already `interactionSequence`. The current
walker passes them post hood-dispatch fix; confirm in the next walker run.

### Items needed (probable additions to `items.yaml`)

- `micropipette_p20`, `micropipette_p200`, `micropipette_p1000` -- separate
  pipettes for different volume ranges (currently the hood has a generic
  `micropipette_rack` decoration). The protocol prescribes specific
  volumes; if the simulation does not differentiate ranges, a single
  `micropipette` tool is acceptable but loses an educational signal.
- `dilution_tube_intermediate`, `dilution_tube_low_*`, `dilution_tube_high_*`,
  `dilution_tube_metformin` -- individual tubes in the
  `dilution_tube_rack` so each dilution has its own click target. The
  current rack is a single decoration item. Without per-tube items, the
  walker has no way to disambiguate which tube is the destination for
  each interaction.

## Migration order (proposed)

1. Vocabulary doc update: define workspace alongside scene in
   `docs/PROTOCOL_VOCABULARY.md`. No code changes.
2. Items: add per-tube items in `dilution_tube_rack` and a single
   `micropipette` tool item (or three -- p20/p200/p1000). Pick one.
3. YAML: convert `carb_intermediate` first (smallest, two interactions);
   verify walker advances. Then `metformin_stock` (also two-interaction).
   Then the multi-tube series (carb_low_range, carb_high_range).
4. UI: add hood click handlers for the new items. The drug modal can
   remain as a calculation aid but no longer be the step's completionPath.
5. Sweep: deprecate `startDrugAddition()` if no step relies on it after
   migration; keep as a help/calculation overlay if useful.

## Decisions needed before I start authoring

- D-A: Single generic `micropipette` tool, or three separate tools
  (`micropipette_p20`/p200/p1000)? Pedagogically distinct vs. simpler
  walker drive.
- D-B: Per-tube items in the dilution rack -- name pattern? E.g.
  `dilution_tube_carb_intermediate`, `dilution_tube_carb_5uM`, etc. A
  single-tube-per-step aliasing scheme (`dilution_tube_a`, `_b`, ...) is
  also viable but less self-documenting.
- D-C: Keep the existing drug modal (`startDrugAddition`) as a calculation
  overlay (open via help icon), or retire it entirely?
- D-D: For the multi-tube dilution series, one step with N interactions
  inside, or N separate steps in the protocol? The protocol describes
  them as a single dilution-prep "step" for the student but each tube is
  a discrete pipetting event.

## Current decisions

- **One generic micropipette** for now (no p20/p200/p1000 split).
- **Content-named dilution tube items** per protocol (e.g.
  `dilution_tube_carb_intermediate`, `dilution_tube_carb_b`...`_f`),
  not abstract `tube_a`/`tube_b` aliases.
- **Drug modal stays only as optional calculation/help overlay**, never as
  a `completionPath`. Migrating drug steps off `kind: modal` is the goal.
- **Dilution series is one protocol step with N interactions** unless a
  later proof shows that scope is too unwieldy.

## Migration status (per step)

| Step              | Status | Notes                                 |
| ----------------- | ------ | ------------------------------------- |
| count_cells       | done   | automated cell counter modal          |
| carb_intermediate | done   | interactionSequence; reference shape  |
| carb_low_range    | done   | physical interactionSequence (SP-K2f) |
| carb_high_range   | done   | interactionSequence; 8 interactions   |
| metformin_stock   | done   | interactionSequence; 4 interactions   |
| add_carboplatin   | done   | interactionSequence; 14 interactions  |
| add_metformin     | done   | interactionSequence; 2 interactions   |
| plate_read        | done   | modal with plate_reader scene         |
| results           | done   | modal with plate_reader scene         |

## Final status

**Walker completion:** 25/25 steps on cell_culture protocol.

All drug-treatment steps (carb_intermediate, carb_low_range, carb_high_range, metformin_stock, add_carboplatin, add_metformin) migrated from `kind: modal` to `kind: interactionSequence` during SP-K2f. Each step is now a physical pipetting workflow with discrete load/discharge interactions, matching the wet-lab protocol.

Plate reader steps (plate_read, results) are `kind: modal` with `scene: plate_reader`. Both steps use the same physical overlay; plate_read opens it and displays results, results closes it after review. Walker dispatch correctly routes both to the dedicated `walkPlateReaderStep` handler to avoid unnecessary scene switching.

All tutorial protocols (tutorial_split, tutorial_hood_transfer, tutorial_drug_dilution, tutorial_bench_direct, tutorial_cell_counter, tutorial_plate_reader) pass 100%.

All gates green: pytest 285/285, tsc clean, build success, coverage complete.
