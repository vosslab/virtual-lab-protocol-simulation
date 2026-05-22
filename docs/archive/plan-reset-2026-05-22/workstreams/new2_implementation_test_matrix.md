# NEW2 implementation test matrix

Doc-only coverage matrix for NEW2 implementation work. This file lists what
must be tested, by which tool, against which target, and with what pass
criteria. It does not contain test code; test code lives under `tests/`.

## Purpose

NEW2 lands two workstreams in parallel:

- **W1**: CSS-native production blocker fixes (viewport overflow, adapter
  rect math, hood/bench/instrument style integration).
- **W2**: Well-plate adapter rect audit follow-through (rect-correctness in
  the adapter layer, no scene-side geometry leaks).

This matrix is the single coverage contract that both workstreams must
satisfy before the NEW2 milestone is declared closed. It enumerates each
required test once, names the tool that owns it, defines the pass criteria
without prescribing implementation, and tags which workstream the test
belongs to. The matrix is also the gate input used by the pre- and
post-implementation checks below.

The matrix is intentionally small. Sixteen rows is the closed surface; a
seventeenth row requires an explicit amendment to this document and a
cross-reference from the originating plan.

## Test matrix

| Test                                                 | Tool       | Target                                                | Pass criteria                                                                        | Workstream |
| ---------------------------------------------------- | ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| Adapter rect math for 96-well plate                  | pytest     | adapter rect output for known plate geometry          | rect width, height, x, y match expected values within 0.5 px tolerance               | W2         |
| Adapter rect math for 24-well plate                  | pytest     | adapter rect output for 24-well plate geometry        | rect dimensions match expected within 0.5 px tolerance                               | W2         |
| Adapter rect rejects scene-side geometry             | pytest     | adapter input boundary                                | adapter rejects inputs that carry scene-side x or y offsets                          | W2         |
| Well enumeration order stable across runs            | pytest     | well order for 96-well and 24-well plates             | enumerated well order is deterministic and matches documented row-major order        | W2         |
| Viewport overflow guard for hood scene               | playwright | dist hood scene at 1280x800 and 1920x1080             | no horizontal scrollbar appears; scene content fits inside viewport                  | W1         |
| Viewport overflow guard for bench scene              | playwright | dist bench scene at 1280x800 and 1920x1080            | no horizontal scrollbar appears; scene content fits inside viewport                  | W1         |
| Viewport overflow guard for instrument scene         | playwright | dist instrument scene at 1280x800 and 1920x1080       | no horizontal scrollbar appears; scene content fits inside viewport                  | W1         |
| CSS-native layout class presence                     | playwright | dist hood, bench, instrument scenes                   | required CSS layout classes are present on the expected scene root nodes             | W1         |
| CSS bundle contains no hard-coded pixel scene widths | pytest     | dist css bundle text                                  | no rule sets scene root width to a fixed pixel value above the documented breakpoint | W1         |
| Adapter rect integrates with well-plate scene render | playwright | well-plate scene rendered from current adapter output | wells render in row-major order with no overlap and no gaps wider than tolerance     | W2         |
| Markdown link integrity for NEW2 plans               | pytest     | docs/active*plans/new2*\*.md                          | every local markdown link resolves to a tracked file                                 | W1, W2     |
| ASCII compliance for NEW2 plans                      | pytest     | docs/active*plans/new2*\*.md                          | every NEW2 plan file is pure ASCII or ISO-8859-1                                     | W1, W2     |
| TypeScript typecheck on changed files                | tsc        | src/ files touched by NEW2                            | tsc reports zero new errors relative to the pre-implementation baseline              | W1, W2     |
| ESLint on changed files                              | eslint     | src/ files touched by NEW2                            | eslint reports zero new errors relative to the pre-implementation baseline           | W1, W2     |
| Walker smoke for a representative mini-protocol      | playwright | one mini-protocol covering hood and bench scenes      | walker completes the full visible click path with required screenshots saved         | W1         |
| Walker smoke for well-plate workspace                | playwright | well-plate workspace mini-protocol                    | walker reaches the well-plate scene and clicks a documented well sequence            | W2         |

## Pre-implementation gate

Before any W1 or W2 code edits land, capture the current baseline so new
errors can be distinguished from pre-existing ones.

- Run the repo pytest suite and record the exact failing test names and
  counts. The baseline failure list is the pre-implementation baseline.
- Run `npx tsc --noEmit` and record the full error list. The captured list
  is the TypeScript baseline.
- Run `eslint` over the changed-file candidate set and record the error
  list. The captured list is the ESLint baseline.
- Confirm that the four cross-referenced plans below exist as tracked
  files. If any is missing, stop and surface the gap before editing code.

The pre-implementation gate is satisfied when all three baselines are
captured and stored alongside the implementation branch notes. The gate
does not require zero failures; it requires a known baseline.

## Post-implementation gate

After W1 and W2 code lands, the matrix becomes a pass-or-fail checklist.

- Every row in the matrix above must be exercised by a real test that ran
  on the implementation branch.
- Every row must report pass, or report a documented exemption that points
  to a specific row in one of the cross-referenced plans.
- The pytest, tsc, and eslint runs must show zero new errors relative to
  the captured pre-implementation baselines. Pre-existing errors do not
  block the gate; new errors do.
- The walker smoke rows must produce screenshots that are stored under the
  documented test output path.

The post-implementation gate is the only gate that closes the NEW2
milestone. A green local run that skips matrix rows does not close the
milestone.

## How to separate pre-existing TypeScript errors from new errors

The repo carries known TypeScript noise that is unrelated to NEW2 work.
The matrix only blocks on new errors, so the separation procedure must be
mechanical and reproducible.

- Capture the pre-implementation tsc output to a baseline file. The
  baseline file is a sorted list of `file:line:col: error code` tuples
  derived from `npx tsc --noEmit`.
- After the implementation branch settles, capture the post-implementation
  tsc output the same way.
- Compute the set difference between the post and pre lists. The set
  difference is the new-error set.
- Any non-empty new-error set blocks the post-implementation gate. A
  shrinking pre-existing set is allowed and welcomed but is not required.
- The same procedure applies to eslint, with `file:line:col: rule-id` as
  the tuple shape.
- Filename or line shifts caused by unrelated edits do not count as new
  errors as long as the rule id, error code, and surrounding context are
  unchanged. When ambiguity arises, the burden of proof sits with the
  implementer to show the error pre-existed.

The expected steady-state pre-implementation TypeScript baseline at the
start of NEW2 is eight known errors. If the captured baseline differs, the
captured baseline wins; the number is a sanity check, not a contract.

## Workstream gates

The matrix splits cleanly along the W1 and W2 boundaries. Each workstream
has its own internal gate that must pass before the joint
post-implementation gate runs.

### W1 gate

- All matrix rows tagged W1 pass on the implementation branch.
- Viewport overflow rows pass at both documented viewport sizes.
- CSS-native layout class presence row passes against the production dist
  build, not against a local dev server only.
- No new tsc or eslint errors are introduced by W1 file edits.

### W2 gate

- All matrix rows tagged W2 pass on the implementation branch.
- Adapter rect math rows pass for both 96-well and 24-well plate
  geometries.
- Adapter rect integration row passes against the well-plate scene
  produced by the current adapter output, not against a frozen fixture.
- No new tsc or eslint errors are introduced by W2 file edits.

Joint gate rows tagged W1, W2 (markdown link integrity, ASCII compliance,
tsc, eslint) must pass at both workstream gates and at the
post-implementation gate.

## Forbidden in tests

The matrix above describes coverage. The list below describes what the
tests must not do, regardless of which row they implement.

- No test may write to live game state, scene state, or runtime state.
- No test may stub a scene render path to make a walker row pass; the
  walker rows must exercise the same visible UI a student would use.
- No test may shell out to a network endpoint or hit a remote service.
- No test may assert on the current date, the current time, the current
  branch name, or any clock-derived value.
- No test may assert on the exact number of files in a directory, the
  exact length of a generated list, or any count that is expected to grow
  with content additions.
- No test may rely on a hard-coded absolute path under the developer home
  directory.
- No test may suppress a failure by widening tolerance bounds beyond what
  this matrix documents. Tolerance changes require a matrix amendment.
- No test may add a new matrix row at runtime; the matrix is a closed
  surface.

## Cross-references

- [new2_test_strategy.md](new2_test_strategy.md)
- [new2_well_plate_adapter_rect_audit.md](new2_well_plate_adapter_rect_audit.md)
- [new2_production_viewport_overflow_audit.md](new2_production_viewport_overflow_audit.md)
- `new2_css_native_production_blocker_plan.md`
