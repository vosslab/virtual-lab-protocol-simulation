"""
G9 camelCase YAML key gate for spec documents.

Scans docs/PRIMARY_*.md and every docs/specs/*.md (excluding
SPEC_DESIGN_CHECKLIST.md, whose rule text legitimately names retired
camelCase terms) for camelCase identifiers in authored YAML fenced
blocks and markdown schema-table field-name cells. TypeScript and other
code-language fences are out of scope.
"""

import os
import re

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
def _build_target_paths(repo_root: str) -> list[str]:
	"""
	Build the list of files to scan, excluding the checklist.
	"""
	targets = []
	for relative in PRIMARY_FILES:
		full = os.path.join(repo_root, relative)
		if os.path.isfile(full):
			targets.append(full)
	specs_full = os.path.join(repo_root, SPECS_DIR)
	for name in sorted(os.listdir(specs_full)):
		if not name.endswith(".md"):
			continue
		if name == CHECKLIST_EXCLUDE:
			continue
		targets.append(os.path.join(specs_full, name))
	return targets


#============================================
# YAML-bearing fence languages: empty tag and explicit yaml/yml.
YAML_FENCE_LANGS = frozenset({"", "yaml", "yml"})

_FENCE_OPEN_RE = re.compile(r"^```(\S*)\s*$")
_FENCE_CLOSE_RE = re.compile(r"^```\s*$")
_YAML_KEY_RE = re.compile(r"^\s*([a-z]+[A-Z][a-zA-Z0-9_]*)\s*:")
_TABLE_FIRST_COL_RE = re.compile(r"^\|\s*`([a-z]+[A-Z][a-zA-Z0-9_]*)`\s*\|")


#============================================
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
			if match is not None:
				findings.append(f"{path}:{index}: {stripped}")
				continue
		# Outside any fence: check markdown table first-column field names
		if fence_lang is None:
			table_match = _TABLE_FIRST_COL_RE.match(stripped)
			if table_match is not None:
				findings.append(f"{path}:{index}: {stripped}")
	return findings


#============================================
def test_gate_g9_camelcase_yaml_keys() -> None:
	"""
	G9: camelCase identifiers banned as authored YAML keys inside YAML
	fenced blocks and as schema-table field-name cells. TypeScript and
	other code-language fenced blocks are out of scope (runtime
	identifiers may stay camelCase).
	"""
	repo_root = git_file_utils.get_repo_root()
	paths = _build_target_paths(repo_root)
	findings = []
	for path in paths:
		findings.extend(_camel_case_yaml_findings(path))
	assert not findings, (
		"G9 found camelCase YAML keys or schema field names:\n"
		+ "\n".join(findings)
	)
