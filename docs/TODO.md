# TODO

Triage backlog for issues surfaced but not fixed during recent work. See the
active plans under `~/.claude/plans/` or [ROADMAP.md](ROADMAP.md) for queued
work.

## Rendering and content display

### Fix unit rendering for browser-displayed YAML labels

Authored YAML strings that render in the browser should support proper
scientific unit display, especially micro units. The desired browser display is
`&mu;L` and `&mu;M`, but the source must remain safe and consistent with the
repo's ASCII documentation rules. Current workaround is to write `uL` and `uM`
in YAML labels and fenced code examples.

Acceptance criteria:

- Browser-displayed YAML labels can show `&mu;L` and `&mu;M` correctly.
- HTML entities such as `&mu;` or `&micro;` do not appear literally in the UI.
- The rendering path uses safe text handling and does not introduce unsafe
  HTML injection.
- Docs clarify the final convention for Markdown prose, fenced YAML examples,
  and authored YAML labels.
- Existing ASCII compliance checks still pass, or the exception is explicitly
  documented if source files are allowed to contain Unicode units.

## Pre-existing failures surfaced during M1b (2026-05-09)

These were uncovered while landing M1b of the SVG asset pipeline refactor
(plan ref: `~/.claude/plans/cuddly-snuggling-feather.md`). The reviewer
bisected against HEAD with M1b changes reverted and reproduced both
failures, so they are pre-existing and not caused by M1b. Surfaced here for
triage; M1c does NOT fix either. See the M1b CHANGELOG entry under
`## 2026-05-09` for the full context.

### Walker `interactionSequence` regression on hood scenes (RESOLVED 2026-05-09)

- Outcome: fixed. Root cause was the capture-phase click handler in
  [src/scenes/scene_driver.ts](../src/scenes/scene_driver.ts) calling
  `target.getAttribute('data-item-id')` on the raw click target, which is
  often an inner SVG shape (`ellipse`/`rect`/`path`) inside the `.hood-item`
  wrapper, not the wrapper itself. After a `directTool` step that called
  `renderHoodScene()` directly (skipping `runSceneRender`), the per-item
  bubble-phase listeners from
  [src/scenes/cell_culture_hood/hood_shared.ts](../src/scenes/cell_culture_hood/hood_shared.ts)
  were not re-attached on the rebuilt DOM, leaving only the capture-phase
  listener -- and that listener could not resolve the data-item-id from a
  nested SVG element. Fix: resolve the nearest ancestor via
  `target.closest('[data-item-id]')` before reading the id. See the
  CHANGELOG entry under `## 2026-05-09` `### Fixes and Maintenance` for
  full evidence (cell_culture 25/25, all 10 protocols pass, smoke 9/9,
  tsc clean).

### `tests/_compile_for_test.mjs` missing helper (RESOLVED 2026-05-09)

- Outcome: fixed. M6 of the SVG asset pipeline refactor authored the
  missing helper at [tests/_compile_for_test.mjs](../tests/_compile_for_test.mjs)
  (uses `npx esbuild --bundle --platform=node --define:window=globalThis`
  to compile a `.ts` entry to a tempdir `.mjs` and dynamic-import it).
  Both [tests/test_svg_color_patch.mjs](../tests/test_svg_color_patch.mjs)
  and the new [tests/test_svg_pipeline.mjs](../tests/test_svg_pipeline.mjs)
  use the helper to exercise production `.ts` modules directly. See the
  M6 CHANGELOG entry under `## 2026-05-09` for full evidence.
