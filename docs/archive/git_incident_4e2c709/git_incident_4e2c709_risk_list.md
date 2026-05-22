# Git Incident 4e2c709 - Risk List + TypeScript Audit (S6)

Date: 2026-05-21
Status: NEEDS_CONTEXT

## TypeScript production-source risk audit

3 new TS files reviewed. Zero `any` types, zero unchecked casts, zero `@ts-ignore` across all three.

### 1. src/scene_runtime/layout/css_native_adapter.ts (+242) - NEEDS_REVIEW

Type safety: clean. No any, no as any, no as unknown as, no @ts-ignore. All imports use `import type` for structural types (RuntimeWorld, ResolvedSceneConfig, PlacementConfig, ComputedItemLayout). All index accesses guarded:

- Line 59: world.scenes[scene_name] guarded by if (!scene) on line 60
- Line 148: world.objects[placement.object_name] guarded by if (!object_spec) on lines 149-152
- Line 105: region_map.get(region) fallback chain on lines 108-113

Module boundary: exports one function with full type signature. Single runtime import (increment_css_native_invocation_count) internal to layout module. No cross-module type leakage.

Strict-mode: passes analysis. All paths return ComputedItemLayout[] or throw. noUnusedLocals clean.

PRIMARY_CONTRACT item 3 tension: file lives in src/scene_runtime/layout/ (production source tree). Feature flag gate is in the caller (adapter.ts), not inside this function. Any future importer who forgets the flag check runs spike code in production unconditionally. File header notes "NEW1 spike code" and comments lines 162-166 forbid extension with gap math or per-scene solver logic. Design sound for spike; caller-enforced flag gate is convention dependency, not structural guarantee.

### 2. src/scene_runtime/layout/feature_flags.ts (+48) - NEEDS_REVIEW

Type safety: clean. All exports have explicit return types (boolean, void, number). boolean | null union is correct TypeScript.

Module-level mutable state: YES, intentional.

- feature_flags.ts:19 -- let css_native_well_plate_zoom_spike_override: boolean | null = null;
- feature_flags.ts:23 -- let css_native_invocation_count = 0;

Test-only setter (set_css_native_well_plate_zoom_spike_enabled_for_test) has JSDoc warning but no runtime guard. Test failing to call reset_css_native_invocation_count() or pass null to setter will leak overrides across test runs. File header states "Spike-only API. Must be removed or replaced before NEW1 promotion." Documented but not structurally enforced.

Flag default is false (compile-time constant). Production safe by default.

### 3. src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts (+55) - NEEDS_REVIEW

Type safety: clean. No any. Private function parameters correctly use \_itemId and \_ctx underscore-prefix to satisfy noUnusedParameters. Private functions missing explicit `: void` return type annotations - ESLint explicit-function-return-type: warn produces warnings, not errors.

well_plate_96_zoom.ts:47: adapter object literal is NOT typed as SceneAdapter. If interface adds or renames required field, this file silently stops conforming at compile time. Should be noted for promotion.

Module-load side effects on lines 20 and 57 (registeredEmitters.add, registerScene) intentional and match pattern used by other scene adapters. Comment block lines 13-19 explicitly documents silent-breakage risk if import chain changes.

Naming: all snake_case per TYPESCRIPT_STYLE.md. camelCase properties (sceneId, dispatchInteraction, render) required by SceneAdapter interface, explained in comment.

## Other risky files

### src/style.css (+8) - NEEDS_REVIEW

8 added lines add: `.scene-container.scene-mode--detail svg { max-width: 100%; max-height: 100%; width: auto; height: auto; overflow: hidden; }`. The `overflow: hidden` on SVGs in detail-mode containers is potential PRIMARY_DESIGN.md violation. Anti-pattern list explicitly states "Remove parent overflow: hidden where it clips assets." Requires visual verification that no well plate or scientific asset is clipped in well_plate_96_zoom_check scene.

### tests/test_canonical_scorecard_rule.py (+67) - SAFE

Workstream E scorecard guardrail test. Correct patterns throughout.

### tests/test_eslint_config_present.py (+74) - NEEDS_REVIEW

Useful infrastructure test but not specifically authorized in incident plan. Low risk.

### tests/test_package_json_schema.py (+99) - NEEDS_REVIEW

Tests package.json schema fields. Not specifically authorized. Low risk.

### tests/test_readme_first_paragraph.py (+268) - NEEDS_REVIEW

268-line README style conformance test. Not specifically authorized. Low risk.

### tests/test_tsconfig_canonical.py (+567) - NEEDS_REVIEW

567-line tsconfig field validator. Structurally sound. Very large for single test file. Not specifically authorized. Low risk.

### tests/playwright/spike\_\*.mjs (6 files, ~1900 lines) - NEEDS_REVIEW

All 6 use chromium.launch({ headless: true }) and ./repo_root.mjs (correct). Content is authorized workstream output bundled in unauthorized bulk commit. One structural concern: spike_css_native_well_plate_zoom.mjs lines 226-234 write temporary \_spike_host.html into experiments/css_native_layout/styles/ during test execution (deleted on line 346). Writing into experiments/ tree during tests is side effect outside test-results/ or /tmp/.

### package.json.template (+29) - NEEDS_REVIEW

Matches canonical repo shape. Not specifically authorized. Low risk.

### REPO_TYPE (+1) - SAFE

Content "typescript" correct for this repo.

### eslint.config.js (+40) - SAFE

Enables all canonical rules from TYPESCRIPT_STYLE.md. Correct parserOptions.project pointing to tsconfig.json. Correct ignores.

### devel/setup_typescript.sh (+28) - SAFE

Standard setup script pattern.

### tools/html_to_pdf.mjs (+93) - SAFE

Uses chromium.launch({ headless: true }) (correct). process.exit(1) for CLI errors acceptable for CLI entry point.

### docs/active_plans/new1_primary_contract_item3_amendment_draft.md (+138) - RISKY

Proposes two candidate amendments to PRIMARY_CONTRACT.md item 3. Correctly labeled "Draft. Not applied." But PRIMARY_CONTRACT.md requires explicit user approval for contract changes. Risk: future agent could treat Version A as pre-approved. Requires explicit user decision (Version A / Version B / reject both) before recommit.

### Large binary blobs (111 .pdf/.png files) - NEEDS_REVIEW

Valid evidence but bloats git history permanently. Decision on binary blob policy required before recommit.

### docs/CHANGELOG.md (+686) - SAFE

Legitimate changelog work following repo format.

### experiments/css_native_layout/stress_generators/generate_stress_scenes.py (+556) - NEEDS_REVIEW

Authorized content (Batch 4 generator) bundled in unauthorized commit. Located in experiments/ (correct). Low content risk.

## Summary tables

### By risk

| Risk         | Count |
| ------------ | ----- |
| SAFE         | 6     |
| NEEDS_REVIEW | 14    |
| RISKY        | 1     |

### By category

| Category                     | SAFE | NEEDS_REVIEW | RISKY |
| ---------------------------- | ---- | ------------ | ----- |
| TS production source         | 0    | 3            | 0     |
| CSS production               | 0    | 1            | 0     |
| Tests                        | 3    | 5            | 0     |
| Config / build               | 3    | 2            | 0     |
| Docs / plans                 | 0    | 2            | 1     |
| Generated artifacts (binary) | 0    | 1            | 0     |
| Other (CHANGELOG, REPO_TYPE) | 2    | 0            | 0     |

## Recovery sequencing implications

SAFE files - re-stage immediately after soft-reset: REPO_TYPE, eslint.config.js, devel/setup_typescript.sh, tools/html_to_pdf.mjs, tests/test_canonical_scorecard_rule.py, docs/CHANGELOG.md.

NEEDS_REVIEW files - hold for user review: all 3 TS production files (confirm spike-in-production architecture, mutable state intent, untyped adapter pattern); src/style.css (visual verification of overflow: hidden); 4 new Python test files (confirm authorization); 6 spike Playwright files (confirm all ready; note temp-file side effect); package.json.template (confirm authorization); 111 binary blobs (binary policy decision); generate_stress_scenes.py (confirm ready).

RISKY files - do not recommit without explicit user approval: docs/active_plans/new1_primary_contract_item3_amendment_draft.md requires explicit Version A / Version B / reject decision from user before file is recommitted.

## Handoff

Status: NEEDS_CONTEXT
TS files reviewed: 3 (all 3 expected)

Any TS file using `any` or unchecked casts:

- src/scene_runtime/layout/css_native_adapter.ts: NO
- src/scene_runtime/layout/feature_flags.ts: NO
- src/scenes/well_plate_96_zoom/well_plate_96_zoom.ts: NO

RISKY count: 1
SAFE count: 6
NEEDS_REVIEW count: 14
Blockers: None. No `any` casts, no broken module boundaries, no @ts-ignore across all three TS production files. The one RISKY file is docs-only draft requiring user decision. src/style.css overflow: hidden finding requires visual verification but not hard blocker.

Open question for S3: 111 binary blobs account for majority of +20424 lines in commit. User decision on binary blob policy will significantly affect recommit scope.
