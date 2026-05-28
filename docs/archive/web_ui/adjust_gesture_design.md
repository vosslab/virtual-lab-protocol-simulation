# Adjust gesture design

Scope: design note only. No `.ts`/`.tsx`/`.py` changes. No vocabulary edits
(those need user approval per PRIMARY_CONTRACT.md). This note prepares the
work packages needed to land the second-pilot protocol
`content/protocols/cell_culture/mtt_reagent_prep/protocol.yaml`, whose
step `prepare_solution_tube` issues `gesture: adjust` on the
`micropipette` target with `validator.preset: target_with_value` and
`value: { set_volume: 1000 }`.

References:

- [PROTOCOL_VOCABULARY.md](../../specs/PROTOCOL_VOCABULARY.md)
  (gesture set; adjust = continuous set-point gesture).
- [INTERFACE_VOCABULARY.md](../../specs/INTERFACE_VOCABULARY.md)
  (interface owns HUD, modal, tray, feedback, help, launcher; scene owns
  `data-item-id` and other scene-side selectors).
- [validators.ts](../../../src/scene_runtime/protocol/validators.ts)
  (`validate_target_with_value` already compares clicked target plus a
  `value_map: InteractionValueMap` against `interaction.validator.parameters`).
- [click_resolver.ts](../../../src/scene_runtime/protocol/click_resolver.ts)
  (single delegated click listener model; adjust needs an analog).
- [step_machine.ts](../../../src/scene_runtime/protocol/step_machine.ts)
  (`handle_click`, `handle_modal_close`, `handle_timer_elapsed` are the
  current handle\_\* surface).
- `types.ts`
  (closed `ProtocolShellEvent` discriminated union and
  `InteractionValueMap` shape).

## DOM affordance

The adjust control is part of the interface, not the scene. The
micropipette object stays in the scene panel (clickable via
`data-item-id="micropipette"`), but the continuous set-point editor is
an interface affordance that opens when the active interaction has
`gesture: "adjust"` on a target with a declared set-point field. This
mirrors how modal/tray live in the interface and not in the scene.

Three options were considered.

### Option A. Native input number inside an interface region (recommended)

Render a small HUD-adjacent panel (a new `data-adjust-*` namespace, see
"Interface vocabulary additions" below) carrying a single native
`<input type="number">`, a confirm button, and a cancel button. The
panel appears only while the active interaction's `gesture === "adjust"`
and its target has a declared set-point field family
(`set_volume`, `set_temperature`, `set_rpm`, ...).

- Owner panel: interface, peer of HUD and modal. Not the scene.
- Keyboard accessibility: native input gets Tab focus; Enter commits;
  Escape cancels; arrow keys nudge by `step`. No custom focus traps
  needed beyond what the modal pattern already uses.
- Walker addressability: `data-adjust-target` carries the semantic
  target name (`micropipette`), `data-adjust-field` carries the
  set-point field name (`set_volume`), `data-adjust-input` marks the
  `<input>` element, `data-adjust-commit` marks the confirm button.
  Walker sets `input.value`, dispatches an `input` event so the shell
  signal updates, then clicks `[data-adjust-commit]`.
- Why recommended: native number input handles validation, range
  enforcement (`min`, `max`, `step`), and keyboard semantics for free;
  no custom slider thumb math; mirrors the modal vocabulary already in
  the seam (one open commit/cancel surface, not two). It addresses
  every set-point field family in the same panel, so future targets
  (power supply voltage, incubator temperature) reuse the same DOM
  contract.

### Option B. Native input range for continuous set-points

Render `<input type="range">` instead of `type="number"`. The range
slider is more skill-evocative for the "continuous set-point" wording
in PROTOCOL_VOCABULARY.md, but the value space for a pipette is a
discrete integer (microliters) read off a click-wheel; the range UI
implies smooth dragging that does not match real lab affordance.
Reject as the default. A range slider could be added later as a per-
target render hint if a target's set-point family declares it; that
extension is out of scope for the first WP set.

### Option C. Custom plus/minus buttons with a data-set-value attribute

Render two buttons (`+`, `-`) plus a readout, each carrying
`data-set-value="<delta>"`. The walker would click the appropriate
button N times to reach the target value. Reject: this is slow for the
walker (1000 clicks to reach 1000 microliters), brittle (any change to
default step size invalidates every walker), and does not provide a
single commit boundary (every click is already a state change). Native
number input keeps the commit boundary explicit and walker-cheap.

### Interface vocabulary additions

A future WP will add the following rows to
`docs/specs/INTERFACE_VOCABULARY.md` (vocabulary edit needs user
approval; this design note only proposes the shape):

| Attribute | Emitted by | Value |
| --- | --- | --- |
| `data-adjust-root` | `src/shell/adjust/AdjustPanel.tsx` (proposed) | empty marker, present only while panel is open |
| `data-adjust-target` | same | active target name (e.g. `micropipette`) |
| `data-adjust-field` | same | set-point field name (e.g. `set_volume`) |
| `data-adjust-input` | same | empty marker on the `<input type="number">` |
| `data-adjust-commit` | same | empty marker on the confirm button |
| `data-adjust-cancel` | same | empty marker on the cancel button |

Reserved namespace: `data-adjust-*` (mirrors `data-modal-*`,
`data-tray-*`, `data-help-*`, `data-feedback-*`).

## Event lifecycle

Two options were considered for the closed `ProtocolShellEvent` union.

### Option E1. Reuse existing variants with a value field (recommended)

The current per-interaction events are `interaction_validated` and
`interaction_rejected`. Both already carry `gesture: Gesture`. Adding
adjust support does not require new event kinds; it requires:

- A new entry-point on `StepMachineHandle`:
  `handle_adjust_commit(target: string, value_map: InteractionValueMap): void`.
  This is the adjust analog of `handle_click`. The step machine
  dispatches `validate_target_with_value(interaction, target, value_map)`
  (already implemented in `validators.ts`) and emits the same
  `interaction_validated` / `interaction_rejected` events on resolution.
- An optional `value_map` field on `InteractionValidatedEvent` and
  `InteractionRejectedEvent`. The seam is closed, so this is a
  one-line additive change reviewed as part of WP-2 below. Walker and
  shell tests already ignore unknown fields on these events.

No new lifecycle states (`AdjustStarted`, `AdjustCanceled`) are
proposed. The "panel open" state is derived from the active
interaction's gesture inside the shell snapshot reducer, not from a
separate event. This matches how the modal panel derives its open
state from `modal_opened` / `modal_closed` plus snapshot reads --
adjust does not need a parallel open/close event pair because the
panel opens automatically on step entry when gesture is `adjust` and
closes on commit or step retry.

### Option E2. New AdjustStarted / AdjustCommitted / AdjustCanceled variants

Rejected. The seam closure principle in
`docs/active_plans/active/web_ui/seam_interface.md` favors keeping the
union minimal; modal precedent already collapses "interaction in
progress" into a derived snapshot bit rather than a discrete event
trio. Adding three variants for one gesture sets a precedent the
remaining gestures (`drag`, `type`) would follow, doubling the union
size without behavioral benefit.

### Snapshot derivation

`ShellViewSnapshot` already exposes `active_interaction_target` and
`active_interaction_gesture`. The adjust panel mounts when
`active_interaction_gesture === "adjust"` and unmounts when
`current_interaction_index` advances or `last_outcome.resolution`
flips to `retry`. No new signal needed; the existing
`active_interaction_gesture` is sufficient.

## Validator wiring

`validate_target_with_value(interaction, clicked_target, value_map)`
already accepts an `InteractionValueMap` and compares every key in
`interaction.validator.parameters` against the supplied value_map.
The YAML field name in the existing protocol is `value` (not
`parameters`); the seam type `ValidatorReference` already declares
both `params` and `value` as readonly maps. WP-2 ensures the loader
that builds `ProtocolStep` from YAML normalizes `value:` into
`validator.parameters` (or the validator dispatch reads from
`validator.value` when `parameters` is absent). Whichever path is
taken must be a single line in the loader, not a per-gesture branch
in the step machine.

The commit point is the confirm button click (or Enter key inside the
input). On commit, the shell calls
`StepMachineHandle.handle_adjust_commit(target, { set_volume: parsed_value })`.
The step machine then runs the validator dispatch and emits
`interaction_validated` (success) or `interaction_rejected` with
`reason_code: "wrong_value"` (failure). The step machine never reads
DOM; the shell is responsible for parsing `input.value` to a number
before calling `handle_adjust_commit`.

Cancel does nothing observable to the runtime: the panel closes, the
step machine state is unchanged, and the same interaction stays
active. Cancel is a UI affordance, not a protocol event.

## Walker contract

`tests/playwright/test_solid_walker.mjs` (or a new sibling
`tests/playwright/test_mtt_walker.mjs`) drives the mtt_reagent_prep
protocol. For each `adjust` interaction the walker:

1. Waits for the shell snapshot to report
   `active_interaction_gesture === "adjust"` and
   `active_interaction_target === "<target>"`. This is observable from
   the DOM via `[data-adjust-root]` becoming present.
2. Reads `[data-adjust-field]` to learn the field name
   (`set_volume`).
3. Sets `input.value` on `[data-adjust-input]` to the value declared
   in the protocol YAML (the walker may read the loaded `PROTOCOLS`
   table to recover the expected value, the same way the click walker
   reads `target` for the next click).
4. Dispatches an `input` event so the shell signal observes the new
   value.
5. Clicks `[data-adjust-commit]`.
6. Waits for `InteractionValidatedEvent` for that
   `(step_name, interaction_index)` or for `current_interaction_index`
   to advance in the snapshot.

The walker must not call `handle_adjust_commit` directly. It must not
mutate runtime state, must not bypass the adjust panel, and must not
use `?walker=expose` to skip the UI. The same visible-UI discipline
that PRIMARY_SPEC.md enforces for clicks applies here.

## Implementation work packages

| WP | Title | Depends on | Notes |
| --- | --- | --- | --- |
| WP-ADJ-1 | Interface vocabulary extension | (none) | Edit `docs/specs/INTERFACE_VOCABULARY.md` to add the `data-adjust-*` namespace rows. Vocabulary edit; requires user approval per PRIMARY_CONTRACT.md before any DOM code lands. |
| WP-ADJ-2 | Step machine adjust entrypoint | WP-ADJ-1 | Add `handle_adjust_commit(target, value_map)` to `StepMachineHandle`. Wire to existing `dispatch_interaction_validator("target_with_value", ...)`. Add optional `value_map` field to `InteractionValidatedEvent`/`InteractionRejectedEvent`. Loader normalizes YAML `value:` into validator parameters. Unit tests in `tests/test_m2_integration.mjs`. |
| WP-ADJ-3 | Adjust panel component | WP-ADJ-1 | New `src/shell/adjust/AdjustPanel.tsx`. Subscribes to `active_interaction_gesture` and `active_interaction_target`. Renders `<input type="number">`, commit, cancel. Calls `handle_adjust_commit` on confirm. Mounted by `protocol_host.tsx`. |
| WP-ADJ-4 | mtt walker | WP-ADJ-2, WP-ADJ-3 | `tests/playwright/test_mtt_walker.mjs` drives `mtt_reagent_prep` end-to-end. Asserts terminal step reached, screenshots before/after each adjust commit per PRIMARY_CONTRACT.md item 4. |
| WP-ADJ-5 | Walker registration and CI gate | WP-ADJ-4 | Wire the new walker into `check_codebase.sh` Playwright stage (or its equivalent). Update `docs/CHANGELOG.md` and `docs/active_plans/active/web_ui/pilot_selection.md` to mark `mtt_reagent_prep` re-promoted as live pilot. |

Sizing: each WP is one coder, one PR-sized change. WP-ADJ-2 is the
largest (touches seam, loader, step machine, validator dispatch test);
the others are localized to a single panel, a single walker, or a
single doc.

## Open questions

1. (BLOCKER for WP-ADJ-1.) `data-adjust-*` namespace rows are a
   vocabulary edit to `INTERFACE_VOCABULARY.md`. Per
   `docs/PRIMARY_CONTRACT.md` and the closure principle in
   `docs/PRIMARY_DESIGN.md` (vocabulary closure and anti-drift), this
   requires user approval before any DOM lands. The proposed row set
   is listed under "Interface vocabulary additions" above; the user
   needs to confirm the namespace spelling (`data-adjust-*`) and the
   six attribute names before WP-ADJ-1 starts.
2. The validator currently reads `interaction.validator.parameters`,
   but `mtt_reagent_prep/protocol.yaml` writes `validator.value`.
   Resolve in WP-ADJ-2 by deciding which is canonical:
   (a) loader normalizes `value:` to `parameters:`, or (b) validator
   reads either. Either path is a one-line change; the choice should
   be explicit so future presets do not duplicate the ambiguity.
   This is a code-side decision, not a vocabulary edit, so it does
   not require user approval; flagging it so the WP-ADJ-2 author does
   not invent a third path.
3. Should cancel emit a `ProtocolShellEvent` for observability? The
   recommendation above is no (cancel is UI-only). If a future feature
   wants to log abandoned adjust attempts, that is a separate plan
   amendment, not part of this WP set.
4. Per-target set-point field discovery: today the YAML declares
   `value: { set_volume: 1000 }` inline, so the adjust panel can read
   the field name from the active interaction's validator parameters.
   No per-object set-point registry is needed for WP-ADJ-2 / WP-ADJ-3.
   If a future protocol needs the panel to render unit labels (e.g.
   `microliters`, `volts`), the unit string would come from the
   object's declared set-point family in OBJECT_VOCABULARY; that
   extension is out of scope here.
