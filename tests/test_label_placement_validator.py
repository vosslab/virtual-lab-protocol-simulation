"""Tests for label_placement enum validation in BaseSceneValidator.

Covers three behaviors:
- 'top' and 'bottom' are accepted in layout_rules and placement.layout.
- An invalid value (e.g. 'middle') is rejected in both locations.
- Absent field (no layout_rules block, or block without label_placement) validates cleanly;
  default 'top' is resolved in the layout engine, not here.
"""

# local repo modules
import validation.yaml_schema.scene_base_validator as scene_base_validator
import validation.shared_toolkit.findings as shared_findings


#============================================
# Helpers
#============================================

def _minimal_scene(label_placement_layout_rules=None, placement_label_placement=None):
	"""Build a minimal valid base scene with optional label_placement fields.

	Args:
		label_placement_layout_rules: value to set at layout_rules.label_placement,
		  or None to omit the field entirely.
		placement_label_placement: value to set at placements[0].layout.label_placement,
		  or None to omit the field entirely.

	Returns:
		A scene dict that satisfies all other validator requirements.
	"""
	placement = {
		'placement_name': 'p1',
		'object_name': 'some_object',
		'zone': 'z1',
	}
	if placement_label_placement is not None:
		placement['layout'] = {'label_placement': placement_label_placement}

	scene = {
		'scene_name': 'test_scene',
		'workspace': 'equipment_bench',
		'capabilities': ['item_workspace'],
		'scene_bounds': {'left': 0, 'right': 100, 'top': 0, 'bottom': 100},
		'zones': [{'zone_name': 'z1', 'bounds': {'left': 0, 'right': 100, 'top': 50, 'bottom': 100}}],
		'placements': [placement],
	}
	if label_placement_layout_rules is not None:
		scene['layout_rules'] = {'label_placement': label_placement_layout_rules}
	return scene


def _has_any_error(findings: list) -> bool:
	"""Return True if any finding is ERROR severity."""
	for f in findings:
		if f.severity == shared_findings.Severity.ERROR:
			return True
	return False


def _make_validator() -> scene_base_validator.BaseSceneValidator:
	"""Return a validator with a stub object set so object_name cross-refs pass."""
	v = scene_base_validator.BaseSceneValidator()
	# Allow the stub object name used in _minimal_scene.
	v.set_object_names({'some_object'})
	return v


#============================================
# layout_rules.label_placement
#============================================

def test_layout_rules_label_placement_top_accepted():
	scene = _minimal_scene(label_placement_layout_rules='top')
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_layout_rules_label_placement_bottom_accepted():
	scene = _minimal_scene(label_placement_layout_rules='bottom')
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_layout_rules_label_placement_invalid_rejected():
	scene = _minimal_scene(label_placement_layout_rules='middle')
	findings = _make_validator().validate(scene, 'test')
	assert _has_any_error(findings)


def test_layout_rules_absent_validates_cleanly():
	# No layout_rules block at all -- engine resolves default 'top'.
	scene = _minimal_scene()
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_layout_rules_present_without_label_placement_validates_cleanly():
	# layout_rules present but label_placement key absent -- clean.
	scene = _minimal_scene()
	scene['layout_rules'] = {'label_offset_y': 4}
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


#============================================
# placement.layout.label_placement
#============================================

def test_placement_layout_label_placement_top_accepted():
	scene = _minimal_scene(placement_label_placement='top')
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_placement_layout_label_placement_bottom_accepted():
	scene = _minimal_scene(placement_label_placement='bottom')
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_placement_layout_label_placement_invalid_rejected():
	scene = _minimal_scene(placement_label_placement='middle')
	findings = _make_validator().validate(scene, 'test')
	assert _has_any_error(findings)


def test_placement_layout_absent_validates_cleanly():
	# No layout block on placement -- engine resolves default 'top'.
	scene = _minimal_scene()
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []


def test_placement_layout_present_without_label_placement_validates_cleanly():
	# placement.layout present but label_placement key absent -- clean.
	scene = _minimal_scene()
	scene['placements'][0]['layout'] = {'anchor_y': 'bottom'}
	findings = _make_validator().validate(scene, 'test')
	errors = [f for f in findings if f.severity == shared_findings.Severity.ERROR]
	assert errors == []
