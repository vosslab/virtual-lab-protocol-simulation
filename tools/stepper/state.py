"""StateMap: per-protocol object-state tracker keyed by placement_name."""

from tools.stepper.loader import LoadedContentTree
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
		self.declared_materials_union = declared_materials_union or set()
		self.produced_materials_set = produced_materials_set or set()

		# Load and validate placements from all scenes
		self._load_placements()

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
				field_name = field_decl.get("field_name")
				if field_name:
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

		# Find placements with matching object_name
		matching_placements = []
		for placement in effective_placements:
			if isinstance(placement, dict):
				if placement.get("object_name") == object_name_part:
					placement_name = placement.get("placement_name")
					if placement_name:
						matching_placements.append((placement_name, placement))

		# Handle resolution results
		if len(matching_placements) == 0:
			self.emitter.emit_finding(Finding(
				level=Level.WARNING,
				protocol_name=self.protocol_name,
				step_name=step_name,
				interaction_index=interaction_index,
				target=target_str,
				file_path="unknown",
				code="unknown_target_active_scene",
				message=f"target '{target_str}' (object_name '{object_name_part}') not found in active scene '{self._active_scene}'",
				spec_cite="docs/specs/SCENE_VOCABULARY.md The scene side of the boundary",
			))
			return None, subpart_name

		if len(matching_placements) > 1:
			self.emitter.emit_finding(Finding(
				level=Level.WARNING,
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

		# Exactly one match
		placement_name = matching_placements[0][0]

		# If subpart_name is present, validate it (soft check)
		if subpart_name:
			obj = self.tree.get_object(object_name_part)
			if obj:
				# Use a simple check: if object defines id_pattern or subparts, validate
				# For now, we skip hard validation since not all objects have subpart definitions
				pass

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

	def get_cursor(self) -> str | None:
		"""Retrieve the current cursor placement."""
		return self._cursor_placement

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
						# Only emit error if NOT in a sequence-runner context
						# (if in_upstream is checked, we're in sequence-runner context and
						# the cross-mini check will handle missing materials)
						if not (self.declared_materials_union or self.produced_materials_set):
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
