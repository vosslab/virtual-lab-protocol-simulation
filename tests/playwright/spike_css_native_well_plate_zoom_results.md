# spike_css_native_well_plate_zoom: results

Empirical evidence for NEW1 CSS-native adapter spike (Lane 3 browser proof and
Lane 4 perf measurement).

- Test file: tests/playwright/spike_css_native_well_plate_zoom.mjs
- Run command: `node tests/playwright/spike_css_native_well_plate_zoom.mjs`
- Run host: macOS, headless Chromium via the `playwright` library

## Summary

11 / 11 assertions passed. Exit code 0.

## Lane 3 (browser proof) assertions

| Assertion                   | Status | Detail                                                               |
| --------------------------- | ------ | -------------------------------------------------------------------- |
| flag_enabled                | PASS   | `is_enabled()` returned true after `set_enabled(true)`               |
| result_is_array_of_length_1 | PASS   | one placement in fixture, one layout returned                        |
| width_positive              | PASS   | width=1800 px                                                        |
| height_positive             | PASS   | height=968 px                                                        |
| x_is_number                 | PASS   | x=-300 (placement spans wider than scaffold; expected from CSS rule) |
| y_is_number                 | PASS   | y=28                                                                 |
| id_matches_placement_name   | PASS   | id=`zoom_well_plate_96`                                              |
| screenshot_saved            | PASS   | `test-results/new1_spike/lane3_browser_proof.png`                    |

The non-zero width and height confirm the scaffold was actually mounted, the
browser CSS engine ran layout, and `getBoundingClientRect()` returned real
geometry. The negative x is an artifact of the spike CSS rule
`.scene-mode--detail .placement { min-width: 1800px; min-height: 950px }`,
which sizes the placement larger than the 1200 px viewport scaffold; this is
a property of the experiments CSS, not a bug in the adapter.

## Lane 4 (perf measurement) results

```
PERF: median_ms=0.000 p95_ms=0.100 max_ms=0.200 nodes_per_call=2 body_children_delta=0
```

- 50 invocations of `compute_scene_layout_css_native` measured via `performance.now()`.
- Median, p95, and max are all well under the 50 ms sanity bound.
- `nodes_per_call=2`: 1 region element (`work_surface`) plus 1 placement element.
  The 1-placement fixture declares the `work_surface` zone, so
  `derive_region_list` returns just that zone; the fallback 5-region vocabulary
  is not triggered.
- `body_children_delta=0`: after 50 calls, `document.body.children.length` is
  unchanged. The scaffold is fully torn down each call. No DOM leak.

## Known gaps (require fuller integration in a follow-up round)

The production scene_runtime bundle is not directly Playwright-loadable
without `build_github_pages.sh` running first. This spike therefore inlines a
JS mirror of `compute_scene_layout_css_native` and the feature-flag setter
inside the test file. Sync risk: the mirror must be kept in step with
`src/scene_runtime/layout/css_native_adapter.ts` and
`src/scene_runtime/layout/feature_flags.ts`. The mirror is documented inside
the test file with the same comment.

The following empirical checks are NOT covered by this test and remain open:

1. Click-target empirical proof through the full production `renderScene` plus
   protocol dispatch pipeline. Requires a built bundle plus an SVG-loaded
   scene; planned for a follow-up round once the build step is wired into the
   Playwright fixture (or a fuller integration test loads the generated
   bundle).
2. `ObjectStateChange` proof through the full production pipeline. Same
   dependency on a built bundle.

Both are recorded as Lane 3 / Lane 4 follow-on work, not blockers for the
spike's adapter-level empirical evidence.

## Artifacts

- Screenshot: `test-results/new1_spike/lane3_browser_proof.png`
- Structured summary: `test-results/new1_spike/spike_run_summary.json`
