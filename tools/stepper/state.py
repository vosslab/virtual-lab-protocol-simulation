"""StateMap: per-protocol object-state tracker keyed by placement_name."""

from tools.stepper.loader import LoadedContentTree, ProtocolNotFoundError
from tools.stepper.findings import Finding, Level, FindingEmitter


class StateMap:
	"""
	Tracks object and material state across a protocol walk.

	Objects are keyed by placement_name (the global instance identifier).
	Each placement maps to:
	  - object_name: the object class
	  - state: dict of field_name -> value
	  - held_material_name: current material in the object (for material_container objects)
	  - held_material_volume: volume of held material

	Placement-name collisions (same name across scenes with different object_name)
	are detected at load and emitted as ERROR.
	"""

	def __init__(
		self,
		tree: LoadedContentTree,
		protocol_name: str,
		emitter: FindingEmitter,
		declared_materials_union: set | None = None,
		produced_materials_set: set | None = None,
	):
		"""
		Initialize the StateMap for a protocol.

		Args:
			tree: LoadedContentTree from the loader.
			protocol_name: Name of the active protocol.
			emitter: FindingEmitter for recording findings.
			declared_materials_union: Optional union of declared materials from all upstream minis (for sequence runners).
			produced_materials_set: Optional set of materials produced by upstream minis (for sequence runners).

		Raises:
			No exception; collision errors are emitted to the emitter.
		"""
		self.tree = tree
		self.protocol_name = protocol_name
		self.emitter = emitter
		self._state: dict = {}
		self._cursor_placement = None
		self._active_scene = None
		self._cursor_object_name = None  # For channel_addressing checks
		self.declared_materials_union = declared_materials_union or set()
		self.produced_materials_set = produced_materials_set or set()

		# Build per-protocol scenes registry (maps object_name -> [(placement_name, scene_name), ...])
		self._scenes_registry: dict = {}

		# Load and validate placements from all scenes
		self._load_placements()
		self._build_scenes_registry()

	#============================================

	def _load_placements(self) -> None:
		"""
		Load placements from base scenes and protocol-local scenes.
		Detect placement-name collisions.
		"""
		placement_registry = {}

		# Load from base scenes
		for scene_name, scene_data in self.tree.base_scenes.items():
			self._register_placements(scene_data, placement_registry, f"content/scenes/{scene_name}.yaml")

		# Load from protocol-local scenes
		protocol_local_scenes = self.tree.protocol_local_scenes.get(self.protocol_name, {})
		for scene_name, scene_data in protocol_local_scenes.items():
			rel_path = f"content/protocols/{self.protocol_name}/scenes/{scene_name}.yaml"
			self._register_placements(scene_data, placement_registry, rel_path)

		# Initialize state for each placement
		for placement_name, (object_name, file_path) in placement_registry.items():
			obj = self.tree.get_object(object_name)
			if not obj:
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=None,
					interaction_index=None,
					target=object_name,
					file_path=file_path,
					code="unknown_object_in_scene",
					message=f"object_name '{object_name}' at placement '{placement_name}' not found",
					spec_cite="docs/specs/SCENE_YAML_FORMAT.md placement",
				))
				continue

			self._state[placement_name] = {
				"object_name": object_name,
				"state": {},
				"file_path": file_path,
			}

			# Initialize state fields with defaults
			state_fields = obj.get("state_fields", [])
			for field_decl in state_fields:
				if not isinstance(field_decl, dict):
					continue
				field_name = field_decl["field_name"]
				default = field_decl.get("default")
				self._state[placement_name]["state"][field_name] = default

	def _register_placements(
		self,
		scene_data: dict,
		placement_registry: dict,
		file_path: str,
	) -> None:
		"""
		Register placements from a scene and detect collisions.

		For protocol-local scenes that extend base scenes, resolve the inheritance.

		Args:
			scene_data: The scene YAML dict.
			placement_registry: Mutable dict {placement_name: (object_name, file_path)}.
			file_path: File path for error context.
		"""
		# Start with placements from the scene
		placements = scene_data.get("placements", [])
		if not isinstance(placements, list):
			placements = []

		# If this scene extends a base scene, start with base placements
		extends = scene_data.get("extends")
		if extends and extends in self.tree.base_scenes:
			base_scene = self.tree.base_scenes[extends]
			base_placements = base_scene.get("placements", [])
			placements = list(base_placements) if isinstance(base_placements, list) else []

		# Apply add_placements
		add_placements = scene_data.get("add_placements", [])
		if isinstance(add_placements, list):
			placements.extend(add_placements)

		# Apply remove_placements (by name)
		remove_placements = scene_data.get("remove_placements", [])
		if isinstance(remove_placements, list):
			removed_names = {p.get("placement_name") for p in remove_placements if isinstance(p, dict)}
			placements = [p for p in placements if not (isinstance(p, dict) and p.get("placement_name") in removed_names)]

		# Register all placements
		for placement in placements:
			if not isinstance(placement, dict):
				continue
			placement_name = placement.get("placement_name")
			object_name = placement.get("object_name")
			if not placement_name or not object_name:
				continue

			# Check for collision
			if placement_name in placement_registry:
				old_object_name, old_file_path = placement_registry[placement_name]
				if old_object_name != object_name:
					self.emitter.emit_finding(Finding(
						level=Level.ERROR,
						protocol_name=self.protocol_name,
						step_name=None,
						interaction_index=None,
						target=placement_name,
						file_path=file_path,
						code="placement_name_collision",
						message=f"placement_name '{placement_name}' declared with different object_name: '{old_object_name}' in {old_file_path} vs '{object_name}' in {file_path}",
						spec_cite="docs/specs/SCENE_YAML_FORMAT.md placement",
					))
					continue

			placement_registry[placement_name] = (object_name, file_path)

	def _reachable_base_scenes(self) -> set:
		"""
		Compute base scenes actually reachable by this protocol.

		Reachable = referenced via `extends` from a protocol-local scene, OR named by a
		SceneChange.to_scene op anywhere in the protocol's steps. Without this filter,
		every base scene under content/scenes/ (including unrelated SDS-PAGE benches)
		leaks into the registry and creates spurious ambiguous_target_in_scene errors
		when two unrelated protocols both place the same object kind.
		"""
		reachable: set = set()

		# Base scenes extended by any protocol-local scene
		protocol_local_scenes = self.tree.protocol_local_scenes.get(self.protocol_name, {})
		for scene_data in protocol_local_scenes.values():
			extends = scene_data.get("extends") if isinstance(scene_data, dict) else None
			if extends and extends in self.tree.base_scenes:
				reachable.add(extends)

		# Base scenes named by SceneChange ops in this protocol's steps
		try:
			protocol = self.tree.get_protocol(self.protocol_name)
		except ProtocolNotFoundError:
			protocol = None
		if isinstance(protocol, dict):
			for step in protocol.get("steps", []) or []:
				if not isinstance(step, dict):
					continue
				for interaction in step.get("sequence", []) or []:
					if not isinstance(interaction, dict):
						continue
					response = interaction.get("response", {}) or {}
					for op in response.get("scene_operations", []) or []:
						if not isinstance(op, dict):
							continue
						if op.get("type") == "SceneChange":
							to_scene = op.get("to_scene")
							if to_scene and to_scene in self.tree.base_scenes:
								reachable.add(to_scene)

		return reachable

	def _build_scenes_registry(self) -> None:
		"""
		Build a per-protocol registry of all resolvable placements across all scenes.

		The registry maps object_name -> [(placement_name, scene_name), ...]
		This allows target resolution to fall back to cross-scene lookup when
		active-scene lookup fails, per SCENE_VOCABULARY.md "Scene-adapter resolution".

		Deactivated placements are excluded per spec.

		Needed because a target may be named in a step whose active scene differs from
		the scene where the target's placement was declared; registry lets resolution succeed
		across sibling scenes in the same protocol without forcing authors to insert SceneChange
		ops back to the prior scene.

		Scope is restricted to scenes reachable by this protocol (protocol-local scenes plus
		base scenes referenced via `extends` or SceneChange). Unrelated base scenes from
		other protocols must not pollute this registry.
		"""
		# Collect reachable scene data (protocol-local + referenced base) with their names
		all_scenes = {}

		# Add only base scenes actually referenced by this protocol
		reachable_base = self._reachable_base_scenes()
		protocol_local_scenes = self.tree.protocol_local_scenes.get(self.protocol_name, {})
		if not reachable_base and not protocol_local_scenes:
			# No protocol-local scenes and no SceneChange ops to constrain the set; fall back to
			# every base scene so target resolution still works for trivial single-base-scene protocols.
			reachable_base = set(self.tree.base_scenes.keys())
		for scene_name in reachable_base:
			scene_data = self.tree.base_scenes.get(scene_name)
			if scene_data is not None:
				all_scenes[scene_name] = (scene_data, 'base')

		# Add protocol-local scenes
		for scene_name, scene_data in protocol_local_scenes.items():
			all_scenes[scene_name] = (scene_data, 'protocol')

		# Track unique registrations by (placement_name, object_name) to avoid duplicates
		# from base scenes appearing both in their own iteration and in extended scene inheritance
		seen = set()

		# For each scene, extract effective placements and register them
		for scene_name, (scene_data, _) in all_scenes.items():
			effective_placements = self._get_effective_placements(scene_data)

			for placement in effective_placements:
				if not isinstance(placement, dict):
					continue

				placement_name = placement.get('placement_name')
				object_name = placement.get('object_name')

				if not placement_name or not object_name:
					continue

				# Deduplicate by (placement_name, object_name) pair to prevent registering
				# the same placement twice when it appears in both base and extended scenes
				entry_key = (placement_name, object_name)
				if entry_key in seen:
					continue
				seen.add(entry_key)

				# Register this placement under its object_name
				if object_name not in self._scenes_registry:
					self._scenes_registry[object_name] = []

				self._scenes_registry[object_name].append((placement_name, scene_name))

	#============================================

	def resolve_target(
		self,
		target_str: str,
		step_name: str | None = None,
		interaction_index: int | None = None,
	) -> tuple[str | None, str | None]:
		"""
		Resolve a semantic target string to a placement_name in the active scene.

		A target_str is a semantic name like "micropipette" or "well_plate_96.A1".
		This method:
		  1. Splits the target on first "." to separate object_name_part and subpart_name.
		  2. Scans placements in the active scene for matching object_name.
		  3. If exactly one match: returns (placement_name, subpart_name_or_None).
		  4. If multiple matches: emits ERROR [ambiguous_target_in_scene] and returns first match for graceful continuation.
		  5. If zero matches: emits ERROR [unknown_target_active_scene] and returns (None, subpart_name_or_None).
		  6. If subpart_name is present, validates it against the object's subparts (soft check).

		Args:
			target_str: The semantic target string (e.g. "micropipette" or "well_plate_96.A1").
			step_name: Optional step name for error context.
			interaction_index: Optional interaction index for error context.

		Returns:
			(placement_name, subpart_name) tuple, or (None, subpart_name) if resolution failed.
		"""
		if not target_str:
			return None, None

		# Split on first "." to separate object_name_part and subpart_name
		if "." in target_str:
			object_name_part, subpart_name = target_str.split(".", 1)
		else:
			object_name_part = target_str
			subpart_name = None

		# If no active scene, emit error
		if not self._active_scene:
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=target_str,
				file_path="unknown",
				code="no_active_scene_at_resolution",
				message=f"Cannot resolve target '{target_str}': no active scene set before target resolution",
				spec_cite="docs/PRIMARY_SPEC.md Targets and the scene boundary",
			))
			return None, subpart_name

		# Get placements from the active scene
		active_scene_data = self._get_active_scene_data()
		if not active_scene_data:
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=target_str,
				file_path="unknown",
				code="unknown_active_scene",
				message=f"Active scene '{self._active_scene}' not found in base scenes or protocol-local scenes",
				spec_cite="docs/PRIMARY_SPEC.md Targets and the scene boundary",
			))
			return None, subpart_name

		# Get effective placements (base + inherited + add_placements - remove_placements)
		effective_placements = self._get_effective_placements(active_scene_data)

		# Find placements with matching object_name in active scene
		matching_placements = []
		for placement in effective_placements:
			if isinstance(placement, dict):
				if placement.get("object_name") == object_name_part:
					placement_name = placement.get("placement_name")
					if placement_name:
						matching_placements.append((placement_name, placement))

		# If no match in active scene, consult per-protocol registry
		if len(matching_placements) == 0:
			registry_hits = self._scenes_registry.get(object_name_part, [])

			if len(registry_hits) == 0:
				# No match in active scene or registry
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=step_name,
					interaction_index=interaction_index,
					target=target_str,
					file_path="unknown",
					code="unknown_target_active_scene",
					message=f"target '{target_str}' (object_name '{object_name_part}') not found in active scene '{self._active_scene}' or per-protocol registry",
					spec_cite="docs/specs/SCENE_VOCABULARY.md Scene-adapter resolution",
				))
				return None, subpart_name

			if len(registry_hits) == 1:
				# Exactly one match in registry (different scene)
				placement_name, hit_scene_name = registry_hits[0]
				return placement_name, subpart_name

			# Multiple matches in registry (ambiguous across sibling scenes)
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=target_str,
				file_path="unknown",
				code="ambiguous_target_in_scene",
				message=f"target '{target_str}' (object_name '{object_name_part}') matches multiple placements across protocol scenes: {', '.join(p[0] for p in registry_hits)}",
				spec_cite="docs/specs/SCENE_VOCABULARY.md Scene-adapter resolution",
			))
			# Continue gracefully with first match
			return registry_hits[0][0], subpart_name

		if len(matching_placements) > 1:
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=target_str,
				file_path="unknown",
				code="ambiguous_target_in_scene",
				message=f"target '{target_str}' (object_name '{object_name_part}') matches multiple placements in scene '{self._active_scene}': {', '.join(p[0] for p in matching_placements)}",
				spec_cite="docs/PRIMARY_SPEC.md Targets and the scene boundary",
			))
			# Continue gracefully with first match
			return matching_placements[0][0], subpart_name

		# Exactly one match in active scene
		placement_name = matching_placements[0][0]

		return placement_name, subpart_name

	def _get_active_scene_data(self) -> dict | None:
		"""
		Retrieve the YAML data for the active scene.

		Returns:
			Scene data dict, or None if not found.
		"""
		if not self._active_scene:
			return None

		# Check base scenes first
		if self._active_scene in self.tree.base_scenes:
			return self.tree.base_scenes[self._active_scene]

		# Check protocol-local scenes
		protocol_local_scenes = self.tree.protocol_local_scenes.get(self.protocol_name, {})
		if self._active_scene in protocol_local_scenes:
			return protocol_local_scenes[self._active_scene]

		return None

	def _get_effective_placements(self, scene_data: dict) -> list:
		"""
		Compute effective placements for a scene, accounting for inheritance.

		For a scene that extends a base scene, resolve the inheritance.
		Apply add_placements and remove_placements.

		Args:
			scene_data: The scene YAML dict.

		Returns:
			List of placement dicts.
		"""
		# Start with placements from the scene
		placements = scene_data.get("placements", [])
		if not isinstance(placements, list):
			placements = []

		# If this scene extends a base scene, start with base placements
		extends = scene_data.get("extends")
		if extends and extends in self.tree.base_scenes:
			base_scene = self.tree.base_scenes[extends]
			base_placements = base_scene.get("placements", [])
			placements = list(base_placements) if isinstance(base_placements, list) else []

		# Apply add_placements
		add_placements = scene_data.get("add_placements", [])
		if isinstance(add_placements, list):
			placements.extend(add_placements)

		# Apply remove_placements (by name)
		remove_placements = scene_data.get("remove_placements", [])
		if isinstance(remove_placements, list):
			removed_names = {p.get("placement_name") for p in remove_placements if isinstance(p, dict)}
			placements = [p for p in placements if not (isinstance(p, dict) and p.get("placement_name") in removed_names)]

		return placements

	#============================================

	def set_cursor(self, placement_name: str) -> None:
		"""Update the cursor to a new placement."""
		self._cursor_placement = placement_name
		# Track the object_name for channel_addressing checks
		if placement_name in self._state:
			self._cursor_object_name = self._state[placement_name].get("object_name")
		else:
			self._cursor_object_name = None

	def get_cursor(self) -> str | None:
		"""Retrieve the current cursor placement."""
		return self._cursor_placement

	def get_cursor_object_name(self) -> str | None:
		"""Retrieve the object_name of the current cursor."""
		return self._cursor_object_name

	def get_channel_addressing(self, object_name: str) -> dict | None:
		"""
		Retrieve channel_addressing info for an object.

		Args:
			object_name: The object name.

		Returns:
			channel_addressing dict if declared, else None.
		"""
		obj = self.tree.get_object(object_name)
		if obj:
			return obj.get("channel_addressing")
		return None

	def set_active_scene(self, scene_name: str, active_scene_file_path: str) -> None:
		"""Set the active scene."""
		self._active_scene = scene_name

	def get_active_scene(self) -> str | None:
		"""Get the active scene."""
		return self._active_scene

	#============================================

	def get_placement_state(self, placement_name: str) -> dict | None:
		"""
		Retrieve state for a placement.

		Args:
			placement_name: The placement name.

		Returns:
			Dict with 'object_name' and 'state' keys, or None if not found.
		"""
		return self._state.get(placement_name)

	def mutate_state_field(
		self,
		placement_name: str,
		field_name: str,
		new_value,
		step_name: str | None = None,
		interaction_index: int | None = None,
		file_path: str = "unknown",
	) -> bool:
		"""
		Mutate a state field with validation.

		Validates that:
		  - The placement exists.
		  - The object has the field declared.
		  - The new value matches the field's type and allowed constraints.
		  - For material fields, the material is declared (unless 'empty' or 'mixed').
		  - The object has 'material_container' capability for material field writes.

		Args:
			placement_name: The placement name.
			field_name: The field name to mutate.
			new_value: The new value.
			step_name: Optional step name for context.
			interaction_index: Optional interaction index for context.
			file_path: File path for error context.

		Returns:
			True if mutation succeeded, False if an error was emitted.
		"""
		# Verify placement exists
		if placement_name not in self._state:
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=placement_name,
				file_path=file_path,
				code="unknown_placement",
				message=f"placement_name '{placement_name}' not found in any scene",
				spec_cite="docs/specs/SCENE_YAML_FORMAT.md placement",
			))
			return False

		placement_data = self._state[placement_name]
		object_name = placement_data["object_name"]

		# Verify field is declared on the object
		field_decl = self.tree.get_state_field(object_name, field_name)
		if not field_decl:
			self.emitter.emit_finding(Finding(
				level=Level.ERROR,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=placement_name,
				file_path=file_path,
				code="undeclared_state_field",
				message=f"state field '{field_name}' not declared on object '{object_name}'",
				spec_cite="docs/specs/OBJECT_YAML_FORMAT.md state_fields",
			))
			return False

		# Check field type and allowed values
		field_type = field_decl.get("type")
		allowed = field_decl.get("allowed")

		if field_type == "enum" and allowed:
			if new_value not in allowed:
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=step_name,
					interaction_index=interaction_index,
					target=placement_name,
					file_path=file_path,
					code="state_value_not_allowed",
					message=f"field '{field_name}' value '{new_value}' not in allowed: {allowed}",
					spec_cite="docs/specs/OBJECT_YAML_FORMAT.md state_fields",
				))
				return False

		# Validate type
		if field_type == "float":
			if not isinstance(new_value, (int, float)):
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=step_name,
					interaction_index=interaction_index,
					target=placement_name,
					file_path=file_path,
					code="state_value_type_mismatch",
					message=f"field '{field_name}' expects float, got {type(new_value).__name__}",
					spec_cite="docs/specs/OBJECT_YAML_FORMAT.md state_fields",
				))
				return False
		elif field_type == "int":
			if not isinstance(new_value, int) or isinstance(new_value, bool):
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=step_name,
					interaction_index=interaction_index,
					target=placement_name,
					file_path=file_path,
					code="state_value_type_mismatch",
					message=f"field '{field_name}' expects int, got {type(new_value).__name__}",
					spec_cite="docs/specs/OBJECT_YAML_FORMAT.md state_fields",
				))
				return False
		elif field_type == "boolean":
			if not isinstance(new_value, bool):
				self.emitter.emit_finding(Finding(
					level=Level.ERROR,
					protocol_name=self.protocol_name,
					step_name=step_name,
					interaction_index=interaction_index,
					target=placement_name,
					file_path=file_path,
					code="state_value_type_mismatch",
					message=f"field '{field_name}' expects boolean, got {type(new_value).__name__}",
					spec_cite="docs/specs/OBJECT_YAML_FORMAT.md state_fields",
				))
				return False

		# Special validation for material fields
		if field_name in ("material_name", "held_material_name"):
			# Check capability gate
			obj = self.tree.get_object(object_name)
			if obj:
				capabilities = obj.get("capabilities", [])
				if "material_container" not in capabilities:
					self.emitter.emit_finding(Finding(
						level=Level.ERROR,
						protocol_name=self.protocol_name,
						step_name=step_name,
						interaction_index=interaction_index,
						target=placement_name,
						file_path=file_path,
						code="capability_mismatch",
						message=f"cannot write {field_name} to '{object_name}' which lacks 'material_container' capability",
						spec_cite="docs/specs/OBJECT_YAML_FORMAT.md capabilities",
					))
					return False

			# Validate material exists
			if new_value not in ("empty", "mixed"):
				material = self.tree.get_material(self.protocol_name, new_value)
				# For sequence runners, also check upstream materials and produced materials
				# (cross-mini check will emit errors if not found; don't duplicate here)
				if not material:
					in_upstream = new_value in self.declared_materials_union or new_value in self.produced_materials_set
					if not in_upstream:
						# Emit error: material not in local protocol and not in upstream (if sequence runner context)
						self.emitter.emit_finding(Finding(
							level=Level.ERROR,
							protocol_name=self.protocol_name,
							step_name=step_name,
							interaction_index=interaction_index,
							target=placement_name,
							file_path=file_path,
							code="unknown_material",
							message=f"material_name '{new_value}' not declared in materials.yaml for protocol '{self.protocol_name}'",
							spec_cite="docs/specs/MATERIAL_CONVENTION.md material identity",
						))
						return False

		# Apply the mutation
		placement_data["state"][field_name] = new_value
		return True
