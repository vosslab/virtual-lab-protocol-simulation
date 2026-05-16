"""Per-protocol summary block printer."""


def print_protocol_summary(protocol_name: str, protocol_data: dict, verbose: bool = False) -> None:
	"""
	Print a summary line for a protocol validation result (--verbose mode).
	Format: <protocol_name>: <S> steps, <I> interactions, <T> unique targets, <M> materials used.
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

	# Count materials used (via ObjectStateChange in responses)
	materials_used = set()
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
									# Check for material_name or held_material_name
									for key, value in state.items():
										if key in ('material_name', 'held_material_name') and value:
											materials_used.add(value)

	materials_count = len(materials_used)

	print(f"{protocol_name}: {step_count} steps, {interaction_count} interactions, {unique_target_count} unique targets, {materials_count} materials used")


def print_object_details(obj_data: dict) -> None:
	"""Print verbose details for an object (2-4 indented lines)."""
	indent = "  "
	kind = obj_data.get('kind', 'unknown')
	caps = obj_data.get('capabilities', [])
	caps_str = ', '.join(caps) if caps else 'none'
	state_count = len(obj_data.get('state_fields', []))
	print(f"{indent}kind: {kind}")
	print(f"{indent}capabilities: {caps_str}")
	print(f"{indent}state_fields: {state_count}")


def print_scene_details(scene_data: dict) -> None:
	"""Print verbose details for a scene."""
	indent = "  "
	workspace = scene_data.get('workspace', 'unknown')
	zone_count = len(scene_data.get('zones', []))
	placement_count = len(scene_data.get('placements', []))
	print(f"{indent}workspace: {workspace}")
	print(f"{indent}zones: {zone_count}")
	print(f"{indent}placements: {placement_count}")
	print(f"{indent}all placement object_name values resolve")


def print_protocol_scene_details(scene_data: dict) -> None:
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


def print_material_details(material_data: dict) -> None:
	"""Print verbose details for materials."""
	indent = "  "
	material_list = material_data.get('materials', {})
	if isinstance(material_list, dict):
		material_count = len(material_list)
	else:
		material_count = 0
	print(f"{indent}materials: {material_count}")
