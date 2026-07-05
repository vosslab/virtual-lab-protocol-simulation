# No fixture policy

This repo carries an abundance of real content files (`content/protocols/**`,
`content/objects/**`, `content/base_scenes/**`, `assets/**`). A test almost
always has a real file to point at or an inline case to construct nearby.
Content is the fixture. Committed test fixtures and diagnostic YAML are
unnecessary here.

## Preferred paths

Point the test at a real `content/**` or `assets/**` file when the test
checks that file's shape or loader behavior. Build the case inline next to
the assertion otherwise: use `tmp_path` in Python, or a literal in-memory
object in Node (see `tests/test_target_adapter.mjs` for the pattern). Keep
test setup inline once behavior is pinned.

## Anti-drift

Do not create fixture directories (`tests/fixtures/`, `tests/content/`,
`tests/data/`); they accumulate stale files and collect dust after their
first use.

## No dev_smoke

There is no `dev_smoke` protocol type in this repo. Diagnostic protocol YAML
is not a thing here. Gesture and scene coverage comes from real
`content/protocols/**` exercised by the walker.

## Gate

A committed fixture is banned unless its own shape, loader, or shared
infrastructure is the behavior under test; the default answer is no. See
[PYTEST_STYLE.md](../PYTEST_STYLE.md#fixture-policy) for the full canonical
procedure.
