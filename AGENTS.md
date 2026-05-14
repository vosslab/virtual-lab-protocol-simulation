# AGENTS.md

This repo builds virtual lab protocol games. Treat the project as a protocol-authoring and simulation system.

## Required reading

Before making nontrivial edits, read:

- docs/PRIMARY_CONTRACT.md
- docs/REPO_STYLE.md
- docs/PYTHON_STYLE.md
- docs/MARKDOWN_STYLE.md
- docs/TYPESCRIPT_STYLE.md
- docs/PLAYWRIGHT_USAGE.md
- docs/SVG_PIPELINE.md

`PRIMARY_CONTRACT.md` wins over other docs and code. New contract items require user approval.

## Where to find things

- Repo map: docs/FILE_STRUCTURE.md
- Architecture: docs/CODE_ARCHITECTURE.md
- Scene system: docs/SCENE_ARCHITECTURE.md, docs/SCENE_VOCABULARY.md, docs/SCENE_YAML_FORMAT.md
- Protocol system: docs/PROTOCOL_AUTHORING_GUIDE.md, docs/PROTOCOL_VOCABULARY.md, docs/PROTOCOL_YAML_FORMAT.md
- Layout, liquids, and walkthroughs: docs/LAYOUT_ENGINE.md, docs/LIQUID_CONVENTION.md, docs/WALKTHROUGH_GUIDE.md
- Current work: docs/TODO.md, docs/ROADMAP.md, docs/active_plans/

## Project invariants

- Scene and protocol configuration live in YAML.
- Shared behavior and runtime systems live in TypeScript.
- Clickable scene objects are SVG-backed assets declared in YAML.
- Scene object layout is handled by the layout engine.
- Custom geometry is only for subparts inside structured scientific objects.
- Liquids are handled by the liquid convention.
- Large protocols are assembled from mini-protocols.
- A mini-protocol is scoped by its `learning:` block.
- A mini-protocol is complete only when the visible browser interaction works.
- src/scenes/ is frozen. See [docs/active_plans/SRC_SCENES_FREEZE.md](docs/active_plans/SRC_SCENES_FREEZE.md).

## Editing behavior

Make the requested change when the next safe step is clear. Prefer minimal edits and preserve the user's wording and document structure when possible.

When changing code, run focused tests on changed code. Document user-visible changes in docs/CHANGELOG.md.

## Python environment

Agents must run Python with `source source_me.sh && python3`.
On this user's macOS, Homebrew Python 3.12 modules are installed to `/opt/homebrew/lib/python3.12/site-packages/`.
