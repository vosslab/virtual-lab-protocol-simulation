# Primary design

This document explains the design philosophy for the virtual lab protocol simulation. The hard contract lives in `docs/PRIMARY_CONTRACT.md`. The technical specification lives in `docs/PRIMARY_SPEC.md`.

The core design goal is simple: a student should learn a lab protocol by seeing the correct objects, clicking the correct sequence, and watching the correct state changes happen on screen.

## Core idea

A mini-protocol is designed as a visible flow of interactions.

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

The YAML should then encode that flow using the two-level protocol model: a `protocol` with an `entry_step` and `steps`, each `step` carrying an ordered `sequence` of interactions and a `next_step` that names the step that runs next. Each `interaction` is one `gesture` on one `target`, with its own `validator` and `response`. The protocol vocabulary treats a step as one pedagogical unit whose `sequence` is the ordered list of interactions that complete it, each interaction naming the scene object it acts on and the scene operations its `response` causes. See [PROTOCOL_VOCABULARY.md](PROTOCOL_VOCABULARY.md) for the canonical model.

## Learning block

Each mini-protocol starts with a `learning:` block. This block defines the scope of the mini-protocol.

```yaml
learning:
  objectives: "Students completing this mini-protocol will have achieved..."
  outcomes: "Students completing this mini-protocol will be able to..."
  goals: "Overall, this mini-protocol aims to accomplish..."
```

## Protocol and mini-protocol hierarchy

A protocol is the complete student-facing lab pathway. It may span many scenes in sequence.

A mini-protocol is a focused subprotocol that teaches and verifies one smaller workflow. A mini-protocol usually runs in one scene, or across a small scene transition where the transition is part of the workflow.

Large protocols are assembled from mini-protocols so each part can be authored, tested, and walked independently.

A sequence runner is a protocol that connects mini-protocols in order to form a complete student-facing protocol.

A developer smoke protocol is a short diagnostic protocol used to check that a scene, object, or interaction still works. It is not a student-facing protocol and it is not a mini-protocol.

## Visible interaction standard

A mini-protocol is designed around what a student can see and do. The walkthrough must use the same visible UI path a student would use.

The walker may read generated protocol data to know the expected path, but it must not write game state, skip scenes, call internal APIs, or click hidden controls. If the walker cannot complete the mini-protocol through visible UI, the YAML, scene affordance, or runtime behavior is incomplete and must be fixed before the mini-protocol is considered complete.

## Semantic inheritance and composition

The system prefers semantic inheritance over scene-specific duplication.

Higher-level behaviors should inherit stable meaning from lower-level primitives rather than redefining behavior per scene, protocol, or UI structure. A protocol action inherits meaning from the primitive actions it composes. A scene implementation inherits behavioral guarantees from the protocol vocabulary it renders.

Inheritance in this repository is semantic first, not necessarily class-based. The architecture does not require TypeScript subclassing. The requirement is that derived concepts preserve the guarantees, constraints, and meaning of their parent concepts.

Composition is preferred over taxonomy explosion. New behavior should first be expressed as a composition of existing primitives before introducing a new primitive or top-level category.

A new primitive requires evidence that:

- existing primitives cannot express the behavior clearly,
- the behavior appears across multiple protocols or scenes,
- and the primitive defines a stable reusable semantic unit.

This repository treats primitives as durable vocabulary infrastructure, not short-term implementation conveniences.

## Source-code and content layout

Authored TypeScript source for the shared scene runtime lives under `src/scene_runtime/`. Generated protocol, scene, inventory, and registry data emits under `generated/` at the repo root. Generated files do not live under `src/`.

Curriculum content lives under `content/<protocol_name>/`. Developer smoke protocols live under `tests/content/dev_smoke/<name>_check/`. Smoke protocols use the same YAML schema, builder, and walker path as curriculum mini-protocols, but they are excluded from the student launcher, the full-protocol sequence, and the 6-to-10 step curriculum gate.

Legacy code that is retired during a refactor is archived at `archive/code/<name>_<YYYY_MM>/` at the repo root, not under `src/`. Keeping `src/` reserved for active source code prevents accidental imports of retired modules.

The `legacy_` filename prefix is a temporary marker used during refactors. It signals that a helper file is on a deletion or relocation path before the refactor closes. After the refactor closes, no `legacy_*` files remain under active source.

## Sequence runners and friendly terminology

The schema-level `protocolType` value `sequence_runner` is referred to in docs and student-facing content as the "full protocol runner" or simply "full protocol". The schema value stays stable; only the human-readable label changes.

