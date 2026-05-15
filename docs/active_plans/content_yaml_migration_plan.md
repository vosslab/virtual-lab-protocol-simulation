# Plan stub: content/scene-YAML migration

Status: stub. Owner: TBD. Depends on: scene_object_split plan close-out
(this stub is created by WP-DOC-C1 of `scene_object_split_plan.md`).

## Purpose

Migrate every existing scene YAML file into the three-vocabulary model
ratified by the scene_object_split plan. The new model splits authoring
into `protocol`, `object`, and `scene` vocabularies, each in its own YAML
file. Today object identity and spatial placement are fused in one scene
YAML; this plan rewrites those files into separate object definitions plus
cleaned scene-placement files.

## Inputs

The ratified canonical docs land before this plan starts:

- [OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md)
- [OBJECT_YAML_FORMAT.md](../specs/OBJECT_YAML_FORMAT.md)
- [SCENE_VOCABULARY.md](../specs/SCENE_VOCABULARY.md)
- [SCENE_YAML_FORMAT.md](../specs/SCENE_YAML_FORMAT.md)
- [PROTOCOL_VOCABULARY.md](../specs/PROTOCOL_VOCABULARY.md) (re-touched for
  `ObjectStateChange` and the `SvgSwap` / `ColorChange` /
  `LiquidDisplayChange` reclassification)

Supporting evidence:

- `docs/active_plans/scene_object_split_inventory.md` (decomposition
  matrices for current scene YAML files and `src/asset_specs.ts` entries).
- `docs/active_plans/scene_object_split_design.md` (working design doc).

## Targets

- Every file under `src/scenes/*/`. Note: `src/scenes/` is frozen per
  [SRC_SCENES_FREEZE.md](SRC_SCENES_FREEZE.md), so migrated output lands
  in the new `content/` layout (see first decision below), not in place.
- `content/plate_drug_treatment/scene.yaml` (the active content-side
  scene that stalled the runtime work).
- The `src/asset_specs.ts` entries fold into object YAML during this plan
  (TypeScript deletion is the second follow-on, not this plan).

## First decision: content/ folder layout

Object, scene, and protocol YAML files now live side-by-side. The
migration must split them into separate subdirectories so the three
vocabularies have a one-to-one mapping to folders. Proposed layout:

- `content/objects/` -- object definitions (one file per object family,
  or per-protocol overrides).
- `content/scenes/` -- scene placements that reference objects by id.
- `content/protocols/` -- protocol step / interaction YAML.

Open sub-decisions for the plan to settle up front:

- Per-protocol subfolders vs. flat shared object library, or a hybrid
  (shared library plus per-protocol overrides).
- Naming conventions for object ids vs. file names.
- How to express scene-level instance overrides (per RD-2: only `label`
  and layout hints).
- How to retire the fused-format `items[]` keys in old scene YAML files
  (delete vs. archive snapshot).

## Scope

- YAML rewrites only. No TypeScript edits.
- New object YAML files plus the content/ folder reshape.
- Migration-time validation by hand or by a temporary script under
  `tools/`; permanent loaders ship in the second follow-on plan.

## Out of scope

- Editing `src/asset_specs.ts`, `src/layout_engine.ts`, `src/scene_runtime/`,
  or `tools/build_scene_data.py`. That work belongs to
  [typescript_migration_plan.md](typescript_migration_plan.md).
- Editing `src/scenes/` (frozen).
- Adding new object capabilities or new state-field types.
- The docs/ folder reorganization (separate plan,
  [docs_folder_organization_plan.md](docs_folder_organization_plan.md)).

## First risks

- Hidden coupling between `src/asset_specs.ts` numeric metrics and
  hand-tuned scene placements: a clean object/scene split may surface
  layout regressions.
- The first migrated scene becomes the de-facto template; pick a small
  representative scene first (not the 96-well plate).
- The first follow-on (this plan) must finish before the TypeScript
  follow-on starts; partial migrations create two formats in flight.

## Suggested entry milestone

M1: pick the smallest current scene; migrate it end-to-end as the
template; document the per-object decomposition pattern; only then fan
out to the remaining scenes plus the 96-well plate.

## References

- Parent plan (close-out): [scene_object_split_plan.md](../archive/scene_object_split_plan.md).
- Following plan: [typescript_migration_plan.md](typescript_migration_plan.md).
- Related: [docs_folder_organization_plan.md](docs_folder_organization_plan.md).
