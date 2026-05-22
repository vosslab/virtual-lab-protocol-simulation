# Salvage contamination audit

Date: 2026-05-22
Auditor: forensic read-only review
Working directory: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation

## Verdict: CLEAN

No contamination. No broken archived or salvage layout code crept back into `src/scene_runtime/`.

## Findings by area

### salvage/ directory: not tracked in git

The entire `salvage/` folder is untracked (confirmed by `git ls-files salvage/` returning empty output; `git status` shows only `salvage/` files as `others`). Nothing in `salvage/` is imported by any production code. The folder contains:

- `salvage/normalize_svg.py`: standalone SVG normalization utility (parses viewBox, shifts coordinates, rewrites dimensions). Not layout code; not imported from anywhere in `src/`.
- `salvage/purge_inline_images.py`: strips base64-encoded image data from Markdown files. Not layout code.
- `salvage/render_migration_2026-05-09/`: 54 files with `.output`, `.diff`, and `.patch` extensions only. Agent transcript outputs, not code files. Confirmed by extension inventory.

The `salvage/` folder name is misleading: contains two utility scripts and agent transcript artifacts. No TypeScript layout engine code and no import path into the build pipeline.

### docs/archive/: documentation only, no code

`docs/archive/` contains 130+ files. File-extension scan found zero `.ts`, `.mjs`, `.js`, or `.py` files. All contents are `.md`, `.html`, `.txt`, `.json`, and `.png` files. Planning documents, evidence reports, decision records. No code in this tree.

### src/scene_runtime/layout/: current state is intentional

The current layout module has six files:

- `src/scene_runtime/layout/layout_engine.ts` (958 lines)
- `src/scene_runtime/layout/adapter.ts` (228 lines)
- `src/scene_runtime/layout/css_native_adapter.ts` (259 lines)
- `src/scene_runtime/layout/feature_flags.ts` (49 lines)
- `src/scene_runtime/layout/index.ts`
- `src/scene_runtime/layout/types.ts`

`layout_engine.ts` is explicitly self-described at line 1-20 as "mined from src/layout_engine.ts": the legacy `src/layout_engine.ts` was intentionally extracted into the module. The legacy root-level `src/layout_engine.ts` no longer exists as a tracked file (`git ls-files src/layout_engine.ts` returns empty). Extraction happened in commit `ff8c664` and has been maintained through subsequent commits. Not contamination: intentional architecture.

CSS-native adapter (`css_native_adapter.ts`) is gated behind `feature_flags.ts` with `CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT = false` hardcoded. Feature flag only activates for `well_plate_96_zoom_check_scene` scene ID and only when explicitly enabled. `feature_flags.ts` docstring states this is "Spike-only API. Must be removed or replaced before NEW1 promotion." Live spike code under development, not salvaged broken code.

### Search for contamination signatures

No functions or comments referencing "phase3_*", "archived", "salvage", "legacy" (as a quality marker rather than historical reference), or "deprecated" appear in the active layout module. The word "legacy" appears in comments only as a historical reference to the pre-extraction file path (`mined from src/layout_engine.ts`, `legacy line 61-65`): documentation of intentional refactoring, not contamination.

### Import path from src/main.ts to dist/

`src/main.ts` re-exports only from `./scene_runtime/bundle/entry.ts`. That entry imports from `../layout/feature_flags` (only the feature flag API, not the layout engine directly) and from `../render/scene`, `../dispatch/click`, and other runtime modules. The layout engine itself is invoked through `adapter.ts` by the render pipeline. No import path from `src/` reaches `salvage/` or `docs/archive/`.

### Git history: no restoration commits

Three most recent commits touching `src/scene_runtime/layout/`:

- `b24d031`: NEW2 prep-and-prototype round closure (content YAML, protocol files, layout module updates)
- `03a50dc`: Status report correction workstream (docs-heavy, CSS-native audit work, layout spike files)
- `4e2c709`: NEW3 Batch 5 Workstream F (visual polish pilot)

None of these commits show signs of restoring deleted code. The layout module's git log shows 4 commits total, all intentional forward-progress commits. Oldest commit in the layout module's history (`ff8c664`) is the original extraction from the legacy flat-file architecture.

## Note on salvage/ folder naming

The `salvage/` folder name implies archived/recovered code, but that is not what it contains. The two Python scripts (`normalize_svg.py`, `purge_inline_images.py`) are active utility scripts that happen to be placed in a folder called `salvage/`. The `render_migration_2026-05-09/` subfolder is purely agent transcript history. None of it feeds into the build pipeline. Misleading name is documentation debt, not a contamination risk.

## Status

DONE
