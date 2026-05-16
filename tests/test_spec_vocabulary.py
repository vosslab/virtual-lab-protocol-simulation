"""
Vocabulary gate tests for spec documents.

Enforces zero recurrence of retired terms in docs/PRIMARY_*.md and
docs/specs/*.md. G1 excludes docs/specs/SPEC_DESIGN_CHECKLIST.md because
that file legitimately names retired terms in its anti-drift rule
statements (lock section and section 26).

G1-G4 and G7-G9 are hard gates that must report zero matches. G5 and G6
are informational reviews that always pass but print a triage report.
"""

import os
import re
import subprocess

import git_file_utils


# Files in scope: docs/PRIMARY_*.md plus every docs/specs/*.md
PRIMARY_FILES = (
	"docs/PRIMARY_CONTRACT.md",
	"docs/PRIMARY_DESIGN.md",
	"docs/PRIMARY_SPEC.md",
)
SPECS_DIR = "docs/specs"
CHECKLIST_EXCLUDE = "SPEC_DESIGN_CHECKLIST.md"


#============================================
def _build_target_paths(repo_root: str, exclude_checklist: bool) -> list[str]:
	"""
	Build the list of files to scan, optionally excluding the checklist.
	"""
	targets = []
	# Primary docs
	for relative in PRIMARY_FILES:
		full = os.path.join(repo_root, relative)
		if os.path.isfile(full):
			targets.append(full)
	# Spec docs
	specs_full = os.path.join(repo_root, SPECS_DIR)
	for name in sorted(os.listdir(specs_full)):
		if not name.endswith(".md"):
			continue
		if exclude_checklist and name == CHECKLIST_EXCLUDE:
			continue
		targets.append(os.path.join(specs_full, name))
	return targets


#============================================
def _run_rg(pattern: str, paths: list[str]) -> tuple[int, str]:
	"""
	Run rg with -n --no-heading over the explicit file list.

	Returns:
		(returncode, stdout). rg exit 0 = matches, 1 = no matches.
	"""
	command = ["rg", "-n", "--no-heading", "--color=never", pattern]
	command.extend(paths)
	result = subprocess.run(command, capture_output=True, text=True)
	return result.returncode, result.stdout


#============================================
def _assert_zero_matches(gate_name: str, pattern: str, exclude_checklist: bool) -> None:
	"""
	Assert that the given regex finds no matches across the scoped files.
	"""
	repo_root = git_file_utils.get_repo_root()
	paths = _build_target_paths(repo_root, exclude_checklist)
	returncode, stdout = _run_rg(pattern, paths)
	# rg exit 1 means no matches; treat as pass
	if returncode == 1:
		return
	# rg exit 0 means matches were found; fail loudly with details
	# rg exit 2 means an error; also fail
	message = f"{gate_name} found matches for pattern {pattern!r}:\n{stdout}"
	assert returncode == 1, message


#============================================
def _report_matches(gate_name: str, pattern: str, exclude_checklist: bool) -> None:
	"""
	Run rg and print a triage report. Always passes.
	"""
	repo_root = git_file_utils.get_repo_root()
	paths = _build_target_paths(repo_root, exclude_checklist)
	returncode, stdout = _run_rg(pattern, paths)
	print(f"\n[{gate_name}] informational review for pattern {pattern!r}")
	if returncode == 1:
		print(f"[{gate_name}] no matches.")
		return
	if returncode != 0:
		print(f"[{gate_name}] rg returned exit {returncode}; matches below if any:")
	match_count = stdout.count("\n") if stdout else 0
	print(f"[{gate_name}] {match_count} match line(s) found:")
	print(stdout)


#============================================
def test_gate_g1_retired_field_names() -> None:
	"""
	G1: retired field names must not recur in scoped docs (excluding the
	checklist, which legitimately names retired terms in its rule text).
	"""
	pattern = r"short_label|shortLabel|liquid_color|render_map|liquid_container|element_id|elementId"
	_assert_zero_matches("G1", pattern, exclude_checklist=True)


#============================================
def test_gate_g2_label_override() -> None:
	"""
	G2: scene placement must not override label semantics.
	"""
	pattern = r"placement\.label|scene placement may override.*label|placement may override.*label"
	_assert_zero_matches("G2", pattern, exclude_checklist=False)


#============================================
def test_gate_g3_inventory_ref() -> None:
	"""
	G3: retired identity field inventory_ref / inventoryRef must not appear.
	"""
	pattern = r"inventory_ref|inventoryRef"
	_assert_zero_matches("G3", pattern, exclude_checklist=False)


#============================================
def test_gate_g4_camel_case_yaml() -> None:
	"""
	G4: retired camelCase YAML field names must not appear.
	"""
	pattern = (
		r"svgAsset|widthScale|depthTier|alignStop|"
		r"baselineOverride|anchorYOffset|defaultWidth|labelWidth"
	)
	_assert_zero_matches("G4", pattern, exclude_checklist=False)


#============================================
def test_gate_g5_identity_tuple_review() -> None:
	"""
	G5 informational: surface identity-tuple language for manual review.
	"""
	pattern = r"identity tuple|override identity|object identity"
	_report_matches("G5", pattern, exclude_checklist=False)


#============================================
def test_gate_g6_override_boundary_review() -> None:
	"""
	G6 informational: surface override-boundary language for manual review.
	"""
	pattern = r"may override|placement may|scene may"
	_report_matches("G6", pattern, exclude_checklist=False)


#============================================
def test_gate_g7_bare_name_field() -> None:
	"""
	G7: bare `name:` is banned as an authored YAML field or schema-table
	field name. Use the scope-specific handle (`protocol_name`, `step_name`,
	`field_name`, `object_name`). The checklist itself is excluded because
	its rule text and quick-reference table legitimately spell `name:` while
	describing the ban.
	"""
	pattern = r"^\s*name:"
	_assert_zero_matches("G7", pattern, exclude_checklist=True)


#============================================
def test_gate_g8_retired_entry_block() -> None:
	"""
	G8: the retired `entry:` block shape (top-level `entry:` followed by
	`scene:` and `step:` subkeys) is banned. The current canonical shape is
	a flat top-level `entry_step:` field. Authored YAML at indentation
	level zero must not declare `entry:`.
	"""
	pattern = r"^entry:"
	_assert_zero_matches("G8", pattern, exclude_checklist=False)


#============================================
# G9 camelCase parser
CAPABILITY_ID_ALLOWLIST = frozenset({
	"itemWorkspace",
	"modalWorkspace",
	"instrumentWorkspace",
	"gridCountingWorkspace",
	"incubatorWorkspace",
	"plateReaderWorkspace",
})

# YAML-bearing fence languages: empty tag and explicit yaml/yml.
YAML_FENCE_LANGS = frozenset({"", "yaml", "yml"})
# Code-only fence languages: never inspected for camelCase YAML keys.
CODE_FENCE_LANGS = frozenset({
	"typescript", "ts", "tsx", "javascript", "js", "jsx",
	"bash", "sh", "shell", "text", "json", "html", "svg",
	"python", "py", "diff",
})

_FENCE_OPEN_RE = re.compile(r"^```(\S*)\s*$")
_FENCE_CLOSE_RE = re.compile(r"^```\s*$")
_YAML_KEY_RE = re.compile(r"^\s*([a-z]+[A-Z][a-zA-Z0-9_]*)\s*:")
_TABLE_FIRST_COL_RE = re.compile(r"^\|\s*`([a-z]+[A-Z][a-zA-Z0-9_]*)`\s*\|")


def _camel_case_yaml_findings(path: str) -> list[str]:
	"""
	Return a list of "path:line: text" findings for camelCase YAML keys in
	YAML fenced blocks and markdown schema-table field-name cells.
	"""
	findings = []
	with open(path, encoding="utf-8") as fh:
		lines = fh.readlines()
	fence_lang = None
	for index, line in enumerate(lines, start=1):
		stripped = line.rstrip("\n")
		# Track fence state
		if fence_lang is None:
			fence_open = _FENCE_OPEN_RE.match(stripped)
			if fence_open is not None:
				fence_lang = fence_open.group(1).lower()
				continue
		else:
			if _FENCE_CLOSE_RE.match(stripped):
				fence_lang = None
				continue
		# Inside a non-YAML code fence: skip
		if fence_lang is not None and fence_lang not in YAML_FENCE_LANGS:
			continue
		# Inside a YAML fence: check for camelCase keys
		if fence_lang in YAML_FENCE_LANGS and fence_lang is not None:
			match = _YAML_KEY_RE.match(stripped)
			if match is not None and match.group(1) not in CAPABILITY_ID_ALLOWLIST:
				findings.append(f"{path}:{index}: {stripped}")
				continue
		# Outside any fence: check markdown table first-column field names
		if fence_lang is None:
			table_match = _TABLE_FIRST_COL_RE.match(stripped)
			if table_match is not None and table_match.group(1) not in CAPABILITY_ID_ALLOWLIST:
				findings.append(f"{path}:{index}: {stripped}")
	return findings


def test_gate_g9_camelcase_yaml_keys() -> None:
	"""
	G9: camelCase identifiers are banned as authored YAML keys inside YAML
	fenced blocks and as schema-table field-name cells. TypeScript and other
	code-language fenced blocks are out of scope (runtime identifiers may
	stay camelCase). Capability-id strings listed in CAPABILITY_ID_ALLOWLIST
	stay camelCase per the documented exception in SCENE_YAML_FORMAT.md.
	"""
	repo_root = git_file_utils.get_repo_root()
	paths = _build_target_paths(repo_root, exclude_checklist=True)
	findings = []
	for path in paths:
		findings.extend(_camel_case_yaml_findings(path))
	assert not findings, (
		"G9 found camelCase YAML keys or schema field names:\n"
		+ "\n".join(findings)
	)
