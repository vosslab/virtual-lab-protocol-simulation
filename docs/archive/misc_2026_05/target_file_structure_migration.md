# Target file-structure migration

## Purpose

Implementation sequencing for moving the repo from its current layout, described in `FILE_STRUCTURE.md`, to the steady-state layout described in `TARGET_FILE_STRUCTURE.md`. This doc tracks moves and order; it does not duplicate folder-purpose rationale.

## Moves

- `src/content/<protocol>/` -> `content/<protocol>/`.
- Scene YAML out of `src/scenes/` into `content/scenes/`.
- `src/scenes/` TypeScript -> `archive/code/scenes_legacy_<YYYY_MM>/` once `src/scene_runtime/` replaces it. `<YYYY_MM>` is the archival month (e.g., `scenes_legacy_2026_05`).
- Diagnostic protocol YAML used by tests -> `tests/content/dev_smoke/`.
- New `src/scene_runtime/` and `src/launcher/` introduced as authored TypeScript only.

## Coordination

Ordering within the broader refactor is owned by `scene_runtime_spine_plan.md` and [curriculum_decomposition.md](curriculum_decomposition.md). This doc only enumerates the moves; those plans schedule them.

## Closure

When all moves are complete:

- Fold the target layout into `FILE_STRUCTURE.md`.
- Archive `TARGET_FILE_STRUCTURE.md` under `docs/archive/`.
- Archive this migration doc under `docs/archive/`.
