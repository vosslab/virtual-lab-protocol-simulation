"""Group A rules: deterministic data blockers (BLOCKED verdict).

Group A rules detect authoring errors that prevent a scene from entering
the layout pipeline. They require no simulator. Never suppressible.
All findings carry verdict == BLOCKED.

Coordinate with validation/yaml/ structural validators to avoid duplication.
See coverage_matrix.md for the delegation of responsibility.
"""

from pathlib import Path
from typing import Any

from validation.scene_lint.findings import Finding, Verdict, Confidence
from validation.shared_toolkit.scene_loaders import (
	load_svg_viewbox,
	resolve_inheritance,
	InheritanceError,
	MultiLevelInheritanceError,
	InheritanceCycleError,
	LockedFieldMutationError,
	DanglingReferenceError,
)


#============================================
# A1: duplicate_scene_name
#============================================

def check_duplicate_scene_name(
	scenes: dict[str, dict[str, Any]]
) -> list[Finding]:
	"""
	Detect two or more scene YAMLs declaring the same scene_name.

	Args:
		scenes: Dict mapping scene file path -> loaded scene dict.

	Returns:
		List of findings, one per duplicate (empty if all unique).
	"""
	findings = []
	name_to_paths = {}

	for scene_path, scene in scenes.items():
		scene_name = scene.get('scene_name')
		if not scene_name:
			continue

		if scene_name not in name_to_paths:
			name_to_paths[scene_name] = []
		name_to_paths[scene_name].append(scene_path)

	for scene_name, paths in name_to_paths.items():
		if len(paths) > 1:
			for path in paths:
				findings.append(Finding(
					scene=scene_name,
					placement_name=None,
					rule='duplicate_scene_name',
					verdict=Verdict.BLOCKED,
					confidence=Confidence.HIGH,
					message=f"Scene name '{scene_name}' declared in multiple files: {sorted(paths)}",
					evidence={
						'duplicate_paths': sorted(paths),
					},
					fix_hints=[
						'Rename one of the scenes to have a unique scene_name',
					],
				))

	return findings


#============================================
# A2: duplicate_placement_name (post-inheritance)
#============================================

def check_duplicate_placement_name(
	scene: dict[str, Any],
	scene_name: str,
) -> list[Finding]:
	"""
	Detect placement_name duplicates within a scene after inheritance resolution.

	Args:
		scene: Resolved scene dict (inheritance already applied).
		scene_name: Scene identifier for reporting.

	Returns:
		List of findings (empty if all placement names unique).
	"""
	findings = []
	placements = scene.get('placements', [])
	if not isinstance(placements, list):
		return findings

	seen_names = {}
	for idx, placement in enumerate(placements):
		if not isinstance(placement, dict):
			continue

		pname = placement.get('placement_name')
		if not pname:
			continue

		if pname in seen_names:
			findings.append(Finding(
				scene=scene_name,
				placement_name=pname,
				rule='duplicate_placement_name',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Placement name '{pname}' appears multiple times in scene '{scene_name}'",
				evidence={
					'first_occurrence': seen_names[pname],
					'second_occurrence': idx,
				},
				fix_hints=[
					'Rename one of the placements to have a unique placement_name',
				],
			))
		else:
			seen_names[pname] = idx

	return findings


#============================================
# A3: invalid_scene_bounds
#============================================

def check_invalid_scene_bounds(
	scene: dict[str, Any],
	scene_name: str,
) -> list[Finding]:
	"""
	Validate scene_bounds: l/r/t/b in [0,100], left < right, top < bottom.

	Args:
		scene: Scene dict to validate.
		scene_name: Scene identifier for reporting.

	Returns:
		List of findings (empty if bounds valid).
	"""
	findings = []
	bounds = scene.get('scene_bounds')
	if bounds is None:
		return findings

	if not isinstance(bounds, dict):
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='invalid_scene_bounds',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=f"scene_bounds must be a dict, got {type(bounds).__name__}",
			evidence={'bounds_value': str(bounds)},
			fix_hints=['Ensure scene_bounds is a dict with keys: left, right, top, bottom'],
		))
		return findings

	for key in ['left', 'right', 'top', 'bottom']:
		val = bounds.get(key)
		if val is None:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"scene_bounds missing key '{key}'",
				evidence={'bounds': bounds},
				fix_hints=[f"Add '{key}' to scene_bounds"],
			))

	if not findings:
		left = bounds.get('left')
		right = bounds.get('right')
		top = bounds.get('top')
		bottom = bounds.get('bottom')

		if not all(isinstance(v, (int, float)) for v in [left, right, top, bottom]):
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message="scene_bounds values must be numeric",
				evidence={'bounds': bounds},
				fix_hints=['Ensure all bounds values are numbers'],
			))
			return findings

		for key, val in [('left', left), ('right', right), ('top', top), ('bottom', bottom)]:
			if not (0 <= val <= 100):
				findings.append(Finding(
					scene=scene_name,
					placement_name=None,
					rule='invalid_scene_bounds',
					verdict=Verdict.BLOCKED,
					confidence=Confidence.HIGH,
					message=f"scene_bounds.{key} = {val} outside range [0, 100]",
					evidence={'bounds': bounds, 'offending_key': key},
					fix_hints=[f"Set {key} to a value in [0, 100]"],
				))

		if left >= right:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"scene_bounds.left ({left}) must be < right ({right})",
				evidence={'bounds': bounds},
				fix_hints=['Ensure left < right'],
			))

		if top >= bottom:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"scene_bounds.top ({top}) must be < bottom ({bottom})",
				evidence={'bounds': bounds},
				fix_hints=['Ensure top < bottom'],
			))

	return findings


#============================================
# A4: invalid_zone_bounds
#============================================

def check_invalid_zone_bounds(
	scene: dict[str, Any],
	scene_name: str,
) -> list[Finding]:
	"""
	Validate each zone.bounds: in [0,100], fits inside scene_bounds.

	Args:
		scene: Scene dict to validate.
		scene_name: Scene identifier for reporting.

	Returns:
		List of findings (empty if all zones valid).
	"""
	findings = []
	zones = scene.get('zones', [])
	if not isinstance(zones, list):
		return findings

	for idx, zone in enumerate(zones):
		if not isinstance(zone, dict):
			continue

		zone_name = zone.get('zone_name') or f"zone[{idx}]"
		bounds = zone.get('bounds')

		if bounds is None:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_zone_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' missing 'bounds' field",
				evidence={'zone_index': idx},
				fix_hints=['Add bounds dict with left, right, top, bottom keys'],
			))
			continue

		if not isinstance(bounds, dict):
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_zone_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' bounds must be a dict, got {type(bounds).__name__}",
				evidence={'zone_index': idx, 'bounds_value': str(bounds)},
				fix_hints=['Ensure bounds is a dict with keys: left, right, top, bottom'],
			))
			continue

		for key in ['left', 'right', 'top', 'bottom']:
			val = bounds.get(key)
			if val is None:
				findings.append(Finding(
					scene=scene_name,
					placement_name=None,
					rule='invalid_zone_bounds',
					verdict=Verdict.BLOCKED,
					confidence=Confidence.HIGH,
					message=f"Zone '{zone_name}' bounds missing key '{key}'",
					evidence={'zone_index': idx},
					fix_hints=[f"Add '{key}' to zone bounds"],
				))

		left = bounds.get('left')
		right = bounds.get('right')
		top = bounds.get('top')
		bottom = bounds.get('bottom')

		if not all(isinstance(v, (int, float)) for v in [left, right, top, bottom] if v is not None):
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_zone_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' bounds values must be numeric",
				evidence={'zone_index': idx},
				fix_hints=['Ensure all bounds values are numbers'],
			))
			continue

		for key, val in [('left', left), ('right', right), ('top', top), ('bottom', bottom)]:
			if val is not None and not (0 <= val <= 100):
				findings.append(Finding(
					scene=scene_name,
					placement_name=None,
					rule='invalid_zone_bounds',
					verdict=Verdict.BLOCKED,
					confidence=Confidence.HIGH,
					message=f"Zone '{zone_name}' bounds.{key} = {val} outside range [0, 100]",
					evidence={'zone_index': idx, 'zone_name': zone_name},
					fix_hints=[f"Set {key} to a value in [0, 100]"],
				))

		if left is not None and right is not None and left >= right:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_zone_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' left ({left}) must be < right ({right})",
				evidence={'zone_index': idx},
				fix_hints=['Ensure left < right'],
			))

		if top is not None and bottom is not None and top >= bottom:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='invalid_zone_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' top ({top}) must be < bottom ({bottom})",
				evidence={'zone_index': idx},
				fix_hints=['Ensure top < bottom'],
			))

	return findings


#============================================
# A5: zone_outside_scene_bounds
#============================================

def check_zone_outside_scene_bounds(
	scene: dict[str, Any],
	scene_name: str,
) -> list[Finding]:
	"""
	Verify each zone bounds is fully contained in scene_bounds.

	Args:
		scene: Scene dict to validate.
		scene_name: Scene identifier for reporting.

	Returns:
		List of findings (empty if all zones contained).
	"""
	findings = []
	zones = scene.get('zones', [])
	scene_bounds = scene.get('scene_bounds')

	if not isinstance(zones, list) or scene_bounds is None:
		return findings

	sb_left = scene_bounds.get('left')
	sb_right = scene_bounds.get('right')
	sb_top = scene_bounds.get('top')
	sb_bottom = scene_bounds.get('bottom')

	if not all(isinstance(v, (int, float)) for v in [sb_left, sb_right, sb_top, sb_bottom]):
		return findings

	for idx, zone in enumerate(zones):
		if not isinstance(zone, dict):
			continue

		zone_name = zone.get('zone_name') or f"zone[{idx}]"
		bounds = zone.get('bounds')

		if not isinstance(bounds, dict):
			continue

		z_left = bounds.get('left')
		z_right = bounds.get('right')
		z_top = bounds.get('top')
		z_bottom = bounds.get('bottom')

		if not all(isinstance(v, (int, float)) for v in [z_left, z_right, z_top, z_bottom]):
			continue

		if z_left < sb_left:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='zone_outside_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' left ({z_left}) < scene left ({sb_left})",
				evidence={'zone_index': idx, 'zone_name': zone_name},
				fix_hints=['Move zone right or expand scene_bounds left'],
			))

		if z_right > sb_right:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='zone_outside_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' right ({z_right}) > scene right ({sb_right})",
				evidence={'zone_index': idx, 'zone_name': zone_name},
				fix_hints=['Move zone left or expand scene_bounds right'],
			))

		if z_top < sb_top:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='zone_outside_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' top ({z_top}) < scene top ({sb_top})",
				evidence={'zone_index': idx, 'zone_name': zone_name},
				fix_hints=['Move zone down or expand scene_bounds up'],
			))

		if z_bottom > sb_bottom:
			findings.append(Finding(
				scene=scene_name,
				placement_name=None,
				rule='zone_outside_scene_bounds',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Zone '{zone_name}' bottom ({z_bottom}) > scene bottom ({sb_bottom})",
				evidence={'zone_index': idx, 'zone_name': zone_name},
				fix_hints=['Move zone up or expand scene_bounds down'],
			))

	return findings


#============================================
# A6: missing_svg_asset
#============================================

def check_missing_svg_asset(
	scene: dict[str, Any],
	scene_name: str,
	asset_base_dir: Path | None = None,
) -> list[Finding]:
	"""
	Verify that each placement's asset file resolves to a real SVG on disk.

	Args:
		scene: Scene dict to validate.
		scene_name: Scene identifier for reporting.
		asset_base_dir: Base directory for asset paths. If None, uses default.

	Returns:
		List of findings (empty if all assets exist).
	"""
	findings = []
	placements = scene.get('placements', [])

	if asset_base_dir is None:
		asset_base_dir = Path(__file__).parent.parent.parent / 'assets'

	if not isinstance(placements, list):
		return findings

	for idx, placement in enumerate(placements):
		if not isinstance(placement, dict):
			continue

		pname = placement.get('placement_name', f"placement[{idx}]")
		asset_path = placement.get('asset')

		if not asset_path:
			continue

		full_path = asset_base_dir / asset_path
		if not full_path.exists():
			findings.append(Finding(
				scene=scene_name,
				placement_name=pname,
				rule='missing_svg_asset',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Asset '{asset_path}' not found for placement '{pname}'",
				evidence={
					'asset_path': asset_path,
					'resolved_path': str(full_path),
				},
				fix_hints=[
					'Verify asset path is correct',
					f'Create the asset file at {full_path}',
				],
			))

	return findings


#============================================
# A7: invalid_svg_viewbox
#============================================

def check_invalid_svg_viewbox(
	scene: dict[str, Any],
	scene_name: str,
	asset_base_dir: Path | None = None,
) -> list[Finding]:
	"""
	Verify each asset SVG has a valid viewBox with positive dimensions.

	Args:
		scene: Scene dict to validate.
		scene_name: Scene identifier for reporting.
		asset_base_dir: Base directory for asset paths. If None, uses default.

	Returns:
		List of findings (empty if all viewBoxes valid).
	"""
	findings = []
	placements = scene.get('placements', [])

	if asset_base_dir is None:
		asset_base_dir = Path(__file__).parent.parent.parent / 'assets'

	if not isinstance(placements, list):
		return findings

	for idx, placement in enumerate(placements):
		if not isinstance(placement, dict):
			continue

		pname = placement.get('placement_name', f"placement[{idx}]")
		asset_path = placement.get('asset')

		if not asset_path:
			continue

		full_path = asset_base_dir / asset_path
		if not full_path.exists():
			continue

		try:
			width, height = load_svg_viewbox(full_path)
			if width <= 0 or height <= 0:
				findings.append(Finding(
					scene=scene_name,
					placement_name=pname,
					rule='invalid_svg_viewbox',
					verdict=Verdict.BLOCKED,
					confidence=Confidence.HIGH,
					message=f"Asset '{asset_path}' viewBox dimensions are non-positive: {width} x {height}",
					evidence={
						'asset_path': asset_path,
						'viewbox_width': width,
						'viewbox_height': height,
					},
					fix_hints=[
						f"Fix the viewBox attribute in {asset_path}",
						"Ensure both width and height are positive",
					],
				))
		except (ValueError, FileNotFoundError) as e:
			findings.append(Finding(
				scene=scene_name,
				placement_name=pname,
				rule='invalid_svg_viewbox',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Asset '{asset_path}' viewBox is invalid or missing: {e}",
				evidence={
					'asset_path': asset_path,
					'error': str(e),
				},
				fix_hints=[
					f"Add or fix the viewBox attribute in {asset_path}",
					"Format: viewBox='x y width height' (all positive numbers)",
				],
			))

	return findings


#============================================
# A8-A11: Inheritance errors (exception wrappers)
#============================================

def check_inheritance_errors(
	scene: dict[str, Any],
	scene_name: str,
	scene_path: Path | str,
) -> list[Finding]:
	"""
	Attempt to resolve scene inheritance and wrap typed exceptions as findings.

	Covers:
	- A8: inheritance_unknown_base (DanglingReferenceError)
	- A9: inheritance_multi_level (MultiLevelInheritanceError)
	- A10: inheritance_cycle (InheritanceCycleError)
	- A11: inheritance_locked_field_mutation (LockedFieldMutationError)

	Args:
		scene: Scene dict loaded from YAML (may have 'extends' field).
		scene_name: Scene identifier for reporting.
		scene_path: Path to scene YAML file (for error location context).

	Returns:
		List of findings (empty if inheritance resolves cleanly).
	"""
	findings = []

	try:
		_ = resolve_inheritance(scene)
	except DanglingReferenceError as e:
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='inheritance_unknown_base',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=str(e),
			evidence={'scene_path': str(scene_path)},
			fix_hints=[
				"Verify the 'extends' field references an existing base scene",
				"Check for typos in the base scene name",
			],
		))
	except MultiLevelInheritanceError as e:
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='inheritance_multi_level',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=str(e),
			evidence={'scene_path': str(scene_path)},
			fix_hints=[
				"Inline the base scene's 'extends' into this scene",
				"Only single-level inheritance is supported",
			],
		))
	except InheritanceCycleError as e:
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='inheritance_cycle',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=str(e),
			evidence={'scene_path': str(scene_path)},
			fix_hints=[
				"Remove the circular extends reference",
				"A scene cannot extend itself or form a cycle",
			],
		))
	except LockedFieldMutationError as e:
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='inheritance_locked_field_mutation',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=str(e),
			evidence={'scene_path': str(scene_path)},
			fix_hints=[
				"Reposition operations can only modify: zone, data-primary",
				"For other fields, use add_placements / remove_placements",
			],
		))
	except InheritanceError as e:
		findings.append(Finding(
			scene=scene_name,
			placement_name=None,
			rule='inheritance_error',
			verdict=Verdict.BLOCKED,
			confidence=Confidence.HIGH,
			message=f"Inheritance resolution failed: {e}",
			evidence={'scene_path': str(scene_path)},
			fix_hints=[
				"Check the 'extends' chain and operation fields",
			],
		))

	return findings


#============================================
# A12: inheritance_dangling_ref
#============================================

def check_inheritance_dangling_ref(
	scene: dict[str, Any],
	scene_name: str,
) -> list[Finding]:
	"""
	Detect when deactivate_placements or reposition_placements targets
	a placement that was removed by remove_placements.

	Checks the order of operations within the inheritance mutation block.

	Args:
		scene: Original scene dict (before inheritance resolution).
		scene_name: Scene identifier for reporting.

	Returns:
		List of findings (empty if no dangling references).
	"""
	findings = []

	removed_names = set(scene.get('remove_placements', []))
	deactivated_names = set(scene.get('deactivate_placements', []))
	repositioned_ops = scene.get('reposition_placements', [])

	if not isinstance(repositioned_ops, list):
		repositioned_ops = []

	repositioned_names = {op.get('placement_name') for op in repositioned_ops if isinstance(op, dict)}

	for pname in deactivated_names:
		if pname in removed_names:
			findings.append(Finding(
				scene=scene_name,
				placement_name=pname,
				rule='inheritance_dangling_ref',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Placement '{pname}' is targeted by 'deactivate_placements' but was removed by 'remove_placements'",
				evidence={
					'target_name': pname,
					'operation': 'deactivate_placements',
				},
				fix_hints=[
					f"Remove '{pname}' from deactivate_placements (it is already removed)",
				],
			))

	for pname in repositioned_names:
		if pname in removed_names:
			findings.append(Finding(
				scene=scene_name,
				placement_name=pname,
				rule='inheritance_dangling_ref',
				verdict=Verdict.BLOCKED,
				confidence=Confidence.HIGH,
				message=f"Placement '{pname}' is targeted by 'reposition_placements' but was removed by 'remove_placements'",
				evidence={
					'target_name': pname,
					'operation': 'reposition_placements',
				},
				fix_hints=[
					f"Remove '{pname}' from reposition_placements (it is already removed)",
				],
			))

	return findings
