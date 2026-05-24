# Scene-lint plan (v3) — render-failure predictor

Python build-time predictor for `content/base_scenes/*.yaml` and
`content/protocols/*/scenes/*.yaml`. Answers the question **"will this
scene render, or does the runtime have to invoke the Tier 3 escape
hatch?"** Does *not* assess vocabulary validity or design quality —
those are owned by sibling tools.

## Scope, in relation to other tools

| Tool | Question it answers | Verdict shape | Build action |
|---|---|---|---|
| Existing vocab/structural lint | "Is the YAML grammar valid?" | error / ok | fail on error |
| **This tool** | "Will this YAML render, or trigger fail-loud?" | `BLOCKED` / `ESCAPE_REQUIRED` / `CLEAN` | block / report / pass |
| `SCENE_DESIGN_LINT_PLAN.md` (sibling) | "Is this a good scene to teach with?" | 0–100 score | never blocks; PR-diff budget |
| `precheck.mjs` (final truth) | "Did it actually render?" | per-metric pass/warn/fail | retroactive only |

This tool predicts. `precheck.mjs` measures. A `CLEAN` verdict here does
**not** guarantee a rendered scene is correct; it guarantees the linter
has no *known* reason to expect failure. Real DOM/bbox checks remain
in Playwright.

- **Source-of-truth pipeline reference**: `src/scene_runtime/layout/` (M2a
  TypeScript port) + `LAYOUT_PIPELINE.md` spec. `pipeline.jsx` is a
  legacy JS reference, not authoritative.
- **Reads**: scene YAML, object library, asset specs,
  `WORKSPACE_PX_PER_CM`, `WORKSPACE_ROW_LIBRARY`, raw SVG viewBox.
- **Emits**: JSONL findings + Markdown report + (in advisory phases) a
  per-rule confusion table against precheck output.

## Motivation

`m1_trial_summary` quantified the failure surface on the 10-scene fixture:

| Hard fail | Count | % of total |
|---|---|---|
| `aspect_distorted` | 38 | 41% |
| `off_page` | 21 | 23% |
| `clipped_by_parent` | 21 | 23% |
| `region_overflow` | 4 | 4% |
| **Total** | **93** | |

The four predictors in Group B target this distribution directly.

## Outcome verdicts

| Verdict | Meaning | Build action | Runtime action |
|---|---|---|---|
| `BLOCKED` | Invalid data or unresolved references. Scene cannot enter the layout pipeline. | **Fail build** (Group A from v0). | n/a — YAML never reaches runtime. |
| `ESCAPE_REQUIRED` | Valid data, but layout predicted to crop / overlap / go off-page / vanish / aspect-distort. | **Advisory** in v1/v2 (report-only); **fail build** in strict mode after v1 confusion table proves precision. | Runtime refuses scene with explicit fail-loud diagnostic. Never silently clip. |
| `CLEAN` | No known failures or risks. | Proceed. | Proceed. |

Design-quality warnings live in the sibling tool's score model, not
this verdict ladder.

## Unit audit

All geometry rules assume the following units. Established here so the
simulator port and rule implementations agree.

| Quantity | Unit | Reference range | Source |
|---|---|---|---|
| `scene_bounds`, `zone.bounds` | scene-percent | `[0, 100]` | `LAYOUT_PIPELINE.md` §1 |
| `_visualWidth`, `_height`, `heightPct` | scene-percent (per-axis) | typically `[0, 100]` | spec §1; aspect-corrected per axis |
| `_x`, `_y`, `_top`, `_labelX`, `_labelY` | scene-percent | within scene_bounds | spec §1 |
| `_footprint` | scene-percent (horizontal) | `≥ _visualWidth` | spec §4 Stage 7 |
| `default_width`, `label_width` | scene-percent (horizontal) | object-defined | `LayoutHint` |
| `display_width_cm` | centimeters | object-defined | `SCALING_MODEL.md` |
| `_width_scale`, `_scale` | dimensionless multiplier | `≥ MIN_SCALE = 0.55` | spec §2 |
| `aspect` | dimensionless (w/h) | from SVG `viewBox.width / viewBox.height` | `AssetSpec` |
| `viewport.w`, `viewport.h` | CSS pixels | default `1920×1080` | spec §2 |
| `PX_PER_SCENE_PERCENT` | px / scene-percent | `11.52` (constant) | spec §2 |
| `px_per_cm` | px / cm | per-workspace, `{bench:3.2, hood/microscope/plate_reader/cell_counter:8, incubator:6}` | spec §2 |

**Aspect correction.** `_height = _visualWidth × (viewport.w / viewport.h) / aspect`.
A square SVG (`aspect = 1`) renders square in pixels at any viewport
because the `(viewport.w / viewport.h)` factor compensates for per-axis
percent units. The simulator must use this formula verbatim; rules must
not invent their own.

**Tolerance defaults** (mirror `precheck.mjs`):
- Aspect distortion: 5% of authored ratio.
- `placement_bbox_outside_zone`: 4 px.
- `placement_bbox_outside_scene`: 0 px (any escape = ESCAPE_REQUIRED).
- `item_item_overlap`: 50 px² intersection.
- `label_object_overlap`: 10 px² intersection.

## BBox vocabulary

Three distinct rectangles. Rules name which one they're testing; findings
carry `bbox_type` so reports stay unambiguous.

| Name | What it is | Used by |
|---|---|---|
| `visual_bbox` | The rendered SVG's painted rectangle (asset-aspect-honoring). `(_visualWidth × _height)`. | aspect rules, item-item overlap, off-page checks for the artwork itself |
| `placement_bbox` | The visual_bbox + any depth offset and renderer margins; the `.placement` element's rect that precheck's `region_overflow` measures. | placement-outside-zone / outside-scene checks |
| `footprint_bbox` | `max(_visualWidth, min(label_width, _visualWidth × MAX_FOOTPRINT_RATIO))` wide; height = max(_height, label_height). The space the layout engine *budgets* for the placement. | row-footprint and zone-density checks |

A rule that reads "item overflows zone" without naming the bbox is
ambiguous; the linter should refuse to ship a rule that does this.

## Rule catalog

### Group A · Data blockers → `BLOCKED`

Deterministic authoring errors. No simulator needed. **Never
suppressible.** Build-failing from v0.

Coordinate with existing vocab lint — Group A rules already covered by
the vocab tool stay in the vocab tool; the rules below are the ones
not (yet) handled there.

| Rule | Trigger |
|---|---|
| `duplicate_scene_name` | Two scene YAMLs declare the same `scene_name`. (Caught: `heat_block_bench` shipped twice in the corpus.) |
| `duplicate_placement_name` | `placement_name` appears twice within one scene (post-inheritance resolution). |
| `invalid_scene_bounds` | Any of l/r/t/b outside `[0,100]`, or `left ≥ right`, or `top ≥ bottom`. |
| `invalid_zone_bounds` | Same plus `zone.bounds` must fit inside `scene_bounds`. |
| `zone_outside_scene_bounds` | Zone `bounds` rect not contained in `scene_bounds`. |
| `missing_svg_asset` | `object.asset` does not resolve to a real SVG on disk. |
| `invalid_svg_viewbox` | SVG missing `viewBox` or with degenerate dimensions. Aspect math undefined without this. |
| `inheritance_unknown_base` | `extends` references unknown scene. |
| `inheritance_multi_level` | Inheritance chain length > 1. |
| `inheritance_cycle` | Cycle in inheritance graph. |
| `inheritance_locked_field_mutation` | `reposition_placements` mutates a field outside the allowed surface. |
| `inheritance_dangling_ref` | `deactivate_placements` / `reposition_placements` targets a placement removed by `remove_placements`. |

Vocab-lint overlaps (defer to existing tool unless gaps exist):
`unknown_object_name`, `unknown_zone`, `unknown_row_name`,
`unknown_object_kind`, `unknown_workspace`, `unknown_capability`,
`unsupported_background_type`.

### Group B · Geometry predictors → `ESCAPE_REQUIRED`

These require the Python simulator (Python port of M2a TS, Stages 2–10).
Advisory until v1 confusion table establishes precision; strict mode
after.

| Rule | Predicts (precheck kind) | bbox used | M0 fails caught |
|---|---|---|---|
| `aspect_distorted_predicted` | `aspect_distorted` | visual_bbox | ~38 |
| `item_taller_than_zone` | `off_page` (bottom), `clipped_by_parent` | visual_bbox vs zone | ~17 |
| `row_footprint_overflow` | `off_page`, `svg_svg_overlap` via `zone_overflow_negative_gap` | footprint_bbox sum vs zone width | ~6 (subsumes the previous count heuristic) |
| `placement_bbox_outside_scene` | `off_page` | placement_bbox | ~21 (overlaps taller/wider) |
| `placement_bbox_outside_zone` | `region_overflow` | placement_bbox | ~4 |
| `item_item_overlap` | `svg_svg_overlap` | visual_bbox pairs | density-dependent |
| `label_offscreen` | label clipped at scene edge | label bbox vs scene_bounds | ~3–5 |
| `label_object_overlap` | `svg_label_overlap` | label bbox vs visual_bbox | density-dependent |
| `invisible_placement` | "scene renders but object is gone" (`microscope_basic`) | visual_bbox sizing pathologies | 1 catastrophic + N near-misses |
| `zone_overlap` | cross-zone collision (spec §10 known gap) | zone.bounds pairs | structural; static |

#### Rule specs

##### B1 · `aspect_distorted_predicted`

```
authored_aspect = svg.viewBox.width / svg.viewBox.height
rendered_aspect = _visualWidth / _height
delta_pct = abs(rendered_aspect - authored_aspect) / authored_aspect × 100
if delta_pct > 5.0: ESCAPE_REQUIRED
```

All matches are `ESCAPE_REQUIRED`. (Earlier draft had BLOCKED escalation
for glassware/pipette/plate/instrument; demoted to ESCAPE_REQUIRED to
keep verdict semantics clean.) The high-priority object groups remain
relevant — they're surfaced in `evidence.severity_hint` so the design
team can prioritize triage, but the verdict itself is uniform.

##### B2 · `item_taller_than_zone`

```
zone_inner_h = (zone.bounds.bottom - zone.bounds.top) - 2 × ZONE_PADDING
required_scale = zone_inner_h / _height
if required_scale < MIN_SCALE (0.55): ESCAPE_REQUIRED
```

##### B3 · `row_footprint_overflow`

Replaces the prior `items_per_row_max` count heuristic with real
footprint math (per the v2 → v3 critique).

```
For each zone:
  n = len(items_in_zone)
  total_footprint = Σ footprint_i   # footprint_bbox.width
  required_w = total_footprint + (n - 1) × zone_gap
  zone_inner_w = (zone.bounds.right - zone.bounds.left) - 2 × ZONE_PADDING

  if required_w ≤ zone_inner_w:           pass
  elif (zone_inner_w / total_footprint) ≥ MIN_SCALE:  INFO (shrink will fit)
  else:                                   ESCAPE_REQUIRED
```

For tab-stops zones, compute three independent sub-sums
(left/center/right) + 2 × zone_gap against the zone width; emit
`tab_stop_overflow`.

##### B4 · `placement_bbox_outside_scene`

```
bbox = simulator.final_placement_bbox(placement)  # post-Stage 10 clamp
if not bbox ⊆ scene_bounds: ESCAPE_REQUIRED
```

Stage 10 already tries to clamp; this rule fires when it can't recover.

##### B5 · `placement_bbox_outside_zone`

```
if not bbox ⊆ zone.bounds + 4-px tolerance: ESCAPE_REQUIRED
```

##### B6 · `item_item_overlap`

```
For each (a, b):
  if area(a.visual_bbox ∩ b.visual_bbox) > 50 px²: ESCAPE_REQUIRED
```

##### B7 · `label_offscreen`

```
label_left  = _labelX - label_width / 2
label_right = _labelX + label_width / 2
if label_left < scene_bounds.left:   ESCAPE_REQUIRED
if label_right > scene_bounds.right: ESCAPE_REQUIRED
```

Stage 9's intra-zone clamp doesn't protect against this when the zone
touches `scene_bounds`. Seen in the `*__center_kimwipe_pad` screenshots.

##### B8 · `label_object_overlap`

```
For each label L and each scientific-group placement P (not L's own):
  if area(L.bbox ∩ P.visual_bbox) > 10 px²: ESCAPE_REQUIRED
```

Limited to scientific-group objects (don't fail on labels overlapping
`decoration` kind).

##### B9 · `invisible_placement`

Rewritten around the actual field names in the codebase. The object
library's canonical sizing field is `layout.default_width` (always
present); `layout.display_width_cm` is the optional cm-model upgrade
(see `SCALING_MODEL.md`). The previous draft assumed `display_width_cm`
existed.

Triggers — any one:
1. Predicted `_visualWidth × _height < 100 px²` → ESCAPE_REQUIRED.
2. `_height > 2 × zone_inner_h` (renderer clamps to invisibility) → ESCAPE_REQUIRED.
3. `_scale_source == "skipped_error"` from Stage 5 → ESCAPE_REQUIRED.
4. `layout.default_width` missing or ≤ 0 → BLOCKED (Group A overlap; defensive).
5. `layout.default_width > 0` AND no `display_width_cm` AND
   `WORKSPACE_PX_PER_CM[workspace]` defined →
   no failure, but emit INFO that scene falls back to `fallback_authored`
   scale source (degrades simulator confidence for other rules).

##### B10 · `zone_overlap`

```
For each pair (Za, Zb) in scene.zones:
  if area(Za.bounds ∩ Zb.bounds) > 0: ESCAPE_REQUIRED
```

No simulator needed; static geometry. Moved here from earlier
design-quality grouping — overlapping zones cause real cross-zone
collisions per spec §10.

## Finding shape

JSONL line per finding. Stable contract; runtime can consume same shape.

```json
{
  "scene": "electrophoresis_bench",
  "placement_name": "right_tool_area_p200_micropipette",
  "rule": "item_taller_than_zone",
  "verdict": "ESCAPE_REQUIRED",
  "predicts": ["off_page", "clipped_by_parent"],
  "bbox_type": "visual_bbox",
  "confidence": "high",
  "message": "Predicted item height exceeds available zone height after MIN_SCALE.",
  "evidence": {
    "zone": "right_tool_area",
    "zone_inner_height_pct": 23.5,
    "predicted_height_pct": 14.6,
    "required_scale": 0.548,
    "min_scale": 0.55,
    "scale_source": "fallback_authored",
    "severity_hint": "pipette group"
  },
  "fix_hints": [
    "Add layout.display_width_cm on this placement",
    "Move placement to a taller zone"
  ],
  "suppressed_by": null
}
```

**`confidence` levels**:
- `high` — all inputs from `cm_model` scale source; simulator is full
  fidelity.
- `medium` — at least one input from `fallback_authored` (no cm model);
  simulator may diverge from real render.
- `low` — derived from `fallback_no_workspace` or partial data.

Findings with `confidence: low` never escalate past advisory severity,
even in strict mode.

## Suppression

Group A: **never suppressible.** Period.

Group B: suppressible via an **external manifest** (not in-scene YAML).
Path: `tools/scene_lint/suppressions.yaml`. Format:

```yaml
- scene: electrophoresis_bench
  placement_name: right_tool_area_p200_micropipette
  rule: item_taller_than_zone
  reason: "Adversarial fixture; legacy pipette aspect tracked in TICKET-1234."
  ticket: TICKET-1234
  owner: jdoe
  expires: 2026-09-01
```

Rules:
1. All four fields (`reason`, `ticket`, `owner`, `expires`) are
   required. Missing any → suppression rejected, finding stands.
2. `expires` must be ≤ 90 days from creation.
3. Past-expiry suppressions are themselves a finding (`expired_suppression`,
   verdict `BLOCKED` against the suppression manifest, not the scene).
4. Every active suppression appears in the report under "Active
   suppressions" with owner + expiry.
5. Scope is per-(scene, placement_name, rule). No whole-scene blanket
   suppressions.

Why external manifest instead of in-YAML: keeps scene YAMLs declarative
about *what they describe*, not about which rules they exempt
themselves from. Audit trail lives in one file, reviewable by design
team in isolation.

## Implementation phases

### v0 · Framework + Group A · build-failing immediately — ~1 day

- `tools/scene_lint/` package, CLI, finding shape, JSONL+MD writers.
- Loaders: scene YAML, object library, SVG viewBox parsing.
- All Group A rules.
- CI hook: fail build on any Group A finding.

Ships even if simulator slips. Closes data-blocker surface.

### v1 · Simulator + top-2 predictors · advisory only — ~2.5 days

- Python port of `src/scene_runtime/layout/` (TS, M2a). Parity test:
  heat_block_bench fixture from `LAYOUT_PIPELINE.md` §7 must match
  within tolerance.
- `aspect_distorted_predicted` (B1) + `item_taller_than_zone` (B2).
- Confusion table runner: cross-reference findings against
  `test-results/new0_css_native/audit/visual_audit.json`. Emit per-rule
  TP / FP / FN / TN counts.

**Advisory only.** No `ESCAPE_REQUIRED` failures gate the build at
v1. Findings ship in the report; engineers / authors read them.

### v2 · Remaining predictors · advisory — ~1.5 days

- `row_footprint_overflow` (B3), `placement_bbox_outside_scene` (B4),
  `placement_bbox_outside_zone` (B5), `item_item_overlap` (B6),
  `label_offscreen` (B7), `label_object_overlap` (B8),
  `invisible_placement` (B9), `zone_overlap` (B10).
- Confusion tables for each new rule.

Still advisory. The point of v0–v2 is **measurement**, not enforcement.

### v3 · Strict mode for proven predictors — gated on metrics — ~0.5 day

- Suppression manifest schema + enforcement.
- A per-rule **promotion policy**: a rule moves from advisory to
  build-failing only when its confusion table shows:
  - **Precision ≥ 0.90** on the M0 + M1 corpus (false-positive rate
    ≤ 10%). False positives erode author trust faster than false
    negatives.
  - **Recall ≥ 0.80** (covers ≥ 80% of the precheck-flagged failures
    that rule targets).
  - **At least 20 evaluated instances** across the corpus.
- Rules that don't meet the bar stay advisory until they do — fix the
  rule or the simulator, then re-measure.
- CI strict mode enabled rule-by-rule, not all at once.

### Total

- v0 ships immediately, lands the data-blocker surface.
- v1 + v2 (~4 days) deliver the predictors as a measurement tool.
- v3 enables build gating only for rules that have earned it.

This staging is the answer to "what if Wave 1 simulator slips" — v0
still ships independently, and the simulator deliverables are
advisory-only until their precision is established.

## Validation methodology

### Confusion table per rule

For each B-rule, run the linter and `precheck.mjs` against the M0 corpus
and produce:

| | precheck flagged | precheck clean |
|---|---|---|
| linter flagged | TP | **FP** |
| linter clean | **FN** | TN |

Reported per rule. Promotion criteria above are computed from these
counts. The table is part of every PR that touches a rule
implementation or threshold.

### Cross-reference command

```bash
python -m tools.scene_lint \
  content/base_scenes/*.yaml \
  --validate-against test-results/new0_css_native/audit/visual_audit.json \
  --emit-confusion test-results/scene_lint/confusion.md
```

`confusion.md` is the gate; PRs that change a rule must include an
updated copy.

### Recall AND precision

The v2 plan tracked only recall (target ≥85%). v3 requires both:
- A rule with 100% recall and 50% precision is a false-alarm machine;
  authors learn to ignore it.
- A rule with 100% precision and 50% recall is incomplete but trustworthy.
The promotion bar values precision higher because trust is harder to
recover than coverage.

## CLI surface

```bash
# All scenes, default (Group A blocks; Group B advisory)
python -m tools.scene_lint content/base_scenes/*.yaml

# Strict mode for proven rules (per --promotions config)
python -m tools.scene_lint --strict <paths>

# Report-only — useful in local dev
python -m tools.scene_lint --report-only <paths>

# Confusion-table mode (for rule-implementation PRs)
python -m tools.scene_lint --validate-against <precheck.json> \
    --emit-confusion <out.md>

# Subset
python -m tools.scene_lint --rules=aspect_distorted_predicted <paths>
```

Exit codes:
- `0` — no errors at active gate.
- `1` — Group A finding, or `ESCAPE_REQUIRED` finding for a promoted
  rule in strict mode.
- `2` — invocation problem.

## Non-goals

- **Substitute for render evidence.** Linter predicts; `precheck.mjs`
  measures. `CLEAN` is not a render guarantee.
- **Design quality.** Owned by `SCENE_DESIGN_LINT_PLAN.md` (scorecard,
  not verdicts; never build-failing).
- **Auto-fix.** `fix_hints` only.
- **Duplicating the existing vocab lint.** Group A rules overlap only
  where the vocab tool doesn't already cover them.

## Open questions

1. Where does the simulator live — `tools/scene_lint/simulator.py` or
   a shared `src/scene_runtime/python/layout_engine.py` that the design
   lint also imports? Recommend shared.
2. Does `expires: ≤ 90 days` on suppressions hold up in practice, or
   does 180 better match release cadence?
3. Confusion-table baseline — M0 only, or M0 + M1 + future runs as they
   land? Recommend rolling window of the last 3 precheck runs.

## References

- **Primary**: `src/scene_runtime/layout/` (M2a TS port, canonical
  pipeline implementation).
- **Spec**: `LAYOUT_PIPELINE.md` §1 (types), §4 (stages), §10 (known
  gaps), `SCALING_MODEL.md` (cm-to-pixel model).
- **Companion**: `SCENE_DESIGN_LINT_PLAN.md` (sibling design-quality
  tool), `DIAGNOSTICS_REFERENCE.md` (HARD FAIL definitions),
  `LAYOUT_SCORECARD.md` (precheck-side score model).
- **Calibration data**: `m1_trial_summary_for_designer.md` (M0
  93-hard-fail distribution).
- **Boundary**: `m2a_ts_port_handoff.md` (TS strict validator scope
  this tool doesn't duplicate).
- **Legacy reference**: `pipeline.jsx` (pre-M2a; useful for
  cross-checking the port, not authoritative).
- **Prior versions**: `SCENE_LINT_PLAN_v1.md`, `SCENE_LINT_PLAN_v2.md`.
