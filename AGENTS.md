# AGENTS.md

This repo builds virtual lab protocol games. Treat it as a protocol-authoring, object-authoring, scene-layout, and browser-simulation system.

## Required reading

Before nontrivial edits, read:

- `docs/PRIMARY_CONTRACT.md`
- `docs/PRIMARY_DESIGN.md`
- `docs/PRIMARY_SPEC.md`
- `docs/REPO_STYLE.md`
- `docs/MARKDOWN_STYLE.md`
- [docs/specs/SPEC_DESIGN_CHECKLIST.md](docs/specs/SPEC_DESIGN_CHECKLIST.md) (Author YAML vocabulary lock)

Read task-specific docs as needed:

- Python: `docs/PYTHON_STYLE.md`
- TypeScript: `docs/TYPESCRIPT_STYLE.md`
- Playwright / browser evidence: `docs/E2E_TESTS.md`, `docs/PLAYWRIGHT_USAGE.md`
- Claude hook behavior: `docs/CLAUDE_HOOK_USAGE_GUIDE.md`
- Spec and vocabulary work: `docs/specs/SPEC_DESIGN_CHECKLIST.md`, `docs/specs/`

`PRIMARY_CONTRACT.md` wins over every other doc and over code. New contract items require user approval.

## Core rules

- Scene and protocol configuration live in YAML.
- Shared runtime behavior lives in TypeScript.
- Large protocols are assembled from mini-protocols.
- A mini-protocol is scoped by its `learning:` block.
- A mini-protocol is complete only when the visible browser interaction works.
- Clickable lab objects are SVG-backed scene objects.
- Scene object layout is handled by the layout engine.
- Custom geometry is only for subparts inside structured scientific objects.
- Materials (liquids, mixtures, suspensions, waste): terms and classification in
  [docs/specs/MATERIAL_VOCABULARY.md](docs/specs/MATERIAL_VOCABULARY.md); render
  convention and color resolver in [docs/specs/MATERIAL_CONVENTION.md](docs/specs/MATERIAL_CONVENTION.md).
- Test data policy: content is the fixture; see
  [docs/specs/NO_FIXTURE_POLICY.md](docs/specs/NO_FIXTURE_POLICY.md).

These rules come from the primary contract and primary spec. See those files for the full authority and rationale.

## Pipeline vs tools (binding location rule)

Codegen and build-pipeline code lives in `pipeline/`. Developer utilities live in `tools/`. This is not negotiable and has been re-litigated multiple times; do not move it back or duplicate.

- `pipeline/` owns every script that emits to `generated/`, assembles bundles, or produces `dist/` artifacts. Examples: `gen_object_library.py`, `gen_protocols.py`, `gen_scene_index.py`, `gen_svg_manifest.py`, `build_main_bundle.mjs`, `list_protocols.py`, `scene_inheritance.py`.
- `tools/` owns developer-only helpers that do not appear in any build chain: smoke runners, SVG inspection, PDF/HTML utilities, CSS policy checks, contrast calculators, one-off review scripts.
- Do not write a new generator into `tools/`. Do not keep duplicate copies of a generator in both directories. Do not "archive" superseded pipeline files into `tools/` -- git history is the archive; delete them.
- If a script is unclear, ask: does it emit to `generated/` or `dist/`, or is it invoked by `package.json` scripts or `build_github_pages.sh`? Yes -> `pipeline/`. No -> `tools/`.
- When a new pipeline script is added, update `docs/FILE_STRUCTURE.md` and `docs/CODE_ARCHITECTURE.md` in the same patch.

## Where to find things

- Repo map: `docs/FILE_STRUCTURE.md`
- Technical architecture: `docs/CODE_ARCHITECTURE.md`
- Design philosophy: `docs/PRIMARY_DESIGN.md`
- Technical specification: `docs/PRIMARY_SPEC.md`
- Spec checklist: `docs/specs/SPEC_DESIGN_CHECKLIST.md`
- Current work: `docs/TODO.md`, `docs/ROADMAP.md`, `docs/active_plans/`

Specification surfaces live under `docs/specs/`:

- Protocol: `PROTOCOL_*`
- Scene: `SCENE_*`
- Object: `OBJECT_*`
- QTI reference: `QTI_v3_SPEC.md`
- Scene layout metrics and author scorecard: [docs/specs/SCENE_METRICS.md](docs/specs/SCENE_METRICS.md)

## Editing behavior

Make the requested change when the next safe step is clear. Prefer minimal edits. Preserve existing wording and structure unless the task is to rewrite.

For documentation changes:

- keep links valid
- run markdown and ASCII checks when relevant
- update `docs/CHANGELOG.md` for user-visible or structural changes

For code changes:

- run focused tests for changed code
- run browser evidence for interactive scene work
- do not mark a mini-protocol complete without visible UI evidence

## Vocabulary and spec work

Authoring vocabularies are closed surfaces. Authors compose existing terms; they do not invent new ones by editing YAML alone.

When editing specs, avoid escape hatches:

- open strings where an enum is possible
- free-form `metadata`, `config`, `options`, or `extras`
- arbitrary nested state
- hidden cross-layer behavior
- examples that introduce fields not defined in schema tables

Use `docs/specs/SPEC_DESIGN_CHECKLIST.md` for spec reviews.

## Python environment

On this user's macOS, Homebrew Python 3.12 modules are installed to: /opt/homebrew/lib/python3.12/site-packages/
