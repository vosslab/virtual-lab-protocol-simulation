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

content/              authored protocol and scene YAML
  hood_flask_prep/
  cell_counting_and_seeding/
  drug_dilution_setup/
  plate_drug_treatment/
  mtt_assay_readout/
  cell_culture_full/
  scenes/             scene YAML, owned by content not src

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
- **Scene YAML lives in `content/scenes/`, not `src/scenes/`.** Scene declarations are authored configuration data, not runtime code. The runtime that consumes them lives in `src/scene_runtime/`.
- **Retired code goes in `archive/code/`, not `src/`.** Old code inside `src/` clutters refactor reviews and confuses readers about what is live. `archive/` is excluded from active development.
- **Permanent diagnostic YAML lives in `tests/content/dev_smoke/`.** It is test fixture data, not student-facing content, so it belongs under `tests/`.

## What must not go in src/

- YAML data files (protocols, scenes).
- Generated TypeScript or generated SVG modules.
- Retired code snapshots.
- Test fixtures.

## Relationship to FILE_STRUCTURE.md

[FILE_STRUCTURE.md](FILE_STRUCTURE.md) describes the repository as it exists today. [TARGET_FILE_STRUCTURE.md](TARGET_FILE_STRUCTURE.md) describes the desired steady-state layout. Once this layout becomes the current repository structure, fold this document into [FILE_STRUCTURE.md](FILE_STRUCTURE.md) and archive it.

## Out of scope

This document does not describe implementation sequencing, file moves, or temporary compatibility states. Those details belong in active planning docs.
