# Baseline check log

Pre-shell baseline capture of `npm run check` on current `main` so any future
regression introduced by shell work is attributable.

## Environment

- node: v26.0.0
- tsc: 6.0.3
- eslint: v10.4.0
- HEAD sha: edc7fa2690092ccc0d7d3cf1bc5c43444666f4a2
- date: 2026-05-28 01:51 UTC

## Command

```
npm run check 2>&1 | tee /tmp/baseline_check.log
```

(Resolves to `bash check_codebase.sh` per package.json.)

## Exit code

0

## Output

```
> check
> bash check_codebase.sh

node v26.0.0, npm 11.12.1
==> typecheck
==> SKIP typecheck:lint (tsconfig.lint.json not present)
==> lint
==> format:check
Checking formatting...
All matched files use Prettier code style!
==> css:policy
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
OK: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css passes content policy check
==> test:node
D3: Pipeline preflight on generalization scenes
Testing scenes: bench_basic, sample_prep_bench, staining_bench, cell_counter_basic, hood_basic, bench_basic_row_slot

Preflighting bench_basic...
  -> PASS (0 diagnostics, 1 passes)
Preflighting sample_prep_bench...
  -> PASS (0 diagnostics, 1 passes)
Preflighting staining_bench...
  -> PASS (3 diagnostics, 3 passes)
Preflighting cell_counter_basic...
  -> PASS (0 diagnostics, 1 passes)
Preflighting hood_basic...
  -> PASS (0 diagnostics, 1 passes)
Preflighting bench_basic_row_slot...
  -> PASS (0 diagnostics, 1 passes)

Generating report...
Report written to: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/reports/m2_generalization_preflight.md

D4-ready (preflight pass): 6 / 6
All scenes ready for D4 rendering.
OK tests/test_generalization_preflight.mjs (284.015958ms)
OK tests/test_structural_guards.mjs (131.284792ms)
  tests 25
  suites 0
  pass 25
  fail 0
  cancelled 0
  skipped 0
  todo 0
  duration_ms 288.72125
Summary:
  [PASS] typecheck
  [SKIP] typecheck:lint (tsconfig.lint.json not present)
  [PASS] lint
  [PASS] format:check
  [PASS] css:policy
  [PASS] test:node
PASS: 6 checks passed.
```

Note: per-subtest output lines from `node --test` (25 individual pass lines and
guard-test scaffolding output) were elided here for readability; full unedited
log is at `/tmp/baseline_check.log`. All 25 tests passed, 0 failed.

## Verdict

pass
