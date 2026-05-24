# Scene-design lint plan (v1) - composition quality scorecard

Python tool that scores scene YAMLs on **composition quality** at
authoring time. Mirrors the post-render `LAYOUT_SCORECARD.md` model
but consumes simulator output instead of `precheck.mjs` output - so it
runs in seconds, in a pre-commit hook, against a YAML the author is
actively editing.

This tool **never blocks builds.** Composition quality is a gradient;
the right tool is a score plus a PR-diff budget, not a verdict ladder.

## Scope, in relation to other tools

| Tool | Question | Verdict shape | Build action |
|---|---|---|---|
| Existing vocab lint | "Is the YAML valid?" | error / ok | fail on error |
| `SCENE_LINT_PLAN.md` (sibling) | "Will it render?" | `BLOCKED` / `ESCAPE_REQUIRED` / `CLEAN` | block / report |
| **This tool** | "Is this a good scene to teach with?" | 0-100 score per scene | never blocks; PR-diff budget |
| `LAYOUT_SCORECARD.md` runner | Same question, after render | 0-100 from precheck output | retroactive only |

The render predictor and the design-quality scorer share the simulator
(layout port from `src/scene_runtime/layout/`) as a library, but
produce different output shapes for different audiences:

- Render predictor -> engineers; pass/fail; CI integration.
- Design scorer -> designers / pedagogy team; ranked metrics; review tool.

## Why a separate tool

Coupling quality scoring to a render-failure gate has failed in this
codebase before (`m1_trial_summary` documents 7 CSS trials chasing
precheck hard-fail counts that included composition advisories;
`LAYOUT_SCORECARD.md` revised weights in NEW1.5 to stop conflating
"sparse template" with "broken scene"). Quality is class-dependent and
gradient; render failure is uniform and binary. Two outputs, two tools.

## Motivation

Designers and reviewers need a single comparable number to evaluate
scenes. "11 warnings, all suppressed last sprint" is not a useful
signal; "score 72, down from 78 in this PR because primary_prominence
dropped" is. The scorecard model in `LAYOUT_SCORECARD.md` already
provides that primitive - this tool brings it forward in time so
authors see the number while they're still typing.

## Output: scene card

Per scene, the tool emits a card. JSON for tooling; Markdown for
humans and PR comments.

```
electrophoresis_bench                              score: 64 / 100
class: composition  (auto-detected from placement count + primary tag)

weakest metrics                       observed   target   weight   drag
  primary_area_ratio                    18.2%    >=25%      0.25    -12.6
  support_distance                       0.42    <=0.30     0.20     -4.8
  predicted_label_overlap                  3       0       0.15     -4.5

strongest metrics
  aspect_fidelity                       98.4%   100%      0.05     +4.9
  scene_occupied                        54.1%   30-70%    0.15     +8.1

confidence                                   high  (all inputs cm_model)

suggested next move (projected: 71)
  Promote `center_gel_cassette` to data-primary, OR
  enlarge its footprint ~30% via placement.layout.display_width_cm: 58
```

Card format choices, each load-bearing:

- **Score first, breakdown second** - reviewers anchor on the number;
  authors anchor on the drag column to know which lever to pull.
- **Targets shown inline** - no separate doc to look up "what is good."
- **Weight column** - explains why fixing `primary_area_ratio` (-12.6)
  matters more than fixing `aspect_fidelity` (+4.9 already).
- **Confidence flag** - same as the render predictor; degrades when
  the scene's scale source isn't `cm_model`.
- **Suggested next move with projected score** - turns the scorecard
  from a complaint into a contract. (See "Suggested-fix engine" below.)

## Metrics, organized by design property

The list below groups every metric used by both this tool and the
post-render scorecard. Definitions match `LAYOUT_SCORECARD.md` so
pre-render and post-render scores are comparable. Geometry-bearing
metrics consume simulator output.

### Hierarchy - primary stands out
| Metric | Definition | Targets |
|---|---|---|
| `primary_area_ratio` | primary's footprint_bbox area / scene area | composition >=25%, zoom >=70% |
| `primary_prominence` | primary footprint / largest supporting footprint | >=2.0 |
| `primary_detection_confidence` | `data-primary` tagged vs fallback | tagged preferred |

### Balance - canvas filled evenly
| Metric | Definition | Targets |
|---|---|---|
| `zone_footprint_balance` | max(&Sigma; footprint per zone) / min(&Sigma; footprint per zone) over populated zones | composition <=3x, dense <=8x |
| `largest_empty_band` | largest empty quadrant ratio | report-only |
| `scene_occupied` | total footprint / scene area | 0.15-0.70, class-dependent |

`zone_footprint_balance` replaces the v2 `row_balance_ratio` count-based
metric. A zone with 1 huge instrument and a zone with 5 small tubes is
**not** imbalanced - its footprint sums may be similar. Counts mislead;
footprints don't.

### Proximity - related things near each other
| Metric | Definition | Targets |
|---|---|---|
| `support_distance` | mean Euclidean distance from supporting placements to primary center, normalized by scene diagonal | <=0.30 (composition / instrument-heavy) |
| `protocol_step_affinity` | for protocol-linked scenes, fraction of step-co-used items in same or adjacent zones | >=0.80 (future; needs protocol vocab access) |

### Label hygiene - text readable, not packed
| Metric | Definition | Targets |
|---|---|---|
| `predicted_label_overlap` | Stage 9 residual collisions after 3-pass nudge | 0 |
| `label_to_object_distance` | mean label-center to placement-center distance | within zone padding |
| `label_wrap_rate` | fraction of labels Stage 9 wrapped | <=0.20 |

### Density - right amount of stuff
| Metric | Definition | Targets |
|---|---|---|
| `scene_density` | total footprint / scene area | 0.15-0.70 (skipped for template) |
| `row_overcrowding` | per-row required-scale to fit; aggregated as `min(scales)` across zones | >=0.75 (gradient of the render predictor's MIN_SCALE binary) |

### Composition health
| Metric | Definition | Targets |
|---|---|---|
| `tab_stops_symmetry` | for zones using tab-stops, max/min of left/center/right footprint sums | <=3x; **gated** on tab_stops_used > 0 |
| `depth_tier_usage` | does the scene exercise tiers 1/2/3 or is it flat | scenes with >=5 placements should use >=2 tiers |
| `aspect_fidelity` | mean inverse of predicted aspect distortion across placements | >=95% |

The render predictor's binary version of `aspect_fidelity` is
`aspect_distorted_predicted` (any single placement >5% delta ->
`ESCAPE_REQUIRED`). The design lint uses the same simulator output
but averages it as a continuous score component.

## Per-class weight tables

Scene class determines which metrics matter. Five classes from
`LAYOUT_SCORECARD.md`; weights match the NEW1.5 revised tables there.

Class detection (in order):
1. `data-scene-mode="template"` declared -> `template`.
2. `data-scene-mode="zoom_detail"` declared -> `zoom_detail`.
3. >=10 placements after inheritance -> `dense_clutter`.
4. Primary is `instrument` kind -> `instrument_heavy`.
5. Otherwise -> `composition`.

| Metric | template | composition | instrument-heavy | zoom-detail | dense-clutter |
|---|---|---|---|---|---|
| primary_area_ratio | - | 0.25 | 0.35 | 0.50 | 0.05 |
| zone_footprint_balance | - | 0.15 | - | 0.10 | - |
| support_distance | - | 0.20 | 0.20 | - | 0.20 |
| scene_density | - | 0.15 | 0.15 | 0.20 | 0.10 |
| predicted_label_overlap | 0.40 | 0.15 | 0.15 | 0.10 | 0.30 |
| label_wrap_rate / readability | 0.40 | 0.05 | 0.05 | 0.10 | 0.25 |
| aspect_fidelity | - | 0.05 | 0.10 | - | 0.10 |
| balance / largest_empty_band | 0.20 | - | - | - | - |
| **Sum** | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

Hard rule: if the **render predictor** would flag any rule as
`BLOCKED` or `ESCAPE_REQUIRED` for this scene, the design lint emits
the card with `score: gated` and a note pointing at the render predictor
finding. Quality of a broken scene is not meaningful.

## Enforcement model - never build-failing

Four mechanisms layered. Each more enforced than the last; none of
them fails CI on absolute score thresholds.

### 1. PR-diff comment

Every PR that touches `content/base_scenes/` or
`content/protocols/**/scenes/` gets a bot comment with the score card
for each changed scene + a delta column ("78 -> 64, -14").

This is where adoption actually happens. Score becomes a thing
reviewers and authors talk about; threshold violations are negotiated
in review, not flagged by CI.

### 2. PR-diff budget

CI computes the corpus-wide score delta. If a PR drops mean score by
more than 3 points or any individual scene's score by more than 5
points, the CI step adds a `composition-review-required` label on the
PR. Label requires explicit acknowledgement from a reviewer
(checkbox in PR description) to land - but it's a label, not a
red X. No build failure.

The number is intentionally lenient. The point is to make degradations
*visible*, not to gatekeep.

### 3. Scene-card archive

Every CI run writes `test-results/scene_design/cards/<scene>.md` and
`scorecard_history.jsonl` (append-only). Quarterly report ranks scenes
that have dropped most over the last quarter and highlights bottom
decile.

This is the actual enforcement mechanism over time: visibility +
trend. Individual PRs don't move the needle much; quarterly drift
reports do.

### 4. Suggested-fix engine (v2+)

When a scene's score is below class floor, the engine permutes single
simulator moves (one placement reassigned to a different zone, one
`placement.layout.display_width_cm` adjusted in 10cm increments, one
`data-primary` flipped) and reports the lowest-cost move that gains
the most score. Output: "Apply this move -> projected score 71."

Concrete suggestion + projected number turns abstract metrics into
actionable choices. The engine doesn't apply the fix; it proposes.

## Implementation phases

### v0 * Scorecard runner + base metrics - ~2 days

- `tools/scene_design/` Python package.
- Imports `simulator.py` from the render-predictor tool (shared
  library; both tools depend on the same Python port of M2a TS).
- All metrics in the catalog above implemented as pure functions
  consuming simulator output.
- Per-class weight tables driven by config; class detection logic.
- Scene-card writer (JSON + Markdown).

Validation: produce cards for the M0 corpus. Cross-reference scores
against the post-render scorecard from `LAYOUT_SCORECARD.md` - expect
agreement within +/-5 points per scene. Bigger divergences indicate
simulator imprecision worth fixing.

### v1 * PR-diff comment + score delta - ~1 day

- CI integration: emit cards as PR comment.
- Score-delta computation across the PR.
- `composition-review-required` label trigger (>3 mean / >5 single drop).

### v2 * Quarterly archive + suggested-fix engine - ~3 days

- `scorecard_history.jsonl` archive.
- Quarterly report generator (markdown, optionally HTML).
- Suggested-fix engine: permute single moves, project scores, pick
  best.

### v3 * Per-row library budgets - ~2 days (future)

Hook the scorer into per-row design budgets declared in
`WORKSPACE_ROW_LIBRARY` (see render-predictor plan v3 §"Level 3"). When
a row declares `budget.target_footprint_pct`, the relevant balance and
density metrics measure against that intent instead of corpus-wide
thresholds. Score becomes class-aware AND design-system-aware.

## Output shapes

### JSON per scene

```json
{
  "scene": "electrophoresis_bench",
  "class": "composition",
  "score": 64,
  "confidence": "high",
  "gated_by_render_predictor": false,
  "metrics": {
    "primary_area_ratio":      {"value": 0.182, "target": ">=0.25", "weight": 0.25, "drag": -12.6},
    "zone_footprint_balance":  {"value": 2.1,   "target": "<=3.0",  "weight": 0.15, "drag": +1.2},
    "support_distance":        {"value": 0.42,  "target": "<=0.30", "weight": 0.20, "drag": -4.8},
    "predicted_label_overlap": {"value": 3,     "target": "0",      "weight": 0.15, "drag": -4.5}
  },
  "suggestions": [
    {
      "action": "set_primary",
      "placement_name": "center_gel_cassette",
      "projected_score": 71
    },
    {
      "action": "adjust_size",
      "placement_name": "center_gel_cassette",
      "field": "layout.display_width_cm",
      "from": 45,
      "to": 58,
      "projected_score": 69
    }
  ]
}
```

### Markdown per scene

The card example at the top of this doc.

### PR-diff comment

```
Scene design lint - 3 scenes changed in this PR

| Scene                       | Before | After | &Delta;     |
|-----------------------------|-------:|------:|------:|
| electrophoresis_bench       |     78 |    64 |   -14 |
| staining_bench              |     61 |    63 |    +2 |
| sub-bench_setup             |     56 |    56 |     0 |

&#x26A0; electrophoresis_bench dropped 14 points (limit 5 per scene)
   -> label `composition-review-required` applied

Detail cards: test-results/scene_design/cards/
```

## Non-goals

- **Build gating on absolute scores.** Score is a comparison metric,
  not a pass/fail. Day-1 strict mode breaks the existing corpus.
- **Vocabulary or render-failure checks.** Those are sibling tools.
- **Scoring scenes the render predictor has marked broken.** Card emits
  `score: gated`; fix the render failure first.
- **Auto-applying suggested fixes.** Suggestion engine proposes, never
  edits YAML.

## Open questions

1. **PR-diff thresholds (3 mean / 5 single).** Arbitrary starting
   point - calibrate after one sprint of real PRs.
2. **Class detection from declarations.** Today scenes don't carry
   `data-scene-mode`. Either retrofit those attributes onto the
   YAML root, or maintain a scene-class manifest (see
   `scene_class_manifest.yaml` referenced in `README.md`).
3. **`zone_footprint_balance` exclusions.** Empty zones shouldn't count
   in min/max - but at what threshold do we treat a zone as "populated"?
   1 placement, 5% footprint, what?
4. **Cross-tool simulator ownership.** Recommend `src/scene_runtime/python/`
   for the shared Python port so both `tools/scene_lint/` and
   `tools/scene_design/` depend on it as a library.
5. **Quarterly report visibility.** PRs see deltas; what makes the
   quarterly report *land* with the design team? Probably a tagged
   Slack post or a recurring agenda item - outside the tool's scope but
   worth pinning.

## References

- **Source model**: `LAYOUT_SCORECARD.md` (post-render scorecard this
  tool mirrors), including the NEW1.5 revised weights.
- **Sibling**: `SCENE_LINT_PLAN.md` (render-failure predictor).
- **Shared library**: simulator under `src/scene_runtime/layout/` (M2a
  TS port) - Python port to be shared between this tool and the
  render predictor.
- **Failure-mode data**: `m1_trial_summary_for_designer.md` (M0 + M1
  trials), per-placement screenshots in `uploads/`.
- **Class definitions**: `LAYOUT_SCORECARD.md` §"Scene classes".
