"""
Test validation JSON schema stability.

Verifies that the JSON schema for validation findings remains structurally sound
and conforms to the documented format in docs/VALIDATION_JSON_SCHEMA.md.

This is a snapshot test on the structure only, not on specific finding counts
which can drift naturally as code evolves.
"""

import json
import os
import subprocess
from pathlib import Path

import git_file_utils


def test_validation_yaml_json_schema():
	"""
	Test that validation/yaml/content_lint.py --json emits valid JSON with correct structure.

	Validates:
	- JSON is well-formed and parseable.
	- Top-level key 'findings' exists and is a list.
	- Each finding has required fields: severity, tool, code, message.
	- Optional fields (path, line, protocol, etc.) are present when populated.
	- Severity values are in the documented set: ERROR, WARNING, INFO.
	- Codes are non-empty strings.
	"""
	repo_root = Path(git_file_utils.get_repo_root())

	# Run the YAML validator with --json against the repo
	result = subprocess.run(
		['python3', 'validation/yaml/content_lint.py', '--json'],
		cwd=repo_root,
		capture_output=True,
		text=True,
		env={**os.environ, 'PYTHONPATH': str(repo_root) + os.pathsep + os.environ.get('PYTHONPATH', ''), 'PYTHONUNBUFFERED': '1'}
	)

	# Parse JSON output
	# The validator outputs text before JSON, so we need to extract it.
	# Use brace-depth tracking to find a complete JSON object.
	output_lines = result.stdout.split('\n')
	json_start = -1
	brace_depth = 0
	json_end = -1

	for i, line in enumerate(output_lines):
		stripped = line.strip()
		if json_start == -1 and stripped and stripped[0] == '{':
			json_start = i

		if json_start != -1:
			for char in line:
				if char == '{':
					brace_depth += 1
				elif char == '}':
					brace_depth -= 1
					if brace_depth == 0:
						json_end = i
						break
		if json_end != -1:
			break

	assert json_start >= 0, f"No JSON found in validator output. stderr: {result.stderr}. Last 200 chars of stdout: {result.stdout[-200:]}"

	# Reconstruct the JSON
	if json_end == -1:
		json_end = len(output_lines) - 1
	json_text = '\n'.join(output_lines[json_start:json_end + 1])
	try:
		data = json.loads(json_text)
	except json.JSONDecodeError as e:
		raise AssertionError(f"Invalid JSON in validator output: {e}\nJSON text: {json_text[:500]}\nstderr: {result.stderr}")

	# Validate structure
	assert isinstance(data, dict), "JSON root must be an object"
	assert 'findings' in data, "JSON must have 'findings' key"
	assert isinstance(data['findings'], list), "'findings' must be a list"

	# Validate each finding
	valid_severities = {'ERROR', 'WARNING', 'INFO'}
	for i, finding in enumerate(data['findings']):
		assert isinstance(finding, dict), f"Finding {i} must be an object"

		# Required fields
		assert 'severity' in finding, f"Finding {i} missing 'severity'"
		assert 'tool' in finding, f"Finding {i} missing 'tool'"
		assert 'code' in finding, f"Finding {i} missing 'code'"
		assert 'message' in finding, f"Finding {i} missing 'message'"

		# Required field types and values
		assert isinstance(finding['severity'], str), f"Finding {i} severity must be string"
		assert finding['severity'] in valid_severities, \
			f"Finding {i} severity '{finding['severity']}' not in {valid_severities}"
		assert isinstance(finding['tool'], str), f"Finding {i} tool must be string"
		assert isinstance(finding['code'], str), f"Finding {i} code must be string"
		assert len(finding['code']) > 0, f"Finding {i} code must not be empty"
		assert isinstance(finding['message'], str), f"Finding {i} message must be string"

		# Optional fields (if present, check type)
		if 'path' in finding:
			assert isinstance(finding['path'], str), f"Finding {i} path must be string"
		if 'line' in finding:
			assert isinstance(finding['line'], (int, type(None))), f"Finding {i} line must be int or null"
			if finding['line'] is not None:
				assert finding['line'] > 0, f"Finding {i} line must be positive"
		if 'protocol' in finding:
			assert isinstance(finding['protocol'], str), f"Finding {i} protocol must be string"
		if 'scene' in finding:
			assert isinstance(finding['scene'], str), f"Finding {i} scene must be string"
		if 'step' in finding:
			assert isinstance(finding['step'], str), f"Finding {i} step must be string"
		if 'target' in finding:
			assert isinstance(finding['target'], str), f"Finding {i} target must be string"
		if 'extras' in finding:
			assert isinstance(finding['extras'], dict), f"Finding {i} extras must be object"


def test_validation_ndjson_schema():
	"""
	Test that validation/yaml/validate.py --ndjson emits valid newline-delimited JSON.

	Each line is a JSON object (a finding). The validator emits one JSON object per line
	for findings. When summary records are implemented, they will appear at the end.
	"""
	repo_root = Path(git_file_utils.get_repo_root())

	# Run the YAML validator with --ndjson
	result = subprocess.run(
		['python3', 'validation/yaml/validate.py', '--ndjson'],
		cwd=repo_root,
		capture_output=True,
		text=True,
		env={**os.environ, 'PYTHONPATH': str(repo_root) + os.pathsep + os.environ.get('PYTHONPATH', ''), 'PYTHONUNBUFFERED': '1'}
	)

	# Extract only lines that look like JSON (skip text output)
	output_lines = result.stdout.split('\n')
	json_lines = []
	for line in output_lines:
		line = line.strip()
		if line and line.startswith('{'):
			json_lines.append(line)

	# Extract and parse JSON lines; even with no findings, the validator should emit valid JSON
	# (current behavior: may emit empty if no findings, or at least the structure header)

	# Parse each line
	records = []
	for i, json_line in enumerate(json_lines):
		try:
			record = json.loads(json_line)
			records.append(record)
		except json.JSONDecodeError as e:
			raise AssertionError(f"Invalid JSON on line {i}: {e}\nLine: {json_line}")

	# Validate each record (currently findings; summary records TBD)
	valid_severities = {'ERROR', 'WARNING', 'INFO'}
	for i, record in enumerate(records):
		assert isinstance(record, dict), f"Record {i} must be object"

		# Skip summary records if present (future feature)
		if record.get('summary') is True:
			continue

		# Validate finding structure
		assert 'severity' in record, f"Record {i} missing severity"
		assert 'tool' in record, f"Record {i} missing tool"
		assert 'code' in record, f"Record {i} missing code"
		assert 'message' in record, f"Record {i} missing message"
		assert record['severity'] in valid_severities, \
			f"Record {i} invalid severity: {record['severity']}"
		assert isinstance(record['code'], str) and len(record['code']) > 0, \
			f"Record {i} invalid code"
