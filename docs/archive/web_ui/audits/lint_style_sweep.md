# Lint and style sweep

Date: 2026-05-27

Read-only audit. No fixes applied. No git operations. No npm install.

## 1. pyflakes (tests/test_pyflakes_code_lint.py)

- Exit code: 0
- Summary: 150 tests passed in 0.49s. No unused imports or pyflakes-class errors detected across the repo's Python sources.
- Top violations: none.

## 2. ASCII compliance (tests/test_ascii_compliance.py)

- Exit code: 0
- Summary: 1 test passed. All in-scope files conform to ASCII / ISO-8859-1 expectations.
- Top violations: none.

## 3. Markdown links (tests/test_markdown_links.py)

- Exit code: 1
- Summary: 1 test failed. 2 broken local Markdown link errors, both in a single file. Report written to REPO_ROOT/report_markdown_links.txt by the test harness.
- Violations (2 total, all in docs/FILE_STRUCTURE.md):
  1. docs/FILE_STRUCTURE.md:48  link `build_new_protocol_data.py` (`../pipeline/build_new_protocol_data.py`) target not found: pipeline/build_new_protocol_data.py
  2. docs/FILE_STRUCTURE.md:323 link `build_new_protocol_data.py` (`../pipeline/build_new_protocol_data.py`) target not found: pipeline/build_new_protocol_data.py

Note: both broken links share the same wrong relative target. The link uses `../pipeline/...` from inside `docs/`, but no `pipeline/` directory exists at the repo root (the build scripts live under `tools/`). This is a single underlying drift surfaced twice.

## 4. ESLint (npx eslint src/ tests/)

- Exit code: 1
- Summary: 16 problems, 16 errors, 0 warnings. All 16 errors are identical "Parsing error" failures from @typescript-eslint/parser refusing to parse files that are not listed in `parserOptions.project` (tsconfig include). This is a configuration drift, not source code drift: every offending file is a `.mjs` / `.js` walker, helper, or smoke test outside the TS project graph. No rule-level (no-explicit-any, no-unused-vars, etc.) findings were emitted because parsing aborted.
- Top 10 violations (parser project mismatch; all `0:0 error  Parsing error: "parserOptions.project" has been provided ...`):
  1. tests/playwright/e2e/protocol_walkthrough_yaml.mjs:0:0
  2. tests/playwright/e2e/walker_helpers.mjs:0:0
  3. tests/playwright/repo_root.mjs:0:0
  4. tests/playwright/test_bench_basic_render.mjs:0:0
  5. tests/playwright/test_generalization_render.mjs:0:0
  6. tests/playwright/test_interaction_attrs.mjs:0:0
  7. tests/playwright/test_viewport_sweep.mjs:0:0
  8. tests/playwright/walker/audit_all.mjs:0:0
  9. tests/playwright/walker/click_resolver.js:0:0
  10. tests/playwright/walker/engine.mjs:0:0

Remaining (not in top 10, same error class): tests/playwright/walker/index.js, tests/playwright/walker/run.mjs, tests/playwright/walker/screenshot.js, tests/test_generalization_preflight.mjs, tests/test_layout_engine.mjs, tests/test_structural_guards.mjs.

## 5. Prettier (npx prettier --check)

- Exit code: 0
- Summary: "All matched files use Prettier code style!" across `**/*.{ts,tsx,mts,cts,js,mjs,cjs}`.
- Top violations: none.

## 6. tsc (npx tsc --noEmit -p tsconfig.json)

- Exit code: 0
- Summary: No type errors. Empty stdout/stderr.
- Top violations: none.

## Aggregate verdict

drift-present

- Clean: pyflakes, ASCII, Prettier, tsc.
- Drift: Markdown links (2 dead links, same root cause, 1 file). ESLint config-drift (16 files outside TS project graph; 0 source rule violations).
- No source-code style drift in TypeScript or Python.

Status: drift-present
