# Decision: select and type gestures ratified (WS-M5-ST)

## Summary

The repo owner authorized implementing the `select` and `type` gestures outside
the original Solid-renderer-migration plan (WS-M4). This work was tracked as
workstream WS-M5-ST.

## Decision

`select` and `type` are now fully implemented and supported by the walker.

- `select`: means "choose the correct next-step scene object among those present
  in the active scene." It reuses the visible click affordance (no separate
  answer-choice list UI is required). The `correct_choice` validator was
  redefined to target-equality: the selected item's `data-item-id` must match
  the expected target name.

- `type`: supported through the visible type-input affordance
  (`[data-type-input]` + `[data-type-commit]`) implemented in
  `src/shell/hud/type_input.tsx`. The affordance renders only while the active
  interaction's gesture is `type`. The walker fills the input and clicks Commit;
  the committed value routes to `step_machine.handle_type_commit` and is
  validated by the `target_with_value` preset.

## Deferred gestures

`adjust` and `drag` remain deferred. No visible set-point control or drag
surface exists in the host. The walker fails `unsupported_gesture` on protocols
that require either gesture. This is a host/scene/runtime extension task, not a
walker-branch task.

## Spec references

- `docs/PRIMARY_SPEC.md`: gesture value set, `select` and `type` descriptions,
  validator preset definitions (`correct_choice`, `target_with_value`).
- `docs/specs/PROTOCOL_VOCABULARY.md`: canonical gesture and validator terms.
