"""Spec-derived closed sets and schema constants with citations.

Finding tag registry (used by validators that reference these constants):

	T1_TARGET             interaction target does not resolve to a declared
	                      object or subpart.
	T1_STATE_FIELD        ObjectStateChange names a state field not declared
	                      on the target object.
	T1_ENUM               enum state field receives a value outside the
	                      declared `allowed` list.
	T1_CONTENTS_REF       contents_name / held_contents_name does not resolve
	                      to an entry in the protocol's contents.yaml.
	T1_TARGET_WITH_VALUE  target_with_value validator names a key that is
	                      not a declared state field on the target.
	SCENE_EXTENDS         protocol scene extends an unknown base scene name.
	CLOSURE               unknown top-level key in a closed-schema container.
	T3_CAMELCASE          authored YAML key contains a camelCase boundary.
	RETIRED               (reserved) retired-token error class.
	BANNED                (reserved) banned-token error class.

T1_* checks live in tools/validators/protocol_validator.py.
SCENE_EXTENDS lives in tools/validators/scene_protocol_validator.py.
CLOSURE lives in each per-container validator.
T3_CAMELCASE lives in tools/validators/cross_protocol.py.
"""

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

# spec: docs/specs/OBJECT_YAML_FORMAT.md "Top-level fields"
# Closure: unknown top-level keys are flagged automatically. No retired-key list needed.
OBJECT_REQUIRED_KEYS = {'object_name', 'kind', 'label', 'state_fields', 'visual_states', 'capabilities', 'layout'}
OBJECT_OPTIONAL_KEYS = {'structure'}
OBJECT_ALL_KEYS = OBJECT_REQUIRED_KEYS | OBJECT_OPTIONAL_KEYS

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

# Closure handles unknown keys; BASE_SCENE_ALL_KEYS is the canonical whitelist.

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
# spec: docs/specs/SPEC_DESIGN_CHECKLIST.md "Bare name banned"
# Closure: unknown top-level keys are flagged automatically. CamelCase keys are
# caught by the general T3_CAMELCASE regex in cross_protocol.py. No retired
# allow-list maintained.
#
# Required-key set is universal across protocol types; `steps` vs
# `mini_protocols` is enforced per type by ProtocolValidator (sequence_runner
# carries an ordered constituent list instead of authored steps, per
# docs/PRIMARY_SPEC.md "Sequence runners").
PROTOCOL_REQUIRED_KEYS = {'protocol_type', 'protocol_name', 'entry_step', 'learning'}
PROTOCOL_OPTIONAL_KEYS = {'parts', 'days', 'steps', 'mini_protocols'}
PROTOCOL_ALL_KEYS = PROTOCOL_REQUIRED_KEYS | PROTOCOL_OPTIONAL_KEYS

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
CONTENTS_REQUIRED_KEYS = {'label', 'display_color'}


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


# Vocabulary closure is enforced by closed key whitelists per container
# (OBJECT_ALL_KEYS, BASE_SCENE_ALL_KEYS, PROTOCOL_SCENE_ALLOWED_KEYS,
# PROTOCOL_ALL_KEYS, etc.). camelCase keys are caught by the general
# T3_CAMELCASE regex in cross_protocol.py. No retired-token allow-list.
