# CSS-native runtime performance profile

Generated: 2026-05-20T22:03:40.680Z

Scenes profiled: 10

Re-render iterations: 50 (DOM/heap long run: 500)

## CORRECTION: misattributed adapter cost

The "adapter_call_time_ms" median of 11.9 ms reported below is NOT pure
adapter cost. It is Playwright cross-process round-trip + renderScene wall
time divided by invocation count. NEW3-Batch2-H deep-profile measured the
actual adapter at 0.1 ms p99 for 1 placement and 0.6 ms p99 for 200
placements (~1 us per placement).

The 11.9 ms threshold FAIL below is therefore a measurement artifact, not
an adapter regression. The real ceiling is in the renderScene/dispatch
path, not in compute_scene_layout_css_native.

See `runtime_hotpath_profile.md` for the corrected breakdown.

## Headline metrics

| Metric | median | p95 | max | mean |
| --- | --- | --- | --- | --- |
| adapter call time (ms) | 11.9 | 11.9 | 11.9 | 11.9 |
| render_and_dump (ms) | 33475 | 33481 | 33481 | 33458.1 |
| precheck per scene (ms) | 26 | 32 | 32 | 24 |
| scorecard per scene (ms) | 4.7 | 5.5 | 5.5 | 4.933 |
| full built-app render (ms) | 63 | 63 | 63 | 62.8 |
| ObjectStateChange re-render (ms) | 2005 | 2007.1 | 2007.7 | 1965.036 |

## Resource growth

| Snapshot | DOM nodes | heap (bytes) |
| --- | --- | --- |
| mount | 166 | 15200000 |
| after 50 iter | 167 | 15200000 |
| after 500 iter | 167 | 15200000 |
| growth (500 iter) | 1 | 0 |
| growth per iter | 0.002 | - |

getBoundingClientRect calls per render (approx): 0

CI practical total (sum of full-render + precheck-batch + scorecard-batch): 352.33 ms

## Threshold verdicts

| Metric | value | threshold | verdict |
| --- | --- | --- | --- |
| adapter_median | 11.9 | 5 | FAIL |
| adapter_p95 | 11.9 | 20 | PASS |
| dom_growth_per_iter | 0.002 | 0 | FAIL |
| precheck_per_scene | 32 | 2000 | PASS |
| scorecard_per_scene | 5.5 | 1000 | PASS |
| full_render | 63 | 5000 | PASS |
| heap_growth_500 | 0 | 10485760 | PASS |
| object_state_change_rerender_p95 | 2007.1 | 50 | FAIL |
| ci_practical_total | 352.33 | 60000 | PASS |

## Re-render time sparkline (50 iterations)

```
 min=11.9 ms                                max=2007.7 ms
########################################M   (M=median, P=p95)
```

## Recommendations

- adapter call time exceeds threshold: profile `compute_scene_layout_css_native` hot path; reduce per-element bounding-box reads or memoize layout state.
- DOM is growing per re-render: an ObjectStateChange path is appending nodes instead of mutating in place. Audit renderScene cleanup.
- repeated ObjectStateChange p95 above 50 ms causes janky interaction; batch ObjectStateChange updates or memoize per-frame layout.
