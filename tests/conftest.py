# conftest = "don't collect tests/playwright/ or tests/e2e/ as pytest tests"
# Both subtrees run outside pytest -- see docs/PLAYWRIGHT_USAGE.md and docs/E2E_TESTS.md.
collect_ignore = ["e2e", "playwright"]
