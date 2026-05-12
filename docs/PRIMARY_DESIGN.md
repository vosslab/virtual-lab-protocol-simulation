# Primary design

This document explains the design philosophy for the virtual lab protocol simulation. The hard contract lives in `docs/PRIMARY_CONTRACT.md`. The technical specification lives in `docs/PRIMARY_SPEC.md`.

The core design goal is simple: a student should learn a lab protocol by seeing the correct objects, clicking the correct sequence, and watching the correct state changes happen on screen.

## Core idea

A mini-protocol is a visible flow of interactions.

The protocol is not just a checklist. Each step should show the student:

1. what objects matter,
2. what object to click first,
3. what object receives the action,
4. what state changed,
5. what the next step is.

This is the flow-chart discipline: the author sketches the route through the protocol before implementing YAML or TypeScript.

## Flow before implementation

Before a mini-protocol is implemented, write a small flow sketch. The sketch may be a diagram or a table, but it must describe the click path and visible state changes.

The flow sketch is the design source for:

- the `learning:` block
- the protocol step chain
- visible scene objects
- click sequence
- expected state changes
- screenshot checkpoints
- transitions between steps

The YAML should then encode that flow using `completionPath.kind`, interaction metadata, `nextId`, and scene objects. The protocol vocabulary already treats a step as a completion path, and an `interactionSequence` as an ordered list of logical operations with click plans and state changes.

## Learning block

Each mini-protocol starts with a `learning:` block. This block defines the scope of the mini-protocol.

```yaml
learning:
  objectives: "Students completing this mini-protocol will have achieved..."
  outcomes: "Students completing this mini-protocol will be able to..."
  goals: "Overall, this mini-protocol aims to accomplish..."
```

