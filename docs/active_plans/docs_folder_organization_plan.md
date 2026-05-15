# Plan stub: docs/ folder organization

Status: stub. Owner: TBD. Independent of the YAML and TypeScript
migration plans (separate light reorganization).

## Purpose

Make `docs/` easier to navigate while preserving stable repo-anchor
files that agents and scripts may already reference. Keep this work
separate from the vocabulary rewrite and the YAML / TypeScript
migrations -- mixing folder moves with content edits multiplies the
review surface and risks breaking `AGENTS.md` and script references.

## Inputs

- The current `docs/` tree.
- Every doc-to-doc Markdown link.
- Every `AGENTS.md` reference into `docs/`.
- Every script or active plan that names a file under `docs/`.

## Targets

The full target structure (copied verbatim from the parent
`scene_object_split_plan.md` "Follow-on plans" subsection):

```
docs/
  CHANGELOG.md
  ROADMAP.md
  TODO.md
  PRIMARY_CONTRACT.md
  PRIMARY_DESIGN.md
  PRIMARY_SPEC.md
  REPO_STYLE.md
  architecture/
  specs/
  protocols/
  active_plans/
  archive/
  images/
  superpowers/
```

Keep at root (repo-anchor docs; may be referenced by `AGENTS.md`,
scripts, plans, or agent instructions; moving them risks breaking
workflows):

- `CHANGELOG.md`
- `ROADMAP.md`
- `TODO.md`
- `PRIMARY_CONTRACT.md`
- `PRIMARY_DESIGN.md`
- `PRIMARY_SPEC.md`
- `REPO_STYLE.md`

Move into `docs/specs/`:

- `PROTOCOL_VOCABULARY.md`
- `SCENE_VOCABULARY.md`
- `OBJECT_VOCABULARY.md`
- `PROTOCOL_YAML_FORMAT.md`
- `SCENE_YAML_FORMAT.md`
- `OBJECT_YAML_FORMAT.md`
- `PROTOCOL_AUTHORING_GUIDE.md`
- `PROTOCOL_STEPS.md`
- `WALKTHROUGH_GUIDE.md`

Move into `docs/protocols/`:

- `OVCAR8_Carboplatin_Metformin_MTT_Protocol.md`
- `OVCAR8_MATH_REVIEW.md`
- `Miraculin_Protocol_2026.md`
- `SDS-PAGE_Protocol_2026.md`
- `VOSS_DILUTIONS_GUIDE.md`

Move into `docs/architecture/`:

- `CODE_ARCHITECTURE.md`
- `FILE_STRUCTURE.md`
- `TARGET_FILE_STRUCTURE.md`
- `SCENE_ARCHITECTURE.md`
- `LAYOUT_ENGINE.md`
- `LIQUID_CONVENTION.md`
- `SVG_PIPELINE.md`
- `SCALING_MODEL.md`
- `THIRD_PARTY_ASSETS.md`

Style and test docs (`MARKDOWN_STYLE.md`, `PYTHON_STYLE.md`,
`TYPESCRIPT_STYLE.md`, `PYTEST_STYLE.md`, `E2E_TESTS.md`,
`PLAYWRIGHT_USAGE.md`, `INSTALL.md`, `USAGE.md`, `AUTHORS.md`): may
stay at root for now or move later. Do not over-organize in the first
pass.

`QTI_v3_SPEC.md` should not remain as a large root-level doc; this
plan picks the destination (likely `docs/specs/` or `docs/archive/`).

## Plan rules

- Separate plan; not mixed into the vocabulary rewrite or the YAML /
  TypeScript migrations.
- First inventory all doc-to-doc links and every `AGENTS.md` reference
  (and any script or plan reference) that would be affected.
- Move files in one controlled patch using `git mv`.
- Update every relative link in the same patch.
- Run ASCII and markdown-link checks on the result.
- Keep root-level repo-anchor docs stable unless there is a strong
  reason to move them.

## First decision and risk

- First decision: confirm the target subfolders match agent /
  workflow expectations before any move. `AGENTS.md` and CLAUDE.md
  reference doc paths today; an unannounced move silently breaks
  agent setup.
- First risk: a missed reference leaves a dead link in `AGENTS.md`,
  in a script, or in an active plan. Mitigation: the inventory pass
  is strict; the move patch is rejected if any reference is left
  behind.

## Out of scope

- Editing doc content (this plan only moves files and updates
  links).
- Reorganizing `docs/active_plans/` or `docs/archive/` internals.
- Renaming files (only relocation; rename work is its own plan).

## References

- Parent plan: [scene_object_split_plan.md](../archive/scene_object_split_plan.md)
  (the "Follow-on plans" subsection is the source of the target
  structure copied above).
- Related: [content_yaml_migration_plan.md](content_yaml_migration_plan.md),
  [typescript_migration_plan.md](typescript_migration_plan.md).
