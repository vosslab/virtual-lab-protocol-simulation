# Scene migration follow-up debt (2026-05-09)

Tracked items surfaced during Plan A / Plan B / Plan C execution. Each item must
be resolved before the migration is honestly "closed."

## Schema debt from B10/B11 (must close before plan archive)

Both `bench.yaml` and `cell_culture_hood.yaml` carry these top-level keys after
the layout migration, but they pass through `SceneConfig`'s
`[key: string]: unknown` index signature without formal typing or validation:

| YAML key                      | Value shape                                              | Source                                 | Status                              |
| ----------------------------- | -------------------------------------------------------- | -------------------------------------- | ----------------------------------- |
| `sceneBounds`                 | `{left:number, right:number, top:number, bottom:number}` | `bench.yaml`, `cell_culture_hood.yaml` | undocumented; no validator coverage |
| `layoutRules.labelFontSize`   | `number`                                                 | both layout-engine YAMLs               | undocumented; no validator coverage |
| `layoutRules.labelLineHeight` | `number`                                                 | both layout-engine YAMLs               | undocumented; no validator coverage |
| `layoutRules.labelOffsetY`    | `number`                                                 | both layout-engine YAMLs               | undocumented; no validator coverage |

The reviewer's note was that "permissive but coherent" was wrong: the plan
promised explicit, validator-backed schema, not silent pass-through via the
index signature. These slots need one of three resolutions:

1. **Promote to formal optional fields** (preferred). Extend
   `tools/build_scene_data.py` validator, the `SceneConfig` / `SceneLayoutRules`
   types in `generated/scene_data.ts`, the validator pytest, and
   `docs/SCENE_YAML_FORMAT.md` to type them. Keep them optional so other scenes
   don't have to invent values.
2. **Remove from YAML** and relocate the constants into a runtime helper under
   `src/scenes/shared/`. Cheaper short-term, weaker long-term -- the layout
   audit (`docs/archive/scene_yaml_layout_audit_2026-05-09.md`) decided these
   are static-decl-YAML facts.
3. **Skip / xfail with named TODO** if neither (1) nor (2) lands before
   closeout.

Recommendation: option (1), as a single small "B12 schema tightening" patch
before Plan C archives.

## Architectural follow-ups from B10/B11 integration

The integrator handoff after the bench/hood collision flagged two cleanups
that are not blocking but should not be lost:

- `zones` is emitted as `SceneZone[]` (array) by `tools/build_scene_data.py`
  but `computeSceneLayout` requires `Record<string, ZoneDef>`. Both bench and
  hood adapters now convert array -> Record at the call site. Cleaner: emit
  the Record from the start, OR add a single `zonesToRecord(zones)` helper in
  `src/scenes/shared/` and route both adapters through it.
- `sceneBounds` is top-level on `SceneConfig` but is consumed inside the
  `SceneLayoutRules` shape that the layout engine takes. Adapters currently
  use `as any` casts to thread it. A typed merge helper (or relocating the
  field into `layoutRules`) would remove the cast.

These belong to the same B12 schema-tightening patch.

## Maintenance fix from cleanroom gate

The cleanroom gate (`bash dist_clean.sh && ...`) exposed a stale assumption in
`tests/playwright/build_game_if_missing.mjs`: it was looking for a legacy
`cell_culture_game.html` at repo root, but `export_single_file.sh` writes to
`dist-single/game.html`. Fixed by updating the helper to use the new path.

This was NOT part of B10/B11 scope. It is recorded as a separate "infra fix"
entry in the C5 closeout changelog.

## Process lessons

- **Parallel dispatch across shared territory is the bug.** B10 (bench) and
  B11 (hood) ran concurrently and both touched `src/scene_types.ts`,
  `src/layout_engine.ts`, `src/plate_config.ts`, `src/game_state.ts`, and
  `src/scenes/shared/scene_item_lookup.ts`. The result was a walker
  regression that an integrator had to repair. Future migrations: parallel
  dispatch is allowed only when there is true file-level isolation, not
  just directory isolation.
- **Schema is the shared file.** Any patch that wants to extend the schema
  must go through a separate, single-coder schema patch -- not parallel
  scene migrations.
- **`[key: string]: unknown` is debt, not a feature.** When new YAML fields
  slip through, schedule the typed-field follow-up in the same plan, not
  a future one.
