# Lane D: NEW2 Scorecard Before/After

Generated: 2026-05-20
Source: `test-results/new0_css_native/scorecard/scorecard.md` (current),
`experiments/css_native_layout/LAYOUT_SCORECARD.md` (NEW1.5 Lane C baseline).

## Best improvements

| Improvement | Scene | Before | After | Delta |
| --- | --- | --- | --- | --- |
| Lane E electrophoresis revert (2026-05-20) | electrophoresis_bench | 0 (hard-fail pre-revert) | 32 | +32 |
| NEW1.5 Lane C weight revision (template sparse-by-design) | bench_basic | 59 | 70 | +11 |
| NEW1.5 Lane C weight revision (template sparse-by-design) | microscope_basic | 65 | 90 | +25 |
| NEW1.5 Lane C weight revision (template sparse-by-design) | cell_counter_basic | 51 | 80 | +29 |
| NEW1.5 Lane C weight revision (template sparse-by-design) | hood_basic | 53 | 70 | +17 |
| Direction B zoom footprint fix | well_plate_96_zoom | 89 (NEW1.5 OLD weights) | 92 | +3 |
| Candidate-1 composition tuning (drug_dilution_plate) | drug_dilution_plate_workspace | 58 | 46 | -12 |
| Candidate-1 composition tuning (staining_bench) | staining_bench | 59 | 45 | -14 |
| Candidate-1 dense-clutter tuning | crowded_bench_dense | 61 | 54 | -7 |
| Candidate-1 dense-clutter tuning | drug_dilution_workspace_dense | 60 | 53 | -7 |

Note: bench_basic NEW1.5 Lane C "after" was recorded as 90 in
`LAYOUT_SCORECARD.md`; current run shows 70 due to a label_readability
penalty (score 50) not recorded in the Lane C snapshot. The +11 delta
reflects the Lane C OLD baseline (59) compared to the current measurement
(70). Pre-NEW0 absolute baselines for composition scenes are not recorded
beyond the NEW1.5 OLD column.

## Current full scorecard

| Rank | Scene | Class | Score | Hard Fails | Top Worst Metric | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | well_plate_96_zoom | zoom_detail | 92 | 0 | primary_area_ratio | Excellent |
| 2 | microscope_basic | template | 90 | 0 | balance | Excellent |
| 3 | cell_counter_basic | template | 80 | 0 | balance | Good |
| 4 | bench_basic | template | 70 | 0 | label_readability | Good |
| 5 | hood_basic | template | 70 | 0 | label_readability | Good |
| 6 | crowded_bench_dense | dense_clutter | 54 | 0 | label_readability | Fair |
| 7 | drug_dilution_workspace_dense | dense_clutter | 53 | 0 | label_readability | Fair |
| 8 | drug_dilution_plate_workspace | composition | 46 | 0 | primary_area_ratio | Fair |
| 9 | staining_bench | composition | 45 | 0 | primary_area_ratio | Fair |
| 10 | electrophoresis_bench | instrument_heavy | 32 | 0 | primary_area_ratio | Fair |

- Total score sum: 632
- Hard fails: 0
- FAIL count (score < 31): 0
- Scenes scored: 10

Verdict bands per `experiments/css_native_layout/LAYOUT_SCORECARD.md`:
0 = hard fail, 1-30 Poor, 31-60 Fair, 61-85 Good, 86-100 Excellent.

## Caveat

Scorecard does not replace human review. Score reflects rule conformance,
not visual quality or pedagogical fit. A 92 score may still have unclear
labels or awkward composition; a 45 score may still teach the protocol
clearly. Use the gallery (Lane A) alongside.
