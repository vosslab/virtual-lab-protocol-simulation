# Round 3 protocol validator / target matching audit (Workstream R7 P4)

Date: 2026-05-22
Owner: R7 P4 read-only audit
Plan ref: Round 3 pivot, R7 follow-up (validator and target string matching)
Source for failing observations: `docs/active_plans/reports/round3_runtime_interaction_smoke.md`

## Purpose

Round 3 R7 reported `clickWorks=fail` on 4 of 4 production-runtime-mounted
scenes. This audit traces how the emitted DOM target string is matched
against the expected protocol target string, documents every preset's
matching rule, cross-references the 4 failing protocols, and proposes a
fix shape. The audit is read-only: no edits under `src/`, `content/`,
`pipeline/`, or `generated/`.

## Files inspected

- `src/scene_runtime/dispatch/click.ts` (capture-phase click resolver)
- `src/scene_runtime/bundle/entry.ts` (validator / advance orchestration)
- `src/scene_runtime/render/scene.ts` (data-target-id emission per placement)
- `src/scene_runtime/adapters/well_plate/render.ts` (subpart and subpart-group emission)
- `src/scene_runtime/chrome/scene_frame.ts` and `src/scene_runtime/chrome/style.css` (chrome stack and pointer-events)
- `src/scene_runtime/types.ts` (canonical `RuntimeWorld` shape, in particular `objectStates` vs `objects`)
- `src/scene_runtime/loader/world.ts` (`getBaseObjectName`)
- `content/protocols/cell_culture/mtt_reagent_prep/protocol.yaml`
- `content/protocols/cell_culture/mtt_solubilization_readout/protocol.yaml`
- `content/protocols/sdspage/sdspage_attach_lid_and_leads/protocol.yaml`
- `content/protocols/sdspage/sdspage_heat_denature_samples/protocol.yaml`
- `tests/playwright/_temp_round3_interaction_smoke.mjs` (R7 smoke driver, untracked)

## Target string emission (DOM side)

`src/scene_runtime/render/scene.ts:259-267` (renderPlacement):

- For every placement, the parent `<g>` is given
  `data-target-id = placement.object_name` (bare object name; no
  dotted suffix). `pointer-events="auto"` is set on the group.
- The asset SVG or the green fallback rect is appended inside that
  group. Labels are emitted as siblings, not children, with
  `pointer-events: none`.

`src/scene_runtime/adapters/well_plate/render.ts`:

- Each cell rect is emitted with
  `data-target-id = "<object_name>.<cellName>"` (lines 244-245),
  where `cellName` is `A1` .. `H12`. Cells are full-bbox rects with
  `pointer-events: auto`. A circle marker sits underneath the rect
  with `pointer-events: none` and `data-well-circle` (not a target).
- Each subpart-group declared on the object emits a sibling `<g>` with
  `data-target-id = "<object_name>.<group_name>"` (lines 164-189). The
  group's bbox rect is invisible and `pointer-events="none"`.
- `data-target-id` is set on both the cell rect AND the parent
  placement group. The capture-phase listener walks the DOM up from
  the click target and uses `closest("[data-target-id]")`, which
  returns the nearest ancestor (the cell rect itself, since the cell
  has `data-target-id` directly on it). The parent-group-bare-name is
  thus never observed for well-plate clicks.

## Click dispatch (DOM -> InteractionEvent)

`src/scene_runtime/dispatch/click.ts:29-79`:

- Capture-phase listener on the scene viewport.
- Resolves target by walking up the DOM tree with
  `target.closest("[data-target-id]")`.
- Emits `{ targetId, gesture }` with `gesture` defaulting to "click"
  if `data-gesture` is absent or empty.
- No special handling of label nodes (labels carry
  `pointer-events: none`, so a click on label text never starts the
  walk; it passes through to whichever element is underneath, then
  walks up from there).

## Validator dispatch and matching logic

Validators in this repo are presets, not functions; the runtime
selects an outcome by inspecting `validator.preset`. Code lives in
`src/scene_runtime/bundle/entry.ts`.

### Interaction-level presets

- **`correct_target`** (default for click interactions). Matching:
  `isTargetSatisfied(expectedTarget, emittedTargetId, world)` at
  `entry.ts:528-584`. Two ways to pass:
  1. **Direct match.** `expectedTarget === emittedTargetId`
     (case-sensitive, no trim, no underscore/dash normalization).
  2. **Subpart-as-group.** Expected target `<obj>.<group>` matches
     emitted `<obj>.<subpart>` if the object's
     `structure.subpart_groups` contains a member whose `name ==
     group` AND whose `contains` array includes `subpart`. Both sides
     must have exactly one dot; deeper paths short-circuit to "no
     match". The object portion must match exactly.
- **`correct_choice`**: no code path in `entry.ts` reads this preset
  for interaction dispatch. Same dispatch path as `correct_target`
  (uses `isTargetSatisfied`). The choice payload, if any, would need
  to live in `validator.value` (target_with_value path).
- **`target_with_value`** (used by `adjust` gestures):
  `getExpectedValueFromValidator` and `getFieldNameFromValidator`
  (entry.ts:65-98) pull `validator.value` (e.g.
  `{ set_volume: 200 }`). The committed adjust-panel value is compared
  to that record's single key/value pair at entry.ts:430-437. No
  tolerance: exact `!==` mismatch is rejected silently with a
  `console.warn`.

### Step-level presets

- **`sequence_complete`** (entry.ts:116-119): pass if
  `world.currentInteractionIndex >= step.sequence.length`. There is
  no notion of in-order vs out-of-order completion at this layer;
  the step counts as complete when the index has advanced past the
  end of the sequence. The index only advances on successful
  validator pass per interaction, so order is implicit.
- **`final_state_matches`** (entry.ts:120-124): TODO stub. Currently
  returns `world.currentInteractionIndex >= step.sequence.length`
  (identical to `sequence_complete`). Comment at entry.ts:121 marks
  this as deferred for Pilot 1.

### Step completion flow

`entry.ts:840-911` is the click dispatch. On every click:

1. Read `step.sequence[currentInteractionIndex]`.
2. If `interaction.gesture !== "click"`, warn and bail.
3. Call `isTargetSatisfied(interaction.target, emittedTargetId, world)`.
4. If false, warn `Wrong target: expected "X", got "Y"` and return
   from the try block. The `finally` still re-orchestrates, but the
   index is NOT incremented and state is not mutated.
5. If true, apply every `scene_operation` in `interaction.response`,
   then `world.currentInteractionIndex++`, then re-render the scene.
6. `finally` runs `orchestrateNextInteractionWithCompletion`, which
   if the sequence is now complete runs the step validator and (if
   pass) renders the Next button. `activeStepIndex` is NOT advanced
   here; that happens only when the user clicks Next (entry.ts:222-272).

This is the key observation: **a successful click on a step's only
interaction advances `currentInteractionIndex` 0 -> 1 and surfaces a
Next button. It does NOT change `activeStepIndex` and (unless the
step's response contains a `SceneChange`) does NOT change
`activeSceneId`.**

## Per-scene expected target string

Resolved from each protocol's `entry_step` first interaction:

| Protocol | First step | First target | gesture | validator | First response op |
| --- | --- | --- | --- | --- | --- |
| `mtt_reagent_prep` | `pick_up_mtt_powder` | `mtt_powder_container` | click | `correct_target` | `CursorAttach` (no scene change, no state change) |
| `mtt_solubilization_readout` | (first step) | `micropipette` | click | `correct_target` | (per R7 log, leads with `micropipette` clicks; first state-changing op is in the `ObjectStateChange` validated by `target_with_value` adjust) |
| `sdspage_attach_lid_and_leads` | `secure_apparatus` | `electrophoresis_tank` | click | `correct_target` | `SceneChange` to `sdspage_attach_lid_and_leads_workspace`, then `ObjectStateChange lid_present: true` |
| `sdspage_heat_denature_samples` | `open_heat_block_lid` | `heat_block` | click | `correct_target` | `SceneChange` to `sdspage_heat_denature_samples_workspace`, then `ObjectStateChange lid_open: true` |

All four expected targets are bare object names (no dotted suffix).
The render path emits `data-target-id = placement.object_name` for
non-plate placements, so a click anywhere inside the placement group
walks up to the group and returns the bare object name. Direct match
is expected to succeed for all four cases.

## Suspected mismatch hypotheses

In priority order:

### H1 (most likely): R7 smoke driver reads the wrong state field

`tests/playwright/_temp_round3_interaction_smoke.mjs:80-86` builds
`objectStates` for the "before/after" diff by reading
`cfg.world.objects[k].state`. The canonical shape
(`src/scene_runtime/types.ts:280-285`) defines `world.objects` as
`Record<string, ObjectConfig>`; `ObjectConfig` has no `state`
property. Mutable state lives in `world.objectStates`, keyed by
object name (and `"<object_name>.<subpart>"` for well-plate cells).

Effect: `statesChanged` in the smoke is structurally always `false`
because every entry serializes to `"{}"` both before and after the
click. The smoke can only conclude `clickWorks=pass` via
`stepChanged` or `sceneChanged`.

`stepChanged` requires `activeStepIndex` to change, which (per the
dispatch flow above) requires a Next-button click that the smoke
never issues.

`sceneChanged` requires `activeSceneId` to change. For
`mtt_reagent_prep` the first response is `CursorAttach` (no scene
change), and for `mtt_solubilization_readout` the first step's
ops don't change scenes either. For `sdspage_attach_lid_and_leads`
and `sdspage_heat_denature_samples` the first response DOES include
a `SceneChange`, but the smoke's "drive to target scene" loop first
confirms `onTargetScene=true` (active scene == target scene)
BEFORE the click. The `SceneChange` in those response ops names
that same target scene, so even a successful `SceneChange` op is a
no-op on `activeSceneId` and `sceneChanged` stays false.

Combined: under H1 alone, all four `clickWorks=fail` rows are
expected false negatives of the smoke driver. The runtime advance
(`currentInteractionIndex` 0 -> 1) is real but invisible to the
smoke's three change detectors.

### H2: Step advancement requires the Next button

Per the dispatch trace, `activeStepIndex` only advances when the
user clicks the rendered Next button (entry.ts:222-272). The smoke
driver does not click Next; it only clicks the first target. Under
H2 (independent of H1) the smoke can never observe `stepChanged`,
since the test framework never advances the step. This is a
documented gap rather than a bug, but it compounds H1: removing the
H1 bug alone is insufficient unless the smoke also clicks Next or
the test detects `currentInteractionIndex` advances instead.

### H3 (real bug, scoped to one scene): chrome overlay intercepts the heat_block click

R7 reports that `sdspage_heat_denature_samples_workspace` times out
because `.scene-chrome` intercepts pointer events at the heat_block
asset's screen position. `.scene-chrome` is a column flex container
of `scene-viewport` (pointer-events: none) + `prompt-panel` +
`feedback-area` + next-button container. None of those siblings
override pointer-events, so any element drawn on top of the heat
block at the click coordinates by the chrome stack (most likely the
prompt-panel, feedback-area, or absolutely-positioned adjust-panel
container at entry.ts:822-827) will intercept. The
adjust-panel-container is `display: none` initially so it is not
guilty until adjust gestures start. The prompt-panel has
`max-height: 120px`, which under tall scene-bounds may overlap the
placement coordinates of `heat_block` when the SVG scales down.

This is a real positioning regression specific to that scene and
distinct from any validator-matching issue.

### H4 (low probability, not yet observed): subpart-as-group matching edge

`isTargetSatisfied` (entry.ts:528-584) correctly handles the
two-dot case `<obj>.<group>` vs `<obj>.<subpart>`. None of the four
failing protocols use plate subparts in their first interaction
(all four are bare object names), so this code path is not
exercised by the R7 fail set. Listing here as a known matching
shape worth re-checking when plate-target protocols come online,
not as a cause of the current four failures.

### H5 (rejected): Case / whitespace / underscore drift

Target strings on both sides are produced from the same
`placement.object_name` / `interaction.target` strings emitted by
the builder; no string normalization occurs in render or dispatch.
Direct string equality (`===`) is used in `isTargetSatisfied`.
Snake_case is preserved end to end. No evidence of drift in the
four sample protocols.

## Recommended fix shape

Fix priority:

1. **H1 (smoke driver, untracked):** patch
   `tests/playwright/_temp_round3_interaction_smoke.mjs` to read
   `cfg.world.objectStates[k]` instead of `cfg.world.objects[k].state`,
   AND additionally surface `currentInteractionIndex` in the snapshot
   so the smoke can pass on index advances. This is the cheapest
   change and turns the four false negatives into either real passes
   or, if a real bug remains, a sharper signal.
2. **H2 (smoke driver):** after `clickWorks` evaluation, click the
   rendered Next button when present, then re-snapshot to confirm
   the runtime really did move to the next step. The selector to use
   is whatever `renderNextButton` emits (likely a button inside
   `.next-button-container`); confirming this is a small Playwright
   change.
3. **H3 (real chrome stack regression, src/ change required):**
   ensure `.scene-chrome` siblings other than `scene-viewport` set
   `pointer-events: auto` on themselves only (they already do for
   their interactive controls), and that the chrome container does
   not visually overlap the scene viewport when scenes have tall
   scene-bounds. The minimal fix is to verify
   `flex-direction: column` plus the viewport's `flex: 1` actually
   keeps the prompt-panel below the viewport at the smoke's 1280x900
   viewport; if `min-height: 300px` on the viewport forces the
   prompt-panel under, then the scene SVG is fine and the click
   should land. The R7 report explicitly observes overlay at click
   time, so a Playwright `.boundingBox()` capture of
   `.scene-chrome` siblings versus the heat_block target rect would
   confirm the geometric overlap before any src/ edit.

No changes are recommended to `isTargetSatisfied` or any preset
implementation under this audit's evidence.

## Boundaries respected

- Read-only on production source. No edits under `src/`,
  `generated/`, `content/`, `pipeline/`.
- ASCII only.
- No `git commit`. No `git mv`.
- Reused existing R7 smoke artifact rather than re-running smoke.
