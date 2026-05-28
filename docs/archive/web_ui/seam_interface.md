# Shell seam interface

Canonical reference for the typed seam between the protocol runtime and
the Solid.js shell. Implementation lives in
`types.ts`.

This doc is a test-selector and event-lifecycle contract. It does not
duplicate type definitions; the TypeScript source is authoritative.

## Direction of flow

```
+-------------------+     ProtocolShellEvent     +------------------+
| Protocol runtime  | -------------------------> |  Solid shell     |
| (authoritative)   |                            |  (observer)      |
|                   | <-- subscribe / snapshot --|                  |
+-------------------+                            +------------------+
```

The runtime emits typed events after every state transition. The shell
subscribes and derives a `ShellViewSnapshot`. The shell never calls a
mutation method on the runtime.

## No-mutation rule

The shell has access to `ProtocolShellEmitter`, which exposes exactly
two surfaces:

- `subscribe(listener)` -- register an event handler; returns an
  unsubscribe function.
- `get_snapshot()` -- read the current `ShellViewSnapshot`.

Anything else is a runtime-internal symbol. The shell never:

- advances a step;
- validates an interaction;
- dispatches a scene operation;
- changes `selectedTool`, `heldLiquid`, `activeScene`, or any analogous
  property;
- writes to `window`, `localStorage`, or any global other than its own
  mount-root DOM tree.

A shell patch that imports or references a runtime-internal symbol is
review-rejected by the boundary lint (planned in WP-3-9 of
[runtime_seam_plan.md](runtime_seam_plan.md)).

## Event lifecycle

Order is illustrative, not strictly enforced by the type system; the
state machine in `src/scene_runtime/protocol/step_machine.ts` (M2) owns
the exact sequence.

1. `protocol_loaded` -- fired once on mount. Carries
   `protocol_name`, `entry_step_name`, `total_step_count`.
2. `step_started` -- fired when the runtime enters a step. Carries the
   step's `step_name`, `prompt`, `interaction_count`.
3. Per interaction in the step's sequence:
   - `scene_changed` (if the prior interaction emitted a `SceneChange`).
   - `modal_opened` / `tray_changed` / `help_opened` if the step or
     interaction requires a UI surface.
   - One of `interaction_validated` or `interaction_rejected` per
     attempt. `interaction_rejected` does not advance
     `interaction_index`; the runtime may emit `modal_closed` /
     `help_closed` accordingly.
   - `scene_operation_applied` for each `scene_operations` entry
     processed in the validated interaction's `response`.
4. `step_completed` -- fired with `resolution: "complete"` once
   `step_validator` passes, or with `resolution: "retry"` if the step
   fails and `outcome.on_failure: retry` resets the whole sequence per
   PRIMARY_SPEC.md.
5. After every `step_completed` with `complete` resolution, the
   runtime follows the step's `next_step` and emits the next
   `step_started`, or `protocol_completed` if `next_step` is null.

## Snapshot derivation

`ShellViewSnapshot` is rebuilt by the runtime after every event. The
shell does not own derivation logic. Derived fields:

- `current_step_name` <- last `step_started.step_name`, cleared on
  `protocol_completed`.
- `current_prompt` <- last `step_started.prompt`.
- `current_interaction_index` <- count of `interaction_validated`
  events in the active step; reset on `step_started`.
- `progress.completed_step_count` <- count of `step_completed` events
  with `resolution: "complete"` since `protocol_loaded`.
- `progress.total_step_count` <- `protocol_loaded.total_step_count`.
- `last_outcome` <- `(step_name, resolution, retry_count)` from the
  most recent `step_completed`.
- `pending_validator_kind` <- runtime-internal lookup against the
  current interaction's validator preset.
- `modal` / `help` <- the most recent open event, cleared on the
  matching close event.
- `tray` <- the most recent `tray_changed.items`.
- `active_scene_name` <- last `scene_changed.to_scene`.
- `is_complete` <- true after `protocol_completed`.
- `active_interaction_target` <- the target of the current interaction
  (the interaction at `current_interaction_index` in the active step's
  sequence); set on `step_started` to the first interaction, advanced
  on `interaction_validated` to the next interaction, or null if no
  active step or index is out of bounds; cleared on `step_completed`
  and `protocol_completed`.
- `active_interaction_gesture` <- the gesture of the current interaction
  (paired with `active_interaction_target`); set on `step_started`,
  advanced on `interaction_validated`, or null if no active interaction;
  cleared on `step_completed` and `protocol_completed`.

## Closed selector surface

Shell components emit DOM selectors from a closed namespace. Adding a
new selector requires editing `docs/specs/INTERFACE_VOCABULARY.md` (the
canonical test-selector contract; linked from this doc once that file
lands in git via `git add`).

Reserved namespaces:

- `data-hud-*` -- HUD presentation.
- `data-modal-*` -- modal dialog surface.
- `data-tray-*` -- inventory tray.
- `data-help-*` -- help / professor overlay.
- `data-feedback-*` -- feedback toast.
- `data-protocol-id` -- launcher link target.
- `data-launcher-*` -- launcher chrome.

Scene-side `data-item-id`, `data-target-name`, etc. remain owned by
the renderer and are not in the shell namespace.

## Debug-only hooks

Two query parameters, both documented debug-only, never present in
launcher-generated links:

- `?shell=off` -- shell does not mount. The runtime still emits events
  to a console sink. Used by WP-2-4-style independence checks.
- `?walker=expose` -- exposes `window.__shellEmitter` for the
  Playwright walker harness. Off by default. Only consumed by
  `tests/playwright/test_solid_walker.mjs` (M4).

Both flags are removed from production deploys via a build-time check
on `import.meta.env.MODE` (or equivalent esbuild define).

## Validation rules summary

For convenience; PROTOCOL_VOCABULARY.md is the canonical source.

- `correct_target` -- interaction's `target` matches the addressed
  scene object's name.
- `correct_choice` -- modal close emits `chosen_choice_id` matching
  the interaction's expected choice.
- `target_with_value` -- target plus a typed value map; closed key set
  pending vocabulary closure WP-5-2.
- `sequence_complete` -- every interaction in the step's sequence
  reached `interaction_validated`.
- `final_state_matches` -- step-scoped end-state assertion against
  declared object state fields.

Unknown validator preset -> compile-time error (the
`InteractionValidatorPreset` / `StepValidatorPreset` unions in
types.ts).

## What the shell may add later (within the seam)

The shell may add new component-internal signals, layouts, accessibility
features, and theming without changing this contract. Anything that
requires a new event variant or a new snapshot field requires a plan
amendment.

The two fields `active_interaction_target` and `active_interaction_gesture`
were added via plan amendment M4-FIX-2 to enable the walker to query the
expected next target and gesture without brute-forcing clicks. These fields
are derived from the current step's sequence and the `current_interaction_index`.
