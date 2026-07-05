"""
Regression tests for the validation-output clarity model.

These lock the severity/count honesty and the two detection-bug fixes so a
future edit cannot restore red warning counts or the false SVG/asset findings.
Behavior-focused (severity bucketing, exit-relevant counts, normalization
verdicts), not message wording.
"""

# local repo modules
import validation.shared_toolkit.verbosity as verbosity
import validation.shared_toolkit.findings as shared_findings
import validation.yaml_schema.findings as yaml_findings
import validation.yaml_schema.content_lint as content_lint
import validation.svg.asset_audit as asset_audit
import validation.validate as validate


#============================================
# _count_by_severity: ERROR-only blocking, INFO as advisory
#============================================
def _wf(severity):
	# Build a minimal yaml-schema Finding with the given severity.
	return yaml_findings.Finding(path="x", lineno=None, severity=severity, message="m")


def test_count_by_severity_buckets_three_tiers():
	findings = [
		_wf(shared_findings.Severity.ERROR),
		_wf(shared_findings.Severity.WARNING),
		_wf(shared_findings.Severity.WARNING),
		_wf(shared_findings.Severity.INFO),
	]
	counts = content_lint._count_by_severity(findings)
	assert counts == {'errors': 1, 'warnings': 2, 'advisories': 1}


def test_count_by_severity_parse_failures_are_errors():
	# Parse failures (malformed YAML) count as blocking errors.
	counts = content_lint._count_by_severity([_wf(shared_findings.Severity.WARNING)], parse_failures=2)
	assert counts['errors'] == 2
	assert counts['warnings'] == 1


def test_warning_only_tree_does_not_block():
	# A warning-only run has zero errors, so success is True (exit 0).
	counts = content_lint._count_by_severity([
		_wf(shared_findings.Severity.WARNING),
		_wf(shared_findings.Severity.INFO),
	])
	assert counts['errors'] == 0


#============================================
# severity_rollup: grouped, icons, empty groups omitted
#============================================
def test_severity_rollup_omits_empty_groups():
	out = verbosity.severity_rollup([], [("non-normalized", 5)], [])
	assert "WARNINGS" in out
	assert "ERRORS" not in out
	assert "ADVISORIES" not in out


def test_severity_rollup_carries_severity_icons():
	out = verbosity.severity_rollup(
		[("placement-collision", 2)],
		[("unresolved-target", 3)],
		[("orphan", 4)],
	)
	# Icons carry meaning so NO_COLOR loses nothing.
	assert "! placement-collision: 2" in out
	assert "? unresolved-target: 3" in out
	assert "i orphan: 4" in out


def test_severity_rollup_sorts_by_count_descending():
	out = verbosity.severity_rollup([], [("a", 1), ("b", 9)], [])
	assert out.index("b:") < out.index("a:")


#============================================
# summary_line: three-tier shape, no "failures"
#============================================
def test_summary_line_drops_failures_word():
	line = verbosity.summary_line(10, 1, item_label="files", warnings=2, advisories=3)
	assert "failures" not in line
	assert "1 errors" in line and "2 warnings" in line and "3 advisories" in line


#============================================
# SVG normalization: xmlns fix did not blind the real check
#============================================
def test_check_normalization_accepts_real_normalized_svg(tmp_path, monkeypatch):
	# A minimal SVG with the default xmlns namespace and a numeric viewBox is
	# normalized; the old code wrongly failed real assets shaped like this.
	svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>'
	(tmp_path / "normalized.svg").write_text(svg, encoding="utf-8")
	monkeypatch.setattr(asset_audit, "ASSETS_DIR", str(tmp_path))
	status, reason = asset_audit.check_normalization("normalized")
	assert status == "normalized"
	assert reason is None


def test_check_normalization_flags_missing_viewbox(tmp_path, monkeypatch):
	# A present-but-non-normalized SVG (no viewBox) is still caught.
	svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
	(tmp_path / "no_viewbox.svg").write_text(svg, encoding="utf-8")
	monkeypatch.setattr(asset_audit, "ASSETS_DIR", str(tmp_path))
	status, reason = asset_audit.check_normalization("no_viewbox")
	assert status == "failed"
	assert reason == "no_viewbox"


def test_check_normalization_flags_malformed_xml(tmp_path, monkeypatch):
	(tmp_path / "broken.svg").write_text("<svg><unclosed>", encoding="utf-8")
	monkeypatch.setattr(asset_audit, "ASSETS_DIR", str(tmp_path))
	status, reason = asset_audit.check_normalization("broken")
	assert status == "failed"
	assert reason == "xml_parse_error"


#============================================
# Aggregate scoreboard counting
#============================================
def test_extract_counts_reads_three_tiers():
	stdout = "Checked 5 files. 7 errors. 3 warnings. 2 advisories."
	assert validate._extract_counts(stdout) == (7, 3, 2)


def test_extract_counts_zero_when_no_summary():
	assert validate._extract_counts("no summary here") == (0, 0, 0)
