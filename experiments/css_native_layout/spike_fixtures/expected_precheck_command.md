# Expected precheck command

Exact command, working directory, and expected output paths for the NEW1
spike precheck run. See NEW1 plan section 3 step 4 and section 5 hard-fail
gates in
[new1_css_native_layout_integration_plan.md](../../../docs/archive/css_native_layout/new1_css_native_layout_integration_plan.md).

## Command line

```
node experiments/css_native_layout/precheck.mjs \
    experiments/css_native_layout/spike_fixtures/spike_rendered/well_plate_96_zoom.html \
    --out test-results/new1_spike/well_plate_96_zoom \
    --annotate on
```

The spike implementation step renders the production-runtime DOM for
`well_plate_96_zoom` to the path passed as the first argument
(`.../spike_rendered/well_plate_96_zoom.html`). That rendered HTML is the
input the precheck runner audits; the runner itself is the existing
[../precheck.mjs](../precheck.mjs) and is not modified by the spike.

## Working directory

Repo root:

```
/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation
```

The Playwright resolution rule in
[../../../docs/PLAYWRIGHT_USAGE.md](../../../docs/PLAYWRIGHT_USAGE.md)
requires running Node scripts from the project root so
`node_modules/playwright` resolves. Do not invoke from `/tmp` or from a
subdirectory.

## Expected output paths under test-results/

The precheck runner writes its artifacts under the directory passed to
`--out`. The spike pins this to `test-results/new1_spike/well_plate_96_zoom/`.

| Output               | Path                                                                             | Notes                                                            |
| -------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Annotated screenshot | `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.annotated.png`    | Annotated overlay used for visual review                         |
| Raw screenshot       | `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.png`              | Unannotated capture for pixel-diff vs current production         |
| Diagnostics JSON     | `test-results/new1_spike/well_plate_96_zoom/well_plate_96_zoom.diagnostics.json` | Per-scene diagnostics; section 5 hard-fail counts read from here |
| Summary JSON         | `test-results/new1_spike/well_plate_96_zoom/summary.json`                        | Aggregate verdict; spike gate consumes this                      |

Exact filenames inside the `--out` directory follow whatever
[../precheck.mjs](../precheck.mjs) emits today; the spike does not rename
runner outputs. The paths above describe the directory the spike commits
to as the canonical location.

## Pass condition

NEW1 plan section 9 success gate requires precheck hard-fail count = 0 on
the rendered scene. Hard-fail categories are listed in plan section 5:
`clipped_artwork`, `off_page`, `svg_svg_overlap`, `region_overflow`,
`label_label_overlap`.
