"""
Unit tests for the shared verbosity contract formatters.

Formatter unit cases (WP1.1): resolve_level, summary_line, diagnostic_summary.

Slow subprocess/per-stage compliance tests live in tests/e2e/e2e_validation_verbosity.py
and are excluded from the pytest fast lane per docs/E2E_TESTS.md.
"""

# PIP3 modules
import pytest

# local repo modules
import validation.shared_toolkit.verbosity as verbosity


#============================================
# resolve_level
#============================================
def test_resolve_level_neither_is_normal():
	level = verbosity.resolve_level(quiet=False, verbose=False)
	assert level is verbosity.VerbosityLevel.NORMAL


def test_resolve_level_quiet():
	level = verbosity.resolve_level(quiet=True, verbose=False)
	assert level is verbosity.VerbosityLevel.QUIET


def test_resolve_level_verbose():
	level = verbosity.resolve_level(quiet=False, verbose=True)
	assert level is verbosity.VerbosityLevel.VERBOSE


def test_resolve_level_both_raises():
	with pytest.raises(ValueError):
		verbosity.resolve_level(quiet=True, verbose=True)


#============================================
# summary_line
#============================================
def test_summary_line_zero_counts_emit_all_tiers():
	# Zero counts must still print all three severity-tier tokens verbatim.
	line = verbosity.summary_line(5, 0, item_label="files", warnings=0, advisories=0)
	assert "0 errors" in line
	assert "0 warnings" in line
	assert "0 advisories" in line


def test_summary_line_nonzero_counts():
	line = verbosity.summary_line(
		12, 3, item_label="objects", warnings=2, advisories=1
	)
	assert "3 errors" in line
	assert "2 warnings" in line
	assert "1 advisories" in line


#============================================
# diagnostic_summary
#============================================
def test_diagnostic_summary_all_empty_states_no_diagnostics():
	data = verbosity.DiagnosticData()
	block = verbosity.diagnostic_summary(data)
	assert block == "No diagnostics."


def test_diagnostic_summary_empty_section_is_omitted():
	# top_offenders and category_counts are empty; only top_codes renders.
	data = verbosity.DiagnosticData(top_codes=[("E001", 4)])
	block = verbosity.diagnostic_summary(data)
	assert "E001" in block
	assert "offenders" not in block.lower()


def test_diagnostic_summary_sort_count_desc_then_name_asc():
	# Equal counts (5) break ties by name ascending: alpha before beta.
	data = verbosity.DiagnosticData(
		top_codes=[("beta", 5), ("zeta", 9), ("alpha", 5)])
	block = verbosity.diagnostic_summary(data)
	assert block.index("zeta") < block.index("alpha") < block.index("beta")


def test_diagnostic_summary_truncates_to_top_k_with_more_line():
	# Build more entries than TOP_K to force truncation.
	entries = [(f"code{n:02d}", n) for n in range(verbosity.TOP_K + 3)]
	data = verbosity.DiagnosticData(top_codes=entries)
	block = verbosity.diagnostic_summary(data)
	assert "... and 3 more" in block
