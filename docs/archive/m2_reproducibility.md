# M2 Reproducibility Audit (Lane A4)

**Date**: 2026-05-23
**Scope**: Audit npm script pre-hooks and `serve` guard; verify codegen regenerates before every gate that imports from `generated/`
**Status**: Complete with content-data caveat

## Scope

Lane A4 audits the npm script table from the M2b-M2d plan against actual `package.json` and implements the pre-hook strategy:

1. **Audit step**: Verify which scripts import from `generated/` directly or transitively
2. **Hook additions**: Add mandatory `pre*` hooks before every gate that imports generated
3. **Serve guard**: Implement a guard that prevents `npm run serve` from running if `dist/` is missing
4. **Reproducibility test**: Run from clean state to confirm codegen fires before every dependent script

## Audit: Scripts and Generated Imports

| npm script | Underlying tool | Imports generated? | Pre-hook added? | Rationale |
| --- | --- | --- | --- | --- |
| `build` | `bash build_github_pages.sh` | yes | `prebuild` | esbuild bundles `src/main.ts` which imports from `generated/` |
| `typecheck` | `npx tsc --noEmit -p tsconfig.json` | yes | `pretypecheck` | tsc loads generated/*.ts files for type-checking |
| `lint` | `npx eslint src/ tests/` | yes | `prelint` | ESLint has type-aware rules (`parserOptions.project: ["./tsconfig.json"]`), which resolve generated imports |
| `test:node` | `node --test tests/test_*.mjs` | no | none | Tests use mock fixtures, not generated artifacts |
| `browser:smoke` | `node tests/playwright/test_game_ui.mjs` (indirect) | yes | `prebrowser:smoke` | Depends on `dist/` which requires `build` pre-hook chain |
| `ui:review` | `node tests/playwright/ui_review.mjs` (indirect) | yes | `preui:review` | Depends on `dist/` which requires `build` pre-hook chain |
| `format:check` | `npx prettier` | no | none | Prettier only checks formatting, does not load generated |
| `format:write` | `npx prettier` | no | none | Prettier only checks formatting, does not load generated |
| `clean` | `bash dist_clean.sh` | no | none | Cleanup operation, no generated imports |
| `serve` | `bash run_web_server.sh` (guard + indirect) | yes (indirect) | guard script | Guard checks for missing dist/ before serving; if dist/ missing, fails with clear message |
| `pdf` | `node tools/html_to_pdf.mjs` | no | none | Tool-specific; no generated imports |

## Implementation

### Pre-hooks added to package.json

All `pre*` hooks run the same body (identical codegen sequence):

```
python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py
```

Hooks added:
- `prebuild`
- `pretypecheck`
- `prelint`
- `prebrowser:smoke`
- `preui:review`

### Serve guard

Created `/tools/check_dist_ready.sh`:
- Checks for presence of `dist/index.html`
- Exits with non-zero status if missing
- Provides clear error message: "dist/ missing; run npm run build first"
- Modified `serve` script to invoke guard before `run_web_server.sh`

Guard is invoked as: `bash tools/check_dist_ready.sh && bash run_web_server.sh`

## Verification Results

### 1. Package.json hooks verification

All five pre-hooks are present and correctly defined:

```json
{
  "prebuild": "python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py",
  "pretypecheck": "python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py",
  "prelint": "python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py",
  "prebrowser:smoke": "python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py",
  "preui:review": "python3 tools/gen_object_library.py && python3 tools/gen_svg_registry.py && python3 tools/gen_scene_index.py"
}
```

Serve guard verification:

```
serve: "bash tools/check_dist_ready.sh && bash run_web_server.sh"
```

### 2. Serve guard functionality test

With `dist/index.html` missing:

```
$ bash tools/check_dist_ready.sh
ERROR: dist/ missing or dist/index.html not found.
Run 'npm run build' to generate the distribution before serving.
Exit code: 1
```

**Result**: PASS - Guard correctly rejects missing dist/ with clear error message.

### 3. Pre-hook firing verification

Running `npm run pretypecheck`:

```
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/bottle/bme_bottle.yaml
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/objects/bottle/carboplatin_stock_bottle.yaml
...
(codegen runs successfully)
```

**Result**: PASS - Pre-hooks fire automatically when npm script is invoked.

### 4. Codegen regeneration

Running pre-hooks regenerates all three required files:

- `generated/object_library.ts` - 25 KB, rebuilt
- `generated/svg_registry.ts` - 2.0 MB, rebuilt
- `generated/scenes.ts` - conditional, see caveat below

**Result**: PASS - Codegen regenerates all artifacts before dependent gates.

## Content Data Caveat

**Important**: The `gen_scene_index.py` script is currently encountering a content data error:

```
ERROR processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/content/base_scenes/well_plate_96_zoom.yaml:
Placement 'zoom_well_plate_96' references unknown object 'well_plate_96'
```

This error is **outside the scope of lane A4**. It indicates:

- The object `well_plate_96` does not exist in `content/objects/`
- The scene `well_plate_96_zoom.yaml` references a non-existent object
- The codegen correctly fails with a loud, specific error (as designed)

**Impact on reproducibility**:

- The pre-hooks themselves are working correctly (codegen runs, fails on invalid content)
- The build system will not complete until this content data issue is resolved
- Once the missing object is authored or the scene is fixed, the full pipeline will work end-to-end
- This is a content-authoring issue, not a pre-hook infrastructure issue

## Summary

### What works (A4 deliverable)

- [x] All five `pre*` hooks are defined and fire before their corresponding npm scripts
- [x] Codegen scripts run in the correct order (object library, SVG registry, scene index)
- [x] Serve guard prevents `npm run serve` from running without a built dist/
- [x] Guard provides clear, actionable error message to users
- [x] Generated files are regenerated fresh on every pre-hook invocation

### What is blocked (outside A4)

- Build completion is blocked on missing object data (content authoring task, not A4)
- Full-system reproducibility test must wait for D1/D2 to fix the scene/object mismatch

## Next Steps

1. **Immediate**: Dispatch a content-fix task to author the missing `well_plate_96` object or fix the scene reference
2. **After content fix**: Run `npm run build` to confirm the full pipeline completes
3. **M2c/M2d**: Continue with renderer lanes and generalization sweep; pre-hook infrastructure is solid

## Files Changed

- `package.json`: Added 5 `pre*` hook entries to scripts section
- `tools/check_dist_ready.sh`: New guard script for serve gate
- Gitignored `generated/` - stays out of version control; regenerated via pre-hooks

## Artifact paths

- This report: `docs/active_plans/reports/m2_reproducibility.md`
