# Plan stub: scene inheritance migration

Status: archived 2026-05-15. Content-side work shipped via the archived [content_yaml_migration_plan.md](content_yaml_migration_plan.md) M2 milestone:
2 base scenes (`hood_basic`, `bench_basic`) plus 6 inherited protocol
scenes authored under the ratified policy, validator green. Runtime
(`src/scene_runtime/`) and pipeline alignment now belongs to
[../active_plans/typescript_migration_plan.md](../active_plans/typescript_migration_plan.md).

## Context

The scene-inheritance policy was ratified in [../specs/SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md) on 2026-05-15. The policy defines a one-level inheritance model where base scenes live in `content/scenes/` and protocol scenes live in `content/protocols/<name>/scenes/` and extend base scenes using the four named operations: `add_placements`, `reposition_placements`, `deactivate_placements`, and `remove_placements`.

This migration plan owns the content-side work to reshape the folder layout, extract base scenes, convert per-protocol `scene.yaml` files to the `extends:` form, implement the static scene-graph validator, and update supporting pipelines.

## Current per-protocol scene.yaml files

The following files exist under `content/*/scene.yaml` and will be migrated:

```
content/plate_drug_treatment/scene.yaml
```

## Seed base scenes

These base scenes are named as stable workspace contracts per the promotion rule in [../specs/SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md):

- `bench_basic`
- `hood_basic`
- `plate_reader_basic`
- `microscope_workspace_basic`
- `well_plate_workspace_basic`
- `centrifuge_workspace_basic`

Seed base scenes will be promoted to `content/scenes/` and established as the stable workspace context shared across multiple protocols.

## Target folder layout

The migration produces this folder layout:

```
content/objects/<object_name>.yaml
content/scenes/{bench_basic,hood_basic,plate_reader_basic,...}.yaml
content/protocols/<protocol_name>/protocol.yaml
content/protocols/<protocol_name>/scenes/<scene_name>.yaml
content/protocols/<protocol_name>/contents.yaml
```

Each protocol may declare multiple protocol scene files under `content/protocols/<protocol_name>/scenes/`. Each scene file extends exactly one base scene.

## Deferred work

This plan will own the following work once it activates (gated on the validator landing):

- Extract object definitions from per-protocol scene files into `content/objects/`.
- Establish and promote base scenes from `content/scenes/` as stable workspace context.
- Convert every per-protocol scene file into `content/protocols/<protocol_name>/scenes/*.yaml` with `extends:` declarations.
- Implement the static scene-graph validator that enforces the one-level inheritance rule, closed schema, field inheritance table, and four named operations.
- Update the scene loader in `src/scene_runtime/` and the asset pipeline to consume the new layout.
- Update Playwright walkthroughs and asset pipelines to work with the new structure.

## Status

Migration is DEFERRED, gated on the static scene-graph validator landing. The ratified policy is published; content and code changes await validator implementation and integration. Until the migration lands, current per-protocol `scene.yaml` files remain valid; the spec describes the target contract, not the current state.

## Cross-references

- [../specs/SCENE_INHERITANCE.md](../specs/SCENE_INHERITANCE.md) -- the ratified scene-inheritance policy.
- [content_yaml_migration_plan.md](content_yaml_migration_plan.md) -- archived M3-closed plan that migrated all YAML content to the four-vocabulary model (protocol, object, scene, material).
- [../active_plans/typescript_migration_plan.md](../active_plans/typescript_migration_plan.md) -- follow-on plan for updating TypeScript runtime and tooling.
