# Protocol authoring guide

This guide walks a new author through writing a protocol for the Cell
Culture Game from scratch: the three YAML files, the validator, and the
real-UI walker. It uses the canonical vocabulary defined in
[PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md). Read that document
first; this guide assumes those terms.

Related references:

- [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md): canonical terms and
  the banned-synonyms table.
- [PROTOCOL_YAML_FORMAT.md](PROTOCOL_YAML_FORMAT.md): full schema for
  `items.yaml`, `reagents.yaml`, and `protocol.yaml`.
- [PROTOCOL_STEPS.md](PROTOCOL_STEPS.md): runtime step dispatch and
  completion flow.
- [tests/protocol_walkthrough_yaml.mjs](../tests/protocol_walkthrough_yaml.mjs):
  the YAML-driven UI walker (canonical real-UI regression test).

## What a protocol is

A protocol is a self-contained folder under `src/content/<protocol_name>/`
with three files:

```
src/content/<protocol_name>/
  items.yaml      # physical game items (pipettes, bottles, flasks, ...)
  reagents.yaml   # liquids and their colors
  protocol.yaml   # parts, days, and the ordered list of steps
```

A Python builder (`tools/build_protocol_data.py`) reads these files,
validates them, and emits two TypeScript modules (`protocol_data.ts`,
`inventory_data.ts`) that the browser bundle imports. No YAML is parsed
at runtime.

## Worked example: tutorial_split

The repo ships a 3-step tutorial protocol at
`src/content/tutorial_split/`. It is intentionally minimal: spray the
hood, wash a flask with PBS, repeat the wash. This guide uses it as the
worked example. You can open the live files alongside this guide.

### Step 1: write items.yaml

`items.yaml` declares every physical item the protocol references. Each
item has a unique snake_case id, a `label`, a `role` from the closed
set, a `scene`, and (for everything except `virtual` and `none` scenes)
an `asset` basename pointing at `assets/equipment/<asset>.svg`.

`src/content/tutorial_split/items.yaml`:

```yaml
items:
  # Hood items - pipettes and tools
  serological_pipette:
    label: "Serological pipette"
    role: transfer_tool
    asset: sero_pipette
    scene: hood
    liquidCapable: true
    capacityMl: 10
    allowedLiquids: [pbs]

  aspirating_pipette:
    label: "Aspirating pipette"
    role: aspirate_tool
    asset: aspirating_pipette
    scene: hood
    liquidCapable: true
    capacityMl: 10
    allowedLiquids: [media]

  # Hood items - culture and reagent containers
  flask:
    label: "T-75 Flask"
    role: cell_container
    asset: t75_flask
    scene: hood
    liquidCapable: true
    capacityMl: 20
    allowedLiquids: [media, pbs]

  # Hood items - reagent sources (bottles)
  pbs_bottle:
    label: "1x PBS"
    role: reagent_source
    asset: pbs_bottle
    scene: hood
    liquidCapable: true
    capacityMl: 500
    allowedLiquids: [pbs]
    contains: pbs

  ethanol_bottle:
    label: "70% Ethanol"
    role: reagent_source
    asset: ethanol_spray
    scene: hood
    liquidCapable: true
    capacityMl: 500
    allowedLiquids: [ethanol]
    contains: ethanol

  # Hood items - targets and waste
  waste_container:
    label: "Vacuum waste container"
    role: waste_target
    asset: waste_container
    scene: hood
```

Notes on this file:

- Tools (`serological_pipette`, `aspirating_pipette`) declare
  `liquidCapable: true`, a `capacityMl`, and `allowedLiquids` so the
  validator can check that any `liquid` you draw fits the tool.
- Reagent sources (`pbs_bottle`, `ethanol_bottle`) declare `contains`
  so the validator can confirm that a load interaction's `liquid`
  matches what the source actually holds.
- `hood_surface` is a `virtual_target` with `scene: virtual` and no
  asset; it is a clickable zone (the hood backdrop), not a sprite.
- Every item declared here must be referenced by at least one step
  (or carry `visualOnly: true`). The tutorial keeps the surface small
  and uses every item.

### Step 2: write reagents.yaml

`reagents.yaml` declares every liquid the protocol references. Each
reagent has a `label`, a `colorKey` (internal color role), and a
`displayColor` (lowercase ASCII hex).

`src/content/tutorial_split/reagents.yaml`:

```yaml
reagents:
  media:
    label: "Complete Media"
    colorKey: media
    displayColor: "#FFC0CB"

  pbs:
    label: "1x PBS"
    colorKey: pbs
    displayColor: "#87CEEB"

  ethanol:
    label: "70% Ethanol"
    colorKey: ethanol
    displayColor: "#E8E8E8"
```

Every reagent declared here must be referenced by at least one
interaction `liquid:` field or by an item `contains:` field. Dead
reagents fail the validator.

### Step 3: write protocol.yaml

`protocol.yaml` has three top-level blocks: `parts`, `days`, and
`steps`. Parts and days are organizational metadata for the UI. Steps
are the runnable units; their execution order is set by the `nextId`
linked-list pointer, not by array position.

`src/content/tutorial_split/protocol.yaml` (annotated):

```yaml
parts:
  - id: tutorial_part_1
    label: "Tutorial: Split Workflow"
    dayId: tutorial_day_1

days:
  - id: tutorial_day_1
    label: "Tutorial Day"

steps:
  # Step 1: a one-interaction step. The tool (ethanol_bottle) is
  # used directly via a direct tool interaction (no destination).
  # The interaction carries the completion event; the step trigger listens for it.
  - id: tutorial_spray_hood
    label: "Spray the hood with 70% ethanol"
    action: "Spray the hood with 70% ethanol"
    why: "Clean the hood before starting work to prevent contamination."
    partId: tutorial_part_1
    dayId: tutorial_day_1
    stepIndex: 1
    requiredItems: [ethanol_bottle]
    scene: hood
    errorHints:
      skipped: "Always spray the hood first."
    interactionSequence:
      - tool: ethanol_bottle
        completionEvent: spray_ethanol
    completionTrigger:
      scene: hood
      completionEvent: "click:spray_ethanol"
    nextId: tutorial_aspirate_media

  # Step 2: a two-interaction step (load then discharge). The first
  # interaction draws PBS into the pipette and records a stateChange.
  # The second interaction discharges into the flask and emits the
  # completion event. Only the final interaction carries it.
  - id: tutorial_aspirate_media
    label: "Add PBS to the flask"
    action: "Add PBS to the flask"
    why: "Rinsing with PBS prepares the flask for the next step."
    partId: tutorial_part_1
    dayId: tutorial_day_1
    stepIndex: 2
    requiredItems: [flask, pbs_bottle, serological_pipette]
    scene: hood
    errorHints:
      volume_off: "Use about 4 mL of PBS."
    interactionSequence:
      - tool: serological_pipette
        source: pbs_bottle
        liquid: pbs
        volumeMl: 4
        stateChange:
          heldLiquid:
            tool: serological_pipette
            liquid: pbs
            volumeMl: 4
            colorKey: pbs
      - tool: serological_pipette
        destination: flask
        liquid: pbs
        consumesVolumeMl: 4
        completionEvent: pbs_wash
    completionTrigger:
      scene: hood
      completionEvent: "click:pbs_wash"
    nextId: tutorial_final_wash

  # Step 3: same shape as step 2; nextId is null because this is the
  # final step in the protocol.
  - id: tutorial_final_wash
    label: "Final PBS rinse"
    action: "Add more PBS to complete the wash"
    why: "A second rinse ensures thorough cleaning."
    partId: tutorial_part_1
    dayId: tutorial_day_1
    stepIndex: 3
    requiredItems: [flask, pbs_bottle, serological_pipette]
    scene: hood
    errorHints:
      volume_off: "Use about 4 mL of PBS."
    interactionSequence:
      - tool: serological_pipette
        source: pbs_bottle
        liquid: pbs
        volumeMl: 4
        stateChange:
          heldLiquid:
            tool: serological_pipette
            liquid: pbs
            volumeMl: 4
            colorKey: pbs
      - tool: serological_pipette
        destination: flask
        liquid: pbs
        consumesVolumeMl: 4
        completionEvent: pbs_wash
    completionTrigger:
      scene: hood
      completionEvent: "click:pbs_wash"
    nextId: null
```

How the three step shapes break down:

- **Single discharge** (step 1): one interaction with `tool` plus
  `destination`. The completion event lives on that interaction.
- **Load then discharge** (steps 2 and 3): two interactions. The first
  has `tool` plus `source` plus `liquid` and records a `stateChange`.
  The second has `tool` plus `destination` plus `liquid` plus
  `consumesVolumeMl`. Only the second carries `completionEvent`.

In both shapes the click plan is tool-first: the tool is always the
first DOM element clicked.

## Per-step authoring checklist

Run through this checklist for every step you write. The validator
catches most of these, but checking by eye is faster than chasing a
build error.

- **Tool present.** Every interaction declares `tool`. If `source`,
  `destination`, `liquid`, or `stateChange` is set, `tool` is required.
- **Source present where required.** A load interaction (drawing
  liquid from a bottle or container) declares `source` and `liquid`.
- **Destination present where required.** A discharge interaction
  (adding liquid to a vessel, discarding to waste) declares `destination`,
  or no destination if this is a direct tool interaction (tool-only with
  `completionEvent`, no `source`).
- **Completion event on the final interaction only.** Each step has
  exactly one `completionEvent`, and it sits on the last interaction
  in `interactionSequence`. Setup or load interactions carry
  `stateChange` but not `completionEvent`.
- **Volumes consistent.** For each load that records `volumeMl`, the
  matching discharge `consumesVolumeMl` should equal that load (or
  sum to it across multiple discharges of the same held liquid).
  Neither value may exceed the tool's `capacityMl`.
- **Click plan is tool-first.** Always plan and write the tool as the
  first click for an interaction. Source-first or destination-first
  click models are not supported.
- **Referenced items and reagents exist.** Every id in `requiredItems`
  and every `tool`, `source`, `destination`, and `contains` value
  exists in `items.yaml`. Every `liquid` value exists in
  `reagents.yaml`.
- **No banned synonyms.** Do not use `actor`, `target`, `result`,
  `event`, `trigger`, `allowedInteractions`, `targetItems`, or
  `requiredAction`. Use the modern names: `tool`, `destination`,
  `stateChange`, `completionEvent`, `completionTrigger`,
  `interactionSequence`, `usedItems` (derived, not authored). The
  full ban list lives in
  [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md).

## Protocol audit tool

The protocol audit script
([tools/analyze_protocol_audit.py](../../tools/analyze_protocol_audit.py))
analyzes your protocol and reports completeness issues by comparing
`requiredItems` against the items derived from `interactionSequence`.

Run the audit to discover warnings and errors before building and walking:

```bash
# List available protocols
source source_me.sh && python3 tools/analyze_protocol_audit.py --list-protocols

# Audit a protocol
source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol cell_culture

# Exit non-zero if any WARN or ERROR is found (strict mode)
source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol cell_culture --strict
```

The audit reports four status levels:

- `[OK]` -- Step has an `interactionSequence` AND every `requiredItems`
  element appears in derived `usedItems`.
- `[INFO]` -- Step has no `interactionSequence`. The required-vs-used
  comparison does not apply (modal/direct/runtime flow).
- `[WARN]` -- Step has an `interactionSequence` BUT some `requiredItems`
  element is missing from derived `usedItems`.
- `[ERROR]` -- A missing item/reagent or an unused non-visual item.

## Auto-walker contract

The YAML-driven UI walker
([tests/protocol_walkthrough_yaml.mjs](../tests/protocol_walkthrough_yaml.mjs))
plays the protocol through the real DOM. For your protocol to walk
green, it must satisfy these six MUST-FOLLOW rules and the per-step
pass criteria below.

The six rules (mirrored from the walker header):

1. **Click the DOM, never the API.** Every state advance must come
   from a real click on a real element. The walker never pokes
   `gameState` or calls `completeStep()` directly.
2. **Fresh browser state, normal entry.** Each run starts with
   `localStorage.clear()`, a hard reload, and the welcome-screen
   start button. No back-channel boot.
3. **Wait for the UI, not for the clock.** The walker uses Playwright
   `waitFor*` predicates over fixed timeouts. Your step must reveal
   its progress through observable UI changes.
4. **Fail when the UI is broken.** Missing, hidden, or disabled items,
   or a wrong active scene, must fail with a clear message. The
   walker does not paper over broken UI.
5. **Capture evidence.** The walker writes per-step screenshots,
   collects console and network errors, and produces
   `playthrough_report.json`.
6. **Assert the ending.** A successful run requires every step
   completed, `wrongOrderClicks === 0`, `activeStepId === null`, and
   the final screen present.

Per-step pass criteria the walker enforces:

- The active scene matches `step.scene` before clicks begin.
- Every item the walker needs to click resolves to a single visible,
  enabled DOM element via `[data-item-id="<id>"]`.
- The interaction sequence executes in order. The first click of each
  interaction is the tool. Source or destination follows.
- The step's `completionTrigger` fires within the per-step budget
  (30 seconds). If no progress signal fires within the per-click
  budget (3 seconds), the walker fails the step with
  `click_did_not_advance`.
- The whole run finishes within 10 minutes. Otherwise the walker
  fails with `run_stalled`.

## Build and walk loop

Iterate on a protocol with this short loop. Stop at the first failure
and read the message; the validator and the walker both print
actionable diagnostics.

| Stage | Command | Purpose |
| --- | --- | --- |
| Audit | `source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol <name>` | Quick check: report [OK]/[INFO]/[WARN]/[ERROR] per step. |
| Validate | `source source_me.sh && python3 tools/build_protocol_data.py --validate-only --protocol <name>` | Run all schema and cross-file rules without writing TypeScript output. |
| Build | `source source_me.sh && python3 tools/build_protocol_data.py --protocol <name>` | Validate and emit `src/content/protocol_data.ts` and `src/content/inventory_data.ts`. |
| Walk | `source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol <name>` | Rebuild the bundle for `<name>`, launch Playwright, and play the protocol through the real DOM. |
| Wrong-order walk | `source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol <name> --wrong-order` | Variant that injects a wrong-order click before each correct sequence and asserts the soft-fail behavior. |

Defaults:

- `--protocol` defaults to `cell_culture` for both the builder and the
  walker. Pass an explicit protocol name when iterating on a different
  one.
- The walker restores the active protocol bundle when it finishes, so
  running it on `tutorial_split` does not leave the dev server
  serving the tutorial.

A typical iteration:

```bash
# 1. Edit src/content/<name>/{items,reagents,protocol}.yaml.

# 2. Quick audit: check required-vs-used consistency.
source source_me.sh && python3 tools/analyze_protocol_audit.py --protocol <name>

# 3. Fast schema check.
source source_me.sh && python3 tools/build_protocol_data.py --validate-only --protocol <name>

# 4. Build the TS bundle for that protocol.
source source_me.sh && python3 tools/build_protocol_data.py --protocol <name>

# 5. Walk the real UI (builds dist/ automatically).
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol <name>

# 6. Verify wrong-order soft-fail behavior.
source source_me.sh && python3 tools/run_protocol_walkthrough.py --protocol <name> --wrong-order
```

When all six pass (audit clean, schema valid, bundle built, walker green), the protocol is shippable.
