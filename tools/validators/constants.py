"""Spec-derived closed sets and schema constants with citations."""

# ============================================
# OBJECT SCHEMA CONSTANTS
# ============================================

# spec: docs/specs/OBJECT_YAML_FORMAT.md "Object identity"
OBJECT_KINDS = {'plate', 'bottle', 'flask', 'pipette', 'rack', 'waste', 'equipment', 'decoration'}

# spec: docs/specs/OBJECT_VOCABULARY.md "Capabilities"
OBJECT_CAPABILITIES = {
	'clickable',
	'contents_container',
	'instrument_with_setpoint',
	'structured_surface',
	'cursor_attachable',
	'decoration_only',
}

# spec: docs/specs/OBJECT_VOCABULARY.md "Retired fields"
RETIRED_OBJECT_KEYS = {
	'short_label',
	'id',
	'role',
	'colorKey',
	'render_map',
	'liquid_container',
	'liquid_color',
	'liquid_id',
	'liquid_volume',
	'asset_name',
	'inventory_ref',
	'inventoryRef',
	'shortLabel',
	'sceneId',
	'elementId',
	'metadata',
	'extras',
	'params',
	'options',
	'additionalProperties',
}

# spec: docs/specs/OBJECT_YAML_FORMAT.md "Top-level fields"
OBJECT_REQUIRED_KEYS = {'object_name', 'kind', 'label', 'state_fields', 'visual_states', 'capabilities', 'layout'}

# spec: docs/specs/OBJECT_YAML_FORMAT.md "state_fields"
STATE_FIELD_TYPES = {'enum', 'int', 'float', 'bool'}

# spec: docs/specs/OBJECT_YAML_FORMAT.md "Structure.subpart_kind"
STRUCTURE_SUBPART_KINDS = {'well', 'tube', 'lane', 'slot', 'channel'}

# spec: docs/specs/OBJECT_YAML_FORMAT.md "Structure.layout"
STRUCTURE_LAYOUT_TYPES = {'grid', 'list', 'custom'}


# ============================================
# SCENE SCHEMA CONSTANTS
# ============================================

# spec: docs/specs/SCENE_YAML_FORMAT.md "Top-level fields"
BASE_SCENE_REQUIRED_KEYS = {'scene_name', 'workspace', 'capabilities', 'scene_bounds', 'zones', 'placements'}
BASE_SCENE_OPTIONAL_KEYS = {'background', 'layout_rules', 'accent_rules', 'wrong_order_message'}
BASE_SCENE_ALL_KEYS = BASE_SCENE_REQUIRED_KEYS | BASE_SCENE_OPTIONAL_KEYS

# spec: docs/specs/SCENE_VOCABULARY.md "Retired keys"
RETIRED_BASE_SCENE_KEYS = {
	'element_id',
	'sceneId',
	'elementId',
	'short_label',
	'metadata',
	'extras',
	'options',
	'additionalProperties',
}

# spec: docs/specs/SCENE_INHERITANCE.md "Protocol-scene schema (closed)"
PROTOCOL_SCENE_ALLOWED_KEYS = {
	'scene_name', 'extends', 'add_placements', 'reposition_placements',
	'deactivate_placements', 'remove_placements', 'scene_notes'
}

# spec: docs/specs/SCENE_INHERITANCE.md "Locked fields within placements"
PLACEMENT_LOCKED_FIELDS = {
	'label', 'kind', 'state_fields', 'visual_states', 'capabilities', 'layout'
}

# spec: docs/specs/SCENE_INHERITANCE.md "Reposition operations"
REPOSITION_ALLOWED_FIELDS = {'placement_name', 'zone', 'position', 'depth', 'anchor', 'depth_tier', 'align_stop'}


# ============================================
# PROTOCOL SCHEMA CONSTANTS
# ============================================

# spec: docs/PRIMARY_SPEC.md "Protocol types"
PROTOCOL_TYPES = {'protocol', 'mini_protocol', 'sequence_runner', 'dev_smoke'}

# spec: docs/PRIMARY_SPEC.md "Gestures"
VALID_GESTURES = {'click', 'drag', 'adjust', 'select', 'type'}

# spec: docs/PRIMARY_SPEC.md "Scene operations"
VALID_SCENE_OPERATIONS = {'ObjectStateChange', 'CursorAttach', 'SceneChange', 'LayoutMove', 'TimedWait'}

# spec: docs/specs/PROTOCOL_YAML_FORMAT.md "Validator presets"
INTERACTION_VALIDATOR_PRESETS = {'correct_target', 'correct_choice', 'target_with_value'}

# spec: docs/specs/PROTOCOL_YAML_FORMAT.md "Step validator presets"
STEP_VALIDATOR_PRESETS = {'sequence_complete', 'final_state_matches'}

# spec: docs/PRIMARY_SPEC.md "Validators and outcome"
PROTOCOL_REQUIRED_KEYS = {'protocol_type', 'name', 'entry_step', 'learning', 'steps'}

# spec: docs/PRIMARY_SPEC.md "Retired keys"
RETIRED_PROTOCOL_KEYS = {
	'action',
	'nextId',
	'stepIndex',
	'requiredItems',
	'usedItems',
	'completionPath',
	'completionTrigger',
	'colorKey',
	'shortLabel',
	'metadata',
	'extras',
	'params',
	'options',
	'additionalProperties',
}

# spec: docs/PRIMARY_SPEC.md "Learning block"
# Learning prefix requirements per PRIMARY_SPEC.md for mini_protocol
LEARNING_MINI_PROTOCOL_PREFIXES = {
	'objectives': 'Students completing this mini-protocol will have achieved',
	'outcomes': 'Students completing this mini-protocol will be able to',
	'goals': 'Overall, this mini-protocol aims to accomplish',
}

# spec: docs/PRIMARY_SPEC.md "Learning block"
# Learning prefix requirements per PRIMARY_SPEC.md for sequence_runner
LEARNING_SEQUENCE_RUNNER_PREFIXES = {
	'objectives': 'Students completing this protocol will have achieved',
	'outcomes': 'Students completing this protocol will be able to',
	'goals': 'Overall, this protocol aims to accomplish',
}


# ============================================
# CONTENTS SCHEMA CONSTANTS
# ============================================

# spec: docs/specs/PROTOCOL_YAML_FORMAT.md "Contents block"
CONTENTS_REQUIRED_KEYS = {'label', 'colorKey', 'displayColor'}


# ============================================
# SCENE OPERATION SCHEMAS (TIER 2)
# ============================================

# spec: docs/PRIMARY_SPEC.md "Scene operations"
SCENE_OPERATION_SCHEMA = {
	'ObjectStateChange': {
		'required': {'type', 'state'},
		'optional': set(),
		'description': 'Mutate declared object state fields',
	},
	'CursorAttach': {
		'required': {'type', 'target'},
		'optional': set(),
		'description': 'Attach cursor to a target object',
	},
	'SceneChange': {
		'required': {'type', 'to_scene'},
		'optional': set(),
		'description': 'Transition to a new scene context',
	},
	'LayoutMove': {
		'required': {'type', 'target', 'zone'},
		'optional': {'position', 'depth', 'anchor'},
		'description': 'Move object in scene layout',
	},
	'TimedWait': {
		'required': {'type'},
		'optional': {'display_message'},
		'description': 'Pause protocol execution (duration derived from game state)',
	},
}

# spec: docs/PRIMARY_SPEC.md "Gesture/validator coupling"
GESTURE_VALIDATOR_MAP = {
	'click': {'correct_target'},
	'drag': {'correct_target'},
	'adjust': {'target_with_value'},
	'select': {'correct_choice'},
	'type': {'target_with_value'},
}


# ============================================
# BANNED TOKENS (TIER 3 - vocabulary closure)
# ============================================

# spec: docs/PRIMARY_DESIGN.md "Vocabulary closure and anti-drift"
BANNED_TOKENS = {
	'colorKey': 'spec: use displayColor in contents; colorKey is retired',
	'nextId': 'spec: protocol flow uses next_step; nextId is retired',
	'stepIndex': 'spec: protocol flow uses next_step; stepIndex is retired',
	'requiredItems': 'spec: no legacy required-items field',
	'completionPath': 'spec: protocol defines complete flow via next_step',
	'usedItems': 'spec: protocol does not track inventory snapshots',
	'completionTrigger': 'spec: response defines outcomes',
	'metadata': 'spec: vocabulary closure forbids open metadata fields',
	'extras': 'spec: vocabulary closure forbids open extras fields',
	'params': 'spec: vocabulary closure forbids open params fields',
	'options': 'spec: vocabulary closure forbids open options fields',
	'additionalProperties': 'spec: vocabulary closure forbids additionalProperties',
	'render_map': 'spec: use visual_states instead',
	'liquid_color': 'spec: use displayColor in visual_states',
	'liquid_container': 'spec: use contents_name state field',
	'inventory_ref': 'spec: contents referenced by name in state fields',
	'inventoryRef': 'spec: contents referenced by name in state fields',
	'element_id': 'spec: objects identified by object_name',
	'elementId': 'spec: objects identified by object_name',
	'scene_kind': 'spec: scenes are identified by scene_name',
	'short_label': 'spec: label is canonical; shortLabel is retired',
	'shortLabel': 'spec: label is canonical',
	'action': 'spec: interactions define actions via gesture',
	'sceneId': 'spec: scenes identified by scene_name',
}
