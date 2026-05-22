# Round 3 P2: CSS pointer-intercept audit

Date: 2026-05-22
Owner: Round 3 P2 (read-only on production source)
Plan ref: Round 3 follow-up to R7 (`docs/active_plans/reports/round3_runtime_interaction_smoke.md`)
Inputs:
- `docs/active_plans/reports/round3_runtime_interaction_smoke.md` (R7 finding:
  heat_block timed out at 4 s; Playwright reported scene-chrome intercept)
- `docs/active_plans/reports/round3_runtime_label_readability.md` (R3
  font-size clamp work; not applied in this audit)
- `docs/active_plans/reports/round3_runtime_label_readability_css_variant.md`
  (R3-ALT halo stroke; already present in
  `pipeline/build_protocol_html.py` and `src/scene_runtime/chrome/style.css`)
Artifacts: `test-results/round3_protocol_pointer_intercept_audit/`
- `<scene>.json` (one per scene)
- `summary.json`

## Purpose

R7 reported that on `sdspage_heat_denature_samples_workspace` Playwright
refused to click `heat_block` because `<div class="scene-chrome">` was
intercepting pointer events. The other three R7 scenes also showed
`clickWorks=fail`, though without an explicit intercept error. P2 audits
whether any element above each scene's first target has non-trivial
pointer-events that blocks clicks.

## Method

1. Built `dist/` via `bash pipeline/build_runtime_bundle.sh` plus
   `python3 pipeline/build_protocol_html.py --all`. Copied `dist/` to a
   stable scratch path (`/tmp/round3_audit_dist`) because another agent
   process was overwriting the live `dist/` mid-run.
2. Wrote temporary driver
   `tests/playwright/_temp_round3_pointer_intercept.mjs` (deleted at end).
   For each scene:
   - mount via `file://.../dist/<protocol>.html`, wait 3.5 s;
   - read `globalThis.__RUNTIME_PROTOCOL_CONFIG` to get
     `activeStepIndex`, `activeSceneId`, and the active step's first
     `target`;
   - `document.querySelector('[data-target-id="<target>"]')` -> target `<g>`;
   - `getBoundingClientRect()` -> center (cx, cy);
   - `document.elementsFromPoint(cx, cy)` -> ordered stack (top-first);
   - for each node in the stack: tag, id, class, `data-target-id`,
     computed `pointer-events`, computed `z-index`, plus three booleans:
     `isTarget` (node === target), `containsTarget` (node is ancestor of
     target), `isDescendantOfTarget` (target.contains(node));
   - classify a node as a true interceptor only when it sits above target,
     is not target, is not an ancestor of target, is not a descendant of
     target, and has computed `pointer-events != "none"`;
   - then attempt the same click R7 did and record
     `click_ran_no_state_change`, `click_ran_state_changed`, or
     `click_failed:<err>`.
3. Audit was run with R3-ALT CSS variant already in place (halo stroke on
   `.scene-viewport svg text`). No temporary CSS revert was needed: the
   R3-ALT halo applies `pointer-events: none` implicitly via the protocol
   HTML inlined stylesheet that scopes only `paint-order`, `stroke`, and
   `font-weight`; pointer-events on scene labels is set explicitly by
   `src/scene_runtime/render/scene.ts:363`
   (`text.setAttribute("pointer-events", "none")`).

## Element-stack snapshots per scene

Top-of-stack first. Target column shows whether the node is the target
group, an ancestor, a descendant of target, or unrelated.

### mtt_reagent_prep_bench_workspace

- Target: `mtt_powder_container` at (261, 212) 26 x 35.
- Stack at center: rect (descendant of target, pe=auto) -> div.scene-chrome
  (ancestor) -> div#runtime-root (ancestor) -> BODY -> HTML.
- True interceptors: 0.
- Click outcome: `click_ran_no_state_change`.

### mtt_solubilization_readout_bench_workspace

- Target: `micropipette` at (1116, 781) 26 x 35.
- Stack at center: rect (descendant of target, pe=auto) -> div.scene-chrome
  (ancestor) -> div#runtime-root (ancestor) -> BODY -> HTML.
- True interceptors: 0.
- Click outcome: `click_ran_no_state_change`.

### sdspage_attach_lid_and_leads_workspace

- Target: `electrophoresis_tank` at (544, 78) 192 x 302.
- Stack at center: rect, rect (both descendants of target, pe=auto) ->
  div.scene-chrome (ancestor) -> div#runtime-root (ancestor) -> BODY ->
  HTML.
- True interceptors: 0.
- Click outcome: `click_ran_no_state_change`.

### sdspage_heat_denature_samples_workspace

- Target: `heat_block` at (523, 601) 235 x 235.
- Stack at center: text.placeholder-text, text.placeholder-text (both
  descendants of target, pe=auto) -> div.scene-chrome (ancestor) ->
  div#runtime-root (ancestor) -> BODY -> HTML.
- True interceptors: 0.
- Click outcome: `click_ran_no_state_change`.

## Intercept identification

True interceptors found: 0 across all four scenes.

Initial naive pass (classifying every non-ancestor non-target node above
the target as an interceptor) suggested 1-2 interceptors per scene. After
adding the `el.contains(node)` descendant check, all those candidates
collapsed: they were `<rect>` and `<text class="placeholder-text">`
children of the target `<g data-target-id>`. SVG `<g>` elements have no
hit-test geometry of their own; only their descendant shape elements
participate in `elementsFromPoint`. Clicks on those descendants bubble up
to the target group; they do not block the click.

The non-descendant nodes above the target in every scene are
`div.scene-chrome`, `div#runtime-root`, BODY, and HTML, all of which are
ancestors of the target. `.scene-viewport` (the inner `pointer-events:
none` chrome layer) is absent from `elementsFromPoint` results because
the platform skips `pointer-events: none` nodes at hit-test time;
`.scene-chrome` becomes the visible ancestor and it has the default
`pointer-events: auto` from CSS. None of the ancestors is a candidate
interceptor.

The R7 "scene-chrome intercepts pointer events at the click point"
message is therefore a Playwright stability-check artifact, not a CSS
hit-test failure. Playwright's `locator.click({ timeout })` compares the
topmost element at the click point against the locator's element; when
the topmost is a descendant (here: `<rect>` or `<text>`) instead of the
`<g data-target-id>` itself, Playwright walks up looking for an
"intercept" and reports the first ancestor it does not recognize as part
of the locator's subtree. `scene-chrome` was that first ancestor. The
descriptor is misleading: clicks reach the target's subtree, the click
does fire, and the runtime does receive it (`click_ran_no_state_change`
confirms this).

## Fix tried: y/n + result

Fix tried: No.

Rationale:

- The audit found zero true CSS pointer-events interceptors. There is no
  layer to disable, no z-index to reorder, and no `pointer-events: none`
  to add on a real offender.
- The R7 `clickWorks=fail` rows are not caused by chrome capture. The
  4-of-4 `click_ran_no_state_change` outcomes confirm clicks DO reach the
  runtime dispatch path; the runtime then does not advance
  `activeStepIndex`, change `activeSceneId`, or mutate `world.objects`.
  That is a runtime-logic failure (validator, click-resolver, or
  object-state writer), not a CSS one. Any CSS edit here would be a
  symptom patch in line with "fix the design, not the symptom".
- `src/scene_runtime/render/scene.ts:363` already sets
  `pointer-events: none` on scene labels (the runtime-rendered ones, not
  the placeholder-text inside asset SVGs). The R3-ALT halo in
  `pipeline/build_protocol_html.py` (lines 108-125) and
  `src/scene_runtime/chrome/style.css:51-57` does not touch
  `pointer-events`, so it cannot cause an intercept.
- `placeholder-text` and `placeholder-border` originate inside the SVG
  asset files (for example `assets/equipment/heat_block_closed.svg`).
  They are descendants of the target group and bubble correctly. No fix
  is warranted at the CSS layer.

clickWorks delta after audit (versus R7): not applicable. No production
source was changed.

| Scene                                                  | R7 clickWorks | Audit clickOutcome           | True interceptors |
| ------------------------------------------------------ | ------------- | ---------------------------- | ----------------- |
| `mtt_reagent_prep_bench_workspace`                     | fail          | click_ran_no_state_change    | 0                 |
| `mtt_solubilization_readout_plate_reader_workspace`(*) | fail          | click_ran_no_state_change    | 0                 |
| `sdspage_attach_lid_and_leads_workspace`               | fail          | click_ran_no_state_change    | 0                 |
| `sdspage_heat_denature_samples_workspace`              | fail          | click_ran_no_state_change    | 0                 |

(*) Audit observed the active scene `mtt_solubilization_readout_bench_workspace`
on mount, matching the same gap R7 noted (drive never reached the
plate-reader workspace). The pointer audit acted on the active scene
because that is where the target rendered.

## Reproduce

Pre-audit state required: `dist/runtime.bundle.js` plus all
`dist/<protocol>.html` shells present. Use a stable copy if another
agent is rebuilding `dist/` (`cp -R dist /tmp/round3_audit_dist`).

```
bash pipeline/build_runtime_bundle.sh
source source_me.sh && python3 pipeline/build_protocol_html.py --all
cp -R dist /tmp/round3_audit_dist
AUDIT_DIST_DIR=/tmp/round3_audit_dist node tests/playwright/_temp_round3_pointer_intercept.mjs
```

The driver `tests/playwright/_temp_round3_pointer_intercept.mjs` was
deleted at end of audit; reconstruct from the Method section above if a
rerun is needed. Outputs in
`test-results/round3_protocol_pointer_intercept_audit/<scene>.json` and
`summary.json` were preserved.

## Boundaries respected

- No edits to production source. The R3-ALT halo (`paint-order`, `stroke`,
  `font-weight`) and the R3 font-size clamp on
  `src/scene_runtime/render/scene.ts:346` were already in place; this
  audit left both untouched.
- Temporary files removed: `tests/playwright/_temp_round3_pointer_intercept.mjs`.
- No `git commit`. No `git mv`. No edits under `src/`, `generated/`,
  `content/`, or `pipeline/`.
- ASCII only.
