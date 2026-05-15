# Protocol vocabulary code-migration plan (stub)

This is a stub for the follow-on plan that migrates runtime code onto the
ratified two-level protocol interaction vocabulary. It is not a full plan; it
records the input and the known early deliverables so the work can be planned
in detail later.

## Status

Stub. Not yet a sequenced plan. Created at the close-out of the unified
interaction vocabulary plan (WP-DOC-C1).

## Input

The ratified vocabulary is the input to this plan:

- [../specs/PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md) - the ratified
  two-level `protocol -> step -> interaction -> response` model.
- [../specs/SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md) - the ratified scene-side
  vocabulary, including the adapter registry and `target_groups`.
- [docs/archive/unified_interaction_vocabulary_design.md](../archive/unified_interaction_vocabulary_design.md)
  - the M2 design doc with the full slot definitions, the eight
  `scene_operation` primitives, and the named-preset validators.

The vocabulary is documentation-complete and ratified against 120 steps. No
code has moved yet; that is this plan's job.

## Known early deliverables

- **Build the `adjust`-gesture interaction**. The `adjust` gesture (continuous
  set-point control, for example pipette volume or power-supply voltage) is
  ratified in the vocabulary but does not exist in the runtime yet. This is the
  earliest concrete deliverable.
- **Design and ratify the deferred ninth `scene_operation` primitive**,
  `DataReadout` / `InstrumentReadDisplayChange`, with typed fields for
  absorbance, cell count, gel band pattern, molecular-weight estimate, and
  instrument metadata. M3 accepted Option 2 (instrument data stays
  feedback-only) for the vocabulary pass; this plan ratifies the primitive.
- **Migrate the runtime and walker off the legacy `completionPath` schema**
  onto the two-level model.
- **Dead-field cleanup** deferred from the vocabulary plan: remove
  `stateChange.heldLiquid`, `consumesVolumeMl`, the per-interaction
  `completionEvent`, and `requiredItems`.
- **Primary-doc reconcile already done**: the vocabulary plan already
  reconciled [docs/PRIMARY_SPEC.md](../PRIMARY_SPEC.md) and
  [docs/PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md) to the ratified two-level
  model (with clearly-labeled current-code notes for the legacy fields). Only
  the *code* migration off the legacy `completionPath.kind` schema remains,
  which is what this migration plan covers.

## Out of scope for this stub

Sequencing, work-package decomposition, acceptance gates, and rollout are not
defined here. They belong in the full plan that supersedes this stub.
