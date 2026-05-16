"""Scene operation handlers for protocol stepping."""

from tools.stepper.state import StateMap
from tools.stepper.findings import Finding, Level, FindingEmitter
from tools.stepper.loader import LoadedContentTree


def apply_scene_operation(
	scene_op: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
	tree: LoadedContentTree | None = None,
) -> bool:
	"""
	Apply a single scene operation.

	Operations are applied top-to-bottom in the response. State changes from
	operation N are visible to operation N+1 inside the same response.

	Args:
		scene_op: The scene_operation dict with 'type' and other fields.
		state_map: The StateMap being mutated.
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.
		tree: The LoadedContentTree (required for SceneChange resolution).

	Returns:
		True if the operation succeeded, False if an error was emitted.
	"""
	op_type = scene_op.get("type")

	if op_type == "CursorAttach":
		return _handle_cursor_attach(scene_op, state_map, protocol_name, step_name, interaction_index, emitter)
	elif op_type == "ObjectStateChange":
		return _handle_object_state_change(scene_op, state_map, protocol_name, step_name, interaction_index, emitter, tree)
	elif op_type == "SceneChange":
		return _handle_scene_change(scene_op, state_map, protocol_name, step_name, interaction_index, emitter, tree)
	elif op_type == "TimedWait":
		return _handle_timed_wait(scene_op, state_map, protocol_name, step_name, interaction_index, emitter, tree)
	else:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="unknown_scene_operation_type",
			message=f"scene_operation type '{op_type}' is not ratified",
			spec_cite="docs/specs/PROTOCOL_STEPS.md scene_operations",
		))
		return False

#============================================

def _handle_subpart_group_cascade(
	target: str,
	placement_name: str,
	state_dict: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
	tree: LoadedContentTree | None = None,
) -> bool:
	"""
	Handle ObjectStateChange targeting a subpart group.

	Per OBJECT_YAML_FORMAT.md "Cascade-write rule", when target names a
	subpart group (e.g. "well_plate_96.col_1"), propagate declared state
	fields to every cell in the group's `contains` list AND write the
	group's record.

	Args:
		target: The semantic target string (e.g. "well_plate_96.col_1").
		placement_name: The resolved placement_name of the parent object.
		state_dict: The state fields to apply.
		state_map: The StateMap being mutated.
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.
		tree: The LoadedContentTree (for object metadata).

	Returns:
		True if all mutations succeeded, False if any error was emitted.
	"""
	# Split target into object_name and subpart_name
	object_name_part, subpart_name = target.split(".", 1)

	# Get the object to retrieve its structure.subpart_groups
	if not tree:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="subpart_group_internal_error",
			message="Subpart group cascade handler called without LoadedContentTree",
			spec_cite="docs/specs/OBJECT_YAML_FORMAT.md Cascade-write rule",
		))
		return False

	placement_data = state_map.get_placement_state(placement_name)
	if not placement_data:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="unknown_placement",
			message=f"Resolved placement '{placement_name}' not found in state map",
			spec_cite="docs/specs/OBJECT_YAML_FORMAT.md Cascade-write rule",
		))
		return False

	object_name = placement_data["object_name"]
	obj = tree.get_object(object_name)
	if not obj:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="unknown_object_in_scene",
			message=f"object_name '{object_name}' not found",
			spec_cite="docs/specs/OBJECT_YAML_FORMAT.md Cascade-write rule",
		))
		return False

	# Get subpart_groups from object structure
	structure = obj.get("structure", {})
	subpart_groups = structure.get("subpart_groups")

	# Search for the group in subpart_groups (can be nested under group_kind key)
	group_members = None
	if subpart_groups:
		for group_key, group_data in subpart_groups.items():
			if isinstance(group_data, dict):
				members_list = group_data.get("members", [])
				for member in members_list:
					if isinstance(member, dict) and member.get("name") == subpart_name:
						group_members = member.get("contains", [])
						break
			if group_members:
				break

	if not group_members:
		# Not a declared subpart group; treat as a canonical cell (e.g. well_plate_96.A1)
		# Apply state directly to the object itself, not cascading
		all_succeeded = True
		for field_name, new_value in state_dict.items():
			success = state_map.mutate_state_field(
				placement_name,
				field_name,
				new_value,
				step_name=step_name,
				interaction_index=interaction_index,
				file_path="unknown",
			)
			if not success:
				all_succeeded = False
		return all_succeeded

	# Apply state fields to each cell in contains + the group itself
	all_succeeded = True

	# Write to the group's own record
	for field_name, new_value in state_dict.items():
		success = state_map.mutate_state_field(
			placement_name,
			field_name,
			new_value,
			step_name=step_name,
			interaction_index=interaction_index,
			file_path="unknown",
		)
		if not success:
			all_succeeded = False

	# Write to each cell in contains
	for cell_name in group_members:
		# Resolve the cell to its placement_name
		cell_target = f"{object_name_part}.{cell_name}"
		cell_placement_name, _ = state_map.resolve_target(cell_target, step_name, interaction_index)

		if not cell_placement_name:
			# Error already emitted by resolve_target
			all_succeeded = False
			continue

		# Apply the same state fields to the cell
		for field_name, new_value in state_dict.items():
			success = state_map.mutate_state_field(
				cell_placement_name,
				field_name,
				new_value,
				step_name=step_name,
				interaction_index=interaction_index,
				file_path="unknown",
			)
			if not success:
				all_succeeded = False

	return all_succeeded

#============================================

def _handle_cursor_attach(
	scene_op: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
) -> bool:
	"""
	Handle CursorAttach operation.

	Updates the cursor to the target placement.

	Args:
		scene_op: The scene_operation dict with 'target'.
		state_map: The StateMap being mutated.
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.

	Returns:
		True if successful, False if an error was emitted.
	"""
	target = scene_op.get("target")
	if not target:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="cursor_attach_missing_target",
			message="CursorAttach missing 'target' field",
			spec_cite="docs/specs/PROTOCOL_STEPS.md CursorAttach",
		))
		return False

	# Resolve semantic target to placement_name
	placement_name, subpart_name = state_map.resolve_target(target, step_name, interaction_index)
	if not placement_name:
		# Error already emitted by resolve_target
		return False

	# Verify the resolved placement exists
	placement_state = state_map.get_placement_state(placement_name)
	if not placement_state:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="unknown_placement",
			message=f"Resolved placement '{placement_name}' from target '{target}' not found in state map",
			spec_cite="docs/specs/PROTOCOL_STEPS.md CursorAttach",
		))
		return False

	# Update cursor
	state_map.set_cursor(placement_name)
	return True

#============================================

def _handle_object_state_change(
	scene_op: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
	tree: LoadedContentTree | None = None,
) -> bool:
	"""
	Handle ObjectStateChange operation.

	Mutates one or more state fields on the target object.

	Args:
		scene_op: The scene_operation dict with 'target' and 'state'.
		state_map: The StateMap being mutated.
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.
		tree: The LoadedContentTree (for object metadata and channel_addressing).

	Returns:
		True if all mutations succeeded, False if any error was emitted.
	"""
	target = scene_op.get("target")
	state_dict = scene_op.get("state", {})

	if not target:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="object_state_change_missing_target",
			message="ObjectStateChange missing 'target' field",
			spec_cite="docs/specs/PROTOCOL_STEPS.md ObjectStateChange",
		))
		return False

	if not isinstance(state_dict, dict):
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="object_state_change_invalid_state",
			message="ObjectStateChange 'state' field must be a dict",
			spec_cite="docs/specs/PROTOCOL_STEPS.md ObjectStateChange",
		))
		return False

	# Resolve semantic target to placement_name
	placement_name, subpart_name = state_map.resolve_target(target, step_name, interaction_index)
	if not placement_name:
		# Error already emitted by resolve_target
		return False

	# Verify the resolved placement exists
	placement_state = state_map.get_placement_state(placement_name)
	if not placement_state:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=target,
			file_path="unknown",
			code="unknown_placement",
			message=f"Resolved placement '{placement_name}' from target '{target}' not found in state map",
			spec_cite="docs/specs/PROTOCOL_STEPS.md ObjectStateChange",
		))
		return False

	# Check channel_addressing capability if target is a subpart group
	# and a pipette is attached (per OBJECT_YAML_FORMAT.md "Channel addressing")
	if "." in target:
		cursor_object_name = state_map.get_cursor_object_name()
		if cursor_object_name:
			channel_addressing = state_map.get_channel_addressing(cursor_object_name)
			if channel_addressing:
				# Extract group_kind from the target
				object_name_part, subpart_name = target.split(".", 1)
				obj = tree.get_object(object_name_part) if tree else None
				if obj:
					structure = obj.get("structure", {})
					subpart_groups = structure.get("subpart_groups")
					if subpart_groups:
						# Find the group_kind for this subpart
						group_kind = None
						for group_key, group_data in subpart_groups.items():
							if isinstance(group_data, dict):
								members_list = group_data.get("members", [])
								for member in members_list:
									if isinstance(member, dict) and member.get("name") == subpart_name:
										group_kind = group_data.get("group_kind")
										break
							if group_kind:
								break

						# Check if pipette can address this group_kind
						if group_kind:
							addressable_subpart_kinds = channel_addressing.get("addressable_subpart_kinds", [])
							if group_kind not in addressable_subpart_kinds:
								emitter.emit_finding(Finding(
									level=Level.ERROR,
									protocol_name=protocol_name,
									step_name=step_name,
									interaction_index=interaction_index,
									target=target,
									file_path="unknown",
									code="pipette_channel_mismatch",
									message=f"pipette '{cursor_object_name}' with addressable_subpart_kinds {addressable_subpart_kinds} cannot address group_kind '{group_kind}' in target '{target}'",
									spec_cite="docs/specs/OBJECT_YAML_FORMAT.md Channel addressing",
								))
								return False
							# Region not allowed for any pipette
							if group_kind == "region":
								emitter.emit_finding(Finding(
									level=Level.ERROR,
									protocol_name=protocol_name,
									step_name=step_name,
									interaction_index=interaction_index,
									target=target,
									file_path="unknown",
									code="region_not_addressable_by_pipette",
									message=f"region group_kind is not addressable by pipettes; target '{target}' cannot be addressed by pipette '{cursor_object_name}'",
									spec_cite="docs/specs/OBJECT_YAML_FORMAT.md Channel addressing",
								))
								return False

	# Check if this is a subpart group target (contains a dot)
	# If so, apply cascade-write rule: write to every contained cell + the group itself
	if "." in target:
		all_succeeded = _handle_subpart_group_cascade(
			target,
			placement_name,
			state_dict,
			state_map,
			protocol_name,
			step_name,
			interaction_index,
			emitter,
			tree,
		)
	else:
		# Single object mutation
		all_succeeded = True
		for field_name, new_value in state_dict.items():
			success = state_map.mutate_state_field(
				placement_name,
				field_name,
				new_value,
				step_name=step_name,
				interaction_index=interaction_index,
				file_path="unknown",
			)
			if not success:
				all_succeeded = False

	return all_succeeded

#============================================

def _handle_scene_change(
	scene_op: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
	tree: LoadedContentTree | None = None,
) -> bool:
	"""
	Handle SceneChange operation.

	Validates that the target scene exists in base scenes or protocol-local
	scenes, and updates the active scene.

	Args:
		scene_op: The scene_operation dict with 'to_scene'.
		state_map: The StateMap being mutated (for active scene tracking).
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.
		tree: The LoadedContentTree for scene resolution.

	Returns:
		True if the scene was found and set, False if an error was emitted.
	"""
	to_scene = scene_op.get("to_scene")
	if not to_scene:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="scene_change_missing_to_scene",
			message="SceneChange missing 'to_scene' field",
			spec_cite="docs/specs/PROTOCOL_STEPS.md SceneChange",
		))
		return False

	if not tree:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=to_scene,
			file_path="unknown",
			code="scene_change_internal_error",
			message="SceneChange handler called without LoadedContentTree",
			spec_cite="docs/specs/PROTOCOL_STEPS.md SceneChange",
		))
		return False

	# Check base scenes
	if to_scene in tree.base_scenes:
		state_map.set_active_scene(to_scene, f"content/scenes/{to_scene}.yaml")
		return True

	# Check protocol-local scenes
	protocol_local_scenes = tree.protocol_local_scenes.get(protocol_name, {})
	if to_scene in protocol_local_scenes:
		state_map.set_active_scene(to_scene, f"content/protocols/{protocol_name}/scenes/{to_scene}.yaml")
		return True

	# Check for protocol-prefixed variant in protocol-local scenes
	prefixed_scene_name = f"{protocol_name}_{to_scene}"
	if prefixed_scene_name in protocol_local_scenes:
		state_map.set_active_scene(prefixed_scene_name, f"content/protocols/{protocol_name}/scenes/{to_scene}.yaml")
		return True

	# Scene not found
	emitter.emit_finding(Finding(
		level=Level.ERROR,
		protocol_name=protocol_name,
		step_name=step_name,
		interaction_index=interaction_index,
		target=to_scene,
		file_path="unknown",
		code="scene_change_unresolved",
		message=f"SceneChange to_scene '{to_scene}' not found in base scenes or protocol-local scenes",
		spec_cite="docs/specs/SCENE_YAML_FORMAT.md scene_name",
	))
	return False

#============================================

def _handle_timed_wait(
	scene_op: dict,
	state_map: StateMap,
	protocol_name: str,
	step_name: str,
	interaction_index: int,
	emitter: FindingEmitter,
	tree: LoadedContentTree | None = None,
) -> bool:
	"""
	Handle TimedWait operation.

	Validates that the wait has a positive duration and optionally checks
	that the host step exists (if step_name is tracked in state_map).

	No target resolution; TimedWait has no target per spec. No step-kind check.

	Args:
		scene_op: The scene_operation dict with 'duration_min' or similar.
		state_map: The StateMap (unused for TimedWait).
		protocol_name: The active protocol name.
		step_name: The step name for error context.
		interaction_index: The interaction index for error context.
		emitter: The FindingEmitter for recording findings.
		tree: The LoadedContentTree (unused).

	Returns:
		True if duration is valid, False if an error was emitted.
	"""
	# Check for duration_min field
	duration_min = scene_op.get("duration_min")

	if duration_min is None:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="timed_wait_missing_duration",
			message="TimedWait missing 'duration_min' field",
			spec_cite="docs/specs/PROTOCOL_STEPS.md TimedWait",
		))
		return False

	# Validate duration is positive
	if not isinstance(duration_min, (int, float)) or duration_min <= 0:
		emitter.emit_finding(Finding(
			level=Level.ERROR,
			protocol_name=protocol_name,
			step_name=step_name,
			interaction_index=interaction_index,
			target=None,
			file_path="unknown",
			code="timed_wait_invalid_duration",
			message=f"TimedWait duration_min must be positive, got {duration_min}",
			spec_cite="docs/specs/PROTOCOL_STEPS.md TimedWait",
		))
		return False

	return True
