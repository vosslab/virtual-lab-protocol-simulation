# NEW0 Visual Diagnostic Precheck — Tracked-Code Audit

## Status

This document supersedes the previous `PRECHECK_SUMMARY.md`. The previous
version measured templates that linked **gitignored** CSS variants
(`bench_c.css`, `bench_e.css`, `hood_c.css`, `instrument_c.css`). Per the
outside-review handoff at
[docs/active_plans/new0_outside_review_handoff.md](../../docs/active_plans/new0_outside_review_handoff.md),
the audit evidence is now reproducible: every template links the **tracked**
CSS per workspace family (`bench.css`, `hood.css`, `instrument.css`), and
this summary reflects a re-run of `precheck.mjs` against that state.

For the decision memo about which CSS variant was promoted to tracked and
the status of `PASS_TEMPLATE`, `data-primary`, and primary-ratio thresholds,
see [DECISION_MEMO.md](DECISION_MEMO.md).

## Source under audit

- Tracked workspace CSS (one file per family):
  - `experiments/css_native_layout/styles/bench.css` (365 LOC)
  - `experiments/css_native_layout/styles/hood.css` (311 LOC)
  - `experiments/css_native_layout/styles/instrument.css` (310 LOC)
- 8 templates, all linking `../styles/<workspace>.css` only:
  - `bench_basic.html`, `cell_counter_basic.html`,
    `drug_dilution_plate_workspace.html`, `electrophoresis_bench.html`,
    `hood_basic.html`, `microscope_basic.html`, `staining_bench.html`,
    `well_plate_96_zoom.html`

Verification: run
`bash _temp_inspect_links.sh` (or `grep -n stylesheet
experiments/css_native_layout/templates/*.html`) — no template links a
`_<letter>.css`, `_diorama.css`, `_focusedstage.css`, or `_gameboard.css`
variant.

## File produced

- `experiments/css_native_layout/precheck.mjs` — standalone Playwright
  diagnostic. Reads HTML templates, computes per-scene visual checks, emits
  `visual_audit.{json,md}` and `sizing_manifest.json`.

## DOM conventions used

| Selector | Purpose |
| --- | --- |
| `.placement` | Object placement container; data-placement-name, data-object-name attributes |
| `.placement-label` | Text label for each placement |
| `.object-graphic` | SVG/image container inside placement |
| `.region` | Semantic region container; data-region attribute |
| `.scene-container` | Top-level scene viewport; data-scene-mode, data-scene-density |

## Diagnostic algorithms (one sentence each)

1. **clipped_artwork** — placements whose bbox exceeds parent region bbox.
2. **off_page** — placements whose center or corners lie outside the 1920x1080 viewport.
3. **svg_svg_overlap** — placement-bbox intersection pairs (>=1 px).
4. **label_label_overlap** — placement-label-bbox intersection pairs.
5. **svg_label_overlap** — object-graphic vs foreign placement-label intersection.
6. **region_overflow** — region scrollHeight > clientHeight (or width).
7. **region_whitespace** — occupied_area / region_area; flags regions >80% empty.
8. **scene_whitespace** — scene-level occupied_area / scene_area ratio.
9. **primary_object** — identified via `data-primary="true"` (fallback: first
   placement in `primary_work_surface` / `work_surface`, else largest bbox);
   reports area_ratio; flags <25% (non-zoom) or <70% (zoom).
10. **largest_empty_band** — largest empty quadrant of the scene.
11. **supporting_distance** — each non-primary placement's normalized
    distance to the primary's center.

Artwork-integrity sub-checks:

- **a — natural vs rendered aspect / area**: compares natural image
  dimensions to rendered bbox.
- **b — outside card**: flags artwork bbox extending beyond placement card.
- **c — region clip**: artwork bbox clipped by region.
- **d — label clip**: label bbox clipped by region.

## Verdict ladder

| Mode | Hard fails | Warn flags | Verdict |
| --- | --- | --- | --- |
| composition | 0 | 0 | PASS |
| composition | 0 | >=1 | WARN |
| composition | >=1 | any | FAIL |
| template | 0 | any | PASS_TEMPLATE |
| template | >=1 | any | FAIL |

`PASS_TEMPLATE` and the `data-primary` attribute were introduced in the
P2.5 cleanup patch (2026-05-18). Both are mid-flight amendments to the
controlling plan's verdict vocabulary. See [DECISION_MEMO.md](DECISION_MEMO.md)
for the disposition.

Hard fails: `clipped_artwork`, `off_page`, `svg_svg_overlap`,
`region_overflow`.
Warn flags: `label_label_overlap`, `region_whitespace >80%`, primary-ratio
flag.

## Output files

- `test-results/new0_css_native/audit/visual_audit.json` — machine report.
- `test-results/new0_css_native/audit/visual_audit.md` — human report.
- `test-results/new0_css_native/audit/sizing_manifest.json` — per-placement
  natural vs rendered measurements.
- `test-results/new0_css_native/audit/*_annotated.png` — overlay PNGs (when
  the `_temp_annotate.py` helper is present; missing helper is a
  non-blocking warning).

## CLI usage

```bash
node experiments/css_native_layout/precheck.mjs <html_path_or_glob> [--out <dir>] [--annotate on|off]
```

Examples:

```bash
node experiments/css_native_layout/precheck.mjs experiments/css_native_layout/templates/drug_dilution_plate_workspace.html
node experiments/css_native_layout/precheck.mjs 'experiments/css_native_layout/templates/*.html'
```

Defaults: `--out test-results/new0_css_native/audit`, `--annotate on`.

## Cleaned-audit results (8 scenes, tracked CSS only)

Run date: 2026-05-18 (post outside-review handoff cleanup).

| Scene | Mode | Verdict | Primary ratio | Notable warn flags |
| --- | --- | --- | --- | --- |
| bench_basic | template | PASS_TEMPLATE | — | — |
| cell_counter_basic | template | PASS_TEMPLATE | — | — |
| drug_dilution_plate_workspace | composition | WARN | 1.4% < 25% | aspect mismatch + outside-card on 6 placements |
| electrophoresis_bench | composition | WARN | 2.7% < 25% | upscaling + outside-card on 11 placements |
| hood_basic | template | PASS_TEMPLATE | — | — |
| microscope_basic | template | PASS_TEMPLATE | — | — |
| staining_bench | composition | WARN | 0.7% < 25% | upscaling + outside-card on 5 placements |
| well_plate_96_zoom | composition | PASS | 875.5% (zoom) | — |

**Summary**: 8 scenes, 0 hard fails, 0 FAIL verdicts. 1 PASS, 4
PASS_TEMPLATE, 3 WARN.

## Deltas vs previous (pre-cleanup) audit

| Scene | Previous primary ratio | Cleaned primary ratio | Why |
| --- | --- | --- | --- |
| drug_dilution_plate_workspace | 12.9% | 1.4% | template was linking `bench_e.css` (Direction E primary-workspace tuning); now links tracked `bench.css` (Direction C, smaller well plate sizing) |
| electrophoresis_bench | 1.2% | 2.7% | unchanged CSS family (bench_c -> bench); ratio shifts come from `data-primary` resolution differences |
| staining_bench | 0.2% | 0.7% | unchanged CSS family (bench_c -> bench); minor measurement drift |

No verdict changes: pre and post-cleanup both produce 0 FAIL, 1 PASS, 4
PASS_TEMPLATE, 3 WARN. The primary-ratio shifts confirm the outside-review
concern is real (scratch numbers do not reflect tracked code), but the
overall picture is the same: the three composition scenes still warn on
primary ratio under the unsourced 25% threshold.

## Notes on residual risks and limitations

1. **Annotation helper missing** — `_temp_annotate.py` (the Pillow overlay
   helper invoked by `precheck.mjs`) is not present in the working tree at
   the time of this audit; the precheck reports a non-blocking warning and
   skips annotated-PNG generation. Visual review can still inspect base
   captures (currently in `test-results/new0_css_native/audit/captures/`
   from prior runs; this audit run did not produce new base captures
   because annotation is the trigger).
2. **Primary-ratio threshold is unsourced** — the 25% and 70% cutoffs are
   not derived from a calibrated reference. With three of four composition
   scenes warning against them, the threshold, the metric, or the scenes
   are wrong; likely all three. Treat the WARN verdicts here as
   measurement signals, not failures.
3. **Viewport fixed at 1920x1080** — precheck does not test resize
   behavior. Resize-test functionality lives in capture.mjs.
4. **Artwork integrity diagnostics show systematic aspect mismatch** —
   bottles render at ~110 px tall against natural 150 px (forced height
   shrink); pipettes and slim tools render at upscaled widths. This is a
   consequence of the current `.object-graphic img { width: auto;
   height: auto; max-width: 100%; max-height: 100%; object-fit: contain }`
   rule clipped to discrete footprint min/max boxes whose aspect ratios
   diverge from natural artwork. Not a precheck bug; it is the real CSS
   behavior. Reviewing whether to (a) tighten footprint aspect to artwork,
   (b) accept the mismatch as design intent, or (c) source artwork per
   footprint band is open work, recorded in the decision memo.

## Dependency audit

- No imports from `src/`, `pipeline/`, `validation/`, or `docs/specs/`.
- Only external dependency: `playwright` (in devDependencies).
- Node built-ins: `path`, `fs`, `url`.

## Next steps

NEW0 is paused at the cleaned-audit checkpoint. Per the outside-review
handoff, no NEW0 verdict scoring and no NEW1 plan opening until the user
reads this summary plus [DECISION_MEMO.md](DECISION_MEMO.md) and decides
how to proceed.
