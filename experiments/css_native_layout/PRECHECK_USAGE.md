# Precheck usage

Operational guide for [precheck.mjs](precheck.mjs), the Playwright-driven
visual diagnostic for the `experiments/css_native_layout/` templates.

For the verdict ladder background, the stabilization history, and the list
of summary keys emitted in `visual_audit.json`, see
[PRECHECK_SUMMARY.md](PRECHECK_SUMMARY.md).

## One-command run

Run the full audit (all 10 root templates) with defaults:

```bash
node experiments/css_native_layout/precheck.mjs 'experiments/css_native_layout/templates/*.html'
```

Or use the wrapper, which calls precheck.mjs with the same defaults:

```bash
bash experiments/css_native_layout/run_precheck.sh
```

Defaults applied: `--out test-results/new0_css_native/audit`,
`--annotate on`, no `--theme` override.

## Scene subset run

`precheck.mjs` does not have a `--scene` flag. To restrict the audit to a
subset, pass an explicit HTML path or a narrower glob as the positional
argument.

Single scene:

```bash
node experiments/css_native_layout/precheck.mjs \
  experiments/css_native_layout/templates/well_plate_96_zoom.html
```

Narrower glob (only `*_zoom.html`):

```bash
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/*_zoom.html'
```

The glob is resolved by `precheck.mjs` itself (simple `*` expansion against
the directory listing); quote the pattern so the shell does not pre-expand
it. A bare filename (no `*`) is treated as a single-file path.

To audit the Direction B reference templates instead of the tracked root
slot, swap the directory:

```bash
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/dir_b/*.html'
```

## Output artifacts

All artifacts land under `--out` (default `test-results/new0_css_native/audit/`):

| File                    | Purpose                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `visual_audit.json`     | Machine-readable per-scene report plus summary keys.                                       |
| `visual_audit.md`       | Human-readable report with ASCII `[x]` / `[ ]` checklist.                                  |
| `sizing_manifest.json`  | Per-placement natural vs rendered measurements.                                            |
| `<scene>_annotated.png` | Per-scene overlay PNG. Skipped (non-blocking warning) when `_temp_annotate.py` is missing. |

Summary keys emitted at the top of `visual_audit.json`:

- `composition_pass_count`, `composition_warn_count`, `composition_fail_count`
  -- composition-mode rollup, weighted by visual checklist.
- `template_smoke_pass_count` -- template-mode skeletons; counted
  separately so sparse `PASS_TEMPLATE` scenes do not inflate the verdict.
- `primary_ratio_advisory` -- per-scene primary-ratio value reported
  alongside the checklist but no longer gating.

## Verdict ladder

| Mode        | Hard fails | Warn flags | Verdict       |
| ----------- | ---------- | ---------- | ------------- |
| composition | 0          | 0          | PASS          |
| composition | 0          | >=1        | WARN          |
| composition | >=1        | any        | FAIL          |
| template    | 0          | any        | PASS_TEMPLATE |
| template    | >=1        | any        | FAIL          |

Mode is detected from the template's `data-scene-mode` attribute on
`.scene-container`. `PASS_TEMPLATE` exists so sparse skeleton templates
(no `data-primary` tag, minimal placements) do not gate on composition
checks they were not authored to satisfy.

## Hard fails vs advisory

Hard fails block PASS regardless of mode:

- `clipped_artwork` -- placement bbox exceeds parent region bbox.
- `off_page` -- placement center or corner exits the 1920x1080 viewport.
- `svg_svg_overlap` -- placement bboxes intersect by >= 1 px.
- `region_overflow` -- region `scrollHeight > clientHeight` (or width).

Warn flags (advisory; demote PASS to WARN in composition mode, no effect
on hard-fail count):

- `label_label_overlap` -- placement label bboxes intersect.
- `region_whitespace > 80%` -- region occupancy below 20%.
- Visual checklist booleans (`primary_obvious`, `supporting_nearby`,
  `labels_readable`, `no_clipping`, `no_off_page`, `no_svg_overlap`)
  reported as `[x]` / `[ ]` in the Markdown report.

`primary_ratio_advisory` is reported per scene but does not gate the
verdict; treat it as a measurement signal for scene-class follow-up.

## Spike usage (well_plate_96_zoom)

The NEW1 well_plate_96_zoom spike uses a single-scene run to iterate on
the zoom-mode placement fill rule without re-auditing the other nine
templates.

The pinned canonical command lives at
[spike_fixtures/expected_precheck_command.md](spike_fixtures/expected_precheck_command.md);
this section mirrors it.

```bash
node experiments/css_native_layout/precheck.mjs \
    experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom.html \
    --out test-results/new1_spike/well_plate_96_zoom \
    --annotate on
```

Expected outputs (under `test-results/new1_spike/well_plate_96_zoom/`):

- `visual_audit.json` containing one scene entry for `well_plate_96_zoom`.
- `visual_audit.md` with the per-scene checklist and primary-ratio
  advisory.
- `sizing_manifest.json` for the placements on that single scene.
- `well_plate_96_zoom_annotated.png` (only if `_temp_annotate.py` is
  present; otherwise a non-blocking warning is logged and the PNG is
  skipped).

Baseline reference (from the stabilization pass, see
[PRECHECK_SUMMARY.md](PRECHECK_SUMMARY.md)):

- Mode: `composition`.
- Verdict: `WARN` (no hard fails; primary-ratio advisory below the 70%
  zoom-class target).
- `primary_ratio_advisory`: 88.7% post-stabilization (was 44.4% before
  the `.scene-mode--detail .placement` zoom fill rule was strengthened).

Spike success target: keep hard fails at 0 and move the primary-ratio
advisory upward without regressing any other checklist boolean.

## Spike usage: built-app precheck

NEW1 Task #73 implements a `render_and_dump.mjs` bridge script to support
precheck audits of the production runtime's rendered output. The script loads
the built app (dist/runtime.bundle.js), mounts a protocol via the runtime,
waits for the scene-chrome to render, and exports the DOM to a static HTML
file that precheck.mjs can audit.

Build with dev_smoke protocols enabled:

```bash
INCLUDE_DEV_SMOKE=true bash pipeline/build_runtime_bundle.sh
```

Run the render-and-dump bridge:

```bash
node experiments/css_native_layout/render_and_dump.mjs
```

Default output: `experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom_check.html`

Run precheck against the dumped file:

```bash
node experiments/css_native_layout/precheck.mjs \
    experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom_check.html \
    --out test-results/new1_spike/built_app_precheck \
    --annotate off
```

## Dynamic DOM precheck bridge usage

The render_and_dump.mjs bridge is a NEW2 hardening tool that makes the dump-to-precheck chain predictable and documented. It supports the following canonical workflow for auditing the production runtime's rendered layout without manual DOM manipulation or workarounds.

### Canonical command sequence

Build the runtime with dev_smoke protocols:

```bash
INCLUDE_DEV_SMOKE=true bash pipeline/build_runtime_bundle.sh
```

Run the bridge to dump the production runtime's rendered DOM:

```bash
node experiments/css_native_layout/render_and_dump.mjs
```

Output path is deterministic and predictable: `experiments/css_native_layout/spike_fixtures/spike_rendered/<protocol_name>.html`. Default protocol is `well_plate_96_zoom_check`; override with `--protocol <name>`.

Run precheck against the dumped HTML:

```bash
node experiments/css_native_layout/precheck.mjs \
    experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom_check.html \
    --out test-results/new1_spike/render_dump \
    --annotate off
```

Alternative: use the wrapper script (if available) which chains all three steps with sensible defaults:

```bash
bash experiments/css_native_layout/run_built_app_precheck.sh
```

### Shadow div injection mechanism

The bridge measures real SVG geometry from the production renderer via `getBoundingClientRect()` and injects precheck-compatible shadow divs into the static HTML export. This bridges two rendering models:

- **Production renderer**: emits SVG objects positioned by the scene-runtime's CSS-native layout engine. SVG is non-interactive after dump and cannot be scored by precheck's bbox-based checks.
- **precheck**: expects static HTML with `.placement` divs and `.region` containers. It measures `.placement-label` text and `.object-graphic` artwork inside those divs.

The shadow injection (render_and_dump.mjs lines 403-532) creates synthetic HTML structure that wraps the dumped SVG, measuring real on-screen positions and creating placeholder `.placement` and `.placement-label` divs at those positions. precheck can then score the dumped output as if the SVG objects were HTML placements.

### Bridge integrity guardrail

The bridge enforces a critical runtime assertion: `.placement` element count must never decrease during DOM extraction. The assertion runs at [render_and_dump.mjs line 567-574](render_and_dump.mjs#L567) immediately after DOM extraction and before writing to file.

**Rule**: No post-processing of `extracted_html` may remove, hide, or filter `.placement` elements. The extracted HTML must reflect the real rendered DOM; if a different scene shape is needed for testing, change the scene definition itself, not the dump.

**Metric-gaming prevention**: This guardrail prevents an agent or developer from silently removing problematic placements from the dump to artificially improve precheck's verdict. A violation throws:

```
Bridge guardrail violation: placement count decreased N -> M; metric-gaming forbidden
```

Allowed post-processing (non-rendering assets): script tags unrelated to layout may be removed if truly needed, but they must not alter the count of `.placement` divs in the extracted HTML.

### Known limitations

Without shadow div injection, precheck cannot process dumped production-runtime HTML. The limitations are documented:

- **Precheck expects HTML div placement structures**: render_and_dump.mjs injects synthetic divs around the SVG. Without injection, precheck will report zero placements and zero score.
- **Production renderer emits SVG**: the runtime's scene-runtime outputs SVG objects, not HTML divs. SVG bounding boxes are real (measured via getBoundingClientRect), but the structure is not native precheck format.
- **Hard fail count reflects real layout issues**: hard fails (clipped_artwork, off_page, svg_svg_overlap, region_overflow) are measured from actual SVG geometry. They are not artifacts of the injection; they represent real layout problems in the production render.
- **Label and artwork metrics are shadow proxies**: synthetic `.placement-label` elements have zero natural text content. precheck's label-readability checks operate on synthetic divs, not the SVG's internal text. If a real label is clipped in the SVG, the shadow label will report the clipping, but label height and font metrics are not measured from the SVG's actual text elements.

## Scorecard generation (canonical rule)

After running precheck.mjs, generate layout quality scores using the canonical scorecard tool:

```bash
node experiments/css_native_layout/score_layout.mjs
```

The scorecard reads the precheck output (`visual_audit.json`, `sizing_manifest.json`) and emits a scored ranking (`scorecard.json`, `scorecard.md`).

**Critical rule**: Scorecard claims must be produced by running `score_layout.mjs` directly. Helper scripts may prepare INPUT (aggregate precheck runs, filter scenes) but must NOT reimplement scoring logic.

Every scorecard report must cite the exact bash command that produced it. See the canonical scorecard rule (docs/active_plans/new3_batch3_canonical_scorecard_rule.md) for detailed requirements and the Batch 2 Workstream O case study (where scorecard methodology mismatch caused false regression signals).

Canonical workflow:

```bash
# Step 1: Run precheck
node experiments/css_native_layout/precheck.mjs \
  'experiments/css_native_layout/templates/*.html' \
  --out test-results/new3_audit

# Step 2: Run scorecard
node experiments/css_native_layout/score_layout.mjs

# Output: test-results/new0_css_native/scorecard/scorecard.{json,md}
```

Comparison scorecard (two directories):

```bash
node experiments/css_native_layout/score_layout.mjs \
  --compare test-results/dir1/audit test-results/dir2/audit
```

## Troubleshooting

| Symptom                                  | Likely cause                                                 | Fix                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `Cannot find module 'playwright'`        | Ran the script from outside the repo root.                   | `cd` to the repo root, then re-run. See [../../docs/PLAYWRIGHT_USAGE.md](../../docs/PLAYWRIGHT_USAGE.md). |
| `Executable doesn't exist` (Chromium)    | Browser binaries not installed.                              | `npx playwright install` from the repo root.                                                              |
| `_temp_annotate.py: not found` warning   | Pillow annotation helper absent from working tree.           | Non-blocking; per-scene PNG is skipped. JSON/MD reports still write.                                      |
| Empty `visual_audit.json` (`scenes: []`) | Positional pattern matched zero files (often a quoting bug). | Quote the glob, or pass an explicit `.html` path.                                                         |
| `WARN` on `labels_readable` only         | Label collision in tight composition scenes.                 | Composition-class concern, not a precheck bug. Adjust template / CSS, not the audit.                      |
| Hard fail `off_page` after CSS edit      | Placement was pushed outside the 1920x1080 viewport.         | Revert or constrain via `max-width` / `flex-basis` on the parent region.                                  |
| `region_overflow` after density bump     | Region `scrollHeight` exceeded `clientHeight`.               | Lower placement count or relax region height; do not add `overflow: hidden` (it would mask the fail).     |
