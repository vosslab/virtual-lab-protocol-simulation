"""
Test path-kind consistency check in object_validator.py.

Tests the _validate_path_kind_consistency method:
- Path depth 1 (content/objects/<name>.yaml) emits ERROR.
- Path depth 2 with matching kind is valid.
- Path depth 2 with mismatched kind emits ERROR.
"""

import sys
from pathlib import Path

# Setup import path
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from validation.yaml.object_validator import ObjectValidator
from validation.yaml.findings import Severity


def test_path_kind_consistency_depth_1_error():
	"""Error: depth-1 path (content/objects/<name>.yaml) must be in kind subfolder."""
	validator = ObjectValidator()
	obj = {
		'object_name': 'well_plate_96',
		'kind': 'plate',
		'label': 'Well Plate 96',
		'state_fields': [],
		'capabilities': [],
	}
	path = 'content/objects/well_plate_96.yaml'

	findings = validator._validate_path_kind_consistency(obj, path)

	assert any(f.severity == Severity.ERROR for f in findings), "Depth-1 path should produce ERROR"
	assert findings[0].severity == Severity.ERROR
	assert 'directly under content/objects/' in findings[0].message
	assert 'content/objects/<kind>/' in findings[0].message


def test_path_kind_consistency_depth_2_match():
	"""Valid: depth-2 path with matching kind (content/objects/<kind>/<name>.yaml)."""
	validator = ObjectValidator()
	obj = {
		'object_name': 'well_plate_96',
		'kind': 'plate',
		'label': 'Well Plate 96',
		'state_fields': [],
		'capabilities': [],
	}
	path = 'content/objects/plate/well_plate_96.yaml'

	findings = validator._validate_path_kind_consistency(obj, path)

	assert len(findings) == 0, "Matching kind should produce no findings"


def test_path_kind_consistency_depth_2_mismatch():
	"""Error: depth-2 path with mismatched kind."""
	validator = ObjectValidator()
	obj = {
		'object_name': 'microtube_rack_24',
		'kind': 'rack',
		'label': 'Microtube Rack 24',
		'state_fields': [],
		'capabilities': [],
	}
	path = 'content/objects/decoration/microtube_rack_24.yaml'

	findings = validator._validate_path_kind_consistency(obj, path)

	assert any(f.severity == Severity.ERROR for f in findings), "Mismatched kind should produce ERROR"
	assert findings[0].severity == Severity.ERROR
	assert 'path-kind mismatch' in findings[0].message
	assert 'rack' in findings[0].message
	assert 'decoration' in findings[0].message
