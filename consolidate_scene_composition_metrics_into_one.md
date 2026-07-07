# Plan: consolidate scene composition metrics into one render-truth scorer and add pedagogy and grouping metrics

## Context

The repo scores scene composition through scattered surfaces with two geometry
producers, and the ideals those scores serve (pedagogical: focal teaching object,
workflow grouping; aesthetic: like-with-like grouping, fewer fuller zones) are
under-measured. Two anti-grouping metrics (`zone_footprint_balance`,
`row_overcrowding`) were already ratified-removed today
(`docs/active_plans/decisions/scene_design_zone_metric_removal.md`); their removal
left no positive grouping signal, and `protocol_step_affinity` remains a `None`
skeleton (`validation/scene_design/metrics/proximity.py:185`).

Two producers drift: the browser render `tools/scene_stats.mjs` ->
`generated/scene_render_stats/*.stats.json` (feeds Python scoring) and a parallel
JS pass `tools/layout_metrics.mjs` -> `test-results/layout_metrics/*.json` (feeds the
`tools/layout_health_report.mjs` proxy scorer). Investigation confirmed the proxy
chain plus two broken/orphaned siblings (`scorecard_m2.mjs`, `scene_check.mjs`) and
a duplicate ranker (`rank_scene_layout.py`) are all redundant with the Python
`validation/scene_design/` scorecard, while `tools/layout_golden_diff.mjs` is a
unique geometry regression producer that must be kept.

This plan makes one render truth (the browser dump) feed one Python composition
scorer, guarantees the scorer only ever reads fresh renders, and adds metrics that
measure the real ideals, validated against a ratified visual calibration set so the
formulas never become the definition of good.

## Objectives

- Establish one geometry producer (browser `stats.json`) and one composition scorer
  (`validation/scene_design/`), retiring the JS proxy and duplicate scorers.
- Guarantee fresh metrics by rendering then scoring in one front-door invocation (so
  metrics always reflect the current render), and by failing the raw scorer loudly when
  the dump is missing -- no id/hash/mtime freshness-proving machinery.
- Add a focal-teaching-detection metric so the teaching object, not the largest
  footprint, is scored as focal.
- Add a protocol-step-affinity metric that measures whether step-co-used objects
  share or neighbor zones (real pedagogical relatedness).
- Resolve, by a defined bake-off with a decision rule, whether a pure-geometry
  grouping-cohesion metric earns inclusion.
- Refine surviving metrics until each agrees with the ratified calibration set.

## Design philosophy

Best evidence first, cleaner scoring second: the browser measures rendered facts and
the Python layer only scores them, so metric quality is bounded by measurement, not
by a Python geometry model (this plan leans on "fix the design, not the symptom" and
"long-term over short-term" from `docs/REPO_STYLE.md`). The rejected alternative is
letting Python drive Playwright in-process or re-derive geometry from YAML: it
collapses the testable render-free boundary, adds a second browser stack, and
destroys the dump-as-cache that makes re-scoring cheap. A second rejected shortcut is
treating each metric formula as ground truth; instead a ratified calibration set is
the aesthetic authority and every metric must match it.

Scientific method over guessing: the plan does not pretend to know the winning
formula for a subjective quality up front. Where the best method is unknown (focal
evidence, grouping formula) the plan decides the METHOD, not the answer: state a
hypothesis, implement competing candidates, measure each against the ratified
calibration set, and apply a written decision rule (adopt the best that clears a
floor, else reject and record why). A decided experiment with a measurement and a
decision rule is a complete plan artifact, not a deferral; the goal is the best
result, found empirically, not a guess asserted as correct.

## Scope

- Retire the JS proxy scorer chain and duplicate scorers; keep the unique golden-diff
  regression producer.
- Extend `tools/scene_stats.mjs` to emit per-zone rendered `bounds` and a `provenance`
  block into `stats.json`.
- Add a `run_scene_metrics.py` render-then-score front-door that always renders fresh,
  and a missing-dump guard in the raw scorer.
- Add a boundary contract test (dump is the only geometry source; narrow AST/grep
  guard against Python geometry derivation).
- Author and ratify `docs/active_plans/decisions/scene_metric_calibration.md`.
- Implement focal-teaching detection and protocol-step affinity; run the
  grouping-cohesion bake-off with a decision rule.
- Refine `predicted_label_overlap` validation, `scene_density`, `support_distance`,
  `largest_empty_band` against the calibration set.
- Reconcile `docs/specs/SCENE_DESIGN.md`, `docs/specs/SCENE_METRICS.md`, and the
  architecture docs.

## Non-goals

- Do not fix the TS engine label-nudge bug (`layout_labels.ts` uses the label-width
  budget, not `effectiveLabelHalfWidth`). It is engine behavior, not a metric; and
  `predicted_label_overlap` already reads the real rendered `label_bbox`, so metric
  quality is not blocked by it. Out of scope; noted for a separate engine plan.
- Do not add a pixel-capture label-overlap script: `label_bbox` in the dump is the
  real painted-text box, so bbox intersection already detects overprint.
- Do not drive Playwright from Python in-process (python-playwright / `page.evaluate`
  from Python) or re-derive any geometry from YAML.
- Do not add a grounding/floating metric: grounding is a render-layer feature and is
  uniform across all current scenes, so it does not discriminate composition quality.
  Evidence: `aesthetic_baseline_round0.md` tags all 8 reviewed scenes
  `floating_assets` (including the otherwise "clear" microscope scene), so a
  floating signal is constant and cannot rank scenes; revisit only if grounding
  becomes per-scene variable.
- Do not retire `tools/layout_golden_diff.mjs` (unique regression baseline producer)
  or change `validation/scene_lint/` hard gates.
- Do not reintroduce any zone-count or footprint-spread metric.

## Current state summary

- Producers: `tools/scene_stats.mjs` (computes) + `tools/scene_to_png.mjs` (renders,
  writes `stats.json`) are the keepers. `stats.json` carries per-placement
  `footprint_bbox`/`label_bbox`/`visual_bbox`/`aspect_delta_pct`/`scale_source` and
  `scene_bounds`, but no zone bounds and no provenance.
- Retire targets (evidence-confirmed): `layout_metrics.mjs`, `layout_health_report.mjs`,
  `run_scene_health.py` (wired via `package.json` `layout:metrics`/`layout:health` and
  `super_all_tests.sh:168`); `scorecard_m2.mjs` (broken: writes deleted `src/main.ts`);
  `rank_scene_layout.py` (duplicate ranker, no executable caller); `scene_check.mjs`
  (orphaned wrapper, its npm aliases do not exist).
- Keep: `tools/layout_golden_diff.mjs` (`layout:diff`/`layout:refresh`), the only
  producer of `test-results/layout_reference_snapshot.json`; its provenance-stamp code
  is the reuse precedent for the informational provenance block.
- Scorer: `validation/scene_design/` (14 metrics after the ratified removal);
  `weights.py` already redistributed. `protocol_step_affinity` is a `None` skeleton.
  `predicted_label_overlap` already intersects real rendered `label_bbox`.

## Architecture boundaries and ownership

Positive instructions (lead with these when dispatching):

- Use browser-produced `stats.json` fields for every geometry value a metric needs.
- Use the existing Node/Playwright measurement path (`scene_stats.mjs` /
  `scene_to_png.mjs`) to add any new rendered fact, then read it in Python.
- Use Python for scoring, weighting, reporting, and gating.
- Use categorical authoring facts (`zone`, `depth_tier`, `data-primary`,
  `object_name`, protocol `steps[].sequence[].target`) freely; treat them as labels,
  not geometry.
- Use bake-offs and experiments to choose the best-evidence formula, ending each in a
  written decision rule.

Boundary (the rule these positives enforce): TypeScript/browser owns rendering and
all geometry production; Python owns scoring and consumes rendered facts only.
Render-free, not geometry-free: Python does distance/area/ratio math over
browser-measured rectangles from `stats.json`; every geometry value a Python metric
uses must trace to a `dump_data` field, never to an authored scene/object coordinate.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-1A retire | `tools/*.mjs`, `run_scene_health.py`, `package.json`, `super_all_tests.sh` | 1 |
| M1 / WS-1B dump+front-door | `tools/scene_stats.mjs`, `validation/scene_calc/dump.py`, `run_scene_metrics.py` | 2 |
| M1 / WS-1C contract test | `tests/test_scene_metrics_boundary.py` | 1 |
| M1 / WS-1D docs | `docs/specs/SCENE_DESIGN.md`, `docs/specs/SCENE_METRICS.md`, `docs/FILE_STRUCTURE.md`, `docs/CODE_ARCHITECTURE.md`, `docs/USAGE.md`, `docs/CHANGELOG.md` | 1 |
| M2 / WS-2A calibration | `docs/active_plans/decisions/scene_metric_calibration.md` | 1 |
| M3 / WS-3A focal | `validation/scene_design/metrics/{hierarchy,proximity}.py`, `weights.py`, tests | 1-2 |
| M4 / WS-4A grouping bake-off | `validation/scene_design/metrics/grouping.py`, `weights.py`, tests | 1-2 |
| M5 / WS-5A affinity | `validation/scene_design/metrics/proximity.py`, `cli.py`, `weights.py`, tests | 1-2 |
| M6 / WS-6A survivor refine | `validation/scene_design/metrics/{labels,density,balance,proximity}.py`, tests | 1 |

## Milestone plan

| M | Title | Summary | Goal |
| --- | --- | --- | --- |
| M1 | Consolidate to one render-truth home | Retire proxy/duplicate scorers, extend the dump with zone bounds + provenance, add the render-then-score front-door + missing-dump guard, add the boundary contract test, reconcile docs | One producer, one scorer, fresh-by-construction, boundary enforced |
| M2 | Ratify the visual calibration set | Author and ratify a labeled set of real rendered scenes as the aesthetic authority | Metrics have a taste reference independent of any formula |
| M3 | Focal-teaching detection | Score the teaching object as focal via rendered salience + `data-primary`, chosen by a focal bake-off | Wrong-focal scenes score low, matching calibration |
| M4 | Grouping-cohesion bake-off | Implement candidate grouping formulas, decide inclusion by a defined rule against calibration | A grouping metric only ships if it beats existing metrics on calibration |
| M5 | Protocol step affinity | Wire the skeleton to measure step-co-used objects sharing/neighboring zones | Pedagogical relatedness is measured where it exists |
| M6 | Refine survivors to calibration | Validate/tune the surviving metrics against the calibration labels | Every survivor agrees with calibration |

### Milestone: M1 consolidate to one render-truth home

- Depends on: none.
- Workstreams: WS-1A retire, WS-1B dump+front-door, WS-1C contract test, WS-1D docs.
- Entry criteria: current suite green; `stats.json` present for base scenes.
- Exit criteria: retired files gone with all wiring updated (`package.json`,
  `super_all_tests.sh`); `stats.json` carries per-zone `bounds` and a `provenance`
  block; `run_scene_metrics.py` renders-then-scores in one invocation; raw CLI fails
  loudly on a missing dump; contract test green; docs name only live metrics/tools; a
  migration-list note seeds each later metric's candidate inputs. Follow-ons:
  update `docs/CHANGELOG.md`, rerun `./check_codebase.sh` and `pytest tests/`.
- Parallel-plan ready: yes (WS-1A, WS-1B, WS-1C concurrent; WS-1D after WS-1A).

### Milestone: M2 ratify the visual calibration set

- Depends on: none (uses existing round-0 evidence and current renders).
- Workstreams: WS-2A calibration.
- Entry criteria: round-0 report and current PNGs available.
- Exit criteria: `scene_metric_calibration.md` lists 5-10 real scenes with a
  plain-language judgment (correct/wrong focal, good/weak grouping, cluttered, too
  sparse, acceptable) and expected relative ranking, meeting the grouping/focal
  coverage floor; the set ships `status: provisional` so M3-M6 proceed immediately,
  and flips to `status: ratified` when the human ratifies (no execution blocks on it).
  Follow-on: reference it from `SCENE_DESIGN.md`.
- Parallel-plan ready: no (single authoring package; ratification is non-blocking).

### Milestone: M3 focal-teaching detection

- Depends on: M1 (fresh dump + front-door), M2 (calibration labels).
- Workstreams: WS-3A focal.
- Entry criteria: M1 and M2 exit criteria met.
- Exit criteria: focal metric ranks the calibration focal labels correctly; the
  chosen evidence path (geometry-only vs an added capture) is decided by the bake-off
  rule and recorded; weights re-normalized to 1.00. Follow-ons: unit tests, catalog
  row in `SCENE_DESIGN.md`, migration-list update.
- Parallel-plan ready: no (single metric family in shared `proximity.py`/`hierarchy.py`).

### Milestone: M4 grouping-cohesion bake-off

- Depends on: M1 (zone-bounds dump), M2 (calibration labels).
- Workstreams: WS-4A grouping bake-off.
- Entry criteria: M1 and M2 met; zone `bounds` present in the dump.
- Exit criteria: candidate formulas scored against calibration; the decision rule
  yields either "adopt formula X" (wired into weights, re-normalized) or "do not add,
  reason recorded". Follow-ons: unit tests, `SCENE_DESIGN.md` row (only if adopted),
  migration-list update.
- Parallel-plan ready: yes (new `grouping.py`; independent of M3/M5 files).

### Milestone: M5 protocol step affinity

- Depends on: M1 (zone-bounds dump), M2, M3 (shares `proximity.py`; land after focal).
- Workstreams: WS-5A affinity.
- Entry criteria: M1, M2, M3 met.
- Exit criteria: `protocol_step_affinity` returns a score for scenes whose steps
  co-use multiple targets (e.g. `seeding_workspace`) and `None` for unreached scenes;
  union-of-reaching-protocols rule documented; weights updated. Follow-ons: unit
  tests, `SCENE_DESIGN.md` row, migration-list update.
- Parallel-plan ready: no (edits `proximity.py`, shared with M3).

### Milestone: M6 refine survivors to calibration

- Depends on: M1, M2.
- Workstreams: WS-6A survivor refine.
- Entry criteria: M1, M2 met.
- Exit criteria: `predicted_label_overlap` confirmed to flag `electrophoresis_bench`
  overprint (no capture added); `scene_density`, `support_distance`,
  `largest_empty_band` validated/tuned to agree with calibration sparse/cluttered/
  focal-cluster labels; no constant tuned to pass one scene at another's cost.
  Follow-ons: unit tests, `SCENE_DESIGN.md` updates.
- Parallel-plan ready: yes (independent metric files; can run alongside M3/M4/M5).

## Workstream breakdown

### Workstream: WS-1A retire proxy and duplicate scorers

- Owner: coder.
- Needs: tool reference map (in Current state summary).
- Provides: a repo with one producer chain and one scorer; freed npm aliases.
- Expected patches: 1.

### Workstream: WS-1B dump extension and front-door

- Owner: expert_coder.
- Needs: `layout_golden_diff.mjs` provenance pattern as precedent.
- Provides: zone bounds + informational provenance in `stats.json`; the
  render-then-score front-door; the missing-dump guard.
- Expected patches: 2.

### Workstream: WS-1C boundary contract test

- Owner: coder.
- Needs: `dump.py` behavior; hygiene-test precedent.
- Provides: a test freezing the render-free boundary.
- Expected patches: 1.

### Workstream: WS-1D docs reconcile

- Owner: coder.
- Needs: WS-1A retirement outcome; real `weights.py` values.
- Provides: specs/architecture docs consistent with code; migration-list seed.
- Expected patches: 1.

### Workstream: WS-2A calibration authoring

- Owner: expert_coder.
- Needs: round-0 report, current PNGs.
- Provides: the ratified aesthetic authority artifact.
- Expected patches: 1.

### Workstream: WS-3A focal detection

- Owner: expert_coder.
- Needs: calibration focal labels; dump geometry.
- Provides: a focal metric matching calibration.
- Expected patches: 1-2.

### Workstream: WS-4A grouping bake-off

- Owner: expert_coder.
- Needs: zone-bounds dump; calibration grouping labels.
- Provides: an adopt/reject decision plus (if adopted) the metric.
- Expected patches: 1-2.

### Workstream: WS-5A protocol step affinity

- Owner: expert_coder.
- Needs: zone-bounds dump; `StateMap`; protocol resolution helpers.
- Provides: the pedagogy affinity metric.
- Expected patches: 1-2.

### Workstream: WS-6A survivor refinement

- Owner: coder.
- Needs: calibration labels.
- Provides: survivors validated/tuned to calibration.
- Expected patches: 1.

## Work packages

### Work package: WP-1A1 retire proxy and duplicate scorers

- Owner: coder.
- Touch points: delete `tools/layout_metrics.mjs`, `tools/layout_health_report.mjs`,
  `tools/scorecard_m2.mjs`, `tools/scene_check.mjs`, `tools/rank_scene_layout.py`,
  `run_scene_health.py`; edit `package.json` (remove `layout:metrics`,
  `layout:health`; keep `layout:diff`, `layout:refresh`, `scene:png`);
  edit `super_all_tests.sh` (replace the `scene_health` run at line 168).
- Depends on: none.
- Suite ordering (decided): `super_all_tests.sh` already renders the dump in its
  `build` stage (line 162 -> `build_github_pages.sh` -> `scene_to_png.mjs --all`) before
  the `scene_health` step (line 168). Replace line 168 with a `run "scene_metrics"`
  step that scores the EXISTING dump via the raw CLI, and keep it after `build` so the
  render always precedes scoring. Do not add a re-render there (the build stage is the
  single render).
- Acceptance criteria: none of the six files remain; `grep -rn` finds no live
  (non-history) reference to them in code, `package.json`, or shell scripts;
  `layout_golden_diff.mjs`, `scene_stats.mjs`, `scene_to_png.mjs` untouched; the
  replacement `scene_metrics` step is ordered after `build` and scores the existing
  dump; `./check_codebase.sh` and `super_all_tests.sh` still pass.
- Verification commands: `grep -rn "layout_metrics\|layout_health_report\|run_scene_health\|scorecard_m2\|scene_check\|rank_scene_layout" tools package.json super_all_tests.sh`; `./check_codebase.sh`.
- Obvious follow-ons: update the `docs/CHANGELOG.md` retire entry; hand the retired
  filenames to WP-1D1 for doc cleanup.

### Work package: WP-1B1 extend the dump with zone bounds and provenance

- Owner: expert_coder.
- Touch points: `tools/scene_stats.mjs` (`computeGeometry`); refresh
  `generated/scene_render_stats/*.stats.json` via `tools/scene_to_png.mjs --all`;
  update dump schema notes in `validation/scene_calc/dump.py` and `SCENE_DESIGN.md`.
- Depends on: none.
- Zone measurement source (decided, no renderer change): the runtime already stamps
  `data-zone={item.zone}` on every scene item (`src/scene_runtime/renderer/scene_item.tsx:629,656`);
  there is no zone container element. So `scene_stats.mjs` computes each zone's bounds
  as the union of its same-`data-zone` items' rendered `getBoundingClientRect` boxes,
  in the same `page.evaluate` pass that collects labels -- browser-measured, no new
  runtime attribute. Add a `data-zone`-grouping assertion to the DOM contract test
  (`tests/playwright/test_scene_dom_contract_selectors.*`) so the attribute cannot
  silently break. (This "occupied extent" is what adjacency should compare -- whether
  two zones' objects sit near each other -- so it is the right geometry, not a
  compromise.)
- Acceptance criteria: each `stats.json` emits a `zones` array of
  `{name, bounds:{left,right,top,bottom}}` computed from same-`data-zone` item unions,
  and an informational `provenance` block `{renderer_bundle, rendered_at}` for
  traceability (not a validation gate). `tests/test_scene_stats.mjs` passes with a new
  case asserting the fields for a real scene; the DOM contract test covers the
  `data-zone` attribute.
- Verification commands: `node tools/scene_to_png.mjs --all`; `node --test tests/test_scene_stats.mjs`; `./run_playwright_tests.sh` (DOM contract).
- Obvious follow-ons: re-render all scenes so downstream WPs read fresh dumps.

### Work package: WP-1B2 render-then-score front-door and missing-dump guard

- Owner: expert_coder.
- Touch points: new `run_scene_metrics.py` at repo root; `validation/scene_design/cli.py`
  (missing-dump guard, via `dump.py`); unit test `tests/test_scene_frontdoor.py`.
- Depends on: WP-1B1 (renders the zone-bounds dump the front-door produces).
- Model: scoring runs after a render step in the same WORKFLOW; the scorer itself never
  renders. Freshness needs no proof mechanism -- the render happens once per workflow
  and scoring reads that dump. No id handshake, no hashing, no mtime check (all rejected
  as unnecessary). Two workflows exercise this:
  - Interactive one-shot: `run_scene_metrics.py` renders the requested scene(s) via
    `scene_to_png.mjs` -> `scene_stats.mjs` (all by default, or `-S <scene>`), then
    scores what it just rendered. For an author iterating on one scene.
  - Suite/CI: a single render stage runs once up front, then the metrics step runs the
    raw scorer against that existing dump -- no per-test re-render (this is what
    `super_all_tests.sh` does; see WP-1A1).
- Behavior: the raw `python3 -m validation.scene_design.cli` scores the existing dump
  and raises a clear author-facing error only when the dump is MISSING (never
  synthesizes geometry). It prints a visible notice on stderr that it is scoring a
  pre-existing dump ("scoring existing dump for <scene>; run run_scene_metrics.py for a
  fresh render"), so the reuse is never mistaken for the fresh path.
  `run_scene_metrics.py` is the render-then-score convenience wrapper and prints no
  such notice (it always renders).
- Test placement (decided): the fast pytest `tests/test_scene_frontdoor.py` covers only
  the score-existing and missing-dump-raise logic against an inline stub dump (no real
  render, stays sub-second). The real render-then-score round trip lives in
  `tests/e2e/e2e_scene_metrics_frontdoor.py` (browser render, excluded from `pytest tests/`),
  so the fast suite stays reliable.
- Acceptance criteria: `run_scene_metrics.py` renders then scores in one invocation, so
  its output reflects the current render; the raw CLI scores an existing dump (with the
  stderr notice) and raises on a missing one; the fast unit test covers score-existing
  and the missing-dump raise with a stub dump; the e2e test covers the real render round
  trip.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_scene_frontdoor.py`; `source source_me.sh && python3 tests/e2e/e2e_scene_metrics_frontdoor.py`.
- Obvious follow-ons: document the front-door (fresh) vs raw CLI (existing dump) in
  `docs/USAGE.md` (hand to WP-1D1).

### Work package: WP-1C1 boundary contract test

- Owner: coder.
- Touch points: new `tests/test_scene_metrics_boundary.py`.
- Depends on: none.
- Acceptance criteria: the test asserts `dump_scene_geometry` sources geometry from
  `generated/scene_render_stats/<scene>.stats.json` and raises on a missing stats file
  (no silent geometry synthesis), using a real base scene. The boundary guard is
  behavior-focused, not a broad math ban: no module under `validation/scene_design/`
  or `validation/scene_calc/` imports `src/scene_runtime/layout`, and every geometry
  value a metric consumes must trace to a `dump_data` field (coordinate/`bounds` keys
  read off a parsed scene/object YAML dict are forbidden; distance/area/ratio math over
  `dump_data` rectangles and reads of categorical YAML fields are allowed). Implement
  the guard as the smallest reliable check that expresses this -- an AST check that
  coordinate-key subscripts (`['x'|'y'|'w'|'h'|'bounds']`) are never applied to a
  variable bound from a YAML load in these packages -- and keep it targeted so it does
  not flag legitimate categorical or `dump_data` access. Keep this first version narrow
  and explainable; edge cases the AST cannot safely detect are caught by the
  dump-source assertion plus code review, not by widening the guard into a broad math ban.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_scene_metrics_boundary.py`.
- Obvious follow-ons: if the guard flags an existing violation, file it as a fix
  within this WP (small) or escalate if it is a real geometry-in-Python leak.

### Work package: WP-1D1 reconcile docs to code

- Owner: coder.
- Touch points: `docs/specs/SCENE_DESIGN.md`, `docs/specs/SCENE_METRICS.md`,
  `docs/FILE_STRUCTURE.md`, `docs/CODE_ARCHITECTURE.md`, `docs/USAGE.md`,
  `docs/LAYOUT_REMAINING_WORK.md`, `docs/CHANGELOG.md`.
- Depends on: WP-1A1 (retirement must land first for the tool-removal lines).
- Acceptance criteria: `SCENE_METRICS.md` is reduced to a redirect stub, folding its
  author-facing "how to read the scorecard / what to change" guidance into
  `SCENE_DESIGN.md`; `SCENE_DESIGN.md` weight tables match `weights.py` exactly and
  carry no removed-metric rows; architecture/usage docs drop the retired tools and
  describe the single-producer/single-scorer + render-then-score front-door flow; a
  migration-list note
  (seed of each later metric's candidate inputs) is added under `docs/active_plans/`;
  removed metrics/tools are named only in CHANGELOG/decisions/archive.
- Verification commands: `grep -rn "layout_metrics\|layout_health_report\|zone_footprint_balance\|row_overcrowding" docs/specs docs/FILE_STRUCTURE.md docs/CODE_ARCHITECTURE.md docs/USAGE.md`; `pytest tests/test_markdown_links.py`.
- Obvious follow-ons: update `docs/CHANGELOG.md` consolidation entry.

### Work package: WP-2A1 author and ratify the calibration set

- Owner: expert_coder.
- Touch points: new `docs/active_plans/decisions/scene_metric_calibration.md`.
- Depends on: none.
- Acceptance criteria: 5-10 real scenes (drawn from `aesthetic_baseline_round0.md`
  and current renders), each with a plain-language judgment among {correct focal,
  weak focal, good grouping, weak grouping, cluttered, too sparse, acceptable}, the
  embedded PNG path, and an expected relative ranking. Coverage floor so downstream
  bake-offs are meaningful: at least 4 scenes carrying a grouping judgment (a mix of
  good and weak) and at least 4 carrying a focal judgment (a mix of correct and weak),
  since Spearman over too few points is noise; if the current corpus lacks enough of
  either, add more real scenes until the floor is met.
- No-human-dependency fallback: the coder first writes a PROVISIONAL calibration set
  from `aesthetic_baseline_round0.md` evidence and marks it `status: provisional`. All
  non-final bake-off and validation work (M3-M6) may proceed against the provisional
  set; a metric is only marked final once the set is ratified. When the human is
  available they ratify (flip to `status: ratified`); execution never blocks waiting
  for the ratification.
- Verification commands: `pytest tests/test_markdown_links.py` (PNG links resolve).
- Obvious follow-ons: cross-link from `SCENE_DESIGN.md`.

### Work package: WP-3A1 focal salience refinement

- Owner: expert_coder.
- Touch points: `validation/scene_design/metrics/hierarchy.py`,
  `validation/scene_design/metrics/proximity.py` (`_identify_primary`),
  `validation/scene_design/weights.py`; tests `tests/test_metric_focal.py`.
- Depends on: WP-1B1, WP-2A1.
- Metric intent (decided, to avoid circularity): the SCORE is rendered visual salience
  clarity -- does one object clearly dominate by size, centrality (from `scene_bounds`),
  and isolation (nearest-neighbor gap). `data-primary` does not add points by itself
  (that would reward mere declaration); it plays two distinct roles: (1) it selects
  WHICH object's salience is measured as the intended focal, and (2) its absence, or a
  declared primary that is NOT the most salient object, is a separate scored penalty
  (weak authoring / weak focal). So the metric rewards visual salience, uses
  `data-primary` to identify the teaching object, and penalizes disagreement between
  the two -- three clearly separated effects, not a self-referential loop.
- Acceptance criteria: with the intent above, the metric assigns high focal clarity to
  `passage_hood_detachment_microscope_view` (one dominant salient object) and low to
  `sample_prep_bench` (no dominant object / declared primary not salient), matching
  calibration; weights re-normalize to 1.00.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_focal.py`; `source source_me.sh && python3 run_scene_metrics.py`.
- Obvious follow-ons: run WP-3A2 bake-off before locking the evidence path.

### Work package: WP-3A2 focal evidence bake-off and decision

- Owner: expert_coder.
- Touch points: bake-off harness (throwaway `_temp` script or a test), decision note
  appended to the migration list.
- Depends on: WP-3A1, WP-2A1.
- Acceptance criteria: two evidence paths are scored against the calibration focal
  labels: (A) geometry-only salience from the existing dump; (B) an added
  `tests/playwright/focal_salience_capture.mjs` measuring rendered size/contrast/
  isolation, rendered by the front-door in the same invocation. Decision rule
  (ambiguity-tolerant): adopt (A) if it ranks every UNAMBIGUOUS calibration focal
  label correctly and errs only on scenes the calibration set marks ambiguous or
  weak-focal (ties and near-misses on those do not disqualify it); adopt (B) only if
  (A) misranks a clear focal case; the chosen path and the reason are recorded either
  way. If (B) is adopted, it is produced by the front-door render step like any other
  dump input.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_focal.py`.
- Obvious follow-ons: wire the chosen path; add the `SCENE_DESIGN.md` catalog row.

### Work package: WP-4A1 implement grouping-cohesion candidates

- Owner: expert_coder.
- Touch points: new `validation/scene_design/metrics/grouping.py`; tests
  `tests/test_metric_grouping.py`.
- Depends on: WP-1B1, WP-2A1.
- Acceptance criteria: implement at least two candidate formulas over dump
  `footprint_bbox` grouped by authored `zone`/`depth_tier` (categorical reads),
  using zone `bounds` from the extended dump: (A) per-zone group-bbox fill =
  member-area / member-bounding-box-area, area-weighted across zones; (B) per-(zone,
  tier) tidiness = evenness of same-tier gaps plus tier alignment. Each returns
  `float | None` (None with < 2 populated placements) and is unit-tested with inline
  `dump_data`.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_grouping.py`.
- Obvious follow-ons: run WP-4A2 to decide inclusion.

### Work package: WP-4A2 grouping bake-off and inclusion decision

- Owner: expert_coder.
- Touch points: bake-off harness; `weights.py` (only if adopted); migration-list note.
- Depends on: WP-4A1, WP-2A1.
- Acceptance criteria: each candidate is ranked against the calibration grouping
  labels and against a baseline of the existing metrics alone. Decision rule: adopt
  the candidate whose Spearman rank correlation with the calibration grouping labels
  is highest AND clears both a >= 0.6 correlation floor and an improvement over the
  existing-metrics baseline; if none clears, do not add `grouping_cohesion` and record
  that grouping is left to `protocol_step_affinity` plus the same-tier-overlap lint,
  with the reason. If adopted, wire into `composition`/`dense_clutter` weights
  (re-normalized) and add a `SCENE_DESIGN.md` row.
- Small-n handling: with only the calibration grouping scenes, report the per-scene
  candidate-vs-label agreement alongside the Spearman value (a single correlation over
  ~4-6 points is fragile); require the winner to also make no clear-case inversion
  (never rank a labeled-good scene below a labeled-weak one), so the decision does not
  rest on a noisy correlation alone. Record the full per-scene outcome table for every
  candidate in the decision note (not just the final correlation), so future tuning can
  see exactly why a candidate won or lost.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_grouping.py`; `source source_me.sh && python3 run_scene_metrics.py`.
- Obvious follow-ons: record the adopt/reject decision in the migration list either way.

### Work package: WP-5A1 implement protocol step affinity

- Owner: expert_coder.
- Touch points: `validation/scene_design/metrics/proximity.py`
  (`protocol_step_affinity`), `validation/scene_design/cli.py` (thread protocol
  context), `validation/scene_design/weights.py`; reuse
  `validation/stepper/state.py` (`StateMap`, `resolve_target`) and
  `validation/shared_toolkit/protocols.py`; tests `tests/test_metric_affinity.py`.
- Depends on: WP-1B1, WP-2A1, WP-3A1 (shares `proximity.py`).
- Acceptance criteria: the metric resolves the protocol(s) reaching a scene
  (protocol-local by path owner; base scenes by a reachability walk ported from
  `collect_reachable_scene_names`), extracts step-co-used target pairs from
  `steps[].sequence[].target`, resolves targets to placements via `StateMap`, and
  scores the fraction of co-used pairs whose placements share a zone or occupy
  bounds-adjacent zones (adjacency from the extended dump's zone `bounds`). Scores are
  the union across all reaching protocols; returns `None` when no protocol reaches the
  scene or no step co-uses >= 2 targets. `seeding_workspace` (step
  `prepare_diluted_suspension` co-uses 5 targets) scores non-None; a scene whose
  co-used items sit in non-adjacent zones scores lower. A negative test covers a scene
  that is reachable by a protocol but has no step co-using >= 2 targets (returns
  `None`, not a spurious score) -- `staining_bench` is a real such case, since no step
  co-uses two bottles. Weights updated.
- Narrow first: the initial implementation proves exactly one positive reachable scene
  (`seeding_workspace`) and one reachable-but-silent scene (`staining_bench`) before any
  broader expectation is added; expand coverage only after those two behaviors hold,
  keeping this highest-risk metric's first cut small.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_affinity.py`; `source source_me.sh && python3 -m validation.scene_design.cli -S content/base_scenes/seeding_workspace.yaml -m`.
- Obvious follow-ons: document the union-of-reaching-protocols and None rules in
  `SCENE_DESIGN.md`; note that staining_bench bottles are not step-co-used, so
  affinity is correctly silent there.

### Work package: WP-6A1 refine survivors to calibration

- Owner: coder.
- Touch points: `validation/scene_design/metrics/{labels,density,balance,proximity}.py`;
  tests `tests/test_metric_survivors.py`.
- Depends on: WP-1B1, WP-2A1.
- Acceptance criteria: confirm `predicted_label_overlap` flags
  `electrophoresis_bench` overprint on the real dump (no capture added; if it does not
  flag, record the finding as an escalation rather than adding a capture); validate
  `scene_density`/`scene_occupied` band, `support_distance` normalization, and
  `largest_empty_band` slope against the calibration sparse/cluttered/focal-cluster
  labels; adjust only with a calibration-backed reason; no constant is tuned to pass
  one scene at another's expense.
- Verification commands: `source source_me.sh && python3 -m pytest tests/test_metric_survivors.py`; `source source_me.sh && python3 run_scene_metrics.py`.
- Obvious follow-ons: update the affected `SCENE_DESIGN.md` rows.

## Acceptance criteria and gates

- Per-patch gate: `./check_codebase.sh` (typecheck/lint/format/node tests) and
  `source source_me.sh && pytest tests/` green; new/changed metric has an inline-data
  unit test.
- Integration gate: `source source_me.sh && python3 run_scene_metrics.py` renders and
  scores every base scene in one invocation; the raw CLI fails loudly on a missing dump.
- Manual review gate: each new/changed metric's ranking of the calibration scenes
  matches the ratified labels; a metric that passes unit tests but disagrees with the
  calibration set is reworked, not shipped.

## Test and verification strategy

- Unit: inline `dump_data` dicts (no fixture files) for each metric; the front-door
  render-then-score path and the missing-dump raise; the boundary contract test.
- Integration: `run_scene_metrics.py` over base scenes; `e2e_scene_design_cli.py`.
- Node: `node --test tests/test_scene_stats.mjs` covers the new dump fields.
- Calibration: a repeatable check that each metric's scene ranking matches
  `scene_metric_calibration.md`.
- Boundary: the AST/grep guard prevents any future Python geometry-from-YAML leak.

## Migration and compatibility policy

- Additive rollout: new dump fields (`zones`, `provenance`) are additive; the
  front-door always re-renders, so older dumps are simply overwritten.
- Backward compatibility: historical `scorecard_history.jsonl` rows keep any removed
  keys; the reader tolerates a variable key set.
- Legacy deletion criteria: the six retire-target files are deleted outright (git
  history is the archive); `layout_golden_diff.mjs` and its aliases are retained.
- Rollback strategy: each milestone is an independent patch set; reverting a metric
  patch restores the prior weights (kept summing to 1.00) without touching the dump or
  front-door layer.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Grouping metric adds no real signal | Wasted metric, noise | Bake-off shows no candidate beats baseline | expert_coder | Decision rule rejects it and records the reason; affinity + lint cover grouping |
| Front-door render cost per run | Slow author iteration | Re-rendering many scenes each run | expert_coder | Support `-S <scene>` to render+score one scene; full render only for the integration gate |
| Focal salience still misranks a scene | Wrong teaching object scored | Calibration focal case fails on geometry-only | expert_coder | Bake-off escalates to the salience capture path |
| Retirement breaks a hidden caller | Suite/build failure | A doc-only tool had an undetected runtime use | coder | Reference map already traced; `check_codebase.sh` + `super_all_tests.sh` gate |
| M3/M5 both edit proximity.py | Merge conflict | Concurrent focal + affinity work | expert_coder | Sequence M5 after M3 (declared dependency) |

## Rollout and release checklist

- [ ] M1 landed: retirement + dump + front-door + contract test + docs, suite green.
- [ ] M2 provisional calibration set authored (execution proceeds); ratified by the
      human before any metric is claimed final.
- [ ] M3 focal metric matches calibration focal labels.
- [ ] M4 grouping decision recorded (adopt-with-formula or reject-with-reason).
- [ ] M5 affinity scores co-use scenes and is silent where correct.
- [ ] M6 survivors validated against calibration.
- [ ] Final `run_scene_metrics.py` run shows all metrics fresh and calibration-aligned.

## Documentation close-out requirements

- Active plan / progress tracker: keep this plan and the migration-list note current
  per milestone.
- docs/CHANGELOG.md entry: one entry per milestone patch set (consolidation, dump+
  front-door, each metric, survivor refinement), using "Patch N" labels.
- Archive / closure notes: on completion, `git mv` this plan to `docs/archive/`; leave
  the ratified `scene_metric_calibration.md` in decisions.

## Patch plan and reporting format

- Patch 1 (M1 WS-1A): retire proxy/duplicate scorers + wiring.
- Patch 2 (M1 WS-1B): dump zone-bounds + provenance, render-then-score front-door.
- Patch 3 (M1 WS-1C): boundary contract test.
- Patch 4 (M1 WS-1D): docs reconcile + migration-list seed.
- Patch 5 (M2): calibration set.
- Patch 6 (M3): focal metric + bake-off decision.
- Patch 7 (M4): grouping bake-off + inclusion decision.
- Patch 8 (M5): protocol step affinity.
- Patch 9 (M6): survivor refinement.

## Open questions and decisions needed

- None open. Every scope item is classified in Scope or Non-goals. The one conditional
  (whether `grouping_cohesion` ships) is not deferred: it is resolved by the WP-4A2
  decision rule against the ratified calibration set. The only external gate is the
  human ratification of the calibration set (WP-2A1), which the plan expects as a
  one-time approval, after which execution proceeds without further human presence.
