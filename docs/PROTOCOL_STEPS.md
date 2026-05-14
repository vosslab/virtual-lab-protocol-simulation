# Protocol steps

Protocol terminology is defined in [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). This doc uses that vocabulary.

**Schema status:** This document describes the canonical protocol step schema. Some runtime wiring sections describe the current implementation and are maintained for runtime maintainers.

How the active tissue culture protocol is stored, ordered, triggered,
and validated at load time.

## Source of truth

All protocol steps are defined in YAML under `src/content/` and compiled at build
time into a TypeScript constant array `PROTOCOL_STEPS` in `generated/protocol_data.ts`
(gitignored; consumed via the authored facade `src/protocol.ts`).

The `ProtocolStep` interface defines the shape of each compiled entry. Every step has:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Bare semantic name (e.g. `spray_hood`, `add_trypsin`). Unique across the array. No numeric prefixes. |
| `nextId` | `string \| null \| (state) => string \| null` | Explicit successor in the protocol. `null` marks the final step. The function form is reserved for future branching (currently unused). |
| `label` | `string` | Short title shown in the sidebar protocol panel. |
| `action` | `string` | Imperative verb phrase displayed in the hood toolbar ("Wash the flask with 4 mL PBS"). Max 60 chars. |
| `why` | `string` | One-line rationale shown under the step card. Max 100 chars. |
| `partId` | union | Which Part of the protocol this step belongs to (`part1_split`, `part2_count`, etc.). Used only for UI grouping. |
| `dayId` | `'day1' \| 'day2' \| 'day4'` | Which experiment day. Used for the day-ribbon UI. |
| `stepIndex` | `number` | 1-based position inside `partId`. Used for "Step N of M" rendering inside a part. |
| `requiredItems` | `string[]` | Scene item ids the student must interact with to complete this step. |
| `usedItems` | `string[]` | Derived step-level summary of every `tool`/`source`/`destination` id in the completion path, in first-use order. Not authored. The active highlight items are derived from the current interaction, not directly from `usedItems`. |
| `completionPath` | object | The completion path describes how the step is completed. The `kind` field selects one of four shapes: `interactionSequence`, `directTool`, `modal`, or `multipleChoice`. See [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) and [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) for details. |
| `errorHints` | `Record<string, string>` | Named hint strings surfaced when the student makes a specific mistake. |
| `scene` | string | Which scene owns this step. |
| `correctVolumeMl` | `number?` | Optional exact volume the student must pipette, for pipette steps. |
| `toleranceMl` | `number?` | Optional tolerance around `correctVolumeMl`. |

## Ordering: explicit, not positional

Step order is defined by the `nextId` linked list, **not** by position in
the array. Array position only controls how the protocol panel enumerates
steps for display.

```
spray_hood -> aspirate_old_media -> pbs_wash -> add_trypsin -> ...
                                                                      -> plate_read -> results (nextId: null)
```

The state machine follows the chain: on each `completeStep(id)`, the
active step resolves its `nextId` and becomes the new `activeStepId`.
When `activeStepId` becomes `null`, the protocol is complete.

### Why not array position

The pre-refactor design used `gameState.currentStep: number` and scanned
`PROTOCOL_STEPS[i].id` against `completedSteps` to advance. That coupled
step identity to array order in two ways that bit us:

1. **Inserting a step between X and Y was a global edit** -- you had to
   renumber every downstream step if their ids carried positional
   prefixes (`p0_`, `p1_`, ...). The user specifically rejected this
   naming scheme because it blocks inserting a `p3.5`-style step later.
2. **Scene code and `PROTOCOL_STEPS` had to agree on the id exactly** --
   a rename in one place without the other caused silent state-machine
   deadlocks (see [docs/CHANGELOG.md](CHANGELOG.md) "M4 stuck at step 1").

With `nextId`, reordering is a local edit: change two neighbors'
`nextId` pointers. Inserting a step is three edits: add the new entry,
point the previous step at it, point it at the next step. Deleting a
step is two: remove the entry, update the predecessor's `nextId`.

## Adding a new step

1. Add a new entry to `src/content/protocol.yaml` with `id`, `label`, `scene`, and `completionPath`.
2. Choose the `completionPath.kind` (one of `interactionSequence`, `directTool`, `modal`, `multipleChoice`).
3. Fill in the kind-specific fields.
4. Wire `nextId` to the next step (or `null` for the last step).
5. Find the step that should now come *before* the new step and change its `nextId` to the new id.
6. Rebuild via `tools/build_protocol_data.py` so the typed protocol data regenerates.
7. Reload the game in the browser. `validateProtocolGraph()` runs on `DOMContentLoaded` to verify the step graph is connected.

## Current runtime implementation: completion-trigger wiring

This section describes the scene-code wiring contract that implements step completion.
Scenes wire steps manually via `triggerStep`.

### Triggering a step

This describes the runtime maintainer work, not part of authoring a step in YAML.

Scene code never calls `completeStep(id)` directly. It calls
`triggerStep(id)`, a wrapper defined in `src/game_state.ts`:

```typescript
function triggerStep(stepId: string): void {
    if (!PROTOCOL_STEPS.some(s => s.id === stepId)) {
        throw new Error('triggerStep called with unknown id: ' + stepId);
    }
    registeredEmitters.add(stepId);  // runtime wiring-coverage record
    completeStep(stepId);              // state-machine advance
}
```

`triggerStep` does three things:

1. **Orphan check at call time.** Calling it with an id that does not
   exist in `PROTOCOL_STEPS` throws immediately. This catches stale
   references after a rename without any build-time tooling.
2. **Runtime wiring registration.** Adds the id to the module-scope
   `registeredEmitters: Set<string>`. The `validateCompletionEventCoverage()`
   load-time check diffs this set against `PROTOCOL_STEPS` to find dead
   steps (steps with no completion-event emitter).
3. **State-machine advance.** Delegates to `completeStep(id)`, which
   either advances `activeStepId` via `nextId` (if `stepId === activeId`),
   or records an out-of-order attempt in `gameState.outOfOrderAttempts`.

### Pre-registration for load-time coverage

`triggerStep` only adds to `registeredEmitters` when it actually runs.
But `validateCompletionEventCoverage()` fires on the `load` event, before any
user clicks. Click-time triggers would not yet be registered.

Each scene file therefore announces its owned step ids at module init
time via explicit `registeredEmitters.add(id)` lines near the top of
the file, separately from the `triggerStep` calls inside click handlers.
Example from [src/scenes/cell_culture_hood/cell_culture_hood.ts](../src/scenes/cell_culture_hood/cell_culture_hood.ts):

```typescript
// Pre-register every step id this scene owns. validateCompletionEventCoverage()
// runs on the load event -- before any click handlers have fired -- and
// verifies that each PROTOCOL_STEPS id is in registeredEmitters.
registeredEmitters.add('spray_hood');
registeredEmitters.add('pbs_wash');
registeredEmitters.add('add_trypsin');
// ... etc for every step the hood scene owns
```

When you add a step, you must add its id in both places: the pre-
registration block and the click-handler `triggerStep` call. A step
with a missing pre-registration fails `validateCompletionEventCoverage` at
load time with a red banner.

## Reading the current step

Never index `PROTOCOL_STEPS` by a number to find the current step.
Always call `getCurrentStep()`, defined in `src/game_state.ts`:

```typescript
function getCurrentStep(): ProtocolStep | null {
    const id = gameState.activeStepId;
    if (id === null) return null;
    const step = PROTOCOL_STEPS.find(s => s.id === id);
    if (!step) throw new Error(`activeStepId '${id}' not in PROTOCOL_STEPS`);
    return step;
}
```

This is the only approved read path. UI code (the hood toolbar banner,
the protocol sidebar panel, scoring) all route through it. Direct
numeric indexing into `PROTOCOL_STEPS` is banned because that was the
coupling pattern behind the M4 stuck-at-step-1 regression.

## Hint derivation

The hood toolbar banner derives its text from the current step, not
from ad-hoc state flags. Three helpers in [src/scenes/cell_culture_hood/render.ts](../src/scenes/cell_culture_hood/render.ts)
translate the active interaction into concrete click-level guidance:

- `getStartingToolForStep(step)` -- returns the `tool` from the current
  interaction. Used when the student is holding nothing, to suggest
  which tool to pick up ("Pick up the Serological Pipette -- Wash the
  flask with 4 mL PBS").
- `getReagentSourceForStep(step)` -- returns the `source` from the
  current interaction. Used when the student is holding an unloaded
  pipette, to suggest the reagent source ("Click the 1x PBS").
- Tool-loaded sub-states (`serological_pipette_with_trypsin`,
  `multichannel_pipette_with_drug`, etc.) describe intermediate UI sub-
  actions that are not distinct protocol steps and keep their hardcoded
  hints.

All three derivation paths share the current step and the active
interaction as the source of truth. If the banner and the green
`is-active` highlights ever disagree, treat it as a bug in the hint
logic, not the state.

## Startup validators

Three load-time checks live in `src/init.ts`. All failures route through
`showValidationError(title, detail)`, which injects a blocking red banner
at the top of the page, logs to console, and sets
`window.__protocolValidation = {ok: false, title, detail}` before throwing.

### `validateProtocolGraph()`

Runs on `DOMContentLoaded`. Checks:

1. Every `PROTOCOL_STEPS[i].id` is unique.
2. Starting at `PROTOCOL_STEPS[0].id` and following `nextId` until
   `null`, every step id in `PROTOCOL_STEPS` is visited. Catches broken
   `nextId` links and orphan steps.
3. Exactly one step has `nextId === null` (the terminator).
4. Every string-form `nextId` references a real id.

### `validateCompletionEventCoverage()`

Runs on the `load` event, after scenes have rendered and pre-
registration blocks have executed. Diffs `PROTOCOL_STEPS` against
`registeredEmitters`. Any step id missing from the set throws as a
"missing completion-event emitter" error (strict mode) or logs a warning (relaxed mode).

Success sets `window.__protocolValidation = {ok: true}`.

### `validateProtocolSteps()`

Field-presence check. Ensures every step has required fields (`id`,
`label`, `scene`) and that ids are unique.

## Graph smoke test

`tests/playwright/protocol_graph_smoke.mjs` is a fast data-layer smoke test that proves
the `nextId` graph is reachable from start to finish. It walks the chain from
the first step to `null`, calling `completeStep(id)` for each step via
`page.evaluate` and screenshotting into `build/walkthrough/NN_<id>.png`
(1-indexed). Asserts final state: all steps completed, `stepsOutOfOrder === 0`,
`activeStepId === null`. Also reads `window.__protocolValidation` set by
`validateCompletionEventCoverage` on the `load` event; any validation failure exits
non-zero.

This is a data-layer test: it calls internal APIs directly, bypasses the DOM
click model, and proves the protocol graph is connected. It does not verify
that actual game clicks produce correct behavior.

## UI walker (canonical regression test)

`tests/playwright/e2e/protocol_walkthrough_yaml.mjs` is the canonical real-UI regression test
(Patch 8 and beyond). It reads compiled protocol data via
`page.evaluate(() => window.PROTOCOL_STEPS)` (from `generated/protocol_data.ts`,
re-exported by the `src/protocol.ts` facade)
and drives real DOM clicks in the correct tool-first order for each interaction
in each step. It is the primary CI gate and replaces the data-layer smoke test
for real-world behavior validation.

## Completion trigger wiring

The generated `completionTrigger` field maps the completion event declared in `completionPath` to step completion.

At runtime, when a completion event occurs, `triggerStep(id)` is called by
scene code. This is the current wiring contract: scenes announce events via
explicit function calls, not via auto-discovery from step metadata.

A future refactor could centralize event dispatch (moving "which step completes
on this event" logic from scene code into a data-driven resolver), but this
is out of scope for the current pass. See [docs/TODO.md](TODO.md).

## Tube-target dilution prep steps

Steps with `tubeTargets` metadata track dilution preparation in microtube vessels.
Each `TubeTarget` specifies source reagent, diluent, destination microtube, exact
volumes, and result liquid identity.

### Runtime behavior

A tube-prep step's `interactionSequence` contains exactly `4 * len(tubeTargets)`
interactions, enforced at build time by `validate_completion_path_contract()`:

- **Interaction 1 (solute load):** Student picks transfer tool, sources exact
  `soluteVolumeMl` from the item specified in `TubeTarget.source`. Field
  `liquid` is set by the interaction's `liquid` field (e.g., `stock`).
- **Interaction 2 (solute discharge):** Tool discharges into destination microtube
  specified by `TubeTarget.destination`. Scene calls `addTubeLiquid(tubeId,
  liquid, volumeMl)` via the `GameState` helper. This writes a
  `MicrotubeLiquid` entry to `gameState.tubeLiquids[tubeId]`.
- **Interaction 3 (diluent load):** Student sources exact `diluentVolumeMl`
  from the item specified in `TubeTarget.diluent`.
- **Interaction 4 (diluent discharge):** Tool discharges into the same
  destination. Scene calls `addTubeLiquid(tubeId, diluent, volumeMl)` again.
  This stacks a second `MicrotubeLiquid` entry on top of the first.

After all four interactions complete, `gameState.tubeLiquids[tubeId]` contains
two entries: one for solute (from interaction 2) and one for diluent (from
interaction 4). The final liquid state is identified by `TubeTarget.resultLiquid`
(a reagent id) and displayed to the student using `TubeTarget.resultLabel`.

### Fields reference

| Field | Type | Purpose |
| --- | --- | --- |
| `source` | `string` | Item id of the solute source (e.g., `stock_bottle`) |
| `diluent` | `string` | Item id of the diluent source (e.g., `water_bottle`) |
| `destination` | `string` | Microtube id where solute and diluent are combined (e.g., `tube_a`) |
| `soluteVolumeMl` | `number` | Exact volume in mL to aspirate from source (e.g., `0.040` for 40 &mu;L) |
| `diluentVolumeMl` | `number` | Exact volume in mL to aspirate from diluent (e.g., `0.960` for 960 &mu;L) |
| `resultLiquid` | `string` | Reagent id of the combined result (e.g., `carboplatin` for a carboplatin working solution) |
| `resultLabel` | `string` | Student-facing label describing the final result (e.g., `400 uM carboplatin working solution`) |

### Mutual exclusivity

A single step cannot have both `tubeTargets` and `plateTargets`. This is enforced
at build time. If a protocol requires both dilution prep and plate preparation in
one workflow, split into two consecutive steps.

### Terminology

Tube-target steps prepare an **intermediate dilution** or a **working
solution** from a **stock solution**:

- The `source` references a stock solution bottle or an earlier
  intermediate-dilution tube.
- The `diluent` references the dilution reagent (typically distilled
  water or media).
- `resultLiquid` is the reagent identity of the resulting liquid.
- `resultLabel` is the human-readable tier label (for example, "400
  uM carboplatin working solution" or "carboplatin intermediate
  dilution").

Use stock solution, intermediate dilution, and working solution
consistently in `resultLabel` strings. The banned synonyms "working
stock" and "parent stock" do not appear in label text or in
authoring docs (see
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md)).

## Plate-target transfer steps

Plate-target metadata is the symmetric structure for plate-transfer
steps: each entry in `plateTargets` maps one load+discharge interaction
pair to the wells that receive liquid. See the "Plate target object
structure" section of
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) for the schema and a
worked example. The runtime plate dispatcher consumes `plateTargets` to
classify each well (completed, active, future), deposit liquid into the
active well set, and advance to the next target when the active target
finishes.

## MultipleChoice completion paths

A step whose `completionPath.kind` is `multipleChoice` is a
quiz-style or calculation-check step. The runtime renders the
question as a popup card with one button per choice. Clicking the
choice flagged `correct: true` emits the step's `completionEvent`
and advances the protocol; clicking an incorrect choice shows that
choice's `feedback` string but does not complete the step. See the
"Kind: `multipleChoice`" subsection of
[PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md) for the schema
and worked example. Use this completion path for calculation
popups inside a workspace-only mini-tutorial; do not navigate to a
separate quiz scene.
