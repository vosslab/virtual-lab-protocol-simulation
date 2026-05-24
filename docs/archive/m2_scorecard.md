# M2 TypeScript Renderer Layout Scorecard

**Evidence Source:** M2 TypeScript renderer DOM analysis via Playwright

Generated: 2026-05-24T00:56:29.806Z
Total scenes: 6

## Comparison to M0 Static Templates

| Scene | M2 Score | M0 Score | Delta | M0 Hard Fails |
| --- | --- | --- | --- | --- |
| bench_basic | 95 | 0 | +95 | 1 |
| bench_basic_row_slot | 95 | N/A | - | - |
| sample_prep_bench | 95 | N/A | - | - |
| hood_basic | 95 | 60 | +35 | 0 |
| staining_bench | 77 | 0 | +77 | 3 |
| cell_counter_basic | 54 | 0 | +54 | 1 |

## Ranked Scenes (by total_layout_score)

| Rank | Scene | Class | Score | Hard Fails | Placements | Labels | Top Worst | Rec. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bench_basic | template | 95 | 0 | 2 | 2 | balance | balance_distribution |
| 2 | bench_basic_row_slot | template | 95 | 0 | 2 | 2 | balance | balance_distribution |
| 3 | sample_prep_bench | template | 95 | 0 | 5 | 5 | balance | balance_distribution |
| 4 | hood_basic | template | 95 | 0 | 4 | 4 | balance | balance_distribution |
| 5 | staining_bench | template | 77 | 0 | 10 | 10 | label_overlap | label_separation |
| 6 | cell_counter_basic | composition | 54 | 0 | 2 | 2 | primary_area_ratio | primary_area_increase |

## Per-Scene Breakdown

### bench_basic

- **Class**: template
- **Total Score**: 95/100
- **Hard Fails**: 0
- **Placements**: 2
- **Labels**: 2
- **Primary Area Ratio**: 0.8%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 1 |
| label_overlap | 100 |
| scene_occupied | 1 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 100 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 81 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| balance | 75 | 5 |
| primary_area_ratio | 1 | 0 |
| label_overlap | 100 | 0 |

#### Recommendation

- **Adjustment**: balance_distribution
- **Action**: Reposition to fill empty quadrants evenly

### bench_basic_row_slot

- **Class**: template
- **Total Score**: 95/100
- **Hard Fails**: 0
- **Placements**: 2
- **Labels**: 2
- **Primary Area Ratio**: 0.8%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 1 |
| label_overlap | 100 |
| scene_occupied | 1 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 100 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 81 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| balance | 75 | 5 |
| primary_area_ratio | 1 | 0 |
| label_overlap | 100 | 0 |

#### Recommendation

- **Adjustment**: balance_distribution
- **Action**: Reposition to fill empty quadrants evenly

### sample_prep_bench

- **Class**: template
- **Total Score**: 95/100
- **Hard Fails**: 0
- **Placements**: 5
- **Labels**: 5
- **Primary Area Ratio**: 0.6%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 1 |
| label_overlap | 100 |
| scene_occupied | 1 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 100 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 100 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| balance | 75 | 5 |
| primary_area_ratio | 1 | 0 |
| label_overlap | 100 | 0 |

#### Recommendation

- **Adjustment**: balance_distribution
- **Action**: Reposition to fill empty quadrants evenly

### hood_basic

- **Class**: template
- **Total Score**: 95/100
- **Hard Fails**: 0
- **Placements**: 4
- **Labels**: 4
- **Primary Area Ratio**: 0.7%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 1 |
| label_overlap | 100 |
| scene_occupied | 2 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 100 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 79 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| balance | 75 | 5 |
| primary_area_ratio | 1 | 0 |
| label_overlap | 100 | 0 |

#### Recommendation

- **Adjustment**: balance_distribution
- **Action**: Reposition to fill empty quadrants evenly

### staining_bench

- **Class**: template
- **Total Score**: 77/100
- **Hard Fails**: 0
- **Placements**: 10
- **Labels**: 10
- **Primary Area Ratio**: 2.3%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 2 |
| label_overlap | 70 |
| scene_occupied | 5 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 85 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 100 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| label_overlap | 70 | 12 |
| label_readability | 85 | 6 |
| balance | 75 | 5 |

#### Recommendation

- **Adjustment**: label_separation
- **Action**: Move/resize labels; eliminate overlaps

### cell_counter_basic

- **Class**: composition
- **Total Score**: 54/100
- **Hard Fails**: 0
- **Placements**: 2
- **Labels**: 2
- **Primary Area Ratio**: 6.1%

#### Metrics

| Metric | Score |
| --- | --- |
| primary_area_ratio | 6 |
| label_overlap | 100 |
| scene_occupied | 7 |
| support_distance | 75 |
| balance | 75 |
| region_filling | 75 |
| label_readability | 100 |
| aspect_ratio_fidelity | 100 |
| primary_prominence | 100 |

#### Top 3 Worst Metrics

| Metric | Score | Penalty |
| --- | --- | --- |
| primary_area_ratio | 6 | 23 |
| scene_occupied | 7 | 14 |
| support_distance | 75 | 5 |

#### Recommendation

- **Adjustment**: primary_area_increase
- **Action**: Enlarge primary object or re-tag data-primary

