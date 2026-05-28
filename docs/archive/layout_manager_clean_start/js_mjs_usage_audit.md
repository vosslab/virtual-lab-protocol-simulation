# JS/MJS usage audit

Date: 2026-05-22
Scope: Lane F of the layout-manager-clean-start onboarding. Documentation only.
Source: read-only inspection of every `.mjs` and `.js` file under
`experiments/css_native_layout/`, `tests/playwright/`, and `tools/` at HEAD.

This doc maps each script to a category and a productionization
recommendation so the next manager can tell at a glance what is shipping,
what is diagnostic, what is throwaway, and what is general utility.

## 1. Methodology

1. Enumerated every `.mjs` and `.js` file under the three target trees with
   `find <root> -type f \( -name "*.mjs" -o -name "*.js" \)`.
2. Read each script header (first ~60 to ~100 lines) to capture purpose,
   inputs, outputs, dependencies, and coupling to `src/` or `dist/`.
3. Cross-referenced each script via `git ls-files | xargs grep -l <name>`
   to find callers in shell scripts, Python wrappers, `package.json`
   scripts, and other JS/MJS modules.
4. Checked `.gitignore` for tracked-vs-untracked status of each script.
5. Read root-level shell scripts (`check_codebase.sh`,
   `build_github_pages.sh`, `dist_clean.sh`, `run_web_server.sh`) and
   `package.json` to confirm which scripts sit on a CI/build path.
6. Read experiment-local wrapper scripts
   (`experiments/css_native_layout/run_precheck.sh`,
   `experiments/css_native_layout/run_built_app_precheck.sh`,
   `tools/svg_picker/serve_picker.sh`).

A script is considered "on a CI path" if `check_codebase.sh` runs it
directly or through a `package.json` script. None of the audited scripts
sit on the CI gate; `check_codebase.sh` only invokes `tsc`, `eslint`,
`prettier`, and `node --test tests/test_*.mjs`.

A script is considered "tracked" if it appears in `git ls-files`. Some
diagnostic scripts under `experiments/css_native_layout/stress_generators/`
and the two probes are untracked per `.gitignore` lines 61-72 (only `.py`
allowed under `stress_generators/`, only `.mjs` and `.json` whitelisted
under `no_crop_audit/`; `capture.mjs` and `well_plate_rect_probe/probe.mjs`
fall through to the default `experiments/css_native_layout/*` ignore).

## 2. Category summary

Categories used in this doc:

- experiment runtime: feeds a render or measurement loop the experiments
  folder owns.
- diagnostic tooling: scores, profiles, or audits rendered output.
- screenshot tooling: captures images of rendered scenes.
- Playwright test harness: drives the built app through visible UI.
- report/PDF tooling: turns HTML into PDF or another report artifact.
- unrelated utility: not part of the layout pipeline at all.

### 2.1 Summary table

| Script | Lines | Tracked | Category | Called by | Calls into |
| --- | --- | --- | --- | --- | --- |
| experiments/css_native_layout/precheck.mjs | 1692 | yes | diagnostic tooling | run_precheck.sh, run_built_app_precheck.sh | `_temp_annotate.py` via execSync |
| experiments/css_native_layout/capture.mjs | 380 | no (gitignored) | screenshot tooling | none (manual) | scene HTML templates |
| experiments/css_native_layout/render_and_dump.mjs | 706 | yes | experiment runtime | run_built_app_precheck.sh | dist/runtime.bundle.js, src/style.css |
| experiments/css_native_layout/score_layout.mjs | 649 | yes | diagnostic tooling | none (manual; called via `node ...`) | precheck JSON output |
| experiments/css_native_layout/no_crop_audit/inspect.mjs | 263 | yes | diagnostic tooling | none (manual) | scene HTML templates |
| experiments/css_native_layout/well_plate_rect_probe/probe.mjs | 617 | no (gitignored) | diagnostic tooling | none (manual) | dist/runtime.bundle.js |
| experiments/css_native_layout/stress_generators/profile_runtime.mjs | 710 | no (gitignored) | diagnostic tooling | none (manual) | dist/runtime.bundle.js |
| experiments/css_native_layout/stress_generators/profile_runtime_deep.mjs | 745 | no (gitignored) | diagnostic tooling | none (manual) | dist/runtime.bundle.js |
| experiments/css_native_layout/stress_generators/label_policy_audit.mjs | 181 | no (gitignored) | diagnostic tooling | none (manual) | rendered scene HTML |
| experiments/css_native_layout/stress_generators/viewport_probe.mjs | 625 | no (gitignored) | diagnostic tooling | none (manual) | rendered scene HTML |
| tools/html_to_pdf.mjs | 103 | yes | report/PDF tooling | npm script `pdf` | input HTML/URL |
| tools/svg_picker/picker.js | 1036 | yes | unrelated utility | tools/svg_picker/index.html | candidates.json, missing_targets.json, suggestions.json |
| tests/playwright/repo_root.mjs | 8 | yes | Playwright test harness (shared helper) | tests/playwright/e2e/*.mjs | none |
| tests/playwright/e2e/protocol_walkthrough_yaml.mjs | 1424 | yes | Playwright test harness | tools/run_protocol_walkthrough.py | walker_helpers.mjs, repo_root.mjs, dist/ HTML |
| tests/playwright/e2e/walker_helpers.mjs | 322 | yes | Playwright test harness | protocol_walkthrough_yaml.mjs | none |
| tests/playwright/walker/audit_all.mjs | 415 | yes | Playwright test harness | none (manual) | walker/engine.mjs, generated/protocol_data.ts |
| tests/playwright/walker/engine.mjs | 657 | yes | Playwright test harness | walker/run.mjs, walker/audit_all.mjs | walker/click_resolver.js, walker/screenshot.js |
| tests/playwright/walker/run.mjs | 88 | yes | Playwright test harness | none (manual) | walker/engine.mjs |
| tests/playwright/walker/click_resolver.js | 137 | yes | Playwright test harness | walker/index.js | none |
| tests/playwright/walker/index.js | 262 | yes | Playwright test harness | walker/engine.mjs (legacy parallel path) | walker/click_resolver.js, walker/screenshot.js |
| tests/playwright/walker/screenshot.js | 125 | yes | Playwright test harness | walker/engine.mjs, walker/index.js | none |

Twenty-one scripts. 14 tracked, 6 gitignored under
`experiments/css_native_layout/`, 1 utility tracked under `tools/`.

### 2.2 Counts by category

| Category | Count |
| --- | --- |
| experiment runtime | 1 |
| diagnostic tooling | 8 |
| screenshot tooling | 1 |
| Playwright test harness | 9 |
| report/PDF tooling | 1 |
| unrelated utility | 1 |
| Total | 21 |

## 3. Per-script audit

### 3.1 experiments/css_native_layout/precheck.mjs

- Path: `experiments/css_native_layout/precheck.mjs`
- Category: diagnostic tooling
- Purpose: primary visual audit for hand-authored scene HTML templates;
  runs Playwright at 1920x1080 against each template and emits hard-fail
  diagnostics (clipped artwork, off-page placements, SVG-SVG overlap,
  region overflow, aspect distortion, label overlap, primary-object
  ratio, region/scene whitespace).
- Inputs: glob over `experiments/css_native_layout/templates/*.html` by
  default; CLI `--out`, `--annotate`, `--theme` flags.
- Outputs: `<outDir>/<scene>.png`, `<outDir>/visual_audit.json`,
  `<outDir>/visual_audit.md`, `<outDir>/sizing_manifest.json`; default
  `outDir = test-results/new0_css_native/audit`. Exits 1 on no-match or
  fatal error.
- Direct dependencies: `playwright` (chromium), `node:fs`, `node:path`,
  `node:url`, `node:child_process` (only used to call a Python
  `_temp_annotate.py` script for annotated PNGs).
- Coupling to `src/`: none. Reads scene HTML and asset SVGs only.
- CI path: not on `check_codebase.sh`. Invoked manually or via
  `experiments/css_native_layout/run_precheck.sh` /
  `experiments/css_native_layout/run_built_app_precheck.sh`.
- Cited by `tests/test_canonical_scorecard_rule.py` as the authoritative
  visual-audit script.

### 3.2 experiments/css_native_layout/capture.mjs

- Path: `experiments/css_native_layout/capture.mjs`
- Category: screenshot tooling
- Purpose: multi-viewport (1920x1080 + 800x600) screenshot driver for
  direction-comparison work; injects per-direction CSS variants and
  reports overlap, migration count, and zoom-view sizing.
- Inputs: CLI scene names plus `--theme` (single direction or `all`) and
  `--debug` (on or off) flags.
- Outputs: `test-results/new0_css_native/<scene>_<dir>.png`, `_narrow.png`,
  `_bboxes_1920.json`, `_bboxes_800.json`, and aggregate `metrics_all.json`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`, `node:url`.
- Coupling to `src/`: none.
- CI path: not on any CI/wrapper script.
- Tracked: NO (matches default `experiments/css_native_layout/*`
  gitignore rule; not whitelisted).

### 3.3 experiments/css_native_layout/render_and_dump.mjs

- Path: `experiments/css_native_layout/render_and_dump.mjs`
- Category: experiment runtime (bridge from production runtime to
  precheck-compatible static HTML)
- Purpose: mounts a protocol via the built runtime bundle, waits for the
  scene to render, optionally synthesizes a `.scene-container` /
  `.placement` shell when the runtime emits an SVG-only `.scene-chrome`,
  and dumps the resulting DOM to a static `.html` file that
  `precheck.mjs` can audit.
- Inputs: `--protocol` (default `well_plate_96_zoom_check`), `--out`,
  `--bundle` (default `dist/runtime.bundle.js`), `--port`, `--timeout`.
- Outputs: `experiments/css_native_layout/spike_fixtures/spike_rendered/<protocol>.html`
  by default. Exits 0 on success, 1 on any mount or dump failure.
- Direct dependencies: `playwright`, `node:fs`, `node:path`,
  `node:child_process` (only for `git rev-parse --show-toplevel`).
- Coupling to `src/` and `dist/`: HIGH. Reads `src/style.css` and
  `experiments/css_native_layout/styles/bench.css` inline; requires
  `dist/runtime.bundle.js` to exist; calls `SceneRuntime.__spike.*` hooks
  on the runtime global.
- CI path: not on `check_codebase.sh`. Invoked via
  `experiments/css_native_layout/run_built_app_precheck.sh`.
- Notable: contains an explicit guardrail that re-counts `class="placement"`
  occurrences before and after extraction and throws on any drop, to
  prevent metric-gaming by post-processing the dumped DOM. The synthetic
  shell creation it performs is required because the runtime renders SVG
  inside `.scene-chrome`, not the HTML-div `.scene-container` shape
  precheck expects.

### 3.4 experiments/css_native_layout/score_layout.mjs

- Path: `experiments/css_native_layout/score_layout.mjs`
- Category: diagnostic tooling
- Purpose: aggregates precheck output against scene-class weighted
  metrics; emits ranked scorecard. Hard-fail gate: any hard fail zeroes
  the score.
- Inputs: reads `test-results/new0_css_native/audit/visual_audit.json`
  (or `stabilized/` fallback) plus
  `experiments/css_native_layout/scene_class_manifest.yaml`.
  Optional `--compare <dirA> <dirB>` for diffing.
- Outputs: `test-results/new0_css_native/scorecard/scorecard.json`,
  `scorecard.md`.
- Direct dependencies: `node:fs`, `node:path`, `node:url`. No browser.
  Includes a minimal hand-rolled YAML parser scoped to the manifest's
  shape.
- Coupling to `src/`: none.
- CI path: not on `check_codebase.sh`. Invoked manually or by
  follow-on report scripts.
- Cited by `tests/test_canonical_scorecard_rule.py` as the only
  permitted scorecard producer; the test refuses Python reimplementations.

### 3.5 experiments/css_native_layout/no_crop_audit/inspect.mjs

- Path: `experiments/css_native_layout/no_crop_audit/inspect.mjs`
- Category: diagnostic tooling
- Purpose: focused crop detector. Classifies each `.placement` as ok /
  cropped / distorted / tiny / offscreen and produces annotated PNGs.
- Inputs: hard-coded list of 10 canonical scene templates.
- Outputs: `no_crop_audit_results.json` next to the script, plus
  annotated PNGs under
  `docs/active_plans/new2_no_crop_audit_assets/`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`, `node:url`.
- Coupling to `src/`: none.
- CI path: not on any wrapper.

### 3.6 experiments/css_native_layout/well_plate_rect_probe/probe.mjs

- Path: `experiments/css_native_layout/well_plate_rect_probe/probe.mjs`
- Category: diagnostic tooling
- Purpose: NEW2 isolated diagnostic specific to the well-plate sub-target
  rects (A1, E7, H12). Mounts the spike protocol, flips the CSS-native
  spike flag, queries `[data-target-id]` rects, and produces annotated
  PNG plus rects JSON.
- Inputs: `dist/_spike_well_plate_96_zoom_check.html`,
  `dist/runtime.bundle.js`.
- Outputs: `test-results/new2_well_plate_rect_probe/rects.json` and
  `annotated.png`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`,
  `node:child_process` (git only).
- Coupling to `dist/`: HIGH. Same shape as render_and_dump.mjs's
  built-app coupling.
- CI path: not on any wrapper.
- Tracked: NO. Falls through to default `experiments/css_native_layout/*`
  ignore.

### 3.7 experiments/css_native_layout/stress_generators/profile_runtime.mjs

- Path: `experiments/css_native_layout/stress_generators/profile_runtime.mjs`
- Category: diagnostic tooling
- Purpose: runtime performance profiler measuring adapter call time
  (median, p95, max), getBoundingClientRect count, DOM and heap growth
  across 50, 500, and 1000 iterations, plus precheck and scorecard
  per-scene times.
- Inputs: `dist/_spike_well_plate_96_zoom_check.html`,
  `dist/runtime.bundle.js`.
- Outputs:
  `experiments/css_native_layout/stress_results/performance_profile.json`
  and `.md`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`,
  `node:child_process` (`execSync`, `spawnSync`).
- Coupling to `dist/`: HIGH (built bundle dependency).
- CI path: not on any wrapper.
- Tracked: NO. Stress_generators .gitignore allows only `*.py`.

### 3.8 experiments/css_native_layout/stress_generators/profile_runtime_deep.mjs

- Path: `experiments/css_native_layout/stress_generators/profile_runtime_deep.mjs`
- Category: diagnostic tooling
- Purpose: deeper hot-path profiler that re-implements the seven phases
  of `compute_scene_layout_css_native` inside `page.evaluate` and
  measures per-phase timing. Reads the live runtime world via
  `__RUNTIME_PROTOCOL_CONFIG` and wraps `Element.prototype.getBoundingClientRect`.
- Inputs: `dist/_spike_well_plate_96_zoom_check.html`,
  `dist/runtime.bundle.js`.
- Outputs:
  `experiments/css_native_layout/stress_results/runtime_hotpath_profile.json`
  and `.md`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`,
  `node:child_process`.
- Coupling to `dist/`: HIGH.
- CI path: not on any wrapper.
- Tracked: NO.

### 3.9 experiments/css_native_layout/stress_generators/label_policy_audit.mjs

- Path: `experiments/css_native_layout/stress_generators/label_policy_audit.mjs`
- Category: diagnostic tooling
- Purpose: lightweight per-policy audit that reimplements three precheck
  metrics (label-label overlap, svg-label overlap, artwork-integrity hard
  fails) for the policy-comparison matrix. Explicitly notes it does NOT
  modify the canonical `precheck.mjs`.
- Inputs: pre-rendered stress scene HTML (under
  `experiments/css_native_layout/stress_scenes/rendered/`).
- Outputs: per-scene `<scene>.png` and `<scene>.json` plus a per-policy
  `summary.json` (location implied by the script header to be the
  stress_results tree).
- Direct dependencies: `playwright`, `node:fs`, `node:path`.
- Coupling to `src/`: none.
- CI path: not on any wrapper.
- Tracked: NO.

### 3.10 experiments/css_native_layout/stress_generators/viewport_probe.mjs

- Path: `experiments/css_native_layout/stress_generators/viewport_probe.mjs`
- Category: diagnostic tooling
- Purpose: viewport policy stress test. For each (scene, viewport) pair
  among 15 scenes x 4 viewports (1920x1080, 1440x900, 1200x900, 800x600),
  inline-measures off-page, clipped-by-parent, region-overflow,
  tiny-target, aspect-distortion, migration vs 1920x1080 baseline, and
  score; saves a screenshot and JSON per cell. Does NOT modify
  precheck.mjs, score_layout.mjs, or render_and_dump.mjs.
- Inputs: pre-rendered stress scenes under
  `experiments/css_native_layout/stress_scenes/rendered/`.
- Outputs:
  `experiments/css_native_layout/stress_results/viewport_runs/`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`,
  `node:child_process` (git only).
- Coupling to `src/`: none.
- CI path: not on any wrapper.
- Tracked: NO.

### 3.11 tools/html_to_pdf.mjs

- Path: `tools/html_to_pdf.mjs`
- Category: report/PDF tooling
- Purpose: CLI to render an HTML file or URL to PDF via Chromium with
  fixed defaults (Letter, 0.6in margins, screen media, 1440x1200
  viewport, `networkidle`, backgrounds on); optional `--landscape`.
- Inputs: `--input` (file path or http/https/file URL),
  `--output` (optional; derived from input filename when input is a
  local file), `--landscape`.
- Outputs: PDF at `<output>`. Documented to write to `/tmp/` or
  `test-results/`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`, `node:url`,
  `node:util`, `node:process`.
- Coupling to `src/` or `dist/`: none.
- CI path: exposed as `npm run pdf` (npm script `pdf`). Not on
  `check_codebase.sh`.
- Cited as the canonical PDF tool in `docs/PLAYWRIGHT_USAGE.md`.

### 3.12 tools/svg_picker/picker.js

- Path: `tools/svg_picker/picker.js`
- Category: unrelated utility (general SVG attribution review tool;
  not part of the layout pipeline)
- Purpose: browser-side three-pane SVG picker UI; loads
  `candidates.json`, `missing_targets.json`, `suggestions.json` from
  the same directory and exports `decisions.json` for downstream
  consumption by `tools/svg_picker/apply_decisions.py`.
- Inputs: three JSON files fetched relative to `tools/svg_picker/`,
  served by `tools/svg_picker/serve_picker.sh`.
- Outputs: client-side `decisions.json` download.
- Direct dependencies: browser only (no Node imports). Uses `fetch`,
  `Blob`, `URL.createObjectURL`, DOM events.
- Coupling to `src/`: none.
- CI path: none.

### 3.13 tests/playwright/repo_root.mjs

- Path: `tests/playwright/repo_root.mjs`
- Category: Playwright test harness (shared helper)
- Purpose: exports `REPO_ROOT` resolved via `git rev-parse --show-toplevel`
  so test scripts can build absolute paths without relative-path math.
- Inputs: none.
- Outputs: named export `REPO_ROOT`.
- Direct dependencies: `node:child_process`.
- Coupling to `src/`: none.
- CI path: not directly. Imported by `tests/playwright/e2e/*.mjs`.

### 3.14 tests/playwright/e2e/protocol_walkthrough_yaml.mjs

- Path: `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
- Category: Playwright test harness (browser-driven E2E)
- Purpose: YAML-driven UI walker that walks a protocol via real DOM
  clicks against the built app served from `dist/`. Implements step
  category dispatch (interactionSequence, isIncubation, modal owners,
  completionTrigger families) with per-click, per-step, and whole-run
  stall budgets. On failure writes a report plus final screenshot.
- Inputs: CLI `--protocol <name>` (default `cell_culture`),
  `--wrong-order`, `--help`. Reads YAML protocol data through the built
  app.
- Outputs: `test-results/walker/playthrough_report.json` plus per-step
  screenshots; non-zero exit on any failure.
- Direct dependencies: `playwright`, `node:child_process`, `node:path`,
  `node:fs`. Local imports from `walker_helpers.mjs` and `repo_root.mjs`.
- Coupling to `src/`: none (visible UI only); indirectly couples to the
  `dist/` bundle the page loads.
- CI path: not on `check_codebase.sh`. Invoked through
  `tools/run_protocol_walkthrough.py` (a Python wrapper that builds the
  app and then spawns the Node walker).

### 3.15 tests/playwright/e2e/walker_helpers.mjs

- Path: `tests/playwright/e2e/walker_helpers.mjs`
- Category: Playwright test harness (shared helper)
- Purpose: reusable Playwright helpers for the YAML walker. Includes
  readiness predicates (`waitForStepCompleted`, `waitForHeldLiquid`,
  `waitForActiveScene`, `waitForMicroscopeOpen`,
  `waitForIncubationComplete`), scene-switch helpers, selector resolvers,
  scoped-selector resolvers, click+progress helpers, and structured
  logging hooks.
- Inputs: imported only.
- Outputs: named exports consumed by `protocol_walkthrough_yaml.mjs`.
- Direct dependencies: Playwright `page` API only.
- Coupling to `src/`: none.
- CI path: imported by `protocol_walkthrough_yaml.mjs`.

### 3.16 tests/playwright/walker/audit_all.mjs

- Path: `tests/playwright/walker/audit_all.mjs`
- Category: Playwright test harness (multi-protocol orchestrator)
- Purpose: discovers all mini_protocol entries from
  `generated/protocol_data.ts`, builds HTML through
  `pipeline/build_protocol_html.py` for any missing one, runs the walker
  engine on each, classifies failures into gap categories
  (renderer-gap, content-gap, orchestrator-gap, unknown), and emits a
  markdown and JSON report.
- Inputs: `generated/protocol_data.ts`.
- Outputs: `test-results/_walker_audit/audit_report.md` plus
  `audit_report.json`. Exit 0 on completion regardless of per-protocol
  pass or fail; non-zero only on fatal error.
- Direct dependencies: `node:fs`, `node:path`, `node:child_process`.
  Local import from `./engine.mjs`.
- Coupling to `src/`: none directly; couples to `generated/` (built
  from `src/` content) and shells out to a Python build helper.
- CI path: not on `check_codebase.sh`.

### 3.17 tests/playwright/walker/engine.mjs

- Path: `tests/playwright/walker/engine.mjs`
- Category: Playwright test harness (canonical walker engine)
- Purpose: schema-driven walker engine. Loads a protocol via the runtime
  contract, drives the UI through visible DOM selectors only, controls
  the test clock for `TimedWait`, and fails loudly on missing
  affordances. Explicit non-goal: no per-protocol branches.
- Inputs: `WalkerOptions { protocolName, baseUrl, headless,
  screenshotDir, testClockSpeed, verbosity }`.
- Outputs: `WalkerResult { protocolName, stepsWalked, stepsTotal,
  interactionsWalked, screenshotsTaken, success, failedStepName?,
  errorMessage? }`. Screenshots written under `screenshotDir`.
- Direct dependencies: `playwright`, `node:fs`, `node:path`.
- Coupling to `src/`: none directly; couples to the built app's runtime
  contract exposed on `window.__RUNTIME_*` globals.
- CI path: not on `check_codebase.sh`. Called by `walker/run.mjs` and
  `walker/audit_all.mjs`.
- Enforced by `tests/test_walker_no_step_branches.py` (refuses any
  per-step or per-protocol branch in walker source files).

### 3.18 tests/playwright/walker/run.mjs

- Path: `tests/playwright/walker/run.mjs`
- Category: Playwright test harness (CLI entry)
- Purpose: command-line entry point for the walker engine. Parses
  `--protocol`, `--headless`, `--verbosity`, `--screenshots`, `--help`
  and dispatches into `runWalker`.
- Inputs: CLI flags only.
- Outputs: process exit code from `runWalker`.
- Direct dependencies: local import from `./engine.mjs` only.
- Coupling to `src/`: none.
- CI path: not on `check_codebase.sh`.

### 3.19 tests/playwright/walker/click_resolver.js

- Path: `tests/playwright/walker/click_resolver.js`
- Category: Playwright test harness (shared helper, legacy parallel
  path)
- Purpose: resolves a YAML click target to a DOM element using a fixed
  selector strategy (`data-item-id` -> `data-step-id` -> `data-choice-id`
  -> `data-well-id` -> `#id` -> `data-test`) with visibility checks and
  diagnostic errors via `ClickResolutionError`.
- Inputs: imported only.
- Outputs: named exports.
- Direct dependencies: Playwright `locator` API only.
- Coupling to `src/`: none.
- CI path: imported by `walker/index.js`.

### 3.20 tests/playwright/walker/index.js

- Path: `tests/playwright/walker/index.js`
- Category: Playwright test harness (legacy parallel walker dispatcher)
- Purpose: walker dispatcher keyed on legacy `completionPath.kind`
  values (`interactionSequence`, `directTool`, `modal`,
  `multipleChoice`). Reads `window.gameState` for verification only.
  Coexists with the schema-driven `engine.mjs` and is the source of the
  walker_helpers and screenshot helpers reused by engine.mjs.
- Inputs: imported.
- Outputs: walker dispatch function consumed by `engine.mjs`.
- Direct dependencies: `playwright`, local imports from
  `./click_resolver.js` and `./screenshot.js`.
- Coupling to `src/`: none directly; reads `window.gameState`.
- CI path: imported transitively; not invoked by any wrapper.
- Open question: this is a legacy `kind`-based dispatcher coexisting
  with the canonical schema-driven `engine.mjs`. Whether
  `index.js` should be removed or merged is a manager decision.

### 3.21 tests/playwright/walker/screenshot.js

- Path: `tests/playwright/walker/screenshot.js`
- Category: Playwright test harness (shared helper)
- Purpose: screenshot pipeline. Organizes captures by
  `test-results/walker/<protocolId>/step_<NN>/action_<NN>_<phase>.png`
  with `phase` in `{before, after, summary}`.
- Inputs: imported only.
- Outputs: named exports (`ensureScreenshotDir`, `captureBefore`,
  `captureAfter`, `captureStepSummary`).
- Direct dependencies: `node:fs`, `node:path`.
- Coupling to `src/`: none.
- CI path: imported by `walker/engine.mjs` and `walker/index.js`.

## 4. Dependency graph

ASCII adjacency list (caller -> callee). Only direct relationships;
indirect coupling (e.g. via `dist/runtime.bundle.js`) is noted in the
per-script sections.

```
package.json
  -> npm run pdf -> tools/html_to_pdf.mjs

experiments/css_native_layout/run_precheck.sh
  -> experiments/css_native_layout/precheck.mjs

experiments/css_native_layout/run_built_app_precheck.sh
  -> pipeline/build_runtime_bundle.sh         (build step, out of scope)
  -> experiments/css_native_layout/render_and_dump.mjs
       -> reads dist/runtime.bundle.js, src/style.css
  -> experiments/css_native_layout/precheck.mjs
       -> shells _temp_annotate.py (python annotation script)

(manual)
  -> experiments/css_native_layout/score_layout.mjs
       -> reads test-results/new0_css_native/audit/visual_audit.json
            (output of precheck.mjs)

(manual)
  -> experiments/css_native_layout/capture.mjs
  -> experiments/css_native_layout/no_crop_audit/inspect.mjs
  -> experiments/css_native_layout/well_plate_rect_probe/probe.mjs
       -> reads dist/runtime.bundle.js
  -> experiments/css_native_layout/stress_generators/profile_runtime.mjs
       -> reads dist/runtime.bundle.js
  -> experiments/css_native_layout/stress_generators/profile_runtime_deep.mjs
       -> reads dist/runtime.bundle.js
  -> experiments/css_native_layout/stress_generators/label_policy_audit.mjs
  -> experiments/css_native_layout/stress_generators/viewport_probe.mjs

tools/run_protocol_walkthrough.py
  -> tests/playwright/e2e/protocol_walkthrough_yaml.mjs
       -> tests/playwright/e2e/walker_helpers.mjs
       -> tests/playwright/repo_root.mjs

(manual)
  -> tests/playwright/walker/run.mjs
       -> tests/playwright/walker/engine.mjs
            -> tests/playwright/walker/click_resolver.js
            -> tests/playwright/walker/screenshot.js
  -> tests/playwright/walker/audit_all.mjs
       -> tests/playwright/walker/engine.mjs
       -> generated/protocol_data.ts
       -> shells pipeline/build_protocol_html.py

tests/playwright/walker/index.js
  (legacy parallel dispatcher; imported via engine.mjs helpers)
  -> tests/playwright/walker/click_resolver.js
  -> tests/playwright/walker/screenshot.js

tools/svg_picker/serve_picker.sh
  -> serves tools/svg_picker/index.html
       -> loads tools/svg_picker/picker.js
            -> fetches candidates.json, missing_targets.json,
               suggestions.json
```

No JS/MJS audited file is on the `check_codebase.sh` gate.
`check_codebase.sh` runs only `tsc`, `eslint`, `prettier`, and
`node --test tests/test_*.mjs` (which excludes the playwright tree).

## 5. Productionization recommendation

One label per script, chosen to match the canonical TypeScript style
(`docs/TYPESCRIPT_STYLE.md` favors small focused `.ts` modules in
`src/`, with browser tests under `tests/playwright/` and Node unit tests
as `tests/test_*.mjs`). The next manager should treat these as
suggestions, not commitments.

| Script | Recommendation | Rationale |
| --- | --- | --- |
| precheck.mjs | KEEP_AS_MJS | Canonical visual-audit script; enforced by `tests/test_canonical_scorecard_rule.py`. Diagnostic-only; staying as plain MJS avoids type-system churn while diagnostics stabilize. |
| capture.mjs | DELETE | Direction-comparison work is closed. Not tracked. Not referenced from any wrapper. |
| render_and_dump.mjs | KEEP_AS_MJS (now) / REWRITE_TO_TS (later) | Required for the built-app precheck workflow. The synthetic DOM shell it builds is a brittle bridge; if the canonical layout manager unifies HTML and SVG output, this script can shrink dramatically and graduate to TS. |
| score_layout.mjs | KEEP_AS_MJS | Canonical scorecard; enforced by `tests/test_canonical_scorecard_rule.py`. Diagnostic-only; staying as plain MJS keeps the contract simple. The inline YAML parser is a small cost. |
| no_crop_audit/inspect.mjs | KEEP_AS_MJS | Useful focused crop probe; small footprint. Could be folded into precheck.mjs as a sub-check during clean-up. |
| well_plate_rect_probe/probe.mjs | DELETE | NEW2-specific spike probe; not tracked. Findings already captured in archived reports. |
| stress_generators/profile_runtime.mjs | DELETE | NEW3 Batch 1 baseline; not tracked; superseded by profile_runtime_deep.mjs. |
| stress_generators/profile_runtime_deep.mjs | DELETE | NEW3 Batch 2 hot-path profiler; not tracked. Re-runnable from archived reports if a future regression appears. |
| stress_generators/label_policy_audit.mjs | DELETE | NEW3 Batch 2 policy-matrix audit; not tracked. Findings already captured. |
| stress_generators/viewport_probe.mjs | DELETE | NEW3 Batch 2 viewport probe; not tracked. Findings already captured. |
| tools/html_to_pdf.mjs | KEEP_AS_MJS | General-purpose tool, plumbed via `npm run pdf`; cited in `docs/PLAYWRIGHT_USAGE.md`. Stable. |
| tools/svg_picker/picker.js | KEEP_AS_MJS (current shape) | Browser-only utility. Renaming to `.mjs` would require an `<script type="module">` change in `index.html`; not worth the churn. Could move to a `tools/svg_picker/static/` subdir later. |
| tests/playwright/repo_root.mjs | KEEP_AS_MJS | Tiny shared helper; matches Playwright convention. |
| tests/playwright/e2e/protocol_walkthrough_yaml.mjs | REWRITE_TO_TS | 1424 lines of multi-mode dispatch on game state; strong candidate for typed step-category dispatch. Schedule after `engine.mjs` graduates so the two stay in sync. |
| tests/playwright/e2e/walker_helpers.mjs | REWRITE_TO_TS | Helper of the above; convert together. |
| tests/playwright/walker/audit_all.mjs | KEEP_AS_MJS | Tracked, useful as-is. Could move to `tools/` once stable since it is an orchestrator, not a test. |
| tests/playwright/walker/engine.mjs | REWRITE_TO_TS | Canonical schema-driven walker; large enough (657 lines) and central enough that strict types would catch real bugs at the contract boundary. The walker's own design philosophy (no per-protocol branches; schema-driven dispatch) maps cleanly to discriminated unions. |
| tests/playwright/walker/run.mjs | KEEP_AS_MJS | Thin CLI shim; not worth typing. |
| tests/playwright/walker/click_resolver.js | REWRITE_TO_TS | Already shows `@ts-ignore` cousins (`screenshot.js`) carrying TODOs for node types. Convert as part of the engine.mjs rewrite. |
| tests/playwright/walker/index.js | DELETE (after merge) | Legacy parallel dispatcher keyed on `completionPath.kind`. Coexists with the canonical schema-driven `engine.mjs`. Open question 6.3 below: keep one. |
| tests/playwright/walker/screenshot.js | REWRITE_TO_TS | Carries `@ts-ignore` for `node:fs` and `node:path` -- the right fix is `@types/node` + a `.ts` rename. Small file; cheap rewrite. |

KEEP_AS_MJS: 9
REWRITE_TO_TS: 6
DELETE outright: 5
DELETE after merge: 1

No script in this audit warrants a MOVE_TO_PRODUCTION_TREE label by itself.
The diagnostic pipeline (`precheck.mjs`, `score_layout.mjs`,
`render_and_dump.mjs`) stays where it is until the production layout
manager exists; promoting them prematurely would conflict with the
"experiments folder is evidence" framing in the onboarding.
`audit_all.mjs` is the closest candidate for MOVE_TO_TOOLS (it is an
orchestrator, not a test), but the current `tests/playwright/walker/`
folder already groups it with its callee, so the move is not urgent.

## 6. Open questions

1. **`render_and_dump.mjs` synthetic DOM shell.** The script wraps the
   runtime's `.scene-chrome` SVG output in a synthetic `.scene-container`
   /  `.placement` HTML shell so `precheck.mjs` can audit it. This is a
   bridge built on the assumption that the runtime emits SVG and the
   precheck expects HTML divs. The next manager should decide whether
   the canonical layout manager unifies these representations (after
   which the bridge can be deleted) or keeps them separate (after which
   the bridge becomes load-bearing and should graduate to TS with
   integration tests).
2. **Untracked diagnostic scripts.** Six experiment scripts
   (`capture.mjs`, `well_plate_rect_probe/probe.mjs`, the four
   `stress_generators/*.mjs`) are excluded by `.gitignore` and live only
   on the author's working copy. They are evidence the diagnostic work
   happened, not artifacts shared across the team. The next manager
   should confirm there is no expectation of reproducing their outputs
   beyond the archived reports; if there is, the gitignore needs an
   exception or the scripts need to move to a tracked location.
3. **Walker dispatcher duplication.** `walker/engine.mjs` (schema-driven,
   canonical, enforced by `tests/test_walker_no_step_branches.py`) and
   `walker/index.js` (legacy `completionPath.kind`-keyed) overlap.
   `engine.mjs` calls into the `index.js`-aligned helpers
   (`click_resolver.js`, `screenshot.js`) and the legacy file imports
   them too. The intent looks like a migration mid-way through; the next
   manager should decide whether `index.js` is deleted, merged into
   `engine.mjs`, or kept as a fallback.
4. **Walker engine call site.** `tests/playwright/walker/run.mjs`
   imports `runWalker` from `./engine.mjs`, but no shell or Python
   wrapper appears to invoke `walker/run.mjs` directly. The
   ONBOARDING.md M0 step references it ("`node
   tests/playwright/spike_built_app_well_plate_zoom.mjs` (or whichever
   spike file currently lives under `tests/playwright/`)"). The next
   manager should confirm the canonical entry point for a single-protocol
   walker run.
5. **Two parallel walker code paths.** `tests/playwright/e2e/protocol_walkthrough_yaml.mjs`
   is a separate 1424-line walker keyed on `interactionSequence`,
   `isIncubation`, modal owners, and `completionTrigger` families.
   `tests/playwright/walker/engine.mjs` is the schema-driven walker that
   refuses per-step branches. These look like two generations of walker
   coexisting. The next manager should confirm which one is canonical
   and which one is being retired.
6. **`tools/html_to_pdf.mjs` scope.** Listed as report tooling in this
   audit, but the script is general-purpose (any HTML to PDF) and not
   specific to the layout pipeline. No action needed; flagged so it is
   not mistakenly bundled with the diagnostic cleanup.
