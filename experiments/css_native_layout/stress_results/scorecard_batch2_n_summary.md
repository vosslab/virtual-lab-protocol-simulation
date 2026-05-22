# Workstream N Scorecard Summary (batch2_n vs batch1)

## Metrics Summary

### Batch1 (Baseline)

- Min score: 0
- Max score: 53
- Median score: 41.0
- Mean score: 38.6
- P95 score: 50
- Total scenes: 110

### Batch2_N (Post-Workstream N)

- Min score: 0
- Max score: 70
- Median score: 40.0
- Mean score: 39.5
- P95 score: 70
- Total scenes: 110

### Deltas (Batch2_N - Batch1)

- Median delta: -1.0
- Mean delta: +0.9
- P95 delta: +20.0

## Top 5 Most-Improved Scenes

| Rank | Scene Name          | Batch1 | Batch2_N | Delta |
| ---- | ------------------- | ------ | -------- | ----- |
| 1    | stress_template_015 | 46     | 70       | +24   |
| 2    | stress_template_002 | 49     | 70       | +21   |
| 3    | stress_template_007 | 50     | 70       | +20   |
| 4    | stress_template_006 | 50     | 70       | +20   |
| 5    | stress_template_019 | 50     | 70       | +20   |

## Top 5 Most-Degraded Scenes

| Rank | Scene Name                   | Batch1 | Batch2_N | Delta |
| ---- | ---------------------------- | ------ | -------- | ----- |
| 1    | stress_composition_001       | 43     | 31       | -12   |
| 2    | stress_long_label_scene_002  | 40     | 27       | -13   |
| 3    | gold_drug_dilution_workspace | 53     | 39       | -14   |
| 4    | gold_staining_bench          | 53     | 38       | -15   |
| 5    | stress_dense_clutter_014     | 49     | 33       | -16   |

## Score Distribution

### Batch1 Score Histogram

| 0- 10 | 2 ( 1.8%) |
| 10- 20 | 4 ( 3.6%) | #
| 20- 30 | 18 ( 16.4%) | ########
| 30- 40 | 20 ( 18.2%) | #########
| 40- 50 | 57 ( 51.8%) | #########################
| 50- 60 | 9 ( 8.2%) | ####
| 60- 70 | 0 ( 0.0%) |
| 70- 80 | 0 ( 0.0%) |
| 80- 90 | 0 ( 0.0%) |
| 90-100 | 0 ( 0.0%) |

### Batch2_N Score Histogram

| 0- 10 | 2 ( 1.8%) |
| 10- 20 | 4 ( 3.6%) | #
| 20- 30 | 18 ( 16.4%) | ########
| 30- 40 | 26 ( 23.6%) | ###########
| 40- 50 | 37 ( 33.6%) | ################
| 50- 60 | 10 ( 9.1%) | ####
| 60- 70 | 5 ( 4.5%) | ##
| 70- 80 | 8 ( 7.3%) | ###
| 80- 90 | 0 ( 0.0%) |
| 90-100 | 0 ( 0.0%) |

## Notes

- Workstream N applied max-height changes: handheld 260px, small-tool 200px
- Scorecard generated from precheck_batch2_n output
- Comparison against precheck_batch1 baseline
- All 110 stress scenes included
