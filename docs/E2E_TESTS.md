# E2E_TESTS.md

End-to-end (E2E) testing conventions for this repo.

## Test structure

The repo uses a three-tier test layout:

- **Pytest (unit/regression)**: `tests/test_*.py` and pure-function `.mjs` files
- **Browser E2E**: `tests/e2e/` for Playwright-driven tests (UI/layout/walkthrough)
- **Heavy E2E**: `tests_e2e/` for slow/complex CLI tests (if needed)

This separation keeps fast tests fast and organizes browser automation clearly.

## Where tests live

| Location | File type | How to run | Notes |
| --- | --- | --- | --- |
| `tests/` | `test_*.py` | `pytest tests/` | Fast pytest unit tests |
| `tests/` | `test_*.mjs` (pure-function) | `node tests/test_name.mjs` | Pure-function tests (no browser); e.g., protocol graph validation |
| `tests/e2e/` | `test_*.mjs` (browser) | `node tests/e2e/test_name.mjs` | Browser-driven UI/layout/walkthrough tests |
| `tests/e2e/` | `*.mjs` (helpers) | `node tests/e2e/helper_name.mjs` | Shared helpers for browser tests (e.g., walker_helpers.mjs) |
| `tests_e2e/` | `e2e_*.sh` or `e2e_*.py` | `bash tests_e2e/e2e_name.sh` | Heavy E2E runners for slow scenarios (optional) |

## How to run

**Pytest (Python unit tests):**

```bash
pytest tests/
```

**Browser tests:**

```bash
node tests/e2e/test_game_ui.mjs
```

**Pure-function Node tests:**

```bash
node tests/protocol_graph_smoke.mjs
```

**Heavy E2E (if present):**

```bash
bash tests_e2e/e2e_<name>.sh
source source_me.sh && python3 tests_e2e/e2e_<name>.py
```

Note: Pytest collects only `.py` files from `tests/`. All `.mjs` files (whether in `tests/` or `tests/e2e/`) must be run directly with `node`.

## What E2E tests should cover

- Whole-script behavior: run the CLI end to end with realistic arguments and
  check the produced files or exit code.
- I/O round trips: encode a file with one script, decode with another,
  compare to the original.
- Integration with external tools where mocking would defeat the point.
- Anything that needs user input or read/write to files (the `assert` rules
  forbid asserts in plain scripts entirely; cover that behavior here instead;
  see [PYTHON_STYLE.md](PYTHON_STYLE.md#assert)).

## What E2E tests should not cover

- Pure function correctness. That belongs in pytest under `tests/`.
- Anything fast enough to live in pytest. If a check finishes in under a
  second and does not touch the real filesystem in a meaningful way, it is a
  unit test, not an E2E test.

## Asserts and failures

- E2E test scripts may use `assert` (they are test files, not plain scripts).
- Prefer explicit exit codes and clear stderr messages so a failing E2E run
  is easy to diagnose without reading the script.

## Related docs

- [PYTEST_STYLE.md](PYTEST_STYLE.md): fast unit tests under `tests/`.
- [PYTHON_STYLE.md](PYTHON_STYLE.md): repo-wide Python rules, including
  the `assert`-only-in-tests boundary.
- [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md): browser-driven E2E with
  Playwright, when applicable.
