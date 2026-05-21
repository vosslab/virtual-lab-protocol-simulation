#!/usr/bin/env python3
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
