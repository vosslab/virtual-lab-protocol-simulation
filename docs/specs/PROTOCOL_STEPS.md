# Protocol steps

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

How a protocol's steps are shaped, ordered, validated, and resolved.

## Target-state vs current-code

This doc is labeled like [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md):

- **target-state** -- the ratified two-level interaction model: a `step`
  wraps an ordered `sequence` of `interaction` blocks, checked by a
  `step_validator`, resolved by an `outcome`, and linked by `next_step`.
- **current-code** -- the runtime wiring that exists today. The current
  runtime still uses the retired `completionPath` schema and the legacy
  completion-event emitter wiring; that migration debt is tracked in the
  Status section of [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) and
  is the follow-on code-migration plan's job.

If a section is not labeled current-code, treat it as target-state.

## Source of truth

Status: **target-state.**

All protocol steps are defined in YAML under `src/content/` and compiled at
build time into a typed TypeScript constant. Each step carries the six
required slots from [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md):

| Slot | Purpose |
| --- | --- |
| `name` | Stable snake_case identifier for the step. Used for protocol flow, tests, and debugging. |
| `prompt` | States what the student is asked to accomplish in this step. |
| `sequence` | The ordered list of `interaction` blocks; order always matters. |
| `step_validator` | Named preset that checks whole-step completion. |
| `outcome` | The `{on_success, on_failure}` mapping that says how the step resolves. |
| `next_step` | Names the next step by its `name`, or `null` for a terminal step. |

The full YAML schema for these slots, the `interaction` block, the
`response` container, and the validator presets is documented in
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md).

## A step is one pedagogical unit

Status: **target-state.**

A `step` is one thing the student is asked to accomplish. A step is often
multi-gesture: "Wash the flask with 4 mL PBS" is a single step, but
completing it takes three gestures. The two-level model keeps the step as
the pedagogical unit while the individual gestures live inside it in an
ordered `sequence` of `interaction` blocks.

Each `interaction` is one `gesture` on one `target`, checked by its own
`validator`, with its own `response`. There is no separate task-type slot
on an interaction; the target's kind plus the gesture carries the task
semantics. See [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) for the
slot charters.

## The interaction chain

Status: **target-state.**

Within a step, the chain runs:

1. The student performs a `gesture` on a `target`. That pair is one
   `interaction`.
2. The interaction's `validator` -- a named preset -- checks that one
   gesture on that one target.
3. A valid interaction fires its `response`: the `scene_operations` the
   gesture causes plus optional `feedback`.
4. The step's interactions run in `sequence` order. When the sequence is
   satisfied, the step's `step_validator` -- also a named preset -- checks
   whole-step completion.
5. The `step_validator` result drives the `outcome` mapping: `on_success`
   resolves the step, `on_failure` restarts the whole step (the entire
   `sequence` resets). Once the step resolves, `next_step` names which step
   runs next. Advancing is not an `outcome` value.

## Ordering: explicit, not positional

Status: **target-state.**

Protocol flow is `entry_step` plus each step's `next_step` pointer. Array
position in the `steps` list is reading convenience only and never controls
flow.

```
spray_hood -> aspirate_old_media -> pbs_wash -> add_trypsin -> ...
                                                     -> plate_read -> results (next_step: null)
```

The runtime follows the chain: when a step resolves `complete`, it reads its
`next_step` and that step becomes active. When `next_step` is `null`, the
protocol is complete.

### Why not array position

A positional model couples step identity to array order: inserting a step
between two others becomes a global edit, and a rename in one place without
the other causes silent deadlocks. With `next_step`, reordering is a local
edit: change two neighbors' `next_step` pointers. Inserting a step is three
edits: add the new step, point the previous step at it, point it at the
next step.

A `step_index` field may exist for display order only. It is not part of
the protocol-flow spec and never controls flow.

## The iterative loop

Status: **target-state.**

An iterative loop -- destaining until the background is clear -- is
expressed as a `final_state_matches` `step_validator` plus an
`outcome.on_failure: retry`. While the named state is not reached,
`on_failure: retry` restarts the whole step. There is no separate
`repeat_until` construct and no separate loop step type.

## Adding a new step

Status: **target-state.**

1. Add a new entry to the protocol's `steps` list with `name`, `prompt`,
   `sequence`, `step_validator`, `outcome`, and `next_step`.
2. For each interaction in the `sequence`, fill the four slots: `target`,
   `gesture`, `validator`, `response`.
3. Wire `next_step` to the next step's `name` (or `null` for the last step).
4. Find the step that should now come before the new step and change its
   `next_step` to the new step's `name`.
5. If this is the first step, update the protocol's `entry_step`.
6. Rebuild so the typed protocol data regenerates, and walk the protocol
   through the real UI (see [WALKTHROUGH_GUIDE.md](WALKTHROUGH_GUIDE.md)).

## Event emission

Status: **target-state.**

Events are emitted by the runtime on a state transition the rest of the
protocol may react to: an interaction firing a true `validator`, a step
resolving `complete`, or a timed-equipment phase elapsing. Events are not
hand-authored per interaction. Event names are snake_case and derived from
the `name` of the thing they report: `<step_name>_complete` when a step
resolves, `<equipment_name>_elapsed` when a timed phase ends. An author who
renames a step renames its completion event with it.

## Current runtime implementation

Status: **current-code.**

The runtime as it ships today does not yet implement the two-level model.
It uses the legacy `completionPath` schema and a manual completion-event
emitter wiring contract: scene code calls `triggerStep(stepId)`, and each
scene pre-registers its owned step ids at module load so the load-time
coverage check can confirm every step has an emitter. Migrating the runtime
to the two-level model -- `sequence`, `step_validator`, `outcome`,
`next_step`, and runtime-derived events -- is the follow-on code-migration
plan's job. Until that lands, a reader working in the runtime will still see
the retired schema; the gap is explicit, not hidden.

## Startup validation

Status: **current-code.**

Load-time checks verify the step graph before any user interaction:

- Every step identifier is unique.
- Following the flow pointers from the first step visits every step, with
  exactly one terminal step. Catches broken links and orphan steps.
- Every flow pointer references a real step.
- Field-presence: every step has its required slots.

A validation failure injects a blocking error banner, logs to console, and
records the failure on a window-scoped validation flag.

## UI walker

Status: **current-code.**

The canonical real-UI regression test is the YAML-driven UI walker
documented in [WALKTHROUGH_GUIDE.md](WALKTHROUGH_GUIDE.md). It reads the
compiled protocol data and drives real DOM clicks through the same visible
path a student uses. It is the primary CI gate for whether a mini-protocol
is playable.

## Related docs

- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md): canonical terms and the
  retired-terms table.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md): full step and
  interaction YAML schema.
- [PROTOCOL_AUTHORING_GUIDE.md](PROTOCOL_AUTHORING_GUIDE.md): how to author
  a protocol end to end.
- [WALKTHROUGH_GUIDE.md](WALKTHROUGH_GUIDE.md): the real-UI walker.
