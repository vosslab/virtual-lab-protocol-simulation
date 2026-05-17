# Target file structure

## Purpose

This document defines the desired steady-state repository layout after the scene-runtime refactor. It is not an implementation checklist.

## Target top-level layout

```text
src/                  authored TypeScript and bundled web shell source
  scene_runtime/      shared scene runtime (driver, registry, capabilities)
  launcher/           pre-protocol launcher UI
  init.ts             bundle entry point
  protocol.ts         protocol data facade
  inventory.ts        inventory data facade

content/              authored protocol, scene, and object YAML
  objects/            reusable object definitions (grouped by `kind`)
    <kind>/           one folder per declared kind: bottle, equipment, decoration, pipette, rack, waste, flask, plate
      <object_name>.yaml
  base_scenes/        reusable base scene YAML
    <base_scene_name>.yaml
  protocols/          protocol packages, grouped into three closed topic clusters
    cell_culture/     mini-protocols for the OVCAR8 cell-culture / MTT workflow
      <protocol_name>/
        protocol.yaml
        materials.yaml      optional; per-protocol materials
        scenes/             optional; protocol-local scene overrides
          <scene_name>.yaml
    sdspage/          mini-protocols for the SDS-PAGE workflow
      <protocol_name>/
        protocol.yaml
    runners/          sequence runners (protocol_type: sequence_runner)
      <runner_name>/
        protocol.yaml
    (see "Protocol cluster layout" section below for the binding rule)

generated/            emitted build outputs only (gitignored)
  protocol_data.ts
  inventory_data.ts
  scene_data.ts
  svg_assets/

tests/                test code and test fixtures
  content/
    dev_smoke/        permanent diagnostic protocol YAML
  playwright/         browser-driven Playwright tests
  fixtures/           shared test fixtures

assets/               source SVGs and other binary inputs
  equipment/

docs/                 design docs, style guides, vocabularies
tools/                build scripts and codegen
archive/              retired code and closed historical material
  code/               retired TypeScript snapshots
dist/                 bundled HTML/JS build (gitignored)
dist-single/          portable single-file HTML build (gitignored)
```

## Folder ownership rules

- `src/` is authored TypeScript and the bundled web shell source (HTML fragments and CSS that ship with the bundle). No YAML, no generated data, no archived code.
- `content/` is authored protocol and scene YAML.
- `generated/` is the only emitted generated-code/data tree. Gitignored.
- `tests/` holds test code and test fixtures; `tests/content/dev_smoke/` is permanent diagnostic YAML, not student curriculum.
- `assets/` holds source SVGs and other binary inputs.
- `archive/code/` is the only home for retired TypeScript.
- `docs/`, `tools/`, `dist/`, `dist-single/` keep their conventional repo meanings.

## Rationale

- **Source / content / generated split.** Authored code, authored data, and emitted artifacts are three different kinds of input to the build. Separate top-level trees keep reviews focused, let `generated/` stay fully gitignored, and let authors edit `content/` without touching TypeScript.
- **Scene YAML lives in `content/base_scenes/`, not `src/scenes/`.** Scene declarations are authored configuration data, not runtime code. The runtime that consumes them lives in `src/scene_runtime/`.
- **Retired code goes in `archive/code/`, not `src/`.** Old code inside `src/` clutters refactor reviews and confuses readers about what is live. `archive/` is excluded from active development.
- **Permanent diagnostic YAML lives in `tests/content/dev_smoke/`.** It is test fixture data, not student-facing content, so it belongs under `tests/`.

## What must not go in src/

- YAML data files (protocols, scenes).
- Generated TypeScript or generated SVG modules.
- Retired code snapshots.
- Test fixtures.

## Protocol cluster layout

Every protocol under `content/protocols/` lives in one of three topic clusters. The rule body below
is the single canonical statement of the constraint. The pytest gate
`tests/test_protocol_folder_layout.py` enforces every clause and cites this section in each
assertion-failure message. Author-facing docs (`content/README.md`, `docs/FILE_STRUCTURE.md`) link
here for the binding rule; they do not restate it.

- **Closed cluster set.** Only three top-level subdirectories are permitted under
  `content/protocols/`: `cell_culture/`, `sdspage/`, `runners/`. Adding a fourth cluster requires a
  coordinated edit to this section and to the enforcement test; it cannot be added by editing YAML
  alone.
- **Exact-depth-one layout (permanent and intentional).** Every `protocol.yaml` lives at exactly
  `content/protocols/<cluster>/<name>/protocol.yaml`. Deeper nesting
  (`content/protocols/<cluster>/<group>/<name>/protocol.yaml`) is rejected even though marker-based
  discovery could resolve it. Rationale: flat-inside-cluster keeps the listing scannable and
  matches the `content/objects/<kind>/<name>.yaml` precedent.
- **One `protocol.yaml` per leaf.** Each `<cluster>/<name>/` directory contains exactly one
  `protocol.yaml`. Duplicates (partial merges, accidental copies, stray backups) are rejected. No
  loose `protocol.yaml` sits directly under `content/protocols/<cluster>/` -- it must always be one
  segment deeper.
- **`protocol_type` per cluster.** `cell_culture/<name>/protocol.yaml` and
  `sdspage/<name>/protocol.yaml` must declare `protocol_type: mini_protocol`.
  `runners/<name>/protocol.yaml` must declare `protocol_type: sequence_runner`. No other
  `protocol_type` value is permitted under `content/protocols/`; in particular, `dev_smoke`
  protocols belong under `tests/content/`, not here.
- **Folder name equals `protocol_name`.** The leaf folder basename equals the `protocol_name` field
  inside its `protocol.yaml`. Prevents identity drift where folder `foo/` carries
  `protocol_name: bar` and the tree stops being self-explanatory.
- **`protocol_name` unique across the tree.** Every `protocol.yaml` carries a `protocol_name`
  unique across all clusters. Guards against an author copying a folder and forgetting to rename
  the inner `protocol_name`, which would silently shadow another protocol at runtime.
- **Exactly one `materials.yaml` per protocol.** A `materials.yaml` lives as a sibling of exactly
  one `protocol.yaml`, or not at all. No floating materials files. No materials files shared
  across protocol leaves.
- **Exactly one `scenes/` directory per protocol.** A `scenes/` directory lives as a sibling of
  exactly one `protocol.yaml`, or not at all. Files inside are direct children only
  (`scenes/<scene>.yaml`); nested sub-directories (`scenes/<group>/<scene>.yaml`) are rejected.
  The protocol-local `content/protocols/<cluster>/<name>/scenes/` directory is intentionally a
  separate concept from the global `content/base_scenes/` directory: the former carries
  protocol-specific scene overrides, the latter carries reusable inherited bases.
- **Discovery round-trip invariant.** The public `discover_protocols()` entry point used by the
  build pipeline and walker tools must return exactly the set of `protocol_name` values present in
  the tree -- no missing entries, no invented entries. The enforcement test verifies this
  round-trip against the same public entry point that `pipeline/build_protocol_data.py` and
  `tools/run_protocol_walkthrough.py` call, so refactors of the underlying marker walk stay free as
  long as the public contract holds.

## Relationship to FILE_STRUCTURE.md

[../FILE_STRUCTURE.md](../FILE_STRUCTURE.md) describes the repository as it exists today. [TARGET_FILE_STRUCTURE.md](TARGET_FILE_STRUCTURE.md) describes the desired steady-state layout. Once this layout becomes the current repository structure, fold this document into [../FILE_STRUCTURE.md](../FILE_STRUCTURE.md) and archive it.

## Out of scope

This document does not describe implementation sequencing, file moves, or temporary compatibility states. Those details belong in active planning docs.
