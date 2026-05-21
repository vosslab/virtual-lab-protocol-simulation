"""
Hygiene test: enforce canonical scorecard rule.

Scans experiments/css_native_layout/ for forbidden scorecard helper patterns.

Forbidden:
- _generate_scorecard*.py
- _scorecard_helper*.py
- Hardcoded metric values in scorecard generators
- Python reimplementations of score_layout.mjs logic
"""

import os
import re

import git_file_utils


def test_no_forbidden_scorecard_helpers():
	"""Verify no forbidden scorecard helper patterns exist."""
	repo_root = git_file_utils.get_repo_root()

	# Scan experiments/css_native_layout/
	exp_dir = os.path.join(repo_root, "experiments", "css_native_layout")
	forbidden_patterns = [
		"_generate_scorecard*.py",
		"_scorecard_helper*.py",
	]

	violations = []

	# Walk the experiments directory
	if os.path.isdir(exp_dir):
		for root, dirs, files in os.walk(exp_dir):
			for fname in files:
				if fname.endswith(".py"):
					if any(
						re.match(pat.replace("*", ".*"), fname)
						for pat in forbidden_patterns
					):
						fpath = os.path.join(root, fname)
						violations.append((fpath, "forbidden filename pattern"))
					else:
						# Check for hardcoded scorecard metric values
						fpath = os.path.join(root, fname)
						try:
							with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
								content = f.read()
								# Look for hardcoded metric assignments
								if re.search(
									r"(?:balance|region_filling|aspect_ratio_fidelity|primary_prominence)\s*[:=]\s*(?:50|100)",
									content,
								):
									violations.append(
										(fpath, "hardcoded scorecard metric value")
									)
						except Exception:
							# Skip files we can't read
							pass

	# Assert no violations found
	if violations:
		msg = "Forbidden scorecard helper patterns found:\n"
		for fpath, reason in violations:
			msg += f"  {fpath}: {reason}\n"
		assert not violations, msg


def test_scorecard_claims_require_canonical_command():
	"""
	Enforce that reports claiming scorecard metrics cite score_layout.mjs.

	Approved patterns:
	1. Report contains explicit `score_layout.mjs` command invocation
	2. Report cites a source scorecard file produced by canonical run
	   (e.g., "batch2_n_canonical" is a known canonical source)

	Forbidden: Scorecard metric claims (score=, Median:, Mean:, balance, etc.)
	without any provenance citation.

	Note: This test is permissive; it looks for files that clearly present
	layout scorecard results (e.g., Ranked Scenes table, total_layout_score
	numeric values, or explicit scorecard generation headers). Single
	mentions of metric terms in discussion or CSS context are not flagged.
	"""
	repo_root = git_file_utils.get_repo_root()
	stress_results_dir = os.path.join(repo_root, "experiments", "css_native_layout", "stress_results")

	# Files that are clearly scorecard reports and must cite provenance
	# (scorecard report files, not workstream analysis docs)
	scorecard_report_patterns = [
		r"Layout Scorecard Report",
		r"Ranked Scenes.*by total_layout_score",
		r"Generated:.*Audit source:",
	]

	# Known canonical scorecard sources that reports can cite
	canonical_sources = [
		"score_layout.mjs",
		"batch2_n_canonical",
		"batch1",
	]

	violations = []

	# Walk stress_results directory for .md files
	if os.path.isdir(stress_results_dir):
		for root, dirs, files in os.walk(stress_results_dir):
			for fname in files:
				if fname.endswith(".md"):
					fpath = os.path.join(root, fname)

					# Skip visual_audit.md and other diagnostic outputs
					if fname == "visual_audit.md":
						continue

					try:
						with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
							content = f.read()

						# Check if file is clearly a scorecard report
						is_scorecard_report = any(
							re.search(pat, content, re.IGNORECASE)
							for pat in scorecard_report_patterns
						)

						if not is_scorecard_report:
							continue

						# Check if file cites a canonical source
						cites_canonical = any(source in content for source in canonical_sources)

						# Scorecard reports must cite canonical source
						if not cites_canonical:
							rel_path = os.path.relpath(fpath, repo_root)
							violations.append(
								(rel_path, "scorecard report without canonical command or source citation")
							)
					except Exception:
						# Skip files we can't read
						pass

	# Assert no violations found
	if violations:
		msg = "Scorecard guardrail violations found (reports without canonical provenance):\n"
		for fpath, reason in violations:
			msg += f"  {fpath}: {reason}\n"
		msg += "\nApproved patterns:\n"
		msg += "  1. Report contains 'score_layout.mjs' command invocation\n"
		msg += "  2. Report cites known canonical source (batch2_n_canonical, batch1, etc.)\n"
		assert not violations, msg
