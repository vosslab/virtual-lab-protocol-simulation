# src/scenes/ freeze policy

The legacy scene runtime at [src/scenes/](../../src/scenes/) is **frozen**. It exists
only as legacy reference and emergency-compatibility support during the migration
to [src/scene_runtime/](../../src/scene_runtime/). It receives no new behavior, no
new features, and no growth.

This policy is actively enforced by
[tests/test_scenes_freeze_baseline.py](../../tests/test_scenes_freeze_baseline.py)
and complements the legacy banner gate
`tests/test_scenes_legacy_banner.py`
and the no-imports gate
`tests/test_scene_runtime_no_scenes_imports.py`.

## Why

Per [docs/PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md), shared behavior and runtime
systems must be generic. The legacy `src/scenes/` tree was developed around the
hood scene and carries per-adapter patches, hardcoded dispatch branches, and
scene-specific feature logic. Continuing to extend it would re-create the
drift the refactor is intended to remove and would prevent a clean cutover at
milestone M9.

See "Migration and compatibility policy" in
[docs/active_plans/2026_May_13-Fresh_Refactor_Plan.md](2026_May_13-Fresh_Refactor_Plan.md)
for the full milestone context.

## Allowed edits

Only the following mechanical, non-behavioral edits are allowed to files under
`src/scenes/`:

- **Mechanical rename.** Token-level renames required by the broader plan, for
  example replacing scene id `'hood'` with `'cell_culture_hood'`.
- **Type-union update.** Adjusting a literal type union to match a rename or to
  satisfy `tsc --noEmit` after a contract update elsewhere.
- **Legacy banner header.** The single-line header required by WP-SPINE-6:
  `// LEGACY: superseded by src/scene_runtime/*. Do not extend.`
  See `tests/test_scenes_legacy_banner.py`.
- **Compatibility shim that compiles.** Each shim must be the minimum code
  needed to keep the legacy tree compiling against an updated contract. Every
  shim must carry the marker `// COMPAT SHIM:` on or immediately above the
  shimmed code, plus a removal note (`remove by M9` is acceptable). See
  WP-CLEAN-2 in the refactor plan.

These rules follow [docs/REPO_STYLE.md](../REPO_STYLE.md) (long-term over
short-term, fix the design not the symptom) and the migration section of the
fresh refactor plan.

## Forbidden edits

The following edits are not allowed in `src/scenes/`, regardless of urgency:

- New scene-specific behavior of any kind.
- New hardcoded dispatch branches or `switch` arms for new step kinds,
  scene ids, or tool ids.
- New special-case handling for one scene, one tool, or one protocol.
- New feature logic. New features land in
  [src/scene_runtime/](../../src/scene_runtime/) and in declarative YAML, never
  in `src/scenes/`.
- Growth of existing scene files beyond the allowed edits above. The pytest
  baseline gate enforces a per-file line-count ceiling.

If a bug must be fixed before M9 and a runtime-side fix is not yet available,
prefer a small `// COMPAT SHIM:` rather than expanding logic. Document the
shim and its removal milestone in the shim comment.

## Replacement direction

All new scene runtime code lives in:

- [src/scene_runtime/](../../src/scene_runtime/) - generic runtime, contract
  types, loader, walker engine, subsystems (layout, dispatch, highlight,
  liquid).

All new declarative scene and protocol configuration lives in YAML under
[content/](../../content/):

- `content/<protocol_name>/protocol.yaml` - per-protocol step list and entry
  block.
- `content/objects/` - object definitions extracted from per-protocol content.
- `content/protocols/<protocol_name>/scenes/<scene_name>.yaml` - per-scene
  declarations (protocol-scoped, extending base scenes).
- `content/scenes/<scene_name>.yaml` - per-scene base declarations shared across
  protocols.

## Pointers

- Plan section: "Migration and compatibility policy" in
  [docs/active_plans/2026_May_13-Fresh_Refactor_Plan.md](2026_May_13-Fresh_Refactor_Plan.md).
- Contract: [docs/PRIMARY_CONTRACT.md](../PRIMARY_CONTRACT.md).
- Enforcement gates:
  - [tests/test_scenes_freeze_baseline.py](../../tests/test_scenes_freeze_baseline.py)
  - `tests/test_scene_runtime_no_scenes_imports.py`
  - `tests/test_scenes_legacy_banner.py`
