# Plan stub: TypeScript migration to the three-vocabulary model

Status: stub. Owner: TBD. Depends on:
`content_yaml_migration_plan.md`.

## Purpose

Bring the TypeScript runtime in line with the three-vocabulary YAML
format produced by the content/scene-YAML migration. The canonical docs
already describe the format; the YAML migration converts the content
files; this plan changes the code that loads, validates, and renders
those files.

## Inputs

- The ratified canonical docs (already landed):
  - `OBJECT_VOCABULARY.md`
  - `OBJECT_YAML_FORMAT.md`
  - `SCENE_VOCABULARY.md`
  - `SCENE_YAML_FORMAT.md`
  - `PROTOCOL_VOCABULARY.md`
- The migrated content/ tree produced by
  `content_yaml_migration_plan.md`.

## Targets

- `src/asset_specs.ts` -- folded into object YAML by the YAML-migration
  plan; this plan deletes the TypeScript table and rewires every reader.
- `src/layout_engine.ts` -- consume object layout hints from object YAML
  instead of reaching into `asset_specs.ts`.
- `src/scene_runtime/` -- loader, contract, types, and the adapter
  registry: load object YAML and scene YAML separately, resolve object
  references, materialize state-field defaults.
- `tools/build_scene_data.py` -- update or replace the build script that
  currently validates the fused scene YAML; it must validate the new
  object and scene formats.
- Walker / dispatch code that reads the old object shape (scene
  walker, click dispatch, highlight subsystems).
- Renderer / scene-adapter code that owns SVG manipulation: implement
  `visual_states` resolution from declared `state_fields`; retire the
  protocol-side `SvgSwap` / `ColorChange` / `LiquidDisplayChange`
  paths in favor of `ObjectStateChange` writes.

## Scope

- TypeScript loader, runtime, and renderer changes.
- Updated build / validation tooling.
- Test updates (Playwright walkthroughs and any walker tests).

## Out of scope

- YAML rewrites (already done by the previous plan).
- New canonical docs.
- Adding new `scene_operation` primitives or new `state_field` types
  (each requires its own ratification per the cost guardrail).

## First risks

- The walker and dispatch code carry assumptions about the old fused
  shape; a partial migration leaves both shapes alive at once.
- `visual_states` formula evaluation needs a small closed token set per
  RD-7; the runtime must reject unknown tokens (build error) rather
  than silently fall back.
- Performance regressions on the 96-well plate if every well subpart
  carries its own state-field bag.

## Suggested entry milestone

M1: implement object loading, visual_states resolution, and the
`ObjectStateChange` writer for one small migrated scene end-to-end;
ship a Playwright walkthrough as evidence; only then fan out to the
larger scenes and to the dispatch / walker rewrite.

## References

- Preceding plan: `content_yaml_migration_plan.md`.
- Parent plan (close-out): `scene_object_split_plan.md`.
- Related: `docs_folder_organization_plan.md`.
