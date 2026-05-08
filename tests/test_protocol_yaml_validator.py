"""
Test suite for protocol YAML validator rules.

Tests cover all eight validation rules:
- Rule 1: No discharge without preceding load (matching tool & liquid)
- Rule 2: consumesVolumeMl does not exceed load volumeMl
- Rule 3: Item/reagent references are valid
- Rule 4: completionEvent placement (exactly one, on final interaction)
- Rule 5: Tool-first (source/destination/liquid/stateChange requires tool or direct:true)
- Rule 6: No legacy fields in author YAML
- Rule 7: virtual_target as destination forbidden
- Rule 8: completionPath contract enforcement (SP-K2c)
"""

import sys
import pytest

# Import validation functions from build_protocol_data.py
import git_file_utils
REPO_ROOT = git_file_utils.get_repo_root()
sys.path.insert(0, str(REPO_ROOT + '/tools'))
import build_protocol_data as validator


#============================================
# Rule 1: No discharge without preceding load (matching tool & liquid)
#============================================

def test_rule_1_pass_discharge_with_preceding_load():
	"""Rule 1: discharge with preceding load of matching tool & liquid passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'volumeMl': 50},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}

	# Should not raise
	validator.validate_no_discharge_without_load(step, items)


def test_rule_1_fail_discharge_without_load():
	"""Rule 1: discharge with no preceding load raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'volumeMl': 50},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'flask': {'role': 'culture_vessel'},
	}

	with pytest.raises(ValueError):
		validator.validate_no_discharge_without_load(step, items)


def test_rule_1_fail_discharge_before_load():
	"""Rule 1: discharge before load of matching tool & liquid raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'volumeMl': 50},
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}

	with pytest.raises(ValueError):
		validator.validate_no_discharge_without_load(step, items)


#============================================
# Rule 2: consumesVolumeMl does not exceed load volumeMl
#============================================

def test_rule_2_pass_consumes_within_load():
	"""Rule 2: consumesVolumeMl <= load volumeMl passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'consumesVolumeMl': 50},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}

	# Should not raise
	validator.validate_volume_sanity(step, items)


def test_rule_2_pass_consumes_equals_load():
	"""Rule 2: consumesVolumeMl == load volumeMl passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'consumesVolumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}

	# Should not raise
	validator.validate_volume_sanity(step, items)


def test_rule_2_fail_consumes_exceeds_load():
	"""Rule 2: consumesVolumeMl > load volumeMl raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 50},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'consumesVolumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}

	with pytest.raises(ValueError):
		validator.validate_volume_sanity(step, items)


#============================================
# Rule 3: Item/reagent references are valid
#============================================

def test_rule_3_pass_valid_references():
	"""Rule 3: all item and reagent references exist passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs'},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	# Should not raise
	validator.validate_item_reagent_references(step, items, reagents)


def test_rule_3_fail_unknown_tool():
	"""Rule 3: interaction with unknown tool raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'unknown_pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_item_reagent_references(step, items, reagents)


def test_rule_3_fail_unknown_source():
	"""Rule 3: interaction with unknown source raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'unknown_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_item_reagent_references(step, items, reagents)


def test_rule_3_fail_unknown_destination():
	"""Rule 3: interaction with unknown destination raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'destination': 'unknown_flask', 'liquid': 'pbs'},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_item_reagent_references(step, items, reagents)


def test_rule_3_fail_unknown_liquid():
	"""Rule 3: interaction with unknown liquid raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'unknown_liquid', 'volumeMl': 100},
		]
	}
	items = {
		'pipette': {'role': 'aspirate_tool'},
		'pbs_bottle': {'role': 'reagent_source'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_item_reagent_references(step, items, reagents)


#============================================
# Rule 4: completionEvent placement
#============================================

def test_rule_4_pass_no_completion_event():
	"""Rule 4: no completionEvent passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs'},
		]
	}

	# Should not raise
	validator.validate_completion_event_placement(step)


def test_rule_4_pass_completion_event_on_final():
	"""Rule 4: completionEvent on final interaction passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'dispense_complete'},
		]
	}

	# Should not raise
	validator.validate_completion_event_placement(step)


def test_rule_4_fail_multiple_completion_events():
	"""Rule 4: multiple completionEvents raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100, 'completionEvent': 'load_complete'},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'dispense_complete'},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_completion_event_placement(step)


def test_rule_4_fail_completion_event_not_final():
	"""Rule 4: completionEvent not on final interaction raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100, 'completionEvent': 'load_complete'},
			{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs'},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_completion_event_placement(step)


#============================================
# Rule 5: Tool-first (source/destination/liquid/stateChange requires tool or direct:true)
#============================================

def test_rule_5_pass_tool_with_source():
	"""Rule 5: interaction with tool and source passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}

	# Should not raise
	validator.validate_tool_first(step)


def test_rule_5_pass_direct_without_tool():
	"""Rule 5: interaction with direct:true but no tool passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'direct': True, 'stateChange': 'incubator_opened'},
		]
	}

	# Should not raise
	validator.validate_tool_first(step)


def test_rule_5_pass_tool_only():
	"""Rule 5: interaction with only tool passes."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette'},
		]
	}

	# Should not raise
	validator.validate_tool_first(step)


def test_rule_5_fail_source_without_tool():
	"""Rule 5: interaction with source but no tool and not direct raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_tool_first(step)


def test_rule_5_fail_destination_without_tool():
	"""Rule 5: interaction with destination but no tool and not direct raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'destination': 'flask', 'liquid': 'pbs'},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_tool_first(step)


def test_rule_5_fail_liquid_without_tool():
	"""Rule 5: interaction with liquid but no tool and not direct raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'liquid': 'pbs', 'volumeMl': 100},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_tool_first(step)


def test_rule_5_fail_state_change_without_tool():
	"""Rule 5: interaction with stateChange but no tool and not direct raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'stateChange': 'lid_removed'},
		]
	}

	with pytest.raises(ValueError):
		validator.validate_tool_first(step)


#============================================
# Rule 6: No legacy fields
#============================================

def test_rule_6_pass_no_legacy_fields():
	"""Rule 6: no legacy fields passes."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'action': 'aspirate',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'pbs_bottle', 'liquid': 'pbs', 'volumeMl': 100},
		]
	}

	# Should not raise
	validator.validate_no_legacy_fields(step)


def test_rule_6_fail_actor_field():
	"""Rule 6: legacy 'actor' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'actor': 'pipette',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_target_field():
	"""Rule 6: legacy 'target' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'target': 'flask',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_result_field():
	"""Rule 6: legacy 'result' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'result': 'success',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_event_field():
	"""Rule 6: legacy 'event' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'event': 'dispense',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_trigger_field():
	"""Rule 6: legacy 'trigger' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'trigger': 'click',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_allowed_interactions_field():
	"""Rule 6: legacy 'allowedInteractions' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'allowedInteractions': ['aspirate'],
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_target_items_field():
	"""Rule 6: legacy 'targetItems' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'targetItems': ['pipette', 'flask'],
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_required_action_field():
	"""Rule 6: legacy 'requiredAction' field raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'requiredAction': 'dispense',
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


def test_rule_6_fail_multiple_legacy_fields():
	"""Rule 6: multiple legacy fields raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Prepare sample',
		'actor': 'pipette',
		'target': 'flask',
		'targetItems': ['pipette', 'flask'],
	}

	with pytest.raises(ValueError):
		validator.validate_no_legacy_fields(step)


#============================================
# Rule 7: virtual_target as destination forbidden
#============================================

def test_rule_7_pass_direct_tool_interaction():
	"""Rule 7: direct tool interaction (tool + completionEvent, no destination) passes."""
	step = {
		'id': 'test_spray',
		'interactionSequence': [
			{'tool': 'ethanol_bottle', 'completionEvent': 'spray_ethanol'},
		]
	}
	items = {
		'ethanol_bottle': {'role': 'reagent_source'},
	}

	# Should not raise
	validator.validate_no_virtual_target_destinations(step, items)


def test_rule_7_pass_valid_destination():
	"""Rule 7: discharge to non-virtual destination (waste_target) passes."""
	step = {
		'id': 'test_waste',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'flask', 'liquid': 'media', 'volumeMl': 4},
			{'tool': 'pipette', 'destination': 'waste_container', 'liquid': 'media',
				'completionEvent': 'discard'},
		]
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'flask': {'role': 'cell_container'},
		'waste_container': {'role': 'waste_target'},
	}

	# Should not raise
	validator.validate_no_virtual_target_destinations(step, items)


def test_rule_7_fail_virtual_target_destination():
	"""Rule 7: discharge to virtual_target raises ValueError."""
	step = {
		'id': 'test_spray',
		'interactionSequence': [
			{'tool': 'ethanol_bottle', 'destination': 'hood_surface',
				'completionEvent': 'spray_ethanol'},
		]
	}
	items = {
		'ethanol_bottle': {'role': 'reagent_source'},
		'hood_surface': {'role': 'virtual_target'},
	}

	with pytest.raises(ValueError):
		validator.validate_no_virtual_target_destinations(step, items)


#============================================
# Rule 8: completionPath contract enforcement
#============================================

#--- (a) completionPath required ---

def test_rule_8a_pass_with_completion_path():
	"""Rule 8(a): step with completionPath passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {
		'ethanol_bottle': {'role': 'reagent_source'},
	}
	reagents = {}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8a_fail_missing_completion_path():
	"""Rule 8(a): step without completionPath raises ValueError."""
	step = {
		'id': 'test_step',
		'label': 'Missing path',
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (b) kind must be one of the three allowed values ---

def test_rule_8b_pass_kind_interaction_sequence():
	"""Rule 8(b): kind 'interactionSequence' passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
			'interactions': [
				{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
				{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'test_event'},
			]
		}
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8b_pass_kind_direct_tool():
	"""Rule 8(b): kind 'directTool' passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {
		'ethanol_bottle': {'role': 'reagent_source'},
	}
	reagents = {}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8b_pass_kind_modal():
	"""Rule 8(b): kind 'modal' passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'modal_done',
		}
	}
	items = {
		'well_plate': {'role': 'culture_vessel'},
	}
	reagents = {}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8b_fail_unknown_kind():
	"""Rule 8(b): unknown kind raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'unknown_kind',
		}
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8b_fail_legacy_instrument_kind():
	"""Rule 8(b): legacy 'instrument' kind raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'instrument',
			'tool': 'incubator',
			'completionEvent': 'incubate',
		}
	}
	items = {'incubator': {'role': 'instrument'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (c) interactionSequence kind validation ---

def test_rule_8c_pass_valid_interaction_sequence():
	"""Rule 8(c): valid interactionSequence with non-empty interactions passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
			'interactions': [
				{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
				{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'done'},
			]
		}
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8c_fail_missing_interactions():
	"""Rule 8(c): interactionSequence without interactions field raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
		}
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8c_fail_empty_interactions():
	"""Rule 8(c): interactionSequence with empty interactions list raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
			'interactions': [],
		}
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8c_fail_banned_tool_field():
	"""Rule 8(c): interactionSequence with banned 'tool' at kind-block level raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
			'tool': 'pipette',
			'interactions': [
				{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
				{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'done'},
			]
		}
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8c_fail_banned_completion_event_at_kind_level():
	"""Rule 8(c): interactionSequence with completionEvent at kind-block level raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'interactionSequence',
			'completionEvent': 'done',
			'interactions': [
				{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
			]
		}
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'bottle': {'role': 'reagent_source'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (d) directTool kind validation ---

def test_rule_8d_pass_valid_direct_tool():
	"""Rule 8(d): valid directTool with tool and completionEvent passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_missing_tool():
	"""Rule 8(d): directTool without tool raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_empty_tool():
	"""Rule 8(d): directTool with empty tool string raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': '',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_unknown_tool():
	"""Rule 8(d): directTool with unknown tool id raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'unknown_tool',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_missing_completion_event():
	"""Rule 8(d): directTool without completionEvent raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_click_prefixed_completion_event():
	"""Rule 8(d): directTool with 'click:' prefix in completionEvent raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'click:spray_ethanol',
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8d_fail_banned_interactions_field():
	"""Rule 8(d): directTool with banned 'interactions' field raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
			'interactions': [],
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (e) modal kind validation ---

def test_rule_8e_pass_valid_modal():
	"""Rule 8(e): valid modal with openClick, advanceClick, completionEvent passes."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	# Should not raise
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_pass_modal_without_open_click():
	"""Rule 8(e): modal without openClick is now allowed (for split hybrid steps)."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'modal_done',
		}
	}
	items = {}
	reagents = {}

	# Should not raise: openClick is optional
	validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_unknown_open_click():
	"""Rule 8(e): modal with unknown openClick id raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'unknown_item',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_missing_advance_click():
	"""Rule 8(e): modal without advanceClick raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'completionEvent': 'modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_advance_click_not_kebab_case():
	"""Rule 8(e): modal with advanceClick not in kebab-case raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'ModalAdvanceButton',
			'completionEvent': 'modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_advance_click_starting_with_underscore():
	"""Rule 8(e): modal with advanceClick starting with underscore raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': '_modal-advance',
			'completionEvent': 'modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_missing_completion_event():
	"""Rule 8(e): modal without completionEvent raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'modal-advance-button',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_click_prefixed_completion_event():
	"""Rule 8(e): modal with 'click:' prefix in completionEvent raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'click:modal_done',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8e_fail_banned_tool_field():
	"""Rule 8(e): modal with banned 'tool' field raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'modal',
			'openClick': 'well_plate',
			'advanceClick': 'modal-advance-button',
			'completionEvent': 'modal_done',
			'tool': 'some_tool',
		}
	}
	items = {'well_plate': {'role': 'culture_vessel'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (f) Legacy field rejection ---

def test_rule_8f_fail_legacy_top_level_interaction_sequence():
	"""Rule 8(f): legacy top-level interactionSequence field raises ValueError."""
	step = {
		'id': 'test_step',
		'interactionSequence': [
			{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
		],
		'completionPath': {
			'kind': 'interactionSequence',
			'interactions': [
				{'tool': 'pipette', 'source': 'bottle', 'liquid': 'pbs', 'volumeMl': 10},
				{'tool': 'pipette', 'destination': 'flask', 'liquid': 'pbs', 'completionEvent': 'done'},
			]
		}
	}
	items = {
		'pipette': {'role': 'transfer_tool'},
		'bottle': {'role': 'reagent_source'},
		'flask': {'role': 'culture_vessel'},
	}
	reagents = {'pbs': {}}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


#--- (g) Derived field rejection ---

def test_rule_8g_fail_authored_completion_trigger():
	"""Rule 8(g): authored completionTrigger field raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
		},
		'completionTrigger': {
			'scene': 'hood',
			'completionEvent': 'spray_ethanol',
		}
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)


def test_rule_8g_fail_authored_target_items():
	"""Rule 8(g): authored targetItems field raises ValueError."""
	step = {
		'id': 'test_step',
		'completionPath': {
			'kind': 'directTool',
			'tool': 'ethanol_bottle',
			'completionEvent': 'spray_ethanol',
		},
		'targetItems': ['ethanol_bottle'],
	}
	items = {'ethanol_bottle': {'role': 'reagent_source'}}
	reagents = {}

	with pytest.raises(ValueError):
		validator.validate_completion_path_contract(step, items, reagents)
