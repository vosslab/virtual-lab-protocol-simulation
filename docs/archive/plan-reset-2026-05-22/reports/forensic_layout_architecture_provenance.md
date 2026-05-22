# Forensic layout architecture provenance audit

Date: 2026-05-22
Auditor: forensic read-only review
Working directory: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation

## Summary verdict

User suspicion REFUTED. `src/scene_runtime/` was NOT populated from broken salvage or from `experiments/css_native_layout/`. The zone-based layout engine was mined verbatim from `src/layout_engine.ts`, a production-quality file with commit history back to `41a236d` (2026-05-05). Three architectural concerns are flagged below.

## 1. Subsystem classification

| File | Classification | Notes |
| --- | --- | --- |
| `src/scene_runtime/layout/layout_engine.ts` | production-runtime, mined-verbatim | Mined from `src/layout_engine.ts` (commit `ff8c664`, 2026-05-17); 8 functions listed in header |
| `src/scene_runtime/layout/adapter.ts` | production-runtime | Bridges RuntimeWorld to legacy engine; ESLint suppressions present |
| `src/scene_runtime/layout/types.ts` | production-runtime | Type definitions; clean |
| `src/scene_runtime/layout/index.ts` | production-runtime | Barrel; exports adapter as primary surface; re-exports mined engine as `computeSceneLayoutLegacy` |
| `src/scene_runtime/layout/feature_flags.ts` | spike-gate / diagnostic | Spike default `false`; production never enables CSS-native path |
| `src/scene_runtime/layout/css_native_adapter.ts` | spike / dead-code | Created `4e2c709` (2026-05-21); header line 9 states "Must be removed or replaced before NEW1 promotion"; ships in bundle but never called at runtime |
| `src/scene_runtime/render/scene.ts` | production-runtime | Calls `computeSceneLayout` from adapter; primary render entry |
| `src/scene_runtime/render/apply.ts` | production-runtime | Applies computed layout to DOM |
| `src/scene_runtime/render/svg_loader.ts` | production-runtime | SVG fetch and inject |
| `src/scene_runtime/render/clock.ts` | production-runtime | TimedWait primitive |
| `src/scene_runtime/loader/world.ts` | production-runtime | Assembles RuntimeWorld from generated data |
| `src/scene_runtime/loader/protocol.ts` | production-runtime | Protocol loader |
| `src/scene_runtime/loader/scene.ts` | production-runtime | Scene loader |
| `src/scene_runtime/loader/object.ts` | production-runtime | Object loader |
| `src/scene_runtime/loader/index.ts` | production-runtime | Loader barrel |
| `src/scene_runtime/bundle/entry.ts` | production-runtime | IIFE + ESM entry; exports `loadAndMountByProtocolName`, `mountRuntime` |
| `src/scene_runtime/types.ts` | production-runtime | Shared runtime types |
| `src/scene_runtime/contract.ts` | production-runtime | Scene contract interface |
| `src/scene_runtime/dispatch/click.ts` | production-runtime | Click gesture dispatch |
| `src/scene_runtime/dispatch/adjust.ts` | production-runtime | Adjust gesture dispatch |
| `src/scene_runtime/chrome/` (6 files) | production-runtime | UI chrome: prompt, feedback, next button, scene frame, adjust panel, CSS |
| `src/scene_runtime/adapters/well_plate/` (2 files) | production-runtime | Well plate subpart adapter; placed by layout engine |
| `src/main.ts` | production-runtime (shim) | Single line re-export: `export * from "./scene_runtime/bundle/entry.js"` |
| `salvage/normalize_svg.py` | standalone utility | SVG normalization CLI; no layout code; not imported anywhere |
| `salvage/purge_inline_images.py` | standalone utility | Image stripping CLI; not imported anywhere |
| `salvage/render_migration_2026-05-09/` | agent-transcript archive | `.output` files and `.diff`/`.patch` text; zero `.ts` source files |
| `experiments/css_native_layout/` | experimental / isolated | Self-declared "No imports from src/"; reverse direction also clean; not contract-compliant |

## 2. Import call graph (production path to dist/)

```
dist/main.js  <-- src/main.ts
  -> src/scene_runtime/bundle/entry.ts
       -> src/scene_runtime/loader/world.ts
       -> src/scene_runtime/render/scene.ts
            -> src/scene_runtime/layout/index.ts  (barrel)
                 -> src/scene_runtime/layout/adapter.ts  (primary export: computeSceneLayout)
                      -> src/scene_runtime/layout/layout_engine.ts  (legacyComputeLayout)
                      -> src/scene_runtime/layout/css_native_adapter.ts  (spike; never called)
                      -> src/scene_runtime/layout/feature_flags.ts  (gate: always false)
       -> src/scene_runtime/chrome/*
       -> src/scene_runtime/dispatch/*
       -> src/scene_runtime/adapters/well_plate/*

dist/runtime.bundle.js  <-- src/scene_runtime/bundle/entry.ts  (same tree)
```

`generated/protocol_data`, `generated/scene_data`, `generated/object_data` are dynamic imports inside `entry.ts`; resolved at bundle time by esbuild.

## 3. Orphan analysis (files never imported)

Within `src/scene_runtime/`, all files are reachable from `entry.ts` directly or transitively, with one exception:

- `src/scene_runtime/layout/layout_engine.ts` exports `computeRowSlotSceneLayout` (lines 700-799). Re-exported by `index.ts` but not called anywhere in the render path. Exported for testing/documentation only (comment in `index.ts` line 14). Not dead at the module level, but wired to nothing at runtime.

`salvage/normalize_svg.py` and `salvage/purge_inline_images.py` are standalone CLIs; they import nothing from `src/` and nothing imports them.

## 4. Salvage-pattern matches

Checked: do any functions or comment signatures in `src/scene_runtime/layout/layout_engine.ts` match the salvage archive?

Result: NO MATCH.

- `salvage/render_migration_2026-05-09/` contains only agent `.output` transcript text, `broken_worktree.diff`, `headless_docs.patch`, and `restore_code.patch`. Zero TypeScript source files. No layout engine functions.
- `salvage/normalize_svg.py` and `salvage/purge_inline_images.py` are Python SVG utilities with no overlap to the layout engine.
- `layout_engine.ts` header (lines 2-19) states the provenance explicitly: "mined from `src/layout_engine.ts`" with 8 functions and their legacy line numbers.
- `src/layout_engine.ts` itself originated in commit `41a236d` (2026-05-05, "Lifted all 33 files from `parts/`"). Active production file until deleted in `b24d031` (2026-05-22). The mine happened in `ff8c664` (2026-05-17).

## 5. Experiments isolation check

`experiments/css_native_layout/README.md` line 29: "No imports from `src/`."

Reverse direction check (`src/` importing from `experiments/`):

- `css_native_adapter.ts` was authored fresh in commit `4e2c709` (2026-05-21). Does not import from `experiments/css_native_layout/`. Imports only `feature_flags.ts` (same layout package).
- `git ls-files src/` shows zero files containing any `experiments/` import path.

Isolation confirmed bidirectionally. `experiments/css_native_layout/` and `src/scene_runtime/` are completely independent trees.

## 6. Provenance chain for layout_engine.ts

```
2026-05-05  41a236d  "Lifted all 33 files from parts/"
              -> src/layout_engine.ts created (production zone-based engine)

2026-05-17  ff8c664  "Stepper Part 1..."
              -> src/scene_runtime/layout/layout_engine.ts created
              -> header explicitly states "mined verbatim" from src/layout_engine.ts
              -> 8 functions with source line numbers documented

2026-05-21  4e2c709  "NEW3 Batch 5 Workstream F..."
              -> src/scene_runtime/layout/css_native_adapter.ts created (NEW1 spike)
              -> feature-flagged off; header says "remove before promotion"

2026-05-22  b24d031  "NEW2 prep-and-prototype round closure"
              -> src/layout_engine.ts deleted (original source)
              -> src/scenes/*.ts deleted (frozen legacy scenes)
              -> src/scene_runtime/layout/ remains as sole layout implementation
```

## 7. Architectural concerns

### Concern 1: css_native_adapter.ts ships in every bundle as dead code

`css_native_adapter.ts` is imported unconditionally by `adapter.ts` (line 30). Feature flag gate at `adapter.ts:65-75` is `if (sceneId === "well_plate_96_zoom_check_scene" && is_css_native_well_plate_zoom_spike_enabled())`. Flag default is `false`. Result: every production bundle includes the CSS-native spike code even though it is never called. File's own header (line 9) says "Must be removed or replaced before NEW1 promotion." Current state: not removed.

Severity: low (no behavior impact; minor bundle size; ship risk if flag is ever enabled accidentally).

### Concern 2: adapter.ts carries broad ESLint suppressions

`adapter.ts` line 1 suppresses three rules: `no-explicit-any`, `no-unsafe-assignment`, `no-unsafe-member-access`. Suppressions cover the entire file. Exist because builder-generated YAML structures have flexible schemas. Acknowledged in the file comment but means the adapter is effectively untyped at its boundaries.

Severity: medium (type safety gap at the YAML-to-layout boundary; future schema changes will not be caught by tsc).

### Concern 3: computeRowSlotSceneLayout exported but not wired

`layout_engine.ts` contains `computeRowSlotSceneLayout` (approximately lines 700-799), re-exported by `index.ts` as a named export. Not called in `adapter.ts`, `render/scene.ts`, or any other production path file. Exists as a potential alternate layout strategy. No documented plan for when or whether it will be connected.

Severity: low (no runtime impact; mild dead-code concern; could mislead future contributors).

## 8. Final status

DONE_WITH_CONCERNS

User suspicion REFUTED. `src/scene_runtime/layout/layout_engine.ts` was mined from `src/layout_engine.ts` (a production-quality, historically active zone-based engine first committed 2026-05-05). Was not sourced from salvage (which contains only agent transcripts and two standalone Python utilities) and was not sourced from `experiments/css_native_layout/` (which is fully isolated bidirectionally and explicitly not contract-compliant). Three concerns flagged above; none are blocking, but Concern 1 (dead spike code in bundle) and Concern 2 (broad type suppression in adapter) warrant attention before any future layout changes.
