# SP-K2f: Modal open-chain dispatch

## Status

> **Rejected / superseded by `wet_lab_classification.md`.**
>
> `openSequence` would model physical pipetting clicks as a complicated
> modal opener. The current design treats drug dilution and drug application
> as wet-lab physical transfer workflows, so these steps should migrate to
> `completionPath.kind: interactionSequence` instead. Kept for historical
> context; do not let it drive future work.

## Problem

After SP-K2e, the cell_culture walker advances through 11/25 steps and blocks at
`carb_low_range`. The failure is not a literal-step-id residue; it is a schema
gap in `completionPath.kind: modal`.

The five drug-treatment modal steps (`carb_low_range`, `carb_high_range`,
`metformin_stock`, `add_carboplatin`, `add_metformin`) all declare:

```
completionPath:
  kind: modal
  openClick: multichannel_pipette
  advanceClick: <choice|drug-modal-advance>
```

But the actual modal (`startDrugAddition`, src/steps/drug_treatment.ts:129) is
only opened when the hood click chain reaches the third click:

```
multichannel_pipette  ->  drug_vials  ->  well_plate
                                          (here startDrugAddition fires)
```

The walker's "generic modal path" performs `openClick` once and then waits for
`advanceClick` to be visible. The modal never renders, so the wait times out.

## Why this is not SP-K2e

SP-K2e replaced `triggerStep('<literal>')` calls in scene dispatch. That is a
runtime fix.

This is a schema/walker mismatch: `kind: modal` cannot express "the modal opens
only after a multi-click setup." Same family of code, but a different defect.

## Constraints

User authorization rules:

- No new `completionPath.kind` unless required.
- No broad hood rewrite.
- No drug-modal refactor.
- No schema redesign.

## Two viable fixes (pick the smallest that holds)

### Option A: Extend the modal kind with an optional `openSequence`

Add an optional sibling field to the existing `modal` kind:

```yaml
completionPath:
  kind: modal
  openSequence: [multichannel_pipette, drug_vials, well_plate]
  advanceClick: dilution-choice
  completionEvent: carb-low-range-confirm
```

When `openSequence` is present, the walker clicks each id in order before
waiting on `advanceClick`. When absent, the walker keeps the current
single-click behavior. No new kind. Existing modal steps (cell_counter,
plate_reader) keep working unchanged.

Validator: require `openClick` xor `openSequence` (one of them).

Footprint:

- `tools/build_protocol_data.py`: validator + emitter.
- `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`: walker reads
  `openSequence` when present.
- `src/content/cell_culture/protocol.yaml`: replace `openClick:
  multichannel_pipette` with `openSequence: [...]` for the five drug steps.
- Regenerate `src/content/protocol_data.ts`.

This is the proposed default. It does not introduce a new kind; it expands one
existing kind by a single optional field.

### Option B: Promote the chain into `interactionSequence` followed by a
trailing modal advance

Reframe each drug step as an `interactionSequence` whose final interaction
opens the modal, with the modal advance as the completion event. This requires
a richer `interactionSequence` shape (modal advance is not currently a
recognized interaction kind), so it is a larger change than Option A and
likely needs a new interaction kind. Reject unless Option A blocks on a
constraint not foreseen here.

## Verification (either option)

```
bash build_github_pages.sh
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_bench_direct
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_cell_counter
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_plate_reader
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_drug_dilution
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs --protocol tutorial_hood_transfer
node tests/playwright/e2e/protocol_walkthrough_yaml.mjs   # cell_culture
pytest tests/
npx tsc --noEmit -p src/tsconfig.json
```

Mini-protocols must stay green. cell_culture walker must advance past
`carb_low_range` (>= 12/25). If the next blocker is the same-shape (`openClick:
multichannel_pipette`) drug step, the same fix unblocks it. If a different
blocker surfaces, document it and stop.

## Risk

Bounded to the five drug-treatment modal steps and one optional schema field.
No runtime behavior change for cell_counter or plate_reader modal steps; their
single-click open still works.

## Decision needed

Pick Option A or document why it is insufficient. Until then, the cell_culture
walker remains at the 11/25 ceiling.
