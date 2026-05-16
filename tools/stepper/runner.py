"""Protocol stepper runner: orchestrates loader, flow, state, and scene_ops."""

import tools.stepper.findings
import tools.stepper.loader
import tools.stepper.flow
import tools.stepper.state
import tools.stepper.scene_ops
import tools.stepper.cross_mini


def walk_protocol(
	tree: tools.stepper.loader.LoadedContentTree,
	protocol_name: str,
	verbose: bool = False,
	quiet: bool = False,
) -> tuple[int, int, tools.stepper.findings.FindingEmitter]:
	"""
	Walk a single protocol through the entire flow.

	Loads the protocol, initializes StateMap and FindingEmitter,
	walks all interactions via flow.walk_mini_protocol(), applies
	scene operations, and returns interaction count and the emitter.

	Args:
		tree: LoadedContentTree instance.
		protocol_name: Name of the protocol to walk.
		verbose: If True, emit per-step state deltas.
		quiet: If True, suppress the per-protocol summary line and the
			inline finding dump. The CLI uses this when it intends to
			render findings via the grouped dashboard instead.

	Returns:
		(step_count, interaction_count, emitter) tuple.
	"""
	protocol = tree.get_protocol(protocol_name)
	# Construct path from protocol name if not set
	protocol_path = protocol.get("_file_path", f"content/protocols/{protocol_name}/protocol.yaml")

	emitter = tools.stepper.findings.FindingEmitter(verbose=verbose)
	state_map = tools.stepper.state.StateMap(tree, protocol_name, emitter)

	# Seed the initial active scene
	_seed_initial_active_scene(tree, protocol_name, state_map, emitter)

	emitter.emit_protocol_start(protocol_name, protocol_path)

	step_count = 0
	interaction_count = 0
	visited_steps = set()

	for step, interaction_index, interaction in tools.stepper.flow.walk_mini_protocol(protocol, emitter):
		step_name = step.get("step_name")

		# Count unique steps
		if step_name not in visited_steps:
			visited_steps.add(step_name)
			step_count += 1
			emitter.emit_step_transition(step_name)

		interaction_count += 1

		# Apply scene operations in the interaction's response
		response = interaction.get("response", {})
		scene_ops = response.get("scene_operations", [])

		for scene_op in scene_ops:
			op_type = scene_op.get("type")
			emitter.emit_scene_operation(op_type)

			tools.stepper.scene_ops.apply_scene_operation(
				scene_op,
				state_map,
				protocol_name,
				step_name,
				interaction_index,
				emitter,
				tree,
			)

	# Count errors and warnings from emitter
	error_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.ERROR]
	warning_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.WARNING]
	error_count = len(error_findings)
	warning_count = len(warning_findings)

	if not quiet:
		emitter.emit_protocol_summary(protocol_name, protocol_path, step_count, interaction_count, error_count, warning_count)
		emitter.print_findings()

	return step_count, interaction_count, emitter


#============================================

def _seed_initial_active_scene(
	tree: tools.stepper.loader.LoadedContentTree,
	protocol_name: str,
	state_map: tools.stepper.state.StateMap,
	emitter: tools.stepper.findings.FindingEmitter,
) -> None:
	"""
	Seed the initial active scene for a protocol.

	Strategy:
	  1. Scan the first SceneChange operation in the protocol to find an explicit scene.
	  2. If no explicit SceneChange, try protocol-local scenes:
	     a. If protocol has exactly one local scene, use it.
	     b. If protocol has multiple local scenes, try to find one that contains targets from the first step.
	  3. Fall back to the first base scene.
	  4. If no scene found, emit a WARNING but leave active_scene unset
	     (subsequent target resolutions will emit errors).

	Args:
		tree: LoadedContentTree instance.
		protocol_name: Name of the active protocol.
		state_map: StateMap to seed with active scene.
		emitter: FindingEmitter for recording warnings.
	"""
	protocol = tree.get_protocol(protocol_name)
	if not protocol:
		return

	# Strategy 1: Look for the first SceneChange in the protocol
	steps = protocol.get("steps", [])
	for step in steps:
		if not isinstance(step, dict):
			continue
		sequence = step.get("sequence", [])
		if not isinstance(sequence, list):
			continue
		for interaction in sequence:
			if not isinstance(interaction, dict):
				continue
			response = interaction.get("response", {})
			if not isinstance(response, dict):
				continue
			scene_ops = response.get("scene_operations", [])
			if not isinstance(scene_ops, list):
				continue
			for scene_op in scene_ops:
				if not isinstance(scene_op, dict):
					continue
				if scene_op.get("type") == "SceneChange":
					to_scene = scene_op.get("to_scene")
					if to_scene:
						# Found an explicit scene
						if to_scene in tree.base_scenes:
							state_map.set_active_scene(to_scene, f"content/scenes/{to_scene}.yaml")
							return
						else:
							protocol_local_scenes = tree.protocol_local_scenes.get(protocol_name, {})
							if to_scene in protocol_local_scenes:
								state_map.set_active_scene(to_scene, f"content/protocols/{protocol_name}/scenes/{to_scene}.yaml")
								return

	# Strategy 2: Check protocol-local scenes
	protocol_local_scenes = tree.protocol_local_scenes.get(protocol_name, {})
	if protocol_local_scenes:
		# If exactly one local scene, use it
		if len(protocol_local_scenes) == 1:
			scene_name = list(protocol_local_scenes.keys())[0]
			state_map.set_active_scene(scene_name, f"content/protocols/{protocol_name}/scenes/{scene_name}.yaml")
			return

		# If multiple local scenes, try to find one with targets from the first step
		if len(protocol_local_scenes) > 1:
			# Collect targets from the first step
			entry_step_name = protocol.get("entry_step")
			first_targets = set()
			for step in steps:
				if isinstance(step, dict) and step.get("step_name") == entry_step_name:
					sequence = step.get("sequence", [])
					if isinstance(sequence, list):
						for interaction in sequence:
							if isinstance(interaction, dict):
								target = interaction.get("target")
								if target:
									# Strip subpart (e.g., "well_plate_96.A1" -> "well_plate_96")
									first_targets.add(target.split(".")[0])
					break

			# Find a scene that contains at least one target
			for scene_name, scene_data in protocol_local_scenes.items():
				placements = scene_data.get("placements", [])
				if not isinstance(placements, list):
					placements = []
				extends = scene_data.get("extends")
				if extends and extends in tree.base_scenes:
					base_placements = tree.base_scenes[extends].get("placements", [])
					if isinstance(base_placements, list):
						placements = list(base_placements) + placements

				# Check for matching object_names
				scene_objects = {p.get("object_name") for p in placements if isinstance(p, dict)}
				if first_targets & scene_objects:  # Intersection found
					state_map.set_active_scene(scene_name, f"content/protocols/{protocol_name}/scenes/{scene_name}.yaml")
					return

			# No matching scene found; use the first local scene
			scene_name = sorted(protocol_local_scenes.keys())[0]
			state_map.set_active_scene(scene_name, f"content/protocols/{protocol_name}/scenes/{scene_name}.yaml")
			return

	# Strategy 3: Use the first base scene
	if tree.base_scenes:
		first_scene_name = sorted(tree.base_scenes.keys())[0]
		state_map.set_active_scene(first_scene_name, f"content/scenes/{first_scene_name}.yaml")
		return

	# No default scene found
	emitter.emit_finding(tools.stepper.findings.Finding(
		level=tools.stepper.findings.Level.WARNING,
		protocol_name=protocol_name,
		step_name=None,
		interaction_index=None,
		target=None,
		file_path=protocol.get("_file_path", "unknown"),
		code="no_initial_scene_found",
		message=f"Could not determine initial active scene for protocol '{protocol_name}': no explicit SceneChange found and no scenes available",
		spec_cite="docs/PRIMARY_SPEC.md Entry step",
	))

#============================================

def discover_mini_protocols(tree: tools.stepper.loader.LoadedContentTree) -> list[str]:
	"""
	Discover all mini_protocol-type protocols in the loaded tree.

	Returns:
		Sorted list of protocol names with protocol_type: mini_protocol.
	"""
	mini_protocols = []
	for protocol_name, protocol_data in tree.protocols.items():
		protocol_type = protocol_data.get("protocol_type")
		if protocol_type == "mini_protocol":
			mini_protocols.append(protocol_name)
	return sorted(mini_protocols)


#============================================

def discover_sequence_runners(tree: tools.stepper.loader.LoadedContentTree) -> list[str]:
	"""
	Discover all sequence_runner-type protocols in the loaded tree.

	Returns:
		Sorted list of protocol names with protocol_type: sequence_runner.
	"""
	sequence_runners = []
	for protocol_name, protocol_data in tree.protocols.items():
		protocol_type = protocol_data.get("protocol_type")
		if protocol_type == "sequence_runner":
			sequence_runners.append(protocol_name)
	return sorted(sequence_runners)


#============================================

def walk_sequence_runner(
	tree: tools.stepper.loader.LoadedContentTree,
	protocol_name: str,
	verbose: bool = False,
	quiet: bool = False,
) -> tuple[int, int, tools.stepper.findings.FindingEmitter]:
	"""
	Walk a sequence runner by executing its constituent minis in order.

	Threads a single StateMap across all constituent minis so state persists
	from one mini to the next. Detects runner-of-runner and checks cross-mini
	material production gaps via the generalized production check.

	Args:
		tree: LoadedContentTree instance.
		protocol_name: Name of the sequence runner to walk.
		verbose: If True, emit per-step state deltas.

	Returns:
		(total_leaf_count, total_interaction_count, emitter) tuple.
	"""
	protocol = tree.get_protocol(protocol_name)
	# Construct path from protocol name if not set
	protocol_path = protocol.get("_file_path", f"content/protocols/{protocol_name}/protocol.yaml")

	emitter = tools.stepper.findings.FindingEmitter(verbose=verbose)

	# Validate protocol_type is sequence_runner
	protocol_type = protocol.get("protocol_type")
	if protocol_type != "sequence_runner":
		emitter.emit_finding(tools.stepper.findings.Finding(
			level=tools.stepper.findings.Level.ERROR,
			protocol_name=protocol_name,
			step_name=None,
			interaction_index=None,
			target=None,
			file_path=protocol_path,
			code="not_sequence_runner",
			message=f"protocol_type is '{protocol_type}', not 'sequence_runner'",
			spec_cite="docs/PRIMARY_SPEC.md Protocol types",
		))
		return 0, 0, emitter

	# Get the ordered list of constituent minis
	mini_protocols = protocol.get("mini_protocols", [])
	if not isinstance(mini_protocols, list):
		mini_protocols = []

	# Validate: no sequence runner should reference another sequence runner
	for mini_name in mini_protocols:
		mini_proto = tree.get_protocol(mini_name)
		if not mini_proto:
			emitter.emit_finding(tools.stepper.findings.Finding(
				level=tools.stepper.findings.Level.ERROR,
				protocol_name=protocol_name,
				step_name=None,
				interaction_index=None,
				target=mini_name,
				file_path=protocol_path,
				code="unknown_mini_protocol",
				message=f"mini_protocols list references unknown protocol '{mini_name}'",
				spec_cite="docs/PRIMARY_SPEC.md Sequence runners",
			))
			continue

		mini_type = mini_proto.get("protocol_type")
		if mini_type == "sequence_runner":
			emitter.emit_finding(tools.stepper.findings.Finding(
				level=tools.stepper.findings.Level.ERROR,
				protocol_name=protocol_name,
				step_name=None,
				interaction_index=None,
				target=mini_name,
				file_path=protocol_path,
				code="runner_of_runner",
				message=f"sequence runner '{protocol_name}' references another sequence_runner '{mini_name}' in mini_protocols list",
				spec_cite="docs/PRIMARY_SPEC.md Sequence runners",
			))

	emitter.emit_protocol_start(protocol_name, protocol_path, is_sequence_runner=True, leaf_count=len(mini_protocols))

	# Build upstream materials once, then thread through each mini
	produced_materials, declared_materials_by_mini = tools.stepper.cross_mini.build_upstream_materials(
		tree,
		mini_protocols,
		emitter,
	)

	total_leaf_count = len(mini_protocols)
	total_interaction_count = 0
	total_step_count = 0
	accumulated_produced_materials = set()

	# Walk each mini in order, threading state and materials
	for mini_index, mini_name in enumerate(mini_protocols):
		try:
			mini_protocol = tree.get_protocol(mini_name)
		except tools.stepper.loader.ProtocolNotFoundError:
			continue

		# Create a StateMap for this mini with upstream materials threaded
		declared_union = set()
		for idx in range(mini_index):
			declared_union.update(declared_materials_by_mini.get(idx, set()))

		state_map = tools.stepper.state.StateMap(
			tree,
			mini_name,
			emitter,
			declared_materials_union=declared_union,
			produced_materials_set=accumulated_produced_materials,
		)

		# Seed initial scene
		_seed_initial_active_scene(tree, mini_name, state_map, emitter)

		step_count = 0
		interaction_count = 0
		visited_steps = set()

		for step, interaction_index, interaction in tools.stepper.flow.walk_mini_protocol(mini_protocol, emitter):
			step_name = step.get("step_name")

			# Count unique steps
			if step_name not in visited_steps:
				visited_steps.add(step_name)
				step_count += 1
				emitter.emit_step_transition(step_name)

			interaction_count += 1

			# Apply scene operations
			response = interaction.get("response", {})
			scene_ops = response.get("scene_operations", [])

			for scene_op in scene_ops:
				op_type = scene_op.get("type")
				emitter.emit_scene_operation(op_type)

				tools.stepper.scene_ops.apply_scene_operation(
					scene_op,
					state_map,
					mini_name,
					step_name,
					interaction_index,
					emitter,
					tree,
				)

				# Track produced materials
				if op_type == "ObjectStateChange":
					state_block = scene_op.get("state", {})
					if isinstance(state_block, dict):
						for field_name in ("material_name", "held_material_name"):
							value = state_block.get(field_name)
							if value and isinstance(value, str) and value not in ("empty", "mixed"):
								accumulated_produced_materials.add(value)

		# Check cross-mini material references for this mini
		tools.stepper.cross_mini.check_cross_mini_material_references(
			tree,
			mini_name,
			mini_index,
			mini_protocols,
			accumulated_produced_materials,
			declared_materials_by_mini,
			emitter,
		)

		total_step_count += step_count
		total_interaction_count += interaction_count

		# Emit per-mini result
		error_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.ERROR]
		warning_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.WARNING]
		error_count = len(error_findings)
		warning_count = len(warning_findings)

		if not quiet:
			emitter.emit_leaf_summary(mini_name, step_count, interaction_count, error_count, warning_count)

	# Final summary for the sequence runner
	error_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.ERROR]
	warning_findings = [f for f in emitter.findings if f.level == tools.stepper.findings.Level.WARNING]
	error_count = len(error_findings)
	warning_count = len(warning_findings)

	if not quiet:
		emitter.emit_sequence_runner_summary(protocol_name, protocol_path, total_leaf_count, total_step_count, total_interaction_count, error_count, warning_count)
		emitter.print_findings()

	return total_leaf_count, total_interaction_count, emitter
