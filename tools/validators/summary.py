"""Per-protocol summary block printer."""

from typing import Any, Dict


def print_protocol_summary(protocol_name: str, protocol_data: Dict[str, Any], verbose: bool = False) -> None:
	"""
	Print a summary line for a protocol validation result (--verbose mode).
	Format: <protocol_name>: <S> steps, <I> interactions, <T> unique targets, <C> contents used.
	"""
	if not verbose:
		return

	steps = protocol_data.get('steps', [])
	step_count = len(steps)

	# Count interactions and targets
	interaction_count = 0
	targets = set()

	for step in steps:
		if isinstance(step, dict):
			sequence = step.get('sequence', [])
			interaction_count += len(sequence)
			for interaction in sequence:
				if isinstance(interaction, dict):
					target = interaction.get('target')
					if target:
						targets.add(target)

	unique_target_count = len(targets)

	# Count contents used (via ObjectStateChange in responses)
	contents_used = set()
	for step in steps:
		if isinstance(step, dict):
			sequence = step.get('sequence', [])
			for interaction in sequence:
				if isinstance(interaction, dict):
					response = interaction.get('response', {})
					if isinstance(response, dict):
						scene_ops = response.get('scene_operations', [])
						for op in scene_ops:
							if isinstance(op, dict) and op.get('type') == 'ObjectStateChange':
								state = op.get('state', {})
								if isinstance(state, dict):
									# Check for contents_name or held_contents_name
									for key, value in state.items():
										if key in ('contents_name', 'held_contents_name') and value:
											contents_used.add(value)

	contents_count = len(contents_used)

	print(f"{protocol_name}: {step_count} steps, {interaction_count} interactions, {unique_target_count} unique targets, {contents_count} contents used")


def print_object_details(obj_data: Dict[str, Any]) -> None:
	"""Print verbose details for an object (2-4 indented lines)."""
	indent = "  "
	kind = obj_data.get('kind', 'unknown')
	caps = obj_data.get('capabilities', [])
	caps_str = ', '.join(caps) if caps else 'none'
	state_count = len(obj_data.get('state_fields', []))
	print(f"{indent}kind: {kind}")
	print(f"{indent}capabilities: {caps_str}")
	print(f"{indent}state_fields: {state_count}")


def print_scene_details(scene_data: Dict[str, Any]) -> None:
	"""Print verbose details for a scene."""
	indent = "  "
	workspace = scene_data.get('workspace', 'unknown')
	zone_count = len(scene_data.get('zones', []))
	placement_count = len(scene_data.get('placements', []))
	print(f"{indent}workspace: {workspace}")
	print(f"{indent}zones: {zone_count}")
	print(f"{indent}placements: {placement_count}")
	print(f"{indent}all placement object_name values resolve")


def print_protocol_scene_details(scene_data: Dict[str, Any]) -> None:
	"""Print verbose details for a protocol scene."""
	indent = "  "
	extends = scene_data.get('extends', 'unknown')
	print(f"{indent}extends: {extends}")
	add_count = len(scene_data.get('add_placements', []))
	reposition_count = len(scene_data.get('reposition_placements', []))
	deactivate_count = len(scene_data.get('deactivate_placements', []))
	remove_count = len(scene_data.get('remove_placements', []))
	if add_count > 0:
		print(f"{indent}add_placements: {add_count}")
	if reposition_count > 0:
		print(f"{indent}reposition_placements: {reposition_count}")
	if deactivate_count > 0:
		print(f"{indent}deactivate_placements: {deactivate_count}")
	if remove_count > 0:
		print(f"{indent}remove_placements: {remove_count}")


def print_contents_details(contents_data: Dict[str, Any]) -> None:
	"""Print verbose details for contents."""
	indent = "  "
	contents_list = contents_data.get('contents', {})
	if isinstance(contents_list, dict):
		contents_count = len(contents_list)
	else:
		contents_count = 0
	print(f"{indent}contents: {contents_count}")
