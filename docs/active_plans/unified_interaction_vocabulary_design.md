# Unified interaction vocabulary design

M2 working design doc for the unified interaction vocabulary plan
([unified_interaction_vocabulary_plan.md](unified_interaction_vocabulary_plan.md)).
Everything here is target-state: it describes the designed vocabulary, not the
code today. The evidence base is
[protocol_interaction_inventory.md](protocol_interaction_inventory.md).
Architectural philosophy: see "Semantic inheritance and composition" in
[../PRIMARY_DESIGN.md](../PRIMARY_DESIGN.md).

This is a first draft of the base only (WP-MOD1). The action class hierarchy
(WP-ACT1), pedagogy rule (WP-PED1), state and event model (WP-STA1), and
scene/protocol boundary (WP-BND1) are not yet written.

## The interaction primitive

An interaction is the smallest unit of a student doing something. It has a
`target` -- the scene object or control the student acts on -- and an
`action` -- what is done.

The base is deliberately minimal. A base action, evaluated against what the
student did, returns a boolean: was the correct action performed? The base
class carries nothing else. Effects, the action class hierarchy, modes, and
state changes all layer on top of this base; none of them are part of it.

## The boolean-return completion model

A base action returns `true` when the student performs it correctly,
otherwise `false`. (OQ-3, resolved.)

This is the whole completion mechanism. The runtime does not need a
per-interaction "completes the step" flag, and it does not derive completion
positionally. It asks the action. A step completes when its actions return
`true`.

Consequences:

- A `question` is correct when its action returns `true` for the right
  answer -- the same rule as everything else, not a special case.
- The iterative loop (for example SDS-PAGE destaining until the background is
  clear) needs no new construct: the action keeps returning `false` until the
  state condition is met, then returns `true`.
- "Wrong action" is just `false`. The runtime does not need a separate
  error/wrong-order kind at the base; richer feedback layers on above.

## Modes are layered, not in the base

The base action does not know `click` from `dial`. A mode describes how a
target receives the student's input; it is a property of the interaction
layered on top of the base, not part of the base class. (OQ-1: the base
class stays very basic.)

The initial modes:

- `click` -- the simple mode. The student clicks the target.
- `dial` -- the continuous, skill-based set-point mode. The student dials a
  value to a target set-point (a pipette volume, a voltage, a pH). This is
  the mode that keeps skill-based interactions from collapsing into a rote
  click.

A mode does not change the base contract: the action still returns a boolean.
`dial` returns `true` when the dialed value reaches the target set-point;
`click` returns `true` when the correct target is clicked. New modes can be
added later, and each must preserve the boolean-return contract.

## What is deliberately left unspecified here

The state-change model is not pinned down at the base. (OQ-2: the earlier
options over-specified it.) A correct action produces its effect; how that
effect is wired -- whether the action name implies it, or it is declared, or
something else -- is a layered concern for WP-STA1, not a property of the base
class. The base class is just: a target, and an action that returns a
boolean.

## Status

WP-MOD1 first draft. Target-state. Pending confirm-or-extend before WP-ACT1
builds the action class hierarchy on this base.
