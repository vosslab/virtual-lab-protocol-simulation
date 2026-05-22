# Layout rollout status: 2026-05-18

**Status banner**: Two independent parallel measurements - algorithm-prototype EXP2 and production-render reality gate. They measure different things; both are valid. EXP2 is prototype-level; precheck is production-level. Adoption decisions gated on BOTH.

## Measurement summary

### EXP2 (Algorithm-Prototype Level)

**Scope**: Six candidate layout algorithms compared on synthetic SVG output.

- 9 base scenes from content/base_scenes/
- Real Playwright measurement of synthetic SVG scaffolds
- Each algorithm receives flat placement list; method computes placements; synthetic SVG built from output

**Verdict**: Three methods tie for best (0 failures on 9 scenes):

- constraint-based (force-directed overlap avoidance)
- legacy-zone (current production baseline)
- **row-slot-capacity-wrap (RECOMMENDED CANDIDATE)**

**Status**: EXP2 is VALID as algorithm comparison. RESCOPED: not a production-fidelity benchmark. Production-fidelity measurement lives in precheck harness (real DOM).

### Production Precheck (Real DOM)

**Scope**: 18 base + variant scenes measured via real HTML DOM in Playwright.

- 9 base scenes (zone-based layout engine)
- 9 row+slot variant scenes (row+slot-capacity-wrap algorithm)
- Real `element.getBoundingClientRect()` measurements

**Verdict**: 545 real failures in real DOM, across 13 FAIL scenes, 5 PASS scenes.

- C1 object-overlap: 212 failures (39%)
- C2 label-object overlap: 203 failures (37%)
- C3 label-label overlap: 125 failures (23%)
- C5 row-overflow: 5 warnings (1%)

**Status**: BLOCKED. Row+slot adoption cannot proceed until precheck failures are resolved.

### Label-Solver Experiment (Applied Implementation)

**Scope**: Implemented label anti-collision solver as post-processing pass on measured labels.

- Applied Y-axis offset solver (+/-10, +/-20, +/-30px) to all 328 label failures (C2 + C3)
- Greedy processing: labels with most collisions attempted first
- First offset clearing ALL collisions for that label wins; if none work, label marked unresolved
- Re-measured C2 + C3 via precheck harness after label adjustment

**Verdict**: ACTUAL 0% resolution (0 / 328 failures cleared).

- C2: 0 / 203 cleared (estimate predicted 173, 85%)
- C3: 0 / 125 cleared (estimate predicted 84, 67%)
- All 76 labels remain unresolvable; Y-offset strategy fails universally

**Root cause**: Estimate assumed independent label positioning. Reality: label collisions are symptoms of underlying object-placement overlaps (C1 failures, 212 total). Moving one label in isolation when both are embedded in overlapping objects provides no relief.

**Status**: EXPERIMENT FAILED. Hypothesis (78% resolution via Y-offset) is invalid. Label solver cannot fix layout failures without object repositioning.

## Parallel tracks: what's blocked, what's ready, what's next

### Track 1: Row+slot-capacity-wrap Algorithm (BLOCKED)

**Current status**: Ties for best at prototype level (EXP2); BLOCKED in production (545 precheck failures).

**Label-solver attempt (FAILED)**: Applied Y-axis offset solver post-measurement.

- Expected: 545 -> ~288 failures (47% reduction via 78% label-failure resolution)
- **Actual: 545 -> 545 failures (0% reduction)**
- All 76 unresolved labels remain unresolvable via Y-offset
- Root cause: Label collisions are **symptoms** of object-placement overlap (C1), not independent positioning errors

**Implications**: Row+slot adoption is blocked by C1 (object-overlap) failures, which are architectural, not resolvable by post-processing. Label solver was a dead end.

**Next action**: Pivot away from label-solver. Focus on C1 object-placement root cause.

1. Audit zone bounds definition to detect undersized zones
2. Evaluate object size growth (each object bloat)
3. Assess layout engine algorithm gaps (inability to distribute without overlap)
4. Choose: (a) fix zone/object sizing, (b) enhance layout engine, or (c) pivot to constraint-based placement

**Timeline**: Audit ~1-2 days. Decision point before further implementation.

### Track 2: Constraint-Based Alternative (BACKUP)

**Current status**: Ties for best at prototype level (EXP2); untested in production.

**Advantage**: Automatic overlap avoidance; may solve both object + label problems in one solver.

**Disadvantage**: Less predictable; determinism work required if replayability is critical.

\*\*Next action (if pivot needed):

1. Prototype constraint-based solver in TypeScript runtime (not test-only)
2. Measure precheck with constraint-based instead of legacy-zone
3. Compare failure counts to label-solver + row+slot track

**Timeline**: Prototype + precheck ~2-3 days.

### Track 3: Understand Unresolvable Failures (FOUNDATIONAL)

**Current status**: 71 label failures (22%) resist Y-offset resolution. 212 object overlaps (C1) remain.

**Question**: Are unresolvable label failures due to X-axis overlap or tight row heights?

**Investigation**:

- For each unresolvable C3 (label-label): check if overlap is X-axis-dominant
- For each unresolvable C2 (label-object): check if object row band is too tight
- Report: % that are X-dominant vs. Y-dominant

**Next action**: Write `_temp_collision_axis_analysis.mjs` to split unresolvable failures by axis.

**Timeline**: Analysis ~2-3 hours. Decision-point data for next iteration.

## Evidence-backed vs speculative

### Evidence-backed (proven by measurement harnesses)

1. **545 real failures measured** in 18 scenes via Playwright DOM (test-results/\_layout_prechecks/results.json)
2. **Label failures dominate** (328 / 545 = 60%) vs. object failures (212 / 545 = 39%)
3. **Y-axis offset CANNOT clear label failures** (0 / 328 actually cleared) - estimate was wrong; root cause is object overlap, not label positioning
4. **5 scenes PASS** all checks (microscope_basic, imaging_bench, cell_counter_basic_row_slot, and their variants)
5. **EXP2 prototype-level result**: Row-slot-capacity-wrap ties for best (0 failures on synthetic SVG)
6. **EXP3 applied result (NEW)**: Label solver experiment shows 0% reduction (545 -> 545); hypoth esis rejected

### Speculative (hypotheses, not yet measured)

1. ~~**Simple label solver would reduce failures from 545 to ~288**~~ - **DISPROVEN by EXP3**; actual 0% reduction
2. **Constraint-based alternative (force-directed, automatic repulsion) would solve C1 + C2 + C3** - unverified; requires prototyping as production implementation, not post-processing
3. **Zone undersizing or object size bloat is root cause of 212 C1 failures** - hypothesis; needs audit
4. **Constraint-based solver would score better than row+slot alone** - unverified; requires prototyping
5. **Protocol-local scenes would follow same failure distribution as base scenes** - unverified; precheck scope intentionally bounded to base scenes

## Recommended next action

**Manager pick (REVISED after EXP3 failure)**: Abandon label-solver post-processing. Focus on C1 object-placement root cause.

**Immediate**: Audit why 212 object-placement overlaps exist. Investigate three hypotheses in parallel:

1. **Zone undersizing**: Are zone bounds (left/right/top/bottom) too tight for the objects they contain?
2. **Object size bloat**: Are SVG assets larger than expected? Did object .width/.height grow since layout model was designed?
3. **Layout algorithm gap**: Does legacy-zone or row-slot algorithm fail to distribute objects without overlap when density is high?

**Timeline**: Audit ~1-2 days (run measurements, analyze zone bounds and object dimensions against precheck results).

**Decision point**: Based on audit findings, choose one path:

- **Path A (zone/object sizing fix)**: If objects are oversized or zones are undersized, adjust zone definitions or object models. Low risk, high signal.
- **Path B (layout algorithm enhancement)**: If algorithm cannot distribute objects without overlap, redesign placement algorithm (force-directed, constraint-based). High effort, parallel work possible.
- **Path C (pivot to constraint-based solver)**: If audit shows no easy sizing fix, prototype constraint-based placement as production runtime (not post-processing). Requires TypeScript implementation + precheck re-measure.

**Go/no-go decision**: Do NOT implement further post-processing solutions. All fixes must address object placement (C1 root cause), either via sizing audit or algorithm redesign.

---

**Links**:

- [EXP2 report](layout_method_benchmark_report_2026_05_18.md) (algorithm comparison, prototype level)
- [Production precheck summary](production_precheck_summary_2026_05_18.md) (real DOM results, 545 failures)
- `CHANGELOG.md` entry (2026-05-18)
