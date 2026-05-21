# Label policy comparison matrix

NEW3 Batch 2 Workstream F. CSS-only label policy stress test across 12
scenes: 6 dense_clutter (stress_dense_clutter_001..006), 3 composition
gold (gold_drug_dilution_workspace, gold_staining_bench, gold_heat_block_
sample_prep), 3 mixed (gold_mixed_bench, stress_long_label_scene_001,
stress_long_label_scene_002).

Each policy is a CSS-only override layered on top of the canonical
bench.css link. Layout structure is never touched. Renders, screenshots,
and per-scene metric JSON live under
`experiments/css_native_layout/stress_results/label_policy_runs/policy<N>/`.
The audit driver (`label_policy_audit.mjs`) ports only the three label
checks needed (label_label_overlap, svg_label_overlap, artwork_integrity
hard-fail count) and does not modify `precheck.mjs` or `score_layout.mjs`.

## Scoring notes

- `label_label_overlap` and `svg_label_overlap` are summed across the 12
  scenes; lower is better.
- `artwork_integrity_HF` is the count of HARD_FAIL aspect-distorted
  glassware / pipette / plate / instrument placements. Label policies do
  not touch artwork, so this column is identical across policies and is
  the Batch 1 carryover (sanity check).
- `visible_labels` is the count of placement-labels with a non-zero
  rendered bounding box across all 12 scenes. The placement card has
  `overflow:hidden` and `max-height:100%` in canonical bench.css, so
  policies that try to size labels with `max-width:75px` on the
  inline span still see many labels clipped under the card. This is a
  characteristic of the existing bench placement, not the policy.
- `readability_1_5` is a qualitative rating from screenshot inspection of
  three sample scenes (gold_drug_dilution_workspace,
  stress_dense_clutter_003, stress_long_label_scene_002). 5 = full text
  unambiguous, 1 = labels unreadable or missing.
- `score_proxy` is `100 - (label_label_overlap + svg_label_overlap)`, a
  bench-style proxy (the canonical `score_layout.mjs` is not modified;
  scores below are not produced by it).

## Totals matrix (12-scene aggregate)

| Policy | Name                              | label_label_overlap | svg_label_overlap | artwork_integrity_HF | visible_labels | readability (1-5) | score_proxy |
| ------ | --------------------------------- | ------------------: | ----------------: | -------------------: | -------------: | ----------------: | ----------: |
| 1      | always visible (baseline)         |                  12 |                22 |                   98 |            147 |                 2 |          66 |
| 2      | hidden in dense scenes            |                   5 |                13 |                   98 |            147 |                 3 |          82 |
| 3      | hover/focus reveal                |                  12 |                22 |                   98 |            147 |                 1 |          66 |
| 4      | abbreviated (12 char + ellipsis)  |                   0 |                 0 |                   98 |             20 |                 2 |         100 |
| 5      | numbered objects + legend hint    |                   6 |                10 |                   98 |            147 |                 3 |          84 |
| 6      | region-level group labels         |                   0 |                 0 |                   98 |            147 |                 4 |         100 |

Notes on the visible_labels column: Policy 1, 2, 3, 5, 6 keep the full
placement-label DOM and the bench layout governs visibility; many labels
are clipped behind the artwork by canonical `.placement { overflow:
hidden }`. Policy 2 hides labels via the visually-hidden clip pattern in
dense scenes; the bounding-box driver still reports them because
`getBoundingClientRect` returns a 1x1 box, which the driver counts as
non-zero (this is the same trade-off the canonical precheck would face).
Policy 4 visually drops to 20 because the placement card's `overflow:
hidden` clips the now-block-level 75x14 label rect under most cards.
Policy 6 retains DOM-level label bboxes via clip-rect but visually shows
zero placement labels; per-region group labels appear at region tops
instead.

## Accessibility notes per policy

- Policy 1 (always visible): `<img alt>` and `.placement-label` text both
  in DOM; screen readers read the placement label as visible text and the
  alt as image text. Sighted users see the label. WCAG 1.4.3 contrast is
  governed by `--color-text-light`. Baseline.
- Policy 2 (hidden in dense scenes): uses the WCAG-recommended
  visually-hidden clip pattern. Screen readers still read the label text.
  Sighted users in non-dense scenes see the label, in dense scenes do
  not. The `data-object-name` attribute is a secondary affordance for
  tooltip-style fallback. WCAG 1.3.1: name still programmatically
  determinable.
- Policy 3 (hover/focus reveal): uses `opacity:0` plus `:hover`,
  `:focus-within`, `:focus`; the label remains in the accessibility tree
  and is keyboard-focus-reachable per the Lane O2 finding. Pointer-only
  reveal would fail WCAG 2.1.1 (keyboard) and 1.4.13 (content on hover);
  the `:focus-within` half of the selector is what keeps this policy
  compliant. `pointer-events:none` on the label prevents the reveal from
  trapping the cursor.
- Policy 4 (abbreviated): `text-overflow:ellipsis` is purely visual;
  full text remains in the text node and is read by screen readers
  unmodified. WCAG 1.4.4 (resize text 200%) preserved because the
  ellipsis is dynamic, not a baked string. The 12-character truncation
  may visually collide on similar names ("micropipette p10" vs
  "micropipette p20" both render "micropipette ...").
- Policy 5 (numbered + legend hint): the placement-label text is hidden
  by `font-size:0; color:transparent;` but remains a child text node,
  so most screen readers (NVDA, JAWS, VoiceOver) still announce it.
  Sighted users see only `[N]` badges. The "legend" promised by the
  policy name requires per-scene legend DOM injection, which is outside
  the CSS-only constraint; the `(numbered)` suffix on the region label
  is a partial substitute and is decorative.
- Policy 6 (region-level group labels): per-placement labels hidden via
  the visually-hidden clip pattern (a11y tree preserved). Region labels
  (`Rear Shelf`, `Work Surface`, `Front Tools`, `Instrument Station`)
  promoted from `display:none` to `display:block`. WCAG 1.3.1 satisfied
  because the per-object accessible name is still the placement label
  text node, and the region label is a heading-like hint.

## Per-scene results (selected)

For full per-scene detail see each `policy<N>/summary.json`. The matrix
below shows the three sample scenes used for the readability rating.

| Scene                              | P1 LL/SL | P2 LL/SL | P3 LL/SL | P4 LL/SL | P5 LL/SL | P6 LL/SL |
| ---------------------------------- | -------: | -------: | -------: | -------: | -------: | -------: |
| gold_drug_dilution_workspace       | 0 / 0    | 0 / 0    | 0 / 0    | 0 / 0    | 0 / 0    | 0 / 0    |
| stress_dense_clutter_003           | 2 / 2    | 0 / 0    | 2 / 2    | 0 / 0    | 1 / 0    | 0 / 0    |
| stress_long_label_scene_002        | 3 / 6    | 3 / 6    | 3 / 6    | 0 / 0    | 0 / 2    | 0 / 0    |

Policy 2 only fires on `data-scene-density` in ("crowded", "high"); the
gold composition scenes carry density "medium" and the long-label stress
scenes carry density "low", so Policy 2 is effectively Policy 1 there,
which is why their overlap counts are unchanged. Policy 4 wipes the
overlap counts because the bench card's `overflow:hidden` clips the now-
75px label rect below the card; the labels exist in DOM but produce no
visible-bbox overlaps.

## Recommendation by scene class

The 12-scene sample is small for the full taxonomy. The recommendations
below extrapolate from the per-scene results combined with the
characteristics of each class.

- **template scenes** (single-instrument skeletons): Policy 1
  (always visible). Templates have one or two placements and labels are
  the primary identification cue. There is no crowding to relieve.
- **composition scenes** (gold drug dilution, staining bench, heat
  block, mixed bench): Policy 1 (always visible). Composition gold
  scenes already had zero or low overlap in baseline (0/0, 0/0, 2/5,
  0/1). Hiding or replacing labels loses pedagogical detail without
  measurable layout gain.
- **dense_clutter scenes** (stress_dense_clutter_001..006): Policy 2
  (hidden in dense scenes). All six dense_clutter scenes drop to 0/0
  overlap under Policy 2 while retaining accessible label text. Policy
  6 also reaches 0/0 but loses per-object identity even in places
  where it would still fit; Policy 2 is the more conservative pick.
- **zoom_detail scenes** (not in subset, inferred): Policy 1 (always
  visible). Zoom mode uses larger 14px labels with 300px max-width in
  bench.css; there is room for the full label and the user is examining
  one object closely.
- **instrument_heavy scenes** (not in subset, inferred): Policy 2
  (hidden in dense scenes) when density is high; Policy 1 otherwise.
  Instrument placements take large footprints and labels rarely collide,
  but multiple instruments at high density still benefit from the
  density-gated suppression.

## Default policy recommendation

**Default: Policy 2 (hidden in dense scenes), with Policy 1 fallback for
medium and low density.**

Policy 2 is the only choice that materially reduces label overlap on the
dense_clutter subset (12 -> 5 label_label and 22 -> 13 svg_label across
the full sample, with all six dense_clutter scenes dropping to 0/0)
without sacrificing per-object identity on composition and zoom scenes,
and without depending on hover or DOM rewrites. It uses the standard
WCAG visually-hidden clip pattern so screen-reader users still get the
full label text, satisfying the Lane O2 accessibility requirement.
Policies 4 and 6 produce a perfect overlap score but at the cost of
per-object semantics (truncation collisions and removed per-placement
labels respectively), so they are not safe as a global default.
